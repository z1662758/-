<template>
  <div class="workflow-page" :class="{ 'view-workflow-only': isWorkflowOnly, 'view-auto-plan': isAutoPlanView }">
    <!-- 顶部 Header -->
    <div class="page-header">
      <div class="header-content">
        <h1><el-icon><Cpu /></el-icon> {{ headerTitle }}</h1>
        <p>{{ headerSubtitle }}</p>
        <p v-if="isAutoPlanView" class="auto-plan-hint">当前方案由后端基于需求自动生成，本页仅做展示与核对，不再进行前端手动参数编排。</p>
        <p v-if="setAgentsSyncedHint" class="set-agents-sync-hint">{{ setAgentsSyncedHint }}</p>
      </div>
    </div>

    <div class="main-container">
      <template v-if="isAutoPlanView">
        <div class="auto-plan-layout">
          <AgentFlowDiagram
            section-title="自动化方案链路"
            :user-goal-tooltip="userGoalTooltip"
            :planner-strategy="plannerStrategy"
            :planner-strategy-options="studioPlannerStrategyOptions"
            :planner-strategy-label="plannerStrategyLabel"
            @update:plannerStrategy="handlePlannerStrategyUpdate"
          />

          <div class="auto-plan-bottom-grid">
            <FishboneDiagram
              :read-only="true"
              :active-fishbone-stage="activeFishboneStage"
              :influence-design-variables="influenceDesignVariables"
              :response-design-variables="responseDesignVariables"
              :has-any-fishbone-data="hasAnyFishboneData"
              :active-fishbone-variables="activeFishboneVariables"
              :fishbone-drawer-visible="fishboneDrawerVisible"
              :fishbone-drawer-title="fishboneDrawerTitle"
              :fishbone-drawer-var="fishboneDrawerVar"
              :fishbone-param-rows="fishboneParamRows"
              :fishbone-fullscreen-visible="fishboneFullscreenVisible"
              :fishbone-fullscreen-title="fishboneFullscreenTitle"
              :set-chart-ref="setFishBoneChartRef"
              :set-fullscreen-chart-ref="setFishBoneFullscreenChartRef"
              @update:activeFishboneStage="handleActiveFishboneStageUpdate"
              @update:fishboneDrawerVisible="handleFishboneDrawerVisibleUpdate"
              @update:fishboneFullscreenVisible="handleFishboneFullscreenVisibleUpdate"
              @navigate-scenario-modeling="router.push('/home/SCnet/scenarioModeling')"
              @save-drawer="saveFishboneDrawer"
              @fullscreen-opened="onFishboneDialogOpened"
              @fullscreen-closed="onFishboneDialogClosed"
            />
            <OOOALoopPanel />
          </div>

          <div class="queue-submit-card">
            <div class="queue-submit-title">步骤5：提交仿真引擎</div>
            <div class="queue-submit-desc">将当前会话、拆解任务、变量配置与模型参数打包提交到实验队列。</div>
            <div class="queue-submit-row">
              <span>会话ID</span>
              <strong>{{ currentSessionId || '未绑定' }}</strong>
            </div>
            <div class="queue-submit-row">
              <span>迭代轮次</span>
              <strong>{{ experimentIterations }}</strong>
            </div>
            <div class="queue-submit-row">
              <span>全局模型</span>
              <strong>{{ selectedGlobalModel }}</strong>
            </div>
            <div class="queue-submit-actions">
              <el-button type="primary" :loading="queueSubmitting" @click="submitExperimentToQueue">
                提交到实验队列
              </el-button>
              <el-button @click="router.push('/home/SCnet/experimentManager')">查看任务管理</el-button>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="isWorkflowOnly" class="workflow-canvas-shell">
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

        <div v-else class="engine-dashboard">
          <div class="left-column">
            <AgentFlowDiagram
              section-title="智能体协作流程"
              :user-goal-tooltip="userGoalTooltip"
              :planner-strategy="plannerStrategy"
              :planner-strategy-options="studioPlannerStrategyOptions"
              :planner-strategy-label="plannerStrategyLabel"
              @update:plannerStrategy="handlePlannerStrategyUpdate"
            />

            <FishboneDiagram
              :read-only="false"
              :active-fishbone-stage="activeFishboneStage"
              :influence-design-variables="influenceDesignVariables"
              :response-design-variables="responseDesignVariables"
              :has-any-fishbone-data="hasAnyFishboneData"
              :active-fishbone-variables="activeFishboneVariables"
              :fishbone-drawer-visible="fishboneDrawerVisible"
              :fishbone-drawer-title="fishboneDrawerTitle"
              :fishbone-drawer-var="fishboneDrawerVar"
              :fishbone-param-rows="fishboneParamRows"
              :fishbone-fullscreen-visible="fishboneFullscreenVisible"
              :fishbone-fullscreen-title="fishboneFullscreenTitle"
              :set-chart-ref="setFishBoneChartRef"
              :set-fullscreen-chart-ref="setFishBoneFullscreenChartRef"
              @update:activeFishboneStage="handleActiveFishboneStageUpdate"
              @update:fishboneDrawerVisible="handleFishboneDrawerVisibleUpdate"
              @update:fishboneFullscreenVisible="handleFishboneFullscreenVisibleUpdate"
              @navigate-scenario-modeling="router.push('/home/SCnet/scenarioModeling')"
              @save-drawer="saveFishboneDrawer"
              @fullscreen-opened="onFishboneDialogOpened"
              @fullscreen-closed="onFishboneDialogClosed"
            />
          </div>

          <div class="engine-side-column">
            <OOOALoopPanel class="engine-oooa-panel" />
            <div class="engine-summary-card">
              <div class="engine-summary-title">引擎执行概览</div>
              <div class="engine-summary-row">
                <span>会话ID</span>
                <strong>{{ currentSessionId || '未绑定' }}</strong>
              </div>
              <div class="engine-summary-row">
                <span>推演轮次</span>
                <strong>{{ experimentIterations }}</strong>
              </div>
              <div class="engine-summary-row">
                <span>规划策略</span>
                <strong>{{ plannerStrategyLabel }}</strong>
              </div>
              <div class="engine-summary-row">
                <span>全局模型</span>
                <strong>{{ selectedGlobalModel }}</strong>
              </div>
              <div class="queue-submit-actions">
                <el-button type="primary" :loading="queueSubmitting" @click="submitExperimentToQueue">
                  提交到实验队列
                </el-button>
                <el-button @click="router.push('/home/SCnet/experimentManager')">任务管理</el-button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Cpu } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { ElMessage } from 'element-plus'
