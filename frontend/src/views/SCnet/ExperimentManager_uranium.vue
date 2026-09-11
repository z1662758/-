<template>
  <div class="experiment-manager mid-stage-bg">
    <MidStagePageHeader
      title="实验运行"
      subtitle="提交、排队并跟踪铀供应链实验任务"
      :icon="Monitor"
    >
      <template #right>
        <el-tooltip
          :content="launchDisabledReason || '基于当前需求生成一组铀供应链实验任务'"
          placement="bottom"
        >
          <span class="launch-btn-wrap">
            <el-button
              type="success"
              size="small"
              :disabled="!canLaunch || launching"
              :loading="launching"
              @click="launchCurrentSession"
            >
              <el-icon><VideoPlay /></el-icon>
              <span>启动实验</span>
            </el-button>
          </span>
        </el-tooltip>
        <el-button
          type="danger"
          size="small"
          :disabled="!showRunningSection || stoppingExperiment"
          :loading="stoppingExperiment"
          @click="stopRunningExperiment"
        >
          <el-icon><Warning /></el-icon>
          <span>停止当前实验</span>
        </el-button>
        <el-button type="primary" size="small" @click="createNewExperiment">
          <el-icon><Plus /></el-icon>
          <span>新建实验</span>
        </el-button>
      </template>
    </MidStagePageHeader>

    <!-- 选中实验快捷入口（替代原 MessageBox 弹窗） -->
    <SelectedExperimentBanner
      :visible="selectedExperimentBanner.visible"
      :experiment-id="selectedExperimentBanner.experimentId"
      :session-id="selectedExperimentBanner.sessionId"
      @dismiss="selectedExperimentBanner.visible = false"
      @navigate="navigateFromBanner"
    />

    <section class="run-overview">
      <article
        v-for="item in runOverviewCards"
        :key="item.label"
        class="run-overview-card"
        :class="item.tone"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.hint }}</p>
      </article>
    </section>

    <div class="iteration-progress-section">
      <el-card shadow="hover" class="progress-card">
        <template #header>
          <div class="progress-card-header">
            <span class="progress-title">当前实验迭代进度</span>
            <el-tag v-if="showRunningSection" type="success" size="small" effect="plain">进行中</el-tag>
            <el-tag v-else-if="pendingTask" type="warning" size="small" effect="plain">排队中</el-tag>
            <el-tag v-else type="info" size="small" effect="plain">空闲</el-tag>
          </div>
        </template>

        <div v-if="showRunningSection" class="progress-content progress-running-shell">
          <div class="progress-hero">
            <div class="progress-hero-copy">
              <span class="progress-kicker">运行中任务</span>
              <div class="progress-hero-title">{{ truncateGoal(runningTask?.user_goal || '当前实验任务运行中') }}</div>
              <div class="progress-hero-meta">
                <span class="progress-hero-pill primary">铀供应链仿真</span>
              </div>
            </div>
          </div>

          <div class="progress-track-panel">
            <div class="progress-track-head">
              <span class="progress-stage-chip">
                第 {{ runningProgress.current_iteration || 0 }} / {{ runningProgress.total || '-' }} 轮
              </span>
              <span class="progress-inline-hint mono" :title="displayedTaskId">{{ formatShortId(displayedTaskId) }}</span>
            </div>
            <div class="progress-task-text">{{ runningStageText }}</div>
            <el-progress
              :percentage="runningProgress.percentage"
              :status="runningProgress.total > 0 && runningProgress.completed >= runningProgress.total ? 'success' : ''"
              :stroke-width="16"
            />
          </div>

          <div v-if="progressAdjustmentRows.length" class="progress-adjust-inline">
            <span class="progress-adjust-inline-label">下一轮建议</span>
            <span
              v-for="item in progressAdjustmentRows.slice(0, 3)"
              :key="item.key"
              class="progress-adjust-chip"
            >
              {{ item.label }} {{ item.current ?? '-' }} → {{ item.next || '-' }}
            </span>
          </div>

          <div v-if="progressHint" class="progress-note">{{ progressHint }}</div>
        </div>

        <div v-else-if="pendingTask" class="progress-content progress-pending-shell">
          <div class="progress-hero pending">
            <div class="progress-hero-copy">
              <span class="progress-kicker">排队任务</span>
              <div class="progress-hero-title">{{ truncateGoal(pendingTask?.user_goal || '待执行实验任务') }}</div>
              <div class="progress-hero-meta">
                <span class="progress-hero-pill warning">等待执行</span>
              </div>
            </div>
            <div class="progress-hero-side">
              <strong>第 {{ pendingPosition || '-' }} 位</strong>
              <span>队列顺位</span>
            </div>
          </div>

          <div class="progress-pending-meta">
            <span>队列第 {{ pendingPosition || '-' }} 位</span>
            <span class="mono" :title="pendingTask.task_id">{{ formatShortId(pendingTask.task_id) }}</span>
          </div>
        </div>

        <el-empty
          v-else
          description="当前没有运行中的实验，可在下方任务列表查看历史迭代优化过程"
          :image-size="70"
        />
      </el-card>
    </div>

    <div v-if="focusTask && focusIterationRows.length" class="focus-experiment-section">
      <UraniumExperimentFocusPanel
        :task="focusTask"
        :experiment="focusExperiment"
        :rows="focusIterationRows"
        @view-config="openTaskConfigDialog(focusTask)"
        @view-experiment="viewExperiment(focusTask)"
      />
    </div>

    <div class="experiment-list">
      <el-card shadow="hover" class="experiment-list-card">
        <template #header>
          <div class="list-card-header">
            <span class="list-title">实验台账</span>
            <div class="list-header-stats">
              <div class="overview-pill">
                <div class="overview-label">实验任务</div>
                <div class="overview-value">{{ overviewStats.plans }}</div>
              </div>
              <div class="overview-pill running">
                <div class="overview-label">运行中</div>
                <div class="overview-value">{{ overviewStats.running }}</div>
              </div>
              <div class="overview-pill pending">
                <div class="overview-label">排队中</div>
                <div class="overview-value">{{ overviewStats.pending }}</div>
              </div>
              <div class="overview-pill completed">
                <div class="overview-label">已完成</div>
                <div class="overview-value">{{ overviewStats.completed }}</div>
              </div>
            </div>
          </div>
        </template>

        <div class="ledger-toolbar">
          <div class="ledger-toolbar-main">
            <el-input
              v-model="ledgerQuery"
              class="ledger-search"
              clearable
              placeholder="搜索目标、任务 ID 或实验 ID"
              :prefix-icon="Search"
            />
            <el-select v-model="ledgerStatus" class="ledger-status-select" placeholder="全部状态">
              <el-option label="全部状态" value="all" />
              <el-option label="运行中" value="running" />
              <el-option label="排队中" value="pending" />
              <el-option label="已完成" value="completed" />
              <el-option label="失败" value="failed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-select v-model="ledgerSort" class="ledger-sort-select" :prefix-icon="Sort">
              <el-option label="最近创建" value="created_desc" />
              <el-option label="最早创建" value="created_asc" />
              <el-option label="状态优先" value="status" />
            </el-select>
          </div>
          <div class="ledger-toolbar-actions">
            <span class="ledger-result-count">
              显示 {{ filteredTaskRows.length }} / {{ displayTaskRows.length }} 条
            </span>
            <el-button text size="small" :disabled="!hasLedgerFilters" @click="resetLedgerFilters">
              清除筛选
            </el-button>
            <el-button text size="small" :loading="refreshing" @click="refreshLedger">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>

        <div v-if="displayTaskRows.length === 0" class="empty-list">
          <el-empty description="暂无实验任务" :image-size="100" />
        </div>
        <div v-else-if="filteredTaskRows.length === 0" class="empty-list filtered-empty">
          <el-empty description="没有匹配的实验任务" :image-size="80">
            <el-button type="primary" plain size="small" @click="resetLedgerFilters">清除筛选</el-button>
          </el-empty>
        </div>

        <template v-else>
          <div class="ledger-list">
            <article
              v-for="row in filteredTaskRows"
              :key="row.task_id"
              class="ledger-record"
              :class="[
                `status-${row.status}`,
                {
                  focus: focusTask?.task_id === row.task_id,
                  expanded: expandRowKeys.includes(row.task_id)
                }
              ]"
            >
              <div class="ledger-record-top">
                <div class="ledger-record-main">
                  <div class="ledger-record-meta">
                    <div class="ledger-meta-left">
                      <el-tag :type="getTaskStatusType(row.status)" size="small" effect="dark">
                        {{ getTaskStatusText(row.status) }}
                      </el-tag>
                      <span class="ledger-record-id mono" :title="row.task_id">{{ formatShortId(row.task_id) }}</span>
                    </div>
                    <span class="ledger-record-time">{{ getTaskLifecycleText(row) }}</span>
                  </div>
                  <h4 class="ledger-record-title">{{ truncateGoal(row.user_goal) }}</h4>
                  <div class="plan-chip-row">
                    <el-tag v-if="!isUraniumTask(row)" size="small" type="success" effect="plain" class="plan-chip" round>
                      {{ formatModelName(parseParams(row.params)?.model) }}
                    </el-tag>
                    <el-tag
                      v-if="!isUraniumTask(row) && parseParams(row.params)?.planner_strategy && !isNativePlanner(parseParams(row.params).planner_strategy)"
                      size="small"
                      type="warning"
                      effect="plain"
                      class="plan-chip"
                      round
                    >
                      {{ parseParams(row.params).planner_strategy }}
                    </el-tag>
                  </div>
                </div>
              </div>

              <div class="ledger-brief-row">
                <div class="ledger-brief-item">
                  <span>迭代轮数</span>
                  <strong>{{ getTaskIterationCount(row) }} 轮</strong>
                </div>
                <div v-if="row.status === 'running'" class="ledger-brief-item">
                  <span>当前进度</span>
                  <strong>{{ getRunningRoundLabel(row) }}</strong>
                </div>
                <div v-else-if="row.status === 'pending'" class="ledger-brief-item">
                  <span>队列位置</span>
                  <strong>第 {{ getPendingQueueIndex(row) || '-' }} 位</strong>
                </div>
              </div>

              <div v-if="row.status === 'running'" class="ledger-inline-panel">
                <div class="ledger-inline-title">参数修正</div>
                <div class="ledger-param-inline">
                  <div class="ledger-param-group">
                    <span class="ledger-param-label">本轮</span>
                    <span
                      v-for="item in getCurrentRoundParamChips(row).slice(0, 3)"
                      :key="`cur-inline-${item.key}`"
                      class="ledger-param-chip muted"
                    >
                      {{ item.key }}={{ item.value }}
                    </span>
                    <span v-if="!getCurrentRoundParamChips(row).length" class="round-empty">等待启动</span>
                  </div>
                  <div class="ledger-param-group">
                    <span class="ledger-param-label next">下一轮</span>
                    <span
                      v-for="item in getNextRoundParamChips(row).slice(0, 3)"
                      :key="`next-inline-${item.key}`"
                      class="ledger-param-chip next"
                    >
                      {{ item.key }}={{ item.value }}
                    </span>
                    <span v-if="!getNextRoundParamChips(row).length" class="round-empty">优化器计算中</span>
                  </div>
                </div>
              </div>

              <div v-else-if="row.status === 'completed'" class="ledger-inline-panel">
                <div class="ledger-inline-title">核心结果</div>
                <div v-if="getMetricsState(row) === 'loading'" class="metrics-loading">
                  <el-skeleton :rows="1" animated />
                </div>
                <div v-else-if="getMetricsState(row) === 'error'" class="metrics-error">指标读取失败</div>
                <div v-else-if="getMetricsState(row)" class="ledger-metric-inline">
                  <div
                    v-for="item in getMetricItems(row)"
                    :key="`${row.task_id}-metric-inline-${item.key}`"
                    class="ledger-metric-pill"
                    :class="item.tone"
                  >
                    <span class="ledger-metric-pill-label">{{ item.label }}</span>
                    <strong class="ledger-metric-pill-value">{{ item.valueText }}</strong>
                  </div>
                </div>
                <div v-else class="metrics-placeholder">-</div>
              </div>

              <div v-else-if="row.status === 'pending'" class="ledger-inline-panel pending">
                <div class="ledger-inline-title">当前状态</div>
                <div class="ledger-inline-text">等待前序任务完成后进入求解。</div>
              </div>

              <div class="ledger-record-footer">
                <div class="ledger-footer-actions">
                  <el-button
                    v-if="row.status === 'completed'"
                    type="primary"
                    size="small"
                    link
                    @click.stop="viewExperiment(row)"
                  >
                    查看推演
                  </el-button>
                  <el-button
                    type="info"
                    size="small"
                    link
                    @click.stop="openTaskConfigDialog(row)"
                  >
                    查看配置
                  </el-button>
                  <el-button
                    v-if="row.status === 'pending'"
                    type="danger"
                    size="small"
                    link
                    @click.stop="cancelTask(row.task_id)"
                  >
                    取消
                  </el-button>
                  <el-button
                    v-if="row.status === 'failed'"
                    type="warning"
                    size="small"
                    link
                    @click.stop="showError(row)"
                  >
                    <el-icon><Warning /></el-icon> 查看错误
                  </el-button>
                </div>
                <el-button
                  size="small"
                  text
                  type="primary"
                  @click="toggleTaskExpansion(row)"
                >
                  <el-icon v-if="expandRowKeys.includes(row.task_id)"><ArrowUp /></el-icon>
                  <el-icon v-else><ArrowDown /></el-icon>
                  {{ expandRowKeys.includes(row.task_id) ? '收起日志' : '展开日志' }}
                </el-button>
              </div>

              <div v-if="expandRowKeys.includes(row.task_id)" class="ledger-expand-shell">
                <div v-if="taskIterationsMap[row.task_id] === 'loading'" class="ledger-expand-loading">
                  <el-skeleton :rows="3" animated />
                </div>
                <div v-else-if="taskIterationsMap[row.task_id] === 'error'" class="ledger-expand-error">
                  <span>迭代记录读取失败</span>
                  <el-button size="small" type="warning" link @click="loadIterationsForRow(row, true)">重试</el-button>
                </div>
                <div v-else-if="taskIterationsMap[row.task_id] === 'idle'" class="ledger-expand-empty">
                  排队中任务暂未产生迭代记录
                </div>
                <UraniumIterationTimeline
                  v-else-if="taskIterationsMap[row.task_id]?.kind === 'uranium'"
                  :rows="taskIterationsMap[row.task_id].rows || []"
                />
                <PlanIterationTimeline
                  v-else
                  :task="row"
                  :state="taskIterationsMap[row.task_id]"
                  :format-score="formatScore"
                  :format-rate="formatRate"
                  :format-integer="formatInteger"
                  :format-param-value="formatParamValue"
                  @retry="loadIterationsForRow(row, true)"
                  @view-round="openRoundDrawer"
                />
              </div>
            </article>
          </div>
        </template>
      </el-card>
    </div>

    <el-dialog
      v-model="taskConfigDialogVisible"
      title="实验参数配置"
      width="820px"
      destroy-on-close
      class="task-config-dialog"
    >
      <div class="task-config-dialog-body">
        <div class="task-config-hero">
          <div class="task-config-kicker-row">
            <span class="task-config-kicker">配置总览</span>
            <el-tag
              :type="getTaskStatusType(selectedTaskConfig.status)"
              size="small"
              effect="dark"
              class="hero-status-tag"
            >
              {{ selectedTaskConfig.statusText || '-' }}
            </el-tag>
          </div>
          <div class="hero-goal-row">
            <el-icon class="hero-goal-icon"><Aim /></el-icon>
            <div class="hero-goal-text">{{ selectedTaskConfig.goal || '未指定目标' }}</div>
          </div>

          <div class="hero-meta-grid">
            <div class="hero-meta-card">
              <span class="hero-meta-label">任务 ID</span>
              <div class="hero-meta-main">
                <span class="hero-meta-value mono" :title="selectedTaskConfig.taskId">{{ selectedTaskConfig.taskId || '-' }}</span>
                <el-tooltip content="复制" placement="top">
                  <el-icon class="hero-copy-btn" @click="copyTaskConfigId"><CopyDocument /></el-icon>
                </el-tooltip>
              </div>
            </div>
            <div class="hero-meta-card">
              <span class="hero-meta-label">创建于</span>
              <span class="hero-meta-value">{{ selectedTaskConfig.createdAtText || '-' }}</span>
            </div>
          </div>
        </div>

        <div v-if="selectedTaskConfig.coreItems.length" class="task-config-section task-config-overview">
          <div class="section-header">
            <el-icon class="section-header-icon"><Setting /></el-icon>
            <span class="section-header-title">核心参数</span>
            <span class="section-header-count">{{ selectedTaskConfig.coreItems.length }} 项</span>
          </div>
          <div class="core-param-grid task-config-overview-grid">
            <div
              v-for="item in selectedTaskConfig.coreItems"
              :key="item.key"
              class="core-param-card"
            >
              <div class="core-param-label">{{ item.label }}</div>
              <div class="core-param-value mono">{{ item.value }}</div>
            </div>
          </div>
        </div>

        <div v-if="selectedTaskConfig.entityParamRows.length" class="task-config-section">
          <div class="section-header">
            <el-icon class="section-header-icon"><Connection /></el-icon>
            <span class="section-header-title">智能体参数</span>
            <span class="section-header-count">{{ selectedTaskConfig.entityParamRows.length }} 项</span>
          </div>
          <div class="task-config-table-shell">
            <el-table
              class="task-config-table"
              :data="selectedTaskConfig.entityParamRows"
              size="small"
              stripe
              max-height="320"
              empty-text="暂无实体参数"
            >
              <el-table-column prop="entityName" label="实体" width="120" />
              <el-table-column prop="methodName" label="业务能力" width="120" show-overflow-tooltip />
              <el-table-column prop="paramLabel" label="参数" width="150" show-overflow-tooltip />
              <el-table-column prop="recommendedRange" label="建议范围" width="140" />
              <el-table-column label="当前值" min-width="160">
                <template #default="{ row }">
                  <span class="task-config-param-value">{{ row.paramValue }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <div v-if="selectedTaskConfig.otherItems.length" class="task-config-section">
          <div class="section-header">
            <el-icon class="section-header-icon"><More /></el-icon>
            <span class="section-header-title">其他参数</span>
            <span class="section-header-count">{{ selectedTaskConfig.otherItems.length }} 项</span>
          </div>
          <div class="other-param-grid">
            <div
              v-for="row in selectedTaskConfig.otherItems"
              :key="row.key"
              class="other-param-card"
              :class="{ complex: row.isComplex }"
            >
              <div class="other-param-label">{{ row.label }}</div>
              <pre v-if="row.isComplex" class="task-config-json compact">{{ row.pretty }}</pre>
              <div v-else class="other-param-value mono">{{ row.value }}</div>
            </div>
          </div>
        </div>

        <el-empty
          v-if="!selectedTaskConfig.coreItems.length
            && !selectedTaskConfig.entityParamRows.length
            && !selectedTaskConfig.otherItems.length"
          description="暂无任何参数配置"
          :image-size="80"
        />
      </div>
      <template #footer>
        <el-button @click="taskConfigDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <IterationDetailDrawer
      v-model="roundDrawerVisible"
      :row="selectedRound"
      :format-score="formatScore"
      :format-param-value="formatParamValue"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useScnetSupplyChainStore as useSupplyChainStore } from '@/stores/scnet'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import {
  Plus,
  Warning,
  Monitor,
  VideoPlay,
  Aim,
  Setting,
  Connection,
  More,
  CopyDocument,
  Search,
  Sort,
  Refresh,
  ArrowDown,
  ArrowUp
} from '@element-plus/icons-vue'
import './components/shared/midStage.css'
import MidStagePageHeader from './components/shared/MidStagePageHeader.vue'
import SelectedExperimentBanner from './components/SelectedExperimentBanner.vue'
import PlanIterationTimeline from './components/PlanIterationTimeline.vue'
import UraniumExperimentFocusPanel from './components/UraniumExperimentFocusPanel.vue'
import UraniumIterationTimeline from './components/UraniumIterationTimeline.vue'
import IterationDetailDrawer from './components/IterationDetailDrawer.vue'
import { useUraniumDuringStore } from '@/stores/scnet/useUraniumDuringStore'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import {
  formatUraniumMetricValue
} from '@/utils/uraniumDuringAdapter'
import {
  getTaskParams,
  isUraniumTask,
  normalizeScenarioName,
  parseTaskParams as parseParams,
  resolveExperimentIdFromTask
} from '@/utils/scnetTaskUtils'

