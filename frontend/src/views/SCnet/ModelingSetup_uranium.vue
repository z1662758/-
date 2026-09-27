<template>
  <div class="modeling-setup mid-stage-bg">
    <MidStagePageHeader title="建模设定" :icon="Cpu">
      <template #center>
        <span class="ms-context">
          <b>{{ userGoalText }}</b>
        </span>
      </template>
      <template #right>
        <div class="ms-header-stats">
          <article v-for="item in heroStats" :key="item.label" class="ms-header-stat">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>
        <el-button size="small" @click="goDuringEntry">
          <el-icon><ChatDotRound /></el-icon>
          <span>回到对话入口</span>
        </el-button>
      </template>
    </MidStagePageHeader>

    <!-- 参考 MACE Agent 工作室的三栏布局：左侧 Agent 列表 / 中间角色卡 / 右侧环境配置 -->
    <div class="ms-studio">
      <aside class="ms-left glass-panel">
        <MidStagePanelHeader title="Agent 列表" description="按供应链层级分组" :count="totalAgentCount" />
        <div class="ms-search">
          <el-input v-model="searchKeyword" size="small" clearable placeholder="搜索 Agent 名称" :prefix-icon="Search" />
        </div>
        <el-scrollbar class="ms-left-scroll">
          <el-collapse v-model="openGroups" class="ms-groups">
            <el-collapse-item v-for="group in filteredGroups" :key="group.tier" :name="group.tier">
              <template #title>
                <div class="ms-group-title">
                  <i class="ms-tier-dot" :class="group.tier"></i>
                  <span>{{ group.label }}</span>
                  <el-tag size="small" effect="plain" round>{{ group.members.length }}</el-tag>
                </div>
              </template>
              <button
                v-for="member in group.members"
                :key="member.key"
                type="button"
                class="ms-agent-item"
                :class="{ active: member.key === selectedKey }"
                @click="selectMember(member)"
              >
                <span class="ms-agent-icon" :class="group.tier">
                  <el-icon><component :is="group.icon" /></el-icon>
                </span>
                <span class="ms-agent-info">
                  <b>{{ member.name }}</b>
                  <small>{{ member.note }}</small>
                </span>
                <span class="ms-agent-arrow">›</span>
              </button>
            </el-collapse-item>
          </el-collapse>
          <el-empty v-if="!filteredGroups.length" description="没有匹配的 Agent，请调整搜索内容" :image-size="48" />
        </el-scrollbar>
        <div class="ms-left-foot">
          <div class="ms-foot-title">建模范围</div>
          <p class="ms-note">供给方提供可用量与报价，制造方负责采购和库存；运输与需求节点表示年度环境和业务关系。</p>
        </div>
      </aside>

      <main class="ms-center" :class="{ 'is-role': modelingView === 'role' }">
        <nav class="ms-view-tabs" aria-label="建模视图">
          <button :class="{ active: modelingView === 'graph' }" :aria-pressed="modelingView === 'graph'" @click="modelingView = 'graph'">关系总览</button>
          <button :class="{ active: modelingView === 'role' }" :aria-pressed="modelingView === 'role'" @click="modelingView = 'role'">角色设定与行为</button>
          <span>{{ totalAgentCount }} 个实体已纳入建模</span>
        </nav>
        <UraniumModelingTopology v-if="modelingView === 'graph'" :groups="agentGroups" :selected-tier="selectedMember?.tier" @select="selectGroup" />
        <section v-if="modelingView === 'role'" class="ms-hero glass-panel">
          <div class="ms-hero-main">
            <span class="ms-hero-icon" :class="selectedRole.tier">
              <el-icon><component :is="tierIcon(selectedRole.tier)" /></el-icon>
            </span>
            <div class="ms-hero-copy">
              <p class="analysis-hero-eyebrow">{{ selectedRole.label }}</p>
              <h2>{{ selectedRole.displayName }}</h2>
              <div class="ms-hero-tags">
                <span class="ms-tag method">{{ selectedRole.modelingMethod }}</span>

                <span class="ms-tag">{{ selectedRole.camp }}</span>
                <span class="ms-tag">{{ selectedGroup?.members.length || 0 }} 个{{ selectedRole.countHint }}</span>
              </div>
            </div>
          </div>
          <p class="ms-hero-goal">{{ selectedRole.role.goal || '该层级为规则驱动实体，不参与目标博弈。' }}</p>
        </section>

        <section v-if="modelingView === 'role'" class="ms-role glass-panel">
          <el-collapse v-model="openSections" class="ms-collapse">
            <el-collapse-item name="role" title="角色设定">
              <dl class="ms-role-list">
                <div v-if="selectedRole.role.identity"><dt>身份与背景</dt><dd>{{ selectedRole.role.identity }}</dd></div>
                <div v-if="selectedRole.role.institutional_context"><dt>制度背景</dt><dd>{{ selectedRole.role.institutional_context }}</dd></div>
                <div v-if="selectedRole.role.constraints?.length">
                  <dt>行为底线</dt>
                  <dd>
                    <ul class="ms-bullets">
                      <li v-for="item in selectedRole.role.constraints" :key="item">{{ item }}</li>
                    </ul>
                  </dd>
                </div>
              </dl>
              <dl v-if="selectedRole.facts.length" class="ms-facts">
                <div v-for="fact in selectedRole.facts" :key="fact.label">
                  <dt>{{ fact.label }}</dt>
                  <dd>{{ fact.type === 'risk' ? formatRisk(fact.value) : fact.value }}</dd>
                </div>
              </dl>
            </el-collapse-item>

            <el-collapse-item name="posture" title="决策姿态">
              <div class="ms-posture-grid">
                <div><span>决策风格</span><b>{{ selectedRole.decision_posture.style || '—' }}</b></div>
                <div><span>风险偏好</span><b>{{ selectedRole.decision_posture.risk_appetite || '—' }}</b></div>
              </div>
              <div class="ms-two-col">
                <div v-if="selectedRole.decision_posture.information_priority?.length" class="ms-posture-block">
                  <span>关注信息优先级</span>
                  <ol>
                    <li v-for="item in selectedRole.decision_posture.information_priority" :key="item">{{ item }}</li>
                  </ol>
                </div>
                <div v-if="selectedRole.decision_posture.typical_actions?.length" class="ms-posture-block">
                  <span>典型行动</span>
                  <div class="ms-chip-row">
                    <span v-for="item in selectedRole.decision_posture.typical_actions" :key="item" class="ms-chip">{{ item }}</span>
                  </div>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item name="attributes" title="属性范围">
              <div v-if="selectedRole.attributes.length" class="ms-attr-grid">
                <div v-for="attr in selectedRole.attributes" :key="attr.key" class="ms-attr-card">
                  <div class="ms-attr-head">
                    <span>{{ attr.label }}<small v-if="attr.unit"> · {{ attr.unit }}</small></span>
                    <b>{{ formatRange(attr) }}</b>
                  </div>
                  <div class="ms-attr-bar"><i :style="attrBarStyle(attr)"></i></div>
                </div>
              </div>
              <el-empty v-else description="该层级未声明属性范围" :image-size="48" />
              <div v-for="group in selectedRole.enums" :key="group.label" class="ms-attr-enum">
                <span>{{ group.label }}</span>
                <div class="ms-chip-row">
                  <span v-for="value in group.values" :key="value" class="ms-chip">{{ value }}</span>
                </div>
              </div>
              <div v-if="selectedRole.preferenceWeights?.length" class="ms-weights">
                <span class="ms-weights-title">供给方评分权重</span>
                <div v-for="item in selectedRole.preferenceWeights" :key="item.key" class="ms-weight-row">
                  <span>{{ item.label }}</span>
                  <div class="ms-weight-track"><i :style="{ width: `${item.weight * 100 * 2.5}%` }"></i></div>
                  <b>{{ (item.weight * 100).toFixed(0) }}%</b>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item name="cognition" title="决策过程">
              <div class="ms-ooda-strip">
                <template v-for="(stage, index) in oodaStages" :key="stage.key">
                  <span class="ms-ooda-stage" :style="{ '--stage-color': stage.color }">
                    <b>{{ stage.label }}</b>
                    <small>{{ stage.zh }}</small>
                  </span>
                  <i v-if="index < oodaStages.length - 1" class="ms-ooda-arrow">→</i>
                </template>
              </div>
              <dl class="ms-ooda-detail">
                <div v-for="stage in oodaStages" :key="stage.key">
                  <dt><i :style="{ background: stage.color }"></i>{{ stage.zh }}</dt>
                  <dd>{{ (selectedRole.cognition[stage.key] || []).join('、') || '—' }}</dd>
                </div>
              </dl>
              <p class="ms-note">按年度观察价格与事件，评估供给条件，完成采购与库存更新，再根据结果调整策略。</p>
            </el-collapse-item>

            <el-collapse-item name="relations" title="关联关系">
              <ul v-if="relatedEdges.length" class="ms-edge-list">
                <li v-for="edge in relatedEdges" :key="`${edge.source}-${edge.target}`">
                  <b>{{ edge.sourceName }}</b>
                  <span class="ms-edge-rel">{{ edge.relationship }}</span>
                  <b>{{ edge.targetName }}</b>
                </li>
              </ul>
              <el-empty v-else description="该层级暂无关联关系" :image-size="48" />
              <p class="ms-note">完整实体图与实例参数在下一步「实体建模」中查看。</p>
            </el-collapse-item>
          </el-collapse>
        </section>
      </main>

      <aside class="ms-right glass-panel">
        <nav class="ms-inspector-tabs" aria-label="建模属性面板">
          <button :aria-pressed="inspectorView === 'agent'" :class="{ active: inspectorView === 'agent' }" @click="inspectorView = 'agent'">Agent 属性</button>
          <button :aria-pressed="inspectorView === 'environment'" :class="{ active: inspectorView === 'environment' }" @click="inspectorView = 'environment'">推演设置<span v-if="draftDirty"> •</span></button>
          <button :aria-pressed="inspectorView === 'events'" :class="{ active: inspectorView === 'events' }" @click="inspectorView = 'events'">事件</button>
        </nav>
        <el-scrollbar v-if="inspectorView === 'agent'" class="ms-right-scroll">
          <section class="ms-env-section ms-inspector-role">
            <span class="ms-inspector-kicker">{{ selectedRole.label }}</span>
            <h3>{{ selectedRole.displayName }}</h3>
            <p>{{ selectedRole.role.identity }}</p>
            <dl class="ms-rule-list">
              <div><dt>建模方式</dt><dd>{{ selectedRole.modelingMethod }}</dd></div>
              <div><dt>分组规模</dt><dd>{{ selectedGroup?.members.length || 0 }} 个实体</dd></div>
              <div><dt>决策风格</dt><dd>{{ selectedRole.decision_posture.style || '按规则执行' }}</dd></div>
            </dl>
          </section>
          <section class="ms-env-section">
            <div class="ms-env-title">关键属性</div>
            <dl class="ms-rule-list">
              <div v-for="attr in selectedRole.attributes" :key="attr.key"><dt>{{ attr.label }}</dt><dd>{{ formatRange(attr) }} {{ attr.unit || '' }}</dd></div>
            </dl>
          </section>
          <section class="ms-env-section">
            <div class="ms-env-title">决策闭环</div>
            <div v-for="stage in oodaStages" :key="stage.key" class="ms-inspector-stage">
              <b :style="{ color: stage.color }">{{ stage.zh }}</b>
              <span>{{ (selectedRole.cognition[stage.key] || []).join('、') || '依照环境规则更新' }}</span>
            </div>
            <el-button size="small" text type="primary" @click="modelingView = 'role'">查看完整角色设定 →</el-button>
          </section>
        </el-scrollbar>
        <template v-else-if="inspectorView === 'environment'">
        <MidStagePanelHeader title="推演设置" description="设置本次实验的时间、规模与评估规则" />
        <el-scrollbar class="ms-right-scroll">
          <section class="ms-env-section">
            <div class="ms-env-title"><el-icon><Calendar /></el-icon><span>推演时段与规模</span></div>
            <p class="ms-window-note">按年度推演。常规前瞻为 2024–2028 年，历史复现为 1997–2024 年，极端冲击为 2027–2029 年。</p>
            <div class="ms-form-grid">
              <label>
                <span>起始年份</span>
                <el-input-number v-model="draftForm.start_year" :min="1997" :max="2035" :step="1" size="small" controls-position="right" />
              </label>
              <label>
                <span>结束年份</span>
                <el-input-number v-model="draftForm.end_year" :min="draftForm.start_year" :max="2040" :step="1" size="small" controls-position="right" />
              </label>
              <label>
                <span>迭代轮数</span>
                <el-input-number v-model="draftForm.optimization_iterations" :min="1" :max="planner.maxIterations" :step="1" size="small" controls-position="right" />
              </label>
              <label>
                <span>事件强度倍率</span>
                <el-input-number v-model="draftForm.event_severity_multiplier" :min="0.1" :max="2" :step="0.1" :precision="1" size="small" controls-position="right" />
              </label>
            </div>
            <div class="ms-form-actions">
              <el-button size="small" text @click="resetDraft">恢复默认</el-button>
              <el-button size="small" type="primary" plain :disabled="!draftDirty" @click="saveDraft">保存基线</el-button>
            </div>
          </section>

          <section class="ms-env-section">
            <div class="ms-env-title"><el-icon><Aim /></el-icon><span>时间与评估口径</span></div>
            <dl class="ms-rule-list">
              <div v-for="rule in convergenceRules" :key="rule.label">
                <dt>{{ rule.label }}</dt>
                <dd>{{ rule.value }}</dd>
              </div>
            </dl>
            <div class="ms-weights compact">
              <span class="ms-weights-title">综合评分权重</span>
              <div v-for="item in observerWeights" :key="item.key" class="ms-weight-row">
                <span>{{ item.label }}</span>
                <div class="ms-weight-track"><i :style="{ width: `${item.weight * 100 * 2.5}%` }"></i></div>
                <b>{{ (item.weight * 100).toFixed(0) }}%</b>
              </div>
            </div>
            <div class="ms-chip-row ms-param-space">
              <span class="ms-weights-title">可调整策略</span>
              <span v-for="key in planner.parameterSpace" :key="key" class="ms-chip mono">{{ key }}</span>
            </div>
          </section>


        </el-scrollbar>
        </template>
        <template v-else>
          <MidStagePanelHeader title="年度事件" description="浅色条目不在本次推演时段内" :count="eventCount" />
          <el-scrollbar class="ms-right-scroll">
          <section class="ms-env-section">
            <div class="ms-env-title"><el-icon><Bell /></el-icon><span>年度事件</span><small>{{ eventCount }} 条在推演时段内</small></div>
            <ul class="ms-event-list">
              <li v-for="row in eventRows" :key="row.year" :class="{ muted: !row.inWindow }">
                <strong>{{ row.year }}</strong>
                <div>
                  <span v-for="event in row.events" :key="event">{{ event }}</span>
                </div>
              </li>
            </ul>
          </section>
          </el-scrollbar>
        </template>
      </aside>
    </div>

    <footer class="ms-footer">
      <span>{{ draftDirty ? '参数有修改，进入下一步时保存' : '确认角色与环境参数后，进入想定生成' }}</span>
      <div class="ms-footer-actions">
      <el-button @click="goDuringEntry">返回对话</el-button>
      <el-button class="workbench-next-button" type="primary" size="large" @click="goNext">
        <span class="next-text">{{ nextButtonText }}</span>
        <el-icon class="next-icon"><ArrowRight /></el-icon>
      </el-button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { formatUraniumEvent } from '@/utils/uraniumScene'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Aim, ArrowRight, Bell, Box, Calendar, ChatDotRound, Cpu, Guide, OfficeBuilding, Search, Sell } from '@element-plus/icons-vue'
