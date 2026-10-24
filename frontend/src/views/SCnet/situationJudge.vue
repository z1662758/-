<template>
  <div class="sj-root" v-loading="loading">
    <!-- Error state -->
    <div v-if="error" class="sj-error">
      <p>⚠️ 数据加载失败：{{ error }}</p>
      <el-button @click="fetchData" type="primary" size="small">重试</el-button>
    </div>

    <template v-if="!error && chartData">
      <div class="sj-stage-heading sj-stage-heading--first"><b>1. 态势图</b></div>
      <!-- ====== 世界地图态势图（含趋势分析 + 解释 + 结论 + 验证 + 关键事件演化） ======
           三种研判视角共用这一个地图容器,只是注入的数据与口径不同。
           子标签行由 SituationMap 渲染在地图上方、供应来源占比栏之上,
           切换事件从这里原样上报给上一层(状态由 useExpertWorkflowStore 持有)。 -->
      <SituationMap
        :hide-side-panel="true"
        :scenario="scenario"
        :situation-map="chartData.situationMap"
        :map-evolution="chartData.mapEvolution"
        :conclusion="conclusion"
        :verification-summary="verificationSummary"
        :network-override="networkOverride"
        :focused-route-ids="focusedRouteIds"
        :focused-mode="judgmentScope === 'focused'"
        :judgment-mode="selectedRiskAssessment ? 'domain' : mode"
        :llm-judgment="llm"
        :dual-judgment="selectedRiskAssessment ? null : dual"
        :risk-method-label="selectedRiskAssessment ? selectedJudgmentMethod?.label || '' : ''"
        :assessment-kind="selectedRiskAssessment ? selectedJudgmentModel : ''"
        @update:judgmentMode="onJudgmentModeChange"
        @open-verify="verifyDrawer = true"
      />

      <AdvancedSupplyJudgment v-if="scenario === 'uranium'" :network="activeNetwork" />
      <!-- 原流程保留，铀案例改由专业研判组件展示。 -->
      <template v-else>
      <div class="sj-stage-heading"><b>2 · 基础研判过程</b><span>{{ mode === 'llm' ? '查看大模型如何使用情报形成定性判断。' : mode === 'dual' ? '查看大模型与固定态势模型链怎样形成双驱动研判；专项方法的网络影响另行计算。' : '固定态势模型链处理网络、情报和风险；专项方法另行计算供应影响。' }}</span></div>
      <details class="sj-base-flow">
        <summary>查看{{ flowTitle }}：{{ flowSteps.length }} 个环节</summary>
        <JudgmentProcessFlow
          :title="flowTitle"
          :source-label="meta.sourceLabel"
          :steps="flowSteps"
          :pending-count="flowPendingCount"
          :accent="meta.accent"
          :note="flowNote"
        />
      </details>

      <div v-if="mode !== 'llm' && scenario === 'uranium'" class="sj-stage-heading"><b>3 · 供应影响评估</b><span>选择一种方法，确认后展示本次输入、公式、计算过程和输出。</span></div>
      <section v-if="mode !== 'llm' && scenario === 'uranium'" class="sj-model-picker" aria-label="选择研判模型">
        <div class="sj-model-picker-head">
          <label for="judgment-model-select">选择供应链态势研判方法</label>
          <span>选择方法后点击运行；地图与结果使用同一份 REAL 快照</span>
        </div>
        <select id="judgment-model-select" v-model="pendingJudgmentModel" class="sj-model-select">
          <option v-for="option in judgmentModelOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>
        <button type="button" class="sj-model-confirm" :disabled="assessmentLoading" @click="confirmJudgmentModel">{{ assessmentLoading ? '正在计算…' : '确认运行' }}</button>
        <p>{{ selectedJudgmentModelDescription }}</p>
        <details class="sj-model-sources">
          <summary>查看三个方法的出处</summary>
          <div v-for="method in JUDGMENT_METHODS" :key="method.id">
            <span>{{ method.label }}：</span><a :href="method.source" target="_blank" rel="noopener noreferrer">{{ method.source }}</a>
          </div>
        </details>
        <p v-if="pendingJudgmentModel !== selectedJudgmentModel">已展示的结果尚未切换；点击“确认运行”后更新地图和路线分析。</p>
        <p v-if="snapshotSourceNote" class="sj-model-snapshot-note">{{ snapshotSourceNote }}</p>
        <div v-if="selectedRiskAssessment" class="sj-model-parameters">
          <div class="sj-calculation">
            <div class="sj-report-heading">
              <div><span class="sj-report-eyebrow">SUPPLY NETWORK · MODEL RUN</span><h3>{{ selectedJudgmentMethod.label }}</h3></div>
              <span class="sj-report-snapshot">快照 {{ assessmentData?.snapshot_id || '未标注' }}</span>
            </div>
            <div class="sj-report-facts">
              <div v-for="fact in selectedModelFacts" :key="fact.label"><span>{{ fact.label }}</span><strong>{{ fact.value }}</strong></div>
            </div>
            <p v-if="!assessmentData?.model_inputs" class="sj-report-stale">当前运行的后端尚未返回逐路线和逐连接参数，需重启后端服务后重新点击“确认运行”查看完整计算报告。</p>
            <div class="sj-model-spec">
              <div><b>模型定义</b><p>{{ selectedModelSpecification.definition }}</p></div>
              <div><b>数学表达</b><code v-for="formula in selectedModelSpecification.formulas" :key="formula">{{ formula }}</code></div>
              <p class="sj-model-spec-boundary">{{ selectedModelSpecification.boundary }}</p>
            </div>
            <section v-for="section in selectedCalculationSections" :key="section.key" class="sj-report-section">
              <h4><span>{{ section.index }}</span>{{ section.label }}<small>{{ section.subtitle }}</small></h4>
              <ol>
                <li v-for="step in section.steps" :key="step.title">
                  <b>{{ step.title.replace(/^输入|^过程|^输出|^解释/, '').replace(/^\s*[①②③④⑤⑥⑦]\s*·\s*/, '') }}</b>
                  <div class="sj-calculation-body">
                    <p>{{ step.detail }}</p>
                    <div v-if="step.formula" class="sj-calculation-formula"><span>计算式</span><code>{{ step.formula }}</code></div>
                    <p v-if="step.meaning" class="sj-calculation-meaning">{{ step.meaning }}</p>
                    <p v-if="step.actual" class="sj-calculation-actual"><strong>本次计算</strong>{{ step.actual }}</p>
                    <details v-if="step.inputTable" class="sj-input-details" :open="section.key === 'input' && step.inputTable.rows.length <= 10">
                      <summary>{{ step.inputTable.title }}（{{ step.inputTable.rows.length }} 条）</summary>
                      <div class="sj-input-scroll">
                        <table>
                          <thead><tr><th v-for="column in step.inputTable.columns" :key="column">{{ column }}</th></tr></thead>
                          <tbody>
                            <tr v-for="(row, index) in step.inputTable.rows" :key="index">
                              <td v-for="(cell, index) in row" :key="index">{{ cell }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </details>
                    <details v-if="step.fields" class="sj-field-details"><summary>查看接口字段</summary><code>{{ step.fields }}</code></details>
                  </div>
                </li>
              </ol>
            </section>
          </div>
          <p class="sj-model-parameter-note">容量以历史贸易量作代理，不代表铁路或口岸核定运力；进口代理量为 0 表示该年份、该商品口径下没有对应进口量，并非路线实际运力为零。本页的百分比是容量变化，不是中断概率。</p>
        </div>
      </section>

      <p v-if="mode !== 'llm' && assessmentError" class="sj-assessment-error">{{ assessmentError }}</p>

      <div class="sj-stage-heading"><b>4 · 研判结果</b><span>先读结论，再按需展开路线、节点和模型明细；专项方法的供应影响与原风险分分别标注。</span></div>
      <p v-if="!selectedRiskAssessment" class="sj-result-brief">{{ baseResultSummary }}</p>
      <!-- ====== 各视角自己的结果区 ====== -->
      <details v-if="!selectedRiskAssessment" class="sj-result-details">
        <summary>查看{{ mode === 'llm' ? '大模型' : mode === 'dual' ? '双驱动' : '态势模型' }}完整分析</summary>
        <LlmJudgmentPanel
          v-if="mode === 'llm'"
          :llm="llm"
          :events="osintEvents"
          :route-names="routeNames"
        />
        <DomainJudgmentPanel
          v-else-if="mode === 'domain'"
          :routes="domainRoutes"
          :nodes="domainNodes"
          :critical-nodes="criticalNodes"
          :edges="edges"
          :metrics="networkMetrics"
          :model-runs="modelRuns"
        />
        <DualJudgmentPanel
          v-else-if="mode === 'dual'"
          :dual="dual"
          :llm="llm"
          :routes="domainRoutes"
          :critical-nodes="criticalNodes"
          :risk-nodes="highRiskNodes"
        />
      </details>

      <section v-if="mode !== 'llm' && selectedRiskAssessment" class="sj-model-focus">
        <h3>{{ selectedJudgmentMethod.label }} · 路线研判</h3>
        <p class="sj-model-main-conclusion">{{ selectedAssessmentConclusion }}</p>
        <p class="sj-model-focus-summary">覆盖 {{ selectedRiskAssessment.routes.length }} 条路线；{{ selectedRiskAssessment.summary }}</p>
        <p class="sj-model-focus-note">“原路线风险”来自固定态势模型的展示分，供对照；它不是当前所选方法的输出，也不是中断概率。</p>
        <p v-if="mode === 'dual'" class="sj-model-focus-note">大模型原有研判仍是独立结果；本方法的网络指标不直接等同于大模型风险等级。</p>
        <details class="sj-model-explanation">
          <summary>查看方法说明与全部路线结果</summary>
          <p class="sj-model-focus-method">{{ selectedJudgmentMethod.description }}</p>
          <p class="sj-model-focus-plain">{{ selectedRiskAssessment.plainExplanation }}</p>
          <p class="sj-model-focus-algorithm">{{ selectedJudgmentMethod.basis }}</p>
          <div class="sj-model-focus-rows">
            <div v-for="route in selectedRiskAssessment.routes" :key="route.id">
              <span>{{ route.country }}</span>
              <span>原路线风险 {{ route.baselineScore == null ? '—' : route.baselineScore.toFixed(1) + '/100' }}</span>
              <b>{{ route.displayValue }} · {{ route.description }}</b>
            </div>
          </div>
        </details>
        <div v-if="mode === 'dual'" class="sj-dual-conclusion">
          <strong>态势结论</strong>
          <p v-for="(line, index) in selectedDualConclusion" :key="index">{{ line }}</p>
        </div>
      </section>

      <!-- 供应网络关键节点分析（仅铀场景）
      <SupplyNetworkPanel
        v-if="scenario === 'uranium'"
        :supply-network="supplyNetwork"
      />
      -->

      <!-- ====== 下半部分：详情分析 ====== -->
      <details v-if="mode === 'llm' || !selectedRiskAssessment" class="sj-detail-section" @toggle="onDetailToggle">
        <summary class="sj-detail-header">
          <span class="sj-detail-title">📊 详情分析</span>
          <span class="sj-detail-source" :style="{ color: meta.accent }">{{ meta.sourceLabel }}</span>
          <span class="sj-detail-hint">展开查看{{ mode === 'llm' ? '结果说明' : '周期、拐点、情景与价格趋势图' }}</span>
        </summary>

        <!-- 大模型视角没有对应的图表结果:保留容器与布局,明确说明暂无,不用别处的数据顶替 -->
        <div v-if="detailOpen && mode === 'llm'" class="sj-detail-empty">
          {{ detailEmptyText }}
        </div>

        <div v-else-if="detailOpen" class="sj-detail-grid">
          <el-card shadow="hover">
            <template #header><div class="sj-card-title"><span>🔄 周期分析 — 价格历史周期波动</span></div></template>
            <div ref="cycleChart" class="sj-chart"></div>
          </el-card>
          <el-card shadow="hover">
            <template #header><div class="sj-card-title"><span>📍 拐点识别</span></div></template>
            <div ref="turningChart" class="sj-chart"></div>
          </el-card>
          <el-card shadow="hover">
            <template #header><div class="sj-card-title"><span>🎯 供应链情景概率分布</span></div></template>
            <div ref="scenarioChart" class="sj-chart"></div>
          </el-card>
          <el-card shadow="hover">
            <template #header><div class="sj-card-title"><span>📈 趋势分析 — 全球价格 & 供需走势</span></div></template>
            <div ref="trendChart" class="sj-chart"></div>
          </el-card>
        </div>
      </details>
      </template>
    </template>

    <!-- 详细验证报告抽屉 -->
    <el-drawer v-model="verifyDrawer" size="85%" title="详细验证报告" destroy-on-close>
      <VerificationReport page="judgment" :scenario="scenario" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getJudgmentData } from '@/api/situation'
