const COUNTRY_COORDINATES = Object.freeze({
  '哈萨克斯坦': [71.43, 51.17],
  '乌兹别克': [69.24, 41.31],
  '乌兹别克斯坦': [69.24, 41.31],
  '加拿大': [-106.35, 56.13],
  '纳米比亚': [14.51, -22.68],
  '澳大利亚': [133.78, -25.27],
  '尼日尔': [8.08, 17.61],
  '俄罗斯': [105.32, 61.52],
  '美国': [-98.58, 39.83],
  '马拉维': [34.3, -13.25],
  '印度': [78.96, 20.59],
  '乌克兰': [31.17, 48.38],
  '南非': [22.94, -30.56],
  '中国': [104.2, 35.86],
  '法国': [2.21, 46.23],
  '韩国': [127.77, 35.91],
  '日本': [138.25, 36.2]
})

const LOCATION_COORDINATES = Object.freeze({
  'North China': [117.2, 39.13],
  'East China': [121.47, 31.23],
  'South China': [113.27, 23.13],
  Kazakhstan_inland_land_route: [67.9, 48.1],
  Uzbekistan_inland_land_route: [64.6, 41.2],
  Canada_sea_route: [-73.57, 45.5],
  Namibia_sea_route: [14.51, -22.68],
  Australia_sea_route: [138.6, -34.93],
  Niger_inland_to_sea_route: [2.12, 13.52],
  Russia_land_or_sea_route: [82.92, 55.03],
  UnitedStates_sea_route: [-118.24, 34.05],
  Malawi_inland_to_sea_route: [35.0, -15.79],
  India_sea_route: [72.88, 19.08],
  Ukraine_sea_route: [30.72, 46.48],
  SouthAfrica_sea_route: [18.42, -33.93]
})

const PORT_COORDINATES = Object.freeze({
  LAND_NW: [87.62, 43.82],
  PORT_NORTH: [117.78, 39.04],
  PORT_EAST: [121.8, 31.15],
  PORT_SOUTH: [113.54, 22.19]
})

const ROUTE_META = Object.freeze({
  land_route: {
    label: '陆路通道',
    color: '#c2410c',
    lineType: 'dashed',
    width: 2.4
  },
  sea_route: {
    label: '海运通道',
    color: '#2563eb',
    lineType: 'solid',
    width: 2.6
  },
  inland_plus_sea: {
    label: '内陆转海运',
    color: '#7c3aed',
    lineType: 'dotted',
    width: 2.8
  }
})

const TRANSPORT_HUBS = Object.freeze({
  alashankou: { name: '阿拉山口口岸', coord: [82.57, 45.17], kind: 'land_port' },
  urumqi: { name: '乌鲁木齐', coord: [87.62, 43.82], kind: 'land_hub' },
  lanzhou: { name: '兰州转运', coord: [103.84, 36.06], kind: 'land_hub' },
  wuhan: { name: '武汉联运', coord: [114.31, 30.59], kind: 'land_hub' },
  halifax: { name: '哈利法克斯', coord: [-63.57, 44.65], kind: 'port' },
  atlantic: { name: '北大西洋主航段', coord: [-29.5, 43.2], kind: 'sea_hub' },
  gibraltar: { name: '直布罗陀', coord: [-5.35, 36.14], kind: 'chokepoint' },
  mediterranean: { name: '地中海航段', coord: [18.6, 35.2], kind: 'sea_hub' },
  suez: { name: '苏伊士运河', coord: [32.35, 30.45], kind: 'chokepoint' },
  arabianSea: { name: '阿拉伯海航段', coord: [65.2, 15.4], kind: 'sea_hub' },
  indianOcean: { name: '印度洋主航段', coord: [72.8, -15.2], kind: 'sea_hub' },
  malacca: { name: '马六甲海峡', coord: [101.2, 3.1], kind: 'chokepoint' },
  southChinaSea: { name: '南海主航段', coord: [113.8, 16.4], kind: 'sea_hub' },
  eastChinaSea: { name: '东海主航段', coord: [124.2, 28.8], kind: 'sea_hub' },
  capeGoodHope: { name: '好望角', coord: [18.47, -34.35], kind: 'chokepoint' },
  sunda: { name: '巽他海峡', coord: [105.86, -5.92], kind: 'chokepoint' }
})

