<template>
  <div class="network-graph">
    <div class="graph-header">
      <h3>企业协作网络</h3>
      <div class="graph-controls">
        <el-tag v-if="stats" type="info" size="small">
          {{ stats.nodeCount || 0 }} 企业 / {{ stats.edgeCount || 0 }} 协作关系
        </el-tag>
      </div>
    </div>

    <div v-if="loading" class="graph-loading">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
      <span>网络加载中...</span>
    </div>

    <div v-else-if="!hasData" class="graph-empty">
      <el-empty description="暂无协作关系数据" :image-size="100">
        <template #description>
          <p style="color: #909399; font-size: 14px; margin: 8px 0;">
            当前数据中没有详细的企业协作关系信息
          </p>
          <p style="color: #c0c4cc; font-size: 12px;">
            协作次数统计: {{ collaborationCount }}
          </p>
        </template>
      </el-empty>
    </div>

    <div v-else ref="chartRef" class="graph-container"></div>

    <div v-if="!loading && hasData" class="graph-legend">
      <div class="legend-grid">
        <span class="legend-dot" style="background: #1d4ed8;"></span><span>制造商</span>
        <span class="legend-dot" style="background: #d97706;"></span><span>销售商</span>
        <span class="legend-line" style="background: #0f766e;"></span><span>制造↔制造</span>
        <span class="legend-line" style="background: #475569;"></span><span>制造↔销售</span>
        <span class="legend-line" style="background: #b45309;"></span><span>销售↔销售</span>
        <span class="legend-size-hint">
          <span class="legend-size-dot sm"></span>
          <span class="legend-size-dot md"></span>
          <span class="legend-size-dot lg"></span>
          <span>资产规模</span>
        </span>
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

const currentNetwork = computed(() => store.currentNetwork)

const collaborationEdges = computed(() => {
  const storeEdges = store.filteredCollaborationEdges
  if (storeEdges && storeEdges.length > 0) return storeEdges

  const network = currentNetwork.value
  return network?.collaboration_edges
    || network?.collaborationEdges
    || network?.edges
    || []
})

// 节点信息查找表
const nodesLookup = computed(() => {
  const nodes = store.collaborationNetwork.nodes
  if (!nodes || nodes.length === 0) return new Map()
  const map = new Map()
  nodes.forEach(n => map.set(n.name, n))
  return map
})

// 从当前月份过滤后的边中提取活跃节点
const activeNodes = computed(() => {
  const edges = collaborationEdges.value
  const lookup = nodesLookup.value
  const nodeMap = new Map()

  edges.forEach(edge => {
    if (!nodeMap.has(edge.source)) {
      const storeNode = lookup.get(edge.source)
      const type = storeNode?.enterprise_type || edge.source_type || 'Manufacturer'
      nodeMap.set(edge.source, {
        id: edge.source, name: edge.source,
        type, category: getCategoryIndex(type),
        assetScale: pickAssetScale(storeNode)
      })
    }
    if (!nodeMap.has(edge.target)) {
      const storeNode = lookup.get(edge.target)
      const type = storeNode?.enterprise_type || edge.target_type || 'Manufacturer'
      nodeMap.set(edge.target, {
        id: edge.target, name: edge.target,
        type, category: getCategoryIndex(type),
        assetScale: pickAssetScale(storeNode)
      })
    }
  })
  return Array.from(nodeMap.values())
})

const hasData = computed(() => collaborationEdges.value.length > 0)

const collaborationCount = computed(() => collaborationEdges.value.length)

const stats = computed(() => {
  if (!hasData.value) return null
  return { nodeCount: activeNodes.value.length, edgeCount: collaborationEdges.value.length }
})

const chartRef = ref(null)
let chart = null

const typeColors = {
  'Manufacturer': '#1d4ed8',
  'Retailer': '#d97706',
  '制造商': '#1d4ed8',
  '销售商': '#d97706'
}

