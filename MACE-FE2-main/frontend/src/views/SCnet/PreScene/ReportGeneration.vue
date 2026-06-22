<template>
  <div class="report-gen-page">
    <!-- ==================== 左侧：需求确认 + 对话面板 ==================== -->
    <div class="chat-panel">
      <div class="chat-header">
        <div class="header-left">
          <span class="header-icon">🛢️</span>
          <div class="header-text">
            <h3>石油供应链事前报告生成</h3>
            <p>全球石油市场态势研判与风险预警</p>
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
              placeholder="请描述您要分析的石油供应链场景，例如：霍尔木兹海峡封锁对亚洲炼厂的影响、OPEC+减产协议下的油价走势、俄罗斯原油出口制裁的供应链重构..."
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
            <h3>石油供应链事前分析报告</h3>
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
          <div class="empty-icon-wrap">🛢️</div>
          <h3>等待生成</h3>
          <p>点击左侧「生成报告」后，大模型将依次完成以下过程：</p>
          <div class="process-hint">
            <div class="process-step">
              <span class="ps-num">01</span>
              <div>
                <strong>数据筛选与事实梳理</strong>
                <p>从石油供应链知识图谱检索原油产能、炼化节点、运输通道、地缘事件等关键数据</p>
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
              <span>大模型正在加载石油供应链知识库...</span>
            </div>
          </div>
          <div v-if="thinkingChunks.length > 0" class="think-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: thinkingProgress + '%' }"></div>
            </div>
            <span class="progress-label">{{ thinkingProgress >= 100 ? '报告即将呈现...' : '正在生成石油供应链分析报告...' }}</span>
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
            <span class="meta-item">分析指标：<strong>{{ safeStr(predictionMeta.metric_used || 'brent_price') }}</strong></span>
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

const API_ANALYZE_URL = '/SCnet/oilSupplyChain/report/analyze'
const supplyStore = useSupplyChainStore()

const modelOptions = [
  { label: 'Qwen-Turbo（最快）', value: 'qwen-turbo' },
  { label: 'Qwen-Plus（均衡）', value: 'qwen-plus' },
  { label: 'Qwen-Max（最强）', value: 'qwen-max' },
  { label: 'Qwen3-235B-A22B', value: 'qwen3-235b-a22b' },
  { label: 'Qwen3.5-122B-A10B', value: 'qwen3.5-122b-a10b' }
]

const selectedModel = ref('qwen-turbo')
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

// ===== 调用后端石油供应链报告生成 API =====
const callAnalyzeApi = async (message) => {
  abortController = new AbortController()
  const formData = new FormData()
  formData.append('session_id', sessionId.value)
  formData.append('message', message)
  formData.append('model', selectedModel.value)
  formData.append('history', JSON.stringify([]))

  console.log('[OilReportGen] 调用 /SCnet/oilSupplyChain/report/analyze, session:', sessionId.value)

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
    { delay: 400, type: 'think', content: '正在解析用户需求，识别石油供应链关键节点：产油区、炼化中心、运输通道、消费市场...' },
    { delay: 1000, type: 'think', content: '查询石油供应链知识图谱：OPEC产量数据、全球炼厂开工率、主要航线AIS信号、战略储备库存...' },
    { delay: 1800, type: 'output', content: '✓ 已检索 OPEC+ 成员国最新产量配额\n✓ 已获取 Brent/WTI/Dubai 三大基准价格序列\n✓ 已拉取霍尔木兹海峡/马六甲海峡航运数据\n✓ 已提取美国 SPR 及主要消费国商业库存数据' },
    { delay: 2600, type: 'think', content: '正在态势研判：评估地缘风险溢价、供应中断概率、炼厂裂解价差、油轮运力冗余度...' },
    { delay: 3400, type: 'think', content: '识别关键脆弱点：海峡封锁可能性、制裁合规风险、单源依赖度、库存覆盖天数...' },
    { delay: 4200, type: 'output', content: '✓ 地缘风险暴露指数计算完成\n✓ 供应中断概率评估完成\n✓ 价格波动 VaR 测算完成\n✓ 替代供应路径成本对比完成' },
    { delay: 5000, type: 'think', content: '基于研判结果生成分级应对策略：战略储备释放、替代采购源切换、运力保障、长期合同锁定...' },
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
  return userRequirement.value || '全球石油供应链风险分析'
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
      report = rawData.data.report || ''
      currentReportId.value = rawData.data.report_id || ''
      predictionMeta.value = rawData.data.predictionMeta || null
      if (!report) {
        report = rawData.data.answer || rawData.data.result || rawData.data.content || ''
      }
    }
    if (!report && rawData.report) {
      report = rawData.report
    }

    finishThinking()
    await new Promise(r => setTimeout(r, 600))

    if (report && report.length > 80) {
      reportContent.value = safeStr(report)
      reportGenTime.value = new Date().toLocaleString('zh-CN')
      reportGenerated.value = true
      ElMessage.success('石油供应链事前分析报告已生成')
    } else if (report && report.length > 20) {
      reportContent.value = safeStr(report)
      reportGenTime.value = new Date().toLocaleString('zh-CN')
      reportGenerated.value = true
      ElMessage.warning('报告内容较短，建议补充需求细节后重新生成')
    } else {
      throw new Error('后端返回内容过短')
    }
  } catch (err) {
    console.error('石油供应链报告生成失败:', err)
    finishThinking()
    await new Promise(r => setTimeout(r, 300))
    reportContent.value = generateFallbackReport()
    reportGenTime.value = new Date().toLocaleString('zh-CN')
    reportGenerated.value = true
    ElMessage.warning('后端生成失败，已使用本地石油供应链模板')
  } finally {
    isProcessing.value = false
    thinkingChunks.value = []
    thinkingProgress.value = 100
    abortController = null
    await nextTick()
    if (reportBody.value) reportBody.value.scrollTop = 0
  }
}

