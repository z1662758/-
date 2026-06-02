<template>
  <div class="kg-container">
    <!-- 左侧筛选面板 -->
    <div class="kg-left-panel">
      <div class="panel-header">{{ isOwlView ? 'OWL 本体网络' : '动态本体网络' }}</div>

      <!-- 时间窗口 (仅动态网络) -->
      <div class="panel-section" v-if="!isOwlView">
        <label>时间窗口 (2024-01 ~ 2026-06)</label>
        <div class="timeline-controls">
          <el-button size="small" :disabled="!windowIdx" @click="windowStep(-1)">◀</el-button>
          <span class="timeline-label">{{ currentMonth }}</span>
          <el-button size="small" :disabled="windowIdx >= maxWindowIdx" @click="windowStep(1)">▶</el-button>
        </div>
        <el-slider v-model="windowIdx" :min="0" :max="maxWindowIdx" :step="1"
                   :show-tooltip="false" @change="onWindowSlide" size="small"/>
        <div class="window-info">
          <span>{{ currentSnapshot.node_count || 0 }} 节点</span>
          <span>{{ currentSnapshot.edge_count || 0 }} 边</span>
        </div>
      </div>

      <!-- OWL 网络摘要 (OWL视图) -->
      <div class="panel-section" v-if="isOwlView">
        <div class="owl-view-stats">
          <div class="owl-view-row">
            <span>节点</span><strong>{{ statsDisplay.nodes }}</strong>
          </div>
          <div class="owl-view-row">
            <span>边</span><strong>{{ statsDisplay.edges }}</strong>
          </div>
          <div class="owl-view-row">
            <span>类型</span><strong>{{ store.owlNetworkGraph?.categories?.length || 0 }}</strong>
          </div>
        </div>
        <el-button size="small" type="warning" link @click="isOwlView=false; loadWindow()"
                   style="margin-top:6px;font-size:10px">
          ◂ 切回动态时间线
        </el-button>
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
        <el-input v-model="searchQuery" placeholder="输入实体名称..."
                  clearable @keyup.enter="onSearch" @clear="onClearSearch">
          <template #prefix><el-icon><Search/></el-icon></template>
        </el-input>
      </div>

      <div class="panel-section stats-section">
        <div class="stat-line"><span>总节点</span><strong>{{ statsDisplay.nodes }}</strong></div>
        <div class="stat-line"><span>总边</span><strong>{{ statsDisplay.edges }}</strong></div>
        <template v-if="!isOwlView">
          <div class="stat-line"><span>事件总数</span><strong>{{ store.dynamicGraph?.metadata?.total_events || 0 }}</strong></div>
          <div class="stat-line"><span>时间窗口</span><strong>{{ store.dynamicWindows.length }}</strong></div>
        </template>
        <template v-else>
          <div class="stat-line"><span>类层次</span><strong>{{ store.owlStats?.total_classes || store.owlNetwork?.statistics?.total_classes || 0 }}</strong></div>
          <div class="stat-line"><span>推理规则</span><strong>{{ store.owlStats?.swrl_rules || 8 }}</strong></div>
        </template>
      </div>

      <!-- OWL 2 DL 本体推理 + 中心性网络 -->
      <div class="panel-section owl-section" v-if="store.owlNetworkLabels">
        <div class="owl-header">
          <span class="owl-badge">OWL 2 DL</span>
          <span class="swrl-badge">SWRL ×{{ store.owlStats?.swrl_rules || 8 }}</span>
          <el-button size="small" type="primary" link
                     @click="switchToOwlNetwork"
                     :loading="store.owlNetworkLoading"
                     style="margin-left:auto;font-size:10px">
            {{ store.owlNetworkGraph ? '✓ OWL网络' : '加载网络' }}
          </el-button>
        </div>
        <div class="owl-reasoner">
          <span class="reasoner-dot"></span>
          Pellet 推理器 &middot; NetworkX 5维中心性
        </div>
        <div class="owl-centrality-stats">
          <div class="cent-stat">
            <span class="cent-num">{{ store.owlNetwork?.statistics?.graph_nodes || 0 }}</span>
            <span class="cent-label">节点</span>
          </div>
          <div class="cent-stat">
            <span class="cent-num">{{ store.owlNetwork?.statistics?.graph_edges || 0 }}</span>
            <span class="cent-label">边</span>
          </div>
          <div class="cent-stat cent-key">
            <span class="cent-num">{{ roleCountsOwl.key_nodes }}</span>
            <span class="cent-label">关键节点</span>
          </div>
          <div class="cent-stat cent-bridge">
            <span class="cent-num">{{ roleCountsOwl.bridge_nodes }}</span>
            <span class="cent-label">桥接节点</span>
          </div>
        </div>
        <div class="inferred-title">SWRL 推理分类</div>
        <div class="inferred-tags">
          <el-tooltip content="高风险实体" placement="left">
            <span class="inf-tag inf-danger">
              高风险 {{ store.owlNetworkLabels.HighRiskEntity?.count || 0 }}
            </span>
          </el-tooltip>
          <el-tooltip content="供应链中断" placement="left">
            <span class="inf-tag inf-warning">
              中断 {{ store.owlNetworkLabels.SupplyChainDisruption?.count || 0 }}
            </span>
          </el-tooltip>
          <el-tooltip content="关键物料短缺" placement="left">
            <span class="inf-tag inf-critical">
              物料 {{ store.owlNetworkLabels.CriticalMaterialShortage?.count || 0 }}
            </span>
          </el-tooltip>
          <el-tooltip content="高库存压力" placement="left">
            <span class="inf-tag inf-pressure">
              库存 {{ store.owlNetworkLabels.HighInventoryPressure?.count || 0 }}
            </span>
          </el-tooltip>
          <el-tooltip content="多风险区域" placement="left">
            <span class="inf-tag inf-multirisk">
              区域 {{ store.owlNetworkLabels.MultiRiskRegion?.count || 0 }}
            </span>
          </el-tooltip>
          <el-tooltip content="物流瓶颈" placement="left">
            <span class="inf-tag inf-bottleneck">
              物流 {{ store.owlNetworkLabels.LogisticsBottleneck?.count || 0 }}
            </span>
          </el-tooltip>
        </div>
      </div>

      <!-- OWL loading placeholder -->
      <div class="panel-section owl-section owl-loading" v-else-if="store.owlNetworkLoading">
        <div class="owl-header">
          <span class="owl-badge">OWL 2 DL</span>
        </div>
        <div class="owl-reasoner">
          <span class="reasoner-dot"></span> 正在加载 OWL 网络...
        </div>
      </div>

      <div class="panel-section" style="margin-top:8px" v-if="!isOwlView">
        <label>结构变化</label>
        <div class="structural-changes" v-if="structuralChanges.length">
          <div v-for="(ch, i) in structuralChanges.slice(0, 6)" :key="i"
               class="change-item">
            <span class="change-month">{{ ch.timestamp || ch.month }}</span>
            <span class="change-desc">{{ ch.description }}</span>
          </div>
        </div>
        <el-empty v-else description="暂无结构变化" :image-size="30"/>
      </div>
    </div>

    <!-- 中央图区域 -->
    <div class="kg-center">
      <div v-show="loading" class="kg-loading-overlay">
        <el-icon class="is-loading" :size="40"><Loading/></el-icon>
        <span>图谱加载中...</span>
      </div>
      <div ref="chartRef" class="kg-chart"></div>
    </div>

    <!-- 右侧详情面板 -->
    <div class="kg-right-panel" v-if="store.selectedNode">
      <div class="panel-header">
        节点详情
        <el-button link size="small" @click="store.clearSelection()">✕</el-button>
      </div>
      <div class="detail-content">
        <div class="detail-field"><label>名称</label><span>{{ store.selectedNode.name }}</span></div>
        <div class="detail-field"><label>类型</label>
          <el-tag size="small">{{ store.selectedNode.nodeType }}</el-tag>
        </div>

        <!-- 中心性分数（5维） -->
        <div class="detail-field" v-if="centralityMetrics">
          <label>5维中心性评分</label>
          <div class="centrality-card">
            <div class="cent-row">
              <span class="cent-dim">度中心性 (0.3)</span>
              <span class="cent-bar-bg"><span class="cent-bar-fill" :style="{width: (centralityMetrics.degree*100).toFixed(1)+'%'}"></span></span>
              <span class="cent-val">{{ (centralityMetrics.degree || 0).toFixed(4) }}</span>
            </div>
            <div class="cent-row">
              <span class="cent-dim">介数中心性 (0.3)</span>
              <span class="cent-bar-bg"><span class="cent-bar-fill cent-bet" :style="{width: (centralityMetrics.betweenness*100).toFixed(1)+'%'}"></span></span>
              <span class="cent-val">{{ (centralityMetrics.betweenness || 0).toFixed(4) }}</span>
            </div>
            <div class="cent-row">
              <span class="cent-dim">紧密中心性 (0.2)</span>
              <span class="cent-bar-bg"><span class="cent-bar-fill cent-clo" :style="{width: (centralityMetrics.closeness*100).toFixed(1)+'%'}"></span></span>
              <span class="cent-val">{{ (centralityMetrics.closeness || 0).toFixed(4) }}</span>
            </div>
            <div class="cent-row">
              <span class="cent-dim">K-Core (0.1)</span>
              <span class="cent-bar-bg"><span class="cent-bar-fill cent-kc" :style="{width: (centralityMetrics.k_core_normalized*100).toFixed(1)+'%'}"></span></span>
              <span class="cent-val">{{ (centralityMetrics.k_core_normalized || 0).toFixed(4) }}</span>
            </div>
            <div class="cent-row">
              <span class="cent-dim">桥接系数 (0.1)</span>
              <span class="cent-bar-bg"><span class="cent-bar-fill cent-br" :style="{width: (centralityMetrics.bridge_coefficient*100).toFixed(1)+'%'}"></span></span>
              <span class="cent-val">{{ (centralityMetrics.bridge_coefficient || 0).toFixed(4) }}</span>
            </div>
            <div class="cent-score-total">
              综合得分: <strong>{{ nodeRoleScore.toFixed(4) }}</strong>
              <el-tag size="small" :type="nodeRoleTag">{{ nodeRoleLabel }}</el-tag>
            </div>
          </div>
        </div>

        <!-- 推理标签 -->
        <div class="detail-field" v-if="inferenceTags.length">
          <label>OWL 推理标签</label>
          <div class="inference-tags-list">
            <span v-for="tag in inferenceTags" :key="tag.key" :class="['inf-tag', tag.cssClass]">{{ tag.label }}</span>
          </div>
        </div>

        <div class="detail-field" v-if="neighbors.length">
          <label>关联节点 ({{ neighbors.length }})</label>
          <div class="neighbor-list">
            <span v-for="n in neighbors.slice(0, 20)" :key="n.id"
                  class="neighbor-chip" @click="focusNode(n.id)">{{ n.label }}</span>
          </div>
        </div>
        <div class="detail-field" v-if="propsEntries.length">
          <label>属性</label>
          <div class="props-table">
            <div v-for="(v, k) in propsEntries.slice(0, 15)" :key="k" class="prop-row">
              <span class="prop-key">{{ k }}</span><span class="prop-val">{{ formatVal(v) }}</span>
            </div>
          </div>
        </div>
        <!-- OWL 风险传导路径 -->
        <div class="detail-field" v-if="store.owlRiskPaths.length">
          <label>风险传导路径 (OWL推理)</label>
          <div class="risk-path-list">
            <div v-for="(p, i) in store.owlRiskPaths.slice(0, 5)" :key="i" class="risk-path-item">
              <div class="risk-path-event">{{ p.eventName?.slice(0, 40) || p.event }}</div>
              <div class="risk-path-arrow">&#8627; 影响</div>
              <div class="risk-path-target">{{ p.targetName?.slice(0, 40) || p.target }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="kg-right-panel kg-right-empty" v-else>
      <div class="panel-header">节点详情</div>
      <el-empty description="点击节点查看详情" :image-size="60"/>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useOntologyStore } from '@/stores/ontology'
