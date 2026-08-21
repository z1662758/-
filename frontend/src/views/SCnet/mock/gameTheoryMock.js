/**
 * 供应链博弈论演示数据 - 纯 Mock
 *
 * 与后端 game_theory_service.build_game_theory_payload 的语义对齐：
 *   - 默认场景 supplierVsRetailer = 需求方 × 制造节点；
 *     策略与后端 player1_strategies / player2_strategies 完全一致：
 *       需求方: 提前锁量 / 平衡采购 / 延后采购
 *       制造节点: 扩产 / 维持 / 收缩
 *   - 另两场景沿用仿真世界的真实实体（制造商/供应商、采购方/供应商），
 *     收益口径围绕「订单完成率 / 净利润 / 末期企业数 / 协作关系数」展开，
 *     不再出现平台/3PL/关税/汇率等仿真引擎不产出的概念。
 *
 * 收益矩阵 cell = { p1, p2, rationale }，行=Player1 策略、列=Player2 策略，
 * 与后端 payoff_matrix 结构一致，可被 findNashEquilibria 直接消费。
 */

export const SCENARIO_LIST = [
  { key: 'supplierVsRetailer', label: '需求方 × 制造节点' },
  { key: 'corePlatformVs3PL', label: '制造商 × 供应商' },
  { key: 'domesticVsImportSourcing', label: '采购方 × 供应商' }
]

