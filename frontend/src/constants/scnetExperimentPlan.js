/**
 * 实验闭环「方案」契约：把对话里确认的实验目的 + 干预方案，一路带到反事实实验平台。
 *
 * 闭环链路：
 *   ChatHome(事后复盘出结论)
 *     → ① 确认实验目的(用户可改)
 *     → ② 设计实验方案(勾选干预变量 / 目标指标 / 轮次,候选全部来自后端参数目录)
 *     → 写入 sessionStorage,跳转反事实实验平台(?plan_id=...)
 *     → 平台读取方案、预填参数面板,用户确认后运行实验
 *     → 拿到实验数据 → 观察分析 → 干预分析 → 机制分析
 *
 * 硬约束：方案里的干预变量 key、取值区间、默认值全部取自
 * /SCnet/supplyChain/parameter-catalog（源头是后端 configs/ 下的真实配置），
 * 前端不臆造任何参数，也不给"看起来合理"的假默认值。
 */

import { buildCatalogIndex } from '@/utils/scnetPanelParams'

export const PLAN_STORAGE_PREFIX = 'scnet_experiment_plan:'
/** 方案设计页的「事后方案助手」要延续对话页的上下文:整段对话按 plan 存一份 */
export const PLAN_CHAT_PREFIX = 'scnet_experiment_plan_chat:'
/** 同一段对话再按会话 id 存一份：从侧边栏/平台进方案设计页时只有会话认得出来 */
export const PLAN_CHAT_CONV_PREFIX = 'scnet_experiment_chat:'
const PLAN_CHAT_LIMIT = 40
// 「这份方案已经写进过参数面板」的标记：只在同一标签页内有效，
// 用来区分"还没写过"和"写过又被手动改动"，刷新后不会把后者误报成前者。
export const PLAN_APPLIED_PREFIX = 'scnet_experiment_plan_applied:'
export const PLAN_QUERY_KEY = 'plan_id'
// 对照组口径只此一处：方案设计页与实验目的文案都用它，避免两个页面各写一份
export const PLAN_CONTROL_LABEL = '沿用基线参数（本次不干预，作为对照）'
// 三阶段分析页之间要带上的上下文参数
export const PLAN_CONTEXT_KEYS = Object.freeze([
  'experiment_id', 'plan_id', 'from_chat', 'session_id', 'phase', 'scenario'
])

/**
 * 实验目的文案的唯一出处：由本次研判问题 + 结论首句拼出，用户可在方案设计页改。
 * 对话页与方案设计页共用，保证「重新生成」不会出现两种措辞。
 */
export function composePlanPurpose({ question = '', conclusion = '' } = {}) {
  const clipText = (text, max) => (text && text.length > max ? text.slice(0, max) + '…' : (text || ''))
  const parts = []
  if (question) parts.push('针对本次研判问题「' + clipText(question, 40) + '」')
  if (conclusion) parts.push('结论「' + clipText(conclusion, 60) + '」')
  const head = parts.length ? parts.join('，') + '，' : '针对本次研判结论，'
  return head + '设计反事实实验，验证干预方案对该薄弱环节的改善幅度'
}

/**
 * 反事实实验平台参数面板真正能消费的干预变量。
 * 依据：CounterfactualExperiment.buildCounterfactualParamOverrides() 只把
 * order_multiplier / factory_capacity_range(拆 min+max) / reproduction_threshold /
 * adjustment_ratio 写进 param_overrides 提交后端，collaboration_radius 走 agent_node_configs。
 * 「观测轮次」由方案里的 rounds 单独承载（simulation_steps 只用来取默认轮次），
 * 不在这里当作可勾选的干预变量，避免同一件事出现两个入口。
 * 目录里其余参数（如 size_mean、macro_*）平台面板没有对应输入框，方案里只作记录、不写入。
 */
export const PLATFORM_LEVER_TARGETS = Object.freeze({
  order_multiplier: ['order_multiplier'],
  factory_capacity_range: ['factory_capacity_min', 'factory_capacity_max'],
  reproduction_threshold: ['reproduction_threshold'],
  collaboration_radius: ['collaboration_radius'],
  adjustment_ratio: ['adjustment_ratio']
})

