/**
 * SCnet API 响应字段归一化器
 *
 * 背景:
 * 新 v1 端点 `/api/v1/experiment-design/agents` 与 legacy `/SCnet/getAgents` 的响应字段
 * 在历史演进中并不一致。后端在 backend/api/v1/experiment_design.py 中已把顶层字段平铺
 * (兼容老 shape),前端这里再加一层兜底,保证不论命中哪个端点,业务代码看到的字段集合
 * 都是一致的。
 *
 * 输入:已经 unwrapApiData 之后的 payload(即 envelope 内部的 `data` 字段)。
 * 输出:扁平化、字段名一致的对象。
 *
 * 字段优先级(从高到低):
 *   - 顶层平铺值                 (`data.agents`)
 *   - v1 嵌套值                  (`data.agent_design.agents`)
 *   - 缺省                        (`[]` / `null` / `undefined`)
 */

const EMPTY_DESIGN = {}

/**
 * @typedef {object} NormalizedAgentDesign
 * @property {Array}  agents             — Agent 配置列表
 * @property {Array}  attribute_explain  — Agent 属性解释
 * @property {Array|object} relationship_net — Agent 协作关系
 * @property {?string} session_id
 * @property {?string} experiment_id
 * @property {?object} format_check       — `{ok, reason}`
 * @property {?object|string} agent_observation — ADObserver 的总体评估
 * @property {?string} phase              — `pre|during|post`
 * @property {?object} parameter_catalog
 */

/**
 * 归一化 Agent 设计响应(setAgents / getSupplyChainAgents 共用)。
 *
 * @param {object|null|undefined} data
 * @returns {NormalizedAgentDesign}
 */
export function normalizeAgentDesignResponse(data) {
  const src = data || EMPTY_DESIGN
  const design = src.agent_design || EMPTY_DESIGN

  return {
    agents: pickArray(src.agents, design.agents),
    attribute_explain: pickArray(src.attribute_explain, design.attribute_explain),
    relationship_net: src.relationship_net ?? design.relationship_net ?? [],
    session_id: src.session_id ?? null,
    experiment_id: src.experiment_id ?? null,
    format_check: src.format_check ?? null,
    agent_observation: src.agent_observation ?? null,
    phase: src.phase ?? null,
    parameter_catalog: src.parameter_catalog ?? null,
  }
}

function pickArray(...candidates) {
  for (const v of candidates) {
    if (Array.isArray(v)) return v
  }
  return []
}

export default { normalizeAgentDesignResponse }
