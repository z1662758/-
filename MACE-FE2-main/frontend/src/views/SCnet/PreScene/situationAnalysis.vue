<template>
  <div class="scenario-real-page">
    <input
      ref="fileInput"
      type="file"
      style="display: none"
      accept=".pdf"
      @change="handleFileChange"
    />

    <!-- 智能对话 + 任务拆解界面（直接进入，初始对话已移至 total.vue） -->
    <div class="scenario-modeling-container">
      <button class="back-btn-3d" :disabled="isProcessing" @click="startNewSession">
        <el-icon><Back /></el-icon>
        <span>重新输入</span>
      </button>

      <div class="main-content">
        <!-- 最左侧：历史对话记录栏 -->
        <aside class="history-sidebar glass-effect">
          <div class="history-header">
            <div class="history-title-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="history-title-icon">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>历史对话</span>
            </div>
            <button
              class="new-chat-btn"
              :disabled="isProcessing"
              title="新建对话"
              @click="startNewSession"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div class="history-list" v-if="sessions.length > 0">
            <div
              v-for="sess in sessions"
              :key="sess.id"
              class="history-item"
              :class="{ active: sess.id === activeSessionId }"
              @click="switchSession(sess.id)"
            >
              <div class="history-item-content">
                <div class="history-item-title">{{ sess.title || '新对话' }}</div>
                <div class="history-item-time">{{ formatDate(sess.createdAt) }}</div>
              </div>
              <button
                class="history-delete-btn"
                title="删除此对话"
                @click.stop="deleteSession(sess.id)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          </div>

          <div v-else class="history-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p>暂无历史对话</p>
            <span>开始一次新的分析吧</span>
          </div>
        </aside>

        <!-- 中间对话面板 -->
        <div class="conversation-panel glass-effect">
          <div class="panel-header">
            <div class="header-title">
              <span class="header-icon-small">💬</span>
              <span>智能对话</span>
            </div>

            <div class="conversation-stats">
              <span class="stat-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {{ historyConversations.length }}
              </span>

              <span class="model-pill">{{ selectedModelLabel }}</span>
            </div>
          </div>

          <div ref="messagesContainer" class="conversation-messages">
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
                    <span class="message-sender">
                      {{ msg.type === 'user' ? '您' : 'AI助手' }}
                    </span>
                    <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                  </div>

                  <div class="message-text">
                    {{ msg.content }}
                  </div>

                  <!-- 生成方案按钮：需求理解阶段展示 -->
                  <div v-if="msg.showGenerateBtn && !isProcessing" class="generate-scheme-area">
                    <button class="generate-scheme-btn" @click="generateScheme">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span>生成完整事前推演方案</span>
                    </button>
                  </div>

                  <div
                    v-if="msg.data && msg.type === 'system' && msg.data.goal"
                    class="requirement-mini-table"
                  >
                    <div class="mini-table-row">
                      <span class="mini-label">目标</span>
                      <span class="mini-value">{{ msg.data.goal }}</span>
                    </div>

                    <div class="mini-table-row">
                      <span class="mini-label">变量</span>
                      <span class="mini-value">
                        <span
                          v-for="(v, i) in msg.data.variable"
                          :key="i"
                          class="var-tag influence"
                        >
                          {{ v }}
                        </span>
                      </span>
                    </div>

                    <div class="mini-table-row">
                      <span class="mini-label">对象</span>
                      <span class="mini-value">{{ msg.data.object }}</span>
                    </div>
                  </div>

                  <div v-if="msg.analysisData" class="analysis-result-card">
                    <div class="analysis-section understanding-section">
                      <div class="section-title">
                        <span class="section-icon">📌</span>
                        <span>目标理解</span>
                      </div>
                      <div class="section-content">
                        {{ msg.analysisData.understanding }}
                      </div>
                    </div>

                    <div
                      v-if="msg.analysisData.subtasks && msg.analysisData.subtasks.length"
                      class="analysis-section tasks-section"
                    >
                      <div class="section-title">
                        <span class="section-icon">📋</span>
                        <span>任务拆解</span>
                      </div>

                      <div class="task-chips">
                        <div
                          v-for="(task, i) in msg.analysisData.subtasks"
                          :key="i"
                          class="task-chip generated"
                        >
                          <span class="chip-number">{{ i + 1 }}</span>
                          <span class="chip-emoji">{{ task.emoji || '📌' }}</span>
                          <span class="chip-text">
                            {{ shortText(task.title || task.description, 35) }}
                          </span>
                          <span class="chip-agent">
                            {{ getAgentDisplayName(task.agent_type) }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="analysis-section variables-section">
                      <div class="var-group" v-if="msg.analysisData.influenceFactors?.length">
                        <span class="var-label">影响因素</span>
                        <div class="var-tags">
                          <span
                            v-for="(f, i) in msg.analysisData.influenceFactors"
                            :key="i"
                            class="var-tag influence"
                          >
                            {{ f }}
                          </span>
                        </div>
                      </div>

                      <div class="var-group" v-if="msg.analysisData.responseVars?.length">
                        <span class="var-label">响应变量</span>
                        <div class="var-tags">
                          <span
                            v-for="(v, i) in msg.analysisData.responseVars"
                            :key="i"
                            class="var-tag response"
                          >
                            {{ v }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="msg.completionData" class="completion-result-card">
                    <div class="completion-summary">
                      <span class="completion-count">{{ msg.completionData.totalTasks }}</span>
                      <span class="completion-label">个任务已由后端大模型生成</span>
                    </div>

                    <div class="completion-tasks" v-if="msg.completionData.subtasks?.length">
                      <div
                        v-for="(task, i) in msg.completionData.subtasks"
                        :key="i"
                        class="completion-task-item"
                      >
                        <span class="completion-check">•</span>
                        <span class="completion-task-text">
                          {{ task.title || task.description }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                    <span class="thinking-text">{{ processingText }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 继续交互输入 -->
          <div class="conversation-input-area">
            <div class="input-container">
              <button
                class="upload-icon-button"
                :disabled="isProcessing"
                title="选择 PDF 文档"
                @click="triggerFileUpload"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="12" y2="12" />
                  <line x1="15" y1="15" x2="12" y2="12" />
                </svg>
              </button>

              <input
                v-model="feedbackInput"
                class="conversation-input"
                :placeholder="isNewConversation ? '输入你想分析的供应链问题...' : '可以继续追问、补充约束或要求重新拆解...'"
                :disabled="isProcessing"
                @keyup.enter="handleBottomInput"
              />

              <button
                class="send-button"
                :disabled="isProcessing || !feedbackInput.trim()"
                @click="handleBottomInput"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 右侧任务面板 -->
        <div class="task-panel glass-effect">
          <div v-if="currentState === 'analysis'" class="analysis-state">
            <div class="panel-header">
              <div class="header-title">
                <span class="header-icon-small">🔍</span>
                <span>模型分析</span>
              </div>

              <div class="status-badge analysis">
                <span class="pulse-dot"></span>
                调用中
              </div>
            </div>

            <div v-if="taskAnalysisHtml" class="analysis-content">
              <div v-html="taskAnalysisHtml"></div>
            </div>

            <div v-else class="analysis-placeholder">
              <div class="placeholder-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <p>{{ processingText || '正在请求后端大模型进行需求理解与任务拆解...' }}</p>
            </div>
          </div>

          <div v-else class="execution-state">
            <!-- ===== 入口跳转：任务拆解视图 ===== -->
            <template v-if="isTransferred">
            <div class="panel-header">
              <div class="header-title">
                <span>任务拆解结果</span>
                <span class="header-subhint">（来自后端大模型）</span>
              </div>

              <div
                class="status-badge"
                :class="{
                  active: isProcessing,
                  completed: currentTaskIndex >= tasks.length && tasks.length
                }"
              >
                <span v-if="isProcessing" class="pulse-dot"></span>
                {{ taskStatusText }}
              </div>
            </div>

            <div class="current-task-strip" v-if="tasks.length > 0">
              <span class="strip-icon">📌</span>
              <span class="strip-text">{{ currentTaskText }}</span>
            </div>

            <div class="execution-progress" v-if="tasks.length > 0">
              <div class="progress-info">
                <span class="progress-label">生成进度</span>
                <span class="progress-value">{{ Math.round(progressPercentage) }}%</span>
              </div>

              <div class="progress-bar">
                <div
                  class="progress-completed-bg"
                  :style="{ width: progressPercentage + '%' }"
                ></div>

                <div
                  v-for="(task, index) in tasks"
                  :key="index"
                  class="progress-segment"
                  :class="{
                    completed: index < currentTaskIndex,
                    active: selectedTaskIndex === index,
                    pending: index >= currentTaskIndex
                  }"
                  :style="{ width: tasks.length ? (100 / tasks.length) + '%' : '0%' }"
                  @mouseenter="showTaskTooltip(index, $event)"
                  @mouseleave="hideTaskTooltip"
                  @click="selectHistoryTask(index)"
                ></div>

                <div
                  v-if="hoveredTaskIndex !== null"
                  class="task-tooltip"
                  :style="{
                    left: tooltipX + 'px',
                    top: tooltipY + 'px'
                  }"
                >
                  {{ tasks[hoveredTaskIndex] }}
                  <div class="tooltip-arrow"></div>
                </div>

                <div class="progress-shine"></div>
              </div>

              <div class="progress-nav">
                <button class="nav-button nav-prev" @click="prevTask" aria-label="上一任务">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                <button class="nav-button nav-next" @click="nextTask" aria-label="下一任务">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- 本体网络筛选结果（后台静默查询，不展示） -->
            <div v-if="false" class="ontology-result-card">
              <div class="ontology-title">
                <span>🕸️</span>
                <strong>本体网络筛选结果</strong>
                <span v-if="isQueryingNetwork" class="ontology-loading">筛选中...</span>
              </div>

              <template v-if="!isQueryingNetwork && ontologyQueryResult">
                <div class="ontology-row">
                  <span>种子节点</span>
                  <strong>{{ seedNodes.length }}</strong>
                </div>

                <div class="ontology-row">
                  <span>证据数量</span>
                  <strong>{{ ontologyEvidence.length }}</strong>
                </div>

                <div class="ontology-row">
                  <span>图谱数据</span>
                  <strong>{{ graphView ? '已返回' : '暂无' }}</strong>
                </div>

                <div v-if="ontologyQueryResult.updated_at" class="ontology-row">
                  <span>保存时间</span>
                  <strong>{{ ontologyQueryResult.updated_at }}</strong>
                </div>

                <div v-if="Object.keys(requirementParams || {}).length" class="ontology-query">
                  <span>需求参数 requirementParams</span>
                  <pre>{{ JSON.stringify(requirementParams, null, 2) }}</pre>
                </div>
              </template>
            </div>

            <div
              v-if="selectedResult || currentResult"
              class="task-result-preview"
              :class="{ 'content-updated': isContentUpdated }"
            >
              <div class="preview-header">
                <h4>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  模型输出
                </h4>
              </div>

              <div class="preview-content">
                <div
                  class="result-content"
                  v-html="formatResultContent(editingContent || selectedResult || currentResult)"
                ></div>
              </div>
            </div>

            <div v-else class="empty-result-state">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3>等待后端返回模型结果</h3>
              <p>接口返回后，这里会展示任务拆解内容。</p>
            </div>
            </template>
            <!-- ===== 新建对话：分析报告视图 ===== -->
            <template v-else>
              <div class="panel-header">
                <div class="header-title">
                  <span class="header-icon-small">📄</span>
                  <span>分析报告</span>
                </div>
                <div class="status-badge completed">
                  报告已生成
                </div>
              </div>
              <div
                v-if="selectedResult || currentResult"
                class="task-result-preview"
              >
                <div class="preview-content">
                  <div
                    class="result-content report-markdown"
                    v-html="formatResultContent(editingContent || selectedResult || currentResult)"
                  ></div>
                </div>
              </div>
              <div v-else class="empty-result-state">
                <div class="empty-icon">📊</div>
                <h3>报告生成中</h3>
                <p>大模型正在生成分析报告，请稍候...</p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  Back,
  Plus,
  ArrowDown,
  Position,
  Loading
} from '@element-plus/icons-vue'

