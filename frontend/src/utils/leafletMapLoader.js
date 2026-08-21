/**
 * Leaflet Map Loader
 * 使用 Leaflet.js + 高德瓦片服务的轻量级地图加载器
 *
 * @author SGM-MSE Team
 * @date 2026-01-28
 */

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

/**
 * 创建 Leaflet 地图实例
 * @param {HTMLElement} container - 地图容器DOM元素
 * @param {Object} options - 地图配置选项
 * @returns {L.Map} Leaflet地图实例
 */
export function createLeafletMap(container, options = {}) {
  const defaultOptions = {
    center: [39.90923, 116.397428], // 北京 [纬度, 经度]
    zoom: 4,
    minZoom: 3,
    maxZoom: 18,
    zoomControl: true,
    attributionControl: false, // 隐藏版权信息
    ...options
  }

  const map = L.map(container, defaultOptions)

  // 添加高德地图瓦片图层（矢量底图）
  const amapLayer = L.tileLayer(
    'https://webst0{s}.is.autonavi.com/appmaptile?style=7&x={x}&y={y}&z={z}',
    {
      subdomains: ['1', '2', '3', '4'], // 高德有4个子域名用于负载均衡
      attribution: '高德地图',
      maxZoom: 18
    }
  )

  // 将图层添加到地图
  amapLayer.addTo(map)

  console.log('[LeafletMapLoader] 地图初始化成功（使用高德矢量底图）')

  return map
}

/**
 * 创建自定义标记图标
 * @param {Object} options - 图标配置
 * @returns {L.DivIcon} Leaflet DivIcon
 */
export function createCustomMarker(options = {}) {
  const {
    size = 30,
    color = '#409EFF',
    text = '',
    className = 'custom-marker'
  } = options

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: 3px solid #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: bold;
      font-size: ${Math.max(12, size / 3)}px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      transition: transform 0.2s;
    ">
      ${text}
    </div>
  `

  return L.divIcon({
    html: html,
    className: className,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
}

/**
 * 创建聚类标记组
 * @param {L.Map} map - Leaflet地图实例
 * @param {Object} options - 聚类配置
 * @returns {L.MarkerClusterGroup} 聚类组
 */
export function createMarkerCluster(map, options = {}) {
  const defaultOptions = {
    maxClusterRadius: 60, // 聚类半径
    spiderfyOnMaxZoom: true, // 最大缩放时展开
    showCoverageOnHover: false, // 悬停时不显示覆盖范围
    zoomToBoundsOnClick: true, // 点击时缩放到边界
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount()
      const size = Math.round(30 + Math.min(Math.pow(count / 2, 0.6) * 10, 40))

      // 获取聚类中的主要国家（用于配色）
      const markers = cluster.getAllChildMarkers()
      const countries = markers.map(m => m.options.country || '其他')
      const mainCountry = countries.sort((a, b) =>
        countries.filter(c => c === a).length - countries.filter(c => c === b).length
      ).pop()

      const colorMap = {
        '中国': '#409EFF',
        '美国': '#67C23A',
        '日本': '#E6A23C',
        '德国': '#F56C6C',
        '英国': '#909399',
        '韩国': '#E6A23C',
        '新加坡': '#67C23A',
        '印度': '#F56C6C',
        '荷兰': '#409EFF',
        '法国': '#909399'
      }
      const color = colorMap[mainCountry] || '#909399'

      const html = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background-color: ${color};
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: ${Math.max(12, size / 3)}px;
          border: 3px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          transition: transform 0.2s;
        ">
          ${count}
        </div>
      `

      return L.divIcon({
        html: html,
        className: 'marker-cluster-custom',
        iconSize: [size, size]
      })
    },
    ...options
  }

  return L.markerClusterGroup(defaultOptions)
}

/**
 * 创建Canvas图层用于绘制连接线
 * @param {L.Map} map - Leaflet地图实例
 * @returns {L.Canvas} Canvas图层
 */
export function createCanvasLayer(map) {
  const canvas = L.canvas({ padding: 0.5 })
  return canvas
}

/**
 * 在Canvas上绘制贝塞尔曲线连接线
 * @param {L.Map} map - Leaflet地图实例
 * @param {Array} collaborations - 协作关系数据
 * @param {Object} options - 绘制选项
 */
