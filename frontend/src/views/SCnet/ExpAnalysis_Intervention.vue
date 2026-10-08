<template>
  <div class="post-intervention-page">
    <!-- K5-PIPELINE:实验闭环导航(运行实验 → 观察 → 干预 → 机制),实验 id 从 URL 带入 -->
    <ExperimentStageNav :experiment-id="routeExperimentId" current="intervention" />

    <PlanGroupStrip stage="intervention" />

    <section class="page-head">
      <div>
        <h1>干预分析与异常检测</h1>
        <p class="subtitle">基于实验结果进行干预策略对比评估，检测指标突变与网络异常。</p>
      </div>
      <div class="head-actions">
        <div class="stat-item">
          <span>异常事件</span>
          <strong>{{ anomalyCount }}</strong>
        </div>
        <div class="stat-item stat-item--danger">
          <span>高严重</span>
          <strong>{{ highSeverityCount }}</strong>
        </div>
      </div>
    </section>

    <!-- 干预分析子问题：把用户的实验目的拆成干预阶段要回答的子问题，默认展开 -->
    <section class="iv-subq">
      <header class="iv-subq__head">
        <span class="iv-subq__badge">干预分析子问题</span>
        <p class="iv-subq__main">围绕「{{ interventionProblem }}」，{{ subqLead }}</p>
        <button type="button" class="iv-subq__toggle" @click="subqOpen = !subqOpen">{{ subqOpen ? '收起' : '展开' }}</button>
      </header>
      <div v-show="subqOpen" class="iv-subq__body">
        <ul class="iv-subq__list">
          <li v-for="item in interventionSubQuestions" :key="item.key">
            <b>{{ item.title }}</b>：{{ item.text }}
          </li>
        </ul>
        <p class="iv-subq__label">本阶段回答</p>
        <p class="iv-subq__answer">{{ interventionStageAnswer }}</p>
        <p class="iv-subq__source">{{ subqSourceText }}</p>
      </div>
    </section>

    <!-- ===== 干预实验树 + 横向因果图（中间结论）=====
         影响因素组合与「SEM 预测响应」为前端示例口径（已在界面标注「示例数据」）；
         横向因果图的路径系数优先取后端实测 structural_model。 -->
    <section class="iv-top">
      <div class="iv-top__tabs" role="tablist">
        <button
          class="iv-top__tab" :class="{ 'is-active': topTab === 'tree' }"
          role="tab" :aria-selected="topTab === 'tree'"
          @click="topTab = 'tree'"
        >干预实验树 · 影响因素组合</button>
        <button
          class="iv-top__tab" :class="{ 'is-active': topTab === 'causal' }"
          role="tab" :aria-selected="topTab === 'causal'"
          @click="topTab = 'causal'"
        >横向因果图 · 中间结论</button>
        <button
          class="iv-top__tab" :class="{ 'is-active': topTab === 'sem' }"
          role="tab" :aria-selected="topTab === 'sem'"
          @click="topTab = 'sem'"
        >结构方程模型 · SEM</button>
        <button
          class="iv-top__tab" :class="{ 'is-active': topTab === 'compare' }"
          role="tab" :aria-selected="topTab === 'compare'"
          @click="topTab = 'compare'"
        >策略对比 · 统计检验</button>
      </div>

      <!-- 策略选择条：原「干预策略库」的选取与运行入口，常驻在中间结论区 -->
      <div class="iv-top__picks">
        <span class="iv-pick">
          <span class="iv-pick__badge iv-pick__badge--a">A</span>
          <el-select
            :model-value="currentStrategy.id || ''"
            placeholder="选择策略A" size="small" class="iv-pick__select"
            @change="(id) => setStrategyBySlot('primary', id)"
          >
            <el-option-group v-for="folder in strategyFolders" :key="folder.id" :label="folder.label">
              <el-option v-for="child in folder.children" :key="child.id" :label="child.name" :value="child.id" />
            </el-option-group>
          </el-select>
        </span>
        <span class="iv-pick__vs">VS</span>
        <span class="iv-pick">
          <span class="iv-pick__badge iv-pick__badge--b">B</span>
          <el-select
            :model-value="selectedStrategy?.id || ''"
            placeholder="选择策略B" size="small" class="iv-pick__select"
            @change="(id) => setStrategyBySlot('secondary', id)"
          >
            <el-option-group v-for="folder in strategyFolders" :key="folder.id" :label="folder.label">
              <el-option v-for="child in folder.children" :key="child.id" :label="child.name" :value="child.id" />
            </el-option-group>
          </el-select>
        </span>
        <span class="head-spacer"></span>
        <el-button type="primary" size="small" :icon="VideoPlay" :loading="runState.running" @click="startInterventionRun()">
          {{ runState.running ? '运行中' : '开始运行' }}
        </el-button>
        <el-dropdown trigger="click" @command="exportRunReport">
          <el-button size="small" plain :icon="Download" :disabled="!hasRunResults">导出结果</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="html">HTML（.html）</el-dropdown-item>
              <el-dropdown-item command="txt">文本（.txt）</el-dropdown-item>
              <el-dropdown-item command="pdf">PDF（打印保存）</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div v-show="topTab === 'tree'" class="iv-top__body iv-top__body--split">
        <div class="iv-top__left">
          <InterventionExperimentTree
            :factors="treeFactors"
            :experiments="treeExperiments"
            :selected-id="selectedExperimentId"
            @select="selectExperiment"
          />
        </div>
        <aside class="iv-top__right">
          <div class="iv-exp-card">
            <header class="iv-exp-card__head">
              <el-icon><Promotion /></el-icon>
              <span>{{ selectedExperiment?.label || '未选择实验' }}</span>
              <span class="head-spacer"></span>
              <span class="iv-exp-card__demo">示例数据</span>
            </header>
            <div v-if="selectedExperiment" class="iv-exp-card__body">
              <div class="iv-exp-combo">
                <span v-for="chip in selectedExperimentChips" :key="chip.key" class="iv-exp-chip">{{ chip.label }}</span>
              </div>
              <div class="iv-exp-outcome">
                <span class="iv-exp-outcome__label">SEM 预测响应</span>
                <b class="iv-exp-outcome__value">{{ semPredictedOutcome }}</b>
              </div>
              <p class="iv-exp-note">{{ semPredictionNote }}</p>
            </div>
            <div v-else class="iv-exp-card__body">
              <p class="iv-exp-pending">在左侧实验树里逐层选择档位，点末级「实验N」查看该组合的干预结果。</p>
              <ul class="iv-exp-factors">
                <li v-for="f in treeFactors" :key="f.key">
                  <span class="iv-exp-factors__name">{{ f.label }}</span>
                  <span class="iv-exp-factors__levels">{{ f.levels.map((l) => l.label).join(' / ') }}</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <div v-show="topTab === 'causal'" class="iv-top__body">
        <HorizontalCausalGraph
          :sides="horizontalSides"
          :fallback="SEM_DEMO_COEF"
          :conclusion="horizontalConclusion"
        />
      </div>

      <div v-show="topTab === 'sem'" class="iv-top__body">
        <div v-if="!currentStrategy.id || !selectedStrategy" class="iv-exp-card__empty">
          先在上方策略选择条里选定策略 A / 策略 B，再查看结构方程路径模型
        </div>
        <div
          v-show="currentStrategy.id && selectedStrategy"
          ref="topSemChartRef"
          class="sem-chart iv-top__sem"
        ></div>
      </div>

      <!-- 策略对比与统计检验：原底部三列「策略对比 / 干预策略对比」的数据 -->
      <div v-show="topTab === 'compare'" class="iv-top__body iv-top__body--compare">
        <div v-if="!currentStrategy.id || !selectedStrategy" class="compare-empty">
          <el-icon :size="38"><DataAnalysis /></el-icon>
          <p>选择两个干预策略后查看对比详情</p>
          <span>在上方策略选择条里分别指定策略 A 与策略 B，即可组成可调整的双策略对比</span>
        </div>

        <div v-else class="compare-content">
          <div class="cmp-card cmp-card--unified cmp-card--sm">
            <div class="cmp-card-head">
              <span>策略对比</span>
              <span class="head-spacer"></span>
              <span class="cmp-card-pip blue"></span><span>策略A</span>
              <span class="cmp-card-pip purple" style="margin-left:8px"></span><span>策略B</span>
            </div>
            <div class="cmp-card-body">
              <div class="strategy-compare-table">
                <div class="strategy-compare-header">
                  <span class="sc-label-col"></span>
                  <span class="sc-val-col sc-val--a">{{ currentStrategy.name }}</span>
                  <span class="sc-val-col sc-val--b">{{ selectedStrategy.name }}</span>
                </div>
                <div class="strategy-compare-row" v-for="f in strategyAllFields" :key="f.key">
                  <span class="sc-label-col">{{ f.label }}</span>
                  <span class="sc-val-col sc-val--a">{{ currentStrategy[f.key] || '--' }}</span>
                  <span class="sc-val-col sc-val--b">{{ selectedStrategy[f.key] || '--' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="cmp-card cmp-card--stats">
            <div class="cmp-card-head">
              <el-icon><DataAnalysis /></el-icon>
              <span>统计检验与综合评分</span>
              <span class="head-spacer"></span>
              <el-tag size="small" type="info" round>{{ statsLoading ? '计算中' : 'Welch t 检验' }}</el-tag>
            </div>
            <div class="cmp-card-body">
              <p v-if="comparisonHint" class="stats-hint">{{ comparisonHint }}</p>
              <template v-else>
                <div class="score-row">
                  <span class="score-chip score-chip--a">策略A 综合评分 {{ comparison?.strategy_a?.score ?? '--' }} · 第 {{ comparison?.strategy_a?.rank ?? '--' }} 名</span>
                  <span class="score-chip score-chip--b">策略B 综合评分 {{ comparison?.strategy_b?.score ?? '--' }} · 第 {{ comparison?.strategy_b?.rank ?? '--' }} 名</span>
                </div>
                <p class="stats-note">{{ scoringSummary }}</p>
                <div class="strategy-compare-table stats-table">
                  <div class="strategy-compare-header">
                    <span class="sc-label-col">指标</span>
                    <span class="sc-val-col sc-val--a">策略A 均值（样本量）</span>
                    <span class="sc-val-col sc-val--b">策略B 均值（样本量）</span>
                    <span class="sc-val-col">差值（95%CI）/ p / 效应量</span>
                    <span class="sc-val-col">检验结论</span>
                  </div>
                  <div class="strategy-compare-row" v-for="row in comparisonStats" :key="row.key">
                    <span class="sc-label-col">{{ row.label }}</span>
                    <span class="sc-val-col sc-val--a">{{ formatStatValue(row.mean_a, row.kind) }}<span v-if="row.available && row.n_a != null" class="stats-muted"> (n={{ row.n_a }})</span></span>
                    <span class="sc-val-col sc-val--b">{{ formatStatValue(row.mean_b, row.kind) }}<span v-if="row.available && row.n_b != null" class="stats-muted"> (n={{ row.n_b }})</span></span>
                    <span class="sc-val-col">
                      <template v-if="row.available">
                        {{ formatSigned(row.mean_diff, row.kind) }}<span v-if="row.ci_95" class="stats-muted">（95%CI {{ formatCI(row.ci_95, row.kind) }}）</span>
                        <br />p={{ formatPValue(row.p_value) }}<span class="stats-muted">（校正后 {{ formatPValue(row.p_adjusted) }}）</span>
                        <br />d={{ row.cohens_d }}<span v-if="row.effect_note" class="stats-muted">（{{ row.effect_note }}）</span>
                      </template>
                      <template v-else>--</template>
                    </span>
                    <span class="sc-val-col">
                      <el-tag v-if="row.available" size="small" :type="rowAdjustedSignificant(row) ? 'success' : 'info'" round>{{ rowVerdictText(row) }}</el-tag>
                      <span v-else class="stats-muted">{{ row.unavailable_reason || '无法检验' }}</span>
                    </span>
                  </div>
                </div>
                <p class="stats-note stats-note--muted">
                  口径：以月度为观测单位（n = 该策略的月度观测数）的 Welch t 检验 + Cohen's d + Bonferroni 多重检验校正；
                  <b>判定优劣只看校正后的 p 值</b>，未通过校正的差异一律记为「校正后不显著」，不据此排序。
                  注意月度数之间高度自相关，Welch t 的独立性假设并不严格成立，p 值用于筛信号而非精确推断；
                  要得到可推断的区间，需按计算实验规范固定随机种子做多次独立重复（见「反事实实验」的成对世界）。
                  综合评分为组内相对排名分，反映的是「本组策略内」的相对位置。
                </p>
              </template>
            </div>
          </div>

          <div class="cmp-card cmp-card--conclusion">
            <div class="cmp-card-head"><el-icon><Setting /></el-icon><span>策略A vs 策略B · 综合结论</span></div>
            <div class="cmp-card-body">
              <p class="conclusion-text">{{ interventionConclusion }}</p>
              <p class="conclusion-evidence" :class="{ 'conclusion-evidence--warn': conclusionEvidence.level !== 'verified' }">{{ conclusionEvidence.text }}</p>
              <div v-if="runState.running" class="run-inline-status">⏳ 正在运行干预策略对比实验...</div>
              <div v-else-if="runState.error" class="run-inline-status run-inline-status--error">{{ runState.error }}</div>
              <div v-else-if="hasRunResults" class="run-inline-result">
                <span v-for="row in runComparisonRows" :key="row.key" class="run-result-chip">
                  {{ row.label }}：A {{ row.primary }} / B {{ row.secondary }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 供应链态势地图：铀 / 汽车各自的网络拓扑与演化（原独立页面已并入本页）===== -->
    <section class="situation-map-section">
      <!-- :experiment-id 让地图锁定与上方策略选择条 / 异常事件同一个实验，避免两处各看一份数据 -->
      <SupplyChainSituationMap :experiment-id="currentExperimentId" />
    </section>

    <!-- ===== 异常检测区域 ===== -->
    <section class="anomaly-section" v-if="anomaliesData">
      <div class="anomaly-grid">
        <div class="anomaly-list-panel">
          <header class="panel-head">
            <el-icon><WarningFilled /></el-icon>
            <span>{{ sceneText.anomalyListTitle }}</span>
            <el-tag size="small" type="info" round>{{ anomaliesData?.method?.label || '稳健统计检测' }}</el-tag>
            <el-select v-model="severityFilter" placeholder="严重度" size="small" clearable style="width:110px;margin-left:auto">
              <el-option label="全部" value="" /><el-option label="高" value="high" /><el-option label="中" value="medium" /><el-option label="低" value="low" />
            </el-select>
          </header>
          <div class="panel-body">
            <div v-if="filteredAnomalies.length === 0" class="empty-hint">暂无检测到的异常事件</div>
            <div v-for="(a, idx) in filteredAnomalies" :key="idx" class="anomaly-item" :class="{ active: selectedAnomalyIndex === a._originalIndex }" :title="a.description" @click="selectAnomaly(a._originalIndex)">
              <el-tag :type="a.severity==='high'?'danger':a.severity==='medium'?'warning':'info'" size="small" effect="dark" round>{{ a.severity==='high'?'高':a.severity==='medium'?'中':'低' }}</el-tag>
              <span class="anomaly-type">{{ typeLabel(a.type) }}</span>
              <span v-if="a.month" class="anomaly-month">第{{ a.month }}月</span>
            </div>
          </div>
        </div>
        <div class="anomaly-detail-panel">
          <template v-if="selectedDetail">
            <header class="panel-head">
              <el-icon><DataLine /></el-icon><span>异常详情</span>
              <el-tag :type="selectedDetail.anomaly.severity==='high'?'danger':selectedDetail.anomaly.severity==='medium'?'warning':'info'" size="small" effect="light" round style="margin-left:8px">{{ selectedDetail.anomaly.severity==='high'?'高严重度':selectedDetail.anomaly.severity==='medium'?'中严重度':'低严重度' }}</el-tag>
            </header>
            <div class="detail-body">
              <section class="detail-section"><h4>异常描述</h4><p>{{ selectedDetail.anomaly.description }}</p></section>
              <section class="detail-section"><h4>可能原因</h4><ul><li v-for="c in selectedDetail.analysis.possible_causes" :key="c">{{ c }}</li></ul></section>
              <section class="detail-section"><h4>影响范围</h4><p>{{ selectedDetail.analysis.impact_scope }}</p></section>
              <section class="detail-section"><h4>建议响应</h4><p>{{ selectedDetail.analysis.suggested_response }}</p></section>
              <section class="detail-section" v-if="selectedDetail.statistical_evidence">
                <h4>统计证据</h4>
                <template v-if="selectedDetail.statistical_evidence.available">
                  <p>{{ selectedDetail.statistical_evidence.interpretation }}</p>
                  <ul>
                    <li v-if="selectedDetail.statistical_evidence.quantile_confirmed">已同时通过分位数栅栏（Q1-3IQR / Q3+3IQR）确认</li>
                    <li v-for="caveat in selectedDetail.statistical_evidence.caveats" :key="caveat">{{ caveat }}</li>
                  </ul>
                </template>
                <p v-else>{{ selectedDetail.statistical_evidence.note }}</p>
              </section>
              <section class="detail-section" v-if="selectedDetail.related_metrics && Object.keys(selectedDetail.related_metrics).length">
                <h4>关联指标快照</h4>
                <div class="metrics-grid"><div v-for="(val,key) in selectedDetail.related_metrics" :key="key" class="metric-item"><span class="metric-label">{{ key }}</span><span class="metric-value">{{ typeof val==='number'?val.toFixed(1):val }}</span></div></div>
              </section>
            </div>
          </template>
          <div v-else class="detail-empty"><el-icon :size="48"><WarningFilled /></el-icon><p>点击左侧异常事件查看详情与归因分析</p></div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DataAnalysis, DataLine, Download, Promotion, Setting, VideoPlay, WarningFilled
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { runExperiment } from '@/api/scenarioModeling'
import { getQueueHistory } from '@/api/queue'
import { getExperimentDetail, getInterventionStrategies, compareInterventions, getAnomalies, getAnomalyDetail } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'
import { resolveExperimentIdFromTask } from '@/utils/scnetTaskUtils'
import ExperimentStageNav from '@/components/SCnet/ExperimentStageNav.vue'
import PlanGroupStrip from '@/components/SCnet/PlanGroupStrip.vue'
import { useSupplyChainScenario } from '@/composables/useSupplyChainScenario'
import InterventionExperimentTree from '@/components/SCnet/InterventionExperimentTree.vue'
import HorizontalCausalGraph from '@/components/SCnet/HorizontalCausalGraph.vue'

// 供应链态势地图：由原独立页面抽成的面板（场景跟随全局选择，铀/汽车各自一张）
const SupplyChainSituationMap = defineAsyncComponent(
  () => import('@/components/SCnet/SupplyChainSituationMap.vue')
)

// ---- 场景（铀供应链 / 汽车供应链）：与对话首页共用同一份选择 ----
// ?scenario= 进入时以 URL 为准；策略名/目标/指标单位等口径统一走 sceneText
const { scenarioStore, isUraniumScene, sceneText, routeExperimentId, loadScenarioExperiments } = useSupplyChainScenario()

// 后端加载的策略数据
const backendStrategies = ref([])
const backendComparison = ref(null)
const strategiesLoading = ref(false)
const strategiesLoaded = ref(false)
const currentExperimentId = ref('')

// 将后端策略转换为前端策略库格式
// 策略核心参数：直接取后端返回的真实干预参数，不做二次加工
const formatStrategyParams = (params = {}) => {
  const parts = []
  const range = params.factory_capacity_range
  if (Array.isArray(range) && range.length >= 2 && (Number(range[0]) > 0 || Number(range[1]) > 0)) {
    parts.push(`产能 ${Number(range[0]).toFixed(0)}-${Number(range[1]).toFixed(0)}`)
  }
  const threshold = Number(params.reproduction_threshold)
  if (Number.isFinite(threshold) && threshold > 0) parts.push(`阈值 ${threshold.toFixed(0)}`)
  const orderMultiplier = Number(params.order_multiplier)
  if (Number.isFinite(orderMultiplier)) parts.push(`订单 ${orderMultiplier.toFixed(2)}x`)
  const adjustment = Number(params.adjustment_ratio)
  if (Number.isFinite(adjustment)) parts.push(`调整 ${(adjustment * 100).toFixed(1)}%`)
  return parts.length ? parts.join(' | ') : '--'
}

const mapBackendStrategyToFrontend = (s) => {
  // 类型 / 目标命名按场景取：铀侧保留原有措辞，汽车侧对齐工厂产能与协作网络
  const typeMap = isUraniumScene.value
    ? {
        capacity_expansion: '产能扩张', collaboration: '采购策略', emergency_response: '应急响应',
        inventory_management: '库存缓冲', pricing_strategy: '价格策略', supplier_selection: '供应链优化'
      }
    : {
        capacity_expansion: '产能扩张', collaboration: '协作网络', emergency_response: '应急响应',
        inventory_management: '库存管理', pricing_strategy: '价格策略', supplier_selection: '供应商选择'
      }
  const targetMap = isUraniumScene.value
    ? {
        capacity_expansion: '全球铀矿产能', collaboration: '铀贸易网络', emergency_response: '替代供应来源',
        inventory_management: '战略铀储备', pricing_strategy: '铀市场价格', supplier_selection: '铀供应链节点'
      }
    : {
        capacity_expansion: '总厂下属工厂产能', collaboration: '工厂协作网络', emergency_response: '替代供应来源',
        inventory_management: '库存与缓冲能力', pricing_strategy: '市场定价', supplier_selection: '供应链节点'
      }
  // 注意：Number(null) === 0，必须先判空再取数，否则缺失指标会被当成 0 参与展示
  const rawCompletion = s.outcomes?.completion_rate
  const hasCompletion = rawCompletion !== null && rawCompletion !== undefined && Number.isFinite(Number(rawCompletion))
  const completionRate = hasCompletion ? Number(rawCompletion) : null
  const completionDelta = hasCompletion ? completionRate * 100 - 50 : null
  const rawDensity = s.outcomes?.network_density
  const hasDensity = rawDensity !== null && rawDensity !== undefined && Number.isFinite(Number(rawDensity))
  const networkDensity = hasDensity ? Number(rawDensity) : null
  return {
    id: s.id, name: s.name,
    target: targetMap[s.type] || sceneText.value.strategyNetwork, phase: '事中',
    desc: formatStrategyParams(s.params),
    expectedCompletionDelta: hasCompletion
      ? `${completionDelta >= 0 ? '+' : ''}${completionDelta.toFixed(1)}pp`
      : '--',
    backlogImprovement: hasCompletion ? `${((1 - completionRate) * 100).toFixed(1)}%` : '--',
    collaborationDelta: `+${s.params?.final_collaborations || 0} 次`,
    // 网络密度为 null 时如实显示 --，不再回退到虚构的默认值
    resilienceDelta: networkDensity === null ? '--' : `+${networkDensity.toFixed(2)}`,
    type: typeMap[s.type] || '基准策略',
    scope: (s.id && s.id.includes('bottleneck')) ? '定向瓶颈' : sceneText.value.strategyGlobalScope,
    mechanism: s.type === 'capacity_expansion' ? '阶梯扩产' : s.type === 'emergency_response' ? '启动替代产能' : s.type === 'inventory_management' ? '战略储备缓冲' : s.type === 'pricing_strategy' ? '长期合约锁价' : '多源供应',
    trigger: s.has_extreme_scenario ? '极端事件' : (s.outcomes?.completion_rate < 0.5 ? '完成率<50%' : '基准策略'),
    _backend: s
  }
}

// 从后端加载策略数据并合并到 strategyFolders
const loadStrategiesFromBackend = async () => {
  strategiesLoading.value = true
  try {
    // 只取当前场景（铀 / 汽车）的最新实验：策略库按 experiment_id 提供
    const experiments = await loadScenarioExperiments()
    if (!experiments.length) return

    const latest = experiments[0]
    const experimentId = latest.experiment_id || latest.id
    if (!experimentId) return
    currentExperimentId.value = experimentId

    // 加载策略库
    const stratRes = await getInterventionStrategies(experimentId)
    const stratData = unwrapApiData(stratRes)
    if (stratData?.strategies && stratData.strategies.length > 0) {
      backendStrategies.value = stratData.strategies

      // 按策略类型分组，构建前端策略库
      const typeGroups = {}
      stratData.strategies.forEach(s => {
        const mapped = mapBackendStrategyToFrontend(s)
        const typeLabel = mapped.type
        if (!typeGroups[typeLabel]) {
          typeGroups[typeLabel] = []
        }
        typeGroups[typeLabel].push(mapped)
      })

      // 转换为 strategyFolders 格式
      const newFolders = Object.entries(typeGroups).map(([label, children], idx) => ({
        id: `f_bk_${idx}`,
        label,
        expanded: idx < 2,
        children
      }))

      if (newFolders.length > 0) {
        // 后端策略作为补充追加到现有策略库后面，不覆盖本地带标注的策略
        newFolders.forEach(f => {
          const exists = strategyFolders.find(sf => sf.label === f.label)
          if (!exists) strategyFolders.push(f)
        })
        // 汽车场景没有本地种子策略：载入后端策略库后自动选中前两条，便于直接对比
        if (!currentStrategy.id) {
          const flattenStrategies = strategyFolders.flatMap(folder => folder.children)
          if (flattenStrategies[0]) Object.assign(currentStrategy, flattenStrategies[0])
          if (flattenStrategies[1]) selectedStrategy.value = flattenStrategies[1]
        }
        strategiesLoaded.value = true
        ElMessage.success(`已从实验 ${experimentId} 补充 ${stratData.total_strategies} 条干预策略`)
      }
    }
  } catch (e) {
    console.warn('从后端加载策略数据失败，使用默认策略库:', e)
  } finally {
    strategiesLoading.value = false
  }
}

// ---- 干预策略库 ----
// 铀场景保留原有带标注的本地策略；汽车场景不使用本地种子
//（原有种子含铀价等与汽车无关的语义），直接采用后端 /intervention-strategies
// 返回的真实策略库（15 条，均带实测参数与结果）
const uraniumStrategySeeds = [
  { id: 'mkt_hedge',        name: '长期合约锁价', desc: '速率0.06 | 完成率+4pp | $55/lb',             target: '铀市场价格', phase: '事前', expectedCompletionDelta: '+4.2pp', backlogImprovement: '-5.8%', collaborationDelta: '+3次', resilienceDelta: '+0.15', type: '价格策略', mechanism: '长期合约锁定5-10年价格', trigger: '铀价>$80/lb' },
  { id: 'mkt_slow_adjust',  name: '稳健保守',    desc: '速率0.04 | 完成率+2pp | 保守',            target: '全供应链', phase: '事后', expectedCompletionDelta: '+2.0pp', backlogImprovement: '-3.0%', collaborationDelta: '+1次', resilienceDelta: '+0.05', type: '稳健策略', mechanism: '低调整速率+储备缓冲', trigger: '市场不确定' }
]
// 汽车场景先留空：等后端策略库载入后按其真实类型分组（当前后端返回 15 条产能扩张策略）
const buildStrategySeeds = () => (isUraniumScene.value
  ? [{ id: 'cat_market', label: '干预策略', expanded: true, children: uraniumStrategySeeds }]
  : [])
const strategyFolders = reactive(buildStrategySeeds())

// ---- 异常分析状态 ----
const anomaliesData = ref(null)
const severityFilter = ref('')
const selectedAnomalyIndex = ref(null)
const selectedDetail = ref(null)
// 异常类型名称：铀侧保留原有措辞，汽车侧改为工厂 / 订单口径
const URANIUM_TYPE_LABELS = { order_drop: '铀需求骤降', completion_change: '供应完成率异常', enterprise_change: '矿山/企业变动', extreme_event: '铀供应链极端事件', network_disruption: '协作网络中断' }
const AUTOMOTIVE_TYPE_LABELS = { order_drop: '市场需求骤降', completion_change: '订单完成率异常', enterprise_change: '工厂/企业变动', extreme_event: '汽车供应链极端事件', network_disruption: '协作网络中断' }
const typeLabels = computed(() => (isUraniumScene.value ? URANIUM_TYPE_LABELS : AUTOMOTIVE_TYPE_LABELS))
const typeLabel = (t) => typeLabels.value[t] || t
const anomalyCount = computed(() => anomaliesData.value?.summary?.total_anomalies || 0)
const highSeverityCount = computed(() => anomaliesData.value?.summary?.by_severity?.high || 0)
const allAnomalies = computed(() => (anomaliesData.value?.anomalies || []).map((a, i) => ({ ...a, _originalIndex: i })))
const filteredAnomalies = computed(() => severityFilter.value ? allAnomalies.value.filter(a => a.severity === severityFilter.value) : allAnomalies.value)

// 异常检测数据挂在实验上：按当前场景取最新实验，并与策略库共用同一个 experiment_id
const resolveScenarioExperimentId = async () => {
  if (currentExperimentId.value) return currentExperimentId.value
  const experiments = await loadScenarioExperiments()
  const latest = experiments[0]
  const experimentId = latest ? (latest.experiment_id || latest.id) : ''
  if (experimentId) currentExperimentId.value = experimentId
  return experimentId
}
const loadAnomalies = async () => {
  try {
    const experimentId = await resolveScenarioExperimentId()
    if (!experimentId) return
    const res = await getAnomalies(experimentId); const data = unwrapApiData(res)
    if (data) anomaliesData.value = data
  } catch (e) { console.warn('加载异常数据失败:', e) }
}
const selectAnomaly = async (index) => {
  selectedAnomalyIndex.value = index
  try {
    const experimentId = await resolveScenarioExperimentId()
    if (!experimentId) return
    const res = await getAnomalyDetail(experimentId, index); const data = unwrapApiData(res)
    if (data?.detail) selectedDetail.value = data.detail
  } catch (e) { console.warn('加载异常详情失败:', e) }
}

// 策略选择条：按 id 在策略库（含文件夹）里定位策略对象
const findStrategyById = (strategyId) => {
  for (const folder of strategyFolders) {
    const hit = folder.children.find(child => child.id === strategyId)
    if (hit) return hit
  }
  return null
}

const interventionConclusion = computed(() => {
  const a = currentStrategy, b = selectedStrategy.value
  if (!a.id || !b?.id) return '请选择两个策略进行对比'
  if (comparison.value?.recommendation) return comparison.value.recommendation
  const aComp = parseFloat(a.expectedCompletionDelta) || 0
  const bComp = parseFloat(b?.expectedCompletionDelta) || 0
  const aRes = parseFloat(a.resilienceDelta) || 0
  const bRes = parseFloat(b?.resilienceDelta) || 0
  // 没有后端统计检验时，只能用策略自带的预置参数排序。那是设计目标值、不是实测的干预效应，
  // 所以措辞收敛为「预期提升」，不再写「建议采用」；证据等级另由 conclusionEvidence 标注。
  if (bComp > aComp && bRes > aRes) return `按策略预置参数，B「${b.name}」的预期提升高于A「${a.name}」：完成率 ${b.expectedCompletionDelta} vs ${a.expectedCompletionDelta}，韧性 ${b.resilienceDelta} vs ${a.resilienceDelta}。这是设计目标值，不是本实验的实测结果。`
  if (aComp > bComp && aRes > bRes) return `按策略预置参数，A「${a.name}」的预期提升高于B「${b.name}」：完成率 ${a.expectedCompletionDelta} vs ${b.expectedCompletionDelta}，韧性 ${a.resilienceDelta} vs ${b.resilienceDelta}。这是设计目标值，不是本实验的实测结果。`
  return `两策略的预置目标各有侧重：A「${a.name}」完成率 ${a.expectedCompletionDelta}，B「${b.name}」完成率 ${b.expectedCompletionDelta}。以上为设计目标值，请点击「开始运行」跑出实测结果后再作比较。`
})

const strategyAllFields = [
  { key: 'desc', label: '参数' },
  { key: 'mechanism', label: '机制' },
  { key: 'trigger', label: '触发' },
  { key: 'expectedCompletionDelta', label: '完成率' },
  { key: 'backlogImprovement', label: '缺口改善' },
  { key: 'resilienceDelta', label: '韧性' }
]

const currentStrategy = reactive({ ...(strategyFolders[0]?.children?.[0] || {}) })
const selectedStrategy = ref(strategyFolders[0]?.children?.[1] ? { ...strategyFolders[0].children[1] } : null)

// ---- 后端统计对比：综合评分 / 显著性检验 / 路径模型 ----
const statsLoading = ref(false)

const comparison = computed(() => backendComparison.value?.comparison || null)
const comparisonStats = computed(() => comparison.value?.statistics || [])
const cohortScoring = computed(() => backendComparison.value?.cohort_scoring || null)
const structuralModel = computed(() => comparison.value?.structural_model || null)

// ---- 干预实验树 + 横向因果图（中间结论）----
// 说明：实验树的影响因素/档位与「SEM 预测响应」为前端示例口径，界面上已标注「示例数据」；
// 横向因果图的路径系数优先取后端实测 structural_model，缺失时退回示例系数并标注结构示意。
const topTab = ref('tree')

const TREE_FACTOR_SETS = {
  uranium: [
    { key: 'elasticity', label: '供给弹性', levels: ['低', '中', '高'] },
    { key: 'channel', label: '通道韧性', levels: ['单通道', '双通道', '多通道'] },
    { key: 'control', label: '出口管制', levels: ['宽松', '中性', '严格'] }
  ],
  supply_chain: [
    { key: 'capacity', label: '产能弹性', levels: ['低', '中', '高'] },
    { key: 'radius', label: '协作半径', levels: ['单集群', '双集群', '多集群'] },
    { key: 'order', label: '订单策略', levels: ['保守', '中性', '激进'] }
  ]
}
const LEVEL_WEIGHTS = [0.35, 0.6, 0.85]

const treeFactors = computed(() => {
  const defs = TREE_FACTOR_SETS[isUraniumScene.value ? 'uranium' : 'supply_chain'] || TREE_FACTOR_SETS.uranium
  return defs.map((f) => ({
    key: f.key,
    label: f.label,
    levels: f.levels.map((label, i) => ({ key: `${f.key}_${i}`, label, weight: LEVEL_WEIGHTS[i] }))
  }))
})

// 三个因素 × 三档 = 27 个组合实验
const treeExperiments = computed(() => {
  const fs = treeFactors.value
  if (fs.length < 3) return []
  const list = []
  let n = 0
  fs[0].levels.forEach((l0) => fs[1].levels.forEach((l1) => fs[2].levels.forEach((l2) => {
    n += 1
    list.push({
      id: `E${n}`,
      label: `实验${n}`,
      combo: { [fs[0].key]: l0.key, [fs[1].key]: l1.key, [fs[2].key]: l2.key },
      intensity: Number(((l0.weight + l1.weight + l2.weight) / 3).toFixed(3))
    })
  })))
  return list
})

const selectedExperimentId = ref('')
const selectExperiment = (id) => { selectedExperimentId.value = id }

const selectedExperiment = computed(
  () => treeExperiments.value.find((e) => e.id === selectedExperimentId.value) || null
)

const selectedExperimentChips = computed(() => {
  const exp = selectedExperiment.value
  if (!exp) return []
  return treeFactors.value.map((f) => {
    const lv = f.levels.find((l) => l.key === exp.combo[f.key])
    return { key: f.key, label: `${f.label}：${lv?.label ?? '--'}` }
  })
})

// SEM 平衡方程模型：a = 需求压力 → 协作强度，b = 协作强度 → 供应完成率，
// c′ = 控制中介后的直接效应，总效应 c = c′ + a×b（与顶部「结构方程模型 · SEM」页签同一口径）
const SEM_DEMO_COEF = Object.freeze({ a: 0.42, b: 0.51, cPrime: 0.18 })
const semCoef = computed(() => {
  const est = structuralModel.value?.estimates?.strategy_a
    || structuralModel.value?.estimates?.strategy_b
    || null
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d)
  return {
    available: Boolean(est?.available),
    a: num(est?.a?.beta, SEM_DEMO_COEF.a),
    b: num(est?.b?.beta, SEM_DEMO_COEF.b),
    cPrime: num(est?.direct?.beta, SEM_DEMO_COEF.cPrime)
  }
})

const semPredictedOutcome = computed(() => {
  const exp = selectedExperiment.value
  if (!exp) return '--'
  const { a, b, cPrime } = semCoef.value
  const value = Math.max(0, Math.min(1, 0.55 + (cPrime + a * b) * exp.intensity))
  return `${(value * 100).toFixed(1)}%`
})

const semPredictionNote = computed(() => {
  const exp = selectedExperiment.value
  if (!exp) return ''
  const { a, b, cPrime, available } = semCoef.value
  const total = cPrime + a * b
  return `按平衡方程组 c = c′ + a×b 估计：a = ${a.toFixed(2)}，b = ${b.toFixed(2)}，c′ = ${cPrime.toFixed(2)}`
    + ` → 总效应 c = ${total.toFixed(3)}；干预强度 x = ${exp.intensity} 代入得预测供应完成率。`
    + (available ? '系数取后端实测结构方程估计。' : '当前为示例系数（后端未返回结构方程估计），仅供结构示意。')
})

// 横向因果图的每一侧都读同一份后端结构方程估计（estimates.strategy_a / strategy_b），
// 后端没给估计时才退回 SEM_DEMO_COEF 并标注「示例数据」。
const causalSide = (key, strategy, color, slot) => {
  const est = structuralModel.value?.estimates?.[slot] || null
  const available = Boolean(est?.available)
  return {
    key,
    tag: key,
    color,
    name: strategy?.name || `策略${key}`,
    available,
    mediation: available && est.variant === 'mediation',
    reason: available
      ? (est.degraded && est.degrade_reason ? est.degrade_reason : '')
      : (est?.reason || '后端未返回该策略的月度结构方程估计'),
    n: available ? Number(est.n) : null,
    r2: available && est.r2_completion !== null && est.r2_completion !== undefined
      ? Number(est.r2_completion) : null,
    a: est?.a || null,
    b: est?.b || null,
    direct: est?.direct || null,
    total: est?.total || null,
    path: est?.path || null,
    indirect: est?.indirect || null
  }
}
const horizontalSides = computed(() => {
  const list = []
  if (currentStrategy?.id) list.push(causalSide('A', currentStrategy, '#2563eb', 'strategy_a'))
  if (selectedStrategy.value?.id) list.push(causalSide('B', selectedStrategy.value, '#059669', 'strategy_b'))
  return list
})

const horizontalConclusion = computed(() => {
  const list = horizontalSides.value
  const measured = list.filter((side) => side.available)
  const mediated = measured.filter((side) => side.mediation)
  // ① 后端完全没给估计：只能用示例系数讲模型形状，必须说明不是实测
  if (!measured.length) {
    const { a, b, cPrime } = semCoef.value
    const indirect = a * b
    const total = cPrime + indirect
    const share = total ? Math.round((indirect / total) * 100) : 0
    return `结构示意（示例系数，非实测）：需求压力 → 协作强度 → 供应完成率，间接效应 a×b = ${indirect.toFixed(3)}（示例占比 ${share}%）、直接效应 c′ = ${cPrime.toFixed(2)}。`
      + '后端未返回本实验的结构方程估计，该图只说明模型形状，不构成实验结论。'
  }
  // ② 有估计但中介段降级（协作强度无波动）：只报总效应，不做效应分解
  if (!mediated.length) {
    const side = measured[0]
    const total = side.total?.beta ?? side.path?.beta
    return `实测口径 · 策略${side.tag}｜中介段不可估计：${side.reason || '协作强度月度序列无波动'}，`
      + `因此只保留总效应 c = ${formatBeta(total)}${formatStars(side.total?.p_value ?? side.path?.p_value)}；`
      + '中间结论：本实验无法在「协作强度」这条中介路径上做效应分解，需先产生协作事件再重跑，或到「结构方程模型 · SEM」页签查看降级说明。'
  }
  // ③ 中介模型可估计：真实系数 + Sobel 检验
  const side = mediated[0]
  const indirect = side.indirect?.indirect_effect !== undefined && side.indirect?.indirect_effect !== null
    ? Number(side.indirect.indirect_effect)
    : (Number(side.a?.beta) || 0) * (Number(side.b?.beta) || 0)
  const total = indirect + (Number(side.direct?.beta) || 0)
  const share = total ? Math.round((indirect / total) * 100) : 0
  const sobelZ = Number.isFinite(Number(side.indirect?.z)) ? Number(side.indirect.z).toFixed(3) : '--'
  const sobel = side.indirect
    ? `（Sobel z = ${sobelZ}，p ${formatPValue(side.indirect.p_value)}，${side.indirect.significant ? '显著' : '不显著'}）`
    : ''
  return `实测口径 · 策略${side.tag}：a（需求压力 → 协作强度）= ${formatBeta(side.a?.beta)}${formatStars(side.a?.p_value)}，`
    + `b（协作强度 → 供应完成率）= ${formatBeta(side.b?.beta)}${formatStars(side.b?.p_value)}，`
    + `间接效应 a×b = ${indirect.toFixed(3)}${sobel}，占总效应 ${share}%；直接效应 c′ = ${formatBeta(side.direct?.beta)}${formatStars(side.direct?.p_value)}。`
    + '中间结论：需求压力主要经由「协作强度」这条中介路径传导到供应完成率，直接路径的边际作用有限；可用右侧 A/B 系数对比判断两条策略对中介段的撬动差异。'
})
const scoringSummary = computed(() => (
  comparison.value?.scoring_summary || cohortScoring.value?.summary || ''
))

const formatPValue = (p) => {
  if (p === null || p === undefined) return '--'
  const value = Number(p)
  if (!Number.isFinite(value)) return '--'
  return value < 0.001 ? '<0.001' : value.toFixed(3)
}

const formatBeta = (beta) => {
  if (beta === null || beta === undefined) return '--'
  const value = Number(beta)
  if (!Number.isFinite(value)) return '--'
  return (value >= 0 ? '+' : '') + value.toFixed(2)
}

const formatStatValue = (value, kind) => {
  if (value === null || value === undefined) return '--'
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  if (kind === 'rate') return (num * 100).toFixed(2) + '%'
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 1 })
}