import AgentDesignCanvas from './components/simulation/AgentDesignCanvas.vue'
import AgentFlowDiagram from './components/simulation/AgentFlowDiagram.vue'
import FishboneDiagram from './components/simulation/FishboneDiagram.vue'
import OOOALoopPanel from './components/simulation/OOOALoopPanel.vue'
import { useAgentGraph } from './composables/useAgentGraph'
import { useFishboneDesign } from './composables/useFishboneDesign'
import { getParameterCatalog, getSupplyChainAgents } from '@/api/supplyChain'
import { setAgents } from '@/api/scenarioModeling'
import { getSessionDetail } from '@/api/scenarioSession'
import { unwrapApiData } from '@/utils/apiEnvelope'
import {
  buildAgentListFromCatalog,
  buildAgentListFromBackendAgents,
  canonicalAgentId,
  pickLatestParameterCatalog,
  toSubmitCompatibleAgentNodeConfigs
} from './composables/scnetCatalogAdapter'

const props = defineProps({
  // 上层包装器或 studio 自启动流程产出的仿真数据 { agents, relationship_net, attribute_explain }
  // 有值时画布 / 左侧 Agent 列表完全由其驱动，跳过 catalog 流程
  simulationData: {
    type: Object,
    default: null
  }
})
const router = useRouter()
const route = useRoute()