import { getLatestSnapshot, getSituationAssessments } from '@/api/uraniumSituationSnapshot'
import { buildUraniumSituationRoutes } from '@/assets/data/scnetReferenceData'
import {
  JUDGMENT_MODES,
  isLlmAvailable,
  modeMeta,
} from '@/constants/judgmentModes'
import { domainFlowSteps, dualFlowSteps, llmFlowSteps } from './components/judgment/judgmentFlows'
import JudgmentProcessFlow from './components/judgment/JudgmentProcessFlow.vue'
import LlmJudgmentPanel from './components/judgment/LlmJudgmentPanel.vue'
import DomainJudgmentPanel from './components/judgment/DomainJudgmentPanel.vue'
import DualJudgmentPanel from './components/judgment/DualJudgmentPanel.vue'
import VerificationReport from './PreScene/VerificationReport.vue'
import SituationMap from './PreScene/SituationMap.vue'
import AdvancedSupplyJudgment from './PreScene/AdvancedSupplyJudgment.vue'
import SupplyNetworkPanel from './PreScene/SupplyNetworkPanel.vue'

const props = defineProps({
  scenario: { type: String, default: 'uranium' },
  initialData: { type: Object, default: null },
  /**
   * 唯一的一套网络数据(来自态势研判 artifact 的 global):
   * { routes, nodes, events, metrics }
   * 传入后地图不再拉 live 快照 —— 案例模式必须展示案例包里那一份。
   */
  globalNetwork: { type: Object, default: null },
  /** focused:与本次需求相关的 ID 集合(只用于高亮/置灰,不另造数据) */
  focused: { type: Object, default: null },
  /** 'focused' | 'global' */
  judgmentScope: { type: String, default: 'focused' },
  /** 'llm' | 'domain' | 'dual' —— 三种研判视角,默认双驱动 */
  judgmentMode: { type: String, default: 'dual' },
  /**
   * 大模型研判结果(artifact.result.llm)。
   * 由后端真实调用大模型产出,只含理解层结论,不含风险分数;
   * 缺失时为 null,页面显示"暂无大模型研判结果",不用态势模型结果顶替。
   */
  llmJudgment: { type: Object, default: null },
  dualJudgment: { type: Object, default: null },
  /** 'live' | 'example' */
  dataSource: { type: String, default: 'live' },
})

/** 研判视角由上层 store 持有:这里只把地图里标签行的切换原样上报 */
const emit = defineEmits(['update:judgmentMode'])

function onJudgmentModeChange(mode) {
  emit('update:judgmentMode', mode)
}

/* ── 当前研判视角 ─────────────────────────── */
const mode = computed(() => (JUDGMENT_MODES.includes(props.judgmentMode) ? props.judgmentMode : 'dual'))
const meta = computed(() => modeMeta(mode.value))
const llm = computed(() => props.llmJudgment || null)
const dual = computed(() => props.dualJudgment || null)
const llmAvailable = computed(() => isLlmAvailable(llm.value))
const dualAvailable = computed(() => Boolean(dual.value?.status === 'completed'
  && dual.value?.prompt_version === 'dual_judgment_v1'
  && dual.value?.conclusion && dual.value?.tool_calls?.length && dual.value?.model_runs?.length))

/* ── 态势模型数据(任何视角都原样保留,不做削弱) ──
   有会话时用 artifact 注入的 global 网络;无会话(左侧菜单直接进入)时
   下面这段回退拉一次最新快照,保证三个视角在两种入口下都能拿到同一套网络。 */
const fallbackNetwork = ref(null)
const matchedSnapshot = ref(null)

async function loadFallbackNetwork() {
  const artifactSnapshotId = props.globalNetwork?.metrics?.snapshotId
  const hasArtifactTrace = (props.globalNetwork?.metrics?.executionTrace || []).length > 0
  if (props.globalNetwork && (hasArtifactTrace || props.dataSource !== 'live' || !artifactSnapshotId)) return
  try {
    const res = await getLatestSnapshot('REAL')
    if (res.success && res.data && Array.isArray(res.data.routes) && res.data.routes.length) {
      if (props.globalNetwork) {
        // 旧任务产物缺执行轨迹时,只允许从完全相同的快照 ID 恢复轨迹。
        // 绝不把后来重算的快照或案例之外的 live 结果冒充本次模型记录。
        if (res.data.snapshot_id === artifactSnapshotId) matchedSnapshot.value = res.data
      } else {
        fallbackNetwork.value = res.data
      }
    }
  } catch {
    // 取不到就保持为空:面板显示"暂无",不编造网络数据
    fallbackNetwork.value = null
  }
}

const activeNetwork = computed(() => {
  if (!props.globalNetwork) return fallbackNetwork.value || null
  const net = props.globalNetwork
  if (!matchedSnapshot.value) return net
  const snapshot = matchedSnapshot.value
  return {
    ...net,
    metrics: {
      ...(net.metrics || {}),
      executionTrace: snapshot.execution_trace || snapshot.meta?.model_runs || [],
      modelChain: snapshot.model_chain || {},
      modelVersion: snapshot.model_version || '',
      edges: snapshot.edges || [],
    },
  }
})

const domainRoutes = computed(() => activeNetwork.value?.routes || [])
const domainNodes = computed(() => activeNetwork.value?.nodes || [])
const criticalNodes = computed(() => activeNetwork.value?.metrics?.criticalNodes
  || activeNetwork.value?.critical_nodes || [])
