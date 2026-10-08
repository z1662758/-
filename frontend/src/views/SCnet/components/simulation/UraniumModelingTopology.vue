<template>
  <section class="model-topology" aria-label="Agent 建模关系图">
    <div class="topology-toolbar">
      <div><strong>天然铀供应链调度关系图</strong><span>{{ total }} 个实体 · 4 个分组</span></div>
      <div class="topology-actions">
        <button :class="{ active: direction === 'LR' }" @click="setDirection('LR')">横向</button>
        <button :class="{ active: direction === 'TB' }" @click="setDirection('TB')">纵向</button>
        <button @click="fitView({ padding: 0.2, duration: 250 })">适应画布</button>
      </div>
    </div>
    <div class="topology-boundary-alert">
      <span>推演边界声明：聚焦「天然铀原料 ➔ 转化入库/多基地组件加工（北方包头/南方沿海）➔ 机组装料保供」完整调度链条，涵盖两用物项 Class 7 危运合规与战略储备平抑借调。</span>
    </div>
    <VueFlow :nodes="nodes" :edges="edges" :nodes-draggable="true" :nodes-connectable="false" :min-zoom="0.35" :max-zoom="1.6" fit-view-on-init @node-click="selectNode" class="topology-canvas">
      <Background :gap="18" :size="1" pattern-color="#ccd9e8" />
      <Controls :show-interactive="false" />
      <template #node-agentGroup="{ data }">
        <button type="button" class="topology-node" :class="{ selected: selectedTier === data.tier }" :style="{ '--tier-color': data.color }" @keydown.enter.stop="$emit('select', data.tier)" @keydown.space.prevent.stop="$emit('select', data.tier)">
          <Handle type="target" :position="direction === 'LR' ? Position.Left : Position.Top" />
          <div class="node-head">
            <span class="node-icon"><el-icon><component :is="data.icon" /></el-icon></span>
            <span>{{ data.label }}</span>
          </div>
          <div class="node-status-pill" :class="data.badgeType">{{ data.statusBadge }}</div>
          <div class="node-count"><b>{{ data.count }}</b><span>个实体</span><em>{{ data.method }}</em></div>
          <div class="node-members">{{ data.members }}</div>
          <div class="node-foot">{{ data.purpose }}<span>查看 →</span></div>
          <Handle type="source" :position="direction === 'LR' ? Position.Right : Position.Bottom" />
        </button>
      </template>
    </VueFlow>
    <p class="topology-caption">点击分组查看角色与属性；拖动节点调整布局，滚轮缩放画布。</p>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { VueFlow, Handle, Position, MarkerType, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import { URANIUM_REFERENCE_GRAPH } from '../../mock/agentGraphMock'

const props = defineProps({ groups: { type: Array, required: true }, selectedTier: { type: String, default: '' } })
const emit = defineEmits(['select'])
const direction = ref('LR')
const { fitView, dimensions } = useVueFlow()
const meta = {
  supply: { color: '#2563eb', method: 'OODA', purpose: '报价、配额与硫酸约束', statusBadge: '地浸硫酸制约 0.85 · 长协锁定1,600tU', badgeType: 'warning' },
  transport: { color: '#d97706', method: '规则驱动', purpose: '中哈铁路与远洋海运调度', statusBadge: '阿拉山口负荷率94%预警 · Class 7海运', badgeType: 'danger' },
  manufacturing: { color: '#059669', method: 'OODA', purpose: '转化衔接与南北多基地协同', statusBadge: '北方基地14周预警 · 南方基地36周安全', badgeType: 'primary' },
  sales: { color: '#7c3aed', method: '需求驱动', purpose: '机组大修与停堆风控反馈', statusBadge: '基线11,500tU · 增量+2,300tU', badgeType: 'info' },
}

const total = computed(() => props.groups.reduce((sum, group) => sum + group.members.length, 0))
const nodes = computed(() => props.groups.map((group, index) => ({
  id: group.tier, type: 'agentGroup',
  position: direction.value === 'LR'
    ? { x: index * 280, y: 70 }
    : { x: 260, y: index * 210 },
  data: { ...group, ...meta[group.tier], count: group.members.length, members: group.members.slice(0, 2).map(item => item.name).join(' / ') },
})))
const agentTiers = new Map(URANIUM_REFERENCE_GRAPH.agents.map(agent => [agent.id, agent.category]))
const groupRelations = [...new Map(URANIUM_REFERENCE_GRAPH.relationship_net.map(edge => {
  const source = agentTiers.get(edge.source)
  const target = agentTiers.get(edge.target)
  return [`${source}-${target}`, [source, target, edge.relationship]]
})).values()]
const edges = computed(() => groupRelations.map(([source, target, label]) => ({
  id: `${source}-${target}`, source, target, label, type: 'smoothstep',
  animated: source === 'sales', markerEnd: MarkerType.ArrowClosed,
  style: { stroke: source === 'sales' ? '#94a3b8' : '#6b93c4', strokeWidth: 1.5 },
  labelStyle: { fill: '#64748b', fontSize: 11 }, labelBgStyle: { fill: '#f8fafc' },
})))
function selectNode({ node }) { emit('select', node.id) }
async function setDirection(value) {
  direction.value = value
  await nextTick()
  fitView({ padding: 0.2, duration: 250 })
}
watch(() => [dimensions.value.width, dimensions.value.height], async () => {
  await nextTick()
  fitView({ padding: 0.16, duration: 0 })
})
</script>

<style scoped>
.model-topology { display: flex; flex-direction: column; min-height: 390px; flex: 1; border: 1px solid #dce5ee; border-radius: 12px; overflow: hidden; background: #f6f9fd; }
.topology-toolbar { display: flex; justify-content: space-between; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; background: #fff; }
.topology-toolbar strong { display: block; color: #1e293b; font-size: 13px; }
.topology-toolbar span { color: #94a3b8; font-size: 11px; }
.topology-actions { display: flex; gap: 4px; }
.topology-actions button { border: 1px solid #dce5ee; border-radius: 5px; background: #fff; padding: 4px 8px; color: #64748b; cursor: pointer; font-size: 11px; }
.topology-actions button.active { color: #2563eb; background: #eff6ff; border-color: #93c5fd; }
.topology-canvas { flex: 1; min-height: 0; }
.topology-node { display: block; width: 228px; text-align: left; padding: 0; background: #fff; border: 1px solid #d7e2ee; border-top: 3px solid var(--tier-color); border-radius: 10px; box-shadow: 0 4px 14px #18304b0a; cursor: pointer; font-family: inherit; }
.topology-node.selected { border-color: var(--tier-color); box-shadow: 0 0 0 3px #3b82f617, 0 8px 20px #18304b12; }
.node-head { display: flex; align-items: center; gap: 8px; padding: 12px 12px 6px; font-size: 13px; font-weight: 600; color: #1e293b; }
.node-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; background: #f1f5f9; color: var(--tier-color); font-size: 17px; }
.node-count { display: flex; align-items: baseline; gap: 5px; padding: 0 12px 8px; }
.node-count b { font-size: 28px; color: #0f172a; font-weight: 650; }
.node-count span { font-size: 11px; color: #94a3b8; }
.node-count em { margin-left: auto; color: var(--tier-color); background: #f8fafc; font-size: 10px; font-style: normal; padding: 3px 5px; border-radius: 4px; }
.node-members { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #64748b; padding: 0 12px 12px; font-size: 11px; }
.node-foot { display: flex; justify-content: space-between; border-top: 1px solid #edf2f7; padding: 8px 12px; color: #64748b; font-size: 10px; }
.node-foot span { color: var(--tier-color); }
.topology-boundary-alert { padding: 6px 14px; background: #eff6ff; border-bottom: 1px solid #bfdbfe; color: #1e40af; font-size: 11px; line-height: 1.5; }
.node-status-pill { margin: 0 12px 6px; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 500; display: inline-block; }
.node-status-pill.warning { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
.node-status-pill.danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
.node-status-pill.primary { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.node-status-pill.info { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
.topology-caption { margin: 0; padding: 8px 12px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
</style>
