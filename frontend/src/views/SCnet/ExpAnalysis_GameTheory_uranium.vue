<template>
  <div class="mid-stage-bg gm-page analysis-workspace">
    <AnalysisLinkTabs active="gameTheory">
      <template #right>
        <el-select
          v-model="scenarioSelectKey"
          size="small"
          class="gt-scenario-select"
          :disabled="snapshotMode"
          :title="snapshotMode ? '快照模式下博弈对象由快照决定' : '切换博弈对象'"
        >
          <el-option v-for="s in SCENARIO_LIST" :key="s.key" :label="s.label" :value="s.key" />
        </el-select>
        <el-button v-if="manualModelKey" plain size="small" @click="manualModelKey = ''">
          恢复推荐模型
        </el-button>
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
        eyebrow="博弈论分析"
        :title="currentEventCard?.value || gameVm.hero.title"
        :headline="gameVm.hero.headline"
        :summary="gameVm.hero.summary"
        :tags="topTags"
      />


      <main class="gm-flow-grid">
        <section class="gm-column input-column glass-panel">
          <header class="analysis-column-head">
            <span class="analysis-column-index">01</span>
            <div>
              <h3>输入</h3>
              <p>把当前窗口读成一组清晰的冲突输入。</p>
            </div>
          </header>

          <article class="focus-card input-focus-card">
            <span>当前判题</span>
            <strong>{{ focusInputCard?.value || '当前窗口约束待识别' }}</strong>
            <p>{{ focusInputCard?.detail || inputLeadText }}</p>
          </article>

          <div class="info-grid compact">
            <article
              v-for="item in primaryInputCards"
              :key="item.label"
              class="info-card"
            >
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <p>{{ item.detail }}</p>
            </article>
          </div>

          <div class="info-stack">
            <article
              v-for="item in secondaryInputCards"
              :key="item.label"
              class="info-card info-card-wide"
            >
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <p>{{ item.detail }}</p>
            </article>
          </div>

        </section>

        <section class="gm-column model-column glass-panel">
          <header class="analysis-column-head">
            <span class="analysis-column-index">02</span>
            <div>
              <h3>选择模型</h3>
              <p>只回答一件事：当前冲突更像哪类博弈。</p>
            </div>
          </header>

          <article class="focus-card model-focus-card">
            <div class="focus-card-head">
              <div>
                <span>当前模型判断</span>
                <strong>{{ currentModel.label }}</strong>
              </div>
              <el-tag size="small" :type="manualModelKey ? 'warning' : 'success'" effect="dark">
                {{ manualModelKey ? '手动选择' : '系统推荐' }}
              </el-tag>
            </div>
            <p>{{ selectedModelReason }}</p>
          </article>

          <div class="model-choice-grid">
            <button
              v-for="item in gameVm.modelSelection.candidateCards"
              :key="item.key"
              type="button"
              class="model-choice-card"
              :class="{ active: item.selected, recommended: item.recommended }"
              @click="manualModelKey = item.key"
            >
              <div class="model-choice-head">
                <span>{{ item.shortLabel }}</span>
                <el-tag v-if="item.recommended" size="small" type="success" effect="dark">推荐</el-tag>
              </div>
              <strong>{{ item.label }}</strong>
              <em>{{ item.oneLiner }}</em>
            </button>
          </div>

          <div class="model-detail-grid">
            <article
              v-for="item in modelDetailCards"
              :key="item.label"
              class="model-detail-card"
            >
              <span>{{ item.label }}</span>
              <p>{{ item.text }}</p>
            </article>
          </div>
        </section>

        <section class="gm-column output-column glass-panel">
          <header class="analysis-column-head">
            <span class="analysis-column-index">03</span>
            <div>
              <h3>收益矩阵与仿真 Agent</h3>
              <p>先读双方最优响应，再判断均衡是否值得直接执行。</p>
            </div>
          </header>

          <section class="payoff-card">
            <div class="payoff-card-head">
              <div>
                <span>收益矩阵</span>
                <strong>{{ currentScenario.player1.label }} / {{ currentScenario.player2.label }}</strong>
              </div>
              <el-tag size="small" type="info" effect="light">行 / 列策略</el-tag>
            </div>

            <div class="payoff-table-wrap">
              <table class="payoff-table">
                <thead>
                  <tr>
                    <th class="corner-cell">
                      <span>{{ currentScenario.player1.shortLabel }}</span>
                      <small>行策略</small>
                    </th>
                    <th v-for="strategy in currentScenario.p2Strategies" :key="strategy.id">
                      {{ strategy.name }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(strategy, rowIndex) in currentScenario.p1Strategies" :key="strategy.id">
                    <th>
                      <span>{{ strategy.name }}</span>
                      <small>{{ strategy.desc }}</small>
                    </th>
                    <td v-for="(cell, colIndex) in payoffMatrix[rowIndex]" :key="`${rowIndex}-${colIndex}`">
                      <button
                        type="button"
                        class="payoff-cell"
                        :class="{
                          selected: selectedMatrixKey === matrixKey(rowIndex, colIndex),
                          equilibrium: isEquilibrium(rowIndex, colIndex),
                          efficient: isEfficientCell(rowIndex, colIndex),
                          fragile: isFragileCell(rowIndex, colIndex)
                        }"
                        @click="selectMatrixCell(rowIndex, colIndex)"
                      >
                        <strong>{{ formatPayoff(cell) }}</strong>
                        <small v-if="isEquilibrium(rowIndex, colIndex)">均衡</small>
                        <small v-else-if="isEfficientCell(rowIndex, colIndex)">总收益最高</small>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="matrix-readout">
              <div class="matrix-readout-main">
                <span>当前读取</span>
                <strong>{{ selectedMatrixLabel }}</strong>
                <p>{{ selectedMatrix?.rationale || '点击矩阵单元格查看该策略组合的业务含义。' }}</p>
              </div>
              <div class="matrix-readout-metrics">
                <div>
                  <small>{{ currentScenario.player1.shortLabel }}收益</small>
                  <strong>{{ selectedMatrix ? Number(selectedMatrix.p1).toFixed(1) : '--' }}</strong>
                </div>
                <div>
                  <small>{{ currentScenario.player2.shortLabel }}收益</small>
                  <strong>{{ selectedMatrix ? Number(selectedMatrix.p2).toFixed(1) : '--' }}</strong>
                </div>
              </div>
            </div>

            <p class="matrix-summary">{{ gameVm.matrixSummary?.alignmentText }}</p>

            <section class="vulnerability-panel">
              <div class="vulnerability-head">
                <div>
                  <span>脆弱性分析</span>
                  <strong>策略组合的五维压力评估</strong>
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
              <p class="metric-method-note">指数由当前收益矩阵的局部波动、最坏收益与场景压力归一化计算，数值越高表示该维度压力越大；鲁棒性数值越高越稳定。</p>
            </section>
          </section>

          <article class="agent-bridge-card">
            <span>当前 Agent</span>
            <strong>{{ simulationAgent.name }}</strong>
            <p>{{ simulationAgent.oneLiner }}</p>
            <div class="agent-context-grid">
              <article
                v-for="item in agentContextCards"
                :key="item.label"
                class="agent-context-card"
              >
                <small>{{ item.label }}</small>
                <strong>{{ item.title }}</strong>
                <p>{{ item.text }}</p>
              </article>
            </div>
            <div class="agent-core-item">
              <small>推理风格</small>
              <p>{{ simulationAgent.thinkingStyle }}</p>
            </div>
          </article>

          <div class="agent-actions">
            <div class="agent-action-grid">
              <el-button type="primary" @click="goToDecisionTree">进入对策分析</el-button>
              <el-button plain @click="goToScenario">返回情景页</el-button>
            </div>
            <p class="agent-action-hint">{{ simulationAgent.handoff }}</p>
          </div>
        </section>
      </main>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import AnalysisLinkTabs from './components/shared/AnalysisLinkTabs.vue'