const edges = computed(() => activeNetwork.value?.metrics?.edges || activeNetwork.value?.edges || [])
/** 情报事件:artifact 注入的网络走 events;直接拉到的原始快照优先取登记表窄视图 */
const osintEvents = computed(() => {
  const net = activeNetwork.value
  if (!net) return []
  if (net.metrics) return net.events || net.metrics.events || []
  return net.osint_registered_events || net.events || []
})
const routeNames = computed(() =>
  Object.fromEntries(domainRoutes.value.filter((r) => r && r.id).map((r) => [r.id, r.country || r.id])),
)
/** 本次任务的模型执行记录:优先 execution_trace,回退 meta.model_runs */
const modelRuns = computed(() => {
  const net = activeNetwork.value
  if (!net) return []
  return net.metrics?.executionTrace?.length
    ? net.metrics.executionTrace
    : net.execution_trace?.length
      ? net.execution_trace
      : net.meta?.model_runs || []
})
const JUDGMENT_METHODS = [
  { id: 'min_cut', label: '最大流－最小割瓶颈分析',
    description: '求解当前供应网络最小割，识别限制整体供应吞吐的关键运输边及相关路线。',
    basis: '专业方法：Max-Flow Min-Cut；用 NetworkX minimum_cut 求当前网络的割集。路线值是参与正容量割边的数量，不是风险概率；容量依据为历史贸易代理量，非铁路物理运力。参考：最大流韧性研究（PLOS ONE, 2017）。',
    source: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0177668' },
  { id: 'n1_capacity', label: 'N-1 网络韧性分析',
    description: '依次假设每条路线中断，重算网络最大流，比较网络剩余供应能力。',
    basis: '专业方法：N-1 Contingency Analysis + Max-Flow；逐路线失效后重新求网络最大流。输出基于历史贸易代理容量的相对损失，非中断发生概率。参考：Gas Transport Networks (2022)。',
    source: 'https://link.springer.com/article/10.1007/s00186-022-00785-x' },
  { id: 'event_driven', label: 'IEC 31010 情景分析＋网络流',
    description: '把当前生效情报转成路线可用性变化，重算最大流，评估事件对供应网络的影响。',
    basis: '专业方法：IEC 31010 情景分析；项目以 OSINT 事件状态映射路线可用性，再做确定性最大流计算。事件映射是本项目规则，不是 IEC 标准给出的参数；模型仍为原型，不产生概率。',
    source: 'https://tc56.iec.ch/risk-assessment-standards/' },
]
const pendingJudgmentModel = ref(JUDGMENT_METHODS[0].id)
const selectedJudgmentModel = ref('')
const assessmentData = ref(null)
const assessmentError = ref('')
const assessmentLoading = ref(false)
const selectedJudgmentMethod = computed(() => JUDGMENT_METHODS.find(x => x.id === selectedJudgmentModel.value) || null)
const judgmentModelOptions = computed(() => JUDGMENT_METHODS)
const selectedJudgmentModelDescription = computed(() => judgmentModelOptions.value.find(
  option => option.id === pendingJudgmentModel.value)?.description || '')
const snapshotSourceNote = computed(() => {
  if (!selectedRiskAssessment.value) return ''
  return assessmentData.value?.snapshot_id === networkMetrics.value.snapshotId
    ? '结果使用当前任务的网络快照。'
    : '结果使用最新 REAL 网络快照，与当前任务原快照不同；地图已切换到本次计算所用快照。'
})
const selectedRiskAssessment = computed(() => {
  const data = assessmentData.value
  if (!data || !selectedJudgmentMethod.value) return null
  const id = selectedJudgmentModel.value
  const baselineByRoute = new Map((data.network?.routes || []).map(route => [route.id, route]))
  const positiveCapacityRoutes = new Set((data.model_inputs?.routes || [])
    .filter(route => Number(route.observed_import_kg_284410) > 0).map(route => String(route.route_id)))
  let rows = []
  let unit = '%'
  if (id === 'min_cut') {
    unit = ' 条瓶颈通道'
    rows = (data.min_cut?.routes || []).map(r => ({
      id: r.route_id, score: Number(r.cut_edge_count),
      description: r.cut_edge_count ? '关联限制总供应能力的通道' : '未落在这次求出的瓶颈集合',
    }))
  }
  if (id === 'n1_capacity') {
    unit = '%'
    rows = (data.n1_capacity || []).filter(r => r.status === 'success' && r.capacity_loss_ratio != null).map(r => ({
      id: r.route_id, score: Number(r.capacity_loss_ratio), description: r.capacity_loss_ratio > 0
        ? '假设该路线完全中断后的总供应能力下降' : '当前代理容量下未产生额外总量损失',
    }))
  }
  if (id === 'event_driven') {
    unit = '%'
    rows = (data.event_driven?.route_impacts || []).filter(r => r.single_route_loss_pct != null).map(r => ({
      id: r.route_id, score: Number(r.single_route_loss_pct), description: r.single_route_loss_pct > 0
        ? '当前生效事件影响下的供应能力下降'
        : r.availability_factor < 1 ? '有事件作用，但总供应能力未进一步下降' : '当前没有作用于该路线的容量折减',
    }))
  }
  const maxImpact = Math.max(0, ...rows.map(r => r.score))
  rows = rows.map(r => ({ ...r, level: r.score <= 0 ? 'unknown' : r.score === maxImpact ? 'high' : 'medium' }))
  rows = rows.filter(r => r.id && Number.isFinite(r.score)).map(r => ({
    ...r, country: routeNames.value[r.id] || baselineByRoute.get(r.id)?.country || r.id,
    capacityUnavailable: Boolean(data.model_inputs) && !positiveCapacityRoutes.has(String(r.id)),
    description: Boolean(data.model_inputs) && !positiveCapacityRoutes.has(String(r.id))
      ? '本商品与年份口径下没有正值进口量，不能据此判为低风险' : r.description,
    baselineScore: baselineByRoute.get(r.id)?.display_risk_score != null && Number.isFinite(Number(baselineByRoute.get(r.id).display_risk_score))
      ? Number(baselineByRoute.get(r.id).display_risk_score) : null,
    displayValue: Boolean(data.model_inputs) && !positiveCapacityRoutes.has(String(r.id))
      ? '无正值容量代理'
      : r.score > 0 ? `${r.score.toFixed(id === 'min_cut' ? 0 : 1)}${unit}`
        : id === 'min_cut' ? '非当前瓶颈' : '无新增容量损失',
  })).sort((a, b) => b.score - a.score)
  const affectedCount = rows.filter(r => r.score > 0).length
  const sharedCut = (data.min_cut?.cut_edges || []).find(edge => (edge.affected_route_ids || []).length > 1)
  const sharedCutText = sharedCut
    ? `其中 ${sharedCut.affected_route_ids.map(routeId => routeNames.value[routeId] || baselineByRoute.get(routeId)?.country || routeId).join('、')} 关联同一段通道。`
    : ''
  const summary = id === 'min_cut'
    ? `本次找到 ${data.min_cut?.cut_edges?.length || 0} 段限制整体供应能力的通道，关联 ${affectedCount} 条路线。${sharedCutText}其余路线不在这一次求出的瓶颈集合，不代表没有风险。`
    : `${affectedCount} 条路线在该情景下形成总量损失；其余 ${rows.length - affectedCount} 条未形成额外损失，不代表低风险。`
  const plainExplanation = {
    min_cut: '把供应网络想成多条进货路：即使其它路很宽，最窄的几段仍会限制总体运量。这里找的是其中一组瓶颈；没有列入这一组，不等于路线安全。',
    n1_capacity: '逐条假设一条路线完全停运，再看其它路线能否补上。百分比是整个网络可达供应量的减少幅度，不是该路线的风险概率。',
    event_driven: '只考虑当前已生效情报对路线通行能力的折减，再计算网络可达供应量。没有额外损失可能是没有相关事件，也可能是其它路线暂时补上。',
  }[id]
  return { routes: rows, unit, summary, plainExplanation }
})
const baseResultSummary = computed(() => {
  if (mode.value === 'llm') return llmAvailable.value
    ? llm.value.conclusion : '本次尚无可核验的大模型研判结论；展开可查看情报输入和缺失原因。'
  if (mode.value === 'dual') return dualAvailable.value
    ? dual.value.conclusion : '本次尚无完整的双驱动结论；展开可对照独立大模型与态势模型结果。'
  const routes = domainRoutes.value
  const high = routes.filter(route => (route.riskLevel || route.risk_level) === 'high')
  return routes.length
    ? `固定态势模型已评估 ${routes.length} 条供应路线，其中 ${high.length} 条为高风险${high.length ? `（${high.map(route => route.country || route.id).join('、')}）` : ''}。路线分数汇总节点、运输边及情报影响；详细排名和模型执行记录可展开查看。`
    : '当前快照没有可展示的态势模型路线结果。'
})
const selectedAssessmentConclusion = computed(() => {
  const data = assessmentData.value
  const assessment = selectedRiskAssessment.value
  if (!data || !assessment) return ''
  const top = assessment.routes.find(route => route.score > 0)
  if (selectedJudgmentModel.value === 'min_cut') {
    const count = data.min_cut?.cut_edges?.length || 0
    return count
      ? `本次识别 ${count} 段限制网络总体供给的通道；${top?.country || '相关供应路线'}关联其中的瓶颈。它表示结构约束，不表示该路线一定中断。`
      : '本次未识别到正容量瓶颈通道；请展开完整输入与输出核对网络数据。'
  }
  if (selectedJudgmentModel.value === 'n1_capacity') return top
    ? `逐条停运重算后，${top.country}路线中断造成的全网代理供应量降幅最大，为 ${top.displayValue}；其余路线的补位能力见明细。`
    : '逐条停运情景下，当前代理网络未显示新增总量缺口；这不等于实际交付没有风险。'
  const loss = data.event_driven?.current_availability_loss_pct
  return loss == null
    ? '当前事件情景尚无可计算的全网供应影响结果。'
    : `生效情报共同作用后，全网代理可达供应量相对无事件基线减少 ${Number(loss).toFixed(1)}%；${top ? `${top.country}单独受影响时的全网降幅为 ${top.displayValue}。` : '单路线影响见明细。'}`
})
const selectedModelFacts = computed(() => {
  const data = assessmentData.value || {}
  const inputs = data.model_inputs || {}
  const supplied = (inputs.routes || []).filter(route => Number(route.observed_import_kg_284410) > 0).length
  const common = [
    { label: '商品与年份', value: `HS${inputs.commodity_layer || '284410'} · ${inputs.trade_data_year || '未返回'} 年` },
    { label: '网络规模', value: `${inputs.routes?.length ?? '—'} 条路线 / ${inputs.edges?.length ?? '—'} 段连接` },
    { label: '有进口量记录', value: inputs.routes ? `${supplied} / ${inputs.routes.length} 条路线` : '接口未返回' },
  ]
  const specific = selectedJudgmentModel.value === 'min_cut'
    ? { label: '本次割边', value: `${data.min_cut?.cut_edges?.length ?? '—'} 段` }
    : selectedJudgmentModel.value === 'n1_capacity'
      ? { label: '独立停运情景', value: `${data.n1_capacity?.length ?? '—'} 组` }
      : { label: '有效负向事件', value: `${inputs.events?.length ?? '—'} 条` }
  return [...common, specific]
})
const selectedModelSpecification = computed(() => {
  const specs = {
    min_cut: {
      definition: '有向容量网络 G=(V,E)。来源节点接超级源，国内接收节点接超级汇；每段连接的容量来自按来源国历史进口量构造的代理值。求使源端与接收端分离且容量总和最小的一组连接。',
      formulas: ['max F = Σ(s,v)∈E f(s,v)', '0 ≤ f(u,v) ≤ c(u,v)；Σ进入(v) f = Σ离开(v) f', 'min C(S,T) = Σu∈S,v∈T c(u,v) = max F'],
      boundary: '最小割是当前容量口径下的一组结构瓶颈；它不包含通行故障概率、铁路核定运力或合同交付量。',
    },
    n1_capacity: {
      definition: 'N‑1 确定性压力测试。依次令一条供应路线完全失效，其余路线保持基线状态；每个情景重新求解全网最大流，比较失效前后的可达供应上限。',
      formulas: ['F₀ = MaxFlow(G, c)', 'cₑ(−r) = Σⱼ∈R(e) qₑⱼ · 1[j ≠ r]；F₋ᵣ = MaxFlow(G, c(−r))', '损失量 Lᵣ = F₀ − F₋ᵣ；降幅 Dᵣ = 100 Lᵣ / F₀'],
      boundary: '路线中断是人为设定的压力情景；降幅描述供应容量后果，不是该路线中断的概率。共享连接按各路线容量贡献分别折减。',
    },
    event_driven: {
      definition: '以已核验且仍生效的负向情报构造确定性供应冲击情景。先按事件状态、类型和严重度算路线可用系数，再据此折减连接的代理容量并重算最大流。',
      formulas: ['pₑ = 状态残余ₑ × 类型权重ₑ × 严重度系数ₑ', 'aᵣ = clip(1 − maxₑ∈路线r pₑ, 0, 1)', 'c′ₗ = Σᵣ∈R(l) qₗᵣ aᵣ；D = 100 (F₀ − MaxFlow(G,c′)) / F₀'],
      boundary: '事件系数是项目规则映射的情景参数，不是实测通行率；模型没有预测未来事件或校准中断概率。',
    },
  }
  return specs[selectedJudgmentModel.value] || { definition: '', formulas: [], boundary: '' }
})
const selectedCalculationSteps = computed(() => {
  const data = assessmentData.value
  if (!data || !selectedRiskAssessment.value) return []
  const routes = data.network?.routes || []
  const routeName = id => routes.find(route => String(route.id) === String(id))?.country || id
  const quantity = value => value == null || !Number.isFinite(Number(value))
    ? '未提供' : Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
  const percent = value => value == null || !Number.isFinite(Number(value)) ? '未提供' : `${quantity(value)}%`
  const unit = data.event_driven?.unit || data.min_cut?.capacity_unit || '单位未返回'
  const tradeYear = data.model_inputs?.trade_data_year || data.network?.metrics?.dataProvenance?.trade_data_year || '未返回'
  const capacityBasis = data.model_inputs?.capacity_basis || data.event_driven?.capacity_basis
  const basis = capacityBasis === 'OBSERVED_TRADE_PROXY'
    ? '历史进口量代理（OBSERVED_TRADE_PROXY）' : capacityBasis || '未标注'
  const snapshot = data.snapshot_id || '未标注'
  const inputs = data.model_inputs || {}
  const routeTable = inputs.routes ? {
    title: '查看逐路线输入',
    columns: ['供应来源', '运输方式', `HS${inputs.commodity_layer || '284410'} 进口代理量（${inputs.capacity_unit || 'kg'}）`, '经过节点', '事件可用系数'],
    rows: inputs.routes.map(row => [routeName(row.route_id), row.transport_mode || '未提供',
      quantity(row.observed_import_kg_284410), (row.nodes || []).join(' → ') || '未提供', quantity(row.availability_factor)]),
  } : null
  const edgeTable = inputs.edges ? {
    title: '查看计算图逐连接输入',
    columns: ['起点', '终点', `合计代理容量（${inputs.capacity_unit || 'kg'}）`, '路线容量贡献', '共享路线'],
    rows: inputs.edges.map(row => [row.from_node, row.to_node, quantity(row.capacity),
      Object.entries(row.capacity_by_route || {}).map(([id, value]) => `${routeName(id)} ${quantity(value)}`).join('；') || '未返回',
      (row.aggregated_routes || []).map(routeName).join('、') || '无']),
  } : null
  const eventTable = inputs.events ? {
    title: '查看逐事件输入与参数',
    columns: ['事件', '状态', '类型', '严重度', '状态残余', '类型权重', '严重度系数', '惩罚值', '涉及路线'],
    rows: inputs.events.map(row => [row.title || row.event_id, row.event_state, row.event_type,
      row.severity_class, quantity(row.state_residual), quantity(row.event_type_weight),
      quantity(row.severity_scale), quantity(row.availability_penalty),
      (row.affected_route_ids || []).map(routeName).join('、') || '未提供']),
  } : null
  if (selectedJudgmentModel.value === 'min_cut') {
    const cut = data.min_cut || {}
    const edges = cut.cut_edges || []
    const affected = [...new Set(edges.flatMap(edge => edge.affected_route_ids || []))]
    const counts = (cut.routes || []).map(row => `${routeName(row.route_id)} ${quantity(row.cut_edge_count)} 段`).join('；')
    const edgeTotal = edges.reduce((sum, edge) => sum + (Number(edge.capacity) || 0), 0)
    return [
      { title: '输入 ① · 供应网络', detail: '读取供应来源、运输方式和经过节点。计算图把各来源接到统一供应源，把国内接收端接到统一终点；地图展示节点数不等于计算图节点数。', fields: 'model_inputs.routes[].route_id / transport_mode / nodes；supplier_nodes；receiving_nodes', actual: `快照 ${snapshot}；${inputs.routes?.length ?? routes.length} 条供应路线；供应端 ${inputs.supplier_nodes?.length ?? '未返回'} 个，接收端 ${inputs.receiving_nodes?.length ?? '未返回'} 个`, inputTable: routeTable },
      { title: '输入 ② · 连接容量', detail: `当前实现采用 ${tradeYear} HS284410 国家层面的进口数量，给同一来源路线的各段连接赋代理容量；多条路线共用一段时，图构建器将这些路线的容量求和。`, fields: 'model_inputs.routes[].observed_import_kg_284410；model_inputs.edges[].capacity / route_id / aggregated_routes', formula: 'cₑ = qᵣ（单路线段）；cₑ = Σᵣ qᵣ（共用段）', meaning: 'qᵣ 是来源国历史进口量代理，cₑ 是计算图中的连接容量；共用段按聚合容量计算。', actual: `容量口径：${basis}；单位 ${unit}；${inputs.edges?.length ?? '未返回'} 段计算连接`, inputTable: edgeTable },
      { title: '过程 ③ · 最大流约束', detail: '从统一供应源向国内接收端分配流量。任何连接上的流量不能超过其容量；中间节点的流入与流出守恒，然后求可达总量的最大值。', fields: 'graph.capacity；__super_source__；__super_sink__', formula: '0 ≤ fₑ ≤ cₑ；中间节点 Σ流入 f = Σ流出 f；Fₘₐₓ = max Σ源端流出 f', meaning: 'fₑ 是分配到连接 e 的代理流量。该方法只给出网络上限，不等于实际铁路吞吐。' },
      { title: '过程 ④ · 最小割', detail: 'NetworkX minimum_cut 在供应源所在集合 S 与接收端所在集合 T 之间找容量和最小的跨界连接组；最大流最小割定理给出两者容量相等。', fields: 'min_cut.cut_capacity；min_cut.cut_edges[].capacity', formula: 'C(S,T) = Σ₍ᵤ∈S,ᵥ∈T₎ c(u,v)；Cₘᵢₙ = min C(S,T) = Fₘₐₓ', actual: `本次最小割容量 ${quantity(cut.cut_capacity)} ${unit}；返回的 ${edges.length} 段割边容量合计 ${quantity(edgeTotal)} ${unit}` },
      { title: '输出 ⑤ · 瓶颈与路线', detail: '跨越最小割的连接构成本次识别的瓶颈集合，再按连接关联的路线统计各来源的瓶颈段数。', fields: 'min_cut.cut_edges[].affected_route_ids；min_cut.routes[].cut_edge_count', formula: 'bᵣ = Σₑ∈最小割 1{路线 r 关联连接 e}', meaning: 'bᵣ 是路线关联的割边数量，不是风险分，也不是中断概率。', actual: `涉及 ${affected.map(routeName).join('、') || '未标注路线'}；各路线：${counts || '未返回'}` },
      { title: '解释 ⑥ · 结果边界', detail: '最小割只给出当前容量代理下的一组限制通道。没有进入这组割边的路线仍可能因事件、交付或其他结构问题受阻；供应网络若变化，应重新计算。', fields: 'min_cut.algorithm = minimum_cut', actual: '当前接口未提供逐边实测物理运力，也未提供未来中断概率。' },
    ]
  }
  if (selectedJudgmentModel.value === 'n1_capacity') {
    const scenarios = data.n1_capacity || []
    const focus = new Set(focusedRouteIds.value.map(String))
    const selected = scenarios.find(row => focus.has(String(row.route_id)))
      || [...scenarios].sort((a, b) => Number(b.capacity_loss_ratio || 0) - Number(a.capacity_loss_ratio || 0))[0]
    const sample = selected ? routeName(selected.route_id) : '未选出示例路线'
    const whySample = selected && focus.has(String(selected.route_id)) ? '本案关注路线' : '本次降幅最大的路线'
    return [
      { title: '输入 ① · 基线网络', detail: `使用与其他方法相同的供应网络和 ${tradeYear} HS284410 历史进口量代理容量，不把路线风险分或事件概率当作容量。`, fields: 'model_inputs.routes[].observed_import_kg_284410 / nodes / transport_mode；capacity_basis', actual: `快照 ${snapshot}；${inputs.routes?.length ?? routes.length} 条路线；容量口径 ${basis}，单位 ${unit}`, inputTable: routeTable },
      { title: '输入 ② · N‑1 情景', detail: '每次只指定一条路线 r 完全失效，逐条独立运行；其它路线仍留在网络。这样比较的是移除不同来源后的网络后果。', fields: 'n1_capacity[].route_id；model_inputs.edges[].capacity_by_route / aggregated_routes', formula: 'aᵣ = 0；对其它路线 aⱼ = 1', meaning: 'aᵣ 是情景可用系数；共享连接按各路线的容量贡献分别折减，其他路线的贡献保留。', actual: `${scenarios.length} 个情景；停运路线：${scenarios.map(row => routeName(row.route_id)).join('、') || '未返回'}；以下按${whySample} ${sample} 展示代入值`, inputTable: edgeTable },
      { title: '过程 ③ · 正常网络最大流', detail: '先在未停运的图上，按容量上限和中间节点流量守恒约束，求来源国到国内接收端的最大可达代理供应量。', fields: 'n1_capacity[].baseline_supply_capacity', formula: 'F₀ = MaxFlow(G, c)', meaning: 'G 是原网络，c 是各连接的代理容量。', actual: selected ? `F₀ = ${quantity(selected.baseline_supply_capacity)} ${unit}` : '接口未返回可用情景' },
      { title: '过程 ④ · 停运后重算', detail: '指定路线的逐段容量贡献置零，其它路线贡献保留；在扰动后的容量图上重新求最大流。', fields: 'n1_capacity[].post_disruption_capacity；model_inputs.edges[].capacity_by_route', formula: 'cₑ(−r) = Σⱼ∈R(e) qₑⱼ × 1[j ≠ r]；F₋ᵣ = MaxFlow(G, c(−r))', meaning: 'qₑⱼ 是路线 j 对连接 e 的代理容量贡献；F₋ᵣ 是路线 r 停运后的全网剩余代理供应量。', actual: selected ? `F₋ᵣ = ${quantity(selected.post_disruption_capacity)} ${unit}` : '' },
      { title: '过程 ⑤ · 绝对缺口', detail: '用正常状态与停运状态的最大流相减，得到整个网络的代理供应量减少值。', fields: 'n1_capacity[].capacity_loss', formula: 'Lᵣ = F₀ − F₋ᵣ', actual: selected ? `${quantity(selected.baseline_supply_capacity)} − ${quantity(selected.post_disruption_capacity)} = ${quantity(selected.capacity_loss)} ${unit}` : '' },
      { title: '输出 ⑥ · 损失率与替代来源', detail: '将绝对缺口除以正常最大流，得到全网降幅；同时列出扰动后模型中仍有正容量的其他路线。', fields: 'n1_capacity[].capacity_loss_ratio；n1_capacity[].available_alternatives', formula: 'Dᵣ = Lᵣ / F₀ × 100%（仅 F₀ > 0 时）', meaning: '可用替代来源不一定有足够余量完全补上缺口。', actual: selected ? `${sample}：${quantity(selected.capacity_loss)} / ${quantity(selected.baseline_supply_capacity)} × 100% = ${percent(selected.capacity_loss_ratio)}；其他来源 ${(selected.available_alternatives || []).map(routeName).join('、') || '未列出'}` : '' },
      { title: '解释 ⑦ · 比较范围', detail: '下面的逐路线结果来自相互独立的停运情景，不能把各行损失率相加，也不能把损失率解释为路线中断概率。', fields: 'n1_capacity[]', actual: '物理铁路能力、可用合同量和真实补货时间未进入当前代理网络。' },
    ]
  }
  const event = data.event_driven || {}
  const impacts = event.route_impacts || []
  const focus = new Set(focusedRouteIds.value.map(String))
  const selected = impacts.find(row => focus.has(String(row.route_id)))
    || [...impacts].sort((a, b) => Number(b.single_route_loss_pct || 0) - Number(a.single_route_loss_pct || 0))[0]
  const effectiveEvents = (data.network?.events || []).filter(row => row.verification_status === 'VERIFIED'
    && String(row.direction).toUpperCase() === 'NEGATIVE'
    && ['ACTIVE', 'ONGOING', 'RECOVERED'].includes(String(row.event_state).toUpperCase())
    && (row.affected_route_ids || []).length)
  const relatedEvents = selected ? effectiveEvents.filter(row => (row.affected_route_ids || []).includes(selected.route_id)) : []
  const sample = selected ? routeName(selected.route_id) : '未选出示例路线'
  const availability = selected?.availability_factor == null ? null : Number(selected.availability_factor)
  return [
    { title: '输入 ① · 网络与情报', detail: `使用 ${tradeYear} HS284410 历史进口量构造容量代理，并读取已核验、方向为负向且仍有影响的事件。`, fields: 'model_inputs.routes[].observed_import_kg_284410 / nodes / transport_mode；model_inputs.events[]', actual: `快照 ${snapshot}；${inputs.routes?.length ?? routes.length} 条路线；${inputs.events?.length ?? effectiveEvents.length} 条当前有效负向情报；容量口径 ${basis}`, inputTable: routeTable },
    { title: '输入 ② · 事件状态与参数', detail: '每条事件取状态残余、事件类型权重和严重度系数。ACTIVE/ONGOING 的状态残余为 1；RECOVERED 为 0.15；RESOLVED 为 0；严重度 HIGH/MEDIUM/LOW 系数依次为 1/0.7/0.4。', fields: 'model_inputs.events[].event_state / event_type / severity_class / state_residual / event_type_weight / severity_scale / availability_penalty', formula: 'pₑ = 状态残余ₑ × 事件类型权重ₑ × 严重度系数ₑ', meaning: '事件类型权重按后端规则表读取；逐事件系数和惩罚值均由本次计算接口返回。', actual: selected ? `${sample}关联事件 ${relatedEvents.length} 条：${relatedEvents.slice(0, 3).map(row => row.title || row.event_id).join('、') || '未列出'}${relatedEvents.length > 3 ? '等' : ''}` : '', inputTable: eventTable },
    { title: '过程 ③ · 路线可用系数', detail: '对同一路线的负向事件取最大惩罚，不累加事件惩罚；没有有效负向事件的路线按系数 1 计算。系数是规则推导的情景假设，不是实测可用率。', fields: 'event_driven.route_impacts[].availability_factor', formula: 'pᵣ = maxₑ∈路线r pₑ；aᵣ = clip(1 − pᵣ, 0, 1)', meaning: 'pᵣ 表示该路线的最大事件惩罚，aᵣ 是情景可用系数。', actual: selected ? `${sample}：aᵣ = ${quantity(availability)}；由返回系数反推 pᵣ = ${availability == null ? '未提供' : quantity(1 - availability)}` : '' },
    { title: '过程 ④ · 容量折减', detail: '对每段连接分别折减关联路线的容量贡献；共用段保留其他路线的剩余贡献，然后重算全网最大流。', fields: 'model_inputs.edges[].capacity_by_route；event_driven.current_availability_flow', formula: 'c′ₑ = Σᵣ∈R(e) qₑᵣ × aᵣ；F事件后 = MaxFlow(G, c′)', meaning: '该步是确定性情景重算，没有抽样未来事件概率。', actual: `无事件基线 F₀ = ${quantity(event.baseline_flow)} ${unit}；全部事件共同作用后 F事件后 = ${quantity(event.current_availability_flow)} ${unit}` },
    { title: '过程 ⑤ · 全网变化', detail: '比较无事件基线与全部有效事件共同作用后的网络可达供应量，先求差额，再换算成相对降幅。', fields: 'event_driven.current_availability_loss；current_availability_loss_pct', formula: 'L = F₀ − F事件后；D = L / F₀ × 100%（仅 F₀ > 0 时）', actual: `${quantity(event.baseline_flow)} − ${quantity(event.current_availability_flow)} = ${quantity(event.current_availability_loss)} ${unit}；全网降幅 ${percent(event.current_availability_loss_pct)}` },
    { title: '输出 ⑥ · 单路线对照', detail: '另让一条路线按其事件系数折减，其他路线保持原容量，重算该路线单独受影响时的全网损失。这是对照情景，不可与共同作用的结果相加。', fields: 'event_driven.route_impacts[].single_route_loss_pct', formula: 'Dᵣ = [F₀ − MaxFlow(G, 仅路线 r 使用 aᵣ)] / F₀ × 100%', actual: selected ? `${sample}单独折减：${percent(selected.single_route_loss_pct)}；可用系数 ${quantity(availability)}` : '接口未返回可展示的单路线影响' },
    { title: '解释 ⑦ · 适用边界', detail: '这一结果是“按当前情报规则折减容量后会怎样”的情景计算，不表示事件未来发生的概率；事件状态更新、路线结构或贸易量变更后应重新运行。', fields: 'event_driven.scenario_type = EVENT_DRIVEN', actual: '未纳入已核验铁路物理运力、实际合同可用量及未来新增事件。' },
  ]
})
const selectedCalculationSections = computed(() => {
  const steps = selectedCalculationSteps.value
  return [
    { key: 'input', index: '01', label: '输入数据', subtitle: '逐项核对本次使用的路线、容量和事件参数', steps: steps.filter(step => step.title.startsWith('输入')) },
    { key: 'process', index: '02', label: '求解过程', subtitle: '目标函数、约束条件及情景变换', steps: steps.filter(step => step.title.startsWith('过程')) },
    { key: 'output', index: '03', label: '结果与边界', subtitle: '本次输出及其可解释范围', steps: steps.filter(step => step.title.startsWith('输出') || step.title.startsWith('解释')) },
  ].filter(section => section.steps.length)
})
const networkMetrics = computed(() => ({
  ...(activeNetwork.value?.metrics || {}),
  snapshotId: activeNetwork.value?.metrics?.snapshotId || activeNetwork.value?.snapshot_id || '',
  generatedAt: activeNetwork.value?.metrics?.generatedAt || activeNetwork.value?.generated_at || '',
  modelVersion: activeNetwork.value?.metrics?.modelVersion || activeNetwork.value?.model_version || '',
  modelChain: activeNetwork.value?.metrics?.modelChain || activeNetwork.value?.model_chain || {},
  dataProvenance: activeNetwork.value?.metrics?.dataProvenance || activeNetwork.value?.data_provenance || {},
  osintInfo: activeNetwork.value?.metrics?.osintInfo || activeNetwork.value?.osint_info || {},
  routeCount: domainRoutes.value.length,
  nodeCount: domainNodes.value.length,
}))
const highRiskNodes = computed(() =>
  [...domainNodes.value]
    .sort(
      (a, b) =>
        Number(b.combined_risk_score ?? b.risk_score ?? 0) - Number(a.combined_risk_score ?? a.risk_score ?? 0),
    )
    .slice(0, 5),
)

/* ── 研判过程流程图 ───────────────────────── */
const flowTitle = computed(() => {
  if (mode.value === 'llm') return '大模型研判过程'
  if (mode.value === 'domain') return '态势模型研判过程'
  return '双驱动研判过程'
})

const flowSteps = computed(() => {
  if (mode.value === 'llm') {
    return llmFlowSteps({ metrics: networkMetrics.value, llm: llm.value, llmAvailable: llmAvailable.value })
  }
  if (mode.value === 'domain') {
    return domainFlowSteps({
      metrics: networkMetrics.value,
      routes: domainRoutes.value,
      nodes: domainNodes.value,
      edges: edges.value,
    })
  }
  return dualFlowSteps({
    metrics: networkMetrics.value,
    dual: dual.value,
    dualAvailable: dual.value?.status === 'completed',
  })
})

const flowPendingCount = computed(() => flowSteps.value.filter((s) => s.pending === true
  || (s.pending === undefined && s.llmRequired && !llmAvailable.value)).length)

const flowNote = computed(() => {
  if (mode.value === 'dual') return dual.value?.status === 'completed'
    ? '大模型实际发起态势模型工具调用，并基于返回的执行记录形成独立双驱动结论。'
    : '本次没有完整的双驱动执行产物；不会把独立大模型结论和态势模型分数拼接成第三份结论。'
  if (llmAvailable.value) return ''
  if (mode.value === 'domain') return ''
  return '标灰的环节依赖大模型产出，本次没有大模型研判结果，因此未执行 —— 不会用态势模型的结果填充这两步。'
})

/** 详情分析在大模型视角下的说明 */
const detailEmptyText = computed(() => {
  if (llm.value && llm.value.reason) {
    return `暂无该类型研判结果 —— ${llm.value.reason}`
  }
  return '暂无该类型研判结果 —— 本次没有大模型研判产物，下方图表为空。重新运行「态势研判」阶段会重新生成。'
})


const networkOverride = computed(() => {
  const net = selectedRiskAssessment.value ? assessmentData.value?.network : activeNetwork.value
  if (!net || !Array.isArray(net.routes) || !net.routes.length) return null
  const selected = selectedRiskAssessment.value
  const scores = new Map((selected?.routes || []).map(r => [r.id, r]))
  return {
    routes: selected ? net.routes.map(route => {
      const result = scores.get(route.id)
      return result ? { ...route, riskLevel: result.level, risk_level: result.level,
        baseline_risk_score: result.baselineScore,
        assessment_score: result.score, assessment_display: result.displayValue,
        risk_score: result.score, display_risk_score: result.score } : route
    }) : net.routes,
    nodes: net.nodes || [],
    events: net.events || [],
    metrics: net.metrics || {},
    // 来源随网络一起透传给地图,由 provenance 决定是否标记为当前任务真实结果
    provenance: selectedRiskAssessment.value
      ? (assessmentData.value.snapshot_id === networkMetrics.value.snapshotId
        ? (activeNetwork.value?.provenance || null)
        : { sourceType: 'latest_real_snapshot', isOfficialResult: false, osintMode: 'REAL' })
      : (net.provenance || null)
  }
})

async function confirmJudgmentModel() {
  if (assessmentLoading.value) return
  assessmentLoading.value = true
  assessmentError.value = ''
  try {
    const response = await getSituationAssessments()
    if (!response.success || response.data?.status !== 'success') throw new Error(response.message || '计算失败')
    if (!Array.isArray(response.data?.network?.routes) || !response.data.network.routes.length) throw new Error('模型没有返回可展示的网络')
    assessmentData.value = response.data
    selectedJudgmentModel.value = pendingJudgmentModel.value
  } catch (e) {
    assessmentError.value = `研判模型计算失败：${e.message || '服务不可用'}`
  } finally {
    assessmentLoading.value = false
  }
}

const focusedRouteIds = computed(() => props.focused?.relatedRouteIds || [])
const selectedDualConclusion = computed(() => {
  const assessment = selectedRiskAssessment.value
  if (!assessment) return []
  const caseRouteIds = focusedRouteIds.value.length ? focusedRouteIds.value : (dual.value?.key_route_ids || [])
  const relatedIds = new Set(caseRouteIds.map(String))
  const related = assessment.routes.filter(route => relatedIds.has(String(route.id)))
  const mainRoute = [...related].sort((a, b) => b.score - a.score)[0]
  const network = assessmentData.value?.network || {}
  const baselineRoutes = network.routes || []
  const baselineRoute = baselineRoutes.find(route => String(route.id) === String(mainRoute?.id))
  const levelText = { high: '高风险', medium: '中风险', low: '低风险' }
  const otherHighRoutes = baselineRoutes
    .filter(route => route.id !== mainRoute?.id && route.risk_level === 'high')
    .sort((a, b) => Number(b.display_risk_score || 0) - Number(a.display_risk_score || 0))
    .slice(0, 2)
  const keyPoints = (baselineRoute?.key_risk_points || []).filter(point => point?.name).slice(0, 2)
  const criticalNodes = (network.metrics?.criticalNodes || [])
    .filter(node => node?.name && (node.affected_routes || []).some(id => String(id) === String(mainRoute?.id)))
    .slice(0, 2)
  let overview
  if (mainRoute && baselineRoute) {
    const score = baselineRoute.display_risk_score == null ? NaN : Number(baselineRoute.display_risk_score)
    const scoreText = Number.isFinite(score) ? ` ${score.toFixed(1)}/100` : ''
    const otherText = otherHighRoutes.length
      ? `；全网另有${otherHighRoutes.map(route => `${route.country} ${Number(route.display_risk_score).toFixed(1)}/100`).join('、')}处于高风险` : ''
    const pointText = keyPoints.length
      ? `。该路线重点风险环节为${keyPoints.map(point => `${point.name}（${levelText[point.risk_level] || '待核验'}）`).join('、')}` : ''
    const nodeText = criticalNodes.length
      ? `；其中${criticalNodes.map(node => node.name).join('、')}也是网络关键节点` : ''
    overview = `当前快照中，${mainRoute.country}路线原风险评估为${levelText[baselineRoute.risk_level] || '待核验'}${scoreText}${otherText}${pointText}${nodeText}。`
  } else {
    const topRoutes = [...baselineRoutes]
      .filter(route => route.display_risk_score != null && Number.isFinite(Number(route.display_risk_score)))
      .sort((a, b) => Number(b.display_risk_score) - Number(a.display_risk_score))
      .slice(0, 2)
    overview = topRoutes.length
      ? `当前快照中，风险较高的路线为${topRoutes.map(route => `${route.country}（${Number(route.display_risk_score).toFixed(1)}/100）`).join('、')}；本案例尚未关联可单独对照的路线。`
      : '当前快照尚无可用于判断本案例具体路线风险的数据。'
  }
  let modelFinding
  let implication
  if (mainRoute) {
    if (selectedJudgmentModel.value === 'min_cut') {
      modelFinding = mainRoute.score > 0
        ? `${mainRoute.country}路线关联本轮识别的${mainRoute.displayValue}，整体供应受这些通道约束。`
        : `${mainRoute.country}路线不在本轮瓶颈集合内，但全网仍受其他窄通道约束。`
      implication = mainRoute.score > 0
        ? '该路线的通行与交付变化可能牵动全网供给，应重点核验瓶颈通道和替代安排。'
        : '不能据此认定该路线安全，仍需核验运输与交付条件。'
    } else if (selectedJudgmentModel.value === 'n1_capacity') {
      modelFinding = mainRoute.score > 0
        ? `若${mainRoute.country}路线停运，代理网络可达供应量将减少 ${mainRoute.displayValue}。`
        : `若${mainRoute.country}路线停运，当前代理网络可由其他路线补足总量。`
      implication = mainRoute.score > 0
        ? '替代来源难以完全弥补缺口，计划交付面临明显供应压力。'
        : '总量暂有替代余地，但不能保证实际铁路交付不受阻。'
    } else {
      modelFinding = mainRoute.score > 0
        ? `当前生效情报作用于${mainRoute.country}路线后，代理网络可达供应量减少 ${mainRoute.displayValue}。`
        : `当前生效情报尚未使${mainRoute.country}路线造成网络总量损失。`
      implication = mainRoute.score > 0
        ? '供应态势已受事件冲击，应优先核验运输节点和交付缓冲。'
        : '需继续关注事件变化，当前结果不能排除后续交付风险。'
    }
  } else {
    modelFinding = `所选方法已计算全网 ${assessment.routes.length} 条路线，但本案例未关联可对照的路线。`
    implication = '目前无法据此判断本案例具体交付路线的供应影响。'
  }
  const dualLevel = dualAvailable.value ? levelText[dual.value.risk_level] : ''
  const dualText = dualLevel ? `本案例原双驱动研判提示${dualLevel}；` : ''
  return [overview, `${dualText}${modelFinding}${implication}`]
})

const trendChart = ref(null)
const cycleChart = ref(null)
const turningChart = ref(null)
const scenarioChart = ref(null)
const detailOpen = ref(false)
const chartData = ref(null)
const loading = ref(true)
const error = ref(null)
const verifyDrawer = ref(false)
let charts = []

// ── 从 API 数据派生 ─────────────────────
const riskTable = computed(() => chartData.value?.riskTable || [])
const events = computed(() => chartData.value?.events || [])
const conclusion = computed(() => chartData.value?.conclusion || { tag: '', points: [] })
const verificationSummary = computed(() => chartData.value?.verificationSummary || { score: 0, level: '' })
const supplyNetwork = computed(() => chartData.value?.supplyNetwork || null)

// ── API 数据获取 ─────────────────────────
async function fetchData() {
  loading.value = true
  error.value = null
  try {
    if (props.initialData) {
      chartData.value = props.initialData
      await nextTick()
      initAllCharts()
      return
    }
    const res = await getJudgmentData(props.scenario)
    if (res.success) {
      chartData.value = res.data
      // 事前态势图线路强制使用前端参考通道数据（仅铀场景）
      if (props.scenario === 'uranium') {
        const sm = chartData.value?.situationMap || (chartData.value.situationMap = {})
        sm.routes = buildUraniumSituationRoutes()
        sm.updateTime = sm.updateTime || new Date().toISOString()
      }
      await nextTick()
      initAllCharts()
    } else {
      error.value = res.message || '未知错误'
    }
  } catch (e) {
    error.value = e.message || '网络请求失败'
  } finally {
    loading.value = false
  }
}

// ── 趋势分析图 ────────────────────────────
function initTrendChart() {
  if (!trendChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(trendChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(trendChart.value); charts.push(c)
  const d = chartData.value.trendChart

  const series = d.series.map((s, idx) => {
    const base = { name: s.name, type: s.type, yAxisIndex: s.yAxisIndex, smooth: true, data: s.data }
    if (idx === 0) {
      return {
        ...base,
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(37,99,235,0.3)' }, { offset: 1, color: 'rgba(37,99,235,0.02)' }
        ]) },
        lineStyle: { color: '#2563eb', width: 2.5 },
        itemStyle: { color: '#2563eb' }
      }
    }
    if (idx === 1) {
      return { ...base, lineStyle: { color: '#8b5cf6', width: 2, type: 'dashed' }, itemStyle: { color: '#8b5cf6' }, symbol: 'diamond', symbolSize: 6 }
    }
    if (idx === 2) {
      return { ...base, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] }, barWidth: '30%', barGap: '30%' }
    }
    if (idx === 3) {
      return { ...base, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] }, barWidth: '30%' }
    }
    return base
  })

  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: d.legend || d.series.map(s => s.name), top: 8, itemWidth: 12 },
    grid: { left: 65, right: 65, top: 55, bottom: 50 },
    xAxis: { type: 'category', data: d.xAxis, axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: (d.yAxis || []).map(ax => ({
      type: 'value', name: ax.name, nameLocation: 'middle', nameGap: 52, min: ax.min
    })),
    series
  })
}

