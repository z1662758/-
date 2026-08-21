/**
 * 决策分析「历史快照」统一索引
 *
 * 思路：模仿想定生成「历史对话」的范式，事中决策分析三页 + 实体图 + 对话记录都从同一份快照拉数据。
 * 每条快照 = 一个业务场景的一次完整推演结果，跨五个视图（决策树 / 情景 / 博弈论 / 实体图 / 对话记录）。
 * 演示时不必跑后端，直接选快照即可让所有页面同步切换。
 *
 * - business 用于和 mock/decisionTreeMock 中的 SCENARIO_OPTIONS 对齐；
 *   baseline 与 tariffShock 无完全对应的决策树，退化到最接近的供应链场景。
 * - 字段 covers 声明这条快照支持哪些页面，AnalysisLinkTabs 的对话框据此显示标签。
 * - 字段 dialogue 提供「想定生成」预设对话与目标拆解数据，launcher 选中后写入 supplyChain store。
 */

export const SNAPSHOT_COVERS = {
  decisionTree: { label: '决策树', icon: 'Share' },
  scenario: { label: '情景推演', icon: 'TrendCharts' },
  gameTheory: { label: '博弈论', icon: 'Grid' },
  agentGraph: { label: '实体图', icon: 'Connection' },
  dialogue: { label: '对话记录', icon: 'ChatDotRound' }
}

const SNAPSHOT_PHASE = 'during'
const SNAPSHOT_MODEL_NAME = 'qwen-turbo'

function normalizeNamedList(list = []) {
  return list.map((item) => (typeof item === 'string' ? { name: item } : item)).filter((item) => item?.name)
}

function buildExplainEntries(list, explainMap = {}, fallbackText) {
  return list.map(({ name }) => ({
    [name]: explainMap[name] || (typeof fallbackText === 'function' ? fallbackText(name) : fallbackText)
  }))
}

function buildSnapshotRequirementMeta({ userGoal, variableList, object }) {
  const variableText = (variableList || [])
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter(Boolean)
    .join('、')
  return {
    goal: userGoal || '',
    variable: variableText,
    object: object || '供应链协同网络',
    is_legal: true,
    analysis_phase: SNAPSHOT_PHASE,
    raw_input: userGoal || '',
    model_name: SNAPSHOT_MODEL_NAME
  }
}

/** 为预设对话生成结构化 apiResult 的便捷工厂。 */
function buildDialogueApiResult({
  goalUnderstanding,
  influenceFactors,
  responseVariables,
  subtasks,
  formula,
  influenceFactorExplain,
  responseVarExplain,
  formulaExplain,
  expMethod,
  expParams
}) {
  const factorList = normalizeNamedList(influenceFactors)
  const responseList = normalizeNamedList(responseVariables)
  const normalizedSubtasks = (subtasks || []).map((task, idx) => ({
    task_id: task.task_id || `task_${idx + 1}`,
    title: task.title,
    description: task.description || task.title,
    assigned_agent: task.agent_type,
    agent_type: task.agent_type,
    priority: task.priority ?? (5 - idx),
    parameters: task.parameters || {
      influence_factors: factorList,
      response_variables: responseList
    }
  }))
  const goalDecomposition = {
    user_goal: goalUnderstanding?.userGoal || '',
    goal_understanding: goalUnderstanding?.text || '',
    subtasks: normalizedSubtasks
  }
  const goal = {
    category: '事中：应急响应与调度',
    explain: goalUnderstanding?.text || goalUnderstanding?.userGoal || ''
  }
  const varExplain = {
    influence_factor: buildExplainEntries(
      factorList,
      influenceFactorExplain,
      (name) => `${name}用于刻画场景扰动强度与执行约束。`
    ),
    response_var: buildExplainEntries(
      responseList,
      responseVarExplain,
      (name) => `${name}用于衡量策略执行后的业务结果。`
    )
  }
  const normalizedFormula = formula || {}
  const normalizedFormulaExplain = formulaExplain || {}
  const normalizedExpParams = {
    exp_method: expMethod || '多场景扰动 + 参数扫描 + 结果对比',
    params: expParams && typeof expParams === 'object' ? expParams : {}
  }
  const expPlan = {
    req: goalUnderstanding?.userGoal || '',
    goal,
    influence_factor: factorList,
    influence_factors: factorList,
    response_var: responseList,
    response_variables: responseList,
    var_explain: varExplain,
    formula: normalizedFormula,
    formula_explain: normalizedFormulaExplain,
    exp_params: normalizedExpParams,
    goal_decomposition: goalDecomposition
  }
  return {
    req: goalUnderstanding?.userGoal || '',
    phase: SNAPSHOT_PHASE,
    model_name: SNAPSHOT_MODEL_NAME,
    goal,
    goal_decomposition: goalDecomposition,
    influence_factor: factorList,
    response_var: responseList,
    influence_factors: factorList,
    response_variables: responseList,
    var_explain: varExplain,
    formula: normalizedFormula,
    formula_explain: normalizedFormulaExplain,
    exp_params: normalizedExpParams,
    exp_plan: { ...expPlan }
  }
}

