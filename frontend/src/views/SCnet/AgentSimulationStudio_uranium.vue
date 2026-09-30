<template>
  <div class="studio-host mid-stage-bg" :class="{ 'page-loaded': pageLoaded }">
    <div class="workflow-page">
      <MidStagePageHeader
        title="实体关系图"
        :subtitle="pageSubtitle"
        :icon="Cpu"
      >
        <template #right>
          <div class="graph-stat-row">
            <article v-for="item in activeGraphStats" :key="item.label" class="graph-stat-chip">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </template>
      </MidStagePageHeader>
      <div class="main-container">
        <div class="workflow-canvas-shell">
          <AgentDesignCanvas
            :nodes="nodes"
            :edges="edges"
            :read-only="true"
            :search-keyword="searchKeyword"
            :grouped-agents="groupedAgents"
            :category-label-map="categoryLabelMap"
            :selected-node="selectedNode"
            :get-configurable-params="getConfigurableParams"
            :get-param-value="getParamValue"
            :method-dialog-visible="methodDialogVisible"
            :method-dialog-agent="methodDialogAgent"
            :method-dialog-selected="methodDialogSelected"
            @update:nodes="handleNodesUpdate"
            @update:edges="handleEdgesUpdate"
            @update:searchKeyword="handleSearchKeywordUpdate"
            @locate-agent="locateAgent"
            @open-agent-method-dialog="openAgentMethodDialog"
            @select-node="selectNode"
            @update-param-value="payload => updateParamValue(payload.agentId, payload.paramKey, payload.index, payload.value, payload.paramDef)"
            @update:methodDialogVisible="handleMethodDialogVisibleUpdate"
            @update:methodDialogSelected="handleMethodDialogSelectedUpdate"
            @confirm-method-selection="confirmMethodSelection"
          />
        </div>
      </div>

      <div class="workbench-next-fab workbench-flow-footer">
        <el-button class="workbench-prev-button" size="large" @click="goToScenario">
          <el-icon class="prev-icon"><ArrowLeft /></el-icon>
          <span class="prev-text">上一步：想定生成</span>
        </el-button>
        <el-button class="workbench-next-button" type="primary" size="large" @click="goToExperiment">
          <span class="next-text">下一步：实验推演</span>
          <el-icon class="next-icon"><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, Cpu } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useScnetSupplyChainStore as useSupplyChainStore } from '@/stores/scnet'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import AgentDesignCanvas from './components/simulation/AgentDesignCanvas_uranium.vue'
import MidStagePageHeader from './components/shared/MidStagePageHeader.vue'
import { useAgentGraph } from './composables/useAgentGraph_uranium'
import { useAgentDesignPayload } from './composables/useAgentDesignPayload_uranium'
import { getParameterCatalog } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/session'
import {
  buildAgentListFromCatalog,
  buildAgentListFromBackendAgents,
  canonicalAgentId,
  pickLatestParameterCatalog
} from './composables/scnetCatalogAdapter_uranium'
import { AGENT_GRAPH_SNAPSHOTS, URANIUM_REFERENCE_GRAPH } from './mock/agentGraphMock'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import './components/shared/midStage.css'

const router = useRouter()
const route = useRoute()
const pageLoaded = ref(false)

const { simulationData, loadingData, loadAgentDesignPayload } = useAgentDesignPayload('AgentStudioHost')

const store = useSupplyChainStore()
const snapshotStore = useAnalysisSnapshotStore()
const { setAgentsResult, setAgentsResultSessionId, agentDesignPayload, agentDesignPayloadSessionId } = storeToRefs(store)
const currentSessionId = computed(() => (
  store.currentSessionId ||
  simulationData.value?.session_id ||
  store.agentDesignPayloadSessionId ||
  store.setAgentsResultSessionId ||
  null
))
const scenarioApiResult = computed(() => {
  const raw = store.scenarioApiResult
  return raw && typeof raw === 'object' ? raw : {}
})

