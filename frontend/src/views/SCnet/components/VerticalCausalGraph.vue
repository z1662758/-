<template>
  <div class="vcg-root">
    <div ref="chartRef" class="vcg-canvas"></div>

    <!-- 图例：说明线宽 / 线型 / 星号的编码含义 -->
    <div class="vcg-legend">
      <span class="vcg-legend-item"><i class="vcg-line vcg-line-solid"></i>正向传导</span>
      <span class="vcg-legend-item"><i class="vcg-line vcg-line-dashed"></i>负向传导</span>
      <span class="vcg-legend-item">线宽 ∝ |β|</span>
      <span class="vcg-legend-item">*** p&lt;0.001 · ** p&lt;0.01 · * p&lt;0.05</span>
    </div>

    <!-- 因果明细条 -->
    <div class="vcg-detail">
      <template v-if="selectedMeta">
        <div class="vcg-detail-head">
          <strong>{{ selectedMeta.name }}</strong>
          <span class="vcg-tier-tag" :style="{ color: selectedMeta.color }">● {{ selectedMeta.tier }}层</span>
          <span v-if="selectedMeta.observed !== null && selectedMeta.observed !== undefined" class="vcg-observed">
            实测 {{ formatObserved(selectedMeta.observed, selectedMeta.unit) }}
          </span>
          <el-tag size="small" effect="plain" round class="vcg-clear-tip">点击节点取消选中</el-tag>
        </div>
        <div v-if="inEdges.length" class="vcg-group">
          <span class="vcg-group-label">入边 {{ inEdges.length }}</span>
          <div v-for="(e, i) in inEdges" :key="'in' + i" class="vcg-edge-row">
            <span class="vcg-src">{{ e.source }}</span><span class="vcg-arrow">→</span><span class="vcg-tgt">{{ e.target }}</span>
            <el-tag size="small" :type="tagType(e)" effect="light" round>{{ strengthLabel(e) }}</el-tag>
            <span class="vcg-desc">{{ e.description }}</span>
          </div>
        </div>
        <div v-if="outEdges.length" class="vcg-group">
          <span class="vcg-group-label">出边 {{ outEdges.length }}</span>
          <div v-for="(e, i) in outEdges" :key="'out' + i" class="vcg-edge-row">
            <span class="vcg-src">{{ e.source }}</span><span class="vcg-arrow">→</span><span class="vcg-tgt">{{ e.target }}</span>
            <el-tag size="small" :type="tagType(e)" effect="light" round>{{ strengthLabel(e) }}</el-tag>
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
        <div v-if="chainSummary" class="vcg-chain-summary">
          <span class="vcg-src">{{ chainSummary.micro }}</span><span class="vcg-arrow">→</span><span class="vcg-mid">{{ chainSummary.meso }}</span><span class="vcg-arrow">→</span><span class="vcg-tgt">{{ chainSummary.macro }}</span>
          <span class="vcg-chain-stats">
            直接 {{ strengthLabel({ strength: chainSummary.direct_effect }) }}
            · 间接 {{ strengthLabel({ strength: chainSummary.indirect_effect }) }}
            · 总 {{ strengthLabel({ strength: chainSummary.total_effect }) }}
            · 中介占比 {{ formatRatio(chainSummary.proportion_mediated) }}
            · Sobel p={{ formatP(chainSummary.sobel_p) }}
          </span>
        </div>
        <div v-for="(e, i) in defaultChainEdges" :key="'chain' + i" class="vcg-edge-row">
          <span class="vcg-src">{{ e.source }}</span><span class="vcg-arrow">→</span><span class="vcg-tgt">{{ e.target }}</span>
          <el-tag size="small" :type="tagType(e)" effect="light" round>{{ strengthLabel(e) }}</el-tag>
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
  },
  // 后端估计出的分层节点；为空时退回内置的铀场景默认节点
  tiers: {
    type: Array,
    default: () => []
  },
  // 后端估计出的主导传导链（含 a/b/c' 与中介占比）
  dominantChain: {
    type: Object,
    default: null
  }
})