import MidStagePanelHeader from './components/shared/MidStagePanelHeader.vue'
import MidStagePageHeader from './components/shared/MidStagePageHeader.vue'
import UraniumModelingTopology from './components/simulation/UraniumModelingTopology.vue'
import './components/shared/midStage.css'
import { useScnetScenarioStore } from '@/stores/scnet/useScenarioStore'
import { useUraniumDuringStore } from '@/stores/scnet/useUraniumDuringStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { validateUraniumModelingDraft } from '@/utils/uraniumModeling'
import { URANIUM_REFERENCE_GRAPH } from '@/views/SCnet/mock/agentGraphMock'
import {
  URANIUM_BASE_YEAR_ROWS,
  URANIUM_MANUFACTURER_ACTORS,
  URANIUM_SUPPLIER_ACTORS
} from '@/views/SCnet/mock/uraniumDemoLab'
import {
  URANIUM_AGENT_ROLE_LIBRARY,
  URANIUM_OBSERVER_WEIGHTS,
  URANIUM_OODA_STAGES,
  URANIUM_PLANNER,
  resolveUraniumAgentRole
} from '@/views/SCnet/mock/uraniumAgentRoleLibrary'

defineOptions({ name: 'ModelingSetupUranium' })

const route = useRoute()
const router = useRouter()
const scenarioStore = useScnetScenarioStore()
const uraniumStore = useUraniumDuringStore()
const snapshotStore = useAnalysisSnapshotStore()

