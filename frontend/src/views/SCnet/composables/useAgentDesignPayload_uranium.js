/**
 * 仿真工作室 / 仿真引擎 两步共享的数据加载逻辑。
 *
 * 抽自原 AgentWorkflowDisplay.vue + AgentSimulationStudioDemo.vue 重复代码：
 *  - 解析当前 sessionId + phase
 *  - 优先调用 getSupplyChainAgents 取后端落库快照
 *  - 取不到时按 store 拼装 setAgents 请求体，优先复用 setAgents 直接返回的设计，缺失时再 getSupplyChainAgents
 *  - 兜底使用 store.agentDesignPayload 缓存
 */

import { ref } from 'vue'
import { useScnetSupplyChainStore as useSupplyChainStore } from '@/stores/scnet'
import { getSupplyChainAgents } from '@/api/supplyChain'
import { setAgents } from '@/api/scnet/scenarioModelingV1'
import { getSessionDetail } from '@/api/scenarioSession'
import { normalizeAgentDesignResponse } from '@/api/scnet/_normalizers'
import { unwrapApiData } from '@/utils/session'
import { resolveScnetSessionId, writeScnetActiveContext } from '@/utils/session'
import { readScnetPhase } from '@/constants/scnetPhase'

export function useAgentDesignPayload(logTag = 'AgentDesignPayload') {
  const store = useSupplyChainStore()
  const simulationData = ref(null)
  const loadingData = ref(false)
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  const resolveSessionId = () => resolveScnetSessionId(store.currentSessionId) || null
  const resolvePhase = () => readScnetPhase()

  const bindSessionId = (sessionId) => {
    const sid = typeof sessionId === 'string' ? sessionId.trim() : ''
    if (!sid) return null
    if (store.currentSessionId !== sid) {
      store.setCurrentSessionId(sid)
    }
    writeScnetActiveContext({ sessionId: sid })
    return sid
  }

  const toTaskTitles = (subtasks = []) => (
    Array.isArray(subtasks)
      ? subtasks.map((t) => t?.title || t?.description || '').filter(Boolean)
      : []
  )

  const buildSetAgentsPayloadFromStore = async (sessionId) => {
    const phase = resolvePhase()
    const modelName = typeof store.scenarioRequirementMeta?.model_name === 'string'
      ? store.scenarioRequirementMeta.model_name.trim()
      : ''
    let req = (store.scenarioUserGoal || '').trim()
    let apiResult = store.scenarioApiResult && typeof store.scenarioApiResult === 'object'
      ? store.scenarioApiResult
      : null
    let tasks = toTaskTitles(store.scenarioTasks)

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
    return { req, tasks, apiResult, phase, model_name: modelName || 'qwen' }
  }

  const tryFetchAgentsSnapshot = async (
    sessionId,
    { attempts = 1, intervalMs = 1000, reason = '' } = {}
  ) => {
    const sid = bindSessionId(sessionId)
    if (!sid) return null

    for (let i = 0; i < attempts; i++) {
      try {
        const response = await getSupplyChainAgents({ phase: resolvePhase(), sessionId: sid })
        const data = normalizeAgentDesignResponse(unwrapApiData(response))
        if (Array.isArray(data.agents) && data.agents.length > 0) {
          const payloadSessionId = bindSessionId(data.session_id || sid) || sid
          store.applyAgentDesignPayload(payloadSessionId, data)
          writeScnetActiveContext({ sessionId: payloadSessionId, experimentId: data?.experiment_id || '' })
          return data
        }
      } catch (error) {
        if (i === attempts - 1) {
          const suffix = reason ? ` (${reason})` : ''
          console.warn(`[${logTag}] getSupplyChainAgents failed${suffix}:`, error?.message || error)
        }
      }

      if (i < attempts - 1) {
        await sleep(intervalMs)
      }
    }
    return null
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

    let setAgentsFailed = false
    if (!reuseCache || !hasSetAgentsCache) {
      const payload = await buildSetAgentsPayloadFromStore(boundSessionId)
      if (!payload) return null

      try {
        const setRes = await setAgents(boundSessionId, payload)
        const setData = normalizeAgentDesignResponse(unwrapApiData(setRes))
        const setSessionId = bindSessionId(setData?.session_id || boundSessionId) || boundSessionId
        store.applySetAgentsResult(setSessionId, setData)
        effectiveSessionId = setSessionId
        if (Array.isArray(setData.agents) && setData.agents.length > 0) {
          store.applyAgentDesignPayload(setSessionId, setData)
          writeScnetActiveContext({ sessionId: setSessionId, experimentId: setData?.experiment_id || '' })
          return setData
        }
      } catch (error) {
        console.warn(`[${logTag}] setAgents failed:`, error?.message || error)
        setAgentsFailed = true
      }
    }

    // setAgents 失败（常见为超时）时，后端可能仍在继续生成，短轮询一次落库快照。
    const snapshot = await tryFetchAgentsSnapshot(effectiveSessionId, {
      attempts: setAgentsFailed ? 8 : 2,
      intervalMs: 1500,
      reason: setAgentsFailed ? 'after-setAgents-timeout' : 'after-setAgents'
    })
    if (snapshot) return snapshot

    return null
  }

  const loadAgentDesignPayload = async ({ reuseCache = false } = {}) => {
    if (loadingData.value) return
    loadingData.value = true
    try {
      const sessionId = bindSessionId(resolveSessionId())

      const existing = await tryFetchAgentsSnapshot(sessionId, {
        attempts: 1,
        intervalMs: 0,
        reason: 'initial-load'
      })
      if (existing) {
        simulationData.value = existing
        return
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