const formatSigned = (value, kind) => {
  if (value === null || value === undefined) return '--'
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  if (kind === 'rate') return (num >= 0 ? '+' : '') + (num * 100).toFixed(2) + 'pp'
  return (num >= 0 ? '+' : '') + num.toFixed(1)
}

// 本页口径声明用 Bonferroni 校正：判定优劣必须以校正后的 p 为准。
// 后端同时给了 p_value 与 p_adjusted，只看前者就会出现「校正后不显著」却被判成「显著更优」。
const rowAdjustedSignificant = (row) => (
  row?.significant_adjusted !== undefined && row?.significant_adjusted !== null
    ? Boolean(row.significant_adjusted)
    : Boolean(row?.significant)
)

// 未通过校正时不判优劣：原始 p 显著但校正后不显著的要如实说明，而不是继续讲「更优」
const rowVerdictText = (row) => {
  if (!rowAdjustedSignificant(row)) {
    return row?.significant ? '校正后不显著' : '无显著差异'
  }
  return row?.better === 'A' ? 'A 显著更优' : 'B 显著更优'
}

const formatCI = (ci, kind) => {
  if (!Array.isArray(ci) || ci.length < 2) return '--'
  return `${formatSigned(ci[0], kind)} ~ ${formatSigned(ci[1], kind)}`
}


