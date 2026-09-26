import { uraniumAnnualState } from '@/utils/uraniumScene'
import { applyUraniumDecisionCopy, uraniumDecisionReasoning } from './uraniumDecisionCopy'
import {
  buildExperimentDetailPanels,
  buildUraniumTimelineRows,
  formatExecutionModeLabel,
  formatUraniumMetricValue,
  formatUraniumPercent,
  getDisplayReport
} from '@/utils/uraniumDuringAdapter'
import {
  BASELINE_BRANCH_DATA,
  BASELINE_EVENT_METRICS,
  SCENARIO_OPTIONS,
  TIME_NODE_OPTIONS,
  TREE_DATA,
  cloneNode,
  markTrack,
  shortLabel
} from '@/views/SCnet/mock/decisionTreeMock.js'
import {
  GAME_SCENARIOS,
  findNashEquilibria
} from '@/views/SCnet/mock/gameTheoryMock.js'
import { buildUraniumPaperResultsModel } from '@/views/SCnet/mock/uraniumPaperResults.js'

const DEFAULT_SCENARIO = 'rawShortage'
const DEFAULT_TIME_INDEX = 1
export const URANIUM_SCENARIO_OPTIONS = Object.freeze({
  rawShortage: '铀资源供应中断',
  regionalDemandSurge: '核燃料需求增长',
  logisticsCongestion: '运输通道受阻'
})
const DEFAULT_GAME_SCENARIO = 'supplierVsRetailer'
const DECISION_TO_GAME_SCENARIO_MAP = Object.freeze({
  rawShortage: 'domesticVsImportSourcing',
  regionalDemandSurge: 'supplierVsRetailer',
  logisticsCongestion: 'corePlatformVs3PL'
})

const PRESET_LABEL_MAP = Object.freeze({
  baseline: '基准实验',
  balanced: '平衡方案',
  feedback_optimization: '反馈优化',
  security_first: '保供优先',
  cost_first: '成本优先',
  shock_response: '冲击响应',
  historical_replay: '历史复现',
  extreme_shock: '极端冲击'
})

const GAME_MODEL_LIBRARY = Object.freeze({
  prisoner_dilemma: {
    key: 'prisoner_dilemma',
    shortLabel: 'PD',
    label: '囚徒困境',
    oneLiner: '合作为何崩溃',
    definition: '两个理性行动者分别在合作与背离之间做选择，背离往往在单次互动中更安全，结果把双方都推向次优均衡。',
    payoff: '满足 T > R > P > S。单方背离可拿到最高短期收益，但如果双方都防守性背离，整体结果会差于合作。',
    insight: '问题核心不是“对方想不想合作”，而是“有没有可信承诺和外部约束”。',
    strategy: '优先引入双源、长协、库存承诺等装置，把一次性抢占改造成更可验证的合作结构。',
    agentName: '囚徒困境仿真 Agent',
    modelBinding: '把短期保供窗口映射为承诺可信度问题。',
    thinkingStyle: '先判断哪一方更担心先合作后吃亏，再判断是否要通过承诺装置重写收益结构。'
  },
  hawk_dove: {
    key: 'hawk_dove',
    shortLabel: 'HD',
    label: '鹰鸽博弈',
    oneLiner: '抢位还是让步',
    definition: '双方都想争夺有限资源时，双强硬会带来高碰撞成本，单方让步或错峰反而可能保住系统收益。',
    payoff: '强硬对软化时，强硬方收益更高；若双方都强硬，冲突成本上升，整体收益反而跌到低位。',
    insight: '关键不在“谁一定赢”，而在“谁先让步、怎么让步、让步是否能换回稳定供给”。',
    strategy: '优先设计分流、错峰、限量保价和通道切换，让冲突从正面对撞转为有序博弈。',
    agentName: '鹰鸽博弈仿真 Agent',
    modelBinding: '把容量受限窗口映射为资源争抢与让步设计问题。',
    thinkingStyle: '先估计双强硬的损失，再寻找最小让步成本和最稳的资源分配方式。'
  },
  repeated_game: {
    key: 'repeated_game',
    shortLabel: 'RG',
    label: '重复博弈',
    oneLiner: '长期关系如何稳定合作',
    definition: '同一对手在多期互动中不断观察彼此策略，信誉、惩罚和未来收益会改变当期选择。',
    payoff: '当前回合的收益不再孤立判断，未来回合的奖励和惩罚会进入当期决策，合作因此更可能持续。',
    insight: '只要关系不是一次性结束，履约记录、信誉与惩罚机制就会成为真实的约束。',
    strategy: '把扩产、价格、配额和履约惩罚拆成多期动作，观察对方是否持续兑现承诺。',
    agentName: '重复博弈仿真 Agent',
    modelBinding: '把跨年度协调窗口映射为信誉与惩罚机制问题。',
    thinkingStyle: '先看上一轮兑现情况，再判断本轮是否延续合作、触发惩罚，还是重新谈判。'
  }
})

const GAME_SCENARIO_METHOD_MAP = Object.freeze({
  domesticVsImportSourcing: {
    recommendedModelKey: 'prisoner_dilemma',
    conflict: '采购方希望压价锁量，供应商在紧俏窗口下更有动力限量提价，双方都担心先让步后吃亏。',
    timePressure: '短周期保供决策',
    constraint: '承诺不可完全验证，且当前补料窗口偏短。',
    worldState: '供给偏紧、库存偏低、单源依赖风险抬升。',
    fitReason: '当前最突出的不是长期协作，而是单次保供窗口里的背离激励。采购方若继续单源压价，供应商更可能转向限量；供应商若先稳定供货，又担心价格让步被锁死，因此囚徒困境最能解释当下关系。',
    treeBridge: '进入对策分析后，先展开双源并行、长协锁量、应急寻源三类动作，判断能否通过承诺装置把背离激励压下去。',
    alternativeNotes: {
      hawk_dove: '当前不是单纯争抢一条通道，而是围绕价格、供货稳定性和承诺可信度博弈。',
      repeated_game: '长期关系仍然重要，但当前窗口更像一次性高压补料，短期背离问题更优先。'
    }
  },
  corePlatformVs3PL: {
    recommendedModelKey: 'hawk_dove',
    conflict: '采购主体希望保障年度需求，供给方需要协调报价和可用量，资源竞争可能推高成本和交付压力。',
    timePressure: '峰值窗口的强制协调',
    constraint: '供货能力和物流通道有限，双方都不愿先让步。',
    worldState: '上游供给与通道容量受限，交付优先权需要重新分配。',
    fitReason: '当前最关键的是有限容量下的抢位与让步设计。若双方都采取强攻动作，交付拥堵和成本外溢会一起上升；一方错峰、一方保供或限量，反而能保住总收益，因此更适合用鹰鸽博弈解释。',
    treeBridge: '进入对策分析后，优先展开错峰排产、主通道切换、限量保价和让步换稳定交付等路径。',
    alternativeNotes: {
      prisoner_dilemma: '当前不是典型的“合作承诺崩溃”，而是“谁先硬碰、谁先让步”的资源争抢问题。',
      repeated_game: '重复协作会影响后续关系，但当前高峰窗口首先要解决的是容量冲突。'
    }
  },
  supplierVsRetailer: {
    recommendedModelKey: 'repeated_game',
    conflict: '需求方需要判断是否提前锁量，采购主体需要判断是否补充库存；采购节奏与库存配置不会在单一回合结束，而会跨多个年度窗口持续反馈。',
    timePressure: '跨年度协调决策',
    constraint: '扩产存在滞后，且各方会根据历史履约记录调整后续动作。',
    worldState: '需求持续上行，价格、库存和产能都要在多期内滚动校准。',
    fitReason: '当前不是一次性对撞，而是多期价格与产能联动。只看单轮收益会低估信誉、惩罚和滚动协商的作用；重复博弈更适合解释为何双方要在多个窗口里维持合作、何时会触发惩罚或改约。',
    treeBridge: '进入对策分析后，先展开分阶段锁量、扩产校准、配额管理和履约惩罚等多期动作链。',
    alternativeNotes: {
      prisoner_dilemma: '单轮背离依然存在，但当前关系的核心是多期协调，不是一次性背离。',
      hawk_dove: '这里不只是抢占有限容量，更重要的是通过长期协作把价格和扩产节奏稳住。'
    }
  }
})

function toFiniteNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function normalizeShareValue(value, quantity = null, total = null) {
  const num = toFiniteNumber(value)
  if (num != null) return Math.abs(num) > 1 ? num / 100 : num
  if (quantity != null && total && total > 0) return quantity / total
  return null
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { hour12: false })
}

function formatSignedDelta(value, digits = 0) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  const fixed = num.toFixed(digits)
  return num > 0 ? `+${fixed}` : fixed
}

const resolveScenarioStage = uraniumAnnualState

function rankStress(row = {}) {
  return Number(row.average_risk_exposure || 0) * 100 + Number(row.unmet_demand_tU || 0)
}

function pickMostStressedYear(timelineRows = []) {
  const rows = Array.isArray(timelineRows) ? timelineRows : []
  if (!rows.length) return null
  return [...rows].sort((left, right) => rankStress(right) - rankStress(left))[0]
}

function latestTimelineEventLabel(timelineRows = []) {
  const rows = Array.isArray(timelineRows) ? timelineRows : []
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const label = rows[index]?.active_events?.[0]
    if (label) return label
  }
  return ''
}

function inferScenarioKey(experiment, timelineRows = []) {
  const text = [
    experiment?.name,
    experiment?.description,
    experiment?.plan?.name,
    experiment?.plan?.description,
    experiment?.preset_name,
    experiment?.template_name,
    ...timelineRows.flatMap((row) => row.active_events || [])
  ].join(' ')

  if (/(物流|航线|运输|港口|海运|拥堵|运力|通道)/.test(text)) return 'logisticsCongestion'
  if (/(需求|订单|销量|激增|热销|履约高峰)/.test(text)) return 'regionalDemandSurge'
  return 'rawShortage'
}

