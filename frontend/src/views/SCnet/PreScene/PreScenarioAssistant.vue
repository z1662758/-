<template>
  <section class="pre-workspace">
    <div class="discussion">
      <slot name="toolbar" />
      <div ref="messageList" class="discussion-scroll" role="log" aria-label="事前场景设定对话" aria-live="polite">
        <div class="discussion-inner">
          <section v-if="!messages.length" class="scenario-brief">
            <img class="brief-logo" :src="logoUrl" alt="" />
            <div class="brief-copy">
              <p class="brief-eyebrow">{{ scenarioLabel }} · 事前分析</p>
              <h2>场景设定与研判需求</h2>
              <p class="brief-lead">从一个具体的问题开始，一起明确本次研判的对象、范围与决策目标。</p>
              <div class="brief-dimension">
                <h3>一、描述问题与已知条件</h3>
                <p>说明关注的供应链、背景事件与当前情况，可补充来源国家、运输路线、分析时间和采购需求。</p>
              </div>
              <div class="brief-dimension">
                <h3>二、梳理研判思路与分析边界</h3>
                <p>通过对话补充目标和约束，明确需要哪些证据、重点分析什么，以及希望得到怎样的建议。</p>
              </div>
              <div class="brief-dimension">
                <h3>三、核对大纲，再生成分析方案</h3>
                <p>点击「整理大纲」，在右侧核对分析步骤和待明确事项。确认后，才能生成正式的分析方案。</p>
              </div>
              <p class="brief-flow">本次流程：<b>描述需求 → 讨论澄清 → 整理大纲 → 确认大纲 → 生成分析方案</b>。右侧可随时查看大纲和编辑场景参数。</p>
            </div>
          </section>
          <div v-if="!messages.length" class="preset-wrap">
            <p class="preset-label">从这些问题开始，也可以直接描述你的需求</p>
            <div class="preset-grid">
              <button v-for="item in suggestions" :key="item.title" type="button" class="preset-card" @click="useSuggestion(item)">
                <span class="preset-icon">{{ item.icon }}</span>
                <span><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
              </button>
            </div>
          </div>
          <div v-else class="discussion-context"><span>事前场景设定</span><span>在这里讨论需求，右侧核对大纲</span></div>
          <article v-for="(item, index) in messages" :key="index" class="chat-message" :class="item.role">
            <div class="message-avatar"><img v-if="item.role === 'assistant'" :src="logoUrl" alt="助手" /><span v-else>我</span></div>
            <div class="message-content" v-html="renderMessage(item.content)"></div>
          </article>
          <div v-if="busy" class="thinking" role="status"><span class="thinking-dot"></span>{{ busy === 'outline' ? '正在整理事前研判大纲…' : '正在梳理你的研判需求…' }}</div>
        </div>
      </div>
      <div class="composer-wrap">
        <form class="composer" @submit.prevent="sendMessage">
          <textarea ref="draftInput" v-model="draft" :disabled="!!busy" rows="3" aria-label="研判需求" placeholder="描述本次研判需求，例如：某个事件会怎样影响供应稳定性，我应该如何安排采购…" @keydown.enter.exact="handleEnter"></textarea>
          <div class="composer-tools">
            <div class="composer-mode"><span>◌</span> 需求讨论 <i></i><span>{{ scenarioLabel }}</span></div>
            <div class="composer-buttons">
              <button class="outline-trigger" type="button" :disabled="!!busy || !hasContext" @click="makeOutline">{{ busy === 'outline' ? '整理中…' : '整理大纲' }}</button>
              <button class="send-button" type="submit" :disabled="!!busy || !draft.trim()" aria-label="发送消息" title="发送消息">↑</button>
            </div>
          </div>
        </form>
        <p class="composer-note">Enter 发送 · Shift + Enter 换行 · 确认大纲后再生成分析方案</p>
      </div>
    </div>

    <aside class="outline-rail" aria-label="事前研判大纲">
      <header class="rail-header">
        <div><p class="rail-eyebrow">PRE-ANALYSIS OUTLINE</p><h2>事前研判大纲</h2></div>
        <span class="outline-status" :class="{ confirmed }">{{ confirmed ? '已确认' : outline ? '待确认' : '待生成' }}</span>
      </header>
      <ol class="outline-progress" aria-label="场景设定进度">
        <li :class="{ complete: hasContext }"><span>1</span>需求</li><li :class="{ complete: !!outline }"><span>2</span>大纲</li><li :class="{ complete: confirmed }"><span>3</span>确认</li>
      </ol>
      <div class="rail-tabs" role="tablist" aria-label="大纲与场景参数">
        <button id="pre-outline-tab" type="button" role="tab" :aria-selected="outputTab === 'outline'" aria-controls="pre-outline-panel" :class="{ active: outputTab === 'outline' }" @click="outputTab = 'outline'">大纲预览</button>
        <button id="pre-settings-tab" type="button" role="tab" :aria-selected="outputTab === 'settings'" aria-controls="pre-settings-panel" :class="{ active: outputTab === 'settings' }" @click="outputTab = 'settings'">场景参数</button>
      </div>
      <div class="rail-scroll">
        <section id="pre-outline-panel" v-show="outputTab === 'outline'" role="tabpanel" aria-labelledby="pre-outline-tab">
          <template v-if="outline">
            <section class="outline-block"><p class="block-eyebrow">ANALYSIS GOAL</p><h3>核心研判问题</h3><p class="outline-question">{{ outline.scenario_spec?.question }}</p></section>
            <section class="outline-block">
              <p class="block-eyebrow">ANALYSIS OUTLINE</p><h3>{{ exampleOutline ? '设定案例大纲' : '拟开展的分析' }}</h3>
              <div v-if="outline.sections?.length" class="outline-sections">
                <section v-for="(section, sectionIndex) in outline.sections" :key="sectionIndex" class="outline-section">
                  <h4><span>{{ String(sectionIndex + 1).padStart(2, '0') }}</span>{{ section.title }}</h4>
                  <div v-for="(item, itemIndex) in section.items" :key="itemIndex" class="outline-item"><strong>{{ item.name }}</strong><p>{{ item.detail }}</p><a v-if="safeSourceUrl(item.sourceUrl)" :href="safeSourceUrl(item.sourceUrl)" target="_blank" rel="noopener noreferrer">查看原始资料 ↗</a></div>
                </section>
              </div>
              <ol v-else class="outline-steps"><li v-for="(step, index) in outline.outline" :key="index"><span>{{ String(index + 1).padStart(2, '0') }}</span><p>{{ step }}</p></li></ol>
            </section>
            <section v-if="outline.open_questions?.length" class="open-questions"><h3>仍待明确</h3><p v-for="(question, index) in outline.open_questions" :key="index">{{ question }}</p></section>
            <button v-if="!confirmed" type="button" class="confirm-outline" :disabled="!!busy" @click="$emit('confirm', outline)">确认大纲并应用场景参数</button>
            <p v-else class="confirmed-note">✓ 大纲已确认，可以生成分析方案。继续对话或修改参数后需重新确认。</p>
          </template>
          <template v-else>
            <section class="outline-block empty-outline"><p class="block-eyebrow">ANALYSIS OUTLINE</p><h3>{{ busy === 'outline' ? '正在整理研判大纲' : '待生成研判大纲' }}</h3><p>先在中间描述需求，再点击「整理大纲」。这里将展示具体分析步骤，供你核对和确认。</p></section>
            <section class="outline-block"><p class="block-eyebrow">SCENARIO CONTEXT</p><h3>当前场景范围</h3><dl class="scope-list"><div v-for="item in scopeItems" :key="item.label"><dt>{{ item.label }}</dt><dd :class="{ pending: !item.value }">{{ item.value || '待明确' }}</dd></div></dl><button class="edit-settings" type="button" @click="outputTab = 'settings'">编辑场景参数 →</button></section>
          </template>
        </section>
        <section id="pre-settings-panel" v-show="outputTab === 'settings'" role="tabpanel" aria-labelledby="pre-settings-tab"><slot name="settings" /></section>
      </div>
      <slot name="actions" />
    </aside>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { discussPreScenario } from '@/api/expertWorkflow'
