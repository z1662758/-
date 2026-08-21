/**
 * Oil Supply Chain API
 * 石油供应链场景API接口封装
 *
 * @author SGM-MSE Team
 * @date 2026-06-02
 */

import request from '@/utils/request'

const BASE_URL = '/SCnet/oilSupplyChain'

// ------------------------------------------------------------------ //
//  风险事件                                                            //
// ------------------------------------------------------------------ //

/**
 * 获取石油供应链风险事件列表
 * @param {Object} params - 查询参数
 * @param {string} params.region - 地区过滤
 * @param {string} params.type - 事件类型
 * @param {string} params.level - 风险等级
 * @param {number} params.limit - 最大条数
 * @returns {Promise}
 */
export function getOilEvents(params = {}) {
  return request({
    url: `${BASE_URL}/events`,
    method: 'get',
    params
  })
}

/**
 * 获取单个风险事件详情
 * @param {string} eventId - 事件ID
 * @returns {Promise}
 */
export function getOilEventDetail(eventId) {
  return request({
    url: `${BASE_URL}/events/${eventId}`,
    method: 'get'
  })
}

/**
 * 获取风险事件统计摘要
 * @returns {Promise}
 */
export function getOilStatistics() {
  return request({
    url: `${BASE_URL}/statistics`,
    method: 'get'
  })
}

// ------------------------------------------------------------------ //
//  基础设施                                                            //
// ------------------------------------------------------------------ //

/**
 * 获取石油基础设施数据
 * @param {string} category - 可选分类 (oilfields/refineries/pipelines/ports/shipping_routes)
 * @returns {Promise}
 */
export function getOilInfrastructure(category) {
  const params = {}
  if (category) params.category = category
  return request({
    url: `${BASE_URL}/infrastructure`,
    method: 'get',
    params
  })
}

/**
 * 获取指定分类的基础设施数据
 * @param {string} category - oilfields/refineries/pipelines/ports/shipping_routes
 * @returns {Promise}
 */
export function getOilInfrastructureByCategory(category) {
  return request({
    url: `${BASE_URL}/infrastructure/${category}`,
    method: 'get'
  })
}

/**
 * 获取基础设施统计
 * @returns {Promise}
 */
export function getOilInfrastructureStatistics() {
  return request({
    url: `${BASE_URL}/infrastructure-statistics`,
    method: 'get'
  })
}

// ------------------------------------------------------------------ //
//  地图可视化                                                          //
// ------------------------------------------------------------------ //

/**
 * 获取地图可视化要素（油田、炼厂、港口、航线、风险标记）
 * @returns {Promise}
 */
export function getOilMapFeatures() {
  return request({
    url: `${BASE_URL}/map-features`,
    method: 'get'
  })
}

// ------------------------------------------------------------------ //
//  价格数据                                                            //
// ------------------------------------------------------------------ //

/**
 * 获取原油价格数据
 * @param {string} benchmark - 可选基准 (Brent/WTI/Dubai)
 * @returns {Promise}
 */
export function getOilPrices(benchmark) {
  const params = {}
  if (benchmark) params.benchmark = benchmark
  return request({
    url: `${BASE_URL}/prices`,
    method: 'get',
    params
  })
}

/**
 * 获取指定基准的价格数据
 * @param {string} benchmark - Brent/WTI/Dubai
 * @returns {Promise}
 */
export function getOilPriceByBenchmark(benchmark) {
  return request({
    url: `${BASE_URL}/prices/${benchmark}`,
    method: 'get'
  })
}

// ------------------------------------------------------------------ //
//  OPEC & SPR                                                          //
// ------------------------------------------------------------------ //

/**
 * 获取 OPEC 产量数据
 * @returns {Promise}
 */
export function getOilOpecProduction() {
  return request({
    url: `${BASE_URL}/opec`,
    method: 'get'
  })
}

/**
 * 获取战略石油储备数据
 * @returns {Promise}
 */
export function getOilSprData() {
  return request({
    url: `${BASE_URL}/spr`,
    method: 'get'
  })
}

// ------------------------------------------------------------------ //
//  市场综合概览                                                         //
// ------------------------------------------------------------------ //

/**
 * 获取市场综合概览（价格 + OPEC + SPR + 风险指数）
 * @returns {Promise}
 */
export function getOilMarketOverview() {
  return request({
    url: `${BASE_URL}/market-overview`,
    method: 'get'
  })
}

// ------------------------------------------------------------------ //
//  新闻滚动                                                            //
// ------------------------------------------------------------------ //

/**
 * 获取石油新闻滚动数据
 * @returns {Promise}
 */
export function getOilNews() {
  return request({
    url: `${BASE_URL}/news`,
    method: 'get'
  })
}

// ------------------------------------------------------------------ //
//  报告生成 (Agent)                                                     //
// ------------------------------------------------------------------ //

/**
 * 生成石油供应链分析报告
 * @param {Object} data - 请求体
 * @param {string} data.query - 分析请求
 * @param {string} [data.topic] - 指定主题
 * @returns {Promise}
 */
export function analyzeOilReport(data) {
  return request({
    url: `${BASE_URL}/report/analyze`,
    method: 'post',
    data
  })
}

/**
 * 获取报告生成用知识库
 * @param {string} topic - 可选主题
 * @returns {Promise}
 */
export function getOilReportKnowledge(topic) {
  const params = {}
  if (topic) params.topic = topic
  return request({
    url: `${BASE_URL}/report/knowledge`,
    method: 'get',
    params
  })
}

// ------------------------------------------------------------------ //
//  缓存 & 健康检查                                                      //
// ------------------------------------------------------------------ //

/**
 * 刷新后端数据缓存
 * @returns {Promise}
 */
export function refreshOilCache() {
  return request({
    url: `${BASE_URL}/cache/refresh`,
    method: 'post'
  })
}

/**
 * 石油供应链 API 健康检查
 * @returns {Promise}
 */
export function oilHealthCheck() {
  return request({
    url: `${BASE_URL}/health`,
    method: 'get'
  })
}