// 后端 configs/uranium_agent_config.yaml 中的实体容量（entity_types.count）
const TIER_CAPACITY = Object.freeze({ supply: 16, manufacturing: 5 })
const TIER_ICONS = Object.freeze({ supply: Box, transport: Guide, manufacturing: OfficeBuilding, sales: Sell })
const tierIcon = (tier) => TIER_ICONS[tier] || OfficeBuilding

const planner = URANIUM_PLANNER
const oodaStages = URANIUM_OODA_STAGES
const observerWeights = URANIUM_OBSERVER_WEIGHTS
const modelingView = ref('graph')
const inspectorView = ref('environment')

// ---------- 会话上下文 ----------
const userGoalText = computed(() => {
  const goal = String(scenarioStore.scenarioUserGoal || '').trim()
  return goal ? `本次需求：${goal}` : '尚未提交事中需求'
})
const hasSessionState = computed(() => (
  !!scenarioStore.currentSessionId
  || !!scenarioStore.scenarioApiResult
  || !!snapshotStore.activeSnapshotId
))
const isFresh = computed(() => route.query.fresh === '1')
const nextButtonText = computed(() => (
  isFresh.value || hasSessionState.value ? '下一步：想定生成' : '去对话入口提交需求'
))

// ---------- Agent 列表（按层级分组，成员与实验运行数据同源） ----------
const referenceAgents = URANIUM_REFERENCE_GRAPH.agents || []
const transportAgents = referenceAgents.filter((item) => item.category === 'transport')
const demandAgents = referenceAgents.filter((item) => item.category === 'sales')

