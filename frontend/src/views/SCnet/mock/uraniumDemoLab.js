function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function round(value, digits = 2) {
  const base = 10 ** digits
  return Math.round(Number(value) * base) / base
}

function average(values = []) {
  const nums = values.map((item) => Number(item)).filter((item) => Number.isFinite(item))
  if (!nums.length) return null
  return nums.reduce((sum, item) => sum + item, 0) / nums.length
}

function extractLegacyIndex(value = '') {
  const matched = String(value || '').match(/_(\d+)$/)
  return matched ? matched[1] : ''
}

function parseDateParts(value = '') {
  const matched = String(value || '').trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/
  )
  if (!matched) {
    return {
      date: '20260710',
      time: '000000'
    }
  }
  return {
    date: `${matched[1]}${matched[2]}${matched[3]}`,
    time: `${matched[4] || '00'}${matched[5] || '00'}${matched[6] || '00'}`
  }
}

function buildExperimentId(presetName = 'balanced', createdAt = '', suffix = '') {
  const variantKey = normalizeVariantKey(presetName).replace(/_/g, '-')
  const { date, time } = parseDateParts(createdAt)
  return `uranium-${variantKey}-${date}-${time}${suffix ? `-${suffix}` : ''}`
}

function buildTaskId(status = 'completed', createdAt = '', suffix = '') {
  const { date, time } = parseDateParts(createdAt)
  const statusPrefixMap = {
    running: 'running',
    pending: 'queued',
    completed: 'closed',
    cancelled: 'cancelled',
    failed: 'failed'
  }
  const prefix = statusPrefixMap[String(status || '').trim()] || 'task'
  return `task-${prefix}-${date}-${time}${suffix ? `-${suffix}` : ''}`
}

function normalizeDisplayText(value = '') {
  return String(value || '')
    .replace(/演示数据/g, '实验数据')
    .replace(/演示任务/g, '实验任务')
    .replace(/演示实验/g, '实验')
    .replace(/待执行演示/g, '待执行窗口')
}

const SUPPLIERS = Object.freeze([
  {
    id: 'sup_kaz',
    name: 'Kazatomprom / Inkai',
    company: 'Kazatomprom',
    asset: 'Inkai / Chu-Sarysu',
    country: '哈萨克斯坦',
    location: 'Kazakhstan_inland_land_route',
    route_type: 'land_route',
    preferred_china_port_tag: 'LAND_NW',
    mining_method: 'ISL地浸',
    reference_route_name: '哈→中',
    reference_path: 'Chu-Sarysu→新疆',
    reference_volume_ktu: 15,
    route_note: '中哈合资矿山，经西北口岸入境',
    base_risk: 0.24
  },
  {
    id: 'sup_can',
    name: 'Cameco / Cigar Lake',
    company: 'Cameco',
    asset: 'Cigar Lake / McArthur River',
    country: '加拿大',
    location: 'Canada_sea_route',
    route_type: 'sea_route',
    preferred_china_port_tag: 'PORT_NORTH',
    mining_method: '地下开采',
    reference_route_name: '加→欧洲 / 海上黄饼',
    reference_path: 'Athabasca→蒙特利尔→远洋海运',
    reference_volume_ktu: 5.8,
    route_note: '高品位矿，经北大西洋和苏伊士远洋运输',
    base_risk: 0.14
  },
  {
    id: 'sup_nam',
    name: 'CNNC(Swakop) / Husab',
    company: 'CNNC(Swakop Uranium)',
    asset: 'Husab',
    country: '纳米比亚',
    location: 'Namibia_sea_route',
    route_type: 'sea_route',
    preferred_china_port_tag: 'PORT_SOUTH',
    mining_method: '露天开采',
    reference_route_name: '纳米比亚→中',
    reference_path: 'Walvis Bay / Swakopmund→中国港',
    reference_volume_ktu: 4.4,
    route_note: '中国权益矿，经好望角-印度洋海运',
    base_risk: 0.17
  },
  {
    id: 'sup_aus',
    name: 'BHP / Olympic Dam',
    company: 'BHP',
    asset: 'Olympic Dam',
    country: '澳大利亚',
    location: 'Australia_sea_route',
    route_type: 'sea_route',
    preferred_china_port_tag: 'PORT_EAST',
    mining_method: '副产品(铜)',
    reference_route_name: '澳洲→全球',
    reference_path: 'Adelaide / Darwin→亚欧海运',
    reference_volume_ktu: 4.2,
    route_note: '副产品铀，经澳洲出口港装船',
    base_risk: 0.15
  },
  {
    id: 'sup_uzb',
    name: 'NMMC / Navoi',
    company: 'NMMC',
    asset: 'Navoi ISL',
    country: '乌兹别克斯坦',
    location: 'Uzbekistan_inland_land_route',
    route_type: 'land_route',
    preferred_china_port_tag: 'LAND_NW',
    mining_method: 'ISL地浸',
    reference_route_name: '乌兹别克→俄/中',
    reference_path: 'Navoi→中亚铁路→西北口岸',
    reference_volume_ktu: 3.6,
    route_note: '中亚内陆陆运，受边境与铁路能力影响',
    base_risk: 0.19
  },
  {
    id: 'sup_niger',
    name: 'Global Atomic / Dasa',
    company: 'Global Atomic',
    asset: 'Dasa / 贝宁走廊',
    country: '尼日尔',
    location: 'Niger_inland_to_sea_route',
    route_type: 'inland_plus_sea',
    preferred_china_port_tag: 'PORT_SOUTH',
    mining_method: '地下开采',
    reference_route_name: '尼日尔→法国 / 贝宁走廊',
    reference_path: 'Arlit / Dasa→科托努→远洋海运',
    reference_volume_ktu: 1.8,
    route_note: '经贝宁走廊出海，受政局和过境安全影响',
    activation_year: 2025,
    base_risk: 0.28
  }
])

