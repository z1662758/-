/**
 * Supply Chain Store
 * 供应链场景状态管理（Pinia）
 *
 * @author SGM-MSE Team
 * @date 2026-01-13
 */

import { defineStore } from 'pinia'
import {
  getExperiments,
  getExperimentDetail,
  getPorts,
  getTimeline,
  getTimelineIteration,
  getIterationsComparison,
  getExperimentReport,
  getChatHistory,
  getGoalDecompositionLog,
  getCollaborationNetwork
} from '@/api/supplyChain'
import { getSessionDetail } from '@/api/scenarioSession'
import { submitToQueue, getQueueStatus, cancelTask, getQueueHistory } from '@/api/queue'
import { retry, errorBoundary } from '@/utils/performance'
import {
  streamlineExperimentData,
  streamlineTimelineData,
  getObjectSize
} from '@/utils/dataFilter'
import { io } from 'socket.io-client'

export const useSupplyChainStore = defineStore('supplyChain', {
  state: () => ({
    // 实验列表
    experiments: [],

    // 当前实验（用户选择的实验，持久化）
    currentExperiment: null,
    currentExperimentId: localStorage.getItem('selectedExperimentId') || null,

    // 当前选择的迭代索引（0开始）
    currentIteration: 0,

    // 当前月份索引（0开始，0-20共21个月）
    currentMonth: 0,

    // 时序数据（新结构：包含多个迭代，每个迭代有21个月）
    timelineData: {
      experiment_id: null,
      total_iterations: 0,
      iterations: [],
      loaded_iterations: new Set() // 已加载的迭代编号（用于懒加载）
    },

    // 港口聚合数据
    portsData: [],

    // 协作网络图数据
    collaborationNetwork: {
      edges: [],
      nodes: [],
      total_edges: 0,
      total_nodes: 0,
      loaded: false
    },

    // 分析数据（缓存）
    iterationsComparison: null,
    experimentReport: null,

    // 对话历史和目标拆解数据
    chatHistory: [],
    goalDecompositionLog: null,

    // 场景建模会话（持久化到 localStorage）
    currentSessionId: localStorage.getItem('sc_currentSessionId') || null,
    currentSession: null,

    // 场景分析结果（跨页面传递，持久化到 localStorage）
    scenarioSubtasks: JSON.parse(localStorage.getItem('sc_scenarioSubtasks') || '[]'),
    scenarioUserGoal: localStorage.getItem('sc_scenarioUserGoal') || '',
    scenarioApiResult: JSON.parse(localStorage.getItem('sc_scenarioApiResult') || 'null'),
    agentNodeConfigs: JSON.parse(localStorage.getItem('sc_agentNodeConfigs') || '{}'),  // { [agentId]: { model, selectedMethod, note } }
    /** 目标拆解子任务在鱼骨图侧的补充配置：{ [subtaskKey]: { notes, paramOverrides } } */
    scenarioVariableConfigs: JSON.parse(localStorage.getItem('sc_scenarioVariableConfigs') || '{}'),

    /** /setAgents 返回的智能体配置（与 currentSessionId 对应） */
    setAgentsResult: null,
    setAgentsResultSessionId: null,

    /** 后端返回的 Agent 关系图（agents + relationship_net + attribute_explain）—— 仿真工作室画布数据源 */
    agentDesignPayload: JSON.parse(localStorage.getItem('sc_agentDesignPayload') || 'null'),
    agentDesignPayloadSessionId: localStorage.getItem('sc_agentDesignPayloadSessionId') || null,

    /** 步骤1 场景设定上下文（事中专属字段会按需启用） */
    scenarioContext: JSON.parse(localStorage.getItem('sc_scenarioContext') || 'null') || {
      historicalBackground: '',
      initialEvent: '',
      currentProgress: '',
      completeTimeline: ''
    },

    /** 步骤5 仿真环境配置（模拟时间、触发事件、历史事件） */
    environmentConfig: JSON.parse(localStorage.getItem('sc_environmentConfig') || 'null') || {
      simulationTime: '',
      maxSteps: 60,
      triggerEvents: [],
      historicEvents: []
    },

    // 时间轴播放状态
    isPlaying: false,
    playbackSpeed: 1.0, // 播放速度（0.5x, 1x, 2x）
    playbackTimer: null,

    // 队列状态
    queueStatus: {
      position: 0,
      totalInQueue: 0,
      totalPending: 0,
      totalRunning: 0,
      estimatedWaitTime: 0,
      currentTaskId: null,
      status: 'idle' // idle/queued/running/completed
    },

    // WebSocket连接
    socket: null,
    socketConnected: false,

    // 加载状态
    loading: {
      experiments: false,
      experiment: false,
      ports: false,
      timeline: false,
      comparison: false,
      workflow: false,
      risk: false,
      report: false,
      chat: false,
      decomposition: false,
      collaboration: false
    },

    // 错误信息
    errors: {
      experiments: null,
      experiment: null,
      ports: null,
      timeline: null,
      comparison: null,
      workflow: null,
      risk: null,
      report: null,
      chat: null,
      decomposition: null,
      collaboration: null
    },

    // 缓存元数据
    cache: {
      lastUpdated: {},
      ttl: {
        experiments: 5 * 60 * 1000,    // 5分钟
        experiment: 30 * 60 * 1000,    // 30分钟
        timeline: 60 * 60 * 1000,      // 1小时
        comparison: 60 * 60 * 1000,    // 1小时
        workflow: 60 * 60 * 1000,      // 1小时
        report: 24 * 60 * 60 * 1000    // 24小时
      }
    },

    // Session设计数据缓存
    sessionDesignCache: {}, // { session_id: { data, timestamp } }
    currentSessionDesign: null, // 当前查看的session设计

    // 任务历史（集中管理）
    taskHistory: []
  }),

  getters: {
    /**
     * 获取当前迭代的完整数据
     */
    currentIterationData: (state) => {
      const iterations = state.timelineData.iterations || []
      if (iterations.length > state.currentIteration) {
        return iterations[state.currentIteration] || {}
      }
      return {}
    },

    /**
     * 获取当前月份的环境数据
     */
    currentEnvironment: (state) => {
      const iterations = state.timelineData.iterations || []
      if (iterations.length > state.currentIteration) {
        const iteration = iterations[state.currentIteration]
        const environment = iteration.environment || []
        if (environment.length > state.currentMonth) {
          // 返回月度环境数据，同时包含迭代级别的信息
          return {
            ...environment[state.currentMonth],
            context_type: iteration.context_type,
            trend_slope: iteration.trend_slope,
            description: iteration.description
          }
        }
      }
      return {}
    },

    /**
     * 获取当前月份的网络数据
     */
    currentNetwork: (state) => {
      const iterations = state.timelineData.iterations || []
      if (iterations.length > state.currentIteration) {
        const iteration = iterations[state.currentIteration]
        const network = iteration.network || []
        if (network.length > state.currentMonth) {
          return network[state.currentMonth] || {}
        }
      }
      return {}
    },

    /**
     * 获取当前月份的性能数据
     */
    currentPerformance: (state) => {
      const iterations = state.timelineData.iterations || []
      if (iterations.length > state.currentIteration) {
        const iteration = iterations[state.currentIteration]
        const performance = iteration.performance || []
        if (performance.length > state.currentMonth) {
          return performance[state.currentMonth] || {}
        }
      }
      return {}
    },

    /**
     * 按当前月份过滤协作网络边
     * currentMonth (0-20) 映射到 "2024-01" ~ "2025-09"
     */
    filteredCollaborationEdges: (state) => {
      const edges = state.collaborationNetwork.edges
      if (!edges || edges.length === 0) return []

      const baseYear = 2024
      const baseMonth = 1
      const totalOffset = state.currentMonth
      const year = baseYear + Math.floor((baseMonth - 1 + totalOffset) / 12)
      const month = ((baseMonth - 1 + totalOffset) % 12) + 1
      const monthStr = `${year}-${String(month).padStart(2, '0')}`

      return edges.filter(e =>
        e.first_month <= monthStr && monthStr <= e.last_month
      )
    },

    /**
     * 获取当前迭代的总月数
     */
    totalMonths: (state) => {
      const iterations = state.timelineData.iterations || []
      if (iterations.length > state.currentIteration) {
        return iterations[state.currentIteration].duration || 0
      }
      return 0
    },

    /**
     * 获取实验总迭代数
     */
    totalIterations: (state) => {
      return state.timelineData.total_iterations || 0
    },

    /**
     * 检查是否有数据加载中
     */
    isLoading: (state) => {
      return Object.values(state.loading).some(v => v)
    },

    /**
     * 检查是否有错误
     */
    hasErrors: (state) => {
      return Object.values(state.errors).some(v => v !== null)
    },

    /**
     * 获取当前迭代的对比数据
     */
    currentIterationComparison: (state) => {
      if (!state.iterationsComparison) return null
      return state.iterationsComparison.iterations_summary?.find(
        i => i.iteration === state.currentIteration + 1 // 注意：currentIteration是0-based，实际迭代是1-based
      )
    },

    /**
     * 网络健康评分
     */
    networkHealthScore: (state) => {
      const network = state.currentNetwork
      const perf = state.currentPerformance

      if (!network || !perf) return 0

      const density = network.collaboration_count / (network.total_enterprises || 1)
      const completionRate = perf.order_completion_rate || 0

      return Math.round((density * 0.4 + completionRate * 0.6) * 100)
    },

    /**
     * 缓存有效性检查
     */
    isCacheValid: (state) => (key) => {
      const lastUpdate = state.cache.lastUpdated[key]
      const ttl = state.cache.ttl[key]

      if (!lastUpdate || !ttl) return false

      return Date.now() - lastUpdate < ttl
    }
  },

  actions: {
    /**
     * 获取实验列表
     */
    async fetchExperiments() {
      this.loading.experiments = true
      this.errors.experiments = null

      try {
        // 添加重试机制
        const response = await retry(
          () => getExperiments(),
          3, // 最多重试3次
          1000 // 重试延迟1秒
        )

        if (response.success) {
          this.experiments = response.data || []
          console.log(`[SupplyChain Store] 加载了 ${this.experiments.length} 个实验`)
        } else {
          throw new Error(response.message || '获取实验列表失败')
        }
      } catch (error) {
        console.error('[SupplyChain Store] 获取实验列表失败:', error)
        this.errors.experiments = error.message
        throw error
      } finally {
        this.loading.experiments = false
      }
    },

    /**
     * 加载指定实验
     * @param {string} experimentId - 实验ID
     */
    async loadExperiment(experimentId) {
      // 防止重复加载同一个实验
      if (this.currentExperimentId === experimentId && this.currentExperiment) {
        console.log(`[SupplyChain Store] 实验 ${experimentId} 已加载，跳过`)
        return
      }

      this.loading.experiment = true
      this.errors.experiment = null

      try {
        // 添加重试机制
        const response = await retry(
          () => getExperimentDetail(experimentId),
          2, // 最多重试2次
          1000
        )

        if (response.success) {
          this.currentExperiment = response.data
          this.currentExperimentId = experimentId
          localStorage.setItem('selectedExperimentId', experimentId || '')
          this.currentIteration = 0 // 重置到第0次迭代
          this.currentMonth = 0 // 重置到第0个月
          console.log(`[SupplyChain Store] 加载实验: ${experimentId}`)

          // 自动加载时序数据（使用错误边界）
          await errorBoundary(
            () => this.loadTimeline(experimentId),
            (error) => {
              console.warn('[SupplyChain Store] 时序数据加载失败，将在后续加载:', error.message)
              // 不抛出错误，允许继续使用基本实验数据
            }
          )()
        } else {
          throw new Error(response.message || '获取实验详情失败')
        }
      } catch (error) {
        console.error('[SupplyChain Store] 加载实验失败:', error)
        this.errors.experiment = error.message
        throw error
      } finally {
        this.loading.experiment = false
      }
    },

    /**
     * 加载港口数据
     */
    async loadPorts() {
      this.loading.ports = true
      this.errors.ports = null

      try {
        const response = await getPorts()

        if (response.success) {
          this.portsData = response.data || []
          console.log(`[SupplyChain Store] 加载了 ${this.portsData.length} 个港口`)
        } else {
          throw new Error(response.message || '获取港口数据失败')
        }
      } catch (error) {
        console.error('[SupplyChain Store] 加载港口数据失败:', error)
        this.errors.ports = error.message
        throw error
      } finally {
        this.loading.ports = false
      }
    },

    /**
     * 加载协作网络图数据（全量加载，客户端按月过滤）
     */
    async fetchCollaborationNetwork() {
      if (this.collaborationNetwork.loaded) {
        console.log('[SupplyChain Store] 协作网络数据已缓存')
        return
      }

      this.loading.collaboration = true
      this.errors.collaboration = null

      try {
        const response = await getCollaborationNetwork()

        if (response.success) {
          this.collaborationNetwork = {
            edges: response.data.edges || [],
            nodes: response.data.nodes || [],
            total_edges: response.data.total_edges || 0,
            total_nodes: response.data.total_nodes || 0,
            loaded: true
          }
          console.log(`[SupplyChain Store] 加载协作网络: ${this.collaborationNetwork.total_nodes} 节点, ${this.collaborationNetwork.total_edges} 边`)
        } else {
          throw new Error(response.message || '获取协作网络数据失败')
        }
      } catch (error) {
        console.error('[SupplyChain Store] 加载协作网络失败:', error)
        this.errors.collaboration = error.message
      } finally {
        this.loading.collaboration = false
      }
    },

    /**
     * 加载时序数据
     * @param {string} experimentId - 实验ID
     */
    async loadTimeline(experimentId) {
      this.loading.timeline = true
      this.errors.timeline = null

      try {
        const response = await getTimeline(experimentId)

        if (response.success) {
          this.timelineData = response.data || {
            experiment_id: null,
            total_iterations: 0,
            iterations: []
          }
          console.log(
            `[SupplyChain Store] 加载时序数据: ${this.totalIterations} 次迭代，` +
            `当前迭代 ${this.totalMonths} 个月`
          )
        } else {
          throw new Error(response.message || '获取时序数据失败')
        }
      } catch (error) {
        console.error('[SupplyChain Store] 加载时序数据失败:', error)
        this.errors.timeline = error.message
        throw error
      } finally {
        this.loading.timeline = false
      }
    },

    /**
     * 加载单个迭代的时序数据（懒加载优化）
     * @param {string} experimentId - 实验ID
     * @param {number} iteration - 迭代编号（从0开始）
     * @param {string} detailLevel - 详细程度 'basic' 或 'full'
     */
    async loadIterationTimeline(experimentId, iteration = 0, detailLevel = 'basic') {
      this.loading.timeline = true
      this.errors.timeline = null

      try {
        const response = await getTimelineIteration(experimentId, iteration, detailLevel)

        if (response.success) {
          // 初始化 timelineData 结构
          if (!this.timelineData.experiment_id || this.timelineData.experiment_id !== experimentId) {
            this.timelineData = {
              experiment_id: experimentId,
              total_iterations: response.data.total_iterations || 1,
              iterations: [],
              loaded_iterations: new Set()
            }
          }

          // 将迭代数据插入到正确的位置
          const iterationData = response.data.iteration_data
          if (iterationData) {
            this.timelineData.iterations[iteration] = iterationData
            this.timelineData.loaded_iterations.add(iteration)
            console.log(`[SupplyChain Store] 加载迭代 ${iteration} 的时序数据 (${detailLevel})`)
          }
        } else {
          throw new Error(response.message || '获取迭代时序数据失败')
        }
      } catch (error) {
        console.error('[SupplyChain Store] 加载迭代时序数据失败:', error)
        this.errors.timeline = error.message
        throw error
      } finally {
        this.loading.timeline = false
      }
    },

    /**
     * 设置当前迭代
     * @param {number} iteration - 迭代索引（从0开始）
     */
    setIteration(iteration) {
      const totalIterations = this.totalIterations
      if (iteration >= 0 && iteration < totalIterations) {
        this.currentIteration = iteration
        this.currentMonth = 0 // 切换迭代时重置月份
        console.log(`[SupplyChain Store] 切换到第 ${iteration + 1} 次迭代`)
      } else {
        console.warn(`[SupplyChain Store] 无效的迭代: ${iteration}，有效范围: 0-${totalIterations - 1}`)
      }
    },

    /**
     * 设置当前月份
     * @param {number} month - 月份索引（从0开始）
     */
    setMonth(month) {
      const totalMonths = this.totalMonths
      if (month >= 0 && month < totalMonths) {
        this.currentMonth = month
        console.log(`[SupplyChain Store] 切换到第 ${month + 1} 个月`)
      } else {
        console.warn(`[SupplyChain Store] 无效的月份: ${month}，有效范围: 0-${totalMonths - 1}`)
      }
    },

    /**
     * 播放时间轴（按月度演化，在当前迭代内）
     * 使用 requestAnimationFrame 实现平滑播放，避免 setInterval 时间漂移
     */
    playTimeline() {
      if (this.isPlaying) {
        console.warn('[SupplyChain Store] 时间轴已经在播放')
        return
      }

      this.isPlaying = true
      let lastFrameTime = performance.now()
      const interval = 1000 / this.playbackSpeed // 每个月间隔（毫秒）
      let animationFrameId = null

      const animate = (currentTime) => {
        if (!this.isPlaying) {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId)
          }
          return
        }

        const elapsed = currentTime - lastFrameTime

        if (elapsed >= interval) {
          // 补偿时间漂移
          lastFrameTime = currentTime - (elapsed % interval)
          const nextMonth = this.currentMonth + 1

          if (nextMonth < this.totalMonths) {
            this.setMonth(nextMonth)
          } else {
            // 播放结束，停止
            this.pauseTimeline()
            console.log('[SupplyChain Store] 时间轴播放结束')
            return
          }
        }

        animationFrameId = requestAnimationFrame(animate)
      }

      animationFrameId = requestAnimationFrame(animate)
      this.playbackTimer = animationFrameId // 存储用于暂停

      console.log(`[SupplyChain Store] 开始播放月度时间轴，速度: ${this.playbackSpeed}x`)
    },

    /**
     * 暂停时间轴
     */
    pauseTimeline() {
      if (this.playbackTimer) {
        cancelAnimationFrame(this.playbackTimer)
        this.playbackTimer = null
      }
      this.isPlaying = false
      console.log('[SupplyChain Store] 暂停时间轴')
    },

    /**
     * 设置播放速度
     * @param {number} speed - 播放速度（0.5, 1.0, 2.0）
     */
    setPlaybackSpeed(speed) {
      const validSpeeds = [0.5, 1.0, 2.0]
      if (validSpeeds.includes(speed)) {
        this.playbackSpeed = speed

        // 如果正在播放，需要重新启动定时器
        if (this.isPlaying) {
          this.pauseTimeline()
          this.playTimeline()
        }

        console.log(`[SupplyChain Store] 设置播放速度: ${speed}x`)
      } else {
        console.warn(`[SupplyChain Store] 无效的播放速度: ${speed}，有效值: ${validSpeeds.join(', ')}`)
      }
    },

    /**
     * 重置时间轴到开始
     */
    resetTimeline() {
      this.pauseTimeline()
      this.currentIteration = 0
      this.currentMonth = 0
      console.log('[SupplyChain Store] 重置时间轴到第1次迭代第1个月')
    },

    /**
     * 清除错误信息
     * @param {string} key - 错误键名，不传则清除所有
     */
    clearError(key = null) {
      if (key && this.errors.hasOwnProperty(key)) {
        this.errors[key] = null
      } else {
        Object.keys(this.errors).forEach(k => {
          this.errors[k] = null
        })
      }
    },

    /**
     * 懒加载单个迭代数据
     * @param {number} iteration - 迭代编号
     */
    async loadIterationLazy(iteration) {
      // 检查是否已加载
      if (this.timelineData.loaded_iterations.has(iteration)) {
        console.log(`[SupplyChain Store] 迭代 ${iteration} 已缓存，跳过加载`)
        return
      }

      this.loading.timeline = true
      this.errors.timeline = null

      try {
        const response = await getTimelineIteration(this.currentExperimentId, iteration, 'basic')

        if (response.success && response.data.iterations && response.data.iterations.length > 0) {
          const iterationData = response.data.iterations[0]
          // 将迭代数据插入到对应位置
          const iterIndex = iteration - 1 // 迭代编号从1开始，数组索引从0开始
          if (iterIndex >= 0) {
            // 确保数组足够长
            while (this.timelineData.iterations.length <= iterIndex) {
              this.timelineData.iterations.push(null)
            }
            this.timelineData.iterations[iterIndex] = iterationData
            this.timelineData.loaded_iterations.add(iteration)
            console.log(`[SupplyChain Store] 懒加载迭代 ${iteration} 成功`)
          }
        } else {
          throw new Error(response.message || '加载迭代数据失败')
        }
      } catch (error) {
        console.error(`[SupplyChain Store] 懒加载迭代 ${iteration} 失败:`, error)
        this.errors.timeline = error.message
        throw error
      } finally {
        this.loading.timeline = false
      }
    },

    /**
     * 加载迭代对比数据
     * @param {string} experimentId - 实验ID
     */
    async loadIterationsComparison(experimentId) {
      // 检查缓存
      if (this.iterationsComparison?.experiment_id === experimentId && this.isCacheValid('comparison')) {
        console.log('[SupplyChain Store] 迭代对比数据已缓存')
        return
      }

      this.loading.comparison = true
      this.errors.comparison = null

      try {
        const response = await getIterationsComparison(experimentId)

        if (response.success) {
          this.iterationsComparison = response.data
          this.cache.lastUpdated.comparison = Date.now()
          console.log(`[SupplyChain Store] 加载迭代对比数据: ${response.data.total_iterations} 轮迭代`)
        } else {
          throw new Error(response.message || '获取迭代对比数据失败')
        }
      } catch (error) {
        console.error('[SupplyChain Store] 加载迭代对比数据失败:', error)
        this.errors.comparison = error.message
        throw error
      } finally {
        this.loading.comparison = false
      }
    },

    /**
     * 加载实验报告
     * @param {string} experimentId - 实验ID
     */
    async loadExperimentReport(experimentId) {
      // 检查缓存
      if (this.experimentReport?.experiment_id === experimentId && this.isCacheValid('report')) {
        console.log('[SupplyChain Store] 实验报告已缓存')
        return
      }

      this.loading.report = true
      this.errors.report = null

      try {
        const response = await getExperimentReport(experimentId)

        if (response.success) {
          this.experimentReport = response.data
          this.cache.lastUpdated.report = Date.now()
          console.log(`[SupplyChain Store] 加载实验报告: ${response.data.report_sections ? Object.keys(response.data.report_sections).length : 0} 个章节`)
        } else {
          throw new Error(response.message || '获取实验报告失败')
        }
      } catch (error) {
        console.error('[SupplyChain Store] 加载实验报告失败:', error)
        this.errors.report = error.message
        throw error
      } finally {
        this.loading.report = false
      }
    },

    /**
     * 清除缓存
     * @param {string} key - 缓存键名，不传则清除所有
     */
    clearCache(key = null) {
      if (key) {
        delete this.cache.lastUpdated[key]

        switch (key) {
          case 'comparison':
            this.iterationsComparison = null
            break
          case 'report':
            this.experimentReport = null
            break
          case 'chat':
            this.chatHistory = []
            break
          case 'decomposition':
            this.goalDecompositionLog = null
            break
        }
        console.log(`[SupplyChain Store] 清除缓存: ${key}`)
      } else {
        this.cache.lastUpdated = {}
        this.iterationsComparison = null
        this.experimentReport = null
        this.chatHistory = []
        this.goalDecompositionLog = null
        console.log('[SupplyChain Store] 清除所有缓存')
      }
    },

    /**
     * 加载对话历史
     * @param {string} experimentId - 实验ID
     */
    async loadChatHistory(experimentId) {
      // 检查缓存
      if (this.chatHistory.length > 0 && this.isCacheValid('chat')) {
        console.log('[SupplyChain Store] 对话历史已缓存')
        return
      }

      this.loading.chat = true
      this.errors.chat = null

      try {
        const response = await getChatHistory(experimentId)

        if (response.success) {
          this.chatHistory = response.data?.chat_messages || []
          this.cache.lastUpdated.chat = Date.now()
          console.log(`[SupplyChain Store] 加载对话历史: ${this.chatHistory.length} 条消息`)
        } else {
          throw new Error(response.message || '获取对话历史失败')
        }
      } catch (error) {
        console.error('[SupplyChain Store] 加载对话历史失败:', error)
        this.errors.chat = error.message
        // 不抛出错误，允许继续使用
      } finally {
        this.loading.chat = false
      }
    },

    /**
     * 加载目标拆解日志
     * @param {string} experimentId - 实验ID
     */
    async loadGoalDecompositionLog(experimentId) {
      // 检查缓存
      if (this.goalDecompositionLog && this.isCacheValid('decomposition')) {
        console.log('[SupplyChain Store] 目标拆解日志已缓存')
        return
      }

      this.loading.decomposition = true
      this.errors.decomposition = null

      try {
        const response = await getGoalDecompositionLog(experimentId)

        if (response.success) {
          this.goalDecompositionLog = response.data
          this.cache.lastUpdated.decomposition = Date.now()
          console.log(`[SupplyChain Store] 加载目标拆解日志: ${response.data?.decomposition_steps?.length || 0} 个步骤`)
        } else {
          throw new Error(response.message || '获取目标拆解日志失败')
        }
      } catch (error) {
        console.error('[SupplyChain Store] 加载目标拆解日志失败:', error)
        this.errors.decomposition = error.message
        // 不抛出错误，允许继续使用
      } finally {
        this.loading.decomposition = false
      }
    },

    /**
     * 设置当前会话ID
     * @param {string} sessionId - 会话ID
     */
    setCurrentSessionId(sessionId) {
      this.currentSessionId = sessionId
      localStorage.setItem('sc_currentSessionId', sessionId || '')
      console.log(`[SupplyChain Store] 设置会话ID: ${sessionId}`)
    },

    /**
     * 保存场景分析结果（reqAnalysis 完成后调用）
     */
    setScenarioAnalysis({ subtasks, userGoal, apiResult }) {
      this.scenarioSubtasks = subtasks || []
      this.scenarioUserGoal = userGoal || ''
      this.scenarioApiResult = apiResult && typeof apiResult === 'object' ? apiResult : null
      localStorage.setItem('sc_scenarioSubtasks', JSON.stringify(this.scenarioSubtasks))
      localStorage.setItem('sc_scenarioUserGoal', this.scenarioUserGoal)
      localStorage.setItem('sc_scenarioApiResult', JSON.stringify(this.scenarioApiResult))
      console.log(`[SupplyChain Store] 保存场景分析结果: ${this.scenarioSubtasks.length} 个子任务`)
    },

    /**
     * 保存步骤1 场景设定上下文
     */
    setScenarioContext(context) {
      const next = {
        historicalBackground: '',
        initialEvent: '',
        currentProgress: '',
        completeTimeline: '',
        ...(this.scenarioContext || {}),
        ...(context || {})
      }
      this.scenarioContext = next
      localStorage.setItem('sc_scenarioContext', JSON.stringify(next))
    },

    /**
     * 更新步骤5 仿真环境配置
     */
    setEnvironmentConfig(patch) {
      const next = { ...(this.environmentConfig || {}), ...(patch || {}) }
      this.environmentConfig = next
      localStorage.setItem('sc_environmentConfig', JSON.stringify(next))
    },

    /**
     * 更新某个 Agent 节点的配置
     */
    updateAgentNodeConfig(agentId, config) {
      this.agentNodeConfigs = {
        ...this.agentNodeConfigs,
        [agentId]: { ...this.agentNodeConfigs[agentId], ...config }
      }
      localStorage.setItem('sc_agentNodeConfigs', JSON.stringify(this.agentNodeConfigs))
    },

    /**
     * 保存 /setAgents 成功返回的配置，供实验设计页合并展示与队列提交追溯
     */
    applySetAgentsResult(sessionId, payload) {
      this.setAgentsResultSessionId = sessionId || null
      this.setAgentsResult = payload && typeof payload === 'object' ? payload : null
      try {
        if (this.setAgentsResult) {
          localStorage.setItem('sc_setAgentsResult', JSON.stringify(this.setAgentsResult))
          localStorage.setItem('sc_setAgentsResultSessionId', sessionId || '')
        } else {
          localStorage.removeItem('sc_setAgentsResult')
          localStorage.removeItem('sc_setAgentsResultSessionId')
        }
      } catch (e) {
        console.warn('[SupplyChain Store] 持久化 setAgents 结果失败', e)
      }
    },

    /** 从 localStorage 恢复 setAgents 结果（刷新页面后） */
    hydrateSetAgentsResultFromStorage() {
      if (this.setAgentsResult) return
      try {
        const raw = localStorage.getItem('sc_setAgentsResult')
        const sid = localStorage.getItem('sc_setAgentsResultSessionId')
        if (!raw) return
        this.setAgentsResult = JSON.parse(raw)
        this.setAgentsResultSessionId = sid || null
      } catch (e) {
        console.warn('[SupplyChain Store] 读取 setAgents 缓存失败', e)
      }
    },

    /**
     * 保存后端 /SCnet/getAgents 返回的 Agent 关系图（仿真工作室画布数据源）
     * @param {string|null} sessionId
     * @param {object} payload - { agents, relationship_net, attribute_explain, experiment_id }
     */
    applyAgentDesignPayload(sessionId, payload) {
      this.agentDesignPayloadSessionId = sessionId || null
      this.agentDesignPayload = payload && typeof payload === 'object' ? payload : null
      try {
        if (this.agentDesignPayload) {
          localStorage.setItem('sc_agentDesignPayload', JSON.stringify(this.agentDesignPayload))
          localStorage.setItem('sc_agentDesignPayloadSessionId', sessionId || '')
        } else {
          localStorage.removeItem('sc_agentDesignPayload')
          localStorage.removeItem('sc_agentDesignPayloadSessionId')
        }
      } catch (e) {
        console.warn('[SupplyChain Store] 持久化 Agent 关系图失败', e)
      }
    },

    /**
     * 更新某个拆解子任务在鱼骨图上的变量配置（备注、参数覆盖）
     * @param {string} subtaskKey - 与鱼骨图变量项 subtaskKey 一致
     * @param {object} patch - { notes?, paramOverrides? }
     */
    updateScenarioVariableConfig(subtaskKey, patch) {
      if (!subtaskKey) return
      const prev = this.scenarioVariableConfigs[subtaskKey] || {}
      const next = { ...prev }
      if (patch.notes !== undefined) next.notes = patch.notes
      if (patch.paramOverrides !== undefined) next.paramOverrides = patch.paramOverrides
      this.scenarioVariableConfigs = {
        ...this.scenarioVariableConfigs,
        [subtaskKey]: next
      }
      localStorage.setItem('sc_scenarioVariableConfigs', JSON.stringify(this.scenarioVariableConfigs))
    },

    /**
     * 清除场景建模相关状态（开始新分析时调用）
     */
    clearScenarioState() {
      this.currentSessionId = null
      this.scenarioSubtasks = []
      this.scenarioUserGoal = ''
      this.scenarioApiResult = null
      this.agentNodeConfigs = {}
      this.scenarioVariableConfigs = {}
      this.setAgentsResult = null
      this.setAgentsResultSessionId = null
      this.agentDesignPayload = null
      this.agentDesignPayloadSessionId = null
      this.scenarioContext = {
        historicalBackground: '',
        initialEvent: '',
        currentProgress: '',
        completeTimeline: ''
      }
      ;[
        'sc_currentSessionId',
        'sc_scenarioSubtasks',
        'sc_scenarioUserGoal',
        'sc_scenarioApiResult',
        'sc_agentNodeConfigs',
        'sc_scenarioVariableConfigs',
        'sc_setAgentsResult',
        'sc_setAgentsResultSessionId',
        'sc_agentDesignPayload',
        'sc_agentDesignPayloadSessionId',
        'sc_scenarioContext'
      ].forEach(k => localStorage.removeItem(k))
    },

    /**
     * 加载会话详情
     * @param {string} sessionId - 会话ID
     */
    async loadSession(sessionId) {
      try {
        const response = await getSessionDetail(sessionId)

        if (response.success) {
          this.currentSession = response.data
          this.currentSessionId = sessionId
          console.log(`[SupplyChain Store] 加载会话成功: ${sessionId}`)
        } else {
          throw new Error(response.error || '获取会话详情失败')
        }
      } catch (error) {
        console.error('[SupplyChain Store] 加载会话失败:', error)
        throw error
      }
    },

    /**
     * 从会话中加载关联的实验
     * @param {string} sessionId - 会话ID
     * @returns {string|null} - 实验ID或null
     */
    async loadExperimentFromSession(sessionId) {
      await this.loadSession(sessionId)
      const experimentId = this.currentSession?.linked_experiment_id

      if (experimentId) {
        await this.loadExperiment(experimentId)
        console.log(`[SupplyChain Store] 从会话加载实验: ${experimentId}`)
        return experimentId
      } else {
        console.warn(`[SupplyChain Store] 会话 ${sessionId} 未关联实验`)
        return null
      }
    },

    /**
     * 选择实验（用户主动选择，持久化到localStorage）
     * @param {string} experimentId - 实验ID
     */
    async selectExperiment(experimentId) {
      try {
        // 加载实验数据
        await this.loadExperiment(experimentId)

        // 持久化到localStorage
        localStorage.setItem('selectedExperimentId', experimentId)

        console.log(`[SupplyChain Store] 用户选择实验: ${experimentId}`)
      } catch (error) {
        console.error('[SupplyChain Store] 选择实验失败:', error)
        throw error
      }
    },

    /**
     * 连接WebSocket
     */
    connectWebSocket() {
      if (this.socket && this.socketConnected) {
        console.log('[SupplyChain Store] WebSocket已连接')
        return
      }

      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9091'
      this.socket = io(backendUrl, {
        transports: ['websocket', 'polling']
      })

      this.socket.on('connect', () => {
        console.log('[SupplyChain Store] WebSocket已连接')
        this.socketConnected = true
      })

      this.socket.on('disconnect', () => {
        console.log('[SupplyChain Store] WebSocket已断开')
        this.socketConnected = false
      })

      this.socket.on('progress_update', (data) => {
        console.log('[SupplyChain Store] 收到进度更新:', data)
        // 可以在这里更新进度状态
      })

      this.socket.on('queue_update', (data) => {
        console.log('[SupplyChain Store] 收到队列更新:', data)
        this.updateQueueStatus(data)
        this.fetchTaskHistory()
      })
    },

    /**
     * 断开WebSocket
     */
    disconnectWebSocket() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.socketConnected = false
        console.log('[SupplyChain Store] WebSocket已断开')
      }
    },

    /**
     * 获取队列状态
     */
    async fetchQueueStatus() {
      try {
        const response = await getQueueStatus()
        if (response.success) {
          this.updateQueueStatus(response.data)
        }
      } catch (error) {
        console.error('[SupplyChain Store] 获取队列状态失败:', error)
      }
    },

    /**
     * 更新队列状态
     */
    updateQueueStatus(data) {
      this.queueStatus = {
        ...this.queueStatus,
        totalPending: data.total_pending || 0,
        totalRunning: data.total_running || 0,
        totalInQueue: (data.total_pending || 0) + (data.total_running || 0),
        currentTaskId: data.current_task_id || null,
        // 估算等待时间（假设每个任务平均12分钟）
        estimatedWaitTime: (data.total_pending || 0) * 12
      }
    },

    /**
     * 取消任务
     */
    async cancelQueueTask(taskId) {
      try {
        const response = await cancelTask(taskId)
        if (response.success) {
          console.log('[SupplyChain Store] 任务已取消:', taskId)
          await this.fetchQueueStatus()
        }
        return response
      } catch (error) {
        console.error('[SupplyChain Store] 取消任务失败:', error)
        throw error
      }
    },

    /**
     * 提交实验到队列
     * @param {object} payload - 队列提交参数
     */
    async submitExperimentTask(payload) {
      const response = await submitToQueue(payload || {})
      if (response?.success) {
        await this.fetchQueueStatus()
        await this.fetchTaskHistory()
      }
      return response
    },

    /**
     * 加载session设计数据（带缓存）
     * @param {string} sessionId - 会话ID
     */
    async loadSessionDesign(sessionId) {
      // 检查缓存（30分钟有效期）
      const cached = this.sessionDesignCache[sessionId]
      const now = Date.now()
      const CACHE_TTL = 30 * 60 * 1000 // 30分钟

      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        this.currentSessionDesign = cached.data
        return cached.data
      }

      // 从后端获取
      try {
        const response = await getSessionDetail(sessionId)
        const sessionData = response.data

        // 更新缓存
        this.sessionDesignCache[sessionId] = {
          data: sessionData,
          timestamp: now
        }

        this.currentSessionDesign = sessionData
        return sessionData
      } catch (error) {
        console.error('[SupplyChain Store] 加载session设计失败:', error)
        throw error
      }
    },

    /**
     * 清除session缓存
     */
    clearSessionCache() {
      this.sessionDesignCache = {}
      this.currentSessionDesign = null
    },

    /**
     * 获取任务历史
     * @param {number} limit - 获取数量
     */
    async fetchTaskHistory(limit = 50) {
      try {
        const response = await getQueueHistory(limit)
        if (response.success) {
          this.taskHistory = response.data || []
        }
      } catch (error) {
        console.error('[SupplyChain Store] 获取任务历史失败:', error)
      }
    }
  }
})
