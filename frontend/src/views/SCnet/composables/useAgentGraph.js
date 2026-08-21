import { computed, ref } from 'vue'
import { MarkerType } from '@vue-flow/core'

/**
 * 仿真工作室画布状态机：把后端返回的 agents + relationship_net 动态渲染为 VueFlow 节点/边。
 *
 * 与参考项目 powerGame/AgentSimulationStudio.vue 的 applySimulationData / computePosition 思路对齐：
 *   - agents.map -> CardNode 节点
 *   - relationship_net.map -> 边，label = relationship 字段
 *   - 不再前端写死 manufacturer/factory/retailer 三节点 + 4 条固定边
 */

// 供应链层级——决定节点 Y 轴所在层；后端返回的 category 命中即按层布局，未知 category 落到末尾
const SUPPLY_CHAIN_LAYER_ORDER = ['supplier', 'manufacturer', 'factory', 'retailer', 'enterprise', 'facility']

const CATEGORY_LABELS = {
  supplier: '供应商',
  manufacturer: '制造总厂',
  factory: '工厂',
  retailer: '销售商',
  enterprise: '企业实体',
  facility: '生产设施'
}

function normalizeCategoryKey(rawCategory) {
  const k = String(rawCategory || '').toLowerCase().trim()
  if (!k) return 'enterprise'
  if (k.includes('supplier') || k.includes('供应')) return 'supplier'
  if (k.includes('manufactur') || k.includes('总厂')) return 'manufacturer'
  if (k === 'factory' || k.includes('工厂') || k.includes('plant')) return 'factory'
  if (k.includes('retail') || k.includes('销售') || k.includes('seller')) return 'retailer'
  if (k.includes('facility') || k.includes('设施')) return 'facility'
  return k
}

/**
 * 按 category 分层 + 同层等距排布。
 * @param {Array} agents - 后端 agents（已带 category）
 * @returns {Map<string, {x:number,y:number}>} agentId -> position
 */
function layoutByCategory(agents) {
  const layout = { startX: 120, startY: 60, layerHeight: 200, itemSpacingX: 260 }
  const positions = new Map()

  // 1. 按 SUPPLY_CHAIN_LAYER_ORDER 分桶；未知 category 追加到桶尾
  const buckets = new Map()
  for (const layer of SUPPLY_CHAIN_LAYER_ORDER) buckets.set(layer, [])
  const unknownLayers = []
  for (const agent of agents) {
    const cat = normalizeCategoryKey(agent?.category)
    if (buckets.has(cat)) {
      buckets.get(cat).push(agent)
    } else {
      if (!buckets.has(cat)) {
        buckets.set(cat, [])
        unknownLayers.push(cat)
      }
      buckets.get(cat).push(agent)
    }
  }

  // 2. 过滤空层后逐层落点
  const orderedLayers = [...SUPPLY_CHAIN_LAYER_ORDER, ...unknownLayers].filter(k => buckets.get(k)?.length)
  orderedLayers.forEach((layerKey, layerIndex) => {
    const layerAgents = buckets.get(layerKey)
    const count = layerAgents.length
    layerAgents.forEach((agent, indexInLayer) => {
      const xOffset = (indexInLayer - (count - 1) / 2) * layout.itemSpacingX
      positions.set(agent.id, {
        x: layout.startX + xOffset + (count > 1 ? layout.itemSpacingX : 0),
        y: layout.startY + layerIndex * layout.layerHeight
      })
    })
  })

  return positions
}

export function useAgentGraph(options) {
  const { agentList, onUpdateAgentMethod } = options

  const nodes = ref([])
  const edges = ref([])
  const searchKeyword = ref('')
  const selectedNode = ref(null)

  const methodDialogAgent = ref(null)
  const methodDialogVisible = ref(false)
  const methodDialogSelected = ref('')

  const categoryLabelMap = CATEGORY_LABELS

  const groupedAgents = computed(() => {
    const list = agentList.value
    const filtered = searchKeyword.value
      ? list.filter(a =>
          a.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
          a.id.toLowerCase().includes(searchKeyword.value.toLowerCase())
        )
      : list

    return filtered.reduce((res, item) => {
      const k = normalizeCategoryKey(item.category)
      if (!res[k]) res[k] = []
      res[k].push(item)
      return res
    }, {})
  })

  /**
   * 把后端 agents + relationship_net 渲染到画布。
   * @param {Array} agents
   * @param {Array} [relationshipNet=[]] - 后端返回的边数组
   */
  function buildNodesFromAgents(agents, relationshipNet = []) {
    const safeAgents = Array.isArray(agents) ? agents.filter(a => a && a.id) : []
    if (safeAgents.length === 0) {
      nodes.value = []
      edges.value = []
      return
    }

    const positions = layoutByCategory(safeAgents)
    const idSet = new Set(safeAgents.map(a => a.id))
    const nameToId = new Map(safeAgents.map(a => [a.name, a.id]))

    nodes.value = safeAgents.map((agent) => ({
      id: agent.id,
      type: 'CardNode',
      position: positions.get(agent.id) || { x: 0, y: 0 },
      data: { ...agent, category: normalizeCategoryKey(agent.category) }
    }))

    const edgeStyle = { stroke: '#2563eb', strokeWidth: 2 }
    const markerEnd = { type: MarkerType.ArrowClosed, color: '#2563eb' }

    const safeRelationshipNet = Array.isArray(relationshipNet) ? relationshipNet : []
    edges.value = safeRelationshipNet
      .map((rel, index) => {
        const sourceId = idSet.has(rel?.source) ? rel.source : nameToId.get(rel?.source)
        const targetId = idSet.has(rel?.target) ? rel.target : nameToId.get(rel?.target)
        if (!sourceId || !targetId) return null
        return {
          id: rel.id || `edge_${index}_${sourceId}_${targetId}`,
          source: sourceId,
          target: targetId,
          label: rel.relationship || rel.label || '',
          labelStyle: { fontSize: 11, fill: '#0f172a', fontWeight: 600 },
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
          style: edgeStyle,
          markerEnd,
          data: rel
        }
      })
      .filter(Boolean)
  }

  function locateAgent(nodeId) {
    selectedNode.value = nodes.value.find(n => n.id === nodeId)
  }

  function selectNode({ node }) {
    selectedNode.value = node
  }

  function openAgentMethodDialog(agent) {
    methodDialogAgent.value = agent
    methodDialogSelected.value = agent.selectedMethod || agent.availableMethods?.[0] || ''
    methodDialogVisible.value = true
  }

  function confirmMethodSelection() {
    if (!methodDialogAgent.value || !methodDialogSelected.value) {
      methodDialogVisible.value = false
      return
    }
    if (typeof onUpdateAgentMethod === 'function') {
      onUpdateAgentMethod(methodDialogAgent.value.id, methodDialogSelected.value)
    }
    methodDialogVisible.value = false
  }

  return {
    nodes,
    edges,
    searchKeyword,
    selectedNode,
    methodDialogAgent,
    methodDialogVisible,
    methodDialogSelected,
    categoryLabelMap,
    groupedAgents,
    buildNodesFromAgents,
    locateAgent,
    selectNode,
    openAgentMethodDialog,
    confirmMethodSelection
  }
}
