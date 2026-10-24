<template>
  <div class="ka-workspace">
    <section class="ka-question">
      <div class="ka-heading"><div><h2>{{ scenario === 'uranium' ? '铀供应链' : '汽车供应链' }} · 问题分析</h2><p>先获取相关情报，再从混合数据中抽取能够支撑分析的内容。</p></div></div>
      <label for="ka-preset">选择常见问题</label>
      <select id="ka-preset" v-model="preset" @change="applyPreset">
        <option value="">自行填写问题</option>
        <option v-for="item in presets" :key="item.id" :value="item.id">{{ item.label }}</option>
      </select>
      <el-input v-model.trim="question" type="textarea" :rows="2" placeholder="请说明关注的国家、企业、运输路线、时间或具体风险" :disabled="loading" />
      <div class="ka-scope-controls">
        <label for="ka-focus">分析重点</label>
        <select id="ka-focus" v-model="focus" :disabled="loading"><option v-for="item in FOCUS_OPTIONS" :key="item.id" :value="item.id">{{ item.label }}</option></select>
        <label for="ka-target">关注对象</label>
        <input id="ka-target" v-model.trim="target" :disabled="loading" placeholder="可选：国家、企业或路线" />
      </div>
      <div class="ka-controls"><button type="button" :disabled="loading || !question" @click="runAnalysis">{{ loading ? '正在检索与分析…' : '获取情报并分析混合数据' }}</button><span v-if="progress">{{ progress }}</span></div>
      <p v-if="error" class="ka-error">{{ error }}</p>
    </section>

    <OpenSourceIntelligence v-if="artifact" :key="eventVersion" :artifact="artifact" :scenario="scenario" :initial-scope="hasAnalyzed ? 'relevant' : 'all'" :flow-layout="true" />
    <p v-else class="ka-empty">{{ eventLoading ? '正在载入开源情报…' : '尚未载入情报，请填写问题开始分析。' }}</p>

    <section class="ka-results">
      <div class="ka-heading"><div><h2>混合数据中的相关内容</h2><p>结果按当前场景和具体问题筛选，结合上方开源情报进行关联。</p></div><span v-if="hasAnalyzed">{{ results.length }} 条片段</span></div>
      <div v-if="hasAnalyzed" class="ka-summary">
        <strong>{{ analyzedQuestion }}</strong>
        <p>相关情报 {{ relevantEvents.length }} 条 · 已检索 {{ searchedCount }} 个数据集 · 找到 {{ results.length }} 条相关片段。</p>
        <small v-if="unparsedCount">另有 {{ unparsedCount }} 个数据集尚未完成文本解析，可在混合数据区查看。</small>
        <small v-if="failedCount">{{ failedCount }} 个数据集检索失败，本次结果尚未覆盖这些数据。</small>
      </div>
      <article v-for="(item, index) in results" :key="`${item.dataset}-${index}`" class="ka-evidence">
        <h3>{{ item.dataset }}</h3><p class="ka-excerpt">{{ item.text }}</p>
        <div v-if="item.events.length" class="ka-event-links"><span>关联情报：</span><span v-for="event in item.events" :key="event.eventId">{{ event.title }}</span></div>
        <small>检索方法：{{ item.method }} · 来源：原始数据集 {{ item.dataset }}</small>
      </article>
      <div v-if="!results.length" class="ka-empty">{{ hasAnalyzed ? '未找到直接相关的文件片段。请补充相关文件或调整问题中的具体对象。' : '填写问题后，相关文件内容会显示在这里。' }}</div>
    </section>
  </div>
</template>

<script setup>
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import request from '@/utils/request'
import { getKnowledgeBookList, queryKnowledgeBook } from '@/api/knowledgeBase'
import OpenSourceIntelligence from '../PreScene/OpenSourceIntelligence.vue'
import { FOCUS_OPTIONS, focusTerms, isFocusedEvidence, sceneTerms, targetAliases } from './relevance'