const router = useRouter()
const store = useSupplyChainStore()
const uraniumStore = useUraniumDuringStore()
const demoStore = useUraniumDemoStore()

// 选中实验快捷入口 banner（替代原 MessageBox 阻塞弹窗）
const selectedExperimentBanner = reactive({
  visible: false,
  experimentId: '',
  sessionId: '',
  taskId: ''
})

function navigateFromBanner(path) {
  selectedExperimentBanner.visible = false
  router.push(path)
}

const recentQueuedTaskId = ref(localStorage.getItem('sc_recentQueuedTaskId') || '')

const runningProgress = ref({
  is_running: false,
  status: 'idle',
  completed: 0,
  total: 0,
  current_iteration: 0,
  elapsed_time: 0,
  estimated_remaining: null,
  percentage: 0,
  current_task: '',
  current_parameters: null,
  next_parameters: null,
  current_param_items: [],
  next_param_items: []
})
const progressHint = ref('')

const taskConfigDialogVisible = ref(false)
const selectedTaskConfig = ref({
  taskId: '',
  status: '',
  statusText: '',
  createdAtText: '',
  goal: '',
  coreItems: [],
  entityParamRows: [],
  otherItems: []
})

// 逐轮详情抽屉
const roundDrawerVisible = ref(false)
const selectedRound = ref(null)
const openRoundDrawer = (row) => {
  selectedRound.value = row
  roundDrawerVisible.value = true
}