const HUB_KIND_META = Object.freeze({
  land_port: { label: '陆路口岸', color: '#ea580c' },
  land_hub: { label: '内陆枢纽', color: '#f59e0b' },
  port: { label: '接卸港', color: '#0ea5e9' },
  chokepoint: { label: '关键通道', color: '#ef4444' },
  sea_hub: { label: '海运航段', color: '#64748b' }
})

function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean).map((item) => String(item)))]
}

function safeNumber(value, fallback = null) {
  if (value == null || value === '') return fallback
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getExecutionTimeline(experiment) {
  const result = experiment?.result
  if (!result || typeof result !== 'object') return []
  if (Array.isArray(result.timeline)) return result.timeline
  if (Array.isArray(result.best_result?.timeline)) return result.best_result.timeline
  if (Array.isArray(result.baseline_result?.timeline)) return result.baseline_result.timeline
  return []
}

export function getDisplayReport(experiment) {
  const report = experiment?.report || {}
  if (experiment?.execution_type !== 'feedback_optimization') return report

  const bestReport = report.best_report || {}
  return {
    ...bestReport,
    recommendations: Array.isArray(report.recommendations) && report.recommendations.length
      ? report.recommendations
      : (bestReport.recommendations || []),
    delta_summary: report.delta_summary || {},
    baseline_objective_score: report.baseline_objective_score,
    best_objective_score: report.best_objective_score,
    improvement: report.improvement,
    convergence: report.convergence || {},
    profile_adjustments: report.profile_adjustments || [],
    selected_profiles: report.selected_profiles || [],
    baseline_feedback: report.baseline_feedback || {},
    best_feedback: report.best_feedback || {},
    iteration_trace: report.iteration_trace || [],
    baseline_report: report.baseline_report || {}
  }
}

export function getLatestTimeline(experiment) {
  const timeline = getExecutionTimeline(experiment)
  return timeline.length ? timeline[timeline.length - 1] : null
}

function getIterationHistory(experiment) {
  const history = experiment?.result?.history
  return Array.isArray(history) ? history : []
}

export function buildIterationRows(experiment) {
  const history = getIterationHistory(experiment)
  if (history.length) {
    return history.map((item, index) => {
      const summary = item?.result_summary || {}
      const previous = history[index - 1]
      const currentScore = safeNumber(item?.objective_score)
      const previousScore = safeNumber(previous?.objective_score)
      const selectedLabels = uniqueStrings((item?.profiles || []).map((profile) => profile?.label || profile?.manufacturer_id))

      return {
        id: `${experiment?.experiment_id || 'exp'}-iter-${index}`,
        round_no: index + 1,
        iteration: safeNumber(item?.iteration, index),
        round_label: item?.iteration === 0 ? '初始方案' : `第 ${item?.iteration} 轮`,
        strategy_label: item?.label || (item?.iteration === 0 ? 'initial' : 'candidate'),
        is_baseline: item?.iteration === 0,
        objective_score: currentScore,
        objective_delta: currentScore != null && previousScore != null ? currentScore - previousScore : null,
        objective_improvement: currentScore != null && previousScore != null ? previousScore - currentScore : null,
        inventory_coverage_years: safeNumber(summary.final_inventory_coverage_years ?? summary.avg_inventory_coverage_years),
        avg_risk_exposure: safeNumber(summary.avg_risk_exposure),
        avg_cost_usd_kgU: safeNumber(summary.avg_cost_usd_kgU),
        final_supply_concentration_hhi: safeNumber(summary.final_supply_concentration_hhi ?? summary.avg_supply_hhi),
        final_total_inventory_tU: safeNumber(summary.final_total_inventory_tU),
        avg_unmet_ratio: safeNumber(summary.avg_unmet_ratio),
        max_unmet_demand_tU: safeNumber(summary.max_unmet_demand_tU ?? summary.unmet_demand_tU),
        final_dominant_supplier_share: safeNumber(summary.final_dominant_supplier_share),
        feedback_signals: uniqueStrings(item?.feedback_signals),
        selected_profile_labels: selectedLabels,
        selected_countries: uniqueStrings(item?.selected_countries || item?.countries || []),
        selected_routes: uniqueStrings(item?.selected_routes || item?.routes || []),
        profiles: Array.isArray(item?.profiles) ? item.profiles : [],
        manufacturer_alerts: Array.isArray(summary.manufacturer_alerts) ? summary.manufacturer_alerts : [],
        metrics: summary
      }
    })
  }

  const summary = experiment?.summary || {}
  const report = getDisplayReport(experiment)
  const latest = getLatestTimeline(experiment)
  return [{
    id: `${experiment?.experiment_id || 'exp'}-single`,
    round_no: 1,
    iteration: 0,
    round_label: '单次仿真',
    strategy_label: experiment?.plan?.name || experiment?.template_name || 'current',
    is_baseline: true,
    objective_score: null,
    objective_delta: null,
    objective_improvement: null,
    inventory_coverage_years: safeNumber(summary.final_inventory_coverage_years ?? report.final_inventory_coverage_years),
    avg_risk_exposure: safeNumber(summary.avg_risk_exposure ?? report.avg_risk_exposure),
    avg_cost_usd_kgU: safeNumber(summary.avg_cost_usd_kgU ?? report.avg_cost_usd_kgU),
    final_supply_concentration_hhi: safeNumber(summary.final_supply_concentration_hhi ?? report.final_supply_concentration_hhi),
    final_total_inventory_tU: safeNumber(summary.final_total_inventory_tU ?? report.final_total_inventory_tU),
    avg_unmet_ratio: safeNumber(report.avg_unmet_ratio),
    max_unmet_demand_tU: safeNumber(summary.max_unmet_demand_tU ?? report.max_unmet_demand_tU),
    final_dominant_supplier_share: safeNumber(report.final_dominant_supplier_share),
    feedback_signals: [],
    selected_profile_labels: uniqueStrings((experiment?.plan?.policy_profiles || []).map((item) => item?.label || item?.manufacturer_id)),
    selected_countries: uniqueStrings(experiment?.plan?.selected_countries || experiment?.selected_countries || []),
    selected_routes: uniqueStrings(experiment?.plan?.selected_routes || experiment?.selected_routes || []),
    profiles: Array.isArray(experiment?.plan?.policy_profiles) ? experiment.plan.policy_profiles : [],
    manufacturer_alerts: [],
    active_events: latest?.active_events || [],
    metrics: summary
  }]
}

export function getYearMarks(timeline = []) {
  const marks = {}
  timeline.forEach((item, index) => {
    if (index === 0 || index === timeline.length - 1 || timeline.length <= 6) {
      marks[index] = String(item?.year || index + 1)
    }
  })
  return marks
}

function getIterationCount(experiment) {
  return buildIterationRows(experiment).length
}

function resolveGeoCoordinate({ country, location, portTag } = {}) {
  if (portTag && PORT_COORDINATES[portTag]) return PORT_COORDINATES[portTag]
  if (location && LOCATION_COORDINATES[location]) return LOCATION_COORDINATES[location]
  if (country && COUNTRY_COORDINATES[country]) return COUNTRY_COORDINATES[country]
  return null
}

function buildTransportStrokeWidth(quantity, baseWidth = 2.6) {
  const amount = Math.max(0, safeNumber(quantity, 0))
  return clamp(baseWidth + Math.sqrt(amount) / 44, baseWidth, baseWidth + 1.6)
}

function createWaypoint(name, coord, kind, detail = '') {
  return { name, coord, kind, detail }
}

function coordsEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false
  return Math.abs(Number(left[0]) - Number(right[0])) < 0.001 && Math.abs(Number(left[1]) - Number(right[1])) < 0.001
}

