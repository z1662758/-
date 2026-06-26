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

      <!-- OWL 2 DL 推理面板 -->
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
          <span class="reasoner-dot"></span> HermiT 推理器 &middot; NetworkX 5维中心性
        </div>
        <div class="owl-centrality-stats">
          <div class="cent-stat"><span class="cent-num">{{ store.owlNetwork?.statistics?.graph_nodes || 0 }}</span><span class="cent-label">节点</span></div>
          <div class="cent-stat"><span class="cent-num">{{ store.owlNetwork?.statistics?.graph_edges || 0 }}</span><span class="cent-label">边</span></div>
          <div class="cent-stat cent-key"><span class="cent-num">{{ roleCounts.key_nodes }}</span><span class="cent-label">关键</span></div>
          <div class="cent-stat cent-bridge"><span class="cent-num">{{ roleCounts.bridge_nodes }}</span><span class="cent-label">桥接</span></div>
        </div>
        <div class="inferred-title">SWRL 推理分类</div>
        <div class="inferred-tags">
          <el-tooltip content="地缘政治高风险国" placement="left"><span class="inf-tag inf-danger">高风险 {{ store.owlNetworkLabels.HighRiskCountry?.count || 0 }}</span></el-tooltip>
          <el-tooltip content="多风险聚集国" placement="left"><span class="inf-tag inf-warning">多风险 {{ store.owlNetworkLabels.MultiRiskCountry?.count || 0 }}</span></el-tooltip>
          <el-tooltip content="运输咽喉节点" placement="left"><span class="inf-tag inf-bottleneck">咽喉 {{ store.owlNetworkLabels.TransportChokepoint?.count || 0 }}</span></el-tooltip>
          <el-tooltip content="供应瓶颈" placement="left"><span class="inf-tag inf-critical">瓶颈 {{ store.owlNetworkLabels.SupplyBottleneck?.count || 0 }}</span></el-tooltip>
          <el-tooltip content="资源集中度风险" placement="left"><span class="inf-tag inf-pressure">集中 {{ store.owlNetworkLabels.ResourceConcentrationRisk?.count || 0 }}</span></el-tooltip>
          <el-tooltip content="矿山停产连锁" placement="left"><span class="inf-tag inf-multirisk">连锁 {{ store.owlNetworkLabels.MineCascadeImpact?.count || 0 }}</span></el-tooltip>
        </div>
      </div>

      <!-- ⚡ 规则触发卡片 -->
      <div class="panel-section" v-if="currentTriggeredRules.length > 0">
        <label>⚡ 规则触发 ({{ currentTriggeredRules.length }}条)</label>
        <div class="rule-cards">
          <div v-for="rule in currentTriggeredRules" :key="rule.rule_id" class="rule-card"
               :class="'rule-urgency-' + rule.decisions[0]?.urgency">
            <div class="rule-card-header">
              <span class="rule-icon">{{ rule.icon }}</span>
              <span class="rule-id">{{ rule.rule_id }}</span>
              <span class="rule-name">{{ rule.rule_name }}</span>
            </div>
            <div class="rule-card-body">
              <div class="rule-desc">{{ rule.description }}</div>
              <div class="rule-affected" v-if="rule.affected_nodes?.length">
                <span class="rule-label">影响节点:</span>
                <span v-for="(n, i) in rule.affected_nodes.slice(0, 4)" :key="i" class="rule-node-tag">{{ n.name }}</span>
                <span v-if="rule.affected_nodes.length > 4" class="rule-more">+{{ rule.affected_nodes.length - 4 }}</span>
              </div>
              <div class="rule-events" v-if="rule.year_events?.length">
                <span class="rule-label">触发事件:</span>
                <span v-for="(ev, i) in rule.year_events" :key="i" class="rule-event-tag">{{ ev }}</span>
              </div>
            </div>
          </div>
        </div>
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

        <!-- 5维中心性评分 -->
        <div class="detail-field" v-if="centralityMetrics">
          <label>5维中心性评分</label>
          <div class="centrality-card">
            <div class="cent-row"><span class="cent-dim">度中心性 (0.3)</span><span class="cent-bar-bg"><span class="cent-bar-fill" :style="{width: (centralityMetrics.degree*100).toFixed(1)+'%'}"></span></span><span class="cent-val">{{ (centralityMetrics.degree || 0).toFixed(4) }}</span></div>
            <div class="cent-row"><span class="cent-dim">介数中心性 (0.3)</span><span class="cent-bar-bg"><span class="cent-bar-fill cent-bet" :style="{width: (centralityMetrics.betweenness*100).toFixed(1)+'%'}"></span></span><span class="cent-val">{{ (centralityMetrics.betweenness || 0).toFixed(4) }}</span></div>
            <div class="cent-row"><span class="cent-dim">紧密中心性 (0.2)</span><span class="cent-bar-bg"><span class="cent-bar-fill cent-clo" :style="{width: (centralityMetrics.closeness*100).toFixed(1)+'%'}"></span></span><span class="cent-val">{{ (centralityMetrics.closeness || 0).toFixed(4) }}</span></div>
            <div class="cent-row"><span class="cent-dim">K-Core (0.1)</span><span class="cent-bar-bg"><span class="cent-bar-fill cent-kc" :style="{width: (centralityMetrics.k_core_normalized*100).toFixed(1)+'%'}"></span></span><span class="cent-val">{{ ((centralityMetrics.k_core_normalized || 0)).toFixed(4) }}</span></div>
            <div class="cent-row"><span class="cent-dim">桥接系数 (0.1)</span><span class="cent-bar-bg"><span class="cent-bar-fill cent-br" :style="{width: (centralityMetrics.bridge_coefficient*100).toFixed(1)+'%'}"></span></span><span class="cent-val">{{ (centralityMetrics.bridge_coefficient || 0).toFixed(4) }}</span></div>
            <div class="cent-score-total">综合得分: <strong>{{ nodeRoleScore.toFixed(4) }}</strong><el-tag size="small" :type="nodeRoleTag">{{ nodeRoleLabel }}</el-tag></div>
          </div>
        </div>

        <!-- 触发规则 -->
        <div class="detail-field" v-if="selectedRuleTriggers.length">
          <label>触发规则</label>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <el-tag v-for="(rt, i) in selectedRuleTriggers" :key="i" size="small" type="warning">
              {{ rt.icon }} {{ rt.rule_name }}
            </el-tag>
          </div>
        </div>

        <!-- OWL 推理标签 -->
        <div class="detail-field" v-if="inferenceTags.length">
          <label>OWL 推理标签</label>
          <div class="inference-tags-list">
            <span v-for="tag in inferenceTags" :key="tag.key" :class="['inf-tag', tag.cssClass]">{{ tag.label }}</span>
          </div>
        </div>

        <!-- 🤖 决策建议 -->
        <div class="detail-field" v-if="selectedActions.length">
          <label>🤖 建议决策</label>
          <div class="decision-list">
            <div v-for="(act, i) in selectedActions" :key="i" class="decision-card" :class="'urgency-' + act.urgency">
              <div class="decision-header">
                <span class="decision-dot" :class="'urgency-dot-' + act.urgency"></span>
                <span class="decision-action">{{ act.action }}</span>
                <el-tag size="small" :type="act.urgency==='high'?'danger':act.urgency==='medium'?'warning':'info'">
                  {{ act.urgency==='high'?'紧急':act.urgency==='medium'?'重要':'建议' }}
                </el-tag>
              </div>
              <div class="decision-detail">{{ act.detail }}</div>
            </div>
          </div>
        </div>

        <!-- 风险传导路径 -->
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