const MANUFACTURERS = Object.freeze([
  {
    id: 'mfg_cnnc',
    name: '中核北方燃料组件基地',
    group: 'CNNC',
    facility: '北方燃料组件基地',
    city_cluster: '北京 / 华北',
    location: 'North China',
    port_tag: 'PORT_NORTH',
    port_name: '天津港',
    function_label: '北方燃料组件制造与接卸衔接',
    risk_bias: -0.02
  },
  {
    id: 'mfg_cgn',
    name: '中广核南方燃料基地',
    group: 'CGN',
    facility: '南方燃料基地',
    city_cluster: '深圳 / 华南',
    location: 'South China',
    port_tag: 'PORT_SOUTH',
    port_name: '广州港',
    function_label: '南方燃料制造与沿海接卸',
    risk_bias: 0.01
  },
  {
    id: 'mfg_snptc',
    name: '国核东部燃料制造中心',
    group: '国核',
    facility: '东部燃料制造中心',
    city_cluster: '上海 / 华东',
    location: 'East China',
    port_tag: 'PORT_EAST',
    port_name: '上海港',
    function_label: '东部制造与调剂吸收',
    risk_bias: 0
  }
])

const SUPPLIER_DESTINATION_SPLITS = Object.freeze({
  sup_kaz: [
    { manufacturer_id: 'mfg_cnnc', share: 0.5 },
    { manufacturer_id: 'mfg_cgn', share: 0.24 },
    { manufacturer_id: 'mfg_snptc', share: 0.26 }
  ],
  sup_can: [
    { manufacturer_id: 'mfg_cnnc', share: 0.4 },
    { manufacturer_id: 'mfg_snptc', share: 0.6 }
  ],
  sup_nam: [
    { manufacturer_id: 'mfg_cgn', share: 0.57 },
    { manufacturer_id: 'mfg_cnnc', share: 0.43 }
  ],
  sup_aus: [
    { manufacturer_id: 'mfg_snptc', share: 0.58 },
    { manufacturer_id: 'mfg_cgn', share: 0.42 }
  ],
  sup_uzb: [
    { manufacturer_id: 'mfg_cnnc', share: 0.58 },
    { manufacturer_id: 'mfg_snptc', share: 0.42 }
  ],
  sup_niger: [
    { manufacturer_id: 'mfg_cgn', share: 0.55 },
    { manufacturer_id: 'mfg_snptc', share: 0.45 }
  ]
})

const YEARLY_SUPPLIER_ROUTE_MULTIPLIERS = Object.freeze({
  2024: {
    sup_kaz: 0.92,
    sup_can: 1.08,
    sup_nam: 1.06,
    sup_aus: 1,
    sup_uzb: 1,
    sup_niger: 0
  },
  2025: {
    sup_kaz: 0.94,
    sup_can: 1.06,
    sup_nam: 1.05,
    sup_aus: 1.02,
    sup_uzb: 1.03,
    sup_niger: 0.65
  },
  2026: {
    sup_kaz: 0.97,
    sup_can: 1.08,
    sup_nam: 1.18,
    sup_aus: 1.03,
    sup_uzb: 1.04,
    sup_niger: 1
  },
  2027: {
    sup_kaz: 0.95,
    sup_can: 1.22,
    sup_nam: 1.14,
    sup_aus: 1.05,
    sup_uzb: 1.05,
    sup_niger: 1.04
  },
  2028: {
    sup_kaz: 0.93,
    sup_can: 1.18,
    sup_nam: 1.1,
    sup_aus: 1.08,
    sup_uzb: 1.06,
    sup_niger: 1.06
  }
})

const BASE_YEAR_ROWS = Object.freeze([
  {
    year: 2024,
    market_price_usd_lb: 85,
    total_supply_tU: 11280,
    total_procured_tU: 10860,
    total_demand_tU: 11120,
    unmet_demand_tU: 260,
    average_cost_usd_kgU: 486,
    average_risk_exposure: 0.228,
    inventory_coverage_years: 0.93,
    supply_concentration_hhi: 0.248,
    dominant_supplier_share: 0.34,
    active_events: ['铀价$106/lb(17年高)', '哈酸短缺', '美国禁俄铀法案']
  },
  {
    year: 2025,
    market_price_usd_lb: 88.5,
    total_supply_tU: 11720,
    total_procured_tU: 11480,
    total_demand_tU: 11730,
    unmet_demand_tU: 250,
    average_cost_usd_kgU: 491,
    average_risk_exposure: 0.222,
    inventory_coverage_years: 0.98,
    supply_concentration_hhi: 0.243,
    dominant_supplier_share: 0.34,
    active_events: ['美国禁俄铀豁免到期;需求增加', 'Dasa(尼日尔)投产~1850tU/年']
  },
  {
    year: 2026,
    market_price_usd_lb: 84.2,
    total_supply_tU: 12260,
    total_procured_tU: 12040,
    total_demand_tU: 12190,
    unmet_demand_tU: 150,
    average_cost_usd_kgU: 488,
    average_risk_exposure: 0.214,
    inventory_coverage_years: 1.02,
    supply_concentration_hhi: 0.239,
    dominant_supplier_share: 0.33,
    active_events: ['Tumas(纳米比亚)ISL投产~1800tU/年']
  },
  {
    year: 2027,
    market_price_usd_lb: 86.1,
    total_supply_tU: 12710,
    total_procured_tU: 12520,
    total_demand_tU: 12780,
    unmet_demand_tU: 260,
    average_cost_usd_kgU: 492,
    average_risk_exposure: 0.221,
    inventory_coverage_years: 1.04,
    supply_concentration_hhi: 0.236,
    dominant_supplier_share: 0.33,
    active_events: ['高需求情景下生产短缺开始', 'Arrow/WheelerRiver/TripleR投产(加拿大)']
  },
  {
    year: 2028,
    market_price_usd_lb: 89.4,
    total_supply_tU: 13140,
    total_procured_tU: 12950,
    total_demand_tU: 13360,
    unmet_demand_tU: 410,
    average_cost_usd_kgU: 497,
    average_risk_exposure: 0.231,
    inventory_coverage_years: 1.01,
    supply_concentration_hhi: 0.233,
    dominant_supplier_share: 0.32,
    active_events: ['美国禁俄铀完全生效']
  }
])

