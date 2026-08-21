import backendBundle from './scnetReferenceBundle.json'

const IMPORTANT_COUNTRIES = [
  '哈萨克斯坦',
  '加拿大',
  '纳米比亚',
  '澳大利亚',
  '中国',
  '俄罗斯',
  '法国'
]

const IMPORTANT_MINES = [
  'Cigar Lake',
  'McArthur River/Key Lake',
  'Husab',
  'Olympic Dam',
  'Inkai',
  'Priargunsky'
]

const IMPORTANT_COMPANIES = [
  'Kazatomprom',
  'Cameco',
  'CNNC',
  'Orano',
  'TVEL/TENEX',
  'Urenco',
  'CGN'
]

const IMPORTANT_FACILITIES = [
  'CNNC转化/浓缩',
  'Orano转化厂',
  'Urenco浓缩厂',
  'TVEL转化/浓缩',
  'Cameco转化厂'
]

const IMPORTANT_TRANSPORT_ROUTES = [
  '哈萨克斯坦→中国',
  '哈萨克斯坦→俄罗斯转运→欧美',
  '纳米比亚→中国/亚洲',
  '尼日尔→法国(贝宁走廊)',
  '俄罗斯→非西方市场'
]

const IMPORTANT_DEMANDS = [
  '中国_2022需求',
  '美国_2022需求',
  '法国_2022需求',
  '俄罗斯_2022需求',
  '韩国_2022需求'
]

const IMPORTANT_RISK_EVENTS = [
  '福岛核事故',
  'COVID-19疫情',
  '俄乌战争'
]

const IMPORTANT_POLICIES = [
  'Euratom/ESA供应多元化政策',
  'REPowerEU降低对俄核燃料依赖',
  '中国两种资源两个市场'
]

const NETWORK_TIER_MAP = Object.freeze({
  Country: 'supply',
  UraniumMine: 'supply',
  UraniumCompany: 'supply',
  TransportRoute: 'transport',
  FuelCycleFacility: 'manufacturing',
  UraniumDemand: 'sales',
  RiskEvent: 'other',
  Policy: 'other',
  CostMetric: 'other',
  ExplorationMetric: 'other',
  InventoryMetric: 'other',
  PriceMetric: 'other',
  ResourceMetric: 'other'
})

const HUB_TYPE_LABELS = Object.freeze({
  field: '油田',
  origin: '起点',
  terminal: '出口终端',
  refinery: '炼厂',
  pipeline_station: '管道节点',
  port: '港口',
  strait: '海峡',
  canal: '运河',
  hub: '枢纽',
  sea: '海域',
  // 铀通道专用节点类型
  mine: '铀矿',
  mill: '黄饼集运',
  rail_hub: '铁路枢纽',
  land_port: '陆路口岸',
  conversion: '转化厂',
  enrichment: '浓缩厂',
  fuel: '燃料厂'
})

const HUB_TYPE_COLORS = Object.freeze({
  field: '#7c3aed',
  origin: '#2563eb',
  terminal: '#2563eb',
  refinery: '#f97316',
  pipeline_station: '#f59e0b',
  port: '#38bdf8',
  strait: '#ef4444',
  canal: '#f97316',
  hub: '#14b8a6',
  sea: '#94a3b8',
  mine: '#16a34a',
  mill: '#65a30d',
  rail_hub: '#f59e0b',
  land_port: '#ef4444',
  conversion: '#f97316',
  enrichment: '#a855f7',
  fuel: '#0ea5e9'
})

/** 铀通道运输方式标签：只有陆运 / 海运 / 多式联运三类，不存在油气意义上的“管道” */
export const URANIUM_CORRIDOR_TYPE_LABELS = Object.freeze({
  land: '陆运',
  sea: '海运',
  multimodal: '多式联运'
})

export const SCNET_BACKEND_REFERENCE = backendBundle

const SCNET_REFERENCE_SOURCES = Object.freeze([
  '/root/sgm-cmse/data/processed_uranium/structured/*.json',
  '/root/sgm-cmse/data/processed_uranium/enterprise_nodes.json',
  '/root/sgm-cmse/data/processed_uranium/collaboration_network.json',
  '/root/sgm-cmse/data/processed_uranium/monthly_statistics.json',
  '/root/test/文档/石油供应链数据.doc',
  '/root/test/文档/石油供应链的流程.doc',
  '/root/test/铀梳理.docx'
])

const wp = (label, lat, lng, type = 'port', country = '', detail = '') => ({
  label,
  lat,
  lng,
  type,
  country,
  detail
})

