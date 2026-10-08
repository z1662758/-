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

    <!-- 主内容区 -->
    <div class="main-content">
      <div v-if="isScenarioBusy" class="view-busy-hint">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在准备铀场景实验数据...</span>
      </div>

      <div class="view-wrapper">
        <div class="simulation-view">
          <section v-if="isUraniumMode" class="simulation-overview" aria-label="年度推演概况">
            <article v-for="item in simulationOverviewCards" :key="item.label" class="simulation-overview-card" :title="item.hint">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>

            </article>
            <el-button size="small" text :loading="isScenarioBusy" @click="reloadUraniumExperiment" aria-label="刷新实验"><el-icon><RefreshLeft /></el-icon>刷新</el-button>
          </section>

          <div v-if="isUraniumMode" class="top-section">
            <div class="left-panel">
              <div class="uranium-route-panel uranium-panel-scroll">
                <MidStagePanelHeader title="运输通道" description="选择通道查看线路与供应范围" />

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
                    <button
                      type="button"
                      :aria-pressed="item.id === uraniumStaticCorridorId"
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
                      <div class="uranium-route-name" :title="item.name">{{ item.name }}</div>
                      <div class="uranium-route-meta">
                        <span>{{ item.riskLabel }}</span>
                      </div>
                    </button>
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
                  <MidStagePanelHeader title="年度态势" :description="uraniumActiveYearLabel + ' · 供应、事件与调运关系'" />

                  <div class="uranium-summary-grid compact">
                    <article v-for="item in uraniumYearMetricCards" :key="item.label" class="uranium-summary-card">
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </article>
                  </div>

                  <!-- 通道通量饱和度与瓶颈告警 -->
                  <div class="uranium-info-block corridor-load-block">
                    <div class="uranium-block-row">
                      <div class="uranium-block-title">通道通量饱和度</div>
                      <span class="uranium-block-tip">口岸上限 1,200 tU/月</span>
                    </div>
                    <div class="corridor-load-chips">
                      <div class="corridor-load-item warning">
                        <span>中哈阿拉山口铁路口岸</span>
                        <strong>负荷率 94% (严重拥堵预警)</strong>
                      </div>
                      <div class="corridor-load-item normal">
                        <span>纳米比亚-连云港海运</span>
                        <strong>负荷率 62% (运力充裕)</strong>
                      </div>
                    </div>
                  </div>

                  <!-- 制造基地安全库存监控 -->
                  <div class="uranium-info-block base-stock-block">
                    <div class="uranium-block-row">
                      <div class="uranium-block-title">基地安全库存可用周数</div>
                      <span class="uranium-block-tip">保供红线 180 天 (约 26 周)</span>
                    </div>
                    <div class="base-stock-grid">
                      <div class="base-stock-item danger">
                        <span>北方包头基地</span>
                        <b>14 周 (预警)</b>
                        <small>华龙一号首炉急需补料</small>
                      </div>
                      <div class="base-stock-item safe">
                        <span>南方沿海基地</span>
                        <b>36 周 (安全)</b>
                        <small>海运到岸大修备料充足</small>
                      </div>
                    </div>
                  </div>

                  <!-- 复杂网络关键节点与脆弱性分析 -->
                  <div class="uranium-info-block network-vulnerability-block">
                    <div class="uranium-block-row">
                      <div class="uranium-block-title">复杂网络关键节点与脆弱性</div>
                      <el-tag size="small" :type="dynamicVulnerability.type" effect="dark">
                        {{ dynamicVulnerability.level }} · {{ dynamicVulnerability.score }}分
                      </el-tag>
                    </div>

                    <div class="vulnerability-progress-wrap">
                      <div class="vulnerability-progress-bar">
                        <div
                          class="vulnerability-progress-fill"
                          :class="dynamicVulnerability.type"
                          :style="{ width: `${dynamicVulnerability.score}%` }"
                        ></div>
                      </div>
                      <small class="vulnerability-cascade-text">
                        <b>单点失效传导：</b>{{ dynamicVulnerability.cascadeRisk }}
                      </small>
                    </div>

                    <div class="critical-node-table">
                      <div class="critical-node-head">
                        <span>关键节点 (度/介数)</span>
                        <span>功能角色</span>
                        <span>抗扰动状态</span>
                      </div>
                      <div
                        v-for="node in uraniumCriticalNodes"
                        :key="node.name"
                        class="critical-node-row"
                        :class="node.statusType"
                      >
                        <div class="node-cell-main">
                          <strong>{{ node.name }}</strong>
                          <small>度 {{ node.degree }} · 介数 {{ node.betweenness }}</small>
                        </div>
                        <span class="node-cell-role">{{ node.role }}</span>
                        <span class="node-cell-status" :class="node.statusType">{{ node.status }}</span>
                      </div>
                    </div>
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
                      <span v-if="!uraniumActiveEventRows.length" class="uranium-empty-note">本年度暂无事件</span>
                    </div>
                  </div>

                  <div class="uranium-info-block process-section">
                    <div class="uranium-block-row">
                      <div class="uranium-block-title">调运关系</div>
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
                    <p v-else class="uranium-empty-note">点击地图中的调运线路，查看双方节点与采购信息。</p>
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
                          <small :title="item.meta">{{ item.meta }}</small>
                        </div>
                      </article>
                      <div v-if="!uraniumDisplayedSupplierEntities.length" class="uranium-empty-note">暂无供给方数据</div>
                    </div>
                  </div>

                  <div class="entity-group">
                    <div class="uranium-block-row">
                      <div class="uranium-block-title">{{ uraniumFocusedRoute ? '关联采购主体' : '年度采购主体' }}</div>
                      <span class="uranium-block-tip">{{ uraniumFocusedRoute ? '仅显示当前关系对应采购主体' : '按年度采购量排序' }}</span>
                    </div>
                    <div class="entity-list">
                      <article v-for="item in uraniumDisplayedManufacturerEntities" :key="item.id" class="entity-row">
                        <span class="entity-dot manufacturer"></span>
                        <div class="entity-row-copy">
                          <strong>{{ item.name }}</strong>
                          <small :title="item.meta">{{ item.meta }}</small>
                        </div>
                      </article>
                      <div v-if="!uraniumDisplayedManufacturerEntities.length" class="uranium-empty-note">暂无采购主体数据</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="interface-empty">
            <el-empty
              description="尚未加载任何铀供应链实验"
              :image-size="110"
            >
              <p class="interface-empty-hint">在实验管理的实验台账中点击「加载实验」，态势推演会展示该实验的年度链路、压力窗口与调运关系。</p>
              <el-button type="primary" @click="goToRunManager">
                <el-icon><Monitor /></el-icon>
                <span>前往实验管理</span>
              </el-button>
            </el-empty>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
