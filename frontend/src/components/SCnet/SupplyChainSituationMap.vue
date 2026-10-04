<template>
  <div class="situation-map-panel">
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

    <!-- 工具条：场景跟随全局选择；实验锁定为干预分析页正在分析的同一个实验，面板内不再单独选实验 -->
    <header class="map-toolbar">
      <div class="toolbar-title">
        <el-icon><MapLocation /></el-icon>
        <span>供应链态势地图</span>
        <el-tag size="small" round effect="light" :type="isUraniumScene ? 'warning' : 'primary'">{{ scenarioLabel }}</el-tag>
        <span class="toolbar-hint">{{ toolbarHint }}</span>
      </div>
      <div class="toolbar-lock" :title="lockHint">
        <el-icon><Lock /></el-icon>
        <span class="lock-label">分析对象</span>
        <strong class="lock-value">{{ lockedExperimentLabel }}</strong>
      </div>
    </header>

    <div class="map-body">
      <!-- ========== 铀供应链地图：后端态势快照 + 知识库年度口径 ========== -->
      <div v-if="isUraniumScene" class="uranium-view">
        <div class="uranium-metric-strip">
          <article v-for="card in uraniumMetricCards" :key="card.label" class="metric-card">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </div>

        <div class="uranium-map-wrap">
          <UraniumFlowMap
            v-if="uraniumReady"
            v-model:year-index="uraniumYearIndex"
            :experiment="uraniumMapExperiment"
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
            :description="uraniumLoading ? '正在加载铀供应链态势快照…' : '暂无铀供应链态势快照数据'"
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
/**
 * 供应链态势地图面板 —— 由原「供应链态势地图」独立页面抽出，现内嵌在干预分析页。
 *
 * 与干预分析保持同一条数据链是本面板的核心约定：
 *   · 不再自带实验选择器，实验由干预分析页解析后通过 experimentId 传入（同一 experiment_id、
 *     同一场景），避免「策略/异常来自实验A、地图来自实验B」的割裂；
 *   · 汽车场景：网络、港口企业聚类、网络演化、极端事件全部读该实验的后端仿真结果；
 *   · 铀场景：后端实验只含仿真指标、不含流向拓扑，因此拓扑取自后端态势快照
 *     （/SCnet/uraniumSituation/latest，由 10 个模型串联产出），体量与年度口径取自
 *     铀知识库（各国产量历史 / 年度合同量 / 年度市场统计），同样不做前端合成。
 */
