// src/api/scnet/chatAgent.js
// K3-CHAT-1 —— 对话首页 Agent 研判 API(不跳需求分析页)
import request from '@/utils/request'

/** 启动 Agent 任务。立即返回 202 {task_id, conversation_id, status}。 */
export function startAgentChat({ message, conversationId = null, providerId = null, modelId = null, mode = 'agent', phase = 'pre' }) {
  return request.post('/api/agent/chat', {
    message,
    conversation_id: conversationId,
    provider_id: providerId,
    model_id: modelId,
    mode,
    phase,
  })
}

/** 任务状态 + 事件(轮询兜底,afterSeq 增量)。 */
export function getAgentTask(taskId, afterSeq = 0) {
  return request.get(`/api/agent/tasks/${taskId}`, { params: { after_seq: afterSeq } })
}

/** 取消任务。 */
export function cancelAgentTask(taskId) {
  return request.post(`/api/agent/tasks/${taskId}/cancel`)
}

/** provider/model 选项(不含 key)。 */
export function getAgentModels() {
  return request.get('/api/agent/models')
}

// ── K2-PERSIST:历史会话 ────────────────
/** 历史会话列表 */
export function getAgentConversations(limit = 100) {
  return request.get('/api/agent/conversations', { params: { limit } })
}

/** 完整历史会话(含消息与结构化元数据) */
export function getAgentConversation(conversationId) {
  return request.get(`/api/agent/conversations/${conversationId}`)
}

/** 标记某会话最近研判已生成 PDF */
export function markConversationPdf(conversationId, analysisId = null) {
  return request.post(`/api/agent/conversations/${conversationId}/pdf`, { analysis_id: analysisId })
}

/**
 * SSE 订阅 Agent 任务事件流。
 * @returns {{ close: () => void }}
 */
export function streamAgentTask({ taskId, afterSeq = 0, onEvent, onError, onClose }) {
  const controller = new AbortController()
  const url = `/api/agent/tasks/${taskId}/stream?after_seq=${afterSeq}`

  fetch(url, {
    method: 'GET',
    headers: { Accept: 'text/event-stream' },
    signal: controller.signal,
  })
    .then(async (resp) => {
      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => '')
        throw new Error(`HTTP ${resp.status}: ${text || 'no body'}`)
      }
      const reader = resp.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const line = chunk.split('\n').find((l) => l.startsWith('data: '))
          if (!line) continue
          const raw = line.slice(6).trim()
          if (!raw || raw.startsWith(':')) continue // keep-alive
          try {
            const ev = JSON.parse(raw)
            if (typeof onEvent === 'function') onEvent(ev)
          } catch (e) {
            if (typeof onError === 'function') onError(e)
          }
        }
      }
      if (typeof onClose === 'function') onClose()
    })
    .catch((err) => {
      if (err && err.name === 'AbortError') return
      if (typeof onError === 'function') onError(err)
    })

  return { close: () => controller.abort() }
}
