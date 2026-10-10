// src/utils/uraniumSituationAdapter.js
//
// 铀供应链「态势快照 -> 态势地图」适配器。
//
// 数据全部来自后端真实计算结果，不做前端合成：
//   1) /SCnet/uraniumSituation/latest
//      态势快照：7 条海外供应路线（含逐节点经纬度链路、风险分、份额、关键节点），
//      由后端模型链 uranium_supply_graph_builder_v1 -> ... -> uranium_route_risk_model_v1 串联产出；
//   2) /SCnet/uraniumSupplyChain/suppliers
//      各国产量历史（1994-2021，tU），用于年度轴上的供给体量；
//   3) /SCnet/uraniumSupplyChain/collaboration
//      长协/现货年度合同量（estimated_annual_volume_tU）；
//   4) /SCnet/uraniumSupplyChain/market/statistics
//      年度全球产量、现货价格、生产国数量。
//
// 输出结构与 uraniumDuringAdapter.buildMapPayload 对齐，因此 UraniumFlowMap
// 无需改动即可渲染（payload / timelineRows 两个 prop 直接吃这里的结果）。

const RISK_COLORS = Object.freeze({ high: '#dc2626', medium: '#f59e0b', low: '#16a34a' })
const RISK_LABELS = Object.freeze({ high: '高风险', medium: '中风险', low: '低风险' })

// 快照节点 type -> 枢纽类别（决定点位大小与 tooltip 文案）
const HUB_KIND_MAP = Object.freeze({
  '边境口岸': { kind: 'land_port', label: '边境口岸' },
  '港口': { kind: 'port', label: '接卸港' },
  '铁路节点': { kind: 'rail', label: '铁路集结点' },
  '铁路通道': { kind: 'rail', label: '铁路通道' },
  '海运通道': { kind: 'seaway', label: '海运航段' },
  '陆路通道': { kind: 'road', label: '陆路通道' },
  '国内转运': { kind: 'inland', label: '国内转运' },
  '国内接收': { kind: 'inland', label: '国内接收枢纽' }
})

// 运输方式文案 -> 线型（铁路/陆路实线，纯海运虚线，联运点划线）
const TRANSPORT_LINE_TYPE = Object.freeze({
  land_route: 'solid',
  sea_route: 'dashed',
  inland_plus_sea: 'dotted'
})

const toNumber = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const normalizeCoord = (value) => {
  if (!Array.isArray(value) || value.length < 2) return null
  const lng = Number(value[0])
  const lat = Number(value[1])
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return [lng, lat]
}

const coordKey = (coord) => (coord ? coord[0].toFixed(2) + ',' + coord[1].toFixed(2) : '')

const riskColorOf = (level, fallback = '#0ea5e9') => RISK_COLORS[String(level || '').trim().toLowerCase()] || fallback

export const situationRiskLabel = (level) => RISK_LABELS[String(level || '').trim().toLowerCase()] || '未评级'

/** 运输方式文案 -> 前端通道类型（与 uraniumDuringAdapter.ROUTE_META 的键一致） */
export function resolveTransportRouteType(transport) {
  const text = String(transport || '')
  const bySea = /海运|航线|海上/.test(text)
  const byLand = /铁路|陆路|公路|联运/.test(text)
  if (bySea && byLand) return 'inland_plus_sea'
  if (bySea) return 'sea_route'
  return 'land_route'
}

/** 快照路线归一化：坐标逐点校验，只保留至少两个有效点位的链路 */
export function normalizeSituationRoutes(snapshot) {
  return (snapshot?.routes || [])
    .map((route) => {
      const nodes = (route?.nodes || [])
        .map((node) => ({ ...node, coord: normalizeCoord(node?.coord) }))
        .filter((node) => node.coord)
      return { ...route, nodes, coordPath: nodes.map((node) => node.coord) }
    })
    .filter((route) => route.nodes.length >= 2)
}

/** 各国产量历史索引：国家 -> { 年份: 产量tU } */
export function buildProductionIndex(suppliers) {
  const index = {}
  ;(suppliers?.suppliers || []).forEach((item) => {
    const country = String(item?.country || '').trim()
    if (!country) return
    index[country] = item?.production_history && typeof item.production_history === 'object'
      ? item.production_history
      : {}
  })
  return index
}