const comparisonHint = computed(() => {
  if (comparison.value) return ''
  if (!currentStrategy._backend?.id || !selectedStrategy.value?._backend?.id) {
    return '当前选择包含本地基线策略（无实验数据），无法做统计检验；请选择从实验补充的策略。'
  }
  if (!currentExperimentId.value) return '尚未加载到实验ID，无法做统计检验。'
  return statsLoading.value ? '正在计算统计检验与路径模型…' : '暂无可用的统计对比数据。'
})

// 结论的证据等级：只有后端统计检验给出的推荐才是本实验的证据；
// 回退到策略自带预置参数的排序只是设计意图，必须如实标注，不能讲成实验结论。
const conclusionEvidence = computed(() => (
  comparison.value
    ? {
        level: 'verified',
        text: '证据等级：干预级（因果阶梯第 2 层）· 本实验实测 —— 以上排序来自本实验的 Welch t 检验（Bonferroni 校正）与组内相对评分，仅统计显著的差异才判定优劣；结论适用范围限于本实验的网络规模与参数区间，不外推到其它条件。'
      }
    : {
        level: 'preset',
        text: '证据等级：设计意图，尚未验证 —— 当前两个策略没有本实验的统计检验数据，上面的比较来自策略自带的预置参数，不是实测的干预效应。请点「开始运行」跑出真实结果，或改选从实验补充的策略。'
      }
))