// 5维中心性计算
const centralityMetrics = computed(() => {
  const props = store.selectedNode?.properties
  const cm = props?.centrality_metrics
  if (cm && typeof cm === 'object' && Object.keys(cm).length > 0) return cm
  return null
})
const nodeRoleScore = computed(() => store.selectedNode?.properties?.role_confidence || 0)
const nodeRoleLabel = computed(() => {
  const map = { key_node: '关键节点', bridge_node: '桥接节点', normal_node: '普通节点' }
  return map[store.selectedNode?.properties?.role || ''] || ''
})
const nodeRoleTag = computed(() => {
  const role = store.selectedNode?.properties?.role || ''
  if (role === 'key_node') return 'danger'
  if (role === 'bridge_node') return 'warning'
  return 'info'
})
const inferenceTags = computed(() => {
  const props = store.selectedNode?.properties || {}
  return INFERENCE_TAG_DEFS.filter(t => props[t.key])
})

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
const isOwlView = ref(false)

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
  if (isOwlView.value && store.owlNetwork) {
    const dist = store.owlNetwork.statistics?.role_distribution || {}
    return { key_nodes: dist.key_nodes || 0, bridge_nodes: dist.bridge_nodes || 0, normal_nodes: dist.normal_nodes || 0 }
  }
  const rag = store.dynamicGraph?.role_annotated_graph
  const dist = rag?.role_distribution || store.dynamicGraph?.metadata?.role_distribution || {}
  return { key_nodes: dist.key_nodes || 0, bridge_nodes: dist.bridge_nodes || 0, normal_nodes: dist.normal_nodes || 0 }
})