function inferTimeIndex(timelineRows = [], stressedYear = null) {
  if (!timelineRows.length || !stressedYear) return DEFAULT_TIME_INDEX
  const stage = resolveScenarioStage({
    risk: stressedYear.average_risk_exposure,
    unmet: stressedYear.unmet_demand_tU,
      demand: stressedYear.total_demand_tU,
    inventory: stressedYear.inventory_coverage_years
  })
  const stressedIndex = timelineRows.findIndex((row) => row.id === stressedYear.id)
  if (stage.tone === 'danger') return 1
  if (stressedIndex <= 0) return 0
  if (stressedIndex >= timelineRows.length - 1) return 2
  return 1
}

function buildBaselineBranch(scenarioKey, timeIndex) {
  const baseline = BASELINE_BRANCH_DATA[scenarioKey]?.[timeIndex]
  if (!baseline) return null
  return markTrack({
    id: `${scenarioKey}-${timeIndex}-baseline`,
    name: shortLabel('未干预基线', 10),
    actor: '系统',
    action: baseline.action,
    desc: baseline.desc,
    depth: 1,
    prob: 1,
    reasoning: uraniumDecisionReasoning(baseline.action, baseline.desc),
    children: baseline.children.map((child) => cloneNode(child))
  }, 'baseline')
}

function buildControlledBranch(sourceTree) {
  if (!sourceTree) return null
  return markTrack({
    id: `${sourceTree.id}-controlled`,
    name: shortLabel('调控策略推演', 10),
    actor: '系统',
    action: '经过调控：执行策略联动',
    desc: '依据应急预案与联动手册触发响应，对比库存、履约完成率与综合评分的变化。',
    depth: 1,
    prob: 1,
    reasoning: uraniumDecisionReasoning('执行供应链协同调控', '比较采购、库存与运输等候选动作。'),
    children: (sourceTree.children || []).map((child) => cloneNode(child))
  }, 'controlled')
}

function calcExpectedScore(node, pathProb = 1) {
  if (!node) return 0
  if (node.isLeaf || !node.children?.length) return pathProb * Number(node.outcome?.score || 0)
  return node.children.reduce(
    (sum, child) => sum + calcExpectedScore(child, pathProb * Number(child.prob || 0)),
    0
  )
}

function findBestLeaf(node, pathProb = 1) {
  if (!node) return null
  if (node.isLeaf || !node.children?.length) {
    return {
      node,
      probability: pathProb,
      weightedScore: pathProb * Number(node.outcome?.score || 0)
    }
  }
  return node.children.reduce((best, child) => {
    const next = findBestLeaf(child, pathProb * Number(child.prob || 0))
    if (!next) return best
    if (!best) return next
    if (next.weightedScore > best.weightedScore) return next
    return best
  }, null)
}

function buildStrategyRows(controlledBranchTree, baselineMetrics) {
  if (!controlledBranchTree?.children?.length) return []
  const rawRows = controlledBranchTree.children.map((child) => {
    const bestLeaf = findBestLeaf(child)
    const score = Math.round(calcExpectedScore(child))
    const improvement = baselineMetrics?.score != null ? score - baselineMetrics.score : null
    return {
      id: child.id,
      name: child.action,
      score,
      note: child.desc,
      improvement,
      bestLeafAction: bestLeaf?.node?.action || '',
      bestLeafSituation: bestLeaf?.node?.outcome?.situation || '',
      successProbability: Math.round(Number(bestLeaf?.probability || 0) * 100)
    }
  })

  if (!rawRows.length) return rawRows
  const max = Math.max(...rawRows.map((item) => item.score))
  const min = Math.min(...rawRows.map((item) => item.score))

  return rawRows.sort((a, b) => b.score - a.score).map((item) => ({
    ...item,
    percent: max === min ? 50 : Math.round(10 + ((item.score - min) / (max - min)) * 90),
    isBest: item.score === max
  }))
}

function normalizeSupplierRows(rows = []) {
  const list = Array.isArray(rows) ? rows : []
  const total = list.reduce((sum, item) => sum + Number(item?.quantity_tU ?? item?.procured_tU ?? item?.quantity ?? 0), 0)

  return list
    .map((item, index) => {
      const supplierName = String(
        item?.supplier_name
        || item?.name
        || item?.supplier
        || item?.supplier_id
        || ''
      ).trim()
      const quantity = toFiniteNumber(item?.quantity_tU ?? item?.procured_tU ?? item?.quantity)
      const share = normalizeShareValue(item?.share ?? item?.supplier_share, quantity, total)
      if (!supplierName && quantity == null && share == null) return null
      return {
        id: `${supplierName || 'supplier'}-${index}`,
        supplier_name: supplierName || `供应商 ${index + 1}`,
        quantity_tU: quantity,
        share
      }
    })
    .filter(Boolean)
    .sort((left, right) => Number(right.quantity_tU || 0) - Number(left.quantity_tU || 0))
}

function normalizeContractRows(rows = []) {
  const list = Array.isArray(rows) ? rows : []
  const total = list.reduce((sum, item) => sum + Number(item?.quantity_tU ?? item?.procured_tU ?? item?.quantity ?? 0), 0)

  return list
    .map((item, index) => {
      const contractType = String(item?.contract_type || item?.type || item?.name || '').trim()
      const quantity = toFiniteNumber(item?.quantity_tU ?? item?.procured_tU ?? item?.quantity)
      const share = normalizeShareValue(item?.share, quantity, total)
      if (!contractType && quantity == null && share == null) return null
      return {
        id: `${contractType || 'contract'}-${index}`,
        contract_type: contractType || `合同 ${index + 1}`,
        quantity_tU: quantity,
        share
      }
    })
    .filter(Boolean)
    .sort((left, right) => Number(right.quantity_tU || 0) - Number(left.quantity_tU || 0))
}

function normalizeProcurementRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((item, index) => {
      const manufacturerName = String(
        item?.name
        || item?.manufacturer_name
        || item?.manufacturer
        || item?.manufacturer_id
        || ''
      ).trim()
      if (!manufacturerName) return null
      return {
        id: String(item?.id || item?.manufacturer_id || `manufacturer-${index}`),
        name: manufacturerName,
        location: String(item?.location || item?.region || '-').trim() || '-',
        procured_tU: toFiniteNumber(item?.procured_tU ?? item?.quantity_tU ?? item?.total_procured_tU),
        inventory_years: toFiniteNumber(item?.inventory_years ?? item?.inventory_coverage_years),
        risk_exposure: normalizeShareValue(item?.risk_exposure ?? item?.average_risk_exposure),
        dominant_supplier_share: normalizeShareValue(item?.dominant_supplier_share),
        unmet_demand_tU: toFiniteNumber(item?.unmet_demand_tU)
      }
    })
    .filter(Boolean)
    .sort((left, right) => Number(right.procured_tU || 0) - Number(left.procured_tU || 0))
}

function normalizeAllocationRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((item, index) => {
      const supplierName = String(item?.supplier_name || item?.supplier || item?.supplier_id || '').trim()
      const manufacturerName = String(item?.manufacturer_name || item?.manufacturer || item?.manufacturer_id || '').trim()
      const quantity = toFiniteNumber(item?.quantity_tU ?? item?.procured_tU ?? item?.quantity)
      if (!supplierName && !manufacturerName && quantity == null) return null
      return {
        id: `${supplierName || 'supplier'}-${manufacturerName || 'manufacturer'}-${index}`,
        supplier_name: supplierName || '-',
        manufacturer_name: manufacturerName || '-',
        quantity_tU: quantity
      }
    })
    .filter(Boolean)
    .sort((left, right) => Number(right.quantity_tU || 0) - Number(left.quantity_tU || 0))
}

function normalizeHistoryComparisonRows(history = []) {
  return (Array.isArray(history) ? history : []).slice(0, 5).map((item, index) => {
    const summary = item?.summary || item
    return {
      id: `${item?.experiment_id || index}`,
      label: item?.experiment_id || `Exp-${index + 1}`,
      template: item?.preset_name || item?.template_name || '-',
      cost: formatUraniumMetricValue('avg_cost_usd_kgU', summary?.avg_cost_usd_kgU),
      risk: formatUraniumMetricValue('avg_risk_exposure', summary?.avg_risk_exposure),
      unmet: formatUraniumMetricValue('max_unmet_demand_tU', summary?.max_unmet_demand_tU),
      coverage: formatUraniumMetricValue('final_inventory_coverage_years', summary?.final_inventory_coverage_years),
      rawCost: Number(summary?.avg_cost_usd_kgU || Infinity),
      rawRisk: Number(summary?.avg_risk_exposure || 0),
      rawUnmet: Number(summary?.max_unmet_demand_tU || 0),
      rawCoverage: Number(summary?.final_inventory_coverage_years || 0)
    }
  })
}

function resolvePresetLabel(experiment) {
  const presetName = String(
    experiment?.preset_name
    || experiment?.plan?.preset_name
    || experiment?.plan?.template_used
    || experiment?.template_name
    || ''
  ).trim()
  return PRESET_LABEL_MAP[presetName] || presetName || '-'
}

function resolveExperimentName(experiment, presetLabel) {
  return experiment?.name || experiment?.plan?.name || presetLabel
}

function resolveExecutionMode(experiment) {
  if (experiment?.execution_type) return formatExecutionModeLabel(experiment.execution_type)
  const iterations = Number(
    experiment?.optimization_iterations
    ?? experiment?.plan?.optimization_iterations
    ?? 0
  )
  return iterations > 1 ? '多轮迭代' : '单轮仿真'
}

function formatExperimentRunLabel(value = '') {
  const match = String(value || '').match(/(20\d{2})(\d{2})(\d{2})[-_]?(\d{2})(\d{2})/)
  if (!match) return ''
  return `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}`
}

function buildHistoryComparisonActions(templateKey = '') {
  switch (templateKey) {
    case 'cost_first':
      return ['优先压低采购成本', '接受更薄库存缓冲', '把波动留给后续调度']
    case 'balanced':
      return ['控制成本与库存折中', '维持中等安全缓冲', '保留后续调度弹性']
    case 'security_first':
      return ['优先锁定主供资源', '抬高安全库存底线', '把缺口压力前置化解']
    default:
      return ['对照成本表现', '对照风险表现', '对照库存表现']
  }
}

