<template>
  <div class="vcg-root">
    <div ref="chartRef" class="vcg-canvas"></div>

    <!-- 因果明细条 -->
    <div class="vcg-detail">
      <template v-if="selectedMeta">
        <div class="vcg-detail-head">
          <strong>{{ selectedMeta.name }}</strong>
          <span class="vcg-tier-tag" :style="{ color: selectedMeta.color }">● {{ selectedMeta.tier }}层</span>
          <el-tag size="small" effect="plain" round class="vcg-clear-tip">点击节点取消选中</el-tag>
        </div>
        <div v-if="inEdges.length" class="vcg-group">
          <span class="vcg-group-label">入边 {{ inEdges.length }}</span>
          <div v-for="(e, i) in inEdges" :key="'in' + i" class="vcg-edge-row">
            <span class="vcg-src">{{ e.source }}</span><span class="vcg-arrow">→</span><span class="vcg-tgt">{{ e.target }}</span>
            <el-tag size="small" :type="tagType(e.strength)" effect="light" round>{{ strengthLabel(e.strength) }}</el-tag>
            <span class="vcg-desc">{{ e.description }}</span>
          </div>
        </div>
        <div v-if="outEdges.length" class="vcg-group">
          <span class="vcg-group-label">出边 {{ outEdges.length }}</span>
          <div v-for="(e, i) in outEdges" :key="'out' + i" class="vcg-edge-row">
            <span class="vcg-src">{{ e.source }}</span><span class="vcg-arrow">→</span><span class="vcg-tgt">{{ e.target }}</span>
            <el-tag size="small" :type="tagType(e.strength)" effect="light" round>{{ strengthLabel(e.strength) }}</el-tag>
            <span class="vcg-desc">{{ e.description }}</span>
          </div>
        </div>
        <div v-if="!inEdges.length && !outEdges.length" class="vcg-empty">该变量暂无关联因果边</div>
      </template>
      <template v-else>
        <div class="vcg-detail-head">
          <strong>主导因果链</strong>
          <span class="vcg-tier-tag">微观 → 中观 → 宏观</span>
          <span class="vcg-hint">点击任一节点查看入边 / 出边明细</span>
        </div>
        <div v-for="(e, i) in defaultChainEdges" :key="'chain' + i" class="vcg-edge-row">
          <span class="vcg-src">{{ e.source }}</span><span class="vcg-arrow">→</span><span class="vcg-tgt">{{ e.target }}</span>
          <el-tag size="small" :type="tagType(e.strength)" effect="light" round>{{ strengthLabel(e.strength) }}</el-tag>
          <span class="vcg-desc">{{ e.description }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

defineOptions({ name: 'VerticalCausalGraph' })

const props = defineProps({
  edges: {
    type: Array,
    default: () => []
  }
})

// ---------- 微观 / 中观 / 宏观 分层 ----------
const TIERS = Object.freeze([
  { key: 'micro', label: '微观', color: '#3b82f6', dark: '#1d4ed8', textColor: '#ffffff', visualIndex: 2 },
  { key: 'meso', label: '中观', color: '#eab308', dark: '#ca8a04', textColor: '#3f2d00', visualIndex: 1 },
  { key: 'macro', label: '宏观', color: '#22c55e', dark: '#16a34a', textColor: '#ffffff', visualIndex: 0 }
])

const TIER_NODES = Object.freeze({
  micro: ['铀矿产能', '新矿投产阈值', '铀需求强度', '产能爬坡速率'],
  meso: ['月均订单处理量', '网络协作密度', '供应链节点数'],
  macro: ['供应完成率', '网络韧性', '系统总利润']
})

// 默认态展示的主导因果链
const DEFAULT_CHAIN = Object.freeze([
  { source: '铀需求强度', target: '月均订单处理量' },
  { source: '月均订单处理量', target: '供应完成率' },
  { source: '供应完成率', target: '系统总利润' }
])

// ---------- 布局常量 ----------
const NODE_H = 46
const GUTTER_W = 64
const PAD_TOP = 24
const PAD_BOTTOM = 12
const PAD_RIGHT = 12

const chartRef = ref(null)
const selectedVar = ref('')

let chart = null
let resizeObserver = null
let resizeFrame = null
let renderFrame = null

const nameToTier = new Map()
TIERS.forEach((t) => TIER_NODES[t.key].forEach((nm) => nameToTier.set(nm, t)))

function tierOf(name) {
  return nameToTier.get(name) || null
}

function calcLayerH(H) {
  return Math.max(76, (H - PAD_TOP - PAD_BOTTOM - NODE_H) / (TIERS.length - 1))
}

function buildPositions(W, H) {
  const usableW = Math.max(120, W - GUTTER_W - PAD_RIGHT)
  const layerH = calcLayerH(H)
  const pos = {}
  TIERS.forEach((t) => {
    const names = TIER_NODES[t.key]
    const n = names.length
    const gap = 24
    const nodeW = Math.max(88, Math.min(168, (usableW - (n - 1) * gap) / n))
    const totalW = n * nodeW + (n - 1) * gap
    const startX = GUTTER_W + Math.max(0, (usableW - totalW) / 2)
    const y = PAD_TOP + NODE_H / 2 + t.visualIndex * layerH
    names.forEach((name, i) => {
      pos[name] = { x: startX + i * (nodeW + gap) + nodeW / 2, y, w: nodeW }
    })
  })
  return pos
}

function buildGraphic(W, H, layerH) {
  return TIERS.flatMap((t) => {
    const y = PAD_TOP + NODE_H / 2 + t.visualIndex * layerH
    return [
      {
        type: 'rect',
        silent: true,
        z: 0,
        shape: { x: GUTTER_W - 8, y: y - NODE_H / 2 - 8, width: W - GUTTER_W - PAD_RIGHT + 8, height: NODE_H + 16, r: 10 },
        style: { fill: `${t.color}0D` }
      },
      {
        type: 'text',
        silent: true,
        z: 3,
        left: 10,
        top: y - 9,
        style: {
          text: t.label,
          fontSize: 12,
          fontWeight: 700,
          fill: t.color,
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderRadius: 6,
          padding: [4, 6]
        }
      }
    ]
  })
}

function buildOption(W, H) {
  const pos = buildPositions(W, H)
  const layerH = calcLayerH(H)
  const selected = selectedVar.value

  // 选中节点的邻居集合（含选中节点本身）
  const neighborNames = selected ? new Set([selected]) : null
  if (selected) {
    props.edges.forEach((e) => {
      if (e.source === selected) neighborNames.add(e.target)
      if (e.target === selected) neighborNames.add(e.source)
    })
  }

  const nodes = []
  TIERS.forEach((t) => {
    TIER_NODES[t.key].forEach((name) => {
      const p = pos[name]
      const isSel = name === selected
      const isDim = selected ? !neighborNames.has(name) : false
      nodes.push({
        id: name,
        name,
        x: p.x,
        y: p.y,
        symbol: 'roundRect',
        symbolSize: [p.w, NODE_H],
        itemStyle: {
          color: t.color,
          borderColor: isSel ? '#0f172a' : t.dark,
          borderWidth: isSel ? 3 : 1,
          borderRadius: 8,
          shadowBlur: isSel ? 14 : 0,
          shadowColor: 'rgba(15, 23, 42, 0.35)',
          opacity: isDim ? 0.22 : 1
        },
        label: {
          show: true,
          position: 'inside',
          width: p.w - 12,
          overflow: 'break',
          color: t.textColor,
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 14
        },
        tier: t.label
      })
    })
  })

  const defaultChainSet = new Set(DEFAULT_CHAIN.map((c) => `${c.source}>${c.target}`))
  const links = props.edges.map((e) => {
    const s = Number(e.strength) || 0
    const negative = s < 0
    const st = nameToTier.get(e.source)
    const tt = nameToTier.get(e.target)
    const tierDist = Math.abs((st?.visualIndex ?? 2) - (tt?.visualIndex ?? 0))
    const isChain = !selected && defaultChainSet.has(`${e.source}>${e.target}`)
    const isRelated = selected ? e.source === selected || e.target === selected : false
    return {
      source: e.source,
      target: e.target,
      strength: s,
      description: e.description,
      lineStyle: {
        color: negative ? '#ef4444' : isChain ? '#2563eb' : '#64748b',
        width: 1.2 + Math.abs(s) * 2.6 + (isChain ? 1 : 0),
        opacity: selected ? (isRelated ? 1 : 0.12) : 0.35 + Math.abs(s) * 0.6,
        curveness: tierDist === 0 ? 0.3 : tierDist > 1 ? 0.2 : 0.12,
        type: negative ? 'dashed' : 'solid'
      },
      edgeLabel: Math.abs(s) >= 0.6
        ? {
            show: true,
            position: 'middle',
            formatter: () => `${Math.round(s * 100)}%`,
            fontSize: 10,
            fontWeight: 700,
            color: negative ? '#ef4444' : '#475569',
            backgroundColor: '#ffffff',
            borderRadius: 8,
            padding: [2, 5]
          }
        : { show: false }
    }
  })

  return {
    backgroundColor: 'transparent',
    animationDuration: 300,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#dbe4f0',
      borderWidth: 1,
      textStyle: { color: '#334155' },
      formatter(params) {
        if (params.dataType === 'edge') {
          const l = params.data || {}
          return `<b>${l.source} → ${l.target}</b><br/>强度 ${Math.round((Number(l.strength) || 0) * 100)}%${l.description ? `<br/>${l.description}` : ''}`
        }
        const n = params.data || {}
        return `<b>${n.name || ''}</b>${n.tier ? `<br/><span style="color:#94a3b8">${n.tier} 层</span>` : ''}`
      }
    },
    graphic: buildGraphic(W, H, layerH),
    series: [
      {
        type: 'graph',
        layout: 'none',
        roam: false,
        draggable: false,
        z: 2,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 8,
        lineStyle: { curveness: 0.12, opacity: 0.7 },
        emphasis: { focus: 'adjacency' },
        label: { show: false },
        data: nodes,
        links
      }
    ]
  }
}