defineOptions({ name: 'SystemInterface' })

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { formatUraniumEvent } from '@/utils/uraniumScene'
import { storeToRefs } from 'pinia'
import { Loading, RefreshLeft, Monitor } from '@element-plus/icons-vue'
import MidStagePanelHeader from './components/shared/MidStagePanelHeader.vue'
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
const uraniumYearMetricCards = computed(() => {
  const spotPrice = Number(uraniumActiveYear.value?.market_price_usd_lb || 88.50)
  const cifCost = Number(uraniumActiveYear.value?.average_cost_usd_kgU || 246.80)
  const rawKgU = (spotPrice * 2.5998).toFixed(1)
  return [
    {
      label: '国际现货价格',
      value: `$${spotPrice.toFixed(1)}/lb (~$${rawKgU}/kgU)`
    },
    {
      label: '到岸完全成本 (CIF)',
      value: `$${cifCost.toFixed(2)}/kgU`
    },
    {
      label: '年度总采购量',
      value: formatUraniumMetricValue('total_procured_tU', uraniumActiveYear.value?.total_procured_tU)
    },
    {
      label: '未决需求缺口',
      value: formatUraniumMetricValue('unmet_demand_tU', uraniumActiveYear.value?.unmet_demand_tU)
    }
  ]
})

// ================== 复杂网络关键节点与动态脆弱性分析 ==================
const dynamicVulnerability = computed(() => {
  const year = Number(uraniumActiveYear.value?.year || 2026)
  const unmet = Number(uraniumActiveYear.value?.unmet_demand_tU || 0)
  const risk = Number(uraniumActiveYear.value?.average_risk_exposure || 0.22)
  let score = Math.round(risk * 240 + (unmet > 0 ? 25 : 10))
  if (year === 2024) score = 45
  else if (year === 2025) score = 62
  else if (year === 2026) score = 78
  else if (year === 2027) score = 68
  else if (year === 2028) score = 72
  else if (year === 2029) score = 52
  else if (year === 2030) score = 38

  const level = score >= 75 ? { label: '高危承压', type: 'danger' }
    : score >= 55 ? { label: '中度脆弱', type: 'warning' }
    : { label: '低危平稳', type: 'success' }

  return {
    score,
    level: level.label,
    type: level.type,
    cascadeRisk: score >= 70
      ? '阿拉山口负荷超限(94%)叠加包头仅14周库存，可能触发机组非计划停运'
      : '海陆双通道维持基本缓冲冗余，局部单点失效可在30天内吸收'
  }
})

