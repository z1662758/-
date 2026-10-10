/**
 * 解析 tofront（Flask ResponseFormatter）统一响应：{ success, data, message }
 * axios 拦截器已返回 response.data，故入参即为该对象。
 */
export function assertApiSuccess (payload, fallbackMessage = '请求失败') {
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
export function unwrapApiData (payload) {
  assertApiSuccess(payload)
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}