import { storeToRefs } from 'pinia'
import { Search, Loading } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const MAX_VISIBLE_NODES = 300

// OWL视图中默认隐藏的指标类节点（数量大且非核心拓扑）
const METRIC_TYPES = new Set(['SalesMetric', 'CostMetric', 'DemandSupplyMetric', 'InventoryMetric'])
// 核心供应链节点类型（优先展示）
const CORE_TYPES = new Set([
  'Supplier', 'Manufacturer', 'LogisticsProvider', 'Dealer',
  'VehicleModel', 'Material', 'Region',
  'RiskEvent', 'LogisticsRisk', 'MaterialRisk', 'GeopoliticalRisk', 'PolicyRisk',
  'MarketEvent', 'PolicyEvent', 'MultiRiskRegion',
  'HighRiskEntity', 'SupplyChainDisruption', 'HighInventoryPressure',
  'CriticalMaterialShortage', 'LogisticsBottleneck',
  'TurningPoint', 'ScenarioNode', 'RiskProfile',
])

const store = useOntologyStore()
const { loading } = storeToRefs(store)

const chartRef = ref(null)
let chart = null
let renderTimer = null
let resizeObserver = null

const searchQuery = ref('')
const windowIdx = ref(0)
const maxWindowIdx = ref(0)
const isOwlView = ref(false)  // true = OWL网络视图, false = 动态网络视图

