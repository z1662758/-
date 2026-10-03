/**
 * 三种研判视角的"研判过程"流程图定义。
 *
 * 每一步的说明文字都来自真实数据(快照里的路线/节点/事件计数、大模型产物的主题数等),
 * 没有产出的环节标为 pending,不编造"已完成"。
 */

const num = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v))

/**
 * 大模型研判过程。
 * 步骤 1-4 的输入来自真实快照(与领域模型同源);步骤 5-6 只有大模型真的跑出结论才成立。
 */
export function llmFlowSteps({ metrics = {}, llm = null, llmAvailable = false } = {}) {
  const osint = metrics.osintInfo || {}
  const registered = osint.registered_total ?? 0
  const effective = osint.risk_effective_count ?? osint.effective_count ?? 0
  const routes = (metrics.routeCount ?? 0) || 0
  const nodes = (metrics.nodeCount ?? 0) || 0
  const evidence = (llm && llm.evidence) || {}
  const themeCount = llmAvailable ? ((llm.themes || []).length) : null

  return [
    {
      title: '原始 OSINT 情报',
      detail: `登记情报 ${num(registered)} 条`,
      llmRequired: false,
    },
    {
      title: '情报检索与筛选',
      detail: `当前计入风险 ${num(effective)} 条`,
      llmRequired: false,
    },
    {
      title: '事件、实体和影响关系抽取',
      detail: `事件映射到 ${num(nodes)} 个节点 / ${num(routes)} 条路线`,
      llmRequired: false,
    },
    {
      title: '知识库关联',
      detail: `证据来源 ${num(evidence.source_count)} 个`,
      llmRequired: false,
    },
    {
      title: '风险主题归纳',
      detail: llmAvailable ? `归纳出 ${num(themeCount)} 个风险主题` : '等待大模型产出',
      llmRequired: true,
    },
    {
      title: '形成大模型研判结论',
      detail: llmAvailable ? '已生成结论与置信度' : '暂无大模型研判结果',
      llmRequired: true,
    },
  ]
}

/** 领域模型研判过程:结构化 OSINT → 网络风险传导 → 路线风险聚合 → 态势图输出 */
export function domainFlowSteps({ metrics = {}, routes = [], nodes = [], edges = [] } = {}) {
  const osint = metrics.osintInfo || {}
  const chain = metrics.modelChain || {}
  const registered = osint.registered_total ?? 0
  const effective = osint.risk_effective_count ?? osint.effective_count ?? 0
  const affectedNodes = (metrics.summary || {}).affectedNodes ?? nodes.length
  const affectedEdges = (metrics.summary || {}).affectedEdges ?? edges.length

  return [
    {
      title: '结构化 OSINT 事件',
      detail: `登记 ${num(registered)} 条 · 当前计入风险 ${num(effective)} 条`,
    },
    {
      title: '事件类型和严重度处理',
      detail: '按事件类型、严重度与生效状态归一',
    },
    {
      title: '事件映射到节点和路线',
      detail: `命中 ${num(affectedNodes)} 个节点 / ${num(affectedEdges)} 条运输边`,
    },
    {
      title: '节点风险计算',
      detail: `脆弱性 × 供应后果 + OSINT 增量 → ${num(nodes.length)} 个节点`,
    },
    {
      title: '边风险传导',
      detail: `${num(edges.length)} 条运输边参与传导`,
    },
    {
      title: '路线风险聚合',
      detail: `聚合为 ${num(routes.length)} 条路线风险`,
    },
    {
      title: '供应链态势图输出',
      detail: chain.total_models
        ? `${num(chain.successful_models)}/${num(chain.total_models)} 个模型成功 · ${num(chain.total_duration_ms)}ms`
        : '快照已生成',
    },
  ]
}

/** 双驱动研判过程：只凭独立的 dual 产物证明模型调用与结论。 */
export function dualFlowSteps({ metrics = {}, dual = null, dualAvailable = false } = {}) {
  const osint = metrics.osintInfo || {}
  const calls = dual?.tool_calls || []
  const runs = dual?.model_runs || []
  const called = calls.some((call) => call.status === 'completed')
  return [
    { title: 'OSINT 原始情报与用户问题', detail: `登记 ${num(osint.registered_total)} 条情报`, pending: false },
    { title: '大模型识别分析需求', detail: called ? '已选择领域模型工具' : '暂无工具选择记录', pending: !called },
    { title: '大模型调用领域模型', detail: called ? `实际调用 ${calls.length} 次` : '暂无真实调用记录', pending: !called },
    { title: '领域模型网络风险计算', detail: runs.length ? `${runs.filter((r) => r.status === 'success').length}/${runs.length} 个模型步骤成功` : '暂无本次执行轨迹', pending: !runs.length },
    { title: '大模型读取计算结果', detail: dualAvailable ? '已结合模型输出与情报证据' : '等待双驱动产物', pending: !dualAvailable },
    { title: '形成双驱动最终研判', detail: dualAvailable ? '结论、三方对比与保留意见已生成' : '暂无双驱动研判结论', pending: !dualAvailable },
  ]
}
