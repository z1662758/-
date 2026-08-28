<template>
  <div class="overview-page mid-stage-bg analysis-workspace">
    <header class="report-toolbar glass-panel">
      <div class="report-heading">
        <span>DECISION REPORT</span>
        <div><h1>供应链决策报告</h1><p>基于当前实验结果，归纳压力窗口、策略效果与执行边界</p></div>
      </div>
      <div class="report-actions">
        <el-select
          v-if="!isAuto"
          v-model="selectedReportId"
          class="experiment-select"
          size="small"
          placeholder="选择实验"
          @change="changeExperiment"
        >
          <el-option v-for="item in history" :key="item.experiment_id" :label="experimentOptionLabel(item)" :value="item.experiment_id" />
        </el-select>
        <span class="report-updated">更新于 {{ generatedAt }}</span>
        <el-button :disabled="exportingPdf" @click="refreshReport">
          <el-icon><Refresh /></el-icon>刷新结论
        </el-button>
        <el-button type="primary" :loading="exportingPdf" @click="exportPdf">
          <el-icon><Download /></el-icon>生成 PDF
        </el-button>
      </div>
    </header>

    <div ref="reportRef" class="pdf-report">
    <AnalysisPageHero
      eyebrow="决策结论报告"
      :title="reportTitle"
      :headline="reportHeadline"
      :tags="heroTags"
    >
      <template #side>
        <article class="overview-status-card">
          <span>{{ reportVm ? '推荐动作' : '综合判断' }}</span>
          <strong>{{ reportSpotlight.title }}</strong>
          <p>{{ reportSpotlight.text }}</p>
        </article>
      </template>
    </AnalysisPageHero>

    <main class="overview-content">
      <section id="report-summary" class="overview-verdict glass-panel">
        <div class="overview-section-head">
          <div>
            <span class="overview-kicker">01 · 总体结论</span>
            <h3>{{ reportVm?.reportBriefBlocks?.[0]?.title || '先控制风险暴露，再追求局部成本最优' }}</h3>
          </div>
          <el-tag :type="overallRiskTag.type" effect="dark">{{ overallRiskTag.label }}</el-tag>
        </div>
        <p class="overview-lead">{{ overallConclusion }}</p>
        <div class="verdict-grid">
          <article v-for="item in verdictItems" :key="item.label" class="verdict-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.detail }}</p>
          </article>
        </div>
      </section>

      <section id="report-actions" class="overview-grid">
        <article class="action-panel glass-panel">
          <div class="overview-section-head compact">
            <div>
              <span class="overview-kicker">02 · 决策建议</span>
              <h3>按时序推进的行动方案</h3>
            </div>
          </div>
          <div class="action-list">
            <div v-for="(item, index) in actions" :key="item.title" class="action-row">
              <span class="action-index">0{{ index + 1 }}</span>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.detail }}</p>
              </div>
              <el-tag size="small" :type="item.type" effect="light">{{ item.tag }}</el-tag>
            </div>
          </div>
        </article>

        <article class="evidence-panel glass-panel">
          <div class="overview-section-head compact">
            <div>
              <span class="overview-kicker">03 · 证据链</span>
              <h3>结论如何形成</h3>
            </div>
          </div>
          <div class="evidence-list">
            <div v-for="item in evidence" :key="item.title" class="evidence-row">
              <el-icon :class="`evidence-icon ${item.tone}`"><component :is="item.icon" /></el-icon>
              <div><strong>{{ item.title }}</strong><p>{{ item.detail }}</p><small v-if="item.output">产出：{{ item.output }}</small></div>
            </div>
          </div>
        </article>
      </section>

      <template v-if="reportVm">
        <section id="report-windows" class="report-section glass-panel">
          <div class="overview-section-head compact">
            <div><span class="overview-kicker">04 · 过程演化</span><h3>年度压力窗口与关键转折</h3></div>
            <span class="section-meta">覆盖 {{ reportVm.focusWindowCards.length }} 个年度窗口</span>
          </div>
          <div class="window-table">
            <div class="window-row window-head">
              <span>年份 / 状态</span><span>触发事件</span><span>风险</span><span>库存</span><span>缺口</span><span>关键链路</span>
            </div>
            <div v-for="item in reportVm.focusWindowCards" :key="item.id" class="window-row">
              <span><strong>{{ item.year }}</strong><el-tag size="small" :type="toneType(item.tone)" effect="plain">{{ item.stageLabel }}</el-tag></span>
              <span :title="item.headline">{{ item.headline }}</span>
              <span>{{ item.riskText }}</span><span>{{ item.inventoryText }}</span><span>{{ item.unmetText }}</span>
              <span :title="item.routeText">{{ item.routeText }}</span>
            </div>
          </div>
        </section>

        <section id="report-strategies" class="report-section glass-panel">
          <div class="overview-section-head compact">
            <div><span class="overview-kicker">05 · 策略评估</span><h3>候选动作排序与相对改善</h3></div>
            <span class="section-meta">基线 {{ reportVm.decisionSummary.baselineScoreText }}</span>
          </div>
          <div class="strategy-table">
            <article v-for="(item, index) in reportVm.decisionSummary.candidateRows" :key="item.id" :class="['strategy-row', { best: item.isBest }]">
              <span class="strategy-rank">{{ index + 1 }}</span>
              <div><strong>{{ item.name }}</strong><p>{{ item.note || item.outcome }}</p></div>
              <div class="strategy-score"><strong>{{ item.scoreText }}</strong><span>{{ item.improvementText }}</span></div>
              <el-tag v-if="item.isBest" type="success" effect="dark" size="small">推荐</el-tag>
            </article>
          </div>
        </section>

        <section id="report-risks" class="report-detail-grid">
          <article class="report-section glass-panel">
            <div class="overview-section-head compact"><div><span class="overview-kicker">06 · 结构韧性</span><h3>期末供应结构与集中度</h3></div></div>
            <div class="structure-grid">
              <div v-for="item in reportVm.structureSummaryCards" :key="item.label" class="structure-card">
                <span>{{ item.label }}</span><strong>{{ item.value }}</strong><p>{{ item.detail }}</p>
              </div>
            </div>
          </article>
          <article class="report-section glass-panel">
            <div class="overview-section-head compact"><div><span class="overview-kicker">07 · 监测清单</span><h3>触发策略调整的风险信号</h3></div></div>
            <div class="alert-list">
              <div v-for="(item, index) in reportVm.alerts" :key="item" class="alert-row"><span>{{ index + 1 }}</span><p>{{ item }}</p></div>
              <el-empty v-if="!reportVm.alerts.length" description="当前实验没有新增风险告警" :image-size="54" />
            </div>
          </article>
        </section>

        <section id="report-conclusion" class="final-conclusion">
          <span>08 · 综合决策</span>
          <h2>{{ reportVm.decisionSummary.recommendedStrategy }}</h2>
          <p>{{ reportVm.decisionSummary.headline }}</p>
          <div><strong>适用场景</strong>{{ reportVm.decisionSummary.scenarioLabel }} · {{ reportVm.decisionSummary.timeLabel }} · {{ reportVm.decisionSummary.eventName }}</div>
        </section>
      </template>

    </main>
    </div>
  </div>
