<template>
  <div class="overview-page mid-stage-bg analysis-workspace">
    <header class="report-toolbar glass-panel">
      <div class="report-heading">

        <div><h1>供应链实验总结报告</h1><p>汇总本次实验事实结果、关键变化与仍需关注的风险。</p></div>
      </div>
      <div class="report-actions">
        <span class="report-updated">更新于 {{ generatedAt }}</span>
        <el-button :disabled="exportingPdf" @click="refreshReport">
          <el-icon><Refresh /></el-icon>刷新结论
        </el-button>
        <el-button type="primary" :loading="exportingPdf" @click="exportPdf">
          <el-icon><Download /></el-icon>生成 PDF
        </el-button>
      </div>
    </header>

    <!-- 业务核心问题导引条（阐明“报告生成想解决什么问题”） -->
    <section class="report-core-question-strip glass-panel">
      <div class="core-question-badge">报告定位</div>
      <div class="core-question-text">
        <strong>本页回答：这次实验实际观察到了什么，结果是否稳定，后续需要关注什么？</strong>
        <p>建议动作请前往“决策方案”查看；本页只保留实验结果、证据链和风险复盘，不把建议冒充成已执行事实。</p>
      </div>
    </section>

    <nav class="report-contents" aria-label="报告目录">
      <button v-for="item in reportSections" :key="item.id" @click="scrollToSection(item.id)">{{ item.label }}</button>
    </nav>
    <div ref="reportRef" class="pdf-report">
    <AnalysisPageHero
      v-if="reportVm || isAuto"
      eyebrow="实验总结报告"
      :title="reportTitle"
      :headline="reportHeadline"
      :tags="heroTags"
    >
      <template #side>
        <article class="overview-status-card">
          <span>{{ reportVm ? '本次实验判断' : '综合判断' }}</span>
          <strong>{{ reportSpotlight.title }}</strong>
          <p>{{ reportSpotlight.text }}</p>
        </article>
      </template>
    </AnalysisPageHero>

    <main v-if="reportVm || isAuto" class="overview-content">
      <section id="report-summary" class="overview-verdict glass-panel">
        <div class="overview-section-head">
          <div>
            <span class="overview-kicker">01 · 实验结论</span>
            <h3>{{ reportVm ? selectedExperiment?.name || '铀供应链实验' : '等待实验结果' }}</h3>
          </div>
          <el-tag :type="overallRiskTag.type" effect="dark">{{ overallRiskTag.label }}</el-tag>
        </div>
        <div v-if="reportVm" class="report-context">
          <span>{{ reportVm.selectedYearRange }} 年</span>
          <span v-for="item in heroTags.filter(tag => ['模板', '模式', '关键年份'].includes(tag.label))" :key="item.label">{{ item.label }}：{{ item.value }}</span>
        </div>
        <p class="overview-lead">{{ reportVm ? reportHeadline : overallConclusion }}</p>
        <div class="verdict-grid">
          <article v-for="item in verdictItems" :key="item.label" class="verdict-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.detail }}</p>
          </article>
        </div>
      </section>

      <section v-if="reportVm" class="report-output-card glass-panel">
        <div class="overview-section-head compact">
          <div>
            <span class="overview-kicker">本次实验产出</span>
            <h3>实验得到的结论与建议依据</h3>
          </div>
          <el-tag type="warning" effect="plain">实验结果 · 待业务确认</el-tag>
        </div>
        <div class="report-output-grid">
          <article v-for="item in reportVm.reportBriefBlocks.slice(0, 3)" :key="item.label" class="report-output-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.text }}</p>
          </article>
          <article class="report-output-item report-output-item--decision">
            <span>决策分析输出</span>
            <strong>{{ reportVm.decisionSummary.recommendedStrategy || '暂无优选方案' }}</strong>
            <p>基线 {{ reportVm.decisionSummary.baselineScoreText }}，{{ reportVm.decisionSummary.improvementText }}。具体动作请前往“决策方案”页面查看。</p>
          </article>
        </div>
      </section>

      <section id="report-digest" class="analysis-digest-grid">
        <article v-for="item in analysisDigestCards" :key="item.step" :class="['analysis-digest-card', item.tone, 'glass-panel']">
          <div class="analysis-digest-head">
            <span>{{ item.step }}</span>
            <el-tag size="small" :type="item.tagType" effect="plain">{{ item.status }}</el-tag>
          </div>
          <strong>{{ item.conclusion }}</strong>
          <div class="analysis-digest-metrics">
            <span v-for="metric in item.metrics" :key="metric.label"><small>{{ metric.label }}</small><b>{{ metric.value }}</b></span>
          </div>
        </article>
      </section>

      <section id="report-actions" class="overview-grid">
        <article class="action-panel glass-panel">
          <div class="overview-section-head compact">
            <div>
              <span class="overview-kicker">02 · 结果解读</span>
              <h3>关键观察与后续关注</h3>
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

        <details class="evidence-panel glass-panel" data-report-details>
          <summary>分析依据 <span>情景识别、结构评估与方案比较</span></summary>
          <div class="evidence-list">
            <div v-for="item in evidence" :key="item.title" class="evidence-row">
              <el-icon :class="`evidence-icon ${item.tone}`"><component :is="item.icon" /></el-icon>
              <div><strong>{{ item.title }}</strong><p>{{ item.detail }}</p><small v-if="item.output">产出：{{ item.output }}</small></div>
            </div>
          </div>
        </details>
      </section>

      <template v-if="reportVm">
        <section id="report-windows" class="report-section glass-panel">
          <div class="overview-section-head compact">
            <div><span class="overview-kicker">03 · 年度变化</span><h3>年度压力与关键事件</h3></div>
            <span class="section-meta">覆盖 {{ reportVm.focusWindowCards.length }} 个年度窗口</span>
          </div>
          <div class="window-table">
            <div class="window-row window-head">
              <span>年份 / 状态</span><span>年度事件</span><span>风险暴露</span><span>库存覆盖</span><span>需求缺口</span><span>关键链路</span>
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
            <div><span class="overview-kicker">04 · 实验对比</span><h3>候选方案对比</h3></div>
            <span class="section-meta">基线 {{ reportVm.decisionSummary.baselineScoreText }}</span>
          </div>
          <div class="strategy-table">
            <article v-for="(item, index) in reportVm.decisionSummary.candidateRows" :key="item.id" :class="['strategy-row', { best: item.isBest }]">
              <span class="strategy-rank">{{ index + 1 }}</span>
              <div><strong>{{ item.name }}</strong><p>{{ item.note || item.outcome }}</p></div>
              <div class="strategy-score"><strong>{{ item.scoreText }}</strong><span>{{ item.improvementText }}</span></div>
              <el-tag v-if="item.isBest" type="success" effect="dark" size="small">实验优选</el-tag>
            </article>
          </div>
        </section>

        <section id="report-risks" class="report-detail-grid">
          <article class="report-section glass-panel">
            <div class="overview-section-head compact"><div><span class="overview-kicker">05 · 供应结构</span><h3>期末供应结构与集中度</h3></div></div>
            <div class="structure-grid">
              <div v-for="item in reportVm.structureSummaryCards" :key="item.label" class="structure-card">
                <span>{{ item.label }}</span><strong>{{ item.value }}</strong><p>{{ item.detail }}</p>
              </div>
            </div>
          </article>
          <article class="report-section glass-panel">
            <div class="overview-section-head compact">
              <div>
                <span class="overview-kicker">06 · 监测清单</span>
                <h3>策略调整的触发条件与联动响应</h3>
              </div>
              <el-tag type="warning" effect="plain" size="small">动态阈值联动</el-tag>
            </div>
            <div class="monitoring-grid">
              <div v-for="(item, index) in monitoringTriggerRows" :key="item.name" class="monitoring-card">
                <div class="monitoring-card-top">
                  <span class="mon-index">0{{ index + 1 }}</span>
                  <span class="mon-title">{{ item.name }}</span>
                  <el-tag size="small" :type="item.levelType" effect="light">{{ item.level }}</el-tag>
                </div>
                <div class="mon-condition">
                  <small>触发阈值</small>
                  <strong>{{ item.trigger }}</strong>
                </div>
                <div class="mon-action">
                  <small>后续关注方向</small>
                  <p>{{ item.action }}</p>
                </div>
              </div>
            </div>
          </article>
        </section>

      </template>

    </main>
    <div v-else class="report-empty-state glass-panel">
      <el-empty description="完成实验后，这里会生成实验总结报告" :image-size="90" />
    </div>
    </div>

    <!-- 统一流程导航（事中末尾页面，无后续下一步研讨厅） -->
    <DuringWorkflowNav
      back="/home/SCnet/experimentManager?view=decision"
      back-label="上一步：决策方案"
      process-view="/home/SCnet/interface?view=simulation&theaterMode=replay"
      process-label="过程查看 (剧场回放)"
    />
  </div>