const VARIANT_PROFILES = Object.freeze({
  balanced: {
    preset_name: 'balanced',
    title: '平衡方案',
    event_suffix: '',
    cost_shift: 0,
    risk_shift: 0,
    inventory_shift: 0,
    unmet_multiplier: 1,
    dominant_shift: 0,
    route_share_adjust: {
      sup_kaz: 0,
      sup_can: 0,
      sup_nam: 0,
      sup_aus: 0,
      sup_uzb: 0,
      sup_niger: 0
    },
    contract_mix: [
      { contract_type: '长协', share: 0.58 },
      { contract_type: '现货', share: 0.27 },
      { contract_type: '灵活调剂', share: 0.15 }
    ],
    recommendations: [
      '维持哈萨克陆路与加拿大、纳米比亚海运并行的配置，避免单一来源放大交付波动。',
      '在哈萨克硫酸短缺与美国禁俄铀法案生效窗口下，优先用长协稳定北方和东部补库。',
      '2026-2028 年逐步抬升纳米比亚与加拿大份额，降低对单一陆路的年度暴露。'
    ],
    alerts: [
      '哈萨克和乌兹别克陆路仍然是北方制造端的高敏感通道，边境或化工品扰动会迅速抬升风险。',
      '2025 年去俄化采购竞争升温后，现货占比过高会明显放大采购成本波动。'
    ],
    policy_profiles: [
      { manufacturer_id: 'mfg_cnnc', label: '北方稳态补库', target_inventory_years: 1.1, contract_preference: 0.62 },
      { manufacturer_id: 'mfg_cgn', label: '南方弹性长协', target_inventory_years: 0.95, contract_preference: 0.57 },
      { manufacturer_id: 'mfg_snptc', label: '东部平衡采购', target_inventory_years: 1, contract_preference: 0.55 }
    ],
    feedback_signals: [
      ['补齐北方库存', '抬升长协占比'],
      ['维持三港口分流', '压缩高价现货'],
      ['优化加拿大与澳洲海运配比', '稳定年度波动']
    ]
  },
  security_first: {
    preset_name: 'security_first',
    title: '保供优先',
    event_suffix: '',
    cost_shift: 13,
    risk_shift: -0.028,
    inventory_shift: 0.24,
    unmet_multiplier: 0.58,
    dominant_shift: -0.03,
    route_share_adjust: {
      sup_kaz: -0.04,
      sup_can: 0.02,
      sup_nam: 0.02,
      sup_aus: 0,
      sup_uzb: 0.01,
      sup_niger: 0.02
    },
    contract_mix: [
      { contract_type: '长协', share: 0.7 },
      { contract_type: '现货', share: 0.18 },
      { contract_type: '灵活调剂', share: 0.12 }
    ],
    recommendations: [
      '优先补足南北两个关键制造节点的安全库存，目标覆盖年数保持在 1.2 年以上。',
      '把加拿大与纳米比亚长协配比前移，用海运替代部分受哈酸短缺影响的陆路份额。',
      '在美国禁俄铀法案和 2025-2026 新产能爬坡期间，提前锁定接卸窗口和船期。'
    ],
    alerts: [
      '保供优先会抬高年度采购成本，若不约束现货窗口，后续预算压力会快速累积。',
      '南方制造方对纳米比亚海运依赖上升，需同步准备东部口岸作为替代接卸窗口。'
    ],
    policy_profiles: [
      { manufacturer_id: 'mfg_cnnc', label: '北方安全库存优先', target_inventory_years: 1.28, contract_preference: 0.74 },
      { manufacturer_id: 'mfg_cgn', label: '南方长协保障', target_inventory_years: 1.18, contract_preference: 0.68 },
      { manufacturer_id: 'mfg_snptc', label: '东部双通道保供', target_inventory_years: 1.16, contract_preference: 0.65 }
    ],
    feedback_signals: [
      ['提高安全库存', '扩充长协份额'],
      ['分散口岸接卸', '缩小缺口'],
      ['稳定保供策略', '削弱事件冲击']
    ]
  },
  cost_first: {
    preset_name: 'cost_first',
    title: '成本优先',
    event_suffix: '',
    cost_shift: -17,
    risk_shift: 0.018,
    inventory_shift: -0.12,
    unmet_multiplier: 1.18,
    dominant_shift: 0.03,
    route_share_adjust: {
      sup_kaz: 0.05,
      sup_can: -0.03,
      sup_nam: -0.01,
      sup_aus: -0.01,
      sup_uzb: 0.01,
      sup_niger: -0.02
    },
    contract_mix: [
      { contract_type: '长协', share: 0.47 },
      { contract_type: '现货', share: 0.37 },
      { contract_type: '灵活调剂', share: 0.16 }
    ],
    recommendations: [
      '以哈萨克和乌兹别克低成本陆路为主时，应保留加拿大或纳米比亚海运替代线防止极端中断。',
      '把现货采购窗口与价格阈值绑定，避免在 2027 后高需求缺口放大阶段透支成本优势。',
      '东部制造方继续承担更多海运转运，减轻北方节点在去俄化窗口下的补库压力。'
    ],
    alerts: [
      '成本优先使供应集中度重新走高，年度事件一旦叠加会直接抬升缺口风险。',
      '库存覆盖回落到 1 年以下后，制造方对现货价格冲击的缓冲明显不足。'
    ],
    policy_profiles: [
      { manufacturer_id: 'mfg_cnnc', label: '北方低成本采购', target_inventory_years: 0.92, contract_preference: 0.46 },
      { manufacturer_id: 'mfg_cgn', label: '南方价格跟随', target_inventory_years: 0.86, contract_preference: 0.49 },
      { manufacturer_id: 'mfg_snptc', label: '东部灵活调剂', target_inventory_years: 0.9, contract_preference: 0.44 }
    ],
    feedback_signals: [
      ['压降现货均价', '牺牲部分安全库存'],
      ['强化低价通道', '提高集中采购'],
      ['成本达标', '风险边际抬升']
    ]
  },
  shock_response: {
    preset_name: 'shock_response',
    title: '冲击响应',
    event_suffix: '',
    cost_shift: 8,
    risk_shift: 0.012,
    inventory_shift: 0.08,
    unmet_multiplier: 0.82,
    dominant_shift: -0.01,
    route_share_adjust: {
      sup_kaz: -0.03,
      sup_can: 0.01,
      sup_nam: 0.01,
      sup_aus: 0,
      sup_uzb: 0.01,
      sup_niger: 0.03
    },
    contract_mix: [
      { contract_type: '长协', share: 0.61 },
      { contract_type: '现货', share: 0.22 },
      { contract_type: '灵活调剂', share: 0.17 }
    ],
    recommendations: [
      '冲击年份优先保留加拿大、纳米比亚海运缓冲带，降低哈萨克陆路单点故障暴露。',
      '让东部制造节点承担更多灵活调剂量，释放北方长协库存的兜底能力。',
      '把哈酸短缺、美国禁俄铀法案和尼日尔新产能进度纳入采购权重联动规则。'
    ],
    alerts: [
      '当前仍有一条高风险陆路未完全替代，若后续冲击持续，北方节点库存将率先被消耗。',
      '南方节点灵活调剂量偏高，需关注接卸与内陆转运节拍是否匹配。'
    ],
    policy_profiles: [
      { manufacturer_id: 'mfg_cnnc', label: '北方冲击兜底', target_inventory_years: 1.12, contract_preference: 0.63 },
      { manufacturer_id: 'mfg_cgn', label: '南方韧性补位', target_inventory_years: 1.02, contract_preference: 0.59 },
      { manufacturer_id: 'mfg_snptc', label: '东部事件缓冲', target_inventory_years: 1.06, contract_preference: 0.58 }
    ],
    feedback_signals: [
      ['事件响应生效', '临时抬高库存'],
      ['降低单通道暴露', '压缩缺口'],
      ['形成韧性采购组合', '准备下一轮收敛']
    ]
  }
})

