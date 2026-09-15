<template>
  <div class="chat-shell">
    <ChatSidebar
      :conversations="conversations"
      :activeId="currentConversationId"
      :collapsed="sidebarCollapsed"
      :history-loaded="historyLoaded"
      :history-error="historyError"
      :history-loading="historyLoading"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @new-conversation="startNewConversation"
      @select-conversation="loadConversation"
      @delete-conversation="handleDeleteConversation"
      @batch-delete="handleBatchDelete"
      @rename-conversation="handleRenameConversation"
      @open-knowledge="openKnowledge"
      @exit="goToMainPage"
      @retry-history="retryHistory"
    />

    <div class="chat-main" :class="[sidebarCollapsed ? 'chat-main-shrink' : 'chat-main-expand', execPanelVisible ? 'has-exec' : '']">

      <!-- ====== Welcome ====== -->
      <template v-if="messages.length === 0 && !isStreaming">
        <div class="chat-welcome-wrap">
          <div class="chat-welcome">
            <div class="chat-welcome-brand">
              <img :src="logoUrl" alt="SCnet" class="chat-welcome-logo" />
              <span class="chat-welcome-text">使用供应链助手开始对话</span>
            </div>
            <p class="chat-welcome-hint">本系统支持 <b>铀供应链</b> 与 <b>汽车供应链</b> 两大场景。</p>

            <!-- 场景指示器（自动识别 + 可手动切换） -->
            <div class="chat-scenario-row">
              <div class="chat-scenario-badge" :class="scenarioStore.isSupplyChain ? 'is-auto' : 'is-uranium'">
                <span class="chat-scenario-dot"></span>
                <span>当前场景：{{ scenarioStore.label }}</span>
              </div>
              <el-popover trigger="click" placement="bottom" :width="160" popper-class="chat-popover">
                <template #reference>
                  <button class="chat-scenario-switch-btn" title="切换场景">
                    <el-icon :size="12"><Switch /></el-icon>
                    <span>切换</span>
                  </button>
                </template>
                <div class="chat-scenario-menu">
                  <button v-for="s in scenarioOptions" :key="s.value" class="chat-scenario-item"
                    :class="{ active: scenarioStore.currentScenario === s.value }" @click="selectScenario(s.value)">
                    {{ s.label }}
                  </button>
                </div>
              </el-popover>
            </div>

            <!-- Mode selector -->
            <div class="chat-mode-wrap">
              <div class="chat-mode-selector" @pointermove="handleModeGlassPointer" @pointerleave="resetModeGlassPointer">
                <div class="chat-mode-slider" :class="'pos-' + modeIndex"></div>
                <button v-for="opt in modeOptions" :key="opt.value" class="chat-mode-option"
                  :class="{ active: currentMode === opt.value }" @click="selectMode(opt.value)">
                  <el-icon :size="16"><component :is="opt.icon" /></el-icon>
                  <span>{{ opt.label }}</span>
                </button>
              </div>
            </div>

            <!-- Input -->
            <div class="chat-welcome-input">
              <div class="chat-input-wrapper">
                <div class="chat-input-box">
                  <div class="chat-composer-body">
                    <textarea ref="welcomeTextarea" v-model="inputText" class="chat-input-textarea"
                      :placeholder="inputPlaceholder" rows="2"
                      @keydown.enter.exact.prevent="handleSend" @input="autoResizeWelcome"></textarea>
                  </div>
                  <div class="chat-composer-footer">
                    <div class="chat-composer-tools">
                      <button class="chat-composer-icon-btn chat-input-attach" @click="triggerFileInput" title="添加附件">
                        <el-icon :size="16"><Link /></el-icon>
                      </button>
                      <el-popover trigger="click" placement="top" :width="180" popper-class="chat-popover">
                        <template #reference>
                          <button class="chat-composer-tag-btn" title="执行模式">
                            <el-icon :size="15"><component :is="currentExecMode.icon" /></el-icon>
                            <span>{{ currentExecMode.label }}</span>
                          </button>
                        </template>
                        <div class="chat-selector-menu">
                          <button v-for="m in EXEC_MODES" :key="m.value" class="chat-selector-item"
                            :class="{ active: execMode === m.value }" @click="execMode = m.value">
                            <el-icon :size="16"><component :is="m.icon" /></el-icon>
                            <div class="chat-selector-item-text">
                              <span class="chat-selector-item-label">{{ m.label }}</span>
                              <span class="chat-selector-item-desc">{{ m.desc }}</span>
                            </div>
                          </button>
                        </div>
                      </el-popover>
                      <el-popover trigger="click" placement="top" :width="200" popper-class="chat-model-popover">
                        <template #reference>
                          <button class="chat-composer-tag-btn" title="选择模型">
                            <el-icon :size="15"><Cpu /></el-icon>
                            <span>{{ currentModelLabel }}</span>
                          </button>
                        </template>
                        <div class="chat-model-menu">
                          <button v-for="m in chatModels" :key="m.value" class="chat-model-item"
                            :class="{ active: selectedModel === m.value }" @click="selectedModel = m.value">{{ m.label }}</button>
                        </div>
                      </el-popover>
                    </div>
                    <div class="chat-composer-actions">
                      <button class="chat-send-btn" :disabled="!inputText.trim() && attachments.length === 0" @click="handleSend" title="发送消息">
                        <el-icon :size="15"><Position /></el-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 建议问题 -->
            <div class="chat-welcome-suggests">
              <button v-for="s in SUGGEST_QUESTIONS" :key="s" class="chat-suggest-btn" @click="useSuggestion(s)">
                <el-icon :size="13"><TrendCharts /></el-icon>
                <span>{{ s }}</span>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- ====== Messages ====== -->
      <template v-else>
        <div class="chat-messages" ref="msgContainer">
          <div class="chat-messages-inner">
            <div v-for="msg in messages" :key="msg.id" class="chat-msg" :class="msg.role">
              <div class="chat-msg-avatar" :class="msg.role">
                <img v-if="msg.role === 'assistant'" :src="logoUrl" alt="" />
                <span v-else>U</span>
              </div>
              <div class="chat-msg-body">
                <!-- K3-CHAT-2:三部分结果卡 -->
                <div v-if="msg.role === 'assistant' && execPanelVisible" class="chat-result-cards">
                  <div v-for="card in RESULT_CARDS" :key="card.key" class="chat-result-card"
                    :class="{ active: isSectionDone(card.key) }">
                    <span class="chat-result-card-num">{{ card.key }}</span>
                    <span class="chat-result-card-label">{{ card.label }}</span>
                    <span class="chat-result-card-check">{{ isSectionDone(card.key) ? '✓' : '…' }}</span>
                  </div>
                </div>
                <div v-if="msg.content" class="chat-msg-bubble" v-html="renderMarkdown(msg.content)"></div>
                <div v-if="msg.role === 'assistant'" class="chat-disclaimer">本回答由 AI 生成，内容仅供参考</div>
                <!-- K2-FLOW:本次研判结果操作区 -->
                <div v-if="analysisSuccess && msg.id === lastAnalysisMsgId" class="chat-analysis-actions">
                  <button class="chat-pdf-btn" :disabled="pdfGenerating" @click="exportPdf">
                    {{ pdfStateText }}
                  </button>
                </div>
              </div>
            </div>
            <div v-if="isStreaming" class="chat-spinner">
              <span class="chat-spinner-glyph">{{ spinnerGlyph }}</span>
              <span class="chat-spinner-verb">推演中&hellip;</span>
            </div>
          </div>
          <!-- K2-FLOW:分析成功后进入可视化 -->
          <div v-if="analysisSuccess" class="chat-visualize-zone">
            <button class="chat-visualize-btn" @click="goVisualization">
              <span>进入可视化界面</span>
              <b class="chat-visualize-arrow">&rarr;</b>
            </button>
          </div>
        </div>
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <div class="chat-input-box">
              <div v-if="attachments.length > 0" class="chat-file-previews">
                <div v-for="(f, idx) in attachments" :key="idx" class="chat-file-preview">
                  <img v-if="f.preview && f.type.startsWith('image/')" :src="f.preview" :alt="f.name" />
                  <div v-else class="chat-file-preview-doc">
                    <el-icon :size="20"><Document /></el-icon>
                    <span>{{ f.name.length > 8 ? f.name.slice(0, 8) + '..' : f.name }}</span>
                  </div>
                  <button class="chat-file-preview-remove" @click="removeAttachment(idx)">&times;</button>
                </div>
              </div>
              <div class="chat-composer-body">
                <textarea ref="chatTextarea" v-model="inputText" class="chat-input-textarea"
                  placeholder="继续对话..." rows="2" :disabled="isStreaming"
                  @keydown.enter.exact.prevent="handleSend" @input="autoResizeChat"></textarea>
              </div>
              <div class="chat-composer-footer">
                <div class="chat-composer-tools">
                  <button class="chat-composer-icon-btn chat-input-attach" @click="triggerFileInput" title="添加附件">
                    <el-icon :size="16"><Link /></el-icon>
                  </button>
                  <el-popover trigger="click" placement="top" :width="180" popper-class="chat-popover">
                    <template #reference>
                      <button class="chat-composer-tag-btn" :disabled="isStreaming" title="执行模式">
                        <el-icon :size="15"><component :is="currentExecMode.icon" /></el-icon>
                        <span>{{ currentExecMode.label }}</span>
                      </button>
                    </template>
                    <div class="chat-selector-menu">
                      <button v-for="m in EXEC_MODES" :key="m.value" class="chat-selector-item"
                        :class="{ active: execMode === m.value }" @click="execMode = m.value">
                        <el-icon :size="16"><component :is="m.icon" /></el-icon>
                        <div class="chat-selector-item-text">
                          <span class="chat-selector-item-label">{{ m.label }}</span>
                          <span class="chat-selector-item-desc">{{ m.desc }}</span>
                        </div>
                      </button>
                    </div>
                  </el-popover>
                  <el-popover trigger="click" placement="top" :width="200" popper-class="chat-model-popover">
                    <template #reference>
                      <button class="chat-composer-tag-btn" :disabled="isStreaming" title="选择模型">
                        <el-icon :size="15"><Cpu /></el-icon>
                        <span>{{ currentModelLabel }}</span>
                      </button>
                    </template>
                    <div class="chat-model-menu">
                      <button v-for="m in chatModels" :key="m.value" class="chat-model-item"
                        :class="{ active: selectedModel === m.value }" @click="selectedModel = m.value">{{ m.label }}</button>
                    </div>
                  </el-popover>
                </div>
                <div class="chat-composer-actions">
                  <button v-if="!isStreaming" class="chat-send-btn" :disabled="!inputText.trim() && attachments.length === 0"
                    @click="handleSend" title="发送消息">
                    <el-icon :size="15"><Position /></el-icon>
                  </button>
                  <button v-else class="chat-stop-btn" @click="abortStream" title="中止对话"></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 右侧：Agent 研判执行面板 -->
    <aside v-if="execPanelVisible" class="chat-exec-panel">
      <div class="chat-exec-header">
        <span class="chat-exec-title">事前态势研判 · Agent 执行</span>
        <button class="chat-exec-close" @click="execPanelVisible = false" title="收起">&times;</button>
      </div>
      <div class="chat-exec-body">
        <div class="chat-exec-model" v-if="activeRun && activeRun.model">
          <span class="chat-exec-model-provider">{{ activeRun.provider }}</span>
          <span class="chat-exec-model-name">{{ activeRun.model }}</span>
        </div>
        <div class="chat-exec-status">
          <span class="chat-exec-status-dot" :class="execState"></span>
          <span>{{ execStatus }}</span>
        </div>
        <div class="chat-exec-sections">
          <span v-for="s in SECTION_ORDER" :key="s" class="chat-exec-section-chip"
            :class="{ active: execSections.includes(s) }">
            {{ SECTION_LABELS[s] }}
          </span>
        </div>
        <div class="chat-exec-tools">
          <div v-for="t in execTools" :key="t.call_id" class="chat-exec-tool" :class="t.status">
            <span class="chat-exec-tool-dot"></span>
            <span class="chat-exec-tool-name">{{ toolDisplayName(t.tool) }}</span>
            <span class="chat-exec-tool-state">{{ t.status === 'running' ? '执行中…' : (t.status === 'done' ? '完成' : '失败') }}</span>
          </div>
        </div>
        <div v-if="!activeRun && execTools.length === 0" class="chat-exec-empty">
          提交问题后，Agent 将在此展示执行状态、工具调用与研判进度。
        </div>
      </div>
    </aside>

    <input ref="fileInput" type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.json,.csv,.xlsx"
      style="display:none" @change="handleFileChange" />

    <!-- Debug thinking panel -->
    <div v-if="debugThinkingVisible" class="chat-debug-panel">
      <div class="chat-debug-panel-header">
        <span>思考内容</span>
        <button class="chat-debug-panel-close" @click="debugThinkingVisible = false">&times;</button>
      </div>
      <div class="chat-debug-panel-body" ref="debugPanelBody">
        <pre>{{ debugThinking || '(等待思考内容...)' }}</pre>
      </div>
    </div>

    <!-- Debug eye toggle -->
    <el-tooltip content="思考内容" placement="left" effect="dark">
      <button class="chat-toggle-float-btn is-debug" :class="{ 'is-chat-active': debugThinkingVisible }"
        @click="debugThinkingVisible = !debugThinkingVisible">
        <el-icon :size="18"><View /></el-icon>
      </button>
    </el-tooltip>

    <!-- Main toggle -->
    <el-tooltip content="切换到主页面" placement="left" effect="dark">
      <button class="chat-toggle-float-btn is-chat-active" @click="goToMainPage">
        <el-icon :size="20"><Switch /></el-icon>
      </button>
    </el-tooltip>
  </div>
