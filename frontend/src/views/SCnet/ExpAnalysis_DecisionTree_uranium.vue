<template>
  <div class="mid-stage-bg dt-page dt-cockpit analysis-workspace">
    <AnalysisLinkTabs active="decisionTree">
      <template #right>
        <el-button type="primary" size="small" @click="resetTreeView" :disabled="!isTreeReady">
          <el-icon><Refresh /></el-icon>
          <span>复位视图</span>
        </el-button>
      </template>
    </AnalysisLinkTabs>

    <el-empty
      v-if="!hasDecisionContext"
      class="decision-empty"
      description="请先在实验运行页面选择一个铀供应链实验，或切换到已有历史快照"
      :image-size="120"
    />

    <template v-else>
      <AnalysisPageHero
        eyebrow="对策分析"
        :title="decisionVm.decisionHero.title"
        :headline="decisionVm.decisionHero.headline"
        :summary="decisionVm.decisionHero.summary"
        :tags="heroTags"
      >
        <template #side>
          <article class="hud-control-card">
            <span class="hud-control-label">场景</span>
            <div class="hud-chip-row">
              <button
                v-for="item in scenarioOptionList"
                :key="item.key"
                type="button"
                class="hud-chip"
                :class="{ active: item.key === decisionVm.scenarioKey }"
                :disabled="snapshotMode"
                @click="manualScenarioKey = item.key"
              >
                {{ item.label }}
              </button>
            </div>
          </article>

          <article class="hud-control-card">
            <span class="hud-control-label">时点</span>
            <div class="hud-chip-row">
              <button
                v-for="(item, index) in timeNodeOptions"
                :key="item.label"
                type="button"
                class="hud-chip"
                :class="{ active: index === decisionVm.timeIndex }"
                :disabled="snapshotMode"
                @click="manualTimeIndex = index"
              >
                {{ item.label }}
              </button>
            </div>
          </article>
        </template>
      </AnalysisPageHero>

      <section class="key-conclusion-strip glass-panel">
        <div class="key-conclusion-label">关键性结论</div>
        <article v-for="item in keyConclusions" :key="item.label" :class="['key-conclusion-item', item.tone]">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.detail }}</p>
        </article>
      </section>

      <section class="decision-handoff-strip glass-panel">
        <article v-for="item in decisionHandoffCards" :key="item.label">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.detail }}</p>
        </article>
      </section>

      <div class="dt-console">
        <aside class="dt-side glass-panel">
          <div class="analysis-column-head">
            <span class="analysis-column-index">01</span>
            <div>
              <h3>决策输入台</h3>
              <p>汇总当前情景、基线参照与推荐对策。</p>
            </div>
          </div>

          <div class="dt-source-card">
            <span>当前对策任务</span>
            <strong>{{ decisionVm.inputBridge.eventName }}</strong>
            <p>{{ decisionVm.inputBridge.sourceSummary }}</p>
            <div class="dt-source-grid">
              <div>
                <small>情景窗口</small>
                <p>{{ decisionVm.inputBridge.scenarioLabel }} / {{ decisionVm.inputBridge.timeLabel }}</p>
              </div>
              <div>
                <small>当前风险等级</small>
                <p>{{ decisionVm.decisionHero.stageLabel }}</p>
              </div>
              <div>
                <small>决策事件</small>
                <p>{{ decisionVm.inputBridge.eventName }}</p>
              </div>
              <div>
                <small>展开原则</small>
                <p>{{ decisionVm.inputBridge.treeRule }}</p>
              </div>
            </div>
          </div>

          <div class="dt-kpi-stack">
            <article
              v-for="item in sideKpiCards"
              :key="item.label"
              class="dt-kpi-card"
            >
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <p>{{ item.detail }}</p>
            </article>
          </div>

          <div v-if="baselineMetrics" class="dt-baseline-card">
            <span>未干预基线</span>
            <strong>{{ baselineMetrics.event }}</strong>
            <p>履约 {{ baselineMetrics.fulfillmentRate }}% · 缺口率 {{ baselineMetrics.stockoutRate }}% · 得分 {{ baselineMetrics.score }} 分</p>
          </div>

          <article class="dt-read-order-card">
            <div class="dt-read-order-head">
              <span>当前阶段判断</span>
              <el-tag size="small" :type="decisionVm.stage?.tone === 'danger' ? 'danger' : decisionVm.stage?.tone === 'warning' ? 'warning' : 'success'" effect="light">
                {{ decisionVm.decisionHero.stageLabel }}
              </el-tag>
            </div>
            <strong>{{ decisionVm.decisionHero.stageDetail }}</strong>
            <ol>
              <li>先看未干预基线，确认不动作的代价。</li>
              <li>再看候选动作排序，定位高概率改善路径。</li>
              <li>最后点击节点，核对证据、概率与结果差异。</li>
            </ol>
          </article>

        </aside>

        <main class="tree-panel glass-panel" :style="treePanelStyle">
          <div class="panel-header">
            <div class="panel-header-main">
              <span class="analysis-column-index">02</span>
              <div class="tree-panel-title">
                <strong>对策证据树</strong>
                <small>未干预基线 vs 调控路径对比</small>
              </div>
            </div>
            <div class="tree-panel-legend">
              <span class="legend-chip baseline">未干预基线</span>
              <span class="legend-chip controlled">调控路径</span>
              <span class="tree-hint">滚轮缩放 · 拖拽平移 · 点击节点看详情</span>
            </div>
          </div>
          <div class="tree-canvas-wrapper">
            <div v-if="isTreeReady" class="tree-lane-stack">
              <section class="tree-lane baseline-lane">
                <div class="tree-lane-head">
                  <div>
                    <strong class="tree-lane-title">未干预基线树</strong>
                    <p class="tree-lane-note">如果不做主动调控，系统会如何自然演化。</p>
                  </div>
                </div>
                <div class="tree-lane-canvas compact" :style="baselineCanvasStyle">
                  <div ref="baselineTreeChartRef" class="tree-chart" :style="baselineChartStyle"></div>
                </div>
              </section>

              <section class="tree-lane controlled-lane">
                <div class="tree-lane-head">
                  <div>
                    <strong class="tree-lane-title">调控路径树</strong>
                    <p class="tree-lane-note">围绕候选动作展开分支结果，用来比较相对基线的改善幅度。</p>
                  </div>
                </div>
                <div class="tree-lane-canvas" :style="controlledCanvasStyle">
                  <div ref="controlledTreeChartRef" class="tree-chart" :style="controlledChartStyle"></div>
                </div>
              </section>
            </div>
            <el-empty v-else description="该场景时点对策路径待建设" :image-size="120" />
          </div>
        </main>

        <aside class="dt-rail glass-panel">
          <div class="dt-rail-inner">
            <div class="analysis-column-head">
              <span class="analysis-column-index">03</span>
              <div>
                <h3>候选动作排序</h3>
                <p>动作赛道、结果差异与推荐顺序，可直接定位到策略节点。</p>
              </div>
            </div>

            <article class="dt-focus-card" :class="{ muted: !bestStrategy }">
              <div class="dt-focus-head">
                <div>
                  <span>当前推荐</span>
                  <strong>{{ bestStrategy?.name || '等待推荐动作' }}</strong>
                </div>
                <el-button
                  v-if="bestStrategy"
                  link
                  type="primary"
                  class="dt-focus-action"
                  @click="openStrategyNode(bestStrategy.id)"
                >
                  查看路径
                </el-button>
              </div>
              <p>{{ bestStrategy?.note || '当前场景尚未返回动作评分，候选排序生成后会自动聚焦推荐动作。' }}</p>
              <div class="dt-focus-grid">
                <div>
                  <small>预计得分</small>
                  <strong>{{ bestStrategy ? `${bestStrategy.score} 分` : '--' }}</strong>
                </div>
                <div>
                  <small>较基线</small>
                  <strong>{{ bestStrategyImprovementText }}</strong>
                </div>
                <div>
                  <small>高概率结果</small>
                  <strong>{{ bestStrategySuccessText }}</strong>
                </div>
                <div>
                  <small>结果指向</small>
                  <strong>{{ bestStrategyOutcomeText }}</strong>
                </div>
              </div>
            </article>

            <div v-if="decisionVm.strategyDeck.length" class="sb-items">
              <article
                v-for="item in decisionVm.strategyDeck"
                :key="item.id"
                class="sb-item"
                :class="{ best: item.isBest, active: selectedStrategyId === item.id }"
                tabindex="0"
                @click="openStrategyNode(item.id)"
                @keydown.enter.prevent="openStrategyNode(item.id)"
                @keydown.space.prevent="openStrategyNode(item.id)"
              >
                <div class="sb-row">
                  <span class="sb-name">#{{ item.rank }} {{ item.title }}</span>
                  <span class="sb-score">{{ item.scoreText }}</span>
                </div>
                <el-progress
                  :percentage="item.percent"
                  :show-text="false"
                  :stroke-width="8"
                  :color="item.isBest ? '#f59e0b' : '#94a3b8'"
                />
                <p class="sb-note">{{ item.note }}</p>
                <div class="sb-metrics">
                  <span>{{ item.improvementText }}</span>
                  <span>{{ item.successText }}</span>
                </div>
                <div class="sb-outcome">{{ item.outcomeText }}</div>
                <el-tag v-if="item.isBest" type="warning" size="small" effect="dark" class="best-tag">推荐</el-tag>
              </article>
            </div>
            <el-empty v-else description="当前场景与时点暂未生成策略评分" :image-size="60" />
          </div>
        </aside>
      </div>

      <section class="dependency-panel glass-panel">
        <header class="dependency-head">
          <div><span>04 · 落地依赖</span><h3>推荐对策所需的资源、协同主体与执行顺序</h3></div>
          <el-tag type="info" effect="plain">{{ dependencyCards.length }} 项关键依赖</el-tag>
        </header>
        <div class="dependency-flow">
          <article v-for="(item, index) in dependencyCards" :key="item.label" class="dependency-card">
            <span class="dependency-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div><small>{{ item.type }}</small><strong>{{ item.label }}</strong><p>{{ item.detail }}</p></div>
            <el-tag size="small" :type="item.tagType" effect="light">{{ item.level }}</el-tag>
          </article>
        </div>
        <p class="dependency-conclusion">{{ dependencyConclusion }}</p>
      </section>

      <el-drawer
        v-model="nodePanel.visible"
        direction="rtl"
        size="460px"
        :modal="false"
        append-to-body
        :close-on-click-modal="false"
        :show-close="false"
        :with-header="false"
        class="reasoning-drawer"
      >
        <template v-if="nodePanel.node">
          <div class="drawer-header">
            <div class="drawer-header-main">
              <el-tag size="small" :type="nodePanel.node.isLeaf ? 'success' : 'primary'" effect="dark">
                {{ nodePanel.node.isLeaf ? '结果节点' : '决策节点' }}
              </el-tag>
              <el-tag
                v-if="nodePanel.node.track"
                size="small"
                :type="nodePanel.node.track === 'baseline' ? 'danger' : 'success'"
                effect="plain"
              >
                {{ nodePanel.node.track === 'baseline' ? '未干预基线' : '调控路径' }}
              </el-tag>
              <span class="drawer-title">{{ nodePanel.node.action || nodePanel.node.name }}</span>
            </div>
            <el-button link class="drawer-close-btn" @click="nodePanel.visible = false">关闭</el-button>
          </div>

          <div class="drawer-body">
            <el-collapse v-model="drawerActivePanels" class="drawer-collapse">
              <el-collapse-item name="overview">
                <template #title>
                  <span class="collapse-title-text">节点概览</span>
                </template>
                <div class="drawer-meta-row">
                  <span class="drawer-label">执行主体</span>
                  <span>{{ nodePanel.node.actor }}</span>
                </div>
                <div class="drawer-meta-row" v-if="nodePanel.node.prob < 1">
                  <span class="drawer-label">分支概率</span>
                  <span>{{ Math.round(nodePanel.node.prob * 100) }}%</span>
                </div>
                <p class="drawer-desc">{{ nodePanel.node.desc }}</p>
              </el-collapse-item>

              <el-collapse-item v-if="decisionNodeDetails" name="reasoning">
                <template #title>
                  <span class="collapse-title-text">推理依据</span>
                </template>
                <h5 class="result-sub-title">思考过程</h5>
                <el-steps direction="vertical" :active="decisionNodeDetails.thinkingSteps.length" finish-status="success" class="thinking-steps">
                  <el-step
                    v-for="(step, idx) in decisionNodeDetails.thinkingSteps"
                    :key="`thinking-${idx}`"
                    :description="step"
                  />
                </el-steps>

                <h5 class="result-sub-title">策略知识来源</h5>
                <div class="source-list">
                  <div v-for="(src, idx) in decisionNodeDetails.sources" :key="`source-${idx}`" class="source-item">
                    <div class="source-row">
                      <el-tag size="small" effect="plain" :type="resolveSourceTagType(src.type)" class="knowledge-source-tag">{{ src.type }}</el-tag>
                      <span class="source-name">{{ src.name }}</span>
                    </div>
                    <p class="source-snippet">{{ src.snippet }}</p>
                  </div>
                </div>

                <template v-if="nextLeafProbabilities.length">
                  <h5 class="result-sub-title">下层响应概率</h5>
                  <div class="prob-list">
                    <div v-for="item in nextLeafProbabilities" :key="item.id" class="prob-item">
                      <div class="prob-header">
                        <span class="prob-action">{{ item.action }}</span>
                        <span class="prob-value">{{ item.percent }}%</span>
                      </div>
                      <el-progress :percentage="item.percent" :show-text="false" :stroke-width="6" color="#3b82f6" />
                    </div>
                  </div>
                </template>
              </el-collapse-item>

              <el-collapse-item v-if="nodePanel.node.isLeaf && nodePanel.node.outcome" name="outcome">
                <template #title>
                  <span class="collapse-title-text">结果与对比</span>
                </template>

                <p class="result-text">{{ nodePanel.node.outcome.situation }}</p>

                <div v-if="leafNarrative" class="evac-detail-box">
                  <div class="evac-detail-row">
                    <span class="evac-label">处置办法</span>
                    <p>{{ leafNarrative.method }}</p>
                  </div>
                  <div class="evac-detail-row">
                    <span class="evac-label">实际现象</span>
                    <p>{{ leafNarrative.phenomenon }}</p>
                  </div>
                </div>

                <div class="result-item">
                  <span>风险等级</span>
                  <strong>{{ nodePanel.node.outcome.riskLevel }}</strong>
                </div>
                <div class="result-item">
                  <span>{{ nodePanel.node.outcome.metricLabel || '履约完成率' }}</span>
                  <strong>{{ nodePanel.node.outcome.fulfillmentRate }}</strong>
                </div>
                <div v-if="nodePanel.node.track !== 'baseline'" class="result-item">
                  <span>综合评分</span>
                  <strong>{{ nodePanel.node.outcome.score }} 分</strong>
                </div>

                <div v-if="controlledLeafComparison" class="detail-compare-box">
                  <h5 class="result-sub-title">与未干预基线对比</h5>
                  <p class="compare-event">参照事件：{{ controlledLeafComparison.event }}</p>
                  <div class="compare-metric-row">
                    <span>履约完成率</span>
                    <span>
                      {{ controlledLeafComparison.current.fulfillmentRate }}%
                      （较未干预 {{ formatSigned(controlledLeafComparison.delta.fulfillmentRate, 1) }}%）
                    </span>
                  </div>
                  <div class="compare-metric-row">
                    <span>供给缺口率</span>
                    <span>
                      {{ controlledLeafComparison.current.stockoutRate }}%
                      （较未干预下降 {{ controlledLeafComparison.delta.stockoutDrop.toFixed(2) }}%）
                    </span>
                  </div>
                  <div class="compare-metric-row">
                    <span>综合评分</span>
                    <span>
                      {{ controlledLeafComparison.current.score }} 分
                      （较未干预 {{ formatSigned(controlledLeafComparison.delta.score) }} 分）
                    </span>
                  </div>
                </div>

                <div v-if="leafTrendData" class="density-trend-panel">
                  <h5 class="result-sub-title">履约完成率变化对比</h5>
                  <p class="density-trend-note">
                    {{ leafTrendData.baselineLabel }} vs {{ leafTrendData.methodLabel }} · 24小时内履约完成率提升 {{ leafTrendData.gain }} 个点
                  </p>
                  <div ref="trendChartRef" class="density-trend-chart"></div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </template>
      </el-drawer>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { storeToRefs } from 'pinia'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import AnalysisLinkTabs from './components/shared/AnalysisLinkTabs.vue'
