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
    sourceNote: '历史资料摘自公开报道与行业年报，仅用于对照检验；正式案例需在调研后核实并补充参考文献。'
  },
  {
    id: 'niger-coup-2023',
    status: 'research',
    title: '尼日尔政变与矿山出口受阻',
    period: '2023 – 2025',
    category: '地缘冲突 · 单一来源中断',
    scope: ['核电燃料', '铀矿供应'],
    summary: '2023 年尼日尔政变后，边境关闭与制裁使矿山产品出口受阻，法国及欧洲核电燃料来源受影响。待补充：对应年份的运量、价格与替代来源数据。',
    eventKeywords: ['尼日尔', 'Dasa'],
    timeline: [],
    historicalFacts: [],
    mapping: [],
    validationPoints: [],
    sourceNote: ''
  },
  {
    id: 'kazakhstan-unrest-2022',
    status: 'research',
    title: '哈萨克斯坦动荡与硫酸短缺',
    period: '2022 – 2024',
    category: '资源国动荡 · 陆路通道',
    scope: ['核电燃料', '地浸开采'],
    summary: '2022 年初哈萨克斯坦骚乱引发市场对全球最大铀产国供应的担忧，随后硫酸短缺制约地浸产量。待补充：产量下调幅度与陆路通道扰动数据。',
    eventKeywords: ['哈酸', '哈萨克'],
    timeline: [],
    historicalFacts: [],
    mapping: [],
    validationPoints: [],
    sourceNote: ''
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
