<template>
  <div class="simulation-interface mid-stage-bg">
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
    <MidStagePageHeader
      :title="headerTitle"
      :subtitle="headerSubtitle"
      :icon="Place"
    >
      <template #center>
        <div v-if="isUraniumMode" class="uranium-header-context">
          <span>{{ uraniumActiveYearLabel }}</span>
        </div>
      </template>
      <template #right>
        <el-button
          v-if="isUraniumMode"
          size="small"
          type="primary"
          @click="reloadUraniumExperiment"
        >
          <el-icon><RefreshLeft /></el-icon>
          <span>刷新实验</span>
        </el-button>
      </template>
    </MidStagePageHeader>

    <!-- 主内容区 -->
    <div class="main-content">
      <div v-if="isScenarioBusy" class="view-busy-hint">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在准备铀场景实验数据...</span>
      </div>

      <div class="view-wrapper">
        <div class="simulation-view">
          <div v-if="isUraniumMode" class="top-section">
            <div class="left-panel">
              <div class="uranium-route-panel uranium-panel-scroll">
                <div class="uranium-panel-head">
                  <div class="uranium-panel-title">运输通道</div>
                  <div class="uranium-panel-subtitle">铀以黄饼 / UF6 形态运输，分陆运、海运与多式联运三类</div>
                </div>

                <div class="entity-stat-grid">
                  <article v-for="item in uraniumTransportStatCards" :key="item.label" class="entity-stat-card">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </article>
                </div>

                <div v-if="uraniumSelectedStaticCorridor" class="uranium-focus-card corridor">
                  <div class="uranium-focus-top">
                    <strong>{{ uraniumSelectedStaticCorridor.shortName }}</strong>
                    <span>{{ uraniumSelectedStaticCorridor.typeLabel }}</span>
                  </div>
                  <div class="uranium-focus-name">{{ uraniumSelectedStaticCorridor.name }}</div>
                  <div class="uranium-focus-meta">
                    <span>{{ uraniumSelectedStaticCorridor.operator }}</span>
                    <span>{{ uraniumSelectedStaticCorridor.capacityLabel }}</span>
                  </div>
                  <div class="uranium-focus-trace">{{ uraniumSelectedStaticCorridor.summary }}</div>
                  <el-button size="small" text class="uranium-inline-btn" @click="selectStaticCorridor('')">
                    查看全部
                  </el-button>
                </div>

                <div class="uranium-info-block">
                  <div class="uranium-block-row">
                    <div class="uranium-block-title">通道目录</div>
                  </div>
                  <div class="uranium-route-list">
                    <article
                      v-for="item in uraniumCorridorRows"
                      :key="item.id"
                      class="uranium-route-card"
                      :class="{ active: item.id === uraniumStaticCorridorId }"
                      @click="selectStaticCorridor(item.id)"
                    >
                      <div class="uranium-route-top">
                        <strong>{{ item.shortName }}</strong>
                        <span>{{ item.typeLabel }}</span>
                      </div>
                      <div class="uranium-route-name">{{ item.name }}</div>
                      <div class="uranium-route-meta">
                        <span>{{ item.origin }} → {{ item.destination }}</span>
                        <span>{{ item.riskLabel }}</span>
                      </div>
                    </article>
                  </div>
                </div>

                                              </div>
            </div>

            <div class="center-panel">
              <div class="map-stage-row">
                <UraniumFlowMap
                  v-if="uraniumExperiment"
                  v-model:year-index="uraniumSelectedYearIndex"
                  :experiment="uraniumExperiment"
                  :timeline-rows="uraniumYearRows"
                  :payload="uraniumMapPayload"
                  :selected-route-key="uraniumFocusedRouteKey"
                  :selected-static-corridor-id="uraniumStaticCorridorId"
                  @update:selected-route-key="uraniumFocusedRouteKey = $event"
                  @update:selected-static-corridor-id="uraniumStaticCorridorId = $event"
                />
                <AsyncPanelPlaceholder
                  v-else
                  class="panel-placeholder"
                  title="正在准备铀供给地图"
                  subtitle="同步实验结果与本年调运数据"
                  variant="map"
                />
              </div>
            </div>

            <div class="right-panel">
              <div class="right-stack-item">
                <div class="uranium-side-card uranium-panel-scroll simulation-status-panel">
                  <div class="uranium-panel-head">
                    <div class="uranium-panel-title">运行态势</div>
                    <div class="uranium-panel-subtitle">{{ uraniumActiveYearLabel }}的供应、调运与吸收关系</div>
                  </div>

                  <div class="uranium-summary-grid compact">
                    <article v-for="item in uraniumYearMetricCards" :key="item.label" class="uranium-summary-card">
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </article>
                  </div>

                  <div class="uranium-info-block">
                    <div class="uranium-block-row">
                      <div class="uranium-block-title">年度事件</div>
                      <span class="uranium-block-tip">{{ uraniumActiveEventRows.length }} 项变化</span>
                    </div>
                    <div class="uranium-chip-row">
                      <el-tag
                        v-for="item in uraniumActiveEventRows"
                        :key="item.key"
                        size="small"
                        :type="item.type"
                        effect="light"
                      >
                        {{ item.label }}
                      </el-tag>
                      <span v-if="!uraniumActiveEventRows.length" class="uranium-empty-note">本年无激活事件</span>
                    </div>
                  </div>

                  <div class="uranium-info-block process-section">
                    <div class="uranium-block-row">
                      <div class="uranium-block-title">选中调运关系</div>
                      <span class="uranium-block-tip">{{ uraniumFocusedRoute?.route_label || '未选中' }}</span>
                    </div>
                    <div v-if="uraniumFocusedRoute" class="uranium-focus-card runtime">
                      <div class="uranium-focus-top">
                        <strong>{{ uraniumFocusedRoute.supplier_name }} → {{ uraniumFocusedRoute.manufacturer_name }}</strong>
                        <span>{{ uraniumFocusedRoute.route_label }}</span>
                      </div>
                      <div class="uranium-focus-metric-grid">
                        <article v-for="item in uraniumFocusedRouteFacts" :key="item.label" class="uranium-summary-card mini">
                          <span>{{ item.label }}</span>
                          <strong>{{ item.value }}</strong>
                        </article>
                      </div>
                      <div class="uranium-focus-trace">{{ uraniumFocusedRoute.route_trace }}</div>
                      <el-button size="small" text class="uranium-inline-btn" @click="clearUraniumRouteFocus">
                        查看全部关系
                      </el-button>
                    </div>
                                      </div>

                  <div class="entity-group">
                    <div class="uranium-block-row">
                      <div class="uranium-block-title">{{ uraniumFocusedRoute ? '关联供给方' : '年度供给方' }}</div>
                      <span class="uranium-block-tip">{{ uraniumFocusedRoute ? '仅显示当前关系对应供给方' : '按年度可供量排序' }}</span>
                    </div>
                    <div class="entity-list">
                      <article v-for="item in uraniumDisplayedSupplierEntities" :key="item.id" class="entity-row">
                        <span class="entity-dot supplier"></span>
                        <div class="entity-row-copy">
                          <strong>{{ item.name }}</strong>
                          <small>{{ item.meta }}</small>
                        </div>
                      </article>
                      <div v-if="!uraniumDisplayedSupplierEntities.length" class="uranium-empty-note">暂无供给方数据</div>
                    </div>
                  </div>

                  <div class="entity-group">
                    <div class="uranium-block-row">
                      <div class="uranium-block-title">{{ uraniumFocusedRoute ? '关联制造节点' : '年度制造节点' }}</div>
                      <span class="uranium-block-tip">{{ uraniumFocusedRoute ? '仅显示当前关系对应制造节点' : '按年度采购量排序' }}</span>
                    </div>
                    <div class="entity-list">
                      <article v-for="item in uraniumDisplayedManufacturerEntities" :key="item.id" class="entity-row">
                        <span class="entity-dot manufacturer"></span>
                        <div class="entity-row-copy">
                          <strong>{{ item.name }}</strong>
                          <small>{{ item.meta }}</small>
                        </div>
                      </article>
                      <div v-if="!uraniumDisplayedManufacturerEntities.length" class="uranium-empty-note">暂无制造节点数据</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <el-empty
            v-else
            class="interface-empty"
            description="请先在实验运行页选择一个已完成的铀供应链实验"
            :image-size="120"
          />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
