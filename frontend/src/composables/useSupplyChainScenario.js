/**
 * 供应链场景 Composable
 *
 * 把「铀供应链 / 汽车供应链」两套口径收敛到一处，供 EXreport、ExpAnalysis_Observe、
 * ExpAnalysis_Intervention、ExpAnalysis_Mechanism、ExpAnalysisMap 共用：
 *   - scenarioStore     全局场景选择（与对话首页共用同一份，?scenario= 进入时以 URL 为准）
 *   - isUraniumScene    当前是否铀场景
 *   - sceneText         当前场景的文案口径（指标名 / 库名 / 报告名 / 干预变量等）
 *   - loadScenarioExperiments()      只取当前场景的实验，按时间倒序
 *   - filterExperimentsByScenario()  按场景过滤实验列表（同步，可直接用于 computed）
 *
 * 背景：/SCnet/supplyChain/experiments 把铀与汽车两类实验混装返回，
 * 直接取 [0] 会在汽车场景下读到铀实验（反之亦然），所以取数一律经本模块过滤。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useScenarioStore } from '@/stores/scenario'
import { SCENARIO_VALUES } from '@/constants/scnetScenario'
import { getExperiments } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'
import { normalizeScenarioName } from '@/utils/scnetTaskUtils'

// ===== 场景文案口径 =====
// 铀侧沿用原有措辞；汽车侧对齐参数目录与知识库口径
// （order_multiplier → 市场需求强度、reproduction_threshold → 企业扩张触发阈值等）
const SCENE_TEXT = {
  [SCENARIO_VALUES.URANIUM]: {
    systemLabel: '铀供应链',
    libraryLabel: '铀供应链实验库',
    duringFolder: '事中实验',
    counterfactualFolder: '反事实实验',
    demandField: '铀需求强度',
    capacityField: '铀矿产能方案',
    capacityLabel: '铀矿产能',
    capacityUnit: 'tU/年',
    thresholdField: '新矿投产阈值',
    anomalyListTitle: '铀供应链异常事件',
    reportTitle: '铀供应链案例分析报告',
    reportFileBase: '铀供应链案例分析报告',
    strategyNetwork: '铀供应链网络',
    strategyGlobalScope: '全局干预策略',
    interventionVariables: ['铀矿产能', '新矿投产阈值', '铀需求强度', '产能爬坡速率']
  },
  [SCENARIO_VALUES.SUPPLY_CHAIN]: {
    systemLabel: '汽车供应链',
    libraryLabel: '汽车供应链实验库',
    duringFolder: '事中实验',
    counterfactualFolder: '反事实实验',
    demandField: '市场需求强度',
    capacityField: '工厂产能方案',
    capacityLabel: '工厂产能',
    capacityUnit: '件/月',
    thresholdField: '企业扩张触发阈值',
    anomalyListTitle: '汽车供应链异常事件',
    reportTitle: '汽车供应链案例分析报告',
    reportFileBase: '汽车供应链案例分析报告',
    strategyNetwork: '汽车供应链网络',
    strategyGlobalScope: '全局干预策略',
    interventionVariables: ['产能水平', '库存容量', '订单倍数', '协作频次']
  }
}

// ===== 实验归属场景的判定 =====
// 优先用接口显式字段；接口不返回时回退到实验元信息文本
// （与 CounterfactualExperiment 挑选汽车实验、scnetTaskUtils 判定铀任务的口径一致）
const URANIUM_HINTS = /铀|uranium|nuclear|yellowcake|黄饼/i
const AUTOMOTIVE_HINTS = /汽车|automotive|整车|工厂|制造总产能/i

/** 实验元信息里可用于判场景的文本 */
const scenarioHintText = (item) => [
  item?.goal,
  item?.system,
  item?.filename,
  item?.experiment_id,
  item?.id,
  item?.timestamp
].filter(Boolean).join(' ')

/**
 * 判定单条实验属于哪个场景
 * @returns {'uranium'|'supply_chain'|''} 无法判定时返回空串
 */