// 仿真工作室（关系图视图）vs 仿真引擎（完整工作台）
const isWorkflowOnly = computed(() => route.query?.view === 'workflow')
const isAutoPlanView = computed(() => route.query?.view === 'studio')
const headerTitle = computed(() => {
  if (isWorkflowOnly.value) return '仿真工作室 · 实体关系图'
  if (isAutoPlanView.value) return '仿真引擎 · 自动化方案展示'
  return '仿真引擎 · 决策分析面板'
})
const headerSubtitle = computed(() => {
  if (isAutoPlanView.value) return '后端已根据用户需求自动生成方案，可在此查看自动化方案链路、鱼骨图与 OOOA 决策循环'
  return '引擎页聚焦策略链路、变量结构与 OOOA 决策闭环，不再展示实体关系画布。'
})

const store = useSupplyChainStore()
const { setAgentsResult, setAgentsResultSessionId } = storeToRefs(store)
const currentSessionId = computed(() => (
  store.currentSessionId ||
  props.simulationData?.session_id ||
  store.agentDesignPayloadSessionId ||
  store.setAgentsResultSessionId ||
  null
))
const scenarioSubtasks = computed(() => store.scenarioSubtasks)
const scenarioUserGoal = computed(() => store.scenarioUserGoal)
const scenarioApiResult = computed(() => {
  const raw = store.scenarioApiResult
  return raw && typeof raw === 'object' ? raw : {}
})
const userGoalTooltip = computed(() => {
  const g = scenarioUserGoal.value
  if (g && String(g).trim()) return String(g).trim()
  return '（请先在「目标拆解」中输入需求）'
})

const experimentIterations = ref(15)
const queueSubmitting = ref(false)
const plannerStrategy = ref('native')
const plannerStrategyOptions = [
  { value: 'native', label: 'native（后端自动化）' }
]
const plannerStrategyLabel = computed(() => {
  const o = plannerStrategyOptions.find(x => x.value === plannerStrategy.value)
  return o ? o.label : plannerStrategy.value
})
const studioPlannerStrategyOptions = computed(() => (
  isAutoPlanView.value
    ? [{ value: plannerStrategy.value, label: plannerStrategyLabel.value }]
    : plannerStrategyOptions
))

const fetchedParameterCatalog = ref(null)
const agentList = ref([])

const effectiveParameterCatalog = computed(() => (
  pickLatestParameterCatalog(
    fetchedParameterCatalog.value,
    setAgentsResult.value?.parameter_catalog,
    scenarioApiResult.value?.parameter_catalog
  )
))

function applyCatalogAgents() {
  agentList.value = buildAgentListFromCatalog(effectiveParameterCatalog.value)
}

