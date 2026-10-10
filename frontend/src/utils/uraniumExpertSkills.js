import { buildUraniumTimelineRows, getDisplayReport } from './uraniumDuringAdapter.js'

// 只读技能与专家页共用结果适配器，数据读取由调用方注入。
export const URANIUM_EXPERT_SKILLS = Object.freeze([
  { id: 'uranium_experiment_model', label: '读取建模与实验参数' },
  { id: 'uranium_experiment_timeline', label: '读取年度推演指标' },
  { id: 'uranium_experiment_report', label: '读取决策依据' },
])

function compact(value, depth = 0) {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.slice(0, 600)
  if (depth >= 5) return '[已省略，详见专家页面]'
  if (Array.isArray(value)) return value.slice(0, 30).map(item => compact(item, depth + 1))
  return Object.fromEntries(Object.entries(value).slice(0, 40).map(([key, item]) => [key, compact(item, depth + 1)]))
}

export async function readUraniumExpertEvidence({ experimentId, readExperiment, onSkill = () => {} }) {
  const id = String(experimentId || '').trim()
  if (!id) throw new Error('请先选择一个实验')
  const first = URANIUM_EXPERT_SKILLS[0]
  await onSkill({ ...first, status: 'running' })
  let experiment
  try {
    experiment = await readExperiment(id)
    if (!experiment || String(experiment.experiment_id) !== id) throw new Error('该实验不存在或返回的实验不匹配')
    if (experiment.status && !['completed', 'success', 'finished'].includes(experiment.status)) {
      throw new Error('实验尚未完成，请完成推演后再分析结果')
    }
    if (!experiment.result || !Object.keys(experiment.result).length) throw new Error('该实验尚无可分析的推演结果')
  } catch (error) {
    await onSkill({ ...first, status: 'error' })
    throw error
  }
  const timeline = buildUraniumTimelineRows(experiment)
  const report = getDisplayReport(experiment)
  const outputs = [
    { plan: experiment.plan || {}, scenario_context: experiment.scenario_context || {}, execution_type: experiment.execution_type },
    {
      total_years: timeline.length,
      omitted_years: Math.max(0, timeline.length - 30),
      // 不将节点、分配矩阵重复发送给模型；保留专家页使用的年度指标和事件。
      years: timeline.slice(-30).map(row => Object.fromEntries(
        Object.entries(row).filter(([key]) => !['suppliers', 'manufacturers', 'allocations'].includes(key))
      )),
      summary: experiment.summary || {},
    },
    {
      recommendations: report.recommendations || [],
      delta_summary: report.delta_summary || {},
      convergence: report.convergence || {},
      profile_adjustments: report.profile_adjustments || [],
    },
  ]
  const results = []
  for (const [index, skill] of URANIUM_EXPERT_SKILLS.entries()) {
    if (index) await onSkill({ ...skill, status: 'running' })
    const result = { skill: skill.id, label: skill.label, data: compact(outputs[index]) }
    await onSkill({ ...skill, status: 'done' })
    results.push(result)
  }
  return {
    experiment_id: id,
    name: String(experiment.name || id),
    retrieved_at: new Date().toISOString(),
    detail: { path: '/home/SCnet/experimentManager', query: { scenario: 'uranium', view: 'simulation', experiment_id: id } },
    results,
  }
}

const metric = (value, unit = '', digits = 2) => Number.isFinite(value)
  ? `${value.toLocaleString('zh-CN', { maximumFractionDigits: digits })}${unit}` : '暂无记录'
