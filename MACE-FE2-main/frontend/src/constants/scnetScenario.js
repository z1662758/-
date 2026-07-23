// ===== 场景切换常量：铀供应链 / 汽车供应链 =====
// 复用与 scnetPhase.js 相同的 localStorage + custom event 模式

export const SCENARIO_STORAGE_KEY = 'scnet_scenarioSelection'
export const SCENARIO_EVENT = 'scnetScenarioSelectionChanged'

export const SCENARIO_VALUES = {
  URANIUM: 'uranium',
  SUPPLY_CHAIN: 'supply_chain'
}

export const SCENARIO_LABELS = {
  uranium: '铀供应链',
  supply_chain: '汽车供应链'
}

// 铀供应链关键词
export const URANIUM_KW = [
  '铀', 'uranium', '核燃料', '核能', '核电', 'nuclear',
  'u3o8', '黄饼', 'yellowcake', '浓缩铀', '放射性',
  'cameco', 'kazatomprom', '尼日尔', '纳米比亚', '哈萨克斯坦',
  'isr', '地浸', '矿山', '核反应堆', '核电机组'
]

// 汽车供应链关键词
export const AUTO_KW = [
  '汽车', '整车', '车辆', 'auto', 'automotive', 'car', 'vehicle',
  '电动车', '新能源汽车', 'ev', 'electric',
  '零部件', '配件', '芯片', 'chip', '半导体', '电池', 'battery',
  '生产线', '工厂', 'factory', '制造', 'manufacturing',
  'byd', '比亚迪', 'caam', '乘联会', '特斯拉', 'tesla',
  '锂', '钴', '镍', '碳酸锂'
]

/**
 * 从用户消息中检测场景
 * @param {string} text 用户输入
 * @returns {'uranium'|'supply_chain'|null} 检测到的场景，null 表示无法判断
 */
export function detectScenario(text) {
  if (!text) return null
  const t = text.toLowerCase()

  // 明确声明权重最高
  let u = 0, a = 0
  if (t.includes('铀供应链') || t.includes('铀矿')) u += 10
  if (t.includes('汽车供应链') || t.includes('汽车产业')) a += 10

  u += URANIUM_KW.filter(k => t.includes(k.toLowerCase())).length
  a += AUTO_KW.filter(k => t.includes(k.toLowerCase())).length

  if (u === 0 && a === 0) return null
  return u >= a ? SCENARIO_VALUES.URANIUM : SCENARIO_VALUES.SUPPLY_CHAIN
}