const currentUraniumExperimentId = computed(() => demoStore.selectedExperimentId)
const taskHistory = computed(() => demoStore.taskRows || [])
const uraniumHistory = computed(() => demoStore.history || [])
const ledgerQuery = ref('')
const ledgerStatus = ref('all')
const ledgerSort = ref('created_desc')
const refreshing = ref(false)

const uraniumQueueRows = computed(() => (
  taskHistory.value.filter((item) => isUraniumTask(item) && item.status !== 'completed')
))

const uraniumHistoryRows = computed(() => (
  uraniumHistory.value.map((item) => ({
    task_id: item.task_id || `uranium-${item.experiment_id}`,
    experiment_id: item.experiment_id,
    session_id: item.session_id || '',
    user_goal: item.name || item.description || `铀场景实验 · ${item.preset_name || item.template_name || 'baseline'}`,
    status: item.status || 'completed',
    created_at: item.created_at || item.completed_at,
    started_at: item.started_at || item.completed_at,
    completed_at: item.completed_at,
    error_message: item.error_message || null,
    result_path: item.result_path || item.result_relpath || '',
    params: {
      scenario: 'uranium',
      preset_name: item.preset_name || item.template_name || 'baseline',
      optimization_iterations: item.optimization_iterations ?? 1,
      experiment_id: item.experiment_id
    },
    summary: item.summary || {},
    scenario_context: item.scenario_context || {}
  }))
))

const displayTaskRows = computed(() => {
  const inFlightRows = uraniumQueueRows.value.map((item) => {
    const experimentId = resolveExperimentIdFromTask(item)
    return {
      ...item,
      experiment_id: experimentId || item.experiment_id || item.experimentId || ''
    }
  })

  return [
    ...inFlightRows,
    ...uraniumHistoryRows.value.filter((item) => {
      if (!item.experiment_id) return true
      return !inFlightRows.some((queueItem) => queueItem.experiment_id && queueItem.experiment_id === item.experiment_id)
    })
  ]
})

const filteredTaskRows = computed(() => {
  const query = ledgerQuery.value.trim().toLowerCase()
  const status = ledgerStatus.value
  const statusOrder = { running: 0, pending: 1, failed: 2, completed: 3, cancelled: 4 }
  return displayTaskRows.value
    .filter((row) => {
      if (status !== 'all' && row.status !== status) return false
      if (!query) return true
      return [
        row.user_goal,
        row.task_id,
        row.experiment_id,
        resolveExperimentIdFromTask(row)
      ].some((value) => String(value || '').toLowerCase().includes(query))
    })
    .sort((a, b) => {
      if (ledgerSort.value === 'status') {
        return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      }
      const aTime = new Date(a.created_at || 0).getTime()
      const bTime = new Date(b.created_at || 0).getTime()
      return ledgerSort.value === 'created_asc' ? aTime - bTime : bTime - aTime
    })
})

const hasLedgerFilters = computed(() => (
  Boolean(ledgerQuery.value.trim()) || ledgerStatus.value !== 'all' || ledgerSort.value !== 'created_desc'
))

const resetLedgerFilters = () => {
  ledgerQuery.value = ''
  ledgerStatus.value = 'all'
  ledgerSort.value = 'created_desc'
}

const runningTask = computed(() => {
  return uraniumQueueRows.value.find(t => t.status === 'running') || null
})

const pendingTask = computed(() => {
  const pendingRows = uraniumQueueRows.value.filter(t => t.status === 'pending')
  if (!pendingRows.length) return null
  if (recentQueuedTaskId.value) {
    const hit = pendingRows.find(t => t.task_id === recentQueuedTaskId.value)
    if (hit) return hit
  }
  return pendingRows[0]
})

const pendingPosition = computed(() => {
  if (!pendingTask.value) return null
  const pendingRows = uraniumQueueRows.value
    .filter(t => t.status === 'pending')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const idx = pendingRows.findIndex(t => t.task_id === pendingTask.value.task_id)
  return idx >= 0 ? idx + 1 : null
})

const showRunningSection = computed(() => {
  return Boolean(runningProgress.value.is_running || runningTask.value)
})

const displayedTaskId = computed(() => {
  return runningTask.value?.task_id || recentQueuedTaskId.value || '-'
})

const focusTask = computed(() => {
  const selectedExperimentId = currentUraniumExperimentId.value
  return runningTask.value
    || pendingTask.value
    || displayTaskRows.value.find((item) => resolveExperimentIdFromTask(item) === selectedExperimentId)
    || displayTaskRows.value.find((item) => item.status === 'completed')
    || displayTaskRows.value[0]
    || null
})

const focusExperiment = computed(() => {
  if (!focusTask.value) return demoStore.selectedExperiment || null
  return demoStore.getExperimentByTask(focusTask.value) || demoStore.selectedExperiment || null
})

const focusIterationRows = computed(() => {
  if (!focusTask.value) return []
  const state = taskIterationsMap.value[focusTask.value.task_id]
  if (state && typeof state === 'object' && state.kind === 'uranium') {
    return state.rows || []
  }
  return demoStore.getTaskIterations(focusTask.value) || []
})

const progressAdjustmentRows = computed(() => {
  const currentItems = runningProgress.value.current_param_items || []
  const nextItems = runningProgress.value.next_param_items || []
  const nextMap = new Map(nextItems.map((item) => [String(item.key), item.value]))
  const currentMap = new Map(currentItems.map((item) => [String(item.key), item.value]))
  const keys = [...new Set([...currentMap.keys(), ...nextMap.keys()])]
  return keys.slice(0, 4).map((key) => ({
    key,
    label: formatProgressParamLabel(key),
    current: currentMap.has(key) ? String(currentMap.get(key)) : null,
    next: nextMap.has(key) ? String(nextMap.get(key)) : null
  }))
})

