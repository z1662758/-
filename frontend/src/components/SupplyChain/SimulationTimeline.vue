<template>
  <div class="simulation-timeline">
    <!-- 时间轴滑块（月度） -->
    <div class="timeline-slider">
      <el-slider
        v-if="hasTimeline"
        v-model="currentMonth"
        :min="0"
        :max="totalMonths - 1"
        :marks="monthMarks"
        @input="onSliderChange"
        show-stops
      />
      <el-empty v-else description="暂无时序数据" :image-size="60" />
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { storeToRefs } from 'pinia'

// Store
const store = useSupplyChainStore()
const {
  currentMonth: storeCurrentMonth,
  totalMonths
} = storeToRefs(store)

// 本地状态（双向绑定）
const currentMonth = computed({
  get: () => storeCurrentMonth.value,
  set: (val) => store.setMonth(val)
})

// 是否有时序数据
const hasTimeline = computed(() => totalMonths.value > 0)

// 月份标记（显示关键月份点）
const monthMarks = computed(() => {
  const marks = {}
  if (totalMonths.value > 0) {
    marks[0] = '第1月'
    if (totalMonths.value > 1) {
      marks[totalMonths.value - 1] = `第${totalMonths.value}月`
    }
  }
  return marks
})

// 滑块变化
const onSliderChange = (value) => {
  store.setMonth(value)
}

// 格式化环境类型
const formatContextType = (type) => {
  const typeMap = {
    recession: '衰退',
    growth: '增长',
    stable_growth: '稳定增长',
    volatile: '波动'
  }
  return typeMap[type] || type
}

// 获取环境类型标签颜色
const getContextTypeTag = (type) => {
  const tagMap = {
    recession: 'danger',
    growth: 'success',
    stable_growth: 'info',
    volatile: 'warning'
  }
  return tagMap[type] || ''
}

// 格式化趋势斜率
const formatTrendSlope = (slope) => {
  if (!slope) return '0%'
  const percent = (slope * 100).toFixed(1)
  return slope > 0 ? `+${percent}%` : `${percent}%`
}

// 获取趋势样式类
const getTrendClass = (slope) => {
  if (!slope) return 'value'
  return slope > 0 ? 'value positive' : 'value negative'
}

// 格式化百分比
const formatPercent = (value) => {
  if (!value) return '0%'
  return `${(value * 100).toFixed(2)}%`
}
</script>

<style scoped>
.simulation-timeline {
  height: 100%;
  background: #fff;
  border-radius: 4px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.timeline-slider {
  flex-shrink: 0;
}
</style>