function member(tier, id, name, note) {
  return { key: `${tier}:${id}`, tier, id, name, note }
}

const agentGroups = computed(() => [
  {
    tier: 'supply',
    label: URANIUM_AGENT_ROLE_LIBRARY.supply.label,
    icon: TIER_ICONS.supply,
    capacity: TIER_CAPACITY.supply,
    members: URANIUM_SUPPLIER_ACTORS.map((item) => member('supply', item.id, item.name, `${item.country} · ${item.mining_method}`))
  },
  {
    tier: 'transport',
    label: URANIUM_AGENT_ROLE_LIBRARY.transport.label,
    icon: TIER_ICONS.transport,
    capacity: 0,
    members: [
      ...transportAgents.map((item) => member('transport', item.id, item.name, item.description)),
      ...URANIUM_SUPPLIER_ACTORS
        .filter((item) => item.route_type === 'land_route')
        .map((item) => member('transport', `route-${item.id}`, item.reference_route_name, item.reference_path))
    ]
  },
  {
    tier: 'manufacturing',
    label: URANIUM_AGENT_ROLE_LIBRARY.manufacturing.label,
    icon: TIER_ICONS.manufacturing,
    capacity: TIER_CAPACITY.manufacturing,
    members: URANIUM_MANUFACTURER_ACTORS.map((item) => member('manufacturing', item.id, item.name, `${item.city_cluster} · ${item.port_name}`))
  },
  {
    tier: 'sales',
    label: URANIUM_AGENT_ROLE_LIBRARY.sales.label,
    icon: TIER_ICONS.sales,
    capacity: 0,
    members: demandAgents.map((item) => member('sales', item.id, item.name, item.description))
  }
])

const searchKeyword = ref('')
const filteredGroups = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return agentGroups.value
  return agentGroups.value
    .map((group) => ({ ...group, members: group.members.filter((item) => item.name.toLowerCase().includes(kw)) }))
    .filter((group) => group.members.length)
})
const openGroups = ref(['supply', 'transport', 'manufacturing', 'sales'])
const totalAgentCount = computed(() => agentGroups.value.reduce((sum, group) => sum + group.members.length, 0))

const selectedKey = ref('')
const selectedMember = computed(() => (
  agentGroups.value.flatMap((group) => group.members).find((item) => item.key === selectedKey.value)
  || agentGroups.value[0]?.members[0]
  || null
))
const selectedGroup = computed(() => agentGroups.value.find((group) => group.tier === selectedMember.value?.tier) || null)
const selectedRole = computed(() => resolveUraniumAgentRole({
  id: selectedMember.value?.id,
  name: selectedMember.value?.name,
  category: selectedMember.value?.tier
}))
function selectMember(item) {
  selectedKey.value = item.key
  inspectorView.value = 'agent'
}
function selectGroup(tier) {
  const group = agentGroups.value.find(item => item.tier === tier)
  if (group?.members.length) selectMember(group.members[0])
}

