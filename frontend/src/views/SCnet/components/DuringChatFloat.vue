<template>
  <Teleport to="body">
    <div class="during-chat-float">
      <button
        v-if="!open"
        type="button"
        class="during-chat-launcher"
        title="打开事中智能对话"
        @click="open = true"
      >
        <el-icon :size="20"><ChatDotRound /></el-icon>
        <span>事中对话</span>
      </button>

      <transition name="during-chat-slide">
        <section v-if="open" class="during-chat-panel" aria-label="事中智能对话">
          <header class="during-chat-head">
            <div class="during-chat-title-wrap">
              <span class="during-chat-mark"><el-icon><ChatDotRound /></el-icon></span>
              <div>
                <strong>事中智能对话</strong>
                <p>{{ conversationId ? `已接续当前研判 · ${messages.length} 条记录` : '围绕当前推演继续提问' }}</p>
              </div>
            </div>
            <div class="during-chat-head-actions">
              <button type="button" title="刷新对话上下文" @click="loadConversationContext">↻</button>
              <button type="button" title="关闭" @click="open = false">×</button>
            </div>
          </header>

          <div class="during-chat-context">
            <span class="context-dot"></span>
            <span>当前场景：{{ scenarioLabel }} · 事中决策</span>
            <span v-if="experimentId" class="context-experiment">实验 {{ experimentId }}</span>
          </div>
          <div class="during-chat-page-guide">
            <div class="page-guide-kicker">当前工作位置</div>
            <div class="page-guide-title">{{ pageGuide.title }}</div>
            <div class="page-guide-hint">{{ pageGuide.hint }}</div>
          </div>

          <div ref="messageList" class="during-chat-messages">
            <div v-if="loadingHistory" class="during-chat-state">正在恢复最近对话…</div>
            <div v-else-if="!messages.length" class="during-chat-empty">
              <div class="empty-icon"><el-icon :size="24"><ChatDotRound /></el-icon></div>
              <strong>继续刚才的事中研判</strong>
              <p>可以追问实验结果、风险窗口、候选动作或决策依据。这里的回答只作为分析建议，不代表动作已执行。</p>
            </div>
            <template v-else>
              <div class="during-chat-history-label">已恢复的历史对话 · 最近 {{ messages.length }} 条</div>
              <article v-for="(message, index) in messages" :key="message.id || index" class="during-chat-message" :class="message.role">
                <span class="message-role">{{ message.role === 'user' ? '我' : 'AI' }}</span>
                <div class="message-bubble">{{ message.content || (sending && index === messages.length - 1 ? '正在分析…' : '') }}</div>
              </article>
            </template>
          </div>

          <div v-if="!loadingHistory" class="during-chat-prompts during-chat-prompts--page">
            <span>针对当前页面可以问：</span>
            <button v-for="prompt in quickPrompts" :key="prompt" type="button" @click="draft = prompt">{{ prompt }}</button>
          </div>

          <footer class="during-chat-composer">
            <p v-if="errorText" class="during-chat-error">{{ errorText }}</p>
            <textarea
              v-model="draft"
              rows="2"
              :disabled="sending"
              placeholder="继续提问，例如：为什么推荐该方案？"
              @keydown.enter.exact.prevent="send"
            ></textarea>
            <div class="during-chat-compose-foot">
              <span>Enter 发送 · 内容会保留在当前会话</span>
              <button type="button" :disabled="!draft.trim() || sending" @click="send">
                <el-icon :size="15"><Position /></el-icon>
                {{ sending ? '分析中' : '发送' }}
              </button>
            </div>
          </footer>
        </section>
      </transition>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChatDotRound, Position } from '@element-plus/icons-vue'
import { getAgentConversation, startAgentChat, streamAgentTask } from '@/api/scnet/chatAgent'
import { unwrapApiData } from '@/utils/session'
import { readConversationTranscript, saveConversationTranscript } from '@/constants/scnetExperimentPlan'
import { readUraniumConversations } from '@/utils/uraniumChatHistory'
import { useScenarioStore } from '@/stores/scenario'

const route = useRoute()
const scenarioStore = useScenarioStore()
const open = ref(false)
const draft = ref('')
const messages = ref([])
const conversationId = ref('')
const loadingHistory = ref(false)
const sending = ref(false)
const errorText = ref('')
let stream = null

