/**
 * Scenario Modeling API
 * 场景建模核心API - 需求分析、实验设计、智能体配置
 *
 * @author SGM-MSE Team
 * @date 2026-01-17
 */

import request from '@/utils/request'

/**
 * 把前端的 scenarioContext 对象规范化为后端可消费的 scenario_context
 * 仅保留非空字段，避免污染后端 prompt
 */
function normalizeScenarioContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return null
  const pick = (v) => (typeof v === 'string' ? v.trim() : '')
  const out = {}
  const hb = pick(ctx.historicalBackground || ctx.historical_background)
  const ie = pick(ctx.initialEvent || ctx.initial_event)
  const cp = pick(ctx.currentProgress || ctx.current_progress)
  const ct = pick(ctx.completeTimeline || ctx.complete_timeline)
  if (hb) out.historical_background = hb
  if (ie) out.initial_event = ie
  if (cp) out.current_progress = cp
  if (ct) out.complete_timeline = ct
  return Object.keys(out).length > 0 ? out : null
}

/**
 * 流式需求分析 (SSE) — 对应后端 POST /api/v1/requirement/analyze/stream
 *
 * 一次性串完 RAObserver → RAAgent → ADAgent → ADObserver, 期间按阶段实时推送事件,
 * 避免 4 段 LLM 链路阻塞代理触发 502。
 *
 * 事件 (与 core.ra.pipeline.run_full_stream 输出一致):
 *   { type: 'info',         content, session_id, phase }
 *   { type: 'stage_start',  stage: 'ra_observer' | 'ra_agent' | 'ad_agent' | 'ad_observer' }
 *   { type: 'stage_end',    stage, payload: { judgement | exp_plan | agent_design | agent_observation } }
 *   { type: 'error',        stage, message }
 *   { type: 'done',         payload: { stage, ok, judgement, exp_plan, agent_design, agent_observation, session_id, phase } }
 *
 * @param {object} args
 * @param {string} args.req - 用户需求文本 (必填)
 * @param {string|null} [args.sessionId] - 想定会话 ID; 不传由后端生成 (但当前后端是 echo, 仍需前端管理)
 * @param {string|null} [args.phase] - pre | during | post
 * @param {boolean} [args.designAgents=true] - 是否一并跑 ADAgent + ADObserver
 * @param {string|null} [args.modelName] - LLM model_name
 * @param {object|null} [args.context] - 场景上下文 (本版本默认 null)
 * @param {(ev: object) => void} args.onEvent - 单事件回调
 * @param {(err: Error) => void} [args.onError]
 * @param {() => void} [args.onClose]
 * @returns {{ close(): void }} - 调用 close() 中止 SSE
 */
export function streamAnalyzeRequirement({
  req,
  sessionId = null,
  phase = null,
  designAgents = true,
  modelName = null,
  context = null,
  onEvent,
  onError,
  onClose,
}) {
  const controller = new AbortController()
  const body = { req, design_agents: designAgents }
  if (sessionId) body.session_id = sessionId
  if (phase) body.phase = phase
  if (modelName) body.model_name = modelName
  const ctx = normalizeScenarioContext(context)
  if (ctx) body.context = ctx

  fetch('/api/v1/requirement/analyze/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (resp) => {
      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => '')
        throw new Error(`HTTP ${resp.status}: ${text || 'no body'}`)
      }
      const reader = resp.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const line = chunk.split('\n').find((l) => l.startsWith('data: '))
          if (!line) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const ev = JSON.parse(raw)
            if (typeof onEvent === 'function') onEvent(ev)
          } catch (e) {
            if (typeof onError === 'function') onError(e)
          }
        }
      }
      if (typeof onClose === 'function') onClose()
    })
    .catch((err) => {
      if (err && err.name === 'AbortError') return
      if (typeof onError === 'function') onError(err)
    })

  return { close: () => controller.abort() }
}