export const ENERGY_TRANSPORT_CORRIDORS = Object.freeze([
  {
    id: 'sea_hormuz_jamnagar',
    type: 'sea',
    shortName: 'S1 霍尔木兹-印西',
    name: '拉斯塔努拉—霍尔木兹—贾姆讷格尔原油海运线',
    operator: 'Saudi Aramco / Reliance',
    capacityLabel: 'VLCC 主干海运',
    riskLabel: '霍尔木兹 chokepoint',
    summary: '中东主产区经霍尔木兹向印度西岸炼厂出口，是海运脉冲最敏感的路径之一。',
    color: '#2563eb',
    shipCount: 8,
    waypoints: [
      wp('Ghawar', 25.45, 49.7, 'field', '沙特阿拉伯', '上游主力油田'),
      wp('Ras Tanura', 26.64, 50.16, 'terminal', '沙特阿拉伯', '主出口终端'),
      wp('Strait of Hormuz', 26.55, 56.25, 'strait', '阿曼/伊朗', '全球关键 choke point'),
      wp('Fujairah', 25.12, 56.34, 'hub', '阿联酋', '海湾外运与中转枢纽'),
      wp('Arabian Sea', 18.4, 63.4, 'sea', '', '海运主航道'),
      wp('Jamnagar', 22.47, 70.07, 'refinery', '印度', '大型炼化节点')
    ]
  },
  {
    id: 'sea_basra_rotterdam',
    type: 'sea',
    shortName: 'S2 海湾-欧洲',
    name: '巴士拉—苏伊士—鹿特丹/Pernis 原油海运线',
    operator: 'ADNOC / Shell / 欧洲炼厂群',
    capacityLabel: '欧向远洋干线',
    riskLabel: '霍尔木兹 + 曼德海峡 + 苏伊士',
    summary: '连接海湾出口与欧洲炼化中心，沿线 chokepoint 多，适合做海运风险可视化骨架。',
    color: '#0f766e',
    shipCount: 7,
    waypoints: [
      wp('Basra', 30.5, 47.81, 'origin', '伊拉克', '海湾出口起点'),
      wp('Strait of Hormuz', 26.55, 56.25, 'strait', '阿曼/伊朗', '海湾出口 choke point'),
      wp('Gulf of Aden', 12.9, 48.5, 'sea', '', '亚丁湾航路'),
      wp('Bab el-Mandeb', 12.58, 43.33, 'strait', '也门/吉布提', '红海入口 choke point'),
      wp('Suez Canal', 30.45, 32.35, 'canal', '埃及', '红海-地中海连接节点'),
      wp('Mediterranean Sea', 35.2, 18.4, 'sea', '', '地中海主航道'),
      wp('Rotterdam', 51.95, 4.14, 'port', '荷兰', '欧洲门户港'),
      wp('Pernis', 51.89, 4.37, 'refinery', '荷兰', '欧洲炼化集群')
    ]
  },
  {
    id: 'sea_kozmino_ulsan',
    type: 'sea',
    shortName: 'S3 远东-亚洲',
    name: 'Kozmino—日本海—蔚山原油海运线',
    operator: 'Rosneft / 韩国炼厂群',
    capacityLabel: '远东短程海运',
    riskLabel: '远东港口装船能力',
    summary: 'ESPO 海运支路向东北亚炼厂供油，适合在地图上补足远东出口方向。',
    color: '#1d4ed8',
    shipCount: 6,
    waypoints: [
      wp('ESPO', 59.1, 112.8, 'pipeline_station', '俄罗斯', '远东外运主干线'),
      wp('Kozmino', 42.72, 132.86, 'terminal', '俄罗斯', '太平洋出口终端'),
      wp('Sea of Japan', 40.3, 136.5, 'sea', '', '东北亚海运通道'),
      wp('Korea Strait', 34.6, 129.8, 'strait', '韩国/日本', '日韩通航 choke point'),
      wp('Ulsan', 35.5, 129.38, 'refinery', '韩国', '东北亚炼化枢纽')
    ]
  },
  {
    id: 'sea_corpus_rotterdam',
    type: 'sea',
    shortName: 'S4 墨湾-欧洲',
    name: 'Corpus Christi/Houston—大西洋—鹿特丹海运线',
    operator: 'ExxonMobil / Shell / 欧洲贸易商',
    capacityLabel: '跨大西洋海运',
    riskLabel: '美湾装港与大西洋船期',
    summary: '把页岩油出口港与欧洲炼化/交易中心串起来，补全美湾方向的海运骨架。',
    color: '#38bdf8',
    shipCount: 6,
    waypoints: [
      wp('Permian', 31.8, -102.4, 'field', '美国', '页岩油主产区'),
      wp('Corpus Christi', 27.8, -97.39, 'terminal', '美国', '美湾出口港'),
      wp('Houston', 29.73, -95.26, 'port', '美国', '美湾油气港群'),
      wp('Atlantic Route', 35.0, -47.0, 'sea', '', '跨大西洋航道'),
      wp('Rotterdam', 51.95, 4.14, 'port', '荷兰', '欧洲门户港'),
      wp('Pernis', 51.89, 4.37, 'refinery', '荷兰', '欧洲炼化集群')
    ]
  },
  {
    id: 'pipeline_espo_daqing',
    type: 'pipeline',
    shortName: 'P1 ESPO 中俄',
    name: 'ESPO 管道—斯科沃罗季诺—大庆支线',
    operator: 'Transneft / CNPC',
    capacityLabel: '跨境陆上输送',
    riskLabel: '远东边境节点',
    summary: '文档里提到的 ESPO 是最适合在地图页画成管道层的骨架之一。',
    color: '#f59e0b',
    shipCount: 0,
    waypoints: [
      wp('East Siberia', 59.1, 112.8, 'field', '俄罗斯', '上游资源地'),
      wp('Skovorodino', 53.98, 123.94, 'pipeline_station', '俄罗斯', '中转分输节点'),
      wp('Daqing', 46.59, 125.1, 'refinery', '中国', '东北炼化节点')
    ]
  },
  {
    id: 'pipeline_druzhba_europe',
    type: 'pipeline',
    shortName: 'P2 Druzhba',
    name: 'Druzhba 管道—白俄罗斯—中欧炼厂群',
    operator: 'Rosneft / 中欧炼厂群',
    capacityLabel: '欧洲陆上主干',
    riskLabel: '俄欧地缘约束',
    summary: '适合用来表现“上游资源—跨境管道—欧洲炼化”的实体和路线关系。',
    color: '#fb923c',
    shipCount: 0,
    waypoints: [
      wp('Volga Hub', 53.2, 50.15, 'field', '俄罗斯', '俄罗斯上游集散节点'),
      wp('Belarus Transit', 52.1, 24.0, 'pipeline_station', '白俄罗斯', '跨境中转节点'),
      wp('Central Europe Hub', 52.15, 14.65, 'refinery', '德国/波兰', '中欧炼厂群')
    ]
  },
  {
    id: 'pipeline_keystone_houston',
    type: 'pipeline',
    shortName: 'P3 Keystone',
    name: 'Keystone / Enbridge—Cushing—Houston/Baytown',
    operator: 'Keystone / Enbridge / ExxonMobil',
    capacityLabel: '北美陆上主干',
    riskLabel: '中枢罐区与海湾炼厂联动',
    summary: '连接加拿大上游、库欣中枢和美湾炼化，是前端地图里非常直观的一条管道链。',
    color: '#f97316',
    shipCount: 0,
    waypoints: [
      wp('Alberta', 52.35, -111.47, 'field', '加拿大', '油砂资源地'),
      wp('Cushing', 35.98, -96.77, 'pipeline_station', '美国', '北美库存与分输中枢'),
      wp('Houston', 29.73, -95.26, 'port', '美国', '美湾港群'),
      wp('Baytown', 29.73, -94.96, 'refinery', '美国', '海湾炼化节点')
    ]
  },
  {
    id: 'pipeline_cpc_novorossiysk',
    type: 'pipeline',
    shortName: 'P4 CPC',
    name: 'CPC 管道—Tengiz—新罗西斯克出口线',
    operator: 'CPC 联营',
    capacityLabel: '里海出口管道',
    riskLabel: '黑海出口终端',
    summary: '把哈萨克产区和黑海外运终端连接起来，适合做里海方向的出口展示。',
    color: '#f59e0b',
    shipCount: 0,
    waypoints: [
      wp('Tengiz', 46.1, 53.45, 'field', '哈萨克斯坦', '里海资源地'),
      wp('CPC', 45.0, 50.0, 'pipeline_station', '哈萨克斯坦/俄罗斯', '跨境管道干线'),
      wp('Novorossiysk', 44.72, 37.77, 'terminal', '俄罗斯', '黑海出口终端')
    ]
  },
  {
    id: 'pipeline_kirkuk_ceyhan',
    type: 'pipeline',
    shortName: 'P5 Kirkuk-Ceyhan',
    name: 'Kirkuk-Ceyhan 管道—伊拉克北部—地中海出口线',
    operator: 'NIOC / 区域运营商',
    capacityLabel: '东地中海出口',
    riskLabel: '区域冲突与停输',
    summary: '文档里点名的 Kirkuk-Ceyhan 很适合做“冲突影响管道”的显式图层。',
    color: '#ea580c',
    shipCount: 0,
    waypoints: [
      wp('Kirkuk', 35.47, 44.39, 'field', '伊拉克', '北部资源区'),
      wp('Mosul Transit', 36.34, 43.13, 'pipeline_station', '伊拉克', '沿线中转节点'),
      wp('Ceyhan', 36.82, 35.93, 'terminal', '土耳其', '地中海出口终端')
    ]
  }
])

