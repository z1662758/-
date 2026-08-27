<template>
  <div class="scenario-modeling-root">
    <!-- 全局隐藏文件上传输入框（始终可用） -->
    <input
      type="file"
      ref="fileInput"
      style="display: none"
      accept=".pdf"
      @change="handleFileChange"
    />
    <!-- 主界面 - 智能对话 -->
    <div class="scenario-modeling-container">
      <div class="main-content">
        <!-- 左侧对话面板 -->
        <div class="conversation-panel glass-effect">
          <div class="panel-header">
            <div class="header-title">
              <span class="header-icon-small">💬</span>
              <span>智能对话</span>
            </div>
            <div class="conversation-stats">
              <span class="stat-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {{ historyConversations.length }}
              </span>
            </div>
          </div>

          <!-- 对话历史区域 -->
          <div class="conversation-messages" ref="messagesContainer">
            <!-- 对话消息 -->
            <div
              v-for="(msg, index) in historyConversations"
              :key="index"
              class="message-wrapper"
              :class="msg.type"
            >
              <div class="message-bubble">
                <div class="message-avatar">
                  <span v-if="msg.type === 'user'">👤</span>
                  <span v-else>🤖</span>
                </div>
                <div class="message-content-wrapper">
                  <div class="message-header">
                    <span class="message-sender">{{ msg.type === 'user' ? '您' : 'AI助手' }}</span>
                    <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                  </div>
                  <div v-if="!msg.analysisData" class="message-text" style="white-space: pre-wrap;">{{ msg.content }}</div>

                  <!-- 如果是判断结果，显示要素表格 -->
                  <div v-if="msg.data && msg.type === 'system' && msg.data.flag === 0 && msg.data.goal" class="requirement-mini-table">
                    <div class="mini-table-row">
                      <span class="mini-label">目标</span>
                      <span class="mini-value" :class="{ 'missing': !msg.data.goal }">
                        {{ msg.data.goal || '缺失' }}
                      </span>
                    </div>
                    <div class="mini-table-row">
                      <span class="mini-label">变量</span>
                      <span class="mini-value" :class="{ 'missing': !msg.data.variable }">
                        <template v-if="Array.isArray(msg.data.variable)">
                          <span v-for="(v, i) in msg.data.variable" :key="i" class="var-tag influence">{{ v }}</span>
                        </template>
                        <template v-else>{{ msg.data.variable || '缺失' }}</template>
                      </span>
                    </div>
                    <div class="mini-table-row">
                      <span class="mini-label">对象</span>
                      <span class="mini-value" :class="{ 'missing': !msg.data.object }">
                        {{ msg.data.object || '缺失' }}
                      </span>
                    </div>
                  </div>

                  <!-- 分析结果结构化展示 -->
                  <div v-if="msg.analysisData" class="analysis-result-card">
                    <div class="analysis-card-header">
                      <div>
                        <strong>实验设计已生成</strong>
                        <span>已完成需求拆解与变量识别</span>
                      </div>
                      <span class="analysis-total">{{ msg.analysisData.subtasks?.length || 0 }} 项任务</span>
                    </div>
                    <div class="analysis-section tasks-section">
                      <div class="section-title">
                        <span>任务拆解</span>
                      </div>
                      <div class="task-chips">
                        <div v-for="(task, i) in msg.analysisData.subtasks" :key="i" class="task-chip">
                          <span class="chip-number">{{ i + 1 }}</span>
                          <div class="task-chip-main">
                            <span class="chip-text">{{ task.title || task.description || '' }}</span>
                            <span class="chip-agent">{{ getAgentDisplayName(task.agent_type || task.assigned_agent) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="analysis-section variables-section entity-flow-section" v-if="getSelectedEntities(msg).length">
                      <div class="section-title">
                        <span>实体选择</span>
                      </div>
                      <div class="var-group">
                        <div class="var-tags">
                          <span v-for="(entity, i) in getVisibleSelectedEntities(msg)" :key="i" class="var-tag entity">{{ entity }}</span>
                          <span v-if="getSelectedEntities(msg).length > 6" class="var-tag more-tag">另有 {{ getSelectedEntities(msg).length - 6 }} 个</span>
                        </div>
                      </div>
                    </div>

                    <div class="analysis-section variables-section">
                      <div class="section-title">
                        <span>变量识别</span>
                      </div>
                      <div class="variable-groups">
                        <div class="var-group influence-group" v-if="msg.analysisData.influenceFactors?.length">
                          <span class="var-label">影响因素 <b>{{ msg.analysisData.influenceFactors.length }}</b></span>
                          <div class="var-tags">
                            <span v-for="(f, i) in msg.analysisData.influenceFactors" :key="i" class="var-tag influence">{{ f }}</span>
                          </div>
                        </div>
                        <div class="var-group response-group" v-if="msg.analysisData.responseVars?.length">
                          <span class="var-label">响应变量 <b>{{ msg.analysisData.responseVars.length }}</b></span>
                          <div class="var-tags">
                            <span v-for="(v, i) in msg.analysisData.responseVars" :key="i" class="var-tag response">{{ v }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 完成结果结构化展示 -->
                  <div v-if="msg.completionData" class="completion-result-card">
                    <div class="completion-summary">
                      <span class="completion-count">{{ msg.completionData.totalTasks }}</span>
                      <span class="completion-label">项实验子任务已生成</span>
                    </div>
                    <div class="completion-tasks" v-if="msg.completionData.subtasks?.length">
                      <div v-for="(task, i) in msg.completionData.subtasks" :key="i" class="completion-task-item">
                        <span class="completion-check">•</span>
                        <span class="completion-task-text">{{ task.title || task.description || '' }}</span>
                      </div>
                    </div>
                    <div class="completion-hint">可继续在下方输入框迭代调整，或前往「实验设计」查看方案。</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- AI思考中提示 -->
            <div v-if="isProcessing" class="message-wrapper system thinking">
              <div class="message-bubble">
                <div class="message-avatar">
                  <span>🤖</span>
                </div>
                <div class="message-content-wrapper">
                  <div class="thinking-animation">
                    <div class="thinking-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span class="thinking-text">AI正在思考...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="conversation-input-area">
            <div class="input-container">
              <button
                class="upload-icon-button"
                @click="triggerFileUpload"
                :disabled="isProcessing"
                title="上传PDF文档"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="12" y2="12"></line>
                  <line x1="15" y1="15" x2="12" y2="12"></line>
                </svg>
              </button>
              <input
                v-model="feedbackInput"
                class="conversation-input"
                :placeholder="conversationInputPlaceholder"
                @keyup.enter="submitFeedback"
                :disabled="isProcessing"
              />
              <button
                class="send-button"
                @click="submitFeedback"
                :disabled="isProcessing || !feedbackInput.trim()"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 右侧任务面板 -->
        <div class="task-panel glass-effect">
          <div class="execution-state">
            <div class="panel-header">
              <div class="header-title">
                <span>实验设计</span>
              </div>
              <div class="status-badge completed" v-if="tasks.length > 0">已生成</div>
            </div>
            <div class="task-panel-body">
              <!-- 实验设计概览 -->
              <div
                v-if="tasks.length > 0"
                class="experiment-design-summary"
              >
                <div class="eds-section eds-vars">
                  <div class="eds-vars-col" v-if="experimentDesign.entities.length">
                    <div class="eds-col-title"><span>实体</span><b>{{ experimentDesign.entities.length }}</b></div>
                    <ul class="eds-col-list">
                      <li v-for="(item, i) in experimentDesign.entities" :key="'e' + i">{{ item }}</li>
                    </ul>
                  </div>
                  <div class="eds-vars-arrow" v-if="experimentDesign.entities.length">
                    <el-icon><Right /></el-icon>
                  </div>
                  <div class="eds-vars-col">
                    <div class="eds-col-title"><span>影响因素</span><b>{{ experimentDesign.factors.length }}</b></div>
                    <ul class="eds-col-list" v-if="experimentDesign.factors.length">
                      <li v-for="(item, i) in experimentDesign.factors" :key="'f' + i">{{ item }}</li>
                    </ul>
                    <div v-else class="eds-col-empty">—</div>
                  </div>
                  <div class="eds-vars-arrow">
                    <el-icon><Right /></el-icon>
                  </div>
                  <div class="eds-vars-col">
                    <div class="eds-col-title"><span>响应变量</span><b>{{ experimentDesign.responses.length }}</b></div>
                    <ul class="eds-col-list" v-if="experimentDesign.responses.length">
                      <li v-for="(item, i) in experimentDesign.responses" :key="'r' + i">{{ item }}</li>
                    </ul>
                    <div v-else class="eds-col-empty">—</div>
                  </div>
                </div>

                <div class="eds-section eds-method" v-if="experimentDesign.expMethod">
                  <span class="eds-label">实验方法</span>
                  <span class="eds-method-value">{{ experimentDesign.expMethod }}</span>
                </div>

                <div class="eds-section eds-params" v-if="experimentDesign.paramRows.length">
                  <div class="eds-section-title">参数范围</div>
                  <el-table
                    :data="experimentDesign.paramRows"
                    size="small"
                    border
                    stripe
                    max-height="240"
                    class="eds-params-table"
                  >
                    <el-table-column prop="index" label="序号" width="78" align="center" />
                    <el-table-column
                      v-for="(key, idx) in experimentDesign.factorKeys"
                      :key="key"
                      :prop="key"
                      align="center"
                    >
                      <template #header>
                        <el-tooltip :content="getParameterDisplayName(key, idx)" placement="top">
                          <span>{{ getParameterDisplayName(key, idx) }}</span>
                        </el-tooltip>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>

                <div class="eds-section eds-formula" v-if="experimentDesign.formulas.length">
                  <div class="eds-section-title">关键公式</div>
                  <div class="eds-formula-list">
                    <div v-for="f in experimentDesign.formulas" :key="f.key" class="eds-formula-item">
                      <span class="eds-formula-key">{{ f.key }}</span>
                      <span class="eds-formula-eq">=</span>
                      <span class="eds-formula-value">{{ f.value }}</span>
                    </div>
                  </div>
                </div>

                <div class="eds-next">
                  <el-button type="primary" round :disabled="isProcessing" @click="goToNextPage">
                    下一步：查看实验设计
                  </el-button>
                </div>
              </div>

              <!-- 空状态：尚未生成方案 -->
              <div v-else class="empty-result-state">
                <div class="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <h3>等待实验设计结果</h3>
                <p>完成左侧对话后，这里展示实验设计方案</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ScenarioModelingLogic from './Js/ScenarioModelingLogic_uranium.js'
import { useScnetSupplyChainStore as useSupplyChainStore } from '@/stores/scnet'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { storeToRefs } from 'pinia'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { readScnetPhase } from '@/constants/scnetPhase'
import { SCNET_PHASE_SHORT_LABELS } from '@/constants/scnetStageMeta'
import { getSnapshotById } from '@/views/SCnet/mock/snapshotIndex'
import { ElMessage } from 'element-plus'
import { Right } from '@element-plus/icons-vue'

export default {
  ...ScenarioModelingLogic,
  components: {
    ...(ScenarioModelingLogic.components || {}),
    Right
  },
  setup() {
    const store = useSupplyChainStore()
    const snapshotStore = useAnalysisSnapshotStore()
    const { chatHistory, goalDecompositionLog, loading, scenarioContext } = storeToRefs(store)

    return {
      store,
      snapshotStore,
      chatHistory,
      goalDecompositionLog,
      storeLoading: loading,
      scenarioContext
    }
  },
  computed: {
    ...(ScenarioModelingLogic.computed || {}),
    conversationInputPlaceholder() {
      if (this.tasks?.length > 0 && this.currentTaskIndex >= this.tasks.length) {
        return '输入调整诉求继续迭代, 例如: 把库存上限改成 [200, 800]…'
      }
      return '输入您的问题或反馈...'
    },
    experimentDesign() {
      const r = (this.apiResult && typeof this.apiResult === 'object') ? this.apiResult : {}
      const userGoal = this.sanitizeDisplayText(this.store?.scenarioUserGoal || r.goal_decomposition?.user_goal || '')
      const goalExplain = this.sanitizeDisplayText(r.goal_decomposition?.goal_understanding || '')
      const phaseLabel = SCNET_PHASE_SHORT_LABELS[this.selectedPhase] || '事中'

      const factors = (this.toDisplayNameList(r.influence_factor || []) || [])
        .map(x => this.sanitizeDisplayText(x))
        .filter(Boolean)
      const responses = (this.toDisplayNameList(r.response_var || []) || [])
        .map(x => this.sanitizeDisplayText(x))
        .filter(Boolean)
      const entities = this.extractSelectedEntities(r)

      const expBlock = (r.exp_params && typeof r.exp_params === 'object')
        ? (r.exp_params.exp_params && typeof r.exp_params.exp_params === 'object' ? r.exp_params.exp_params : r.exp_params)
        : {}
      const expMethod = this.sanitizeDisplayText(expBlock.exp_method || '')
      const paramsObj = (expBlock.params && typeof expBlock.params === 'object') ? expBlock.params : {}
      const factorKeys = Object.keys(paramsObj).filter(k => Array.isArray(paramsObj[k]) && paramsObj[k].length > 0)
      const rowCount = factorKeys.length ? Math.max(...factorKeys.map(k => paramsObj[k].length)) : 0
      const paramRows = []
      for (let i = 0; i < rowCount; i++) {
        const row = { index: `实验 ${i + 1}` }
        factorKeys.forEach(k => {
          const val = paramsObj[k][i]
          row[k] = (val === null || val === undefined) ? '-' : (Array.isArray(val) ? `[${val.join(', ')}]` : String(val))
        })
        paramRows.push(row)
      }

      const formulaSrc = (r.formula && typeof r.formula === 'object') ? r.formula : {}
      const formulas = Object.entries(formulaSrc).map(([key, value]) => ({
        key: this.sanitizeDisplayText(key),
        value: this.sanitizeDisplayText(typeof value === 'string' ? value : JSON.stringify(value))
      })).filter(f => f.key && f.value)

      return {
        goalCategory: phaseLabel,
        userGoal,
        goalExplain,
        factors,
        responses,
        entities,
        expMethod,
        factorKeys,
        paramRows,
        formulas
      }
    }
  },
  data() {
    return {
      ...ScenarioModelingLogic.data(),
      // 分析页固定不再展示初始输入弹窗
      showInitialDialog: false,
      // 分析页默认从 store 恢复已有结果；fresh 路径会在本页发起首轮 requirement analyze
      isRequirementLegal: true,
      selectedPhase: 'during'
    }
  },
  methods: {
    ...ScenarioModelingLogic.methods,
    extractSelectedEntities(result = {}) {
      const goal = result?.goal_decomposition || {}
      const direct = [
        result?.selected_entities,
        result?.entities,
        goal?.selected_entities,
        goal?.entities,
        goal?.object,
        result?.object
      ]
      const names = direct.flatMap((value) => {
        if (Array.isArray(value)) return this.toDisplayNameList(value)
        if (typeof value === 'string') return value.split(/[、,，;；]/).map(item => this.sanitizeDisplayText(item))
        if (value && typeof value === 'object') return this.toDisplayNameList([value])
        return []
      }).filter(Boolean)
      if (names.length) return Array.from(new Set(names))

      return []
    },
    getSelectedEntities(msg = {}) {
      const explicit = Array.isArray(msg?.analysisData?.selectedEntities)
        ? msg.analysisData.selectedEntities.filter(Boolean)
        : []
      if (explicit.length) return explicit

      const currentSessionId = this.store?.currentSessionId || this.sessionId || ''
      const candidates = [
        {
          payload: this.store?.setAgentsResult,
          sessionId: this.store?.setAgentsResultSessionId
        },
        {
          payload: this.store?.agentDesignPayload,
          sessionId: this.store?.agentDesignPayloadSessionId
        }
      ]
      for (const candidate of candidates) {
        if (!candidate.payload || (currentSessionId && candidate.sessionId && candidate.sessionId !== currentSessionId)) continue
        const agents = Array.isArray(candidate.payload?.agents) ? candidate.payload.agents : []
        const names = agents.map((agent) => this.sanitizeDisplayText(
          agent?.name || agent?.displayName || agent?.label || agent?.entity_name || ''
        )).filter(Boolean)
        if (names.length) return Array.from(new Set(names))
      }
      const requirementObject = this.store?.scenarioRequirementMeta?.object
      if (Array.isArray(requirementObject)) return this.toDisplayNameList(requirementObject)
      if (typeof requirementObject === 'string' && requirementObject.trim()) {
        return requirementObject.split(/[、,，;；]/).map(item => this.sanitizeDisplayText(item)).filter(Boolean)
      }
      return []
    },
    getVisibleSelectedEntities(msg = {}) {
      return this.getSelectedEntities(msg).slice(0, 6)
    },
    getParameterDisplayName(key, index) {
      const raw = this.sanitizeDisplayText(key || '')
      if (!/^var[ _-]?\d+$/i.test(raw)) return raw || `参数${index + 1}`
      return this.experimentDesign.factors[index] || `影响因素${index + 1}`
    },
    /**
     * 把已有的 apiResult 一次性渲染为已完成态（用于快照/store 恢复路径）
     */
    hydrateFromApiResult(apiResult, { userGoal = '', chatMessages = null } = {}) {
      const normalized = this.normalizeApiResultForDisplay(apiResult)
      this.apiResult = normalized
      this.inputMessage = userGoal || this.inputMessage || ''

      const tasks = this.generateTaskList(normalized)
      this.tasks = tasks

      // 历史对话：若快照提供则直接灌入；否则补一组用户+系统消息回放
      if (Array.isArray(chatMessages) && chatMessages.length) {
        this.historyConversations = chatMessages.map((m) => ({ ...m }))
      } else if (userGoal) {
        const subtasks = normalized?.goal_decomposition?.subtasks || []
        const factors = this.toDisplayNameList(normalized?.influence_factor || [])
        const responses = this.toDisplayNameList(normalized?.response_var || [])
        this.historyConversations = [
          { type: 'user', content: userGoal, timestamp: new Date() },
          {
            type: 'system',
            content: `✅ 目标分析完成，已生成 ${tasks.length} 个拆解任务`,
            timestamp: new Date(),
            analysisData: {
              understanding: normalized?.goal_decomposition?.goal_understanding || '系统将分步骤完成您的需求分析',
              subtasks,
              selectedEntities: this.extractSelectedEntities(normalized),
              influenceFactors: factors,
              responseVars: responses
            }
          }
        ]
      }

      // 任务结果：用 subtasksData + apiResult 即时合成（不调用任何后端持久化）
      this.taskResults = (this.subtasksData || []).map((sub, idx) => this.buildSubtaskResult(sub, idx, normalized))
      this.currentTaskIndex = tasks.length
      this.selectedTaskIndex = null
      this.selectedResult = null
      this.currentResult = {
        agent_type: 'SUMMARY',
        title: '实验设计生成完成',
        description: '已加载实验设计方案。点击「下一步」查看完整实验设计，或在下方输入框继续迭代。',
        emoji: '🎉'
      }
      this.editingContent = this.currentResult
      this.currentState = 'execution'
    },
    bootstrapFromSnapshot(snapshot) {
      const dialogue = snapshot?.dialogue
      if (!dialogue) return false
      const requirementMeta = dialogue.requirementMeta || {
        goal: dialogue.userGoal,
        variable: '',
        object: '',
        is_legal: true,
        analysis_phase: this.selectedPhase || 'during',
        raw_input: dialogue.userGoal,
        model_name: 'qwen-turbo'
      }

      this.sessionId = `snapshot:${snapshot.id}`
      this.store?.setCurrentSessionId(this.sessionId)
      this.store?.setScenarioAnalysis({
        userGoal: dialogue.userGoal,
        apiResult: dialogue.apiResult
      })
      this.store?.setScenarioTasks({
        tasks: dialogue.tasks || [],
        taskResults: []
      })
      this.store?.setScenarioRequirementMeta(requirementMeta)
      if (dialogue.scenarioContext) {
        this.store?.setScenarioContext(dialogue.scenarioContext)
      }
      this.selectedPhase = requirementMeta.analysis_phase || this.selectedPhase
      this.agentDesignSynced = true
      this.agentDesignSyncError = ''

      this.subtasksData = (dialogue.apiResult?.goal_decomposition?.subtasks || []).map((task, idx) =>
        this.normalizeSubtaskPayload(task, idx)
      )
      this.hydrateFromApiResult(dialogue.apiResult, {
        userGoal: dialogue.userGoal,
        chatMessages: dialogue.chatMessages
      })
      return true
    },
    bootstrapFromStore() {
      const sid = this.store?.currentSessionId
      const userGoal = this.store?.scenarioUserGoal || ''
      const apiResult = this.store?.scenarioApiResult
      if (!sid || !apiResult) return false

      this.sessionId = sid
      this.inputMessage = userGoal
      this.isRequirementLegal = !!this.store?.scenarioRequirementMeta?.is_legal
      this.selectedPhase = this.store?.scenarioRequirementMeta?.analysis_phase || this.selectedPhase
      this.subtasksData = (apiResult?.goal_decomposition?.subtasks || []).map((task, idx) =>
        this.normalizeSubtaskPayload(task, idx)
      )
      this.hydrateFromApiResult(apiResult, { userGoal })
      return true
    },
    /**
     * fresh 路径：刚从输入页跳来，立即调用 requirement analyze 完成 judge + 拆解。
     */
    async runFreshAnalysis() {
      this.sessionId = this.store?.currentSessionId || ''
      this.inputMessage = this.store?.scenarioUserGoal || ''
      this.selectedPhase = this.store?.scenarioRequirementMeta?.analysis_phase || this.selectedPhase
      if (!this.sessionId || !this.inputMessage) {
        ElMessage.warning('需求会话信息缺失，请回到对话入口重新提交')
        this.$router.replace(SCNET_ROUTES.duringEntry)
        return
      }
      this.isRequirementLegal = true
      this.isProcessing = true
      this.pushMessage({
        type: 'user',
        content: this.inputMessage,
        timestamp: new Date()
      })
      try {
        await this.callReqAnalysis()
      } catch (e) {
        console.warn('[ScenarioAnalysis] runFreshAnalysis 失败:', e?.message || e)
      }
    }
  },
  async mounted() {
    const storedPhase = readScnetPhase('')
    if (storedPhase === 'pre' || storedPhase === 'during' || storedPhase === 'post') {
      this.selectedPhase = storedPhase
    }

    // 1) fresh 路径优先：刚从「对话首页 · 事中决策」提交了新问题，在本页发起首轮分析。
    //    activeSnapshotId 是持久化的，若不先处理 fresh，上一次加载的历史快照会顶掉新问题。
    if (this.$route?.query?.fresh === '1') {
      this.snapshotStore?.clearSnapshot?.()
      await this.runFreshAnalysis()
      return
    }

    // 2) 快照：launcher 选中后跳来，直接读取 mock 对话
    const snapshotId = this.snapshotStore?.activeSnapshotId
    const snapshot = snapshotId ? getSnapshotById(snapshotId) : null
    if (snapshot?.dialogue) {
      this.bootstrapFromSnapshot(snapshot)
      return
    }

    // 3) 否则尝试从 store 恢复（刷新场景）
    if (this.bootstrapFromStore()) return

    // 4) 兜底：店里也没有数据，回到事中流程入口
    ElMessage.warning('请先通过事中流程写入会话或加载历史快照')
    this.$router.replace(SCNET_ROUTES.duringEntry)
  },
  beforeUnmount() {
    if (this.autoExecutionTimer) {
      clearTimeout(this.autoExecutionTimer)
    }
  }
}
</script>

<style scoped src="./Css/ScenarioModeling.css"></style>

<style scoped>

/* —— 实验设计概览面板 —— */
.task-panel {
  min-height: 0;
}
.conversation-panel { width: 47%; }
.task-panel { width: 53%; }
.conversation-panel :deep(.panel-header),
.task-panel :deep(.panel-header) { padding: 14px 18px; }
.conversation-panel :deep(.conversation-messages) { padding: 16px; gap: 14px; }
.conversation-panel :deep(.message-wrapper.system .message-bubble) { width: 100%; max-width: 100%; }
.conversation-panel :deep(.message-avatar) { width: 34px; height: 34px; font-size: 16px; }
.conversation-panel :deep(.conversation-input-area) { padding: 12px 16px; }
.conversation-panel :deep(.input-container) { margin-bottom: 0; }
.conversation-panel :deep(.conversation-input) { padding: 11px 14px; font-size: 14px; }
.conversation-panel :deep(.send-button),
.conversation-panel :deep(.upload-icon-button) { width: 42px; height: 42px; }
.conversation-panel :deep(.analysis-result-card) { margin-top: 6px; }
.conversation-panel :deep(.analysis-card-header) { padding: 10px 12px; }
.conversation-panel :deep(.analysis-section) { padding: 10px 12px; }
.conversation-panel :deep(.task-chips) { gap: 6px; }
.conversation-panel :deep(.task-chip) { padding: 7px 8px; gap: 7px; }
.conversation-panel :deep(.chip-number) { width: 18px; height: 18px; }
.conversation-panel :deep(.task-chip-main) { gap: 3px; }
.conversation-panel :deep(.variable-groups) { gap: 7px; }
.conversation-panel :deep(.variable-groups .var-group) { padding: 8px; }
.conversation-panel :deep(.var-tags) { gap: 4px; }
.conversation-panel :deep(.var-tag) { padding: 2px 8px; font-size: 11px; }
.execution-state {
  min-height: 0;
}
.task-panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: 14px;
}
.task-panel-body::-webkit-scrollbar {
  width: 8px;
}
.task-panel-body::-webkit-scrollbar-track {
  background: transparent;
}
.task-panel-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}
.task-panel-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
.experiment-design-summary {
  margin: 12px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  color: #1f2937;
}
.experiment-design-summary .eds-section {
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 10px 12px;
}
.experiment-design-summary .eds-section-title {
  font-size: 13px;
  font-weight: 700;
  color: #1e3a8a;
  margin-bottom: 8px;
}
.experiment-design-summary .eds-label {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #9d3807;
  margin-right: 8px;
}

.eds-goal {
  display: flex;
  align-items: stretch;
  gap: 12px;
}
.eds-goal-tag {
  flex-shrink: 0;
  min-width: 92px;
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  border: 1px solid #93c5fd;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.eds-goal-tag-label {
  font-size: 12px;
  color: #1e40af;
  font-weight: 600;
}
.eds-goal-tag-value {
  font-size: 14px;
  font-weight: 700;
  color: #1d4ed8;
}
.eds-goal-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  line-height: 1.6;
}
.eds-goal-explain {
  color: #334155;
  word-break: break-word;
}

