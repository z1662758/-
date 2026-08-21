/**
 * 仿真工作室 / 仿真引擎 两步共享的数据加载逻辑。
 *
 * 抽自原 AgentWorkflowDisplay.vue + AgentSimulationStudioDemo.vue 重复代码：
 *  - 解析当前 sessionId + phase
 *  - 优先调用 getSupplyChainAgents 取后端落库快照
 *  - 取不到时按 store 拼装 setAgents 请求体，调 setAgents 后再 getSupplyChainAgents
 *  - 兜底使用 store.agentDesignPayload 缓存
 */

import { ref } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { getSupplyChainAgents } from '@/api/supplyChain'
import { setAgents } from '@/api/scenarioModeling'
import { getSessionDetail } from '@/api/scenarioSession'
import { unwrapApiData } from '@/utils/apiEnvelope'

export function useAgentDesignPayload(logTag = 'AgentDesignPayload') {
  const store = useSupplyChainStore()
  const simulationData = ref(null)
  const loadingData = ref(false)

  const resolveSessionId = () => store.currentSessionId || localStorage.getItem('sc_currentSessionId') || null
  const resolvePhase = () => localStorage.getItem('scnet_phaseSelection') || 'during'

  const bindSessionId = (sessionId) => {
    const sid = typeof sessionId === 'string' ? sessionId.trim() : ''
    if (!sid) return null
    if (store.currentSessionId !== sid) {
      store.setCurrentSessionId(sid)
    }
    return sid
  }

  const toTaskTitles = (subtasks = []) => (
    Array.isArray(subtasks)
      ? subtasks.map((t) => t?.title || t?.description || '').filter(Boolean)
      : []
  )

  const buildSetAgentsPayloadFromStore = async (sessionId) => {
    const phase = resolvePhase()
    let req = (store.scenarioUserGoal || '').trim()
    let apiResult = store.scenarioApiResult && typeof store.scenarioApiResult === 'object'
      ? store.scenarioApiResult
      : null
    let tasks = toTaskTitles(store.scenarioSubtasks)

    if ((!req || !apiResult || tasks.length === 0) && sessionId) {
      try {
        const sessionRes = await getSessionDetail(sessionId)
        const session = unwrapApiData(sessionRes)
        if (session && typeof session === 'object') {
          req = req || session.user_goal || session?.requirement?.raw_input || ''
          apiResult = apiResult || session.analysis_result || null
          if (tasks.length === 0) {
            tasks = Array.isArray(session?.tasks?.task_list) ? session.tasks.task_list : []
          }
        }
      } catch (error) {
        console.warn(`[${logTag}] getSessionDetail failed:`, error?.message || error)
      }
    }

    if (!req || !apiResult || !tasks.length) return null
    return { req, tasks, apiResult, phase }
  }

  const ensureSetAgentsAndReload = async (sessionId, { reuseCache = false } = {}) => {
    const boundSessionId = bindSessionId(sessionId)
    if (!boundSessionId) return null
    let effectiveSessionId = boundSessionId

    const hasSetAgentsCache = !!(
      store.setAgentsResult &&
      store.setAgentsResultSessionId &&
      store.setAgentsResultSessionId === boundSessionId
    )

    if (!reuseCache || !hasSetAgentsCache) {
      const payload = await buildSetAgentsPayloadFromStore(boundSessionId)
      if (!payload) return null

      try {
        const setRes = await setAgents(boundSessionId, payload)
        const setData = unwrapApiData(setRes)
        const setSessionId = bindSessionId(setData?.session_id || boundSessionId) || boundSessionId
        store.applySetAgentsResult(setSessionId, setData)
        effectiveSessionId = setSessionId
      } catch (error) {
        console.warn(`[${logTag}] setAgents failed:`, error?.message || error)
        return null
      }
    }

    try {
      const response = await getSupplyChainAgents({ phase: resolvePhase(), sessionId: effectiveSessionId })
      const data = unwrapApiData(response)
      if (data && Array.isArray(data.agents) && data.agents.length > 0) {
        const payloadSessionId = bindSessionId(data.session_id || effectiveSessionId) || effectiveSessionId
        store.applyAgentDesignPayload(payloadSessionId, data)
        return data
      }
    } catch (error) {
      console.warn(`[${logTag}] reload getSupplyChainAgents failed:`, error?.message || error)
    }
    return null
  }

  const loadAgentDesignPayload = async ({ reuseCache = false } = {}) => {
    if (loadingData.value) return
    loadingData.value = true
    try {
      const sessionId = bindSessionId(resolveSessionId())

      try {
        const response = await getSupplyChainAgents({ phase: resolvePhase(), sessionId })
        const payload = unwrapApiData(response)
        if (payload && Array.isArray(payload.agents) && payload.agents.length > 0) {
          const payloadSessionId = bindSessionId(payload.session_id || sessionId) || sessionId
          simulationData.value = payload
          store.applyAgentDesignPayload(payloadSessionId, payload)
          return
        }
      } catch (error) {
        console.warn(`[${logTag}] getSupplyChainAgents failed:`, error?.message || error)
      }

      const generated = await ensureSetAgentsAndReload(sessionId, { reuseCache })
      if (generated) {
        simulationData.value = generated
        return
      }

      const cached = store.agentDesignPayload
      if (cached && Array.isArray(cached.agents) && cached.agents.length > 0) {
        const cachedSid = store.agentDesignPayloadSessionId || cached.session_id || null
        if (!sessionId || !cachedSid || cachedSid === sessionId) {
          bindSessionId(cachedSid)
          simulationData.value = cached
          return
        }
      }
      simulationData.value = null
    } finally {
      loadingData.value = false
    }
  }

  return {
    simulationData,
    loadingData,
    loadAgentDesignPayload
  }
}