/** 把 apiResult + 用户输入组装成 historyConversations 期望的两条消息（user + system）。 */
function buildChatMessages({ userGoal, apiResult, createdAt }) {
  const ts = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString()
  const goalDecomp = apiResult?.goal_decomposition || {}
  const subtasks = Array.isArray(goalDecomp.subtasks) ? goalDecomp.subtasks : []
  const factors = (apiResult?.influence_factor || []).map((x) => (typeof x === 'string' ? x : x?.name)).filter(Boolean)
  const responses = (apiResult?.response_var || []).map((x) => (typeof x === 'string' ? x : x?.name)).filter(Boolean)
  return [
    {
      type: 'user',
      content: userGoal,
      timestamp: ts
    },
    {
      type: 'system',
      content: `✅ 目标分析完成，已生成 ${subtasks.length} 个拆解任务`,
      timestamp: ts,
      analysisData: {
        understanding: goalDecomp.goal_understanding || '系统将分步骤完成您的需求分析',
        subtasks,
        influenceFactors: factors,
        responseVars: responses
      }
    }
  ]
}

/** 通用：根据 apiResult 生成 launcher 注入 store 用的 tasks 数组（标题）。 */
function buildTasksFromApiResult(apiResult) {
  const subtasks = apiResult?.goal_decomposition?.subtasks || []
  return subtasks.map((t) => t.title || t.description || '未命名任务')
}

function buildSnapshotDialogue(config) {
  const apiResult = buildDialogueApiResult(config)
  const userGoal = config?.goalUnderstanding?.userGoal || ''
  return {
    userGoal,
    requirementMeta: buildSnapshotRequirementMeta({
      userGoal,
      variableList: apiResult.influence_factor,
      object: config.object
    }),
    apiResult,
    subtasks: apiResult.goal_decomposition.subtasks,
    tasks: buildTasksFromApiResult(apiResult),
    chatMessages: buildChatMessages({
      userGoal,
      apiResult,
      createdAt: config.createdAt
    })
  }
}

