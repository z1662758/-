<template>
  <div class="mid-stage-bg gm-page analysis-workspace">
    <AnalysisLinkTabs active="gameTheory">
      <template #right>
        <el-tag type="warning" effect="plain">节点 · 资源 · 通道 · 恢复</el-tag>
      </template>
    </AnalysisLinkTabs>

    <el-empty
      v-if="!hasGameContext"
      class="game-empty"
      description="请先在实验运行页面选择一个铀供应链实验，或切换到已有历史快照"
      :image-size="120"
    />

    <template v-else>
      <AnalysisPageHero
        eyebrow="脆弱性分析"
        title="供应链关键节点与通道韧性评估"
        headline="识别中断后果最严重、替代难度最高的供应节点"
        summary="结合事前风险窗口与事中实验结果，从地理依赖、资源依赖、物流通道和恢复能力四个角度进行评估。"
        :tags="topTags"
      />


      <main class="vulnerability-workspace">
        <section class="vulnerability-overview glass-panel">
          <div class="vulnerability-overview-main">
            <span>综合脆弱性等级</span>
            <strong>{{ vulnerabilityLevel.label }}</strong>
            <p>围绕供应国、关键节点、运输通道和库存缓冲评估中断后果。</p>
          </div>
          <div class="vulnerability-overview-grid">
            <article v-for="item in vulnerabilityHeadlineCards" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.detail }}</small>
            </article>
          </div>
        </section>

        <section class="gm-column output-column glass-panel">
          <header class="analysis-column-head">
            <span class="analysis-column-index">01</span>
            <div>
              <h3>关键节点依赖矩阵</h3>
              <p>按地理、资源、运输通道和替代难度定位高暴露节点。</p>
            </div>
          </header>

          <section id="matrix-analysis" ref="matrixSectionRef" class="payoff-card analysis-anchor">
            <div class="payoff-card-head">
              <div>
                <span>矩阵分析</span>
                <strong>关键节点 × 依赖类型</strong>
              </div>
              <el-tag size="small" type="info" effect="light">风险值 0—100</el-tag>
            </div>

            <div class="payoff-table-wrap">
              <table class="payoff-table">
                <thead>
                  <tr>
                    <th class="corner-cell"><span>节点</span><small>依赖类型</small></th>
                    <th v-for="column in dependencyColumns" :key="column">{{ column }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in dependencyMatrixRows" :key="row.node">
                    <th><span>{{ row.node }}</span><small>{{ row.role }}</small></th>
                    <td v-for="cell in row.values" :key="`${row.node}-${cell.label}`">
                      <div class="dependency-matrix-cell" :class="cell.tone">
                        <strong>{{ cell.value }}</strong><small>{{ cell.level }}</small>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="matrix-summary">高风险单元格表示节点对该类依赖缺少替代通道，应优先纳入保供与绕行方案。</p>

            <section id="vulnerability-analysis" ref="vulnerabilitySectionRef" class="vulnerability-panel analysis-anchor">
              <div class="vulnerability-head">
                <div class="analysis-column-head compact-head">
                  <span class="analysis-column-index">02</span>
                  <div>
                    <h3>中断后果与恢复能力</h3>
                    <p>评估系统对扰动的敏感程度、承受能力及恢复代价。</p>
                  </div>
                </div>
                <el-tag size="small" :type="vulnerabilityLevel.type" effect="dark">{{ vulnerabilityLevel.label }}</el-tag>
              </div>
              <div class="vulnerability-grid">
                <article v-for="item in vulnerabilityMetrics" :key="item.label" class="vulnerability-card">
                  <div><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
                  <el-progress :percentage="item.score" :show-text="false" :stroke-width="6" :color="item.color" />
                  <p>{{ item.detail }}</p>
                </article>
              </div>
              <p class="metric-method-note">指数结合当前实验的供应集中度、库存覆盖、缺口、通道冗余与恢复难度归一化计算。</p>
            </section>

            <div class="analysis-column-head dependency-section-head">
              <span class="analysis-column-index">03</span>
              <div>
                <h3>结构依赖与物流稳定性</h3>
                <p>核对单一来源依赖、备选航线承接能力与库存缓冲。</p>
              </div>
            </div>
            <div class="dependency-analysis-grid">
              <section id="structure-analysis" ref="structureSectionRef" class="dependency-card analysis-anchor">
                <div class="dependency-card-head">
                  <span>结构依赖</span>
                  <el-tag size="small" type="warning" effect="plain">网络层</el-tag>
                </div>
                <strong>关键节点与单一来源依赖</strong>
                <div class="dependency-indicators">
                  <div v-for="item in structureIndicators" :key="item.label">
                    <span>{{ item.label }}</span><b>{{ item.value }}</b><small>{{ item.detail }}</small>
                  </div>
                </div>
              </section>
              <section id="logistics-analysis" ref="logisticsSectionRef" class="dependency-card analysis-anchor">
                <div class="dependency-card-head">
                  <span>物流稳定性</span>
                  <el-tag size="small" type="success" effect="plain">通道层</el-tag>
                </div>
                <strong>航线冗余、恢复能力与库存缓冲</strong>
                <div class="dependency-indicators">
                  <div v-for="item in logisticsIndicators" :key="item.label">
                    <span>{{ item.label }}</span><b>{{ item.value }}</b><small>{{ item.detail }}</small>
                  </div>
                </div>
              </section>
            </div>
          </section>

        </section>
      </main>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import AnalysisLinkTabs from './components/shared/AnalysisLinkTabs.vue'
import AnalysisPageHero from './components/shared/AnalysisPageHero.vue'
import './components/shared/midStage.css'
import { buildUraniumGameTheoryViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'

const route = useRoute()
const matrixSectionRef = ref(null)
const vulnerabilitySectionRef = ref(null)
const structureSectionRef = ref(null)
const logisticsSectionRef = ref(null)
const snapshotStore = useAnalysisSnapshotStore()
const uraniumStore = useUraniumDemoStore()
const { history, selectedExperiment, selectedExperimentId } = storeToRefs(uraniumStore)

const snapshotMode = computed(() => !!snapshotStore.activeSnapshotId)
const activeSnapshot = computed(() => snapshotStore.getActiveSnapshot())
const hasGameContext = computed(() => !!selectedExperiment.value || !!activeSnapshot.value)

// 默认场景（无快照时兜底）
const DEFAULT_SCENARIO_KEY = 'supplierVsRetailer'

// 非快照模式下的手动场景切换
const manualScenarioKey = ref('')
const manualModelKey = ref('')
const scenarioSelectKey = computed({
  get() {
    return snapshotMode.value
      ? gameVm.value.scenarioKey
      : (manualScenarioKey.value || baseGameVm.value.scenarioKey || DEFAULT_SCENARIO_KEY)
  },
  set(value) {
    manualScenarioKey.value = value
  }
})

const baseGameVm = computed(() => buildUraniumGameTheoryViewModel({
  experiment: selectedExperiment.value,
  snapshot: activeSnapshot.value,
  manualScenarioKey: manualScenarioKey.value
}))
const gameVm = computed(() => buildUraniumGameTheoryViewModel({
  experiment: selectedExperiment.value,
  snapshot: activeSnapshot.value,
  manualScenarioKey: manualScenarioKey.value,
  manualModelKey: manualModelKey.value
}))
const effectiveScenarioKey = computed(() => baseGameVm.value.scenarioKey)
const currentScenario = computed(() => baseGameVm.value.currentScenario)
const currentModel = computed(() => gameVm.value.modelSelection.selectedModel)
const simulationAgent = computed(() => gameVm.value.modelSelection.simulationAgent)
const topTags = computed(() => gameVm.value.hero.tags.filter((item) => ['场景', '时点'].includes(item.label)))
const payoffMatrix = computed(() => gameVm.value.payoffMatrix || [])
const selectedMatrixKey = ref('')
const selectedMatrix = computed(() => {
  const matrix = payoffMatrix.value
  if (!matrix.length) return null
  const fallbackKey = gameVm.value.matrixSummary?.dominantKey || '0-0'
  const targetKey = selectedMatrixKey.value || fallbackKey
  const [rowIndex, colIndex] = targetKey.split('-').map(Number)
  const cell = matrix[rowIndex]?.[colIndex]
  if (!cell) return null
  return {
    ...cell,
    rowIndex,
    colIndex
  }
})
const selectedMatrixLabel = computed(() => {
  const cell = selectedMatrix.value
  if (!cell) return '等待矩阵'
  return `${currentScenario.value.p1Strategies[cell.rowIndex]?.name || '行策略'} × ${currentScenario.value.p2Strategies[cell.colIndex]?.name || '列策略'}`
})

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
}

const vulnerabilityMetrics = computed(() => {
  const summary = selectedExperiment.value?.summary || selectedExperiment.value?.report || {}
  const toPercent = value => {
    const num = Number(value)
    if (!Number.isFinite(num)) return 0
    return num <= 1 ? num * 100 : num
  }
  const risk = clampScore(toPercent(summary.avg_risk_exposure ?? summary.risk_exposure ?? 0.48))
  const concentration = clampScore(toPercent(summary.final_supply_concentration_hhi ?? summary.avg_supply_hhi ?? 0.56))
  const unmet = clampScore(toPercent(summary.avg_unmet_ratio ?? 0.12))
  const inventoryYears = Number(summary.final_inventory_coverage_years ?? summary.avg_inventory_coverage_years ?? 0.9)
  const inventoryPressure = clampScore(82 - Math.max(0, inventoryYears) * 38 + unmet * .35)
  const sensitivity = clampScore(risk * .48 + concentration * .34 + unmet * .3)
  const robustness = clampScore(100 - risk * .42 - concentration * .28 - inventoryPressure * .22)
  const recoveryDifficulty = clampScore(25 + sensitivity * 0.35 + (100 - robustness) * 0.4)
  const costPressure = clampScore(risk * .36 + recoveryDifficulty * .42 + concentration * .22)
  const recoveryDays = Math.max(3, Math.round(7 + recoveryDifficulty * 0.38))
  const recoveryCost = Math.max(5, Math.round(costPressure * 0.72 + recoveryDifficulty * 0.35))
  return [
    { label: '敏感性', value: `${sensitivity}`, score: sensitivity, color: '#f59e0b', detail: '供应风险、来源集中度与缺口对系统的扰动程度' },
    { label: '鲁棒性', value: `${robustness}`, score: robustness, color: '#10b981', detail: '中断情景下供应、库存与交付能力的保持程度' },
    { label: '库存压力', value: `${inventoryPressure}`, score: inventoryPressure, color: '#3b82f6', detail: '供需偏差对库存缓冲的占用程度' },
    { label: '恢复难度', value: `${recoveryDifficulty}`, score: recoveryDifficulty, color: '#ef4444', detail: '策略失效后恢复稳定状态的难度' },
    { label: '恢复时长', value: `${recoveryDays}天`, score: recoveryDifficulty, color: '#f97316', detail: '关键节点受损后的预估恢复周期' },
    { label: '恢复成本', value: `${recoveryCost}`, score: Math.min(100, recoveryCost), color: '#8b5cf6', detail: '替代采购、航线切换与库存补位的综合成本指数' },
    { label: '成本压力', value: `${costPressure}`, score: costPressure, color: '#6366f1', detail: '相对低脆弱组合的机会与执行成本' }
  ]
})

const vulnerabilityLevel = computed(() => {
  const rows = vulnerabilityMetrics.value.filter(item => item.label !== '鲁棒性')
  const avg = rows.length ? rows.reduce((sum, item) => sum + item.score, 0) / rows.length : 0
  if (avg >= 70) return { label: '高脆弱', type: 'danger' }
  if (avg >= 45) return { label: '中脆弱', type: 'warning' }
  return { label: '低脆弱', type: 'success' }
})

const metricScore = (label, fallback = 50) => (
  vulnerabilityMetrics.value.find(item => item.label === label)?.score ?? fallback
)

const vulnerabilityHeadlineCards = computed(() => [
  { label: '最高风险节点', value: '跨境运输通道', detail: '地缘与物流依赖叠加' },
  { label: '预估恢复时长', value: vulnerabilityMetrics.value.find(item => item.label === '恢复时长')?.value || '--', detail: '关键节点受损后' },
  { label: '结构替代能力', value: `${metricScore('鲁棒性')}%`, detail: '备选国家与航线的承接能力' },
  { label: '库存缓冲压力', value: `${metricScore('库存压力')}%`, detail: '当前库存对中断的覆盖程度' }
])

const dependencyColumns = Object.freeze(['地理依赖', '资源依赖', '通道依赖', '替代难度'])

function dependencyCell(value) {
  const score = Math.max(0, Math.min(100, Math.round(value)))
  return {
    value: score,
    level: score >= 70 ? '高' : score >= 45 ? '中' : '低',
    tone: score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low'
  }
}

const dependencyMatrixRows = computed(() => {
  const sensitivity = metricScore('敏感性')
  const recovery = metricScore('恢复难度')
  const inventory = metricScore('库存压力')
  const robustness = metricScore('鲁棒性')
  const rows = [
    { node: '哈萨克供应链', role: '主要供应国', scores: [72, sensitivity + 8, 78, recovery] },
    { node: '跨境陆运通道', role: '关键物流链路', scores: [82, 38, 88, recovery + 8] },
    { node: '海运备份通道', role: '替代航线', scores: [58, 32, 64, 100 - robustness] },
    { node: '国内储备节点', role: '库存缓冲', scores: [18, inventory, 24, Math.max(20, inventory - 12)] }
  ]
  return rows.map(row => ({
    ...row,
    values: dependencyColumns.map((label, index) => ({ label, ...dependencyCell(row.scores[index]) }))
  }))
})

const structureIndicators = computed(() => {
  const sensitivity = vulnerabilityMetrics.value.find(item => item.label === '敏感性')?.score || 0
  const robustness = vulnerabilityMetrics.value.find(item => item.label === '鲁棒性')?.score || 0
  return [
    { label: '单一节点依赖', value: `${Math.round((sensitivity + 45) / 2)}%`, detail: '由策略切换敏感度估算' },
    { label: '结构替代能力', value: `${robustness}%`, detail: '最坏响应下的结构保持度' },
    { label: '关键链路压力', value: vulnerabilityLevel.value.label, detail: '综合矩阵局部波动与恢复难度' }
  ]
})

const logisticsIndicators = computed(() => {
  const inventory = vulnerabilityMetrics.value.find(item => item.label === '库存压力')?.score || 0
  const recovery = vulnerabilityMetrics.value.find(item => item.label === '恢复难度')?.score || 0
  return [
    { label: '航线冗余度', value: `${Math.max(0, 100 - recovery)}%`, detail: '恢复难度的反向表征' },
    { label: '库存缓冲压力', value: `${inventory}%`, detail: '供需偏差对缓冲库存的占用' },
    { label: '通道稳定等级', value: recovery >= 70 ? '偏低' : recovery >= 45 ? '中等' : '稳定', detail: '结合恢复难度与库存压力判定' }
  ]
})

function focusAnalysisSection(section) {
  const targetMap = {
    matrix: matrixSectionRef,
    vulnerability: vulnerabilitySectionRef,
    structure: structureSectionRef,
    logistics: logisticsSectionRef
  }
  const target = targetMap[section]?.value
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  target.classList.add('is-focused')
  window.setTimeout(() => target.classList.remove('is-focused'), 1300)
}

watch(() => route.query.section, section => nextTick(() => focusAnalysisSection(section)), { immediate: true })
watch(hasGameContext, ready => {
  if (ready) nextTick(() => focusAnalysisSection(route.query.section))
})
const equilibriumCards = computed(() => gameVm.value.equilibriumCards || [])
const playerGuideCards = computed(() => (
  (gameVm.value.playerGuideCards || []).filter((item) => item.id !== 'bridge-guide')
))
const currentEventCard = computed(() => gameVm.value.modelSelection.inputSignalCards.find((item) => item.label === '当前事件') || null)
const visibleInputCards = computed(() => {
  const cards = gameVm.value.modelSelection.inputSignalCards || []
  const priorityLabels = ['参与方', '核心冲突', '时间压力', '关键约束']
  const selected = priorityLabels
    .map((label) => cards.find((item) => item.label === label))
    .filter(Boolean)
  return selected.length ? selected : cards.slice(1, 5)
})
const primaryInputCards = computed(() => {
  const cards = visibleInputCards.value
  return cards.filter((item) => ['参与方', '核心冲突'].includes(item.label))
})
const secondaryInputCards = computed(() => {
  const cards = visibleInputCards.value
  const rows = cards.filter((item) => ['时间压力', '关键约束'].includes(item.label))
  return rows.length ? rows : cards.slice(2)
})
const focusInputCard = computed(() => {
  return gameVm.value.modelSelection.inputSignalCards.find((item) => item.label === '关键约束')
    || visibleInputCards.value[visibleInputCards.value.length - 1]
    || currentEventCard.value
})
const inputLeadText = computed(() => {
  return focusInputCard.value?.detail
    || gameVm.value.hero.briefs?.find((item) => item.label === '冲突焦点')?.text
    || currentScenario.value.viewDesc
})
const selectedModelReason = computed(() => {
  return gameVm.value.modelSelection.candidateCards.find((item) => item.selected)?.reason
    || currentScenario.value.viewDesc
})
// 「为什么是它」已在上方 model-focus-card 展示，这里只列模型自身的定义卡
const modelDetailCards = computed(() => (
  gameVm.value.modelSelection.definitionCards.filter((item) => ['收益结构', '核心洞见', '博弈策略'].includes(item.label))
))
const agentContextCards = computed(() => {
  const cards = []
  const primaryEquilibrium = equilibriumCards.value[0] || null
  const firstGuide = playerGuideCards.value[0] || null
  const secondGuide = playerGuideCards.value[1] || null

  cards.push({
    label: '默认稳定点',
    title: primaryEquilibrium?.pairText || '当前没有纯策略稳定点',
    text: primaryEquilibrium
      ? `收益 ${primaryEquilibrium.payoffText}`
      : '建议优先查看双方均值优势，再决定是否主动调整策略。'
  })

  if (firstGuide) {
    cards.push({
      label: firstGuide.eyebrow,
      title: firstGuide.title,
      text: firstGuide.metricValue && firstGuide.metricValue !== '—'
        ? `平均收益 ${firstGuide.metricValue} · ${firstGuide.summary}`
        : firstGuide.summary
    })
  }

  if (secondGuide) {
    cards.push({
      label: secondGuide.eyebrow,
      title: secondGuide.title,
      text: secondGuide.metricValue && secondGuide.metricValue !== '—'
        ? `平均收益 ${secondGuide.metricValue} · ${secondGuide.summary}`
        : secondGuide.summary
    })
  }

  cards.push({
    label: '当前输入',
    title: simulationAgent.value.currentInput,
    text: simulationAgent.value.modelBinding
  })

  return cards
})
watch(effectiveScenarioKey, () => {
  manualModelKey.value = ''
  selectedMatrixKey.value = ''
})

onMounted(() => {
  uraniumStore.ensureInitialized()
    .then(() => uraniumStore.loadExperiment(selectedExperimentId.value || history.value[0]?.experiment_id || ''))
    .catch(() => {})
})

// 快照切换 → 恢复推荐模型
watch(() => snapshotStore.activeSnapshotId, (next, prev) => {
  if (next === prev) return
  manualModelKey.value = ''
})

watch(selectedExperimentId, (nextId) => {
  if (!nextId) return
  if (selectedExperiment.value?.experiment_id === nextId) return
  uraniumStore.loadExperiment(nextId).catch(() => {})
})

function matrixKey(rowIndex, colIndex) {
  return `${rowIndex}-${colIndex}`
}

function isEquilibrium(rowIndex, colIndex) {
  return gameVm.value.matrixSummary?.dominantKey === matrixKey(rowIndex, colIndex)
    || (gameVm.value.nashEquilibria || []).some((item) => item.row === rowIndex && item.col === colIndex)
}

function isEfficientCell(rowIndex, colIndex) {
  return gameVm.value.matrixSummary?.efficiencyKey === matrixKey(rowIndex, colIndex)
}

function isFragileCell(rowIndex, colIndex) {
  return gameVm.value.matrixSummary?.worstKey === matrixKey(rowIndex, colIndex)
}

function selectMatrixCell(rowIndex, colIndex) {
  selectedMatrixKey.value = matrixKey(rowIndex, colIndex)
}

function formatPayoff(cell) {
  if (!cell) return '-- / --'
  return `${Number(cell.p1).toFixed(1)} / ${Number(cell.p2).toFixed(1)}`
}
</script>

<style scoped>
.vulnerability-workspace {
  display: grid;
  gap: 10px;
  padding: 0 8px 14px;
}

.vulnerability-overview {
  display: grid;
  grid-template-columns: minmax(220px, .7fr) minmax(0, 2.3fr);
  gap: 14px;
  padding: 14px;
}

.vulnerability-overview-main > span { color: #64748b; font-size: var(--mid-fs-label); font-weight: 700; }
.vulnerability-overview-main > strong { display: block; margin-top: 4px; color: #dc2626; font-size: 24px; }
.vulnerability-overview-main > p { margin: 5px 0 0; color: #64748b; font-size: var(--mid-fs-label); line-height: var(--mid-lh-body); }
.vulnerability-overview-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.vulnerability-overview-grid article { padding: 9px 10px; border: 1px solid #e2e8f0; border-radius: 9px; background: #f8fafc; }
.vulnerability-overview-grid span,
.vulnerability-overview-grid small { display: block; color: #64748b; font-size: var(--mid-fs-micro); }
.vulnerability-overview-grid strong { display: block; margin: 4px 0; color: #0f172a; font-size: var(--mid-fs-strong); }

.dependency-matrix-cell {
  min-width: 62px;
  padding: 8px 6px;
  border-radius: 7px;
  text-align: center;
}
.dependency-matrix-cell strong,
.dependency-matrix-cell small { display: block; }
.dependency-matrix-cell strong { font-size: var(--mid-fs-strong); line-height: 1.25; }
.dependency-matrix-cell small { margin-top: 3px; font-size: var(--mid-fs-micro); line-height: 1.4; }
.dependency-matrix-cell.high { color: #b91c1c; background: #fee2e2; }
.dependency-matrix-cell.medium { color: #b45309; background: #fef3c7; }
.dependency-matrix-cell.low { color: #047857; background: #d1fae5; }

.gm-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
  padding: 8px 0 32px;
  font-family: var(--mid-font-sans);
}
.gm-page.analysis-workspace { overflow: visible; }

.game-empty {
  margin: 0 8px;
  padding: 40px 0 24px;
}

.gt-scenario-select {
  width: 168px;
  max-width: 100%;
  margin-right: 8px;
}

.gm-insight-strip,
.gm-flow-grid {
  margin: 0 8px;
}

.gm-insight-strip {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.gm-flow-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.92fr) minmax(380px, 1.06fr) minmax(360px, 1.1fr);
  gap: 12px;
  align-items: stretch;
}

.gm-column {
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  height: 100%;
  min-height: 0;
  min-width: 0;
  gap: 10px;
}

.focus-card,
.info-card,
.model-detail-card,
.agent-bridge-card {
  border-radius: var(--mid-radius-md);
}

.payoff-card {
  padding: 10px 12px;
  border: 1px solid #dbeafe;
  border-radius: var(--mid-radius-md);
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.payoff-card-head,
.matrix-readout {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.payoff-card-head > div,
.matrix-readout-main {
  min-width: 0;
}

.payoff-card-head span,
.matrix-readout-main > span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.payoff-card-head strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
}

.payoff-table-wrap {
  margin-top: 10px;
  overflow-x: auto;
  border: 1px solid #dbe4f0;
  border-radius: var(--mid-radius-sm);
  background: rgba(255, 255, 255, 0.9);
}

.payoff-table {
  width: 100%;
  min-width: 510px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: var(--mid-fs-label);
}

.payoff-table th,
.payoff-table td {
  padding: 7px;
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  text-align: center;
  vertical-align: middle;
}

.payoff-table tr:last-child th,
.payoff-table tr:last-child td {
  border-bottom: 0;
}

.payoff-table th:last-child,
.payoff-table td:last-child {
  border-right: 0;
}

.payoff-table thead th {
  color: #475569;
  background: #f8fafc;
  font-size: var(--mid-fs-label);
  font-weight: 800;
}

.payoff-table tbody th {
  width: 34%;
  color: #0f172a;
  background: #f8fbff;
  text-align: left;
}

.payoff-table tbody th span,
.payoff-table thead th span {
  color: #334155;
  font-size: var(--mid-fs-label);
  font-weight: 800;
  line-height: 1.4;
}

.payoff-table th span,
.payoff-table th small {
  display: block;
}

.payoff-table th small {
  margin-top: 3px;
  color: #94a3b8;
  font-size: var(--mid-fs-micro);
  font-weight: 500;
  line-height: 1.4;
}

.corner-cell {
  text-align: left !important;
}

.corner-cell small {
  margin-top: 3px;
  color: #94a3b8;
  font-size: var(--mid-fs-micro);
  font-weight: 500;
}

.payoff-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
  padding: 7px 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: #f8fafc;
  color: #0f172a;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.payoff-cell:hover {
  transform: translateY(-1px);
  border-color: #93c5fd;
  background: #eff6ff;
}

.payoff-cell strong {
  font-size: var(--mid-fs-strong);
  line-height: 1.2;
}

.payoff-cell small {
  margin-top: 4px;
  color: #64748b;
  font-size: var(--mid-fs-micro);
  font-weight: 800;
}

.payoff-cell.selected {
  border-color: #2563eb;
  background: #dbeafe;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.16);
}

.payoff-cell.equilibrium {
  background: #ecfdf5;
  border-color: #86efac;
}

.payoff-cell.efficient {
  box-shadow: inset 0 0 0 2px #60a5fa;
}

.payoff-cell.fragile {
  background: #fff1f2;
}

.matrix-readout {
  align-items: stretch;
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.matrix-readout-main strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
}

.matrix-readout-main p {
  margin: 5px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
}

.matrix-readout-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(64px, 1fr));
  gap: 8px;
  flex: 0 0 150px;
}

.matrix-readout-metrics div {
  padding: 7px 8px;
  border-radius: 7px;
  background: #f8fafc;
}

.matrix-readout-metrics small,
.matrix-readout-metrics strong {
  display: block;
}

.matrix-readout-metrics small {
  color: #94a3b8;
  font-size: var(--mid-fs-micro);
}

.matrix-readout-metrics strong {
  margin-top: 3px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
}

.matrix-summary {
  margin: 8px 0 0;
  color: #1e3a8a;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
}

.vulnerability-panel {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #cbd5e1;
}

.vulnerability-head,
.vulnerability-card > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.vulnerability-card span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 800;
}

.compact-head { margin: 0; }
.compact-head h3,
.dependency-section-head h3 { margin: 0; color: #0f172a; font-size: var(--mid-fs-strong); }
.compact-head p,
.dependency-section-head p { margin: 3px 0 0; color: #64748b; font-size: var(--mid-fs-label); line-height: var(--mid-lh-body); }
.dependency-section-head { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1; }

.vulnerability-head strong {
  display: block;
  margin-top: 3px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
}

.vulnerability-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(112px, 1fr));
  gap: 7px;
  margin-top: 9px;
}

.vulnerability-card {
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.vulnerability-card strong {
  color: #0f172a;
  font-size: var(--mid-fs-strong);
}

.vulnerability-card :deep(.el-progress) { margin-top: 6px; }
.vulnerability-card p,
.metric-method-note {
  margin: 5px 0 0;
  color: #64748b;
  font-size: var(--mid-fs-micro);
  line-height: 1.45;
}

.metric-method-note { color: #94a3b8; }

.analysis-anchor {
  scroll-margin-top: 72px;
  transition: box-shadow .25s ease, border-color .25s ease;
}

.analysis-anchor.is-focused {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, .14), 0 12px 28px rgba(15, 23, 42, .08);
}

.dependency-analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.dependency-card {
  padding: 12px;
  border: 1px solid #dbe4ef;
  border-radius: 12px;
  background: #f8fafc;
}

.dependency-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dependency-card-head > span { color: #334155; font-size: var(--mid-fs-label); font-weight: 800; }
.dependency-card > strong { display: block; margin-top: 6px; color: #0f172a; font-size: var(--mid-fs-strong); }
.dependency-indicators { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.dependency-indicators > div { min-width: 0; padding: 8px; border-radius: 8px; background: #fff; }
.dependency-indicators span,
.dependency-indicators small { display: block; color: #64748b; font-size: var(--mid-fs-micro); line-height: 1.4; }
.dependency-indicators b { display: block; margin: 3px 0; color: #1d4ed8; font-size: var(--mid-fs-title); }

.info-card span,
.model-detail-card span,
.agent-bridge-card span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.focus-card {
  padding: 10px 12px;
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
  min-width: 0;
}

.focus-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.focus-card-head > div {
  min-width: 0;
}

.focus-card span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.focus-card strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: var(--mid-fs-title);
  line-height: var(--mid-lh-tight);
  overflow-wrap: anywhere;
}

.focus-card p {
  margin: 6px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

.model-focus-card {
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.14), transparent 34%),
    linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.input-focus-card {
  border-color: #bfdbfe;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.info-grid.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.info-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-card,
.model-detail-card,
.agent-bridge-card {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  min-width: 0;
}

.info-card strong,
.agent-bridge-card strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
  line-height: var(--mid-lh-tight);
}

.info-card p,
.model-detail-card p,
.agent-bridge-card p {
  margin: 6px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

.info-card-wide {
  min-height: 0;
}

.info-card-wide strong {
  overflow-wrap: anywhere;
}

.model-choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.model-choice-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 118px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: var(--mid-radius-md);
  border: 1px solid #dbe3ef;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.model-choice-grid > :nth-child(odd):last-child {
  grid-column: 1 / -1;
}

.model-choice-card.active {
  border-color: #2563eb;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.16), transparent 34%),
    linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
  box-shadow: 0 16px 34px rgba(37, 99, 235, 0.12);
}

.model-choice-card.recommended:not(.active) {
  border-color: #86efac;
}

.model-choice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.model-choice-head :deep(.el-tag) {
  flex-shrink: 0;
}

.model-choice-head span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: var(--mid-fs-micro);
  font-weight: 900;
}

.model-choice-card strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
  font-weight: 800;
  overflow-wrap: anywhere;
}

.model-choice-card em {
  display: block;
  margin-top: 6px;
  color: #475569;
  font-size: var(--mid-fs-label);
  font-style: normal;
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

.model-detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.agent-bridge-card {
  background:
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.14), transparent 34%),
    linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
  border-color: #bbf7d0;
}

.agent-bridge-card > strong {
  font-size: var(--mid-fs-title);
}

.agent-context-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.agent-context-card {
  padding: 9px 11px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid rgba(187, 247, 208, 0.95);
  background: rgba(255, 255, 255, 0.88);
  min-width: 0;
}

.agent-context-card small {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.agent-context-card strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
  line-height: var(--mid-lh-tight);
  overflow-wrap: anywhere;
}

.agent-context-card p {
  margin: 5px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

.agent-core-item {
  margin-top: 10px;
  padding: 9px 11px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid rgba(187, 247, 208, 0.95);
  background: rgba(255, 255, 255, 0.88);
}

.agent-core-item small {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.agent-core-item strong {
  margin-top: 4px;
  font-size: var(--mid-fs-strong);
  line-height: var(--mid-lh-tight);
}

.agent-core-item p {
  margin: 5px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
}

.agent-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.agent-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.agent-action-grid :deep(.el-button) {
  width: 100%;
}

.agent-action-hint {
  margin: 0;
  color: #64748b;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

@media (min-width: 1700px) {
  .model-choice-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .model-choice-grid > :nth-child(odd):last-child {
    grid-column: auto;
  }
}

@media (max-width: 1500px) {
  .gm-insight-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  .gm-flow-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .output-column {
    grid-column: 1 / -1;
  }

  .vulnerability-grid { grid-template-columns: repeat(4, minmax(120px, 1fr)); }
}

@media (max-width: 980px) {
  .vulnerability-overview { grid-template-columns: 1fr; }
  .vulnerability-overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gm-insight-strip,
  .gm-flow-grid,
  .info-grid,
  .agent-context-grid {
    grid-template-columns: 1fr;
  }

  .model-choice-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .matrix-readout {
    flex-direction: column;
  }

  .matrix-readout-metrics {
    flex-basis: auto;
  }

  .output-column {
    grid-column: auto;
  }

  .dependency-analysis-grid { grid-template-columns: 1fr; }

}

@media (max-width: 768px) {
  .vulnerability-overview-grid { grid-template-columns: 1fr; }
  .gm-insight-strip {
    grid-template-columns: 1fr;
  }

  .model-choice-grid {
    grid-template-columns: 1fr;
  }

  .focus-card-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .agent-action-grid {
    grid-template-columns: 1fr;
  }

  .vulnerability-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dependency-indicators { grid-template-columns: 1fr; }
}
</style>
