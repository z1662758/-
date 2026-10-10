<template>
  <div v-if="network && network.nodes.length" class="snp-root">
    <div class="snp-header">
      <span class="snp-title">🕸️ 供应网络关键节点分析</span>
      <span class="snp-meta">对华进口 {{ network.totalImport_tU }} tU/年</span>
    </div>

    <div class="snp-body">
      <!-- 力导向网络图 -->
      <div ref="graphRef" class="snp-graph"></div>

      <!-- 右侧：瘫痪节点  -->
      <div class="snp-side">
        <div v-if="network.paralysisNode" class="snp-paralysis">
          <div class="snp-paralysis-label">💥 瘫痪级关键节点（受影响后断供最大）</div>
          <div class="snp-paralysis-name">{{ network.paralysisNode.name }}</div>
          <div class="snp-paralysis-loss">受影响后对华断供 <b>{{ network.paralysisNode.lossPct }}%</b></div>
          <div class="snp-paralysis-explain">{{ network.paralysisNode.explain }}</div>
        </div>

        <div class="snp-sub">🎯 优先级排序</div>
        <div class="snp-list">
          <div
            v-for="c in topCritical"
            :key="c.name"
            class="snp-item"
            :class="{ 'snp-item-hot': c.strikePriority <= 3 }"
          >
            <span class="snp-rank">{{ c.strikePriority }}</span>
            <span class="snp-name">{{ c.name }}</span>
            <span class="snp-type">{{ typeLabel(c.type) }}</span>
            <span class="snp-loss">{{ c.lossPct }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  supplyNetwork: { type: Object, default: null }
})

const graphRef = ref(null)
let chart = null
let resizeObserver = null

const network = computed(() => props.supplyNetwork || null)
const topCritical = computed(() => (network.value?.criticalNodes || []).slice(0, 8))

const TYPE_COLORS = { supplier: '#f59e0b', chokepoint: '#ef4444', storage: '#0ea5e9', china: '#2563eb' }
const TYPE_LABELS = { supplier: '供应国', chokepoint: '咽喉', storage: '仓储/港口', china: '中国' }

function typeLabel(t) { return TYPE_LABELS[t] || t }

function riskColor(score) {
  if (score >= 0.6) return '#ef4444'
  if (score >= 0.4) return '#f59e0b'
  return '#10b981'
}

function buildOption() {
  const net = network.value
  if (!net) return {}

  const nodes = net.nodes.map(n => {
    const loss = n.lossPct != null ? n.lossPct : 0
    const size = Math.max(10, Math.min(44, 10 + loss * 0.5))
    return {
      id: n.id,
      name: n.name,
      symbolSize: size,
      value: loss,
      itemStyle: { color: TYPE_COLORS[n.type] || '#94a3b8' }
    }
  })

  const edges = net.edges.map(e => ({
    source: e.source,
    target: e.target,
    value: e.volume,
    lineStyle: {
      width: Math.max(1, Math.min(4, Math.round(Math.log10(e.volume + 1)))),
      color: riskColor(e.risk),
      opacity: 0.45,
      curveness: 0.08
    }
  }))

  const legendData = Object.keys(TYPE_LABELS).map(k => ({
    name: TYPE_LABELS[k],
    itemStyle: { color: TYPE_COLORS[k] }
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (p.dataType === 'node') {
          const n = net.nodes.find(x => x.id === p.data.id)
          if (!n) return p.name
          let html = `<b>${n.name}</b>（${typeLabel(n.type)}）`
          if (n.type === 'supplier' && n.volume != null) {
            html += `<br/>对华出口 ${n.volume} tU · 份额 ${n.sharePct}%`
          }
          if (n.lossPct != null) html += `<br/>打击损失 ${n.lossPct}%`
          if (n.riskScore != null) html += `<br/>风险分 ${n.riskScore}`
          return html
        }
        if (p.dataType === 'edge') {
          return `${p.data.source} → ${p.data.target}<br/>运量 ${p.data.value} tU`
        }
        return p.name
      }
    },
    legend: { data: legendData, top: 6, itemWidth: 12, itemHeight: 12 },
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      force: { repulsion: 320, edgeLength: [60, 140], gravity: 0.1 },
      data: nodes,
      edges,
      label: { show: true, position: 'right', fontSize: 11, color: '#1e293b' },
      emphasis: { focus: 'adjacency', lineStyle: { width: 4 } }
    }]
  }
}

function render() {
  if (!graphRef.value) return
  try {
    if (!chart) chart = echarts.init(graphRef.value)
    chart.setOption(buildOption(), true)
  } catch (e) {
    console.warn('SupplyNetworkPanel render error:', e)
  }
}

function resize() { chart?.resize() }

watch(() => props.supplyNetwork, () => nextTick(render), { deep: true })

onMounted(() => {
  nextTick(render)
  window.addEventListener('resize', resize)
  if (typeof ResizeObserver !== 'undefined' && graphRef.value) {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(graphRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.snp-root {
  background: #f8fbfe;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  margin-bottom: 1rem;
  overflow: hidden;
}
.snp-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background: #fff;
  border-bottom: 1px solid #eef0f4;
}
.snp-title { font-size: 1.05rem; font-weight: 700; color: #1e293b; }
.snp-meta { margin-left: auto; font-size: 12px; color: #94a3b8; }

.snp-body { display: flex; height: 380px; }
.snp-graph { flex: 1; min-width: 0; height: 100%; }

.snp-side {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid #eef0f4;
  padding: 14px 16px;
  overflow-y: auto;
  background: #fff;
}
.snp-paralysis {
  background: linear-gradient(135deg, #fef2f2, #fff1f2);
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 12px 14px;
}
.snp-paralysis-label { font-size: 12px; color: #b91c1c; font-weight: 600; }
.snp-paralysis-name { font-size: 20px; font-weight: 800; color: #b91c1c; margin: 6px 0 4px; }
.snp-paralysis-loss { font-size: 14px; color: #475569; }
.snp-paralysis-loss b { color: #dc2626; font-size: 18px; }
.snp-paralysis-explain { font-size: 12px; color: #94a3b8; margin-top: 6px; line-height: 1.6; }

.snp-sub { font-size: 15px; font-weight: 600; color: #475569; margin: 16px 0 10px; }
.snp-list { display: flex; flex-direction: column; gap: 5px; }
.snp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border-radius: 7px;
  font-size: 13px;
  color: #334155;
  background: #f8fafc;
  border: 1px solid #eef0f4;
}
.snp-item-hot { background: #fff7ed; border-color: #fed7aa; }
.snp-rank {
  width: 20px; height: 20px; border-radius: 50%;
  background: #e2e8f0; color: #475569; font-weight: 700; font-size: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.snp-item-hot .snp-rank { background: #ef4444; color: #fff; }
.snp-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
.snp-type { font-size: 11px; color: #94a3b8; flex-shrink: 0; }
.snp-loss { font-weight: 700; color: #dc2626; width: 46px; text-align: right; flex-shrink: 0; }

@media (max-width: 1200px) {
  .snp-side { width: 260px; }
}
</style>