function pushWaypoint(points, point) {
  if (!point?.coord) return
  const last = points[points.length - 1]
  if (last && coordsEqual(last.coord, point.coord) && last.name === point.name) return
  points.push(point)
}

function getChinaPortWaypoint(portTag) {
  const coord = PORT_COORDINATES[portTag]
  if (!coord) return null
  const labelMap = {
    LAND_NW: '西北陆路口岸',
    PORT_NORTH: '北方沿海接卸港',
    PORT_EAST: '东部沿海接卸港',
    PORT_SOUTH: '南方沿海接卸港'
  }
  const kind = portTag === 'LAND_NW' ? 'land_port' : 'port'
  return createWaypoint(labelMap[portTag] || portTag, coord, kind)
}

function buildDomesticLeg(manufacturer = {}, destinationCoord = null, { includePort = true } = {}) {
  const points = []
  const portWaypoint = includePort ? getChinaPortWaypoint(manufacturer?.port_tag) : null
  const destination = destinationCoord
    ? createWaypoint(manufacturer?.name || manufacturer?.location || '国内制造节点', destinationCoord, 'land_hub')
    : null

  if (portWaypoint) pushWaypoint(points, portWaypoint)
  if (manufacturer?.location === 'South China') {
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.wuhan.name, TRANSPORT_HUBS.wuhan.coord, TRANSPORT_HUBS.wuhan.kind))
  }
  if (destination) pushWaypoint(points, destination)
  return points
}

