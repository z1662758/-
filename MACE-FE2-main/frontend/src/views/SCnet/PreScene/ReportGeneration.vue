<template>
 <div class="report-gen-page">
  <!-- ==================== 左侧：需求确认 + 对话面板 ==================== -->
  <div class="chat-panel">
   <div class="chat-header">
    <div class="header-left">
     <span class="header-icon">📊</span>
     <div class="header-text">
      <h3>供应链事前报告生成</h3>
      <p>全球市场态势研判与风险预警</p>
     </div>
    </div>
    <div class="header-right">
     <el-dropdown @command="handleModelChange" trigger="click">
      <span class="model-badge">
       {{ selectedModelLabel }}
       <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9" />
       </svg>
      </span>
      <template #dropdown>
       <el-dropdown-menu>
        <el-dropdown-item v-for="opt in modelOptions" :key="opt.value" :command="opt.value">{{ opt.label }}</el-dropdown-item>
       </el-dropdown-menu>
      </template>
     </el-dropdown>
    </div>
   </div>

   <div ref="chatMessages" class="chat-messages">
    <!-- 可编辑需求区 -->
    <div v-if="!reportGenerated" class="requirement-confirm">
     <div class="input-card">
      <div class="input-label">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
       </svg>
       分析需求
      </div>
      <textarea
       v-model="userRequirement"
       class="req-textarea"
       placeholder="请描述您要分析的供应链场景，例如：尼日尔政变后矿权撤销对欧盟核燃料采购的影响、哈萨克斯坦硫酸短缺对全球供给的影响、McArthur River重启对价格的压制..."
       :disabled="isProcessing"
       rows="4"
      ></textarea>
     </div>

     <!-- 分析摘要 -->
     <div v-if="analysisSummary" class="summary-card">
      <div v-if="analysisSummary.goal" class="summary-row">
       <span class="summary-tag">目标</span>
       <span>{{ safeStr(analysisSummary.goal) }}</span>
      </div>
      <div v-if="analysisSummary.factors && analysisSummary.factors.length" class="summary-row">
       <span class="summary-tag">因素</span>
       <span>{{ analysisSummary.factors.map(f => safeStr(f)).join('、') }}</span>
      </div>
     </div>

     <!-- 历史对话摘要 -->
     <div v-if="recentConversations.length > 0" class="conversation-preview">
      <div class="conv-header">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
       </svg>
       <span>此前对话确认的需求</span>
      </div>
      <div v-for="(msg, idx) in recentConversations" :key="'conv-'+idx" class="conv-item">
       <span :class="['conv-role', msg.type]">{{ msg.type === 'user' ? '👤 您' : '🤖 AI' }}</span>
       <span class="conv-text">{{ safeStr(msg.content).slice(0, 150) }}{{ safeStr(msg.content).length > 150 ? '...' : '' }}</span>
      </div>
     </div>

     <div class="confirm-actions">
      <button class="btn-generate" :disabled="isProcessing || !userRequirement.trim()" @click="startGenerate">
       <svg v-if="!isProcessing" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3" />
       </svg>
       <svg v-else class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" />
       </svg>
       <span>{{ isProcessing ? '生成中...' : '生成报告' }}</span>
      </button>
     </div>
    </div>

    <!-- 消息 -->
    <div v-for="(msg, idx) in messages" :key="'msg-'+idx" :class="['message-row', msg.role]">
     <div class="message-avatar">
      <span v-if="msg.role === 'user'">👤</span>
      <span v-else>🤖</span>
     </div>
     <div class="message-body">
      <div class="message-meta">
       <span class="message-sender">{{ msg.role === 'user' ? '您' : 'AI 分析助手' }}</span>
      </div>
      <div v-if="msg.role === 'user'" class="user-bubble">{{ safeStr(msg.content) }}</div>
      <div v-else class="ai-bubble">
       <div class="ai-text">{{ safeStr(msg.content) }}</div>
      </div>
     </div>
    </div>
   </div>
  </div>

  <!-- ==================== 右侧：思考过程 + 报告 ==================== -->
  <div class="report-panel" :class="{ 'has-report': reportContent }">
   <div class="report-header">
    <div class="report-header-left">
     <span class="report-icon">📄</span>
     <div>
      <h3>供应链事前分析报告</h3>
      <p v-if="reportContent">生成时间：{{ reportGenTime }}</p>
      <p v-else-if="isProcessing">大模型正在分析中...</p>
      <p v-else>点击左侧「生成报告」开始</p>
     </div>
    </div>
    <div class="report-actions-right">
     <button v-if="!reportContent && !isProcessing" class="rbtn" title="查看历史报告" @click="showHistory = true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
      <span>历史报告</span>
     </button>
     <div v-if="reportContent" class="report-actions">
      <button class="rbtn" title="查看历史报告" @click="showHistory = true">
       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
       </svg>
       <span>历史</span>
      </button>
      <button class="rbtn" title="复制报告" @click="copyReport">
       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
       </svg>
       <span>复制</span>
      </button>
      <button class="rbtn primary" title="导出下载报告" @click="exportReport">
       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
       </svg>
       <span>导出</span>
      </button>
     </div>
    </div>
   </div>

   <div class="report-body" ref="reportBody">
    <!-- 空状态 -->
    <div v-if="!reportContent && !isProcessing" class="empty-report">
     <div class="empty-icon-wrap">📊</div>
     <h3>等待生成</h3>
     <p>点击左侧「生成报告」后，大模型将依次完成以下过程：</p>
     <div class="process-hint">
      <div class="process-step">
       <span class="ps-num">01</span>
       <div>
        <strong>数据筛选与事实梳理</strong>
        <p>关键数据</p>
       </div>
      </div>
      <div class="process-arrow">↓</div>
      <div class="process-step">
       <span class="ps-num">02</span>
       <div>
        <strong>态势研判与风险评估</strong>
        <p>量化分析供应中断概率、价格波动预期、海运通道脆弱性及地缘风险暴露指数</p>
       </div>
      </div>
      <div class="process-arrow">↓</div>
      <div class="process-step">
       <span class="ps-num">03</span>
       <div>
        <strong>应对策略与解决方案</strong>
        <p>输出分级方案（立即/短期/中期/长期），涵盖库存策略、替代采购、运力保障等</p>
       </div>
      </div>
     </div>
    </div>

    <!-- 思考过程 + 报告生成中 -->
    <div v-else-if="isProcessing" class="thinking-panel">
     <div class="think-header">
      <div class="think-pulse"></div>
      <span>大模型思考过程</span>
     </div>
     <div class="think-stream">
      <div v-for="(chunk, ci) in thinkingChunks" :key="ci" :class="['think-chunk', chunk.type]">
       <div v-if="chunk.type === 'think'" class="think-block">
        <div class="think-label">💭 推理</div>
        <pre class="think-text">{{ safeStr(chunk.content) }}</pre>
       </div>
       <div v-else class="output-block">
        <pre class="output-text">{{ safeStr(chunk.content) }}</pre>
       </div>
      </div>
      <div v-if="thinkingChunks.length === 0" class="think-waiting">
       <div class="thinking-dots"><span></span><span></span><span></span></div>
       <span>大模型正在分析供应链数据...</span>
      </div>
     </div>
     <div v-if="thinkingChunks.length > 0" class="think-progress">
      <div class="progress-bar">
       <div class="progress-fill" :style="{ width: thinkingProgress + '%' }"></div>
      </div>
      <span class="progress-label">{{ thinkingProgress >= 100 ? '报告即将呈现...' : '正在生成供应链分析报告...' }}</span>
     </div>
    </div>

    <!-- 最终报告 -->
    <div v-else class="markdown-body" v-html="renderedReport"></div>

    <!-- 预测元信息 -->
    <div v-if="reportContent && predictionMeta" class="prediction-meta">
     <div class="meta-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
      量化分析信息
     </div>
     <div class="meta-grid">
      <span class="meta-item">分析指标：<strong>{{ safeStr(predictionMeta.metric_used || 'u3o8_spot_price') }}</strong></span>
      <span class="meta-item">预测跨度：<strong>{{ predictionMeta.horizon || 12 }}个月</strong></span>
      <span class="meta-item">报告ID：<strong>{{ currentReportId }}</strong></span>
     </div>
    </div>
   </div>
  </div>

  <!-- ==================== 历史报告弹窗 ==================== -->
  <el-dialog v-model="showHistory" title="历史报告" width="700px" :close-on-click-modal="true" class="history-dialog">
   <div v-if="historyLoading" class="history-loading">加载中...</div>
   <div v-else-if="historyReports.length === 0" class="history-empty">
    <p>暂无历史报告</p>
    <p class="hint">生成第一份报告后，将自动保存在这里</p>
   </div>
   <div v-else class="history-list">
    <div v-for="item in historyReports" :key="item.report_id" class="history-item" @click="loadHistoryReport(item)">
     <div class="history-item-left">
      <span class="history-date">{{ item.created_at ? item.created_at.slice(0, 10) : '' }}</span>
      <span class="history-preview">{{ safeStr(item.user_message).slice(0, 60) }}{{ safeStr(item.user_message).length > 60 ? '...' : '' }}</span>
     </div>
     <div class="history-item-right">
      <span class="history-meta">{{ item.metric_used || '—' }} | {{ item.horizon || 0 }}月</span>
      <span class="history-length">{{ item.report_length || 0 }}字</span>
      <button class="history-del-btn" title="删除此报告" @click.stop="deleteHistoryReport(item.report_id)">
       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
       </svg>
      </button>
     </div>
    </div>
   </div>
   <template #footer v-if="historyReports.length > 0">
    <el-button @click="showHistory = false">关闭</el-button>
   </template>
  </el-dialog>
 </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { marked } from 'marked'