defineOptions({ name: 'SystemInterface' })

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { storeToRefs } from 'pinia'
import { Loading, RefreshLeft, Place } from '@element-plus/icons-vue'
import MidStagePageHeader from './components/shared/MidStagePageHeader.vue'
import AsyncPanelPlaceholder from './components/shared/AsyncPanelPlaceholder.vue'
import UraniumFlowMap from './components/UraniumFlowMap.vue'
import {
  buildUraniumCorridorRows,
  buildUraniumHubCatalog
} from '@/assets/data/scnetReferenceData'
import {
  buildMapPayload,
  buildUraniumRouteKey,
  buildUraniumTimelineRows,
  formatUraniumMetricValue
} from '@/utils/uraniumDuringAdapter'

// ================== Stores ==================
const uraniumDemoStore = useUraniumDemoStore()
const {
  selectedExperiment: uraniumExperiment,
  selectedExperimentId: uraniumSelectedExperimentId,
  loading: uraniumLoading
} = storeToRefs(uraniumDemoStore)

// ================== 状态 ==================
const loadError = ref('')
const uraniumSelectedYearIndex = ref(0)
const uraniumFocusedRouteKey = ref('')

const URANIUM_PORT_LABELS = Object.freeze({
  LAND_NW: '西北陆路口岸',
  PORT_NORTH: '北方沿海接卸',
  PORT_EAST: '东部沿海接卸',
  PORT_SOUTH: '南方沿海接卸'
})

