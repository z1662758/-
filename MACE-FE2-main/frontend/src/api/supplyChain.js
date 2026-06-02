/**
 * Supply Chain API
 * 供应链场景API接口封装
 *
 * @author SGM-MSE Team
 * @date 2026-01-13
 */

import request from '@/utils/request'

/**
 * 获取所有供应链实验的元数据列表
 * @returns {Promise}
 */
export function getExperiments() {
  return request({
    url: '/SCnet/supplyChain/experiments',
    method: 'get'
  })
}

/**
 * 获取指定实验的完整数据
 * @param {string} experimentId - 实验ID（时间戳格式）
 * @returns {Promise}
 */
export function getExperimentDetail(experimentId) {
  return request({
    url: `/SCnet/supplyChain/experiment/${experimentId}`,
    method: 'get'
  })
}

/**
 * 获取港口-企业聚合数据
 * @returns {Promise}
 */
export function getPorts() {
  return request({
    url: '/SCnet/supplyChain/ports',
    method: 'get'
  })
}

/**
 * 获取实验的时序演化数据（21个月）
 * @param {string} experimentId - 实验ID
 * @returns {Promise}
 */
export function getTimeline(experimentId) {
  return request({
    url: `/SCnet/supplyChain/timeline/${experimentId}`,
    method: 'get'
  })
}

/**
 * 健康检查
 * @returns {Promise}
 */
export function healthCheck() {
  return request({
    url: '/SCnet/supplyChain/health',
    method: 'get'
  })
}

/**
 * 获取指定迭代的时序数据（懒加载）
 * @param {string} experimentId - 实验ID
 * @param {number} iteration - 迭代编号
 * @param {string} detailLevel - 详细程度 'basic' 或 'full'
 * @returns {Promise}
 */
export function getTimelineIteration(experimentId, iteration, detailLevel = 'basic') {
  return request({
    url: `/SCnet/supplyChain/timeline/${experimentId}`,
    method: 'get',
    params: {
      iteration,
      detail_level: detailLevel
    }
  })
}

/**
 * 获取实验的多轮迭代对比分析数据
 * @param {string} experimentId - 实验ID
 * @returns {Promise}
 */
export function getIterationsComparison(experimentId) {
  return request({
    url: `/SCnet/supplyChain/experiments/${experimentId}/iterations-comparison`,
    method: 'get'
  })
}

/**
 * 生成完整的实验报告
 * @param {string} experimentId - 实验ID
 * @returns {Promise}
 */
export function getExperimentReport(experimentId) {
  return request({
    url: `/SCnet/supplyChain/experiments/${experimentId}/report`,
    method: 'get'
  })
}

/**
 * 获取对话历史
 * @param {string} experimentId - 实验ID
 * @returns {Promise}
 */
export function getChatHistory(experimentId) {
  return request({
    url: `/SCnet/supplyChain/experiments/${experimentId}/chat-history`,
    method: 'get'
  })
}

/**
 * 获取目标拆解日志
 * @param {string} experimentId - 实验ID
 * @returns {Promise}
 */
export function getGoalDecompositionLog(experimentId) {
  return request({
    url: `/SCnet/supplyChain/experiments/${experimentId}/goal-decomposition-log`,
    method: 'get'
  })
}

/**
 * 获取极端事件日志
 * @param {string} experimentId - 实验ID
 * @param {Object} params - 查询参数
 * @param {number} params.iteration - 指定迭代（可选）
 * @param {string} params.event_types - 事件类型过滤，逗号分隔（可选）
 * @returns {Promise}
 */
export function getExtremeEvents(experimentId, params = {}) {
  return request({
    url: `/SCnet/supplyChain/experiments/${experimentId}/extreme-events`,
    method: 'get',
    params
  })
}

/**
 * 获取协作网络图数据（节点 + 边）
 * @param {Object} params - 查询参数
 * @param {string} params.month - 可选月份过滤，格式 "YYYY-MM"
 * @returns {Promise}
 */
export function getCollaborationNetwork(params = {}) {
  return request({
    url: '/SCnet/supplyChain/collaboration-network',
    method: 'get',
    params
  })
}

/**
 * 获取供应链参数目录（实体参数 / 系统参数 / 影响因素 / 响应变量）
 * @param {string} scenario - 场景标识，默认 supply_chain
 * @returns {Promise}
 */
export function getParameterCatalog(scenario = 'supply_chain') {
  return request({
    url: '/SCnet/supplyChain/parameter-catalog',
    method: 'get',
    params: { scenario }
  })
}

/**
 * 拉取后端最近一次保存的智能体设计（供仿真工作室渲染画布）
 * 与参考项目 powerGame/getAgents 接口形态对齐
 * @param {Object} [params]
 * @param {string} [params.phase]         - 阶段（pre/during/post），可选
 * @param {string} [params.sessionId]     - 会话 ID，可选
 * @param {string} [params.experimentId]  - 实验 ID，可选
 * @param {string} [params.projectIndex]  - 项目索引，可选（兼容学长版）
 * @returns {Promise} 后端返回 { agents, attribute_explain, relationship_net, experiment_id }
 */
export function getSupplyChainAgents({ phase, sessionId, experimentId, projectIndex } = {}) {
  const data = { phase, session_id: sessionId }
  if (experimentId) data.experiment_id = experimentId
  if (projectIndex !== undefined && projectIndex !== null) data.projectIndex = projectIndex

  return request({
    url: '/SCnet/getAgents',
    method: 'post',
    data
  })
}