// ---------- 微观 / 中观 / 宏观 分层 ----------
const TIERS = Object.freeze([
  { key: 'micro', label: '微观', color: '#3b82f6', dark: '#1d4ed8', textColor: '#ffffff', visualIndex: 2 },
  { key: 'meso', label: '中观', color: '#eab308', dark: '#ca8a04', textColor: '#3f2d00', visualIndex: 1 },
  { key: 'macro', label: '宏观', color: '#22c55e', dark: '#16a34a', textColor: '#ffffff', visualIndex: 0 }
])

const DEFAULT_TIER_NODES = Object.freeze({
  micro: ['铀矿产能', '新矿投产阈值', '铀需求强度', '产能爬坡速率'],
  meso: ['月均订单处理量', '网络协作密度', '供应链节点数'],
  macro: ['供应完成率', '网络韧性', '系统总利润']
})

// 默认态展示的主导因果链（后端无估计结果时使用）
const DEFAULT_CHAIN = Object.freeze([
  { source: '铀需求强度', target: '月均订单处理量' },
  { source: '月均订单处理量', target: '供应完成率' },
  { source: '供应完成率', target: '系统总利润' }
])

// 当前实际使用的分层节点：后端给了就用后端，并用实测观测值做节点注释
const tierNodes = computed(() => {
  const source = props.tiers || []
  const result = {}
  TIERS.forEach((t) => {
    const tier = source.find((item) => item.key === t.key)
    const nodes = tier?.nodes || []
    if (nodes.length) {
      result[t.key] = nodes.map((n) => ({
        name: n.name,
        unit: n.unit || '',
        observed: n.observed,
        description: n.description || ''
      }))
    } else {
      result[t.key] = DEFAULT_TIER_NODES[t.key].map((name) => ({ name, unit: '', observed: null, description: '' }))
    }
  })
  return result
})

const nodeMeta = computed(() => {
  const map = new Map()
  Object.values(tierNodes.value).flat().forEach((n) => map.set(n.name, n))
  return map
})

// ---------- 布局常量 ----------
const NODE_H = 46
const GUTTER_W = 82
// 层级名所需的左侧留白（数据坐标单位）。graph 系列会把节点包围盒拉伸到整幅画布，
// 因此这块留白必须算进包围盒里，否则层级名会被裁到画布之外。
const LABEL_GUTTER = 64
const PAD_TOP = 42
const PAD_BOTTOM = 34
const PAD_RIGHT = 14

const chartRef = ref(null)
const selectedVar = ref('')

let chart = null
let resizeObserver = null
let resizeFrame = null
let renderFrame = null

const nameToTier = computed(() => {
  const map = new Map()
  TIERS.forEach((t) => tierNodes.value[t.key].forEach((node) => map.set(node.name, t)))
  return map
})

function tierOf(name) {
  return nameToTier.value.get(name) || null
}

function calcLayerH(H) {
  return Math.max(76, (H - PAD_TOP - PAD_BOTTOM - NODE_H) / (TIERS.length - 1))
}

function buildPositions(W, H) {
  const usableW = Math.max(120, W - GUTTER_W - PAD_RIGHT)
  const layerH = calcLayerH(H)
  const pos = {}
  TIERS.forEach((t) => {
    const names = tierNodes.value[t.key]
    const n = names.length
    const gap = Math.max(8, Math.min(24, usableW * 0.035))
    const nodeW = Math.max(56, Math.min(168, (usableW - (n - 1) * gap) / n))
    const totalW = n * nodeW + (n - 1) * gap
    const startX = GUTTER_W + Math.max(0, (usableW - totalW) / 2)
    const y = PAD_TOP + NODE_H / 2 + t.visualIndex * layerH
    names.forEach((node, i) => {
      pos[node.name] = { x: startX + i * (nodeW + gap) + nodeW / 2, y, w: nodeW }
    })
  })
  return pos
}

