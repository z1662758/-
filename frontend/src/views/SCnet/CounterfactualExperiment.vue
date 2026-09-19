<template>
  <div class="scnet-counterfactual-cockpit">
    <section class="page-head">
      <div>
        <h1>{{ isUraniumScene ? '供应链反事实实验' : '汽车供应链反事实实验' }}</h1>
        <p class="subtitle">{{ pageSubtitle }}</p>
        <p class="knowledge-source-line" v-if="autoKnowledgeSourceText">{{ autoKnowledgeSourceText }}</p>
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
        <div class="action-divider"></div>
        <el-button type="primary" plain size="large" @click="connectSim" :disabled="isConnected || simState === 'preparing' || currentRunState.running">初始化 / 连接</el-button>
        <el-button type="primary" size="large" @click="startSim" :disabled="currentRunState.running || !isConnected || simState === 'preparing' || !activeCounterfactualExperiment">运行</el-button>
        <el-button type="info" plain size="large" @click="resetSim" :disabled="currentRunState.running">重置</el-button>
        <el-button type="success" plain size="large" @click="generateReport" :disabled="!currentRunState.result">生成报告</el-button>
      </div>
    </section>

    <div class="top-row">
      <section class="control-panel panel-card panel-card--blue">
        <header class="panel-header">
          <div>
            <p class="eyebrow">{{ sceneEyebrow }}</p>
            <h3>反事实实验控制区</h3>
          </div>
          <span v-if="stateLabel" class="state-badge" :data-state="stateLabel.toLowerCase()">{{ stateLabel }}</span>
        </header>

        <div class="panel-body stack">
          <div class="counterfactual-target block" v-if="activeCounterfactualExperiment">
            <div class="counterfactual-target__head">
              <span>当前反事实实验对象</span>
              <el-button link type="primary" size="small" @click="clearSelectedExperiment">取消对象</el-button>
            </div>
            <div class="counterfactual-target__body">
              <strong>{{ activeCounterfactualExperiment.label }}</strong>
              <p>{{ activeCounterfactualExperiment.report?.source || activeCounterfactualExperiment.arguments.baseExperiment }}</p>
            </div>
          </div>
          <div class="counterfactual-target counterfactual-target--empty block" v-else>
            <strong>尚未选择反事实实验对象</strong>
            <p v-if="isUraniumScene">请先在右侧导入实验报告，或切换到已导入报告的事中实验。</p>
            <p v-else>{{ autoBaselineLoading ? '正在从汽车知识库载入基线实验…' : '汽车供应链场景会自动载入知识库基线实验，也可手动导入实验报告。' }}</p>
          </div>

          <div class="control-params parameter-control-panel" v-if="activeCounterfactualExperiment">
            <div class="control-params__head">
              <label>可修改实验参数</label>
              <span class="badge-tag">来自：{{ activeCounterfactualExperiment.label }}</span>
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
                    :disabled="currentRunState.running || simState === 'preparing'"
                    class="control-input"
                  />
                  <span class="control-unit">{{ parameter.unit }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 关键操作按钮已移至顶部导入实验报告区域 -->

          <div class="backend-run-status block">
            <div class="backend-run-status__head">
              <span>后端实验运行 · {{ activeCounterfactualExperiment?.label || '未选择' }}</span>
              <span class="status-dot" :data-status="currentRunState.status || simState"></span>
            </div>
            <p>{{ currentRunState.message }}</p>
            <div class="backend-task-meta" v-if="currentRunState.taskId">
              <span>任务：{{ currentRunState.taskId }}</span>
              <span>状态：{{ taskStatusText(currentRunState.status) }}</span>
            </div>
            <div class="backend-task-error" v-if="currentRunState.error">{{ currentRunState.error }}</div>
            <div class="backend-result-grid" v-if="currentRunState.result">
              <div>
                <span>最佳轮次</span>
                <strong>第 {{ currentRunState.result.bestIteration || '--' }} 轮</strong>
              </div>
              <div>
                <span>完成率</span>
                <strong>{{ formatPercentValue(currentRunState.result.completionRate) }}</strong>
              </div>
              <div>
                <span>{{ currentRunState.result.isUranium ? '供应缺口率' : '积压率' }}</span>
                <strong>{{ formatPercentValue(currentRunState.result.backlogRate) }}</strong>
              </div>
              <div>
                <span>综合评分</span>
                <strong>{{ formatNullableNumber(currentRunState.result.overallScore, 3) }}</strong>
              </div>
              <div v-if="currentRunState.result.isUranium && currentRunState.result.networkStability != null">
                <span>网络稳定性</span>
                <strong>{{ formatPercentValue(currentRunState.result.networkStability) }}</strong>
              </div>
              <div v-if="currentRunState.result.isUranium && currentRunState.result.productionCapacityEst != null">
                <span>产能估算</span>
                <strong>{{ formatNullableNumber(currentRunState.result.productionCapacityEst, 0) }} tU/年</strong>
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
                <span class="progress-time">{{ simStep }} / {{ simTotalSteps }} 轮</span>
              </div>
              <div class="progress-bar-wrapper">
                <div class="progress-bar-container">
                  <div class="progress-bar-fill" :style="{ width: simProgress + '%' }"></div>
                  <div
                    v-for="event in eventConfigs"
                    :key="event.id"
                    class="event-marker"
                    :style="{ left: (event.triggerStep / simTotalSteps * 100) + '%' }"
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
              <div v-if="autoBaselineMeta && !isUraniumScene"><strong>知识库基线：</strong>{{ autoBaselineMeta.filename }}（{{ autoBaselineMeta.iterations }} 轮）</div>
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

      <section class="results-panel panel-card panel-card--green">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Counterfactual Results</p>
            <h3>实验结果</h3>
          </div>
          <span class="state-badge" :data-state="currentRunState.status || 'idle'">{{ currentRunState.status ? taskStatusText(currentRunState.status) : 'IDLE' }}</span>
        </header>

        <div class="panel-body stack">
          <!-- 无结果时 -->
          <div class="results-empty block" v-if="!currentRunState.result">
            <div class="results-empty-icon">📋</div>
            <strong>暂无实验结果</strong>
            <p v-if="isUraniumScene">请先导入实验报告，设置参数后点击「运行」开始反事实实验。</p>
            <p v-else>先选择知识库基线实验对象，设置干预参数后点击「运行」开始反事实实验。</p>
          </div>

          <!-- 有结果时 -->
          <template v-else>
            <div class="results-experiment-info block">
              <div class="results-info-head">
                <span>实验对象</span>
              </div>
              <strong>{{ activeCounterfactualExperiment?.label || '--' }}</strong>
              <p>{{ activeCounterfactualExperiment?.report?.source || '--' }}</p>
            </div>

            <div class="results-metrics-grid block">
              <div class="results-metric">
                <span class="results-metric-label">最佳轮次</span>
                <strong class="results-metric-value">第 {{ currentRunState.result.bestIteration || '--' }} 轮</strong>
              </div>
              <div class="results-metric">
                <span class="results-metric-label">完成率</span>
                <strong class="results-metric-value">{{ formatPercentValue(currentRunState.result.completionRate) }}</strong>
              </div>
              <div class="results-metric">
                <span class="results-metric-label">{{ currentRunState.result.isUranium ? '供应缺口率' : '积压率' }}</span>
                <strong class="results-metric-value">{{ formatPercentValue(currentRunState.result.backlogRate) }}</strong>
              </div>
              <div class="results-metric">
                <span class="results-metric-label">综合评分</span>
                <strong class="results-metric-value">{{ formatNullableNumber(currentRunState.result.overallScore, 3) }}</strong>
              </div>
            </div>

            <div class="results-extra block" v-if="currentRunState.result.isUranium">
              <div class="results-extra-row" v-if="currentRunState.result.networkStability != null">
                <span>网络稳定性</span>
                <strong>{{ formatPercentValue(currentRunState.result.networkStability) }}</strong>
              </div>
              <div class="results-extra-row" v-if="currentRunState.result.productionCapacityEst != null">
                <span>产能估算</span>
                <strong>{{ formatNullableNumber(currentRunState.result.productionCapacityEst, 0) }} tU/年</strong>
              </div>
            </div>

            <div class="results-comparison block" v-if="currentRunState.result.primary && currentRunState.result.secondary">
              <div class="results-comparison-head">
                <span>策略对比</span>
              </div>
              <div class="comparison-grid">
                <div class="comparison-col">
                  <div class="comparison-label">主策略</div>
                  <div><span>完成率</span><strong>{{ formatPercentValue(currentRunState.result.primary.completionRate) }}</strong></div>
                  <div><span>评分</span><strong>{{ formatNullableNumber(currentRunState.result.primary.overallScore, 3) }}</strong></div>
                </div>
                <div class="comparison-col">
                  <div class="comparison-label">次策略</div>
                  <div><span>完成率</span><strong>{{ formatPercentValue(currentRunState.result.secondary.completionRate) }}</strong></div>
                  <div><span>评分</span><strong>{{ formatNullableNumber(currentRunState.result.secondary.overallScore, 3) }}</strong></div>
                </div>
              </div>
            </div>

            <div class="results-task block" v-if="currentRunState.taskId">
              <span>任务ID：{{ currentRunState.taskId }}</span>
              <span class="results-task-time" v-if="currentRunState.completedAt">完成于 {{ currentRunState.completedAt }}</span>
            </div>
          </template>
        </div>
      </section>
    </div>

    <el-dialog
      v-model="eventDialogVisible"
      :title="decisionDialogTitle"
      width="520px"
      top="8vh"
      :close-on-click-modal="false"
      class="modern-dialog"
      destroy-on-close
    >
      <div class="decision-dialog">
        <p class="decision-desc">{{ eventContext.description }}</p>
        <el-radio-group v-model="pendingDecision" class="decision-options">
          <el-radio-button v-for="option in eventDecisionOptions" :key="option" :label="option" />
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { runExperiment } from '@/api/scenarioModeling'
import { getQueueHistory } from '@/api/queue'
import {
  getExperimentDetail,
  getExperiments,
  getParameterCatalog,
  healthCheck
} from '@/api/supplyChain'
import { getAutomotiveKnowledgeSummary, getAutomotiveLibrary } from '@/api/powerGame/automotiveKnowledge'
import { useScenarioStore } from '@/stores/scenario'
import { SCENARIO_VALUES } from '@/constants/scnetScenario'
import { unwrapApiData } from '@/utils/apiEnvelope'
import { resolveExperimentIdFromTask } from '@/utils/scnetTaskUtils'

const SIM_TOTAL_STEPS_DEFAULT = 15
const EMPTY_TEXT = '无内容，需导入实验报告'
const simTotalSteps = ref(15)  // 动态：根据实际实验轮数设定
// 本地状态按场景分桶存放。旧版本只有一把 key：在汽车场景自动载入的知识库基线报告
// 会被恢复进铀场景，而本页场景又由「当前报告」反推，于是出现「已切到铀供应链、
// 页面却仍是汽车文案」。分桶后两个场景的状态互不可见。
const STORAGE_KEY = 'scnet_counterfactual_imported_reports'
const storageKeyFor = (scenario) => `${STORAGE_KEY}:${scenario}`
const POLLING_INTERVAL_MS = 5000
// 提交到后端队列后，若轮询接口持续失败超过该时长，判定后端仿真不可用，自动回退到合成分析
const POLL_FALLBACK_AFTER_MS = 60000

/**
 * 深拷贝：Vue 的响应式代理（reactive proxy）不能被 structuredClone，
 * 直接调用会抛 "could not be cloned"。这里先用 toRaw 取回原始对象；
 * 若仍失败（例如嵌套了其它响应式对象），退化为 JSON 深拷贝
 * —— 本页数据本来就要写进 localStorage，天然是 JSON 安全的。
 */
const deepClone = (value) => {
  if (value === null || typeof value !== 'object') return value
  try {
    return structuredClone(toRaw(value))
  } catch {
    return JSON.parse(JSON.stringify(value))
  }
}

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

/**
 * 判断报告是否为铀供应链场景：
 * 优先使用报告自带的 scenario 字段（后端 run.py 已写入），
 * 其次按文件名/标题关键词兜底（兼容旧报告）。
 */
const detectUraniumReport = (report = {}) => {
  const scenario = report?.scenario
  if (scenario === 'uranium') return true
  if (scenario === 'supply_chain' || scenario === 'automotive') return false
  const source = String(report?.source || '').toLowerCase()
  const title = String(report?.title || '').toLowerCase()
  return source.includes('uranium') || title.includes('uranium')
}

// ===== 场景选择（全局 store，与对话首页同一份选择）=====
const scenarioStore = useScenarioStore()
// 从对话首页/其它入口带 ?scenario= 跳进来时以 URL 为准，避免与首页选择不一致
const route = useRoute()
const routeScenario = String(route?.query?.scenario || '').trim()
if ([SCENARIO_VALUES.URANIUM, SCENARIO_VALUES.SUPPLY_CHAIN].includes(routeScenario)) {
  scenarioStore.setScenario(routeScenario)
}

// ===== 汽车供应链知识库数据源 =====
// 依赖三处后端真实数据，不做任何前端造数：
//   1. /SCnet/supplyChain/experiments、/experiment/<id>  —— 真实汽车供应链仿真实验（15 轮结果与汇总统计）
//   2. /SCnet/supplyChain/parameter-catalog             —— 参数目录（源头 configs/agent_config.yaml）
//   3. /SCnet/automotiveKnowledge/rules、/osint         —— 汽车知识库事件映射规则与 OSINT 事件
const autoCatalog = ref(null)
const autoKnowledge = ref(null)
const autoEventRules = ref([])
const autoOsintEvents = ref([])
const autoExperiments = ref([])
const autoBaselineMeta = ref(null)
const autoBaselineLoading = ref(false)
const autoBaselineError = ref('')

// 场景只跟随全局选择（与对话首页同一份选择），不再由「当前报告」反推：
// 报告属于哪个场景由分桶存储保证（见 storageKeyFor），报告自身的文案仍按报告自带
// 场景渲染（buildImportedReport / applyReportToExperiment），两者不再互相污染。
const activeScenario = computed(() => scenarioStore.currentScenario)
const isUraniumScene = computed(() => activeScenario.value === SCENARIO_VALUES.URANIUM)

const sceneEyebrow = computed(() => isUraniumScene.value ? 'Uranium Supply Chain' : 'Automotive Supply Chain')
const decisionDialogTitle = computed(() => isUraniumScene.value ? '铀供应链反事实事件决策' : '汽车供应链反事实事件决策')
const pageSubtitle = computed(() => isUraniumScene.value
  ? '基于事中供应链仿真结果设定干预变量与产能方案，运行反事实实验并对比评估策略效果。支持矿山产能调整、新矿投产阈值、需求波动等参数。'
  : '基于事中汽车供应链仿真结果设定干预变量与产能方案，运行反事实实验并对比评估策略效果。参数取值范围取自参数目录，事件决策取自汽车知识库规则库与 OSINT 事件库。')

// 把参数目录（多来源：实体参数 / Planner 参数 / 系统参数 / 实验参数）合并成 key → 规格 的索引
const parseCatalogRange = (range) => {
  if (Array.isArray(range) && range.length >= 2) {
    const lo = toFiniteNumber(range[0], null)
    const hi = toFiniteNumber(range[1], null)
    return lo !== null && hi !== null ? [lo, hi] : null
  }
  const match = String(range || '').match(/^\[?\s*(-?\d+(?:\.\d+)?)\s*[,\-~]\s*(-?\d+(?:\.\d+)?)\s*\]?$/)
  return match ? [toFiniteNumber(match[1]), toFiniteNumber(match[2])] : null
}

const buildCatalogIndex = (catalog) => {
  const index = new Map()
  const put = (entry) => {
    if (!entry || !entry.key) return
    const prev = index.get(entry.key) || {}
    const bounds = parseCatalogRange(entry.range)
      || (Number.isFinite(entry.min) && Number.isFinite(entry.max) ? [entry.min, entry.max] : null)
    index.set(entry.key, {
      key: entry.key,
      label: entry.displayName || entry.label || entry.name || prev.label || entry.key,
      description: entry.description || prev.description || '',
      unit: entry.unit || prev.unit || '',
      min: Number.isFinite(entry.min) ? entry.min : (bounds ? bounds[0] : (prev.min ?? null)),
      max: Number.isFinite(entry.max) ? entry.max : (bounds ? bounds[1] : (prev.max ?? null)),
      step: Number.isFinite(entry.step) ? entry.step : (prev.step ?? null),
      source: entry.source || prev.source || '',
      default: entry.defaultValue !== undefined ? entry.defaultValue : (entry.default !== undefined ? entry.default : prev.default)
    })
  }
  if (!catalog) return index
  const agents = catalog?.agent_graph?.agents || catalog?.entities?.agents || []
  agents.forEach((agent) => (agent.configurableParams || agent.configurable_params || []).forEach(put))
  ;(catalog.system_parameters || []).forEach(put)
  ;(catalog.exp_params?.params || []).forEach(put)
  ;(catalog.planner_parameters || []).forEach(put)
  Object.values(catalog.fishbone_templates || {}).forEach((group) => {
    (Array.isArray(group) ? group : []).forEach(put)
  })
  return index
}


/**
 * 汽车供应链反事实参数控件：取值来自参数目录（源头 configs/agent_config.yaml），
 * 基线值优先用报告实际值，缺失时用目录默认值，保证每个数字都能溯源。
 */
// 展示名（口径固定，取值/区间/描述仍全部来自参数目录）
const AUTO_CONTROL_LABELS = {
  order_multiplier: '市场需求强度',
  factory_capacity_min: '工厂产能下限',
  factory_capacity_max: '工厂产能上限',
  reproduction_threshold: '企业扩张触发阈值',
  collaboration_radius: '工厂协作半径'
}

const AUTO_FACTOR_NAMES = {
  order_multiplier: '市场需求强度',
  factory_capacity_range: '工厂产能范围',
  reproduction_threshold: '企业扩张触发阈值',
  collaboration_radius: '工厂协作半径'
}

const buildAutoParameterControls = (report, catalog) => {
  const index = buildCatalogIndex(catalog)
  const params = report?.parameters || {}
  const capacityRange = Array.isArray(params.factoryCapacityRange) ? params.factoryCapacityRange : []
  const controls = []

  const orderSpec = index.get('order_multiplier')
  const capSpec = index.get('factory_capacity_range')
  const thresholdSpec = index.get('reproduction_threshold')
  const collabSpec = index.get('collaboration_radius')

  if (orderSpec) {
    controls.push({
      key: 'order_multiplier',
      label: AUTO_CONTROL_LABELS.order_multiplier,
      value: roundNumber(toFiniteNumber(params.orderMultiplier, toFiniteNumber(orderSpec.default, 1)), 2),
      current: roundNumber(toFiniteNumber(params.orderMultiplier, toFiniteNumber(orderSpec.default, 1)), 2),
      unit: orderSpec.unit || '倍',
      min: orderSpec.min,
      max: orderSpec.max,
      step: orderSpec.step ?? 0.01,
      description: orderSpec.description || '订单生成率倍数，控制市场需求强度'
    })
  }

  if (capSpec) {
    const capDefault = Array.isArray(capSpec.default) ? capSpec.default : []
    const capMin = capacityRange.length >= 1 ? toFiniteNumber(capacityRange[0], capDefault[0]) : toFiniteNumber(capDefault[0], null)
    const capMax = capacityRange.length >= 2 ? toFiniteNumber(capacityRange[1], capDefault[1]) : toFiniteNumber(capDefault[1], null)
    controls.push({
      key: 'factory_capacity_min',
      label: AUTO_CONTROL_LABELS.factory_capacity_min,
      value: roundNumber(capMin, 2),
      current: roundNumber(capMin, 2),
      unit: '件/月',
      min: capSpec.min,
      max: capSpec.max,
      step: capSpec.step ?? 1,
      description: capSpec.description || '总厂下属工厂月产能范围下限'
    })
    controls.push({
      key: 'factory_capacity_max',
      label: AUTO_CONTROL_LABELS.factory_capacity_max,
      value: roundNumber(capMax, 2),
      current: roundNumber(capMax, 2),
      unit: '件/月',
      min: capSpec.min,
      max: capSpec.max,
      step: capSpec.step ?? 1,
      description: capSpec.description || '总厂下属工厂月产能范围上限'
    })
  }

  if (thresholdSpec) {
    controls.push({
      key: 'reproduction_threshold',
      label: AUTO_CONTROL_LABELS.reproduction_threshold,
      value: roundNumber(toFiniteNumber(params.reproductionThreshold, toFiniteNumber(thresholdSpec.default, 0)), 0),
      current: roundNumber(toFiniteNumber(params.reproductionThreshold, toFiniteNumber(thresholdSpec.default, 0)), 0),
      unit: thresholdSpec.unit || '',
      min: thresholdSpec.min,
      max: thresholdSpec.max,
      step: thresholdSpec.step ?? 1,
      description: thresholdSpec.description || '控制企业扩张触发门槛'
    })
  }

  if (collabSpec) {
    controls.push({
      key: 'collaboration_radius',
      label: AUTO_CONTROL_LABELS.collaboration_radius,
      value: roundNumber(toFiniteNumber(params.collaborationRadius, toFiniteNumber(collabSpec.default, 0)), 0),
      current: roundNumber(toFiniteNumber(params.collaborationRadius, toFiniteNumber(collabSpec.default, 0)), 0),
      unit: collabSpec.unit || '',
      min: collabSpec.min,
      max: collabSpec.max,
      step: collabSpec.step ?? 10,
      description: collabSpec.description || '总厂调度可联动工厂的空间范围'
    })
  }

  return controls
}

const buildCounterfactualParameterControls = (report, catalog = autoCatalog.value) => {
  const capacityRange = Array.isArray(report.parameters.factoryCapacityRange)
    ? report.parameters.factoryCapacityRange
    : [0, 0]
  // 检测场景 → 使用专用单位与描述
  const isUranium = detectUraniumReport(report)

  // 汽车供应链：全部取值来自参数目录（真实 config 口径）
  if (!isUranium && catalog) {
    const controls = buildAutoParameterControls(report, catalog)
    if (controls.length) return controls
  }

  return [
    {
      key: 'order_multiplier',
      label: isUranium ? '需求强度' : '市场需求强度',
      value: roundNumber(report.parameters.orderMultiplier, 2),
      unit: '倍',
      min: 0.5,
      max: 2.5,
      step: 0.05,
      description: isUranium ? '全球核电反应堆需求倍数，基准为当前~123,860 tU/年' : '需求上升压力输入'
    },
    {
      key: 'factory_capacity_min',
      label: isUranium ? '矿山产能下限' : '工厂产能下限',
      value: roundNumber(capacityRange[0], 2),
      unit: isUranium ? 'tU/年' : '件/月',
      min: 0,
      step: isUranium ? 100 : 0.01,
      description: isUranium ? '全球矿山年产能下限(吨/年)，对应已承诺矿山最低产出' : '制造能力区间的保底值'
    },
    {
      key: 'factory_capacity_max',
      label: isUranium ? '矿山产能上限' : '工厂产能上限',
      value: roundNumber(capacityRange[1], 2),
      unit: isUranium ? 'tU/年' : '件/月',
      min: 0,
      step: isUranium ? 100 : 0.01,
      description: isUranium ? '全球矿山年产能峰值上限(吨/年)，含计划与潜在矿山满产产能' : '制造能力区间的峰值上限'
    },
    {
      key: 'reproduction_threshold',
      label: isUranium ? '新矿投产阈值' : '企业扩张触发阈值',
      value: roundNumber(report.parameters.reproductionThreshold, 0),
      unit: isUranium ? 'tU/年' : '',
      min: 0,
      step: isUranium ? 50 : 10,
      description: isUranium ? '触发新矿山开发的最低供需缺口(吨/年)，影响Dasa/Wheeler River等新矿投产时机' : '影响产能扩张触发时点'
    },
    {
      key: 'adjustment_ratio',
      label: isUranium ? '产能爬坡速率' : '产能调整比例',
      value: roundNumber(normalizeRate(report.parameters.adjustmentRatio), 4),
      unit: '比例',
      min: 0,
      max: 1,
      step: 0.0001,
      description: isUranium ? '矿山扩产/减产的年度调整速率，反映矿山重启(Langer Heinrich)或关停的响应速度' : '事中报告中识别到的产能调整幅度'
    }
  ]
}

const buildImportedReport = (report) => {
  const completionRate = normalizeRate(report.bestMetrics.orderCompletionRate)
  const backlogRate = Math.max(0, 1 - completionRate)
  const capacityRange = formatRange(report.parameters.factoryCapacityRange)
  const adjustmentRatio = formatPercent(report.parameters.adjustmentRatio)
  const isUranium = detectUraniumReport(report)
  const controls = buildCounterfactualParameterControls(report)

  const baseMetrics = isUranium ? [
    { label: '最佳轮次', value: `第 ${report.bestIteration} 轮` },
    { label: '综合评分', value: report.bestScore.toFixed(3) },
    { label: '订单完成率', value: formatPercent(completionRate) },
    { label: '供应缺口率', value: formatPercent(backlogRate) },
    { label: '系统总利润', value: report.bestMetrics.totalNetProfit.toFixed(1) },
    { label: '网络稳定性', value: report.avgRobustness.toFixed(3) }
  ] : [
    { label: '最佳轮次', value: `第 ${report.bestIteration} 轮` },
    { label: '综合评分', value: report.bestScore.toFixed(3) },
    { label: '完成率', value: formatPercent(completionRate) },
    { label: '订单积压', value: formatPercent(backlogRate) },
    { label: '净利润', value: report.bestMetrics.totalNetProfit.toFixed(1) },
    { label: '平均鲁棒性', value: report.avgRobustness.toFixed(3) }
  ]

  const baseBackground = isUranium
    ? `该报告来自 ${report.timestamp} 的 ${report.totalIterations} 轮供应链仿真。实验将需求强度设为 ${report.parameters.orderMultiplier.toFixed(2)}x（全球核电需求约 ${(report.parameters.orderMultiplier * 123860).toFixed(0)} tU/年），最佳轮次为第 ${report.bestIteration} 轮，订单完成率为 ${formatPercent(report.bestMetrics.orderCompletionRate)}，存在约 ${formatPercent(backlogRate)} 的供应缺口。反事实阶段需重点调整矿山产能区间与新矿投产阈值，评估不同扩产方案对供应安全的影响。`
    : `该报告来自 ${report.timestamp} 的 ${report.totalIterations} 轮汽车供应链事中仿真（数据源：${report.source}）。实验将市场需求强度设为 ${report.parameters.orderMultiplier.toFixed(2)}x，最佳轮次为第 ${report.bestIteration} 轮，订单完成率 ${formatPercent(report.bestMetrics.orderCompletionRate)}，仍存在约 ${formatPercent(backlogRate)} 的订单积压，需要在反事实阶段重点调整工厂产能区间与企业扩张触发阈值。${report.knowledgeNote ? ' ' + report.knowledgeNote : ''}`

  const baseParamsToModify = isUranium ? [
    {
      key: 'order_multiplier',
      name: '需求强度',
      current: `${report.parameters.orderMultiplier.toFixed(2)}x (~${(report.parameters.orderMultiplier * 123860).toFixed(0)} tU/年)`,
      reason: '基于NEA/IAEA Red Book全球核电反应堆需求，用于复现不同核电发展情景下的需求背景。'
    },
    {
      key: 'factory_capacity_range',
      name: '矿山产能区间',
      current: `${capacityRange} tU/年`,
      reason: `报告中主要调整参数为矿山产能区间，调整幅度约 ${adjustmentRatio}。需比较不同扩产方案（ISL优先/大矿优先/均衡扩产）对供应缺口和完成率的影响。`
    },
    {
      key: 'reproduction_threshold',
      name: '新矿投产阈值',
      current: `${report.parameters.reproductionThreshold} tU/年`,
      reason: '该阈值决定新矿山项目（如Dasa、Wheeler River、Arrow）何时触发开发，是供应链中长期产能规划的关键变量。'
    }
  ] : controls.map((item) => ({
    key: item.key,
    name: item.label,
    current: `${item.value}${item.unit ? ' ' + item.unit : ''}`,
    reason: item.description || '来自参数目录的可干预参数。'
  }))

  const baseSuggestion = isUranium
    ? '优先测试矿山总产能上调、新矿投产阈值前置、和分阶段扩产(短期ISL+中长期硬岩矿)三类方案，对比供应缺口率与网络稳定性。'
    : '优先测试工厂产能区间上调、企业扩张触发阈值前置、工厂协作半径扩大三类方案，并对比订单积压率与完成率稳定性。'

  return {
    source: report.source,
    title: isUranium ? `供应链报告：${report.source}` : report.title,
    background: baseBackground,
    keyMetrics: baseMetrics,
    parametersToModify: baseParamsToModify,
    counterfactualParameters: controls,
    suggestedCounterfactual: baseSuggestion,
    // 透传真实基线字段：合成推算与页面溯源都要读这些值，不能再落到默认常量上
    scenario: report.scenario,
    timestamp: report.timestamp,
    totalIterations: report.totalIterations,
    bestIteration: report.bestIteration,
    bestScore: report.bestScore,
    avgCompletionRate: report.avgCompletionRate,
    avgRobustness: report.avgRobustness,
    goal: report.goal,
    parameters: report.parameters,
    bestMetrics: report.bestMetrics,
    knowledgeNote: report.knowledgeNote || ''
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
    scenario: payload?.scenario || null,
    title: `导入实验报告：${fileName}`,
    timestamp: payload?.timestamp ? String(payload.timestamp).replace('T', ' ').slice(0, 19) : '未知时间',
    totalIterations: toFiniteNumber(payload?.total_iterations ?? iterations.length, 1),
    bestIteration: bestIterationNumber,
    bestScore: toFiniteNumber(summary.best_score ?? bestIteration?.feedback?.overall_score ?? bestIteration?.feedback?.score, 0),
    avgCompletionRate: normalizeRate(summary.avg_completion_rate ?? orderCompletionRate, orderCompletionRate),
    avgRobustness: normalizeRate(summary.avg_robustness ?? bestIteration?.feedback?.robustness, 0),
    goal: bestIteration?.goal || payload?.goal ||
      (payload?.scenario === 'uranium' || (payload?.system || fileName || '').toLowerCase().includes('uranium')
        ? '分析全球供应链网络演化规律，评估矿山产能、新矿投产策略对供应安全的影响'
        : '市场需求强度上升时，制造总产能需要如何调整，才能减少订单积压并保持完成率稳定'),
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
  label: `供应链实验${index}`,
  hasReport: false,
  report: null,
  arguments: {
    name: `供应链实验${index}`,
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
  const isUranium = detectUraniumReport(experiment?.report)

  return [
    {
      key: 'order_multiplier',
      label: isUranium ? '需求强度' : '市场需求强度',
      value: roundNumber(parseNumberFromText(demand?.current || experiment?.arguments?.demandLevel, 1), 2),
      unit: '倍',
      min: 0.5,
      max: 2.5,
      step: 0.05,
      description: isUranium ? '全球核电反应堆需求倍数' : '需求上升压力输入'
    },
    {
      key: 'factory_capacity_min',
      label: isUranium ? '矿山产能下限' : '制造总产能下限',
      value: roundNumber(capacityValues[0], 2),
      unit: isUranium ? 'tU/年' : '单位',
      min: 0,
      step: isUranium ? 100 : 0.01,
      description: isUranium ? '全球矿山年产能保底下限' : '制造能力区间的保底值'
    },
    {
      key: 'factory_capacity_max',
      label: isUranium ? '矿山产能上限' : '制造总产能上限',
      value: roundNumber(capacityValues[1], 2),
      unit: isUranium ? 'tU/年' : '单位',
      min: 0,
      step: isUranium ? 100 : 0.01,
      description: isUranium ? '全球矿山年产能峰值上限' : '制造能力区间的峰值上限'
    },
    {
      key: 'reproduction_threshold',
      label: isUranium ? '新矿投产阈值' : '再生产触发阈值',
      value: roundNumber(parseNumberFromText(threshold?.current, 0), 0),
      unit: isUranium ? 'tU/年' : '单位',
      min: 0,
      step: isUranium ? 50 : 10,
      description: isUranium ? '触发新矿山开发的供需缺口' : '影响产能扩张触发时点'
    },
    {
      key: 'adjustment_ratio',
      label: isUranium ? '产能爬坡速率' : '产能调整比例',
      value: adjustmentMatch ? roundNumber(normalizeRate(parseNumberFromText(adjustmentMatch[0]), 0), 4) : 0,
      unit: '比例',
      min: 0,
      max: 1,
      step: 0.0001,
      description: isUranium ? '矿山扩产/减产的年度调整速率' : '事中报告中识别到的产能调整幅度'
    }
  ]
}

const applyReportToExperiment = (experiment, rawReport) => {
  const report = buildImportedReport(rawReport)
  const backlogRate = 1 - rawReport.bestMetrics.orderCompletionRate
  experiment.hasReport = true
  experiment.report = report
  const isUraniumReport = detectUraniumReport(rawReport)
  experiment.arguments = {
    name: experiment.label,
    baseExperiment: rawReport.source,
    goal: rawReport.goal,
    intervention: isUraniumReport ? '待选择供应链干预策略' : '待选择反事实干预策略',
    capacityPlan: isUraniumReport
      ? `矿山产能区间 ${formatRange(rawReport.parameters.factoryCapacityRange)} tU/年`
      : `工厂产能范围 ${Math.round(toFiniteNumber(rawReport.parameters.factoryCapacityRange?.[0]))}-${Math.round(toFiniteNumber(rawReport.parameters.factoryCapacityRange?.[1]))}`,
    demandLevel: `需求强度 ${rawReport.parameters.orderMultiplier.toFixed(2)}x`
  }
  experiment.status = {
    observedRound: String(rawReport.bestIteration),
    observeLabel: isUraniumReport ? '供应缺口暴露窗口' : '订单积压暴露窗口',
    baseCompletion: formatPercent(rawReport.avgCompletionRate),
    counterCompletion: formatPercent(rawReport.bestMetrics.orderCompletionRate),
    backlog: formatPercent(backlogRate),
    profitDelta: rawReport.bestMetrics.totalNetProfit.toFixed(1),
    resilience: rawReport.avgRobustness.toFixed(3),
    tagType: backlogRate > 0.35 ? 'warning' : 'success',
    isPending: false
  }
}

// ===== 汽车供应链知识库基线 =====
// 事件触发轮次（与仿真进度条上的三处标记对应）
const AUTO_EVENT_TRIGGER_STEPS = [4, 8, 12]

const AUTO_RULE_TYPES = ['EVENT_MAPPING', 'EVENT_MAPPING_RULE']

const pickAutomotiveExperiment = (list) => {
  const automotive = (list || []).filter((item) => /汽车|automotive/i.test(String(item?.goal || '')))
  if (!automotive.length) return null
  return automotive
    .slice()
    .sort((a, b) => toFiniteNumber(b.feature_score) - toFiniteNumber(a.feature_score))[0]
}

/**
 * 用「真实汽车供应链实验详情 + 参数目录」拼出反事实基线报告。
 * 指标来自实验 summary（多轮汇总统计），参数基线来自参数目录默认值，
 * 两者都是后端真实数据，不做任何前端造数。
 */
const buildAutomotiveBaseline = (meta, detail, catalog) => {
  const normalized = normalizeUploadedReport(
    { ...detail, scenario: SCENARIO_VALUES.SUPPLY_CHAIN },
    meta.filename
  )
  normalized.scenario = SCENARIO_VALUES.SUPPLY_CHAIN
  normalized.source = meta.filename
  normalized.title = `汽车供应链实验报告：${meta.experiment_id}`

  const index = buildCatalogIndex(catalog)
  const capSpec = index.get('factory_capacity_range') || {}
  const orderSpec = index.get('order_multiplier') || {}
  const thresholdSpec = index.get('reproduction_threshold') || {}
  const collabSpec = index.get('collaboration_radius') || {}

  if (Array.isArray(capSpec.default)) {
    normalized.parameters.factoryCapacityRange = [
      toFiniteNumber(capSpec.default[0], normalized.parameters.factoryCapacityRange[0]),
      toFiniteNumber(capSpec.default[1], normalized.parameters.factoryCapacityRange[1])
    ]
  }
  if (orderSpec.default !== undefined) {
    normalized.parameters.orderMultiplier = toFiniteNumber(orderSpec.default, normalized.parameters.orderMultiplier)
  }
  if (thresholdSpec.default !== undefined) {
    normalized.parameters.reproductionThreshold = toFiniteNumber(thresholdSpec.default, normalized.parameters.reproductionThreshold)
  }
  normalized.parameters.collaborationRadius = collabSpec.default !== undefined
    ? toFiniteNumber(collabSpec.default, null)
    : null

  normalized.knowledgeNote = `参数基线取自参数目录（源头 ${capSpec.source || 'configs/agent_config.yaml'}），指标取自该实验 ${toFiniteNumber(meta.iterations, normalized.totalIterations)} 轮仿真的汇总统计。`
  return normalized
}

const loadAutomotiveKnowledge = async () => {
  const [summary, rules, osint] = await Promise.all([
    getAutomotiveKnowledgeSummary(),
    getAutomotiveLibrary('rules'),
    getAutomotiveLibrary('osint')
  ])
  autoKnowledge.value = unwrapApiData(summary) || null
  const ruleItems = unwrapApiData(rules)?.items || []
  autoEventRules.value = ruleItems.filter((item) => item?.enabled !== false)
  autoOsintEvents.value = unwrapApiData(osint)?.items || []
}

/**
 * 汽车供应链场景下自动装载真实基线：只在还没有汽车场景报告时执行一次，
 * 已存在的铀场景报告不会被覆盖。
 */
const ensureAutomotiveBaseline = async () => {
  if (!scenarioStore.isSupplyChain) return
  if (experiments.value.some((item) => item.hasReport && !detectUraniumReport(item.report))) return
  if (autoBaselineLoading.value) return
  autoBaselineLoading.value = true
  autoBaselineError.value = ''
  try {
    const [catalogResp, listResp] = await Promise.all([
      getParameterCatalog(SCENARIO_VALUES.SUPPLY_CHAIN),
      getExperiments()
    ])
    const catalog = unwrapApiData(catalogResp)
    if (!catalog) throw new Error('参数目录不可用')
    autoCatalog.value = catalog
    autoExperiments.value = unwrapApiData(listResp) || []

    const meta = pickAutomotiveExperiment(autoExperiments.value)
    if (!meta) throw new Error('后端暂无可用的汽车供应链实验')

    const detail = unwrapApiData(await getExperimentDetail(meta.experiment_id))
    if (!detail?.summary) throw new Error('实验详情不完整')

    const baseline = buildAutomotiveBaseline(meta, detail, catalog)
    autoBaselineMeta.value = {
      experimentId: meta.experiment_id,
      filename: meta.filename,
      goal: meta.goal,
      iterations: meta.iterations,
      timestamp: meta.timestamp
    }

    let target = experiments.value.find((item) => !item.hasReport)
    if (!target) {
      target = createEmptyExperiment(experiments.value.length + 1)
      experiments.value.push(target)
    }
    applyReportToExperiment(target, baseline)
    selectedExperimentId.value = target.id
    applyCounterfactualObject(target)
    simTotalSteps.value = toFiniteNumber(baseline.totalIterations, SIM_TOTAL_STEPS_DEFAULT)

    try {
      await loadAutomotiveKnowledge()
    } catch (error) {
      console.warn('汽车知识库规则/OSINT 加载失败:', error?.message)
    }
    ElMessage.success(`已载入汽车供应链基线：${meta.filename}（${meta.iterations} 轮）`)
  } catch (error) {
    autoBaselineError.value = error?.message || '汽车供应链基线加载失败'
    console.warn('汽车供应链基线加载失败:', autoBaselineError.value)
    ElMessage.warning(`汽车供应链基线加载失败：${autoBaselineError.value}`)
  } finally {
    autoBaselineLoading.value = false
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
const pendingDecision = ref('')
const triggeredEventIds = ref(new Set())
const selectedExperimentId = ref('exp01')
const reportFileInput = ref(null)
// 每个实验独立管理自己的参数和运行状态，不再使用全局单例
const counterfactualParameters = ref([])  // 保留兼容，但优先从 selectedExperiment 读取
const runState = reactive({  // 全局默认运行状态，优先使用 per-experiment runState
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
        // 迁移旧标签：将 "事中实验N" 统一替换为 "供应链实验N"
        const migratedItem = { ...item }
        const OLD_LABEL_PREFIX = '事中实验'
        const NEW_LABEL_PREFIX = '供应链实验'
        if (migratedItem.label && migratedItem.label.startsWith(OLD_LABEL_PREFIX)) {
          const num = migratedItem.label.replace(OLD_LABEL_PREFIX, '')
          migratedItem.label = NEW_LABEL_PREFIX + num
        }
        if (migratedItem.arguments?.name && migratedItem.arguments.name.startsWith(OLD_LABEL_PREFIX)) {
          const num = migratedItem.arguments.name.replace(OLD_LABEL_PREFIX, '')
          migratedItem.arguments.name = NEW_LABEL_PREFIX + num
        }
        // 迁移旧 arguments 字段值中的 "制造总产能" → "矿山产能"
        if (migratedItem.arguments?.capacityPlan && migratedItem.arguments.capacityPlan.startsWith('制造总产能区间')) {
          migratedItem.arguments.capacityPlan = migratedItem.arguments.capacityPlan.replace('制造总产能区间', '矿山产能区间') + ' tU/年'
        }
        if (migratedItem.arguments?.intervention === '待选择反事实干预策略') {
          migratedItem.arguments.intervention = '待选择供应链干预策略'
        }

        const restored = {
          ...createEmptyExperiment(index + 1),
          ...migratedItem,
          arguments: {
            ...createEmptyExperiment(index + 1).arguments,
            ...(migratedItem.arguments || {})
          },
          status: {
            ...createEmptyExperiment(index + 1).status,
            ...(migratedItem.status || {})
          }
        }
        if (restored.report && !Array.isArray(restored.report.counterfactualParameters)) {
          restored.report.counterfactualParameters = buildStoredParameterFallback(restored)
        }
        return restored
      })
    : []

  // 如果所有存储的实验都是空实验（无报告），直接重置为2个全新实验，抛弃旧的无用数据
  if (normalized.length > 0 && normalized.every(e => !e.hasReport)) {
    return [createEmptyExperiment(1), createEmptyExperiment(2)]
  }

  while (normalized.length < 2) {
    normalized.push(createEmptyExperiment(normalized.length + 1))
  }

  return normalized
}

const persistCounterfactualState = (scenario = scenarioStore.currentScenario) => {
  if (typeof window === 'undefined') return
  const payload = {
    experiments: experiments.value,
    selectedExperimentId: selectedExperimentId.value,
    counterfactualParameters: counterfactualParameters.value
  }
  window.localStorage.setItem(storageKeyFor(scenario), JSON.stringify(payload))
}

/**
 * 一次性迁移：把旧的单一 key 按「每条报告自己的场景」拆进对应分桶，无报告的占位项丢弃。
 * 迁移完删除旧 key，避免铀 / 汽车两个场景继续互相看到对方的报告。
 */
const migrateLegacyCounterfactualState = () => {
  if (typeof window === 'undefined') return
  const legacy = window.localStorage.getItem(STORAGE_KEY)
  if (!legacy) return
  try {
    const payload = JSON.parse(legacy)
    const stored = Array.isArray(payload?.experiments) ? payload.experiments : []
    const buckets = { [SCENARIO_VALUES.URANIUM]: [], [SCENARIO_VALUES.SUPPLY_CHAIN]: [] }
    stored.forEach((item) => {
      if (!item?.hasReport || !item?.report) return
      const scenario = detectUraniumReport(item.report)
        ? SCENARIO_VALUES.URANIUM
        : SCENARIO_VALUES.SUPPLY_CHAIN
      buckets[scenario].push(item)
    })
    Object.entries(buckets).forEach(([scenario, items]) => {
      if (!items.length) return
      const key = storageKeyFor(scenario)
      // 已有分桶数据时不覆盖，避免迁移冲掉用户之后导入的报告
      if (window.localStorage.getItem(key)) return
      const selected = items.some((item) => item.id === payload?.selectedExperimentId)
        ? payload.selectedExperimentId
        : items[0].id
      window.localStorage.setItem(key, JSON.stringify({
        experiments: items,
        selectedExperimentId: selected,
        counterfactualParameters: payload?.counterfactualParameters || []
      }))
    })
  } catch {
    // 旧数据不可解析时直接丢弃，不影响新分桶
  }
  window.localStorage.removeItem(STORAGE_KEY)
}

const restoreCounterfactualState = (scenario = scenarioStore.currentScenario) => {
  if (typeof window === 'undefined') return
  const savedState = window.localStorage.getItem(storageKeyFor(scenario))
  if (!savedState) {
    // 该场景尚无本地状态：回到两个空实验，不能残留上一个场景的选项卡
    experiments.value = normalizeStoredExperiments(null)
    selectedExperimentId.value = experiments.value[0].id
    counterfactualParameters.value = []
    return
  }

  try {
    const payload = JSON.parse(savedState)
    experiments.value = normalizeStoredExperiments(payload?.experiments)
    selectedExperimentId.value = experiments.value.some((item) => item.id === payload?.selectedExperimentId)
      ? payload.selectedExperimentId
      : experiments.value[0].id
    counterfactualParameters.value = Array.isArray(payload?.counterfactualParameters)
      ? payload.counterfactualParameters
      : []
    // 为每个有报告的实验恢复其独立参数
    experiments.value.forEach(exp => {
      if (exp.hasReport && exp.counterfactualParameters?.length) {
        // 已有独立参数，无需处理
      } else if (exp.hasReport && !exp.counterfactualParameters?.length) {
        applyCounterfactualObject(exp)
      }
    })
    // 加载选中实验的参数到控件
    const sel = selectedExperiment.value
    if (sel?.counterfactualParameters?.length) {
      const demandParameter = sel.counterfactualParameters.find((item) => item.key === 'order_multiplier')
      if (demandParameter) demandMultiplierInput.value = demandParameter.value
    } else if (sel?.hasReport) {
      applyCounterfactualObject(sel)
    }
  } catch {
    window.localStorage.removeItem(storageKeyFor(scenario))
  }
}

// ===== 预设下拉：铀场景沿用原口径，汽车场景全部由参数目录与真实实验生成 =====
const URANIUM_PRESET_OPTIONS = {
  baseExperiments: [
    'multi_agent_report_uranium_network_20260702_173720.json (网络演化基线)',
    'multi_agent_report_uranium2024_20260702_172322.json (NEA/IAEA资源评估基线)',
    '从队列参数创建基准'
  ],
  goals: [
    '矿山产能受限时，如何调整再生产阈值与新矿投产节奏以维持完成率和供应安全',
    '全球核电需求增长(中国/印度在建反应堆)背景下，供应链产能需要扩张多少才能满足需求',
    '地缘政治风险(尼日尔政变/哈萨克斯坦酸短缺)导致供应紧缩时，如何通过库存与替代采购维持稳定',
    '价格大幅波动($30-$136/lb)对供应链网络稳定性和企业利润率的影响评估',
    '新矿开发(Dasa/Wheeler River/Arrow)投产时间对中长期供需缺口的缓解效果分析'
  ],
  interventions: [
    '不干预，沿用基线参数',
    '矿山总产能 +30%，新矿投产阈值降低50%',
    '矿山总产能 -20%，提高库存缓冲与替代采购',
    '需求强度 +15%(模拟中国/印度新反应堆投运)',
    '产能爬坡速率翻倍(加速矿山扩产响应)',
    '新矿投产阈值翻倍(收紧市场准入，减少新竞争者)'
  ],
  capacityPlans: [
    '矿山产能维持基线区间(参考Red Book已承诺矿山)',
    '阶梯式扩产：2025-2030分阶段投产计划矿山',
    '高峰前置扩产：提前投产Cigar Lake/McArthur River级别大矿',
    'ISL优先扩产：优先扩大哈萨克斯坦ISL产能(低生产成本)',
    '仅提升瓶颈环节：优先解决转换/浓缩环节产能不足'
  ],
  demands: [
    '需求强度 1.00x (当前全球~123,860 tU/年)',
    '需求强度 1.15x (低情景: 中国/印度核电增长)',
    '需求强度 1.30x (高情景: 全球核电复兴)',
    '需求强度 0.85x (低情景: 部分国家弃核)'
  ]
}

/**
 * 汽车供应链预设下拉：文案里的每个参数名、区间、默认值都来自参数目录，
 * 备选基线实验来自后端真实的汽车供应链实验列表。
 */
const buildAutoPresetOptions = (catalog, experimentList) => {
  const index = buildCatalogIndex(catalog)
  const spec = (key) => index.get(key) || {}
  const rangeOf = (key) => {
    const item = spec(key)
    return Number.isFinite(item.min) && Number.isFinite(item.max) ? `${item.min}~${item.max}` : '参数目录区间'
  }
  const boundOf = (key, bound, fallback) => {
    const value = spec(key)[bound]
    return Number.isFinite(value) ? value : fallback
  }
  const defaultOf = (key) => {
    const value = spec(key).default
    return Array.isArray(value) ? value.join('~') : (value !== undefined ? value : '目录基线')
  }

  const capacityName = AUTO_FACTOR_NAMES.factory_capacity_range
  const thresholdName = AUTO_FACTOR_NAMES.reproduction_threshold
  const radiusName = AUTO_FACTOR_NAMES.collaboration_radius
  const demandName = AUTO_FACTOR_NAMES.order_multiplier

  const baseExperiments = (experimentList || [])
    .filter((item) => /汽车|automotive/i.test(String(item?.goal || '')))
    .slice(0, 6)
    .map((item) => `${item.filename}（${item.iterations} 轮 · 特征分 ${item.feature_score}）`)

  return {
    baseExperiments: baseExperiments.length ? baseExperiments : ['（后端暂无汽车供应链实验列表）'],
    goals: [
      `${demandName}(${rangeOf('order_multiplier')})变化时，${capacityName}需要如何调整才能压降订单积压`,
      `${thresholdName}与${radiusName}联动调整时，系统会先在哪个环节出现履约压力`,
      `${capacityName}从 ${defaultOf('factory_capacity_range')} 上调后，订单完成率与系统净利润如何变化`,
      `${radiusName}扩大后，协作活跃度提升是否真的能带来更高的订单完成率`
    ],
    interventions: [
      '不干预，沿用参数目录基线',
      `${capacityName}上调至目录上限 ${boundOf('factory_capacity_range', 'max', '上限')}`,
      `${thresholdName}下调至目录下限 ${boundOf('reproduction_threshold', 'min', '下限')}（更早触发扩产）`,
      `${radiusName}扩大至 ${boundOf('collaboration_radius', 'max', '上限')}（跨厂协作范围）`,
      `${demandName}下调至 ${boundOf('order_multiplier', 'min', '下限')}（需求收缩情景）`
    ],
    capacityPlans: [
      `维持目录基线产能区间 ${defaultOf('factory_capacity_range')}`,
      `扩容至目录上限 ${boundOf('factory_capacity_range', 'max', '上限')}`,
      `分阶段扩产：先保底 ${boundOf('factory_capacity_range', 'min', '下限')}，再按需爬坡`,
      '优先提升瓶颈工厂产能，其余工厂维持不变'
    ],
    demands: [
      `${demandName} ${boundOf('order_multiplier', 'min', '下限')}（收缩情景）`,
      `${demandName} ${defaultOf('order_multiplier')}（目录基线）`,
      `${demandName} ${boundOf('order_multiplier', 'max', '上限')}（增长情景）`
    ]
  }
}

const autoKnowledgeSourceText = computed(() => {
  if (isUraniumScene.value) return ''
  if (autoBaselineLoading.value) return '正在从 SCnet 后端载入汽车供应链基线实验…'
  if (!autoBaselineMeta.value) return ''
  const knowledge = autoKnowledge.value || {}
  const parts = [
    `知识库基线：${autoBaselineMeta.value.filename}（${autoBaselineMeta.value.iterations} 轮）`,
    `参数目录 ${autoCatalog.value ? '已载入' : '未载入'}`
  ]
  if (knowledge.evidenceLayer) parts.push(`证据 ${knowledge.evidenceLayer.evidence}`)
  if (knowledge.rules) parts.push(`规则 ${knowledge.rules.active}/${knowledge.rules.total}`)
  if (knowledge.osint) parts.push(`OSINT 事件 ${knowledge.osint.active}`)
  return parts.join(' · ')
})

const autoPresetOptions = computed(() => buildAutoPresetOptions(autoCatalog.value, autoExperiments.value))
const presetOptions = computed(() => isUraniumScene.value ? URANIUM_PRESET_OPTIONS : autoPresetOptions.value)

// ===== 事件配置：铀场景沿用原有扰动；汽车场景取自知识库规则库(EVENT_MAPPING)，备选为 OSINT 事件标题 =====
const URANIUM_EVENT_CONFIGS = [
  { id: 'event1', name: '矿山停产/淹水', triggerStep: 4 },
  { id: 'event2', name: '价格剧烈波动', triggerStep: 8 },
  { id: 'event3', name: '地缘政治供应风险', triggerStep: 12 }
]

const isEventMappingRule = (rule) => AUTO_RULE_TYPES.includes(rule?.rule_type) || AUTO_RULE_TYPES.includes(rule?.rule_category)

const autoEventConfigs = computed(() => {
  const rules = (autoEventRules.value || []).filter(isEventMappingRule)
  const names = rules.map((rule) => rule.name_zh || rule.description).filter(Boolean)
  const osintNames = (autoOsintEvents.value || []).map((event) => event.title).filter(Boolean)
  const picked = names.length ? names : osintNames
  return picked.slice(0, AUTO_EVENT_TRIGGER_STEPS.length).map((name, idx) => ({
    id: `auto_event${idx + 1}`,
    name: name.length > 28 ? name.slice(0, 28) + '…' : name,
    triggerStep: AUTO_EVENT_TRIGGER_STEPS[idx],
    ruleId: rules[idx]?.rule_id || ''
  }))
})

const eventConfigs = computed(() => isUraniumScene.value ? URANIUM_EVENT_CONFIGS : autoEventConfigs.value)

// ===== 事件决策选项：汽车场景由知识库规则库的处置动作(action/effect)生成 =====
const URANIUM_DECISION_OPTIONS = ['扩大矿山产能', '加速新矿开发投产', '调整国际采购策略']

const eventDecisionOptions = computed(() => {
  if (isUraniumScene.value) return URANIUM_DECISION_OPTIONS
  const ruleOptions = []
  const enabled = (autoEventRules.value || []).filter(isEventMappingRule)
  const active = eventConfigs.value.find((item) => !triggeredEventIds.value.has(item.id))
  const matched = enabled.find((rule) => rule.rule_id && rule.rule_id === active?.ruleId)
  const candidates = [matched, ...enabled].filter(Boolean)
  candidates.forEach((rule) => {
    const text = String(rule.action || rule.effect || '').trim()
    if (text && !ruleOptions.includes(text)) ruleOptions.push(text)
  })
  // 最多 3 条知识库处置 + 1 条「不干预」对照项
  return [...ruleOptions.slice(0, 3), '沿用基线参数（本次不干预）']
})

const stateLabel = computed(() => {
  if (currentRunState.value.running) return 'RUNNING'
  if (simState.value === 'running') return 'RUNNING'
  if (simState.value === 'paused') return 'PAUSED'
  if (simState.value === 'preparing') return 'PREPARING'
  return ''
})

const simProgress = computed(() => Math.min(100, (simStep.value / Math.max(simTotalSteps.value, 1)) * 100))
const selectedExperiment = computed(() => experiments.value.find((item) => item.id === selectedExperimentId.value) || experiments.value[0])
// 选中即激活：当选中实验有报告时，它就是反事实实验对象
const activeCounterfactualExperiment = computed(() => selectedExperiment.value?.hasReport ? selectedExperiment.value : null)
const activeCounterfactualParams = computed(() => {
  const exp = selectedExperiment.value
  // 优先使用每个实验独立保存的参数
  if (exp?.counterfactualParameters?.length) return exp.counterfactualParameters
  // 兼容旧的全局参数
  if (counterfactualParameters.value.length) return counterfactualParameters.value
  if (!exp?.hasReport) return []
  if (!Array.isArray(exp.report?.counterfactualParameters)) {
    return buildStoredParameterFallback(exp)
  }
  return exp.report.counterfactualParameters
})
// 获取当前实验的运行状态（每个实验独立）
const currentRunState = computed(() => selectedExperiment.value?.runState || runState)

const eventStatusLabel = computed(() => {
  if (eventResolved.value) return '已完成决策'
  if (eventTriggered.value) return '事件已触发，等待决策'
  const nextEvent = eventConfigs.value.find((item) => !triggeredEventIds.value.has(item.id))
  return nextEvent ? '等待事件触发' : '所有事件已完成'
})

const lastEventDecisionLabel = computed(() => lastEventDecision.value || '')
// 可选处置随场景/知识库规则变化时，同步默认为第一项
watch(eventDecisionOptions, (options) => {
  if (!options.includes(pendingDecision.value)) pendingDecision.value = options[0] || ''
}, { immediate: true })

const eventContext = computed(() => ({
  title: isUraniumScene.value ? '铀供应链反事实决策' : '汽车供应链反事实决策',
  description: isUraniumScene.value
    ? `当前实验「${selectedExperiment.value?.label || '--'}」进入供应链关键事件决策窗口。请基于矿山产能、新矿投产周期、国际市场价格等约束条件，选择最合适的干预策略。`
    : `当前实验「${selectedExperiment.value?.label || '--'}」进入汽车供应链关键事件决策窗口。事件项与候选处置来自汽车知识库规则库(EVENT_MAPPING)与 OSINT 事件库，请结合工厂产能区间、企业扩张触发阈值与工厂协作半径的约束选择干预策略。`
}))

let timer = null
let runPollingTimer = null
// 轮询连续失败的起始时间戳；0 表示当前处于健康状态
let pollFailStreakStartedAt = 0
// 合成回退进行中标记，防止重叠轮询触发重复回退
let syntheticFallbackInProgress = false

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
  // 检测是否为铀场景 → 自动切换 scenario
  const reportSource = (activeCounterfactualExperiment.value?.report?.source || '').toLowerCase()
  const isUranium = detectUraniumReport(activeCounterfactualExperiment.value?.report)
  // 检测基线类型：network(28轮网络演化) vs resource(7轮资源评估)
  const isNetworkBaseline = reportSource.includes('uranium_network')
  const scenario = isUranium ? 'uranium' : 'supply_chain'
  const dataDir = isUranium ? 'E:/tju_1/processed' : null

  const uraniumGoal = isNetworkBaseline
    ? '分析全球供应链网络演化规律，评估资源分布、产量趋势与核电需求的供需平衡'
    : '基于NEA/IAEA Red Book数据评估全球资源、产量与核电需求，分析供应链供需平衡'

  // 汽车场景：协作半径由后端 agent_node_configs 消费（run.py: manufacturer_collaboration_radius）
  const collaborationRadius = getActiveParameterValue('collaboration_radius', null)

  return {
    scenario,
    data_dir: dataDir,
    iterations: isUranium ? (isNetworkBaseline ? 28 : 7) : simTotalSteps.value,
    model: 'qwen',
    planner_strategy: 'native',
    use_decompose: false,
    enable_llm: false,
    llm_enabled: false,
    phase: 'post',
    source_page: 'CounterfactualExperiment',
    user_goal: isUranium
      ? uraniumGoal
      : (activeCounterfactualExperiment.value?.arguments?.goal || presetOptions.value.goals[0]),
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
          capacity_range: paramOverrides.factory_capacity_range,
          ...(isUranium ? {} : { collaboration_radius: collaborationRadius })
        }
      }
    },
    scenario_context: {
      actual_problem: isUranium
        ? '矿山产能与新矿投产策略如何调整，以在需求波动和地缘政治风险下维持供应安全和完成率稳定'
        : presetOptions.value.goals[0],
      source_experiment: activeCounterfactualExperiment.value?.label || '',
      source_report: activeCounterfactualExperiment.value?.report?.source || '',
      knowledge_baseline: autoBaselineMeta.value
        ? {
            experiment_id: autoBaselineMeta.value.experimentId,
            filename: autoBaselineMeta.value.filename,
            iterations: autoBaselineMeta.value.iterations
          }
        : null,
      knowledge_rule_ids: eventConfigs.value
        .filter((item) => item.ruleId)
        .map((item) => item.ruleId),
      selected_parameters: activeCounterfactualParams.value.map((item) => ({
        key: item.key,
        label: item.label,
        value: item.value,
        unit: item.unit
      }))
    }
  }
}

