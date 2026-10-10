/**
 * 把后端返回的技术性错误翻译成用户能看懂、能行动的中文。
 *
 * 之前失败卡直接把 requests 的堆栈原文展示给用户:
 * "HTTPSConnectionPool(host='dashscope.aliyuncs.com', port=443): Max retries exceeded
 *  ... SSLError(SSLEOFError(8, '[SSL: UNEXPECTED_EOF_WHILE_READING]...')"
 * 这对使用者没有任何意义,也不知道该做什么。原始错误仍然保留,但只在"技术详情"里。
 */

const RULES = [
  {
    test: /未配置|API Key|api_key/i,
    text: '尚未配置大模型凭据，无法调用模型。请联系管理员完成配置。',
  },
  {
    test: /SSL|SSLEOF|Max retries exceeded|HTTPSConnectionPool|ConnectionError|Connection reset|ProxyError/i,
    text: '暂时无法连接模型服务（网络连接失败）。分析任务本身没有问题，请稍后重试。',
  },
  {
    test: /超时|timeout|timed out/i,
    text: '模型响应超时。可以稍后重试，或先查看案例结果。',
  },
  {
    test: /无法从大模型中解析|JSON/i,
    text: '模型返回的内容格式不正确，本次结果未采用。可以重试，或先查看案例结果。',
  },
  {
    test: /分析流水线超时|流水线/i,
    text: '分析步骤用时过长已中止。可以重试该阶段。',
  },
]

export function friendlyErrorText(error) {
  const raw = String(error || '').trim()
  if (!raw) return ''
  for (const rule of RULES) {
    if (rule.test.test(raw)) return rule.text
  }
  // 已经像中文的(后端自己写的中文错误)直接展示,其余一律给通用说明
  if (/[一-鿿]/.test(raw)) return raw
  return '本阶段执行失败。可以重试该阶段，或先查看案例结果。'
}

/** 是否需要把原始错误收进"技术详情" */
export function hasTechnicalDetail(error) {
  const raw = String(error || '').trim()
  if (!raw) return false
  return /[A-Za-z]/.test(raw) && raw.length > 24
}