</template>

<script setup>
import { buildUraniumVulnerability, uraniumVulnerabilityLevel } from '@/utils/uraniumVulnerability'
import { computed, markRaw, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Download, Grid, Promotion, Refresh, TrendCharts } from '@element-plus/icons-vue'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { buildUraniumReportViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'
import { useUraniumAnalysisExperiment } from './composables/useUraniumAnalysisExperiment'
import AnalysisPageHero from './components/shared/AnalysisPageHero.vue'
import DuringWorkflowNav from './components/DuringWorkflowNav.vue'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import './components/shared/midStage.css'

const route = useRoute()
const reportRef = ref(null)
const exportingPdf = ref(false)
const generatedAt = ref(new Date().toLocaleString('zh-CN', { hour12: false }))

const isAuto = computed(() => route.query.scenario === 'supply_chain')
useUraniumAnalysisExperiment(computed(() => !isAuto.value))
const reportSections = computed(() => [
  { id: 'report-summary', label: '实验结论' }, { id: 'report-actions', label: '结果解读' },
  { id: 'report-windows', label: '压力窗口' }, { id: 'report-strategies', label: '实验对比' },
  { id: 'report-risks', label: '风险监测' },
].filter(item => !isAuto.value || ['report-summary', 'report-actions'].includes(item.id)))

function scrollToSection(id) {
  reportRef.value?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const uraniumStore = useUraniumDemoStore()
const snapshotStore = useAnalysisSnapshotStore()
const { history, selectedExperiment, selectedExperimentId } = storeToRefs(uraniumStore)

// 稳健实验回退保障
const effectiveExperiment = computed(() => {
  if (selectedExperiment.value) return selectedExperiment.value
  if (snapshotStore.getActiveSnapshot()?.experiment) return snapshotStore.getActiveSnapshot().experiment
  const list = Object.values(uraniumStore.experiments || {})
  if (list.length) return list[0]
  return null
})

const reportVm = computed(() => isAuto.value ? null : buildUraniumReportViewModel({
  experiment: effectiveExperiment.value,
  history: history.value,
  snapshot: snapshotStore.getActiveSnapshot()
}))
const reportTitle = computed(() => '供应链实验总结报告')
const reportHeadline = computed(() => reportVm.value?.reportBriefBlocks?.[0]?.text || '当前暂无可展示的实验结论。')
const reportSpotlight = computed(() => {
  const observation = reportVm.value?.reportBriefBlocks?.[1]
  return observation
    ? { title: observation.title, text: observation.text }
    : { title: '暂无重点观察', text: '完成实验后，这里会展示最需要关注的压力窗口。' }
})
const heroTags = computed(() => reportVm.value?.reportHero?.tags || [
  { label: '分析对象', value: isAuto.value ? '汽车供应链' : '铀供应链', type: 'info' },
  { label: '结论状态', value: '待业务确认', type: 'warning' },
  { label: '更新时间', value: '当前实验快照', type: 'warning' }
])
const overallConclusion = computed(() => reportVm.value?.reportBriefBlocks?.[0]?.text
  || '综合年度风险分布、节点脆弱性和对策路径结果，当前应优先保障核心需求与关键通道，避免单点失效向供应网络扩散。')
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

const analysisDigestCards = computed(() => {
  const summary = selectedExperiment.value?.summary || selectedExperiment.value?.report || {}
  const metrics = buildUraniumVulnerability(summary)
  const level = uraniumVulnerabilityLevel(metrics)
  const inventoryPressure = metrics.find(item => item.label === '库存压力')?.value || '—'
  const best = reportVm.value?.decisionSummary?.candidateRows?.find(item => item.isBest)
    || reportVm.value?.decisionSummary?.candidateRows?.[0]
  return [
    {
      step: 'Step 01 · 脆弱性分析 (诊断定点)', status: `指数 ${metrics.find(m => m.label === '鲁棒性')?.score || 78}分 (${level.label})`, tagType: level.type, tone: 'vulnerability',
      conclusion: reportVm.value?.reportBriefBlocks?.[1]?.text || '当前实验已形成压力窗口观察，详情见年度变化。',
      metrics: [
        { label: '重点链路', value: reportVm.value?.routeDigestRows?.[0]?.label || '—' },
        { label: '库存缓冲压力', value: `${inventoryPressure} 分` }
      ]
    },
    {
      step: 'Step 02 · 决策分析 (对策寻优)', status: best ? `实验优选 ${best.scoreText || '—'}` : '暂无优选结果', tagType: 'success', tone: 'strategy',
      conclusion: best?.name || reportVm.value?.decisionSummary?.recommendedStrategy || '当前没有可用的候选策略结论',
      metrics: [
        { label: '较基线变化', value: best?.improvementText || '—' },
        { label: '候选数量', value: `${reportVm.value?.decisionSummary?.candidateRows?.length || 0} 项` }
      ]
    },
    {
      step: 'Step 03 · 结果汇总 (复盘)', status: '报告已整理', tagType: 'primary', tone: 'scenario',
      conclusion: '汇总实验指标、关键压力窗口和候选策略，供后续业务确认与方案调整使用',
      metrics: [
        { label: '实验窗口', value: reportVm.value?.selectedYearRange || '—' },
        { label: '候选策略', value: `${reportVm.value?.decisionSummary?.candidateRows?.length || 0} 项` }
      ]
    }
  ]
})
const actions = computed(() => (reportVm.value?.reportBriefBlocks || []).slice(1, 4).map((item, index) => ({
  title: item.title,
  detail: item.text,
  tag: index === 0 ? '运行观察' : index === 1 ? '结构判断' : '方案依据',
  type: index === 2 ? 'warning' : 'info'
})))

const monitoringTriggerRows = computed(() => {
  const alerts = reportVm.value?.alerts || []
  if (alerts.length) {
    return alerts.map((text, idx) => {
      const parts = text.split('：')
      const name = parts[0] || `风险监测点 0${idx + 1}`
      const detail = parts[1] || text
      const isUrgent = /突破|红线|停堆|借调|超限/.test(text)
      return {
        name,
        trigger: detail.split('，')[0] || detail,
        action: detail.split('，')[1] || '启动协同应急预案并重新测算采购组合。',
        level: isUrgent ? '一级告警' : '二级预警',
        levelType: isUrgent ? 'danger' : 'warning'
      }
    })
  }
  return [
    {
      name: '现货溢价超限预警',
      trigger: 'U3O8 现货突破 $85/lb 或涨幅超 +20%',
      action: '锁定长协履约，现货敞口压缩至 15% 以下，释放平抑库存。',
      level: '二级预警',
      levelType: 'warning'
    },
    {
      name: '跨境通关运力受阻预警',
      trigger: '口岸月运量低于 800 tU 或滞留超 15 天',
      action: '启动远洋海运多港口接卸分流，沿海基地承接中转调度。',
      level: '二级预警',
      levelType: 'warning'
    },
    {
      name: '商业安全库存红线预警',
      trigger: '核心基地库存覆盖天数低于 180 天红线',
      action: '向集团与国家战略储备局申请 300 tU 战略平准借调，确保关键堆型 0 停堆。',
      level: '一级告警',
      levelType: 'danger'
    },
    {
      name: '地缘单一来源集中度预警',
      trigger: '单一主供国占比超 55% 或发生属地冲突',
      action: '启动三方转口，激活纳米比亚/加拿大备用矿山采购配额。',
      level: '二级预警',
      levelType: 'warning'
    }
  ]
})
const evidenceIcons = [markRaw(TrendCharts), markRaw(Grid), markRaw(Promotion)]
const evidenceTones = ['green', 'blue', 'orange']
const evidence = computed(() => reportVm.value?.analysisRecoveryCards?.slice(1).map((item, index) => ({
  title: `${item.step} · ${item.title}`,
  detail: item.text,
  output: item.output,
  icon: evidenceIcons[index],
  tone: evidenceTones[index]
})) || [
  { title: '脆弱性分析', detail: '从节点依赖矩阵、结构替代能力和物流稳定性识别关键脆弱点。', icon: markRaw(Grid), tone: 'blue' },
  { title: '决策分析 (情景)', detail: '统计各类年度风险的占比，识别关键年度压力窗口并预演演化格局。', icon: markRaw(TrendCharts), tone: 'green' },
  { title: '决策分析 (决策树)', detail: '对比不干预基线与调控路径，评估动作的时间、成本和改善效果。', icon: markRaw(Promotion), tone: 'orange' }
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

async function refreshReport() {
  await loadCurrentExperiment(true).catch(() => {})
  generatedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })
  ElMessage.success('决策结论已刷新')
}

async function exportPdf() {
  if (!reportRef.value || exportingPdf.value) return
  exportingPdf.value = true
  try {
    const scenarioName = isAuto.value ? '汽车供应链' : '铀供应链'

    // 将报告 DOM 高清截图
    const canvas = await html2canvas(reportRef.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (doc) => doc.querySelectorAll('[data-report-details]').forEach(el => { el.open = true }),
      windowWidth: document.documentElement.clientWidth
    })

    // A4 横向分页输出（与 EXreport 导出逻辑保持一致）
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 28
    const contentW = pageW - margin * 2
    const contentH = pageH - margin * 2

    const imgW = canvas.width
    const imgH = canvas.height
    const scaleFactor = contentW / imgW
    const sliceHpx = contentH / scaleFactor
    const overlapPx = 24

    let renderedH = 0
    let pageIndex = 0
    while (renderedH < imgH) {
      const startY = Math.max(0, renderedH - (pageIndex > 0 ? overlapPx : 0))
      const curSliceH = Math.min(sliceHpx + (pageIndex > 0 ? overlapPx : 0), imgH - startY)

      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = imgW
      sliceCanvas.height = curSliceH
      const ctx = sliceCanvas.getContext('2d')
      ctx.drawImage(canvas, 0, startY, imgW, curSliceH, 0, 0, imgW, curSliceH)

      if (pageIndex > 0) pdf.addPage()
      pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, contentW, curSliceH * scaleFactor)

      renderedH += sliceHpx
      pageIndex++
    }

    pdf.save(`${scenarioName}决策分析报告.pdf`)
    ElMessage.success(`PDF 报告已生成（共 ${pageIndex} 页）`)
  } catch (error) {
    console.error('[DecisionReport] PDF export failed:', error)
    ElMessage.error('PDF 生成失败，请稍后重试')
  } finally {
    exportingPdf.value = false
  }
}
</script>

