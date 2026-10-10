import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  compareUraniumExperiments,
  getUraniumCatalog,
  getUraniumDefinition,
  getUraniumExperimentDetail,
  getUraniumHistory,
  getUraniumOverview,
  getUraniumStatistics,
  previewUraniumExperiment,
  runUraniumExperiment
} from '@/api/uraniumDuring'
import { writeScnetActiveContext } from '@/utils/session'
import { getLatestTimeline } from '@/utils/uraniumDuringAdapter'

const STORAGE_KEYS = Object.freeze({
  selectedExperimentId: 'uranium_selectedExperimentId',
  draft: 'uranium_duringDraft'
})

function safeParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function defaultDraft() {
  return {
    preset_name: 'baseline',
    template_name: 'baseline',
    name: '',
    description: '',
    start_year: 2024,
    end_year: 2028,
    starting_price_usd_per_lb: null,
    optimize_feedback: false,
    optimization_iterations: 1,
    forced_event_names: [],
    suppressed_event_names: [],
    event_severity_multiplier: 1,
    secondary_supply_multiplier: 1,
    policy_profiles: []
  }
}

function normalizePresetList(payload = {}) {
  if (Array.isArray(payload?.presets)) return payload.presets
  if (Array.isArray(payload?.templates)) return payload.templates
  return []
}