const openSections = ref(['role'])

// ---------- 属性条 / 格式化 ----------
const formatRisk = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(3) : '—')
const formatRange = (attr) => {
  const [min, max] = attr.range || []
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '—'
  const fmtNum = (n) => (attr.type === 'float' ? n.toFixed(2) : n.toLocaleString('zh-CN'))
  return `${fmtNum(min)} – ${fmtNum(max)}`
}
// 属性条只做相对示意：范围落在 [0, 上界 × 1.2] 的位置
const attrBarStyle = (attr) => {
  const [min, max] = attr.range || [0, 0]
  const scaleMax = attr.type === 'float' && max <= 1 ? 1 : max * 1.2
  const left = scaleMax > 0 ? Math.max(0, (min / scaleMax) * 100) : 0
  const width = scaleMax > 0 ? Math.max(4, ((max - min) / scaleMax) * 100) : 0
  return { left: `${left.toFixed(1)}%`, width: `${Math.min(100 - left, width).toFixed(1)}%` }
}

// ---------- 关联关系（参考骨架中涉及所选层级的边） ----------
const agentById = new Map(referenceAgents.map((item) => [item.id, item]))
const relatedEdges = computed(() => (URANIUM_REFERENCE_GRAPH.relationship_net || [])
  .filter((edge) => agentById.get(edge.source)?.category === selectedRole.value.tier || agentById.get(edge.target)?.category === selectedRole.value.tier)
  .map((edge) => ({
    ...edge,
    sourceName: agentById.get(edge.source)?.name || edge.source,
    targetName: agentById.get(edge.target)?.name || edge.target
  })))
const relationEdgeCount = (URANIUM_REFERENCE_GRAPH.relationship_net || []).length

// ---------- 环境配置（与 during store draft 同步） ----------
const draftForm = reactive({
  start_year: 2024,
  end_year: 2028,
  optimization_iterations: 1,
  event_severity_multiplier: 1
})

function syncFormFromDraft() {
  const draft = uraniumStore.draft || {}
  draftForm.start_year = Number(draft.start_year) || 2024
  draftForm.end_year = Number(draft.end_year) || 2028
  draftForm.optimization_iterations = Number(draft.optimization_iterations) || 1
  draftForm.event_severity_multiplier = Number(draft.event_severity_multiplier) || 1
}

const draftDirty = computed(() => {
  const draft = uraniumStore.draft || {}
  return (
    Number(draft.start_year) !== draftForm.start_year
    || Number(draft.end_year) !== draftForm.end_year
    || Number(draft.optimization_iterations) !== draftForm.optimization_iterations
    || Number(draft.event_severity_multiplier) !== draftForm.event_severity_multiplier
  )
})

function saveDraft() {
  const error = validateUraniumModelingDraft(draftForm, planner.maxIterations)
  if (error) {
    ElMessage.warning(error)
    return false
  }
  uraniumStore.patchDraft({ ...draftForm })
  ElMessage.success('建模基线已保存，启动实验时生效')
  return true
}

function resetDraft() {
  uraniumStore.resetDraft()
  syncFormFromDraft()
}

watch(() => uraniumStore.draft, syncFormFromDraft, { deep: true })

const convergenceRules = computed(() => [
  { label: '推演时间步长', value: '1 季度 / 1 半年度（核燃料调运与换料大修周期）' },
  { label: '历史校准基准', value: planner.calibrationWindow },
  { label: '收敛判定准则', value: 'Monte-Carlo 随机采样 1000 次 · 95% 置信区间' },
  { label: '多目标优化导向', value: '帕累托最优前沿解（极小化保供敞口 & 平抑完全成本）' },
  { label: '决策约束边界', value: '商业安全库存 >= 180 天 · 阿拉山口 <= 1,200 tU/月' }
])

// ---------- 事件库 ----------
const eventRows = computed(() => URANIUM_BASE_YEAR_ROWS.map((row) => ({
  year: row.year,
  events: (row.active_events || []).map(formatUraniumEvent),
  inWindow: row.year >= draftForm.start_year && row.year <= draftForm.end_year
})))
const eventCount = computed(() => eventRows.value.filter((row) => row.inWindow).reduce((sum, row) => sum + row.events.length, 0))

// ---------- 顶部统计 ----------
const heroStats = computed(() => [
  { label: 'Agent', value: String(totalAgentCount.value) },
  { label: '关系', value: String(relationEdgeCount) },
  { label: '事件', value: String(eventCount.value) },
  { label: '推演时段', value: `${draftForm.start_year}–${draftForm.end_year}` }
])

// ---------- 导航 ----------
function goNext() {
  // 下一步使用屏幕上确认的参数，避免未点击「保存」就丢失配置。
  if (draftDirty.value && !saveDraft()) return
  const query = { scenario: 'uranium' }
  if (isFresh.value) {
    query.fresh = '1'
    router.push({ path: SCNET_ROUTES.scenarioAnalysis, query })
    return
  }
  if (hasSessionState.value) {
    router.push({ path: SCNET_ROUTES.scenarioAnalysis, query })
    return
  }
  router.push(SCNET_ROUTES.duringEntry)
}

