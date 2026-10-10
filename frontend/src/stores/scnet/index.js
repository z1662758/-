/**
 * SCnet 兼容聚合 Store
 *
 * Phase 5 拆分后，业务域分为 3 个独立 Pinia store：
 *   - useScnetScenarioStore  → 场景建模、会话、Agent 设计
 *   - useScnetExperimentStore → 实验、时序、协作网络、分析
 *   - useScnetQueueStore     → 队列与任务历史
 *
 * 本文件提供旧 `useSupplyChainStore()` 的兼容入口。
 * 内部用显式字段映射把 3 个子 store 的 refs/computeds/actions 合并成
 * 一个 store，保持老调用方的 `store.xxx` 和 `storeToRefs(store)` 语义。
 *
 * 新代码请直接使用 useScnetXxxStore，本兼容层后续可平滑移除。
 */

import { defineStore, storeToRefs } from 'pinia'
import { useScnetScenarioStore } from './useScenarioStore'
import { useScnetExperimentStore } from './useExperimentStore'
import { useScnetQueueStore } from './useQueueStore'

export { useScnetScenarioStore, useScnetExperimentStore, useScnetQueueStore }

export const useScnetSupplyChainStore = defineStore('scnetSupplyChain', () => {
  const scenario = useScnetScenarioStore()
  const experiment = useScnetExperimentStore()
  const queue = useScnetQueueStore()

  const sRefs = storeToRefs(scenario)
  const eRefs = storeToRefs(experiment)
  const qRefs = storeToRefs(queue)

  return {
    // Scenario refs
    currentSessionId: sRefs.currentSessionId,
    currentSession: sRefs.currentSession,
    currentExperimentId: sRefs.currentExperimentId,
    scenarioRequirementMeta: sRefs.scenarioRequirementMeta,
    scenarioTasks: sRefs.scenarioTasks,
    scenarioTaskResults: sRefs.scenarioTaskResults,
    scenarioUserGoal: sRefs.scenarioUserGoal,
    scenarioApiResult: sRefs.scenarioApiResult,
    scenarioVariableConfigs: sRefs.scenarioVariableConfigs,
    agentNodeConfigs: sRefs.agentNodeConfigs,
    setAgentsResult: sRefs.setAgentsResult,
    setAgentsResultSessionId: sRefs.setAgentsResultSessionId,
    agentDesignPayload: sRefs.agentDesignPayload,
    agentDesignPayloadSessionId: sRefs.agentDesignPayloadSessionId,
    scenarioContext: sRefs.scenarioContext,
    environmentConfig: sRefs.environmentConfig,
    sessionDesignCache: sRefs.sessionDesignCache,
    currentSessionDesign: sRefs.currentSessionDesign,

    // Experiment refs / getters
    experiments: eRefs.experiments,
    currentExperiment: eRefs.currentExperiment,
    currentIteration: eRefs.currentIteration,
    currentMonth: eRefs.currentMonth,
    timelineData: eRefs.timelineData,
    portsData: eRefs.portsData,
    collaborationNetwork: eRefs.collaborationNetwork,
    iterationsComparison: eRefs.iterationsComparison,
    experimentReport: eRefs.experimentReport,
    chatHistory: eRefs.chatHistory,
    goalDecompositionLog: eRefs.goalDecompositionLog,
    isPlaying: eRefs.isPlaying,
    playbackSpeed: eRefs.playbackSpeed,
    playbackTimer: eRefs.playbackTimer,
    loading: eRefs.loading,
    errors: eRefs.errors,
    cache: eRefs.cache,
    currentIterationData: eRefs.currentIterationData,
    currentEnvironment: eRefs.currentEnvironment,
    currentNetwork: eRefs.currentNetwork,
    currentPerformance: eRefs.currentPerformance,
    filteredCollaborationEdges: eRefs.filteredCollaborationEdges,
    totalMonths: eRefs.totalMonths,
    totalIterations: eRefs.totalIterations,
    isLoading: eRefs.isLoading,
    hasErrors: eRefs.hasErrors,
    currentIterationComparison: eRefs.currentIterationComparison,
    networkHealthScore: eRefs.networkHealthScore,

    // Queue refs
    queueStatus: qRefs.queueStatus,
    taskHistory: qRefs.taskHistory,

    // Scenario actions
    setCurrentSessionId: scenario.setCurrentSessionId,
    linkExperimentToSession: scenario.linkExperimentToSession,
    setScenarioRequirementMeta: scenario.setScenarioRequirementMeta,
    setScenarioTasks: scenario.setScenarioTasks,
    setScenarioAnalysis: scenario.setScenarioAnalysis,
    setScenarioContext: scenario.setScenarioContext,
    setEnvironmentConfig: scenario.setEnvironmentConfig,
    updateAgentNodeConfig: scenario.updateAgentNodeConfig,
    applySetAgentsResult: scenario.applySetAgentsResult,
    hydrateSetAgentsResultFromStorage: scenario.hydrateSetAgentsResultFromStorage,
    applyAgentDesignPayload: scenario.applyAgentDesignPayload,
    updateScenarioVariableConfig: scenario.updateScenarioVariableConfig,
    clearScenarioState: scenario.clearScenarioState,
    commitStepResult: scenario.commitStepResult,
    applyScenarioSnapshot: scenario.applyScenarioSnapshot,
    loadSession: scenario.loadSession,
    loadSessionDesign: scenario.loadSessionDesign,
    clearSessionCache: scenario.clearSessionCache,

    // Experiment actions
    fetchExperiments: experiment.fetchExperiments,
    loadExperiment: experiment.loadExperiment,
    loadPorts: experiment.loadPorts,
    fetchCollaborationNetwork: experiment.fetchCollaborationNetwork,
    loadTimeline: experiment.loadTimeline,
    loadIterationTimeline: experiment.loadIterationTimeline,
    loadIterationLazy: experiment.loadIterationLazy,
    loadIterationsComparison: experiment.loadIterationsComparison,
    loadExperimentReport: experiment.loadExperimentReport,
    loadChatHistory: experiment.loadChatHistory,
    loadGoalDecompositionLog: experiment.loadGoalDecompositionLog,
    setIteration: experiment.setIteration,
    setMonth: experiment.setMonth,
    playTimeline: experiment.playTimeline,
    pauseTimeline: experiment.pauseTimeline,
    setPlaybackSpeed: experiment.setPlaybackSpeed,
    resetTimeline: experiment.resetTimeline,
    clearError: experiment.clearError,
    clearCache: experiment.clearCache,
    setCurrentExperimentId: experiment.setCurrentExperimentId,
    selectExperiment: experiment.selectExperiment,
    isCacheValid: experiment.isCacheValid,

    // Queue actions
    fetchQueueStatus: queue.fetchQueueStatus,
    updateQueueStatus: queue.updateQueueStatus,
    cancelQueueTask: queue.cancelQueueTask,
    submitExperimentTask: queue.submitExperimentTask,
    fetchTaskHistory: queue.fetchTaskHistory
  }
})