export const useUraniumDuringStore = defineStore('scnetUraniumDuring', () => {
  const definition = ref(null)
  const overview = ref(null)
  const catalog = ref(null)
  const templates = ref([])
  const statistics = ref(null)
  const history = ref([])
  const comparison = ref(null)
  const selectedExperimentId = ref(localStorage.getItem(STORAGE_KEYS.selectedExperimentId) || '')
  const selectedExperiment = ref(null)
  const preview = ref(null)
  const draft = ref({ ...defaultDraft(), ...safeParse(STORAGE_KEYS.draft, {}) })

  const loading = ref({
    definition: false,
    overview: false,
    catalog: false,
    preview: false,
    run: false,
    history: false,
    experiment: false,
    statistics: false,
    comparison: false
  })

  const errors = ref({
    definition: '',
    overview: '',
    catalog: '',
    preview: '',
    run: '',
    history: '',
    experiment: '',
    statistics: '',
    comparison: ''
  })

  const activeExperiment = computed(() => {
    if (selectedExperiment.value?.experiment_id) return selectedExperiment.value
    const id = selectedExperimentId.value
    if (!id) return null
    return history.value.find((item) => item.experiment_id === id) || null
  })

  const latestTimeline = computed(() => getLatestTimeline(selectedExperiment.value))
  const experimentSummary = computed(() => selectedExperiment.value?.summary || {})
  const experimentReport = computed(() => selectedExperiment.value?.report || {})
  const uiProfile = computed(() => overview.value?.ui_profile || definition.value?.ui_profile || {})
  const marketSnapshot = computed(() => overview.value?.market_snapshot || definition.value?.market_snapshot || {})
  const actorPreview = computed(() => overview.value?.actor_preview || definition.value?.actor_preview || {})
  const requestSchema = computed(() => overview.value?.request_schema || definition.value?.request_schema || {})
  const resultSchema = computed(() => overview.value?.result_schema || definition.value?.result_schema || {})
  const scenarioContext = computed(() => (
    selectedExperiment.value?.scenario_context
    || preview.value?.scenario_context
    || overview.value?.scenario_context
    || definition.value?.scenario_context
    || {}
  ))

  function persistDraft() {
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(draft.value))
  }

  function patchDraft(patch = {}) {
    draft.value = {
      ...draft.value,
      ...patch
    }
    persistDraft()
  }

  function resetDraft() {
    draft.value = defaultDraft()
    persistDraft()
  }

  function setSelectedExperimentId(experimentId = '') {
    selectedExperimentId.value = String(experimentId || '')
    localStorage.setItem(STORAGE_KEYS.selectedExperimentId, selectedExperimentId.value)
    localStorage.setItem('selectedExperimentId', selectedExperimentId.value)
      writeScnetActiveContext({ experimentId: selectedExperimentId.value })
  }

  watch(draft, () => {
    persistDraft()
  }, { deep: true })

  async function fetchDefinition() {
    loading.value.definition = true
    errors.value.definition = ''
    try {
      const data = await getUraniumDefinition()
      definition.value = data
      templates.value = normalizePresetList(data)
      const firstPreset = templates.value[0]?.preset_name || templates.value[0]?.template_name
      if (!draft.value.preset_name && !draft.value.template_name && firstPreset) {
        patchDraft({ preset_name: firstPreset, template_name: firstPreset })
      }
      return data
    } catch (error) {
      errors.value.definition = error?.message || '加载铀场景定义失败'
      throw error
    } finally {
      loading.value.definition = false
    }
  }

  async function fetchOverview() {
    loading.value.overview = true
    errors.value.overview = ''
    try {
      const data = await getUraniumOverview()
      overview.value = data
      catalog.value = data?.parameter_catalog || catalog.value
      if (!templates.value.length) {
        templates.value = normalizePresetList(data)
      }
      return data
    } catch (error) {
      errors.value.overview = error?.message || '加载铀场景概览失败'
      throw error
    } finally {
      loading.value.overview = false
    }
  }

  async function fetchCatalog() {
    loading.value.catalog = true
    errors.value.catalog = ''
    try {
      const data = await getUraniumCatalog()
      catalog.value = data
      return data
    } catch (error) {
      errors.value.catalog = error?.message || '加载铀场景参数目录失败'
      throw error
    } finally {
      loading.value.catalog = false
    }
  }

  async function fetchStatistics() {
    loading.value.statistics = true
    errors.value.statistics = ''
    try {
      const data = await getUraniumStatistics()
      statistics.value = data
      return data
    } catch (error) {
      errors.value.statistics = error?.message || '加载统计数据失败'
      throw error
    } finally {
      loading.value.statistics = false
    }
  }

  async function fetchHistory(limit = 50) {
    loading.value.history = true
    errors.value.history = ''
    try {
      const data = await getUraniumHistory(limit)
      history.value = Array.isArray(data?.history) ? data.history : []
      return history.value
    } catch (error) {
      errors.value.history = error?.message || '加载实验历史失败'
      throw error
    } finally {
      loading.value.history = false
    }
  }

  async function runPreview(payload = null) {
    loading.value.preview = true
    errors.value.preview = ''
    try {
      const data = await previewUraniumExperiment(payload || draft.value)
      preview.value = data
      return data
    } catch (error) {
      errors.value.preview = error?.message || '实验预览失败'
      throw error
    } finally {
      loading.value.preview = false
    }
  }

  async function runExperiment(payload = null) {
    loading.value.run = true
    errors.value.run = ''
    try {
      const data = await runUraniumExperiment(payload || draft.value)
      selectedExperiment.value = data
      setSelectedExperimentId(data?.experiment_id || '')
      await Promise.allSettled([fetchHistory(), fetchStatistics()])
      return data
    } catch (error) {
      errors.value.run = error?.message || '实验执行失败'
      throw error
    } finally {
      loading.value.run = false
    }
  }

  async function loadExperiment(experimentId = '') {
    const resolvedId = String(experimentId || selectedExperimentId.value || '').trim()
    if (!resolvedId) return null
    loading.value.experiment = true
    errors.value.experiment = ''
    try {
      const data = await getUraniumExperimentDetail(resolvedId)
      selectedExperiment.value = data
      setSelectedExperimentId(data?.experiment_id || resolvedId)
      return data
    } catch (error) {
      errors.value.experiment = error?.message || '实验详情加载失败'
      throw error
    } finally {
      loading.value.experiment = false
    }
  }

  async function runComparison(experimentIds) {
    loading.value.comparison = true
    errors.value.comparison = ''
    try {
      const data = await compareUraniumExperiments(experimentIds)
      comparison.value = data
      return data
    } catch (error) {
      errors.value.comparison = error?.message || '实验对比失败'
      throw error
    } finally {
      loading.value.comparison = false
    }
  }

  return {
    definition,
    overview,
    catalog,
    templates,
    statistics,
    history,
    comparison,
    selectedExperimentId,
    selectedExperiment,
    preview,
    draft,
    loading,
    errors,
    activeExperiment,
    latestTimeline,
    experimentSummary,
    experimentReport,
    uiProfile,
    marketSnapshot,
    actorPreview,
    requestSchema,
    resultSchema,
    scenarioContext,
    patchDraft,
    resetDraft,
    setSelectedExperimentId,
    fetchDefinition,
    fetchOverview,
    fetchCatalog,
    fetchStatistics,
    fetchHistory,
    runPreview,
    runExperiment,
    loadExperiment,
    runComparison
  }
})