/** 干预变量是否能在平台参数面板落地 */
export const isMappableLever = (key) => Object.prototype.hasOwnProperty.call(PLATFORM_LEVER_TARGETS, key)

export function newExperimentPlanId() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  const salt = Math.random().toString(36).slice(2, 6)
  return `plan_${stamp}_${salt}`
}

/** 解析目录里的区间文本：'0.7-1.3' / '[250, 400]' → [lo, hi]；解析不出返回 null */
export function parseRangeText(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return null
  const bracket = raw.match(/^\[?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]?$/)
  if (bracket) return [Number(bracket[1]), Number(bracket[2])]
  const dash = raw.match(/^(-?\d+(?:\.\d+)?)\s*[-~至]\s*(-?\d+(?:\.\d+)?)$/)
  if (dash) return [Number(dash[1]), Number(dash[2])]
  return null
}

/**
 * 观察分析「指标分布」真正消费的口径（与 ExpAnalysis_Observe 的 DIST_METRIC_OPTIONS 对齐）。
 * 方案设计页勾选的「目标指标」按 key / 别名 / 名称匹配到这里，落到分析页的分布口径。
 */
export const OBSERVE_METRIC_DEFS = Object.freeze([
  { key: 'completion_rate', label: '订单完成率', aliases: ['order_completion_rate', 'completion_rate', 'completionRate', '订单完成率', '完成率'] },
  { key: 'total_profit', label: '系统总利润', aliases: ['net_profit', 'total_profit', 'totalNetProfit', '系统总利润', '总利润', '净利润'] },
  { key: 'network_density', label: '网络密度', aliases: ['network_density', '网络密度'] },
  { key: 'enterprise_count', label: '企业数量', aliases: ['enterprise_count', 'factory_count', '企业数量', '工厂数量'] },
  { key: 'network_stability', label: '网络稳定性', aliases: ['network_stability', 'robustness', 'avgRobustness', '网络稳定性', '韧性指数', '韧性'] },
  { key: 'production_capacity_est', label: '产能估算', aliases: ['production_capacity_est', 'capacity', '产能估算', '产能'] }
])

