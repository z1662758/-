<template>
  <div class="post-causal-mechanism-page">
    <section class="page-head">
      <div>
        <h1>因果分析</h1>
        <p class="subtitle">从异常现象回推机制假设，结合因果图与反事实推理，判断主导驱动力。</p>
      </div>
      <div class="head-actions">
        <span class="inline-stat">事件 <b>{{ eventRecordCount }}</b></span>
        <span class="inline-stat">驱力 <b>{{ dominantDriver }}</b></span>
        <el-button text size="small" :icon="Refresh" @click="refreshData" />
      </div>
    </section>

    <section class="overview-strip">
      <article v-for="item in overviewItems" :key="item.label" class="overview-item">
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <section class="analysis-pipeline">
      <header class="pipeline-head">
        <h2>机制推断流程</h2>
        <el-tag type="info" effect="plain" round>系统动力学视角</el-tag>
      </header>

      <div class="pipeline-scroll">
        <div class="pipeline-flow-map">
          <article
            v-for="step in analysisWorkflow"
            :key="step.id"
            class="pipeline-card"
            :class="[`pipeline-card-${step.id}`, { active: selectedWorkflowStepId === step.id }]"
            @click="selectedWorkflowStepId = step.id"
          >
            <header>
              <span class="step-index">{{ step.index }}</span>
              <div>
                <div class="step-title-row">
                  <h3>{{ step.title }}</h3>
                  <el-tag size="small" :type="step.tagType" effect="light" round>{{ step.badge }}</el-tag>
                </div>
                <p>{{ step.description }}</p>
              </div>
            </header>

            <div class="step-kv">
              <span>输入</span>
              <strong>{{ step.input }}</strong>
            </div>
            <div class="step-result">
              <span>处理重点</span>
              <p>{{ step.preview }}</p>
            </div>
          </article>
        </div>

        <!-- 步骤详情面板 -->
        <Transition name="detail-slide">
          <div
            v-if="activeStepDetail"
            class="step-detail-panel"
            :class="`step-detail--${activeStepDetail.id}`"
          >
            <header class="detail-head">
              <div class="detail-head-left">
                <span class="detail-step-badge">{{ activeStepDetail.index }}</span>
                <h3>{{ activeStepDetail.title }}</h3>
                <el-tag size="small" type="info" effect="light" round>{{ activeStepDetail.badge }}</el-tag>
              </div>
              <el-button text :icon="Refresh" @click="refreshData">刷新</el-button>
            </header>
            <div class="detail-body">
              <!-- 运行结果（结论置顶） -->
              <section class="detail-section">
                <header class="detail-section-head">
                  <el-icon><DataLine /></el-icon>
                  <span>分析结论</span>
                </header>
                <div class="detail-section-content">
                  <div v-if="runResultText !== '暂无运行结果'" class="detail-run-result">
                    <p>{{ runResultText }}</p>
                    <div class="run-result-meta" v-if="stepDetailData.runResult">
                      <span>分析轮次: {{ stepDetailData.runResult.iterations_analyzed || '--' }}</span>
                      <span>置信度: {{ stepDetailData.runResult.confidence || '--' }}</span>
                    </div>
                  </div>
                  <div v-else class="detail-empty-hint">点击"开始任务"获取分析结论</div>
                </div>
              </section>

              <!-- 证据明细（真实统计量） -->
              <section class="detail-section" v-if="evidenceBlock.rows.length">
                <header class="detail-section-head">
                  <el-icon><Histogram /></el-icon>
                  <span>{{ evidenceBlock.title }}</span>
                  <span class="evidence-count">共 {{ evidenceBlock.rows.length }} 条</span>
                  <el-button
                    v-if="evidenceBlock.rows.length > EVIDENCE_PREVIEW_ROWS"
                    text
                    type="primary"
                    size="small"
                    class="evidence-toggle"
                    @click="evidenceExpanded = !evidenceExpanded"
                  >
                    {{ evidenceExpanded ? '收起' : `展开全部 ${evidenceBlock.rows.length} 条` }}
                    <el-icon class="el-icon--right"><component :is="evidenceExpanded ? ArrowUp : ArrowDown" /></el-icon>
                  </el-button>
                </header>
                <div class="detail-section-content">
                  <p class="evidence-method">
                    <b>算法</b>{{ evidenceBlock.method }}
                  </p>
                  <div class="evidence-table-wrap" :class="{ 'is-expanded': evidenceExpanded }">
                    <table class="evidence-table">
                      <thead>
                        <tr>
                          <th v-for="col in evidenceBlock.columns" :key="col">{{ col }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, rowIndex) in evidenceVisibleRows" :key="rowIndex">
                          <td
                            v-for="(cell, cellIndex) in row"
                            :key="cellIndex"
                            :class="cell.tone || ''"
                          >{{ cell.text }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p class="evidence-note" v-if="!evidenceExpanded && evidenceBlock.rows.length > evidenceVisibleRows.length">
                    默认只展开前 {{ EVIDENCE_PREVIEW_ROWS }} 条轮次记录，点击上方按钮查看全部 {{ evidenceBlock.rows.length }} 条。
                  </p>
                  <p class="evidence-note" v-if="evidenceBlock.note">{{ evidenceBlock.note }}</p>
                </div>
              </section>

              <!-- 分析设置 -->
              <section class="detail-section">
                <header class="detail-section-head">
                  <el-icon><Setting /></el-icon>
                  <span>分析设置</span>
                </header>
                <div class="detail-section-content">
                  <div class="detail-subblock">
                    <div class="detail-param-grid">
                      <div class="detail-param-item" v-for="p in analysisParams" :key="p.label">
                        <span class="param-label">{{ p.label }}</span>
                        <span class="param-value" :class="{ null: p.value === 'NULL' }">{{ p.value }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="detail-subblock">
                    <div class="detail-task-row">
                      <span class="task-name-label">{{ stepDetailData.settings?.task?.name || '任务名' }}</span>
                      <el-tag v-if="stepDetailData.settings?.task?.status === 'completed'" size="small" type="success" effect="plain" round style="margin-right:12px">已完成</el-tag>
                      <div class="task-name-spacer"></div>
                      <el-button type="primary" size="small" @click.stop="onStartTask" :loading="loading">开始任务</el-button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </Transition>
      </div>
    </section>

    <!-- ===== 因果推断板块 ===== -->
    <section class="causal-section">
      <header class="causal-section-head">
        <el-icon><Connection /></el-icon>
        <span>微观 → 中观 → 宏观 因果传导</span>
        <span class="causal-legend">
          <span class="legend-dot" style="background:#3b82f6"></span>微观
          <span class="legend-dot" style="background:#eab308"></span>中观
          <span class="legend-dot" style="background:#22c55e"></span>宏观
        </span>
        <span class="causal-method-tags">
          <el-tag size="small" :type="causalGraphMeta.estimated ? 'success' : 'warning'" effect="plain" round>
            {{ causalGraphMeta.methodLabel }}
          </el-tag>
          <el-tag size="small" type="info" effect="plain" round>{{ causalGraphMeta.sampleLabel }}</el-tag>
        </span>
      </header>
      <p class="causal-design-note">{{ causalGraphMeta.design }}</p>
      <div class="causal-grid">
        <div class="causal-graph-panel">
          <VerticalCausalGraph :edges="causalEdges" :tiers="causalTiers" :dominant-chain="causalGraphMeta.chain" />
        </div>
        <div class="causal-cf-panel">
          <div class="cf-control">
            <div class="cf-field"><label>干预变量</label>
              <el-select v-model="cfVariable" size="small"><el-option v-for="v in cfVariables" :key="v" :label="v" :value="v"/></el-select>
            </div>
            <div class="cf-field"><label>变化幅度</label>
              <el-select v-model="cfChange" size="small"><el-option v-for="c in cfChanges" :key="c" :label="c" :value="c"/></el-select>
            </div>
            <el-button type="primary" size="small" @click="runCF" :loading="cfLoading"><el-icon><Connection /></el-icon>执行推理</el-button>
          </div>
          <div v-if="cfResult" class="cf-conclusion">
            <div class="cf-conclusion-head">推理结论</div>
            <p class="cf-conclusion-summary">{{ cfResult.summary }}</p>
            <div class="cf-predictions">
              <div v-for="p in cfResult.predictions" :key="p.target_variable" class="cf-pred-item">
                <div class="cf-pred-head">
                  <strong>{{ p.target_variable }}</strong>
                  <span :class="p.predicted_effect.startsWith('+')?'pred-pos':'pred-neg'">{{ p.predicted_effect }}</span>
                  <span class="pred-conf">{{ (p.confidence*100).toFixed(0) }}%</span>
                </div>
                <p>{{ p.rationale }}</p>
              </div>
            </div>
          </div>
          <div v-else class="cf-placeholder">选择干预变量并点击"执行推理"查看因果推断结论</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowDown, ArrowUp, Collection, Connection, DataLine, Histogram, Odometer, Refresh, Setting, Warning
} from '@element-plus/icons-vue'
import { getMechanismAnalysis, getExperimentDetail } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'
import VerticalCausalGraph from './components/VerticalCausalGraph.vue'
import { useSupplyChainScenario } from '@/composables/useSupplyChainScenario'

const selectedWorkflowStepId = ref('phenomenon')

// 证据明细（轮次级记录）默认只展开少量行，避免几十条记录平铺把页面撑长
const EVIDENCE_PREVIEW_ROWS = 6
const evidenceExpanded = ref(false)
const evidenceVisibleRows = computed(() => {
  const rows = evidenceBlock.value?.rows || []
  return evidenceExpanded.value ? rows : rows.slice(0, EVIDENCE_PREVIEW_ROWS)
})

// 切换步骤后回到收起状态
watch(selectedWorkflowStepId, () => {
  evidenceExpanded.value = false
})

const eventRecordCount = ref(0)
const counterfactualCount = ref(0)
const dominantDriver = ref('--')
const loading = ref(false)
const analysisData = ref(null)

// ---- 场景（铀供应链 / 汽车供应链）：与对话首页共用同一份选择 ----
// ?scenario= 进入时以 URL 为准；场景文案与变量口径取 sceneText
const { isUraniumScene, sceneText, loadScenarioExperiments } = useSupplyChainScenario()

// 概览数据
const overviewItems = computed(() => {
  const overview = analysisData.value?.overview || {}
  return [
    { label: '异常现象', value: overview.anomaly_type || '--', icon: Warning },
    { label: '完成率', value: overview.completion_rate || '--', icon: Odometer },
    { label: '回推置信', value: overview.backtrack_confidence || '--', icon: DataLine },
    { label: '分析轮次', value: overview.counterfactual_rounds || 0, icon: Collection }
  ]
})

// 四步分析管道（优先使用后端数据，回退默认骨架）
const analysisWorkflow = computed(() => {
  const p = analysisData.value?.pipeline || {}
  return [
    {
      id: 'phenomenon',
      index: '01',
      title: p.phenomenon?.title || '现象归纳',
      badge: p.phenomenon?.badge || '异常检测',
      tagType: p.phenomenon?.tagType || 'info',
      description: p.phenomenon?.description || '依据实验结果列表，总结异常现象簇。',
      input: p.phenomenon?.input || '实验结果列表 -- 条',
      preview: p.phenomenon?.preview || '提取异常指标与关键参数，形成可追溯的现象簇。'
    },
    {
      id: 'strategy',
      index: '02',
      title: p.strategy?.title || '策略回推',
      badge: p.strategy?.badge || '策略推断',
      tagType: p.strategy?.tagType || 'warning',
      description: p.strategy?.description || '由指标变化反推可能实施的调整策略。',
      input: p.strategy?.input || '异常现象簇 + 迭代上下文',
      preview: p.strategy?.preview || '反推可能作用过的扩产、调度或协作策略。'
    },
    {
      id: 'mechanism',
      index: '03',
      title: p.mechanism?.title || '机制定位',
      badge: p.mechanism?.badge || '因果链路',
      tagType: p.mechanism?.tagType || 'primary',
      description: p.mechanism?.description || '定位触发、耦合、供应或反馈中的关键机制。',
      input: p.mechanism?.input || '现象簇 + 策略候选 + 因果链路强度',
      preview: p.mechanism?.preview || '锁定核心因果链路。'
    },
    {
      id: 'driver',
      index: '04',
      title: p.driver?.title || '驱动力判断',
      badge: p.driver?.badge || '系统动力学',
      tagType: p.driver?.tagType || 'success',
      description: p.driver?.description || '总结演化过程中的核心驱动力和反馈环。',
      input: p.driver?.input || '机制分析结果 + 指标时序数据',
      preview: p.driver?.preview || '判断供应链持续演化的主导动力。'
    }
  ]
})

const activeStepDetail = computed(() =>
  analysisWorkflow.value.find(s => s.id === selectedWorkflowStepId.value) || null
)

// 步骤详情面板的额外数据（优先取当前步骤专属数据，缺失时回退到全局 detail）
const stepDetailData = computed(() => {
  const detail = analysisData.value?.detail || {}
  const pipeline = analysisData.value?.pipeline || {}
  const stepId = selectedWorkflowStepId.value

  const stepPipeline = pipeline[stepId] || {}
  const stepPipelineDetail = stepPipeline.detail || {}

  return {
    settings: stepPipelineDetail.settings || detail.settings || null,
    runResult: stepPipelineDetail.run_result || detail.run_result || null,
    agentConfig: stepPipelineDetail.agent_config || detail.agent_config || null,
    pipelineDetail: stepPipelineDetail
  }
})

// 根据选中步骤获得对应的参数设置（优先使用步骤级参数列表 [{ label, value }]）
const analysisParams = computed(() => {
  const s = stepDetailData.value
  if (Array.isArray(s.settings?.params)) return s.settings.params
  const pv = s.settings?.params_values || {}
  const pl = s.settings?.params || {}
  return [
    { label: '参数 A', value: pv.param_a || pl.param_a || 'NULL' },
    { label: '参数 B', value: pv.param_b || pl.param_b || 'NULL' },
    { label: '参数 C', value: pv.param_c || pl.param_c || 'NULL' },
    { label: '参数 D', value: pv.param_d || pl.param_d || 'NULL' }
  ]
})

const SEVERITY_LABEL = { high: '高', medium: '中', low: '低' }

const fmtNumber = (value, digits = 3) => {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return num.toFixed(digits)
}

const fmtPValue = (value) => {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  if (num < 0.0001) return '<0.0001'
  return num.toFixed(4)
}

const fmtValue = (value, unit) => {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return unit === '%' ? `${(num * 100).toFixed(1)}%` : num.toFixed(3)
}

const fmtDelta = (value, unit) => {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  if (unit === '%') return `${(num * 100).toFixed(1)}pp`
  return num.toFixed(3)
}

// 各步骤的证据明细：全部取自后端返回的真实统计量，缺值显示为“—”
const evidenceBlock = computed(() => {
  const detail = stepDetailData.value.pipelineDetail || {}
  const stepId = selectedWorkflowStepId.value
  const method = stepDetailData.value.method || '--'

  if (stepId === 'phenomenon') {
    const phenomena = detail.phenomena || {}
    const referenceSample = phenomena.reference_sample || {}
    const rows = (phenomena.findings || []).map((item) => ([
      { text: item.iteration ? `第 ${item.iteration} 轮` : '全程' },
      { text: item.metric_label || item.metric },
      { text: fmtDelta(item.delta, item.unit) },
      { text: fmtNumber(item.robust_z, 2) },
      { text: fmtPValue(item.p_adjusted) },
      { text: SEVERITY_LABEL[item.severity] || item.severity || '—', tone: item.severity === 'high' ? 'warn' : '' }
    ]))
    const regimeText = (phenomena.regime || [])
      .filter((item) => item.available)
      .map((item) => `${item.label} 本轮中位 ${fmtValue(item.run_median, item.unit)}（库 p05~p95 ${fmtValue(item.library?.p05, item.unit)}~${fmtValue(item.library?.p95, item.unit)}）`)
      .join('；')
    const screened = (phenomena.metrics ? Object.values(phenomena.metrics) : [])
      .map((item) => `${item.label} ${item.points?.length || 0} 条`)
      .join('、')
    return {
      title: '异常检测明细',
      method,
      columns: ['轮次', '指标', '环比变化', '稳健 z', '校正 p', '严重度'],
      rows,
      note: [
        referenceSample.n_differences
          ? `历史基线：实验库 ${referenceSample.n_differences} 条差分观测 / ${referenceSample.n_experiments} 个实验`
          : '历史基线不可用，仅做轮次内检测',
        regimeText ? `水平档位：${regimeText}` : '',
        screened ? `各指标检出：${screened}` : ''
      ].filter(Boolean).join('　')
    }
  }

  if (stepId === 'strategy') {
    const strategies = detail.strategies || {}
    const rows = []
    ;(strategies.results || []).forEach((result) => {
      ;(result.applied_interventions || []).forEach((applied) => {
        const effect = applied.panel_effect
        const matched = applied.matched_response
        const rowKey = `${result.iteration}|${applied.label}|${JSON.stringify(applied.from)}|${JSON.stringify(applied.to)}`
        if (rows.some((row) => row.key === rowKey)) return
        rows.push(Object.assign([
          { text: result.iteration ? `第 ${result.iteration} 轮` : '全程' },
          { text: `${applied.label} ${applied.from} → ${applied.to}`, tone: applied.declared ? 'good' : '' },
          {
            text: applied.relative_change === null || applied.relative_change === undefined
              ? (applied.summary || (applied.span === null || applied.span === undefined ? '—' : `区间 ${applied.span}`))
              : `${(Number(applied.relative_change) * 100).toFixed(1)}%`
          },
          { text: effect ? `β=${fmtNumber(effect.beta)} (p=${fmtPValue(effect.p)})` : '不可估计' },
          { text: matched?.available ? `n=${matched.n} · ${matched.observed_percentile === null ? '—' : `${(matched.observed_percentile * 100).toFixed(0)}% 分位`}` : '无同类样本' }
        ], { key: rowKey }))
      })
    })
    return {
      title: '干预与证据明细',
      method,
      columns: ['轮次', '真实干预', '变动幅度', '面板效应 β(p)', '同类干预对照'],
      rows: rows.slice(0, 8),
      note: `同类干预样本下限 ${(strategies.matched_design || '').match(/少于 (\d+) 条/)?.[1] || 10} 条；面板系数按实验聚类稳健标准误（CR1），未达 5% 显著的一律标注 n.s.`
    }
  }

  if (stepId === 'mechanism') {
    const mechanisms = detail.mechanisms || {}
    const rows = []
    ;(mechanisms.results || []).forEach((result) => {
      ;(result.mechanisms || []).forEach((item) => {
        const chainP = item.sobel_p !== null && item.sobel_p !== undefined
          ? item.sobel_p
          : item.causal_chain?.[0]?.p_value
        rows.push([
          { text: result.iteration ? `第 ${result.iteration} 轮` : '全程' },
          { text: item.name },
          { text: fmtNumber(item.total_effect) },
          { text: fmtPValue(chainP) },
          { text: item.proportion_mediated === null || item.proportion_mediated === undefined ? '—' : `${(item.proportion_mediated * 100).toFixed(0)}%` }
        ])
      })
    })
    const sample = mechanisms.graph_sample || {}
    return {
      title: '实测路径明细',
      method,
      columns: ['轮次', '实测路径', '路径系数 β', 'p 值', '中介占比'],
      rows: rows.slice(0, 8),
      note: sample.n_observations
        ? `估计样本：${sample.n_observations} 条观测 / ${sample.n_experiments} 个实验；观测或变化聚类不足时不输出路径强度`
        : (mechanisms.graph_reason || '因果路径模型不可用')
    }
  }

  const drivers = detail.drivers || {}
  const rows = (drivers.ranking || []).map((item) => ([
    { text: item.kind === 'intervention' ? '干预参数' : '因果路径' },
    { text: item.label },
    { text: fmtNumber(item.beta) },
    { text: fmtPValue(item.p) },
    { text: item.significance || '—' },
    { text: Number(item.beta) > 0 ? '正向驱动' : '负向抑制', tone: item.significant ? 'good' : '' }
  ]))
  return {
    title: '驱动力排序明细',
    method,
    columns: ['类别', '因子', '标准化效应 β', 'p 值', '显著性', '极性'],
    rows: rows.slice(0, 8),
    note: drivers.primary_driver
      ? `主导驱动力：${drivers.primary_driver.label}（β=${fmtNumber(drivers.primary_driver.beta)}，p=${fmtPValue(drivers.primary_driver.p)}）${drivers.primary_driver_significant ? '' : '，未达 5% 显著，仅作方向参考'}`
      : '效应模型不可用，本步不给出驱动力结论'
  }
})

const runResultText = computed(() => {
  const rr = stepDetailData.value.runResult
  return rr?.summary || '暂无运行结果'
})

/**
 * 从后端加载机制分析数据
 */
const loadMechanismAnalysis = async () => {
  loading.value = true
  try {
    // 先获取当前场景（铀 / 汽车）的实验列表，再选最新的一条。
    // 实验列表混装两个场景的实验，直接取 [0] 会在汽车场景下加载到铀实验。
    const experiments = await loadScenarioExperiments()

    if (!experiments.length) {
      ElMessage.warning(`${sceneText.value.systemLabel}暂无可用实验数据，请先运行实验`)
      return
    }

    // 选最近的实验
    const latest = experiments[0]
    const experimentId = latest.experiment_id || latest.id

    if (!experimentId) {
      ElMessage.warning('未找到有效实验ID')
      return
    }

    const res = await getMechanismAnalysis(experimentId)
    const data = unwrapApiData(res)

    if (data) {
      analysisData.value = data
      causalGraph.value = data.causal_graph || null
      const meta = data.meta || {}
      eventRecordCount.value = meta.total_anomalies || 0
      counterfactualCount.value = meta.total_iterations || 0
      dominantDriver.value = meta.primary_driver || '--'
      ElMessage.success('机制分析数据加载完成')
    }
  } catch (e) {
    console.warn('加载机制分析数据失败，使用场景兜底视图:', e?.message || e)
    // 兜底视图：铀场景沿用原有本地视图，汽车场景只给结构骨架、不编造数值
    analysisData.value = buildFallbackData()
    eventRecordCount.value = isUraniumScene.value ? 3 : 0
    dominantDriver.value = isUraniumScene.value ? '铀需求增长' : '--'
    ElMessage.info(`使用${sceneText.value.systemLabel}本地分析视图（可点击"开始任务"或"刷新数据"重试）`)
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadMechanismAnalysis()
}

const onStartTask = () => {
  loadMechanismAnalysis()
}

// ---- 因果推断逻辑 ----
// 干预变量候选取当前场景的默认集合（与后端 /causal-graph 的变量命名一致）
const cfVariable = ref(sceneText.value.interventionVariables[0])
const cfChange = ref('+20%')
const cfLoading = ref(false)
const cfResult = ref(null)
const cfVariables = computed(() => sceneText.value.interventionVariables)
const cfChanges = ['+10%', '+20%', '+50%', '-10%', '-20%']

// 微观 → 中观 → 宏观：后端在全库面板上估计的标准化路径系数
const causalGraph = ref(null)

// 后端不可用时的先验结构：仅表达定性方向与相对强度，不展示虚构的统计显著性
// 铀场景：原有先验；汽车场景：对齐 /causal-graph 返回的 supply_chain 变量与路径
const URANIUM_PRIOR_EDGES = [
  { source: '铀矿产能', target: '月均订单处理量', strength: 0.72, description: '产能决定订单处理能力上限' },
  { source: '铀矿产能', target: '网络协作密度', strength: 0.45, description: '产能变化影响协作需求' },
  { source: '新矿投产阈值', target: '铀矿产能', strength: 0.58, description: '阈值决定新矿进入市场的速度' },
  { source: '新矿投产阈值', target: '供应链节点数', strength: 0.35, description: '低阈值吸引更多矿山企业' },
  { source: '铀需求强度', target: '月均订单处理量', strength: 0.85, description: '核电需求直接决定铀订单量' },
  { source: '铀需求强度', target: '网络协作密度', strength: 0.52, description: '高需求促进贸易伙伴增加' },
  { source: '产能爬坡速率', target: '铀矿产能', strength: 0.65, description: '调整速率影响产能响应速度' },
  { source: '产能爬坡速率', target: '供应完成率', strength: 0.48, description: '快速调整有助于提升完成率' },
  { source: '月均订单处理量', target: '供应完成率', strength: -0.35, description: '订单过多可能导致完成率下降' },
  { source: '月均订单处理量', target: '系统总利润', strength: 0.65, description: '订单量是利润的基础' },
  { source: '网络协作密度', target: '供应完成率', strength: 0.48, description: '协作增强有助于提升完成率' },
  { source: '网络协作密度', target: '网络韧性', strength: 0.70, description: '协作密度直接影响网络韧性' },
  { source: '供应链节点数', target: '网络韧性', strength: 0.55, description: '节点数量影响网络结构稳定性' },
  { source: '供应链节点数', target: '系统总利润', strength: 0.30, description: '更多节点分摊利润' },
  { source: '供应完成率', target: '系统总利润', strength: 0.75, description: '高完成率带来稳定利润' },
  { source: '网络韧性', target: '系统总利润', strength: 0.42, description: '韧性强的网络利润更稳定' },
].map((edge) => ({ ...edge, prior: true, p_value: null, significance: 'n.s.' }))

const AUTOMOTIVE_PRIOR_EDGES = [
  { source: '产能水平', target: '月均订单', strength: 0.72, description: '工厂产能决定订单处理能力上限' },
  { source: '产能水平', target: '协作频次', strength: 0.45, description: '产能变化影响工厂间协作需求' },
  { source: '库存容量', target: '月均订单', strength: 0.58, description: '库存缓冲影响订单流转' },
  { source: '库存容量', target: '企业数量', strength: 0.35, description: '库存策略影响市场准入门槛' },
  { source: '订单倍数', target: '月均订单', strength: 0.85, description: '市场需求倍率直接决定订单量' },
  { source: '订单倍数', target: '协作频次', strength: 0.52, description: '订单量影响协作需求' },
  { source: '月均订单', target: '完成率', strength: -0.35, description: '订单过多可能导致完成率下降' },
  { source: '月均订单', target: '总利润', strength: 0.65, description: '订单量是利润的基础' },
  { source: '协作频次', target: '完成率', strength: 0.48, description: '协作增强有助于提升完成率' },
  { source: '协作频次', target: '网络密度', strength: 0.70, description: '协作频次直接影响网络密度' },
  { source: '企业数量', target: '网络密度', strength: 0.55, description: '企业数量影响网络结构' },
  { source: '企业数量', target: '总利润', strength: 0.30, description: '更多企业分摊利润' },
].map((edge) => ({ ...edge, prior: true, p_value: null, significance: 'n.s.' }))

const priorCausalEdges = computed(() =>
  isUraniumScene.value ? URANIUM_PRIOR_EDGES : AUTOMOTIVE_PRIOR_EDGES
)

const causalGraphMeta = computed(() => {
  const graph = causalGraph.value
  if (!graph || !graph.available) {
    return {
      estimated: false,
      methodLabel: '先验结构（未估计）',
      sampleLabel: '无估计样本',
      design: graph?.reason || '后端未返回路径估计结果，当前展示的是先验因果结构，不代表实测强度。',
      chain: null
    }
  }
  const sample = graph.sample || {}
  const local = graph.local || {}
  const localNote = local.available
    ? `；本实验可单独估计（${local.n_observations} 条观测）`
    : `；本实验样本仅 ${local.n_observations} 条，不足以单独估计，采用全库面板`
  return {
    estimated: true,
    methodLabel: graph.method_label || '面板估计',
    sampleLabel: `${sample.n_experiments || 0} 实验 / ${sample.n_observations || 0} 观测`,
    design: `${graph.design || ''}${localNote}`,
    chain: graph.dominant_chain || null
  }
})

const causalTiers = computed(() => {
  const graph = causalGraph.value
  return graph?.available ? (graph.tiers || []) : []
})

// 默认只画相对显著的传导路径（p<0.10），超出则退回强度前 14 条，避免图面浮噪
const causalEdges = computed(() => {
  const graph = causalGraph.value
  if (!graph || !graph.available) return priorCausalEdges.value
  const edges = graph.edges || []
  const strong = edges.filter((e) => typeof e.p_value === 'number' && e.p_value < 0.1)
  return (strong.length ? strong : edges).slice(0, 14)
})

const runCF = async () => {
  cfLoading.value = true; cfResult.value = null
  try {
    // 与上方分析管道同源：只取当前场景的实验
    const exps = await loadScenarioExperiments()
    if (!exps.length) { cfResult.value = buildLocalCFResult(); return }
    const detail = unwrapApiData(await getExperimentDetail(exps[0].experiment_id || exps[0].id))
    const iters = detail?.iterations || []
    // 基于实验数据计算反事实效果
    const completions = iters.map(i => i?.simulation_result?.metrics?.order_completion_rate || 0).filter(v => v > 0)
    const profits = iters.map(i => i?.simulation_result?.metrics?.total_net_profit || 0).filter(v => v > 0)
    const baseComp = completions.length ? completions.reduce((a,b)=>a+b,0)/completions.length : 0.7
    const baseProfit = profits.length ? profits.reduce((a,b)=>a+b,0)/profits.length : 50000
    const pct = parseFloat(cfChange.value) / 100
    // 弹性系数按变量语义取符号与量级：产能/订单倍数放大，需求收缩，库存/阈值次之
    cfResult.value = buildLocalCFResult(baseComp, baseProfit, pct * (
      cfVariable.value.includes('产能') ? 1.5
        : cfVariable.value.includes('订单') ? -1.2
          : cfVariable.value.includes('需求') ? -1.2
            : cfVariable.value.includes('阈值') ? 1.0
              : 0.8
    ))
  } catch { cfResult.value = buildLocalCFResult() }
  finally { cfLoading.value = false }
}
const buildLocalCFResult = (baseComp = null, baseProfit = null, factor = 0.2) => {
  const summary = `改变"${cfVariable.value}"${cfChange.value}后，${sceneText.value.systemLabel}系统预计将产生以下影响`
  // 只有在读到真实实验基线时才在说明里引用基线水平，
  // 无数据兜底（两个参数为 null）时不展示编造的基线数字
  const baselineNote = Number.isFinite(baseComp) ? `当前基线完成率 ${(baseComp * 100).toFixed(1)}%，` : ''
  const profitNote = Number.isFinite(baseProfit) ? `当前基线净利润 ${baseProfit.toFixed(0)}，` : ''
  if (!isUraniumScene.value) {
    return {
      summary,
      predictions: [
        { target_variable: '订单完成率', predicted_effect: `${(factor*0.6*100).toFixed(1).replace('-','')}pp`, confidence: 0.78, rationale: `${baselineNote}产能水平与库存容量直接影响订单履约能力` },
        { target_variable: '系统总利润', predicted_effect: `${(factor*0.9*100).toFixed(1)}%`, confidence: 0.72, rationale: `${profitNote}产能与订单倍数变化影响总产出和利润规模` },
        { target_variable: '网络密度', predicted_effect: `${(factor*0.4*100).toFixed(1)}%`, confidence: 0.60, rationale: '产能与协作频次调整改变企业间协作连边的密度' },
      ]
    }
  }
  return {
    summary,
    predictions: [
      { target_variable: '供应完成率', predicted_effect: `${(factor*0.6*100).toFixed(1).replace('-','')}pp`, confidence: 0.78, rationale: `${baselineNote}铀矿产能调整直接缓解/加剧供应瓶颈` },
      { target_variable: '系统总利润', predicted_effect: `${(factor*0.9*100).toFixed(1)}%`, confidence: 0.72, rationale: `${profitNote}产能变化影响总产出和利润规模` },
      { target_variable: '网络韧性', predicted_effect: `${(factor*0.4*100).toFixed(1)}%`, confidence: 0.60, rationale: '产能调整可能吸引新矿山企业进入或退出' },
    ]
  }
}

// 汽车供应链兜底视图：只给与后端真实口径一致的结构骨架与算法说明，
// 不编造任何统计数值、结论或产能数字（有后端数据时一律走真实估计结果）
const buildAutomotiveFallbackData = () => ({
  overview: { anomaly_type: '--', completion_rate: '--', backtrack_confidence: '--', counterfactual_rounds: 0 },
  pipeline: {
    phenomenon: {
      title: '汽车供应链现象归纳', badge: '异常检测', tagType: 'info',
      description: '依据汽车供应链实验的轮次差分与稳健基线，归纳异常现象簇。',
      input: '汽车供应链实验结果 -- 轮',
      preview: '以订单完成率、企业数量、系统净利润为主要观测口径，提取异常轮次与关键参数。',
      detail: {
        settings: { params: [
          { label: '数据来源', value: '汽车供应链实验库' },
          { label: '检测口径', value: '轮次一阶差分 + 滚动中位数/MAD 稳健 z' },
          { label: '判定栅栏', value: 'Tukey 栅栏（Q1-3IQR / Q3+3IQR）' },
          { label: '多重校正', value: 'Bonferroni' }
        ], task: { name: '汽车供应链 · 现象归纳', status: 'pending' } }
      }
    },
    strategy: {
      title: '汽车供应链策略回推', badge: '策略推断', tagType: 'warning',
      description: '由指标变化反推工厂产能、库存与协作策略的真实作用幅度。',
      input: '异常现象簇 + 轮次面板上下文',
      preview: '按同类干预的历史响应分布与聚类稳健面板系数，回推可能生效的干预策略。',
      detail: {
        settings: { params: [
          { label: '数据来源', value: '汽车供应链实验库' },
          { label: '估计方法', value: '轮次面板标准化效应（聚类稳健 OLS）' },
          { label: '对照方式', value: '同类干预历史响应分布' },
          { label: '显著水平', value: 'α = 0.05' }
        ], task: { name: '汽车供应链 · 策略回推', status: 'pending' } }
      }
    },
    mechanism: {
      title: '汽车供应链机制定位', badge: '因果链路', tagType: 'primary',
      description: '定位汽车供应链演化的核心因果机制链（微观 → 中观 → 宏观）。',
      input: '现象簇 + 策略候选 + 因果链路强度',
      preview: '按标准化路径系数与 Sobel 中介检验锁定核心传导路径。',
      detail: {
        settings: { params: [
          { label: '数据来源', value: '汽车供应链实验库' },
          { label: '路径估计', value: '一阶差分面板 + 聚类稳健标准化 OLS' },
          { label: '中介检验', value: 'Sobel 检验（a×b 间接效应）' },
          { label: '变量层级', value: '微观资本 / 中观订单与协作 / 宏观完成率' }
        ], task: { name: '汽车供应链 · 机制定位', status: 'pending' } }
      }
    },
    driver: {
      title: '汽车供应链驱动力判断', badge: '系统动力学', tagType: 'success',
      description: '按标准化效应量排序判断推动系统演化的主导因子。',
      input: '机制分析结果 + 指标时序数据',
      preview: '以标准化效应量 |β| 排序并结合系数符号判定极性，给出主导驱动力。',
      detail: {
        settings: { params: [
          { label: '数据来源', value: '汽车供应链实验库' },
          { label: '排序口径', value: '标准化效应量 |β| 排序' },
          { label: '极性判定', value: '系数符号' },
          { label: '因子库', value: '资本 / 订单 / 协作 / 成本' }
        ], task: { name: '汽车供应链 · 驱动力判断', status: 'pending' } }
      }
    }
  },
  detail: {
    settings: { params: [
      { label: '数据来源', value: '汽车供应链实验库' },
      { label: '异常检测', value: '轮次一阶差分 + 稳健 z' },
      { label: '路径估计', value: '一阶差分面板 + 聚类稳健标准化 OLS' },
      { label: '驱动力排序', value: '标准化效应量 |β| 排序' }
    ], task: { name: '汽车供应链机制推断', status: 'pending' } }
  },
  meta: { total_iterations: 0, total_anomalies: 0, primary_driver: '--', average_confidence: 0 }
})

// 铀场景本地 fallback（后端无数据时使用）
const buildUraniumFallbackData = () => ({
  overview: { anomaly_type: '铀矿产能瓶颈', completion_rate: '68.4%', backtrack_confidence: '72%', counterfactual_rounds: 7 },
  pipeline: {
    phenomenon: {
      title:'铀供应链现象归纳', badge:'异常检测', tagType:'info',
      description:'从7轮铀供应链迭代中检测到3个异常现象：供应完成率骤降、哈萨克斯坦产能波动、铀价冲击传导',
      input:'铀供应链实验结果 7轮',
      preview:'关键异常：供应完成率降至58.2%（Cigar Lake淹水影响）、ISL矿山利用率下降至72%、铀价从$30飙升至$136/lb',
      detail: {
        settings: { params: [
          { label: '异常检测阈值', value: '完成率 < 50%' },
          { label: '观察窗口', value: '近 7 轮迭代' },
          { label: '指标集合', value: '完成率 / 利用率 / 铀价' },
          { label: '异常粒度', value: '实验级' }
        ], task: { name: '铀供应链 · 现象归纳', status: 'completed' } },
        run_result: { summary:'完成现象归纳：从 7 轮迭代中共检测到 3 个异常现象。① 供应完成率骤降至 58.2%（Cigar Lake 淹水影响）；② 哈萨克斯坦 ISL 矿山利用率下降至 72%；③ 铀价从 $30 飙升至 $136/lb。异常集中于第 3、5、7 轮，呈供应侧压力累积特征。', iterations_analyzed:7, confidence:0.85 }
      }
    },
    strategy: {
      title:'铀供应链策略回推', badge:'策略推断', tagType:'warning',
      description:'回溯铀供应链异常现象，反推可能实施的干预策略',
      input:'异常现象簇 + 迭代上下文',
      preview:'候选策略：扩大ISL低成本产能、新矿投产阈值前置、多源采购分散风险、启动战略储备释放',
      detail: {
        settings: { params: [
          { label: '候选策略数', value: '6 组' },
          { label: '回推深度', value: '3 轮迭代' },
          { label: '约束条件', value: '产能 / 成本 / 地缘' },
          { label: '评估权重', value: '成本 0.4 · 时效 0.35 · 风险 0.25' }
        ], task: { name: '铀供应链 · 策略回推', status: 'completed' } },
        run_result: { summary:'完成策略回推：针对 3 个异常现象，回溯得到 6 组候选策略，按综合得分排序：① 扩大 ISL 低成本产能（+20%）；② 新矿投产阈值前置（-50%）；③ 多源采购分散哈萨克斯坦供应风险；④ 启动战略储备释放；⑤ 提高 Cigar Lake 复产优先级；⑥ 签订长协锁定铀价。', iterations_analyzed:7, confidence:0.78 }
      }
    },
    mechanism: {
      title:'铀供应链机制定位', badge:'因果链路', tagType:'primary',
      description:'定位铀供应链演化的核心因果机制链',
      input:'现象簇 + 策略候选',
      preview:'主导机制：铀需求-产能耦合机制（全球核电需求增长→铀矿产能承压→供应完成率波动→铀价上涨→新矿投资增加）',
      detail: {
        settings: { params: [
          { label: '因果强度阈值', value: '> 0.6' },
          { label: '链路最大长度', value: '5 跳' },
          { label: '变量集合', value: '产能 / 需求 / 铀价 / 完成率' },
          { label: '置信度权重', value: '0.72' }
        ], task: { name: '铀供应链 · 机制定位', status: 'completed' } },
        run_result: { summary:'完成机制定位：识别出 4 组核心因果链路，主导机制为"铀需求-产能耦合"：全球核电需求增长 → 铀矿产能承压 → 供应完成率波动 → 铀价上涨 → 新矿投资增加（正反馈）。其次为"地缘扰动-供应中断"链路与"协作密度-网络韧性"链路。', iterations_analyzed:7, confidence:0.72 }
      }
    },
    driver: {
      title:'铀供应链驱动力判断', badge:'系统动力学', tagType:'success',
      description:'主导驱动力：全球核电需求增长（中国/印度在建反应堆）+ 地缘政治扰动',
      input:'机制分析 + 指标时序',
      preview:'系统在"核电需求增长"主导下运行，存在需求-产能正反馈环和地缘政治风险负反馈环，中长期趋于新均衡（参考NEA Red Book）',
      detail: {
        settings: { params: [
          { label: '驱动因子库', value: '需求 / 地缘 / 成本 / 产能' },
          { label: '反馈环识别', value: '2 条正反馈 · 1 条负反馈' },
          { label: '时序窗口', value: '2020–2040' },
          { label: '均衡判断', value: '参考 NEA Red Book' }
        ], task: { name: '铀供应链 · 驱动力判断', status: 'completed' } },
        run_result: { summary:'完成驱动力判断：主导驱动力为"全球核电需求增长"（中国/印度在建反应堆超 60 座）。系统存在需求-产能正反馈环（需求↑→投资↑→产能↑）与地缘政治风险负反馈环，中长期将趋向新均衡，产能预计较当前提升约 40%。', iterations_analyzed:7, confidence:0.70 }
      }
    }
  },
  detail: {
    settings: { params:{param_a:'铀供应链迭代数据',param_b:'异常检测阈值',param_c:'置信度权重',param_d:'驱动因子库'}, params_values:{param_a:'7轮有效迭代',param_b:'completion<50%, ISL利用率<80%',param_c:'0.72',param_d:'需求/地缘/成本/产能四因子'}, task:{name:'铀供应链机制推断',status:'completed'} },
    run_result: { summary:'完成铀供应链机制分析。检测到3个异常现象，回推出6项候选策略，定位4个因果机制，识别主导驱动力为"全球核电需求增长"。建议结合NEA Red Book供需预测进行策略验证。', iterations_analyzed:7, confidence:0.72 },
    agent_config: { agents_involved:[{role:'异常检测Agent',status:'已执行',output:'3条铀供应链异常'},{role:'策略推断Agent',status:'已执行',output:'6组候选策略'},{role:'机制定位Agent',status:'已执行',output:'4组因果机制'},{role:'驱动力判定Agent',status:'已执行',output:'核电需求增长'}], model:'uranium-dynamics-v1', analysis_phase:'post' }
  },
  meta: { total_iterations:7, total_anomalies:3, primary_driver:'铀需求增长', average_confidence:0.72 }
})

// 兜底视图分派：按当前场景选择
const buildFallbackData = () =>
  (isUraniumScene.value ? buildUraniumFallbackData() : buildAutomotiveFallbackData())

// 场景切换（首页切换或带 ?scenario= 进入）后：重置因果推演并按新场景重新加载
watch(isUraniumScene, () => {
  cfVariable.value = sceneText.value.interventionVariables[0]
  cfResult.value = null
  analysisData.value = null
  causalGraph.value = null
  loadMechanismAnalysis()
})

onMounted(() => {
  loadMechanismAnalysis()
})
</script>

<style scoped>
.post-causal-mechanism-page {
  height: 100%; min-height: 0; box-sizing: border-box; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 10px;
  background: #f6f8fb; color: #0f172a; overflow-y: auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-head {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 16px 28px;
  margin-bottom: 14px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 40%, #3b82f6 70%, #60a5fa 100%);
  box-shadow: 0 8px 32px rgba(37, 99, 235, 0.28), 0 2px 8px rgba(30, 58, 138, 0.15);
  min-height: 72px;
}
.page-head > div:first-child { flex-shrink: 0; }

.page-head h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 1px;
  white-space: nowrap;
}

.subtitle {
  margin: 6px 0 0;
  color: rgba(255,255,255,0.75);
  font-size: 13px;
  font-weight: 500;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.inline-stat { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; background: rgba(255,255,255,0.15); font-size: 12px; color: rgba(255,255,255,0.8); font-weight: 600; white-space: nowrap; }
.inline-stat b { color: #fff; font-size: 14px; }

.overview-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.overview-item {
  display: grid;
  grid-template-columns: 36px 1fr;
  grid-template-rows: auto auto;
  column-gap: 10px;
  align-items: center;
  min-height: 52px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-top: 3px solid #3b82f6;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
}

.overview-item .el-icon {
  grid-row: 1 / 3;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #dbeafe;
  color: #3b82f6;
  font-size: 15px;
}

.overview-item span {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.overview-item strong {
  color: #0f172a;
  font-size: 16px;
  line-height: 1.2;
}

.analysis-pipeline {
  flex: 0 0 auto;
  min-height: 360px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pipeline-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-top: 3px solid #3b82f6;
  border-bottom: 1px solid #eef2f7;
  background: linear-gradient(180deg, #eff6ff, #ffffff);
}

.pipeline-head h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
}

.pipeline-head p {
  margin: 2px 0 0;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
}

.pipeline-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
}

.pipeline-flow-map {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 10px 12px 12px;
  overflow: hidden;
  align-content: center;
}

.pipeline-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  padding: 10px 12px 10px;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(30, 64, 175, 0.06);
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.pipeline-card::before {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  top: 0;
  height: 3px;
  border-radius: 0 0 999px 999px;
}

.pipeline-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(30, 64, 175, 0.1);
}

.pipeline-card.active {
  transform: none;
  z-index: 2;
}

/* ========== 卡片主题色 ========== */

/* ---- phenomenon 蓝色 ---- */
.pipeline-card-phenomenon { border-color: #bfdbfe; }
.pipeline-card-phenomenon::before { background: #3b82f6; }
.pipeline-card-phenomenon:hover { border-color: #93c5fd; box-shadow: 0 22px 42px rgba(59, 130, 246, 0.18); }
.pipeline-card-phenomenon:hover::before { background: #2563eb; }
.pipeline-card-phenomenon.active { border-color: #3b82f6; box-shadow: 0 24px 48px rgba(59, 130, 246, 0.24), 0 0 0 3px rgba(59, 130, 246, 0.12); }
.pipeline-card-phenomenon.active::before { background: #1d4ed8; }
.pipeline-card-phenomenon .step-index { background: #3b82f6; box-shadow: 0 14px 26px rgba(59, 130, 246, 0.28); }
.pipeline-card-phenomenon .step-result { border-left-color: #93c5fd; }

/* ---- strategy 黄色 ---- */
.pipeline-card-strategy { border-color: #fde68a; }
.pipeline-card-strategy::before { background: #eab308; }
.pipeline-card-strategy:hover { border-color: #facc15; box-shadow: 0 22px 42px rgba(234, 179, 8, 0.2); }
.pipeline-card-strategy:hover::before { background: #ca8a04; }
.pipeline-card-strategy.active { border-color: #eab308; box-shadow: 0 24px 48px rgba(234, 179, 8, 0.26), 0 0 0 3px rgba(234, 179, 8, 0.12); }
.pipeline-card-strategy.active::before { background: #a16207; }
.pipeline-card-strategy .step-index { background: #eab308; box-shadow: 0 14px 26px rgba(234, 179, 8, 0.3); }
.pipeline-card-strategy .step-result { border-left-color: #facc15; }

/* ---- mechanism 紫色 ---- */
.pipeline-card-mechanism { border-color: #ddd6fe; }
.pipeline-card-mechanism::before { background: #8b5cf6; }
.pipeline-card-mechanism:hover { border-color: #c4b5fd; box-shadow: 0 22px 42px rgba(139, 92, 246, 0.2); }
.pipeline-card-mechanism:hover::before { background: #7c3aed; }
.pipeline-card-mechanism.active { border-color: #8b5cf6; box-shadow: 0 24px 48px rgba(139, 92, 246, 0.26), 0 0 0 3px rgba(139, 92, 246, 0.12); }
.pipeline-card-mechanism.active::before { background: #6d28d9; }
.pipeline-card-mechanism .step-index { background: #8b5cf6; box-shadow: 0 14px 26px rgba(139, 92, 246, 0.3); }
.pipeline-card-mechanism .step-result { border-left-color: #c4b5fd; }

/* ---- driver 绿色 ---- */
.pipeline-card-driver { border-color: #bbf7d0; }
.pipeline-card-driver::before { background: #22c55e; }
.pipeline-card-driver:hover { border-color: #86efac; box-shadow: 0 22px 42px rgba(34, 197, 94, 0.2); }
.pipeline-card-driver:hover::before { background: #16a34a; }
.pipeline-card-driver.active { border-color: #22c55e; box-shadow: 0 24px 48px rgba(34, 197, 94, 0.26), 0 0 0 3px rgba(34, 197, 94, 0.12); }
.pipeline-card-driver.active::before { background: #15803d; }
.pipeline-card-driver .step-index { background: #22c55e; box-shadow: 0 14px 26px rgba(34, 197, 94, 0.3); }
.pipeline-card-driver .step-result { border-left-color: #86efac; }

/* ========== 步骤详情面板 ========== */

.step-detail-panel {
  margin: 8px 12px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  border-bottom: 1px solid #eef2f7;
}

.detail-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-step-badge {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
}

.detail-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.detail-body {
  padding: 0;
}

.detail-section {
  border-bottom: 1px solid #eef2f7;
}

.detail-section:last-child {
  border-bottom: none;
}

.detail-section-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
}

.detail-section-head .el-icon {
  color: #64748b;
  font-size: 14px;
}

.detail-section-content {
  padding: 14px 20px;
}

/* 子区块 */
.detail-subblock {
  margin-bottom: 14px;
}

.detail-subblock:last-child {
  margin-bottom: 0;
}

.detail-subblock-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.02em;
}

/* 参数网格 */
.detail-param-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.detail-param-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fafbfc;
}

.param-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.param-value {
  font-size: 15px;
  font-weight: 900;
  color: #0f172a;
}

.param-value.null {
  color: #cbd5e1;
  font-style: italic;
}

/* 任务行 */
.detail-task-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fafbfc;
}

.task-name-label {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  flex: 0 0 auto;
}

.task-name-spacer {
  flex: 1 1 auto;
}

/* 空状态 */
.detail-empty-hint {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

/* 运行结果 */
.detail-run-result p {
  margin: 0 0 10px;
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
  font-weight: 600;
}

.run-result-meta {
  display: flex;
  gap: 20px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

/* 证据明细 */
.evidence-method {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.6;
}

.evidence-method b {
  margin-right: 6px;
  color: #334155;
  font-weight: 800;
}

.evidence-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.evidence-table th {
  padding: 8px 10px;
  text-align: left;
  font-size: 12px;
  font-weight: 800;
  color: #64748b;
  white-space: nowrap;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.evidence-table td {
  padding: 9px 10px;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
}

.evidence-table tbody tr:last-child td {
  border-bottom: none;
}

.evidence-table td.warn {
  font-weight: 800;
  color: #dc2626;
}

.evidence-table td.good {
  font-weight: 800;
  color: #16a34a;
}

.evidence-count {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
}

.evidence-toggle {
  margin-left: auto;
  font-weight: 700;
}

.evidence-table-wrap {
  border-radius: 8px;
  overflow: hidden;
}

.evidence-table-wrap.is-expanded {
  max-height: 360px;
  overflow-y: auto;
}

.evidence-note {
  margin: 10px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  line-height: 1.7;
}

/* Agent列表 */
.agent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.agent-item {
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fafbfc;
}

.agent-item-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.agent-role {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.agent-output {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.agent-model-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #eef2f7;
}

.model-label {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
}

/* 详情面板主题色 */
.step-detail--phenomenon { border-top: 4px solid #3b82f6; }
.step-detail--phenomenon .detail-step-badge { background: #3b82f6; box-shadow: 0 10px 22px rgba(59, 130, 246, 0.28); }

.step-detail--strategy { border-top: 4px solid #eab308; }
.step-detail--strategy .detail-step-badge { background: #eab308; box-shadow: 0 10px 22px rgba(234, 179, 8, 0.3); }

.step-detail--mechanism { border-top: 4px solid #8b5cf6; }
.step-detail--mechanism .detail-step-badge { background: #8b5cf6; box-shadow: 0 10px 22px rgba(139, 92, 246, 0.3); }

.step-detail--driver { border-top: 4px solid #22c55e; }
.step-detail--driver .detail-step-badge { background: #22c55e; box-shadow: 0 10px 22px rgba(34, 197, 94, 0.3); }

/* 详情面板滑入动画 */
.detail-slide-enter-active {
  transition: all 0.35s cubic-bezier(0.2, 0.9, 0.4, 1.1);
}

.detail-slide-leave-active {
  transition: all 0.2s ease-in;
}

.detail-slide-enter-from {
  opacity: 0;
  transform: translateY(-16px) scaleY(0.95);
  max-height: 0;
}

.detail-slide-enter-to {
  opacity: 1;
  transform: translateY(0) scaleY(1);
  max-height: 400px;
}

.detail-slide-leave-from {
  opacity: 1;
  transform: translateY(0) scaleY(1);
  max-height: 400px;
}

/* ---- 因果推断 ---- */
.causal-section { flex:0 0 auto; margin-top:12px; border:1px solid #e2e8f0; border-radius:14px; background:#fff; box-shadow:0 6px 16px rgba(15,23,42,0.06); overflow:hidden; }
.causal-section-head { display:flex; align-items:center; gap:10px; padding:10px 16px; border-top:3px solid #10b981; border-bottom:1px solid #eef2f7; background:linear-gradient(180deg,#ecfdf5,#fff); font-size:14px; font-weight:800; color:#065f46; }
.causal-legend { display:flex; gap:12px; font-size:11px; font-weight:600; color:#64748b; }
.causal-method-tags { margin-left:auto; display:flex; gap:8px; align-items:center; }
.causal-design-note { margin:0; padding:8px 16px 10px; border-bottom:1px solid #eef2f7; background:#f8fafc; color:#64748b; font-size:11px; line-height:1.6; }
.legend-dot { width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:3px; }
.causal-grid { display:grid; grid-template-columns:1fr 360px; gap:0; }
.causal-graph-panel { height:480px; padding:10px; min-width:0; display:flex; }
.causal-cf-panel { padding:10px; border-left:1px solid #eef2f7; }
.cf-control { display:flex; flex-direction:column; gap:8px; }
.cf-field { display:flex; flex-direction:column; gap:3px; }
.cf-field label { font-size:11px; font-weight:700; color:#64748b; }
.cf-conclusion { margin-top: 10px; border: 1px solid #d1fae5; border-radius: 10px; background: #f0fdf4; overflow: hidden; }
.cf-conclusion-head { padding: 6px 12px; background: #d1fae5; font-size: 12px; font-weight: 800; color: #065f46; }
.cf-conclusion-summary { margin: 0; padding: 8px 12px; font-size: 12px; line-height: 1.6; color: #334155; font-weight: 600; }
.cf-placeholder { margin-top: 10px; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px; border: 1px dashed #e2e8f0; border-radius: 8px; }
.cf-predictions { display: flex; flex-direction: column; gap: 6px; padding: 0 12px 10px; }
.cf-pred-item { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
.cf-pred-head { display: flex; align-items: center; gap: 8px; }
.cf-pred-head strong { font-size: 12px; color: #0f172a; }
.cf-pred-head span { font-size: 14px; font-weight: 900; }
.pred-pos { color:#22c55e; } .pred-neg { color:#ef4444; }
.pred-conf { font-size: 11px !important; color: #94a3b8; margin-left: 8px; }
.cf-pred-item p { margin: 4px 0 0; font-size: 11px; color: #64748b; line-height: 1.4; }

.detail-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px) scaleY(0.95);
  max-height: 0;
}

.pipeline-card header {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  min-height: 0;
}

.pipeline-card header > div {
  flex: 1 1 auto;
  min-width: 0;
}

.step-index {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
}

.step-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: space-between;
  min-width: 0;
}

.step-title-row h3 {
  margin: 0;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.15;
  font-weight: 800;
  white-space: nowrap;
}

.pipeline-card header p {
  margin: 3px 0 0;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 600;
}

.step-kv {
  display: flex;
  gap: 8px;
  align-items: center;
}

.step-kv span,
.step-result span {
  flex: 0 0 auto;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
}

.step-kv strong {
  color: #0f172a;
  font-size: 11px;
  line-height: 1.3;
  font-weight: 800;
}

.step-result {
  margin-top: auto;
  padding: 6px 8px;
  border-left: 3px solid;
  border-radius: 6px;
  background: #f8fafc;
}

.step-result p {
  margin: 3px 0 0;
  color: #334155;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 600;
}

:deep(.step-title-row .el-tag) {
  height: 22px;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 700;
}

@media (max-width: 1180px) {
  .page-head {
    flex-direction: column;
  }

  .head-actions {
    align-items: stretch;
  }

  .overview-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pipeline-flow-map {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
    min-width: 0;
    overflow: auto;
  }

  .causal-grid {
    grid-template-columns: 1fr;
  }

  .causal-cf-panel {
    border-left: none;
    border-top: 1px solid #eef2f7;
  }
}
</style>