async function refreshParameterCatalog() {
  try {
    const response = await getParameterCatalog('supply_chain')
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

  const byCanvasId = new Map(agentList.value.map((a) => [a.id, a]))
  for (const sa of payload.agents) {
    const cid = canonicalAgentId(sa)
    if (!cid || !byCanvasId.has(cid)) continue
    // 保留本地静态名称（制造总厂/工厂/销售商），不被后端返回的城市名覆盖
    if (sa.parameters && typeof sa.parameters === 'object') {
      const prev = store.agentNodeConfigs[cid]?.params || {}
      store.updateAgentNodeConfig(cid, { params: { ...prev, ...sa.parameters } })
    }
  }
}

const setAgentsSyncedHint = computed(() => {
  const sid = currentSessionId.value
  const payload = setAgentsResult.value
  if (!sid || !payload?.agents?.length) return ''
  if (setAgentsResultSessionId.value !== sid) return ''
  return `已同步场景建模「设置智能体」结果：后端返回 ${payload.agents.length} 个实体配置，已合并到左侧画布（同 ID 的节点）。`
})

function getAgentConfig(agentId) {
  const agent = agentList.value.find(a => a.id === agentId)
  const stored = store.agentNodeConfigs[agentId] || {}
  const llmModel = stored.llmConfig?.model || agent?.llmConfig?.model || 'qwen'
  return {
    selectedMethod: agent?.selectedMethod || '',
    note: '',
    llmConfig: { model: llmModel },
    ...stored
  }
}

function updateAgentConfig(agentId, key, value) {
  store.updateAgentNodeConfig(agentId, { [key]: value })
  if (key === 'selectedMethod') {
    const agent = agentList.value.find(a => a.id === agentId)
    if (agent) agent.selectedMethod = value
    // 同步更新画布节点显示
    const node = nodes.value.find(n => n.id === agentId)
    if (node) node.data = { ...node.data, selectedMethod: value }
  }
}

function getAgentModel(agentId) {
  return getAgentConfig(agentId).llmConfig?.model || 'qwen'
}

function updateAgentModel(agentId, model) {
  const current = getAgentConfig(agentId)
  store.updateAgentNodeConfig(agentId, {
    llmConfig: {
      ...(current.llmConfig || {}),
      model
    }
  })
}

function applyGlobalModelToAllAgents(model) {
  for (const agent of agentList.value) {
    updateAgentModel(agent.id, model)
  }
}

function getConfigurableParams(agentId) {
  const agent = agentList.value.find(a => a.id === agentId)
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

const agentModelsForSubmit = computed(() => {
  const out = {}
  for (const agent of agentList.value) {
    out[agent.id] = getAgentModel(agent.id)
  }
  return out
})

const dominantModel = computed(() => {
  const counts = new Map()
  for (const model of Object.values(agentModelsForSubmit.value)) {
    counts.set(model, (counts.get(model) || 0) + 1)
  }
  let winner = 'qwen'
  let maxCount = -1
  for (const [model, count] of counts.entries()) {
    if (count > maxCount) {
      winner = model
      maxCount = count
    }
  }
  return winner
})

const selectedGlobalModel = computed({
  get() {
    return dominantModel.value || 'qwen'
  },
  set(model) {
    if (!model) return
    applyGlobalModelToAllAgents(model)
  }
})

function resolveIterations() {
  const raw = scenarioApiResult.value?.exp_params?.params
  if (Array.isArray(raw)) {
    const hit = raw.find((item) => String(item?.name || '').includes('迭代'))
    const num = Number(hit?.default)
    if (Number.isInteger(num) && num >= 1 && num <= 100) return num
  }
  const fallback = Number(experimentIterations.value || 15)
  if (Number.isInteger(fallback) && fallback >= 1 && fallback <= 100) return fallback
  return 15
}

function buildQueuePayload() {
  const sessionId = currentSessionId.value
  const userGoal = scenarioUserGoal.value || scenarioApiResult.value?.goal_decomposition?.user_goal || ''
  const subtasks = Array.isArray(scenarioSubtasks.value) ? scenarioSubtasks.value : []
  const phase = localStorage.getItem('scnet_phaseSelection') || 'during'

  const agentMethods = {}
  for (const agent of agentList.value) {
    if (!agent?.id) continue
    const method = getAgentConfig(agent.id)?.selectedMethod || agent.selectedMethod || ''
    if (method) agentMethods[agent.id] = method
  }

  return {
    session_id: sessionId,
    scenario: 'supply_chain',
    iterations: resolveIterations(),
    model: selectedGlobalModel.value || 'qwen',
    planner_strategy: plannerStrategy.value || 'native',
    use_decompose: true,
    user_goal: userGoal,
    phase,
    goal_decomposition_subtasks: subtasks,
    subtask_variable_configs: store.scenarioVariableConfigs || {},
    agent_methods: agentMethods,
    agent_node_configs: toSubmitCompatibleAgentNodeConfigs(store.agentNodeConfigs || {}),
    agent_models: agentModelsForSubmit.value || {},
    scenario_context: store.scenarioContext || {},
    environment_config: store.environmentConfig || {}
  }
}

async function submitExperimentToQueue() {
  if (queueSubmitting.value) return
  if (!currentSessionId.value) {
    ElMessage.warning('会话未绑定，请先完成步骤1-3')
    return
  }
  if (!scenarioSubtasks.value?.length) {
    ElMessage.warning('缺少目标拆解任务，请先完成步骤3')
    return
  }

  queueSubmitting.value = true
  try {
    const payload = buildQueuePayload()
    const response = await store.submitExperimentTask(payload)
    const data = unwrapApiData(response)
    if (data?.status === 'queued' || data?.task_id) {
      if (data?.task_id) {
        localStorage.setItem('sc_recentQueuedTaskId', data.task_id)
      }
      ElMessage.success(data?.message || `提交成功，队列位置 ${data?.position ?? '-'}`)
      router.push('/home/SCnet/experimentManager')
      return
    }
    ElMessage.warning(data?.message || '提交结果异常，请在任务管理中确认')
  } catch (error) {
    ElMessage.error(`提交失败：${error?.message || '未知错误'}`)
  } finally {
    queueSubmitting.value = false
  }
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
  agentList,
  onUpdateAgentMethod: (agentId, selectedMethod) => {
    updateAgentConfig(agentId, 'selectedMethod', selectedMethod)
  }
})

const {
  setFishBoneChartRef,
  setFishBoneFullscreenChartRef,
  activeFishboneStage,
  influenceDesignVariables,
  responseDesignVariables,
  hasAnyFishboneData,
  activeFishboneVariables,
  fishboneDrawerVisible,
  fishboneDrawerTitle,
  fishboneDrawerVar,
  fishboneParamRows,
  fishboneFullscreenVisible,
  fishboneFullscreenTitle,
  saveFishboneDrawer,
  onFishboneDialogOpened,
  onFishboneDialogClosed,
  initFishBoneChart,
  handleResize,
  syncFishboneOnVariablesChange,
  disposeCharts
} = useFishboneDesign({
  store,
  scenarioApiResult,
  scenarioSubtasks,
  scenarioUserGoal,
  parameterCatalog: effectiveParameterCatalog,
  fishboneEditable: computed(() => !isAutoPlanView.value)
})

const handlePlannerStrategyUpdate = (val) => {
  plannerStrategy.value = val
}
const handleActiveFishboneStageUpdate = (val) => {
  activeFishboneStage.value = val
}
const handleFishboneDrawerVisibleUpdate = (val) => {
  fishboneDrawerVisible.value = val
}
const handleFishboneFullscreenVisibleUpdate = (val) => {
  fishboneFullscreenVisible.value = val
}
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

const hasSimulationData = computed(() => Array.isArray(props.simulationData?.agents) && props.simulationData.agents.length > 0)

const autoLoadedDesign = ref(null)
const hasAutoLoadedDesign = computed(() => Array.isArray(autoLoadedDesign.value?.agents) && autoLoadedDesign.value.agents.length > 0)

function applySimulationDataProp() {
  const sim = props.simulationData
  if (!sim?.agents?.length) return
  agentList.value = buildAgentListFromBackendAgents(sim.agents)
  buildNodesFromAgents(sim.agents, sim.relationship_net || [])
}

function applyAutoLoadedDesign() {
  const sim = autoLoadedDesign.value
  if (!sim?.agents?.length) return
  agentList.value = buildAgentListFromBackendAgents(sim.agents)
  buildNodesFromAgents(sim.agents, sim.relationship_net || [])
}

// 步骤 5 自启动加载：原 AgentSimulationStudioDemo 包装器的 loadAutoPlan 已并入此处
async function ensureStudioViewQuery() {
  // 直接命中 /home/SCnet/agentSimulationStudio 时，默认进入 studio 视图（保持与原 Demo 包装器一致）
  if (!route.path.startsWith('/home/SCnet/agentSimulationStudio')) return
  if (route.query?.view === 'studio' || route.query?.view === 'workflow') return
  await router.replace({ path: route.path, query: { ...route.query, view: 'studio' } })
}

async function bootstrapStudioFlow() {
  if (!isAutoPlanView.value) return null
  const sid = currentSessionId.value || localStorage.getItem('sc_currentSessionId') || null
  if (sid && store.currentSessionId !== sid) store.setCurrentSessionId(sid)
  const phase = localStorage.getItem('scnet_phaseSelection') || 'during'

  try {
    const response = await getSupplyChainAgents({ phase, sessionId: sid })
    const payload = unwrapApiData(response)
    if (payload && Array.isArray(payload.agents) && payload.agents.length > 0) {
      const payloadSessionId = payload.session_id || sid
      if (payloadSessionId && store.currentSessionId !== payloadSessionId) {
        store.setCurrentSessionId(payloadSessionId)
      }
      store.applyAgentDesignPayload(payloadSessionId, payload)
      return payload
    }
  } catch (error) {
    console.warn('[AgentSimulationStudio] getSupplyChainAgents failed:', error?.message || error)
  }

  // 兜底：会话存在但没有缓存设计 → 用 store 现有上下文调一次 setAgents 再拉取
  if (!sid) return null
  const tasks = Array.isArray(store.scenarioSubtasks)
    ? store.scenarioSubtasks.map((t) => t?.title || t?.description || '').filter(Boolean)
    : []
  let req = (store.scenarioUserGoal || '').trim()
  let apiResult = store.scenarioApiResult && typeof store.scenarioApiResult === 'object'
    ? store.scenarioApiResult
    : null
  let resolvedTasks = tasks

  if (!req || !apiResult || resolvedTasks.length === 0) {
    try {
      const sessionRes = await getSessionDetail(sid)
      const session = unwrapApiData(sessionRes)
      if (session && typeof session === 'object') {
        req = req || session.user_goal || session?.requirement?.raw_input || ''
        apiResult = apiResult || session.analysis_result || null
        if (resolvedTasks.length === 0) {
          resolvedTasks = Array.isArray(session?.tasks?.task_list) ? session.tasks.task_list : []
        }
      }
    } catch (error) {
      console.warn('[AgentSimulationStudio] getSessionDetail failed:', error?.message || error)
    }
  }

  if (!req || !apiResult || !resolvedTasks.length) return null

  try {
    const setRes = await setAgents(sid, { req, tasks: resolvedTasks, apiResult, phase })
    const setData = unwrapApiData(setRes)
    store.applySetAgentsResult(setData?.session_id || sid, setData)
    const reload = await getSupplyChainAgents({ phase, sessionId: sid })
    const payload = unwrapApiData(reload)
    if (payload && Array.isArray(payload.agents) && payload.agents.length > 0) {
      store.applyAgentDesignPayload(payload.session_id || sid, payload)
      return payload
    }
  } catch (error) {
    console.warn('[AgentSimulationStudio] auto setAgents failed:', error?.message || error)
  }

  // 最后兜底：复用 store 缓存
  if (store.agentDesignPayload && Array.isArray(store.agentDesignPayload.agents) && store.agentDesignPayload.agents.length > 0) {
    const cachedSid = store.agentDesignPayloadSessionId || store.agentDesignPayload?.session_id || null
    if (!sid || !cachedSid || cachedSid === sid) {
      return store.agentDesignPayload
    }
  }
  return null
}

onMounted(async () => {
  await ensureStudioViewQuery()
  const sid = currentSessionId.value
  if (sid && store.currentSessionId !== sid) {
    store.setCurrentSessionId(sid)
  }
  store.hydrateSetAgentsResultFromStorage()
  if (hasSimulationData.value) {
    // 上层显式传入的后端数据：直接用，跳过 catalog 拉取
    applySimulationDataProp()
    nextTick(() => {
      initFishBoneChart()
      window.addEventListener('resize', handleResize)
    })
    return
  }
  // 步骤 5 自启动：拉取或生成后端 agent 设计
  autoLoadedDesign.value = await bootstrapStudioFlow()
  if (hasAutoLoadedDesign.value) {
    applyAutoLoadedDesign()
    nextTick(() => {
      initFishBoneChart()
      window.addEventListener('resize', handleResize)
    })
    return
  }
  await refreshParameterCatalog()
  mergeSetAgentsIntoLocalList()
  nextTick(() => {
    initFishBoneChart()
    buildNodesFromAgents(agentList.value)
    window.addEventListener('resize', handleResize)
  })
})

watch(() => props.simulationData, (next) => {
  if (next?.session_id && store.currentSessionId !== next.session_id) {
    store.setCurrentSessionId(next.session_id)
  }
  if (next?.agents?.length) applySimulationDataProp()
})

watch(effectiveParameterCatalog, () => {
  if (hasSimulationData.value) return
  applyCatalogAgents()
  buildNodesFromAgents(agentList.value)
})

watch([setAgentsResult, setAgentsResultSessionId, currentSessionId], () => {
  mergeSetAgentsIntoLocalList()
})

watch(activeFishboneVariables, (newVars) => {
  syncFishboneOnVariablesChange(newVars)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})
</script>

<style scoped>
/* 全局样式 */
.workflow-page {
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  padding: 14px 16px 16px;
  gap: 12px;
}

.page-header {
  background: #fff;
  padding: 14px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  z-index: 10;
}

.header-content h1 {
  margin: 0;
  font-size: 20px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-content p {
  margin: 5px 0 0;
  color: #909399;
  font-size: 13px;
}

.enter-btn {
  background: linear-gradient(135deg, #409EFF, #337ecc);
  border: none;
}

.enter-studio-btn {
  background: linear-gradient(135deg, #409EFF, #337ecc);
  border: none;
  font-size: 12px;
}

.set-agents-sync-hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: #409eff;
  line-height: 1.45;
}

.auto-plan-hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: #1d4ed8;
  line-height: 1.5;
}

.queue-sync-hint {
  font-size: 11px;
  color: #909399;
  margin: 0 0 8px;
  line-height: 1.45;
}

.model-sync-hint {
  margin-bottom: 10px;
}

.queue-sync-hint code {
  font-size: 10px;
  padding: 0 4px;
  background: #f4f4f5;
  border-radius: 4px;
}

/* 主体布局：左侧1/3 + 右侧2/3 */
.main-container {
  display: flex;
  flex: 1;
  gap: 12px;
  padding: 0;
  overflow: hidden;
}

.auto-plan-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.auto-plan-bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 20px;
  align-items: stretch;
}

/* 左侧列：上中下三部分 */
.left-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.engine-dashboard {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
  gap: 14px;
}

.engine-side-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.engine-oooa-panel {
  margin: 0;
}

.engine-summary-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.engine-summary-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}

