<template>
  <div class="network-metrics">
    <div class="metrics-header">
      <h3>网络指标</h3>
    </div>

    <div v-if="loading" class="metrics-loading">
      <el-icon class="is-loading" :size="30"><Loading /></el-icon>
    </div>

    <div v-else-if="!hasData" class="metrics-empty">
      <el-empty description="暂无数据" :image-size="60" />
    </div>

    <div v-else class="metrics-content">
      <!-- 当前指标卡片 -->
      <div class="current-metrics">
        <div class="metric-card">
          <div class="metric-icon" style="background: #ecf5ff; color: #409eff;">
            <el-icon :size="20"><OfficeBuilding /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-label">企业总数</div>
            <div class="metric-value">{{ currentMetrics.totalEnterprises }}</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background: #f0f9ff; color: #67c23a;">
            <el-icon :size="20"><Connection /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-label">协作关系</div>
            <div class="metric-value">{{ currentMetrics.collaborationCount }}</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background: #fef0f0; color: #f56c6c;">
            <el-icon :size="20"><TrendCharts /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-label">网络密度</div>
            <div class="metric-value">{{ currentMetrics.networkDensity }}</div>
          </div>
        </div>
      </div>

      <!-- 演化趋势图表 -->
      <div class="evolution-charts">
        <div ref="enterpriseChartRef" class="chart-item"></div>
        <div ref="collaborationChartRef" class="chart-item"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { storeToRefs } from 'pinia'
import { Loading, OfficeBuilding, Connection, TrendCharts } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const store = useSupplyChainStore()
const { currentMonth, loading: storeLoading } = storeToRefs(store)
const loading = computed(() => storeLoading.value.timeline || storeLoading.value.collaboration)

const hasData = computed(() => {
  return store.filteredCollaborationEdges?.length > 0 || (store.currentNetwork && Object.keys(store.currentNetwork).length > 0)
})

// 从协作边推算当前月份的指标
const currentMetrics = computed(() => {
  const edges = store.filteredCollaborationEdges || []
  const nodeSet = new Set()
  edges.forEach(e => { nodeSet.add(e.source); nodeSet.add(e.target) })

  const totalEnterprises = nodeSet.size
  const collaborationCount = edges.length

  const maxEdges = totalEnterprises * (totalEnterprises - 1) / 2
  const density = maxEdges > 0 ? (collaborationCount / maxEdges) : 0

  return {
    totalEnterprises,
    collaborationCount,
    networkDensity: (density * 100).toFixed(2) + '%'
  }
})

const enterpriseChartRef = ref(null)
const collaborationChartRef = ref(null)
let enterpriseChart = null
let collaborationChart = null

// 创建图表配置
function createChartOption(title, yAxisName, data, currentIndex) {
  return {
    title: {
      text: title,
      left: 'center',
      textStyle: { fontSize: 13, fontWeight: 600 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        return `${p.name}<br/>${p.seriesName}: ${p.value}`
      }
    },
    grid: {
      left: '12%',
      right: '8%',
      top: '25%',
      bottom: '15%'
    },
    xAxis: {
      type: 'category',
      data: data.map((_, i) => `${i + 1}月`),
      axisLabel: { fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
      nameTextStyle: { fontSize: 11 },
      axisLabel: { fontSize: 10 }
    },
    series: [{
      name: yAxisName,
      type: 'line',
      data: data,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: {
        color: (params) => params.dataIndex === currentIndex ? '#f56c6c' : '#409eff'
      },
      lineStyle: {
        color: '#409eff',
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ]
        }
      },
      markPoint: {
        data: [{ coord: [currentIndex, data[currentIndex]], symbol: 'pin', symbolSize: 40 }],
        itemStyle: { color: '#f56c6c' }
      }
    }]
  }
}

// 从协作网络全量边数据计算每月的企业数和协作数
const monthlyStats = computed(() => {
  const allEdges = store.collaborationNetwork.edges
  if (!allEdges || allEdges.length === 0) return []

  const totalMonths = store.totalMonths || 21
  const baseYear = 2024, baseMonth = 1
  const result = []

  for (let i = 0; i < totalMonths; i++) {
    const year = baseYear + Math.floor((baseMonth - 1 + i) / 12)
    const month = ((baseMonth - 1 + i) % 12) + 1
    const monthStr = `${year}-${String(month).padStart(2, '0')}`

    const activeEdges = allEdges.filter(e => e.first_month <= monthStr && monthStr <= e.last_month)
    const nodeSet = new Set()
    activeEdges.forEach(e => { nodeSet.add(e.source); nodeSet.add(e.target) })

    result.push({ enterprises: nodeSet.size, collaborations: activeEdges.length })
  }
  return result
})

function renderCharts() {
  if (!hasData.value) return

  const stats = monthlyStats.value
  if (stats.length === 0) return

  const currentIdx = currentMonth.value

  // 企业总数演化
  if (enterpriseChartRef.value) {
    if (!enterpriseChart) enterpriseChart = echarts.init(enterpriseChartRef.value)
    const data = stats.map(d => d.enterprises)
    enterpriseChart.setOption(createChartOption('企业总数演化', '企业数', data, currentIdx), { notMerge: false })
  }

  // 协作次数演化
  if (collaborationChartRef.value) {
    if (!collaborationChart) collaborationChart = echarts.init(collaborationChartRef.value)
    const data = stats.map(d => d.collaborations)
    collaborationChart.setOption(createChartOption('协作关系演化', '协作数', data, currentIdx), { notMerge: false })
  }
}

function handleResize() {
  enterpriseChart?.resize()
  collaborationChart?.resize()
}

watch([monthlyStats, currentMonth], () => {
  nextTick(renderCharts)
}, { deep: true })

onMounted(() => {
  setTimeout(() => renderCharts(), 300)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  enterpriseChart?.dispose()
  collaborationChart?.dispose()
  enterpriseChart = null
  collaborationChart = null
})
</script>

<style scoped>
.network-metrics {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.metrics-header {
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.metrics-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.metrics-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.metrics-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metrics-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  min-height: 0;
}

.current-metrics {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 6px;
  transition: all 0.3s;
}

.metric-card:hover {
  background: #ecf5ff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.metric-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-info {
  flex: 1;
}

.metric-label {
  font-size: 11px;
  color: #909399;
  margin-bottom: 2px;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.evolution-charts {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
  min-height: 0;
  overflow: auto;
}

.chart-item {
  height: 180px;
  flex-shrink: 0;
}
</style>
