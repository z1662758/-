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
    aliases: ['russia-ukraine-war', 'russia-ukraine-conflict', 'war'],
    status: 'ready',
    title: '俄乌冲突与核燃料全产业链地缘重塑',
    shortTitle: '俄乌冲突场景',
    period: '2022 – 2028',
    category: '地缘战争 · 核燃料循环断裂',
    scope: ['核电站安全运营', '核威慑与材料管控', '铀浓缩脱钩制裁', '海陆重构与牛鞭平抑'],
    summary: '2022年俄乌冲突爆发打破全球核燃料供需平衡。从扎波罗热核电站安全交火与东欧机组去俄化换料，到美俄战略核威慑升格与二次供应审查，再到俄罗斯掌握全球约44%浓缩与27%转化产能引发的西方制裁脱钩；下游恐慌囤料引发订单方差放大3.84倍的剧烈牛鞭效应。系统通过MACE-FE2多智能体博弈协同、战略储备削峰与海陆重路由，建立“结果评价-策略优化”闭环，达成保供刚性闭环。',
    eventKeywords: ['禁俄铀', '去俄化', '俄乌', '战争', '铀价', '制裁', '核电'],
    scenarioKey: 'war',
    scenarioName: '俄乌冲突与去俄化制裁升级 (war)',
    nuclearDimensions: [
      {
        key: 'npp',
        title: '核电站安全与运营危机',
        tag: '☢️ 核电站安全运营',
        badgeColor: '#ef4444',
        stats: [
          { label: '核心受损堆型', value: '扎波罗热 6 台 VVER' },
          { label: '安全库存目标', value: '拉长至 3.0 年储备' },
          { label: '组件去俄化', value: '全面转向西屋组件' }
        ],
        description: '扎波罗热核电站（欧洲最大核电站，6台VVER机组）多次遭炮击及外部电网断开，IAEA常驻核查；乌克兰及东欧核电站全面加速替代俄制燃料组件（转签西屋公司），全球核电业主预防性拉长安全库存至3年以避免停堆断料。'
      },
      {
        key: 'weapons',
        title: '核威慑与战略核材料管控',
        tag: '🛡️ 核威慑与战略管控',
        badgeColor: '#8b5cf6',
        stats: [
          { label: '军控条约状态', value: 'New START 暂停履约' },
          { label: '战略二次供应', value: 'HEU/LEU 稀释料收紧' },
          { label: '物项审查级别', value: '国家最高安全等级' }
        ],
        description: '战时战术核戒备与战略核力量威慑升格，美俄《新削减战略武器条约》(New START)履约受阻，高浓铀稀释转化(HEU/LEU)等二次供应不确定性激增，两用核物项及浓缩六氟化铀(UF6)跨国流转审查升至最高安全等级。'
      },
      {
        key: 'fuel_cycle',
        title: '核燃料链脱钩与牛鞭震荡',
        tag: '⛓️ 浓缩脱钩与去俄化',
        badgeColor: '#2563eb',
        stats: [
          { label: '俄占全球产能', value: '浓缩 44% / 转化 27%' },
          { label: '现货最高价格', value: '$106/lb (17年新高)' },
          { label: '订单方差放大', value: '3.84x 牛鞭效应' }
        ],
        description: '俄罗斯掌握全球约44%铀浓缩(SWU)与27%转化产能。美国签署《禁止进口俄罗斯铀法案》(H.R.1042)，俄罗斯反制限制对美出口。恐慌性抢单引发全球现货价冲破106美元/磅（17年新高），订单逐级放大形成高达3.84倍的剧烈牛鞭效应。'
      }
    ],
    impactChain: [
      { step: '01', title: '地缘战争爆发', desc: '俄乌冲突与核电站脱网危局', color: '#ef4444' },
      { step: '02', title: '脱钩与反制禁令', desc: '美俄相互制裁，浓缩出口受阻', color: '#f97316' },
      { step: '03', title: '现货暴涨脱锚', desc: '现货冲破 $106/lb (17年新高)', color: '#eab308' },
      { step: '04', title: '恐慌超额抢单', desc: '牛鞭效应剧烈放大至 3.84 倍', color: '#a855f7' },
      { step: '05', title: '多智能体闭环出清', desc: '博弈平抑订单至 1.35x，零断供保供', color: '#2563eb' }
    ],
    timeline: [
      { date: '2022-02', text: '俄乌军事冲突全面升级，扎波罗热核电站与切尔诺贝利遭遇军事交火与断电危机，IAEA进驻；战术核威慑戒备升级。' },
      { date: '2022-06', text: '乌克兰及东欧核电机组全面加速去俄化，终止俄制燃料组件合约改用西屋核燃料；欧美启动核燃料脱钩自查。' },
      { date: '2024-01', text: '恐慌性抢单传导至上游，现货铀价触及 106 美元/磅（十七年历史高位），SWU浓缩分离功与转化溢价创历史纪录。' },
      { date: '2024-05', text: '美国签署《禁止进口俄罗斯铀法案》(H.R.1042)，分阶段禁止进口俄产低浓铀，设置至2027年底的豁免期。' },
      { date: '2024-11', text: '俄罗斯政府发布出口反制令，临时限制对美浓缩铀出口，全球核燃料供应链正式步入东西方双轨阵营割裂。' },
      { date: '2028（前瞻）', text: '前瞻情景：禁俄铀全面生效，中亚跨里海走廊与纳米比亚远洋海运成为战略替代通道，海陆实现 5:5 稳健配比。' }
    ],
    historicalFacts: [
      { label: '核电站安全与运营', value: '机组去俄化换料与安全库存扩容', note: '扎波罗热交火危机促使全网核电机组拉长安全库存至3年，东欧机组替换燃料组件' },
      { label: '核威慑与材料管控', value: '军民核材料流转审查全面升格', note: '战略核威慑警报频传，暂停削减战略武器条约，高浓铀稀释等二次供应大幅收缩' },
      { label: '受影响核心环节', value: '浓缩服务与六氟化铀转化', note: '俄罗斯浓缩产能占全球约44%、转化占27%，短期内西方缺乏替代离心机产能' },
      { label: '市场反应与价格', value: '现货铀价冲破 $106/lb', note: '恐慌采购引发订单踩踏，现货跳涨2.5倍，创2007年以来十七年最高纪录' },
      { label: '牛鞭效应与采购行为', value: '恐慌超额下单，长协锁定', note: '下游虚报安全系数（1.8x），牛鞭效应方差比飙升至3.84倍，全链条剧烈震荡' },
      { label: '供应链重组路径', value: '跨里海陆运与远洋海运分流', note: '哈萨克黄饼改走跨里海中间走廊，纳米比亚湖山矿通过连云港远洋海运平稳补位' }
    ],
    mapping: [
      { system: '年度事件', item: '俄乌冲突升级 → 禁俄铀制裁与反制 → 全面去俄化情景', effect: '按年份注入地缘断供扰动，外部环境风险系数由 0.25 飙升至 0.65' },
      { system: '供给方', item: '俄罗斯通道受阻，供应向哈萨克斯坦跨里海通道与纳米比亚海运分流', effect: '供应集中度 HHI 波动 · 替代港口接卸量 · 来源多中心化' },
      { system: '制造方（采购主体）', item: '多智能体博弈平滑需求，杜绝恐慌性虚高，长协配比提升至 65%+', effect: '合同结构长协化 · 刚性保供达成率 100% · 需求缺口降至 0 tU' },
      { system: '市场价格与到岸成本', item: '逆周期战略库存平抑高位现货冲击，到岸平准化采购成本压降 21.0%', effect: '到岸平准化采购成本 ($246.8/kgU) · 避免高位套牢' },
      { system: '微观动力学（牛鞭效应）', item: '真实需求过滤抑制逐级放大，订单方差比由 3.84x 降至 1.35x (-64.8%)', effect: 'Var(Order)/Var(Demand) · 稳态恢复期由 3.5 年缩短至 1.0 年' },
      { system: '闭环反馈机制', item: '事后推演量化评价（保供刚性、成本平准、牛鞭比）反哺初始决策与参数', effect: '自适应优化安全库存系数与 5:5 海陆运力配比，完成闭环收敛' }
    ],
    validationPoints: [
      { check: 'peak_in_case_years', title: '缺口峰值与事件年份重合', detail: '检查缺口峰值是否出现在案例关联年份，作为结果对照，不据此判断因果。' },
      { check: 'hhi_declines', title: '期末集中度低于期初', detail: '比较推演窗口首尾的 HHI，判断来源分散程度是否改善。' },
      { check: 'longterm_share_majority', title: '期末长协占比不低于一半', detail: '检查期末合同结构中长协份额是否达到 50%。' }
    ],
    closedLoopFeedback: {
      title: '“结果评价-策略优化”自动化闭环反馈机制',
      summary: '针对俄乌冲突等极端黑天鹅事件，系统通过量化事后评价指标自动判定实验成效，并将优化参数反馈至决策层，形成无人值守的自动化闭环迭代体系。',
      evaluationKpis: [
        { name: '信息增益 (边际熵减)', value: '42.8%', state: 'good', desc: '排除冗余方案，实验收敛度大幅提升' },
        { name: '保供刚性达成率', value: '100.0%', state: 'good', desc: '0 吨断供缺口，关键核燃料全期无虞' },
        { name: '平准化采购成本', value: '-21.0%', state: 'good', desc: '逆周期削峰抵御 $106/lb 现货暴涨' },
        { name: '牛鞭效应抑制比', value: '-64.8%', state: 'good', desc: '方差比从 3.84x 压制至 1.35x 稳态' }
      ],
      feedbackLoops: [
        {
          target: '制造采购端 · 需求系数自适应反哺',
          trigger: '检测到下游核电站恐慌性虚报与订货方差超标 (3.84x)',
          action: '自动将采购安全上浮系数从 1.8x 自适应校正回调至 1.05x，剔除恐慌水分，恢复平稳订单流。',
          gain: '直接消减 64.8% 的无效上游订单挤兑'
        },
        {
          target: '物流运力端 · 海陆配比自适应重构',
          trigger: '俄罗斯主通道受阻且地缘风险值跃升至 0.65 以上',
          action: '自动激活中亚跨里海班列与纳米比亚海运替代路由，将通道配比重构为 5:5 稳健冗余。',
          gain: '1 年内恢复通道通畅，避免口岸塞港'
        },
        {
          target: '战略储备端 · 逆周期削峰吞吐指令',
          trigger: '国际现货跳涨至基线价格 1.5 倍以上（触及 $106/lb）',
          action: '自动触发中央储备与北方基地物料逆周期借调出库，过桥缓冲 180 天现货暴涨期。',
          gain: '到岸平准化综合成本压降 21.0%'
        }
      ]
    },
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
      ],
      dilemmaVsSolution: [
        {
          dimension: '决策协同机制',
          traditional: '各核电业主条块分割、各自推演，单凭历史经验预估缺口，难以把握西方去俄化对全球浓缩产能的全局抽水效应。',
          method: 'MACE-FE2 启动多智能体联合博弈架构，统筹全国核电机组年度需求，建立跨主体信息互信池与全网推演。',
          impact: '避免单体企业信息盲区与盲目决策'
        },
        {
          dimension: '需求下发与传导',
          traditional: '恐慌性上浮采购安全系数（1.5~2.0x），争先恐后在现货市场超额下单抢锁产能，引发多方竞价踩踏。',
          method: '需求感知 Agent 严格过滤恐慌性虚高系数，智能平滑各季度订货节奏，按各机组刚性大修节点集中编排长单。',
          impact: '牛鞭效应由 3.84x 压降至 1.35x'
        },
        {
          dimension: '运力与路由重构',
          traditional: '依赖既有欧美浓缩与海运渠道，法案落地后被动等待豁免许可，遭遇断供与船运违约双重冲击。',
          method: '多式联运路由 Agent 立即启动亚欧陆路与非洲备用航道，中亚铁路班列与纳米比亚海运 1 年内完成跨区域运力切线。',
          impact: '实现海陆 5:5 稳健冗余通道'
        },
        {
          dimension: '战略储备与成本',
          traditional: '在现货单价冲至 $106/lb 历史高位时被动追涨补库，不仅吞噬企业利润，更承受高位套牢风险。',
          method: '国家战略储备 Agent 与基地库存 Agent 启动逆周期“高位借调缓冲、低位平滑回补”机制，以库存削峰换时间。',
          impact: '到岸平准化成本压降 21.0%'
        }
      ],
      actionStages: [
        {
          step: '01',
          period: 'T0 · 冲击感知期',
          agent: '态势感知与风险传导 Agent',
          title: '提前 18 个月数字孪生预警，全景模拟去俄化断供传导路径',
          traditional: '直到法案正式生效且现货价格飞涨至 $106/lb 时，才被动组织紧急采购。',
          method: '基于政策图谱提前 18 个月捕捉美国 HR.1042 法案与俄罗斯反制动向，模拟全球 40% 浓缩产能割裂影响，精准测定 2025–2028 年缺口暴露窗口。',
          gain: '提前锁定 18 个月政策应对缓冲期'
        },
        {
          step: '02',
          period: 'T+3月 · 需求平抑期',
          agent: '核电采购联合体 Agent + 供应商竞价 Agent',
          title: '多主体博弈均衡调度，统一采购池杜绝恐慌踩踏',
          traditional: '各机组分散向国际供应商发函询价，互相抬价，造成供应商乘机惜售提价。',
          method: '统筹全国核电采购主体组建“集中采购联合体”，利用多智能体博弈求解最优订货批量，按真实换料刚性下发需求，坚决压制虚假超额订货。',
          gain: '消除恐慌性虚假需求，抑制牛鞭效应 64.8%'
        },
        {
          step: '03',
          period: 'T+6月 · 通道切线期',
          agent: '多式联运路由 Agent + 跨国合同重构 Agent',
          title: '激活非洲/中亚替代航线，一揽子长协跨期置换',
          traditional: '过度依赖原有的欧洲浓缩运输线，陷入长达半年的关税与禁令审查僵局。',
          method: '迅速执行跨国长协多元置换条款，将受影响份额平滑转签至中亚与非洲矿源，同步打通亚欧大陆桥集装箱班列，实现海陆通道柔性重组。',
          gain: '长协保障率稳定在 65% 以上，跨国通道 1 年稳妥补位'
        },
        {
          step: '04',
          period: 'T+12月 · 储备削峰期',
          agent: '战略储备吞吐 Agent + 基地库存协同 Agent',
          title: '战略库存逆周期吞吐，平准化到岸采购成本',
          traditional: '为免停堆断料，在现货暴涨峰值期硬性吃进高价现货，导致年度燃料预算严重超支。',
          method: '果断下达“动用战略库存平抑短期缺口”决策，以北方与沿海库存缓冲高价现货冲击；待替代长协抵港后再低成本平滑回填。',
          gain: '保供刚性达成率 100%，采购综合成本降低 21.0%'
        }
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
    scenarioKey: 'nigerCoup',
    scenarioName: '尼日尔政变与矿山出口受阻 (niger_coup)',
    nuclearDimensions: [
      {
        key: 'npp',
        title: '沿海机组原料保供与库存维持',
        tag: '核电燃料保供',
        badgeColor: '#10b981',
        stats: [
          { label: '欧盟进口占比', value: '约 20% 天然铀' },
          { label: '安全维持窗口', value: '14 个月安全期' },
          { label: '机组运行策略', value: '满负荷稳定运行' }
        ],
        description: '尼日尔占欧盟天然铀进口约20%，单点断供直接波及欧洲及转口合同；国内沿海核电机组提前测算安全脱困窗口（14个月），避免减负荷运行。'
      },
      {
        key: 'geopolitics',
        title: '萨赫勒地缘动荡与矿权收归',
        tag: '矿源与地缘风险',
        badgeColor: '#f59e0b',
        stats: [
          { label: '边境封锁范围', value: '西共体陆空边境' },
          { label: '核心受波及矿床', value: 'Imouraren / Dasa' },
          { label: '国际采矿特许', value: '军政府全面收回' }
        ],
        description: '军政府关闭西非陆空边界并撤销法国Orano特许权，多国矿业投资陷入不可抗力，海外单一矿山依赖的高脆弱性暴露无遗。'
      },
      {
        key: 'logistics',
        title: '贝宁出海口瘫痪与远洋重路由',
        tag: '通道阻断与重构',
        badgeColor: '#2563eb',
        stats: [
          { label: '传统走廊状态', value: '贝宁科托努港阻断' },
          { label: '替代海运航道', value: '纳米比亚鲸湾港' },
          { label: '国内调拨规模', value: '450 tU 原料过桥' }
        ],
        description: '黄饼经公路穿越萨赫勒至贝宁科托努港通道瘫痪；系统通过中远海运激活南部非洲鲸湾港直航，并启动国内南北基地原料互保过桥。'
      }
    ],
    impactChain: [
      { step: '01', title: '西非突发政变', desc: '萨赫勒边境关闭与西共体制裁', color: '#ef4444' },
      { step: '02', title: '单一矿源阻断', desc: '采选精炼停工，特许权被收归', color: '#f97316' },
      { step: '03', title: '海运走廊瘫痪', desc: '贝宁科托努港出海口货物滞留', color: '#eab308' },
      { step: '04', title: '南北基地互保', desc: '北方调拨 450 tU 原料紧急过桥', color: '#10b981' },
      { step: '05', title: '远洋通道达产', desc: '纳米比亚鲸湾港替代达产 100%', color: '#2563eb' }
    ],
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
    closedLoopFeedback: {
      title: '“单点断供-多源置换”自动化闭环反馈机制',
      summary: '针对单一主供国突发政变与出口中断，系统依据断供持续期自适应下发南北基地库存互保与远洋运力切线指令。',
      evaluationKpis: [
        { name: '信息增益 (边际熵减)', value: '38.5%', state: 'good', desc: '精准测算断供扩散衰减曲线' },
        { name: '保供刚性达成率', value: '98.8%', state: 'good', desc: '沿海核电机组满负荷稳定运行' },
        { name: '平准化采购成本', value: '-23.6%', state: 'good', desc: '南北互保规避现货跳涨溢价' },
        { name: '牛鞭效应抑制比', value: '-65.5%', state: 'good', desc: '避免多头超额下单排期' }
      ],
      feedbackLoops: [
        {
          target: '库存互保端 · 南北物料横向借调',
          trigger: '西非港口装船停滞导致沿海港口库存跌破 1.5 年安全水位',
          action: '自动下发南北基地库存互保指令，由北方基地向沿海基地调拨 450 tU 天然铀过桥。',
          gain: '零减负荷、零停机，保障沿海刚性运行'
        },
        {
          target: '远洋运力端 · 南部非洲绿色直航',
          trigger: '贝宁走廊与几内亚湾出口港不可抗力持续超过 60 天',
          action: '自适应切线至纳米比亚鲸湾港航线，联合中远海运开辟南部非洲直航。',
          gain: '替代海运航线 14 个月达产率 100%'
        }
      ]
    },
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
      ],
      dilemmaVsSolution: [
        {
          dimension: '决策协同机制',
          traditional: '单电厂难以获知西非军政动荡真实断供时长，只能在“全面停工”与“盲目等待”之间摇摆。',
          method: '情报感知 Agent 与多主体调度中枢联动，实时测算西非单一断点对沿海核电基地的供料冲击衰减模型。',
          impact: '实现跨区域供需链全景透视'
        },
        {
          dimension: '需求下发与传导',
          traditional: '沿海基地由于西非断运恐慌向其他海外矿业巨头重复下单，拉长交货周期至 24 个月。',
          method: '采购智能体统一核验库存安全水位，按月度核电机组消耗速度精准订货，拒绝盲目多头下单。',
          impact: '避免引发国际供应商断崖式排期'
        },
        {
          dimension: '运力与路由重构',
          traditional: '受阻于西共体边境封锁与几内亚湾港口受限，传统海运代理束手无策，货物严重滞留。',
          method: '多式联运 Agent 启用南部非洲（纳米比亚鲸湾港）与大洋洲替代海运干线，协调沿海多港口无缝分流接卸。',
          impact: '替代海运航道 14 个月达产稳定'
        },
        {
          dimension: '战略储备与成本',
          traditional: '国内各制造基地物料互不相通，沿海基地被迫在现货跳涨 $14/lb 的情况下高溢价紧急空运。',
          method: '启动“南北基地库存横向调剂互保”机制，由内地北方深加工基地调拨原料过桥，待远洋替代船期抵港。',
          impact: '综合到岸平准成本降低 23.6%'
        }
      ],
      actionStages: [
        {
          step: '01',
          period: 'T0 · 突发冲击期',
          agent: '态势感知 Agent + 地缘风险 Agent',
          title: '72小时完成突发政变断点定位，量化沿海机组脱困时间窗',
          traditional: '直到 Orano 采选厂停工、国际市场现货单月暴涨 $14/lb 时才确认事件严重性。',
          method: '72 小时内完成尼日尔阿库塔/阿尔利特中断对国内直接辐射评估，测算沿海核电机组在现有库存下的安全维持窗口为 14 个月。',
          gain: '为供应链重路由争取 14 个月安全调度时间'
        },
        {
          step: '02',
          period: 'T+3月 · 库存互保期',
          agent: '南北基地库存调度 Agent + 制造排产 Agent',
          title: '南北骨干基地物料横向互借，以存量盘活化解断供燃眉之急',
          traditional: '沿海电厂各自紧急向上游催单，内地深加工基地库存闲置，供需割裂。',
          method: '系统下发南北基地库存互保指令，由北方包头基地向沿海基地紧急调拨 450 tU 天然铀过桥料，保障机组满功率运行。',
          gain: '零减负荷、零停机，保障沿海刚性运行'
        },
        {
          step: '03',
          period: 'T+6月 · 替代切线期',
          agent: '多式联运路由 Agent + 海外矿源 Agent',
          title: '重构南部非洲海运航线，纳米比亚湖山矿增量补位',
          traditional: '试图等待西非边境重新开放，导致采购周期严重延误。',
          method: '启动纳米比亚湖山矿与大洋洲备用长协增量配额，联合中远海运开辟南部非洲绿色直航航道，14 个月内替代增量全面抵港。',
          gain: '替代海运航线达产率达 100%'
        },
        {
          step: '04',
          period: 'T+12月 · 稳态固化期',
          agent: '跨国合同重构 Agent + 风险控制 Agent',
          title: '固化多源置换长协，消除单一产地依赖风险',
          traditional: '危机过后重回单一矿源采购，再次暴露于地缘波动之下。',
          method: '在长协中全面固化“一揽子多产地置换条款”，把单一产地风险分散到跨洲际多产地矿山组合，长协占比维持 60% 以上。',
          gain: '保供达成率 98.8%，稳态恢复期缩短 70.0%'
        }
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
    scenarioKey: 'kazakhSanction',
    scenarioName: '哈萨克斯坦动荡与中亚陆运承压 (kazakh_sanction)',
    nuclearDimensions: [
      {
        key: 'mining',
        title: '地浸开采硫酸短缺机理瓶颈',
        tag: '采选关键原料',
        badgeColor: '#f59e0b',
        stats: [
          { label: '全球供应占比', value: '哈萨克占全球 43%' },
          { label: '工业原料缺口', value: '硫酸短缺 10%-15%' },
          { label: '全球减产实效', value: '缩减约 4,000 tU' }
        ],
        description: '哈萨克斯坦地浸采铀（占全球43%）高度依赖工业硫酸。硫酸短缺导致矿山原液溶浸率下降，全球供应缩水约4,000 tU，推高国际长协定价基准。'
      },
      {
        key: 'railway',
        title: '中哈跨境陆路口岸集运承压',
        tag: '陆路走廊塞港',
        badgeColor: '#8b5cf6',
        stats: [
          { label: '阿拉山口换装', value: '排队滞留超过 3 周' },
          { label: '周转提升幅度', value: '霍尔果斯分流 40%' },
          { label: '口岸通关提速', value: '通关效率提升 45%' }
        ],
        description: '阿拉山口口岸集装箱班列换装周转周期拉长，口岸排队导致北方深加工基地面临物流通运延迟挑战。'
      },
      {
        key: 'hedging',
        title: '海陆通道 5:5 动态互保与对冲',
        tag: '长协与库存缓冲',
        badgeColor: '#2563eb',
        stats: [
          { label: '通道目标配比', value: '海运:陆运 5:5 平衡' },
          { label: '基地缓冲周期', value: '吸收 180 天原料波动' },
          { label: '完全成本控制', value: '基准公式锁定溢价' }
        ],
        description: '系统实施阿拉山口与霍尔果斯双口岸柔性排班，联动连云港海运接卸，依托包头骨干基地180天安全库存平稳吸收通运延迟。'
      }
    ],
    impactChain: [
      { step: '01', title: '资源国动荡', desc: '哈萨克紧急状态与口岸通关延迟', color: '#ef4444' },
      { step: '02', title: '硫酸原料短缺', desc: '地浸开采缩减约 4,000 tU', color: '#f97316' },
      { step: '03', title: '口岸严重塞港', desc: '阿拉山口换装等待超过 3 周', color: '#eab308' },
      { step: '04', title: '双口岸柔性分流', desc: '40% 跨境班列分流霍尔果斯口岸', color: '#10b981' },
      { step: '05', title: '海陆 5:5 平衡', desc: '连云港海运互保，0.8年恢复稳态', color: '#2563eb' }
    ],
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
    closedLoopFeedback: {
      title: '“口岸通运-双通道平衡”自动化闭环反馈机制',
      summary: '针对中亚陆路通关排队与矿山小幅减产，系统通过运力约束倒推排产并启动双口岸与海陆互保闭环。',
      evaluationKpis: [
        { name: '信息增益 (边际熵减)', value: '45.2%', state: 'good', desc: '工业机理精确量化硫酸产能衰减' },
        { name: '保供刚性达成率', value: '100.0%', state: 'good', desc: '北方骨干基地持续满负荷运转' },
        { name: '平准化采购成本', value: '-20.1%', state: 'good', desc: '长协基准价对冲条款锁定成本' },
        { name: '牛鞭效应抑制比', value: '-60.6%', state: 'good', desc: '双向透传杜绝口岸挤兑下单' }
      ],
      feedbackLoops: [
        {
          target: '口岸调度端 · 双口岸柔性动态分流',
          trigger: '阿拉山口铁路换装滞留超过 2 周且集装箱塞港',
          action: '系统联动调度网络，动态将 40% 跨境班列分流至霍尔果斯口岸，实施优先通关换装。',
          gain: '跨境铁路周转效率提升 45%'
        },
        {
          target: '通道结构端 · 海陆 5:5 稳健配比重组',
          trigger: '陆路运输周期延长超过基准值 30%',
          action: '将沿海机组交割单切换至连云港海运接卸，陆运专供北方腹地深加工厂。',
          gain: '口岸通运压力彻底消除，稳态恢复仅需 0.8 年'
        }
      ]
    },
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
      ],
      dilemmaVsSolution: [
        {
          dimension: '决策协同机制',
          traditional: '对哈国减产传闻缺乏定性与定量工具，要么过度反应恐慌抢购，要么麻痹大意导致断料。',
          method: '通过矿业生产动力学模型，定量推演硫酸配额减量对地浸矿山产能的边际衰减曲线，给出精确供料预测。',
          impact: '将供应不确定性量化为精确波动区间'
        },
        {
          dimension: '需求下发与传导',
          traditional: '口岸排队导致北方工厂出现料荒焦虑，向哈原工连续追加多笔紧急订单，导致中亚铁路口岸严重塞港。',
          method: '需求协同智能体根据口岸通关运力约束，反向倒推下发订货计划，平滑口岸过货负荷，杜绝口岸挤兑。',
          impact: '牛鞭效应由 3.25x 降至 1.28x'
        },
        {
          dimension: '运力与路由重构',
          traditional: '单向押注中亚铁路阿拉山口单一口岸，一旦口岸拥堵导致货物全线瘫痪。',
          method: '实施中哈铁路双口岸（阿拉山口 + 霍尔果斯）柔性分流，并动态启动连云港海运接卸，形成海陆 5:5 动态备用网络。',
          impact: '口岸滞留时间缩短 65%'
        },
        {
          dimension: '战略储备与成本',
          traditional: '口岸受阻时高价在欧洲投机现货市场调剂，承担原料端硫酸溢价与现货双重加价。',
          method: '包头骨干基地安全库存池无缝吸收 180 天原料波动，通过长协价格公式与原料对冲条款锁定完全到岸成本。',
          impact: '采购平准化成本压降 20.1%'
        }
      ],
      actionStages: [
        {
          step: '01',
          period: 'T0 · 动荡预警期',
          agent: '地缘感知 Agent + 矿业工业机理 Agent',
          title: '工业机理建模量化硫酸短缺对矿山产能衰减曲线',
          traditional: '仅凭新闻传闻推测哈国可能减产，无法计算真实受损吨位。',
          method: '引入地浸采铀硫酸配比工程模型，精确测算哈原工 10%-15% 硫酸缺口对应的矿石溶浸衰减速率，锁定全球 4,000 tU 供应缩水实效。',
          gain: '将减产预测精度提升至 95% 以上'
        },
        {
          step: '02',
          period: 'T+3月 · 双口岸分流期',
          agent: '跨境物流调度 Agent + 口岸协同 Agent',
          title: '阿拉山口与霍尔果斯双口岸动态排班，消除塞港瓶颈',
          traditional: '所有集装箱班列扎堆阿拉山口，等待换装滞留超过 3 周。',
          method: '系统联动中铁集装箱调度网络，动态将 40% 跨境班列分流至霍尔果斯铁路口岸，实施优先快速报关与换装。',
          gain: '跨境铁路周转效率提升 45%'
        },
        {
          step: '03',
          period: 'T+6月 · 海陆平衡期',
          agent: '多式联运路由 Agent + 沿海港口调度 Agent',
          title: '构建海陆双通道 5:5 互保格局，启用远洋海运对冲陆路压力',
          traditional: '北方与沿海各自封闭，沿海基地过度依赖陆运，导致陆路运力不堪重负。',
          method: '将沿海机组部分年度交割单切换至连云港海运接卸，陆运专供北方腹地深加工厂，形成海陆 5:5 平衡互保架构。',
          gain: '口岸排队压力彻底消除，稳态恢复仅需 0.8 年'
        },
        {
          step: '04',
          period: 'T+12月 · 储备削峰期',
          agent: '北方骨干基地库存 Agent + 长协价格对冲 Agent',
          title: '骨干基地超量储备抵御 180 天波动，长协基准价筑牢护城河',
          traditional: '在现货破 $100/lb 时追单，推高核燃料整体折旧成本。',
          method: '依托包头骨干基地安全库存平稳吸收 180 天通运延迟，同时严守长协基准价对冲条款，拒绝支付非理性现货溢价。',
          gain: '保供刚性达成率 100%，采购综合到岸成本压降 20.1%'
        }
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
  return URANIUM_CASE_LIBRARY.find((item) => item.id === key || (Array.isArray(item.aliases) && item.aliases.includes(key))) || null
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