const fetchedParameterCatalog = ref(null)
const simulationAgentList = ref([])
// 实验设计只展示当前会话生成的方案；参考骨架仅保留为内部数据兜底。
const graphSource = ref('simulation')
const referenceAgentList = ref(buildAgentListFromBackendAgents(URANIUM_REFERENCE_GRAPH.agents))
// 目录、画布和详情必须共享同一份正在展示的实体，避免画布有节点但目录为空。
const activeAgentList = ref([...referenceAgentList.value])
const isShowingReference = ref(true)

const effectiveParameterCatalog = computed(() => (
  pickLatestParameterCatalog(
    fetchedParameterCatalog.value,
    setAgentsResult.value?.parameter_catalog,
    scenarioApiResult.value?.parameter_catalog
  )
))

const hasWorkflowPayload = computed(() => {
  const sid = currentSessionId.value
  if (!sid) return false
  if (simulationData.value?.session_id === sid && Array.isArray(simulationData.value?.agents) && simulationData.value.agents.length > 0) {
    return true
  }
  if (agentDesignPayloadSessionId.value === sid && Array.isArray(agentDesignPayload.value?.agents) && agentDesignPayload.value.agents.length > 0) {
    return true
  }
  if (setAgentsResultSessionId.value === sid && Array.isArray(setAgentsResult.value?.agents) && setAgentsResult.value.agents.length > 0) {
    return true
  }
  return false
})

const pageSubtitle = computed(() => isShowingReference.value
  ? URANIUM_REFERENCE_GRAPH.title
  : '查看 Agent 关系与角色参数')

// 参数目录有时只返回“供给方 / 制造方”两个聚合配置模板。它们用于参数编辑，
// 并不是一张完整的实体关系图，不能覆盖首屏的供应链参考图。
const hasCompleteCatalogGraph = computed(() => {
  const rows = simulationAgentList.value || []
  const tiers = new Set(rows.map(item => item.category).filter(Boolean))
  return rows.length >= 3 && tiers.size >= 3
})

const activeGraphStats = computed(() => {
  const rows = activeAgentList.value || []
  const countBy = (category) => rows.filter((item) => item.category === category).length
  return [
    { label: 'Agent', value: String(rows.length) },
    { label: '关系', value: String(edges.value.length) },
    { label: '供应', value: String(countBy('supply')) },
    { label: '运输', value: String(countBy('transport')) }
  ]
})

function applyCatalogAgents() {
  simulationAgentList.value = buildAgentListFromCatalog(effectiveParameterCatalog.value)
}

async function refreshParameterCatalog() {
  if (String(store.currentSessionId).startsWith('during-session-')) {
    applyCatalogAgents()
    return
  }
  try {
    const response = await getParameterCatalog('uranium')
    fetchedParameterCatalog.value = unwrapApiData(response)
  } catch (error) {
    console.warn('[AgentSimulationStudio] getParameterCatalog failed:', error?.message || error)
  } finally {
    applyCatalogAgents()
  }
}

function mergeSetAgentsIntoLocalList() {
  const sid = currentSessionId.value
  const payload = setAgentsResult.value
  if (!payload?.agents?.length || !sid || setAgentsResultSessionId.value !== sid) return

  const byCanvasId = new Map(simulationAgentList.value.map((a) => [a.id, a]))
  for (const sa of payload.agents) {
    const cid = canonicalAgentId(sa)
    if (!cid || !byCanvasId.has(cid)) continue
    if (sa.parameters && typeof sa.parameters === 'object') {
      const prev = store.agentNodeConfigs[cid]?.params || {}
      store.updateAgentNodeConfig(cid, { params: { ...prev, ...sa.parameters } })
    }
  }
}

function getConfigurableParams(agentId) {
  const agent = activeAgentList.value.find(a => a.id === agentId)
  return agent?.configurableParams || []
}

function getParamValue(agentId, paramKey, index, paramDef) {
  const config = store.agentNodeConfigs[agentId]
  const saved = config?.params?.[paramKey]
  const fallback = paramDef?.default ?? paramDef?.defaultValue
  if (paramDef.type === 'range') {
    if (Array.isArray(saved)) return saved[index] ?? fallback?.[index]
    return fallback?.[index]
  }
  return saved ?? fallback
}