import { buildPreScenarioExampleOutline } from '@/constants/preScenarioExampleOutline'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import logoUrl from '@/assets/images/logo.png'

const props = defineProps({
  form: { type: Object, required: true },
  scenario: { type: String, required: true },
  sessionId: { type: String, default: '' },
  isExample: { type: Boolean, default: false },
  examplePlan: { type: Object, default: null },
  initialOutline: { type: Object, default: null },
  confirmed: { type: Boolean, default: false },
  resetToken: { type: Number, default: 0 },
})
const emit = defineEmits(['confirm', 'invalidated'])
const outputTab = ref('outline')
const draftInput = ref(null)
let requestEpoch = 0
const draft = ref('')
const busy = ref('')
const messages = ref([])
const outline = ref(null)
const exampleOutline = ref(false)
const messageList = ref(null)
const stateKey = computed(() => props.sessionId
  ? `scnet-pre-assistant:session:${props.sessionId}`
  : `scnet-pre-assistant:draft:${props.scenario}`)
function persistState(key = stateKey.value) {
  if (!key) return
  try {
    sessionStorage.setItem(key, JSON.stringify({
      messages: messages.value.slice(-40), outline: outline.value,
      exampleOutline: exampleOutline.value, draft: draft.value,
    }))
  } catch { /* 浏览器禁用会话存储时仍可在当前页面使用 */ }
}
function restoreState(key) {
  let saved = null
  try { saved = JSON.parse(sessionStorage.getItem(key) || 'null') } catch { /* 损坏记录忽略 */ }
  messages.value = Array.isArray(saved?.messages) ? saved.messages : []
  outline.value = saved?.outline?.scenario_spec && Array.isArray(saved.outline?.outline) ? saved.outline : null
  exampleOutline.value = Boolean(saved?.exampleOutline)
  draft.value = typeof saved?.draft === 'string' ? saved.draft : ''

}
watch(stateKey, (key, oldKey) => {
  requestEpoch += 1
  busy.value = ''
  if (oldKey) persistState(oldKey)
  restoreState(key)
}, { immediate: true, flush: 'sync' })
watch([messages, outline, exampleOutline, draft], () => persistState(), { deep: true })
const scenarioLabel = computed(() => props.scenario === 'auto' ? '汽车供应链' : '铀供应链')
watch(() => props.resetToken, () => {
  requestEpoch += 1
  busy.value = ''
  outputTab.value = 'outline'
  messages.value = []
  outline.value = null
  exampleOutline.value = false
  draft.value = ''
  try { sessionStorage.removeItem(stateKey.value) } catch { /* 无存储权限 */ }
})
watch(() => props.confirmed, (value, previous) => {
  if (previous && !value) outline.value = null
})
watch(() => [props.isExample, props.form.question, props.examplePlan], () => {
  if (!props.isExample || !props.sessionId || !props.form.question?.trim() || !props.examplePlan?.analysisQuestions?.length) return
  if (outline.value?.version >= 3 && exampleOutline.value) return
  // 只升级旧案例大纲；用户对话后生成的自定义大纲原样保留。
  if (outline.value && !exampleOutline.value) return
  if (messages.value.length && !exampleOutline.value) return
  if (!messages.value.length) messages.value = [{ role: 'assistant', content: '已读取设定案例和已完成的分析方案。下方按指标、历史事件、模型输入输出与态势判定列出待核对的大纲。' }]
  outline.value = buildPreScenarioExampleOutline(currentForm(), props.examplePlan)
  exampleOutline.value = true
  scrollDown()
}, { immediate: true })
watch(() => props.initialOutline, value => {
  if (!value?.scenario_spec || !Array.isArray(value.outline) || outline.value || messages.value.length || props.isExample) return
  outline.value = value
  messages.value = [{ role: 'assistant', content: '已恢复本次任务确认过的研判大纲。您可以继续查看，也可以提出调整后重新整理。' }]
  scrollDown()
}, { immediate: true })