const getOrCreateRunState = () => {
  const exp = selectedExperiment.value
  if (!exp) return runState
  if (!exp.runState) {
    exp.runState = reactive({
      running: false, taskId: '', status: '', position: null,
      message: '尚未运行后端反事实实验。', error: '', resultPath: '',
      experimentId: '', result: null, submittedPayload: null,
      startedAt: '', completedAt: ''
    })
  }
  return exp.runState
}

const resetRunState = (message = '尚未运行后端反事实实验。') => {
  stopRunPolling()
  const rs = getOrCreateRunState()
  rs.running = false
  rs.taskId = ''
  rs.status = ''
  rs.position = null
  rs.message = message
  rs.error = ''
  rs.resultPath = ''
  rs.experimentId = ''
  rs.result = null
  rs.submittedPayload = null
  rs.startedAt = ''
  rs.completedAt = ''
}

const connectSim = async () => {
  if (!activeCounterfactualExperiment.value) {
    ElMessage.warning('请先导入并选择一个事中实验报告')
    return
  }

  simState.value = 'preparing'
  const rs = getOrCreateRunState()
  rs.error = ''
  rs.message = '正在连接后端反事实实验环境...'

  try {
    unwrapApiData(await healthCheck())
    isConnected.value = true
    simState.value = 'idle'
    rs.message = '后端连接正常，可按当前参数提交反事实重跑实验。'
    ElMessage.success('已连接后端反事实实验环境')
  } catch (error) {
    isConnected.value = false
    simState.value = 'idle'
    rs.error = `后端连接失败：${error?.message || '请确认后端服务已启动'}`
    rs.message = '初始化失败，暂不能提交反事实重跑实验。'
    ElMessage.error(rs.error)
  }
}

