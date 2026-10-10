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

/**
 * 供应链三级层级（与后端「制造 / 供应 / 销售」三级架构对齐）。
 * 后端实体的 category 字段是 enterprise/facility，层级信息其实落在 id/name 上，
 * 所以这里按 id/name/category 关键词统一解析为三级，作为实体图分组/布局/上色的唯一依据。
 */
export const TIER_LABELS = Object.freeze({
  supply: '供应',
  transport: '运输',
  manufacturing: '制造',
  sales: '销售',
  other: '其他'
})

export const TIER_ORDER = Object.freeze(['supply', 'transport', 'manufacturing', 'sales', 'other'])

export function resolveTier(raw) {
  const id = String(raw?.id || '').toLowerCase()
  const name = String(raw?.name || raw?.displayName || '')
  const cat = String(raw?.category || raw?.type || '').toLowerCase()
  // 销售：retailer / 销售商
  if (id.includes('retail') || cat.includes('retail') || cat.includes('sales') || cat.includes('销售') || name.includes('销售') || name.includes('零售')) {
    return 'sales'
  }
  // 供应：supplier / 供应商（排在制造之前判定，避免 "supply" 误入其它分支）
  if (id.includes('supplier') || id.includes('supply') || cat.includes('supplier') || cat.includes('supply') || cat.includes('供应') || name.includes('供应')) {
    return 'supply'
  }
  // 运输：管道 / 港口 / 海峡 / 通道 / 物流节点
  if (
    id.includes('transport') || id.includes('route') || id.includes('pipeline') || id.includes('port') || id.includes('terminal') ||
    cat.includes('transport') || cat.includes('route') || cat.includes('pipeline') || cat.includes('port') || cat.includes('terminal') ||
    cat.includes('通道') || cat.includes('运输') || cat.includes('管道') || cat.includes('港口') || cat.includes('海峡') || cat.includes('运河') ||
    name.includes('管道') || name.includes('港') || name.includes('通道') || name.includes('海峡') || name.includes('运河') || name.includes('转运')
  ) {
    return 'transport'
  }
  // 制造：制造总厂 / 工厂
  if (
    id.includes('manufactur') || id.includes('factory') || id.includes('plant') ||
    cat.includes('manufactur') || cat.includes('manufacturing') || cat.includes('factory') || cat.includes('plant') ||
    cat.includes('制造') || cat.includes('工厂') ||
    name.includes('制造') || name.includes('工厂') || name.includes('总厂')
  ) {
    return 'manufacturing'
  }
  return 'other'
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

  const name = rawAgent?.name || rawAgent?.displayName || id
  const tier = resolveTier({ id, name, category: rawAgent?.category })

  return {
    id,
    name,
    category: tier,
    tier,
    rawCategory: rawAgent?.category || '',
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
      const name = rawAgent?.name || rawAgent?.displayName || id
      const tier = resolveTier({ id, name, category: rawAgent?.category })
      return {
        id,
        name,
        category: tier,
        tier,
        rawCategory: rawAgent?.category || '',
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
