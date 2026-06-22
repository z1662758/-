<template>
  <div class="ukg-container">
    <!-- 左侧筛选面板 -->
    <div class="ukg-left-panel">
      <div class="panel-header">☢️ 铀供应链动态本体网络</div>

      <!-- 时间窗口 (年度: 1997~2024) -->
      <div class="panel-section">
        <label>时间窗口 (1997 ~ 2024)</label>
        <div class="timeline-controls">
          <el-button size="small" :disabled="!windowIdx" @click="windowStep(-1)">◀</el-button>
          <span class="timeline-label">{{ currentYear }}</span>
          <el-button size="small" :disabled="windowIdx >= maxWindowIdx" @click="windowStep(1)">▶</el-button>
        </div>
        <el-slider v-model="windowIdx" :min="0" :max="maxWindowIdx" :step="1"
                   :show-tooltip="false" @change="onWindowSlide" size="small"/>
        <div class="window-info">
          <span>{{ currentSnapshot.node_count || 0 }} 节点</span>
          <span>{{ currentSnapshot.edge_count || 0 }} 边</span>
          <span>{{ currentSnapshot.event_count || 0 }} 事件</span>
        </div>
        <!-- 快速跳转关键年份 -->
        <div class="key-years">
          <el-button v-for="y in keyYears" :key="y" size="small" :type="currentYear==='t_'+y ? 'primary' : ''"
                     @click="jumpToYear(y)" style="padding:2px 8px;font-size:10px;min-height:22px">{{ y }}</el-button>
        </div>
      </div>

      <!-- 角色分布 -->
      <div class="panel-section">
        <label>角色分布</label>
        <div class="dynamic-roles-info">
          <el-tag size="small" type="danger">关键节点 {{ roleCounts.key_nodes }}</el-tag>
          <el-tag size="small" type="warning">桥接节点 {{ roleCounts.bridge_nodes }}</el-tag>
          <el-tag size="small" type="info">普通节点 {{ roleCounts.normal_nodes }}</el-tag>
        </div>
      </div>

      <div class="panel-section">
        <label>搜索实体</label>
        <el-input v-model="searchQuery" placeholder="输入国家/矿山/企业名称..."
                  clearable @keyup.enter="onSearch" @clear="onClearSearch">
          <template #prefix><el-icon><Search/></el-icon></template>
        </el-input>
      </div>

      <div class="panel-section stats-section">
        <div class="stat-line"><span>总节点</span><strong>{{ statsDisplay.nodes }}</strong></div>
        <div class="stat-line"><span>总边</span><strong>{{ statsDisplay.edges }}</strong></div>
        <div class="stat-line"><span>事件总数</span><strong>{{ store.dynamicGraph?.metadata?.total_events || 0 }}</strong></div>
        <div class="stat-line"><span>时间窗口</span><strong>{{ store.dynamicWindows.length }}</strong></div>
        <div class="stat-line"><span>时间范围</span><strong>{{ store.dynamicGraph?.metadata?.time_range || '1997-2024' }}</strong></div>
      </div>

      <div class="panel-section" style="margin-top:8px">
        <label>历史结构变化</label>
        <div class="structural-changes" v-if="structuralChanges.length">
          <div v-for="(ch, i) in structuralChanges.slice(0, 8)" :key="i" class="change-item">
            <span class="change-year">{{ ch.year || ch.timestamp }}</span>
            <span class="change-desc">{{ ch.description }}</span>
          </div>
        </div>
        <el-empty v-else description="暂无结构变化" :image-size="30"/>
      </div>
    </div>

    <!-- 中央图区域 -->
    <div class="ukg-center">
      <div v-show="loading" class="ukg-loading-overlay">
        <el-icon class="is-loading" :size="40"><Loading/></el-icon>
        <span>铀供应链图谱加载中...</span>
      </div>
      <div ref="chartRef" class="ukg-chart"></div>
    </div>

    <!-- 右侧详情面板 -->
    <div class="ukg-right-panel" v-if="store.selectedNode">
      <div class="panel-header">
        节点详情
        <el-button link size="small" @click="store.clearSelection()">✕</el-button>
      </div>
      <div class="detail-content">
        <div class="detail-field"><label>名称</label><span>{{ store.selectedNode.name }}</span></div>
        <div class="detail-field"><label>类型</label>
          <el-tag size="small" :style="{background: getNodeTypeColor(store.selectedNode.nodeType), color:'#fff'}">
            {{ store.selectedNode.nodeType }}
          </el-tag>
        </div>

        <div class="detail-field" v-if="neighbors.length">
          <label>关联节点 ({{ neighbors.length }})</label>
          <div class="neighbor-list">
            <span v-for="n in neighbors.slice(0, 20)" :key="n.id"
                  class="neighbor-chip" @click="focusNode(n.id)">
              {{ n.label }} <span style="color:#909399;font-size:10px">({{ n.relation }})</span>
            </span>
          </div>
        </div>

        <div class="detail-field" v-if="propsEntries.length">
          <label>属性</label>
          <div class="props-table">
            <div v-for="(v, k) in propsEntries.slice(0, 18)" :key="k" class="prop-row">
              <span class="prop-key">{{ k }}</span><span class="prop-val">{{ formatVal(v) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="ukg-right-panel ukg-right-empty" v-else>
      <div class="panel-header">节点详情</div>
      <el-empty description="点击节点查看详情" :image-size="60">
        <template #description><span style="font-size:12px;color:#909399">国家节点为暖橙色主节点<br/>点击查看矿山/企业/事件关联</span></template>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useUraniumOntologyStore } from '@/stores/ontology_uranium'
import { storeToRefs } from 'pinia'
import { Search, Loading } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const MAX_VISIBLE_NODES = 300
const METRIC_TYPES = new Set(['UraniumProduction', 'UraniumDemand', 'ExplorationMetric',
  'PriceMetric', 'InventoryMetric', 'CostMetric', 'ResourceMetric'])
const CORE_TYPES = new Set(['Country', 'UraniumMine', 'UraniumCompany',
  'RiskEvent', 'TransportRoute', 'Policy', 'FuelCycleFacility',
  'TurningPoint', 'ScenarioNode'])

// 关键年份快跳
const keyYears = [1997, 2003, 2007, 2011, 2016, 2020, 2022, 2024]

const store = useUraniumOntologyStore()
const { loading } = storeToRefs(store)

const chartRef = ref(null)
let chart = null
let renderTimer = null
let resizeObserver = null

const searchQuery = ref('')
const windowIdx = ref(0)
const maxWindowIdx = ref(0)

const currentYear = computed(() => {
  const wins = store.dynamicWindows
  if (!wins.length) return '加载中...'
  return wins[windowIdx.value] || ''
})

const currentSnapshot = computed(() => {
  const wins = store.dynamicWindows
  if (!wins.length) return { node_count: 0, edge_count: 0, event_count: 0 }
  const key = wins[windowIdx.value]
  const gs = store.dynamicGraph?.graph_sequence
  if (!gs || !key) return { node_count: 0, edge_count: 0, event_count: 0 }
  const snap = gs[key]
  if (!snap) return { node_count: 0, edge_count: 0, event_count: 0 }
  const mg = snap.merged_graph || {}
  return {
    node_count: mg.nodes?.length || 0,
    edge_count: mg.edges?.length || 0,
    event_count: snap.event_count || 0,
    cumulative_events: snap.cumulative_events || 0,
  }
})

const roleCounts = computed(() => {
  const rag = store.dynamicGraph?.role_annotated_graph
  const dist = rag?.role_distribution || store.dynamicGraph?.metadata?.role_distribution || {}
  return { key_nodes: dist.key_nodes || 0, bridge_nodes: dist.bridge_nodes || 0, normal_nodes: dist.normal_nodes || 0 }
})

const structuralChanges = computed(() => {
  return store.dynamicGraph?.timeline?.structural_changes || []
})

const statsDisplay = computed(() => ({
  nodes: store.currentView.nodes?.length || 0,
  edges: store.currentView.edges?.length || 0
}))

const propsEntries = computed(() => {
  const props = store.selectedNode?.properties
  if (!props || typeof props !== 'object') return []
  return Object.entries(props).filter(([k, v]) =>
    v !== null && v !== '' && v !== undefined
  )
})

const neighbors = computed(() => {
  if (!store.selectedNode) return []
  const nodeId = store.selectedNode.id
  const graph = store.currentView
  const related = new Map()
  for (const e of graph.edges || []) {
    if (e.source === nodeId && e.target !== nodeId) {
      const n = (graph.nodes || []).find(nd => nd.id === e.target)
      if (n) related.set(n.id, { id: n.id, label: n.name, relation: e.relation })
    } else if (e.target === nodeId && e.source !== nodeId) {
      const n = (graph.nodes || []).find(nd => nd.id === e.source)
      if (n) related.set(n.id, { id: n.id, label: n.name, relation: e.relation })
    }
  }
  return [...related.values()]
})

// 节点类型颜色映射（与后端一致）
const TYPE_COLORS = {
  'Country': '#FF6B35', 'UraniumMine': '#8B4513', 'UraniumCompany': '#3498DB',
  'UraniumProduction': '#00D4AA', 'UraniumDemand': '#E74C3C',
  'ExplorationMetric': '#F39C12', 'PriceMetric': '#FFD700', 'InventoryMetric': '#1ABC9C',
  'CostMetric': '#E67E22', 'ResourceMetric': '#82E0AA',
  'RiskEvent': '#F56C6C', 'TransportRoute': '#00CED1',
  'Policy': '#BDC3C7', 'FuelCycleFacility': '#9B59B6',
  'ScenarioNode': '#FADBD8', 'TurningPoint': '#FF6B6B',
}

function getNodeTypeColor(nodeType) {
  return TYPE_COLORS[nodeType] || '#999'
}

function formatVal(v) {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 60)
  return String(v).slice(0, 80)
}

function getVisibleGraph() {
  const graph = store.currentView
  const nodes = graph.nodes || []
  const edges = graph.edges || []

  if (nodes.length <= MAX_VISIBLE_NODES) return { nodes, edges }

  // 优先展示：Country > 矿山/企业 > 事件 > 指标
  const countryNodes = [], coreNodes = [], eventNodes = [], metricNodes = [], otherNodes = []
  for (const n of nodes) {
    if (n.nodeType === 'Country') countryNodes.push(n)
    else if (CORE_TYPES.has(n.nodeType)) coreNodes.push(n)
    else if (n.nodeType === 'TurningPoint' || n.nodeType === 'ScenarioNode') eventNodes.push(n)
    else if (METRIC_TYPES.has(n.nodeType)) metricNodes.push(n)
    else otherNodes.push(n)
  }

  // 关键节点优先（国家+角色标注的矿山/企业）
  const keyCore = coreNodes.filter(n => {
    const role = n.properties?.role
    return role === 'key_node' || role === 'bridge_node'
  })
  const plainCore = coreNodes.filter(n => !keyCore.includes(n))

  let selected = [...countryNodes, ...keyCore, ...plainCore, ...eventNodes, ...metricNodes, ...otherNodes]
  if (selected.length > MAX_VISIBLE_NODES) selected = selected.slice(0, MAX_VISIBLE_NODES)

  const selectedIds = new Set(selected.map(n => n.id))
  const filteredEdges = edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target))
  return { nodes: selected, edges: filteredEdges }
}

