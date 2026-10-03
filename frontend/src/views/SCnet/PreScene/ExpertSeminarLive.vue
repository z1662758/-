<template>
  <main class="seminar-page">
    <div class="seminar-wrap">
      <div class="page-kicker"><span class="kicker-mark"></span> SCnet / 专家协同研讨</div>

      <section class="hero" aria-labelledby="seminar-title">
        <div class="hero-content">
          <div class="hero-label">EXPERT SEMINAR · 智能协同</div>
          <h1 id="seminar-title">让专业判断，在研讨中形成</h1>
          <p>围绕供应链问题发起结构化研讨。三类专家分别给出观点，主持人梳理共识、分歧与待核验问题，让每一步判断有据可循。</p>
          <div class="hero-actions">
            <button class="hero-primary" type="button" @click="focusQuestion">发起研讨 <span aria-hidden="true">↗</span></button>
            <button class="hero-secondary" type="button" @click="scrollToHistory">查看历史研讨 <span aria-hidden="true">→</span></button>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true"><span></span><span></span><span></span><i></i></div>
      </section>

      <section class="overview" aria-label="研讨概览">
        <div class="metric"><strong>{{ history.length }}</strong><span>研讨总数</span></div>
        <div class="metric"><strong>{{ completedCount }}</strong><span>已完成研讨</span></div>
        <div class="metric"><strong>{{ runningCount }}</strong><span>正在进行</span></div>
        <div class="metric"><strong>3</strong><span>协同专家角色</span></div>
      </section>

      <div class="workspace-grid">
        <section ref="questionSection" class="start-panel" aria-labelledby="question-title">
          <div class="section-heading"><div><span class="section-index">01 / START</span><h2 id="question-title">发起一场研讨</h2></div><span class="heading-note">从一个明确的问题开始</span></div>
          <label class="field-label" for="seminar-question">你希望专家讨论什么？</label>
          <el-input ref="questionInput" id="seminar-question" v-model="question" type="textarea" :rows="5"
                    maxlength="2000" show-word-limit placeholder="例如：未来一年某来源国供应中断，会怎样影响采购与运输？"
                    @keydown.ctrl.enter="submit" />
          <div class="form-bottom">
            <div class="scenario-field"><label for="seminar-scenario">研讨场景</label>
              <el-select id="seminar-scenario" v-model="scenario" aria-label="研讨场景">
                <el-option label="铀供应链" value="uranium" />
                <el-option label="汽车供应链" value="auto" />
              </el-select>
            </div>
            <el-button class="submit-button" type="primary" :loading="submitting" :disabled="!question.trim()" @click="submit">开始研讨 <span v-if="!submitting">↗</span></el-button>
          </div>
          <div class="process-note"><span class="note-dot"></span>供应风险 → 运输与地缘 → 采购与市场 → 主持人综合</div>
          <p class="boundary-note">专家仅依据可获得的资料作答；证据不足时会明确说明。</p>
          <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="alert" />
        </section>

        <section ref="historySection" class="history-panel" aria-labelledby="history-title">
          <div class="section-heading"><div><span class="section-index">02 / ARCHIVE</span><h2 id="history-title">最近研讨</h2></div><span class="heading-note">{{ history.length }} 条记录</span></div>
          <div v-if="!history.length" class="empty-history"><span>◎</span><strong>还没有研讨记录</strong><p>发起第一场研讨后，结果会保存在这里。</p></div>
          <div v-else class="history-list">
            <button v-for="item in history.slice(0, 8)" :key="item.seminar_id" class="history-row" :class="{ selected: item.seminar_id === active?.seminar_id }" type="button" @click="open(item.seminar_id, true)">
              <span class="history-main"><strong>{{ item.question }}</strong><small>{{ scenarioText(item.scenario) }} · {{ formatDate(item.created_at) }}</small></span>
              <span class="status-pill" :class="`is-${item.status}`">{{ statusText(item.status) }}</span>
            </button>
          </div>
        </section>
      </div>

      <section ref="resultSection" class="discussion" aria-labelledby="discussion-title" aria-live="polite">
        <div class="section-heading discussion-heading"><div><span class="section-index">03 / DISCUSSION</span><h2 id="discussion-title">研讨过程与结论</h2></div><span v-if="active" class="status-pill" :class="`is-${active.status}`">{{ statusText(active.status) }}</span></div>
        <div v-if="!active" class="discussion-empty"><div class="empty-orbit" aria-hidden="true"><span>✦</span></div><h3>等待你的第一个问题</h3><p>发起研讨或打开历史记录，即可在这里查看专家观点与综合结论。</p></div>
        <template v-else>
          <div class="discussion-topic"><span>{{ scenarioText(active.scenario) }}</span><h3>{{ active.question }}</h3><small>{{ formatDate(active.created_at) }}</small></div>
          <div v-if="active.status === 'running'" class="running-strip"><span class="pulse-dot"></span><div><strong>{{ phaseText(active.phase) }}</strong><small>专家观点会随研讨进展逐步出现</small></div></div>
          <el-alert v-if="active.error" :title="active.error" type="error" show-icon :closable="false" class="result-error" />
          <div v-if="active.opinions?.length" class="opinion-grid">
            <article v-for="(opinion, index) in active.opinions" :key="opinion.expert" class="opinion"><div class="opinion-top"><span class="expert-number">0{{ index + 1 }}</span><h4>{{ opinion.expert }}</h4><span class="opinion-label">专家观点</span></div><p>{{ opinion.content }}</p></article>
          </div>
          <article v-if="active.conclusion" class="conclusion"><div class="conclusion-label"><span>✦</span> 主持人综合结论</div><p>{{ active.conclusion }}</p></article>
          <div v-if="active.status === 'running' && !active.opinions?.length" class="waiting-opinions"><span class="loading-ring"></span>正在整理资料，专家观点即将呈现…</div>
          <details v-if="active.evidence?.length" class="evidence"><summary>本次参考资料 <strong>{{ active.evidence.length }}</strong> 条 <span>展开查看 ↓</span></summary><ul><li v-for="(item, index) in active.evidence" :key="item.id || index"><a v-if="item.source" :href="item.source" target="_blank" rel="noopener noreferrer">{{ item.title || item.id || '未命名资料' }}</a><span v-else>{{ item.title || item.id || '未命名资料' }}</span><small>{{ item.published_at }}</small></li></ul></details>
        </template>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { getExpertSeminar, listExpertSeminars, startExpertSeminar } from '@/api/expertSeminar'

