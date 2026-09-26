import test from 'node:test'
import assert from 'node:assert/strict'
import { createLaunchedUraniumDemoExperiment } from '../src/views/SCnet/mock/uraniumDemoLab.js'
import { readUraniumExpertEvidence, buildUraniumExpertAnswer } from '../src/utils/uraniumExpertSkills.js'
import { validateUraniumModelingDraft } from '../src/utils/uraniumModeling.js'
import { streamUraniumExpertChat, streamUraniumRequirementChat } from '../src/views/SCnet/mock/uraniumExpertChat.js'

const makeExperiment = (options = {}) => createLaunchedUraniumDemoExperiment(options).experiment
const read = experiment => readUraniumExpertEvidence({ experimentId: experiment.experiment_id, readExperiment: async () => experiment })

test('建模窗口、事件强度与迭代次数进入同一份实验结果', () => {
  const base = makeExperiment({ optimizationIterations: 4, draft: { start_year: 2025, end_year: 2027, event_severity_multiplier: 1 } })
  const stressed = makeExperiment({ optimizationIterations: 4, draft: { start_year: 2025, end_year: 2027, event_severity_multiplier: 2 } })
  assert.deepEqual(base.result.timeline.map(row => row.year), [2025, 2026, 2027])
  assert.equal(base.plan.start_year, 2025)
  assert.equal(base.result.history.length, 5)
  assert.equal(base.result.history.at(-1).iteration, 4)
  assert.ok(stressed.summary.max_unmet_demand_tU > base.summary.max_unmet_demand_tU)
  assert.ok(stressed.summary.avg_risk_exposure > base.summary.avg_risk_exposure)
})

test('证据与专家实验同源，回答引用所选年度并保留单位', async () => {
  const experiment = makeExperiment()
  const evidence = await read(experiment)
  assert.equal(evidence.experiment_id, experiment.experiment_id)
  assert.deepEqual(evidence.results[1].data.summary, experiment.summary)
  assert.equal(evidence.results[1].data.years[0].average_cost_usd_kgU, experiment.result.timeline[0].average_cost_usd_kgU)
  const answer = buildUraniumExpertAnswer('分析 2026 年采购成本', evidence)
  assert.match(answer, /\| 2026 \|/)
  assert.doesNotMatch(answer, /\| 2024 \|/)
  assert.match(answer, /美元\/kgU/)
  assert.match(buildUraniumExpertAnswer('分析 2030 年', evidence), /未覆盖 2030 年/)
})

test('不将缺失指标转换为零，不以其他实验替换失效 ID', async () => {
  const experiment = makeExperiment()
  experiment.result.timeline[0].unmet_demand_tU = null
  const evidence = await read(experiment)
  assert.equal(evidence.results[1].data.years[0].unmet_demand_tU, null)
  await assert.rejects(readUraniumExpertEvidence({ experimentId: 'missing', readExperiment: async () => experiment }), /不匹配/)
  await assert.rejects(read({ ...experiment, status: 'running' }), /尚未完成/)
})

test('中止读取后不生成回答，也不串入下一轮', async () => {
  const events = []
  let evidenceCount = 0
  const experiment = makeExperiment()
  const stream = streamUraniumExpertChat({
    experimentId: experiment.experiment_id, question: '风险如何', delay: 1,
    readExperiment: async () => experiment,
    onEvent: event => events.push(event), onEvidence: () => evidenceCount++,
  })
  stream.close()
  await stream.done
  assert.equal(evidenceCount, 0)
  assert.equal(events.some(event => ['complete', 'text_delta'].includes(event.type)), false)
})

test('流式结果按技能读取、文本输出、完成的顺序产生', async () => {
  const experiment = makeExperiment()
  const events = []
  let evidence
  const stream = streamUraniumExpertChat({
    experimentId: experiment.experiment_id, question: '库存是否充足', delay: 0,
    readExperiment: async () => experiment,
    onEvent: event => events.push(event), onEvidence: value => { evidence = value },
  })
  await stream.done
  assert.equal(events.filter(event => event.type === 'tool_result').length, 3)
  assert.equal(events.at(-1).type, 'complete')
  assert.equal(events.filter(event => event.type === 'text_delta').map(event => event.content).join(''), buildUraniumExpertAnswer('库存是否充足', evidence))
})

test('拒绝空年份、倒置时间窗口与非法迭代次数', () => {
  const draft = { start_year: 2024, end_year: 2028, optimization_iterations: 2, event_severity_multiplier: 1 }
  assert.equal(validateUraniumModelingDraft(draft, 50), '')
  for (const patch of [{ start_year: null }, { end_year: 2023 }, { optimization_iterations: 0 }, { optimization_iterations: 1.5 }, { event_severity_multiplier: null }]) {
    assert.notEqual(validateUraniumModelingDraft({ ...draft, ...patch }, 50), '')
  }
})

test('新需求先生成可阅读的回答，完整输出后才提供建模上下文', async () => {
  const events = []
  let plan
  const stream = streamUraniumRequirementChat({
    userGoal: '优先保障核电需求\n补充要求：控制采购成本',
    sessionId: 'during-session-test', draft: { start_year: 2025, end_year: 2027, optimization_iterations: 3 }, delay: 0,
    onPlan: value => { plan = value; events.push({ type: 'plan_ready' }) },
    onEvent: event => events.push(event),
  })
  await stream.done
  const answer = events.filter(event => event.type === 'text_delta').map(event => event.content).join('')
  assert.match(answer, /需求理解/)
  assert.match(answer, /控制采购成本/)
  assert.match(answer, /2025–2027/)
  assert.match(answer, /点击下方「查看建模设定」/)
  assert.equal(plan.sessionId, 'during-session-test')
  assert.ok(events.findIndex(event => event.type === 'plan_ready') > events.findLastIndex(event => event.type === 'text_delta'))
  assert.equal(events.at(-1).type, 'complete')
})

test('需求分析中止后不留下可进入建模的半成品', async () => {
  const events = []
  const stream = streamUraniumRequirementChat({
    userGoal: '分析库存', sessionId: 'during-session-cancel', delay: 0,
    onPlan: () => events.push({ type: 'plan_ready' }), onEvent: event => events.push(event),
  })
  stream.close()
  await stream.done
  assert.deepEqual(events, [])
})
