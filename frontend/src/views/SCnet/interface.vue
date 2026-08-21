<template>
  <div class="simulation-interface">
    <!-- 错误提示 -->
    <el-alert
      v-if="loadError"
      type="error"
      :title="loadError"
      closable
      class="error-alert"
      show-icon
      @close="loadError = ''"
    />

    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="toolbar-title">
          <span class="toolbar-title-main">{{ currentScenario === 'supplyChain' ? '供应链运行态势' : '企业协作网络' }}</span>
          <span class="toolbar-title-sub">{{ currentExperimentLabel }}</span>
        </div>
        <!-- 场景选择 -->
        <el-button-group class="scenario-group">
          <el-button :type="currentScenario === 'supplyChain' ? 'primary' : ''" @click="switchScenario('supplyChain')" size="small">
            供应链地图
          </el-button>
          <el-button :type="currentScenario === 'collaborationNetwork' ? 'primary' : ''" @click="switchScenario('collaborationNetwork')" size="small">
            协作网络
          </el-button>
        </el-button-group>
      </div>
      <div class="toolbar-controls">
        <!-- 供应链仿真控制 -->
        <el-button-group style="margin-left: 8px;">
          <el-button
            :icon="isPlaying ? VideoPause : VideoPlay"
            @click="togglePlay"
            :disabled="!hasTimeline"
            size="small"
          >
            {{ isPlaying ? '暂停' : '运行' }}
          </el-button>
          <el-button :icon="RefreshLeft" @click="resetTimeline" :disabled="!hasTimeline" size="small">
            重置
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 供应链地图视图 -->
      <div v-if="currentScenario === 'supplyChain'" class="view-wrapper">
        <div v-if="scLoading" class="view-loading">
          <el-icon class="is-loading" :size="40"><Loading /></el-icon>
          <p>正在加载实验数据...</p>
        </div>
        <div v-else-if="viewMode === 'simulation'" class="simulation-view">
          <div class="top-section">
            <div class="left-panel">
              <PortEnterprisePanel @portSelected="handlePortSelected" />
            </div>
            <div class="center-panel">
              <SupplyChainMap ref="mapRef" />
            </div>
            <div class="right-panel">
              <NetworkEvolutionChart />
            </div>
          </div>
          <div v-if="currentExperimentId" class="events-section">
            <ExtremeEventsPanel :experiment-id="currentExperimentId" />
          </div>
        </div>
        <div v-else class="analysis-view">
          <el-empty description="分析视图开发中" />
        </div>
      </div>

      <!-- 协作网络视图 -->
      <div v-else class="view-wrapper">
        <div v-if="scLoading" class="view-loading">
          <el-icon class="is-loading" :size="40"><Loading /></el-icon>
          <p>正在加载协作网络数据...</p>
        </div>
        <div v-else class="collaboration-network-view">
          <div class="cn-top-section">
            <div class="cn-left-panel">
              <TypeDistribution />
            </div>
            <div class="cn-center-panel">
              <CollaborationNetworkGraph />
            </div>
            <div class="cn-right-panel">
              <NetworkMetrics />
            </div>
          </div>
          <div class="cn-timeline-section">
            <SimulationTimeline />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { storeToRefs } from 'pinia'
import { Loading, VideoPlay, VideoPause, RefreshLeft } from '@element-plus/icons-vue'

// ================== 供应链组件（懒加载） ==================
const PortEnterprisePanel = defineAsyncComponent(() =>
  import('@/components/SupplyChain/PortEnterprisePanel.vue')
)
const SupplyChainMap = defineAsyncComponent(() =>
  import('@/components/SupplyChain/SupplyChainMap.vue')
)
const NetworkEvolutionChart = defineAsyncComponent(() =>
  import('@/components/SupplyChain/NetworkEvolutionChart.vue')
)
const ExtremeEventsPanel = defineAsyncComponent(() =>
  import('@/components/SCnet/ExtremeEventsPanel.vue')
)