// 只有两类：制造商(0)、销售商(1)
function getCategoryIndex(type) {
  if (!type) return 0
  if (type.includes('Retailer') || type.includes('销售商')) return 1
  return 0 // 制造商及其他
}

function getTypeColor(type) {
  return typeColors[type] || '#67C23A'
}

/** 从节点静态数据取「资产规模」用于节点大小（与后端 asset_scale / 购销额一致） */
function pickAssetScale(storeNode) {
  if (!storeNode) return 0
  const scaled = Number(storeNode.asset_scale)
  if (Number.isFinite(scaled) && scaled > 0) return scaled
  const purchase = Number(storeNode.total_purchase) || 0
  const sales = Number(storeNode.total_sales) || 0
  return Math.max(purchase, sales, 0)
}

/** 将一组正数映射到 [outMin, outMax]，sqrt 压缩极值跨度 */
function sqrtNormalizer(values, outMin, outMax) {
  const pts = values.map(v => Math.sqrt(Math.max(v, 0)))
  let lo = Math.min(...pts)
  let hi = Math.max(...pts)
  if (!Number.isFinite(lo)) lo = 0
  if (!Number.isFinite(hi)) hi = 0
  if (hi - lo < 1e-9) {
    return () => (outMin + outMax) / 2
  }
  return (v) => {
    const t = (Math.sqrt(Math.max(v, 0)) - lo) / (hi - lo)
    return outMin + Math.max(0, Math.min(1, t)) * (outMax - outMin)
  }
}

/** 连边配色方案 —— 按企业类型配对分三色 */
const EDGE_PALETTES = {
  'mfg-mfg':       { lo: [191, 219, 254], hi: [15, 118, 110] },  // 蓝绿
  'mfg-retail':    { lo: [203, 213, 225], hi: [71, 85, 105] },   // 石板灰，减少冲突色
  'retail-retail': { lo: [253, 230, 138], hi: [180, 83, 9] },    // 琥珀棕
}

function getEdgePairingKey(sourceType, targetType) {
  const isMfg = (t) => !t || t.includes('Manufacturer') || t.includes('制造')
  const a = isMfg(sourceType) ? 'mfg' : 'retail'
  const b = isMfg(targetType) ? 'mfg' : 'retail'
  return [a, b].sort().join('-')
}

function edgeColorFromPairing(t, pairingKey) {
  const palette = EDGE_PALETTES[pairingKey] || EDGE_PALETTES['mfg-retail']
  const u = Math.max(0, Math.min(1, t))
  const r = Math.round(palette.lo[0] + (palette.hi[0] - palette.lo[0]) * u)
  const g = Math.round(palette.lo[1] + (palette.hi[1] - palette.lo[1]) * u)
  const b = Math.round(palette.lo[2] + (palette.hi[2] - palette.lo[2]) * u)
  return `rgb(${r},${g},${b})`
}

/** 与 sqrtNormalizer 同步的强度 t，用于上色 */
function sqrtStrength(values) {
  const pts = values.map(v => Math.sqrt(Math.max(v, 0)))
  let lo = Math.min(...pts)
  let hi = Math.max(...pts)
  if (!Number.isFinite(lo)) lo = 0
  if (!Number.isFinite(hi)) hi = 0
  if (hi - lo < 1e-9) {
    return () => 0.5
  }
  return (v) => {
    const t = (Math.sqrt(Math.max(v, 0)) - lo) / (hi - lo)
    return Math.max(0, Math.min(1, t))
  }
}

// 用节点 id 生成确定性的伪随机偏移，同一节点每次渲染位置一致
function hashId(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  return (h & 0x7fffffff) / 0x7fffffff // 0~1
}

