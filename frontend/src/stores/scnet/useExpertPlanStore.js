import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getExpertWorkflow } from '@/api/expertWorkflow'
import {
  confirmExpertPlan,
  deleteExpertPlan,
  generateExpertPlan,
  getExpertCatalog,
  getHistoryPlan,
  importExpertPlan,
  listExpertPlans,
  loadExpertPlanExample,
  restoreExpertPlan,
  saveExpertPlan,
} from '@/api/expertPlan'
import { unwrapApiData } from '@/utils/session'

const POLL_INTERVAL_MS = 2000
const LONG_WAIT_HINT_SECONDS = 30
const VERY_LONG_WAIT_HINT_SECONDS = 60
/** 生成已到达终态的状态集合 */
const TERMINAL_GENERATION_STATUSES = ['draft', 'failed', 'timeout', 'superseded']

const clone = (value) => (value === undefined ? value : JSON.parse(JSON.stringify(value)))

/**
 * 方案确认页状态。
 *
 * 关于「正在生成」的判定,这里刻意只认后端状态:
 * 后端在读取路径上会把卡死的 generating 收敛成 timeout,所以只要一直轮询,
 * 前端一定能拿到终态,不需要自己维护一个可能永远清不掉的本地标记。
 *
 * 真实生成与案例方案是两条独立路径:真实生成走 requestId + AbortController,
 * 用户切到案例后,在飞的旧请求会被中止,迟到的后端结果也会被守卫丢弃。
 */
