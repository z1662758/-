/**
 * 态势研判 & 态势预测 API 模块
 * 调用后端聚合接口获取页面级图表数据
 */
import request from '@/utils/request'

/**
 * 获取态势研判页全部数据
 * @param {string} scenario - 'uranium' | 'auto'
 * @returns {Promise} { success, data: { scenario, trendChart, cycleChart, turningChart, scenarioDistribution, riskTable, events, conclusion } }
 */
export function getJudgmentData(scenario = 'uranium') {
  return request({
    url: `/scenario/judgment/${scenario}`,
    method: 'get'
  })
}

/**
 * 获取态势预测页全部数据
 * @param {string} scenario - 'uranium' | 'auto'
 * @returns {Promise} { success, data: { scenario, dashboardSummary, gprPrediction, predictionConclusions, supplyDemandGap, modelComparison, scenarioEvolution } }
 */
export function getResearchData(scenario = 'uranium') {
  return request({
    url: `/scenario/research/${scenario}`,
    method: 'get'
  })
}

/**
 * 获取态势研判/预测的详细验证报告
 * @param {string} page - 'judgment' | 'research'
 * @param {string} scenario - 'uranium' | 'auto'
 * @returns {Promise} { success, data: { credibility, dataSources, analysisProcess, statisticalVerification, reasonablenessChecks } }
 */
export function getVerificationReport(page = 'judgment', scenario = 'uranium') {
  return request({
    url: `/scenario/verification/${page}/${scenario}`,
    method: 'get'
  })
}

/**
 * 获取预期损失估算(低/基准/高 + 当前情景 + 敏感性/构成/依据)
 * @param {string} scenario - 'low' | 'base' | 'high'
 */
export function getLossEstimation(scenario = 'base') {
  return request({ url: '/loss-estimation', method: 'get', params: { scenario } })
}

/**
 * 自定义参数重算预期损失
 * @param {Object} data - { risk_probability?, affected_quantity?, replacement_price_diff?, delay_days?, ... }
 */
export function calculateLoss(data) {
  return request({ url: '/loss-estimation/calculate', method: 'post', data })
}