const structuralChanges = computed(() => {
  return store.dynamicGraph?.timeline?.structural_changes || []
})

// 当前时间窗口触发的规则
const currentTriggeredRules = computed(() => {
  if (isOwlView.value) return []
  const wins = store.dynamicWindows
  if (!wins.length) return []
  const key = wins[windowIdx.value]
  const gs = store.dynamicGraph?.graph_sequence
  if (!gs || !key) return []
  return gs[key]?.triggered_rules || []
})

// 选中节点的决策建议
const selectedActions = computed(() => {
  return store.selectedNode?.suggested_actions || []
})

// 选中节点触发的规则
const selectedRuleTriggers = computed(() => {
  return store.selectedNode?.rule_triggers || []
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
  'HighRiskCountry': '#FF0000', 'SupplyBottleneck': '#FF8800',
  'MultiRiskCountry': '#FF6600', 'TransportChokepoint': '#E63946',
}

// OWL 推理标签定义
const INFERENCE_TAG_DEFS = [
  { key: 'HighRiskCountry', label: '高风险国', cssClass: 'inf-danger' },
  { key: 'SupplyBottleneck', label: '供应瓶颈', cssClass: 'inf-critical' },
  { key: 'MultiRiskCountry', label: '多风险国', cssClass: 'inf-warning' },
  { key: 'TransportChokepoint', label: '运输咽喉', cssClass: 'inf-bottleneck' },
  { key: 'ResourceConcentrationRisk', label: '资源集中', cssClass: 'inf-pressure' },
  { key: 'MineCascadeImpact', label: '连锁影响', cssClass: 'inf-multirisk' },
  { key: 'PriceShockTrigger', label: '价格冲击', cssClass: 'inf-warning' },
]

// OWL 视图中默认隐藏的指标类节点
const OWL_METRIC_TYPES = new Set(['UraniumProductionMetric', 'UraniumDemandMetric',
  'ExplorationMetric', 'PriceMetric', 'InventoryMetric', 'CostMetric', 'ResourceMetric'])
const OWL_CORE_TYPES = new Set(['Country', 'UraniumMine', 'UraniumCompany',
  'FuelCycleFacility', 'TransportRoute', 'RiskEvent', 'GeopoliticalRisk',
  'OperationalRisk', 'SupplyChainRisk', 'PolicyRisk', 'PriceEvent', 'PolicyEvent',
  'ScenarioNode', 'TurningPoint', 'Policy',
  'HighRiskCountry', 'SupplyBottleneck', 'PriceShockTrigger',
  'TransportChokepoint', 'ResourceConcentrationRisk', 'MultiRiskCountry', 'MineCascadeImpact'])

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

  // OWL视图：过滤指标节点，优先核心类型+角色标注
  if (isOwlView.value) {
    const coreNodes = [], metricNodes = [], otherNodes = []
    for (const n of nodes) {
      if (OWL_CORE_TYPES.has(n.nodeType)) coreNodes.push(n)
      else if (OWL_METRIC_TYPES.has(n.nodeType)) metricNodes.push(n)
      else otherNodes.push(n)
    }
    const keyNodes = coreNodes.filter(n => {
      const role = n.properties?.role
      return role === 'key_node' || role === 'bridge_node'
    })
    const plainCore = coreNodes.filter(n => !keyNodes.includes(n))
    let selected = [...keyNodes, ...plainCore, ...otherNodes, ...metricNodes]
    if (selected.length > MAX_VISIBLE_NODES) selected = selected.slice(0, MAX_VISIBLE_NODES)
    const ids = new Set(selected.map(n => n.id))
    return { nodes: selected, edges: edges.filter(e => ids.has(e.source) && ids.has(e.target)) }
  }

  // 动态视图：Country > 矿山/企业 > 事件 > 指标
  const countryNodes = [], coreNodes = [], eventNodes = [], metricNodes = [], otherNodes = []
  for (const n of nodes) {
    if (n.nodeType === 'Country') countryNodes.push(n)
    else if (CORE_TYPES.has(n.nodeType)) coreNodes.push(n)
    else if (n.nodeType === 'TurningPoint' || n.nodeType === 'ScenarioNode') eventNodes.push(n)
    else if (METRIC_TYPES.has(n.nodeType)) metricNodes.push(n)
    else otherNodes.push(n)
  }

  const keyCore = coreNodes.filter(n => {
    const role = n.properties?.role
    return role === 'key_node' || role === 'bridge_node'
  })
  const plainCore = coreNodes.filter(n => !keyCore.includes(n))

  let selected = [...countryNodes, ...keyCore, ...plainCore, ...eventNodes, ...metricNodes, ...otherNodes]
  if (selected.length > MAX_VISIBLE_NODES) selected = selected.slice(0, MAX_VISIBLE_NODES)

  const selectedIds = new Set(selected.map(n => n.id))
  return { nodes: selected, edges: edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target)) }
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
  if (winKey) {
    isOwlView.value = false
    await store.loadDynamicWindow(winKey)
    nextTick(renderChart)
  }
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

