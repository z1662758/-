import { judgeRequirement, analyzeRequirement, modifyExperiment, setAgents } from '@/api/scenarioModeling'
import {
  updateTaskResult,
  updateTasks,
  addChatMessage,
  getSessions,
  getSessionDetail
} from '@/api/scenarioSession'
import { getSupplyChainAgents } from '@/api/supplyChain'
import { unwrapApiData, assertApiSuccess } from '@/utils/apiEnvelope'
import { useSupplyChainStore } from '@/stores/supplyChain'

/** 安全地将消息内容序列化为字符串（用于持久化到后端会话） */
function stringifyMessageContent(content) {
  if (content === null || content === undefined) return ''
  if (typeof content === 'string') return content
  try {
    return JSON.stringify(content)
  } catch {
    return String(content)
  }
}

/** 可调延时常量（ms）—— 集中管理，方便后续调参 */
const TIMING = {
  TASK_EXECUTE_DELAY: 120,      // executeCurrentTask 中模拟处理耗时
  CONTENT_UPDATE_FLASH: 360,    // isContentUpdated 动画重置
  NEXT_TASK_INTERVAL: 140,      // 步骤切换间隔，保留轻量动效但不强制拖慢
  STATE_SWITCH_DELAY: 80,       // 分析完成→切换执行阶段
  FILE_UPLOAD_SIM: 220,         // 文件上传模拟
  FILE_PARSE_SIM: 180,          // 文件解析模拟
  CACHE_TIMEOUT: 30000,         // API 超时阈值（ms），超时后使用缓存兜底
}

