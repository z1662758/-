import { modifyExperiment, judgeRequirement, analyzeRequirement, setAgents } from '@/api/scnet/scenarioModelingV1'
import {
  createSession,
  updateTaskResult,
  updateTasks,
  addChatMessage
} from '@/api/scenarioSession'
import { getSupplyChainAgents } from '@/api/supplyChain'
import { normalizeAgentDesignResponse } from '@/api/scnet/_normalizers'
import { unwrapApiData, assertApiSuccess } from '@/utils/session'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { readScnetPhase } from '@/constants/scnetPhase'

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
}

/** SSE 阶段灯组初始状态 */
function initialStageStatus() {
  return {
    ra_observer: 'pending',
    ra_agent: 'pending',
    ad_agent: 'pending',
    ad_observer: 'pending'
  }
}

export default {
  name: 'Uranium_ScenarioModeling',
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
      stageStatus: initialStageStatus(),   // SSE 阶段灯组: pending|running|done|error
      stageWarnings: [],                   // ad_observer 返回的 warnings
      analyzeController: null,             // 当前 SSE 流的 AbortController
      hasAgentDesign: false,               // 当前 session 是否已拿到 agent_design
      agentDesignError: '',                // 智能体设计失败原因 (ad_agent error / observer reject)
      agentDesignSynced: false,            // 当前 session 智能体配置是否已与后端同步
      agentDesignSyncError: '',            // 智能体同步失败原因
      agentDesignSyncing: false,           // 智能体同步进行中标记，防止并发
      modifying: false,                    // 「调整方案」按钮 loading
      // 按阶段分组的示例问题
      phaseExampleQuestions: {
        pre: [
          {
            icon: '🗺️',
            title: '供给匹配',
            text: '铀需求强度上升时，供给能力需要如何调整，才能减少缺口并保持履约稳定'
          },
          {
            icon: '📦',
            title: '库存与供给',
            text: '库存覆盖和供给保障能力同时波动时，系统会先在哪个环节出现压力'
          },
          {
            icon: '⚠️',
            title: '协同效益',
            text: '上游协同范围扩大后，协同次数上升是否真的能带来更高的履约表现'
          },
          {
            icon: '🎯',
            title: '方案对比',
            text: '在履约、成本和协同效率之间，哪类参数组合更适合当前铀网络'
          }
        ],
        during: [
          {
            icon: '📦',
            title: '供给分配',
            text: '需求突然上涨时，有限供给在各节点怎么分配才能避免局部缺口扩大'
          },
          {
            icon: '🤝',
            title: '节点协同',
            text: '上游协同范围扩大后，跨节点协同次数增加是否足以抵消运输和调度压力'
          },
          {
            icon: '🔄',
            title: '供给扩展',
            text: '高峰期临时扩产时，哪类矿山先扩更稳：高利用率矿山还是低利用率矿山'
          },
          {
            icon: '💰',
            title: '定价与库存',
            text: '报价溢价和库存同时调整时，成本改善和缺口扩大的平衡点在哪里'
          }
        ],
        post: [
          {
            icon: '📈',
            title: '协同效率评估',
            text: '复盘本轮仿真中协同网络变化，哪些链路带来了真实的履约提升'
          },
          {
            icon: '💵',
            title: '成本结构分析',
            text: '从履约完成率和系统成本反推，哪些参数导致了主要成本压力'
          },
          {
            icon: '🔍',
            title: '韧性复盘',
            text: '在供给扰动恢复阶段，哪类节点恢复慢，导致整条链路恢复被拖慢'
          },
          {
            icon: '🏆',
            title: '绩效对比',
            text: '对比多轮方案后，哪个参数组合在履约、协同次数和综合收益上最均衡'
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

    editingContent() {
      this.saveResultModificationOnChange();
    },

    historyConversations() {
      this.$nextTick(() => {
        this.scrollToBottom();
      });
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
      return this.tasks[this.currentTaskIndex] || '实验设计生成完成'
    },

    progressPercentage() {
      if (this.tasks.length === 0) {
        return 0
      }
      return (Math.min(this.currentTaskIndex, this.tasks.length) / this.tasks.length) * 100
    }
  },
  methods: {
    sanitizeDisplayText(text) {
      if (text === null || text === undefined) return ''
      let result = String(text)
      const replacements = [
        [/\bLevel[_\s-]?1订单完成率\b/gi, '一级履约完成率'],
        [/\bLevel[_\s-]?2订单完成率\b/gi, '二级履约完成率'],
        [/\bLevel[_\s-]?3订单完成率\b/gi, '三级履约完成率'],
        [/\bLevel[_\s-]?1\b/gi, '一级'],
        [/\bLevel[_\s-]?2\b/gi, '二级'],
        [/\bLevel[_\s-]?3\b/gi, '三级'],
        [/\blevel1_completion_rate\b/gi, '一级履约完成率'],
        [/\blevel2_completion_rate\b/gi, '二级履约完成率'],
        [/\border_completion_rate\b/gi, '履约完成率'],
        [/\btotal_net_profit\b/gi, '综合收益'],
        [/\bcooperation_count\b/gi, '协同次数'],
        [/\bnetwork_density\b/gi, '网络密度'],
        [/\bavg_utilization\b/gi, '平均利用率'],
        [/\bsupplier[_\s-]?utilization\b/gi, '上游平均利用率'],
        [/\bsupplier[_\s-]?avg[_\s-]?utilization\b/gi, '上游平均利用率'],
        [/\bmarket_reach\b/gi, '覆盖范围'],
        [/\binventory_capacity\b/gi, '库存容量上限'],
        [/\bmarkup_rate\b/gi, '报价溢价'],
        [/\border_multiplier\b/gi, '铀需求强度参数'],
        [/\bfactory_capacity_range\b/gi, '供给能力区间'],
        [/\bcollaboration_radius\b/gi, '协同半径'],
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
        `补充语境：这是铀供应链${phaseName}需求。作用对象为铀供应网络、铀供应节点或铀矿山供应节点；核心变量可从铀需求强度参数、供给能力区间、供应保障能力、库存容量上限、协同半径、协同次数、报价溢价、节点恢复速度中识别；响应指标可从履约完成率、供给缺口、局部供给缺口、综合收益、系统成本、上游平均利用率、恢复时间中识别。请基于原问题提取研究目标、核心变量和作用对象。`
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

    /**
     * 根据子任务的 agent_type 从 apiResult 摘取相关分析数据，生成富含真实内容的结果对象。
     * 替代以前直接拷贝 subtask 字段的占位逻辑。
     */
    buildSubtaskResult(subtask, index, apiResult) {
      const safeSubtask = subtask || {}
      const agentCode = (safeSubtask.agent_type || safeSubtask.assigned_agent || 'AGENT').toString().toUpperCase()

      const parsed = apiResult && typeof apiResult === 'object'
        ? apiResult
        : (() => { try { return JSON.parse(apiResult) } catch { return {} } })()

      const details = this.collectAgentDetails(agentCode, parsed, safeSubtask)

      return {
        emoji: safeSubtask.emoji || '📌',
        agent_type: this.getAgentDisplayName(agentCode),
        agent_code: agentCode,
        title: safeSubtask.title || safeSubtask.description || this.tasks[index] || `子任务${index + 1}`,
        description: safeSubtask.description || safeSubtask.title || '',
        priority: safeSubtask.priority || 3,
        parameters: safeSubtask.parameters || {},
        details
      }
    },

    /**
     * 按 agent_type 拼装结构化详情：从 apiResult 真实数据中取
     * - ENVIRONMENT: 影响因素 / 实验参数
     * - OBSERVER:    响应变量 / 公式
     * - SOCIAL/PLANNER: 子任务自带 parameters（来自 goal_decomposition）
     * - SUMMARY:    汇总目标
     */
    collectAgentDetails(agentCode, apiResult, subtask) {
      const r = apiResult || {}
      const sections = []

      const factors = this.toDisplayNameList(r.influence_factor || [])
      const responses = this.toDisplayNameList(r.response_var || [])
      const subInfluence = this.toDisplayNameList((subtask?.parameters || {}).influence_factors || [])
      const subResponse = this.toDisplayNameList((subtask?.parameters || {}).response_variables || [])

      const code = (agentCode || '').toUpperCase()

      if (code === 'ENVIRONMENT') {
        const list = subInfluence.length ? subInfluence : factors
        if (list.length) sections.push({ label: '影响因素', items: list })
        if (r.exp_params) {
          const exp = r.exp_params?.exp_params || r.exp_params
          if (exp?.exp_method) sections.push({ label: '建模方法', text: this.sanitizeDisplayText(exp.exp_method) })
        }
      } else if (code === 'OBSERVER') {
        const list = subResponse.length ? subResponse : responses
        if (list.length) sections.push({ label: '响应变量', items: list })
        if (r.formula && typeof r.formula === 'object') {
          const formulas = Object.entries(r.formula).map(([k, v]) => `${k} = ${v}`)
          if (formulas.length) sections.push({ label: '关键公式', items: formulas })
        }
      } else if (code === 'SOCIAL' || code === 'PLANNER') {
        if (subInfluence.length) sections.push({ label: '关注变量', items: subInfluence })
        if (subResponse.length) sections.push({ label: '观测指标', items: subResponse })
        if (r.exp_params) {
          const exp = r.exp_params?.exp_params || r.exp_params
          if (exp?.exp_method) sections.push({ label: '设计方法', text: this.sanitizeDisplayText(exp.exp_method) })
        }
      } else if (code === 'SUMMARY') {
        const understanding = r.goal_decomposition?.goal_understanding
        if (understanding) sections.push({ label: '目标理解', text: this.sanitizeDisplayText(understanding) })
        if (factors.length) sections.push({ label: '影响因素', items: factors })
        if (responses.length) sections.push({ label: '响应变量', items: responses })
      } else {
        if (subInfluence.length) sections.push({ label: '影响因素', items: subInfluence })
        if (subResponse.length) sections.push({ label: '响应变量', items: subResponse })
      }

      return sections.length ? { sections } : null
    },

    /**
     * 将 buildSubtaskResult.details 渲染成 HTML 片段
     */
    renderSubtaskDetails(details) {
      const sections = Array.isArray(details?.sections) ? details.sections : []
      if (!sections.length) return ''
      let html = '<div class="subtask-details">'
      for (const sec of sections) {
        html += '<div class="subtask-detail-section">'
        html += `<div class="subtask-detail-label">${this.sanitizeDisplayText(sec.label || '')}</div>`
        if (Array.isArray(sec.items)) {
          html += '<ul class="subtask-detail-list">'
          for (const item of sec.items) {
            html += `<li>${this.sanitizeDisplayText(typeof item === 'string' ? item : JSON.stringify(item))}</li>`
          }
          html += '</ul>'
        } else if (sec.text) {
          html += `<div class="subtask-detail-text">${this.sanitizeDisplayText(sec.text)}</div>`
        }
        html += '</div>'
      }
      html += '</div>'
      return html
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

        // 真实分析详情（buildSubtaskResult 写入的结构化字段）
        if (content.details && typeof content.details === 'object') {
          html += this.renderSubtaskDetails(content.details)
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
      } catch {
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
    getParticleStyle() {
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
        } catch {
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

      const envFactors = factors.length > 0 ? factors : ['铀需求强度', '供给能力', '供给保障能力']
      const obsResponses = responses.length > 0 ? responses : ['履约完成率', '综合收益']

      return [
        {
          task_id: 'task_environment',
          title: '刻画需求冲击与供给约束',
          description: '明确需求上升幅度、节点供给能力和库存约束，形成本轮铀供应扰动输入。',
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
          title: '设定缺口与履约观测口径',
          description: '定义局部供给缺口、履约完成率和成本收益等指标，作为方案比较标准。',
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
          title: '推演跨节点供给调配方案',
          description: '比较不同供应节点、矿山和库存之间的调配策略，判断缺口是否被放大或缓解。',
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
          title: '输出优先级与迭代策略',
          description: '汇总各方案在履约、缺口和成本上的表现，给出优先执行顺序和后续迭代方向。',
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

    extractReqAnalysisContent(result) {
      if (!result || typeof result !== 'object') return {}
      if (result.content && typeof result.content === 'object') return result.content

      const expPlan = (result.exp_plan && typeof result.exp_plan === 'object') ? { ...result.exp_plan } : {}
      const goalDecomposition = (expPlan.goal_decomposition && typeof expPlan.goal_decomposition === 'object')
        ? { ...expPlan.goal_decomposition }
        : {}
      if (!Array.isArray(goalDecomposition.subtasks) || goalDecomposition.subtasks.length === 0) {
        goalDecomposition.subtasks = this.buildFallbackSubtasksFromExpPlan(expPlan)
      }
      if (!goalDecomposition.goal_understanding) {
        goalDecomposition.goal_understanding = this.sanitizeDisplayText(expPlan?.goal?.explain || this.inputMessage || '')
      }
      if (!goalDecomposition.user_goal) {
        goalDecomposition.user_goal = this.sanitizeDisplayText(this.inputMessage || this.store?.scenarioUserGoal || '')
      }

      return {
        ...expPlan,
        goal_decomposition: goalDecomposition,
        judgement: (result.judgement && typeof result.judgement === 'object') ? result.judgement : undefined,
        stage: result.stage,
        ok: result.ok,
        warnings: Array.isArray(result.warnings) ? result.warnings : [],
        phase: result.phase
      }
    },

    async ensureSessionId(requirementText = '', options = {}) {
      const forceNew = options?.forceNew === true
      const existing = (this.sessionId || this.store?.currentSessionId || '').trim()
      if (existing && !forceNew) {
        this.sessionId = existing
        this.store?.setCurrentSessionId(existing)
        return existing
      }

      const reqText = String(requirementText || this.inputMessage || '').trim()
      const created = await createSession(reqText || '未命名推演需求')
      const sessionData = unwrapApiData(created) || {}
      const sid = String(sessionData.session_id || '').trim()
      if (!sid) {
        throw new Error('创建会话失败：未返回 session_id')
      }

      this.sessionId = sid
      if (this.store) {
        this.store.setCurrentSessionId(sid)
        this.store.commitStepResult('goal-input', {
          sessionId: sid,
          userGoal: reqText || this.inputMessage || '',
          requirementMeta: {
            analysis_phase: this.selectedPhase || '',
            raw_input: reqText || this.inputMessage || '',
            model_name: this.resolveModelName()
          }
        })
      }
      return sid
    },

    /**
     * 构造发往后端的 scenario_context payload；store 上下文未初始化时返回 null
     */
    getScenarioContextPayload() {
      const ctx = this.store?.scenarioContext
      if (!ctx) return null
      const trimmed = {
        historical_background: (ctx.historicalBackground || '').trim(),
        initial_event: (ctx.initialEvent || '').trim(),
        current_progress: (ctx.currentProgress || '').trim(),
        complete_timeline: (ctx.completeTimeline || '').trim()
      }
      const hasAny = Object.values(trimmed).some(v => v.length > 0)
      return hasAny ? trimmed : null
    },

    resolveModelName() {
      const localModel = typeof this.selectedModel === 'string' ? this.selectedModel.trim() : ''
      const storedModel = typeof this.store?.scenarioRequirementMeta?.model_name === 'string'
        ? this.store.scenarioRequirementMeta.model_name.trim()
        : ''
      return localModel || storedModel || 'qwen'
    },

    /**
     * 处理需求判断成功（抽离为独立方法，便于复用）
     * @param {object} result - API 返回结果
     */
    handleJudgementSuccess(result) {
      this.judgementResult = result

      // 保存会话ID
      const sid = result?.session_id || this.sessionId
      this.sessionId = sid
      console.log('[ScenarioModeling] 会话ID:', this.sessionId)

      this.isRequirementLegal = result.flag === 1

      // 写入 store —— session_id 单一来源
      if (this.store && this.sessionId) {
        this.store.commitStepResult('goal-input', {
          sessionId: this.sessionId,
          userGoal: this.inputMessage,
          requirementMeta: {
            goal: result.goal || '',
            variable: result.variable || '',
            object: result.object || '',
            is_legal: result.flag === 1,
            analysis_phase: this.selectedPhase || '',
            raw_input: this.inputMessage,
            model_name: this.resolveModelName()
          }
        })
        // 步骤1 场景上下文也一并 commit（若已填写）
        if (this.store.scenarioContext) {
          this.store.setScenarioContext(this.store.scenarioContext)
        }
      }

      if (result.flag === 1) {
        this.requirementElements = {
          goal: result.goal,
          variable: result.variable,
          object: result.object
        }
        this.showInitialDialog = false
        return this.callReqAnalysis()
      } else {
        this.pushMessage({
          type: 'system',
          content: '⚠️ 需求不完整，请补充缺失要素',
          timestamp: new Date(),
          data: result
        })
        this.showInitialDialog = false
        this.taskAnalysisHtml = this.formatJudgementResultHtml(result)
        this.isProcessing = false
      }
    },

    async startAnalysis() {
      if (!this.inputMessage.trim() || this.isProcessing) return

      this.isProcessing = true
      this.agentDesignSynced = false
      this.agentDesignSyncError = ''

      try {
        // 每次新分析默认新建会话，避免复用旧 session 导致数据串线
        await this.ensureSessionId(this.inputMessage.trim(), { forceNew: true })
      } catch (error) {
        this.handleApiError(error, '创建会话')
        return
      }

      this.pushMessage({
        type: 'user',
        content: this.inputMessage,
        timestamp: new Date()
      })

      const analysisRequirement = this.buildRequirementForAnalysis(this.inputMessage)

      judgeRequirement(
        analysisRequirement,
        this.sessionId || null,
        this.selectedPhase,
        this.getScenarioContextPayload(),
        this.resolveModelName()
      )
      .then((response) => {
        const result = unwrapApiData(response)
        this.handleJudgementSuccess(result)
      })
      .catch(error => {
        // 失败时保持在「需求输入」对话框，让用户直接重试，而不是把页面切到 smart-dialogue —
        // 那个切换在用户视角下表现为"页面莫名其妙刷新"。
        this.handleApiError(error, '需求判断')
        const errMsg = error?.message || '请求失败，请重试'
        if (this.$message) {
          this.$message.error(`需求分析失败：${errMsg}`)
        }
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
      html += '<div class="header-badge">推演任务已生成</div>'
      html += '<h3>推演任务分解</h3>'
      html += '</div>'
      html += '<p class="analysis-intro">根据当前供需冲击与设定条件，系统已生成以下分析任务：</p>'
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

    // 分析完成后一次性合成所有子任务结果并置为「已完成」态。
    // 取代旧的 startAutoExecution / executeCurrentTask / scheduleNextTask 逐任务 setTimeout 假进度。
    finishDecompositionImmediately() {
      this.currentState = 'execution'
      this.selectedTaskIndex = null
      this.selectedResult = null
      this.taskResults = (this.subtasksData || []).map((sub, idx) =>
        this.buildSubtaskResult(sub, idx, this.apiResult)
      )
      this.handleAllTasksCompleted()
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

        // 使用后端返回的子任务数据 + reqAnalysis 返回的真实分析字段
        if (this.subtasksData && this.subtasksData.length > this.currentTaskIndex) {
          const subtask = this.subtasksData[this.currentTaskIndex]
          result = this.buildSubtaskResult(subtask, this.currentTaskIndex, this.apiResult)
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
            case '确定影响因素': {
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
            }
            case '找出响应变量': {
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
            }
            case '设计实验方法': {
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
            }
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
      // 实验设计与分析结果已完成（非真实仿真）
      this.currentTaskIndex = this.tasks.length
      this.selectedTaskIndex = null
      this.selectedResult = null
      this.currentResult = {
        agent_type: 'SUMMARY',
        title: '推演方案已生成',
        description: '已完成需求分解与方案规划。可在右侧查看策略对比，或点击「下一步」进入实体拓扑。',
        emoji: '✓'
      }

      this.editingContent = this.currentResult

      this.pushMessage({
        type: 'system',
        content: `✅ 推演任务已生成，已形成 ${this.tasks.length} 项子任务。请点击「下一步」进入实体建模。`,
        timestamp: new Date(),
        completionData: {
          totalTasks: this.tasks.length,
          subtasks: this.subtasksData || []
        }
      })
    },

    buildSetAgentsPayload() {
      const reqText = (this.inputMessage || this.store?.scenarioUserGoal || '').trim()
      const phase = this.selectedPhase || readScnetPhase()
      return {
        req: reqText,
        tasks: Array.isArray(this.tasks) ? this.tasks : [],
        exp_plan: this.apiResult && typeof this.apiResult === 'object' ? this.apiResult : {},
        apiResult: this.apiResult,
        phase,
        model_name: this.resolveModelName()
      }
    },

    extractAnalyzeAgentDesignPayload(result = {}, fallbackSessionId = '') {
      if (!result || typeof result !== 'object') return null
      const design = (result.agent_design && typeof result.agent_design === 'object')
        ? result.agent_design
        : null
      if (!design) return null

      const sid = String(result.session_id || fallbackSessionId || this.sessionId || '').trim()
      const phase = result.phase || this.selectedPhase || readScnetPhase()
      const observation = (result.agent_observation && typeof result.agent_observation === 'object')
        ? result.agent_observation
        : null
      let formatCheck = (result.format_check && typeof result.format_check === 'object')
        ? result.format_check
        : null
      if (!formatCheck && observation && Object.prototype.hasOwnProperty.call(observation, 'is_reasonable')) {
        formatCheck = {
          ok: Number(observation.is_reasonable) === 1,
          reason: observation.reason || ''
        }
      }

      return {
        session_id: sid,
        phase: phase || '',
        experiment_id: result.experiment_id || '',
        agents: Array.isArray(design.agents) ? design.agents : [],
        attribute_explain: Array.isArray(design.attribute_explain) ? design.attribute_explain : [],
        relationship_net: design.relationship_net || [],
        agent_design: design,
        agent_observation: observation,
        format_check: formatCheck
      }
    },

    applyAnalyzeAgentDesignPayload(result = {}, fallbackSessionId = '') {
      const payload = this.extractAnalyzeAgentDesignPayload(result, fallbackSessionId)
      if (!payload || !Array.isArray(payload.agents) || payload.agents.length === 0 || !this.store) {
        return false
      }

      const sid = payload.session_id || fallbackSessionId || this.sessionId
      if (sid) {
        this.sessionId = sid
        this.store.setCurrentSessionId(sid)
      }
      this.store.applySetAgentsResult(sid, payload)
      this.store.applyAgentDesignPayload(sid, payload)
      this.agentDesignSynced = true
      this.agentDesignSyncError = ''
      return true
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
        const pinia = this.store
        // 优先读后端快照；命中则不再重复触发耗时的 setAgents 生成
        try {
          const fastGetRes = await getSupplyChainAgents({
            phase: payload.phase,
            sessionId: this.sessionId
          })
          const fastPayload = normalizeAgentDesignResponse(unwrapApiData(fastGetRes))
          if (Array.isArray(fastPayload.agents) && fastPayload.agents.length > 0) {
            const sid = fastPayload?.session_id || this.sessionId
            this.sessionId = sid
            pinia.setCurrentSessionId(sid)
            pinia.applySetAgentsResult(sid, fastPayload)
            pinia.applyAgentDesignPayload(sid, fastPayload)
            this.agentDesignSynced = true
            return true
          }
        } catch (error) {
          console.warn('[ScenarioModeling] fast getSupplyChainAgents failed:', error?.message || error)
        }

        const setRes = await setAgents(this.sessionId, payload)
        const setData = normalizeAgentDesignResponse(unwrapApiData(setRes))
        const sid = setData?.session_id || this.sessionId
        this.sessionId = sid
        pinia.setCurrentSessionId(sid)
        pinia.applySetAgentsResult(sid, setData)

        // v1 /experiment-design/agents 已直接返回完整设计，优先复用，避免再做一次 getAgents 往返。
        if (Array.isArray(setData.agents) && setData.agents.length > 0) {
          pinia.applyAgentDesignPayload(sid, setData)
          this.agentDesignSynced = true
          return true
        }

        const getRes = await getSupplyChainAgents({
          phase: payload.phase,
          sessionId: sid,
          experimentId: setData?.experiment_id
        })
        const designPayload = normalizeAgentDesignResponse(unwrapApiData(getRes))
        if (Array.isArray(designPayload.agents) && designPayload.agents.length > 0) {
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
      return analyzeRequirement(
        this.buildRequirementForAnalysis(this.inputMessage),
        this.sessionId,
        this.selectedPhase,
        this.getScenarioContextPayload(),
        { designAgents: false },
        this.resolveModelName()
      )
      .then(async (data) => {
        assertApiSuccess(data)
        const result = unwrapApiData(data)
        const judgement = (result.judgement && typeof result.judgement === 'object') ? result.judgement : {}
        const isRequirementLegal = Number(judgement.flag) === 1

        if (!isRequirementLegal || result.stage === 'judge' || result.ok === false) {
          this.judgementResult = judgement
          this.isRequirementLegal = false

          if (this.store) {
            this.store.commitStepResult('goal-input', {
              sessionId: result.session_id || this.sessionId,
              userGoal: this.inputMessage,
              requirementMeta: {
                goal: judgement.goal || '',
                variable: judgement.variable || '',
                object: judgement.object || '',
                is_legal: false,
                analysis_phase: this.selectedPhase || '',
                raw_input: this.inputMessage,
                model_name: this.resolveModelName()
              }
            })
          }

          this.pushMessage({
            type: 'system',
            content: '⚠️ 需求不完整，请补充缺失要素后继续。',
            timestamp: new Date(),
            data: judgement
          })
          this.taskAnalysisHtml = this.formatJudgementResultHtml(judgement)
          this.tasks = []
          this.taskResults = []
          this.currentResult = null
          this.selectedResult = null
          this.isProcessing = false
          return
        }

        // 使用API返回的真实数据
        this.apiResult = this.normalizeApiResultForDisplay(this.extractReqAnalysisContent(result))
        // 同步 session_id 到本组件与 store —— 单一来源
        const sid = result.session_id || this.sessionId
        this.sessionId = sid
        if (this.store && sid) {
          this.store.setCurrentSessionId(sid)
        }
        const hasAnalyzeAgentDesign = this.applyAnalyzeAgentDesignPayload(result, sid)

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

        // 通过 commitStepResult 一次性把 RA 流水线产物写入 store
        if (this.store) {
          this.store.commitStepResult('goal-input', {
            sessionId: this.sessionId,
            userGoal: this.inputMessage,
            apiResult: parsedApiResult && typeof parsedApiResult === 'object' ? parsedApiResult : null,
            tasks,
            taskResults: []
          })
        }
        this.agentDesignSynced = !!hasAnalyzeAgentDesign
        this.agentDesignSyncError = ''

        // 从API结果中提取目标拆解数据
        const goalDecomp = parsedApiResult.goal_decomposition || {}

        // 结构化的任务拆解消息
        const subtasks = goalDecomp.subtasks || this.subtasksData || []

        this.pushMessage({
          type: 'system',
          content: `✅ 需求分析完成，已生成 ${tasks.length} 个推演任务`,
          timestamp: new Date(),
          analysisData: {
            understanding: goalDecomp.goal_understanding || '系统将根据供需约束与业务参数开展多方案协同推演',
            subtasks: subtasks,
            selectedEntities: typeof this.extractSelectedEntities === 'function'
              ? this.extractSelectedEntities(parsedApiResult)
              : [],
            influenceFactors: this.toDisplayNameList(parsedApiResult.influence_factor || []),
            responseVars: this.toDisplayNameList(parsedApiResult.response_var || [])
          }
        })

        // 显示任务分析HTML（右侧面板）
        this.taskAnalysisHtml = this.formatTaskAnalysisHtml(tasks)
        // 首轮分析不阻塞等待 ADAgent；后台补同步即可
        if (!this.agentDesignSynced) {
          this.syncAgentDesignForCurrentSession('analysis').catch(() => {})
        }

        // 分析完成：不再逐任务模拟进度，直接一次性进入「已完成」展示态
        this.finishDecompositionImmediately()
        this.isProcessing = false
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
          content: '✅ 已根据补充条件更新推演任务',
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
        this.pushMessage({ type: 'system', content: '⚠️ 会话未就绪, 请先完成需求判断与目标拆解。', timestamp: new Date() })
        return
      }
      if (!this.tasks?.length) {
        this.pushMessage({ type: 'system', content: '⚠️ 暂无拆解任务，无法进入实验设计。', timestamp: new Date() })
        return
      }
      if (!this.agentDesignSynced && !this.agentDesignSyncing) {
        this.syncAgentDesignForCurrentSession('next-step').catch(() => {})
      }

      const pinia = this.store
      pinia.setCurrentSessionId(this.sessionId)
      this.$router.push({ path: SCNET_ROUTES.agentSimulationStudio, query: { view: 'workflow' } })
    },

    async modifyPlan() {
      if (this.modifying) return
      if (!this.apiResult) {
        this.$message?.warning?.('暂无可调整的方案，请先完成实验设计生成')
        return
      }
      let proposal = ''
      try {
        const res = await this.$prompt(
          '请描述方案调整诉求, 例如: 把库存上限改成 [200, 800] / 加大供给权重 / 缩小协同半径...',
          '调整方案',
          {
            confirmButtonText: '提交调整',
            cancelButtonText: '取消',
            inputType: 'textarea',
            inputPlaceholder: '调整诉求(自然语言)'
          }
        )
        proposal = (res?.value || '').trim()
      } catch {
        return
      }
      if (!proposal) {
        this.$message?.warning?.('调整诉求不能为空')
        return
      }

      this.modifying = true
      try {
        const response = await modifyExperiment(proposal, {
          tasks: this.tasks,
          apiResult: this.apiResult
        })
        const data = unwrapApiData(response)
        if (!data) {
          this.$message?.warning?.('调整结果为空, 请稍后重试')
          return
        }
        // 后端 modify 返回新的 exp_plan / tasks, 更新对话与 store
        if (Array.isArray(data.tasks) && data.tasks.length) {
          this.tasks = data.tasks.map((t) => (typeof t === 'string' ? t : (t?.title || t?.description || '')))
        }
        if (data.apiResult || data.exp_plan) {
          const nextApi = data.apiResult || { ...(this.apiResult || {}), exp_plan: data.exp_plan }
          this.apiResult = nextApi
          this.store.setScenarioAnalysis({
            apiResult: nextApi,
            userGoal: this.store.scenarioUserGoal
          })
        }
        this.pushMessage({
          type: 'system',
          content: `✅ 方案已按要求更新: ${proposal.slice(0, 60)}${proposal.length > 60 ? '…' : ''}`,
          timestamp: new Date()
        })
        this.$message?.success?.('方案已更新, 可继续迭代或点「确认并提交实验」')
      } catch (error) {
        this.$message?.error?.(`调整失败: ${error?.message || '未知错误'}`)
      } finally {
        this.modifying = false
      }
    },

    _escapeHtml(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }
  },

  beforeDestroy() {
    if (this.autoExecutionTimer) {
      clearTimeout(this.autoExecutionTimer)
    }
  },

  mounted() {
    const storedPhase = readScnetPhase('')
    if (storedPhase === 'pre' || storedPhase === 'during' || storedPhase === 'post') {
      this.selectedPhase = storedPhase
    }
    // 旧的 5 步流程已合并为 'goal-input'，把残留的旧 step query 规范化，避免 layout 步骤条/书签恢复时显示错位
    const LEGACY_STEP_KEYS = new Set(['scenario-setup', 'requirement-input', 'smart-dialogue', 'target-input', 'analysis', 'modeling'])
    const rawStep = this.$route?.query?.step
    if (!rawStep || LEGACY_STEP_KEYS.has(rawStep)) {
      this.$router.replace({
        path: SCNET_ROUTES.scenarioModeling,
        query: { ...(this.$route?.query || {}), step: 'goal-input' }
      })
    }
    this.$nextTick(() => {
      if (this.$refs.initialInput) {
        this.$refs.initialInput.focus();
      }
    });
  }
}
