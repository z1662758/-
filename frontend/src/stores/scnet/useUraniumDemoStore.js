import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { writeScnetActiveContext } from '@/utils/session'
import { buildIterationRows, summarizeExperimentHistoryRow } from '@/utils/uraniumDuringAdapter'
import {
  createLaunchedUraniumDemoExperiment,
  createUraniumDemoSeed,
  deepClone,
  normalizeUraniumDemoState
} from '@/views/SCnet/mock/uraniumDemoLab'

const STORAGE_KEY = 'scnet_uranium_demo_lab_state'
const FALLBACK_SELECTED_KEY = 'scnet_uranium_demo_selected'

function safeParse(raw, fallback) {
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function nowText() {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function cloneTaskRows(rows = []) {
  return deepClone(Array.isArray(rows) ? rows : [])
}

function sortTasks(rows = []) {
  const orderMap = {
    running: 0,
    pending: 1,
    completed: 2,
    failed: 3,
    cancelled: 4
  }

  return [...rows].sort((a, b) => {
    const orderDiff = (orderMap[a.status] ?? 9) - (orderMap[b.status] ?? 9)
    if (orderDiff !== 0) return orderDiff
    return String(b.created_at || '').localeCompare(String(a.created_at || ''))
  })
}

export const useUraniumDemoStore = defineStore('scnetUraniumDemo', () => {
  const initialized = ref(false)
  const launchCount = ref(0)
  const experiments = ref({})
  const taskRowsRaw = ref([])
  const selectedExperimentId = ref(localStorage.getItem(FALLBACK_SELECTED_KEY) || localStorage.getItem('selectedExperimentId') || '')
  const statistics = ref(null)

  const loading = ref({
    history: false,
    statistics: false,
    experiment: false
  })

  function persist() {
    const payload = {
      launchCount: launchCount.value,
      experiments: experiments.value,
      taskRows: taskRowsRaw.value,
      selectedExperimentId: selectedExperimentId.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    localStorage.setItem(FALLBACK_SELECTED_KEY, selectedExperimentId.value || '')
    localStorage.setItem('selectedExperimentId', selectedExperimentId.value || '')
    writeScnetActiveContext({ experimentId: selectedExperimentId.value || '' })
  }

  function ensureSelected() {
    if (selectedExperimentId.value && experiments.value[selectedExperimentId.value]) return
    const completed = taskRowsRaw.value.find((row) => row.status === 'completed' && row.experiment_id && experiments.value[row.experiment_id])
    selectedExperimentId.value = completed?.experiment_id || Object.keys(experiments.value)[0] || ''
  }

  function hydrateFromStorage() {
    const cached = safeParse(localStorage.getItem(STORAGE_KEY), null)
    if (cached?.experiments && cached?.taskRows) {
      const normalized = normalizeUraniumDemoState(cached)
      experiments.value = normalized.experiments
      taskRowsRaw.value = cloneTaskRows(normalized.taskRows)
      launchCount.value = Number(normalized.launchCount || 0)
      selectedExperimentId.value = normalized.selectedExperimentId || selectedExperimentId.value
      return
    }

    const seed = normalizeUraniumDemoState(createUraniumDemoSeed())
    experiments.value = seed.experiments
    taskRowsRaw.value = cloneTaskRows(seed.taskRows)
    launchCount.value = Number(seed.launchCount || 0)
    selectedExperimentId.value = seed.selectedExperimentId || selectedExperimentId.value
  }

  function updateStatistics() {
    const completedRows = taskRowsRaw.value.filter((item) => item.status === 'completed')
    const completedExperiments = completedRows
      .map((item) => experiments.value[item.experiment_id])
      .filter(Boolean)
    const avgCost = completedExperiments.length
      ? completedExperiments.reduce((sum, item) => sum + Number(item.summary?.avg_cost_usd_kgU || 0), 0) / completedExperiments.length
      : null
    const avgRisk = completedExperiments.length
      ? completedExperiments.reduce((sum, item) => sum + Number(item.summary?.avg_risk_exposure || 0), 0) / completedExperiments.length
      : null
    const avgInventory = completedExperiments.length
      ? completedExperiments.reduce((sum, item) => sum + Number(item.summary?.final_inventory_coverage_years || 0), 0) / completedExperiments.length
      : null

    statistics.value = {
      total_experiments: taskRowsRaw.value.length,
      completed_experiments: completedRows.length,
      running_experiments: taskRowsRaw.value.filter((item) => item.status === 'running').length,
      pending_experiments: taskRowsRaw.value.filter((item) => item.status === 'pending').length,
      avg_cost_usd_kgU: avgCost,
      avg_risk_exposure: avgRisk,
      avg_inventory_coverage_years: avgInventory
    }
  }

  async function ensureInitialized() {
    if (initialized.value) {
      ensureSelected()
      updateStatistics()
      return true
    }

    hydrateFromStorage()
    ensureSelected()
    updateStatistics()
    initialized.value = true
    persist()
    return true
  }

  const taskRows = computed(() => sortTasks(taskRowsRaw.value))

  const history = computed(() => {
    return taskRows.value
      .filter((item) => item.status === 'completed' && item.experiment_id && experiments.value[item.experiment_id])
      .map((item) => {
        const experiment = experiments.value[item.experiment_id]
        const summaryRow = summarizeExperimentHistoryRow(experiment)
        return {
          ...summaryRow,
          task_id: item.task_id,
          session_id: item.session_id || '',
          status: 'completed',
          created_at: item.created_at,
          started_at: item.started_at,
          completed_at: item.completed_at || summaryRow.completed_at,
          result_path: item.result_path || `results/uranium_during_${experiment.experiment_id}.json`,
          summary: deepClone(experiment.summary || {}),
          scenario_context: deepClone(experiment.scenario_context || {})
        }
      })
  })

  const selectedExperiment = computed(() => {
    return experiments.value[selectedExperimentId.value] || null
  })

  function setSelectedExperiment(id = '') {
    selectedExperimentId.value = String(id || '')
    ensureSelected()
    persist()
  }

  async function loadExperiment(id = '') {
    await ensureInitialized()
    const targetId = String(id || selectedExperimentId.value || '').trim()
    if (!targetId || !experiments.value[targetId]) return null
    loading.value.experiment = true
    try {
      setSelectedExperiment(targetId)
      return deepClone(experiments.value[targetId])
    } finally {
      loading.value.experiment = false
    }
  }

  async function reloadSelectedExperiment() {
    return loadExperiment(selectedExperimentId.value)
  }

  function resolveTaskExperimentId(task) {
    return String(
      task?.experiment_id
      || task?.experimentId
      || task?.params?.experiment_id
      || task?.params?.experimentId
      || ''
    ).trim()
  }

  function getExperimentByTask(task) {
    const experimentId = resolveTaskExperimentId(task)
    return experimentId ? experiments.value[experimentId] || null : null
  }

  function getTaskIterations(task) {
    const experiment = getExperimentByTask(task)
    return experiment ? buildIterationRows(experiment) : []
  }

  function getTaskMetrics(task) {
    const experiment = getExperimentByTask(task)
    return deepClone(experiment?.summary || null)
  }

  function getRunningProgress() {
    const running = taskRows.value.find((item) => item.status === 'running')
    if (!running?.mock_progress) {
      return {
        is_running: false,
        status: 'idle',
        completed: 0,
        total: 0,
        current_iteration: 0,
        elapsed_time: 0,
        estimated_remaining: null,
        percentage: 0,
        current_task: '',
        current_parameters: null,
        next_parameters: null,
        current_param_items: [],
        next_param_items: []
      }
    }

    const payload = deepClone(running.mock_progress)
    const currentParameters = payload.current_parameters || {}
    const nextParameters = payload.next_parameters || {}

    return {
      ...payload,
      current_param_items: Object.entries(currentParameters).map(([key, value]) => ({ key, value: String(value) })),
      next_param_items: Object.entries(nextParameters).map(([key, value]) => ({ key, value: String(value) }))
    }
  }

  async function fetchHistory() {
    await ensureInitialized()
    loading.value.history = true
    try {
      return history.value
    } finally {
      loading.value.history = false
    }
  }

  async function fetchStatistics() {
    await ensureInitialized()
    loading.value.statistics = true
    try {
      updateStatistics()
      return statistics.value
    } finally {
      loading.value.statistics = false
    }
  }

  async function launchExperiment({ sessionId = '', userGoal = '', draft = null } = {}) {
    await ensureInitialized()
    launchCount.value += 1
    const presetName = String(
      draft?.preset_name
      || draft?.template_name
      || draft?.presetName
      || draft?.templateName
      || 'balanced'
    ).trim() || 'balanced'
    const optimizationIterations = Number(
      draft?.optimization_iterations
      ?? draft?.iterations
      ?? 2
    )
    const timestamp = nowText()
    const { experiment, task } = createLaunchedUraniumDemoExperiment({
      index: launchCount.value,
      sessionId: String(sessionId || '').trim() || 'demo-session-uranium',
      userGoal,
      presetName,
      optimizationIterations: Number.isFinite(optimizationIterations) ? optimizationIterations : 2,
      createdAt: timestamp
    })

    experiments.value = {
      ...experiments.value,
      [experiment.experiment_id]: experiment
    }
    taskRowsRaw.value = [task, ...taskRowsRaw.value]
    setSelectedExperiment(experiment.experiment_id)
    updateStatistics()
    persist()

    return {
      task_id: task.task_id,
      experiment_id: experiment.experiment_id
    }
  }

  function promoteFirstPendingTask() {
    const pendingIndex = taskRowsRaw.value.findIndex((item) => item.status === 'pending')
    if (pendingIndex < 0) return
    const row = taskRowsRaw.value[pendingIndex]
    taskRowsRaw.value[pendingIndex] = {
      ...row,
      status: 'running',
      started_at: nowText(),
      mock_progress: {
        is_running: true,
        status: 'running',
        completed: 1,
        total: 3,
        current_iteration: 2,
        elapsed_time: 720,
        estimated_remaining: 840,
        percentage: 33.3,
        current_task: '年度采购组合回放',
        current_parameters: {
          inventory_target_years: 1.02,
          long_term_contract_weight: 0.61,
          port_diversification_weight: 0.47
        },
        next_parameters: {
          inventory_target_years: 1.08,
          long_term_contract_weight: 0.65,
          port_diversification_weight: 0.53
        }
      }
    }
  }

  async function stopRunningExperiment() {
    await ensureInitialized()
    const runningIndex = taskRowsRaw.value.findIndex((item) => item.status === 'running')
    if (runningIndex < 0) return null

    taskRowsRaw.value[runningIndex] = {
      ...taskRowsRaw.value[runningIndex],
      status: 'completed',
      completed_at: nowText(),
      mock_progress: null
    }
    promoteFirstPendingTask()
    updateStatistics()
    persist()
    return deepClone(taskRowsRaw.value[runningIndex])
  }

  async function cancelTask(taskId) {
    await ensureInitialized()
    const targetId = String(taskId || '')
    taskRowsRaw.value = taskRowsRaw.value.map((item) => {
      if (item.task_id !== targetId) return item
      return {
        ...item,
        status: 'cancelled',
        completed_at: item.completed_at || nowText(),
        mock_progress: null
      }
    })
    updateStatistics()
    persist()
    return true
  }

  return {
    loading,
    statistics,
    history,
    taskRows,
    selectedExperiment,
    selectedExperimentId,
    ensureInitialized,
    fetchHistory,
    fetchStatistics,
    loadExperiment,
    reloadSelectedExperiment,
    setSelectedExperiment,
    launchExperiment,
    stopRunningExperiment,
    cancelTask,
    getExperimentByTask,
    getTaskIterations,
    getTaskMetrics,
    getRunningProgress
  }
})
