/**
 * 模型注册表(模型卡)的前端共享缓存。
 *
 * 右侧「模型链」标签与「领域模型研判」结果区都要展示模型名称/作用/输入输出,
 * 两处若各自请求一次就会重复打后端,所以把请求收敛到这里:模块级共享状态,
 * 同一时刻只发一次请求,任何一处加载成功后另一处直接复用。
 */

import { ref } from 'vue'
import { getModelRegistry } from '@/api/uraniumSituationSnapshot'

const cards = ref([])
const loading = ref(false)
const error = ref('')
let inflight = null

export function useModelRegistry() {
  /**
   * 幂等加载。多处以同一轮事件里同时调用时复用同一个 Promise。
   * @param {boolean} force 强制重新拉取
   */
  function ensureLoaded(force = false) {
    if (inflight && !force) return inflight
    if (cards.value.length && !force) return Promise.resolve(cards.value)
    loading.value = true
    error.value = ''
    inflight = (async () => {
      try {
        const res = await getModelRegistry()
        const groups = (res && res.data && res.data.model_groups) || []
        cards.value = groups.flatMap((g) => g.models || [])
        return cards.value
      } catch (e) {
        // 注册表拿不到不是致命错误:执行记录还在,页面照常展示本次真的跑了什么,
        // 只是模型名称/作用退化为本地兜底名,并明确提示注册表不可用。
        error.value = (e && e.message) || '模型注册表加载失败'
        cards.value = []
        return []
      } finally {
        loading.value = false
        inflight = null
      }
    })()
    return inflight
  }

  return { cards, loading, error, ensureLoaded }
}
