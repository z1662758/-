/**
 * 反事实实验报告交接（反事实引擎 → EXreport）
 *
 * 反事实引擎产出"结论 + 分布 + 配对效应"后，按后端实验 id 存入 localStorage；
 * 复盘报告（EXreport）按同一个 id 读取，作为"结果验证 + 证据回灌"的落地载体。
 *
 * 依据：薛霄等《计算实验方法的溯源、现状与展望》(自动化学报, 2023, 49(2): 246−271)
 * —— 论文强调"实验结果是一个分布"，且实验验证分结构/数据/结果三层。
 * 这里只搬运前端已算好的真实统计量，不新增任何推断。
 */
export const COUNTERFACTUAL_REPORT_PREFIX = 'scnet_counterfactual_report'

export const counterfactualReportKey = (experimentId) =>
  `${COUNTERFACTUAL_REPORT_PREFIX}:${String(experimentId || '').trim()}`

/** 组装要交接给复盘报告的紧凑载荷。 */
export const buildCounterfactualReportPayload = ({
  experimentId,
  scene,
  seed,
  seedControlled,
  result,
  conclusion,
  interventionDiff,
  worlds
}) => ({
  experimentId: String(experimentId || ''),
  scene: scene || null,
  savedAt: new Date().toISOString(),
  seed: seed ?? null,
  // null = 待后端回执；true/false = 后端是否回执了同一个 seed
  seedControlled: seedControlled ?? null,
  repeatCount: result?.repeatCount ?? 0,
  conclusion: conclusion || '',
  effect: result?.effect || null,
  distribution: result?.distribution || null,
  factualDistribution: result?.factualDistribution || null,
  completionSamples: Array.isArray(result?.completionSamples) ? result.completionSamples : [],
  factualSamples: Array.isArray(result?.factualSamples) ? result.factualSamples : [],
  interventionDiff: Array.isArray(interventionDiff) ? interventionDiff : [],
  settledCounts: {
    factual: worlds?.factual?.completedCount ?? 0,
    counterfactual: worlds?.counterfactual?.completedCount ?? 0
  }
})

export const saveCounterfactualReport = (experimentId, payload) => {
  const id = String(experimentId || '').trim()
  if (!id || !payload) return false
  try {
    localStorage.setItem(counterfactualReportKey(id), JSON.stringify(payload))
    return true
  } catch (error) {
    console.warn('[counterfactualReport] 保存失败:', error?.message)
    return false
  }
}

/** 按实验 id 读取；不做"最新一条"兜底，避免跨场景/跨实验串数据。 */
export const loadCounterfactualReport = (experimentId) => {
  const id = String(experimentId || '').trim()
  if (!id) return null
  try {
    const raw = localStorage.getItem(counterfactualReportKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (error) {
    console.warn('[counterfactualReport] 读取失败:', error?.message)
    return null
  }
}