// 层级底板 + 层级名做成 graph 系列里的"节点"。
// 原因：graph 系列在 layout:'none' 下会按节点包围盒自动做一次缩放/平移，
// 用 graphic 画的底板不在同一坐标系里，两者会错位（节点压到层级名上）。
// 放进 series 后二者共享同一次变换，任何尺寸下都严格对齐。
function buildBandNodes(W, layerH) {
  // 底板铺满整幅宽度、层级名放在底板内部左侧的留白区（GUTTER_W 之前），
  // 这样标签一定落在画布内，也不会压到任何节点
  const bandLeft = -LABEL_GUTTER
  const bandRight = W - PAD_RIGHT
  const bandWidth = bandRight - bandLeft
  return TIERS.map((t) => ({
    id: `__band_${t.key}`,
    name: `__band_${t.key}`,
    x: (bandLeft + bandRight) / 2,
    y: PAD_TOP + NODE_H / 2 + t.visualIndex * layerH,
    symbol: 'roundRect',
    symbolSize: [bandWidth, NODE_H + 16],
    silent: true,
    itemStyle: { color: `${t.color}14`, borderWidth: 0, opacity: 1 },
    label: {
      show: true,
      position: 'insideLeft',
      offset: [12, 0],
      formatter: t.label,
      align: 'left',
      color: t.color,
      fontSize: 13,
      fontWeight: 700
    }
  }))
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

  const nodes = buildBandNodes(W, layerH)
  // 透明锚点：唯一作用是让 graph 的自动适配把左侧留白也算进可视范围
  nodes.push({
    id: '__gutter_anchor',
    name: '__gutter_anchor',
    x: -LABEL_GUTTER,
    y: PAD_TOP + NODE_H / 2 + layerH,
    symbol: 'rect',
    symbolSize: 1,
    itemStyle: { opacity: 0 },
    label: { show: false }
  })
  TIERS.forEach((t) => {
    tierNodes.value[t.key].forEach((node) => {
      const name = node.name
      const p = pos[name]
      const isSel = name === selected
      const isDim = selected ? !neighborNames.has(name) : false
      nodes.push({
        id: name,
        name,
        observed: node.observed,
        unit: node.unit,
        note: node.description,
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
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 16
        },
        tier: t.label
      })
    })
  })

  const defaultChainSet = new Set(DEFAULT_CHAIN.map((c) => `${c.source}>${c.target}`))
  const links = props.edges.map((e) => {
    const s = Number(e.strength) || 0
    const negative = s < 0
    const st = nameToTier.value.get(e.source)
    const tt = nameToTier.value.get(e.target)
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
      significance: e.significance,
      pValue: e.p_value,
      sampleSize: e.n,
      // 注意：ECharts graph 系列里 links[].edgeLabel 只在强调态生效，
      // 常态显示必须用 links[].label，否则系数标签永远画不出来
      label: (isChain || (Math.abs(s) >= 0.25 && isSignificant(e)))
        ? {
            show: true,
            position: 'middle',
            formatter: () => betaLabel(e),
            fontSize: 10,
            fontWeight: 700,
            color: negative ? '#ef4444' : '#475569',
            backgroundColor: 'rgba(255,255,255,0.92)',
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
          const stats = l.pValue === null || l.pValue === undefined
            ? '<br/><span style="color:#94a3b8">先验结构，未经数据估计</span>'
            : `<br/>β = ${(Number(l.strength) || 0).toFixed(3)}（${l.significance || 'n.s.'}）<br/>p = ${formatP(l.pValue)} · n = ${l.sampleSize ?? '--'}`
          return `<b>${l.source} → ${l.target}</b>${stats}${l.description ? `<br/>${l.description}` : ''}`
        }
        const n = params.data || {}
        if (String(n.name || '').startsWith('__')) return ''
        const observed = (n.observed === null || n.observed === undefined)
          ? ''
          : `<br/><span style="color:#0f172a">当前实验实测：${formatObserved(n.observed, n.unit)}</span>`
        const note = n.note ? `<br/><span style="color:#94a3b8">${n.note}</span>` : ''
        return `<b>${n.name || ''}</b>${n.tier ? `<br/><span style="color:#94a3b8">${n.tier} 层</span>` : ''}${observed}${note}`
      }
    },
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
    if (!name || String(name).startsWith('__')) return
    selectedVar.value = selectedVar.value === name ? '' : name
    scheduleRender()
  })
}

