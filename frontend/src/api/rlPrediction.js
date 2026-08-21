/**
 * RL-GPR 增强预测 API 服务
 * 调用后端 RL 优化 GPR 超参数后的趋势预测
 */
import request from '@/utils/request'

/**
 * 获取 RL-GPR 优化预测
 * @param {Object} params - 预测参数
 * @param {string} params.metric - 预测指标 (order_count|total_amount|total_volume|avg_amount|avg_volume)
 * @param {number} params.horizon - 预测跨度（月），默认12
 * @param {number} params.confidence - 置信水平 (0.5-0.99)，默认0.80
 * @returns {Promise} 与 /api/scenario/prediction/trend 相同格式的响应，
 *   其中 modelInfo.algorithm = "RL-GPR"
 */
export function getRLPrediction(params = {}) {
  return request({
    url: '/api/scenario/prediction/rl-optimize',
    method: 'post',
    data: {
      metric: params.metric || 'total_amount',
      horizon: params.horizon || 12,
      confidence: params.confidence || 0.80
    }
  })
}