function buildExperimentComparisonNarrative(item = {}) {
  if (item.rawCoverage >= 2.8 && item.rawRisk <= 0.22) {
    return {
      preview: '库存更厚，优先保供。',
      verdict: '这套库存缓冲最厚，适合高压窗口先保供再谈成本。'
    }
  }
  if (item.rawCost > 0 && item.rawCost <= 480 && item.rawCoverage < 1) {
    return {
      preview: '成本最低，但库存偏薄。',
      verdict: '这套成本最低，但库存缓冲偏薄，不适合极端保供窗口。'
    }
  }
  if (item.rawRisk <= 0.16 && item.rawUnmet <= 60) {
    return {
      preview: '风险更低，适合常态运行。',
      verdict: '这套把风险和缺口都压得更低，适合做日常运行基线。'
    }
  }
  return {
    preview: '成本、风险、库存更均衡。',
    verdict: '这套在成本、风险和库存之间更均衡，适合做常规主方案。'
  }
}

function resolveWindowStage(row = {}) {
  return uraniumAnnualState({ risk: row.average_risk_exposure, unmet: row.unmet_demand_tU,
      demand: row.total_demand_tU, inventory: row.inventory_coverage_years })
}

function inferRouteChannelLabel(supplierName = '') {
  const name = String(supplierName || '')
  if (/Kaz|哈萨克/.test(name)) return '陆路补给'
  if (/Canada|Australia|澳大利亚|Namibia|纳米比亚/.test(name)) return '海运接卸'
  return '复合通道'
}

function buildScenarioYearWindow(row, index, panels, fallbackAction, totalRows = 0) {
  const stage = resolveWindowStage(row)
  const totalProcured = Number(row.total_procured_tU || 0)
  const recommendations = Array.isArray(panels.recommendations) ? panels.recommendations : []
  const alerts = Array.isArray(panels.alerts) ? panels.alerts : []
  const routeRows = [...(row.allocations || [])]
    .sort((left, right) => Number(right.quantity_tU || 0) - Number(left.quantity_tU || 0))
    .slice(0, 4)
    .map((item) => ({
      ...item,
      sharePct: totalProcured > 0 ? Math.max(10, Math.min(100, Number(item.quantity_tU || 0) / totalProcured * 100)) : 0,
      shareText: totalProcured > 0 ? `${((Number(item.quantity_tU || 0) / totalProcured) * 100).toFixed(1)}%` : '-',
      channelLabel: inferRouteChannelLabel(item.supplier_name)
    }))
  const primaryRoute = routeRows[0] || null
  const mainRecommendation = recommendations[index % Math.max(recommendations.length, 1)] || fallbackAction
  const summary = row.active_events?.length
    ? `${row.active_events[0]}对应年度状态为${stage.label}，重点关注主通道交付和采购主体的库存缓冲。`
    : `该年度以稳态采购和港口分流为主，继续围绕成本、风险和库存覆盖做收敛优化。`

  return {
    id: row.id || `${row.year || index}`,
    year: row.year,
    tone: stage.tone,
    stageLabel: stage.label,
    stageDetail: stage.detail,
    title: `${row.year} 年推演窗口`,
    headline: row.active_events?.[0] || '常态运行',
    summary,
    nextStep: mainRecommendation || '围绕库存、长协和港口分流做结构校准。',
    riskText: formatUraniumMetricValue('average_risk_exposure', row.average_risk_exposure),
    inventoryText: formatUraniumMetricValue('inventory_coverage_years', row.inventory_coverage_years),
    unmetText: formatUraniumMetricValue('unmet_demand_tU', row.unmet_demand_tU),
    events: row.active_events || [],
    metricCards: [
      {
        label: '现货价格',
        value: formatUraniumMetricValue('market_price_usd_lb', row.market_price_usd_lb),
        hint: '年度市场价格'
      },
      {
        label: '平均风险暴露',
        value: formatUraniumMetricValue('average_risk_exposure', row.average_risk_exposure),
        hint: '年度风险暴露'
      },
      {
        label: '库存覆盖',
        value: formatUraniumMetricValue('inventory_coverage_years', row.inventory_coverage_years),
        hint: '关键节点安全缓冲'
      },
      {
        label: '需求缺口',
        value: formatUraniumMetricValue('unmet_demand_tU', row.unmet_demand_tU),
        hint: '未满足需求规模'
      }
    ],
    steps: [
      {
        label: '01',
        title: row.active_events?.[0] || '年度态势识别',
        text: `当年平均风险暴露为 ${formatUraniumMetricValue('average_risk_exposure', row.average_risk_exposure)}，需求缺口 ${formatUraniumMetricValue('unmet_demand_tU', row.unmet_demand_tU)}。`
      },
      {
        label: '02',
        title: primaryRoute ? `${primaryRoute.supplier_name} → ${primaryRoute.manufacturer_name}` : '主通道分配',
        text: primaryRoute
          ? `该航线承担 ${formatUraniumMetricValue('total_procured_tU', primaryRoute.quantity_tU)}，约占年度采购 ${primaryRoute.shareText}，是本年最需要盯住的交付链路。`
          : '当前年度暂无明显主通道分配。'
      },
      {
        label: '03',
        title: stage.actionLabel,
        text: mainRecommendation || '围绕库存、长协和港口分流做结构校准，保持供给韧性与成本可控。'
      }
    ],
    routeRows,
    nodeRows: [...(row.manufacturers || [])]
      .sort((left, right) => Number(right.procured_tU || 0) - Number(left.procured_tU || 0))
      .slice(0, 3)
      .map((item) => ({
        id: item.id || item.name,
        name: item.name,
        location: item.location,
        procuredText: formatUraniumMetricValue('total_procured_tU', item.procured_tU),
        inventoryText: formatUraniumMetricValue('inventory_coverage_years', item.inventory_years),
        unmetText: formatUraniumMetricValue('unmet_demand_tU', item.unmet_demand_tU)
      })),
    actionRows: [
      mainRecommendation,
      ...recommendations.filter((item) => item !== mainRecommendation)
    ].filter(Boolean).slice(0, 3),
    alertRows: [...new Set([
      ...(row.active_events || []),
      ...alerts
    ])].slice(0, 4),
    factorRows: [
      {
        label: '主供份额',
        value: formatUraniumMetricValue('dominant_supplier_share', row.dominant_supplier_share)
      },
      {
        label: '集中度',
        value: formatUraniumMetricValue('supply_concentration_hhi', row.supply_concentration_hhi)
      },
      {
        label: '供给方',
        value: `${row.supplier_count || 0} 家`
      },
      {
        label: '制造方',
        value: `${row.manufacturer_count || 0} 家`
      }
    ],
    positionText: totalRows ? `${index + 1} / ${totalRows}` : `${index + 1}`
  }
}

function resolveGameMethodFrame(gameScenarioKey) {
  return GAME_SCENARIO_METHOD_MAP[gameScenarioKey] || GAME_SCENARIO_METHOD_MAP[DEFAULT_GAME_SCENARIO]
}

function resolveGameModelKey(gameScenarioKey) {
  return resolveGameMethodFrame(gameScenarioKey).recommendedModelKey
}

function resolveGameTheoryScenarioKey({ experiment = null, snapshot = null, manualScenarioKey = '' } = {}) {
  if (snapshot?.gameTheoryKey && GAME_SCENARIOS[snapshot.gameTheoryKey]) return snapshot.gameTheoryKey
  if (manualScenarioKey && GAME_SCENARIOS[manualScenarioKey]) return manualScenarioKey
  const decisionScenarioKey = buildUraniumDecisionTreeViewModel({ experiment, snapshot }).scenarioKey
  return DECISION_TO_GAME_SCENARIO_MAP[decisionScenarioKey] || DEFAULT_GAME_SCENARIO
}

function formatGamePairLabel(currentScenario, rowIndex, colIndex) {
  const p1Name = currentScenario?.p1Strategies?.[rowIndex]?.name || '待定策略'
  const p2Name = currentScenario?.p2Strategies?.[colIndex]?.name || '待定策略'
  return `${p1Name} × ${p2Name}`
}

function resolveGameBoardInsights(currentScenario, matrixSource = []) {
  const rowInsights = currentScenario.p1Strategies.map((strategy, rowIndex) => {
    const row = Array.isArray(matrixSource[rowIndex]) ? matrixSource[rowIndex] : []
    const total = row.reduce((sum, cell) => sum + Number(cell?.p1 || 0), 0)
    const avgPayoff = row.length ? total / row.length : null
    const strongestCell = row.reduce((best, cell, colIndex) => {
      if (!best || Number(cell?.p1 || 0) > Number(best.p1 || 0)) {
        return { ...cell, colIndex }
      }
      return best
    }, null)
    return {
      strategy,
      rowIndex,
      avgPayoff,
      strongestCell
    }
  })

  const colInsights = currentScenario.p2Strategies.map((strategy, colIndex) => {
    const cells = matrixSource
      .map((row, rowIndex) => ({ rowIndex, cell: row?.[colIndex] || null }))
      .filter((item) => item.cell)
    const total = cells.reduce((sum, item) => sum + Number(item.cell?.p2 || 0), 0)
    const avgPayoff = cells.length ? total / cells.length : null
    const strongestCell = cells.reduce((best, item) => {
      if (!best || Number(item.cell?.p2 || 0) > Number(best.cell?.p2 || 0)) return item
      return best
    }, null)
    return {
      strategy,
      colIndex,
      avgPayoff,
      strongestCell
    }
  })

  let maxTotalCell = null
  let minTotalCell = null
  for (let rowIndex = 0; rowIndex < matrixSource.length; rowIndex += 1) {
    const row = matrixSource[rowIndex] || []
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const cell = row[colIndex]
      if (!cell) continue
      const total = Number(cell.p1 || 0) + Number(cell.p2 || 0)
      const payload = { ...cell, rowIndex, colIndex, total }
      if (!maxTotalCell || total > maxTotalCell.total) maxTotalCell = payload
      if (!minTotalCell || total < minTotalCell.total) minTotalCell = payload
    }
  }

  const bestRow = rowInsights.reduce((best, item) => {
    if (item.avgPayoff == null) return best
    if (!best || Number(item.avgPayoff) > Number(best.avgPayoff)) return item
    return best
  }, null)

  const bestCol = colInsights.reduce((best, item) => {
    if (item.avgPayoff == null) return best
    if (!best || Number(item.avgPayoff) > Number(best.avgPayoff)) return item
    return best
  }, null)

  return {
    bestRow,
    bestCol,
    maxTotalCell,
    minTotalCell
  }
}

