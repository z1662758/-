<template>
  <div class="decision-page">
    <header class="decision-header">
      <div><span>DECISION GENERATION</span><h2>决策生成</h2><p>把态势推演结果转换为可执行建议，并保留每条建议的证据链。</p></div>
      <el-tag type="success" effect="dark">推演结果已转译</el-tag>
    </header>

    <div v-if="reportVm" class="decision-scroll">
      <section class="verdict-card">
        <div class="verdict-copy">
          <span>推荐决策</span>
          <h1>{{ summary.recommendedStrategy }}</h1>
          <p>{{ summary.headline }}</p>
          <div class="context-line">适用：{{ summary.scenarioLabel }} · {{ summary.timeLabel }} · {{ summary.eventName }}</div>
        </div>
        <div class="verdict-score"><small>相对基线</small><strong>{{ summary.improvementText }}</strong><span>基线 {{ summary.baselineScoreText }}</span></div>
      </section>

      <section class="decision-grid">
        <article class="panel basis-panel">
          <div class="panel-title"><span>01</span><div><strong>决策依据</strong><small>来自推演输出的可复核证据</small></div></div>
          <div class="basis-list">
            <div v-for="item in evidenceRows" :key="item.label" class="basis-row">
              <span>{{ item.label }}</span><strong>{{ item.value }}</strong><p>{{ item.detail }}</p>
            </div>
          </div>
        </article>

        <article class="panel action-panel">
          <div class="panel-title"><span>02</span><div><strong>具体决策方法</strong><small>按优先级落到业务动作</small></div></div>
          <div class="action-list">
            <div v-for="(item, index) in actionRows" :key="item" class="action-row">
              <b>{{ index + 1 }}</b><div><strong>{{ actionTitles[index] || `行动 ${index + 1}` }}</strong><p>{{ item }}</p></div>
              <el-tag :type="index === 0 ? 'danger' : index === 1 ? 'warning' : 'success'" size="small" effect="plain">{{ index === 0 ? '立即' : index === 1 ? '同步' : '持续' }}</el-tag>
            </div>
          </div>
        </article>
      </section>

      <section class="panel candidates-panel">
        <div class="panel-title"><span>03</span><div><strong>候选决策对比</strong><small>相同场景下按综合效用排序，推荐项为后验最优</small></div></div>
        <div class="candidate-grid">
          <article v-for="(item, index) in summary.candidateRows" :key="item.id" :class="['candidate', { best: item.isBest }]">
            <div><span>#{{ index + 1 }}</span><el-tag v-if="item.isBest" type="success" size="small" effect="dark">推荐</el-tag></div>
            <strong>{{ item.name }}</strong><p>{{ item.note || item.outcome }}</p>
            <footer><b>{{ item.scoreText }}</b><span>{{ item.improvementText }}</span></footer>
          </article>
        </div>
      </section>

      <section class="method-strip">
        <strong>生成逻辑</strong><span>推演指标标准化</span><i>→</i><span>安全约束过滤</span><i>→</i><span>多目标效用评分</span><i>→</i><span>贝叶斯后验校准</span><i>→</i><span>输出最优动作与触发条件</span>
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
const reportVm = computed(() => buildUraniumReportViewModel({ experiment: selectedExperiment.value, history: history.value, snapshot: snapshotStore.getActiveSnapshot() }))
const summary = computed(() => reportVm.value?.decisionSummary || {})
const evidenceRows = computed(() => {
  const cards = reportVm.value?.keyResultCards || []
  const windows = reportVm.value?.focusWindowCards || []
  const stressed = windows.find(item => item.tone === 'danger') || windows[0]
  return [
    ...cards.slice(0, 4).map(item => ({ label: item.label, value: item.value, detail: item.hint })),
    { label: '关键压力窗口', value: stressed?.year ? `${stressed.year} 年` : '-', detail: stressed ? `${stressed.headline}；风险 ${stressed.riskText}，缺口 ${stressed.unmetText}` : '待推演补充' }
  ]
})
const actionTitles = ['锁定主供与关键交付', '启用替代来源与备份通道', '滚动调整库存和合同', '设置风险触发阈值']
const actionRows = computed(() => reportVm.value?.recommendations?.length ? reportVm.value.recommendations : [
  '优先保障核心用户和关键交付窗口，冻结高风险期的最低供应份额。',
  '同步验证第二供应源和备用运输通道，避免单点中断继续扩散。',
  '根据库存覆盖与价格变化滚动修正补库节奏和长协比例。',
  '当风险、缺口或库存越过阈值时自动重跑推演并更新方案。'
])

