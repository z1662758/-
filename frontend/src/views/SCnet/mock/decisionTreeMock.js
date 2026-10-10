/**
 * 铀核燃料供应链决策树真实领域数据 - Mock & Adapter
 * 对齐战略保供、多通道绕行、战略平准储备动用与机组零非计划停堆指标。
 */

export const SCENARIO_OPTIONS = {
  rawShortage: '地缘冲突与铀矿供应中断',
  regionalDemandSurge: '核电机组装料与大修需求激增',
  logisticsCongestion: '跨国陆海放射品运输通道受阻'
}

export const TIME_NODE_OPTIONS = [
  { label: '事件初发', value: 0 },
  { label: '影响峰值', value: 1 },
  { label: '尾声收口', value: 2 }
]

export const EVENT_NAME_MAP = {
  rawShortage: {
    0: 'T0(D-3) 哈萨克斯坦矿区交付延迟15%通报',
    1: 'T1(D0) 阿拉山口通关受阻，包头基地缺料预警',
    2: 'T2(D+2) 跨里海替代通道部分到货，平准回补'
  },
  regionalDemandSurge: {
    0: 'T0(D-1) 华龙一号首炉集中装料，需求环比激增42%',
    1: 'T1(D0) 首炉与常规大修用料超出预测80%，排产堆积',
    2: 'T2(D+1) 生产排期平稳错峰，需求回落至高位稳态'
  },
  logisticsCongestion: {
    0: 'T0(D-1) 中亚铁路口岸 Class 7 危险品专运车皮积压',
    1: 'T1(D0) 放射品专用干线运力缺口扩大，时效跌至60%',
    2: 'T2(D+1) 跨里海中走廊多式联运上线，时效回升中'
  }
}

export const BASELINE_EVENT_METRICS = {
  rawShortage: {
    0: { event: 'T0(D-3) 哈萨克斯坦矿区交付延迟15%通报', stockoutRate: 8.2, fulfillmentRate: 92, score: 60 },
    1: { event: 'T1(D0) 阿拉山口通关受阻，包头基地缺料预警', stockoutRate: 18.4, fulfillmentRate: 76, score: 52 },
    2: { event: 'T2(D+2) 跨里海替代通道部分到货，平准回补', stockoutRate: 11.2, fulfillmentRate: 85, score: 64 }
  },
  regionalDemandSurge: {
    0: { event: 'T0(D-1) 华龙一号首炉集中装料，需求环比激增42%', stockoutRate: 5.6, fulfillmentRate: 90, score: 63 },
    1: { event: 'T1(D0) 首炉与常规大修用料超出预测80%，排产堆积', stockoutRate: 14.8, fulfillmentRate: 78, score: 55 },
    2: { event: 'T2(D+1) 生产排期平稳错峰，需求回落至高位稳态', stockoutRate: 7.4, fulfillmentRate: 88, score: 66 }
  },
  logisticsCongestion: {
    0: { event: 'T0(D-1) 中亚铁路口岸 Class 7 危险品专运车皮积压', stockoutRate: 6.0, fulfillmentRate: 88, score: 61 },
    1: { event: 'T1(D0) 放射品专用干线运力缺口扩大，时效跌至60%', stockoutRate: 16.5, fulfillmentRate: 64, score: 50 },
    2: { event: 'T2(D+1) 跨里海中走廊多式联运上线，时效回升中', stockoutRate: 9.0, fulfillmentRate: 82, score: 65 }
  }
}

/** 工具：短标签 */
function shortLabel(text, maxLen = 10) {
  if (!text) return '未命名'
  const compact = text.replace(/：/g, ' ').replace(/\+/g, ' / ').replace(/\s+/g, ' ').trim()
  return compact.length > maxLen ? `${compact.slice(0, maxLen)}…` : compact
}

// 决策主体对齐后端推演主责角色
const SCENE_CAMP = {
  rawShortage: '国家能源局/中核集团',
  regionalDemandSurge: '北方/宜宾燃料基地',
  logisticsCongestion: '中铁/远洋联合调度'
}
function actorFor(id) {
  return SCENE_CAMP[inferSceneFromId(id)] || '中核集团/联合指挥部'
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
      { type: '规章制度', name: '《国家核燃料战略物资储备平准管理暂行办法》', snippet: '发改能源规〔2023〕18号：突发供应链中断且商业库存低于180天红线时，可启动国家保税平准借调。' },
      { type: '运力批文', name: '《放射性物品运输安全管理条例》（国务院令第562号）', snippet: '中铁集装箱调度中心：Class 7 放射性危险品专列需提前锁定专用阻燃抗震车皮并报备铁道调度局。' },
      { type: '进出口管制', name: '《核两用物项和相关技术出口管制条例》', snippet: '商务部配额许可证事务局：天然铀 U3O8 过境第三国需具备最终用户证明及豁免核查通关背书。' },
      { type: '学术文献', name: '《基于扩展式博弈的全球关键矿产供应链抗毁韧性调控》', snippet: '核工业战略经济研究：多式联运绕行叠加保税库应急动用，可将关键核电机组非停概率由14.5%压降至0.2%。' }
    ]
  }
  if (scene === 'regionalDemandSurge') {
    return [
      { type: '行业标准', name: '《核电厂燃料组件装料与换料大修管理导则》', snippet: '国家核安全局 NNSA-HA-02：华龙一号首炉与在役机组换料大修须遵循刚性交付排程，杜绝断料。' },
      { type: '统筹协议', name: '《南北两大核燃料元件制造基地产能协同备忘录》', snippet: '中核北方包头与中核建中宜宾基地建立产能与半成品库存月度互保调配机制。' },
      { type: '跨国长协', name: '《中哈长期天然铀采购量价阶梯框架协议》', snippet: '约定基准年供货量与极端需求峰值窗口浮动 20% 增量供货承诺条款。' }
    ]
  }
  if (scene === 'logisticsCongestion') {
    return [
      { type: '口岸协同', name: '《阿拉山口/霍尔果斯两用物项快速通关绿色通道协议》', snippet: '海关总署与国铁集团：建立 Class 7 危险品免滞留直放与优先编组机制，通关时效压缩 50%。' },
      { type: '国际公约', name: '《国际海运危险货物规则》(IMDG Code Class 7)', snippet: '远洋散装专船承运核燃料原料需具备国际海事组织认证与沿途主权国无害通过通报。' },
      { type: '战略通道', name: '《跨里海国际运输路线(TITR)核原料海铁联运评估规程》', snippet: '阿克套港至巴库港驳船与外高加索铁路走廊具备常态化集装箱化承运资质。' }
    ]
  }
  return [
    { type: '应急预案', name: '《国家核燃料供应链突发事件应急保障预案》', snippet: '用于快速形成跨部门、跨基地、跨通道的应急联合调度。' }
  ]
}