export function buildUraniumGameModelSelectionViewModel({
  experiment = null,
  snapshot = null,
  manualScenarioKey = '',
  manualModelKey = ''
} = {}) {
  const decisionVm = buildUraniumDecisionTreeViewModel({ experiment, snapshot })
  const scenarioKey = resolveGameTheoryScenarioKey({ experiment, snapshot, manualScenarioKey })
  const currentScenario = GAME_SCENARIOS[scenarioKey] || GAME_SCENARIOS[DEFAULT_GAME_SCENARIO]
  const frame = resolveGameMethodFrame(scenarioKey)
  const recommendedModelKey = resolveGameModelKey(scenarioKey)
  const selectedModelKey = GAME_MODEL_LIBRARY[manualModelKey] ? manualModelKey : recommendedModelKey
  const selectedModel = GAME_MODEL_LIBRARY[selectedModelKey] || GAME_MODEL_LIBRARY[recommendedModelKey]
  const currentEvent = decisionVm.currentEventName || currentScenario.scenarioName

  const inputSignalCards = [
    { label: '当前事件', value: currentEvent, detail: '从场景页识别出的压力窗口进入当前博弈分析。' },
    { label: '参与方', value: `${currentScenario.player1.label} / ${currentScenario.player2.label}`, detail: '围绕当前窗口最核心的双边关系组织冲突。' },
    { label: '核心冲突', value: frame.conflict, detail: '先明确双方分别想争什么、怕什么。' },
    { label: '时间压力', value: frame.timePressure, detail: frame.worldState },
    { label: '关键约束', value: frame.constraint, detail: '这决定了更适合用哪类博弈模型解释行为。' }
  ]

  const candidateCards = Object.values(GAME_MODEL_LIBRARY).map((model) => ({
    key: model.key,
    shortLabel: model.shortLabel,
    label: model.label,
    oneLiner: model.oneLiner,
    selected: model.key === selectedModelKey,
    recommended: model.key === recommendedModelKey,
    reason: model.key === recommendedModelKey
      ? frame.fitReason
      : frame.alternativeNotes?.[model.key] || '可作为备选解释框架，但不是当前窗口的优先方法。'
  }))

  const definitionCards = [
    { label: '定义', text: selectedModel.definition },
    { label: '收益结构', text: selectedModel.payoff },
    { label: '核心洞见', text: selectedModel.insight },
    { label: '博弈策略', text: selectedModel.strategy }
  ]

  const simulationAgent = {
    name: selectedModel.agentName,
    oneLiner: `${selectedModel.label} 用来解释当前铀窗口下的主导激励和偏离风险。`,
    modelBinding: selectedModel.modelBinding,
    worldState: frame.worldState,
    currentInput: frame.constraint,
    thinkingStyle: `${selectedModel.thinkingStyle} 当前重点是：${frame.treeBridge}`,
    handoff: decisionVm.bestStrategy
      ? `下游对策分析默认先展开“${decisionVm.bestStrategy.name}”，并验证该动作能否改变双方背离激励。`
      : '下游对策分析将围绕推荐模型给出的主判断展开候选动作。'
  }

  return {
    scenarioKey,
    currentScenario,
    recommendedModelKey,
    selectedModel,
    inputSignalCards,
    candidateCards,
    definitionCards,
    simulationAgent
  }
}

export function buildUraniumDecisionTreeViewModel({
  experiment = null,
  snapshot = null,
  manualScenarioKey = '',
  manualTimeIndex = null
} = {}) {
  const timelineRows = buildUraniumTimelineRows(experiment)
  const stressedYear = pickMostStressedYear(timelineRows)
  const inferredScenarioKey = inferScenarioKey(experiment, timelineRows)
  const scenarioKey = snapshot?.decisionTree?.scenarioKey
    || (manualScenarioKey && SCENARIO_OPTIONS[manualScenarioKey] ? manualScenarioKey : inferredScenarioKey)
  const timeIndex = typeof snapshot?.decisionTree?.timeIndex === 'number'
    ? snapshot.decisionTree.timeIndex
    : (typeof manualTimeIndex === 'number' && TIME_NODE_OPTIONS[manualTimeIndex]
        ? manualTimeIndex
        : inferTimeIndex(timelineRows, stressedYear))
  const currentScenarioLabel = URANIUM_SCENARIO_OPTIONS[scenarioKey] || URANIUM_SCENARIO_OPTIONS[DEFAULT_SCENARIO]
  const currentTimeLabel = TIME_NODE_OPTIONS[timeIndex]?.label || TIME_NODE_OPTIONS[DEFAULT_TIME_INDEX].label
  const eventYear = timeIndex === 0 ? timelineRows[0] : timeIndex === 2 ? timelineRows.at(-1) : stressedYear
  const eventLabel = eventYear?.active_events?.[0]
  const currentEventName = eventLabel
    ? `${eventYear.year} 年 · ${typeof eventLabel === 'string' ? eventLabel : eventLabel.label || eventLabel.name || '年度事件'}`
    : `${currentScenarioLabel} · ${currentTimeLabel}`
  const sourceTree = TREE_DATA[scenarioKey]?.[timeIndex] || TREE_DATA[DEFAULT_SCENARIO]?.[DEFAULT_TIME_INDEX] || null
  const baselineBranch = applyUraniumDecisionCopy(buildBaselineBranch(scenarioKey, timeIndex), scenarioKey, timeIndex, true)
  const controlledBranchTree = applyUraniumDecisionCopy(buildControlledBranch(sourceTree), scenarioKey, timeIndex)
  const tree = sourceTree
    ? {
        id: `${sourceTree.id}-compare-root`,
        name: shortLabel(currentEventName, 14),
        actor: '系统',
        action: currentEventName,
        desc: '对比未干预路径与调控路径，突出风险与履约完成率变化。',
        depth: 0,
        prob: 1,
        reasoning: uraniumDecisionReasoning(currentEventName, '对比未干预与调控后的交付结果。'),
        children: [baselineBranch, controlledBranchTree].filter(Boolean)
      }
    : null

  const sourceBaseline = BASELINE_EVENT_METRICS[scenarioKey]?.[timeIndex]
  const baselineMetrics = sourceBaseline ? { ...sourceBaseline, event: currentEventName } : null
  const l1Scores = buildStrategyRows(controlledBranchTree, baselineMetrics)
  const bestStrategy = l1Scores.find((item) => item.isBest) || null
  const stage = resolveScenarioStage({
    risk: stressedYear?.average_risk_exposure,
    unmet: stressedYear?.unmet_demand_tU,
    demand: stressedYear?.total_demand_tU,
    inventory: stressedYear?.inventory_coverage_years
  })
  const improvement = bestStrategy && baselineMetrics?.score != null
    ? bestStrategy.score - baselineMetrics.score
    : null
  const topYearLabel = stressedYear?.year ? `${stressedYear.year} 年` : '-'
  const topYearDetail = stressedYear
    ? `风险 ${formatUraniumMetricValue('average_risk_exposure', stressedYear.average_risk_exposure)}，缺口 ${formatUraniumMetricValue('unmet_demand_tU', stressedYear.unmet_demand_tU)}。`
    : '当前实验尚未给出承压年份。'
  const gameTheoryScenarioKey = DECISION_TO_GAME_SCENARIO_MAP[scenarioKey] || DEFAULT_GAME_SCENARIO
  const gameScenario = GAME_SCENARIOS[gameTheoryScenarioKey] || GAME_SCENARIOS[DEFAULT_GAME_SCENARIO]
  const gameMethodFrame = resolveGameMethodFrame(gameTheoryScenarioKey)
  const recommendedGameModel = GAME_MODEL_LIBRARY[resolveGameModelKey(gameTheoryScenarioKey)] || GAME_MODEL_LIBRARY.prisoner_dilemma
  const gameEquilibrium = findNashEquilibria(gameScenario.payoffMatrix)[0] || null
  const dominantPairLabel = gameEquilibrium
    ? `${gameScenario.p1Strategies[gameEquilibrium.row]?.name} × ${gameScenario.p2Strategies[gameEquilibrium.col]?.name}`
    : '等待稳定组合'
  const strategyDeck = l1Scores.map((item, index) => ({
    ...item,
    rank: index + 1,
    title: item.name,
    scoreText: `${item.score} 分`,
    improvementText: item.improvement == null ? '与未干预差值待补充' : `较基线 ${formatSignedDelta(item.improvement)} 分`,
    successText: item.successProbability ? `高概率结果 ${item.successProbability}%` : '等待补充分支概率',
    outcomeText: item.bestLeafSituation || '等待补充结果说明'
  }))

  return {
    scenarioKey,
    timeIndex,
    currentScenarioLabel,
    currentTimeLabel,
    currentEventName,
    stage,
    stressedYear,
    tree,
    baselineMetrics,
    controlledBranchTree,
    l1Scores,
    bestStrategy,
    improvement,
    strategyDeck,
    inputBridge: {
      scenarioLabel: currentScenarioLabel,
      timeLabel: currentTimeLabel,
      eventName: currentEventName,
      gameScenarioLabel: gameScenario.scenarioName,
      gameModelLabel: recommendedGameModel.label,
      dominantPairLabel,
      sourceSummary: gameMethodFrame.fitReason,
      treeRule: gameMethodFrame.treeBridge
    },
    decisionHero: {
      title: `${currentScenarioLabel} · ${currentTimeLabel}`,
      eventName: currentEventName,
      headline: bestStrategy ? `建议优先执行“${bestStrategy.name}”` : '当前场景尚未生成推荐动作',
      summary: bestStrategy
        ? `${currentEventName} 当前处于 ${stage.label} 阶段，推荐通过“${bestStrategy.name}”优先压制风险并抬升履约完成率。`
        : '等待补充策略与结果路径。',
      stageLabel: stage.label,
      stageDetail: stage.detail,
      kpis: [
        {
          label: '基线得分',
          value: baselineMetrics?.score != null ? `${baselineMetrics.score} 分` : '-',
          detail: baselineMetrics
            ? `履约 ${baselineMetrics.fulfillmentRate}% / 缺口率 ${baselineMetrics.stockoutRate}%`
            : '未返回未干预基线。'
        },
        {
          label: '推荐动作',
          value: bestStrategy?.name || '-',
          detail: bestStrategy
            ? `预计 ${bestStrategy.score} 分，${bestStrategy.successProbability || 0}% 进入最优结果。`
            : '等待补充候选策略。'
        },
        {
          label: '承压年份',
          value: topYearLabel,
          detail: topYearDetail
        },
        {
          label: '候选数量',
          value: `${l1Scores.length}`,
          detail: l1Scores.length ? '当前对策模型已生成第一层候选动作。' : '当前时点暂无可展示候选动作。'
        }
      ],
      briefs: [
        {
          label: '触发判断',
          text: `${currentEventName} 对应 ${currentScenarioLabel} 的 ${currentTimeLabel} 处置窗口，需要优先做出组合响应。`
        },
        {
          label: '推荐逻辑',
          text: bestStrategy
            ? `${bestStrategy.name} 在当前候选中综合得分最高，且最优叶子结果指向“${bestStrategy.bestLeafSituation || '风险缓解'}”。`
            : '等待补充策略排序。'
        },
        {
          label: '执行重点',
          text: bestStrategy
            ? `${bestStrategy.note} 当前更适合先作为主动作，再配合其余分支做补位。`
            : stage.detail
        }
      ]
    },
    reportHeadline: bestStrategy
      ? `${currentScenarioLabel}在${currentTimeLabel}建议优先执行“${bestStrategy.name}”，预计对策评分 ${bestStrategy.score} 分，较未干预 ${formatSignedDelta(improvement)} 分。`
      : '当前场景尚未生成候选调控动作。'
  }
}

