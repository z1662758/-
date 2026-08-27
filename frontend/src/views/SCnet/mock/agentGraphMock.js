/**
 * 仿真工作室「实体图」预存快照
 *
 * 快照骨架对齐当前运行态供应链实体：
 *   - supplier_*                   供应商
 *   - manufacturing_corporation   制造总厂
 *   - factory_*                   工厂
 *   - retailer_*                  销售渠道
 *
 * 每条快照都提供 { agents, relationship_net }，直接喂给 useAgentGraph.buildNodesFromAgents。
 * 同时补齐 configurable_params / availableMethods / selectedMethod，
 * 让快照模式下的只读参数面板更接近实际运行数据。
 */

function cloneDefault(value) {
  return Array.isArray(value) ? [...value] : value
}

function cloneParamDefs(defs = []) {
  return defs.map((item) => ({
    ...item,
    default: cloneDefault(item.default)
  }))
}

function agent(id, name, category, description, extra = {}) {
  return {
    id,
    name,
    category,
    description,
    llmConfig: { model: 'qwen' },
    availableMethods: Array.isArray(extra.availableMethods) ? [...extra.availableMethods] : [],
    selectedMethod: extra.selectedMethod || '',
    configurable_params: cloneParamDefs(extra.configurable_params || []),
    ...extra
  }
}

function edge(source, target, relationship) {
  return { source, target, relationship }
}

const SUPPLIER_METHODS = ['供货响应', '交期协同', '产能调整']
const MANUFACTURING_METHODS = ['订单分配', '工厂协作', '产能优化']
const FACTORY_METHODS = ['生产执行', '质量控制', '产能切换']
const RETAILER_METHODS = ['需求预测', '库存管理', '渠道协同']

// 实验设计页的轻量参考图：仅在当前会话方案尚未返回时展示。
// 节点控制在 6 个，覆盖供应、运输、加工、需求四个关键环节，避免参考数据喧宾夺主。
export const URANIUM_REFERENCE_GRAPH = {
  title: '铀资源供应保障参考关系',
  agents: [
    agent('supplier_kazakhstan', '哈萨克斯坦铀矿', 'supply', '主要进口来源，承担基础供给。'),
    agent('supplier_namibia', '纳米比亚铀矿', 'supply', '补充进口来源，用于分散供给风险。'),
    agent('transport_ocean', '国际海运通道', 'transport', '连接海外矿区与国内接收节点。'),
    agent('supplier_reserve', '国内铀资源储备', 'supply', '供应中断时释放库存并平抑缺口。'),
    agent('factory_fuel', '核燃料加工企业', 'manufacturing', '将天然铀转化为核燃料产品。'),
    agent('retailer_nuclear', '核电需求端', 'sales', '形成需求计划并反馈库存消耗。')
  ],
  relationship_net: [
    edge('supplier_kazakhstan', 'transport_ocean', '进口供应'),
    edge('supplier_namibia', 'transport_ocean', '补充供应'),
    edge('transport_ocean', 'factory_fuel', '运输交付'),
    edge('supplier_reserve', 'factory_fuel', '储备补位'),
    edge('factory_fuel', 'retailer_nuclear', '核燃料供应'),
    edge('retailer_nuclear', 'supplier_reserve', '库存反馈')
  ]
}

const STEEL_SUPPLIER_PARAMS = [
  { key: 'delivery_lead_time', label: '交付周期(天)', type: 'number', default: 7, min: 1, max: 30 },
  { key: 'supply_capacity_range', label: '月供应能力(吨)', type: 'range', default: [800, 1500], min: 0, max: 3000 }
]

const CHIP_SUPPLIER_PARAMS = [
  { key: 'delivery_lead_time', label: '交付周期(天)', type: 'number', default: 14, min: 1, max: 60 },
  { key: 'supply_capacity_range', label: '月供应能力(万件)', type: 'range', default: [50, 120], min: 0, max: 300 }
]

const SPOT_SUPPLIER_PARAMS = [
  { key: 'delivery_lead_time', label: '交付周期(天)', type: 'number', default: 2, min: 1, max: 14 },
  { key: 'supply_capacity_range', label: '月供应能力(吨)', type: 'range', default: [120, 360], min: 0, max: 1000 }
]

const OVERSEAS_SUPPLIER_PARAMS = [
  { key: 'delivery_lead_time', label: '交付周期(天)', type: 'number', default: 21, min: 7, max: 90 },
  { key: 'supply_capacity_range', label: '月供应能力(万件)', type: 'range', default: [30, 90], min: 0, max: 200 }
]

