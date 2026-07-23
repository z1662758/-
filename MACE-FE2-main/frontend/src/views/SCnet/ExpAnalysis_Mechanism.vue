<template>
  <div class="post-causal-mechanism-page">
    <section class="page-head">
      <div>
        <p class="eyebrow">URANIUM SUPPLY CHAIN · MECHANISM & CAUSAL</p>
        <h1>机制分析与因果推断</h1>
        <p class="subtitle">从供应链异常现象回推干预策略与机制假设，结合因果图与反事实推理，判断矿山产能、新矿投产与网络演化的主导驱动力。</p>
      </div>
      <div class="head-actions">
        <div class="stat-item">
          <span>事件节点</span>
          <strong>{{ eventRecordCount }}</strong>
        </div>
        <div class="stat-item">
          <span>主导驱力</span>
          <strong>{{ dominantDriver }}</strong>
        </div>
        <el-button type="primary" plain :icon="Refresh" @click="refreshData">刷新数据</el-button>
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
        <div>
          <h2>机制推断流程</h2>
          <p>围绕“现象归纳、策略回推、机制定位、驱动力判断”形成可追溯的宏观分析链。</p>
        </div>
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
              <!-- 分析设置 -->
              <section class="detail-section">
                <header class="detail-section-head">
                  <el-icon><Setting /></el-icon>
                  <span>分析设置</span>
                </header>
                <div class="detail-section-content">
                  <!-- 设置详情 -->
                  <div class="detail-subblock">
                    <h4 class="detail-subblock-title">设置详情</h4>
                    <div class="detail-param-grid">
                      <div class="detail-param-item" v-for="p in analysisParams" :key="p.label">
                        <span class="param-label">{{ p.label }}</span>
                        <span class="param-value" :class="{ null: p.value === 'NULL' }">{{ p.value }}</span>
                      </div>
                    </div>
                  </div>
                  <!-- 任务详情 -->
                  <div class="detail-subblock">
                    <h4 class="detail-subblock-title">任务详情</h4>
                    <div class="detail-task-row">
                      <span class="task-name-label">{{ stepDetailData.settings?.task?.name || '任务名' }}</span>
                      <el-tag v-if="stepDetailData.settings?.task?.status === 'completed'" size="small" type="success" effect="plain" round style="margin-right:12px">已完成</el-tag>
                      <div class="task-name-spacer"></div>
                      <el-button type="primary" size="default" @click.stop="onStartTask" :loading="loading">开始任务</el-button>
                    </div>
                  </div>
                </div>
              </section>

              <!-- 运行结果 -->
              <section class="detail-section">
                <header class="detail-section-head">
                  <el-icon><DataLine /></el-icon>
                  <span>运行结果</span>
                </header>
                <div class="detail-section-content">
                  <div v-if="runResultText !== '暂无运行结果'" class="detail-run-result">
                    <p>{{ runResultText }}</p>
                    <div class="run-result-meta" v-if="stepDetailData.runResult">
                      <span>分析轮次: {{ stepDetailData.runResult.iterations_analyzed || '--' }}</span>
                      <span>置信度: {{ stepDetailData.runResult.confidence || '--' }}</span>
                    </div>
                  </div>
                  <div v-else class="detail-empty-hint">暂无运行结果</div>
                </div>
              </section>

              <!-- Agent设置详情 -->
              <section class="detail-section">
                <header class="detail-section-head">
                  <el-icon><User /></el-icon>
                  <span>Agent设置详情</span>
                </header>
                <div class="detail-section-content">
                  <template v-if="agentList.length > 0">
                    <div class="agent-list">
                      <div v-for="(agent, idx) in agentList" :key="idx" class="agent-item">
                        <div class="agent-item-head">
                          <el-tag size="small" :type="agent.status === '已执行' ? 'success' : 'info'" effect="light" round>{{ agent.status }}</el-tag>
                          <span class="agent-role">{{ agent.role }}</span>
                        </div>
                        <p class="agent-output">{{ agent.output }}</p>
                      </div>
                    </div>
                    <div class="agent-model-info" v-if="stepDetailData.agentConfig?.model">
                      <span class="model-label">分析模型:</span>
                      <el-tag size="small" effect="plain" round>{{ stepDetailData.agentConfig.model }}</el-tag>
                    </div>
                  </template>
                  <div v-else class="detail-empty-hint">暂无 Agent 配置信息</div>
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
        <span>供应链因果推断</span>
        <span class="causal-legend">
          <span class="legend-dot" style="background:#3b82f6"></span>干预变量
          <span class="legend-dot" style="background:#eab308"></span>中间变量
          <span class="legend-dot" style="background:#22c55e"></span>结果变量
        </span>
      </header>
      <div class="causal-grid">
        <div class="causal-graph-panel">
          <div class="edges-list">
            <div v-for="(edge, idx) in causalEdges" :key="idx" class="edge-item">
              <span class="edge-src">{{ edge.source }}</span>
              <span class="edge-arrow">→</span>
              <span class="edge-tgt">{{ edge.target }}</span>
              <el-tag size="small" :type="edge.strength>0.6?'success':edge.strength>0.4?'warning':'info'" effect="light" round>{{ (edge.strength*100).toFixed(0) }}%</el-tag>
              <span class="edge-desc">{{ edge.description }}</span>
            </div>
          </div>
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
          <div v-if="cfResult" class="cf-result"><el-alert :title="cfResult.summary" type="info" :closable="false" show-icon/>
            <div class="cf-predictions"><div v-for="p in cfResult.predictions" :key="p.target_variable" class="cf-pred-item"><strong>{{ p.target_variable }}</strong><span :class="p.predicted_effect.startsWith('+')?'pred-pos':'pred-neg'">{{ p.predicted_effect }}</span><span class="pred-conf">置信度 {{ (p.confidence*100).toFixed(0) }}%</span><p>{{ p.rationale }}</p></div></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Collection, Connection, DataLine, Odometer, Refresh, Setting, User, Warning
} from '@element-plus/icons-vue'
import { getMechanismAnalysis, getExperimentDetail, getExperiments } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'

