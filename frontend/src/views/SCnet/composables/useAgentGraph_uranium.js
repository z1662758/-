import { computed, ref } from 'vue'
import { MarkerType } from '@vue-flow/core'
import { resolveTier, TIER_LABELS, TIER_ORDER } from './scnetCatalogAdapter_uranium'

/**
 * 仿真工作室画布状态机：把供应链实体 + relationship_net 渲染为 VueFlow 节点/边。
 *
 * 与后端「制造 / 供应 / 销售」三级架构对齐：
 *   - 节点按 resolveTier(agent) 归入 供应 / 制造 / 销售 三层，自上而下竖向分层
 *   - relationship_net 为空时按层级自动合成 供应 → 制造 → 销售 流向边
 */

// 相邻层级合成边的关系文案
const TIER_FLOW_LABELS = {
  'supply>transport': '资源外运',
  'transport>manufacturing': '加工输送',
  'supply>manufacturing': '原料供应',
  'manufacturing>sales': '产品交付',
  'supply>sales': '直供',
  'transport>sales': '终端分发'
}

/**
 * 按三级层级分层 + 同层等距排布。
 * @param {Array} agents - 实体列表（带 id/name/category）
 * @returns {Map<string, {x:number,y:number}>} agentId -> position
 */
function layoutByTier(agents) {
  const layout = { startX: 120, startY: 60, layerHeight: 200, itemSpacingX: 260 }
  const positions = new Map()

  // 按 TIER_ORDER 分桶（未知层级落到 other，已在 TIER_ORDER 末尾）
  const buckets = new Map()
  for (const tier of TIER_ORDER) buckets.set(tier, [])
  for (const agent of agents) {
    const tier = resolveTier(agent)
    if (!buckets.has(tier)) buckets.set(tier, [])
    buckets.get(tier).push(agent)
  }

  // 过滤空层后逐层落点
  const orderedTiers = TIER_ORDER.filter(k => buckets.get(k)?.length)
  orderedTiers.forEach((tierKey, layerIndex) => {
    const layerAgents = buckets.get(tierKey)
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

/**
 * relationship_net 为空时，按三级层级合成「供应 → 制造 → 销售」流向边。
 */
function buildTierFlowEdges(agents, edgeStyle, markerEnd) {
  const byTier = new Map()
  for (const a of agents) {
    const t = resolveTier(a)
    if (!byTier.has(t)) byTier.set(t, [])
    byTier.get(t).push(a)
  }
  const presentTiers = TIER_ORDER.filter(t => byTier.get(t)?.length)
  const edges = []
  for (let i = 0; i < presentTiers.length - 1; i++) {
    const upper = byTier.get(presentTiers[i])
    const lower = byTier.get(presentTiers[i + 1])
    const label = TIER_FLOW_LABELS[`${presentTiers[i]}>${presentTiers[i + 1]}`] || '供应链流向'
    for (const u of upper) {
      for (const l of lower) {
        edges.push({
          id: `flow_${u.id}_${l.id}`,
          source: u.id,
          target: l.id,
          label,
          labelStyle: { fontSize: 11, fill: '#0f172a', fontWeight: 600 },
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
          style: edgeStyle,
          markerEnd
        })
      }
    }
  }
  return edges
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

  const categoryLabelMap = TIER_LABELS

  const groupedAgents = computed(() => {
    const list = agentList.value
    const filtered = searchKeyword.value
      ? list.filter(a =>
          a.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
          a.id.toLowerCase().includes(searchKeyword.value.toLowerCase())
        )
      : list

    return filtered.reduce((res, item) => {
      const k = resolveTier(item)
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

    const positions = layoutByTier(safeAgents)
    const idSet = new Set(safeAgents.map(a => a.id))
    const nameToId = new Map(safeAgents.map(a => [a.name, a.id]))

    nodes.value = safeAgents.map((agent) => {
      const tier = resolveTier(agent)
      return {
        id: agent.id,
        type: 'CardNode',
        position: positions.get(agent.id) || { x: 0, y: 0 },
        data: { ...agent, category: tier, tier }
      }
    })

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

    // 后端未提供关系网（如参数目录的三级实体）时，按层级合成 供应→制造→销售 流向边
    if (edges.value.length === 0 && safeAgents.length > 1) {
      edges.value = buildTierFlowEdges(safeAgents, edgeStyle, markerEnd)
    }
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
