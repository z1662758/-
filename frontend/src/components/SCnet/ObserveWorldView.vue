<template>
  <div class="owv">
    <!-- ① 观察分析子问题：把用户的实验目的拆成观察阶段要回答的子问题 -->
    <section class="owv-subq">
      <header class="owv-subq-head">
        <span class="owv-badge">观察分析子问题</span>
        <p class="owv-subq-main">
          围绕「{{ purpose || '本次实验目的' }}」，{{ subQuestionLead }}
        </p>
        <button type="button" class="owv-toggle" @click="subqOpen = !subqOpen">{{ subqOpen ? '收起' : '展开' }}</button>
      </header>
      <div v-show="subqOpen" class="owv-subq-body">
        <ul class="owv-subq-list">
          <li v-for="item in subQuestions" :key="item">{{ item }}</li>
        </ul>
        <p class="owv-subq-label">本阶段回答</p>
        <p class="owv-subq-answer">{{ stageAnswer }}</p>
        <p class="owv-subq-source">{{ sourceText }}</p>
      </div>
    </section>

    <!-- ② 平行世界树（从事件开始前的共同状态出发）+ 故事线 / 演化时间线 -->
    <div class="owv-top">
      <section class="owv-tree">
        <header class="owv-panel-head">
          <div>
            <p class="owv-eyebrow">PARALLEL TIMELINE TREE</p>
            <h3>平行世界树</h3>
            <p class="owv-desc">从事件开始前的共同状态出发，点击决策节点逐层查看后续决策与关键指标。</p>
          </div>
          <span class="owv-legend">
            <span><i class="owv-dot owv-dot--decision"></i>决策节点</span>
            <span><i class="owv-dot owv-dot--metric"></i>指标节点</span>
          </span>
        </header>

        <div class="owv-root" :class="{ 'is-open': rootOpen }">
          <button type="button" class="owv-root-head" @click="rootOpen = !rootOpen">
            <span class="owv-root-label">共同事实根节点</span>
            <span class="owv-root-time">{{ rootTime }}</span>
          </button>
          <p class="owv-root-desc">{{ rootDesc }}</p>
          <p class="owv-root-note">{{ fixedConditions }}</p>
          <div class="owv-chips">
            <span v-for="chip in rootChips" :key="chip.key" class="owv-chip">
              {{ chip.label }}<b v-if="chip.value">{{ chip.value }}</b>
            </span>
          </div>
        </div>

        <div class="owv-branches">
          <article v-for="world in worlds" :key="world.key" class="owv-world" :class="{ 'is-control': world.key === 'control' }">
            <header class="owv-world-head">
              <span class="owv-world-id">{{ world.id }}</span>
              <span class="owv-world-time">{{ world.method }}</span>
            </header>
            <h4 class="owv-world-name">{{ world.name }}</h4>
            <p class="owv-world-desc">{{ world.desc }}</p>
            <p class="owv-world-meta">因素 <b>{{ world.factor }}</b> · 水平 <b>{{ world.levels }}</b></p>
            <button type="button" class="owv-world-btn" @click="toggleWorld(world.key)">
              {{ expandedWorlds[world.key] ? '收起分支' : '展开下一级' }}
            </button>

            <div v-show="expandedWorlds[world.key]" class="owv-next">
              <div class="owv-next-head">
                <span class="owv-next-label">后续决策</span>
                <span class="owv-next-time">{{ world.method }}</span>
              </div>
              <p class="owv-next-title">{{ world.hypothesis }}</p>
              <p class="owv-next-desc">{{ world.nextDesc }}</p>
              <button type="button" class="owv-world-btn" @click="toggleMetrics(world.key)">
                {{ metricsOpenWorlds[world.key] ? '收起关键指标' : '查看关键指标' }}
              </button>
              <ul v-show="metricsOpenWorlds[world.key]" class="owv-metrics">
                <li v-for="metric in world.metrics" :key="metric">{{ metric }}</li>
              </ul>
            </div>
          </article>
        </div>

        <p class="owv-tree-hint">
          提示：每一列是一条共享相同基线的世界线；展开节点可追踪「共同状态 → 关键决策 → 后续决策 → 结果指标」。
          <router-link v-if="designLink" :to="designLink" class="owv-link">回到实验组设计</router-link>
        </p>
        <p v-if="demoMode" class="owv-tree-hint owv-tree-hint--demo">未读到实验方案：以上为按典型反事实方案生成的示例世界线，配置实验方案后会替换为真实实验组。</p>
      </section>

      <aside class="owv-side">
        <section class="owv-story">
          <header class="owv-panel-head owv-panel-head--compact">
            <div>
              <p class="owv-eyebrow">STORYLINE TRAJECTORY</p>
              <h3>原本故事线运行轨迹</h3>
              <p class="owv-desc">{{ storylineDesc }}</p>
            </div>
            <span class="owv-badge" :class="stageSegments ? 'owv-badge--measured' : 'owv-badge--skeleton'">
              {{ stageSegments ? '实测分段' : '示例骨架' }}
            </span>
          </header>
          <ol class="owv-phases">
            <li v-for="phase in phases" :key="phase.key" class="owv-phase" :class="'owv-phase--' + phase.key">
              <span class="owv-phase-index">{{ phase.index }}</span>
              <div>
                <p class="owv-phase-title">
                  {{ phase.title }}
                  <span v-if="phase.range" class="owv-phase-range">{{ phase.range }}</span>
                </p>
                <p class="owv-phase-desc">{{ phase.note }}</p>
                <p v-if="phase.data" class="owv-phase-data">{{ phase.data }}</p>
              </div>
            </li>
          </ol>
        </section>

        <section class="owv-timeline">
          <header class="owv-panel-head owv-panel-head--compact">
            <div>
              <p class="owv-eyebrow">EVOLUTION TIMELINE</p>
              <h3>演化时间线变化</h3>
              <p class="owv-desc">{{ timelineDesc }}</p>
            </div>
            <span class="owv-badge" :class="hasLiveSeries ? 'owv-badge--measured' : 'owv-badge--skeleton'">
              {{ hasLiveSeries ? '真实逐轮' : '示例骨架' }}
            </span>
          </header>
          <div class="owv-track">
            <span class="owv-track-line"></span>
            <div v-for="(point, index) in timelinePoints" :key="index" class="owv-point" :class="'owv-point--' + point.tone">
              <span class="owv-point-dot">{{ index + 1 }}</span>
              <div class="owv-point-card">
                <p class="owv-point-time">{{ point.time }}</p>
                <p class="owv-point-title">{{ point.title }}</p>
                <p class="owv-point-detail">{{ point.detail }}</p>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <!-- 实验方案 × 反事实实验对比：结论摘要卡片 + 点击展开的详情面板由页面注入 -->
    <section v-if="$slots.compare" class="owv-compare">
      <header class="owv-panel-head">
        <div>
          <p class="owv-eyebrow">PLAN VS COUNTERFACTUAL</p>
          <h3>实验方案 × 反事实实验对比</h3>
          <p class="owv-desc">以刚才设定的实验方案（对照组 F-00）为基准，逐条对比反事实实验库里的世界线；下方是 指标对比 / 深度分析 / 概率分布 的结论摘要，点击卡片可展开完整详情。</p>
        </div>
      </header>
      <slot name="compare" />
    </section>

    <!-- ③ 观察实验组 · 平行世界风险分布 -->
    <section class="owv-dist">
      <header class="owv-panel-head">
        <div>
          <p class="owv-eyebrow">PARALLEL WORLD DISTRIBUTION</p>
          <h3>观察实验组 · 平行世界风险分布</h3>
          <p class="owv-desc">仅汇总观察分析方案中的实验组；对照组与各世界线共用初始条件和随机种子，比较结局的概率差异。</p>
        </div>
        <span class="owv-pill">对照组 + {{ Math.max(0, worlds.length - 1) }} 个实验组 · {{ sampleLabel }}</span>
      </header>

      <div class="owv-revalidate">
        <div>
          <p class="owv-revalidate-title">重新验证平行世界线</p>
          <p class="owv-revalidate-desc">选择一条实验组世界线，回到事后反事实实验平台，仅重跑该世界线与对照组。</p>
        </div>
        <el-select v-model="revalidateKey" size="small" class="owv-revalidate-select" placeholder="选择实验组世界线">
          <el-option v-for="world in groupWorlds" :key="world.key" :label="world.id + ' · ' + world.name" :value="world.key" />
        </el-select>
        <el-button type="primary" :disabled="!revalidateKey" @click="revalidateWorld">通过反事实平台重新验证</el-button>
      </div>

      <div class="owv-dist-legend">
        <span v-for="def in OUTCOME_DEFS" :key="def.key"><i class="owv-swatch" :style="{ background: def.color }"></i>{{ def.label }}</span>
      </div>

      <p v-if="liveLoading" class="owv-empty">正在读取本实验的逐轮指标…</p>
      <template v-else>
        <div v-for="row in distRows" :key="row.key" class="owv-dist-row">
          <div class="owv-dist-label">
            <b>{{ row.id }}</b>
            <span>{{ row.name }}</span>
          </div>
          <div class="owv-dist-bar">
            <template v-if="row.share">
              <span v-for="seg in row.share" :key="seg.key" class="owv-dist-seg"
                :style="{ width: seg.pct + '%', background: seg.color }"
                :title="seg.label + ' ' + seg.pct + '%'">
                <b v-if="seg.pct >= 8">{{ seg.pct }}%</b>
              </span>
            </template>
            <span v-else class="owv-dist-pending">待运行该世界线（暂无可归类的逐轮数据）</span>
          </div>
          <div class="owv-dist-verdict">{{ row.verdict }}</div>
        </div>
        <p class="owv-dist-foot">
          归类口径：{{ riskMetricKey ? `以真实逐轮指标 ${riskMetricLabel} 的四分位为界` : '未取到真实逐轮指标，以下为示例分布' }}，把每轮结果划入「稳定 / 局部拥堵 / 失稳扩散 / 疏散恢复」；
          比例描述仿真结果的可能性，不是现实事故的发生概率。
        </p>
        <p v-if="hasDemoRows" class="owv-dist-demo">标为示例的行是按方案假设推演的结果，运行对应世界线后将以真实逐轮数据替代。</p>
      </template>

      <div v-if="riskMetricKey && lagCards.length" class="owv-lag">
        <div class="owv-lag-head">
          <p class="owv-lag-title">滞后效应对比</p>
          <p class="owv-lag-sub">决策启动到风险指标出现持续改善的时间差，越短越好。</p>
        </div>
        <div v-for="card in lagCards" :key="card.key" class="owv-lag-row">
          <span class="owv-lag-name">{{ card.name }}</span>
          <span class="owv-lag-track"><i :style="{ width: card.pct + '%' }"></i></span>
          <span class="owv-lag-value">{{ card.text }}</span>
        </div>
        <p class="owv-lag-note">{{ lagNote }}</p>
      </div>

      <div class="owv-conclusions">
        <article class="owv-conclusion owv-conclusion--chance">
          <span class="owv-conclusion-tag">偶然性结论</span>
          <p>局部波动与随机扰动会改变风险升高的具体轮次，但不改变总体走向；判定结论时以整段分布为准，不放大单轮噪声。</p>
        </article>
        <article class="owv-conclusion owv-conclusion--certain">
          <span class="owv-conclusion-tag">必然性结论</span>
          <p>{{ certaintyText }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { PLAN_QUERY_KEY, readExperimentPlan, resolveAnalysisPlans, ANALYSIS_FIXED_CONDITIONS } from '@/constants/scnetExperimentPlan'
import { getExperimentDistribution } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'

// 结局口径：颜色与顺序固定，供图例、堆叠条、结论共用
const OUTCOME_DEFS = Object.freeze([
  { key: 'stable', label: '稳定通行', color: '#22c55e' },
  { key: 'congested', label: '局部拥堵', color: '#f59e0b' },
  { key: 'unstable', label: '失稳扩散', color: '#ef4444' },
  { key: 'recovery', label: '疏散恢复', color: '#3b82f6' }
])

// 风险主指标：越高越安全。优先网络稳定性，其次订单完成率，最后退回逐轮数据里第一个数值列。
const RISK_CANDIDATES = ['network_stability', 'completion_rate', 'production_capacity_est']

const route = useRoute()
const router = useRouter()

const planId = computed(() => String(route.query[PLAN_QUERY_KEY] || '').trim())
const plan = computed(() => readExperimentPlan(planId.value))
const purpose = computed(() => String(plan.value?.purpose || '').trim())
const experimentId = computed(() => String(route.query.experiment_id || '').trim())
const fixedConditions = ANALYSIS_FIXED_CONDITIONS

const planMetrics = computed(() => (Array.isArray(plan.value?.metrics) ? plan.value.metrics : []).filter((item) => item && (item.key || item.label)))
const planMetricLabels = computed(() => planMetrics.value.map((item) => item.label || item.key))
const observeGroups = computed(() => {
  if (!plan.value) return []
  const plans = resolveAnalysisPlans(plan.value)
  return (plans.observe && plans.observe.groups) || []
})

// ---- 真实逐轮数据（当前实验）----
const liveRows = ref([])
const liveLoading = ref(false)
const loadLiveData = async () => {
  // 换实验（URL 上的 experiment_id 变化）时先清空：否则新实验取数失败会继续显示上一份的逐轮数据
  liveRows.value = []
  if (!experimentId.value) return
  liveLoading.value = true
  try {
    const res = await getExperimentDistribution(experimentId.value)
    const data = unwrapApiData(res)
    if (data && Array.isArray(data.metrics_by_iteration) && data.metrics_by_iteration.length) {
      liveRows.value = data.metrics_by_iteration
    }
  } catch {
    // 后端不可用时不阻塞：下面按无数据处理，给出明确提示
  } finally {
    liveLoading.value = false
  }
}
onMounted(loadLiveData)
// 同一路由只换 query（换实验）时组件会被复用，onMounted 不再触发，必须显式重载
watch(experimentId, loadLiveData)

const numericKeys = computed(() => {
  const keys = new Set()
  liveRows.value.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (Number.isFinite(Number(row[key]))) keys.add(key)
    })
  })
  return [...keys]
})
const riskMetricKey = computed(() => RISK_CANDIDATES.find((key) => numericKeys.value.includes(key)) || numericKeys.value[0] || '')
// 是否真的拿到了可用的逐轮序列（有轮次 + 有数值列）：时间线与徽标都以它为准
const hasLiveSeries = computed(() => Boolean(liveRows.value.length && riskMetricKey.value))
const riskMetricLabel = computed(() => {
  const key = riskMetricKey.value
  if (!key) return ''
  const hit = planMetrics.value.find((item) => (item.analysisKey || item.key) === key)
  return hit ? (hit.label || hit.key) : key
})
const riskSeries = computed(() => liveRows.value
  .map((row) => Number(row?.[riskMetricKey.value]))
  .filter((value) => Number.isFinite(value)))
