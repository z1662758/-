<template>
  <div class="experiment-queue-panel">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>实验任务管理</span>
          <el-badge :value="queueStatus.totalPending" :hidden="queueStatus.totalPending === 0">
            <el-tag :type="getStatusType()" effect="dark" size="small">{{ getStatusText() }}</el-tag>
          </el-badge>
        </div>
      </template>

      <!-- 队列状态概览 -->
      <div class="queue-summary">
        <div class="summary-item">
          <el-icon class="summary-icon" color="#409EFF"><Clock /></el-icon>
          <div class="summary-content">
            <div class="summary-label">排队中</div>
            <div class="summary-value">{{ queueStatus.totalPending }}</div>
          </div>
        </div>
        <div class="summary-item">
          <el-icon class="summary-icon" color="#67C23A"><Loading /></el-icon>
          <div class="summary-content">
            <div class="summary-label">运行中</div>
            <div class="summary-value">{{ queueStatus.totalRunning }}</div>
          </div>
        </div>
        <div class="summary-item">
          <el-icon class="summary-icon" color="#909399"><Timer /></el-icon>
          <div class="summary-content">
            <div class="summary-label">预计等待</div>
            <div class="summary-value">{{ formatWaitTime(queueStatus.estimatedWaitTime) }}</div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div v-if="queueStatus.totalPending > 0 || queueStatus.totalRunning > 0" class="quick-actions">
        <el-alert
          :title="`当前有 ${queueStatus.totalPending + queueStatus.totalRunning} 个任务在队列中`"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <div class="alert-content">
              <span v-if="queueStatus.totalRunning > 0">正在运行第 {{ queueStatus.totalRunning }} 个任务</span>
              <span v-if="queueStatus.totalPending > 0">，还有 {{ queueStatus.totalPending }} 个任务等待执行</span>
            </div>
          </template>
        </el-alert>
      </div>

      <el-divider />

      <!-- 任务历史列表 -->
      <div class="task-history">
        <div class="history-header">
          <span class="history-title">任务历史</span>
          <el-button size="small" text @click="refreshHistory" :loading="loading">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>

        <div v-if="taskHistory.length === 0" class="empty-history">
          <el-empty description="暂无任务记录" :image-size="60" />
        </div>

        <div v-else class="history-list">
          <div
            v-for="task in taskHistory"
            :key="task.task_id"
            class="task-item"
            :class="{ 'task-selected': selectedTaskId === task.task_id }"
            @click="selectTask(task)"
          >
            <div class="task-main">
              <div class="task-info">
                <el-tag :type="getTaskStatusType(task.status)" size="small" effect="plain">
                  {{ getTaskStatusText(task.status) }}
                </el-tag>
                <span class="task-id">{{ task.task_id }}</span>
              </div>
              <div class="task-meta">
                <span class="task-time">{{ formatTime(task.created_at) }}</span>
                <span v-if="task.user_goal" class="task-goal">{{ truncateGoal(task.user_goal) }}</span>
              </div>
            </div>
            <div class="task-actions">
              <el-button
                v-if="task.status === 'completed'"
                type="primary"
                size="small"
                text
                @click.stop="viewResult(task)"
              >
                查看结果
              </el-button>
              <el-button
                v-if="task.status === 'pending'"
                type="danger"
                size="small"
                text
                @click.stop="cancelTask(task.task_id)"
              >
                取消
              </el-button>
              <el-button
                v-if="task.status === 'failed'"
                type="warning"
                size="small"
                text
                @click.stop="showError(task)"
              >
                查看错误
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, Loading, Timer, Refresh } from '@element-plus/icons-vue'
import { getQueueHistory } from '@/api/queue'

const store = useSupplyChainStore()
const router = useRouter()

const loading = ref(false)
const taskHistory = ref([])
const selectedTaskId = ref(null)

// 队列状态
const queueStatus = computed(() => store.queueStatus)

// 获取状态类型
const getStatusType = () => {
  if (queueStatus.value.totalRunning > 0) return 'success'
  if (queueStatus.value.totalPending > 0) return 'warning'
  return 'info'
}

// 获取状态文本
const getStatusText = () => {
  if (queueStatus.value.totalRunning > 0) return '运行中'
  if (queueStatus.value.totalPending > 0) return '排队中'
  return '空闲'
}