const normalizeMetricToken = (text) => String(text ?? '')
  .toLowerCase()
  .replace(/[\s_\-()（）[\]【】/／·.,，、:：'"“”]/g, '')

/** 目录观测指标（或方案里的指标）→ 观察分析口径 key；匹配不到返回 '' */
export function resolveObserveMetricKey(metric) {
  if (!metric) return ''
  const tokens = [metric.key, metric.label, metric.name, metric.displayName]
    .filter(Boolean)
    .map(normalizeMetricToken)
  if (!tokens.length) return ''
  const hit = OBSERVE_METRIC_DEFS.find((def) => {
    const candidates = [def.key, def.label, ...(def.aliases || [])].map(normalizeMetricToken)
    return tokens.some((token) => candidates.includes(token))
  })
  return hit ? hit.key : ''
}

/** 一份实验方案里的「目标指标」→ 观察分析口径 key 列表（去重、忽略匹配不上的） */
export function resolvePlanObserveMetricKeys(plan) {
  const metrics = Array.isArray(plan?.metrics) ? plan.metrics : []
  const keys = []
  metrics.forEach((metric) => {
    const key = metric?.analysisKey || resolveObserveMetricKey(metric)
    if (key && !keys.includes(key)) keys.push(key)
  })
  return keys
}

/**
 * 三套分析方案（观察 / 干预 / 机制）的口径。
 * 「实验组设计」步骤按这三套方案分别配置实验组，与三阶段分析页一一对应：
 *   观察分析 → 比较平行世界；干预分析 → 识别影响因素；机制分析 → 追踪微观到宏观。
 */
export const ANALYSIS_PLAN_TYPES = Object.freeze([
  {
    key: 'observe', code: 'OBS', label: '观察分析方案', short: '观察分析', tabDesc: '比较平行世界',
    coreQuestion: '哪条世界线表现更好，为什么？',
    intent: '围绕关键决策点建立平行世界，只改变决策内容或时机，观察风险分布与演化的差异。',
    method: '随机对照实验（RCT）',
    methodOptions: ['随机对照实验（RCT）', '配对时序对照', '平行世界对照'],
    groupMethod: '配对时序对照',
    principles: ['F-00 作为统一对照组', '共用随机种子以隔离干预效应', '同时观察即时效应与滞后效应'],
    answer: '识别最优世界线及其成因',
    outputs: ['风险概率分布图', '敏感度分析', '多因素风险演化曲线', '平行世界时序对比']
  },
  {
    key: 'intervention', code: 'INT', label: '干预分析方案', short: '干预分析', tabDesc: '识别关键影响因素',
    coreQuestion: '哪些潜在因素影响最终效果？',
    intent: '在其它条件不变的前提下逐个改变候选因素，量化它们与安全、效率等响应变量之间的关系。',
    method: '一次一因子法（OFAT）',
    methodOptions: ['一次一因子法（OFAT）', '因子设计（全因子/部分因子）', '响应面法'],
    groupMethod: '一次一因子',
    principles: ['按确认后的候选因素生成水平', '区分主效应与交互效应', '保留置信区间和稳健性检验'],
    answer: '解释哪些因素可能改变最终效果',
    outputs: ['因子主效应与交互效应', '敏感度分析', '结构方程模型（SEM）', '影响路径分解']
  },
  {
    key: 'mechanism', code: 'MEC', label: '机制分析方案', short: '机制分析', tabDesc: '追踪微观到宏观',
    coreQuestion: '微观行为如何级联为宏观现象？',
    intent: '控制或消融微观行为链中的关键环节，追踪局部扰动、群体响应、瓶颈反馈到宏观风险的涌现过程。',
    method: '机制消融实验',
    methodOptions: ['机制消融实验', '中介路径隔离', '纵向因果追踪'],
    groupMethod: '微观规则消融',
    principles: ['隔离微观行为或中介环节', '追踪级联阈值和反馈回路', '验证机制的适用边界与替代解释'],
    answer: '还原风险涌现机制并沉淀通用对策',
    outputs: ['微观—宏观纵向因果图', '级联效应与关键阈值', '增强／平衡反馈回路', '通用应对思路与对策']
  }
])

/** 三套方案共用的固定条件：所有实验组只相对 F-00 改变一个因素 */
export const ANALYSIS_FIXED_CONDITIONS = '固定同一事件、空间拓扑、干预前状态和随机种子；所有实验组只记录相对 F-00 的变化。'

/** 分析方案 key 与三阶段分析页 stage 一一对应（显式列出，便于以后改名时不漏改） */
export const ANALYSIS_TYPE_BY_STAGE = Object.freeze({ observe: 'observe', intervention: 'intervention', mechanism: 'mechanism' })

const formatPlanValue = (value) => {
  if (Array.isArray(value)) return value.join(' ~ ')
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}
const padGroupIndex = (n) => String(n).padStart(2, '0')

/**
 * 由方案已选的干预变量 / 目标指标，生成三套分析方案的默认实验组（可编辑）。
 * 每个实验组只相对 F-00 改变一个因素，保持"唯一变化"的可归因性。
 */
export function buildDefaultAnalysisPlans(plan) {
  const levers = Array.isArray(plan?.levers) ? plan.levers : []
  const metricLabels = (Array.isArray(plan?.metrics) ? plan.metrics : []).map((item) => item && (item.label || item.key)).filter(Boolean)
  const metricText = metricLabels.length ? metricLabels.join('、') : '目标指标'
  const control = 'F-00'
  const levelText = (lever) => {
    const value = formatPlanValue(lever.value)
    return value ? `基线 → ${value}` : '基线 / 干预后'
  }
  const observe = levers.map((lever, index) => ({
    id: `OBS-${padGroupIndex(index + 1)}`,
    name: `改变「${lever.label}」的世界线`,
    factor: lever.label,
    levels: levelText(lever),
    hypothesis: `仅改变${lever.label}时，${metricText}相对 F-00 出现可分辨差异。`,
    control,
    method: '配对时序对照'
  }))
  const intervention = levers.map((lever, index) => ({
    id: `INT-${padGroupIndex(index + 1)}`,
    name: `${lever.label}单因子组`,
    factor: lever.label,
    levels: levelText(lever),
    hypothesis: `${lever.label}对${metricText}存在主效应，需与交互效应区分。`,
    control,
    method: '一次一因子'
  }))
  const mechanism = levers.map((lever, index) => ({
    id: `MEC-${padGroupIndex(index + 1)}`,
    name: `${lever.label}消融组`,
    factor: lever.label,
    levels: `关闭 ${lever.label} / 恢复 ${lever.label}`,
    hypothesis: `阻断${lever.label}会改变${metricText}的级联路径与关键阈值。`,
    control,
    method: '微观规则消融'
  }))
  if (intervention.length >= 2) {
    const names = levers.map((lever) => lever.label)
    intervention.push({
      id: `INT-${padGroupIndex(intervention.length + 1)}`,
      name: `${names.slice(0, 2).join(' × ')}组合组`,
      factor: names.slice(0, 2).join(' × '),
      levels: '低 / 中 / 高组合',
      hypothesis: `两个因素同时改变时存在交互效应，不等于单因子主效应之和。`,
      control,
      method: '因子设计'
    })
  }
  if (mechanism.length) {
    mechanism.push({
      id: `MEC-${padGroupIndex(mechanism.length + 1)}`,
      name: '级联阈值检验组',
      factor: levers[0].label,
      levels: '阈值上 / 下相邻取值',
      hypothesis: '存在一个级联阈值，越过它后宏观结果发生非线性跃迁。',
      control,
      method: '纵向因果追踪'
    })
  }
  // 未选变量时也给一组基线复现，保证"实验组设计"不是空面板
  if (!observe.length) observe.push({
    id: 'OBS-01', name: '基线复现世界线', factor: '无干预（基线）', levels: 'F-00 原样复现',
    hypothesis: '先确认 F-00 的可复现性，再评估其它世界线的差异。', control, method: '配对时序对照'
  })
  if (!intervention.length) intervention.push({
    id: 'INT-01', name: '候选因素待定组', factor: '待选择干预变量', levels: '—',
    hypothesis: '先在「目标与变量设计」勾选干预变量，再生成单因子组。', control, method: '一次一因子'
  })
  if (!mechanism.length) mechanism.push({
    id: 'MEC-01', name: '候选机制待定组', factor: '待选择干预变量', levels: '—',
    hypothesis: '先在「目标与变量设计」勾选干预变量，再生成消融组。', control, method: '微观规则消融'
  })
  return {
    observe: { method: '随机对照实验（RCT）', groups: observe },
    intervention: { method: '一次一因子法（OFAT）', groups: intervention },
    mechanism: { method: '机制消融实验', groups: mechanism }
  }
}

/** 读方案里的分析方案；缺失/为空时用默认组补齐，已编辑内容不覆盖 */
export function resolveAnalysisPlans(plan) {
  const stored = plan && typeof plan.analysisPlans === 'object' && plan.analysisPlans ? plan.analysisPlans : null
  const defaults = buildDefaultAnalysisPlans(plan)
  const result = {}
  ANALYSIS_PLAN_TYPES.forEach((type) => {
    const saved = stored && stored[type.key]
    result[type.key] = {
      method: (saved && saved.method) || defaults[type.key].method,
      groups: Array.isArray(saved && saved.groups) && saved.groups.length ? saved.groups : defaults[type.key].groups
    }
  })
  return result
}

/** 某个分析方案已配置的实验组数量 */
export function analysisPlanGroupCount(analysisPlans, typeKey) {
  const groups = analysisPlans && analysisPlans[typeKey] && analysisPlans[typeKey].groups
  return Array.isArray(groups) ? groups.length : 0
}

/**
 * 目录参数 → 干预变量候选。
 * 候选来自两处，保证「目录里能勾的」与「面板里能写的」不会再各说各话：
 *   1) exp_params.params（目录声明的实验参数，含取值范围/默认值）；
 *   2) 目录索引里属于 PLATFORM_LEVER_TARGETS 的变量（可能挂在 agent/system 分组下，
 *      平台面板能渲染却没有出现在 exp_params，只按 1) 出候选会让它从方案里消失）。
 * 其余（面板没有对应输入框的）标为不可落地，只作记录。
 */
export function buildLeverOptions(catalog) {
  const params = catalog?.exp_params?.params
  const seen = new Set()
  const options = []
  const push = (option) => {
    if (!option || !option.key || seen.has(option.key)) return
    seen.add(option.key)
    options.push(option)
  }
  if (Array.isArray(params)) {
    params
      .filter((item) => item && item.key && item.key !== 'simulation_steps')
      .forEach((item) => {
        const range = parseRangeText(item.range)
        const def = parseRangeText(item.default)
        push({
          key: item.key,
          label: item.name || item.key,
          description: item.description || '',
          source: item.source || '',
          range,
          rangeText: item.range || '',
          defaultValue: def || (Number.isFinite(Number(item.default)) ? Number(item.default) : null),
          mappable: isMappableLever(item.key)
        })
      })
  }
  const index = buildCatalogIndex(catalog)
  Object.keys(PLATFORM_LEVER_TARGETS).forEach((key) => {
    if (seen.has(key)) return
    const spec = index.get(key)
    if (!spec) return
    const parsedDefault = parseRangeText(spec.default)
    const defaultValue = parsedDefault
      || (spec.default !== null && spec.default !== undefined && Number.isFinite(Number(spec.default)) ? Number(spec.default) : null)
    const range = Number.isFinite(spec.min) && Number.isFinite(spec.max) ? [spec.min, spec.max] : null
    push({
      key,
      label: spec.label || key,
      description: spec.description || '',
      source: spec.source || '',
      range,
      rangeText: range ? `${range[0]} ~ ${range[1]}` : '',
      defaultValue,
      mappable: isMappableLever(key)
    })
  })
  return options
}

/** 目录观测指标 → 目标指标候选；analysisKey 是它在观察分析里对应的分布口径（可能为空） */
export function buildMetricOptions(catalog) {
  const metrics = catalog?.observer_metrics
  if (!Array.isArray(metrics)) return []
  return metrics
    .filter((item) => item && item.key)
    .map((item) => ({
      key: item.key,
      label: item.name || item.key,
      description: item.description || '',
      sourcePath: item.source_path || '',
      analysisKey: resolveObserveMetricKey(item)
    }))
}

/**
 * 把一个干预变量换算成平台参数面板上的写入动作。
 * @returns {Array<{key:string, value:number|number[]}>} 空数组表示该变量无法落地
 */
export function resolveLeverWrites(lever) {
  const targets = PLATFORM_LEVER_TARGETS[lever?.key]
  if (!targets) return []
  const value = lever.value
  if (lever.key === 'factory_capacity_range') {
    const range = Array.isArray(value) ? value : parseRangeText(value)
    if (!range || range.length < 2) return []
    const lo = Number(range[0])
    const hi = Number(range[1])
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return []
    return [
      { key: 'factory_capacity_min', value: Math.min(lo, hi) },
      { key: 'factory_capacity_max', value: Math.max(lo, hi) }
    ]
  }
  // 空值不能被 Number(null)=0 吞成"写 0"：没填就是没填，返回空表示落不了地
  if (value === null || value === undefined || String(value).trim() === '') return []
  const num = Number(value)
  if (!Number.isFinite(num)) return []
  return [{ key: targets[0], value: num }]
}

export function saveExperimentPlan(plan) {
  if (!plan || !plan.id) return false
  try {
    window.sessionStorage.setItem(PLAN_STORAGE_PREFIX + plan.id, JSON.stringify(plan))
    return true
  } catch (e) {
    console.warn('实验方案写入 sessionStorage 失败:', e && e.message)
    return false
  }
}

export function readExperimentPlan(planId) {
  const id = String(planId || '').trim()
  if (!id) return null
  try {
    const raw = window.sessionStorage.getItem(PLAN_STORAGE_PREFIX + id)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.warn('实验方案读取失败:', e && e.message)
    return null
  }
}

export function clearExperimentPlan(planId) {
  const id = String(planId || '').trim()
  if (!id) return
  try {
    window.sessionStorage.removeItem(PLAN_STORAGE_PREFIX + id)
    window.sessionStorage.removeItem(PLAN_APPLIED_PREFIX + id)
  } catch { /* 清理失败不影响主流程 */ }
}

/**
 * 取最近一次保存的方案。
 * 用途：从侧边栏直接进方案设计页、或对话草稿没带 plan_id 时的兜底，
 * 让用户重新打开页面还能接着改上一次的方案。
 * 传 scenario 时只认本场景的方案 —— 否则在铀场景打开会捞到上一份汽车方案，
 * 目的与干预变量都跨场景串味。
 */
export function readLatestExperimentPlan(scenario = '') {
  const wanted = String(scenario || '').trim()
  try {
    const storage = window.sessionStorage
    let latest = null
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key || !key.startsWith(PLAN_STORAGE_PREFIX)) continue
      if (key.startsWith(PLAN_APPLIED_PREFIX)) continue
      const plan = readExperimentPlan(key.slice(PLAN_STORAGE_PREFIX.length))
      if (!plan || !plan.id) continue
      if (wanted && String(plan.scenario || '') !== wanted) continue
      const stamp = String(plan.updatedAt || plan.createdAt || '')
      const latestStamp = latest ? String(latest.updatedAt || latest.createdAt || '') : ''
      if (!latest || stamp > latestStamp) latest = plan
    }
    return latest
  } catch {
    return null
  }
}