// 越高越安全的指标，越低风险越大；四分位分界把真实轮次划到四个结局
const quantiles = computed(() => {
  const sorted = [...riskSeries.value].sort((a, b) => a - b)
  if (!sorted.length) return null
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))]
  return { q25: at(0.25), q50: at(0.5), q75: at(0.75) }
})
const outcomeShare = computed(() => {
  const values = riskSeries.value
  const q = quantiles.value
  if (!values.length || !q) return null
  const counts = { stable: 0, congested: 0, unstable: 0, recovery: 0 }
  values.forEach((value, index) => {
    const prev = index > 0 ? values[index - 1] : null
    if (prev !== null && prev < q.q50 && value >= q.q50) counts.recovery += 1
    else if (value <= q.q25) counts.unstable += 1
    else if (value < q.q50) counts.congested += 1
    else counts.stable += 1
  })
  const total = values.length
  return OUTCOME_DEFS.map((def) => ({ ...def, pct: Math.round((counts[def.key] / total) * 100), count: counts[def.key] }))
})
const sampleLabel = computed(() => (liveRows.value.length
  ? `${liveRows.value.length} 轮真实仿真`
  : '示例数据（未取到真实逐轮数据）'))

// 没有方案 / 没有逐轮数据时的示例内容：保证平行世界树始终可读，示例内容在页面上会明确标注
const DEMO_GROUPS = Object.freeze([
  { id: 'OBS-01', name: '决策提前世界线', factor: '关键决策启动时点', levels: '相对事实提前', hypothesis: '更早分流将降低风险峰值，并使高风险状态更快消退。' },
  { id: 'OBS-02', name: '决策延迟世界线', factor: '关键决策启动时点', levels: '相对事实延后', hypothesis: '延迟处置将扩大风险暴露，并呈现可测量的滞后放大效应。' },
  { id: 'OBS-03', name: '决策替换世界线', factor: '处置方式', levels: '用替代策略替换事实处置', hypothesis: '替换处置方式会改变风险回落速度与恢复形态。' }
])
const DEMO_CHIPS = Object.freeze([
  { key: 'demo-risk', label: '风险指标', fallback: '高位' },
  { key: 'demo-load', label: '系统负载', fallback: '累积中' },
  { key: 'demo-capacity', label: '通过能力', fallback: '下降' }
])
// 每行 [稳定通行, 局部拥堵, 失稳扩散, 疏散恢复] 百分比，仅在没有真实逐轮数据时使用
const DEMO_DIST = Object.freeze([
  [4, 19, 77, 0],
  [5, 22, 61, 12],
  [10, 24, 54, 12],
  [13, 26, 46, 15]
])
const demoMode = computed(() => !observeGroups.value.length)

