/**
 * 供应链决策树演示数据 - 纯 Mock
 * 参考 MACE-FE2-ref/raincity/DecisionTreeAnalysis.vue 的范式，
 * 把场景从人群疏导改写为供应链调度。
 */

export const SCENARIO_OPTIONS = {
  rawShortage: '原材料供应中断',
  regionalDemandSurge: '区域销量激增',
  logisticsCongestion: '物流网络拥堵'
}

export const TIME_NODE_OPTIONS = [
  { label: '事件初发', value: 0 },
  { label: '影响峰值', value: 1 },
  { label: '尾声收口', value: 2 }
]

export const EVENT_NAME_MAP = {
  rawShortage: {
    0: 'T0(D-3) 主供应商交付延迟15%通报',
    1: 'T1(D0) 关键物料断供，产线缺料预警',
    2: 'T2(D+2) 替代渠道部分到货，恢复爬坡'
  },
  regionalDemandSurge: {
    0: 'T0(D-1) 华东区域订单环比上涨42%',
    1: 'T1(D0) 区域订单超出预测80%，订单堆积',
    2: 'T2(D+1) 订单回落至高位平台期'
  },
  logisticsCongestion: {
    0: 'T0(D-1) 主干物流通道车辆排队上升',
    1: 'T1(D0) 干线运力缺口扩大，时效跌至60%',
    2: 'T2(D+1) 应急运力上线，时效回升中'
  }
}

export const BASELINE_EVENT_METRICS = {
  rawShortage: {
    0: { event: 'T0(D-3) 主供应商交付延迟15%通报', stockoutRate: 8.2, fulfillmentRate: 92, score: 60 },
    1: { event: 'T1(D0) 关键物料断供，产线缺料预警', stockoutRate: 18.4, fulfillmentRate: 76, score: 52 },
    2: { event: 'T2(D+2) 替代渠道部分到货，恢复爬坡', stockoutRate: 11.2, fulfillmentRate: 85, score: 64 }
  },
  regionalDemandSurge: {
    0: { event: 'T0(D-1) 华东区域订单环比上涨42%', stockoutRate: 5.6, fulfillmentRate: 90, score: 63 },
    1: { event: 'T1(D0) 区域订单超出预测80%，订单堆积', stockoutRate: 14.8, fulfillmentRate: 78, score: 55 },
    2: { event: 'T2(D+1) 订单回落至高位平台期', stockoutRate: 7.4, fulfillmentRate: 88, score: 66 }
  },
  logisticsCongestion: {
    0: { event: 'T0(D-1) 主干物流通道车辆排队上升', stockoutRate: 6.0, fulfillmentRate: 88, score: 61 },
    1: { event: 'T1(D0) 干线运力缺口扩大，时效跌至60%', stockoutRate: 16.5, fulfillmentRate: 64, score: 50 },
    2: { event: 'T2(D+1) 应急运力上线，时效回升中', stockoutRate: 9.0, fulfillmentRate: 82, score: 65 }
  }
}

/** 工具：短标签 */
function shortLabel(text, maxLen = 10) {
  if (!text) return '未命名'
  const compact = text.replace(/：/g, ' ').replace(/\+/g, ' / ').replace(/\s+/g, ' ').trim()
  return compact.length > maxLen ? `${compact.slice(0, maxLen)}…` : compact
}

// 决策主体对齐后端推演 camp（采购方 / 制造商 / 系统）：按场景定位主责角色
const SCENE_CAMP = {
  rawShortage: '采购方',
  regionalDemandSurge: '制造商',
  logisticsCongestion: '系统'
}
function actorFor(id) {
  return SCENE_CAMP[inferSceneFromId(id)] || '系统'
}

function leaf(id, action, desc, prob, outcome) {
  return {
    id,
    name: shortLabel(action, 8),
    actor: actorFor(id),
    action,
    desc,
    depth: 2,
    prob,
    isLeaf: true,
    outcome
  }
}

function strategy(id, action, desc, prob, children) {
  return {
    id,
    name: shortLabel(action, 10),
    actor: actorFor(id),
    action,
    desc,
    depth: 1,
    prob,
    reasoning: buildReasoning(id, action, desc),
    children
  }
}

function root(id, name, action, desc, children) {
  return {
    id,
    name: shortLabel(name, 10),
    actor: actorFor(id),
    action,
    desc,
    depth: 0,
    prob: 1,
    reasoning: buildReasoning(id, action, desc),
    children
  }
}

function inferSceneFromId(id) {
  if (!id) return 'generic'
  if (id.startsWith('rs-')) return 'rawShortage'
  if (id.startsWith('rd-')) return 'regionalDemandSurge'
  if (id.startsWith('lc-')) return 'logisticsCongestion'
  return 'generic'
}

