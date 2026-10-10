<template>
  <div class="ukg-container">
    <!-- 左侧筛选面板 -->
    <div class="ukg-left-panel">
      <div class="panel-header">{{ isAuto ? '🚗' : '☢️' }} {{ isAuto ? '汽车' : '铀' }}供应链知识图谱</div>

      <!-- 时间窗口 (年度: 1997~2024) -->
      <div class="panel-section">
        <label>时间窗口 {{ isAuto ? '(2024-01 ~ 2024-12)' : '(1997 ~ 2024)' }}</label>
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
      <div class="panel-section owl-section">
        <div class="owl-header">
          <span class="owl-badge">OWL 2 DL</span>
          <span class="swrl-badge">SWRL ×{{ store.owlStats?.swrl_rules || 8 }}</span>
        </div>
        <!-- OWL 本体规则网络切换按钮 -->
        <el-button
          :type="isOwlView ? 'warning' : 'primary'"
          size="small"
          @click="toggleOwlView"
          :loading="store.owlNetworkLoading"
          style="width:100%;margin:8px 0 4px">
          {{ isOwlView ? '📐 返回动态网络' : '🔬 查看业务规则网络' }}
        </el-button>
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

      <!-- ⚡ OWL 本体规则判定（OWL 模式下） -->
      <div class="panel-section" v-if="isOwlView && owlRules.length > 0">
        <label>⚡ 本体规则判定 ({{ owlRules.length }}条)</label>
        <div class="rule-cards">
          <div v-for="(rule, i) in owlRules" :key="'owl-'+i" class="rule-card" :class="'rule-urgency-' + (rule.urgency || 'high')">
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
                <span class="rule-label">涉及节点：</span>
                <span v-for="(n, j) in rule.affected.slice(0, 4)" :key="j" class="rule-node-tag">{{ n }}</span>
              </div>
            </div>
          </div>
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
        <span>供应链图谱加载中...</span>
      </div>
      <div ref="chartRef" class="ukg-chart"></div>

      <div class="edge-legend" v-if="isBusinessView">
        <span class="legend-item"><i class="legend-line impact"></i>扰动</span>
        <span class="legend-item"><i class="legend-line policy"></i>政策</span>
        <span class="legend-item"><i class="legend-line management"></i>管理</span>
        <span class="legend-item"><i class="legend-line flow"></i>供应流</span>
        <span class="legend-item"><i class="legend-line metric"></i>评估</span>
        <span class="legend-item"><i class="legend-line rule"></i>规则</span>
      </div>
      <div class="edge-legend" v-else>
        <span class="legend-item"><i class="legend-line coop"></i>合作</span>
        <span class="legend-item"><i class="legend-line confront"></i>博弈/对抗</span>
        <span class="legend-item"><i class="legend-line neutral"></i>结构</span>
      </div>
    </div>

    <!-- 右侧详情面板 -->
    <div class="ukg-right-panel" v-if="store.selectedNode">
      <div class="panel-header">
        {{ isBusinessView ? '业务规则分析' : (isOwlView ? '本体规则分析' : '节点详情') }}
        <el-button link size="small" @click="store.clearSelection()">✕</el-button>
      </div>
      <div class="detail-content">

        <!-- ══════ 业务规则网络：业务逻辑说明 ══════ -->
        <template v-if="isBusinessView">
          <div class="owl-rule-header">业务规则节点</div>

          <div class="owl-class-card">
            <div class="owl-class-name">{{ store.selectedNode.name }}</div>
            <div class="owl-class-label">{{ store.selectedNode.properties?.group || '业务规则类' }}</div>
            <div class="owl-class-props" v-if="businessDetailFields.length">
              <div class="owl-prop" v-for="p in businessDetailFields" :key="p.key">
                <span class="owl-prop-key">{{ p.label }}</span>
                <span class="owl-prop-val">{{ p.value }}</span>
              </div>
            </div>
          </div>

          <div class="owl-section-title" v-if="businessRelations.length">业务关系</div>
          <div class="owl-relations" v-if="businessRelations.length">
            <div class="owl-rel-item" v-for="r in businessRelations" :key="r.key">
              <span class="owl-rel-name">{{ r.from }}</span>
              <span class="owl-rel-arrow">→</span>
              <span class="owl-rel-target">{{ r.relation }}</span>
              <span class="owl-rel-arrow">→</span>
              <span class="owl-rel-target">{{ r.to }}</span>
            </div>
          </div>
        </template>

        <!-- ══════ OWL 模式：本体类定义 + 规则 ══════ -->
        <template v-else-if="isOwlView">
          <div class="owl-rule-header">本体类定义</div>

          <!-- 当前选中节点的类 -->
          <div class="owl-class-card">
            <div class="owl-class-name">{{ store.selectedNode.nodeType || 'Thing' }}</div>
            <div class="owl-class-label">实例: {{ store.selectedNode.name }}</div>
            <div class="owl-class-props" v-if="classProperties.length">
              <div class="owl-prop" v-for="p in classProperties" :key="p.key">
                <span class="owl-prop-key">{{ p.key }}</span>
                <span class="owl-prop-val">{{ p.value }}</span>
              </div>
            </div>
          </div>

          <!-- 类的关系定义 -->
          <div class="owl-section-title">对象属性（关系）</div>
          <div class="owl-relations">
            <div class="owl-rel-item" v-for="r in classRelations" :key="r.name">
              <span class="owl-rel-name">{{ r.name }}</span>
              <span class="owl-rel-arrow">→</span>
              <span class="owl-rel-target">{{ r.target }}</span>
            </div>
          </div>

          <!-- SWRL 规则 -->
          <div class="owl-section-title">SWRL 推理规则</div>
          <div class="owl-rules-list">
            <div class="owl-rule-item" v-for="(rule, i) in swrlRules" :key="i">
              <div class="owl-rule-if">IF {{ rule.if }}</div>
              <div class="owl-rule-then">THEN {{ rule.then }}</div>
            </div>
          </div>

          <!-- 当前类适用的推理标签 -->
          <div class="owl-section-title" v-if="classInferenceLabels.length">该类推理标签</div>
          <div class="inference-tags-list" v-if="classInferenceLabels.length">
            <span v-for="tag in classInferenceLabels" :key="tag.key" :class="['inf-tag', tag.cssClass]">{{ tag.label }}</span>
          </div>
        </template>

        <!-- ══════ 普通模式 ══════ -->
        <template v-else>
          <div class="detail-field"><label>名称</label><span>{{ store.selectedNode.name }}</span></div>
          <div class="detail-field"><label>类型</label>
            <el-tag size="small" :style="{background: getNodeTypeColor(store.selectedNode.nodeType), color:'#fff'}">
              {{ store.selectedNode.nodeType }}
            </el-tag>
          </div>
          <div class="detail-field" v-for="(val, key) in propsEntries" :key="key">
            <label>{{ key }}</label><span>{{ formatVal(val) }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useUraniumOntologyStore } from '@/stores/ontology_uranium'