const URANIUM_LOCATION_LABELS = Object.freeze({
  'North China': '华北制造节点',
  'East China': '华东制造节点',
  'South China': '华南制造节点'
})

const URANIUM_CORRIDOR_ROWS = buildUraniumCorridorRows()
const URANIUM_TRANSPORT_HUB_ROWS = buildUraniumHubCatalog()

const activeSelectedExperimentId = computed(() => (
  uraniumSelectedExperimentId.value || localStorage.getItem('selectedExperimentId') || ''
))
const isUraniumMode = computed(() => Boolean(uraniumSelectedExperimentId.value || uraniumExperiment.value?.experiment_id))
const uraniumYearRows = computed(() => buildUraniumTimelineRows(uraniumExperiment.value))
const uraniumMapPayload = computed(() => buildMapPayload(uraniumExperiment.value, uraniumSelectedYearIndex.value))
const uraniumActiveYear = computed(() => (
  uraniumMapPayload.value.yearData
  || uraniumYearRows.value[uraniumSelectedYearIndex.value]
  || uraniumYearRows.value[uraniumYearRows.value.length - 1]
  || null
))
const uraniumActiveEvents = computed(() => uraniumActiveYear.value?.active_events || [])
const uraniumActiveYearLabel = computed(() => uraniumActiveYear.value?.year ? `${uraniumActiveYear.value.year} 年` : '当前年度')
const uraniumStaticCorridorId = ref('')
const uraniumRouteRows = computed(() => (
  [...(uraniumMapPayload.value.lines || [])]
    .sort((a, b) => Number(b.quantity_tU || 0) - Number(a.quantity_tU || 0))
))
const uraniumFocusedRoute = computed(() => (
  uraniumRouteRows.value.find((item) => getUraniumRouteKey(item) === uraniumFocusedRouteKey.value)
  || null
))
const uraniumCorridorRows = computed(() => URANIUM_CORRIDOR_ROWS)
const uraniumTransportHubRows = computed(() => URANIUM_TRANSPORT_HUB_ROWS)
const uraniumSelectedStaticCorridor = computed(() => (
  uraniumCorridorRows.value.find((item) => item.id === uraniumStaticCorridorId.value) || null
))
const uraniumTransportStatCards = computed(() => [
  {
    label: '陆运通道',
    value: String(uraniumCorridorRows.value.filter((item) => item.type === 'land').length)
  },
  {
    label: '海运通道',
    value: String(uraniumCorridorRows.value.filter((item) => item.type === 'sea').length)
  },
  {
    label: '多式联运',
    value: String(uraniumCorridorRows.value.filter((item) => item.type === 'multimodal').length)
  },
  {
    label: '通道枢纽',
    value: String(uraniumTransportHubRows.value.length)
  }
])
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
const uraniumActiveEventRows = computed(() => (
  uraniumActiveEvents.value.map((item, index) => {
    const label = typeof item === 'string'
      ? item
      : item?.label || item?.title || item?.name || `年度事件 ${index + 1}`
    return {
      key: `${label}-${index}`,
      label,
      type: getUraniumEventTagType(label)
    }
  })
))
const uraniumSupplierEntities = computed(() => (
  [...(uraniumActiveYear.value?.suppliers || [])]
    .sort((a, b) => Number(b.available_supply_tU || 0) - Number(a.available_supply_tU || 0))
    .map((item) => ({
      id: item.id || item.name,
      name: item.name || item.id || '未命名供给方',
      meta: `${item.country || '资源地'} · ${item.asset || item.company || '来源项目'} · 可供 ${formatUraniumMetricValue('total_supply_tU', item.available_supply_tU)}`
    }))
))
const uraniumManufacturerEntities = computed(() => (
  [...(uraniumActiveYear.value?.manufacturers || [])]
    .sort((a, b) => Number(b.procured_tU || 0) - Number(a.procured_tU || 0))
    .map((item) => ({
      id: item.id || item.name,
      name: item.name || item.id || '未命名制造节点',
      meta: `${item.group || URANIUM_LOCATION_LABELS[item.location] || item.location || '国内制造端'} · ${item.port_name || '接卸口岸'} · 采购 ${formatUraniumMetricValue('total_procured_tU', item.procured_tU)}`
    }))
))
const uraniumDisplayedSupplierEntities = computed(() => {
  if (!uraniumFocusedRoute.value) return uraniumSupplierEntities.value
  return uraniumSupplierEntities.value.filter((item) => (
    item.id === uraniumFocusedRoute.value?.supplier_id || item.name === uraniumFocusedRoute.value?.supplier_name
  ))
})
const uraniumDisplayedManufacturerEntities = computed(() => {
  if (!uraniumFocusedRoute.value) return uraniumManufacturerEntities.value
  return uraniumManufacturerEntities.value.filter((item) => (
    item.id === uraniumFocusedRoute.value?.manufacturer_id || item.name === uraniumFocusedRoute.value?.manufacturer_name
  ))
})
const uraniumFocusedRouteFacts = computed(() => {
  const route = uraniumFocusedRoute.value
  if (!route) return []
  return [
    { label: '运量', value: formatUraniumMetricValue('total_procured_tU', route.quantity_tU) },
    { label: '口岸', value: getPortLabel(route.preferred_china_port_tag) },
    { label: '来源项目', value: route.supplier_asset || route.supplier_country || '-' },
    { label: '制造端', value: route.manufacturer_group || URANIUM_LOCATION_LABELS[route.manufacturer_location] || route.manufacturer_location || '-' }
  ]
})
const headerTitle = '铀供应链推演界面'
const headerSubtitle = computed(() => (
  isUraniumMode.value
    ? `${uraniumYearRows.value.length} 个年度窗口`
    : '等待选择实验'
))

