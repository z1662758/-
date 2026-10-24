import request from '@/utils/request'

/** Discuss the pre-analysis scenario or draft a user-confirmable outline. */
export function discussPreScenario(payload) {
  return request({ url: '/scenario/expert/scenario-assistant', method: 'post', data: payload, timeout: 55000 })
}

/**
 * 保存场景设定并创建场景任务(不启动正式分析)。
 * → data: { session_id, scenario, scenario_spec, plan, workflow }
 */
export function startExpertWorkflow(payload) {
  return request({
    url: '/scenario/expert/workflow',
    method: 'post',
    data: payload,
  })
}

/** 导入已发布的完整设定案例，返回可逐页浏览的任务。 */
export function importExpertExampleWorkflow() {
  return request({ url: '/scenario/expert/workflow/example', method: 'post' })
}

/**
 * 读取专家工作流状态、分析方案与已完成阶段产物;不会触发任何计算。
 * → data: { session_id, scenario, scenario_spec, requirement, plan, workflow, plan_generation }
 * config 可传 { signal },用于组件卸载或切换方案时中止请求。
 */
export function getExpertWorkflow(sessionId, config = {}) {
  return request({
    url: `/scenario/expert/workflow/${encodeURIComponent(sessionId)}`,
    method: 'get',
    ...config,
  })
}

/**
 * 重跑失败的阶段,并从该阶段起把后续步骤重新跑完。
 * → 202 + data { session_id, stage, retried: true }
 */
export function retryExpertStage(sessionId, stage, payload = {}, config = {}) {
  return request({
    url: `/scenario/expert/workflow/${encodeURIComponent(sessionId)}/stage/${encodeURIComponent(stage)}/retry`,
    method: 'post',
    data: payload,
    ...config,
  })
}
