<template>
  <div class="network-evolution-chart">
    <div class="chart-header">
      <h3>网络演化面板</h3>
    </div>

    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else-if="!hasData" class="no-data">
      <el-empty description="暂无数据" />
    </div>

    <div v-else class="charts-container">
      <!-- 企业总数演化 -->
      <div ref="totalChartRef" class="chart-item"></div>

      <!-- 替换协作次数演化：静态极端事件轮播 -->
      <div class="event-carousel-item">
        <el-card shadow="hover" :class="`severity-${currentEvent.severity}`">
          <div class="event-header">
            <el-tag :type="getSeverityColor(currentEvent.severity)" effect="dark">
              {{ getSeverityLabel(currentEvent.severity) }}
            </el-tag>
            <span class="event-time">{{ currentEvent.time }}</span>
          </div>
          <div class="event-content">
            <h4>{{ currentEvent.title }}</h4>
            <p>{{ currentEvent.description }}</p>
          </div>
        </el-card>
      </div>

      <!-- 企业类型分布 -->
      <div ref="typesChartRef" class="chart-item"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { storeToRefs } from 'pinia'
import { Loading } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const store = useSupplyChainStore()
const { currentIterationData, currentMonth, loading: storeLoading, isPlaying } = storeToRefs(store)

const loading = computed(() => storeLoading.value.timeline)
const hasData = computed(() => currentIterationData.value.network?.length > 0)

const totalChartRef = ref(null)
const typesChartRef = ref(null)

let totalChart = null
let typesChart = null
let carouselTimer = null

// 轮播配置：20秒切换（定义常量，方便修改）
const CAROUSEL_INTERVAL = 5000

// 写死的极端事件数据（纯静态）
const extremeEvents = [
  {
    title: "苏伊士运河撞船事件",
    description: "巨型货轮搁浅导致运河关闭，全球供应链中断，原材料运输时间延长21天。",
    severity: "critical",
    time: "迭代1-月3"
  },
  {
    title: "上海港台风停运",
    description: "超强台风导致上海港暂停作业48小时，近千艘集装箱船延误。",
    severity: "high",
    time: "迭代1-月7"
  },
  {
    title: "马六甲海峡海盗袭击",
    description: "海盗劫持集装箱船，东南亚航线运费上涨20%，部分船公司暂停航线。",
    severity: "medium",
    time: "迭代2-月5"
  },
  {
    title: "盐田港疫情封控",
    description: "疫情导致盐田港吞吐量下降60%，跨境电商货物积压严重。",
    severity: "critical",
    time: "迭代2-月11"
  },
  {
    title: "巴拿马运河干旱限流",
    description: "干旱导致运河水位不足，每日通行船只减少30%，美洲航线时效延误15天。",
    severity: "medium",
    time: "迭代3-月2"
  }
]
const currentIndex = ref(0)
const currentEvent = computed(() => extremeEvents[currentIndex.value])

// 轮播核心控制逻辑
const nextEvent = () => {
  currentIndex.value = (currentIndex.value + 1) % extremeEvents.length
}

// 启动轮播（仅在点击运行后执行）
const startCarousel = () => {
  // 先清除已有定时器，避免重复创建
  if (carouselTimer) clearInterval(carouselTimer)
  carouselTimer = setInterval(nextEvent, CAROUSEL_INTERVAL)
}

// 暂停轮播（点击暂停按钮/销毁组件时执行）
const pauseCarousel = () => {
  if (carouselTimer) clearInterval(carouselTimer)
}

// 监听isPlaying状态（运行/暂停按钮的核心状态）
watch(isPlaying, (newVal) => {
  if (newVal) {
    // 点击「运行」：启动轮播
    startCarousel()
  } else {
    // 点击「暂停」：暂停轮播
    pauseCarousel()
  }
}, { immediate: false })

// 严重程度映射（用Element Plus自带类型）
const getSeverityLabel = (severity) => {
  const labels = { critical: '严重', high: '高', medium: '中' }
  return labels[severity] || severity
}
const getSeverityColor = (severity) => {
  const colors = { critical: 'danger', high: 'warning', medium: 'info' }
  return colors[severity] || ''
}

// 创建图表通用配置
const createChartOption = (title, yAxisName, data, currentIndex) => {
  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: '15%', right: '10%', top: '20%', bottom: '15%' },
    xAxis: { type: 'category', data: data.map((_, i) => `${i + 1}月`), name: '月份' },
    yAxis: { type: 'value', name: yAxisName },
    series: [{
      data: data.map((value, index) => ({
        value,
        itemStyle: { color: index === currentIndex ? '#F56C6C' : '#409EFF' }
      })),
      type: 'line',
      smooth: true,
      markPoint: currentIndex >= 0 ? {
        data: [{ coord: [currentIndex, data[currentIndex]], value: data[currentIndex] }],
        symbol: 'circle',
        symbolSize: 10,
        itemStyle: { color: '#F56C6C' }
      } : undefined
    }]
  }
}