export default {
  name: 'PowerGame_ScenarioModeling',
  data() {
    return {
      inputMessage: '',
      isProcessing: false,
      currentState: 'analysis',
      tasks: [],
      currentTaskIndex: 0,
      selectedTaskIndex: null,
      taskAnalysisHtml: '',
      taskResults: [],
      currentResult: null,
      selectedResult: null,
      autoExecutionTimer: null,
      editingContent: '',
      showInitialDialog: true,
      feedbackInput: '',
      apiResult: null,
      judgementResult: null,
      isRequirementLegal: false,
      historyConversations: [],
      requirementElements: {
        goal: '',
        variable: '',
        object: ''
      },
      currentJudgementStep: 0,
      hoveredTaskIndex: null,
      tooltipX: 0,
      tooltipY: 0,
      selectedFile: null,
      isUploading: false,
      isContentUpdated: false,
      sessionId: null,  // 新增：会话ID
      subtasksData: [],  // 新增：存储后端返回的子任务详细数据
      sessionHistory: [],
      selectedSessionId: '',
      sessionsLoading: false,
      restoringSession: false,
      agentDesignSynced: false,
      agentDesignSyncing: false,
      agentDesignSyncError: '',
      // 问题输出缓存（用于 API 超时时的备用展示）
      questionOutputCache: {},  // { [cacheKey: string]: { judgementResult, apiResult, subtasksData, timestamp } }
      // 按阶段分组的示例问题
      phaseExampleQuestions: {
        pre: [
          {
            icon: '🗺️',
            title: '产能匹配',
            text: '市场需求强度上升时，制造总产能需要如何调整，才能减少订单积压并保持完成率稳定'
          },
          {
            icon: '📦',
            title: '库存与供给',
            text: '库存容量上限和供应保障能力同时波动时，系统会先在哪个环节出现履约压力'
          },
          {
            icon: '⚠️',
            title: '协作效益',
            text: '工厂协作范围扩大后，协作次数上升是否真的能带来更高的订单完成率'
          },
          {
            icon: '🎯',
            title: '方案对比',
            text: '在完成率、净利润和协作效率之间，哪类参数组合更适合当前供应链网络'
          }
        ],
        during: [
          {
            icon: '📦',
            title: '订单分配',
            text: '需求突然上涨时，二级订单在各工厂怎么分配才能避免某几家工厂爆仓'
          },
          {
            icon: '🤝',
            title: '工厂协作',
            text: '工厂协作范围扩大后，跨厂协作次数增加是否足以抵消运输和调度压力'
          },
          {
            icon: '🔄',
            title: '产能扩展',
            text: '高峰期临时扩产时，哪类工厂先扩更稳：高利用率工厂还是低利用率工厂'
          },
          {
            icon: '💰',
            title: '定价与库存',
            text: '销售商加价率和库存同时调整时，利润提升和订单流失的平衡点在哪里'
          }
        ],
        post: [
          {
            icon: '📈',
            title: '协作效率评估',
            text: '复盘本轮仿真中协作网络变化，哪些链路带来了真实的履约提升'
          },
          {
            icon: '💵',
            title: '成本结构分析',
            text: '从订单完成率和系统净利润反推，哪些参数导致了主要成本压力'
          },
          {
            icon: '🔍',
            title: '韧性复盘',
            text: '在供应扰动恢复阶段，哪类节点恢复慢，导致整条链路恢复被拖慢'
          },
          {
            icon: '🏆',
            title: '绩效对比',
            text: '对比多轮方案后，哪个参数组合在完成率、协作次数和净利润上最均衡'
          }
        ]
      }
    }
  },
  watch: {
    currentResult(newVal) {
      if (newVal) {
        this.editingContent = newVal;
      }
    },

    selectedResult(newVal) {
      if (newVal) {
        this.editingContent = newVal;
      }
    },

    editingContent(newVal) {
      this.saveResultModificationOnChange();
    },

    historyConversations() {
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },

    // 监听步骤条 query.step 切换内部状态
    '$route.query.step': {
      immediate: false,
      handler(stepKey) {
        this.applyFlowStep(stepKey);
      }
    }
  },
  computed: {
    currentTaskText() {
      if (this.tasks.length === 0) {
        return '等待任务分析...'
      }
      if (this.selectedTaskIndex !== null && this.selectedTaskIndex < this.tasks.length) {
        return this.tasks[this.selectedTaskIndex]
      }
      return this.tasks[this.currentTaskIndex] || '拆解展示完成'
    },

    progressPercentage() {
      if (this.tasks.length === 0) {
        return 0
      }
      return (Math.min(this.currentTaskIndex, this.tasks.length) / this.tasks.length) * 100
    }
  },
  methods: {
    // 根据步骤条 query.step 切换 ScenarioModeling 内部状态
    // - scenario-setup / requirement-input → 显示初始输入弹窗
    // - smart-dialogue                     → 关闭弹窗进入对话主界面
    applyFlowStep(stepKey) {
      if (!stepKey) return
      if (stepKey === 'smart-dialogue') {
        this.showInitialDialog = false
        return
      }
      if (stepKey === 'scenario-setup' || stepKey === 'requirement-input') {
        this.showInitialDialog = true
        if (stepKey === 'requirement-input') {
          this.$nextTick(() => {
            if (this.$refs.initialInput) {
              this.$refs.initialInput.focus()
            }
          })
        }
      }
    },
    syncFlowStepRoute(stepKey) {
      if (!stepKey) return
      const currentStep = this.$route?.query?.step
      if (currentStep === stepKey) return
      this.$router.replace({
        path: '/home/SCnet/scenarioModeling',
        query: { ...(this.$route?.query || {}), step: stepKey }
      })
    },

    sanitizeDisplayText(text) {
      if (text === null || text === undefined) return ''
      let result = String(text)
      const replacements = [
        [/\bLevel[_\s-]?1订单完成率\b/gi, '一级订单完成率'],
        [/\bLevel[_\s-]?2订单完成率\b/gi, '二级订单完成率'],
        [/\bLevel[_\s-]?3订单完成率\b/gi, '三级订单完成率'],
        [/\bLevel[_\s-]?1\b/gi, '一级'],
        [/\bLevel[_\s-]?2\b/gi, '二级'],
        [/\bLevel[_\s-]?3\b/gi, '三级'],
        [/\blevel1_completion_rate\b/gi, '一级订单完成率'],
        [/\blevel2_completion_rate\b/gi, '二级订单完成率'],
        [/\border_completion_rate\b/gi, '订单总体完成率'],
        [/\btotal_net_profit\b/gi, '系统净利润'],
        [/\bcooperation_count\b/gi, '协作次数'],
        [/\bnetwork_density\b/gi, '网络密度'],
        [/\bavg_utilization\b/gi, '平均利用率'],
        [/\bsupplier[_\s-]?utilization\b/gi, '供应商平均利用率'],
        [/\bsupplier[_\s-]?avg[_\s-]?utilization\b/gi, '供应商平均利用率'],
        [/\bmarket_reach\b/gi, '覆盖范围'],
        [/\binventory_capacity\b/gi, '库存容量上限'],
        [/\bmarkup_rate\b/gi, '销售加价率'],
        [/\border_multiplier\b/gi, '市场需求强度参数'],
        [/\bfactory_capacity_range\b/gi, '工厂产能范围'],
        [/\bcollaboration_radius\b/gi, '工厂协作范围'],
        [/\bsupply_capacity\b/gi, '供应保障能力']
      ]
      replacements.forEach(([pattern, replacement]) => {
        result = result.replace(pattern, replacement)
      })
      return result.replace(/\s+/g, ' ').trim()
    },

    normalizeCompareText(text) {
      const cleaned = this.sanitizeDisplayText(text || '')
      return cleaned.replace(/[。；;,.，!?！？]$/g, '').trim()
    },

    buildRequirementForAnalysis(text) {
      const raw = String(text || '').trim()
      if (!raw) return ''
      if (/研究目标|核心变量|作用对象|响应指标/.test(raw)) return raw

      const phaseName = { pre: '事前研判', during: '事中决策', post: '事后复盘' }[this.selectedPhase] || '场景建模'
      return [
        raw,
        `补充语境：这是供应链${phaseName}需求。作用对象为供应链网络、供应链各层级节点、工厂节点或协作链路；核心变量可从市场需求强度参数、工厂产能范围、二级订单分配比例、库存容量上限、供应保障能力、工厂协作范围、协作次数、销售加价率、节点恢复速度中识别；响应指标可从订单总体完成率、二级订单完成率、订单积压、工厂利用率、系统净利润、订单流失、调度压力、恢复时间中识别。请基于原问题提取研究目标、核心变量和作用对象。`
      ].join('\n')
    },

    compactDisplayText(text, maxLength = 68) {
      const cleaned = this.sanitizeDisplayText(text || '')
      if (!cleaned || cleaned.length <= maxLength) return cleaned
      return `${cleaned.slice(0, maxLength).trim()}...`
    },

    getAgentDisplayName(agent) {
      const key = String(agent || '').toUpperCase()
      const mapping = {
        ENVIRONMENT: '环境建模',
        OBSERVER: '结果观测',
        SOCIAL: '协同优化',
        PLANNER: '方案规划',
        SUMMARY: '总结'
      }
      return mapping[key] || this.sanitizeDisplayText(agent || '任务')
    },

    deserializeSessionMessageContent(content) {
      if (content === null || content === undefined) return ''
      if (typeof content === 'string') {
        const trimmed = content.trim()
        if (!trimmed) return ''
        return content
      }
      try {
        return JSON.stringify(content)
      } catch {
        return String(content)
      }
    },

    sessionOptionLabel(session) {
      const sid = session?.session_id || 'unknown'
      const text = this.sanitizeDisplayText(session?.requirement_text || '未命名需求')
      const shortText = text.length > 28 ? `${text.slice(0, 28)}...` : text
      const ts = session?.timestamp ? this.formatTime(session.timestamp) : '--:--'
      return `${ts} | ${sid} | ${shortText}`
    },

    async loadSessionHistory() {
      this.sessionsLoading = true
      try {
        const response = await getSessions()
        const data = unwrapApiData(response)
        const list = Array.isArray(data?.sessions) ? data.sessions : []
        this.sessionHistory = list
        if (!this.selectedSessionId && list.length > 0) {
          this.selectedSessionId = list[0].session_id
        }
      } catch (error) {
        console.warn('[ScenarioModeling] loadSessionHistory failed:', error?.message || error)
      } finally {
        this.sessionsLoading = false
      }
    },

    async restoreSessionById(targetSessionId = this.selectedSessionId) {
      if (!targetSessionId || this.restoringSession) return
      this.restoringSession = true

      try {
        const response = await getSessionDetail(targetSessionId)
        const session = unwrapApiData(response)
        if (!session || typeof session !== 'object') {
          throw new Error('会话数据为空')
        }

        this.sessionId = session.session_id || targetSessionId
        this.selectedSessionId = this.sessionId
        this.inputMessage = session?.requirement?.raw_input || ''
        this.selectedPhase = session?.requirement?.analysis_phase || this.selectedPhase
        this.requirementElements = {
          goal: session?.requirement?.goal || '',
          variable: session?.requirement?.variable || '',
          object: session?.requirement?.object || ''
        }
        this.isRequirementLegal = Boolean(session?.requirement?.is_legal)

        const chatHistory = Array.isArray(session?.chat_history) ? session.chat_history : []
        this.historyConversations = chatHistory.map((msg) => {
          const data = msg?.data && typeof msg.data === 'object' ? msg.data : null
          const normalizedType = msg?.type === 'user' ? 'user' : 'system'
          return {
            type: normalizedType,
            content: this.deserializeSessionMessageContent(msg?.content),
            timestamp: msg?.timestamp ? new Date(msg.timestamp) : new Date(),
            data: data && data.flag !== undefined ? data : null,
            analysisData: data && Array.isArray(data.subtasks) ? data : null,
            completionData: data && data.totalTasks !== undefined ? data : null
          }
        })

        const rawAnalysisResult = session?.analysis_result || null
        this.apiResult = rawAnalysisResult ? this.normalizeApiResultForDisplay(rawAnalysisResult) : null

        if (this.apiResult?.goal_decomposition?.subtasks?.length) {
          this.subtasksData = this.apiResult.goal_decomposition.subtasks.map((task, index) =>
            this.normalizeSubtaskPayload(task, index)
          )
        } else {
          this.subtasksData = []
        }

        const taskList = Array.isArray(session?.tasks?.task_list) ? session.tasks.task_list : []
        this.tasks = taskList.length > 0
          ? taskList
          : (this.apiResult ? this.generateTaskList(this.apiResult) : [])

        const taskResultsMap = session?.tasks?.task_results && typeof session.tasks.task_results === 'object'
          ? session.tasks.task_results
          : {}
        this.taskResults = this.tasks.map((_, index) => {
          const value = taskResultsMap[String(index)]
          if (value === undefined || value === null) return null
          if (typeof value === 'string') {
            try {
              return JSON.parse(value)
            } catch {
              return value
            }
          }
          return value
        })

        const completedCount = this.taskResults.filter(v => v !== null && v !== undefined && v !== '').length
        this.currentTaskIndex = Math.min(completedCount, this.tasks.length)
        this.selectedTaskIndex = null
        this.selectedResult = null
        this.currentResult = this.currentTaskIndex > 0
          ? this.taskResults[this.currentTaskIndex - 1] || null
          : null
        this.editingContent = this.currentResult || ''

        this.currentState = this.tasks.length > 0 ? 'execution' : 'analysis'
        this.taskAnalysisHtml = this.tasks.length > 0 ? this.formatTaskAnalysisHtml(this.tasks) : ''
        this.syncFlowStepRoute('smart-dialogue')
        this.showInitialDialog = false
        this.isProcessing = false

        if (this.store && this.sessionId) {
          this.store.setCurrentSessionId(this.sessionId)
          this.store.setScenarioAnalysis({
            subtasks: this.subtasksData || [],
            userGoal: this.inputMessage,
            apiResult: this.apiResult && typeof this.apiResult === 'object' ? this.apiResult : null
          })
        }
        this.agentDesignSynced = !!session?.workflow?.agents_configured
        this.agentDesignSyncError = ''

        if (this.$message) {
          this.$message.success(`已恢复会话 ${this.sessionId}`)
        }
      } catch (error) {
        console.error('[ScenarioModeling] restoreSessionById failed:', error)
        if (this.$message) {
          this.$message.error(`恢复会话失败: ${error?.message || '未知错误'}`)
        }
      } finally {
        this.restoringSession = false
      }
    },

    /**
     * 统一的API错误处理
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文描述
     * @param {boolean} resetProcessing - 是否重置isProcessing状态
     */
    handleApiError(error, context = 'API调用', resetProcessing = true) {
      const errorMsg = error.message || '操作失败'
      console.error(`[ScenarioModeling] ${context}失败:`, error)

      this.pushMessage({
        type: 'system',
        content: `❌ ${context}失败: ${errorMsg}`,
        timestamp: new Date()
      })

      if (resetProcessing) {
        this.isProcessing = false
      }
    },

    /**
     * 生成问题缓存 key
     * @param {string} questionText - 问题文本
     * @param {string} phase - 阶段（pre/during/post）
     * @returns {string} 缓存 key
     */
    getQuestionCacheKey(questionText, phase) {
      return `${phase || 'default'}:${(questionText || '').trim()}`
    },

    /**
     * 检查缓存是否有效（TTL: 24 小时）
     * @param {string} key - 缓存 key
     * @returns {boolean}
     */
    isCacheValid(key) {
      const cached = this.questionOutputCache[key]
      if (!cached) return false
      return Date.now() - cached.timestamp < 24 * 60 * 60 * 1000
    },

    /**
     * 写入缓存
     * @param {string} key - 缓存 key
     * @param {object} data - { judgementResult, apiResult, subtasksData }
     */
    cacheQuestionResult(key, data) {
      this.questionOutputCache[key] = {
        ...data,
        timestamp: Date.now()
      }
    },

    /**
     * 读取缓存
     * @param {string} key - 缓存 key
     * @returns {object|null}
     */
    getCachedResult(key) {
      return this.questionOutputCache[key] || null
    },

    // 将数字优先级映射为文字描述
    getPriorityLevel(priority) {
      if (!priority) return { text: '中', class: 'medium' }

      const priorityNum = typeof priority === 'number' ? priority : parseInt(priority)

      if (priorityNum >= 5) {
        return { text: '高', class: 'high' }
      } else if (priorityNum >= 3) {
        return { text: '中', class: 'medium' }
      } else {
        return { text: '低', class: 'low' }
      }
    },

    formatResultContent(content) {
      if (!content) return ''

      // 检查是否为subtask对象格式（新格式）
      if (typeof content === 'object' && (content.emoji || content.agent_type)) {
        let html = '<div class="subtask-result-card">'

        // 标题行
        html += '<div class="subtask-header">'
        if (content.emoji) {
          html += `<span class="subtask-emoji">${content.emoji}</span>`
        }
        html += `<span class="subtask-agent-badge">${this.getAgentDisplayName(content.agent_code || content.agent_type || 'AGENT')}</span>`
        html += '</div>'

        const titleText = this.sanitizeDisplayText(content.title || '')
        const descText = this.sanitizeDisplayText(content.description || '')
        const normalizedTitle = this.normalizeCompareText(titleText)
        const normalizedDesc = this.normalizeCompareText(descText)
        const shouldShowDescription = !!descText && normalizedDesc !== normalizedTitle

        // 任务标题
        if (titleText) {
          html += `<h4 class="subtask-title">${titleText}</h4>`
        }

        // 只保留一句有效描述（不再展示展开详情/变量/优先级等）
        if (shouldShowDescription) {
          html += `<div class="subtask-description">${this.compactDisplayText(descText, 92)}</div>`
        }
        html += '</div>'

        return html
      }

      // 旧格式处理逻辑
      // 尝试解析JSON内容
      try {
        // 如果是字符串且包含JSON格式
        if (typeof content === 'string' && (content.includes('{') || content.includes('['))) {
          let parsedContent

          // 尝试找到JSON部分并解析
          const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
          if (jsonMatch) {
            parsedContent = JSON.parse(jsonMatch[0])
          } else {
            parsedContent = JSON.parse(content)
          }

          // 格式化解析后的JSON
          let formattedHtml = ''

          // 递归处理JSON对象
          const processObject = (obj, level = 0) => {
            let html = ''
            const indent = '  '.repeat(level)

            for (const [key, value] of Object.entries(obj)) {
              // 标题加粗
              html += `<div class="result-title">${indent}<strong>${this.sanitizeDisplayText(key)}:</strong></div>`

              if (Array.isArray(value)) {
                // 列表前添加•符号
                html += `<div class="result-list">${indent}  <ul>`
                for (const item of value) {
                  if (typeof item === 'object' && item !== null) {
                    html += `<li>• ${this.sanitizeDisplayText(JSON.stringify(item))}</li>`
                  } else {
                    html += `<li>• ${this.sanitizeDisplayText(item)}</li>`
                  }
                }
                html += `</ul></div>`
              } else if (typeof value === 'object' && value !== null) {
                // 递归处理嵌套对象
                html += processObject(value, level + 1)
              } else {
                // 普通值
                html += `<div class="result-value">${indent}  • ${this.sanitizeDisplayText(value)}</div>`
              }
            }

            return html
          }

          // 处理不同类型的JSON结构
          if (Array.isArray(parsedContent)) {
            formattedHtml += `<div class="result-list"><ul>`
            for (const item of parsedContent) {
              if (typeof item === 'object' && item !== null) {
                formattedHtml += `<li>• ${this.sanitizeDisplayText(JSON.stringify(item))}</li>`
              } else {
                formattedHtml += `<li>• ${this.sanitizeDisplayText(item)}</li>`
              }
            }
            formattedHtml += `</ul></div>`
          } else if (typeof parsedContent === 'object' && parsedContent !== null) {
            formattedHtml = processObject(parsedContent)
          } else {
            formattedHtml = `<div class="result-value">${this.sanitizeDisplayText(parsedContent)}</div>`
          }

          return formattedHtml
        } else if (typeof content === 'string') {
          // 非JSON内容，保持原样但添加基本格式
          return content.split('\n').map(line => {
            if (line.trim()) {
              return `<div class="result-line">${this.sanitizeDisplayText(line)}</div>`
            }
            return '<br>'
          }).join('')
        }
      } catch (error) {
        // JSON解析失败，显示原始内容但添加基本格式
        if (typeof content === 'string') {
          return content.split('\n').map(line => {
            if (line.trim()) {
              return `<div class="result-line">${this.sanitizeDisplayText(line)}</div>`
            }
            return '<br>'
          }).join('')
        }
      }

      return ''
    },
    
    pushMessage(msg) {
      this.historyConversations.push(msg)
      this.$nextTick(() => {
        this.scrollToBottom()
      })
      // 异步持久化到会话；失败仅记录日志，不影响主流程
      if (this.sessionId && msg && msg.type !== 'persist-skip') {
        addChatMessage(this.sessionId, {
          type: msg.type || 'system',
          content: stringifyMessageContent(msg.content),
          data: msg.data || msg.analysisData || msg.completionData || null
        }).catch((err) => {
          console.warn('[ScenarioModeling] addChatMessage failed:', err?.message || err)
        })
      }
    },
    getParticleStyle(index) {
      const size = Math.random() * 4 + 2;
      const duration = Math.random() * 3 + 2;
      const delay = Math.random() * 2;
      return {
          width: size + 'px',
          height: size + 'px',
          left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        animationDuration: duration + 's',
        animationDelay: delay + 's'
      };
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    },

    scrollToBottom() {
      if (this.$refs.messagesContainer) {
        this.$refs.messagesContainer.scrollTop = this.$refs.messagesContainer.scrollHeight;
      }
    },

    // 使用示例问题
    useExample(exampleText) {
      if (!this.isProcessing) {
        this.inputMessage = exampleText
        // 可选：自动聚焦到输入框
        this.$nextTick(() => {
          if (this.$refs.initialInput) {
            this.$refs.initialInput.focus()
          }
        })
      }
    },

    toDisplayNameList(items) {
      if (!Array.isArray(items)) return []
      return items
        .map((item) => {
          if (typeof item === 'string') return this.sanitizeDisplayText(item)
          if (item && typeof item === 'object') {
            return this.sanitizeDisplayText(item.name || item.名称 || '')
          }
          return ''
        })
        .filter(Boolean)
    },

    normalizeParamList(items, fallbackNames = []) {
      const names = this.toDisplayNameList(items)
      const merged = names.length > 0 ? names : [...fallbackNames].filter(Boolean)
      const unique = Array.from(new Set(merged))
      return unique.map((name) => ({ name, description: '' }))
    },

    getSubtaskDescription(task = {}) {
      const title = this.normalizeCompareText(task.title || '')
      const description = this.sanitizeDisplayText(task.description || '')
      return description && this.normalizeCompareText(description) !== title ? description : ''
    },

    normalizeSubtaskPayload(subtask, index = 0) {
      const agentOrder = ['ENVIRONMENT', 'OBSERVER', 'SOCIAL', 'PLANNER']
      const fallbackAgent = agentOrder[index % agentOrder.length]
      const rawAgent = (subtask?.agent_type || subtask?.assigned_agent || fallbackAgent).toString().toUpperCase()
      const agent = agentOrder.includes(rawAgent) ? rawAgent : fallbackAgent

      const title = this.sanitizeDisplayText(subtask?.title || subtask?.description || `子任务${index + 1}`)
      const description = this.sanitizeDisplayText(subtask?.description || title)

      const params = (subtask?.parameters && typeof subtask.parameters === 'object') ? subtask.parameters : {}
      const influence = this.normalizeParamList(params.influence_factors || [], this.toDisplayNameList(this.apiResult?.influence_factor || []))
      const responses = this.normalizeParamList(params.response_variables || [], this.toDisplayNameList(this.apiResult?.response_var || []))

      return {
        ...subtask,
        agent_type: agent,
        assigned_agent: agent,
        title,
        description,
        parameters: {
          ...params,
          influence_factors: influence,
          response_variables: responses
        }
      }
    },

    normalizeApiResultForDisplay(apiResult) {
      let parsed = apiResult || {}
      if (typeof apiResult === 'string') {
        try {
          parsed = JSON.parse(apiResult)
        } catch (e) {
          parsed = {}
        }
      }
      const cloned = { ...parsed }
      const goalDecomp = (cloned.goal_decomposition && typeof cloned.goal_decomposition === 'object')
        ? { ...cloned.goal_decomposition }
        : {}

      let rawSubtasks = Array.isArray(goalDecomp.subtasks) ? goalDecomp.subtasks : []
      if (!rawSubtasks.length) {
        rawSubtasks = this.buildFallbackSubtasksFromExpPlan(cloned)
      }
      const normalizedSubtasks = rawSubtasks.map((task, index) => this.normalizeSubtaskPayload(task, index))
      goalDecomp.subtasks = normalizedSubtasks
      if (!goalDecomp.goal_understanding) {
        goalDecomp.goal_understanding = this.sanitizeDisplayText(cloned?.goal?.explain || this.inputMessage || '')
      }
      if (!goalDecomp.user_goal) {
        goalDecomp.user_goal = this.sanitizeDisplayText(this.inputMessage || this.store?.scenarioUserGoal || '')
      }
      cloned.goal_decomposition = goalDecomp

      const factorsFromTasks = normalizedSubtasks.flatMap((task) => this.toDisplayNameList(task?.parameters?.influence_factors || []))
      const varsFromTasks = normalizedSubtasks.flatMap((task) => this.toDisplayNameList(task?.parameters?.response_variables || []))

      const normalizedFactors = this.toDisplayNameList(cloned.influence_factor || [])
      const normalizedVars = this.toDisplayNameList(cloned.response_var || [])
      cloned.influence_factor = normalizedFactors.length > 0 ? normalizedFactors : Array.from(new Set(factorsFromTasks))
      cloned.response_var = normalizedVars.length > 0 ? normalizedVars : Array.from(new Set(varsFromTasks))

      return cloned
    },

    buildFallbackSubtasksFromExpPlan(expPlan = {}) {
      const factors = this.toDisplayNameList(expPlan?.influence_factor || [])
      const responses = this.toDisplayNameList(expPlan?.response_var || [])
      const toNamed = (arr) => arr.map((name) => ({ name, description: '' }))

      const envFactors = factors.length > 0 ? factors : ['市场需求强度', '工厂产能范围', '供应保障能力']
      const obsResponses = responses.length > 0 ? responses : ['订单完成率', '工厂利用率', '系统净利润']

      return [
        {
          task_id: 'task_environment',
          title: '刻画需求冲击与产能约束',
          description: '明确需求上升幅度、订单分布和工厂产能边界，形成供应链扰动输入。',
          assigned_agent: 'ENVIRONMENT',
          agent_type: 'ENVIRONMENT',
          priority: 5,
          parameters: {
            influence_factors: toNamed(envFactors),
            response_variables: toNamed(obsResponses.slice(0, 2))
          }
        },
        {
          task_id: 'task_observer',
          title: '设定履约与负载观测口径',
          description: '定义订单完成率、工厂利用率和订单积压等指标，作为方案比较标准。',
          assigned_agent: 'OBSERVER',
          agent_type: 'OBSERVER',
          priority: 4,
          parameters: {
            influence_factors: toNamed(envFactors.slice(0, 3)),
            response_variables: toNamed(obsResponses)
          }
        },
        {
          task_id: 'task_social',
          title: '推演跨工厂订单调配方案',
          description: '比较不同工厂之间的订单分配和协作策略，判断过载与积压是否被缓解。',
          assigned_agent: 'SOCIAL',
          agent_type: 'SOCIAL',
          priority: 3,
          parameters: {
            influence_factors: toNamed(envFactors.slice(0, 3)),
            response_variables: toNamed(obsResponses.slice(0, 2))
          }
        },
        {
          task_id: 'task_planner',
          title: '输出执行优先级与迭代策略',
          description: '汇总各方案在履约、利用率和利润上的表现，给出优先执行顺序和后续迭代方向。',
          assigned_agent: 'PLANNER',
          agent_type: 'PLANNER',
          priority: 4,
          parameters: {
            influence_factors: toNamed(envFactors),
            response_variables: toNamed(obsResponses)
          }
        }
      ]
    },

    /**
     * 处理需求判断成功（抽离为独立方法，便于复用）
     * @param {object} result - API 返回结果
     */
    handleJudgementSuccess(result) {
      this.judgementResult = result

      // 保存会话ID
      this.sessionId = result.session_id
      console.log('[ScenarioModeling] 会话ID:', this.sessionId)

      this.isRequirementLegal = result.flag === 1

      if (result.flag === 1) {
        this.requirementElements = {
          goal: result.goal,
          variable: result.variable,
          object: result.object
        }
        this.syncFlowStepRoute('smart-dialogue')
        this.showInitialDialog = false
        return this.callReqAnalysis()
      } else {
        this.pushMessage({
          type: 'system',
          content: '⚠️ 需求不完整，请补充缺失要素',
          timestamp: new Date(),
          data: result
        })
        this.syncFlowStepRoute('smart-dialogue')
        this.showInitialDialog = false
        this.taskAnalysisHtml = this.formatJudgementResultHtml(result)
        this.isProcessing = false
      }
    },

    /**
     * 使用缓存数据继续流程（超时兜底）
     * @param {object} cached - 缓存数据
     */
    useCachedResult(cached) {
      this.agentDesignSynced = false
      this.agentDesignSyncError = ''
      this.pushMessage({
        type: 'system',
        content: '⏱️ 请求超时，已加载缓存结果（演示模式）',
        timestamp: new Date()
      })

      // 恢复判断结果
      if (cached.judgementResult) {
        this.judgementResult = cached.judgementResult
        this.sessionId = cached.judgementResult.session_id || this.sessionId
        this.isRequirementLegal = cached.judgementResult.flag === 1
        this.requirementElements = {
          goal: cached.judgementResult.goal || '',
          variable: cached.judgementResult.variable || '',
          object: cached.judgementResult.object || ''
        }
      }

      // 恢复拆解结果
      if (cached.apiResult) {
        this.apiResult = this.normalizeApiResultForDisplay(cached.apiResult)
      }

      if (cached.subtasksData && cached.subtasksData.length > 0) {
        this.subtasksData = cached.subtasksData.map((t, i) => this.normalizeSubtaskPayload(t, i))
        const tasks = this.subtasksData.map(t => t.title || t.description || '未命名任务')
        this.tasks = tasks

        // 恢复会话上下文
        this.syncFlowStepRoute('smart-dialogue')
        this.showInitialDialog = false
        this.currentState = 'execution'
        this.taskAnalysisHtml = this.formatTaskAnalysisHtml(tasks)

        this.pushMessage({
          type: 'system',
          content: `✅ 目标分析完成，已生成 ${tasks.length} 个拆解任务（缓存）`,
          timestamp: new Date(),
          analysisData: {
            understanding: (this.apiResult?.goal_decomposition || {}).goal_understanding || '系统将分步骤完成您的需求分析',
            subtasks: this.subtasksData,
            influenceFactors: this.toDisplayNameList(this.apiResult?.influence_factor || []),
            responseVars: this.toDisplayNameList(this.apiResult?.response_var || [])
          }
        })

        // 切换到执行状态
        setTimeout(() => {
          this.switchToExecutionState()
          this.startAutoExecution()
          this.syncAgentDesignForCurrentSession('cache').catch(() => {})
          this.isProcessing = false
        }, TIMING.STATE_SWITCH_DELAY)
      } else {
        // 缓存中没有拆解数据，显示判断结果
        this.taskAnalysisHtml = this.formatJudgementResultHtml(cached.judgementResult || {})
        this.syncFlowStepRoute('smart-dialogue')
        this.showInitialDialog = false
        this.isProcessing = false
      }
    },

    startAnalysis() {
      if (!this.inputMessage.trim() || this.isProcessing) return

      this.isProcessing = true
      this.agentDesignSynced = false
      this.agentDesignSyncError = ''

      this.pushMessage({
        type: 'user',
        content: this.inputMessage,
        timestamp: new Date()
      })

      const cacheKey = this.getQuestionCacheKey(this.inputMessage, this.selectedPhase)

      // 立即检查缓存
      if (this.isCacheValid(cacheKey)) {
        const cached = this.getCachedResult(cacheKey)
        if (cached) {
          this.pushMessage({
            type: 'system',
            content: '📦 检测到缓存结果，直接使用...',
            timestamp: new Date()
          })
          this.isProcessing = false
          this.useCachedResult(cached)
          return
        }
      }

      // 设置超时定时器（30 秒）
      let timeoutTimer = setTimeout(() => {
        const cached = this.getCachedResult(cacheKey)
        if (cached) {
          this.useCachedResult(cached)
        }
        // 若无缓存，继续等待 API 返回（不做额外处理）
      }, TIMING.CACHE_TIMEOUT)

      const analysisRequirement = this.buildRequirementForAnalysis(this.inputMessage)

      judgeRequirement(analysisRequirement, this.sessionId || null, this.selectedPhase)
      .then((response) => {
        clearTimeout(timeoutTimer)  // 清除超时定时器
        const result = unwrapApiData(response)

        // 写入缓存
        this.cacheQuestionResult(cacheKey, {
          judgementResult: result
        })

        this.handleJudgementSuccess(result)
      })
      .catch(error => {
        clearTimeout(timeoutTimer)
        this.handleApiError(error, '需求判断')

        this.syncFlowStepRoute('smart-dialogue')
        this.showInitialDialog = false
        this.currentState = 'execution'
        this.taskAnalysisHtml = `
          <div class="task-list">
            <div class="analysis-header">
              <div class="header-badge error">⚠️ API调用失败</div>
              <h3>任务分析结果</h3>
            </div>
            <p class="analysis-intro error-text">
              ${error.message || 'API调用失败'}
            </p>
          </div>
        `
      })
    },

    generateTaskList(apiData) {
      if (!apiData) {
        return []
      }

      // 从后端返回的 goal_decomposition.subtasks 提取真实任务
      const goalDecomp = apiData.goal_decomposition || {}
      const subtasks = goalDecomp.subtasks || []

      if (subtasks.length > 0) {
        // 将子任务对象存储起来，供后续使用
        this.subtasksData = subtasks.map((task, index) => this.normalizeSubtaskPayload(task, index))
        // 返回任务描述列表（后端字段是 description，不是 title）
        return this.subtasksData.map(task => task.title || task.description || '未命名任务')
      }

      // 兜底：如果没有subtasks，使用旧逻辑
      const tasks = []
      if (apiData.goal) tasks.push('分析实验目的')
      if (apiData.influence_factor && apiData.influence_factor.length > 0) tasks.push('确定影响因素')
      if (apiData.response_var && apiData.response_var.length > 0) tasks.push('找出响应变量')
      if (apiData.exp_params) tasks.push('设计实验方法')

      return tasks.length > 0 ? tasks : ['分析实验目的', '确定影响因素', '找出响应变量', '设计实验方法']
    },

    formatTaskAnalysisHtml(tasks) {
      let html = '<div class="task-list">'
      html += '<div class="analysis-header">'
      html += '<div class="header-badge">✨ AI分析完成</div>'
      html += '<h3>任务分解结果</h3>'
      html += '</div>'
      html += '<p class="analysis-intro">根据您的问题，系统自动生成以下任务步骤：</p>'
      html += '<div class="tasks-grid">'

      // 如果有详细的subtask数据，展示更丰富的卡片
      if (this.subtasksData && this.subtasksData.length > 0) {
        this.subtasksData.forEach((subtask, index) => {
          const taskTitle = this.sanitizeDisplayText(subtask.title || subtask.description || tasks[index] || '未命名任务')
          const descCandidate = this.sanitizeDisplayText(subtask.description || '')
          const taskDesc = this.normalizeCompareText(descCandidate) !== this.normalizeCompareText(taskTitle)
            ? descCandidate
            : ''
          html += `<div class="task-card enhanced" style="animation-delay: ${index * 0.1}s">`
          html += `<div class="task-card-header">`
          html += `<span class="task-number">${index + 1}</span>`
          html += `</div>`
          html += `<div class="task-card-body">`
          html += `<h4 class="task-title">${taskTitle}</h4>`
          if (subtask.assigned_agent || subtask.agent_type) {
            html += `<div class="task-agent-type">${this.getAgentDisplayName(subtask.assigned_agent || subtask.agent_type)}</div>`
          }
          if (taskDesc) {
            html += `<p class="task-description">${taskDesc}</p>`
          }
          html += `<div class="task-meta">`
          if (subtask.priority) {
            const priorityInfo = this.getPriorityLevel(subtask.priority)
            html += `<span class="task-priority priority-${priorityInfo.class}">${priorityInfo.text}</span>`
          }
          html += `</div>`
          html += `</div>`
          html += '</div>'
        })
      } else {
        // 降级方案：只有任务标题时使用简单卡片
        tasks.forEach((task, index) => {
          html += `<div class="task-card" style="animation-delay: ${index * 0.1}s">`
          html += `<div class="task-card-number">${index + 1}</div>`
          html += `<div class="task-card-content">${this.sanitizeDisplayText(task)}</div>`
          html += '</div>'
        })
      }

      html += '</div>'
      html += '</div>'
      return html
    },

    switchToExecutionState() {
      this.currentState = 'execution'
      this.currentTaskIndex = 0
      this.currentResult = null
      this.selectedResult = null
      this.taskResults = []

      // 不再在对话区显示"开始执行"消息，右侧面板会实时显示进度
    },

    startAutoExecution() {
      if (this.tasks.length === 0) return
      this.executeCurrentTask()
    },

    executeCurrentTask() {
      if (this.currentTaskIndex >= this.tasks.length) {
        this.handleAllTasksCompleted()
        return
      }

      this.isProcessing = true
      this.selectedResult = null

      // 增加延迟时间，让任务执行看起来更真实
      setTimeout(() => {
        let result = ''

        // 使用后端返回的子任务数据
        if (this.subtasksData && this.subtasksData.length > this.currentTaskIndex) {
          const subtask = this.subtasksData[this.currentTaskIndex]
          const agentCode = subtask.agent_type || subtask.assigned_agent || 'AGENT'

          // 格式化子任务结果，包含完整的分析信息
          result = {
            emoji: subtask.emoji || '📌',
            agent_type: this.getAgentDisplayName(agentCode),
            agent_code: agentCode,
            title: subtask.title || subtask.description || this.tasks[this.currentTaskIndex],
            description: subtask.description || '拆解生成中...',
            priority: subtask.priority || 3,
            parameters: subtask.parameters || {}
          }
        }

        this.taskResults[this.currentTaskIndex] = result
        this.currentResult = result

        // 新增：保存任务结果到后端
        if (this.sessionId) {
          updateTaskResult(this.sessionId, this.currentTaskIndex, result)
            .then((data) => {
              assertApiSuccess(data)
              console.log(`[ScenarioModeling] 任务 ${this.currentTaskIndex} 已保存`)
            })
            .catch(error => this.handleApiError(error, '任务保存', false))
        }

        // 不再为每个任务单独发送完成消息，在右侧面板实时显示即可
        this.isProcessing = false

        this.scheduleNextTask()
      }, TIMING.TASK_EXECUTE_DELAY)
    },

    // 重新生成所有任务结果
    regenerateTaskResults() {
      if (!this.apiResult || this.tasks.length === 0) {
        return
      }

      const parsedResult = typeof this.apiResult === 'string' ? JSON.parse(this.apiResult) : this.apiResult
      const oldCurrentTaskIndex = this.currentTaskIndex

      // 清空现有结果
      this.taskResults = []

      // 创建新的结果数组
      const newTaskResults = []

      // 遍历所有任务并重新生成结果
      for (let index = 0; index < this.tasks.length; index++) {
        let result = ''
        const currentTask = this.tasks[index]

        try {
          switch(currentTask) {
            case '分析实验目的':
              result = `${parsedResult.goal ? parsedResult.goal.explain : parsedResult.req || '根据用户需求确定实验目的。'}`
              break
            case '确定影响因素':
              let factorsText = ''
              if (parsedResult.influence_factor) {
                factorsText = parsedResult.influence_factor.join('\n- ')
                // 添加变量解释
                if (parsedResult.var_explain && parsedResult.var_explain.influence_factor) {
                  factorsText += '\n\n变量解释：'
                  parsedResult.var_explain.influence_factor.forEach(factorObj => {
                    const factorName = Object.keys(factorObj)[0]
                    factorsText += `\n- ${factorName}：${factorObj[factorName]}`
                  })
                }
              } else {
                factorsText = '分析关键影响因素。'
              }
              result = `${factorsText}`
              break
            case '找出响应变量':
              let responseVarText = ''
              if (parsedResult.response_var) {
                responseVarText = parsedResult.response_var.join('\n- ')
                // 添加变量解释
                if (parsedResult.var_explain && parsedResult.var_explain.response_var) {
                  responseVarText += '\n\n响应变量解释：'
                  parsedResult.var_explain.response_var.forEach(varObj => {
                    const varName = Object.keys(varObj)[0]
                    responseVarText += `\n- ${varName}：${varObj[varName]}`
                  })
                }
              } else {
                responseVarText = '确定需要测量的响应变量。'
              }
              // 添加公式和公式解释
              if (parsedResult.formula) {
                responseVarText += '\n\n公式：\n'
                Object.keys(parsedResult.formula).forEach(varName => {
                  responseVarText += `\n${varName} = ${parsedResult.formula[varName]}`
                })

                if (parsedResult.formula_explain) {
                  responseVarText += '\n\n公式解释：'
                  Object.keys(parsedResult.formula_explain).forEach((key, i) => {
                    responseVarText += `\n${i + 1}. ${parsedResult.formula_explain[key]}`
                  })
                }
              }
              result = `${responseVarText}`
              break
            case '设计实验方法':
              let expMethodText = ''
              if (parsedResult.exp_params) {
                // 处理嵌套的exp_params结构
                const expParams = parsedResult.exp_params.exp_params ? parsedResult.exp_params.exp_params : parsedResult.exp_params
                expMethodText = `实验方法：${expParams.exp_method}\n\n实验参数：${JSON.stringify(expParams.params, null, 2)}`
              } else {
                expMethodText = '设计实验方法和步骤。'
              }
              result = `${expMethodText}`
              break
            default:
              result = `API返回结果不符合预期格式。`
          }
        } catch (e) {
          console.error('解析API结果失败:', e)
          result = `解析API结果失败：${e.message}`
        }

        // 将结果添加到新数组
        newTaskResults.push(result)
      }

      // 使用新数组替换旧数组，确保响应式更新
      this.taskResults = newTaskResults

      // 恢复当前任务索引和结果显示
      this.currentTaskIndex = oldCurrentTaskIndex
      this.currentResult = this.taskResults[this.currentTaskIndex] || this.taskResults[this.taskResults.length - 1]

      if (this.selectedTaskIndex !== null) {
        this.selectedResult = this.taskResults[this.selectedTaskIndex]
      }

      // 直接更新editingContent，确保显示最新结果
      if (this.selectedResult) {
        this.editingContent = this.selectedResult
      } else if (this.currentResult) {
        this.editingContent = this.currentResult
      } else {
        this.editingContent = ''
      }

      // 触发内容更新动画
      this.isContentUpdated = true;
      setTimeout(() => {
        this.isContentUpdated = false;
      }, TIMING.CONTENT_UPDATE_FLASH);
    },

    scheduleNextTask() {
      if (this.currentTaskIndex < this.tasks.length - 1) {
        this.autoExecutionTimer = setTimeout(() => {
          this.currentTaskIndex++
          this.executeCurrentTask()
        }, TIMING.NEXT_TASK_INTERVAL)
      } else {
        // 所有任务已完成，调用完成处理
        this.handleAllTasksCompleted()
      }
    },

    handleAllTasksCompleted() {
      // 拆解展示流程已结束（非真实仿真）
      this.currentTaskIndex = this.tasks.length
      this.selectedTaskIndex = null
      this.selectedResult = null
      this.currentResult = {
        agent_type: 'SUMMARY',
        title: '拆解展示已完成',
        description: '当前仅完成目标拆解与步骤预览，尚未执行真实仿真。请点击「下一步」进入实验设计并提交运行。',
        emoji: '🎉'
      }

      this.editingContent = this.currentResult

      this.pushMessage({
        type: 'system',
        content: this.agentDesignSynced
          ? `✅ 目标拆解已完成（共 ${this.tasks.length} 项），并已同步仿真工作室配置。请点击「下一步」进入步骤4。`
          : `✅ 目标拆解已完成（共 ${this.tasks.length} 项）。请点击「下一步」同步智能体配置并进入步骤4。`,
        timestamp: new Date(),
        completionData: {
          totalTasks: this.tasks.length,
          subtasks: this.subtasksData || []
        }
      })
    },

    buildSetAgentsPayload() {
      const reqText = (this.inputMessage || this.store?.scenarioUserGoal || '').trim()
      const phase = this.selectedPhase || localStorage.getItem('scnet_phaseSelection') || 'during'
      return {
        req: reqText,
        tasks: Array.isArray(this.tasks) ? this.tasks : [],
        apiResult: this.apiResult,
        phase
      }
    },

    async syncAgentDesignForCurrentSession(source = 'analysis') {
      if (this.agentDesignSyncing) return this.agentDesignSynced
      if (!this.sessionId || !this.apiResult || !Array.isArray(this.tasks) || this.tasks.length === 0) {
        return false
      }

      const payload = this.buildSetAgentsPayload()
      if (!payload.req || !payload.tasks.length || !payload.apiResult) {
        return false
      }

      this.agentDesignSyncing = true
      this.agentDesignSyncError = ''
      try {
        const pinia = this.store || useSupplyChainStore()
        const setRes = await setAgents(this.sessionId, payload)
        const setData = unwrapApiData(setRes)
        const sid = setData?.session_id || this.sessionId
        this.sessionId = sid
        pinia.setCurrentSessionId(sid)
        pinia.applySetAgentsResult(sid, setData)

        const getRes = await getSupplyChainAgents({
          phase: payload.phase,
          sessionId: sid,
          experimentId: setData?.experiment_id
        })
        const designPayload = unwrapApiData(getRes)
        if (designPayload && Array.isArray(designPayload.agents) && designPayload.agents.length > 0) {
          pinia.applyAgentDesignPayload(designPayload.session_id || sid, designPayload)
          this.agentDesignSynced = true
          return true
        }

        this.agentDesignSyncError = '未获取到智能体配置'
        this.agentDesignSynced = false
        return false
      } catch (error) {
        this.agentDesignSyncError = error?.message || '同步智能体配置失败'
        this.agentDesignSynced = false
        console.warn(`[ScenarioModeling] syncAgentDesignForCurrentSession(${source}) failed:`, error)
        return false
      } finally {
        this.agentDesignSyncing = false
      }
    },

    showTaskTooltip(index, event) {
      this.hoveredTaskIndex = index;
      this.tooltipX = event.pageX + 10;
      this.tooltipY = event.pageY + 10;
    },

    hideTaskTooltip() {
      this.hoveredTaskIndex = null
    },

    callReqAnalysis() {
      return analyzeRequirement(this.buildRequirementForAnalysis(this.inputMessage), this.sessionId, this.selectedPhase)
      .then(async (data) => {
        assertApiSuccess(data)
        const result = unwrapApiData(data)

        // 使用API返回的真实数据
        this.apiResult = this.normalizeApiResultForDisplay(result.content)
        this.sessionId = result.session_id || this.sessionId  // 新增：更新session_id

        // 将拆解结果写入缓存（供后续超时兜底使用）
        const cacheKey = this.getQuestionCacheKey(this.inputMessage, this.selectedPhase)
        const cached = this.getCachedResult(cacheKey)
        this.cacheQuestionResult(cacheKey, {
          judgementResult: cached?.judgementResult || this.judgementResult || {},
          apiResult: this.apiResult,
          subtasksData: this.subtasksData
        })

        // 调试：打印apiResult的结构
        if (import.meta.env.DEV) {
          console.log('[ScenarioModeling] apiResult类型:', typeof this.apiResult)
          console.log('[ScenarioModeling] apiResult键:', this.apiResult ? Object.keys(this.apiResult) : 'null')
          if (this.apiResult && this.apiResult.goal_decomposition) {
            console.log('[ScenarioModeling] goal_decomposition存在')
            console.log('[ScenarioModeling] subtasks数量:', this.apiResult.goal_decomposition.subtasks?.length || 0)
          }
        }

        const tasks = this.generateTaskList(this.apiResult)
        this.tasks = tasks
        const parsedApiResult = typeof this.apiResult === 'string' ? JSON.parse(this.apiResult) : this.apiResult

        // 任务拆解完成后，把任务列表与分析结果回写到会话（用于刷新/恢复）
        if (this.sessionId && tasks?.length > 0) {
          updateTasks(this.sessionId, tasks, parsedApiResult).catch((err) => {
            console.warn('[ScenarioModeling] updateTasks failed:', err?.message || err)
          })
        }

        // 调试：确认subtasksData是否被设置
        if (import.meta.env.DEV) {
          console.log('[ScenarioModeling] subtasksData数量:', this.subtasksData?.length || 0)
        }

        // 将分析结果同步到 Pinia Store，供 AgentSimulationStudio 使用
        if (this.store && this.subtasksData?.length > 0) {
          this.store.setScenarioAnalysis({
            subtasks: this.subtasksData,
            userGoal: this.inputMessage,
            apiResult: parsedApiResult && typeof parsedApiResult === 'object' ? parsedApiResult : null
          })
        }
        // 同步 session_id 到 store
        if (this.store && this.sessionId) {
          this.store.setCurrentSessionId(this.sessionId)
        }
        this.agentDesignSynced = false
        this.agentDesignSyncError = ''

        // 从API结果中提取目标拆解数据
        const goalDecomp = parsedApiResult.goal_decomposition || {}

        // 结构化的任务拆解消息
        const subtasks = goalDecomp.subtasks || this.subtasksData || []

        this.pushMessage({
          type: 'system',
          content: `✅ 目标分析完成，已生成 ${tasks.length} 个拆解任务`,
          timestamp: new Date(),
          analysisData: {
            understanding: goalDecomp.goal_understanding || '系统将分步骤完成您的需求分析',
            subtasks: subtasks,
            influenceFactors: this.toDisplayNameList(parsedApiResult.influence_factor || []),
            responseVars: this.toDisplayNameList(parsedApiResult.response_var || [])
          }
        })

        // 显示任务分析HTML（右侧面板）
        this.taskAnalysisHtml = this.formatTaskAnalysisHtml(tasks)
        await this.syncAgentDesignForCurrentSession('analysis')

        // 延迟后切换到执行状态
        setTimeout(() => {
          this.switchToExecutionState()
          this.startAutoExecution()
          this.isProcessing = false
        }, TIMING.STATE_SWITCH_DELAY)
      })
      .catch(error => {
        console.error('[ScenarioModeling] 需求分析失败:', error)
        this.isProcessing = false
        this.pushMessage({
          type: 'error',
          content: `需求分析失败: ${error.message || '请检查网络连接后重试'}`,
          timestamp: new Date()
        })
      })
    },

    formatJudgementResultHtml(data) {
        const varText = Array.isArray(data.variable) ? data.variable.join('、') : (data.variable || '')
        const missing = !data.goal || !varText || !data.object;
        return `
            <div class="judgement-result-modern">
            <div class="judgement-header ${data.flag === 1 ? 'success' : 'error'}">
                <h3>${data.flag === 1 ? '需求完整，可直接分析' : '需求不完整，无法继续'}</h3>
                <p>${data.flag === 1 ? '所有核心要素已识别' : '请补充缺失要素后重新提交'}</p>
            </div>
            <div class="elements-table-container">
                <table class="elements-table" style="width:100%; border-collapse: collapse; margin-top: 12px;">
                    <tr style="background:#f8f9fa;">
                        <td class="table-label" style="border: 1px solid #dee2e6; padding: 12px; font-weight: bold; width: 30%; text-align: center;">研究目标</td>
                        <td class="table-content" style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">${data.goal ? '✅ ' + data.goal : '❌'}</td>
                    </tr>
                    <tr>
                        <td class="table-label" style="border: 1px solid #dee2e6; padding: 12px; font-weight: bold; text-align: center;">核心变量</td>
                        <td class="table-content" style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">${varText ? '✅ ' + varText : '❌'}</td>
                    </tr>
                    <tr style="background:#f8f9fa;">
                        <td class="table-label" style="border: 1px solid #dee2e6; padding: 12px; font-weight: bold; text-align: center;">作用对象</td>
                        <td class="table-content" style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">${data.object ? '✅ ' + data.object : '❌'}</td>
                    </tr>
                </table>
            </div>
            ${data.flag === 0 ? `
                <div class="judgement-tip">
                <strong>💡 建议：</strong>${data.content || '请明确描述研究目标、核心变量以及作用对象'}
                </div>
            ` : ''}
            </div>
        `;
    },

    submitFeedback() {
      if (this.feedbackInput.trim()) {
        if (this.isRequirementLegal) {
          this.callExpModification(this.feedbackInput)
        } else {
          this.inputMessage = this.feedbackInput
          this.startAnalysis()
        }

        this.feedbackInput = '';
      }
    },

    triggerFileUpload() {
      this.$refs.fileInput.click()
    },

    handleFileChange(event) {
      const file = event.target.files[0]
      if (!file) return

      if (file.type !== 'application/pdf') {
        alert('请上传PDF文件') // In a real app, use a toast
        return
      }

      this.selectedFile = file
      this.uploadFile(file)

      // Reset input so same file can be selected again if needed
      event.target.value = ''
    },

    uploadFile(file) {
      this.isUploading = true

      // Add user message immediately
      this.historyConversations.push({
        type: 'user',
        content: `📄 上传文件: ${file.name}`,
        timestamp: new Date()
      })

      // TODO: 对接真实上传 API（当前为模拟）
      setTimeout(() => {
        this.isUploading = false

        // If in initial dialog, close it and switch to main view
        if (this.showInitialDialog) {
          this.syncFlowStepRoute('smart-dialogue')
          this.showInitialDialog = false
        }

        this.historyConversations.push({
          type: 'system',
          content: `✅ 文件 "${file.name}" 上传成功。正在解析文档内容...`,
          timestamp: new Date()
        })

        // Simulate analysis delay
        setTimeout(() => {
           this.historyConversations.push({
            type: 'system',
            content: `文档解析完成。您可以就文档内容进行提问，或结合文档内容进行场景建模分析。`,
            timestamp: new Date()
          })
          this.scrollToBottom()
        }, TIMING.FILE_PARSE_SIM)

        this.scrollToBottom()
      }, TIMING.FILE_UPLOAD_SIM)
    },

    callExpModification(modification) {
      this.isProcessing = true

      this.pushMessage({
        type: 'user',
        content: modification,
        timestamp: new Date()
      })

      modifyExperiment(modification, {
        tasks: this.tasks,
        apiResult: this.apiResult,
        currentTask: this.currentTaskIndex
      })
      .then((response) => {
        const data = unwrapApiData(response)
        // 调试信息：打印API返回的完整数据结构
        console.log('ExpModification API返回完整数据:', JSON.stringify(data, null, 2))

        // 显示reason信息
        if (data.reason) {
          this.pushMessage({
            type: 'system',
            content: `📝 调整方案说明：${data.reason}`,
            timestamp: new Date()
          })
        }

        if (data.tasks) {
          this.tasks = data.tasks
        }

        // 关键修复：根据用户反馈，后端直接返回实验参数数据，没有apiResult字段
        console.log('直接使用返回的数据作为apiResult:', data)

        // 检查返回的数据是否已经包含前端需要的完整结构
        if (data.goal || data.influence_factor || data.response_var || data.exp_params) {
          // 数据已经包含完整结构，直接使用
          this.apiResult = data
          console.log('数据已经包含完整结构，直接使用')
        } else if (Array.isArray(data)) {
          // 数据是参数数组，转换为前端预期的结构
          console.log('数据是参数数组，转换为对象格式')
          this.apiResult = {
            exp_params: {
              params: data,
              exp_method: '根据用户反馈调整的实验方法'
            },
            req: '根据用户反馈调整实验参数'
          }
        } else {
          // 其他情况，将数据包装为前端可以处理的结构
          console.log('数据格式未知，包装为安全结构')
          this.apiResult = {
            exp_params: {
              params: data,
              exp_method: '根据用户反馈调整的实验方法'
            },
            req: '根据用户反馈调整实验参数'
          }
        }

        if (data.taskAnalysisHtml) {
          this.taskAnalysisHtml = data.taskAnalysisHtml
        } else {
          this.taskAnalysisHtml = this.formatTaskAnalysisHtml(this.tasks)
        }

        // 调试信息：打印更新后的apiResult和tasks
        console.log('更新后的apiResult:', JSON.stringify(this.apiResult, null, 2))
        console.log('更新后的tasks:', this.tasks)

        // 重新生成所有任务结果
        this.regenerateTaskResults()
        this.syncAgentDesignForCurrentSession('modification').catch(() => {})

        this.pushMessage({
          type: 'system',
          content: '✅ 已根据您的反馈更新任务内容',
          timestamp: new Date()
        })

        this.isProcessing = false
      })
      .catch(error => this.handleApiError(error, '实验修改'))
    },

    selectHistoryTask(index) {
      this.selectedTaskIndex = index;

      if (this.taskResults[index]) {
        this.selectedResult = this.taskResults[index]
      } else if (index === this.currentTaskIndex && this.currentResult) {
        this.selectedResult = this.currentResult
      }
    },

    prevTask() {
      if (this.tasks.length === 0) return
      const baseIndex = this.selectedTaskIndex !== null ? this.selectedTaskIndex : this.currentTaskIndex
      const newIndex = Math.max(0, baseIndex - 1)
      this.selectHistoryTask(newIndex)
    },

    nextTask() {
      if (this.tasks.length === 0) return
      const baseIndex = this.selectedTaskIndex !== null ? this.selectedTaskIndex : this.currentTaskIndex
      const newIndex = Math.min(this.tasks.length - 1, baseIndex + 1)
      this.selectHistoryTask(newIndex)
    },

    saveResultModificationOnChange() {
      if (this.selectedResult) {
        const selectedIndex = this.taskResults.findIndex(result => result === this.selectedResult);
        if (selectedIndex !== -1) {
          this.taskResults[selectedIndex] = this.editingContent;
          this.selectedResult = this.editingContent;
        } else if (this.currentTaskIndex < this.tasks.length) {
          this.currentResult = this.editingContent;
          if (this.currentTaskIndex < this.taskResults.length) {
            this.taskResults[this.currentTaskIndex] = this.editingContent;
          }
        }
      } else if (this.currentResult) {
        this.currentResult = this.editingContent;
        if (this.currentTaskIndex < this.taskResults.length) {
          this.taskResults[this.currentTaskIndex] = this.editingContent;
        }
      }
    },

    async goToNextPage() {
      if (this.isProcessing) return;
      if (!this.sessionId) {
        this.pushMessage({ type: 'system', content: '⚠️ 会话未就绪，请先完成需求判断与目标拆解。', timestamp: new Date() })
        return
      }
      if (!this.tasks?.length) {
        this.pushMessage({ type: 'system', content: '⚠️ 暂无拆解任务，无法进入实验设计。', timestamp: new Date() })
        return
      }
      if (!this.agentDesignSynced) {
        this.isProcessing = true
        const synced = await this.syncAgentDesignForCurrentSession('next-step')
        this.isProcessing = false
        if (!synced) {
          this.pushMessage({
            type: 'system',
            content: `⚠️ 智能体配置同步失败：${this.agentDesignSyncError || '请稍后重试'}`,
            timestamp: new Date()
          })
          return
        }
      }

      const pinia = this.store || useSupplyChainStore()
      pinia.setCurrentSessionId(this.sessionId)
      this.$router.push({ path: '/home/SCnet/agent-design-studio', query: { view: 'workflow' } })
    }
  },

  beforeDestroy() {
    if (this.autoExecutionTimer) {
      clearTimeout(this.autoExecutionTimer)
    }
  },

  mounted() {
    const storedPhase = localStorage.getItem('scnet_phaseSelection')
    if (storedPhase === 'pre' || storedPhase === 'during' || storedPhase === 'post') {
      this.selectedPhase = storedPhase
    }
    this.loadSessionHistory()
    // 应用首次进入时的步骤 query；缺省进入步骤 1
    const routeStep = this.$route?.query?.step
    if (routeStep) {
      this.applyFlowStep(routeStep)
    } else {
      this.$router.replace({
        path: '/home/SCnet/scenarioModeling',
        query: { ...(this.$route?.query || {}), step: 'scenario-setup' }
      })
      this.applyFlowStep('scenario-setup')
    }
    this.$nextTick(() => {
      if (this.$refs.initialInput) {
        this.$refs.initialInput.focus();
      }
    });
  }
}