// ── 周期分析图 ────────────────────────────
function initCycleChart() {
  if (!cycleChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(cycleChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(cycleChart.value); charts.push(c)
  const d = chartData.value.cycleChart
  const auto = props.scenario === 'auto'

  c.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 62, right: 48, top: 50, bottom: 50 },
    legend: { data: d.series.map(s => s.name), top: 8 },
    xAxis: { type: 'category', data: d.xAxis, axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: { type: 'value', name: d.yAxisName || (auto ? '年订单量(百笔)' : 'U3O8 现货价($/lb)'), nameLocation: 'middle', nameGap: 50 },
    series: [
      { name: d.series[0].name, type: 'line', data: d.series[0].data, smooth: true,
        lineStyle: { color: '#6366f1', width: 2 },
        areaStyle: { opacity: 0.08, color: '#6366f1' },
        markLine: d.markLines ? {
          silent: true, symbol: 'none',
          lineStyle: { color: '#f59e0b', type: 'dotted' },
          data: d.markLines.map(ml => ({ xAxis: ml.xAxis, label: { formatter: ml.label } }))
        } : undefined
      },
      { name: d.series[1].name, type: 'line', data: d.series[1].data, smooth: true,
        lineStyle: { color: '#ef4444', width: 2, type: 'dashed' }, symbol: 'none' }
    ]
  })
}