/** 年度合同量索引：国家 -> 年度合同量 tU（协作网络按供应国汇总） */
export function buildContractVolumeIndex(collaboration) {
  const index = {}
  const network = collaboration?.network || {}
  Object.keys(network).forEach((key) => {
    const edge = network[key] || {}
    const country = String(edge.supplier_country || '').trim()
    if (!country) return
    index[country] = toNumber(index[country]) + toNumber(edge.estimated_annual_volume_tU)
  })
  return index
}

/** 年度轴：真实年份（1997-2021，逐年全球产量/现货价格/生产国数 + 路径国产量合计） */
export function buildSituationTimeline(snapshot, options = {}) {
  const { suppliers, marketStatistics } = options
  const production = buildProductionIndex(suppliers)
  const routeCountries = normalizeSituationRoutes(snapshot).map((route) => route.country)
  const yearly = (marketStatistics?.yearly || [])
    .filter((row) => row && (row.has_production_data || row.has_price_data))
  return yearly.map((row) => {
    const year = toNumber(row.year)
    const routeProduction = routeCountries.reduce(
      (sum, country) => sum + toNumber((production[country] || {})[year]),
      0
    )
    return {
      id: 'uranium-situation-' + year,
      year,
      market_price_usd_lb: row.spot_price_usd_lb,
      has_price_data: Boolean(row.has_price_data),
      total_supply_tU: row.global_production_tU,
      producer_country_count: row.n_producer_countries,
      consumer_country_count: row.n_consumer_countries,
      route_production_tU: routeProduction
    }
  })
}

/**
 * 快照 -> 态势地图 payload
 * @param {Object} snapshot 态势快照
 * @param {Object} [options]
 * @param {number|null} [options.year] 年度轴当前年份（决定供给体量口径）
 * @param {Object} [options.production] buildProductionIndex 结果
 * @param {Object} [options.contractVolumes] buildContractVolumeIndex 结果
 */