/** —— 五条快照的对话/分析底稿。先组装 apiResult，再衍生 chatMessages / tasks。 */
const DIALOGUE_RAW_SHORTAGE = buildSnapshotDialogue({
  createdAt: '2026-03-12 09:24',
  object: '华东汽车制造供应链',
  goalUnderstanding: {
    userGoal: '主供应商交付延迟 30%，分析应急采购组合对履约率的影响并给出最优调度',
    text: '聚焦上游断供下的应急网络调度，识别影响履约的关键参数并给出可量化方案'
  },
  influenceFactors: ['主供应商交付时效', '应急现货可得量', '工厂协作半径', '库存安全水位'],
  responseVariables: ['整体履约率', '原材料缺口', '应急成本'],
  influenceFactorExplain: {
    '主供应商交付时效': '衡量主供到货相对承诺交期的偏离程度，决定缺料暴露窗口。',
    '应急现货可得量': '反映现货市场在短期内可补给的关键物料规模。',
    '工厂协作半径': '衡量跨厂调拨与协同生产可覆盖的范围和响应半径。',
    '库存安全水位': '定义触发限量配给、补货和预警的库存阈值。'
  },
  responseVarExplain: {
    '整体履约率': '衡量全部订单中按承诺时间完成交付的比例。',
    '原材料缺口': '统计关键物料需求量与可用供给量之间的差额。',
    '应急成本': '包含现货溢价、加急运输和跨仓调拨带来的额外成本。'
  },
  formula: {
    '整体履约率': '已按时交付订单 / 总订单数',
    '原材料缺口': '关键物料需求量 - 已到货量 - 可用库存',
    '应急成本': '现货溢价 + 加急运输费 + 跨仓调拨费'
  },
  formulaExplain: {
    '整体履约率': '直接衡量调度组合是否有效保障客户交付。',
    '原材料缺口': '用于识别断供场景下剩余的缺料规模。',
    '应急成本': '用于比较不同补位策略的代价差异。'
  },
  expMethod: '双场景扰动 + 现货补给敏感性扫描 + 调度策略对比',
  expParams: {
    '主供应商交付时效': ['-15%', '-30%', '-45%'],
    '应急现货可得量': ['800 件', '1200 件', '1600 件'],
    '工厂协作半径': ['200 km', '400 km', '600 km'],
    '库存安全水位': ['3 天', '5 天', '7 天']
  },
  subtasks: [
    { title: '梳理上游断供扰动场景', agent_type: 'ENVIRONMENT', description: '建立主供延迟 15%/30% 双场景，定义现货补给曲线' },
    { title: '建立履约率与缺口观测指标', agent_type: 'OBSERVER', description: '围绕订单完成率、原材料缺口建立观测口径' },
    { title: '生成多源应急采购组合', agent_type: 'SOCIAL', description: '在主供 + 备选 + 现货之间组合分流方案' },
    { title: '形成调度执行计划', agent_type: 'PLANNER', description: '汇总各子任务，给出可执行调度顺序与回滚策略' }
  ]
})

const DIALOGUE_REGIONAL_SURGE = buildSnapshotDialogue({
  createdAt: '2026-04-08 14:10',
  object: '华东产销协同网络',
  goalUnderstanding: {
    userGoal: '华东区域订单环比 +42% 时，如何兼顾跨区调拨与弹性定价以稳定履约',
    text: '聚焦区域订单激增冲击下的产能再分配与定价策略，求得高位平台期下的均衡组合'
  },
  influenceFactors: ['市场需求强度', '区域间产能调拨比例', '销售加价率', '工厂排程弹性'],
  responseVariables: ['订单总体完成率', '系统净利润', '区域库存周转'],
  influenceFactorExplain: {
    '市场需求强度': '刻画订单峰值对产销系统带来的即时压力。',
    '区域间产能调拨比例': '衡量跨区调拨可分担本地缺口的能力。',
    '销售加价率': '用于调节过热需求和保障利润率的价格杠杆。',
    '工厂排程弹性': '反映加点、换线和委外协同的执行空间。'
  },
  responseVarExplain: {
    '订单总体完成率': '衡量需求激增下整体订单的兑现能力。',
    '系统净利润': '评估调拨与定价组合对经营结果的影响。',
    '区域库存周转': '反映库存是否因过热需求出现堆积或断档。'
  },
  formula: {
    '订单总体完成率': '已完成订单 / 总订单数',
    '系统净利润': '销售收入 - 生产成本 - 调拨成本 - 促销成本',
    '区域库存周转': '区域出库量 / 平均库存量'
  },
  formulaExplain: {
    '订单总体完成率': '用于判断跨区调拨是否有效补齐需求缺口。',
    '系统净利润': '用于比较稳态履约与利润保护之间的平衡。',
    '区域库存周转': '用于识别是否因盲目备货带来库存积压。'
  },
  expMethod: '需求冲击分层模拟 + 跨区调拨扫描 + 弹性定价对照',
  expParams: {
    '市场需求强度': ['1.15x', '1.42x', '1.60x'],
    '区域间产能调拨比例': ['10%', '20%', '30%'],
    '销售加价率': ['0%', '4%', '8%'],
    '工厂排程弹性': ['常态班次', '周末加点', '加点 + 委外']
  },
  subtasks: [
    { title: '识别区域需求扰动与传导', agent_type: 'ENVIRONMENT', description: '构造 +42% 华东订单冲击场景' },
    { title: '观测完成率与净利润', agent_type: 'OBSERVER', description: '设置跨区/区域两级观测维度' },
    { title: '设计跨区调拨 + 定价组合', agent_type: 'SOCIAL', description: '在调拨比例与加价率两轴上探索均衡点' },
    { title: '汇总执行方案与节奏', agent_type: 'PLANNER', description: '形成 0-4 周调拨与定价节奏表' }
  ]
})

