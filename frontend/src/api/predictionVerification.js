/**
 * 预测结果验证 API
 *
 * 从"历史拟合度"和"预测稳健性"两个维度交叉检验 GPR 预测可信度：
 *   - K折交叉验证 (R²)
 *   - 残差白噪声检验 (DW+ACF)
 *   - PICP区间覆盖率
 *   - 多模型一致性 (GPR/LSTM/Prophet)
 */
import request from '@/utils/request'

/**
 * 运行全部4种验证方法，返回两维度综合可信度
 * @param {Object} params
 * @param {string} params.scenario - 场景: "uranium" | "supply_chain" | "auto"
 * @param {string} params.metric  - 指标: "order_count" | "u3o8_spot" | ...
 */
export function getVerificationAll(params = {}) {
  return request({
    url: '/api/scenario/verify/all',
    method: 'post',
    data: {
      scenario: params.scenario || 'uranium',
      metric: params.metric || 'order_count'
    }
  })
}

/**
 * K折GPR交叉验证
 */
export function getCrossValidation(params = {}) {
  return request({
    url: '/api/scenario/verify/cross-validate',
    method: 'post',
    data: {
      scenario: params.scenario || 'uranium',
      metric: params.metric || 'order_count',
      k: params.k || 5
    }
  })
}

/**
 * 残差白噪声检验 (Durbin-Watson + ACF)
 */
export function getResidualTest(params = {}) {
  return request({
    url: '/api/scenario/verify/residual',
    method: 'post',
    data: {
      scenario: params.scenario || 'uranium',
      metric: params.metric || 'order_count'
    }
  })
}

/**
 * PICP区间覆盖率
 */
export function getPICP(params = {}) {
  return request({
    url: '/api/scenario/verify/picp',
    method: 'post',
    data: {
      scenario: params.scenario || 'uranium',
      metric: params.metric || 'order_count',
      test_months: params.test_months || 6
    }
  })
}

/**
 * 多模型一致性检验
 */
export function getModelConsensus(params = {}) {
  return request({
    url: '/api/scenario/verify/consensus',
    method: 'post',
    data: {
      scenario: params.scenario || 'uranium',
      metric: params.metric || 'order_count',
      forecast_horizon: params.forecast_horizon || 6
    }
  })
}