const DOMESTIC_SUPPLIER_A_PARAMS = [
  { key: 'delivery_lead_time', label: '交付周期(天)', type: 'number', default: 10, min: 1, max: 45 },
  { key: 'supply_capacity_range', label: '月供应能力(万件)', type: 'range', default: [20, 65], min: 0, max: 160 }
]

const DOMESTIC_SUPPLIER_B_PARAMS = [
  { key: 'delivery_lead_time', label: '交付周期(天)', type: 'number', default: 12, min: 1, max: 45 },
  { key: 'supply_capacity_range', label: '月供应能力(万件)', type: 'range', default: [10, 40], min: 0, max: 120 }
]

const MANUFACTURING_PARAMS = [
  { key: 'collaboration_radius', label: '协同半径(km)', type: 'number', default: 800, min: 100, max: 3000 },
  { key: 'max_collaboration_factories', label: '最大协同工厂数', type: 'number', default: 3, min: 1, max: 10 },
  { key: 'max_concurrent_orders', label: '并发订单上限', type: 'number', default: 50, min: 1, max: 200 },
  { key: 'factory_capacity_range', label: '工厂产能区间', type: 'range', default: [500, 2000], min: 0, max: 5000 }
]

const FACTORY_EAST_PARAMS = [
  { key: 'capacity_range', label: '日产能区间', type: 'range', default: [800, 1500], min: 0, max: 3000 },
  { key: 'operating_cost_range', label: '运营成本区间(万)', type: 'range', default: [25, 45], min: 0, max: 100 },
  { key: 'quality_level_range', label: '质量等级区间', type: 'range', default: [85, 95], min: 0, max: 100 }
]

const FACTORY_SOUTH_PARAMS = [
  { key: 'capacity_range', label: '日产能区间', type: 'range', default: [600, 1100], min: 0, max: 3000 },
  { key: 'operating_cost_range', label: '运营成本区间(万)', type: 'range', default: [20, 38], min: 0, max: 100 },
  { key: 'quality_level_range', label: '质量等级区间', type: 'range', default: [80, 92], min: 0, max: 100 }
]

const RETAILER_ONLINE_PARAMS = [
  { key: 'market_reach_range', label: '市场覆盖区间(万人)', type: 'range', default: [200, 500], min: 0, max: 1000 },
  { key: 'customer_satisfaction_range', label: '顾客满意度区间', type: 'range', default: [80, 95], min: 0, max: 100 },
  { key: 'inventory_capacity', label: '仓储容量(万件)', type: 'number', default: 60, min: 0, max: 200 },
  { key: 'markup_rate_range', label: '加价率区间(%)', type: 'range', default: [15, 35], min: 0, max: 100 }
]

const RETAILER_OFFLINE_PARAMS = [
  { key: 'market_reach_range', label: '市场覆盖区间(万人)', type: 'range', default: [80, 220], min: 0, max: 1000 },
  { key: 'customer_satisfaction_range', label: '顾客满意度区间', type: 'range', default: [75, 90], min: 0, max: 100 },
  { key: 'inventory_capacity', label: '仓储容量(万件)', type: 'number', default: 35, min: 0, max: 200 },
  { key: 'markup_rate_range', label: '加价率区间(%)', type: 'range', default: [20, 40], min: 0, max: 100 }
]

function supplierSteel(description = '提供原材料钢材，承担一级供应职能。') {
  return agent('supplier_steel', '钢材供应商', 'supplier', description, {
    availableMethods: SUPPLIER_METHODS,
    selectedMethod: '供货响应',
    configurable_params: STEEL_SUPPLIER_PARAMS
  })
}

function supplierChip(description = '提供电子元器件，受国际行情影响较大。') {
  return agent('supplier_chip', '芯片供应商', 'supplier', description, {
    availableMethods: SUPPLIER_METHODS,
    selectedMethod: '交期协同',
    configurable_params: CHIP_SUPPLIER_PARAMS
  })
}

function supplierSpot(description = '提供应急现货补位，用于快速填补关键缺口。') {
  return agent('supplier_spot', '现货应急供应商', 'supplier', description, {
    availableMethods: SUPPLIER_METHODS,
    selectedMethod: '供货响应',
    configurable_params: SPOT_SUPPLIER_PARAMS
  })
}