export function buildKnowledgeSources(id) {
  const scene = inferSceneFromId(id)
  if (scene === 'rawShortage') {
    return [
      { type: '应急预案', name: '供应链中断三级响应预案（2026版）', snippet: '规定关键物料断供时的备选寻源、限量配给与库存调拨触发顺序。' },
      { type: '联动手册', name: '采购-物流-销售联合调度作业手册', snippet: '明确替代供应商引入、应急运力切换、销售口径同步的协同机制。' },
      { type: '历史复盘', name: '2024Q3 华东原材料断供复盘报告', snippet: '沉淀了替代渠道激活时长、限量配给客户响应度等关键参数。' }
    ]
  }
  if (scene === 'regionalDemandSurge') {
    return [
      { type: '应急预案', name: '区域需求异常激增分级处置预案', snippet: '规定订单激增触发跨区调配、产能临时扩展和限购控量的判定阈值。' },
      { type: '联动手册', name: '生产-仓储-销售三方联动手册', snippet: '定义生产排程加点、仓储调拨、销售限购的执行流程。' },
      { type: '历史复盘', name: '2025春节促销期华东订单激增复盘', snippet: '总结了跨区调配响应耗时与限购对客户满意度的影响曲线。' }
    ]
  }
  if (scene === 'logisticsCongestion') {
    return [
      { type: '应急预案', name: '物流网络拥堵分级响应预案', snippet: '定义主干通道拥堵分级触发承运切换、削峰错配的执行条件。' },
      { type: '联动手册', name: '干线-支线-末端运力协同手册', snippet: '说明应急承运商招募、仓网重排和时效承诺调整的协作要点。' },
      { type: '历史复盘', name: '2024Q4 长三角寒潮干线拥堵复盘', snippet: '记录了多承运商切换的恢复曲线和客户时效承诺调整的影响。' }
    ]
  }
  return [
    { type: '应急预案', name: '供应链通用应急处置预案', snippet: '用于快速形成基础响应策略。' }
  ]
}

export function buildThinkingSteps(action, desc) {
  return [
    `识别关键风险：${shortLabel(desc, 28)}`,
    `匹配策略模板：围绕"${shortLabel(action, 14)}"进行可行性筛选`,
    '评估资源约束与执行窗口，优先保障履约连续性并控制库存与成本波动',
    '输出分支概率并生成下一层响应预测，用于实时校正调度决策'
  ]
}

export function buildReasoning(id, action, desc) {
  return {
    thinkingSteps: buildThinkingSteps(action, desc),
    sources: buildKnowledgeSources(id)
  }
}