function buildChartOption() {
  const { nodes, edges } = getVisibleGraph()
  const graph = store.currentView
  const categories = graph.categories || []
  const selectedId = store.selectedNode?.id

  // 注入自定义颜色
  const enrichedCategories = categories.map(c => ({
    ...c,
    itemStyle: { color: TYPE_COLORS[c.name] || c.itemStyle?.color || '#999' }
  }))

  return {
    tooltip: {
      trigger: 'item', confine: true,
      formatter: (p) => {
        if (p.dataType === 'node') {
          const props = p.data.properties || {}
          const propStr = Object.entries(props).slice(0, 6)
            .map(([k, v]) => `${k}: ${formatVal(v)}`).join('<br/>')
          return `<b>${p.name}</b><br/>类型: ${p.data.nodeType}<br/>${propStr}`
        }
        return `${p.data.source} → ${p.data.relation || ''} → ${p.data.target}`
      }
    },
    legend: { data: enrichedCategories.map(c => c.name), bottom: 10, type: 'scroll' },
    animationDuration: 500,
    animationEasingUpdate: 'cubicOut',
    series: [{
      type: 'graph', layout: 'force',
      data: nodes.map(n => ({
        id: n.id, name: n.name, category: n.category,
        symbolSize: n.symbolSize || 20, nodeType: n.nodeType, properties: n.properties,
        itemStyle: n.id === selectedId
          ? { borderColor: '#ff0', borderWidth: 3, shadowBlur: 12, shadowColor: '#ff0' }
          : undefined,
        label: { show: (n.symbolSize || 20) > 30, fontSize: 10, position: 'right' }
      })),
      edges: edges.map(e => ({
        source: e.source, target: e.target, relation: e.relation,
        label: { show: false, formatter: e.relation },
        lineStyle: { curveness: 0.15, opacity: 0.3, width: 1 }
      })),
      categories: enrichedCategories,
      roam: true, draggable: true,
      force: { repulsion: 350, gravity: 0.05, edgeLength: [80, 250], layoutAnimation: true, friction: 0.6 },
      emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
      scaleLimit: { min: 0.15, max: 5 }
    }]
  }
}