import { useOntologyStore } from '@/stores/ontology'
import { useScenarioStore } from '@/stores/scenario'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Search, Loading } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { computeLayeredLayout, computeLayeredLayoutDetailed, edgeLineStyle, classifyRelation, EDGE_LABELS } from '@/utils/ontologyLayout'

// ===== 嵌入参数：专家观点内嵌本图谱时，initialView='dynamic' 默认展示真实动态网络；
//      原“本体网络”独立页不传参，initialView 保持 'business'，行为不变。=====
const props = defineProps({
  embedded: { type: Boolean, default: false },
  initialView: { type: String, default: 'business' }, // 'business' | 'dynamic'
  initialWindow: { type: String, default: 't_2024' },
})

const MAX_VISIBLE_NODES = 300
const OWL_MAX_VISIBLE = 80  // OWL 视图限制节点数，保证可读性
const METRIC_TYPES = new Set(['UraniumProduction', 'UraniumDemand', 'ExplorationMetric',
  'PriceMetric', 'InventoryMetric', 'CostMetric', 'ResourceMetric'])
const CORE_TYPES = new Set(['Country', 'UraniumMine', 'UraniumCompany',
  'RiskEvent', 'TransportRoute', 'Policy', 'FuelCycleFacility',
  'TurningPoint', 'ScenarioNode'])

// 分层布局：国家在最上方，矿山/企业次之，事件与指标逐层向下
const URANIUM_BANDS = [
  ['Country'],
  ['UraniumMine', 'UraniumCompany'],
  ['FuelCycleFacility', 'TransportRoute', 'Policy', 'NuclearUtility'],
  ['RiskEvent', 'PolicyEvent', 'PriceEvent', 'GeopoliticalRisk', 'TurningPoint', 'ScenarioNode'],
  ['UraniumProduction', 'UraniumDemand', 'ExplorationMetric', 'PriceMetric', 'InventoryMetric', 'CostMetric', 'ResourceMetric'],
]
const URANIUM_BAND_LABELS = ['国家/地区', '矿山/企业', '设施/路线/政策', '事件/情景/风险', '指标']
const URANIUM_COOP = new Set(['has_mine', 'based_in', 'operates', 'consumes', 'explores',
  'has_price', 'has_inventory', 'connects_to', 'located_in', 'operates_facility',
  'has_resource', 'has_cost', 'produces', 'transports'])
const URANIUM_CONFRONT = new Set(['affects', 'regulates', 'disrupts', 'sanctions', 'conflicts'])

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
const keyYears = computed(() => isAuto.value
  ? [1, 3, 6, 9, 12]
  : [1997, 2003, 2007, 2011, 2016, 2020, 2022, 2024])

const route = useRoute()
const scenarioStore = useScenarioStore()
const currentScenario = computed(() => route.query.scenario || scenarioStore.currentScenario || 'uranium')
const isAuto = computed(() => currentScenario.value === 'supply_chain')

// 场景感知：根据 URL 参数选择对应的 Pinia store
const _uraniumStore = useUraniumOntologyStore()
const _autoStore = useOntologyStore()
const store = (isAuto.value) ? _autoStore : _uraniumStore
const { loading } = storeToRefs(store)

const chartRef = ref(null)
let chart = null
let renderTimer = null
let resizeObserver = null

const searchQuery = ref('')
const windowIdx = ref(0)
const maxWindowIdx = ref(0)
const isOwlView = ref(false)
const isBusinessView = ref(false) // 是否展示业务规则本体网络（默认中心图，onMounted 末尾切 true）

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

// OWL 本体网络规则判定卡片
const owlRules = computed(() => {
  if (!isOwlView.value) return []
  const labels = store.owlNetworkLabels || {}
  const rules = []
  if (labels.HighRiskCountry?.count > 0) rules.push({
    rule_name: '地缘政治高风险国', icon: '🌍', urgency: 'high',
    description: `检测到 ${labels.HighRiskCountry.count} 个国家被标记为地缘政治高风险——政局动荡/制裁/冲突多重暴露`,
    verdict: '【地缘政治高风险国】→ 极高风险',
    affected: [],
  })
  if (labels.SupplyBottleneck?.count > 0) rules.push({
    rule_name: '供应瓶颈识别', icon: '⚠️', urgency: 'high',
    description: `识别出 ${labels.SupplyBottleneck.count} 个供应瓶颈节点（单一来源依赖/产能集中度过高）`,
    verdict: '【供应瓶颈节点】→ 高风险',
    affected: [],
  })
  if (labels.TransportChokepoint?.count > 0) rules.push({
    rule_name: '运输咽喉节点', icon: '🚢', urgency: 'high',
    description: `${labels.TransportChokepoint.count} 个节点被判定为运输咽喉——关键港口/通道依赖`,
    verdict: '【运输咽喉节点】→ 高风险',
    affected: [],
  })
  if (labels.ResourceConcentrationRisk?.count > 0) rules.push({
    rule_name: '资源集中度风险', icon: '📦', urgency: 'medium',
    description: `${labels.ResourceConcentrationRisk.count} 个节点资源高度集中——单一国家/企业控制超过40%供给`,
    verdict: '【资源集中】→ 中高风险',
    affected: [],
  })
  if (labels.MultiRiskCountry?.count > 0) rules.push({
    rule_name: '多风险聚集国', icon: '🔴', urgency: 'medium',
    description: `${labels.MultiRiskCountry.count} 个国家面临地缘+物流+政策等多重风险叠加`,
    verdict: '【多重风险叠加】→ 中风险',
    affected: [],
  })
  if (labels.MineCascadeImpact?.count > 0) rules.push({
    rule_name: '矿山停产连锁效应', icon: '⛏️', urgency: 'high',
    description: `${labels.MineCascadeImpact.count} 个节点存在矿山停产连锁——一旦停产将引发下游供应断裂`,
    verdict: '【矿山停产连锁】→ 极高风险',
    affected: [],
  })
  if (labels.PriceShockTrigger?.count > 0) rules.push({
    rule_name: '价格冲击触发点', icon: '💹', urgency: 'medium',
    description: `${labels.PriceShockTrigger.count} 个节点达到价格冲击阈值——供需失衡可能触发价格剧烈波动`,
    verdict: '【价格冲击预警】→ 中高风险',
    affected: [],
  })
  return rules
})