import AnalysisPageHero from './components/shared/AnalysisPageHero.vue'
import './components/shared/midStage.css'
import {
  buildKnowledgeSources,
  buildThinkingSteps,
  generateFulfillmentTrend,
  findParentNodeByChildId,
  SCENARIO_OPTIONS,
  TIME_NODE_OPTIONS
} from './mock/decisionTreeMock.js'
import {
  buildUraniumDecisionTreeViewModel
} from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'

const snapshotStore = useAnalysisSnapshotStore()
const uraniumStore = useUraniumDemoStore()
const { selectedExperiment } = storeToRefs(uraniumStore)

const snapshotMode = computed(() => !!snapshotStore.activeSnapshotId)
const activeSnapshot = computed(() => snapshotStore.getActiveSnapshot())
const hasDecisionContext = computed(() => !!selectedExperiment.value || !!activeSnapshot.value)
const manualScenarioKey = ref('')
const manualTimeIndex = ref(null)
const scenarioOptionList = Object.entries(SCENARIO_OPTIONS).map(([key, label]) => ({ key, label }))
const timeNodeOptions = TIME_NODE_OPTIONS
const decisionVm = computed(() => buildUraniumDecisionTreeViewModel({
  experiment: selectedExperiment.value,
  snapshot: activeSnapshot.value,
  manualScenarioKey: manualScenarioKey.value,
  manualTimeIndex: manualTimeIndex.value
}))