const experimentId = computed(() => String(route.query.experiment_id || '').trim())
const scenarioLabel = computed(() => scenarioStore.currentScenario === 'supply_chain' ? '汽车供应链' : '铀供应链')
const pageGuide = computed(() => {
  const path = String(route.path || '')
  if (path.includes('expAnalysisOverview')) return {
    title: '实验总结报告',
    hint: '适合追问实验得出了什么、结论边界和还需要核验的事实。',
    prompts: ['请用三句话总结本次实验得出的结论', '哪些结论有实验数据直接支持？', '这份报告有哪些不能直接下结论的地方？']
  }
  if (path.includes('expAnalysisScenario')) return {
    title: '决策分析',
    hint: '适合比较候选方案、解释指标变化和追问推荐依据。',
    prompts: ['为什么推荐当前方案？请对应到实验指标', '如果不采用推荐方案，主要代价是什么？', '推荐方案最需要关注的风险触发点是什么？']
  }
  if (path.includes('experimentManager') && String(route.query.view || '') === 'decision') return {
    title: '决策方案',
    hint: '适合把实验结果转成可评估的建议，不代表已经下达执行。',
    prompts: ['请把推荐方案拆成具体的建议动作', '每个建议动作的适用条件是什么？', '请区分建议、依据和仍待确认的信息']
  }
  if (path.includes('experimentManager')) return {
    title: '实验管理',
    hint: '适合追问实验运行状态、指标含义和结果如何进入后续决策。',
    prompts: ['当前实验是否已经收敛？怎么看？', '本次实验重点观察了哪些指标？', '实验结果下一步会进入哪个决策页面？']
  }
  if (path.includes('interface')) return {
    title: '沙盘推演',
    hint: '适合解释当前推演状态、实验变量和下一步应该观察什么。',
    prompts: ['当前沙盘正在验证什么问题？', '哪些变量是本次推演的关键变量？', '我应该重点观察哪些异常信号？']
  }
  if (path.includes('scenarioAnalysis') || path.includes('scenarioModeling')) return {
    title: '想定生成',
    hint: '适合补充扰动条件、确认实验问题和检查想定是否完整。',
    prompts: ['当前想定要验证的核心问题是什么？', '还缺哪些关键约束条件？', '请检查当前想定是否能支持后续决策分析']
  }
  return {
    title: '事中推演',
    hint: '可围绕当前页面、实验结果和决策建议继续追问。',
    prompts: ['请解释当前推荐方案的主要依据', '当前实验的最大风险窗口是什么？', '还有哪些候选动作值得比较？']
  }
})
const quickPrompts = computed(() => pageGuide.value.prompts.slice(0, 2))

const normalizeMessages = (items) => (Array.isArray(items) ? items : [])
  .filter(item => item && (item.content || item.message))
  .map((item, index) => ({
    id: item.id || `${item.role || 'assistant'}-${index}`,
    role: item.role === 'user' ? 'user' : 'assistant',
    content: String(item.content || item.message || '')
  }))
  .slice(-40)

const resolveConversationId = () => {
  const queryId = route.query.conversation_id || (route.query.from_chat === '1' ? route.query.session_id : '')
  if (queryId) return String(queryId).trim()
  try { return String(localStorage.getItem('scnet_active_conversation_id') || '').trim() } catch { return '' }
}

const scrollToBottom = () => nextTick(() => {
  const el = document.querySelector('.during-chat-messages')
  if (el) el.scrollTop = el.scrollHeight
})

const loadConversationContext = async () => {
  const id = resolveConversationId()
  conversationId.value = id
  loadingHistory.value = true
  errorText.value = ''
  const transcriptLocal = id ? readConversationTranscript(id) : []
  const legacyLocal = id && scenarioStore.currentScenario === 'uranium'
    ? readUraniumConversations().find(item => item.id === id)?.messages || []
    : []
  const local = transcriptLocal.length ? transcriptLocal : legacyLocal
  messages.value = normalizeMessages(local)
  try {
    if (id && !id.startsWith('during-chat-')) {
      const doc = unwrapApiData(await getAgentConversation(id)) || {}
      const remote = normalizeMessages(doc.messages)
      if (remote.length) messages.value = remote
    }
  } catch (error) {
    if (!messages.value.length) errorText.value = `历史对话暂时无法读取：${error?.message || '请稍后重试'}`
  } finally {
    loadingHistory.value = false
    scrollToBottom()
  }
}