const props = defineProps({ scenario: { type: String, required: true }, refreshKey: { type: Number, default: 0 } })
const question = ref('')
const preset = ref('')
const focus = ref('transport')
const target = ref('')
const loading = ref(false)
const eventLoading = ref(false)
const error = ref('')
const progress = ref('')
const artifact = ref(null)
const eventVersion = ref(0)
const hasAnalyzed = ref(false)
const analyzedQuestion = ref('')
const results = ref([])
const relevantEvents = ref([])
const searchedCount = ref(0)
const unparsedCount = ref(0)
const failedCount = ref(0)
let generation = 0
let disposed = false
function cancelActiveWork() { generation += 1; loading.value = false; eventLoading.value = false; progress.value = '' }
onBeforeUnmount(() => { disposed = true; cancelActiveWork() })
onDeactivated(cancelActiveWork)
const presets = computed(() => props.scenario === 'uranium' ? [
  { id: 'kazakhstan-transport', label: '哈萨克斯坦铀供应运输中断', query: '哈萨克斯坦铀供应和运输路线有哪些中断风险？', focus: 'transport', target: '哈萨克斯坦' },
  { id: 'sanctions', label: '国际制裁对铀贸易的影响', query: '国际制裁会怎样影响铀贸易与核燃料供应？', focus: 'policy', target: '' },
  { id: 'china-supply', label: '中国铀进口与供应保障', query: '中国铀进口来源及供应保障有哪些相关证据？', focus: 'supply', target: '中国' },
] : [
  { id: 'chip-supply', label: '芯片供应中断对汽车企业的影响', query: '芯片供应中断会影响哪些汽车企业？', focus: 'supply', target: '芯片' },
  { id: 'red-sea-transport', label: '红海运输中断对零部件供应的影响', query: '红海运输中断对汽车零部件供应有哪些影响？', focus: 'transport', target: '红海' },
  { id: 'battery-supply', label: '动力电池原材料供应风险', query: '动力电池原材料供应有哪些风险？', focus: 'supply', target: '动力电池' },
])

function applyPreset() {
  const selected = presets.value.find((item) => item.id === preset.value)
  if (!selected) return
  question.value = selected.query
  focus.value = selected.focus
  target.value = selected.target
}

function terms(text) {
  const stop = new Set(['哪些', '什么', '怎样', '如何', '相关', '影响', '有哪', '哪些', '可以', '分析', '数据', '供应'])
  const words = String(text || '').toLowerCase().match(/[a-z0-9]{3,}|[\u4e00-\u9fff]{2,}/g) || []
  const output = new Set()
  for (const word of words) {
    if (/^[a-z0-9]+$/.test(word)) output.add(word)
    else for (let i = 0; i < word.length - 1; i += 1) if (!stop.has(word.slice(i, i + 2))) output.add(word.slice(i, i + 2))
  }
  return [...output]
}
function specificTerms(text) {
  const specificQuery = String(text || '').toLowerCase().replace(/供应中断|供应|中断|风险|影响|哪些|什么|怎样|如何|相关|汽车|企业|车企|可以|分析|数据|会/g, ' ')
  return terms(specificQuery)
}
function overlap(text, keywords) { const lower = String(text || '').toLowerCase(); return keywords.filter((term) => lower.includes(term)) }
function eventSourceText(event) { return [event.title, event.summary, event.description, event.contentExcerpt].join(' ') }
function eventTargetText(event) {
  const entities = Array.isArray(event.affectedEntities) ? event.affectedEntities.map((item) => typeof item === 'string' ? item : item?.name || '') : []
  const nodes = Array.isArray(event.affectedNodeNames) ? event.affectedNodeNames : []
  return [eventSourceText(event), event.location?.country, ...nodes, ...entities].join(' ')
}

function sceneAnchors(scene) {
  return scene === 'uranium'
    ? ['铀', 'uranium', 'u3o8', '核燃料', 'kazatomprom', 'cameco']
    : ['汽车', 'automotive', 'vehicle', '整车', '零部件', '动力电池']
}

