<template>
  <div class="uranium-flow-map">
    <div class="map-toolbar">
      <div class="toolbar-left">
        <div class="toolbar-title">全球运输链路地图</div>
        <div class="toolbar-subtitle">
          {{ activeYearLabel }}
          <span v-if="yearRows.length > 1"> · {{ yearIndex + 1 }}/{{ yearRows.length }}</span>
        </div>
        <div v-if="selectedRouteSummary" class="toolbar-focus">
          <span class="focus-pill">本年调运</span>
          <strong>{{ selectedRouteSummary.supplier_name }} → {{ selectedRouteSummary.manufacturer_name }}</strong>
          <span>{{ selectedRouteSummary.route_label }} · {{ formatPortLabel(selectedRouteSummary.preferred_china_port_tag) }}</span>
        </div>
        <div v-else-if="selectedCorridorSummary" class="toolbar-focus">
          <span class="focus-pill corridor">{{ corridorTypeLabel(selectedCorridorSummary.type) }}通道</span>
          <strong>{{ selectedCorridorSummary.shortName }}</strong>
          <span>{{ selectedCorridorSummary.name }}</span>
        </div>
      </div>

      <div class="toolbar-right">
        <div class="layer-group">
          <span class="layer-group-label">实验数据</span>
          <el-button-group size="small">
            <el-button :type="showRoutes ? 'primary' : ''" @click="showRoutes = !showRoutes">本年调运</el-button>
            <el-button :type="showSuppliers ? 'primary' : ''" @click="showSuppliers = !showSuppliers">供给方</el-button>
            <el-button :type="showManufacturers ? 'primary' : ''" @click="showManufacturers = !showManufacturers">制造方</el-button>
            <el-button :type="showHubs ? 'primary' : ''" @click="showHubs = !showHubs">途经枢纽</el-button>
          </el-button-group>
        </div>
        <div class="layer-group reference-layer-group">
          <span class="layer-group-label">参考底图</span>
          <el-button-group size="small">
            <el-button :type="showReferenceLand ? 'primary' : ''" @click="showReferenceLand = !showReferenceLand">陆运</el-button>
            <el-button :type="showReferenceSea ? 'primary' : ''" @click="showReferenceSea = !showReferenceSea">海运</el-button>
            <el-button :type="showReferenceMultimodal ? 'primary' : ''" @click="showReferenceMultimodal = !showReferenceMultimodal">联运</el-button>
          </el-button-group>
        </div>
      </div>
    </div>

    <div class="map-stage">
      <div ref="chartRef" class="map-canvas"></div>
      <div v-if="loading" class="map-loading">
        <el-icon class="is-loading" :size="34"><Loading /></el-icon>
        <span>地图加载中...</span>
      </div>
    </div>

    <div class="map-bottom-dock">
      <div v-if="yearRows.length > 1" class="year-slider">
        <div class="timeline-heading">
          <span>年度推演</span>
          <strong>{{ activeYearLabel }}</strong>
        </div>
        <el-slider v-model="yearIndex" :min="0" :max="yearRows.length - 1" :marks="yearMarks" />
      </div>

      <div class="legend-panel">
        <div class="panel-title">图例</div>
        <div class="legend-list">
          <template v-if="hasRiskLevels">
            <span class="legend-item"><span class="legend-dot risk-high"></span>高风险链路</span>
            <span class="legend-item"><span class="legend-dot risk-medium"></span>中风险链路</span>
            <span class="legend-item"><span class="legend-dot risk-low"></span>低风险链路</span>
          </template>
          <span class="legend-item"><span class="legend-dot supplier"></span>供给方</span>
          <span class="legend-item"><span class="legend-dot manufacturer"></span>制造方</span>
          <span class="legend-item"><span class="legend-dot hub"></span>枢纽 / 口岸</span>
          <span class="legend-item"><span class="legend-line land"></span>陆运</span>
          <span class="legend-item"><span class="legend-line sea"></span>海运</span>
          <span class="legend-item"><span class="legend-line multimodal"></span>多式联运</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LinesChart, ScatterChart } from 'echarts/charts'
import { GeoComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Loading } from '@element-plus/icons-vue'
import { ensureEchartsWorldMap } from '@/utils/ensureEchartsWorldMap'
import {
  URANIUM_TRANSPORT_CORRIDORS,
  URANIUM_CORRIDOR_TYPE_LABELS,
  buildUraniumHubCatalog,
  buildUraniumEnterprisePortRows
} from '@/assets/data/scnetReferenceData'
import {
  buildMapPayload,
  buildUraniumRouteKey,
  buildUraniumTimelineRows,
  formatUraniumMetricValue,
  getYearMarks
} from '@/utils/uraniumDuringAdapter'

