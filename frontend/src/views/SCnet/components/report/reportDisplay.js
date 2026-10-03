/**
 * 报告渲染辅助。
 *
 * 报告是后端生成的**结构化 JSON**(chapters[].sections[].type),
 * 前端只负责按类型用统一组件渲染,不做二次加工、不拼 HTML。
 */

/** section 类型 → 中文标签(用于开发排查,正文不显示) */
export const SECTION_TYPE_LABELS = Object.freeze({
  paragraphs: '正文',
  keyFindings: '核心结论',
  metricCards: '指标卡',
  tables: '数据表',
  charts: '图表',
  riskMatrix: '风险矩阵',
  timeline: '时间线',
  decisionMatrix: '决策矩阵',
  recommendations: '行动建议',
  callouts: '重点提示',
})

/** callout 语气 → 样式与图标语义 */
export const CALLOUT_TONES = Object.freeze({
  core: { label: '核心判断', className: 'is-core' },
  warning: { label: '高风险提醒', className: 'is-warning' },
  advice: { label: '决策建议', className: 'is-advice' },
  limited: { label: '数据限制', className: 'is-limited' },
})

export function calloutTone(tone) {
  return CALLOUT_TONES[tone] || CALLOUT_TONES.core
}

/** 报告来源标签:当前任务 / 案例 / 背景数据 等 */
export const REPORT_SOURCE_LABELS = Object.freeze({
  current_task: '当前任务报告',
  example: '案例报告',
  fallback: '背景数据，仅供参考',
  simulation: '模拟结果，不作为当前任务结论',
  imported: '导入结果',
})

/**
 * 从 artifact 判断报告来源。
 * 案例报告要带上案例标签(如"案例报告 · 俄乌战争背景下哈萨克斯坦铀燃料进口")。
 */
export function reportSource(artifact) {
  const provenance = artifact?.provenance || {}
  const sourceType = provenance.sourceType || 'current_task'
  const base = REPORT_SOURCE_LABELS[sourceType] || REPORT_SOURCE_LABELS.fallback
  const label = provenance.exampleLabel
  if (sourceType === 'example' && label) {
    return { sourceType, text: `${base} · ${label}` }
  }
  return { sourceType, text: base }
}

/** 旧的 Markdown 报告(本次改动之前生成) */
export function isLegacyReport(result) {
  return Boolean(result) && !result.structured
}

export function formatDate(value) {
  if (!value) return '—'
  const text = String(value).replace('T', ' ').replace('Z', '')
  return text.length > 16 ? text.slice(0, 16) : text
}

/** 章节里的可见中文/字符数,用于页面上标注篇幅 */
export function chapterLength(chapter) {
  return JSON.stringify(chapter || {}).length
}

/** 把表格列数对齐,避免行长度不一致导致渲染错位 */
export function normalizeRows(columns, rows) {
  const width = (columns || []).length
  if (!width) return []
  return (rows || []).map((row) => {
    const cells = Array.isArray(row) ? row.slice(0, width) : []
    return cells.concat(Array(Math.max(0, width - cells.length)).fill(''))
  })
}

/** 数值列右对齐:纯数字/百分比/区间的单元格 */
export function isNumericCell(value) {
  const text = String(value ?? '').trim()
  if (!text) return false
  return /^[-+]?\d+(?:[.,]\d+)?\s*(?:%|％|条|项|个|tU|吨|天|年|月|次)?$/.test(text)
}
