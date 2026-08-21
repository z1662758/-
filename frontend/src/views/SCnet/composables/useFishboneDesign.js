import { computed, nextTick, ref, unref } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import fishHeadImage from '@/assets/images/fishHead.png'
import fishTailImage from '@/assets/images/fishTail.png'
import { SCNET_SYSTEM_FISHBONE_KEYS } from './scnetCatalogAdapter'

function toDisplayNameList(items) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        return String(item.name || item.名称 || item.label || '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

function toNameDescList(items) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { name: item.trim(), description: '' }
      }
      if (item && typeof item === 'object') {
        return {
          name: String(item.name || item.名称 || item.label || '').trim(),
          description: String(item.description || item.说明 || '').trim()
        }
      }
      return { name: '', description: '' }
    })
    .filter((x) => x.name)
}

function parseNumericToken(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function toRangeHint(minValue, maxValue) {
  if (minValue === null || minValue === undefined || maxValue === null || maxValue === undefined) return ''
  return `建议范围: ${minValue} ~ ${maxValue}`
}

function truncateVarLabel(s, max = 16) {
  if (!s) return ''
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function wrapFishboneLabel(text, maxPerLine) {
  if (!text) return ''
  const lines = []
  for (let i = 0; i < text.length; i += maxPerLine) {
    lines.push(text.slice(i, i + maxPerLine))
  }
  return lines.join('\n')
}

const FACTOR_TO_SYSTEM_PARAM_KEY = Object.freeze({
  市场需求强度: 'order_multiplier',
  制造总产能: 'factory_capacity_range',
  供应保障能力: 'reproduction_threshold'
})

function normalizeTemplate(raw) {
  if (!raw || typeof raw !== 'object') return null
  const key = String(raw.key || '').trim()
  if (!key) return null
  const defaultValue = raw.defaultValue ?? raw.default
  const type = String(raw.type || (Array.isArray(defaultValue) ? 'range' : 'number'))
  return {
    key,
    displayName: raw.displayName || raw.label || key,
    type,
    min: parseNumericToken(raw.min),
    max: parseNumericToken(raw.max),
    step: parseNumericToken(raw.step) ?? 1,
    defaultValue: Array.isArray(defaultValue) ? [...defaultValue] : defaultValue,
    source: raw.source || ''
  }
}

const INFLUENCE_ALIAS_NORMALIZER = Object.freeze({
  协作范围: '工厂协作范围',
  工厂协作半径: '工厂协作范围',
  产能范围: '制造总产能',
  工厂产能范围: '制造总产能',
  供应总厂能: '制造总产能',
  供应总产能: '制造总产能'
})

function normalizeInfluenceName(rawName) {
  const name = String(rawName || '').trim()
  if (!name) return ''
  if (INFLUENCE_ALIAS_NORMALIZER[name]) return INFLUENCE_ALIAS_NORMALIZER[name]
  if (name.includes('市场需求')) return '市场需求强度'
  if (name.includes('工厂协作')) return '工厂协作范围'
  if (name.includes('协作范围')) return '工厂协作范围'
  if (name.includes('保障能力')) return '供应保障能力'
  if (name.includes('总产能') || name.includes('产能范围')) return '制造总产能'
  return name
}

function normalizeResponseName(rawName) {
  return String(rawName || '').trim()
}

function looksLikeResponseMetric(rawName) {
  const name = String(rawName || '').trim()
  if (!name) return false
  const hitWords = [
    '完成率',
    '履约率',
    '协作次数',
    '净利润',
    '利润',
    '网络密度',
    '利用率',
    '成本',
    '响应时间',
    '周转率'
  ]
  return hitWords.some((word) => name.includes(word))
}

export function useFishboneDesign(options) {
  const { store, scenarioApiResult, scenarioSubtasks, scenarioUserGoal, parameterCatalog } = options
  const fishboneEditableOption = options?.fishboneEditable ?? true
  const isFishboneEditable = () => {
    const raw = typeof fishboneEditableOption === 'function'
      ? fishboneEditableOption()
      : unref(fishboneEditableOption)
    return raw !== false
  }

  const fishBoneRef = ref(null)
  const eventTreeRef = ref(null)
  const fishBoneFullscreenRef = ref(null)

  let fishBoneChartInstance = null
  let treeChartInstance = null
  let fishBoneFullscreenChartInstance = null

  const setEventTreeRef = (el) => {
    eventTreeRef.value = el
  }

  const setFishBoneChartRef = (el) => {
    fishBoneRef.value = el
  }

  const setFishBoneFullscreenChartRef = (el) => {
    fishBoneFullscreenRef.value = el
  }

  const effectiveCatalog = computed(() => {
    const fromOption = parameterCatalog?.value
    if (fromOption && typeof fromOption === 'object') return fromOption
    const fromScenario = scenarioApiResult.value?.parameter_catalog
    if (fromScenario && typeof fromScenario === 'object') return fromScenario
    return null
  })

  const systemParamIndex = computed(() => {
    const index = new Map()
    const plannerRows = Array.isArray(effectiveCatalog.value?.planner_parameters)
      ? effectiveCatalog.value.planner_parameters
      : []
    const systemRows = Array.isArray(effectiveCatalog.value?.system_parameters)
      ? effectiveCatalog.value.system_parameters
      : []
    for (const row of [...plannerRows, ...systemRows]) {
      const normalized = normalizeTemplate(row)
      if (!normalized) continue
      if (!index.has(normalized.key)) index.set(normalized.key, normalized)
    }
    return index
  })

  const factorTemplateMap = computed(() => {
    const out = new Map()
    const catalog = effectiveCatalog.value
    if (!catalog) return out

    const addTemplates = (factorName, templates) => {
      const rows = Array.isArray(templates) ? templates : []
      const normalizedRows = rows
        .map(normalizeTemplate)
        .filter(Boolean)
        .filter((tpl) => SCNET_SYSTEM_FISHBONE_KEYS.has(tpl.key))
      if (normalizedRows.length > 0) out.set(factorName, normalizedRows)
    }

    const influenceRows = Array.isArray(catalog.influence_factors) ? catalog.influence_factors : []
    for (const row of influenceRows) {
      const factorName = normalizeInfluenceName(row?.name)
      if (!factorName) continue
      addTemplates(factorName, row?.parameter_templates)
    }

    const fishboneTemplates = catalog.fishbone_templates && typeof catalog.fishbone_templates === 'object'
      ? catalog.fishbone_templates
      : {}
    for (const [factorName, templates] of Object.entries(fishboneTemplates)) {
      const normalizedFactor = normalizeInfluenceName(factorName)
      if (!normalizedFactor || out.has(normalizedFactor)) continue
      addTemplates(normalizedFactor, templates)
    }

    for (const [factorName, paramKey] of Object.entries(FACTOR_TO_SYSTEM_PARAM_KEY)) {
      if (out.has(factorName)) continue
      const row = systemParamIndex.value.get(paramKey)
      if (!row) continue
      out.set(factorName, [{ ...row }])
    }

    return out
  })

  function buildFactorParamTemplates(factorName) {
    return factorTemplateMap.value.get(factorName) || []
  }

  function buildDefaultOverridesFromTemplates(templates = []) {
    const out = {}
    for (const tpl of templates) {
      if (!tpl || !tpl.key) continue
      out[tpl.key] = Array.isArray(tpl.defaultValue)
        ? [...tpl.defaultValue]
        : tpl.defaultValue
    }
    return out
  }

  const activeFishboneStage = ref('influence')

  const influenceExplainMap = computed(() => {
    const map = new Map()
    const fromVarExplain = toNameDescList(scenarioApiResult.value?.var_explain?.influence_factor || [])
    for (const item of fromVarExplain) {
      const normalizedName = normalizeInfluenceName(item.name)
      if (!normalizedName || looksLikeResponseMetric(normalizedName)) continue
      if (!map.has(normalizedName) || !map.get(normalizedName)) map.set(normalizedName, item.description || '')
    }
    const subtasks = Array.isArray(scenarioSubtasks.value) ? scenarioSubtasks.value : []
    for (const task of subtasks) {
      const params = task?.parameters && typeof task.parameters === 'object' ? task.parameters : {}
      for (const item of toNameDescList(params.influence_factors || [])) {
        const normalizedName = normalizeInfluenceName(item.name)
        if (!normalizedName || looksLikeResponseMetric(normalizedName)) continue
        if (!map.has(normalizedName) || !map.get(normalizedName)) map.set(normalizedName, item.description || '')
      }
    }
    return map
  })

  const responseExplainMap = computed(() => {
    const map = new Map()
    const fromVarExplain = toNameDescList(scenarioApiResult.value?.var_explain?.response_var || [])
    for (const item of fromVarExplain) {
      const normalizedName = normalizeResponseName(item.name)
      if (!normalizedName) continue
      if (!map.has(normalizedName) || !map.get(normalizedName)) map.set(normalizedName, item.description || '')
    }
    const subtasks = Array.isArray(scenarioSubtasks.value) ? scenarioSubtasks.value : []
    for (const task of subtasks) {
      const params = task?.parameters && typeof task.parameters === 'object' ? task.parameters : {}
      for (const item of toNameDescList(params.response_variables || [])) {
        const normalizedName = normalizeResponseName(item.name)
        if (!normalizedName) continue
        if (!map.has(normalizedName) || !map.get(normalizedName)) map.set(normalizedName, item.description || '')
      }
    }
    return map
  })

  const responseFormulaMap = computed(() => {
    const map = new Map()
    const formulaObj = scenarioApiResult.value?.formula && typeof scenarioApiResult.value.formula === 'object'
      ? scenarioApiResult.value.formula
      : {}
    const formulaExplainObj = scenarioApiResult.value?.formula_explain && typeof scenarioApiResult.value.formula_explain === 'object'
      ? scenarioApiResult.value.formula_explain
      : {}
    for (const [name, formula] of Object.entries(formulaObj)) {
      map.set(String(name), {
        formula: String(formula || ''),
        formulaExplain: String(formulaExplainObj[name] || '')
      })
    }
    return map
  })

  const hiddenResponseNameSet = computed(() => {
    const set = new Set()
    const rows = Array.isArray(effectiveCatalog.value?.response_variables)
      ? effectiveCatalog.value.response_variables
      : []
    for (const row of rows) {
      const name = normalizeResponseName(row?.name)
      if (!name) continue
      if (row?.visible_in_fishbone === false) set.add(name)
    }
    return set
  })

  function shouldHideResponseVariable(name) {
    const n = String(name || '').trim()
    if (!n) return true
    if (hiddenResponseNameSet.value.has(n)) return true
    return false
  }

  const influenceDesignVariables = computed(() => {
    const entryMap = new Map()
    const systemInfluenceNameSet = new Set(Object.keys(FACTOR_TO_SYSTEM_PARAM_KEY))
    const catalogInfluenceRows = Array.isArray(effectiveCatalog.value?.influence_factors)
      ? effectiveCatalog.value.influence_factors
      : []
    for (const row of catalogInfluenceRows) {
      const key = normalizeInfluenceName(row?.name)
      if (!key) continue
      if (row?.scope === 'system') {
        systemInfluenceNameSet.add(key)
      }
    }
    const catalogResponseNames = Array.isArray(effectiveCatalog.value?.response_variables)
      ? effectiveCatalog.value.response_variables.map((row) => normalizeResponseName(row?.name))
      : []
    const responseLabelSet = new Set(
      [
        ...toDisplayNameList(scenarioApiResult.value?.response_var || []).map((name) => normalizeResponseName(name)),
        ...catalogResponseNames
      ].filter(Boolean)
    )
    const ensureEntry = (name) => {
      const key = normalizeInfluenceName(name)
      if (!key) return null
      if (!systemInfluenceNameSet.has(key)) return null
      if (looksLikeResponseMetric(key)) return null
      if (responseLabelSet.has(key)) return null
      if (!entryMap.has(key)) {
        entryMap.set(key, {
          label: key,
          description: '',
          sourceSubtasks: new Set(),
          assignedAgents: new Set(),
          relatedSubtaskKeys: new Set()
        })
      }
      return entryMap.get(key)
    }

    for (const name of toDisplayNameList(scenarioApiResult.value?.influence_factor || [])) {
      ensureEntry(name)
    }
    for (const row of catalogInfluenceRows) {
      ensureEntry(row?.name)
    }

    for (const [name, desc] of influenceExplainMap.value.entries()) {
      const entry = ensureEntry(name)
      if (entry && !entry.description && desc) entry.description = desc
    }

    const subtasks = Array.isArray(scenarioSubtasks.value) ? scenarioSubtasks.value : []
    for (let index = 0; index < subtasks.length; index += 1) {
      const task = subtasks[index]
      const params = task?.parameters && typeof task.parameters === 'object' ? task.parameters : {}
      const subtaskKey = String(task?.task_id ?? task?.id ?? `idx_${index}`)
      const subtaskLabel = String(task?.description || task?.title || `子任务 ${index + 1}`).trim()
      const assignedAgent = String(task?.assigned_agent || task?.agent_type || '').trim()
      for (const factor of toNameDescList(params.influence_factors || [])) {
        const entry = ensureEntry(factor.name)
        if (!entry) continue
        if (!entry.description && factor.description) entry.description = factor.description
        if (subtaskLabel) entry.sourceSubtasks.add(subtaskLabel)
        if (assignedAgent) entry.assignedAgents.add(assignedAgent)
        entry.relatedSubtaskKeys.add(subtaskKey)
      }
    }

    const list = Array.from(entryMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
    return list.map((entry, index) => {
      const templates = buildFactorParamTemplates(entry.label)
      const variableConfigKey = `factor::${entry.label}`
      const relatedSubtaskKeys = Array.from(entry.relatedSubtaskKeys)
      return {
        kind: 'influence',
        variableConfigKey,
        subtaskKey: relatedSubtaskKeys[0] || variableConfigKey,
        relatedSubtaskKeys,
        index,
        label: entry.label,
        description: entry.description || '后端标准影响因素',
        sourceSubtasks: Array.from(entry.sourceSubtasks),
        assignedAgent: Array.from(entry.assignedAgents).join('、'),
        canConfigure: templates.length > 0,
        formula: '',
        formulaExplain: '',
        backendParamTemplates: templates,
        defaultParamOverrides: buildDefaultOverridesFromTemplates(templates),
        parameters: {},
        raw: {}
      }
    })
  })

  const responseDesignVariables = computed(() => {
    const entryMap = new Map()
    const ensureEntry = (name) => {
      const key = normalizeResponseName(name)
      if (!key) return null
      if (!entryMap.has(key)) {
        entryMap.set(key, {
          label: key,
          description: '',
          sourceSubtasks: new Set(),
          assignedAgents: new Set(),
          relatedSubtaskKeys: new Set(),
          formula: '',
          formulaExplain: ''
        })
      }
      return entryMap.get(key)
    }

    for (const name of toDisplayNameList(scenarioApiResult.value?.response_var || [])) {
      ensureEntry(name)
    }
    const catalogResponseRows = Array.isArray(effectiveCatalog.value?.response_variables)
      ? effectiveCatalog.value.response_variables
      : []
    for (const row of catalogResponseRows) {
      ensureEntry(row?.name)
    }

    for (const [name, desc] of responseExplainMap.value.entries()) {
      const entry = ensureEntry(name)
      if (entry && !entry.description && desc) entry.description = desc
    }

    for (const row of catalogResponseRows) {
      const entry = ensureEntry(row?.name)
      if (!entry) continue
      if (!entry.description && row?.description) entry.description = String(row.description)
      if (row?.formula) entry.formula = String(row.formula)
    }

    for (const [name, payload] of responseFormulaMap.value.entries()) {
      const entry = ensureEntry(name)
      if (!entry) continue
      if (payload?.formula) entry.formula = payload.formula
      if (payload?.formulaExplain) entry.formulaExplain = payload.formulaExplain
    }

    const subtasks = Array.isArray(scenarioSubtasks.value) ? scenarioSubtasks.value : []
    for (let index = 0; index < subtasks.length; index += 1) {
      const task = subtasks[index]
      const params = task?.parameters && typeof task.parameters === 'object' ? task.parameters : {}
      const subtaskKey = String(task?.task_id ?? task?.id ?? `idx_${index}`)
      const subtaskLabel = String(task?.description || task?.title || `子任务 ${index + 1}`).trim()
      const assignedAgent = String(task?.assigned_agent || task?.agent_type || '').trim()
      for (const item of toNameDescList(params.response_variables || [])) {
        const entry = ensureEntry(item.name)
        if (!entry) continue
        if (!entry.description && item.description) entry.description = item.description
        if (subtaskLabel) entry.sourceSubtasks.add(subtaskLabel)
        if (assignedAgent) entry.assignedAgents.add(assignedAgent)
        entry.relatedSubtaskKeys.add(subtaskKey)
      }
    }

    const list = Array
      .from(entryMap.values())
      .filter((entry) => !shouldHideResponseVariable(entry.label))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
    return list.map((entry, index) => {
      const variableConfigKey = `response::${entry.label}`
      const relatedSubtaskKeys = Array.from(entry.relatedSubtaskKeys)
      return {
        kind: 'response',
        variableConfigKey,
        subtaskKey: relatedSubtaskKeys[0] || variableConfigKey,
        relatedSubtaskKeys,
        index,
        label: entry.label,
        description: entry.description || '后端标准响应变量',
        sourceSubtasks: Array.from(entry.sourceSubtasks),
        assignedAgent: Array.from(entry.assignedAgents).join('、'),
        canConfigure: false,
        formula: entry.formula,
        formulaExplain: entry.formulaExplain,
        backendParamTemplates: [],
        defaultParamOverrides: {},
        parameters: {},
        raw: {}
      }
    })
  })

  const activeFishboneVariables = computed(() => (
    activeFishboneStage.value === 'response'
      ? responseDesignVariables.value
      : influenceDesignVariables.value
  ))

  const hasAnyFishboneData = computed(() => (
    influenceDesignVariables.value.length > 0 || responseDesignVariables.value.length > 0
  ))

  const fishboneFullscreenVisible = ref(false)
  const fishboneFullscreenTitle = computed(() => (
    activeFishboneStage.value === 'response'
      ? '响应变量设计 — 鱼骨图'
      : '影响因素设计 — 鱼骨图'
  ))

  let fishboneParamRowSeed = 1
  function nextFishboneParamRowId() {
    const id = fishboneParamRowSeed
    fishboneParamRowSeed += 1
    return id
  }

  function buildFishboneParamRow(name, rawValue, template = null) {
    const row = {
      id: nextFishboneParamRowId(),
      name,
      displayName: template?.displayName || '',
      type: template?.type || 'text',
      numberValue: null,
      minValue: null,
      maxValue: null,
      textValue: '',
      minLimit: template?.min ?? null,
      maxLimit: template?.max ?? null,
      step: template?.step ?? 1,
      rangeHint: toRangeHint(template?.min, template?.max),
      source: template?.source || ''
    }

    if (Array.isArray(rawValue) && rawValue.length >= 2) {
      const lo = parseNumericToken(rawValue[0])
      const hi = parseNumericToken(rawValue[1])
      if (lo !== null && hi !== null) {
        row.type = 'range'
        row.minValue = lo
        row.maxValue = hi
        return row
      }
    }
    if (typeof rawValue === 'number') {
      row.type = 'number'
      row.numberValue = rawValue
      return row
    }
    if (typeof rawValue === 'string') {
      row.type = 'text'
      row.textValue = rawValue
      return row
    }
    if (rawValue !== undefined && rawValue !== null) {
      row.type = 'text'
      try {
        row.textValue = JSON.stringify(rawValue)
      } catch {
        row.textValue = String(rawValue)
      }
      return row
    }
    if (template?.type === 'range' && Array.isArray(template.defaultValue) && template.defaultValue.length >= 2) {
      row.type = 'range'
      row.minValue = template.defaultValue[0]
      row.maxValue = template.defaultValue[1]
    } else if (template?.type === 'number' && typeof template.defaultValue === 'number') {
      row.type = 'number'
      row.numberValue = template.defaultValue
    } else if (template?.defaultValue !== undefined && template?.defaultValue !== null) {
      row.type = 'text'
      row.textValue = String(template.defaultValue)
    }
    return row
  }

  function toFishboneParamRows(sourceObj = {}, templates = []) {
    const safeSource = sourceObj && typeof sourceObj === 'object' && !Array.isArray(sourceObj) ? sourceObj : {}
    const rows = []
    const used = new Set()
    for (const tpl of templates) {
      if (!tpl || !tpl.key) continue
      used.add(tpl.key)
      const rawValue = Object.prototype.hasOwnProperty.call(safeSource, tpl.key)
        ? safeSource[tpl.key]
        : tpl.defaultValue
      rows.push(buildFishboneParamRow(tpl.key, rawValue, tpl))
    }
    for (const [name, rawValue] of Object.entries(safeSource)) {
      if (used.has(name)) continue
      rows.push(buildFishboneParamRow(name, rawValue, null))
    }
    return rows
  }

  const fishboneDrawerVisible = ref(false)
  const fishboneDrawerVar = ref(null)
  const fishboneParamRows = ref([])

  const fishboneDrawerTitle = computed(() => {
    const v = fishboneDrawerVar.value
    if (!v) return '变量配置'
    const prefix = v.kind === 'response' ? '响应变量' : '影响因素'
    return `${prefix} · ${truncateVarLabel(v.label, 22)}`
  })

  function getStoredOverridesForVariable(v) {
    const keys = Array.from(new Set([
      v?.variableConfigKey,
      ...(Array.isArray(v?.relatedSubtaskKeys) ? v.relatedSubtaskKeys : []),
      v?.subtaskKey
    ].filter(Boolean)))
    for (const key of keys) {
      const ov = store.scenarioVariableConfigs[key]?.paramOverrides
      if (ov && typeof ov === 'object' && !Array.isArray(ov) && Object.keys(ov).length > 0) {
        return ov
      }
    }
    return null
  }

  function normalizeFishboneParamSource(v, overrideObj = null) {
    if (overrideObj && typeof overrideObj === 'object' && !Array.isArray(overrideObj)) return overrideObj
    const defaults = v?.defaultParamOverrides
    if (defaults && typeof defaults === 'object' && !Array.isArray(defaults) && Object.keys(defaults).length > 0) {
      return defaults
    }
    return {}
  }

  function openFishboneVarConfig(v) {
    if (!isFishboneEditable()) {
      ElMessage.info('当前为自动化方案展示模式，变量参数仅支持查看')
      return
    }
    if (!v || v.kind !== 'influence') return
    if (!Array.isArray(v.backendParamTemplates) || v.backendParamTemplates.length === 0) {
      ElMessage.info(`「${v.label}」请在实体图中配置对应参数`)
      return
    }
    fishboneDrawerVar.value = v
    const existing = getStoredOverridesForVariable(v)
    const source = normalizeFishboneParamSource(v, existing)
    fishboneParamRows.value = toFishboneParamRows(source, v.backendParamTemplates || [])
    fishboneDrawerVisible.value = true
  }

  function saveFishboneDrawer() {
    if (!isFishboneEditable()) {
      fishboneDrawerVisible.value = false
      return
    }
    const v = fishboneDrawerVar.value
    if (!v || v.kind !== 'influence') return
    const paramOverrides = {}
    const usedNames = new Set()
    for (const row of fishboneParamRows.value) {
      const name = String(row.name || '').trim()
      const hasAnyValue = row.type === 'range'
        ? row.minValue !== null && row.minValue !== undefined && row.maxValue !== null && row.maxValue !== undefined
        : row.type === 'number'
          ? row.numberValue !== null && row.numberValue !== undefined
          : String(row.textValue || '').trim() !== ''

      if (!name) {
        if (!hasAnyValue) continue
        ElMessage.error('参数名不能为空')
        return
      }
      if (usedNames.has(name)) {
        ElMessage.error(`参数「${name}」重复`)
        return
      }
      usedNames.add(name)

      if (row.type === 'range') {
        const minVal = Number(row.minValue)
        const maxVal = Number(row.maxValue)
        if (Number.isNaN(minVal) || Number.isNaN(maxVal)) {
          ElMessage.error(`参数 ${name} 的区间须为数字`)
          return
        }
        if (minVal > maxVal) {
          ElMessage.error(`参数 ${name} 的最小值不能大于最大值`)
          return
        }
        if (row.minLimit !== null && row.minLimit !== undefined && minVal < row.minLimit) {
          ElMessage.error(`参数 ${name} 不能小于 ${row.minLimit}`)
          return
        }
        if (row.maxLimit !== null && row.maxLimit !== undefined && maxVal > row.maxLimit) {
          ElMessage.error(`参数 ${name} 不能大于 ${row.maxLimit}`)
          return
        }
        paramOverrides[name] = [minVal, maxVal]
      } else if (row.type === 'number') {
        const numberVal = Number(row.numberValue)
        if (Number.isNaN(numberVal)) {
          ElMessage.error(`参数 ${name} 须为数字`)
          return
        }
        if (row.minLimit !== null && row.minLimit !== undefined && numberVal < row.minLimit) {
          ElMessage.error(`参数 ${name} 不能小于 ${row.minLimit}`)
          return
        }
        if (row.maxLimit !== null && row.maxLimit !== undefined && numberVal > row.maxLimit) {
          ElMessage.error(`参数 ${name} 不能大于 ${row.maxLimit}`)
          return
        }
        paramOverrides[name] = numberVal
      } else {
        paramOverrides[name] = String(row.textValue ?? '')
      }
    }

    const relatedKeys = Array.isArray(v.relatedSubtaskKeys) ? v.relatedSubtaskKeys.filter(Boolean) : []
    const targets = new Set(
      relatedKeys.length > 0
        ? relatedKeys
        : [v.subtaskKey, v.variableConfigKey].filter(Boolean)
    )

    for (const key of targets) {
      store.updateScenarioVariableConfig(key, {
        notes: '',
        paramOverrides
      })
    }
    ElMessage.success('变量配置已保存，并同步到关联子任务')
    fishboneDrawerVisible.value = false
  }

  function bindFishboneChartClick(chart) {
    if (!chart) return
    chart.off('click')
    chart.on('click', (params) => {
      if (params.componentType !== 'series' || params.seriesType !== 'graph') return
      const d = params.data
      if (!d || params.dataType === 'edge') return
      const meta = d.subtaskMeta
      if (meta && meta.kind === 'influence' && isFishboneEditable()) openFishboneVarConfig(meta)
    })
  }

  function buildFishBoneOption(cardWidth, cardHeight, variables, opts = {}) {
    const compact = opts.compact ?? false
    const roam = opts.roam ?? false
    const goalText = String(opts.goalText || '').trim()
    const centerY = cardHeight / 2
    const lineColor = '#c0c4cc'
    const lightLineColor = '#dcdfe6'

    const headSymbol = `image://${fishHeadImage}`
    const tailSymbol = `image://${fishTailImage}`

    const k = compact ? 0.88 : 1
    const innerPaddingX = Math.min(120, Math.max(70, cardWidth * 0.12))
    const headSize = [
      Math.min(140, Math.max(110, cardWidth * 0.16)) * k,
      Math.min(190, Math.max(140, cardHeight * 0.7)) * k
    ]
    const tailSize = [
      Math.min(160, Math.max(120, cardWidth * 0.18)) * k,
      Math.min(120, Math.max(85, cardHeight * 0.42)) * k
    ]

    const boneCount = variables.length
    const denseBranching = boneCount > 10
    const tailX = innerPaddingX + tailSize[0] / 2
    const headRightX = cardWidth - innerPaddingX - headSize[0] / 2
    const minSpineCenterDist = compact
      ? Math.max(340, 220 + boneCount * 50)
      : Math.max(420, 280 + boneCount * 58)
    const headX = Math.max(tailX + minSpineCenterDist, headRightX)

    const nodes = [
      {
        name: 'Tail',
        x: tailX,
        y: centerY,
        symbol: tailSymbol,
        symbolSize: tailSize,
        goalMeta: {
          kind: 'goal',
          goalText: goalText || '请先在场景建模中输入实验目标'
        },
        label: { show: false }
      },
      { name: 'Head', x: headX, y: centerY, symbol: headSymbol, symbolSize: headSize, label: { show: false } }
    ]

    const links = [
      {
        source: 0,
        target: 1,
        symbol: 'none',
        lineStyle: { width: compact ? 6 : 8, color: lineColor }
      }
    ]

    const spineLen = Math.max(1, headX - tailX)
    const segmentLen = spineLen / (boneCount + 1)
    const labelBoxWidthMax = Math.min(200, Math.max(140, cardWidth * 0.32))
    const charsPerLine = compact ? 11 : 13
    const labelBoxHeight = compact ? 40 : 46
    const elbowOffsetX = Math.min(104, Math.max(68, cardWidth * 0.12))
    const elbowOffsetY = Math.min(150, Math.max(96, cardHeight * 0.32))
    const minLabelX = tailX + tailSize[0] / 2 + 10
    const maxLabelX = headX - headSize[0] / 2 - 10

    const labelGap = 20
    const sideIndices = { up: [], down: [] }
    for (let i = 0; i < boneCount; i += 1) {
      const lane = denseBranching ? i % 4 : i % 2
      const isUp = denseBranching ? lane === 0 || lane === 2 : lane === 0
      ;(isUp ? sideIndices.up : sideIndices.down).push(i)
    }

    const labelRangeLen = Math.max(1, maxLabelX - minLabelX)
    const calcSideBoxWidth = (count) => {
      if (count <= 1) return labelBoxWidthMax
      const fit = (labelRangeLen - (count - 1) * labelGap) / count
      return Math.min(labelBoxWidthMax, Math.max(110, fit))
    }
    const sideBoxWidth = {
      up: calcSideBoxWidth(sideIndices.up.length),
      down: calcSideBoxWidth(sideIndices.down.length)
    }

    const labelLayout = {}
    const assignSideLayout = (side) => {
      const indices = sideIndices[side]
      const width = sideBoxWidth[side]
      const items = indices.map((i) => ({ i, jointX: tailX + (i + 1) * segmentLen })).sort((a, b) => a.jointX - b.jointX)
      let cursorX = minLabelX
      for (const item of items) {
        const desiredX = (item.jointX - elbowOffsetX) - (width * 0.7)
        let x = Math.min(maxLabelX - width, Math.max(minLabelX, desiredX))
        if (x < cursorX) x = cursorX
        if (x > maxLabelX - width) x = maxLabelX - width
        labelLayout[item.i] = { x, width }
        cursorX = x + width + labelGap
      }
    }
    assignSideLayout('up')
    assignSideLayout('down')

    for (let i = 0; i < boneCount; i += 1) {
      const jointX = tailX + (i + 1) * segmentLen
      const jointIndex = nodes.length
      nodes.push({
        name: `joint-${i}`,
        x: jointX,
        y: centerY,
        symbol: 'none',
        tooltip: { show: false },
        label: { show: false }
      })

      const lane = denseBranching ? i % 4 : i % 2
      const isUp = denseBranching ? lane === 0 || lane === 2 : lane === 0
      const useSecondaryBranch = denseBranching && (lane === 2 || lane === 3)

      const primaryElbowX = Math.max(tailX + 30, jointX - elbowOffsetX * (useSecondaryBranch ? 0.62 : 1))
      const primaryElbowY = isUp
        ? centerY - elbowOffsetY * (useSecondaryBranch ? 0.62 : 1)
        : centerY + elbowOffsetY * (useSecondaryBranch ? 0.62 : 1)
      const primaryElbowIndex = nodes.length
      nodes.push({
        name: `elbow-${i}-1`,
        x: primaryElbowX,
        y: primaryElbowY,
        symbol: 'none',
        tooltip: { show: false },
        label: { show: false }
      })
      links.push({
        source: jointIndex,
        target: primaryElbowIndex,
        symbol: 'none',
        lineStyle: { width: 3, color: lightLineColor }
      })

      let branchAnchorIndex = primaryElbowIndex
      let branchAnchorX = primaryElbowX
      let branchAnchorY = primaryElbowY
      if (useSecondaryBranch) {
        const secondaryElbowX = Math.max(tailX + 24, jointX - elbowOffsetX)
        const secondaryElbowY = isUp ? centerY - elbowOffsetY : centerY + elbowOffsetY
        const secondaryElbowIndex = nodes.length
        nodes.push({
          name: `elbow-${i}-2`,
          x: secondaryElbowX,
          y: secondaryElbowY,
          symbol: 'none',
          tooltip: { show: false },
          label: { show: false }
        })
        links.push({
          source: primaryElbowIndex,
          target: secondaryElbowIndex,
          symbol: 'none',
          lineStyle: { width: 3, color: lightLineColor, type: 'dashed' }
        })
        branchAnchorIndex = secondaryElbowIndex
        branchAnchorX = secondaryElbowX
        branchAnchorY = secondaryElbowY
      }

      const currentLayout = labelLayout[i] || {
        x: Math.max(minLabelX, branchAnchorX - (labelBoxWidthMax * 0.7)),
        width: labelBoxWidthMax
      }
      const labelX = currentLayout.x
      const labelY = branchAnchorY
      const varNodeIndex = nodes.length
      const varItem = variables[i]
      const displayName = wrapFishboneLabel(varItem.label, charsPerLine)
      const isResponse = varItem.kind === 'response'
      const nodeColor = isResponse ? '#fff7ed' : '#f0f9ff'
      const nodeBorderColor = isResponse ? '#f59e0b' : '#60a5fa'
      const focusBorderColor = isResponse ? '#d97706' : '#2563eb'

      nodes.push({
        name: displayName,
        subtaskMeta: varItem,
        x: labelX,
        y: labelY,
        symbol: 'roundRect',
        symbolSize: [currentLayout.width, labelBoxHeight],
        itemStyle: {
          color: nodeColor,
          borderColor: nodeBorderColor,
          borderWidth: 1
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 12,
            borderColor: focusBorderColor,
            borderWidth: 2
          }
        },
        label: {
          show: true,
          color: '#303133',
          fontSize: compact ? 10 : 12,
          lineHeight: 15,
          width: Math.max(40, currentLayout.width - 10),
          overflow: 'break',
          align: 'center',
          verticalAlign: 'middle'
        }
      })

      links.push({
        source: branchAnchorIndex,
        target: varNodeIndex,
        symbol: 'none',
        lineStyle: { width: 3, color: lightLineColor }
      })
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const goalMeta = params?.data?.goalMeta
          if (goalMeta && goalMeta.kind === 'goal') {
            return `实验目标：${goalMeta.goalText || '请先在场景建模中输入实验目标'}`
          }

          const data = params?.data?.subtaskMeta
          if (!data) return params?.name || ''
          const descLine = data.description ? `说明：${data.description}` : ''
          const formulaLine = data.formula ? `公式：${data.formula}` : ''
          const formulaExplainLine = data.formulaExplain ? `公式说明：${data.formulaExplain}` : ''
          const sourceLine = Array.isArray(data.sourceSubtasks) && data.sourceSubtasks.length > 0
            ? `来源子任务：${data.sourceSubtasks.join('；')}`
            : ''
          const agentLine = data.assignedAgent ? `负责方：${data.assignedAgent}` : ''
          const hint = data.kind === 'influence'
            ? data.canConfigure
              ? '<span style="color:#909399">点击节点配置系统参数</span>'
              : '<span style="color:#909399">该变量当前不可配置，仅用于观测</span>'
            : ''
          return [data.label, descLine, formulaLine, formulaExplainLine, sourceLine, agentLine, hint]
            .filter(Boolean)
            .join('<br/>')
        }
      },
      animationDurationUpdate: 300,
      series: [{
        type: 'graph',
        layout: 'none',
        roam,
        data: nodes,
        links,
        label: { show: false },
        emphasis: { focus: 'adjacency' },
        lineStyle: { opacity: 0.9, width: 2, color: lightLineColor }
      }]
    }
  }

  function initFishBoneChart() {
    if (!fishBoneRef.value) return
    fishBoneChartInstance = echarts.init(fishBoneRef.value)
    renderFishBoneChart()
  }

  function renderFishBoneChart() {
    if (!fishBoneChartInstance || !fishBoneRef.value) return
    const rect = fishBoneRef.value.getBoundingClientRect()
    const vars = activeFishboneVariables.value
    if (!vars || vars.length === 0) {
      fishBoneChartInstance.clear()
      return
    }
    const option = buildFishBoneOption(rect.width, rect.height, vars, {
      compact: true,
      roam: 'scale',
      goalText: scenarioUserGoal.value
    })
    fishBoneChartInstance.setOption(option, true)
    bindFishboneChartClick(fishBoneChartInstance)
  }

  function renderFishboneFullscreen() {
    if (!fishBoneFullscreenChartInstance || !fishBoneFullscreenRef.value) return
    const rect = fishBoneFullscreenRef.value.getBoundingClientRect()
    const vars = activeFishboneVariables.value
    if (!vars.length) {
      fishBoneFullscreenChartInstance.clear()
      return
    }
    const option = buildFishBoneOption(
      Math.max(rect.width, 960),
      Math.max(rect.height, 560),
      vars,
      {
        compact: false,
        roam: true,
        goalText: scenarioUserGoal.value
      }
    )
    fishBoneFullscreenChartInstance.setOption(option, true)
    bindFishboneChartClick(fishBoneFullscreenChartInstance)
  }

  function onFishboneDialogOpened() {
    nextTick(() => {
      if (!fishBoneFullscreenRef.value) return
      if (fishBoneFullscreenChartInstance) {
        fishBoneFullscreenChartInstance.dispose()
        fishBoneFullscreenChartInstance = null
      }
      fishBoneFullscreenChartInstance = echarts.init(fishBoneFullscreenRef.value)
      renderFishboneFullscreen()
    })
  }

  function onFishboneDialogClosed() {
    if (fishBoneFullscreenChartInstance) {
      fishBoneFullscreenChartInstance.dispose()
      fishBoneFullscreenChartInstance = null
    }
  }

  function initTreeChart() {
    if (!eventTreeRef.value) return
    treeChartInstance = echarts.init(eventTreeRef.value)

    const treeData = {
      name: '供应商工厂停产\n(Trigger Event)',
      symbolSize: 12,
      itemStyle: { color: '#F56C6C', borderColor: '#F56C6C' },
      label: { backgroundColor: '#FEF0F0', color: '#F56C6C', borderRadius: 4, padding: [4, 6] },
      children: [
        {
          name: '供应链应急会议',
          symbolSize: 10,
          itemStyle: { color: '#409EFF' },
          children: [
            {
              name: '决策: 启用备选供应商',
              symbolSize: 10,
              itemStyle: { color: '#67C23A' },
              label: { fontWeight: 'bold', color: '#67C23A' },
              children: [
                { name: '物流线路调整', itemStyle: { color: '#909399' } },
                { name: '库存应急调拨', itemStyle: { color: '#909399' } }
              ]
            },
            {
              name: '备选: 临时减产',
              symbolSize: 8,
              itemStyle: { color: '#909399', opacity: 0.6 },
              lineStyle: { type: 'dashed' },
              label: { color: '#909399' }
            },
            {
              name: '备选: 终端限购',
              symbolSize: 8,
              itemStyle: { color: '#909399', opacity: 0.6 },
              lineStyle: { type: 'dashed' },
              label: { color: '#909399' }
            }
          ]
        }
      ]
    }

    treeChartInstance.setOption({
      tooltip: { trigger: 'item', triggerOn: 'mousemove' },
      series: [{
        type: 'tree',
        data: [treeData],
        top: '10%',
        left: '10%',
        bottom: '10%',
        right: '20%',
        symbol: 'circle',
        symbolSize: 7,
        initialTreeDepth: 5,
        label: {
          position: 'left',
          verticalAlign: 'middle',
          align: 'right',
          fontSize: 12,
          distance: 10
        },
        leaves: { label: { position: 'right', verticalAlign: 'middle', align: 'left' } },
        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750,
        lineStyle: { width: 2, curveness: 0.5, color: '#ccc' }
      }]
    })
  }

  function handleResize() {
    if (treeChartInstance) treeChartInstance.resize()
    if (fishBoneChartInstance) {
      fishBoneChartInstance.resize()
      renderFishBoneChart()
    }
    if (fishBoneFullscreenChartInstance && fishboneFullscreenVisible.value) {
      fishBoneFullscreenChartInstance.resize()
      renderFishboneFullscreen()
    }
  }

  function syncFishboneOnVariablesChange(newVars) {
    nextTick(() => {
      if (!fishBoneChartInstance && fishBoneRef.value && newVars && newVars.length > 0) {
        initFishBoneChart()
      } else if (fishBoneChartInstance) {
        renderFishBoneChart()
      }
      if (fishBoneFullscreenChartInstance && fishboneFullscreenVisible.value) {
        renderFishboneFullscreen()
      }
    })
  }

  function disposeCharts() {
    if (fishBoneChartInstance) {
      fishBoneChartInstance.dispose()
      fishBoneChartInstance = null
    }
    if (fishBoneFullscreenChartInstance) {
      fishBoneFullscreenChartInstance.dispose()
      fishBoneFullscreenChartInstance = null
    }
    if (treeChartInstance) {
      treeChartInstance.dispose()
      treeChartInstance = null
    }
  }

  return {
    setEventTreeRef,
    setFishBoneChartRef,
    setFishBoneFullscreenChartRef,
    activeFishboneStage,
    influenceDesignVariables,
    responseDesignVariables,
    hasAnyFishboneData,
    activeFishboneVariables,
    fishboneDrawerVisible,
    fishboneDrawerTitle,
    fishboneDrawerVar,
    fishboneParamRows,
    fishboneFullscreenVisible,
    fishboneFullscreenTitle,
    saveFishboneDrawer,
    onFishboneDialogOpened,
    onFishboneDialogClosed,
    initFishBoneChart,
    initTreeChart,
    handleResize,
    syncFishboneOnVariablesChange,
    disposeCharts
  }
}