export default {
  name: 'ScenarioModelingReal',

  components: {
    Back,
    Plus,
    ArrowDown,
    Position,
    Loading
  },

  data() {
    return {
      hasStarted: true,

      apiAnalyzeUrl: 'http://localhost:9091/scenario/analyze',
      apiChatUrl: 'http://localhost:9091/scenario/chat',
      apiQueryNetworkUrl: 'http://localhost:9091/scenario/query-network',
      apiRequirementsUrl: 'http://localhost:9091/scenario/requirements',

      inputMessage: '',
      feedbackInput: '',
      selectedFile: null,

      selectedModel: 'qwen-turbo',
      modelOptions: [
        {
          label: 'Qwen-Turbo（最快）',
          value: 'qwen-turbo'
        },
        {
          label: 'Qwen-Plus（均衡）',
          value: 'qwen-plus'
        },
        {
          label: 'Qwen-Max（最强）',
          value: 'qwen-max'
        },
        {
          label: 'Qwen3-235B-A22B',
          value: 'qwen3-235b-a22b'
        },
        {
          label: 'Qwen3.5-122B-A10B',
          value: 'qwen3.5-122b-a10b'
        }
      ],

      isProcessing: false,
      isQueryingNetwork: false,
      processingText: 'AI 正在推理...',

      sessionId: '',
      historyConversations: [],

      // 历史会话列表
      sessions: [],
      activeSessionId: '',

      // 分析阶段：understand（需求理解）→ generate（生成方案）→ report（生成报告）
      analysisStage: 'understand',
      // 当前场景：uranium / auto
      currentScenario: 'uranium',
      // 是否从 total.vue 入口跳转过来（有转移数据的继续走两阶段，"+号"新建的直接生成）
      isTransferred: false,
      isNewConversation: false,

      currentState: 'analysis',
      taskAnalysisHtml: '',

      tasks: [],
      taskObjects: [],
      taskResults: [],

      currentTaskIndex: 0,
      selectedTaskIndex: 0,

      currentResult: '',
      selectedResult: '',
      editingContent: '',
      isContentUpdated: false,

      hoveredTaskIndex: null,
      tooltipX: 0,
      tooltipY: 0,

      requirementParams: {},
      ontologyQueryResult: null,
      graphView: null,
      ontologyEvidence: [],
      seedNodes: [],

      abortController: null
    }
  },

  computed: {
    selectedModelLabel() {
      const opt = this.modelOptions.find(item => item.value === this.selectedModel)
      return opt ? opt.label : this.selectedModel
    },

    progressPercentage() {
      if (!this.tasks.length) return this.currentResult ? 100 : 0
      const done = Math.min(this.currentTaskIndex, this.tasks.length)
      return (done / this.tasks.length) * 100
    },

    currentTaskText() {
      if (!this.tasks.length) {
        return this.currentResult ? '模型已返回整体分析结果' : '暂无任务'
      }

      if (this.currentTaskIndex >= this.tasks.length) {
        return '已生成'
      }

      return `正在生成：${this.tasks[this.currentTaskIndex]}`
    },

    taskStatusText() {
      if (this.isQueryingNetwork) return '筛选本体网络'
      if (this.isProcessing) return '生成中'
      if (!this.tasks.length && this.currentResult) return '已生成'
      if (!this.tasks.length) return '等待结果'
      if (this.currentTaskIndex >= this.tasks.length) return '已生成'
      return `已生成 ${this.currentTaskIndex}/${this.tasks.length}`
    }
  },

  mounted() {
    this.loadSessions()

    // ── chatHome 入口：从 URL 参数读取场景和会话信息 ──
    const chatSessionId = this.$route.query.session_id
    const chatScenario = this.$route.query.scenario
    const chatMessage = this.$route.query.message

    // 检查是否有从 total.vue 传递过来的会话数据
    const transferSessionId = sessionStorage.getItem('scnet_transfer_sessionId')
    const transferMessage = sessionStorage.getItem('scnet_transfer_message')
    const transferModel = sessionStorage.getItem('scnet_transfer_model')
    const transferResponse = sessionStorage.getItem('scnet_transfer_response')

    if (chatSessionId && chatScenario && !transferSessionId) {
      // ── 从 chatHome 跳转过来，自动生成报告 ──
      this.sessionId = chatSessionId
      this.hasStarted = true
      this.isNewConversation = false
      this.analysisStage = 'report'
      // 存储场景信息
      this.currentScenario = chatScenario

      if (chatMessage) {
        this.historyConversations.push({
          type: 'user',
          content: decodeURIComponent(chatMessage),
          timestamp: new Date()
        })
        // 自动生成 3 段式报告
        this.isProcessing = true
        this.currentState = 'analysis'
        this.processingText = `正在生成${chatScenario === 'supply_chain' ? '汽车' : '铀'}供应链事前推演报告...`
        this.callAnalyzeApi(chatMessage, 'report')
          .then(rawData => this.applyAnalyzeResult(rawData))
          .catch(err => {
            this.historyConversations.push({
              type: 'system',
              content: `报告生成失败：${err.message || '未知错误'}`,
              timestamp: new Date()
            })
          })
          .finally(() => {
            this.isProcessing = false
            this.abortController = null
          })
      } else {
        // 没有消息内容，加载已保存的分析结果
        this.loadExistingAnalysis()
      }

      // 清理URL参数（避免刷新时重复触发）
      const cleanQuery = { ...this.$route.query }
      delete cleanQuery.session_id
      delete cleanQuery.scenario
      delete cleanQuery.message
      this.$router.replace({ query: cleanQuery }).catch(() => {})
    } else if (transferSessionId && transferMessage) {
      // 从 total.vue 入口跳转过来，标记为转移会话
      this.isTransferred = true
      this.isNewConversation = false
      // 恢复会话
      this.sessionId = transferSessionId
      this.hasStarted = true

      // 恢复模型选择
      if (transferModel && this.modelOptions.some(o => o.value === transferModel)) {
        this.selectedModel = transferModel
      }

      // 添加用户消息到对话历史
      this.historyConversations.push({
        type: 'user',
        content: transferMessage,
        timestamp: new Date()
      })

      // 恢复 LLM 响应
      if (transferResponse) {
        try {
          const responseData = JSON.parse(transferResponse)
          this.applyAnalyzeResult(responseData)
        } catch {
          // 响应解析失败，自动重新分析
          this.isProcessing = true
          this.currentState = 'analysis'
          this.processingText = '正在调用后端大模型进行需求分析...'
          this.callAnalyzeApi(transferMessage)
            .then(rawData => this.applyAnalyzeResult(rawData))
            .catch(err => {
              this.historyConversations.push({
                type: 'system',
                content: `调用后端大模型失败：${err.message || '未知错误'}`,
                timestamp: new Date()
              })
            })
            .finally(() => {
              this.isProcessing = false
              this.abortController = null
            })
        }
      }

      // 清除传递数据
      sessionStorage.removeItem('scnet_transfer_sessionId')
      sessionStorage.removeItem('scnet_transfer_message')
      sessionStorage.removeItem('scnet_transfer_model')
      sessionStorage.removeItem('scnet_transfer_response')
    }
  },

  beforeUnmount() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  },

  methods: {
    notify(type, message) {
      if (this.$message && this.$message[type]) {
        this.$message[type](message)
      } else if (this.$message) {
        this.$message(message)
      } else {
        console.log(`[${type}] ${message}`)
      }
    },

    useDefaultQuestion() {
      this.inputMessage = this.defaultQuestion
      this.notify('success', '已填入示例问题')
    },

    startNewSession() {
      if (this.isProcessing) return

      // 保存当前会话到历史
      if (this.sessionId && this.historyConversations.length > 0) {
        this.upsertCurrentSession()
      }

      if (this.abortController) {
        this.abortController.abort()
        this.abortController = null
      }

      this.isTransferred = false
      this.isNewConversation = true
      this.hasStarted = true
      this.inputMessage = ''
      this.feedbackInput = ''
      this.selectedFile = null

      this.isProcessing = false
      this.isQueryingNetwork = false
      this.processingText = 'AI 正在推理...'

      this.sessionId = ''
      this.activeSessionId = ''
      this.historyConversations = []
      this.analysisStage = 'understand'

      this.currentState = 'analysis'
      this.taskAnalysisHtml = ''

      this.tasks = []
      this.taskObjects = []
      this.taskResults = []
      this.currentTaskIndex = 0
      this.selectedTaskIndex = 0

      this.currentResult = ''
      this.selectedResult = ''
      this.editingContent = ''
      this.isContentUpdated = false

      this.requirementParams = {}
      this.ontologyQueryResult = null
      this.graphView = null
      this.ontologyEvidence = []
      this.seedNodes = []

      this.$nextTick(() => {
        // 页面已直接进入三栏布局，不再需要聚焦初始输入框
      })
    },

    handleModelChange(value) {
      this.selectedModel = value
    },

    triggerFileUpload() {
      this.$refs.fileInput?.click()
    },

    handleFileChange(event) {
      const file = event.target.files?.[0]
      if (!file) return

      const isPdf =
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')

      if (!isPdf) {
        this.notify('warning', '仅支持选择 PDF 文件')
        event.target.value = ''
        return
      }

      this.selectedFile = file
      this.notify('success', `已选择 PDF：${file.name}`)
      event.target.value = ''
    },


    buildHistoryPayload() {
      return this.historyConversations.map(item => ({
        role: item.type === 'user' ? 'user' : 'assistant',
        content: item.content || ''
      }))
    },

    async startAnalysis() {
      const text = (this.inputMessage || '').trim()
      if (!text || this.isProcessing) return

      this.hasStarted = true
      this.isProcessing = true
      this.currentState = 'analysis'
      this.processingText = '正在调用后端大模型进行需求分析...'

      this.taskAnalysisHtml = ''
      this.tasks = []
      this.taskObjects = []
      this.taskResults = []
      this.currentTaskIndex = 0
      this.selectedTaskIndex = 0
      this.currentResult = ''
      this.selectedResult = ''
      this.editingContent = ''
      this.requirementParams = {}
      this.ontologyQueryResult = null
      this.graphView = null
      this.ontologyEvidence = []
      this.seedNodes = []

      if (!this.sessionId) {
        this.sessionId = `scenario-${Date.now()}`
      }

      this.historyConversations.push({
        type: 'user',
        content: text,
        timestamp: new Date()
      })

      if (this.selectedFile) {
        this.historyConversations.push({
          type: 'system',
          content: `已上传补充 PDF：${this.selectedFile.name}`,
          timestamp: new Date()
        })
      }

      this.inputMessage = ''

      this.$nextTick(() => {
        this.scrollMessagesToBottom()
      })

      try {
        // 从 total.vue 入口跳转的走两阶段(understand→generate)，点"+"新建的直接生成完整报告
        const stage = this.isTransferred ? 'understand' : 'generate'
        const rawData = await this.callAnalyzeApi(text, stage)
        const analyzeData = this.applyAnalyzeResult(rawData)

        await this.queryNetworkAndSave(analyzeData.requirementParams)
      } catch (error) {
        this.currentState = 'execution'

        this.historyConversations.push({
          type: 'system',
          content: `调用后端大模型失败：${error.message || '未知错误'}`,
          timestamp: new Date()
        })

        this.notify('error', '后端大模型调用失败')
      } finally {
        this.isProcessing = false
        this.isQueryingNetwork = false
        this.abortController = null
        this.scrollMessagesToBottom()
      }
    },

    async loadExistingAnalysis() {
      // 尝试从已保存的会话中加载分析结果
      try {
        const res = await fetch(`${this.apiRequirementsUrl}?session_id=${this.sessionId}`)
        const d = await res.json()
        if (d.success && d.data && d.data.requirementParams) {
          this.requirementParams = d.data.requirementParams || {}
          this.currentScenario = this.requirementParams.industry === 'automotive' ? 'auto' : 'uranium'
          if (d.data.results && d.data.results.length > 0) {
            this.taskResults = d.data.results
            this.selectedResult = d.data.results[0] || ''
            this.currentResult = d.data.results[0] || ''
          }
        }
      } catch (e) {
        console.warn('加载已有分析结果失败:', e)
      }
    },

    scenarioLabel() {
      return this.currentScenario === 'supply_chain' ? '汽车供应链' : '铀供应链'
    },

    async callAnalyzeApi(message, stage = 'understand') {
      this.abortController = new AbortController()

      const formData = new FormData()
      formData.append('session_id', this.sessionId)
      formData.append('message', message)
      formData.append('model', this.selectedModel)
      formData.append('history', JSON.stringify(this.buildHistoryPayload()))
      formData.append('stage', stage)
      // 传递场景信息
      if (this.currentScenario) {
        formData.append('scenario', this.currentScenario)
      }

      if (this.selectedFile) {
        formData.append('file', this.selectedFile)
      }

      const res = await fetch(this.apiAnalyzeUrl, {
        method: 'POST',
        body: formData,
        signal: this.abortController.signal
      })

      return this.parseBackendResponse(res)
    },

    handleBottomInput() {
      if (this.isNewConversation) {
        // 新建对话：走主接口生成报告
        this.inputMessage = this.feedbackInput
        this.feedbackInput = ''
        this.startAnalysis()
      } else {
        // 历史对话：走继续对话接口
        this.submitFeedback()
      }
    },

    async submitFeedback() {
      const text = (this.feedbackInput || '').trim()
      if (!text || this.isProcessing) return

      this.historyConversations.push({
        type: 'user',
        content: text,
        timestamp: new Date()
      })

      this.feedbackInput = ''
      this.isProcessing = true
      this.processingText = 'AI 正在根据反馈继续分析...'

      this.$nextTick(() => {
        this.scrollMessagesToBottom()
      })

      try {
        const oldParamsText = JSON.stringify(this.requirementParams || {})

        const rawData = await this.callChatApi(text)
        const chatData = this.applyChatResult(rawData)

        const effectiveParams =
          chatData.requirementParams && Object.keys(chatData.requirementParams).length
            ? chatData.requirementParams
            : this.requirementParams

        const newParamsText = JSON.stringify(effectiveParams || {})

        if (newParamsText !== oldParamsText) {
          await this.queryNetworkAndSave(effectiveParams)
        }
      } catch (error) {
        this.historyConversations.push({
          type: 'system',
          content: `继续对话失败：${error.message || '未知错误'}`,
          timestamp: new Date()
        })

        this.notify('error', '继续对话失败')
      } finally {
        this.isProcessing = false
        this.isQueryingNetwork = false
        this.abortController = null
        this.scrollMessagesToBottom()
      }
    },

    async callChatApi(message) {
      this.abortController = new AbortController()

      const res = await fetch(this.apiChatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: this.abortController.signal,
        body: JSON.stringify({
          session_id: this.sessionId,
          message,
          model: this.selectedModel,
          history: this.buildHistoryPayload(),
          tasks: this.taskObjects,
          task_results: this.taskResults,
          selected_task_index: this.selectedTaskIndex,
          current_result: this.editingContent || this.selectedResult || this.currentResult,
          file_name: this.selectedFile?.name || ''
        })
      })

      return this.parseBackendResponse(res)
    },

    async callQueryNetworkApi(requirementParams = this.requirementParams) {
      const res = await fetch(this.apiQueryNetworkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          requirementParams
        })
      })

      return this.parseBackendResponse(res)
    },

    async parseBackendResponse(res) {
      const text = await res.text()

      let payload = null

      try {
        payload = text ? JSON.parse(text) : {}
      } catch (error) {
        if (!res.ok) {
          throw new Error(text || `HTTP ${res.status}`)
        }

        return {
          answer: text
        }
      }

      if (!res.ok) {
        throw new Error(
          payload.message ||
          payload.error ||
          payload.detail ||
          `HTTP ${res.status}`
        )
      }

      if (
        payload.code !== undefined &&
        payload.code !== 0 &&
        payload.code !== '0'
      ) {
        throw new Error(payload.message || payload.error || '后端返回业务错误')
      }

      if (payload.success === false) {
        throw new Error(payload.message || payload.error || '后端返回失败')
      }

      return payload
    },

    unwrapResponse(raw) {
      if (!raw || typeof raw !== 'object') return {}

      if (raw.data && typeof raw.data === 'object') return raw.data
      if (raw.result && typeof raw.result === 'object') return raw.result

      return raw
    },

    applyAnalyzeResult(rawData) {
      const data = this.normalizeAnalyzeData(rawData)
      const stage = data.stage || 'understand'

      this.requirementParams = data.requirementParams || {}
      this.analysisStage = stage

      const analysisData = {
        goal: data.goal,
        object: data.object,
        understanding: data.understanding,
        influenceFactors: data.influenceFactors,
        responseVars: data.responseVars,
        subtasks: data.subtasks
      }

      this.taskAnalysisHtml = this.analysisToHtml(analysisData)

      if (stage === 'understand') {
        // 需求理解阶段：在对话中展示分析结果，右侧面板暂不填充
        // 把AI的分析回复作为对话消息显示
        const replyText = (data.results && data.results.length > 0)
          ? data.results[0]
          : (data.understanding || '已完成需求理解。')

        this.historyConversations.push({
          type: 'system',
          content: replyText,
          timestamp: new Date(),
          data: {
            goal: data.goal,
            variable: (data.influenceFactors || []).slice(0, 6),
            object: data.object
          },
          analysisData,
          showGenerateBtn: true
        })

        // 右侧面板保持空状态
        this.currentState = 'execution'
        this.tasks = []
        this.taskObjects = []
        this.taskResults = []
        this.currentResult = ''
        this.selectedResult = ''
        this.editingContent = ''
        this.currentTaskIndex = 0
        this.selectedTaskIndex = 0

        this.notify('success', '需求分析完成，可点击生成方案')
      } else {
        // 方案生成阶段：正常填充右侧面板
        this.historyConversations.push({
          type: 'system',
          content: data.understanding || '已完成需求理解与方案生成。',
          timestamp: new Date(),
          data: {
            goal: data.goal,
            variable: (data.influenceFactors || []).slice(0, 6),
            object: data.object
          },
          analysisData
        })

        this.taskObjects = data.subtasks
        this.tasks = data.subtasks.map(item => item.title || item.description || '未命名任务')
        this.taskResults = data.results

        if (!this.tasks.length && this.taskResults.length) {
          this.tasks = this.taskResults.map((_, index) => `模型输出 ${index + 1}`)
          this.taskObjects = this.tasks.map(title => ({
            title,
            description: title,
            agent_type: '千问大模型',
            emoji: '📌'
          }))
        }

        this.currentState = 'execution'
        this.currentTaskIndex = this.tasks.length || this.taskResults.length || 0

        if (this.taskResults.length) {
          this.selectedTaskIndex = 0
          this.currentResult = this.taskResults[0]
          this.selectedResult = this.taskResults[0]
          this.editingContent = this.taskResults[0]
        }

        this.historyConversations.push({
          type: 'system',
          content: `后端大模型已生成 ${this.tasks.length || this.taskResults.length || 1} 个分析结果。`,
          timestamp: new Date(),
          completionData: {
            totalTasks: this.tasks.length || this.taskResults.length || 1,
            subtasks: this.taskObjects
          }
        })

        this.notify('success', '完整方案已生成')
      }

      this.upsertCurrentSession()

      return data
    },

    applyChatResult(rawData) {
      const data = this.normalizeChatData(rawData)

      if (data.requirementParams && Object.keys(data.requirementParams).length) {
        this.requirementParams = data.requirementParams
      }

      this.historyConversations.push({
        type: 'system',
        content: data.reply || '后端已返回，但没有具体回复内容。',
        timestamp: new Date()
      })

      if (data.subtasks.length) {
        this.taskObjects = data.subtasks
        this.tasks = data.subtasks.map(item => item.title || item.description || '未命名任务')
      }

      if (data.results.length) {
        this.taskResults = data.results
        this.currentTaskIndex = this.tasks.length || data.results.length
      }

      if (data.updatedResult) {
        const index = Number.isInteger(data.updatedTaskIndex)
          ? data.updatedTaskIndex
          : this.selectedTaskIndex

        if (index >= 0) {
          this.taskResults[index] = data.updatedResult
          this.selectedTaskIndex = index
        }

        this.currentResult = data.updatedResult
        this.selectedResult = data.updatedResult
        this.editingContent = data.updatedResult
        this.isContentUpdated = true

        window.setTimeout(() => {
          this.isContentUpdated = false
        }, 800)
      } else if (data.results.length) {
        const index = Math.min(this.selectedTaskIndex, data.results.length - 1)
        this.selectedTaskIndex = index
        this.currentResult = data.results[index]
        this.selectedResult = data.results[index]
        this.editingContent = data.results[index]
      }

      this.notify('success', '后端已返回反馈结果')

      this.upsertCurrentSession()

      return data
    },

    applyQueryNetworkResult(rawData) {
      const data = this.unwrapResponse(rawData)

      this.ontologyQueryResult = data
      this.graphView = data.graph_view || null
      this.ontologyEvidence = this.toArray(
        data.ontology_evidence ||
        data.evidence ||
        []
      )
      this.seedNodes = this.toArray(data.seed_nodes || [])

      if (data.requirementParams && Object.keys(data.requirementParams).length) {
        this.requirementParams = data.requirementParams
      }

      this.historyConversations.push({
        type: 'system',
        content: `已根据需求参数完成本体网络筛选，并保存筛选结果。种子节点 ${this.seedNodes.length} 个，证据 ${this.ontologyEvidence.length} 条。`,
        timestamp: new Date()
      })

      this.scrollMessagesToBottom()
    },

    async queryNetworkAndSave(requirementParams = this.requirementParams) {
      if (!this.sessionId) return

      if (!requirementParams || !Object.keys(requirementParams).length) {
        this.historyConversations.push({
          type: 'system',
          content: '未获取到 requirementParams，暂时无法进行本体网络筛选。',
          timestamp: new Date()
        })
        return
      }

      this.isQueryingNetwork = true
      this.processingText = '正在根据需求参数筛选本体网络...'

      try {
        const rawData = await this.callQueryNetworkApi(requirementParams)
        this.applyQueryNetworkResult(rawData)
        this.notify('success', '本体网络筛选结果已保存')
      } catch (error) {
        this.historyConversations.push({
          type: 'system',
          content: `本体网络筛选失败：${error.message || '未知错误'}`,
          timestamp: new Date()
        })
        this.notify('warning', '需求分析已完成，但本体网络筛选失败')
      } finally {
        this.isQueryingNetwork = false
      }
    },

    normalizeAnalyzeData(rawData) {
      const d = this.unwrapResponse(rawData)

      const subtasks = this.toArray(
        d.subtasks ||
        d.tasks ||
        d.task_list ||
        d.taskList
      ).map((item, index) => {
        if (typeof item === 'string') {
          return {
            emoji: this.defaultEmoji(index),
            title: item,
            description: item,
            agent_type: '千问大模型'
          }
        }

        return {
          emoji: item?.emoji || this.defaultEmoji(index),
          title: item?.title || item?.name || item?.task || `任务 ${index + 1}`,
          description: item?.description || item?.desc || item?.content || item?.title || `任务 ${index + 1}`,
          agent_type: item?.agent_type || item?.agent || item?.role || '千问大模型'
        }
      })

      const results = this.toArray(
        d.results ||
        d.task_results ||
        d.outputs ||
        d.result_list
      ).map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          return item.content || item.result || item.analysis || item.text || JSON.stringify(item, null, 2)
        }
        return String(item || '')
      }).filter(Boolean)

      const answer = d.answer || d.reply || d.content || ''

      return {
        stage: d.stage || 'understand',
        understanding:
          d.understanding ||
          d.analysis ||
          d.summary ||
          answer ||
          '模型已完成需求理解与任务拆解。',
        goal:
          d.goal ||
          d.target ||
          d.objective ||
          '供应链智能推演',
        object:
          d.object ||
          d.subject ||
          d.scope ||
          '供应链场景',
        requirementParams:
          d.requirementParams ||
          d.requirement_params ||
          {},
        influenceFactors: this.toArray(
          d.influenceFactors ||
          d.influence_factors ||
          d.factors ||
          []
        ),
        responseVars: this.toArray(
          d.responseVars ||
          d.response_vars ||
          d.variables ||
          d.metrics ||
          []
        ),
        subtasks,
        results,
        answer
      }
    },

    normalizeChatData(rawData) {
      const d = this.unwrapResponse(rawData)

      const subtasks = this.toArray(
        d.subtasks ||
        d.tasks ||
        []
      ).map((item, index) => {
        if (typeof item === 'string') {
          return {
            emoji: this.defaultEmoji(index),
            title: item,
            description: item,
            agent_type: '千问大模型'
          }
        }

        return {
          emoji: item?.emoji || this.defaultEmoji(index),
          title: item?.title || item?.name || item?.task || `任务 ${index + 1}`,
          description: item?.description || item?.desc || item?.content || item?.title || `任务 ${index + 1}`,
          agent_type: item?.agent_type || item?.agent || item?.role || '千问大模型'
        }
      })

      const results = this.toArray(
        d.results ||
        d.task_results ||
        []
      ).map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          return item.content || item.result || item.analysis || item.text || JSON.stringify(item, null, 2)
        }
        return String(item || '')
      }).filter(Boolean)

      const updatedTaskIndexRaw =
        d.updated_task_index !== undefined
          ? d.updated_task_index
          : d.updatedTaskIndex

      const updatedTaskIndex = Number.isInteger(Number(updatedTaskIndexRaw))
        ? Number(updatedTaskIndexRaw)
        : this.selectedTaskIndex

      return {
        reply:
          d.reply ||
          d.answer ||
          d.content ||
          d.message ||
          '',
        updatedResult:
          d.updated_result ||
          d.updatedResult ||
          d.result ||
          '',
        updatedTaskIndex,
        subtasks,
        results,
        requirementParams:
          d.requirementParams ||
          d.requirement_params ||
          {}
      }
    },

    toArray(value) {
      if (Array.isArray(value)) return value
      if (value === undefined || value === null || value === '') return []
      return [value]
    },

    defaultEmoji(index) {
      const list = ['🧭', '🕸️', '⚠️', '📦', '📊', '✅']
      return list[index % list.length]
    },

    analysisToHtml(data) {
      const tasksHtml = (data.subtasks || []).map((task, index) => {
        return `
          <div class="local-analysis-task">
            <strong>${index + 1}. ${this.escapeHtml(task.emoji || '📌')} ${this.escapeHtml(task.title || '')}</strong>
            <p>${this.escapeHtml(task.description || '')}</p>
            <small>${this.escapeHtml(task.agent_type || '千问大模型')}</small>
          </div>
        `
      }).join('')

      const factors = (data.influenceFactors || []).map(item => {
        return `<span class="html-tag">${this.escapeHtml(item)}</span>`
      }).join('')

      const vars = (data.responseVars || []).map(item => {
        return `<span class="html-tag response">${this.escapeHtml(item)}</span>`
      }).join('')

      return `
        <div class="local-analysis-html">
          <h3>目标理解</h3>
          <p>${this.escapeHtml(data.understanding || '')}</p>

          <h3>任务拆解队列</h3>
          ${tasksHtml || '<p>暂无任务拆解</p>'}

          <h3>影响因素</h3>
          <div class="html-tags">${factors || '<span class="html-empty">暂无</span>'}</div>

          <h3>响应变量</h3>
          <div class="html-tags">${vars || '<span class="html-empty">暂无</span>'}</div>
        </div>
      `
    },

    async generateScheme() {
      if (this.isProcessing) return

      this.isProcessing = true
      this.processingText = '正在生成完整事前推演方案...'
      this.currentState = 'analysis'
      this.taskAnalysisHtml = ''

      this.$nextTick(() => {
        this.scrollMessagesToBottom()
      })

      try {
        const rawData = await this.callAnalyzeApi('生成方案', 'generate')
        const analyzeData = this.applyAnalyzeResult(rawData)

        await this.queryNetworkAndSave(analyzeData.requirementParams)
      } catch (error) {
        this.currentState = 'execution'

        this.historyConversations.push({
          type: 'system',
          content: `方案生成失败：${error.message || '未知错误'}`,
          timestamp: new Date()
        })

        this.notify('error', '方案生成失败')
      } finally {
        this.isProcessing = false
        this.isQueryingNetwork = false
        this.abortController = null
        this.scrollMessagesToBottom()
      }
    },

    selectHistoryTask(index) {
      if (!this.taskResults[index]) {
        if (index >= this.currentTaskIndex) {
          this.notify('warning', '该任务还没有结果')
        }
        return
      }

      this.selectedTaskIndex = index
      this.selectedResult = this.taskResults[index]
      this.currentResult = this.taskResults[index]
      this.editingContent = this.taskResults[index]
    },

    prevTask() {
      if (!this.tasks.length) return

      const availableCount = Math.max(this.currentTaskIndex, 1)
      const nextIndex = this.selectedTaskIndex <= 0
        ? availableCount - 1
        : this.selectedTaskIndex - 1

      this.selectHistoryTask(nextIndex)
    },

    nextTask() {
      if (!this.tasks.length) return

      const availableCount = Math.max(this.currentTaskIndex, 1)
      const nextIndex = this.selectedTaskIndex >= availableCount - 1
        ? 0
        : this.selectedTaskIndex + 1

      this.selectHistoryTask(nextIndex)
    },

    showTaskTooltip(index, event) {
      this.hoveredTaskIndex = index

      const target = event.currentTarget
      const parent = target.parentElement

      if (!target || !parent) {
        this.tooltipX = 0
        this.tooltipY = -36
        return
      }

      const rect = target.getBoundingClientRect()
      const parentRect = parent.getBoundingClientRect()

      this.tooltipX = rect.left - parentRect.left + rect.width / 2
      this.tooltipY = -42
    },

    hideTaskTooltip() {
      this.hoveredTaskIndex = null
    },

    getAgentDisplayName(type) {
      const map = {
        需求理解智能体: '需求理解',
        网络结构分析智能体: '网络分析',
        风险识别智能体: '风险识别',
        预案设计智能体: '预案设计',
        效果评估智能体: '效果评估',
        千问大模型: '千问大模型'
      }

      return map[type] || type || '千问大模型'
    },

    formatResultContent(content) {
      if (!content) return ''

      let html = this.escapeHtml(content)

      html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>')
      html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>')
      html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>')
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      html = html.replace(/^- (.*)$/gm, '<li>$1</li>')
      html = html.replace(/^(\d+)\. (.*)$/gm, '<li>$1. $2</li>')
      html = html.replace(/\n/g, '<br>')
      html = html.replace(/(<li>.*?<\/li>)(<br>)?/g, '$1')

      return html
    },

    escapeHtml(str = '') {
      return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
    },

    formatTime(timestamp) {
      if (!timestamp) return ''

      const date = new Date(timestamp)

      if (Number.isNaN(date.getTime())) return ''

      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    shortText(text = '', max = 30) {
      const str = String(text || '')
      if (str.length <= max) return str
      return `${str.slice(0, max)}...`
    },

    scrollMessagesToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.messagesContainer
        if (el) {
          el.scrollTop = el.scrollHeight
        }
      })
    },

    /* ========== 历史会话管理 ========== */
    getStorageKey() {
      return 'scnet_pre_sessions'
    },

    loadSessions() {
      try {
        const raw = window.localStorage.getItem(this.getStorageKey())
        this.sessions = raw ? JSON.parse(raw) : []
      } catch {
        this.sessions = []
      }
    },

    saveSessionsToStorage() {
      try {
        // 每条会话只保留关键字段，避免localStorage爆满
        const compact = this.sessions.map(s => ({
          id: s.id,
          title: s.title || '新对话',
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          historyConversations: (s.historyConversations || []).slice(-40),
          requirementParams: s.requirementParams || {},
          taskResults: (s.taskResults || []).slice(0, 2),
          tasks: s.tasks || [],
          taskObjects: s.taskObjects || []
        }))
        window.localStorage.setItem(this.getStorageKey(), JSON.stringify(compact))
      } catch (e) {
        // localStorage满了，尝试清理旧会话
        if (this.sessions.length > 10) {
          this.sessions = this.sessions.slice(-10)
          this.saveSessionsToStorage()
        }
      }
    },

    upsertCurrentSession() {
      if (!this.sessionId) return

      const existing = this.sessions.find(s => s.id === this.sessionId)
      const title = this.historyConversations
        .filter(m => m.type === 'user')
        .map(m => (m.content || '').slice(0, 60))
        .join(' | ') || '新对话'

      const payload = {
        id: this.sessionId,
        title: title || '新对话',
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        historyConversations: [...this.historyConversations],
        requirementParams: this.requirementParams ? { ...this.requirementParams } : {},
        taskResults: [...this.taskResults],
        tasks: [...this.tasks],
        taskObjects: [...this.taskObjects]
      }

      if (existing) {
        Object.assign(existing, payload)
      } else {
        this.sessions.unshift(payload)
        this.activeSessionId = this.sessionId
      }

      this.saveSessionsToStorage()
    },

    switchSession(sessionId) {
      if (this.isProcessing || sessionId === this.activeSessionId) return

      const sess = this.sessions.find(s => s.id === sessionId)
      if (!sess) return

      // 先保存当前会话
      if (this.activeSessionId && this.sessionId) {
        this.upsertCurrentSession()
      }

      // 恢复历史会话：允许继续追问
      this.isTransferred = true
      this.isNewConversation = false

      // 恢复选中会话
      this.sessionId = sess.id
      this.activeSessionId = sess.id
      this.historyConversations = sess.historyConversations || []
      this.requirementParams = sess.requirementParams || {}
      this.taskResults = sess.taskResults || []
      this.tasks = sess.tasks || []
      this.taskObjects = sess.taskObjects || []

      // 恢复右侧面板展示
      if (this.taskResults.length > 0) {
        this.hasStarted = true
        this.currentState = 'execution'
        this.currentTaskIndex = this.tasks.length || this.taskResults.length
        this.selectedTaskIndex = 0
        this.currentResult = this.taskResults[0]
        this.selectedResult = this.taskResults[0]
        this.editingContent = this.taskResults[0]
        this.taskAnalysisHtml = ''
      } else if (this.historyConversations.length > 0) {
        this.hasStarted = true
        this.currentState = 'execution'
      } else {
        this.hasStarted = true
        this.currentState = 'analysis'
      }

      this.isContentUpdated = true
      window.setTimeout(() => {
        this.isContentUpdated = false
      }, 500)

      this.$nextTick(() => {
        this.scrollMessagesToBottom()
      })
    },

    deleteSession(sessionId) {
      const index = this.sessions.findIndex(s => s.id === sessionId)
      if (index < 0) return

      this.sessions.splice(index, 1)
      this.saveSessionsToStorage()

      if (sessionId === this.activeSessionId) {
        // 删的是当前会话，切换到下一个或新建
        if (this.sessions.length > 0) {
          this.switchSession(this.sessions[0].id)
        } else {
          this.startNewSession()
        }
      }
    },

    formatDate(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return ''
      const now = new Date()
      const diffMs = now - d
      const diffMin = Math.floor(diffMs / 60000)
      if (diffMin < 1) return '刚刚'
      if (diffMin < 60) return `${diffMin}分钟前`
      const isToday = d.toDateString() === now.toDateString()
      if (isToday) {
        return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
      return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }
  }
}
</script>