/**
 * 铀供应链运输通道骨架
 *
 * 数据来源：scnetReferenceBundle.json → uranium.routes（哈→中、纳米比亚→中、
 * 尼日尔→法国等 12 条真实通道）。铀以黄饼 / UF6 / 浓缩铀形态用集装箱运输，
 * 只有「陆运（铁路+公路）」「海运」「多式联运」三类，不存在原油意义上的管道通道。
 */
export const URANIUM_TRANSPORT_CORRIDORS = Object.freeze([
  {
    id: 'u_land_kz_cn',
    type: 'land',
    shortName: 'L1 哈萨克—中国',
    name: 'Chu-Sarysu 矿区—阿拉山口—国内转化厂陆路通道',
    operator: 'Kazatomprom / 中核（合资矿山）',
    product: '黄饼 U3O8',
    capacityLabel: '铁路+公路 · 约 15 kTU/年',
    riskLabel: '低风险（中哈陆路直连）',
    summary: '哈萨克 ISL 矿区黄饼经中哈铁路口岸直运国内转化厂，是我国铀进口量最大的一条陆路通道。',
    color: '#f59e0b',
    waypoints: [
      wp('Chu-Sarysu 矿区', 44.9, 67.2, 'mine', '哈萨克斯坦', '中哈合资 ISL 矿区'),
      wp('阿拉木图', 43.24, 76.89, 'rail_hub', '哈萨克斯坦', '中哈铁路集散枢纽'),
      wp('阿拉山口', 45.17, 82.57, 'land_port', '中国', '西北陆路口岸，铀进口主通道'),
      wp('乌鲁木齐', 43.83, 87.62, 'rail_hub', '中国', '国内西北铁路枢纽'),
      wp('兰州转化基地', 36.06, 103.83, 'conversion', '中国', '国内转化 / 浓缩基地')
    ]
  },
  {
    id: 'u_land_kz_ru',
    type: 'land',
    shortName: 'L2 哈萨克—俄罗斯',
    name: 'Kyzylorda—奥伦堡—Seversk 转化厂铁路通道',
    operator: 'Uranium One / TVEL',
    product: '黄饼 U3O8',
    capacityLabel: '铁路 · 约 3 kTU/年',
    riskLabel: '制裁风险（转运受限）',
    summary: 'Uranium One 运营的哈俄铁路通道，向俄罗斯转化 / 浓缩厂输送黄饼，受制裁与过境限制影响明显。',
    color: '#d97706',
    waypoints: [
      wp('Kyzylorda', 44.85, 65.51, 'mill', '哈萨克斯坦', '黄饼集运与铁路装车点'),
      wp('奥伦堡', 51.77, 55.1, 'land_port', '俄罗斯', '俄哈铁路过境口岸'),
      wp('叶卡捷琳堡', 56.84, 60.65, 'rail_hub', '俄罗斯', '乌拉尔铁路枢纽'),
      wp('Seversk', 56.6, 84.88, 'conversion', '俄罗斯', 'TVEL 转化 / 浓缩厂')
    ]
  },
  {
    id: 'u_land_ca_us',
    type: 'land',
    shortName: 'L3 加拿大—美国',
    name: 'Athabasca—Saskatoon—Metropolis 转化厂公路通道',
    operator: 'Cameco',
    product: '黄饼 U3O8',
    capacityLabel: '公路 · 约 7 kTU/年',
    riskLabel: '低风险（加美陆界）',
    summary: 'Cameco 主力路线，Athabasca 盆地黄饼经公路直运美国 Metropolis 转化厂，无需出海。',
    color: '#fb923c',
    waypoints: [
      wp('Athabasca 盆地', 57.5, -105.5, 'mine', '加拿大', 'McArthur River / Cigar Lake 矿区'),
      wp('Saskatoon', 52.13, -106.67, 'mill', '加拿大', '黄饼集运与公路装车点'),
      wp('Emerson 口岸', 49.0, -97.21, 'land_port', '加拿大 / 美国', '加美陆路口岸'),
      wp('Metropolis', 37.15, -88.73, 'conversion', '美国', '美国在运转化厂')
    ]
  },
  {
    id: 'u_land_uz_ru_cn',
    type: 'land',
    shortName: 'L4 乌兹别克—俄/中',
    name: 'Navoi—塔什干—俄 / 中转化厂铁路通道',
    operator: 'NMMC（Navoi 矿冶联合体）',
    product: '黄饼 U3O8',
    capacityLabel: '铁路 · 约 3.5 kTU/年',
    riskLabel: '低风险（对俄中稳定出口）',
    summary: 'NMMC 出口通道，经中亚铁路网向俄罗斯与中国转化厂交付黄饼，是中亚第二大陆路来源。',
    color: '#ea580c',
    waypoints: [
      wp('Navoi', 40.1, 65.37, 'mine', '乌兹别克斯坦', 'NMMC 主力 ISL 矿区'),
      wp('塔什干', 41.3, 69.24, 'rail_hub', '乌兹别克斯坦', '中亚铁路枢纽'),
      wp('阿拉木图', 43.24, 76.89, 'rail_hub', '哈萨克斯坦', '中亚—中国铁路集散'),
      wp('阿拉山口', 45.17, 82.57, 'land_port', '中国', '西北陆路口岸')
    ]
  },
  {
    id: 'u_sea_na_cn',
    type: 'sea',
    shortName: 'S1 纳米比亚—中国',
    name: '鲸湾港—好望角—国内接卸港海运通道',
    operator: 'CNNC / Husab',
    product: '黄饼 U3O8',
    capacityLabel: '散货海运 · 约 4 kTU/年',
    riskLabel: '港口设施与船期约束',
    summary: 'Husab（中核控股）主力出口通道，黄饼在鲸湾港装船绕好望角运抵国内东部沿海接卸港。',
    color: '#2563eb',
    waypoints: [
      wp('Husab 矿', -22.55, 15.33, 'mine', '纳米比亚', '中核控股主力露天矿'),
      wp('鲸湾港', -22.95, 14.5, 'port', '纳米比亚', '纳米比亚主出口港'),
      wp('好望角', -34.36, 18.47, 'strait', '南非', '绕行好望角航段'),
      wp('印度洋', -20.0, 60.0, 'sea', '', '印度洋主航道'),
      wp('马六甲海峡', 2.0, 101.5, 'strait', '马来西亚 / 印尼', '亚洲方向关键 chokepoint'),
      wp('连云港', 34.75, 119.45, 'port', '中国', '东部沿海接卸口岸')
    ]
  },
  {
    id: 'u_sea_na_west',
    type: 'sea',
    shortName: 'S2 纳米比亚—欧美',
    name: '鲸湾港—大西洋—欧洲 / 北美集装箱海运通道',
    operator: 'Rössing / Langer Heinrich',
    product: '黄饼 U3O8',
    capacityLabel: '集装箱海运 · 约 2 kTU/年',
    riskLabel: '低风险',
    summary: 'Rössing 与 Langer Heinrich 的西向出口通道，走标准工业危险品集装箱，执行 IAEA SSR-6 运输规范。',
    color: '#0ea5e9',
    waypoints: [
      wp('Rössing 矿', -22.48, 15.04, 'mine', '纳米比亚', '老牌露天矿'),
      wp('鲸湾港', -22.95, 14.5, 'port', '纳米比亚', '纳米比亚主出口港'),
      wp('大西洋中部', 0.0, -5.0, 'sea', '', '南北大西洋航道'),
      wp('拉斯帕尔马斯', 28.13, -15.43, 'hub', '西班牙', '大西洋中转补给枢纽'),
      wp('鹿特丹', 51.95, 4.14, 'port', '荷兰', '欧洲门户港')
    ]
  },
  {
    id: 'u_sea_au_global',
    type: 'sea',
    shortName: 'S3 澳大利亚—亚欧美',
    name: 'Olympic Dam—阿德莱德 / 达尔文—亚欧美集装箱海运通道',
    operator: 'BHP / Boss Energy',
    product: '黄饼 U3O8',
    capacityLabel: '集装箱海运 · 约 4 kTU/年',
    riskLabel: '州政策与出口许可限制',
    summary: '铜铀伴生产量经阿德莱德、达尔文两港出口，合同分散在亚洲、欧洲与北美多个买家。',
    color: '#0f766e',
    waypoints: [
      wp('Olympic Dam', -30.44, 136.89, 'mine', '澳大利亚', '铜铀伴生主矿'),
      wp('阿德莱德港', -34.78, 138.5, 'port', '澳大利亚', '南澳出口港'),
      wp('达尔文港', -12.46, 130.84, 'port', '澳大利亚', '北部出口港'),
      wp('望加锡海峡', -2.0, 118.5, 'strait', '印度尼西亚', '东南亚航道 chokepoint'),
      wp('上海洋山港', 30.62, 122.07, 'port', '中国', '东部沿海接卸口岸')
    ]
  },
  {
    id: 'u_multi_kz_west',
    type: 'multimodal',
    shortName: 'M1 哈萨克—欧美',
    name: 'Kyzylorda—阿克套 / 黑海中转—欧洲 / 北美多式联运通道',
    operator: 'Kazatomprom / 西方贸易商',
    product: '黄饼 U3O8',
    capacityLabel: '铁路+海运 · 约 3 kTU/年',
    riskLabel: '中转国政策 + 海运保险',
    summary: '俄罗斯通道受限后，哈萨克黄饼改经跨里海走廊或中国—印度洋中转，运输周期与保险成本显著上升。',
    color: '#7c3aed',
    waypoints: [
      wp('Kyzylorda', 44.85, 65.51, 'mill', '哈萨克斯坦', '黄饼集运与铁路装车点'),
      wp('阿克套港', 43.65, 51.16, 'port', '哈萨克斯坦', '里海出口港'),
      wp('巴库', 40.41, 49.87, 'hub', '阿塞拜疆', '跨里海中间走廊节点'),
      wp('波季', 42.15, 41.67, 'port', '格鲁吉亚', '黑海出口港'),
      wp('土耳其海峡', 41.12, 29.06, 'strait', '土耳其', '黑海出海 chokepoint'),
      wp('鹿特丹', 51.95, 4.14, 'port', '荷兰', '欧洲门户港')
    ]
  },
  {
    id: 'u_multi_ca_eu',
    type: 'multimodal',
    shortName: 'M2 加拿大—欧洲',
    name: 'Athabasca—蒙特利尔港—法国转化厂多式联运通道',
    operator: 'Cameco / Orano / Urenco',
    product: '黄饼 U3O8',
    capacityLabel: '铁路+海运 · 约 2 kTU/年',
    riskLabel: '海运低风险',
    summary: '加拿大黄饼经铁路运抵蒙特利尔港装船，跨大西洋交付法国 Malvési 转化厂与英国浓缩厂。',
    color: '#6366f1',
    waypoints: [
      wp('Athabasca 盆地', 57.5, -105.5, 'mine', '加拿大', 'McArthur River / Cigar Lake 矿区'),
      wp('蒙特利尔港', 45.55, -73.54, 'port', '加拿大', '东岸出口港'),
      wp('北大西洋', 45.0, -40.0, 'sea', '', '跨大西洋航道'),
      wp('勒阿弗尔', 49.49, 0.11, 'port', '法国', '欧洲接卸港'),
      wp('Malvési', 43.2, 2.87, 'conversion', '法国', 'Orano 转化厂')
    ]
  },
  {
    id: 'u_multi_ne_fr',
    type: 'multimodal',
    shortName: 'M3 尼日尔—法国',
    name: 'Arlit—尼亚美—科托努（贝宁走廊）—法国多式联运通道',
    operator: 'Orano',
    product: '黄饼 U3O8',
    capacityLabel: '公路+铁路+海运 · 约 2 kTU/年',
    riskLabel: '政变 + 贝宁过境 + 萨赫勒安全',
    summary: 'Orano 主路线，黄饼经公路穿越萨赫勒到贝宁科托努港出海；2023 年政变后贝宁走廊成为全链最脆弱的一环。',
    color: '#a855f7',
    waypoints: [
      wp('Arlit', 18.74, 7.39, 'mine', '尼日尔', 'Somair / Cominak 矿区'),
      wp('尼亚美', 13.51, 2.11, 'hub', '尼日尔', '萨赫勒公路干线节点'),
      wp('帕拉库', 9.34, 2.63, 'rail_hub', '贝宁', '贝宁铁路起点'),
      wp('科托努港', 6.35, 2.42, 'port', '贝宁', '贝宁走廊出海口'),
      wp('几内亚湾', 10.0, -20.0, 'sea', '', '西非—欧洲航道'),
      wp('勒阿弗尔', 49.49, 0.11, 'port', '法国', '欧洲接卸港'),
      wp('Malvési', 43.2, 2.87, 'conversion', '法国', 'Orano 转化厂')
    ]
  },
  {
    id: 'u_multi_ru_global',
    type: 'multimodal',
    shortName: 'M4 俄罗斯—全球',
    name: 'Seversk / Novouralsk—圣彼得堡港—全球燃料厂多式联运通道',
    operator: 'TENEX / TVEL',
    product: 'UF6 / 浓缩铀',
    capacityLabel: '铁路+海运 · 约 20 kTU/年',
    riskLabel: '制裁风险（西方拒收）',
    summary: '全球最大的浓缩铀出口通道；西方制裁后运量向非西方市场转移，是供给集中度的主要来源。',
    color: '#8b5cf6',
    waypoints: [
      wp('Seversk', 56.6, 84.88, 'conversion', '俄罗斯', 'TVEL 转化厂'),
      wp('Novouralsk', 57.25, 60.09, 'enrichment', '俄罗斯', '主力浓缩厂'),
      wp('圣彼得堡港', 59.93, 30.34, 'port', '俄罗斯', '波罗的海出口港'),
      wp('波罗的海', 56.5, 19.0, 'sea', '', '波罗的海航道'),
      wp('鹿特丹', 51.95, 4.14, 'port', '荷兰', '欧洲门户港')
    ]
  }
])

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeText(value) {
  return String(value || '').trim()
}

