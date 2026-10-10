/**
 * 阶段意图判定：智能识别(auto)模式下，判断一条问题该走「事前研判」还是「事后实验闭环」。
 *
 * 背景：此前 auto 模式一律按事前(pre)下发。用户问「从履约完成率和系统成本反推，哪些参数
 * 导致了主要成本压力」这类归因问题时，后端拿的是事前研判的提示词与工具集，答案落在
 * 风险等级 / 关键节点 / 运输方式的路线上，而用户要的是「参数 → 指标」；落地页也只能给
 * 态势研判，事后闭环的第一步（确认实验目的 → 设计实验方案）永远不会出现。
 *
 * 判定口径：纯关键词打分，可解释、无网络依赖、可单测。
 *   1. 事后强信号（3 分）：反推 / 归因 / 根因 / 复盘 / 事后 / 反事实 / 传导机制 … —— 命中即判事后
 *   2. 事后弱信号（2 分）：导致 / 为什么 / 哪些参数 / 主导因素 / 影响最大 …
 *   3. 指标变化词（1 分）：下降 / 上升 / 波动 / 积压 / 缺口 … —— 单独不构成事后
 *   4. 事前信号（1 分）：风险 / 预警 / 预测 / 趋势 / 拐点 / 态势 …
 *   5. 事中信号（命中即抑制）：应急 / 处置 / 调度 / 实时 / 如何应对 … —— 事中不是自动判出来的，
 *      用户没显式选「事中决策」就说明这不是一次处置请求；这里的词只用来防止误判成事后。
 *
 * 结论：命中强信号 → post；否则 弱信号 + 变化词 >= 3 且事后分 > 事前分 且 无事中信号 → post；
 * 其余 → pre。
 *
 * 注意：用户在界面上显式选的模式(事前/事中/事后)优先于本判定，
 * 调用点见 ChatHome.vue 的 currentAgentPhase()。
 */

// 命中即判「事后」：这些词本身就是回溯/反事实语境，不参与打分
const POST_FORCE = [
  '反推', '倒推', '归因', '根因', '复盘', '事后', '反事实', '教训',
  '敏感性', '参数敏感', '因果推断', '因果分析', '传导路径', '传导机制', '机制分析'
]

// 事后弱信号：单命中 2 分，需要组合才够阈值
const POST_WEAK = [
  '导致', '为什么', '为何', '哪些参数', '哪几个参数', '哪些变量', '主导因素', '关键因素',
  '贡献度', '影响最大', '影响更大', '影响程度', '影响因素', '追溯', '回顾', '总结',
  '干预效果', '对比实验', '控制变量', '验证假设', '是否真的'
]

// 指标变化词：单命中 1 分，配合弱信号才成立
const POST_VARIATION = [
  '下降', '上升', '波动', '变化', '差异', '偏差', '偏低', '偏高', '积压', '缺口', '成本压力'
]

// 事前信号：这些词说明问题面向未来/态势，判事前
const PRE_MARKERS = [
  '风险', '预警', '预测', '趋势', '拐点', '态势', '研判', '潜在', '隐患', '展望',
  '走势', '资源分布', '供需平衡', '网络演化', '演化规律', '应急储备', '供应链安全'
]

// 事中信号：命中即压制「事后」判定（事中要用户显式进入，不由关键词决定）
const DURING_MARKERS = [
  '应急', '处置', '调度', '实时', '突发', '怎么办', '如何应对', '预案',
  '紧急', '抢修', '正在', '马上'
]

const countHits = (text, words) => words.reduce((n, w) => (text.includes(w) ? n + 1 : n), 0)
const firstHit = (text, words) => words.find((w) => text.includes(w)) || ''

/** 打分明细：便于排查「为什么这条被判成事后」 */
export function scorePhaseIntent(text) {
  const raw = String(text ?? '')
  const forcePost = firstHit(raw, POST_FORCE)
  const weak = countHits(raw, POST_WEAK)
  const variation = countHits(raw, POST_VARIATION)
  const pre = countHits(raw, PRE_MARKERS)
  const during = countHits(raw, DURING_MARKERS)
  return {
    forcePost,
    weak,
    variation,
    pre,
    during,
    postScore: weak * 2 + variation * 1
  }
}

/**
 * auto 模式下按问题意图判阶段。
 * 只会返回 'pre' 或 'post' —— 'during'（事中）必须由用户显式选择，
 * 因为事中入口会直接把用户带去想定生成页，不该由关键词替他做决定。
 * @param {string} text 用户这次的问题
 * @returns {'pre'|'post'}
 */
export function inferAutoPhase(text) {
  const s = scorePhaseIntent(text)
  if (s.forcePost) return 'post'
  if (s.during > 0) return 'pre'
  if (s.postScore >= 3 && s.postScore > s.pre) return 'post'
  return 'pre'
}

export default inferAutoPhase