// ---------- 明细条数据 ----------
const selectedMeta = computed(() => {
  if (!selectedVar.value) return null
  const t = tierOf(selectedVar.value)
  const meta = nodeMeta.value.get(selectedVar.value)
  return {
    name: selectedVar.value,
    tier: t?.label || '—',
    color: t?.color || '#64748b',
    observed: meta?.observed,
    unit: meta?.unit,
    description: meta?.description || ''
  }
})
const inEdges = computed(() => props.edges.filter((e) => e.target === selectedVar.value))
const outEdges = computed(() => props.edges.filter((e) => e.source === selectedVar.value))
const chainSummary = computed(() => props.dominantChain || null)

const defaultChainEdges = computed(() => {
  const chain = chainSummary.value
  const pairs = (chain && chain.micro && chain.meso && chain.macro)
    ? [[chain.micro, chain.meso], [chain.meso, chain.macro]]
    : DEFAULT_CHAIN.map((c) => [c.source, c.target])
  return pairs
    .map(([source, target]) => props.edges.find((e) => e.source === source && e.target === target))
    .filter(Boolean)
})

function edgeStrength(edge) {
  return Number(edge?.strength ?? edge) || 0
}

function isSignificant(edge) {
  const p = edge?.p_value
  return typeof p === 'number' && p < 0.05
}

// 按 p 值着色：p<0.01 绿、p<0.05 黄、其余中性
function tagType(edge) {
  const p = edge?.p_value
  if (typeof p !== 'number') return 'info'
  if (p < 0.01) return 'success'
  if (p < 0.05) return 'warning'
  return 'info'
}

function significanceText(edge) {
  const mark = edge?.significance
  return typeof mark === 'string' && mark !== 'n.s.' ? mark : ''
}

function strengthLabel(edge) {
  const value = edgeStrength(edge)
  const mark = significanceText(edge)
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}${mark ? ' ' + mark : ''}`
}

function betaLabel(edge) {
  const value = edgeStrength(edge)
  const mark = significanceText(edge)
  return `β ${value > 0 ? '+' : ''}${value.toFixed(2)}${mark}`
}

function formatP(p) {
  if (typeof p !== 'number') return '--'
  if (p < 0.001) return '< 0.001'
  return p.toFixed(3)
}

function formatObserved(value, unit) {
  const num = Number(value)
  if (value === null || value === undefined || !Number.isFinite(num)) return '--'
  if (unit === '%') return `${(num * 100).toFixed(1)}%`
  if (unit === '单' || unit === '次') return `${Math.round(num)}${unit}`
  if (unit === '×') return `×${num.toFixed(3)}`
  if (unit === 'ln') return `${num.toFixed(3)}（对数）`
  return `${num.toFixed(3)}`
}

function formatRatio(value) {
  return typeof value === 'number' ? `${(value * 100).toFixed(0)}%` : '--'
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

.vcg-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 0 4px;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}

.vcg-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.vcg-line {
  display: inline-block;
  width: 18px;
  height: 0;
  border-top-width: 2px;
}

.vcg-line-solid {
  border-top-style: solid;
  border-top-color: #2563eb;
}

.vcg-line-dashed {
  border-top-style: dashed;
  border-top-color: #ef4444;
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

.vcg-observed {
  padding: 1px 6px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #0f172a;
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

.vcg-chain-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.08), rgba(234, 179, 8, 0.08), rgba(34, 197, 94, 0.08));
  font-size: 12px;
}

.vcg-mid {
  color: #b45309;
  font-weight: 700;
  white-space: nowrap;
}

.vcg-chain-stats {
  margin-left: auto;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
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