// 计算节点位置：制造商左侧，销售商右侧，葵花籽螺旋分布
function computePositions(nodes, w, h, degreeMap) {
  // 两个簇中心（拉远减轻跨簇连边拥挤感）
  const centers = [
    { x: w * 0.2, y: h * 0.5 },  // 制造商（左）
    { x: w * 0.8, y: h * 0.5 },  // 销售商（右）
  ]

  // 按类型分组并按度数降序排列（高度数节点靠近中心）
  const groups = [[], []]
  nodes.forEach(n => groups[n.category].push(n))
  groups.forEach(g => g.sort((a, b) => (degreeMap.get(b.id) || 0) - (degreeMap.get(a.id) || 0)))

  const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // ~137.5°
  const maxRadius = Math.min(w * 0.36, h * 0.48)

  const positions = new Map()

  groups.forEach((group, cat) => {
    const cx = centers[cat].x
    const cy = centers[cat].y
    const count = group.length

    group.forEach((n, idx) => {
      if (count === 1) {
        positions.set(n.id, { x: cx, y: cy })
        return
      }
      // 葵花籽螺旋：半径随序号增大，角度按黄金角递增
      const r = maxRadius * Math.sqrt((idx + 1) / count) * 0.98
      const angle = idx * goldenAngle + hashId(n.id) * 0.55 // 抖动略增，减轻节点叠压
      positions.set(n.id, {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      })
    })
  })

  return positions
}

let renderTimer = null

function renderChart() {
  if (!chartRef.value) return
  if (!hasData.value) {
    if (chart) chart.clear()
    return
  }

  const el = chartRef.value
  if (el.clientWidth === 0 || el.clientHeight === 0) {
    setTimeout(renderChart, 200)
    return
  }

  if (!chart) {
    chart = echarts.init(el)
  }

  const edges = collaborationEdges.value
  const nodes = activeNodes.value
  const w = el.clientWidth
  const h = el.clientHeight

  const degreeMap = new Map()
  edges.forEach(edge => {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1)
    degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1)
  })

  // 每次渲染重新计算位置（基于全量节点集合）
  const positions = computePositions(nodes, w, h, degreeMap)

  const rawAssets = nodes.map(n => {
    const a = n.assetScale || 0
    if (a > 0) return a
    const d = degreeMap.get(n.id) || 1
    return d
  })
  const nodeSize = sqrtNormalizer(rawAssets, 12, 44)

  const collabWeights = edges.map(e =>
    Number(e.transaction_count) || Number(e.collaboration_count) || Number(e.weight) || 1
  )
  const edgeCount = collabWeights.length
  // 边很多时进一步压低弱边存在感，避免「糊成一团」
  const dense = edgeCount > 100
  const edgeWidth = sqrtNormalizer(collabWeights, dense ? 0.55 : 0.65, dense ? 4.2 : 5.5)
  const edgeOpacity = sqrtNormalizer(collabWeights, dense ? 0.06 : 0.1, dense ? 0.38 : 0.48)
  const edgeStrength = sqrtStrength(collabWeights)

  const graphNodes = nodes.map((n, idx) => {
    const pos = positions.get(n.id)
    const degree = degreeMap.get(n.id) || 0
    const asset = n.assetScale > 0 ? n.assetScale : (degree || 1)
    return {
      id: n.id,
      name: n.name,
      x: pos.x,
      y: pos.y,
      symbolSize: nodeSize(rawAssets[idx]),
      category: n.category,
      itemStyle: {
        color: getTypeColor(n.type),
        borderColor: 'rgba(255,255,255,0.92)',
        borderWidth: 2,
        shadowBlur: 10,
        shadowColor: 'rgba(15, 23, 42, 0.18)',
        opacity: degree === 0 ? 0.4 : 1
      },
      label: { show: false },
      enterpriseType: n.type,
      assetScale: asset,
      collabDegree: degree
    }
  })

  // 构建节点类型快速查找表
  const nodeTypeMap = new Map()
  nodes.forEach(n => nodeTypeMap.set(n.id, n.type))

  const graphEdges = edges.map((e, i) => {
    const weight = collabWeights[i]
    const t = edgeStrength(weight)
    const pairingKey = getEdgePairingKey(
      nodeTypeMap.get(e.source) || e.source_type,
      nodeTypeMap.get(e.target) || e.target_type
    )
    return {
      source: e.source,
      target: e.target,
      collabCount: weight,
      pairingType: pairingKey,
      lineStyle: {
        width: edgeWidth(weight),
        opacity: edgeOpacity(weight),
        color: edgeColorFromPairing(t, pairingKey),
        curveness: 0
      }
    }
  })

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#334155', fontSize: 12 },
      formatter: (p) => {
        if (p.dataType === 'node') {
          const d = p.data
          const assetStr = Number.isFinite(d.assetScale) && d.assetScale > 0
            ? d.assetScale.toFixed(2)
            : '—'
          return `<div style="max-width:240px"><b>${d.name}</b><br/>类型: ${d.enterpriseType}<br/>资产规模: ${assetStr}<br/>协作关系数: ${d.collabDegree}</div>`
        } else if (p.dataType === 'edge') {
          const c = p.data.collabCount
          return `<div>${p.data.source} → ${p.data.target}<br/>协作次数: <b>${c}</b></div>`
        }
        return ''
      }
    },
    animationDuration: 300,
    animationEasingUpdate: 'cubicOut',
    series: [{
      type: 'graph',
      layout: 'none',
      data: graphNodes,
      edges: graphEdges,
      categories: [
        { name: '制造商' },
        { name: '销售商' }
      ],
      roam: true,
      draggable: true,
      emphasis: {
        focus: 'adjacency',
        scale: 1.06,
        label: { show: true, fontSize: 11, color: '#0f172a' },
        itemStyle: {
          shadowBlur: 16,
          shadowColor: 'rgba(15, 23, 42, 0.22)'
        },
        lineStyle: { opacity: 0.92, width: 4 }
      },
      blur: {
        itemStyle: { opacity: 0.35 },
        lineStyle: { opacity: 0.08, width: 0.5 }
      },
      label: {
        show: false,
        position: 'right',
        formatter: '{b}',
        fontSize: 10
      },
      lineStyle: { curveness: 0, cap: 'butt', join: 'miter' }
    }]
  }, true)
}