function sortNumbersDesc(getter) {
  return (left, right) => Number(getter(right) || 0) - Number(getter(left) || 0)
}

function uniqueBy(items, getKey) {
  const map = new Map()
  safeArray(items).forEach((item) => {
    const key = getKey(item)
    if (!key || map.has(key)) return
    map.set(key, item)
  })
  return [...map.values()]
}

function createReferenceAgent(node, tier) {
  const props = node?.properties || {}
  const metaTags = []
  if (props.country) metaTags.push(props.country)
  if (props.region) metaTags.push(props.region)
  if (props.type) metaTags.push(props.type)
  if (props.method) metaTags.push(props.method)
  if (props.role) metaTags.push(props.role)
  if (props.category) metaTags.push(props.category)

  return {
    id: node.id,
    name: node.name || node.label || node.id,
    category: tier,
    description: buildReferenceDescription(node),
    rawCategory: node.type,
    tags: uniqueBy(metaTags.filter(Boolean), (item) => item),
    configurable_params: []
  }
}

function buildReferenceDescription(node) {
  const props = node?.properties || {}
  const type = node?.type || ''

  if (type === 'Country') {
    return [props.region, props.mining_method, props.note].filter(Boolean).join(' · ')
  }
  if (type === 'UraniumMine') {
    return [
      props.country,
      props.operator,
      props.status,
      props.capacity_tU ? `产能 ${props.capacity_tU} tU/年` : '',
      props.note
    ].filter(Boolean).join(' · ')
  }
  if (type === 'UraniumCompany') {
    return [props.country, props.role, props.note].filter(Boolean).join(' · ')
  }
  if (type === 'FuelCycleFacility') {
    return [props.country, props.type, props.operator, props.note].filter(Boolean).join(' · ')
  }
  if (type === 'TransportRoute') {
    return [
      props.origin && props.destination ? `${props.origin} → ${props.destination}` : '',
      props.mode,
      props.volume_kTU ? `运量 ${props.volume_kTU} kTU` : '',
      props.risk
    ].filter(Boolean).join(' · ')
  }
  if (type === 'UraniumDemand') {
    return [
      props.country,
      props.year ? `${props.year} 年` : '',
      props.demand_tU ? `需求 ${props.demand_tU} tU` : ''
    ].filter(Boolean).join(' · ')
  }
  if (type === 'RiskEvent' || type === 'Policy') {
    return [props.year ? `${props.year}` : '', props.category, props.description].filter(Boolean).join(' · ')
  }
  if (type === 'PriceMetric') {
    return [props.year ? `${props.year} 年` : '', props.spot_USD_lb ? `现货 $${props.spot_USD_lb}/lb` : '', props.note].filter(Boolean).join(' · ')
  }
  if (type === 'InventoryMetric') {
    return [props.country, props.year ? `${props.year} 年` : '', props.inventory_tU ? `库存 ${props.inventory_tU} tU` : '', props.note].filter(Boolean).join(' · ')
  }
  return Object.values(props).filter(Boolean).slice(0, 4).join(' · ')
}