const loadStrategyComparison = async () => {
  const aId = currentStrategy._backend?.id
  const bId = selectedStrategy.value?._backend?.id
  if (!currentExperimentId.value || !aId || !bId || aId === bId) {
    backendComparison.value = null
    renderTopSemChart()
    return
  }
  statsLoading.value = true
  try {
    const res = await compareInterventions(currentExperimentId.value, aId, bId)
    backendComparison.value = unwrapApiData(res) || null
  } catch (e) {
    console.warn('加载策略统计对比失败:', e)
    backendComparison.value = null
  } finally {
    statsLoading.value = false
    renderTopSemChart()
  }
}

// ---- 结构方程可视化 ----
const SEM_HEIGHT = 360

const formatStars = (p) => {
  if (p === null || p === undefined) return ''
  const v = Number(p)
  if (!Number.isFinite(v)) return ''
  if (v < 0.001) return '***'
  if (v < 0.01) return '**'
  if (v < 0.05) return '*'
  return ''
}
const isSignificant = (p) => {
  if (p === null || p === undefined) return false
  const v = Number(p)
  return Number.isFinite(v) && v < 0.05
}
const semStat = (node) => {
  const est = node || {}
  return {
    beta: formatBeta(est.beta),
    se: est.se === null || est.se === undefined ? '--' : Number(est.se).toFixed(3),
    p: formatPValue(est.p_value),
    sig: isSignificant(est.p_value) ? '是' : '否'
  }
}
const semTipText = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const semTipRows = (rows) => rows
  .filter((row) => row && row[1] !== null && row[1] !== undefined && row[1] !== '')
  .map((row) => '<div style="display:flex;justify-content:space-between;gap:18px;line-height:1.85">'
    + '<span style="color:#64748b">' + semTipText(row[0]) + '</span>'
    + '<b style="color:#0f172a">' + semTipText(row[1]) + '</b></div>')
  .join('')
const semTipBlock = (title, color, rows) =>
  '<div style="font-weight:800;margin-bottom:5px;color:' + color + '">' + title + '</div>' + semTipRows(rows)

// 结构方程路径图：A/B 两侧各画一条"需求压力 → 协作强度 → 供应完成率"路径。
// 注意：ECharts graph(layout:'none') 会按 0.8*min(W/spanX, H/spanY) 等比缩放并把节点
// 包围盒居中，且节点符号尺寸/字号是字面 px、不参与该缩放。这里用 4 个隐形锚点把
// spanX/spanY 钉死在 0.8W/0.8H，使缩放系数恰好为 1，于是节点坐标 = 画布像素坐标。
const buildSEMOption = (width, height) => {
  const strategyA = currentStrategy
  const strategyB = selectedStrategy.value
  if (!strategyA?.id || !strategyB?.id) return null
  try {
    const W = Math.max(Number(width) || topSemChartRef.value?.clientWidth || 700, 380)
    const H = Math.max(Number(height) || SEM_HEIGHT, 240)
    const model = structuralModel.value
    const colorA = '#2563eb'
    const colorB = '#059669'
    const BW = Math.max(78, Math.min(112, Math.round(W * 0.152)))
    const edgeFont = W < 560 ? 11 : 12
    const ox = 0.1 * W
    const oy = 0.1 * H
    const colX = [ox + BW / 2, W / 2, W - ox - BW / 2]
    const bandTop = [24, 196]
    const bandH = 132
    const rowY = [bandTop[0] + 68, bandTop[1] + 68]
    const nodes = []
    const links = []
    const graphics = []

    const pushAnchor = (vx, vy) => nodes.push({
      id: `anchor_${vx}_${vy}`, name: '', x: vx, y: vy,
      symbolSize: 0, label: { show: false }, itemStyle: { opacity: 0 }
    })
    pushAnchor(0, 0)
    pushAnchor(0.8 * W, 0)
    pushAnchor(0, 0.8 * H)
    pushAnchor(0.8 * W, 0.8 * H)

    const pushNode = (id, cx, cy, title, sub, border, dim, tip) => {
      nodes.push({
        id, name: title, x: cx - ox, y: cy - oy,
        symbol: 'roundRect', symbolSize: [BW, 50],
        itemStyle: {
          color: '#ffffff',
          borderColor: dim ? '#cbd5e1' : border,
          borderWidth: dim ? 1.2 : 1.8,
          borderRadius: 10,
          shadowBlur: dim ? 0 : 6,
          shadowColor: 'rgba(15,23,42,0.10)',
          shadowOffsetY: 1
        },
        label: {
          show: true,
          formatter: sub ? `{t|${title}}\n{s|${sub}}` : `{t|${title}}`,
          rich: {
            t: { fontSize: 12, fontWeight: 'bold', lineHeight: 17, align: 'center', color: dim ? '#94a3b8' : '#0f172a' },
            s: { fontSize: 10, lineHeight: 14, align: 'center', color: dim ? '#b6bfcc' : '#7c8798' }
          }
        },
        _tipHtml: tip
      })
    }

    const pushLink = (source, target, opt) => {
      links.push({
        source, target,
        symbol: ['none', 'arrow'],
        symbolSize: opt.active ? 8 : 6,
        lineStyle: {
          color: opt.active ? opt.color : '#cbd5e1',
          width: opt.active ? opt.width : 1.4,
          type: opt.active ? 'solid' : 'dashed',
          curveness: opt.curveness || 0,
          opacity: opt.active ? 0.92 : 0.85
        },
        label: {
          show: Boolean(opt.text),
          formatter: opt.text,
          fontSize: edgeFont, fontWeight: 700,
          color: opt.active ? '#0f172a' : '#9aa5b4',
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderColor: opt.active ? opt.color : '#e2e8f0',
          borderWidth: 1, borderRadius: 6, padding: [3, 6],
          shadowBlur: 3, shadowColor: 'rgba(15,23,42,0.10)'
        },
        _tipHtml: opt.tip
      })
    }

    const buildSide = (slot, strategy, color, idx) => {
      const est = model?.estimates?.[slot] || null
      const y = rowY[idx]
      const top = bandTop[idx]
      const tag = idx === 0 ? 'A' : 'B'
      const available = Boolean(est && est.available)
      const mediation = available && est.variant === 'mediation'
      const r2 = available && est.r2_completion !== null && est.r2_completion !== undefined
        ? Number(est.r2_completion) : null
      const reason = !available
        ? (est?.reason || '无可用月度数据')
        : (est.degraded && est.degrade_reason ? est.degrade_reason : '')
      const meta = available
        ? [`n = ${est.n} 个月`, mediation ? '中介路径' : '单路径']
        : [reason]

      graphics.push({
        type: 'rect', z: 1, silent: true,
        shape: { x: 6, y: top, width: W - 12, height: bandH, r: 12 },
        style: {
          fill: idx === 0 ? '#f7faff' : '#f6fbf8',
          stroke: idx === 0 ? '#dbeafe' : '#d5f0e1',
          lineWidth: 1
        }
      })
      graphics.push({
        type: 'text', z: 2, silent: true, left: 20, top: top + 12,
        style: { text: `策略${tag} · ${strategy.name || tag}`, fill: color, fontSize: 12, fontWeight: 'bold' }
      })
      graphics.push({
        type: 'text', z: 2, silent: true, right: 20, top: top + 13,
        style: { text: meta.join('　｜　'), fill: '#94a3b8', fontSize: 11 }
      })

      const head = semTipBlock(`策略${tag} · ${strategy.name || tag}`, color, [
        ['模型', mediation ? '中介路径（需求压力 → 协作强度 → 供应完成率）' : (available ? '单路径（需求压力 → 供应完成率）' : '不可估计')],
        ['观测单位', available ? `${est.n} 个月（月度标准化 OLS）` : '--'],
        ['结果变量 R²', r2 === null ? '--' : r2.toFixed(3)],
        ['说明', reason]
      ])

      pushNode(slot + '_env', colX[0], y, '需求压力', '外生变量', color, !available,
        head + semTipBlock('需求压力（外生变量）', color,
          [['指标口径', '月订单量 total_orders'], ['处理', '标准化为 z 分数']]))
      pushNode(slot + '_med', colX[1], y, '协作强度',
        mediation ? '中介变量' : (available ? '无波动' : '不可估计'), color, !mediation,
        head + semTipBlock('协作强度（中介变量）', color,
          [['指标口径', '月协作次数 collaboration_count'], ['可估计', mediation ? '是' : '否（月度序列无波动）']]))
      pushNode(slot + '_out', colX[2], y, '供应完成率', r2 === null ? '' : `R² = ${r2.toFixed(2)}`, color, !available,
        head + semTipBlock('供应完成率（结果变量）', color,
          [['指标口径', '完工订单 / 订单总量'], ['模型 R²', r2 === null ? '--' : r2.toFixed(3)]]))

      const linkTip = (title, stat, extra) => head + semTipBlock(title, color,
        [['标准化系数 β', stat.beta], ['标准误 SE', stat.se], ['p 值', stat.p], ['显著（α=0.05）', stat.sig]]
          .concat(extra || []))

      if (mediation) {
        const pathA = semStat(est.a)
        const pathB = semStat(est.b)
        const pathC = semStat(est.direct)
        const indirect = est.indirect
        const indirectRows = indirect
          ? [['间接效应 a×b', formatBeta(indirect.indirect_effect)],
             ['Sobel z', Number(indirect.z).toFixed(3)],
             ['Sobel p', formatPValue(indirect.p_value) + (indirect.significant ? '（显著）' : '（不显著）')]]
          : [['间接效应 a×b', formatBeta(Number(est.a?.beta || 0) * Number(est.b?.beta || 0))],
             ['Sobel 检验', '不适用（间接效应方差退化，路径系数为 0）']]
        const width = (beta) => 1.8 + 2.2 * Math.min(1, Math.abs(Number(beta) || 0))

        pushLink(slot + '_env', slot + '_med', {
          active: isSignificant(est.a?.p_value), color,
          width: width(est.a?.beta),
          text: `β=${pathA.beta}${formatStars(est.a?.p_value)}`,
          tip: linkTip('路径 a：需求压力 → 协作强度', pathA)
        })
        pushLink(slot + '_med', slot + '_out', {
          active: isSignificant(est.b?.p_value), color,
          width: width(est.b?.beta),
          text: `β=${pathB.beta}${formatStars(est.b?.p_value)}`,
          tip: linkTip('路径 b：协作强度 → 供应完成率', pathB)
        })
        pushLink(slot + '_env', slot + '_out', {
          active: isSignificant(est.direct?.p_value), color, curveness: 0.16,
          width: 1.6 + 2.0 * Math.min(1, Math.abs(Number(est.direct?.beta) || 0)),
          text: `c′=${pathC.beta}${formatStars(est.direct?.p_value)}`,
          tip: linkTip('直接效应 c′：需求压力 → 供应完成率（已控制协作强度）', pathC,
            indirectRows.concat([['总效应 c', formatBeta(est.total?.beta)]])
              .concat([['分解', 'c = c′ + a×b']]))
        })
      } else if (available) {
        const total = semStat(est.path)
        pushLink(slot + '_env', slot + '_out', {
          active: isSignificant(est.path?.p_value), color, curveness: 0.16,
          width: 1.8 + 2.2 * Math.min(1, Math.abs(Number(est.path?.beta) || 0)),
          text: `β=${total.beta}${formatStars(est.path?.p_value)}`,
          tip: linkTip('总效应 c：需求压力 → 供应完成率', total,
            [['降级原因', est.degrade_reason || '协作强度月度序列无波动，中介路径不可估计']])
        })
        const skeletonTip = head + semTipBlock('中介路径（不可估计）', color, [['原因', reason]])
        pushLink(slot + '_env', slot + '_med', { active: false, color, text: '', tip: skeletonTip })
        pushLink(slot + '_med', slot + '_out', { active: false, color, text: '', tip: skeletonTip })
      } else {
        const skeletonTip = head + semTipBlock('中介路径（不可估计）', color, [['原因', reason]])
        pushLink(slot + '_env', slot + '_med', { active: false, color, text: '', tip: skeletonTip })
        pushLink(slot + '_med', slot + '_out', { active: false, color, text: '', tip: skeletonTip })
      }
    }

    buildSide('strategy_a', strategyA, colorA, 0)
    buildSide('strategy_b', strategyB, colorB, 1)

    return {
      animation: false,
      tooltip: {
        trigger: 'item', confine: true,
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#e2e8f0', borderWidth: 1, padding: [9, 11],
        textStyle: { color: '#0f172a', fontSize: 12 },
        extraCssText: 'box-shadow:0 8px 24px rgba(15,23,42,0.14);border-radius:9px;',
        formatter: (p) => (p && p.data && p.data._tipHtml) || ''
      },
      graphic: graphics,
      series: [{
        type: 'graph', layout: 'none', roam: false, draggable: false,
        data: nodes, links: links,
        edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 8,
        emphasis: { focus: 'none', scale: false },
        z: 5
      }]
    }
  } catch (e) { console.warn('SEM build failed:', e); return null }
}