function getUraniumRouteKey(item) {
  return buildUraniumRouteKey(item)
}

function getUraniumEventTagType(label = '') {
  const text = String(label || '')
  if (/提升|压降|恢复|扩产|改善|增长|缓解|优化|增效/.test(text)) return 'success'
  if (/中断|冲突|制裁|故障|延误|下降|短缺|收紧|风险|扰动/.test(text)) return 'danger'
  if (/检修|波动|调整|切换|变化/.test(text)) return 'warning'
  return 'info'
}

function getPortLabel(portTag = '') {
  return URANIUM_PORT_LABELS[portTag] || String(portTag || '未配置口岸')
}

function clearUraniumRouteFocus() {
  uraniumFocusedRouteKey.value = ''
}

function selectStaticCorridor(corridorId = '') {
  uraniumStaticCorridorId.value = uraniumStaticCorridorId.value === corridorId ? '' : corridorId
}

const requestViewResize = () => {
  nextTick(() => {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })
  })
}

const isScenarioBusy = computed(() => !!(
  uraniumLoading.value?.experiment || uraniumLoading.value?.history || uraniumLoading.value?.statistics
))

// ================== 铀实验加载 ==================
const ensureUraniumData = async ({ force = false } = {}) => {
  await uraniumDemoStore.ensureInitialized()
  const targetExperimentId = activeSelectedExperimentId.value
  if (!targetExperimentId) return false
  if (!force && uraniumExperiment.value?.experiment_id === targetExperimentId) return true
  try {
    await uraniumDemoStore.loadExperiment(targetExperimentId)
    loadError.value = ''
    requestViewResize()
    return true
  } catch (error) {
    loadError.value = `铀实验加载失败: ${error?.message || '未知错误'}`
    return false
  }
}

