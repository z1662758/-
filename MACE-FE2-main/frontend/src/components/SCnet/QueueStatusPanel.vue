<template>
  <div class="queue-status-panel">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>任务队列状态</span>
          <el-badge :value="queueStatus.totalPending" :hidden="queueStatus.totalPending === 0">
            <el-tag :type="getStatusType()" effect="dark">{{ getStatusText() }}</el-tag>
          </el-badge>
        </div>
      </template>

      <!-- 队列信息 -->
      <div class="queue-info">
        <div class="info-row">
          <div class="info-item">
            <span class="label">排队中:</span>
            <span class="value">{{ queueStatus.totalPending }} 个任务</span>
          </div>
          <div class="info-item">
            <span class="label">运行中:</span>
            <span class="value">{{ queueStatus.totalRunning }} 个任务</span>
          </div>
        </div>

        <div v-if="queueStatus.totalPending > 0" class="info-row">
          <div class="info-item">
            <span class="label">预计等待:</span>
            <span class="value highlight">{{ queueStatus.estimatedWaitTime }} 分钟</span>
          </div>
        </div>

        <!-- 当前运行的任务 -->
        <div v-if="queueStatus.currentTaskId" class="current-task">
          <el-divider content-position="left">
            <el-icon><Loading /></el-icon>
            当前任务
          </el-divider>
          <div class="task-id">{{ queueStatus.currentTaskId }}</div>
        </div>

        <!-- 空队列提示 -->
        <div v-if="queueStatus.totalPending === 0 && queueStatus.totalRunning === 0" class="empty-queue">
          <el-empty description="队列为空" :image-size="80" />
        </div>
      </div>

      <!-- 刷新按钮 -->
      <div class="actions">
        <el-button size="small" @click="refreshStatus" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新状态
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { Loading, Refresh } from '@element-plus/icons-vue'

const store = useSupplyChainStore()
const loading = ref(false)

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

// 刷新状态
const refreshStatus = async () => {
  loading.value = true
  try {
    await store.fetchQueueStatus()
  } finally {
    loading.value = false
  }
}

// 定时刷新
let refreshTimer = null

onMounted(() => {
  // 初始加载
  refreshStatus()

  // 连接WebSocket
  store.connectWebSocket()

  // 每10秒刷新一次（作为WebSocket的备份）
  refreshTimer = setInterval(() => {
    refreshStatus()
  }, 10000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.queue-status-panel {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.queue-info {
  min-height: 120px;
}

.info-row {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
}

.info-item {
  flex: 1;
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.value {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.value.highlight {
  color: var(--el-color-warning);
  font-size: 16px;
}

.current-task {
  margin-top: 16px;
}

.task-id {
  font-family: monospace;
  font-size: 12px;
  color: var(--el-color-primary);
  padding: 8px;
  background: var(--el-color-primary-light-9);
  border-radius: 4px;
  text-align: center;
}

.empty-queue {
  padding: 20px 0;
}

.actions {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
