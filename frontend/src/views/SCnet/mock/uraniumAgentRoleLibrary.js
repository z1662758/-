/**
 * 铀场景 Agent 角色库（建模基线）
 *
 * 结构参考 MACE 实验设计 schema 的 AgentSpec：
 *   role            身份与背景 / 制度背景 / 核心目标 / 行为底线
 *   decision_posture 决策风格 / 风险偏好 / 关注信息优先级 / 典型行动
 *   attributes      属性及取值范围（attribute_meta），字段与权重对照 sgm-cmse 的 uranium_supply_chain/during 模块
 *   cognition       决策过程：按观察、判断、决策、行动组织年度信息
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

// 业务化多维风控评估体系权重（五维雷达与综合决策模型）
export const URANIUM_OBSERVER_WEIGHTS = Object.freeze([
  { key: 'supply_reliability', label: '战略保供履约度', weight: 0.30 },
  { key: 'cost_efficiency', label: '平抑到岸完全成本', weight: 0.25 },
  { key: 'network_resilience', label: '地缘运输断链冗余度', weight: 0.20 },
  { key: 'inventory_adequacy', label: '跨基地安全库存均衡指数', weight: 0.15 },
  { key: 'contract_compliance', label: '长协契约违约风险', weight: 0.10 }
])

// 规划器（planner）
export const URANIUM_PLANNER = Object.freeze({
  parameterSpace: ['长协现货采购比', '跨基地安全库存覆盖目标', '中哈/海运通道分流配额', '单一产区依赖限额', '应急现货超额预算上限'],
  maxIterations: 100,
  timeStepUnit: '季度/月度',
  calibrationWindow: '1997–2024 (全国机组实绩与长协履约)'
})


export const URANIUM_AGENT_ROLE_LIBRARY = Object.freeze({
  supply: {
    tier: 'supply',
    code: 'AGENT / 01',
    label: '供给方 Agent',
    subtitle: '海外矿山与资源国供给',
    camp: '海外供给',
    agentClass: 'SupplierAgent',
    modelingMethod: '年度规则与策略评估',
    countHint: '矿企 / 资源国',
    categories: ['资源国矿企', '长协履约主体', '现货边际供给', '两用物项出口国'],
    role: {
      identity: '代表资源国、矿山或二次供应来源，提供年度可用供给、报价和风险信息。',
      institutional_context: '受本国出口审批、国际制裁与长协惯例约束；产量受矿山品位、硫酸等辅料供给和地浸工艺限制。',
      goal: '在保障长协履约的前提下最大化销售收入，维持产能利用率与客户结构稳定。',
      constraints: ['不得超出矿山年度产能与出口配额', '制裁或禁令生效时停止对应方向发运', '长协交付优先于现货投放']
    },
    contract: [
      { label: '建模粒度', value: '一国 / 一主力矿山一 Agent' },
      { label: '决策节拍', value: '年度长协谈判 + 季度发运复核' },
      { label: '核心目标', value: '长协保供履约与外汇收益最大化' },
      { label: '输出信号', value: '年度产能配额 · 出口报价 · 发运路径' }
    ],
    decision_posture: {
      style: '产能约束下的价格跟随',
      risk_appetite: '中',
      information_priority: ['现货与长协价差', '本国政策与制裁动态', '运输通道拥堵与保险成本'],
      typical_actions: ['调整报价与现货投放量', '按合同优先级分配发运', '受扰动时启用替代运输路径']
    },
    attributes: [
      { key: 'capacity_tU', label: '年产能', name: '年产能', unit: 'tU/年', type: 'range', range: [500, 25000], detail: '矿区年度地浸或露天采出产能上限，受自然禀赋与硫酸等辅料供应硬约束。' },
      { key: 'operating_cost_usd_kgU', label: '运营成本', name: '运营完全成本', unit: 'USD/kgU', type: 'range', range: [20, 130], detail: '包含采选、转化前置处理与水化学地浸工艺的完全开采边际成本。' },
      { key: 'policy_risk', label: '政策许可风险', name: '政策与出口许可风险', type: 'float', range: [0, 0.8], detail: '出口国两用物项管制、外商投资股比限制与环境开采环保审批壁垒。' },
      { key: 'geopolitical_risk', label: '地缘政治风险', name: '地缘博弈断供风险', type: 'float', range: [0, 0.8], detail: '受欧美禁运法案、中东航道动荡或周边战事波及的供货阻断概率。' },
      { key: 'transport_risk', label: '运输风险', name: '通道在途运输风险', type: 'float', range: [0, 0.6], detail: '自矿区发运至主要过境铁路或海运接卸港口的沿途货运保障风险。' }
    ],
    dynamicStates: [
      { name: '实际释放产能', detail: '受水化学地浸注采比与辅料供应约束下的本年度实际释放产能。' },
      { name: '现货溢价敏感度', detail: '国际现货暴涨时的供给跟随弹性与出口现货加价冲动。' },
      { name: '地缘制裁风险指数', detail: '西方制裁法案与俄欧通道阻断带来的本周期断航停发风险。' },
      { name: '长协在途履约进度', detail: '本年度已签约且在排期发运的刚性合同量与执行履约率。' }
    ],
    enums: [
      { label: '成本层级', values: ['<$40/kgU', '<$80/kgU', '<$130/kgU', '>$130/kgU'] },
      { label: '开采方法', values: ['ISL 地浸', '露天', '地下', '混合', '副产品'] }
    ],
    modules: [
      { name: '感知', input: '国际现货/长协报价、采购询价单、地缘出口禁令与制裁事件', mechanism: '过滤可信市场信号，测算运输保险费率与口岸滞期', output: '带时间戳的海外供给态势与风险集合' },
      { name: '记忆', input: '历史长协契约履约记录、客户信用等级、矿山历史回采率', mechanism: '基于信誉评分和历史供货周期检索最佳履约组合', output: '有效合同优先级与配额底账' },
      { name: '决策', input: '产能上限、现货溢价率、目标利润与地缘限制', mechanism: '边际利润最大化同时优先确保长期战略客户契约', output: '季度发运分配计划与报价方案' },
      { name: '行为', input: '发运指令与排期计划', mechanism: '装车发运、向口岸提交通关单证、受阻时上报替代路径', output: '实际交货单据、在途物流流转日志' }
    ],
    process: [
      { name: '资源勘测与产能核准', detail: '核定年度最大允许采出量与出口许可证配额。' },
      { name: '市场询价与长协锁定', detail: '优先锁定战略核电客户长期协议量，防范违约。' },
      { name: '生产排期与现货调节', detail: '依据生产成本与边际溢价投放现货调节市场。' },
      { name: '口岸交接与单证核销', detail: '完成海关放射性物项申报与国际监管核验。' },
      { name: '履约结算与信誉复核', detail: '核对回款并更新客户信用画像与长协履约率。' }
    ],
    states: ['常态开采', '满负荷扩产', '配额受限', '长协保供', '通道受阻', '停工检修'],
    interactions: [
      { target: '供给方 ↔ 运输通道', detail: '向铁路或航运公司提报月度发运舱位，协商集装箱换装与运费费率。' },
      { target: '供给方 ↔ 制造基地', detail: '签订 5–10 年期战略长协，按季滚动交割，提供原产地证明与成分指标。' },
      { target: '供给方 ← 国际监管', detail: '接受 IAEA 与两用物项出口国安全核查，遵循放射性危化品出口规程。' }
    ],
    parameters: [
      { name: '矿山基础产能', symbol: 'Q₀', role: '决定无外力冲击时的基线供货能力', calibration: '各国地质调查局与矿山招股年报' },
      { name: '现货价格弹性', symbol: 'ε_p', role: '控制当国际现货价格暴涨时矿企增产倾向', calibration: 'U-Metals 历史现货价格回归' },
      { name: '地缘阻断响应延迟', symbol: 'Δt_s', role: '突发制裁到正式停止发运的时滞天数', calibration: '俄乌冲突出口制裁时间表' }
    ],
    references: [
      { title: 'IAEA Uranium Resources, Production and Demand (Red Book)', use: '全球铀资源储量、品位与开采成本分级基准', url: 'https://www.iaea.org' },
      { title: 'World Nuclear Association: Supply of Uranium', use: '主产国矿企产能分布与长协履约机制', url: 'https://world-nuclear.org' }
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
    code: 'AGENT / 02',
    label: '运输通道 Agent',
    subtitle: '陆海走廊与跨境口岸',
    camp: '通道 / 口岸',
    agentClass: 'RouteNode',
    modelingMethod: '规则与网络流仿真',
    countHint: '陆运 / 海运通道',
    categories: ['跨境铁路口岸', '远洋散货航线', '中间走廊铁海联运', '集装箱换装枢纽'],
    role: {
      identity: '连接海外矿区与国内接卸节点的运输通道，包括中亚铁路、跨里海走廊与远洋海运航线。',
      institutional_context: '受口岸通关效率、港口拥堵、航运保险与过境国安全形势影响，不参与价格博弈。',
      goal: '按计划时效完成运量交付，扰动发生时把延误与风险如实传导给上下游。',
      constraints: ['不改变货权与合同条款', '通行能力受口岸与船期硬约束', '风险由事件库驱动，不自主决策']
    },
    contract: [
      { label: '建模粒度', value: '一条干线通道 / 口岸一 Agent' },
      { label: '决策节拍', value: '实时/月度运力调度与通关复核' },
      { label: '核心目标', value: '保障跨国过境安全与准时交付' },
      { label: '输出信号', value: '通道运力余量 · 在途延误 · 风险预警' }
    ],
    decision_posture: {
      style: '被动传导与安全避险',
      risk_appetite: '无（规则驱动）',
      information_priority: ['口岸与港口拥堵事件', '航运保险与制裁限制', '季节与地缘扰动'],
      typical_actions: ['按运力分摊运量', '拥堵时延长交付周期', '触发替代路径评估']
    },
    attributes: [
      { key: 'logistics_risk', label: '物流风险', name: '通道综合物流风险', type: 'float', range: [0, 1], detail: '反映沿途过境国稳定度、恶劣气象与基础设施检修导致的断通概率。' },
      { key: 'capacity_share', label: '通道运力份额', name: '月度班列/舱位运力负荷', type: 'float', range: [0, 1], detail: '当前通道承担的天然铀总运量占设计最大通行能力的比例。' },
      { key: 'export_risk', label: '过境通关风险', name: '跨国关税与过境审查风险', type: 'float', range: [0, 1], detail: '沿途口岸海关对放射性核材料过境查验的滞留与退运风险。' }
    ],
    dynamicStates: [
      { name: '口岸换装拥堵度', detail: '中哈阿拉山口/霍尔果斯轨距换装负荷率与排队天数。' },
      { name: '在途运输延误天数', detail: '由于地缘险区绕行或港口拥堵累计增加的在途天数。' },
      { name: '月度走廊剩余运力', detail: '中欧班列每月批复限额（如12列/月）及剩余可用配额。' },
      { name: '替代航道就绪度', detail: '由中亚陆运切换为纳米比亚远洋直航海运的船期协调状态。' }
    ],
    enums: [
      { label: '通道类型', values: ['陆运（中亚铁路 / 西北口岸）', '海运（大西洋 / 印度洋 / 太平洋）', '陆海联运（TITR 中间走廊）'] }
    ],
    modules: [
      { name: '感知', input: '沿线国家过境通关政策、铁路轨距换装进度、气象与地缘险情', mechanism: '实时监测口岸班列拥堵指数与航线运费指数', output: '走廊通行能力与运价状态集合' },
      { name: '记忆', input: '历年中亚铁路运输时效、黑海与好望角航道历史延误曲线', mechanism: '时效回归模型与风险权重匹配', output: '预计在途运输时长与运力可用区间' },
      { name: '决策', input: '上下游托运需求、各通道运力上限与突发拥堵告警', mechanism: '网络流最小费用最大流分配模型与避险重定向', output: '运量分流指令与预计到货时限' },
      { name: '行为', input: '班列/货轮调度指令', mechanism: '执行跨境过境运输、组织口岸换装、触发延误告警', output: '到港交割凭证、在途跟踪轨迹' }
    ],
    process: [
      { name: '舱位申报与班列批复', detail: '获取中哈铁路专列配额或远洋散货集装箱船期。' },
      { name: '口岸报关与安全查验', detail: '通过跨境口岸核安全与危化品海关联检。' },
      { name: '运力调配与换装流转', detail: '中哈口岸宽窄轨换装或深水港吊装起航。' },
      { name: '沿途跟踪与动态避险', detail: '遭遇地缘冲突时自适应触发绕行备选通道。' },
      { name: '抵达交割与状态更新', detail: '到港交付制造基地，更新在途物流账本。' }
    ],
    states: ['通畅运转', '换装排队', '运力饱和', '地缘受阻', '绕行分流', '紧急封关'],
    interactions: [
      { target: '运输通道 ↔ 供给方', detail: '根据矿山交货期安排接车，出具过境联运提单。' },
      { target: '运输通道 ↔ 制造基地', detail: '实时推送在途货位 GPS 与预计到站时间 (ETA)，预警延误。' },
      { target: '运输通道 ↔ 口岸枢纽', detail: '协同阿拉山口/防城港海关开辟绿色通关通道，缩短换装时间。' }
    ],
    parameters: [
      { name: '基准在途天数', symbol: 'T_transit', role: '无阻碍时门到门标准交付周期', calibration: '中远海运与铁总历史运单' },
      { name: '月度班列上限', symbol: 'C_max', role: '口岸专用换装线硬件通行能力极值', calibration: '阿拉山口车站运行图' },
      { name: '绕行成本系数', symbol: 'k_reroute', role: '海运南移或绕行好望角带来的运费上浮倍数', calibration: '波罗的海航运运价指数' }
    ],
    references: [
      { title: 'Global Maritime Trade Resilience and Geopolitical Chokepoints', use: '海运关键咽喉海峡中断与绕行成本核算标准', url: 'https://unctad.org' },
      { title: 'China-Europe Railway Express Logistics Handbook', use: '中欧/中亚跨境铁路联运专线换装规范', url: 'https://cr-express.cn' }
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
    code: 'AGENT / 03',
    label: '制造与转化基地 Agent',
    subtitle: '国内制造与转化采购主体',
    camp: '国内制造与转化',
    agentClass: 'ManufacturerAgent',
    modelingMethod: '季度调度与OODA自适应分配',
    countHint: '制造基地 / 转化入库节点',
    categories: ['北方包头基地', '南方宜宾基地', '接卸港口转化节点', '国家储备借调申请主体'],
    role: {
      identity: '代表北方（包头）与南方（沿海/宜宾）燃料元件制造基地及转化衔接节点，统筹天然铀采购、转化排产、应急调剂与库存均衡。',
      institutional_context: '承担国家核安全保供与换料大修刚性保障责任，受 180 天商业安全库存红线及中哈口岸铁路月度通运上限（1,200 tU/月）刚性约束。',
      goal: '在确保全网在役机组（华龙一号首炉/商用大修）零停堆断料风险的前提下，平抑到岸完全成本，消除南北跨基地库存失衡。',
      constraints: ['核安全刚性保供优先于成本', '各基地安全库存不低于 180 天红线', '两用物项运输与放射性危化合规']
    },
    contract: [
      { label: '建模粒度', value: '一燃料基地 / 采购中心一 Agent' },
      { label: '决策节拍', value: '月度采购规划 + 突发事件紧急调度' },
      { label: '核心目标', value: '核安全刚性保供 · 到岸成本平抑 · 零停堆' },
      { label: '输出信号', value: '采购订单 · 跨基地库存调拨 · 储备借调指令' }
    ],
    decision_posture: {
      style: '风险厌恶型跨基地协同调度',
      risk_appetite: '极度保守（安全保供绝对优先）',
      information_priority: ['机组换料大修截止期', '口岸与远洋在途到货进度', '各基地库存可用周数差异'],
      typical_actions: ['倒排换料截止期动态调整排产', '启动南北基地横向库存调拨', '申请中央战略储备应急平抑借调']
    },
    attributes: [
      { key: 'demand_tU', label: '年度需求', name: '基地原料年需求量', unit: 'tU/年', type: 'range', range: [1000, 11000], detail: '支撑在役和新投运核电机组首炉装料的天然铀刚性总需求。' },
      { key: 'target_inventory_years', label: '目标库存覆盖', name: '商业安全库存储备目标', unit: '年', type: 'range', range: [1, 4.5], detail: '基地常态化维持的安全周转底仓，用于平抑跨国供应链断供冲击。' },
      { key: 'diversification_limit', label: '单一来源上限', name: '单一产区依赖度红线', type: 'float', range: [0.15, 0.8], detail: '防范地缘单一绑架，限制从单一国家采购天然铀的最大比例。' },
      { key: 'risk_aversion', label: '风险厌恶', name: '风险厌恶系数', type: 'float', range: [0.2, 0.8], detail: '采购决策中对供给履约风险相对价格折扣的重视权重。' },
      { key: 'cost_sensitivity', label: '成本敏感度', name: '现货溢价敏感度', type: 'float', range: [0.2, 0.8], detail: '面对国际现货非理性暴涨时的抑制下单阈值。' },
      { key: 'target_supplier_count', label: '目标供给方数量', name: '多源供给方梯队规模', type: 'int', range: [1, 5], detail: '保持长协采购合作的主力供给国与矿山组合数量。' }
    ],
    dynamicStates: [
      { name: '安全库存覆盖周数', detail: '当前基地可用原料折算保障周数（红线警戒底线 16 周）。' },
      { name: '在途补库交付倒计时', detail: '已采购矿石到港/口岸换装抵厂剩余天数（动态追踪）。' },
      { name: '南北基地调剂余量', detail: '包头与宜宾之间公路/铁路横向调拨可用应急吨数。' },
      { name: '国家战略储备借调额度', detail: '已获得国家发改委核准可调用的削峰保供借调额度。' }
    ],
    preferenceWeights: [
      { key: 'price', label: '价格', weight: 0.22 },
      { key: 'reliability', label: '履约可靠性', weight: 0.24 },
      { key: 'risk', label: '供给风险', weight: 0.20 },
      { key: 'logistics', label: '物流风险', weight: 0.10 },
      { key: 'contract', label: '合同偏好', weight: 0.12 },
      { key: 'diversification', label: '来源分散', weight: 0.12 }
    ],
    enums: [
      { label: '实体类型', values: ['核电采购主体', '港口接收节点', '元件加工基地'] }
    ],
    modules: [
      { name: '感知', input: '各基地实时库存数据、换料机组需求日程、在途运力到达预报', mechanism: '滑动窗口库存消耗预测与核安全风险识别', output: '全网库存可用度与缺口预警' },
      { name: '记忆', input: '长协履约历史、供应商风险画像、相似地缘冲突应对预案', mechanism: '多准则案例推理 (CBR) 与供应商偏好六维雷达匹配', output: '适用采购预案与可用资源清单' },
      { name: '决策', input: '各供应商报价、通道风险、安全库存红线与国家储备配额', mechanism: '多目标鲁棒优化 (成本最小化 + 保供韧性最大化)', output: '多通道采购组合、横向调拨指令、储备借调申请' },
      { name: '行为', input: '经核准的调度执行清单', mechanism: '下达采购订单、启动南北调剂、协调口岸绿色通关与储备提货', output: '正式调度令 #DISPATCH-ORD、采购履约日志' }
    ],
    process: [
      { name: '需求聚合与缺口研判', detail: '汇总全国核电机组年度换料需求，测算安全库存缺口。' },
      { name: '策略求解与方案优选', detail: '多维偏好模型权衡成本、保供与地缘风险，选定最优采购比。' },
      { name: '订单签发与调度下达', detail: '下发采购订单、锁定长协与海运分流航次。' },
      { name: '应急削峰与协同调剂', detail: '若遇突发断供，快速触发战略储备借调与南北跨基地调拨。' },
      { name: '排产转化与安全归还', detail: '组织燃料元件生产，机组保供完成后向储备库依规返还。' }
    ],
    states: ['常态生产', '原料告警', '储备平抑', '横向调拨', '应急保供', '库存均衡'],
    interactions: [
      { target: '制造基地 ↔ 需求端', detail: '倒排华龙一号首炉及商用换料计划，保质保量交付燃料组件。' },
      { target: '制造基地 ↔ 国家战略储备', detail: '在遭遇断航暴涨极端冲击时申请 400 tU 储备借调削峰，并在事后归还。' },
      { target: '包头基地 ↔ 宜宾基地', detail: '启动南北基地横向跨区域库存协同调剂，消除单边积压或饥渴。' }
    ],
    parameters: [
      { name: '安全库存红线', symbol: 'I_min', role: '强制触发战略借调的最低保障库存周数 (16周)', calibration: '国家核安全保供红线规范' },
      { name: '储备削峰借调额度', symbol: 'Q_reserve', role: '单次获批借调的战略应急储备上限 (400 tU)', calibration: '国家发改委两用物项专项预案' },
      { name: '横向调运时效', symbol: 'T_transfer', role: '北方包头至南方宜宾应急调拨周转时间 (5-7天)', calibration: '特种危化品铁路专运调度实绩' }
    ],
    references: [
      { title: 'National Nuclear Safety Administration: Nuclear Fuel Supply Guidelines', use: '商用堆及关键堆型核燃料安全库存与防断料规程', url: 'https://nnsa.mee.gov.cn' },
      { title: 'Strategic Stockpiling and Buffer Management in Critical Supply Chains', use: '战略物资缓冲库存削峰填谷与逆周期采购策略', url: 'https://sciencedirect.com' }
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
    code: 'AGENT / 04',
    label: '核电需求端 Agent',
    subtitle: '沿海在役与示范核电机组',
    camp: '核电需求',
    agentClass: 'DemandNode',
    modelingMethod: '换料日程与刚性计划',
    countHint: '核电机组集群',
    categories: ['华龙一号首炉机组', '商业运行核电机组', '商用换料大修集群', '计划需求终端'],
    role: {
      identity: '汇总核电需求，向采购主体提供年度需求和消耗信号。',
      institutional_context: '年度需求按场景基线和事件影响更新，用于衡量采购、库存与需求缺口。',
      goal: '按换料计划稳定获得核燃料，把库存消耗与缺口信号反馈给制造方。',
      constraints: ['需求不因价格短期波动改变', '缺口不能通过削减发电吸收']
    },
    contract: [
      { label: '建模粒度', value: '一核电机组集群一 Agent' },
      { label: '决策节拍', value: '换料周期 (12-18个月) 驱动' },
      { label: '核心目标', value: '机组稳定商运与换料大修保供' },
      { label: '输出信号', value: '年度核燃料需求计划 · 停机换料窗口' }
    ],
    decision_posture: {
      style: '计划驱动与安全第一',
      risk_appetite: '无（规则驱动）',
      information_priority: ['换料计划', '库存覆盖', '新增机组投运'],
      typical_actions: ['发布年度需求计划', '反馈库存消耗与缺口']
    },
    attributes: [
      { key: 'annual_demand_tU', label: '年度需求', name: '年均核燃料刚性消耗', unit: 'tU/年', type: 'range', range: [9000, 14000], detail: '全网各机组按发电基荷计划折算的天然铀年均刚性消耗总量。' },
      { key: 'demand_growth_rate', label: '需求年增长率', name: '装机增长复合率', type: 'float', range: [0, 0.03], detail: '随着新核准三代核电项目陆续并网商运带来的年度需求稳态增量。' }
    ],
    dynamicStates: [
      { name: '换料大修倒计时', detail: '首炉装料与在役机组停机换料截止天数（刚性倒排）。' },
      { name: '断料停堆风险暴露度', detail: '元件到货滞后导致核电机组非计划停堆的风险评级。' },
      { name: '日均天然铀消耗率', detail: '当前满负荷发电基荷运转下的天然铀日均消耗率。' },
      { name: '应急增订响应状态', detail: '机组负荷临时调高时向上游下达的增补订单状态。' }
    ],
    enums: [],
    modules: [
      { name: '感知', input: '电网负荷调度计划、核电机组功率因数、换料大修窗口期', mechanism: '换料倒计时比对与元件消耗速率推演', output: '刚性换料大修节点与燃料需求表' },
      { name: '记忆', input: '机组历年换料周期、燃料组件燃烧度实绩、装料工艺耗时', mechanism: '核安全规程工期检索与冗余安全缓冲校核', output: '基准需求量与允许到货窗口' },
      { name: '决策', input: '当前库存余量、制造基地交付计划、机组启停成本', mechanism: '核安全第一目标函数，判定是否触发停料断料告警', output: '需求确认函、紧急加料请求' },
      { name: '行为', input: '元件入库交接指令', mechanism: '接收燃料组件、装料入堆、反馈质量与到货时效', output: '装料运行记录、需求闭环反馈' }
    ],
    process: [
      { name: '运行监测与周期规划', detail: '实时监测反应堆运行燃耗，制定 18 个月换料大修周期。' },
      { name: '计划申报与倒排工期', detail: '提前向采购主体申报装料截止日期与技术规格。' },
      { name: '交付跟踪与前置核验', detail: '追踪制造基地排产进度与运输抵厂时间。' },
      { name: '装料商运与应急响应', detail: '完成换料大修并恢复并网商运；遇延误触发备用燃料机制。' },
      { name: '效能评估与需求反馈', detail: '评估组件运行性能，形成下一轮采购需求调整建议。' }
    ],
    states: ['商用稳态运行', '换料大修筹备', '首炉装料测试', '断料停堆预警', '满功率发电'],
    interactions: [
      { target: '核电需求端 ↔ 制造基地', detail: '提前 12 个月锁死装料窗口，接收燃料组件并出具入厂质量凭证。' },
      { target: '核电需求端 ↔ 国家电网', detail: '根据电网基荷计划提供 7x24 小时零碳稳定电能输出。' }
    ],
    parameters: [
      { name: '换料周期', symbol: 'T_cycle', role: '商用堆标准换料间隔（18个月）', calibration: '核电厂大修工程计划' },
      { name: '停堆惩罚成本', symbol: 'C_shutdown', role: '每台百万千瓦机组停堆一天的经济与民生损失 (10x惩罚)', calibration: '国家发改委电价调度核算标准' }
    ],
    references: [
      { title: 'World Nuclear Performance Report', use: '全球核电机组容量因子与换料大修基线指标', url: 'https://world-nuclear.org' }
    ],
    cognition: {
      observe: ['机组运行与换料计划'],
      orient: ['库存覆盖年数'],
      decide: ['需求计划'],
      act: ['需求下达', '缺口反馈']
    }
  },
  other: {
    tier: 'other',
    code: 'AGENT / 00',
    label: '其他辅助实体',
    subtitle: '通用与边缘实体',
    camp: '未分类',
    agentClass: '',
    modelingMethod: '规则式',
    countHint: '实体',
    categories: ['辅助实体'],
    role: { identity: '', institutional_context: '', goal: '', constraints: [] },
    contract: [],
    attributes: [],
    dynamicStates: [],
    modules: [],
    process: [],
    states: [],
    interactions: [],
    parameters: [],
    references: [],
    decision_posture: { style: '', risk_appetite: '', information_priority: [], typical_actions: [] },
    enums: [],
    cognition: { observe: [], orient: [], decide: [], act: [] }
  }
})

// ========== 学长场景参考：环境模型分层架构 ==========
export const URANIUM_ENVIRONMENT_LAYERS = Object.freeze([
  {
    code: 'LAYER 01',
    name: '空间拓扑与资源分布',
    detail: '涵盖全球哈萨克斯坦、纳米比亚等核心产铀国、中亚国际铁路干线、阿拉山口/霍尔果斯换装口岸、连云港/防城港深水港及北方包头/南方宜宾燃料制造基地。',
    output: '全球陆海拓扑网络',
    icon: 'MapLocation'
  },
  {
    code: 'LAYER 02',
    name: '动态运力与运价走廊',
    detail: '实时追踪中哈班列月度运力限额（12列/月）、散货海运舱位、航运运费与地缘保险溢价费率，传导在途延误。',
    output: '在途时滞与运费矩阵',
    icon: 'Histogram'
  },
  {
    code: 'LAYER 03',
    name: '地缘政治与制裁环境',
    detail: '欧美禁俄铀法案、中欧过境过境政策收紧、长协不可抗力声明等外部突发冲击事件流，驱动风险溢价。',
    output: '地缘扰动与中断事件库',
    icon: 'Bell'
  },
  {
    code: 'LAYER 04',
    name: '应急调度执行接口',
    detail: '支持直接向海运通道下达分流绕行令、向国家发改委申请战略储备借调配额，以及南北基地紧急调拨。',
    output: '调度令生效与实绩反馈',
    icon: 'Operation'
  }
])

// ========== 学长场景参考：陆海战略走廊参数 ==========
export const URANIUM_LOGISTICS_CORRIDORS = Object.freeze([
  {
    id: 'corridor-kz',
    name: '中哈铁路专列 (阿拉山口/霍尔果斯)',
    cost: '$8.0 / kgU',
    transitTime: '15–18 天',
    capacity: '1,200 tU / 月 (12 列专列)',
    status: '重点承压',
    statusType: 'warning',
    desc: '主力中亚陆运通道；受俄欧转运受阻避险货物挤兑，阿拉山口换装负荷率已达 94%。'
  },
  {
    id: 'corridor-ocean',
    name: '远洋直航海运 (纳米比亚 - 华南防城港)',
    cost: '$17.0 / kgU',
    transitTime: '45 天',
    capacity: '6,500 tU / 年 (运力充沛)',
    status: '韧性走廊',
    statusType: 'success',
    desc: '独立远洋直航航线，彻底规避黑海及欧洲冲突险区，具备 55% 应急分流潜力。'
  },
  {
    id: 'corridor-titr',
    name: '跨里海中间走廊 (TITR 铁海联运)',
    cost: '$28.0 / kgU',
    transitTime: '38 天',
    capacity: '1,800 tU / 年',
    status: '备选走廊',
    statusType: 'info',
    desc: '含阿克套港集装箱海运转装，作为陆路受阻时的高成本备选走廊。'
  }
])

// ========== 学长场景参考：规则模型数理公式 ==========
export const URANIUM_RULE_MATHEMATICS = Object.freeze([
  {
    id: 'rule-inventory',
    title: '战略保供刚性达成率与安全库存底线',
    code: 'I_t = I_{t-1} + Q^{arrive}_t - D_t \\ge I^{min}_{safe} = 16 \\text{ 周}',
    note: '各基地天然铀库存保障周数低于 16 周红线时强制触发国家储备削峰借调，确保在役机组 0 停堆。'
  },
  {
    id: 'rule-cost',
    title: '到岸完全平准化成本加权平衡',
    code: 'C^{landed} = \\frac{\\sum_i (P_i + T_i + R_i) \\cdot Q_i}{\\sum_i Q_i}',
    note: '综合采购价 P_i、通道运费 T_i 与地缘风险溢价 R_i，以加权平均最小化到岸成本，平抑现货暴涨。'
  },
  {
    id: 'rule-bullwhip',
    title: '恐慌牛鞭效应方差膨胀比约束',
    code: '\\text{BWE} = \\frac{\\sigma^2(\\text{Orders}) / \\mu(\\text{Orders})}{\\sigma^2(\\text{Demand}) / \\mu(\\text{Demand})} \\le 1.40',
    note: '衡量下游在役核电机组因地缘断供恐慌而向上游过度囤积虚报订单的程度；自适应算法平抑订货方差。'
  }
])

// ========== 学长场景参考：四级安全量表 ==========
export const URANIUM_SAFETY_LEVELS = Object.freeze([
  { name: '正常稳态', range: '库存 ≥ 24 周', rule: '全网供给平稳，长协 100% 正常履约', color: '#10b981' },
  { name: '轻度承压', range: '18–24 周', rule: '通道略显拥堵，国际现货溢价 < 15%', color: '#3b82f6' },
  { name: '保供警戒', range: '14–18 周', rule: '逼近警戒红线，启动海运南移 55% 分流', color: '#f59e0b' },
  { name: '严重断链', range: '< 14 周', rule: '面临断料停堆极高风险，强启国家储备 400tU', color: '#ef4444' }
])

// ========== 学长场景参考：自适应调度触发规则表 ==========
export const URANIUM_DISPATCH_TRIGGER_RULES = Object.freeze([
  {
    trigger: '口岸铁路换装负荷 ≥ 90% 且在途延误 > 15 天',
    action: '【调度令 #01】启动纳米比亚海运直航分流 55%，规避陆运拥堵',
    reset: '口岸换装负荷回落至 < 75% 且持续 20 天'
  },
  {
    trigger: '某制造基地原料库存跌破 16 周安全警戒底线',
    action: '【调度令 #02】向国家发改委申请借调中央战略储备 400 tU 削峰',
    reset: '在途新运力抵达入库，库存回升至 20 周以上并依规归还'
  },
  {
    trigger: '国际现货暴涨 > $85/lb 且现货溢价超过 30%',
    action: '【调度令 #03】刚性熔断高位现货追涨，优先锁定中哈长协履约',
    reset: '国际现货回落至平稳区间或长协全量交付'
  },
  {
    trigger: '华龙一号首炉装料工期倒排 ≤ 60 天',
    action: '【调度令 #04】赋予最高 P0 刚性保供优先权，启动南北基地紧急调拨',
    reset: '首炉机组顺利完成装填并并网商运'
  }
])

// ========== 学长场景参考：权威战略与文献依据 ==========
export const URANIUM_RESEARCH_BASIS = Object.freeze([
  {
    year: '2021',
    title: 'IAEA NF-T-2.1: Nuclear Fuel Supply Assurance Guidelines',
    use: '国际原子能机构核燃料供应安全与战略缓冲储备管理机制准则。',
    authors: 'IAEA Nuclear Energy Series',
    venue: 'Vienna, International Atomic Energy Agency'
  },
  {
    year: '2023',
    title: 'Managing Critical Mineral Supply Disruptions in Global Clean Energy Networks',
    use: '关键矿产地缘断链风险传导与多通道冗余度鲁棒建模分析。',
    authors: 'S. Mitchell, K. Zhang, et al.',
    venue: 'Nature Energy, Vol. 8'
  },
  {
    year: '2024',
    title: 'Bullwhip Effect Mitigation in Nuclear Supply Chains via Multi-Agent Systems',
    use: '基于多智能体自适应博弈的跨基地核燃料库存再平衡算法与实验验证。',
    authors: 'MACE Strategic Systems Group',
    venue: 'IEEE Trans. on Systems, Man, and Cybernetics'
  }
])

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
      if (actor.activation_year) facts.push({ label: '情景启用年份', value: String(actor.activation_year) })
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