function buildLandTransit(originCoord, supplier = {}, manufacturer = {}, destinationCoord = null) {
  const points = [createWaypoint(supplier?.name || supplier?.country || '供应地', originCoord, 'land_hub')]
  pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.alashankou.name, TRANSPORT_HUBS.alashankou.coord, TRANSPORT_HUBS.alashankou.kind))
  pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.urumqi.name, TRANSPORT_HUBS.urumqi.coord, TRANSPORT_HUBS.urumqi.kind))
  if (manufacturer?.location !== 'North China') {
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.lanzhou.name, TRANSPORT_HUBS.lanzhou.coord, TRANSPORT_HUBS.lanzhou.kind))
  }
  buildDomesticLeg(manufacturer, destinationCoord, { includePort: false }).forEach((item) => pushWaypoint(points, item))
  return points
}

function buildSeaTransit(originCoord, supplier = {}, manufacturer = {}, destinationCoord = null) {
  const points = [createWaypoint(supplier?.name || supplier?.country || '供应地', originCoord, 'port')]
  const country = String(supplier?.country || '')

  if (country === '加拿大') {
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.halifax.name, TRANSPORT_HUBS.halifax.coord, TRANSPORT_HUBS.halifax.kind))
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.atlantic.name, TRANSPORT_HUBS.atlantic.coord, TRANSPORT_HUBS.atlantic.kind))
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.gibraltar.name, TRANSPORT_HUBS.gibraltar.coord, TRANSPORT_HUBS.gibraltar.kind))
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.mediterranean.name, TRANSPORT_HUBS.mediterranean.coord, TRANSPORT_HUBS.mediterranean.kind))
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.suez.name, TRANSPORT_HUBS.suez.coord, TRANSPORT_HUBS.suez.kind))
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.arabianSea.name, TRANSPORT_HUBS.arabianSea.coord, TRANSPORT_HUBS.arabianSea.kind))
  } else if (country === '纳米比亚') {
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.capeGoodHope.name, TRANSPORT_HUBS.capeGoodHope.coord, TRANSPORT_HUBS.capeGoodHope.kind))
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.indianOcean.name, TRANSPORT_HUBS.indianOcean.coord, TRANSPORT_HUBS.indianOcean.kind))
  } else if (country === '澳大利亚') {
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.sunda.name, TRANSPORT_HUBS.sunda.coord, TRANSPORT_HUBS.sunda.kind))
  } else {
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.indianOcean.name, TRANSPORT_HUBS.indianOcean.coord, TRANSPORT_HUBS.indianOcean.kind))
  }

  pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.malacca.name, TRANSPORT_HUBS.malacca.coord, TRANSPORT_HUBS.malacca.kind))
  if (manufacturer?.port_tag === 'PORT_EAST' || manufacturer?.location === 'East China') {
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.eastChinaSea.name, TRANSPORT_HUBS.eastChinaSea.coord, TRANSPORT_HUBS.eastChinaSea.kind))
  } else {
    pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.southChinaSea.name, TRANSPORT_HUBS.southChinaSea.coord, TRANSPORT_HUBS.southChinaSea.kind))
  }

  buildDomesticLeg(manufacturer, destinationCoord).forEach((item) => pushWaypoint(points, item))
  return points
}

