// ===== 对话首页预设问题：按「场景 × 阶段」分组 =====
// 文案与各分析页（ScenarioModelingLogic / ScenarioModelingLogic_uranium）的示例问题保持同一口径，
// 这样从首页带问题跳转后，后续拆解与推演的语境是一致的。

import { SCENARIO_VALUES } from './scnetScenario'

const URANIUM_PRESETS = {
  pre: [
    { icon: '🗺️', title: '需求匹配', tag: '供需预测', text: '下游需求突增时，上游供应产能如何动态匹配，避免断料？' },
    { icon: '📦', title: '库存防线', tag: '脆弱性', text: '库存与运力同时受限时，哪个制造基地最先面临断料风险？' },
    { icon: '⚠️', title: '协同保障', tag: '长协履约', text: '扩大与海外主供矿山的长协协同，能否显著提升保供稳定性？' },
    { icon: '🎯', title: '策略对比', tag: '多目标', text: '在采购成本、保供达成率与安全库存之间，如何寻求最佳平衡？' }
  ],
  during: [
    { icon: '⚡', title: '需求突增保供', tag: '重大工程', tip: '新增机组（如华龙一号）集中投产提前装料，单机首炉需数百吨天然铀', text: '下游核电机组需求突增 20%，国内储备库与海外长协如何协同保供？' },
    { icon: '🧪', title: '海外矿山减产', tag: '供应受限', tip: '主供矿区因原料短缺或不可抗力导致产能下降 15%', text: '海外主力矿山突发减产 15%，如何调用战略储备平抑缺口？' },
    { icon: '🚂', title: '陆运口岸受阻', tag: '物流瓶颈', tip: '陆运铁路口岸运力达上限或延误，需海运航线紧急分流', text: '边境铁路口岸运力受阻，远洋海运航线如何分流替代？' },
    { icon: '⚖️', title: '现货价格暴涨', tag: '成本抗险', tip: '国际原料现货价格短时间大幅上涨，如何在成本与库存安全间权衡', text: '国际现货原料价格大幅上涨，如何在采购成本与安全库存间平衡？' }
  ],
  post: [
    { icon: '📈', title: '协同成效复盘', tag: '成效复盘', text: '复盘本轮仿真调度：哪些跨通道分流链路带来了实际改善？' },
    { icon: '💵', title: '成本归因分析', tag: '成本透视', text: '从最终保供完成率与预算反推，主要成本压力来自哪里？' },
    { icon: '🔍', title: '供应链韧性评估', tag: '韧性归因', text: '遭遇多重供应扰动后，哪些节点恢复最慢，原因是什么？' },
    { icon: '🏆', title: '策略方案对比', tag: '方案择优', text: '对比多轮推演方案，哪个策略在保供安全与综合成本上最均衡？' }
  ]
}

const AUTO_PRESETS = {
  pre: [
    { icon: '🗺️', title: '产能匹配', tag: '供需匹配', text: '市场需求上升时，制造总产能如何合理配置保障交付？' },
    { icon: '📦', title: '库存预警', tag: '缺料风险', text: '库存容量与供应波动时，哪类核心零部件最易短缺？' },
    { icon: '⚠️', title: '协同效益', tag: '跨厂协作', text: '工厂协作范围扩大后，订单准时完成率能否得到有效提升？' },
    { icon: '🎯', title: '策略对比', tag: '方案寻优', text: '在交付率、净利润与协作效率之间，如何选择最优策略组合？' }
  ],
  during: [
    { icon: '📦', title: '突发订单分配', tag: '负荷均衡', text: '急单暴增时，各工厂如何动态分配避免个别产线爆仓？' },
    { icon: '🤝', title: '跨厂协同调度', tag: '应急分流', text: '出现局部运输延误时，跨厂协同生产能否抵消延误冲击？' },
    { icon: '🔄', title: '产线临时扩产', tag: '弹性调度', text: '生产高峰期临时扩产，优先扩高负荷还是低负荷工厂？' },
    { icon: '💰', title: '利润与库存平衡', tag: '资金占用', text: '调整产品加价率与安全库存，最佳平衡点在哪里？' }
  ],
  post: [
    { icon: '📈', title: '交付效果复盘', tag: '效果分析', text: '复盘本轮协同调度：哪些生产链路带来了真实的效率提升？' },
    { icon: '💵', title: '成本动因分析', tag: '成本分解', text: '从订单交付率反推，核心成本压力由哪些环节引起？' },
    { icon: '🔍', title: '交付瓶颈复盘', tag: '瓶颈定位', text: '在供应扰动恢复阶段，哪类节点拖慢了整体进度？' },
    { icon: '🏆', title: '综合绩效对比', tag: '方案择优', text: '对比多轮方案，哪类参数组合在交付率与净利润上最均衡？' }
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
