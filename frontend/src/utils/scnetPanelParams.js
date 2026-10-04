/**
 * 反事实实验「参数面板」的共享口径。
 *
 * 背景：平台（CounterfactualExperiment）与对话侧实验方案设计页（ExperimentPlanDesign）
 * 必须对「本场景的面板到底有哪些输入框」给出同一个答案。
 * 此前这套判定只写在平台里，方案设计页只能拿 PLATFORM_LEVER_TARGETS 白名单做静态映射，
 * 于是铀场景会勾到「工厂协作范围 → collaboration_radius」——而铀场景的面板由
 * buildCounterfactualParameterControls 的铀分支决定，根本没有这一项，
 * 用户一路确认到平台才被红字拦住。
 *
 * 现在判定逻辑只有这一份：平台的面板构造与方案设计页的落地对账都调用
 * buildCounterfactualParameterControls / resolvePanelControls，
 * 面板键不可能再和设计页认的不一致。
 *
 * 取值一律可溯源：目录里没有的值不编造，需要取值的地方由调用方传入真实报告。
 */

import { SCENARIO_VALUES } from '@/constants/scnetScenario'

export const toFiniteNumber = (value, fallback = 0) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

export const normalizeRate = (value, fallback = 0) => {
  const numberValue = toFiniteNumber(value, fallback)
  return numberValue > 1.5 ? numberValue / 100 : numberValue
}

export const roundNumber = (value, digits = 2) => Number(toFiniteNumber(value).toFixed(digits))

/**
 * 判断报告是否为铀供应链场景：
 * 优先使用报告自带的 scenario 字段（后端 run.py 已写入），
 * 其次按文件名/标题关键词兜底（兼容旧报告）。
 */
export const detectUraniumReport = (report = {}) => {
  const scenario = report?.scenario
  if (scenario === 'uranium') return true
  if (scenario === 'supply_chain' || scenario === 'automotive') return false
  const source = String(report?.source || '').toLowerCase()
  const title = String(report?.title || '').toLowerCase()
  return source.includes('uranium') || title.includes('uranium')
}

// 把参数目录（多来源：实体参数 / Planner 参数 / 系统参数 / 实验参数）合并成 key → 规格 的索引
export const parseCatalogRange = (range) => {
  if (Array.isArray(range) && range.length >= 2) {
    const lo = toFiniteNumber(range[0], null)
    const hi = toFiniteNumber(range[1], null)
    return lo !== null && hi !== null ? [lo, hi] : null
  }
  const match = String(range || '').match(/^\[?\s*(-?\d+(?:\.\d+)?)\s*[,\-~]\s*(-?\d+(?:\.\d+)?)\s*\]?$/)
  return match ? [toFiniteNumber(match[1]), toFiniteNumber(match[2])] : null
}

export const buildCatalogIndex = (catalog) => {
  const index = new Map()
  const put = (entry) => {
    if (!entry || !entry.key) return
    const prev = index.get(entry.key) || {}
    const bounds = parseCatalogRange(entry.range)
      || (Number.isFinite(entry.min) && Number.isFinite(entry.max) ? [entry.min, entry.max] : null)
    index.set(entry.key, {
      key: entry.key,
      label: entry.displayName || entry.label || entry.name || prev.label || entry.key,
      description: entry.description || prev.description || '',
      unit: entry.unit || prev.unit || '',
      min: Number.isFinite(entry.min) ? entry.min : (bounds ? bounds[0] : (prev.min ?? null)),
      max: Number.isFinite(entry.max) ? entry.max : (bounds ? bounds[1] : (prev.max ?? null)),
      step: Number.isFinite(entry.step) ? entry.step : (prev.step ?? null),
      source: entry.source || prev.source || '',
      default: entry.defaultValue !== undefined ? entry.defaultValue : (entry.default !== undefined ? entry.default : prev.default)
    })
  }
  if (!catalog) return index
  const agents = catalog?.agent_graph?.agents || catalog?.entities?.agents || []
  agents.forEach((agent) => (agent.configurableParams || agent.configurable_params || []).forEach(put))
  ;(catalog.system_parameters || []).forEach(put)
  ;(catalog.exp_params?.params || []).forEach(put)
  ;(catalog.planner_parameters || []).forEach(put)
  Object.values(catalog.fishbone_templates || {}).forEach((group) => {
    (Array.isArray(group) ? group : []).forEach(put)
  })
  return index
}

