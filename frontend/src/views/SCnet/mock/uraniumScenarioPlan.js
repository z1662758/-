import { URANIUM_REFERENCE_GRAPH } from './agentGraphMock.js'

export function buildUraniumRequirementAnswer(userGoal, draft = {}) {
  const plan = buildUraniumScenarioPlan(userGoal, draft)
  const safe = text => String(text).replace(/[<>&*_`[\]#]/g, '')
  return [
    `### 一、应急需求研判与定标\n\n- **需求理解**：围绕“${safe(userGoal)}”，在 ${draft.start_year || 2024}–${draft.end_year || 2030} 年推演窗口内，系统对突发事件冲击与应急调度展开多维推演与策略寻优。\n\n已完成对事件冲击的物理定标：\n- **全国基线需求**：当前全国在役机组年基线天然铀需求为 **11,500 tU**。\n- **突发扰动冲击**：核电负荷激增导致需求突发上涨 **+20%**（年度缺口量 **+2,300 tU**），主要源于 4 台百万千瓦华龙一号机组提前装料与首炉换料周期重叠。\n- **空间缺口分布**：**北方元件基地（包头）**预计承接缺口 **60%**（~1,380 tU），**南方元件基地（宜宾/沿海）**预计承接缺口 **40%**（~920 tU）。\n- **刚性边界红线**：商业安全库存红线天数 **180 天**，中哈口岸月度铁路通运上限 **1,200 tU/月**。`,
    `### 二、建模设定与决策导向\n\n系统已将海外矿山（哈原工/纳米比亚湖山/加拿大雪茄湖）、关键通道（中亚铁路阿拉山口口岸/远洋海运）、国内制造端（北方包头基地/南方沿海基地）与国家战略原料储备库纳入一体化动态调度模型。\n\n当前推演重点权衡以下两种决策策略：\n1. **【核安全刚性保供优先】（推荐）**：允许现货溢价最高 +35%，提前锁定纳米比亚海运批次并启动战略储备临时借调，确保关键堆型 0 停堆风险。\n2. **【综合平抑到岸成本优先】**：严控现货在 $80/lb U3O8 以下，限制高运费通道，优先依托南北基地间库存横向调剂。`,
    `### 三、应急推演与调度流程\n\n${plan.goal_decomposition.subtasks.map((task, index) => `${index + 1}. **${task.title}**：${task.description}`).join('\n')}\n\n请核实上述业务基线。确认后可点击下方「查看建模设定」，检查实体属性与分配算法引擎，随后生成多维对比想定。`,
  ].join('\n\n')
}

export function buildUraniumScenarioPlan(userGoal, draft = {}) {
  const factors = ['事件强度倍率', '库存目标', '长协采购比例', '供应来源组合'].map(name => ({ name }))
  const responses = ['采购成本', '需求缺口', '库存覆盖年限', '风险暴露'].map(name => ({ name }))
  const understanding = `围绕“${userGoal}”，在 ${draft.start_year || 2024}–${draft.end_year || 2030} 年窗口内，对比供应冲击下的采购、库存和来源分散策略。`
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
      start_year: draft.start_year || 2024, end_year: draft.end_year || 2030,
      optimization_iterations: draft.optimization_iterations || 1,
      event_severity_multiplier: draft.event_severity_multiplier ?? 1,
    } },
  }
  plan.candidate_plans = [
    {
      preset_name: 'balanced',
      title: '基准方案 (常态履约平衡)',
      focus: '长协履约为主，兼顾到岸完全成本、风险暴露与库存覆盖。',
      status: '基准',
      kind: 'main',
      long_term_ratio: '85%',
      spot_limit: '15%',
      target_stock: '1.5 年 (540天)',
      corridor_split: '海运 40% : 陆运 60%',
      reserve_action: '常规备用 (不主动借调)',
      premium_cap: '+10%',
      reactor_trip_risk: '2.1%',
      cif_cost_estimate: '$246.80/kgU'
    },
    {
      preset_name: 'security_first',
      title: '保供优先方案 (核安全刚性保障)',
      focus: '允许现货溢价最高+35%，提升海运长协与现货配额至50%，启动中央储备200tU平抑，确保关键机组零停堆。',
      status: '推荐',
      kind: 'compare',
      long_term_ratio: '70%',
      spot_limit: '30%',
      target_stock: '2.5 年 (900天)',
      corridor_split: '海运 55% : 陆运 45%',
      reserve_action: '紧急释放 200 tU 补位',
      premium_cap: '+35%',
      reactor_trip_risk: '0.0%',
      cif_cost_estimate: '$254.20/kgU'
    },
    {
      preset_name: 'cost_first',
      title: '成本优先方案 (严控现货溢价)',
      focus: '严控现货采购在 $80/lb 以下，不启用高运费航线，主要依靠基地间库存横向转运平摊。',
      status: '成本',
      kind: 'support',
      long_term_ratio: '95%',
      spot_limit: '5%',
      target_stock: '1.0 年 (360天)',
      corridor_split: '海运 30% : 陆运 70%',
      reserve_action: '不启用储备',
      premium_cap: '0% (限价拒采)',
      reactor_trip_risk: '6.5%',
      cif_cost_estimate: '$238.50/kgU'
    },
    {
      preset_name: 'shock_response',
      title: '地缘极端冲击方案 (陆路通量受限30%)',
      focus: '测算中哈铁路口岸通量受限30%情景下，测试远洋危化专线最大吞吐弹性与储备全额借调能力。',
      status: '冲击',
      kind: 'edge',
      long_term_ratio: '60%',
      spot_limit: '40%',
      target_stock: '2.0 年 (720天)',
      corridor_split: '海运 70% : 陆运 30%',
      reserve_action: '全面启动 600 tU 调拨',
      premium_cap: '+50%',
      reactor_trip_risk: '0.8%',
      cif_cost_estimate: '$268.00/kgU'
    }
  ].map((item, index) => ({
    ...item,
    name: `方案 ${index + 1}`,
    params: {
      ...plan.exp_params.params,
      preset_name: item.preset_name,
      long_term_ratio: item.long_term_ratio,
      spot_limit: item.spot_limit,
      target_stock: item.target_stock,
      corridor_split: item.corridor_split,
      reserve_action: item.reserve_action,
      premium_cap: item.premium_cap,
      reactor_trip_risk: item.reactor_trip_risk,
      cif_cost_estimate: item.cif_cost_estimate,
      ...(item.preset_name === 'shock_response' ? { starting_price_usd_per_lb: 95 } : {}),
    },
  }))
  return { ...plan, exp_plan: { ...plan } }
}
