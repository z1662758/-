<template>
  <div class="overview-page mid-stage-bg analysis-workspace">
    <header class="report-toolbar glass-panel">
      <div class="report-heading">
        <span>DECISION REPORT</span>
        <div><h1>报告生成</h1><p>汇总博弈论、决策树与情景分析结果，形成可执行的决策报告</p></div>
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

    <div ref="reportRef" class="pdf-report">
    <AnalysisPageHero
      eyebrow="决策结论报告"
      title="供应链应急决策结论"
      headline="当前建议优先稳定关键节点，再根据情景变化动态调整资源配置。"
      :tags="heroTags"
    >
      <template #side>
        <article class="overview-status-card">
          <span>综合判断</span>
          <strong>建议干预</strong>
          <p>风险已进入需要主动调度的区间，继续等待将放大缺口和履约压力。</p>
        </article>
      </template>
    </AnalysisPageHero>

    <main class="overview-content">
      <section class="overview-verdict glass-panel">
        <div class="overview-section-head">
          <div>
            <span class="overview-kicker">01 · 总体结论</span>
            <h3>先控制风险暴露，再追求局部成本最优</h3>
          </div>
          <el-tag type="warning" effect="dark">中高风险</el-tag>
        </div>
        <p class="overview-lead">综合博弈关系、决策路径和多情景结果，当前最稳妥的决策是优先保障核心需求与关键通道，保留替代方案，避免单点失效向网络扩散。</p>
        <div class="verdict-grid">
          <article v-for="item in verdictItems" :key="item.label" class="verdict-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.detail }}</p>
          </article>
        </div>
      </section>

      <section class="overview-grid">
        <article class="action-panel glass-panel">
          <div class="overview-section-head compact">
            <div>
              <span class="overview-kicker">02 · 推荐动作</span>
              <h3>执行优先级</h3>
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
              <span class="overview-kicker">03 · 结论依据</span>
              <h3>三类分析共同指向</h3>
            </div>
          </div>
          <div class="evidence-list">
            <div v-for="item in evidence" :key="item.title" class="evidence-row">
              <el-icon :class="`evidence-icon ${item.tone}`"><component :is="item.icon" /></el-icon>
              <div><strong>{{ item.title }}</strong><p>{{ item.detail }}</p></div>
            </div>
          </div>
        </article>
      </section>

    </main>
    </div>
  </div>
</template>

<script setup>
import { computed, markRaw, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download, Grid, Promotion, Refresh, TrendCharts } from '@element-plus/icons-vue'
import AnalysisPageHero from './components/shared/AnalysisPageHero.vue'
import './components/shared/midStage.css'

const route = useRoute()
const reportRef = ref(null)
const exportingPdf = ref(false)
const generatedAt = ref(new Date().toLocaleString('zh-CN', { hour12: false }))
const isAuto = computed(() => route.query.scenario === 'supply_chain')
const heroTags = computed(() => [
  { label: '分析对象', value: isAuto.value ? '汽车供应链' : '铀供应链', type: 'info' },
  { label: '结论状态', value: '可执行', type: 'success' },
  { label: '更新时间', value: '当前实验快照', type: 'warning' }
])
const verdictItems = computed(() => isAuto.value ? [
  { label: '首要目标', value: '保障产能', detail: '优先确保关键工厂和核心订单的连续供给。' },
  { label: '主要风险', value: '产能缺口', detail: '上游波动可能沿节点放大并影响交付。' },
  { label: '推荐策略', value: '协同调度', detail: '联动库存、产能与替代供应商进行动态分配。' }
] : [
  { label: '首要目标', value: '保障核燃料', detail: '优先保障核心需求与关键交付窗口。' },
  { label: '主要风险', value: '供给收紧', detail: '单一来源和跨境通道暴露是主要脆弱点。' },
  { label: '推荐策略', value: '多源调度', detail: '保留替代来源，同时控制库存与运输成本。' }
])
const actions = computed(() => isAuto.value ? [
  { title: '锁定关键产能', detail: '将有限资源优先配置至核心工厂与高优先级订单。', tag: '立即执行', type: 'danger' },
  { title: '启用替代供应', detail: '提前校验第二供应源，降低单节点中断的连锁影响。', tag: '优先准备', type: 'warning' },
  { title: '滚动监测缺口', detail: '以短周期更新需求、库存和产能状态，触发动态重算。', tag: '持续跟踪', type: 'success' }
] : [
  { title: '保障核心需求', detail: '优先锁定核心用户和关键交付窗口，避免供给中断。', tag: '立即执行', type: 'danger' },
  { title: '分散关键通道', detail: '校验替代供应商和运输路径，降低单点暴露。', tag: '优先准备', type: 'warning' },
  { title: '滚动调整库存', detail: '结合价格、库存和情景概率，动态修正补库节奏。', tag: '持续跟踪', type: 'success' }
])
const evidence = [
  { title: '博弈论分析', detail: '识别参与方的利益冲突与稳定策略，明确协同边界。', icon: markRaw(Grid), tone: 'blue' },
  { title: '决策树分析', detail: '对比不干预基线与调控路径，验证动作的结果差异。', icon: markRaw(Promotion), tone: 'orange' },
  { title: '情景分析', detail: '在不同扰动窗口下复核结论的稳健性与适用范围。', icon: markRaw(TrendCharts), tone: 'green' }
]
function refreshReport() {
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
.report-updated { margin-right: 4px; color: #94a3b8; font-size: 10px; white-space: nowrap; }
.pdf-report { padding: 0; background: transparent; }
.overview-content { padding: 0 8px; }
.overview-verdict { padding: 18px 20px; margin-top: 12px; }
.overview-section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.overview-section-head.compact { margin-bottom: 14px; }
.overview-kicker { color: #64748b; font-size: var(--mid-fs-micro); font-weight: 800; letter-spacing: .08em; }
h3 { margin: 5px 0 0; color: #0f172a; font-size: 17px; }
.overview-lead { max-width: 940px; margin: 16px 0; color: #334155; font-size: 13px; line-height: 1.8; }
.verdict-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
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
.action-row .el-tag { flex-shrink: 0; }
.evidence-icon { flex: 0 0 30px; width: 30px; height: 30px; border-radius: 8px; font-size: 16px; justify-content: center; }
.evidence-icon.blue { color: #2563eb; background: #eff6ff; }.evidence-icon.orange { color: #d97706; background: #fffbeb; }.evidence-icon.green { color: #16a34a; background: #f0fdf4; }
.overview-status-card { min-width: 220px; padding: 15px 17px; border: 1px solid rgba(245,158,11,.25); border-radius: 9px; background: linear-gradient(135deg, #fffaf0, #fff); }
.overview-status-card span { color: #92400e; font-size: 11px; font-weight: 700; }.overview-status-card strong { display: block; margin: 5px 0; color: #b45309; font-size: 20px; }.overview-status-card p { margin: 0; color: #78350f; font-size: 11px; line-height: 1.65; }
@media (max-width: 900px) { .overview-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .report-toolbar { align-items: flex-start; flex-direction: column; } .report-actions { width: 100%; } .report-updated { display: none; } }
@media (max-width: 620px) { .verdict-grid { grid-template-columns: 1fr; } .overview-status-card { min-width: 0; } .overview-hint, .report-heading p { display: none; } }

@media print {
  .report-toolbar { display: none; }
  .overview-page { padding: 0; background: #fff; }
  .glass-panel { box-shadow: none !important; break-inside: avoid; }
}
</style>
