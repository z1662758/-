/**
 * 铀场景 Agent 角色库（建模基线）
 *
 * 结构参考 MACE 实验设计 schema 的 AgentSpec：
 *   role            身份与背景 / 制度背景 / 核心目标 / 行为底线
 *   decision_posture 决策风格 / 风险偏好 / 关注信息优先级 / 典型行动
 *   attributes      属性及取值范围（attribute_meta），数值来自 configs/uranium_agent_config.yaml
 *   cognition       认知模型：智能等级 → 决策策略；OODA 四阶段各自处理的信息
 *
 * 角色按供应链层级（supply / transport / manufacturing / sales）定义，
 * 具体实体（哈萨克矿山、南方燃料基地…）通过 resolveUraniumAgentRole 叠加实体信息。
 */

import { resolveTier } from '@/views/SCnet/composables/scnetCatalogAdapter_uranium'
import {
  URANIUM_MANUFACTURER_ACTORS,
  URANIUM_SUPPLIER_ACTORS
} from '@/views/SCnet/mock/uraniumDemoLab'

// OODA 阶段：颜色取自已校验的分类调色板前四档
export const URANIUM_OODA_STAGES = Object.freeze([
  { key: 'observe', label: 'Observe', zh: '观察', color: '#2a78d6' },
  { key: 'orient', label: 'Orient', zh: '判断', color: '#eb6834' },
  { key: 'decide', label: 'Decide', zh: '决策', color: '#1baf7a' },
  { key: 'act', label: 'Act', zh: '行动', color: '#eda100' }
])

// 智能等级分布（intelligence_levels）
export const URANIUM_INTELLIGENCE_LEVELS = Object.freeze([
  { key: 'low', label: '低', share: 0.3, strategy: 'random', description: '成本加成定价，随机产能分配', color: '#2a78d6' },
  { key: 'medium', label: '中', share: 0.5, strategy: 'greedy', description: '市场跟随定价，按供需比调整策略', color: '#eb6834' },
  { key: 'high', label: '高', share: 0.2, strategy: 'PPO 强化学习', description: '强化学习优化定价与产能分配（state 25 维，最多 8 个动作）', color: '#1baf7a' }
])

// 评估器权重（observer.evaluation_weights）
export const URANIUM_OBSERVER_WEIGHTS = Object.freeze([
  { key: 'supply_reliability', label: '供应可靠性', weight: 0.3 },
  { key: 'cost_efficiency', label: '成本效率', weight: 0.25 },
  { key: 'risk_diversification', label: '风险分散度', weight: 0.2 },
  { key: 'network_resilience', label: '网络韧性', weight: 0.15 },
  { key: 'inventory_adequacy', label: '库存充足度', weight: 0.1 }
])

// 规划器（planner）
export const URANIUM_PLANNER = Object.freeze({
  parameterSpace: ['spot_price_usd_lb', 'risk_aversion', 'diversification_target', 'cost_sensitivity', 'policy_compliance'],
  convergenceThreshold: 0.03,
  maxIterations: 50,
  knowledgeSharing: { elitePercent: 0.2, decay: 0.95, maxAgeMonths: 3 },
  evolutionEnabled: false,
  timeStepUnit: '年',
  calibrationWindow: '1997 – 2024'
})

