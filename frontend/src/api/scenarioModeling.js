/**
 * Scenario Modeling API
 * 场景建模核心API - 需求分析、实验设计、智能体配置
 *
 * @author SGM-MSE Team
 * @date 2026-01-17
 */

import request from '@/utils/request'

/**
 * 需求判断 - 分析需求是否包含完整的实验要素（目标、变量、对象）
 * @param {string} requirement - 用户需求文本
 * @param {string|null} sessionId - 可选的会话 ID（再次分析时可带上）
 * @param {string|null} phase - 分析阶段：pre / during / post（与场景建模一致）
 * @returns {Promise} 响应体 { success, data: { flag, goal, variable, object, content, session_id }, message }
 */
export function judgeRequirement(requirement, sessionId = null, phase = null) {
  const data = { req: requirement }
  if (sessionId) {
    data.session_id = sessionId
  }
  if (phase) {
    data.phase = phase
  }

  return request({
    url: '/reqJudgement',
    method: 'post',
    data
  })
}

/**
 * 需求分析（目标拆解）- 生成子任务与实验要素
 * @param {string} requirement - 用户需求文本
 * @param {string} sessionId - 会话 ID
 * @param {string|null} phase - 分析阶段，写入会话供后端追踪
 * @returns {Promise} { success, data: { content, session_id }, message }
 */
export function analyzeRequirement(requirement, sessionId, phase = null) {
  const data = {
    req: requirement,
    session_id: sessionId
  }
  if (phase) {
    data.phase = phase
  }
  return request({
    url: '/reqAnalysis',
    method: 'post',
    data
  })
}

/**
 * 实验修改 - 根据用户反馈修改实验参数
 * @param {string} proposal - 用户提出的修改建议
 * @param {object} data - 当前实验数据
 * @param {array} data.tasks - 任务列表
 * @param {object} data.apiResult - API分析结果
 * @param {number} data.currentTask - 当前任务索引（可选）
 * @returns {Promise} 修改后的实验设计
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

/**
 * 配置智能体 - 基于实验设计生成智能体配置
 * @param {string} sessionId - 会话ID
 * @param {object} config - 智能体配置数据
 * @param {string} config.req - 需求文本
 * @param {array} config.tasks - 任务列表
 * @param {object} config.apiResult - API分析结果
 * @param {string} [config.phase] - 阶段（pre/during/post）
 * @param {string} [config.experiment_id] - 关联实验ID（可选）
 * @returns {Promise} {status: 'success', data: agentConfig}
 */
export function setAgents(sessionId, config) {
  const payload = {
    session_id: sessionId,
    req: config.req,
    tasks: config.tasks,
    apiResult: config.apiResult
  }
  if (config.phase) payload.phase = config.phase
  if (config.experiment_id) payload.experiment_id = config.experiment_id

  return request({
    url: '/SCnet/setAgents',
    method: 'post',
    data: payload
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

export default {
  judgeRequirement,
  analyzeRequirement,
  modifyExperiment,
  setAgents,
  runExperiment,
  getExperimentProgress,
  stopExperiment,
  getScnetAgents
}
