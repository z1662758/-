const parsedParamsCache = new Map()

export function parseTaskParams(params) {
  if (params == null || params === '') return null
  if (typeof params === 'object') return params
  const cacheKey = String(params)
  if (parsedParamsCache.has(cacheKey)) return parsedParamsCache.get(cacheKey)
  try {
    const parsed = JSON.parse(cacheKey)
    parsedParamsCache.set(cacheKey, parsed)
    return parsed
  } catch {
    return null
  }
}

export function normalizeScenarioName(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_')
  if (['uranium', 'uranium_supply_chain', 'nuclear_fuel', 'nuclearfuel'].includes(normalized)) {
    return 'uranium'
  }
  if (['automotive', 'supply_chain', 'supplychain', 'car', 'auto'].includes(normalized)) {
    return 'automotive'
  }
  return normalized || 'automotive'
}

export function getTaskParams(task) {
  return parseTaskParams(task?.params) || {}
}

export function isUraniumTask(task) {
  return normalizeScenarioName(getTaskParams(task).scenario) === 'uranium'
}

export function extractExperimentIdFromPath(resultPath = '') {
  const path = String(resultPath || '')
  const automotiveMatch = path.match(/multi_agent_report_(\d{8}_\d{6})\.json/)
  if (automotiveMatch) return automotiveMatch[1]
  const uraniumMatch = path.match(/uranium_during_([^/]+)\.json/)
  return uraniumMatch ? uraniumMatch[1] : ''
}

export function resolveExperimentIdFromTask(task) {
  if (!task || typeof task !== 'object') return ''
  const directId = task.experiment_id || task.experimentId
  if (directId) return String(directId)

  const params = getTaskParams(task)
  const paramId = params.experiment_id || params.experimentId
  if (paramId) return String(paramId)

  return (
    extractExperimentIdFromPath(task.result_path)
    || extractExperimentIdFromPath(task.result_relpath)
    || extractExperimentIdFromPath(params.result_path)
    || extractExperimentIdFromPath(params.result_relpath)
  )
}