const VARIANT_LOOKUP = Object.freeze({
  baseline: 'balanced',
  balanced: 'balanced',
  security_first: 'security_first',
  cost_first: 'cost_first',
  shock_response: 'shock_response',
  feedback_optimization: 'balanced',
  historical_replay: 'balanced',
  extreme_shock: 'shock_response'
})

function normalizeVariantKey(value = '') {
  return VARIANT_LOOKUP[String(value || '').trim()] || 'balanced'
}

function buildYearSupplierShares(year, adjustments = {}) {
  const perSupplierOffset = { ...adjustments }
  const yearMultipliers = YEARLY_SUPPLIER_ROUTE_MULTIPLIERS[year] || {}
  const activeSuppliers = SUPPLIERS
    .map((supplier) => {
      const activationYear = Number(supplier.activation_year || 0)
      if (activationYear && year < activationYear) return null
      const baseWeight = Number(supplier.reference_volume_ktu || 0)
      const yearMultiplier = Number(yearMultipliers[supplier.id] ?? 1)
      const variantMultiplier = Math.max(0.35, 1 + Number(perSupplierOffset[supplier.id] || 0))
      const referenceWeight = round(baseWeight * yearMultiplier * variantMultiplier, 3)
      if (referenceWeight <= 0) return null
      return {
        ...supplier,
        reference_weight_ktu: referenceWeight
      }
    })
    .filter(Boolean)

  const totalWeight = activeSuppliers.reduce((sum, item) => sum + Number(item.reference_weight_ktu || 0), 0)
  return activeSuppliers.map((item) => ({
    ...item,
    share: totalWeight > 0 ? Number(item.reference_weight_ktu || 0) / totalWeight : 0
  }))
}

function buildAllocations(totalProcured, supplierShares) {
  const allocations = []

  supplierShares.forEach((supplier) => {
    const splits = SUPPLIER_DESTINATION_SPLITS[supplier.id] || []
    splits.forEach((target) => {
      const manufacturer = MANUFACTURERS.find((row) => row.id === target.manufacturer_id)
      const quantity = round(totalProcured * Number(supplier.share || 0) * Number(target.share || 0), 2)
      if (quantity <= 0) return
      allocations.push({
        supplier_id: supplier.id,
        supplier_name: supplier.name || supplier.id,
        manufacturer_id: target.manufacturer_id,
        manufacturer_name: manufacturer?.name || target.manufacturer_id,
        quantity_tU: quantity
      })
    })
  })

  return allocations.sort((left, right) => Number(right.quantity_tU || 0) - Number(left.quantity_tU || 0))
}

function buildSupplierRows(totalSupply, avgRisk, supplierShares) {
  return supplierShares.map((supplier) => ({
    ...supplier,
    share: round(Number(supplier.share || 0), 4),
    available_supply_tU: round(totalSupply * Number(supplier.share || 0), 2),
    risk_exposure: round(Math.max(0.06, avgRisk + supplier.base_risk - 0.12), 3)
  }))
}