const reloadUraniumExperiment = () => ensureUraniumData({ force: true }).catch(() => {})

onMounted(() => {
  ensureUraniumData().catch(() => {})
})

watch(() => uraniumExperiment.value?.experiment_id, () => {
  uraniumSelectedYearIndex.value = Math.max(0, uraniumYearRows.value.length - 1)
  uraniumFocusedRouteKey.value = ''
  uraniumStaticCorridorId.value = ''
}, { immediate: true })

watch(uraniumYearRows, (rows) => {
  if (!rows.length) {
    uraniumSelectedYearIndex.value = 0
    uraniumFocusedRouteKey.value = ''
    return
  }
  uraniumSelectedYearIndex.value = Math.min(uraniumSelectedYearIndex.value, rows.length - 1)
})

watch(uraniumRouteRows, (rows) => {
  if (!rows.length) {
    uraniumFocusedRouteKey.value = ''
    return
  }
  if (!rows.some((item) => getUraniumRouteKey(item) === uraniumFocusedRouteKey.value)) {
    uraniumFocusedRouteKey.value = ''
  }
}, { immediate: true })

watch(uraniumFocusedRouteKey, (next) => {
  if (next && uraniumStaticCorridorId.value) {
    uraniumStaticCorridorId.value = ''
  }
})

watch(uraniumStaticCorridorId, (next) => {
  if (next && uraniumFocusedRouteKey.value) {
    uraniumFocusedRouteKey.value = ''
  }
})

</script>

<style scoped>
.simulation-interface {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 6px;
  padding-bottom: 6px;
}

.error-alert {
  margin: 8px 16px 0;
  flex-shrink: 0;
}


.uranium-header-context {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border: 1px solid #dbe4f0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #64748b;
  font-size: 12px;
}

.uranium-header-context strong {
  color: #0f172a;
  font-size: 12px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 8px;
  overflow: hidden;
  min-height: 0;
}

.view-wrapper {
  width: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
}

.view-busy-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 8px 6px;
  color: #64748b;
  font-size: 12px;
}

.panel-placeholder {
  width: 100%;
  height: 100%;
  min-height: 160px;
}

/* ========== 铀供应链地图视图 ========== */
.simulation-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 6px;
}