function tryInitChart() {
  if (!chartRef.value) return false
  const el = chartRef.value
  if (el.clientWidth === 0 || el.clientHeight === 0) return false
  if (!chart) {
    chart = echarts.init(el)
    chart.on('click', (params) => {
      if (params.dataType === 'node') store.selectNode(params.data)
    })
  }
  return true
}

function renderChart() {
  if (!tryInitChart()) { renderTimer = setTimeout(renderChart, 200); return }
  chart.setOption(buildChartOption(), true)
}

function handleResize() { if (chart && chartRef.value) { chart.resize(); renderChart() } }

// 年度窗口导航
function windowStep(dir) {
  const next = windowIdx.value + dir
  if (next >= 0 && next <= maxWindowIdx.value) { windowIdx.value = next; loadWindow() }
}
function onWindowSlide() { loadWindow() }

function jumpToYear(year) {
  const targetKey = `t_${year}`
  const idx = store.dynamicWindows.indexOf(targetKey)
  if (idx >= 0) { windowIdx.value = idx; loadWindow() }
}

async function loadWindow() {
  const winKey = store.dynamicWindows[windowIdx.value]
  if (winKey) { await store.loadDynamicWindow(winKey); nextTick(renderChart) }
}

function onSearch() {
  if (!searchQuery.value) return
  const q = searchQuery.value.toLowerCase()
  const nodes = store.currentView.nodes || []
  const found = nodes.find(n =>
    (n.name || '').toLowerCase().includes(q) || (n.id || '').toLowerCase().includes(q)
  )
  if (found) store.selectNode(found)
}
function onClearSearch() { store.clearSelection() }