export function buildUraniumScenarioViewModel({ experiment = null, snapshot = null } = {}) {
  if (!experiment) return null

  const timelineRows = buildUraniumTimelineRows(experiment)
  const panels = buildExperimentDetailPanels(experiment)
  const decisionVm = buildUraniumDecisionTreeViewModel({ experiment, snapshot })
  const gameSelection = buildUraniumGameModelSelectionViewModel({ experiment, snapshot })
  const selectedPresetLabel = resolvePresetLabel(experiment)
  const selectedExperimentName = resolveExperimentName(experiment, selectedPresetLabel)
  const selectedYearRange = `${experiment?.plan?.start_year || timelineRows[0]?.year || '-'} - ${experiment?.plan?.end_year || timelineRows[timelineRows.length - 1]?.year || '-'}`
  const totalEvents = timelineRows.reduce((sum, row) => sum + Number(row.active_event_count || row.active_events?.length || 0), 0)
  const primaryStressedEvent = decisionVm.stressedYear?.active_events?.[0] || latestTimelineEventLabel(timelineRows) || '年度扰动'
  const fallbackAction = `将该窗口送入 ${gameSelection.selectedModel.label}，优先验证寻源补位、库存缓冲与合同调整。`
  const yearWindows = timelineRows.map((row, index) => buildScenarioYearWindow(row, index, panels, fallbackAction, timelineRows.length))
  const stressedYearId = decisionVm.stressedYear?.id || null
  const defaultActiveWindowIndex = Math.max(0, yearWindows.findIndex((item) => item.id === stressedYearId))
  const activeWindow = yearWindows[defaultActiveWindowIndex] || yearWindows[yearWindows.length - 1] || null
  const latestWindow = yearWindows[yearWindows.length - 1] || null
  const topRoute = panels.allocations?.[0] || activeWindow?.routeRows?.[0] || null
  const heroMetricCards = [
    {
      label: '平均成本（美元/kgU）',
      value: formatUraniumMetricValue('avg_cost_usd_kgU', experiment?.summary?.avg_cost_usd_kgU),
      hint: '实验窗口平均采购成本'
    },
    {
      label: '平均风险暴露',
      value: formatUraniumMetricValue('avg_risk_exposure', experiment?.summary?.avg_risk_exposure),
      hint: '实验窗口平均风险暴露'
    },
    {
      label: '库存覆盖',
      value: formatUraniumMetricValue('final_inventory_coverage_years', experiment?.summary?.final_inventory_coverage_years),
      hint: latestWindow?.year ? `${latestWindow.year} 年末库存缓冲` : '最终库存缓冲'
    },
    {
      label: '最大缺口',
      value: formatUraniumMetricValue('max_unmet_demand_tU', experiment?.summary?.max_unmet_demand_tU),
      hint: '全年最大未满足需求'
    }
  ]
  const scenarioDigestCards = [
    {
      label: '主通道',
      value: topRoute
        ? `${topRoute.supplier_name || '-'} → ${topRoute.manufacturer_name || '-'}`
        : '-',
      detail: topRoute
        ? `当前焦点链路承担 ${formatUraniumMetricValue('total_procured_tU', topRoute.quantity_tU)}。`
        : '暂无关键航线数据。',
      tone: 'neutral'
    },
    {
      label: '窗口数量',
      value: `${yearWindows.length} 个`,
      detail: '按年度窗口组织后续证据阅读和方法收敛。',
      tone: 'success'
    },
    {
      label: '累计事件',
      value: String(totalEvents),
      detail: `${primaryStressedEvent} 是当前最值得向下展开的方法入口。`,
      tone: decisionVm.stage.tone
    },
    {
      label: '下一步模型',
      value: gameSelection.selectedModel.label,
      detail: `建议送入 ${gameSelection.currentScenario.player1.label} / ${gameSelection.currentScenario.player2.label} 的关系判断。`,
      tone: 'warning'
    }
  ]
  const hero = {
    title: `${selectedExperimentName} · 年度窗口识别`,
    headline: decisionVm.stressedYear?.year
      ? `${decisionVm.stressedYear.year} 年是当前主要承压窗口，可按年度查看风险来源、库存和主要采购通道。`
      : '按年度检查事件、采购通道与库存变化。',
    summary: `覆盖 ${selectedYearRange} 年窗口，共梳理 ${totalEvents} 个年度扰动事件。选择年度后查看关键扰动、采购关系和执行提示。`,
    tags: [
      { label: '模板', value: selectedPresetLabel },
      { label: '年份', value: selectedYearRange },
      { label: '压力窗口', value: decisionVm.stressedYear?.year ? `${decisionVm.stressedYear.year} 年` : '-' }
    ],
    spotlight: {
      label: '当前焦点窗口',
      title: activeWindow?.title || '暂无窗口',
      text: activeWindow
        ? `${activeWindow.headline}，当前判断为 ${activeWindow.stageLabel}，建议下一步送入 ${gameSelection.selectedModel.label}，继续判断 ${gameSelection.currentScenario.player1.label} / ${gameSelection.currentScenario.player2.label} 的主导激励。`
        : '等待实验窗口数据。'
    }
  }
  const briefCards = [
    {
      label: '窗口概况',
      text: activeWindow
        ? `风险 ${activeWindow.riskText} · 库存 ${activeWindow.inventoryText} · 缺口 ${activeWindow.unmetText}`
        : '当前没有可用窗口。',
      tone: activeWindow?.tone || 'neutral'
    },
    {
      label: '主通道',
      text: topRoute
        ? `${topRoute.supplier_name || '-'} → ${topRoute.manufacturer_name || '-'} · ${formatUraniumMetricValue('total_procured_tU', topRoute.quantity_tU)}`
        : '暂无关键航线数据。',
      tone: 'success'
    },
    {
      label: '下游模型',
      text: `${gameSelection.selectedModel.label} · ${gameSelection.currentScenario.player1.label} / ${gameSelection.currentScenario.player2.label}`,
      tone: 'success'
    }
  ]
  const yearComparisonRows = yearWindows.map((item) => ({
    id: item.id,
    year: item.year,
    stageLabel: item.stageLabel,
    headline: item.headline,
    riskText: item.riskText,
    inventoryText: item.inventoryText,
    unmetText: item.unmetText,
    routeText: item.routeRows[0]
      ? `${item.routeRows[0].supplier_name} → ${item.routeRows[0].manufacturer_name}`
      : '暂无主通道'
  }))

  return {
    hero,
    briefCards,
    heroMetricCards,
    scenarioDigestCards,
    yearWindows,
    defaultActiveWindowIndex,
    yearComparisonRows
  }
}