function buildInlandPlusSeaTransit(originCoord, supplier = {}, manufacturer = {}, destinationCoord = null) {
  const points = [createWaypoint(supplier?.name || supplier?.country || '供应地', originCoord, 'land_hub')]
  pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.capeGoodHope.name, TRANSPORT_HUBS.capeGoodHope.coord, TRANSPORT_HUBS.capeGoodHope.kind))
  pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.indianOcean.name, TRANSPORT_HUBS.indianOcean.coord, TRANSPORT_HUBS.indianOcean.kind))
  pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.malacca.name, TRANSPORT_HUBS.malacca.coord, TRANSPORT_HUBS.malacca.kind))
  pushWaypoint(points, createWaypoint(TRANSPORT_HUBS.southChinaSea.name, TRANSPORT_HUBS.southChinaSea.coord, TRANSPORT_HUBS.southChinaSea.kind))
  buildDomesticLeg(manufacturer, destinationCoord).forEach((item) => pushWaypoint(points, item))
  return points
}

function buildTransportWaypoints(originCoord, destinationCoord, supplier = {}, manufacturer = {}) {
  const routeType = String(supplier?.route_type || '')
  if (!originCoord || !destinationCoord) return []
  if (routeType === 'land_route') return buildLandTransit(originCoord, supplier, manufacturer, destinationCoord)
  if (routeType === 'inland_plus_sea') return buildInlandPlusSeaTransit(originCoord, supplier, manufacturer, destinationCoord)
  return buildSeaTransit(originCoord, supplier, manufacturer, destinationCoord)
}

function buildTransportHubRows(lines = []) {
  const hubs = new Map()

  ;(Array.isArray(lines) ? lines : []).forEach((line) => {
    ;(line.route_waypoints || []).forEach((point, index, rows) => {
      if (!point?.coord?.length) return
      if (index === 0 || index === rows.length - 1) return
      const key = `${point.name}::${point.coord[0]}::${point.coord[1]}`
      if (!hubs.has(key)) {
        const meta = HUB_KIND_META[point.kind] || HUB_KIND_META.sea_hub
        hubs.set(key, {
          id: key,
          name: point.name,
          coord: point.coord,
          kind: point.kind,
          kindLabel: meta.label,
          color: meta.color,
          routeKeys: new Set(),
          routeTypes: new Set()
        })
      }
      const hub = hubs.get(key)
      hub.routeKeys.add(line.route_key || '')
      hub.routeTypes.add(line.route_type || '')
    })
  })

  return [...hubs.values()].map((item) => ({
    id: item.id,
    name: item.name,
    coord: item.coord,
    kind: item.kind,
    kindLabel: item.kindLabel,
    color: item.color,
    routeCount: item.routeKeys.size,
    routeKeys: [...item.routeKeys],
    routeTypes: [...item.routeTypes]
  }))
}