// ---- 平行世界树 ----
const rootOpen = ref(true)
const expandedWorlds = reactive({ control: true })
const metricsOpenWorlds = reactive({})
const toggleWorld = (key) => { expandedWorlds[key] = !expandedWorlds[key] }
const toggleMetrics = (key) => { metricsOpenWorlds[key] = !metricsOpenWorlds[key] }

const firstRow = computed(() => liveRows.value[0] || null)
const rootChips = computed(() => {
  if (!planMetrics.value.length && !numericKeys.value.length) {
    return DEMO_CHIPS.map((item) => ({ key: item.key, label: item.label, value: item.fallback }))
  }
  const source = planMetrics.value.length
    ? planMetrics.value.map((item) => ({ key: item.key || item.label, label: item.label || item.key, rowKey: item.analysisKey || item.key }))
    : numericKeys.value.slice(0, 3).map((key) => ({ key, label: key, rowKey: key }))
  return source.slice(0, 5).map((item) => {
    const value = Number(firstRow.value?.[item.rowKey])
    return { key: item.key, label: item.label, value: Number.isFinite(value) ? String(Number(value.toFixed(2))) : '' }
  })
})
const rootTime = computed(() => (liveRows.value.length ? '第 1 轮' : '事件开始前'))
const rootDesc = computed(() => {
  const scene = plan.value?.scenarioLabel || '本场景'
  const question = purpose.value ? `以「${purpose.value}」为目标` : '以本次实验目的为目标'
  return `${scene}在事件开始前的共同状态：${question}，各条世界线在此共享同一人群 / 空间 / 随机种子，之后只改变关键决策。`
})

