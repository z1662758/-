import request from '@/utils/request'
import { unwrapApiData } from '@/utils/session'

function isNotFoundError(error) {
  return error?.status === 404
}

async function requestWithFallback(primaryConfig, fallbackConfig = null) {
  try {
    return await request(primaryConfig)
  } catch (error) {
    if (!fallbackConfig || !isNotFoundError(error)) throw error
    return request(fallbackConfig)
  }
}

function cleanArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function cleanNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function normalizePolicyProfiles(profiles) {
  if (!Array.isArray(profiles)) return []
  return profiles
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const next = {
        manufacturer_id: String(item.manufacturer_id || item.id || '').trim(),
        label: String(item.label || '').trim() || 'custom'
      }
      if (!next.manufacturer_id) return null
      const fields = [
        'target_inventory_years',
        'diversification_limit',
        'risk_preference',
        'contract_preference',
        'preferred_routes',
        'decision_weights',
        'max_budget_multiplier'
      ]
      fields.forEach((key) => {
        if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
          next[key] = item[key]
        }
      })
      return next
    })
    .filter(Boolean)
}

export function normalizeUraniumExperimentPayload(payload = {}) {
  const next = {}
  const presetName = String(
    payload.preset_name
    || payload.presetName
    || payload.template_name
    || payload.templateName
    || ''
  ).trim()
  if (presetName) {
    next.preset_name = presetName
    next.template_name = presetName
  }

  const name = String(payload.name || '').trim()
  if (name) next.name = name

  const description = String(payload.description || '').trim()
  if (description) next.description = description

  const experimentId = String(payload.experiment_id || payload.experimentId || '').trim()
  if (experimentId) next.experiment_id = experimentId

  ;['start_year', 'end_year', 'optimization_iterations'].forEach((key) => {
    const altKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    const value = cleanNumber(payload[key] ?? payload[altKey])
    if (value != null) {
      next[key] = value
      if (key === 'optimization_iterations') next.iterations = value
    }
  })

  ;['starting_price_usd_per_lb', 'event_severity_multiplier', 'secondary_supply_multiplier'].forEach((key) => {
    const altKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    const value = cleanNumber(payload[key] ?? payload[altKey])
    if (value != null) next[key] = value
  })

  if (typeof payload.optimize_feedback === 'boolean') {
    next.optimize_feedback = payload.optimize_feedback
  } else if (typeof payload.optimizeFeedback === 'boolean') {
    next.optimize_feedback = payload.optimizeFeedback
  }

  const forcedEventNames = cleanArray(payload.forced_event_names ?? payload.forcedEventNames)
  if (forcedEventNames.length) next.forced_event_names = forcedEventNames

  const suppressedEventNames = cleanArray(payload.suppressed_event_names ?? payload.suppressedEventNames)
  if (suppressedEventNames.length) next.suppressed_event_names = suppressedEventNames

  const syntheticEvents = Array.isArray(payload.synthetic_events ?? payload.syntheticEvents)
    ? (payload.synthetic_events ?? payload.syntheticEvents)
    : []
  if (syntheticEvents.length) next.synthetic_events = syntheticEvents

  const policyProfiles = normalizePolicyProfiles(payload.policy_profiles ?? payload.policyProfiles)
  if (policyProfiles.length) next.policy_profiles = policyProfiles

  return next
}

export function getUraniumDefinition() {
  return request({
    url: '/api/uranium/during/definition',
    method: 'get'
  }).then(unwrapApiData)
}

export function getUraniumCatalog() {
  return requestWithFallback(
    {
      url: '/api/uranium/during/catalog',
      method: 'get'
    },
    {
      url: '/api/uranium/during/definition',
      method: 'get'
    }
  ).then(unwrapApiData).then((data) => data?.parameter_catalog || data)
}

export function getUraniumOverview() {
  return requestWithFallback(
    {
      url: '/api/uranium/during/overview',
      method: 'get'
    },
    {
      url: '/api/uranium/during/definition',
      method: 'get'
    }
  ).then(unwrapApiData)
}

export function getUraniumTemplates() {
  return requestWithFallback(
    {
      url: '/api/uranium/during/presets',
      method: 'get'
    },
    {
      url: '/api/uranium/during/templates',
      method: 'get'
    }
  ).then(unwrapApiData)
}

export function getUraniumTemplateDetail(templateName) {
  return requestWithFallback(
    {
      url: `/api/uranium/during/presets/${encodeURIComponent(templateName)}`,
      method: 'get'
    },
    {
      url: `/api/uranium/during/templates/${encodeURIComponent(templateName)}`,
      method: 'get'
    }
  ).then(unwrapApiData)
}

export function previewUraniumExperiment(payload) {
  return request({
    url: '/api/uranium/during/preview',
    method: 'post',
    data: normalizeUraniumExperimentPayload(payload)
  }).then(unwrapApiData)
}

export function runUraniumExperiment(payload) {
  return request({
    url: '/api/uranium/during/run',
    method: 'post',
    data: normalizeUraniumExperimentPayload(payload)
  }).then(unwrapApiData)
}

export function getUraniumHistory(limit = 50) {
  return request({
    url: '/api/uranium/during/history',
    method: 'get',
    params: { limit }
  }).then(unwrapApiData)
}

export function getUraniumStatistics() {
  return request({
    url: '/api/uranium/during/statistics',
    method: 'get'
  }).then(unwrapApiData)
}

export function getUraniumExperimentDetail(experimentId) {
  return request({
    url: `/api/uranium/during/experiments/${encodeURIComponent(experimentId)}`,
    method: 'get'
  }).then(unwrapApiData)
}

export function compareUraniumExperiments(experimentIds) {
  return request({
    url: '/api/uranium/during/compare',
    method: 'post',
    data: {
      experiment_ids: cleanArray(experimentIds)
    }
  }).then(unwrapApiData)
}
