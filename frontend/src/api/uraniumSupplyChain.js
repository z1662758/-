// src/api/uraniumSupplyChain.js
// 铀供应链知识库 API（后端蓝图 /SCnet/uraniumSupplyChain，数据源 data/铀/processed/*.json）。
// 这些接口提供知识库口径的事实数据：各国产量历史、长协/现货年度合同量、年度全球产量与现货价格。
// 态势地图用它们给「态势快照」的链路补上可溯源的体量口径（tU）。
import request from '@/utils/request'

/**
 * 各国铀供应主体画像（含 production_history 年度产量、产能、风险画像）
 * @returns {Promise<{success: boolean, data: object, message: string}>}
 */
export function getUraniumSuppliers() {
  return request({
    url: '/SCnet/uraniumSupplyChain/suppliers',
    method: 'get'
  })
}

/**
 * 中核/中广核/接卸港与各国的协作网络（每条边含 estimated_annual_volume_tU 年度合同量）
 * @returns {Promise<{success: boolean, data: object, message: string}>}
 */
export function getUraniumCollaboration() {
  return request({
    url: '/SCnet/uraniumSupplyChain/collaboration',
    method: 'get'
  })
}

/**
 * 年度市场统计（1997 起：全球产量、现货价格、生产国/消费国数量）
 * @returns {Promise<{success: boolean, data: object, message: string}>}
 */
export function getUraniumMarketStatistics() {
  return request({
    url: '/SCnet/uraniumSupplyChain/market/statistics',
    method: 'get'
  })
}