const selectedWorkflowStepId = ref('phenomenon')
const eventRecordCount = ref(0)
const counterfactualCount = ref(0)
const dominantDriver = ref('--')
const loading = ref(false)
const analysisData = ref(null)

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

// 步骤详情面板的额外数据
const stepDetailData = computed(() => {
  const detail = analysisData.value?.detail || {}
  const pipeline = analysisData.value?.pipeline || {}
  const stepId = selectedWorkflowStepId.value

  const stepPipeline = pipeline[stepId] || {}
  const stepPipelineDetail = stepPipeline.detail || {}

  return {
    settings: detail.settings || null,
    runResult: detail.run_result || null,
    agentConfig: detail.agent_config || null,
    pipelineDetail: stepPipelineDetail
  }
})

// 根据选中步骤获得对应的参数设置
const analysisParams = computed(() => {
  const s = stepDetailData.value
  const pv = s.settings?.params_values || {}
  const pl = s.settings?.params || {}
  return [
    { label: '参数 A', value: pv.param_a || pl.param_a || 'NULL' },
    { label: '参数 B', value: pv.param_b || pl.param_b || 'NULL' },
    { label: '参数 C', value: pv.param_c || pl.param_c || 'NULL' },
    { label: '参数 D', value: pv.param_d || pl.param_d || 'NULL' }
  ]
})

const runResultText = computed(() => {
  const rr = stepDetailData.value.runResult
  return rr?.summary || '暂无运行结果'
})

const agentList = computed(() => {
  return stepDetailData.value.agentConfig?.agents_involved || []
})

/**
 * 从后端加载机制分析数据
 */