function aggregateById(rows = []) {
  return (Array.isArray(rows) ? rows : []).reduce((acc, item) => {
    if (!item?.id) return acc
    acc[item.id] = item
    return acc
  }, {})
}

export function buildUraniumRouteKey(route = {}) {
  return [
    route.supplier_id || route.supplier_name || 'supplier',
    route.manufacturer_id || route.manufacturer_name || 'manufacturer',
    route.preferred_china_port_tag || route.port_tag || 'port',
    route.route_type || route.route_label || 'route'
  ].join('::')
}

export function buildMapPayload(experiment, yearIndex = null) {
  const timeline = getExecutionTimeline(experiment)
  if (!timeline.length) {
    return {
      yearIndex: 0,
      yearData: null,
      supplierNodes: [],
      manufacturerNodes: [],
      lines: []
    }
  }

  const resolvedIndex = yearIndex == null
    ? Math.max(0, timeline.length - 1)
    : Math.max(0, Math.min(timeline.length - 1, yearIndex))
  const yearData = timeline[resolvedIndex]
  const suppliersById = aggregateById(yearData?.suppliers)
  const manufacturersById = aggregateById(yearData?.manufacturers)

  const supplierNodes = (yearData?.suppliers || [])
    .map((item) => {
      const coord = resolveGeoCoordinate({ country: item.country, location: item.location, portTag: item.preferred_china_port_tag })
      if (!coord) return null
      return {
        ...item,
        coord,
        role: 'supplier',
        routeMeta: ROUTE_META[item.route_type] || ROUTE_META.sea_route
      }
    })
    .filter(Boolean)

  const manufacturerNodes = (yearData?.manufacturers || [])
    .map((item) => {
      const coord = resolveGeoCoordinate({ location: item.location, portTag: item.port_tag })
      if (!coord) return null
      return {
        ...item,
        coord,
        role: 'manufacturer'
      }
    })
    .filter(Boolean)

  const lines = (yearData?.allocations || [])
    .map((allocation) => {
      const supplier = suppliersById[allocation.supplier_id]
      const manufacturer = manufacturersById[allocation.manufacturer_id]
      const fromCoord = resolveGeoCoordinate({
        country: supplier?.country,
        location: supplier?.location,
        portTag: supplier?.preferred_china_port_tag
      })
      const toCoord = resolveGeoCoordinate({
        location: manufacturer?.location,
        portTag: manufacturer?.port_tag
      })
      if (!fromCoord || !toCoord) return null
      const routeMeta = ROUTE_META[supplier?.route_type] || ROUTE_META.sea_route
      const routeWaypoints = buildTransportWaypoints(fromCoord, toCoord, supplier, manufacturer)
      const pathLabel = routeWaypoints
        .map((item) => item.name)
        .filter(Boolean)
        .join(' → ')

      return {
        ...allocation,
        supplier_name: allocation?.supplier_name || supplier?.name || allocation?.supplier_id || '',
        supplier_company: supplier?.company || '',
        supplier_asset: supplier?.asset || '',
        supplier_country: supplier?.country || '',
        manufacturer_name: allocation?.manufacturer_name || manufacturer?.name || allocation?.manufacturer_id || '',
        manufacturer_group: manufacturer?.group || '',
        manufacturer_facility: manufacturer?.facility || '',
        manufacturer_location: manufacturer?.location || '',
        route_type: supplier?.route_type || '',
        preferred_china_port_tag: supplier?.preferred_china_port_tag || manufacturer?.port_tag || '',
        route_label: routeMeta.label,
        lineStyle: {
          color: routeMeta.color,
          type: routeMeta.lineType,
          width: buildTransportStrokeWidth(allocation.quantity_tU, routeMeta.width)
        },
        coords: routeWaypoints.map((item) => item.coord),
        directCoords: [fromCoord, toCoord],
        route_waypoints: routeWaypoints,
        route_trace: pathLabel,
        route_key: buildUraniumRouteKey({
          ...allocation,
          supplier_name: allocation?.supplier_name || supplier?.name || allocation?.supplier_id || '',
          manufacturer_name: allocation?.manufacturer_name || manufacturer?.name || allocation?.manufacturer_id || '',
          preferred_china_port_tag: supplier?.preferred_china_port_tag || manufacturer?.port_tag || '',
          route_type: supplier?.route_type || ''
        })
      }
    })
    .filter(Boolean)

  const hubNodes = buildTransportHubRows(lines)

  return {
    yearIndex: resolvedIndex,
    yearData,
    supplierNodes,
    manufacturerNodes,
    lines,
    hubNodes
  }
}

