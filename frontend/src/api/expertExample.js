/**
 * 专家模式统一案例包接口
 *
 * 案例包由 scripts/build_expert_example_bundle.py 真实跑一遍默认案例后发布,
 * 普通用户只读,不会重新调用大模型、不会重新运行分析、不会覆盖任何用户会话。
 *
 *  GET /scenario/expert/example?example_id=
 *    → data: { exampleId, version, label, scenario, sourceSessionId,
 *              generatedAt, publishedAt, planVersion, planReady,
 *              stages: { <stage>: { available, status, completedAt } } }
 *
 *  GET /scenario/expert/example/artifacts/:stage?example_id=
 *    → data: <artifact 信封> —— 结构与用户会话里的
 *            expert_workflow.artifacts.<stage> 完全一致:
 *      { sessionId, stage, status, startedAt, completedAt, inputPlanVersion,
 *        dataSourcesUsed[], modelsUsed[], result, error }
 *      judgment 的 result 为 { global: {nodes,routes,events,metrics,legacy}, focused: {...} }
 */
import request from '@/utils/request'

export function getExampleMeta(params = {}, config = {}) {
  return request({
    url: '/scenario/expert/example',
    method: 'get',
    params,
    ...config,
  })
}

export function getExampleStageArtifact(stage, params = {}, config = {}) {
  return request({
    url: `/scenario/expert/example/artifacts/${encodeURIComponent(stage)}`,
    method: 'get',
    params,
    ...config,
  })
}