// ── 拐点识别图 ────────────────────────────
function initTurningChart() {
  if (!turningChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(turningChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(turningChart.value); charts.push(c)
  const d = chartData.value.turningChart
  const auto = props.scenario === 'auto'

  // markPoint colors by symbol type
  const mpColors = { pin: '#ef4444', roundRect: '#10b981', triangle: '#2563eb' }

  c.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 62, right: 62, top: 50, bottom: 45 },
    legend: { data: d.series.map(s => s.name), top: 8 },
    xAxis: { type: 'category', data: d.xAxis, axisLabel: { rotate: 45, fontSize: 9 } },
    yAxis: [
      { type: 'value', name: auto ? '万辆' : '价格($/lb)', nameLocation: 'middle', nameGap: 50, min: auto ? 200 : 10 },
      { type: 'value', name: '变化率(%)', nameLocation: 'middle', nameGap: 50 }
    ],
    series: [
      { name: d.series[0].name, type: 'line', yAxisIndex: 0, smooth: true, data: d.series[0].data,
        markPoint: d.markPoints ? { data: d.markPoints.map(mp => ({
          name: mp.label, coord: mp.coord, value: mp.label,
          symbol: mp.symbol || 'pin',
          symbolSize: mp.symbol === 'roundRect' ? 20 : mp.symbol === 'triangle' ? 24 : 40,
          itemStyle: { color: mpColors[mp.symbol] || '#ef4444' }
        })) } : undefined,
        lineStyle: { color: '#2563eb', width: 2 },
        itemStyle: { color: '#2563eb' } },
      { name: d.series[1].name, type: 'bar', yAxisIndex: 1, data: d.series[1].data,
        itemStyle: { color: '#94a3b8', borderRadius: [4, 4, 0, 0] }, barWidth: '50%' }
    ]
  })
}