function selectNodesByNames(nodes, type, names) {
  const source = safeArray(nodes).filter((item) => item?.type === type)
  const picked = names
    .map((name) => source.find((item) => normalizeText(item.name) === normalizeText(name)))
    .filter(Boolean)

  return uniqueBy(picked, (item) => item.id)
}

function extractRelationLabel(relation = '') {
  const map = {
    affects: '影响',
    based_in: '总部位于',
    connects_to: '连接',
    consumes: '需求吸收',
    explores: '勘探投入',
    has_cost: '成本结构',
    has_inventory: '库存',
    has_mine: '拥有矿山',
    has_price: '价格',
    has_resource: '资源',
    located_in: '位于',
    operates: '运营',
    operates_facility: '运营设施',
    regulates: '政策约束'
  }
  return map[relation] || relation || '关联'
}

export function buildUraniumReferenceGraph() {
  const network = SCNET_BACKEND_REFERENCE?.uranium?.network || { nodes: [], edges: [] }
  const selectedNodes = [
    ...selectNodesByNames(network.nodes, 'Country', IMPORTANT_COUNTRIES),
    ...selectNodesByNames(network.nodes, 'UraniumMine', IMPORTANT_MINES),
    ...selectNodesByNames(network.nodes, 'UraniumCompany', IMPORTANT_COMPANIES),
    ...selectNodesByNames(network.nodes, 'FuelCycleFacility', IMPORTANT_FACILITIES),
    ...selectNodesByNames(network.nodes, 'TransportRoute', IMPORTANT_TRANSPORT_ROUTES),
    ...selectNodesByNames(network.nodes, 'UraniumDemand', IMPORTANT_DEMANDS),
    ...selectNodesByNames(network.nodes, 'RiskEvent', IMPORTANT_RISK_EVENTS),
    ...selectNodesByNames(network.nodes, 'Policy', IMPORTANT_POLICIES)
  ]

  const uniqueNodes = uniqueBy(selectedNodes, (item) => item.id)
  const selectedIds = new Set(uniqueNodes.map((item) => item.id))
  const relationshipNet = safeArray(network.edges)
    .filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))
    .map((edge, index) => ({
      id: `uranium-ref-edge-${index}`,
      source: edge.source,
      target: edge.target,
      relationship: extractRelationLabel(edge.relation),
      rawRelation: edge.relation
    }))

  const agents = uniqueNodes.map((node) => {
    const tier = NETWORK_TIER_MAP[node.type] || 'other'
    return createReferenceAgent(node, tier)
  })

  const tierCounts = agents.reduce((acc, agent) => {
    acc[agent.category] = (acc[agent.category] || 0) + 1
    return acc
  }, {})

  return {
    agents,
    relationship_net: relationshipNet,
    stats: {
      nodes: agents.length,
      edges: relationshipNet.length,
      tiers: tierCounts
    }
  }
}

