/**
 * 对话 → 分析页的「研判交接」上下文。
 *
 * 背景:对话首页出完结论后会跳到态势研判 / 观察分析 / 反事实实验等页面,但此前
 * 只带 from_chat + session_id 两个参数,落地页压根不消费 —— 用户被丢进一个不知道
 * 和自己刚才那段对话有什么关系、也回不去的功能台,割裂感就是这么来的。
 *
 * 这里把交接信息收敛成一处:读 URL 参数 →(必要时)回查会话 → 暴露问题原文、
 * 阶段、本次命中的数据源,以及"回到本次对话"的动作。落点页只需要挂一个
 * <ChatHandoffStrip />,不需要各自解析 query。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAgentConversation } from '@/api/scnet/chatAgent'
import { unwrapApiData } from '@/utils/session'
import { toolDisplayName } from '@/constants/scnetToolLabels'

const PHASE_LABELS = Object.freeze({
  pre: '事前研判',
  during: '事中决策',
  post: '事后复盘'
})

const asText = (v) => String(v ?? '').trim()

/** ISO 时间戳 → "YYYY-MM-DD HH:mm"(拿不到就原样返回,不硬凑) */
const formatStamp = (value) => {
  const raw = asText(value)
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : raw
}

export function useChatHandoff() {
  const route = useRoute()
  const router = useRouter()

  const fromChat = computed(() => asText(route.query.from_chat) === '1')
  const conversationId = computed(() => asText(route.query.session_id || route.query.conversation_id))
  const phase = computed(() => {
    const value = asText(route.query.phase)
    return PHASE_LABELS[value] ? value : ''
  })
  const phaseLabel = computed(() => PHASE_LABELS[phase.value] || '')
  const scenario = computed(() => asText(route.query.scenario))

  // 只有"从对话跳进来"才渲染交接条,直接点左侧菜单进来不受影响
  const active = computed(() => fromChat.value && Boolean(conversationId.value))
  const dismissed = ref(false)
  const visible = computed(() => active.value && !dismissed.value)

  const loading = ref(false)
  const loadFailed = ref(false)
  const question = ref('')
  const askedAt = ref('')
  const toolLabels = ref([])
  const sections = ref([])

  const loadContext = async () => {
    if (!active.value) return
    loading.value = true
    try {
      const doc = unwrapApiData(await getAgentConversation(conversationId.value)) || {}
      const messages = Array.isArray(doc.messages) ? doc.messages : []
      const lastUser = [...messages].reverse().find((m) => m.role === 'user')
      const lastJudgment = [...messages].reverse()
        .find((m) => m.role === 'assistant' && m.message_type === 'judgment')
      question.value = asText(lastUser?.content) || asText(doc.title)
      askedAt.value = formatStamp(lastUser?.created_at || doc.created_at)
      sections.value = Array.isArray(lastJudgment?.sections) ? lastJudgment.sections : []
      const tools = Array.isArray(lastJudgment?.tools) ? lastJudgment.tools : []
      toolLabels.value = [...new Set(tools)].map(toolDisplayName)
    } catch (e) {
      // 回查失败不该挡住页面:拿不到问题原文就退化成只显示阶段 + 回到对话
      loadFailed.value = true
      console.warn('读取对话交接上下文失败:', e?.message)
    } finally {
      loading.value = false
    }
  }

  const backToChat = () => {
    if (!conversationId.value) return router.push({ path: '/chatHome' })
    return router.push({ path: '/chatHome', query: { conversation_id: conversationId.value } })
  }

  onMounted(loadContext)

  return {
    active, visible, loading, loadFailed,
    conversationId, question, askedAt, phase, phaseLabel, scenario, toolLabels, sections,
    backToChat,
    dismiss: () => { dismissed.value = true }
  }
}
