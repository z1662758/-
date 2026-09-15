<template>
  <div class="decision-page">
    <div v-if="reportVm" class="decision-scroll">
      <section class="decision-hero">
        <div class="hero-main">
          <div class="decision-line">
            <span>建议执行</span>
            <h1>{{ summary.recommendedStrategy }}</h1>
          </div>
          <div class="decision-meta">
            <span v-for="item in contextRows" :key="item.label"><b>{{ item.label }}</b>{{ item.value }}</span>
          </div>
        </div>
        <div class="hero-score">
          <span>综合增益</span>
          <strong>{{ summary.improvementText }}</strong>
          <small>基线得分 {{ summary.baselineScoreText }}</small>
        </div>
        <div class="decision-reason">
          <span>用途</span>
          <strong>{{ decisionPurpose }}</strong>
          <span>依据</span>
          <strong>{{ decisionReason }}</strong>
        </div>
      </section>

      <section class="decision-kpi-grid">
        <article v-for="item in evidenceRows" :key="item.label" class="kpi-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.detail }}</p>
        </article>
      </section>

      <section class="decision-main-grid">
        <article class="decision-panel action-panel">
          <div class="panel-title">
            <span>01</span>
            <div><strong>具体决策方法</strong><small>执行动作</small></div>
          </div>
          <div class="action-timeline">
            <div v-for="(item, index) in actionRows" :key="item" class="action-row">
              <b>{{ index + 1 }}</b>
              <div>
                <strong>{{ actionTitles[index] || `行动 ${index + 1}` }}</strong>
                <p>{{ item }}</p>
              </div>
              <el-tag :type="actionTagType(index)" size="small" effect="plain">{{ actionTagText(index) }}</el-tag>
            </div>
          </div>
        </article>

        <article class="decision-panel rationale-panel">
          <div class="panel-title">
            <span>02</span>
            <div><strong>决策依据</strong><small>依据来自推演指标和压力窗口</small></div>
          </div>
          <div class="rationale-list">
            <div v-for="item in rationaleRows" :key="item.title" class="rationale-row">
              <b>{{ item.title }}</b>
              <p>{{ item.text }}</p>
            </div>
          </div>
        </article>
      </section>

      <section class="decision-panel candidates-panel">
        <div class="panel-title">
          <span>03</span>
          <div><strong>候选决策对比</strong><small>相同场景下按综合效用排序，推荐项为后验最优</small></div>
        </div>
        <div class="candidate-grid">
          <article v-for="(item, index) in candidateRows" :key="item.id" :class="['candidate', { best: item.isBest }]">
            <header>
              <span>#{{ index + 1 }}</span>
              <el-tag v-if="item.isBest" type="success" size="small" effect="dark">推荐</el-tag>
            </header>
            <strong>{{ item.name }}</strong>
            <p>{{ item.note || item.outcome }}</p>
            <footer>
              <b>{{ item.scoreText }}</b>
              <span>{{ item.improvementText }}</span>
            </footer>
          </article>
        </div>
      </section>
    </div>

    <el-empty v-else description="请先完成一次实验推演，再生成决策" />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { buildUraniumReportViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'

const uraniumStore = useUraniumDemoStore()
const snapshotStore = useAnalysisSnapshotStore()
const { history, selectedExperiment } = storeToRefs(uraniumStore)
const reportVm = computed(() => buildUraniumReportViewModel({
  experiment: selectedExperiment.value,
  history: history.value,
  snapshot: snapshotStore.getActiveSnapshot()
}))
const summary = computed(() => reportVm.value?.decisionSummary || {})
const candidateRows = computed(() => summary.value?.candidateRows || [])
const decisionPurpose = computed(() => {
  return '缓解峰值缺口、降低断供风险、保障关键交付连续性。'
})
const decisionReason = computed(() => {
  const score = candidateRows.value.find(item => item.isBest)?.scoreText || '综合得分最高'
  const improvement = summary.value?.improvementText || '较基线改善明显'
  return `${score}，${improvement}；满足供给安全、库存覆盖和成本约束。`
})
const contextRows = computed(() => [
  { label: '适用场景', value: summary.value.scenarioLabel || '-' },
  { label: '决策时点', value: summary.value.timeLabel || '-' },
  { label: '触发事件', value: summary.value.eventName || '-' }
])
const evidenceRows = computed(() => {
  const cards = reportVm.value?.keyResultCards || []
  const windows = reportVm.value?.focusWindowCards || []
  const stressed = windows.find(item => item.tone === 'danger') || windows[0]
  return [
    ...cards.slice(0, 4).map(item => ({ label: item.label, value: item.value, detail: item.hint })),
    {
      label: '关键压力窗口',
      value: stressed?.year ? `${stressed.year} 年` : '-',
      detail: stressed ? `${stressed.headline}；风险 ${stressed.riskText}，缺口 ${stressed.unmetText}` : '待推演补充'
    }
  ]
})
const rationaleRows = computed(() => evidenceRows.value.slice(0, 4).map((item, index) => ({
  title: ['结果约束', '风险约束', '库存约束', '成本约束'][index] || item.label,
  text: `${item.label}为 ${item.value}。${item.detail || '该指标已纳入综合效用评分。'}`
})))
const actionTitles = ['锁定主供与关键交付', '启用替代来源与备份通道', '滚动调整库存和合同', '设置风险触发阈值']
const actionRows = computed(() => reportVm.value?.recommendations?.length ? reportVm.value.recommendations : [
  '优先保障核心用户和关键交付窗口，冻结高风险期的最低供应份额。',
  '同步验证第二供应源和备用运输通道，避免单点中断继续扩散。',
  '根据库存覆盖与价格变化滚动修正补库节奏和长协比例。',
  '当风险、缺口或库存越过阈值时自动重跑推演并更新方案。'
])
function actionTagText(index) {
  return index === 0 ? '立即执行' : index === 1 ? '并行推进' : index === 2 ? '滚动校准' : '持续监控'
}

function actionTagType(index) {
  return index === 0 ? 'danger' : index === 1 ? 'warning' : index === 2 ? 'primary' : 'success'
}

onMounted(() => uraniumStore.ensureInitialized())
</script>

<style scoped>
.decision-page { height: 100%; display: flex; flex-direction: column; background: #f4f7fb; color: #172033; }
.decision-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 14px 18px; }
.decision-hero { display: grid; grid-template-columns: minmax(260px, 1.1fr) minmax(280px, 1.4fr) 132px; grid-template-areas: "main reason score"; gap: 10px; padding: 10px; border: 1px solid #bfdbfe; border-radius: 10px; background: #fff; box-shadow: 0 4px 12px rgba(37, 99, 235, .07); }
.hero-main { grid-area: main; min-width: 0; }
.decision-line { display: flex; align-items: center; gap: 10px; min-width: 0; }
.decision-line > span { flex: 0 0 auto; padding: 3px 7px; border-radius: 6px; background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 800; }
.hero-main h1 { margin: 0; color: #0f172a; font-size: 18px; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.decision-reason {
  grid-area: reason;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 5px 8px;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid #dbeafe;
  background: #f8fafc;
}
.decision-reason span {
  display: inline-block;
  color: #2563eb;
  font-size: 10px;
  font-weight: 800;
}
.decision-reason strong {
  color: #1e3a8a;
  font-size: 11px;
  line-height: 1.45;
}
.decision-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.decision-meta span { max-width: 100%; padding: 3px 6px; border-radius: 6px; border: 1px solid #dbeafe; background: #f8fafc; color: #475569; font-size: 10.5px; line-height: 1.35; overflow-wrap: anywhere; }
.decision-meta b { margin-right: 5px; color: #1e3a8a; }
.hero-score { grid-area: score; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 72px; border-radius: 8px; background: #1d4ed8; color: #fff; text-align: center; }
.hero-score span,.hero-score small { opacity: .82; font-size: 11px; }
.hero-score strong { margin: 5px 0; font-size: 22px; line-height: 1; }
.decision-kpi-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 9px; margin-top: 10px; }
.kpi-card { min-height: 94px; padding: 11px; border: 1px solid #dce4ee; border-radius: 10px; background: #fff; box-shadow: 0 4px 12px rgba(15,23,42,.04); }
.kpi-card span { display: block; color: #64748b; font-size: 11px; }
.kpi-card strong { display: block; margin: 4px 0; color: #1d4ed8; font-size: 18px; }
.kpi-card p { margin: 0; color: #64748b; font-size: 11px; line-height: 1.45; }
.decision-main-grid { display: grid; grid-template-columns: 1.18fr .82fr; gap: 14px; margin-top: 14px; }
.decision-panel { padding: 15px; border: 1px solid #dce4ee; border-radius: 12px; background: #fff; box-shadow: 0 4px 14px rgba(15,23,42,.04); }
.panel-title { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
.panel-title > span { width: 27px; height: 27px; display: grid; place-items: center; border-radius: 7px; background: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: 800; }
.panel-title div { display: flex; flex-direction: column; }
.panel-title strong { font-size: 14px; color: #0f172a; }
.panel-title small { color: #94a3b8; font-size: 10px; }
.action-timeline { display: flex; flex-direction: column; gap: 8px; }
.action-row { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 10px 11px; border: 1px solid #e2e8f0; border-radius: 9px; background: #fbfdff; }
.action-row > b { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; background: #eff6ff; color: #2563eb; font-size: 12px; }
.action-row strong { font-size: 13px; color: #172033; }
.action-row p { margin: 3px 0 0; color: #64748b; font-size: 11px; line-height: 1.5; }
.rationale-list { display: grid; gap: 8px; }
.rationale-row { padding: 10px; border-radius: 9px; background: #f8fafc; border: 1px solid #e2e8f0; }
.rationale-row b { color: #1e3a8a; font-size: 12px; }
.rationale-row p { margin: 4px 0 0; color: #64748b; font-size: 11px; line-height: 1.5; }
.candidates-panel { margin-top: 14px; }
.candidate-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.candidate { display: flex; flex-direction: column; min-height: 132px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fafcff; }
.candidate.best { border-color: #86efac; background: linear-gradient(135deg, #f0fdf4, #ffffff); box-shadow: inset 0 0 0 1px rgba(34,197,94,.15); }
.candidate header { display: flex; justify-content: space-between; align-items: center; color: #94a3b8; font-size: 10px; }
.candidate > strong { display: block; margin-top: 8px; font-size: 14px; color: #0f172a; }
.candidate p { flex: 1; margin: 6px 0 10px; color: #64748b; font-size: 11px; line-height: 1.5; }
.candidate footer { display: flex; justify-content: space-between; align-items: end; gap: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
.candidate footer b { color: #1d4ed8; }
.candidate footer span { color: #64748b; font-size: 11px; text-align: right; }
@media (max-width: 1180px) {
  .decision-hero { grid-template-columns: 1fr; grid-template-areas: "main" "reason" "score"; }
  .decision-main-grid { grid-template-columns: 1fr; }
  .decision-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero-score { min-height: 68px; }
}
@media (max-width: 720px) {
  .decision-kpi-grid,.candidate-grid { grid-template-columns: 1fr; }
  .action-row { grid-template-columns: 28px minmax(0, 1fr); }
  .action-row .el-tag { grid-column: 2; justify-self: start; }
  .decision-line { align-items: flex-start; flex-direction: column; gap: 5px; }
  .hero-main h1 { white-space: normal; }
}
</style>