const DIALOGUE_LOGISTICS_JAM = buildSnapshotDialogue({
  createdAt: '2026-02-18 11:30',
  object: '长三角干线运输网络',
  goalUnderstanding: {
    userGoal: '主干线寒潮拥堵导致时效跌至 60%，应如何组合专线 + 多承运商分流',
    text: '聚焦运输网络拥堵下的承运商组合优化，目标是在两周内恢复时效'
  },
  influenceFactors: ['干线通行能力', '专线包车比例', '多承运商分流权重', '运输优先级策略'],
  responseVariables: ['平均时效', '运输成本', '订单延误率'],
  influenceFactorExplain: {
    '干线通行能力': '衡量寒潮、拥堵等因素下可用主干运力的剩余水平。',
    '专线包车比例': '反映高优先级订单切到专线后的资源占比。',
    '多承运商分流权重': '定义应急承运商承接主干缺口的分配比例。',
    '运输优先级策略': '决定 KA、A 类与普通订单的履约排序。'
  },
  responseVarExplain: {
    '平均时效': '衡量订单从出库到签收的平均耗时。',
    '运输成本': '统计专线、应急承运与改道后的综合运输开销。',
    '订单延误率': '衡量超过承诺时效的订单占比。'
  },
  formula: {
    '平均时效': '总运输耗时 / 已完成订单数',
    '运输成本': '干线费用 + 专线费用 + 应急承运费用',
    '订单延误率': '超时订单数 / 总订单数'
  },
  formulaExplain: {
    '平均时效': '用于判断恢复节奏是否达到预期。',
    '运输成本': '用于比较专线与分流策略的性价比。',
    '订单延误率': '用于识别 SLA 风险是否已被有效压降。'
  },
  expMethod: '运力受限情景模拟 + 承运商组合优化 + 两周恢复曲线评估',
  expParams: {
    '干线通行能力': ['60%', '75%', '90%'],
    '专线包车比例': ['10%', '20%', '30%'],
    '多承运商分流权重': ['20%', '40%', '60%'],
    '运输优先级策略': ['KA 优先', 'A 类优先', '全量分层']
  },
  subtasks: [
    { title: '建立主干线拥堵扰动模型', agent_type: 'ENVIRONMENT', description: '量化寒潮影响下的通行能力下降曲线' },
    { title: '观测时效与延误指标', agent_type: 'OBSERVER', description: '设置时效分布、延误率与成本观测' },
    { title: '设计专线 + 多承运商组合', agent_type: 'SOCIAL', description: '探索专线/多承运商权重组合的帕累托前沿' },
    { title: '形成两周恢复执行计划', agent_type: 'PLANNER', description: '逐周输出运力调度与回滚方案' }
  ]
})

const DIALOGUE_BASELINE = buildSnapshotDialogue({
  createdAt: '2025-12-30 16:45',
  object: '供应链常态协同网络',
  goalUnderstanding: {
    userGoal: '在常态运行下评估当前供应链网络的均衡参数组合，作为后续干预的基线',
    text: '基线场景下识别关键参数稳定区间，为对照实验提供参考'
  },
  influenceFactors: ['市场需求强度', '工厂产能区间', '协作半径', '库存上限'],
  responseVariables: ['订单完成率', '库存周转天数', '系统净利润'],
  influenceFactorExplain: {
    '市场需求强度': '刻画常态需求波动对产销节奏的基础影响。',
    '工厂产能区间': '定义各工厂在稳态运行下的可持续输出范围。',
    '协作半径': '衡量跨厂、跨仓和跨区协作的常态覆盖能力。',
    '库存上限': '控制库存积压风险与补货响应速度之间的平衡。'
  },
  responseVarExplain: {
    '订单完成率': '衡量基线条件下的常态履约稳定性。',
    '库存周转天数': '反映库存是否处在健康区间。',
    '系统净利润': '用于建立后续干预效果的财务对照基线。'
  },
  formula: {
    '订单完成率': '已完成订单 / 总订单数',
    '库存周转天数': '平均库存 / 日均出库量',
    '系统净利润': '销售收入 - 生产成本 - 库存持有成本'
  },
  formulaExplain: {
    '订单完成率': '作为后续应急干预的基础对照值。',
    '库存周转天数': '用于判断常态库存是否过高或过低。',
    '系统净利润': '用于衡量稳定运行时的经营基线。'
  },
  expMethod: '基线敏感性分析 + 稳态参数扫描 + 对照实验建档',
  expParams: {
    '市场需求强度': ['0.95x', '1.00x', '1.05x'],
    '工厂产能区间': ['85%', '95%', '105%'],
    '协作半径': ['150 km', '300 km', '450 km'],
    '库存上限': ['8 天', '10 天', '12 天']
  },
  subtasks: [
    { title: '描述常态需求与排程节奏', agent_type: 'ENVIRONMENT', description: '建立常态月度需求与排程曲线' },
    { title: '观测完成率/周转/利润', agent_type: 'OBSERVER', description: '形成三项关键指标的常态分布' },
    { title: '识别参数稳定带', agent_type: 'SOCIAL', description: '通过敏感性分析定位常态区间' },
    { title: '汇总基线参数手册', agent_type: 'PLANNER', description: '输出可作为对照实验的参数清单' }
  ]
})