export function drawCollaborationLines(map, collaborations, options = {}) {
  const {
    defaultColor = 'rgba(64, 158, 255, 0.4)',
    defaultLineWidth = 2,
    colorByType = false,
    widthByStrength = false,
  } = options

  // 创建Canvas覆盖层
  const canvasPane = map.getPanes().overlayPane
  let canvas = canvasPane.querySelector('.collaboration-canvas')

  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.className = 'collaboration-canvas'
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '400'
    canvasPane.appendChild(canvas)
  }

  const size = map.getSize()
  canvas.width = size.x
  canvas.height = size.y

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!collaborations || collaborations.length === 0) {
    return canvas
  }

  ctx.lineCap = 'round'

  // 获取可见边界
  const bounds = map.getBounds()

  // 按企业类型配对的配色方案
  const TYPE_COLORS = {
    'mfg-mfg':       'rgba(16, 124, 96, 0.45)',   // 青绿 teal：制造商↔制造商
    'mfg-retail':    'rgba(64, 158, 255, 0.4)',    // 蓝色 blue：制造商↔销售商
    'retail-retail': 'rgba(234, 128, 28, 0.4)',    // 琥珀 amber：销售商↔销售商
  }

  function getPairingKey(collab) {
    const isMfg = (t) => !t || /Manufacturer|制造/.test(t)
    const a = isMfg(collab.source_type) ? 'mfg' : 'retail'
    const b = isMfg(collab.target_type) ? 'mfg' : 'retail'
    return [a, b].sort().join('-')
  }

  // 计算强度范围（用于线宽映射）
  let minStrength = Infinity, maxStrength = -Infinity
  if (widthByStrength) {
    collaborations.forEach(c => {
      const s = c.transaction_count || c.collaboration_probability || 1
      if (s < minStrength) minStrength = s
      if (s > maxStrength) maxStrength = s
    })
    if (maxStrength - minStrength < 1e-9) { minStrength = 0; maxStrength = 1 }
  }

  // 逐边绘制（颜色/粗细可能不同，不能批量）
  collaborations.forEach(collab => {
    if (!collab.from_coords || !collab.to_coords) return

    const fromLng = collab.from_coords.longitude
    const fromLat = collab.from_coords.latitude
    const toLng = collab.to_coords.longitude
    const toLat = collab.to_coords.latitude

    // 检查是否在可见范围内
    if (!bounds.contains([fromLat, fromLng]) && !bounds.contains([toLat, toLng])) {
      return
    }

    // 转换为屏幕坐标
    const fromPoint = map.latLngToContainerPoint([fromLat, fromLng])
    const toPoint = map.latLngToContainerPoint([toLat, toLng])

    // 确定颜色
    if (colorByType) {
      const key = getPairingKey(collab)
      ctx.strokeStyle = TYPE_COLORS[key] || defaultColor
    } else {
      ctx.strokeStyle = defaultColor
    }

    // 确定线宽
    if (widthByStrength) {
      const s = collab.transaction_count || collab.collaboration_probability || 1
      const t = (s - minStrength) / (maxStrength - minStrength)
      ctx.lineWidth = 1 + t * 3  // 1px ~ 4px
    } else {
      ctx.lineWidth = defaultLineWidth
    }

    // 绘制贝塞尔曲线
    ctx.beginPath()
    ctx.moveTo(fromPoint.x, fromPoint.y)
    const midX = (fromPoint.x + toPoint.x) / 2
    const midY = (fromPoint.y + toPoint.y) / 2
    const offsetY = -Math.abs(fromPoint.x - toPoint.x) * 0.15
    ctx.quadraticCurveTo(midX, midY + offsetY, toPoint.x, toPoint.y)
    ctx.stroke()
  })

  return canvas
}

/**
 * 清除Canvas图层
 * @param {L.Map} map - Leaflet地图实例
 */
export function clearCanvasLayer(map) {
  const canvasPane = map.getPanes().overlayPane
  const canvas = canvasPane.querySelector('.collaboration-canvas')
  if (canvas) {
    canvas.remove()
  }
}

/**
 * 销毁地图实例
 * @param {L.Map} map - Leaflet地图实例
 */
export function destroyMap(map) {
  if (map) {
    clearCanvasLayer(map)
    map.remove()
    console.log('[LeafletMapLoader] 地图实例已销毁')
  }
}

export default {
  createLeafletMap,
  createCustomMarker,
  createMarkerCluster,
  createCanvasLayer,
  drawCollaborationLines,
  clearCanvasLayer,
  destroyMap
}