// 顶部「结构方程模型 · SEM」页签：复用同一份 buildSEMOption —— 同一个实验、同一份 structural_model，
// 只是搬到页面上方的「中间结论」区，避免必须滚到第三列底部才看得到。
const topSemChartRef = ref(null)
let topSemChartInstance = null
let _topSemTimer = null
const renderTopSemChart = () => {
  if (_topSemTimer) clearTimeout(_topSemTimer)
  _topSemTimer = setTimeout(function() {
    try {
      const el = topSemChartRef.value
      if (!el) return
      if (topSemChartInstance) { topSemChartInstance.dispose(); topSemChartInstance = null }
      const option = buildSEMOption(el.clientWidth, el.clientHeight)
      if (!option) return
      topSemChartInstance = echarts.init(el)
      topSemChartInstance.setOption(option)
    } catch (e) { console.warn('top SEM render failed:', e) }
  }, 300)
}

// 切到 SEM 页签时补渲染一次（隐藏期间容器宽度为 0，量不出正确尺寸）
watch(topTab, (v) => { if (v === 'sem') setTimeout(() => renderTopSemChart(), 60) })

let _topSemResizeHandler = null
const bindTopSemResize = () => {
  if (_topSemResizeHandler) return
  _topSemResizeHandler = () => renderTopSemChart()
  window.addEventListener('resize', _topSemResizeHandler)
}
const unbindTopSemResize = () => {
  if (!_topSemResizeHandler) return
  window.removeEventListener('resize', _topSemResizeHandler)
  _topSemResizeHandler = null
}

// 策略选择条切换 A/B：更新槽位、作废旧运行结果、重渲染 SEM 与统计对比
function setStrategyBySlot(slot, strategyId) {
  if (runState.running) { ElMessage.warning('实验运行中，暂不能切换干预策略'); return }
  const child = findStrategyById(strategyId)
  if (!child) return
  if (slot === 'primary') Object.assign(currentStrategy, child)
  else selectedStrategy.value = { ...child }
  clearRunOutputForSelectionChange()
  renderTopSemChart()
  loadStrategyComparison()
}
// 干预问题：按场景表述，直接作为后端实验的 user_goal
const interventionProblem = computed(() => (isUraniumScene.value
  ? '铀矿产能受限与核电需求增长背景下，如何选择最优干预策略以维持铀供应链供应安全和完成率稳定？'
  : '汽车供应链工厂产能与库存受限、市场需求波动背景下，如何选择最优干预策略以维持订单完成率与协作网络稳定？'))
const interventionIterations = 15
const pollingIntervalMs = 5000

// ---- 干预分析子问题：把实验目的拆成干预阶段要回答的子问题（默认收起，点「展开」查看）----
const subqOpen = ref(false)
const subqLead = computed(() => '本阶段的子问题都围绕一件事：施加一次干预之后结果会不会变、变了多少，也就是 do(X) 的效果。')
const interventionSubQuestions = computed(() => {
  const aName = currentStrategy?.name || '策略A'
  const bName = selectedStrategy.value?.name || '策略B'
  return [
    {
      key: 'applied',
      title: '干预是否真的被施加',
      text: `A「${aName}」与 B「${bName}」各自改动了哪些变量、幅度多少？两次运行除该策略外其它条件是否可比？——对应上方「干预实验树 · 影响因素组合」。`
    },
    {
      key: 'path',
      title: '哪一段传导被撬动',
      text: `${sceneText.value.systemLabel}的因果链（需求压力 → 协作强度 → 供应完成率）里，干预主要改变的是中介段还是直接段？——对应「横向因果图 · 中间结论」与「结构方程模型 · SEM」。`
    },
    {
      key: 'significance',
      title: '差异是否可信',
      text: 'A/B 的指标差异经多重比较校正后是否仍显著，扣掉随机种子波动后还剩多少？——对应「策略对比 · 统计检验」。'
    },
    {
      key: 'residual',
      title: '还需要继续干预什么',
      text: '施加干预之后，哪些指标仍在异常区间、需要二次干预？——对应下方「供应链态势地图 / 异常检测」。'
    }
  ]
})
// 「本阶段回答」只汇总本实验实测的统计检验结果与异常检出，没有实测数据时明确说明「不给数值」
const interventionStageAnswer = computed(() => {
  const a = currentStrategy
  const b = selectedStrategy.value
  if (!a?.id || !b?.id) {
    return '尚未选定两个策略：先在上方选好策略A与策略B并点「开始运行」，本阶段才会给出干预效应的数值结论。'
  }
  if (!comparison.value) {
    return `当前只有策略自带的预置参数（A「${a.name}」完成率 ${a.expectedCompletionDelta || '—'}，B「${b.name}」完成率 ${b.expectedCompletionDelta || '—'}），属于设计意图、不是实测的干预效应；请点「开始运行」跑出真实结果。`
  }
  const rows = comparisonStats.value
  const significantCount = rows.filter(rowAdjustedSignificant).length
  const recommendation = String(comparison.value.recommendation || '').trim()
  const anomalyText = anomalyCount.value
    ? `本实验同时检出 ${anomalyCount.value} 条异常事件（高严重 ${highSeverityCount.value} 条），可作为「干预后还需加码哪里」的线索。`
    : '本实验未检出异常事件，干预后指标未见突变。'
  return `${rows.length} 项指标中有 ${significantCount} 项经 Bonferroni 校正后仍显著；`
    + (recommendation ? `后端推荐：${recommendation}` : '后端未给出推荐策略。')
    + anomalyText
})
const subqSourceText = computed(() => (comparison.value
  ? `本结论以${sceneText.value.systemLabel}${currentExperimentId.value ? ` 实验 ${currentExperimentId.value}` : ''}的实测统计检验为基线；只有 do(X) 的干预级证据，不含反事实的第 3 层推断（那在「反事实实验」里）。`
  : '尚未跑出实测结果：以上子问题是干预阶段的口径模板，本区块不给出任何估算数值。'))

const runState = reactive({
  running: false,
  message: '尚未提交实际运行任务。选择策略A与策略B后，点击“开始运行”即可分别提交后端仿真实验。',
  error: '',
  startedAt: '',
  completedAt: '',
  tasks: {
    primary: null,
    secondary: null
  },
  results: {
    primary: null,
    secondary: null
  }
})

const strategySlots = computed(() => [
  { key: 'primary', label: '策略A', strategy: currentStrategy },
  { key: 'secondary', label: '策略B', strategy: selectedStrategy.value }
])

const hasRunResults = computed(() => Boolean(runState.results.primary && runState.results.secondary))

const runComparisonRows = computed(() => {
  const primary = runState.results.primary
  const secondary = runState.results.secondary
  if (!primary || !secondary) return []

  return [
    {
      key: 'completionRate',
      label: '订单完成率',
      primary: formatPercent(primary.completionRate),
      secondary: formatPercent(secondary.completionRate),
      rawPrimary: primary.completionRate,
      rawSecondary: secondary.completionRate,
      direction: 'higher'
    },
    {
      key: 'backlogRate',
      label: '订单积压率',
      primary: formatPercent(primary.backlogRate),
      secondary: formatPercent(secondary.backlogRate),
      rawPrimary: primary.backlogRate,
      rawSecondary: secondary.backlogRate,
      direction: 'lower'
    },
    {
      key: 'overallScore',
      label: '综合得分',
      primary: formatNumber(primary.overallScore, 3),
      secondary: formatNumber(secondary.overallScore, 3),
      rawPrimary: primary.overallScore,
      rawSecondary: secondary.overallScore,
      direction: 'higher'
    },
    {
      key: 'cooperationCount',
      label: '协作次数',
      primary: formatInteger(primary.cooperationCount),
      secondary: formatInteger(secondary.cooperationCount),
      rawPrimary: primary.cooperationCount,
      rawSecondary: secondary.cooperationCount,
      direction: 'higher'
    },
    {
      key: 'netProfit',
      label: '总净利润',
      primary: formatNumber(primary.netProfit, 1),
      secondary: formatNumber(secondary.netProfit, 1),
      rawPrimary: primary.netProfit,
      rawSecondary: secondary.netProfit,
      direction: 'higher'
    },
    {
      key: 'bestIteration',
      label: '最佳迭代',
      primary: primary.bestIteration || '--',
      secondary: secondary.bestIteration || '--'
    },
    {
      key: 'capacityRange',
      label: '最佳产能区间',
      primary: formatRange(primary.capacityRange),
      secondary: formatRange(secondary.capacityRange)
    },
    {
      key: 'reproductionThreshold',
      label: '繁殖阈值',
      primary: formatNumber(primary.reproductionThreshold, 0),
      secondary: formatNumber(secondary.reproductionThreshold, 0)
    }
  ]
})

let runPollingTimer = null

const baseRunPayload = () => ({
  // 场景随全局选择走：此前固定提交 uranium，导致汽车场景也在跑铀仿真
  scenario: scenarioStore.currentScenario,
  // 铀场景使用预处理好的本地数据目录；汽车场景由后端按场景自带数据源
  data_dir: isUraniumScene.value ? 'E:/tju_1/processed' : null,
  // 铀场景沿用 7 轮；汽车场景与知识库汽车实验一致（15 轮 x 21 步）
  iterations: isUraniumScene.value ? 7 : 15,
  model: 'qwen',
  planner_strategy: 'native',
  use_decompose: false,
  enable_llm: false,
  llm_enabled: false,
  user_goal: interventionProblem.value,
  phase: 'post',
  source_page: 'ExpAnalysis_Intervention'
})