const baselineTreeChartRef = ref(null)
const controlledTreeChartRef = ref(null)
const trendChartRef = ref(null)
let baselineTreeChart = null
let controlledTreeChart = null
let trendChart = null

const nodePanel = reactive({ visible: false, node: null })
const drawerActivePanels = ref(['overview'])

const currentScenarioLabel = computed(() => decisionVm.value?.currentScenarioLabel || '未知场景')
const currentTimeLabel = computed(() => decisionVm.value?.currentTimeLabel || '未知时点')
const currentTree = computed(() => decisionVm.value?.tree || null)
const isTreeReady = computed(() => !!currentTree.value)
const baselineMetrics = computed(() => decisionVm.value?.baselineMetrics || null)
const bestStrategy = computed(() => decisionVm.value?.bestStrategy || null)
const heroTags = computed(() => {
  const rows = [
    { label: '场景', value: currentScenarioLabel.value },
    { label: '时点', value: currentTimeLabel.value },
    {
      label: '推荐动作',
      value: bestStrategy.value?.name || '等待推荐动作',
      type: bestStrategy.value ? 'success' : 'warning'
    }
  ]
  if (snapshotMode.value) rows.push({ label: '快照模式', type: 'warning' })
  return rows
})
const baselineBranchTree = computed(() => currentTree.value?.children?.find((item) => item.track === 'baseline') || null)
const controlledBranchTree = computed(() => decisionVm.value?.controlledBranchTree || currentTree.value?.children?.find((item) => item.track === 'controlled') || null)
const strategyNodeIds = computed(() => new Set((decisionVm.value?.strategyDeck || []).map((item) => item.id)))
const sideKpiCards = computed(() => {
  const cards = decisionVm.value?.decisionHero?.kpis || []
  const preferred = cards.filter((item) => ['承压年份', '候选数量'].includes(item.label))
  return preferred.length ? preferred : cards.slice(2, 4)
})
const bestStrategyImprovementText = computed(() => (
  bestStrategy.value?.improvement == null ? '--' : `${formatSigned(bestStrategy.value.improvement)} 分`
))
const bestStrategySuccessText = computed(() => (
  bestStrategy.value?.successProbability ? `${bestStrategy.value.successProbability}%` : '--'
))
const bestStrategyOutcomeText = computed(() => (
  bestStrategy.value?.bestLeafSituation || '--'
))
const keyConclusions = computed(() => {
  const baseline = baselineMetrics.value
  const best = bestStrategy.value
  return [
    {
      label: '不采取对策', value: baseline ? `缺口率 ${baseline.stockoutRate}%` : '风险持续暴露',
      detail: baseline ? `履约仅 ${baseline.fulfillmentRate}%，基线得分 ${baseline.score} 分。` : '等待基线结果。', tone: 'danger'
    },
    {
      label: '优先对策', value: best?.name || '等待推荐',
      detail: best ? `综合得分 ${best.score} 分，较基线提升 ${formatSigned(best.improvement)} 分。` : '等待候选动作评分。', tone: 'primary'
    },
    {
      label: '最可能结果', value: best ? `${best.successProbability || 0}%` : '--',
      detail: best?.bestLeafSituation || '等待结果分支。', tone: 'success'
    },
    {
      label: '执行时间 / 成本', value: best ? `${Math.max(3, Math.round(18 - best.score * .12))} 天` : '--',
      detail: best ? `预计执行成本指数 ${Math.max(10, Math.round(82 - best.score * .55))}，需联动库存、合同与运输资源。` : '等待对策评估。', tone: 'warning'
    }
  ]
})