const currentMonth = computed(() => {
  const wins = store.dynamicWindows
  if (!wins.length) return '加载中...'
  return wins[windowIdx.value] || ''
})

const currentSnapshot = computed(() => {
  const wins = store.dynamicWindows
  if (!wins.length) return { node_count: 0, edge_count: 0 }
  const key = wins[windowIdx.value]
  const gs = store.dynamicGraph?.graph_sequence
  if (!gs || !key) return { node_count: 0, edge_count: 0 }
  const snap = gs[key]
  if (!snap) return { node_count: 0, edge_count: 0 }
  const mg = snap.merged_graph || {}
  return {
    node_count: mg.nodes?.length || 0,
    edge_count: mg.edges?.length || 0,
  }
})

const roleCounts = computed(() => {
  if (isOwlView.value && store.owlNetwork) {
    const dist = store.owlNetwork.statistics?.role_distribution || {}
    return {
      key_nodes: dist.key_nodes || 0,
      bridge_nodes: dist.bridge_nodes || 0,
      normal_nodes: dist.normal_nodes || 0,
    }
  }
  const rag = store.dynamicGraph?.role_annotated_graph
  const dist = rag?.role_distribution || store.dynamicGraph?.metadata?.role_distribution || {}
  return {
    key_nodes: dist.key_nodes || 0,
    bridge_nodes: dist.bridge_nodes || 0,
    normal_nodes: dist.normal_nodes || 0
  }
})

