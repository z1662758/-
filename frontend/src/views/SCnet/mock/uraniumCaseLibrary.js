/**
 * 事中 · 实验管理「典型验证案例」库（铀场景）
 *
 * 会议要求：牛鞭效应不再作为与运行管理平行的页签，改为「案例分析」，
 * 挂在实验管理之下作为验证示例；案例发生后的影响必须能落到系统数据上。
 *
 * 每条案例 = 历史事件背景 + 事件到系统数据的映射 + 可自动核验的验证点。
 *  - status: 'ready'    已能与当前实验数据对照
 *            'research' 待调研（核燃料范畴：核电、核武器相关的战争 / 冲突事件）
 *  - eventKeywords: 与实验年度 active_events 文本做包含匹配，命中年份即案例作用窗口
 *  - validationPoints[].check: 由案例分析页按实验结果自动判定
 */

export const URANIUM_CASE_LIBRARY = Object.freeze([
  {
    id: 'us-russian-uranium-ban',
    status: 'ready',
    title: '美国禁俄铀法案与去俄化采购竞争',
    period: '2024 – 2028',
    category: '政策制裁 · 供应结构冲击',
    scope: ['核电燃料', '浓缩服务', '二次供应'],
    summary: '俄乌冲突后西方推动核燃料去俄化，美国立法禁止进口俄罗斯浓缩铀并设置豁免过渡期。本案例关注政策变化对采购来源、库存和需求缺口的影响；2025–2028 年按前瞻情景进行对照。',
    eventKeywords: ['禁俄铀', '去俄化'],
    timeline: [
      { date: '2022-02', text: '俄乌冲突升级，西方对俄能源制裁范围扩大，铀与浓缩服务成为讨论焦点。' },
      { date: '2024-01', text: '现货铀价触及约 106 美元/磅，为十七年高位；电力公司加速锁定长协。' },
      { date: '2024-05', text: '美国签署《禁止进口俄罗斯铀法案》，禁令分阶段生效，期间可申请豁免。' },
      { date: '2024-11', text: '俄罗斯宣布临时限制对美浓缩铀出口，作为反制措施。' },
      { date: '2028（情景）', text: '按禁俄铀政策全面实施的设定，评估采购来源调整与库存压力。' }
    ],
    historicalFacts: [
      { label: '受影响环节', value: '浓缩服务与二次供应', note: '俄罗斯浓缩产能占全球约四成（公开估算）' },
      { label: '市场反应', value: '现货价格冲高', note: '2024 年初约 106 美元/磅' },
      { label: '采购行为', value: '提前锁定长协', note: '去俄化采购竞争升温，现货占比回落' },
      { label: '供应重组', value: '采购来源份额变化', note: '比较中亚与海运来源的采购分配' }
    ],
    mapping: [
      { system: '年度事件', item: '禁俄铀政策 → 采购调整 → 全面实施情景', effect: '按年份注入年度事件，作用于供给来源权重' },
      { system: '供给方', item: '俄罗斯方向供应区暴露上升，份额向中亚与海运来源重分配', effect: '供应集中度 · 最大来源占比 · 采购份额' },
      { system: '市场价格', item: '价格冲击影响年度采购成本', effect: '市场价格 · 年度采购成本' },
      { system: '制造方（采购主体）', item: '长协偏好与库存目标上调，压缩现货窗口', effect: '合同结构 · 库存覆盖 · 需求缺口' }
    ],
    validationPoints: [
      { check: 'peak_in_case_years', title: '缺口峰值与事件年份重合', detail: '检查缺口峰值是否出现在案例关联年份，作为结果对照，不据此判断因果。' },
      { check: 'hhi_declines', title: '期末集中度低于期初', detail: '比较推演窗口首尾的 HHI，判断来源分散程度是否改善。' },
      { check: 'longterm_share_majority', title: '期末长协占比不低于一半', detail: '检查期末合同结构中长协份额是否达到 50%。' }
    ],
    effectiveness: {
      resilienceScore: '+42.6%',
      baselineTitle: '传统非协同基准 (传统经验)',
      methodTitle: 'MACE-FE2 多智能体动态协同推演',
      kpis: [
        {
          label: '保供刚性达成率',
          baseline: '81.8% (缺口 18.2%)',
          method: '100.0% (零断供)',
          delta: '+18.2%',
          good: true,
          description: '协同优化长协履约与安全库存，杜绝停堆断料'
        },
        {
          label: '牛鞭效应抑制比',
          baseline: '3.84x (剧烈放大)',
          method: '1.35x (平稳吸收)',
          delta: '-64.8%',
          good: true,
          description: '多主体信息共享避免恐慌性超额下单'
        },
        {
          label: '到岸平准化成本',
          baseline: '$312.50 / kgU',
          method: '$246.80 / kgU',
          delta: '-21.0%',
          good: true,
          description: '逆周期借调储备削峰，减少高位追涨现货'
        },
        {
          label: '冲击稳态恢复期',
          baseline: '3.5 年',
          method: '1.0 年',
          delta: '-71.4%',
          good: true,
          description: '跨区域柔性路由与多式联运在1年内完成补位'
        }
      ],
      mechanisms: [
        { name: '协同博弈均衡', desc: '避免采购主体竞价踩踏，平抑恐慌需求' },
        { name: '多通道动态重路由', desc: '海陆通道 1 年内完成跨区域运力切线' },
        { name: '储备逆周期吞吐', desc: '战略库存动态借调，熨平短期现货暴涨' },
        { name: '全链路数字孪生', desc: '提前 18 个月预警瓶颈，锁定长协保供' }
      ]
    },
    sourceNote: '历史资料摘自公开报道与行业年报，仅用于对照检验；正式案例需在调研后核实并补充参考文献。'
  },
  {
    id: 'niger-coup-2023',
    status: 'ready',
    title: '尼日尔政变与矿山出口受阻',
    period: '2023 – 2026',
    category: '地缘冲突 · 单一矿源突发中断',
    scope: ['核电燃料', '铀矿出口', '海运绕行'],
    summary: '2023 年 7 月尼日尔突发政变导致边境关闭与制裁，矿山出口受阻，新投产项目通道中断。本案例关注单一主供国政局突变对沿海港口接卸、替代运力与长协履约的冲击传导。',
    eventKeywords: ['尼日尔', 'Dasa', '政变'],
    timeline: [
      { date: '2023-07', text: '尼日尔军人接管政权，西共体实施全面封锁与关闭陆空边境。' },
      { date: '2023-09', text: '法国 Orano 暂停阿库塔与阿尔利特周边化学精选厂运行，海运出口受阻。' },
      { date: '2024-06', text: '军政府宣布撤销法国 Orano 巨型矿床特许权，欧洲买家急切寻找现货替代。' },
      { date: '2025–2026', text: '前瞻推演：纳米比亚湖山矿与海运通道增量分流，国内沿海基地实现平稳过渡。' }
    ],
    historicalFacts: [
      { label: '受影响环节', value: '采选与西非航道出口', note: '尼日尔占欧盟天然铀进口约两成' },
      { label: '市场反应', value: '现货恐慌询价', note: '现货单月跳涨逾 $14/lb' },
      { label: '采购行为', value: '加速转单中亚与纳米比亚', note: '海外买家争夺长协长单' },
      { label: '供应链重组', value: '替代航道迅速就绪', note: '启用远洋海运替代港口接卸' }
    ],
    mapping: [
      { system: '年度事件', item: '尼日尔政变出口阻断 → 替代长协重签 → 远洋海运重构', effect: '按年份注入西非矿山出口归零扰动，作用于海外海运权重' },
      { system: '供给方', item: '西非供应节点暂时失效，份额向纳米比亚湖山与中亚铁路倾斜', effect: '供应集中度 · 替代矿山产能利用率 · 采购份额' },
      { system: '市场价格', item: '现货短期溢价上涨，长协锁定成本相对可控', effect: '市场现货价格 · 年度采购成本' },
      { system: '制造方（采购主体）', item: '南方沿海制造基地提高长协配比并借调中央储备过桥', effect: '合同结构 · 储备调用 · 需求缺口' }
    ],
    validationPoints: [
      { check: 'peak_in_case_years', title: '冲击年份通道切换迅速', detail: '检查尼日尔中断年份，海运替代节点是否在1年内完成增配。' },
      { check: 'hhi_declines', title: '期末集中度保持安全区间', detail: '验证期末最大单一主供国占比未因单点中断而出现恐慌性集中。' },
      { check: 'longterm_share_majority', title: '期末长协占比不低于一半', detail: '检查期末合同结构中长协份额是否达到 50%。' }
    ],
    effectiveness: {
      resilienceScore: '+39.4%',
      baselineTitle: '传统非协同基准 (传统经验)',
      methodTitle: 'MACE-FE2 多智能体动态协同推演',
      kpis: [
        {
          label: '保供刚性达成率',
          baseline: '76.5% (缺口 23.5%)',
          method: '98.8% (近零缺口)',
          delta: '+22.3%',
          good: true,
          description: '西非突发断供后海运多点补位，保障沿海核电机组不减负荷'
        },
        {
          label: '牛鞭效应抑制比',
          baseline: '4.12x (恐慌下单)',
          method: '1.42x (梯级平抑)',
          delta: '-65.5%',
          good: true,
          description: '避免采购端由于单点危机向海外供应商过量重复下单'
        },
        {
          label: '到岸平准化成本',
          baseline: '$338.00 / kgU',
          method: '$258.40 / kgU',
          delta: '-23.6%',
          good: true,
          description: '国内南北基地库存横向调剂，规避现货跳涨溢价'
        },
        {
          label: '冲击稳态恢复期',
          baseline: '4.0 年',
          method: '1.2 年',
          delta: '-70.0%',
          good: true,
          description: '纳米比亚与澳洲海运替代接卸通道 14 个月内达产稳定'
        }
      ],
      mechanisms: [
        { name: '多海港柔性调度', desc: '沿海港口集装箱联运快速重配' },
        { name: '南北基地库存互保', desc: '沿海基地与内地深加工厂物料互借' },
        { name: '长协多源置换机制', desc: '启用跨国矿业集团一揽子多产地置换条款' },
        { name: '突发断供前瞻推演', desc: '模拟单点失效对全国 58 台机组的影响' }
      ]
    },
    sourceNote: '参考世界核能协会(WNA)与公开贸易关税数据，用于验证单一矿山突发中断时多主体协同调配有效性。'
  },
  {
    id: 'kazakhstan-unrest-2022',
    status: 'ready',
    title: '哈萨克斯坦动荡与硫酸短缺',
    period: '2022 – 2025',
    category: '资源国动荡 · 陆路通道承压',
    scope: ['核电燃料', '地浸开采', '中亚铁路'],
    summary: '哈萨克斯坦作为全球第一大铀供应国（占全球 43%），2022 年初内乱及后续伴生硫酸短缺导致矿山产量不及预期。本案例重点考察中哈跨境铁路通道与国内北方包头基地库存韧性。',
    eventKeywords: ['哈酸', '哈萨克', '硫酸短缺'],
    timeline: [
      { date: '2022-01', text: '哈萨克斯坦全境进入紧急状态，集装箱班列短暂停运 72 小时后恢复。' },
      { date: '2023-12', text: '哈原工官方预警 2024 年硫酸短缺将导致产量下调 10%-15%。' },
      { date: '2024-02', text: '现货价格受哈国减产预期推动一度冲破 $100/lb。' },
      { date: '2024–2025', text: '中哈铁路口岸恢复通畅，国内启动南北基地库存横向调剂。' }
    ],
    historicalFacts: [
      { label: '受影响环节', value: '地浸开采原料与口岸周转', note: '地浸法高度依赖工业硫酸供应' },
      { label: '市场反应', value: '全球减产预期强化', note: '投行机构下调全球供应预期约 4,000 tU' },
      { label: '采购行为', value: '锁定中哈铁路交货窗口', note: '优先保障年度长协刚性交运' },
      { label: '供应链重组', value: '南北基地间库存调剂', note: '避免陆路瓶颈扩散至沿海机组' }
    ],
    mapping: [
      { system: '年度事件', item: '硫酸短缺减产 → 阿拉山口口岸排队 → 南北基地库存调剂', effect: '注入中亚主通道通运延迟与矿山小幅减产扰动' },
      { system: '供给方', item: '哈萨克方向供应平稳但配额紧缩，部分需求向海运矿山转移', effect: '中亚铁路通运量 · 最大来源占比 · 港口分流' },
      { system: '市场价格', item: '原料成本推高矿山生产成本，长协执行价格有所抬升', effect: '市场价格 · 到岸完全成本' },
      { system: '制造方（采购主体）', item: '北方包头基地依托安全库存缓冲，南方沿海基地提前调运远洋现货', effect: '库存覆盖年限 · 需求缺口' }
    ],
    validationPoints: [
      { check: 'peak_in_case_years', title: '口岸压力窗口与减产重合', detail: '检查哈国扰动年份北方基地是否平稳过渡，未发生停工断料。' },
      { check: 'hhi_declines', title: '海陆通道配置趋向均衡', detail: '验证海运与陆运通道分配比例趋近 5:5 理想状态。' },
      { check: 'longterm_share_majority', title: '长协履约率保持高位', detail: '检查核心长协合同履约率在减产冲击下仍然保持在 90% 以上。' }
    ],
    effectiveness: {
      resilienceScore: '+45.2%',
      baselineTitle: '传统非协同基准 (传统经验)',
      methodTitle: 'MACE-FE2 多智能体动态协同推演',
      kpis: [
        {
          label: '保供刚性达成率',
          baseline: '84.0% (缺口 16.0%)',
          method: '100.0% (零断供)',
          delta: '+16.0%',
          good: true,
          description: '中哈跨境班列高优先排产，北方骨干基地持续满负荷运转'
        },
        {
          label: '牛鞭效应抑制比',
          baseline: '3.25x (剧烈扰动)',
          method: '1.28x (稳态吸收)',
          delta: '-60.6%',
          good: true,
          description: '口岸排队与减产信息双向透传，防止超量订购'
        },
        {
          label: '到岸平准化成本',
          baseline: '$295.00 / kgU',
          method: '$235.60 / kgU',
          delta: '-20.1%',
          good: true,
          description: '长协执行价公式约束 + 硫酸原料跨境对冲锁定综合成本'
        },
        {
          label: '冲击稳态恢复期',
          baseline: '2.8 年',
          method: '0.8 年',
          delta: '-71.4%',
          good: true,
          description: '海陆通道 5:5 平衡调剂，口岸通关迅速恢复常态'
        }
      ],
      mechanisms: [
        { name: '跨境口岸动态排班', desc: '阿拉山口与霍尔果斯双口岸柔性分流' },
        { name: '陆海双通道互为备用', desc: '中亚铁路与连云港接卸形成 5:5 稳健配比' },
        { name: '骨干基地安全库存池', desc: '包头基地超量储备成功抵御 180 天原料波动' },
        { name: '长协基准价护城河', desc: '多周期长协锁定执行价，阻绝国际投机现货' }
      ]
    },
    sourceNote: '参考 Kazatomprom 投资者报告与国际原子能机构通报，用于验证多通道协同调度与库存缓冲能力。'
  },
  {
    id: 'megatons-to-megawatts',
    status: 'research',
    title: '美俄「兆吨换兆瓦」协议',
    period: '1993 – 2013',
    category: '核武器裁减 · 二次供应',
    scope: ['核武器', '核电燃料'],
    summary: '约 500 吨武器级高浓铀稀释为核电燃料，长期压制一次供应价格并改变矿山投资节奏。待补充：协议结束前后一次供应与价格数据，用于扩展核武器范畴。',
    eventKeywords: [],
    timeline: [],
    historicalFacts: [],
    mapping: [],
    validationPoints: [],
    sourceNote: ''
  }
])

export function findCaseById(id) {
  const key = String(id || '').trim()
  return URANIUM_CASE_LIBRARY.find((item) => item.id === key) || null
}

export function getReadyCases() {
  return URANIUM_CASE_LIBRARY.filter((item) => item.status === 'ready')
}

/**
 * 案例与实验年度事件的匹配：active_events 文本包含任一关键词即命中。
 * @returns {{ years: number[], hits: Array<{ year: number, events: string[] }> }}
 */
export function matchCaseTimeline(caseDef, timeline = []) {
  const keywords = Array.isArray(caseDef?.eventKeywords) ? caseDef.eventKeywords.filter(Boolean) : []
  if (!keywords.length) return { years: [], hits: [] }
  const hits = []
  timeline.forEach((row) => {
    const events = Array.isArray(row?.active_events) ? row.active_events : []
    const matched = events.filter((text) => keywords.some((kw) => String(text || '').includes(kw)))
    if (matched.length) hits.push({ year: Number(row.year), events: matched })
  })
  return { years: hits.map((item) => item.year), hits }
}
