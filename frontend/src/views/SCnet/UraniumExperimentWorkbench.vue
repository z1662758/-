<template>
  <div class="uranium-workbench">
    <main v-if="ready" class="workbench-content">
      <ExperimentManager v-if="activeView === 'run'" />
      <SimulationInterface v-else-if="activeView === 'simulation'" />
      <UraniumCaseAnalysis v-else-if="activeView === 'case'" :case-id="activeCaseId" />
      <DecisionGeneration v-else />
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExperimentManager from './ExperimentManager_uranium.vue'
import SimulationInterface from './interface_uranium.vue'
import DecisionGeneration from './DecisionGeneration_uranium.vue'
import UraniumCaseAnalysis from './components/UraniumCaseAnalysis.vue'
import './components/shared/midStage.css'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { ElMessage } from 'element-plus'

defineOptions({ name: 'UraniumExperimentWorkbench' })

const route = useRoute()
const router = useRouter()
const demoStore = useUraniumDemoStore()

const ready = ref(false)

watch(() => route.query.experiment_id, async (id) => {
  await demoStore.ensureInitialized()
  if (id && String(id) !== demoStore.selectedExperimentId) {
    const result = await demoStore.loadExperiment(String(id))
    if (!result) ElMessage.warning('指定实验不存在，请重新选择实验')
  }
  ready.value = true
}, { immediate: true })

// 选择、启动和加载实验后同步地址，刷新与前进后退仍指向同一个实验。
watch(() => ready.value ? demoStore.selectedExperimentId : '', (id) => {
  if (id && id !== route.query.experiment_id) {
    router.replace({ query: { ...route.query, experiment_id: id } })
  }
})

async function selectExperiment(id) {
  await demoStore.loadExperiment(id)
}

function askAboutExperiment() {
  if (!demoStore.selectedExperiment) return
  router.push({ path: SCNET_ROUTES.chatHome, query: {
    mode: 'during', scenario: 'uranium',
    experiment_id: demoStore.selectedExperiment.experiment_id,
  } })
}

const workbenchViews = Object.freeze([
  { value: 'run', label: '实验管理' },
  { value: 'simulation', label: '态势推演' },
  { value: 'decision', label: '决策方案' },
])

const VIEW_KEYS = ['run', 'simulation', 'case', 'decision']

const routeDefault = computed(() => route.path.endsWith('/interface') ? 'simulation' : 'run')
const activeView = computed(() => (
  VIEW_KEYS.includes(route.query.view) ? route.query.view : routeDefault.value
))
const activeCaseId = computed(() => String(route.query.case || ''))

function switchView(view) {
  if (view === activeView.value) return
  const query = { ...route.query, view }
  delete query.case
  router.replace({ query })
}

function backToRun() {
  const query = { ...route.query, view: 'run' }
  delete query.case
  router.replace({ query })
}
</script>

<style scoped>
.uranium-workbench { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--mid-stage-bg); }
.workbench-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px 20px; padding: 10px 16px; border-bottom: 1px solid #e2e8f0; background: #fff; }
.workbench-tabs { display: flex; align-items: center; gap: 4px; }
.workbench-tabs button { padding: 8px 14px; border: 0; border-radius: 6px; background: transparent; color: #64748b; cursor: pointer; font: inherit; font-size: 13px; }
.workbench-tabs button:hover { background: #f1f5f9; }
.workbench-tabs button.active { background: #eff6ff; color: #2563eb; font-weight: 600; }
.workbench-tabs button:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
.case-label { color: #475569; font-size: 13px; padding-left: 10px; }
.workbench-context { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
.workbench-context label { color: #64748b; font-size: 12px; }
.workbench-experiment-select { width: 250px; max-width: 100%; }
.workbench-content { flex: 1; min-height: 0; overflow: hidden; }
.workbench-content > :deep(*) { height: 100%; }
@media (max-width: 1050px) {
  .workbench-toolbar { gap: 6px; padding: 8px 12px; }
  .workbench-context { flex: 1; justify-content: flex-end; }
  .workbench-context label { display: none; }
  .workbench-experiment-select { width: 200px; }
}
@media (max-width: 720px) {
  .workbench-context { flex-basis: 100%; justify-content: flex-start; }
  .workbench-experiment-select { flex: 1; }
}
</style>
