<template>
  <div class="post-map-page">
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

    <!-- 页头：标题 + 场景切换 + 实验选择 -->
    <div class="page-head">
      <div class="page-head-title">
        <h2>供应链态势地图</h2>
        <span>事后复盘 · 回顾实验供应链网络拓扑与年度调运态势</span>
      </div>
      <div class="page-head-controls">
        <el-radio-group v-model="activeScenario" class="scenario-tabs">
          <el-radio-button value="uranium">铀供应链地图</el-radio-button>
          <el-radio-button value="supplyChain">汽车供应链地图</el-radio-button>
        </el-radio-group>

        <!-- 铀实验选择 -->
        <el-select
          v-if="activeScenario === 'uranium'"
          v-model="uraniumPickerId"
          placeholder="选择铀实验"
          size="small"
          class="experiment-picker"
          filterable
        >
          <el-option
            v-for="opt in uraniumExperimentOptions"
            :key="opt.id"
            :label="opt.label"
            :value="opt.id"
          />
        </el-select>

        <!-- 汽车实验选择 -->
        <el-select
          v-else
          v-model="autoPickerId"
          placeholder="选择实验"
          size="small"
          class="experiment-picker"
          filterable
        >
          <el-option
            v-for="opt in autoExperimentOptions"
            :key="opt.id"
            :label="opt.label"
            :value="opt.id"
          />
        </el-select>
      </div>
    </div>

    <!-- 主体 -->
    <div class="page-body">
      <!-- ========== 铀供应链地图 ========== -->
      <div v-if="activeScenario === 'uranium'" class="uranium-view">
        <div class="uranium-metric-strip">
          <article v-for="card in uraniumYearMetricCards" :key="card.label" class="metric-card">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </div>

        <div class="uranium-map-wrap">
          <UraniumFlowMap
            v-if="uraniumExperiment"
            v-model:year-index="uraniumYearIndex"
            :experiment="uraniumExperiment"
            :timeline-rows="uraniumYearRows"
            :payload="uraniumMapPayload"
            :selected-route-key="uraniumFocusedRouteKey"
            :selected-static-corridor-id="uraniumStaticCorridorId"
            @update:selected-route-key="uraniumFocusedRouteKey = $event"
            @update:selected-static-corridor-id="uraniumStaticCorridorId = $event"
          />
          <el-empty
            v-else
            class="map-placeholder"
            description="正在准备铀供给地图，请先选择实验"
          />
        </div>
      </div>

      <!-- ========== 汽车供应链地图 ========== -->
      <!-- 布局：地图整幅占上部主区域；港口聚类与网络演化并排放到地图下方；
           极端事件按内容自适应高度（此前 flex: 1 会撑出大片空白） -->
      <div v-else class="supply-view">
        <div class="map-section">
          <SupplyChainMap ref="mapRef" />
        </div>
        <div class="bottom-section">
          <div class="bottom-panel">
            <PortEnterprisePanel @port-selected="handlePortSelected" />
          </div>
          <div class="bottom-panel bottom-panel--network">
            <NetworkEvolutionChart />
          </div>
        </div>
        <div v-if="currentExperimentId" class="events-section">
          <ExtremeEventsPanel :experiment-id="currentExperimentId" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useSupplyChainStore } from '@/stores/supplyChain'
import UraniumFlowMap from './components/UraniumFlowMap.vue'
import { useSupplyChainScenario, filterExperimentsByScenario } from '@/composables/useSupplyChainScenario'
import { SCENARIO_VALUES } from '@/constants/scnetScenario'
import {
  buildMapPayload,
  buildUraniumTimelineRows,
  formatUraniumMetricValue
} from '@/utils/uraniumDuringAdapter'

// 汽车场景配套组件（懒加载，与事中 interface.vue 一致）
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

// ================== 通用状态 ==================
// 场景与全局选择共用一份（对话首页切换 / ?scenario= 进入都会生效）：
// 此前固定默认铀供应链，汽车场景进入本页仍停在铀地图。
const { isUraniumScene } = useSupplyChainScenario()
const activeScenario = ref(isUraniumScene.value ? 'uranium' : 'supplyChain')
watch(isUraniumScene, () => {
  activeScenario.value = isUraniumScene.value ? 'uranium' : 'supplyChain'
})
const loadError = ref('')
const mapRef = ref(null)

// ================== 铀供应链地图 ==================
const uraniumDemoStore = useUraniumDemoStore()
const {
  selectedExperiment: uraniumExperiment,
  selectedExperimentId,
  history: uraniumHistory
} = storeToRefs(uraniumDemoStore)

const uraniumYearIndex = ref(0)
const uraniumFocusedRouteKey = ref('')
const uraniumStaticCorridorId = ref('')

const uraniumYearRows = computed(() => buildUraniumTimelineRows(uraniumExperiment.value))
const uraniumMapPayload = computed(() => buildMapPayload(uraniumExperiment.value, uraniumYearIndex.value))
const uraniumActiveYear = computed(() => (
  uraniumMapPayload.value.yearData
  || uraniumYearRows.value[uraniumYearIndex.value]
  || uraniumYearRows.value[uraniumYearRows.value.length - 1]
  || null
))
const uraniumYearMetricCards = computed(() => [
  {
    label: '现货价格',
    value: formatUraniumMetricValue('market_price_usd_lb', uraniumActiveYear.value?.market_price_usd_lb)
  },
  {
    label: '采购量',
    value: formatUraniumMetricValue('total_procured_tU', uraniumActiveYear.value?.total_procured_tU)
  },
  {
    label: '需求缺口',
    value: formatUraniumMetricValue('unmet_demand_tU', uraniumActiveYear.value?.unmet_demand_tU)
  },
  {
    label: '供给集中度',
    value: formatUraniumMetricValue('supply_concentration_hhi', uraniumActiveYear.value?.supply_concentration_hhi)
  }
])
const uraniumExperimentOptions = computed(() => (
  (uraniumHistory.value || [])
    .map((item) => ({
      id: item.experiment_id,
      label: `${item.name || item.experiment_id}${item.start_year ? `（${item.start_year}–${item.end_year || ''}）` : ''}`
    }))
    .filter((item) => item.id)
))
const uraniumPickerId = computed({
  get: () => selectedExperimentId.value || '',
  set: (id) => { if (id) uraniumDemoStore.loadExperiment(id) }
})

