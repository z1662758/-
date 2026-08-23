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

  situationAnalysis: `${SCNET_BASE}/situationAnalysis`,
  knowledgeBase: `${SCNET_BASE}/knowledgeBase`,
  knowledgeGraph: `${SCNET_BASE}/knowledgeGraph`,
  openSourceIntelligence: `${SCNET_BASE}/openSourceIntelligence`,
  reportGeneration: `${SCNET_BASE}/reportGeneration`,
  situationResearch: `${SCNET_BASE}/situationResearch-main`,
  disruptRisk: `${SCNET_BASE}/DisruptRisk`,

  expAnalysisGameTheory: `${SCNET_BASE}/expAnalysisGameTheory`,
  expAnalysisDecisionTree: `${SCNET_BASE}/expAnalysisDecisionTree`,
  expAnalysisScenario: `${SCNET_BASE}/expAnalysisScenario`,
  expAnalysisOverview: `${SCNET_BASE}/expAnalysisOverview`,

  expAnalysisObserve: `${SCNET_BASE}/expAnalysisObserve`,
  expAnalysisIntervention: `${SCNET_BASE}/expAnalysisIntervention`,
  expAnalysisMechanism: `${SCNET_BASE}/expAnalysisMechanism`,
  counterfactualExperiment: `${SCNET_BASE}/counterfactualExperiment`,
})

export const SCNET_DECISION_ROUTE_BY_TAB = Object.freeze({
  overview: SCNET_ROUTES.expAnalysisOverview,
  gameTheory: SCNET_ROUTES.expAnalysisGameTheory,
  decisionTree: SCNET_ROUTES.expAnalysisDecisionTree,
  scenario: SCNET_ROUTES.expAnalysisScenario,
})