// ── OWL 本体类定义与规则（OWL 模式下右侧显示）──

// 铀本体类定义（抽象层级，不涉及具体实例数据）
const OWL_CLASS_DEFS = {
  Country: { label: '国家', props: { hasMine: 'UraniumMine', locatedIn: 'Region', operatesFacility: 'FuelCycleFacility' }},
  UraniumMine: { label: '铀矿山', props: { producesIn: 'Country', operatedBy: 'UraniumCompany', transportsVia: 'TransportRoute' }},
  UraniumCompany: { label: '铀矿企业', props: { operates: 'UraniumMine', producesIn: 'Country', sellsTo: 'NuclearUtility' }},
  FuelCycleFacility: { label: '核燃料循环设施', props: { locatedIn: 'Country', operatedBy: 'UraniumCompany', suppliesTo: 'NuclearUtility' }},
  TransportRoute: { label: '运输路线', props: { connectsCountry: 'Country', passesThrough: 'TransportChokepoint', carriesMaterial: 'UraniumProduction' }},
  NuclearUtility: { label: '核电业主', props: { consumesIn: 'Country', purchasesFrom: 'UraniumCompany', affectedBy: 'PriceEvent' }},
  RiskEvent: { label: '风险事件', props: { affectsCountry: 'Country', impactsMine: 'UraniumMine', triggersRule: 'SWRL' }},
  PolicyEvent: { label: '政策事件', props: { affectsCountry: 'Country', changesRegulation: 'Country' }},
  PriceEvent: { label: '价格事件', props: { affectsMarket: 'Country', changesPrice: 'PriceMetric' }},
  GeopoliticalRisk: { label: '地缘政治风险', props: { targetsCountry: 'Country', disruptsRoute: 'TransportRoute' }},
  TurningPoint: { label: '拐点', props: { marksChange: 'PriceMetric', signalsRule: 'SWRL' }},
  ScenarioNode: { label: '情景节点', props: { modelsImpact: 'Country', predictsOutcome: 'PriceMetric' }},
}

// SWRL 推理规则定义（类级别，不涉及具体实例）
const SWRL_RULES = [
  { if: 'Country 存在 GeopoliticalRisk 且 sanctions ≥ 2', then: 'Country rdf:type HighRiskCountry' },
  { if: 'UraniumMine 产量占全球 > 40% 且替代矿山数 = 0', then: 'Mine rdf:type ResourceConcentrationRisk' },
  { if: 'TransportRoute 必经路线 = true 且替代路线数 = 0', then: 'Route rdf:type TransportChokepoint' },
  { if: 'Country 同时存在 GeopoliticalRisk + LogisticsRisk + PolicyRisk', then: 'Country rdf:type MultiRiskCountry' },
  { if: 'UraniumMine 停产 且 影响下游企业 ≥ 3 且 替代需 > 2年', then: 'Mine rdf:type MineCascadeImpact' },
  { if: '仓库库存消费比 < 2年 且 矿山产量 < 核电需求 × 0.9', then: '市场 rdf:type SupplyBottleneck' },
  { if: '现货价 > 历史90分位 且 供需缺口 > 10%', then: '市场 rdf:type PriceShockTrigger' },
]

const classProperties = computed(() => {
  if (!store.selectedNode) return []
  const nt = store.selectedNode.nodeType || ''
  const cls = OWL_CLASS_DEFS[nt]
  if (!cls) return [{ key: 'owl:Class', value: nt }, { key: 'rdfs:label', value: nt }]
  return [
    { key: 'owl:Class', value: nt },
    { key: 'rdfs:label', value: cls.label },
    { key: 'rdfs:subClassOf', value: 'Thing' },
  ]
})

const classRelations = computed(() => {
  if (!store.selectedNode) return []
  const nt = store.selectedNode.nodeType || ''
  const cls = OWL_CLASS_DEFS[nt]
  if (!cls) return []
  return Object.entries(cls.props).map(([prop, target]) => ({
    name: prop, target: target
  }))
})

const swrlRules = computed(() => SWRL_RULES)

const classInferenceLabels = computed(() => {
  if (!store.selectedNode) return []
  const props = store.selectedNode.properties || {}
  const tags = []
  const defs = [
    { key: 'HighRiskCountry', label: '高风险国', cssClass: 'inf-danger' },
    { key: 'SupplyBottleneck', label: '供应瓶颈', cssClass: 'inf-critical' },
    { key: 'PriceShockTrigger', label: '价格冲击', cssClass: 'inf-warning' },
    { key: 'TransportChokepoint', label: '运输咽喉', cssClass: 'inf-bottleneck' },
    { key: 'ResourceConcentrationRisk', label: '资源集中', cssClass: 'inf-pressure' },
    { key: 'MultiRiskCountry', label: '多风险国', cssClass: 'inf-multirisk' },
    { key: 'MineCascadeImpact', label: '矿山连锁', cssClass: 'inf-critical' },
  ]
  for (const d of defs) {
    if (props[d.key]) tags.push(d)
  }
  return tags
})

// 业务规则网络右侧详情
const BUSINESS_DETAIL_LABELS = {
  labelCn: '节点含义',
  group: '所属分类',
  examples: '代表对象',
  description: '业务说明',
  policyLogic: '政策逻辑',
  managementLogic: '管理关系',
  impactLogic: '影响机制',
  metricLogic: '评估指标',
  rule: '规则判定',
}

const businessDetailFields = computed(() => {
  const props = store.selectedNode?.properties || {}
  const order = [
    'labelCn',
    'group',
    'examples',
    'description',
    'policyLogic',
    'managementLogic',
    'impactLogic',
    'metricLogic',
    'rule',
  ]
  return order
    .filter(k => props[k])
    .map(k => ({
      key: k,
      label: BUSINESS_DETAIL_LABELS[k] || k,
      value: formatVal(props[k]),
    }))
})