.engine-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #475569;
  padding: 7px 0;
  border-bottom: 1px dashed #e2e8f0;
}

.engine-summary-row:last-of-type {
  margin-bottom: 10px;
}

.engine-summary-row strong {
  color: #0f172a;
  max-width: 58%;
  text-align: right;
  word-break: break-all;
}

.queue-submit-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.queue-submit-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.queue-submit-desc {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.queue-submit-row {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: #334155;
  font-size: 13px;
}

.queue-submit-row strong {
  color: #0f172a;
}

.queue-submit-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.workflow-canvas-shell {
  flex: 1;
  min-width: 0;
}

/* 仿真工作室（关系图）视图：左列隐藏，画布全宽 */
.view-workflow-only .workflow-canvas-shell {
  width: 100%;
}

.view-auto-plan .main-container {
  display: block;
  overflow-y: auto;
}

/* 右侧列：占满剩余空间 */
.right-column {
  flex: 1;
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

/* 通用容器样式 */
.section-container {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-body {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

.method-dialog-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.45;
}

@media (max-width: 1280px) {
  .engine-dashboard {
    grid-template-columns: 1fr;
  }

  .auto-plan-bottom-grid {
    grid-template-columns: 1fr;
  }
}

/* 滚动条样式优化 */
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
</style>