export const GAME_SCENARIOS = {
  // ① 需求方(P1) × 制造节点(P2)
  supplierVsRetailer: {
    scenarioName: '需求方 × 制造节点：锁量 / 产能博弈',
    viewDesc: '面向铀场景的需求拉升窗口：需求方选择提前锁量、平衡采购或延后采购，制造节点选择扩产、维持或收缩，反映采购节奏与产能配置的协同与冲突。',
    player1: { flag: '🧾', label: '需求方', shortLabel: '需求方', alias: 'Demand Planner', color: '#3b82f6' },
    player2: { flag: '🏭', label: '制造节点', shortLabel: '制造节点', alias: 'Fuel Node', color: '#f97316' },
    p1Strategies: [
      { id: 'R1', name: '提前锁量', desc: '提前锁定更多长协和补量，争取高峰供给，但抬高预算和库存占用' },
      { id: 'R2', name: '平衡采购', desc: '维持年度采购节奏，平衡库存覆盖与资金占用' },
      { id: 'R3', name: '延后采购', desc: '等待价格或需求进一步明朗后再下单，降低当前投入但增加缺口风险' }
    ],
    p2Strategies: [
      { id: 'M1', name: '扩产', desc: '提前配置产能争取高峰订单，但承担过剩与库存风险' },
      { id: 'M2', name: '维持', desc: '按基线节奏生产，控制波动' },
      { id: 'M3', name: '收缩', desc: '降低产能与库存暴露，偏稳健' }
    ],
    payoffMatrix: [
      [
        { p1: 6.0, p2: 5.0, rationale: '提前锁量 × 扩产：需求方抢先锁住高峰供给，制造节点同步扩产，库存与预算压力上升但保供最强。' },
        { p1: 4.0, p2: 3.0, rationale: '提前锁量 × 维持：需求方锁量积极，但制造节点仍按基线节奏供给，局部窗口会出现缺口。' },
        { p1: -2.0, p2: -1.0, rationale: '提前锁量 × 收缩：需求提前释放而产能收紧，保供失败并形成双输。' }
      ],
      [
        { p1: 3.0, p2: 6.0, rationale: '平衡采购 × 扩产：制造节点先手扩产更占优，需求方保持稳态但承担一定冗余。' },
        { p1: 5.0, p2: 5.0, rationale: '平衡采购 × 维持：经典稳态，库存与产能都按基线节奏运行，双方无明显偏离动机。' },
        { p1: 2.0, p2: 3.0, rationale: '平衡采购 × 收缩：供给略紧但可维持，系统进入保守运行。' }
      ],
      [
        { p1: 1.0, p2: 4.0, rationale: '延后采购 × 扩产：需求释放不足导致制造节点过剩，扩产收益下降。' },
        { p1: 4.0, p2: 2.0, rationale: '延后采购 × 维持：需求方保留弹性，但制造节点订单走弱。' },
        { p1: 3.0, p2: 4.0, rationale: '延后采购 × 收缩：双方同步收缩，预算压力小，但后续高峰可能再度承压。' }
      ]
    ],
    nashHint: '(平衡采购, 维持) 为常态稳定组合；需求继续上行时可向 (提前锁量, 扩产) 迁移。',
    overallConclusion: '在需求拉升窗口下，"平衡采购 × 维持"是最稳的默认组合，对应较均衡的库存与产能配置；若确认需求继续上行，则应评估向"提前锁量 × 扩产"迁移，否则容易在后续窗口出现保供缺口。'
  },

  // ② 上游侧博弈：制造商(P1) × 供应商(P2)
  corePlatformVs3PL: {
    scenarioName: '制造商 × 供应商：投产 / 供货博弈',
    viewDesc: '上游侧博弈：制造商按订单需求安排投产，供应商决定供货与报价策略，反映缺料风险、协作关系数与净利润之间的权衡。',
    player1: { flag: '🏭', label: '制造商', shortLabel: '制造商', alias: 'Manufacturer', color: '#3b82f6' },
    player2: { flag: '📦', label: '供应商', shortLabel: '供应商', alias: 'Supplier', color: '#f97316' },
    p1Strategies: [
      { id: 'F1', name: '加大投产', desc: '提高排产抢占订单，但对上游供货稳定性要求高' },
      { id: 'F2', name: '稳态生产', desc: '按基线产能生产，控制缺料与库存风险' },
      { id: 'F3', name: '收缩排产', desc: '压缩产能与采购，降低暴露' }
    ],
    p2Strategies: [
      { id: 'S1', name: '优先保供', desc: '优先保障关键物料交付，绑定长期协作' },
      { id: 'S2', name: '常规交付', desc: '按合同节奏交付' },
      { id: 'S3', name: '限量提价', desc: '上调单价并设接单上限，保利润率' }
    ],
    payoffMatrix: [
      [
        { p1: 6.0, p2: 4.0, rationale: '加大投产 × 优先保供：供货充足、订单完成率高，协作关系加深，双方共赢' },
        { p1: 4.0, p2: 4.0, rationale: '加大投产 × 常规交付：产能与供货基本匹配，略有缺料波动' },
        { p1: 1.0, p2: 6.0, rationale: '加大投产 × 限量提价：制造商被迫为补料付溢价，供应商主导获利' }
      ],
      [
        { p1: 5.0, p2: 3.0, rationale: '稳态生产 × 优先保供：供货宽裕，制造商稳健，供应商让利' },
        { p1: 5.0, p2: 5.0, rationale: '稳态生产 × 常规交付：经典稳态，缺料率低、净利润均衡' },
        { p1: 3.0, p2: 4.0, rationale: '稳态生产 × 限量提价：物料偏紧，制造商成本上升' }
      ],
      [
        { p1: 3.0, p2: 2.0, rationale: '收缩排产 × 优先保供：需求走弱，供应商保供反而过剩' },
        { p1: 4.0, p2: 3.0, rationale: '收缩排产 × 常规交付：双方低位维持' },
        { p1: 2.0, p2: 2.0, rationale: '收缩排产 × 限量提价：需求与供给同时收紧，协作关系弱化、企业存活数下降' }
      ]
    ],
    nashHint: '(稳态生产, 常规交付) 为常态均衡；供给紧张时 (加大投产, 限量提价) 偏向供应商主导。',
    overallConclusion: '稳态生产 × 常规交付是上游协作的稳态均衡，对应低缺料率与稳定的协作关系数；当物料进入卖方市场，制造商陷入"为补料付溢价"的被动，应提前沉淀多源供应商以重建议价能力。'
  },

  // ③ 采购侧博弈：采购方(P1) × 供应商(P2)
  domesticVsImportSourcing: {
    scenarioName: '采购方 × 供应商：寻源 / 供货博弈',
    viewDesc: '采购侧博弈：采购方在单源 / 双源 / 应急寻源之间选择，供应商在供货稳定性与报价之间选择，反映断供风险、库存与协作关系的韧性权衡。',
    player1: { flag: '🧾', label: '采购方', shortLabel: '采购方', alias: 'Buyer', color: '#3b82f6' },
    player2: { flag: '📦', label: '供应商', shortLabel: '供应商', alias: 'Supplier', color: '#f97316' },
    p1Strategies: [
      { id: 'B1', name: '双源并行', desc: '关键物料保持双源，按交付弹性分配，韧性强' },
      { id: 'B2', name: '单源集采', desc: '集中采购换取价格，但单点断供风险高' },
      { id: 'B3', name: '应急寻源', desc: '断供后临时寻源，响应慢、成本高' }
    ],
    p2Strategies: [
      { id: 'S1', name: '稳定供货', desc: '承诺稳定交付与价格' },
      { id: 'S2', name: '弹性供货', desc: '供货量随产能波动' },
      { id: 'S3', name: '紧俏限量', desc: '物料紧俏时限量并提价' }
    ],
    payoffMatrix: [
      [
        { p1: 5.0, p2: 5.0, rationale: '双源并行 × 稳定供货：协同稳态，断供风险低、协作关系稳固，双赢' },
        { p1: 5.0, p2: 3.0, rationale: '双源并行 × 弹性供货：双源吸收波动，采购方稳、供应商受损' },
        { p1: 4.0, p2: 2.0, rationale: '双源并行 × 紧俏限量：双源结构对冲提价，采购方韧性凸显' }
      ],
      [
        { p1: 4.0, p2: 5.0, rationale: '单源集采 × 稳定供货：价格占优但依赖单点，供应商议价强' },
        { p1: 2.0, p2: 4.0, rationale: '单源集采 × 弹性供货：单点波动直接冲击履约，采购方承压' },
        { p1: -1.0, p2: 5.0, rationale: '单源集采 × 紧俏限量：单点被限量，断供风险爆发、订单大量未完成，采购方重创' }
      ],
      [
        { p1: 2.0, p2: 3.0, rationale: '应急寻源 × 稳定供货：被动补位，响应滞后' },
        { p1: 1.0, p2: 2.0, rationale: '应急寻源 × 弹性供货：双方都承压，缺料与延迟叠加' },
        { p1: 0.0, p2: 1.0, rationale: '应急寻源 × 紧俏限量：临时高价抢料，成本陡增、企业存活数下降，近乎双输' }
      ]
    ],
    nashHint: '(双源并行, 稳定供货) 是协同稳态；单源依赖遇上紧俏限量时风险骤升。',
    overallConclusion: '双源并行 × 稳定供货是韧性最优的协同均衡，对应最低的断供风险与稳定的协作关系数；单源集采虽在价格上占优，但一旦供应商转向"紧俏限量"便会触发断供、订单完成率骤降。建议把备选供应商沉淀为常态双源结构。'
  }
}

/**
 * 计算纯策略纳什均衡（基于当前 payoff 矩阵，运行时调用）
 */
export function findNashEquilibria(payoffMatrix) {
  if (!Array.isArray(payoffMatrix) || !payoffMatrix.length) return []
  const rows = payoffMatrix.length
  const cols = payoffMatrix[0].length
  const equilibria = []
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const cell = payoffMatrix[i][j]
      if (!cell) continue
      let p1Best = true
      for (let k = 0; k < rows; k += 1) {
        if (k !== i && payoffMatrix[k][j] && payoffMatrix[k][j].p1 > cell.p1) { p1Best = false; break }
      }
      if (!p1Best) continue
      let p2Best = true
      for (let k = 0; k < cols; k += 1) {
        if (k !== j && payoffMatrix[i][k] && payoffMatrix[i][k].p2 > cell.p2) { p2Best = false; break }
      }
      if (p1Best && p2Best) {
        equilibria.push({ row: i, col: j, p1: cell.p1, p2: cell.p2, rationale: cell.rationale })
      }
    }
  }
  return equilibria
}