const DIALOGUE_TARIFF_SHOCK = buildSnapshotDialogue({
  createdAt: '2026-05-06 10:00',
  object: '海外采购切换与国产替代网络',
  goalUnderstanding: {
    userGoal: '海外关税 +8pp 叠加汇率波动时，国产化切换节奏如何兼顾毛利和履约',
    text: '聚焦关税冲击下的国产化替代节奏，目标 6 周内完成 60% 替换且控制毛利下滑'
  },
  influenceFactors: ['海外关税水平', '汇率波动幅度', '国产替代渗透率', '采购组合权重'],
  responseVariables: ['采购成本变动', '毛利率', '订单完成率'],
  influenceFactorExplain: {
    '海外关税水平': '决定进口物料的附加成本和切换紧迫性。',
    '汇率波动幅度': '衡量海外采购结算价格的浮动风险。',
    '国产替代渗透率': '反映国产供应商导入后的覆盖进度。',
    '采购组合权重': '描述海外与国产双源之间的订单分配策略。'
  },
  responseVarExplain: {
    '采购成本变动': '衡量切换节奏对综合采购成本的影响。',
    '毛利率': '反映成本冲击传导到经营端的程度。',
    '订单完成率': '判断替代过程是否影响交付稳定性。'
  },
  formula: {
    '采购成本变动': '(当前采购成本 - 基线采购成本) / 基线采购成本',
    '毛利率': '(销售收入 - 总成本) / 销售收入',
    '订单完成率': '已完成订单 / 总订单数'
  },
  formulaExplain: {
    '采购成本变动': '用于比较不同国产化节奏下的成本爬坡情况。',
    '毛利率': '用于约束替代方案不能过度侵蚀利润。',
    '订单完成率': '用于确保切换期间交付稳定性不被破坏。'
  },
  expMethod: '关税与汇率联动扰动 + 国产替代节奏扫描 + 双源组合评估',
  expParams: {
    '海外关税水平': ['+4pp', '+8pp', '+12pp'],
    '汇率波动幅度': ['±1.5%', '±3.0%', '±4.5%'],
    '国产替代渗透率': ['20%', '40%', '60%'],
    '采购组合权重': ['海外 70 / 国产 30', '海外 50 / 国产 50', '海外 30 / 国产 70']
  },
  subtasks: [
    { title: '构造关税 + 汇率联动扰动', agent_type: 'ENVIRONMENT', description: '叠加 +8pp 关税与汇率 ±3% 区间' },
    { title: '观测毛利与完成率', agent_type: 'OBSERVER', description: '建立毛利率、完成率与成本观测' },
    { title: '设计国产替代节奏', agent_type: 'SOCIAL', description: '在 0~12 周区间扫描替代比例方案' },
    { title: '形成 6 周执行节奏与回滚', agent_type: 'PLANNER', description: '输出节奏表与回滚阈值' }
  ]
})

