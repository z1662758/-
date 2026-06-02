<template>
  <div class="port-enterprise-panel">
    <!-- 标题 -->
    <div class="panel-header">
      <h3>港口企业聚类</h3>
      <el-tag type="info" size="small">{{ portsData.length }} 个港口</el-tag>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
      style="margin: 10px 0"
    />

    <!-- 港口列表（包含滚动） -->
    <div v-if="!loading && !error" class="ports-list">
      <!-- 港口项目 -->
      <div
        v-for="port in portsData"
        :key="port.port_id"
        class="port-item"
        :class="{ active: selectedPortId === port.port_id }"
        @click="selectPort(port)"
      >
        <div class="port-header">
          <span class="port-name">{{ port.port_name }}</span>
          <el-tag size="small">{{ port.stats.total }}</el-tag>
        </div>
        <div class="port-info">
          <span class="country">{{ port.country }}</span>
          <span class="city">{{ port.city }}</span>
        </div>
        <div class="port-stats">
          <el-tag v-if="port.stats.manufacturer > 0" size="small" type="success">
            制造商 {{ port.stats.manufacturer }}
          </el-tag>
          <el-tag v-if="port.stats.retailer > 0" size="small" type="warning">
            销售商 {{ port.stats.retailer }}
          </el-tag>
          <el-tag v-if="port.stats.supplier > 0" size="small" type="info">
            供应商 {{ port.stats.supplier }}
          </el-tag>
        </div>
      </div>

      <!-- 企业类型分布饼图（选中港口时显示，在列表内滚动） -->
      <div v-if="selectedPort" class="port-detail">
        <el-divider />
        <h4>{{ selectedPort.port_name }} - 企业分布</h4>
        <div ref="chartRef" class="chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { storeToRefs } from 'pinia'
import { Loading } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// Store
const store = useSupplyChainStore()
const { portsData, loading: storeLoading, errors } = storeToRefs(store)

// 本地状态
const loading = computed(() => storeLoading.value.ports)
const error = computed(() => errors.value.ports)
const selectedPortId = ref(null)
const selectedPort = ref(null)
const chartRef = ref(null)
let chartInstance = null

// 选择港口
const selectPort = (port) => {
  selectedPortId.value = port.port_id
  selectedPort.value = port

  // 触发自定义事件（用于地图高亮）
  emit('portSelected', port)

  // 渲染饼图
  nextTick(() => {
    renderPieChart()
  })
}

// 渲染企业类型分布饼图
const renderPieChart = () => {
  if (!selectedPort.value || !chartRef.value) return

  // 销毁旧实例
  if (chartInstance) {
    chartInstance.dispose()
  }

  // 创建新实例
  chartInstance = echarts.init(chartRef.value)

  const { manufacturer, retailer, supplier } = selectedPort.value.stats

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center'
    },
    series: [
      {
        name: '企业类型',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: manufacturer, name: '制造商', itemStyle: { color: '#67C23A' } },
          { value: retailer, name: '销售商', itemStyle: { color: '#E6A23C' } },
          { value: supplier, name: '供应商', itemStyle: { color: '#909399' } }
        ].filter(item => item.value > 0)
      }
    ]
  }

  chartInstance.setOption(option)
}

// 定义事件
const emit = defineEmits(['portSelected'])

// 初始化
onMounted(async () => {
  if (portsData.value.length === 0) {
    await store.loadPorts()
  }
})

// 监听窗口大小变化
watch(() => chartRef.value, () => {
  if (chartInstance) {
    chartInstance.resize()
  }
})
</script>

<style scoped>
.port-enterprise-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #909399;
}

.loading-container .el-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.ports-list {
  flex: 1 1 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden;
  min-height: 0 !important;
  max-height: 100%;
  scrollbar-width: thin;
  scrollbar-color: #dcdfe6 transparent;
}

/* 美化滚动条 */
.ports-list::-webkit-scrollbar {
  width: 6px;
}

.ports-list::-webkit-scrollbar-track {
  background: transparent;
}

.ports-list::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
}

.ports-list::-webkit-scrollbar-thumb:hover {
  background-color: #c0c4cc;
}

.port-item {
  padding: 8px 10px;
  margin-bottom: 6px;
  border: 1px solid #EBEEF5;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.port-item:hover {
  border-color: #409EFF;
  background-color: #ECF5FF;
}

.port-item.active {
  border-color: #409EFF;
  background-color: #ECF5FF;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
}

.port-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.port-name {
  font-weight: 600;
  font-size: 13px;
  color: #303133;
}

.port-info {
  display: flex;
  gap: 6px;
  font-size: 11px;
  color: #909399;
  margin-bottom: 6px;
}

.port-stats {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.port-stats .el-tag {
  height: 20px;
  line-height: 18px;
  padding: 0 6px;
  font-size: 11px;
}

.port-detail h4 {
  margin: 12px 0;
  font-size: 14px;
}

.chart-container {
  width: 100%;
  height: 200px;
}
</style>