const controlWorld = {
  key: 'control', id: '对照组',
  name: '对照组 · 事实基线',
  desc: '维持事实处置节奏，风险显化后按原事件节奏响应。',
  factor: 'F-00（不干预）', levels: '基线参数', method: '配对时序对照',
  hypothesis: '所有实验组都只相对 F-00 改变一个因素，差异才可归因。',
  nextDesc: '世界线在此只作参照：后续决策与实验组保持同一评估口径，不再施加额外干预。'
}
// 没配置方案时用示例世界线，保证平行世界树始终有内容（示例世界线在页面上会标注）
const effectiveGroups = computed(() => (observeGroups.value.length ? observeGroups.value : DEMO_GROUPS))
const groupWorlds = computed(() => effectiveGroups.value.map((group) => ({
  key: group.id,
  id: group.id,
  name: group.name || '实验组',
  desc: group.factor ? `只改变「${group.factor}」，其余条件与 F-00 一致。` : '与 F-00 共享初始条件，仅改变一个关键因素。',
  factor: group.factor || '待指定',
  levels: group.levels || '待指定',
  method: group.method || '配对时序对照',
  hypothesis: group.hypothesis || '写清预期方向与判定指标。',
  nextDesc: '展开后可沿该世界线继续追踪后续决策与关键指标，做法与对照组一致。'
})))
const metricList = computed(() => {
  const list = planMetricLabels.value.slice(0, 6)
  return list.length ? list : ['风险指标（待选目标指标）']
})
const worlds = computed(() => [controlWorld, ...groupWorlds.value]
  .map((world) => ({ ...world, metrics: metricList.value })))

const designLink = computed(() => {
  if (!plan.value || !plan.value.id) return null
  const query = { scenario: route.query.scenario, plan_id: plan.value.id, phase: 'post' }
  if (route.query.session_id) query.session_id = route.query.session_id
  if (route.query.from_chat) query.from_chat = route.query.from_chat
  return { path: SCNET_ROUTES.experimentPlan, query }
})

// ---- 故事线与演化时间线 ----
// 四个阶段是通用的分析框架，不是仿真产出：标题与释义固定，描述里的观测口径取自本次实验方案；
// 只有真的取到逐轮数据时，才另外附上该阶段对应的轮次区间与该段的真实取值。
const PHASE_DEFS = Object.freeze([
  { key: 'accumulate', index: '01', title: '起始累积', note: '事件开始前，各世界线共享同一初始条件与随机种子，外部输入持续汇入。' },
  { key: 'bottleneck', index: '02', title: '瓶颈形成', note: '关键通道与回流对冲，通过能力下降，局部指标越过预警区间。' },
  { key: 'amplify', index: '03', title: '风险放大', note: '局部停滞与叠加，风险指标快速上升，系统进入高风险区。' },
  { key: 'recover', index: '04', title: '恢复收敛', note: '应急分流与增援介入后，压力逐步回落，关键指标恢复。' }
])
// 观测口径：优先用实验方案里勾选的目标指标，方案没填时退回通用说法
const metricText = computed(() => (planMetricLabels.value.length ? planMetricLabels.value.join('、') : '目标指标'))

// 按时间把真实轮次切成 4 个连续区间，只做「第几轮到第几轮」的切分与该段的真实统计，
// 不推断形态、不外推趋势；不足 4 轮不给分段，直接走骨架。
const stageSegments = computed(() => {
  const rows = liveRows.value
  const key = riskMetricKey.value
  if (!rows.length || !key || rows.length < PHASE_DEFS.length) return null
  const base = Math.floor(rows.length / PHASE_DEFS.length)
  const remainder = rows.length % PHASE_DEFS.length
  let cursor = 0
  return PHASE_DEFS.map((def, i) => {
    const span = base + (i < remainder ? 1 : 0)
    const start = cursor
    const end = cursor + span
    cursor = end
    const nums = rows.slice(start, end)
      .map((row) => Number(row?.[key]))
      .filter((value) => Number.isFinite(value))
    const segment = { ...def, range: `第 ${start + 1}–${end} 轮` }
    if (!nums.length) return segment
    const mean = nums.reduce((sum, value) => sum + value, 0) / nums.length
    return { ...segment, mean, min: Math.min(...nums), max: Math.max(...nums) }
  })
})

const phases = computed(() => {
  const segments = stageSegments.value
  if (!segments) return PHASE_DEFS.map((def) => ({ ...def }))
  const fmt = (value) => Number(value.toFixed(2))
  return segments.map((segment) => {
    if (!Number.isFinite(segment.mean)) return { ...segment, data: '' }
    return {
      ...segment,
      data: `${riskMetricLabel.value}：均值 ${fmt(segment.mean)}，区间 ${fmt(segment.min)}–${fmt(segment.max)}`
    }
  })
})

const storylineDesc = computed(() => {
  if (stageSegments.value) {
    return `按时间顺序把本次实验的 ${liveRows.value.length} 个轮次切成 4 段，逐段给出真实的 ${riskMetricLabel.value} 取值；阶段名是通用分析框架，不代表已观测到该形态。`
  }
  if (liveRows.value.length) {
    return `已取到 ${liveRows.value.length} 轮数据，不足 4 轮无法分段；以下为通用分析骨架，观测口径：${metricText.value}。`
  }
  return `未取到本次实验的逐轮指标，以下为通用分析骨架（观测口径：${metricText.value}），不是本次实验的观测结果。`
})

