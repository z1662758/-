/**
 * Scenario Session API
 * 场景建模会话相关API
 *
 * @author SGM-MSE Team
 * @date 2026-01-16
 */

import request from '@/utils/request'

/**
 * 获取所有会话列表
 */
export function getSessions() {
  return request({
    url: '/scenario/sessions',
    method: 'get'
  })
}

/**
 * 获取会话详情
 * @param {string} sessionId - 会话ID
 */
export function getSessionDetail(sessionId) {
  return request({
    url: `/scenario/session/${sessionId}`,
    method: 'get'
  })
}

/**
 * 创建新会话
 * @param {string} requirement - 需求文本
 */
export function createSession(requirement) {
  return request({
    url: '/scenario/session',
    method: 'post',
    data: { requirement }
  })
}

/**
 * 添加对话消息
 * @param {string} sessionId - 会话ID
 * @param {object} message - 消息对象 {type, content, data}
 */
export function addChatMessage(sessionId, message) {
  return request({
    url: `/scenario/session/${sessionId}/chat`,
    method: 'post',
    data: message
  })
}

/**
 * 更新任务列表
 * @param {string} sessionId - 会话ID
 * @param {array} taskList - 任务列表
 * @param {object} analysisResult - 分析结果
 */
export function updateTasks(sessionId, taskList, analysisResult) {
  return request({
    url: `/scenario/session/${sessionId}/tasks`,
    method: 'put',
    data: {
      task_list: taskList,
      analysis_result: analysisResult
    }
  })
}

/**
 * 更新单个任务结果
 * @param {string} sessionId - 会话ID
 * @param {number} taskIndex - 任务索引
 * @param {string} result - 任务结果
 */
export function updateTaskResult(sessionId, taskIndex, result) {
  return request({
    url: `/scenario/session/${sessionId}/task/${taskIndex}`,
    method: 'put',
    data: { result }
  })
}

/**
 * 关联实验ID到会话
 * @param {string} sessionId - 会话ID
 * @param {string} experimentId - 实验ID
 */
export function linkExperiment(sessionId, experimentId) {
  return request({
    url: `/scenario/session/${sessionId}/link-experiment`,
    method: 'put',
    data: { experiment_id: experimentId }
  })
}

/**
 * 通过 experiment_id 反查关联会话（事后报告"原始建模过程"使用）
 * @param {string} experimentId - 实验ID
 */
export function getSessionByExperiment(experimentId) {
  return request({
    url: `/scenario/session-by-experiment/${experimentId}`,
    method: 'get'
  })
}