function render() {
  if (!chart || !chartRef.value) return
  const rect = chartRef.value.getBoundingClientRect()
  chart.setOption(buildOption(rect.width || 600, rect.height || 440), true)
}

function scheduleRender() {
  if (renderFrame !== null) cancelAnimationFrame(renderFrame)
  renderFrame = requestAnimationFrame(() => {
    renderFrame = null
    render()
  })
}

function handleResize() {
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null
    if (!chart) return
    chart.resize()
    render()
  })
}

function bindClick() {
  if (!chart) return
  chart.off('click')
  chart.on('click', (p) => {
    if (p?.seriesType !== 'graph') return
    const name = p.data?.name
    if (!name) return
    selectedVar.value = selectedVar.value === name ? '' : name
    scheduleRender()
  })
}

// ---------- 明细条数据 ----------
const selectedMeta = computed(() => {
  if (!selectedVar.value) return null
  const t = tierOf(selectedVar.value)
  return { name: selectedVar.value, tier: t?.label || '—', color: t?.color || '#64748b' }
})
const inEdges = computed(() => props.edges.filter((e) => e.target === selectedVar.value))
const outEdges = computed(() => props.edges.filter((e) => e.source === selectedVar.value))
const defaultChainEdges = computed(() =>
  DEFAULT_CHAIN
    .map((c) => props.edges.find((e) => e.source === c.source && e.target === c.target))
    .filter(Boolean)
)

