import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useScnetScenarioStore } from '@/stores/scnet/useScenarioStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { useUraniumDuringStore } from '@/stores/scnet/useUraniumDuringStore'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'

export const DURING_FLOW_STEPS = [
  { key: 'analysis', label: '智能对话', route: SCNET_ROUTES.scenarioAnalysis, query: {} },
  { key: 'workflow', label: '实体图', route: SCNET_ROUTES.agentSimulationStudio, query: { view: 'workflow' } },
  { key: 'experiment', label: '实验运行', route: SCNET_ROUTES.experimentManager, query: {} },
  { key: 'result', label: '推演界面', route: SCNET_ROUTES.interface, query: {} },
]

export function routeToStepKey(routePath) {
  if (!routePath) return ''
  if (routePath.startsWith(SCNET_ROUTES.scenarioAnalysis)) return 'analysis'
  if (routePath.startsWith(SCNET_ROUTES.agentSimulationStudio)) return 'workflow'
  if (routePath.startsWith(SCNET_ROUTES.experimentManager)) return 'experiment'
  if (routePath.startsWith(SCNET_ROUTES.interface)) return 'result'
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
  const hasExperimentHistory = Array.isArray(s.history) && s.history.length > 0
  const hasExperimentResult = !!s.currentExperiment || hasExperimentHistory

  return {
    analysis: hasApiResult || hasSnapshot,
    workflow: hasWorkflowData,
    experiment: hasExperimentHistory,
    result: hasExperimentResult,
  }
}

export function useDuringFlowSteps() {
  const scenarioStore = useScnetScenarioStore()
  const snapshotStore = useAnalysisSnapshotStore()
  const uraniumStore = useUraniumDuringStore()

  const {
    currentSessionId,
    scenarioApiResult,
    setAgentsResult,
    setAgentsResultSessionId,
    agentDesignPayload,
    agentDesignPayloadSessionId,
  } = storeToRefs(scenarioStore)
  const { activeSnapshotId } = storeToRefs(snapshotStore)
  // 该 store 暴露的是 selectedExperiment（没有 currentExperiment），
  // 直接解构 currentExperiment 会拿到 undefined，读 .value 时抛错。
  const { history, selectedExperiment } = storeToRefs(uraniumStore)

  const completedMap = computed(() => buildCompletionMap({
    currentSessionId: currentSessionId.value,
    scenarioApiResult: scenarioApiResult.value,
    setAgentsResult: setAgentsResult.value,
    setAgentsResultSessionId: setAgentsResultSessionId.value,
    agentDesignPayload: agentDesignPayload.value,
    agentDesignPayloadSessionId: agentDesignPayloadSessionId.value,
    activeSnapshotId: activeSnapshotId.value,
    history: history.value,
    currentExperiment: selectedExperiment.value,
  }))

  function isStepCompleted(stepKey) {
    return !!completedMap.value[stepKey]
  }

  return {
    steps: DURING_FLOW_STEPS,
    isStepCompleted,
  }
}
