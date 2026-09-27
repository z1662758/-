<template>
  <div class="right-column">
    <div class="agent-studio-wrapper">
      <div class="right-inner-layout" :class="{ 'canvas-focused': canvasFocused }">
        <div v-show="!canvasFocused" class="sidebar left-sidebar">
          <MidStagePanelHeader title="Agent 列表" description="按供应链层级分组" :count="totalAgentCount" />
          <div class="search-box">
            <el-input v-model="searchKeywordProxy" placeholder="搜索 Agent 名称" :prefix-icon="Search" clearable size="small" />
          </div>
          <el-scrollbar class="sidebar-scroll">
            <div class="agent-list">
              <div class="agent-group" v-for="(group, key) in groupedAgents" :key="key">
                <div class="group-title">
                  <span><el-icon><Folder /></el-icon>{{ categoryLabelMap[key] || key }}</span>
                  <span class="group-count">{{ group.length }}</span>
                </div>
                <button
                  class="agent-item"
                  v-for="agent in group"
                  :key="agent.id"
                  :class="{ active: selectedNode?.id === agent.id }"
                  type="button"
                  @click="handleLocateAgent(agent.id)"
                  @dblclick.stop="!readOnly && $emit('open-agent-method-dialog', agent)"
                >
                  <div class="agent-icon" :class="agent.category">
                    <el-icon v-if="agent.category === 'supply'"><Box /></el-icon>
                    <el-icon v-else-if="agent.category === 'transport'"><Guide /></el-icon>
                    <el-icon v-else-if="agent.category === 'sales'"><Sell /></el-icon>
                    <el-icon v-else-if="agent.category === 'other'"><Grid /></el-icon>
                    <el-icon v-else><OfficeBuilding /></el-icon>
                  </div>
                  <div class="agent-info">
                    <div class="agent-name">{{ agent.name }}</div>
                    <div class="agent-category">
                      {{ categoryLabelMap[agent.category] || agent.category }}
                      <span v-if="agent.entityCount" class="entity-count">× {{ agent.entityCount }}</span>
                    </div>
                  </div>
                  <span class="agent-locate">›</span>
                </button>
              </div>
              <el-empty v-if="totalAgentCount === 0" description="暂无匹配 Agent" :image-size="70" />
            </div>
          </el-scrollbar>
        </div>

        <div class="right-content-area">
          <div class="canvas-area">
            <div class="canvas-toolbar">
              <div class="canvas-summary">
                <strong>关系总览</strong>
                <span>{{ nodesProxy.length }} 个 Agent</span>
                <span>{{ edgesProxy.length }} 条关系</span>
              </div>
              <div class="canvas-actions">
                <div class="canvas-legend">
                  <span v-for="item in visibleCategories" :key="item.key" class="legend-item">
                    <i :class="item.key"></i>{{ item.label }}
                  </span>
                </div>
                <el-button size="small" :aria-pressed="canvasFocused" @click="toggleCanvasFocus">{{ canvasFocused ? '显示目录与属性' : '专注关系图' }}</el-button>
                <el-button size="small" plain :icon="FullScreen" @click="fitCanvas">适配视图</el-button>
              </div>
            </div>
            <div class="canvas-stage">
              <VueFlow
                v-model:nodes="nodesProxy"
                v-model:edges="edgesProxy"
                style="width: 100%; height: 100%;"
                :fit-view-on-init="true"
                :nodes-draggable="!readOnly"
                :nodes-connectable="!readOnly"
                :edges-updatable="!readOnly"
                :min-zoom="0.2"
                :max-zoom="1.6"
                @node-click="payload => $emit('select-node', payload)"
              >
                <template #node-CardNode="nodeProps">
                  <div class="custom-node" :class="[nodeProps.data.category, { selected: nodeProps.selected }]">
                    <div class="node-header">
                      <div class="node-title">
                        {{ nodeProps.data.name }}
                        <span v-if="nodeProps.data.entityCount" class="entity-badge">× {{ nodeProps.data.entityCount }}</span>
                      </div>
                      <div class="node-tag">{{ categoryLabelMap[nodeProps.data.category] || nodeProps.data.category }}</div>
                    </div>
                    <div class="node-body">
                      <div class="node-meta">
                        <span class="node-method-tag" :class="nodeProps.data.category">{{ roleOf(nodeProps.data).modelingMethod }}</span>
                        <span class="node-model">{{ roleOf(nodeProps.data).decision_posture.style }}</span>
                      </div>
                      <div v-if="nodeProps.data.selectedMethod" class="node-method">方法：{{ nodeProps.data.selectedMethod }}</div>
                      <div v-else class="node-method muted">{{ roleOf(nodeProps.data).role.goal ? truncate(roleOf(nodeProps.data).role.goal, 26) : '点击查看 Agent 属性' }}</div>
                    </div>
                    <Handle id="t-top" type="target" :position="Position.Top" class="handle-top" />
                    <Handle id="s-bottom" type="source" :position="Position.Bottom" class="handle-bottom" />
                    <Handle id="t-left" type="target" :position="Position.Left" class="handle-left" />
                    <Handle id="t-right" type="target" :position="Position.Right" class="handle-right target-right" />
                    <Handle id="s-right" type="source" :position="Position.Right" class="handle-right source-right" />
                  </div>
                </template>
                <Background variant="dots" gap="20" color="#e5e7eb" />
                <Controls />
              </VueFlow>
              <div v-if="nodesProxy.length === 0" class="canvas-empty">
                <span>⌁</span>
                <strong>方案关系尚未生成</strong>
                <p>完成智能对话后，实体与关系将在这里展示</p>
              </div>
            </div>
          </div>

          <div v-show="!canvasFocused" class="properties-panel">
            <MidStagePanelHeader title="Agent 属性" :description="selectedNode ? selectedNode.data?.name : '选择目录或关系图中的 Agent'" />
            <el-scrollbar class="properties-scroll">
              <div v-if="!selectedNode" class="empty-tip">
                <div class="empty-tip-icon">◎</div>
                <strong>选择一个 Agent</strong>
                <span>{{ readOnly ? '点击左侧目录或画布节点，查看实体参数与说明' : '点击节点配置企业实体参数' }}</span>
              </div>
              <div v-else class="property-card">
                <div class="property-summary">
                  <div class="property-hero">
                    <div class="property-hero-icon" :class="selectedNode?.data?.category">
                      <el-icon><OfficeBuilding /></el-icon>
                    </div>
                    <div>
                      <strong>{{ selectedNode?.data?.name || selectedNode?.id }}</strong>
                      <span>{{ categoryLabelMap[selectedNode?.data?.category] || selectedNode?.data?.category || '未分类' }} · {{ selectedRole.label }}</span>
                    </div>
                  </div>
                  <div class="property-tag-row">
                    <span class="property-tag method">{{ selectedRole.modelingMethod }}</span>

                    <span class="property-tag">{{ selectedRole.camp }}</span>
                  </div>
                  <div class="property-summary-row">
                    <span>参数数量</span>
                    <strong>{{ getConfigurableParams(selectedNode.id).length }} 项</strong>
                  </div>
                  <div v-if="selectedNode?.data?.description" class="property-summary-copy">
                    {{ selectedNode.data.description }}
                  </div>
                  <div v-if="selectedNode?.data?.tags?.length" class="property-chip-row">
                    <span v-for="tag in selectedNode.data.tags" :key="tag" class="property-chip">{{ tag }}</span>
                  </div>
                </div>

                <!-- 参考 MACE Agent 工作室：角色设定 / 决策姿态 / 属性 / 参数 / 认知模型 分段折叠 -->
                <el-collapse v-model="activeSections" class="property-collapse">
                  <el-collapse-item name="role" title="角色设定">
                    <dl class="role-list">
                      <div v-if="selectedRole.role.identity"><dt>身份与背景</dt><dd>{{ selectedRole.role.identity }}</dd></div>
                      <div v-if="selectedRole.role.institutional_context"><dt>制度背景</dt><dd>{{ selectedRole.role.institutional_context }}</dd></div>
                      <div v-if="selectedRole.role.goal"><dt>核心目标</dt><dd>{{ selectedRole.role.goal }}</dd></div>
                      <div v-if="selectedRole.role.constraints?.length">
                        <dt>行为底线</dt>
                        <dd>
                          <ul class="role-bullets">
                            <li v-for="item in selectedRole.role.constraints" :key="item">{{ item }}</li>
                          </ul>
                        </dd>
                      </div>
                    </dl>
                    <dl v-if="selectedRole.facts.length" class="role-facts">
                      <div v-for="fact in selectedRole.facts" :key="fact.label">
                        <dt>{{ fact.label }}</dt>
                        <dd>{{ fact.type === 'risk' ? formatRisk(fact.value) : fact.value }}</dd>
                      </div>
                    </dl>
                  </el-collapse-item>

                  <el-collapse-item name="dispatchRules" title="应急调度分配规则引擎">
                    <div class="dispatch-engine-box">
                      <div class="dispatch-rule-item" :class="{ active: selectedDispatchRule === 'ruleA' }" @click="selectedDispatchRule = 'ruleA'">
                        <div class="rule-radio"><span class="radio-dot"></span></div>
                        <div class="rule-content">
                          <strong>规则 A：关键堆型换料截止期倒排优先（推荐）</strong>
                          <p>华龙一号首炉装料 > 商业大修换料 > 常规备料储备，优先向北方包头基地定向倾斜铁路配额。</p>
                        </div>
                      </div>
                      <div class="dispatch-rule-item" :class="{ active: selectedDispatchRule === 'ruleB' }" @click="selectedDispatchRule = 'ruleB'">
                        <div class="rule-radio"><span class="radio-dot"></span></div>
                        <div class="rule-content">
                          <strong>规则 B：全网核电机组停堆电量损失最小化</strong>
                          <p>按机组单日停机发电损失动态权衡，向满功率负荷机组集中调配天然铀原料。</p>
                        </div>
                      </div>
                      <div class="dispatch-rule-item" :class="{ active: selectedDispatchRule === 'ruleC' }" @click="selectedDispatchRule = 'ruleC'">
                        <div class="rule-radio"><span class="radio-dot"></span></div>
                        <div class="rule-content">
                          <strong>规则 C：各基地安全库存可用周数均衡平摊</strong>
                          <p>动态拉平北方基地（14周）与南方基地（36周）的库存水位，实施横向跨基地协同调拨。</p>
                        </div>
                      </div>
                    </div>
                    <div class="multi-base-status-board">
                      <span class="board-title">各基地库存与调剂运行状态</span>
                      <div class="base-status-row">
                        <div class="base-status-item">
                          <span>北方包头基地</span>
                          <strong class="warn">14 周 (预警)</strong>
                          <small>缺口约 1,380 tU · 中哈直达直供中</small>
                        </div>
                        <div class="base-status-item">
                          <span>南方沿海基地</span>
                          <strong class="safe">36 周 (安全)</strong>
                          <small>海运港口接卸 · 可调拨备用</small>
                        </div>
                        <div class="base-status-item">
                          <span>战略原料储备库</span>
                          <strong class="normal">2,800 tU (充足)</strong>
                          <small>应急借调限额 600 tU · 审批即发</small>
                        </div>
                      </div>
                    </div>
                  </el-collapse-item>

                  <el-collapse-item name="posture" title="决策姿态">
                    <div class="posture-grid">
                      <div><span>决策风格</span><b>{{ selectedRole.decision_posture.style || '—' }}</b></div>
                      <div><span>风险偏好</span><b>{{ selectedRole.decision_posture.risk_appetite || '—' }}</b></div>
                    </div>
                    <div v-if="selectedRole.decision_posture.information_priority?.length" class="posture-block">
                      <span>关注信息优先级</span>
                      <ol>
                        <li v-for="item in selectedRole.decision_posture.information_priority" :key="item">{{ item }}</li>
                      </ol>
                    </div>
                    <div v-if="selectedRole.decision_posture.typical_actions?.length" class="posture-block">
                      <span>典型行动</span>
                      <div class="property-chip-row">
                        <span v-for="item in selectedRole.decision_posture.typical_actions" :key="item" class="property-chip">{{ item }}</span>
                      </div>
                    </div>
                  </el-collapse-item>

                  <el-collapse-item name="attributes" title="属性范围">
                    <div v-if="selectedRole.attributes.length" class="attr-grid">
                      <div v-for="attr in selectedRole.attributes" :key="attr.key" class="attr-card">
                        <div class="attr-card-head">
                          <span>{{ attr.label }}<small v-if="attr.unit"> · {{ attr.unit }}</small></span>
                          <b>{{ formatRange(attr) }}</b>
                        </div>
                        <div class="attr-card-bar">
                          <i :style="attrBarStyle(attr)"></i>
                        </div>
                      </div>
                    </div>
                    <el-empty v-else description="该层级未声明属性范围" :image-size="48" />
                    <div v-for="group in selectedRole.enums" :key="group.label" class="attr-enum">
                      <span>{{ group.label }}</span>
                      <div class="property-chip-row">
                        <span v-for="value in group.values" :key="value" class="property-chip">{{ value }}</span>
                      </div>
                    </div>
                  </el-collapse-item>

                  <el-collapse-item name="params" :title="readOnly ? '实体参数（只读）' : '实体参数'">
                    <template v-if="getConfigurableParams(selectedNode.id).length > 0">
                      <el-form size="small" label-position="top" class="property-form">
                        <el-form-item
                          v-for="param in getConfigurableParams(selectedNode.id)"
                          :key="param.key"
                          :label="param.label"
                          class="property-form-item"
                        >
                          <template v-if="param.type === 'range'">
                            <div class="range-inputs">
                              <el-input-number
                                size="small"
                                :model-value="getParamValue(selectedNode.id, param.key, 0, param)"
                                :min="param.min"
                                :max="param.max"
                                :step="param.step"
                                controls-position="right"
                                class="range-input"
                                :disabled="readOnly"
                                @update:model-value="val => emitParamUpdate(selectedNode.id, param.key, 0, val, param)"
                              />
                              <span class="range-divider">至</span>
                              <el-input-number
                                size="small"
                                :model-value="getParamValue(selectedNode.id, param.key, 1, param)"
                                :min="param.min"
                                :max="param.max"
                                :step="param.step"
                                controls-position="right"
                                class="range-input"
                                :disabled="readOnly"
                                @update:model-value="val => emitParamUpdate(selectedNode.id, param.key, 1, val, param)"
                              />
                            </div>
                          </template>
                          <template v-else>
                            <el-input-number
                              size="small"
                              :model-value="getParamValue(selectedNode.id, param.key, null, param)"
                              :min="param.min"
                              :max="param.max"
                              :step="param.step"
                              controls-position="right"
                              class="number-input"
                              :disabled="readOnly"
                              @update:model-value="val => emitParamUpdate(selectedNode.id, param.key, null, val, param)"
                            />
                          </template>
                        </el-form-item>
                      </el-form>
                    </template>
                    <el-empty v-else description="该实体暂无可配置参数" :image-size="48" />
                  </el-collapse-item>

                  <el-collapse-item name="cognition" title="认知模型">
                    <div class="ooda-strip">
                      <template v-for="(stage, index) in oodaStages" :key="stage.key">
                        <span class="ooda-stage" :style="{ '--stage-color': stage.color }">
                          <b>{{ stage.label }}</b>
                          <small>{{ stage.zh }}</small>
                        </span>
                        <i v-if="index < oodaStages.length - 1" class="ooda-arrow">→</i>
                      </template>
                    </div>
                    <dl class="ooda-detail">
                      <div v-for="stage in oodaStages" :key="stage.key">
                        <dt><i :style="{ background: stage.color }"></i>{{ stage.zh }}</dt>
                        <dd>{{ (selectedRole.cognition[stage.key] || []).join('、') || '—' }}</dd>
                      </div>
                    </dl>
                    <p class="ooda-note">按年度读取价格、事件与库存，评估候选供应来源并调整采购策略。</p>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </el-scrollbar>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="methodDialogVisibleProxy"
      title="选择 Agent 能力方法"
      width="400px"
      @close="methodDialogVisibleProxy = false"
    >
      <div class="dialog-content" v-if="methodDialogAgent">
        <p>当前 Agent：<span style="color: #409EFF; font-weight: 600">{{ methodDialogAgent.name }}</span></p>
        <p class="method-dialog-hint">能力方法即该实体在仿真中的业务策略选项，将随队列参数提交。</p>
        <el-radio-group
          v-model="methodDialogSelectedProxy"
          style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;"
        >
          <el-radio
            v-for="method in methodDialogAgent.availableMethods"
            :key="method"
            :value="method"
          >{{ method }}</el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="methodDialogVisibleProxy = false">取消</el-button>
          <el-button type="primary" :disabled="!methodDialogSelectedProxy" @click="$emit('confirm-method-selection')">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import MidStagePanelHeader from '../shared/MidStagePanelHeader.vue'