export function buildThinkingSteps(action, desc) {
  return [
    `【态势识别】研判扰动特征（${shortLabel(desc, 30)}），测算对首炉装料工期与基地库存消耗的即时冲击；`,
    `【方案权衡】围绕"${shortLabel(action, 16)}"比选多式联运绕行、战略储备借调与现货补库，权衡保供履约度与完全到岸成本；`,
    '【合规核验】核对 Class 7 危运车皮、两用物项通关批复与战略物资动用前置审批，确保方案真能落地；',
    '【决策求解】扩展式决策树反向归纳求解出最优调控路径，将核电机组非计划停堆风险压缩至最低。'
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
      '哈萨克矿区交付延迟',
      'T0(D-3) 哈萨克斯坦矿区交付延迟15%通报',
      '中哈 Inkai 矿区通报因电力受限导致发运延后，需在 24 小时内启动备选调配方案，保障北方基地连续生产。',
      [
        strategy('rs-0-a', '启动防城港保税库应急借调', '向国家战略储备局申请动用防城港战略库存 300 tU，平抑短期交货缺口。', 0.34, [
          leaf('rs-0-a-1', '保税借调原料全额按期入库', '防城港战略库存 24 小时内完成出库转运，包头基地料位回升。', 0.7, { situation: '战略借调原料按期到位，机组首炉装料工期不受影响。', riskLevel: '低', fulfillmentRate: '98%', score: 88 }),
          leaf('rs-0-a-2', '跨部门保税借调审批滞后延期', '部委联审流程耗时，出库延后 3 天。', 0.3, { situation: '原料晚到 3 天，通过基地内部周转料紧急垫付缓冲。', riskLevel: '中', fulfillmentRate: '86%', score: 75 })
        ]),
        strategy('rs-0-b', '协调纳米比亚自营矿提速海运', '指令中广核纳米比亚湖山矿提前 20 天装船起运 1,000 tU，直航连云港。', 0.33, [
          leaf('rs-0-b-1', '远洋散货专船提前到港接卸', '鲸湾港开通快速装运通道，船期缩短 5 天到港。', 0.65, { situation: '远洋海运增量批次顺利接卸，平抑沿海电厂燃料需求。', riskLevel: '低', fulfillmentRate: '95%', score: 86 }),
          leaf('rs-0-b-2', '好望角海况制约致船期微调', '海况不佳导致远洋航速受限，到港延后 4 天。', 0.35, { situation: '到港微调但仍在安全期内，需持续监控港口换装时效。', riskLevel: '中低', fulfillmentRate: '84%', score: 73 })
        ]),
        strategy('rs-0-c', '动用宜宾基地周转料跨基地支援', '核对包头与宜宾基地库存，执行两用物项跨基地铁路专列调运。', 0.33, [
          leaf('rs-0-c-1', 'Class 7 专列安全准时送达', '中铁特货专列直达包头基地，两用物项调运全程受控。', 0.6, { situation: '跨基地库存均衡调度成功，包头燃料棒产线满负荷运转。', riskLevel: '低', fulfillmentRate: '92%', score: 85 }),
          leaf('rs-0-c-2', '跨局铁路运行图换装排队', '受铁路干线编组影响，专列在枢纽站排队换装。', 0.4, { situation: '调运周期延长 2 天，轻度增加跨基地调运协调成本。', riskLevel: '中', fulfillmentRate: '80%', score: 71 })
        ])
      ]
    ),
    1: root(
      'rs-1-root',
      '阿拉山口口岸阻断峰值',
      'T1(D0) 阿拉山口通关受阻，包头基地断料预警',
      '地缘冲突导致阿拉山口铁路口岸通关阻断，北方基地库存跌破 14 周警戒线，面临机组非计划停堆险情。',
      [
        strategy('rs-1-a', '跨里海多式联运绕行 + 保税平准', '阿克套港经跨里海航线绕行巴库并转海运回国，同步动用防城港保税平准 300 tU。', 0.34, [
          leaf('rs-1-a-1', '多式联运与保税平准全额到位', '跨里海班列与保税平准无缝衔接，机组满负荷运行，非停风险降至 0.2%。', 0.68, { situation: '最优方案完全落地，平抑断供冲击，综合履约率达 98.2%。', riskLevel: '极低', fulfillmentRate: '98%', score: 92 }),
          leaf('rs-1-a-2', '里海驳船天气运力短期受阻', '里海海况恶劣导致接驳延后，启动备选周转料应急垫付。', 0.32, { situation: '机组保持 100% 功率，物流时效波动在容忍区间内。', riskLevel: '中低', fulfillmentRate: '88%', score: 78 })
        ]),
        strategy('rs-1-b', '国际现货市场紧急采购补库', '动用外汇储备在国际现货市场以溢价锁定 400 tU，指令特种专船加速回运。', 0.33, [
          leaf('rs-1-b-1', '现货增量批次顺利到港接卸', '现货批次按期交割到岸，平抑北方缺口，到岸成本增加 +18.5%。', 0.62, { situation: '保供任务顺利达成，但到岸完全成本超出年度预算。', riskLevel: '中', fulfillmentRate: '89%', score: 84 }),
          leaf('rs-1-b-2', '现货溢价走高且通关延误', '现货溢价超预期 (+28%) 且港口清关延后 7 天。', 0.38, { situation: '资金占用大幅增加，资金链与库存承压较大。', riskLevel: '中高', fulfillmentRate: '78%', score: 70 })
        ]),
        strategy('rs-1-c', '国内核电机组降负荷保供备选', '协调电网将受影响核电站降负荷至 70% 功率运行，延长在役燃料棒在堆燃烧周期。', 0.33, [
          leaf('rs-1-c-1', '延缓原料消耗平稳错峰', '延缓原料消耗 45 天避免机组紧急解列，但造成电网售电损失。', 0.58, { situation: '避免了严重停堆事故，但造成重大售电收入考核损失。', riskLevel: '中', fulfillmentRate: '82%', score: 76 }),
          leaf('rs-1-c-2', '机组深度调峰触发保护性解列', '调峰深度突破堆芯稳定限值，触发保护性停堆 1 次。', 0.42, { situation: '机组停机检修，产生严重电网考核罚金与安全通报。', riskLevel: '高', fulfillmentRate: '68%', score: 62 })
        ])
      ]
    ),
    2: root(
      'rs-2-root',
      '替代走廊到货与稳态收口',
      'T2(D+2) 跨里海替代通道到货，平准回补',
      '替代海陆通道常态化运行，重点是全额归还平准储备借调、重构多源长协与持续监测全网节点脆弱性。',
      [
        strategy('rs-2-a', '重构多源长协与保税安全库存', '将哈萨克陆路与非洲海运长协按 7:3 刚性锁定，防城港保税库充实至 24 周。', 0.34, [
          leaf('rs-2-a-1', '双通道多源长协稳态运行', '海陆并进战略格局全面巩固，全网抗毁韧性指数提升至 88 分。', 0.72, { situation: '供应链系统性风险出清，重归高韧性平稳运行。', riskLevel: '低', fulfillmentRate: '96%', score: 91 }),
          leaf('rs-2-a-2', '长协商务条款微幅谈判延迟', '海外供应商对长期分段阶梯定价条款存在微幅分歧。', 0.28, { situation: '商务磋商总体可控，不影响年度基准保供履约。', riskLevel: '中低', fulfillmentRate: '88%', score: 79 })
        ]),
        strategy('rs-2-b', '分批全额回填战略平准借调库', '按海外进口现货到岸计划，分批全额原数归还防城港战略储备 300 tU 原料。', 0.33, [
          leaf('rs-2-b-1', '平准借调原料全额闭环回填', '国家平准库存 100% 回补就位，合规审查评定为优秀。', 0.65, { situation: '战略平准借调顺利闭环，储备资产安全无损。', riskLevel: '低', fulfillmentRate: '94%', score: 87 }),
          leaf('rs-2-b-2', '回填周期受港口检修微调', '沿海接收港口例行检修，回填计划微调延长 1 个月。', 0.35, { situation: '报备国家战略物资局获批，执行节奏基本平稳。', riskLevel: '中低', fulfillmentRate: '82%', score: 74 })
        ]),
        strategy('rs-2-c', '全网关键节点与动态脆弱性持续监测', '在阿拉山口、包头基地与连云港建立介数中心度与脆弱性实时预警机制。', 0.33, [
          leaf('rs-2-c-1', '系统脆弱性指数稳定回落', '关键节点负荷均衡释放，系统脆弱性指数降至 38 分安全区。', 0.66, { situation: '全网感知灵敏，提前 90 天预警潜在断链风险。', riskLevel: '低', fulfillmentRate: '95%', score: 89 }),
          leaf('rs-2-c-2', '局部支线运输仍需常态备勤', '个别偏远电厂配套物流专线存在周期性运力扰动。', 0.34, { situation: '纳入常态化应急预案管理，整体风险受控。', riskLevel: '中低', fulfillmentRate: '84%', score: 76 })
        ])
      ]
    )
  },
  regionalDemandSurge: {
    0: root(
      'rd-0-root',
      '沿海机组集中装料需求激增',
      'T0(D-1) 华龙一号首炉集中装料，需求环比激增42%',
      '沿海多台华龙一号核电机组同时进入首炉装料工期，天然铀原料需求激增 42%，需在 8 小时内完成产销协同排产。',
      [
        strategy('rd-0-a', '中哈铁路增配 Class 7 专运车皮', '协调中铁集装箱调度中心，为阿拉山口口岸增批 2 列放射性危险品专运车皮。', 0.34, [
          leaf('rd-0-a-1', '专运车皮扩容按期就位', '专列车皮调配迅速，口岸绿色通道通关顺畅。', 0.7, { situation: '陆运运力扩容达标，首炉原料准时送达基地。', riskLevel: '低', fulfillmentRate: '94%', score: 89 }),
          leaf('rd-0-a-2', '跨国铁路轨距换装短期排队', '口岸换装吊装工位负荷较高，产生 24 小时微幅延后。', 0.3, { situation: '换装时效基本可控，产线备用料平稳衔接。', riskLevel: '中低', fulfillmentRate: '82%', score: 74 })
        ]),
        strategy('rd-0-b', '统筹包头与宜宾元件基地产能', '在满足全国华龙一号首炉装料要求下，统筹两大加工基地滚动生产排期。', 0.33, [
          leaf('rd-0-b-1', '两基地产能均衡释放', '南北基地排产精准协同，确保全国在役机组零断料。', 0.65, { situation: '燃料组件按期下线交付，装料大修工期完全受控。', riskLevel: '低', fulfillmentRate: '91%', score: 86 }),
          leaf('rd-0-b-2', '包头基地负荷率偏高承压', '北方基地单厂产能负荷超 92%，需加强设备巡检。', 0.35, { situation: '增派技术骨干驻厂维保，生产节奏安全稳定。', riskLevel: '中', fulfillmentRate: '80%', score: 72 })
        ]),
        strategy('rd-0-c', '分批错峰安排核电厂换料大修', '会同国家能源局协调各大核电基地，将原定集中大修窗口错开 30-45 天。', 0.33, [
          leaf('rd-0-c-1', '大修窗口平稳错峰', '平抑需求尖峰负荷，制造基地产能利用率处于黄金区间。', 0.62, { situation: '削峰填谷效果显著，避免行业内部恶性抢料。', riskLevel: '低', fulfillmentRate: '88%', score: 83 }),
          leaf('rd-0-c-2', '电厂调峰指标微幅调整', '个别核电站调峰考核指标需要能源主管部门背书。', 0.38, { situation: '协调机制已顺畅打通，对电网供电无实质负面影响。', riskLevel: '中低', fulfillmentRate: '76%', score: 69 })
        ])
      ]
    ),
    1: root(
      'rd-1-root',
      '装料大修峰值叠加',
      'T1(D0) 首炉与常规大修用料超出预测80%，排产堆积',
      '需求峰值远超年度预测，两大基地原料库存快速消耗，亟需从海外矿山、刚性长协与滚动库存多维度协同增量保供。',
      [
        strategy('rd-1-a', '海外自营矿产能全负荷释放', '中广核纳米比亚湖山矿启动达产工程，单季提升海运发货量 500 tU。', 0.34, [
          leaf('rd-1-a-1', '自营矿增量供给稳定回运', '海外矿山发货量充裕，对冲中亚陆运通关瓶颈。', 0.68, { situation: '海外矿山全效发力，彻底补足全国年度增量缺口。', riskLevel: '低', fulfillmentRate: '92%', score: 88 }),
          leaf('rd-1-a-2', '矿区酸浸原材料供应略紧', '非洲矿区硫酸辅料采购成本微幅上涨 +8%。', 0.32, { situation: '增产任务圆满达成，毛利略有折损但完全在容忍范围内。', riskLevel: '中低', fulfillmentRate: '79%', score: 72 })
        ]),
        strategy('rd-1-b', '锁定十年期刚性量价阶梯长协', '与哈原工（Kazatomprom）签署扩量长协，锁定 2026–2035 年基准供应保障。', 0.33, [
          leaf('rd-1-b-1', '战略供给刚性确立', '长期供应底座固若金汤，杜绝任何外部违约与断供敞口。', 0.65, { situation: '确立大国长周期资源安全，综合评分名列前茅。', riskLevel: '低', fulfillmentRate: '95%', score: 90 }),
          leaf('rd-1-b-2', '现货挂钩价格指数微幅波动', '长期长协结算价受国际现货指标波动影响产生溢价。', 0.35, { situation: '通过金融远期外汇对冲锁定，成本波动在可控区间。', riskLevel: '中', fulfillmentRate: '81%', score: 74 })
        ]),
        strategy('rd-1-c', '调整动态采购与滚动安全库存', '将全国在役机组安全库存由 180 天提升至 210 天，建立季度滚动采销平衡。', 0.33, [
          leaf('rd-1-c-1', '安全库存冗余充沛', '抵御外部扰动的缓冲深度显著增强，机组非停风险降至极低。', 0.6, { situation: '构建起坚固的安全库存缓冲区，保供能力大幅提升。', riskLevel: '低', fulfillmentRate: '89%', score: 85 }),
          leaf('rd-1-c-2', '资金占用与仓储成本上升', '安全库存提升增加仓储资金占用与利息成本支出。', 0.4, { situation: '换取国家级核电安全底线，属于高性价比战略投入。', riskLevel: '中低', fulfillmentRate: '78%', score: 70 })
        ])
      ]
    ),
    2: root(
      'rd-2-root',
      '需求平稳进入稳态期',
      'T2(D+1) 生产排期平稳错峰，需求回落至高位稳态',
      '大修高峰顺利度过，重点是固化供需动态校准模型、建立跨国通关绿色通道及应急平准基金。',
      [
        strategy('rd-2-a', '校准全国核燃料全周期供需模型', '根据新投产机组节奏滚动修正 2026–2030 年天然铀年需求预测模型。', 0.34, [
          leaf('rd-2-a-1', '全周期供需模型精准收敛', '长周期预测准确率达 98%，消除盲目采销与库存挤兑。', 0.72, { situation: '数字化智能预测模型成型，全行业运行效率极大跃升。', riskLevel: '低', fulfillmentRate: '96%', score: 91 }),
          leaf('rd-2-a-2', '局部新批机组工期微调', '个别沿海新堆型工程建设节点略有前后微调。', 0.28, { situation: '滚动修正模型即时吸收调整，无滞后风险。', riskLevel: '低', fulfillmentRate: '85%', score: 78 })
        ]),
        strategy('rd-2-b', '固化长协履约与跨境通关协议', '深化中哈核燃料战略合作，签署跨境核原料专运绿色快速通道常态协议。', 0.33, [
          leaf('rd-2-b-1', '陆运口岸通关时效提升40%', '中哈口岸常态化 36 小时办结，班列周转效率显著提高。', 0.66, { situation: '跨境大动脉畅通无阻，成为中亚一带一路合作标杆。', riskLevel: '低', fulfillmentRate: '93%', score: 88 }),
          leaf('rd-2-b-2', '跨境安保检验流程磨合', '新标准执行初期现场核实环节略有流程磨合。', 0.34, { situation: '双边联检机制迅速理顺，口岸作业重归稳态。', riskLevel: '中低', fulfillmentRate: '82%', score: 75 })
        ]),
        strategy('rd-2-c', '设立国家级核电原料应急平准机制', '建立百亿级战略物资汇率与价格平准准备，增强抗外部金融冲击韧性。', 0.33, [
          leaf('rd-2-c-1', '金融避险机制全面落地', '锁汇与平准准备成功对冲海外现货大幅暴涨风险。', 0.64, { situation: '金融安全护城河建立，国家战略资产实现保值避险。', riskLevel: '低', fulfillmentRate: '94%', score: 89 }),
          leaf('rd-2-c-2', '准备金动用审批标准严苛', '资金使用需发改委与国资委前置会签。', 0.36, { situation: '严格的行政风控保障了专项准备金的依法合规使用。', riskLevel: '中低', fulfillmentRate: '83%', score: 76 })
        ])
      ]
    )
  },
  logisticsCongestion: {
    0: root(
      'lc-0-root',
      '中亚专列车皮积压预警',
      'T0(D-1) 中亚铁路口岸 Class 7 危险品专运车皮积压',
      '中哈口岸宽窄轨换装车皮排队达 15 天，时效预计跌至 70%，需前置启动多通道分流与口岸作业提速。',
      [
        strategy('lc-0-a', '启用跨里海中走廊海铁联运', '核对阿克套港承运条件，指令首批 300 tU 经跨里海多式联运绕行分流。', 0.34, [
          leaf('lc-0-a-1', '跨里海中走廊成功分流', '首批集装箱顺利登船，有效分流中亚主陆运口岸 35% 压力。', 0.7, { situation: '中走廊多式联运走通，成功开辟我国第二条海外战略通道。', riskLevel: '低', fulfillmentRate: '92%', score: 88 }),
          leaf('lc-0-a-2', '里海驳船中转受海况微调', '阿克套港因大风天气暂停航运 2 天后恢复。', 0.3, { situation: '船期延后 2 天，总体仍在安全调度冗余时间表内。', riskLevel: '中低', fulfillmentRate: '80%', score: 73 })
        ]),
        strategy('lc-0-b', '优化口岸轨距换装与优先通关', '协调阿拉山口铁路局开设 Class 7 绿色通道，将换装周期压缩至 36 小时。', 0.33, [
          leaf('lc-0-b-1', '口岸换装提速50%', '换轨车皮积压明显消退，放射品专列优先编组启运。', 0.64, { situation: '口岸瓶颈快速疏导，在途时效迅速恢复至标准线。', riskLevel: '低', fulfillmentRate: '90%', score: 86 }),
          leaf('lc-0-b-2', '口岸换装机械负荷接近额定值', '装卸机械连续高强度作业，需配备备用龙门吊维保。', 0.36, { situation: '调度中心增加驻场抢修组，保障作业安全受控。', riskLevel: '中低', fulfillmentRate: '78%', score: 71 })
        ]),
        strategy('lc-0-c', '分批错峰调拨沿海港口库存', '调整连云港与防城港接卸批次，防范海运集中到港造成港区拥堵。', 0.33, [
          leaf('lc-0-c-1', '港口仓储吞吐均衡受控', '两港分工明确，南北港口接卸与沿海基地进料无缝衔接。', 0.6, { situation: '港口物流时效稳定达标，避免沿海堆场压港罚款。', riskLevel: '低', fulfillmentRate: '88%', score: 84 }),
          leaf('lc-0-c-2', '沿海转运铁路车皮调度微调', '沿海特种车皮调配需提前 48 小时向上铁局报备。', 0.4, { situation: '报备机制规范化落地，整体转运平稳达标。', riskLevel: '中低', fulfillmentRate: '77%', score: 70 })
        ])
      ]
    ),
    1: root(
      'lc-1-root',
      '放射品专运运力严重缺口',
      'T1(D0) 放射品专用干线运力缺口扩大，时效跌至60%',
      '主干通道受阻引发运力缺口扩散，多个在役核电站换料窗口面临延误风险，必须启动最高级别联合应急调度。',
      [
        strategy('lc-1-a', '统筹远洋特种船队与铁路专列', '统筹中远海运特种船队与中铁专列海陆联运，无缝衔接替代走廊。', 0.34, [
          leaf('lc-1-a-1', '陆海联运应急运力完全就位', '专运船队与专列无缝衔接，将综合履约率强力拉回 91%。', 0.66, { situation: '应急物流体系经受住极端压力测试，系统韧性充分展现。', riskLevel: '低', fulfillmentRate: '91%', score: 87 }),
          leaf('lc-1-a-2', '特种航运包船费用上涨', '国际特种放射品包船费率短期上涨 +12%。', 0.34, { situation: '运费上涨但完全确保了国家核电机组连续稳定供电。', riskLevel: '中', fulfillmentRate: '79%', score: 72 })
        ]),
        strategy('lc-1-b', '协调核电基地进料交付时序', '同步各大核电厂在堆燃烧情况与在途运输进度，灵活微调交付表。', 0.33, [
          leaf('lc-1-b-1', '燃料组件精准匹配大修节奏', '全国机组换料大修窗口实现微观动态对齐，零机组受阻。', 0.63, { situation: '产供销在途一体化协同大获成功，消除停堆隐患。', riskLevel: '低', fulfillmentRate: '89%', score: 84 }),
          leaf('lc-1-b-2', '部分电厂现场临时仓储受限', '个别核电站反应堆厂房燃料区备料库位接近饱和。', 0.37, { situation: '采用专列车皮临时滚动驻留方案妥善化解。', riskLevel: '中低', fulfillmentRate: '76%', score: 69 })
        ]),
        strategy('lc-1-c', '优先保障华龙一号首炉关键批次', '有限口岸指标与专运车皮 100% 倾斜包头基地首炉原料保障。', 0.33, [
          leaf('lc-1-c-1', '首炉用料保质保量如期送达', '华龙一号首炉装料按原定工程节点实施，并网发电目标如期达成。', 0.6, { situation: '国家战略重点工程首要目标达成，彰显战略定力。', riskLevel: '低', fulfillmentRate: '93%', score: 89 }),
          leaf('lc-1-c-2', '次要机组常规备料推迟15天', '次要商业堆型常规备件物流延后半个月。', 0.4, { situation: '常规机组安全库存充足，生产运营未受实质干扰。', riskLevel: '中', fulfillmentRate: '77%', score: 70 })
        ])
      ]
    ),
    2: root(
      'lc-2-root',
      '应急多式联运爬坡稳态',
      'T2(D+1) 跨里海中走廊多式联运上线，时效回升中',
      '应急运力全面上线，通道时效稳步回升。重点是固化海陆双通道配比、出清口岸堆场并建立全球咽喉感知系统。',
      [
        strategy('lc-2-a', '优化海陆双通道常态化运力配比', '将海运分流比例常态化提升至 40% 以上，构筑海陆双轮驱动。', 0.34, [
          leaf('lc-2-a-1', '海陆并进战略格局成型', '海运陆运互为容灾冗余，全网断链风险永久性下降 45%。', 0.72, { situation: '彻底摆脱对单一陆运走廊的过度依赖，重塑物流韧性。', riskLevel: '低', fulfillmentRate: '95%', score: 91 }),
          leaf('lc-2-a-2', '海运承运商份额重新招投标', '年度运力配额重新划分引发航运承运商份额博弈。', 0.28, { situation: '市场化招投标机制促进了服务质量提升与运费优化。', riskLevel: '中低', fulfillmentRate: '84%', score: 78 })
        ]),
        strategy('lc-2-b', '恢复口岸与枢纽常态化轮动节奏', '核对延期滞留批次，平稳出清口岸堆场，恢复正常排班。', 0.33, [
          leaf('lc-2-b-1', '口岸堆场恢复额定容量秩序', '阿拉山口与霍尔果斯堆场负荷回落至 65% 安全线。', 0.65, { situation: '边境口岸恢复常态化高效通关，秩序井然。', riskLevel: '低', fulfillmentRate: '92%', score: 87 }),
          leaf('lc-2-b-2', '部分滞留集装箱产生超期费', '前期阻断滞留集装箱产生少量堆存超期费用。', 0.35, { situation: '通过国际多式联运不可抗力免责条款协商减免。', riskLevel: '中低', fulfillmentRate: '81%', score: 74 })
        ]),
        strategy('lc-2-c', '全球核原料关键咽喉与运力实时感知', '建立阿拉山口、阿克套港、苏伊士运河及好望角全球遥感监测网。', 0.33, [
          leaf('lc-2-c-1', '通道风险感知时效达24小时', '全球咽喉走廊异动实现全天候卫星与报关遥感感知。', 0.66, { situation: '数字化敏捷感知系统投入实战，先发制人化解潜在风险。', riskLevel: '低', fulfillmentRate: '96%', score: 92 }),
          leaf('lc-2-c-2', '国际航运卫星数据源持续维护', '高精度卫星运力 AIS 数据源需常态化续约。', 0.34, { situation: '列入国家核安全中心信息化年度专项保障预算。', riskLevel: '低', fulfillmentRate: '85%', score: 78 })
        ])
      ]
    )
  }
}

