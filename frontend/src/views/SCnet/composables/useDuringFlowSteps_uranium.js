import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useScnetScenarioStore } from '@/stores/scnet/useScenarioStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'

export const DURING_FLOW_STEPS = [
  { key: 'setup', label: '建模设定', route: SCNET_ROUTES.modelingSetup, query: {} },
  // 与左侧菜单保持同名：菜单叫「想定生成」，这里不再另起「需求拆解」
  { key: 'analysis', label: '想定生成', route: SCNET_ROUTES.scenarioAnalysis, query: {} },
  { key: 'workflow', label: '实体关系图', route: SCNET_ROUTES.agentSimulationStudio, query: { view: 'workflow' } },
  { key: 'experiment', label: '实验推演', route: SCNET_ROUTES.experimentManager, query: { view: 'run' } },
  { key: 'decision', label: '决策方案', route: SCNET_ROUTES.experimentManager, query: { view: 'decision' } },
]

export function routeToStepKey(routePath, routeQuery = {}) {
  if (!routePath) return ''
  if (routePath.startsWith(SCNET_ROUTES.modelingSetup)) return 'setup'
  if (routePath.startsWith(SCNET_ROUTES.scenarioAnalysis)) return 'analysis'
  if (routePath.startsWith(SCNET_ROUTES.agentSimulationStudio)) return 'workflow'
  if (routePath.startsWith(SCNET_ROUTES.experimentManager)) {
    return routeQuery.view === 'decision' ? 'decision' : 'experiment'
  }
  if (routePath.startsWith(SCNET_ROUTES.interface)) return 'experiment'
  return ''
}

function buildCompletionMap(s) {
  const hasApiResult = !!s.scenarioApiResult
  const hasSnapshot = !!s.activeSnapshotId
  const hasSetAgentsForSession = !!(
    s.setAgentsResult &&
    (!s.currentSessionId || s.setAgentsResultSessionId === s.currentSessionId)
  )
  const hasAgentDesignForSession = !!(
    s.agentDesignPayload &&
    Array.isArray(s.agentDesignPayload.agents) &&
    s.agentDesignPayload.agents.length > 0 &&
    (!s.currentSessionId || s.agentDesignPayloadSessionId === s.currentSessionId)
  )
  const hasWorkflowData = hasSetAgentsForSession || hasAgentDesignForSession || hasSnapshot
  return {
    // 建模设定只是展示基线，一旦进入需求拆解即视为完成
    setup: hasApiResult || hasSnapshot || !!s.currentSessionId,
    analysis: hasApiResult || hasSnapshot,
    workflow: hasWorkflowData,
    experiment: s.hasCompletedExperiment,
    decision: s.hasCompletedExperiment && s.hasRecommendations,
  }
}

export function useDuringFlowSteps() {
  const scenarioStore = useScnetScenarioStore()
  const snapshotStore = useAnalysisSnapshotStore()
  const experimentStore = useUraniumDemoStore()
  // 实体就绪不代表实验已完成；完成标记只读取当前会话对应的实验结果。
  const completedExperiment = computed(() => {
    const experiment = experimentStore.selectedExperiment
    if (!experiment) return null
    const task = experimentStore.taskRows.find(item => item.experiment_id === experiment.experiment_id)
    if (task?.status !== 'completed') return null
    if (scenarioStore.currentSessionId && task.session_id !== scenarioStore.currentSessionId) return null
    return experiment.result?.timeline?.length ? experiment : null
  })

  const {
    currentSessionId,
    scenarioApiResult,
    setAgentsResult,
    setAgentsResultSessionId,
    agentDesignPayload,
    agentDesignPayloadSessionId,
  } = storeToRefs(scenarioStore)
  const { activeSnapshotId } = storeToRefs(snapshotStore)
  const completedMap = computed(() => buildCompletionMap({
    currentSessionId: currentSessionId.value,
    scenarioApiResult: scenarioApiResult.value,
    setAgentsResult: setAgentsResult.value,
    setAgentsResultSessionId: setAgentsResultSessionId.value,
    agentDesignPayload: agentDesignPayload.value,
    agentDesignPayloadSessionId: agentDesignPayloadSessionId.value,
    activeSnapshotId: activeSnapshotId.value,
    hasCompletedExperiment: !!completedExperiment.value,
    hasRecommendations: !!(
      completedExperiment.value?.report?.recommendations?.length
      || completedExperiment.value?.report?.best_report?.recommendations?.length
    ),
  }))

  function isStepCompleted(stepKey) {
    return !!completedMap.value[stepKey]
  }

  return {
    steps: DURING_FLOW_STEPS,
    isStepCompleted,
  }
}
