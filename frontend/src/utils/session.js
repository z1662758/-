/**
 * SCnet 会话上下文 + 后端响应解析
 *
 * 合并自 apiEnvelope.js + scnetContext.js
 *  - assertApiSuccess / unwrapApiData：解析 Flask ResponseFormatter 的 { success, data, message }
 *  - read/writeScnetActiveContext / resolveScnetSessionId / resolveScnetExperimentId：
 *    管理 localStorage 中的 sessionId / experimentId 上下文
 */

export const SCNET_ACTIVE_CONTEXT_KEY = 'sc_activeContext'

// ---------- API envelope ----------

export function assertApiSuccess(payload, fallbackMessage = '请求失败') {
  if (payload && typeof payload.success === 'boolean' && !payload.success) {
    const msg = payload.message || fallbackMessage
    const err = new Error(msg)
    err.errorCode = payload.error_code
    err.payload = payload
    throw err
  }
  return payload
}

/** 成功时返回 data；若后端未包一层则返回整个 payload */
export function unwrapApiData(payload) {
  assertApiSuccess(payload)
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

// ---------- Session / experiment context ----------

function safeReadJSON(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function readScnetActiveContext() {
  if (typeof window === 'undefined') return { sessionId: '', experimentId: '' }
  const parsed = safeReadJSON(window.localStorage.getItem(SCNET_ACTIVE_CONTEXT_KEY))
  return {
    sessionId: String(parsed?.sessionId || ''),
    experimentId: String(parsed?.experimentId || '')
  }
}

export function writeScnetActiveContext(patch = {}) {
  if (typeof window === 'undefined') return
  const prev = readScnetActiveContext()
  const next = {
    sessionId: patch.sessionId !== undefined ? String(patch.sessionId || '') : prev.sessionId,
    experimentId: patch.experimentId !== undefined ? String(patch.experimentId || '') : prev.experimentId
  }
  window.localStorage.setItem(SCNET_ACTIVE_CONTEXT_KEY, JSON.stringify(next))
}

export function resolveScnetSessionId(preferred = '') {
  const fromPreferred = String(preferred || '').trim()
  if (fromPreferred) return fromPreferred
  if (typeof window === 'undefined') return ''
  const ctx = readScnetActiveContext()
  if (ctx.sessionId) return ctx.sessionId
  return String(window.localStorage.getItem('sc_currentSessionId') || '')
}

export function resolveScnetExperimentId(preferred = '') {
  const fromPreferred = String(preferred || '').trim()
  if (fromPreferred) return fromPreferred
  if (typeof window === 'undefined') return ''
  const ctx = readScnetActiveContext()
  if (ctx.experimentId) return ctx.experimentId
  return String(window.localStorage.getItem('selectedExperimentId') || '')
}