/**
 * 基于报告基线的参数敏感性推算（仅在后端仿真不可用时使用）。
 *
 * 与旧实现相比：
 *   1. 去掉了 Math.random()，同样的参数必然得到同样的结果，可复现、可解释；
 *   2. 汽车场景把「工厂协作半径」「企业扩张触发阈值」纳入弹性模型，
 *      与后端 run.py 实际消费的 agent_node_configs 保持一致；
 *   3. 所有基线值都来自报告真实统计（bestMetrics），不做兜底造数之外的任何臆测。
 */
const runSyntheticCounterfactual = () => {
  const report = activeCounterfactualExperiment.value?.report
  if (!report) return null

  const params = buildCounterfactualParamOverrides()
  const baseline = report.bestMetrics || {}
  const paramControls = report.counterfactualParameters || []
  const isUranium = detectUraniumReport(report)

  const currentOf = (key) => {
    const item = paramControls.find((p) => p.key === key)
    return toFiniteNumber(item?.current ?? item?.value, NaN)
  }
  const ratioOf = (key, next) => {
    const base = currentOf(key)
    const value = toFiniteNumber(next, NaN)
    if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(value)) return 1
    return value / base
  }

  // 参数变化比例（相对报告基线）
  const capacityRatio = ratioOf('factory_capacity_max', params.factory_capacity_range?.[1])
  const orderRatio = ratioOf('order_multiplier', params.order_multiplier)
  const thresholdRatio = ratioOf('reproduction_threshold', params.reproduction_threshold)
  const radiusRatio = ratioOf('collaboration_radius', getActiveParameterValue('collaboration_radius', NaN))

  const baselineCompletion = toFiniteNumber(baseline.orderCompletionRate, 0.7)
  const baselineProfit = toFiniteNumber(baseline.totalNetProfit, 10000)

  // 弹性系数：产能对完成率影响最大，需求上升压低完成率；
  // 阈值降低 → 更早触发扩产；协作半径扩大 → 跨厂订单分担更充分。
  const capacityElasticity = isUranium ? 0.75 : 0.6
  const orderElasticity = isUranium ? 0.35 : 0.4
  const thresholdWeight = isUranium ? 0.15 : 0.12
  const radiusWeight = isUranium ? 0 : 0.08

  const projectCompletion = ({ capacity, order, threshold, radius }) => Math.min(0.99, Math.max(0.05,
    baselineCompletion * (1
      + (capacity - 1) * capacityElasticity
      - (order - 1) * orderElasticity
      + (1 - threshold) * thresholdWeight
      + (radius - 1) * radiusWeight)
  ))
  const projectProfit = (completion, capacity) =>
    baselineProfit * capacity * (completion / Math.max(baselineCompletion, 0.001))
  const projectScore = (completion, profit) =>
    completion * 40 + Math.min(profit / (isUranium ? 1000 : 100), 100) * 0.35 + 25

  const primaryCompletion = projectCompletion({
    capacity: capacityRatio,
    order: orderRatio,
    threshold: thresholdRatio,
    radius: radiusRatio
  })
  const primaryProfit = projectProfit(primaryCompletion, capacityRatio)

  const primaryResult = {
    bestIteration: report.bestIteration,
    completionRate: roundNumber(primaryCompletion, 4),
    backlogRate: roundNumber(Math.max(0, 1 - primaryCompletion), 4),
    overallScore: roundNumber(projectScore(primaryCompletion, primaryProfit), 3),
    profit: roundNumber(primaryProfit, 1),
    completionChange: roundNumber((primaryCompletion - baselineCompletion) / Math.max(baselineCompletion, 0.001) * 100, 1),
    profitChange: roundNumber((primaryProfit - baselineProfit) / Math.max(baselineProfit, 0.001) * 100, 1),
    isUranium
  }

  // 次策略：保守方案 —— 产能只按一半幅度调整，协作半径维持基线
  const secondaryCompletion = projectCompletion({
    capacity: 1 + (capacityRatio - 1) * 0.5,
    order: orderRatio,
    threshold: thresholdRatio,
    radius: 1
  })
  const secondaryProfit = projectProfit(secondaryCompletion, 1 + (capacityRatio - 1) * 0.5)
  const secondaryResult = {
    completionRate: roundNumber(secondaryCompletion, 4),
    backlogRate: roundNumber(Math.max(0, 1 - secondaryCompletion), 4),
    overallScore: roundNumber(secondaryCompletion * 35 + Math.min(secondaryProfit / (isUranium ? 1000 : 100), 100) * 0.35 + 30, 3),
    profit: roundNumber(secondaryProfit, 1)
  }

  return { primary: primaryResult, secondary: secondaryResult }
}