export function buildUraniumRouteFactRows() {
  return safeArray(SCNET_BACKEND_REFERENCE?.uranium?.routes)
    .map((item, index) => ({
      id: `${item.name || 'route'}-${index}`,
      name: item.name || `通道 ${index + 1}`,
      path: item.path || '',
      product: item.product || '',
      mode: item.mode || '',
      volume: Number(item.volume_ktu || 0),
      volumeLabel: item.volume_ktu != null ? `${item.volume_ktu} kTU` : '-',
      risk: item.risk || '',
      notes: item.notes || ''
    }))
    .sort(sortNumbersDesc((item) => item.volume))
}

export function buildUraniumEnterprisePortRows() {
  const grouped = new Map()
  safeArray(SCNET_BACKEND_REFERENCE?.uranium?.enterpriseNodes).forEach((item) => {
    const key = normalizeText(item.port) || normalizeText(item.city)
    if (!key) return
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        port: key,
        city: item.city || '',
        countries: new Set(),
        enterpriseTypes: new Set(),
        enterprises: [],
        coordinates: item.coordinates || null
      })
    }
    const bucket = grouped.get(key)
    if (item.country_city) bucket.countries.add(item.country_city.split(' ')[0])
    if (item.enterprise_type) bucket.enterpriseTypes.add(item.enterprise_type)
    bucket.enterprises.push(item)
  })

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      countries: [...item.countries],
      enterpriseTypes: [...item.enterpriseTypes],
      enterpriseCount: item.enterprises.length
    }))
    .sort(sortNumbersDesc((item) => item.enterpriseCount))
}