const persist = () => {
  if (conversationId.value) saveConversationTranscript(conversationId.value, messages.value)
}

const send = async () => {
  const text = draft.value.trim()
  if (!text || sending.value) return
  draft.value = ''
  errorText.value = ''
  const userMessage = { id: `user-${Date.now()}`, role: 'user', content: text }
  const reply = { id: `assistant-${Date.now()}`, role: 'assistant', content: '' }
  messages.value.push(userMessage, reply)
  sending.value = true
  persist()
  scrollToBottom()
  try {
    const response = await startAgentChat({
      message: text,
      conversationId: conversationId.value && !conversationId.value.startsWith('during-chat-') ? conversationId.value : null,
      mode: 'agent',
      phase: 'during',
      scenario: scenarioStore.currentScenario || 'uranium'
    })
    const data = unwrapApiData(response) || response?.data || response || {}
    if (!data.task_id) throw new Error(data.message || '未能启动对话任务')
    if (data.conversation_id) {
      conversationId.value = String(data.conversation_id)
      try { localStorage.setItem('scnet_active_conversation_id', conversationId.value) } catch { /* ignore */ }
      persist()
    }
    stream = streamAgentTask({
      taskId: data.task_id,
      onEvent: event => {
        if (event.type === 'text_delta') {
          reply.content += event.content || ''
          scrollToBottom()
        } else if (event.type === 'error') {
          reply.content = reply.content || `❌ ${event.message || '模型响应失败'}`
          sending.value = false
          persist()
        } else if (event.type === 'done' || event.type === 'complete') {
          sending.value = false
          persist()
        }
      },
      onError: error => {
        reply.content = reply.content || `❌ ${(error && error.message) || '连接中断'}`
        sending.value = false
        persist()
      }
    })
  } catch (error) {
    reply.content = `❌ 对话启动失败：${error?.message || error}`
    sending.value = false
    persist()
  }
}

watch(() => route.fullPath, () => {
  if (!sending.value) loadConversationContext()
})
onMounted(loadConversationContext)
onUnmounted(() => { if (stream) stream.close() })
</script>