// ---- 汽车供应链干预参数构造 ----
// 口径来源：/parameter-catalog?scenario=supply_chain
//   factory_capacity_range = 工厂产能范围（默认 [250, 400]，区间 [30, 800]）
//   reproduction_threshold  = 供应保障能力（默认 400，区间 [400, 800]）
//   order_multiplier        = 市场需求强度（默认 1.0，区间 [0.1, 3]）
//   collaboration_radius    = 工厂协作范围（默认 1800，区间 [300, 3000]）
// 后端策略自带实测参数时按实测值回放（夹回目录区间），本地种子策略按语义做定向偏移
const AUTOMOTIVE_CATALOG = {
  order_multiplier: { min: 0.1, max: 3, baseline: 1.0 },
  factory_capacity_range: { min: 30, max: 800, baseline: [250, 400] },
  reproduction_threshold: { min: 400, max: 800, baseline: 400 },
  collaboration_radius: { min: 300, max: 3000, baseline: 1800 }
}
const AUTOMOTIVE_SEED_PRESETS = {
  cap_global_30: { capacityFactor: 1.3 },
  cap_isl_priority: { capacityFactor: 1.2, reproduction_threshold: 600 },
  cap_lower_threshold: { capacityFactor: 1.1 },
  proc_diversify: { collaboration_radius: 3000 },
  proc_stockpile: { reproduction_threshold: 600 },
  emer_niger: { capacityFactor: 0.85 },
  emer_kazakh: { capacityFactor: 0.8, reproduction_threshold: 600 },
  mkt_hedge: { order_multiplier: 0.9 },
  mkt_slow_adjust: { order_multiplier: 0.85 }
}
const clampToCatalog = (key, value) => {
  const bound = AUTOMOTIVE_CATALOG[key]
  const num = Number(value)
  if (!bound || !Number.isFinite(num)) return value
  return Math.min(bound.max, Math.max(bound.min, num))
}
const automotiveRuntimeConfig = (strategy = {}) => {
  const backendParams = strategy?._backend?.params || {}
  const preset = AUTOMOTIVE_SEED_PRESETS[strategy?.id] || {}
  const capacityFactor = preset.capacityFactor ?? 1
  const recordedCapacity = Array.isArray(backendParams.factory_capacity_range)
    && backendParams.factory_capacity_range.some((value) => Number(value) > 0)
    ? backendParams.factory_capacity_range
    : AUTOMOTIVE_CATALOG.factory_capacity_range.baseline.map((value) => value * capacityFactor)
  const orderMultiplier = backendParams.order_multiplier ?? preset.order_multiplier
    ?? AUTOMOTIVE_CATALOG.order_multiplier.baseline
  const threshold = backendParams.reproduction_threshold ?? preset.reproduction_threshold
    ?? AUTOMOTIVE_CATALOG.reproduction_threshold.baseline
  const collaborationRadius = backendParams.manufacturer_collaboration_radius
    ?? preset.collaboration_radius ?? AUTOMOTIVE_CATALOG.collaboration_radius.baseline
  return {
    paramOverrides: {
      order_multiplier: clampToCatalog('order_multiplier', orderMultiplier),
      factory_capacity_range: [
        clampToCatalog('factory_capacity_range', recordedCapacity[0]),
        clampToCatalog('factory_capacity_range', recordedCapacity[1])
      ],
      reproduction_threshold: clampToCatalog('reproduction_threshold', threshold),
      collaboration_radius: clampToCatalog('collaboration_radius', collaborationRadius),
      adjustment_ratio: Number.isFinite(Number(backendParams.adjustment_ratio))
        ? Number(backendParams.adjustment_ratio)
        : 0.08
    }
  }
}

// 干预参数的展示口径：铀侧沿用原标签与 tU/年 单位；
// 汽车侧取参数目录命名（市场需求强度 / 工厂产能范围 / 供应保障能力 / 工厂协作范围）
const buildSelectedParameterContext = (overrides = {}) => {
  const capacity = Array.isArray(overrides.factory_capacity_range) ? overrides.factory_capacity_range : []
  if (isUraniumScene.value) {
    return [
      { key: 'order_multiplier', label: '铀需求强度', value: overrides.order_multiplier || 1.0, unit: '倍' },
      { key: 'factory_capacity_min', label: '铀矿产能下限', value: capacity[0], unit: 'tU/年' },
      { key: 'factory_capacity_max', label: '铀矿产能上限', value: capacity[1], unit: 'tU/年' },
      { key: 'reproduction_threshold', label: '新矿投产阈值', value: overrides.reproduction_threshold || 6000, unit: 'tU/年' },
      { key: 'adjustment_ratio', label: '产能爬坡速率', value: overrides.adjustment_ratio || 0.08, unit: '比例' }
    ]
  }
  const rows = [
    { key: 'order_multiplier', label: '市场需求强度', value: overrides.order_multiplier || 1.0, unit: '倍' },
    { key: 'factory_capacity_min', label: '工厂产能下限', value: capacity[0], unit: '' },
    { key: 'factory_capacity_max', label: '工厂产能上限', value: capacity[1], unit: '' },
    { key: 'reproduction_threshold', label: '供应保障能力', value: overrides.reproduction_threshold, unit: '' }
  ]
  if (Number.isFinite(Number(overrides.collaboration_radius))) {
    rows.push({ key: 'collaboration_radius', label: '工厂协作范围', value: overrides.collaboration_radius, unit: '' })
  }
  return rows
}

const strategyRuntimeConfig = (strategy = {}) => {
  // 汽车场景：使用参数目录口径的工厂参数
  if (!isUraniumScene.value) return automotiveRuntimeConfig(strategy)
  const baseline = { order_multiplier: 1.0, factory_capacity_range: [42000, 78000], reproduction_threshold: 6000, adjustment_ratio: 0.08 }
  const defaultAgent = { factory: { params: { capacity_range: [42000, 78000] } }, manufacturing_corporation: { params: { capacity_range: [42000, 78000] } } }
  const configs = {
    // 一、产能扩张
    cap_global_30:       { paramOverrides: { ...baseline, factory_capacity_range: [54600, 101400], adjustment_ratio: 0.08 }, agentNodeConfigs: defaultAgent },
    cap_isl_priority:    { paramOverrides: { ...baseline, factory_capacity_range: [50000, 90000], reproduction_threshold: 5000, adjustment_ratio: 0.10 }, agentNodeConfigs: defaultAgent },
    cap_lower_threshold: { paramOverrides: { ...baseline, factory_capacity_range: [42000, 78000], reproduction_threshold: 3000, adjustment_ratio: 0.08 }, agentNodeConfigs: defaultAgent },
    // 二、采购与储备
    proc_diversify: { paramOverrides: { ...baseline }, agentNodeConfigs: { manufacturing_corporation: { params: { collaboration_radius: 3000, max_collaboration_factories: 50, capacity_range: [42000, 78000] } } } },
    proc_stockpile: { paramOverrides: { ...baseline, reproduction_threshold: 4500, adjustment_ratio: 0.10 }, agentNodeConfigs: defaultAgent },
    // 三、应急响应
    emer_niger:  { paramOverrides: { ...baseline, factory_capacity_range: [38000, 70000], reproduction_threshold: 5500, adjustment_ratio: 0.12 }, agentNodeConfigs: defaultAgent },
    emer_kazakh: { paramOverrides: { ...baseline, factory_capacity_range: [36000, 68000], reproduction_threshold: 5000, adjustment_ratio: 0.12 }, agentNodeConfigs: defaultAgent },
    // 四、市场与金融
    mkt_hedge:       { paramOverrides: { ...baseline, adjustment_ratio: 0.06 }, agentNodeConfigs: defaultAgent },
    mkt_slow_adjust: { paramOverrides: { ...baseline, adjustment_ratio: 0.04 }, agentNodeConfigs: defaultAgent },
  }
  return configs[strategy.id] || { paramOverrides: { ...baseline }, agentNodeConfigs: defaultAgent }
}

const buildInterventionRunPayload = (slotKey, strategy) => {
  const runtimeConfig = strategyRuntimeConfig(strategy)
  return {
    ...baseRunPayload(),
    // 顶层参数覆盖（后端仿真器必需）
    param_overrides: {
      order_multiplier: runtimeConfig.paramOverrides.order_multiplier || 1.0,
      factory_capacity_range: runtimeConfig.paramOverrides.factory_capacity_range,
      manufacturer_production_capacity_range: runtimeConfig.paramOverrides.factory_capacity_range,
      reproduction_threshold: runtimeConfig.paramOverrides.reproduction_threshold || 6000,
      adjustment_ratio: runtimeConfig.paramOverrides.adjustment_ratio || 0.08
    },
    intervention_slot: slotKey === 'primary' ? 'A' : 'B',
    intervention_strategy_id: strategy.id,
    intervention_strategy_name: strategy.name,
    intervention_strategy_type: strategy.type,
    intervention_strategy_payload: {
      target: strategy.target,
      scope: strategy.scope,
      mechanism: strategy.mechanism,
      trigger: strategy.trigger,
      param_overrides: runtimeConfig.paramOverrides
    },
    subtask_variable_configs: {
      counterfactual_runtime: {
        paramOverrides: {
          order_multiplier: runtimeConfig.paramOverrides.order_multiplier || 1.0,
          factory_capacity_range: runtimeConfig.paramOverrides.factory_capacity_range,
          manufacturer_production_capacity_range: runtimeConfig.paramOverrides.factory_capacity_range,
          reproduction_threshold: runtimeConfig.paramOverrides.reproduction_threshold || 6000,
          adjustment_ratio: runtimeConfig.paramOverrides.adjustment_ratio || 0.08
        }
      }
    },
    agent_node_configs: {
      factory: { params: { capacity_range: runtimeConfig.paramOverrides.factory_capacity_range } },
      manufacturing_corporation: {
        params: {
          capacity_range: runtimeConfig.paramOverrides.factory_capacity_range,
          // 汽车场景：协作半径由后端 agent_node_configs 消费
          //（run.py: manufacturer_collaboration_radius）
          ...(isUraniumScene.value ? {} : { collaboration_radius: runtimeConfig.paramOverrides.collaboration_radius })
        }
      }
    },
    scenario_context: {
      actual_problem: interventionProblem.value,
      scenario: scenarioStore.currentScenario,
      selected_strategy: strategy.name,
      strategy_slot: slotKey === 'primary' ? '策略A' : '策略B',
      selected_parameters: buildSelectedParameterContext(runtimeConfig.paramOverrides)
    }
  }
}

const resetRunState = () => {
  stopRunPolling()
  runState.running = false
  runState.error = ''
  runState.startedAt = ''
  runState.completedAt = ''
  runState.message = '正在准备提交两个干预策略的后端实验任务...'
  runState.tasks.primary = null
  runState.tasks.secondary = null
  runState.results.primary = null
  runState.results.secondary = null
}

const sleep = (ms) => new Promise(resolve => window.setTimeout(resolve, ms))

const startInterventionRun = async () => {
  if (runState.running) return
  if (!currentStrategy.id || !selectedStrategy.value?.id) {
    ElMessage.warning('请先选择策略A和策略B，再开始运行')
    return
  }

  resetRunState()
  runState.running = true
  runState.startedAt = new Date().toLocaleString()

  try {
    for (const slot of strategySlots.value) {
      const payload = buildInterventionRunPayload(slot.key, slot.strategy)
      const response = unwrapApiData(await runExperiment(payload))
      if (!response?.task_id || response.status === 'error') {
        throw new Error(response?.message || `${slot.label}实验任务提交失败`)
      }
      runState.tasks[slot.key] = {
        taskId: response.task_id,
        status: response.status || 'queued',
        position: response.position,
        strategyName: slot.strategy.name,
        resultPath: '',
        experimentId: ''
      }
      await sleep(30)
    }

    runState.message = '两个干预策略已提交后端队列，正在等待实际仿真实验完成...'
    ElMessage.success('两个干预策略实验已提交后端队列')
    startRunPolling()
  } catch (error) {
    runState.running = false
    runState.error = `提交失败：${error?.message || '未知错误'}`
    ElMessage.error(runState.error)
  }
}

const startRunPolling = () => {
  stopRunPolling()
  runPollingTimer = window.setInterval(pollRunTasks, pollingIntervalMs)
  pollRunTasks()
}

const stopRunPolling = () => {
  if (runPollingTimer) {
    window.clearInterval(runPollingTimer)
    runPollingTimer = null
  }
}

const pollRunTasks = async () => {
  const taskIds = strategySlots.value
    .map(slot => runState.tasks[slot.key]?.taskId)
    .filter(Boolean)

  if (!taskIds.length) return

  try {
    const history = unwrapApiData(await getQueueHistory(80)) || []
    for (const slot of strategySlots.value) {
      const task = runState.tasks[slot.key]
      if (!task?.taskId) continue

      const found = history.find(item => item.task_id === task.taskId)
      if (!found) continue

      task.status = found.status || task.status
      task.resultPath = found.result_path || task.resultPath
      if (found.status === 'failed') {
        task.error = found.error_message || '后端实验运行失败'
      }

      if (found.status === 'completed' && (found.result_path || found.result_relpath) && !runState.results[slot.key]) {
        const experimentId = resolveExperimentIdFromTask(found)
        task.experimentId = experimentId
        if (experimentId) {
          const detail = unwrapApiData(await getExperimentDetail(experimentId))
          runState.results[slot.key] = summarizeExperimentResult(detail, slot.strategy, task)
        }
      }
    }

    const failedTask = strategySlots.value
      .map(slot => runState.tasks[slot.key])
      .find(task => task?.status === 'failed')

    if (failedTask) {
      runState.running = false
      runState.error = `实验运行失败：${failedTask.error || failedTask.taskId}`
      stopRunPolling()
      return
    }

    if (hasRunResults.value) {
      runState.running = false
      runState.completedAt = new Date().toLocaleString()
      runState.message = '两个干预策略的后端实验均已完成，结果对比已更新。'
      stopRunPolling()
      ElMessage.success('干预策略实际运行完成')
      return
    }

    const statuses = strategySlots.value
      .map(slot => `${slot.label}${taskStatusText(runState.tasks[slot.key]?.status)}`)
      .join('，')
    runState.message = `后端实验运行中：${statuses}`
  } catch (error) {
    runState.message = `轮询队列状态失败，稍后自动重试：${error?.message || '未知错误'}`
  }
}

const findBestIteration = (iterations = []) => {
  if (!Array.isArray(iterations) || !iterations.length) return null
  return iterations.reduce((best, item) => {
    const bestScore = toNumber(best?.feedback?.overall_score, -1)
    const itemScore = toNumber(item?.feedback?.overall_score, -1)
    return itemScore > bestScore ? item : best
  }, iterations[0])
}

const summarizeExperimentResult = (detail = {}, strategy = {}, task = {}) => {
  const iterations = detail.iterations || []
  const best = findBestIteration(iterations) || {}
  const metrics = best.simulation_result?.metrics || {}
  const params = best.task?.parameters || {}
  const totalOrders = toNumber(metrics.total_orders)
  const completedOrders = toNumber(metrics.completed_orders)
  const backlog = Math.max(totalOrders - completedOrders, 0)

  return {
    strategyName: task.strategyName || strategy.name,
    experimentId: detail.experiment_id || task.experimentId,
    taskId: task.taskId,
    bestIteration: best.iteration,
    completionRate: toNumber(metrics.order_completion_rate, null),
    backlogRate: totalOrders > 0 ? backlog / totalOrders : null,
    totalOrders,
    completedOrders,
    backlog,
    cooperationCount: toNumber(metrics.cooperation_count ?? metrics.collaboration_count, null),
    netProfit: toNumber(metrics.total_net_profit, null),
    overallScore: toNumber(best.feedback?.overall_score, null),
    capacityRange: params.factory_capacity_range || params.manufacturer_production_capacity_range,
    reproductionThreshold: toNumber(params.reproduction_threshold, null),
    orderMultiplier: toNumber(params.order_multiplier, null),
    rawParameters: params
  }
}