onMounted(() => uraniumStore.ensureInitialized())
</script>

<style scoped>
.decision-page { height: 100%; display: flex; flex-direction: column; background: #f4f7fb; color: #172033; }
.decision-header { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 15px 22px; border-bottom: 1px solid #dce4ee; background: #fff; }
.decision-header span { color: #2563eb; font-size: 10px; font-weight: 800; letter-spacing: .1em; }
.decision-header h2 { margin: 2px 0; font-size: 20px; }.decision-header p { margin: 0; color: #64748b; font-size: 12px; }
.decision-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px 24px; }
.verdict-card { display: flex; justify-content: space-between; align-items: stretch; gap: 22px; padding: 20px 24px; border-radius: 14px; color: #fff; background: linear-gradient(125deg, #17366f, #2563eb 60%, #0f766e); box-shadow: 0 10px 24px rgba(30,64,175,.18); }
.verdict-copy { flex: 1; }.verdict-copy > span { font-size: 11px; opacity: .75; letter-spacing: .08em; }.verdict-copy h1 { margin: 6px 0; font-size: 26px; }.verdict-copy p { margin: 0; max-width: 780px; line-height: 1.65; font-size: 13px; }.context-line { margin-top: 10px; font-size: 11px; opacity: .8; }
.verdict-score { flex: 0 0 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 1px solid rgba(255,255,255,.25); }.verdict-score small,.verdict-score span { opacity: .75; }.verdict-score strong { margin: 5px 0; font-size: 28px; }
.decision-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 14px; margin-top: 14px; }.panel { padding: 15px; border: 1px solid #dce4ee; border-radius: 12px; background: #fff; box-shadow: 0 4px 14px rgba(15,23,42,.04); }
.panel-title { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }.panel-title > span { width: 27px; height: 27px; display: grid; place-items: center; border-radius: 7px; background: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: 800; }.panel-title div { display: flex; flex-direction: column; }.panel-title strong { font-size: 14px; }.panel-title small { color: #94a3b8; font-size: 10px; }
.basis-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.basis-row { padding: 9px; border-radius: 8px; background: #f8fafc; }.basis-row span { display: block; color: #64748b; font-size: 10px; }.basis-row strong { display: block; margin: 3px 0; color: #1d4ed8; font-size: 16px; }.basis-row p { margin: 0; color: #64748b; font-size: 10px; line-height: 1.4; }
.action-list { display: flex; flex-direction: column; gap: 7px; }.action-row { display: grid; grid-template-columns: 25px 1fr auto; align-items: center; gap: 9px; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; }.action-row > b { width: 23px; height: 23px; display: grid; place-items: center; border-radius: 50%; background: #eff6ff; color: #2563eb; }.action-row strong { font-size: 12px; }.action-row p { margin: 2px 0 0; color: #64748b; font-size: 10px; line-height: 1.4; }
.candidates-panel { margin-top: 14px; }.candidate-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }.candidate { padding: 11px; border: 1px solid #e2e8f0; border-radius: 9px; background: #fafcff; }.candidate.best { border-color: #86efac; background: #f0fdf4; }.candidate > div { display: flex; justify-content: space-between; color: #94a3b8; font-size: 10px; }.candidate > strong { display: block; margin-top: 6px; font-size: 13px; }.candidate p { min-height: 30px; margin: 4px 0 8px; color: #64748b; font-size: 10px; line-height: 1.45; }.candidate footer { display: flex; justify-content: space-between; align-items: end; }.candidate footer b { color: #1d4ed8; }.candidate footer span { color: #64748b; font-size: 10px; }
.method-strip { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px; margin-top: 14px; padding: 11px; border-radius: 10px; background: #eef2ff; color: #475569; font-size: 11px; }.method-strip strong { color: #312e81; }.method-strip i { color: #2563eb; font-style: normal; font-weight: 800; }
@media (max-width: 1000px) { .decision-grid { grid-template-columns: 1fr; }.candidate-grid { grid-template-columns: 1fr; } }
</style>
