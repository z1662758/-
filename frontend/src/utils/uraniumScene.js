// 对照 sgm-cmse/src/scene/uranium_supply_chain/during 的 defaults.py、diagnostics.py。
export const URANIUM_WINDOWS = Object.freeze({
  historical: { start: 1997, end: 2024 },
  training: { start: 1997, end: 2018 },
  validation: { start: 2019, end: 2024 },
  forecast: { start: 2024, end: 2028 },
  extreme: { start: 2027, end: 2029 },
})

const EVENT_LABELS = Object.freeze({
  '铀价$106/lb(17年高)': '铀价高位波动',
  '哈酸短缺': '哈萨克斯坦硫酸短缺',
  '美国禁俄铀豁免到期;需求增加': '禁俄铀政策下的采购调整与需求增长（情景）',
  'Rooppur(孟加拉)首堆并网': '孟加拉核电新增需求（情景）',
  'Dasa(尼日尔)投产~1850tU/年': '尼日尔 Dasa 新增供给（情景）',
  'Tumas(纳米比亚)ISL投产~1800tU/年': '纳米比亚 Tumas 新增供给（情景）',
  'Arrow/WheelerRiver/TripleR投产(加拿大)': '加拿大新项目增量供给（情景）',
  '高需求情景下生产短缺开始': '高需求下的供给缺口（情景）',
  '美国禁俄铀完全生效': '美国禁俄铀政策全面实施（情景）',
})

export function formatUraniumEvent(event) {
  const name = typeof event === 'string' ? event : event?.label || event?.name || ''
  return EVENT_LABELS[name] || name
}

export function uraniumAnnualState({ risk, unmet, demand, unmetRatio, inventory } = {}) {
  const valid = value => value != null && value !== '' && Number.isFinite(Number(value))
  const ratio = valid(unmetRatio) ? Number(unmetRatio)
    : valid(unmet) && valid(demand) && Number(demand) > 0 ? Number(unmet) / Number(demand) : null
  const high = (valid(risk) && risk > 0.24) || (ratio != null && ratio > 0.03) || (valid(inventory) && inventory < 2.3)
  const watch = (valid(risk) && risk > 0.18) || (ratio != null && ratio > 0.01) || (valid(inventory) && inventory < 2.8)
  if (high) return { tone: 'danger', label: '承压运行', actionLabel: '优先保供', detail: '优先补足需求缺口和库存缓冲，跟踪高风险来源。' }
  if (watch) return { tone: 'warning', label: '需关注', actionLabel: '调整采购', detail: '跟踪库存、需求缺口与来源风险，滚动调整采购。' }
  if (!valid(risk) && ratio == null && !valid(inventory)) return { tone: 'info', label: '待评估', actionLabel: '补充数据', detail: '年度指标不足，暂不判断运行状态。' }
  return { tone: 'success', label: '平稳运行', actionLabel: '持续监测', detail: '当前指标未触及上述压力阈值，继续监测年度变化。' }
}