// ── 情景概率分布图 ────────────────────────
function initScenarioChart() {
  if (!scenarioChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(scenarioChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(scenarioChart.value); charts.push(c)
  const d = chartData.value.scenarioDistribution
  const auto = props.scenario === 'auto'

  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['概率(%)', auto ? '产量影响(万辆)' : '价格影响($/lb)'], bottom: 0 },
    grid: { left: 72, right: 72, top: 20, bottom: 55 },
    xAxis: { type: 'category', data: d.categories },
    yAxis: [
      { type: 'value', name: '概率(%)', nameLocation: 'middle', nameGap: 46, max: 100 },
      { type: 'value', name: d.impactUnit, nameLocation: 'middle', nameGap: 54 }
    ],
    series: [
      { name: '概率(%)', type: 'bar', yAxisIndex: 0, data: d.probabilities,
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#6366f1' }, { offset: 1, color: '#a5b4fc' }
        ]), borderRadius: [6, 6, 0, 0] }, barWidth: '45%' },
      { name: d.impactUnit, type: 'line', yAxisIndex: 1, data: d.impacts,
        lineStyle: { color: '#ef4444', width: 2.5 },
        itemStyle: { color: '#ef4444' }, symbol: 'diamond', symbolSize: 10 }
    ]
  })
}