</template>

<script>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Switch, Cpu, Position, MagicStick, TrendCharts, Aim, DataAnalysis,
  Link, Document, View, ChatDotRound, List, Monitor
} from '@element-plus/icons-vue'
import { marked } from 'marked'
import ChatSidebar from './ChatSidebar.vue'
import logoUrl from '@/assets/images/logo.png'
import { useScenarioStore } from '@/stores/scenario'
import { useScnetScenarioStore } from '@/stores/scnet/useScenarioStore'

import { writeScnetPhase } from '@/constants/scnetPhase'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { unwrapApiData } from '@/utils/session'
import { getSessions, getSessionDetail, createSession, addChatMessage } from '@/api/scenarioSession'
import { startAgentChat, streamAgentTask, cancelAgentTask, getAgentModels, getAgentConversations, getAgentConversation, markConversationPdf } from '@/api/scnet/chatAgent'
import { detectScenario, SCENARIO_VALUES, SCENARIO_LABELS } from '@/constants/scnetScenario'

const SPINNER_GLYPHS = ['✽', '✢', '✦', '✧']

// K3-CHAT-1:事前研判建议问题(§72)
const SUGGEST_QUESTIONS = [
  '分析未来90天中国铀供应链风险',
  '当前最值得关注的供应路线是什么？',
  '结合最新OSINT进行研判',
  '如果哈萨克斯坦路线中断会怎样？',
  '生成当前事前态势研判方案',
]

// 三部分 section(§74)
const SECTION_ORDER = ['一', '二', '三']
const SECTION_LABELS = { 一: '① 事实梳理', 二: '② 风险评估', 三: '③ 应对策略' }

// 工具 → 展示名 / 执行状态文案(§67-68)
const TOOL_DISPLAY_NAMES = {
  skill: '加载研判技能',
  uranium_supply_overview: '供应概览',
  uranium_route_network: '路线网络',
  uranium_current_risk: '当前风险',
  uranium_osint_events: 'OSINT 事件',
  uranium_knowledge_search: '知识检索',
  uranium_scenario_analysis: '情景分析',
}
const TOOL_STATUS_TEXT = {
  skill: '正在制定分析计划',
  uranium_supply_overview: '正在筛选供应链数据',
  uranium_route_network: '正在读取供应路线',
  uranium_current_risk: '正在分析路线风险',
  uranium_osint_events: '正在读取最新 OSINT',
  uranium_knowledge_search: '正在检索知识库',
  uranium_scenario_analysis: '正在运行情景分析',
}

// K3-CHAT-2:三部分结果卡
const RESULT_CARDS = [
  { key: '一', label: '事实梳理' },
  { key: '二', label: '风险研判' },
  { key: '三', label: '策略方案' },
]

