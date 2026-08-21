// 注意：原先这里强制只渲染 manufacturing_corporation/factory/retailer 三种节点。
// 改造后画布数据来自后端 /SCnet/getAgents（agents + relationship_net），
// 该列表只在"参数目录兜底"场景使用——按"出现即渲染"的顺序排序，不再过滤。
const VISIBLE_AGENT_ORDER = ['supplier', 'manufacturing_corporation', 'factory', 'retailer']

const SUPPORTED_ENTITY_PARAM_KEYS = Object.freeze({
  manufacturing_corporation: new Set([
    'collaboration_radius',
    'max_collaboration_factories',
    'max_concurrent_orders',
    'factory_capacity_range'
  ]),
  factory: new Set([
    'capacity_range',
    'operating_cost_range',
    'quality_level_range'
  ]),
  retailer: new Set([
    'market_reach_range',
    'customer_satisfaction_range',
    'inventory_capacity',
    'markup_rate_range'
  ])
})

const SUBMIT_PARAM_ALIASES = Object.freeze({
  factory_capacity_range: 'capacity_range',
  quality_level_range: 'quality_level',
  market_reach_range: 'market_reach',
  customer_satisfaction_range: 'customer_satisfaction',
  markup_rate_range: 'markup_rate'
})

function cloneValue(value) {
  if (Array.isArray(value)) return [...value]
  return value
}

function toNumber(value, fallback = null) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeParamType(type, defaultValue) {
  const t = String(type || '').toLowerCase()
  if (t === 'range' || t === 'number' || t === 'enum' || t === 'text') return t
  if (Array.isArray(defaultValue)) return 'range'
  if (typeof defaultValue === 'number') return 'number'
  return 'text'
}

export function canonicalAgentId(raw) {
  const id = String(raw?.id || '').toLowerCase()
  const t = String(raw?.type || raw?.category || '').toLowerCase()
  if (id.includes('retailer') || t.includes('retail') || t.includes('销售')) return 'retailer'
  if (
    id.includes('manufacturing_corporation') ||
    id.includes('manufactur') ||
    id.includes('manufacturer') ||
    (t.includes('manufactur') && !t.includes('factory')) ||
    t.includes('总厂')
  ) {
    return 'manufacturing_corporation'
  }
  if (id.includes('factory') || t === 'factory' || t.includes('工厂')) return 'factory'
  if (id.includes('supplier') || t.includes('supplier') || t.includes('供应')) return 'supplier'
  return null
}

export function normalizeParamDef(rawParam) {
  const defaultValue = rawParam?.default ?? rawParam?.defaultValue
  const type = normalizeParamType(rawParam?.type, defaultValue)
  const key = String(rawParam?.key || '').trim()
  if (!key) return null

  return {
    ...rawParam,
    key,
    label: rawParam?.label || rawParam?.displayName || key,
    type,
    min: toNumber(rawParam?.min, null),
    max: toNumber(rawParam?.max, null),
    step: toNumber(rawParam?.step, type === 'range' ? 1 : 1),
    default: cloneValue(defaultValue),
    defaultValue: cloneValue(defaultValue)
  }
}

function normalizeAgent(rawAgent) {
  const id = canonicalAgentId(rawAgent) || String(rawAgent?.id || '').trim()
  if (!id) return null

  const allowedKeys = SUPPORTED_ENTITY_PARAM_KEYS[id]
  const rawParams = Array.isArray(rawAgent?.configurableParams)
    ? rawAgent.configurableParams
    : Array.isArray(rawAgent?.configurable_params)
      ? rawAgent.configurable_params
      : []

  const configurableParams = rawParams
    .map(normalizeParamDef)
    .filter(Boolean)
    .filter((p) => (allowedKeys ? allowedKeys.has(p.key) : true))

  return {
    id,
    name: rawAgent?.name || rawAgent?.displayName || id,
    category: rawAgent?.category || 'enterprise',
    description: rawAgent?.description || '',
    llmConfig: { model: 'qwen' },
    availableMethods: Array.isArray(rawAgent?.availableMethods)
      ? rawAgent.availableMethods
      : Array.isArray(rawAgent?.available_methods)
        ? rawAgent.available_methods
        : [],
    selectedMethod: rawAgent?.defaultMethod || rawAgent?.selectedMethod || '',
    entityCount: Number(rawAgent?.entityCount ?? rawAgent?.entity_count ?? 0) || 0,
    configurableParams
  }
}