function tagType(s) {
  const n = Number(s) || 0
  if (n > 0.6) return 'success'
  if (n > 0.4) return 'warning'
  return 'info'
}

function strengthLabel(s) {
  return `${Math.round((Number(s) || 0) * 100)}%`
}

watch(() => props.edges, () => scheduleRender(), { deep: true })

onMounted(() => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value, null, {
    renderer: 'canvas',
    devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.25)
  })
  bindClick()
  render()
  window.addEventListener('resize', handleResize)
  if (typeof ResizeObserver !== 'undefined' && chartRef.value) {
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(chartRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  resizeObserver?.disconnect()
  resizeObserver = null
  if (renderFrame !== null) cancelAnimationFrame(renderFrame)
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<style scoped>
.vcg-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.vcg-canvas {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
}

.vcg-detail {
  flex: 0 0 auto;
  max-height: 132px;
  overflow-y: auto;
  padding: 8px 10px;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  background: #fafbfc;
}

.vcg-detail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #0f172a;
}

.vcg-detail-head strong {
  font-weight: 800;
}

.vcg-tier-tag {
  font-size: 11px;
  font-weight: 700;
}

.vcg-hint {
  margin-left: auto;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
}

.vcg-clear-tip {
  margin-left: auto;
}

.vcg-group {
  margin-top: 4px;
}

.vcg-group-label {
  display: block;
  margin-bottom: 2px;
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
}

.vcg-edge-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 6px;
  font-size: 12px;
}

.vcg-edge-row:hover {
  background: #f1f5f9;
}

.vcg-src {
  color: #3b82f6;
  font-weight: 700;
  white-space: nowrap;
}

.vcg-tgt {
  color: #22c55e;
  font-weight: 700;
  white-space: nowrap;
}

.vcg-arrow {
  color: #94a3b8;
  white-space: nowrap;
}

.vcg-desc {
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vcg-empty {
  padding: 8px 0;
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
}

.vcg-detail :deep(.el-tag) {
  flex: 0 0 auto;
  height: 20px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 700;
}
</style>