const MODE_OPTIONS = [
  { label: '智能识别', value: 'auto', icon: MagicStick },
  { label: '事前研判', value: 'pre', icon: TrendCharts },
  { label: '事中决策', value: 'during', icon: Aim },
  { label: '事后复盘', value: 'post', icon: DataAnalysis },
]
const PLACEHOLDERS = {
  auto: '描述您的情况，AI 将自动识别分析阶段...',
  pre: '描述您想研判的供应链态势...',
  during: '描述当前供应链危机或决策需求...',
  post: '描述需要复盘的事件...',
}
const EXEC_MODES = [
  { label: '问答模式', value: 'ask', icon: ChatDotRound, desc: '快速问答分析' },
  { label: '规划模式', value: 'plan', icon: List, desc: '先规划再执行' },
  { label: 'Agent模式', value: 'agent', icon: Monitor, desc: '多智能体协作执行' },
]
const CHAT_MODELS = [
  { label: 'Qwen-Turbo', value: 'qwen-turbo' },
  { label: 'Qwen-Plus', value: 'qwen-plus' },
  { label: 'Qwen-Max', value: 'qwen-max' },
]
const SCENARIO_OPTIONS = [
  { value: SCENARIO_VALUES.URANIUM, label: SCENARIO_LABELS.uranium },
  { value: SCENARIO_VALUES.SUPPLY_CHAIN, label: SCENARIO_LABELS.supply_chain },
]