export const TREE_DATA = {
  rawShortage: {
    0: root(
      'rs-0-root',
      '主供应商交付延迟通报',
      'T0(D-3) 主供应商通报延迟15%',
      '采购系统在D-3收到主供应商交付延迟通报，影响下游一周内的生产排程，需要在24小时内确定补救方案。',
      [
        strategy('rs-0-a', '紧急寻替：启用 B 级备选供应商', '从备选名单中激活 B 级供应商进行小批量验证，控制断供风险。', 0.34, [
          leaf('rs-0-a-1', '备选供应商如期承接小批量', '24小时内完成质量取样，B 级供应商接单率达预期。', 0.7, { situation: '替代渠道补量到位，缺料概率显著下降。', riskLevel: '中低', fulfillmentRate: '88%', score: 84 }),
          leaf('rs-0-a-2', '备选供应商交期延后24小时', '小批量验证通过，但首批装车延迟。', 0.3, { situation: '首批仍有小缺口，需要叠加库存调拨。', riskLevel: '中', fulfillmentRate: '74%', score: 70 })
        ]),
        strategy('rs-0-b', '限量配给：优先保障核心订单', '设定 SKU 优先级阈值，向 A 类客户倾斜配额。', 0.33, [
          leaf('rs-0-b-1', '核心客户履约维稳', '腰部客户配额下调8%，核心客户全量履约。', 0.62, { situation: '核心客户满意度持稳，腰部客户出现少量投诉。', riskLevel: '中', fulfillmentRate: '82%', score: 76 }),
          leaf('rs-0-b-2', '腰部客户响应强烈', '腰部客户集中反馈，要求开放配额。', 0.38, { situation: '客服压力上升，需补充沟通方案。', riskLevel: '中高', fulfillmentRate: '69%', score: 63 })
        ]),
        strategy('rs-0-c', '库存调拨：跨仓快速补位', '将华南/西南仓的安全库存空运至华东缺口仓。', 0.33, [
          leaf('rs-0-c-1', '跨仓调拨高效到位', '空运通道24小时内补足关键 SKU。', 0.58, { situation: '缺料问题被快速止血，但物流成本上升11%。', riskLevel: '低', fulfillmentRate: '90%', score: 86 }),
          leaf('rs-0-c-2', '调拨节奏偏慢', '受空运舱位影响，部分批次延迟到货。', 0.42, { situation: '关键 SKU 缓解有限，仍需补充寻源。', riskLevel: '中', fulfillmentRate: '76%', score: 68 })
        ])
      ]
    ),
    1: root(
      'rs-1-root',
      '关键物料断供影响峰值',
      'T1(D0) 产线缺料预警',
      '主供应商交付缺口扩大至30%，多条产线进入缺料预警，必须在12小时内组合多策略止血。',
      [
        strategy('rs-1-a', '替代寻源 + 联合 VMI 模式', '与 B/C 级供应商签订紧急 VMI 协议，由其前置备料。', 0.34, [
          leaf('rs-1-a-1', 'VMI 模式快速搭建', '紧急 VMI 24小时落地，备料覆盖率达 78%。', 0.66, { situation: '产线缺料风险明显下降，履约率回升至 82%。', riskLevel: '中低', fulfillmentRate: '82%', score: 83 }),
          leaf('rs-1-a-2', '部分 SKU 验厂未通过', '少量替代物料未通过质量验厂。', 0.34, { situation: '产线产能利用率仍有缺口，需限量配给配合。', riskLevel: '中', fulfillmentRate: '70%', score: 68 })
        ]),
        strategy('rs-1-b', '动态限产 + SKU 优先级调度', '按订单优先级动态调整产线 SKU 组合，避免低价值 SKU 占用稀缺物料。', 0.33, [
          leaf('rs-1-b-1', '优先级调度落地', 'A 类订单履约率维持 92% 以上。', 0.61, { situation: '核心订单稳定履约，整体产能利用率下降6%。', riskLevel: '中', fulfillmentRate: '79%', score: 80 }),
          leaf('rs-1-b-2', '次级订单延期外溢', '中长尾订单履约延期，被客户提出投诉。', 0.39, { situation: '客户满意度受损，需销售口径配合。', riskLevel: '中高', fulfillmentRate: '66%', score: 64 })
        ]),
        strategy('rs-1-c', '应急集中采购 + 现金加价', '通过现金交易和加价机制，从现货市场抢购关键物料。', 0.33, [
          leaf('rs-1-c-1', '现货补给即时到位', '加价 12-15% 抢购到关键 SKU。', 0.58, { situation: '缺料瓶颈在 36 小时内被打通，履约率回升明显。', riskLevel: '低', fulfillmentRate: '85%', score: 85 }),
          leaf('rs-1-c-2', '现货质量参差不齐', '部分现货存在批次质量风险。', 0.42, { situation: '生产合格率波动，需要紧急 QC 抽检。', riskLevel: '中', fulfillmentRate: '71%', score: 67 })
        ])
      ]
    ),
    2: root(
      'rs-2-root',
      '替代渠道部分到货',
      'T2(D+2) 替代渠道爬坡',
      '主供应商修复中，备选供应商持续供货。重点是抑制库存积压并防止后期断点。',
      [
        strategy('rs-2-a', '安全库存重置 + 双源稳态', '把 B 级供应商纳入常态名单，并重置安全库存阈值。', 0.34, [
          leaf('rs-2-a-1', '稳态切换顺畅', '双源备货机制运行平稳，关键 SKU 履约率 90%+。', 0.73, { situation: '供应风险显著下降，库存周转天数控制良好。', riskLevel: '低', fulfillmentRate: '92%', score: 88 }),
          leaf('rs-2-a-2', '主供应商抗议二供份额', '主供应商对份额变化表达不满。', 0.27, { situation: '需进入商务沟通，整体执行可控。', riskLevel: '中低', fulfillmentRate: '83%', score: 76 })
        ]),
        strategy('rs-2-b', '阶梯式恢复 + 订单履约补偿', '按订单延期程度提供阶梯补偿，恢复客户信任。', 0.33, [
          leaf('rs-2-b-1', '客户信任快速修复', '延期订单履约率回升，投诉量回落 60%。', 0.64, { situation: '客户关系基本恢复，舆情风险消退。', riskLevel: '中低', fulfillmentRate: '86%', score: 82 }),
          leaf('rs-2-b-2', '补偿成本压力上升', '部分 KA 客户提出更高补偿要求。', 0.36, { situation: '本季毛利率下降 1.5pp。', riskLevel: '中', fulfillmentRate: '74%', score: 68 })
        ]),
        strategy('rs-2-c', '尾段库存优化 + 风险监测', '通过网格化监测追踪剩余风险并优化尾段库存策略。', 0.33, [
          leaf('rs-2-c-1', '风险监测精准', '尾段隐患快速识别并清零。', 0.66, { situation: '供应链恢复常态，全域风险可控。', riskLevel: '低', fulfillmentRate: '93%', score: 89 }),
          leaf('rs-2-c-2', '部分细分品类盲区', '个别低频 SKU 监测覆盖不足。', 0.34, { situation: '存在零星补货延迟，整体可控。', riskLevel: '中低', fulfillmentRate: '79%', score: 73 })
        ])
      ]
    )
  },
  regionalDemandSurge: {
    0: root(
      'rd-0-root',
      '区域订单环比上涨42%',
      'T0(D-1) 华东订单激增前置',
      '销售系统监测到华东区域多个核心 SKU 订单同比激增 42%，需要在 8 小时内做出产销协同应对。',
      [
        strategy('rd-0-a', '紧急扩产：周末加点 + 临时班', '通过加点和临时班次扩大产线产出，提前布货。', 0.34, [
          leaf('rd-0-a-1', '加点产能稳定落地', '产线产能在 24 小时内提升 18%。', 0.69, { situation: '核心 SKU 产能满足订单，库存周转天数稳定。', riskLevel: '中低', fulfillmentRate: '90%', score: 86 }),
          leaf('rd-0-a-2', '加点合规压力上升', 'HR 反馈加班合规风险。', 0.31, { situation: '需走人力审批流程，扩产节奏稍缓。', riskLevel: '中', fulfillmentRate: '78%', score: 72 })
        ]),
        strategy('rd-0-b', '跨区调配：从华北/华南调拨成品', '动用其它区域成品库存，提前调拨至华东。', 0.33, [
          leaf('rd-0-b-1', '跨区调拨高效执行', '48 小时内补足华东缺口的 70%。', 0.63, { situation: '华东履约率稳定，整体物流成本上升 8%。', riskLevel: '中低', fulfillmentRate: '87%', score: 83 }),
          leaf('rd-0-b-2', '其它区域库存吃紧', '调出区域同期出现订单波动。', 0.37, { situation: '其它区域备货紧张，需补充寻源。', riskLevel: '中', fulfillmentRate: '74%', score: 68 })
        ]),
        strategy('rd-0-c', '限购控量：单客户限购 + 团购拆分', '通过限购避免单客户囤货，平滑订单分布。', 0.33, [
          leaf('rd-0-c-1', '订单分布趋平滑', '单客户上限策略生效，库存压力下降。', 0.58, { situation: '订单履约平稳，避免恐慌性囤货。', riskLevel: '低', fulfillmentRate: '85%', score: 81 }),
          leaf('rd-0-c-2', '部分 KA 客户提出异议', '核心客户希望提高配额上限。', 0.42, { situation: '客户沟通成本上升，需要差异化方案。', riskLevel: '中', fulfillmentRate: '72%', score: 65 })
        ])
      ]
    ),
    1: root(
      'rd-1-root',
      '订单激增影响峰值',
      'T1(D0) 订单超预测80%',
      '订单实际值大幅高于预测，多个仓出现订单堆积。重点是在 12 小时内做出组合响应。',
      [
        strategy('rd-1-a', '产能爬坡 + 委外协同生产', '通过委外加工分担激增的订单产能压力。', 0.34, [
          leaf('rd-1-a-1', '委外协同顺畅', '委外厂家在 24 小时内启动批量代工。', 0.66, { situation: '产能瓶颈被打开，履约率维持 86%。', riskLevel: '中低', fulfillmentRate: '86%', score: 84 }),
          leaf('rd-1-a-2', '委外质量波动', '部分批次委外质量出现波动。', 0.34, { situation: 'QC 抽检压力上升，需要紧急介入。', riskLevel: '中', fulfillmentRate: '73%', score: 69 })
        ]),
        strategy('rd-1-b', '订单分级 + KA 优先', '按客户等级和 SLA 重要性分配履约顺序。', 0.33, [
          leaf('rd-1-b-1', '高优订单履约稳定', 'KA 订单履约率维持 94%。', 0.62, { situation: 'KA 客户稳定，长尾订单延期 24 小时。', riskLevel: '中', fulfillmentRate: '80%', score: 80 }),
          leaf('rd-1-b-2', '长尾客户外溢', '长尾客户因延期产生负面反馈。', 0.38, { situation: '客服压力上升，舆情风险增加。', riskLevel: '中高', fulfillmentRate: '67%', score: 66 })
        ]),
        strategy('rd-1-c', '弹性定价 + 限购组合', '对超预期 SKU 启用弹性定价并配合限购策略。', 0.33, [
          leaf('rd-1-c-1', '弹性定价对冲过热', '订单热度回落至可控区间。', 0.6, { situation: '订单分布趋于稳态，整体库存压力缓解。', riskLevel: '低', fulfillmentRate: '88%', score: 85 }),
          leaf('rd-1-c-2', '部分客户反弹', '客户对弹性定价表达不满。', 0.4, { situation: '需要市场口径协同，整体执行可控。', riskLevel: '中', fulfillmentRate: '70%', score: 68 })
        ])
      ]
    ),
    2: root(
      'rd-2-root',
      '订单回落高位平台期',
      'T2(D+1) 订单进入平台期',
      '订单热度回落至高位但平稳，重点是消化库存并稳态运行。',
      [
        strategy('rd-2-a', '产能回退 + 安全库存重置', '按需调整产能和安全库存阈值，避免过剩。', 0.34, [
          leaf('rd-2-a-1', '产能与库存平稳过渡', '安全库存阈值上调 12%，新常态形成。', 0.71, { situation: '生产销售协同顺畅，库存周转保持稳定。', riskLevel: '低', fulfillmentRate: '91%', score: 88 }),
          leaf('rd-2-a-2', '库存策略过保守', '部分 SKU 库存偏高。', 0.29, { situation: '出现短期资金压力，整体可控。', riskLevel: '中低', fulfillmentRate: '83%', score: 76 })
        ]),
        strategy('rd-2-b', '促销消化 + 渠道补差', '通过促销和渠道补差消化高位库存。', 0.33, [
          leaf('rd-2-b-1', '促销消化高效', '高位库存在 7 天内消化 70%。', 0.65, { situation: '库存压力快速下降，毛利受小幅影响。', riskLevel: '中低', fulfillmentRate: '85%', score: 81 }),
          leaf('rd-2-b-2', '促销激发新一轮订单', '促销激发新一轮订单热度。', 0.35, { situation: '需重新评估产销节奏，整体可控。', riskLevel: '中', fulfillmentRate: '74%', score: 70 })
        ]),
        strategy('rd-2-c', '渠道精细化运营 + 趋势监测', '建立长期趋势监测，避免后续抖动。', 0.33, [
          leaf('rd-2-c-1', '趋势监测精准', '后续 30 天订单预测精度 ±3%。', 0.63, { situation: '供需匹配进入稳态，长期风险可控。', riskLevel: '低', fulfillmentRate: '92%', score: 87 }),
          leaf('rd-2-c-2', '部分区域预测误差', '少数末端市场预测误差偏大。', 0.37, { situation: '需要持续校准，整体可控。', riskLevel: '中低', fulfillmentRate: '78%', score: 73 })
        ])
      ]
    )
  },
  logisticsCongestion: {
    0: root(
      'lc-0-root',
      '主干通道排队上升',
      'T0(D-1) 干线运力承压预警',
      '主干物流通道车辆排队上升，预计 24 小时内时效跌至 70%，需要前置应对。',
      [
        strategy('lc-0-a', '切换承运 + 多承运商并行', '激活备选承运商，把订单分流到多家承运商。', 0.34, [
          leaf('lc-0-a-1', '多承运商分流到位', '订单分流到 3 家承运商，时效保持 80%。', 0.7, { situation: '主干压力释放，时效稳定在合格线以上。', riskLevel: '中低', fulfillmentRate: '88%', score: 85 }),
          leaf('lc-0-a-2', '部分承运商运力紧张', '一家承运商出现接单偏慢。', 0.3, { situation: '需要补充承运资源，整体可控。', riskLevel: '中', fulfillmentRate: '74%', score: 70 })
        ]),
        strategy('lc-0-b', '仓网重排 + 就近发货', '调整仓网策略，就近发货避开主干通道。', 0.33, [
          leaf('lc-0-b-1', '就近发货顺畅', '订单出库时效提升 12%。', 0.62, { situation: '物流效率提升，整体成本上升小幅。', riskLevel: '中低', fulfillmentRate: '85%', score: 82 }),
          leaf('lc-0-b-2', '部分仓库存不足', '部分仓出现品类库存不足。', 0.38, { situation: '需要紧急调拨，整体可控。', riskLevel: '中', fulfillmentRate: '72%', score: 67 })
        ]),
        strategy('lc-0-c', '削峰错配 + 时段调度', '通过订单出货时段错配避开主干拥堵高峰。', 0.33, [
          leaf('lc-0-c-1', '时段错配生效', '拥堵高峰订单错峰发货成功。', 0.58, { situation: '通道压力均衡，时效稳定。', riskLevel: '低', fulfillmentRate: '86%', score: 83 }),
          leaf('lc-0-c-2', '客户对到达时段敏感', '部分客户期望仍偏白天到货。', 0.42, { situation: '需差异化沟通，整体可控。', riskLevel: '中', fulfillmentRate: '71%', score: 67 })
        ])
      ]
    ),
    1: root(
      'lc-1-root',
      '干线运力缺口扩大',
      'T1(D0) 时效跌至60%',
      '运力缺口持续扩大，干线时效跌至 60%，多客户 SLA 面临违约风险。',
      [
        strategy('lc-1-a', '应急承运 + 干支联动', '在干线和支线同步招募应急承运商。', 0.34, [
          leaf('lc-1-a-1', '应急承运到位', '干支线运力补足 70%，时效回升至 75%。', 0.66, { situation: '主要 SLA 风险被释放，整体可控。', riskLevel: '中低', fulfillmentRate: '83%', score: 82 }),
          leaf('lc-1-a-2', '应急承运成本上升', '应急承运商加价 15-20%。', 0.34, { situation: '物流毛利下降 1pp，整体可控。', riskLevel: '中', fulfillmentRate: '72%', score: 68 })
        ]),
        strategy('lc-1-b', 'SLA 主动沟通 + 时效承诺调整', '主动沟通 KA 客户，调整时效承诺。', 0.33, [
          leaf('lc-1-b-1', '客户接受时效调整', '95% KA 客户接受 24h 延后承诺。', 0.61, { situation: '客户预期管理到位，违约风险下降。', riskLevel: '中', fulfillmentRate: '78%', score: 78 }),
          leaf('lc-1-b-2', '部分 KA 拒绝', '少数 KA 仍坚持原 SLA。', 0.39, { situation: '需走商务谈判，整体可控。', riskLevel: '中高', fulfillmentRate: '66%', score: 65 })
        ]),
        strategy('lc-1-c', '应急包车 + 高优订单专线', '为 A 类订单开通专线包车通道。', 0.33, [
          leaf('lc-1-c-1', '专线生效快速', 'A 类订单时效维持 85%+。', 0.58, { situation: 'A 类客户 SLA 稳定，整体物流成本上升。', riskLevel: '低', fulfillmentRate: '86%', score: 85 }),
          leaf('lc-1-c-2', '包车容量受限', '包车容量未能覆盖所有 A 类订单。', 0.42, { situation: '需补充其它运力组合，整体可控。', riskLevel: '中', fulfillmentRate: '70%', score: 68 })
        ])
      ]
    ),
    2: root(
      'lc-2-root',
      '应急运力上线时效爬坡',
      'T2(D+1) 时效回升中',
      '应急运力陆续上线，时效爬坡中。重点是切换稳态并避免反复。',
      [
        strategy('lc-2-a', '稳态承运结构重组', '将应急承运商纳入常态名单并优化合约。', 0.34, [
          leaf('lc-2-a-1', '稳态承运形成', '多承运商常态化运行，时效稳定 85%+。', 0.71, { situation: '物流弹性显著提升，长期风险可控。', riskLevel: '低', fulfillmentRate: '90%', score: 88 }),
          leaf('lc-2-a-2', '原承运商谈判紧张', '原主承运商对份额变化提出异议。', 0.29, { situation: '需走商务协商，整体可控。', riskLevel: '中低', fulfillmentRate: '82%', score: 76 })
        ]),
        strategy('lc-2-b', '客户补偿 + SLA 修复', '对延期客户分级补偿并修复 SLA 承诺。', 0.33, [
          leaf('lc-2-b-1', '客户信任修复', '延期投诉量回落 65%。', 0.64, { situation: '客户关系基本修复，整体可控。', riskLevel: '中低', fulfillmentRate: '85%', score: 81 }),
          leaf('lc-2-b-2', '补偿成本压力上升', '部分 KA 提出更高补偿要求。', 0.36, { situation: '本季物流毛利受影响，整体可控。', riskLevel: '中', fulfillmentRate: '74%', score: 68 })
        ]),
        strategy('lc-2-c', '末端网格 + 风险监测', '通过末端网格监测尾段风险。', 0.33, [
          leaf('lc-2-c-1', '尾段监测精准', '末端隐患快速识别。', 0.66, { situation: '物流网络稳健恢复，风险可控。', riskLevel: '低', fulfillmentRate: '92%', score: 89 }),
          leaf('lc-2-c-2', '部分末端盲区', '个别偏远区域监测覆盖不足。', 0.34, { situation: '存在零星滞留，整体可控。', riskLevel: '中低', fulfillmentRate: '79%', score: 73 })
        ])
      ]
    )
  }
}