async function fetchEvents(query, focusId = '', targetValue = '') {
  const response = await request.get('/scenario/expert/osint/events', { params: { scenario: props.scenario, question: query } })
  if (!response?.success) throw new Error(response?.message || '情报读取失败')
  let data = response.data || {}
  if (props.scenario === 'supply_chain') {
    // 旧版标准情报接口只读取铀登记表；汽车事件从汽车库读取，避免跨场景混入。
    const automotive = await request.get('/SCnet/automotiveKnowledge/osint')
    if (!automotive?.success) throw new Error('汽车情报读取失败')
    const keywords = specificTerms(query)
    const events = (automotive.data?.items || []).map((event) => {
      const content = `${event.title} ${event.summary} ${(event.company_ids || []).join(' ')}`
      const matchesScope = query && isFocusedEvidence({ scene: props.scenario, focus: focusId, target: targetValue, question: query, text: content })
      const matched = overlap(content, keywords.length ? keywords : sceneTerms(props.scenario))
      return {
        eventId: event.event_id, title: event.title, summary: event.summary || '', contentExcerpt: event.summary || '',
        riskType: event.event_type, status: event.event_state, severity: 'low', severityLabel: '未评估风险', severityScore: 0,
        occurredAt: event.event_date, publishedAt: event.event_date,
        location: { name: event.country || '', country: event.country || '', latitude: null, longitude: null, precision: 'unresolved' },
        affectedEntities: [], affectedNodeIds: [], affectedNodeNames: event.company_ids || [], affectedRouteIds: [],
        relevance: { score: matched.length, reason: matched.length ? '命中问题关键词' : '', matchedTerms: matched },
        isRelevant: Boolean(matchesScope),
        riskAssessment: { isEffective: false, impactSummary: event.summary || '' },
        sources: (event.sources || []).map((source) => ({ sourceName: source.name, sourceUrl: source.url, sourceTitle: event.title })),
        sourceType: 'knowledge_base',
      }
    })
    data = { ...data, events: [...events, ...(data.events || []).filter((event) => event.sourceType === 'imported')] }
  }
  if (query) {
    data = { ...data, events: (data.events || []).map((event) => {
      const content = eventSourceText(event)
      const relevant = isFocusedEvidence({ scene: props.scenario, focus: focusId, target: targetValue, question: query, text: content, targetText: eventTargetText(event) })
      return { ...event, isRelevant: relevant, relevance: { ...(event.relevance || {}), score: relevant ? 1 : 0, reason: relevant ? '场景、分析重点与关注对象均匹配' : '', matchedTerms: [] } }
    }) }
  }
  return { result: data, status: 'completed', provenance: { sourceType: query ? 'current_task' : 'fallback' } }
}

async function loadEvents() {
  const version = ++generation
  eventLoading.value = true
  try {
    const value = await fetchEvents('')
    if (!disposed && version === generation) { artifact.value = value; eventVersion.value += 1 }
  } catch (failure) { if (!disposed && version === generation) error.value = failure?.message || '情报载入失败' }
  finally { if (!disposed && version === generation) eventLoading.value = false }
}
onMounted(loadEvents)
onActivated(() => { if (!artifact.value && !eventLoading.value) loadEvents() })
watch(() => props.refreshKey, () => { if (!loading.value) loadEvents() })

