<template>
  <el-drawer v-model="visible" title="复杂网络分析" size="min(1120px, 94vw)" destroy-on-close @opened="render" @closed="disposeChart">
    <div class="cna">
      <div v-if="loading" class="cna-empty">正在计算复杂网络指标…</div>
      <div v-else-if="error" class="cna-empty">
        <p>{{ error }}</p>
        <button type="button" class="cna-retry" @click="loadAnalysis">重试分析</button>
      </div>
      <div v-else-if="!analysis.nodes.length" class="cna-empty">当前快照暂无可分析的网络节点与运输边。</div>
      <template v-else>
        <div class="cna-rankings">
          <section class="cna-ranking">
            <h4>度中心性排行</h4>
            <p class="cna-algorithm">NetworkX degree_centrality：去重无向边的直接邻居数 ÷ (节点总数 − 1)</p>
            <button v-for="(node, index) in analysis.topDegreeNodes" :key="node.id" type="button" class="cna-rank-row" @click="selectNode(node.id)">
              <span class="cna-rank-index">{{ index + 1 }}</span>
              <span class="cna-rank-name">{{ node.name }}</span>
              <span class="cna-rank-bar"><i :style="{ width: degreeCentrality(node) + '%' }"></i></span>
              <b>{{ degreeCentrality(node).toFixed(1) }}%</b>
              <small>{{ node.degree }} 条连接</small>
            </button>
          </section>
          <section class="cna-ranking">
            <h4>桥接关键节点排行</h4>
            <p class="cna-algorithm">Brandes 最短路径介数中心性；割点优先，再按介数排序。{{ analysis.betweennessApproximate ? '大图采用固定种子抽样近似。' : '本图精确计算。' }}</p>
            <button v-for="(node, index) in analysis.topNodes.slice(0, 5)" :key="node.id" type="button" class="cna-rank-row" @click="selectNode(node.id)">
              <span class="cna-rank-index cna-rank-index--key">{{ index + 1 }}</span>
              <span class="cna-rank-name">{{ node.name }}</span>
              <span class="cna-rank-bar cna-rank-bar--key"><i :style="{ width: Math.min(100, node.betweenness) + '%' }"></i></span>
              <b>{{ node.betweenness.toFixed(1) }}%</b>
              <small :class="{ 'cna-high': node.isArticulation }">{{ node.isArticulation ? '割点' : `k=${node.coreNumber}` }}</small>
            </button>
          </section>
        </div>
        <div class="cna-controls">
          <label>供应路线 / 社群
            <select v-model="selectedRoute">
              <option value="all">全部路线</option>
              <option v-for="route in routeRows" :key="route.id" :value="route.id">{{ route.name }}</option>
            </select>
          </label>
          <span>◆ 菱形为桥接关键节点；点击节点查看具体指标</span>
        </div>
        <p class="cna-algorithm cna-graph-algorithm">一条业务路线对应一个社群，共用节点可属于多个路线。节点大小按 NetworkX degree_centrality 映射；Brandes 介数、割点与割边参与关键性及风险计算。红色描边与红色连线均来自快照中的真实高风险等级。</p>
        <div class="cna-visual-legend">
          <b>路线颜色与总体风险</b>
          <span v-for="route in routeRows" :key="route.id" class="cna-route-risk" :title="`原始风险分 ${route.raw.toFixed(1)}`">
            <i class="cna-route-swatch" :style="{ background: routeColor(route.id) }"></i>{{ route.name }} <strong :class="route.level">{{ riskLabel(route.level) }} {{ route.display.toFixed(1) }}</strong>
          </span>
          <span class="cna-route-key"><i :style="{ background: sharedColor }"></i>多路线共用 / 未归属节点</span>
          <small>节点填充色区分路线，共用节点用灰色；描边和连线的红色只表示相应节点或运输边的高风险等级，路线总体等级与主页同口径。</small>
          <span><i class="cna-risk-dot high"></i>高风险描边 {{ riskCounts.high }}</span>
          <span><i class="cna-risk-dot medium"></i>中风险描边 {{ riskCounts.medium }}</span>
          <span><i class="cna-risk-dot low"></i>低风险描边 {{ riskCounts.low }}</span>
          <span v-if="!riskCounts.high" class="cna-no-high">当前快照没有高风险节点，所以图中无红色描边</span>
          <span class="cna-line-key"><i class="route-high"></i>高风险运输边</span>
          <span class="cna-line-key"><i class="route-medium"></i>中风险运输边</span>
          <span class="cna-line-key"><i class="route-low"></i>低风险运输边</span>
          <span v-if="!highEdgeCount" class="cna-no-high">当前快照无高风险运输边，因此图中无红色连线</span>
          <span class="cna-line-key"><i class="thin"></i>单路线</span>
          <span class="cna-line-key"><i class="thick"></i>多路线共用</span>
          <small>连线粗细只按共用路线数变化：单路线统一宽度，多路线共用的边加粗；颜色按该运输边风险等级显示。</small>
        </div>
        <div class="cna-main">
          <div ref="chartEl" class="cna-chart" role="img" aria-label="供应网络节点与运输边关系图"></div>
          <aside class="cna-side">
            <h4>桥接关键节点详情</h4>
            <button v-for="node in analysis.topNodes" :key="node.id" class="cna-node-row" @click="selectNode(node.id)">
              <span class="cna-dot" :style="{ background: nodeColor(node) }"></span>
              <span class="cna-node-name">{{ node.name }}</span>
              <b>{{ node.betweenness.toFixed(1) }}%</b>
            </button>
            <div v-if="selectedNode" class="cna-detail">
              <h4>{{ selectedNode.name }}</h4>
              <p>{{ selectedNode.type || '节点' }} · {{ selectedNode.routes.map(routeName).join('、') || '未归属路线' }}</p>
              <p>连接数 {{ selectedNode.degree }} · 度中心性 {{ degreeCentrality(selectedNode).toFixed(1) }}%</p>
              <p>介数中心性 {{ selectedNode.betweenness.toFixed(1) }}% · {{ selectedNode.isArticulation ? '割点' : '非割点' }} · {{ selectedNode.coreNumber }}-core</p>
              <p>态势模型关键性 {{ selectedNode.criticality.toFixed(1) }} · {{ selectedNode.domainCritical ? '态势模型标记关键节点' : '态势模型未标记' }}</p>
              <p>节点风险 {{ selectedNode.risk.toFixed(1) }} · {{ riskLabel(selectedNode.level) }}</p>
              <p v-if="selectedNode.riskReason">风险依据：{{ selectedNode.riskReason }}</p>
              <p v-if="selectedNode.routes.length">涉及路线：{{ selectedNode.routes.map(routeName).join('、') }}{{ selectedNode.routes.length > 1 ? '（多路线共享）' : '' }}</p>
            </div>
          </aside>
        </div>
        <div class="cna-communities">
          <div v-for="group in analysis.communities" :key="group.id" class="cna-community">
            <i :style="{ background: routeColor(group.routeId) }"></i>
            <b>{{ group.title }}</b>
            <span class="cna-community-id">路线社群 {{ group.id + 1 }}</span>
            <span>{{ group.size }} 节点 · {{ group.edgeCount }} 条内部边 · 高风险 {{ group.highRisk }} 个</span>
            <p>{{ group.meaning }}</p>
            <small>包含节点：{{ group.names }}</small>
          </div>
        </div>
        <p class="cna-foot">方法：NetworkX 度中心性决定节点大小；Brandes (2001) 计算节点与边的最短路径介数；割点、割边及 k-core 描述网络结构。极高供应后果的割点触发节点高风险保护，割边按边介数计入单点失效影响。风险分不作为路径距离或实际中断概率。</p>
        <section class="cna-overview" aria-label="网络分析概况与说明">
          <p class="cna-note">这张图与主页使用同一份态势模型快照。节点填充色区分路线、描边表示计算后的节点风险、大小按度中心性；连线颜色表示计算后的运输边风险，粗细表示共用路线数。</p>
          <p v-if="snapshot?.as_of_date" class="cna-note">案例网络按截至 {{ snapshot.as_of_date }} 的情报，用现行固定模型链复算；原案例的大模型研判仍是原产物。</p>
          <p v-if="snapshot?.snapshot_id" class="cna-snapshot-id">当前快照 {{ snapshot.snapshot_id }} · {{ snapshot.generated_at || '时间未标注' }}</p>
          <div class="cna-reconcile">
            <div v-if="dualJudgment?.status === 'completed'"><span>双驱动最终判断</span><b :class="dualJudgment.risk_level">{{ riskLabel(dualJudgment.risk_level) }}</b></div>
            <div><span>态势模型高风险路线</span><b class="high">{{ highRouteCount }} / {{ routeRows.length }}</b></div>
            <div><span>态势模型高风险节点</span><b>{{ riskCounts.high }} / {{ analysis.nodes.length }}</b></div>
            <div><span>态势模型高风险运输边</span><b>{{ highEdgeCount }} / {{ analysis.edges.length }}</b></div>
            <p>主页红线表示路线总体风险：{{ highRouteExplanation }}。节点描边和连线颜色分别读取同一快照的节点、运输边等级；路线总体等级经过供应占比、关键节点等因素聚合及展示分校准，不能直接当作沿途每个节点或每段运输边的等级。</p>
          </div>
          <div class="cna-stats">
            <div><b>{{ analysis.nodes.length }}</b><span>节点</span></div>
            <div><b>{{ analysis.edges.length }}</b><span>运输边</span></div>
            <div><b>{{ analysis.communityCount }}</b><span>路线社群</span></div>
            <div><b>{{ analysis.components }}</b><span>连通分量</span></div>
            <div><b>{{ analysis.density.toFixed(3) }}</b><span>网络密度</span></div>
            <div><b>{{ analysis.highRiskCount }}</b><span>高风险节点</span></div>
            <div><b>{{ sharedNodeCount }}</b><span>共用节点</span></div>
            <div><b>{{ analysis.articulationCount }}</b><span>割点</span></div>
            <div><b>{{ analysis.maxCore }}</b><span>最高 k-core</span></div>
          </div>
        </section>
      </template>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { analyzeComplexNetwork } from '@/api/complexNetwork'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  snapshot: { type: Object, default: null },
  dualJudgment: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])
