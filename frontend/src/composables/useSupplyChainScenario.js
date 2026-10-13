// src/composables/useSupplyChainScenario.js
//
// 观察分析 / 干预分析 / 机制（因果）分析三个页面共用的「场景 x 实验库」适配层。
//
// 背景：这三个页面此前都按铀供应链写死文案，并且一律取 experiments[0] 当作
// “最新实验”。/SCnet/supplyChain/experiments 同时返回铀与汽车两类实验（当前
// 106 条里 18 条为汽车场景），不按场景过滤时汽车场景会加载到铀实验。
// 这里集中做三件事：
//   1) 把 ?scenario= 查询参数同步进全局场景 store（与对话首页共用同一份选择）；
//   2) 按实验 goal / scenario 字段识别实验所属场景并过滤、按时间取最新；
//   3) 提供场景文案与参数口径（口径来自 /parameter-catalog 与知识库，可溯源）。
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useScenarioStore } from '@/stores/scenario'
import { getExperiments } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'
import { SCENARIO_VALUES } from '@/constants/scnetScenario'
import { normalizeScenarioName } from '@/utils/scnetTaskUtils'

// 汽车供应链实验的 goal 固定为
// 「分析汽车供应链生态系统的协作效率，探索工厂产能配置与订单匹配的最优策略」，
// 由 configs 中的场景目标决定；scenario 字段仅新报告（2026-09 之后）才有。
const AUTOMOTIVE_GOAL_RE = /汽车|整车|automotive|vehicle|汽车产业|工厂|制造总产能/i
const URANIUM_GOAL_RE = /铀|uranium|nuclear|核燃料|核电|yellowcake|黄饼/i

/**
 * 识别单条实验所属场景。
 * @returns {'uranium'|'supply_chain'|null} null 表示无法判断
 */
export function detectExperimentScenario(item = {}) {
  if (!item || typeof item !== 'object') return null
  const explicit = item.scenario || item.scene || item.sys_scenario
  if (explicit) {
    const normalized = normalizeScenarioName(explicit)
    if (normalized === 'automotive') return SCENARIO_VALUES.SUPPLY_CHAIN
    if (normalized === SCENARIO_VALUES.URANIUM) return SCENARIO_VALUES.URANIUM
  }

  const text = [item.goal, item.system, item.filename, item.title, item.experiment_id, item.id]
    .filter(Boolean).join(' ')
  if (!text) return null
  const isAutomotive = AUTOMOTIVE_GOAL_RE.test(text)
  const isUranium = URANIUM_GOAL_RE.test(text)
  if (isAutomotive && !isUranium) return SCENARIO_VALUES.SUPPLY_CHAIN
  if (isUranium && !isAutomotive) return SCENARIO_VALUES.URANIUM
  return null
}

// 兼容原有调用方使用的空字符串返回口径。
export function resolveExperimentScenario(item) {
  return detectExperimentScenario(item) || ''
}

/**
 * 过滤出指定场景的实验。识别不出的旧实验归入铀场景（历史报告均为铀场景）。
 */
export function filterExperimentsByScenario(list, scenario) {
  const target = scenario === SCENARIO_VALUES.SUPPLY_CHAIN
    ? SCENARIO_VALUES.SUPPLY_CHAIN
    : SCENARIO_VALUES.URANIUM
  const rows = (Array.isArray(list) ? list : []).map(item => ({
    item,
    detected: detectExperimentScenario(item)
  }))
  // 全部是没有场景字段的历史实验时保留列表，避免旧页面突然空白。
  if (rows.length && rows.every(row => !row.detected)) return rows.map(row => row.item)
  return rows.filter(row => row.detected === target || (!row.detected && target === SCENARIO_VALUES.URANIUM))
}

/** 无 timestamp 的旧报告可从实验 ID（YYYYMMDD_HHMMSS）推回时间。 */
function experimentTime(item) {
  const raw = item?.timestamp || item?.created_at || item?.createdAt || item?.updated_at || ''
  const parsed = Date.parse(String(raw).replace(' ', 'T'))
  if (Number.isFinite(parsed)) return parsed
  const compact = String(item?.experiment_id || item?.id || '')
    .match(/(\d{4})(\d{2})(\d{2})[_\-T]?(\d{2})(\d{2})(\d{2})/)
  if (compact) {
    const fromId = Date.parse(`${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}`)
    if (Number.isFinite(fromId)) return fromId
  }
  return 0
}

/**
 * 按时间倒序排序（最新在前）。
 * 实验列表接口按 feature_score 排序，直接用 [0] 取到的不一定是最新实验。
 */
export function sortExperimentsByRecency(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => experimentTime(b) - experimentTime(a))
}