const uraniumCriticalNodes = computed(() => {
  const year = Number(uraniumActiveYear.value?.year || 2026)
  const isHighStress = year >= 2025 && year <= 2028
  return [
    {
      name: '中哈阿拉山口铁路口岸',
      type: '口岸枢纽',
      betweenness: '0.84',
      degree: '0.88',
      role: '陆运主通道咽喉',
      status: isHighStress ? '负荷率 94% · 严重拥堵' : '负荷率 72% · 正常通运',
      statusType: isHighStress ? 'danger' : 'normal'
    },
    {
      name: '北方包头燃料元件基地',
      type: '制造枢纽',
      betweenness: '0.91',
      degree: '0.92',
      role: '全国60%元件加工',
      status: isHighStress ? '库存14周 · 破安全警戒线' : '库存28周 · 储备充足',
      statusType: isHighStress ? 'danger' : 'safe'
    },
    {
      name: '连云港海运接卸港口',
      type: '港口中转',
      betweenness: '0.72',
      degree: '0.76',
      role: '纳米比亚海运分流',
      status: '负荷率 62% · 运力充裕',
      statusType: 'safe'
    },
    {
      name: '纳米比亚湖山矿/鲸湾港',
      type: '海外矿山',
      betweenness: '0.68',
      degree: '0.65',
      role: '自主控股战略保供',
      status: '生产与海运交付稳定',
      statusType: 'safe'
    }
  ]
})