const pickRows = (rows, count) => {
  if (rows.length <= count) return rows.map((row, index) => ({ row, index }))
  const step = (rows.length - 1) / (count - 1)
  const picked = []
  for (let i = 0; i < count; i += 1) {
    const index = Math.round(i * step)
    picked.push({ row: rows[index], index })
  }
  return picked
}
const timelinePoints = computed(() => {
  if (hasLiveSeries.value) {
    return pickRows(liveRows.value, 4).map(({ row, index }) => {
      const value = Number(row[riskMetricKey.value])
      const second = secondaryMetric(row)
      return {
        tone: value <= quantiles.value?.q25 ? 'danger' : value < quantiles.value?.q50 ? 'warn' : 'ok',
        time: `第 ${index + 1} 轮`,
        title: value <= quantiles.value?.q25 ? '风险显化' : value < quantiles.value?.q50 ? '压力累积' : '相对平稳',
        detail: `${riskMetricLabel.value} ${Number.isFinite(value) ? Number(value.toFixed(2)) : '—'}${second ? ' · ' + second : ''}`
      }
    })
  }
  // 没有逐轮数据：直接复用同一份通用骨架，并把点位标成 idle（灰）以示区别
  return PHASE_DEFS.map((phase) => ({ tone: 'idle', time: phase.title, title: phase.index, detail: phase.note }))
})
const secondaryMetric = (row) => {
  const key = numericKeys.value.find((item) => item !== riskMetricKey.value)
  if (!key) return ''
  const label = planMetrics.value.find((item) => (item.analysisKey || item.key) === key)?.label || key
  const value = Number(row?.[key])
  return Number.isFinite(value) ? `${label} ${Number(value.toFixed(2))}` : ''
}
const timelineDesc = computed(() => (hasLiveSeries.value
  ? `当前事实基线：${plan.value?.scenarioLabel || '本场景'}的逐轮演化，按 ${riskMetricLabel.value || '指标'} 的真实取值定位关键时点。`
  : '示例骨架：未取到逐轮数据，先按「起始累积 → 瓶颈形成 → 风险放大 → 恢复收敛」给出通用演化框架，不是本次实验的观测结果。'))

// ---- 本阶段回答 / 结论文案 ----
const subQuestionLead = computed(() => `如何从概率分布图看出风险何时升高、不同仿真结果之间有何差别？`)
const subQuestions = computed(() => {
  return [
    `风险何时升高：${metricText.value} 在哪些轮次越过预警区间？`,
    '不同仿真结果之间有何差别：稳定 / 拥堵 / 失稳 / 恢复各占多少？',
    '哪条世界线的风险概率结构更好，为什么？'
  ]
})
const stageAnswer = computed(() => {
  if (!riskMetricKey.value || !riskSeries.value.length) {
    return '先运行反事实实验并取到逐轮指标后，这里会按真实取值给出风险升高的轮次区间与各结局占比；在此之前不给出任何估计。'
  }
  const values = riskSeries.value
  const minIndex = values.indexOf(Math.min(...values))
  const maxIndex = values.indexOf(Math.max(...values))
  const unstable = outcomeShare.value?.find((item) => item.key === 'unstable')
  return `按真实逐轮取值：${riskMetricLabel.value} 在第 ${minIndex + 1} 轮最低（${Number(Math.min(...values).toFixed(2))}）、`
    + `第 ${maxIndex + 1} 轮最高（${Number(Math.max(...values).toFixed(2))}）；`
    + `当前实验有 ${unstable ? unstable.pct : 0}% 的轮次落入「失稳扩散」。`
    + '判断不同世界线差异时，重点看「失稳扩散」是否变短、「疏散恢复」是否变长。'
})
const sourceText = computed(() => `本结论以${plan.value?.scenarioLabel || '本场景'}${experimentId.value ? ` 实验 ${experimentId.value}` : ''}的真实逐轮指标为基线；只有关联级证据，不含 do(X) 的因果效应。`)

const certaintyText = computed(() => {
  if (!riskMetricKey.value) {
    return '当关键因素与瓶颈同时出现时，风险指标会同步逼近高位——这属于结构性风险，需在干预 / 机制分析里继续验证。'
  }
  return `当关键因素与瓶颈同时出现时，${riskMetricLabel.value} 会快速逼近高位，说明结构性风险已经形成；单次扰动只改变发生轮次，不改变走向。`
})

const lagCards = computed(() => {
  const values = riskSeries.value
  const q = quantiles.value
  if (!values.length || !q) return []
  const minIndex = values.indexOf(Math.min(...values))
  let recoverIndex = -1
  for (let i = minIndex + 1; i < values.length; i += 1) {
    if (values[i] >= q.q50) { recoverIndex = i; break }
  }
  const lag = recoverIndex > minIndex ? recoverIndex - minIndex : null
  const maxLag = Math.max(1, values.length)
  return [{
    key: 'control',
    name: '对照组（事实基线）',
    pct: lag ? Math.round((lag / maxLag) * 100) : 0,
    text: lag ? `${lag} 轮后恢复` : '未观测到恢复'
  }]
})
const lagNote = computed(() => {
  const card = lagCards.value[0]
  if (!card || !card.pct) return '滞后效应以最低点之后首次回到中位水平所需的轮数计算；当前数据未观测到明显恢复。'
  return `决策生效不等于风险立即消失：事实基线在触底后约 ${card.text.replace(' 轮后恢复', '')} 轮才回到中位水平，既有压力仍会沿通道继续释放。`
})

// ---- 重新验证：回到反事实平台重跑选中的世界线 ----
const revalidateKey = ref('')
const revalidateWorld = () => {
  if (!revalidateKey.value) return
  const query = { phase: 'post', scenario: route.query.scenario }
  if (planId.value) query[PLAN_QUERY_KEY] = planId.value
  if (experimentId.value) query.experiment_id = experimentId.value
  if (route.query.session_id) query.session_id = route.query.session_id
  if (route.query.from_chat) query.from_chat = route.query.from_chat
  query.world = revalidateKey.value
  router.push({ path: SCNET_ROUTES.counterfactualExperiment, query })
}

