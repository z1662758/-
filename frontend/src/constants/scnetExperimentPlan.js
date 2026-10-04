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

export const PLAN_STORAGE_PREFIX = 'scnet_experiment_plan:'
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
 * adjustment_ratio 写进 param_overrides 提交后端，collaboration_radius 走
 * agent_node_configs，simulation_steps 决定提交的 iterations。
 * 目录里其余参数（如 size_mean、macro_*）平台面板没有对应输入框，方案里只作记录、不写入。
 */
export const PLATFORM_LEVER_TARGETS = Object.freeze({
  order_multiplier: ['order_multiplier'],
  factory_capacity_range: ['factory_capacity_min', 'factory_capacity_max'],
  reproduction_threshold: ['reproduction_threshold'],
  collaboration_radius: ['collaboration_radius'],
  adjustment_ratio: ['adjustment_ratio'],
  simulation_steps: ['iterations']
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

/** 目录参数 → 干预变量候选（只保留平台能落地的 key，其余标记为不可落地） */
export function buildLeverOptions(catalog) {
  const params = catalog?.exp_params?.params
  if (!Array.isArray(params)) return []
  const seen = new Set()
  return params
    // simulation_steps 是"观测轮次",由方案单独承载,不作为干预变量候选
    .filter((item) => item && item.key && item.key !== 'simulation_steps' && !seen.has(item.key) && seen.add(item.key))
    .map((item) => {
      const range = parseRangeText(item.range)
      const def = parseRangeText(item.default)
      return {
        key: item.key,
        label: item.name || item.key,
        description: item.description || '',
        source: item.source || '',
        range,
        rangeText: item.range || '',
        defaultValue: def || (Number.isFinite(Number(item.default)) ? Number(item.default) : null),
        mappable: isMappableLever(item.key)
      }
    })
}

/** 目录观测指标 → 目标指标候选 */
export function buildMetricOptions(catalog) {
  const metrics = catalog?.observer_metrics
  if (!Array.isArray(metrics)) return []
  return metrics
    .filter((item) => item && item.key)
    .map((item) => ({
      key: item.key,
      label: item.name || item.key,
      description: item.description || '',
      sourcePath: item.source_path || ''
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
    const lo = Math.min(range[0], range[1])
    const hi = Math.max(range[0], range[1])
    return [
      { key: 'factory_capacity_min', value: lo },
      { key: 'factory_capacity_max', value: hi }
    ]
  }
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