const question = ref('')
const scenario = ref('uranium')
const active = ref(null)
const history = ref([])
const error = ref('')
const submitting = ref(false)
const questionSection = ref(null)
const questionInput = ref(null)
const historySection = ref(null)
const resultSection = ref(null)
const completedCount = computed(() => history.value.filter(item => item.status === 'completed').length)
const runningCount = computed(() => history.value.filter(item => item.status === 'running').length)
let timer = null
let selectedId = ''

const statusText = value => ({ running: '研讨中', completed: '已完成', failed: '未完成' }[value] || '未知状态')
const scenarioText = value => value === 'auto' ? '汽车供应链' : '铀供应链'
const phaseText = value => ({ preparing: '正在准备研讨资料', synthesis: '主持人正在梳理结论', completed: '研讨已完成' }[value] || (value ? `${value}正在分析` : '研讨进行中'))
const formatDate = value => value ? value.replace('T', ' ').slice(0, 16) : '—'
const payload = response => response?.data || response

function focusQuestion() {
  questionSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  nextTick(() => questionInput.value?.focus())
}
function scrollToHistory() { historySection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

async function loadHistory() {
  try { history.value = payload(await listExpertSeminars())?.items || [] }
  catch (e) { error.value = e.message || '历史记录加载失败' }
}

async function open(id, scroll = false) {
  selectedId = id
  if (timer) clearTimeout(timer)
  timer = null
  error.value = ''
  try {
    const result = payload(await getExpertSeminar(id))
    if (selectedId !== id) return
    active.value = result
    if (scroll) nextTick(() => resultSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    if (result?.status === 'running') timer = setTimeout(() => open(id), 2000)
    else loadHistory()
  } catch (e) {
    if (selectedId === id) error.value = e.message || '研讨记录读取失败'
  }
}

async function submit() {
  if (!question.value.trim() || submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    const result = payload(await startExpertSeminar(question.value.trim(), scenario.value))
    if (!result?.seminar_id) throw new Error('研讨启动后未返回会话编号')
    active.value = result
    question.value = ''
    await loadHistory()
    await open(result.seminar_id, true)
  } catch (e) {
    error.value = e.message || '研讨启动失败'
  } finally {
    submitting.value = false
  }
}

onMounted(loadHistory)
onBeforeUnmount(() => { if (timer) clearTimeout(timer); selectedId = '' })
</script>

<style scoped>
.seminar-page{min-height:100%;padding:30px 28px 64px;box-sizing:border-box;background:#f1f5fb;color:#172a48;font-family:'Microsoft YaHei','PingFang SC',sans-serif}
.seminar-wrap{max-width:1440px;margin:0 auto}.page-kicker{display:flex;align-items:center;gap:8px;margin:0 0 17px;color:#67809f;font-size:12px;letter-spacing:.08em;font-weight:600}.kicker-mark{width:7px;height:7px;border-radius:50%;background:#357bd5}
.hero{position:relative;display:flex;align-items:center;min-height:272px;overflow:hidden;border-radius:20px;background:linear-gradient(107deg,#112f67 0%,#1c54a5 57%,#2874d4 100%);box-shadow:0 15px 35px rgba(23,75,151,.13)}.hero-content{position:relative;z-index:2;padding:40px 50px;max-width:770px}.hero-label{color:#98c4ff;font-size:12px;font-weight:700;letter-spacing:.17em}.hero h1{margin:12px 0 13px;color:#fff;font-size:32px;line-height:1.3;letter-spacing:.015em}.hero p{margin:0;max-width:730px;color:#d5e6ff;font-size:14px;line-height:1.9}.hero-actions{display:flex;gap:11px;margin-top:24px}.hero-actions button{border-radius:8px;padding:10px 19px;font-size:14px;font-weight:700;cursor:pointer;transition:transform .2s,background .2s}.hero-actions button:hover{transform:translateY(-2px)}.hero-primary{background:#fff;border:1px solid #fff;color:#1b559e}.hero-secondary{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.39);color:#fff}.hero-actions span{margin-left:16px}.hero-art{position:absolute;inset:0 0 0 auto;width:41%;pointer-events:none}.hero-art span{position:absolute;border:1px solid rgba(165,208,255,.19);border-radius:50%}.hero-art span:nth-child(1){width:340px;height:340px;right:-78px;top:-150px;background:rgba(129,191,255,.12)}.hero-art span:nth-child(2){width:270px;height:270px;right:110px;bottom:-155px;background:rgba(126,183,252,.11)}.hero-art span:nth-child(3){width:160px;height:160px;right:225px;top:35px}.hero-art i{position:absolute;width:9px;height:9px;right:215px;top:110px;background:#91c9ff;border-radius:50%;box-shadow:0 0 0 12px rgba(131,198,255,.1),0 0 0 32px rgba(131,198,255,.06)}
.overview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:20px 0 28px}.metric{display:flex;flex-direction:column;gap:7px;padding:22px 25px;background:#fff;border:1px solid #e0e8f4;border-radius:14px;box-shadow:0 4px 14px rgba(31,67,116,.035)}.metric strong{color:#2373cc;font-size:30px;line-height:1;font-weight:750}.metric span{color:#6e7e93;font-size:13px}
.workspace-grid{display:grid;grid-template-columns:minmax(0,1.07fr) minmax(0,.93fr);gap:20px;align-items:stretch}.start-panel,.history-panel,.discussion{min-width:0;background:#fff;border:1px solid #dfe7f2;border-radius:16px;box-shadow:0 5px 20px rgba(31,67,116,.04)}.start-panel,.history-panel{padding:26px 28px}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:25px}.section-index{color:#2c7ed4;font-size:11px;font-weight:800;letter-spacing:.16em}.section-heading h2{margin:6px 0 0;font-size:21px;line-height:1.3;color:#142d52}.heading-note{font-size:12px;color:#8a9ab0;white-space:nowrap}.field-label,.scenario-field label{display:block;margin-bottom:10px;font-size:13px;font-weight:700;color:#314764}.start-panel :deep(.el-textarea__inner){min-height:146px!important;resize:vertical;border-radius:10px;padding:15px 16px;box-shadow:0 0 0 1px #dce5f0 inset;font-size:14px;line-height:1.7}.start-panel :deep(.el-textarea__inner:focus){box-shadow:0 0 0 1px #2879d2 inset}.form-bottom{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-top:18px}.scenario-field{min-width:180px}.scenario-field :deep(.el-select){width:100%}.scenario-field :deep(.el-select__wrapper){min-height:39px;border-radius:8px}.submit-button{height:40px!important;min-width:150px;border-radius:8px!important;background:#236fc4!important;border-color:#236fc4!important;font-weight:700!important}.submit-button span{margin-left:10px}.process-note{display:flex;align-items:center;gap:8px;margin-top:21px;padding:12px 14px;border-radius:8px;background:#f1f7ff;color:#456589;font-size:12px}.note-dot{width:7px;height:7px;flex:none;border-radius:50%;background:#3b8cdd}.boundary-note{margin:12px 0 0;color:#8a98a9;font-size:12px}.alert{margin-top:14px}
.history-list{max-height:355px;overflow:auto}.history-row{width:100%;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:15px 4px;text-align:left;border:0;border-bottom:1px solid #edf1f6;background:transparent;cursor:pointer}.history-row:last-child{border-bottom:0}.history-row:hover,.history-row.selected{background:#f4f8fe}.history-main{min-width:0}.history-main strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#245d9d;font-size:13px;font-weight:600}.history-main small{display:block;margin-top:8px;color:#93a1b3;font-size:11px}.status-pill{flex:none;display:inline-flex;align-items:center;border-radius:999px;padding:5px 10px;background:#ecf3fc;color:#3773b9;font-size:11px;font-weight:700}.status-pill.is-running{background:#e7f6ef;color:#24986b}.status-pill.is-failed{background:#fff2ef;color:#c76050}.empty-history{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:230px;color:#9aabc0;text-align:center}.empty-history span{font-size:35px;color:#a9c7e8}.empty-history strong{margin-top:9px;color:#506784;font-size:14px}.empty-history p{font-size:12px}
.discussion{margin-top:20px;padding:26px 28px}.discussion-heading{margin-bottom:22px}.discussion-empty{text-align:center;padding:28px 16px 43px;color:#899ab0}.empty-orbit{width:70px;height:70px;display:grid;place-items:center;margin:0 auto 15px;border:1px solid #bfd5f0;border-radius:50%;background:#f2f7fe;color:#3684d5;font-size:28px}.discussion-empty h3{margin:0 0 9px;font-size:16px;color:#415c7c}.discussion-empty p{margin:0;font-size:13px}.discussion-topic{padding:19px 21px;border-radius:10px;background:#f4f8fe;border-left:3px solid #347fd4}.discussion-topic>span{color:#3175bf;font-size:11px;font-weight:800}.discussion-topic h3{margin:8px 0 7px;color:#1b385d;font-size:17px;line-height:1.5}.discussion-topic small{color:#8b9bb0}.running-strip{display:flex;align-items:center;gap:12px;margin-top:18px;padding:12px 15px;border-radius:9px;background:#eaf7f1}.pulse-dot{width:9px;height:9px;border-radius:50%;background:#2eb381;box-shadow:0 0 0 5px rgba(46,179,129,.13);animation:pulse 1.8s infinite}.running-strip strong,.running-strip small{display:block}.running-strip strong{color:#257b5d;font-size:13px}.running-strip small{margin-top:4px;color:#669782;font-size:11px}.result-error{margin-top:16px}.opinion-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}.opinion{padding:19px;border:1px solid #e1eaf5;border-radius:11px;background:#fff}.opinion-top{display:flex;align-items:center;gap:9px;border-bottom:1px solid #edf2f8;padding-bottom:12px}.expert-number{color:#4b92dd;font-size:11px;font-weight:800}.opinion h4{margin:0;color:#24476e;font-size:13px}.opinion-label{margin-left:auto;color:#93a6bb;font-size:10px;white-space:nowrap}.opinion p,.conclusion p{margin:14px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;color:#455a73;font-size:13px}.conclusion{margin-top:18px;padding:22px 24px;border:1px solid #c9ddf4;border-radius:11px;background:linear-gradient(125deg,#f1f7ff,#fff)}.conclusion-label{color:#246fbd;font-size:14px;font-weight:800}.conclusion-label span{margin-right:6px}.conclusion p{color:#294866}.waiting-opinions{display:flex;align-items:center;gap:10px;padding:32px 4px;color:#7d91a8;font-size:13px}.loading-ring{width:16px;height:16px;border:2px solid #bfd9f5;border-top-color:#327ccc;border-radius:50%;animation:spin .8s linear infinite}.evidence{margin-top:18px;border-top:1px solid #e8eef6;padding-top:17px;color:#506884}.evidence summary{cursor:pointer;font-size:13px;font-weight:700}.evidence summary strong{color:#2574c4}.evidence summary span{float:right;font-size:11px;color:#8b9fb5}.evidence ul{padding-left:19px}.evidence li{margin:10px 0;font-size:12px;line-height:1.5}.evidence a{color:#2b71b8}.evidence small{margin-left:10px;color:#9aa9b8}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{50%{box-shadow:0 0 0 9px rgba(46,179,129,0)}}
@media(max-width:1050px){.workspace-grid{grid-template-columns:1fr}.opinion-grid{grid-template-columns:1fr}.hero-art{opacity:.5}}
@media(max-width:680px){.seminar-page{padding:16px 12px 38px}.hero{min-height:0}.hero-content{padding:29px 24px}.hero h1{font-size:25px}.hero p{font-size:13px}.hero-art{display:none}.overview{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0 18px}.metric{padding:16px}.metric strong{font-size:25px}.start-panel,.history-panel,.discussion{padding:20px 17px}.section-heading h2{font-size:18px}.heading-note{display:none}.form-bottom{align-items:stretch;flex-direction:column}.scenario-field{min-width:0}.submit-button{width:100%}.hero-actions{flex-wrap:wrap}.hero-actions button{font-size:12px}}
</style>