const plain = value => String(value || '').replace(/[<>&|*_`[\]#\r\n]/g, ' ')

// 当前前端阶段用确定性规则生成回答；数值只取自技能输出，便于后续替换生成器。
export function buildUraniumExpertAnswer(question, evidence) {
  const model = evidence.results[0].data
  const { years = [], summary = {}, omitted_years = 0 } = evidence.results[1].data
  const report = evidence.results[2].data
  const requestedYears = String(question).match(/\b(?:19|20)\d{2}\b/g) || []
  const matched = years.filter(row => requestedYears.includes(String(row.year)))
  const scope = requestedYears.length ? matched : years
  const last = scope.at(-1)
  const peak = scope.filter(row => Number.isFinite(row.unmet_demand_tU))
    .reduce((best, row) => !best || row.unmet_demand_tU > best.unmet_demand_tU ? row : best, null)
  const focus = /成本|价格|采购/.test(question) ? 'cost' : /库存|保供|缺口/.test(question) ? 'supply' : /风险|事件|冲突|制裁/.test(question) ? 'risk' : 'overview'
  let lead = '以下按实验概况、年度变化和执行建议梳理当前方案。'
  if (focus === 'cost') lead = '本次重点查看采购成本和价格变化，并结合库存与风险评估成本优化的代价。'
  if (focus === 'supply') lead = '本次重点查看供需缺口和库存缓冲，识别需要提前准备的年度窗口。'
  if (focus === 'risk') lead = '本次重点查看事件作用窗口及风险变化；事件同时出现不等于已证明因果关系。'
  const rows = scope.map(row => `| ${row.year} | ${metric(row.average_cost_usd_kgU)} | ${metric(row.unmet_demand_tU)} | ${metric(row.inventory_coverage_years)} | ${metric(row.average_risk_exposure, '', 3)} |`)
  const events = scope.filter(row => row.active_events?.length)
    .map(row => `- ${row.year} 年：${row.active_events.map(plain).join('；')}。`)
  const recommendations = (report.recommendations || []).map(item => typeof item === 'string'
    ? item : [item.title || item.action || item.name, item.detail || item.description || item.reason].filter(Boolean).join('：'))
    .filter(Boolean).slice(0, 4)
  const missingYears = requestedYears.filter(year => !matched.some(row => String(row.year) === year))
  return [
    `### 一、实验概况\n\n已关联「${plain(evidence.name)}」。${lead}`,
    `实验编号：${plain(evidence.experiment_id)}。推演窗口：${model.plan.start_year ?? years[0]?.year ?? '—'}–${model.plan.end_year ?? years.at(-1)?.year ?? '—'} 年；供给方 ${model.scenario_context.supplier_count ?? '—'} 个，制造方 ${model.scenario_context.manufacturer_count ?? '—'} 个。`,
    `全窗口平均采购成本：${metric(summary.avg_cost_usd_kgU, ' 美元/kgU')}；平均风险暴露：${metric(summary.avg_risk_exposure, '', 3)}。`,
    `### 二、年度指标与事件\n\n${peak ? `${peak.year} 年的需求缺口为所选窗口最高值 ${metric(peak.unmet_demand_tU, ' tU')}。` : '所选窗口尚无需求缺口指标。'}${last ? ` ${last.year} 年库存覆盖为 ${metric(last.inventory_coverage_years, ' 年')}。` : ''}`,
    missingYears.length ? `当前实验未覆盖 ${missingYears.join('、')} 年，无法据此给出这些年份的数值。` : '',
    rows.length ? ['| 年份 | 采购成本（美元/kgU） | 需求缺口（tU） | 库存覆盖（年） | 风险暴露 |', '| --- | ---: | ---: | ---: | ---: |', ...rows].join('\n') : '',
    events.length ? `窗口事件：\n\n${events.join('\n')}` : '该窗口未记录事件。',
    omitted_years ? `当前读取最近 30 年指标，更早 ${omitted_years} 年请在专家页面查看。` : '',
    `### 三、决策建议\n\n${recommendations.length ? recommendations.map(item => `- ${plain(item)}`).join('\n') : '当前实验未记录决策建议，可先结合年度指标检查供给组合、采购节奏与库存目标。'}`,
    '以上引用本次实验的建模配置、年度推演指标与决策报告。可展开下方依据核对，或进入专家页面查看供应链演化。',
  ].filter(Boolean).join('\n\n')
}