function updateParamValue(agentId, paramKey, index, val, paramDef) {
  const currentConfig = store.agentNodeConfigs[agentId] || {}
  const currentParams = currentConfig.params || {}
  const fallback = paramDef?.default ?? paramDef?.defaultValue
  let newVal
  if (paramDef.type === 'range') {
    const current = Array.isArray(currentParams[paramKey]) ? [...currentParams[paramKey]] : [...(fallback || [0, 0])]
    current[index] = val
    newVal = current
  } else {
    newVal = val
  }
  store.updateAgentNodeConfig(agentId, { params: { ...currentParams, [paramKey]: newVal } })
}

const {
  nodes,
  edges,
  searchKeyword,
  selectedNode,
  methodDialogAgent,
  methodDialogVisible,
  methodDialogSelected,
  categoryLabelMap,
  groupedAgents,
  buildNodesFromAgents,
  locateAgent,
  selectNode,
  openAgentMethodDialog,
  confirmMethodSelection
} = useAgentGraph({
  agentList: activeAgentList,
  onUpdateAgentMethod: () => {}
})

const handleNodesUpdate = (val) => {
  nodes.value = val
}
const handleEdgesUpdate = (val) => {
  edges.value = val
}
const handleSearchKeywordUpdate = (val) => {
  searchKeyword.value = val
}
const handleMethodDialogVisibleUpdate = (val) => {
  methodDialogVisible.value = val
}
const handleMethodDialogSelectedUpdate = (val) => {
  methodDialogSelected.value = val
}

function clearGraphSelection() {
  selectedNode.value = null
}

// 铀实体图统一以「参数目录的三级实体」为数据源（制造/供应/销售）。
// 后端 agent_design（ADAgent 移植自地缘博弈版，产出 leader/org/unit）不参与画布渲染，
// 仅保留其持久化/提交链路。
async function applyCatalogGraph({ render = true } = {}) {
  await refreshParameterCatalog()  // 写入 agentList（目录三级实体）
  mergeSetAgentsIntoLocalList()    // 合并已保存的实体参数配置
  if (!render || graphSource.value !== 'simulation') return
  // 铀场景的默认实体图使用铀业务参考骨架（六个专属实体）。
  // 通用参数目录只提供供应商/制造/销售模板，不能覆盖铀实体图。
  if (!snapshotStore.activeSnapshotId) {
    applyReferenceGraph()
    return
  }
  await nextTick()
  // 空目录、聚合参数模板或空会话结果不得覆盖已经显示的参考图。
  if (!snapshotStore.activeSnapshotId && (!hasWorkflowPayload.value || !hasCompleteCatalogGraph.value)) {
    applyReferenceGraph()
    return
  }
  clearGraphSelection()
  isShowingReference.value = false
  activeAgentList.value = [...simulationAgentList.value]
  buildNodesFromAgents(simulationAgentList.value)
}

// 应用决策分析「实体图快照」到画布
function applySnapshotGraph({ render = true } = {}) {
  const snap = snapshotStore.getActiveSnapshot()
  if (!snap?.agentGraphId) return false
  const graph = AGENT_GRAPH_SNAPSHOTS[snap.agentGraphId]
  if (!graph?.agents?.length) return false
  simulationAgentList.value = buildAgentListFromBackendAgents(graph.agents)
  if (render && graphSource.value === 'simulation') {
    clearGraphSelection()
    isShowingReference.value = false
    activeAgentList.value = [...simulationAgentList.value]
    buildNodesFromAgents(simulationAgentList.value, graph.relationship_net || [])
  }
  return true
}

function applyReferenceGraph() {
  clearGraphSelection()
  isShowingReference.value = true
  activeAgentList.value = [...referenceAgentList.value]
  buildNodesFromAgents(referenceAgentList.value, URANIUM_REFERENCE_GRAPH.relationship_net || [])
}

function onSnapshotCleared() {
  // 退出快照模式：回到铀场景六实体参考图
  applyReferenceGraph()
}

function revealPage() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { pageLoaded.value = true })
  })
}

function goToScenario() {
  router.push({ path: SCNET_ROUTES.scenarioAnalysis, query: { ...route.query, scenario: 'uranium' } })
}