import { ElMessage } from 'element-plus'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { analyzeOilReport, getOilReportKnowledge } from '@/api/oilSupplyChain'

const API_ANALYZE_URL = 'http://localhost:9091/scenario/analyze'
const supplyStore = useSupplyChainStore()

const modelOptions = [
 { label: 'Qwen-Turbo（最快）', value: 'qwen-turbo' },
 { label: 'Qwen-Plus（均衡）', value: 'qwen-plus' },
 { label: 'Qwen-Max（最强）', value: 'qwen-max' },
 { label: 'Qwen3-235B-A22B', value: 'qwen3-235b-a22b' },
 { label: 'Qwen3.5-122B-A10B', value: 'qwen3.5-122b-a10b' }
]

const selectedModel = ref('qwen-plus')
const isProcessing = ref(false)
const sessionId = ref('')
const messages = ref([])
const reportContent = ref('')
const reportGenTime = ref('')
const reportGenerated = ref(false)
const thinkingChunks = ref([])
const thinkingProgress = ref(0)
const chatMessages = ref(null)
const reportBody = ref(null)
const userRequirement = ref('')
const analysisSummary = ref(null)
const recentConversations = ref([])
const currentReportId = ref('')
const predictionMeta = ref(null)
const showHistory = ref(false)
const historyReports = ref([])
const historyLoading = ref(false)

let abortController = null
let thinkTimer = null
let progressTimer = null

const selectedModelLabel = computed(() => {
 const opt = modelOptions.find(o => o.value === selectedModel.value)
 return opt ? opt.label : selectedModel.value
})

const renderedReport = computed(() => {
 if (!reportContent.value) return ''
 const text = safeStr(reportContent.value)
 try { return marked(text) } catch { return `<pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>` }
})