const businessRelations = computed(() => {
  if (!store.selectedNode || !isBusinessView.value) return []
  const graph = store.currentView
  const nodeId = store.selectedNode.id
  const nameMap = new Map((graph.nodes || []).map(n => [n.id, n.name || n.id]))

  return (graph.edges || [])
    .filter(e => e.source === nodeId || e.target === nodeId)
    .map((e, idx) => ({
      key: `${e.source}-${e.target}-${idx}`,
      from: nameMap.get(e.source) || e.source,
      to: nameMap.get(e.target) || e.target,
      relation: e.relation || e.properties?.relationCn || '关联',
    }))
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
  // 过滤：只显示标量值（字符串/数字/布尔），排除数组、对象和内部字段
  const skipKeys = ['centrality_metrics', 'role_confidence', 'role',
    'HighRiskCountry', 'SupplyBottleneck', 'PriceShockTrigger',
    'TransportChokepoint', 'ResourceConcentrationRisk',
    'MultiRiskCountry', 'MineCascadeImpact']
  return Object.entries(props)
    .filter(([k, v]) =>
      !skipKeys.includes(k) &&
      v !== null && v !== '' && v !== undefined &&
      typeof v !== 'object'
    )
    .map(([k, v]) => [k, typeof v === 'number' ? v.toLocaleString() : String(v)])
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

// ── 业务规则本体网络（类级别，用于展示业务逻辑；非实例数据） ──
const BUSINESS_GROUP_COLORS = {
  '风险扰动': '#E8807A',
  '国家分类': '#7FA8D9',
  '政策机制': '#B39DD8',
  '企业资源': '#C49A6C',
  '评估指标': '#7FBF7F',
  '规则判定': '#E6A23C',
}
const BUSINESS_GROUP_ORDER = ['风险扰动', '国家分类', '政策机制', '企业资源', '评估指标', '规则判定']
const BUSINESS_TYPE_GROUP = {
  RiskSource: '风险扰动',

  CountryClass: '国家分类',
  MajorExporterCountry: '国家分类',
  MinorSupplierCountry: '国家分类',
  ImportDependentCountry: '国家分类',

  ExportPolicy: '政策机制',
  SupplierPolicy: '政策机制',
  ImportSecurityPolicy: '政策机制',
  StateEnterpriseManagement: '政策机制',

  UraniumCompany: '企业资源',
  UraniumMine: '企业资源',
  TransportRoute: '企业资源',
  NuclearFacility: '企业资源',

  ConcentrationMetric: '评估指标',
  ImportInventoryMetric: '评估指标',
  PolicyTightnessMetric: '评估指标',
  StabilityMetric: '评估指标',

  ExportTighteningRule: '规则判定',
  SupplierSubstitutionRule: '规则判定',
  ImportSecurityRule: '规则判定',
}
const BUSINESS_ONTOLOGY_NODES = [
  {
    id: 'risk_event',
    name: '风险扰动',
    nodeType: 'RiskSource',
    group: '风险扰动',
    x: -540,
    y: 20,
    symbolSize: 74,
    properties: {
      labelCn: '风险扰动源',
      description: '政策变化、制裁、冲突、矿山事故、运输中断、价格冲击等外部扰动。',
      impactLogic: '风险事件不直接等同于风险结论，而是先触发国家类别、政策机制、企业资源和指标变化。',
    },
  },
  {
    id: 'country_class',
    name: '国家类',
    nodeType: 'CountryClass',
    group: '国家分类',
    x: -390,
    y: 20,
    symbolSize: 68,
    properties: {
      labelCn: '国家作为政策与监管主体',
      description: '国家不再作为零散节点展示，而是按供应链角色分类。',
      policyLogic: '不同国家类别对应不同政策集合、企业监管方式和评估指标。',
    },
  },
  {
    id: 'major_exporter_country',
    name: '铀大出口国',
    nodeType: 'MajorExporterCountry',
    group: '国家分类',
    x: -235,
    y: -155,
    symbolSize: 64,
    properties: {
      labelCn: '主要供给国',
      examples: '代表性国家：哈萨克斯坦、加拿大、澳大利亚、纳米比亚',
      description: '承担主要外部供给功能，对全球供应可得性影响较大。',
      policyLogic: '重点关注出口许可、出口配额、制裁合规、本土加工要求、资源民族主义倾向。',
      metricLogic: '重点评估供应集中度、政策收紧度、出口可得性。',
    },
  },
  {
    id: 'minor_supplier_country',
    name: '补给小国',
    nodeType: 'MinorSupplierCountry',
    group: '国家分类',
    x: -235,
    y: -35,
    symbolSize: 60,
    properties: {
      labelCn: '补充型供应国',
      examples: '代表性国家：乌兹别克斯坦、尼日尔、马拉维',
      description: '供给规模相对有限，更多承担替代补给或边际补给功能。',
      policyLogic: '重点关注政策稳定性、临时出口能力、财政依赖、合同履约稳定性。',
      metricLogic: '重点评估替代可靠性、补给弹性、履约稳定性。',
    },
  },
  {
    id: 'import_dependent_country',
    name: '进口消费国',
    nodeType: 'ImportDependentCountry',
    group: '国家分类',
    x: -235,
    y: 90,
    symbolSize: 60,
    properties: {
      labelCn: '需求驱动型国家',
      examples: '代表性国家：中国、法国、日本、韩国',
      description: '核电需求或核燃料需求较强，对外部进口、长期合同和战略库存依赖较高。',
      policyLogic: '重点关注进口审批、长期采购合同、战略库存、多元化寻源、路线切换能力。',
      metricLogic: '重点评估进口依赖度、库存保障月数、供应替代周期。',
    },
  },
  {
    id: 'export_policy',
    name: '出口国政策',
    nodeType: 'ExportPolicy',
    group: '政策机制',
    x: -45,
    y: -155,
    symbolSize: 60,
    properties: {
      labelCn: '大出口国政策集合',
      description: '对铀资源出口、矿山产能、企业销售和跨境运输形成约束。',
      policyLogic: '出口许可、配额控制、制裁合规、运输许可、战略资源保护。',
      impactLogic: '政策收紧会降低出口可得性，提高供应集中风险和采购成本。',
    },
  },
  {
    id: 'supplier_policy',
    name: '补给国政策',
    nodeType: 'SupplierPolicy',
    group: '政策机制',
    x: -45,
    y: -35,
    symbolSize: 58,
    properties: {
      labelCn: '补给小国政策集合',
      description: '小规模供给国通常政策弹性更强，但稳定性和履约能力差异更大。',
      policyLogic: '临时出口、财政收入依赖、政局稳定性、合同履约约束。',
      impactLogic: '补给国政策波动会影响替代供应可靠性。',
    },
  },
  {
    id: 'import_policy',
    name: '进口保障政策',
    nodeType: 'ImportSecurityPolicy',
    group: '政策机制',
    x: -45,
    y: 90,
    symbolSize: 58,
    properties: {
      labelCn: '消费国进口政策集合',
      description: '保障核燃料供应安全，降低单一来源依赖。',
      policyLogic: '长期合同、战略库存、多源进口、采购审批、运输路线切换。',
      impactLogic: '库存不足且进口依赖高时，会放大外部冲击。',
    },
  },
  {
    id: 'state_enterprise_management',
    name: '国家—企业管理',
    nodeType: 'StateEnterpriseManagement',
    group: '政策机制',
    x: -45,
    y: 210,
    symbolSize: 62,
    properties: {
      labelCn: '国家对企业的管理关系',
      description: '用于表达国家和企业之间的监管、许可、税费、股权、合规约束。',
      managementLogic: '国家通过采矿许可、出口许可、税费制度、安全监管、国有股权或战略审查影响企业行为。',
      impactLogic: '企业是否能扩产、出口、履约和投资，取决于该管理关系。',
    },
  },
  {
    id: 'uranium_company',
    name: '铀矿企业',
    nodeType: 'UraniumCompany',
    group: '企业资源',
    x: 155,
    y: 210,
    symbolSize: 58,
    properties: {
      labelCn: '矿山运营与合同履约主体',
      description: '企业负责矿山投资、产能维护、销售合同和运输安排。',
      managementLogic: '受国家监管，也反过来影响矿山产能、合同履约和供应稳定性。',
    },
  },
  {
    id: 'uranium_mine',
    name: '铀矿山',
    nodeType: 'UraniumMine',
    group: '企业资源',
    x: 155,
    y: -85,
    symbolSize: 60,
    properties: {
      labelCn: '资源产出节点',
      description: '矿山决定实物供给基础。',
      impactLogic: '停产、降品位、扩产延迟会影响下游供应可得性。',
    },
  },
  {
    id: 'transport_route',
    name: '跨境运输路线',
    nodeType: 'TransportRoute',
    group: '企业资源',
    x: 155,
    y: 35,
    symbolSize: 58,
    properties: {
      labelCn: '物流通道节点',
      description: '连接矿山、港口、转运国和消费国设施。',
      impactLogic: '路线受制裁、港口、边境、海运和替代路线能力影响。',
    },
  },
  {
    id: 'nuclear_facility',
    name: '核燃料设施/需求',
    nodeType: 'NuclearFacility',
    group: '企业资源',
    x: 155,
    y: 120,
    symbolSize: 58,
    properties: {
      labelCn: '下游消费需求',
      description: '代表核燃料加工、核电需求和终端消费压力。',
      impactLogic: '需求刚性越强，供应扰动越容易转化为库存和价格压力。',
    },
  },
  {
    id: 'concentration_metric',
    name: '供应集中度',
    nodeType: 'ConcentrationMetric',
    group: '评估指标',
    x: 365,
    y: -155,
    symbolSize: 54,
    properties: {
      labelCn: '供给集中风险指标',
      metricLogic: '出口国份额、企业份额、矿山份额、可替代供应数量。',
      rule: '集中度越高，单一国家或企业政策变化的影响越大。',
    },
  },
  {
    id: 'policy_tightness_metric',
    name: '政策收紧度',
    nodeType: 'PolicyTightnessMetric',
    group: '评估指标',
    x: 365,
    y: -35,
    symbolSize: 54,
    properties: {
      labelCn: '政策影响指标',
      metricLogic: '出口许可强度、配额限制、制裁合规成本、审批周期、政策不确定性。',
      rule: '政策收紧度上升会降低供应可得性。',
    },
  },
  {
    id: 'import_inventory_metric',
    name: '进口依赖/库存保障',
    nodeType: 'ImportInventoryMetric',
    group: '评估指标',
    x: 365,
    y: 90,
    symbolSize: 54,
    properties: {
      labelCn: '消费国安全指标',
      metricLogic: '进口依赖度、库存保障月数、长期合同覆盖率、供应替代周期。',
      rule: '高进口依赖叠加低库存，会触发进口安全风险。',
    },
  },
  {
    id: 'stability_metric',
    name: '运输与履约稳定性',
    nodeType: 'StabilityMetric',
    group: '评估指标',
    x: 365,
    y: 210,
    symbolSize: 54,
    properties: {
      labelCn: '运行稳定性指标',
      metricLogic: '路线中断概率、替代路线数量、企业履约率、矿山停产概率。',
      rule: '路线或企业稳定性下降，会削弱补给小国和替代供应的可靠性。',
    },
  },
  {
    id: 'export_tightening_rule',
    name: '规则：出口收紧',
    nodeType: 'ExportTighteningRule',
    group: '规则判定',
    x: 585,
    y: -120,
    symbolSize: 60,
    properties: {
      labelCn: '出口国风险判定规则',
      rule: '若大出口国政策收紧度上升，且供应集中度高，则判定为出口可得性下降。',
      description: '用于识别主要出口国政策变化对全球供应的影响。',
    },
  },
  {
    id: 'supplier_substitution_rule',
    name: '规则：替代可靠性',
    nodeType: 'SupplierSubstitutionRule',
    group: '规则判定',
    x: 585,
    y: 35,
    symbolSize: 60,
    properties: {
      labelCn: '补给小国替代规则',
      rule: '若补给小国履约稳定性低，且运输路线替代性差，则判定为替代供应不可靠。',
      description: '用于判断小供应国能否承担替代供给功能。',
    },
  },
  {
    id: 'import_security_rule',
    name: '规则：进口安全',
    nodeType: 'ImportSecurityRule',
    group: '规则判定',
    x: 585,
    y: 170,
    symbolSize: 60,
    properties: {
      labelCn: '消费国进口安全规则',
      rule: '若进口依赖度高、库存保障不足，且供应替代周期长，则判定为进口安全风险升高。',
      description: '用于判断消费国在外部供应扰动下的脆弱性。',
    },
  },
]
const BUSINESS_ONTOLOGY_EDGES = [
  { source: 'risk_event', target: 'country_class', relation: '触发分类判断', edgeType: 'impact' },

  { source: 'country_class', target: 'major_exporter_country', relation: '划分为', edgeType: 'structure' },
  { source: 'country_class', target: 'minor_supplier_country', relation: '划分为', edgeType: 'structure' },
  { source: 'country_class', target: 'import_dependent_country', relation: '划分为', edgeType: 'structure' },

  { source: 'major_exporter_country', target: 'export_policy', relation: '适用政策', edgeType: 'policy' },
  { source: 'minor_supplier_country', target: 'supplier_policy', relation: '适用政策', edgeType: 'policy' },
  { source: 'import_dependent_country', target: 'import_policy', relation: '适用政策', edgeType: 'policy' },

  { source: 'major_exporter_country', target: 'state_enterprise_management', relation: '监管企业', edgeType: 'management' },
  { source: 'minor_supplier_country', target: 'state_enterprise_management', relation: '监管企业', edgeType: 'management' },
  { source: 'state_enterprise_management', target: 'uranium_company', relation: '许可/股权/合规', edgeType: 'management' },

  { source: 'export_policy', target: 'uranium_company', relation: '约束出口行为', edgeType: 'policy' },
  { source: 'supplier_policy', target: 'uranium_company', relation: '约束履约弹性', edgeType: 'policy' },
  { source: 'import_policy', target: 'nuclear_facility', relation: '保障采购库存', edgeType: 'policy' },

  { source: 'uranium_company', target: 'uranium_mine', relation: '投资运营', edgeType: 'flow' },
  { source: 'uranium_mine', target: 'transport_route', relation: '产出运输', edgeType: 'flow' },
  { source: 'transport_route', target: 'nuclear_facility', relation: '跨境供给', edgeType: 'flow' },
  { source: 'nuclear_facility', target: 'import_dependent_country', relation: '形成需求压力', edgeType: 'flow' },

  { source: 'major_exporter_country', target: 'concentration_metric', relation: '评估', edgeType: 'metric' },
  { source: 'export_policy', target: 'policy_tightness_metric', relation: '评估', edgeType: 'metric' },
  { source: 'import_dependent_country', target: 'import_inventory_metric', relation: '评估', edgeType: 'metric' },
  { source: 'import_policy', target: 'import_inventory_metric', relation: '评估', edgeType: 'metric' },
  { source: 'transport_route', target: 'stability_metric', relation: '评估', edgeType: 'metric' },
  { source: 'uranium_company', target: 'stability_metric', relation: '评估', edgeType: 'metric' },

  { source: 'concentration_metric', target: 'export_tightening_rule', relation: '输入规则', edgeType: 'rule' },
  { source: 'policy_tightness_metric', target: 'export_tightening_rule', relation: '输入规则', edgeType: 'rule' },
  { source: 'stability_metric', target: 'supplier_substitution_rule', relation: '输入规则', edgeType: 'rule' },
  { source: 'import_inventory_metric', target: 'import_security_rule', relation: '输入规则', edgeType: 'rule' },
  { source: 'policy_tightness_metric', target: 'import_security_rule', relation: '输入规则', edgeType: 'rule' },
]

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
  const group = BUSINESS_TYPE_GROUP[nodeType]
  if (group) return BUSINESS_GROUP_COLORS[group] || '#999'
  return TYPE_COLORS[nodeType] || '#999'
}

function formatPath(p) {
  if (!p) return ''
  if (typeof p === 'string') return p
  if (Array.isArray(p)) return p.join(' → ')
  if (p.path && Array.isArray(p.path)) return p.path.join(' → ')
  return JSON.stringify(p).slice(0, 100)
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

  // OWL视图：只保留核心节点 + 角色标注 + 中文字段优先
  if (isOwlView.value) {
    const hasChinese = (s) => /[一-鿿]/.test(s || '')
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
    // 中文节点优先
    const cnOthers = otherNodes.filter(n => hasChinese(n.name))
    const enOthers = otherNodes.filter(n => !hasChinese(n.name))
    let selected = [...keyNodes, ...plainCore, ...cnOthers, ...enOthers, ...metricNodes]
    if (selected.length > OWL_MAX_VISIBLE) selected = selected.slice(0, OWL_MAX_VISIBLE)
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

function buildBusinessOntologyGraph() {
  const categories = BUSINESS_GROUP_ORDER.map(g => ({
    name: g,
    itemStyle: { color: BUSINESS_GROUP_COLORS[g] },
  }))

  const nodes = BUSINESS_ONTOLOGY_NODES.map(n => ({
    id: n.id,
    name: n.name,
    nodeType: n.nodeType,
    category: BUSINESS_GROUP_ORDER.indexOf(n.group),
    symbolSize: n.symbolSize || 54,
    x: n.x,
    y: n.y,
    properties: {
      ...(n.properties || {}),
      group: n.group,
      labelCn: n.properties?.labelCn || n.name,
    },
  }))

  const edges = BUSINESS_ONTOLOGY_EDGES.map(e => ({
    source: e.source,
    target: e.target,
    relation: e.relation,
    edgeType: e.edgeType || 'structure',
    properties: {
      relationCn: e.relation,
    },
  }))

  return { nodes, edges, categories }
}

function buildBusinessChartOption() {
  const graph = store.currentView
  const nodes = graph.nodes || []
  const edges = graph.edges || []
  const categories = graph.categories || []
  const selectedId = store.selectedNode?.id

  const idToName = {}
  for (const n of nodes) idToName[n.id] = n.name || n.id

  const edgeStyleMap = {
    impact: { color: '#E8807A', width: 2.2, type: 'solid', opacity: 0.82 },
    structure: { color: '#CBD5E1', width: 1.4, type: 'solid', opacity: 0.65 },
    policy: { color: '#8B5CF6', width: 2.0, type: 'solid', opacity: 0.78 },
    management: { color: '#2563EB', width: 2.0, type: 'solid', opacity: 0.78 },
    flow: { color: '#16A34A', width: 2.2, type: 'solid', opacity: 0.8 },
    metric: { color: '#65A30D', width: 1.8, type: 'dashed', opacity: 0.72 },
    rule: { color: '#F59E0B', width: 2.0, type: 'dashed', opacity: 0.82 },
  }

  return {
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (p) => {
        if (p.dataType === 'node') {
          const props = p.data.properties || {}
          const rows = [
            props.labelCn ? `含义：${props.labelCn}` : '',
            props.group ? `分类：${props.group}` : '',
            props.examples ? `代表对象：${props.examples}` : '',
            props.description ? `说明：${props.description}` : '',
            props.policyLogic ? `政策逻辑：${props.policyLogic}` : '',
            props.managementLogic ? `管理关系：${props.managementLogic}` : '',
            props.impactLogic ? `影响机制：${props.impactLogic}` : '',
            props.metricLogic ? `评估指标：${props.metricLogic}` : '',
            props.rule ? `规则：${props.rule}` : '',
          ].filter(Boolean)

          return `<b>${p.name}</b><br/>${rows.join('<br/>')}`
        }

        const s = idToName[p.data.source] || p.data.source
        const t = idToName[p.data.target] || p.data.target
        return `${s} → <b>${p.data.relation}</b> → ${t}`
      },
    },

    legend: {
      data: categories.map(c => c.name),
      bottom: 10,
      type: 'scroll',
      textStyle: { fontSize: 11 },
    },

    animationDuration: 500,
    animationEasingUpdate: 'cubicOut',

    series: [{
      type: 'graph',
      layout: 'none',
      symbol: 'roundRect',
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: 8,
      roam: true,
      draggable: false,
      top: 40,
      bottom: 60,
      left: 40,
      right: 40,

      data: nodes.map(n => {
        const group = n.properties?.group
        const baseColor = BUSINESS_GROUP_COLORS[group] || '#94A3B8'

        return {
          id: n.id,
          name: n.name,
          category: n.category,
          symbolSize: n.symbolSize || 54,
          nodeType: n.nodeType,
          properties: n.properties,
          x: n.x,
          y: n.y,
          itemStyle: n.id === selectedId
            ? {
                color: baseColor,
                borderColor: '#FFB020',
                borderWidth: 4,
                shadowBlur: 14,
                shadowColor: 'rgba(255,176,32,0.45)',
              }
            : {
                color: baseColor,
                borderColor: '#ffffff',
                borderWidth: 2,
                shadowBlur: 6,
                shadowColor: 'rgba(15,23,42,0.12)',
              },
          label: {
            show: true,
            formatter: '{b}',
            fontSize: 12,
            fontWeight: 600,
            color: '#1f2937',
            position: 'inside',
            overflow: 'break',
            width: 78,
            lineHeight: 15,
          },
        }
      }),

      edges: edges.map(e => {
        const style = edgeStyleMap[e.edgeType] || edgeStyleMap.structure

        return {
          source: e.source,
          target: e.target,
          relation: e.relation,
          edgeType: e.edgeType,
          properties: e.properties,
          label: {
            show: true,
            formatter: e.relation,
            fontSize: 10,
            color: '#64748b',
          },
          lineStyle: {
            ...style,
            curveness: 0.08,
          },
        }
      }),

      categories,
      labelLayout: {
        hideOverlap: true,
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: { width: 3.2 },
        label: { fontSize: 13 },
      },
      scaleLimit: {
        min: 0.35,
        max: 3,
      },
    }],
  }
}

function buildChartOption() {
  if (isBusinessView.value) return buildBusinessChartOption()
  const { nodes, edges } = getVisibleGraph()
  const graph = store.currentView
  const categories = graph.categories || []
  const selectedId = store.selectedNode?.id

  // 注入自定义颜色
  const enrichedCategories = categories.map(c => ({
    ...c,
    itemStyle: { color: TYPE_COLORS[c.name] || c.itemStyle?.color || '#999' }
  }))

  // 分层布局：国家在最上方，事件/指标逐层向下
  const W = chartRef.value?.clientWidth || 900
  const H = chartRef.value?.clientHeight || 600
  const { positions, bands } = computeLayeredLayoutDetailed(nodes, URANIUM_BANDS, W, H)
  const idToName = {}
  for (const n of nodes) idToName[n.id] = n.name || n.id

  // 分层带背景 + 层标题（graphic 坐标：top = H/2 + bandY，因 graph 原点在容器中心）
  const bandPalette = ['rgba(37,99,235,0.05)', 'rgba(16,185,129,0.05)', 'rgba(245,158,11,0.05)', 'rgba(239,68,68,0.05)', 'rgba(99,102,241,0.05)']
  const graphics = []
  bands.forEach((band, i) => {
    const top = H / 2 + band.y0
    const height = band.y1 - band.y0
    graphics.push({
      type: 'rect',
      left: 0, top, right: 0, height,
      style: { fill: bandPalette[i % bandPalette.length] },
      silent: true, z: -1,
    })
    if (URANIUM_BAND_LABELS[i]) {
      graphics.push({
        type: 'text',
        left: 12, top: top + 6,
        style: { text: `${URANIUM_BAND_LABELS[i]} (${band.count})`, fill: '#64748b', fontSize: 11, fontWeight: 700 },
        silent: true,
      })
    }
  })

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
        const kind = classifyRelation(p.data.relation, URANIUM_COOP, URANIUM_CONFRONT)
        const s = idToName[p.data.source] || p.data.source
        const t = idToName[p.data.target] || p.data.target
        return `${s} → <b>${p.data.relation || '关联'}</b>（${EDGE_LABELS[kind]}） → ${t}`
      }
    },
    legend: { data: enrichedCategories.map(c => c.name), bottom: 10, type: 'scroll' },
    animationDuration: 500,
    animationEasingUpdate: 'cubicOut',
    graphic: graphics,
    series: [{
      type: 'graph', layout: 'none',
      data: nodes.map(n => {
        const pos = positions[n.id] || { x: 0, y: 0 }
        return {
          id: n.id, name: n.name, category: n.category,
          symbolSize: isOwlView.value ? Math.max(18, n.symbolSize || 18) : (n.symbolSize || 20),
          nodeType: n.nodeType, properties: n.properties,
          x: pos.x, y: pos.y,
          itemStyle: n.id === selectedId
            ? { borderColor: '#ff0', borderWidth: 3, shadowBlur: 12, shadowColor: '#ff0' }
            : (n.properties?.role === 'key_node' && isOwlView.value)
              ? { borderColor: '#ef4444', borderWidth: 3, shadowBlur: 8, shadowColor: '#ef444488' }
              : (n.properties?.role === 'bridge_node' && isOwlView.value)
                ? { borderColor: '#f59e0b', borderWidth: 2.5, shadowBlur: 6, shadowColor: '#f59e0b66' }
                : undefined,
          label: { show: isOwlView.value || (n.symbolSize || 20) > 30, fontSize: isOwlView.value ? 11 : 10, position: 'right' }
        }
      }),
      edges: edges.map(e => ({
        source: e.source, target: e.target, relation: e.relation,
        label: { show: false, formatter: e.relation },
        lineStyle: edgeLineStyle(e.relation, URANIUM_COOP, URANIUM_CONFRONT)
      })),
      categories: enrichedCategories,
      roam: true, draggable: true,
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
  const targetKey = isAuto.value ? `t_2024-${String(year).padStart(2, '0')}` : `t_${year}`
  const idx = store.dynamicWindows.indexOf(targetKey)
  if (idx >= 0) { windowIdx.value = idx; loadWindow() }
}

async function loadWindow() {
  const winKey = store.dynamicWindows[windowIdx.value]
  if (winKey) {
    isOwlView.value = false
    isBusinessView.value = false
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

// 本体类级别图（OWL 模式用，不显示具体实例名）
function buildUraniumClassGraph() {
  const classNodes = []
  const classEdges = []
  const added = new Set()
  const addedEdges = new Set()

  for (const [className, cls] of Object.entries(OWL_CLASS_DEFS)) {
    added.add(className)
    classNodes.push({
      id: className, name: cls.label, nodeType: className,
      properties: { role: className === 'Country' || className === 'UraniumMine' ? 'key_node' : 'normal_node' },
    })
    for (const [prop, target] of Object.entries(cls.props)) {
      const ek = className + '->' + target + ':' + prop
      if (addedEdges.has(ek)) continue
      addedEdges.add(ek)
      if (!added.has(target)) {
        added.add(target)
        classNodes.push({
          id: target, name: target, nodeType: target,
          properties: { role: 'normal_node' },
        })
      }
      classEdges.push({ source: className, target: target, relation: prop })
    }
  }
  const typeSet = new Set(classNodes.map(n => n.nodeType))
  const categories = [...typeSet].map(t => ({ name: t, itemStyle: { color: TYPE_COLORS[t] || '#999' } }))
  return { nodes: classNodes, edges: classEdges, categories }
}

async function toggleOwlView() {
  if (isOwlView.value) {
    isOwlView.value = false
    isBusinessView.value = false
    await loadWindow()
    return
  }
  store.currentView = buildBusinessOntologyGraph()
  isOwlView.value = true
  isBusinessView.value = true
  nextTick(renderChart)
}
async function switchToOwlNetwork() {
  await toggleOwlView()
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
  // 加载动态网络数据（供左右侧面板使用）
  await store.fetchDynamicGraph()
  maxWindowIdx.value = store.dynamicWindows.length - 1
  windowIdx.value = store.dynamicWindows.length - 1

  // 嵌入专家观点(initialView='dynamic')：定位到指定年度窗口（默认 t_2024），
  // 否则沿用原逻辑加载最后一个窗口作为后续时间滑动的底图
  const targetWindow = props.initialView === 'dynamic' ? (props.initialWindow || '') : ''
  if (store.dynamicWindows.length) {
    if (targetWindow && store.dynamicWindows.indexOf(targetWindow) >= 0) {
      windowIdx.value = store.dynamicWindows.indexOf(targetWindow)
    }
    await store.loadDynamicWindow(store.dynamicWindows[windowIdx.value])
  }
  await store.fetchDynamicTimeline()

  // 后台加载 OWL 本体推理 + 网络
  store.fetchOwlStats()
  store.fetchOwlInferred()
  store.fetchOwlNetwork()

  if (props.initialView === 'dynamic') {
    // 专家观点嵌入：默认中心图 = 真实动态知识图谱（如 t_2024：212节点/314边），不覆盖成业务规则图
    isBusinessView.value = false
    isOwlView.value = false
  } else {
    // 默认中心图：业务规则本体网络（原“本体网络”独立页保持现状）
    isBusinessView.value = true
    store.currentView = buildBusinessOntologyGraph()
  }

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
.edge-legend { position: absolute; top: 10px; right: 12px; background: rgba(255,255,255,0.92); border: 1px solid #e4e7ed; border-radius: 6px; padding: 6px 10px; font-size: 11px; color: #606266; display: flex; gap: 12px; z-index: 5; }
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-line { display: inline-block; width: 18px; height: 0; border-top: 2px solid #c8cdd0; }
.legend-line.coop { border-top-color: #67C23A; }
.legend-line.confront { border-top-color: #F56C6C; border-top-style: dashed; }
.legend-line.neutral { border-top-color: #c8cdd0; }
.legend-line.impact { border-top-color: #E8807A; }
.legend-line.policy { border-top-color: #8B5CF6; }
.legend-line.management { border-top-color: #2563EB; }
.legend-line.flow { border-top-color: #16A34A; }
.legend-line.metric { border-top-color: #65A30D; border-top-style: dashed; }
.legend-line.rule { border-top-color: #F59E0B; border-top-style: dashed; }

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
.rule-verdict { margin-top: 4px; font-size: 10px; }
.verdict-label { color: #909399; }
.verdict-value { color: #F56C6C; font-weight: 600; }
.rule-condition { font-size: 10px; color: #606266; margin-bottom: 3px; line-height: 1.4; }
.rule-consequence { font-size: 10px; color: #E6A23C; font-weight: 500; }

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
.owl-rel-name { color: #303133; font-weight: 500; min-width: 100px; }
.owl-rel-arrow { color: #5c6bc0; font-weight: 700; }
.owl-rel-target { color: #5c6bc0; font-weight: 500; }
.owl-rules-list { display: flex; flex-direction: column; gap: 6px; }
.owl-rule-item { font-size: 11px; padding: 6px 8px; background: #fef9e7; border-radius: 4px; border-left: 3px solid #f39c12; }
.owl-rule-if { color: #7d6608; margin-bottom: 2px; }
.owl-rule-then { color: #e67e22; font-weight: 600; }

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