function goToExperiment() {
  router.push({ path: SCNET_ROUTES.experimentManager, query: { ...route.query, scenario: 'uranium', view: 'run' } })
}

async function syncViewQuery() {
  const nextView = 'workflow'
  if (route.query?.view === nextView) return
  await router.replace({ path: route.path, query: { ...route.query, view: nextView } })
}

onMounted(async () => {
  await syncViewQuery()

  const sid = currentSessionId.value
  if (sid && store.currentSessionId !== sid) {
    store.setCurrentSessionId(sid)
  }
  store.hydrateSetAgentsResultFromStorage()

  // 首屏先同步渲染：快照优先，否则立即展示轻量参考图。
  // 不等待参数目录接口，确保直接访问本页时画布不会空白。
  if (snapshotStore.activeSnapshotId) {
    applySnapshotGraph({ render: graphSource.value === 'simulation' })
  } else {
    applyReferenceGraph()
  }

  // 仍加载 agent_design 以同步已存参数/会话，但不阻塞实体图首屏展示。
  if (!String(sid).startsWith('during-session-')) loadAgentDesignPayload({ reuseCache: true }).catch((error) => {
    console.warn('[AgentSimulationStudio] loadAgentDesignPayload failed:', error?.message || error)
  })
  revealPage()
  await applyCatalogGraph({ render: graphSource.value === 'simulation' })
  if (graphSource.value === 'reference') {
    applyReferenceGraph()
  }
})

watch(() => snapshotStore.activeSnapshotId, (next, prev) => {
  if (next === prev) return
  if (next) {
    applySnapshotGraph({ render: graphSource.value === 'simulation' })
  } else {
    // 外部清除快照：回退到实时数据
    onSnapshotCleared()
    if (graphSource.value === 'reference') applyReferenceGraph()
  }
})

watch(simulationData, () => {
  if (snapshotStore.activeSnapshotId) return // 快照模式不被实时数据覆盖
  applyReferenceGraph()
})

watch(() => [route.path, route.query?.view], async () => {
  await syncViewQuery()
})

watch(() => store.currentSessionId, async (next, prev) => {
  if (snapshotStore.activeSnapshotId) return
  if (!next || next === prev || loadingData.value) return
  await loadAgentDesignPayload({ reuseCache: true })
})

watch(effectiveParameterCatalog, () => {
  if (snapshotStore.activeSnapshotId) return
  applyReferenceGraph()
})

watch([setAgentsResult, setAgentsResultSessionId, currentSessionId], () => {
  if (snapshotStore.activeSnapshotId) return
  applyReferenceGraph()
})

watch(graphSource, (next) => {
  if (next === 'reference') {
    applyReferenceGraph()
    return
  }
  if (snapshotStore.activeSnapshotId) {
    applySnapshotGraph({ render: true })
    return
  }
  applyReferenceGraph()
}, { immediate: false })
</script>

<style scoped>
.studio-host {
  width: 100%;
  height: calc(100vh - 60px);
  overflow: auto;
  opacity: 0;
  display: flex;
  flex-direction: column;
  transition: opacity 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.studio-host.page-loaded { opacity: 1; }

.workflow-page {
  width: 100%;
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--mid-font-sans);
  padding: 6px 0 0;
  box-sizing: border-box;
  gap: 8px;
}

.graph-stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.graph-stat-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--mid-border-soft);
  background: rgba(255, 255, 255, 0.7);
}

.graph-stat-chip span {
  color: var(--mid-text-muted);
  font-size: var(--mid-fs-micro);
}

.graph-stat-chip strong {
  color: var(--mid-text-strong);
  font-size: var(--mid-fs-strong);
  font-weight: 700;
}

.main-container {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 12px;
  align-items: stretch;
  overflow: hidden;
  padding: 0 8px;
}

.workflow-canvas-shell {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
  border-radius: var(--mid-radius-md);
  overflow: hidden;
}

.workbench-next-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 26px;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.22);
}
.workbench-next-button .next-text { font-size: 13px; font-weight: 700; }
.workbench-next-button .next-icon { font-size: 16px; }

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

@media (max-width: 1100px) {
  .graph-stat-row {
    flex-wrap: wrap;
  }
}

</style>