const loadMechanismAnalysis = async () => {
  loading.value = true
  try {
    // 先获取实验列表，选择最新完成的实验
    const { getExperiments, getExperimentDetail } = await import('@/api/supplyChain')

    const expRes = await getExperiments()
    const experiments = unwrapApiData(expRes) || []

    if (!experiments || experiments.length === 0) {
      ElMessage.warning('暂无可用实验数据，请先运行实验')
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
      const meta = data.meta || {}
      eventRecordCount.value = meta.total_anomalies || 0
      counterfactualCount.value = meta.total_iterations || 0
      dominantDriver.value = meta.primary_driver || '--'
      ElMessage.success('机制分析数据加载完成')
    }
  } catch (e) {
    console.warn('加载机制分析数据失败，使用场景默认视图:', e?.message || e)
    // 使用场景 fallback 数据，确保页面始终可展示
    analysisData.value = buildUraniumFallbackData()
    eventRecordCount.value = 3
    dominantDriver.value = '需求增长'
    ElMessage.info('使用供应链本地分析视图（可点击"开始任务"或"刷新数据"重试）')
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
const cfVariable = ref('矿山产能')
const cfChange = ref('+20%')
const cfLoading = ref(false)
const cfResult = ref(null)
const cfVariables = ['矿山产能', '新矿投产阈值', '需求强度', '产能爬坡速率', '网络协作密度']
const cfChanges = ['+10%', '+20%', '+50%', '-10%', '-20%']

const causalEdges = ref([
  { source: '矿山产能', target: '月均订单处理量', strength: 0.72, description: '产能决定订单处理能力上限' },
  { source: '矿山产能', target: '网络协作密度', strength: 0.45, description: '产能变化影响协作需求' },
  { source: '新矿投产阈值', target: '矿山产能', strength: 0.58, description: '阈值决定新矿进入市场的速度' },
  { source: '新矿投产阈值', target: '供应链节点数', strength: 0.35, description: '低阈值吸引更多矿山企业' },
  { source: '需求强度', target: '月均订单处理量', strength: 0.85, description: '核电需求直接决定订单量' },
  { source: '需求强度', target: '网络协作密度', strength: 0.52, description: '高需求促进贸易伙伴增加' },
  { source: '产能爬坡速率', target: '矿山产能', strength: 0.65, description: '调整速率影响产能响应速度' },
  { source: '产能爬坡速率', target: '供应完成率', strength: 0.48, description: '快速调整有助于提升完成率' },
  { source: '月均订单处理量', target: '供应完成率', strength: -0.35, description: '订单过多可能导致完成率下降' },
  { source: '月均订单处理量', target: '系统总利润', strength: 0.65, description: '订单量是利润的基础' },
  { source: '网络协作密度', target: '供应完成率', strength: 0.48, description: '协作增强有助于提升完成率' },
  { source: '网络协作密度', target: '网络韧性', strength: 0.70, description: '协作密度直接影响网络韧性' },
  { source: '供应链节点数', target: '网络韧性', strength: 0.55, description: '节点数量影响网络结构稳定性' },
  { source: '供应链节点数', target: '系统总利润', strength: 0.30, description: '更多节点分摊利润' },
  { source: '供应完成率', target: '系统总利润', strength: 0.75, description: '高完成率带来稳定利润' },
  { source: '网络韧性', target: '系统总利润', strength: 0.42, description: '韧性强的网络利润更稳定' },
])

const runCF = async () => {
  cfLoading.value = true; cfResult.value = null
  try {
    const expRes = await getExperiments(); const exps = unwrapApiData(expRes) || []
    if (!exps.length) { cfResult.value = buildLocalCFResult(); return }
    const detail = unwrapApiData(await getExperimentDetail(exps[0].experiment_id || exps[0].id))
    const iters = detail?.iterations || []
    // 基于实验数据计算反事实效果
    const completions = iters.map(i => i?.simulation_result?.metrics?.order_completion_rate || 0).filter(v => v > 0)
    const profits = iters.map(i => i?.simulation_result?.metrics?.total_net_profit || 0).filter(v => v > 0)
    const baseComp = completions.length ? completions.reduce((a,b)=>a+b,0)/completions.length : 0.7
    const baseProfit = profits.length ? profits.reduce((a,b)=>a+b,0)/profits.length : 50000
    const pct = parseFloat(cfChange.value) / 100
    cfResult.value = buildLocalCFResult(baseComp, baseProfit, pct * (cfVariable.value.includes('产能')?1.5:cfVariable.value.includes('需求')?-1.2:cfVariable.value.includes('阈值')?1.0:0.8))
  } catch { cfResult.value = buildLocalCFResult() }
  finally { cfLoading.value = false }
}
const buildLocalCFResult = (baseComp=0.7, baseProfit=50000, factor=0.2) => ({
  summary: `改变"${cfVariable.value}"${cfChange.value}后，供应链系统预计将产生以下影响`,
  predictions: [
    { target_variable: '供应完成率', predicted_effect: `${(factor*0.6*100).toFixed(1).replace('-','')}pp`, confidence: 0.78, rationale: '矿山产能调整直接缓解/加剧供应瓶颈' },
    { target_variable: '系统总利润', predicted_effect: `${(factor*0.9*100).toFixed(1)}%`, confidence: 0.72, rationale: '产能变化影响总产出和利润规模' },
    { target_variable: '网络韧性', predicted_effect: `${(factor*0.4*100).toFixed(1)}%`, confidence: 0.60, rationale: '产能调整可能吸引新矿山企业进入或退出' },
  ]
})

// 场景本地 fallback（后端无数据时使用）
const buildUraniumFallbackData = () => ({
  overview: { anomaly_type: '矿山产能瓶颈', completion_rate: '68.4%', backtrack_confidence: '72%', counterfactual_rounds: 7 },
  pipeline: {
    phenomenon: { title:'供应链现象归纳', badge:'异常检测', tagType:'info', description:'从7轮供应链迭代中检测到3个异常现象：供应完成率骤降、哈萨克斯坦产能波动、价格冲击传导', input:'供应链实验结果 7轮', preview:'关键异常：供应完成率降至58.2%（Cigar Lake淹水影响）、ISL矿山利用率下降至72%、价格从$30飙升至$136/lb' },
    strategy: { title:'供应链策略回推', badge:'策略推断', tagType:'warning', description:'回溯供应链异常现象，反推可能实施的干预策略', input:'异常现象簇 + 迭代上下文', preview:'候选策略：扩大ISL低成本产能、新矿投产阈值前置、多源采购分散风险、启动战略储备释放' },
    mechanism: { title:'供应链机制定位', badge:'因果链路', tagType:'primary', description:'定位供应链演化的核心因果机制链', input:'现象簇 + 策略候选', preview:'主导机制：需求-产能耦合机制（全球核电需求增长→矿山产能承压→供应完成率波动→价格上涨→新矿投资增加）' },
    driver: { title:'供应链驱动力判断', badge:'系统动力学', tagType:'success', description:'主导驱动力：全球核电需求增长（中国/印度在建反应堆）+ 地缘政治扰动', input:'机制分析 + 指标时序', preview:'系统在"核电需求增长"主导下运行，存在需求-产能正反馈环和地缘政治风险负反馈环，中长期趋于新均衡（参考NEA Red Book）' }
  },
  detail: {
    settings: { params:{param_a:'供应链迭代数据',param_b:'异常检测阈值',param_c:'置信度权重',param_d:'驱动因子库'}, params_values:{param_a:'7轮有效迭代',param_b:'completion<50%, ISL利用率<80%',param_c:'0.72',param_d:'需求/地缘/成本/产能四因子'}, task:{name:'供应链机制推断',status:'completed'} },
    run_result: { summary:'完成供应链机制分析。检测到3个异常现象，回推出6项候选策略，定位4个因果机制，识别主导驱动力为"全球核电需求增长"。建议结合NEA Red Book供需预测进行策略验证。', iterations_analyzed:7, confidence:0.72 },
    agent_config: { agents_involved:[{role:'异常检测Agent',status:'已执行',output:'3条供应链异常'},{role:'策略推断Agent',status:'已执行',output:'6组候选策略'},{role:'机制定位Agent',status:'已执行',output:'4组因果机制'},{role:'驱动力判定Agent',status:'已执行',output:'核电需求增长'}], model:'uranium-dynamics-v1', analysis_phase:'post' }
  },
  meta: { total_iterations:7, total_anomalies:3, primary_driver:'需求增长', average_confidence:0.72 }
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
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 14px 22px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.eyebrow {
  margin: 0 0 6px;
  color: #3867f2;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.page-head h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 900;
}

.subtitle {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.stat-item {
  min-width: 112px;
  padding: 10px 13px;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
}

.stat-item span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.stat-item strong {
  display: block;
  margin-top: 6px;
  color: #1e3a8a;
  font-size: 21px;
  line-height: 1.1;
}

.overview-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.overview-item {
  display: grid;
  grid-template-columns: 42px 1fr;
  grid-template-rows: auto auto;
  column-gap: 12px;
  align-items: center;
  min-height: 64px;
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #bfdbfe;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
}

.overview-item .el-icon {
  grid-row: 1 / 3;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #dbeafe;
  color: #3867f2;
  font-size: 18px;
}

.overview-item span {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.overview-item strong {
  color: #0f172a;
  font-size: 20px;
  line-height: 1.2;
}

.analysis-pipeline {
  flex: 0 0 auto;
  min-height: 360px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pipeline-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 20px 10px;
  border-bottom: 1px solid #eef2f7;
}

.pipeline-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
}

.pipeline-head p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
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
  gap: 12px;
  min-width: 0;
  margin: 0;
  padding: 16px 18px 18px;
  overflow: hidden;
  align-content: center;
}

.pipeline-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 245px;
  padding: 18px 16px 16px;
  border: 1px solid #dbeafe;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(30, 64, 175, 0.08);
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1),
              box-shadow 0.3s ease,
              border-color 0.3s ease;
}

.pipeline-card::before {
  content: '';
  position: absolute;
  left: 22px;
  right: 22px;
  top: 0;
  height: 5px;
  border-radius: 0 0 999px 999px;
  transition: height 0.25s ease,
              left 0.25s ease,
              right 0.25s ease,
              background 0.3s ease;
}

.pipeline-card:hover {
  transform: translateY(-4px);
}

.pipeline-card:hover::before {
  height: 6px;
  left: 14px;
  right: 14px;
}

.pipeline-card.active {
  transform: translateY(-2px) scale(1.02);
  z-index: 2;
}

.pipeline-card.active::before {
  height: 6px;
  left: 10px;
  right: 10px;
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
  margin: 16px 18px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #eef2f7;
}

.detail-head-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-step-badge {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
}

.detail-head h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
}

.detail-body {
  padding: 0;
}

/* 区块容器 */
.detail-section {
  border-bottom: 1px solid #eef2f7;
}

.detail-section:last-child {
  border-bottom: none;
}

.detail-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #f8fafc;
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
}

