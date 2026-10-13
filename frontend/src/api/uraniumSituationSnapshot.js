// src/api/uraniumSituationSnapshot.js
// 铀燃料供应链态势图快照 API
// 说明：request.js 拦截器返回整个响应体 {success, data, message}，
//       因此调用方从 res.data 取 snapshot（见 SituationMap.vue）。
import request from '@/utils/request'

/**
 * 获取最新态势图快照（不触发重算）
 * @returns {Promise<{success: boolean, data: object, message: string}>}
 */
export function getLatestSnapshot(osintMode = 'REAL') {
  return request({
    url: '/SCnet/uraniumSituation/latest',
    method: 'get',
    params: { osint_mode: osintMode }
  })
}

/**
 * 触发后端重新计算并保存态势图快照（POST 只返回摘要，地图刷新需再调 getLatestSnapshot）
 * @returns {Promise<{success: boolean, data: object, message: string}>}
 */
export function recomputeSnapshot(osintMode = 'REAL') {
  return request({
    url: '/SCnet/uraniumSituation/recompute',
    method: 'post',
    data: { osint_mode: osintMode }
  })
}

/**
 * 获取模型库注册中心（model_cards.json 登记的模型卡）
 * @returns {Promise<{success: boolean, data: {model_groups: []}, message: string}>}
 */
export function getModelRegistry() {
  return request({
    url: '/SCnet/modelRegistry/models',
    method: 'get'
  })
}

export function getSituationAssessments() {
  return request({ url: '/SCnet/uraniumDecision/situation-assessments', method: 'get' })
}
