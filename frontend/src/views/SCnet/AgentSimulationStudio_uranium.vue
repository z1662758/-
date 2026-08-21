<template>
  <div class="studio-host mid-stage-bg" :class="{ 'page-loaded': pageLoaded }">
    <div class="workflow-page">
      <MidStagePageHeader
        title="实体图"
        :subtitle="pageSubtitle"
        :icon="Cpu"
      >
        <template #center>
          <el-segmented
            v-model="graphSource"
            :options="graphSourceOptions"
            size="small"
          />
        </template>
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
          <div
            v-if="graphSource === 'simulation' && showWorkflowPendingNotice"
            class="workflow-pending-banner"
            :class="{ loading: loadingData }"
          >
            <span class="workflow-pending-dot"></span>
            <span>{{ workflowPendingMessage }}</span>
          </div>
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
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Cpu } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useScnetSupplyChainStore as useSupplyChainStore } from '@/stores/scnet'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { ElMessage } from 'element-plus'
import AgentDesignCanvas from './components/simulation/AgentDesignCanvas_uranium.vue'
import MidStagePageHeader from './components/shared/MidStagePageHeader.vue'
import { useAgentGraph } from './composables/useAgentGraph_uranium'
import { useAgentDesignPayload } from './composables/useAgentDesignPayload_uranium'
import { getParameterCatalog } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/session'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import {
  buildScnetReferenceSummary,
  buildUraniumReferenceGraph
} from '@/assets/data/scnetReferenceData'
import {
  buildAgentListFromCatalog,
  buildAgentListFromBackendAgents,
  canonicalAgentId,
  pickLatestParameterCatalog
} from './composables/scnetCatalogAdapter_uranium'
import { AGENT_GRAPH_SNAPSHOTS } from './mock/agentGraphMock'
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
const graphSource = ref('reference')
const graphSourceOptions = Object.freeze([
  { label: '参考关系图', value: 'reference' },
  { label: '仿真实体图', value: 'simulation' }
])
const uraniumReferenceGraph = buildUraniumReferenceGraph()
const referenceSummary = buildScnetReferenceSummary()
const referenceAgentList = ref(buildAgentListFromBackendAgents(uraniumReferenceGraph.agents))
const activeAgentList = computed(() => (
  graphSource.value === 'reference' ? referenceAgentList.value : simulationAgentList.value
))

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

const showWorkflowPendingNotice = computed(() => (
  !snapshotStore.activeSnapshotId && !hasWorkflowPayload.value
))

const workflowPendingMessage = computed(() => (
  loadingData.value
    ? '实体图生成中，当前展示参考骨架，完成后自动补齐。'
    : '实体图结果暂未返回，可先浏览参考骨架，稍后自动更新。'
))

const pageSubtitle = computed(() => (
  graphSource.value === 'reference'
    ? `结构化参考骨架 · ${referenceSummary.uranium.networkNodes} 节点 / ${referenceSummary.uranium.networkEdges} 关系 / ${referenceSummary.transport.corridors} 条运输通道`
    : '当前会话返回的实体骨架与参数配置'
))

const activeGraphStats = computed(() => {
  const rows = activeAgentList.value || []
  const countBy = (category) => rows.filter((item) => item.category === category).length
  return [
    { label: '节点', value: String(rows.length) },
    { label: '关系', value: String(edges.value.length) },
    { label: '供应', value: String(countBy('supply')) },
    { label: '运输', value: String(countBy('transport')) }
  ]
})

function applyCatalogAgents() {
  simulationAgentList.value = buildAgentListFromCatalog(effectiveParameterCatalog.value)
}

async function refreshParameterCatalog() {
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
  await nextTick()
  clearGraphSelection()
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
    buildNodesFromAgents(simulationAgentList.value, graph.relationship_net || [])
  }
  return true
}

function applyReferenceGraph() {
  clearGraphSelection()
  buildNodesFromAgents(referenceAgentList.value, uraniumReferenceGraph.relationship_net || [])
}

function onSnapshotCleared() {
  // 退出快照模式：回退到目录三级实体
  applyCatalogAgents()
  if (graphSource.value === 'simulation') {
    clearGraphSelection()
    buildNodesFromAgents(simulationAgentList.value)
  }
}

function revealPage() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { pageLoaded.value = true })
  })
}

async function syncViewQuery() {
  const nextView = 'workflow'
  if (route.query?.view === nextView) return
  await router.replace({ path: route.path, query: { ...route.query, view: nextView } })
}

onMounted(async () => {
  await syncViewQuery()

  // 准入校验：必须先完成事中对话（store 已就绪）或加载快照，否则回到入口
  const hasSnapshot = !!snapshotStore.activeSnapshotId
  const hasScenarioReady = !!(store.currentSessionId && store.scenarioApiResult)
  if (!hasSnapshot && !hasScenarioReady) {
    ElMessage.warning('请先通过事中流程写入会话或加载历史快照')
    router.replace(SCNET_ROUTES.duringEntry)
    return
  }

  const sid = currentSessionId.value
  if (sid && store.currentSessionId !== sid) {
    store.setCurrentSessionId(sid)
  }
  store.hydrateSetAgentsResultFromStorage()

  // 快照模式优先：如果已经选了快照，直接渲染对应实体图
  if (snapshotStore.activeSnapshotId) {
    applySnapshotGraph({ render: graphSource.value === 'simulation' })
  }

  // 仍加载 agent_design 以同步已存参数/会话，但不阻塞实体图首屏展示。
  loadAgentDesignPayload({ reuseCache: true }).catch((error) => {
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
  // 画布以目录三级实体为准，这里只同步可能新增的实体参数配置
  mergeSetAgentsIntoLocalList()
  if (graphSource.value === 'simulation' && simulationAgentList.value.length) {
    buildNodesFromAgents(simulationAgentList.value)
  }
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
  applyCatalogAgents()
  if (graphSource.value === 'simulation') {
    clearGraphSelection()
    buildNodesFromAgents(simulationAgentList.value)
  }
})

watch([setAgentsResult, setAgentsResultSessionId, currentSessionId], () => {
  if (snapshotStore.activeSnapshotId) return
  mergeSetAgentsIntoLocalList()
  if (graphSource.value === 'simulation' && simulationAgentList.value.length) {
    buildNodesFromAgents(simulationAgentList.value)
  }
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
  clearGraphSelection()
  buildNodesFromAgents(simulationAgentList.value)
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
  padding: 6px 0 14px;
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

.workflow-pending-banner {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(460px, calc(100% - 28px));
  padding: 8px 12px;
  border-radius: var(--mid-radius-sm);
  background: rgba(255, 251, 235, 0.94);
  border: 1px solid rgba(245, 158, 11, 0.28);
  box-shadow: var(--mid-card-shadow);
  color: #92400e;
  font-size: var(--mid-fs-body);
  line-height: var(--mid-lh-body);
  backdrop-filter: blur(8px);
}

.workflow-pending-banner.loading {
  background: rgba(239, 246, 255, 0.94);
  border-color: rgba(59, 130, 246, 0.24);
  color: #1d4ed8;
}

.workflow-pending-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  animation: workflowPulse 1.8s ease-in-out infinite;
}

@keyframes workflowPulse {
  0%   { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.28); }
  70%  { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}

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