const dependencyCards = computed(() => {
  const action = bestStrategy.value?.name || '推荐对策'
  return [
    { type: '前置资源', label: '库存与替代货源', detail: `${action}需预留安全库存，并确认替代供给可调用。`, level: '强依赖', tagType: 'danger' },
    { type: '协同主体', label: '供给方—运输方—制造方', detail: '锁定交付窗口、运输槽位和加工能力，避免局部最优造成链路阻塞。', level: '强依赖', tagType: 'danger' },
    { type: '信息条件', label: '风险预警与需求预测', detail: `围绕${currentTimeLabel.value}持续更新缺口、履约和库存覆盖。`, level: '中依赖', tagType: 'warning' },
    { type: '执行约束', label: '预算、合同与审批', detail: '成本上限、长协条款和应急审批决定对策启动速度。', level: '中依赖', tagType: 'warning' }
  ]
})

const dependencyConclusion = computed(() => {
  const action = bestStrategy.value?.name || '当前推荐对策'
  return `依赖链判断：${action}不能单点执行，应按“库存与货源确认 → 多主体协同 → 合同/预算放行 → 动态监测校准”的顺序推进。`
})
const decisionHandoffCards = computed(() => [
  {
    label: '报告结论',
    value: bestStrategy.value?.name || '等待推荐动作',
    detail: bestStrategy.value ? `将作为报告中的优先行动方案，得分 ${bestStrategy.value.score} 分。` : '策略评分完成后自动写入报告。'
  },
  {
    label: '证据范围',
    value: `${dependencyCards.value.length} 项依赖`,
    detail: '报告会保留资源、主体、信息和审批约束，便于复核执行边界。'
  },
  {
    label: '对比基线',
    value: baselineMetrics.value ? `${baselineMetrics.value.score} 分` : '--',
    detail: baselineMetrics.value ? `未干预缺口率 ${baselineMetrics.value.stockoutRate}%，用于衡量干预收益。` : '等待基线指标。'
  }
])
const selectedStrategyId = computed(() => {
  const node = nodePanel.node
  if (!node || !strategyNodeIds.value.size) return ''
  if (strategyNodeIds.value.has(node.id)) return node.id
  const parent = findParentNodeByChildId(controlledBranchTree.value, node.id)
  return parent && strategyNodeIds.value.has(parent.id) ? parent.id : ''
})