/**
 * 需求判断 - 分析需求是否包含完整的实验要素（目标、变量、对象）
 *
 * 端点已迁移到 `/api/v1/requirement/judge`（MACE 三段式 RAObserver）。
 * 响应体保持 { success, data, message } 不变；data 字段为
 * { flag, goal, variable, object, reason, session_id, phase }。
 *
 * @param {string} requirement - 用户需求文本
 * @param {string|null} sessionId - 可选的会话 ID
 * @param {string|null} phase - pre / during / post
 * @param {object|null} scenarioContext - 场景上下文
 */
export function judgeRequirement(requirement, sessionId = null, phase = null, scenarioContext = null, modelName = null) {
  const data = { req: requirement }
  if (sessionId) data.session_id = sessionId
  if (phase) data.phase = phase
  if (modelName) data.model_name = modelName
  const ctx = normalizeScenarioContext(scenarioContext)
  if (ctx) data.context = ctx

  return request({
    url: '/v1/requirement/judge',
    method: 'post',
    timeout: 300000,
    data
  })
}

/**
 * 阶段识别 - 供 total 首页入口先判断 pre / during / post
 *
 * 端点 `/api/v1/requirement/detect-phase` 会优先走 LLM，
 * 不可用时退回后端规则分类。
 *
 * @param {string} requirement - 用户需求文本
 * @param {string|null} sessionId - 可选的会话 ID
 * @param {string|null} modelName - 可选模型名
 * @param {string|null} fileName - 可选补充文件名
 */
export function detectRequirementPhase(requirement, sessionId = null, modelName = null, fileName = null) {
  const data = { req: requirement }
  if (sessionId) data.session_id = sessionId
  if (modelName) data.model_name = modelName
  if (fileName) data.file_name = fileName

  return request({
    url: '/v1/requirement/detect-phase',
    method: 'post',
    timeout: 300000,
    data
  })
}

/**
 * 需求分析（三段式）- 跑 RAObserver → RAAgent → ADAgent + ADObserver。
 *
 * 端点已迁移到 `/api/v1/requirement/analyze`。data 字段包含
 * { stage, ok, judgement, exp_plan, agent_design, agent_observation, retries, warnings, phase, session_id }。
 *
 * @param {string} requirement
 * @param {string} sessionId
 * @param {string|null} phase
 * @param {object|null} scenarioContext
 * @param {object} [options] - { designAgents: true } 控制是否一并执行 ADAgent
 */
export function analyzeRequirement(requirement, sessionId, phase = null, scenarioContext = null, options = {}, modelName = null) {
  const data = {
    req: requirement,
    session_id: sessionId,
    design_agents: options.designAgents !== false,
  }
  if (phase) data.phase = phase
  if (modelName) data.model_name = modelName
  const ctx = normalizeScenarioContext(scenarioContext)
  if (ctx) data.context = ctx
  return request({
    url: '/v1/requirement/analyze',
    method: 'post',
    timeout: 600000,
    data
  })
}

/**
 * 实验修改 - 根据用户反馈修改实验参数
 * @param {string} proposal
 * @param {object} data - { tasks, apiResult, currentTask? }
 */
export function modifyExperiment(proposal, data) {
  return request({
    url: '/v1/experiment-design/modify',
    method: 'post',
    data: {
      proposal,
      tasks: data.tasks,
      apiResult: data.apiResult,
      currentTask: data.currentTask
    }
  })
}

/**
 * 配置智能体（ADAgent）。端点迁移到 `/api/v1/experiment-design/agents`。
 *
 * 兼容旧版调用方式：仍然接受 sessionId + config 两个参数。新版 config 推荐字段:
 *   { req, exp_plan, phase?, context?, model_name? }
 *
 * 旧字段 (tasks/apiResult) 在 Phase B 完成后会停止使用; 本调用现在会优先取 exp_plan，
 * 否则把 apiResult 作为兜底 exp_plan 传递, 由后端 ADAgent 决定如何兼容。
 */