const visible = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const chartEl = ref(null)
const selectedRoute = ref('all')
const selectedId = ref('')
const routePalette = ['#2563eb', '#7c3aed', '#0891b2', '#c026d3', '#0d9488', '#4f46e5', '#a21caf', '#0284c7']
const sharedColor = '#94a3b8'
let chart = null
const loading = ref(false)
const error = ref('')
const analysis = ref(emptyAnalysis())
let requestVersion = 0

function emptyAnalysis() {
  return { nodes: [], edges: [], communities: [], communityCount: 0, components: 0,
    density: 0, modularity: null, highRiskCount: 0, articulationCount: 0, maxCore: 0,
    betweennessApproximate: false, topDegreeNodes: [], topNodes: [] }
}

async function loadAnalysis() {
  const snapshot = props.snapshot
  const version = ++requestVersion
  disposeChart()
  analysis.value = emptyAnalysis()
  error.value = ''
  if (!visible.value || !snapshot) return
  loading.value = true
  try {
    const response = await analyzeComplexNetwork({
      nodes: snapshot.nodes || [],
      edges: snapshot.edges || [],
      routes: snapshot.routes || [],
      critical_nodes: snapshot.critical_nodes || [],
    })
    if (version !== requestVersion) return
    if (!response.success) throw new Error(response.message || '网络分析失败')
    analysis.value = response.data || emptyAnalysis()
    selectedRoute.value = 'all'
    selectedId.value = ''
  } catch (cause) {
    if (version === requestVersion) error.value = cause.status === 404
      ? '复杂网络分析接口尚未就绪，请启动最新后端服务后重试。'
      : cause.message || '网络分析失败'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function degreeCentrality(node) {
  return node.degreeCentrality || 0
}

function riskLabel(level) {
  return ({ high: '高风险', medium: '中风险', low: '低风险' })[level] || '未分级'
}

const selectedNode = computed(() => analysis.value.nodes.find(n => n.id === selectedId.value) || null)
const riskCounts = computed(() => analysis.value.nodes.reduce((counts, node) => {
  if (node.level in counts) counts[node.level]++
  return counts
}, { high: 0, medium: 0, low: 0 }))
const sharedNodeCount = computed(() => analysis.value.nodes.filter(node => node.routes?.length > 1).length)
const highEdgeCount = computed(() => analysis.value.edges.filter(edge => edge.level === 'high').length)
const highRouteCount = computed(() => (props.snapshot?.routes || [])
  .filter(route => (route.riskLevel || route.risk_level) === 'high').length)
const routeRows = computed(() => (props.snapshot?.routes || []).map(route => ({
  id: String(route.id),
  name: route.country || route.name || route.id,
  level: route.riskLevel || route.risk_level || '',
  display: Number(route.display_risk_score ?? route.risk_score ?? 0),
  raw: Number(route.raw_risk_score ?? route.risk_score ?? 0),
})).sort((a, b) => b.display - a.display))
const highRouteExplanation = computed(() => {
  const high = routeRows.value.filter(route => route.level === 'high')
  if (!high.length) return '当前没有高风险路线'
  const example = high[0]
  return `${high.map(route => route.name).join('、')}共 ${high.length} 条；例如${example.name}路线原始分 ${example.raw.toFixed(1)}，展示分 ${example.display.toFixed(1)}`
})
const routeById = computed(() => new Map(routeRows.value.map(route => [route.id, route])))
const routeColors = computed(() => new Map(routeRows.value.map((route, index) => [route.id, routePalette[index % routePalette.length]])))
function routeColor(id) { return routeColors.value.get(String(id)) || sharedColor }
function routeName(id) { return routeById.value.get(String(id))?.name || id }
function nodeColor(node) {
  return node.routes?.length === 1 ? routeColor(node.routes[0]) : sharedColor
}
const maxDegreeCentrality = computed(() => Math.max(1, ...analysis.value.nodes.map(degreeCentrality)))
function nodeSize(node) { return 16 + 34 * degreeCentrality(node) / maxDegreeCentrality.value }
function edgeColor(level) {
  return level === 'high' ? '#dc2626' : level === 'medium' ? '#f59e0b'
    : level === 'low' ? '#16a34a' : '#94a3b8'
}

function render() {
  if (!visible.value || !chartEl.value || !analysis.value.nodes.length) return
  if (!chart) chart = echarts.init(chartEl.value)
  const nodes = analysis.value.nodes.filter(n => selectedRoute.value === 'all'
    || (n.routes || []).map(String).includes(selectedRoute.value))
  const ids = new Set(nodes.map(n => n.id))
  const edges = analysis.value.edges.filter(e => ids.has(e.source) && ids.has(e.target)
    && (selectedRoute.value === 'all' || (e.routes || []).map(String).includes(selectedRoute.value)))
  const keyIds = new Set(analysis.value.topNodes.slice(0, 5).map(n => n.id))
  const categories = [...routeRows.value.map(route => ({ name: route.name, itemStyle: { color: routeColor(route.id) } })),
    { name: '多路线共享 / 未归属', itemStyle: { color: sharedColor } }]
  const routeIndex = new Map(routeRows.value.map((route, index) => [route.id, index]))
  const links = edges.map(edge => {
    const routes = (edge.routes || (edge.route ? [edge.route] : []))
      .map(id => routeById.value.get(String(id))).filter(Boolean)
    const routeCount = Math.max(1, (edge.routes || (edge.route ? [edge.route] : [])).length)
    return {
      source: edge.source,
      target: edge.target,
      edgeRisk: edge.risk,
      edgeLevel: edge.level,
      edgeBetweenness: edge.edgeBetweenness,
      isBridge: edge.isBridge,
      topologyDelta: edge.topologyDelta,
      routeCount,
      routeSummary: routes.map(route => `${route.name} ${route.display.toFixed(1)}`).join('、'),
      lineStyle: {
        color: edgeColor(edge.level),
        width: 2 + 2.5 * (routeCount - 1),
        opacity: 0.88,
      },
    }
  })
  chart.setOption({
    tooltip: { formatter: item => {
      const data = item.data
      if (item.dataType === 'edge') return `${data.source} → ${data.target}<br/>${data.routeSummary ? `所属路线：${data.routeSummary}<br/>` : ''}共用路线 ${data.routeCount} 条<br/>运输边风险 ${data.edgeRisk.toFixed(1)} · ${riskLabel(data.edgeLevel)}<br/>${data.isBridge ? '网络割边 · ' : ''}边介数 ${Number(data.edgeBetweenness || 0).toFixed(1)}% · 结构影响 +${Number(data.topologyDelta || 0).toFixed(1)}`
      return `${data.name}<br/>所属路线：${data.routeRiskSummary || '未归属'}${data.shared ? '（多路线共享）' : ''}<br/>度中心性 ${data.degreeCentrality.toFixed(1)}% · 介数 ${data.betweenness.toFixed(1)}%<br/>${data.isArticulation ? '割点 · ' : ''}${data.coreNumber}-core · 节点自身风险 ${data.risk.toFixed(1)} · ${riskLabel(data.level)}${data.riskReason ? `<br/>${data.riskReason}` : ''}`
    } },
    legend: { show: false },
    series: [{
      type: 'graph', layout: 'force', roam: true, draggable: true,
      animationDurationUpdate: 300,
      force: { repulsion: 220, edgeLength: [75, 150], gravity: 0.08 },
      label: { show: nodes.length <= 35, position: 'right', fontSize: 10 },
      emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
      categories,
      data: nodes.map(n => ({
        id: n.id, name: n.name,
        category: n.routes?.length === 1
          ? (routeIndex.get(String(n.routes[0])) ?? routeRows.value.length) : routeRows.value.length,
        symbol: keyIds.has(n.id) ? 'diamond' : 'circle',
        symbolSize: nodeSize(n),
        label: { show: keyIds.has(n.id) || nodes.length <= 35,
          formatter: keyIds.has(n.id) ? `◆ ${n.name}` : n.name,
          fontWeight: keyIds.has(n.id) ? 'bold' : 'normal' },
        itemStyle: { color: nodeColor(n), borderColor: n.level === 'high' ? '#dc2626'
          : n.level === 'medium' ? '#f59e0b' : '#94a3b8',
          borderWidth: n.level === 'high' ? 4 : 2.5 },
        degree: n.degree, degreeCentrality: degreeCentrality(n),
        betweenness: n.betweenness, isArticulation: n.isArticulation,
        coreNumber: n.coreNumber, risk: n.risk,
        level: n.level,
        riskReason: n.riskReason,
        routeSummary: (n.routes || []).map(routeName).join('、'), shared: (n.routes || []).length > 1,
        routeRiskSummary: (n.routes || []).map(id => {
          const route = routeById.value.get(String(id))
          return route ? `${route.name}（${riskLabel(route.level)}）` : String(id)
        }).join('、'),
      })),
      links,
    }],
  }, true)
  chart.off('click')
  chart.on('click', params => { if (params.dataType === 'node') selectedId.value = params.data.id })
  chart.resize()
}

function disposeChart() {
  chart?.dispose()
  chart = null
}

function selectNode(id) {
  selectedId.value = id
  const node = analysis.value.nodes.find(n => n.id === id)
  if (node && selectedRoute.value !== 'all'
    && !(node.routes || []).map(String).includes(selectedRoute.value)) selectedRoute.value = 'all'
}

watch([visible, () => props.snapshot], loadAnalysis, { immediate: true })
watch([analysis, selectedRoute], async () => { await nextTick(); render() })
onBeforeUnmount(disposeChart)
</script>

<style scoped>
.cna { color: #334155; }
.cna-overview { margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
.cna-overview .cna-note:first-child { margin-top: 0; }
.cna-overview .cna-stats { margin-bottom: 0; }
.cna-note, .cna-foot { color: #64748b; line-height: 1.6; font-size: 12px; }
.cna-snapshot-id { margin: 0 0 8px; color: #475569; font-size: 11px; }
.cna-empty { padding: 50px; text-align: center; color: #64748b; }
.cna-retry { margin-top: 8px; padding: 6px 14px; border: 1px solid #2563eb; border-radius: 7px; background: #eff6ff; color: #1d4ed8; cursor: pointer; }
.cna-reconcile { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
.cna-reconcile div { display: flex; align-items: center; gap: 8px; padding: 8px 11px; border-radius: 8px; background: #eff6ff; font-size: 12px; }
.cna-reconcile div b { font-size: 14px; }
.cna-reconcile b.high { color: #dc2626; }
.cna-reconcile b.medium { color: #d97706; }
.cna-reconcile p { flex-basis: 100%; margin: 0; color: #475569; font-size: 12px; line-height: 1.5; }
.cna-route-risk { display: inline-flex; align-items: center; gap: 5px; padding: 5px 7px; border-radius: 6px; background: #f1f5f9; }
.cna-route-swatch { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.cna-route-risk strong { padding: 2px 5px; border-radius: 4px; }
.cna-route-risk strong.high { color: #b91c1c; background: #fee2e2; }
.cna-route-risk strong.medium { color: #b45309; background: #fef3c7; }
.cna-route-risk strong.low { color: #15803d; background: #dcfce7; }
.cna-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin: 16px 0; }
.cna-stats div { padding: 12px; border-radius: 10px; background: #f1f5f9; display: flex; flex-direction: column; gap: 4px; }
.cna-stats b { font-size: 20px; color: #0f172a; }
.cna-stats span { font-size: 12px; }
.cna-rankings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 14px 0; }
.cna-ranking { min-width: 0; padding: 12px; border: 1px solid #dbe4f0; border-radius: 10px; background: #fff; }
.cna-ranking h4 { margin: 0 0 8px; color: #0f172a; }
.cna-ranking h4 small { margin-left: 6px; color: #64748b; font-weight: 400; }
.cna-algorithm { margin: 0 0 8px; color: #64748b; font-size: 11px; line-height: 1.45; }
.cna-graph-algorithm { margin: -2px 0 8px; }
.cna-visual-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 9px 15px; margin: 0 0 10px; padding: 9px 11px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px; }
.cna-visual-legend span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.cna-visual-legend small { flex-basis: 100%; color: #64748b; }
.cna-route-key i { display: inline-block; width: 11px; height: 11px; border-radius: 50%; }
.cna-risk-dot { width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 3px solid; box-sizing: border-box; }
.cna-risk-dot.high { border-color: #dc2626; }
.cna-risk-dot.medium { border-color: #f59e0b; }
.cna-risk-dot.low { border-color: #94a3b8; }
.cna-no-high { color: #64748b; }
.cna-line-key i { display: inline-block; width: 22px; border-top: solid #f59e0b; }
.cna-line-key i.thin { border-top-width: 2px; }
.cna-line-key i.thick { border-top-width: 5px; }
.cna-line-key i.route-high { border-top: 4px solid #dc2626; }
.cna-line-key i.route-medium { border-top: 4px solid #f59e0b; }
.cna-line-key i.route-low { border-top: 4px solid #16a34a; }
.cna-rank-row { display: grid; grid-template-columns: 20px minmax(85px, 1fr) minmax(60px, 100px) 48px 62px; align-items: center; gap: 7px; width: 100%; padding: 6px 2px; border: 0; border-top: 1px solid #f1f5f9; background: transparent; color: #334155; text-align: left; cursor: pointer; font-size: 12px; }
.cna-rank-row:hover { background: #f8fafc; }
.cna-rank-row b, .cna-rank-row small { text-align: right; white-space: nowrap; }
.cna-rank-index { color: #2563eb; font-weight: 800; }
.cna-rank-index--key { color: #d97706; }
.cna-rank-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cna-rank-bar { height: 6px; border-radius: 999px; background: #dbeafe; overflow: hidden; }
.cna-rank-bar i { display: block; height: 100%; border-radius: inherit; background: #2563eb; }
.cna-rank-bar--key { background: #fef3c7; }
.cna-rank-bar--key i { background: #f59e0b; }
.cna-high { color: #dc2626; font-weight: 700; }
.cna-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; margin-bottom: 10px; }
.cna-controls select { margin-left: 8px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; }
.cna-main { display: grid; grid-template-columns: minmax(0, 1fr) 245px; gap: 12px; }
.cna-chart { height: 490px; border: 1px solid #e2e8f0; border-radius: 10px; }
.cna-side { max-height: 490px; overflow: auto; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
.cna-side h4 { margin: 2px 0 10px; }
.cna-node-row { display: flex; width: 100%; align-items: center; gap: 6px; border: 0; border-bottom: 1px solid #f1f5f9; background: white; padding: 7px 2px; cursor: pointer; text-align: left; }
.cna-node-row:hover { background: #f8fafc; }
.cna-node-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cna-dot, .cna-community i { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.cna-detail { margin-top: 14px; padding: 10px; border-radius: 8px; background: #eff6ff; font-size: 12px; }
.cna-detail p { margin: 5px 0; }
.cna-communities { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
.cna-community { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 10px; background: #f8fafc; border-radius: 8px; font-size: 12px; }
.cna-community-id { color: #64748b; }
.cna-community p { width: 100%; margin: 3px 0; line-height: 1.5; }
.cna-community small { width: 100%; color: #64748b; line-height: 1.5; }
@media (max-width: 760px) { .cna-stats { grid-template-columns: repeat(3, 1fr); } .cna-rankings, .cna-main { grid-template-columns: 1fr; } .cna-side { max-height: 240px; } .cna-communities { grid-template-columns: 1fr; } }
</style>