export function buildAgentListFromCatalog(catalog) {
  const rawAgents = Array.isArray(catalog?.agent_graph?.agents)
    ? catalog.agent_graph.agents
    : Array.isArray(catalog?.entities?.agents)
      ? catalog.entities.agents
      : []

  const normalized = rawAgents
    .map(normalizeAgent)
    .filter(Boolean)

  if (normalized.length === 0) {
    return []
  }

  // 已知白名单 ID 优先按 VISIBLE_AGENT_ORDER 排序，其余追加在后
  const byId = new Map(normalized.map((agent) => [agent.id, agent]))
  const ordered = VISIBLE_AGENT_ORDER
    .map((id) => byId.get(id))
    .filter(Boolean)
  const orderedIds = new Set(ordered.map(a => a.id))
  const tail = normalized.filter(a => !orderedIds.has(a.id))
  return [...ordered, ...tail]
}

/**
 * 后端 /SCnet/getAgents 返回的 agents 字段结构与 catalog 不同（直接是数组），
 * 这里按"出现即渲染"的方式归一化为 agentList。
 *
 * 与 catalog 路径的差异：不调用 canonicalAgentId（避免 supplier_a / supplier_b 被合并为同一节点），
 * 也不按 SUPPORTED_ENTITY_PARAM_KEYS 过滤参数——后端给什么就渲染什么。
 */
export function buildAgentListFromBackendAgents(backendAgents) {
  if (!Array.isArray(backendAgents)) return []
  return backendAgents
    .map((rawAgent) => {
      const id = String(rawAgent?.id || '').trim()
      if (!id) return null
      const rawParams = Array.isArray(rawAgent?.configurableParams)
        ? rawAgent.configurableParams
        : Array.isArray(rawAgent?.configurable_params)
          ? rawAgent.configurable_params
          : []
      const configurableParams = rawParams.map(normalizeParamDef).filter(Boolean)
      return {
        id,
        name: rawAgent?.name || rawAgent?.displayName || id,
        category: rawAgent?.category || 'enterprise',
        description: rawAgent?.description || '',
        llmConfig: { model: 'qwen' },
        availableMethods: Array.isArray(rawAgent?.availableMethods)
          ? rawAgent.availableMethods
          : Array.isArray(rawAgent?.available_methods)
            ? rawAgent.available_methods
            : [],
        selectedMethod: rawAgent?.defaultMethod || rawAgent?.selectedMethod || '',
        entityCount: Number(rawAgent?.entityCount ?? rawAgent?.entity_count ?? 0) || 0,
        configurableParams
      }
    })
    .filter(Boolean)
}

export function pickLatestParameterCatalog(...payloads) {
  for (const payload of payloads) {
    if (payload && typeof payload === 'object' && payload.agent_graph && payload.system_parameters) {
      return payload
    }
  }
  return null
}

export function toSubmitCompatibleAgentNodeConfigs(rawConfigs) {
  const source = rawConfigs && typeof rawConfigs === 'object' ? rawConfigs : {}
  const out = {}

  for (const [agentId, cfg] of Object.entries(source)) {
    if (!cfg || typeof cfg !== 'object') continue
    const nextCfg = { ...cfg }
    const params = cfg.params && typeof cfg.params === 'object' ? cfg.params : {}
    const nextParams = { ...params }

    for (const [key, value] of Object.entries(params)) {
      const alias = SUBMIT_PARAM_ALIASES[key]
      if (!alias) continue
      if (nextParams[alias] === undefined) {
        nextParams[alias] = cloneValue(value)
      }
    }

    nextCfg.params = nextParams
    out[agentId] = nextCfg
  }

  return out
}

export const SCNET_SYSTEM_FISHBONE_KEYS = Object.freeze(new Set([
  'order_multiplier',
  'factory_capacity_range',
  'reproduction_threshold'
]))