<style scoped>
.during-chat-float { position: relative; z-index: 10000; }
.during-chat-launcher {
  position: fixed; right: 24px; bottom: var(--scnet-float-safe-bottom, 88px); display: flex; align-items: center; gap: 7px;
  padding: 0 15px; height: 44px; border: 1px solid #fed7aa; border-radius: 14px; background: #fff7ed; color: #c2410c;
  box-shadow: 0 5px 18px rgba(124, 45, 18, .12); cursor: pointer; font-size: 13px; font-weight: 700;
}
.during-chat-launcher:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(124, 45, 18, .18); }
.during-chat-panel {
  position: fixed; top: 72px; right: 20px; bottom: 20px; width: min(410px, calc(100vw - 32px)); display: flex; flex-direction: column;
  overflow: hidden; border: 1px solid #e5e7eb; border-radius: 18px; background: #fff; box-shadow: 0 18px 50px rgba(15, 23, 42, .2);
}
.during-chat-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; border-bottom: 1px solid #f1f5f9; }
.during-chat-title-wrap { display: flex; align-items: center; gap: 10px; }
.during-chat-mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; background: #fff7ed; color: #ea580c; }
.during-chat-title-wrap strong { color: #1f2937; font-size: 15px; }
.during-chat-title-wrap p { margin: 3px 0 0; color: #9ca3af; font-size: 11px; }
.during-chat-head-actions { display: flex; gap: 4px; }
.during-chat-head-actions button { width: 28px; height: 28px; border: 0; border-radius: 8px; background: transparent; color: #9ca3af; font-size: 18px; cursor: pointer; }
.during-chat-head-actions button:hover { background: #f8fafc; color: #374151; }
.during-chat-context { display: flex; align-items: center; gap: 6px; margin: 12px 16px 0; padding: 8px 10px; border-radius: 8px; background: #fff7ed; color: #9a3412; font-size: 11px; }
.during-chat-page-guide { margin: 8px 16px 0; padding: 8px 10px; border: 1px solid #f1f5f9; border-left: 3px solid #fb923c; border-radius: 8px; background: #fff; }
.page-guide-kicker { margin-bottom: 3px; color: #c2410c; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; }
.page-guide-title { color: #374151; font-size: 11px; font-weight: 700; }
.page-guide-hint { display: -webkit-box; overflow: hidden; margin-top: 3px; color: #9ca3af; font-size: 10px; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
.context-dot { width: 6px; height: 6px; border-radius: 50%; background: #f97316; }
.context-experiment { margin-left: auto; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #c2410c; }
.during-chat-messages { flex: 1; min-height: 120px; overflow-y: auto; padding: 14px 16px 8px; }
.during-chat-state, .during-chat-empty { color: #9ca3af; text-align: center; font-size: 12px; }
.during-chat-empty { padding: 45px 18px 20px; }
.during-chat-history-label { margin-bottom: 12px; color: #9ca3af; font-size: 10px; text-align: center; }
.empty-icon { display: grid; place-items: center; width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 15px; background: #fff7ed; color: #ea580c; }
.during-chat-empty strong { display: block; color: #374151; font-size: 14px; }
.during-chat-empty p { margin: 8px auto 18px; max-width: 280px; line-height: 1.7; }
.during-chat-prompts { display: flex; flex-direction: column; gap: 7px; }
.during-chat-prompts--page { display: flex; flex-direction: row; flex-wrap: wrap; gap: 5px; padding: 0 14px 8px; }
.during-chat-prompts--page > span { width: 100%; color: #9ca3af; font-size: 10px; }
.during-chat-prompts button { padding: 7px 9px; border: 1px solid #fed7aa; border-radius: 8px; background: #fff; color: #c2410c; text-align: left; font-size: 10px; cursor: pointer; }
.during-chat-prompts button:hover { background: #fff7ed; }
.during-chat-message { display: flex; align-items: flex-start; gap: 7px; margin-bottom: 14px; }
.during-chat-message.user { flex-direction: row-reverse; }
.message-role { flex: 0 0 23px; width: 23px; height: 23px; border-radius: 8px; background: #f1f5f9; color: #64748b; font-size: 10px; line-height: 23px; text-align: center; }
.assistant .message-role { background: #ffedd5; color: #c2410c; }
.message-bubble { max-width: calc(100% - 30px); padding: 9px 11px; border-radius: 4px 12px 12px 12px; background: #f8fafc; color: #374151; white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.65; }
.user .message-bubble { border-radius: 12px 4px 12px 12px; background: #ea580c; color: #fff; }
.during-chat-composer { padding: 10px 14px 13px; border-top: 1px solid #f1f5f9; }
.during-chat-composer textarea { width: 100%; box-sizing: border-box; resize: none; padding: 9px 10px; border: 1px solid #e5e7eb; border-radius: 10px; outline: none; color: #374151; font: inherit; font-size: 12px; line-height: 1.5; }
.during-chat-composer textarea:focus { border-color: #fb923c; box-shadow: 0 0 0 3px rgba(251, 146, 60, .12); }
.during-chat-compose-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 7px; color: #9ca3af; font-size: 10px; }
.during-chat-compose-foot button { display: flex; align-items: center; gap: 4px; padding: 6px 10px; border: 0; border-radius: 8px; background: #ea580c; color: #fff; font-size: 11px; cursor: pointer; }
.during-chat-compose-foot button:disabled { background: #fdba74; cursor: not-allowed; }
.during-chat-error { margin: 0 0 6px; color: #dc2626; font-size: 11px; }
.during-chat-slide-enter-active, .during-chat-slide-leave-active { transition: opacity .2s ease, transform .2s ease; }
.during-chat-slide-enter-from, .during-chat-slide-leave-to { opacity: 0; transform: translateX(18px); }
@media (max-width: 640px) { .during-chat-panel { top: 62px; right: 8px; bottom: 8px; width: calc(100vw - 16px); } .during-chat-launcher { right: 12px; } }
</style>
