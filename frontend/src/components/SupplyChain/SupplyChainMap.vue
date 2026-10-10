<template>
  <div class="supply-chain-map">
    <div class="map-header">
      <h3>供应链网络地图</h3>
      <div class="map-controls">
        <el-tag v-if="map" type="info" size="small">
          缩放级别: {{ currentZoom }}
        </el-tag>
        <el-button-group size="small" style="margin-left: 8px">
          <el-button :type="showPorts ? 'primary' : ''" @click="togglePorts">
            <el-icon><Location /></el-icon>
            港口标记
          </el-button>
          <el-button :type="showClusters ? 'primary' : ''" @click="toggleClusters">
            <el-icon><Collection /></el-icon>
            企业聚类
          </el-button>
          <el-button :type="showCollaborations ? 'primary' : ''" @click="toggleCollaborations">
            <el-icon><Connection /></el-icon>
            协作关系
          </el-button>
          <el-button :type="showPortConnections ? 'primary' : ''" @click="togglePortConnections">
            <el-icon><Right /></el-icon>
            航线展示
          </el-button>
        </el-button-group>
        <el-button size="small" @click="resetMap" style="margin-left: 8px">
          <el-icon><RefreshRight /></el-icon>
          重置视图
        </el-button>
      </div>
    </div>

    <div v-if="loading" class="map-loading">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
      <span>地图加载中...</span>
    </div>

    <div ref="mapContainerRef" class="map-container"></div>

    <div v-if="map && !loading" class="map-legend">
      <div class="legend-title">图例</div>
      <div class="legend-item">
        <div class="legend-icon port-icon"></div>
        <span>港口位置</span>
      </div>
      <div class="legend-item">
        <div class="legend-icon cluster-icon" style="background-color: #409EFF"></div>
        <span>中国企业</span>
      </div>
      <div class="legend-item">
        <div class="legend-icon cluster-icon" style="background-color: #67C23A"></div>
        <span>亚洲其他</span>
      </div>
      <div class="legend-item">
        <div class="legend-icon cluster-icon" style="background-color: #E6A23C"></div>
        <span>欧美企业</span>
      </div>
      <div class="legend-item">
        <div class="legend-icon" style="background-color: #F56C6C; width: 16px; height: 2px; border-radius: 2px;"></div>
        <span>国内航线</span>
      </div>
      <div class="legend-item">
        <div class="legend-icon" style="background: repeating-linear-gradient(90deg,#5f7cff 0 8px,transparent 8px 14px); width: 16px; height: 2px; border-radius: 2px;"></div>
        <span>国际航线</span>
      </div>
      <div class="legend-item">
        <span style="font-size: 18px; line-height: 1">🚢</span>
        <span style="margin-left: 8px">海运船队</span>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="`${selectedPort?.port_name || ''} - 企业详情`"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedPort">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="港口名称">{{ selectedPort.port_name }}</el-descriptions-item>
          <el-descriptions-item label="所属国家">{{ selectedPort.country }}</el-descriptions-item>
          <el-descriptions-item label="城市">{{ selectedPort.city }}</el-descriptions-item>
          <el-descriptions-item label="总企业数">
            <el-tag type="primary">{{ selectedPort.stats.total }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="制造商">
            <el-tag type="success">{{ selectedPort.stats.manufacturer }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="销售商">
            <el-tag type="warning">{{ selectedPort.stats.retailer }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="供应商" :span="3">
            <el-tag type="info">{{ selectedPort.stats.supplier }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <el-table :data="selectedPort.enterprises" style="width: 100%" max-height="400" stripe>
          <el-table-column prop="node_id" label="节点ID" width="80" align="center" />
          <el-table-column prop="city" label="城市" width="120" />
          <el-table-column prop="enterprise_type" label="企业类型" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="getEnterpriseTypeTag(row.enterprise_type)" size="small">
                {{ row.enterprise_type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="经纬度" width="200">
            <template #default="{ row }">
              <span style="font-size: 12px">
                {{ row.coordinates.longitude?.toFixed(2) }}, {{ row.coordinates.latitude?.toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button size="small" @click="locateEnterprise(row)">
                定位
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { storeToRefs } from 'pinia'
import { Location, Collection, RefreshRight, Loading, Connection, Right } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  createLeafletMap,
  createMarkerCluster,
  drawCollaborationLines,
  clearCanvasLayer,
  destroyMap
} from '@/utils/leafletMapLoader'
import L from 'leaflet'
import { ROUTES_DATA } from '@/assets/data/shippingRoutes'

const store = useSupplyChainStore()
const { portsData, currentNetwork, currentMonth, currentIterationData } = storeToRefs(store)

const mapContainerRef = ref(null)
const map = ref(null)
const loading = ref(true)
const currentZoom = ref(4)

const showPorts = ref(false)
const showClusters = ref(false)
const showCollaborations = ref(false)
const showPortConnections = ref(true)

const dialogVisible = ref(false)
const selectedPort = ref(null)

const portMarkers = ref([])
const markerClusterGroup = ref(null)
const portConnections = ref([])
const portConnectionLayer = ref(null)

const activeShips = ref([])
let shipAnimationTimer = null
let containerResizeObserver = null

const createPortPinIcon = (options = {}) => {
  const {
    color = '#1677ff',
    size = 26,
    active = false
  } = options

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${size}" height="${size + 8}"
         viewBox="0 0 48 60"
         style="display:block;filter:drop-shadow(0 2px 5px rgba(15,23,42,0.32))">
      <path d="M24 2C14.1 2 6 10.1 6 20c0 13.5 18 38 18 38s18-24.5 18-38C42 10.1 33.9 2 24 2z"
            fill="${color}"/>
      <circle cx="24" cy="20" r="8.5"
              fill="#ffffff"
              opacity="${active ? 1 : 0.92}"/>
      <circle cx="24" cy="20" r="4.3"
              fill="${color}"
              opacity="0.9"/>
    </svg>
  `

  return L.divIcon({
    html: svg,
    className: 'clean-port-pin-icon',
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 6],
    popupAnchor: [0, -size]
  })
}

const createShipIcon = (angleDeg = 0, scale = 1, opacity = 1) => {
  const size = Math.round(34 * scale)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${size}" height="${size}"
         viewBox="0 0 64 64"
         style="opacity:${opacity};transform:rotate(${angleDeg}deg);display:block;filter:drop-shadow(0 2px 4px rgba(15,23,42,0.42))">
      <path d="M32 5 L47 39 C49 44 45 53 32 57 C19 53 15 44 17 39 Z"
            fill="#1d4ed8"/>
      <path d="M32 8 L42 38 C43 41 39 47 32 50 C25 47 21 41 22 38 Z"
            fill="#38bdf8"/>
      <rect x="24" y="30" width="16" height="11" rx="2.5"
            fill="#ffffff" opacity="0.94"/>
      <rect x="29" y="23" width="6" height="9" rx="1.5"
            fill="#f97316"/>
      <path d="M22 51 C27 55 37 55 42 51"
            stroke="#bfdbfe" stroke-width="4" stroke-linecap="round" opacity="0.72"/>
    </svg>
  `

  return L.divIcon({
    html: svg,
    className: 'ship-marker-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
}

const calcBearing = (latA, lngA, latB, lngB) => {
  const dLng = lngB - lngA
  const dLat = latB - latA
  return Math.atan2(dLng, dLat) * (180 / Math.PI)
}

const normalizeLongitude = (lng) => {
  const normalized = ((lng + 180) % 360 + 360) % 360 - 180
  return normalized === -180 ? 180 : normalized
}

const alignLongitudeNearRef = (lng, referenceLng) => {
  let adjusted = lng
  while (adjusted - referenceLng > 180) adjusted -= 360
  while (adjusted - referenceLng < -180) adjusted += 360
  return adjusted
}

const getAlignedWaypoints = (waypoints) => {
  if (!Array.isArray(waypoints) || waypoints.length === 0) return []

  const aligned = []
  let refLng = normalizeLongitude(waypoints[0].lng)

  waypoints.forEach((point, index) => {
    const lng = index === 0
      ? refLng
      : alignLongitudeNearRef(normalizeLongitude(point.lng), refLng)

    aligned.push({ ...point, lng })
    refLng = lng
  })

  return aligned
}

const createRouteTrackPoints = (waypoints, stepsPerSegment = 36) => {
  const alignedWaypoints = getAlignedWaypoints(waypoints)

  if (!Array.isArray(alignedWaypoints) || alignedWaypoints.length < 2) {
    return []
  }

  const rawPoints = alignedWaypoints.map(point => ({
    lat: point.lat,
    lng: point.lng
  }))

  const result = []

  for (let i = 0; i < rawPoints.length - 1; i++) {
    const p0 = rawPoints[Math.max(i - 1, 0)]
    const p1 = rawPoints[i]
    const p2 = rawPoints[i + 1]
    const p3 = rawPoints[Math.min(i + 2, rawPoints.length - 1)]

    for (let step = 0; step <= stepsPerSegment; step++) {
      if (i > 0 && step === 0) continue

      const t = step / stepsPerSegment
      const t2 = t * t
      const t3 = t2 * t

      const lat = 0.5 * (
        2 * p1.lat +
        (-p0.lat + p2.lat) * t +
        (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 +
        (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3
      )

      const lng = 0.5 * (
        2 * p1.lng +
        (-p0.lng + p2.lng) * t +
        (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * t2 +
        (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * t3
      )

      result.push([lat, lng])
    }
  }

  return result
}

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const buildRouteMeasures = (routePoints) => {
  const segmentDistances = []
  let totalDistance = 0

  for (let i = 0; i < routePoints.length - 1; i++) {
    const from = routePoints[i]
    const to = routePoints[i + 1]
    const distance = calculateDistance(from[0], from[1], to[0], to[1])
    segmentDistances.push(distance)
    totalDistance += distance
  }

  return { segmentDistances, totalDistance }
}

const normalizeProgress = (progress) => {
  return ((progress % 1) + 1) % 1
}

const getPointOnRouteByProgress = (routePoints, measures, progress) => {
  const normalizedProgress = normalizeProgress(progress)
  const { segmentDistances, totalDistance } = measures
  const targetDistance = totalDistance * normalizedProgress

  let accumulated = 0

  for (let i = 0; i < segmentDistances.length; i++) {
    const segmentDistance = segmentDistances[i]
    const nextAccumulated = accumulated + segmentDistance

    if (targetDistance <= nextAccumulated || i === segmentDistances.length - 1) {
      const segmentProgress = segmentDistance === 0
        ? 0
        : (targetDistance - accumulated) / segmentDistance

      const from = routePoints[i]
      const to = routePoints[i + 1]

      const lat = from[0] + (to[0] - from[0]) * segmentProgress
      const lng = from[1] + (to[1] - from[1]) * segmentProgress
      const bearing = calcBearing(from[0], from[1], to[0], to[1])

      return { lat, lng, bearing }
    }

    accumulated = nextAccumulated
  }

  const fallback = routePoints[0]
  return { lat: fallback[0], lng: fallback[1], bearing: 0 }
}

const getOffsetLatLng = (point, offsetKm = 0) => {
  if (!offsetKm) return [point.lat, point.lng]

  const rad = (point.bearing + 90) * Math.PI / 180
  const latOffset = Math.cos(rad) * offsetKm / 111.32
  const lngOffset = Math.sin(rad) * offsetKm / (111.32 * Math.max(0.2, Math.cos(point.lat * Math.PI / 180)))

  return [point.lat + latOffset, point.lng + lngOffset]
}

const createShipFleetForRoute = (route, routePoints, routeWeight = 2.5, routeIndex = 0) => {
  if (!routePoints || routePoints.length < 2 || !portConnectionLayer.value) return

  const measures = buildRouteMeasures(routePoints)
  if (measures.totalDistance <= 0) return

  const isDomesticRoute = route.type === 'domestic'
  const shipCount = route.shipCount || (isDomesticRoute ? 5 : 8)
  const laneWidthKm = isDomesticRoute ? 8 : 55
  const baseDuration = isDomesticRoute ? 22000 : 44000
  const distanceFactor = Math.min(isDomesticRoute ? 12000 : 36000, measures.totalDistance * 1.1)
  const duration = baseDuration + distanceFactor

  const lanePattern = [-0.95, -0.58, -0.28, 0, 0.24, 0.52, 0.86, 1.12, -1.2]

  for (let i = 0; i < shipCount; i++) {
    const initialProgress = normalizeProgress(
      i / shipCount +
      routeIndex * 0.071 +
      (i % 2 === 0 ? 0.018 : -0.014)
    )

    const laneValue = lanePattern[i % lanePattern.length]
    const smallJitter = ((routeIndex + 1) * (i + 3) % 7 - 3) * (isDomesticRoute ? 0.7 : 4.2)
    const sideOffsetKm = laneValue * laneWidthKm + smallJitter

    const scale = isDomesticRoute
      ? 1.08 + (i % 3) * 0.07
      : 1.00 + (i % 4) * 0.06

    const opacity = i % 5 === 0 ? 0.82 : 0.96
    const speedFactor = 0.82 + ((i + routeIndex) % 5) * 0.08

    const initial = getPointOnRouteByProgress(routePoints, measures, initialProgress)
    const offsetLatLng = getOffsetLatLng(initial, sideOffsetKm)

    const shipMarker = L.marker(offsetLatLng, {
      icon: createShipIcon(initial.bearing, scale, opacity),
      interactive: true,
      zIndexOffset: 620 + i
    })

    shipMarker.bindTooltip(
      `🚢 ${route.shortName}：${route.name}`,
      {
        direction: 'top',
        offset: [0, -14],
        className: 'ship-tooltip'
      }
    )

    shipMarker.addTo(portConnectionLayer.value)

    activeShips.value.push({
      marker: shipMarker,
      route,
      routePoints,
      measures,
      progress: initialProgress,
      duration,
      speedFactor,
      sideOffsetKm,
      scale,
      opacity
    })
  }
}

const startShipAnimationTimer = () => {
  if (shipAnimationTimer) return

  shipAnimationTimer = setInterval(() => {
    if (!map.value || !portConnectionLayer.value) return

    activeShips.value.forEach(ship => {
      ship.progress = normalizeProgress(ship.progress + (60 / ship.duration) * ship.speedFactor)

      const current = getPointOnRouteByProgress(ship.routePoints, ship.measures, ship.progress)
      const offsetLatLng = getOffsetLatLng(current, ship.sideOffsetKm)

      ship.marker.setLatLng(offsetLatLng)
      ship.marker.setIcon(createShipIcon(current.bearing, ship.scale, ship.opacity))
    })
  }, 60)
}

const clearShipAnimations = () => {
  if (shipAnimationTimer) {
    clearInterval(shipAnimationTimer)
    shipAnimationTimer = null
  }

  activeShips.value.forEach(ship => {
    if (ship.marker && portConnectionLayer.value && portConnectionLayer.value.hasLayer(ship.marker)) {
      portConnectionLayer.value.removeLayer(ship.marker)
    }
  })

  activeShips.value = []
}

const initMap = async () => {
  loading.value = true

  try {
    map.value = createLeafletMap(mapContainerRef.value, {
      center: [20, 105],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18
    })

    portConnectionLayer.value = L.layerGroup().addTo(map.value)

    map.value.on('zoomend', () => {
      currentZoom.value = map.value.getZoom()
      debouncedHandleZoomChange()
    })

    console.log('[SupplyChainMap] Leaflet地图初始化成功')

    if (portsData.value.length === 0) {
      await store.loadPorts()
    }

    await nextTick()
    renderMap()
  } catch (error) {
    console.error('[SupplyChainMap] 地图初始化失败:', error)
  } finally {
    loading.value = false
  }
}

const drawPortConnections = () => {
  clearPortConnections()

  if (!showPortConnections.value || !map.value || !portConnectionLayer.value) return

  ROUTES_DATA.forEach((route, idx) => {
    try {
      const waypoints = route.waypoints || []
      if (waypoints.length < 2) return

      const isDomesticRoute = route.type === 'domestic'
      const routeWeight = isDomesticRoute ? 1.8 : 1.5
      const routeDash = isDomesticRoute ? null : '8 10'

      const routePoints = createRouteTrackPoints(
        waypoints,
        route.stepsPerSegment || (isDomesticRoute ? 34 : 42)
      )

      if (routePoints.length < 2) return

      const viaText = waypoints
        .filter(point => point.type !== 'sea')
        .map(point => point.label)
        .join(' → ')

      const routeHalo = L.polyline(routePoints, {
        color: '#ffffff',
        weight: routeWeight + 1.2,
        opacity: 0.1,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
        className: 'route-halo-line'
      })

      routeHalo.addTo(portConnectionLayer.value)

      const routeLine = L.polyline(routePoints, {
        color: route.color,
        weight: routeWeight,
        opacity: isDomesticRoute ? 0.72 : 0.6,
        dashArray: routeDash,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'port-curve-connection'
      })

      routeLine.addTo(portConnectionLayer.value)

      routeLine.bindTooltip(
        `
          <div class="route-tooltip-content">
            <b>${route.shortName}｜${route.name}</b><br/>
            <span>类型：${isDomesticRoute ? '国内航线' : '国际航线'}</span><br/>
            <span>主要经过：${viaText}</span><br/>
            <span>船只数量：${route.shipCount || (isDomesticRoute ? 5 : 8)} 艘</span>
          </div>
        `,
        {
          sticky: true,
          className: 'route-tooltip'
        }
      )

      routeLine.on('mouseover', function () {
        this.setStyle({ weight: routeWeight + 0.9, opacity: 0.9 })
        routeHalo.setStyle({ opacity: 0.28 })
      })

      routeLine.on('mouseout', function () {
        this.setStyle({
          weight: routeWeight,
          opacity: isDomesticRoute ? 0.72 : 0.6
        })
        routeHalo.setStyle({ opacity: 0.1 })
      })

      routeLine.on('click', () => {
        const totalDistance = routePoints.reduce((sum, point, pointIndex) => {
          if (pointIndex === 0) return 0
          const prev = routePoints[pointIndex - 1]
          return sum + calculateDistance(prev[0], prev[1], point[0], point[1])
        }, 0)

        ElMessage.info(
          `${route.shortName}：${route.name}，约 ${Math.round(totalDistance)} 公里；主要经过：${viaText}`
        )
      })

      const labelPoint = routePoints[Math.floor(routePoints.length * 0.52)]
      const routeLabelMarker = L.marker(labelPoint, {
        icon: L.divIcon({
          className: 'route-label-icon',
          html: `<span>${route.shortName}</span>`,
          iconSize: [1, 1],
          iconAnchor: [0, 0]
        }),
        interactive: false,
        zIndexOffset: 300
      }).addTo(portConnectionLayer.value)

      portConnections.value.push({
        id: route.id,
        routeName: route.name,
        routeHalo,
        routeLine,
        routeLabelMarker
      })

      createShipFleetForRoute(route, routePoints, routeWeight, idx)
    } catch (error) {
      console.error('绘制航线失败:', error, route?.name)
    }
  })

  startShipAnimationTimer()

  console.log(
    `[SupplyChainMap] 绘制了 ${ROUTES_DATA.length} 条汽车供应链航线，生成了 ${activeShips.value.length} 艘船`
  )
}

const clearPortConnections = () => {
  clearShipAnimations()

  if (portConnectionLayer.value) {
    portConnectionLayer.value.clearLayers()
  }

  portConnections.value = []
}

const togglePortConnections = () => {
  showPortConnections.value = !showPortConnections.value

  if (showPortConnections.value) {
    drawPortConnections()
  } else {
    clearPortConnections()
  }
}

const renderMap = () => {
  if (!map.value || portsData.value.length === 0) return

  clearMap()

  if (showPorts.value) renderPortMarkers()
  if (showClusters.value) renderClusterCircles()
  if (showPortConnections.value) drawPortConnections()

  console.log(`[SupplyChainMap] 渲染完成，缩放级别: ${currentZoom.value}`)
}

const renderPortMarkers = () => {
  portMarkers.value.forEach(marker => map.value.removeLayer(marker))
  portMarkers.value = []

  const markers = []

  portsData.value.forEach(port => {
    if (!port.coordinates?.longitude || !port.coordinates?.latitude) return

    const { longitude, latitude } = port.coordinates
    const currentEnterpriseCount = getCurrentEnterpriseCount(port)

    const color = currentEnterpriseCount > 10
      ? '#F56C6C'
      : currentEnterpriseCount > 5
        ? '#E6A23C'
        : '#409EFF'

    const icon = createPortPinIcon({
      color,
      size: currentEnterpriseCount > 10 ? 30 : 26,
      active: currentEnterpriseCount > 10
    })

    const marker = L.marker([latitude, longitude], {
      icon,
      title: port.port_name,
      zIndexOffset: 200
    })

    marker.bindTooltip(
      `
        <div class="port-tooltip-content">
          <b>${port.port_name}</b><br/>
          <span>${port.country || ''} ${port.city || ''}</span><br/>
          <span>企业数：${currentEnterpriseCount}</span>
        </div>
      `,
      {
        direction: 'top',
        offset: [0, -28],
        className: 'clean-port-tooltip'
      }
    )

    marker.on('click', () => {
      selectedPort.value = port
      dialogVisible.value = true
    })

    marker.addTo(map.value)
    markers.push(marker)
  })

  portMarkers.value = markers
}

const getCurrentEnterpriseCount = (port) => {
  if (!currentIterationData.value.network || currentIterationData.value.network.length === 0) {
    return port.stats?.total || 0
  }

  const currentMonthData = currentIterationData.value.network[currentMonth.value]
  if (!currentMonthData) return port.stats?.total || 0

  const totalEnterprises = currentMonthData.total_enterprises || 0
  const initialEnterprises = currentIterationData.value.network[0]?.total_enterprises || 1
  const ratio = totalEnterprises / initialEnterprises

  return Math.round((port.stats?.total || 0) * ratio)
}

const renderClusterCircles = () => {
  if (markerClusterGroup.value) {
    map.value.removeLayer(markerClusterGroup.value)
    markerClusterGroup.value = null
  }

  const clusterMarkers = []

  portsData.value.forEach(port => {
    if (!port.enterprises || port.enterprises.length === 0) return

    port.enterprises.forEach(enterprise => {
      if (!enterprise.coordinates?.longitude || !enterprise.coordinates?.latitude) return

      const marker = L.marker(
        [enterprise.coordinates.latitude, enterprise.coordinates.longitude],
        { country: port.country, enterprise, port }
      )

      clusterMarkers.push(marker)
    })
  })

  markerClusterGroup.value = createMarkerCluster(map.value)
  markerClusterGroup.value.addLayers(clusterMarkers)
  map.value.addLayer(markerClusterGroup.value)

  console.log(`[SupplyChainMap] 创建了 ${clusterMarkers.length} 个企业标记点的聚类`)
}

const clearMap = () => {
  portMarkers.value.forEach(marker => map.value.removeLayer(marker))
  portMarkers.value = []

  if (markerClusterGroup.value) {
    map.value.removeLayer(markerClusterGroup.value)
    markerClusterGroup.value = null
  }

  clearPortConnections()
  clearCanvasLayer(map.value)
}

const debounce = (fn, delay) => {
  let timeoutId = null
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

const handleZoomChange = () => {
  if (!showPorts.value || !map.value) return

  const zoom = currentZoom.value

  if (zoom <= 4) {
    portMarkers.value.forEach((marker, index) => {
      const port = portsData.value[index]
      if (port && port.stats.total > 10) {
        map.value.addLayer(marker)
      } else {
        map.value.removeLayer(marker)
      }
    })
  } else {
    portMarkers.value.forEach(marker => {
      if (!map.value.hasLayer(marker)) map.value.addLayer(marker)
    })
  }
}

const debouncedHandleZoomChange = debounce(handleZoomChange, 100)

const togglePorts = () => {
  showPorts.value = !showPorts.value

  if (!map.value) return

  if (showPorts.value) {
    if (portMarkers.value.length === 0) {
      renderPortMarkers()
    } else {
      portMarkers.value.forEach(marker => {
        if (!map.value.hasLayer(marker)) {
          map.value.addLayer(marker)
        }
      })
    }
  } else {
    portMarkers.value.forEach(marker => {
      if (map.value.hasLayer(marker)) {
        map.value.removeLayer(marker)
      }
    })
  }
}

const toggleClusters = () => {
  showClusters.value = !showClusters.value

  if (!map.value) return

  if (showClusters.value) {
    if (!markerClusterGroup.value) {
      renderClusterCircles()
    } else if (!map.value.hasLayer(markerClusterGroup.value)) {
      map.value.addLayer(markerClusterGroup.value)
    }
  } else {
    if (markerClusterGroup.value && map.value.hasLayer(markerClusterGroup.value)) {
      map.value.removeLayer(markerClusterGroup.value)
    }
  }
}

const renderCollaborationLines = () => {
  clearCanvasLayer(map.value)

  if (!showCollaborations.value || !currentNetwork.value) return

  const collaborations = currentNetwork.value.collaboration_edges || []

  if (collaborations.length === 0) {
    console.log('[SupplyChainMap] 当前无协作关系数据')
    return
  }

  drawCollaborationLines(map.value, collaborations, {
    colorByType: true,
    widthByStrength: true
  })

  const redrawLines = debounce(() => {
    drawCollaborationLines(map.value, collaborations, {
      colorByType: true,
      widthByStrength: true
    })
  }, 50)

  map.value.on('moveend', redrawLines)
  map.value.on('zoomend', redrawLines)

  console.log(`[SupplyChainMap] 绘制了 ${collaborations.length} 条协作连接线`)
}

const toggleCollaborations = () => {
  showCollaborations.value = !showCollaborations.value

  if (showCollaborations.value) {
    renderCollaborationLines()
  } else {
    clearCanvasLayer(map.value)
  }
}

const resetMap = () => {
  if (map.value) {
    map.value.setView([20, 105], 3)
  }
}

const locateEnterprise = (enterprise) => {
  if (!map.value || !enterprise.coordinates) return

  const { longitude, latitude } = enterprise.coordinates
  map.value.setView([latitude, longitude], 10)
  dialogVisible.value = false
}

const getEnterpriseTypeTag = (type) => {
  const tagMap = {
    '制造商': 'success',
    '销售商': 'warning',
    '供应商': 'info'
  }
  return tagMap[type] || ''
}

const handlePortSelected = (port) => {
  if (!map.value || !port?.coordinates) return

  const { longitude, latitude } = port.coordinates
  map.value.setView([latitude, longitude], 8)

  console.log('[SupplyChainMap] 定位到港口:', port.port_name)
}

defineExpose({ handlePortSelected })

let renderMapTimer = null

watch(portsData, () => {
  if (map.value && !loading.value) {
    if (renderMapTimer) clearTimeout(renderMapTimer)
    renderMapTimer = setTimeout(() => renderMap(), 300)
  }
}, { deep: true })

let lastRenderTime = 0

watch(currentMonth, () => {
  const now = Date.now()
  if (now - lastRenderTime < 200) return
  lastRenderTime = now

  if (showCollaborations.value) renderCollaborationLines()
  if (showClusters.value && map.value) renderClusterCircles()
  if (showPorts.value && map.value) renderPortMarkers()
})

const bindContainerResize = () => {
  if (typeof ResizeObserver === 'undefined' || !mapContainerRef.value) return
  containerResizeObserver = new ResizeObserver(() => {
    // 布局变化（面板换位、窗口缩放等）后必须让 Leaflet 重新量尺寸，
    // 否则容器变大会露出灰色底 / 空白条。
    map.value?.invalidateSize({ animate: false })
  })
  containerResizeObserver.observe(mapContainerRef.value)
}

onMounted(() => {
  nextTick(() => {
    const checkAndInit = () => {
      if (mapContainerRef.value && mapContainerRef.value.offsetHeight > 0) {
        console.log('[SupplyChainMap] 容器高度:', mapContainerRef.value.offsetHeight)
        initMap()
      } else {
        console.warn('[SupplyChainMap] 容器高度为0，延迟100ms后重试')
        setTimeout(checkAndInit, 100)
      }
    }
    checkAndInit()
  })
  bindContainerResize()
})

onBeforeUnmount(() => {
  containerResizeObserver?.disconnect()
  containerResizeObserver = null
  clearShipAnimations()

  if (map.value) {
    map.value.off('moveend')
    map.value.off('zoomend')

    clearCanvasLayer(map.value)

    portMarkers.value.forEach(marker => map.value.removeLayer(marker))

    clearPortConnections()

    if (portConnectionLayer.value) {
      map.value.removeLayer(portConnectionLayer.value)
      portConnectionLayer.value = null
    }

    if (markerClusterGroup.value) {
      map.value.removeLayer(markerClusterGroup.value)
      markerClusterGroup.value = null
    }

    destroyMap(map.value)
    map.value = null
  }

  portMarkers.value = []
  console.log('[SupplyChainMap] 地图资源已清理')
})
</script>

<style scoped>
.supply-chain-map {
  height: 100%;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #EBEEF5;
  background: #fff;
  z-index: 10;
  flex-shrink: 0;
}

.map-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.map-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  color: #409EFF;
}

.map-container {
  flex: 1;
  width: 100%;
  min-height: 400px;
  position: relative;
}

.map-container :deep(.leaflet-container) {
  width: 100% !important;
  height: 100% !important;
}

.map-container :deep(.port-curve-connection) {
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.map-container :deep(.ship-marker-icon) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.map-container :deep(.ship-tooltip) {
  background: rgba(15, 23, 42, 0.9);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  padding: 4px 8px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.22);
}

.map-container :deep(.ship-tooltip::before) {
  border-top-color: rgba(15, 23, 42, 0.9);
}

.map-container :deep(.route-tooltip) {
  background: rgba(15, 23, 42, 0.9);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 8px;
  max-width: 360px;
  line-height: 1.5;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.22);
}

.map-container :deep(.route-tooltip::before) {
  border-top-color: rgba(15, 23, 42, 0.9);
}

.map-container :deep(.route-label-icon span) {
  display: inline-block;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(100, 116, 139, 0.25);
  color: #334155;
  font-size: 10px;
  line-height: 1;
  font-weight: 600;
  border-radius: 999px;
  padding: 3px 6px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
  pointer-events: none;
  backdrop-filter: blur(4px);
}

.map-container :deep(.clean-port-pin-icon) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.map-container :deep(.clean-port-tooltip) {
  background: rgba(15, 23, 42, 0.88);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  padding: 5px 8px;
  line-height: 1.45;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.22);
}

.map-container :deep(.clean-port-tooltip::before) {
  border-top-color: rgba(15, 23, 42, 0.88);
}

.map-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
  min-width: 120px;
}

.legend-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #303133;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #606266;
}

.legend-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.port-icon {
  background-color: #409EFF;
}

.cluster-icon {
  opacity: 0.6;
}
</style>