import { ref, computed, watch, onMounted, nextTick, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { MapLocation, Lock } from '@element-plus/icons-vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import UraniumFlowMap from '@/views/SCnet/components/UraniumFlowMap.vue'
import { useSupplyChainScenario, filterExperimentsByScenario } from '@/composables/useSupplyChainScenario'
import { SCENARIO_VALUES, SCENARIO_LABELS } from '@/constants/scnetScenario'
import { getLatestSnapshot } from '@/api/uraniumSituationSnapshot'
import {
  getUraniumSuppliers,
  getUraniumCollaboration,
  getUraniumMarketStatistics
} from '@/api/uraniumSupplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'
import {
  buildContractVolumeIndex,
  buildProductionIndex,
  buildSituationMapPayload,
  buildSituationMetricCards,
  buildSituationTimeline,
  formatSnapshotStamp,
  resolveLatestPricedYearIndex
} from '@/utils/uraniumSituationAdapter'

const props = defineProps({
  // 干预分析页锁定的实验 id：地图跟随该实验，不再自己选
  experimentId: { type: String, default: '' }
})

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
const { scenarioStore, isUraniumScene } = useSupplyChainScenario()
const scenarioLabel = computed(
  () => SCENARIO_LABELS[scenarioStore.currentScenario] || SCENARIO_LABELS[SCENARIO_VALUES.URANIUM]
)
const loadError = ref('')
const mapRef = ref(null)
const lockedExperimentLabel = computed(() => String(props.experimentId || '').trim() || '跟随页面当前实验')
const lockHint = computed(() => (
  isUraniumScene.value
    ? '铀场景的流向拓扑来自后端态势快照（知识库年度口径），干预策略与异常事件来自该锁定实验'
    : '地图与干预分析页共用同一个实验，网络演化与极端事件均取自该实验的后端仿真结果'
))

// ================== 铀供应链地图（后端态势快照 + 知识库年度口径）==================
const uraniumSnapshot = ref(null)
const uraniumSuppliers = ref(null)
const uraniumCollaboration = ref(null)
const uraniumMarketStats = ref(null)
const uraniumLoading = ref(false)
const uraniumYearIndex = ref(0)
const uraniumFocusedRouteKey = ref('')
const uraniumStaticCorridorId = ref('')
let uraniumYearInitialized = false

const uraniumProduction = computed(() => buildProductionIndex(uraniumSuppliers.value))
const uraniumContractVolumes = computed(() => buildContractVolumeIndex(uraniumCollaboration.value))
const uraniumYearRows = computed(() => buildSituationTimeline(uraniumSnapshot.value, {
  suppliers: uraniumSuppliers.value,
  marketStatistics: uraniumMarketStats.value
}))
const uraniumActiveYear = computed(() => (
  uraniumYearRows.value[uraniumYearIndex.value]
  || uraniumYearRows.value[uraniumYearRows.value.length - 1]
  || null
))
const uraniumMapPayload = computed(() => buildSituationMapPayload(uraniumSnapshot.value, {
  year: uraniumActiveYear.value?.year ?? null,
  production: uraniumProduction.value,
  contractVolumes: uraniumContractVolumes.value
}))
const uraniumMetricCards = computed(() => buildSituationMetricCards(uraniumActiveYear.value))
const uraniumReady = computed(() => (uraniumMapPayload.value.supplierNodes || []).length > 0)
const uraniumMapExperiment = computed(() => ({
  experiment_id: 'uranium_situation_' + (uraniumSnapshot.value?.snapshot_id || 'latest'),
  name: '铀供应链态势快照'
}))

const toolbarHint = computed(() => {
  if (isUraniumScene.value) {
    const stamp = formatSnapshotStamp(uraniumSnapshot.value)
    return stamp ? '态势快照 ' + stamp + ' · 体量口径取铀知识库真实统计' : '铀供给网络拓扑与关键通道'
  }
  return '汽车供应链网络、港口企业聚类与网络演化'
})

const ensureUraniumData = async () => {
  uraniumLoading.value = true
  const results = await Promise.allSettled([
    getLatestSnapshot('REAL').then((res) => { uraniumSnapshot.value = unwrapApiData(res) || null }),
    getUraniumSuppliers().then((res) => { uraniumSuppliers.value = unwrapApiData(res) || null }),
    getUraniumCollaboration().then((res) => { uraniumCollaboration.value = unwrapApiData(res) || null }),
    getUraniumMarketStatistics().then((res) => { uraniumMarketStats.value = unwrapApiData(res) || null })
  ])
  uraniumLoading.value = false
  const [snapshotResult, suppliersResult, collaborationResult, marketResult] = results
  if (snapshotResult.status === 'rejected') {
    loadError.value = '铀供应链态势快照加载失败: ' + (snapshotResult.reason?.message || '未知错误')
  }
  ;[suppliersResult, collaborationResult, marketResult].forEach((item) => {
    if (item.status === 'rejected') {
      console.warn('[SituationMap] 铀知识库数据加载失败，年度口径将回落:', item.reason)
    }
  })
}

// 年度轴默认停在最新年份（真实统计年份区间 1997-2021）
watch(uraniumYearRows, (rows) => {
  if (!rows.length) {
    uraniumYearIndex.value = 0
    return
  }
  if (!uraniumYearInitialized) {
    // 默认落在最近一个有现货价数据的年份，年度指标卡不留空
    uraniumYearIndex.value = resolveLatestPricedYearIndex(rows)
    uraniumYearInitialized = true
    return
  }
  if (uraniumYearIndex.value > rows.length - 1) uraniumYearIndex.value = rows.length - 1
})

// ================== 汽车供应链地图（锁定实验的真实仿真结果）==================
const supplyChainStore = useSupplyChainStore()
const { currentExperimentId } = storeToRefs(supplyChainStore)

const handlePortSelected = (port) => {
  if (mapRef.value) mapRef.value.handlePortSelected(port)
}

// 锁定实验必须落在汽车实验列表里；否则回落到该场景最新一条（列表混装铀与汽车实验）
const loadLockedAutomotiveExperiment = async (preferredId = '') => {
  const automotiveIds = filterExperimentsByScenario(supplyChainStore.experiments, SCENARIO_VALUES.SUPPLY_CHAIN)
    .map((item) => String(item.experiment_id || item.id || ''))
    .filter(Boolean)
  const locked = String(preferredId || '').trim()
  const targetId = automotiveIds.includes(locked) ? locked : (automotiveIds[0] || '')
  if (!targetId) return
  if (String(currentExperimentId.value || '') === targetId) return
  await supplyChainStore.loadExperiment(targetId)
}

const ensureSupplyChainData = async () => {
  try {
    await supplyChainStore.loadPorts()
  } catch (e) {
    console.warn('[SituationMap] 港口数据加载失败:', e)
  }
  try {
    await supplyChainStore.fetchExperiments()
    await loadLockedAutomotiveExperiment(props.experimentId)
  } catch (e) {
    loadError.value = '供应链实验加载失败: ' + (e?.message || '未知错误')
  }
}

// 干预分析页解析出实验 id 后（可能晚于本面板挂载），地图跟着切到同一个实验
watch(() => props.experimentId, (experimentId) => {
  if (isUraniumScene.value) return
  if (!(supplyChainStore.experiments || []).length) return
  loadLockedAutomotiveExperiment(experimentId).catch((e) => {
    loadError.value = '供应链实验加载失败: ' + (e?.message || '未知错误')
  })
})

// 场景切换 / 面板新挂载后让地图容器重新量尺寸
const requestViewResize = () => {
  nextTick(() => {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })
  })
}