export const BASELINE_BRANCH_DATA = {
  rawShortage: {
    0: {
      action: '未干预基线：阿拉山口口岸拥堵加剧，单点负荷超 94%',
      desc: '在途车皮排队积压超过 15 天，北方包头基地断料倒计时，商业库存持续快速消耗。',
      children: [
        leaf('rs-0-raw-1', '包头基地产线被迫降速运行', '原料断供持续，燃料棒元件产能利用率跌破 70%，交付延期。', 0.58, { situation: '产能严重下滑，导致在制组件生产节拍全面打乱。', riskLevel: '高', fulfillmentRate: '70%', score: 54 }),
        leaf('rs-0-raw-2', '沿海在役机组换料窗口推迟', '换料大修组件无法按时出厂，机组面临推迟停机大修。', 0.42, { situation: '机组被迫带病运转或延期大修，面临国家核安全局督导。', riskLevel: '中高', fulfillmentRate: '75%', score: 60 })
      ]
    },
    1: {
      action: '未干预基线：北方包头基地库存跌破 14 周警戒红线',
      desc: '首炉元件加工中断，华龙一号关键机组面临非计划停堆险情，全国核电供应链陷入瘫痪。',
      children: [
        leaf('rs-1-raw-1', '首炉元件产线大面积停工', '无在途原料补给，4 台华龙一号首炉装料推迟，直接导致机组无法并网。', 0.6, { situation: '触发重大电力保供责任事故，核电机组发生严重非计划停堆。', riskLevel: '极高', fulfillmentRate: '58%', score: 48 }),
        leaf('rs-1-raw-2', '触发电网重大商业违约惩罚', '无法按期向南方电网及国家电网交割上网电量，产生巨额购售电合同违约罚金。', 0.4, { situation: '经济损失数亿元，企业信用评级遭下调，社会舆情高度负面。', riskLevel: '高', fulfillmentRate: '65%', score: 53 })
      ]
    },
    2: {
      action: '未干预基线：供给中断演化为全网系统性短缺',
      desc: '全行业采购现货发生恶性踩踏，到岸完全成本飙升超 40%，供应链抗毁度全面崩溃。',
      children: [
        leaf('rs-2-raw-1', '高位到岸成本长期无法消化', '恐慌性高溢价抢购带来巨额财务亏损，核电燃料采购成本不可逆抬高。', 0.56, { situation: '核电度电成本大幅上升，严重侵蚀集团长周期盈利能力。', riskLevel: '高', fulfillmentRate: '74%', score: 58 }),
        leaf('rs-2-raw-2', '全国多基地机组被迫降负荷', '多座核电站因缺料进入低功率调峰模式，全行业陷入信任危机。', 0.44, { situation: '国家能源局启动能源安全专项督查，多台新堆型审批被暂缓。', riskLevel: '中高', fulfillmentRate: '78%', score: 62 })
      ]
    }
  },
  regionalDemandSurge: {
    0: {
      action: '未干预基线：多台机组集中并网引发需求挤兑',
      desc: '国内商业现货与在役长协被迅速抽空，供需缺口剧烈扩大，缺乏统筹排产调度。',
      children: [
        leaf('rd-0-raw-1', '基地周转库存数日内告急', '北方与南方基地备料被集中透支，局部基地原料跌破 30 天红线。', 0.57, { situation: '生产节奏被打乱，后续在制批次出现严重备料断层。', riskLevel: '中高', fulfillmentRate: '74%', score: 58 }),
        leaf('rd-0-raw-2', '核电基地恐慌性争抢配额', '各核电厂抢占大修燃料棒配额，加剧行业内部资源争夺与内耗。', 0.43, { situation: '调度秩序混乱，部分主力电站交付周期反被延后。', riskLevel: '中', fulfillmentRate: '78%', score: 62 })
      ]
    },
    1: {
      action: '未干预基线：燃料加工基地超负荷排产引发瓶颈',
      desc: '元件交付延期波及 6 台在役核电站常规换料大修，产线过度承压，设备故障率激增。',
      children: [
        leaf('rd-1-raw-1', '元件装配出现批次性大面积延误', '大修组件交货延期超 30 天，多台商业核电机组停堆等待料棒。', 0.61, { situation: '机组停机待料，全国沿海电力供应产生显著硬缺口。', riskLevel: '高', fulfillmentRate: '60%', score: 50 }),
        leaf('rd-1-raw-2', '加工基地生产调度失控与质量波动', '高负荷连轴转排产引发质检不合格率抬升，返工加剧延期。', 0.39, { situation: '核燃料产品质量风险上升，遭核安全监管局专项诫勉谈话。', riskLevel: '高', fulfillmentRate: '66%', score: 55 })
      ]
    },
    2: {
      action: '未干预基线：长期短缺导致核电机组被迫降负荷',
      desc: '电网调峰损失扩大，造成重大商业电费考核扣罚与商誉损失，新批堆型投产受阻。',
      children: [
        leaf('rd-2-raw-1', '电网售电损失持续扩大', '长期调峰导致上网电量损失数十亿度，对地方工业供电产生冲击。', 0.55, { situation: '造成不可逆的巨额经济损失，企业抗风险信誉严重受挫。', riskLevel: '中高', fulfillmentRate: '76%', score: 63 }),
        leaf('rd-2-raw-2', '核燃料长周期供求信任危机', '供需错配长期未决，产业链上下游合作信任受到严重削弱。', 0.45, { situation: '后续机组商业谈判阻力剧增，行业扩产投资意愿低迷。', riskLevel: '中', fulfillmentRate: '79%', score: 59 })
      ]
    }
  },
  logisticsCongestion: {
    0: {
      action: '未干预基线：中亚陆路铁路大动脉遭遇突发阻断',
      desc: '阿拉山口与霍尔果斯双口岸停摆，陆运集装箱堆场严重饱和，班列停运积压。',
      children: [
        leaf('lc-0-raw-1', '口岸在途时效腰斩跌破 60%', 'Class 7 危险品专运列车无限期积压在边境戈壁，在途环境风险增加。', 0.58, { situation: '放射性货物滞留时间严重超标，口岸作业几乎陷入停顿。', riskLevel: '中高', fulfillmentRate: '70%', score: 59 }),
        leaf('lc-0-raw-2', '国内加工基地无料进厂接卸', '包头基地原材料到厂归零，连续 2 周无原料入库入库台账空白。', 0.42, { situation: '原料断供风险急剧向制造与发电端层层传导扩散。', riskLevel: '中', fulfillmentRate: '75%', score: 62 })
      ]
    },
    1: {
      action: '未干预基线：物流阻塞传导至国内各大燃料加工厂',
      desc: '包头与宜宾两大基地原料断供，在制组件产线被迫停摆，触发国家核应急保供通报。',
      children: [
        leaf('lc-1-raw-1', '核心工程供货合同全面违约', '华龙一号首炉原料无法运抵，产生极其严重的工程工期重大延误。', 0.6, { situation: '国家重点战略工程受阻，引发国家能源主管部门问责。', riskLevel: '极高', fulfillmentRate: '56%', score: 46 }),
        leaf('lc-1-raw-2', '口岸堆场放射性安全隐患超标', '特种集装箱超期暴晒与积压引发地方与国际核安全组织安全警示。', 0.4, { situation: '面临边境环保与安保双重通报处罚，整顿整改周期漫长。', riskLevel: '高', fulfillmentRate: '63%', score: 51 })
      ]
    },
    2: {
      action: '未干预基线：全国核电燃料供应链抗毁度全面崩溃',
      desc: '多基地联动失效，触发国家级核应急与能源保供二级响应，单通道依赖弊端彻底暴露。',
      children: [
        leaf('lc-2-raw-1', '物流通道抗毁韧性长期归零', '缺乏常态化海运与多式联运兜底，通道脆弱性长期处于最高极值。', 0.55, { situation: '系统性单点依赖成为行业长久痛点，抗风险能力完全丧失。', riskLevel: '高', fulfillmentRate: '75%', score: 61 }),
        leaf('lc-2-raw-2', '核安全监管全面介入调查整顿', '监管机构责令暂停部分受影响机组大修许可证，行业停滞。', 0.45, { situation: '整顿成本高昂，导致核电发展规划进度显著受挫。', riskLevel: '中高', fulfillmentRate: '78%', score: 65 })
      ]
    }
  }
}

