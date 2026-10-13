// frontend/src/api/uraniumBackend.js
// 连通 sgm-cmse 后端真实数据与算法服务接口
import request from '@/utils/request'

/**
 * 通用解包辅助函数
 */
function unwrap(res) {
  if (res && typeof res === 'object') {
    if ('data' in res) return res.data
    return res
  }
  return res
}

/**
 * 快速健康检查
 */
export function checkBackendHealth() {
  return request({
    url: '/health',
    method: 'get',
    timeout: 3000
  }).then(unwrap).catch(() => null)
}

/**
 * 获取事中流程框架定义
 */
export function getDuringFrame() {
  return request({
    url: '/api/during/frame',
    method: 'get'
  }).then(unwrap)
}

/**
 * 获取所有全球铀供给方属性（31国矿山与供应源，包含真实产能、资源量、成本等级与合同可靠性）
 */
export function getUraniumSuppliers() {
  return request({
    url: '/SCnet/uraniumSupplyChain/suppliers',
    method: 'get'
  }).then(unwrap)
}

/**
 * 获取指定供给方详情
 */
export function getUraniumSupplierDetail(supplierId) {
  return request({
    url: `/SCnet/uraniumSupplyChain/supplier/${encodeURIComponent(supplierId)}`,
    method: 'get'
  }).then(unwrap)
}

/**
 * 获取所有国内核电采购与制造方实体（中核、中广核、连云港等）
 */
export function getUraniumManufacturers() {
  return request({
    url: '/SCnet/uraniumSupplyChain/manufacturers',
    method: 'get'
  }).then(unwrap)
}

/**
 * 获取供给方-制造方合作网络
 */
export function getUraniumCollaborationNetwork() {
  return request({
    url: '/SCnet/uraniumSupplyChain/collaboration',
    method: 'get'
  }).then(unwrap)
}

/**
 * 获取铀供应链历史冲击事件（1997-2024，包含金融危机、地缘冲突、政变等27起真实事件）
 */
export function getUraniumEnvironmentEvents(params = {}) {
  return request({
    url: '/SCnet/uraniumSupplyChain/events',
    method: 'get',
    params
  }).then(unwrap)
}

/**
 * 获取事件时间线（按年份聚合）
 */
export function getUraniumEventTimeline() {
  return request({
    url: '/SCnet/uraniumSupplyChain/events/timeline',
    method: 'get'
  }).then(unwrap)
}

/**
 * 获取年度市场统计数据（历史现货价、长协价、全球产量与需求）
 */
export function getUraniumMarketStatistics() {
  return request({
    url: '/SCnet/uraniumSupplyChain/market/statistics',
    method: 'get'
  }).then(unwrap)
}

/**
 * 快速运行年度仿真（直接调用后端环境与实体执行）
 */
export function runQuickSimulation(payload = {}) {
  return request({
    url: '/SCnet/uraniumSupplyChain/simulate/quick',
    method: 'post',
    data: payload
  }).then(unwrap)
}

/**
 * 运行四种采购决策策略对比（E0基线, E1单一来源, E2多元化Top-5, E3自适应）
 */
export function compareUraniumStrategies(payload = { year: 2024 }) {
  return request({
    url: '/SCnet/uraniumSupplyChain/compare/strategies',
    method: 'post',
    data: payload,
    timeout: 30000
  }).then(unwrap)
}

/**
 * 获取供应中断风险研判（K2-DEC: disruption_risk_assessment.v1）
 */
export function getDisruptionRiskAssessment() {
  return request({
    url: '/SCnet/uraniumDecision/disruption',
    method: 'get'
  }).then(unwrap)
}

/**
 * 获取替代物流走廊推荐（阿拉山口铁路专列 vs 鲸湾港海运连云港 vs TITR走廊）
 */
export function getAlternativeRoutes(params = {}) {
  return request({
    url: '/SCnet/uraniumDecision/alternative-routes',
    method: 'get',
    params
  }).then(unwrap)
}

/**
 * 获取来源国推荐
 */
export function getSourcingRecommendations() {
  return request({
    url: '/SCnet/uraniumDecision/sourcing',
    method: 'get'
  }).then(unwrap)
}

/**
 * 综合决策分析（中断风险 + 影响传导 + 替代路线 + 来源国推荐）
 */
export function analyzeUraniumDecision(payload = {}) {
  return request({
    url: '/SCnet/uraniumDecision/analyze',
    method: 'post',
    data: payload
  }).then(unwrap)
}

/**
 * 获取后台任务队列历史
 */
export function getQueueHistory(limit = 20) {
  return request({
    url: '/api/queue/history',
    method: 'get',
    params: { limit }
  }).then(unwrap)
}

/**
 * 获取后台任务队列运行状态
 */
export function getQueueStatus() {
  return request({
    url: '/api/queue/status',
    method: 'get'
  }).then(unwrap)
}

/**
 * 向异步任务队列提交实验
 */
export function submitQueueTask(payload = {}) {
  return request({
    url: '/api/queue/submit',
    method: 'post',
    data: payload
  }).then(unwrap)
}

/**
 * 获取当前最新铀供应链态势快照
 */
export function getLatestSituationSnapshot(osintMode = 'REAL') {
  return request({
    url: '/SCnet/uraniumSituation/latest',
    method: 'get',
    params: { osint_mode: osintMode }
  }).then(unwrap)
}
