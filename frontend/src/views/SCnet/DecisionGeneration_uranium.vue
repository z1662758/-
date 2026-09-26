<template>
  <div class="decision-page">
    <div v-if="reportVm" class="decision-scroll">
      <section class="decision-summary">
        <div class="decision-heading">
          <div>
            <span class="decision-label">推荐方案</span>
            <h1>{{ summary.recommendedStrategy }}</h1>
          </div>
          <div class="decision-gain"><span>较基线增益</span><strong>{{ summary.improvementText }}</strong></div>
        </div>
        <p class="decision-conclusion">{{ simulationConclusion }}</p>
        <dl class="decision-context">
          <div v-for="item in contextRows" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div>
        </dl>
      </section>

      <dl class="decision-metrics" aria-label="关键结果">
        <div v-for="item in evidenceRows" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div>
      </dl>

      <section class="decision-panel">
        <MidStagePanelHeader title="执行计划" description="按优先顺序安排供应、通道与库存调整" />
        <ol class="action-list">
          <li v-for="(item, index) in actionRows" :key="item" class="action-row">
            <span class="action-number">{{ index + 1 }}</span>
            <div><strong>{{ actionTitles[index] || `行动 ${index + 1}` }}</strong><p>{{ item }}</p></div>
            <el-tag :type="actionTagType(index)" size="small" effect="plain">{{ actionTagText(index) }}</el-tag>
          </li>
        </ol>
      </section>

      <section class="decision-panel">
        <MidStagePanelHeader title="候选方案对比" description="结合对策评分与适用条件选择执行方案" :count="`${candidateRows.length} 项`" />
        <el-table :data="candidateRows" class="decision-table" empty-text="暂无候选方案">
          <el-table-column label="方案" min-width="180">
            <template #default="{ row }"><strong>{{ row.name }}</strong><el-tag v-if="row.isBest" size="small" type="success" effect="plain" class="recommended-tag">推荐</el-tag></template>
          </el-table-column>
          <el-table-column prop="scoreText" label="对策评分" width="110" />
          <el-table-column prop="improvementText" label="较基线变化" min-width="120" />
          <el-table-column label="适用说明" min-width="280">
            <template #default="{ row }">{{ row.note || row.outcome || '暂无说明' }}</template>
          </el-table-column>
        </el-table>
      </section>
    </div>
    <div v-else class="decision-empty">
      <el-empty description="完成实验后，可查看决策建议" :image-size="80">
        <el-button type="primary" @click="goToRun">前往实验管理</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MidStagePanelHeader from './components/shared/MidStagePanelHeader.vue'
import { storeToRefs } from 'pinia'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { buildUraniumReportViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'

const route = useRoute()
const router = useRouter()
function goToRun() {
  const query = { ...route.query, view: 'run' }
  router.replace({ query })
}

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
const stressedWindow = computed(() => {
  const windows = reportVm.value?.focusWindowCards || []
  return windows.find(item => item.isPeak) || windows.find(item => item.tone === 'danger') || windows[0] || null
})
const contextRows = computed(() => [
  { label: '适用场景', value: summary.value.scenarioLabel || '-' },
  { label: '决策时点', value: summary.value.timeLabel || '-' },
  { label: '触发事件', value: summary.value.eventName || '-' }
])
const simulationConclusion = computed(() => {
  const window = stressedWindow.value
  const headline = summary.value?.headline || '推演结果显示当前供应链需要主动干预。'
  if (!window) return headline
  return `${headline} 其中 ${window.year || '-'} 年窗口最值得优先处置，触发因素为“${window.headline || '常态运行'}”，主链路为 ${window.routeText || '关键采购链路'}。`
})
const evidenceRows = computed(() => (reportVm.value?.keyResultCards || []).slice(0, 4))
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
.decision-page { height: 100%; min-height: 0; background: var(--mid-stage-bg); color: #1e293b; }
.decision-scroll { height: 100%; overflow-y: auto; box-sizing: border-box; padding: 16px; }
.decision-summary, .decision-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.decision-summary { padding: 18px 20px; }
.decision-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.decision-label { color: #2563eb; font-size: 12px; }
h1 { margin: 6px 0 0; font-size: 20px; line-height: 1.5; font-weight: 600; }
.decision-gain { flex: 0 0 auto; display: flex; flex-direction: column; gap: 4px; text-align: right; }
.decision-gain span { color: #64748b; font-size: 12px; }
.decision-gain strong { color: #2563eb; font-size: 22px; font-weight: 600; }
.decision-conclusion { color: #475569; font-size: 13px; line-height: 1.8; margin: 14px 0; }
.decision-context { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 0; padding-top: 12px; border-top: 1px solid #f1f5f9; }
.decision-context > div { display: flex; gap: 8px; font-size: 12px; line-height: 1.6; }
dt { color: #64748b; }
dd { margin: 0; }
.decision-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 16px 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.decision-metrics > div { padding: 14px 20px; }
.decision-metrics dt { font-size: 12px; }
.decision-metrics dd { margin-top: 6px; font-size: 18px; font-weight: 600; }
.decision-panel + .decision-panel { margin-top: 16px; }
.action-list { margin: 0; padding: 0 16px; list-style: none; }
.action-row { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 12px; align-items: start; padding: 14px 0; }
.action-row + .action-row { border-top: 1px solid #f1f5f9; }
.action-number { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #2563eb; background: #eff6ff; font-size: 12px; }
.action-row strong { font-size: 13px; font-weight: 600; }
.action-row p { margin: 5px 0 0; color: #64748b; font-size: 13px; line-height: 1.7; }
.decision-table { border-radius: 0 0 8px 8px; font-size: 13px; }
.recommended-tag { margin-left: 8px; }
.decision-empty { display: grid; place-items: center; height: 100%; }
@media (max-width: 900px) { .decision-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) {
  .decision-scroll { padding: 10px; }
  .decision-heading { align-items: start; }
  .action-row { grid-template-columns: 24px minmax(0, 1fr); }
  .action-row .el-tag { grid-column: 2; justify-self: start; }
}
</style>