function supplierOverseas(description = '原进口主供，关税上调后成本与交期波动显著。') {
  return agent('supplier_overseas', '海外核心供应商', 'supplier', description, {
    availableMethods: SUPPLIER_METHODS,
    selectedMethod: '交期协同',
    configurable_params: OVERSEAS_SUPPLIER_PARAMS
  })
}

function supplierDomesticA(description = '首批通过验证的国产替代供应商，可承担快速放量。') {
  return agent('supplier_domestic_a', '国产替代供应商 A', 'supplier', description, {
    availableMethods: SUPPLIER_METHODS,
    selectedMethod: '产能调整',
    configurable_params: DOMESTIC_SUPPLIER_A_PARAMS
  })
}

function supplierDomesticB(description = '处于小批验证阶段的国产替代供应商。') {
  return agent('supplier_domestic_b', '国产替代供应商 B', 'supplier', description, {
    availableMethods: SUPPLIER_METHODS,
    selectedMethod: '供货响应',
    configurable_params: DOMESTIC_SUPPLIER_B_PARAMS
  })
}

function manufacturingCorporation(description = '统筹下属工厂排产、协调上游供应。') {
  return agent('manufacturing_corporation', '制造总厂', 'manufacturer', description, {
    availableMethods: MANUFACTURING_METHODS,
    selectedMethod: '订单分配',
    configurable_params: MANUFACTURING_PARAMS
  })
}

function factoryEast(description = '高产能基地，主要面向线上渠道和核心订单。') {
  return agent('factory_east', '华东工厂', 'factory', description, {
    availableMethods: FACTORY_METHODS,
    selectedMethod: '生产执行',
    configurable_params: FACTORY_EAST_PARAMS
  })
}

function factorySouth(description = '靠近港口与干线节点，承担跨区补位与线下补货。') {
  return agent('factory_south', '华南工厂', 'factory', description, {
    availableMethods: FACTORY_METHODS,
    selectedMethod: '产能切换',
    configurable_params: FACTORY_SOUTH_PARAMS
  })
}

function retailerOnline(description = '电商主力渠道，面向高频波动的 C 端订单。') {
  return agent('retailer_online', '线上零售商', 'retailer', description, {
    availableMethods: RETAILER_METHODS,
    selectedMethod: '需求预测',
    configurable_params: RETAILER_ONLINE_PARAMS
  })
}

function retailerOffline(description = '区域门店与经销网络，承接线下补货和本地客户。') {
  return agent('retailer_offline', '线下经销商', 'retailer', description, {
    availableMethods: RETAILER_METHODS,
    selectedMethod: '库存管理',
    configurable_params: RETAILER_OFFLINE_PARAMS
  })
}