/**
 * 履约率变化曲线生成
 * 履约率（%）随时间的恢复曲线
 */
export function generateFulfillmentTrend(node, baseline, currentTimeIndex, parentAction) {
  if (!node?.isLeaf || !baseline || node.track === 'baseline') return null

  const timeline = ['0小时', '12小时', '24小时', '48小时', '72小时']
  const baselineRate = baseline.fulfillmentRate

  const score = node.outcome?.score || baseline.score
  const scoreNorm = Math.max(0, Math.min(1, (score - 55) / 35))

  function resolveMethodProfile(actionText) {
    if (/保税|借调|平准|现货/i.test(actionText)) return { label: '紧急平准型', curve: [0, 0.45, 0.75, 0.92, 1] }
    if (/海铁|联运|绕行|走廊|自营矿/i.test(actionText)) return { label: '通道切换型', curve: [0, 0.25, 0.55, 0.82, 1] }
    if (/错峰|大修|排产|统筹/i.test(actionText)) return { label: '产销协同型', curve: [0, 0.32, 0.62, 0.86, 1] }
    return { label: '稳态调控型', curve: [0, 0.35, 0.65, 0.88, 1] }
  }

  function resolveBaselineProfile() {
    const risk = node.outcome?.riskLevel || ''
    if (currentTimeIndex === 1 || /峰值|缺料|断供|拥堵|堆积|阻断/.test(node.desc || '')) {
      return { label: '未干预持续恶化', curve: [-0.02, -0.06, -0.10, -0.13, -0.15] }
    }
    if (currentTimeIndex === 0 || /回流|前置|提前|初发/.test(node.desc || '')) {
      return { label: '未干预冲高震荡', curve: [-0.01, -0.04, -0.03, -0.06, -0.07] }
    }
    if (/高/.test(risk)) return { label: '未干预滞涨', curve: [-0.02, -0.05, -0.06, -0.07, -0.08] }
    return { label: '未干预缓慢下行', curve: [-0.01, -0.02, -0.03, -0.04, -0.05] }
  }

  const methodProfile = resolveMethodProfile(parentAction || '')
  const baselineProfile = resolveBaselineProfile()

  const targetGain = 6 + scoreNorm * 14 // 控制后 72h 履约率额外提升 6-20 个百分点
  const controlledTarget = Math.min(99, baselineRate + targetGain)

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