export const URANIUM_AGENT_ROLE_LIBRARY = Object.freeze({
  supply: {
    tier: 'supply',
    label: '供给方 Agent',
    camp: '海外供给',
    agentClass: 'SupplierAgent',
    modelingMethod: 'OODA',
    countHint: '矿企 / 资源国',
    role: {
      identity: '资源国矿企或国家铀公司，掌握矿山产能、成本层级与出口配额。',
      institutional_context: '受本国出口审批、国际制裁与长协惯例约束；产量受矿山品位、硫酸等辅料供给和地浸工艺限制。',
      goal: '在保障长协履约的前提下最大化销售收入，维持产能利用率与客户结构稳定。',
      constraints: ['不得超出矿山年度产能与出口配额', '制裁或禁令生效时停止对应方向发运', '长协交付优先于现货投放']
    },
    decision_posture: {
      style: '产能约束下的价格跟随',
      risk_appetite: '中',
      information_priority: ['现货与长协价差', '本国政策与制裁动态', '运输通道拥堵与保险成本'],
      typical_actions: ['调整报价与现货投放量', '按合同优先级分配发运', '受扰动时启用替代运输路径']
    },
    attributes: [
      { key: 'capacity_tU', label: '年产能', unit: 'tU/年', type: 'range', range: [500, 25000] },
      { key: 'operating_cost_usd_kgU', label: '运营成本', unit: 'USD/kgU', type: 'range', range: [20, 130] },
      { key: 'policy_risk', label: '政策许可风险', type: 'float', range: [0, 0.8] },
      { key: 'geopolitical_risk', label: '地缘政治风险', type: 'float', range: [0, 0.8] },
      { key: 'transport_risk', label: '运输风险', type: 'float', range: [0, 0.6] }
    ],
    enums: [
      { label: '成本层级', values: ['<$40/kgU', '<$80/kgU', '<$130/kgU', '>$130/kgU'] },
      { label: '开采方法', values: ['ISL 地浸', '露天', '地下', '混合', '副产品'] }
    ],
    cognition: {
      observe: ['现货 / 长协价格', '采购询价与合同请求', '政策与制裁事件'],
      orient: ['成本层级与利润率', '履约压力与库存', '竞争对手报价'],
      decide: ['报价水平', '产能与配额分配', '发运路径选择'],
      act: ['签约交付', '产能调整', '路径切换']
    }
  },
  transport: {
    tier: 'transport',
    label: '运输通道 Agent',
    camp: '通道 / 口岸',
    agentClass: 'RouteNode',
    modelingMethod: '规则式',
    countHint: '陆运 / 海运通道',
    role: {
      identity: '连接海外矿区与国内接卸节点的运输通道，包括中亚铁路、跨里海走廊与远洋海运航线。',
      institutional_context: '受口岸通关效率、港口拥堵、航运保险与过境国安全形势影响，不参与价格博弈。',
      goal: '按计划时效完成运量交付，扰动发生时把延误与风险如实传导给上下游。',
      constraints: ['不改变货权与合同条款', '通行能力受口岸与船期硬约束', '风险由事件库驱动，不自主决策']
    },
    decision_posture: {
      style: '被动传导',
      risk_appetite: '无（规则驱动）',
      information_priority: ['口岸与港口拥堵事件', '航运保险与制裁限制', '季节与地缘扰动'],
      typical_actions: ['按运力分摊运量', '拥堵时延长交付周期', '触发替代路径评估']
    },
    attributes: [
      { key: 'transit_days', label: '在途时间', unit: '天', type: 'range', range: [20, 75] },
      { key: 'capacity_share', label: '通道运力份额', type: 'float', range: [0, 1] },
      { key: 'disruption_probability', label: '年度扰动概率', type: 'float', range: [0, 0.3] }
    ],
    enums: [
      { label: '通道类型', values: ['陆运（中亚铁路 / 西北口岸）', '海运（大西洋 / 印度洋 / 太平洋）', '陆海联运（贝宁走廊）'] }
    ],
    cognition: {
      observe: ['运量请求', '拥堵与通关事件'],
      orient: ['运力余量与在途时间'],
      decide: ['运量分摊', '延误传导'],
      act: ['交付到港', '延误告警']
    }
  },
  manufacturing: {
    tier: 'manufacturing',
    label: '制造方 Agent',
    camp: '国内制造',
    agentClass: 'ManufacturerAgent',
    modelingMethod: 'OODA',
    countHint: '燃料制造 / 接卸节点',
    role: {
      identity: '国家级核燃料公司下属的燃料组件基地与沿海接卸节点，代表国内采购与转化环节。',
      institutional_context: '承担国家保供责任，采购须满足政策合规、供给来源分散与安全库存要求。',
      goal: '以可接受成本保障年度燃料需求，维持库存覆盖目标并降低对单一来源的依赖。',
      constraints: ['政策合规优先于成本', '目标供给方数量 1–5 个', '库存覆盖不低于最低比例']
    },
    decision_posture: {
      style: '多目标加权采购',
      risk_appetite: '偏保守（风险厌恶 0.2–0.8 可调）',
      information_priority: ['供给方政策与地缘稳定性', '履约可靠性与历史表现', '成本经济性与运输可靠性'],
      typical_actions: ['按偏好权重为供给方评分并分配采购量', '上调长协比例与库存目标', '切换接卸港口与转运方式']
    },
    attributes: [
      { key: 'demand_tU', label: '年度需求', unit: 'tU/年', type: 'range', range: [1000, 11000] },
      { key: 'inventory_target_years', label: '库存目标', unit: '年', type: 'range', range: [2, 5] },
      { key: 'processing_capacity_tU', label: '处理能力', unit: 'tU/年', type: 'range', range: [2000, 10000] },
      { key: 'risk_aversion', label: '风险厌恶', type: 'float', range: [0.2, 0.8] },
      { key: 'cost_sensitivity', label: '成本敏感度', type: 'float', range: [0.2, 0.8] },
      { key: 'diversification_target', label: '目标供给方数量', type: 'int', range: [1, 5] }
    ],
    preferenceWeights: [
      { key: 'policy_safety', label: '政策安全性', weight: 0.2 },
      { key: 'cost_efficiency', label: '成本经济性', weight: 0.2 },
      { key: 'reliability', label: '履约可靠性', weight: 0.2 },
      { key: 'geo_stability', label: '地缘稳定性', weight: 0.15 },
      { key: 'transport_safety', label: '运输可靠性', weight: 0.1 },
      { key: 'historical_performance', label: '历史表现', weight: 0.15 }
    ],
    enums: [
      { label: '实体类型', values: ['国家级公司', '港口', '转化 / 浓缩设施'] }
    ],
    cognition: {
      observe: ['市场价格与事件', '供给方报价与风险画像', '自身库存与需求计划'],
      orient: ['六维偏好权重评分', '库存目标与缺口', '来源集中度'],
      decide: ['采购量分配', '长协 / 现货比例', '接卸港口选择'],
      act: ['签约采购', '库存补充', '份额调整']
    }
  },
  sales: {
    tier: 'sales',
    label: '需求端 Agent',
    camp: '核电需求',
    agentClass: 'DemandNode',
    modelingMethod: '规则式',
    countHint: '核电需求主体',
    role: {
      identity: '在运与在建核电机组的燃料需求汇总，代表终端消耗。',
      institutional_context: '需求由装机规模与换料周期决定，年增长率约 1%，受高需求情景与政策目标影响。',
      goal: '按换料计划稳定获得核燃料，把库存消耗与缺口信号反馈给制造方。',
      constraints: ['需求不因价格短期波动改变', '缺口不能通过削减发电吸收']
    },
    decision_posture: {
      style: '计划驱动',
      risk_appetite: '无（规则驱动）',
      information_priority: ['换料计划', '库存覆盖', '新增机组投运'],
      typical_actions: ['发布年度需求计划', '反馈库存消耗与缺口']
    },
    attributes: [
      { key: 'annual_demand_tU', label: '年度需求', unit: 'tU/年', type: 'range', range: [9000, 14000] },
      { key: 'demand_growth_rate', label: '需求年增长率', type: 'float', range: [0, 0.03] }
    ],
    enums: [],
    cognition: {
      observe: ['机组运行与换料计划'],
      orient: ['库存覆盖年数'],
      decide: ['需求计划'],
      act: ['需求下达', '缺口反馈']
    }
  },
  other: {
    tier: 'other',
    label: '其他实体',
    camp: '未分类',
    agentClass: '',
    modelingMethod: '规则式',
    countHint: '实体',
    role: { identity: '', institutional_context: '', goal: '', constraints: [] },
    decision_posture: { style: '', risk_appetite: '', information_priority: [], typical_actions: [] },
    attributes: [],
    enums: [],
    cognition: { observe: [], orient: [], decide: [], act: [] }
  }
})

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '')
}

