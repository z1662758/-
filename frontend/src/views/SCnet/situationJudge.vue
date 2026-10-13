<template>
  <div class="sj-root" v-loading="loading">
    <!-- Error state -->
    <div v-if="error" class="sj-error">
      <p>⚠️ 数据加载失败：{{ error }}</p>
      <el-button @click="fetchData" type="primary" size="small">重试</el-button>
    </div>

    <template v-if="!error && chartData">
      <!-- ====== 世界地图态势图（含趋势分析 + 解释 + 结论 + 验证 + 关键事件演化） ======
           三种研判视角共用这一个地图容器,只是注入的数据与口径不同。
           子标签行由 SituationMap 渲染在地图上方、供应来源占比栏之上,
           切换事件从这里原样上报给上一层(状态由 useExpertWorkflowStore 持有)。 -->
      <SituationMap
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

      <!-- ====== 研判过程（地图下方、详情分析上方） ====== -->
      <JudgmentProcessFlow
        :title="flowTitle"
        :source-label="meta.sourceLabel"
        :steps="flowSteps"
        :pending-count="flowPendingCount"
        :accent="meta.accent"
        :note="flowNote"
      />

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
          <details :key="`${selectedJudgmentModel}-input`" class="sj-model-parameter-fold">
            <summary>{{ selectedJudgmentMethod.label }} · 查看供应链输入</summary>
            <dl>
              <div v-for="item in selectedModelParameters.inputs" :key="item.key">
                <dt>{{ item.label }} <small>{{ item.key }}</small></dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
            <details class="sj-model-technical-fold">
              <summary>查看计算口径与技术字段</summary>
              <dl>
                <div v-for="item in selectedModelParameters.technicalInputs" :key="item.key">
                  <dt>{{ item.label }} <small>{{ item.key }}</small></dt>
                  <dd>{{ item.value }}</dd>
                </div>
              </dl>
            </details>
          </details>
          <details :key="`${selectedJudgmentModel}-output`" class="sj-model-parameter-fold">
            <summary>{{ selectedJudgmentMethod.label }} · 查看供应链输出</summary>
            <dl>
              <div v-for="item in selectedModelParameters.outputs" :key="item.key">
                <dt>{{ item.label }} <small>{{ item.key }}</small></dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
            <details class="sj-model-technical-fold">
              <summary>查看计算结果与技术字段</summary>
              <dl>
                <div v-for="item in selectedModelParameters.technicalOutputs" :key="item.key">
                  <dt>{{ item.label }} <small>{{ item.key }}</small></dt>
                  <dd>{{ item.value }}</dd>
                </div>
              </dl>
            </details>
          </details>
          <p class="sj-model-parameter-note">供应量基于历史贸易量代理，不代表铁路或口岸核定运力；容量变化百分比不是中断概率。</p>
        </div>
      </section>

      <p v-if="mode !== 'llm' && assessmentError" class="sj-assessment-error">{{ assessmentError }}</p>

      <!-- ====== 各视角自己的结果区 ====== -->
      <LlmJudgmentPanel
        v-if="mode === 'llm'"
        :llm="llm"
        :events="osintEvents"
        :route-names="routeNames"
      />
      <DomainJudgmentPanel
        v-else-if="mode === 'domain' && !selectedRiskAssessment"
        :routes="domainRoutes"
        :nodes="domainNodes"
        :critical-nodes="criticalNodes"
        :edges="edges"
        :metrics="networkMetrics"
        :model-runs="modelRuns"
      />
      <DualJudgmentPanel
        v-else-if="mode === 'dual' && !selectedRiskAssessment"
        :dual="dual"
        :llm="llm"
        :routes="domainRoutes"
        :critical-nodes="criticalNodes"
        :risk-nodes="highRiskNodes"
      />

      <section v-if="mode !== 'llm' && selectedRiskAssessment" class="sj-model-focus">
        <h3>{{ selectedJudgmentMethod.label }} · 路线研判</h3>
        <p class="sj-model-focus-method">{{ selectedJudgmentMethod.description }}</p>
        <p class="sj-model-focus-plain">{{ selectedRiskAssessment.plainExplanation }}</p>
        <p class="sj-model-focus-algorithm">{{ selectedJudgmentMethod.basis }}</p>
        <p class="sj-model-focus-summary">覆盖 {{ selectedRiskAssessment.routes.length }} 条路线；{{ selectedRiskAssessment.summary }}</p>
        <p class="sj-model-focus-note">“原路线风险”来自固定领域模型的展示分，供对照；它不是当前所选方法的输出，也不是中断概率。</p>
        <p v-if="mode === 'dual'" class="sj-model-focus-note">大模型原有研判仍是独立结果；本方法的网络指标不直接等同于大模型风险等级。</p>
        <div class="sj-model-focus-rows">
          <div v-for="route in selectedRiskAssessment.routes" :key="route.id">
            <span>{{ route.country }}</span>
            <span>原路线风险 {{ route.baselineScore == null ? '—' : route.baselineScore.toFixed(1) + '/100' }}</span>
            <b>{{ route.displayValue }} · {{ route.description }}</b>
          </div>
        </div>
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
      <div v-if="mode === 'llm' || !selectedRiskAssessment" class="sj-detail-section">
        <div class="sj-detail-header">
          <span class="sj-detail-title">📊 详情分析</span>
          <span class="sj-detail-source" :style="{ color: meta.accent }">{{ meta.sourceLabel }}</span>
        </div>

        <!-- 大模型视角没有对应的图表结果:保留容器与布局,明确说明暂无,不用别处的数据顶替 -->
        <div v-if="mode === 'llm'" class="sj-detail-empty">
          {{ detailEmptyText }}
        </div>

        <div v-else class="sj-detail-grid">
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
      </div>
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
   * 缺失时为 null,页面显示"暂无大模型研判结果",不用领域模型结果顶替。
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