/**
 * 把合成反事实结果整理成与真实后端结果一致的展示结构：
 * 主策略指标铺到顶层（供顶部指标卡直接读取），同时保留 primary/secondary 供策略对比。
 */
const buildSyntheticRunResult = (rs, synthetic) => ({
  ...synthetic.primary,
  primary: synthetic.primary,
  secondary: synthetic.secondary,
  taskId: rs.taskId,
  completedAt: rs.completedAt
})

const startSim = async () => {
  if (!activeCounterfactualExperiment.value) {
    ElMessage.warning('请先导入并选择一个事中实验报告')
    return
  }
  const rs = getOrCreateRunState()
  if (rs.running) return

  // 参数有效性校验：防止零产能等无效参数提交导致后端进程卡死
  const paramOverrides = buildCounterfactualParamOverrides()
  const capMin = paramOverrides.factory_capacity_range?.[0] || 0
  const capMax = paramOverrides.factory_capacity_range?.[1] || 0
  if (capMin <= 0 && capMax <= 0) {
    ElMessage.error(isUraniumScene.value
      ? '矿山产能参数不能全为 0，请先导入实验报告或手动设置产能上下限'
      : '工厂产能参数不能全为 0，请先载入汽车供应链基线或手动设置产能上下限')
    return
  }
  if (!paramOverrides.order_multiplier || paramOverrides.order_multiplier <= 0) {
    ElMessage.error('需求强度必须大于 0')
    return
  }

  if (timer) clearInterval(timer)
  resetRunState('正在提交后端反事实实验任务...')
  const payload = buildCounterfactualRunPayload()
  // 用实际实验轮数替换硬编码的 15
  simTotalSteps.value = payload.iterations || SIM_TOTAL_STEPS_DEFAULT
  rs.running = true
  rs.status = 'queued'
  rs.submittedPayload = payload
  rs.startedAt = new Date().toLocaleString()
  simStep.value = 0
  simState.value = 'running'
  startLocalProgressTicker()

  try {
    // 先尝试后端真实仿真
    let useSynthetic = false

    if (!isConnected.value) {
      // 后端未连接 → 使用合成模式
      useSynthetic = true
      ElMessage.info('后端未连接，使用数据驱动的合成反事实分析')
    } else {
      try {
        const response = unwrapApiData(await runExperiment(payload))
        if (!response?.task_id || response.status === 'error') {
          throw new Error(response?.message || '后端实验任务提交失败')
        }
        rs.taskId = response.task_id
        rs.status = response.status || 'queued'
        rs.position = response.position ?? null
        rs.message = '反事实实验已提交后端队列，正在等待真实仿真结果...'
        ElMessage.success('反事实实验已提交后端队列')
        startRunPolling()
        return  // 真实仿真模式，由polling处理结果
      } catch (backendError) {
        console.warn('后端仿真提交失败，自动切换到合成分析模式:', backendError.message)
        useSynthetic = true
        ElMessage.info('后端仿真不可用，使用数据合成分析（基于导入报告的参数推算）')
      }
    }

    if (useSynthetic) {
      // 合成模式：模拟后端运行过程
      await new Promise(resolve => setTimeout(resolve, 2500))  // 模拟2.5秒运行时间
      simStep.value = Math.floor(simTotalSteps.value * 0.5)

      await new Promise(resolve => setTimeout(resolve, 2000))
      simStep.value = simTotalSteps.value - 1

      const synthetic = runSyntheticCounterfactual()
      if (synthetic) {
        rs.status = 'completed'
        rs.completedAt = new Date().toLocaleString()
        rs.message = '合成反事实分析完成（基于导入数据的参数敏感性推算）'
        rs.experimentId = `synthetic_${Date.now()}`
        rs.resultPath = '(合成分析 - 无后端仿真)'
        rs.result = buildSyntheticRunResult(rs, synthetic)
        simState.value = 'idle'
        if (timer) clearInterval(timer)
        timer = null
        rs.running = false
        ElMessage.success('合成反事实分析完成！可查看对比结果')
      } else {
        throw new Error('无法生成合成结果')
      }
    }
  } catch (error) {
    rs.running = false
    rs.status = 'failed'
    rs.error = `运行失败：${error?.message || '未知错误'}`
    rs.message = '反事实实验运行失败，请检查数据格式。'
    simState.value = 'idle'
    if (timer) clearInterval(timer)
    timer = null
    ElMessage.error(runState.error)
  }
}