const runningStageText = computed(() => {
  const txt = String(runningProgress.value.current_task || '').trim()
  const cur = Number(runningProgress.value.current_iteration || 0)
  const total = Number(runningProgress.value.total || 0)
  if (!showRunningSection.value) return '-'
  if (!txt) return cur > 0 && total > 0 ? `第 ${cur}/${total} 轮执行中` : '任务已启动，等待第一轮进度'
  if (txt.includes('准备中')) {
    return cur > 0 && total > 0
      ? `第 ${cur}/${total} 轮执行中（仿真计算与评估）`
      : '初始化中'
  }
  return txt
})

const formatModelName = (model) => {
  const nameMap = {
    qwen: 'Qwen', deepseek: 'DeepSeek', kimi: 'Kimi', glm: 'GLM'
  }
  return nameMap[model] || model || '-'
}

const taskIterationsMap = ref({})
const iterationFetchInflight = new Set()
const expandRowKeys = ref([])

const clampPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0))

const getMetricItems = (row) => {
  const m = experimentMetricsMap.value[row.task_id]
  if (!m || typeof m !== 'object') return []

  if (m.scenario === 'uranium') {
    const riskPct = Number(m.avg_risk_exposure)
    const inventoryYears = Number(m.final_inventory_coverage_years)
    const avgCost = Number(m.avg_cost_usd_kgU)
    return [
      {
        key: 'cost',
        label: '成本',
        tone: 'primary',
        pct: clampPercent(avgCost / 6),
        valueText: formatUraniumMetricValue('avg_cost_usd_kgU', m.avg_cost_usd_kgU)
      },
      {
        key: 'risk',
        label: '风险',
        tone: 'warning',
        pct: clampPercent(riskPct <= 1 ? riskPct * 100 : riskPct),
        valueText: formatUraniumMetricValue('avg_risk_exposure', m.avg_risk_exposure)
      },
      {
        key: 'inventory',
        label: '库存',
        tone: 'success',
        pct: clampPercent(inventoryYears * 20),
        valueText: formatUraniumMetricValue('final_inventory_coverage_years', m.final_inventory_coverage_years)
      }
    ]
  }

  const completion = Number(m.completion_rate)
  const score = Number(m.overall_score)
  const profit = Number(m.total_net_profit)
  return [
    {
      key: 'completion',
      label: '完成率',
      tone: 'success',
      pct: clampPercent(completion > 1 ? completion : completion * 100),
      valueText: Number.isNaN(completion) ? '-' : `${(completion > 1 ? completion : completion * 100).toFixed(1)}%`
    },
    {
      key: 'score',
      label: '得分',
      tone: 'warning',
      pct: clampPercent(score > 1 ? score : score * 100),
      valueText: Number.isNaN(score) ? '-' : score.toFixed(3)
    },
    {
      key: 'profit',
      label: '净利润',
      tone: 'primary',
      pct: clampPercent(profit / 20000),
      valueText: Number.isNaN(profit) ? '-' : formatInteger(profit)
    }
  ]
}

const overviewStats = computed(() => ({
  plans: displayTaskRows.value.length,
  running: uraniumQueueRows.value.filter(t => t.status === 'running').length,
  completed: uraniumHistoryRows.value.length,
  pending: uraniumQueueRows.value.filter(t => t.status === 'pending').length
}))

const runOverviewCards = computed(() => {
  const active = showRunningSection.value
    ? { value: '运行中', hint: runningStageText.value, tone: 'running' }
    : pendingTask.value
      ? { value: '排队中', hint: `队列第 ${pendingPosition.value || '-'} 位`, tone: 'pending' }
      : { value: '空闲', hint: '可启动实验或查看历史结果', tone: 'idle' }

  return [
    { label: '当前状态', ...active },
    { label: '任务总数', value: `${overviewStats.value.plans}`, hint: `${overviewStats.value.completed} 个已完成`, tone: 'total' },
    { label: '待处理', value: `${overviewStats.value.running + overviewStats.value.pending}`, hint: `${overviewStats.value.running} 运行 / ${overviewStats.value.pending} 排队`, tone: 'pending' },
    { label: '焦点实验', value: formatShortId(focusTask.value?.task_id || ''), hint: truncateGoal(focusTask.value?.user_goal || '暂无焦点实验'), tone: 'focus' }
  ]
})

const PARAM_LABEL_MAP = {
  model: '模型',
  planner_strategy: '策略',
  iterations: '迭代轮数',
  optimization_iterations: '优化轮次',
  lead_time: '交期',
  safety_stock: '安全库存',
  reorder_point: '再订货点',
  order_qty: '订货量',
  service_level: '服务水平',
  demand_factor: '需求系数',
  inventory_target_years: '库存目标年限',
  long_term_contract_weight: '长协供给权重',
  port_diversification_weight: '港口分散度'
}

const formatParamKeyLabel = (key) => PARAM_LABEL_MAP[key] || key
const formatProgressParamLabel = (key) => {
  const labelMap = {
    inventory_target_years: '库存目标年限',
    long_term_contract_weight: '长协供给权重',
    port_diversification_weight: '港口分散度'
  }
  return labelMap[key] || formatParamKeyLabel(key)
}

const getTaskIterationCount = (task) => {
  const params = getTaskParams(task)
  return params.optimization_iterations ?? params.iterations ?? '-'
}

const getPendingQueueIndex = (task) => {
  if (!task?.task_id) return null
  const pendingRows = uraniumQueueRows.value
    .filter(t => t.status === 'pending')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const idx = pendingRows.findIndex(t => t.task_id === task.task_id)
  return idx >= 0 ? idx + 1 : null
}

const getRunningRoundLabel = (task) => {
  if (!task || task.status !== 'running') return '-'
  if (runningTask.value?.task_id === task.task_id) {
    return `${runningProgress.value.current_iteration || 0} / ${runningProgress.value.total || '-'}`
  }
  return '运行中'
}

const getNextRoundParamChips = (row) => {
  if (row.status !== 'running' && row.status !== 'pending') return []
  if (row.status === 'running' && runningTask.value && row.task_id === runningTask.value.task_id) {
    return (runningProgress.value.next_param_items || []).map((item) => ({
      ...item,
      key: formatProgressParamLabel(item.key)
    }))
  }
  const params = parseParams(row.params) || {}
  const adj = params.adjusted_param
  const items = []
  if (adj && typeof adj === 'object' && !Array.isArray(adj)) {
    Object.entries(adj).slice(0, 3).forEach(([k, v]) => {
      items.push({ key: formatParamKeyLabel(k), value: formatParamValue(v) })
    })
  } else if (Array.isArray(adj)) {
    adj.slice(0, 3).forEach(k => {
      items.push({ key: formatParamKeyLabel(k), value: formatParamValue(params[k]) })
    })
  }
  return items
}

const getCurrentRoundParamChips = (row) => {
  if (row.status !== 'running') return []
  if (runningTask.value && row.task_id === runningTask.value.task_id) {
    return (runningProgress.value.current_param_items || []).map((item) => ({
      ...item,
      key: formatProgressParamLabel(item.key)
    }))
  }
  return []
}

const toggleTaskExpansion = (row) => {
  const key = row.task_id
  if (expandRowKeys.value.includes(key)) {
    expandRowKeys.value = expandRowKeys.value.filter((item) => item !== key)
    return
  }
  expandRowKeys.value = [...expandRowKeys.value, key]
  loadIterationsForRow(row)
}

const loadIterationsForRow = async (task, force = false) => {
  const key = task.task_id
  const cached = taskIterationsMap.value[key]
  if (!force && iterationFetchInflight.has(key)) return
  if (!force && cached && cached !== 'loading' && cached !== 'error' && cached !== 'idle') return
  if (task.status === 'pending') {
    taskIterationsMap.value = { ...taskIterationsMap.value, [key]: 'idle' }
    return
  }
  iterationFetchInflight.add(key)
  taskIterationsMap.value = { ...taskIterationsMap.value, [key]: 'loading' }
  try {
    const payload = await fetchTaskIterationData(task)
    taskIterationsMap.value = {
      ...taskIterationsMap.value,
      [key]: payload.kind === 'uranium' ? payload : (payload.rows || [])
    }
  } catch (err) {
    console.error('[ExperimentManager] loadIterationsForRow failed', err)
    taskIterationsMap.value = { ...taskIterationsMap.value, [key]: 'error' }
  } finally {
    iterationFetchInflight.delete(key)
  }
}

const truncateGoal = (goal) => {
  if (!goal) return '未指定目标'
  const cleaned = goal.replace(/^【[^】]+】/, '')
  return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned
}

const getTaskStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    running: 'primary',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return typeMap[status] || 'info'
}