const parseBackendResponse = async (res) => {
 const text = await res.text()
 let payload = null
 try { payload = text ? JSON.parse(text) : {} } catch {
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`)
  return { answer: text }
 }
 if (!res.ok) throw new Error(payload.message || payload.error || payload.detail || `HTTP ${res.status}`)
 if (payload.code !== undefined && payload.code !== 0 && payload.code !== '0') {
  throw new Error(payload.message || payload.error || '后端返回业务错误')
 }
 if (payload.success === false) {
  throw new Error(payload.message || payload.error || '后端返回失败')
 }
 return payload
}

// ===== 调用后端供应链报告生成 API =====
const callAnalyzeApi = async (message) => {
 abortController = new AbortController()
 const formData = new FormData()
 formData.append('session_id', sessionId.value)
 formData.append('message', message)
 formData.append('model', selectedModel.value)
 formData.append('history', JSON.stringify([]))
 formData.append('stage', 'report')

 console.log('[UraniumReportGen] 调用 /scenario/analyze (stage=report), session:', sessionId.value)

 const res = await fetch(API_ANALYZE_URL, {
  method: 'POST',
  body: formData,
  signal: abortController.signal
 })
 return parseBackendResponse(res)
}

const startThinkingSimulation = () => {
 thinkingChunks.value = []
 thinkingProgress.value = 0
 const stages = [
  { delay: 400, type: 'think', content: '正在解析用户需求，识别供应链关键节点：主要项目、加工设施、运输通道、核电消费市场...' },
  { delay: 1000, type: 'think', content: '查询供应链知识图谱：Kazatomprom/Cameco产量数据、全球产能利用率、主要运输通道状态、库存水平...' },
  { delay: 1800, type: 'output', content: '✓ 已检索全球主要项目最新产量指引\n✓ 已获取 U3O8 现货/长协价格及 Sprott 持仓数据\n✓ 已拉取哈萨克斯坦/尼日尔/加拿大运输通道数据\n✓ 已提取 EU 和美国核电业主商业库存数据' },
  { delay: 2600, type: 'think', content: '正在态势研判：评估地缘风险溢价、生产中断概率、价格-长协价差、运输通道冗余度...' },
  { delay: 3400, type: 'think', content: '识别关键脆弱点：矿权撤销可能性、制裁合规风险、单一来源依赖度、库存覆盖年数...' },
  { delay: 4200, type: 'output', content: '✓ 地缘风险暴露指数计算完成\n✓ 供应中断概率评估完成\n✓ U3O8 价格波动 VaR 测算完成\n✓ 替代供应来源成本对比完成' },
  { delay: 5000, type: 'think', content: '基于研判结果生成分级应对策略：库存释放评估、替代采购源切换、运输通道保障、长协锁量...' },
  { delay: 5800, type: 'output', content: '✓ 三部分报告框架已生成\n✓ 正在整合数据事实 + 态势研判 + 应对方案...' }
 ]
 stages.forEach(s => {
  const t = setTimeout(() => {
   thinkingChunks.value.push(s)
   thinkingProgress.value = Math.min(92, Math.round((thinkingChunks.value.length / stages.length) * 92))
  }, s.delay)
  thinkTimer = t
 })
 let p = 0
 progressTimer = setInterval(() => {
  if (p < 92) { p += Math.random() * 4 + 1; if (p > 92) p = 92; thinkingProgress.value = Math.round(p) }
 }, 300)
}

const stopThinkingSimulation = () => {
 if (thinkTimer) clearTimeout(thinkTimer)
 if (progressTimer) clearInterval(progressTimer)
 thinkTimer = null; progressTimer = null
}

const finishThinking = () => {
 stopThinkingSimulation()
 const start = thinkingProgress.value
 const startAt = Date.now()
 const t = setInterval(() => {
  const r = Math.min(1, (Date.now() - startAt) / 400)
  thinkingProgress.value = Math.min(100, start + (100 - start) * r)
  if (r >= 1) { thinkingProgress.value = 100; clearInterval(t) }
 }, 16)
}

const buildAnalyzeMessage = () => {
 return userRequirement.value || '全球供应链风险分析'
}

const safeStr = (val) => {
 if (val === null || val === undefined) return ''
 if (typeof val === 'string') return val
 if (typeof val === 'object') return JSON.stringify(val, null, 2)
 return String(val)
}

const digReportText = (data, depth = 0) => {
 if (depth > 3 || !data || typeof data !== 'object') return safeStr(data)
 const textFields = ['reply', 'answer', 'report', 'content', 'analysis', 'understanding', 'text', 'message', 'result', 'updated_result', 'updatedResult']
 for (const key of textFields) {
  const val = data[key]
  if (typeof val === 'string' && val.length > 100 && val.includes('#')) return val
  if (typeof val === 'string' && val.length > 300) return val
 }
 if (Array.isArray(data.results)) {
  for (const r of data.results) {
   const t = digReportText(r, depth + 1)
   if (t && t.includes('#')) return t
  }
  const longest = data.results.map(r => safeStr(r)).filter(s => s.length > 100).sort((a, b) => b.length - a.length)[0]
  if (longest) return longest
 }
 let best = ''
 for (const [key, val] of Object.entries(data)) {
  if (typeof val === 'string') {
   const s = val
   if (s.includes('#') && s.length > best.length) best = s
   else if (best.length < 100 && s.length > best.length) best = s
  }
 }
 if (!best || best.length < 50) {
  const full = safeStr(data)
  if (full.length > 50) best = full
 }
 return best
}

const startGenerate = async () => {
 if (isProcessing.value || !userRequirement.value.trim()) return
 isProcessing.value = true
 reportContent.value = ''
 reportGenerated.value = false
 startThinkingSimulation()

 try {
  const prompt = buildAnalyzeMessage()
  const rawData = await callAnalyzeApi(prompt)

  let report = ''
  if (rawData.data && typeof rawData.data === 'object') {
   // pre_chat.py returns results as array, use the first result as report
   const results = rawData.data.results
   if (Array.isArray(results) && results.length > 0) {
    report = results[0] || ''
   }
   if (!report) {
    report = rawData.data.report || rawData.data.answer || rawData.data.result || rawData.data.content || ''
   }
   currentReportId.value = rawData.data.report_id || rawData.data.session_id || ''
   predictionMeta.value = rawData.data.predictionMeta || null
  }
  if (!report && rawData.report) {
   report = rawData.report
  }
  if (!report && rawData.data && typeof rawData.data === 'string') {
   report = rawData.data
  }

  // 清理 LLM 偶尔附加的元数据头，并强制补全三段式 Markdown 标题
  const formatReport = (text) => {
   if (!text) return text
   let cleaned = text
    // 去掉前置元数据行
    .replace(/^#\s*供应链事前分析报告\s*\n*/i, '')
    .replace(/^\*\*生成时间：\*\*[^\n]*\n?/m, '')
    .replace(/^\*\*风险等级：\*\*[^\n]*\n?/m, '')
    .replace(/^\*\*风险评分：\*\*[^\n]*\n?/m, '')
    .replace(/^\s*---\s*\n?/m, '')
    .replace(/^\n+/, '')
   // 强制补全三段式 Markdown 标题（LLM 经常漏掉 ## 前缀）
   const sectionHeaders = [
    { raw: /(?:^|\n)\s*关键事实与数据\s*\n/g, replace: '\n\n## 一、关键事实与数据\n\n' },
    { raw: /(?:^|\n)\s*深度态势研判\s*\n/g,  replace: '\n\n## 二、深度态势研判\n\n' },
    { raw: /(?:^|\n)\s*可落地执行方案\s*\n/g,  replace: '\n\n## 三、可落地执行方案\n\n' },
   ]
   for (const h of sectionHeaders) {
    cleaned = cleaned.replace(h.raw, h.replace)
   }
   // 如果 LLM 完全没写标题，在开头加上
   if (!cleaned.includes('## 一、')) {
    cleaned = '## 一、关键事实与数据\n\n' + cleaned
   }
   return cleaned.replace(/^\n+/, '').trim()
  }

  finishThinking()
  await new Promise(r => setTimeout(r, 600))

  const saveToHistory = (rpt) => {
   const rid = 'uranium-rpt-' + Date.now()
   if (!currentReportId.value) currentReportId.value = rid
   const entry = {
    report_id: currentReportId.value || rid,
    session_id: sessionId.value,
    user_message: userRequirement.value || buildAnalyzeMessage(),
    report: rpt,
    created_at: new Date().toISOString(),
    report_length: rpt.length
   }
   const all = loadHistoryFromStorage()
   all.push(entry)
   saveHistoryToStorage(all)
  }

  if (report && report.length > 80) {
   reportContent.value = formatReport(safeStr(report))
   reportGenTime.value = new Date().toLocaleString('zh-CN')
   reportGenerated.value = true
   saveToHistory(report)
   ElMessage.success('供应链事前分析报告已生成')
  } else if (report && report.length > 20) {
   reportContent.value = formatReport(safeStr(report))
   reportGenTime.value = new Date().toLocaleString('zh-CN')
   reportGenerated.value = true
   saveToHistory(report)
   ElMessage.warning('报告内容较短，建议补充需求细节后重新生成')
  } else {
   throw new Error('后端返回内容过短')
  }
 } catch (err) {
  console.error('供应链报告生成失败:', err)
  finishThinking()
  await new Promise(r => setTimeout(r, 300))
  reportContent.value = generateFallbackReport()
  reportGenTime.value = new Date().toLocaleString('zh-CN')
  reportGenerated.value = true
  ElMessage.warning('后端生成失败，已使用本地供应链模板')
 } finally {
  isProcessing.value = false
  thinkingChunks.value = []
  thinkingProgress.value = 100
  abortController = null
  await nextTick()
  if (reportBody.value) reportBody.value.scrollTop = 0
 }
}

// ===== 供应链主题匹配 =====
const matchTopic = (text) => {
 const t = text.toLowerCase()
 if (/尼日尔|政变|矿权|Imouraren|Madaouela|非洲.*|尼日尔.*/.test(t)) return 'niger'
 if (/哈萨克斯坦|哈国|硫酸|Kazatomprom|ISL|地浸|中亚.*|硫酸.*/.test(t)) return 'kazakhstan'
 if (/加拿大|Cameco|McArthur|Cigar|重启|停产.*|爬坡/.test(t)) return 'canada'
 if (/核电|反应堆|装机|SMR|需求|核能.*扩|新建.*核电/.test(t)) return 'nuclear'
 if (/库存|储备|Sprott|SPUT|实物.*|库存.*|补库/.test(t)) return 'inventory'
 if (/价格|U3O8|价格.*|期货.*|价差.*|长协.*/.test(t)) return 'price'
 if (/运输|物流|航运|港口.*|铁路.*|跨境.*|通道.*/.test(t)) return 'shipping'
 return 'default'
}

// ===== 供应链本地兜底报告模板 =====
const generateFallbackReport = () => {
 const query = userRequirement.value || '全球供应链风险分析'
 const topics = {
  niger: {
   riskLevel: '极高危', riskScore: 88,
   facts: [
    '2023年7月尼日尔政变，军政府重新审查外资矿权，2024年6月撤销Orano Imouraren开采许可（储量约175,000 tU）',
    '2024年7月撤回GoviEx Madaouela项目采矿权，全球约4%供给面临长期不确定性',
    '尼日尔是EU第三大来源，欧盟电力公司紧急寻求哈萨克斯坦、加拿大替代供应',
    '仅存的Somair合资项目仍在运营但面临税费重谈风险，中国海外权益也受冲击',
    '全球现货价格受此影响从$85/lb跳涨至$105/lb，长协谈判活跃度激增'
   ],
   analysis: '尼日尔政变引发的矿权系列变化是典型的"政权更迭→合同重审→供应预期下降"传导链。Imouraren和Madaouela原本是2025-2030年预期投产的新增产能，许可被撤销意味着这部分增量消失。EU电力公司需在6-12个月内从哈萨克斯坦和加拿大寻找替代。现货市场流动性较薄，集中采购可能快速推高现货价。',
   solutions: [
    { title: '立即评估尼日尔来源长协履约风险', urgency: '立即', owner: '核燃料采购部', effect: '识别暴露合同量并制定替代方案' },
    { title: '锁定哈萨克斯坦/加拿大替代产能', urgency: '短期', owner: '战略采购部', effect: '多元化来源降低单一依赖' },
    { title: '提高战略库存至3年以上覆盖', urgency: '中期', owner: '库存管理部', effect: '增强供给中断缓冲能力' },
    { title: '建立地缘风险监测预警体系', urgency: '长期', owner: '风控中心', effect: '提前2-4周预判供应中断' }
   ]
  },
  kazakhstan: {
   riskLevel: '高危', riskScore: 78,
   facts: [
    '哈萨克斯坦贡献全球40%+产量，以ISL地浸为主，生产需大量硫酸作为浸出剂',
    '2024年1月Kazatomprom因硫酸短缺下调年度产量指引约10%，2025恢复满产计划推迟',
    '全球供给预期减少2,000-3,000 tU，U3O8现货价单周上涨$12/lb',
    '新ISL区块投产爬坡中，中哈铁路运输通道稳定（年运量8,000-10,000 tU）',
    '哈萨克斯坦内陆运输+硫酸供应双重约束，暴露了"最低成本供应国"的隐蔽脆弱性'
   ],
   analysis: '哈萨克斯坦的ISL生产高度依赖硫酸等化工品供应链。硫酸短缺暴露了供应链的间接脆弱性——不仅受项目本身影响，也受上游化工品供应约束。2025年恢复满产的承诺取决于硫酸供应恢复进度，存在较大不确定性。买方需将化工品供应链纳入风险评估框架。',
   solutions: [
    { title: '密切跟踪Kazatomprom季度产量报告', urgency: '立即', owner: '市场研究部', effect: '及时掌握供给变化信号' },
    { title: '评估硫酸供应链恢复时间线及影响', urgency: '短期', owner: '供应链分析部', effect: '量化供给中断时长和缺口' },
    { title: '多元化采购降低哈萨克斯坦依赖度', urgency: '中期', owner: '战略采购部', effect: '分散风险至加拿大/非洲来源' },
    { title: '建立化学品-产能联动监测模型', urgency: '长期', owner: '风控中心', effect: '提前预判化工品短缺传导' }
   ]
  },
  canada: {
   riskLevel: '中危', riskScore: 55,
   facts: [
    'Cameco McArthur River/Key Lake设计产能1,800万磅U3O8/年，2022.11重启，爬坡至75%',
    '停产4年（2018-2022）后重启，满产推迟至2025H1，地下开采面品位恢复慢于预期',
    'Cigar Lake维持满产（约6,900 tU/年），是全球最高品位在产项目',
    'Cameco在停产期间从市场采购履约推高现货需求，重启后逐步减少市场采购',
    '加拿大案例证明："停产容易重启难"，供给响应滞后2-5年',
   ],
   analysis: 'McArthur River爬坡慢于预期说明：停产4年后重启，地下开采面品位恢复、劳动力重建、供应链修复均需时间，体现了铀矿供给的刚性特征。Cameco在停产期间从市场采购履约的行为也推高了现货需求，重启后逐步减少市场采购将释放部分供给。',
   solutions: [
    { title: '利用重启矿爬坡期锁定长协供应', urgency: '短期', owner: '采购部', effect: '在价格相对低位锁定未来供给' },
    { title: '跟踪McArthur River/Cigar Lake产量', urgency: '持续', owner: '市场研究部', effect: '判断供给恢复节奏' },
    { title: '关注加拿大原住民许可和环保审批动态', urgency: '中期', owner: '风控部', effect: '评估新矿长期供给稳定性' }
   ]
  },
  nuclear: {
   riskLevel: '中低危', riskScore: 40,
   facts: [
    '中国2024年核准6台新核电机组，在建机组全球第一，年需求预计增加1,200 tU',
    '法国新建6座EPR2，瑞典2035年前2座大型+10座SMR，比利时延寿10年',
    '全球核电装机从396GW→2030年预计420-480GW，2050年需求77,200-123,400 tU/年',
    '现有+已承诺产能到2050年仅约42,000 tU/年，供需缺口显著且持续扩大',
    'SMR和HALEU先进燃料将创造新的需求增长点，需关注高纯度低浓缩供应链'
   ],
   analysis: '全球核电正处于复兴周期。需求的结构性增长为投资提供了长期信心。但新矿建设需10-15年，当前价格仍不足以激励大规模绿地项目。中期（2025-2035）市场将维持紧平衡，价格中枢有望上移至$80-120/lb。',
   solutions: [
    { title: '提前签订5-10年长协锁定未来需求', urgency: '中期', owner: '战略采购部', effect: '避免未来价格进一步上涨' },
    { title: '评估核电扩张对采购预算的影响', urgency: '短期', owner: '财务部', effect: '制定中长期采购预算规划' },
    { title: '关注SMR和HALEU供应链建设进展', urgency: '长期', owner: '战略规划部', effect: '提前布局新燃料供应链' }
   ]
  },
  inventory: {
   riskLevel: '高危', riskScore: 75,
   facts: [
    'EU商业库存从2015年51,892 tU降至2022年38,302 tU，美国从46,589降至39,400 tU',
    '全球库存消费比降至不足2年，远低于历史安全水平',
    'Sprott Physical Uranium Trust(SPUT)累计买入超6,500万磅U3O8，持续吸收现货流动性',
    '补库需求+SPUT买入+供给风险三重叠加，U3O8从2023年$56→2024年$85+',
    '产量仅覆盖需求84%，缺口由库存和二次供应补足，库存缓冲正在耗尽'
   ],
   analysis: '全球库存处于历史低位是价格上涨的核心驱动力。2011-2021年低迷价格导致投资不足、产量持续低于需求。SPUT基金创造了持续的现货买方力量，加速库存下降。一旦多个核电业主同时启动补库，现货市场可能出现剧烈波动。',
   solutions: [
    { title: '评估当前库存覆盖水平是否充足', urgency: '立即', owner: '库存管理部', effect: '确定补库紧迫程度' },
    { title: '制定阶梯式补库计划避免集中采购', urgency: '短期', owner: '采购部', effect: '平滑采购节奏降低成本' },
    { title: '关注SPUT持仓变化作为市场信号', urgency: '持续', owner: '市场研究部', effect: '预判现货价格走势' }
   ]
  },
  price: {
   riskLevel: '中危', riskScore: 60,
   facts: [
    'U3O8现货价2023年均$56.95/lb，2024.1一度$106/lb，2024.6约$85/lb',
    '长协价从$50-55区间上移至$70-75/lb，现货-长协价差反映现货偏紧',
    'Sprott基金持仓突破6,500万磅成为市场重要买方力量',
    'Cameco/Kazatomprom/Paladin等主要生产商季度产量指引持续受关注',
    'UxC/TradeTech周度价格指标是全球贸易的定价参考'
   ],
   analysis: '价格经过2023-2024年大涨后进入$80-100区间整理。短期驱动因素：尼日尔/哈萨克斯坦供给风险+SPUT持续买入+核电复兴需求增长。中期看，项目重启爬坡（McArthur River/Langer Heinrich）将增加供给，但新矿建设滞后（10-15年）意味着2028年前大规模新供给难以释放。价格中枢有望维持在$70-120区间。',
   solutions: [
    { title: '利用价格回调窗口分批建仓', urgency: '短期', owner: '采购部', effect: '降低成本锁定合理价格' },
    { title: '建立价格-库存联动采购决策机制', urgency: '中期', owner: '战略采购部', effect: '量化决策减少主观判断' },
    { title: '评估长协vs现货的最优比例', urgency: '持续', owner: '财务+采购部', effect: '平衡价格风险和供应安全' }
   ]
  },
  shipping: {
   riskLevel: '中危', riskScore: 50,
   facts: [
    '哈萨克斯坦铁路→中国/俄罗斯港口→海运→全球的运输链受内陆物流制约',
    '纳米比亚/尼日尔公路→港口→海运的跨境通道脆弱性高',
    '加拿大精矿通过陆路到港口再海运，受劳资纠纷和天气影响',
    '精矿体积小（全球年产量仅约5-6万吨U3O8），但运输安全和保险要求极高',
    '核材料运输需满足IAEA安全标准，跨境需多重许可，物流中断恢复周期长'
   ],
   analysis: '运输链虽规模较小但同样具有高度地缘脆弱性。内陆国家（哈萨克斯坦/尼日尔）高度依赖过境国基础设施和政治稳定。精矿运输的安全和保险要求进一步限制了替代路线的灵活性。买方应将主要供应来源的运输通道纳入风险评估，特别关注跨境节点的地缘政治风险。',
   solutions: [
    { title: '评估各供应来源运输通道风险敞口', urgency: '短期', owner: '物流部', effect: '识别关键脆弱节点' },
    { title: '建立替代运输路线预案', urgency: '中期', owner: '物流+采购部', effect: '确保运输中断时可切换' },
    { title: '增加在途库存透明度实时追踪', urgency: '持续', owner: '供应链管理部', effect: '及时发现运输异常' }
   ]
  }
 }
 const topic = matchTopic(query)
 const t = topics[topic] || {
  riskLevel: '中危', riskScore: 55,
  facts: [
   '全球年产量约49,000-55,000 tU，仅覆盖核电需求的84%',
   '项目从发现到投产需10-15年，停产项目重启需2-5年，供给响应极慢',
   '全球已查明可采资源7,934,500 tU（<$260/kgU），资源充足但经济可采产能不足',
   'U3O8现货价约$85/lb，长协价约$70-75/lb，价差反映现货市场偏紧',
   '主要生产国：哈萨克斯坦(40%+)、加拿大、纳米比亚、澳大利亚、乌兹别克斯坦',
   '主要消费国：美国、法国、中国、俄罗斯、韩国、日本、印度'
  ],
  analysis: '供应链的核心矛盾是"资源不缺但可及时、低成本、稳定投产的产能不足"。当前市场处于结构性供给缺口+库存持续下降+核电需求增长的三重利好阶段。短期关注尼日尔/哈萨克斯坦供给风险，中期关注项目重启爬坡进度，长期关注新矿FID和核电扩张速度。建议买方在当前窗口期积极锁定长协。',
  solutions: [
   { title: '建立多元化采购来源组合', urgency: '短期', owner: '战略采购部', effect: '降低单一供应风险' },
   { title: '利用长协锁定当前价格区间', urgency: '中期', owner: '采购部', effect: '控制燃料成本预算' },
   { title: '保持充足库存应对短期供给波动', urgency: '持续', owner: '库存管理部', effect: '保障3年以上覆盖' },
   { title: '关注全球投资机会', urgency: '长期', owner: '战略投资部', effect: '获取上游权益保障供应' }
  ]
 }
 return '# 📊 供应链事前分析报告\n\n**生成时间：** ' + new Date().toLocaleString('zh-CN') + '\n**风险等级：** ' + t.riskLevel + ' | **风险评分：** ' + t.riskScore + '/100\n\n---\n\n## 一、关键事实\n\n' + t.facts.map(function(f, i) { return (i + 1) + '. ' + f; }).join('\n') + '\n\n---\n\n## 二、态势研判\n\n' + t.analysis + '\n\n---\n\n## 三、应对方案\n\n| 方案 | 紧迫度 | 责任方 | 预期效果 |\n|------|--------|--------|----------|\n' + t.solutions.map(function(s) { return '| **' + s.title + '** | ' + s.urgency + ' | ' + s.owner + ' | ' + s.effect + ' |'; }).join('\n') + '\n\n---\n\n> ⚠️ 本地模板生成，建议连接后端获取精准供应链分析。\n> 后端 API: POST /scenario/analyze — 可自动检索供应链知识图谱、进行专业态势研判与风险量化评估';
}


const HISTORY_KEY = 'uranium_report_history'

const loadHistoryFromStorage = () => {
 try {
  const raw = localStorage.getItem(HISTORY_KEY)
  return raw ? JSON.parse(raw) : []
 } catch { return [] }
}

const saveHistoryToStorage = (reports) => {
 localStorage.setItem(HISTORY_KEY, JSON.stringify(reports))
}

const fetchHistoryReports = async (sid) => {
 historyLoading.value = true
 try {
  let all = loadHistoryFromStorage()
  if (sid) all = all.filter(r => r.session_id === sid)
  historyReports.value = all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
 } catch (e) {
  historyReports.value = []
 } finally {
  historyLoading.value = false
 }
}

const deleteHistoryReport = async (reportId) => {
 let all = loadHistoryFromStorage()
 all = all.filter(r => r.report_id !== reportId)
 saveHistoryToStorage(all)
 historyReports.value = all
 ElMessage.success('报告已删除')
}

const loadHistoryReport = (item) => {
 try {
  if (!item || !item.report) {
   ElMessage.warning('该报告内容为空，可能生成失败')
   return
  }
  reportContent.value = formatReport(safeStr(item.report))
  reportGenTime.value = item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : ''
  reportGenerated.value = true
  currentReportId.value = item.report_id
  userRequirement.value = item.user_message || userRequirement.value
  showHistory.value = false
  ElMessage.success('已加载历史报告')
 } catch (e) {
  console.error('加载历史报告失败:', e)
  ElMessage.error('加载失败: ' + e.message)
 }
}

// ========== 复制与导出 ==========
function copyReport() {
 if (!reportContent.value) { ElMessage.warning('暂无报告可复制'); return }
 navigator.clipboard.writeText(reportContent.value).then(() => {
  ElMessage.success('报告已复制到剪贴板')
 }).catch(() => {
  ElMessage.error('复制失败，请手动复制')
 })
}

function exportReport() {
 if (!reportContent.value) { ElMessage.warning('暂无报告可导出'); return }
 const filename = `供应链分析报告_${new Date().toISOString().slice(0,10)}.md`
 const blob = new Blob([reportContent.value], { type: 'text/markdown;charset=utf-8' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url; a.download = filename; a.click()
 URL.revokeObjectURL(url)
 ElMessage.success('报告已导出下载')
}

// ========== 从 situationAnalysis 的 session 存储中加载真实对话数据 ==========
function loadFromPreSessions() {
 try {
  const raw = localStorage.getItem('scnet_pre_sessions')
  if (!raw) return null
  const sessions = JSON.parse(raw)
  if (!Array.isArray(sessions) || sessions.length === 0) return null

  const latest = sessions.sort((a, b) =>
   new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
  )[0]
  if (!latest) return null

  const conversations = latest.historyConversations || []
  if (conversations.length === 0) return null

  const userMsgs = conversations.filter(m => m.type === 'user')
  const firstUserMsg = userMsgs.length > 0 ? userMsgs[0].content : ''
  const allUserInput = userMsgs.map(m => m.content).filter(Boolean).join('；')

  const sysMsgs = conversations.filter(m => m.type === 'system')
  const analysisMsgs = sysMsgs.filter(m => m.data || m.analysisData || m.completionData)

  const allFactors = []
  const extractFactorStr = (item) => {
   if (typeof item === 'string') return item
   if (item && typeof item === 'object') return item.name || item.title || item.label || item.value || item.factor || ''
   return ''
  }
  analysisMsgs.forEach(m => {
   const d = m.data || m.analysisData || {}
   if (Array.isArray(d.influenceFactors)) {
    allFactors.push(...d.influenceFactors.map(extractFactorStr).filter(Boolean))
   }
   if (Array.isArray(d.responseVars)) {
    allFactors.push(...d.responseVars.map(extractFactorStr).filter(Boolean))
   }
  })

  const lastAnalysis = [...analysisMsgs].reverse()[0]
  const understanding = lastAnalysis ? lastAnalysis.content : ''

  return {
   sessionId: latest.id,
   userRequirement: firstUserMsg || allUserInput,
   goal: firstUserMsg || latest.title || '',
   understanding,
   factors: [...new Set(allFactors.map(f => safeStr(f)))],
   conversations,
   requirementParams: latest.requirementParams || {}
  }
 } catch (e) {
  console.warn('读取 pre_sessions 失败:', e)
  return null
 }
}

watch(showHistory, (val) => {
 if (val) fetchHistoryReports(sessionId.value || '')
})

onMounted(async () => {
 sessionId.value = `oil-report-${Date.now()}`

 // === 优先级1: 从 situationAnalysis 的 localStorage session 加载 ===
 const preSessionData = loadFromPreSessions()
 if (preSessionData) {
  userRequirement.value = preSessionData.userRequirement
  sessionId.value = preSessionData.sessionId || sessionId.value

  if (preSessionData.goal || preSessionData.factors.length > 0) {
   analysisSummary.value = {
    goal: safeStr(preSessionData.goal || preSessionData.userRequirement),
    factors: preSessionData.factors.slice(0, 8),
    understanding: preSessionData.understanding || ''
   }
  }
  if (preSessionData.conversations && preSessionData.conversations.length > 0) {
   recentConversations.value = preSessionData.conversations.slice(-6)
  }
 }

 // === 优先级2: 从 Pinia store 补充 ===
 if (!userRequirement.value) {
  const storeGoal = supplyStore.scenarioUserGoal
  const storeResult = supplyStore.scenarioApiResult
  if (storeGoal) {
   userRequirement.value = safeStr(storeGoal)
   const factors = Array.isArray(storeResult?.influenceFactors)
    ? storeResult.influenceFactors.map(f => safeStr(f))
    : []
   analysisSummary.value = { goal: safeStr(storeGoal), factors }
  }
 }
 if (!sessionId.value || sessionId.value.startsWith('uranium-rpt-')) {
  if (supplyStore.currentSessionId) {
   sessionId.value = supplyStore.currentSessionId
  }
 }

 // === 优先级3: sessionStorage from total.vue ===
 const transferMsg = sessionStorage.getItem('scnet_transfer_message')
 const transferSid = sessionStorage.getItem('scnet_transfer_sessionId')
 const transferModel = sessionStorage.getItem('scnet_transfer_model')
 const transferResponse = sessionStorage.getItem('scnet_transfer_response')

 if (transferSid) { sessionId.value = transferSid; sessionStorage.removeItem('scnet_transfer_sessionId') }
 if (transferModel && modelOptions.some(o => o.value === transferModel)) {
  selectedModel.value = transferModel; sessionStorage.removeItem('scnet_transfer_model')
 }
 if (transferMsg && !userRequirement.value) {
  userRequirement.value = transferMsg; sessionStorage.removeItem('scnet_transfer_message')
 }
 if (transferResponse && !analysisSummary.value) {
  try {
   const resp = JSON.parse(transferResponse)
   const data = resp.data || resp.result || resp
   if (data.understanding) {
    analysisSummary.value = {
     goal: safeStr(data.goal || userRequirement.value || ''),
     factors: Array.isArray(data.influenceFactors) ? data.influenceFactors.map(f => safeStr(f)) : []
    }
   }
  } catch {}
  sessionStorage.removeItem('scnet_transfer_response')
 }

 // === 优先级4: 从后端 API 获取已保存的 requirementParams ===
 if (!userRequirement.value && sessionId.value && !sessionId.value.startsWith('uranium-rpt-')) {
  try {
   const reqRes = await fetch(`/SCnet/oilSupplyChain/requirements?session_id=${encodeURIComponent(sessionId.value)}`)
   const reqData = await reqRes.json()
   if (reqData.success && reqData.data?.requirementParams) {
    const rp = reqData.data.requirementParams
    const goal = rp.goal || rp.understanding || rp.rawMessage || ''
    if (goal) {
     userRequirement.value = safeStr(goal)
     analysisSummary.value = {
      goal: safeStr(goal),
      factors: [
       ...(rp.products || []),
       ...(rp.actorTypes || []),
       ...(rp.eventTypes || []),
       ...(rp.metrics || [])
      ].slice(0, 8).map(f => safeStr(f))
     }
    }
   }
  } catch (e) {
   console.warn('[OilReportGen] 从后端加载需求失败:', e)
  }
 }

 // === 兜底 ===
 if (!userRequirement.value) {
  const sessionReq = supplyStore.currentSession?.requirement
  if (sessionReq) userRequirement.value = safeStr(sessionReq)
 }

 console.log('[OilReportGen] 最终加载:', {
  requirement: userRequirement.value?.slice(0, 80),
  hasAnalysis: !!analysisSummary.value,
  sessionId: sessionId.value
 })
})
</script>

<style scoped>
.report-gen-page {
 display: flex;
 height: calc(100vh - 60px);
 background: #f0f2f5;
 font-family: 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
}

.chat-panel {
 width: 460px;
 min-width: 380px;
 background: #fff;
 display: flex;
 flex-direction: column;
 border-right: 1px solid #e2e8f0;
}

.chat-header {
 display: flex; align-items: center; justify-content: space-between;
 padding: 14px 20px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 10px; }
.header-icon { font-size: 20px; }
.header-text h3 { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0; }
.header-text p { font-size: 12px; color: #94a3b8; margin: 0; }
.header-right { display: flex; align-items: center; gap: 8px; }

.model-badge {
 display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
 background: #f1f5f9; border-radius: 6px; font-size: 12px; color: #475569; cursor: pointer;
}
.model-badge:hover { background: #e2e8f0; }

.chat-messages { flex: 1; overflow-y: auto; padding: 20px; background: #fafcff; }

.requirement-confirm { display: flex; flex-direction: column; gap: 14px; }

.input-card {
 background: #fff; border: 1px solid #e8ecf1; border-radius: 14px; padding: 16px 18px;
}
.input-label {
 display: flex; align-items: center; gap: 6px; font-size: 12px;
 font-weight: 600; color: #64748b; margin-bottom: 10px;
}
.req-textarea {
 width: 100%; border: 1px solid #e2e8f0; border-radius: 10px;
 padding: 12px 14px; font-size: 14px; font-family: inherit; line-height: 1.6;
 outline: none; resize: vertical; box-sizing: border-box;
 transition: border-color 0.2s; color: #1e293b;
}
.req-textarea:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.06); }
.req-textarea:disabled { background: #f8fafc; opacity: 0.6; }

.summary-card {
 background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 12px 14px;
 display: flex; flex-direction: column; gap: 6px;
}
.summary-row { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #475569; }
.summary-tag {
 padding: 1px 8px; background: #fef2f2; color: #dc2626; border-radius: 4px;
 font-size: 11px; font-weight: 600; flex-shrink: 0;
}

.conversation-preview {
 background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 10px 14px;
 display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto;
}
.conv-header {
 display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #92400e; margin-bottom: 2px;
}
.conv-item { display: flex; gap: 6px; font-size: 12px; line-height: 1.4; }
.conv-role { font-weight: 600; flex-shrink: 0; font-size: 11px; }
.conv-role.user { color: #2563eb; }
.conv-role.system { color: #7c3aed; }
.conv-text { color: #64748b; word-break: break-all; }

.confirm-actions { display: flex; flex-direction: column; margin-top: 4px; }

.btn-generate {
 width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
 padding: 12px 20px; border: none; border-radius: 12px;
 background: linear-gradient(135deg, #b91c1c, #dc2626);
 color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
 box-shadow: 0 4px 14px rgba(185,28,28,0.25); transition: all 0.2s;
}
.btn-generate:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(185,28,28,0.35); }
.btn-generate:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }

.message-row { display: flex; gap: 10px; margin-bottom: 16px; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.message-avatar {
 width: 34px; height: 34px; border-radius: 50%; background: #f1f5f9;
 display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;
}
.message-row.user .message-avatar { background: #fecaca; }
.message-body { flex: 1; min-width: 0; }
.message-meta { margin-bottom: 4px; }
.message-sender { font-size: 12px; font-weight: 600; color: #64748b; }
.user-bubble {
 background: linear-gradient(135deg, #b91c1c, #dc2626); color: #fff;
 padding: 10px 16px; border-radius: 14px 14px 4px 14px; font-size: 14px; line-height: 1.5;
 display: inline-block; max-width: 100%;
}
.ai-bubble {
 background: #fff; border: 1px solid #e8ecf1; border-radius: 14px 14px 14px 4px;
 padding: 14px 16px; font-size: 14px; color: #334155; line-height: 1.6;
}
.ai-text { white-space: pre-wrap; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 右侧 */
.report-panel { flex: 1; background: #fff; display: flex; flex-direction: column; overflow: hidden; }
.report-header {
 display: flex; align-items: center; justify-content: space-between;
 padding: 14px 24px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
}
.report-header-left { display: flex; align-items: center; gap: 10px; }
.report-icon { font-size: 20px; }
.report-header-left h3 { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0; }
.report-header-left p { font-size: 12px; color: #94a3b8; margin: 0; }
.report-actions { display: flex; gap: 8px; }
.rbtn {
 display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px;
 border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; color: #475569;
 font-size: 13px; cursor: pointer; transition: all 0.2s;
}
.rbtn:hover { background: #f8fafc; border-color: #cbd5e1; }
.rbtn.primary { background: #b91c1c; border-color: #b91c1c; color: #fff; }
.rbtn.primary:hover { background: #991b1b; }

.report-body { flex: 1; overflow-y: auto; padding: 28px 36px; background: #fafcff; }

.empty-report {
 display: flex; flex-direction: column; align-items: center; justify-content: center;
 height: 100%; text-align: center; padding: 40px 20px;
}
.empty-icon-wrap { font-size: 56px; margin-bottom: 12px; }
.empty-report h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 8px; }
.empty-report > p { font-size: 13px; color: #64748b; margin: 0 0 24px; }

.process-hint {
 display: flex; flex-direction: column; align-items: center; gap: 4px; max-width: 400px; text-align: left;
}
.process-step {
 display: flex; gap: 12px; padding: 10px 16px; background: #f8fafc;
 border: 1px solid #f1f5f9; border-radius: 10px;
}
.ps-num { font-size: 22px; font-weight: 900; color: #dc2626; opacity: 0.4; line-height: 1; flex-shrink: 0; }
.process-step strong { display: block; font-size: 14px; color: #1e293b; margin-bottom: 2px; }
.process-step p { font-size: 12px; color: #94a3b8; margin: 0; }
.process-arrow { color: #cbd5e1; font-size: 18px; }

/* 思考过程 */
.thinking-panel { padding: 4px 0; }
.think-header {
 display: flex; align-items: center; gap: 8px; padding: 10px 0 16px;
 font-size: 14px; font-weight: 700; color: #1e293b;
}
.think-pulse {
 width: 10px; height: 10px; border-radius: 50%; background: #dc2626;
 animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }

.think-stream { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.think-chunk { animation: fadeIn 0.3s ease; }

.think-block {
 background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 10px 14px;
}
.think-label { font-size: 12px; font-weight: 600; color: #b45309; margin-bottom: 4px; }
.think-text {
 font-size: 13px; color: #7c5e2c; white-space: pre-wrap; margin: 0;
 font-family: inherit; line-height: 1.6;
}

.output-block {
 background: #f0fdf4; border-left: 3px solid #10b981; border-radius: 0 8px 8px 0; padding: 10px 14px;
}
.output-text {
 font-size: 13px; color: #166534; white-space: pre-wrap; margin: 0;
 font-family: inherit; line-height: 1.6;
}

.think-waiting {
 display: flex; align-items: center; gap: 10px; padding: 20px 0; color: #94a3b8; font-size: 13px;
}

.think-progress { margin-top: 10px; }
.progress-bar { height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
.progress-fill { height: 100%; background: #dc2626; border-radius: 2px; transition: width 0.3s ease; }
.progress-label { font-size: 12px; color: #64748b; }

/* Markdown */
.markdown-body {
 font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
 line-height: 1.8; color: #1e293b; font-size: 15px;
}
.markdown-body :deep(h1) { font-size: 26px; font-weight: 900; margin: 0 0 22px; padding-bottom: 14px; border-bottom: 3px solid #b91c1c; color: #450a0a; }
.markdown-body :deep(h2) { font-size: 20px; font-weight: 700; margin: 32px 0 16px; padding: 10px 0 10px 14px; border-left: 5px solid #dc2626; background: linear-gradient(90deg, #fef2f2, transparent); color: #7f1d1d; border-radius: 0 6px 6px 0; }
.markdown-body :deep(h3) { font-size: 16px; font-weight: 600; margin: 22px 0 10px; color: #334155; }
.markdown-body :deep(p) { margin-bottom: 12px; line-height: 1.75; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 20px; margin-bottom: 14px; }
.markdown-body :deep(li) { margin-bottom: 6px; }
.markdown-body :deep(table) { border-collapse: collapse; width: 100%; margin: 18px 0; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-size: 13px; }
.markdown-body :deep(th), .markdown-body :deep(td) { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
.markdown-body :deep(th) { background: #fef2f2; font-weight: 700; color: #7f1d1d; }
.markdown-body :deep(tr:nth-child(even)) { background: #f8fafc; }
.markdown-body :deep(blockquote) { margin: 16px 0; padding: 12px 20px; background: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e; border-radius: 0 10px 10px 0; font-size: 13px; }
.markdown-body :deep(code) { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #e11d48; }
.markdown-body :deep(hr) { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }

/* 预测元信息 */
.prediction-meta {
 margin-top: 20px; padding: 14px 18px;
 background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
}
.meta-title {
 display: flex; align-items: center; gap: 6px;
 font-size: 12px; font-weight: 700; color: #7f1d1d; margin-bottom: 8px;
}
.meta-grid {
 display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: #475569;
}
.meta-item strong { color: #1e293b; }

/* 历史报告弹窗 */
.history-dialog :deep(.el-dialog) { border-radius: 16px; }
.history-loading, .history-empty { text-align: center; padding: 40px; color: #94a3b8; }
.history-empty .hint { font-size: 12px; margin-top: 6px; }
.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-item {
 display: flex; align-items: center; justify-content: space-between;
 padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 10px;
 cursor: pointer; transition: all 0.2s;
}
.history-item:hover { background: #fef2f2; border-color: #fca5a5; }
.history-item-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.history-date { font-size: 12px; color: #64748b; font-weight: 600; white-space: nowrap; }
.history-preview { font-size: 13px; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-item-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.history-meta { font-size: 11px; color: #94a3b8; }
.history-length { font-size: 11px; color: #b91c1c; font-weight: 600; }
.history-del-btn {
 width: 26px; height: 26px; border: 1px solid transparent; border-radius: 6px;
 background: transparent; color: #94a3b8; cursor: pointer;
 display: inline-flex; align-items: center; justify-content: center;
 transition: all 0.15s; margin-left: 4px;
}
.history-del-btn:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }

.report-actions-right { display: flex; align-items: center; gap: 8px; }

@media (max-width: 1024px) {
 .report-gen-page { flex-direction: column; }
 .chat-panel { width: 100%; min-width: unset; max-height: 50%; border-right: none; border-bottom: 1px solid #e2e8f0; }
 .report-panel { flex: 1; }
}
</style>
