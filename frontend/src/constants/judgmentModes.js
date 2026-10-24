/**
 * 态势研判三种研判视角(子标签)的统一定义与数据适配。
 *
 * 三个视角共用同一套世界地图、供应链路线、右侧风险分析面板与详情分析区域,
 * 只切换「数据、风险颜色、风险等级、数值、结论、分析过程与数据来源标识」。
 *
 * 数据诚实性约束(与后端 llm_judgment_service 一致):
 *   1. 大模型视角只呈现大模型真实产出(artifact.result.llm,status='completed');
 *      没有产出时显示"暂无大模型研判结果",绝不用态势模型分数顶替。
 *   2. 大模型不给风险分数,只给定性等级;大模型视角下所有数值位显示"—"。
 *   3. 态势模型视角沿用真实快照数值,不做任何削弱或替换。
 *   4. 双驱动视角的地图颜色对应实际工具调用产生的态势模型快照；
 *      独立双驱动结论取自 artifact.result.dual,不能由两条基线临时拼接。
 */

/** 允许的视角 key,顺序即标签顺序 */
export const JUDGMENT_MODES = Object.freeze(['llm', 'domain', 'dual'])

/** 视角元信息:标签名、数据来源标识、主题色 */
export const JUDGMENT_MODE_META = Object.freeze({
  llm: {
    key: 'llm',
    label: '大模型研判',
    shortLabel: '大模型',
    // 页面必须明确标注的数据来源
    sourceLabel: '数据来源：大模型研判',
    sourceShort: '大模型研判',
    method: 'OSINT 情报 + 知识库 + 本次研判问题 → 大模型理解层结论',
    accent: '#7C3AED',
    accentSoft: 'rgba(124,58,237,0.10)',
    emptyText: '暂无大模型研判结果',
  },
  domain: {
    key: 'domain',
    label: '态势模型研判',
    shortLabel: '态势模型',
    sourceLabel: '数据来源：态势模型 / 复杂网络模型',
    sourceShort: '态势模型',
    method: '结构化 OSINT 事件 → 网络风险传导 → 节点/边/路线风险数值',
    accent: '#2563EB',
    accentSoft: 'rgba(37,99,235,0.10)',
    emptyText: '暂无态势模型研判结果',
  },
  dual: {
    key: 'dual',
    label: '双驱动研判',
    shortLabel: '双驱动',
    sourceLabel: '数据来源：双驱动研判（大模型调用态势模型）',
    sourceShort: '双驱动研判 · 地图着色来自态势模型',
    method: 'OSINT 与用户问题 → 大模型发起态势模型调用 → 读取真实计算结果 → 形成独立双驱动结论',
    accent: '#0EA5E9',
    accentSoft: 'rgba(14,165,233,0.10)',
    emptyText: '暂无双驱动研判结果',
  },
})

/** 'unknown' = 该视角没有对这条路线给出等级,只能标"未研判",不能借别的等级顶上 */
export const UNKNOWN_LEVEL = 'unknown'

export function modeMeta(mode) {
  return JUDGMENT_MODE_META[mode] || JUDGMENT_MODE_META.dual
}

/** 大模型研判是否产出了可用结论 */
export function isLlmAvailable(llm) {
  // v1 的提示词读入过态势模型风险分数,不能作为独立大模型研判展示。
  return Boolean(llm && llm.status === 'completed' && llm.prompt_version === 'llm_judgment_v2'
    && (llm.conclusion || (llm.key_routes || []).length))
}

/** 大模型是否明确跑过但没跑出结果(与"根本没跑"区分,文案不同) */
export function isLlmUnavailable(llm) {
  return Boolean(llm && llm.status === 'unavailable')
}

/**
 * 大模型给出的路线等级表:route_id → 'high' | 'medium' | 'low'
 * 大模型没有提到的路线不会出现在这张表里 —— 缺失就是缺失。
 */