export const BASELINE_BRANCH_DATA = {
  rawShortage: {
    0: {
      action: '未干预：被动等待主供应商修复',
      desc: '若不启动备选寻源或库存调拨，仅依赖主供应商主动修复，履约风险持续暴露。',
      children: [
        leaf('rs-0-raw-1', '产线被迫降速运行', '关键 SKU 缺料持续，产能利用率下降。', 0.58, { situation: '产能利用率跌至 75%，订单延期上升。', riskLevel: '高', fulfillmentRate: '70%', score: 54 }),
        leaf('rs-0-raw-2', '客户被动接受延期', '与客户沟通延后，整体满意度受损。', 0.42, { situation: '客户投诉上升，舆情风险增大。', riskLevel: '中高', fulfillmentRate: '75%', score: 60 })
      ]
    },
    1: {
      action: '未干预：缺料状态持续放大',
      desc: '在缺料峰值阶段若不做组合响应，产线大面积停摆风险显著上升。',
      children: [
        leaf('rs-1-raw-1', '产线大面积停摆', '多条产线被迫停产或转产。', 0.6, { situation: '产能严重下降，履约率跌至临界。', riskLevel: '高', fulfillmentRate: '62%', score: 48 }),
        leaf('rs-1-raw-2', '订单大规模违约', 'KA 订单出现集中违约。', 0.4, { situation: '违约成本与客户流失风险加剧。', riskLevel: '高', fulfillmentRate: '66%', score: 53 })
      ]
    },
    2: {
      action: '未干预：替代渠道未常态化',
      desc: '若不重置安全库存与双源机制，类似事件将反复发生。',
      children: [
        leaf('rs-2-raw-1', '尾段风险长期残留', '后续若再次断供，风险将再次暴露。', 0.56, { situation: '长期供应风险持续高位。', riskLevel: '中高', fulfillmentRate: '76%', score: 60 }),
        leaf('rs-2-raw-2', '客户信任修复缓慢', '客户对供应稳定性持续担忧。', 0.44, { situation: '续约率下降 6%。', riskLevel: '中高', fulfillmentRate: '79%', score: 64 })
      ]
    }
  },
  regionalDemandSurge: {
    0: {
      action: '未干预：被动接单',
      desc: '若不启动跨区调配或限购，订单激增将快速压垮区域产销链路。',
      children: [
        leaf('rd-0-raw-1', '区域库存快速消耗', '区域库存数日内告急。', 0.57, { situation: '局部 SKU 缺货率上升，订单延期。', riskLevel: '中高', fulfillmentRate: '74%', score: 58 }),
        leaf('rd-0-raw-2', '部分客户提前囤货', '出现恐慌性囤货行为。', 0.43, { situation: '订单分布失衡，加剧后续波动。', riskLevel: '中', fulfillmentRate: '78%', score: 63 })
      ]
    },
    1: {
      action: '未干预：订单堆积无组合响应',
      desc: '在订单峰值若不做产能爬坡或分级，长尾客户和库存将同时承压。',
      children: [
        leaf('rd-1-raw-1', '订单堆积严重', '订单履约延期超 72 小时。', 0.61, { situation: '客户满意度大幅下滑。', riskLevel: '高', fulfillmentRate: '62%', score: 50 }),
        leaf('rd-1-raw-2', '客服压力爆表', '投诉集中爆发，客服无法及时响应。', 0.39, { situation: '舆情风险显著上升。', riskLevel: '高', fulfillmentRate: '66%', score: 56 })
      ]
    },
    2: {
      action: '未干预：库存策略不调整',
      desc: '若不重置安全库存或调整销售节奏，订单回落后将产生过剩库存。',
      children: [
        leaf('rd-2-raw-1', '高位库存难以消化', '库存周转天数显著拉长。', 0.55, { situation: '资金占用上升，毛利受压。', riskLevel: '中', fulfillmentRate: '78%', score: 64 }),
        leaf('rd-2-raw-2', '低价清库带来连锁效应', '低价清库扰乱价格体系。', 0.45, { situation: '渠道价格信号紊乱。', riskLevel: '中高', fulfillmentRate: '74%', score: 60 })
      ]
    }
  },
  logisticsCongestion: {
    0: {
      action: '未干预：依赖主承运商自然恢复',
      desc: '若不切换承运或调整时效承诺，主干拥堵将直接传导至客户 SLA。',
      children: [
        leaf('lc-0-raw-1', '主干时效持续下滑', '主干通道时效跌至 65%。', 0.58, { situation: '订单延期上升，违约风险显现。', riskLevel: '中高', fulfillmentRate: '72%', score: 60 }),
        leaf('lc-0-raw-2', '客户预期管理缺位', '客户对时效下降毫无准备。', 0.42, { situation: '客户预期落差大，投诉增加。', riskLevel: '中', fulfillmentRate: '76%', score: 63 })
      ]
    },
    1: {
      action: '未干预：运力缺口持续放大',
      desc: '在峰值阶段若不引入应急承运或专线，SLA 违约将集中爆发。',
      children: [
        leaf('lc-1-raw-1', 'SLA 集中违约', 'KA 订单集中违约。', 0.6, { situation: '违约成本与商誉双重损失。', riskLevel: '高', fulfillmentRate: '58%', score: 46 }),
        leaf('lc-1-raw-2', '末端囤压排队加剧', '末端仓库爆仓排队。', 0.4, { situation: '末端作业效率严重下降。', riskLevel: '高', fulfillmentRate: '64%', score: 52 })
      ]
    },
    2: {
      action: '未干预：承运结构未调整',
      desc: '若不沉淀应急承运商进入常态名单，类似事件将再次冲击网络。',
      children: [
        leaf('lc-2-raw-1', '物流弹性长期不足', '后续若再次出现拥堵，恢复时间将再次拉长。', 0.55, { situation: '长期物流风险持续暴露。', riskLevel: '中高', fulfillmentRate: '77%', score: 62 }),
        leaf('lc-2-raw-2', '客户信任难修复', '客户对时效承诺持续怀疑。', 0.45, { situation: 'KA 客户续约率受影响。', riskLevel: '中高', fulfillmentRate: '80%', score: 66 })
      ]
    }
  }
}