const props = defineProps({
  experiment: {
    type: Object,
    default: null
  },
  yearIndex: {
    type: Number,
    default: null
  },
  selectedRouteKey: {
    type: String,
    default: ''
  },
  selectedStaticCorridorId: {
    type: String,
    default: ''
  },
  timelineRows: {
    type: Array,
    default: null
  },
  payload: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:yearIndex', 'update:selectedRouteKey', 'update:selectedStaticCorridorId'])

const PORT_LABELS = Object.freeze({
  LAND_NW: '西北陆路口岸',
  PORT_NORTH: '北方沿海接卸',
  PORT_EAST: '东部沿海接卸',
  PORT_SOUTH: '南方沿海接卸'
})

const ROUTE_TYPE_LABELS = Object.freeze({
  land_route: '陆路通道',
  sea_route: '海运通道',
  inland_plus_sea: '内陆联运 + 海运'
})

const REFERENCE_HUB_ROWS = buildUraniumHubCatalog()
const REFERENCE_PORT_ROWS = buildUraniumEnterprisePortRows()

/** 通道图层：陆运 / 海运 / 多式联运，与 URANIUM_TRANSPORT_CORRIDORS.type 对应 */
const CORRIDOR_LAYERS = Object.freeze([
  { type: 'land', name: '陆运通道' },
  { type: 'sea', name: '海运通道' },
  { type: 'multimodal', name: '多式联运' }
])
const CORRIDOR_SERIES_NAMES = CORRIDOR_LAYERS.map((item) => item.name)

/** 实验数据图层名：series.name 与工具栏按钮、tooltip 判断共用同一份常量 */
const SERIES_ROUTE = '本年调运'
const SERIES_RUNTIME_HUB = '途经枢纽'

echarts.use([
  LinesChart,
  ScatterChart,
  GeoComponent,
  TooltipComponent,
  CanvasRenderer
])

const chartRef = ref(null)
const loading = ref(true)
const localYearIndex = ref(0)
const showRoutes = ref(true)
const showHubs = ref(true)
const showSuppliers = ref(true)
const showManufacturers = ref(true)
const showReferenceLand = ref(true)
const showReferenceSea = ref(true)
const showReferenceMultimodal = ref(true)
const showReferenceHubs = ref(true)
const showEnterprisePorts = ref(true)
const localStaticCorridorId = ref('')

const corridorLayerVisible = (type) => {
  if (type === 'land') return showReferenceLand.value
  if (type === 'sea') return showReferenceSea.value
  if (type === 'multimodal') return showReferenceMultimodal.value
  return false
}

let chart = null
let resizeFrame = null
let renderFrame = null
let resizeObserver = null

const yearIndex = computed({
  get() {
    return Number.isInteger(props.yearIndex) ? props.yearIndex : localYearIndex.value
  },
  set(value) {
    const next = Math.max(0, Number(value) || 0)
    localYearIndex.value = next
    emit('update:yearIndex', next)
  }
})

const yearRows = computed(() => (
  Array.isArray(props.timelineRows)
    ? props.timelineRows
    : buildUraniumTimelineRows(props.experiment)
))
const activeYear = computed(() => yearRows.value[yearIndex.value] || null)
const selectedStaticCorridorId = computed({
  get() {
    return String(props.selectedStaticCorridorId || localStaticCorridorId.value || '').trim()
  },
  set(value) {
    const next = String(value || '').trim()
    localStaticCorridorId.value = next
    emit('update:selectedStaticCorridorId', next)
  }
})
const mapPayload = computed(() => (
  props.payload && typeof props.payload === 'object'
    ? props.payload
    : buildMapPayload(props.experiment, yearIndex.value)
))
const visibleCorridorRows = computed(() => (
  URANIUM_TRANSPORT_CORRIDORS.filter((item) => corridorLayerVisible(item.type))
))
const visibleReferenceHubRows = computed(() => (
  REFERENCE_HUB_ROWS.filter((item) => item.modes.some((mode) => corridorLayerVisible(mode)))
))
const visibleEnterprisePortRows = computed(() => (
  REFERENCE_PORT_ROWS.filter((item) => (
    Number.isFinite(item?.coordinates?.longitude) && Number.isFinite(item?.coordinates?.latitude)
  ))
))
const yearMarks = computed(() => getYearMarks(yearRows.value))
const activeYearLabel = computed(() => activeYear.value?.year ? `${activeYear.value.year} 年` : '未选择年份')
const activeRouteKey = computed(() => String(props.selectedRouteKey || '').trim())
// 链路是否带风险分档（铀态势快照链路带 risk_level，演示库实验链路不带）
const hasRiskLevels = computed(() => (mapPayload.value.lines || []).some((item) => item.risk_level))
const renderKey = computed(() => {
  const payload = mapPayload.value
  const lineQuantity = (payload.lines || []).reduce((sum, item) => sum + Number(item.quantity_tU || 0), 0)
  return [
    props.experiment?.experiment_id || '',
    payload.yearData?.year || '',
    payload.lines?.length || 0,
    payload.supplierNodes?.length || 0,
    payload.manufacturerNodes?.length || 0,
    lineQuantity.toFixed(3),
    activeRouteKey.value,
    showRoutes.value ? 1 : 0,
    showHubs.value ? 1 : 0,
    showSuppliers.value ? 1 : 0,
    showManufacturers.value ? 1 : 0,
    showReferenceLand.value ? 1 : 0,
    showReferenceSea.value ? 1 : 0,
    showReferenceMultimodal.value ? 1 : 0,
    showReferenceHubs.value ? 1 : 0,
    showEnterprisePorts.value ? 1 : 0,
    selectedStaticCorridorId.value
  ].join('|')
})
const selectedRouteSummary = computed(() => {
  const routes = mapPayload.value.lines || []
  if (!routes.length) return null
  if (!activeRouteKey.value) return null
  return routes.find((item) => (item.route_key || buildUraniumRouteKey(item)) === activeRouteKey.value) || null
})
const selectedCorridorSummary = computed(() => (
  URANIUM_TRANSPORT_CORRIDORS.find((item) => item.id === selectedStaticCorridorId.value) || null
))
const isRouteFocusMode = computed(() => Boolean(activeRouteKey.value))
const isCorridorFocusMode = computed(() => Boolean(selectedStaticCorridorId.value))
const focusedRouteRows = computed(() => (
  isRouteFocusMode.value
    ? (mapPayload.value.lines || []).filter((item) => (item.route_key || buildUraniumRouteKey(item)) === activeRouteKey.value)
    : []
))
const focusedSupplierNodes = computed(() => {
  if (!isRouteFocusMode.value) return []
  const supplierIds = new Set(focusedRouteRows.value.map((item) => item.supplier_id).filter(Boolean))
  const supplierNames = new Set(focusedRouteRows.value.map((item) => item.supplier_name).filter(Boolean))
  return (mapPayload.value.supplierNodes || []).filter((item) => supplierIds.has(item.id) || supplierNames.has(item.name))
})
const focusedManufacturerNodes = computed(() => {
  if (!isRouteFocusMode.value) return []
  const manufacturerIds = new Set(focusedRouteRows.value.map((item) => item.manufacturer_id).filter(Boolean))
  const manufacturerNames = new Set(focusedRouteRows.value.map((item) => item.manufacturer_name).filter(Boolean))
  return (mapPayload.value.manufacturerNodes || []).filter((item) => manufacturerIds.has(item.id) || manufacturerNames.has(item.name))
})
const focusedHubNodes = computed(() => {
  if (!isRouteFocusMode.value) return []
  return (mapPayload.value.hubNodes || []).filter((item) => item.routeKeys?.includes(activeRouteKey.value))
})
const highlightedSupplierId = computed(() => selectedRouteSummary.value?.supplier_id || '')
const highlightedManufacturerId = computed(() => selectedRouteSummary.value?.manufacturer_id || '')

function formatPortLabel(portTag = '') {
  return PORT_LABELS[portTag] || String(portTag || '未配置口岸')
}

function formatRouteType(routeType = '') {
  return ROUTE_TYPE_LABELS[routeType] || String(routeType || '运输通道')
}

function corridorTypeLabel(type = '') {
  return URANIUM_CORRIDOR_TYPE_LABELS[type] || '运输'
}

function buildRouteLineStyle(item) {
  const base = item.lineStyle || {}
  return {
    ...base,
    width: Math.min(2.8, Number(base.width || 1.8) + (isRouteFocusMode.value ? 0.7 : 0)),
    opacity: isRouteFocusMode.value ? 0.92 : 0.68
  }
}

function buildSupplierNode(item) {
  const isActive = item.id && item.id === highlightedSupplierId.value
  const defaultSize = Math.max(10, Math.min(22, 10 + Number(item.available_supply_tU || 0) / 420))
  return {
    name: item.name,
    value: [...item.coord, Number(item.available_supply_tU || 0)],
    raw: item,
    symbolSize: isActive ? defaultSize + 6 : defaultSize,
    forceLabel: isActive || !activeRouteKey.value
  }
}

function buildManufacturerNode(item) {
  const isActive = item.id && item.id === highlightedManufacturerId.value
  const size = Math.max(10, Math.min(24, 10 + Number(item.procured_tU || 0) / 350))
  return {
    name: item.name,
    value: [...item.coord, Number(item.procured_tU || 0)],
    raw: item,
    symbolSize: isActive ? size + 5 : size,
    forceLabel: isActive || !activeRouteKey.value
  }
}

function buildHubNode(item) {
  const isActive = !activeRouteKey.value || item.routeKeys?.includes(activeRouteKey.value)
  const isCritical = item.kind === 'chokepoint' || item.kind === 'land_port' || item.kind === 'port'
  return {
    name: item.name,
    value: item.coord,
    raw: item,
    symbolSize: isCritical ? 15 : Math.min(13, 9 + Number(item.routeCount || 0)),
    itemStyle: {
      color: item.color,
      borderColor: '#ffffff',
      borderWidth: 1.2,
      opacity: isActive ? 0.96 : 0.28,
      shadowBlur: isActive ? 12 : 0,
      shadowColor: isActive ? `${item.color}55` : 'transparent'
    },
    forceLabel: isCritical || Number(item.routeCount || 0) > 1 || (Boolean(activeRouteKey.value) && isActive)
  }
}

function buildReferenceCorridorNodeStyle(route) {
  const active = !selectedStaticCorridorId.value || route.id === selectedStaticCorridorId.value
  // 陆运画实线（铁路/公路），海运画虚线（航段），多式联运画点划线（换装衔接）
  const dashType = route.type === 'land' ? 'solid' : (route.type === 'sea' ? 'dashed' : 'dotted')
  const baseWidth = route.type === 'land' ? 2.1 : 1.7
  return {
    color: route.color,
    width: active ? baseWidth : Math.max(1, baseWidth - 0.5),
    opacity: active ? 0.58 : 0.14,
    type: dashType
  }
}

function buildReferenceCorridorSeries(type) {
  if (!corridorLayerVisible(type)) return []
  return URANIUM_TRANSPORT_CORRIDORS
    .filter((item) => item.type === type)
    .filter((item) => !selectedStaticCorridorId.value || item.id === selectedStaticCorridorId.value)
    .map((item) => ({
      coords: item.waypoints.map((point) => [point.lng, point.lat]),
      lineStyle: buildReferenceCorridorNodeStyle(item),
      corridorId: item.id,
      corridorType: item.type,
      corridorTypeLabel: URANIUM_CORRIDOR_TYPE_LABELS[item.type] || '通道',
      corridorName: item.name,
      corridorShortName: item.shortName,
      operator: item.operator,
      product: item.product,
      capacityLabel: item.capacityLabel,
      riskLabel: item.riskLabel,
      summary: item.summary
    }))
}

function buildReferenceHubNode(item) {
  const active = !selectedStaticCorridorId.value || item.corridors.some((corridor) => corridor.id === selectedStaticCorridorId.value)
  const isCritical = ['海峡', '陆路口岸', '转化厂', '浓缩厂'].includes(item.label)
  return {
    name: item.name,
    value: item.value,
    raw: item,
    symbolSize: isCritical ? 14 : Math.min(13, 8 + Number(item.corridorCount || 0)),
    itemStyle: {
      color: item.color,
      borderColor: '#ffffff',
      borderWidth: 1,
      opacity: active ? 0.94 : 0.24,
      shadowBlur: active ? 10 : 0,
      shadowColor: active ? `${item.color}55` : 'transparent'
    },
    forceLabel: isCritical || Number(item.corridorCount || 0) > 1 || (Boolean(selectedStaticCorridorId.value) && active)
  }
}

function buildEnterprisePortNode(item) {
  const count = Number(item.enterpriseCount || 0)
  return {
    name: item.port,
    value: [item.coordinates.longitude, item.coordinates.latitude, count],
    raw: item,
    symbolSize: Math.min(14, 7 + count),
    forceLabel: count >= 3,
    itemStyle: {
      color: '#0ea5e9',
      borderColor: '#ffffff',
      borderWidth: 1.1,
      opacity: 0.84,
      shadowBlur: 10,
      shadowColor: 'rgba(14, 165, 233, 0.22)'
    }
  }
}

function buildOption() {
  const payload = mapPayload.value
  const supplierData = showSuppliers.value && !isCorridorFocusMode.value
    ? (isRouteFocusMode.value ? focusedSupplierNodes.value : payload.supplierNodes)
    : []
  const manufacturerData = showManufacturers.value && !isCorridorFocusMode.value
    ? (isRouteFocusMode.value ? focusedManufacturerNodes.value : payload.manufacturerNodes)
    : []
  const lineData = showRoutes.value && !isCorridorFocusMode.value
    ? (isRouteFocusMode.value ? focusedRouteRows.value : payload.lines)
    : []
  const hubData = showHubs.value && !isCorridorFocusMode.value
    ? (isRouteFocusMode.value ? focusedHubNodes.value : payload.hubNodes || [])
    : []
  const corridorSeriesData = CORRIDOR_LAYERS.map((layer) => ({
    ...layer,
    data: isRouteFocusMode.value ? [] : buildReferenceCorridorSeries(layer.type)
  }))
  const referenceHubData = showReferenceHubs.value && !isRouteFocusMode.value
    ? visibleReferenceHubRows.value.filter((item) => (
      !selectedStaticCorridorId.value || item.corridors.some((corridor) => corridor.id === selectedStaticCorridorId.value)
    ))
    : []
  const enterprisePortData = showEnterprisePorts.value && !isRouteFocusMode.value && !isCorridorFocusMode.value
    ? visibleEnterprisePortRows.value
    : []

  return {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#dbe4f0',
      borderWidth: 1,
      textStyle: { color: '#334155' },
      formatter(params) {
        if (params.seriesName === SERIES_ROUTE) {
          return [
            `<b>${params.data?.supplier_name || '-'} → ${params.data?.manufacturer_name || '-'}</b>`,
            `数量：${formatUraniumMetricValue('total_procured_tU', params.data?.quantity_tU)}`,
            `通道：${params.data?.route_label || '-'}`,
            params.data?.risk_label ? `风险：${params.data.risk_label}（${params.data.risk_score}）` : '',
            params.data?.supply_share ? `供应份额：${params.data.supply_share}%` : '',
            `港口：${formatPortLabel(params.data?.preferred_china_port_tag)}`,
            params.data?.supplier_asset ? `来源：${params.data.supplier_asset}` : '',
            `链路：${params.data?.route_trace || '-'}`
          ].filter(Boolean).join('<br/>')
        }
        if (CORRIDOR_SERIES_NAMES.includes(params.seriesName)) {
          return [
            `<b>${params.data?.corridorShortName || ''}｜${params.data?.corridorName || ''}</b>`,
            `运输方式：${params.data?.corridorTypeLabel || '-'}`,
            `运输品类：${params.data?.product || '-'}`,
            `运营主体：${params.data?.operator || '-'}`,
            `运力属性：${params.data?.capacityLabel || '-'}`,
            `风险提示：${params.data?.riskLabel || '-'}`
          ].join('<br/>')
        }
        if (params.seriesName === '通道枢纽') {
          const item = params.data?.raw || {}
          return [
            `<b>${item.name || params.name}</b>`,
            `${item.label || '通道节点'}${item.country ? ` · ${item.country}` : ''}`,
            item.detail || '',
            `关联通道：${(item.corridors || []).map((corridor) => corridor.shortName).join('，') || '-'}`
          ].filter(Boolean).join('<br/>')
        }
        if (params.seriesName === '企业港口') {
          const item = params.data?.raw || {}
          return [
            `<b>${item.port || params.name}</b>`,
            `${item.city || ''}${item.countries?.length ? ` · ${item.countries.join('，')}` : ''}`,
            `企业数：${item.enterpriseCount || 0}`,
            `类型：${item.enterpriseTypes?.join('，') || '-'}`
          ].filter(Boolean).join('<br/>')
        }
        if (params.seriesName === SERIES_RUNTIME_HUB) {
          const item = params.data?.raw || {}
          return [
            `<b>${item.name || params.name}</b>`,
            `${item.kindLabel || '运输节点'} · 关联 ${item.routeCount || 0} 条链路`,
            `通道类型：${(item.routeTypes || []).map((type) => formatRouteType(type)).join('，') || '-'}`
          ].join('<br/>')
        }
        if (params.seriesName === '供给方') {
          const item = params.data?.raw || {}
          return [
            `<b>${item.name || params.name}</b>`,
            item.asset
              ? `${item.company || item.country || '-'} · ${item.asset} · ${formatRouteType(item.route_type)}`
              : `${item.country || '-'} · ${formatRouteType(item.route_type)}`,
            `可供：${formatUraniumMetricValue('total_supply_tU', item.available_supply_tU)}`,
            `风险：${formatUraniumMetricValue('avg_risk_exposure', item.risk_exposure)}`
          ].join('<br/>')
        }
        if (params.seriesName === '制造方') {
          const item = params.data?.raw || {}
          return [
            `<b>${item.name || params.name}</b>`,
            `${item.group || item.location || '-'} · ${item.port_name || item.port_tag || '-'}`,
            `采购：${formatUraniumMetricValue('total_procured_tU', item.procured_tU)}`,
            `库存覆盖：${formatUraniumMetricValue('inventory_coverage_years', item.inventory_years)}`
          ].join('<br/>')
        }
        return params.name || '-'
      }
    },
    geo: {
      map: 'world',
      roam: false,
      left: 16,
      right: 16,
      top: 14,
      bottom: 14,
      itemStyle: {
        areaColor: '#dbeaf8',
        borderColor: 'rgba(100, 116, 139, 0.32)',
        borderWidth: 0.8
      },
      emphasis: {
        itemStyle: {
          areaColor: '#bfdbfe'
        },
        label: { show: false }
      }
    },
    series: [
      ...corridorSeriesData.map((layer) => ({
        name: layer.name,
        type: 'lines',
        coordinateSystem: 'geo',
        z: 1,
        polyline: true,
        silent: false,
        symbol: ['none', 'none'],
        data: layer.data
      })),
      {
        name: SERIES_ROUTE,
        type: 'lines',
        coordinateSystem: 'geo',
        z: 2,
        polyline: true,
        symbol: ['none', 'arrow'],
        symbolSize: 7,
        lineStyle: {
          width: 1.8,
          opacity: 0.68
        },
        data: lineData.map((item) => ({
          coords: item.coords,
          lineStyle: buildRouteLineStyle(item),
          supplier_name: item.supplier_name || item.supplier_id,
          supplier_asset: item.supplier_asset || '',
          manufacturer_name: item.manufacturer_name || item.manufacturer_id,
          manufacturer_group: item.manufacturer_group || '',
          quantity_tU: item.quantity_tU,
          route_label: item.route_label,
          preferred_china_port_tag: item.preferred_china_port_tag,
          route_trace: item.route_trace,
          risk_label: item.risk_label || '',
          risk_score: item.risk_score ?? '',
          supply_share: item.supply_share ?? '',
          routeKey: item.route_key || buildUraniumRouteKey(item)
        }))
      },
      {
        name: '通道枢纽',
        type: 'scatter',
        coordinateSystem: 'geo',
        z: 2.5,
        symbolSize: (_value, params) => params?.data?.symbolSize || 10,
        label: {
          show: Boolean(selectedStaticCorridorId.value),
          position: 'right',
          formatter: ({ data }) => {
            if (selectedStaticCorridorId.value) {
              return data?.raw?.corridors?.some((item) => item.id === selectedStaticCorridorId.value) ? data.name : ''
            }
            return data?.forceLabel ? data.name : ''
          },
          color: '#475569',
          fontSize: 10,
          backgroundColor: 'rgba(255,255,255,0.72)',
          borderRadius: 999,
          padding: [2, 6]
        },
        emphasis: { label: { show: true } },
        data: referenceHubData.map((item) => buildReferenceHubNode(item))
      },
      {
        name: SERIES_RUNTIME_HUB,
        type: 'scatter',
        coordinateSystem: 'geo',
        z: 3,
        symbolSize: (_value, params) => params?.data?.symbolSize || 10,
        label: {
          show: Boolean(activeRouteKey.value),
          position: 'right',
          formatter: ({ data }) => {
            if (activeRouteKey.value) return data?.raw?.routeKeys?.includes(activeRouteKey.value) ? data.name : ''
            return data?.forceLabel ? data.name : ''
          },
          color: '#334155',
          fontSize: 10,
          padding: [2, 6],
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.76)'
        },
        emphasis: { label: { show: true } },
        data: hubData.map((item) => buildHubNode(item))
      },
      {
        name: '企业港口',
        type: 'scatter',
        coordinateSystem: 'geo',
        z: 3.5,
        symbolSize: (_value, params) => params?.data?.symbolSize || 10,
        label: {
          show: false,
          position: 'right',
          formatter: ({ data }) => data?.forceLabel ? data.name : '',
          color: '#0369a1',
          fontSize: 10,
          backgroundColor: 'rgba(255,255,255,0.76)',
          borderRadius: 999,
          padding: [2, 6]
        },
        emphasis: { label: { show: true } },
        data: enterprisePortData.map((item) => buildEnterprisePortNode(item))
      },
      {
        name: '供给方',
        type: 'scatter',
        coordinateSystem: 'geo',
        z: 4,
        label: {
          show: Boolean(activeRouteKey.value),
          position: 'right',
          formatter: ({ data }) => {
            if (activeRouteKey.value) return data?.forceLabel ? data.name : ''
            return data?.forceLabel || data?.value?.[2] > 2000 ? data.name : ''
          },
          color: '#14532d',
          fontSize: 10,
          backgroundColor: 'rgba(255,255,255,0.72)',
          borderRadius: 999,
          padding: [2, 6]
        },
        emphasis: { label: { show: true } },
        symbolSize: (_value, params) => params?.data?.symbolSize || 12,
        itemStyle: {
          color: '#22c55e',
          shadowBlur: 8,
          shadowColor: 'rgba(34, 197, 94, 0.28)'
        },
        data: supplierData.map((item) => buildSupplierNode(item))
      },
      {
        name: '制造方',
        type: 'scatter',
        coordinateSystem: 'geo',
        z: 5,
        symbolSize: (_value, params) => params?.data?.symbolSize || 12,
        label: {
          show: Boolean(activeRouteKey.value),
          position: 'right',
          formatter: ({ data }) => {
            if (activeRouteKey.value) return data?.forceLabel ? data.name : ''
            return data?.name || ''
          },
          color: '#9a3412',
          fontSize: 10
        },
        emphasis: { label: { show: true } },
        itemStyle: {
          color: '#f97316',
          borderColor: '#fff7ed',
          borderWidth: 1.5,
          shadowBlur: 8,
          shadowColor: 'rgba(249, 115, 22, 0.26)'
        },
        data: manufacturerData.map((item) => buildManufacturerNode(item))
      }
    ]
  }
}