const ensureUraniumData = async () => {
  await uraniumDemoStore.ensureInitialized()
  const targetId = (
    selectedExperimentId.value
    || localStorage.getItem('selectedExperimentId')
    || uraniumExperimentOptions.value[0]?.id
    || ''
  )
  if (!targetId) return
  await uraniumDemoStore.loadExperiment(targetId)
}

// ================== 汽车供应链地图 ==================
const supplyChainStore = useSupplyChainStore()
const { currentExperimentId } = storeToRefs(supplyChainStore)

const autoPickerId = computed({
  get: () => currentExperimentId.value || '',
  set: (id) => { if (id) supplyChainStore.loadExperiment(id) }
})
// 实验列表里铀与汽车两类实验混在一起（接口不区分场景），下拉必须按场景过滤：
// 否则默认选中的是列表第一条（铀实验），汽车地图会去读铀实验的数据。
const automotiveExperiments = computed(() =>
  filterExperimentsByScenario(supplyChainStore.experiments, SCENARIO_VALUES.SUPPLY_CHAIN)
)
const autoExperimentOptions = computed(() => (
  automotiveExperiments.value
    .map((item) => ({ id: item.experiment_id, label: item.experiment_id }))
    .filter((item) => item.id)
))

const handlePortSelected = (port) => {
  if (mapRef.value) mapRef.value.handlePortSelected(port)
}

const ensureSupplyChainData = async () => {
  try {
    await supplyChainStore.loadPorts()
  } catch (e) {
    console.warn('[PostMap] 港口数据加载失败:', e)
  }
  try {
    await supplyChainStore.fetchExperiments()
    // selectedExperimentId（localStorage）可能是铀实验 id，汽车后端查不到，
    // 因此只有当前 id 确实在汽车实验列表里才沿用，否则回退到列表第一条。
    const automotiveIds = autoExperimentOptions.value.map((item) => item.id)
    const targetId = automotiveIds.includes(currentExperimentId.value)
      ? currentExperimentId.value
      : (automotiveIds[0] || '')
    if (targetId) await supplyChainStore.loadExperiment(targetId)
  } catch (e) {
    loadError.value = `供应链实验加载失败: ${e?.message || '未知错误'}`
  }
}

// 切换 Tab 后确保地图容器拿到正确尺寸
const requestViewResize = () => {
  nextTick(() => {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })
  })
}

onMounted(() => {
  ensureUraniumData()
    .catch((e) => { loadError.value = `铀实验加载失败: ${e?.message || '未知错误'}` })
    .finally(() => requestViewResize())
  ensureSupplyChainData()
})
</script>

<style scoped>
.post-map-page {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(135deg, #f2f6ff 0%, #f8fafc 55%, #f3f7ff 100%);
  padding: 12px;
  box-sizing: border-box;
  gap: 10px;
}

.error-alert {
  flex-shrink: 0;
}

/* ===== 页头 ===== */
.page-head {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
}

.page-head-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-head-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.page-head-title span {
  font-size: 12px;
  color: #64748b;
}

.page-head-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.experiment-picker {
  width: 260px;
}

/* ===== 主体 ===== */
.page-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ---- 铀视图 ---- */
.uranium-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.uranium-metric-strip {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
}

.metric-card span {
  font-size: 12px;
  color: #64748b;
}

.metric-card strong {
  font-size: 16px;
  font-weight: 800;
  color: #1e40af;
}

.uranium-map-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
}

.map-placeholder {
  height: 100%;
}

/* ---- 汽车视图 ---- */
.supply-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

/* 地图：占据上部主区域 */
.map-section {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 320px;
  overflow: hidden;
}

/* 地图下方：港口企业聚类 + 网络演化面板并排，固定约占三成高度 */
.bottom-section {
  flex: 0 0 34%;
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
  min-height: 220px;
  overflow: hidden;
}

.bottom-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* 网络演化面板从右栏移到地图下方后变成“宽而矮”，
   内部由纵向堆叠改成三栏平铺，图表与事件卡不再被裁掉。 */
.bottom-panel--network :deep(.charts-container) {
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(210px, 0.95fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
}

.bottom-panel--network :deep(.chart-item),
.bottom-panel--network :deep(.event-carousel-item) {
  min-height: 0;
  height: 100%;
}

.bottom-panel--network :deep(.event-content) {
  overflow-y: auto;
}

/* 极端事件：高度随内容，不再抢占页面下半部分 */
.events-section {
  flex: 0 0 auto;
  margin-top: 2px;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 1100px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }
  .uranium-metric-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .map-section {
    min-height: 260px;
  }
  .bottom-section {
    flex: 0 0 40%;
    grid-template-columns: minmax(0, 1fr);
  }
  .bottom-panel--network :deep(.charts-container) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: repeat(3, minmax(150px, 1fr));
    overflow-y: auto;
  }
}
</style>