async function runAnalysis() {
  const input = question.value.trim()
  if (!input || loading.value) return
  const version = ++generation
  loading.value = true
  error.value = ''
  results.value = []
  hasAnalyzed.value = false
  failedCount.value = 0
  searchedCount.value = 0
  progress.value = '正在按问题筛选开源情报…'
  try {
    const events = await fetchEvents(input, focus.value, target.value)
    if (disposed || version !== generation) return
    artifact.value = events
    eventVersion.value += 1
    relevantEvents.value = (events.result.events || []).filter((event) => event.isRelevant && !['RESOLVED', 'RECOVERED', 'SUPERSEDED'].includes(String(event.status || '').toUpperCase()))
    const list = await getKnowledgeBookList()
    if (!list.success) throw new Error(list.message || '读取混合数据失败')
    const books = list.data.filter((book) => book.is_analyzed || book.status === 'finished' || book.status === 'completed')
    unparsedCount.value = list.data.length - books.length
    const anchors = sceneTerms(props.scenario)
    const focusWords = focusTerms(focus.value)
    const targets = targetAliases(target.value, input)
    const eventTerms = [...new Set(relevantEvents.value.slice(0, 2).flatMap((event) => terms(`${event.title} ${event.summary || ''}`)).filter((term) => term.length >= 2))].slice(0, 8)
    const query = `${anchors.slice(0, 3).join(' ')} ${focusWords.slice(0, 5).join(' ')} ${targets.join(' ')} ${input} ${eventTerms.join(' ')}`
    const keywords = specificTerms(input)
    let cursor = 0
    const collected = []
    async function worker() {
      while (cursor < books.length && !disposed && version === generation) {
        const book = books[cursor++]
        const name = book.book_name || book.name
        try {
          const result = await queryKnowledgeBook({ book_name: name, query, top_k: 5, similarity_threshold: 0.04 })
          if (!result.success) throw new Error(result.message)
          const meta = result.data?.retrieval_meta || {}
          for (const text of result.data?.chunks || []) {
            const questionMatches = overlap(text, keywords)
            if (keywords.length && !questionMatches.length) continue
            if (!isFocusedEvidence({ scene: props.scenario, focus: focus.value, target: target.value, question: input, text })) continue
            const linked = relevantEvents.value.filter((event) => isFocusedEvidence({ scene: props.scenario, focus: focus.value, target: target.value, question: input, text: eventSourceText(event), targetText: eventTargetText(event) }) && overlap(text, terms(eventSourceText(event))).length >= 2).slice(0, 3)
            collected.push({ dataset: name, text, events: linked, method: meta.chroma_hit_count > 0 ? '场景、重点与对象关键词筛选后的 ChromaDB 片段' : '场景、重点与对象关键词筛选后的文本片段', score: questionMatches.length + linked.length })
          }
        } catch { if (!disposed && version === generation) failedCount.value += 1 }
        if (!disposed && version === generation) { searchedCount.value += 1; progress.value = `正在检索混合数据 ${searchedCount.value}/${books.length}` }
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, books.length) }, worker))
    if (disposed || version !== generation) return
    results.value = collected.sort((a, b) => b.score - a.score).slice(0, 30)
    analyzedQuestion.value = input
    hasAnalyzed.value = true
    eventVersion.value += 1
  } catch (failure) { if (!disposed && version === generation) error.value = failure?.message || '分析失败，请重试' }
  finally { if (!disposed && version === generation) { loading.value = false; eventLoading.value = false; progress.value = '' } }
}
</script>

<style scoped>
.ka-workspace { padding: 20px; background: #f5f7fb; color: #1e293b; }
.ka-question, .ka-results { padding: 22px; margin-bottom: 20px; border: 1px solid #dce4ef; border-radius: 14px; background: #fff; }
.ka-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.ka-heading h2 { margin: 0 0 6px; font-size: 18px; }
.ka-heading p, .ka-heading > span { margin: 0; color: #64748b; font-size: 13px; }
.ka-question label { display: inline-block; margin-right: 12px; font-size: 12px; color: #64748b; }
.ka-question select { max-width: 100%; margin-bottom: 12px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; }
.ka-controls { display: flex; gap: 16px; align-items: center; margin-top: 12px; }
.ka-controls button { padding: 9px 18px; border: 0; border-radius: 8px; background: #2563eb; color: #fff; cursor: pointer; }
.ka-controls button:disabled { opacity: .5; cursor: default; }
.ka-controls span, .ka-summary small { color: #64748b; font-size: 12px; }
.ka-error { color: #b91c1c; font-size: 13px; }
.ka-summary { padding: 14px 16px; border-radius: 8px; background: #eff6ff; margin-bottom: 14px; }
.ka-summary strong { font-size: 14px; }
.ka-summary p { font-size: 13px; color: #475569; }
.ka-summary small { display: block; margin-top: 5px; }
.ka-evidence { padding: 16px 0; border-bottom: 1px solid #e2e8f0; }
.ka-evidence h3 { font-size: 14px; margin: 0 0 10px; }
.ka-excerpt { white-space: pre-wrap; line-height: 1.7; font-size: 13px; overflow-wrap: anywhere; }
.ka-evidence small { display: block; font-size: 11px; color: #64748b; margin-top: 10px; }
.ka-event-links { display: flex; flex-wrap: wrap; gap: 7px; color: #1d4ed8; font-size: 12px; }
.ka-event-links span:not(:first-child) { padding: 3px 8px; border-radius: 5px; background: #eff6ff; }
.ka-empty { padding: 24px; text-align: center; color: #64748b; font-size: 13px; }
</style>
