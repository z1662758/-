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
    summary: '俄乌冲突后西方推动核燃料去俄化，美国立法禁止进口俄罗斯浓缩铀并设置豁免过渡期。案例用于检验：政策型供应冲击如何沿贸易、转化与供给节点传导，仿真结果是否复现缺口抬升、来源重组与长协占比上升。',
    eventKeywords: ['禁俄铀', '去俄化'],
    timeline: [
      { date: '2022-02', text: '俄乌冲突升级，西方对俄能源制裁范围扩大，铀与浓缩服务成为讨论焦点。' },
      { date: '2024-01', text: '现货铀价触及约 106 美元/磅，为十七年高位；电力公司加速锁定长协。' },
      { date: '2024-05', text: '美国签署《禁止进口俄罗斯铀法案》，禁令分阶段生效，期间可申请豁免。' },
      { date: '2024-11', text: '俄罗斯宣布临时限制对美浓缩铀出口，作为反制措施。' },
      { date: '2028-01', text: '豁免窗口关闭，禁令完全生效，二次供应结构性收缩。' }
    ],
    historicalFacts: [
      { label: '受影响环节', value: '浓缩服务与二次供应', note: '俄罗斯浓缩产能占全球约四成（公开估算）' },
      { label: '市场反应', value: '现货价格冲高', note: '2024 年初约 106 美元/磅' },
      { label: '采购行为', value: '提前锁定长协', note: '去俄化采购竞争升温，现货占比回落' },
      { label: '供应重组', value: '哈萨克 / 加拿大 / 纳米比亚份额上升', note: '新矿投产对冲来源收缩' }
    ],
    mapping: [
      { system: '事件库 events', item: '美国禁俄铀法案 → 豁免到期 → 完全生效', effect: '按年份注入年度事件，作用于供给来源权重' },
      { system: '供给方 Agent supplier', item: '俄罗斯方向供应区暴露上升，份额向中亚与海运来源重分配', effect: 'supply_concentration_hhi · dominant_supplier_share · top_supplier_shares' },
      { system: '价格模型 price_model', item: 'event_impact 抬升现货价格与采购成本', effect: 'market_price_usd_lb · average_cost_usd_kgU' },
      { system: '制造方 Agent manufacturer', item: '长协偏好与库存目标上调，压缩现货窗口', effect: 'contract_mix · inventory_coverage_years · unmet_demand_tU' }
    ],
    validationPoints: [
      { check: 'peak_in_case_years', title: '缺口峰值落在案例作用年份', detail: '需求缺口的年度峰值应出现在禁令生效或完全生效的年份。' },
      { check: 'hhi_declines', title: '供给集中度逐年回落', detail: '去俄化叠加新矿投产后，供给集中度终值应低于起始值。' },
      { check: 'longterm_share_majority', title: '长协占比过半', detail: '采购结构中长协份额应超过一半，用以压低成本波动。' }
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