// 创建企业类型分布图表配置
const createTypesChartOption = (networkData, currentIndex) => {
  return {
    title: { text: '企业类型分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, data: ['制造商', '销售商', '供应商'] },
    grid: { left: '15%', right: '10%', top: '20%', bottom: '25%' },
    xAxis: { type: 'category', data: networkData.map((_, i) => `${i + 1}月`), name: '月份' },
    yAxis: { type: 'value', name: '数量' },
    series: [
      {
        name: '制造商',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        data: networkData.map(d => d.manufacturer_count || 0),
        itemStyle: { color: '#67C23A' }
      },
      {
        name: '销售商',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        data: networkData.map(d => d.retailer_count || 0),
        itemStyle: { color: '#E6A23C' }
      },
      {
        name: '供应商',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        data: networkData.map(d => d.supplier_count || 0),
        itemStyle: { color: '#909399' }
      }
    ]
  }
}

// 数据采样函数
const sampleData = (data, threshold = 50, sampleRate = 5) => {
  if (data.length <= threshold) return data
  return data.filter((_, index) =>
    index === 0 ||
    index === data.length - 1 ||
    index % sampleRate === 0
  )
}

// 渲染所有图表
const renderCharts = () => {
  if (!hasData.value) return

  let networkData = currentIterationData.value.network
  let currentIdx = currentMonth.value

  if (networkData.length > 50) {
    const sampledData = sampleData(networkData)
    currentIdx = sampledData.findIndex((_, i) => {
      const originalIndex = networkData.indexOf(sampledData[i])
      return originalIndex >= currentMonth.value
    })
    if (currentIdx === -1) currentIdx = sampledData.length - 1
    networkData = sampledData
  }

  // 企业总数
  if (totalChartRef.value) {
    if (!totalChart) totalChart = echarts.init(totalChartRef.value)
    totalChart.setOption(createChartOption(
      '企业总数演化',
      '企业数',
      networkData.map(d => d.total_enterprises || 0),
      currentIdx
    ), { notMerge: false })
  }

  // 企业类型分布
  if (typesChartRef.value) {
    if (!typesChart) typesChart = echarts.init(typesChartRef.value)
    typesChart.setOption(createTypesChartOption(networkData, currentIdx), { notMerge: false })
  }
}

// 仅更新当前月份标记
const updateCurrentMonthMark = () => {
  if (!hasData.value) return

  const networkData = currentIterationData.value.network
  const currentIdx = currentMonth.value

  const updateChartMark = (chart, data) => {
    if (!chart) return
    chart.setOption({
      series: [{
        data: data.map((value, index) => ({
          value,
          itemStyle: { color: index === currentIdx ? '#F56C6C' : '#409EFF' }
        })),
        markPoint: currentIdx >= 0 ? {
          data: [{ coord: [currentIdx, data[currentIdx]], value: data[currentIdx] }],
          symbol: 'circle',
          symbolSize: 10,
          itemStyle: { color: '#F56C6C' }
        } : undefined
      }]
    }, { notMerge: false, lazyUpdate: true })
  }

  updateChartMark(totalChart, networkData.map(d => d.total_enterprises || 0))
}

// 监听迭代数据变化
watch(currentIterationData, () => {
  nextTick(() => renderCharts())
}, { deep: true })

// 监听月份变化
watch(currentMonth, () => {
  nextTick(() => updateCurrentMonthMark())
})

// 防抖函数
const debounce = (fn, delay) => {
  let timeoutId = null
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// 图表resize处理
const handleChartsResize = debounce(() => {
  [totalChart, typesChart].forEach(chart => {
    if (chart) chart.resize()
  })
}, 150)

onMounted(() => {
  nextTick(() => {
    renderCharts()
    // 移除自动初始化轮播，改为监听isPlaying启动
  })
  window.addEventListener('resize', handleChartsResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleChartsResize)
  [totalChart, typesChart].forEach(chart => {
    if (chart) chart.dispose()
  })
  // 销毁时清除轮播定时器
  pauseCarousel()
})
</script>

<style scoped>
.network-evolution-chart {
  height: 100%;
  background: #fff;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chart-header {
  flex-shrink: 0;
  margin-bottom: 10px;
}

.chart-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.loading,
.no-data {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.charts-container {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(3, 1fr);
  gap: 12px;
  overflow-y: auto;
  min-height: 0;
}

.chart-item {
  width: 100%;
  min-height: 150px;
  height: 100%;
}

/* 事件轮播项基础样式（仅用基础CSS，无复杂样式） */
.event-carousel-item {
  width: 100%;
  min-height: 150px;
  height: 100%;
  display: flex;
  align-items: center;
}

.event-carousel-item .el-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.event-time {
  font-size: 12px;
  color: #909399;
}

.event-content h4 {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.event-content p {
  margin: 0;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}
</style>