export function formatExecutionModeLabel(executionType) {
  return executionType === 'feedback_optimization' ? '多轮迭代' : '单轮仿真'
}

function toFiniteNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function formatUraniumNumber(value, digits = 2) {
  const num = toFiniteNumber(value)
  if (num == null) return '-'
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
}

export function formatUraniumPercent(value, digits = 1) {
  const num = toFiniteNumber(value)
  if (num == null) return '-'
  const pct = Math.abs(num) > 1 ? num : num * 100
  return `${pct.toFixed(digits)}%`
}

export function formatUraniumMetricValue(key, value) {
  const num = toFiniteNumber(value)
  if (num == null) return '-'

  switch (key) {
    case 'market_price_usd_lb':
    case 'average_cost_usd_kgU':
    case 'avg_cost_usd_kgU':
      return `$${num.toFixed(2)}`
    case 'average_risk_exposure':
    case 'avg_risk_exposure':
    case 'dominant_supplier_share':
    case 'final_dominant_supplier_share':
      return formatUraniumPercent(num)
    case 'unmet_demand_tU':
    case 'max_unmet_demand_tU':
    case 'total_supply_tU':
    case 'total_procured_tU':
    case 'total_demand_tU':
    case 'final_total_inventory_tU':
      return `${formatUraniumNumber(num)} tU`
    case 'inventory_coverage_years':
    case 'final_inventory_coverage_years':
      return `${num.toFixed(2)} 年`
    case 'supply_concentration_hhi':
    case 'final_supply_concentration_hhi':
      return num.toFixed(3)
    default:
      return formatUraniumNumber(num)
  }
}

export function buildUraniumTimelineRows(experiment) {
  const timeline = getExecutionTimeline(experiment)
  return timeline.map((item, index) => ({
    id: `${experiment?.experiment_id || 'exp'}-year-${index}`,
    year: safeNumber(item?.year, index + 1),
    active_events: Array.isArray(item?.active_events) ? item.active_events : [],
    active_event_count: Array.isArray(item?.active_events) ? item.active_events.length : 0,
    market_price_usd_lb: safeNumber(item?.market_price_usd_lb),
    market_price_usd_kgU: safeNumber(item?.market_price_usd_kgU),
    total_supply_tU: safeNumber(item?.total_supply_tU),
    total_procured_tU: safeNumber(item?.total_procured_tU),
    total_demand_tU: safeNumber(item?.total_demand_tU),
    unmet_demand_tU: safeNumber(item?.unmet_demand_tU),
    average_cost_usd_kgU: safeNumber(item?.average_cost_usd_kgU),
    average_risk_exposure: safeNumber(item?.average_risk_exposure),
    inventory_coverage_years: safeNumber(item?.inventory_coverage_years),
    supply_concentration_hhi: safeNumber(item?.supply_concentration_hhi),
    dominant_supplier_share: safeNumber(item?.dominant_supplier_share),
    top_supplier_shares: Array.isArray(item?.top_supplier_shares) ? item.top_supplier_shares : [],
    contract_mix: Array.isArray(item?.contract_mix) ? item.contract_mix : [],
    supplier_count: Array.isArray(item?.suppliers) ? item.suppliers.length : 0,
    manufacturer_count: Array.isArray(item?.manufacturers) ? item.manufacturers.length : 0,
    manufacturers: Array.isArray(item?.manufacturers) ? item.manufacturers : [],
    suppliers: Array.isArray(item?.suppliers) ? item.suppliers : [],
    allocations: Array.isArray(item?.allocations) ? item.allocations : []
  }))
}