<style scoped>
.scenario-real-page {
  width: 100%;
  min-height: 100vh;
  font-family:
    Inter,
    "PingFang SC",
    "Microsoft YaHei",
    Arial,
    sans-serif;
  color: #0f172a;
}


.loading-dots,
.thinking-dots {
  display: inline-flex;
  gap: 5px;
}

.loading-dots span,
.thinking-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2563eb;
  animation: dotPulse 1s ease-in-out infinite;
}

.loading-dots span:nth-child(2),
.thinking-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-dots span:nth-child(3),
.thinking-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes dotPulse {
  0%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

/* 主界面 */
.scenario-modeling-container {
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 0%, rgba(37, 99, 235, 0.12), transparent 28%),
    radial-gradient(circle at 100% 80%, rgba(99, 102, 241, 0.1), transparent 30%),
    #f8fafc;
  padding: 24px;
  position: relative;
}

.back-btn-3d {
  position: fixed;
  top: 24px;
  left: 28px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  transition: all 0.2s ease;
}

.back-btn-3d:hover {
  transform: translateY(-1px);
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.4);
  box-shadow: 0 16px 32px rgba(37, 99, 235, 0.12);
}

.back-btn-3d:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.main-content {
  display: grid;
  grid-template-columns: 260px minmax(360px, 0.85fr) minmax(360px, 1.15fr);
  gap: 16px;
  height: calc(100vh - 48px);
}

