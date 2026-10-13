const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))

export function varianceRatio(demand = [], orders = []) {
  // 只比较同一时点的有效值，不把缺失数据补成零。
  const pairs = demand.flatMap((value, index) => finite(value) && finite(orders[index])
    ? [[Number(value), Number(orders[index])]] : [])
  if (pairs.length < 2) return null
  const variance = values => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  }
  const demandVariance = variance(pairs.map(pair => pair[0]))
  if (demandVariance <= Number.EPSILON) return null
  return variance(pairs.map(pair => pair[1])) / demandVariance
}

export function buildShockDemand(size, index, length = 5) {
  return Array.from({ length }, (_, period) => 100 + (period === index ? size : period === index + 1 ? size * 0.4 : 0))
}

export function propagateDemand(demand, shockIndex, layer) {
  const shock = Math.max(0, (demand[shockIndex] ?? 100) - 100)
  const response = [1, layer.response, layer.response * 0.45, layer.response * 0.15]
  // 放大的是相对基准的需求增量，避免零冲击也产生额外订单。
  return demand.map((value, index) => Number((value + shock * (layer.factor - 1) * (response[index - shockIndex] || 0)).toFixed(2)))
}

export function recoveryPeriods(series, shockIndex, tolerance = 5) {
  const unsettled = series.findLastIndex((value, index) => index >= shockIndex && Math.abs(value - 100) > tolerance)
  if (unsettled === series.length - 1) return null
  return unsettled < shockIndex ? 0 : unsettled - shockIndex + 1
}
