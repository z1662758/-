export function validateUraniumModelingDraft(draft, maxIterations = 10) {
  if (!Number.isInteger(draft.start_year) || draft.start_year < 1997 || draft.start_year > 2035) return '起始年份须为 1997–2035 之间的整数'
  if (!Number.isInteger(draft.end_year) || draft.end_year < draft.start_year || draft.end_year > 2040) return '结束年份须不早于起始年份，且不晚于 2040 年'
  if (!Number.isInteger(draft.optimization_iterations) || draft.optimization_iterations < 1 || draft.optimization_iterations > maxIterations) return `迭代轮数须为 1–${maxIterations} 之间的整数`
  if (!Number.isFinite(draft.event_severity_multiplier) || draft.event_severity_multiplier < 0.5 || draft.event_severity_multiplier > 3) return '事件强度倍率须在 0.5–3 之间'
  return ''
}
