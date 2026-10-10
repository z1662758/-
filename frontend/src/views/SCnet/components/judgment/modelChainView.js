/**
 * 「本次研判实际使用了哪些模型」的统一数据适配。
 *
 * 两个消费方共用这一份逻辑,避免两处各写一套:
 *   - 右侧「模型链」标签(SituationMap.vue)
 *   - 「领域模型研判」结果区(DomainJudgmentPanel.vue)
 *
 * 数据来源只有两个,都是本次任务的真实记录:
 *   1. 执行记录 —— 快照 execution_trace / meta.model_runs(哪个模型真的跑了、跑成什么样)
 *   2. 模型注册表 —— /SCnet/modelRegistry/models 的模型卡(名称、作用、输入输出、版本)
 *
 * 硬性约束:
 *   - **注册表里有、执行记录里没有 = 本任务未运行**,必须单列并标"未运行",
 *     不能混进"已使用"里。
 *   - 执行记录里缺字段时显示"暂无",不用模型注册表的静态描述冒充本次运行结果。
 *   - 完全没有执行记录时返回 hasRuns=false,由调用方显示"暂无模型运行记录"。
 */

/** 注册表取不到时用于兜底展示的中文名(仅名称,不冒充运行状态) */
const FALLBACK_NAMES = {
  uranium_supply_situation_snapshot_v1: '中国铀燃料供应链态势快照模型',
  uranium_supply_graph_builder_v1: '铀供应链图谱构建模型',
  uranium_dependency_model_v1: '铀供应依赖度计算模型',
  uranium_osint_event_model_v1: '铀供应链开源情报事件模型',
  uranium_event_mapping_model_v1: '铀供应链事件映射模型',
  uranium_osint_risk_model_v1: '铀供应链OSINT风险事件接入模型',
  uranium_network_criticality_model_v1: '铀供应链关键节点识别模型',
  uranium_node_risk_model_v1: '铀供应链节点风险评分模型',
  uranium_edge_risk_model_v1: '铀供应链运输边风险评分模型',
  uranium_route_risk_model_v1: '铀供应链路径风险聚合模型',
  uranium_snapshot_builder_v1: '铀供应链态势快照生成模型',
}

/**
 * 三个关键环节由哪个模型完成。
 *
 * 优先按模型卡自己声明的 output_entities 认领(注册表是唯一事实来源),
 * 声明缺失时才回退到已知 model_id,避免"改了个名就认不出来"。
 */
const KEY_STEPS = [
  {
    key: 'node',
    label: '节点风险计算',
    desc: '脆弱性 × 供应后果 + OSINT 增量 → 节点综合风险',
    outputEntity: 'node_risk_scores',
    fallbackModelId: 'uranium_node_risk_model_v1',
  },
  {
    key: 'edge',
    label: '边风险传导',
    desc: '端点风险 + 运输方式 + 路线上下文 + 事件 + 距离 → 运输边风险',
    outputEntity: 'edge_risk_scores',
    fallbackModelId: 'uranium_edge_risk_model_v1',
  },
  {
    key: 'route',
    label: '路线风险聚合',
    desc: '边/节点风险 → 路径聚合 + 快照内展示分校准',
    outputEntity: 'route_risk_scores',
    fallbackModelId: 'uranium_route_risk_model_v1',
  },
]

/** 运行状态的中文说明 */
export function runStatusText(status) {
  return {
    success: '本次运行成功',
    failed: '本次运行失败',
    skipped: '本次跳过',
    running: '运行中',
    pending: '等待中',
  }[status] || (status ? String(status) : '状态未知')
}

/** 运行状态对应的样式档:success | failed | warning | unknown */
export function runStatusTone(status, registryStatus) {
  if (status === 'failed') return 'failed'
  if (registryStatus === 'missing') return 'warning'
  if (status === 'success') return 'success'
  return 'warning'
}

/** 模型显示名:注册表 model_name 优先,其次本地兜底名,最后退到 model_id */
function cardName(card, modelId) {
  return (card && card.model_name) || FALLBACK_NAMES[modelId] || modelId
}

function asList(value) {
  if (Array.isArray(value)) return value.filter((x) => x !== null && x !== undefined && x !== '')
  if (value === null || value === undefined || value === '') return []
  return [value]
}

/**
 * @param {object}   input
 * @param {Array}    input.runs    执行记录(execution_trace / meta.model_runs)
 * @param {Array}    input.cards   模型注册表的模型卡
 * @param {object}   input.chain   model_chain 摘要
 * @param {boolean}  input.cardsLoaded 注册表是否已成功加载(用于区分"未运行"与"查不到卡")
 */
