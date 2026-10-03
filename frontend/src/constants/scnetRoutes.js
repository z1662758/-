/**
 * SCnet 前端路由常量
 *
 * 集中维护页面路径，避免各页面散落硬编码字符串。
 */

export const SCNET_BASE = '/home/SCnet'

export const SCNET_ROUTES = Object.freeze({
  chatHome: '/chatHome',
  // 事中入口 = 对话首页的「事中决策」模式：用户在这里输入问题，
  // 直接建会话并跳到想定生成分析（智能对话），不再有单独的「想定生成」输入步骤。
  duringEntry: '/chatHome?mode=during',
  total: `${SCNET_BASE}/total`,
  scenarioModeling: `${SCNET_BASE}/scenarioModeling`,
  scenarioAnalysis: `${SCNET_BASE}/scenarioAnalysis`,
  agentSimulationStudio: `${SCNET_BASE}/agentSimulationStudio`,
  agentSimulationWorkbench: `${SCNET_BASE}/agentSimulationStudio/workbench`,
  experimentManager: `${SCNET_BASE}/experimentManager`,
  interface: `${SCNET_BASE}/interface`,
  EXreport: `${SCNET_BASE}/EXreport`,

  scenarioSetting: `${SCNET_BASE}/scenarioSetting`,
  // 场景设定提交后的下一步：确认分析方案；情报在后台处理，不是导航页面
  planConfirmation: `${SCNET_BASE}/planConfirmation`,
  // 独立研讨工具，不属于事前工作流步骤
  expertSeminar: `${SCNET_BASE}/expertSeminar`,
  situationAnalysis: `${SCNET_BASE}/situationAnalysis`,
  knowledgeBase: `${SCNET_BASE}/knowledgeBase`,
  knowledgeGraph: `${SCNET_BASE}/knowledgeGraph`,
  openSourceIntelligence: `${SCNET_BASE}/openSourceIntelligence`,
  situationJudge: `${SCNET_BASE}/situationJudge`,
  reportGeneration: `${SCNET_BASE}/reportGeneration`,
  situationResearch: `${SCNET_BASE}/situationResearch-main`,
  // 事前落点:态势研判(NetworkMap 包装页)
  situationJudge: `${SCNET_BASE}/situationJudge`,
  disruptRisk: `${SCNET_BASE}/DisruptRisk`,

  expAnalysisGameTheory: `${SCNET_BASE}/expAnalysisGameTheory`,
  expAnalysisDecisionTree: `${SCNET_BASE}/expAnalysisDecisionTree`,
  expAnalysisScenario: `${SCNET_BASE}/expAnalysisScenario`,
  expAnalysisOverview: `${SCNET_BASE}/expAnalysisOverview`,

  expAnalysisObserve: `${SCNET_BASE}/expAnalysisObserve`,
  expAnalysisIntervention: `${SCNET_BASE}/expAnalysisIntervention`,
  expAnalysisMechanism: `${SCNET_BASE}/expAnalysisMechanism`,
  // 事后第一步：把对话研判的结论落成实验目的 + 实验方案（干预变量 / 指标 / 轮次）
  experimentPlan: `${SCNET_BASE}/experimentPlan`,
  counterfactualExperiment: `${SCNET_BASE}/counterfactualExperiment`,
})

export const SCNET_DECISION_ROUTE_BY_TAB = Object.freeze({
  scenario: SCNET_ROUTES.expAnalysisScenario,
  gameTheory: SCNET_ROUTES.expAnalysisGameTheory,
  decisionTree: SCNET_ROUTES.expAnalysisDecisionTree,
  report: SCNET_ROUTES.expAnalysisOverview,
})

/** 专家模式各步骤的路由键,顺序即流程顺序 */
export const EXPERT_STEP_ROUTE_KEYS = Object.freeze([
  'scenarioSetting',
  'planConfirmation',
  'situationJudge',
  'situationResearch',
  'reportGeneration',
])

/**
 * 统一构造专家模式跳转目标。
 *
 * 专家模式各步骤都必须带着当前任务上下文(session_id / scenario)跳转,
 * 否则目标页拿不到 session_id 就只会渲染默认页面,表现为"历史结果消失"。
 * 所有跳转(左侧导航、上一步/下一步、进度浮窗、程序化跳转)统一走这里,
 * 不要各页面自己拼查询串。
 *
 * @param {string} target     SCNET_ROUTES 的键名,或直接给绝对路径
 * @param {object} options
 * @param {string} options.sessionId  当前任务会话 id
 * @param {string} options.scenario   uranium | supply_chain
 * @param {object} options.extraQuery 额外查询参数(如 view=example、scope=global)
 */
export function buildExpertRoute(target, { sessionId, scenario, extraQuery = {} } = {}) {
  const path = SCNET_ROUTES[target] || target
  const query = { ...(extraQuery || {}) }
  // 任务上下文优先级高于 extraQuery,避免被业务参数覆盖掉
  if (scenario) query.scenario = scenario
  if (sessionId) query.session_id = sessionId
  return { path, query }
}