/* ── 领域模型数据(任何视角都原样保留,不做削弱) ──
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
    baselineScore: baselineByRoute.get(r.id)?.display_risk_score != null && Number.isFinite(Number(baselineByRoute.get(r.id).display_risk_score))
      ? Number(baselineByRoute.get(r.id).display_risk_score) : null,
    displayValue: r.score > 0 ? `${r.score.toFixed(id === 'min_cut' ? 0 : 1)}${unit}`
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
const selectedModelParameters = computed(() => {
  const data = assessmentData.value
  if (!data || !selectedRiskAssessment.value) return { inputs: [], outputs: [], technicalInputs: [], technicalOutputs: [] }
  const method = selectedJudgmentModel.value
  const routes = data.network?.routes || []
  const nameById = new Map(routes.map(route => [String(route.id), route.country || route.id]))
  const routeName = id => nameById.get(String(id)) || String(id)
  const number = value => value == null || !Number.isFinite(Number(value))
    ? '—' : Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
  const percent = value => `${number(value)}%`
  const unit = data.min_cut?.capacity_unit || data.event_driven?.unit || '未提供'
  const capacityBasis = data.event_driven?.capacity_basis || '未提供'
  const item = (key, label, value) => ({ key, label, value: String(value ?? '—') })
  const focusIds = new Set(focusedRouteIds.value.map(String))
  const caseRoutes = routes.filter(route => focusIds.has(String(route.id)))
  const routePath = route => (route.nodes || []).map(node => node.name).filter(Boolean).join(' → ')
  const effectiveEvents = (data.network?.events || []).filter(event => event.runtime_status === 'EFFECTIVE' || event.risk_effective)
  const inputs = [
    item('routes[].country / material', '供应来源与物资', routes.map(route => `${route.country || route.id}：${route.material || '物资未标注'}`).join('；') || '未提供'),
    item('routes[].transport', '运输路线与方式', routes.map(route => `${route.country || route.id}（${route.transport || '方式未标注'}）`).join('；') || '未提供'),
    item('routes[].nodes', caseRoutes.length ? '本案关注路线的沿途节点' : '路线沿途节点示例', (caseRoutes.length ? caseRoutes : routes.slice(0, 2))
      .map(route => `${route.country || route.id}：${routePath(route) || '节点未标注'}`).join('；') || '未提供'),
  ]
  const technicalInputs = [
    item('snapshot_id', '网络快照编号', data.snapshot_id),
    item('network', '路线、节点与连接数', `${routes.length} 条路线 / ${data.network?.nodes?.length || 0} 个节点 / ${data.network?.metrics?.edges?.length || 0} 条连接`),
    item('capacity_basis', '供应量计算依据', capacityBasis === 'OBSERVED_TRADE_PROXY' ? '历史贸易量代理（OBSERVED_TRADE_PROXY）' : capacityBasis),
  ]
  let outputs = []
  let technicalOutputs = []
  if (method === 'min_cut') {
    const cut = data.min_cut || {}
    const cutEdges = cut.cut_edges || []
    const affectedIds = [...new Set(cutEdges.flatMap(edge => edge.affected_route_ids || []))]
    inputs.push(item('assessment_question', '评估问题', '哪些供应通道限制了从来源国到国内接收网络的整体供应量'))
    outputs = [
      item('cut_edges[].affected_route_ids', '涉及瓶颈的供应来源', affectedIds.map(routeName).join('、') || '本次未识别'),
      item('routes[].cut_edge_count', '各来源关联的瓶颈段数', (cut.routes || []).map(route => `${routeName(route.route_id)}：${number(route.cut_edge_count)} 段`).join('；') || '未提供'),
      item('routes[].key_risk_points', '相关路线的关键节点（网络快照）', routes.filter(route => affectedIds.map(String).includes(String(route.id)))
        .map(route => `${route.country || route.id}：${(route.key_risk_points || []).map(point => point.name).filter(Boolean).join('、') || '未标注'}`).join('；') || '未提供'),
      item('cut_edges.length', '限制全网供应的通道段', `${cutEdges.length} 段；没有出现在本次瓶颈集合中的路线仍可能存在其他风险`),
    ]
    technicalInputs.push(item('source → sink', '计算起点与终点', '综合供应源 → 国内接收网络'))
    technicalOutputs = [
      item('cut_capacity', '最小割对应的代理供应量', `${number(cut.cut_capacity)} ${unit}`),
      item('cut_edges[]', '模型识别的具体连接', cutEdges.length
        ? cutEdges.map(edge => `${edge.from_node} → ${edge.to_node}（${(edge.affected_route_ids || []).map(routeName).join('、') || '路线未标注'}）`).join('；') : '无'),
    ]
  } else if (method === 'n1_capacity') {
    const scenarios = data.n1_capacity || []
    inputs.push(item('blocked_route_id', '停运情景', `分别假设 ${scenarios.map(scenario => routeName(scenario.route_id)).join('、') || '各供应路线'} 完全中断，每次只停一条`))
    outputs = [
      item('capacity_loss_ratio', '各来源停运后的全网供应缺口', scenarios.map(scenario => `${routeName(scenario.route_id)}：${percent(scenario.capacity_loss_ratio)}`).join('；') || '未提供'),
      item('available_alternatives', '仍可使用的其他来源', scenarios.map(scenario => `${routeName(scenario.route_id)}停运：${(scenario.available_alternatives || []).map(routeName).join('、') || '未列出'}`).join('；') || '未提供'),
    ]
    technicalInputs.push(item('scenario_count', '逐条停运的独立情景数', scenarios.length))
    technicalOutputs = [
      item('baseline_supply_capacity', '正常情景的全网代理供应量', `${number(scenarios[0]?.baseline_supply_capacity)} ${unit}`),
      item('post_disruption_capacity', '停运后的全网代理供应量', scenarios.map(scenario => `${routeName(scenario.route_id)}：${number(scenario.post_disruption_capacity)} ${scenario.unit || unit}`).join('；') || '无'),
      item('capacity_loss', '停运造成的代理供应量差额', scenarios.map(scenario => `${routeName(scenario.route_id)}：${number(scenario.capacity_loss)} ${scenario.unit || unit}`).join('；') || '无'),
    ]
  } else if (method === 'event_driven') {
    const event = data.event_driven || {}
    const impacts = event.route_impacts || []
    const osint = data.network?.metrics?.osintInfo || {}
    inputs.push(item('network.events[]', '当前生效的供应链事件', effectiveEvents.length
      ? `${effectiveEvents.length} 条；${effectiveEvents.slice(0, 5).map(e => e.title || e.event_id).join('；')}${effectiveEvents.length > 5 ? '等' : ''}` : '本次快照未列出生效事件'))
    inputs.push(item('network.events[].affected_route_ids', '事件关联的供应来源', [...new Set(effectiveEvents.flatMap(e => e.affected_route_ids || []))].map(routeName).join('、') || '未标注关联路线'))
    outputs = [
      item('current_availability_loss_pct', '当前事件情景下的全网供应缺口', percent(event.current_availability_loss_pct)),
      item('route_impacts[].single_route_loss_pct', '各来源单独受影响时的全网缺口', impacts.map(route => `${routeName(route.route_id)}：${percent(route.single_route_loss_pct)}`).join('；') || '未提供'),
      item('route_impacts[].availability_factor', '各路线情景可用比例', impacts.map(route => `${routeName(route.route_id)}：${percent(Number(route.availability_factor) * 100)}`).join('；') || '未提供'),
    ]
    technicalInputs.push(item('osint_events', '登记与生效事件数', `${osint.registered_total ?? '—'} 条 / ${osint.effective_count ?? '—'} 条`))
    technicalInputs.push(item('assumptions.availability', '事件到路线可用系数的映射规则', event.assumptions?.['availability 推导'] || '未提供'))
    technicalOutputs = [
      item('baseline_flow', '事件折减前的全网代理供应量', `${number(event.baseline_flow)} ${event.unit || unit}`),
      item('current_availability_flow', '事件折减后的全网代理供应量', `${number(event.current_availability_flow)} ${event.unit || unit}`),
      item('current_availability_loss', '全网代理供应量差额', `${number(event.current_availability_loss)} ${event.unit || unit}`),
    ]
  }
  return { inputs, outputs, technicalInputs, technicalOutputs }
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
  if (mode.value === 'domain') return '领域模型研判过程'
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
    ? '大模型实际发起领域模型工具调用，并基于返回的执行记录形成独立双驱动结论。'
    : '本次没有完整的双驱动执行产物；不会把独立大模型结论和领域模型分数拼接成第三份结论。'
  if (llmAvailable.value) return ''
  if (mode.value === 'domain') return ''
  return '标灰的环节依赖大模型产出，本次没有大模型研判结果，因此未执行 —— 不会用领域模型的结果填充这两步。'
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
.sj-root { padding: 1.5rem; height: calc(100vh - 60px); overflow-y: auto; }

.sj-error { text-align: center; padding: 3rem; color: #ef4444; }
.sj-error p { margin-bottom: 1rem; }

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
.sj-model-parameter-fold { border: 1px solid #dbeafe; border-radius: 8px; background: #fff; }
.sj-model-parameter-fold summary { cursor: pointer; padding: 8px 10px; color: #1e3a8a; font-size: 0.76rem; font-weight: 600; }
.sj-model-parameter-fold summary:focus-visible { outline: 2px solid #93c5fd; }
.sj-model-parameter-fold dl { margin: 0; padding: 0 10px 8px; }
.sj-model-parameter-fold dl > div { display: grid; grid-template-columns: minmax(190px, 1fr) minmax(0, 2fr); gap: 9px; padding: 7px 0; border-top: 1px solid #eff6ff; font-size: 0.72rem; line-height: 1.55; }
.sj-model-parameter-fold dt { color: #1e3a8a; font-weight: 600; overflow-wrap: anywhere; }
.sj-model-parameter-fold dt small { display: block; color: #64748b; font-size: 0.66rem; font-weight: 400; }
.sj-model-parameter-fold dd { margin: 0; color: #334155; overflow-wrap: anywhere; }
.sj-model-technical-fold { margin: 0 10px 8px; border-top: 1px solid #e2e8f0; }
.sj-model-technical-fold summary { padding: 7px 0; color: #64748b; font-size: 0.7rem; font-weight: 400; }
.sj-model-technical-fold dl { padding: 0; }
.sj-model-picker .sj-model-parameter-note { margin-top: 1px; font-size: 0.7rem; }
.sj-model-source { display: inline-block; margin: 2px 0 8px; font-size: 0.75rem; color: #2563eb; }
.sj-assessment-error { color: #b91c1c; font-size: 0.8rem; }
.sj-model-focus { background: #fff; }
.sj-model-focus h3 { margin: 0 0 9px; font-size: 0.98rem; color: #1e293b; }
.sj-model-focus p { margin: 6px 0; font-size: 0.82rem; line-height: 1.7; color: #334155; }
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
  padding: 1.2rem 1.2rem 0.4rem; margin-bottom: 1rem;
}
.sj-detail-header { margin-bottom: 1rem; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.sj-detail-title { font-size: 1.05rem; font-weight: 700; color: #1e293b; }
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
  .sj-chart { height: 240px; min-height: 200px; }
  .sj-model-focus-io { grid-template-columns: 1fr; }
  .sj-model-parameter-fold dl > div { grid-template-columns: 1fr; gap: 2px; }
}
</style>
