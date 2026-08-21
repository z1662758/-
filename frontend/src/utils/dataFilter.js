/**
 * 数据过滤和精简工具
 * 用于减少不必要的数据传输和存储
 * @author SGM-MSE Team
 * @date 2026-01-14
 */

/**
 * 精简实验数据
 * 移除大型嵌套对象和日志数据
 * @param {Object} experiment - 原始实验数据
 * @returns {Object} 精简后的实验数据
 */
export function streamlineExperimentData(experiment) {
  if (!experiment) return null

  // 需要保留的基本字段
  const essentialFields = [
    'experiment_id',
    'goal',
    'iterations',
    'enterprise_count',
    'created_at',
    'updated_at',
    'status'
  ]

  // 创建精简对象
  const streamlined = {}

  // 只保留基本字段
  essentialFields.forEach(field => {
    if (experiment[field] !== undefined) {
      streamlined[field] = experiment[field]
    }
  })

  // 处理 parameters 字段 - 只保留简单参数
  if (experiment.parameters && typeof experiment.parameters === 'object') {
    streamlined.parameters = filterSimpleParameters(experiment.parameters)
  }

  if (import.meta.env.DEV) {
    const originalSize = JSON.stringify(experiment).length
    const streamlinedSize = JSON.stringify(streamlined).length
    const reduction = ((1 - streamlinedSize / originalSize) * 100).toFixed(1)
    console.log(`[DataFilter] 数据精简: ${originalSize} → ${streamlinedSize} bytes (减少 ${reduction}%)`)
  }

  return streamlined
}

/**
 * 过滤简单参数
 * 移除复杂嵌套对象，只保留基本类型
 * @param {Object} params - 原始参数对象
 * @returns {Object} 过滤后的参数对象
 */
export function filterSimpleParameters(params) {
  if (!params || typeof params !== 'object') return {}

  const filtered = {}

  // 需要排除的复杂字段
  const excludeFields = [
    'candidate_pool_stats',
    'eval_scenario',
    'constraints',
    'research_focus',
    'metrics_weight',
    'detailed_logs',
    'debug_info',
    'raw_data'
  ]

  for (const [key, value] of Object.entries(params)) {
    // 跳过排除字段
    if (excludeFields.includes(key)) {
      continue
    }

    // 只保留简单类型和数组
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null ||
      Array.isArray(value)
    ) {
      filtered[key] = value
    } else if (typeof value === 'object' && Object.keys(value).length < 5) {
      // 允许小型对象（少于5个属性）
      filtered[key] = value
    }
  }

  return filtered
}

/**
 * 精简时序数据
 * 移除冗余字段，只保留可视化需要的数据
 * @param {Object} timelineData - 原始时序数据
 * @returns {Object} 精简后的时序数据
 */
export function streamlineTimelineData(timelineData) {
  if (!timelineData) return null

  const streamlined = {
    experiment_id: timelineData.experiment_id,
    total_iterations: timelineData.total_iterations,
    iterations: [],
    loaded_iterations: timelineData.loaded_iterations || new Set()
  }

  // 精简每个迭代的数据
  if (Array.isArray(timelineData.iterations)) {
    streamlined.iterations = timelineData.iterations.map(iteration => {
      if (!iteration) return null
      return streamlineIterationData(iteration)
    }).filter(Boolean)
  }

  return streamlined
}

/**
 * 精简单个迭代数据
 * @param {Object} iteration - 原始迭代数据
 * @returns {Object} 精简后的迭代数据
 */
export function streamlineIterationData(iteration) {
  if (!iteration) return null

  const streamlined = {
    iteration: iteration.iteration,
    network: [],
    performance: []
  }

  // 精简网络数据 - 只保留可视化需要的字段
  if (Array.isArray(iteration.network)) {
    streamlined.network = iteration.network.map(month => ({
      month: month.month,
      total_enterprises: month.total_enterprises,
      collaboration_count: month.collaboration_count,
      manufacturer_count: month.manufacturer_count,
      retailer_count: month.retailer_count,
      supplier_count: month.supplier_count,
      new_enterprises: month.new_enterprises,
      dead_enterprises: month.dead_enterprises
    }))
  }

  // 精简性能数据
  if (Array.isArray(iteration.performance)) {
    streamlined.performance = iteration.performance.map(month => ({
      month: month.month,
      order_completion_rate: month.order_completion_rate,
      total_profit: month.total_profit,
      avg_inventory: month.avg_inventory,
      context_type: month.context_type,
      order_trend_slope: month.order_trend_slope
    }))
  }

  return streamlined
}

/**
 * 深度克隆并精简对象
 * 移除所有函数、Symbol和超大字段
 * @param {*} obj - 原始对象
 * @param {number} maxDepth - 最大递归深度
 * @param {number} currentDepth - 当前递归深度
 * @returns {*} 精简后的克隆对象
 */
export function deepCloneAndStreamline(obj, maxDepth = 5, currentDepth = 0) {
  // 达到最大深度，停止递归
  if (currentDepth >= maxDepth) {
    return '[Maximum depth reached]'
  }

  // 处理基本类型
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // 处理日期
  if (obj instanceof Date) {
    return obj.toISOString()
  }

  // 处理数组
  if (Array.isArray(obj)) {
    // 限制数组大小
    const maxArrayLength = 1000
    if (obj.length > maxArrayLength) {
      console.warn(`[DataFilter] 数组过大 (${obj.length}), 截断至 ${maxArrayLength}`)
      return obj.slice(0, maxArrayLength).map(item =>
        deepCloneAndStreamline(item, maxDepth, currentDepth + 1)
      )
    }
    return obj.map(item => deepCloneAndStreamline(item, maxDepth, currentDepth + 1))
  }

  // 处理对象
  const cloned = {}
  const entries = Object.entries(obj)

  // 限制对象属性数量
  const maxProperties = 50
  if (entries.length > maxProperties) {
    console.warn(`[DataFilter] 对象属性过多 (${entries.length}), 截断至 ${maxProperties}`)
  }

  for (const [key, value] of entries.slice(0, maxProperties)) {
    // 跳过函数和Symbol
    if (typeof value === 'function' || typeof key === 'symbol') {
      continue
    }

    // 跳过私有属性
    if (key.startsWith('_')) {
      continue
    }

    // 递归处理
    cloned[key] = deepCloneAndStreamline(value, maxDepth, currentDepth + 1)
  }

  return cloned
}

/**
 * 计算对象大小（字节）
 * @param {*} obj - 对象
 * @returns {number} 大小（字节）
 */
export function getObjectSize(obj) {
  try {
    return new Blob([JSON.stringify(obj)]).size
  } catch {
    return 0
  }
}

/**
 * 检查对象是否过大
 * @param {*} obj - 对象
 * @param {number} maxSize - 最大大小（字节）
 * @returns {boolean} 是否过大
 */
export function isObjectTooLarge(obj, maxSize = 1024 * 1024) {
  return getObjectSize(obj) > maxSize
}