<style scoped>
.report-contents { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 8px; }
.report-contents button { padding: 7px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; color: #475569; cursor: pointer; font-size: 12px; }
.report-contents button:hover { color: #2563eb; border-color: #93c5fd; }
.pdf-report [id] { scroll-margin-top: 64px; }

.overview-page { min-height: 100%; padding: 8px 8px 32px; overflow: visible; }
.report-empty-state { min-height: 360px; display: grid; place-items: center; margin: 16px 0; }
.report-output-card { margin: 12px 0; padding: 16px; }
.report-output-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.report-output-item { min-width: 0; padding: 13px 14px; border: 1px solid #e2e8f0; border-radius: 9px; background: #f8fafc; }
.report-output-item > span { color: #2563eb; font-size: 11px; font-weight: 700; }
.report-output-item > strong { display: block; margin-top: 5px; color: #0f172a; font-size: 13px; line-height: 1.5; }
.report-output-item > p { margin: 6px 0 0; color: #64748b; font-size: 11px; line-height: 1.65; }
.report-output-item--decision { border-color: #bfdbfe; background: #eff6ff; }
.report-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 11px 14px; margin: 8px 8px 8px; border-color: #dbe4ee; background: rgba(255,255,255,.96); backdrop-filter: blur(12px); }
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
.report-context { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 8px; color: #64748b; font-size: 12px; }
.report-context + .overview-lead { margin: 12px 0; }
.verdict-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
.verdict-item { padding: 10px 12px; background: #f8fafc; border-radius: 6px; }
.verdict-item p { margin: 0; color: #64748b; font-size: 12px; line-height: 1.5; }
.verdict-item span, .action-row p, .evidence-row p { display: block; margin: 0; color: #64748b; font-size: 11px; line-height: 1.65; }
.verdict-item strong { display: block; margin: 4px 0; color: #0f172a; font-size: 16px; }
.analysis-digest-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.analysis-digest-card { min-width: 0; padding: 12px 14px; }
.analysis-digest-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.analysis-digest-head > span { color: #64748b; font-size: var(--mid-fs-micro); font-weight: 800; letter-spacing: .06em; }
.analysis-digest-card h3 { margin-top: 8px; font-size: var(--mid-fs-strong); }
.analysis-digest-card > strong { display: block; margin-top: 8px; color: #0f172a; font-size: var(--mid-fs-title); line-height: 1.35; }
.analysis-digest-card > p { min-height: 38px; margin: 6px 0 0; color: #64748b; font-size: var(--mid-fs-label); line-height: var(--mid-lh-body); }
.analysis-digest-metrics { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 10px; }
.analysis-digest-metrics > span { display: flex; align-items: baseline; gap: 6px; }
.analysis-digest-metrics small,
.analysis-digest-metrics b { display: block; }
.analysis-digest-metrics small { color: #94a3b8; font-size: var(--mid-fs-micro); }
.analysis-digest-metrics b { margin-top: 3px; color: #1e293b; font-size: var(--mid-fs-strong); }
.overview-grid { display: grid; gap: 12px; margin-top: 12px; }
.action-panel, .evidence-panel { padding: 17px 18px; }
.evidence-panel summary { cursor: pointer; color: #334155; font-size: 13px; }
.evidence-panel summary span { margin-left: 12px; color: #64748b; font-size: 12px; }
.evidence-panel[open] .evidence-list { margin-top: 12px; }
.report-contents button:focus-visible, summary:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
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
.screening-layout { display: grid; grid-template-columns: .9fr 1.5fr; gap: 12px; align-items: start; }
.screening-methods { display: grid; gap: 8px; }
.screening-method-card { padding: 12px; border: 1px solid #e2e8f0; border-left: 3px solid #0ea5e9; border-radius: 8px; background: #f8fafc; }
.screening-method-card span { color: #0ea5e9; font-size: 10px; font-weight: 800; }
.screening-method-card strong { display: block; margin-top: 4px; color: #0f172a; font-size: 13px; }
.screening-method-card p { margin: 5px 0 0; color: #64748b; font-size: 11px; line-height: 1.6; }
.screening-table { overflow: hidden; border: 1px solid #e2e8f0; border-radius: 9px; }
.screening-row { display: grid; grid-template-columns: 88px minmax(160px, 1fr) 72px 88px minmax(130px, .75fr); align-items: center; min-height: 44px; border-top: 1px solid #edf2f7; }
.screening-row:first-child { border-top: 0; }
.screening-row.best { background: #f0fdf4; }
.screening-row > span { min-width: 0; padding: 8px 10px; color: #475569; font-size: 11px; line-height: 1.45; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.screening-head { min-height: 34px; background: #f8fafc; }
.screening-head > span { color: #64748b; font-size: 10px; font-weight: 800; }
.screening-row strong,
.screening-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.screening-row strong { color: #0f172a; font-size: 12px; }
.screening-row small { margin-top: 2px; color: #94a3b8; font-size: 10px; }
.report-detail-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 12px; }
.structure-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; }
.structure-card { padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
.structure-card > span { color: #64748b; font-size: 10px; }
.structure-card > strong { display: block; margin-top: 4px; color: #0f172a; font-size: 15px; }
.monitoring-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.monitoring-card {
  padding: 12px 14px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 4px rgba(0,0,0,0.02);
}
.monitoring-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.mon-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 10px;
  font-weight: 800;
  font-family: var(--mid-font-mono, monospace);
}
.mon-title {
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
  flex: 1;
}
.mon-condition {
  margin-bottom: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
}
.mon-condition small,
.mon-action small {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 2px;
}
.mon-condition strong {
  color: #1e3a8a;
  font-size: 11px;
}
.mon-action p {
  margin: 0;
  color: #475569;
  font-size: 11px;
  line-height: 1.5;
}
.alert-list { display: grid; gap: 8px; }
.alert-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-left: 3px solid #f59e0b; background: #fffbeb; border-radius: 6px; }
.alert-row > span { display: grid; flex: 0 0 22px; place-items: center; height: 22px; border-radius: 50%; background: #fef3c7; color: #b45309; font-size: 10px; font-weight: 800; }
.alert-row p { margin: 1px 0 0; color: #78350f; }
.final-conclusion { margin-top: 12px; padding: 22px 24px; border-radius: 11px; background: linear-gradient(135deg,#172554,#1e3a8a); color: #fff; }
.final-conclusion > span { color: #93c5fd; font-size: 10px; font-weight: 800; letter-spacing: .08em; }
.final-conclusion h2 { margin: 7px 0; font-size: 21px; }
.final-conclusion p { max-width: 900px; color: #dbeafe; font-size: 12px; }
.final-conclusion div { margin-top: 13px; color: #bfdbfe; font-size: 11px; }.final-conclusion div strong { margin-right: 8px; color: #fff; }
@media (max-width: 1200px) {
  .report-toolbar { align-items: flex-start; }
  .report-actions { flex-wrap: wrap; justify-content: flex-end; }
  .overview-grid,
  .report-detail-grid,
  .screening-layout { grid-template-columns: 1fr; }
  .verdict-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .window-table,
  .screening-table { overflow-x: auto; }
  .window-row { min-width: 820px; }
  .screening-row { min-width: 760px; }
}
@media (max-width: 760px) {
  .analysis-digest-grid { grid-template-columns: 1fr; }
  .overview-page { padding-inline: 4px; }
  .overview-content { padding-inline: 2px; }
  .report-toolbar,
  .report-heading { align-items: stretch; flex-direction: column; }
  .report-actions { justify-content: flex-start; }
  .experiment-select { width: 100%; }
  .report-updated { width: 100%; }
  .verdict-grid,
  .structure-grid,
  .analysis-digest-metrics,
  .report-output-grid { grid-template-columns: 1fr; }
  .strategy-row { grid-template-columns: 30px minmax(0, 1fr); }
  .strategy-score { align-items: flex-start; grid-column: 2; }
  .strategy-row > .el-tag { grid-column: 2; justify-self: start; }
}
@media print {
  .report-toolbar,
  .analysis-link-tabs,
  .report-core-question-strip { display: none; }
  .overview-page { padding: 0; background: #fff; }
  .glass-panel { box-shadow: none !important; break-inside: avoid; }
  .analysis-digest-card,
  .report-section,
  .final-conclusion { break-inside: avoid; page-break-inside: avoid; }
}

/* 顶部核心业务问题导引条 */
.report-core-question-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  margin-bottom: 10px;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(240, 253, 250, 0.95));
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.05);
}
.report-core-question-strip .core-question-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
  letter-spacing: 0.5px;
}
.report-core-question-strip .core-question-text {
  flex: 1;
  min-width: 0;
}
.report-core-question-strip .core-question-text strong {
  display: block;
  font-size: 12.5px;
  color: #1e3a8a;
  margin-bottom: 2px;
}
.report-core-question-strip .core-question-text p {
  margin: 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.4;
}
</style>