function parsePercentValue(val) {
  if (typeof val === 'number') return val
  if (typeof val !== 'string') return 0
  const m = val.match(/\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : 0
}

function estimateControlledStockout(node) {
  const score = node?.outcome?.score || 0
  const risk = node?.outcome?.riskLevel || ''
  const riskAdjust = risk.includes('高') ? 1.2 : risk.includes('低') ? -1.4 : 0
  return Number(Math.max(2.5, 16 - score * 0.13 + riskAdjust).toFixed(2))
}

function formatSigned(num, digits = 0) {
  const value = Number(num)
  if (Number.isNaN(value)) return '--'
  const fixed = value.toFixed(digits)
  return value > 0 ? `+${fixed}` : fixed
}

const controlledLeafComparison = computed(() => {
  const node = nodePanel.node
  const baseline = baselineMetrics.value
  if (!node?.isLeaf || node.track !== 'controlled' || !node.outcome || !baseline) return null
  const currentFulfillment = parsePercentValue(node.outcome.fulfillmentRate)
  const estimatedStockout = estimateControlledStockout(node)
  const minDrop = 0.6
  const currentStockout = Number(Math.min(estimatedStockout, baseline.stockoutRate - minDrop).toFixed(2))
  const currentScore = node.outcome.score || 0
  return {
    event: baseline.event,
    baseline: { stockoutRate: baseline.stockoutRate, fulfillmentRate: baseline.fulfillmentRate, score: baseline.score },
    current: { stockoutRate: currentStockout, fulfillmentRate: currentFulfillment, score: currentScore },
    delta: {
      stockoutDrop: Number((baseline.stockoutRate - currentStockout).toFixed(2)),
      fulfillmentRate: Number((currentFulfillment - baseline.fulfillmentRate).toFixed(1)),
      score: currentScore - baseline.score
    }
  }
})

const leafNarrative = computed(() => {
  const node = nodePanel.node
  const tree = currentTree.value
  if (!node?.isLeaf || !node.outcome || !tree) return null
  const parent = findParentNodeByChildId(tree, node.id)
  const parentAction = parent?.action || parent?.name || ''
  const method = node.track === 'controlled'
    ? `通过"${parentAction || '组合调度'}"并联动应急预案、采销协同与物流网络进行响应。`
    : '该路径未实施主动调控，主要依赖主供应商/承运商自然恢复与被动响应。'
  const phenomenon = node.track === 'controlled'
    ? `针对"${node.desc || node.outcome.situation}"进行定向处置，结果为：${node.outcome.situation || '风险得到缓解'}。`
    : `出现"${node.desc || node.outcome.situation}"现象，最终表现为：${node.outcome.situation || '风险持续暴露'}。`
  return { method, phenomenon }
})

const leafTrendData = computed(() => {
  const node = nodePanel.node
  const baseline = baselineMetrics.value
  if (!node?.isLeaf || !baseline || node.track === 'baseline') return null
  const parent = findParentNodeByChildId(currentTree.value, node.id)
  const parentAction = parent?.action || ''
  return generateFulfillmentTrend(node, baseline, decisionVm.value?.timeIndex ?? 1, parentAction)
})

const decisionNodeDetails = computed(() => {
  const node = nodePanel.node
  if (!node || node.isLeaf) return null
  return node.reasoning || {
    thinkingSteps: buildThinkingSteps(node.action || node.name, node.desc || ''),
    sources: buildKnowledgeSources(node.id)
  }
})

function collectNextLeafNodes(node, baseProb = 1) {
  if (!node?.children?.length) return []
  const rows = []
  for (const child of node.children) {
    const childProb = baseProb * (child.prob ?? 1)
    if (child.isLeaf) {
      rows.push({ id: child.id, action: child.action, prob: childProb })
      continue
    }
    if (child.children?.length) {
      const leafChildren = child.children.filter((c) => c.isLeaf)
      for (const lc of leafChildren) {
        rows.push({ id: `${child.id}-${lc.id}`, action: `${child.action} → ${lc.action}`, prob: childProb * (lc.prob ?? 1) })
      }
    }
  }
  return rows
}

const nextLeafProbabilities = computed(() => {
  const node = nodePanel.node
  if (!node || node.isLeaf) return []
  return collectNextLeafNodes(node)
    .map((item) => ({ ...item, percent: Math.round(item.prob * 100) }))
    .sort((a, b) => b.percent - a.percent)
})

function countLeafNodes(node) {
  if (!node) return 0
  if (node.isLeaf || !node.children?.length) return 1
  return node.children.reduce((sum, child) => sum + countLeafNodes(child), 0)
}

function countTreeDepth(node) {
  if (!node) return 0
  if (!node.children?.length) return 1
  return 1 + Math.max(...node.children.map((child) => countTreeDepth(child)))
}

function buildBranchMetrics(node, options = {}) {
  const leafCount = countLeafNodes(node)
  const depth = countTreeDepth(node)
  const compact = !!options.compact
  const chartHeight = Math.max(options.minHeight || 360, 180 + leafCount * (compact ? 80 : 94))
  const nodeGap = leafCount >= 8 ? 70 : leafCount >= 6 ? 60 : leafCount >= 4 ? 52 : 44
  const layerPadding = compact ? 122 : depth >= 4 ? 156 : 144
  return { chartHeight, nodeGap, layerPadding }
}

const baselineTreeMetrics = computed(() => buildBranchMetrics(baselineBranchTree.value, { minHeight: 320, compact: true }))
const controlledTreeMetrics = computed(() => buildBranchMetrics(controlledBranchTree.value, { minHeight: 620 }))

const treePanelStyle = computed(() => ({
  minHeight: `${baselineTreeMetrics.value.chartHeight + controlledTreeMetrics.value.chartHeight + 190}px`
}))

const baselineCanvasStyle = computed(() => ({
  minHeight: `${baselineTreeMetrics.value.chartHeight}px`,
  height: `${baselineTreeMetrics.value.chartHeight}px`
}))

const baselineChartStyle = computed(() => ({
  height: `${baselineTreeMetrics.value.chartHeight}px`
}))

const controlledCanvasStyle = computed(() => ({
  minHeight: `${controlledTreeMetrics.value.chartHeight}px`,
  height: `${controlledTreeMetrics.value.chartHeight}px`
}))

const controlledChartStyle = computed(() => ({
  height: `${controlledTreeMetrics.value.chartHeight}px`
}))

function findNodeById(node, targetId) {
  if (!node || !targetId) return null
  if (node.id === targetId) return node
  if (!node.children?.length) return null
  for (const child of node.children) {
    const matched = findNodeById(child, targetId)
    if (matched) return matched
  }
  return null
}

function resolveDrawerPanels(node) {
  if (!node) return ['overview']
  if (node.isLeaf && node.outcome) return ['overview', 'outcome']
  return ['overview', 'reasoning']
}

function openStrategyNode(strategyId) {
  const matched = findNodeById(controlledBranchTree.value, strategyId)
  if (!matched) return
  nodePanel.node = matched
  nodePanel.visible = true
}

function resolveSourceTagType(type) {
  if (type === '应急预案') return 'warning'
  if (type === '联动手册') return 'info'
  if (type === '历史复盘') return 'success'
  return ''
}

function toEcNode(node, compact = false) {
  const isRoot = node.depth === 0
  const isLeaf = node.isLeaf || !node.children?.length
  let color = '#e0edff', border = '#4f8cf6', shadow = `${border}30`
  if (isRoot) {
    color = '#f3e8ff'; border = '#9333ea'; shadow = 'rgba(147,51,234,0.28)'
  } else if (!isLeaf && node.track === 'baseline') {
    color = '#fff1f2'; border = '#fb7185'
  } else if (!isLeaf && node.track === 'controlled') {
    color = '#ecfdf5'; border = '#22c55e'
  } else if (isLeaf) {
    const s = node.outcome?.score || 0
    if (s >= 80) { color = '#dcfce7'; border = '#10b981'; shadow = 'rgba(16,185,129,0.24)' }
    else if (s >= 70) { color = '#ffedd5'; border = '#f59e0b'; shadow = 'rgba(245,158,11,0.24)' }
    else { color = '#fee2e2'; border = '#ef4444'; shadow = 'rgba(239,68,68,0.24)' }
  }
  const title = node.name || '未命名'
  const scoreText = node.outcome?.score ? `${node.outcome.score}分` : ''
  const subtitle = isRoot ? '场景起点' : (isLeaf ? '结果节点' : '策略节点')

  return {
    name: node.name,
    _raw: node,
    symbol: 'roundRect',
    symbolSize: isRoot
      ? (compact ? [176, 64] : [184, 68])
      : (isLeaf ? (compact ? [146, 58] : [152, 62]) : (compact ? [156, 60] : [164, 64])),
    itemStyle: { color, borderColor: border, borderWidth: isRoot ? 2.6 : 2, borderRadius: 14, shadowBlur: isRoot ? 22 : 14, shadowOffsetY: 3, shadowColor: shadow },
    label: {
      lineHeight: compact ? 16 : 18,
      rich: {
        title: { color: '#0f172a', fontSize: compact ? 11 : (isRoot ? 13 : 12), fontWeight: 700, lineHeight: compact ? 16 : 18 },
        sub: { color: '#64748b', fontSize: compact ? 9 : 10, fontWeight: 500, lineHeight: compact ? 13 : 14 },
        score: { color: '#0f172a', fontSize: compact ? 10 : 11, fontWeight: 700, lineHeight: compact ? 14 : 16 }
      },
      formatter(p) {
        const raw = p.data?._raw
        if (!raw) return p.name
        if (raw.isLeaf && raw.outcome?.score && raw.track !== 'baseline') return `{title|${title}}\n{score|${scoreText}}`
        return `{title|${title}}\n{sub|${subtitle}}`
      }
    },
    children: isLeaf ? [] : node.children.map((c) => toEcNode(c, compact))
  }
}

function renderBranchTree(chart, branchTree, metrics, options = {}) {
  if (!chart || !branchTree) return
  const ecRoot = toEcNode(branchTree, !!options.compact)
  chart.setOption({
    backgroundColor: { type: 'radial', x: 0.5, y: 0.25, r: 0.95, colorStops: [
      { offset: 0, color: '#f8fbff' }, { offset: 0.62, color: '#eef4ff' }, { offset: 1, color: '#e6edf9' }
    ]},
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: '#1e293b',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12, lineHeight: 18 },
      padding: 10,
      formatter(params) {
        const raw = params.data?._raw
        if (!raw) return ''
        const probability = raw.prob < 1 ? `<br/>分支概率：${Math.round(raw.prob * 100)}%` : ''
        const score = raw.outcome?.score && raw.track !== 'baseline' ? `<br/>综合评分：${raw.outcome.score} 分` : ''
        return `<b style="font-size:13px;color:#f8fafc;">${raw.action || raw.name}</b><br/><span style="color:#cbd5e1;">${raw.desc}</span>${probability}${score}`
      }
    },
    series: [{
      type: 'tree', data: [ecRoot],
      top: '8%', left: '4%', bottom: '8%', right: '4%',
      orient: 'LR', roam: true,
      scaleLimit: { min: 0.65, max: 1.8 },
      edgeShape: 'curve', edgeForkPosition: '50%',
      nodeGap: metrics.nodeGap, layerPadding: metrics.layerPadding, initialTreeDepth: -1,
      lineStyle: { color: '#94a3b8', width: 2.3, curveness: 0.52, opacity: 0.92 },
      label: { position: 'inside', align: 'center', verticalAlign: 'middle' },
      emphasis: {
        focus: 'descendant',
        lineStyle: { width: 3.4, color: '#3b82f6' },
        itemStyle: { shadowBlur: 26, shadowColor: 'rgba(30,41,59,0.32)' },
        label: { fontWeight: 700 }
      },
      animationDuration: 620, animationEasing: 'cubicOut',
      animationDurationUpdate: 860, animationEasingUpdate: 'quarticOut'
    }]
  }, true)
  chart.resize()
}