// ===== 石油供应链主题匹配 =====
const matchTopic = (text) => {
  const t = text.toLowerCase()
  if (/霍尔木兹|海峡|h Strait|波斯湾|伊朗.*油|胡塞|中东.*油|红海.*油/.test(t)) return 'hormuz'
  if (/俄罗斯|制裁.*油|俄油|乌拉尔|urals|价格上限|price cap|g7.*油|乌克兰.*油/.test(t)) return 'russia'
  if (/opec|减产|增产|配额|沙特.*油|欧佩克|产量.*协议/.test(t)) return 'opec'
  if (/新能源|转型|电动|碳中和|碳关税|cbam|生物燃料|氢能|光伏|风电|石油.*需求.*峰值/.test(t)) return 'transition'
  if (/spr|战略.*储备|美国.*释放|库存.*释放|拜登.*油/.test(t)) return 'spr'
  if (/油价|价格.*波动|brent|wti|期货|套期|价差|裂解/.test(t)) return 'price'
  if (/马六甲|苏伊士|好望角|巴拿马|运河|航线|航运|油轮|vlcc|管道.*原油/.test(t)) return 'shipping'
  return 'default'
}

// ===== 石油供应链本地兜底报告模板 =====
const generateFallbackReport = () => {
  const query = userRequirement.value || '全球石油供应链风险分析'
  const topics = {
    // 场景1：霍尔木兹海峡危机
    hormuz: {
      riskLevel: '极高危', riskScore: 92,
      facts: [
        '霍尔木兹海峡每日通过约2000万桶原油，占全球海运石油的30%和全球石油消费的21%',
        '近期伊朗革命卫队扣押多艘过境油轮，美国第五舰队加强海湾地区巡逻频率至每日12架次',
        '战争附加险费率已从船舶价值的0.05%飙升至0.8%，单次过境保费增加约$45万',
        '沙特阿美已启动东-西管道（East-West Pipeline）备输方案，最大日输量500万桶绕过海峡',
        '阿联酋Fujairah港口替代装船能力已达280万桶/日，但库容利用率已超85%',
        '国际能源署（IEA）警告：若海峡完全封锁超30天，全球油价可能突破$150/桶'
      ],
      analysis: '霍尔木兹海峡是石油供应链的"单点故障"高发区。当前地缘冲突升级使海运保险成本与过境风险同步上升。替代通道（东西管道+Fujairah港）可覆盖约40%的运量，但剩余60%仍需经海峡。亚洲买家（占海峡出口的76%）面临最大供应中断风险。短期替代方案成本将增加30-50%，长期需加速中东以外供应源多元化。',
      solutions: [
        { title: '启动战略石油储备(SPR)应急释放预案', urgency: '立即', owner: '能源安全委员会', effect: '覆盖60-90天供应缺口' },
        { title: '加速评估非洲及美洲替代原油采购', urgency: '短期', owner: '原油采购部', effect: '降低中东依赖度15-20%' },
        { title: '锁定VLCC远期运力合约+战争险', urgency: '立即', owner: '物流与贸易部', effect: '锁定运价避免现货市场波动' },
        { title: '建立石油供应链地缘风险预警平台', urgency: '中期', owner: '风控中心', effect: '提前2-4周预判供应中断' }
      ]
    },
    // 场景2：俄罗斯制裁
    russia: {
      riskLevel: '高危', riskScore: 78,
      facts: [
        'G7+欧盟对俄罗斯原油实施$60/桶价格上限，乌拉尔原油实际成交价约$52-58/桶，折价幅度15-25%',
        '俄罗斯原油出口量未明显下降，但出口结构从欧洲转向亚洲（印度和中国占俄油出口的82%）',
        '东西伯利亚-太平洋管道(ESPO)混合原油升水Dubai达$3-5/桶，成为亚洲买家首选',
        '波罗的海港口装船量激增60%，阿芙拉型油轮运力紧张推动运费上涨40%',
        '欧盟对俄成品油禁令导致柴油/石脑油全球贸易流重构，欧洲柴油库存降至历史低位',
        '美国财政部OFAC加大二级制裁执法力度，涉及俄油贸易的非G7实体面临合规风险'
      ],
      analysis: '俄罗斯石油供应链处于"受制裁但未出局"的灰色地带。价格上限机制实质性地压低了俄油收入但未切断供应。物流重构（绕航、STS转运、灰色船队）推高整体运输成本。中长期看，俄罗斯面临油田技术维护困难和成熟油田自然衰减，产量可能下降50-100万桶/日。制裁合规风险将从一级蔓延至二级和三级贸易伙伴。',
      solutions: [
        { title: '审查并调整俄油采购合同合规条款', urgency: '立即', owner: '法务合规部', effect: '规避OFAC二级制裁风险' },
        { title: '多元化原油篮子：增加中东/西非/北美份额', urgency: '短期', owner: '战略采购部', effect: '俄油占比降至安全线以下' },
        { title: '建立制裁动态追踪与合规培训体系', urgency: '短期', owner: '合规+风控', effect: '确保全链条合规' },
        { title: '评估北极/远东LNG替代能源的可行性', urgency: '长期', owner: '战略规划部', effect: '中长期能源结构调整' }
      ]
    },
    // 场景3：OPEC减产
    opec: {
      riskLevel: '中危', riskScore: 62,
      facts: [
        'OPEC+在最近部长级会议上决定将自愿减产220万桶/日延长至下一季度',
        '沙特阿美将5月阿拉伯轻质原油OSP上调$0.30/桶，连续第二个月提价',
        'OPEC+整体合规率约82%，伊拉克和哈萨克斯坦超产约30万桶/日',
        '美国页岩油产量持平在1320万桶/日，DUC（已钻未完井）库存降至历史低位',
        '圭亚那、巴西等非OPEC产油国预计2026年合计增产约120万桶/日',
        '全球石油库存降至5年均值以下，OECD商业库存仅覆盖58天消费量'
      ],
      analysis: 'OPEC+减产策略有效支撑了油价但份额面临侵蚀。非OPEC增产正在逐步填补缺口，预计2026年下半年市场转向小幅过剩。沙特面临维持油价与保份额的两难选择。短期油价受地缘溢价支撑，中期需求增速放缓和替代能源普及将削弱OPEC议价权。2027年后可能出现结构性过剩。',
      solutions: [
        { title: '利用当前价格窗口增加商业库存', urgency: '立即', owner: '贸易与储运部', effect: '锁定当前价格降低成本' },
        { title: '密切关注OPEC+月度会议决议并建立情景预案', urgency: '短期', owner: '市场研究部', effect: '提前预判价格拐点' },
        { title: '扩大非OPEC供应源长期协议占比', urgency: '中期', owner: '战略采购', effect: '降低单一供应集团依赖' },
        { title: '建立原油采购成本对冲机制（期货+期权）', urgency: '长期', owner: '财务+贸易部', effect: '平抑价格波动50%以上' }
      ]
    },
    // 场景4：新能源转型
    transition: {
      riskLevel: '中危', riskScore: 55,
      facts: [
        '欧盟碳边境调节机制(CBAM)全面实施，石油化工产品出口欧洲面临碳税成本增加$15-25/吨CO₂',
        'IEA预计全球石油需求将在2030年前达峰，此后以年均1-2%速度下降',
        '中国新能源汽车渗透率突破60%，汽柴油需求增速已降至0.3%接近平台期',
        '多家国际石油公司（BP/Shell/TotalEnergies）将炼化资产减值20-30%，加速向生物燃料和氢能转型',
        '可持续航空燃料(SAF)需求爆发式增长，航空业承诺2030年SAF占燃料消费10%',
        '全球炼厂产能过剩风险加剧，欧洲和东亚部分老旧炼厂面临关停'
      ],
      analysis: '石油行业正处于"需求达峰前"的关键转型期。传统炼化业务利润率持续承压，而新能源基础设施投资回报周期较长。炼化一体化企业和贸易商具有转型优势，纯上游勘探开发企业面临资产搁浅风险。下游加油站、润滑油等终端业务仍有10-15年窗口期，但需提前布局充电/氢能等替代基础设施。',
      solutions: [
        { title: '评估现有炼化资产碳足迹并制定减排路线图', urgency: '立即', owner: 'HSE+生产技术部', effect: '确保CBAM合规降低成本' },
        { title: '加速"油转化"布局：投资SAF和生物柴油产能', urgency: '短期', owner: '战略投资部', effect: '抢占新能源市场份额' },
        { title: '优化加油站网络：部署光储充一体化站点', urgency: '中期', owner: '零售业务部', effect: '终端业务转型升级' },
        { title: '建立碳交易能力与碳资产管理体系', urgency: '中期', owner: '碳资产管理与交易部', effect: '碳风险管理与收益优化' }
      ]
    },
    // 场景5：美国SPR释放
    spr: {
      riskLevel: '中低危', riskScore: 42,
      facts: [
        '美国能源部宣布从SPR中释放3000万桶原油以平抑国内汽油价格',
        'SPR库存已从2022年高点6.38亿桶降至约3.72亿桶，处于40年来较低水平',
        'WTI-Brent价差因SPR释放扩大至-$6.5/桶，刺激美国原油出口至480万桶/日',
        '墨西哥湾沿岸出口终端装船量创历史新高，但港口拥堵导致等泊时间延长至5-7天',
        '对冲基金原油净多头仓位下降至2020年以来低位，市场情绪偏向看空',
        '美国能源部长表示将在WTI低于$70时启动回购补库计划'
      ],
      analysis: 'SPR释放短期有效平抑了价格但削弱了战略储备应对真正危机的能力。低库存环境下，任何供应中断都将引发更剧烈价格波动。SPR回补将在油价下行时提供底部支撑。当前全球石油市场处于"紧平衡但情绪偏弱"状态，供应端OPEC+减产与需求端疲弱预期形成拉锯。',
      solutions: [
        { title: '利用SPR释放窗口以优惠价格补充商业库存', urgency: '立即', owner: '原油贸易部', effect: '降低采购成本3-5%' },
        { title: '评估美国墨西哥湾出口作为替代供应源', urgency: '短期', owner: '战略采购', effect: '增加供应灵活性' },
        { title: '建立库存动态优化模型（价格+季节性+地缘）', urgency: '中期', owner: '供应链优化中心', effect: '库存周转效率提升20%' }
      ]
    },
    // 场景6：航运通道风险
    shipping: {
      riskLevel: '高危', riskScore: 75,
      facts: [
        '也门胡塞武装持续威胁曼德海峡航运安全，约900万桶/日经此通道运输',
        '马六甲海峡每日通过约1600万桶原油及成品油，占中国原油进口的80%',
        'VLCC（超大型油轮）平均日租金飙升至$8.5万/天，较去年同期上涨120%',
        '绕行好望角替代航线增加航程约10-14天，单航次成本增加$150-200万',
        '巴拿马运河因干旱限制通行，油轮需等待12-15天或绕行麦哲伦海峡',
        'AIS数据显示全球"灰色船队"规模达约800艘，占油轮运力的17%'
      ],
      analysis: '全球石油海运通道面临多点威胁：中东的霍尔木兹/曼德海峡、东南亚的马六甲、美洲的巴拿马运河。任何一个通道的长时间中断都将对全球石油供应产生连锁反应。绕行替代方案成本高昂且存在运力瓶颈。"灰色船队"扩张增加了海事安全和环境风险。建议建立全面的通道冗余与应急物流预案。',
      solutions: [
        { title: '绘制关键通道风险地图并制定多情景应急物流方案', urgency: '立即', owner: '物流与供应链部', effect: '缩短中断响应时间至48h内' },
        { title: '增加好望角/麦哲伦绕行预案的运力锁定', urgency: '短期', owner: '海运采购', effect: '保障极端情况下的运输连续性' },
        { title: '扩大租船团队并建立VLCC/Suezmax船队弹性管理', urgency: '短期', owner: '租船部', effect: '运力冗余度提升至15%' },
        { title: '建设数字孪生运输仿真系统', urgency: '中期', owner: '数字化中心', effect: '实时优化航线和成本' }
      ]
    },
    // 场景7：价格波动（默认通用）
    price: {
      riskLevel: '中危', riskScore: 52,
      facts: [
        'Brent原油近月合约围绕$82-88/桶区间波动，300日历史波动率处于65%分位',
        'WTI-Brent价差维持在-$5到-$7/桶宽幅区间，反映美国-国际基本面分化',
        '全球炼厂综合裂解利润同比下降22%，汽油裂差走弱而柴油走强',
        '对冲基金在ICE Brent的净多头持仓减少约18%，看跌期权持仓升至6个月高位',
        '布伦特远期曲线从Back跌至Flat结构，暗示市场对未来供应预期改善',
        '美元走强和全球经济增速放缓对油价形成双重压制'
      ],
      analysis: '原油价格处于高位震荡区间，地缘风险溢价与需求疲弱预期相互博弈。上游企业现金流充裕但勘探投资意愿不足，中游炼化利润承压，下游消费面临电动车替代的结构性威胁。建议企业采取"防守型+机会型"并重的价格风险管理策略，利用当前高波动环境获取套利窗口。',
      solutions: [
        { title: '实施动态套期保值策略，覆盖未来6-12个月敞口', urgency: '立即', owner: '财务与风险部', effect: '锁定炼化利润' },
        { title: '利用Back曲线结构优化库存管理', urgency: '短期', owner: '贸易部', effect: '降低库存持有成本' },
        { title: '建立油价短期预测模型（ML+基本面）', urgency: '中期', owner: '研究部', effect: '预测准确率提升至75%' },
        { title: '培养专业化能源交易团队', urgency: '长期', owner: '人力资源部', effect: '提升交易能力' }
      ]
    },
    // 默认通用
    default: {
      riskLevel: '中低', riskScore: 38,
      facts: [
        '全球石油市场供需基本平衡，OPEC+减产支撑价格但非OPEC增产提供缓冲',
        '国际能源署(IEA)预计2026年全球石油需求增长约110万桶/日，主要由亚洲驱动',
        '全球炼厂平均开工率约82%，较疫情前低4个百分点',
        '全球石油库存维持5年均值附近，OECD库存覆盖天数约60天',
        '全球上游勘探开发资本开支约$5300亿，仍低于2014年峰值'
      ],
      analysis: '当前石油供应链整体运行平稳，但局部风险点（海峡通道、地缘冲突、政策突变）仍是重要不确定性来源。建议企业利用当前窗口期加强韧性建设：提升库存弹性、多元化供应来源、完善应急响应机制。中长期需关注需求达峰后的行业格局重塑。',
      solutions: [
        { title: '实施全链条石油供应链映射与风险评估', urgency: '中期', owner: '供应链管理部', effect: '透明度提升至95%' },
        { title: '建立地缘风险预警与应急响应仪表盘', urgency: '紧迫', owner: '风控中心', effect: '预警时间提前2-4周' },
        { title: '定期开展石油供应链压力测试与桌面推演', urgency: '长期', owner: '业务连续性委员会', effect: '应急成熟度达国际标准' }
      ]
    }
  }

  const t = topics[matchTopic(query)]
  const date = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  return `# 🛢️ 石油供应链事前风险分析报告

**分析主题**：${query}
**生成日期**：${date}
**综合风险指数**：**${t.riskScore}/100**（${t.riskLevel}）
> ⚠️ 本地模板生成，建议连接后端获取精准石油供应链分析。

---

## 一、相关数据筛选与事实梳理

${t.facts.map((f, i) => `${i + 1}. **事实${i + 1}**：${f}  `).join('\n')}

---

## 二、态势研判与风险评估

${t.analysis}

| 评估维度 | 当前评分 | 警戒线 | 状态 |
|---------|---------|-------|------|
| 供应中断概率 | ${t.riskScore}% | 40% | ${t.riskScore > 70 ? '⚠️ 超标' : t.riskScore > 50 ? '⚡ 关注' : '✅ 正常'} |
| 地缘风险暴露 | ${Math.min(95, t.riskScore + 10)}% | 50% | 高于基准 |
| 替代供应可用性 | ${Math.max(20, 100 - t.riskScore - 15)}% | 60% | ${t.riskScore > 70 ? '❌ 不足' : '⚠️ 待完善'} |
| 库存覆盖天数 | ${Math.max(20, 100 - t.riskScore)} 天 | 90天 | ${t.riskScore > 70 ? '❌ 严重不足' : t.riskScore > 50 ? '⚡ 偏低' : '✅ 充足'} |

---

## 三、应对策略与解决方案

| 优先级 | 措施名称 | 紧迫度 | 责任主体 | 预期效果 |
|--------|---------|--------|---------|---------|
${t.solutions.map((s, i) => `| ${i + 1} | ${s.title} | ${s.urgency} | ${s.owner} | ${s.effect} |`).join('\n')}

${t.solutions.map((s, i) => `### ${i + 1}. ${s.title}\n- **紧迫度**：${s.urgency}\n- **责任主体**：${s.owner}\n- **预期效果**：${s.effect}\n`).join('\n')}

---

## 四、结论

当前石油供应链处于 **${t.riskLevel}** 状态。优先行动：

1. **立即**：${t.solutions.filter(s => s.urgency === '立即').map(s => s.title).join('；') || '—'}
2. **短期**：${t.solutions.filter(s => s.urgency === '短期').map(s => s.title).join('；') || '—'}
3. **中期**：${t.solutions.filter(s => s.urgency === '中期').map(s => s.title).join('；')}
4. **长期**：${t.solutions.filter(s => s.urgency === '长期').map(s => s.title).join('；')}

---

> 📊 数据来源：IEA月报 / EIA周报 / Platts价格评估 / Vortexa AIS数据 / OPEC MOMR`
}

const handleModelChange = (val) => { selectedModel.value = val }

const copyReport = async () => {
  try { await navigator.clipboard.writeText(reportContent.value); ElMessage.success('报告已复制到剪贴板') }
  catch { const ta = document.createElement('textarea'); ta.value = reportContent.value; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); ElMessage.success('报告已复制到剪贴板') }
}

const exportReport = () => {
  if (currentReportId.value) {
    const exportUrl = `/SCnet/oilSupplyChain/reports/${currentReportId.value}/export`
    const a = document.createElement('a')
    a.href = exportUrl
    a.download = ''
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    ElMessage.success('报告导出已开始')
  } else {
    const blob = new Blob([reportContent.value], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `石油供应链事前分析报告_${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url); ElMessage.success('报告导出成功')
  }
}

