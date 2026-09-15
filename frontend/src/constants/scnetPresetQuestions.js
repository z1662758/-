// ===== 对话首页预设问题：按「场景 × 阶段」分组 =====
// 文案与各分析页（ScenarioModelingLogic / ScenarioModelingLogic_uranium）的示例问题保持同一口径，
// 这样从首页带问题跳转后，后续拆解与推演的语境是一致的。

import { SCENARIO_VALUES } from './scnetScenario'

const URANIUM_PRESETS = {
  pre: [
    { icon: '🗺️', title: '供给匹配', text: '铀需求强度上升时，供给能力需要如何调整，才能减少缺口并保持履约稳定' },
    { icon: '📦', title: '库存与供给', text: '库存覆盖和供给保障能力同时波动时，系统会先在哪个环节出现压力' },
    { icon: '⚠️', title: '协同效益', text: '上游协同范围扩大后，协同次数上升是否真的能带来更高的履约表现' },
    { icon: '🎯', title: '方案对比', text: '在履约、成本和协同效率之间，哪类参数组合更适合当前铀网络' }
  ],
  during: [
    { icon: '📦', title: '供给分配', text: '需求突然上涨时，有限供给在各节点怎么分配才能避免局部缺口扩大' },
    { icon: '🤝', title: '节点协同', text: '上游协同范围扩大后，跨节点协同次数增加是否足以抵消运输和调度压力' },
    { icon: '🔄', title: '供给扩展', text: '高峰期临时扩产时，哪类矿山先扩更稳：高利用率矿山还是低利用率矿山' },
    { icon: '💰', title: '定价与库存', text: '报价溢价和库存同时调整时，成本改善和缺口扩大的平衡点在哪里' }
  ],
  post: [
    { icon: '📈', title: '协同效率评估', text: '复盘本轮仿真中协同网络变化，哪些链路带来了真实的履约提升' },
    { icon: '💵', title: '成本结构分析', text: '从履约完成率和系统成本反推，哪些参数导致了主要成本压力' },
    { icon: '🔍', title: '韧性复盘', text: '在供给扰动恢复阶段，哪类节点恢复慢，导致整条链路恢复被拖慢' },
    { icon: '🏆', title: '绩效对比', text: '对比多轮方案后，哪个参数组合在履约、协同次数和综合收益上最均衡' }
  ]
}

const AUTO_PRESETS = {
  pre: [
    { icon: '🗺️', title: '产能匹配', text: '市场需求强度上升时，制造总产能需要如何调整，才能减少订单积压并保持完成率稳定' },
    { icon: '📦', title: '库存与供给', text: '库存容量上限和供应保障能力同时波动时，系统会先在哪个环节出现履约压力' },
    { icon: '⚠️', title: '协作效益', text: '工厂协作范围扩大后，协作次数上升是否真的能带来更高的订单完成率' },
    { icon: '🎯', title: '方案对比', text: '在完成率、净利润和协作效率之间，哪类参数组合更适合当前供应链网络' }
  ],
  during: [
    { icon: '📦', title: '订单分配', text: '需求突然上涨时，二级订单在各工厂怎么分配才能避免某几家工厂爆仓' },
    { icon: '🤝', title: '工厂协作', text: '工厂协作范围扩大后，跨厂协作次数增加是否足以抵消运输和调度压力' },
    { icon: '🔄', title: '产能扩展', text: '高峰期临时扩产时，哪类工厂先扩更稳：高利用率工厂还是低利用率工厂' },
    { icon: '💰', title: '定价与库存', text: '销售商加价率和库存同时调整时，利润提升和订单流失的平衡点在哪里' }
  ],
  post: [
    { icon: '📈', title: '协作效率评估', text: '复盘本轮仿真中协作网络变化，哪些链路带来了真实的履约提升' },
    { icon: '💵', title: '成本结构分析', text: '从订单完成率和系统净利润反推，哪些参数导致了主要成本压力' },
    { icon: '🔍', title: '韧性复盘', text: '在供应扰动恢复阶段，哪类节点恢复慢，导致整条链路恢复被拖慢' },
    { icon: '🏆', title: '绩效对比', text: '对比多轮方案后，哪个参数组合在完成率、协作次数和净利润上最均衡' }
  ]
}

export const PRESET_QUESTIONS = Object.freeze({
  [SCENARIO_VALUES.URANIUM]: URANIUM_PRESETS,
  [SCENARIO_VALUES.SUPPLY_CHAIN]: AUTO_PRESETS
})

export const PHASE_SHORT_LABELS = Object.freeze({
  pre: '事前',
  during: '事中',
  post: '事后'
})

/**
 * 取某场景在某阶段下的预设问题。
 * mode 为 'auto'（智能识别）时，从三个阶段各取前若干条混排，并带上 phase 字段，
 * 供首页点击后顺带切到对应阶段。
 */
export function getPresetQuestions(scenario, mode, perPhaseInAuto = 2) {
  const group = PRESET_QUESTIONS[scenario] || PRESET_QUESTIONS[SCENARIO_VALUES.URANIUM]
  if (mode === 'pre' || mode === 'during' || mode === 'post') {
    return (group[mode] || []).map(q => ({ ...q, phase: mode }))
  }
  return ['pre', 'during', 'post'].flatMap(phase =>
    (group[phase] || []).slice(0, perPhaseInAuto).map(q => ({ ...q, phase }))
  )
}