export function setAgents(sessionId, config) {
  const payload = {
    session_id: sessionId,
    req: config.req,
    exp_plan: config.exp_plan || config.apiResult || {},
  }
  if (config.phase) payload.phase = config.phase
  if (config.context) payload.context = config.context
  if (config.experiment_id) payload.experiment_id = config.experiment_id
  if (config.model_name) payload.model_name = config.model_name

  return request({
    url: '/v1/experiment-design/agents',
    method: 'post',
    timeout: 300000,
    data: payload
  })
}

/**
 * 重新生成智能体（ADAgent.agent_regenerate）。新端点。
 * @param {object} config - { req, exp_plan, agent_list, error_reason, phase?, context? }
 */
export function regenerateAgents(config) {
  return request({
    url: '/v1/experiment-design/agents/regenerate',
    method: 'post',
    data: {
      req: config.req,
      exp_plan: config.exp_plan || {},
      agent_list: config.agent_list || [],
      error_reason: config.error_reason || '',
      phase: config.phase || null,
      context: config.context || null,
      session_id: config.session_id || null,
    }
  })
}

/**
 * 运行实验（走队列；后端返回 ResponseFormatter 包裹的 data）
 * @param {string|object} scenarioOrConfig - 场景类型 (supply_chain) 或包含 scenario/iterations/model 的配置对象
 * @param {object} [params] - 当第一参数为场景名时传入 { iterations, model, ... }
 */
export function runExperiment(scenarioOrConfig, params) {
  let data
  if (params !== undefined && typeof scenarioOrConfig === 'string') {
    data = { scenario: scenarioOrConfig, ...params }
  } else {
    const c = scenarioOrConfig && typeof scenarioOrConfig === 'object' ? scenarioOrConfig : {}
    data = {
      scenario: c.scenario,
      iterations: c.iterations,
      model: c.model,
      ...c
    }
  }
  return request({
    url: '/SCnet/runExperiment',
    method: 'post',
    data
  })
}

/**
 * 获取实验进度
 * @param {string} experimentId - 实验ID
 * @returns {Promise} {is_running, completed, total, elapsed_time, current_task}
 */
export function getExperimentProgress(experimentId) {
  return request({
    url: '/SCnet/getExperimentProgress',
    method: 'get',
    params: { experiment_id: experimentId }
  })
}

/**
 * 停止实验
 * @returns {Promise} 停止结果
 */
export function stopExperiment() {
  return request({
    url: '/SCnet/stopExperiment',
    method: 'post',
    data: {}
  })
}

/** 读取 tofront 最近落库的 setAgents 结果（latest_agents.json） */
export function getScnetAgents() {
  return request({
    url: '/SCnet/getAgents',
    method: 'get'
  })
}

/**
 * 列出所有想定建模会话（用于"历史会话恢复"入口）
 * @returns {Promise} { success, data: { sessions: [{ session_id, timestamp, status, linked_experiment_id, requirement_text, ... }] }, message }
 */
export function listScenarioSessions() {
  return request({
    url: '/scenario/sessions',
    method: 'get'
  })
}

/**
 * 获取某次会话完整快照（requirement / chat_history / tasks / analysis_result / workflow / linked_experiment_id）
 * @param {string} sessionId
 */
export function getScenarioSession(sessionId) {
  return request({
    url: `/scenario/session/${sessionId}`,
    method: 'get'
  })
}

/**
 * 按实验 ID 反查关联的想定会话
 * @param {string} experimentId
 */
export function getScenarioSessionByExperiment(experimentId) {
  return request({
    url: `/scenario/session-by-experiment/${experimentId}`,
    method: 'get'
  })
}

export default {
  judgeRequirement,
  analyzeRequirement,
  streamAnalyzeRequirement,
  modifyExperiment,
  setAgents,
  regenerateAgents,
  runExperiment,
  getExperimentProgress,
  stopExperiment,
  getScnetAgents,
  listScenarioSessions,
  getScenarioSession,
  getScenarioSessionByExperiment
}