export const AGENT_GRAPH_SNAPSHOTS = {
  'g-raw-shortage': {
    title: '原材料断供 · 供应-制造-销售应急联动',
    agents: [
      supplierSteel('常态主供钢材，但当前关键物料到货缺口扩大到 30%。'),
      supplierChip('电子件维持常态供货，用于保障关键 SKU 不出现二次缺口。'),
      supplierSpot('现货市场补位节点，用于 48 小时内快速补齐紧缺物料。'),
      manufacturingCorporation('统一协调应急采购、跨厂排产与订单优先级切换。'),
      factoryEast('优先承接核心订单，承担华东高优先级产能恢复。'),
      factorySouth('作为跨区补位工厂，承接尾部订单与替代产能。'),
      retailerOnline('线上订单波动大，是本轮履约恢复的核心观测口。'),
      retailerOffline('线下补货相对平稳，用于吸收跨区产能调节后的库存。')
    ],
    relationship_net: [
      edge('supplier_steel', 'manufacturing_corporation', '主料供应（缺口 30%）'),
      edge('supplier_chip', 'manufacturing_corporation', '电子件常态保供'),
      edge('supplier_spot', 'manufacturing_corporation', '应急现货补给'),
      edge('manufacturing_corporation', 'factory_east', '核心订单优先排产'),
      edge('manufacturing_corporation', 'factory_south', '跨厂补位排产'),
      edge('factory_east', 'retailer_online', '高优先级订单交付'),
      edge('factory_south', 'retailer_offline', '区域补货'),
      edge('factory_south', 'retailer_online', '跨区支援')
    ]
  },

  'g-regional-surge': {
    title: '区域销量激增 · 制造-销售跨区协同',
    agents: [
      supplierSteel('稳定提供基础原料，支撑高峰期扩产。'),
      supplierChip('电子元件供给受订单波峰放大，是高峰期的关键瓶颈点。'),
      manufacturingCorporation('负责在高峰期重分配产能并决定跨区调拨节奏。'),
      factoryEast('主力高产能工厂，优先服务线上高热度渠道。'),
      factorySouth('承担跨区补位与线下渠道兜底。'),
      retailerOnline('华东高峰订单主要承接渠道，需求拉升最明显。'),
      retailerOffline('门店经销网络相对稳态，但需配合线上分流。')
    ],
    relationship_net: [
      edge('supplier_steel', 'manufacturing_corporation', '常态主供'),
      edge('supplier_chip', 'manufacturing_corporation', '高峰期关键供料'),
      edge('manufacturing_corporation', 'factory_east', '加点扩产'),
      edge('manufacturing_corporation', 'factory_south', '跨区调拨支援'),
      edge('factory_east', 'retailer_online', '高峰加密供货'),
      edge('factory_east', 'retailer_offline', '渠道补货'),
      edge('factory_south', 'retailer_online', '跨区调拨'),
      edge('factory_south', 'retailer_offline', '常态门店供货')
    ]
  },

  'g-logistics-jam': {
    title: '主干物流拥堵 · 供应-制造-销售改道补位',
    agents: [
      supplierSteel('提前前置原料库存，降低主干拥堵对上游到厂节奏的冲击。'),
      supplierChip('通过延后非关键批次，优先保证高价值订单物料。'),
      manufacturingCorporation('根据主干拥堵情况切换工厂与渠道之间的履约路径。'),
      factoryEast('靠近核心市场，承担近场直发任务。'),
      factorySouth('靠近港口与南向节点，承担改道后的跨区补位。'),
      retailerOnline('对时效最敏感，需要优先恢复交付。'),
      retailerOffline('门店到货节奏较稳，可吸收部分调度滞后。')
    ],
    relationship_net: [
      edge('supplier_steel', 'manufacturing_corporation', '前置备料'),
      edge('supplier_chip', 'manufacturing_corporation', '关键物料保供'),
      edge('manufacturing_corporation', 'factory_east', '近场优先排产'),
      edge('manufacturing_corporation', 'factory_south', '南向改道排产'),
      edge('factory_east', 'retailer_online', '近场直发'),
      edge('factory_south', 'retailer_online', '跨区补位配送'),
      edge('factory_south', 'retailer_offline', '改道补货'),
      edge('factory_east', 'retailer_offline', '限量门店供货')
    ]
  },

  'g-baseline': {
    title: '基准平稳运行 · 运行态标准实体骨架',
    agents: [
      supplierSteel(),
      supplierChip(),
      manufacturingCorporation(),
      factoryEast(),
      factorySouth(),
      retailerOnline(),
      retailerOffline()
    ],
    relationship_net: [
      edge('supplier_steel', 'manufacturing_corporation', '原料供应'),
      edge('supplier_chip', 'manufacturing_corporation', '元件供应'),
      edge('manufacturing_corporation', 'factory_east', '调度生产'),
      edge('manufacturing_corporation', 'factory_south', '调度生产'),
      edge('factory_east', 'retailer_online', '供货'),
      edge('factory_east', 'retailer_offline', '补货'),
      edge('factory_south', 'retailer_offline', '供货')
    ]
  },

  'g-tariff-shock': {
    title: '关税突变 · 进口替代切换链路',
    agents: [
      supplierOverseas(),
      supplierDomesticA(),
      supplierDomesticB(),
      manufacturingCorporation('负责进口/国产双源切换、验证节奏与产能承接。'),
      factoryEast('优先承接首批国产替代物料对应的线上订单生产。'),
      factorySouth('承担替代料放量后的线下补货与尾部订单。'),
      retailerOnline('对价格和交期变化最敏感，优先验证切换影响。'),
      retailerOffline('用于观察切换后渠道补货稳定性。')
    ],
    relationship_net: [
      edge('supplier_overseas', 'manufacturing_corporation', '原进口主供（关税 +8pp）'),
      edge('supplier_domestic_a', 'manufacturing_corporation', '国产首批放量'),
      edge('supplier_domestic_b', 'manufacturing_corporation', '国产小批验证'),
      edge('manufacturing_corporation', 'factory_east', '替代料优先排产'),
      edge('manufacturing_corporation', 'factory_south', '替代产能承接'),
      edge('factory_east', 'retailer_online', '线上渠道交付'),
      edge('factory_south', 'retailer_online', '高峰补位'),
      edge('factory_south', 'retailer_offline', '线下渠道补货')
    ]
  }
}