export function resolveExperimentScenario(item) {
  if (!item || typeof item !== 'object') return ''

  const explicit = item.scenario || item.scene || item.sys_scenario || ''
  if (explicit) {
    const normalized = normalizeScenarioName(explicit)
    if (normalized === SCENARIO_VALUES.URANIUM) return SCENARIO_VALUES.URANIUM
    if (normalized === 'automotive') return SCENARIO_VALUES.SUPPLY_CHAIN
  }

  const text = scenarioHintText(item)
  if (!text) return ''
  const isUranium = URANIUM_HINTS.test(text)
  const isAutomotive = AUTOMOTIVE_HINTS.test(text)
  if (isUranium && !isAutomotive) return SCENARIO_VALUES.URANIUM
  if (isAutomotive && !isUranium) return SCENARIO_VALUES.SUPPLY_CHAIN
  return ''
}

/**
 * 按场景过滤实验列表（混装列表 → 当前场景子集）
 * 一条都判定不出归属时不过滤，避免整页空白；能判定出归属但当前场景无实验则返回空列表。
 */
export function filterExperimentsByScenario(experiments, scenario = SCENARIO_VALUES.SUPPLY_CHAIN) {
  const list = Array.isArray(experiments) ? experiments : []
  if (!list.length) return []

  const target = scenario === SCENARIO_VALUES.URANIUM
    ? SCENARIO_VALUES.URANIUM
    : SCENARIO_VALUES.SUPPLY_CHAIN

  const rows = list.map(item => ({ item, scene: resolveExperimentScenario(item) }))
  const matched = rows.filter(row => row.scene === target).map(row => row.item)
  if (matched.length) return matched

  // 全表都没有场景信息：保留原列表（历史行为），否则会把可用数据整体过滤掉
  return rows.some(row => row.scene) ? [] : list
}

/** 实验时间戳（毫秒）。实验 ID 形如 20250919_153832，无 timestamp 字段时由 ID 兜底 */
function experimentTime(item) {
  const raw = item?.timestamp || item?.created_at || item?.createdAt || item?.updated_at || ''
  const parsed = Date.parse(String(raw).replace(' ', 'T'))
  if (Number.isFinite(parsed)) return parsed

  const compact = String(item?.experiment_id || item?.id || '')
    .match(/(\d{4})(\d{2})(\d{2})[_\-T]?(\d{2})(\d{2})(\d{2})/)
  if (compact) {
    const fromId = Date.parse(
      `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}`
    )
    if (Number.isFinite(fromId)) return fromId
  }
  return 0
}

export function useSupplyChainScenario() {
  const scenarioStore = useScenarioStore()

  // ?scenario= 进入本页时以 URL 为准，避免与首页选择不一致
  try {
    const route = useRoute()
    const routeScenario = String(route?.query?.scenario || '').trim()
    if ([SCENARIO_VALUES.URANIUM, SCENARIO_VALUES.SUPPLY_CHAIN].includes(routeScenario)) {
      scenarioStore.setScenario(routeScenario)
    }
  } catch {
    // 非路由上下文（如单测直接调用）时忽略
  }

  const isUraniumScene = computed(() => scenarioStore.currentScenario === SCENARIO_VALUES.URANIUM)

  const sceneText = computed(() =>
    SCENE_TEXT[scenarioStore.currentScenario] || SCENE_TEXT[SCENARIO_VALUES.SUPPLY_CHAIN]
  )

  /**
   * 加载当前场景的实验列表
   * @param {{ completedOnly?: boolean }} options completedOnly 只保留已完成实验
   * @returns {Promise<Array>} 按时间倒序（最新在前）的实验元信息
   */
  async function loadScenarioExperiments(options = {}) {
    const { completedOnly = false } = options || {}

    const response = await getExperiments()
    const payload = unwrapApiData(response)
    const rows = Array.isArray(payload) ? payload : []

    let scoped = filterExperimentsByScenario(rows, scenarioStore.currentScenario)
    if (completedOnly) {
      scoped = scoped.filter(item => String(item?.status || '').toLowerCase() === 'completed')
    }

    return scoped.slice().sort((a, b) => experimentTime(b) - experimentTime(a))
  }

  return {
    scenarioStore,
    isUraniumScene,
    sceneText,
    loadScenarioExperiments
  }
}