export default {
  name: 'ChatHome',
  components: { ChatSidebar, Switch, Cpu, Position, MagicStick, TrendCharts, Aim, DataAnalysis, Link, Document, View, ChatDotRound, List, Monitor },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const scenarioStore = useScenarioStore()
    // 事中流程用的是 SCnet 场景建模 store（与全局的「铀/汽车」场景选择 store 不是同一个）
    const scnetScenarioStore = useScnetScenarioStore()
    const msgContainer = ref(null)
    const welcomeTextarea = ref(null)
    const chatTextarea = ref(null)
    const fileInput = ref(null)
    const debugPanelBody = ref(null)

    const messages = ref([])
    const inputText = ref('')
    const selectedModel = ref('qwen-turbo')
    const isStreaming = ref(false)
    const currentConversationId = ref('')
    const conversations = ref([])
    const sidebarCollapsed = ref(false)
    const currentMode = ref('auto')
    const execMode = ref('ask')
    const attachments = ref([])
    const debugThinkingVisible = ref(false)
    const debugThinking = ref('')
    const spinnerGlyphIdx = ref(0)
    let abortController = null
    let glyphTimer = null
    // K3-CHAT-1:Agent 执行面板状态
    const execPanelVisible = ref(false)
    const activeRun = ref(null) // {task_id, conversation_id, provider, model}
    const execTools = ref([]) // [{call_id, tool, status}]
    const execStatus = ref('')
    const execState = ref('idle') // idle | running | done | error
    const execSections = ref([])
    // K2-FLOW:分析完成状态(用于导出PDF/进入可视化)
    const analysisSuccess = ref(false)
    const lastAnalysisMsgId = ref('')
    const pdfGenerating = ref(false)
    const pdfReady = ref(false)
    let agentStream = null

    const pdfStateText = computed(() => {
      if (pdfGenerating.value) return '正在生成报告…'
      if (pdfReady.value) return 'PDF 已生成(再次点击下载)'
      return '导出 PDF'
    })

    const currentModelLabel = computed(() => { const m = CHAT_MODELS.find(o => o.value === selectedModel.value); return m ? m.label : 'Qwen-Turbo' })
    const spinnerGlyph = computed(() => SPINNER_GLYPHS[spinnerGlyphIdx.value] || '✽')
    const modeIndex = computed(() => ({ auto: 0, pre: 1, during: 2, post: 3 }[currentMode.value] || 0))
    const inputPlaceholder = computed(() => PLACEHOLDERS[currentMode.value] || PLACEHOLDERS.auto)
    const currentExecMode = computed(() => EXEC_MODES.find(m => m.value === execMode.value) || EXEC_MODES[0])

    const goToMainPage = () => router.push('/home')
    // 阶段与左侧菜单/流程步骤条共用 localStorage，选模式时同步写入，
    // 免得停在事前页却看到事中菜单（反之亦然）。
    const selectMode = (mode) => {
      currentMode.value = mode
      if (mode === 'pre' || mode === 'during' || mode === 'post') writeScnetPhase(mode)
    }
    const applyModeFromRoute = (mode) => {
      const next = String(mode || '').trim()
      if (['pre', 'during', 'post'].includes(next)) selectMode(next)
    }
    
    const selectScenario = (value) => { scenarioStore.setScenario(value) }
    const openKnowledge = () => router.push('/chatKnowledge')

    const handleModeGlassPointer = (event) => {
      const t = event.currentTarget; const r = t.getBoundingClientRect()
      t.style.setProperty('--glass-x', `${Math.max(0, Math.min(100, ((event.clientX - r.left) / r.width) * 100)).toFixed(1)}%`)
      t.style.setProperty('--glass-y', `${Math.max(0, Math.min(100, ((event.clientY - r.top) / r.height) * 100)).toFixed(1)}%`)
    }
    const resetModeGlassPointer = (e) => { e.currentTarget.style.setProperty('--glass-x', '18%'); e.currentTarget.style.setProperty('--glass-y', '0%') }

    const triggerFileInput = () => fileInput.value?.click()
    const handleFileChange = (e) => {
      const files = Array.from(e.target.files || [])
      for (const file of files) {
        const reader = new FileReader()
        reader.onload = (ev) => attachments.value.push({ name: file.name, type: file.type, size: file.size, data: ev.target.result, preview: file.type.startsWith('image/') ? ev.target.result : null })
        reader.readAsDataURL(file)
      }
      e.target.value = ''
    }
    const removeAttachment = (idx) => attachments.value.splice(idx, 1)

    const autoResizeWelcome = () => { const el = welcomeTextarea.value; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px' } }
    const autoResizeChat = () => { const el = chatTextarea.value; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px' } }
    const scrollToBottom = () => { nextTick(() => { const el = msgContainer.value; if (el) el.scrollTop = el.scrollHeight }) }

    // ── 历史会话列表加载(稳定化:失败不清空 + stale 请求防覆盖) ──
    // 语义: 成功(HTTP200,即使空[])才写 conversations;timeout/500/网络错误一律保留旧列表。
    const historyLoading = ref(false)
    const historyLoaded = ref(false)
    const historyError = ref(false)
    let historyRequestSeq = 0

    const fetchConversations = async () => {
      const requestId = ++historyRequestSeq
      const oldCount = conversations.value.length
      console.log(`[History Fetch Start] rid=${requestId} currentCount=${oldCount} t=${Date.now()}`)
      historyLoading.value = true
      try {
        // agent 会话是权威列表;失败即本次加载失败(不吞成 [])
        const agResp = await getAgentConversations().catch((err) => {
          console.warn(`[History] rid=${requestId} agent request FAIL`, err && err.message)
          throw err
        })
        if (requestId !== historyRequestSeq) {
          console.log(`[History Fetch Ignored Stale] rid=${requestId}`)
          return conversations.value
        }
        const agList = agResp?.data?.conversations || []
        // scenario sessions 仅兜底补充;失败不影响本次成功(仍以 agent 列表为准)
        let sessList = []
        try {
          const s = await getSessions()
          sessList = s?.data?.sessions || []
        } catch (err) {
          console.warn(`[History] rid=${requestId} sessions refresh FAIL(忽略,保留 agent 列表)`, err && err.message)
        }
        if (requestId !== historyRequestSeq) {
          console.log(`[History Fetch Ignored Stale] rid=${requestId}`)
          return conversations.value
        }
        const byId = {}
        ;(sessList || []).forEach(x => { byId[x.session_id] = { id: x.session_id, source: 'scenario', title: x.requirement_text || '新对话', created_at: x.timestamp, updated_at: x.timestamp } })
        ;(agList || []).forEach(x => { byId[x.conversation_id] = { id: x.conversation_id, source: 'agent', title: x.title || x.last_user_message || '新对话', created_at: x.created_at, updated_at: x.updated_at, message_count: x.message_count, latest_analysis_id: x.latest_analysis_id } })
        const next = Object.values(byId).sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''))
        console.log(`[History Fetch Success] rid=${requestId} serverCount=${next.length}`)
        console.log(`[History Mutation] fetch.assign ${oldCount} -> ${next.length} (rid=${requestId})`)
        conversations.value = next
        historyLoaded.value = true
        historyError.value = false
        return next
      } catch (err) {
        if (requestId !== historyRequestSeq) {
          console.log(`[History Fetch Ignored Stale] rid=${requestId}`)
          return conversations.value
        }
        // 失败:不清空。已加载过 → 保留旧列表;从未成功 → 置 error(侧栏显示加载失败,而非"暂无对话")
        console.log(`[History Fetch Failed] rid=${requestId} error=${(err && err.message) || String(err)}`)
        historyError.value = true
        console.log(`[History Mutation] fetch.keep-old ${oldCount} -> ${oldCount} (错误不覆盖 rid=${requestId})`)
        throw err
      } finally {
        if (requestId === historyRequestSeq) historyLoading.value = false
      }
    }
    // 保留既有追踪 watcher
    watch(conversations, (v, o) => {
      console.log(`[History watcher] count ${o && o.length} -> ${v && v.length} at=${Date.now()}`)
    }, { flush: 'sync' })
    // 本地 upsert 当前会话(发送后立即置顶/更新,不依赖网络;以 conversation_id 去重)
    const upsertLocalConversation = (convId, title) => {
      if (!convId) return
      const now = new Date().toISOString()
      const list = conversations.value.slice()
      const idx = list.findIndex(c => c.id === convId)
      const oldCount = list.length
      if (idx >= 0) {
        // 只合并更新,不覆盖服务器已有对象(source/服务端 id/created_at 保留)
        list[idx] = { ...list[idx], title: title || list[idx].title || '新对话', updated_at: now }
      } else {
        // 新会话刚 createSession → scenario 会话;agent doc 持久化后刷新会以真实对象替换
        list.unshift({ id: convId, source: 'scenario', title: title || '新对话', created_at: now, updated_at: now })
      }
      console.log(`[History Mutation] local-upsert ${oldCount} -> ${list.length} id=${convId}`)
      conversations.value = list
    }
    // 静默后台刷新(Agent 完成/阶段切换后调用):失败仅 warn,绝不把已有列表清空
    const refreshHistorySilently = () => {
      fetchConversations().catch(() => {
        // fetchConversations 内部已保留旧列表
      })
    }
    const retryHistory = () => refreshHistorySilently()
    const startNewConversation = () => {
      messages.value = []; currentConversationId.value = ''; inputText.value = ''; isStreaming.value = false
      attachments.value = []; debugThinking.value = ''
      execPanelVisible.value = false; activeRun.value = null
      execTools.value = []; execSections.value = []; execStatus.value = ''; execState.value = 'idle'
      analysisSuccess.value = false; lastAnalysisMsgId.value = ''; pdfReady.value = false
      persistActiveConv('')
      nextTick(() => welcomeTextarea.value?.focus())
    }
    const httpStatus = (e) => (e && (e.status || (e.response && e.response.status))) || 0
    const pushDetailMessage = (text) => { messages.value = []; messages.value.push({ id: 'err' + Date.now(), role: 'assistant', content: text }) }
    const renderScenarioMessages = (detail) => {
      const hist = detail?.chat_history || []
      const req = detail?.requirement
      const qRaw = typeof req === 'string' ? req : (req && (req.raw_input || req.goal))
      const qText = typeof qRaw === 'string' && qRaw.trim() ? qRaw.trim() : ''
      const ar = detail?.analysis_result
      const bodyText = (typeof ar === 'string' && ar.trim()) ? ar.trim() : ''
      if (hist.length) {
        messages.value = hist.map((m, i) => ({
          id: m.id || `h${i}`, role: m.type === 'user' ? 'user' : 'assistant', content: m.content || ''
        }))
      } else if (qText || bodyText) {
        const ms = []
        if (qText) ms.push({ id: 's-q-' + Date.now(), role: 'user', content: qText })
        ms.push({ id: 's-a-' + Date.now(), role: 'assistant',
                  content: bodyText || '（该历史会话为早期需求记录：仅保存了原始问题，恢复审计未发现当时保存的分析正文，未重新生成。）' })
        messages.value = ms
      } else {
        // 记录存在但无正文:诚实说明,绝不显示"已失效"
        messages.value = []
        messages.value.push({ id: 's-empty-' + Date.now(), role: 'assistant',
          content: '该历史会话记录为空：经审计未发现当时保存的分析正文（当时未生成或未落盘），未重新生成。' })
      }
      execState.value = 'done'; execStatus.value = '历史对话加载成功(scenario 会话)'
      scrollToBottom()
    }

    const loadConversation = async (convId) => {
      // K2-PERSIST:优先读 agent conversation doc(完整消息+结构化元数据),不重新执行 Agent;
      // 按列表条目 source 路由:agent→agent detail;scenario→scenario detail。仅后端 404/410 才提示"已失效"。
      currentConversationId.value = convId
      persistActiveConv(convId)
      execPanelVisible.value = true
      execState.value = 'done'; execStatus.value = '正在加载历史对话…'
      const entry = conversations.value.find(c => c.id === convId)
      const source = entry && entry.source
      const tryScenario = async () => {
        try {
          const sess = await getSessionDetail(convId)
          const detail = sess?.data
          if (detail && (detail.session_id || Array.isArray(detail.chat_history))) {
            renderScenarioMessages(detail)
            return true
          }
        } catch (e2) { /* 由调用方统一分类 */ }
        return false
      }
      // scenario 记录(仅存在 scenario session,无 agent doc)只走 scenario detail
      if (source === 'scenario') {
        const ok = await tryScenario()
        if (!ok) pushDetailMessage('该历史对话不存在或已失效。')
        return
      }
      // agent / 未知:agent detail 优先;404/410 时降级 scenario
      try {
        const d = await getAgentConversation(convId)
        const doc = d?.data
        if (doc && Array.isArray(doc.messages) && doc.messages.length) {
          const msgs = doc.messages.map(m => {
            const isUser = m.role === 'user'
            const isJudgment = !isUser && m.message_type === 'judgment'
            return {
              id: m.message_id || 'h' + Math.random(),
              role: isUser ? 'user' : 'assistant',
              content: m.content || '',
              _streaming: false,
              _meta: { message_type: m.message_type, analysis_id: m.analysis_id,
                       snapshot_id: m.snapshot_id, sections: m.sections || [],
                       tools: m.tools || [], pdf_status: m.pdf_status || 'none' },
            }
          })
          messages.value = msgs
          // 恢复最近研判状态(分析完成/PDF/可视化入口)
          const lastJ = [...msgs].reverse().find(m => m.role === 'assistant' && m._meta && m._meta.message_type === 'judgment')
          if (lastJ && lastJ.content) {
            analysisSuccess.value = true
            lastAnalysisMsgId.value = lastJ.id
            execState.value = 'done'; execStatus.value = '研判完成(历史)'
            execSections.value = (lastJ._meta.sections || [])
            pdfReady.value = (lastJ._meta.pdf_status === 'ready')
            execPanelVisible.value = true
          }
          scrollToBottom()
          return
        }
        // agent doc 存在但空(异常)或旧 scenario session
        const ok = await tryScenario()
        if (!ok) pushDetailMessage('该历史对话不存在或已失效。')
      } catch (e) {
        const code = httpStatus(e)
        if (code === 404 || code === 410) {
          const ok = await tryScenario()
          if (!ok) pushDetailMessage('该历史对话不存在或已失效。')
        } else {
          // timeout/5xx/网络错误 = 加载失败,不清空旧状态、不判失效,允许再次点击重试
          console.warn('[History] 详情加载失败(非404),可重试 code=' + code, e && e.message)
          pushDetailMessage('历史对话加载失败,请稍后重试。')
        }
      }
    }
    // K2-PERSIST:持久化当前会话 id(localStorage),供跨页/刷新恢复
    const ACTIVE_CONV_KEY = 'scnet_active_conversation_id'
    const persistActiveConv = (id) => { try { localStorage.setItem(ACTIVE_CONV_KEY, id || '') } catch (_) {} }
    // 后端没有删除/重命名会话的接口，这里只动本地列表（刷新后回到后端的真实列表）
    const handleDeleteConversation = async (convId) => {
      conversations.value = conversations.value.filter(c => c.id !== convId)
      if (currentConversationId.value === convId) startNewConversation()
    }
    const handleBatchDelete = async (ids) => { for (const id of ids) await handleDeleteConversation(id) }
    const handleRenameConversation = async ({ id, title }) => {
      const conv = conversations.value.find(c => c.id === id)
      if (conv) conv.title = title
    }

    // 事中：把问题当作本次推演的需求，建会话 + 写入 SCnet 场景 store，
    // 然后直接落到「想定生成分析」页（?fresh=1 会在该页发起首轮需求判断与目标拆解）。
    // 汽车场景的想定生成是 5 步向导，另有自己的 store，这里只把问题带过去预填。
    const enterDuringFlow = async (sid, text, scenario) => {
      writeScnetPhase('during')
      scnetScenarioStore.commitStepResult('goal-input', {
        sessionId: sid,
        userGoal: text,
        requirementMeta: {
          analysis_phase: 'during',
          raw_input: text,
          model_name: selectedModel.value || 'qwen-turbo',
          is_legal: false
        }
      })
      if (scenario === 'uranium') {
        return router.push({ path: SCNET_ROUTES.scenarioAnalysis, query: { scenario, fresh: '1' } })
      }
      // 汽车想定生成仍是原来的 5 步向导（另一套 store / 旧接口），这里只把问题带过去预填
      return router.push({ path: SCNET_ROUTES.scenarioModeling, query: { scenario, q: text } })
    }

    // 事前 / 事后 / 智能识别：沿用原有入口，带着问题跳到态势分析。
    const enterSituationAnalysis = (sid, text, scenario) => {
      writeScnetPhase(currentMode.value === 'post' ? 'post' : 'pre')
      return router.push({
        path: SCNET_ROUTES.situationAnalysis,
        query: { session_id: sid, scenario, message: text }
      })
    }

    // 建议问题点击:填入输入框并发送
    const useSuggestion = (s) => { inputText.value = s; nextTick(() => handleSend()) }

    const handleSend = async () => {
      const text = inputText.value.trim()
      // 自动识别场景（铀 / 汽车），仅当检测到明确关键词时切换
      const detected = detectScenario(text)
      if (detected) scenarioStore.setScenario(detected)
      // 保存用户问题，供报告生成等页面使用
      if (text) scenarioStore.setLastUserMessage(text)
      if ((!text && attachments.value.length === 0) || isStreaming.value) return

      // K3-CHAT-1:事前/智能识别/事后不再跳需求分析页,在对话首页内 Agent 研判。
      // 事中(during)流程保持兼容,仍走原想定生成页。
      const isDuring = currentMode.value === 'during'
      const fileInfo = attachments.value.length > 0 ? '\n[附件: ' + attachments.value.map(a => a.name).join(', ') + ']' : ''
      inputText.value = ''; attachments.value = []
      messages.value.push({ id: 'u' + Date.now(), role: 'user', content: text + fileInfo })
      messages.value.push({
        id: 'a' + Date.now(),
        role: 'assistant',
        content: '',
        _streaming: true
      })
      isStreaming.value = true
      scrollToBottom()
      glyphTimer = setInterval(() => { spinnerGlyphIdx.value = (spinnerGlyphIdx.value + 1) % SPINNER_GLYPHS.length }, 180)
      try {
        let sid = currentConversationId.value
        if (sid) {
          // 复用已打开的历史会话，把这条追问补进会话记录
          await addChatMessage(sid, { type: 'user', content: text })
        } else {
          const d = await createSession(text)
          sid = unwrapApiData(d)?.session_id || ''
          if (!sid) throw new Error('后端未返回 session_id')
          currentConversationId.value = sid
          persistActiveConv(sid)
        }
        const sc = scenarioStore.currentScenario || 'uranium'
        // 本地 upsert:发送后当前会话立即置顶(不阻塞、不依赖历史 API),避免启动瞬间全量拉取挂起
        upsertLocalConversation(sid, text.slice(0, 40))
        if (isDuring) {
          await enterDuringFlow(sid, text, sc)
        } else {
          // 不跳页:在本对话页内运行 Agent 事前研判
          await runAgentChat(text, sid)
        }
      } catch (e) {
        messages.value.pop()
        messages.value.push({ id: 'a' + Date.now(), role: 'assistant', content: `会话创建失败：${e.message}` })
        execState.value = 'error'; execStatus.value = '会话创建失败'
      }
      clearInterval(glyphTimer)
      isStreaming.value = false
      scrollToBottom()
    }

    // ── K3-CHAT-1:对话首页 Agent 事前研判 ──────
    const runAgentChat = async (text, sid) => {
      execPanelVisible.value = true
      execTools.value = []; execSections.value = []
      execState.value = 'running'; execStatus.value = '正在启动 Agent 任务…'
      analysisSuccess.value = false; lastAnalysisMsgId.value = ''; pdfReady.value = false
      const lastMsg = messages.value[messages.value.length - 1]
      try {
        const res = await startAgentChat({
          message: text,
          conversationId: sid,
          modelId: selectedModel.value,
          mode: 'agent',
          phase: 'pre',
        })
        const data = unwrapApiData(res) || res?.data || res || {}
        const taskId = data?.task_id
        if (!taskId) throw new Error(data?.message || 'Agent 任务启动失败')
        activeRun.value = {
          task_id: taskId,
          conversation_id: data.conversation_id || sid,
          provider: data.provider,
          model: data.model,
        }
        execStatus.value = 'Agent 任务已启动,正在理解研判目标…'
        const stream = streamAgentTask({
          taskId,
          afterSeq: 0,
          onEvent: (ev) => handleAgentEvent(ev, lastMsg),
          onError: (err) => { handleAgentEvent({ type: 'error', message: (err && err.message) || String(err) }, lastMsg) },
        })
        agentStream = stream
      } catch (e) {
        execState.value = 'error'; execStatus.value = 'Agent 启动失败'
        if (lastMsg) lastMsg.content = `❌ Agent 任务启动失败：${e.message}`
      }
    }

    const handleAgentEvent = (ev, lastMsg) => {
      const type = ev.type
      if (type === 'status') {
        execStatus.value = ev.status || execStatus.value
      } else if (type === 'tool_call') {
        execTools.value.push({ call_id: ev.call_id, tool: ev.tool, status: 'running' })
        execStatus.value = ev.tool === 'skill'
          ? '正在制定分析计划…'
          : (TOOL_STATUS_TEXT[ev.tool] || `正在调用 ${toolDisplayName(ev.tool)}`)
      } else if (type === 'tool_result') {
        const t = execTools.value.find(x => x.call_id === ev.call_id)
        if (t) t.status = 'done'
      } else if (type === 'text_delta') {
        if (lastMsg) { lastMsg.content += ev.content; scrollToBottom() }
      } else if (type === 'section') {
        if (!execSections.value.includes(ev.section)) {
          execSections.value.push(ev.section)
          if (execSections.value.length >= 3) execStatus.value = '研判方案已生成'
        }
      } else if (type === 'phase') {
        if (ev.phase === 'output') execStatus.value = '正在生成研判方案…'
      } else if (type === 'done') {
        execState.value = 'done'; execStatus.value = '研判完成'
      } else if (type === 'complete') {
        execState.value = 'done'; execStatus.value = '研判完成'
        if (agentStream) { try { agentStream.close() } catch {} ; agentStream = null }
        isStreaming.value = false
        if (lastMsg) lastMsg._streaming = false
        // K2-FLOW:分析成功 → 展示导出PDF + 进入可视化
        if (lastMsg && lastMsg.content) {
          analysisSuccess.value = true
          lastAnalysisMsgId.value = lastMsg.id
        }
        // Agent 完成:后台同步真实列表(title/updated_at/新会话);失败不影响当前列表
        setTimeout(() => { refreshHistorySilently() }, 600)
      } else if (type === 'cancelled') {
        execState.value = 'done'; execStatus.value = '已取消'
        analysisSuccess.value = false
        if (lastMsg) lastMsg._streaming = false
      } else if (type === 'error') {
        execState.value = 'error'; execStatus.value = ev.message || '执行出错'
        analysisSuccess.value = false
        if (lastMsg && !lastMsg.content) lastMsg.content = `❌ ${ev.message || 'Agent 执行出错'}`
      }
    }

    // ── K2-FLOW:导出PDF(复用 html2pdf,从当前研判内容生成,不跳旧报告页) ──
    const exportPdf = async () => {
      if (pdfGenerating.value) return
      const msg = messages.value.find(m => m.id === lastAnalysisMsgId.value)
      if (!msg || !msg.content) return
      const userMsg = messages.value.filter(m => m.role === 'user')
      const question = userMsg.length ? userMsg[userMsg.length - 1].content.replace(/^\[附件.*$/, '') : ''
      pdfGenerating.value = true
      try {
        const { default: html2pdf } = await import('html2pdf.js')
        // 纯 DOM 构建,外部文本一律 textContent(不解析 HTML,防注入)
        const now = new Date().toLocaleString('zh-CN', { hour12: false })
        const safeQ = String(question || '').slice(0, 200)
        const wrap = document.createElement('div')
        wrap.style.cssText = "font-family:'PingFang SC','Microsoft YaHei',sans-serif;padding:28px;color:#111;position:absolute;left:-9999px;top:0;width:760px;"
        const h = document.createElement('h2'); h.textContent = '中国铀供应链 · 智能态势研判报告'
        h.style.cssText = 'text-align:center;margin:0 0 8px;'
        const meta = document.createElement('p'); meta.textContent = '用户问题：' + safeQ
        meta.style.cssText = 'text-align:center;color:#555;font-size:12px;margin:2px 0;'
        const meta2 = document.createElement('p'); meta2.textContent = '生成时间：' + now
        meta2.style.cssText = 'text-align:center;color:#555;font-size:12px;margin:2px 0;'
        const hr = document.createElement('hr')
        const body = document.createElement('div')
        body.textContent = msg.content
        body.style.cssText = 'white-space:pre-wrap;font-size:13px;line-height:1.7;margin:12px 0;'
        const foot = document.createElement('p')
        foot.textContent = '数据与模型来源：供应链快照 / OSINT / 知识库 / 风险模型。本报告由 AI 生成，仅供研究参考，不构成决策建议。'
        foot.style.cssText = 'color:#777;font-size:11px;margin-top:16px;'
        wrap.appendChild(h); wrap.appendChild(meta); wrap.appendChild(meta2)
        wrap.appendChild(hr); wrap.appendChild(body); wrap.appendChild(foot)
        document.body.appendChild(wrap)
        await html2pdf().set({
          margin: 12, filename: '铀供应链研判_' + Date.now() + '.pdf',
          image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        }).from(wrap).save()
        wrap.remove()
        pdfReady.value = true
        if (currentConversationId.value) { try { await markConversationPdf(currentConversationId.value) } catch (_) {} }
      } catch (e) {
        console.warn('导出PDF失败:', e)
        try { ElMessage({ type: 'error', message: '报告生成失败，请重试' }) } catch (_) {}
      } finally {
        pdfGenerating.value = false
      }
    }

    // ── K2-FLOW:进入可视化 → 态势研判(真实路由 /home/SCnet/situationJudge) ──
    const goVisualization = () => {
      const query = { from_chat: '1' }
      if (activeRun.value && activeRun.value.conversation_id) {
        query.session_id = activeRun.value.conversation_id
      }
      router.push({ path: '/home/SCnet/situationJudge', query })
    }

    const toolDisplayName = (t) => TOOL_DISPLAY_NAMES[t] || t
    const isSectionDone = (k) => execSections.value.includes(k)

    const abortStream = () => {
      if (agentStream) { try { agentStream.close() } catch {} ; agentStream = null }
      if (activeRun.value?.task_id) { cancelAgentTask(activeRun.value.task_id).catch(() => {}) }
      clearInterval(glyphTimer); isStreaming.value = false
      execState.value = 'done'; execStatus.value = '已中止'
    }

    const renderMarkdown = (c) => { if (!c) return ''; try { return marked.parse(c, { breaks: true }) } catch { return c } }

    const restoreConversation = async () => {
      // K2-PERSIST:URL query(conversation_id/session_id)优先,其次 localStorage active
      const q = route.query?.conversation_id || route.query?.session_id
      let key = q ? String(q) : ''
      if (!key) { try { key = localStorage.getItem('scnet_active_conversation_id') || '' } catch (_) {} }
      if (key) { await loadConversation(key); return true }
      return false
    }
    onMounted(async () => {
      fetchConversations()
      applyModeFromRoute(route.query?.mode)
      // 模式入口(事中)不自动恢复历史,避免覆盖 ?mode=during 流程
      if (!route.query?.mode) { await restoreConversation() }
      nextTick(() => { if (messages.value.length === 0) welcomeTextarea.value?.focus() })
    })
    watch(() => route.query?.conversation_id, (v) => { if (v) loadConversation(String(v)) })
    watch(() => route.query?.mode, (mode) => applyModeFromRoute(mode))
    onUnmounted(() => { if (abortController) abortController.abort(); if (agentStream) { try { agentStream.close() } catch {} } clearInterval(glyphTimer) })
    // DEV-only 调试句柄:供回归验证(竞态/迟到失败)驱动 refresh 并读取 count
    if (import.meta.env.DEV) {
      window.__chatHistoryDebug = {
        count: () => conversations.value.length,
        refresh: () => fetchConversations().catch(() => {}),
        upsert: (id, title) => upsertLocalConversation(id, title),
      }
    }

    return {
      scenarioStore,
      logoUrl, msgContainer, welcomeTextarea, chatTextarea, fileInput, debugPanelBody,
      messages, inputText, selectedModel, isStreaming, currentConversationId, conversations,
      historyLoading, historyError, historyLoaded, retryHistory,
      sidebarCollapsed, currentMode, modeIndex, execMode, attachments,
      debugThinking, debugThinkingVisible, spinnerGlyph,
      currentModelLabel, currentExecMode, inputPlaceholder,
      modeOptions: MODE_OPTIONS, chatModels: CHAT_MODELS, EXEC_MODES,
      scenarioOptions: SCENARIO_OPTIONS, SUGGEST_QUESTIONS,
      execPanelVisible, activeRun, execTools, execStatus, execState, execSections,
      analysisSuccess, lastAnalysisMsgId, pdfGenerating, pdfReady, pdfStateText,
      SECTION_ORDER, SECTION_LABELS, RESULT_CARDS,
      toolDisplayName, isSectionDone, useSuggestion,
      exportPdf, goVisualization,
      goToMainPage, selectMode, selectScenario, openKnowledge,
      handleModeGlassPointer, resetModeGlassPointer,
      triggerFileInput, handleFileChange, removeAttachment,
      handleSend, abortStream, autoResizeWelcome, autoResizeChat,
      startNewConversation, loadConversation,
      handleDeleteConversation, handleBatchDelete, handleRenameConversation,
      renderMarkdown,
    }
  },
}
</script>

