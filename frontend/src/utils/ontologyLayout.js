// 本体网络分层布局 + 边语义分类（合作 / 博弈对抗 / 中性）
// 供铀 / 汽车两个场景的本体网络图复用，把散乱的力导向图整理成
// 「核心实体在最上方、事件与指标逐层向下」的分带布局，并按边关系
// 用颜色 + 线型区分「合作」与「博弈/对抗」，让有用信息一眼可辨。

export const EDGE_COLORS = {
  cooperation: '#67C23A',   // 合作（供应/生产/运输等正向关系）
  confrontation: '#F56C6C', // 博弈/对抗（风险影响/政策监管等）
  neutral: '#c8cdd0',       // 中性 / 结构关系
}

export const EDGE_LABELS = {
  cooperation: '合作',
  confrontation: '博弈/对抗',
  neutral: '结构',
}

/**
 * 分层布局：按 nodeType 分到不同水平带（band），bandOrder 的第一个分组在最上方。
 * 返回以视图中心为原点的坐标（配合 ECharts graph `layout: 'none'` 使用，单位 px）。
 *
 * @param {Array} nodes 节点数组（含 nodeType）
 * @param {Array<Array<string>>} bandOrder 类型分组，从上到下
 * @param {number} W 视图宽度(px)
 * @param {number} H 视图高度(px)
 * @returns {Object} id -> { x, y }
 */
export function computeLayeredLayoutDetailed(nodes, bandOrder, W, H, bandGap = 26) {
  const bandIndex = {}
  bandOrder.forEach((types, i) => {
    for (const t of types) bandIndex[t] = i
  })
  const fallback = bandOrder.length

  // 按带分桶（未知类型放到最底带）
  const buckets = new Map()
  for (const n of nodes) {
    const t = n.nodeType || n.type || ''
    const b = bandIndex[t] ?? fallback
    if (!buckets.has(b)) buckets.set(b, [])
    buckets.get(b).push(n)
  }

  const bands = [...buckets.entries()].sort((a, b) => a[0] - b[0])
  const positions = {}
  const marginX = 56
  const marginY = 52
  // 带之间留出间距，避免上下层挤在一起
  const totalGap = bandGap * Math.max(bands.length - 1, 0)
  const usableH = Math.max(H - marginY * 2 - totalGap, 120)
  const bandH = usableH / Math.max(bands.length, 1)

  const bandRanges = []
  bands.forEach(([, arr], pos) => {
    const yTop = -H / 2 + marginY + (bandH + bandGap) * pos
    const yCenter = yTop + bandH / 2
    // 带内用网格排布，节点多时自动换行，避免挤成一团
    const cols = Math.max(1, Math.ceil(Math.sqrt(arr.length * 1.6)))
    const colW = (W - marginX * 2) / cols
    const rowH = 30
    const rows = Math.ceil(arr.length / cols)
    arr.forEach((n, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      positions[n.id] = {
        x: -W / 2 + marginX + colW * (col + 0.5),
        y: yCenter + (row - (rows - 1) / 2) * rowH,
      }
    })
    bandRanges.push({ index: pos, y0: yTop, y1: yTop + bandH, count: arr.length })
  })

  return { positions, bands: bandRanges }
}

export function computeLayeredLayout(nodes, bandOrder, W, H, bandGap = 26) {
  return computeLayeredLayoutDetailed(nodes, bandOrder, W, H, bandGap).positions
}

/**
 * 边语义分类。
 * @param {string} relation 关系名
 * @param {Set<string>} coop 合作关系集合
 * @param {Set<string>} confront 博弈/对抗关系集合
 */
export function classifyRelation(relation, coop, confront) {
  const r = (relation || '').trim()
  if (confront.has(r)) return 'confrontation'
  if (coop.has(r)) return 'cooperation'
  return 'neutral'
}

/**
 * 生成边的 lineStyle：颜色区分语义，虚线区分对抗（兼顾红绿色弱可读性）。
 * @param {string} relation
 * @param {Set<string>} coop
 * @param {Set<string>} confront
 */
export function edgeLineStyle(relation, coop, confront) {
  const kind = classifyRelation(relation, coop, confront)
  const color = EDGE_COLORS[kind]
  if (kind === 'confrontation') {
    return { color, width: 1.4, opacity: 0.75, curveness: 0.2, type: 'dashed' }
  }
  if (kind === 'cooperation') {
    return { color, width: 1.1, opacity: 0.6, curveness: 0.2 }
  }
  return { color, width: 1, opacity: 0.35, curveness: 0.2 }
}
