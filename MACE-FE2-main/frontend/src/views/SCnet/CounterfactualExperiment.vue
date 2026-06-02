<template>
  <div class="scnet-counterfactual-cockpit">
    <section class="page-head">
      <div>
        <p class="eyebrow">SCNET COUNTERFACTUAL EXPERIMENT</p>
        <h1>反事实实验</h1>
        <p class="subtitle">基于事中供应链结果设定干预变量与产能方案，运行反事实实验并对比评估策略效果。</p>
      </div>
      <div class="page-actions">
        <el-button type="primary" size="large" :icon="Upload" @click="triggerReportUpload">导入实验报告</el-button>
        <input
          ref="reportFileInput"
          class="report-file-input"
          type="file"
          accept=".json,application/json"
          @change="handleReportUpload"
        />
      </div>
    </section>

    <div class="top-row">
      <section class="control-panel panel-card panel-card--blue">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Supply Chain</p>
            <h3>反事实实验控制区</h3>
          </div>
          <span class="state-badge" :data-state="simState">{{ stateLabel }}</span>
        </header>

        <div class="panel-body stack">
          <div class="counterfactual-target block" v-if="activeCounterfactualExperiment">
            <div class="counterfactual-target__head">
              <span>当前反事实实验对象</span>
              <el-button link type="primary" size="small" @click="clearConfirmedExperiment">取消对象</el-button>
            </div>
            <div class="counterfactual-target__body">
              <strong>{{ activeCounterfactualExperiment.label }}</strong>
              <p>{{ activeCounterfactualExperiment.report?.source || activeCounterfactualExperiment.arguments.baseExperiment }}</p>
            </div>
          </div>
          <div class="counterfactual-target counterfactual-target--empty block" v-else>
            <strong>尚未选择反事实实验对象</strong>
            <p>请先在右侧导入实验报告，或切换到已导入报告的事中实验。</p>
          </div>

          <div class="control-params parameter-control-panel" v-if="activeCounterfactualExperiment">
            <div class="control-params__head">
              <label>可修改实验参数</label>
              <span class="badge-tag">来自事中实验</span>
            </div>
            <div class="parameter-control-list">
              <div v-for="parameter in activeCounterfactualParams" :key="parameter.key" class="parameter-control-item">
                <div class="parameter-control-meta">
                  <label>{{ parameter.label }}</label>
                  <span>{{ parameter.description }}</span>
                </div>
                <div class="parameter-control-input">
                  <input
                    type="number"
                    :min="parameter.min"
                    :max="parameter.max"
                    :step="parameter.step"
                    v-model.number="parameter.value"
                    @input="syncCounterfactualParameter(parameter)"
                    :disabled="simState === 'running' || simState === 'preparing'"
                    class="control-input"
                  />
                  <span class="control-unit">{{ parameter.unit }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="control-buttons">
            <button class="btn btn-secondary" @click="connectSim" :disabled="isConnected || simState === 'preparing' || runState.running">初始化 / 连接</button>
            <button class="btn btn-primary" @click="startSim" :disabled="simState === 'running' || !isConnected || simState === 'preparing' || !activeCounterfactualExperiment">运行</button>
            <button class="btn btn-ghost" @click="resetSim" :disabled="runState.running">重置</button>
            <button class="btn btn-primary" @click="generateReport" :disabled="!runState.result">生成报告</button>
          </div>

          <div class="backend-run-status block">
            <div class="backend-run-status__head">
              <span>后端实验运行</span>
              <span class="status-dot" :data-status="runState.status || simState"></span>
            </div>
            <p>{{ runState.message }}</p>
            <div class="backend-task-meta" v-if="runState.taskId">
              <span>任务：{{ runState.taskId }}</span>
              <span>状态：{{ taskStatusText(runState.status) }}</span>
            </div>
            <div class="backend-task-error" v-if="runState.error">{{ runState.error }}</div>
            <div class="backend-result-grid" v-if="runState.result">
              <div>
                <span>最佳轮次</span>
                <strong>第 {{ runState.result.bestIteration || '--' }} 轮</strong>
              </div>
              <div>
                <span>完成率</span>
                <strong>{{ formatPercentValue(runState.result.completionRate) }}</strong>
              </div>
              <div>
                <span>积压率</span>
                <strong>{{ formatPercentValue(runState.result.backlogRate) }}</strong>
              </div>
              <div>
                <span>综合评分</span>
                <strong>{{ formatNullableNumber(runState.result.overallScore, 3) }}</strong>
              </div>
            </div>
          </div>

          <div class="during-adjust block">
            <div class="during-adjust-header">
              <span>反事实实验决策</span>
              <span class="during-adjust-tip">切换后可编辑参数</span>
            </div>

            <div class="simulation-progress-section">
              <div class="progress-header">
                <span class="progress-label">仿真进度</span>
                <span class="progress-time">{{ simStep }} / {{ SIM_TOTAL_STEPS }} 轮</span>
              </div>
              <div class="progress-bar-wrapper">
                <div class="progress-bar-container">
                  <div class="progress-bar-fill" :style="{ width: simProgress + '%' }"></div>
                  <div
                    v-for="event in eventConfigs"
                    :key="event.id"
                    class="event-marker"
                    :style="{ left: (event.triggerStep / SIM_TOTAL_STEPS * 100) + '%' }"
                    :class="{ triggered: triggeredEventIds.has(event.id) }"
                    :title="`${event.name} - 第${event.triggerStep}轮`"
                  >
                    <span class="event-marker-tooltip">{{ event.name }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="during-adjust-grid">
              <div class="adjust-item">
                <label class="adjust-label">当前状态</label>
                <div class="event-summary-value">{{ eventStatusLabel }}</div>
              </div>
              <div class="adjust-item" v-if="lastEventDecisionLabel">
                <label class="adjust-label">上次决策</label>
                <div class="event-summary-value highlight">{{ lastEventDecisionLabel }}</div>
              </div>
            </div>

            <div class="during-adjust-actions">
              <el-button type="primary" size="default" @click="openEventDecisionDialog" :disabled="!eventTriggered || eventResolved">进行事件决策</el-button>
              <el-button size="default" @click="forceTriggerEvent">立即触发下一事件</el-button>
            </div>
          </div>

          <div class="confirmed-panel" v-if="activeCounterfactualExperiment">
            <h4>反事实实验对象摘要</h4>
            <div class="confirmed-summary-row">
              <div><strong>名称：</strong>{{ activeCounterfactualExperiment.label }}</div>
              <div><strong>干预变量：</strong>{{ activeCounterfactualExperiment.arguments.intervention }}</div>
              <div><strong>产能方案：</strong>{{ activeCounterfactualExperiment.arguments.capacityPlan }}</div>
            </div>
            <div class="confirmed-actions">
              <el-button size="small" @click="clearConfirmedExperiment">取消对象</el-button>
            </div>
          </div>
        </div>
      </section>

      <section class="charts-panel settings-panel panel-card panel-card--purple">
        <div class="settings-header">
          <div class="header-text">
            <h3>单实验自定义</h3>
            <p>选择实验以编辑 Arguments 与 Status 字段</p>
          </div>
          <el-button type="primary" plain size="small" @click="createExperiment">新增实验</el-button>
        </div>

        <div class="experiment-switcher">
          <button
            v-for="experiment in experiments"
            :key="experiment.id"
            class="experiment-pill"
            :class="{ active: selectedExperimentId === experiment.id }"
            @click="selectedExperimentId = experiment.id"
          >
            {{ experiment.label }}
          </button>
        </div>

        <el-scrollbar class="settings-scroll">
          <el-card class="group-card" shadow="hover" v-if="selectedExperiment">
            <template #header>
              <div class="group-card__header">
                <strong>{{ selectedExperiment?.label || '未选择实验' }}</strong>
                <div class="group-card__actions">
                  <el-button v-if="selectedExperiment?.hasReport" link type="primary" size="small" @click="duplicateExperiment">复制</el-button>
                  <el-button v-if="selectedExperiment?.hasReport" link type="danger" size="small" @click="resetImportedExperiment(selectedExperiment)">删除</el-button>
                  <el-button v-else-if="experiments.length > 2" link type="danger" size="small" @click="removeExperiment">移除空卡</el-button>
                </div>
              </div>
            </template>

            <div v-if="!selectedExperiment.hasReport" class="empty-experiment">
              <div class="empty-experiment__title">无内容，需导入实验报告</div>
              <p>导入事中阶段生成的实验报告后，将自动提取实验背景、关键指标与反事实实验需要修改的参数。</p>
            </div>

            <div v-else class="report-breakdown">
              <div class="report-breakdown__head">
                <div>
                  <span class="report-source">{{ selectedExperiment.report.source }}</span>
                  <h4>{{ selectedExperiment.report.title }}</h4>
                </div>
                <span class="report-status">已导入</span>
              </div>
              <p class="report-background">{{ selectedExperiment.report.background }}</p>
              <div class="report-metrics">
                <div v-for="metric in selectedExperiment.report.keyMetrics" :key="metric.label">
                  <span>{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                </div>
              </div>
              <div class="parameter-section">
                <div class="section-title">需要修改的参数</div>
                <div class="parameter-list">
                  <div v-for="parameter in selectedExperiment.report.parametersToModify" :key="parameter.key" class="parameter-item">
                    <div>
                      <strong>{{ parameter.name }}</strong>
                      <p>{{ parameter.reason }}</p>
                    </div>
                    <span>{{ parameter.current }}</span>
                  </div>
                </div>
              </div>
            </div>

            <el-form v-if="selectedExperiment.hasReport" label-width="92px" label-position="left" class="group-form" size="default">
              <div class="form-section">
                <div class="section-title">Arguments</div>
                <el-form-item label="名称">
                  <el-input v-model="selectedExperiment.arguments.name" placeholder="实验名称" />
                </el-form-item>
                <el-form-item label="基准实验">
                  <el-select v-model="selectedExperiment.arguments.baseExperiment" filterable allow-create>
                    <el-option v-for="item in presetOptions.baseExperiments" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="目标问题">
                  <el-select v-model="selectedExperiment.arguments.goal" filterable allow-create>
                    <el-option v-for="item in presetOptions.goals" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="干预变量">
                  <el-select v-model="selectedExperiment.arguments.intervention" filterable allow-create>
                    <el-option v-for="item in presetOptions.interventions" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="产能方案">
                  <el-select v-model="selectedExperiment.arguments.capacityPlan" filterable allow-create>
                    <el-option v-for="item in presetOptions.capacityPlans" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="需求强度">
                  <el-select v-model="selectedExperiment.arguments.demandLevel" filterable allow-create>
                    <el-option v-for="item in presetOptions.demands" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
              </div>

              <div class="form-divider"></div>

              <div class="form-section">
                <div class="section-title">Status</div>
                <el-form-item label="观测轮次">
                  <el-input v-model="selectedExperiment.status.observedRound" placeholder="例如 12" />
                </el-form-item>
                <el-form-item label="窗口标签">
                  <el-select v-model="selectedExperiment.status.observeLabel" filterable allow-create>
                    <el-option label="瓶颈暴露窗口" value="瓶颈暴露窗口" />
                    <el-option label="产能缓冲窗口" value="产能缓冲窗口" />
                    <el-option label="稳定完成率窗口" value="稳定完成率窗口" />
                    <el-option label="高压扰动窗口" value="高压扰动窗口" />
                  </el-select>
                </el-form-item>
                <el-form-item label="积压水平">
                  <el-input v-model="selectedExperiment.status.backlog" placeholder="例如 -18.6%" />
                </el-form-item>
                <el-form-item label="完成率">
                  <el-input v-model="selectedExperiment.status.counterCompletion" placeholder="例如 84.2%" />
                </el-form-item>
                <el-form-item label="风险类型">
                  <el-select v-model="selectedExperiment.status.tagType" filterable allow-create>
                    <el-option label="Danger" value="danger" />
                    <el-option label="Warning" value="warning" />
                    <el-option label="Success" value="success" />
                    <el-option label="Info" value="info" />
                  </el-select>
                </el-form-item>
                <el-form-item label="待运行">
                  <el-switch v-model="selectedExperiment.status.isPending" active-text="是" inactive-text="否" />
                </el-form-item>
              </div>
            </el-form>
          </el-card>
        </el-scrollbar>
      </section>
    </div>

    <el-dialog
      v-model="eventDialogVisible"
      title="供应链反事实事件决策"
      width="520px"
      top="8vh"
      :close-on-click-modal="false"
      class="modern-dialog"
      destroy-on-close
    >
      <div class="decision-dialog">
        <p class="decision-desc">{{ eventContext.description }}</p>
        <el-radio-group v-model="pendingDecision" class="decision-options">
          <el-radio-button label="提升制造总产能" />
          <el-radio-button label="扩大工厂协作范围" />
          <el-radio-button label="提高供应保障能力" />
        </el-radio-group>
      </div>
      <template #footer>
        <el-button @click="eventDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEventDecision">确认决策</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { runExperiment } from '@/api/scenarioModeling'
import { getQueueHistory } from '@/api/queue'
import { getExperimentDetail, healthCheck } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'

const SIM_TOTAL_STEPS = 15
const EMPTY_TEXT = '无内容，需导入实验报告'
const STORAGE_KEY = 'scnet_counterfactual_imported_reports'
const POLLING_INTERVAL_MS = 5000

const toFiniteNumber = (value, fallback = 0) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

const normalizeRate = (value, fallback = 0) => {
  const numberValue = toFiniteNumber(value, fallback)
  return numberValue > 1.5 ? numberValue / 100 : numberValue
}

const roundNumber = (value, digits = 2) => Number(toFiniteNumber(value).toFixed(digits))
const formatPercent = (value, digits = 1) => `${(normalizeRate(value) * 100).toFixed(digits)}%`
const formatNumber = (value, digits = 1) => toFiniteNumber(value).toFixed(digits)
const formatRange = (range) => Array.isArray(range) && range.length >= 2
  ? `${formatNumber(range[0])}-${formatNumber(range[1])}`
  : '--'

const buildCounterfactualParameterControls = (report) => {
  const capacityRange = Array.isArray(report.parameters.factoryCapacityRange)
    ? report.parameters.factoryCapacityRange
    : [0, 0]

  return [
    {
      key: 'order_multiplier',
      label: '市场需求强度',
      value: roundNumber(report.parameters.orderMultiplier, 2),
      unit: '倍',
      min: 0.5,
      max: 2,
      step: 0.05,
      description: '需求上升压力输入'
    },
    {
      key: 'factory_capacity_min',
      label: '制造总产能下限',
      value: roundNumber(capacityRange[0], 2),
      unit: '单位',
      min: 0,
      step: 0.01,
      description: '制造能力区间的保底值'
    },
    {
      key: 'factory_capacity_max',
      label: '制造总产能上限',
      value: roundNumber(capacityRange[1], 2),
      unit: '单位',
      min: 0,
      step: 0.01,
      description: '制造能力区间的峰值上限'
    },
    {
      key: 'reproduction_threshold',
      label: '再生产触发阈值',
      value: roundNumber(report.parameters.reproductionThreshold, 0),
      unit: '单位',
      min: 0,
      step: 10,
      description: '影响产能扩张触发时点'
    },
    {
      key: 'adjustment_ratio',
      label: '产能调整比例',
      value: roundNumber(normalizeRate(report.parameters.adjustmentRatio), 4),
      unit: '比例',
      min: 0,
      max: 1,
      step: 0.0001,
      description: '事中报告中识别到的产能调整幅度'
    }
  ]
}

const buildImportedReport = (report) => {
  const completionRate = normalizeRate(report.bestMetrics.orderCompletionRate)
  const backlogRate = Math.max(0, 1 - completionRate)
  const capacityRange = formatRange(report.parameters.factoryCapacityRange)
  const adjustmentRatio = formatPercent(report.parameters.adjustmentRatio)

  return {
    source: report.source,
    title: report.title,
    background: `该报告来自 ${report.timestamp} 的 ${report.totalIterations} 轮事中仿真。实验将市场需求强度设为 ${report.parameters.orderMultiplier.toFixed(2)}x，最佳轮次为第 ${report.bestIteration} 轮，但订单完成率仅 ${formatPercent(report.bestMetrics.orderCompletionRate)}，仍存在约 ${formatPercent(backlogRate)} 的订单积压，需要在反事实阶段重点调整制造总产能与产能响应阈值。`,
    keyMetrics: [
      { label: '最佳轮次', value: `第 ${report.bestIteration} 轮` },
      { label: '综合评分', value: report.bestScore.toFixed(3) },
      { label: '完成率', value: formatPercent(completionRate) },
      { label: '订单积压', value: formatPercent(backlogRate) },
      { label: '净利润', value: report.bestMetrics.totalNetProfit.toFixed(1) },
      { label: '平均鲁棒性', value: report.avgRobustness.toFixed(3) }
    ],
    parametersToModify: [
      {
        key: 'order_multiplier',
        name: '市场需求强度',
        current: `${report.parameters.orderMultiplier.toFixed(2)}x`,
        reason: '作为反事实实验的外部压力输入，用于复现实验报告中的需求上升背景。'
      },
      {
        key: 'factory_capacity_range',
        name: '制造总产能区间',
        current: capacityRange,
        reason: `报告中主要调整参数为制造产能区间，调整幅度约 ${adjustmentRatio}，后续需要比较不同扩产方案对积压和完成率的影响。`
      },
      {
        key: 'reproduction_threshold',
        name: '再生产触发阈值',
        current: `${report.parameters.reproductionThreshold}`,
        reason: '该阈值会影响产能扩张触发时点，适合作为产能响应速度的辅助干预变量。'
      }
    ],
    counterfactualParameters: buildCounterfactualParameterControls(report),
    suggestedCounterfactual: '优先测试制造总产能上调、产能阈值前置和分阶段扩产三类方案，并对比订单积压率与完成率稳定性。'
  }
}

const normalizeUploadedReport = (payload, fileName) => {
  const summary = payload?.summary || {}
  const iterations = Array.isArray(payload?.iterations) ? payload.iterations : []
  const bestIterationNumber = toFiniteNumber(summary.best_iteration, iterations[0]?.iteration || 1)
  const bestIteration = iterations.find((item) => Number(item?.iteration) === bestIterationNumber) || iterations[bestIterationNumber - 1] || iterations[0] || {}
  const firstIteration = iterations[0] || {}
  const firstParameters = firstIteration?.task?.parameters || firstIteration?.eval_scenario?.parameters || firstIteration?.scenario?.parameters || {}
  const parameters = bestIteration?.task?.parameters || bestIteration?.eval_scenario?.parameters || bestIteration?.scenario?.parameters || payload?.parameters || {}
  const metrics = bestIteration?.simulation_result?.metrics || bestIteration?.feedback?.metrics || bestIteration?.eval_scenario?.metrics || payload?.metrics || {}
  const orderCompletionRate = normalizeRate(
    metrics.order_completion_rate ?? metrics.completion_rate ?? summary.avg_completion_rate,
    0
  )
  const capacityRange = parameters.factory_capacity_range || parameters.manufacturer_production_capacity_range || parameters.capacity_range || [0, 0]

  return {
    source: fileName,
    title: `导入实验报告：${fileName}`,
    timestamp: payload?.timestamp ? String(payload.timestamp).replace('T', ' ').slice(0, 19) : '未知时间',
    totalIterations: toFiniteNumber(payload?.total_iterations ?? iterations.length, 1),
    bestIteration: bestIterationNumber,
    bestScore: toFiniteNumber(summary.best_score ?? bestIteration?.feedback?.overall_score ?? bestIteration?.feedback?.score, 0),
    avgCompletionRate: normalizeRate(summary.avg_completion_rate ?? orderCompletionRate, orderCompletionRate),
    avgRobustness: normalizeRate(summary.avg_robustness ?? bestIteration?.feedback?.robustness, 0),
    goal: bestIteration?.goal || payload?.goal || '市场需求强度上升时，制造总产能需要如何调整，才能减少订单积压并保持完成率稳定',
    parameters: {
      orderMultiplier: toFiniteNumber(firstParameters.order_multiplier ?? firstParameters.orderMultiplier ?? parameters.order_multiplier ?? parameters.orderMultiplier, 1),
      factoryCapacityRange: [
        toFiniteNumber(capacityRange[0]),
        toFiniteNumber(capacityRange[1])
      ],
      reproductionThreshold: toFiniteNumber(parameters.reproduction_threshold ?? parameters.reproductionThreshold, 0),
      adjustedParam: parameters.adjusted_param || parameters.adjustedParam || 'factory_capacity_range',
      adjustmentRatio: normalizeRate(parameters.adjustment_ratio ?? parameters.adjustmentRatio, 0)
    },
    bestMetrics: {
      totalOrders: toFiniteNumber(metrics.total_orders),
      completedOrders: toFiniteNumber(metrics.completed_orders),
      orderCompletionRate,
      totalNetProfit: toFiniteNumber(metrics.total_net_profit ?? metrics.net_profit),
      level1CompletionRate: normalizeRate(metrics.level1_completion_rate ?? orderCompletionRate, orderCompletionRate),
      level2CompletionRate: normalizeRate(metrics.level2_completion_rate, 0)
    }
  }
}

const createEmptyExperiment = (index) => ({
  id: `exp${String(index).padStart(2, '0')}`,
  label: `事中实验${index}`,
  hasReport: false,
  report: null,
  arguments: {
    name: `事中实验${index}`,
    baseExperiment: EMPTY_TEXT,
    goal: EMPTY_TEXT,
    intervention: EMPTY_TEXT,
    capacityPlan: EMPTY_TEXT,
    demandLevel: EMPTY_TEXT
  },
  status: {
    observedRound: '--',
    observeLabel: EMPTY_TEXT,
    baseCompletion: '--',
    counterCompletion: '--',
    backlog: EMPTY_TEXT,
    profitDelta: EMPTY_TEXT,
    resilience: '--',
    tagType: 'info',
    isPending: true
  }
})

const parseNumberFromText = (text, fallback = 0) => {
  const match = String(text || '').match(/-?\d+(?:\.\d+)?/)
  return match ? toFiniteNumber(match[0], fallback) : fallback
}

const buildStoredParameterFallback = (experiment) => {
  const parameters = experiment?.report?.parametersToModify || []
  const demand = parameters.find((item) => item.key === 'order_multiplier')
  const capacity = parameters.find((item) => item.key === 'factory_capacity_range')
  const threshold = parameters.find((item) => item.key === 'reproduction_threshold')
  const capacityValues = String(capacity?.current || '').match(/-?\d+(?:\.\d+)?/g) || []
  const adjustmentText = capacity?.reason || ''
  const adjustmentMatch = adjustmentText.match(/-?\d+(?:\.\d+)?%/)

  return [
    {
      key: 'order_multiplier',
      label: '市场需求强度',
      value: roundNumber(parseNumberFromText(demand?.current || experiment?.arguments?.demandLevel, 1), 2),
      unit: '倍',
      min: 0.5,
      max: 2,
      step: 0.05,
      description: '需求上升压力输入'
    },
    {
      key: 'factory_capacity_min',
      label: '制造总产能下限',
      value: roundNumber(capacityValues[0], 2),
      unit: '单位',
      min: 0,
      step: 0.01,
      description: '制造能力区间的保底值'
    },
    {
      key: 'factory_capacity_max',
      label: '制造总产能上限',
      value: roundNumber(capacityValues[1], 2),
      unit: '单位',
      min: 0,
      step: 0.01,
      description: '制造能力区间的峰值上限'
    },
    {
      key: 'reproduction_threshold',
      label: '再生产触发阈值',
      value: roundNumber(parseNumberFromText(threshold?.current, 0), 0),
      unit: '单位',
      min: 0,
      step: 10,
      description: '影响产能扩张触发时点'
    },
    {
      key: 'adjustment_ratio',
      label: '产能调整比例',
      value: adjustmentMatch ? roundNumber(normalizeRate(parseNumberFromText(adjustmentMatch[0]), 0), 4) : 0,
      unit: '比例',
      min: 0,
      max: 1,
      step: 0.0001,
      description: '事中报告中识别到的产能调整幅度'
    }
  ]
}

const applyReportToExperiment = (experiment, rawReport) => {
  const report = buildImportedReport(rawReport)
  const backlogRate = 1 - rawReport.bestMetrics.orderCompletionRate
  experiment.hasReport = true
  experiment.report = report
  experiment.arguments = {
    name: experiment.label,
    baseExperiment: rawReport.source,
    goal: rawReport.goal,
    intervention: '待选择反事实干预策略',
    capacityPlan: `制造总产能区间 ${formatRange(rawReport.parameters.factoryCapacityRange)}`,
    demandLevel: `需求强度 ${rawReport.parameters.orderMultiplier.toFixed(2)}x`
  }
  experiment.status = {
    observedRound: String(rawReport.bestIteration),
    observeLabel: '订单积压暴露窗口',
    baseCompletion: formatPercent(rawReport.avgCompletionRate),
    counterCompletion: formatPercent(rawReport.bestMetrics.orderCompletionRate),
    backlog: formatPercent(backlogRate),
    profitDelta: rawReport.bestMetrics.totalNetProfit.toFixed(1),
    resilience: rawReport.avgRobustness.toFixed(3),
    tagType: backlogRate > 0.35 ? 'warning' : 'success',
    isPending: false
  }
}

const simState = ref('idle')
const isConnected = ref(false)
const simStep = ref(0)
const demandMultiplierInput = ref(1.25)
const eventDialogVisible = ref(false)
const eventTriggered = ref(false)
const eventResolved = ref(false)
const lastEventDecision = ref('')
const pendingDecision = ref('提升制造总产能')
const triggeredEventIds = ref(new Set())
const selectedExperimentId = ref('exp01')
const confirmedExperimentId = ref(null)
const reportFileInput = ref(null)
const counterfactualParameters = ref([])
const runState = reactive({
  running: false,
  taskId: '',
  status: '',
  position: null,
  message: '尚未运行后端反事实实验。',
  error: '',
  resultPath: '',
  experimentId: '',
  result: null,
  submittedPayload: null,
  startedAt: '',
  completedAt: ''
})

const experiments = ref([
  createEmptyExperiment(1),
  createEmptyExperiment(2)
])

const normalizeStoredExperiments = (storedExperiments) => {
  const normalized = Array.isArray(storedExperiments)
    ? storedExperiments.map((item, index) => {
        const restored = {
          ...createEmptyExperiment(index + 1),
          ...item,
          arguments: {
            ...createEmptyExperiment(index + 1).arguments,
            ...(item?.arguments || {})
          },
          status: {
            ...createEmptyExperiment(index + 1).status,
            ...(item?.status || {})
          }
        }
        if (restored.report && !Array.isArray(restored.report.counterfactualParameters)) {
          restored.report.counterfactualParameters = buildStoredParameterFallback(restored)
        }
        return restored
      })
    : []

  while (normalized.length < 2) {
    normalized.push(createEmptyExperiment(normalized.length + 1))
  }

  return normalized
}

const persistCounterfactualState = () => {
  if (typeof window === 'undefined') return
  const payload = {
    experiments: experiments.value,
    selectedExperimentId: selectedExperimentId.value,
    confirmedExperimentId: confirmedExperimentId.value,
    counterfactualParameters: counterfactualParameters.value
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

const restoreCounterfactualState = () => {
  if (typeof window === 'undefined') return
  const savedState = window.localStorage.getItem(STORAGE_KEY)
  if (!savedState) return

  try {
    const payload = JSON.parse(savedState)
    experiments.value = normalizeStoredExperiments(payload?.experiments)
    selectedExperimentId.value = experiments.value.some((item) => item.id === payload?.selectedExperimentId)
      ? payload.selectedExperimentId
      : experiments.value[0].id
    confirmedExperimentId.value = experiments.value.some((item) => item.id === payload?.confirmedExperimentId)
      ? payload.confirmedExperimentId
      : null
    counterfactualParameters.value = Array.isArray(payload?.counterfactualParameters)
      ? payload.counterfactualParameters
      : []
    if (confirmedExperimentId.value && !counterfactualParameters.value.length) {
      const confirmed = experiments.value.find((item) => item.id === confirmedExperimentId.value)
      if (confirmed) applyCounterfactualObject(confirmed)
    }
    const demandParameter = counterfactualParameters.value.find((item) => item.key === 'order_multiplier')
    if (demandParameter) {
      demandMultiplierInput.value = demandParameter.value
    } else if (selectedExperiment.value?.hasReport) {
      applyCounterfactualObject(selectedExperiment.value)
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

const presetOptions = {
  baseExperiments: [
    '20260428_194240 缺失结果记录',
    '20260427_184416 缺失结果记录',
    '20260425_104405 缺失结果记录',
    '从队列参数创建基准'
  ],
  goals: [
    '市场需求强度上升时，制造总产能需要如何调整，才能减少订单积压并保持完成率稳定',
    '工厂协作范围扩大后，协作次数上升是否真的能带来更高的订单完成率',
    '如何优化制造总厂与工厂的协作半径和分布位置，使订单分配效率最大化'
  ],
  interventions: [
    '不干预，沿用原始参数',
    '制造总产能 +15%，工厂协作范围 +20%',
    '供应保障能力 +20%',
    '市场需求强度 -10%',
    '库存容量上限 +25%'
  ],
  capacityPlans: [
    '制造总产能保持基线区间',
    '需求峰值窗口阶梯式扩产',
    '高峰前置扩产并保留安全冗余',
    '仅提升瓶颈工厂产能'
  ],
  demands: [
    '需求强度 1.10x',
    '需求强度 1.25x',
    '需求强度 1.40x',
    '需求强度 1.60x'
  ]
}

const eventConfigs = [
  { id: 'event1', name: '需求上升', triggerStep: 4 },
  { id: 'event2', name: '订单积压', triggerStep: 8 },
  { id: 'event3', name: '产能决策', triggerStep: 12 }
]

const stateLabel = computed(() => {
  if (simState.value === 'running') return 'RUNNING'
  if (simState.value === 'paused') return 'PAUSED'
  if (simState.value === 'preparing') return 'PREPARING'
  return 'READY'
})

const simProgress = computed(() => Math.min(100, (simStep.value / SIM_TOTAL_STEPS) * 100))
const selectedExperiment = computed(() => experiments.value.find((item) => item.id === selectedExperimentId.value) || experiments.value[0])
const confirmedExperiment = computed(() => experiments.value.find((item) => item.id === confirmedExperimentId.value) || null)
const activeCounterfactualExperiment = computed(() => confirmedExperiment.value || (selectedExperiment.value?.hasReport ? selectedExperiment.value : null))
const activeCounterfactualParams = computed(() => {
  if (counterfactualParameters.value.length) return counterfactualParameters.value
  if (!activeCounterfactualExperiment.value) return []
  if (!Array.isArray(activeCounterfactualExperiment.value.report?.counterfactualParameters)) {
    return buildStoredParameterFallback(activeCounterfactualExperiment.value)
  }
  return activeCounterfactualExperiment.value.report.counterfactualParameters
})

const eventStatusLabel = computed(() => {
  if (eventResolved.value) return '已完成决策'
  if (eventTriggered.value) return '事件已触发，等待决策'
  const nextEvent = eventConfigs.find((item) => !triggeredEventIds.value.has(item.id))
  return nextEvent ? '等待事件触发' : '所有事件已完成'
})

const lastEventDecisionLabel = computed(() => lastEventDecision.value || '')

const eventContext = computed(() => ({
  title: '反事实实验决策',
  description: `当前实验「${selectedExperiment.value?.label || '--'}」进入产能调整决策窗口，请选择干预策略。`
}))

let timer = null
let runPollingTimer = null

const getActiveParameterValue = (key, fallback = 0) => {
  const parameter = activeCounterfactualParams.value.find((item) => item.key === key)
  return toFiniteNumber(parameter?.value, fallback)
}

const buildCounterfactualParamOverrides = () => {
  const capacityMin = getActiveParameterValue('factory_capacity_min')
  const capacityMax = getActiveParameterValue('factory_capacity_max')
  const capacityRange = capacityMin <= capacityMax
    ? [capacityMin, capacityMax]
    : [capacityMax, capacityMin]

  return {
    order_multiplier: getActiveParameterValue('order_multiplier', demandMultiplierInput.value),
    factory_capacity_range: capacityRange,
    manufacturer_production_capacity_range: capacityRange,
    reproduction_threshold: getActiveParameterValue('reproduction_threshold'),
    adjustment_ratio: getActiveParameterValue('adjustment_ratio')
  }
}

const buildCounterfactualRunPayload = () => {
  const paramOverrides = buildCounterfactualParamOverrides()
  return {
    scenario: 'supply_chain',
    iterations: SIM_TOTAL_STEPS,
    model: 'qwen',
    planner_strategy: 'native',
    use_decompose: false,
    enable_llm: false,
    llm_enabled: false,
    phase: 'post',
    source_page: 'CounterfactualExperiment',
    user_goal: activeCounterfactualExperiment.value?.arguments?.goal || presetOptions.goals[0],
    baseline_report: activeCounterfactualExperiment.value?.report?.source || '',
    counterfactual_experiment_name: activeCounterfactualExperiment.value?.label || '',
    param_overrides: paramOverrides,
    subtask_variable_configs: {
      counterfactual_runtime: {
        paramOverrides
      }
    },
    agent_node_configs: {
      factory: {
        params: {
          capacity_range: paramOverrides.factory_capacity_range
        }
      },
      manufacturing_corporation: {
        params: {
          capacity_range: paramOverrides.factory_capacity_range
        }
      }
    },
    scenario_context: {
      actual_problem: presetOptions.goals[0],
      source_experiment: activeCounterfactualExperiment.value?.label || '',
      source_report: activeCounterfactualExperiment.value?.report?.source || '',
      selected_parameters: activeCounterfactualParams.value.map((item) => ({
        key: item.key,
        label: item.label,
        value: item.value,
        unit: item.unit
      }))
    }
  }
}

const resetRunState = (message = '尚未运行后端反事实实验。') => {
  stopRunPolling()
  runState.running = false
  runState.taskId = ''
  runState.status = ''
  runState.position = null
  runState.message = message
  runState.error = ''
  runState.resultPath = ''
  runState.experimentId = ''
  runState.result = null
  runState.submittedPayload = null
  runState.startedAt = ''
  runState.completedAt = ''
}

const connectSim = async () => {
  if (!activeCounterfactualExperiment.value) {
    ElMessage.warning('请先导入并选择一个事中实验报告')
    return
  }

  simState.value = 'preparing'
  runState.error = ''
  runState.message = '正在连接后端反事实实验环境...'

  try {
    unwrapApiData(await healthCheck())
    isConnected.value = true
    simState.value = 'idle'
    runState.message = '后端连接正常，可按当前参数提交反事实重跑实验。'
    ElMessage.success('已连接后端反事实实验环境')
  } catch (error) {
    isConnected.value = false
    simState.value = 'idle'
    runState.error = `后端连接失败：${error?.message || '请确认后端服务已启动'}`
    runState.message = '初始化失败，暂不能提交反事实重跑实验。'
    ElMessage.error(runState.error)
  }
}

const startSim = async () => {
  if (!activeCounterfactualExperiment.value) {
    ElMessage.warning('请先导入并选择一个事中实验报告')
    return
  }
  if (!isConnected.value) {
    ElMessage.warning('请先初始化连接后端')
    return
  }
  if (runState.running) return

  if (timer) clearInterval(timer)
  resetRunState('正在提交后端反事实实验任务...')
  const payload = buildCounterfactualRunPayload()
  runState.running = true
  runState.status = 'queued'
  runState.submittedPayload = payload
  runState.startedAt = new Date().toLocaleString()
  simStep.value = 0
  simState.value = 'running'
  startLocalProgressTicker()

  try {
    const response = unwrapApiData(await runExperiment(payload))
    if (!response?.task_id || response.status === 'error') {
      throw new Error(response?.message || '后端实验任务提交失败')
    }
    runState.taskId = response.task_id
    runState.status = response.status || 'queued'
    runState.position = response.position ?? null
    runState.message = '反事实实验已提交后端队列，正在等待真实仿真结果...'
    ElMessage.success('反事实实验已提交后端队列')
    startRunPolling()
  } catch (error) {
    runState.running = false
    runState.status = 'failed'
    runState.error = `提交失败：${error?.message || '未知错误'}`
    runState.message = '后端反事实实验提交失败。'
    simState.value = 'idle'
    ElMessage.error(runState.error)
  }
}

const startLocalProgressTicker = () => {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (simState.value !== 'running' || simStep.value >= SIM_TOTAL_STEPS - 1) {
      return
    }
    simStep.value += 1
  }, 2500)
}

const pauseSim = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  simState.value = 'paused'
}

const resetSim = () => {
  if (timer) clearInterval(timer)
  timer = null
  stopRunPolling()
  simStep.value = 0
  eventTriggered.value = false
  eventResolved.value = false
  lastEventDecision.value = ''
  triggeredEventIds.value = new Set()
  isConnected.value = false
  simState.value = 'idle'
  resetRunState()
  ElMessage.success('实验已重置')
}

const generateReport = () => {
  if (!runState.result) {
    ElMessage.warning('请先运行并等待后端反事实实验完成')
    return
  }

  const report = {
    title: '供应链反事实实验报告',
    generatedAt: new Date().toISOString(),
    sourceExperiment: {
      label: activeCounterfactualExperiment.value?.label || '',
      report: activeCounterfactualExperiment.value?.report?.source || ''
    },
    task: {
      taskId: runState.taskId,
      status: runState.status,
      experimentId: runState.experimentId,
      resultPath: runState.resultPath,
      startedAt: runState.startedAt,
      completedAt: runState.completedAt
    },
    submittedParameters: buildCounterfactualParamOverrides(),
    submittedPayload: runState.submittedPayload,
    result: runState.result,
    conclusion: buildCounterfactualConclusion(runState.result)
  }
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `counterfactual_report_${runState.experimentId || Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('反事实实验报告已生成')
}

const startRunPolling = () => {
  stopRunPolling()
  runPollingTimer = window.setInterval(pollRunTask, POLLING_INTERVAL_MS)
  pollRunTask()
}

const stopRunPolling = () => {
  if (runPollingTimer) {
    window.clearInterval(runPollingTimer)
    runPollingTimer = null
  }
}

const pollRunTask = async () => {
  if (!runState.taskId) return

  try {
    const history = unwrapApiData(await getQueueHistory(80)) || []
    const task = history.find((item) => item.task_id === runState.taskId)
    if (!task) {
      runState.message = '后端任务已提交，等待队列返回状态...'
      return
    }

    runState.status = task.status || runState.status
    runState.position = task.position ?? runState.position
    runState.resultPath = task.result_path || runState.resultPath

    if (task.status === 'failed') {
      runState.running = false
      runState.error = task.error_message || '后端实验运行失败'
      runState.message = '后端反事实实验异常中止。'
      simState.value = 'idle'
      stopRunPolling()
      stopLocalProgressTicker()
      return
    }

    if (task.status === 'completed' && task.result_path) {
      const experimentId = extractExperimentId(task.result_path)
      runState.experimentId = experimentId
      if (experimentId) {
        const detail = unwrapApiData(await getExperimentDetail(experimentId))
        runState.result = summarizeCounterfactualResult(detail)
      }
      runState.running = false
      runState.completedAt = new Date().toLocaleString()
      runState.message = '后端反事实实验已完成，结果摘要已更新，可生成报告。'
      simState.value = 'idle'
      simStep.value = SIM_TOTAL_STEPS
      stopRunPolling()
      stopLocalProgressTicker()
      ElMessage.success('反事实实验后端重跑完成')
      return
    }

    runState.message = `后端实验运行中：${taskStatusText(runState.status)}`
  } catch (error) {
    runState.message = `轮询后端队列失败，稍后自动重试：${error?.message || '未知错误'}`
  }
}

const stopLocalProgressTicker = () => {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

const extractExperimentId = (resultPath = '') => {
  const matched = String(resultPath).match(/multi_agent_report_(\d{8}_\d{6})\.json$/)
  return matched ? matched[1] : ''
}

const findBestIteration = (iterations = []) => {
  if (!Array.isArray(iterations) || !iterations.length) return null
  return iterations.reduce((best, item) => {
    const bestScore = toFiniteNumber(best?.feedback?.overall_score, -1)
    const itemScore = toFiniteNumber(item?.feedback?.overall_score, -1)
    return itemScore > bestScore ? item : best
  }, iterations[0])
}

const summarizeCounterfactualResult = (detail = {}) => {
  const iterations = Array.isArray(detail.iterations) ? detail.iterations : []
  const best = findBestIteration(iterations) || {}
  const metrics = best.simulation_result?.metrics || best.feedback?.metrics || {}
  const params = best.task?.parameters || {}
  const totalOrders = toFiniteNumber(metrics.total_orders)
  const completedOrders = toFiniteNumber(metrics.completed_orders)
  const backlog = Math.max(totalOrders - completedOrders, 0)

  return {
    experimentId: detail.experiment_id || runState.experimentId,
    taskId: runState.taskId,
    bestIteration: best.iteration,
    totalIterations: iterations.length,
    completionRate: normalizeRate(metrics.order_completion_rate ?? metrics.completion_rate, null),
    backlogRate: totalOrders > 0 ? backlog / totalOrders : null,
    totalOrders,
    completedOrders,
    backlog,
    netProfit: toFiniteNumber(metrics.total_net_profit ?? metrics.net_profit, null),
    cooperationCount: toFiniteNumber(metrics.cooperation_count ?? metrics.collaboration_count, null),
    overallScore: toFiniteNumber(best.feedback?.overall_score ?? best.feedback?.score, null),
    orderMultiplier: toFiniteNumber(params.order_multiplier, null),
    capacityRange: params.factory_capacity_range || params.manufacturer_production_capacity_range,
    reproductionThreshold: toFiniteNumber(params.reproduction_threshold, null),
    rawParameters: params
  }
}

const buildCounterfactualConclusion = (result = {}) => {
  const completionRate = Number.isFinite(Number(result.completionRate))
    ? formatPercentValue(result.completionRate)
    : '--'
  const backlogRate = Number.isFinite(Number(result.backlogRate))
    ? formatPercentValue(result.backlogRate)
    : '--'
  const capacityRange = Array.isArray(result.capacityRange)
    ? formatRange(result.capacityRange)
    : '--'
  return `本次反事实重跑在制造总产能区间 ${capacityRange} 下完成，最佳轮次订单完成率为 ${completionRate}，积压率为 ${backlogRate}。`
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

const formatPercentValue = (value, digits = 1) => {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return '--'
  return `${(normalizeRate(numberValue) * 100).toFixed(digits)}%`
}

const formatNullableNumber = (value, digits = 2) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue.toFixed(digits) : '--'
}

const syncCounterfactualParameter = (parameter) => {
  if (parameter.key === 'order_multiplier') {
    demandMultiplierInput.value = parameter.value
  }
}

const triggerReportUpload = () => {
  reportFileInput.value?.click()
}

const handleReportUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
    ElMessage.warning('请上传 JSON 格式的实验报告文件')
    return
  }

  let normalizedReport
  try {
    const fileContent = await file.text()
    normalizedReport = normalizeUploadedReport(JSON.parse(fileContent), file.name)
  } catch {
    ElMessage.error('实验报告解析失败，请检查文件内容是否为有效 JSON')
    return
  }

  const importedSlot = experiments.value.find((item) => item.report?.source === normalizedReport.source)
  if (importedSlot) {
    selectedExperimentId.value = importedSlot.id
    applyCounterfactualObject(importedSlot)
    confirmedExperimentId.value = importedSlot.id
    ElMessage.info('该实验报告已导入，已同步为反事实实验对象')
    return
  }

  const emptySlot = experiments.value.find((item) => !item.hasReport)
  if (!emptySlot) {
    ElMessage.warning('当前没有空白事中实验选项卡，请先删除一个已导入报告')
    return
  }

  applyReportToExperiment(emptySlot, normalizedReport)
  selectedExperimentId.value = emptySlot.id
  applyCounterfactualObject(emptySlot)
  confirmedExperimentId.value = emptySlot.id
  ElMessage.success(`已导入 ${emptySlot.label} 的实验报告，并设为反事实实验对象`)
}

const applyCounterfactualObject = (experiment) => {
  if (experiment.report && !Array.isArray(experiment.report.counterfactualParameters)) {
    experiment.report.counterfactualParameters = buildStoredParameterFallback(experiment)
  }
  const parameters = experiment.report?.counterfactualParameters || []
  counterfactualParameters.value = structuredClone(parameters)
  const demandParameter = counterfactualParameters.value.find((item) => item.key === 'order_multiplier')
  demandMultiplierInput.value = demandParameter ? demandParameter.value : 1
}

const forceTriggerEvent = () => {
  const nextEvent = eventConfigs.find((item) => !triggeredEventIds.value.has(item.id))
  if (!nextEvent) return ElMessage.info('所有事件已完成')
  eventTriggered.value = true
  eventResolved.value = false
  pauseSim()
  eventDialogVisible.value = true
}

const openEventDecisionDialog = () => {
  if (!eventTriggered.value || eventResolved.value) return
  eventDialogVisible.value = true
}

const confirmEventDecision = () => {
  lastEventDecision.value = pendingDecision.value
  eventResolved.value = true
  eventTriggered.value = false
  const activeEvent = eventConfigs.find((item) => !triggeredEventIds.value.has(item.id))
  if (activeEvent) triggeredEventIds.value.add(activeEvent.id)
  eventDialogVisible.value = false
  if (selectedExperiment.value?.status) {
    selectedExperiment.value.status.tagType = 'success'
    selectedExperiment.value.status.counterCompletion = '84.2%'
    selectedExperiment.value.status.backlog = '-24.1%'
    selectedExperiment.value.status.profitDelta = '+21.4%'
    selectedExperiment.value.status.resilience = '0.76'
    selectedExperiment.value.status.isPending = false
  }
  startSim()
}

const clearConfirmedExperiment = () => {
  confirmedExperimentId.value = null
  counterfactualParameters.value = []
  demandMultiplierInput.value = 1.25
  ElMessage.info('已取消反事实实验对象')
}

const createExperiment = () => {
  const nextIndex = experiments.value.length + 1
  const newExp = createEmptyExperiment(nextIndex)
  experiments.value.push(newExp)
  selectedExperimentId.value = newExp.id
}

const duplicateExperiment = () => {
  if (!selectedExperiment.value) return
  if (!selectedExperiment.value.hasReport) return ElMessage.warning('当前事中实验无内容，无法复制')
  const copy = structuredClone(selectedExperiment.value)
  copy.id = `exp${String(experiments.value.length + 1).padStart(2, '0')}`
  copy.label = `${copy.label}-副本`
  copy.arguments.name = copy.label
  experiments.value.push(copy)
  selectedExperimentId.value = copy.id
}

const resetImportedExperiment = (experiment) => {
  if (!experiment) return
  const index = experiments.value.findIndex((item) => item.id === experiment.id)
  if (index < 0) return
  const resetExperiment = createEmptyExperiment(index + 1)
  resetExperiment.id = experiment.id
  resetExperiment.label = experiment.label
  resetExperiment.arguments.name = experiment.label
  experiments.value[index] = resetExperiment
  if (confirmedExperimentId.value === experiment.id) {
    confirmedExperimentId.value = null
    counterfactualParameters.value = []
  }
  selectedExperimentId.value = resetExperiment.id
  ElMessage.info(`${resetExperiment.label} 已重置为无内容状态`)
}

const removeExperiment = () => {
  if (experiments.value.length <= 1 || !selectedExperiment.value) return
  const idx = experiments.value.findIndex((item) => item.id === selectedExperimentId.value)
  experiments.value.splice(idx, 1)
  selectedExperimentId.value = experiments.value[0].id
}

onMounted(() => {
  restoreCounterfactualState()
})

onBeforeUnmount(() => {
  stopLocalProgressTicker()
  stopRunPolling()
})

watch(
  [experiments, selectedExperimentId, confirmedExperimentId, counterfactualParameters],
  persistCounterfactualState,
  { deep: true }
)

</script>

<style>
.scnet-counterfactual-cockpit {
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --secondary-color: #f1f5f9;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border-light: #e2e8f0;
  --bg-page: #f6f8fb;
  --bg-panel: #ffffff;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 6px 16px rgba(15, 23, 42, 0.06);
  --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
  box-sizing: border-box;
  background-color: var(--bg-page);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
}

.scnet-counterfactual-cockpit .page-head {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 14px 22px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.scnet-counterfactual-cockpit .page-head .eyebrow {
  margin: 0 0 6px;
  color: #3867f2;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.scnet-counterfactual-cockpit .page-head h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 900;
}

.scnet-counterfactual-cockpit .page-head .subtitle {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.scnet-counterfactual-cockpit .page-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.scnet-counterfactual-cockpit .report-file-input {
  display: none;
}

.scnet-counterfactual-cockpit .top-row {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 0;
}

.scnet-counterfactual-cockpit .panel-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-panel);
  box-shadow: var(--shadow-md);
  min-height: 0;
}

.scnet-counterfactual-cockpit .panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border-bottom: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
}

/* ---- 蓝色主题（控制面板） ---- */
.scnet-counterfactual-cockpit .panel-card--blue {
  border-top: 3px solid #3b82f6;
}

.scnet-counterfactual-cockpit .panel-card--blue .panel-header {
  border-bottom-color: #dbeafe;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.scnet-counterfactual-cockpit .panel-card--blue .panel-header .eyebrow {
  color: #3b82f6;
}

/* ---- 紫色主题（设置面板） ---- */
.scnet-counterfactual-cockpit .panel-card--purple {
  border-top: 3px solid #8b5cf6;
}

.scnet-counterfactual-cockpit .panel-card--purple .settings-header {
  border-bottom-color: #ddd6fe;
  background: linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%);
}

.scnet-counterfactual-cockpit .panel-card--purple .section-title {
  color: #7c3aed;
}

.scnet-counterfactual-cockpit .panel-card--purple .experiment-pill.active {
  border-color: #7c3aed;
  background: #7c3aed;
  color: #ffffff;
}

.scnet-counterfactual-cockpit .eyebrow {
  margin: 0 0 4px 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.scnet-counterfactual-cockpit .panel-header h3,
.scnet-counterfactual-cockpit .settings-header h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 18px;
  font-weight: 800;
}

.scnet-counterfactual-cockpit .panel-body {
  flex: 1 1 auto;
  padding: 14px;
  overflow-y: auto;
  min-height: 0;
}

.scnet-counterfactual-cockpit .stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scnet-counterfactual-cockpit .state-badge {
  padding: 4px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #3b82f6;
  font-size: 12px;
  font-weight: 800;
}

.scnet-counterfactual-cockpit .state-badge[data-state='running'] {
  border-color: #a7f3d0;
  background: #ecfdf5;
  color: #047857;
}

.scnet-counterfactual-cockpit .state-badge[data-state='preparing'] {
  border-color: #fde68a;
  background: #fffbeb;
  color: #b45309;
}

.scnet-counterfactual-cockpit .control-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.scnet-counterfactual-cockpit .stat-card {
  padding: 12px 16px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: #f8fafc;
}

.scnet-counterfactual-cockpit .stat-card .label {
  margin: 0 0 4px 0;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
}

.scnet-counterfactual-cockpit .stat-card .value {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 800;
}

.scnet-counterfactual-cockpit .text-success {
  color: #10b981 !important;
}

.scnet-counterfactual-cockpit .control-params,
.scnet-counterfactual-cockpit .during-adjust,
.scnet-counterfactual-cockpit .backend-run-status,
.scnet-counterfactual-cockpit .counterfactual-target {
  padding: 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: #f8fafc;
}

.scnet-counterfactual-cockpit .counterfactual-target {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.scnet-counterfactual-cockpit .counterfactual-target--empty {
  border-style: dashed;
  border-color: #cbd5e1;
  background: #f8fafc;
}

.scnet-counterfactual-cockpit .counterfactual-target__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 900;
}

.scnet-counterfactual-cockpit .counterfactual-target__body strong,
.scnet-counterfactual-cockpit .counterfactual-target--empty strong {
  display: block;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 900;
}

.scnet-counterfactual-cockpit .counterfactual-target__body p,
.scnet-counterfactual-cockpit .counterfactual-target--empty p {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.scnet-counterfactual-cockpit .control-params__head,
.scnet-counterfactual-cockpit .during-adjust-header,
.scnet-counterfactual-cockpit .progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scnet-counterfactual-cockpit .control-params__head {
  margin-bottom: 8px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 700;
}

.scnet-counterfactual-cockpit .badge-tag {
  padding: 2px 8px;
  border-radius: 4px;
  background: #dbeafe;
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 700;
}

.scnet-counterfactual-cockpit .control-params__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.scnet-counterfactual-cockpit .control-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  outline: none;
  font-family: inherit;
  font-size: 13px;
}

.scnet-counterfactual-cockpit .control-unit {
  color: var(--text-muted);
  font-size: 14px;
}

.scnet-counterfactual-cockpit .parameter-control-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scnet-counterfactual-cockpit .parameter-control-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scnet-counterfactual-cockpit .parameter-control-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
  gap: 12px;
  align-items: center;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.scnet-counterfactual-cockpit .parameter-control-meta label {
  display: block;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 800;
}

.scnet-counterfactual-cockpit .parameter-control-meta span {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.scnet-counterfactual-cockpit .parameter-control-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.scnet-counterfactual-cockpit .control-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.scnet-counterfactual-cockpit .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition);
}

.scnet-counterfactual-cockpit .btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.scnet-counterfactual-cockpit .btn-primary {
  background: var(--primary-color);
  color: #ffffff;
}

.scnet-counterfactual-cockpit .btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.scnet-counterfactual-cockpit .btn-secondary {
  background: var(--secondary-color);
  color: var(--text-main);
}

.scnet-counterfactual-cockpit .backend-run-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-color: #c7d2fe;
  background: #eef2ff;
}

.scnet-counterfactual-cockpit .backend-run-status__head,
.scnet-counterfactual-cockpit .backend-task-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.scnet-counterfactual-cockpit .backend-run-status__head {
  color: #3730a3;
  font-size: 13px;
  font-weight: 900;
}

.scnet-counterfactual-cockpit .backend-run-status p {
  margin: 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.55;
}

.scnet-counterfactual-cockpit .backend-task-meta {
  flex-wrap: wrap;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.scnet-counterfactual-cockpit .backend-task-error {
  padding: 8px 10px;
  border: 1px solid #fecaca;
  border-radius: 6px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 700;
}

.scnet-counterfactual-cockpit .status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #94a3b8;
}

.scnet-counterfactual-cockpit .status-dot[data-status='running'],
.scnet-counterfactual-cockpit .status-dot[data-status='queued'],
.scnet-counterfactual-cockpit .status-dot[data-status='pending'] {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
}

.scnet-counterfactual-cockpit .status-dot[data-status='completed'] {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.scnet-counterfactual-cockpit .status-dot[data-status='failed'] {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.scnet-counterfactual-cockpit .backend-result-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.scnet-counterfactual-cockpit .backend-result-grid div {
  padding: 8px;
  border: 1px solid #dbeafe;
  border-radius: 6px;
  background: #ffffff;
}

.scnet-counterfactual-cockpit .backend-result-grid span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.scnet-counterfactual-cockpit .backend-result-grid strong {
  display: block;
  margin-top: 3px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
}

.scnet-counterfactual-cockpit .btn-warning {
  background: #f59e0b;
  color: #ffffff;
}

.scnet-counterfactual-cockpit .btn-ghost {
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
}

.scnet-counterfactual-cockpit .btn-outline {
  border: 1px solid var(--border-light);
  background: #ffffff;
  color: var(--text-main);
}

.scnet-counterfactual-cockpit .during-adjust-header {
  margin-bottom: 16px;
  color: var(--text-main);
  font-weight: 800;
}

.scnet-counterfactual-cockpit .during-adjust-tip,
.scnet-counterfactual-cockpit .progress-time,
.scnet-counterfactual-cockpit .adjust-label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
}

.scnet-counterfactual-cockpit .progress-label {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 700;
}

.scnet-counterfactual-cockpit .progress-bar-container {
  position: relative;
  height: 8px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.scnet-counterfactual-cockpit .progress-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--primary-color);
  transition: width 0.3s linear;
}

.scnet-counterfactual-cockpit .event-marker {
  position: absolute;
  top: 0;
  width: 4px;
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
}

.scnet-counterfactual-cockpit .event-marker.triggered {
  background: #ef4444;
}

.scnet-counterfactual-cockpit .event-marker-tooltip {
  display: none;
}

.scnet-counterfactual-cockpit .during-adjust-grid {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.scnet-counterfactual-cockpit .adjust-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scnet-counterfactual-cockpit .event-summary-value {
  padding: 6px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: #ffffff;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
}

.scnet-counterfactual-cockpit .event-summary-value.highlight {
  border-color: #bae6fd;
  background: #f0f9ff;
  color: #0369a1;
}

.scnet-counterfactual-cockpit .during-adjust-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.scnet-counterfactual-cockpit .confirmed-panel {
  margin-top: 12px;
  padding: 10px;
  border: 1px solid var(--border-light);
  border-left: 4px solid rgba(59, 130, 246, 0.18);
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff, #fbfdff);
}

.scnet-counterfactual-cockpit .confirmed-panel h4 {
  margin: 0 0 6px 0;
  color: var(--text-main);
  font-size: 15px;
}

.scnet-counterfactual-cockpit .confirmed-summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
}

.scnet-counterfactual-cockpit .confirmed-summary-row div {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(243, 246, 255, 0.7);
  color: var(--text-main);
  font-size: 13px;
}

.scnet-counterfactual-cockpit .scenario-panel {
  position: relative;
}

.scnet-counterfactual-cockpit .scenario-stage {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto auto auto 1fr;
  align-content: start;
  gap: 16px;
  padding: 24px;
  box-sizing: border-box;
  overflow-y: auto;
  background:
    linear-gradient(90deg, rgba(148, 163, 184, 0.13) 1px, transparent 1px),
    linear-gradient(180deg, rgba(148, 163, 184, 0.13) 1px, transparent 1px),
    radial-gradient(circle at 22% 15%, rgba(37, 99, 235, 0.14), transparent 32%),
    #ffffff;
  background-size: 32px 32px, 32px 32px, auto, auto;
}

.scnet-counterfactual-cockpit .stage-title p {
  margin: 0 0 6px;
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.scnet-counterfactual-cockpit .stage-title h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 21px;
  font-weight: 800;
  line-height: 1.25;
}

.scnet-counterfactual-cockpit .supply-flow {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 2px;
}

.scnet-counterfactual-cockpit .supply-flow::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 16px;
  bottom: 16px;
  width: 1px;
  background: linear-gradient(180deg, transparent, #cbd5e1 16%, #cbd5e1 84%, transparent);
}

.scnet-counterfactual-cockpit .supply-flow::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  top: 50%;
  height: 1px;
  background: linear-gradient(90deg, transparent, #cbd5e1 16%, #cbd5e1 84%, transparent);
}

.scnet-counterfactual-cockpit .flow-node {
  position: relative;
  z-index: 1;
  min-height: 118px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 15px;
  border: 1px solid var(--border-light);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
}

.scnet-counterfactual-cockpit .flow-node.active {
  transform: translateY(-4px);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.14);
}

.scnet-counterfactual-cockpit .node-role {
  display: inline-block;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.scnet-counterfactual-cockpit .flow-node strong {
  display: block;
  color: var(--text-main);
  font-size: 21px;
  font-weight: 900;
  line-height: 1.25;
}

.scnet-counterfactual-cockpit .flow-node p {
  margin: 10px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.55;
  word-break: normal;
}

.scnet-counterfactual-cockpit .flow-node.blue { border-color: #bfdbfe; }
.scnet-counterfactual-cockpit .flow-node.orange { border-color: #fed7aa; }
.scnet-counterfactual-cockpit .flow-node.red { border-color: #fecaca; }
.scnet-counterfactual-cockpit .flow-node.green { border-color: #bbf7d0; }

.scnet-counterfactual-cockpit .canvas-bottom {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 2px;
}

.scnet-counterfactual-cockpit .metric-card {
  min-width: 0;
  padding: 13px 12px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
}

.scnet-counterfactual-cockpit .metric-card span {
  display: block;
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.scnet-counterfactual-cockpit .metric-card strong {
  color: var(--text-main);
  font-size: 18px;
  font-weight: 900;
  line-height: 1.25;
}

.scnet-counterfactual-cockpit .stage-summary {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding-top: 2px;
}

.scnet-counterfactual-cockpit .stage-summary div {
  padding: 13px 14px;
  border: 1px solid rgba(191, 219, 254, 0.88);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.92), rgba(255, 255, 255, 0.9));
}

.scnet-counterfactual-cockpit .stage-summary span {
  display: block;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.scnet-counterfactual-cockpit .stage-summary strong {
  display: block;
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.45;
}

.settings-panel {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ddd6fe;
  background: linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%);
}

.settings-header p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.experiment-switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 20px 0;
}

.experiment-pill {
  padding: 6px 16px;
  border: 1px solid var(--border-light);
  border-radius: 999px;
  background: #f8fafc;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition);
}

.experiment-pill.active {
  border-color: var(--text-main);
  background: var(--text-main);
  color: #ffffff;
}

.settings-scroll {
  flex: 1 1 auto;
  min-height: 0;
  padding: 16px 20px;
}

.group-card {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}

.group-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
}

.group-card__actions {
  display: flex;
  gap: 8px;
}

.empty-experiment {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 260px;
  padding: 28px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  text-align: center;
}

.empty-experiment__title {
  color: var(--text-main);
  font-size: 18px;
  font-weight: 900;
}

.empty-experiment p {
  max-width: 360px;
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.7;
}

.report-breakdown {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 18px;
  padding: 14px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.report-breakdown__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.report-breakdown h4 {
  margin: 4px 0 0;
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.35;
}

.report-source {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.report-status {
  flex: 0 0 auto;
  padding: 3px 9px;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 12px;
  font-weight: 800;
}

.report-background {
  margin: 0;
  color: #334155;
  font-size: 13px;
  line-height: 1.75;
}

.report-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.report-metrics div {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: #ffffff;
}

.report-metrics span {
  display: block;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.report-metrics strong {
  display: block;
  margin-top: 4px;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 900;
}

.parameter-section .section-title {
  margin-bottom: 10px;
}

.parameter-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.parameter-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.parameter-item strong {
  display: block;
  color: var(--text-main);
  font-size: 13px;
}

.parameter-item p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.parameter-item span {
  padding: 4px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.form-section {
  padding: 8px 0;
}

.section-title {
  margin-bottom: 16px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.form-divider {
  height: 1px;
  margin: 16px 0;
  background: var(--border-light);
}

.decision-desc {
  margin: 0 0 16px;
  color: var(--text-main);
  line-height: 1.7;
}

.decision-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.el-form-item__label) {
  color: var(--text-muted);
  font-weight: 700;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  border-radius: 6px;
  box-shadow: 0 0 0 1px var(--border-light) inset;
}

@media (max-width: 1440px) {
  .scnet-counterfactual-cockpit .top-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .scnet-counterfactual-cockpit {
    overflow-y: auto;
  }

  .scnet-counterfactual-cockpit .top-row {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .scnet-counterfactual-cockpit .panel-card {
    min-height: 400px;
  }

  .scnet-counterfactual-cockpit .scenario-stage {
    min-height: 520px;
  }
}
</style>