.eds-vars {
  display: flex;
  align-items: stretch;
  gap: 8px;
}
.eds-vars-col {
  flex: 1;
  min-width: 0;
  background: #f8fafc;
  border: 1px dashed #c7d2fe;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.eds-col-title {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  color: #4338ca;
  margin-bottom: 6px;
}
.eds-col-title b {
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e0e7ff;
  color: #4338ca;
  font-size: 11px;
}
.eds-col-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-height: 140px;
  overflow-y: auto;
}
.eds-col-list li {
  font-size: 12.5px;
  color: #1f2937;
  text-align: center;
  padding: 3px 6px;
  background: #ffffff;
  border-radius: 4px;
}
.eds-col-empty {
  font-size: 12px;
  color: #9ca3af;
}
.eds-vars-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
  font-size: 22px;
  padding: 0 4px;
}

.eds-method {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.eds-method-value {
  color: #d97706;
  font-weight: 600;
}

.eds-params-table {
  width: 100%;
  overflow-x: auto;
}
.eds-params-table :deep(.el-table) {
  font-size: 12px;
}

.eds-formula-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.eds-formula-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #1f2937;
}
.eds-formula-key {
  font-weight: 700;
  color: #1e3a8a;
  flex-shrink: 0;
}
.eds-formula-eq {
  color: #94a3b8;
  flex-shrink: 0;
  padding-top: 1px;
}
.eds-formula-value {
  flex: 1;
  min-width: 0;
  display: block;
  color: #475569;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  word-break: normal;
  padding-bottom: 2px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.eds-formula-value::-webkit-scrollbar {
  height: 6px;
}
.eds-formula-value::-webkit-scrollbar-track {
  background: transparent;
}
.eds-formula-value::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.eds-next {
  display: flex;
  justify-content: center;
  padding: 4px 0 2px;
}
.eds-next .el-button {
  min-width: 168px;
  font-weight: 600;
}

@media (max-width: 1180px) {
  .eds-vars {
    display: grid;
    grid-template-columns: 1fr;
  }
  .eds-vars-arrow {
    transform: rotate(90deg);
    padding: 0;
  }
}

@media (max-width: 960px) {
  .conversation-panel,
  .task-panel { width: 100%; }
}
</style>
