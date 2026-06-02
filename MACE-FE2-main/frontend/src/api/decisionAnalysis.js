/**
 * Decision / Scenario / GameTheory Analysis API
 * 事中决策分析、情景分析与博弈论分析接口封装，与 session 绑定。
 */

import request from '@/utils/request'

/**
 * 基于 session 获取决策树
 * @param {string} sessionId
 */
export function getDecisionTreeBySession(sessionId) {
  return request({
    url: `/api/scenario/session/${sessionId}/decision-tree`,
    method: 'get'
  })
}

/**
 * 触发情景分析（基于 session 关联的实验报告同步生成）
 * @param {string} sessionId
 */
export function triggerScenarioAnalysis(sessionId) {
  return request({
    url: `/api/scenario/session/${sessionId}/scenario-analysis`,
    method: 'post',
    data: {}
  })
}

/**
 * 获取最近一次情景分析快照
 * @param {string} sessionId
 */
export function getScenarioAnalysisBySession(sessionId) {
  return request({
    url: `/api/scenario/session/${sessionId}/scenario-analysis`,
    method: 'get'
  })
}

/**
 * 基于 session 获取博弈论分析（销售商×制造商收益矩阵 + 纳什均衡）
 * @param {string} sessionId
 */
export function getGameTheoryBySession(sessionId) {
  return request({
    url: `/api/scenario/session/${sessionId}/game-theory-analysis`,
    method: 'get'
  })
}
