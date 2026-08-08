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