export function llmRouteLevelMap(llm) {
  const map = {}
  if (!isLlmAvailable(llm)) return map
  for (const item of llm.key_routes || []) {
    if (item && item.route_id) map[item.route_id] = item.llm_risk_level || 'medium'
  }
  return map
}

/** 大模型给出的路线判断理由:route_id → reason */
export function llmRouteReasonMap(llm) {
  const map = {}
  if (!isLlmAvailable(llm)) return map
  for (const item of llm.key_routes || []) {
    if (item && item.route_id) map[item.route_id] = item.reason || ''
  }
  return map
}

/** 大模型识别出的重点国家 */
export function llmKeyCountries(llm) {
  if (!isLlmAvailable(llm)) return []
  return (llm.key_countries || []).filter((c) => c && c.country)
}

/** 大模型识别出的影响范围(节点名集合) */
export function llmImpactNodeSet(llm) {
  const set = new Set()
  if (!isLlmAvailable(llm)) return set
  for (const name of (llm.impact_scope || {}).node_names || []) set.add(name)
  for (const path of llm.impact_paths || []) {
    if (path.from) set.add(path.from)
    if (path.to) set.add(path.to)
    for (const name of path.via || []) set.add(name)
  }
  return set
}

/** 大模型识别出的影响范围(路线 ID 集合) */
export function llmImpactRouteSet(llm) {
  const set = new Set()
  if (!isLlmAvailable(llm)) return set
  for (const id of (llm.impact_scope || {}).route_ids || []) set.add(id)
  for (const item of llm.key_routes || []) if (item && item.route_id) set.add(item.route_id)
  for (const path of llm.impact_paths || []) if (path && path.route_id) set.add(path.route_id)
  return set
}

const LEVEL_RANK = { high: 3, medium: 2, low: 1, [UNKNOWN_LEVEL]: 0 }

export function levelRank(level) {
  return LEVEL_RANK[level] || 0
}

/**
 * 一致性判定:大模型定性等级 vs 态势模型数值等级。
 *   consistent 一致   —— 等级相同
 *   partial    部分一致 —— 相差一级
 *   divergent  存在分歧 —— 相差两级
 *   unknown    无法比对 —— 任一方缺失
 */
export function judgeAgreement(domainLevel, llmLevel) {
  if (!domainLevel || !llmLevel || domainLevel === UNKNOWN_LEVEL || llmLevel === UNKNOWN_LEVEL) {
    return 'unknown'
  }
  const diff = Math.abs(levelRank(domainLevel) - levelRank(llmLevel))
  if (diff === 0) return 'consistent'
  if (diff === 1) return 'partial'
  return 'divergent'
}

export const AGREEMENT_TEXT = Object.freeze({
  consistent: '一致',
  partial: '部分一致',
  divergent: '存在分歧',
  unknown: '无法比对',
})

export function agreementText(value) {
  return AGREEMENT_TEXT[value] || '无法比对'
}

/**
 * 三个视角的图例/来源说明:让用户一眼看出当前标签展示的不是同一份结果。
 * 返回 { level, text } 数组,level 为 'high' | 'medium' | 'low' | UNKNOWN_LEVEL。
 */
export function modeLegend(mode) {
  if (mode === 'llm') {
    return [
      { level: 'high', text: '大模型判定高风险' },
      { level: 'medium', text: '大模型判定中风险' },
      { level: 'low', text: '大模型判定低风险' },
      { level: UNKNOWN_LEVEL, text: '大模型未研判' },
    ]
  }
  if (mode === 'dual') {
    return [
      { level: 'high', text: '综合高风险' },
      { level: 'medium', text: '综合中风险' },
      { level: 'low', text: '综合低风险' },
      { level: UNKNOWN_LEVEL, text: '无法比对' },
    ]
  }
  return [
    { level: 'low', text: '低风险' },
    { level: 'medium', text: '中风险' },
    { level: 'high', text: '高风险' },
    { level: UNKNOWN_LEVEL, text: '未计算' },
  ]
}
