import request from '@/utils/request'

export function getCyclePrediction(params = {}) {
  return request({
    url: '/api/scenario/prediction/cycle',
    method: 'post',
    data: {
      metric: params.metric || 'total_amount',
      period_min: params.period_min || 6,
      period_max: params.period_max || 24,
      sensitivity: params.sensitivity || 0.55,
      window_start: params.window_start || 0.0,
      window_end: params.window_end || 1.0
    }
  })
}
