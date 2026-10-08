/**
 * 开源情报事件的展示辅助。
 *
 * 前端只负责把后端已经标准化的字段翻译成界面文案;
 * 不在这里推断数据、也不拼接来源链接。
 */

/** 来源类型 → 用户可读标签(不暴露知识库内部字段) */
export const SOURCE_TYPE_LABELS = Object.freeze({
  current_retrieval: '本次筛选命中',
  knowledge_base: '知识库已有',
  historical: '历史参考',
  imported: '用户导入',
})

export const SOURCE_TYPE_TONE = Object.freeze({
  current_retrieval: 'is-current',
  knowledge_base: 'is-kb',
  historical: 'is-history',
  imported: 'is-imported',
})

/** 事件状态(后端已翻译,这里只做兜底) */
const STATUS_FALLBACK = {
  ACTIVE: '进行中',
  ONGOING: '持续中',
  REPORTED: '已报道',
  RECOVERED: '已恢复',
  RESOLVED: '已解除',
}

export function statusLabel(event) {
  return event?.statusLabel || STATUS_FALLBACK[event?.status] || '未知'
}

/** 定位精度 → 说明;unresolved 明确提示无法定位 */
export function locationText(event) {
  const loc = event?.location || {}
  if (!loc.name) return '未标注位置'
  return loc.name
}

export function locationPrecisionHint(event) {
  const precision = event?.location?.precision
  if (precision === 'country') return '国家级位置（按国家中心点标注）'
  if (precision === 'region') return '地区级位置（按供应链节点标注）'
  if (precision === 'city') return '城市级位置'
  if (precision === 'exact') return '精确位置'
  return '该事件暂时无法精确定位'
}

export function hasCoordinates(event) {
  const loc = event?.location || {}
  return typeof loc.latitude === 'number' && typeof loc.longitude === 'number'
}

/** 风险等级 → 展示色(与现有风险语义一致:红/橙/绿,已解除为灰) */
export function riskColor(event) {
  if (!event?.riskAssessment?.isEffective) return '#94a3b8'
  if (event.severity === 'high') return '#ef4444'
  if (event.severity === 'medium') return '#f59e0b'
  return '#10b981'
}

export function riskLevelChar(event) {
  if (!event?.riskAssessment?.isEffective) return '低'
  return { high: '高', medium: '中', low: '低' }[event.severity] || '低'
}

export function formatDate(value) {
  if (!value) return '—'
  const text = String(value).replace('T', ' ').replace('Z', '')
  return text.length > 16 ? text.slice(0, 16) : text
}

/** 与本次问题的关联说明;没有命中词时给出中性说明,不编造理由 */
export function relevanceText(event) {
  const reason = event?.relevance?.reason
  if (reason) return reason
  // 用户导入件本来就不参与相关性判定,不能说成"未命中关键词"
  if (event?.sourceType === 'imported') return '用户在数据治理中导入的数据，未参与本次相关性判定'
  return '未命中本次研判问题的关键词，仅作为背景参考'
}

export function sourceTypeLabel(event) {
  return SOURCE_TYPE_LABELS[event?.sourceType] || '知识库已有'
}

export function sourceTypeTone(event) {
  return SOURCE_TYPE_TONE[event?.sourceType] || 'is-kb'
}

/** 本次检索的摘要文案 */
export function retrievalSummary(retrieval) {
  if (!retrieval) return ''
  const total = retrieval.totalRetrieved ?? 0
  const relevant = retrieval.relevantCount ?? 0
  const effective = retrieval.effectiveCount ?? 0
  return `按本次研判问题从已登记的开源情报中筛选：共 ${total} 条，命中 ${relevant} 条相关事件，其中 ${effective} 条仍对当前风险有效。`
}