</template>

<script setup>
import { computed, markRaw, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Download, Grid, Promotion, Refresh, TrendCharts } from '@element-plus/icons-vue'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { buildUraniumReportViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'
import AnalysisPageHero from './components/shared/AnalysisPageHero.vue'
import './components/shared/midStage.css'

const route = useRoute()
const reportRef = ref(null)
const exportingPdf = ref(false)
const generatedAt = ref(new Date().toLocaleString('zh-CN', { hour12: false }))
const selectedReportId = ref('')
const isAuto = computed(() => route.query.scenario === 'supply_chain')
const uraniumStore = useUraniumDemoStore()
const snapshotStore = useAnalysisSnapshotStore()
const { history, selectedExperiment, selectedExperimentId } = storeToRefs(uraniumStore)
const reportVm = computed(() => isAuto.value ? null : buildUraniumReportViewModel({
  experiment: selectedExperiment.value,
  history: history.value,
  snapshot: snapshotStore.getActiveSnapshot()
}))
const reportTitle = computed(() => reportVm.value?.reportHero?.title || '汽车供应链应急决策结论')
const reportHeadline = computed(() => reportVm.value?.reportHero?.headline || '当前建议优先稳定关键节点，再根据情景变化动态调整资源配置。')
const reportSpotlight = computed(() => reportVm.value?.reportHero?.spotlight || {
  title: '建议干预',
  text: '风险已进入需要主动调度的区间，继续等待将放大缺口和履约压力。'
})
const heroTags = computed(() => reportVm.value?.reportHero?.tags || [
  { label: '分析对象', value: isAuto.value ? '汽车供应链' : '铀供应链', type: 'info' },
  { label: '结论状态', value: '可执行', type: 'success' },
  { label: '更新时间', value: '当前实验快照', type: 'warning' }
])
const overallConclusion = computed(() => reportVm.value?.reportBriefBlocks?.[0]?.text
  || '综合博弈关系、决策路径和多情景结果，当前应优先保障核心需求与关键通道，避免单点失效向网络扩散。')
const overallRiskTag = computed(() => {
  const tone = reportVm.value?.reportBriefBlocks?.[0]?.tone
  const label = reportVm.value?.reportHero?.title?.split('·').pop()?.trim()
  return {
    label: label || '需要干预',
    type: toneType(tone) === 'info' ? 'warning' : toneType(tone)
  }
})
const verdictItems = computed(() => reportVm.value?.keyResultCards?.map((item) => ({
  label: item.label,
  value: item.value,
  detail: item.hint
})) || (isAuto.value ? [
  { label: '首要目标', value: '保障产能', detail: '优先确保关键工厂和核心订单的连续供给。' },
  { label: '主要风险', value: '产能缺口', detail: '上游波动可能沿节点放大并影响交付。' },
  { label: '推荐策略', value: '协同调度', detail: '联动库存、产能与替代供应商进行动态分配。' }
] : [
  { label: '首要目标', value: '保障核燃料', detail: '优先保障核心需求与关键交付窗口。' },
  { label: '主要风险', value: '供给收紧', detail: '单一来源和跨境通道暴露是主要脆弱点。' },
  { label: '推荐策略', value: '多源调度', detail: '保留替代来源，同时控制库存与运输成本。' }
]))
const actionTitles = ['稳定主供与核心通道', '前置配置替代资源', '滚动校准库存与合同', '建立风险触发机制']
const actions = computed(() => reportVm.value?.recommendations?.map((item, index) => ({
  title: actionTitles[index] || `行动建议 ${index + 1}`,
  detail: item,
  tag: index === 0 ? '优先执行' : index === 1 ? '同步准备' : '持续跟踪',
  type: index === 0 ? 'danger' : index === 1 ? 'warning' : 'success'
})) || (isAuto.value ? [
  { title: '锁定关键产能', detail: '将有限资源优先配置至核心工厂与高优先级订单。', tag: '立即执行', type: 'danger' },
  { title: '启用替代供应', detail: '提前校验第二供应源，降低单节点中断的连锁影响。', tag: '优先准备', type: 'warning' },
  { title: '滚动监测缺口', detail: '以短周期更新需求、库存和产能状态，触发动态重算。', tag: '持续跟踪', type: 'success' }
] : [
  { title: '保障核心需求', detail: '优先锁定核心用户和关键交付窗口，避免供给中断。', tag: '立即执行', type: 'danger' },
  { title: '分散关键通道', detail: '校验替代供应商和运输路径，降低单点暴露。', tag: '优先准备', type: 'warning' },
  { title: '滚动调整库存', detail: '结合价格、库存和情景概率，动态修正补库节奏。', tag: '持续跟踪', type: 'success' }
]))
const evidenceIcons = [markRaw(TrendCharts), markRaw(Grid), markRaw(Promotion)]
const evidenceTones = ['green', 'blue', 'orange']
const evidence = computed(() => reportVm.value?.analysisRecoveryCards?.slice(1).map((item, index) => ({
  title: `${item.step} · ${item.title}`,
  detail: item.text,
  output: item.output,
  icon: evidenceIcons[index],
  tone: evidenceTones[index]
})) || [
  { title: '博弈论分析', detail: '识别参与方的利益冲突与稳定策略，明确协同边界。', icon: markRaw(Grid), tone: 'blue' },
  { title: '决策树分析', detail: '对比不干预基线与调控路径，验证动作的结果差异。', icon: markRaw(Promotion), tone: 'orange' },
  { title: '情景分析', detail: '在不同扰动窗口下复核结论的稳健性与适用范围。', icon: markRaw(TrendCharts), tone: 'green' }
])

function toneType(tone) {
  return ({ danger: 'danger', warning: 'warning', success: 'success' })[tone] || 'info'
}

async function loadCurrentExperiment(force = false) {
  if (isAuto.value) return
  await uraniumStore.ensureInitialized()
  const targetId = selectedExperimentId.value || history.value[0]?.experiment_id || ''
  if (!targetId || (!force && selectedExperiment.value?.experiment_id === targetId)) return
  await uraniumStore.loadExperiment(targetId)
}

onMounted(() => loadCurrentExperiment().catch(() => {}))
watch(selectedExperimentId, (id) => {
  selectedReportId.value = id || ''
  loadCurrentExperiment(true).catch(() => {})
}, { immediate: true })

function experimentOptionLabel(item) {
  return item.experiment_name || item.name || item.label || `实验 ${String(item.experiment_id || '').slice(-6)}`
}

async function changeExperiment(id) {
  if (!id) return
  await uraniumStore.loadExperiment(id)
  generatedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })
}

