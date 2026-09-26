import test from 'node:test'
import assert from 'node:assert/strict'
import { formatUraniumEvent, uraniumAnnualState } from '../src/utils/uraniumScene.js'
import { buildUraniumVulnerability, uraniumVulnerabilityLevel } from '../src/utils/uraniumVulnerability.js'
import { applyUraniumDecisionCopy } from '../src/views/SCnet/adapters/uraniumDecisionCopy.js'
import { TREE_DATA, BASELINE_BRANCH_DATA } from '../src/views/SCnet/mock/decisionTreeMock.js'
import { createLaunchedUraniumDemoExperiment } from '../src/views/SCnet/mock/uraniumDemoLab.js'
import { validateUraniumModelingDraft } from '../src/utils/uraniumModeling.js'
import { formatUraniumMetricValue } from '../src/utils/uraniumDuringAdapter.js'

test('风险暴露保留 0–1 数值，供应份额仍按百分比展示', () => {
  assert.equal(formatUraniumMetricValue('avg_risk_exposure', .195), '0.195')
  assert.equal(formatUraniumMetricValue('average_risk_exposure', 0), '0.000')
  assert.equal(formatUraniumMetricValue('avg_risk_exposure', null), '-')
  assert.equal(formatUraniumMetricValue('avg_risk_exposure', ''), '-')
  assert.equal(formatUraniumMetricValue('dominant_supplier_share', .195), '19.5%')
})

test('年度状态按缺口比例和库存覆盖判断，缺失值不当作零库存', () => {
  assert.equal(uraniumAnnualState({ risk: .1, unmet: 200, demand: 10000, inventory: 3 }).tone, 'warning')
  assert.equal(uraniumAnnualState({ risk: .1, unmet: 200, demand: 1000, inventory: 3 }).tone, 'danger')
  assert.equal(uraniumAnnualState({ risk: .1, inventory: 2.2 }).tone, 'danger')
  assert.equal(uraniumAnnualState({ risk: .1, inventory: 2.7 }).tone, 'warning')
  assert.equal(uraniumAnnualState({ risk: .1, inventory: 3 }).tone, 'success')
  assert.equal(uraniumAnnualState({}).label, '待评估')
})

test('情景事件保留含义，不把预测项目或冲突日期写成确定事实', () => {
  assert.match(formatUraniumEvent('美国禁俄铀豁免到期;需求增加'), /情景/)
  assert.doesNotMatch(formatUraniumEvent('美国禁俄铀豁免到期;需求增加'), /到期/)
  assert.match(formatUraniumEvent({ name: 'Dasa(尼日尔)投产~1850tU/年' }), /情景/)
  assert.equal(formatUraniumEvent('自定义年度事件'), '自定义年度事件')
})

test('铀对策文案覆盖三个情景各阶段，保留评估值且不污染共享源树', () => {
  const original = JSON.stringify({ TREE_DATA, BASELINE_BRANCH_DATA })
  for (const scenario of Object.keys(TREE_DATA)) {
    for (const time of [0, 1, 2]) {
      const controlled = applyUraniumDecisionCopy(TREE_DATA[scenario][time], scenario, time)
      const baseline = applyUraniumDecisionCopy(BASELINE_BRANCH_DATA[scenario][time], scenario, time, true)
      const forbidden = /促销|KA|SKU|客服|毛利|华东订单|PPO/
      for (const branch of [controlled, baseline]) {
        assert.doesNotMatch(JSON.stringify(branch), forbidden)
        assert.ok(branch.children.every(node => node.action && node.desc))
      }
      assert.deepEqual(controlled.children.map(node => node.children.map(leaf => [leaf.prob, leaf.outcome.score])),
        TREE_DATA[scenario][time].children.map(node => node.children.map(leaf => [leaf.prob, leaf.outcome.score])))
    }
  }
  assert.equal(JSON.stringify({ TREE_DATA, BASELINE_BRANCH_DATA }), original)
})

test('辅助脆弱性指标保持分数单位，移除无依据的精确恢复天数', () => {
  const metrics = buildUraniumVulnerability({ avg_risk_exposure: .2, final_inventory_coverage_years: 1.2 })
  assert.ok(metrics.every(row => row.score >= 0 && row.score <= 100))
  assert.equal(metrics.some(row => row.label === '恢复时长'), false)
  assert.ok(['success', 'warning', 'danger'].includes(uraniumVulnerabilityLevel(metrics).type))
})

test('实验摘要的成本、风险按采购量加权，库存与年度覆盖一致', () => {
  const { experiment } = createLaunchedUraniumDemoExperiment()
  const rows = experiment.result.timeline
  const total = rows.reduce((sum, row) => sum + row.total_procured_tU, 0)
  const expectedCost = rows.reduce((sum, row) => sum + row.average_cost_usd_kgU * row.total_procured_tU, 0) / total
  assert.ok(Math.abs(experiment.summary.avg_cost_usd_kgU - expectedCost) < .01)
  const latest = rows.at(-1)
  assert.ok(Math.abs(experiment.summary.final_total_inventory_tU - latest.total_demand_tU * latest.inventory_coverage_years) < .01)
})

test('事件强度倍率与后端定义的 0.1–2 范围一致', () => {
  const draft = { start_year: 2024, end_year: 2028, optimization_iterations: 1 }
  for (const severity of [.1, 1, 2]) assert.equal(validateUraniumModelingDraft({ ...draft, event_severity_multiplier: severity }), '')
  for (const severity of [0, 2.1, 3]) assert.notEqual(validateUraniumModelingDraft({ ...draft, event_severity_multiplier: severity }), '')
})
