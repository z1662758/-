<template>
  <div class="run-control-panel">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>实验运行控制</span>
          <el-tag v-if="isRunning" type="success" effect="dark">运行中</el-tag>
          <el-tag v-else type="info">就绪</el-tag>
        </div>
      </template>

      <!-- 配置表单 -->
      <el-form v-if="!isRunning" :model="config" label-width="100px" size="default">
        <el-form-item label="迭代次数">
          <el-input-number v-model="config.iterations" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="模型选择">
          <el-select v-model="config.model" placeholder="选择LLM模型">
            <el-option label="Qwen" value="qwen" />
            <el-option label="GPT-4" value="gpt4" />
            <el-option label="Claude" value="claude" />
          </el-select>
        </el-form-item>
        <el-form-item label="场景">
          <el-select v-model="config.scenario" placeholder="选择场景">
            <el-option label="供应链 (SCnet)" value="supply_chain" />
            <el-option label="API生态系统" value="api" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 进度显示 -->
      <div v-if="isRunning" class="progress-section">
        <div class="progress-info">
          <div class="info-item">
            <span class="label">当前迭代:</span>
            <span class="value">{{ progress.current_iteration }} / {{ progress.total }}</span>
          </div>
          <div class="info-item">
            <span class="label">已用时间:</span>
            <span class="value">{{ formatTime(progress.elapsed_time) }}</span>
          </div>
          <div class="info-item">
            <span class="label">预计剩余:</span>
            <span class="value">{{ formatTime(progress.estimated_remaining) }}</span>
          </div>
        </div>

        <el-progress
          :percentage="progress.percentage"
          :status="progress.percentage === 100 ? 'success' : ''"
          :stroke-width="20"
        >
          <span class="progress-text">{{ progress.current_task }}</span>
        </el-progress>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button
          v-if="!isRunning"
          type="primary"
          size="large"
          @click="handleStart"
          :loading="starting"
        >
          <el-icon><VideoPlay /></el-icon>
          开始运行
        </el-button>
        <el-button
          v-else
          type="danger"
          size="large"
          @click="handleStop"
          :loading="stopping"
        >
          <el-icon><VideoPause /></el-icon>
          停止运行
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, VideoPause } from '@element-plus/icons-vue'
import { runExperiment, stopExperiment } from '@/api/scenarioModeling'
import websocketService from '@/utils/websocket'

const isRunning = ref(false)
const starting = ref(false)
const stopping = ref(false)

const config = reactive({
  iterations: 10,
  model: 'qwen',
  scenario: 'supply_chain'
})

const progress = reactive({
  current_iteration: 0,
  total: 0,
  elapsed_time: 0,
  estimated_remaining: 0,
  percentage: 0,
  current_task: '等待开始...'
})

let currentExperimentId = null

// 格式化时间
const formatTime = (seconds) => {
  if (!seconds) return '0秒'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}小时${m}分${s}秒`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

// 开始运行
const unwrapData = (res) => {
  if (res && typeof res === 'object' && res.success === false) {
    return { error: res.message || '请求失败' }
  }
  if (res && typeof res === 'object' && 'data' in res && res.data !== undefined) {
    return { data: res.data, raw: res }
  }
  return { data: res, raw: res }
}

const handleStart = async () => {
  starting.value = true
  try {
    const response = await runExperiment(config)
    const { data: payload, error } = unwrapData(response)
    if (error) {
      ElMessage.error(error)
      return
    }
    if (payload?.status === 'queued') {
      ElMessage.success(payload.message || `已加入实验队列（位置 ${payload.position ?? '-'}），请在「任务管理」查看进度`)
      return
    }
    if (payload?.status === 'started') {
      isRunning.value = true
      currentExperimentId = payload.experiment_id
      progress.total = config.iterations
      progress.current_task = '初始化中...'

      if (payload.websocket_enabled && currentExperimentId) {
        websocketService.subscribeProgress(currentExperimentId)
      }

      ElMessage.success('实验已启动')
    } else {
      ElMessage.error(payload?.message || response?.message || '启动失败')
    }
  } catch (error) {
    ElMessage.error('启动实验失败: ' + error.message)
  } finally {
    starting.value = false
  }
}

// 停止运行
const handleStop = async () => {
  stopping.value = true
  try {
    const response = await stopExperiment()
    const { data: payload, error } = unwrapData(response)
    if (error) {
      ElMessage.error(error)
      return
    }
    if (payload?.status === 'stopped') {
      isRunning.value = false
      if (currentExperimentId) {
        websocketService.unsubscribeProgress(currentExperimentId)
      }
      ElMessage.success('实验已停止')
    } else if (payload?.status === 'not_running') {
      isRunning.value = false
      ElMessage.info(payload.message || '当前没有运行中的实验')
    } else {
      ElMessage.warning(payload?.message || response?.message || '停止失败')
    }
  } catch (error) {
    ElMessage.error('停止实验失败: ' + error.message)
  } finally {
    stopping.value = false
  }
}

// 监听进度更新
const handleProgressUpdate = (data) => {
  progress.current_iteration = data.current_iteration
  progress.total = data.total
  progress.elapsed_time = data.elapsed_time
  progress.estimated_remaining = data.estimated_remaining
  progress.percentage = data.percentage
  progress.current_task = data.current_task || '运行中...'
}

// 监听实验完成
const handleExperimentCompleted = () => {
  isRunning.value = false
  progress.percentage = 100
  progress.current_task = '已完成'
  ElMessage.success('实验运行完成！')
}

onMounted(() => {
  // 连接WebSocket
  websocketService.connect()

  // 添加事件监听
  websocketService.on('progress', handleProgressUpdate)
  websocketService.on('completed', handleExperimentCompleted)
})

onUnmounted(() => {
  // 清理监听器
  websocketService.off('progress', handleProgressUpdate)
  websocketService.off('completed', handleExperimentCompleted)

  // 取消订阅
  if (currentExperimentId) {
    websocketService.unsubscribeProgress(currentExperimentId)
  }
})
</script>

<style scoped>
.run-control-panel {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-section {
  margin: 20px 0;
}

.progress-info {
  display: flex;
  justify-content: space-around;
  margin-bottom: 15px;
}

.info-item {
  text-align: center;
}

.info-item .label {
  color: #909399;
  font-size: 14px;
  display: block;
  margin-bottom: 5px;
}

.info-item .value {
  color: #303133;
  font-size: 18px;
  font-weight: bold;
}

.progress-text {
  font-size: 12px;
  color: #606266;
}

.action-buttons {
  margin-top: 20px;
  text-align: center;
}
</style>