// ================== 协作网络组件（懒加载） ==================
const CollaborationNetworkGraph = defineAsyncComponent(() =>
  import('@/components/CollaborationNetwork/NetworkGraph.vue')
)
const TypeDistribution = defineAsyncComponent(() =>
  import('@/components/CollaborationNetwork/TypeDistribution.vue')
)
const NetworkMetrics = defineAsyncComponent(() =>
  import('@/components/CollaborationNetwork/NetworkMetrics.vue')
)
const SimulationTimeline = defineAsyncComponent(() =>
  import('@/components/SupplyChain/SimulationTimeline.vue')
)

// ================== Stores ==================
const supplyChainStore = useSupplyChainStore()
const { currentExperimentId, isPlaying, totalMonths } = storeToRefs(supplyChainStore)

// ================== 状态 ==================
const currentScenario = ref('supplyChain')
const viewMode = ref('simulation')
const scLoading = ref(false)
const loadError = ref('')
const mapRef = ref(null)

const handlePortSelected = (port) => {
  if (mapRef.value) mapRef.value.handlePortSelected(port)
}

// ================== 仿真控制 ==================
const hasTimeline = computed(() => totalMonths.value > 0)
const currentExperimentLabel = computed(() => {
  if (currentExperimentId.value) return `当前实验 ${currentExperimentId.value}`
  return '未选择实验'
})

const togglePlay = () => {
  if (isPlaying.value) {
    supplyChainStore.pauseTimeline()
  } else {
    supplyChainStore.playTimeline()
  }
}

const resetTimeline = () => {
  supplyChainStore.resetTimeline()
}

// ================== 供应链加载 ==================
let scLoadFlag = false
const loadSupplyChainData = async () => {
  if (scLoadFlag) return
  scLoadFlag = true
  scLoading.value = true
  loadError.value = ''
  try {
    await supplyChainStore.fetchExperiments()
    if (supplyChainStore.experiments.length === 0) {
      throw new Error('没有找到任何实验数据')
    }
    const targetExperimentId = supplyChainStore.currentExperimentId || supplyChainStore.experiments[0].experiment_id
    await supplyChainStore.loadExperiment(targetExperimentId)
  } catch (e) {
    loadError.value = `供应链加载失败: ${e.message || '未知错误'}`
  } finally {
    scLoadFlag = false
    scLoading.value = false
  }
}

// ================== 场景切换 ==================
const switchScenario = async (scenario) => {
  if (currentScenario.value === scenario) return
  currentScenario.value = scenario
  loadError.value = ''

  // 协作网络视图使用供应链数据，确保数据已加载
  if (!supplyChainStore.currentExperimentId) {
    await loadSupplyChainData()
  }

  // 切换到协作网络时加载协作数据
  if (scenario === 'collaborationNetwork') {
    supplyChainStore.fetchCollaborationNetwork().catch(e => {
      console.warn('[interface] 加载协作网络数据失败:', e)
    })
  }
}

onMounted(() => {
  loadSupplyChainData()
})
</script>

<style scoped>
.simulation-interface {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
  overflow: hidden;
}

.error-alert {
  margin: 8px 16px 0;
  flex-shrink: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
  flex-shrink: 0;
  min-height: 44px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-controls {
  display: flex;
  align-items: center;
}

.main-content {
  flex: 1;
  padding: 6px;
  overflow: hidden;
  min-height: 0;
}

.toolbar-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 180px;
}

.toolbar-title-main {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.toolbar-title-sub {
  font-size: 12px;
  color: #64748b;
}

.view-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.view-loading {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #909399;
  background: rgba(255,255,255,0.8);
}

/* ========== 供应链地图视图 ========== */
.simulation-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 6px;
}

.top-section {
  flex: 3;
  display: flex;
  flex-direction: row;
  gap: 6px;
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  width: 18%;
  min-width: 240px;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.center-panel {
  flex: 1;
  min-width: 400px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-panel {
  width: 18%;
  min-width: 240px;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.events-section {
  flex: 1;
  margin-top: 2px;
  flex-shrink: 0;
  min-height: 200px;
}

.analysis-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #fff;
  border-radius: 4px;
}

/* ========== 协作网络视图 ========== */
.collaboration-network-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.cn-top-section {
  display: flex;
  flex-direction: row;
  gap: 12px;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.cn-timeline-section {
  flex-shrink: 0;
  margin-top: 6px;
}

.cn-left-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cn-center-panel {
  flex: 1;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cn-right-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
</style>
