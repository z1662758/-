/**
 * 反事实实验的重复运行统计（P2）
 *
 * 依据：薛霄等《计算实验方法的溯源、现状与展望》(自动化学报, 2023, 49(2): 246−271)
 * —— 计算实验要遵循随机化、重复、区组化三原则；实验结果是一个分布，
 *    真实世界只是一个样本，不能用单点结果下结论。
 *
 * 设计：同一实验重复 N 次，第 i 次两个世界共用 seed+i（种子即区组），
 * 得到配对样本 → 配对差值分布 → 自助法 95% 置信区间 + 符号检验。
 *
 * 本模块为纯函数，不含随机性来源（自助法用可复现的 PRNG），便于单测。
 */

/** mulberry32：可复现的伪随机数发生器，保证自助法结果稳定。 */
export const createPrng = (seed) => {
  let a = (Number(seed) >>> 0) || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const mean = (values) => {
  const clean = (values || []).filter((v) => Number.isFinite(Number(v))).map(Number)
  if (!clean.length) return null
  return clean.reduce((sum, v) => sum + v, 0) / clean.length
}

/** 对已排序数组取分位数（线性插值）。 */
export const quantileSorted = (sorted, p) => {
  if (!sorted || !sorted.length) return null
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * Math.min(Math.max(p, 0), 1)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/** 自助法估计均值的 (1-alpha) 置信区间。 */
export const bootstrapMeanCI = (values, { level = 0.95, iterations = 2000, seed = 1 } = {}) => {
  const clean = (values || []).filter((v) => Number.isFinite(Number(v))).map(Number)
  if (!clean.length) return null
  const point = mean(clean)
  if (clean.length === 1) return { n: 1, mean: point, lo: point, hi: point }
  const rand = createPrng(seed)
  const means = new Array(iterations)
  for (let i = 0; i < iterations; i++) {
    let sum = 0
    for (let j = 0; j < clean.length; j++) sum += clean[Math.floor(rand() * clean.length)]
    means[i] = sum / clean.length
  }
  means.sort((a, b) => a - b)
  const alpha = (1 - level) / 2
  return { n: clean.length, mean: point, lo: quantileSorted(means, alpha), hi: quantileSorted(means, 1 - alpha) }
}

const logFactorial = (n) => {
  let sum = 0
  for (let i = 2; i <= n; i++) sum += Math.log(i)
  return sum
}
const logComb = (n, k) => logFactorial(n) - logFactorial(k) - logFactorial(n - k)

/** 配对符号检验（双侧，精确二项），返回 p 值；无有效样本返回 null。 */
export const signTestPValue = (diffs) => {
  const nz = (diffs || []).map(Number).filter((d) => Number.isFinite(d) && d !== 0)
  const n = nz.length
  if (!n) return null
  const k = nz.filter((d) => d > 0).length
  const tail = (m) => {
    let sum = 0
    for (let i = 0; i <= m; i++) sum += Math.exp(logComb(n, i) - n * Math.LN2)
    return sum
  }
  const lower = tail(k)
  const upper = 1 - tail(k) + Math.exp(logComb(n, k) - n * Math.LN2)
  return Math.min(1, Math.max(0, 2 * Math.min(lower, upper)))
}

/** 一组样本的分布摘要：均值 / 中位数 / 极值 / 95% CI。 */
export const summarizeSeries = (values, options = {}) => {
  const clean = (values || []).filter((v) => Number.isFinite(Number(v))).map(Number)
  if (!clean.length) return null
  const sorted = [...clean].sort((a, b) => a - b)
  const ci = bootstrapMeanCI(clean, options)
  return {
    n: clean.length,
    mean: ci.mean,
    median: quantileSorted(sorted, 0.5),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    ci95: [ci.lo, ci.hi]
  }
}

/**
 * 配对效应：事实世界与反事实世界按区组（同一种子）配对，
 * 得到「干预 → 指标变化」的差值分布、95% CI 与符号检验 p 值。
 */
export const summarizeEffect = (factualSeries, counterfactualSeries, options = {}) => {
  const n = Math.min((factualSeries || []).length, (counterfactualSeries || []).length)
  const diffs = []
  for (let i = 0; i < n; i++) {
    const f = Number(factualSeries[i])
    const c = Number(counterfactualSeries[i])
    if (Number.isFinite(f) && Number.isFinite(c)) diffs.push(c - f)
  }
  if (!diffs.length) return null
  const ci = bootstrapMeanCI(diffs, options)
  return {
    n: diffs.length,
    meanDifference: ci.mean,
    ci95: [ci.lo, ci.hi],
    pValue: signTestPValue(diffs),
    method: '配对差值 + 自助法 95% 置信区间 + 符号检验'
  }
}