function focusNode(nodeId) {
  const graph = store.currentView
  const node = (graph.nodes || []).find(n => n.id === nodeId)
  if (node) store.selectNode(node)
}

// Watchers
watch(() => store.currentView, () => {
  clearTimeout(renderTimer)
  renderTimer = setTimeout(() => nextTick(renderChart), 80)
})
watch(() => store.selectedNode, () => {
  if (chart) chart.setOption(buildChartOption(), true)
})

onMounted(async () => {
  // 加载铀动态网络数据
  await store.fetchDynamicGraph()
  maxWindowIdx.value = store.dynamicWindows.length - 1
  windowIdx.value = store.dynamicWindows.length - 1  // 默认显示最新年份 (2024)
  if (store.dynamicWindows.length) {
    await store.loadDynamicWindow(store.dynamicWindows[windowIdx.value])
  }
  await store.fetchDynamicTimeline()

  await nextTick()
  setTimeout(renderChart, 200)
  window.addEventListener('resize', handleResize)

  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(chartRef.value)
  }
})

onBeforeUnmount(() => {
  clearTimeout(renderTimer)
  window.removeEventListener('resize', handleResize)
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.ukg-container { display: flex; height: 100%; background: #f5f7fa; }
.ukg-left-panel { width: 240px; min-width: 240px; background: #fff; border-right: 1px solid #e4e7ed; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.panel-header { font-weight: 700; font-size: 14px; color: #303133; padding-bottom: 8px; border-bottom: 1px solid #ebeef5; display: flex; justify-content: space-between; align-items: center; }
.panel-section { margin-top: 4px; }
.panel-section label { font-size: 12px; color: #909399; display: block; margin-bottom: 4px; }
.timeline-controls { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.timeline-label { font-size: 12px; font-weight: 600; color: #FF6B35; min-width: 60px; text-align: center; }
.window-info { display: flex; justify-content: space-around; font-size: 11px; color: #909399; margin-top: 2px; }
.key-years { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 6px; }
.dynamic-roles-info { display: flex; gap: 4px; flex-wrap: wrap; }
.stats-section { margin-top: 8px; }
.stat-line { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; color: #606266; }
.stat-line strong { color: #303133; }
.structural-changes { max-height: 200px; overflow-y: auto; }
.change-item { font-size: 11px; padding: 3px 0; border-bottom: 1px solid #f0f0f0; display: flex; gap: 4px; align-items: flex-start; }
.change-year { color: #FF6B35; font-weight: 600; white-space: nowrap; min-width: 48px; }
.change-desc { color: #606266; line-height: 1.3; }

/* 中央图区域 */
.ukg-center { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; }
.ukg-loading-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #909399; gap: 8px; z-index: 10; background: rgba(245, 247, 250, 0.85); pointer-events: none; }
.ukg-chart { flex: 1; min-height: 0; min-width: 0; width: 100%; }

/* 右侧详情 */
.ukg-right-panel { width: 260px; min-width: 260px; background: #fff; border-left: 1px solid #e4e7ed; padding: 12px; overflow-y: auto; }
.ukg-right-empty { display: flex; flex-direction: column; }
.detail-content { margin-top: 8px; display: flex; flex-direction: column; gap: 10px; }
.detail-field label { font-size: 12px; color: #909399; display: block; margin-bottom: 2px; }
.neighbor-list { display: flex; flex-wrap: wrap; gap: 4px; }
.neighbor-chip { cursor: pointer; font-size: 11px; padding: 2px 6px; background: #ecf5ff; color: #409EFF; border-radius: 4px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.neighbor-chip:hover { background: #d9ecff; }
.prop-row { display: flex; font-size: 11px; padding: 2px 0; border-bottom: 1px solid #f5f5f5; }
.prop-key { color: #909399; min-width: 80px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prop-val { color: #303133; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-left: 4px; }

:deep(.el-slider__runway) { margin: 6px 0; }
:deep(.el-slider__bar) { background: #FF6B35; }
:deep(.el-slider__button) { border-color: #FF6B35; }
</style>