export function buildReferenceCorridorRows(corridors = ENERGY_TRANSPORT_CORRIDORS) {
  return safeArray(corridors).map((item) => {
    const checkpoints = safeArray(item.waypoints)
      .filter((point) => point.type !== 'sea')
      .map((point) => point.label)
    return {
      id: item.id,
      type: item.type,
      typeLabel: URANIUM_CORRIDOR_TYPE_LABELS[item.type] || '通道',
      color: item.color || '#64748b',
      product: item.product || '',
      shortName: item.shortName,
      name: item.name,
      operator: item.operator,
      capacityLabel: item.capacityLabel,
      riskLabel: item.riskLabel,
      summary: item.summary,
      origin: checkpoints[0] || '',
      destination: checkpoints[checkpoints.length - 1] || '',
      checkpoints,
      viaText: checkpoints.join(' → ')
    }
  })
}

/** 铀通道目录（陆运 / 海运 / 多式联运） */
export function buildUraniumCorridorRows() {
  return buildReferenceCorridorRows(URANIUM_TRANSPORT_CORRIDORS)
}

/** 铀通道沿线枢纽（矿区、口岸、港口、转化/浓缩厂） */
export function buildUraniumHubCatalog() {
  return buildTransportHubCatalog(URANIUM_TRANSPORT_CORRIDORS)
}