const hasContext = computed(() => !!props.form.question?.trim() || messages.value.some(item => item.role === 'user'))
const scopeItems = computed(() => [
  { label: '核心问题', value: props.form.question?.trim() },
  { label: '研究对象', value: props.form.commodity?.trim() },
  { label: '背景事件', value: props.form.backgroundEvent?.trim() },
  { label: '来源国家', value: props.form.sourceCountries?.join('、') },
  { label: '分析时间', value: props.form.timeRange?.filter(Boolean).join(' 至 ') },
])
const suggestions = computed(() => {
  const object = props.scenario === 'auto' ? '汽车零部件' : '铀燃料'
  return [
    { icon: '◈', title: '供应风险研判', description: '关注供应稳定性与潜在中断因素', text: `请帮我梳理未来半年${object}供应风险，先一起明确研究范围和需要收集的证据。` },
    { icon: '↗', title: '价格走势分析', description: '明确分析周期与价格影响因素', text: `我想研判${object}价格走势，请先帮我明确分析时间、影响因素和判断标准。` },
    { icon: '⌁', title: '采购决策建议', description: '讨论采购时机、数量与约束条件', text: `我计划采购${object}，希望获得采购时机和数量建议，请帮我梳理需要补充的条件。` },
    { icon: '◎', title: '运输路线评估', description: '比较运输通道与关键风险节点', text: `我想评估${object}运输路线的风险和备选方案，请先帮我制定研判大纲。` },
  ]
})
function useSuggestion(item) { draft.value = item.text; nextTick(() => draftInput.value?.focus()) }
function handleEnter(event) {
  if (event.isComposing) return
  event.preventDefault()
  sendMessage()
}
function renderMessage(text) { return DOMPurify.sanitize(marked.parse(String(text || ''), { breaks: true })) }
function safeSourceUrl(value) { return /^https?:\/\//i.test(String(value || '')) ? value : null }
function scrollDown() { nextTick(() => { if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight }) }
function currentForm() {
  return {
    question: props.form.question,
    domain_model_analysis: props.form.domain_model_analysis || null,
    background_event: props.form.backgroundEvent,
    commodity: props.form.commodity,
    source_countries: props.form.sourceCountries,
    route_ids: props.form.routeIds,
    time_window: { start: props.form.timeRange?.[0] || '', end: props.form.timeRange?.[1] || '' },
    quantity: props.form.quantity,
    unit: props.form.unit,
  }
}
async function sendMessage() {
  const text = draft.value.trim()
  if (!text || busy.value) return
  const requestKey = stateKey.value
  const epoch = ++requestEpoch
  const history = messages.value.map(item => ({ role: item.role, content: item.content }))
  messages.value.push({ role: 'user', content: text })
  draft.value = ''
  outline.value = null
  exampleOutline.value = false
  emit('invalidated')
  busy.value = 'chat'
  scrollDown()
  try {
    const response = await discussPreScenario({ action: 'chat', scenario: props.scenario, form: currentForm(), history, message: text })
    if (stateKey.value !== requestKey || epoch !== requestEpoch) return
    messages.value.push({ role: 'assistant', content: response?.data?.reply || '助手没有返回内容，请重试。' })
  } catch (error) {
    if (stateKey.value === requestKey && epoch === requestEpoch) messages.value.push({ role: 'assistant', content: `发送失败：${error?.message || '请稍后重试'}` })
  } finally {
    if (epoch === requestEpoch) busy.value = ''
    if (stateKey.value === requestKey && epoch === requestEpoch) persistState(requestKey)
    scrollDown()
  }
}
async function makeOutline() {
  if (busy.value) return
  const requestKey = stateKey.value
  const epoch = ++requestEpoch
  outputTab.value = 'outline'
  busy.value = 'outline'
  outline.value = null
  exampleOutline.value = false
  emit('invalidated')
  try {
    const response = await discussPreScenario({
      action: 'outline', scenario: props.scenario, form: currentForm(),
      history: messages.value.map(item => ({ role: item.role, content: item.content })),
    })
    if (stateKey.value !== requestKey || epoch !== requestEpoch) return
    const result = response?.data
    if (!result?.scenario_spec?.question?.trim() || !Array.isArray(result.outline) || !result.outline.length) throw new Error('大纲内容不完整，请重新整理')
    outline.value = result
    if (outline.value?.reply) messages.value.push({ role: 'assistant', content: outline.value.reply })
  } catch (error) {
    if (stateKey.value === requestKey && epoch === requestEpoch) messages.value.push({ role: 'assistant', content: `大纲生成失败：${error?.message || '请稍后重试'}` })
  } finally {
    if (epoch === requestEpoch) busy.value = ''
    if (stateKey.value === requestKey && epoch === requestEpoch) persistState(requestKey)
    scrollDown()
  }
}
onBeforeUnmount(() => { requestEpoch += 1; persistState() })
</script>

<style scoped>
.pre-workspace { display: grid; grid-template-columns: minmax(0, 1fr) clamp(320px, 33%, 460px); width: 100%; height: 100%; min-height: 0; color: #283241; font-family: Inter, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; }
.discussion { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: #fff; }
.discussion-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.discussion-inner { max-width: 820px; margin: 0 auto; padding: 24px 32px; box-sizing: border-box; }
.scenario-brief { display: flex; align-items: flex-start; gap: 14px; }
.brief-logo { width: 30px; height: 30px; border-radius: 8px; object-fit: contain; background: #eef2f6; flex: none; }
.brief-copy { min-width: 0; }
.brief-eyebrow { margin: 0 0 7px; color: #929aa7; font-size: 11px; }
.brief-copy h2 { margin: 0; color: #18212d; font-size: 22px; line-height: 1.5; font-weight: 650; }
.brief-lead { margin: 12px 0 0; color: #667181; font-size: 14px; line-height: 1.9; }
.brief-dimension { margin-top: 22px; }
.brief-dimension h3 { margin: 0 0 8px; font-size: 15px; color: #27313e; font-weight: 650; }
.brief-dimension p { margin: 0; padding-left: 18px; color: #6d7582; font-size: 13px; line-height: 1.95; }
.brief-flow { margin: 22px 0 0; padding: 12px 15px; border: 1px solid #e8e5f1; border-radius: 9px; background: #f8f7fb; color: #787287; font-size: 12px; line-height: 1.9; }
.brief-flow b { font-weight: 550; color: #676077; }
.preset-wrap { margin: 28px 0 4px 44px; }
.preset-label { margin: 0 0 12px; color: #a0a7b1; font-size: 11px; }
.preset-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.preset-card { display: flex; align-items: flex-start; gap: 12px; padding: 15px 14px; border: 1px solid #e8ebef; border-radius: 10px; background: #fff; color: #414a57; text-align: left; cursor: pointer; box-shadow: 0 2px 6px #253b5310; }
.preset-card:hover { border-color: #b5c4d7; background: #f9fbfd; }
.preset-icon { font-size: 19px; color: #718297; flex: none; }
.preset-card strong { display: block; font-size: 12px; font-weight: 650; }
.preset-card small { display: block; margin-top: 7px; color: #929ba7; font-size: 11px; line-height: 1.7; }
.discussion-context { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding-bottom: 15px; margin-bottom: 25px; border-bottom: 1px solid #edf0f4; font-size: 11px; color: #9aa3ae; }
.chat-message { display: flex; align-items: flex-start; gap: 12px; margin: 0 0 26px; }
.message-avatar { display: grid; place-items: center; flex: none; width: 30px; height: 30px; border-radius: 8px; overflow: hidden; background: #eff3f8; color: #7b8799; font-size: 12px; }
.message-avatar img { width: 100%; height: 100%; object-fit: contain; }
.message-content { min-width: 0; max-width: calc(100% - 42px); color: #374151; font-size: 14px; line-height: 1.9; overflow-wrap: anywhere; }
.message-content :deep(p) { margin: 0 0 10px; }
.message-content :deep(p:last-child) { margin-bottom: 0; }
.message-content :deep(ul), .message-content :deep(ol) { padding-left: 22px; }
.message-content :deep(pre) { max-width: 100%; overflow: auto; padding: 12px; border-radius: 8px; background: #f4f6f9; font-size: 12px; }
.message-content :deep(table) { display: block; max-width: 100%; overflow: auto; border-collapse: collapse; }
.message-content :deep(td), .message-content :deep(th) { padding: 6px 10px; border: 1px solid #e5e7eb; }
.message-content :deep(a) { color: #2a659f; }
.chat-message.user { flex-direction: row-reverse; }
.user .message-content { padding: 10px 15px; border: 1px solid #e8edf4; border-radius: 11px; background: #f4f7fb; }
.thinking { display: flex; align-items: center; gap: 9px; margin-left: 42px; color: #7c899a; font-size: 12px; }
.thinking-dot { width: 7px; height: 7px; border-radius: 50%; background: #8b9fb6; animation: breathing 1.5s infinite; }
@keyframes breathing { 50% { opacity: .35; } }
.composer-wrap { flex: none; width: 100%; max-width: 820px; margin: 0 auto; padding: 12px 28px 10px; box-sizing: border-box; background: #fff; }
.composer { padding: 15px 16px 12px; border: 1px solid #e3e7ec; border-radius: 15px; background: #fff; box-shadow: 0 4px 18px #1d2b3b08; }
.composer:focus-within { border-color: #9ab1cc; box-shadow: 0 0 0 2px #c8d8ec22; }
.composer textarea { display: block; width: 100%; max-height: 180px; min-height: 54px; padding: 0; box-sizing: border-box; border: 0; background: transparent; outline: none; resize: vertical; color: #374151; font: inherit; font-size: 13px; line-height: 1.8; }
.composer textarea::placeholder { color: #a3aab5; }
.composer-tools { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 14px; }
.composer-mode { display: flex; align-items: center; gap: 7px; color: #929aa6; font-size: 11px; }
.composer-mode > span:first-child { font-size: 17px; }
.composer-mode i { width: 1px; height: 10px; margin: 0 4px; background: #e2e5e9; }
.composer-buttons { display: flex; align-items: center; gap: 10px; }
.outline-trigger { padding: 7px 10px; border: 1px solid #e0e5ec; border-radius: 7px; background: #f9fafc; color: #53677e; font: inherit; font-size: 11px; cursor: pointer; }
.send-button { width: 31px; height: 31px; border: 0; border-radius: 9px; background: #253e5b; color: #fff; font-size: 21px; cursor: pointer; }
.composer-note { margin: 9px 0 0; text-align: center; color: #a6aeb8; font-size: 10px; }
button:disabled { opacity: .45; cursor: not-allowed; }
button:focus-visible { outline: 2px solid #5f83b0; outline-offset: 3px; }
.outline-rail { display: flex; flex-direction: column; min-width: 0; min-height: 0; border-left: 1px solid #e6e9ef; background: #f8f9fb; }
.rail-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex: none; padding: 22px 22px 15px; border-bottom: 1px solid #ebedf1; background: #fff; }
.rail-eyebrow { margin: 0 0 7px; color: #9aa3af; font-size: 10px; letter-spacing: .13em; font-weight: 650; }
.rail-header h2 { margin: 0; color: #25303c; font-size: 18px; font-weight: 650; }
.outline-status { padding: 4px 8px; border-radius: 6px; background: #f2f4f7; color: #8b95a4; font-size: 11px; white-space: nowrap; }
.outline-status.confirmed { background: #ecf8f0; color: #3e8961; }
.outline-progress { display: flex; flex: none; align-items: center; justify-content: space-between; gap: 8px; list-style: none; margin: 0; padding: 16px 22px; background: #fff; }
.outline-progress li { display: flex; align-items: center; gap: 6px; color: #aab2bd; font-size: 11px; }
.outline-progress li span { display: grid; place-items: center; width: 19px; height: 19px; border: 1px solid #e6eaf0; border-radius: 50%; font-size: 10px; }
.outline-progress li.complete { color: #55718f; }
.outline-progress li.complete span { border-color: #d3dfed; background: #edf3fa; color: #4e7199; }
.rail-tabs { display: flex; gap: 22px; flex: none; padding: 0 22px; border-top: 1px solid #f0f2f5; border-bottom: 1px solid #e9edf2; background: #fff; }
.rail-tabs button { padding: 12px 0; border: 0; border-bottom: 2px solid transparent; background: none; color: #a0a8b3; font: inherit; font-size: 12px; cursor: pointer; }
.rail-tabs button.active { color: #466689; border-bottom-color: #718ba9; font-weight: 600; }
.rail-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 20px; overscroll-behavior: contain; }
.outline-block { padding: 17px; margin-bottom: 16px; border: 1px solid #e7ebf0; border-radius: 10px; background: #fff; }
.block-eyebrow { margin: 0 0 7px; color: #a1a9b5; font-size: 9px; letter-spacing: .1em; }
.outline-block h3 { margin: 0 0 12px; color: #485566; font-size: 13px; font-weight: 650; }
.outline-question, .empty-outline > p:last-child { margin: 0; font-size: 12px; line-height: 1.9; color: #7b8796; overflow-wrap: anywhere; }
.outline-steps { padding: 0; margin: 0; list-style: none; }
.outline-steps li { display: flex; align-items: flex-start; gap: 10px; padding: 13px 0; border-bottom: 1px solid #f0f2f5; }
.outline-steps li:last-child { padding-bottom: 0; border-bottom: 0; }
.outline-steps li > span { color: #a6b6c9; font-size: 11px; line-height: 1.9; }
.outline-steps li > p { margin: 0; color: #677689; font-size: 12px; line-height: 1.9; overflow-wrap: anywhere; }
.outline-section + .outline-section { margin-top: 18px; padding-top: 14px; border-top: 1px solid #edf0f4; }
.outline-section h4 { display: flex; gap: 8px; margin: 0 0 12px; color: #4a617b; font-size: 12px; }
.outline-section h4 span { color: #a6b6c9; font-weight: 400; }
.outline-item + .outline-item { margin-top: 12px; }
.outline-item strong { color: #64748b; font-size: 11px; }
.outline-item p { margin: 4px 0 0; color: #8893a2; font-size: 12px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
.outline-item a { display: inline-block; margin-top: 4px; color: #4f7ba8; font-size: 11px; }
.open-questions { margin-bottom: 16px; padding: 15px; border: 1px solid #ede8dd; border-radius: 9px; background: #fdfbf5; color: #9c8863; }
.open-questions h3 { margin: 0 0 9px; font-size: 12px; }
.open-questions p { margin: 5px 0 0; font-size: 11px; line-height: 1.8; }
.confirm-outline { width: 100%; padding: 11px; border: 1px solid #d5e1ef; border-radius: 8px; background: #eaf0f8; color: #486d99; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.confirmed-note { margin: 8px 0; font-size: 12px; line-height: 1.8; color: #538169; }
.scope-list { margin: 0; }
.scope-list > div { display: grid; grid-template-columns: 62px minmax(0, 1fr); gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f3f6; font-size: 11px; line-height: 1.8; }
.scope-list > div:last-child { border-bottom: 0; }
.scope-list dt { color: #a2abb8; }
.scope-list dd { margin: 0; color: #6c7b8d; overflow-wrap: anywhere; }
.scope-list dd.pending { color: #bcc3cc; }
.edit-settings { margin-top: 12px; padding: 7px 10px; border: 1px solid #e2e7ee; border-radius: 6px; background: #fafbfc; color: #8294a9; font: inherit; font-size: 11px; cursor: pointer; }
@media (max-width: 1050px) { .pre-workspace { grid-template-columns: minmax(0, 1fr) 315px; } .discussion-inner { padding: 22px; } .preset-wrap { margin-left: 0; } .preset-grid { gap: 9px; } .composer-wrap { padding: 10px 18px; } .composer-mode i, .composer-mode > span:last-child { display: none; } .rail-header { padding: 20px 16px 15px; } .rail-scroll { padding: 14px; } }
@media (max-width: 760px) { .pre-workspace { grid-template-columns: minmax(0, 1fr); height: auto; } .discussion { height: 660px; } .outline-rail { border-top: 1px solid #e6e9ef; border-left: 0; height: 610px; } .discussion-inner { padding: 20px 16px; } .preset-grid { grid-template-columns: minmax(0, 1fr); } .brief-copy h2 { font-size: 19px; } .brief-logo { display: none; } .composer-wrap { padding: 10px 14px; } }
@media (prefers-reduced-motion: reduce) { .thinking-dot { animation: none; } }
</style>