watch(isUraniumScene, () => requestViewResize())

onMounted(() => {
  ensureUraniumData()
    .catch((e) => { loadError.value = '铀实验加载失败: ' + (e?.message || '未知错误') })
    .finally(() => requestViewResize())
  ensureSupplyChainData()
})
</script>

<style scoped>
/* 内嵌面板：固定高度保证 echarts / 地图容器量得到尺寸 */
.situation-map-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: clamp(600px, 70vh, 780px);
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}

.error-alert { flex-shrink: 0; }

/* ===== 工具条 ===== */
.map-toolbar {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fafc, #ffffff);
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
}

.toolbar-title .el-icon { color: #3b82f6; }

.toolbar-hint {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 锁定实验标识：只读，表示地图与干预分析看的是同一份实验 */
.toolbar-lock {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 5px 12px;
  border: 1px solid #c7d2fe;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 12px;
}

.toolbar-lock .el-icon { color: #4f46e5; }
.toolbar-lock .lock-label { color: #6366f1; }
.toolbar-lock .lock-value { font-weight: 800; }

/* ===== 主体 ===== */
.map-body {
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

.metric-card span { font-size: 12px; color: #64748b; }

.metric-card strong { font-size: 16px; font-weight: 800; color: #1e40af; }

.uranium-map-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
}

.map-placeholder { height: 100%; }

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

.bottom-panel--network :deep(.event-content) { overflow-y: auto; }

/* 极端事件：高度随内容，不再抢占页面下半部分 */
.events-section {
  flex: 0 0 auto;
  margin-top: 2px;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 1100px) {
  .map-toolbar { flex-direction: column; align-items: flex-start; }
  .uranium-metric-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .map-section { min-height: 260px; }
  .bottom-section { flex: 0 0 40%; grid-template-columns: minmax(0, 1fr); }
  .bottom-panel--network :deep(.charts-container) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: repeat(3, minmax(150px, 1fr));
    overflow-y: auto;
  }
}
</style>