function bindChartEvents() {
  if (!chart) return
  chart.off('click')
  chart.on('click', (params) => {
    if (CORRIDOR_SERIES_NAMES.includes(params?.seriesName) && params?.data?.corridorId) {
      selectedStaticCorridorId.value = selectedStaticCorridorId.value === params.data.corridorId ? '' : params.data.corridorId
      return
    }
    if (params?.seriesName === '通道枢纽' && params?.data?.raw?.corridors?.length) {
      const nextCorridorId = params.data.raw.corridors[0]?.id || ''
      selectedStaticCorridorId.value = selectedStaticCorridorId.value === nextCorridorId ? '' : nextCorridorId
      return
    }
    if (params?.seriesName === SERIES_ROUTE && params?.data?.routeKey) {
      emit('update:selectedRouteKey', activeRouteKey.value === params.data.routeKey ? '' : params.data.routeKey)
      return
    }
    if (params?.seriesName === SERIES_RUNTIME_HUB && params?.data?.raw?.routeKeys?.length) {
      const nextRouteKey = params.data.raw.routeKeys[0]
      emit('update:selectedRouteKey', activeRouteKey.value === nextRouteKey ? '' : nextRouteKey)
    }
  })
}

async function renderChart() {
  if (!chartRef.value) return
  const isInitialRender = !chart
  if (isInitialRender) loading.value = true
  try {
    await ensureEchartsWorldMap(echarts)
    if (!chart) {
      chart = echarts.init(chartRef.value, null, {
        renderer: 'canvas',
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.25)
      })
    }
    chart.setOption(buildOption(), {
      notMerge: false,
      replaceMerge: ['series'],
      lazyUpdate: true
    })
    bindChartEvents()
  } finally {
    if (isInitialRender) loading.value = false
  }
}

