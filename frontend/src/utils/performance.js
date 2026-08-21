/**
 * 性能优化工具函数
 * @author SGM-MSE Team
 * @date 2026-01-14
 */

/**
 * 防抖函数
 * @param {Function} fn - 需要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timeoutId = null
  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn - 需要节流的函数
 * @param {number} interval - 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, interval = 300) {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= interval) {
      fn.apply(this, args)
      lastTime = now
    }
  }
}

/**
 * requestAnimationFrame 节流
 * 适用于频繁触发的滚动、拖拽等事件
 * @param {Function} fn - 需要节流的函数
 * @returns {Function} 节流后的函数
 */
export function rafThrottle(fn) {
  let rafId = null
  return function (...args) {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      fn.apply(this, args)
      rafId = null
    })
  }
}

/**
 * 延迟执行（Promise 版）
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} Promise 对象
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 重试机制
 * @param {Function} fn - 需要重试的异步函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} retryDelay - 重试延迟（毫秒）
 * @returns {Promise} Promise 对象
 */
export async function retry(fn, maxRetries = 3, retryDelay = 1000) {
  let lastError
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      console.warn(`[Retry] 第 ${i + 1}/${maxRetries} 次尝试失败:`, error.message)
      if (i < maxRetries - 1) {
        await delay(retryDelay * (i + 1)) // 递增延迟
      }
    }
  }
  throw lastError
}

/**
 * 批量请求并发控制
 * @param {Array} tasks - 任务数组
 * @param {number} concurrency - 并发数
 * @returns {Promise<Array>} 结果数组
 */
export async function batchConcurrent(tasks, concurrency = 3) {
  const results = []
  const executing = []

  for (const [index, task] of tasks.entries()) {
    const promise = Promise.resolve().then(() => task()).then(result => {
      results[index] = result
    })

    results.push(promise)

    if (concurrency <= tasks.length) {
      const executingPromise = promise.then(() => {
        executing.splice(executing.indexOf(executingPromise), 1)
      })
      executing.push(executingPromise)

      if (executing.length >= concurrency) {
        await Promise.race(executing)
      }
    }
  }

  await Promise.all(results)
  return results
}

/**
 * 缓存包装器（带过期时间）
 * @param {Function} fn - 需要缓存的函数
 * @param {number} ttl - 缓存时间（毫秒）
 * @returns {Function} 包装后的函数
 */
export function cacheWrapper(fn, ttl = 60000) {
  const cache = new Map()

  return function (...args) {
    const key = JSON.stringify(args)
    const cached = cache.get(key)

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value
    }

    const value = fn.apply(this, args)
    cache.set(key, { value, timestamp: Date.now() })

    // 自动清理过期缓存
    setTimeout(() => cache.delete(key), ttl)

    return value
  }
}

/**
 * 性能监控装饰器
 * @param {string} label - 监控标签
 * @returns {Function} 装饰器函数
 */
export function performanceMonitor(label) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args) {
      const start = performance.now()
      try {
        const result = await originalMethod.apply(this, args)
        const duration = performance.now() - start
        if (import.meta.env.DEV) {
          console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`)
        }
        return result
      } catch (error) {
        const duration = performance.now() - start
        console.error(`[Performance] ${label} 失败: ${duration.toFixed(2)}ms`, error)
        throw error
      }
    }

    return descriptor
  }
}

/**
 * 错误边界包装器
 * @param {Function} fn - 需要包装的函数
 * @param {Function} onError - 错误处理函数
 * @returns {Function} 包装后的函数
 */
export function errorBoundary(fn, onError) {
  return async function (...args) {
    try {
      return await fn.apply(this, args)
    } catch (error) {
      if (onError) {
        onError(error)
      } else {
        console.error('[Error Boundary]', error)
      }
      return null
    }
  }
}
