<template>
  <div class="experiment-manager">
    <div class="manager-header">
      <h2>实验任务管理</h2>
      <div class="header-actions">
        <el-button
          type="danger"
          class="header-action-btn"
          :disabled="!showRunningSection || stoppingExperiment"
          :loading="stoppingExperiment"
          @click="stopRunningExperiment"
        >
          <el-icon><Warning /></el-icon>
          <span>停止当前实验</span>
        </el-button>
        <el-button type="primary" class="header-action-btn" @click="createNewExperiment">
          <el-icon><Plus /></el-icon>
          <span>新建实验</span>
        </el-button>
      </div>
    </div>

    <div class="iteration-progress-section">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span>当前实验迭代进度</span>
            <el-tag v-if="showRunningSection" type="success" size="small">进行中</el-tag>
            <el-tag v-else-if="pendingTask" type="warning" size="small">排队中</el-tag>
            <el-tag v-else type="info" size="small">空闲</el-tag>
          </div>
        </template>

        <div v-if="showRunningSection" class="progress-content">
          <div class="progress-stats">
            <div class="progress-stat-item">
              <div class="progress-stat-label">任务 ID</div>
              <div class="progress-stat-value mono">{{ displayedTaskId }}</div>
            </div>
            <div class="progress-stat-item">
              <div class="progress-stat-label">当前迭代</div>
              <div class="progress-stat-value">
                {{ runningProgress.current_iteration }} / {{ runningProgress.total || '-' }}
              </div>
            </div>
            <div class="progress-stat-item">
              <div class="progress-stat-label">已用时</div>
              <div class="progress-stat-value">{{ formatDuration(runningProgress.elapsed_time) }}</div>
            </div>
            <div class="progress-stat-item">
              <div class="progress-stat-label">预计剩余</div>
              <div class="progress-stat-value">
                {{ runningProgress.estimated_remaining != null ? formatDuration(runningProgress.estimated_remaining) : '-' }}
              </div>
            </div>
          </div>

          <el-progress
            :percentage="runningProgress.percentage"
            :status="runningProgress.total > 0 && runningProgress.completed >= runningProgress.total ? 'success' : ''"
            :stroke-width="16"
          />

          <div class="progress-task-row">
            <span class="progress-task-label">当前阶段</span>
            <span class="progress-task-text">{{ runningStageText }}</span>
          </div>

          <div
            v-if="runningProgress.current_param_items.length || runningProgress.next_param_items.length"
            class="progress-param-grid"
          >
            <div class="progress-param-box">
              <div class="progress-param-title">当前参数</div>
              <div class="param-chip-list">
                <el-tag
                  v-for="item in runningProgress.current_param_items"
                  :key="`live-current-${item.key}`"
                  size="small"
                  class="param-chip"
                >
                  {{ item.key }}={{ item.value }}
                </el-tag>
                <span v-if="runningProgress.current_param_items.length === 0" class="empty-param">-</span>
              </div>
            </div>
            <div class="progress-param-box">
              <div class="progress-param-title">下一轮建议</div>
              <div class="param-chip-list">
                <el-tag
                  v-for="item in runningProgress.next_param_items"
                  :key="`live-next-${item.key}`"
                  size="small"
                  type="success"
                  class="param-chip"
                >
                  {{ item.key }}={{ item.value }}
                </el-tag>
                <span v-if="runningProgress.next_param_items.length === 0" class="empty-param">-</span>
              </div>
            </div>
          </div>

          <el-alert
            v-if="progressHint"
            type="warning"
            :closable="false"
            show-icon
            :title="progressHint"
          />
        </div>

        <div v-else-if="pendingTask" class="progress-content">
          <div class="progress-stats">
            <div class="progress-stat-item">
              <div class="progress-stat-label">任务 ID</div>
              <div class="progress-stat-value mono">{{ pendingTask.task_id }}</div>
            </div>
            <div class="progress-stat-item">
              <div class="progress-stat-label">队列位置</div>
              <div class="progress-stat-value">第 {{ pendingPosition || '-' }} 位</div>
            </div>
            <div class="progress-stat-item">
              <div class="progress-stat-label">排队任务数</div>
              <div class="progress-stat-value">{{ store.queueStatus.totalPending || 0 }}</div>
            </div>
            <div class="progress-stat-item">
              <div class="progress-stat-label">预计等待</div>
              <div class="progress-stat-value">
                {{ pendingEstimatedSeconds != null ? formatDuration(pendingEstimatedSeconds) : '-' }}
              </div>
            </div>
          </div>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="任务已提交，正在排队，页面会自动秒级刷新。"
          />
        </div>

        <el-empty
          v-else
          description="当前没有运行中的实验，可在下方任务列表查看历史迭代优化过程"
          :image-size="70"
        />
      </el-card>
    </div>

    <div class="experiment-list">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span>实验任务列表</span>
            <span class="task-count">共 {{ taskHistory.length }} 个任务</span>
          </div>
        </template>

        <el-alert
          class="queue-params-hint"
          type="info"
          :closable="false"
          show-icon
          title="点击操作列「迭代过程」查看完整逐轮参数与结果。"
        />

        <div v-if="taskHistory.length === 0" class="empty-list">
          <el-empty description="暂无实验任务" :image-size="100" />
        </div>

        <el-table
          v-else
          :data="taskHistory"
          row-key="task_id"
          stripe
        >
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="getTaskStatusType(row.status)" size="small" effect="dark">
                {{ getTaskStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="实验目标" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="goal-cell">
                <span class="goal-text">{{ truncateGoal(row.user_goal) }}</span>
                <span v-if="currentExperimentId && isCurrentExperiment(row)" class="current-badge">当前</span>
                <span v-else-if="lastViewedTaskId && row.task_id == lastViewedTaskId" class="last-viewed-badge">上次查看</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="参数概览" width="220">
            <template #default="{ row }">
              <div class="params-tags">
                <template v-if="parseParams(row.params)">
                  <el-tag size="small" type="info" class="param-tag" round>
                    {{ formatScenarioShort(parseParams(row.params).scenario) }}
                  </el-tag>
                  <el-tag size="small" type="primary" class="param-tag" round>
                    {{ parseParams(row.params).iterations || '-' }} 轮
                  </el-tag>
                  <el-tag size="small" type="success" class="param-tag" round>
                    {{ formatModelName(parseParams(row.params).model) }}
                  </el-tag>
                  <el-tag
                    v-if="parseParams(row.params).planner_strategy && !isNativePlanner(parseParams(row.params).planner_strategy)"
                    size="small"
                    type="warning"
                    class="param-tag"
                    round
                  >
                    {{ parseParams(row.params).planner_strategy }}
                  </el-tag>
                </template>
                <span v-else class="no-params">-</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="创建时间" width="130">
            <template #default="{ row }">
              <span class="time-text">{{ formatTime(row.created_at) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="320" align="center">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'completed'"
                type="primary"
                size="small"
                link
                @click.stop="viewExperiment(row)"
              >
                查看实验
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
                v-if="row.status === 'completed'"
                type="success"
                size="small"
                link
                @click.stop="openIterationProcess(row)"
              >
                迭代过程
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
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-dialog
      v-model="taskConfigDialogVisible"
      title="实验参数配置"
      width="760px"
      destroy-on-close
    >
      <div class="task-config-dialog-body">
        <div class="task-config-info-grid">
          <div class="task-config-info-item">
            <div class="task-config-info-label">任务 ID</div>
            <div class="task-config-info-value mono">{{ selectedTaskConfig.taskId || '-' }}</div>
          </div>
          <div class="task-config-info-item">
            <div class="task-config-info-label">状态</div>
            <div class="task-config-info-value">{{ selectedTaskConfig.statusText || '-' }}</div>
          </div>
          <div class="task-config-info-item">
            <div class="task-config-info-label">创建时间</div>
            <div class="task-config-info-value">{{ selectedTaskConfig.createdAtText || '-' }}</div>
          </div>
        </div>

        <div class="task-config-goal-box">
          <div class="task-config-goal-label">实验目标</div>
          <div class="task-config-goal-text">{{ selectedTaskConfig.goal || '-' }}</div>
        </div>

        <div class="task-config-section">
          <div class="task-config-section-title">核心实验参数</div>
          <el-table
            class="task-config-table"
            :data="selectedTaskConfig.coreItems"
            size="small"
            border
            stripe
            max-height="220"
            empty-text="暂无参数配置"
          >
            <el-table-column prop="label" label="参数名" width="180" show-overflow-tooltip />
            <el-table-column label="参数值" min-width="360">
              <template #default="{ row }">
                <span class="task-config-param-value">{{ row.value }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div v-if="selectedTaskConfig.entityParamRows.length" class="task-config-section">
          <div class="task-config-section-title">实体参数</div>
          <el-table
            class="task-config-table"
            :data="selectedTaskConfig.entityParamRows"
            size="small"
            border
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

        <div v-if="selectedTaskConfig.otherItems.length" class="task-config-section">
          <div class="task-config-section-title">其他参数</div>
          <el-table
            class="task-config-table"
            :data="selectedTaskConfig.otherItems"
            size="small"
            border
            stripe
            max-height="260"
            empty-text="暂无其他参数"
          >
            <el-table-column prop="label" label="参数名" width="180" show-overflow-tooltip />
            <el-table-column label="参数值" min-width="360">
              <template #default="{ row }">
                <div v-if="row.isComplex" class="task-config-complex-cell">
                  <div class="task-config-complex-preview">{{ row.preview }}</div>
                  <pre class="task-config-json compact">{{ row.pretty }}</pre>
                </div>
                <span v-else class="task-config-param-value">{{ row.value }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <el-button @click="taskConfigDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="iterationDrawerVisible"
      title="实验迭代过程"
      size="72%"
      destroy-on-close
    >
      <div class="drawer-header">
        <div class="drawer-title">实验 {{ iterationExperimentId || '-' }}</div>
        <div class="drawer-subtitle">展示一次完整实验在每次迭代中的参数选择与结果变化</div>
      </div>

      <div v-if="iterationLoading" class="drawer-loading">
        <el-skeleton :rows="8" animated />
      </div>

      <el-alert
        v-else-if="iterationError"
        type="error"
        :closable="false"
        show-icon
        :title="iterationError"
      />

      <template v-else>
        <div class="iteration-config-box">
          <el-collapse v-model="iterationConfigActiveNames">
            <el-collapse-item name="config">
              <template #title>
                <span class="iteration-config-title">实验参数配置</span>
              </template>
              <div class="param-chip-list">
                <el-tag
                  v-for="item in iterationTaskParamItems"
                  :key="`task-param-${item.key}`"
                  size="small"
                  type="info"
                  effect="plain"
                  class="param-chip"
                >
                  {{ item.key }}={{ item.value }}
                </el-tag>
                <span v-if="!iterationTaskParamItems.length" class="empty-param">暂无参数配置</span>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div class="iteration-summary-grid">
          <div class="summary-pill">
            <div class="pill-label">总迭代数</div>
            <div class="pill-value">{{ iterationMeta.total_iterations }}</div>
          </div>
          <div class="summary-pill">
            <div class="pill-label">最佳迭代</div>
            <div class="pill-value">{{ iterationMeta.best_iteration || '-' }}</div>
          </div>
          <div class="summary-pill">
            <div class="pill-label">最佳得分</div>
            <div class="pill-value">{{ formatScore(iterationMeta.best_score) }}</div>
          </div>
          <div class="summary-pill">
            <div class="pill-label">相对提升</div>
            <div class="pill-value">{{ formatPercentChange(iterationMeta.improvement) }}</div>
          </div>
        </div>

        <div class="iteration-insight-grid">
          <div class="insight-card">
            <div class="insight-label">起始得分</div>
            <div class="insight-value">{{ formatScore(iterationMeta.start_score) }}</div>
          </div>
          <div class="insight-card">
            <div class="insight-label">结束得分</div>
            <div class="insight-value">{{ formatScore(iterationMeta.end_score) }}</div>
          </div>
          <div class="insight-card">
            <div class="insight-label">最高完成率</div>
            <div class="insight-value">{{ formatRate(iterationMeta.best_completion_rate) }}</div>
          </div>
          <div class="insight-card">
            <div class="insight-label">最高净利润</div>
            <div class="insight-value">{{ formatInteger(iterationMeta.best_net_profit) }}</div>
          </div>
        </div>

        <div class="param-frequency-box">
          <div class="param-frequency-title">参数调整频次（Top 8）</div>
          <div class="param-chip-list">
            <el-tag
              v-for="item in iterationMeta.top_adjusted_params"
              :key="`freq-${item.key}`"
              size="small"
              type="warning"
              class="param-chip"
            >
              {{ item.key }} ×{{ item.count }}
            </el-tag>
            <span v-if="!iterationMeta.top_adjusted_params?.length" class="empty-param">暂无参数调整记录</span>
          </div>
        </div>

        <el-table :data="iterationRows" stripe height="calc(100vh - 320px)">
          <el-table-column prop="round_no" label="轮次" width="70" align="center" />

          <el-table-column label="参数来源" width="110" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.source === 'candidate_pool' ? 'primary' : 'info'" effect="plain">
                {{ row.source || '-' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="当前迭代参数" min-width="260">
            <template #default="{ row }">
              <div class="param-chip-list">
                <el-tag
                  v-for="item in row.current_param_items"
                  :key="`curr-${row.round_no}-${item.key}`"
                  size="small"
                  class="param-chip"
                >
                  {{ item.key }}={{ item.value }}
                </el-tag>
                <span v-if="row.current_param_items.length === 0" class="empty-param">-</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="下一轮参数建议" min-width="260">
            <template #default="{ row }">
              <div class="param-chip-list">
                <el-tag
                  v-for="item in row.next_param_items"
                  :key="`next-${row.round_no}-${item.key}`"
                  size="small"
                  type="success"
                  class="param-chip"
                >
                  {{ item.key }}={{ item.value }}
                </el-tag>
                <span v-if="row.next_param_items.length === 0" class="empty-param">-</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="得分" width="90" align="center">
            <template #default="{ row }">
              {{ formatScore(row.score) }}
            </template>
          </el-table-column>

          <el-table-column label="得分变化" width="100" align="center">
            <template #default="{ row }">
              <span :class="getDeltaClass(row.score_delta)">
                {{ formatDelta(row.score_delta) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="完成率" width="90" align="center">
            <template #default="{ row }">
              {{ formatRate(row.completion_rate) }}
            </template>
          </el-table-column>

          <el-table-column label="净利润" width="110" align="right">
            <template #default="{ row }">
              {{ formatInteger(row.total_net_profit) }}
            </template>
          </el-table-column>

          <el-table-column label="阶段说明" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <span>{{ row.objective || '-' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, h } from 'vue'
import { useRouter } from 'vue-router'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { ElMessage, ElMessageBox, ElButton } from 'element-plus'
import { Plus, Warning } from '@element-plus/icons-vue'
import { getExperimentProgress, stopExperiment } from '@/api/scenarioModeling'
import { unwrapApiData, assertApiSuccess } from '@/utils/apiEnvelope'
import { getExperimentDetail } from '@/api/supplyChain'
import {
  parseTaskParams as parseParams,
  resolveExperimentIdFromTask
} from '@/utils/scnetTaskUtils'

const router = useRouter()
const store = useSupplyChainStore()

const lastViewedTaskId = ref(localStorage.getItem('sc_lastViewedTaskId') || null)

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

const iterationDrawerVisible = ref(false)
const iterationLoading = ref(false)
const iterationError = ref('')
const iterationExperimentId = ref('')
const iterationConfigActiveNames = ref(['config'])
const iterationTaskParamItems = ref([])
const iterationRows = ref([])
const taskConfigDialogVisible = ref(false)
const selectedTaskConfig = ref({
  taskId: '',
  statusText: '',
  createdAtText: '',
  goal: '',
  coreItems: [],
  entityParamRows: [],
  otherItems: []
})
const iterationMeta = ref({
  total_iterations: 0,
  best_iteration: null,
  best_score: null,
  improvement: null,
  start_score: null,
  end_score: null,
  best_completion_rate: null,
  best_net_profit: null,
  top_adjusted_params: []
})

const currentExperimentId = computed(() => store.currentExperimentId)
const taskHistory = computed(() => store.taskHistory)

const runningTask = computed(() => {
  return taskHistory.value.find(t => t.status === 'running') || null
})

const pendingTask = computed(() => {
  const pendingRows = taskHistory.value.filter(t => t.status === 'pending')
  if (!pendingRows.length) return null
  if (recentQueuedTaskId.value) {
    const hit = pendingRows.find(t => t.task_id === recentQueuedTaskId.value)
    if (hit) return hit
  }
  return pendingRows[0]
})

const pendingPosition = computed(() => {
  if (!pendingTask.value) return null
  const pendingRows = taskHistory.value
    .filter(t => t.status === 'pending')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const idx = pendingRows.findIndex(t => t.task_id === pendingTask.value.task_id)
  return idx >= 0 ? idx + 1 : null
})

const pendingEstimatedSeconds = computed(() => {
  if (!pendingPosition.value) return null
  return pendingPosition.value * 12 * 60
})

const showRunningSection = computed(() => {
  return Boolean(runningProgress.value.is_running || runningTask.value)
})

const displayedTaskId = computed(() => {
  return runningTask.value?.task_id || store.queueStatus.currentTaskId || recentQueuedTaskId.value || '-'
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
    qwen: 'Qwen', gpt: 'GPT', gpt4: 'GPT-4', claude: 'Claude', deepseek: 'DeepSeek',
    kimi: 'Kimi', glm: 'GLM', gemini: 'Gemini'
  }
  return nameMap[model] || model || '-'
}

const formatScenarioShort = (scenario) => {
  const s = scenario || 'supply_chain'
  if (s === 'automotive' || s === 'supply_chain') return '供应链'
  return '供应链'
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

const formatDuration = (seconds) => {
  if (seconds == null || Number.isNaN(Number(seconds))) return '-'
  const total = Math.max(0, Math.floor(Number(seconds)))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
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

const formatPercentChange = (rate) => {
  if (rate == null || Number.isNaN(Number(rate))) return '-'
  return `${(Number(rate) * 100).toFixed(1)}%`
}

const isNativePlanner = (plannerStrategy) => {
  return String(plannerStrategy || '').trim().toLowerCase() === 'native'
}

const formatInteger = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return Math.round(Number(value)).toLocaleString('zh-CN')
}

const formatDelta = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '-'
  const n = Number(value)
  return `${n > 0 ? '+' : ''}${n.toFixed(3)}`
}

const getDeltaClass = (value) => {
  if (value == null || Number.isNaN(Number(value))) return ''
  const n = Number(value)
  if (n > 0) return 'delta-up'
  if (n < 0) return 'delta-down'
  return 'delta-flat'
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

const formatRangeText = (minValue, maxValue) => {
  if (minValue == null || maxValue == null) return '-'
  return `${formatParamValue(minValue)} ~ ${formatParamValue(maxValue)}`
}

const objectToParamItems = (obj, limit = 5) => {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).slice(0, limit).map(([key, value]) => {
    return { key, value: formatParamValue(value) }
  })
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

const buildTaskParamConfigItems = (rawParams) => {
  const params = normalizeParamObject(rawParams)
  if (!params || typeof params !== 'object') return []
  const keyPriority = ['scenario', 'iterations', 'model', 'planner_strategy']
  return Object.entries(params)
    .sort((a, b) => {
      const ai = keyPriority.indexOf(a[0])
      const bi = keyPriority.indexOf(b[0])
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      }
      return a[0].localeCompare(b[0])
    })
    .map(([key, value]) => ({ key, value: formatParamValue(value) }))
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
  scenario: '场景',
  iterations: '迭代轮数',
  model: '模型',
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

  const coreKeys = ['scenario', 'iterations', 'model', 'planner_strategy', 'use_decompose']
  const hiddenKeys = ['agent_methods', 'agent_node_configs']
  const excludedKeys = new Set([...coreKeys, ...hiddenKeys])

  const coreItems = coreKeys
    .filter(key => Object.prototype.hasOwnProperty.call(params, key))
    .map((key) => ({
      key,
      label: getParamLabel(key),
      value: formatParamValue(params[key])
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
        value: formatParamValue(value),
        isComplex,
        preview: formatParamValue(value),
        pretty: isComplex ? prettifyParamValue(value) : ''
      }
    })

  return { coreItems, entityParamRows, otherItems }
}

const extractAdjustedParamKeys = (paramsObj) => {
  const raw = paramsObj?.adjusted_param
  if (raw == null) return []
  if (Array.isArray(raw)) {
    return raw.map(v => String(v).trim()).filter(Boolean)
  }
  if (typeof raw === 'object') {
    return Object.keys(raw).filter(Boolean)
  }
  const text = String(raw).trim()
  if (!text) return []
  const keyMatches = text.match(/[a-zA-Z_][a-zA-Z0-9_]*/g)
  if (keyMatches?.length) return Array.from(new Set(keyMatches))
  return [text]
}

const buildAdjustedParamText = (paramsObj) => {
  const raw = paramsObj?.adjusted_param
  if (raw == null) return ''
  if (Array.isArray(raw)) return raw.map(v => String(v).trim()).filter(Boolean).join('、')
  if (typeof raw === 'object') return Object.keys(raw).filter(Boolean).join('、')
  return String(raw).trim()
}

const isCurrentExperiment = (task) => {
  if (!currentExperimentId.value) return false
  return resolveExperimentIdFromTask(task) === currentExperimentId.value
}

const buildIterationRows = (iterations) => {
  return iterations.map((it, index) => {
    const feedback = it?.feedback || {}
    const metrics = feedback.metrics || {}
    const task = it?.task || {}
    const currentParams = task.parameters || {}
    const nextParams = iterations[index + 1]?.task?.parameters || null
    const score = feedback.overall_score ?? feedback.score ?? null
    const prevFeedback = iterations[index - 1]?.feedback || {}
    const prevScore = index > 0 ? (prevFeedback.overall_score ?? prevFeedback.score ?? null) : null

    return {
      round_no: index + 1,
      raw_iteration: it?.iteration || (index + 1),
      source: task.source || '-',
      objective: task.objective || task.original_goal || '',
      current_param_items: objectToParamItems(currentParams),
      next_param_items: objectToParamItems(nextParams),
      score,
      score_delta: (
        score != null && prevScore != null && !Number.isNaN(Number(score)) && !Number.isNaN(Number(prevScore))
          ? Number(score) - Number(prevScore)
          : null
      ),
      completion_rate: metrics.order_completion_rate ?? null,
      total_net_profit: metrics.total_net_profit ?? null,
      adjusted_param_text: buildAdjustedParamText(currentParams),
      adjusted_param_keys: extractAdjustedParamKeys(currentParams)
    }
  })
}

const syncRecentQueuedMarker = () => {
  if (!recentQueuedTaskId.value) return
  const row = taskHistory.value.find(t => t.task_id === recentQueuedTaskId.value)
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

  const response = await getExperimentDetail(experimentId)
  if (!response?.success || !response?.data) {
    throw new Error(response?.message || '读取实验详情失败')
  }

  const data = response.data
  const iterations = Array.isArray(data.iterations) ? data.iterations : []
  const rows = buildIterationRows(iterations)
  const scoreRows = rows.filter(r => r.score != null && !Number.isNaN(Number(r.score)))
  const startScore = scoreRows.length ? Number(scoreRows[0].score) : null
  const endScore = scoreRows.length ? Number(scoreRows[scoreRows.length - 1].score) : null
  const bestCompletionRate = rows.reduce((best, r) => {
    const val = Number(r.completion_rate)
    if (Number.isNaN(val)) return best
    return best == null ? val : Math.max(best, val)
  }, null)
  const bestNetProfit = rows.reduce((best, r) => {
    const val = Number(r.total_net_profit)
    if (Number.isNaN(val)) return best
    return best == null ? val : Math.max(best, val)
  }, null)
  const freqMap = {}
  rows.forEach((row) => {
    row.adjusted_param_keys.forEach((key) => {
      freqMap[key] = (freqMap[key] || 0) + 1
    })
  })
  const topAdjustedParams = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, count]) => ({ key, count }))

  return {
    experimentId,
    rows,
    meta: {
      total_iterations: data.total_iterations || iterations.length,
      best_iteration: data.summary?.best_iteration ?? null,
      best_score: data.summary?.best_score ?? null,
      improvement: data.summary?.improvement ?? null,
      start_score: startScore,
      end_score: endScore,
      best_completion_rate: bestCompletionRate,
      best_net_profit: bestNetProfit,
      top_adjusted_params: topAdjustedParams
    }
  }
}

const fetchRunningProgress = async () => {
  try {
    const response = await getExperimentProgress()
    const data = response?.data || {}

    const completed = Math.max(0, Number(data.completed || 0))
    const total = Math.max(0, Number(data.total || 0))
    const isRunning = Boolean(data.is_running) || Boolean(runningTask.value)
    const rawCurrentIteration = Number(data.current_iteration || 0)
    const currentIteration = rawCurrentIteration > 0
      ? Math.min(total || rawCurrentIteration, rawCurrentIteration)
      : (total > 0 ? Math.min(total, completed + (isRunning && completed < total ? 1 : 0)) : 0)

    let estimatedRemaining = null
    if (completed > 0 && total > completed) {
      estimatedRemaining = Math.round((Number(data.elapsed_time || 0) / completed) * (total - completed))
    }

    const currentParams = normalizeParamObject(data.current_parameters)
    const nextParams = normalizeParamObject(data.next_parameters)

    runningProgress.value = {
      is_running: isRunning,
      status: data.status || (isRunning ? 'running' : 'idle'),
      completed,
      total,
      current_iteration: currentIteration,
      elapsed_time: Math.max(0, Number(data.elapsed_time || 0)),
      estimated_remaining: estimatedRemaining,
      percentage: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
      current_task: data.current_task || '',
      current_parameters: currentParams,
      next_parameters: nextParams,
      current_param_items: objectToParamItems(currentParams, 4),
      next_param_items: objectToParamItems(nextParams, 4)
    }

    if (isRunning && !data.current_task) {
      progressHint.value = '任务已启动，等待后端回传本轮阶段信息。'
    } else {
      progressHint.value = ''
    }
  } catch (error) {
    console.error('获取运行进度失败:', error)
    progressHint.value = runningTask.value ? '获取实时进度失败，当前显示的是任务基础状态。' : ''
  }
}

const openIterationProcess = async (task) => {
  iterationDrawerVisible.value = true
  iterationLoading.value = true
  iterationError.value = ''
  iterationExperimentId.value = ''
  iterationConfigActiveNames.value = ['config']
  iterationTaskParamItems.value = buildTaskParamConfigItems(task?.params)
  iterationRows.value = []
  iterationMeta.value = {
    total_iterations: 0,
    best_iteration: null,
    best_score: null,
    improvement: null,
    start_score: null,
    end_score: null,
    best_completion_rate: null,
    best_net_profit: null,
    top_adjusted_params: []
  }

  try {
    const payload = await fetchTaskIterationData(task)
    iterationExperimentId.value = payload.experimentId
    iterationRows.value = payload.rows
    iterationMeta.value = payload.meta
  } catch (error) {
    console.error('加载迭代过程失败:', error)
    iterationError.value = error.message || '加载迭代过程失败'
  } finally {
    iterationLoading.value = false
  }
}

const openTaskConfigDialog = (task) => {
  const sections = buildTaskParamConfigSections(task?.params)
  selectedTaskConfig.value = {
    taskId: task?.task_id || '',
    statusText: getTaskStatusText(task?.status),
    createdAtText: formatTime(task?.created_at),
    goal: task?.user_goal || '未指定目标',
    coreItems: sections.coreItems,
    entityParamRows: sections.entityParamRows,
    otherItems: sections.otherItems
  }
  taskConfigDialogVisible.value = true
}

const refreshData = async () => {
  try {
    await store.fetchQueueStatus()
    await store.fetchTaskHistory()
    syncRecentQueuedMarker()
    await fetchRunningProgress()
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新失败')
  }
}

const viewExperiment = async (task) => {
  try {
    const loadingMsg = ElMessage({
      message: '正在加载实验...',
      type: 'info',
      duration: 0,
      iconClass: 'el-icon-loading'
    })

    const experimentId = resolveExperimentIdFromTask(task)

    if (experimentId) {
      await store.selectExperiment(experimentId)
      // 把任务对应的 session_id 同步到 store，下游决策分析页面靠它定位实验
      if (task?.session_id) {
        store.setCurrentSessionId(task.session_id)
      }
      localStorage.setItem('sc_lastViewedTaskId', task.task_id)
      lastViewedTaskId.value = task.task_id
      loadingMsg.close()

      const goto = (path) => {
        ElMessageBox.close()
        router.push(path)
      }

      ElMessageBox({
        title: '选择查看界面',
        message: h('div', { style: 'text-align: center; padding: 8px 0;' }, [
          h('div', {
            style: 'display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; max-width: 520px;'
          }, [
            h(ElButton, { type: 'primary', onClick: () => goto('/home/SCnet/interface') }, () => '系统运行'),
            h(ElButton, { type: 'warning', onClick: () => goto('/home/SCnet/expAnalysisGameTheory') }, () => '博弈论分析'),
            h(ElButton, { type: 'warning', onClick: () => goto('/home/SCnet/expAnalysisDecisionTree') }, () => '决策树分析'),
            h(ElButton, { type: 'warning', onClick: () => goto('/home/SCnet/expAnalysisScenario') }, () => '情景分析'),
            h(ElButton, { type: 'success', onClick: () => goto('/home/SCnet/EXreport') }, () => '实验报告')
          ])
        ]),
        showConfirmButton: false,
        showCancelButton: false,
        closeOnClickModal: false,
        closeOnPressEscape: true,
        center: true
      }).catch(() => {
        ElMessage.info('实验已设置，可通过左侧菜单查看')
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

    const result = await store.cancelQueueTask(taskId)
    if (result.success) {
      ElMessage.success('任务已取消')
      await refreshData()
    } else {
      ElMessage.error(result.data?.message || '取消失败')
    }
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
  lastViewedTaskId.value = null
  router.push('/home/SCnet/scenarioModeling')
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
    const response = await stopExperiment()
    assertApiSuccess(response)
    unwrapApiData(response)
    ElMessage.success('已发送停止信号')
    await refreshData()
    await fetchRunningProgress()
  } catch (err) {
    console.error('[ExperimentManager] stopExperiment failed', err)
    ElMessage.error('停止实验失败：' + (err?.message || '未知错误'))
  } finally {
    stoppingExperiment.value = false
  }
}

let refreshTimer = null
let progressTimer = null

onMounted(async () => {
  await refreshData()
  store.connectWebSocket()
  setTimeout(() => refreshData(), 1200)

  if (lastViewedTaskId.value && taskHistory.value.length > 0) {
    const lastTask = taskHistory.value.find(t => t.task_id == lastViewedTaskId.value)
    if (lastTask) {
      ElMessage.info({ message: '已恢复上次查看的实验', duration: 2000 })
    }
  }

  refreshTimer = setInterval(() => {
    refreshData()
  }, 3000)

  progressTimer = setInterval(() => {
    fetchRunningProgress()
  }, 1000)
})

watch(
  () => taskHistory.value.map(t => `${t.task_id}:${t.status}`).join('|'),
  () => {
    syncRecentQueuedMarker()
    fetchRunningProgress()
  }
)

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (progressTimer) clearInterval(progressTimer)
})
</script>

<style scoped>
.experiment-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #f5f7fa;
  overflow: auto;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.manager-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header-action-btn {
  min-height: 40px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  line-height: 1;
}

.header-action-btn :deep(.el-icon) {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.header-action-btn span {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.iteration-progress-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.task-count {
  font-size: 14px;
  color: #909399;
  font-weight: normal;
}

.progress-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.progress-stat-item {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  background: #fff;
}

.progress-stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.progress-stat-value {
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.progress-stat-value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
  word-break: break-all;
}

.progress-task-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.progress-task-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  min-width: 56px;
  line-height: 22px;
}

.progress-task-text {
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.5;
}

.progress-param-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.progress-param-box {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
}

.progress-param-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.experiment-list {
  flex: 1;
  min-height: 0;
}

.empty-list {
  padding: 40px 0;
}

.goal-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.goal-text {
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.current-badge {
  font-size: 11px;
  color: #fff;
  background: var(--el-color-success);
  padding: 1px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.last-viewed-badge {
  font-size: 11px;
  color: #fff;
  background: var(--el-color-primary);
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 4px;
  flex-shrink: 0;
}

.params-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.param-tag {
  border-radius: 10px;
}

.no-params,
.empty-param {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.time-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.iteration-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.iteration-insight-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.insight-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
}

.insight-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.insight-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.summary-pill {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
}

.pill-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.pill-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.delta-up {
  color: var(--el-color-success);
  font-weight: 600;
}

.delta-down {
  color: var(--el-color-danger);
  font-weight: 600;
}

.delta-flat {
  color: var(--el-text-color-secondary);
}

.param-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.param-chip {
  margin: 0;
}

.param-frequency-box {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.param-frequency-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.queue-params-hint {
  margin-bottom: 12px;
}

.queue-params-hint :deep(.el-alert__title) {
  font-size: 12px;
  line-height: 1.45;
}

.drawer-header {
  margin-bottom: 12px;
}

.drawer-title {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.drawer-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.drawer-loading {
  padding: 12px 0;
}

.task-config-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.task-config-info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.task-config-info-item {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: #fafbfc;
  padding: 10px 12px;
}

.task-config-info-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.task-config-info-value {
  font-size: 13px;
  color: var(--el-text-color-primary);
  font-weight: 600;
  line-height: 1.4;
  word-break: break-all;
}

.task-config-info-value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.task-config-section {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
}

.task-config-section-title {
  font-size: 13px;
  color: var(--el-text-color-primary);
  font-weight: 600;
  margin-bottom: 8px;
}

.task-config-goal-box {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
}

.task-config-goal-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.task-config-goal-text {
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.65;
}

.task-config-param-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
  color: #303133;
}

.task-config-collapse-title {
  font-size: 13px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.task-config-collapse-meta {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.task-config-json {
  margin: 0;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
  background: #f7f8fa;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow: auto;
}

.task-config-json.compact {
  margin-top: 6px;
  max-height: 180px;
}

.task-config-complex-cell {
  display: flex;
  flex-direction: column;
}

.task-config-complex-preview {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.iteration-config-box {
  margin-bottom: 12px;
}

.iteration-config-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

@media (max-width: 1200px) {
  .progress-stats,
  .progress-param-grid,
  .iteration-insight-grid,
  .iteration-summary-grid,
  .task-config-info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .progress-stats,
  .progress-param-grid,
  .iteration-insight-grid,
  .iteration-summary-grid,
  .task-config-info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