export function buildSituationMapPayload(snapshot, options = {}) {
  const { year = null, production = {}, contractVolumes = {} } = options
  const routes = normalizeSituationRoutes(snapshot)
  const supplierNodes = []
  const manufacturerMap = new Map()
  const hubMap = new Map()
  const lines = []

  routes.forEach((route) => {
    const head = route.nodes[0]
    const tail = route.nodes[route.nodes.length - 1]
    const middles = route.nodes.slice(1, -1)
    const share = toNumber(route.share)
    const riskLevel = String(route.risk_level || '').trim().toLowerCase()
    const transport = String(route.transport || '').trim()
    const routeType = resolveTransportRouteType(transport)
    const color = riskColorOf(riskLevel, route.color || '#0ea5e9')
    // 体量口径优先用「该年真实产量」，缺年份数据时回落到知识库年度合同量
    const yearVolume = toNumber((production[route.country] || {})[year])
    const quantity = yearVolume > 0 ? yearVolume : toNumber(contractVolumes[route.country])
    const supplierId = 'situation_supplier_' + route.id
    const manufacturerId = 'situation_receive_' + coordKey(tail.coord)
    const routeKey = 'situation_route_' + route.id
    const routeTrace = route.nodes.map((node) => node.name).filter(Boolean).join(' -> ')

    supplierNodes.push({
      id: supplierId,
      name: head.name,
      country: route.country,
      asset: route.country,
      company: transport,
      coord: head.coord,
      route_type: routeType,
      available_supply_tU: quantity,
      risk_exposure: toNumber(head.risk_score) / 100,
      supply_share: share,
      route_key: routeKey
    })

    const receive = manufacturerMap.get(manufacturerId)
    if (receive) {
      receive.procured_tU += quantity
      receive.route_count += 1
      receive.countries.push(route.country)
    } else {
      manufacturerMap.set(manufacturerId, {
        id: manufacturerId,
        name: tail.name,
        location: tail.name,
        coord: tail.coord,
        group: '',
        port_name: transport || '接卸枢纽',
        procured_tU: quantity,
        route_count: 1,
        countries: [route.country]
      })
    }

    lines.push({
      supplier_id: supplierId,
      supplier_name: head.name,
      supplier_company: route.country,
      supplier_asset: transport,
      manufacturer_id: manufacturerId,
      manufacturer_name: tail.name,
      manufacturer_group: route.country,
      quantity_tU: quantity,
      supply_share: share,
      risk_level: riskLevel,
      risk_label: situationRiskLabel(riskLevel),
      risk_score: toNumber(route.display_risk_score, toNumber(route.risk_score)),
      route_type: routeType,
      route_label: transport || '运输通道',
      preferred_china_port_tag: tail.name,
      route_trace: routeTrace,
      route_key: routeKey,
      coords: route.coordPath,
      directCoords: [head.coord, tail.coord],
      lineStyle: {
        color,
        type: TRANSPORT_LINE_TYPE[routeType] || 'solid',
        width: Math.min(3.2, 1.8 + share / 10)
      }
    })

    middles.forEach((node) => {
      const key = node.name + '|' + coordKey(node.coord)
      const kindMeta = HUB_KIND_MAP[node.type] || { kind: 'hub', label: node.type || '运输节点' }
      if (!hubMap.has(key)) {
        hubMap.set(key, {
          id: 'situation_hub_' + hubMap.size,
          name: node.name,
          coord: node.coord,
          kind: kindMeta.kind,
          kindLabel: kindMeta.label,
          nodeType: node.type || '',
          color: riskColorOf(node.risk, '#64748b'),
          risk_label: situationRiskLabel(node.risk),
          riskScore: toNumber(node.risk_score),
          routeKeys: [],
          routeTypes: [],
          countries: []
        })
      }
      const hub = hubMap.get(key)
      if (!hub.routeKeys.includes(routeKey)) hub.routeKeys.push(routeKey)
      if (!hub.routeTypes.includes(routeType)) hub.routeTypes.push(routeType)
      if (!hub.countries.includes(route.country)) hub.countries.push(route.country)
      hub.riskScore = Math.max(hub.riskScore, toNumber(node.risk_score))
    })
  })

  const hubNodes = []
  hubMap.forEach((hub) => {
    hubNodes.push({ ...hub, routeCount: hub.routeKeys.length, route_country_text: hub.countries.join('、') })
  })
  const manufacturerNodes = []
  manufacturerMap.forEach((item) => {
    manufacturerNodes.push({ ...item, group: item.countries.join(' / '), route_country_list: item.countries })
  })

  return {
    yearIndex: 0,
    yearData: {
      year,
      supplier_count: supplierNodes.length,
      manufacturer_count: manufacturerNodes.length,
      line_count: lines.length
    },
    supplierNodes,
    manufacturerNodes,
    lines,
    hubNodes
  }
}

const formatNumber = (value, digits = 0) => {
  if (value === null || value === undefined || value === '') return '--'
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return num.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** 年度指标卡：全部取真实统计口径 */
export function buildSituationMetricCards(row) {
  return [
    { label: '现货价格', value: formatNumber(row?.market_price_usd_lb, 1) + ' $/lb' },
    { label: '全球产量', value: formatNumber(row?.total_supply_tU) + ' tU' },
    { label: '路径国产量', value: formatNumber(row?.route_production_tU) + ' tU' },
    { label: '生产国数量', value: formatNumber(row?.producer_country_count) + ' 国' }
  ]
}

/**
 * 默认年份：取最近一个「有现货价格数据」的年份（2021 及以后市场统计缺价），
 * 保证年度指标卡不为空；全缺价时回落最后一年。
 */
export function resolveLatestPricedYearIndex(rows = []) {
  if (!rows.length) return 0
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index]?.has_price_data && rows[index]?.market_price_usd_lb !== null) return index
  }
  return rows.length - 1
}

/** 快照时间戳（用于工具栏口径标注） */
export function formatSnapshotStamp(snapshot) {
  const raw = String(snapshot?.generated_at || '').trim()
  if (!raw) return ''
  const matched = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!matched) return raw
  return matched[1] + '-' + String(matched[2]).padStart(2, '0') + '-' + String(matched[3]).padStart(2, '0')
}