const buildShare = (percentages) => OUTCOME_DEFS.map((def, index) => ({ ...def, pct: Math.max(0, percentages[index] || 0), count: 0 }))
const demoShare = (index) => buildShare(DEMO_DIST[Math.min(index, DEMO_DIST.length - 1)])
// 实验组没有各自独立的实验时，按方案方向从对照组分布推演一版示例；有真实数据时对照组用真实分布
const shiftShare = (base, step) => {
  const pct = base.map((item) => item.pct)
  const unstableIndex = OUTCOME_DEFS.findIndex((def) => def.key === 'unstable')
  const stableIndex = OUTCOME_DEFS.findIndex((def) => def.key === 'stable')
  const recoveryIndex = OUTCOME_DEFS.findIndex((def) => def.key === 'recovery')
  const move = Math.min(pct[unstableIndex] - 5, step * 8)
  if (move > 0) {
    pct[unstableIndex] -= move
    const toStable = Math.round(move / 2)
    pct[stableIndex] += toStable
    pct[recoveryIndex] += move - toStable
  }
  return OUTCOME_DEFS.map((def, index) => ({ ...def, pct: pct[index], count: 0 }))
}
const verdictOf = (share) => {
  const top = [...share].sort((a, b) => b.pct - a.pct)[0]
  return top ? `${top.label} ${top.pct}%` : '待运行'
}
const distRows = computed(() => {
  const real = outcomeShare.value
  return worlds.value.map((world, index) => {
    const isControl = index === 0
    const share = isControl ? (real || demoShare(0)) : (real ? shiftShare(real, index) : demoShare(index))
    return { ...world, share, demo: !(isControl && real), verdict: verdictOf(share) }
  })
})
const hasDemoRows = computed(() => distRows.value.some((row) => row.demo))
</script>

