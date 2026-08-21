/**
 * SCnet 场景建模 Store
 * 管理五步流程的会话、需求、任务拆解、Agent 设计、场景上下文与环境配置
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSessionDetail, linkExperiment as linkExperimentApi } from '@/api/scenarioSession'
import { writeScnetActiveContext } from '@/utils/session'
import { readScnetPhase } from '@/constants/scnetPhase'

const safeParse = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export const useScnetScenarioStore = defineStore('scnetScenario', () => {
  // ---- 会话 ----
  const currentSessionId = ref(localStorage.getItem('sc_currentSessionId') || null)
  const currentSession = ref(null)
  const currentExperimentId = ref(localStorage.getItem('selectedExperimentId') || null)

  // ---- 需求 / 分析 ----
  const scenarioRequirementMeta = ref(safeParse('sc_scenarioRequirementMeta', null))
  const scenarioTasks = ref(safeParse('sc_scenarioTasks', []))
  const scenarioTaskResults = ref(safeParse('sc_scenarioTaskResults', []))
  const scenarioUserGoal = ref(localStorage.getItem('sc_scenarioUserGoal') || '')
  const scenarioApiResult = ref(safeParse('sc_scenarioApiResult', null))
  const scenarioVariableConfigs = ref(safeParse('sc_scenarioVariableConfigs', {}))

  // ---- Agent 配置与设计 ----
  const agentNodeConfigs = ref(safeParse('sc_agentNodeConfigs', {}))
  const setAgentsResult = ref(null)
  const setAgentsResultSessionId = ref(null)
  const agentDesignPayload = ref(safeParse('sc_agentDesignPayload', null))
  const agentDesignPayloadSessionId = ref(localStorage.getItem('sc_agentDesignPayloadSessionId') || null)

  // ---- 场景与环境 ----
  const scenarioContext = ref(safeParse('sc_scenarioContext', null) || {
    historicalBackground: '', initialEvent: '', currentProgress: '', completeTimeline: ''
  })
  const environmentConfig = ref(safeParse('sc_environmentConfig', null) || {
    simulationTime: '', maxSteps: 60, triggerEvents: [], historicEvents: []
  })

  // ---- Session 设计缓存 ----
  const sessionDesignCache = ref({})
  const currentSessionDesign = ref(null)

  function setCurrentSessionId(sessionId) {
    currentSessionId.value = sessionId
    localStorage.setItem('sc_currentSessionId', sessionId || '')
    writeScnetActiveContext({ sessionId })
  }

  function setCurrentExperimentId(experimentId) {
    currentExperimentId.value = experimentId || null
    localStorage.setItem('selectedExperimentId', experimentId || '')
    writeScnetActiveContext({ experimentId: experimentId || '' })
  }

  async function linkExperimentToSession(sessionId, experimentId) {
    const sid = sessionId || currentSessionId.value
    if (!sid || !experimentId) return
    setCurrentExperimentId(experimentId)
    try {
      await linkExperimentApi(sid, experimentId)
    } catch (e) {
      console.warn('[ScenarioStore] linkExperiment 失败:', e?.message || e)
    }
  }

  function setScenarioRequirementMeta(meta) {
    const next = meta && typeof meta === 'object' ? { ...meta } : null
    scenarioRequirementMeta.value = next
    if (next) localStorage.setItem('sc_scenarioRequirementMeta', JSON.stringify(next))
    else localStorage.removeItem('sc_scenarioRequirementMeta')
  }

  function setScenarioTasks({ tasks, taskResults } = {}) {
    if (Array.isArray(tasks)) {
      scenarioTasks.value = tasks
      localStorage.setItem('sc_scenarioTasks', JSON.stringify(tasks))
    }
    if (Array.isArray(taskResults)) {
      scenarioTaskResults.value = taskResults
      localStorage.setItem('sc_scenarioTaskResults', JSON.stringify(taskResults))
    }
  }

  function setScenarioAnalysis({ userGoal, apiResult } = {}) {
    if (userGoal !== undefined) {
      scenarioUserGoal.value = userGoal || ''
      localStorage.setItem('sc_scenarioUserGoal', scenarioUserGoal.value)
    }
    if (apiResult !== undefined) {
      scenarioApiResult.value = apiResult && typeof apiResult === 'object' ? apiResult : null
      localStorage.setItem('sc_scenarioApiResult', JSON.stringify(scenarioApiResult.value))
    }
  }

  function setScenarioContext(context) {
    const next = {
      historicalBackground: '', initialEvent: '', currentProgress: '', completeTimeline: '',
      ...(scenarioContext.value || {}), ...(context || {})
    }
    scenarioContext.value = next
    localStorage.setItem('sc_scenarioContext', JSON.stringify(next))
  }

  function setEnvironmentConfig(patch) {
    const next = { ...(environmentConfig.value || {}), ...(patch || {}) }
    environmentConfig.value = next
    localStorage.setItem('sc_environmentConfig', JSON.stringify(next))
  }

  function updateAgentNodeConfig(agentId, config) {
    agentNodeConfigs.value = {
      ...agentNodeConfigs.value,
      [agentId]: { ...agentNodeConfigs.value[agentId], ...config }
    }
    localStorage.setItem('sc_agentNodeConfigs', JSON.stringify(agentNodeConfigs.value))
  }

  function applySetAgentsResult(sessionId, payload) {
    setAgentsResultSessionId.value = sessionId || null
    setAgentsResult.value = payload && typeof payload === 'object' ? payload : null
    try {
      if (setAgentsResult.value) {
        localStorage.setItem('sc_setAgentsResult', JSON.stringify(setAgentsResult.value))
        localStorage.setItem('sc_setAgentsResultSessionId', sessionId || '')
      } else {
        localStorage.removeItem('sc_setAgentsResult')
        localStorage.removeItem('sc_setAgentsResultSessionId')
      }
    } catch (e) {
      console.warn('[ScenarioStore] 持久化 setAgents 失败', e)
    }
  }

  function hydrateSetAgentsResultFromStorage() {
    if (setAgentsResult.value) return
    try {
      const raw = localStorage.getItem('sc_setAgentsResult')
      const sid = localStorage.getItem('sc_setAgentsResultSessionId')
      if (!raw) return
      setAgentsResult.value = JSON.parse(raw)
      setAgentsResultSessionId.value = sid || null
    } catch (e) {
      console.warn('[ScenarioStore] 读取 setAgents 缓存失败', e)
    }
  }

  function applyAgentDesignPayload(sessionId, payload) {
    agentDesignPayloadSessionId.value = sessionId || null
    agentDesignPayload.value = payload && typeof payload === 'object' ? payload : null
    try {
      if (agentDesignPayload.value) {
        localStorage.setItem('sc_agentDesignPayload', JSON.stringify(agentDesignPayload.value))
        localStorage.setItem('sc_agentDesignPayloadSessionId', sessionId || '')
      } else {
        localStorage.removeItem('sc_agentDesignPayload')
        localStorage.removeItem('sc_agentDesignPayloadSessionId')
      }
    } catch (e) {
      console.warn('[ScenarioStore] 持久化 Agent 关系图失败', e)
    }
  }

  function updateScenarioVariableConfig(subtaskKey, patch) {
    if (!subtaskKey) return
    const prev = scenarioVariableConfigs.value[subtaskKey] || {}
    const next = { ...prev }
    if (patch.notes !== undefined) next.notes = patch.notes
    if (patch.paramOverrides !== undefined) next.paramOverrides = patch.paramOverrides
    scenarioVariableConfigs.value = { ...scenarioVariableConfigs.value, [subtaskKey]: next }
    localStorage.setItem('sc_scenarioVariableConfigs', JSON.stringify(scenarioVariableConfigs.value))
  }

  function clearScenarioState() {
    currentSessionId.value = null
    scenarioUserGoal.value = ''
    scenarioApiResult.value = null
    scenarioRequirementMeta.value = null
    scenarioTasks.value = []
    scenarioTaskResults.value = []
    agentNodeConfigs.value = {}
    scenarioVariableConfigs.value = {}
    setAgentsResult.value = null
    setAgentsResultSessionId.value = null
    agentDesignPayload.value = null
    agentDesignPayloadSessionId.value = null
    scenarioContext.value = {
      historicalBackground: '', initialEvent: '', currentProgress: '', completeTimeline: ''
    }
    ;[
      'sc_currentSessionId', 'sc_scenarioUserGoal',
      'sc_scenarioApiResult', 'sc_scenarioRequirementMeta', 'sc_scenarioTasks',
      'sc_scenarioTaskResults', 'sc_agentNodeConfigs', 'sc_scenarioVariableConfigs',
      'sc_setAgentsResult', 'sc_setAgentsResultSessionId', 'sc_agentDesignPayload',
      'sc_agentDesignPayloadSessionId', 'sc_scenarioContext', 'sc_scenarioSubtasks'
    ].forEach(k => localStorage.removeItem(k))
    writeScnetActiveContext({ sessionId: '' })
  }

  function commitStepResult(stepKey, payload = {}) {
    if (payload.sessionId) setCurrentSessionId(payload.sessionId)

    // 旧 5 步流程已合并为 'goal-input'；兼容历史快照与外部调用，统一收敛
    const GOAL_INPUT_LEGACY_KEYS = ['scenario-setup', 'requirement-input', 'smart-dialogue', 'target-input', 'analysis', 'modeling']
    const normalizedKey = GOAL_INPUT_LEGACY_KEYS.includes(stepKey) ? 'goal-input' : stepKey

    if (normalizedKey === 'goal-input') {
      if (payload.scenarioContext) setScenarioContext(payload.scenarioContext)
      if (payload.requirementMeta) setScenarioRequirementMeta(payload.requirementMeta)
      if (payload.userGoal !== undefined) {
        scenarioUserGoal.value = payload.userGoal
        localStorage.setItem('sc_scenarioUserGoal', scenarioUserGoal.value)
      }
      if (payload.apiResult !== undefined || payload.userGoal !== undefined) {
        setScenarioAnalysis({
          userGoal: payload.userGoal !== undefined ? payload.userGoal : scenarioUserGoal.value,
          apiResult: payload.apiResult
        })
      }
      if (payload.tasks || payload.taskResults) {
        setScenarioTasks({ tasks: payload.tasks, taskResults: payload.taskResults })
      }
      if (payload.setAgentsResult) {
        applySetAgentsResult(payload.sessionId || currentSessionId.value, payload.setAgentsResult)
      }
      if (payload.agentDesignPayload) {
        applyAgentDesignPayload(payload.sessionId || currentSessionId.value, payload.agentDesignPayload)
      }
      return
    }

    switch (normalizedKey) {
      case 'workflow':
        if (payload.setAgentsResult) {
          applySetAgentsResult(payload.sessionId || currentSessionId.value, payload.setAgentsResult)
        }
        if (payload.agentDesignPayload) {
          applyAgentDesignPayload(payload.sessionId || currentSessionId.value, payload.agentDesignPayload)
        }
        break
      case 'studio':
        if (payload.experimentId) {
          linkExperimentToSession(payload.sessionId || currentSessionId.value, payload.experimentId)
        }
        if (payload.environmentConfig) setEnvironmentConfig(payload.environmentConfig)
        break
    }
  }

  function applyScenarioSnapshot(detail) {
    if (!detail || typeof detail !== 'object') return
    const sid = detail.session_id
    if (sid) setCurrentSessionId(sid)

    const requirement = detail.requirement || {}
    if (requirement && Object.keys(requirement).length > 0) {
      setScenarioRequirementMeta({
        goal: requirement.goal || '',
        variable: requirement.variable || '',
        object: requirement.object || '',
        is_legal: !!requirement.is_legal,
        analysis_phase: requirement.analysis_phase || '',
        raw_input: requirement.raw_input || requirement.user_input || ''
      })
      const userGoal = requirement.raw_input || requirement.user_input || ''
      if (userGoal) {
        scenarioUserGoal.value = userGoal
        localStorage.setItem('sc_scenarioUserGoal', userGoal)
      }
    }

    if (detail.scenario_context && typeof detail.scenario_context === 'object') {
      const ctx = detail.scenario_context
      setScenarioContext({
        historicalBackground: ctx.historical_background || '',
        initialEvent: ctx.initial_event || '',
        currentProgress: ctx.current_progress || '',
        completeTimeline: ctx.complete_timeline || ''
      })
    }

    const analysisResult = detail.analysis_result || null
    if (analysisResult) {
      setScenarioAnalysis({
        userGoal: scenarioUserGoal.value, apiResult: analysisResult
      })
    }

    const tasksObj = detail.tasks || {}
    const taskList = Array.isArray(tasksObj.task_list) ? tasksObj.task_list : []
    const resultsMap = tasksObj.task_results && typeof tasksObj.task_results === 'object'
      ? tasksObj.task_results : {}
    const taskResults = taskList.map((_, idx) => {
      const v = resultsMap[String(idx)]
      if (v === undefined || v === null) return null
      if (typeof v === 'string') { try { return JSON.parse(v) } catch { return v } }
      return v
    })
    setScenarioTasks({ tasks: taskList, taskResults })

    const workflow = detail.workflow || {}
    const designByPhase = workflow.agent_design_by_phase || {}
    const phaseKey = requirement.analysis_phase
      || readScnetPhase()
    const designForPhase = designByPhase[phaseKey] || designByPhase.during || null
    if (designForPhase && Array.isArray(designForPhase.agents) && designForPhase.agents.length > 0) {
      applyAgentDesignPayload(sid, designForPhase)
      if (designForPhase.set_agents_result || designForPhase.setAgents) {
        applySetAgentsResult(sid, designForPhase.set_agents_result || designForPhase.setAgents)
      }
    }

    if (detail.linked_experiment_id) setCurrentExperimentId(detail.linked_experiment_id)
  }

  async function loadSession(sessionId) {
    try {
      const response = await getSessionDetail(sessionId)
      if (response.success) {
        currentSession.value = response.data
        setCurrentSessionId(sessionId)
      } else {
        throw new Error(response.error || '获取会话详情失败')
      }
    } catch (error) {
      console.error('[ScenarioStore] 加载会话失败:', error)
      throw error
    }
  }

  async function loadSessionDesign(sessionId) {
    const cached = sessionDesignCache.value[sessionId]
    const now = Date.now()
    const CACHE_TTL = 30 * 60 * 1000

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      currentSessionDesign.value = cached.data
      return cached.data
    }

    try {
      const response = await getSessionDetail(sessionId)
      const sessionData = response.data
      sessionDesignCache.value[sessionId] = { data: sessionData, timestamp: now }
      currentSessionDesign.value = sessionData
      return sessionData
    } catch (error) {
      console.error('[ScenarioStore] 加载 session 设计失败:', error)
      throw error
    }
  }

  function clearSessionCache() {
    sessionDesignCache.value = {}
    currentSessionDesign.value = null
  }

  return {
    currentSessionId, currentSession, currentExperimentId,
    scenarioRequirementMeta, scenarioTasks, scenarioTaskResults,
    scenarioUserGoal, scenarioApiResult, scenarioVariableConfigs,
    agentNodeConfigs, setAgentsResult, setAgentsResultSessionId,
    agentDesignPayload, agentDesignPayloadSessionId,
    scenarioContext, environmentConfig,
    sessionDesignCache, currentSessionDesign,

    setCurrentSessionId, setCurrentExperimentId, linkExperimentToSession,
    setScenarioRequirementMeta, setScenarioTasks, setScenarioAnalysis,
    setScenarioContext, setEnvironmentConfig, updateAgentNodeConfig,
    applySetAgentsResult, hydrateSetAgentsResultFromStorage,
    applyAgentDesignPayload, updateScenarioVariableConfig, clearScenarioState,
    commitStepResult, applyScenarioSnapshot,
    loadSession, loadSessionDesign, clearSessionCache
  }
})