function handleResize() {
  chart?.resize()
  nextTick(renderChart)
}

watch([collaborationEdges, currentMonth], () => {
  clearTimeout(renderTimer)
  renderTimer = setTimeout(() => nextTick(renderChart), 50)
}, { deep: true })

onMounted(() => {
  setTimeout(() => renderChart(), 300)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  clearTimeout(renderTimer)
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.network-graph {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(165deg, #f8fafc 0%, #f1f5f9 48%, #eef2ff 100%);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06);
  position: relative;
  overflow: hidden;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(6px);
}

.graph-header h3 { margin: 0; font-size: 14px; font-weight: 600; }

.graph-controls { display: flex; align-items: center; }

.graph-loading {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 10;
  color: #909399;
}

.graph-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.graph-container {
  flex: 1;
  min-height: 0;
  width: 100%;
}

.graph-legend {
  position: absolute;
  bottom: 8px; left: 8px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  color: #475569;
  z-index: 5;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.legend-grid {
  display: grid;
  grid-template-columns: auto auto;
  gap: 3px 6px;
  align-items: center;
}

.legend-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.legend-line {
  width: 14px; height: 2.5px;
  display: inline-block;
  border-radius: 1px;
}

.legend-size-hint {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 2px;
  padding-top: 3px;
  border-top: 1px dashed rgba(148, 163, 184, 0.35);
  color: #64748b;
  font-size: 10px;
}

.legend-size-dot {
  border-radius: 50%;
  background: #94a3b8;
  opacity: 0.85;
}
.legend-size-dot.sm { width: 6px; height: 6px; }
.legend-size-dot.md { width: 10px; height: 10px; }
.legend-size-dot.lg { width: 16px; height: 16px; }
</style>
