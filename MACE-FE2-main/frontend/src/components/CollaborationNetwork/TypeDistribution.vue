<template>
  <div class="type-distribution">
    <div class="chart-header">
      <h3>企业类型分布</h3>
    </div>

    <div v-if="loading" class="chart-loading">
      <el-icon class="is-loading" :size="30"><Loading /></el-icon>
    </div>

    <div v-else-if="!hasData" class="chart-empty">
      <el-empty description="暂无数据" :image-size="60" />
    </div>

    <div v-else class="chart-content">
      <div ref="chartRef" class="chart-container"></div>

      <div class="stats-summary">
        <div class="stat-item">
          <span class="stat-label">制造商</span>
          <span class="stat-value" style="color: #67C23A;">{{ typeStats.manufacturer }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">销售商</span>
          <span class="stat-value" style="color: #E6A23C;">{{ typeStats.retailer }}</span>
        </div>
        <div class="stat-item total">
          <span class="stat-label">总计</span>
          <span class="stat-value">{{ typeStats.total }}</span>
        </div>
      </div>
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
const { currentMonth, loading: storeLoading } = storeToRefs(store)
const loading = computed(() => storeLoading.value.timeline || storeLoading.value.collaboration)

// 从当前月份过滤后的协作边中提取节点类型统计
const typeStats = computed(() => {
  const edges = store.filteredCollaborationEdges
  if (!edges || edges.length === 0) return { manufacturer: 0, retailer: 0, total: 0 }

  const lookup = new Map()
  const allNodes = store.collaborationNetwork.nodes || []
  allNodes.forEach(n => lookup.set(n.name, n.enterprise_type || ''))

  const nodeSet = new Set()
  edges.forEach(e => { nodeSet.add(e.source); nodeSet.add(e.target) })

  let manufacturer = 0, retailer = 0
  nodeSet.forEach(name => {
    const type = lookup.get(name) || ''
    if (type.includes('Retailer') || type.includes('销售商')) retailer++
    else manufacturer++
  })

  return { manufacturer, retailer, total: manufacturer + retailer }
})

const hasData = computed(() => typeStats.value.total > 0)

const chartRef = ref(null)
let chart = null

function renderChart() {
  if (!chartRef.value) return
  if (!hasData.value) return

  const el = chartRef.value
  if (el.clientWidth === 0 || el.clientHeight === 0) {
    setTimeout(renderChart, 200)
    return
  }

  if (!chart) {
    chart = echarts.init(el)
  }

  const stats = typeStats.value

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{d}%',
        fontSize: 11
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 13,
          fontWeight: 'bold'
        },
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      data: [
        { value: stats.manufacturer, name: '制造商', itemStyle: { color: '#67C23A' } },
        { value: stats.retailer, name: '销售商', itemStyle: { color: '#E6A23C' } }
      ]
    }]
  }

  chart.setOption(option, true)
}

function handleResize() {
  chart?.resize()
}

watch([typeStats, currentMonth], () => {
  nextTick(renderChart)
}, { deep: true })

onMounted(() => {
  setTimeout(() => renderChart(), 300)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.type-distribution {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chart-header {
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.chart-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.chart-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.chart-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chart-container {
  flex: 1;
  min-height: 0;
}

.stats-summary {
  padding: 8px 12px;
  border-top: 1px solid #ebeef5;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
}

.stat-item.total {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed #ebeef5;
  font-weight: 600;
}

.stat-label {
  color: #606266;
}

.stat-value {
  font-weight: 600;
  font-size: 14px;
}
</style>