<style scoped>
.owv { display: flex; flex-direction: column; gap: 12px; }
.owv-panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.owv-panel-head--compact { margin-bottom: 8px; }
.owv-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0; color: #2563eb; font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; }
.owv-eyebrow::before { content: ''; width: 14px; height: 3px; border-radius: 999px; background: linear-gradient(90deg, #3b82f6, #22c55e); }
.owv-panel-head h3 { margin: 4px 0 0; font-size: 17px; line-height: 1.25; font-weight: 900; letter-spacing: -0.01em; color: #0f172a; }
.owv-desc { margin: 5px 0 0; color: #64748b; font-size: 12px; line-height: 1.65; }
.owv-badge { flex: 0 0 auto; padding: 4px 11px; border: 1px solid #bfdbfe; border-radius: 999px; background: linear-gradient(180deg, #eff6ff, #dbeafe); color: #1d4ed8; font-size: 11.5px; font-weight: 800; white-space: nowrap; box-shadow: 0 1px 2px rgba(37, 99, 235, 0.12); }
.owv-badge--measured { border-color: #a7f3d0; background: linear-gradient(180deg, #ecfdf5, #d1fae5); color: #047857; box-shadow: 0 1px 2px rgba(4, 120, 87, 0.16); }
.owv-badge--skeleton { border-color: #fcd34d; background: linear-gradient(180deg, #fffbeb, #fef3c7); color: #b45309; box-shadow: 0 1px 2px rgba(180, 83, 9, 0.16); }
.owv-toggle { flex: 0 0 auto; padding: 4px 12px; border: 1px solid #cbd5e1; border-radius: 999px; background: #fff; color: #475569; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s, box-shadow 0.15s; }
.owv-toggle:hover { border-color: #93c5fd; color: #1d4ed8; background: #f8fbff; box-shadow: 0 3px 10px -4px rgba(37, 99, 235, 0.45); }

.owv-subq { position: relative; padding: 14px 18px; border: 1px solid #dbeafe; border-radius: 14px; background: linear-gradient(120deg, #eff6ff 0%, #f8fbff 52%, #f5f3ff 100%); box-shadow: 0 1px 2px rgba(37, 99, 235, 0.06), 0 14px 30px -22px rgba(37, 99, 235, 0.5); overflow: hidden; }
.owv-subq::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, #3b82f6, #6366f1); }
.owv-subq::after { content: ''; position: absolute; z-index: 0; right: -60px; top: -70px; width: 190px; height: 190px; border-radius: 50%; background: radial-gradient(circle, rgba(99, 102, 241, 0.10), transparent 68%); pointer-events: none; }
.owv-subq-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; }
.owv-subq-main { flex: 1; margin: 0; font-size: 13px; font-weight: 700; color: #1e3a8a; line-height: 1.65; }
.owv-subq-body { position: relative; z-index: 1; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #bfdbfe; }
.owv-subq-list { margin: 0 0 12px; padding-left: 20px; color: #334155; font-size: 12.5px; line-height: 1.85; }
.owv-subq-list li::marker { color: #6366f1; font-weight: 800; }
.owv-subq-label { margin: 0 0 5px; color: #1d4ed8; font-size: 11.5px; font-weight: 800; letter-spacing: 0.02em; }
.owv-subq-answer { margin: 0; padding: 10px 12px; border: 1px solid #dbeafe; border-radius: 10px; background: rgba(255, 255, 255, 0.78); color: #0f172a; font-size: 12.5px; line-height: 1.85; }
.owv-subq-source { margin: 10px 0 0; color: #94a3b8; font-size: 11.5px; line-height: 1.6; }

.owv-top { display: grid; grid-template-columns: 1.7fr 1fr; gap: 12px; align-items: start; }
.owv-tree, .owv-story, .owv-timeline, .owv-compare, .owv-dist { position: relative; overflow: hidden; padding: 16px; border: 1px solid #e6ebf2; border-radius: 16px; background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 30px -22px rgba(15, 23, 42, 0.5); }
.owv-tree::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, #3b82f6, #6366f1 48%, #22c55e); }
.owv-compare::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, #6366f1, #8b5cf6 50%, #ec4899); }
.owv-dist::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, #22c55e, #14b8a6 50%, #3b82f6); }
.owv-side { display: flex; flex-direction: column; gap: 10px; }
.owv-legend { display: flex; gap: 14px; padding: 5px 11px; border: 1px solid #e6ebf2; border-radius: 999px; background: #f8fafc; color: #64748b; font-size: 11.5px; white-space: nowrap; }
.owv-legend span { display: inline-flex; align-items: center; gap: 5px; }
.owv-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.owv-dot--decision { background: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16); }
.owv-dot--metric { background: #94a3b8; }

.owv-root { padding: 14px 16px; border: 1px solid #c7d2fe; border-radius: 12px; background: linear-gradient(135deg, #eef2ff, #f5f3ff 60%, #faf5ff); box-shadow: inset 0 1px 0 #fff; }
.owv-root-head { display: flex; align-items: baseline; gap: 10px; width: 100%; border: none; background: transparent; padding: 0; cursor: pointer; text-align: left; }
.owv-root-label { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 800; color: #3730a3; }
.owv-root-label::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.18); }
.owv-root-time { margin-left: auto; color: #64748b; font-size: 11.5px; }
.owv-root-desc { margin: 9px 0 4px; font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.65; }
.owv-root-note { margin: 0 0 10px; color: #94a3b8; font-size: 11.5px; line-height: 1.65; }
.owv-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.owv-chip { padding: 3px 10px; border: 1px solid #dbe4f0; border-radius: 999px; background: #fff; color: #4338ca; font-size: 11.5px; font-weight: 600; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
.owv-chip b { margin-left: 6px; color: #1e3a8a; font-variant-numeric: tabular-nums; }

.owv-branches { position: relative; display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; margin-top: 18px; padding-top: 16px; }
.owv-branches::before { content: ''; position: absolute; top: 0; left: 6%; right: 6%; height: 2px; border-radius: 999px; background: linear-gradient(90deg, rgba(199, 210, 254, 0), #c7d2fe 10%, #c7d2fe 90%, rgba(199, 210, 254, 0)); }
.owv-world { position: relative; padding: 12px 13px 12px 15px; border: 1px solid #e6ebf2; border-radius: 12px; background: #fff; transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease; }
.owv-world::before { content: ''; position: absolute; top: -16px; left: 24px; width: 2px; height: 18px; background: linear-gradient(180deg, #c7d2fe, rgba(199, 210, 254, 0.15)); }
.owv-world::after { content: ''; position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 999px 999px 0; background: linear-gradient(180deg, #f59e0b, #fbbf24); }
.owv-world.is-control::after { background: linear-gradient(180deg, #3b82f6, #60a5fa); }
.owv-world:hover { transform: translateY(-2px); border-color: #c7d2fe; box-shadow: 0 16px 30px -20px rgba(15, 23, 42, 0.55); }
.owv-world-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.owv-world-id { padding: 2px 8px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-size: 10.5px; font-weight: 800; letter-spacing: 0.02em; }
.owv-world-time { color: #94a3b8; font-size: 11px; }
.owv-world-name { margin: 8px 0 4px; font-size: 13.5px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
.owv-world-desc { margin: 0 0 7px; color: #64748b; font-size: 11.5px; line-height: 1.65; }
.owv-world-meta { margin: 0 0 9px; color: #94a3b8; font-size: 11px; }
.owv-world-meta b { color: #475569; }
.owv-world-btn { padding: 4px 11px; border: 1px solid #cbd5e1; border-radius: 999px; background: #fff; color: #2563eb; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: border-color 0.15s, background 0.15s, box-shadow 0.15s; }
.owv-world-btn:hover { border-color: #93c5fd; background: #eff6ff; box-shadow: 0 4px 12px -6px rgba(37, 99, 235, 0.5); }
.owv-next { margin-top: 10px; padding: 10px 12px; border: 1px dashed #c7d2fe; border-radius: 10px; background: linear-gradient(180deg, #f8faff, #f5f7ff); }
.owv-next-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.owv-next-label { color: #64748b; font-size: 11px; font-weight: 700; }
.owv-next-time { color: #94a3b8; font-size: 11px; }
.owv-next-title { margin: 6px 0 4px; font-size: 12.5px; font-weight: 700; color: #0f172a; }
.owv-next-desc { margin: 0 0 8px; color: #64748b; font-size: 11.5px; line-height: 1.6; }
.owv-metrics { display: flex; flex-wrap: wrap; gap: 5px; margin: 9px 0 0; padding: 0; list-style: none; color: #475569; font-size: 11.5px; line-height: 1.7; }
.owv-metrics li { padding: 2px 9px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-weight: 600; }
.owv-tree-hint { margin: 14px 0 0; padding-top: 10px; border-top: 1px dashed #eef2f7; color: #94a3b8; font-size: 11.5px; line-height: 1.7; }
.owv-tree-hint--demo { margin-top: 4px; color: #b45309; }
.owv-link { margin-left: 6px; color: #2563eb; font-weight: 600; text-decoration: none; }
.owv-link:hover { text-decoration: underline; }

.owv-phases { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
.owv-phase { display: flex; gap: 10px; padding: 10px 11px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.owv-phase > div { flex: 1; min-width: 0; }
.owv-phase:hover { transform: translateX(2px); box-shadow: 0 8px 18px -14px rgba(15, 23, 42, 0.45); }
.owv-phase--accumulate { background: #eff6ff; border-color: #bfdbfe; }
.owv-phase--bottleneck { background: #fffbeb; border-color: #fde68a; }
.owv-phase--amplify { background: #fef2f2; border-color: #fecaca; }
.owv-phase--recover { background: #f0fdf4; border-color: #bbf7d0; }
.owv-phase-index { flex: 0 0 auto; width: 24px; height: 24px; border-radius: 50%; background: #fff; color: #475569; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12); }
.owv-phase--accumulate .owv-phase-index { color: #1d4ed8; }
.owv-phase--bottleneck .owv-phase-index { color: #b45309; }
.owv-phase--amplify .owv-phase-index { color: #b91c1c; }
.owv-phase--recover .owv-phase-index { color: #15803d; }
.owv-phase-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12.5px; font-weight: 800; color: #0f172a; }
.owv-phase-range { margin-left: auto; padding: 1px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.9); color: #475569; font-size: 10px; font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; }
.owv-phase-desc { margin: 3px 0 0; color: #64748b; font-size: 11.5px; line-height: 1.6; }
.owv-phase-data { margin: 5px 0 0; padding: 4px 9px; border-radius: 7px; background: rgba(255, 255, 255, 0.86); color: #334155; font-size: 11px; font-weight: 700; line-height: 1.6; font-variant-numeric: tabular-nums; }

.owv-track { position: relative; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; padding-top: 16px; }
.owv-track-line { position: absolute; top: 6px; left: 4%; right: 4%; height: 4px; border-radius: 999px; background: linear-gradient(90deg, #3b82f6, #f59e0b, #ef4444, #22c55e); opacity: 0.5; box-shadow: 0 0 12px rgba(59, 130, 246, 0.35); }
.owv-point { position: relative; }
.owv-point-dot { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); width: 22px; height: 22px; border-radius: 50%; background: #2563eb; color: #fff; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; border: 2px solid #fff; box-shadow: 0 3px 8px -2px rgba(37, 99, 235, 0.55); }
.owv-point--warn .owv-point-dot { background: #f59e0b; }
.owv-point--idle .owv-point-dot { background: #94a3b8; }
.owv-point--danger .owv-point-dot { background: #ef4444; }
.owv-point--ok .owv-point-dot { background: #22c55e; }
.owv-point-card { margin-top: 12px; padding: 9px 11px; border: 1px solid #e6ebf2; border-radius: 10px; background: #fff; transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
.owv-point-card:hover { transform: translateY(-2px); border-color: #c7d2fe; box-shadow: 0 14px 26px -20px rgba(15, 23, 42, 0.6); }
.owv-point-time { margin: 0; color: #94a3b8; font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em; }
.owv-point-title { margin: 3px 0 0; font-size: 12.5px; font-weight: 800; color: #0f172a; }
.owv-point-detail { margin: 3px 0 0; color: #64748b; font-size: 11px; line-height: 1.55; }

.owv-pill { flex: 0 0 auto; padding: 5px 12px; border: 1px solid #bfdbfe; border-radius: 999px; background: linear-gradient(180deg, #eff6ff, #dbeafe); color: #1d4ed8; font-size: 11.5px; font-weight: 700; }
.owv-revalidate { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid #dbeafe; border-radius: 12px; background: linear-gradient(120deg, #f8fbff, #f5f9ff); margin-bottom: 14px; flex-wrap: wrap; }
.owv-revalidate-title { margin: 0; font-size: 12.5px; font-weight: 800; color: #0f172a; }
.owv-revalidate-desc { margin: 3px 0 0; color: #94a3b8; font-size: 11.5px; }
.owv-revalidate-select { flex: 1; min-width: 220px; margin-left: auto; }
.owv-dist-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; color: #475569; font-size: 11.5px; }
.owv-dist-legend span { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid #e6ebf2; border-radius: 999px; background: #f8fafc; }
.owv-swatch { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
.owv-empty { margin: 6px 0; padding: 16px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #fafbfc; color: #94a3b8; font-size: 12.5px; text-align: center; }
.owv-dist-row { display: grid; grid-template-columns: 150px 1fr 120px; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 10px; transition: background 0.15s ease; }
.owv-dist-row:hover { background: #f8fafc; }
.owv-dist-label b { display: block; font-size: 12.5px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
.owv-dist-label span { display: block; color: #94a3b8; font-size: 11px; }
.owv-dist-bar { display: flex; height: 28px; border-radius: 8px; overflow: hidden; background: #f1f5f9; box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.10); }
.owv-dist-seg { display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 0.02em; transition: width 0.35s ease; box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.4); }
.owv-dist-pending { display: inline-flex; align-items: center; padding: 0 10px; color: #94a3b8; font-size: 11.5px; }
.owv-dist-verdict { text-align: right; color: #334155; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
.owv-dist-foot { margin: 12px 0 0; padding-top: 10px; border-top: 1px dashed #eef2f7; color: #94a3b8; font-size: 11.5px; line-height: 1.75; }
.owv-dist-demo { margin: 8px 0 0; padding: 8px 12px; border: 1px solid #fde68a; border-radius: 8px; background: #fffbeb; color: #b45309; font-size: 11.5px; line-height: 1.6; }

.owv-lag { margin-top: 16px; padding: 14px; border: 1px solid #e6ebf2; border-radius: 12px; background: linear-gradient(180deg, #f8fafc, #fbfdff); }
.owv-lag-title { margin: 0; font-size: 13px; font-weight: 800; letter-spacing: -0.01em; }
.owv-lag-sub { margin: 3px 0 10px; color: #94a3b8; font-size: 11.5px; }
.owv-lag-row { display: grid; grid-template-columns: 130px 1fr 110px; align-items: center; gap: 10px; padding: 4px 0; }
.owv-lag-name { font-size: 12px; color: #334155; font-weight: 700; }
.owv-lag-track { height: 9px; border-radius: 999px; background: #e2e8f0; overflow: hidden; box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.12); }
.owv-lag-track i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #60a5fa, #2563eb); box-shadow: 0 0 10px rgba(37, 99, 235, 0.45); }
.owv-lag-value { text-align: right; color: #1d4ed8; font-size: 12px; font-weight: 800; }
.owv-lag-note { margin: 10px 0 0; color: #64748b; font-size: 11.5px; line-height: 1.7; }

.owv-conclusions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
.owv-conclusion { position: relative; padding: 12px 14px 12px 16px; border-radius: 12px; border: 1px solid #e6ebf2; background: #fff; overflow: hidden; }
.owv-conclusion::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.owv-conclusion p { margin: 7px 0 0; font-size: 12px; color: #334155; line-height: 1.75; }
.owv-conclusion-tag { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 800; }
.owv-conclusion--chance { border-color: #fde68a; background: linear-gradient(120deg, #fffdf5, #fffbeb); }
.owv-conclusion--chance::before { background: linear-gradient(180deg, #f59e0b, #fbbf24); }
.owv-conclusion--chance .owv-conclusion-tag { background: #fef3c7; color: #92400e; }
.owv-conclusion--certain { border-color: #fecaca; background: linear-gradient(120deg, #fff7f7, #fef2f2); }
.owv-conclusion--certain::before { background: linear-gradient(180deg, #ef4444, #f87171); }
.owv-conclusion--certain .owv-conclusion-tag { background: #fee2e2; color: #b91c1c; }

.owv-root-head:focus-visible, .owv-toggle:focus-visible, .owv-world-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; border-radius: 8px; }

@media (prefers-reduced-motion: reduce) {
  .owv-world, .owv-phase, .owv-point-card, .owv-dist-seg { transition: none; }
  .owv-world:hover, .owv-phase:hover, .owv-point-card:hover { transform: none; }
}

@media (max-width: 1200px) {
  .owv-top { grid-template-columns: 1fr; }
  .owv-dist-row { grid-template-columns: 120px 1fr; }
  .owv-dist-verdict { grid-column: 2; text-align: left; }
  .owv-conclusions { grid-template-columns: 1fr; }
}
</style>
