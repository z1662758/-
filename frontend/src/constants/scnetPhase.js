export const PHASE_STORAGE_KEY = 'scnet_phaseSelection'
export const PHASE_EVENT = 'scnetPhaseSelectionChanged'
export const SCNET_PHASES = Object.freeze(['pre', 'during', 'post'])

export function normalizeScnetPhase(phase, fallback = 'during') {
  const value = String(phase || '').trim()
  if (SCNET_PHASES.includes(value)) return value
  return SCNET_PHASES.includes(fallback) ? fallback : 'during'
}

export function readScnetPhase(fallback = 'during') {
  if (typeof window === 'undefined') return normalizeScnetPhase(fallback)
  return normalizeScnetPhase(window.localStorage.getItem(PHASE_STORAGE_KEY), fallback)
}

export function writeScnetPhase(phase) {
  if (typeof window === 'undefined') return normalizeScnetPhase(phase)
  const normalized = normalizeScnetPhase(phase)
  window.localStorage.setItem(PHASE_STORAGE_KEY, normalized)
  window.dispatchEvent(new CustomEvent(PHASE_EVENT, { detail: normalized }))
  return normalized
}

// 路由 -> 阶段映射：用于在 localStorage 失效或过期时，按当前页面推断阶段
export const ROUTE_TO_PHASE = Object.freeze({
  '/home/SCnet/situationAnalysis': 'pre',
  '/home/SCnet/knowledgeBase': 'pre',
  '/home/SCnet/knowledgeGraph': 'pre',
  '/home/SCnet/openSourceIntelligence': 'pre',
  '/home/SCnet/reportGeneration': 'pre',
  '/home/SCnet/situationResearch-main': 'pre',

  '/home/SCnet/scenarioModeling': 'during',
  '/home/SCnet/scenarioAnalysis': 'during',
  '/home/SCnet/agentSimulationStudio': 'during',
  '/home/SCnet/agentSimulationStudio/workbench': 'during',
  '/home/SCnet/agent-design-studio': 'during',
  '/home/SCnet/experimentManager': 'during',
  '/home/SCnet/interface': 'during',
  '/home/SCnet/expAnalysisDecisionTree': 'during',
  '/home/SCnet/expAnalysisScenario': 'during',
  '/home/SCnet/expAnalysisGameTheory': 'during',
  '/home/SCnet/expAnalysisOverview': 'during',

  '/home/SCnet/expAnalysisObserve': 'post',
  '/home/SCnet/expAnalysisIntervention': 'post',
  '/home/SCnet/expAnalysisMechanism': 'post',
  '/home/SCnet/counterfactualExperiment': 'post',
  '/home/SCnet/EXreport': 'post'
})