import { computed, onMounted, onBeforeUnmount, nextTick, ref } from 'vue'
import { Search, Folder, OfficeBuilding, Grid, Box, Sell, Guide, FullScreen } from '@element-plus/icons-vue'
import { VueFlow, Handle, Position, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import { URANIUM_OODA_STAGES, resolveUraniumAgentRole } from '@/views/SCnet/mock/uraniumAgentRoleLibrary'

const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
  },
  edges: {
    type: Array,
    default: () => []
  },
  searchKeyword: {
    type: String,
    default: ''
  },
  groupedAgents: {
    type: Object,
    default: () => ({})
  },
  categoryLabelMap: {
    type: Object,
    default: () => ({})
  },
  selectedNode: {
    type: Object,
    default: null
  },
  getConfigurableParams: {
    type: Function,
    required: true
  },
  getParamValue: {
    type: Function,
    required: true
  },
  methodDialogVisible: {
    type: Boolean,
    default: false
  },
  methodDialogAgent: {
    type: Object,
    default: null
  },
  methodDialogSelected: {
    type: String,
    default: ''
  },
  readOnly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:nodes',
  'update:edges',
  'update:searchKeyword',
  'locate-agent',
  'open-agent-method-dialog',
  'select-node',
  'update-param-value',
  'update:methodDialogVisible',
  'update:methodDialogSelected',
  'confirm-method-selection'
])

