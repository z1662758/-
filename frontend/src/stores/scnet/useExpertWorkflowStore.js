import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getExpertWorkflow, startExpertWorkflow } from '@/api/expertWorkflow'
import { JUDGMENT_MODES } from '@/constants/judgmentModes'
import { unwrapApiData } from '@/utils/session'

const STORAGE_KEY = 'scnet_expert_session_id'
const POLL_INTERVAL_MS = 3000
const MAX_BACKOFF_MS = 30000

/** 专家模式全局进度:方案确认 + 四个分析阶段 */
export const EXPERT_PROGRESS_STEPS = Object.freeze([
  { key: 'plan', label: '方案确认', route: 'planConfirmation' },
  { key: 'judgment', label: '态势研判', route: 'situationJudge' },
  { key: 'prediction', label: '态势预测', route: 'situationResearch' },
  { key: 'report', label: '报告生成', route: 'reportGeneration' },
])

const TERMINAL_WORKFLOW = ['completed', 'failed']

function parseTime(value) {
  if (!value) return 0
  const ms = Date.parse(String(value).replace(' ', 'T'))
  return Number.isNaN(ms) ? 0 : ms
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/**
 * 专家模式真实任务的唯一状态源。
 *
 * 这里只维护「当前用户真实任务」的状态:后台进度、阶段产物、轮询。
 * example(案例包)与 judgmentScope(聚焦/全局)是两个正交的展示维度,
 * 单独存在这里,但切换它们不会影响任何真实任务的运行或轮询。
 */
export const useExpertWorkflowStore = defineStore('expertWorkflow', () => {
  const sessionId = ref(localStorage.getItem(STORAGE_KEY) || '')
  const detail = ref(null)
  const loading = ref(false)
  const error = ref('')

  /** 'live' = 当前用户真实任务;'example' = 已发布的默认案例 */
  const displayMode = ref('live')
  /** 'focused' = 与本次需求相关;'global' = 全局态势 */
  const judgmentScope = ref('focused')
  /**
   * 态势研判的三种研判视角(三个子标签):
   *   'llm'    大模型研判   —— 大模型基于 OSINT/知识库/研判问题的理解层结论
   *   'domain' 领域模型研判 —— 复杂网络模型算出的节点/边/路线风险
   *   'dual'   双驱动研判   —— 领域模型负责计算、大模型负责解释,平台对比融合(默认)
   * 三者共用同一套地图/路线/右侧面板,只切换数据、颜色、结论与分析过程。
   */
  const judgmentMode = ref('dual')

  /** 'idle' | 'polling' | 'stopped' | 'error' */
  const pollingStatus = ref('idle')
  const nowTs = ref(Date.now())
  /** 最后访问过的专家页面,便于"继续当前任务"类入口 */
  const lastVisitedRoute = ref('')

  let pollTimer = null
  let tickTimer = null
  let backoffMs = POLL_INTERVAL_MS
  let failureCount = 0
  let polledSessionId = ''

  const workflow = computed(() => detail.value?.workflow || {})
  const stages = computed(() => workflow.value?.stages || {})
  const artifacts = computed(() => workflow.value?.artifacts || {})
  const plan = computed(() => detail.value?.plan || {})
  const finished = computed(() => TERMINAL_WORKFLOW.includes(workflow.value?.status))

  const workflowStatus = computed(() => workflow.value?.status || 'waiting')
  const currentStage = computed(() => workflow.value?.current_stage || '')
  const startedAt = computed(() => workflow.value?.created_at || '')
  const updatedAt = computed(() => workflow.value?.updated_at || '')
  const planGeneration = computed(() => detail.value?.plan_generation || {})
  /** 后端是否存在真实的方案生成任务(与展示模式无关) */
  const planInFlight = computed(() => Boolean(planGeneration.value?.in_flight))

  function bindSession(id) {
    sessionId.value = id || ''
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }

  function stopPolling() {
    if (pollTimer) window.clearTimeout(pollTimer)
    pollTimer = null
    pollingStatus.value = 'idle'
    polledSessionId = ''
  }

  /** 阶段状态 → 进度浮窗用的状态,plan 步骤由方案记录推导 */
  function progressStatusOf(key) {
    if (key === 'plan') {
      const analysis = plan.value?.analysis_status || 'pending'
      if (plan.value?.confirmed_at || ['confirmed', 'running', 'completed'].includes(analysis)) {
        return 'completed'
      }
      const generation = plan.value?.generation_status || 'idle'
      if (generation === 'generating') return 'running'
      if (['failed', 'timeout', 'superseded'].includes(generation)) return 'failed'
      if (generation === 'draft') return 'running'
      return 'waiting'
    }
    return stages.value?.[key]?.status || 'waiting'
  }

  function stageStatus(key) {
    return stages.value?.[key]?.status || 'waiting'
  }

  /** 进度浮窗的数据:5 步 + 每步时长 */
  const progressSteps = computed(() =>
    EXPERT_PROGRESS_STEPS.map((step) => {
      const status = progressStatusOf(step.key)
      const source = step.key === 'plan' ? plan.value : stages.value?.[step.key] || {}
      const startMs = parseTime(source?.started_at || (step.key === 'plan' ? source?.created_at : ''))
      const endMs = parseTime(source?.completed_at)
      const running = status === 'running'
      const elapsedSeconds = running && startMs
        ? Math.max(0, Math.floor((nowTs.value - startMs) / 1000))
        : (startMs && endMs ? Math.max(0, Math.round((endMs - startMs) / 1000)) : 0)
      return {
        ...step,
        status,
        startedAt: source?.started_at || '',
        completedAt: source?.completed_at || '',
        elapsedSeconds,
        elapsedText: startMs ? formatDuration(elapsedSeconds) : '',
      }
    }),
  )

  const completedCount = computed(
    () => progressSteps.value.filter((s) => s.status === 'completed').length,
  )
  const totalCount = computed(() => progressSteps.value.length)

  const runningStep = computed(
    () => progressSteps.value.find((s) => s.status === 'running') || null,
  )
  const failedStep = computed(
    () => progressSteps.value.find((s) => s.status === 'failed') || null,
  )

  /** 「正在执行：态势研判」 */
  const currentLabel = computed(() => {
    if (failedStep.value) return `已中断：${failedStep.value.label}`
    if (runningStep.value) return `正在执行：${runningStep.value.label}`
    if (completedCount.value === totalCount.value) return '全部分析步骤已完成'
    return '等待开始分析'
  })

  /** 「运行时间 03:42」 */
  const runningElapsedText = computed(() => runningStep.value?.elapsedText || '')

  /** 「已完成 2/5」 */
  const progressText = computed(() => `已完成 ${completedCount.value}/${totalCount.value}`)

  const lastUpdatedText = computed(() => {
    const ms = parseTime(updatedAt.value)
    if (!ms) return '—'
    const diff = Math.max(0, Math.floor((nowTs.value - ms) / 1000))
    if (diff < 60) return `${diff} 秒前`
    return `${Math.floor(diff / 60)} 分钟前`
  })

  /** 方案确认页与各阶段页是否已有真实任务 */
  const hasSession = computed(() => Boolean(sessionId.value))

  /* ---------- 当前活动任务上下文 ---------- */
  const activeSessionId = computed(() => sessionId.value)
  const activeScenario = computed(() => detail.value?.scenario || '')
  const activePlanId = computed(
    () => plan.value?.plan_id || plan.value?.task_id || '',
  )

  function noteVisitedRoute(path) {
    if (path) lastVisitedRoute.value = path
  }

  /**
   * 清空"当前活动任务"上下文(新建分析时调用)。
   *
   * 只清前端状态:不删除后端会话、不删除任何 artifact、不终止还在跑的任务。
   * 旧任务以后仍可从历史方案里重新打开。
   */
  function resetActiveTask() {
    cleanup()
    polledSessionId = ''
    sessionId.value = ''
    localStorage.removeItem(STORAGE_KEY)
    detail.value = null
    error.value = ''
    loading.value = false
    displayMode.value = 'live'
    judgmentScope.value = 'focused'
    judgmentMode.value = 'dual'
    lastVisitedRoute.value = ''
    failureCount = 0
    backoffMs = POLL_INTERVAL_MS
  }

  async function refresh(id = sessionId.value) {
    if (!id) return null
    try {
      const response = await getExpertWorkflow(id)
      const data = unwrapApiData(response) || response?.data || response
      bindSession(data.session_id || id)
      detail.value = data
      error.value = ''
      failureCount = 0
      backoffMs = POLL_INTERVAL_MS
      if (finished.value) {
        pollingStatus.value = 'stopped'
      }
      return data
    } catch (e) {
      failureCount += 1
      error.value = e?.message || '读取专家工作流失败'
      pollingStatus.value = 'error'
      // 网络异常退避,最多 30s,避免打爆后端
      backoffMs = Math.min(POLL_INTERVAL_MS * 2 ** Math.min(failureCount, 4), MAX_BACKOFF_MS)
      throw e
    }
  }

  function scheduleNext() {
    if (pollTimer) window.clearTimeout(pollTimer)
    const token = polledSessionId
    pollTimer = window.setTimeout(async () => {
      pollTimer = null
      if (token !== polledSessionId) return
      try {
        await refresh(polledSessionId)
      } catch {
        /* 失败已在 refresh 里退避,这里继续排下一次 */
      }
      if (token !== polledSessionId) return
      if (finished.value) {
        pollingStatus.value = 'stopped'
        return
      }
      scheduleNext()
    }, backoffMs)
  }

  /**
   * 幂等启动轮询:同一个 session 已经在轮询时不会重复创建定时器。
   * 页面切换不停止轮询,只有任务终态或显式 stopPolling 才停。
   */
  function ensurePolling(id = sessionId.value) {
    if (!id) return
    if (polledSessionId === id && pollTimer && pollingStatus.value === 'polling') return
    if (polledSessionId === id && pollingStatus.value === 'stopped' && finished.value) return
    polledSessionId = id
    bindSession(id)
    pollingStatus.value = 'polling'
    refresh(id)
      .catch(() => {})
      .finally(() => {
        if (finished.value) {
          pollingStatus.value = 'stopped'
          return
        }
        scheduleNext()
      })
    if (!tickTimer) {
      tickTimer = window.setInterval(() => {
        nowTs.value = Date.now()
      }, 1000)
    }
  }

  /** 保存场景设定并创建场景任务;此时不启动正式分析,所以不轮询 */
  async function start(payload) {
    loading.value = true
    error.value = ''
    try {
      const response = await startExpertWorkflow(payload)
      const data = unwrapApiData(response) || response?.data || response
      bindSession(data.session_id)
      detail.value = data
      return data
    } catch (e) {
      error.value = e?.message || '保存场景设定失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  function setDisplayMode(mode) {
    displayMode.value = mode === 'example' ? 'example' : 'live'
  }

  function setJudgmentScope(scope) {
    judgmentScope.value = scope === 'global' ? 'global' : 'focused'
  }

  function setJudgmentMode(mode) {
    judgmentMode.value = JUDGMENT_MODES.includes(mode) ? mode : 'dual'
  }

  function cleanup() {
    stopPolling()
    if (tickTimer) window.clearInterval(tickTimer)
    tickTimer = null
  }

  return {
    sessionId, detail, loading, error,
    displayMode, judgmentScope, judgmentMode, pollingStatus,
    workflow, stages, artifacts, plan, finished,
    workflowStatus, currentStage, startedAt, updatedAt, planGeneration, planInFlight,
    progressSteps, completedCount, totalCount, runningStep, failedStep,
    currentLabel, runningElapsedText, progressText, lastUpdatedText,
    hasSession, lastVisitedRoute,
    activeSessionId, activeScenario, activePlanId,
    bindSession, refresh, ensurePolling, stopPolling, start, cleanup,
    stageStatus, setDisplayMode, setJudgmentScope, setJudgmentMode,
    noteVisitedRoute, resetActiveTask,
  }
})