/* ========== 历史对话侧边栏 ========== */
.history-sidebar {
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.history-header {
  min-height: 56px;
  padding: 0 14px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.history-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  font-size: 14px;
  color: #334155;
}

.history-title-icon {
  width: 18px;
  height: 18px;
  color: #64748b;
}

.new-chat-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.new-chat-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
}

.new-chat-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.new-chat-btn svg {
  width: 16px;
  height: 16px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
}

.history-item {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 3px;
  position: relative;
}

.history-item:hover {
  background: #f1f5f9;
}

.history-item.active {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.history-item-content {
  flex: 1;
  min-width: 0;
}

.history-item-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}

.history-item.active .history-item-title {
  color: #1e3a8a;
}

.history-item-time {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

.history-delete-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.15s ease;
}

.history-item:hover .history-delete-btn {
  opacity: 1;
}

.history-delete-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.history-delete-btn svg {
  width: 14px;
  height: 14px;
}

.history-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #94a3b8;
  padding: 20px;
  text-align: center;
}

.history-empty svg {
  width: 32px;
  height: 32px;
  opacity: 0.5;
}

.history-empty p {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.history-empty span {
  font-size: 12px;
  color: #94a3b8;
}

.glass-effect {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(20px);
}

.conversation-panel,
.task-panel {
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-header {
  min-height: 68px;
  padding: 0 22px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 800;
  color: #0f172a;
}

.header-icon-small {
  font-size: 18px;
}

.header-subhint {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.conversation-stats {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #64748b;
  font-size: 13px;
}

.stat-item svg {
  width: 16px;
  height: 16px;
}

.model-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 12px;
  font-weight: 700;
}

/* 消息 */
.conversation-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  min-height: 0;
}

.message-wrapper {
  margin-bottom: 18px;
}

.message-bubble {
  display: flex;
  gap: 12px;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-wrapper.user .message-avatar {
  background: #dbeafe;
}

.message-content-wrapper {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.message-sender {
  font-size: 13px;
  font-weight: 800;
  color: #334155;
}

.message-time {
  font-size: 12px;
  color: #94a3b8;
}

.message-text {
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #334155;
  line-height: 1.7;
  font-size: 14px;
  white-space: pre-wrap;
}

.message-wrapper.user .message-text {
  background: #eff6ff;
  border-color: #bfdbfe;
}

/* 生成方案按钮 */
.generate-scheme-area {
  margin-top: 12px;
}

.generate-scheme-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 14px;
  border: 1px solid #93c5fd;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  color: #1d4ed8;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.generate-scheme-btn:hover {
  background: linear-gradient(135deg, #2563eb, #6366f1);
  color: #ffffff;
  border-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.25);
}

.generate-scheme-btn svg {
  width: 18px;
  height: 18px;
}

.thinking-animation {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.requirement-mini-table,
.analysis-result-card,
.completion-result-card {
  margin-top: 10px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.mini-table-row {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.mini-table-row:last-child {
  border-bottom: none;
}

.mini-label {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.mini-value {
  color: #334155;
  font-size: 13px;
}

.analysis-section {
  padding: 14px;
  border-bottom: 1px solid #f1f5f9;
}

.analysis-section:last-child {
  border-bottom: none;
}

/* 隐藏任务拆解区域 */
.tasks-section {
  display: none;
}

/* 隐藏已完成任务卡片 */
.completion-result-card {
  display: none;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #1e3a8a;
  font-weight: 800;
  margin-bottom: 8px;
}

.section-content {
  color: #475569;
  line-height: 1.7;
  font-size: 14px;
}

.task-chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  opacity: 0.62;
}

.task-chip.generated {
  opacity: 1;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.chip-number {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #2563eb;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
}

.chip-text {
  flex: 1;
  min-width: 0;
  color: #334155;
  font-size: 13px;
}

.chip-agent {
  color: #2563eb;
  font-size: 12px;
  background: #dbeafe;
  padding: 3px 7px;
  border-radius: 999px;
}

.var-group {
  margin-bottom: 10px;
}

.var-group:last-child {
  margin-bottom: 0;
}

.var-label {
  display: block;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
}

.var-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.var-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
  color: #1d4ed8;
  background: #dbeafe;
}

.var-tag.response {
  color: #047857;
  background: #d1fae5;
}

.completion-result-card {
  padding: 14px;
}

.completion-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.completion-count {
  font-size: 28px;
  font-weight: 900;
  color: #2563eb;
}

.completion-label {
  color: #475569;
  font-weight: 700;
}

.completion-task-item {
  display: flex;
  gap: 8px;
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
}

.completion-check {
  color: #2563eb;
  font-weight: 900;
}

/* 输入 */
.conversation-input-area {
  border-top: 1px solid #e2e8f0;
  padding: 14px 16px 16px;
  background: rgba(255, 255, 255, 0.86);
}

.input-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-icon-button,
.send-button {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-icon-button {
  background: #f1f5f9;
  color: #475569;
}

.send-button {
  background: #2563eb;
  color: #ffffff;
}

.upload-icon-button:hover,
.send-button:hover {
  transform: translateY(-1px);
}

.upload-icon-button:disabled,
.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-icon-button svg,
.send-button svg {
  width: 18px;
  height: 18px;
}

.conversation-input {
  flex: 1;
  height: 40px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 12px;
  padding: 0 12px;
  outline: none;
  color: #0f172a;
}

.conversation-input:focus {
  border-color: #60a5fa;
}

/* 右侧任务面板 */
.analysis-state,
.execution-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

.status-badge.analysis {
  background: #eff6ff;
  color: #2563eb;
}

.status-badge.active {
  background: #eff6ff;
  color: #2563eb;
}

.status-badge.completed {
  background: #dcfce7;
  color: #15803d;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  animation: pulseDot 1s ease-in-out infinite;
}

@keyframes pulseDot {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.25);
  }
}

.analysis-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.analysis-placeholder,
.empty-result-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94a3b8;
  text-align: center;
}

.placeholder-icon,
.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 22px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon svg,
.empty-icon svg {
  width: 30px;
  height: 30px;
}

.empty-result-state h3 {
  margin: 0;
  color: #64748b;
}

.empty-result-state p {
  margin: 0;
  color: #94a3b8;
  font-size: 13px;
}

.current-task-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin: 14px 22px 0;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(99, 102, 241, 0.06));
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  font-size: 13px;
  color: #1e3a8a;
  line-height: 1.4;
}

.strip-icon {
  flex-shrink: 0;
}

.strip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.execution-progress {
  padding: 18px 22px 8px;
}

.progress-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.progress-bar {
  height: 18px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: visible;
  display: flex;
  position: relative;
}

.progress-completed-bg {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, #2563eb, #6366f1);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-segment {
  position: relative;
  z-index: 2;
  height: 18px;
  border-right: 1px solid rgba(255, 255, 255, 0.6);
  cursor: pointer;
}

.progress-segment:first-of-type {
  border-radius: 999px 0 0 999px;
}

.progress-segment:last-of-type {
  border-radius: 0 999px 999px 0;
  border-right: none;
}

.progress-segment.active {
  box-shadow: inset 0 0 0 2px rgba(15, 23, 42, 0.22);
}

.progress-shine {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  pointer-events: none;
}

.task-tooltip {
  position: absolute;
  transform: translateX(-50%);
  max-width: 260px;
  padding: 7px 10px;
  border-radius: 9px;
  background: #0f172a;
  color: #ffffff;
  font-size: 12px;
  white-space: nowrap;
  z-index: 20;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
}

.tooltip-arrow {
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 10px;
  height: 10px;
  background: #0f172a;
  transform: translateX(-50%) rotate(45deg);
}

.progress-nav {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.nav-button {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  cursor: pointer;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-button svg {
  width: 18px;
  height: 18px;
}

.nav-button:hover {
  border-color: #60a5fa;
  color: #2563eb;
}

/* 新增：本体网络筛选结果卡片 */
.ontology-result-card {
  margin: 12px 22px 0;
  padding: 14px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.ontology-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e3a8a;
  margin-bottom: 10px;
}

.ontology-loading {
  margin-left: auto;
  font-size: 12px;
  color: #2563eb;
  font-weight: 700;
}

.ontology-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  color: #475569;
  font-size: 13px;
  gap: 12px;
}

.ontology-row strong {
  color: #0f172a;
  text-align: right;
  word-break: break-all;
}

.ontology-query {
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}

.ontology-query pre {
  margin: 6px 0 0;
  padding: 8px;
  max-height: 180px;
  overflow: auto;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  white-space: pre-wrap;
  word-break: break-word;
}

.task-result-preview {
  flex: 1;
  min-height: 0;
  margin: 12px 22px 0;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.task-result-preview.content-updated {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.preview-header {
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.preview-header h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #0f172a;
}

.preview-header svg {
  width: 18px;
  height: 18px;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
}

.result-content {
  color: #334155;
  line-height: 1.8;
  font-size: 14px;
}

.result-content :deep(h1),
.result-content h1 {
  font-size: 22px;
  color: #0f172a;
  margin: 14px 0 10px;
}

.result-content :deep(h2),
.result-content h2 {
  font-size: 19px;
  color: #1e3a8a;
  margin: 14px 0 10px;
}

.result-content :deep(h3),
.result-content h3 {
  font-size: 16px;
  color: #1e3a8a;
  margin: 12px 0 8px;
}

/* 后端生成分析 HTML */
:deep(.local-analysis-html h3) {
  margin: 16px 0 10px;
  color: #1e3a8a;
}

:deep(.local-analysis-html p) {
  color: #475569;
  line-height: 1.75;
}

:deep(.local-analysis-task) {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}

:deep(.local-analysis-task p) {
  margin: 6px 0;
  font-size: 13px;
}

:deep(.local-analysis-task small) {
  color: #2563eb;
}

:deep(.html-tags) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.html-tag) {
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
  color: #1d4ed8;
  background: #dbeafe;
}

:deep(.html-tag.response) {
  color: #047857;
  background: #d1fae5;
}

:deep(.html-empty) {
  color: #94a3b8;
  font-size: 13px;
}

/* 响应式 */
@media (max-width: 1280px) {
  .main-content {
    grid-template-columns: 220px minmax(320px, 0.85fr) minmax(320px, 1.15fr);
    gap: 12px;
  }
}

@media (max-width: 1080px) {
  .main-content {
    grid-template-columns: 1fr;
    height: auto;
  }

  .history-sidebar {
    display: none;
  }

  .conversation-panel,
  .task-panel {
    min-height: 620px;
  }

  .scenario-modeling-container {
    padding: 14px;
    padding-top: 76px;
  }

  .back-btn-3d {
    top: 18px;
    left: 18px;
  }
}

@media (max-width: 768px) {
  .panel-header {
    padding: 0 14px;
  }

  .conversation-messages {
    padding: 14px;
  }

  .current-task-strip,
  .task-result-preview,
  .ontology-result-card {
    margin-left: 14px;
    margin-right: 14px;
  }

  .execution-progress {
    padding-left: 14px;
    padding-right: 14px;
  }
}
</style>
