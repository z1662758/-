import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getExampleMeta, getExampleStageArtifact } from '@/api/expertExample'
import { unwrapApiData } from '@/utils/session'
// 案例展示用的固定报告正文:只作用于 report 阶段,不进通用报告规则
import { applyExampleReportFixture } from '@/assets/data/expertExampleReportFixture'

/**
 * 已发布案例包的只读缓存。
 *
 * 它是纯展示数据:读取案例包不会改动任何真实任务状态,
 * 也不会触发后端任何计算。页面切回 live 时只是不再读它。
 */
export const useExpertExampleStore = defineStore('expertExample', () => {
  const meta = ref(null)
  const metaLoading = ref(false)
  const metaError = ref('')
  /** stage -> artifact(只缓存取过的阶段) */
  const stageArtifacts = ref({})
  const stageLoading = ref({})
  const stageError = ref({})

  /** 「案例结果 · 俄乌战争背景下哈萨克斯坦铀燃料进口」 */
  const badgeText = computed(() => {
    const label = meta.value?.label
    return label ? `案例结果 · ${label}` : '案例结果'
  })

  const available = computed(() => Boolean(meta.value?.exampleId))

  async function loadMeta({ force = false } = {}) {
    if (meta.value && !force) return meta.value
    if (metaLoading.value) return meta.value
    metaLoading.value = true
    metaError.value = ''
    try {
      const response = await getExampleMeta()
      meta.value = unwrapApiData(response) || response?.data || response
      return meta.value
    } catch (e) {
      metaError.value = e?.message || '读取案例包失败'
      meta.value = null
      throw e
    } finally {
      metaLoading.value = false
    }
  }

  async function loadStageArtifact(stage, { force = false } = {}) {
    const key = String(stage || '').toLowerCase()
    if (!key) return null
    if (stageArtifacts.value[key] && !force) return stageArtifacts.value[key]
    if (stageLoading.value[key]) return stageArtifacts.value[key] || null
    stageLoading.value = { ...stageLoading.value, [key]: true }
    stageError.value = { ...stageError.value, [key]: '' }
    try {
      const response = await getExampleStageArtifact(key)
      const artifact = unwrapApiData(response) || response?.data || response
      // 案例报告正文单独固定(只影响 example 模式);其他阶段原样透传
      const display = applyExampleReportFixture(key, artifact)
      stageArtifacts.value = { ...stageArtifacts.value, [key]: display }
      return display
    } catch (e) {
      stageError.value = { ...stageError.value, [key]: e?.message || '读取案例阶段结果失败' }
      throw e
    } finally {
      stageLoading.value = { ...stageLoading.value, [key]: false }
    }
  }

  function stageAvailable(stage) {
    return Boolean(meta.value?.stages?.[stage]?.available)
  }

  function reset() {
    meta.value = null
    stageArtifacts.value = {}
    stageError.value = {}
  }

  return {
    meta, metaLoading, metaError, stageArtifacts, stageLoading, stageError,
    badgeText, available,
    loadMeta, loadStageArtifact, stageAvailable, reset,
  }
})
