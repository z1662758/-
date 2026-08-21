<template>
  <div class="extreme-events-panel">
    <el-card shadow="hover" class="events-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon :size="16" color="#409EFF"><Warning /></el-icon>
            <span class="header-title">极端事件</span>
            <el-tag type="warning" size="small" effect="dark">{{ totalEvents }}</el-tag>
          </div>
          <div class="header-right">
            <el-select
              v-model="selectedTypes"
              multiple
              placeholder="筛选"
              size="small"
              style="width: 180px"
              @change="loadEvents"
            >
              <el-option label="战争/冲突" value="war" />
              <el-option label="供应链中断" value="disruption" />
              <el-option label="政策变化" value="policy" />
              <el-option label="市场波动" value="market" />
              <el-option label="技术突破" value="technology" />
              <el-option label="其他" value="other" />
            </el-select>
            <el-button @click="loadEvents" :loading="loading" size="small" :icon="Refresh" />
          </div>
        </div>
      </template>

      <!-- 事件列表 -->
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading" :size="40"><Loading /></el-icon>
        <p>加载中...</p>
      </div>

      <div v-else-if="events.length === 0" class="empty-container">
        <el-empty description="暂无极端事件" />
      </div>

      <div v-else class="events-list">
        <div
          v-for="event in events"
          :key="`${event.iteration}-${event.month}-${event.event_type}-${event.title}`"
          class="event-item"
          :class="`severity-${event.severity}`"
        >
          <div class="event-header">
            <el-tag :type="getEventTypeColor(event.event_type)" size="small">
              {{ getEventTypeLabel(event.event_type) }}
            </el-tag>
            <el-tag :type="getSeverityColor(event.severity)" size="small">
              {{ getSeverityLabel(event.severity) }}
            </el-tag>
            <span class="event-time">迭代{{ event.iteration }} - 月{{ event.month }}</span>
          </div>

          <div class="event-content">
            <h4>{{ event.title }}</h4>
            <p class="event-description">{{ event.description }}</p>

            <div class="event-impact">
              <div class="impact-item">
                <span class="impact-label">订单率:</span>
                <span
                  class="impact-value"
                  :class="event.impact.order_rate < 0 ? 'negative' : 'positive'"
                >
                  {{ formatImpact(event.impact.order_rate) }}
                </span>
              </div>
              <div class="impact-item">
                <span class="impact-label">生命周期:</span>
                <span
                  class="impact-value"
                  :class="event.impact.lifecycle > 0 ? 'negative' : 'positive'"
                >
                  {{ formatImpact(event.impact.lifecycle) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Loading, Warning } from '@element-plus/icons-vue'
import { getExtremeEvents } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'

const props = defineProps({
  experimentId: {
    type: String,
    required: true
  }
})

const loading = ref(false)
const events = ref([])
const totalEvents = ref(0)
const selectedTypes = ref([])

const loadEvents = async () => {
  if (!props.experimentId) {
    events.value = []
    totalEvents.value = 0
    return
  }

  loading.value = true
  try {
    const eventTypes = selectedTypes.value.length > 0 ? selectedTypes.value.join(',') : undefined
    const response = await getExtremeEvents(props.experimentId, { event_types: eventTypes })
    const data = unwrapApiData(response)

    if (data && Array.isArray(data.events)) {
      events.value = data.events
      totalEvents.value = data.total_events ?? data.events.length
      if (!data.events.length) {
        ElMessage.info('当前实验暂无极端事件')
      }
    } else {
      events.value = []
      totalEvents.value = 0
      ElMessage.warning('接口返回为空或格式异常')
    }
  } catch (error) {
    console.error('加载极端事件失败:', error)
    events.value = []
    totalEvents.value = 0
    ElMessage.error('加载极端事件失败')
  } finally {
    loading.value = false
  }
}

// 事件类型标签
const getEventTypeLabel = (type) => {
  const labels = {
    war: '战争/冲突',
    disruption: '供应链中断',
    policy: '政策变化',
    market: '市场波动',
    technology: '技术突破',
    other: '其他'
  }
  return labels[type] || type
}

// 事件类型颜色
const getEventTypeColor = (type) => {
  const colors = {
    war: 'danger',
    disruption: 'warning',
    policy: 'info',
    market: 'primary',
    technology: 'success',
    other: ''
  }
  return colors[type] || ''
}

// 严重程度标签
const getSeverityLabel = (severity) => {
  const labels = {
    critical: '严重',
    high: '高',
    medium: '中',
    low: '低'
  }
  return labels[severity] || severity
}

// 严重程度颜色
const getSeverityColor = (severity) => {
  const colors = {
    critical: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'success'
  }
  return colors[severity] || ''
}

// 格式化影响
const formatImpact = (value) => {
  if (value === 0) return '0%'
  const percentage = (value * 100).toFixed(1)
  return value > 0 ? `+${percentage}%` : `${percentage}%`
}

// 监听实验ID变化
watch(
  () => props.experimentId,
  () => {
    loadEvents()
  }
)

onMounted(() => {
  loadEvents()
})
</script>

<style scoped>
.extreme-events-panel {
  margin-top: 0;
}

.events-card {
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.events-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-bottom: 2px solid #e4e7ed;
  padding: 8px 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.loading-container,
.empty-container {
  text-align: center;
  padding: 60px 0;
  color: #909399;
}

.loading-container :deep(.el-icon) {
  font-size: 48px;
  color: #409EFF;
}

.empty-container {
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 8px;
}

.events-list {
  max-height: 180px;
  overflow-y: auto;
  padding: 4px;
}

.event-item {
  border-left: 3px solid #dcdfe6;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 6px;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.event-item:hover {
  background: linear-gradient(135deg, #e8f4ff 0%, #f0f9ff 100%);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.12);
  transform: translateY(-1px);
}

.event-item.severity-critical {
  border-left-color: #f56c6c;
  background: linear-gradient(135deg, #fef0f0 0%, #ffffff 100%);
}

.event-item.severity-critical:hover {
  background: linear-gradient(135deg, #fde2e2 0%, #fef0f0 100%);
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.15);
}

.event-item.severity-high {
  border-left-color: #e6a23c;
  background: linear-gradient(135deg, #fdf6ec 0%, #ffffff 100%);
}

.event-item.severity-high:hover {
  background: linear-gradient(135deg, #faecd8 0%, #fdf6ec 100%);
  box-shadow: 0 2px 8px rgba(230, 162, 60, 0.15);
}

.event-item.severity-medium {
  border-left-color: #409eff;
  background: linear-gradient(135deg, #ecf5ff 0%, #ffffff 100%);
}

.event-item.severity-medium:hover {
  background: linear-gradient(135deg, #d9ecff 0%, #ecf5ff 100%);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.event-item.severity-low {
  border-left-color: #67c23a;
  background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%);
}

.event-item.severity-low:hover {
  background: linear-gradient(135deg, #e1f3d8 0%, #f0f9ff 100%);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.15);
}

.event-header {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.event-time {
  margin-left: auto;
  color: #909399;
  font-size: 11px;
  font-weight: 500;
}

.event-content h4 {
  margin: 0 0 6px 0;
  color: #303133;
  font-size: 13px;
  font-weight: 600;
}

.event-description {
  color: #606266;
  font-size: 12px;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.event-impact {
  display: flex;
  gap: 16px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.impact-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.impact-label {
  color: #909399;
  font-size: 12px;
  font-weight: 500;
}

.impact-value {
  font-weight: 700;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
}

.impact-value.negative {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.impact-value.positive {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
}

/* 滚动条样式 */
.events-list::-webkit-scrollbar {
  width: 8px;
}

.events-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.events-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.events-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