/**
 * 保存对话页最近的往返消息，供方案设计页的「事后方案助手」续上上下文。
 * 只留 role / content / goalBrief 三个字段，其余（流式占位、失败标记）不进方案页。
 * 同一份内容按方案 id 与会话 id 各存一份：从对话跳进来认方案，从侧边栏 /
 * 平台跳进来时方案还是同一份，但只有会话能认出这段对话。
 */
const normalizeTranscript = (items) => (Array.isArray(items) ? items : [])
  .filter((item) => item && (item.content || item.goalBrief))
  .slice(-PLAN_CHAT_LIMIT)
  .map((item) => ({
    role: item.role === 'user' ? 'user' : 'assistant',
    content: String(item.content || ''),
    goalBrief: item.goalBrief || null
  }))

const writeTranscript = (key, items) => {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(normalizeTranscript(items)))
    return true
  } catch {
    return false
  }
}

const readTranscript = (key) => {
  try {
    const raw = window.sessionStorage.getItem(key)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function savePlanTranscript(planId, items) {
  const id = String(planId || '').trim()
  if (!id) return false
  return writeTranscript(PLAN_CHAT_PREFIX + id, items)
}

export function readPlanTranscript(planId) {
  const id = String(planId || '').trim()
  if (!id) return []
  return readTranscript(PLAN_CHAT_PREFIX + id)
}

export function saveConversationTranscript(conversationId, items) {
  const id = String(conversationId || '').trim()
  if (!id) return false
  return writeTranscript(PLAN_CHAT_CONV_PREFIX + id, items)
}

export function readConversationTranscript(conversationId) {
  const id = String(conversationId || '').trim()
  if (!id) return []
  return readTranscript(PLAN_CHAT_CONV_PREFIX + id)
}

/** 记录「该方案已写入过参数面板」 */
export function markExperimentPlanApplied(planId) {
  const id = String(planId || '').trim()
  if (!id) return
  try {
    window.sessionStorage.setItem(PLAN_APPLIED_PREFIX + id, '1')
  } catch { /* 标记写不进去不影响主流程 */ }
}

/** 该方案是否在本标签页写入过参数面板 */
export function isExperimentPlanApplied(planId) {
  const id = String(planId || '').trim()
  if (!id) return false
  try {
    return window.sessionStorage.getItem(PLAN_APPLIED_PREFIX + id) === '1'
  } catch {
    return false
  }
}

/** 方案摘要：给 UI 用的一行文字 */
export function describePlanLevers(plan) {
  const levers = Array.isArray(plan?.levers) ? plan.levers : []
  if (!levers.length) return '未指定干预变量（按基线参数运行）'
  return levers
    .map((lever) => {
      const label = lever.label || lever.key
      const value = Array.isArray(lever.value) ? lever.value.join(' ~ ') : lever.value
      return `${label}=${value}`
    })
    .join('，')
}