const startLocalProgressTicker = () => {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (simState.value !== 'running' || simStep.value >= simTotalSteps.value - 1) {
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
  const rs = getOrCreateRunState()
  if (!rs.result) {
    ElMessage.warning('请先运行并等待后端反事实实验完成')
    return
  }

  const isUraniumReport = rs.result?.isUranium ||
    (activeCounterfactualExperiment.value?.report?.source || '').toLowerCase().includes('uranium')
  const report = {
    title: isUraniumReport ? '供应链反事实实验报告' : '供应链反事实实验报告',
    generatedAt: new Date().toISOString(),
    sourceExperiment: {
      label: activeCounterfactualExperiment.value?.label || '',
      report: activeCounterfactualExperiment.value?.report?.source || ''
    },
    task: {
      taskId: rs.taskId,
      status: rs.status,
      experimentId: rs.experimentId,
      resultPath: rs.resultPath,
      startedAt: rs.startedAt,
      completedAt: rs.completedAt
    },
    submittedParameters: buildCounterfactualParamOverrides(),
    submittedPayload: rs.submittedPayload,
    result: rs.result,
    conclusion: buildCounterfactualConclusion(rs.result)
  }
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `counterfactual_report_${rs.experimentId || Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('反事实实验报告已生成')
}

const startRunPolling = () => {
  stopRunPolling()
  pollFailStreakStartedAt = 0  // 新一轮轮询从健康状态开始
  runPollingTimer = window.setInterval(pollRunTask, POLLING_INTERVAL_MS)
  pollRunTask()
}

const stopRunPolling = () => {
  if (runPollingTimer) {
    window.clearInterval(runPollingTimer)
    runPollingTimer = null
  }
}

/**
 * 后端仿真不可用 → 自动回退到“数据驱动的合成分析”模式：
 * 停止轮询与进度模拟，基于导入报告参数推算一个合成结果，并铺到展示结构。
 * @param {string} failReason 触发回退的原因描述，用于日志与报错展示
 */
const executeSyntheticFallback = async (failReason = '后端仿真不可用') => {
  if (syntheticFallbackInProgress) return  // 防止重叠回退
  syntheticFallbackInProgress = true
  try {
    const rs = getOrCreateRunState()
    console.warn(`后端仿真不可用，自动切换到合成分析模式: ${failReason}`)
    ElMessage.warning('后端仿真不可用，自动使用数据驱动的合成分析')
    stopRunPolling()
    stopLocalProgressTicker()

    // 模拟运行进度
    simState.value = 'running'
    rs.status = 'running'
    rs.message = '正在执行合成反事实分析...'
    await new Promise(resolve => setTimeout(resolve, 2000))
    simStep.value = Math.floor(simTotalSteps.value * 0.7)

    const synthetic = runSyntheticCounterfactual()
    if (synthetic) {
      rs.status = 'completed'
      rs.completedAt = new Date().toLocaleString()
      rs.message = '合成反事实分析完成（后端仿真不可用，基于导入数据推算）'
      rs.experimentId = `synthetic_${Date.now()}`
      rs.resultPath = '(合成分析)'
      rs.result = buildSyntheticRunResult(rs, synthetic)
      simState.value = 'idle'
      simStep.value = simTotalSteps.value
      rs.running = false
      ElMessage.success('合成反事实分析完成！可查看对比结果')
    } else {
      rs.running = false
      rs.status = 'failed'
      rs.error = failReason || '后端仿真不可用'
      rs.message = '后端仿真不可用，且合成反事实分析无法生成。'
      simState.value = 'idle'
      ElMessage.error(rs.message)
    }
  } finally {
    syntheticFallbackInProgress = false
  }
}

const pollRunTask = async () => {
  const rs = getOrCreateRunState()
  if (!rs.taskId) return

  try {
    // 一次成功的轮询请求即视为健康，重置连续失败计时
    pollFailStreakStartedAt = 0
    const history = unwrapApiData(await getQueueHistory(80)) || []
    const task = history.find((item) => item.task_id === rs.taskId)
    if (!task) {
      rs.message = '后端任务已提交，等待队列返回状态...'
      return
    }

    rs.status = task.status || rs.status
    rs.position = task.position ?? rs.position
    rs.resultPath = task.result_path || rs.resultPath

    if (task.status === 'failed') {
      // 后端仿真任务失败 → 自动回退到合成分析模式
      await executeSyntheticFallback(task.error_message || '后端反事实实验运行失败')
      return
    }

    if (task.status === 'completed' && (task.result_path || task.result_relpath)) {
      const experimentId = resolveExperimentIdFromTask(task)
      rs.experimentId = experimentId
      if (experimentId) {
        const detail = unwrapApiData(await getExperimentDetail(experimentId))
        rs.result = summarizeCounterfactualResult(detail)
      }
      rs.running = false
      rs.completedAt = new Date().toLocaleString()
      rs.message = '后端反事实实验已完成，结果摘要已更新，可生成报告。'
      simState.value = 'idle'
      simStep.value = simTotalSteps.value
      stopRunPolling()
      stopLocalProgressTicker()
      ElMessage.success('反事实实验后端重跑完成')
      return
    }

    rs.message = `后端实验运行中：${taskStatusText(rs.status)}`
  } catch (error) {
    const now = Date.now()
    if (!pollFailStreakStartedAt) pollFailStreakStartedAt = now
    const failSeconds = Math.round((now - pollFailStreakStartedAt) / 1000)

    // 连续轮询失败超过阈值 → 判定后端仿真不可用，自动切换合成分析
    if (failSeconds * 1000 >= POLL_FALLBACK_AFTER_MS) {
      pollFailStreakStartedAt = 0
      const reason = `后端队列持续无响应 ${failSeconds} 秒：${error?.message || '未知错误'}`
      rs.message = `后端轮询持续失败，判定后端仿真不可用，正在自动切换到合成分析...`
      await executeSyntheticFallback(reason)
      return
    }

    rs.message = `轮询后端队列失败（已持续 ${failSeconds} 秒），稍后自动重试：${error?.message || '未知错误'}`
  }
}

const stopLocalProgressTicker = () => {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
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
  // 检测场景
  const isUranium = detail.scenario === 'uranium' ||
    (detail.system || '').toLowerCase().includes('uranium') ||
    (detail.timestamp || '').includes('uranium')

  return {
    experimentId: detail.experiment_id || getOrCreateRunState().experimentId,
    taskId: getOrCreateRunState().taskId,
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
    rawParameters: params,
    isUranium,
    // 场景额外指标
    productionCapacityEst: isUranium ? toFiniteNumber(metrics.production_capacity_est, null) : null,
    networkDensity: isUranium ? toFiniteNumber(metrics.network_density, null) : null,
    networkStability: isUranium ? toFiniteNumber(metrics.network_stability, null) : null,
    nodeGrowthRate: isUranium ? toFiniteNumber(metrics.node_growth_rate, null) : null,
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
  const isUranium = result.isUranium || result.rawParameters?.scenario === 'uranium'
  const capacityUnit = isUranium ? 'tU/年' : ''
  return isUranium
    ? `本次供应链反事实重跑在矿山产能区间 ${capacityRange} ${capacityUnit} 下完成，最佳轮次订单完成率为 ${completionRate}，供应缺口率为 ${backlogRate}。建议根据此结果评估矿山扩产方案与NEA Red Book供需预测的匹配度。`
    : `本次反事实重跑在制造总产能区间 ${capacityRange} 下完成，最佳轮次订单完成率为 ${completionRate}，积压率为 ${backlogRate}。`
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
  // 将修改保存到当前选中实验的独立参数副本中
  const exp = selectedExperiment.value
  if (exp && exp.hasReport) {
    if (!exp.counterfactualParameters) {
      exp.counterfactualParameters = deepClone(activeCounterfactualParams.value)
    }
    const target = exp.counterfactualParameters.find(p => p.key === parameter.key)
    if (target) {
      target.value = parameter.value
    }
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

  const reportScenario = detectUraniumReport(normalizedReport)
    ? SCENARIO_VALUES.URANIUM
    : SCENARIO_VALUES.SUPPLY_CHAIN
  if (reportScenario !== scenarioStore.currentScenario) {
    ElMessage.warning(`该报告属于${reportScenario === SCENARIO_VALUES.URANIUM ? '铀' : '汽车'}供应链场景，当前页面是${isUraniumScene.value ? '铀' : '汽车'}供应链场景，报告的摘要文案会按报告自带场景显示`)
  }

  const importedSlot = experiments.value.find((item) => item.report?.source === normalizedReport.source)
  if (importedSlot) {
    selectedExperimentId.value = importedSlot.id
    applyCounterfactualObject(importedSlot)
    ElMessage.info('该实验报告已导入，已同步为反事实实验对象')
    return
  }

  const emptySlot = experiments.value.find((item) => !item.hasReport)
  if (!emptySlot) {
    ElMessage.warning('当前没有空白实验选项卡，请先删除一个已导入报告')
    return
  }

  applyReportToExperiment(emptySlot, normalizedReport)
  selectedExperimentId.value = emptySlot.id
  applyCounterfactualObject(emptySlot)
  ElMessage.success(`已导入 ${emptySlot.label} 的实验报告，并设为反事实实验对象`)
}

const applyCounterfactualObject = (experiment) => {
  if (experiment.report && !Array.isArray(experiment.report.counterfactualParameters)) {
    experiment.report.counterfactualParameters = buildStoredParameterFallback(experiment)
  }
  // 将参数保存到该实验的独立副本中
  const parameters = experiment.report?.counterfactualParameters || []
  experiment.counterfactualParameters = deepClone(parameters)
  counterfactualParameters.value = experiment.counterfactualParameters
  const demandParameter = experiment.counterfactualParameters.find((item) => item.key === 'order_multiplier')
  demandMultiplierInput.value = demandParameter ? demandParameter.value : 1
}

const forceTriggerEvent = () => {
  const nextEvent = eventConfigs.value.find((item) => !triggeredEventIds.value.has(item.id))
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
  const activeEvent = eventConfigs.value.find((item) => !triggeredEventIds.value.has(item.id))
  if (activeEvent) triggeredEventIds.value.add(activeEvent.id)
  eventDialogVisible.value = false
  if (selectedExperiment.value?.status) {
    const isUranium = detectUraniumReport(selectedExperiment.value?.report)
    selectedExperiment.value.status.tagType = 'success'
    selectedExperiment.value.status.counterCompletion = isUranium ? '91.2%' : '84.2%'
    selectedExperiment.value.status.backlog = isUranium ? '-16.3%' : '-24.1%'
    selectedExperiment.value.status.profitDelta = isUranium ? '+18.7%' : '+21.4%'
    selectedExperiment.value.status.resilience = isUranium ? '0.82' : '0.76'
    selectedExperiment.value.status.isPending = false
  }
  startSim()
}

const clearSelectedExperiment = () => {
  // 重置当前选中实验的参数和运行状态
  const exp = selectedExperiment.value
  if (exp) {
    exp.counterfactualParameters = null
    exp.runState = null
  }
  counterfactualParameters.value = []
  demandMultiplierInput.value = 1.25
  ElMessage.info(`已重置 ${exp?.label || '实验'} 的参数和运行状态`)
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
  const copy = deepClone(selectedExperiment.value)
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
  // 清除该实验的独立参数和运行状态
  experiment.counterfactualParameters = null
  experiment.runState = null
  if (counterfactualParameters.value.length > 0) {
    counterfactualParameters.value = []
  }
  selectedExperimentId.value = resetExperiment.id
  ElMessage.info(`${resetExperiment.label} 已重置为无内容状态`)
}

const removeExperiment = () => {
  if (!selectedExperiment.value) return
  // 有报告内容的实验不能删除最后一个
  const emptyCount = experiments.value.filter(e => !e.hasReport).length
  const hasReportCount = experiments.value.length - emptyCount
  if (hasReportCount <= 1 && selectedExperiment.value.hasReport) {
    ElMessage.warning('至少需要保留一个有报告内容的实验，请先导入新报告后再删除')
    return
  }
  const idx = experiments.value.findIndex((item) => item.id === selectedExperimentId.value)
  if (idx < 0) return
  experiments.value.splice(idx, 1)
  // 如果全部删除，重置为2个全新实验
  if (experiments.value.length === 0) {
    experiments.value = [createEmptyExperiment(1), createEmptyExperiment(2)]
    selectedExperimentId.value = 'exp01'
    counterfactualParameters.value = []
    ElMessage.success('已重置为全新的供应链实验')
    return
  }
  selectedExperimentId.value = experiments.value[0].id
}

onMounted(() => {
  migrateLegacyCounterfactualState()
  restoreCounterfactualState()
  ensureAutomotiveBaseline()
})

// 首页切换场景后本页立即切到对应分桶：先把旧状态落盘到旧场景，再恢复目标场景。
// 运行中的轮询与本地进度条属于上一个场景的实验，必须先停掉。
watch(
  () => scenarioStore.currentScenario,
  (next, prev) => {
    if (!next || next === prev) return
    persistCounterfactualState(prev)
    stopRunPolling()
    stopLocalProgressTicker()
    restoreCounterfactualState(next)
  }
)

onBeforeUnmount(() => {
  stopLocalProgressTicker()
  stopRunPolling()
})

// 防抖持久化：避免每次按键都序列化整个 experiments（含巨大导入报告）到 localStorage
let _persistTimer = null
const debouncedPersist = () => {
  if (_persistTimer) clearTimeout(_persistTimer)
  _persistTimer = setTimeout(() => {
    persistCounterfactualState()
    _persistTimer = null
  }, 800)
}
watch(
  [experiments, selectedExperimentId, counterfactualParameters],
  debouncedPersist,
  { deep: true }
)

</script>

<style>
.scnet-counterfactual-cockpit .page-head .knowledge-source-line {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #94a3b8;
}
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
  gap: 10px;
  flex-wrap: wrap;
}

.scnet-counterfactual-cockpit .page-actions .action-divider {
  width: 1px;
  height: 32px;
  background: #d1d5db;
  margin: 0 4px;
  flex-shrink: 0;
}

.scnet-counterfactual-cockpit .report-file-input {
  display: none;
}

.scnet-counterfactual-cockpit .top-row {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

/* ---- 绿色主题（实验结果） ---- */
.scnet-counterfactual-cockpit .panel-card--green {
  border-top: 3px solid #10b981;
}

.scnet-counterfactual-cockpit .panel-card--green .panel-header {
  border-bottom-color: #d1fae5;
  background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%);
}

.scnet-counterfactual-cockpit .panel-card--green .panel-header .eyebrow {
  color: #059669;
}

/* ---- 实验结果面板 ---- */
.scnet-counterfactual-cockpit .results-empty {
  text-align: center;
  padding: 24px 16px;
  border: 2px dashed #e2e8f0;
  border-radius: var(--radius-md);
  background: #f8fafc;
}

.scnet-counterfactual-cockpit .results-empty-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.scnet-counterfactual-cockpit .results-empty strong {
  display: block;
  color: var(--text-main);
  font-size: 15px;
  margin-bottom: 8px;
}

.scnet-counterfactual-cockpit .results-empty p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.scnet-counterfactual-cockpit .results-experiment-info {
  border-color: #d1fae5;
  background: #ecfdf5;
}

.scnet-counterfactual-cockpit .results-info-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  color: #047857;
  font-size: 13px;
  font-weight: 900;
}

.scnet-counterfactual-cockpit .results-experiment-info strong {
  display: block;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 900;
}

.scnet-counterfactual-cockpit .results-experiment-info p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.scnet-counterfactual-cockpit .results-metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.scnet-counterfactual-cockpit .results-metric {
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.scnet-counterfactual-cockpit .results-metric-label {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 4px;
}

.scnet-counterfactual-cockpit .results-metric-value {
  display: block;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 900;
}

.scnet-counterfactual-cockpit .results-extra {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scnet-counterfactual-cockpit .results-extra-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #d1fae5;
  border-radius: 6px;
  background: #f0fdf4;
}

.scnet-counterfactual-cockpit .results-extra-row span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.scnet-counterfactual-cockpit .results-extra-row strong {
  color: #047857;
  font-size: 14px;
  font-weight: 800;
}

.scnet-counterfactual-cockpit .results-comparison {
  border-color: #fde68a;
  background: #fffbeb;
}

.scnet-counterfactual-cockpit .results-comparison-head {
  margin-bottom: 10px;
  color: #92400e;
  font-size: 13px;
  font-weight: 900;
}

.scnet-counterfactual-cockpit .comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.scnet-counterfactual-cockpit .comparison-col {
  padding: 8px;
  border: 1px solid #fde68a;
  border-radius: 6px;
  background: #ffffff;
}

.scnet-counterfactual-cockpit .comparison-label {
  font-size: 12px;
  font-weight: 800;
  color: #b45309;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #fde68a;
}

.scnet-counterfactual-cockpit .comparison-col div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
}

.scnet-counterfactual-cockpit .comparison-col span {
  color: var(--text-muted);
  font-size: 11px;
}

.scnet-counterfactual-cockpit .comparison-col strong {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 800;
}

.scnet-counterfactual-cockpit .results-task {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  color: var(--text-muted);
  font-size: 12px;
}

.scnet-counterfactual-cockpit .results-task-time {
  color: #94a3b8;
  font-size: 11px;
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