const roleCountsOwl = computed(() => {
  const dist = store.owlNetwork?.statistics?.role_distribution || {}
  return {
    key_nodes: dist.key_nodes || 0,
    bridge_nodes: dist.bridge_nodes || 0,
    normal_nodes: dist.normal_nodes || 0,
  }
})

const structuralChanges = computed(() => {
  return store.dynamicGraph?.timeline?.structural_changes || []
})

const statsDisplay = computed(() => ({
  nodes: store.currentView.nodes?.length || 0,
  edges: store.currentView.edges?.length || 0
}))

// 中心性指标（5维）
const centralityMetrics = computed(() => {
  const props = store.selectedNode?.properties
  const cm = props?.centrality_metrics
  if (cm && typeof cm === 'object' && Object.keys(cm).length > 0) return cm
  return null
})

const nodeRoleScore = computed(() => {
  return store.selectedNode?.properties?.role_confidence || 0
})

const nodeRoleLabel = computed(() => {
  const role = store.selectedNode?.properties?.role || ''
  const map = { key_node: '关键节点', bridge_node: '桥接节点', normal_node: '普通节点' }
  return map[role] || role
})

const nodeRoleTag = computed(() => {
  const role = store.selectedNode?.properties?.role || ''
  if (role === 'key_node') return 'danger'
  if (role === 'bridge_node') return 'warning'
  return 'info'
})

const inferenceTags = computed(() => {
  const props = store.selectedNode?.properties || {}
  const tagDefs = [
    { key: 'HighRiskEntity', label: '高风险实体', cssClass: 'inf-danger' },
    { key: 'SupplyChainDisruption', label: '供应链中断', cssClass: 'inf-warning' },
    { key: 'HighInventoryPressure', label: '高库存压力', cssClass: 'inf-pressure' },
    { key: 'CriticalMaterialShortage', label: '关键物料短缺', cssClass: 'inf-critical' },
    { key: 'MultiRiskRegion', label: '多风险区域', cssClass: 'inf-multirisk' },
    { key: 'LogisticsBottleneck', label: '物流瓶颈', cssClass: 'inf-bottleneck' },
  ]
  return tagDefs.filter(t => props[t.key])
})