export function buildModelChainView({ runs = [], cards = [], chain = null, cardsLoaded = false } = {}) {
  const cardById = {}
  for (const card of cards || []) {
    if (card && card.model_id) cardById[card.model_id] = card
  }

  const runList = (runs || []).filter((r) => r && r.model_id)
  const ranIds = new Set(runList.map((r) => r.model_id))

  const used = runList.map((run) => {
    const card = cardById[run.model_id] || null
    return {
      modelId: run.model_id,
      cardId: run.model_card_id || '',
      name: cardName(card, run.model_id),
      // 作用与算法来自模型卡;执行记录里没有这两项,注册表也查不到时明确留空
      purpose: (card && card.description) || '',
      algorithm: (card && card.algorithm_summary) || '',
      inputEntities: asList(card && card.input_entities),
      outputEntities: asList(card && card.output_entities),
      // 版本以本次运行为准(可能与注册表当前版本不同,历史快照尤其如此)
      version: run.model_version || (card && card.version) || '',
      registeredVersion: (card && card.version) || '',
      status: run.status || '',
      registryStatus: run.registry_status || (card ? 'ok' : 'missing'),
      statusText: runStatusText(run.status),
      tone: runStatusTone(run.status, run.registry_status || (card ? 'ok' : 'missing')),
      durationMs: run.duration_ms,
      startedAt: run.started_at || '',
      finishedAt: run.finished_at || '',
      stage: run.pipeline_stage,
      type: run.model_type || (card && card.model_type) || '',
      upstream: asList(run.upstream_models),
      inputSummary: run.input_summary || '',
      outputSummary: run.output_summary || '',
      error: run.error || '',
      hasCard: Boolean(card),
      card,
    }
  })

  /** 注册表里有、本次没跑的模型:单列,明确标"未运行" */
  const unused = (cards || [])
    .filter((card) => card && card.model_id && !ranIds.has(card.model_id))
    .map((card) => ({
      modelId: card.model_id,
      name: cardName(card, card.model_id),
      purpose: card.description || '',
      version: card.version || '',
      stage: card.pipeline_stage,
      type: card.model_type || '',
      reason: '本任务未运行',
    }))
    .sort((a, b) => (a.stage ?? 99) - (b.stage ?? 99))

  /** 三个关键环节分别由哪个模型完成,以及它本次到底跑没跑 */
  const keySteps = KEY_STEPS.map((step) => {
    const byOutput = (cards || []).find(
      (card) => card && asList(card.output_entities).includes(step.outputEntity),
    )
    const modelId = (byOutput && byOutput.model_id) || step.fallbackModelId
    const run = runList.find((r) => r.model_id === modelId) || null
    const card = cardById[modelId] || byOutput || null
    return {
      key: step.key,
      label: step.label,
      desc: step.desc,
      modelId,
      name: cardName(card, modelId),
      version: (run && run.model_version) || (card && card.version) || '',
      algorithm: (card && card.algorithm_summary) || '',
      inputEntities: asList(card && card.input_entities),
      outputEntities: asList(card && card.output_entities),
      ran: Boolean(run),
      status: run ? run.status : '',
      statusText: run ? runStatusText(run.status) : '本任务未运行',
      tone: run ? runStatusTone(run.status, run.registry_status) : 'unknown',
      durationMs: run ? run.duration_ms : null,
    }
  })

  const failedCount = used.filter((m) => m.status === 'failed').length
  const missingCardCount = used.filter((m) => !m.hasCard).length

  return {
    /** 本次任务有没有模型执行记录 */
    hasRuns: used.length > 0,
    /** 注册表是否成功加载(加载失败时不能断言"未运行") */
    cardsLoaded: Boolean(cardsLoaded),
    used,
    unused,
    keySteps,
    summary: {
      usedCount: used.length,
      registeredCount: (cards || []).length,
      unusedCount: unused.length,
      failedCount,
      missingCardCount,
      totalDurationMs: chain && chain.total_duration_ms != null
        ? chain.total_duration_ms
        : used.reduce((sum, m) => sum + (Number(m.durationMs) || 0), 0),
      chainTotal: chain ? chain.total_models : null,
      chainSuccessful: chain ? chain.successful_models : null,
      chainFailed: chain ? chain.failed_models : null,
    },
  }
}