/**
 * 履约率变化曲线生成
 * 取代 -ref 的人群密度趋势，改为「履约率（%）随时间的恢复曲线」
 */
export function generateFulfillmentTrend(node, baseline, currentTimeIndex, parentAction) {
  if (!node?.isLeaf || !baseline || node.track === 'baseline') return null

  const timeline = ['0小时', '6小时', '12小时', '18小时', '24小时']
  const baselineRate = baseline.fulfillmentRate

  const score = node.outcome?.score || baseline.score
  const scoreNorm = Math.max(0, Math.min(1, (score - 55) / 35))

  function resolveMethodProfile(actionText) {
    if (/应急|加价|现金|包车|专线/i.test(actionText)) return { label: '快速止血型', curve: [0, 0.42, 0.72, 0.9, 1] }
    if (/限购|限量|分级|分级|优先级/i.test(actionText)) return { label: '稳态收敛型', curve: [0, 0.24, 0.56, 0.82, 1] }
    if (/委外|协同|跨区|调拨|联动/i.test(actionText)) return { label: '协同补位型', curve: [0, 0.16, 0.42, 0.74, 1] }
    return { label: '综合调控型', curve: [0, 0.22, 0.5, 0.78, 1] }
  }

  function resolveBaselineProfile() {
    const risk = node.outcome?.riskLevel || ''
    if (currentTimeIndex === 1 || /峰值|缺料|断供|拥堵|堆积/.test(node.desc || '')) {
      return { label: '未干预持续恶化', curve: [-0.02, -0.06, -0.10, -0.13, -0.15] }
    }
    if (currentTimeIndex === 0 || /回流|前置|提前/.test(node.desc || '')) {
      return { label: '未干预冲高震荡', curve: [-0.01, -0.04, -0.03, -0.06, -0.07] }
    }
    if (/高/.test(risk)) return { label: '未干预滞涨', curve: [-0.02, -0.05, -0.06, -0.07, -0.08] }
    return { label: '未干预缓慢下行', curve: [-0.01, -0.02, -0.03, -0.04, -0.05] }
  }

  const methodProfile = resolveMethodProfile(parentAction || '')
  const baselineProfile = resolveBaselineProfile()

  const targetGain = 4 + scoreNorm * 14 // 控制后 24h 履约率额外提升 4-18 个点
  const controlledTarget = Math.min(95, baselineRate + targetGain)

  const baselineSeries = baselineProfile.curve.map((delta) => Math.max(40, Math.round((baselineRate * (1 + delta)) * 10) / 10))
  const controlledSeries = methodProfile.curve.map((progress, idx) => {
    const raw = baselineRate + (controlledTarget - baselineRate) * progress
    const floor = baselineSeries[idx] + 2 + scoreNorm * 4
    return Math.round(Math.max(raw, floor) * 10) / 10
  })

  return {
    timeline,
    baselineSeries,
    controlledSeries,
    gain: Math.round((controlledSeries[controlledSeries.length - 1] - baselineSeries[baselineSeries.length - 1]) * 10) / 10,
    baselineLabel: baselineProfile.label,
    methodLabel: methodProfile.label,
    score
  }
}

/**
 * 节点搜索工具
 */
export function findParentNodeByChildId(node, childId) {
  if (!node?.children?.length) return null
  if (node.children.some((child) => child.id === childId)) return node
  for (const child of node.children) {
    const found = findParentNodeByChildId(child, childId)
    if (found) return found
  }
  return null
}

export function cloneNode(node) {
  if (!node) return null
  return { ...node, children: node.children?.map((c) => cloneNode(c)) || [] }
}

export function markTrack(node, track) {
  if (!node) return null
  return { ...node, track, children: node.children?.map((c) => markTrack(c, track)) || [] }
}

export { shortLabel }
