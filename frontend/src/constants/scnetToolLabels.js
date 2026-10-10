/**
 * Agent 工具 → 展示名。
 *
 * 对话首页(执行面板)与"研判交接条"都要把工具 id 翻译成人话,
 * 抽到一处避免两边各写一份、改一边忘一边。
 */
export const TOOL_DISPLAY_NAMES = Object.freeze({
  skill: '加载研判技能',
  uranium_supply_overview: '供应概览',
  uranium_route_network: '路线网络',
  uranium_current_risk: '当前风险',
  uranium_osint_events: 'OSINT 事件',
  uranium_knowledge_search: '知识检索',
  uranium_scenario_analysis: '情景分析',
  // 事后阶段的实验证据工具(异常/干预策略/极端事件),见后端 tools/experiment_evidence.py
  supply_chain_experiment_evidence: '实验证据'
})

export function toolDisplayName(tool) {
  return TOOL_DISPLAY_NAMES[tool] || tool
}