function bindTreeClick(chart) {
  chart.on('click', (params) => {
    if (!params.data?._raw) return
    nodePanel.node = params.data._raw
    nodePanel.visible = true
  })
}

function initBranchCharts(force = false) {
  if (force) {
    if (baselineTreeChart) {
      baselineTreeChart.dispose()
      baselineTreeChart = null
    }
    if (controlledTreeChart) {
      controlledTreeChart.dispose()
      controlledTreeChart = null
    }
  }

  if (baselineTreeChartRef.value && baselineBranchTree.value) {
    if (!baselineTreeChart) {
      baselineTreeChart = echarts.init(baselineTreeChartRef.value)
      bindTreeClick(baselineTreeChart)
    }
    renderBranchTree(baselineTreeChart, baselineBranchTree.value, baselineTreeMetrics.value, { compact: true })
  } else if (baselineTreeChart) {
    baselineTreeChart.dispose()
    baselineTreeChart = null
  }

  if (controlledTreeChartRef.value && controlledBranchTree.value) {
    if (!controlledTreeChart) {
      controlledTreeChart = echarts.init(controlledTreeChartRef.value)
      bindTreeClick(controlledTreeChart)
    }
    renderBranchTree(controlledTreeChart, controlledBranchTree.value, controlledTreeMetrics.value)
  } else if (controlledTreeChart) {
    controlledTreeChart.dispose()
    controlledTreeChart = null
  }
}