/**
 * 汽车供应链反事实参数控件：取值来自参数目录（源头 configs/agent_config.yaml），
 * 基线值优先用报告实际值，缺失时用目录默认值，保证每个数字都能溯源。
 */
// 展示名（口径固定，取值/区间/描述仍全部来自参数目录）
export const AUTO_CONTROL_LABELS = {
  order_multiplier: '市场需求强度',
  factory_capacity_min: '工厂产能下限',
  factory_capacity_max: '工厂产能上限',
  reproduction_threshold: '企业扩张触发阈值',
  collaboration_radius: '工厂协作半径'
}

export const AUTO_FACTOR_NAMES = {
  order_multiplier: '市场需求强度',
  factory_capacity_range: '工厂产能范围',
  reproduction_threshold: '企业扩张触发阈值',
  collaboration_radius: '工厂协作半径'
}

export const buildAutoParameterControls = (report, catalog) => {
  const index = buildCatalogIndex(catalog)
  const params = report?.parameters || {}
  const capacityRange = Array.isArray(params.factoryCapacityRange) ? params.factoryCapacityRange : []
  const controls = []

  const orderSpec = index.get('order_multiplier')
  const capSpec = index.get('factory_capacity_range')
  const thresholdSpec = index.get('reproduction_threshold')
  const collabSpec = index.get('collaboration_radius')

  if (orderSpec) {
    controls.push({
      key: 'order_multiplier',
      label: AUTO_CONTROL_LABELS.order_multiplier,
      value: roundNumber(toFiniteNumber(params.orderMultiplier, toFiniteNumber(orderSpec.default, 1)), 2),
      current: roundNumber(toFiniteNumber(params.orderMultiplier, toFiniteNumber(orderSpec.default, 1)), 2),
      unit: orderSpec.unit || '倍',
      min: orderSpec.min,
      max: orderSpec.max,
      step: orderSpec.step ?? 0.01,
      description: orderSpec.description || '订单生成率倍数，控制市场需求强度'
    })
  }

  if (capSpec) {
    const capDefault = Array.isArray(capSpec.default) ? capSpec.default : []
    const capMin = capacityRange.length >= 1 ? toFiniteNumber(capacityRange[0], capDefault[0]) : toFiniteNumber(capDefault[0], null)
    const capMax = capacityRange.length >= 2 ? toFiniteNumber(capacityRange[1], capDefault[1]) : toFiniteNumber(capDefault[1], null)
    controls.push({
      key: 'factory_capacity_min',
      label: AUTO_CONTROL_LABELS.factory_capacity_min,
      value: roundNumber(capMin, 2),
      current: roundNumber(capMin, 2),
      unit: '件/月',
      min: capSpec.min,
      max: capSpec.max,
      step: capSpec.step ?? 1,
      description: capSpec.description || '总厂下属工厂月产能范围下限'
    })
    controls.push({
      key: 'factory_capacity_max',
      label: AUTO_CONTROL_LABELS.factory_capacity_max,
      value: roundNumber(capMax, 2),
      current: roundNumber(capMax, 2),
      unit: '件/月',
      min: capSpec.min,
      max: capSpec.max,
      step: capSpec.step ?? 1,
      description: capSpec.description || '总厂下属工厂月产能范围上限'
    })
  }

  if (thresholdSpec) {
    controls.push({
      key: 'reproduction_threshold',
      label: AUTO_CONTROL_LABELS.reproduction_threshold,
      value: roundNumber(toFiniteNumber(params.reproductionThreshold, toFiniteNumber(thresholdSpec.default, 0)), 0),
      current: roundNumber(toFiniteNumber(params.reproductionThreshold, toFiniteNumber(thresholdSpec.default, 0)), 0),
      unit: thresholdSpec.unit || '',
      min: thresholdSpec.min,
      max: thresholdSpec.max,
      step: thresholdSpec.step ?? 1,
      description: thresholdSpec.description || '控制企业扩张触发门槛'
    })
  }

  if (collabSpec) {
    controls.push({
      key: 'collaboration_radius',
      label: AUTO_CONTROL_LABELS.collaboration_radius,
      value: roundNumber(toFiniteNumber(params.collaborationRadius, toFiniteNumber(collabSpec.default, 0)), 0),
      current: roundNumber(toFiniteNumber(params.collaborationRadius, toFiniteNumber(collabSpec.default, 0)), 0),
      unit: collabSpec.unit || '',
      min: collabSpec.min,
      max: collabSpec.max,
      step: collabSpec.step ?? 10,
      description: collabSpec.description || '总厂调度可联动工厂的空间范围'
    })
  }

  return controls
}