export const useExpertPlanStore = defineStore('expertPlan', () => {
  const sessionId = ref('')
  const plan = ref(null)
  const catalog = ref(null)
  const draft = ref(null)

  const loading = ref(false)
  const submitting = ref(false)
  const saving = ref(false)
  const confirming = ref(false)
  const catalogLoading = ref(false)
  const error = ref('')
  const dirty = ref(false)

  /** 当前这一轮真实生成请求的 requestId */
  const activeRequestId = ref('')
  /** 正在生成时页面需要的等待时长提示 */
  const elapsedSeconds = ref(0)
  const polling = ref(false)

  /** 历史方案(只含真实生成过的) */
  const history = ref([])
  const historyLoading = ref(false)
  const historyError = ref('')
  const viewingHistory = ref(null)
  const viewingLoading = ref(false)
  const importing = ref(false)
  const deletingId = ref('')

  let pollTimer = null
  let pollToken = 0
  let elapsedTimer = null
  let generationStartedAt = 0
  let abortController = null

  const generationStatus = computed(() => plan.value?.generation_status || 'idle')
  const analysisStatus = computed(() => plan.value?.analysis_status || 'pending')
  const planMode = computed(() => plan.value?.plan_mode || 'none')
  const planVersion = computed(() => plan.value?.plan_version || 0)
  const taskId = computed(() => plan.value?.task_id || sessionId.value || '')
  const hasContent = computed(() => Boolean(draft.value))

  /**
   * 正在生成 = 后端方案状态是 generating。
   * 同时兜住「刚发出 POST、还没轮询到」的短暂窗口。
   */
  const isGenerating = computed(
    () => generationStatus.value === 'generating' || submitting.value,
  )
  const isConfirmed = computed(() =>
    ['confirmed', 'running', 'completed'].includes(analysisStatus.value),
  )
  const hasFailedOrTimedOut = computed(() =>
    ['failed', 'timeout', 'superseded'].includes(generationStatus.value),
  )
  /** 只有拿到可用草稿且不在生成中,才允许导出/保存/开始分析 */
  const canUsePlan = computed(() => hasContent.value && !isGenerating.value)
  const canExport = computed(() => canUsePlan.value)

  const planStatusLabel = computed(() => {
    if (analysisStatus.value === 'completed') return '分析完成'
    if (analysisStatus.value === 'failed') return '分析运行失败'
    if (['running', 'confirmed'].includes(analysisStatus.value)) return '已确认'
    const map = {
      idle: '待生成',
      generating: '正在生成',
      draft: planMode.value === 'example'
        ? '示例方案 · 待确认'
        : (planMode.value === 'imported' ? '历史方案 · 待确认' : '待确认'),
      failed: '生成失败',
      timeout: '生成超时',
      superseded: '结果已被替代',
    }
    return map[generationStatus.value] || '待确认'
  })

  /** 长等待提示文案(30s / 60s 两档) */
  const waitHint = computed(() => {
    if (!isGenerating.value) return ''
    if (elapsedSeconds.value >= VERY_LONG_WAIT_HINT_SECONDS) {
      return '生成时间较长，系统仍在处理中。您也可以重新生成或使用方案案例。'
    }
    if (elapsedSeconds.value >= LONG_WAIT_HINT_SECONDS) {
      return '方案生成需要综合匹配数据和模型，您可以继续等待，或点击右上角「方案案例」查看示例方案。'
    }
    return ''
  })

  const elapsedText = computed(() =>
    isGenerating.value ? `已等待 ${elapsedSeconds.value} 秒` : '',
  )

  function bind(id) {
    sessionId.value = String(id || '')
    return sessionId.value
  }

  function startElapsedTimer() {
    stopElapsedTimer()
    generationStartedAt = Date.now()
    elapsedSeconds.value = 0
    elapsedTimer = window.setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - generationStartedAt) / 1000)
    }, 1000)
  }

  function stopElapsedTimer() {
    if (elapsedTimer) window.clearInterval(elapsedTimer)
    elapsedTimer = null
  }

  function stopPolling() {
    if (pollTimer) window.clearInterval(pollTimer)
    pollTimer = null
    polling.value = false
    pollToken += 1
  }

  function abortInFlight() {
    if (abortController) {
      try {
        abortController.abort()
      } catch {
        /* 已结束的请求忽略 */
      }
    }
    abortController = null
  }

  function stopAll() {
    stopPolling()
    stopElapsedTimer()
    abortInFlight()
  }

  function reset() {
    stopAll()
    plan.value = null
    draft.value = null
    error.value = ''
    dirty.value = false
    submitting.value = false
    activeRequestId.value = ''
    elapsedSeconds.value = 0
  }

  function applyPlan(next) {
    if (!next) return null
    plan.value = next
    draft.value = next.content ? clone(next.content) : null
    dirty.value = false
    return next
  }

  /** 后端已到终态时收尾:停轮询、停计时 */
  function settleIfTerminal() {
    if (generationStatus.value === 'generating') return false
    if (!TERMINAL_GENERATION_STATUSES.includes(generationStatus.value)) return false
    stopPolling()
    stopElapsedTimer()
    submitting.value = false
    return true
  }

  async function refresh(id = sessionId.value, { signal } = {}) {
    if (!id) return null
    loading.value = true
    try {
      const response = await getExpertWorkflow(id, signal ? { signal } : {})
      const data = unwrapApiData(response) || response?.data || response
      bind(data.session_id || id)
      const nextPlan = data.plan || null
      const wasDirty = dirty.value
      const localDraft = wasDirty ? clone(draft.value) : null
      applyPlan(nextPlan)
      // 轮询期间用户已经动过草稿时,不能被服务端旧内容覆盖
      if (wasDirty && localDraft && nextPlan) {
        plan.value = { ...nextPlan, content: localDraft }
        draft.value = localDraft
        dirty.value = true
      }
      error.value = ''
      settleIfTerminal()
      return data
    } finally {
      loading.value = false
    }
  }

  async function loadCatalog(id = sessionId.value) {
    if (!id) return null
    catalogLoading.value = true
    try {
      const response = await getExpertCatalog({ session_id: id })
      catalog.value = unwrapApiData(response) || response?.data || response
      return catalog.value
    } finally {
      catalogLoading.value = false
    }
  }

  /**
   * 轮询方案状态。
   * 这里不再用「本地状态是不是 generating」做前置判断——那正是页面卡在
   * 「正在生成」的根因:POST 之后本地 plan 还是旧记录,第一次 tick 就把自己停掉了。
   * 现在只要轮询开着就一定去取,由 refresh() 依据后端状态决定是否收尾。
   */
  function startPolling(id = sessionId.value) {
    stopPolling()
    if (!id) return
    bind(id)
    polling.value = true
    const token = pollToken
    pollTimer = window.setInterval(() => {
      if (token !== pollToken) return
      refresh(id).catch(() => {
        // 单次网络抖动不终止轮询,下一轮继续
      })
    }, POLL_INTERVAL_MS)
  }

  /**
   * 保证方案被真实生成:
   * - 已有草稿且未要求强制重新生成 → 直接返回
   * - 后端已经是 generating → 只接着轮询,不重复发起
   * - 其余情况发起生成并轮询
   */
  async function ensureGenerated({ force = false, providerId, modelId } = {}) {
    if (!sessionId.value) return null
    if (generationStatus.value === 'generating') {
      if (!polling.value) startPolling()
      return plan.value
    }
    if (!force && draft.value && generationStatus.value === 'draft') return plan.value

    // 重新生成:先用新的 requestId 作废旧结果,并中止前端在飞的旧请求
    abortInFlight()
    stopPolling()
    activeRequestId.value = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    submitting.value = true
    error.value = ''
    startElapsedTimer()
    // 乐观置为 generating:页面立刻进入生成态,也避免后续判定读到旧状态
    if (plan.value) {
      plan.value = {
        ...plan.value,
        generation_status: 'generating',
        generation_request_id: activeRequestId.value,
        plan_mode: 'real',
        error: '',
      }
    }
    const controller = new AbortController()
    abortController = controller

    try {
      const response = await generateExpertPlan(
        sessionId.value,
        {
          provider_id: providerId,
          model_id: modelId,
          request_id: activeRequestId.value,
          force,
        },
        { signal: controller.signal },
      )
      const data = unwrapApiData(response) || response?.data || response
      if (data?.request_id) activeRequestId.value = data.request_id
      submitting.value = false
      // 无论后端是 202(已受理) 还是 200(已在生成/已有方案),都靠轮询拿最终状态
      startPolling()
      return plan.value
    } catch (e) {
      submitting.value = false
      if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') {
        // 主动中止(切案例/重新生成/离开页面),不当作失败
        return plan.value
      }
      stopElapsedTimer()
      error.value = e?.message || '启动方案生成失败'
      // POST 失败也要把方案状态落成失败,否则页面会停在生成中
      if (plan.value?.generation_status === 'generating') {
        plan.value = {
          ...plan.value,
          generation_status: 'failed',
          error: error.value,
        }
      }
      throw e
    } finally {
      if (abortController === controller) abortController = null
    }
  }

  async function regenerate(options = {}) {
    return ensureGenerated({ ...options, force: true })
  }

  /**
   * 载入方案案例。
   * 立即中断本轮真实生成的轮询与在飞请求;后端那条大模型请求可以继续跑,
   * 但它回来时会被守卫丢弃,不会覆盖案例内容与版本。
   */
  async function loadExample() {
    if (!sessionId.value) return null
    stopPolling()
    stopElapsedTimer()
    abortInFlight()
    submitting.value = false
    activeRequestId.value = ''
    saving.value = true
    try {
      const response = await loadExpertPlanExample(sessionId.value)
      const next = unwrapApiData(response) || response?.data || response
      applyPlan(next)
      error.value = ''
      return next
    } catch (e) {
      error.value = e?.message || '载入方案案例失败'
      throw e
    } finally {
      saving.value = false
    }
  }

  async function saveDraft() {
    if (!sessionId.value || !draft.value) return null
    saving.value = true
    try {
      const response = await saveExpertPlan(sessionId.value, clone(draft.value))
      const next = unwrapApiData(response) || response?.data || response
      plan.value = next
      dirty.value = false
      return next
    } catch (e) {
      error.value = e?.message || '保存方案失败'
      throw e
    } finally {
      saving.value = false
    }
  }

  async function restoreModelVersion() {
    if (!sessionId.value) return null
    saving.value = true
    try {
      const response = await restoreExpertPlan(sessionId.value)
      const next = unwrapApiData(response) || response?.data || response
      applyPlan(next)
      return next
    } catch (e) {
      error.value = e?.message || '恢复大模型生成版本失败'
      throw e
    } finally {
      saving.value = false
    }
  }

  async function confirm({ providerId, modelId } = {}) {
    if (!sessionId.value) return null
    confirming.value = true
    try {
      const response = await confirmExpertPlan(sessionId.value, {
        content: draft.value ? clone(draft.value) : undefined,
        provider_id: providerId,
        model_id: modelId,
      })
      const data = unwrapApiData(response) || response?.data || response
      if (data?.plan) applyPlan(data.plan)
      stopPolling()
      return data
    } catch (e) {
      error.value = e?.message || '确认方案失败'
      throw e
    } finally {
      confirming.value = false
    }
  }

  /* ---------- 历史方案 ---------- */

  /** 拉取历史方案列表;默认排除当前会话(它已经在页面上) */
  async function loadHistory({ limit = 20 } = {}) {
    historyLoading.value = true
    historyError.value = ''
    try {
      const response = await listExpertPlans({
        limit,
        exclude_session_id: sessionId.value || undefined,
      })
      const data = unwrapApiData(response) || response?.data || response
      history.value = data?.plans || []
      return history.value
    } catch (e) {
      historyError.value = e?.message || '读取历史方案失败'
      throw e
    } finally {
      historyLoading.value = false
    }
  }

  /** 只读查看某条历史方案的完整内容 */
  async function viewHistory(sourceSessionId) {
    viewingLoading.value = true
    try {
      const response = await getHistoryPlan(sourceSessionId)
      const data = unwrapApiData(response) || response?.data || response
      viewingHistory.value = data
      return data
    } catch (e) {
      historyError.value = e?.message || '读取历史方案内容失败'
      throw e
    } finally {
      viewingLoading.value = false
    }
  }

  function clearViewingHistory() {
    viewingHistory.value = null
  }

  /**
   * 删除一条历史方案(后端会一并删掉会话文件,不可恢复)。
   * 成功后立即从列表移除;如果正在查看的正是它,顺带关掉详情。
   */
  async function deleteHistory(sourceSessionId) {
    const target = String(sourceSessionId || '')
    if (!target) return null
    deletingId.value = target
    try {
      const response = await deleteExpertPlan(target)
      const data = unwrapApiData(response) || response?.data || response
      history.value = history.value.filter((item) => item.session_id !== target)
      if (viewingHistory.value?.session_id === target) viewingHistory.value = null
      historyError.value = ''
      return data
    } catch (e) {
      historyError.value = e?.message || '删除历史方案失败'
      throw e
    } finally {
      deletingId.value = ''
    }
  }

  /**
   * 把历史方案载入当前会话。
   * 会先停掉正在进行的真实生成轮询并中止在飞请求,后端也会作废本轮 requestId,
   * 所以载入后不会又被迟到的真实结果覆盖。
   */
  async function importHistory(sourceSessionId) {
    if (!sessionId.value) return null
    stopPolling()
    stopElapsedTimer()
    abortInFlight()
    submitting.value = false
    activeRequestId.value = ''
    importing.value = true
    try {
      const response = await importExpertPlan(sessionId.value, sourceSessionId)
      const data = unwrapApiData(response) || response?.data || response
      if (data?.plan) applyPlan(data.plan)
      error.value = ''
      return data
    } catch (e) {
      error.value = e?.message || '载入历史方案失败'
      throw e
    } finally {
      importing.value = false
    }
  }

  function markDirty() {
    dirty.value = true
  }

  return {
    sessionId, plan, catalog, draft, loading, submitting, saving, confirming, catalogLoading,
    error, dirty, activeRequestId, elapsedSeconds, polling,
    history, historyLoading, historyError, viewingHistory, viewingLoading, importing, deletingId,
    generationStatus, analysisStatus, planMode, planVersion, taskId, hasContent,
    isGenerating, isConfirmed, hasFailedOrTimedOut, canUsePlan, canExport,
    planStatusLabel, waitHint, elapsedText,
    bind, reset, refresh, loadCatalog, startPolling, stopPolling, stopAll,
    ensureGenerated, regenerate, loadExample, saveDraft, restoreModelVersion, confirm, markDirty,
    loadHistory, viewHistory, clearViewingHistory, importHistory, deleteHistory,
  }
})