export function summarizeExperimentHistoryRow(experiment) {
  const summary = experiment?.summary || {}
  const report = getDisplayReport(experiment)
  const timeline = buildUraniumTimelineRows(experiment)
  const latest = timeline[timeline.length - 1] || {}
  const scenarioContext = experiment?.scenario_context || {}

  return {
    experiment_id: experiment?.experiment_id || '',
    template_name: experiment?.template_name || experiment?.plan?.template_used || '',
    plan: experiment?.plan || {},
    name: experiment?.plan?.name || experiment?.name || '',
    description: experiment?.plan?.description || experiment?.description || '',
    execution_type: experiment?.execution_type || 'simulation',
    completed_at: experiment?.completed_at || experiment?.created_at || '',
    start_year: experiment?.plan?.start_year ?? experiment?.start_year ?? timeline[0]?.year ?? null,
    end_year: experiment?.plan?.end_year ?? experiment?.end_year ?? latest.year ?? null,
    optimization_iterations: experiment?.plan?.optimization_iterations ?? experiment?.optimization_iterations ?? getIterationCount(experiment),
    avg_cost_usd_kgU: safeNumber(summary.avg_cost_usd_kgU ?? report.avg_cost_usd_kgU),
    avg_risk_exposure: safeNumber(summary.avg_risk_exposure ?? report.avg_risk_exposure),
    final_inventory_coverage_years: safeNumber(summary.final_inventory_coverage_years ?? report.final_inventory_coverage_years),
    final_total_inventory_tU: safeNumber(summary.final_total_inventory_tU ?? report.final_total_inventory_tU),
    max_unmet_demand_tU: safeNumber(summary.max_unmet_demand_tU ?? report.max_unmet_demand_tU),
    final_supply_concentration_hhi: safeNumber(summary.final_supply_concentration_hhi ?? report.final_supply_concentration_hhi),
    active_event_count: latest.active_event_count || 0,
    active_events: latest.active_events || [],
    supplier_count: safeNumber(scenarioContext.supplier_count, latest.supplier_count ?? null),
    manufacturer_count: safeNumber(scenarioContext.manufacturer_count, latest.manufacturer_count ?? null),
    selected_profile_labels: uniqueStrings((experiment?.plan?.policy_profiles || []).map((item) => item?.label || item?.manufacturer_id)),
    iteration_count: getIterationCount(experiment),
    iteration_rows: buildIterationRows(experiment)
  }
}

export function buildExperimentDetailPanels(experiment) {
  const report = getDisplayReport(experiment)
  const latestTimeline = buildUraniumTimelineRows(experiment).slice(-1)[0] || {}

  return {
    alerts: Array.isArray(report?.alerts) ? report.alerts : [],
    recommendations: Array.isArray(report?.recommendations) ? report.recommendations : [],
    supplierShares: Array.isArray(report?.final_supplier_shares) ? report.final_supplier_shares : (latestTimeline.top_supplier_shares || []),
    contractMix: Array.isArray(report?.final_contract_mix) ? report.final_contract_mix : (latestTimeline.contract_mix || []),
    allocations: Array.isArray(report?.top_final_allocations) ? report.top_final_allocations : (latestTimeline.allocations || []),
    profiles: Array.isArray(report?.selected_profiles) ? report.selected_profiles : [],
    convergence: report?.convergence || {},
    deltaSummary: report?.delta_summary || {}
  }
}
