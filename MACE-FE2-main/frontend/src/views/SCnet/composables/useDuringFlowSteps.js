import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSupplyChainStore } from '@/stores/supplyChain'

/**
 * SCnet 事中流程的 5 步（对齐学长 PowerGame）
 *  1. 场景设定         → /home/SCnet/scenarioModeling?step=scenario-setup
 *  2. 需求输入         → /home/SCnet/scenarioModeling?step=requirement-input
 *  3. 智能对话         → /home/SCnet/scenarioModeling?step=smart-dialogue
 *  4. 仿真工作室       → /home/SCnet/agent-design-studio?view=workflow
 *  5. 仿真引擎         → /home/SCnet/agentSimulationStudio?view=studio
 */
export const DURING_FLOW_STEPS = [
  { key: 'scenario-setup',     label: '场景设定', route: '/home/SCnet/scenarioModeling', query: { step: 'scenario-setup' } },
  { key: 'requirement-input',  label: '需求输入', route: '/home/SCnet/scenarioModeling', query: { step: 'requirement-input' } },
  { key: 'smart-dialogue',     label: '智能对话', route: '/home/SCnet/scenarioModeling', query: { step: 'smart-dialogue' } },
  { key: 'workflow',           label: '仿真工作室', route: '/home/SCnet/agent-design-studio', query: { view: 'workflow' } },
  { key: 'studio',             label: '仿真引擎', route: '/home/SCnet/agentSimulationStudio', query: { view: 'studio' } }
]

/**
 * 把当前路由（path + query）映射为某一步的 key。
 * 用于步骤条 active 高亮。
 */
export function routeToStepKey(routePath, routeQuery = {}) {
  if (!routePath) return ''
  if (routePath.startsWith('/home/SCnet/scenarioModeling')) {
    const step = routeQuery.step
    if (step === 'requirement-input') return 'requirement-input'
    if (step === 'smart-dialogue')    return 'smart-dialogue'
    return 'scenario-setup'
  }
  if (routePath.startsWith('/home/SCnet/agent-design-studio')) {
    return 'workflow'
  }
  if (routePath.startsWith('/home/SCnet/agentSimulationStudio')) {
    return 'studio'
  }
  return ''
}

/**
 * 完成判定：
 *  - scenario-setup    完成于 scenarioContext 已填写或 sessionId 已建
 *  - requirement-input 完成于 scenarioApiResult 存在
 *  - smart-dialogue    完成于 scenarioApiResult.goal_decomposition / subtasks 已就绪
 *  - workflow          完成于 setAgents/getAgents 已产出可用智能体配置
 *  - studio            完成于 workflow 完成（步骤5共用同一套智能体配置）
 */
function buildCompletionMap(s) {
  const hasScenarioContext = !!(s.scenarioContext && (
    (s.scenarioContext.historicalBackground || '').trim() ||
    (s.scenarioContext.initialEvent || '').trim() ||
    (s.scenarioContext.currentProgress || '').trim()
  ))
  const hasSession = !!s.currentSessionId
  const hasApiResult = !!s.scenarioApiResult
  const hasDecomposition = !!(s.scenarioApiResult && (s.scenarioApiResult.goal_decomposition || s.scenarioApiResult.subtasks))
  const hasSubtasks = Array.isArray(s.scenarioSubtasks) && s.scenarioSubtasks.length > 0
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
  const hasWorkflowData = hasSetAgentsForSession || hasAgentDesignForSession
  return {
    'scenario-setup':    hasScenarioContext || hasSession,
    'requirement-input': hasApiResult,
    'smart-dialogue':    hasDecomposition,
    'workflow':          hasSubtasks && hasWorkflowData,
    'studio':            hasWorkflowData
  }
}

export function useDuringFlowSteps() {
  const store = useSupplyChainStore()
  const {
    currentSessionId,
    scenarioApiResult,
    scenarioSubtasks,
    scenarioContext,
    setAgentsResult,
    setAgentsResultSessionId,
    agentDesignPayload,
    agentDesignPayloadSessionId
  } = storeToRefs(store)

  const completedMap = computed(() => buildCompletionMap({
    currentSessionId: currentSessionId.value,
    scenarioApiResult: scenarioApiResult.value,
    scenarioSubtasks: scenarioSubtasks.value,
    scenarioContext: scenarioContext.value,
    setAgentsResult: setAgentsResult.value,
    setAgentsResultSessionId: setAgentsResultSessionId.value,
    agentDesignPayload: agentDesignPayload.value,
    agentDesignPayloadSessionId: agentDesignPayloadSessionId.value
  }))

  function isStepCompleted(stepKey) {
    return !!completedMap.value[stepKey]
  }

  return {
    steps: DURING_FLOW_STEPS,
    isStepCompleted
  }
}
