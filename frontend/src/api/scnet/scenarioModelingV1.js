/**
 * Scenario Modeling API
 * 对齐 sgm-cmse-master/tofront/app.py 当前注册的 Flask 路由。
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
  let closed = false
  Promise.resolve()
    .then(() => {
      if (closed) return null
      if (typeof onEvent === 'function') onEvent({ type: 'stage_start', stage: 'ra_agent' })
      return analyzeRequirement(req, sessionId, phase, context, { designAgents }, modelName)
    })
    .then((payload) => {
      if (closed || !payload) return
      const data = payload?.data || {}
      if (typeof onEvent === 'function') {
        onEvent({ type: 'stage_end', stage: 'ra_agent', payload: data })
        onEvent({ type: 'done', payload: data })
      }
      if (typeof onClose === 'function') onClose()
    })
    .catch((err) => {
      if (!closed && typeof onError === 'function') onError(err)
    })

  return { close: () => { closed = true } }
}

export function judgeRequirement(requirement, sessionId = null, phase = null, scenarioContext = null, modelName = null) {
  const data = { req: requirement }
  if (sessionId) data.session_id = sessionId
  if (phase) data.phase = phase
  if (modelName) data.model_name = modelName
  const ctx = normalizeScenarioContext(scenarioContext)
  if (ctx) data.context = ctx

  return request({
    url: '/reqJudgement',
    method: 'post',
    timeout: 300000,
    data
  })
}

export function detectRequirementPhase(requirement, sessionId = null, modelName = null, fileName = null) {
  const text = String(requirement || '')
  let phase = 'during'
  if (/预测|趋势|事前|预警|风险识别|态势研判/.test(text)) phase = 'pre'
  if (/复盘|事后|评估|归因|报告|总结/.test(text)) phase = 'post'
  return Promise.resolve({
    success: true,
    data: {
      phase,
      session_id: sessionId,
      model_name: modelName || '',
      file_name: fileName || ''
    }
  })
}

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
    url: '/reqAnalysis',
    method: 'post',
    timeout: 600000,
    data
  }).then((payload) => {
    const body = payload?.data && typeof payload.data === 'object' ? payload.data : {}
    const content = body.content && typeof body.content === 'object' ? body.content : {}
    const normalizedData = {
      ...body,
      stage: body.stage || 'analyze',
      ok: body.ok !== false,
      judgement: body.judgement || {
        flag: 1,
        goal: content?.goal_decomposition?.user_goal || content?.goal?.description || requirement,
        variable: content?.influence_factor || [],
        object: content?.goal_decomposition?.object || '',
        phase
      },
      exp_plan: body.exp_plan || content,
      content,
      session_id: body.session_id || sessionId,
      phase: body.phase || phase,
      warnings: Array.isArray(body.warnings) ? body.warnings : []
    }
    return {
      ...payload,
      data: normalizedData
    }
  })
}

/**
 * 实验修改 - 根据用户反馈修改实验参数
 * @param {string} proposal
 * @param {object} data - { tasks, apiResult, currentTask? }
 */
export function modifyExperiment(proposal, data) {
  return request({
    url: '/ExpModification',
    method: 'post',
    data: {
      proposal,
      tasks: data.tasks,
      apiResult: data.apiResult,
      currentTask: data.currentTask
    }
  })
}

export function setAgents(sessionId, config) {
  const payload = {
    session_id: sessionId,
    req: config.req,
    tasks: Array.isArray(config.tasks) ? config.tasks : [],
    apiResult: config.apiResult || config.exp_plan || {},
  }
  if (config.phase) payload.phase = config.phase
  if (config.exp_plan) payload.exp_plan = config.exp_plan
  if (config.context) payload.context = config.context
  if (config.experiment_id) payload.experiment_id = config.experiment_id
  if (config.model_name) payload.model_name = config.model_name

  return request({
    url: '/SCnet/setAgents',
    method: 'post',
    timeout: 300000,
    data: payload
  })
}

export function regenerateAgents(config) {
  return setAgents(config.session_id || '', {
    req: config.req,
    tasks: config.tasks || [],
    apiResult: config.apiResult || config.exp_plan || {},
    exp_plan: config.exp_plan || config.apiResult || {},
    phase: config.phase || null,
    context: config.context || null,
    agent_list: config.agent_list || [],
    error_reason: config.error_reason || '',
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