function goDuringEntry() {
  router.push(SCNET_ROUTES.duringEntry)
}

onMounted(() => {
  syncFormFromDraft()
  selectedKey.value = agentGroups.value[0]?.members[0]?.key || ''
})
</script>

<style scoped>
.ms-window-note { margin: 0 0 12px; color: #64748b; font-size: 12px; line-height: 1.7; }
.ms-view-tabs, .ms-inspector-tabs { display: flex; flex-shrink: 0; align-items: center; gap: 4px; padding: 4px; background: #fff; border: 1px solid #e2e8f0; border-radius: 9px; }
.ms-view-tabs button, .ms-inspector-tabs button { padding: 8px 12px; border: 0; border-radius: 6px; background: transparent; color: #64748b; cursor: pointer; font-size: 12px; }
.ms-view-tabs button.active, .ms-inspector-tabs button.active { color: #2563eb; background: #eff6ff; font-weight: 600; }
.ms-view-tabs > span { margin-left: auto; margin-right: 8px; color: #94a3b8; font-size: 11px; }
.ms-inspector-tabs { border: 0; border-bottom: 1px solid #e2e8f0; border-radius: 0; }
.ms-inspector-tabs button { flex: 1; }
.ms-inspector-role h3 { margin: 8px 0; font-size: 17px; color: #1e293b; }
.ms-inspector-role p { font-size: 12px; color: #64748b; line-height: 1.8; }
.ms-inspector-kicker { color: #2563eb; font-size: 11px; }
.ms-inspector-stage { display: grid; grid-template-columns: 32px 1fr; gap: 10px; margin-bottom: 12px; font-size: 12px; line-height: 1.7; }
.ms-inspector-stage span { color: #64748b; }
.modeling-setup {
  container: modeling / inline-size;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px 8px 0;
  box-sizing: border-box;
  overflow: hidden;
}

.ms-context b {
  font-size: var(--mid-fs-body);
  font-weight: 600;
  color: var(--mid-text-body);
  max-width: 460px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.ms-header-stats {
  display: flex;
  gap: 6px;
  margin-right: 6px;
}
.ms-header-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--mid-border-soft);
  background: rgba(255, 255, 255, 0.7);
}
.ms-header-stat span { color: var(--mid-text-muted); font-size: var(--mid-fs-micro); }
.ms-header-stat strong { color: var(--mid-text-strong); font-size: var(--mid-fs-strong); font-weight: 700; }

/* 三栏 */
.ms-studio {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(190px, 18%) minmax(0, 1fr) minmax(250px, 23%);
  gap: 10px;
  grid-template-rows: minmax(0, 1fr);
}
.ms-left,
.ms-right {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.ms-center {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.ms-center.is-role { overflow-y: auto; }
.ms-center > .model-topology { min-height: 0; }
.ms-view-tabs { flex-wrap: wrap; }
.ms-view-tabs > span { display: none; }
.ms-level-details { margin-top: 8px; font-size: 11px; color: #64748b; }
.ms-level-details summary { cursor: pointer; }
.ms-left-foot, .ms-panel-head, .ms-search { flex-shrink: 0; }
.ms-context { min-width: 0; }
.ms-context b { max-width: 100%; }
.ms-header-stats { flex-wrap: wrap; }
.ms-footer { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 10px 64px 10px 12px; background: #fff; border-top: 1px solid #e2e8f0; }
.ms-footer > span { color: #64748b; font-size: 12px; }
.ms-footer-actions { display: flex; align-items: center; gap: 8px; }

.ms-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px 8px;
}
.ms-panel-head strong {
  display: block;
  font-size: var(--mid-fs-title);
  color: var(--mid-text-strong);
}
.ms-panel-head span {
  display: block;
  margin-top: 2px;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
}
.ms-count {
  min-width: 28px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  padding: 0 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: var(--mid-fs-label);
  font-weight: 800;
}
.ms-search { padding: 0 14px 8px; }
.ms-left-scroll { flex: 1; min-height: 0; padding: 0 8px; }

.ms-groups { border-top: none; border-bottom: none; }
.ms-groups :deep(.el-collapse-item__header) {
  height: 36px;
  line-height: 36px;
  padding: 0 6px;
  font-size: var(--mid-fs-label);
  border-bottom-color: #eef2f7;
}
.ms-groups :deep(.el-collapse-item__wrap) { border-bottom: none; }
.ms-groups :deep(.el-collapse-item__content) { padding: 4px 0 8px; }
.ms-group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  font-weight: 700;
  color: var(--mid-text-strong);
}
.ms-group-title small {
  margin-left: auto;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  font-weight: 400;
}
.ms-tier-dot { width: 8px; height: 8px; border-radius: 2px; background: #94a3b8; }
.ms-tier-dot.supply { background: #6366f1; }
.ms-tier-dot.transport { background: #0891b2; }
.ms-tier-dot.manufacturing { background: #f97316; }
.ms-tier-dot.sales { background: #ec4899; }

.ms-agent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  margin-bottom: 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease;
}
.ms-agent-item:hover { background: #f1f5f9; }
.ms-agent-item.active { background: #eff6ff; border-color: #bfdbfe; }
.ms-agent-icon {
  flex: 0 0 26px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: #fff;
  background: #94a3b8;
  font-size: 13px;
}
.ms-agent-icon.supply, .ms-hero-icon.supply { background: #6366f1; }
.ms-agent-icon.transport, .ms-hero-icon.transport { background: #0891b2; }
.ms-agent-icon.manufacturing, .ms-hero-icon.manufacturing { background: #f97316; }
.ms-agent-icon.sales, .ms-hero-icon.sales { background: #ec4899; }
.ms-agent-info { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.ms-agent-info b {
  font-size: var(--mid-fs-label);
  color: var(--mid-text-strong);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ms-agent-info small {
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ms-agent-arrow { color: #cbd5e1; font-size: 14px; }

.ms-left-foot {
  padding: 10px 14px 12px;
  border-top: 1px solid #eef2f7;
}
.ms-foot-title {
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: var(--mid-text-muted);
  margin-bottom: 6px;
}
.ms-level-bar {
  display: flex;
  gap: 2px;
  height: 22px;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.ms-level-segment { display: flex; align-items: center; justify-content: center; min-width: 0; }
.ms-level-segment em {
  font-style: normal;
  font-size: var(--mid-fs-micro);
  font-weight: 800;
  color: #fff;
  white-space: nowrap;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.18);
}
.ms-level-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ms-level-list li { display: flex; gap: 6px; align-items: flex-start; }
.ms-level-list i { flex: 0 0 8px; width: 8px; height: 8px; margin-top: 3px; border-radius: 2px; }
.ms-level-list span { font-size: var(--mid-fs-micro); color: var(--mid-text-muted); line-height: 1.5; }
.ms-level-list b { display: block; color: var(--mid-text-strong); }

/* 中间：角色卡 */
.ms-hero {
  padding: 12px 14px;
}
.ms-hero-main { display: flex; gap: 12px; align-items: center; }
.ms-hero-icon {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #fff;
  background: #94a3b8;
  font-size: 22px;
}
.ms-hero-copy { min-width: 0; }
.ms-hero-copy h2 {
  margin: 2px 0 6px;
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: var(--mid-text-strong);
}
.ms-hero-tags, .ms-chip-row { display: flex; flex-wrap: wrap; gap: 4px; }
.ms-tag, .ms-chip {
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: var(--mid-fs-micro);
  color: #475569;
}
.ms-tag.method { color: #1d4ed8; background: #eff6ff; border-color: #c7d7f5; font-weight: 700; }
.ms-tag.mono, .ms-chip.mono { font-family: var(--mid-font-mono); }
.ms-hero-goal {
  margin: 10px 0 0;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
  font-size: var(--mid-fs-body);
  line-height: var(--mid-lh-body);
  color: var(--mid-text-body);
}

.ms-role { padding: 4px 14px 10px; }
.ms-collapse { border-top: none; border-bottom: none; }
.ms-collapse :deep(.el-collapse-item__header) {
  height: 38px;
  line-height: 38px;
  font-size: var(--mid-fs-strong);
  font-weight: 700;
  color: var(--mid-text-strong);
  border-bottom-color: #eef2f7;
}
.ms-collapse :deep(.el-collapse-item__wrap) { border-bottom-color: #eef2f7; }
.ms-collapse :deep(.el-collapse-item__content) { padding: 8px 2px 14px; }

.ms-role-list, .ms-ooda-detail { margin: 0; display: flex; flex-direction: column; gap: 8px; }
.ms-role-list dt, .ms-facts dt, .ms-posture-block > span, .ms-attr-enum > span, .ms-weights-title {
  display: block;
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: var(--mid-text-muted);
}
.ms-role-list dd {
  margin: 2px 0 0;
  font-size: var(--mid-fs-body);
  line-height: var(--mid-lh-body);
  color: var(--mid-text-body);
}
.ms-bullets { margin: 0; padding-left: 16px; }
.ms-bullets li { margin: 1px 0; }
.ms-facts {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px dashed #e2e8f0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.ms-facts > div { padding: 6px 8px; border-radius: 6px; background: #f8fafc; }
.ms-facts dd {
  margin: 2px 0 0;
  font-size: var(--mid-fs-label);
  color: var(--mid-text-strong);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ms-posture-grid, .ms-two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.ms-two-col { margin-top: 10px; }
.ms-posture-grid > div { padding: 8px 10px; border-radius: 8px; background: #f8fafc; }
.ms-posture-grid span { display: block; font-size: var(--mid-fs-micro); color: var(--mid-text-muted); font-weight: 700; }
.ms-posture-grid b { display: block; margin-top: 2px; font-size: var(--mid-fs-label); color: var(--mid-text-strong); }
.ms-posture-block ol {
  margin: 4px 0 0;
  padding-left: 16px;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  color: var(--mid-text-body);
}
.ms-posture-block .ms-chip-row { margin-top: 4px; }

.ms-attr-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.ms-attr-card { padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; }
.ms-attr-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: var(--mid-fs-label);
  color: var(--mid-text-body);
}
.ms-attr-head small { color: var(--mid-text-muted); font-size: var(--mid-fs-micro); }
.ms-attr-head b { font-family: var(--mid-font-mono); font-size: var(--mid-fs-label); color: var(--mid-text-strong); white-space: nowrap; }
.ms-attr-bar { position: relative; height: 6px; margin-top: 6px; border-radius: 4px; background: #edf2f7; overflow: hidden; }
.ms-attr-bar i { position: absolute; top: 0; bottom: 0; border-radius: 4px; background: linear-gradient(90deg, #86b6ef, #2a78d6); }
.ms-attr-enum { margin-top: 10px; }
.ms-attr-enum .ms-chip-row { margin-top: 4px; }

.ms-weights { margin-top: 12px; }
.ms-weights.compact { margin-top: 10px; }
.ms-weight-row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-body);
}
.ms-weight-track { height: 6px; border-radius: 4px; background: #edf2f7; overflow: hidden; }
.ms-weight-track i { display: block; height: 100%; border-radius: 4px; background: #2a78d6; }
.ms-weight-row b { text-align: right; font-family: var(--mid-font-mono); color: var(--mid-text-strong); }
.ms-param-space { margin-top: 10px; align-items: center; }
.ms-param-space .ms-weights-title { width: 100%; }

.ms-ooda-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  background: #f8fafc;
}
.ms-ooda-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  border-top: 3px solid var(--stage-color, #2a78d6);
  background: #fff;
}
.ms-ooda-stage b { font-size: var(--mid-fs-label); color: var(--mid-text-strong); }
.ms-ooda-stage small { font-size: var(--mid-fs-micro); color: var(--mid-text-muted); }
.ms-ooda-arrow { color: #a8b5c4; font-style: normal; }
.ms-ooda-detail { margin-top: 10px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.ms-ooda-detail > div { padding: 6px 8px; border-radius: 6px; background: #f8fafc; }
.ms-ooda-detail dt { display: inline-flex; align-items: center; gap: 5px; font-size: var(--mid-fs-micro); font-weight: 700; color: var(--mid-text-body); }
.ms-ooda-detail dt i { width: 8px; height: 8px; border-radius: 2px; }
.ms-ooda-detail dd { margin: 2px 0 0; font-size: var(--mid-fs-label); color: var(--mid-text-body); line-height: 1.5; }
.ms-note { margin: 10px 0 0; font-size: var(--mid-fs-micro); color: var(--mid-text-muted); line-height: 1.5; }

.ms-edge-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.ms-edge-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: var(--mid-fs-label);
}
.ms-edge-list b { color: var(--mid-text-strong); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ms-edge-list b:last-child { text-align: right; }
.ms-edge-rel {
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid #c7d7f5;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  white-space: nowrap;
}

/* 右侧：环境配置 */
.ms-right-scroll { flex: 1; min-height: 0; }
.ms-env-section { padding: 6px 14px 12px; border-top: 1px solid #eef2f7; }
.ms-env-section:first-child { border-top: none; }
.ms-env-section:last-child { padding-bottom: 72px; }
.ms-env-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 8px;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--mid-text-strong);
}
.ms-env-title .el-icon { color: var(--mid-info); }
.ms-env-title small { margin-left: auto; font-size: var(--mid-fs-micro); color: var(--mid-text-muted); font-weight: 400; }
.ms-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 10px; }
.ms-form-grid label { display: flex; flex-direction: column; gap: 4px; }
.ms-form-grid label > span { font-size: var(--mid-fs-micro); font-weight: 700; color: var(--mid-text-muted); }
.ms-form-grid :deep(.el-input-number) { width: 100%; }
.ms-form-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
.ms-rule-list { margin: 0; display: flex; flex-direction: column; gap: 5px; }
.ms-rule-list > div { display: flex; justify-content: space-between; gap: 8px; padding: 5px 8px; border-radius: 6px; background: #f8fafc; }
.ms-rule-list dt { font-size: var(--mid-fs-micro); color: var(--mid-text-muted); font-weight: 700; }
.ms-rule-list dd { margin: 0; font-size: var(--mid-fs-label); color: var(--mid-text-strong); text-align: right; }
.ms-event-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.ms-event-list li {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 8px;
  align-items: flex-start;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
}
.ms-event-list li.muted { opacity: 0.45; }
.ms-event-list strong { font-family: var(--mid-font-mono); font-size: var(--mid-fs-label); color: var(--mid-text-strong); }
.ms-event-list li > div { display: flex; flex-wrap: wrap; gap: 4px; }
.ms-event-list li > div span {
  padding: 1px 7px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e2e8f0;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-body);
}

/* 右下角「下一步」（参考 MACE workbench-next-fab），避开布局层右下角的对话切换按钮 */
.workbench-next-fab { position: fixed; right: 84px; bottom: 28px; z-index: 1200; }
.workbench-next-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 26px;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.22);
}
.workbench-next-button .next-text { font-size: 13px; font-weight: 700; }
.workbench-next-button .next-icon { font-size: 16px; }

@container modeling (max-width: 1150px) {
  .ms-header-stats { display: none; }
}
@container modeling (max-width: 960px) {
  .ms-studio { overflow-y: auto; grid-template-columns: 210px minmax(0, 1fr); grid-template-rows: 500px minmax(360px, auto); align-content: start; }
  .ms-right { grid-column: 1 / -1; min-height: 360px; max-height: 560px; }
  .ms-footer > span { display: none; }
  .ms-footer { justify-content: flex-end; }
}
@container modeling (max-width: 640px) {
  .ms-studio { grid-template-columns: minmax(0, 1fr); grid-template-rows: 280px 480px minmax(360px, auto); }
  .ms-right { grid-column: auto; }
  .ms-left { max-height: 280px; }
  .ms-attr-grid, .ms-posture-grid, .ms-two-col, .ms-ooda-detail { grid-template-columns: 1fr; }
  .ms-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ms-footer { padding-right: 54px; }
}
</style>