export function buildUraniumGameTheoryViewModel({
  experiment = null,
  snapshot = null,
  manualScenarioKey = '',
  manualModelKey = '',
  payoffMatrix = null
} = {}) {
  const scenarioKey = resolveGameTheoryScenarioKey({ experiment, snapshot, manualScenarioKey })
  const currentScenario = GAME_SCENARIOS[scenarioKey] || GAME_SCENARIOS[DEFAULT_GAME_SCENARIO]
  const decisionVm = buildUraniumDecisionTreeViewModel({ experiment, snapshot })
  const modelSelection = buildUraniumGameModelSelectionViewModel({
    experiment,
    snapshot,
    manualScenarioKey,
    manualModelKey
  })
  const matrixSource = Array.isArray(payoffMatrix) && payoffMatrix.length ? payoffMatrix : currentScenario.payoffMatrix
  const nashEquilibria = findNashEquilibria(matrixSource)
  const dominantEq = nashEquilibria[0] || null
  const boardInsights = resolveGameBoardInsights(currentScenario, matrixSource)
  const dominantPairLabel = dominantEq
    ? `${currentScenario.p1Strategies[dominantEq.row]?.name} × ${currentScenario.p2Strategies[dominantEq.col]?.name}`
    : '等待均衡识别'
  const dominantIsEfficient = dominantEq && boardInsights.maxTotalCell
    ? dominantEq.row === boardInsights.maxTotalCell.rowIndex && dominantEq.col === boardInsights.maxTotalCell.colIndex
    : false
  const dominantPayoffText = dominantEq
    ? `${Number(dominantEq.p1).toFixed(1)} / ${Number(dominantEq.p2).toFixed(1)}`
    : '—'
  const maxTotalPairLabel = boardInsights.maxTotalCell
    ? formatGamePairLabel(currentScenario, boardInsights.maxTotalCell.rowIndex, boardInsights.maxTotalCell.colIndex)
    : '待识别'
  const minTotalPairLabel = boardInsights.minTotalCell
    ? formatGamePairLabel(currentScenario, boardInsights.minTotalCell.rowIndex, boardInsights.minTotalCell.colIndex)
    : '待识别'
  const hero = {
    title: `${currentScenario.scenarioName} · ${modelSelection.selectedModel.label}`,
    headline: dominantEq
      ? `当前矩阵默认均衡为“${dominantPairLabel}”`
      : '当前矩阵未识别到纯策略纳什均衡',
    summary: dominantEq
      ? '先用收益矩阵确认双方最优响应，再判断默认均衡是否等于系统总收益最优，最后把结论交给对策分析展开。'
      : '先用双方均值优势和收益矩阵定位冲突，再由仿真 Agent 生成可展开的候选动作。',
    tags: [
      { label: '场景', value: decisionVm.currentScenarioLabel },
      { label: '时点', value: decisionVm.currentTimeLabel },
      { label: '博弈对象', value: `${currentScenario.player1.label} × ${currentScenario.player2.label}` },
      { label: '建议模型', value: modelSelection.selectedModel.label }
    ],
    kpis: modelSelection.inputSignalCards,
    briefs: [
      {
        label: '冲突焦点',
        text: modelSelection.inputSignalCards[2]?.value || currentScenario.viewDesc
      },
      {
        label: '模型理由',
        text: modelSelection.candidateCards.find((item) => item.selected)?.reason || currentScenario.viewDesc
      },
      {
        label: '下游输出',
        text: dominantEq
          ? `默认均衡 ${dominantPairLabel}，最高总收益 ${maxTotalPairLabel}，最低总收益 ${minTotalPairLabel}。`
          : '当前矩阵未识别默认均衡，建议先看双方均值优势。'
      }
    ]
  }

  const bestRow = boardInsights.bestRow
  const bestCol = boardInsights.bestCol
  const fragilePair = boardInsights.minTotalCell
  const insightCards = [
    {
      label: '默认均衡',
      value: dominantPairLabel,
      detail: dominantEq ? `收益 ${dominantPayoffText}` : '当前矩阵未识别到纯策略均衡。',
      tone: dominantEq ? 'success' : 'warning'
    },
    {
      label: '最高总收益',
      value: maxTotalPairLabel,
      detail: boardInsights.maxTotalCell
        ? `合计 ${boardInsights.maxTotalCell.total.toFixed(1)}${dominantIsEfficient ? ' · 与默认均衡一致' : ''}`
        : '当前没有识别到效率最优组合。',
      tone: 'primary'
    },
    {
      label: '最低总收益',
      value: minTotalPairLabel,
      detail: fragilePair
        ? `合计 ${fragilePair.total.toFixed(1)}`
        : '当前没有识别到明显低收益组合。',
      tone: 'danger'
    },
    {
      label: '均值优势',
      value: bestRow && bestCol
        ? `${bestRow.strategy.name} / ${bestCol.strategy.name}`
        : '待识别',
      detail: bestRow && bestCol
        ? `${currentScenario.player1.shortLabel || currentScenario.player1.label} ${Number(bestRow.avgPayoff).toFixed(1)} · ${currentScenario.player2.shortLabel || currentScenario.player2.label} ${Number(bestCol.avgPayoff).toFixed(1)}`
        : '等待识别双方均值最优策略。',
      tone: 'warning'
    }
  ]

  const playerGuideCards = [
    {
      id: 'p1-guide',
      eyebrow: `${currentScenario.player1.label} 视角`,
      title: bestRow?.strategy?.name || '待识别策略',
      summary: bestRow
        ? '全部列策略下，该行的平均收益最高。'
        : `等待识别 ${currentScenario.player1.label} 的优势策略。`,
      metricLabel: '平均收益',
      metricValue: bestRow?.avgPayoff != null ? Number(bestRow.avgPayoff).toFixed(1) : '—',
      tone: 'primary'
    },
    {
      id: 'p2-guide',
      eyebrow: `${currentScenario.player2.label} 视角`,
      title: bestCol?.strategy?.name || '待识别策略',
      summary: bestCol
        ? '全部行策略下，该列的平均收益最高。'
        : `等待识别 ${currentScenario.player2.label} 的优势策略。`,
      metricLabel: '平均收益',
      metricValue: bestCol?.avgPayoff != null ? Number(bestCol.avgPayoff).toFixed(1) : '—',
      tone: 'warning'
    },
    {
      id: 'bridge-guide',
      eyebrow: '下游衔接',
      title: '进入对策分析',
      summary: modelSelection.simulationAgent.handoff,
      metricLabel: '默认聚焦',
      metricValue: modelSelection.selectedModel.label,
      tone: dominantEq ? 'success' : 'danger'
    }
  ]

  const equilibriumCards = nashEquilibria.map((eq, index) => ({
    id: `${eq.row}-${eq.col}-${index}`,
    title: `均衡 #${index + 1}`,
    pairText: `${currentScenario.p1Strategies[eq.row]?.name} × ${currentScenario.p2Strategies[eq.col]?.name}`,
    payoffText: `${Number(eq.p1).toFixed(1)} / ${Number(eq.p2).toFixed(1)}`,
    rationale: eq.rationale || '当前组合满足双方最优响应。'
  }))
  const matrixSummary = {
    dominantKey: dominantEq ? `${dominantEq.row}-${dominantEq.col}` : '',
    efficiencyKey: boardInsights.maxTotalCell
      ? `${boardInsights.maxTotalCell.rowIndex}-${boardInsights.maxTotalCell.colIndex}`
      : '',
    worstKey: boardInsights.minTotalCell
      ? `${boardInsights.minTotalCell.rowIndex}-${boardInsights.minTotalCell.colIndex}`
      : '',
    dominantPayoffText,
    dominantPairLabel,
    efficiencyPairLabel: maxTotalPairLabel,
    efficiencyTotal: boardInsights.maxTotalCell?.total ?? null,
    alignmentText: dominantIsEfficient
      ? '默认均衡同时位于最高总收益格，稳定性与系统效率一致。'
      : '默认均衡不是最高总收益格，后续需要通过承诺、分流或多期协作改善激励。'
  }

  return {
    scenarioKey,
    currentScenario,
    modelSelection,
    dominantPairLabel,
    hero,
    insightCards,
    playerGuideCards,
    equilibriumCards,
    nashEquilibria,
    payoffMatrix: matrixSource,
    matrixSummary
  }
}