const fetchHistoryReports = async (sid) => {
  historyLoading.value = true
  try {
    const url = sid
      ? `/SCnet/oilSupplyChain/reports?session_id=${encodeURIComponent(sid)}`
      : '/SCnet/oilSupplyChain/reports'
    const res = await fetch(url)
    const data = await res.json()
    if (data.success && data.data) {
      historyReports.value = data.data.reports || []
    }
  } catch (e) {
    console.warn('加载历史报告失败:', e)
    historyReports.value = []
  } finally {
    historyLoading.value = false
  }
}

const deleteHistoryReport = async (reportId) => {
  try {
    const res = await fetch(`/SCnet/oilSupplyChain/reports/${reportId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      historyReports.value = historyReports.value.filter(r => r.report_id !== reportId)
      ElMessage.success('报告已删除')
    } else {
      ElMessage.error(data.message || '删除失败')
    }
  } catch (e) {
    console.error('删除报告失败:', e)
    ElMessage.error('删除失败，请重试')
  }
}

const loadHistoryReport = async (item) => {
  try {
    const res = await fetch(`/SCnet/oilSupplyChain/reports/${item.report_id}`)
    const data = await res.json()
    if (data.success && data.data) {
      reportContent.value = safeStr(data.data.report || '')
      reportGenTime.value = data.data.created_at
        ? new Date(data.data.created_at).toLocaleString('zh-CN')
        : ''
      reportGenerated.value = true
      currentReportId.value = data.data.report_id || item.report_id
      predictionMeta.value = data.data.predictionMeta || null
      userRequirement.value = data.data.user_message || userRequirement.value
      showHistory.value = false
      ElMessage.success('已加载历史报告')
      await nextTick()
      if (reportBody.value) reportBody.value.scrollTop = 0
    }
  } catch (e) {
    console.error('加载报告详情失败:', e)
    ElMessage.error('加载报告失败')
  }
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
  if (val) fetchHistoryReports(sessionId.value && !sessionId.value.startsWith('oil-report-') ? sessionId.value : '')
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
  if (!sessionId.value || sessionId.value.startsWith('oil-report-')) {
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
  if (!userRequirement.value && sessionId.value && !sessionId.value.startsWith('oil-report-')) {
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