function scheduleRender() {
  if (renderFrame !== null) cancelAnimationFrame(renderFrame)
  renderFrame = requestAnimationFrame(() => {
    renderFrame = null
    renderChart()
  })
}

function resizeChart() {
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null
    chart?.resize()
  })
}

watch(yearRows, (rows) => {
  if (!rows.length) {
    yearIndex.value = 0
    return
  }
  yearIndex.value = Math.min(yearIndex.value, rows.length - 1)
})

watch(visibleCorridorRows, (rows) => {
  if (selectedStaticCorridorId.value && !rows.some((item) => item.id === selectedStaticCorridorId.value)) {
    selectedStaticCorridorId.value = ''
  }
})

watch(renderKey, () => {
  nextTick(scheduleRender)
})

onMounted(() => {
  scheduleRender()
  window.addEventListener('resize', resizeChart)
  if (typeof ResizeObserver !== 'undefined' && chartRef.value) {
    resizeObserver = new ResizeObserver(resizeChart)
    resizeObserver.observe(chartRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  resizeObserver?.disconnect()
  resizeObserver = null
  if (renderFrame !== null) {
    cancelAnimationFrame(renderFrame)
    renderFrame = null
  }
  if (resizeFrame !== null) {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = null
  }
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<style scoped>
.uranium-flow-map {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  border: 1px solid #dbe4f0;
  border-radius: 16px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 10%, rgba(56, 189, 248, 0.16), transparent 24%),
    radial-gradient(circle at 82% 12%, rgba(251, 191, 36, 0.14), transparent 22%),
    linear-gradient(180deg, #fbfdff 0%, #edf5fb 100%);
}

.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  box-sizing: border-box;
  border-bottom: 1px solid rgba(219, 228, 240, 0.95);
  background: rgba(255, 255, 255, 0.9);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-left {
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
}

.toolbar-right {
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.toolbar-title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.toolbar-subtitle {
  margin-top: 3px;
  font-size: 12px;
  color: #64748b;
}

.toolbar-focus {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 7px;
  font-size: 12px;
  color: #334155;
}

.toolbar-focus strong {
  max-width: min(360px, 42vw);
  overflow: hidden;
  color: #0f172a;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.layer-group-label {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.focus-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
}

.focus-pill.corridor {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
}

.map-stage {
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.map-canvas {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.map-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #475569;
  background: rgba(255, 255, 255, 0.66);
}

.map-bottom-dock {
  min-height: 0;
  border-top: 1px solid rgba(219, 228, 240, 0.9);
  background: rgba(248, 250, 252, 0.94);
}

.year-slider {
  padding: 8px 16px 2px;
}

.timeline-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: -2px;
  color: #64748b;
  font-size: 11px;
}

.timeline-heading strong {
  color: #1e293b;
  font-size: 11px;
}

.year-slider :deep(.el-slider) {
  --el-slider-main-bg-color: #2563eb;
  --el-slider-runway-bg-color: #dbe4f0;
  --el-slider-stop-bg-color: #94a3b8;
  margin-top: 4px;
  margin-bottom: 9px;
}

.year-slider :deep(.el-slider__marks-text) {
  margin-top: 8px;
  color: #64748b;
  font-size: 10px;
  white-space: nowrap;
}

.legend-panel {
  margin: 8px 12px 12px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 0;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
}

.panel-title {
  margin: 0;
  padding-right: 10px;
  border-right: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
}

.legend-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}

.legend-item {
  color: #64748b;
  font-size: 11px;
}

.legend-dot,
.legend-line {
  display: inline-block;
  vertical-align: middle;
  margin-right: 6px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-dot.supplier {
  background: #22c55e;
}

.legend-dot.manufacturer {
  background: #f97316;
}

.legend-dot.hub {
  background: #0ea5e9;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.18);
}

/* 链路风险分档（铀态势快照） */
.legend-dot.risk-high { background: #dc2626; }
.legend-dot.risk-medium { background: #f59e0b; }
.legend-dot.risk-low { background: #16a34a; }

.legend-line {
  width: 18px;
  height: 0;
  border-top-width: 2px;
  border-top-style: solid;
}

.legend-line.land {
  border-top-color: #f59e0b;
  border-top-style: solid;
}

.legend-line.sea {
  border-top-color: #2563eb;
  border-top-style: dashed;
}

.legend-line.multimodal {
  border-top-color: #7c3aed;
  border-top-style: dotted;
  border-top-width: 3px;
}

@media (max-width: 1080px) {
  .map-toolbar,
  .toolbar-left {
    flex-wrap: wrap;
  }

  .toolbar-focus {
    max-width: 420px;
  }
}

@media (max-width: 760px) {
  .map-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .legend-panel {
    grid-template-columns: 1fr;
  }

  .panel-title {
    padding: 0;
    border-right: 0;
  }
}
</style>