const toNumber = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const formatPercent = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return `${(num * 100).toFixed(1)}%`
}

const formatNumber = (value, digits = 2) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return num.toFixed(digits)
}

const formatInteger = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return `${Math.round(num)}`
}

const formatRange = (value) => {
  if (!Array.isArray(value) || value.length < 2) return '--'
  return `${formatNumber(value[0], 0)}-${formatNumber(value[1], 0)}`
}

const taskStatusText = (status) => {
  const textMap = {
    queued: '排队中',
    pending: '排队中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return textMap[status] || '未提交'
}

const runReportTitle = () => `${sceneText.value.systemLabel}干预策略实际运行报告`

const buildRunReportText = () => {
  const lines = [
    runReportTitle(),
    `生成时间：${new Date().toLocaleString()}`,
    `实验问题：${interventionProblem.value}`,
    `基础实验：${interventionIterations}轮 / native planner / ${scenarioStore.currentScenario}`,
    '',
    `策略A：${currentStrategy.name}`,
    `策略B：${selectedStrategy.value?.name || '--'}`,
    '',
    '运行结果对比',
    ...runComparisonRows.value.map(row => `${row.label}：策略A=${row.primary}；策略B=${row.secondary}`),
    '',
    '证据等级：干预级（因果阶梯第 2 层）· 本实验实测 —— 以上为两个策略各自真实运行的结果差；'
      + '差异只说明「在本实验的网络规模与参数区间下施加该策略的效果」，不外推到其它条件；'
      + '要评估重复运行下的抽样波动，需固定随机种子做多次独立重复（见「反事实实验」的成对世界）。'
  ]
  return lines.join('\n')
}

const escapeHtml = (value) => String(value ?? '--')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const buildRunReportHtml = () => {
  const rows = runComparisonRows.value.map(row => `
    <tr>
      <th>${escapeHtml(row.label)}</th>
      <td>${escapeHtml(row.primary)}</td>
      <td>${escapeHtml(row.secondary)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${runReportTitle()}</title>
  <style>
    body { margin: 0; padding: 28px; color: #0f172a; font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.6; background: #f8fafc; }
    main { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px; }
    h1 { margin: 0 0 8px; font-size: 26px; }
    .meta { color: #64748b; margin-bottom: 18px; }
    .problem { padding: 12px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; color: #1e40af; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { width: 180px; background: #f1f5f9; }
    thead th { background: #dbeafe; color: #1e40af; }
    .evidence { margin-top: 18px; padding: 10px 12px; border-left: 3px solid #2563eb; background: #eff6ff; color: #1e3a8a; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <h1>${runReportTitle()}</h1>
    <div class="meta">生成时间：${new Date().toLocaleString()}；基础实验：${interventionIterations}轮</div>
    <div class="problem">${escapeHtml(interventionProblem.value)}</div>
    <p><strong>策略A：</strong>${escapeHtml(currentStrategy.name)}</p>
    <p><strong>策略B：</strong>${escapeHtml(selectedStrategy.value?.name)}</p>
    <table>
      <thead><tr><th>指标</th><th>策略A</th><th>策略B</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="evidence">证据等级：干预级（因果阶梯第 2 层）· 本实验实测 —— 以上为两个策略各自真实运行的结果差；差异只说明「在本实验的网络规模与参数区间下施加该策略的效果」，不外推到其它条件；要评估重复运行下的抽样波动，需固定随机种子做多次独立重复（见「反事实实验」的成对世界）。</p>
  </main>
</body>
</html>`
}

const downloadRunFile = (content, filename, type) => {
  const blob = new Blob([content], { type })
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(blob)
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}

const exportRunReport = (format = 'html') => {
  if (!hasRunResults.value) {
    ElMessage.warning('请先完成两个干预策略的实际运行，再导出结果')
    return
  }

  const safeName = `${currentStrategy.name}_vs_${selectedStrategy.value?.name || '策略B'}`.replace(/[\\/:*?"<>|]/g, '_')
  if (format === 'txt') {
    downloadRunFile(buildRunReportText(), `${runReportTitle()}_${safeName}.txt`, 'text/plain;charset=utf-8')
    ElMessage.success('实际运行报告已导出为TXT')
    return
  }

  if (format === 'pdf') {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      ElMessage.warning('浏览器拦截了PDF打印窗口，请允许弹窗后重试')
      return
    }
    printWindow.document.open()
    printWindow.document.write(buildRunReportHtml())
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => printWindow.print(), 300)
    ElMessage.success('已打开PDF打印窗口，请选择“保存为PDF”')
    return
  }

  downloadRunFile(buildRunReportHtml(), `${runReportTitle()}_${safeName}.html`, 'text/html;charset=utf-8')
  ElMessage.success('实际运行报告已导出为HTML')
}

// 场景在本页内切换（首页切换后回到本页）时，重建策略库并重新加载策略与异常
watch(isUraniumScene, async () => {
  strategyFolders.splice(0, strategyFolders.length, ...buildStrategySeeds())
  Object.keys(currentStrategy).forEach(key => delete currentStrategy[key])
  selectedStrategy.value = null
  strategiesLoaded.value = false
  anomaliesData.value = null
  selectedDetail.value = null
  selectedAnomalyIndex.value = null
  currentExperimentId.value = ''
  await loadStrategiesFromBackend()
  loadAnomalies()
})

onMounted(async () => {
  await loadStrategiesFromBackend()
  loadAnomalies()
  // 初始渲染结构方程图
  setTimeout(() => renderTopSemChart(), 600)
  bindTopSemResize()
  loadStrategyComparison()
})

onBeforeUnmount(() => {
  stopRunPolling()
  unbindTopSemResize()
  if (topSemChartInstance) { topSemChartInstance.dispose(); topSemChartInstance = null }
})

function clearRunOutputForSelectionChange() {
  if (!runState.tasks.primary && !runState.tasks.secondary && !runState.results.primary && !runState.results.secondary) return
  runState.tasks.primary = null
  runState.tasks.secondary = null
  runState.results.primary = null
  runState.results.secondary = null
  runState.error = ''
  runState.message = '策略选择已更新，请重新点击“开始运行”获取新的实际实验结果。'
}
</script>

<style scoped>
.post-intervention-page {
  height: 100%; min-height: 0; box-sizing: border-box; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 10px;
  background: #f6f8fb; color: #0f172a; overflow-y: auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-head {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 20px 30px;
  margin-bottom: 14px;
  border: none;
  border-radius: 16px;
  background:
    radial-gradient(130% 190% at 88% -40%, rgba(125, 211, 252, 0.42), transparent 62%),
    linear-gradient(120deg, #172554 0%, #1e40af 38%, #2563eb 68%, #3b82f6 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 20px 44px -26px rgba(30, 58, 138, 0.95), 0 3px 10px rgba(30, 58, 138, 0.18);
  position: relative;
  overflow: hidden;
}

.page-head::before {
  content: '';
  position: absolute;
  top: -62%; right: -8%;
  width: 330px; height: 330px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.18), transparent 66%);
  pointer-events: none;
}

.page-head::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.055) 0 2px, transparent 2px 28px);
  pointer-events: none;
}

.page-head > div:first-child { position: relative; z-index: 1; }