export function buildUraniumReportViewModel({ experiment = null, history = [], snapshot = null } = {}) {
  const reportData = getDisplayReport(experiment) || null
  if (!experiment && !reportData) return null

  const paperResults = buildUraniumPaperResultsModel()
  const timelineRows = buildUraniumTimelineRows(experiment)
  const detailPanels = buildExperimentDetailPanels(experiment)
  const summaryData = experiment?.summary || reportData || {}
  const latestTimelineRow = timelineRows[timelineRows.length - 1] || null
  const selectedPresetLabel = resolvePresetLabel(experiment)
  const selectedExperimentName = resolveExperimentName(experiment, selectedPresetLabel)
  const selectedExecutionMode = resolveExecutionMode(experiment)
  const generatedAt = experiment?.completed_at || reportData?.generated_at
    ? formatDateTime(experiment?.completed_at || reportData?.generated_at)
    : new Date().toLocaleString('zh-CN', { hour12: false })

  const supplierRows = normalizeSupplierRows(
    detailPanels.supplierShares?.length
      ? detailPanels.supplierShares
      : (Array.isArray(reportData?.final_supplier_structure) ? reportData.final_supplier_structure : [])
  )
  const contractRows = normalizeContractRows(detailPanels.contractMix)
  const procurementRows = normalizeProcurementRows(
    (Array.isArray(reportData?.final_procurement_structure) && reportData.final_procurement_structure.length)
      ? reportData.final_procurement_structure
      : (Array.isArray(latestTimelineRow?.manufacturers) ? latestTimelineRow.manufacturers : [])
  )
  const allocationRows = normalizeAllocationRows(detailPanels.allocations).slice(0, 8)
  const historyComparisonRows = normalizeHistoryComparisonRows(history)
  const selectedYearRange = `${experiment?.plan?.start_year || timelineRows[0]?.year || '-'} - ${experiment?.plan?.end_year || timelineRows[timelineRows.length - 1]?.year || '-'}`
  const keyResultCards = [
    {
      label: '平均成本（美元/kgU）',
      value: formatUraniumMetricValue('avg_cost_usd_kgU', summaryData.avg_cost_usd_kgU),
      hint: '按采购量加权'
    },
    {
      label: '平均风险暴露',
      value: formatUraniumMetricValue('avg_risk_exposure', summaryData.avg_risk_exposure),
      hint: '0–1，越低表示暴露越小'
    },
    {
      label: '最大缺口',
      value: formatUraniumMetricValue('max_unmet_demand_tU', summaryData.max_unmet_demand_tU),
      hint: '窗口内年度最大需求缺口'
    },
    {
      label: '期末库存覆盖',
      value: formatUraniumMetricValue('final_inventory_coverage_years', summaryData.final_inventory_coverage_years),
      hint: '目标覆盖 3 年需求'
    }
  ]
  const alerts = (detailPanels.alerts || []).slice(0, 4)
  const recommendations = (detailPanels.recommendations || []).slice(0, 4)
  const overallAssessment = resolveScenarioStage({
    risk: summaryData.avg_risk_exposure,
    unmetRatio: summaryData.avg_unmet_ratio,
    inventory: summaryData.final_inventory_coverage_years
  })
  const mostStressedYear = pickMostStressedYear(timelineRows)

  const routeDigestRows = allocationRows.slice(0, 5).map((item) => {
    const total = allocationRows.reduce((sum, row) => sum + Number(row.quantity_tU || 0), 0)
    return {
      id: item.id,
      label: `${item.supplier_name || '-'} → ${item.manufacturer_name || '-'}`,
      quantityText: formatUraniumMetricValue('total_procured_tU', item.quantity_tU),
      sharePct: total > 0 ? Math.max(8, Math.min(100, Number(item.quantity_tU || 0) / total * 100)) : 0,
      shareText: total > 0 ? `${((Number(item.quantity_tU || 0) / total) * 100).toFixed(1)}%` : '-'
    }
  })

  const decisionVm = buildUraniumDecisionTreeViewModel({ experiment, snapshot })
  const gameVm = buildUraniumGameTheoryViewModel({ experiment, snapshot })
  const scenarioVm = buildUraniumScenarioViewModel({ experiment, history, snapshot })
  const decisionCandidateRows = decisionVm.l1Scores.map((item) => ({
    id: item.id,
    name: item.name,
    score: item.score,
    scoreText: `${item.score} 分`,
    note: item.note,
    improvementText: item.improvement == null ? '与未干预差值待补充' : `较未干预 ${formatSignedDelta(item.improvement)} 分`,
    successText: item.successProbability ? `高概率结果 ${item.successProbability}%` : '等待补充分支概率',
    outcome: item.bestLeafSituation || '等待补充结果说明',
    isBest: item.isBest
  }))

  const finalHhi = toFiniteNumber(
    summaryData.final_supply_concentration_hhi
    ?? reportData?.final_supply_concentration_hhi
    ?? latestTimelineRow?.supply_concentration_hhi
  )
  const dominantShare = normalizeShareValue(
    summaryData.final_dominant_supplier_share
    ?? reportData?.final_dominant_supplier_share
    ?? latestTimelineRow?.dominant_supplier_share
    ?? supplierRows[0]?.share
  )
  const topSupplier = supplierRows[0] || null
  const anchorContract = contractRows.find((item) => item.contract_type.includes('长协')) || contractRows[0] || null
  const topManufacturer = procurementRows[0] || null

  const structureSummaryCards = [
    {
      label: '供应集中度',
      value: formatUraniumMetricValue('final_supply_concentration_hhi', finalHhi),
      detail: topSupplier ? `Top 供应商为 ${topSupplier.supplier_name}。` : '按期末采购份额衡量供应集中程度。'
    },
    {
      label: '主供份额',
      value: formatUraniumMetricValue('final_dominant_supplier_share', dominantShare),
      detail: topSupplier ? `${topSupplier.supplier_name} 占比 ${formatUraniumPercent(topSupplier.share)}。` : '关注单一来源依赖。'
    },
    anchorContract
      ? {
          label: anchorContract.contract_type.includes('长协') ? '长协占比' : '主合同类型',
          value: anchorContract.contract_type.includes('长协')
            ? formatUraniumPercent(anchorContract.share)
            : anchorContract.contract_type,
          detail: `${anchorContract.contract_type} 采购 ${formatUraniumMetricValue('total_procured_tU', anchorContract.quantity_tU)}。`
        }
      : {
          label: '合同结构',
          value: '-',
          detail: '当前未返回合同分布数据。'
        },
    topManufacturer
      ? {
          label: '主承接方',
          value: topManufacturer.name,
          detail: `期末承接 ${formatUraniumMetricValue('total_procured_tU', topManufacturer.procured_tU)}。`
        }
      : {
          label: '主承接方',
          value: '-',
          detail: '当前未返回制造方承接数据。'
        }
  ]

  const focusWindowCards = timelineRows.map((row, index) => {
    const stage = resolveScenarioStage({
      risk: row.average_risk_exposure,
      unmet: row.unmet_demand_tU,
      demand: row.total_demand_tU,
      inventory: row.inventory_coverage_years
    })
    const primaryAllocation = [...(row.allocations || [])]
      .sort((left, right) => Number(right.quantity_tU || 0) - Number(left.quantity_tU || 0))[0]

    return {
      id: row.id || `${row.year || index}`,
      year: row.year,
      isPeak: row.year === mostStressedYear?.year,
      tone: stage.tone,
      stageLabel: stage.label,
      headline: row.active_events?.[0] || '常态运行',
      riskText: formatUraniumMetricValue('average_risk_exposure', row.average_risk_exposure),
      inventoryText: formatUraniumMetricValue('inventory_coverage_years', row.inventory_coverage_years),
      unmetText: formatUraniumMetricValue('unmet_demand_tU', row.unmet_demand_tU),
      routeText: primaryAllocation
        ? `${primaryAllocation.supplier_name || '-'} → ${primaryAllocation.manufacturer_name || '-'}`
        : '暂无关键采购'
    }
  })

  const rankingCandidates = [
    {
      id: experiment?.experiment_id || 'current',
      experimentName: selectedExperimentName,
      name: selectedPresetLabel,
      template: selectedPresetLabel,
      templateKey: String(
        experiment?.preset_name
        || experiment?.plan?.preset_name
        || experiment?.plan?.template_used
        || experiment?.template_name
        || ''
      ).trim(),
      templateLabel: selectedPresetLabel,
      rawCost: Number(summaryData.avg_cost_usd_kgU || 0),
      rawRisk: Number(summaryData.avg_risk_exposure || 0),
      rawUnmet: Number(summaryData.max_unmet_demand_tU || 0),
      rawCoverage: Number(summaryData.final_inventory_coverage_years || 0),
      detailSource: 'current'
    },
    ...historyComparisonRows.slice(0, 4).map((item) => ({
      id: item.id,
      experimentName: item.label,
      name: PRESET_LABEL_MAP[item.template] || item.template || '历史实验',
      template: item.template,
      templateKey: item.template,
      templateLabel: PRESET_LABEL_MAP[item.template] || item.template || '历史实验',
      rawCost: Number(item.rawCost || 0),
      rawRisk: Number(item.rawRisk || 0),
      rawUnmet: Number(item.rawUnmet || 0),
      rawCoverage: Number(item.rawCoverage || 0),
      detailSource: 'history'
    }))
  ].filter((item, index, list) => list.findIndex((target) => target.id === item.id) === index)

  const experimentRankingCards = rankingCandidates
    .map((item) => {
      const score = Math.max(
        35,
        Math.min(
          95,
          Math.round(100 - item.rawCost * 0.35 - item.rawRisk * 140 - item.rawUnmet * 0.08 + item.rawCoverage * 12)
        )
      )
      const intensity = item.rawRisk >= 0.18 || item.rawUnmet >= 120
        ? '承压保供'
        : item.rawRisk >= 0.14 || item.rawUnmet >= 60
          ? '弹性校准'
          : '稳态收敛'
      const narrative = buildExperimentComparisonNarrative(item)
      const historyRunLabel = formatExperimentRunLabel(item.id || item.experimentName)
      const title = item.templateLabel || item.name || '实验方案'
      const subtitle = item.detailSource === 'current'
        ? (selectedExperimentName && selectedExperimentName !== title ? selectedExperimentName : '当前实验')
        : (historyRunLabel ? `历史对照 · ${historyRunLabel}` : '历史对照实验')
      return {
        ...item,
        title,
        subtitle,
        score,
        intensity,
        preview: narrative.preview,
        metrics: {
          cost: formatUraniumMetricValue('avg_cost_usd_kgU', item.rawCost),
          risk: formatUraniumMetricValue('avg_risk_exposure', item.rawRisk),
          unmet: formatUraniumMetricValue('max_unmet_demand_tU', item.rawUnmet),
          coverage: formatUraniumMetricValue('final_inventory_coverage_years', item.rawCoverage)
        },
        trigger: item.detailSource === 'current'
          ? `${selectedYearRange} 年围绕 ${mostStressedYear?.active_events?.[0] || '年度扰动'} 做保供调度。`
          : `${title} 用来和当前方案直接对照成本、风险与库存取舍。`,
        actionChain: item.detailSource === 'current'
          ? recommendations.slice(0, 3)
          : buildHistoryComparisonActions(item.templateKey),
        benefit: item.rawCoverage >= 2.8
          ? `库存覆盖 ${formatUraniumMetricValue('final_inventory_coverage_years', item.rawCoverage)}，达到当前模型的库存缓冲参考线。`
          : item.rawCoverage >= 2.3
            ? `库存覆盖 ${formatUraniumMetricValue('final_inventory_coverage_years', item.rawCoverage)}，仍需关注库存缓冲。`
            : `库存覆盖 ${formatUraniumMetricValue('final_inventory_coverage_years', item.rawCoverage)}，缓冲偏薄，需要后续调度补位。`,
        costText: item.rawUnmet >= 120
          ? `平均成本 ${formatUraniumMetricValue('avg_cost_usd_kgU', item.rawCost)}，最大缺口 ${formatUraniumMetricValue('max_unmet_demand_tU', item.rawUnmet)}，缺口压力仍然明显。`
          : `平均成本 ${formatUraniumMetricValue('avg_cost_usd_kgU', item.rawCost)}，最大缺口 ${formatUraniumMetricValue('max_unmet_demand_tU', item.rawUnmet)}。`,
        verdict: narrative.verdict
      }
    })
    .sort((left, right) => right.score - left.score)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      isBest: index === 0,
      badgeText: index === 0 ? '当前第一' : item.detailSource === 'current' ? '当前实验' : '历史对照',
      color: index === 0 ? '#16a34a' : index === 1 ? '#2563eb' : '#94a3b8'
    }))

  const executionPhaseCards = focusWindowCards.slice(0, 4).map((item, index) => ({
    time: `阶段 ${index + 1}`,
    title: `${item.year} 年 · ${item.stageLabel}`,
    detail: `${item.headline}，风险 ${item.riskText}，库存 ${item.inventoryText}，主通道 ${item.routeText}。`,
    tags: [item.stageLabel, item.routeText, item.unmetText]
  }))

  const reportBriefBlocks = [
    {
      label: '实验结论',
      title: `${selectedExperimentName} 已完成多年度供应链压力评估`,
      text: `${selectedPresetLabel} 覆盖 ${selectedYearRange} 年窗口，当前总体判断为 ${overallAssessment.label}。平均成本 ${formatUraniumMetricValue('avg_cost_usd_kgU', summaryData.avg_cost_usd_kgU)}，平均风险暴露 ${formatUraniumMetricValue('avg_risk_exposure', summaryData.avg_risk_exposure)}，期末库存覆盖 ${formatUraniumMetricValue('final_inventory_coverage_years', summaryData.final_inventory_coverage_years)}。`,
      tone: overallAssessment.tone
    },
    {
      label: '运行观察',
      title: mostStressedYear?.year ? `${mostStressedYear.year} 年是本轮推演的主要承压点` : '运行链路已可做年度回放',
      text: `${mostStressedYear?.active_events?.[0] || '年度扰动'} 是压力上升的主要触发点。当前最需要盯住的主采购链路是 ${routeDigestRows[0]?.label || '关键采购组合'}，${topManufacturer ? `${topManufacturer.name} 是期末采购量最高的采购主体。` : '当前采购主体以汇总结果展示。'}`,
      tone: mostStressedYear ? resolveScenarioStage({
        risk: mostStressedYear.average_risk_exposure,
        unmet: mostStressedYear.unmet_demand_tU,
      demand: mostStressedYear.total_demand_tU,
        inventory: mostStressedYear.inventory_coverage_years
      }).tone : 'neutral'
    },
    {
      label: '结构判断',
      title: topSupplier ? `${topSupplier.supplier_name} 仍是当前结构中的头部来源` : '供应与合同结构已具备基础快照',
      text: `期末供应集中度为 ${formatUraniumMetricValue('final_supply_concentration_hhi', finalHhi)}，主供份额 ${formatUraniumMetricValue('final_dominant_supplier_share', dominantShare)}。${anchorContract ? `${anchorContract.contract_type} 是当前主合同结构，占比 ${formatUraniumPercent(anchorContract.share)}。` : '暂无合同结构数据。'}`,
      tone: 'neutral'
    },
    {
      label: '决策分析',
      title: decisionVm.bestStrategy ? `综合评估推荐执行“${decisionVm.bestStrategy.name}”` : '尚未形成可执行的策略结论',
      text: decisionVm.reportHeadline,
      tone: decisionVm.bestStrategy ? 'success' : 'neutral'
    }
  ]

  const reportHero = {
    title: `${selectedExperimentName} · ${overallAssessment.label}`,
    headline: decisionVm.reportHeadline,
    summary: `${selectedPresetLabel} 覆盖 ${selectedYearRange} 年窗口，重点评估供需缺口、通道暴露、库存安全与策略改善效果。`,
    tags: [
      { label: '模板', value: selectedPresetLabel },
      { label: '模式', value: selectedExecutionMode },
      { label: '关键年份', value: mostStressedYear?.year ? `${mostStressedYear.year} 年` : '-' },
      { label: '生成时间', value: generatedAt }
    ],
    spotlight: {
      label: '推荐动作',
      title: decisionVm.bestStrategy?.name || '-',
      text: decisionVm.bestStrategy
        ? `${decisionVm.currentScenarioLabel} / ${decisionVm.currentTimeLabel}，预计 ${decisionVm.bestStrategy.score} 分，${decisionVm.improvement == null ? '改善值待补充' : `较基线 ${formatSignedDelta(decisionVm.improvement)} 分`}。`
        : '当前场景尚未生成推荐动作。'
    }
  }
  const analysisRecoveryCards = [
    {
      step: '多Agent实验',
      title: `${timelineRows.length || 0} 个年度窗口已生成`,
      text: timelineRows.length
        ? `实验先产出 ${selectedYearRange} 年的年度窗口、事件与采购结构，作为后续分析的统一输入。`
        : '实验窗口数据待补充。',
      output: `${timelineRows.length || 0} 个窗口 / ${detailPanels.allocations?.length || allocationRows.length} 条关键链路`
    },
    {
      step: '场景识别',
      title: scenarioVm?.hero?.spotlight?.title || '压力窗口待识别',
      text: scenarioVm?.hero?.spotlight?.text || '场景页负责定位承压年份、主通道和关键节点。',
      output: `${decisionVm.currentScenarioLabel} / ${decisionVm.currentTimeLabel}`
    },
    {
      step: '博弈模型',
      title: gameVm.modelSelection.selectedModel.label,
      text: gameVm.modelSelection.candidateCards.find((item) => item.selected)?.reason || '当前模型选择逻辑待补充。',
      output: `${gameVm.modelSelection.simulationAgent.name} · ${gameVm.dominantPairLabel}`
    },
    {
      step: '对策分析',
      title: decisionVm.bestStrategy?.name || '推荐动作待补充',
      text: decisionVm.reportHeadline,
      output: `${decisionVm.strategyDeck.length} 个候选动作已排序`
    }
  ]
  const topRankingCard = experimentRankingCards[0] || null
  const paperFocusCards = [
    {
      label: '实验设置',
      value: `${selectedYearRange} · ${selectedExecutionMode}`,
      detail: `${experiment?.scenario_context?.supplier_count ?? '-'} 个供给方 / ${experiment?.scenario_context?.manufacturer_count ?? '-'} 个制造方 / ${experiment?.scenario_context?.event_count ?? '-'} 个事件`
    },
    {
      label: '主要压力窗口',
      value: mostStressedYear?.year ? `${mostStressedYear.year} 年` : '-',
      detail: mostStressedYear?.active_events?.[0] || '当前未识别到主压力事件。'
    },
    {
      label: '实验排序第一',
      value: topRankingCard?.experimentName || '-',
      detail: topRankingCard ? `综合得分 ${topRankingCard.score} · ${topRankingCard.intensity}` : '当前没有可排序实验。'
    },
    {
      label: '推荐动作',
      value: decisionVm.bestStrategy?.name || '-',
      detail: decisionVm.improvement == null ? '改善值待补充。' : `较基线 ${formatSignedDelta(decisionVm.improvement)} 分`
    }
  ]

  return {
    header: {
      title: '铀场景实验报告',
      subtitle: '汇总实验结果、年度压力、策略排序与供应结构，为调度决策提供可复核依据。',
      generatedAt
    },
    selectedPresetLabel,
    selectedExperimentName,
    selectedExecutionMode,
    selectedYearRange,
    paperResults,
    reportHero,
    analysisRecoveryCards,
    paperFocusCards,
    reportBriefBlocks,
    experimentRankingCards,
    executionPhaseCards,
    overview: {
      experimentId: experiment?.experiment_id || '-',
      template: selectedPresetLabel,
      experimentName: selectedExperimentName,
      executionMode: selectedExecutionMode,
      startYear: experiment?.plan?.start_year || '-',
      endYear: experiment?.plan?.end_year || '-',
      metaCards: [
        { label: '供给方', value: experiment?.scenario_context?.supplier_count ?? '-' },
        { label: '采购主体', value: experiment?.scenario_context?.manufacturer_count ?? '-' },
        { label: '环境事件', value: experiment?.scenario_context?.event_count ?? '-' },
        { label: '完成时间', value: formatDateTime(experiment?.completed_at) }
      ]
    },
    keyResultCards,
    alerts,
    recommendations,
    focusWindowCards,
    routeDigestRows,
    structureSummaryCards,
    supplierRows,
    contractRows,
    procurementRows,
    decisionSummary: {
      scenarioLabel: decisionVm.currentScenarioLabel,
      timeLabel: decisionVm.currentTimeLabel,
      eventName: decisionVm.currentEventName,
      baselineScoreText: decisionVm.baselineMetrics?.score != null ? `${decisionVm.baselineMetrics.score} 分` : '-',
      recommendedStrategy: decisionVm.bestStrategy?.name || '-',
      improvementText: decisionVm.improvement == null ? '-' : `${formatSignedDelta(decisionVm.improvement)} 分`,
      headline: decisionVm.reportHeadline,
      candidateRows: decisionCandidateRows
    }
  }
}