const propsEntries = computed(() => {
  const props = store.selectedNode?.properties
  if (!props || typeof props !== 'object') return []
  // 过滤掉中心性和推理标签（已在专门区块展示）
  const skipKeys = ['centrality_metrics', 'role_confidence', 'role',
    'HighRiskEntity', 'SupplyChainDisruption', 'HighInventoryPressure',
    'CriticalMaterialShortage', 'MultiRiskRegion', 'LogisticsBottleneck']
  return Object.entries(props).filter(([k, v]) =>
    !skipKeys.includes(k) && v !== null && v !== '' && v !== undefined
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

function formatVal(v) {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 60)
  return String(v).slice(0, 80)
}

function getVisibleGraph() {
  const graph = store.currentView
  const nodes = graph.nodes || []
  const edges = graph.edges || []

  // 小图直接返回全部
  if (nodes.length <= MAX_VISIBLE_NODES) return { nodes, edges }

  // OWL视图：过滤指标节点，优先展示核心供应链节点
  if (isOwlView.value) {
    return filterOwlGraph(nodes, edges)
  }

  // 动态网络视图：按类型优先级截断
  const priorityTypes = ['Manufacturer', 'Supplier', 'LogisticsProvider', 'Dealer', 'TurningPoint']
  const priorityNodes = []
  const otherNodes = []
  for (const n of nodes) {
    if (priorityTypes.includes(n.nodeType)) priorityNodes.push(n)
    else otherNodes.push(n)
  }
  const selected = [...priorityNodes, ...otherNodes].slice(0, MAX_VISIBLE_NODES)
  const selectedIds = new Set(selected.map(n => n.id))
  const filteredEdges = edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target))
  return { nodes: selected, edges: filteredEdges }
}

function filterOwlGraph(nodes, edges) {
  // 第1层：核心类型节点
  const coreNodes = []
  const metricNodes = []
  const otherNodes = []
  for (const n of nodes) {
    if (CORE_TYPES.has(n.nodeType)) coreNodes.push(n)
    else if (METRIC_TYPES.has(n.nodeType)) metricNodes.push(n)
    else otherNodes.push(n)
  }

  // 核心节点中，有角色标注的优先（key_node, bridge_node）
  const keyNodes = coreNodes.filter(n => {
    const role = n.properties?.role
    return role === 'key_node' || role === 'bridge_node'
  })
  const plainCore = coreNodes.filter(n => !keyNodes.includes(n))

  // 组装：角色节点 + 其他核心 + 非指标类型 + 指标（截断到上限）
  let selected = [...keyNodes, ...plainCore, ...otherNodes, ...metricNodes]
  if (selected.length > MAX_VISIBLE_NODES) {
    selected = selected.slice(0, MAX_VISIBLE_NODES)
  }

  const selectedIds = new Set(selected.map(n => n.id))
  const filteredEdges = edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target))
  return { nodes: selected, edges: filteredEdges }
}