.eyebrow {
  margin: 0 0 6px;
  color: rgba(255,255,255,0.7);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.page-head h1 {
  margin: 0;
  font-size: 25px;
  line-height: 1.2;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 14px rgba(15, 23, 42, 0.38);
}

.subtitle {
  margin: 7px 0 0;
  color: rgba(255,255,255,0.82);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

/* ---- 干预分析子问题：实验目的 → 干预阶段子问题（可展开/收起）---- */
.iv-subq {
  flex: 0 0 auto;
  padding: 12px 16px 14px;
  border: 1px solid #e6ebf2;
  border-left: 4px solid #f59e0b;
  border-radius: 14px;
  background: linear-gradient(135deg, #fffbeb, #ffffff 62%);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
}
.iv-subq__head { display: flex; align-items: center; gap: 10px; }
.iv-subq__badge {
  flex: 0 0 auto; padding: 3px 10px;
  border: 1px solid #fcd34d; border-radius: 999px;
  background: linear-gradient(180deg, #fffbeb, #fef3c7); color: #b45309;
  font-size: 11.5px; font-weight: 800; white-space: nowrap;
  box-shadow: 0 1px 2px rgba(180, 83, 9, 0.16);
}
.iv-subq__main { flex: 1 1 auto; min-width: 0; margin: 0; font-size: 12.5px; font-weight: 700; color: #1e293b; line-height: 1.6; }
.iv-subq__toggle {
  flex: 0 0 auto; padding: 3px 12px;
  border: 1px solid #fcd34d; border-radius: 999px;
  background: #fff; color: #b45309; font-size: 12px; font-weight: 700; cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.iv-subq__toggle:hover { background: #b45309; border-color: #b45309; color: #fff; }
.iv-subq__body { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #fcd34d; }
.iv-subq__list { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
.iv-subq__list li { font-size: 12.5px; line-height: 1.7; color: #334155; }
.iv-subq__list b { color: #1e293b; }
.iv-subq__label { margin: 10px 0 0; font-size: 11.5px; font-weight: 800; color: #b45309; letter-spacing: 0.3px; }
.iv-subq__answer {
  margin: 4px 0 0; padding: 9px 12px;
  border: 1px solid #e6ebf2; border-radius: 10px; background: #f8fafc;
  font-size: 12.5px; line-height: 1.75; color: #1e293b;
}
.iv-subq__source { margin: 6px 0 0; font-size: 11.5px; line-height: 1.6; color: #64748b; }

/* ---- 当前干预策略 ---- */
.current-experiment {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  min-height: 0;
  overflow-y: auto;
}

.info-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.info-card--primary { border-top: 3px solid #3b82f6; }
.info-card--secondary { border-top: 3px solid #8b5cf6; }
.info-card--unified { border-top: 3px solid #3b82f6; cursor: default; }
.info-card--unified .info-card-head { background: linear-gradient(180deg, #eff6ff, #fafbfc); }
.info-card--active {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.head-spacer { flex: 1; }
.vs-inline { width: 24px; height: 24px; border-radius: 50%; background: #3b82f6; color: #fff; display: inline-grid; place-items: center; font-weight: 900; font-size: 10px; flex-shrink: 0; }
.vs-inline--sm { width: 20px; height: 20px; font-size: 9px; }
.compare-dual { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
.compare-col { padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; min-height: 0; }
.compare-col--a { border-right: 1px solid #eef2f7; background: #f8fbff; border-radius: 6px 0 0 6px; }
.compare-col--b { background: #f8fff8; border-radius: 0 6px 6px 0; }
.compare-col-label { font-size: 11px; font-weight: 900; color: #2563eb; text-align: center; padding-bottom: 4px; border-bottom: 1px solid #eef2f7; margin-bottom: 2px; }
.compare-col--b .compare-col-label { color: #059669; }

.strategy-compare-table { display: flex; flex-direction: column; gap: 0; }
.strategy-compare-header { display: flex; align-items: center; padding: 4px 0 6px; border-bottom: 2px solid #e2e8f0; margin-bottom: 2px; }
.strategy-compare-row { display: flex; align-items: center; padding: 5px 0; border-bottom: 1px dashed #f1f5f9; }
.strategy-compare-row:last-child { border-bottom: none; }
.sc-label-col { width: 70px; flex-shrink: 0; font-size: 12px; font-weight: 700; color: #64748b; text-align: right; padding-right: 12px; }
.sc-val-col { flex: 1; font-size: 12px; font-weight: 800; color: #0f172a; text-align: center; }
.sc-val--a { color: #2563eb; }
.sc-val--b { color: #059669; }
.sc-val-col.muted { color: #94a3b8; }

.info-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
  background: #fafbfc;
}

.info-card-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
}

.info-card-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-card-head .el-icon { font-size: 15px; color: #64748b; }
.info-card--primary .info-card-head .el-icon { color: #3b82f6; }
.info-card--secondary .info-card-head .el-icon { color: #8b5cf6; }

.info-card-body {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed #f1f5f9;
}

.info-row:last-child { border-bottom: none; }

.info-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.info-value {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.info-value.muted { color: #cbd5e1; }

/* ---- 右半 ---- */
.compare-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.compare-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

.compare-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 3px solid #8b5cf6;
  border-bottom: 1px solid #eef2f7;
  background: linear-gradient(180deg, #f5f3ff, #ffffff);
}

.compare-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
}

.compare-head-left .el-icon { color: #8b5cf6; }

.compare-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}

.compare-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #94a3b8;
  gap: 4px;
  padding: 20px;
}

.compare-empty .el-icon { color: #e2e8f0; }

.compare-empty p {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #64748b;
}

.compare-empty span {
  font-size: 12px;
  font-weight: 600;
  max-width: 300px;
  line-height: 1.5;
}

.compare-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-pair-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.cmp-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cmp-card--large {
  flex: 1 1 auto;
  min-height: 0;
}

.cmp-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
  background: #fafbfc;
  position: relative;
}

.cmp-card-head .el-icon { font-size: 15px; flex-shrink: 0; }

.cmp-card-pip {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-left: auto;
  flex-shrink: 0;
}

.cmp-card-pip.blue   { background: #3b82f6; }
.cmp-card-pip.purple { background: #8b5cf6; }
.cmp-card-pip.teal   { background: #0d9488; }
.cmp-card-pip.amber  { background: #d97706; }
.cmp-card-pip.slate  { background: #475569; }

.cmp-card--blue { border-top: 3px solid #3b82f6; }
.cmp-card--blue .cmp-card-head { background: linear-gradient(180deg, #eff6ff 0%, #fafbfc 100%); }
.cmp-card--blue .cmp-card-head .el-icon { color: #3b82f6; }

.cmp-card--purple { border-top: 3px solid #8b5cf6; }
.cmp-card--purple .cmp-card-head { background: linear-gradient(180deg, #f5f3ff 0%, #fafbfc 100%); }
.cmp-card--purple .cmp-card-head .el-icon { color: #8b5cf6; }

.cmp-card--teal { border-top: 3px solid #0d9488; }
.cmp-card--teal .cmp-card-head { background: linear-gradient(180deg, #f0fdfa 0%, #fafbfc 100%); }
.cmp-card--teal .cmp-card-head .el-icon { color: #0d9488; }

.cmp-card--amber { border-top: 3px solid #d97706; }
.cmp-card--amber .cmp-card-head { background: linear-gradient(180deg, #fffbeb 0%, #fafbfc 100%); }
.cmp-card--amber .cmp-card-head .el-icon { color: #d97706; }

.cmp-card-body {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
}

.cmp-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px dashed #f1f5f9;
}

.cmp-kv:last-child { border-bottom: none; }

.cmp-kv-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.cmp-kv-value {
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
}

/* ---- 实际运行模块 ---- */
/* ---- 结构方程图 ---- */
.sem-chart { width: 100%; height: 360px; }

/* ===== 干预实验树 + 横向因果图（中间结论）===== */
.iv-top {
  margin-bottom: 14px; padding: 14px 16px;
  border: 1px solid #e6ebf2; border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.iv-top__tabs {
  display: inline-flex; gap: 2px; margin-bottom: 12px;
  padding: 4px; border-radius: 999px;
  background: #eff6ff; border: 1px solid #dbeafe;
}
.iv-top__picks {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin-bottom: 14px; padding: 9px 12px;
  border: 1px solid #dbeafe; border-radius: 12px;
  background: linear-gradient(90deg, #eff6ff, #f8fafc 55%, #f5f3ff);
}
.iv-pick {
  display: flex; align-items: center; gap: 7px;
  padding: 3px 10px 3px 5px; border-radius: 999px;
  background: #ffffff; border: 1px solid #e6ebf2;
}
.iv-pick__badge {
  width: 22px; height: 22px; border-radius: 999px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 900; color: #ffffff;
}
.iv-pick__badge--a { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
.iv-pick__badge--b { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
.iv-pick__select { width: 178px; }
.iv-pick__select :deep(.el-select__wrapper) { box-shadow: none; background: transparent; }
.iv-pick__select :deep(.el-select__wrapper.is-focused) { box-shadow: 0 0 0 1px #a5b4fc inset; }
.iv-pick__vs { font-size: 11px; font-weight: 900; color: #94a3b8; letter-spacing: .5px; }
.iv-top__body--compare { display: block; }
.iv-top__body--compare .compare-empty { min-height: 220px; }
.iv-top__tab {
  padding: 6px 15px; border-radius: 999px; border: none; background: transparent;
  font-size: 12.5px; font-weight: 700; color: #64748b;
  cursor: pointer; transition: all .16s; white-space: nowrap;
}
.iv-top__tab:hover { color: #4338ca; background: #e8edff; }
.iv-top__tab.is-active { background: #ffffff; color: #4338ca; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12); }
.iv-top__tab:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
.iv-top__sem { height: 380px; }
.iv-top__body--split {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 14px; align-items: start;
}
.iv-exp-card {
  border: 1px solid #e6ebf2; border-radius: 16px; background: #ffffff; overflow: hidden;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.iv-exp-card__head {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
  border-bottom: 1px solid #eef2f7;
  background: linear-gradient(90deg, #eef2ff, #ffffff);
  font-size: 13px; font-weight: 800; color: #312e81;
}
.iv-exp-card__demo {
  font-size: 11.5px; font-weight: 800; padding: 4px 11px; border-radius: 999px; white-space: nowrap;
  color: #b45309; background: linear-gradient(180deg, #fffbeb, #fef3c7); border: 1px solid #fcd34d;
  box-shadow: 0 1px 2px rgba(180, 83, 9, 0.16);
}
.iv-exp-card__body { padding: 12px; }
.iv-exp-card__empty { padding: 28px 14px; text-align: center; font-size: 12.5px; line-height: 1.7; color: #94a3b8; }
.iv-exp-combo { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.iv-exp-chip {
  padding: 3px 10px; border-radius: 999px; background: #eef2ff;
  border: 1px solid #c7d2fe; color: #3730a3; font-size: 11.5px; font-weight: 700;
}
.iv-exp-outcome {
  display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
  padding: 10px 12px; border-radius: 10px;
  background: linear-gradient(90deg, #f0fdf4, #ffffff); border: 1px solid #a7f3d0;
}
.iv-exp-outcome__label { font-size: 12px; font-weight: 700; color: #166534; }
.iv-exp-outcome__value { font-size: 22px; font-weight: 800; letter-spacing: -.5px; color: #15803d; }
.iv-exp-note { margin: 10px 0 0; font-size: 12px; line-height: 1.7; color: #64748b; }
.iv-exp-pending { margin: 0 0 10px; font-size: 12px; line-height: 1.7; color: #64748b; }
.iv-exp-factors { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.iv-exp-factors li {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 10px; border-radius: 8px; background: #f8fafc; border: 1px solid #eef2f7;
}
.iv-exp-factors__name { font-size: 12px; font-weight: 800; color: #334155; }
.iv-exp-factors__levels { font-size: 11.5px; color: #94a3b8; }
@media (max-width: 1100px) { .iv-top__body--split { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .iv-top__tab { transition: none; } }

.cmp-card--conclusion { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; border-top: 3px solid #6366f1; margin-bottom: 8px; }
.cmp-card--conclusion .cmp-card-head { background: linear-gradient(180deg, #eef2ff, #fafbfc); border-bottom: 1px solid #eef2f7; padding: 8px 12px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px; color: #4338ca; }
.cmp-card--conclusion .cmp-card-body { padding: 10px 14px; background: #fafafe; }
.conclusion-text { margin: 0 0 8px; font-size: 12px; line-height: 1.65; color: #334155; font-weight: 600; }
.conclusion-evidence { margin: 0 0 8px; padding: 7px 10px; border-left: 3px solid #16a34a; border-radius: 0 6px 6px 0; background: #f0fdf4; font-size: 12px; line-height: 1.7; color: #166534; }
.conclusion-evidence--warn { border-left-color: #f59e0b; background: #fffbeb; color: #78350f; }
.conclusion-actions { display: flex; justify-content: flex-end; gap: 8px; }
.run-inline-status { font-size: 12px; color: #6366f1; font-weight: 700; padding: 4px 0; }
.run-inline-status--error { color: #ef4444; }
.run-inline-result { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 0; }
.run-result-chip { font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #f0fdf4; color: #065f46; font-weight: 700; }

.runtime-panel {
  margin-top: 14px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.runtime-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #e0f2fe;
  background: #f8fbff;
}

.runtime-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e293b;
  font-size: 13px;
  font-weight: 900;
}

.runtime-title .el-icon { color: #2563eb; }

.runtime-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.runtime-problem {
  margin: 12px 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.runtime-problem span {
  color: #3b82f6;
  font-size: 11px;
  font-weight: 900;
}

.runtime-problem strong {
  color: #1e3a8a;
  font-size: 12px;
  line-height: 1.5;
}

.runtime-status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 14px 12px;
}

.runtime-status-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #ffffff;
}

.runtime-status-card--primary { border-top: 3px solid #3b82f6; }
.runtime-status-card--secondary { border-top: 3px solid #8b5cf6; }

.runtime-status-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
}

.runtime-status-top span {
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
}

.runtime-status-card strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.4;
}

.runtime-status-card p {
  margin: 6px 0 0;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  word-break: break-all;
}

.runtime-alert {
  margin: 0 14px 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.runtime-alert--error {
  background: #fef2f2;
  color: #b91c1c;
}

.runtime-result {
  margin: 0 14px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.runtime-result-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #eef2f7;
  background: #f8fafc;
  color: #1e293b;
  font-size: 13px;
  font-weight: 900;
}

.result-table {
  display: flex;
  flex-direction: column;
}

.result-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
}

.result-row:last-child { border-bottom: none; }

.result-row--head {
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 900;
}

.result-row span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.result-row .winner {
  color: #047857;
}

.runtime-placeholder {
  min-height: 88px;
  margin: 0 14px 14px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  color: #94a3b8;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.runtime-placeholder .el-icon {
  color: #cbd5e1;
  font-size: 18px;
  flex-shrink: 0;
}

.library-tree::-webkit-scrollbar,
.current-experiment::-webkit-scrollbar,
.compare-body::-webkit-scrollbar,
.panel-body::-webkit-scrollbar {
  width: 5px;
}
.library-tree::-webkit-scrollbar-thumb,
.current-experiment::-webkit-scrollbar-thumb,
.compare-body::-webkit-scrollbar-thumb,
.panel-body::-webkit-scrollbar-thumb {
  background: #cbd5e1; border-radius: 999px;
}

/* ---- 异常区域 ---- */
.head-actions { display: flex; align-items: center; gap: 14px; flex-shrink: 0; position: relative; z-index: 1; }
.stat-item {
  min-width: 86px; padding: 7px 12px;
  border: 1px solid rgba(255, 255, 255, 0.24); border-radius: 10px;
  background: rgba(255, 255, 255, 0.14); backdrop-filter: blur(6px);
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}
.stat-item:hover { transform: translateY(-1px); background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.42); }
.stat-item span { display: block; color: rgba(255, 255, 255, 0.74); font-size: 10px; font-weight: 800; letter-spacing: 0.06em; }
.stat-item strong { display: block; margin-top: 3px; color: #ffffff; font-size: 19px; line-height: 1.1; font-variant-numeric: tabular-nums; }
.stat-item--danger { border-color: rgba(248, 113, 113, 0.45); background: rgba(239, 68, 68, 0.18); }
.stat-item--danger span { color: rgba(254, 202, 202, 0.92); }
.stat-item--danger strong { color: #fecaca; }
.overview-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.overview-card { display: grid; grid-template-columns: 38px 1fr; grid-template-rows: auto auto; column-gap: 10px; align-items: center; min-height: 56px; padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; }
.overview-card .el-icon { grid-row: 1/3; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; background: #fecaca; color: #ef4444; font-size: 16px; }
.overview-card span { color: #64748b; font-size: 12px; font-weight: 800; }
.overview-card strong { color: #0f172a; font-size: 18px; }
.anomaly-section { flex: 0 0 auto; margin-top: 10px; }
.anomaly-grid { display: grid; grid-template-columns: 380px 1fr; gap: 10px; }
.anomaly-list-panel { border: 1px solid #e6ebf2; border-radius: 14px; background: #fff; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 6px 16px rgba(15,23,42,0.04); max-height: 360px; }
.anomaly-detail-panel { border: 1px solid #e6ebf2; border-radius: 14px; background: #fff; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 6px 16px rgba(15,23,42,0.04); max-height: 360px; }
.anomaly-list-panel .panel-head { border-top: 3px solid #3b82f6; background: linear-gradient(180deg, #eff6ff, #ffffff); }
.anomaly-list-panel .panel-head .el-icon { color: #3b82f6; }
.anomaly-detail-panel .panel-head { border-top: 3px solid #8b5cf6; background: linear-gradient(180deg, #f5f3ff, #ffffff); }
.anomaly-detail-panel .panel-head .el-icon { color: #8b5cf6; }
.panel-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid #eef2f7; font-weight: 800; font-size: 13px; flex-shrink: 0; background: #fafbfc; }
.panel-body { flex: 1; overflow-y: auto; padding: 6px; }
.anomaly-item { display: flex; align-items: center; gap: 8px; padding: 9px 10px; margin: 2px 0; border: 1px solid #eef2f7; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.anomaly-item:hover { border-color: #fca5a5; background: #fffafa; }
.anomaly-item.active { border-color: #ef4444; background: #fef2f2; border-left: 3px solid #ef4444; }
.anomaly-type { font-size: 12px; font-weight: 800; color: #0f172a; }
.anomaly-month { margin-left: auto; font-size: 12px; color: #94a3b8; font-weight: 600; }
.detail-body { padding: 14px; overflow-y: auto; }
.detail-section { margin-bottom: 12px; }
.detail-section h4 { margin: 0 0 6px; font-size: 13px; font-weight: 800; color: #0f172a; }
.detail-section p, .detail-section li { margin: 0; font-size: 12px; color: #475569; line-height: 1.6; }
.detail-section ul { margin: 0; padding-left: 16px; }
.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.metric-item { padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fafbfc; display: flex; flex-direction: column; gap: 3px; }
.metric-label { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
.metric-value { font-size: 14px; font-weight: 900; color: #0f172a; }
.empty-hint, .detail-empty { padding: 30px 0; text-align: center; color: #94a3b8; font-size: 12px; font-weight: 600; }
.detail-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0; }
/* 供应链态势地图（原独立页面并入本页后作为页尾的态势底图） */
.situation-map-section { flex: 0 0 auto; margin-top: 10px; }

/* 统计对比与路径模型 */
.stats-hint { font-size: 12px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 10px; }
.score-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.score-chip { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
.score-chip--a { color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; }
.score-chip--b { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
.stats-note { font-size: 11px; color: #475569; margin: 6px 0 4px; line-height: 1.6; }
.stats-note--muted { color: #94a3b8; }
.stats-muted { font-size: 11px; color: #94a3b8; }
.stats-table .sc-label-col { width: 96px; }
.stats-table .strategy-compare-row { gap: 4px; }

</style>
