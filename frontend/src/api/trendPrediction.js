/**
 * 供应链趋势预测 API
 */
import request from '@/utils/request'

/**
 * 获取趋势预测数据
 * @param {Object} params - 预测参数
 * @param {string} params.metric - 预测指标 (order_count|total_amount|total_volume|avg_amount|avg_volume)
 * @param {number} params.horizon - 预测跨度（月），默认12，范围3-24
 * @param {number} params.confidence - 置信水平，默认0.80，范围0.5-0.99
 */
export function getTrendPrediction(params = {}) {
  return request({
    url: '/api/scenario/prediction/trend',
    method: 'post',
    data: {
      metric: params.metric || 'total_amount',
      horizon: params.horizon || 12,
      confidence: params.confidence || 0.80
    }
  })
}
