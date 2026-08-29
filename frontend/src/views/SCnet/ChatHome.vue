<template>
  <div class="chat-shell">
    <ChatSidebar
      :conversations="conversations"
      :activeId="currentConversationId"
      :collapsed="sidebarCollapsed"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @new-conversation="startNewConversation"
      @select-conversation="loadConversation"
      @delete-conversation="handleDeleteConversation"
      @batch-delete="handleBatchDelete"
      @rename-conversation="handleRenameConversation"
      @open-knowledge="openKnowledge"
      @exit="goToMainPage"
    />

    <div class="chat-main" :class="sidebarCollapsed ? 'chat-main-shrink' : 'chat-main-expand'">

      <!-- ====== Welcome ====== -->
      <template v-if="messages.length === 0 && !isStreaming">
        <div class="chat-welcome-wrap">
          <div class="chat-welcome">
            <div class="chat-welcome-brand">
              <img :src="logoUrl" alt="SCnet" class="chat-welcome-logo" />
              <span class="chat-welcome-text">使用供应链助手开始对话</span>
            </div>
            <p class="chat-welcome-hint">本系统支持 <b>铀供应链</b> 与 <b>汽车供应链</b> 两大场景，系统将<b>自动识别</b>您的场景。选择下方的分析阶段后直接提问，即可进入对应的推演分析。</p>

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
                <div v-if="msg.content" class="chat-msg-bubble" v-html="renderMarkdown(msg.content)"></div>
                <div v-if="msg.role === 'assistant'" class="chat-disclaimer">本回答由 AI 生成，内容仅供参考</div>
              </div>
            </div>
            <div v-if="isStreaming" class="chat-spinner">
              <span class="chat-spinner-glyph">{{ spinnerGlyph }}</span>
              <span class="chat-spinner-verb">推演中&hellip;</span>
            </div>
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
import { detectScenario, SCENARIO_VALUES, SCENARIO_LABELS } from '@/constants/scnetScenario'

const SPINNER_GLYPHS = ['✽', '✢', '✦', '✧']

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

    // 后端没有 /api/chat/conversations，改用已有的场景会话接口 /api/scenario/sessions
    const fetchConversations = async () => {
      try {
        const d = await getSessions()
        conversations.value = (d?.data?.sessions || []).map(s => ({
          id: s.session_id,
          title: s.requirement_text || '新对话',
          created_at: s.timestamp
        }))
      } catch {}
    }
    const startNewConversation = () => {
      messages.value = []; currentConversationId.value = ''; inputText.value = ''; isStreaming.value = false
      attachments.value = []; debugThinking.value = ''
      nextTick(() => welcomeTextarea.value?.focus())
    }
    const loadConversation = async (convId) => {
      try {
        const d = await getSessionDetail(convId)
        const detail = d?.data
        if (!detail) return
        currentConversationId.value = convId
        // 后端会话里 chat_history 的角色字段是 type: 'user' | 'system'
        messages.value = (detail.chat_history || []).map((m, i) => ({
          id: m.id || `h${i}`,
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content || ''
        }))
        scrollToBottom()
      } catch {}
    }
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

    const handleSend = async () => {
      const text = inputText.value.trim()
      // 自动识别场景（铀 / 汽车），仅当检测到明确关键词时切换
      const detected = detectScenario(text)
      if (detected) scenarioStore.setScenario(detected)
      // 保存用户问题，供报告生成等页面使用
      if (text) scenarioStore.setLastUserMessage(text)
      if ((!text && attachments.value.length === 0) || isStreaming.value) return

      // 首页只做「入口」：建会话（或复用当前会话）后带着问题跳到对应阶段的分析页。
      // 后端没有 /api/chatHome/analyze 和 /api/chat/stream，场景判定在前端用关键词做，
      // 会话走已有的 /api/scenario/session。
      const isDuring = currentMode.value === 'during'
      const fileInfo = attachments.value.length > 0 ? '\n[附件: ' + attachments.value.map(a => a.name).join(', ') + ']' : ''
      inputText.value = ''; attachments.value = []
      messages.value.push({ id: 'u' + Date.now(), role: 'user', content: text + fileInfo })
      messages.value.push({
        id: 'a' + Date.now(),
        role: 'assistant',
        content: isDuring ? '🚨 正在建立事中会话并进入想定生成...' : '🔍 正在建立会话并进入态势分析...',
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
        }
        const sc = scenarioStore.currentScenario || 'uranium'
        if (isDuring) await enterDuringFlow(sid, text, sc)
        else await enterSituationAnalysis(sid, text, sc)
        fetchConversations()
      } catch (e) {
        messages.value.pop()
        messages.value.push({ id: 'a' + Date.now(), role: 'assistant', content: `会话创建失败：${e.message}` })
      }
      clearInterval(glyphTimer)
      isStreaming.value = false
      scrollToBottom()
    }
    const abortStream = () => { if (abortController) { abortController.abort(); abortController = null } clearInterval(glyphTimer); isStreaming.value = false }

    const renderMarkdown = (c) => { if (!c) return ''; try { return marked.parse(c, { breaks: true }) } catch { return c } }

    onMounted(() => {
      fetchConversations()
      // 从 /chatHome?mode=during 之类的入口进来时，直接落到对应阶段
      applyModeFromRoute(route.query?.mode)
      nextTick(() => welcomeTextarea.value?.focus())
    })
    watch(() => route.query?.mode, (mode) => applyModeFromRoute(mode))
    onUnmounted(() => { if (abortController) abortController.abort(); clearInterval(glyphTimer) })

    return {
      scenarioStore,
      logoUrl, msgContainer, welcomeTextarea, chatTextarea, fileInput, debugPanelBody,
      messages, inputText, selectedModel, isStreaming, currentConversationId, conversations,
      sidebarCollapsed, currentMode, modeIndex, execMode, attachments,
      debugThinking, debugThinkingVisible, spinnerGlyph,
      currentModelLabel, currentExecMode, inputPlaceholder,
      modeOptions: MODE_OPTIONS, chatModels: CHAT_MODELS, EXEC_MODES,
      scenarioOptions: SCENARIO_OPTIONS,
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
.chat-main { display: flex; flex-direction: column; height: 100vh; min-width: 0; transition: margin-left 0.3s ease; }
.chat-main-expand { margin-left: 260px; width: calc(100vw - 260px); }
.chat-main-shrink { margin-left: 64px; width: calc(100vw - 64px); }

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
