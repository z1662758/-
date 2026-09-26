<template>
  <section class="model-topology" aria-label="Agent 建模关系图">
    <div class="topology-toolbar">
      <div><strong>供应链 Agent 关系</strong><span>{{ total }} 个实体 · 4 个分组</span></div>
      <div class="topology-actions">
        <button :class="{ active: direction === 'LR' }" @click="setDirection('LR')">横向</button>
        <button :class="{ active: direction === 'TB' }" @click="setDirection('TB')">纵向</button>
        <button @click="fitView({ padding: 0.2, duration: 250 })">适应画布</button>
      </div>
    </div>
    <VueFlow :nodes="nodes" :edges="edges" :nodes-draggable="true" :nodes-connectable="false" :min-zoom="0.35" :max-zoom="1.6" fit-view-on-init @node-click="selectNode" class="topology-canvas">
      <Background :gap="18" :size="1" pattern-color="#ccd9e8" />
      <Controls :show-interactive="false" />
      <template #node-agentGroup="{ data }">
        <button type="button" class="topology-node" :class="{ selected: selectedTier === data.tier }" :style="{ '--tier-color': data.color }" @keydown.enter.stop="$emit('select', data.tier)" @keydown.space.prevent.stop="$emit('select', data.tier)">
          <Handle type="target" :position="direction === 'LR' ? Position.Left : Position.Top" />
          <div class="node-head"><span class="node-icon"><el-icon><component :is="data.icon" /></el-icon></span><span>{{ data.label }}</span></div>
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
  supply: { color: '#2563eb', method: 'OODA', purpose: '报价与产能分配' },
  transport: { color: '#d97706', method: '规则驱动', purpose: '运输与通道调度' },
  manufacturing: { color: '#059669', method: 'OODA', purpose: '采购与库存决策' },
  sales: { color: '#7c3aed', method: '需求驱动', purpose: '需求与消耗反馈' },
}
const total = computed(() => props.groups.reduce((sum, group) => sum + group.members.length, 0))
const nodes = computed(() => props.groups.map((group, index) => ({
  id: group.tier, type: 'agentGroup',
  position: direction.value === 'LR'
    ? { x: (index % 2) * 310, y: Math.floor(index / 2) * 235 }
    : { x: Math.floor(index / 2) * 310, y: (index % 2) * 235 },
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
.topology-caption { margin: 0; padding: 8px 12px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
</style>