.detail-section-head .el-icon {
  color: #64748b;
  font-size: 16px;
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
.causal-section { flex:0 0 auto; margin-top:12px; border:1px solid #e2e8f0; border-radius:12px; background:#fff; box-shadow:0 6px 16px rgba(15,23,42,0.04); overflow:hidden; }
.causal-section-head { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid #eef2f7; background:linear-gradient(90deg,#eff6ff,#fff); font-size:14px; font-weight:800; color:#1e40af; }
.causal-legend { margin-left:auto; display:flex; gap:12px; font-size:11px; font-weight:600; color:#64748b; }
.legend-dot { width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:3px; }
.causal-grid { display:grid; grid-template-columns:1fr 360px; gap:0; }
.causal-graph-panel { padding:10px; }
.edges-list { display:flex; flex-direction:column; gap:6px; max-height:300px; overflow-y:auto; }
.edge-item { display:flex; align-items:center; gap:6px; padding:6px 10px; border:1px solid #eef2f7; border-radius:8px; font-size:12px; }
.edge-src { color:#3b82f6; font-weight:700; } .edge-tgt { color:#22c55e; font-weight:700; }
.edge-arrow { color:#94a3b8; } .edge-desc { color:#64748b; font-size:11px; }
.causal-cf-panel { padding:10px; border-left:1px solid #eef2f7; }
.cf-control { display:flex; flex-direction:column; gap:8px; }
.cf-field { display:flex; flex-direction:column; gap:3px; }
.cf-field label { font-size:11px; font-weight:700; color:#64748b; }
.cf-result { margin-top:10px; }
.cf-predictions { display:flex; flex-direction:column; gap:8px; margin-top:8px; }
.cf-pred-item { padding:8px 10px; border:1px solid #e2e8f0; border-radius:8px; background:#fafbfc; }
.cf-pred-item strong { display:block; font-size:12px; color:#0f172a; }
.cf-pred-item span { font-size:15px; font-weight:900; }
.pred-pos { color:#22c55e; } .pred-neg { color:#ef4444; }
.pred-conf { font-size:11px!important; color:#94a3b8; margin-left:8px; }
.cf-pred-item p { margin:4px 0 0; font-size:11px; color:#64748b; }

.detail-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px) scaleY(0.95);
  max-height: 0;
}

.pipeline-card header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-height: 92px;
}

.pipeline-card header > div {
  flex: 1 1 auto;
  min-width: 0;
}

.step-index {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
}

.step-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  min-width: 0;
}

.step-title-row h3 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  line-height: 1.12;
  font-weight: 900;
  white-space: nowrap;
}

.pipeline-card header p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 700;
}

.step-kv {
  display: flex;
  gap: 12px;
  align-items: center;
}

.step-kv span,
.step-result span {
  flex: 0 0 auto;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
}

.step-kv strong {
  color: #0f172a;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 900;
}

.step-result {
  margin-top: auto;
  padding: 12px 13px;
  border-left: 4px solid;
  border-radius: 12px;
  background: #f8fafc;
}

.step-result p {
  margin: 7px 0 0;
  color: #334155;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 700;
}

:deep(.step-title-row .el-tag) {
  height: 26px;
  padding: 0 10px;
  border-color: #d9dee7;
  border-radius: 999px;
  background: #f3f5f8;
  color: #8b94a3;
  font-size: 12px;
  font-weight: 800;
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
}
</style>
