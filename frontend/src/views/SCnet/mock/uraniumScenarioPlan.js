import { URANIUM_REFERENCE_GRAPH } from './agentGraphMock.js'

export function buildUraniumRequirementAnswer(userGoal, draft = {}) {
  const plan = buildUraniumScenarioPlan(userGoal, draft)
  const safe = text => String(text).replace(/[<>&*_`[\]#]/g, '')
  return [
    `### 一、需求理解\n\n${safe(plan.goal.explain)}`,
    '### 二、建模安排\n\n将供给方、运输通道、制造方（采购主体）与核电需求端纳入同一供应链模型。供给方负责产能与报价，制造方负责采购和库存，运输通道传导物流风险，需求端提供年度消耗信息。',
    `建议先确认以下参数：\n\n- 推演窗口：${plan.exp_params.params.start_year}–${plan.exp_params.params.end_year} 年。\n- 迭代轮数：${plan.exp_params.params.optimization_iterations} 轮。\n- 事件强度倍率：${plan.exp_params.params.event_severity_multiplier}。\n- 观察指标：采购成本、需求缺口、库存覆盖年限和风险暴露。`,
    `### 三、下一步\n\n${plan.goal_decomposition.subtasks.map((task, index) => `${index + 1}. ${task.title}：${task.description}`).join('\n')}`,
    '你可以继续补充事件背景、保供目标或预算约束。确认后点击下方「查看建模设定」，检查 Agent 角色与环境参数，再进入想定生成。',
  ].join('\n\n')
}

export function buildUraniumScenarioPlan(userGoal, draft = {}) {
  const factors = ['事件强度倍率', '库存目标', '长协采购比例', '供应来源组合'].map(name => ({ name }))
  const responses = ['采购成本', '需求缺口', '库存覆盖年限', '风险暴露'].map(name => ({ name }))
  const understanding = `围绕“${userGoal}”，在 ${draft.start_year || 2024}–${draft.end_year || 2028} 年窗口内，对比供应冲击下的采购、库存和来源分散策略。`
  const subtasks = [
    { title: '配置供应链与事件环境', agent_type: 'ENVIRONMENT', description: '确认推演年份、供需主体与事件强度。' },
    { title: '生成采购与库存策略', agent_type: 'SOCIAL', description: '组织供给方与制造方协同，形成长协、现货与库存组合。' },
    { title: '观测成本与保供指标', agent_type: 'OBSERVER', description: '记录年度采购成本、需求缺口、风险暴露和库存覆盖。' },
    { title: '迭代评估并形成决策', agent_type: 'PLANNER', description: '结合保供与成本约束评估方案，输出建议和调整依据。' },
  ].map((task, index) => ({ ...task, task_id: `uranium-task-${index + 1}`, assigned_agent: task.agent_type, priority: 4 - index, parameters: { influence_factors: factors, response_variables: responses } }))
  const plan = {
    req: userGoal, phase: 'during',
    goal: { category: '事中：应急响应与调度', explain: understanding },
    goal_decomposition: { user_goal: userGoal, goal_understanding: understanding, subtasks },
    selected_entities: URANIUM_REFERENCE_GRAPH.agents.map(agent => agent.name),
    influence_factor: factors, influence_factors: factors,
    response_var: responses, response_variables: responses,
    var_explain: {
      influence_factor: factors.map(({ name }) => ({ [name]: `${name}用于设定本次推演的策略与环境约束。` })),
      response_var: responses.map(({ name }) => ({ [name]: `${name}用于对比各年度和各轮次的策略效果。` })),
    },
    formula: {}, formula_explain: {},
    exp_params: { exp_method: '多智能体年度推演与策略迭代', params: {
      start_year: draft.start_year || 2024, end_year: draft.end_year || 2028,
      optimization_iterations: draft.optimization_iterations || 1,
      event_severity_multiplier: draft.event_severity_multiplier ?? 1,
    } },
  }
  plan.candidate_plans = [
    { preset_name: 'balanced', title: '平衡方案', focus: '兼顾采购成本、风险暴露与库存覆盖。', status: '基准', kind: 'main' },
    { preset_name: 'security_first', title: '保供优先', focus: '提高库存与长协偏好，观察需求缺口是否收窄。', status: '保供', kind: 'compare' },
    { preset_name: 'cost_first', title: '成本优先', focus: '控制采购成本，同时检查来源集中度和库存压力。', status: '成本', kind: 'support' },
    { preset_name: 'shock_response', title: '冲击响应', focus: '提高首年价格设定，检查供给与库存能否承受额外压力。', status: '冲击', kind: 'edge' },
  ].map((item, index) => ({
    ...item,
    name: `方案 ${index + 1}`,
    params: {
      ...plan.exp_params.params,
      preset_name: item.preset_name,
      ...(item.preset_name === 'shock_response' ? { starting_price_usd_per_lb: 95 } : {}),
    },
  }))
  return { ...plan, exp_plan: { ...plan } }
}