function renderTrendChart() {
  if (!trendChartRef.value || !leafTrendData.value) return
  if (!trendChart) trendChart = echarts.init(trendChartRef.value)
  const trend = leafTrendData.value
  trendChart.setOption({
    grid: { left: 48, right: 18, top: 30, bottom: 26 },
    legend: { top: 2, itemWidth: 10, itemHeight: 6, textStyle: { fontSize: 11, color: '#475569' }, data: ['未干预', '调控后'] },
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v}%` },
    xAxis: {
      type: 'category', boundaryGap: false, data: trend.timeline,
      axisLabel: { fontSize: 10, color: '#64748b' },
      axisLine: { lineStyle: { color: '#cbd5e1' } }
    },
    yAxis: {
      type: 'value', name: '履约完成率',
      nameTextStyle: { color: '#64748b', fontSize: 10, padding: [0, 0, 0, -24] },
      axisLabel: { fontSize: 10, color: '#64748b', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#e2e8f0' } }
    },
    series: [
      { name: '未干预', type: 'line', smooth: true, data: trend.baselineSeries, symbolSize: 6, lineStyle: { width: 2, color: '#ef4444' }, itemStyle: { color: '#ef4444' }, areaStyle: { color: 'rgba(239,68,68,0.09)' } },
      { name: '调控后', type: 'line', smooth: true, data: trend.controlledSeries, symbolSize: 6, lineStyle: { width: 2, color: '#16a34a' }, itemStyle: { color: '#16a34a' }, areaStyle: { color: 'rgba(22,163,74,0.10)' } }
    ]
  }, true)
}

watch(
  () => [nodePanel.visible, nodePanel.node?.id, leafTrendData.value?.gain],
  () => {
    if (!nodePanel.visible || !leafTrendData.value) {
      if (trendChart) { trendChart.dispose(); trendChart = null }
      return
    }
    nextTick(() => renderTrendChart())
  }
)

watch(
  () => nodePanel.node?.id,
  () => {
    drawerActivePanels.value = resolveDrawerPanels(nodePanel.node)
  }
)

watch(
  () => [
    baselineBranchTree.value?.id,
    controlledBranchTree.value?.id,
    baselineTreeMetrics.value.chartHeight,
    baselineTreeMetrics.value.nodeGap,
    controlledTreeMetrics.value.chartHeight,
    controlledTreeMetrics.value.nodeGap
  ],
  () => {
    if (!isTreeReady.value) return
    nextTick(() => initBranchCharts())
  }
)

function resetTreeView() {
  if (!isTreeReady.value) return
  nodePanel.visible = false
  nodePanel.node = null
  drawerActivePanels.value = ['overview']
  nextTick(() => initBranchCharts(true))
  ElMessage.success('对策视图已复位')
}

function onResize() {
  if (baselineTreeChart) baselineTreeChart.resize()
  if (controlledTreeChart) controlledTreeChart.resize()
  if (trendChart) trendChart.resize()
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  uraniumStore.ensureInitialized()
    .then(() => uraniumStore.reloadSelectedExperiment())
    .finally(() => {
      nextTick(() => {
        if (isTreeReady.value) initBranchCharts(true)
      })
    })
})

watch(() => currentTree.value?.id, (next, prev) => {
  if (next === prev) return
  nodePanel.visible = false
  nodePanel.node = null
  if (!next) {
    if (baselineTreeChart) {
      baselineTreeChart.dispose()
      baselineTreeChart = null
    }
    if (controlledTreeChart) {
      controlledTreeChart.dispose()
      controlledTreeChart = null
    }
    return
  }
  nextTick(() => initBranchCharts(true))
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (baselineTreeChart) baselineTreeChart.dispose()
  if (controlledTreeChart) controlledTreeChart.dispose()
  if (trendChart) trendChart.dispose()
})
</script>

<style scoped>
.dt-page {
  padding: 8px 0 32px;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-family: var(--mid-font-sans);
}
.dt-page.analysis-workspace { overflow: visible; }

.decision-empty {
  margin: 0 8px;
  padding: 40px 0 24px;
}

.dt-overview-strip,
.dt-console,
.key-conclusion-strip,
.decision-handoff-strip,
.dependency-panel {
  margin: 0 8px;
}

.key-conclusion-strip {
  display: grid;
  grid-template-columns: 110px repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 10px 12px;
  align-items: stretch;
}

.key-conclusion-label {
  display: flex;
  align-items: center;
  color: #1e3a8a;
  font-size: var(--mid-fs-strong);
  font-weight: 900;
}

.key-conclusion-item {
  padding: 8px 10px;
  border-left: 3px solid #3b82f6;
  border-radius: 7px;
  background: #f8fafc;
}
.key-conclusion-item.danger { border-color: #ef4444; background: #fff7f7; }
.key-conclusion-item.success { border-color: #10b981; background: #f0fdf4; }
.key-conclusion-item span { color: #64748b; font-size: var(--mid-fs-micro); font-weight: 800; }
.key-conclusion-item strong { display: block; margin-top: 3px; color: #0f172a; font-size: var(--mid-fs-strong); }
.key-conclusion-item p { margin: 3px 0 0; color: #64748b; font-size: var(--mid-fs-label); line-height: 1.45; }

.decision-handoff-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 10px 12px;
}

.decision-handoff-strip article {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid #dbe4f0;
  border-radius: 8px;
  background: linear-gradient(180deg, #fff, #f8fafc);
}

.decision-handoff-strip span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-micro);
  font-weight: 800;
}

.decision-handoff-strip strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.decision-handoff-strip p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: var(--mid-fs-label);
  line-height: 1.45;
}

.dependency-panel { padding: 12px 14px; }
.dependency-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dependency-head span { color: #2563eb; font-size: var(--mid-fs-micro); font-weight: 900; letter-spacing: .08em; }
.dependency-head h3 { margin: 4px 0 0; color: #0f172a; font-size: var(--mid-fs-title); }
.dependency-flow { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
.dependency-card { position: relative; display: grid; grid-template-columns: 26px 1fr auto; gap: 8px; padding: 10px; border: 1px solid #dbe4f0; border-radius: 9px; background: linear-gradient(180deg, #fff, #f8fafc); }
.dependency-card:not(:last-child)::after { content: '→'; position: absolute; right: -10px; top: 50%; z-index: 2; color: #3b82f6; font-weight: 900; transform: translate(50%, -50%); }
.dependency-index { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: #dbeafe; color: #1d4ed8; font-size: var(--mid-fs-micro); font-weight: 900; }
.dependency-card small { color: #64748b; font-size: var(--mid-fs-micro); }
.dependency-card strong { display: block; margin-top: 3px; color: #0f172a; font-size: var(--mid-fs-strong); }
.dependency-card p { margin: 4px 0 0; color: #64748b; font-size: var(--mid-fs-label); line-height: 1.5; }
.dependency-card :deep(.el-tag) { align-self: start; }
.dependency-conclusion { margin: 10px 0 0; padding: 8px 10px; border-radius: 7px; background: #eff6ff; color: #1e3a8a; font-size: var(--mid-fs-label); line-height: 1.55; }

.hud-control-card {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.hud-control-label,
.dt-kpi-card span,
.dt-baseline-card span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.hud-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.hud-chip {
  border: 0;
  border-radius: 999px;
  padding: 4px 9px;
  background: #dbeafe;
  color: #1e3a8a;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.hud-chip:hover:not(:disabled) {
  transform: translateY(-1px);
}

.hud-chip.active {
  background: #1d4ed8;
  color: #ffffff;
}

.hud-chip:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.dt-console {
  display: grid;
  grid-template-columns: minmax(280px, 0.78fr) minmax(0, 2.05fr) minmax(320px, 0.9fr);
  gap: 12px;
  align-items: start;
}

.dt-side {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.dt-source-card {
  padding: 10px 12px;
  border-radius: var(--mid-radius-md);
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.dt-source-card span,
.dt-source-grid small {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.dt-source-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
  line-height: var(--mid-lh-tight);
  overflow-wrap: anywhere;
}

.dt-source-card > p {
  margin: 8px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

.dt-source-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.dt-source-grid div {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid #dbeafe;
  background: rgba(255, 255, 255, 0.92);
}

.dt-source-grid p {
  margin: 6px 0 0;
  color: #0f172a;
  font-size: 12px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.dt-kpi-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dt-kpi-card,
.dt-baseline-card,
.dt-bridge-card {
  padding: 10px 12px;
  border-radius: var(--mid-radius-md);
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.dt-kpi-card strong,
.dt-baseline-card strong,
.dt-bridge-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
  line-height: var(--mid-lh-tight);
}

.dt-kpi-card p,
.dt-baseline-card p,
.dt-bridge-card p {
  margin: 8px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

.dt-baseline-card {
  border-color: #dbeafe;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.dt-read-order-card {
  padding: 10px 12px;
  border: 1px solid #dbeafe;
  border-radius: var(--mid-radius-md);
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.dt-read-order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dt-read-order-head span {
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.dt-read-order-card > strong {
  display: block;
  margin-top: 7px;
  color: #1e3a8a;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
}

.dt-read-order-card ol {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: 1.7;
}

.dt-bridge-card {
  border-color: #bfdbfe;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 34%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.dt-bridge-card span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.dt-bridge-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.tree-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, #f8fbff 0%, #f3f7ff 100%);
  border: 1px solid #dbe6f3;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.08);
  min-width: 0;
  min-height: 0;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px;
  font-size: 13px; font-weight: 700; color: #334155;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.1) 55%, rgba(219, 234, 254, 0.15) 100%);
  border-bottom: 1px solid #d7e3f2;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.panel-header-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.panel-header-main span {
  overflow-wrap: anywhere;
}
.tree-panel-title { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.tree-panel-title strong { color: #0f172a; font-size: var(--mid-fs-strong); }
.tree-panel-title small { color: #64748b; font-size: var(--mid-fs-micro); font-weight: 600; }
.tree-panel-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.legend-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: var(--mid-fs-micro);
  font-weight: 800;
  letter-spacing: 0.03em;
}
.legend-chip.baseline {
  background: #fff1f2;
  color: #be123c;
}
.legend-chip.controlled {
  background: #ecfdf5;
  color: #15803d;
}
.tree-hint { font-size: var(--mid-fs-label); color: #94a3b8; font-weight: 400; overflow-wrap: anywhere; }
.tree-canvas-wrapper {
  position: relative;
  flex: 1;
  overflow: auto;
  padding: 14px;
  background: radial-gradient(circle at 12% 16%, rgba(96, 165, 250, 0.18), transparent 36%),
              radial-gradient(circle at 88% 20%, rgba(125, 211, 252, 0.16), transparent 34%),
              linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(244, 249, 255, 0.9));
}

.tree-lane-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.tree-lane {
  display: flex;
  flex-direction: column;
  border: 1px solid #dbe6f3;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  overflow: hidden;
}

.tree-lane.baseline-lane {
  background: linear-gradient(180deg, rgba(255, 241, 242, 0.62) 0%, rgba(255, 255, 255, 0.82) 100%);
}

.tree-lane.controlled-lane {
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.58) 0%, rgba(255, 255, 255, 0.82) 100%);
}

.tree-lane-head {
  padding: 12px 14px 10px;
  border-bottom: 1px solid #dbe6f3;
}

.tree-lane-title {
  display: block;
  color: #0f172a;
  font-size: 14px;
  font-weight: 800;
}

.tree-lane-note {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.tree-lane-canvas {
  padding: 12px;
  overflow: auto;
}

.tree-lane-canvas.compact {
  padding-top: 10px;
}

.tree-chart {
  width: 100%;
  border: 1px solid #dbe6f3; border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(241, 246, 255, 0.78));
}

/* —— 右侧评分栏 —— */
.dt-rail {
  position: sticky;
  top: 8px;
  align-self: start;
  padding: 14px 16px;
  border-radius: 12px;
  min-width: 0;
  max-height: calc(100vh - 136px);
}

.dt-rail-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.dt-focus-card {
  padding: 10px 12px;
  border-radius: var(--mid-radius-md);
  border: 1px solid rgba(245, 158, 11, 0.35);
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.18), transparent 34%),
    linear-gradient(180deg, #fffaf0 0%, #ffffff 100%);
}

.dt-focus-card.muted {
  border-color: #dbeafe;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.10), transparent 34%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.dt-focus-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dt-focus-head > div {
  min-width: 0;
}

.dt-focus-card span,
.dt-focus-grid small {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.dt-focus-head strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: var(--mid-fs-title);
  line-height: var(--mid-lh-tight);
  overflow-wrap: anywhere;
}

.dt-focus-card > p {
  margin: 10px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

.dt-focus-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.dt-focus-grid div {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.92);
}

.dt-focus-grid strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.sb-items { display: flex; flex-direction: column; gap: 10px; }
.sb-item {
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.78);
  position: relative;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}
.sb-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}
.sb-item:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.sb-item.best { border-color: #f59e0b; background: rgba(255, 251, 235, 0.9); }
.sb-item.active {
  border-color: #2563eb;
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.12);
}
.sb-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.sb-name { font-size: 13px; font-weight: 600; color: #334155; overflow-wrap: anywhere; }
.sb-score { font-size: var(--mid-fs-strong); font-weight: 800; color: #0f172a; white-space: nowrap; }
.sb-note { margin: 8px 0 0; font-size: var(--mid-fs-label); color: #64748b; line-height: 1.55; overflow-wrap: anywhere; }
.sb-metrics { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; color: #475569; font-size: 11px; }
.sb-outcome { margin-top: 8px; color: #0f172a; font-size: var(--mid-fs-label); line-height: 1.55; font-weight: 600; overflow-wrap: anywhere; }
.best-tag { position: absolute; top: 8px; right: 8px; }

.reasoning-drawer :deep(.el-drawer__body) { padding: 0; }
.drawer-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(90deg, #f8fafc, #eef2ff);
}
.drawer-header-main {
  display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; flex-wrap: wrap;
}
.drawer-title { font-size: 13.5px; font-weight: 700; color: #0f172a; line-height: 1.4; }
.drawer-body { padding: 10px 12px 16px; }

.drawer-collapse {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}
.drawer-collapse :deep(.el-collapse-item__header) {
  padding: 0 14px;
  height: 42px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  background: #f8fafc;
}
.drawer-collapse :deep(.el-collapse-item__wrap) { background: #ffffff; }
.drawer-collapse :deep(.el-collapse-item__content) { padding: 12px 14px 16px; }
.collapse-title-text { display: inline-flex; align-items: center; gap: 6px; }

.drawer-meta-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; color: #334155; margin-bottom: 8px; }
.drawer-label { color: #64748b; }
.drawer-desc { margin: 6px 0 0; font-size: var(--mid-fs-label); line-height: 1.7; color: #334155; }

.thinking-steps { padding-top: 4px; }
.source-list { display: flex; flex-direction: column; gap: 8px; }
.source-item { border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; padding: 8px; }
.source-row { display: flex; align-items: center; gap: 8px; }
.source-name { font-size: 12px; font-weight: 600; color: #334155; }
.source-snippet { margin: 6px 0 0; font-size: 11px; line-height: 1.5; color: #64748b; }

.prob-list { display: flex; flex-direction: column; gap: 10px; }
.prob-item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background: #f8fafc; }
.prob-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 6px; }
.prob-action { font-size: 12px; font-weight: 600; color: #334155; line-height: 1.4; }
.prob-value { font-size: 12px; font-weight: 700; color: #1d4ed8; white-space: nowrap; }

.result-sub-title { margin: 14px 0 8px; font-size: 12px; color: #0f172a; font-weight: 700; }
.result-sub-title:first-child { margin-top: 0; }
.result-text { margin: 0 0 10px; font-size: 12px; color: #334155; line-height: 1.6; }
.result-item { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #334155; padding: 8px 0; border-top: 1px dashed #e2e8f0; }

.evac-detail-box { margin: 8px 0 2px; border: 1px solid #dbeafe; border-radius: 8px; background: #f8fbff; padding: 8px 10px; }
.evac-detail-row + .evac-detail-row { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #bfdbfe; }
.evac-label { display: inline-block; margin-bottom: 4px; font-size: 11px; color: #1d4ed8; font-weight: 600; }
.evac-detail-row p { margin: 0; font-size: 11px; line-height: 1.6; color: #334155; }

.detail-compare-box { margin-top: 10px; padding: 10px; border: 1px solid #fbcfe8; border-radius: 8px; background: #fff1f2; }
.compare-event { margin: 0 0 8px; font-size: 11px; color: #7f1d1d; line-height: 1.4; }
.compare-metric-row { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; font-size: 11px; color: #334155; border-top: 1px dashed #fecdd3; }
.compare-metric-row:first-of-type { border-top: none; padding-top: 2px; }

.density-trend-panel { margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 10px; }
.density-trend-panel h5 { margin: 0; font-size: 12px; color: #334155; }
.density-trend-note { margin: 6px 0 8px; font-size: 11px; color: #065f46; background: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 6px; padding: 4px 8px; }
.density-trend-chart { height: 190px; width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; }


@media (max-width: 1200px) {
  .key-conclusion-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .decision-handoff-strip {
    grid-template-columns: 1fr;
  }

  .key-conclusion-label {
    grid-column: 1 / -1;
  }

  .dependency-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dependency-card::after { display: none; }

  .dt-console {
    grid-template-columns: 1fr;
  }

  .dt-source-grid {
    grid-template-columns: 1fr 1fr;
  }

  .dt-rail {
    position: static;
    max-height: none;
  }

  .dt-rail-inner {
    overflow: visible;
  }
}

@media (max-width: 768px) {
  .key-conclusion-strip,
  .decision-handoff-strip,
  .dependency-flow {
    grid-template-columns: 1fr;
  }

  .dependency-head {
    flex-direction: column;
  }

  .dt-focus-grid {
    grid-template-columns: 1fr;
  }

  .dt-bridge-actions,
  .dt-source-grid {
    grid-template-columns: 1fr;
  }

  .compare-metric-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