function buildChartOption() {
  const { nodes, edges } = getVisibleGraph()
  const graph = store.currentView
  const categories = graph.categories || []
  const selectedId = store.selectedNode?.id

  return {
    tooltip: {
      trigger: 'item',
      confine: true,
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
    legend: {
      data: categories.map(c => c.name),
      bottom: 10,
      type: 'scroll'
    },
    animationDuration: 400,
    animationEasingUpdate: 'cubicOut',
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes.map(n => ({
        id: n.id,
        name: n.name,
        category: n.category,
        symbolSize: n.symbolSize || 20,
        nodeType: n.nodeType,
        properties: n.properties,
        itemStyle: n.id === selectedId
          ? { borderColor: '#ff0', borderWidth: 3, shadowBlur: 10, shadowColor: '#ff0' }
          : undefined,
        label: { show: (n.symbolSize || 20) > 28, fontSize: 10, position: 'right' }
      })),
      edges: edges.map(e => ({
        source: e.source,
        target: e.target,
        relation: e.relation,
        label: { show: false, formatter: e.relation },
        lineStyle: { curveness: 0.15, opacity: 0.35, width: 1 }
      })),
      categories,
      roam: true,
      draggable: true,
      force: {
        repulsion: 400,
        gravity: 0.06,
        edgeLength: [60, 220],
        layoutAnimation: true,
        friction: 0.6
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: { width: 3 }
      },
      scaleLimit: { min: 0.2, max: 5 }
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
  if (!tryInitChart()) {
    renderTimer = setTimeout(renderChart, 200)
    return
  }
  chart.setOption(buildChartOption(), true)
}

function handleResize() {
  if (!chart || !chartRef.value) return
  chart.resize()
  renderChart()
}

// Window navigation
function windowStep(dir) {
  const next = windowIdx.value + dir
  if (next >= 0 && next <= maxWindowIdx.value) {
    windowIdx.value = next
    loadWindow()
  }
}
function onWindowSlide() { loadWindow() }

async function loadWindow() {
  const winKey = store.dynamicWindows[windowIdx.value]
  if (winKey) {
    isOwlView.value = false
    await store.loadDynamicWindow(winKey)
    nextTick(renderChart)
  }
}

// Search in current view nodes
function onSearch() {
  if (!searchQuery.value) return
  const q = searchQuery.value.toLowerCase()
  const nodes = store.currentView.nodes || []
  const found = nodes.find(n =>
    (n.name || '').toLowerCase().includes(q) ||
    (n.id || '').toLowerCase().includes(q)
  )
  if (found) store.selectNode(found)
}
function onClearSearch() {
  store.clearSelection()
}

function focusNode(nodeId) {
  const graph = store.currentView
  const node = (graph.nodes || []).find(n => n.id === nodeId)
  if (node) store.selectNode(node)
}

async function switchToOwlNetwork() {
  if (!store.owlNetworkGraph) {
    await store.fetchOwlNetwork()
  }
  // 切换视图
  if (store.owlNetworkGraph) {
    store.currentView = { ...store.owlNetworkGraph }
    isOwlView.value = true
    nextTick(renderChart)
  }
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
  // 1. 加载 OWL 本体推理 + 网络（默认视图，优先加载）
  store.fetchOwlStats()
  store.fetchOwlInferred()
  await store.fetchOwlNetwork()

  if (store.owlNetworkGraph?.nodes?.length) {
    store.currentView = { ...store.owlNetworkGraph }
    isOwlView.value = true
  }

  // 2. 后台加载动态网络（备用，不覆盖OWL视图）
  store.fetchDynamicGraph().then(() => {
    if (!isOwlView.value && store.dynamicWindows.length) {
      maxWindowIdx.value = store.dynamicWindows.length - 1
      windowIdx.value = store.dynamicWindows.length - 1
      store.loadDynamicWindow(store.dynamicWindows[windowIdx.value])
    } else {
      // 仅记录元数据，不切换视图
      maxWindowIdx.value = store.dynamicWindows.length - 1
      windowIdx.value = store.dynamicWindows.length - 1
    }
  }).then(() => store.fetchDynamicTimeline())

  await nextTick()
  setTimeout(renderChart, 150)
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
.kg-container {
  display: flex;
  height: 100%;
  background: #f5f7fa;
}
.kg-left-panel {
  width: 240px;
  min-width: 240px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.panel-header {
  font-weight: 700;
  font-size: 14px;
  color: #303133;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.panel-section { margin-top: 4px; }
.panel-section label {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-bottom: 4px;
}
.timeline-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.timeline-label {
  font-size: 12px;
  font-weight: 600;
  color: #409EFF;
  min-width: 65px;
  text-align: center;
}
.window-info {
  display: flex;
  justify-content: space-around;
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}
.owl-view-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.owl-view-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
  color: #606266;
}
.owl-view-row strong {
  color: #303133;
}
.dynamic-roles-info {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.stats-section { margin-top: 8px; }
.stat-line {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
  color: #606266;
}
.stat-line strong { color: #303133; }
.structural-changes {
  max-height: 160px;
  overflow-y: auto;
}
.change-item {
  font-size: 11px;
  padding: 3px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 4px;
  align-items: flex-start;
}
.change-month {
  color: #409EFF;
  font-weight: 600;
  white-space: nowrap;
  min-width: 55px;
}
.change-desc {
  color: #606266;
  line-height: 1.3;
}

/* 中心图区域 */
.kg-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}
.kg-loading-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  gap: 8px;
  z-index: 10;
  background: rgba(245, 247, 250, 0.85);
  pointer-events: none;
}
.kg-chart {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
}

/* 右侧详情 */
.kg-right-panel {
  width: 260px;
  min-width: 260px;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  padding: 12px;
  overflow-y: auto;
}
.kg-right-empty { display: flex; flex-direction: column; }
.detail-content { margin-top: 8px; display: flex; flex-direction: column; gap: 10px; }
.detail-field label {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-bottom: 2px;
}
.neighbor-list { display: flex; flex-wrap: wrap; gap: 4px; }
.neighbor-chip {
  cursor: pointer;
  font-size: 11px;
  padding: 2px 6px;
  background: #ecf5ff;
  color: #409EFF;
  border-radius: 4px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.neighbor-chip:hover { background: #d9ecff; }
.prop-row { display: flex; font-size: 11px; padding: 2px 0; border-bottom: 1px solid #f5f5f5; }
.prop-key { color: #909399; min-width: 70px; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prop-val { color: #303133; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-left: 4px; }

/* ===== OWL 中心性卡片 ===== */
.owl-centrality-stats {
  display: flex;
  gap: 6px;
  margin: 6px 0;
  flex-wrap: wrap;
}
.cent-stat {
  text-align: center;
  padding: 4px 8px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  min-width: 42px;
}
.cent-stat.cent-key { border-color: #F56C6C; background: #fef0f0; }
.cent-stat.cent-bridge { border-color: #E6A23C; background: #fef9f0; }
.cent-num {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}
.cent-key .cent-num { color: #F56C6C; }
.cent-bridge .cent-num { color: #E6A23C; }
.cent-label {
  display: block;
  font-size: 9px;
  color: #909399;
}
.owl-loading {
  opacity: 0.7;
}

/* 右侧详情 - 中心性卡片 */
.centrality-card {
  background: linear-gradient(135deg, #f8f9fd 0%, #eef1f8 100%);
  border: 1px solid #d8dce6;
  border-radius: 6px;
  padding: 8px 10px;
}
.cent-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0;
}
.cent-dim {
  font-size: 10px;
  color: #606266;
  min-width: 90px;
  text-align: right;
}
.cent-bar-bg {
  flex: 1;
  height: 6px;
  background: #e4e7ed;
  border-radius: 3px;
  overflow: hidden;
}
.cent-bar-fill {
  height: 100%;
  background: #409EFF;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.cent-bar-fill.cent-bet { background: #67C23A; }
.cent-bar-fill.cent-clo { background: #E6A23C; }
.cent-bar-fill.cent-kc { background: #9B59B6; }
.cent-bar-fill.cent-br { background: #E4572E; }
.cent-val {
  font-size: 10px;
  font-weight: 600;
  color: #303133;
  min-width: 48px;
  font-variant-numeric: tabular-nums;
}
.cent-score-total {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #d8dce6;
  font-size: 11px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}
.cent-score-total strong {
  font-size: 14px;
  color: #303133;
}

.inference-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* more inference tag colors */
.inf-pressure {
  background: #fff3e0;
  color: #E65100;
  border: 1px solid #ffcc80;
}
.inf-multirisk {
  background: #fce4ec;
  color: #C62828;
  border: 1px solid #ef9a9a;
}
.inf-bottleneck {
  background: #e8eaf6;
  color: #283593;
  border: 1px solid #9fa8da;
}

/* ===== OWL 推理面板 ===== */
.owl-section {
  background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
  border: 1px solid #c8d9f0;
  border-radius: 6px;
  padding: 8px 10px;
}
.owl-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.owl-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  background: #409EFF;
  color: #fff;
  letter-spacing: 0.5px;
}
.swrl-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  background: #e6a23c;
  color: #fff;
}
.owl-reasoner {
  font-size: 10px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}
.reasoner-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #67C23A;
  animation: owl-pulse 2s infinite;
}
@keyframes owl-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.inferred-title {
  font-size: 10px;
  color: #909399;
  margin-bottom: 4px;
}
.inferred-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}
.inf-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: default;
  font-weight: 600;
}
.inf-danger {
  background: #fde2e2;
  color: #F56C6C;
  border: 1px solid #fab6b6;
}
.inf-warning {
  background: #fef0d0;
  color: #E6A23C;
  border: 1px solid #f5d78a;
}
.inf-critical {
  background: #fde4d0;
  color: #E4572E;
  border: 1px solid #f5b895;
}
.owl-individuals {
  font-size: 10px;
  color: #909399;
}

/* ===== OWL 风险传导路径 ===== */
.risk-path-list {
  max-height: 200px;
  overflow-y: auto;
}
.risk-path-item {
  font-size: 11px;
  padding: 4px 6px;
  margin: 2px 0;
  background: #fef9f0;
  border-left: 3px solid #E6A23C;
  border-radius: 2px;
}
.risk-path-event {
  color: #303133;
  font-weight: 500;
  line-height: 1.3;
}
.risk-path-arrow {
  color: #E6A23C;
  font-size: 10px;
  padding-left: 6px;
}
.risk-path-target {
  color: #606266;
  font-size: 10px;
  padding-left: 12px;
}
</style>