async function switchToOwlNetwork() {
  if (!store.owlNetworkGraph) await store.fetchOwlNetwork()
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
  // 加载铀动态网络数据
  await store.fetchDynamicGraph()
  maxWindowIdx.value = store.dynamicWindows.length - 1
  windowIdx.value = store.dynamicWindows.length - 1
  if (store.dynamicWindows.length) {
    await store.loadDynamicWindow(store.dynamicWindows[windowIdx.value])
  }
  await store.fetchDynamicTimeline()

  // 后台加载 OWL 本体推理 + 网络
  store.fetchOwlStats()
  store.fetchOwlInferred()
  store.fetchOwlNetwork()

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

/* ===== 规则触发卡片 ===== */
.rule-cards { display: flex; flex-direction: column; gap: 6px; max-height: 350px; overflow-y: auto; }
.rule-card { padding: 6px 8px; border-radius: 6px; border: 1px solid #e4e7ed; background: #fff; transition: all 0.15s; }
.rule-card:hover { border-color: #FF6B35; box-shadow: 0 1px 4px rgba(255,107,53,0.15); }
.rule-card.rule-urgency-high { border-left: 3px solid #F56C6C; }
.rule-card.rule-urgency-medium { border-left: 3px solid #E6A23C; }
.rule-card.rule-urgency-low { border-left: 3px solid #409EFF; }
.rule-card-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.rule-icon { font-size: 14px; }
.rule-id { font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px; background: #FF6B35; color: #fff; }
.rule-name { font-size: 11px; font-weight: 600; color: #303133; }
.rule-card-body { font-size: 10px; color: #606266; }
.rule-desc { margin-bottom: 3px; line-height: 1.3; }
.rule-affected, .rule-events { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; margin-top: 2px; }
.rule-label { color: #909399; font-size: 9px; }
.rule-node-tag { font-size: 9px; padding: 1px 5px; background: #fef0f0; color: #F56C6C; border-radius: 2px; border: 1px solid #fab6b6; }
.rule-event-tag { font-size: 9px; padding: 1px 5px; background: #ecf5ff; color: #409EFF; border-radius: 2px; border: 1px solid #b3d8ff; }
.rule-more { font-size: 9px; color: #909399; }

/* ===== 决策建议卡片 ===== */
.decision-list { display: flex; flex-direction: column; gap: 6px; }
.decision-card { padding: 6px 8px; border-radius: 6px; border: 1px solid #e4e7ed; transition: all 0.15s; }
.decision-card.urgency-high { border-left: 3px solid #F56C6C; background: #fefafa; }
.decision-card.urgency-medium { border-left: 3px solid #E6A23C; background: #fefdf7; }
.decision-card.urgency-low { border-left: 3px solid #409EFF; background: #fafcff; }
.decision-header { display: flex; align-items: center; gap: 6px; }
.decision-dot { width: 6px; height: 6px; border-radius: 50%; }
.urgency-dot-high { background: #F56C6C; }
.urgency-dot-medium { background: #E6A23C; }
.urgency-dot-low { background: #409EFF; }
.decision-action { font-size: 12px; font-weight: 600; color: #303133; }
.decision-detail { font-size: 10px; color: #909399; margin-top: 3px; line-height: 1.3; padding-left: 12px; }

/* ===== OWL 推理面板 ===== */
.owl-section { background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%); border: 1px solid #c8d9f0; border-radius: 6px; padding: 8px 10px; }
.owl-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.owl-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 3px; background: #FF6B35; color: #fff; letter-spacing: 0.5px; }
.swrl-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; background: #e6a23c; color: #fff; }
.owl-reasoner { font-size: 10px; color: #606266; display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
.reasoner-dot { width: 6px; height: 6px; border-radius: 50%; background: #67C23A; animation: owl-pulse 2s infinite; }
@keyframes owl-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.owl-centrality-stats { display: flex; gap: 6px; margin: 6px 0; flex-wrap: wrap; }
.cent-stat { text-align: center; padding: 4px 8px; background: #fff; border-radius: 4px; border: 1px solid #e4e7ed; min-width: 42px; }
.cent-stat.cent-key { border-color: #F56C6C; background: #fef0f0; }
.cent-stat.cent-bridge { border-color: #E6A23C; background: #fef9f0; }
.cent-num { display: block; font-size: 16px; font-weight: 700; color: #303133; }
.cent-key .cent-num { color: #F56C6C; }.cent-bridge .cent-num { color: #E6A23C; }
.cent-label { display: block; font-size: 9px; color: #909399; }
.inferred-title { font-size: 10px; color: #909399; margin-bottom: 4px; }
.inferred-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }

/* 推理标签颜色 */
.inf-tag { font-size: 10px; padding: 2px 6px; border-radius: 3px; cursor: default; font-weight: 600; }
.inf-danger { background: #fde2e2; color: #F56C6C; border: 1px solid #fab6b6; }
.inf-warning { background: #fef0d0; color: #E6A23C; border: 1px solid #f5d78a; }
.inf-critical { background: #fde4d0; color: #E4572E; border: 1px solid #f5b895; }
.inf-pressure { background: #fff3e0; color: #E65100; border: 1px solid #ffcc80; }
.inf-multirisk { background: #fce4ec; color: #C62828; border: 1px solid #ef9a9a; }
.inf-bottleneck { background: #e8eaf6; color: #283593; border: 1px solid #9fa8da; }
.inference-tags-list { display: flex; flex-wrap: wrap; gap: 4px; }

/* 中心性卡片 */
.centrality-card { background: linear-gradient(135deg, #f8f9fd 0%, #eef1f8 100%); border: 1px solid #d8dce6; border-radius: 6px; padding: 8px 10px; }
.cent-row { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
.cent-dim { font-size: 10px; color: #606266; min-width: 90px; text-align: right; }
.cent-bar-bg { flex: 1; height: 6px; background: #e4e7ed; border-radius: 3px; overflow: hidden; }
.cent-bar-fill { height: 100%; background: #FF6B35; border-radius: 3px; transition: width 0.5s ease; }
.cent-bar-fill.cent-bet { background: #67C23A; }
.cent-bar-fill.cent-clo { background: #E6A23C; }
.cent-bar-fill.cent-kc { background: #9B59B6; }
.cent-bar-fill.cent-br { background: #E4572E; }
.cent-val { font-size: 10px; font-weight: 600; color: #303133; min-width: 48px; }
.cent-score-total { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #d8dce6; font-size: 11px; color: #303133; display: flex; align-items: center; gap: 8px; }
.cent-score-total strong { font-size: 14px; color: #303133; }

/* 风险传导 */
.risk-path-list { max-height: 200px; overflow-y: auto; }
.risk-path-item { font-size: 11px; padding: 4px 6px; margin: 2px 0; background: #fef9f0; border-left: 3px solid #E6A23C; border-radius: 2px; }
.risk-path-event { color: #303133; font-weight: 500; line-height: 1.3; }
.risk-path-arrow { color: #E6A23C; font-size: 10px; padding-left: 6px; }
.risk-path-target { color: #606266; font-size: 10px; padding-left: 12px; }
</style>