const { fitView } = useVueFlow()
const canvasFocused = ref(false)
function toggleCanvasFocus() { canvasFocused.value = !canvasFocused.value; nextTick(fitCanvas) }
const totalAgentCount = computed(() => Object.values(props.groupedAgents || {}).reduce((sum, group) => sum + (group?.length || 0), 0))
const visibleCategories = computed(() => Object.entries(props.groupedAgents || {})
  .filter(([, group]) => Array.isArray(group) && group.length)
  .map(([key]) => ({ key, label: props.categoryLabelMap[key] || key })))

// ---------- 角色卡（参考 MACE AgentSpec） ----------
const oodaStages = URANIUM_OODA_STAGES
const activeSections = ref(['role', 'dispatchRules', 'params'])
const selectedDispatchRule = ref('ruleA')
const roleCache = new Map()
const roleOf = (agentLike) => {
  const key = `${agentLike?.id || ''}|${agentLike?.name || ''}|${agentLike?.category || ''}`
  if (!roleCache.has(key)) roleCache.set(key, resolveUraniumAgentRole(agentLike || {}))
  return roleCache.get(key)
}
const selectedRole = computed(() => roleOf(props.selectedNode?.data || {}))

const truncate = (text, max) => {
  const value = String(text || '')
  return value.length > max ? `${value.slice(0, max)}…` : value
}
const formatRisk = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(3) : '—')
const formatRange = (attr) => {
  const [min, max] = attr.range || []
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '—'
  const fmtNum = (n) => (attr.type === 'float' ? n.toFixed(2) : n.toLocaleString('zh-CN'))
  return `${fmtNum(min)} – ${fmtNum(max)}`
}
// 属性条：展示取值范围在 [0, 上界的 1.2 倍] 尺度上的位置，只做相对示意
const attrBarStyle = (attr) => {
  const [min, max] = attr.range || [0, 0]
  const scaleMax = attr.type === 'float' && max <= 1 ? 1 : max * 1.2
  const left = scaleMax > 0 ? Math.max(0, (min / scaleMax) * 100) : 0
  const width = scaleMax > 0 ? Math.max(4, ((max - min) / scaleMax) * 100) : 0
  return { left: `${left.toFixed(1)}%`, width: `${Math.min(100 - left, width).toFixed(1)}%` }
}

