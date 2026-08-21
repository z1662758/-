/**
 * SCnet 实验 Store
 * 管理实验数据、时序、协作网络、迭代分析、对话历史、目标拆解日志，
 * 以及月度时间轴播放与 loading / errors / cache。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getExperiments, getExperimentDetail, getPorts, getTimeline, getTimelineIteration,
  getIterationsComparison, getExperimentReport, getChatHistory, getGoalDecompositionLog,
  getCollaborationNetwork
} from '@/api/supplyChain'
import { retry, errorBoundary } from '@/utils/performance'
import { writeScnetActiveContext } from '@/utils/session'

export const useScnetExperimentStore = defineStore('scnetExperiment', () => {
  const experiments = ref([])
  const currentExperiment = ref(null)
  const currentExperimentId = ref(localStorage.getItem('selectedExperimentId') || null)
  const currentIteration = ref(0)
  const currentMonth = ref(0)

  const timelineData = ref({
    experiment_id: null, total_iterations: 0, iterations: [], loaded_iterations: new Set()
  })
  const portsData = ref([])
  const collaborationNetwork = ref({
    edges: [], nodes: [], total_edges: 0, total_nodes: 0, loaded: false
  })

  const iterationsComparison = ref(null)
  const experimentReport = ref(null)
  const chatHistory = ref([])
  const goalDecompositionLog = ref(null)

  const isPlaying = ref(false)
  const playbackSpeed = ref(1.0)
  const playbackTimer = ref(null)

  const loading = ref({
    experiments: false, experiment: false, ports: false, timeline: false,
    comparison: false, workflow: false, risk: false, report: false,
    chat: false, decomposition: false, collaboration: false
  })
  const errors = ref({
    experiments: null, experiment: null, ports: null, timeline: null,
    comparison: null, workflow: null, risk: null, report: null,
    chat: null, decomposition: null, collaboration: null
  })
  const cache = ref({
    lastUpdated: {},
    ttl: {
      experiments: 5 * 60 * 1000, experiment: 30 * 60 * 1000,
      timeline: 60 * 60 * 1000, comparison: 60 * 60 * 1000,
      workflow: 60 * 60 * 1000, report: 24 * 60 * 60 * 1000
    }
  })

  // ===== Getters =====

  const currentIterationData = computed(() => {
    const its = timelineData.value.iterations || []
    return its.length > currentIteration.value ? (its[currentIteration.value] || {}) : {}
  })

  const currentEnvironment = computed(() => {
    const its = timelineData.value.iterations || []
    if (its.length > currentIteration.value) {
      const it = its[currentIteration.value]
      const env = it.environment || []
      if (env.length > currentMonth.value) {
        return {
          ...env[currentMonth.value],
          context_type: it.context_type,
          trend_slope: it.trend_slope,
          description: it.description
        }
      }
    }
    return {}
  })

  const currentNetwork = computed(() => {
    const its = timelineData.value.iterations || []
    if (its.length > currentIteration.value) {
      const network = its[currentIteration.value].network || []
      return network.length > currentMonth.value ? (network[currentMonth.value] || {}) : {}
    }
    return {}
  })

  const currentPerformance = computed(() => {
    const its = timelineData.value.iterations || []
    if (its.length > currentIteration.value) {
      const perf = its[currentIteration.value].performance || []
      return perf.length > currentMonth.value ? (perf[currentMonth.value] || {}) : {}
    }
    return {}
  })

  const filteredCollaborationEdges = computed(() => {
    const edges = collaborationNetwork.value.edges
    if (!edges || edges.length === 0) return []
    const baseYear = 2024, baseMonth = 1
    const offset = currentMonth.value
    const year = baseYear + Math.floor((baseMonth - 1 + offset) / 12)
    const month = ((baseMonth - 1 + offset) % 12) + 1
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    return edges.filter(e => e.first_month <= monthStr && monthStr <= e.last_month)
  })

  const totalMonths = computed(() => {
    const its = timelineData.value.iterations || []
    return its.length > currentIteration.value ? (its[currentIteration.value].duration || 0) : 0
  })

  const totalIterations = computed(() => timelineData.value.total_iterations || 0)
  const isLoading = computed(() => Object.values(loading.value).some(v => v))
  const hasErrors = computed(() => Object.values(errors.value).some(v => v !== null))

  const currentIterationComparison = computed(() => {
    if (!iterationsComparison.value) return null
    return iterationsComparison.value.iterations_summary?.find(
      i => i.iteration === currentIteration.value + 1
    )
  })

  const networkHealthScore = computed(() => {
    const network = currentNetwork.value
    const perf = currentPerformance.value
    if (!network || !perf) return 0
    const density = network.collaboration_count / (network.total_enterprises || 1)
    const completionRate = perf.order_completion_rate || 0
    return Math.round((density * 0.4 + completionRate * 0.6) * 100)
  })

  function isCacheValid(key) {
    const lastUpdate = cache.value.lastUpdated[key]
    const ttl = cache.value.ttl[key]
    if (!lastUpdate || !ttl) return false
    return Date.now() - lastUpdate < ttl
  }

  // ===== Actions =====

  async function fetchExperiments() {
    loading.value.experiments = true
    errors.value.experiments = null
    try {
      const response = await retry(() => getExperiments(), 3, 1000)
      if (response.success) experiments.value = response.data || []
      else throw new Error(response.message || '获取实验列表失败')
    } catch (error) {
      errors.value.experiments = error.message
      throw error
    } finally {
      loading.value.experiments = false
    }
  }

  async function loadExperiment(experimentId) {
    if (currentExperimentId.value === experimentId && currentExperiment.value) return
    loading.value.experiment = true
    errors.value.experiment = null
    try {
      const response = await retry(() => getExperimentDetail(experimentId), 2, 1000)
      if (response.success) {
        currentExperiment.value = response.data
        currentExperimentId.value = experimentId
        localStorage.setItem('selectedExperimentId', experimentId || '')
        writeScnetActiveContext({ experimentId })
        currentIteration.value = 0
        currentMonth.value = 0
        await errorBoundary(
          () => loadTimeline(experimentId),
          (err) => console.warn('[ExperimentStore] 时序加载失败:', err.message)
        )()
      } else {
        throw new Error(response.message || '获取实验详情失败')
      }
    } catch (error) {
      errors.value.experiment = error.message
      throw error
    } finally {
      loading.value.experiment = false
    }
  }

  async function loadPorts() {
    loading.value.ports = true
    errors.value.ports = null
    try {
      const response = await getPorts()
      if (response.success) portsData.value = response.data || []
      else throw new Error(response.message || '获取港口数据失败')
    } catch (error) {
      errors.value.ports = error.message
      throw error
    } finally {
      loading.value.ports = false
    }
  }

  async function fetchCollaborationNetwork() {
    if (collaborationNetwork.value.loaded) return
    loading.value.collaboration = true
    errors.value.collaboration = null
    try {
      const response = await getCollaborationNetwork()
      if (response.success) {
        collaborationNetwork.value = {
          edges: response.data.edges || [],
          nodes: response.data.nodes || [],
          total_edges: response.data.total_edges || 0,
          total_nodes: response.data.total_nodes || 0,
          loaded: true
        }
      } else {
        throw new Error(response.message || '获取协作网络失败')
      }
    } catch (error) {
      errors.value.collaboration = error.message
    } finally {
      loading.value.collaboration = false
    }
  }

  async function loadTimeline(experimentId) {
    loading.value.timeline = true
    errors.value.timeline = null
    try {
      const response = await getTimeline(experimentId)
      if (response.success) {
        timelineData.value = response.data || {
          experiment_id: null, total_iterations: 0, iterations: []
        }
      } else {
        throw new Error(response.message || '获取时序数据失败')
      }
    } catch (error) {
      errors.value.timeline = error.message
      throw error
    } finally {
      loading.value.timeline = false
    }
  }

  async function loadIterationTimeline(experimentId, iteration = 0, detailLevel = 'basic') {
    loading.value.timeline = true
    errors.value.timeline = null
    try {
      const response = await getTimelineIteration(experimentId, iteration, detailLevel)
      if (response.success) {
        if (!timelineData.value.experiment_id || timelineData.value.experiment_id !== experimentId) {
          timelineData.value = {
            experiment_id: experimentId,
            total_iterations: response.data.total_iterations || 1,
            iterations: [], loaded_iterations: new Set()
          }
        }
        const iterData = response.data.iteration_data
        if (iterData) {
          timelineData.value.iterations[iteration] = iterData
          timelineData.value.loaded_iterations.add(iteration)
        }
      } else {
        throw new Error(response.message || '获取迭代时序数据失败')
      }
    } catch (error) {
      errors.value.timeline = error.message
      throw error
    } finally {
      loading.value.timeline = false
    }
  }

  async function loadIterationLazy(iteration) {
    if (timelineData.value.loaded_iterations.has(iteration)) return
    loading.value.timeline = true
    errors.value.timeline = null
    try {
      const response = await getTimelineIteration(currentExperimentId.value, iteration, 'basic')
      if (response.success && response.data.iterations && response.data.iterations.length > 0) {
        const iterData = response.data.iterations[0]
        const idx = iteration - 1
        if (idx >= 0) {
          while (timelineData.value.iterations.length <= idx) {
            timelineData.value.iterations.push(null)
          }
          timelineData.value.iterations[idx] = iterData
          timelineData.value.loaded_iterations.add(iteration)
        }
      } else {
        throw new Error(response.message || '加载迭代数据失败')
      }
    } catch (error) {
      errors.value.timeline = error.message
      throw error
    } finally {
      loading.value.timeline = false
    }
  }

  async function loadIterationsComparison(experimentId) {
    if (iterationsComparison.value?.experiment_id === experimentId && isCacheValid('comparison')) return
    loading.value.comparison = true
    errors.value.comparison = null
    try {
      const response = await getIterationsComparison(experimentId)
      if (response.success) {
        iterationsComparison.value = response.data
        cache.value.lastUpdated.comparison = Date.now()
      } else {
        throw new Error(response.message || '获取迭代对比失败')
      }
    } catch (error) {
      errors.value.comparison = error.message
      throw error
    } finally {
      loading.value.comparison = false
    }
  }

  async function loadExperimentReport(experimentId) {
    if (experimentReport.value?.experiment_id === experimentId && isCacheValid('report')) return
    loading.value.report = true
    errors.value.report = null
    try {
      const response = await getExperimentReport(experimentId)
      if (response.success) {
        experimentReport.value = response.data
        cache.value.lastUpdated.report = Date.now()
      } else {
        throw new Error(response.message || '获取实验报告失败')
      }
    } catch (error) {
      errors.value.report = error.message
      throw error
    } finally {
      loading.value.report = false
    }
  }

  async function loadChatHistory(experimentId) {
    if (chatHistory.value.length > 0 && isCacheValid('chat')) return
    loading.value.chat = true
    errors.value.chat = null
    try {
      const response = await getChatHistory(experimentId)
      if (response.success) {
        chatHistory.value = response.data?.chat_messages || []
        cache.value.lastUpdated.chat = Date.now()
      } else {
        throw new Error(response.message || '获取对话历史失败')
      }
    } catch (error) {
      errors.value.chat = error.message
    } finally {
      loading.value.chat = false
    }
  }

  async function loadGoalDecompositionLog(experimentId) {
    if (goalDecompositionLog.value && isCacheValid('decomposition')) return
    loading.value.decomposition = true
    errors.value.decomposition = null
    try {
      const response = await getGoalDecompositionLog(experimentId)
      if (response.success) {
        goalDecompositionLog.value = response.data
        cache.value.lastUpdated.decomposition = Date.now()
      } else {
        throw new Error(response.message || '获取目标拆解日志失败')
      }
    } catch (error) {
      errors.value.decomposition = error.message
    } finally {
      loading.value.decomposition = false
    }
  }

  function setIteration(iteration) {
    if (iteration >= 0 && iteration < totalIterations.value) {
      currentIteration.value = iteration
      currentMonth.value = 0
    }
  }

  function setMonth(month) {
    if (month >= 0 && month < totalMonths.value) currentMonth.value = month
  }

  function playTimeline() {
    if (isPlaying.value) return
    isPlaying.value = true
    let lastFrameTime = performance.now()
    const interval = 1000 / playbackSpeed.value
    let rafId = null

    const animate = (currentTime) => {
      if (!isPlaying.value) {
        if (rafId) cancelAnimationFrame(rafId)
        return
      }
      const elapsed = currentTime - lastFrameTime
      if (elapsed >= interval) {
        lastFrameTime = currentTime - (elapsed % interval)
        const next = currentMonth.value + 1
        if (next < totalMonths.value) setMonth(next)
        else { pauseTimeline(); return }
      }
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    playbackTimer.value = rafId
  }

  function pauseTimeline() {
    if (playbackTimer.value) {
      cancelAnimationFrame(playbackTimer.value)
      playbackTimer.value = null
    }
    isPlaying.value = false
  }

  function setPlaybackSpeed(speed) {
    if ([0.5, 1.0, 2.0].includes(speed)) {
      playbackSpeed.value = speed
      if (isPlaying.value) { pauseTimeline(); playTimeline() }
    }
  }

  function resetTimeline() {
    pauseTimeline()
    currentIteration.value = 0
    currentMonth.value = 0
  }

  function clearError(key = null) {
    if (key && key in errors.value) errors.value[key] = null
    else Object.keys(errors.value).forEach(k => { errors.value[k] = null })
  }

  function clearCache(key = null) {
    if (key) {
      delete cache.value.lastUpdated[key]
      switch (key) {
        case 'comparison': iterationsComparison.value = null; break
        case 'report': experimentReport.value = null; break
        case 'chat': chatHistory.value = []; break
        case 'decomposition': goalDecompositionLog.value = null; break
      }
    } else {
      cache.value.lastUpdated = {}
      iterationsComparison.value = null
      experimentReport.value = null
      chatHistory.value = []
      goalDecompositionLog.value = null
    }
  }

  function setCurrentExperimentId(experimentId) {
    currentExperimentId.value = experimentId || null
    localStorage.setItem('selectedExperimentId', experimentId || '')
    writeScnetActiveContext({ experimentId: experimentId || '' })
  }

  async function selectExperiment(experimentId) {
    try {
      await loadExperiment(experimentId)
      localStorage.setItem('selectedExperimentId', experimentId)
    } catch (error) {
      console.error('[ExperimentStore] 选择实验失败:', error)
      throw error
    }
  }

  return {
    experiments, currentExperiment, currentExperimentId,
    currentIteration, currentMonth, timelineData, portsData, collaborationNetwork,
    iterationsComparison, experimentReport, chatHistory, goalDecompositionLog,
    isPlaying, playbackSpeed, playbackTimer, loading, errors, cache,

    currentIterationData, currentEnvironment, currentNetwork, currentPerformance,
    filteredCollaborationEdges, totalMonths, totalIterations,
    isLoading, hasErrors, currentIterationComparison, networkHealthScore, isCacheValid,

    fetchExperiments, loadExperiment, loadPorts, fetchCollaborationNetwork,
    loadTimeline, loadIterationTimeline, loadIterationLazy,
    loadIterationsComparison, loadExperimentReport, loadChatHistory, loadGoalDecompositionLog,
    setIteration, setMonth, playTimeline, pauseTimeline, setPlaybackSpeed, resetTimeline,
    clearError, clearCache, setCurrentExperimentId, selectExperiment
  }
})