export function buildUraniumReportText(viewModel) {
  if (!viewModel) return ''
  const paperResults = viewModel.paperResults || {}
  const paperSections = Array.isArray(paperResults.sections) ? paperResults.sections : []
  const paperSummary = paperSections
    .map((section) => {
      const bestRow = section?.primaryTable?.rows?.[0]
      if (!bestRow) return `${section.label}：-`
      const winner = bestRow.method || bestRow.strategy || bestRow.model || bestRow.alias || '-'
      const score = bestRow.averageValidation || bestRow.validation || '-'
      return `${section.label}：${winner}（${score}）`
    })
    .join('\n')
  const paperConclusions = paperSections
    .flatMap((section) => section.conclusions || [])
    .slice(0, 6)
    .join('\n')
  return `
铀场景实验报告
==========================================

实验ID：${viewModel.overview.experimentId}
模板：${viewModel.selectedPresetLabel}
实验名称：${viewModel.selectedExperimentName}
执行模式：${viewModel.selectedExecutionMode}
生成时间：${viewModel.header.generatedAt}

核心摘要
------------------------------------------
${viewModel.reportBriefBlocks.map((row) => `${row.label}：${row.title} ${row.text}`).join('\n')}

固定对比实验结果
------------------------------------------
整理时间：${paperResults.meta?.updatedAt || '-'}
训练期：${paperResults.meta?.trainingWindow || '-'}
验证期：${paperResults.meta?.validationWindow || '-'}
统一指标：${paperResults.meta?.scoreMetric || '-'}（${paperResults.meta?.scoreRange || '-'}，越高越好）
${paperSummary || '-'}

结果结论
------------------------------------------
${paperConclusions || '-'}

决策分析
------------------------------------------
场景：${viewModel.decisionSummary.scenarioLabel}
时点：${viewModel.decisionSummary.timeLabel}
事件：${viewModel.decisionSummary.eventName}
推荐动作：${viewModel.decisionSummary.recommendedStrategy}
基线得分：${viewModel.decisionSummary.baselineScoreText}
得分改善：${viewModel.decisionSummary.improvementText}
${viewModel.decisionSummary.candidateRows.map((row) => `${row.name}：${row.scoreText}，${row.improvementText}，${row.outcome}`).join('\n')}

关键指标
------------------------------------------
${viewModel.keyResultCards.map((item) => `${item.label}：${item.value}`).join('\n')}

风险提示
------------------------------------------
${viewModel.alerts.length ? viewModel.alerts.join('\n') : '-'}

策略建议
------------------------------------------
${viewModel.recommendations.length ? viewModel.recommendations.join('\n') : '-'}
`.trim()
}