import AnalysisPageHero from './components/shared/AnalysisPageHero.vue'
import './components/shared/midStage.css'
import { SCENARIO_LIST } from './mock/gameTheoryMock.js'
import { buildUraniumGameTheoryViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'

const router = useRouter()
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
const topTags = computed(() => gameVm.value.hero.tags.filter((item) => ['场景', '时点', '博弈对象', '建议模型'].includes(item.label)))
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
  const cell = selectedMatrix.value
  if (!cell) return []
  const matrix = payoffMatrix.value
  const totals = matrix.flatMap(row => row.map(item => Number(item.p1 || 0) + Number(item.p2 || 0)))
  const maxTotal = Math.max(...totals, 1)
  const minTotal = Math.min(...totals, 0)
  const currentTotal = Number(cell.p1 || 0) + Number(cell.p2 || 0)
  const neighbors = [
    matrix[cell.rowIndex - 1]?.[cell.colIndex], matrix[cell.rowIndex + 1]?.[cell.colIndex],
    matrix[cell.rowIndex]?.[cell.colIndex - 1], matrix[cell.rowIndex]?.[cell.colIndex + 1]
  ].filter(Boolean)
  const sensitivity = clampScore(neighbors.length
    ? neighbors.reduce((sum, item) => sum + Math.abs(currentTotal - Number(item.p1 || 0) - Number(item.p2 || 0)), 0) / neighbors.length / maxTotal * 180
    : 0)
  const rowWorst = Math.min(...matrix[cell.rowIndex].map(item => Number(item.p1 || 0)))
  const colWorst = Math.min(...matrix.map(row => Number(row[cell.colIndex]?.p2 || 0)))
  const robustness = clampScore(((rowWorst + colWorst - minTotal) / Math.max(1, maxTotal - minTotal)) * 100)
  const inventoryPressure = clampScore(38 + sensitivity * 0.42 + (100 - robustness) * 0.2)
  const recoveryDifficulty = clampScore(25 + sensitivity * 0.35 + (100 - robustness) * 0.4)
  const costPressure = clampScore(100 - ((currentTotal - minTotal) / Math.max(1, maxTotal - minTotal)) * 78)
  return [
    { label: '敏感性', value: `${sensitivity}`, score: sensitivity, color: '#f59e0b', detail: '相邻策略切换引起的收益波动' },
    { label: '鲁棒性', value: `${robustness}`, score: robustness, color: '#10b981', detail: '最坏对手响应下的收益保持能力' },
    { label: '库存压力', value: `${inventoryPressure}`, score: inventoryPressure, color: '#3b82f6', detail: '供需偏差对库存缓冲的占用程度' },
    { label: '恢复难度', value: `${recoveryDifficulty}`, score: recoveryDifficulty, color: '#ef4444', detail: '策略失效后恢复稳定状态的难度' },
    { label: '成本压力', value: `${costPressure}`, score: costPressure, color: '#8b5cf6', detail: '相对高收益组合的机会与执行成本' }
  ]
})

const vulnerabilityLevel = computed(() => {
  const rows = vulnerabilityMetrics.value.filter(item => item.label !== '鲁棒性')
  const avg = rows.length ? rows.reduce((sum, item) => sum + item.score, 0) / rows.length : 0
  if (avg >= 70) return { label: '高脆弱', type: 'danger' }
  if (avg >= 45) return { label: '中脆弱', type: 'warning' }
  return { label: '低脆弱', type: 'success' }
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

function goToDecisionTree() {
  router.push(SCNET_ROUTES.expAnalysisDecisionTree)
}

function goToScenario() {
  router.push(SCNET_ROUTES.expAnalysisScenario)
}

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

.vulnerability-head span,
.vulnerability-card span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 800;
}

.vulnerability-head strong {
  display: block;
  margin-top: 3px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
}

.vulnerability-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(112px, 1fr));
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

  .vulnerability-grid { grid-template-columns: repeat(5, minmax(120px, 1fr)); overflow-x: auto; }
}

@media (max-width: 980px) {
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

}

@media (max-width: 768px) {
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
}
</style>