const getTaskStatusText = (status) => {
  const textMap = {
    pending: '排队中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return textMap[status] || status
}

const formatShortId = (value) => {
  const text = String(value || '').trim()
  if (!text) return '-'
  if (text.length <= 18) return text
  return `${text.slice(0, 10)}...${text.slice(-4)}`
}

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  const utcTimestamp = timestamp.replace(' ', 'T') + 'Z'
  const date = new Date(utcTimestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 0 || diff > 30 * 24 * 3600000) {
    return date.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}天前`

  return date.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

const getTaskLifecycleText = (task) => {
  if (!task) return '-'
  if (task.status === 'running') {
    return `已于 ${formatTime(task.started_at || task.created_at)} 启动`
  }
  if (task.status === 'pending') {
    return `创建于 ${formatTime(task.created_at)}，等待调度`
  }
  if (task.status === 'completed') {
    return `完成于 ${formatTime(task.completed_at || task.created_at)}`
  }
  if (task.status === 'failed') {
    return `失败于 ${formatTime(task.completed_at || task.created_at)}`
  }
  if (task.status === 'cancelled') {
    return `已于 ${formatTime(task.completed_at || task.created_at)} 取消`
  }
  return `创建于 ${formatTime(task.created_at)}`
}

const formatScore = (score) => {
  if (score == null || Number.isNaN(Number(score))) return '-'
  return Number(score).toFixed(3)
}

const formatRate = (rate) => {
  if (rate == null || Number.isNaN(Number(rate))) return '-'
  const value = Number(rate)
  if (value <= 1) return `${(value * 100).toFixed(1)}%`
  return `${value.toFixed(1)}%`
}

const isNativePlanner = (plannerStrategy) => {
  return String(plannerStrategy || '').trim().toLowerCase() === 'native'
}

const formatInteger = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return Math.round(Number(value)).toLocaleString('zh-CN')
}

const formatParamValue = (value) => {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const simpleList = value.every(v => ['string', 'number', 'boolean'].includes(typeof v))
    if (simpleList && value.length <= 6) {
      return `[${value.map(v => typeof v === 'number' ? Number(v).toFixed(2) : String(v)).join(', ')}]`
    }
    return `数组(${value.length})`
  }
  if (typeof value === 'number') {
    return Number(value).toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
  }
  if (value && typeof value === 'object') {
    return `对象(${Object.keys(value).length})`
  }
  return String(value)
}

const getScenarioDisplayLabel = (value) => {
  const scenario = normalizeScenarioName(value)
  if (scenario === 'uranium') return '铀供应链'
  if (scenario === 'automotive') return '汽车供应链'
  return String(value || '-')
}

const getPresetDisplayLabel = (value) => {
  const presetName = String(value || '').trim()
  const labelMap = {
    baseline: '基准实验',
    balanced: '平衡方案',
    feedback_optimization: '反馈优化',
    security_first: '保供优先',
    cost_first: '成本优先',
    shock_response: '冲击响应',
    historical_replay: '历史复现',
    extreme_shock: '极端冲击'
  }
  return labelMap[presetName] || presetName || '-'
}

const formatConfigDisplayValue = (key, value) => {
  if (key === 'scenario') return getScenarioDisplayLabel(value)
  if (key === 'preset_name' || key === 'template_name') return getPresetDisplayLabel(value)
  if (key === 'optimization_iterations' || key === 'iterations') {
    const rounds = Number(value)
    return Number.isFinite(rounds) ? `${rounds} 轮` : formatParamValue(value)
  }
  if (key === 'start_year' || key === 'end_year') {
    return value != null ? `${value} 年` : '-'
  }
  return formatParamValue(value)
}

const formatRangeText = (minValue, maxValue) => {
  if (minValue == null || maxValue == null) return '-'
  return `${formatParamValue(minValue)} ~ ${formatParamValue(maxValue)}`
}

const normalizeParamObject = (raw) => {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const prettifyParamValue = (value) => {
  if (value == null) return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const paramKeyLabelMap = {
  scenario: '实验场景',
  iterations: '迭代轮次',
  optimization_iterations: '迭代轮次',
  model: '模型',
  preset_name: '策略取向',
  template_name: '策略取向',
  start_year: '起始年',
  end_year: '结束年',
  starting_price_usd_per_lb: '起始铀价',
  event_severity_multiplier: '事件强度系数',
  secondary_supply_multiplier: '二级供给系数',
  forced_event_names: '强制事件',
  suppressed_event_names: '抑制事件',
  synthetic_events: '附加事件',
  policy_profiles: '策略画像',
  planner_strategy: '规划策略',
  use_decompose: '启用目标拆解',
  user_goal: '用户目标',
  goal_decomposition_subtasks: '目标拆解子任务',
  subtask_variable_configs: '子任务变量配置',
  agent_models: 'Agent 模型配置'
}

const getParamLabel = (key) => {
  return paramKeyLabelMap[key] || key
}

const getAgentBlueprintMap = () => {
  const map = {}
  const catalog =
    store.setAgentsResult?.parameter_catalog ||
    store.scenarioApiResult?.parameter_catalog ||
    null
  const agents = Array.isArray(catalog?.agent_graph?.agents)
    ? catalog.agent_graph.agents
    : []

  for (const agent of agents) {
    if (!agent?.id) continue
    const params = Array.isArray(agent.configurableParams)
      ? agent.configurableParams
      : Array.isArray(agent.configurable_params)
        ? agent.configurable_params
        : []
    map[agent.id] = {
      name: agent.name || agent.id,
      defaultMethod: agent.defaultMethod || '-',
      paramMap: Object.fromEntries(params.map((param) => [param.key, param]))
    }
  }

  return map
}

const buildEntityParamRows = (params) => {
  const nodeConfigs = params?.agent_node_configs
  if (!nodeConfigs || typeof nodeConfigs !== 'object') return []
  const agentBlueprintMap = getAgentBlueprintMap()
  const methodMap = params?.agent_methods && typeof params.agent_methods === 'object'
    ? params.agent_methods
    : {}
  const rows = []

  for (const [agentId, cfg] of Object.entries(nodeConfigs)) {
    const blueprint = agentBlueprintMap[agentId] || { name: agentId, defaultMethod: '-', paramMap: {} }
    const paramDefs = blueprint.paramMap || {}
    const paramObj = cfg?.params && typeof cfg.params === 'object' ? cfg.params : {}
    const methodName = methodMap[agentId] || cfg?.selectedMethod || blueprint.defaultMethod || '-'

    for (const [paramKey, paramRawValue] of Object.entries(paramObj)) {
      const def = paramDefs[paramKey] || {}
      let paramValue = formatParamValue(paramRawValue)
      if (Array.isArray(paramRawValue) && paramRawValue.length >= 2) {
        paramValue = formatRangeText(paramRawValue[0], paramRawValue[1])
      }
      let recommendedRange = '-'
      if (def.type === 'range' && def.min != null && def.max != null) {
        recommendedRange = formatRangeText(def.min, def.max)
      } else if (def.type === 'number' && def.min != null && def.max != null) {
        recommendedRange = `${formatParamValue(def.min)} ~ ${formatParamValue(def.max)}`
      }

      rows.push({
        rowKey: `${agentId}-${paramKey}`,
        entityName: blueprint.name,
        methodName,
        paramLabel: def.label || getParamLabel(paramKey),
        recommendedRange,
        paramValue
      })
    }
  }

  return rows
}

const buildTaskParamConfigSections = (rawParams) => {
  const params = normalizeParamObject(rawParams)
  if (!params || typeof params !== 'object') {
    return { coreItems: [], entityParamRows: [], otherItems: [] }
  }

  const coreKeys = normalizeScenarioName(params.scenario) === 'uranium'
    ? [
        'scenario',
        'preset_name',
        'optimization_iterations',
        'start_year',
        'end_year',
        'starting_price_usd_per_lb',
        'event_severity_multiplier',
        'secondary_supply_multiplier'
      ]
    : ['scenario', 'iterations', 'model', 'planner_strategy', 'use_decompose']
  const hiddenKeys = ['agent_methods', 'agent_node_configs', 'experiment_id', 'experimentId', 'result_path', 'result_relpath']
  const excludedKeys = new Set([...coreKeys, ...hiddenKeys])

  const coreItems = coreKeys
    .filter(key => Object.prototype.hasOwnProperty.call(params, key))
    .map((key) => ({
      key,
      label: getParamLabel(key),
      value: formatConfigDisplayValue(key, params[key])
    }))

  const entityParamRows = buildEntityParamRows(params)

  const otherItems = Object.entries(params)
    .filter(([key]) => !excludedKeys.has(key))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => {
      const isComplex = value && typeof value === 'object'
      return {
        key,
        label: getParamLabel(key),
        value: formatConfigDisplayValue(key, value),
        isComplex,
        preview: formatConfigDisplayValue(key, value),
        pretty: isComplex ? prettifyParamValue(value) : ''
      }
    })

  return { coreItems, entityParamRows, otherItems }
}

const syncRecentQueuedMarker = () => {
  if (!recentQueuedTaskId.value) return
  const row = uraniumQueueRows.value.find(t => t.task_id === recentQueuedTaskId.value)
  if (!row || ['completed', 'failed', 'cancelled'].includes(row.status)) {
    localStorage.removeItem('sc_recentQueuedTaskId')
    recentQueuedTaskId.value = ''
  }
}

const fetchTaskIterationData = async (task) => {
  const experimentId = resolveExperimentIdFromTask(task)
  if (!experimentId) {
    throw new Error('无法解析实验ID')
  }

  if (isUraniumTask(task)) {
    return {
      kind: 'uranium',
      experimentId,
      rows: demoStore.getTaskIterations(task)
    }
  }

  throw new Error('当前页面仅提供铀场景任务数据')
}

const fetchRunningProgress = async () => {
  try {
    const next = demoStore.getRunningProgress()
    const prev = runningProgress.value
    const changed = !prev
      || prev.is_running !== next.is_running
      || prev.status !== next.status
      || prev.completed !== next.completed
      || prev.total !== next.total
      || prev.current_iteration !== next.current_iteration
      || prev.elapsed_time !== next.elapsed_time
      || prev.estimated_remaining !== next.estimated_remaining
      || prev.percentage !== next.percentage
      || prev.current_task !== next.current_task
      || JSON.stringify(prev.current_parameters) !== JSON.stringify(next.current_parameters)
      || JSON.stringify(prev.next_parameters) !== JSON.stringify(next.next_parameters)
    if (changed) runningProgress.value = next

    const hint = next.is_running && !next.current_task ? '实验已启动，等待进入下一轮。' : ''
    if (progressHint.value !== hint) progressHint.value = hint
  } catch (error) {
    console.error('获取运行进度失败:', error)
    progressHint.value = runningTask.value ? '实验进度读取失败，当前显示的是任务基础状态。' : ''
  }
}

const openTaskConfigDialog = (task) => {
  const sections = buildTaskParamConfigSections(task?.params)
  selectedTaskConfig.value = {
    taskId: task?.task_id || '',
    status: task?.status || '',
    statusText: getTaskStatusText(task?.status),
    createdAtText: formatTime(task?.created_at),
    goal: task?.user_goal || '未指定目标',
    coreItems: sections.coreItems,
    entityParamRows: sections.entityParamRows,
    otherItems: sections.otherItems
  }
  taskConfigDialogVisible.value = true
}

const copyTaskConfigId = async () => {
  const id = selectedTaskConfig.value.taskId
  if (!id) return
  try {
    await navigator.clipboard.writeText(id)
    ElMessage.success('任务 ID 已复制')
  } catch {
    ElMessage.error('复制失败,请手动复制')
  }
}

const refreshData = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await demoStore.ensureInitialized()
    syncRecentQueuedMarker()
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

const refreshLedger = async () => {
  await refreshData()
  await fetchRunningProgress()
  scheduleMetricsFetch()
}

const viewExperiment = async (task) => {
  try {
    const loadingMsg = ElMessage({
      message: '正在加载实验详情...',
      type: 'info',
      duration: 0,
      iconClass: 'el-icon-loading'
    })

    const experimentId = resolveExperimentIdFromTask(task)

    if (experimentId) {
      if (task?.session_id) {
        store.setCurrentSessionId(task.session_id)
      }
      if (isUraniumTask(task)) {
        await demoStore.loadExperiment(experimentId)
        store.setCurrentExperimentId(experimentId)
      } else {
        await store.selectExperiment(experimentId)
      }
      localStorage.setItem('sc_lastViewedTaskId', task.task_id)
      loadingMsg.close()

      // 不再弹出阻塞式 MessageBox，改为顶部内嵌的快捷入口 Banner
      selectedExperimentBanner.experimentId = experimentId
      selectedExperimentBanner.sessionId = task?.session_id || ''
      selectedExperimentBanner.taskId = task.task_id
      selectedExperimentBanner.visible = true
      ElMessage.success({
        message: `已加载实验，请通过顶部入口选择查看界面`,
        duration: 2200
      })
    } else {
      loadingMsg.close()
      ElMessage.warning('无法解析实验ID')
    }
  } catch (error) {
    console.error('加载实验失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  }
}

const cancelTask = async (taskId) => {
  try {
    await ElMessageBox.confirm('确定要取消这个任务吗？', '确认取消', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await demoStore.cancelTask(taskId)
    ElMessage.success('任务已取消')
    await refreshData()
    await fetchRunningProgress()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消任务失败:', error)
      ElMessage.error('取消失败')
    }
  }
}

const showError = (task) => {
  ElMessageBox.alert(
    task.error_message || '未知错误',
    '任务执行失败',
    { confirmButtonText: '确定', type: 'error' }
  )
}

const createNewExperiment = () => {
  localStorage.removeItem('sc_lastViewedTaskId')
  uraniumStore.resetDraft()
  router.push(SCNET_ROUTES.duringEntry)
}

const launching = ref(false)
const launchDisabledReason = computed(() => '')
const canLaunch = computed(() => !launchDisabledReason.value)

async function launchCurrentSession() {
  if (!canLaunch.value || launching.value) return
  launching.value = true
  try {
    const draft = {
      ...(uraniumStore.draft || {}),
      name: uraniumStore.draft?.name || store.scenarioUserGoal || '事中铀供应链推演',
      description: uraniumStore.draft?.description || store.scenarioUserGoal || ''
    }
    const experiment = await uraniumStore.runExperiment(draft)
    const experimentId = String(experiment?.experiment_id || '').trim()
    if (!experimentId) throw new Error('后端未返回实验 ID')
    store.setCurrentExperimentId(experimentId)
    if (store.currentSessionId) {
      try {
        const { linkExperiment } = await import('@/api/scenarioSession')
        await linkExperiment(store.currentSessionId, experimentId)
      } catch (linkError) {
        console.warn('[ExperimentManager] 关联会话失败:', linkError?.message || linkError)
      }
    }
    ElNotification.success({
      title: '实验已生成',
      message: '后端实验已完成，正在打开结果报告',
      duration: 3000
    })
    await router.push({ path: SCNET_ROUTES.EXreport, query: { experiment_id: experimentId } })
  } catch (error) {
    console.error('[ExperimentManager] launchCurrentSession 失败', error)
    ElMessage.error('启动实验失败: ' + (error?.message || '未知错误'))
  } finally {
    launching.value = false
  }
}

const stoppingExperiment = ref(false)
const stopRunningExperiment = async () => {
  if (!showRunningSection.value || stoppingExperiment.value) return
  try {
    await ElMessageBox.confirm('确定要停止当前正在运行的实验吗？该操作不可撤销。', '停止实验', {
      type: 'warning',
      confirmButtonText: '确定停止',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  stoppingExperiment.value = true
  try {
    const stopped = await demoStore.stopRunningExperiment()
    if (!stopped) {
      ElMessage.info('当前没有可停止的运行任务')
      return
    }
    ElMessage.success('已停止当前实验')
    await refreshData()
    await fetchRunningProgress()
  } catch (err) {
    console.error('[ExperimentManager] stopRunningExperiment failed', err)
    ElMessage.error('停止实验失败：' + (err?.message || '未知错误'))
  } finally {
    stoppingExperiment.value = false
  }
}

onMounted(async () => {
  await refreshData()
  await fetchRunningProgress()
  if (focusTask.value) {
    loadIterationsForRow(focusTask.value)
  }
  scheduleMetricsFetch()
})

watch(
  () => displayTaskRows.value.map(t => `${t.task_id}:${t.status}`).join('|'),
  () => {
    syncRecentQueuedMarker()
    fetchRunningProgress()
    scheduleMetricsFetch()
  }
)

watch(
  () => focusTask.value?.task_id,
  (taskId) => {
    if (!taskId || !focusTask.value) return
    loadIterationsForRow(focusTask.value)
  }
)

const experimentMetricsMap = ref({})
const METRICS_MAX_CONCURRENT = 3
const metricsFetchQueue = []
let metricsActiveFetches = 0
let metricsCancelled = false

const getMetricsState = (row) => {
  if (!row || row.status !== 'completed') return null
  const cached = experimentMetricsMap.value[row.task_id]
  return cached == null ? null : cached
}

const fetchMetricsForTask = async (task) => {
  const experimentId = resolveExperimentIdFromTask(task)
  if (!experimentId) {
    experimentMetricsMap.value = { ...experimentMetricsMap.value, [task.task_id]: 'error' }
    return
  }
  try {
    if (isUraniumTask(task)) {
      const summary = demoStore.getTaskMetrics(task) || {}
      experimentMetricsMap.value = {
        ...experimentMetricsMap.value,
        [task.task_id]: {
          scenario: 'uranium',
          avg_cost_usd_kgU: summary.avg_cost_usd_kgU ?? null,
          avg_risk_exposure: summary.avg_risk_exposure ?? null,
          final_inventory_coverage_years: summary.final_inventory_coverage_years ?? null
        }
      }
      return
    }
    experimentMetricsMap.value = { ...experimentMetricsMap.value, [task.task_id]: 'error' }
  } catch {
    experimentMetricsMap.value = { ...experimentMetricsMap.value, [task.task_id]: 'error' }
  }
}

const runMetricsQueue = () => {
  while (metricsActiveFetches < METRICS_MAX_CONCURRENT && metricsFetchQueue.length > 0) {
    if (metricsCancelled) {
      metricsFetchQueue.length = 0
      return
    }
    const task = metricsFetchQueue.shift()
    metricsActiveFetches++
    fetchMetricsForTask(task).finally(() => {
      metricsActiveFetches--
      if (!metricsCancelled) runMetricsQueue()
    })
  }
}

const scheduleMetricsFetch = () => {
  if (metricsCancelled) return
  const queued = new Set(metricsFetchQueue.map(t => t.task_id))
  for (const row of displayTaskRows.value) {
    if (row.status !== 'completed') continue
    if (experimentMetricsMap.value[row.task_id] !== undefined) continue
    if (queued.has(row.task_id)) continue
    experimentMetricsMap.value = { ...experimentMetricsMap.value, [row.task_id]: 'loading' }
    metricsFetchQueue.push(row)
  }
  runMetricsQueue()
}

onUnmounted(() => {
  metricsCancelled = true
  metricsFetchQueue.length = 0
})
</script>

<style scoped>
.launch-btn-wrap {
  display: inline-flex;
}
.experiment-manager {
  --ux-ink: #0f172a;
  --ux-muted: #64748b;
  --ux-muted-2: #94a3b8;
  --ux-border: #dbe4f0;
  --ux-blue: #2563eb;
  --ux-amber: #d97706;
  --ux-mint: #059669;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 6px 0 20px;
  overflow: auto;
  gap: 8px;
  font-family: var(--mid-font-sans);
}

.experiment-manager > .iteration-progress-section,
.experiment-manager > .focus-experiment-section,
.experiment-manager > .experiment-list,
.experiment-manager > .run-overview,
.experiment-manager > .selected-exp-banner {
  margin-left: 8px;
  margin-right: 8px;
}

.run-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.run-overview-card {
  min-height: 76px;
  padding: 10px 12px;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  background: rgba(255,255,255,.86);
  box-shadow: 0 6px 16px rgba(15,23,42,.05);
  box-sizing: border-box;
}

.run-overview-card span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.run-overview-card strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 18px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.run-overview-card p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.run-overview-card.running { border-color: #93c5fd; background: linear-gradient(135deg, #eff6ff, #fff); }
.run-overview-card.pending { border-color: #fde68a; background: linear-gradient(135deg, #fffbeb, #fff); }
.run-overview-card.focus { border-color: #bbf7d0; background: linear-gradient(135deg, #f0fdf4, #fff); }

.progress-title,
.list-title,
.ledger-record-title,
.hero-goal-text {
  font-family: var(--mid-font-sans);
  letter-spacing: 0.01em;
}

.mono {
  font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
}

.iteration-progress-section {
  margin: 2px 0 4px;
}

.iteration-progress-section :deep(.el-card) {
  border-radius: var(--mid-radius-lg);
  border-color: #dbe4f0;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.iteration-progress-section :deep(.el-card__header) {
  padding: 12px 14px 0;
  border-bottom: none;
}

.iteration-progress-section :deep(.el-card__body) {
  padding: 8px 14px 10px;
}

.progress-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}


.progress-title {
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: var(--ux-ink);
}


.progress-content {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.progress-hero {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--mid-radius-md);
  border: 1px solid var(--ux-border);
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 26%),
    linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.progress-hero.pending {
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 30%),
    linear-gradient(180deg, #fffaf2 0%, #ffffff 100%);
}

.progress-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.progress-kicker {
  font-size: var(--mid-fs-micro);
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--ux-blue);
}

.progress-hero-title {
  font-size: var(--mid-fs-title);
  line-height: var(--mid-lh-tight);
  font-weight: 800;
  color: var(--ux-ink);
}

.progress-hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.progress-hero-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--ux-border);
  background: rgba(255, 255, 255, 0.9);
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: #475569;
}

.progress-hero-pill.primary {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.progress-hero-pill.warning {
  border-color: #fde68a;
  background: #fffbeb;
  color: #b45309;
}

.progress-hero-side {
  min-width: 92px;
  padding: 8px 10px;
  border-radius: var(--mid-radius-md);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #dbe4f0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 3px;
}

.progress-hero-side strong {
  font-size: var(--mid-fs-hero);
  line-height: 1;
  font-weight: 900;
  color: var(--ux-ink);
  font-family: var(--mid-font-mono);
}

.progress-hero-side span {
  font-size: var(--mid-fs-label);
  color: var(--ux-muted);
}

.progress-track-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--mid-radius-md);
  border: 1px solid var(--ux-border);
  background: linear-gradient(180deg, #f9fbfe 0%, #ffffff 100%);
}

.progress-track-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.progress-stage-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: #1d4ed8;
}

.progress-inline-hint {
  font-size: var(--mid-fs-label);
  color: var(--ux-muted-2);
}

.progress-task-text {
  font-size: var(--mid-fs-body);
  color: var(--el-text-color-primary);
  line-height: 1.5;
}

.progress-pending-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 0;
  color: var(--ux-muted);
  font-size: var(--mid-fs-label);
}

.progress-brief-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.progress-brief-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--mid-radius-sm);
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.progress-brief-item span {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.progress-brief-item strong {
  font-size: var(--mid-fs-strong);
  line-height: 1.2;
  font-weight: 800;
  color: var(--ux-ink);
}

.progress-brief-item strong.mono {
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
}

.progress-adjust-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.progress-adjust-inline-label {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.progress-adjust-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #dbe4f0;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: #475569;
}

.progress-note {
  padding: 8px 10px;
  border-radius: var(--mid-radius-sm);
  background: #fff7ed;
  border: 1px solid #fed7aa;
  font-size: var(--mid-fs-label);
  line-height: 1.55;
  color: #9a3412;
}

.progress-note.info {
  background: #f8fbff;
  border-color: #dbeafe;
  color: #1d4ed8;
}

.focus-experiment-section {
  margin-bottom: 8px;
}

.experiment-list {
  flex: 1;
  min-height: 0;
}

.experiment-list :deep(.el-card) {
  border-radius: var(--mid-radius-lg);
  border-color: #dbe4f0;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.experiment-list :deep(.el-card__header) {
  padding: 12px 14px 0;
  border-bottom: none;
}

.experiment-list :deep(.el-card__body) {
  padding: 0 14px 14px;
}

.ledger-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  margin-bottom: 10px;
  border-bottom: 1px solid #edf2f7;
}

.ledger-toolbar-main,
.ledger-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ledger-toolbar-main {
  flex: 1;
  min-width: 0;
}

.ledger-search {
  width: min(360px, 100%);
}

.ledger-status-select {
  width: 124px;
}

.ledger-sort-select {
  width: 124px;
}

.ledger-result-count {
  color: var(--ux-muted);
  font-size: var(--mid-fs-label);
  white-space: nowrap;
}

.filtered-empty {
  padding-top: 12px;
}

.empty-list {
  padding: 28px 0;
}

.plan-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.plan-chip {
  border-radius: 999px;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-inline: 2px;
}

.metrics-placeholder {
  color: var(--el-text-color-placeholder);
  font-size: var(--mid-fs-body);
}

.metrics-loading {
  width: 100%;
  max-width: 200px;
}

.metrics-error {
  color: var(--el-color-danger);
  font-size: var(--mid-fs-body);
}

.list-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}


.list-title {
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: var(--ux-ink);
}


.list-header-stats {
  display: flex;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
}

.overview-pill {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  min-width: 76px;
  padding: 7px 10px;
  border-radius: var(--mid-radius-sm);
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #dbe4f0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.overview-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.06);
}

.overview-pill.running {
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
  border-color: #bfdbfe;
}

.overview-pill.pending {
  background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);
  border-color: #fde68a;
}

.overview-pill.completed {
  background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%);
  border-color: #bbf7d0;
}

.overview-pill.running .overview-value { color: #2563eb; }
.overview-pill.pending .overview-value { color: #b45309; }
.overview-pill.completed .overview-value { color: #059669; }

.overview-label {
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: #64748b;
}

.overview-value {
  margin-top: 2px;
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
  font-family: var(--mid-font-mono);
}

.ledger-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ledger-record {
  position: relative;
  overflow: hidden;
  padding: 12px 14px;
  border-radius: var(--mid-radius-lg);
  border: 1px solid var(--ux-border);
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.05), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ledger-record::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 999px;
  background: #cbd5e1;
}

.ledger-record::after {
  content: '';
  position: absolute;
  right: -40px;
  top: -40px;
  width: 140px;
  height: 140px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, transparent 68%);
  pointer-events: none;
}

.ledger-record:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
}

.ledger-record.focus {
  border-color: rgba(37, 99, 235, 0.35);
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.08);
}

.ledger-record.status-running {
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.08), transparent 30%),
    linear-gradient(180deg, #f8fdff 0%, #ffffff 100%);
}

.ledger-record.status-running::before {
  background: linear-gradient(180deg, #38bdf8 0%, #2563eb 100%);
}

.ledger-record.status-pending {
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.08), transparent 30%),
    linear-gradient(180deg, #fffdf8 0%, #ffffff 100%);
}

.ledger-record.status-pending::before {
  background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
}

.ledger-record.status-completed {
  background:
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.07), transparent 30%),
    linear-gradient(180deg, #f8fffb 0%, #ffffff 100%);
}

.ledger-record.status-completed::before {
  background: linear-gradient(180deg, #34d399 0%, #059669 100%);
}

.ledger-record.status-failed {
  background:
    radial-gradient(circle at top right, rgba(239, 68, 68, 0.07), transparent 30%),
    linear-gradient(180deg, #fffafa 0%, #ffffff 100%);
}

.ledger-record.status-failed::before {
  background: linear-gradient(180deg, #f87171 0%, #ef4444 100%);
}

.ledger-record-top,
.ledger-record-meta,
.ledger-record-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.ledger-record-meta {
  align-items: center;
}

.ledger-meta-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.ledger-record-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.ledger-record-id {
  font-size: var(--mid-fs-label);
  color: #94a3b8;
}

.ledger-record-time {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.92);
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: var(--ux-muted);
}

.ledger-record-title {
  margin: 0;
  font-size: var(--mid-fs-title);
  line-height: var(--mid-lh-tight);
  font-weight: 800;
  color: var(--ux-ink);
}

.ledger-record-footer :deep(.el-button),
.ledger-footer-actions :deep(.el-button.is-link) {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.86);
  font-weight: 700;
  font-size: var(--mid-fs-body);
}

.ledger-record-footer :deep(.el-button:hover),
.ledger-footer-actions :deep(.el-button.is-link:hover) {
  background: #ffffff;
  border-color: #bfdbfe;
}

.ledger-brief-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 0;
}

.ledger-brief-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e5edf6;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.ledger-brief-item span {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.ledger-brief-item strong {
  font-size: var(--mid-fs-strong);
  line-height: var(--mid-lh-tight);
  font-weight: 800;
  color: var(--ux-ink);
}

.ledger-inline-panel {
  margin-top: 0;
  padding: 10px 12px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e5edf6;
  background: linear-gradient(180deg, #fcfdff 0%, #ffffff 100%);
}

.ledger-inline-panel.pending {
  background: linear-gradient(180deg, #fffaf2 0%, #ffffff 100%);
  border-color: #fde68a;
}

.ledger-inline-title {
  margin-bottom: 8px;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.ledger-inline-text {
  font-size: var(--mid-fs-body);
  line-height: var(--mid-lh-body);
  color: #475569;
}

.ledger-param-inline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ledger-param-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.ledger-param-label {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.ledger-param-label.next {
  color: var(--ux-mint);
}

.ledger-param-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  border: 1px solid #dbe4f0;
}

.ledger-param-chip.muted {
  background: #f8fafc;
  color: #64748b;
}

.ledger-param-chip.next {
  background: #ecfdf5;
  border-color: #bbf7d0;
  color: #047857;
}

.ledger-metric-inline {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
  gap: 8px;
  width: 100%;
  align-items: stretch;
}

.ledger-metric-pill {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  min-height: 46px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e5edf6;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  padding: 7px 10px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.ledger-metric-pill-label {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.ledger-metric-pill-value {
  font-size: var(--mid-fs-title);
  line-height: 1.2;
  font-weight: 800;
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  white-space: nowrap;
}

.ledger-metric-pill.primary {
  background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
  border-color: #dbeafe;
}

.ledger-metric-pill.warning {
  background: linear-gradient(180deg, #fffaf2 0%, #ffffff 100%);
  border-color: #fed7aa;
}

.ledger-metric-pill.success {
  background: linear-gradient(180deg, #f4fff8 0%, #ffffff 100%);
  border-color: #bbf7d0;
}

.ledger-metric-pill.primary .ledger-metric-pill-value {
  color: var(--ux-blue);
}

.ledger-metric-pill.warning .ledger-metric-pill-value {
  color: var(--ux-amber);
}

.ledger-metric-pill.success .ledger-metric-pill-value {
  color: var(--ux-mint);
}

.ledger-record-footer {
  align-items: center;
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px dashed #dbe4f0;
}

.ledger-expand-action {
  flex-shrink: 0;
}

.ledger-expand-action :deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ledger-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ledger-expand-shell {
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px dashed #dbe4f0;
}

.ledger-expand-loading,
.ledger-expand-error,
.ledger-expand-empty {
  padding: 10px 12px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.ledger-expand-error,
.ledger-expand-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #64748b;
  font-size: var(--mid-fs-body);
}

.round-empty {
  color: var(--el-text-color-placeholder);
  font-size: var(--mid-fs-label);
}

.progress-card-header :deep(.el-tag),
.ledger-record-meta :deep(.el-tag),
.plan-chip-row :deep(.el-tag) {
  border-radius: 999px;
  font-weight: 700;
}

.task-config-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-config-dialog :deep(.el-dialog) {
  border-radius: var(--mid-radius-lg);
  overflow: hidden;
  border: 1px solid #dbe4f0;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.16);
}

.task-config-dialog :deep(.el-dialog__header) {
  padding: 14px 16px 0;
  margin-right: 0;
}

.task-config-dialog :deep(.el-dialog__body) {
  padding: 12px 16px 16px;
}

.task-config-dialog :deep(.el-dialog__footer) {
  padding: 0 16px 16px;
}

.task-config-dialog :deep(.el-dialog__title) {
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: var(--ux-ink);
}

.task-config-dialog :deep(.el-dialog__headerbtn) {
  top: 12px;
  right: 14px;
}

.task-config-hero {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--mid-radius-md);
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.10), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  border: 1px solid #dbe4f0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.task-config-kicker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.task-config-kicker {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  font-size: var(--mid-fs-micro);
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #1d4ed8;
}

.hero-goal-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.hero-goal-icon {
  font-size: 16px;
  color: var(--ux-blue);
  margin-top: 2px;
  flex-shrink: 0;
}

.hero-goal-text {
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: var(--ux-ink);
  line-height: var(--mid-lh-tight);
}

.hero-status-tag {
  flex-shrink: 0;
}

.hero-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.hero-meta-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.88);
}

.hero-meta-main {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.hero-meta-label {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.hero-meta-value {
  color: var(--ux-ink);
  font-size: var(--mid-fs-body);
  font-weight: 700;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-meta-value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.hero-copy-btn {
  cursor: pointer;
  color: var(--ux-blue);
  font-size: var(--mid-fs-strong);
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.hero-copy-btn:hover {
  opacity: 0.7;
}

.task-config-section {
  border: 1px solid #e2e8f0;
  border-radius: var(--mid-radius-md);
  background: #fff;
  padding: 10px 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.section-header-icon {
  font-size: 14px;
  color: var(--ux-blue);
}

.section-header-title {
  font-size: var(--mid-fs-strong);
  font-weight: 800;
  color: var(--ux-ink);
}

.section-header-count {
  font-size: var(--mid-fs-micro);
  color: var(--ux-muted);
  background: #f8fafc;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 700;
}

.core-param-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.core-param-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid #e5edf6;
  border-radius: var(--mid-radius-sm);
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  transition: border-color 0.15s, background 0.15s;
  min-height: 56px;
}

.core-param-card:hover {
  border-color: #bfdbfe;
  background: linear-gradient(180deg, #eef6ff 0%, #ffffff 100%);
}

.core-param-label {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
  letter-spacing: 0.02em;
}

.core-param-value {
  font-size: var(--mid-fs-strong);
  font-weight: 800;
  color: var(--ux-ink);
  word-break: break-all;
  line-height: 1.4;
}

.core-param-value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.task-config-table-shell {
  border-radius: var(--mid-radius-sm);
  overflow: hidden;
  border: 1px solid #e5edf6;
  background: #ffffff;
}

.task-config-table-shell :deep(.el-table) {
  --el-table-border-color: #e5edf6;
  --el-table-header-bg-color: #f8fafc;
  --el-table-row-hover-bg-color: #f8fbff;
}

.task-config-table-shell :deep(.el-table th.el-table__cell) {
  font-size: var(--mid-fs-body);
  font-weight: 800;
  color: var(--ux-muted);
}

.task-config-table-shell :deep(.el-table td.el-table__cell) {
  padding: 9px 0;
}

.task-config-param-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: var(--mid-fs-body);
  color: #0f172a;
}

.other-param-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.other-param-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e5edf6;
  background: linear-gradient(180deg, #fafcff 0%, #ffffff 100%);
}

.other-param-card.complex {
  grid-column: 1 / -1;
}

.other-param-label {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.other-param-value {
  font-size: var(--mid-fs-body);
  line-height: 1.5;
  color: var(--ux-ink);
  word-break: break-all;
}

.task-config-json {
  margin: 0;
  padding: 9px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e5edf6;
  background: #f8fafc;
  font-size: var(--mid-fs-label);
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow: auto;
}

.task-config-json.compact {
  margin: 0;
  max-height: 180px;
}

/* Element Plus 控件密度：与 midStage.css 的字号刻度对齐 */
.mono,
.progress-brief-item strong.mono,
.ledger-metric-pill-value,
.hero-meta-value.mono,
.core-param-value.mono,
.task-config-param-value {
  font-family: var(--mid-font-mono);
}

.experiment-manager :deep(.el-button) {
  --el-button-size: 30px;
  min-height: 30px;
  font-size: var(--mid-fs-body);
}

.experiment-manager :deep(.el-tag) {
  height: 22px;
  padding: 0 9px;
  font-size: var(--mid-fs-label);
  line-height: 20px;
  font-weight: 700;
}

.experiment-manager :deep(.el-table th.el-table__cell),
.experiment-manager :deep(.el-table td.el-table__cell) {
  font-size: var(--mid-fs-body);
}

@media (max-width: 1200px) {
  .run-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-meta-grid {
    grid-template-columns: 1fr;
  }

  .progress-brief-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ledger-brief-row {
    grid-template-columns: 1fr;
  }

  .ledger-metric-inline {
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  }

  .ledger-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .ledger-toolbar-main,
  .ledger-toolbar-actions {
    width: 100%;
  }

  .ledger-toolbar-actions {
    justify-content: space-between;
  }
}

@media (max-width: 768px) {
  .run-overview {
    grid-template-columns: 1fr;
  }

  .progress-brief-grid {
    grid-template-columns: 1fr;
  }

  .progress-card-header,
  .progress-hero,
  .progress-track-head,
  .ledger-record-top,
  .ledger-record-meta,
  .ledger-record-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .list-header-stats {
    margin-left: 0;
  }

  .ledger-toolbar-main {
    flex-wrap: wrap;
  }

  .ledger-search {
    width: 100%;
  }

  .ledger-status-select,
  .ledger-sort-select {
    flex: 1;
    min-width: 0;
  }

  .ledger-toolbar-actions {
    align-items: center;
    flex-wrap: wrap;
  }

  .ledger-record-footer {
    gap: 10px;
  }

  .task-config-kicker-row,
  .hero-meta-main {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