function matchSupplierActor(agentLike) {
  const id = normalizeText(agentLike?.id)
  const name = normalizeText(agentLike?.name)
  return URANIUM_SUPPLIER_ACTORS.find((actor) => {
    const actorId = normalizeText(actor.id)
    const actorName = normalizeText(actor.name)
    const company = normalizeText(actor.company)
    const country = normalizeText(actor.country)
    return (actorId && id === actorId)
      || (actorName && name === actorName)
      || (company && name.includes(company))
      || (country && name.includes(country))
  }) || null
}

function matchManufacturerActor(agentLike) {
  const id = normalizeText(agentLike?.id)
  const name = normalizeText(agentLike?.name)
  return URANIUM_MANUFACTURER_ACTORS.find((actor) => {
    const actorId = normalizeText(actor.id)
    const actorName = normalizeText(actor.name)
    const group = normalizeText(actor.group)
    const facility = normalizeText(actor.facility)
    return (actorId && id === actorId)
      || (actorName && name === actorName)
      || (facility && name.includes(facility))
      || (group && name.includes(group))
  }) || null
}

/**
 * 解析某个实体（画布节点 data / 目录实体 / 参考图 agent）对应的角色卡。
 * 返回值 = 层级角色卡 + 实体专属信息（国家、通道、港口、基线风险…）。
 */
export function resolveUraniumAgentRole(agentLike = {}) {
  const tier = agentLike?.tier || agentLike?.category || resolveTier(agentLike)
  const base = URANIUM_AGENT_ROLE_LIBRARY[tier] || URANIUM_AGENT_ROLE_LIBRARY.other

  const facts = []
  if (tier === 'supply') {
    const actor = matchSupplierActor(agentLike)
    if (actor) {
      facts.push(
        { label: '国家', value: actor.country },
        { label: '资产', value: actor.asset },
        { label: '开采方法', value: actor.mining_method },
        { label: '参考路线', value: `${actor.reference_route_name} · ${actor.reference_path}` },
        { label: '参考运量', value: `${actor.reference_volume_ktu} ktU/年` },
        { label: '基线风险', value: actor.base_risk, type: 'risk' }
      )
      if (actor.activation_year) facts.push({ label: '投产年份', value: String(actor.activation_year) })
    }
  } else if (tier === 'manufacturing') {
    const actor = matchManufacturerActor(agentLike)
    if (actor) {
      facts.push(
        { label: '集团', value: actor.group },
        { label: '区域', value: actor.city_cluster },
        { label: '接卸港', value: actor.port_name },
        { label: '职能', value: actor.function_label }
      )
    }
  }

  return {
    ...base,
    tier,
    facts,
    displayName: agentLike?.name || base.label
  }
}

/** 按层级统计参考实体数量：供 建模设定 / 实体图 顶部统计使用 */
export function summarizeTierCounts(agents = []) {
  return agents.reduce((acc, agent) => {
    const tier = agent?.tier || agent?.category || resolveTier(agent)
    acc[tier] = (acc[tier] || 0) + 1
    return acc
  }, {})
}