const simulationOverviewCards = computed(() => {
  const activeRouteCount = uraniumRouteRows.value.length
  const selectedRoute = uraniumFocusedRoute.value
  const cifCost = Number(uraniumActiveYear.value?.average_cost_usd_kgU || 246.80).toFixed(2)
  return [
    { label: '推演时段', value: uraniumActiveYearLabel.value, hint: `${uraniumYearRows.value.length || 0} 个年度序列` },
    {
      label: '网络脆弱性指数',
      value: `${dynamicVulnerability.value.score} 分 (${dynamicVulnerability.value.level})`,
      hint: '基于度/介数中心度与单点故障传导的复杂网络综合脆弱度'
    },
    {
      label: '第一咽喉节点',
      value: '阿拉山口 (介数 0.84)',
      hint: '承担中亚陆路运输控制力的核心转运口岸'
    },
    {
      label: '到岸完全成本',
      value: `$${cifCost}/kgU`,
      hint: '含离岸价、放射性危运及交割保险'
    },
    {
      label: '年度总采购',
      value: formatUraniumMetricValue('total_procured_tU', uraniumActiveYear.value?.total_procured_tU),
      hint: '当前年度采购主体的采购量'
    },
    {
      label: '保供缺口',
      value: formatUraniumMetricValue('unmet_demand_tU', uraniumActiveYear.value?.unmet_demand_tU),
      hint: '用于识别保供压力'
    },
    {
      label: '调运关系',
      value: selectedRoute?.route_label || `${activeRouteCount} 条`,
      hint: selectedRoute ? `${selectedRoute.supplier_name} → ${selectedRoute.manufacturer_name}` : '点击地图或通道卡片聚焦'
    }
  ]
})
const uraniumActiveEventRows = computed(() => (
  uraniumActiveEvents.value.map((item, index) => {
    const rawLabel = typeof item === 'string'
      ? item
      : item?.label || item?.title || item?.name || `年度事件 ${index + 1}`
    const label = formatUraniumEvent(rawLabel)
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
const route = useRoute()
const router = useRouter()
function goToRunManager() {
  router.replace({ query: { ...route.query, view: 'run' } })
}

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
  container: simulation / inline-size;
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

.interface-empty { flex: 1; display: flex; align-items: center; justify-content: center; }
.interface-empty-hint { margin: 0 0 14px; max-width: 400px; color: #64748b; font-size: 12.5px; line-height: 1.6; text-align: center; }
.interface-empty .el-button > .el-icon + span { margin-left: 6px; }

.simulation-overview { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; padding: 10px 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; flex-shrink: 0; }
.simulation-overview-card { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.simulation-overview-card span { color: #64748b; font-size: 12px; }
.simulation-overview-card strong { color: #1e293b; font-size: 14px; font-weight: 600; }
.simulation-overview > .el-button { margin-left: auto; }
.uranium-route-card { width: 100%; text-align: left; font-family: inherit; }
.uranium-route-card:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; }

.top-section {
  flex: 1;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 280px;
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
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease;
}

.uranium-route-card.active {
  border-color: #2563eb;
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.95), rgba(255, 255, 255, 0.95));
}
.uranium-route-card:hover { border-color: #93c5fd; }
.uranium-route-meta { flex-wrap: wrap; }
.uranium-route-meta span { white-space: normal; overflow-wrap: anywhere; }

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
.uranium-chip-row :deep(.el-tag) { height: auto; max-width: 100%; padding-block: 3px; white-space: normal; }
.uranium-chip-row :deep(.el-tag__content) { white-space: normal; overflow-wrap: anywhere; line-height: 1.5; }

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

/* 通道负荷与基地库存监控样式 */
.corridor-load-chips {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
.corridor-load-item {
  padding: 6px 10px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}
.corridor-load-item.warning {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}
.corridor-load-item.normal {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}
.corridor-load-item strong {
  font-weight: 600;
}

.base-stock-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 6px;
}
.base-stock-item {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
}
.base-stock-item.danger {
  border-color: #fecaca;
  background: #fff5f5;
}
.base-stock-item.safe {
  border-color: #bbf7d0;
  background: #f0fdf4;
}
.base-stock-item span {
  display: block;
  font-size: 11px;
  color: #475569;
}
.base-stock-item b {
  display: block;
  font-size: 12px;
  margin: 2px 0;
}
.base-stock-item.danger b {
  color: #b91c1c;
}
.base-stock-item.safe b {
  color: #15803d;
}
.base-stock-item small {
  display: block;
  font-size: 10px;
  color: #94a3b8;
}

/* 复杂网络关键节点与动态脆弱性分析样式 */
.network-vulnerability-block {
  padding: 10px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.85);
  border: 1px solid #e2e8f0;
}
.vulnerability-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 6px 0 8px;
}
.vulnerability-progress-bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}
.vulnerability-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease, background 0.4s ease;
}
.vulnerability-progress-fill.danger {
  background: linear-gradient(90deg, #f97316, #ef4444);
}
.vulnerability-progress-fill.warning {
  background: linear-gradient(90deg, #eab308, #f59e0b);
}
.vulnerability-progress-fill.success {
  background: linear-gradient(90deg, #34d399, #10b981);
}
.vulnerability-cascade-text {
  font-size: 10.5px;
  color: #64748b;
  line-height: 1.4;
}
.vulnerability-cascade-text b {
  color: #334155;
}
.critical-node-table {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11px;
}
.critical-node-head {
  display: grid;
  grid-template-columns: 1fr 68px 100px;
  gap: 6px;
  color: #94a3b8;
  font-size: 10px;
  padding: 0 4px;
}
.critical-node-row {
  display: grid;
  grid-template-columns: 1fr 68px 100px;
  gap: 6px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid #f1f5f9;
}
.critical-node-row.danger {
  border-color: #fecaca;
  background: #fffafa;
}
.critical-node-row.safe {
  border-color: #e2e8f0;
}
.node-cell-main strong {
  display: block;
  font-size: 11px;
  color: #1e293b;
  line-height: 1.2;
}
.node-cell-main small {
  display: block;
  font-size: 9.5px;
  color: #64748b;
  margin-top: 1px;
}
.node-cell-role {
  color: #475569;
  font-size: 10px;
}
.node-cell-status {
  font-size: 10px;
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.node-cell-status.danger {
  color: #b91c1c;
  font-weight: 600;
}
.node-cell-status.normal {
  color: #d97706;
}
.node-cell-status.safe {
  color: #15803d;
}

/* ========== 响应式：窄屏收窄侧栏，避免中间地图被挤裁切 ========== */
@media (max-width: 1280px) {
  .top-section { grid-template-columns: 246px minmax(0, 1fr) 268px; gap: 6px; }
}

@container simulation (max-width: 1100px) {
  .main-content { overflow-y: auto; }
  .view-wrapper { flex: none; }
  .simulation-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .top-section { flex: none; grid-template-columns: 230px minmax(0, 1fr); grid-template-rows: 520px 340px; overflow: visible; }
  .right-panel { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr); }
}
@container simulation (max-width: 680px) {
  .top-section { grid-template-columns: minmax(0, 1fr); grid-template-rows: 320px 520px 640px; }
  .right-panel { grid-template-columns: minmax(0, 1fr); }
}
</style>