async function refreshReport() {
  await loadCurrentExperiment(true).catch(() => {})
  generatedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })
  ElMessage.success('决策结论已刷新')
}

async function exportPdf() {
  if (!reportRef.value || exportingPdf.value) return
  exportingPdf.value = true
  try {
    const { default: html2pdf } = await import('html2pdf.js')
    const scenarioName = isAuto.value ? '汽车供应链' : '铀供应链'
    await html2pdf().set({
      margin: [10, 10, 12, 10],
      filename: `${scenarioName}决策分析报告.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }).from(reportRef.value).save()
    ElMessage.success('PDF 报告已生成')
  } catch (error) {
    console.error('[DecisionReport] PDF export failed:', error)
    ElMessage.error('PDF 生成失败，请稍后重试')
  } finally {
    exportingPdf.value = false
  }
}
</script>

<style scoped>
.overview-page { min-height: 100%; padding: 8px 8px 32px; overflow: visible; }
.report-toolbar { position: sticky; z-index: 10; top: 0; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 11px 14px; margin-bottom: 10px; border-color: #dbe4ee; background: rgba(255,255,255,.96); backdrop-filter: blur(12px); }
.report-heading { display: flex; align-items: center; gap: 12px; min-width: 0; }
.report-heading > span { padding: 6px 8px; border-radius: 7px; background: #eff6ff; color: #2563eb; font-size: 9px; font-weight: 800; letter-spacing: .08em; white-space: nowrap; }
.report-heading h1 { margin: 0; color: #0f172a; font-size: 18px; }
.report-heading p { margin: 3px 0 0; color: #64748b; font-size: 11px; }
.report-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.experiment-select { width: 190px; }
.report-updated { margin-right: 4px; color: #94a3b8; font-size: 10px; white-space: nowrap; }
.pdf-report { width: 100%; padding: 0; background: transparent; box-sizing: border-box; }
.overview-content { padding: 0 8px; }
.overview-verdict { padding: 18px 20px; margin-top: 12px; }
.overview-section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.overview-section-head.compact { margin-bottom: 14px; }
.overview-kicker { color: #64748b; font-size: var(--mid-fs-micro); font-weight: 800; letter-spacing: .08em; }
h3 { margin: 5px 0 0; color: #0f172a; font-size: 17px; }
.overview-lead { max-width: 940px; margin: 16px 0; color: #334155; font-size: 13px; line-height: 1.8; }
.verdict-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.verdict-item { padding: 13px 14px; border: 1px solid #e2e8f0; border-left: 3px solid #3b82f6; background: rgba(248,250,252,.72); border-radius: 8px; }
.verdict-item span, .action-row p, .evidence-row p { display: block; margin: 0; color: #64748b; font-size: 11px; line-height: 1.65; }
.verdict-item strong { display: block; margin: 4px 0; color: #0f172a; font-size: 16px; }
.overview-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 12px; margin-top: 12px; }
.action-panel, .evidence-panel { padding: 17px 18px; }
.action-list, .evidence-list { display: grid; gap: 2px; }
.action-row, .evidence-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid #edf1f5; }
.action-index { color: #3b82f6; font: 800 12px var(--mid-font-mono); }
.action-row > div, .evidence-row > div { flex: 1; min-width: 0; }
.action-row strong, .evidence-row strong { display: block; color: #1e293b; font-size: 13px; margin-bottom: 2px; }
.evidence-row small { display: block; margin-top: 4px; color: #2563eb; font-size: 10px; line-height: 1.5; }
.action-row .el-tag { flex-shrink: 0; }
.evidence-icon { flex: 0 0 30px; width: 30px; height: 30px; border-radius: 8px; font-size: 16px; justify-content: center; }
.evidence-icon.blue { color: #2563eb; background: #eff6ff; }.evidence-icon.orange { color: #d97706; background: #fffbeb; }.evidence-icon.green { color: #16a34a; background: #f0fdf4; }
.overview-status-card { min-width: 220px; padding: 15px 17px; border: 1px solid rgba(245,158,11,.25); border-radius: 9px; background: linear-gradient(135deg, #fffaf0, #fff); }
.overview-status-card span { color: #92400e; font-size: 11px; font-weight: 700; }.overview-status-card strong { display: block; margin: 5px 0; color: #b45309; font-size: 20px; }.overview-status-card p { margin: 0; color: #78350f; font-size: 11px; line-height: 1.65; }
.report-section { margin-top: 12px; padding: 18px; }
.section-meta { color: #64748b; font-size: 11px; }
.window-table { overflow: hidden; border: 1px solid #e2e8f0; border-radius: 9px; }
.window-row { display: grid; grid-template-columns: 118px minmax(150px,1.5fr) 80px 90px 90px minmax(150px,1.2fr); align-items: center; min-height: 43px; border-top: 1px solid #edf2f7; }
.window-row:first-child { border-top: 0; }
.window-row:not(.window-head):hover { background: #f8fbff; }
.window-row > span { min-width: 0; padding: 8px 10px; overflow: hidden; color: #475569; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.window-row > span:first-child { display: flex; align-items: center; gap: 7px; }
.window-row strong { color: #0f172a; }
.window-head { min-height: 34px; background: #f8fafc; }
.window-head > span { color: #64748b; font-size: 10px; font-weight: 800; }
.strategy-table { display: grid; gap: 7px; }
.strategy-row { display: grid; grid-template-columns: 32px minmax(0,1fr) 150px 58px; align-items: center; gap: 12px; padding: 11px 13px; border: 1px solid #e2e8f0; border-radius: 9px; background: #fff; }
.strategy-row.best { border-color: #86efac; background: #f0fdf4; }
.strategy-rank { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 800; }
.strategy-row p, .structure-card p, .alert-row p, .final-conclusion p { margin: 4px 0 0; color: #64748b; font-size: 11px; line-height: 1.6; }
.strategy-row > div > strong { color: #1e293b; font-size: 13px; }
.strategy-score { display: flex; flex-direction: column; align-items: flex-end; }
.strategy-score strong { color: #2563eb !important; font-size: 15px !important; }
.strategy-score span { color: #64748b; font-size: 10px; }
.report-detail-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 12px; }
.structure-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; }
.structure-card { padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
.structure-card > span { color: #64748b; font-size: 10px; }
.structure-card > strong { display: block; margin-top: 4px; color: #0f172a; font-size: 15px; }
.alert-list { display: grid; gap: 8px; }
.alert-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-left: 3px solid #f59e0b; background: #fffbeb; border-radius: 6px; }
.alert-row > span { display: grid; flex: 0 0 22px; place-items: center; height: 22px; border-radius: 50%; background: #fef3c7; color: #b45309; font-size: 10px; font-weight: 800; }
.alert-row p { margin: 1px 0 0; color: #78350f; }
.final-conclusion { margin-top: 12px; padding: 22px 24px; border-radius: 11px; background: linear-gradient(135deg,#172554,#1e3a8a); color: #fff; }
.final-conclusion > span { color: #93c5fd; font-size: 10px; font-weight: 800; letter-spacing: .08em; }
.final-conclusion h2 { margin: 7px 0; font-size: 21px; }
.final-conclusion p { max-width: 900px; color: #dbeafe; font-size: 12px; }
.final-conclusion div { margin-top: 13px; color: #bfdbfe; font-size: 11px; }.final-conclusion div strong { margin-right: 8px; color: #fff; }
@media print {
  .report-toolbar { display: none; }
  .overview-page { padding: 0; background: #fff; }
  .glass-panel { box-shadow: none !important; break-inside: avoid; }
}
</style>
