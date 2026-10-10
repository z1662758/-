/**
 * 专家模式「方案确认」接口
 *
 * 后端契约(蓝图 scenario_session_bp, url_prefix = /api/scenario,
 * axios baseURL = /api,所以下面的 url 都不带 /api 前缀):
 *
 *  GET    /scenario/expert/catalog?session_id=&scenario=
 *      → data: { scenario, generated_at, data_sources[], models[], workflow_steps[], outputs[] }
 *        data_sources[]: { resourceId, name, type, typeLabel, coverage,
 *                          updateStatus, recordCount, defaultPurpose, required? }
 *        models[]:       { modelId, name, capability, category, categoryLabel,
 *                          status, inputs[], outputs[], description, runtimeEffective }
 *        workflow_steps[]: { id, name, description, dependencies[] }
 *        outputs[]:      { id, name }
 *
 *  POST   /scenario/expert/workflow/:sid/plan/generate
 *      body { provider_id?, model_id?, request_id?, force? }
 *      → 202 + data { session_id, started:true, request_id, plan_version }
 *      → 200 + data { session_id, started:false, reason }   已有方案/已有生成任务
 *      只负责在后台起任务,不在这个请求上等大模型;前端靠轮询拿结果。
 *
 *  PUT    /scenario/expert/workflow/:sid/plan
 *      body { content: <方案结构化内容> }  → data: <plan 记录>
 *
 *  POST   /scenario/expert/workflow/:sid/plan/example
 *      → data: <plan 记录>(plan_mode = 'example')
 *
 *  POST   /scenario/expert/workflow/:sid/plan/restore
 *      → data: <plan 记录>(content 恢复为 model_content)
 *
 *  POST   /scenario/expert/workflow/:sid/plan/confirm
 *      body { content?, provider_id?, model_id? }
 *      → data: { session_id, started, plan, workflow }
 *
 * GET /scenario/expert/workflow/:sid 额外返回:
 *   plan_generation: { in_flight: boolean, llm_timeout_seconds: number }
 *   —— 后端在读取时会把卡死的 generating 收敛成 timeout,前端据此一定能拿到终态。
 *
 * plan 记录字段:
 *   plan_id, task_id, plan_version, plan_mode('none'|'real'|'example'),
 *   generation_status('idle'|'generating'|'draft'|'failed'|'timeout'|'superseded'),
 *   analysis_status('pending'|'confirmed'|'running'|'completed'|'failed'),
 *   content, model_content, generation_request_id, error,
 *   created_at, updated_at, confirmed_at, saved_at, revisions[]
 *
 * 所有接口都接受可选的 axios 配置(用于传 AbortController 的 signal)。
 */
import request from '@/utils/request'

export function getExpertCatalog(params = {}, config = {}) {
  return request({
    url: '/scenario/expert/catalog',
    method: 'get',
    params,
    ...config,
  })
}

export function generateExpertPlan(sessionId, payload = {}, config = {}) {
  return request({
    url: `/scenario/expert/workflow/${encodeURIComponent(sessionId)}/plan/generate`,
    method: 'post',
    data: payload,
    ...config,
  })
}

export function saveExpertPlan(sessionId, content, config = {}) {
  return request({
    url: `/scenario/expert/workflow/${encodeURIComponent(sessionId)}/plan`,
    method: 'put',
    data: { content },
    ...config,
  })
}

export function loadExpertPlanExample(sessionId, config = {}) {
  return request({
    url: `/scenario/expert/workflow/${encodeURIComponent(sessionId)}/plan/example`,
    method: 'post',
    ...config,
  })
}

export function restoreExpertPlan(sessionId, config = {}) {
  return request({
    url: `/scenario/expert/workflow/${encodeURIComponent(sessionId)}/plan/restore`,
    method: 'post',
    ...config,
  })
}

export function confirmExpertPlan(sessionId, payload = {}, config = {}) {
  return request({
    url: `/scenario/expert/workflow/${encodeURIComponent(sessionId)}/plan/confirm`,
    method: 'post',
    data: payload,
    ...config,
  })
}

/* ---------- 历史方案 ---------- */

/**
 * 历史方案列表:只含真实生成过、且已落库内容的专家方案,按更新时间倒序。
 * params: { limit?, exclude_session_id? }
 * → data: { plans: [{ session_id, task_id, plan_id, plan_version, plan_mode,
 *                     generation_status, analysis_status, scenario, question, object,
 *                     regions[], time_range, question_count, resource_count, model_count,
 *                     created_at, updated_at, confirmed_at }], count }
 */
export function listExpertPlans(params = {}, config = {}) {
  return request({
    url: '/scenario/expert/plans',
    method: 'get',
    params,
    ...config,
  })
}

/**
 * 读取一条历史方案的完整内容(只读查看)。
 * → data: { session_id, scenario, task_id, plan_id, plan_version,
 *           generation_status, analysis_status, created_at, updated_at, content }
 */
export function getHistoryPlan(sourceSessionId, config = {}) {
  return request({
    url: `/scenario/expert/plans/${encodeURIComponent(sourceSessionId)}`,
    method: 'get',
    ...config,
  })
}

/**
 * 把一条历史方案载入当前会话,成为可继续编辑的草稿;不启动正式分析。
 * → data: { session_id, source, plan }
 */
export function importExpertPlan(sessionId, sourceSessionId, config = {}) {
  return request({
    url: `/scenario/expert/workflow/${encodeURIComponent(sessionId)}/plan/import`,
    method: 'post',
    data: { source_session_id: sourceSessionId },
    ...config,
  })
}

/**
 * 删除一条历史方案(连同它的会话文件),不可恢复。
 * → data: { session_id, task_id, deleted: true }
 */
export function deleteExpertPlan(sourceSessionId, config = {}) {
  return request({
    url: `/scenario/expert/plans/${encodeURIComponent(sourceSessionId)}`,
    method: 'delete',
    ...config,
  })
}
