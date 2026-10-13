<template>
  <div class="mid-stage-bg gm-page analysis-workspace">
    <el-empty
      v-if="!hasGameContext"
      class="game-empty"
      description="请先在实验运行页面选择一个铀供应链实验，或切换到已有历史快照"
      :image-size="120"
    />

    <template v-else>
      <!-- 统一事中页面目标说明紫色横幅 -->
      <StageGoalStrip
        badge="脆弱性分析目标"
        title="识别中断后果最严重、替代难度最高的供应节点与关键物流走廊"
        desc="通过复杂网络拓扑、度/介数中心度与依赖矩阵，量化评估外部地缘制裁与突发中断冲击下各供给国、关键枢纽和加工基地的脆弱度，直接映射锁定事中调控保供的核心瓶颈靶标。"
        popover-title="脆弱性分析核心聚焦目标"
      >
        <template #side>
          <div class="cfs-chips">
            <span class="cfs-chip danger" title="介数中心度 0.84，宽窄轨换装负荷率达 94%">
              <span class="cfs-dot">●</span> 阿拉山口口岸 (94%)
            </span>
            <span class="cfs-chip danger" title="承接全国 60% 燃料加工，原料库存降至 14 周破安全线">
              <span class="cfs-dot">●</span> 包头制造基地 (库存14周)
            </span>
            <span class="cfs-chip safe" title="纳米比亚湖山矿→连云港，具备 400tU/季度应急承接冗余">
              <span class="cfs-dot">●</span> 连云港海运 (400tU冗余)
            </span>
          </div>
        </template>
      </StageGoalStrip>

      <main class="vulnerability-workspace">
        <section class="vulnerability-overview glass-panel">
          <div class="vulnerability-overview-main">
            <span>综合脆弱性等级</span>
            <strong :class="vulnerabilityLevel.type">{{ vulnerabilityLevel.label }}</strong>
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

        <!-- 01 俄乌冲突高风险节点与通道【脆弱性排行榜】 (脆弱断点直通事中应对调控措施) -->
        <section class="vulnerability-ranking-panel glass-panel">
          <div class="ranking-panel-head">
            <div class="analysis-column-head">
              <span class="analysis-column-index">01</span>
              <div>
                <h3>俄乌冲突高风险节点与通道【脆弱性排行榜】</h3>
                <p>基于地缘制裁断航、中欧口岸换装挤兑与原料库存警戒线综合测算，脆弱断点直接映射事中保供/绕行/补库调控措施</p>
              </div>
            </div>
            <div class="ranking-head-meta">
              <el-tag size="small" type="danger" effect="dark">地缘冲击模式</el-tag>
              <el-tag size="small" type="success" effect="plain">4 大关键瓶颈已锁定</el-tag>
            </div>
          </div>

          <div class="ranking-table-wrapper">
            <el-table :data="vulnerabilityRankingRows" stripe class="ranking-modern-table" style="width: 100%">
              <el-table-column label="排名" width="70" align="center">
                <template #default="{ row }">
                  <span class="rank-num-badge" :class="`rank-${row.rank}`">
                    0{{ row.rank }}
                  </span>
                </template>
              </el-table-column>

              <el-table-column label="关键瓶颈对象" min-width="190">
                <template #default="{ row }">
                  <div class="choke-cell">
                    <div class="choke-title-row">
                      <strong class="choke-name">{{ row.name }}</strong>
                      <el-tag size="small" :type="row.typeTag" effect="plain" class="choke-type-tag">
                        {{ row.type }}
                      </el-tag>
                    </div>
                    <span class="choke-impact">{{ row.impactDesc }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="脆弱度指数" width="140" align="center">
                <template #default="{ row }">
                  <div class="score-cell">
                    <div class="score-num-row">
                      <strong class="score-number">{{ row.score }}</strong>
                      <span class="score-unit">/100</span>
                      <el-tag size="small" :type="row.riskTag" effect="light">{{ row.riskLevel }}</el-tag>
                    </div>
                    <el-progress
                      :percentage="row.score"
                      :show-text="false"
                      :stroke-width="5"
                      :status="row.score >= 85 ? 'exception' : 'warning'"
                    />
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="俄乌地缘致因机制" min-width="230" show-overflow-tooltip>
                <template #default="{ row }">
                  <div class="reason-cell">
                    <el-icon class="reason-icon"><WarningFilled /></el-icon>
                    <span>{{ row.triggerReason }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="事中定向破局措施映射" min-width="260">
                <template #default="{ row }">
                  <div class="dispatch-mapping-cell">
                    <div class="dispatch-chip-row">
                      <el-tag size="small" :type="row.dispatchOrder.tagType" effect="dark">
                        {{ row.dispatchOrder.type }}
                      </el-tag>
                      <strong class="dispatch-title">{{ row.dispatchOrder.name }}</strong>
                    </div>
                    <p class="dispatch-action-text">{{ row.dispatchOrder.action }}</p>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="处置成效预期" width="170">
                <template #default="{ row }">
                  <div class="effect-cell">
                    <el-icon class="effect-icon"><CircleCheckFilled /></el-icon>
                    <span>{{ row.recoveryEffect }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="应对方案联动" width="130" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button
                    size="small"
                    type="primary"
                    plain
                    @click="goToDispatchOrder(row.dispatchOrder.id)"
                  >
                    查看应对措施 →
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </section>

        <section class="gm-column output-column glass-panel">
          <header class="analysis-column-head">
            <span class="analysis-column-index">02</span>
            <div>
              <h3>关键节点多维依赖矩阵与恢复评估</h3>
              <p>评估核心枢纽对地理、资源、通道的敏感性与鲁棒性恢复难度</p>
            </div>
          </header>

          <section id="matrix-analysis" ref="matrixSectionRef" class="payoff-card analysis-anchor">
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
        <section class="vulnerability-priority glass-panel">
          <div class="analysis-column-head">
            <span class="analysis-column-index">03</span>
            <div>
              <h3>处置优先级</h3>
              <p>按脆弱性评分生成保供、绕行、补库顺序。</p>
            </div>
          </div>
          <div class="priority-grid">
            <article v-for="(item, index) in vulnerabilityPriorityCards" :key="item.title" :class="item.tone">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.detail }}</p>
              </div>
              <el-tag size="small" :type="item.tagType" effect="light">{{ item.level }}</el-tag>
            </article>
          </div>
        </section>

        <!-- A1 筛选依据与脆弱性演进闭环 (执行流水线) -->
        <section class="algorithm-screening-panel glass-panel">
          <div class="screening-panel-header">
            <div class="analysis-column-head">
              <span class="analysis-column-index">A1</span>
              <div>
                <h3>脆弱性评估依据与闭环流水线</h3>
                <p>基于敏感性矩阵与鲁棒性评分动态抽样赋予风险权重，反馈结果用于修正下一轮对策树排序。</p>
              </div>
            </div>
            <div class="screening-status-pill">
              <span class="mc-iter-tag">博弈收敛判定：已达成</span>
              <el-tag size="small" type="success" effect="plain">反馈闭环已联通</el-tag>
            </div>
          </div>

          <div class="algorithm-pipeline-track">
            <div
              v-for="(item, index) in algorithmFlowCards"
              :key="item.label"
              class="pipeline-step-card"
              :class="'step-tier-' + (index + 1)"
            >
              <div class="pipeline-step-head">
                <span class="step-badge">STEP 0{{ index + 1 }}</span>
                <span class="step-role-label">{{ item.label }}</span>
              </div>
              <div class="pipeline-step-body">
                <strong class="step-value">{{ item.value }}</strong>
                <p class="step-detail">{{ item.detail }}</p>
              </div>
              <div class="pipeline-step-footer">
                <span class="pipeline-status-text">
                  {{ index === 0 ? '标的对象已锁定' : index === 1 ? '韧性指标已达标' : index === 2 ? '权重调节就绪' : '输入对策树推演' }}
                </span>
                <el-icon v-if="index < algorithmFlowCards.length - 1" class="step-arrow-icon"><Right /></el-icon>
              </div>
            </div>
          </div>
        </section>
      </main>
    </template>

    <!-- 统一流程导航 -->
    <DuringWorkflowNav
      back="/home/SCnet/interface?view=simulation"
      back-label="上一步：沙盘推演"
      process-view="/home/SCnet/interface?view=simulation&theaterMode=replay"
      process-label="过程查看 (剧场回放)"
      next="/home/SCnet/expAnalysisScenario"
      next-label="下一步：决策分析评估"
    />
  </div>
</template>

<script setup>
import { buildUraniumVulnerability, uraniumVulnerabilityLevel } from '@/utils/uraniumVulnerability'
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { Right, WarningFilled, CircleCheckFilled, Location, TrendCharts, Document, Promotion, Finished, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import StageGoalStrip from './components/shared/StageGoalStrip.vue'
import DuringWorkflowNav from './components/DuringWorkflowNav.vue'
import './components/shared/midStage.css'
import { useUraniumAnalysisExperiment } from './composables/useUraniumAnalysisExperiment'
import { buildUraniumGameTheoryViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'
import { createUraniumDemoSeed } from '@/views/SCnet/mock/uraniumDemoLab'

useUraniumAnalysisExperiment()
const route = useRoute()
const router = useRouter()

function goToSimulation() {
  router.push({
    path: '/home/SCnet/interface',
    query: { ...route.query, scenario: 'uranium' }
  })
}

function goToStrategyAnalysis() {
  router.push({
    path: '/home/SCnet/expAnalysisScenario',
    query: { ...route.query, scenario: 'uranium' }
  })
}

function goToDispatchOrder(orderId = '') {
  router.push({
    path: '/home/SCnet/experimentManager',
    query: { ...route.query, scenario: 'uranium', view: 'decision', orderId: orderId || undefined }
  })
}

const matrixSectionRef = ref(null)
const vulnerabilitySectionRef = ref(null)
const structureSectionRef = ref(null)
const logisticsSectionRef = ref(null)
const snapshotStore = useAnalysisSnapshotStore()
const uraniumStore = useUraniumDemoStore()
const { selectedExperiment } = storeToRefs(uraniumStore)

const activeSnapshot = computed(() => snapshotStore.getActiveSnapshot())

// 稳健实验回退保障
const effectiveExperiment = computed(() => {
  if (selectedExperiment.value) return selectedExperiment.value
  if (activeSnapshot.value?.experiment) return activeSnapshot.value.experiment
  const experiments = uraniumStore.experiments || {}
  const list = Object.values(experiments)
  if (list.length) return list[0]
  try {
    const seed = createUraniumDemoSeed()
    return seed?.experiments?.['uranium-security-first-20260708-131000'] || (seed?.experiments ? Object.values(seed.experiments)[0] : null)
  } catch (e) {
    return null
  }
})
const hasGameContext = computed(() => !!effectiveExperiment.value)

// 俄乌冲突高风险断点与通道排行榜（事前脆弱点直通事中保供/绕行/补库三大调度令）
const vulnerabilityRankingRows = computed(() => [
  {
    rank: 1,
    name: '黑海 / 圣彼得堡至欧洲海运走廊',
    type: '咽喉海运通道',
    typeTag: 'danger',
    score: 95,
    riskLevel: '极高危',
    riskTag: 'danger',
    triggerReason: '俄乌冲突爆发与西方禁俄铀法案，俄罗斯44%浓缩产能脱钩，欧洲港口拒运俄籍放射性货物',
    impactDesc: '原既有中欧海运转运彻底断航，直接阻断国内北方基地约 38% 原料回运通路',
    dispatchOrder: {
      id: 'DISPATCH-2024-001',
      type: '绕行令',
      name: '跨里海与好望角远洋海运分流重构令',
      action: '海运分流提至 55%，启动纳米比亚直航防城港/连云港航线，彻底避开黑海与欧洲中转',
      tagType: 'primary'
    },
    recoveryEffect: '航道阻断消除率 100%，回运周期稳定在 45 天'
  },
  {
    rank: 2,
    name: '中哈阿拉山口铁路口岸',
    type: '陆运铁路枢纽',
    typeTag: 'warning',
    score: 88,
    riskLevel: '高危',
    riskTag: 'danger',
    triggerReason: '欧洲海运受阻后引发陆路过境运力严重挤兑，中哈铁路宽窄轨换装负荷率突破 94%',
    impactDesc: '中亚陆运在途延误从 18 天飙升至 38 天，口岸通关周转率下降 40%，形成严重跨境拥堵',
    dispatchOrder: {
      id: 'DISPATCH-2024-001',
      type: '绕行令',
      name: '跨里海多式联运分流令',
      action: '启动阿克套港至巴库跨里海铁水联运分流 25%，平抑阿拉山口口岸挤兑压力',
      tagType: 'primary'
    },
    recoveryEffect: '口岸负荷率回落至 78%，通关准点率提至 92%'
  },
  {
    rank: 3,
    name: '北方包头核燃料元件制造基地',
    type: '核心制造枢纽',
    typeTag: 'danger',
    score: 84,
    riskLevel: '高危',
    riskTag: 'danger',
    triggerReason: '承担全国 60% 华龙一号核燃料组件加工，原料严重受制于进口且到厂交付延误',
    impactDesc: '在途延误叠加原料到厂延迟，基地安全库存跌至 14 周破 180 天红线，下游面临断料停堆风险',
    dispatchOrder: {
      id: 'DISPATCH-2024-002',
      type: '补库令',
      name: '国家保税战略储备库削峰借调平准令',
      action: '自防城港国家战略保税库应急借调 400 tU 平准，实行“借一还一”动态回填，补足制造缺口',
      tagType: 'warning'
    },
    recoveryEffect: '库存覆盖由 14 周迅速恢复至 21 周安全阈值'
  },
  {
    rank: 4,
    name: '海阳 / 大亚湾等沿海核电在运机组',
    type: '终端装料节点',
    typeTag: 'info',
    score: 79,
    riskLevel: '承压',
    riskTag: 'warning',
    triggerReason: '首炉机组集中并网装料叠加在运机组集中大修换料，刚性燃料组件装料窗口不可延误',
    impactDesc: '国际现货跳涨至 $106/lb，被动高价追单将引发供应链成本剧烈震荡及非计划超支',
    dispatchOrder: {
      id: 'DISPATCH-2024-003',
      type: '保供令',
      name: '战略重点机组刚性装料定向保供令',
      action: '对战略首炉与首充装料机组建立点对点直供保障通道，实行配额专供与特快排产，确保 0 停堆',
      tagType: 'success'
    },
    recoveryEffect: '核电机组非计划停堆率 0 次，燃料保供率 100%'
  }
])

// 非快照模式下的手动场景切换
const manualScenarioKey = ref('')
const manualModelKey = ref('')
const baseGameVm = computed(() => buildUraniumGameTheoryViewModel({
  experiment: effectiveExperiment.value,
  snapshot: activeSnapshot.value,
  manualScenarioKey: manualScenarioKey.value
}))
const gameVm = computed(() => buildUraniumGameTheoryViewModel({
  experiment: effectiveExperiment.value,
  snapshot: activeSnapshot.value,
  manualScenarioKey: manualScenarioKey.value,
  manualModelKey: manualModelKey.value
}))
const effectiveScenarioKey = computed(() => baseGameVm.value.scenarioKey)
const topTags = computed(() => gameVm.value.hero.tags.filter((item) => ['场景', '时点'].includes(item.label)))
const vulnerabilityMetrics = computed(() => buildUraniumVulnerability(effectiveExperiment.value?.summary || effectiveExperiment.value?.report || {}))
const vulnerabilityLevel = computed(() => uraniumVulnerabilityLevel(vulnerabilityMetrics.value))

const metricScore = (label, fallback = 50) => (
  vulnerabilityMetrics.value.find(item => item.label === label)?.score ?? fallback
)

const vulnerabilityHeadlineCards = computed(() => [
  { label: '依赖最集中节点', value: [...dependencyMatrixRows.value].sort((a, b) => b.values.reduce((sum, v) => sum + v.value, 0) - a.values.reduce((sum, v) => sum + v.value, 0))[0]?.node || '暂无数据', detail: '按四类依赖评分合计比较' },
  { label: '恢复难度', value: `${metricScore('恢复难度')} 分`, detail: '评分越高，恢复越困难' },
  { label: '结构替代能力', value: `${metricScore('鲁棒性')} 分`, detail: '评分越高，替代能力越强' },
  { label: '库存缓冲压力', value: `${metricScore('库存压力')} 分`, detail: '评分越高，库存压力越大' }
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
    { node: '阿拉山口铁路口岸', role: '口岸枢纽 · 陆运咽喉', scores: [88, 76, 94, Math.max(75, recovery + 8)] },
    { node: '北方包头燃料基地', role: '制造枢纽 · 60%华龙一号', scores: [82, Math.min(95, sensitivity + 10), 78, 86] },
    { node: '连云港海运接卸港', role: '港口中转 · 非洲矿石分流', scores: [58, 42, 62, Math.max(30, 100 - robustness)] },
    { node: '防城港战略储备库', role: '平准缓冲 · 国家战略储备', scores: [24, inventory, 32, Math.max(20, inventory - 12)] }
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
    { label: '单一节点依赖', value: `${Math.round((sensitivity + 45) / 2)} 分`, detail: '由策略切换敏感度估算' },
    { label: '结构替代能力', value: `${robustness} 分`, detail: '最坏响应下的结构保持度' },
    { label: '关键链路压力', value: vulnerabilityLevel.value.label, detail: '综合矩阵局部波动与恢复难度' }
  ]
})

const logisticsIndicators = computed(() => {
  const inventory = vulnerabilityMetrics.value.find(item => item.label === '库存压力')?.score || 0
  const recovery = vulnerabilityMetrics.value.find(item => item.label === '恢复难度')?.score || 0
  return [
    { label: '航线冗余度', value: `${Math.max(0, 100 - recovery)} 分`, detail: '恢复难度的反向表征' },
    { label: '库存缓冲压力', value: `${inventory} 分`, detail: '供需偏差对缓冲库存的占用' },
    { label: '通道稳定等级', value: recovery >= 70 ? '偏低' : recovery >= 45 ? '中等' : '稳定', detail: '结合恢复难度与库存压力判定' }
  ]
})

const vulnerabilityPriorityCards = computed(() => {
  const sensitivity = metricScore('敏感性')
  const recovery = metricScore('恢复难度')
  const inventory = metricScore('库存压力')
  const robustness = metricScore('鲁棒性')
  const rows = [
    {
      title: '锁定跨境主通道',
      score: Math.max(sensitivity, recovery),
      detail: '优先确认陆运与海运备份通道的可用性，降低通道依赖造成的链式中断。',
      tone: 'route'
    },
    {
      title: '提高替代供给承接',
      score: 100 - robustness,
      detail: '将备选供应国、港口与制造节点纳入同一调度池，提升结构替代能力。',
      tone: 'structure'
    },
    {
      title: '修正库存缓冲阈值',
      score: inventory,
      detail: '围绕缺口年份提前补库，避免库存覆盖跌破保供下限。',
      tone: 'inventory'
    }
  ]
  return rows
    .sort((a, b) => b.score - a.score)
    .map((item) => ({
      ...item,
      level: item.score >= 70 ? '优先' : item.score >= 45 ? '跟进' : '监测',
      tagType: item.score >= 70 ? 'danger' : item.score >= 45 ? 'warning' : 'success'
    }))
})
const algorithmFlowCards = computed(() => {
  const sensitivity = metricScore('敏感性')
  const recovery = metricScore('恢复难度')
  const inventory = metricScore('库存压力')
  const robustness = metricScore('鲁棒性')
  return [
    {
      label: '初始方案集合',
      value: '保供 / 绕行 / 补库',
      detail: '来自实验方案汇总，绑定节点、通道、库存三类对象。'
    },
    {
      label: '风险评估',
      value: vulnerabilityLevel.value.label,
      detail: `恢复难度 ${recovery} 分，敏感性 ${sensitivity} 分。`
    },
    {
      label: '处置方向',
      value: robustness < 55 ? '上调保供' : '维持权重',
      detail: `库存压力 ${inventory}，结构替代能力 ${robustness} 分。`
    },
    {
      label: '输出',
      value: vulnerabilityPriorityCards.value[0]?.title || '等待排序',
      detail: '进入对策树候选动作排序。'
    }
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
watch(effectiveScenarioKey, () => {
  manualModelKey.value = ''
})

// 快照切换 → 恢复推荐模型
watch(() => snapshotStore.activeSnapshotId, (next, prev) => {
  if (next === prev) return
  manualModelKey.value = ''
})

</script>

<style scoped>
/* 紧凑型核心断点状态横幅样式 */
.compact-findings-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 8px 8px;
  padding: 6px 14px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
}
.cfs-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.cfs-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  background: #fef3c7;
  color: #b45309;
}
.cfs-title {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
}
.cfs-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.cfs-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
  cursor: help;
}
.cfs-chip.danger {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}
.cfs-chip.danger .cfs-dot {
  color: #ef4444;
}
.cfs-chip.safe {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}
.cfs-chip.safe .cfs-dot {
  color: #10b981;
}

.cfs-info-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px dashed #cbd5e1;
  background: transparent;
  color: #64748b;
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.cfs-info-trigger:hover {
  border-color: #3b82f6;
  color: #2563eb;
  background: #eff6ff;
}

/* 浮窗详情样式 */
.vg-popover-content {
  padding: 2px;
  font-size: 12px;
}
.vg-popover-content h4 {
  margin: 0 0 6px 0;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.vg-popover-content p {
  margin: 0 0 8px 0;
  color: #475569;
  line-height: 1.45;
}
.vg-detail-item {
  padding: 5px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 11.5px;
  background: #f8fafc;
}
.vg-detail-item.danger {
  border-left: 3px solid #ef4444;
}
.vg-detail-item.safe {
  border-left: 3px solid #10b981;
}

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
.vulnerability-overview-main > strong.success { color: #15803d; }
.vulnerability-overview-main > strong.warning { color: #b45309; }
.vulnerability-overview-main > p { margin: 5px 0 0; color: #64748b; font-size: var(--mid-fs-label); line-height: var(--mid-lh-body); }
.vulnerability-overview-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.vulnerability-overview-grid article { padding: 9px 10px; border: 1px solid #e2e8f0; border-radius: 9px; background: #f8fafc; }
.vulnerability-overview-grid span,
.vulnerability-overview-grid small { display: block; color: #64748b; font-size: var(--mid-fs-micro); }
/* 俄乌冲突高风险断点与通道排行榜 */
.vulnerability-ranking-panel {
  padding: 14px 18px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}
.ranking-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}
.ranking-head-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ranking-table-wrapper {
  overflow-x: auto;
}
.ranking-modern-table {
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
}
.rank-num-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-weight: 800;
  font-size: 12px;
  color: #ffffff;
  background: #64748b;
}
.rank-num-badge.rank-1 {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);
}
.rank-num-badge.rank-2 {
  background: linear-gradient(135deg, #f97316, #ea580c);
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.3);
}
.rank-num-badge.rank-3 {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}
.rank-num-badge.rank-4 {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}
.choke-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.choke-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.choke-name {
  color: #0f172a;
  font-weight: 700;
  font-size: 13px;
}
.choke-type-tag {
  font-size: 11px;
}
.choke-impact {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}
.score-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.score-num-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}
.score-number {
  font-size: 16px;
  font-weight: 800;
  color: #dc2626;
}
.score-unit {
  font-size: 11px;
  color: #94a3b8;
}
.reason-cell {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #334155;
  line-height: 1.45;
}
.reason-icon {
  color: #f59e0b;
  font-size: 14px;
  margin-top: 2px;
  flex-shrink: 0;
}
.dispatch-mapping-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dispatch-chip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.dispatch-title {
  font-size: 12px;
  color: #1e293b;
  font-weight: 700;
}
.dispatch-action-text {
  margin: 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.4;
}
.effect-cell {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #059669;
  font-weight: 600;
  line-height: 1.4;
}
.effect-icon {
  font-size: 14px;
  margin-top: 2px;
  flex-shrink: 0;
}

.vulnerability-priority {
  padding: 12px 14px;
}

.priority-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.priority-grid article {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: start;
  gap: 9px;
  min-width: 0;
  padding: 10px;
  border: 1px solid #dbe4ef;
  border-radius: 9px;
  background: #fff;
}

.priority-grid article > span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-size: var(--mid-fs-label);
  font-weight: 800;
}

.priority-grid strong {
  display: block;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
}

.priority-grid p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: var(--mid-fs-label);
  line-height: 1.5;
}

.priority-grid article.route { border-color: #bfdbfe; background: #eff6ff; }
.priority-grid article.structure { border-color: #bbf7d0; background: #f0fdf4; }
.priority-grid article.inventory { border-color: #fde68a; background: #fffbeb; }

.algorithm-screening-panel {
  margin-top: 14px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid #dbe6f3;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(246, 250, 255, 0.88) 100%);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.05);
}

.screening-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #eef3f9;
}

.screening-status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mc-iter-tag {
  font-size: 11px;
  font-weight: 600;
  color: #1e40af;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  padding: 2px 8px;
  border-radius: 4px;
}

/* 4步执行流水线 */
.algorithm-pipeline-track {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.pipeline-step-card {
  position: relative;
  min-width: 0;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
}

.pipeline-step-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.08);
  border-color: #bfdbfe;
}

.pipeline-step-card.step-tier-1 {
  border-top: 3px solid #3b82f6;
}

.pipeline-step-card.step-tier-2 {
  border-top: 3px solid #10b981;
}

.pipeline-step-card.step-tier-3 {
  border-top: 3px solid #f59e0b;
}

.pipeline-step-card.step-tier-4 {
  border-top: 3px solid #6366f1;
}

.pipeline-step-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.step-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
  font-family: var(--mid-font-mono, monospace);
  letter-spacing: 0.05em;
}

.step-role-label {
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
}

.pipeline-step-body {
  flex: 1;
}

.step-value {
  display: block;
  color: #1e3a8a;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
}

.step-detail {
  margin: 6px 0 0;
  color: #475569;
  font-size: 11px;
  line-height: 1.55;
}

.pipeline-step-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #f1f5f9;
}

.pipeline-status-text {
  font-size: 10px;
  font-weight: 600;
  color: #059669;
}

.step-arrow-icon {
  font-size: 14px;
  color: #94a3b8;
}

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
  .priority-grid { grid-template-columns: 1fr; }
  .algorithm-flow-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
  .algorithm-flow-grid { grid-template-columns: 1fr; }
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