const nodesProxy = computed({
  get: () => props.nodes,
  set: (val) => emit('update:nodes', val)
})

const edgesProxy = computed({
  get: () => props.edges,
  set: (val) => emit('update:edges', val)
})

const searchKeywordProxy = computed({
  get: () => props.searchKeyword,
  set: (val) => emit('update:searchKeyword', val)
})

const methodDialogVisibleProxy = computed({
  get: () => props.methodDialogVisible,
  set: (val) => emit('update:methodDialogVisible', val)
})

const methodDialogSelectedProxy = computed({
  get: () => props.methodDialogSelected,
  set: (val) => emit('update:methodDialogSelected', val)
})

const handleLocateAgent = (nodeId) => {
  emit('locate-agent', nodeId)
  nextTick(() => {
    fitView({ nodes: [nodeId], padding: 0.3, maxZoom: 1, duration: 400 })
  })
}

const emitParamUpdate = (agentId, paramKey, index, val, param) => {
  if (props.readOnly) return
  emit('update-param-value', { agentId, paramKey, index, value: val, paramDef: param })
}

const handleResize = () => {
  fitView({ padding: 0.1 })
}

const fitCanvas = () => {
  fitView({ padding: 0.12, duration: 500 })
}

onMounted(() => {
  setTimeout(() => {
    fitView({ padding: 0.1, duration: 800 })
  }, 300)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.right-column {
  flex: 1;
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.agent-studio-wrapper {
  width: 100%;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.right-inner-layout {
  display: flex;
  width: 100%;
  height: 100%;
  gap: 12px;
  padding: 10px;
  background: #f0f9ff;
  box-sizing: border-box;
}

.sidebar.left-sidebar {
  width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  overflow: hidden;
}

.sidebar.left-sidebar .panel-header {
  padding: 12px 16px;
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-heading-copy { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.panel-heading-copy strong { color: #0f172a; font-size: 14px; }
.panel-heading-copy span { color: #94a3b8; font-size: 10px; font-weight: 500; }
.panel-count { min-width: 24px; height: 24px; padding: 0 6px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; background: #eff6ff; color: #2563eb; }
.panel-count,
.panel-header-hint {
  color: #64748b;
  font-size: 11px;
  font-weight: 500;
}

.sidebar.left-sidebar .left-sidebar-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.sidebar.left-sidebar :deep(.el-tabs__header) {
  margin: 0;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}
.sidebar.left-sidebar :deep(.el-tabs__nav-wrap)::after {
  display: none;
}
.sidebar.left-sidebar :deep(.el-tabs__item) {
  height: 42px;
  line-height: 42px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}
.sidebar.left-sidebar :deep(.el-tabs__item.is-active) {
  color: #1d4ed8;
}
.sidebar.left-sidebar :deep(.el-tabs__active-bar) {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  height: 3px;
}
.sidebar.left-sidebar :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.sidebar.left-sidebar :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar.left-sidebar .search-box {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #fff;
}

.enter-studio-btn {
  background: linear-gradient(135deg, #409EFF, #337ecc);
  border: none;
  font-size: 12px;
}

.sidebar-scroll {
  flex: 1;
  height: calc(100% - 96px);
  overflow-y: auto;
}

.agent-list {
  padding: 8px;
}

.agent-group {
  margin-bottom: 16px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-weight: 600;
  color: #334155;
  font-size: 14px;
  margin-bottom: 8px;
  background-color: #f1f5f9;
  border-radius: 6px;
}
.group-title > span:first-child { display: inline-flex; align-items: center; gap: 6px; }

.group-count {
  font-size: 12px;
  color: #64748b;
  font-weight: normal;
  margin-left: auto;
}

.agent-item {
  width: 100%;
  font-family: inherit;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #fff;
  border: 1px solid transparent;
  outline: none;
}
.agent-item:focus-visible { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.16); }
.agent-locate { color: #cbd5e1; font-size: 20px; line-height: 1; transition: transform 0.2s ease; }
.agent-item:hover .agent-locate { color: #0284c7; transform: translateX(2px); }
.agent-item.active .agent-locate { color: #fff; }

.agent-item:hover {
  background-color: #e0f2fe;
  border-color: #bae6fd;
}

.agent-item.active {
  background-color: #0ea5e9;
  color: #fff;
  border-color: #0284c7;
}

.agent-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.agent-icon.enterprise {
  background-color: #3b82f6;
}

.agent-icon.facility {
  background-color: #22c55e;
}

.agent-icon.supplier {
  background-color: #6366f1;
}

.agent-icon.manufacturer {
  background-color: #f97316;
}

.agent-icon.factory {
  background-color: #14b8a6;
}

.agent-icon.retailer {
  background-color: #ec4899;
}

/* 供应链三级配色 */
.agent-icon.supply {
  background-color: #6366f1;
}

.agent-icon.transport {
  background-color: #0891b2;
}

.agent-icon.manufacturing {
  background-color: #f97316;
}

.agent-icon.sales {
  background-color: #ec4899;
}

.agent-icon.other {
  background-color: #94a3b8;
}

.agent-info {
  flex: 1;
}

.agent-name {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 2px;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-item.active .agent-name {
  color: #fff;
}

.agent-category {
  font-size: 12px;
  color: #64748b;
}
.agent-info { min-width: 0; }

.entity-count {
  font-size: 11px;
  color: #409EFF;
  font-weight: 600;
  margin-left: 4px;
}

.agent-item.active .agent-category {
  color: #e0f2fe;
}

.right-content-area {
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 12px;
  height: 100%;
  min-width: 0;
}

.canvas-area {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 0;
  overflow: hidden;
}

.canvas-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #64748b;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  padding: 9px 10px 9px 12px;
}
.canvas-stage { flex: 1; min-height: 0; position: relative; background: linear-gradient(180deg, #fff, #f8fbff); }
.canvas-summary,
.canvas-actions,
.canvas-legend { display: flex; align-items: center; }
.canvas-summary { gap: 10px; font-size: 11px; white-space: nowrap; }
.canvas-summary strong { color: #0f172a; font-size: 13px; }
.canvas-summary span { padding-left: 10px; border-left: 1px solid #e2e8f0; }
.canvas-actions { gap: 12px; }
.canvas-legend { gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.legend-item { display: inline-flex; align-items: center; gap: 4px; color: #475569; font-size: 10px; white-space: nowrap; }
.legend-item i { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
.legend-item i.supply { background: #6366f1; }
.legend-item i.transport { background: #0891b2; }
.legend-item i.manufacturing { background: #f97316; }
.legend-item i.sales { background: #ec4899; }
.legend-item i.other { background: #94a3b8; }

.properties-panel {
  width: 320px;
  min-width: 320px;
  height: 100%;
  background: #fff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 10px;
  overflow: hidden;
}

.properties-panel .panel-header {
  padding: 8px 12px;
  font-weight: 600;
  color: #0ea5e9;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.properties-scroll { height: calc(100% - 44px); }

.custom-node {
  width: 200px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border: 2px solid transparent;
  transition: all 0.2s;
  overflow: hidden;
}
.custom-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 9px 24px rgba(15, 23, 42, 0.16);
}
.custom-node.selected {
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.16), 0 10px 26px rgba(15, 23, 42, 0.18);
}
.canvas-empty {
  position: absolute;
  inset: 50% auto auto 50%;
  z-index: 5;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  color: #94a3b8;
  text-align: center;
}
.canvas-empty > span { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 50%; background: #eff6ff; color: #3b82f6; font-size: 25px; }
.canvas-empty strong { color: #475569; font-size: 13px; }
.canvas-empty p { margin: 0; font-size: 11px; }

.custom-node.enterprise {
  border-color: #3b82f6;
}

.custom-node.facility {
  border-color: #22c55e;
}

.custom-node.supplier {
  border-color: #6366f1;
}

.custom-node.manufacturer {
  border-color: #f97316;
}

.custom-node.factory {
  border-color: #14b8a6;
}

.custom-node.retailer {
  border-color: #ec4899;
}

/* 供应链三级配色 */
.custom-node.supply {
  border-color: #6366f1;
}

.custom-node.transport {
  border-color: #0891b2;
}

.custom-node.manufacturing {
  border-color: #f97316;
}

.custom-node.sales {
  border-color: #ec4899;
}

.custom-node.other {
  border-color: #94a3b8;
}

.node-header {
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e5e7eb;
}

.node-title {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}

.entity-badge {
  display: inline-block;
  background: #409EFF;
  color: #fff;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 8px;
  margin-left: 4px;
  font-weight: 600;
  vertical-align: middle;
}

.node-tag {
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 4px;
  color: #fff;
  font-weight: 500;
}

.enterprise .node-tag { background: #3b82f6; }
.facility .node-tag { background: #22c55e; }
.supplier .node-tag { background: #6366f1; }
.manufacturer .node-tag { background: #f97316; }
.factory .node-tag { background: #14b8a6; }
.retailer .node-tag { background: #ec4899; }
/* 供应链三级配色 */
.supply .node-tag { background: #6366f1; }
.transport .node-tag { background: #0891b2; }
.manufacturing .node-tag { background: #f97316; }
.sales .node-tag { background: #ec4899; }
.other .node-tag { background: #94a3b8; }

.node-body {
  padding: 10px;
  font-size: 11px;
  color: #64748b;
}
.node-method.muted { color: #94a3b8; }

.handle-left, .handle-right, .handle-top, .handle-bottom {
  width: 8px;
  height: 8px;
  background: #0ea5e9;
  border: 2px solid #fff;
  border-radius: 50%;
}

.source-right {
  transform: translateX(2px);
}

.target-right {
  transform: translateX(-2px);
}

.property-card {
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.properties-panel :deep(.el-form-item__label) {
  padding-bottom: 4px;
  color: #475569;
  font-size: 11px;
  line-height: 1.4;
}
.properties-panel :deep(.el-input-number) { max-width: 100%; }
.properties-panel :deep(.el-input-number .el-input__wrapper) { box-shadow: 0 0 0 1px #dbeafe inset; }

.property-summary {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}
.property-hero {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}
.property-hero-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #64748b;
  color: #fff;
}
.property-hero-icon.supply { background: #6366f1; }
.property-hero-icon.transport { background: #0891b2; }
.property-hero-icon.manufacturing { background: #f97316; }
.property-hero-icon.sales { background: #ec4899; }
.property-hero > div:last-child { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.property-hero strong { color: #0f172a; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.property-hero span { color: #64748b; font-size: 11px; }

.property-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: #64748b;
}

.property-summary-row strong {
  color: #0f172a;
  font-size: 12px;
}

.property-summary-copy {
  padding: 8px 10px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
}

.property-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.property-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(8, 145, 178, 0.1);
  color: #0f766e;
  font-size: 11px;
}

.empty-tip {
  min-height: 180px;
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #94a3b8;
  text-align: center;
  font-size: 12px;
  line-height: 1.6;
}
.empty-tip-icon { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #eff6ff; color: #3b82f6; font-size: 24px; }
.empty-tip strong { color: #334155; font-size: 13px; }
.property-section-title { margin-bottom: 8px; color: #303133; font-size: 12px; font-weight: 600; }
.property-form { padding: 0 4px; }
.property-form-item { margin-bottom: 12px; }
.range-inputs { width: 100%; display: flex; align-items: center; gap: 6px; }
.range-input { flex: 1; min-width: 0; }
.range-divider { flex-shrink: 0; color: #909399; font-size: 11px; }
.number-input { width: 100%; }

.method-dialog-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.45;
}

.dialog-content {
  padding: 10px 0;
}

.dialog-footer {
  text-align: right;
}

@media (max-width: 1280px) {
  .properties-panel {
    width: 280px;
    min-width: 280px;
  }
}

@media (max-width: 1050px) {
  .right-inner-layout { flex-direction: column; }
  .sidebar.left-sidebar { width: 100%; height: 230px; }
  .agent-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .canvas-toolbar { align-items: flex-start; }
  .canvas-legend { display: none; }
}

/* ---------- 节点卡：建模方法与模型信息（参考 MACE CardNode） ---------- */
.node-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 4px;
}
.node-method-tag {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #c7d7f5;
}
.node-method-tag.supply { color: #4338ca; background: #eef2ff; border-color: #c7d2fe; }
.node-method-tag.transport { color: #0e7490; background: #ecfeff; border-color: #a5f3fc; }
.node-method-tag.manufacturing { color: #c2410c; background: #fff7ed; border-color: #fed7aa; }
.node-method-tag.sales { color: #be185d; background: #fdf2f8; border-color: #fbcfe8; }
.node-model {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--mid-font-mono, monospace);
  font-size: 10px;
  color: #64748b;
}

/* ---------- 属性面板：角色卡分段 ---------- */
.property-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0 8px;
}
.property-tag {
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 10px;
  color: #475569;
}
.property-tag.method { color: #1d4ed8; background: #eff6ff; border-color: #c7d7f5; font-weight: 700; }
.property-tag.mono { font-family: var(--mid-font-mono, monospace); }

.property-collapse { border-top: none; border-bottom: none; }
.property-collapse :deep(.el-collapse-item__header) {
  height: 34px;
  line-height: 34px;
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
  border-bottom-color: #eef2f7;
}
.property-collapse :deep(.el-collapse-item__wrap) { border-bottom-color: #eef2f7; }
.property-collapse :deep(.el-collapse-item__content) { padding: 8px 2px 12px; }

.role-list,
.role-facts,
.ooda-detail {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.role-list dt,
.role-facts dt,
.posture-block > span,
.attr-enum > span {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
}
.role-list dd {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: #334155;
}
.role-bullets {
  margin: 0;
  padding-left: 14px;
}
.role-bullets li { margin: 1px 0; }
.role-facts {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.role-facts > div {
  padding: 5px 7px;
  border-radius: 6px;
  background: #f8fafc;
}
.role-facts dd {
  margin: 1px 0 0;
  font-size: 11px;
  color: #0f172a;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

.posture-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.posture-grid > div {
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
}
.posture-grid span { display: block; font-size: 10px; color: #94a3b8; font-weight: 700; }
.posture-grid b { display: block; margin-top: 2px; font-size: 11px; color: #0f172a; }
.posture-block { margin-top: 8px; }
.posture-block ol {
  margin: 4px 0 0;
  padding-left: 16px;
  font-size: 11px;
  line-height: 1.6;
  color: #334155;
}

.attr-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.attr-card {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
}
.attr-card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: 11px;
  color: #334155;
}
.attr-card-head small { color: #94a3b8; font-size: 10px; }
.attr-card-head b {
  font-family: var(--mid-font-mono, monospace);
  font-size: 11px;
  color: #0f172a;
  white-space: nowrap;
}
.attr-card-bar {
  position: relative;
  height: 6px;
  margin-top: 5px;
  border-radius: 4px;
  background: #edf2f7;
  overflow: hidden;
}
.attr-card-bar i {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 4px;
  background: linear-gradient(90deg, #86b6ef, #2a78d6);
}
.attr-enum { margin-top: 10px; }

.ooda-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 6px;
  border-radius: 8px;
  background: #f8fafc;
}
.ooda-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px 4px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  border-top: 3px solid var(--stage-color, #2a78d6);
  background: #fff;
}
.ooda-stage b { font-size: 10px; color: #0f172a; }
.ooda-stage small { font-size: 9px; color: #94a3b8; }
.ooda-arrow { color: #a8b5c4; font-style: normal; font-size: 11px; }
.ooda-detail { margin-top: 8px; }
.ooda-detail dt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  color: #475569;
}
.ooda-detail dt i { width: 8px; height: 8px; border-radius: 2px; }
.ooda-detail dd { margin: 1px 0 0 13px; font-size: 11px; color: #334155; line-height: 1.5; }
.ooda-note { margin: 8px 0 0; font-size: 10px; color: #94a3b8; line-height: 1.5; }

/* 底部留白：避免角色卡最后一段被页面右下角「下一步」按钮遮挡 */
.properties-panel .property-card { padding-bottom: 72px; }

@media (max-width: 760px) {
  .right-content-area { flex-direction: column; }
  .properties-panel { width: 100%; min-width: 0; height: 280px; }
  .canvas-summary span { display: none; }
}

/* 应急调度分配规则引擎与多基地状态看板 */
.dispatch-engine-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 6px 0 12px;
}
.dispatch-rule-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;
}
.dispatch-rule-item:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.dispatch-rule-item.active {
  background: #eff6ff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}
.rule-radio {
  margin-top: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dispatch-rule-item.active .rule-radio {
  border-color: #3b82f6;
}
.dispatch-rule-item.active .radio-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3b82f6;
}
.rule-content strong {
  display: block;
  font-size: 11px;
  color: #1e293b;
  margin-bottom: 2px;
}
.rule-content p {
  margin: 0;
  font-size: 10px;
  color: #64748b;
  line-height: 1.4;
}
.multi-base-status-board {
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
}
.board-title {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}
.base-status-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.base-status-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  padding: 6px 8px;
}
.base-status-item span {
  display: block;
  font-size: 11px;
  color: #334155;
  font-weight: 500;
}
.base-status-item strong {
  display: inline-block;
  font-size: 12px;
  margin: 2px 0;
}
.base-status-item strong.warn {
  color: #b45309;
}
.base-status-item strong.safe {
  color: #15803d;
}
.base-status-item strong.normal {
  color: #0369a1;
}
.base-status-item small {
  display: block;
  font-size: 10px;
  color: #94a3b8;
}
</style>
