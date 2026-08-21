import request from '@/utils/request'

export function getTurningPrediction(params = {}) {
  return request({
    url: '/api/scenario/prediction/turning',
    method: 'post',
    data: {
      metric: params.metric || 'total_amount',
      threshold: params.threshold || 0.65,
      lookahead: params.lookahead || 5,
      policy_weight: params.policy_weight || 0.35,
      sentiment_weight: params.sentiment_weight || 0.30,
      market_weight: params.market_weight || 0.35
    }
  })
}
