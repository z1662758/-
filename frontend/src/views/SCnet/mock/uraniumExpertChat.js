import { readUraniumExpertEvidence, buildUraniumExpertAnswer } from '../../../utils/uraniumExpertSkills.js'
import { buildUraniumRequirementAnswer, buildUraniumScenarioPlan } from './uraniumScenarioPlan.js'

export function streamUraniumRequirementChat({ userGoal, draft, sessionId, onPlan, onEvent, delay = 35 }) {
  let closed = false
  let timer
  let release
  const done = (async () => {
    // 让调用方先登记当前流句柄，再开始发送事件。
    await Promise.resolve()
    if (closed) return
    const plan = { sessionId, userGoal, plan: buildUraniumScenarioPlan(userGoal, draft) }
    onEvent({ type: 'status', status: '正在整理需求与建模安排…' })
    const answer = buildUraniumRequirementAnswer(userGoal, draft)
    for (let offset = 0; offset < answer.length && !closed; offset += 40) {
      onEvent({ type: 'text_delta', content: answer.slice(offset, offset + 40) })
      await new Promise(resolve => { release = resolve; timer = setTimeout(resolve, delay) })
    }
    if (closed) return
    onPlan(plan)
    for (const section of ['一', '二', '三']) onEvent({ type: 'section', section })
    onEvent({ type: 'complete' })
  })()
  return { done, close() { closed = true; clearTimeout(timer); release?.() } }
}

// 与 Agent SSE 共用事件协议，界面无需感知数据实现。
export function streamUraniumExpertChat({ experimentId, question, readExperiment, onEvent, onEvidence, delay = 120 }) {
  let closed = false
  let timer = null
  let release = null
  const pause = () => new Promise(resolve => {
    release = resolve
    timer = setTimeout(resolve, delay)
  })
  const emit = event => { if (!closed) onEvent(event) }
  const done = (async () => {
    try {
      const evidence = await readUraniumExpertEvidence({
        experimentId, readExperiment,
        onSkill: async skill => {
          if (closed) throw new Error('已中止')
          emit({ type: skill.status === 'running' ? 'tool_call' : 'tool_result', call_id: skill.id, tool: skill.id, status: skill.status })
          await pause()
          if (closed) throw new Error('已中止')
        },
      })
      if (closed) return
      onEvidence(evidence)
      const answer = buildUraniumExpertAnswer(question, evidence)
      emit({ type: 'phase', phase: 'output' })
      for (const section of ['一', '二', '三']) emit({ type: 'section', section })
      for (let offset = 0; offset < answer.length && !closed; offset += 64) {
        emit({ type: 'text_delta', content: answer.slice(offset, offset + 64) })
        await pause()
      }
      emit({ type: 'complete' })
    } catch (error) {
      emit({ type: 'error', message: error.message || '实验结果读取失败' })
    }
  })()
  return { done, close() { closed = true; clearTimeout(timer); release?.() } }
}