function buildManufacturerRows(allocations, inventoryYears, avgRisk, unmetDemand, dominantShare) {
  const manufacturerTotals = allocations.reduce((acc, item) => {
    acc[item.manufacturer_id] = (acc[item.manufacturer_id] || 0) + Number(item.quantity_tU || 0)
    return acc
  }, {})

  const unmetShares = [0.44, 0.33, 0.23]

  return MANUFACTURERS.map((manufacturer, index) => ({
    ...manufacturer,
    procured_tU: round(manufacturerTotals[manufacturer.id] || 0, 2),
    inventory_years: round(Math.max(0.65, inventoryYears + (index === 0 ? 0.05 : index === 1 ? -0.03 : 0)), 2),
    risk_exposure: round(Math.max(0.05, avgRisk + manufacturer.risk_bias), 3),
    dominant_supplier_share: round(Math.max(0.22, dominantShare + (index === 0 ? 0.02 : index === 1 ? -0.01 : -0.015)), 3),
    unmet_demand_tU: round(unmetDemand * unmetShares[index], 2)
  }))
}

function buildSupplierShares(allocations) {
  const total = allocations.reduce((sum, item) => sum + Number(item.quantity_tU || 0), 0)
  const grouped = allocations.reduce((acc, item) => {
    acc[item.supplier_name] = (acc[item.supplier_name] || 0) + Number(item.quantity_tU || 0)
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([supplier_name, quantity_tU]) => ({
      supplier_name,
      quantity_tU: round(quantity_tU, 2),
      share: total > 0 ? round(quantity_tU / total, 4) : 0
    }))
    .sort((a, b) => b.quantity_tU - a.quantity_tU)
}

function buildSupplierConcentration(supplierShares) {
  return round(
    supplierShares.reduce((sum, item) => sum + (Number(item.share || 0) ** 2), 0),
    3
  )
}

function buildDominantShare(supplierShares) {
  return round(
    Math.max(...supplierShares.map((item) => Number(item.share || 0)), 0),
    3
  )
}

function buildContractMix(totalProcured, variant) {
  return variant.contract_mix.map((item) => ({
    contract_type: item.contract_type,
    quantity_tU: round(totalProcured * item.share, 2),
    share: item.share
  }))
}

function buildTimelineRows(variantKey, draft = {}) {
  const variant = VARIANT_PROFILES[variantKey] || VARIANT_PROFILES.balanced
  const start = Number.isInteger(draft.start_year) ? draft.start_year : 2024
  const end = Number.isInteger(draft.end_year) ? draft.end_year : 2028
  const severity = Number.isFinite(draft.event_severity_multiplier) ? draft.event_severity_multiplier : 1
  const baseRows = Array.from({ length: Math.max(0, Math.min(44, end - start + 1)) }, (_, index) => {
    const year = start + index
    const existing = BASE_YEAR_ROWS.find(row => row.year === year)
    return existing || { ...BASE_YEAR_ROWS[year < 2024 ? 0 : BASE_YEAR_ROWS.length - 1], year, active_events: [] }
  })
  return baseRows.map((row, index) => {
    const activeEvents = row.active_events.map((item) => `${item}${variant.event_suffix}`)
    const supplierShares = buildYearSupplierShares(row.year, variant.route_share_adjust)
    const totalProcured = round(row.total_procured_tU * (1 + variant.inventory_shift * 0.02))
    const totalSupply = round(row.total_supply_tU * (1 + variant.inventory_shift * 0.015))
    const totalDemand = row.total_demand_tU
    const unmetDemand = round(Math.max(0, row.unmet_demand_tU * variant.unmet_multiplier * severity))
    const averageCost = round(row.average_cost_usd_kgU + variant.cost_shift + index * 0.6)
    const averageRisk = round(Math.min(1, Math.max(0.07, (row.average_risk_exposure + variant.risk_shift) * severity)), 3)
    const inventoryYears = round(Math.max(0.7, row.inventory_coverage_years + variant.inventory_shift), 2)
    const dynamicConcentration = buildSupplierConcentration(supplierShares)
    const dynamicDominantShare = buildDominantShare(supplierShares)
    const supplyConcentration = round(Math.max(0.18, dynamicConcentration + variant.dominant_shift * 0.45), 3)
    const dominantShare = round(Math.max(0.2, dynamicDominantShare + variant.dominant_shift), 3)
    const allocations = buildAllocations(totalProcured, supplierShares)
    const suppliers = buildSupplierRows(totalSupply, averageRisk, supplierShares)
    const manufacturers = buildManufacturerRows(allocations, inventoryYears, averageRisk, unmetDemand, dominantShare)

    return {
      year: row.year,
      active_events: activeEvents,
    market_price_usd_lb: round((draft.starting_price_usd_per_lb ?? row.market_price_usd_lb) * (1 + (severity - 1) * 0.1)),
      total_supply_tU: totalSupply,
      total_procured_tU: totalProcured,
      total_demand_tU: totalDemand,
      unmet_demand_tU: unmetDemand,
      average_cost_usd_kgU: averageCost,
      average_risk_exposure: averageRisk,
      inventory_coverage_years: inventoryYears,
      supply_concentration_hhi: supplyConcentration,
      dominant_supplier_share: dominantShare,
      top_supplier_shares: buildSupplierShares(allocations),
      contract_mix: buildContractMix(totalProcured, variant),
      suppliers,
      manufacturers,
      allocations
    }
  })
}

function buildSummary(timeline) {
  const latest = timeline[timeline.length - 1] || {}
  return {
    avg_cost_usd_kgU: round(average(timeline.map((item) => item.average_cost_usd_kgU)) || 0, 2),
    avg_risk_exposure: round(average(timeline.map((item) => item.average_risk_exposure)) || 0, 3),
    final_inventory_coverage_years: latest.inventory_coverage_years ?? null,
    max_unmet_demand_tU: Math.max(...timeline.map((item) => Number(item.unmet_demand_tU || 0))),
    final_supply_concentration_hhi: latest.supply_concentration_hhi ?? null,
    final_total_inventory_tU: round((latest.total_procured_tU || 0) * (latest.inventory_coverage_years || 0) * 0.84, 2),
    final_dominant_supplier_share: latest.dominant_supplier_share ?? null
  }
}

function buildIterationHistory(summary, variantKey, optimizationIterations) {
  const variant = VARIANT_PROFILES[variantKey] || VARIANT_PROFILES.balanced
  const steps = optimizationIterations > 1
    ? Array.from({ length: optimizationIterations + 1 }, (_, iteration) => {
        const remaining = 1 - iteration / optimizationIterations
        return {
          iteration, cost: 14 * remaining, risk: 0.028 * remaining,
          inventory: -0.18 * remaining, unmet: 150 * remaining, hhi: 0.02 * remaining,
          label: iteration === 0 ? '初始方案' : remaining === 0 ? '收敛方案' : `第 ${iteration} 轮调整`,
          signalIndex: iteration === 0 ? 0 : remaining === 0 ? 2 : 1,
        }
      })
    : [
        { iteration: 0, cost: 0, risk: 0, inventory: 0, unmet: 0, hhi: 0, label: '单次仿真', signalIndex: 2 }
      ]

  return steps.map((step, index) => ({
    iteration: step.iteration,
    label: step.label,
    objective_score: round(
      1.26
      - (summary.final_inventory_coverage_years || 0) * 0.18
      + (summary.avg_risk_exposure || 0) * 1.4
      + (summary.avg_cost_usd_kgU || 0) / 900
      + step.cost / 120
      + step.risk * 0.7,
      3
    ),
    feedback_signals: variant.feedback_signals[step.signalIndex] || [],
    profiles: deepClone(variant.policy_profiles),
    result_summary: {
      avg_cost_usd_kgU: round((summary.avg_cost_usd_kgU || 0) + step.cost, 2),
      avg_risk_exposure: round((summary.avg_risk_exposure || 0) + step.risk, 3),
      final_inventory_coverage_years: round((summary.final_inventory_coverage_years || 0) + step.inventory, 2),
      final_supply_concentration_hhi: round((summary.final_supply_concentration_hhi || 0) + step.hhi, 3),
      final_total_inventory_tU: round((summary.final_total_inventory_tU || 0) + step.inventory * 1800, 2),
      max_unmet_demand_tU: round((summary.max_unmet_demand_tU || 0) + step.unmet, 2),
      manufacturer_alerts: index === steps.length - 1
        ? []
        : ['库存缓冲尚未覆盖关键年度冲击', '单港口接卸负荷仍需进一步分摊']
    }
  }))
}

function buildReport(experiment, variantKey) {
  const variant = VARIANT_PROFILES[variantKey] || VARIANT_PROFILES.balanced
  const timeline = experiment.result.timeline || []
  const latest = timeline[timeline.length - 1] || {}

  return {
    generated_at: experiment.completed_at,
    alerts: deepClone(variant.alerts),
    recommendations: deepClone(variant.recommendations),
    yearly_overview: timeline.map((item) => ({
      year: item.year,
      active_events: item.active_events,
      market_price_usd_lb: item.market_price_usd_lb,
      total_procured_tU: item.total_procured_tU,
      unmet_demand_tU: item.unmet_demand_tU,
      average_cost_usd_kgU: item.average_cost_usd_kgU,
      average_risk_exposure: item.average_risk_exposure,
      inventory_coverage_years: item.inventory_coverage_years,
      supply_concentration_hhi: item.supply_concentration_hhi,
      dominant_supplier_share: item.dominant_supplier_share
    })),
    final_supplier_shares: latest.top_supplier_shares || [],
    final_supplier_structure: latest.top_supplier_shares || [],
    final_contract_mix: latest.contract_mix || [],
    final_procurement_structure: latest.manufacturers || [],
    top_final_allocations: [...(latest.allocations || [])]
      .sort((a, b) => Number(b.quantity_tU || 0) - Number(a.quantity_tU || 0))
      .slice(0, 8),
    selected_profiles: deepClone(variant.policy_profiles),
    delta_summary: {
      cost_change_pct: variantKey === 'cost_first' ? -4.6 : variantKey === 'security_first' ? 3.8 : -1.2,
      risk_change_pct: variantKey === 'security_first' ? -12.4 : variantKey === 'cost_first' ? 5.7 : -3.8,
      inventory_change_pct: variantKey === 'security_first' ? 16.8 : variantKey === 'cost_first' ? -8.2 : 5.1
    }
  }
}

function createUraniumDemoExperiment({
  experimentId,
  presetName = 'balanced',
  name,
  description,
  optimizationIterations = 2,
  createdAt = '2026-07-08 09:20:00',
  completedAt = '2026-07-08 11:00:00',
  draft = {}
} = {}) {
  const variantKey = normalizeVariantKey(presetName)
  const variant = VARIANT_PROFILES[variantKey] || VARIANT_PROFILES.balanced
  const timeline = buildTimelineRows(variantKey, draft)
  const summary = buildSummary(timeline)

  const experiment = {
    experiment_id: experimentId,
    preset_name: variant.preset_name,
    template_name: variant.preset_name,
    name: name || `${variant.title} · 铀供给调度`,
    description: description || '围绕长协、现货与库存目标做年度演化评估。',
    created_at: createdAt,
    completed_at: completedAt,
    optimization_iterations: optimizationIterations,
    execution_type: optimizationIterations > 1 ? 'feedback_optimization' : 'simulation',
    plan: {
      name: name || `${variant.title} · 铀供给调度`,
      description: description || '围绕长协、现货与库存目标做年度演化评估。',
      template_used: variant.preset_name,
      preset_name: variant.preset_name,
      start_year: timeline[0]?.year,
      end_year: timeline.at(-1)?.year,
      event_severity_multiplier: draft.event_severity_multiplier ?? 1,
      optimization_iterations: optimizationIterations,
      policy_profiles: deepClone(variant.policy_profiles)
    },
    scenario_context: {
      supplier_count: SUPPLIERS.length,
      manufacturer_count: MANUFACTURERS.length,
      event_count: [...new Set(timeline.flatMap((item) => item.active_events || []))].length
    },
    summary,
    result: {
      timeline,
      history: buildIterationHistory(summary, variantKey, optimizationIterations)
    }
  }

  experiment.report = buildReport(experiment, variantKey)
  return experiment
}

function buildUraniumDemoTask(experiment, {
  taskId,
  sessionId = 'demo-session-uranium',
  userGoal = '',
  status = 'completed',
  createdAt = experiment.created_at,
  startedAt = experiment.created_at,
  completedAt = experiment.completed_at,
  progress = null
} = {}) {
  return {
    task_id: taskId,
    experiment_id: experiment.experiment_id,
    session_id: sessionId,
    user_goal: userGoal || experiment.description || experiment.name,
    status,
    created_at: createdAt,
    started_at: startedAt,
    completed_at: completedAt,
    result_path: `results/uranium_during_${experiment.experiment_id}.json`,
    error_message: '',
    params: {
      scenario: 'uranium',
      preset_name: experiment.preset_name,
      template_name: experiment.template_name,
      optimization_iterations: experiment.plan?.optimization_iterations ?? experiment.optimization_iterations ?? 1,
      start_year: experiment.plan?.start_year ?? 2024,
      end_year: experiment.plan?.end_year ?? 2028,
      experiment_id: experiment.experiment_id
    },
    summary: deepClone(experiment.summary || {}),
    scenario_context: deepClone(experiment.scenario_context || {}),
    mock_progress: progress
  }
}

function buildProgressPayload(currentLabel, nextLabel, currentIteration, total, elapsedTime) {
  return {
    is_running: true,
    status: 'running',
    completed: currentIteration - 1,
    total,
    current_iteration: currentIteration,
    elapsed_time: elapsedTime,
    estimated_remaining: Math.max(0, (total - currentIteration + 1) * 540),
    percentage: round(((currentIteration - 1) / total) * 100, 1),
    current_task: '年度供给分配与风险评估',
    current_parameters: {
      inventory_target_years: currentLabel,
      long_term_contract_weight: 0.64,
      port_diversification_weight: 0.52
    },
    next_parameters: {
      inventory_target_years: nextLabel,
      long_term_contract_weight: 0.68,
      port_diversification_weight: 0.58
    }
  }
}

export function createUraniumDemoSeed() {
  const balancedCreatedAt = '2026-07-08 09:20:00'
  const balanced = createUraniumDemoExperiment({
    experimentId: buildExperimentId('balanced', balancedCreatedAt),
    presetName: 'balanced',
    name: '平衡方案 · 三港口分流校准',
    description: '评估在 2024-2028 年窗口下，长协与现货平衡配置对供应稳定性的影响。',
    optimizationIterations: 2,
    createdAt: balancedCreatedAt,
    completedAt: '2026-07-08 11:02:00'
  })

  const securityCreatedAt = '2026-07-08 13:10:00'
  const security = createUraniumDemoExperiment({
    experimentId: buildExperimentId('security_first', securityCreatedAt),
    presetName: 'security_first',
    name: '保供优先 · 安全库存抬升',
    description: '在冲击场景下优先拉高库存与长协配比，验证关键制造节点的兜底能力。',
    optimizationIterations: 2,
    createdAt: securityCreatedAt,
    completedAt: '2026-07-08 15:48:00'
  })

  const costCreatedAt = '2026-07-09 08:35:00'
  const cost = createUraniumDemoExperiment({
    experimentId: buildExperimentId('cost_first', costCreatedAt),
    presetName: 'cost_first',
    name: '成本优先 · 现货窗口压降',
    description: '压低均价并放大低成本通道使用比例，观察集中度与缺口风险回弹情况。',
    optimizationIterations: 2,
    createdAt: costCreatedAt,
    completedAt: '2026-07-09 10:12:00'
  })

  const runningCreatedAt = '2026-07-10 09:12:00'
  const running = createUraniumDemoExperiment({
    experimentId: buildExperimentId('shock_response', runningCreatedAt),
    presetName: 'shock_response',
    name: '冲击响应 · 年度保供校准',
    description: '针对中亚与海运双重扰动，校准年度保供权重与库存缓冲。',
    optimizationIterations: 3,
    createdAt: runningCreatedAt,
    completedAt: '2026-07-10 11:30:00'
  })

  const pendingCreatedAt = '2026-07-10 10:08:00'
  const pending = createUraniumDemoExperiment({
    experimentId: buildExperimentId('balanced', pendingCreatedAt, 'q1'),
    presetName: 'balanced',
    name: '平衡方案 · 待执行窗口',
    description: '等待队列执行的实验任务，用于展示排队与配置查看界面。',
    optimizationIterations: 2,
    createdAt: pendingCreatedAt,
    completedAt: '2026-07-10 12:10:00'
  })

  const experiments = {
    [balanced.experiment_id]: balanced,
    [security.experiment_id]: security,
    [cost.experiment_id]: cost,
    [running.experiment_id]: running,
    [pending.experiment_id]: pending
  }

  return {
    experiments,
    selectedExperimentId: security.experiment_id,
    launchCount: 0,
    taskRows: [
      buildUraniumDemoTask(running, {
        taskId: buildTaskId('running', runningCreatedAt),
        status: 'running',
        createdAt: runningCreatedAt,
        startedAt: '2026-07-10 09:18:00',
        completedAt: '',
        progress: buildProgressPayload(1.08, 1.16, 2, 4, 980)
      }),
      buildUraniumDemoTask(pending, {
        taskId: buildTaskId('pending', pendingCreatedAt),
        status: 'pending',
        createdAt: pendingCreatedAt,
        startedAt: '',
        completedAt: '',
        progress: null
      }),
      buildUraniumDemoTask(cost, {
        taskId: buildTaskId('completed', costCreatedAt),
        status: 'completed',
        createdAt: costCreatedAt,
        startedAt: '2026-07-09 08:40:00',
        completedAt: '2026-07-09 10:12:00'
      }),
      buildUraniumDemoTask(security, {
        taskId: buildTaskId('completed', securityCreatedAt),
        status: 'completed',
        createdAt: securityCreatedAt,
        startedAt: '2026-07-08 13:18:00',
        completedAt: '2026-07-08 15:48:00'
      }),
      buildUraniumDemoTask(balanced, {
        taskId: buildTaskId('completed', balancedCreatedAt),
        status: 'completed',
        createdAt: balancedCreatedAt,
        startedAt: '2026-07-08 09:28:00',
        completedAt: '2026-07-08 11:02:00'
      })
    ]
  }
}

export function createLaunchedUraniumDemoExperiment({
  index = 1,
  userGoal = '',
  presetName = 'balanced',
  optimizationIterations = 2,
  createdAt = '2026-07-10 13:00:00',
  sessionId = 'demo-session-uranium',
  draft = {}
} = {}) {
  const goalText = String(userGoal || '').trim() || '分析铀供应链在地缘冲击下的保供与成本平衡策略'
  const experimentId = buildExperimentId(presetName, createdAt, index)
  const experiment = createUraniumDemoExperiment({
    experimentId,
    presetName,
    name: `${goalText.slice(0, 14)} · 实验方案 ${index}`,
    description: goalText,
    optimizationIterations,
    createdAt,
    completedAt: createdAt,
    draft
  })

  const task = buildUraniumDemoTask(experiment, {
    taskId: buildTaskId('completed', createdAt, index),
    status: 'completed',
    sessionId,
    userGoal: goalText,
    createdAt,
    startedAt: createdAt,
    completedAt: createdAt
  })

  return { experiment, task }
}

export function normalizeUraniumDemoState(payload = {}) {
  const state = deepClone(payload || {})
  const normalizedExperiments = {}
  const experimentIdMap = {}
  const experimentEntries = Object.entries(state.experiments || {})

  experimentEntries.forEach(([rawKey, rawExperiment], index) => {
    if (!rawExperiment || typeof rawExperiment !== 'object') return
    const suffix = extractLegacyIndex(rawExperiment.experiment_id || rawKey) || String(index + 1)
    const legacyId = String(rawExperiment.experiment_id || rawKey || '')
    const nextId = /mock/i.test(legacyId) || !legacyId
      ? buildExperimentId(rawExperiment.preset_name || rawExperiment.template_name, rawExperiment.created_at, legacyId.includes('launch') ? suffix : '')
      : legacyId

    experimentIdMap[legacyId] = nextId

    const plan = rawExperiment.plan && typeof rawExperiment.plan === 'object'
      ? {
          ...rawExperiment.plan,
          name: normalizeDisplayText(rawExperiment.plan.name || rawExperiment.name || ''),
          description: normalizeDisplayText(rawExperiment.plan.description || rawExperiment.description || '')
        }
      : rawExperiment.plan

    normalizedExperiments[nextId] = {
      ...rawExperiment,
      experiment_id: nextId,
      name: normalizeDisplayText(rawExperiment.name || ''),
      description: normalizeDisplayText(rawExperiment.description || ''),
      plan,
      report: rawExperiment.report && typeof rawExperiment.report === 'object'
        ? {
            ...rawExperiment.report,
            generated_at: rawExperiment.report.generated_at || rawExperiment.completed_at
          }
        : rawExperiment.report
    }
  })

  const normalizedTaskRows = (Array.isArray(state.taskRows) ? state.taskRows : []).map((row, index) => {
    const legacyExperimentId = String(row?.experiment_id || row?.params?.experiment_id || '')
    const nextExperimentId = experimentIdMap[legacyExperimentId] || legacyExperimentId
    const legacyTaskId = String(row?.task_id || '')
    const fallbackSuffix = extractLegacyIndex(legacyTaskId) || String(index + 1)
    const nextTaskId = /mock/i.test(legacyTaskId) || !legacyTaskId
      ? buildTaskId(row?.status, row?.created_at, legacyTaskId.includes('launch') ? fallbackSuffix : '')
      : legacyTaskId

    return {
      ...row,
      task_id: nextTaskId,
      experiment_id: nextExperimentId,
      user_goal: normalizeDisplayText(row?.user_goal || ''),
      result_path: `results/uranium_during_${nextExperimentId}.json`,
      params: {
        ...(row?.params || {}),
        experiment_id: nextExperimentId,
        template_name: row?.params?.template_name || row?.params?.preset_name || 'balanced'
      }
    }
  })

  const normalizedSelectedId = experimentIdMap[String(state.selectedExperimentId || '')] || state.selectedExperimentId || ''

  return {
    launchCount: Number(state.launchCount || 0),
    experiments: normalizedExperiments,
    taskRows: normalizedTaskRows,
    selectedExperimentId: normalizedSelectedId
  }
}

export {
  buildExperimentId,
  buildTaskId,
  deepClone,
  // 建模设定页展示的仿真主体名单，与实验运行数据同源
  SUPPLIERS as URANIUM_SUPPLIER_ACTORS,
  MANUFACTURERS as URANIUM_MANUFACTURER_ACTORS,
  BASE_YEAR_ROWS as URANIUM_BASE_YEAR_ROWS
}