.top-section {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(286px, 320px) minmax(0, 1fr) minmax(286px, 320px);
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

.left-panel,
.center-panel,
.right-panel,
.right-stack-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.right-panel {
  gap: 6px;
}

.right-stack-item {
  flex: 1;
}

.map-stage-row {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.uranium-route-panel,
.uranium-side-card {
  height: 100%;
  border: 1px solid #dbe4f0;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 252, 0.96));
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
  padding: 14px;
  box-sizing: border-box;
}

.uranium-route-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.uranium-side-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.uranium-panel-scroll {
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.uranium-panel-head {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.uranium-panel-title {
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: #0f172a;
}

.uranium-panel-subtitle {
  margin-top: 3px;
  line-height: 1.45;
  font-size: var(--mid-fs-label);
  color: #64748b;
}

.uranium-block-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.uranium-block-title {
  color: #334155;
  font-size: var(--mid-fs-body);
  font-weight: 700;
}

.uranium-block-tip {
  overflow: hidden;
  font-size: var(--mid-fs-micro);
  color: #94a3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entity-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.entity-stat-card {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 11px;
  background: rgba(248, 250, 252, 0.92);
}

.entity-stat-card span {
  color: #64748b;
  font-size: var(--mid-fs-label);
}

.entity-stat-card strong {
  color: #0f172a;
  font-size: var(--mid-fs-title);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.entity-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.entity-list {
  display: grid;
  gap: 6px;
}

.entity-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border: 1px solid #e8eef5;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.8);
}

.entity-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.12);
}

.entity-dot.supplier {
  background: #22c55e;
}

.entity-dot.manufacturer {
  background: #f97316;
}

.entity-row-copy {
  min-width: 0;
}

.entity-row-copy strong,
.entity-row-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entity-row-copy strong {
  color: #1e293b;
  font-size: 12px;
}

.entity-row-copy small {
  margin-top: 3px;
  color: #64748b;
  font-size: 10px;
}

.uranium-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.uranium-summary-grid.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.uranium-summary-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 9px 10px;
  border-radius: 11px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.88);
}

.uranium-summary-card span {
  font-size: 11px;
  color: #64748b;
}

.uranium-summary-card strong {
  font-size: 13px;
  color: #0f172a;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}

.uranium-info-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.uranium-route-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.uranium-route-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 11px;
  border: 1px solid #dbeafe;
  background: rgba(239, 246, 255, 0.74);
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease;
}

.uranium-route-card.active {
  border-color: #2563eb;
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.95), rgba(255, 255, 255, 0.95));
}

.uranium-route-top,
.uranium-route-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.uranium-route-top strong {
  min-width: 0;
  overflow: hidden;
  color: #0f172a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uranium-route-top span,
.uranium-route-meta span {
  flex-shrink: 0;
  color: #64748b;
}

.uranium-route-name {
  color: #334155;
  font-size: 11px;
  line-height: 1.45;
}

.uranium-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.uranium-fact-list {
  display: grid;
  gap: 8px;
}

.uranium-fact-card,
.uranium-focus-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.86);
}

.uranium-focus-card.corridor {
  border-color: #dbeafe;
  background: rgba(239, 246, 255, 0.72);
}

.uranium-focus-card.runtime {
  border-color: #e2e8f0;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 0.94));
}

.uranium-focus-top,
.uranium-focus-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.uranium-focus-top strong {
  min-width: 0;
  overflow: hidden;
  color: #0f172a;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uranium-focus-top span,
.uranium-focus-meta span {
  color: #64748b;
  font-size: 11px;
}

.uranium-focus-name {
  color: #334155;
  font-size: 12px;
  line-height: 1.45;
}

.uranium-focus-trace {
  color: #475569;
  font-size: 11px;
  line-height: 1.5;
}

.uranium-focus-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.uranium-summary-card.mini {
  padding: 8px 9px;
}

.uranium-summary-card.mini strong {
  font-size: 12px;
}

.uranium-inline-btn {
  align-self: flex-start;
  padding-inline: 0;
  color: #2563eb;
}

.process-section {
  padding-top: 2px;
}













.uranium-empty-note {
  color: #94a3b8;
  font-size: 12px;
}


/* ========== 响应式：窄屏收窄侧栏，避免中间地图被挤裁切 ========== */
@media (max-width: 1280px) {
  .top-section { grid-template-columns: 246px minmax(0, 1fr) 268px; gap: 6px; }
}

@media (max-width: 992px) {
  .top-section { grid-template-columns: 214px minmax(0, 1fr) 234px; gap: 5px; }
  .uranium-summary-grid,
  .uranium-summary-grid.compact,
  .uranium-focus-metric-grid { grid-template-columns: 1fr; }
}
</style>