<style scoped>
/* ── Shell ─────────────────────────────────── */
.chat-shell { position: relative; display: flex; width: 100%; height: 100vh; background: #ffffff; overflow: hidden; }
.chat-main { display: flex; flex-direction: column; height: 100vh; min-width: 0; transition: margin-left 0.3s ease, margin-right 0.3s ease; }
.chat-main-expand { margin-left: 260px; width: calc(100vw - 260px); }
.chat-main-shrink { margin-left: 64px; width: calc(100vw - 64px); }
.chat-main-expand.has-exec { margin-right: 320px; width: calc(100vw - 260px - 320px); }
.chat-main-shrink.has-exec { margin-right: 320px; width: calc(100vw - 64px - 320px); }

/* ── Welcome ───────────────────────────────── */
.chat-welcome-wrap {
  flex: 1; display: flex; align-items: center; justify-content: center;
  min-height: 0; position: relative; overflow: hidden; isolation: isolate;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}
.chat-welcome-wrap::before {
  content: ''; position: absolute; left: 50%; top: 52%; z-index: -1; pointer-events: none;
  transform: translate(-50%, -45%); width: 112%; max-width: 920px; height: 56%;
  max-height: 340px; border-radius: 9999px;
  background: radial-gradient(ellipse 100% 100% at center 8%, #fdfcfc 0, #9dd2ff 50%);
  filter: blur(125px); animation: glowSpread 1s cubic-bezier(0.2, 0, 0, 1) both;
}
@keyframes glowSpread { 0% { opacity: 0; transform: translate(-50%, -45%) scale(0); } 100% { opacity: 1; transform: translate(-50%, -45%) scale(1); } }

.chat-welcome { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 840px; margin: auto; padding: 0 32px 64px; position: relative; z-index: 1; }
.chat-welcome-brand { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.chat-welcome-logo { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; }
.chat-welcome-text { color: #111827; font-size: 24px; font-weight: 600; line-height: 1.3; }
.chat-welcome-hint { margin: 12px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center; }
.chat-welcome-hint b { color: #4f46e5; }

/* 场景指示器 */
.chat-scenario-row {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 10px;
}
.chat-scenario-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 14px;
  border-radius: 20px; font-size: 13px; font-weight: 500;
  cursor: default; user-select: none;
}
.chat-scenario-badge.is-uranium { background: #eef2ff; color: #4f46e5; }
.chat-scenario-badge.is-auto { background: #ecfdf5; color: #059669; }
.chat-scenario-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.is-uranium .chat-scenario-dot { background: #6366f1; }
.is-auto .chat-scenario-dot { background: #10b981; }

.chat-scenario-switch-btn {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 10px; border: 1px solid #e5e7eb; border-radius: 20px;
  background: #fff; color: #6b7280; font-size: 12px; cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.chat-scenario-switch-btn:hover { border-color: #93c5fd; color: #2563eb; }
.chat-scenario-menu { display: flex; flex-direction: column; gap: 2px; }
.chat-scenario-item { width: 100%; padding: 8px 10px; border: none; border-radius: 6px; background: none; cursor: pointer; text-align: left; font-size: 13px; color: #4b5563; }
.chat-scenario-item:hover { background: #f3f4f6; }
.chat-scenario-item.active { background: #eef2ff; color: #4f46e5; font-weight: 600; }

.chat-welcome-input { width: 100%; }

/* ── 建议问题 ─────────────────────────────── */
.chat-welcome-suggests { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 16px; }
.chat-suggest-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border: 1px solid #e5e7eb; border-radius: 999px;
  background: #f9fafb; color: #4b5563; font-size: 12.5px; cursor: pointer;
  transition: all 0.15s;
}
.chat-suggest-btn:hover { border-color: #93c5fd; color: #2563eb; background: #eff6ff; }

/* ── Mode Selector ─────────────────────────── */
.chat-mode-wrap { display: flex; align-items: center; justify-content: center; margin: 6px 0 38px; }
.chat-mode-selector {
  --chat-mode-gap: 4px; --glass-x: 18%; --glass-y: 0%;
  position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--chat-mode-gap); padding: 3px; border-radius: 999px; overflow: hidden; isolation: isolate;
  background: linear-gradient(135deg, rgba(255,255,255,0.56) 0%, rgba(231,243,255,0.28) 52%, rgba(167,213,251,0.12) 100%), rgba(246,251,255,0.42);
  border: 1px solid rgba(104,159,222,0.24);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.86), inset 0 -7px 18px rgba(72,139,216,0.04), 0 0 0 1px rgba(255,255,255,0.3), 0 10px 30px rgba(46,93,168,0.09);
  backdrop-filter: blur(16px) saturate(1.28) contrast(1.03);
}
.chat-mode-selector::before {
  content: ''; position: absolute; inset: 0; z-index: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 48%),
    linear-gradient(100deg, rgba(255,255,255,0) 8%, rgba(255,255,255,0.2) 42%, rgba(255,255,255,0) 70%);
  opacity: 0.78; mix-blend-mode: screen;
}
.chat-mode-selector::after {
  content: ''; position: absolute; inset: 1px; z-index: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 16%, rgba(57,121,197,0.02) 84%, rgba(255,255,255,0.18) 100%),
    radial-gradient(140% 120% at 50% 128%, rgba(58,147,232,0.045) 0%, rgba(58,147,232,0.01) 58%, rgba(58,147,232,0) 78%);
  box-shadow: inset 1px 0 1px rgba(255,255,255,0.38), inset -1px 0 1px rgba(45,90,148,0.08), inset 0 -1px 1px rgba(45,96,160,0.045);
}
.chat-mode-slider {
  position: absolute; z-index: 1; top: 3px; left: 3px;
  width: calc((100% - 3 * var(--chat-mode-gap) - 6px) / 4); height: calc(100% - 6px);
  border-radius: 999px; overflow: hidden;
  background: linear-gradient(135deg, rgba(255,255,255,0.62) 0%, rgba(226,240,253,0.24) 48%, rgba(132,195,248,0.13) 100%),
    linear-gradient(180deg, rgba(252,254,255,0.22) 0%, rgba(149,203,249,0.08) 100%);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -7px 16px rgba(54,116,190,0.075),
    inset 0 0 0 1px rgba(255,255,255,0.32), 0 0 0 1px rgba(90,151,218,0.22),
    0 8px 18px rgba(40,95,166,0.12), 0 1px 3px rgba(20,36,64,0.07);
  backdrop-filter: blur(18px) saturate(1.55) contrast(1.05);
  transition: transform 0.44s cubic-bezier(0.2, 0.85, 0.22, 1.12), box-shadow 0.28s ease, background 0.28s ease;
}
.chat-mode-slider::before {
  content: ''; position: absolute; inset: 0; z-index: 1; border-radius: inherit; pointer-events: none;
  background: radial-gradient(95% 85% at var(--glass-x) var(--glass-y), rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.28) 34%, rgba(255,255,255,0) 66%),
    linear-gradient(105deg, rgba(255,255,255,0) 8%, rgba(255,255,255,0.34) 42%, rgba(255,255,255,0) 68%),
    linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0) 48%);
  mix-blend-mode: screen; opacity: 0.74; animation: liquidSheen 4.8s cubic-bezier(0.2,0,0,1) infinite;
}
@keyframes liquidSheen {
  0% { opacity: 0.5; transform: translateX(-32%) skewX(-10deg); }
  45% { opacity: 0.78; transform: translateX(4%) skewX(-6deg); }
  100% { opacity: 0.5; transform: translateX(32%) skewX(-10deg); }
}
.chat-mode-slider.pos-0 { transform: translateX(0); }
.chat-mode-slider.pos-1 { transform: translateX(calc(100% + var(--chat-mode-gap))); }
.chat-mode-slider.pos-2 { transform: translateX(calc(200% + 2 * var(--chat-mode-gap))); }
.chat-mode-slider.pos-3 { transform: translateX(calc(300% + 3 * var(--chat-mode-gap))); }

.chat-mode-option {
  position: relative; z-index: 2; display: flex; align-items: center; justify-content: center;
  gap: 8px; min-width: 100px; padding: 12px 16px; border: none; border-radius: 999px;
  background: transparent; color: #4b5563; font-size: 15px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: color 0.2s ease;
}
.chat-mode-option.active { color: #4d6beb; font-weight: 600; }
.chat-mode-option:hover:not(.active) { color: #111827; }

/* ── Messages ──────────────────────────────── */
.chat-messages { flex: 1; min-height: 0; overflow-y: auto; }
.chat-messages::-webkit-scrollbar { width: 6px; }
.chat-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.chat-messages-inner { max-width: 840px; margin: 0 auto; padding: 8px 32px 28px; display: flex; flex-direction: column; gap: 1rem; }
.chat-msg { display: flex; gap: 0.6rem; }
.chat-msg.user { flex-direction: row-reverse; }
.chat-msg-avatar { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; background: #f3f4f6; color: #6b7280; overflow: hidden; }
.chat-msg-avatar img { width: 100%; height: 100%; object-fit: cover; }
.chat-msg-avatar.user { background: #dbeafe; color: #2563eb; }
.chat-msg-body { max-width: 72%; min-width: 0; }
/* K2-FLOW:导出PDF */
.chat-analysis-actions { margin-top: 8px; display: flex; }
.chat-pdf-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 14px; border: 1px solid #c7d2fe; border-radius: 8px;
  background: #eef2ff; color: #4f46e5; font-size: 12.5px; font-weight: 600;
  cursor: pointer; transition: all 0.18s;
}
.chat-pdf-btn:hover:not(:disabled) { border-color: #4f46e5; background: #e0e7ff; }
.chat-pdf-btn:disabled { opacity: 0.55; cursor: not-allowed; }
/* K2-FLOW:进入可视化(消息区右下,不覆盖内容) */
.chat-visualize-zone { display: flex; justify-content: flex-end; padding: 10px 32px 0; }
.chat-visualize-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border: none; border-radius: 999px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 14px rgba(79,70,229,0.28); transition: all 0.2s;
}
.chat-visualize-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,70,229,0.36); }
.chat-visualize-arrow { font-size: 15px; }
.chat-result-cards { display: flex; gap: 6px; margin-bottom: 8px; }
.chat-result-card {
  flex: 1; display: flex; align-items: center; gap: 5px;
  padding: 5px 8px; border: 1px solid #e5e7eb; border-radius: 8px;
  background: #f9fafb; color: #9ca3af; font-size: 12px; font-weight: 500;
  transition: all 0.25s;
}
.chat-result-card-num { font-weight: 700; }
.chat-result-card-label { flex: 1; white-space: nowrap; }
.chat-result-card-check { font-size: 13px; }
.chat-result-card.active { border-color: #c7d2fe; background: #eef2ff; color: #4f46e5; }
.chat-msg-bubble { padding: 0.65rem 1rem; border-radius: 12px; font-size: 0.9rem; line-height: 1.6; word-break: break-word; }
.chat-msg.user .chat-msg-bubble { background: #2563eb; color: #fff; border-bottom-right-radius: 4px; }
.chat-msg.assistant .chat-msg-bubble { background: #f9fafb; color: #111827; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; }
.chat-msg-bubble :deep(p) { margin: 0 0 0.5rem; }
.chat-msg-bubble :deep(p:last-child) { margin-bottom: 0; }
.chat-msg-bubble :deep(pre) { background: #1e293b; color: #e2e8f0; padding: 0.8rem 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.82rem; }
.chat-msg-bubble :deep(ul), .chat-msg-bubble :deep(ol) { padding-left: 1.2rem; margin: 0.3rem 0; }
.chat-disclaimer { font-size: 0.7rem; color: #9ca3af; margin-top: 0.25rem; padding-left: 0.2rem; }
.chat-spinner { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; color: #6b7280; font-size: 0.85rem; }
.chat-spinner-glyph { font-size: 1.1rem; color: #6366f1; }

/* ── Input ─────────────────────────────────── */
.chat-input-area { flex-shrink: 0; padding: 0 32px 24px; }
.chat-input-wrapper { width: 100%; max-width: 840px; margin: 0 auto; }
.chat-input-box { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 0.5rem 0.8rem; transition: border-color 0.2s; }
.chat-input-box:focus-within { border-color: #818cf8; }
.chat-file-previews { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.chat-file-preview { position: relative; width: 56px; height: 56px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; flex-shrink: 0; }
.chat-file-preview img { width: 100%; height: 100%; object-fit: cover; }
.chat-file-preview-doc { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f9fafb; font-size: 10px; color: #6b7280; }
.chat-file-preview-remove { position: absolute; top: -2px; right: -2px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #ef4444; color: #fff; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }
.chat-composer-body { margin-bottom: 0.3rem; }
.chat-input-textarea { width: 100%; border: none; outline: none; font-size: 0.9rem; color: #111827; resize: none; font-family: inherit; line-height: 1.5; background: transparent; }
.chat-input-textarea::placeholder { color: #9ca3af; }
.chat-input-textarea:disabled { opacity: 0.5; }
.chat-composer-footer { display: flex; align-items: center; justify-content: space-between; }
.chat-composer-tools { display: flex; align-items: center; gap: 6px; }
.chat-composer-actions { display: flex; align-items: center; }

.chat-composer-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; color: #6b7280; cursor: pointer; transition: all 0.15s; }
.chat-composer-icon-btn:hover { border-color: #93c5fd; color: #2563eb; }
.chat-composer-tag-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; color: #4b5563; font-size: 12px; cursor: pointer; transition: border-color 0.2s; }
.chat-composer-tag-btn:hover:not(:disabled) { border-color: #93c5fd; }
.chat-composer-tag-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.chat-selector-menu { display: flex; flex-direction: column; gap: 2px; }
.chat-selector-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; border: none; border-radius: 6px; background: none; cursor: pointer; font-size: 13px; color: #374151; }
.chat-selector-item:hover { background: #f3f4f6; }
.chat-selector-item.active { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.chat-selector-item-text { display: flex; flex-direction: column; gap: 1px; }
.chat-selector-item-label { font-size: 13px; }
.chat-selector-item-desc { font-size: 11px; color: #9ca3af; }
.chat-model-menu { display: flex; flex-direction: column; gap: 2px; }
.chat-model-item { width: 100%; padding: 8px 10px; border: none; border-radius: 6px; background: none; cursor: pointer; text-align: left; font-size: 13px; color: #4b5563; }
.chat-model-item:hover { background: #f3f4f6; }
.chat-model-item.active { background: #eef2ff; color: #4f46e5; font-weight: 600; }

.chat-send-btn { width: 34px; height: 34px; border: none; border-radius: 10px; background: #2563eb; color: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; }
.chat-send-btn:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
.chat-send-btn:disabled { background: #d1d5db; cursor: not-allowed; }
.chat-stop-btn { width: 34px; height: 34px; border: 2px solid #ef4444; border-radius: 10px; background: #fff; cursor: pointer; position: relative; }
.chat-stop-btn::after { content: ''; position: absolute; inset: 6px; background: #ef4444; border-radius: 3px; }

/* ── Agent 执行面板 ───────────────────────── */
.chat-exec-panel {
  position: fixed; right: 0; top: 0; bottom: 0; width: 320px; z-index: 4000;
  background: #fafbfc; border-left: 1px solid #e5e7eb;
  display: flex; flex-direction: column;
  box-shadow: -4px 0 24px rgba(0,0,0,0.06);
}
.chat-exec-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid #e5e7eb; background: #fff;
}
.chat-exec-title { font-weight: 600; font-size: 14px; color: #111827; }
.chat-exec-close { background: none; border: none; font-size: 20px; color: #9ca3af; cursor: pointer; line-height: 1; }
.chat-exec-close:hover { color: #374151; }
.chat-exec-body { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 14px; }
.chat-exec-model { display: flex; align-items: center; gap: 8px; }
.chat-exec-model-provider {
  padding: 2px 8px; border-radius: 6px; background: #eef2ff; color: #4f46e5;
  font-size: 12px; font-weight: 600;
}
.chat-exec-model-name { font-size: 13px; color: #4b5563; }
.chat-exec-status { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; }
.chat-exec-status-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.chat-exec-status-dot.running { background: #f59e0b; animation: execPulse 1s ease-in-out infinite; }
.chat-exec-status-dot.done { background: #10b981; }
.chat-exec-status-dot.error { background: #ef4444; }
.chat-exec-status-dot.idle { background: #d1d5db; }
@keyframes execPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
.chat-exec-sections { display: flex; gap: 6px; }
.chat-exec-section-chip {
  flex: 1; text-align: center; padding: 5px 4px; border-radius: 8px;
  background: #f3f4f6; color: #9ca3af; font-size: 12px; font-weight: 500;
  transition: all 0.25s;
}
.chat-exec-section-chip.active { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.chat-exec-tools { display: flex; flex-direction: column; gap: 6px; }
.chat-exec-tool {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 8px;
  background: #fff; font-size: 12.5px; color: #374151;
}
.chat-exec-tool-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: #d1d5db; }
.chat-exec-tool.running .chat-exec-tool-dot { background: #f59e0b; animation: execPulse 1s ease-in-out infinite; }
.chat-exec-tool.done .chat-exec-tool-dot { background: #10b981; }
.chat-exec-tool-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-exec-tool-state { font-size: 11.5px; color: #9ca3af; flex-shrink: 0; }
.chat-exec-tool.running .chat-exec-tool-state { color: #d97706; }
.chat-exec-tool.done .chat-exec-tool-state { color: #059669; }
.chat-exec-empty { font-size: 12.5px; color: #9ca3af; line-height: 1.6; padding: 8px 2px; }

/* ── Debug Panel ───────────────────────────── */
.chat-debug-panel {
  position: fixed; right: 0; top: 0; bottom: 0; width: 380px; z-index: 5000;
  background: #fff; border-left: 1px solid #e5e7eb; display: flex; flex-direction: column;
  box-shadow: -4px 0 24px rgba(0,0,0,0.08); animation: slideIn 0.25s ease-out;
}
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
.chat-debug-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 14px; }
.chat-debug-panel-close { background: none; border: none; font-size: 20px; color: #6b7280; cursor: pointer; }
.chat-debug-panel-body { flex: 1; overflow-y: auto; padding: 12px 16px; }
.chat-debug-panel-body pre { white-space: pre-wrap; font-size: 13px; color: #374151; line-height: 1.5; margin: 0; font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; }

/* ── Toggle buttons ────────────────────────── */
.chat-toggle-float-btn {
  position: fixed; z-index: 9999; width: 44px; height: 44px; border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.08); background: #fff; color: #4b5563;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.25s ease; backdrop-filter: blur(12px);
}
.chat-toggle-float-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06); color: #6366f1; border-color: rgba(99,102,241,0.2); }
.chat-toggle-float-btn.is-chat-active { bottom: 24px; right: 24px; }
.chat-toggle-float-btn.is-debug { bottom: 80px; right: 24px; }
.chat-toggle-float-btn.is-debug.is-chat-active { color: #6366f1; border-color: rgba(99,102,241,0.2); }

/* ── Knowledge tab button in sidebar ──────── */
:deep(.chat-sidebar-tab-btn) {
  display: flex; align-items: center; justify-content: flex-start; gap: 8px;
  width: 100%; height: 38px; margin-top: 8px; padding: 0 12px;
  border: none; border-radius: 10px; background: transparent; color: #4b5563;
  font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s, color 0.15s;
  overflow: hidden; white-space: nowrap;
}
:deep(.chat-sidebar-tab-btn:hover) { background: #f3f4f6; color: #111827; }
:deep(.chat-sidebar-tab-btn.active) { background: #e5e7eb; color: #111827; }

@media (max-width: 768px) {
  .chat-main-expand { margin-left: 0; width: 100vw; }
  .chat-welcome { padding: 0 16px 48px; }
  .chat-welcome-text { font-size: 20px; }
  .chat-mode-option { min-width: 70px; padding: 10px 10px; font-size: 13px; gap: 4px; }
  .chat-messages-inner { padding: 8px 16px 20px; }
  .chat-input-area { padding: 0 16px 20px; }
  .chat-msg-body { max-width: 85%; }
  .chat-debug-panel { width: 100vw; }
}
</style>