// ── 初始化所有图表 ─────────────────────────
function initAllCharts() {
  // 先销毁所有 ref 上的旧 ECharts 实例
  [trendChart, cycleChart, turningChart, scenarioChart].forEach(elRef => {
    if (elRef.value) {
      const inst = echarts.getInstanceByDom(elRef.value)
      if (inst) inst.dispose()
    }
  })
  charts.forEach(c => { try { c.dispose() } catch {} })
  charts = []
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initTrendChart()
      initCycleChart()
      initTurningChart()
      initScenarioChart()
      setTimeout(handleResize, 200)
    })
  })
}

function handleResize() {
  charts.forEach(c => { try { c.resize() } catch {} })
}

async function onDetailToggle(event) {
  detailOpen.value = event.target.open
  if (!detailOpen.value) {
    charts.forEach(c => { try { c.dispose() } catch {} })
    charts = []
    return
  }
  await nextTick()
  if (mode.value !== 'llm') initAllCharts()
}

// ResizeObserver：侧边栏折叠/展开时不触发 window.resize，需要用 ResizeObserver
let resizeObserver = null

// 场景切换时重新获取数据
watch(() => props.scenario, () => {
  fetchData()
  selectedJudgmentModel.value = ''
  pendingJudgmentModel.value = JUDGMENT_METHODS[0].id
  assessmentData.value = null
})
watch(() => props.globalNetwork, () => {
  selectedJudgmentModel.value = ''
  pendingJudgmentModel.value = JUDGMENT_METHODS[0].id
  assessmentData.value = null
})
watch(() => props.initialData, () => fetchData(), { deep: true })
watch(selectedJudgmentModel, async () => {
  detailOpen.value = false
  await nextTick()
  initAllCharts()
})

// 研判视角切换:大模型视角不渲染图表容器,切回领域/双驱动时容器刚重新挂载,需要重新初始化
watch(mode, async () => {
  selectedJudgmentModel.value = ''
  pendingJudgmentModel.value = JUDGMENT_METHODS[0].id
  await nextTick()
  initAllCharts()
})

onMounted(() => {
  fetchData()
  loadFallbackNetwork()
  window.addEventListener('resize', handleResize)
  const root = document.querySelector('.sj-root')
  if (root) {
    resizeObserver = new ResizeObserver(() => {
      charts.forEach(c => { try { c.resize() } catch {} })
    })
    resizeObserver.observe(root)
  }
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', handleResize)
  charts.forEach(c => c.dispose())
})
</script>

<style scoped>
.sj-root { padding: 0.25rem 1.5rem 1.5rem; height: calc(100vh - 60px); overflow-y: auto; }

