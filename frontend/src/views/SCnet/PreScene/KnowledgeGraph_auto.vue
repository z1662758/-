<template>
  <div class="ukg-container">
    <!-- 左侧面板 -->
    <div class="ukg-left-panel">
      <div class="panel-header">🚗 汽车供应链本体网络</div>

      <!-- OWL 2 DL 推理面板 -->
      <div class="panel-section owl-section" v-if="owlLabels">
        <div class="owl-header">
          <span class="owl-badge">OWL 2 DL</span>
          <span class="swrl-badge">SWRL ×{{ owlStats?.swrl_rules || 6 }}</span>
          <el-button size="small" type="primary" link
            @click="toggleOwlView"
            style="margin-left:auto;font-size:10px">
            {{ isOwlView ? '返回图谱' : '本体网络' }}
          </el-button>
        </div>
        <div class="owl-reasoner">
          <span class="reasoner-dot"></span> HermiT 推理器 · NetworkX 5维中心性
        </div>
        <div class="owl-centrality-stats">
          <div class="cent-stat"><span class="cent-num">{{ owlStats?.graph_nodes || 0 }}</span><span class="cent-label">节点</span></div>
          <div class="cent-stat"><span class="cent-num">{{ owlStats?.graph_edges || 0 }}</span><span class="cent-label">边</span></div>
          <div class="cent-stat cent-key"><span class="cent-num">{{ roleCounts.key_nodes }}</span><span class="cent-label">关键</span></div>
          <div class="cent-stat cent-bridge"><span class="cent-num">{{ roleCounts.bridge_nodes }}</span><span class="cent-label">桥接</span></div>
        </div>
        <div class="inferred-title">SWRL 推理分类</div>
        <div class="inferred-tags">
          <el-tooltip content="高风险实体" placement="top"><span class="inf-tag inf-danger">高风险 {{ owlLabels.HighRiskEntity?.count || 0 }}</span></el-tooltip>
          <el-tooltip content="供应链中断" placement="top"><span class="inf-tag inf-critical">中断 {{ owlLabels.SupplyChainDisruption?.count || 0 }}</span></el-tooltip>
          <el-tooltip content="物流瓶颈" placement="top"><span class="inf-tag inf-bottleneck">瓶颈 {{ owlLabels.LogisticsBottleneck?.count || 0 }}</span></el-tooltip>
          <el-tooltip content="关键材料短缺" placement="top"><span class="inf-tag inf-multirisk">短缺 {{ owlLabels.CriticalMaterialShortage?.count || 0 }}</span></el-tooltip>
          <el-tooltip content="高库存压力" placement="top"><span class="inf-tag inf-warning">库存 {{ owlLabels.HighInventoryPressure?.count || 0 }}</span></el-tooltip>
          <el-tooltip content="多风险区域" placement="top"><span class="inf-tag inf-pressure">多风险 {{ owlLabels.MultiRiskRegion?.count || 0 }}</span></el-tooltip>
        </div>
      </div>

      <!-- 本体判定卡片（OWL 模式下显示） -->
      <template v-if="isOwlView && owlRules.length">
        <div class="panel-section">
          <label>⚡ 规则判定 ({{ owlRules.length }}条)</label>
          <div class="rule-cards">
            <div v-for="(rule, i) in owlRules" :key="i" class="rule-card" :class="'rule-urgency-' + (rule.urgency || 'high')">
              <div class="rule-card-header">
                <span class="rule-icon">{{ rule.icon || '🔍' }}</span>
                <span class="rule-name">{{ rule.rule_name }}</span>
              </div>
              <div class="rule-card-body">
                <div class="rule-desc">{{ rule.description }}</div>
                <div class="rule-verdict" v-if="rule.verdict">
                  <span class="verdict-label">判定：</span>
                  <span class="verdict-value">{{ rule.verdict }}</span>
                </div>
                <div class="rule-affected" v-if="rule.affected?.length">
                  <span class="rule-label">涉及实体：</span>
                  <span v-for="(n, j) in rule.affected.slice(0, 4)" :key="j" class="rule-node-tag">{{ n }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 实体类型分布 -->
      <div class="panel-section">
        <label>实体类型分布</label>
        <div class="dynamic-roles-info">
          <el-tag v-for="(count, type) in typeDistribution" :key="type" size="small"
            :type="count > 15 ? '' : 'info'">{{ type }}: {{ count }}</el-tag>
        </div>
      </div>

      <!-- 搜索 -->
      <div class="panel-section">
        <label>搜索实体</label>
        <el-input v-model="searchQuery" placeholder="输入名称搜索..."
          clearable @keyup.enter="onSearch" @clear="onClearSearch">
          <template #prefix><el-icon><Search/></el-icon></template>
        </el-input>
      </div>

      <div class="panel-section stats-section">
        <div class="stat-line"><span>总节点</span><strong>{{ statsDisplay.nodes }}</strong></div>
        <div class="stat-line"><span>总边</span><strong>{{ statsDisplay.edges }}</strong></div>
      </div>
    </div>

    <!-- 中央图区域 -->
    <div class="ukg-center">
      <div v-show="loading" class="ukg-loading-overlay">
        <el-icon class="is-loading" :size="40"><Loading/></el-icon>
        <span>{{ isOwlView ? '本体网络推理中...' : '图谱加载中...' }}</span>
      </div>
      <div ref="chartRef" class="ukg-chart"></div>
    </div>

    <!-- 右侧详情面板 -->
    <div class="ukg-right-panel" v-if="selectedNode">
      <div class="panel-header">
        {{ isOwlView ? '本体规则分析' : '节点详情' }}
        <el-button link size="small" @click="clearSelection">✕</el-button>
      </div>
      <div class="detail-content">

        <!-- ══════ OWL 模式：本体类定义 + 规则 ══════ -->
        <template v-if="isOwlView">
          <div class="owl-rule-header">本体类定义</div>
          <div class="owl-class-card">
            <div class="owl-class-name">{{ selectedNode.nodeType || 'Thing' }}</div>
            <div class="owl-class-label">实例: {{ selectedNode.name }}</div>
            <div class="owl-class-props" v-if="autoClassProps.length">
              <div class="owl-prop" v-for="p in autoClassProps" :key="p.key">
                <span class="owl-prop-key">{{ p.key }}</span>
                <span class="owl-prop-val">{{ p.value }}</span>
              </div>
            </div>
          </div>

          <div class="owl-section-title">对象属性（关系）</div>
          <div class="owl-relations">
            <div class="owl-rel-item" v-for="r in autoClassRels" :key="r.name">
              <span class="owl-rel-name">{{ r.name }}</span>
              <span class="owl-rel-arrow">→</span>
              <span class="owl-rel-target">{{ r.target }}</span>
            </div>
          </div>

          <div class="owl-section-title">SWRL 推理规则</div>
          <div class="owl-rules-list">
            <div class="owl-rule-item" v-for="(r, i) in autoSwrlRules" :key="i">
              <div class="owl-rule-if">IF {{ r.if }}</div>
              <div class="owl-rule-then">THEN {{ r.then }}</div>
            </div>
          </div>

          <div class="owl-section-title" v-if="autoInfTags.length">该类推理标签</div>
          <div class="inferred-tags" v-if="autoInfTags.length">
            <span v-for="t in autoInfTags" :key="t.key" class="inf-tag" :class="t.cssClass">{{ t.label }}</span>
          </div>
        </template>

        <!-- ══════ 普通模式 ══════ -->
        <template v-else>
          <div class="detail-field"><label>名称</label><span>{{ selectedNode.name }}</span></div>
          <div class="detail-field"><label>类型</label>
            <el-tag size="small" :style="{background: getColor(selectedNode.nodeType), color:'#fff'}">
              {{ selectedNode.nodeType }}
            </el-tag>
          </div>
          <div class="detail-field" v-for="(val, key) in displayProps" :key="key">
            <label>{{ key }}</label><span>{{ typeof val === 'object' ? JSON.stringify(val).slice(0,100) : val }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Search, Loading } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// ── 颜色 ──
const TYPE_COLORS = {
  Supplier: '#67C23A', Manufacturer: '#409EFF', Dealer: '#9B59B6',
  LogisticsProvider: '#E6A23C', VehicleModel: '#85C1E9', Region: '#BDC3C7',
  Material: '#FFD700', Route: '#00CED1',
  RiskEvent: '#F56C6C', LogisticsRisk: '#FF4444', MaterialRisk: '#FF6B6B',
  GeopoliticalRisk: '#E74C3C', PolicyRisk: '#E67E22',
  MarketEvent: '#F39C12', PolicyEvent: '#D35400',
  SalesMetric: '#2ECC71', CostMetric: '#3498DB', DemandSupplyMetric: '#9B59B6',
  InventoryMetric: '#1ABC9C', ScenarioNode: '#95A5A6', Recommendation: '#2980B9',
  TurningPoint: '#F1C40F', RiskProfile: '#E74C3C',
  HighRiskEntity: '#FF0000', SupplyChainDisruption: '#FF4444',
  HighInventoryPressure: '#FF8800', CriticalMaterialShortage: '#FF0000',
  MultiRiskRegion: '#FF6600', LogisticsBottleneck: '#E63946',
}

const CORE_TYPES = new Set(['Supplier', 'Manufacturer', 'Dealer', 'LogisticsProvider',
  'VehicleModel', 'Region', 'Material', 'Route', 'RiskEvent', 'PolicyEvent',
  'MarketEvent', 'GeopoliticalRisk', 'PolicyRisk', 'LogisticsRisk', 'MaterialRisk',
  'RiskProfile', 'ScenarioNode', 'Recommendation', 'TurningPoint'])
const METRIC_TYPES = new Set(['SalesMetric', 'CostMetric', 'DemandSupplyMetric', 'InventoryMetric'])

const INFERENCE_TAG_DEFS = [
  { key: 'HighRiskEntity', label: '高风险实体', cssClass: 'inf-danger' },
  { key: 'SupplyChainDisruption', label: '供应链中断', cssClass: 'inf-critical' },
  { key: 'LogisticsBottleneck', label: '物流瓶颈', cssClass: 'inf-bottleneck' },
  { key: 'CriticalMaterialShortage', label: '关键材料短缺', cssClass: 'inf-multirisk' },
  { key: 'HighInventoryPressure', label: '高库存压力', cssClass: 'inf-warning' },
  { key: 'MultiRiskRegion', label: '多风险区域', cssClass: 'inf-pressure' },
]

// ── 状态 ──
const chartRef = ref(null); const loading = ref(true); const searchQuery = ref('')
const selectedNode = ref(null); const isOwlView = ref(false)
const currentView = ref({ nodes: [], edges: [], categories: [] })
const owlRaw = ref(null); const owlLabels = ref(null); const owlStats = ref(null)
let chart = null; let renderTimer = null; let resizeObserver = null

// ── OWL 推理规则 ──
const owlRules = computed(() => {
  if (!owlRaw.value || !isOwlView.value) return []
  const labels = owlLabels.value || {}
  const rules = []
  // 根据推理标签生成规则卡片
  if (labels.SupplyChainDisruption?.count > 0) rules.push({
    rule_name: '供应链中断风险', icon: '⚠️', urgency: 'high',
    description: `检测到 ${labels.SupplyChainDisruption.count} 个实体存在供应链中断风险`,
    verdict: '【供应链中断】→ 极高风险',
    affected: (owlRaw.value.risk_paths_sample || []).slice(0, 3).map(p => p.path?.join(' → ') || ''),
  })
  if (labels.LogisticsBottleneck?.count > 0) rules.push({
    rule_name: '物流瓶颈识别', icon: '🚛', urgency: 'high',
    description: `识别出 ${labels.LogisticsBottleneck.count} 个物流瓶颈节点（运输咽喉/单一路线依赖）`,
    verdict: '【物流瓶颈节点】→ 高风险',
    affected: owlRaw.value.role_annotations?.filter(r => r.role === 'bridge_node').slice(0, 3).map(r => r.name) || [],
  })
  if (labels.CriticalMaterialShortage?.count > 0) rules.push({
    rule_name: '关键材料短缺预警', icon: '📦', urgency: 'high',
    description: `${labels.CriticalMaterialShortage.count} 个实体判定为关键材料短缺——供应单一来源零件`,
    verdict: '【关键单一来源零部件】→ 极高风险',
    affected: [],
  })
  if (labels.HighRiskEntity?.count > 0) rules.push({
    rule_name: '高风险实体标记', icon: '🔴', urgency: 'high',
    description: `${labels.HighRiskEntity.count} 个实体被标记为高风险——地缘/政策/市场多重暴露`,
    verdict: '【多风险暴露】→ 高风险',
    affected: [],
  })
  if (labels.HighInventoryPressure?.count > 0) rules.push({
    rule_name: '高库存压力', icon: '📊', urgency: 'medium',
    description: `${labels.HighInventoryPressure.count} 个实体库存周转异常，缺货/积压风险上升`,
    verdict: '【库存异常】→ 中风险',
    affected: [],
  })
  if (labels.MultiRiskRegion?.count > 0) rules.push({
    rule_name: '多风险区域', icon: '🌍', urgency: 'medium',
    description: `${labels.MultiRiskRegion.count} 个区域面临多重风险叠加`,
    verdict: '【区域多重风险】→ 中风险',
    affected: [],
  })
  return rules
})

// ── 数据加载 ──
async function loadData() {
  loading.value = true
  try {
    const res = await fetch('/api/ontology/owl/network?scenario=supply_chain')
    const json = await res.json()
    if (json?.success && json.data) {
      const d = json.data
      owlRaw.value = d
      owlLabels.value = d.inference_labels || {}
      owlStats.value = d.statistics || {}
      const graph = d.graph
      const typeSet = new Set(graph.nodes.map(n => n.nodeType || n.type))
      const categories = [...typeSet].map(t => ({ name: t, itemStyle: { color: TYPE_COLORS[t] || '#999' } }))
      currentView.value = { nodes: graph.nodes, edges: graph.edges, categories }
    }
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

// ── 统计 ──
const MAX_VISIBLE = 300
const typeDistribution = computed(() => {
  const d = {}
  for (const n of currentView.value.nodes) { const t = n.nodeType || n.type || '?'; d[t] = (d[t] || 0) + 1 }
  return d
})
const statsDisplay = computed(() => ({ nodes: currentView.value.nodes.length, edges: currentView.value.edges.length }))
const roleCounts = computed(() => {
  const dist = owlRaw.value?.statistics?.role_distribution || {}
  return { key_nodes: dist.key_nodes || 0, bridge_nodes: dist.bridge_nodes || 0, normal_nodes: dist.normal_nodes || 0 }
})

// ── 选中节点分析 ──
const centralityMetrics = computed(() => selectedNode.value?.properties?.centrality_metrics || null)
const nodeRoleScore = computed(() => selectedNode.value?.properties?.role_confidence || 0)
const nodeRoleLabel = computed(() => {
  const map = { key_node: '关键节点', bridge_node: '桥接节点', normal_node: '普通节点' }
  return map[selectedNode.value?.properties?.role] || ''
})
const nodeRoleTag = computed(() => {
  const r = selectedNode.value?.properties?.role || ''
  return r === 'key_node' ? 'danger' : r === 'bridge_node' ? 'warning' : 'info'
})
const inferenceTags = computed(() => {
  const props = selectedNode.value?.properties || {}
  return INFERENCE_TAG_DEFS.filter(t => props[t.key])
})
// ── 汽车本体类定义（抽象层级）──
const AUTO_CLASS_DEFS = {
  Supplier: { label: '供应商', props: { suppliesTo: 'Manufacturer', providesComponent: 'Material', locatedIn: 'Region' }},
  Manufacturer: { label: '制造商/整车厂', props: { producesVehicle: 'VehicleModel', sourcesFrom: 'Supplier', shipsVia: 'LogisticsProvider', locatedIn: 'Region' }},
  Dealer: { label: '经销商', props: { sellsVehicle: 'VehicleModel', receivesFrom: 'Manufacturer', locatedIn: 'Region' }},
  LogisticsProvider: { label: '物流服务商', props: { transportsBetween: 'Manufacturer', shipsTo: 'Dealer', operatesIn: 'Region' }},
  VehicleModel: { label: '车型', props: { producedBy: 'Manufacturer', soldBy: 'Dealer', usesMaterial: 'Material' }},
  Region: { label: '区域/城市', props: { hosts: 'Manufacturer', containsSupplier: 'Supplier', hasPort: 'Route' }},
  Material: { label: '原材料/零部件', props: { suppliedBy: 'Supplier', usedIn: 'VehicleModel', subjectTo: 'MaterialRisk' }},
  Route: { label: '运输路线', props: { connects: 'Region', usedBy: 'LogisticsProvider', affectedBy: 'LogisticsRisk' }},
  RiskEvent: { label: '风险事件', props: { affects: 'Supplier', disrupts: 'Route', triggers: 'SWRL' }},
  PolicyEvent: { label: '政策事件', props: { impacts: 'Manufacturer', changesRegulation: 'Region' }},
  MarketEvent: { label: '市场事件', props: { affectsPrice: 'Material', changesDemand: 'VehicleModel' }},
  GeopoliticalRisk: { label: '地缘政治风险', props: { targets: 'Region', disrupts: 'Route', affectsSupply: 'Material' }},
}

const AUTO_SWRL_RULES = [
  { if: 'Supplier 供应 Material 且 该Material 全球供应商 < 3', then: 'Supplier rdf:type CriticalMaterialShortage' },
  { if: 'Manufacturer 依赖 Supplier 且 Supplier 存在 RiskEvent', then: 'Manufacturer rdf:type SupplyChainDisruption' },
  { if: 'LogisticsProvider 运输路线 必经 = true 且 替代路线 = 0', then: 'LogisticsProvider rdf:type LogisticsBottleneck' },
  { if: 'Region 同时存在 GeopoliticalRisk + LogisticsRisk + PolicyRisk', then: 'Region rdf:type MultiRiskRegion' },
  { if: 'Supplier 库存周转 < 阈值 且 订单积压 > 阈值', then: 'Supplier rdf:type HighInventoryPressure' },
  { if: 'Manufacturer 或 Supplier 存在多重风险且关键零件单一来源', then: '实体 rdf:type HighRiskEntity' },
]

const autoClassProps = computed(() => {
  const nt = selectedNode.value?.nodeType || ''
  const cls = AUTO_CLASS_DEFS[nt]
  if (!cls) return [{ key: 'owl:Class', value: nt }, { key: 'rdfs:label', value: nt }]
  return [
    { key: 'owl:Class', value: nt },
    { key: 'rdfs:label', value: cls.label },
    { key: 'rdfs:subClassOf', value: 'Thing' },
  ]
})

const autoClassRels = computed(() => {
  const nt = selectedNode.value?.nodeType || ''
  const cls = AUTO_CLASS_DEFS[nt]
  if (!cls) return []
  return Object.entries(cls.props).map(([p, t]) => ({ name: p, target: t }))
})

const autoSwrlRules = computed(() => AUTO_SWRL_RULES)

const autoInfTags = computed(() => {
  const props = selectedNode.value?.properties || {}
  const tags = []
  const defs = [
    { key: 'HighRiskEntity', label: '高风险实体', cssClass: 'inf-danger' },
    { key: 'SupplyChainDisruption', label: '供应链中断', cssClass: 'inf-critical' },
    { key: 'LogisticsBottleneck', label: '物流瓶颈', cssClass: 'inf-bottleneck' },
    { key: 'CriticalMaterialShortage', label: '关键材料短缺', cssClass: 'inf-multirisk' },
    { key: 'HighInventoryPressure', label: '高库存压力', cssClass: 'inf-warning' },
    { key: 'MultiRiskRegion', label: '多风险区域', cssClass: 'inf-pressure' },
  ]
  for (const d of defs) {
    if (props[d.key]) tags.push(d)
  }
  return tags
})

const displayProps = computed(() => {
  if (!selectedNode.value?.properties) return {}
  const p = { ...selectedNode.value.properties }
  delete p.centrality_metrics; delete p.role_confidence; delete p.role
  Object.keys(INFERENCE_TAG_DEFS).forEach(k => delete p[k])
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== ''))
})

// ── 图谱渲染 ──
function getColor(t) { return TYPE_COLORS[t] || '#999' }
function getVisibleGraph() {
  const { nodes, edges } = currentView.value
  if (nodes.length <= MAX_VISIBLE) return { nodes, edges }
  const entity = [], other = []
  for (const n of nodes) {
    const t = n.nodeType || n.type
    if (CORE_TYPES.has(t)) entity.push(n)
    else if (METRIC_TYPES.has(t)) other.push(n)
    else entity.push(n)
  }
  const sel = [...entity, ...other].slice(0, MAX_VISIBLE)
  const ids = new Set(sel.map(n => n.id))
  return { nodes: sel, edges: edges.filter(e => ids.has(e.source) && ids.has(e.target)) }
}

function buildChartOption() {
  const { nodes, edges } = getVisibleGraph()
  const categories = currentView.value.categories || []
  const catMap = {}; categories.forEach((c, i) => { catMap[c.name] = i })
  const selId = selectedNode.value?.id

  const enodes = nodes.map(n => {
    const t = n.nodeType || n.type
    const isCore = CORE_TYPES.has(t); const isMetric = METRIC_TYPES.has(t)
    const size = isCore ? 28 : (isMetric ? 12 : 18)
    const isSel = n.id === selId
    let itemStyle = {}
    if (isSel) itemStyle = { borderColor: '#FF6B6B', borderWidth: 3, shadowBlur: 10, shadowColor: 'rgba(255,107,107,0.4)' }
    // OWL模式：高风险节点标红
    if (isOwlView.value && n.properties?.HighRiskEntity) itemStyle = { ...itemStyle, borderColor: '#FF0000', borderWidth: 2 }
    return {
      id: n.id, name: n.name || n.label || n.id, category: catMap[t] ?? 0,
      symbolSize: isSel ? size * 1.6 : size, itemStyle,
      label: { show: isCore, fontSize: 11, color: '#303133', position: 'right' },
      properties: n.properties, nodeType: t,
    }
  })
  const eedges = edges.map(e => ({
    source: e.source, target: e.target,
    lineStyle: { color: '#c8cdd0', width: 1, opacity: 0.4, curveness: 0.2 },
  }))
  return {
    tooltip: { trigger: 'item', formatter: p => p.dataType === 'node' ? `<b>${p.name}</b><br/>${p.data.nodeType}${p.data.properties?.role ? '<br/>角色: '+p.data.properties.role : ''}` : '' },
    legend: { show: categories.length < 15, bottom: 10, textStyle: { fontSize: 9 } },
    series: [{ type: 'graph', layout: 'force', force: { repulsion: 400, edgeLength: [60, 200], gravity: 0.06, friction: 0.6 }, roam: true, draggable: true, categories, data: enodes, edges: eedges, emphasis: { focus: 'adjacency', lineStyle: { width: 4, color: '#409EFF' } } }],
  }
}

function renderChart() {
  if (!chartRef.value) return
  if (!chart) { chart = echarts.init(chartRef.value); chart.on('click', p => { if (p.dataType === 'node' && p.data) selectedNode.value = p.data; else clearSelection() }) }
  chart.setOption(buildChartOption(), true)
}
function scheduleRender() { clearTimeout(renderTimer); renderTimer = setTimeout(renderChart, 150) }
function clearSelection() { selectedNode.value = null }

// ── 本体类级别图（OWL 模式用，不含具体公司名）──
function buildClassGraph() {
  const classNodes = []
  const classEdges = []
  const addedClasses = new Set()
  const addedEdges = new Set()

  for (const [className, cls] of Object.entries(AUTO_CLASS_DEFS)) {
    if (addedClasses.has(className)) continue
    addedClasses.add(className)
    classNodes.push({
      id: className, name: cls.label, nodeType: className,
      properties: { role: className === 'Manufacturer' || className === 'Supplier' ? 'key_node' : 'normal_node' },
    })
    for (const [prop, target] of Object.entries(cls.props)) {
      const edgeKey = `${className}->${target}:${prop}`
      if (addedEdges.has(edgeKey)) continue
      addedEdges.add(edgeKey)
      // Ensure target node exists
      if (!addedClasses.has(target) && AUTO_CLASS_DEFS[target]) {
        addedClasses.add(target)
        classNodes.push({
          id: target, name: AUTO_CLASS_DEFS[target].label, nodeType: target,
          properties: { role: 'normal_node' },
        })
      } else if (!addedClasses.has(target) && !AUTO_CLASS_DEFS[target]) {
        // Target is not a defined class, still add it as a node
        addedClasses.add(target)
        classNodes.push({ id: target, name: target, nodeType: target, properties: {} })
      }
      classEdges.push({ source: className, target: target, relation: prop })
    }
  }

  // Build categories
  const typeSet = new Set(classNodes.map(n => n.nodeType))
  const categories = [...typeSet].map(t => ({ name: t, itemStyle: { color: TYPE_COLORS[t] || '#999' } }))
  return { nodes: classNodes, edges: classEdges, categories }
}

function toggleOwlView() {
  isOwlView.value = !isOwlView.value
  if (isOwlView.value) {
    // 切换到类级别本体图
    currentView.value = buildClassGraph()
  } else {
    // 切换回实例图
    loadData()
  }
  nextTick(() => { scheduleRender() })
}

function onSearch() {
  const q = searchQuery.value.trim(); if (!q) { clearSelection(); return }
  const found = currentView.value.nodes.find(n => (n.name || n.label || '').includes(q) || (n.id || '').includes(q))
  if (found) selectedNode.value = found
}
function onClearSearch() { searchQuery.value = ''; clearSelection() }

watch(currentView, () => scheduleRender(), { deep: true })

onMounted(async () => { await nextTick(); await loadData(); scheduleRender(); resizeObserver = new ResizeObserver(() => scheduleRender()); if (chartRef.value) resizeObserver.observe(chartRef.value) })
onBeforeUnmount(() => { clearTimeout(renderTimer); if (resizeObserver) resizeObserver.disconnect(); if (chart) { chart.dispose(); chart = null } })
</script>

<style scoped>
.ukg-container { display: flex; height: calc(100vh - 60px); background: #f5f7fa; overflow: hidden; }
.ukg-left-panel { width: 240px; padding: 16px 12px; background: #fff; border-right: 1px solid #e4e7ed; overflow-y: auto; flex-shrink: 0; }
.panel-header { font-size: 14px; font-weight: 600; color: #303133; padding-bottom: 12px; border-bottom: 1px solid #ebeef5; margin-bottom: 12px; }
.panel-section { margin-bottom: 16px; }
.panel-section label { font-size: 12px; color: #909399; display: block; margin-bottom: 6px; }
.dynamic-roles-info { display: flex; flex-wrap: wrap; gap: 4px; }
.stats-section .stat-line { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; color: #606266; }
.stats-section .stat-line strong { color: #303133; }
.ukg-center { flex: 1; position: relative; min-width: 0; }
.ukg-chart { width: 100%; height: 100%; }
.ukg-loading-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.9); z-index: 10; gap: 12px; font-size: 14px; color: #909399; }
.ukg-right-panel { width: 280px; padding: 16px; background: #fff; border-left: 1px solid #e4e7ed; overflow-y: auto; flex-shrink: 0; }
.detail-field { margin-bottom: 10px; font-size: 13px; }
.detail-field label { display: block; font-size: 11px; color: #909399; margin-bottom: 2px; }
.detail-field span { color: #303133; word-break: break-all; }

/* OWL */
.owl-section { background: #f8f9ff; border-radius: 8px; padding: 12px; border: 1px solid #e8eaf6; }
.owl-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.owl-badge { background: #5c6bc0; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.swrl-badge { background: #e8eaf6; color: #5c6bc0; font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.owl-reasoner { font-size: 11px; color: #909399; margin-bottom: 8px; }
.reasoner-dot { display: inline-block; width: 6px; height: 6px; background: #67c23a; border-radius: 50%; margin-right: 4px; }
.owl-centrality-stats { display: flex; gap: 12px; margin-bottom: 8px; }
.cent-stat { text-align: center; }
.cent-num { font-size: 16px; font-weight: 700; display: block; }
.cent-label { font-size: 10px; color: #909399; }
.cent-key .cent-num { color: #F56C6C; } .cent-bridge .cent-num { color: #E6A23C; }
.inferred-title { font-size: 11px; color: #606266; margin-bottom: 6px; font-weight: 500; }
.inferred-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.inf-tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; color: #fff; }
.inf-danger { background: #F56C6C; } .inf-warning { background: #E6A23C; }
.inf-critical { background: #E74C3C; } .inf-bottleneck { background: #E63946; }
.inf-multirisk { background: #FF6600; } .inf-pressure { background: #FF9900; }

/* Centrality */
.centrality-card { background: #f8f9ff; border-radius: 6px; padding: 8px; }
.cent-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 11px; }
.cent-dim { width: 80px; flex-shrink: 0; color: #606266; }
.cent-bar-bg { flex: 1; height: 6px; background: #e8eaf6; border-radius: 3px; overflow: hidden; }
.cent-bar-fill { height: 100%; background: #409EFF; border-radius: 3px; }
.cent-bet { background: #E6A23C; } .cent-clo { background: #67C23A; } .cent-kcore { background: #9B59B6; } .cent-bridge { background: #F56C6C; }
.cent-val { width: 50px; flex-shrink: 0; text-align: right; font-family: monospace; font-size: 10px; color: #909399; }

/* Rule cards */
.rule-cards { display: flex; flex-direction: column; gap: 6px; }
.rule-card { background: #fff; border: 1px solid #e4e7ed; border-radius: 6px; padding: 8px; border-left: 3px solid #409EFF; }
.rule-card.rule-urgency-high { border-left-color: #F56C6C; }
.rule-card.rule-urgency-medium { border-left-color: #E6A23C; }
.rule-card-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.rule-icon { font-size: 14px; }
.rule-name { font-size: 12px; font-weight: 600; color: #303133; }
.rule-desc { font-size: 11px; color: #606266; margin-bottom: 4px; }
.rule-verdict { font-size: 11px; margin-bottom: 4px; }
.verdict-label { color: #909399; }
.verdict-value { color: #F56C6C; font-weight: 600; }
.rule-affected { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.rule-label { font-size: 10px; color: #909399; }
.rule-node-tag { font-size: 10px; background: #f0f2f5; padding: 2px 6px; border-radius: 3px; color: #606266; }

/* ===== OWL 本体类视图 ===== */
.owl-rule-header { font-size: 13px; font-weight: 700; color: #5c6bc0; padding-bottom: 8px; border-bottom: 2px solid #5c6bc0; margin-bottom: 10px; }
.owl-class-card { background: #f8f9ff; border-radius: 8px; padding: 10px; border: 1px solid #e8eaf6; margin-bottom: 12px; }
.owl-class-name { font-size: 15px; font-weight: 700; color: #5c6bc0; }
.owl-class-label { font-size: 11px; color: #909399; margin-bottom: 8px; }
.owl-class-props { display: flex; flex-direction: column; gap: 3px; }
.owl-prop { display: flex; font-size: 11px; }
.owl-prop-key { color: #606266; min-width: 100px; }
.owl-prop-val { color: #5c6bc0; font-weight: 500; }
.owl-section-title { font-size: 12px; font-weight: 600; color: #303133; margin: 14px 0 6px 0; padding-bottom: 4px; border-bottom: 1px solid #ebeef5; }
.owl-relations { display: flex; flex-direction: column; gap: 4px; }
.owl-rel-item { display: flex; align-items: center; gap: 8px; font-size: 11px; padding: 4px 8px; background: #f5f7fa; border-radius: 4px; }
.owl-rel-name { color: #303133; font-weight: 500; min-width: 120px; }
.owl-rel-arrow { color: #5c6bc0; font-weight: 700; }
.owl-rel-target { color: #5c6bc0; font-weight: 500; }
.owl-rules-list { display: flex; flex-direction: column; gap: 6px; }
.owl-rule-item { font-size: 11px; padding: 6px 8px; background: #fef9e7; border-radius: 4px; border-left: 3px solid #f39c12; }
.owl-rule-if { color: #7d6608; margin-bottom: 2px; }
.owl-rule-then { color: #e67e22; font-weight: 600; }
</style>