/** 场景文案与参数口径。铀侧维持既有展示口径，汽车侧与参数目录 / 后端因果图对齐。 */
export const SCENE_TEXT = {
  [SCENARIO_VALUES.URANIUM]: {
    systemLabel: '铀供应链',
    libraryLabel: '铀供应链实验库',
    duringFolder: '铀供应链事中实验',
    counterfactualFolder: '铀供应链反事实实验',
    anomalyListTitle: '铀供应链异常事件列表',
    demandField: '铀需求强度',
    capacityField: '铀矿产能方案',
    capacityLabel: '铀矿产能',
    // 铀矿产能单位为 tU/年（历史展示口径）
    capacityUnit: 'tU/年',
    thresholdField: '新矿投产阈值',
    strategyNetwork: '铀供应链全网络',
    strategyGlobalScope: '全局铀供应链',
    reportTitle: '铀供应链观察分析对比报告',
    reportFileBase: '铀供应链_观察分析对比报告',
    // 与后端 /causal-graph 的铀场景变量命名一致
    interventionVariables: ['铀矿产能', '新矿投产阈值', '铀需求强度', '产能爬坡速率', '网络协作密度']
  },
  [SCENARIO_VALUES.SUPPLY_CHAIN]: {
    systemLabel: '汽车供应链',
    libraryLabel: '汽车供应链实验库',
    duringFolder: '汽车供应链事中实验',
    counterfactualFolder: '汽车供应链反事实实验',
    anomalyListTitle: '汽车供应链异常事件列表',
    // 名称取自 /parameter-catalog?scenario=supply_chain 的 exp_params
    // （order_multiplier = 市场需求强度、factory_capacity_range = 工厂产能范围）
    demandField: '市场需求强度',
    capacityField: '工厂产能方案',
    capacityLabel: '工厂产能',
    // 参数目录中 factory_capacity_range 无单位，故不再拼接 tU/年
    capacityUnit: '',
    thresholdField: '供应保障能力',
    strategyNetwork: '汽车供应链全网络',
    strategyGlobalScope: '全局汽车供应链',
    reportTitle: '汽车供应链观察分析对比报告',
    reportFileBase: '汽车供应链_观察分析对比报告',
    // 与后端 /causal-graph 的 supply_chain 场景变量命名一致
    interventionVariables: ['产能水平', '库存容量', '订单倍数', '协作频次']
  }
}

/**
 * 场景适配 composable：同步 URL 场景 + 按场景加载实验列表。
 */
export function useSupplyChainScenario() {
  const scenarioStore = useScenarioStore()

  // 从对话首页 / 其它入口带 ?scenario= 跳进来时以 URL 为准
  let route
  try { route = useRoute() } catch { route = null }
  const routeScenario = String(route?.query?.scenario || '').trim()
  if ([SCENARIO_VALUES.URANIUM, SCENARIO_VALUES.SUPPLY_CHAIN].includes(routeScenario)) {
    scenarioStore.setScenario(routeScenario)
  }

  // 从对话的实验闭环跳进来时会带 ?experiment_id=：三阶段分析页据此锁定同一次实验，
  // 而不是各自取「最新一条」——否则观察/干预/机制三页可能看着三份不同的实验。
  const routeExperimentId = computed(() => String(route?.query?.experiment_id || '').trim())

  const isUraniumScene = computed(() => scenarioStore.currentScenario === SCENARIO_VALUES.URANIUM)
  const sceneText = computed(
    () => SCENE_TEXT[scenarioStore.currentScenario] || SCENE_TEXT[SCENARIO_VALUES.URANIUM]
  )

  /**
   * 拉取当前场景的实验列表（可选只保留已完成）。
   * @param {Object} [options]
   * @param {boolean} [options.completedOnly=false]
   * @returns {Promise<Array>} 已按时间倒序排好的实验列表
   */
  const loadScenarioExperiments = async ({ completedOnly = false, preferExperimentId = routeExperimentId.value } = {}) => {
    const payload = await getExperiments()
    let list = filterExperimentsByScenario(unwrapApiData(payload) || [], scenarioStore.currentScenario)
    if (completedOnly) list = list.filter((item) => String(item?.status || '').toLowerCase() === 'completed')
    list = sortExperimentsByRecency(list)
    // 指定了实验 id 且确实存在 → 提到队首，页面原本取 [0] 的逻辑即可命中同一次实验
    const preferred = String(preferExperimentId || '').trim()
    if (preferred) {
      const index = list.findIndex((item) => String(item.experiment_id || item.id || '') === preferred)
      if (index > 0) list = [list[index], ...list.slice(0, index), ...list.slice(index + 1)]
    }
    return list
  }

  return {
    scenarioStore,
    isUraniumScene,
    sceneText,
    routeExperimentId,
    loadScenarioExperiments
  }
}