/** 按运输方式统计铀通道条数 */
function countUraniumCorridorsByType(type) {
  return URANIUM_TRANSPORT_CORRIDORS.filter((item) => item.type === type).length
}

export function buildTransportHubCatalog(corridors = ENERGY_TRANSPORT_CORRIDORS) {
  const hubs = new Map()

  safeArray(corridors).forEach((corridor) => {
    safeArray(corridor.waypoints)
      .filter((point) => point.type !== 'sea')
      .forEach((point) => {
        const key = `${point.label}::${point.lat}::${point.lng}`
        if (!hubs.has(key)) {
          hubs.set(key, {
            id: key,
            name: point.label,
            type: point.type,
            country: point.country,
            detail: point.detail,
            color: HUB_TYPE_COLORS[point.type] || '#64748b',
            label: HUB_TYPE_LABELS[point.type] || point.type || '节点',
            value: [point.lng, point.lat],
            corridors: [],
            modes: new Set()
          })
        }

        const hub = hubs.get(key)
        hub.corridors.push({
          id: corridor.id,
          shortName: corridor.shortName,
          type: corridor.type
        })
        hub.modes.add(corridor.type)
      })
  })

  return [...hubs.values()]
    .map((item) => ({
      ...item,
      modes: [...item.modes],
      corridorCount: item.corridors.length
    }))
    .sort(sortNumbersDesc((item) => item.corridorCount))
}

export function buildScnetReferenceSummary() {
  const uranium = SCNET_BACKEND_REFERENCE?.uranium || {}
  const graph = buildUraniumReferenceGraph()
  return {
    sources: SCNET_REFERENCE_SOURCES,
    uranium: {
      countries: safeArray(uranium.countries).length,
      routes: safeArray(uranium.routes).length,
      mines: safeArray(uranium.mines).length,
      events: safeArray(uranium.events).length,
      enterpriseNodes: safeArray(uranium.enterpriseNodes).length,
      networkNodes: safeArray(uranium.network?.nodes).length,
      networkEdges: safeArray(uranium.network?.edges).length,
      monthlyPoints: safeArray(uranium.monthlyStatistics?.monthly).length
    },
    transport: {
      corridors: URANIUM_TRANSPORT_CORRIDORS.length,
      landCorridors: countUraniumCorridorsByType('land'),
      seaCorridors: countUraniumCorridorsByType('sea'),
      multimodalCorridors: countUraniumCorridorsByType('multimodal'),
      hubs: buildUraniumHubCatalog().length
    },
    referenceGraph: graph.stats
  }
}