export const SNAPSHOTS = [
  {
    id: 'snap-raw-shortage-2026q1',
    title: '原材料断供 · 2026Q1 华东主供延迟',
    business: 'rawShortage',
    summary: '主供应商交付延迟 15% → 30%，关键物料断供产线，组合调度后履约率回升至 82%。',
    createdAt: '2026-03-12 09:24',
    covers: ['dialogue', 'decisionTree', 'scenario', 'gameTheory', 'agentGraph'],
    decisionTree: { scenarioKey: 'rawShortage', timeIndex: 1 },
    scenarioIndex: 2, // SCENARIO_PRESETS[2] = 原材料断供冲击
    gameTheoryKey: 'domesticVsImportSourcing',
    agentGraphId: 'g-raw-shortage',
    dialogue: DIALOGUE_RAW_SHORTAGE
  },
  {
    id: 'snap-regional-surge-2026q2',
    title: '区域销量激增 · 2026Q2 华东订单冲高',
    business: 'regionalDemandSurge',
    summary: '华东区域订单环比 +42%、超预测 80%，跨区调拨 + 弹性定价后订单回落至高位平台期。',
    createdAt: '2026-04-08 14:10',
    covers: ['dialogue', 'decisionTree', 'scenario', 'gameTheory', 'agentGraph'],
    decisionTree: { scenarioKey: 'regionalDemandSurge', timeIndex: 1 },
    scenarioIndex: 4, // 区域销量异常激增
    gameTheoryKey: 'supplierVsRetailer',
    agentGraphId: 'g-regional-surge',
    dialogue: DIALOGUE_REGIONAL_SURGE
  },
  {
    id: 'snap-logistics-jam-2026q1',
    title: '主干物流拥堵 · 寒潮干线时效跌至 60%',
    business: 'logisticsCongestion',
    summary: '主干通道拥堵叠加运力缺口，专线包车 + 多承运商分流后时效爬坡至 80%。',
    createdAt: '2026-02-18 11:30',
    covers: ['dialogue', 'decisionTree', 'scenario', 'gameTheory', 'agentGraph'],
    decisionTree: { scenarioKey: 'logisticsCongestion', timeIndex: 1 },
    scenarioIndex: 3, // 物流网络拥堵
    gameTheoryKey: 'corePlatformVs3PL',
    agentGraphId: 'g-logistics-jam',
    dialogue: DIALOGUE_LOGISTICS_JAM
  },
  {
    id: 'snap-baseline-2025q4',
    title: '基准平稳运行 · 2025Q4 常态对照',
    business: 'baseline',
    summary: '订单与产能匹配，库存周转 9.2 天，履约率 94%，用作常态参照基线。',
    createdAt: '2025-12-30 16:45',
    covers: ['dialogue', 'decisionTree', 'scenario', 'gameTheory', 'agentGraph'],
    // 基准场景没有专属决策树，退化到 regionalDemandSurge T0（事件初发，最接近常态）
    decisionTree: { scenarioKey: 'regionalDemandSurge', timeIndex: 0 },
    scenarioIndex: 1, // 基准平稳运行
    gameTheoryKey: 'supplierVsRetailer',
    agentGraphId: 'g-baseline',
    dialogue: DIALOGUE_BASELINE
  },
  {
    id: 'snap-tariff-shock-2026q2',
    title: '关税突变 · 海外采购成本陡增',
    business: 'tariffShock',
    summary: '海外关税 +8pp 叠加汇率走强，启动国产化切换 6 周完成 60%，毛利下降控制在 1.2pp。',
    createdAt: '2026-05-06 10:00',
    covers: ['dialogue', 'decisionTree', 'scenario', 'gameTheory', 'agentGraph'],
    decisionTree: { scenarioKey: 'rawShortage', timeIndex: 0 },
    scenarioIndex: 5, // 关税突变叠加汇率波动
    gameTheoryKey: 'domesticVsImportSourcing',
    agentGraphId: 'g-tariff-shock',
    dialogue: DIALOGUE_TARIFF_SHOCK
  }
]

export const BUSINESS_LABELS = {
  rawShortage: '原材料断供',
  regionalDemandSurge: '区域销量激增',
  logisticsCongestion: '物流网络拥堵',
  baseline: '基准平稳',
  tariffShock: '关税突变'
}

export const BUSINESS_TAG_TYPES = {
  rawShortage: 'danger',
  regionalDemandSurge: 'warning',
  logisticsCongestion: 'info',
  baseline: 'success',
  tariffShock: ''
}

export function getSnapshotById(id) {
  return SNAPSHOTS.find((s) => s.id === id) || null
}