.sj-error { text-align: center; padding: 3rem; color: #ef4444; }
.sj-error p { margin-bottom: 1rem; }
.sj-stage-heading { display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px 12px; margin: 16px 0 8px; }
.sj-stage-heading--first { margin-top: 0; }
.sj-stage-heading b { color: #172554; font-size: 0.92rem; }
.sj-stage-heading span { color: #64748b; font-size: 0.73rem; line-height: 1.5; }
.sj-base-flow, .sj-result-details { margin-bottom: 16px; border: 1px solid #dbe4f0; border-radius: 9px; background: #fff; }
.sj-base-flow > summary, .sj-result-details > summary { cursor: pointer; padding: 11px 14px; color: #1e3a8a; font-size: 0.81rem; font-weight: 600; }
.sj-base-flow > summary:focus-visible, .sj-result-details > summary:focus-visible { outline: 2px solid #93c5fd; }
.sj-base-flow .jp-flow { margin: 0 10px 10px; }
.sj-result-details > :not(summary) { margin: 0 10px 10px; }
.sj-result-brief { margin: 0 0 9px; padding: 12px 15px; border-left: 3px solid #2563eb; border-radius: 7px; background: #eff6ff; color: #1e293b; font-size: 0.84rem; line-height: 1.65; }

.sj-model-picker, .sj-model-focus { margin-bottom: 1rem; padding: 13px 16px; border: 1px solid #dbe4f0; border-radius: 12px; background: #f8fbff; }
.sj-model-picker-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
.sj-model-picker-head label { font-size: 0.88rem; font-weight: 700; color: #1e3a8a; }
.sj-model-picker-head span, .sj-model-picker p { font-size: 0.72rem; line-height: 1.55; color: #64748b; }
.sj-model-picker p { margin: 7px 0 0; }
.sj-model-select { width: min(100%, 480px); padding: 8px 10px; border: 1px solid #bfdbfe; border-radius: 8px; background: #fff; color: #1e293b; font-size: 0.8rem; }
.sj-model-select:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.sj-model-confirm { margin-left: 8px; padding: 8px 16px; border: 1px solid #2563eb; border-radius: 8px; background: #2563eb; color: #fff; cursor: pointer; font-size: 0.8rem; }
.sj-model-confirm:disabled { opacity: 0.6; cursor: wait; }
.sj-model-confirm:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.sj-model-sources { margin-top: 8px; font-size: 0.68rem; line-height: 1.6; color: #64748b; }
.sj-model-sources summary { cursor: pointer; width: fit-content; }
.sj-model-sources summary:focus-visible { outline: 2px solid #93c5fd; }
.sj-model-sources div { overflow-wrap: anywhere; }
.sj-model-sources a { color: #2563eb; text-decoration: underline; }
.sj-model-parameters { display: grid; gap: 7px; margin-top: 11px; }
.sj-calculation { border: 1px solid #bfdbfe; border-radius: 9px; background: #fff; padding: 12px 14px; }
.sj-report-heading { display: flex; align-items: end; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #dbe4f0; }
.sj-report-eyebrow { display: block; margin-bottom: 4px; color: #64748b; font: 700 0.65rem/1.3 ui-monospace, Consolas, monospace; letter-spacing: 0.09em; }
.sj-calculation .sj-report-heading h3 { color: #0f2747; font-size: 1.05rem; line-height: 1.4; }
.sj-report-snapshot { color: #64748b; font: 0.69rem/1.5 ui-monospace, Consolas, monospace; overflow-wrap: anywhere; text-align: right; }
.sj-report-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; margin: 14px 0; border: 1px solid #dbe4f0; background: #dbe4f0; }
.sj-report-facts > div { min-width: 0; padding: 10px 12px; background: #f8fbff; }
.sj-report-facts span { display: block; color: #64748b; font-size: 0.69rem; }
.sj-report-facts strong { display: block; margin-top: 5px; color: #102a43; font-size: 0.86rem; overflow-wrap: anywhere; }
.sj-model-picker .sj-report-stale { padding: 8px 10px; border-left: 3px solid #d97706; background: #fffbeb; color: #92400e; }
.sj-model-spec { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; padding: 13px 15px; border: 1px solid #cbd5e1; background: #f8fafc; }
.sj-model-spec b { display: block; margin-bottom: 6px; color: #1e3a5f; font-size: 0.77rem; }
.sj-model-picker .sj-model-spec p { margin: 0; color: #334155; font-size: 0.75rem; line-height: 1.7; }
.sj-model-spec code { display: block; padding: 3px 0; color: #0f766e; font: 0.74rem/1.6 ui-monospace, Consolas, monospace; overflow-wrap: anywhere; }
.sj-model-picker .sj-model-spec .sj-model-spec-boundary { grid-column: 1 / -1; padding-top: 9px; border-top: 1px solid #dbe4f0; color: #64748b; }
.sj-report-section { margin-top: 21px; }
.sj-report-section h4 { display: flex; align-items: baseline; gap: 8px; margin: 0 0 7px; color: #0f2747; font-size: 0.9rem; }
.sj-report-section h4 span { color: #0f766e; font: 700 0.75rem ui-monospace, Consolas, monospace; }
.sj-report-section h4 small { color: #64748b; font-size: 0.7rem; font-weight: 400; }
.sj-report-section ol { border-top: 1px solid #cbd5e1; }
.sj-calculation .sj-report-section li { grid-template-columns: minmax(130px, 0.22fr) minmax(0, 1fr); padding: 14px 0; font-size: 0.81rem; }
.sj-report-section li > b { color: #1e3a5f; }
.sj-calculation h3 { margin: 0; color: #1e3a8a; font-size: 0.84rem; }
.sj-model-picker .sj-calculation > p { margin: 4px 0 11px; font-size: 0.72rem; }
.sj-calculation ol { margin: 0; padding: 0; list-style: none; }
.sj-calculation li { display: grid; grid-template-columns: minmax(165px, 0.27fr) minmax(0, 1fr); gap: 12px; padding: 13px 0; border-top: 1px solid #e2e8f0; align-items: start; font-size: 0.75rem; line-height: 1.6; }
.sj-calculation li > b { color: #1e3a8a; font-size: 0.78rem; }
.sj-calculation-body { min-width: 0; }
.sj-model-picker .sj-calculation-body p { margin: 0 0 7px; font-size: 0.8rem; line-height: 1.65; color: #334155; }
.sj-model-picker .sj-calculation-body .sj-calculation-fields { color: #64748b; font-size: 0.69rem; }
.sj-calculation code { font: 0.77rem/1.6 ui-monospace, Consolas, monospace; overflow-wrap: anywhere; }
.sj-calculation-formula { display: flex; align-items: baseline; gap: 10px; margin: 7px 0; padding: 7px 10px; border-left: 3px solid #14b8a6; background: #f0fdfa; }
.sj-calculation-formula span { flex: none; color: #0f766e; font-size: 0.7rem; font-weight: 700; }
.sj-calculation-formula code { color: #115e59; }
.sj-model-picker .sj-calculation-body .sj-calculation-meaning { color: #475569; }
.sj-model-picker .sj-calculation-body .sj-calculation-actual { margin: 7px 0 0; color: #172554; font-weight: 500; }
.sj-calculation-actual strong { color: #1d4ed8; }
.sj-model-picker .sj-calculation-body .sj-calculation-actual { padding: 7px 10px; border-left: 3px solid #2563eb; background: #eff6ff; }
.sj-calculation-actual strong { margin-right: 10px; }
.sj-field-details { margin-top: 7px; color: #64748b; font-size: 0.68rem; }
.sj-field-details summary { cursor: pointer; width: fit-content; }
.sj-field-details code { display: block; margin-top: 4px; }
.sj-input-details { margin-top: 9px; border: 1px solid #dbeafe; border-radius: 6px; background: #f8fbff; }
.sj-input-details summary { cursor: pointer; padding: 7px 9px; color: #1d4ed8; font-weight: 600; }
.sj-input-scroll { overflow-x: auto; max-height: 330px; overflow-y: auto; }
.sj-input-scroll table { width: 100%; min-width: 650px; border-collapse: collapse; font-size: 0.76rem; }
.sj-input-scroll th, .sj-input-scroll td { padding: 6px 8px; border-top: 1px solid #e2e8f0; text-align: left; vertical-align: top; white-space: nowrap; }
.sj-input-scroll th { color: #475569; background: #eff6ff; position: sticky; top: 0; }
@media (max-width: 780px) {
  .sj-report-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sj-model-spec { grid-template-columns: 1fr; }
  .sj-report-section h4 { flex-wrap: wrap; }
  .sj-report-heading { align-items: start; flex-direction: column; }
  .sj-calculation .sj-report-section li { grid-template-columns: 1fr; }
}
.sj-model-picker .sj-model-parameter-note { margin-top: 1px; font-size: 0.7rem; }
.sj-model-source { display: inline-block; margin: 2px 0 8px; font-size: 0.75rem; color: #2563eb; }
.sj-assessment-error { color: #b91c1c; font-size: 0.8rem; }
.sj-model-focus { background: #fff; }
.sj-model-focus h3 { margin: 0 0 9px; font-size: 0.98rem; color: #1e293b; }
.sj-model-focus p { margin: 6px 0; font-size: 0.82rem; line-height: 1.7; color: #334155; }
.sj-model-focus .sj-model-main-conclusion { padding: 10px 12px; border-radius: 7px; background: #eff6ff; color: #1e3a8a; font-weight: 600; }
.sj-model-explanation { margin-top: 10px; border-top: 1px solid #e2e8f0; }
.sj-model-explanation > summary { cursor: pointer; padding: 8px 0; color: #1d4ed8; font-size: 0.76rem; font-weight: 600; }
.sj-model-focus .sj-model-focus-method, .sj-model-focus .sj-model-focus-algorithm, .sj-model-focus .sj-model-focus-note { font-size: 0.75rem; color: #64748b; }
.sj-model-focus-meta { margin: 9px 0; font-size: 0.73rem; color: #475569; }
.sj-model-focus-io { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.sj-model-focus-io span { padding: 9px 11px; border-radius: 8px; background: #f1f5f9; color: #334155; font-size: 0.75rem; overflow-wrap: anywhere; }
.sj-model-focus-io b { display: block; margin-bottom: 4px; color: #1e3a8a; }
.sj-model-focus .sj-model-focus-error { color: #b91c1c; }
.sj-model-focus-rows { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 6px; margin-top: 12px; }
.sj-model-focus-rows div { display: grid; grid-template-columns: 1fr auto; gap: 5px 12px; padding: 9px 11px; border: 1px solid #e2e8f0; border-radius: 7px; font-size: 0.75rem; }
.sj-model-focus-rows div span:nth-child(2) { color: #64748b; }
.sj-model-focus-rows b { grid-column: 1 / -1; color: #1d4ed8; overflow-wrap: anywhere; }
.sj-dual-conclusion { margin-top: 14px; padding: 12px 14px; border: 1px solid #bae6fd; border-radius: 9px; background: #f0f9ff; }
.sj-dual-conclusion strong { font-size: 0.84rem; color: #075985; }
.sj-model-focus .sj-dual-conclusion p { margin: 6px 0 0; color: #0f172a; line-height: 1.7; }

/* ====== 趋势分析卡片 ====== */
.sj-trend-card { margin-bottom: 1.5rem; }

.sj-chart-trend { height: 260px; }

/* ====== 深色结论卡片 ====== */
.sj-conclusion-dark {
  flex: 1;
  background: linear-gradient(135deg, #1e293b 0%, #1e3a5f 40%, #0f172a 100%);
  border: 1px solid #334155;
  position: relative; overflow: hidden;
}
.sj-conclusion-dark::before {
  content: ''; position: absolute; top: -20px; right: -20px;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
  pointer-events: none;
}
.sj-card-title-light { color: #e2e8f0 !important; }
.sj-conclusion-body-light { font-size: 0.92rem; line-height: 1.9; color: #cbd5e1; position: relative; z-index: 1; }
.sj-conclusion-body-light ul { padding-left: 1rem; margin: 0.5rem 0 0; }
.sj-conclusion-body-light li { margin-bottom: 0.55rem; }
.sj-conclusion-body-light b { color: #e2e8f0; }
.sj-tag-row { margin-bottom: 0.45rem; }

/* 可信评分条 */
.sj-verify-badge {
  display: flex; align-items: center; gap: 8px;
  margin-top: 0.7rem; padding: 8px 12px;
  background: rgba(99,102,241,0.16);
  border: 1px solid rgba(99,102,241,0.35);
  border-radius: 8px; cursor: pointer;
  transition: all 0.2s ease;
}
.sj-verify-badge:hover { background: rgba(99,102,241,0.28); }
.sj-verify-icon { font-size: 0.9rem; }
.sj-verify-label { font-size: 0.78rem; color: #c7d2fe; }
.sj-verify-score { font-size: 1rem; font-weight: 800; color: #e2e8f0; }
.sj-verify-level { font-size: 0.78rem; color: #c7d2fe; }
.sj-verify-arrow { margin-left: auto; color: #818cf8; font-size: 0.9rem; }

/* ====== 下半部分：详情分析 ====== */
.sj-detail-section {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
  padding: 0 1.2rem; margin-bottom: 1rem;
}
.sj-detail-header { cursor: pointer; padding: 1rem 0; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.sj-detail-header:focus-visible { outline: 2px solid #93c5fd; }
.sj-detail-title { font-size: 1.05rem; font-weight: 700; color: #1e293b; }
.sj-detail-hint { margin-left: auto; color: #64748b; font-size: 0.73rem; }
/* 详情分析也要标清当前是哪种研判视角的数据来源 */
.sj-detail-source {
  font-size: 11.5px; font-weight: 600;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 2px 10px;
}
/* 该视角没有对应结果时:保留容器与布局,只说明"暂无",不用别处的数据填充 */
.sj-detail-empty {
  margin-bottom: 1rem; padding: 2.2rem 1.2rem; text-align: center;
  background: #fff; border: 1px dashed #cbd5e1; border-radius: 12px;
  font-size: 12.5px; color: #64748b; line-height: 1.8;
}

.sj-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding-bottom: 1rem; }

/* ====== 通用 ====== */
.sj-chart { width: 100%; height: 300px; min-height: 260px; }
.sj-chart-trend { height: 260px; }
:deep(.el-card__body) { overflow: visible; }
.sj-card-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.95rem; }

.sj-conclusion-body { font-size: 0.83rem; line-height: 1.7; color: #334155; }
.sj-conclusion-body ul { padding-left: 1.1rem; margin: 0.5rem 0 0; }
.sj-conclusion-body li { margin-bottom: 0.4rem; }
.sj-tag-row { margin-bottom: 0.6rem; }
.sj-final { margin-top: 0.8rem; }

/* ── 响应式：侧边栏折叠/展开 → 布局自适应 ── */
@media (max-width: 1350px) {
  .sj-detail-grid { grid-template-columns: 1fr; }
}

@media (max-width: 900px) {
  .sj-calculation li { grid-template-columns: 1fr; }
  .sj-chart { height: 240px; min-height: 200px; }
  .sj-model-focus-io { grid-template-columns: 1fr; }
}
.sj-root { background: #f7f9fc; }
</style>
