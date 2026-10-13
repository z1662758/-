/**
 * 反事实「成对世界」领域模型（P1）
 *
 * 依据：薛霄, 于湘凝, 周德雨, 等. 计算实验方法的溯源、现状与展望.
 * 自动化学报, 2023, 49(2): 246−271.
 *
 * 论文把计算实验的本质概括为「把反事实算法化」，并强调反事实推演面对的是
 * 「多重世界」：事实世界（已发生的基线）与反事实世界（施加 do(X) 之后）必须
 * 共享同一基座（随机种子、初始条件、观测轮次、参数目录），唯一变量是干预本身，
 * 两个世界的差异才能归因于干预，而不是仿真噪声。
 *
 * 本模块只放纯函数与领域常量，不依赖 Vue 与任何 API，便于单测。
 */

export const WORLD_KINDS = {
  FACTUAL: 'factual',
  COUNTERFACTUAL: 'counterfactual'
}

export const WORLD_KIND_LABELS = {
  [WORLD_KINDS.FACTUAL]: '事实世界（基线）',
  [WORLD_KINDS.COUNTERFACTUAL]: '反事实世界（干预后）'
}

/** 生成一个可见、可复用的随机种子（非负整数）。 */
export const createRunSeed = () => Math.floor(Math.random() * 0x7fffffff)

/** 把任意输入规整为合法种子；非法时返回 null，由调用方决定回退策略。 */
export const normalizeSeed = (value) => {
  if (value === null || value === undefined || value === '') return null
  const seed = Number(value)
  if (!Number.isFinite(seed)) return null
  const int = Math.floor(seed)
  return int >= 0 ? int : null
}

/**
 * 种子受控状态。
 *
 * 只有后端回执（记录里能读到同一个 seed），才能说「同种子」真的生效；
 * 读不到就如实标「未验证」，不假装可信 —— 这正是论文对计算实验置信度的要求。
 */
export const describeSeedControl = (seedEchoed) => {
  if (seedEchoed === true) {
    return { controlled: true, label: '种子受控（后端已回执）' }
  }
  if (seedEchoed === false) {
    return { controlled: false, label: '种子未受控（后端未回执，差异可能混入仿真噪声）' }
  }
  return { controlled: null, label: '种子已提交，待后端回执确认' }
}

/** 建一对世界槽位：两槽共享同一 seed 与 baseExperimentId。 */
/**
 * 一个世界的一次运行（一个区组）。第 i 次重复时，事实世界与反事实世界
 * 共用同一个 seed，配对比较差值才可归因于干预。
 */
export const createWorldRun = (seed) => ({
  seed,
  taskId: '',
  status: '',
  experimentId: '',
  result: null,
  error: ''
})

export const buildWorldPair = ({ seed, baseExperimentId = '' }) => ({
  seed,
  baseExperimentId,
  // null = 未知；true/false = 后端是否回执了同一个 seed
  seedEchoed: null,
  [WORLD_KINDS.FACTUAL]: {
    kind: WORLD_KINDS.FACTUAL,
    label: WORLD_KIND_LABELS[WORLD_KINDS.FACTUAL],
    taskId: '',
    status: '',
    experimentId: '',
    result: null,
    error: '',
    runs: [],
    distribution: null,
    completedCount: 0,
    failedCount: 0
  },
  [WORLD_KINDS.COUNTERFACTUAL]: {
    kind: WORLD_KINDS.COUNTERFACTUAL,
    label: WORLD_KIND_LABELS[WORLD_KINDS.COUNTERFACTUAL],
    taskId: '',
    status: '',
    experimentId: '',
    result: null,
    error: '',
    runs: [],
    distribution: null,
    completedCount: 0,
    failedCount: 0
  }
})

/**
 * 干预差异：逐项比对「事实世界参数」与「反事实世界参数」，只保留真正被改动的因子。
 * 这份清单就是本次反事实的自变量，界面上要显式展示。
 */
export const diffParamOverrides = (baseline = {}, intervention = {}) => {
  const keys = new Set([...Object.keys(baseline || {}), ...Object.keys(intervention || {})])
  const diff = []
  keys.forEach((key) => {
    const from = baseline?.[key]
    const to = intervention?.[key]
    if (JSON.stringify(from ?? null) === JSON.stringify(to ?? null)) return
    diff.push({ key, from: from ?? null, to: to ?? null })
  })
  return diff
}

/** 从实验详情里读后端回执的种子（兼容几种常见字段名）。 */
export const readSeedEcho = (detail = {}) => {
  const candidates = [
    detail?.seed,
    detail?.random_seed,
    detail?.randomSeed,
    detail?.parameters?.seed,
    detail?.config?.seed
  ]
  const found = candidates.find((value) => value !== undefined && value !== null && value !== '')
  if (found === undefined) return null
  return normalizeSeed(found)
}
