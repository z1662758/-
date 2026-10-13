import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'

// 分析页共用实验上下文，直接打开链接、切换方案与刷新时保持一致。
export function useUraniumAnalysisExperiment(enabled = computed(() => true)) {
  const route = useRoute()
  const store = useUraniumDemoStore()
  let requestVersion = 0
  watch([enabled, () => route.query.experiment_id], async ([active, id]) => {
    const version = ++requestVersion
    if (!active) return
    await store.ensureInitialized()
    if (version !== requestVersion) return
    if (id && id !== store.selectedExperimentId) {
      const experiment = await store.loadExperiment(String(id))
      if (!experiment) ElMessage.warning('未找到指定实验，请选择其他实验')
    }
  }, { immediate: true })

}