export const buildCounterfactualParameterControls = (report, catalog) => {
  const capacityRange = Array.isArray(report.parameters.factoryCapacityRange)
    ? report.parameters.factoryCapacityRange
    : [0, 0]
  // 检测场景 → 使用专用单位与描述
  const isUranium = detectUraniumReport(report)

  // 汽车供应链：全部取值来自参数目录（真实 config 口径）
  if (!isUranium && catalog) {
    const controls = buildAutoParameterControls(report, catalog)
    if (controls.length) return controls
  }

  return [
    {
      key: 'order_multiplier',
      label: isUranium ? '需求强度' : '市场需求强度',
      value: roundNumber(report.parameters.orderMultiplier, 2),
      unit: '倍',
      min: 0.5,
      max: 2.5,
      step: 0.05,
      description: isUranium ? '全球核电反应堆需求倍数，基准为当前~123,860 tU/年' : '需求上升压力输入'
    },
    {
      key: 'factory_capacity_min',
      label: isUranium ? '矿山产能下限' : '工厂产能下限',
      value: roundNumber(capacityRange[0], 2),
      unit: isUranium ? 'tU/年' : '件/月',
      min: 0,
      step: isUranium ? 100 : 0.01,
      description: isUranium ? '全球矿山年产能下限(吨/年)，对应已承诺矿山最低产出' : '制造能力区间的保底值'
    },
    {
      key: 'factory_capacity_max',
      label: isUranium ? '矿山产能上限' : '工厂产能上限',
      value: roundNumber(capacityRange[1], 2),
      unit: isUranium ? 'tU/年' : '件/月',
      min: 0,
      step: isUranium ? 100 : 0.01,
      description: isUranium ? '全球矿山年产能峰值上限(吨/年)，含计划与潜在矿山满产产能' : '制造能力区间的峰值上限'
    },
    {
      key: 'reproduction_threshold',
      label: isUranium ? '新矿投产阈值' : '企业扩张触发阈值',
      value: roundNumber(report.parameters.reproductionThreshold, 0),
      unit: isUranium ? 'tU/年' : '',
      min: 0,
      step: isUranium ? 50 : 10,
      description: isUranium ? '触发新矿山开发的最低供需缺口(吨/年)，影响Dasa/Wheeler River等新矿投产时机' : '影响产能扩张触发时点'
    },
    {
      key: 'adjustment_ratio',
      label: isUranium ? '产能爬坡速率' : '产能调整比例',
      value: roundNumber(normalizeRate(report.parameters.adjustmentRatio), 4),
      unit: '比例',
      min: 0,
      max: 1,
      step: 0.0001,
      description: isUranium ? '矿山扩产/减产的年度调整速率，反映矿山重启(Langer Heinrich)或关停的响应速度' : '事中报告中识别到的产能调整幅度'
    }
  ]
}

/**
 * 「本场景的反事实参数面板会渲染哪些输入框」。
 *
 * 用一份不含取值的报告存根走 buildCounterfactualParameterControls 的同一套判定
 * （铀 → 固定五项；汽车 → 由目录里实际有哪些参数规格决定），因此面板键永远与平台一致。
 * 取值不编造：value / current 一律置为 null，调用方只看 key / label / unit / min / max / step；
 * 需要真实基线值时必须先载入该场景的实验报告。
 */
export function resolvePanelControls(scenario, catalog) {
  // 场景只认这两个取值：对不上时按汽车处理（与 detectUraniumReport 的兜底一致），
  // 免得调用方传中文标签之类的值时，判定悄悄漂到另一侧。
  const scenarioValue = scenario === SCENARIO_VALUES.URANIUM
    ? SCENARIO_VALUES.URANIUM
    : SCENARIO_VALUES.SUPPLY_CHAIN
  const stub = {
    scenario: scenarioValue,
    parameters: { factoryCapacityRange: [0, 0] }
  }
  return buildCounterfactualParameterControls(stub, catalog || null).map((control) => ({
    ...control,
    value: null,
    current: null
  }))
}

/** 只要面板键（方案落地对账用） */
export function resolvePanelParamKeys(scenario, catalog) {
  return resolvePanelControls(scenario, catalog).map((control) => control.key)
}