// 获取任务状态类型
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

// 获取任务状态文本
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

// 格式化等待时间
const formatWaitTime = (minutes) => {
  if (!minutes || minutes === 0) return '无需等待'
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '-'

  // 后端返回的是UTC时间字符串，需要添加'Z'后缀让浏览器正确解析为UTC时间
  // 格式: "2026-03-14 06:25:13" -> "2026-03-14T06:25:13Z"
  const utcTimestamp = timestamp.replace(' ', 'T') + 'Z'
  const date = new Date(utcTimestamp)
  const now = new Date()

  // 计算时间差（毫秒）
  const diff = now - date

  // 如果时间差为负数或超过30天，直接显示日期
  if (diff < 0 || diff > 30 * 24 * 3600000) {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 小于1分钟显示"刚刚"
  if (diff < 60000) {
    return '刚刚'
  }

  // 小于1小时显示分钟
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }

  // 小于24小时显示小时
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }

  // 小于7天显示天数
  if (diff < 7 * 86400000) {
    const days = Math.floor(diff / 86400000)
    return `${days}天前`
  }

  // 显示日期
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 截断目标文本
const truncateGoal = (goal) => {
  if (!goal) return '未指定目标'
  return goal.length > 30 ? goal.substring(0, 30) + '...' : goal
}

// 刷新历史
const refreshHistory = async () => {
  loading.value = true
  try {
    await store.fetchQueueStatus()
    const response = await getQueueHistory(20)
    if (response.success) {
      taskHistory.value = response.data
    }
  } catch (error) {
    console.error('刷新任务历史失败:', error)
    ElMessage.error('刷新失败')
  } finally {
    loading.value = false
  }
}

// 选择任务
const selectTask = (task) => {
  selectedTaskId.value = task.task_id
}

// 查看结果
const viewResult = async (task) => {
  try {
    // 显示加载提示
    const loading = ElMessage({
      message: '正在加载实验结果...',
      type: 'info',
      duration: 0,
      iconClass: 'el-icon-loading'
    })

    // 从result_path提取实验ID
    // 格式: "results/multi_agent/multi_agent_report_20260314_143016.json"
    // 提取: 20260314_143016
    const match = task.result_path?.match(/multi_agent_report_(\d{8}_\d{6})\.json/)

    if (match) {
      const experimentId = match[1]  // 直接使用时间戳格式，不加exp_前缀

      // 加载实验数据
      await store.loadExperiment(experimentId)

      loading.close()

      ElMessage({
        message: '实验结果已加载',
        type: 'success',
        duration: 2000
      })

      console.log('[ExperimentQueuePanel] 已加载实验:', experimentId)

      // 跳转到interface界面查看
      router.push('/home/SCnet/interface')
    } else {
      loading.close()
      ElMessage.warning('无法解析实验ID，result_path: ' + task.result_path)
      console.error('[ExperimentQueuePanel] 无法解析实验ID，result_path:', task.result_path)
    }
  } catch (error) {
    console.error('加载实验结果失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  }
}

// 取消任务
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
      await refreshHistory()
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

// 显示错误
const showError = (task) => {
  ElMessageBox.alert(
    task.error_message || '未知错误',
    '任务执行失败',
    {
      confirmButtonText: '确定',
      type: 'error'
    }
  )
}

// 定时刷新
let refreshTimer = null

onMounted(() => {
  refreshHistory()

  // 连接WebSocket
  store.connectWebSocket()

  // 每15秒刷新一次
  refreshTimer = setInterval(() => {
    refreshHistory()
  }, 15000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.experiment-queue-panel {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.queue-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.quick-actions {
  margin-bottom: 16px;
}

.alert-content {
  font-size: 13px;
  line-height: 1.6;
}

.summary-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.summary-icon {
  font-size: 24px;
}

.summary-content {
  flex: 1;
}

.summary-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.empty-history {
  padding: 20px 0;
}

.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.task-item:hover {
  background: var(--el-fill-color-light);
  border-color: var(--el-color-primary);
  transform: translateX(4px);
}

.task-item.task-selected {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.task-id {
  font-family: monospace;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.task-time {
  color: var(--el-text-color-placeholder);
}

.task-goal {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-actions {
  display: flex;
  gap: 4px;
  margin-left: 12px;
}
</style>
