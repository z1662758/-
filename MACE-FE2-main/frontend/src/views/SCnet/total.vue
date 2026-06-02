<template>
  <div class="supply-chain-container">
    <!-- 粒子动画背景 -->
    <div class="particles">
      <div
        v-for="i in 20"
        :key="i"
        class="particle"
        :style="getParticleStyle(i)"
      ></div>
    </div>

    <div class="content-wrapper">
      <!-- 头部区域 -->
      <div class="header">
        <h1 class="title">供应链</h1>
        <p class="subtitle">描述您的场景，AI 将为您匹配合适的分析阶段</p>
        <div class="title-underline"></div>
      </div>

      <!-- AI 对话输入区（来自 situationAnalysis 初始对话框） -->
      <div class="ai-dialog-section">
        <div class="initial-dialog">
          <div class="dialog-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>

          <h2 class="dialog-title">供应链智能对话</h2>

          <div class="input-container">
            <div class="input-wrapper">
              <input
                ref="initialInput"
                v-model="inputMessage"
                class="message-input"
                placeholder="请输入你想解决的问题是什么？如：我想分析旺季需求上升时，供应商交付不稳定会不会导致缺货。"
                :disabled="isProcessing"
                @keyup.enter="startAnalysis"
              />
              <div class="input-border"></div>
            </div>

            <div class="input-actions">
              <div class="actions-left">
                <el-tooltip content="选择 PDF 作为补充材料" placement="top" effect="light">
                  <button class="upload-btn" :disabled="isProcessing" @click="triggerFileUpload">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="12" y2="12" />
                      <line x1="15" y1="15" x2="12" y2="12" />
                    </svg>
                  </button>
                </el-tooltip>

                <span v-if="selectedFile" class="file-tag">
                  {{ selectedFile.name }}
                  <button class="file-tag-close" @click="selectedFile = null">&times;</button>
                </span>
              </div>

              <div class="actions-right">
                <el-dropdown @command="handleModelChange" trigger="click">
                  <button class="model-select-btn">
                    <span>{{ selectedModelLabel }}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="opt in modelOptions"
                        :key="opt.value"
                        :command="opt.value"
                      >
                        {{ opt.label }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>

                <button
                  class="send-btn"
                  :disabled="isProcessing || !inputMessage.trim()"
                  @click="startAnalysis"
                >
                  <svg v-if="!isProcessing" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <svg v-else class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 分析中 -->
          <div v-if="isProcessing" class="loading-indicator">
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>{{ processingText || '正在调用后端大模型...' }}</p>
          </div>
        </div>
      </div>

      <!-- 分析结果提示 -->
      <div v-if="phaseResult && !isProcessing" class="result-banner" :class="'phase-' + phaseResult.phase">
        <div class="result-info">
          <span class="result-icon">{{ phaseResult.icon }}</span>
          <div class="result-text-group">
            <span class="result-text">{{ phaseResult.phaseName }}</span>
            <span class="result-desc">{{ phaseResult.reason }}</span>
          </div>
        </div>
        <button
          v-if="phaseResult.phase === 'pre'"
          class="jump-to-pre-btn"
          @click="jumpToPrePhase"
        >
          <span>前往事前分析</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      <input
        ref="fileInput"
        type="file"
        style="display: none"
        accept=".pdf"
        @change="handleFileChange"
      />

      <!-- 分割线 -->
      <div class="divider-section">
        <span class="divider-line"></span>
        <span class="divider-text">或直接选择阶段</span>
        <span class="divider-line"></span>
      </div>

      <!-- 卡片网格 -->
      <div class="cards-grid">
        <div
          v-for="(card, index) in cards"
          :key="index"
          class="strategy-card"
          :class="{ 'card-active': phaseResult && phaseResult.phase === card.phaseKey }"
          @click="handleCardClick(index)"
        >
          <div class="card-header">
            <div class="card-icon">{{ card.icon }}</div>
            <h2 class="card-title">{{ card.fullTitle }}</h2>
          </div>
          <p class="card-description">{{ card.desc }}</p>
          <div class="card-slogan">
            <span class="slogan-text">{{ card.slogan }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// ========== 常量 ==========
const PHASE_STORAGE_KEY = 'scnet_phaseSelection'
const PHASE_EVENT = 'scnetPhaseSelectionChanged'
const API_ANALYZE_URL = 'http://localhost:9091/scenario/analyze'

const PHASE_ROUTES = {
  pre: '/home/SCnet/situationAnalysis',
  during: '/home/SCnet/scenarioModeling',
  post: '/home/SCnet/counterfactualExperiment'
}

const PHASE_NAMES = {
  pre: '事前：风险识别与预警',
  during: '事中：应急响应与调度',
  post: '事后：复盘优化与重构'
}

const PHASE_ICONS = {
  pre: '🔍',
  during: '⚡',
  post: '📈'
}

// ========== 卡片数据 ==========
const cards = ref([
  {
    phase: "事前",
    phaseKey: "pre",
    fullTitle: "事前：风险识别与预警",
    desc: "基于供应链全链路数据（供应商、物流、库存、需求），识别潜在中断风险点（地缘政治、自然灾害、需求波动等），进行风险量化评估，提前制定备选方案与安全库存策略。",
    slogan: "先知先觉 · 防患未然",
    icon: "🔍",
    route: "/home/SCnet/situationAnalysis"
  },
  {
    phase: "事中",
    phaseKey: "during",
    fullTitle: "事中：应急响应与调度",
    desc: "当供应链中断事件发生时，快速启动应急机制，动态调配替代供应商、调整物流路线、释放应急库存，实现分钟级响应，最大限度保障业务连续性。",
    slogan: "实时响应 · 精准调度",
    icon: "⚡",
    route: "/home/SCnet/scenarioModeling"
  },
  {
    phase: "事后",
    phaseKey: "post",
    fullTitle: "事后：复盘优化与重构",
    desc: "对供应链中断事件进行深度复盘，分析根因与响应时效，优化供应商评估模型、库存策略与应急预案，构建更具韧性的供应链网络。",
    slogan: "深度复盘 · 韧性重构",
    icon: "📈",
    route: "/home/SCnet/counterfactualExperiment"
  }
])

// ========== 模型选项 ==========
const modelOptions = [
  { label: 'Qwen-Turbo（最快）', value: 'qwen-turbo' },
  { label: 'Qwen-Plus（均衡）', value: 'qwen-plus' },
  { label: 'Qwen-Max（最强）', value: 'qwen-max' },
  { label: 'Qwen3-235B-A22B', value: 'qwen3-235b-a22b' },
  { label: 'Qwen3.5-122B-A10B', value: 'qwen3.5-122b-a10b' }
]

// ========== 状态 ==========
const inputMessage = ref('')
const selectedModel = ref('qwen-turbo')
const selectedFile = ref(null)
const isProcessing = ref(false)
const processingText = ref('')
const sessionId = ref('')
const phaseResult = ref(null)
const fileInput = ref(null)
const initialInput = ref(null)

let abortController = null

const selectedModelLabel = computed(() => {
  const opt = modelOptions.find(item => item.value === selectedModel.value)
  return opt ? opt.label : selectedModel.value
})

// ========== 粒子动画 ==========
const getParticleStyle = (i) => {
  const left = (i * 37) % 100
  const top = (i * 53) % 100
  const delay = (i % 8) * 0.4
  const duration = 5 + (i % 5)
  return {
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`
  }
}

// ========== 文件上传 ==========
const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileChange = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    alert('仅支持选择 PDF 文件')
    event.target.value = ''
    return
  }
  selectedFile.value = file
  event.target.value = ''
}

// ========== 模型选择 ==========
const handleModelChange = (value) => {
  selectedModel.value = value
}

// ========== 导航 ==========
const navigateToPhase = (phase) => {
  localStorage.setItem(PHASE_STORAGE_KEY, phase)
  window.dispatchEvent(new CustomEvent(PHASE_EVENT, { detail: phase }))
  const route = PHASE_ROUTES[phase] || '/home/SCnet/situationAnalysis'
  router.push(route)
}

const handleCardClick = (index) => {
  const card = cards.value[index]
  navigateToPhase(card.phaseKey)
}

// 用户点击"前往事前分析"按钮
const jumpToPrePhase = () => {
  navigateToPhase('pre')
}

// ========== API 调用 ==========
const buildHistoryPayload = () => {
  return []
}

const parseBackendResponse = async (res) => {
  const text = await res.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`)
    return { answer: text }
  }
  if (!res.ok) {
    throw new Error(payload.message || payload.error || payload.detail || `HTTP ${res.status}`)
  }
  if (payload.code !== undefined && payload.code !== 0 && payload.code !== '0') {
    throw new Error(payload.message || payload.error || '后端返回业务错误')
  }
  if (payload.success === false) {
    throw new Error(payload.message || payload.error || '后端返回失败')
  }
  return payload
}

const unwrapResponse = (raw) => {
  if (!raw || typeof raw !== 'object') return {}
  if (raw.data && typeof raw.data === 'object') return raw.data
  if (raw.result && typeof raw.result === 'object') return raw.result
  return raw
}

const callAnalyzeApi = async (message) => {
  abortController = new AbortController()
  const formData = new FormData()
  formData.append('session_id', sessionId.value)
  formData.append('message', message)
  formData.append('model', selectedModel.value)
  formData.append('history', JSON.stringify(buildHistoryPayload()))
  if (selectedFile.value) {
    formData.append('file', selectedFile.value)
  }
  const res = await fetch(API_ANALYZE_URL, {
    method: 'POST',
    body: formData,
    signal: abortController.signal
  })
  return parseBackendResponse(res)
}

// ========== Phase 判断 ==========
const classifyFromLLM = (rawData) => {
  const data = unwrapResponse(rawData)

  // 1. 后端直接返回 phase
  if (data.phase && ['pre', 'during', 'post'].includes(data.phase)) {
    return data.phase
  }

  // 2. 从 LLM 分析文本中判断
  const understanding = (data.understanding || data.analysis || data.summary || '').toLowerCase()
  const goal = (data.goal || data.target || data.objective || '').toLowerCase()

  const subtasks = Array.isArray(data.subtasks || data.tasks)
    ? (data.subtasks || data.tasks).map(t => (typeof t === 'string' ? t : (t.title || t.description || '')))
    : []
  const allText = [understanding, goal, ...subtasks].join(' ')

  // 事中关键词（建模、仿真、应急响应调度等实际操作）
  const duringKw = ['建模', '仿真', '调度', '响应', '应急', 'Agent',
    'simulation', '模拟', '博弈', '想定', '配置', '运行', '实时']
  // 事后关键词（复盘、评估、反事实、优化）
  const postKw = ['复盘', '反事实', 'counterfactual', '根因', '评估报告',
    '实验报告', '干预', '机制分析', '事后', '恢复', '重建']

  // 事前关键词（先检查，给事前加权）
  const preKw = ['事前', '预测', '趋势', '拐点', '周期', '预警', '识别',
    '爬虫', '采集', '数据提取', '本体网络', '需求理解']

  let duringScore = 0, postScore = 0, preScore = 0
  for (const kw of duringKw) {
    if (allText.includes(kw.toLowerCase())) duringScore++
  }
  for (const kw of postKw) {
    if (allText.includes(kw.toLowerCase())) postScore++
  }
  for (const kw of preKw) {
    if (allText.includes(kw.toLowerCase())) preScore++
  }

  // 如果"推演"出现但伴随"事前"→归为事前；单独的"推演"→事中
  if (allText.includes('推演') && !allText.includes('事前')) {
    duringScore++
  }

  // 事前关键词权重高，优先判断
  if (preScore >= 2 && preScore >= duringScore) return 'pre'
  if (duringScore > 1 && duringScore > postScore) return 'during'
  if (postScore > 1 && postScore >= duringScore) return 'post'
  return 'pre'
}

const fallbackClassify = (text) => {
  const preKeywords = ['风险', '预警', '识别', '预测', '趋势', '评估', '事前', '分析', '预防', '隐患', '潜在', '拐点', '周期', '爬虫', '采集', '下半年', '上半年', '未来', '关税', '台风', '风暴', '拥堵', '短缺']
  const duringKeywords = ['中断', '响应', '调度', '应急', '实时', '突发', '故障', '事故', '处理', '替代', '调配', '正在', '当前', '马上']
  const postKeywords = ['复盘', '优化', '重构', '事后', '改进', '根因', '教训', '总结', '恢复', '重建', '已经', '之前']
  let scores = { pre: 0, during: 0, post: 0 }
  for (const kw of preKeywords) { if (text.includes(kw)) scores.pre++ }
  for (const kw of duringKeywords) { if (text.includes(kw)) scores.during++ }
  for (const kw of postKeywords) { if (text.includes(kw)) scores.post++ }
  if (scores.pre >= scores.during && scores.pre >= scores.post) return 'pre'
  if (scores.during >= scores.pre && scores.during >= scores.post) return 'during'
  return 'post'
}

// ========== 核心：分析并跳转 ==========
const startAnalysis = async () => {
  const text = inputMessage.value.trim()
  if (!text || isProcessing.value) return

  isProcessing.value = true
  processingText.value = '正在调用后端大模型...'
  phaseResult.value = null

  if (!sessionId.value) {
    sessionId.value = `scenario-${Date.now()}`
  }

  try {
    const rawData = await callAnalyzeApi(text)
    const data = unwrapResponse(rawData)

    processingText.value = 'AI 正在分析您的需求，匹配合适的分析阶段...'

    // 从 LLM 响应判断阶段
    const phase = classifyFromLLM(rawData)
    const phaseName = PHASE_NAMES[phase]
    const icon = PHASE_ICONS[phase]

    // 提取 LLM 的理解摘要作为原因展示
    const understanding = data.understanding || data.analysis || data.summary || ''
    const reason = understanding
      ? understanding.slice(0, 80) + (understanding.length > 80 ? '…' : '')
      : `根据您的需求描述，AI 已匹配至"${phaseName}"阶段。`

    phaseResult.value = { phase, phaseName, icon, reason }

    // 事前：保存会话数据，待用户确认后再跳转
    if (phase === 'pre') {
      sessionStorage.setItem('scnet_transfer_sessionId', sessionId.value)
      sessionStorage.setItem('scnet_transfer_message', text)
      sessionStorage.setItem('scnet_transfer_model', selectedModel.value)
      sessionStorage.setItem('scnet_transfer_response', JSON.stringify(data))
      // 事前阶段不自动跳转，等待用户点击按钮
    } else {
      // 其他阶段延迟自动跳转
      setTimeout(() => {
        navigateToPhase(phase)
      }, 1500)
    }

  } catch (err) {
    console.error('大模型调用失败:', err)
    // 回退到本地关键词匹配
    const phase = fallbackClassify(text)
    const phaseName = PHASE_NAMES[phase]
    const icon = PHASE_ICONS[phase]

    phaseResult.value = {
      phase,
      phaseName,
      icon,
      reason: `大模型暂未连接，使用本地规则匹配至"${phaseName}"阶段。`
    }

    // 事前也需用户确认，其他阶段自动跳转
    if (phase === 'pre') {
      sessionStorage.setItem('scnet_transfer_sessionId', sessionId.value)
      sessionStorage.setItem('scnet_transfer_message', text)
      sessionStorage.setItem('scnet_transfer_model', selectedModel.value)
    } else {
      setTimeout(() => {
        navigateToPhase(phase)
      }, 2000)
    }
  } finally {
    isProcessing.value = false
  }
}

// ========== 生命周期 ==========
onMounted(() => {
  nextTick(() => {
    initialInput.value?.focus()
  })
})

onUnmounted(() => {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.supply-chain-container {
  height: 100%;
  min-height: 0;
  background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 48%, #eff6ff 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  padding: clamp(0.75rem, 2vh, 1.5rem) clamp(1rem, 2vw, 2rem);
  overflow: hidden;
}

/* 粒子 */
.particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.particle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.22);
  animation: floatParticle linear infinite;
}
@keyframes floatParticle {
  0% { transform: translateY(0) scale(1); opacity: 0.2; }
  50% { transform: translateY(-36px) scale(1.4); opacity: 0.8; }
  100% { transform: translateY(-72px) scale(1); opacity: 0.2; }
}

.content-wrapper {
  max-width: 960px;
  width: 100%;
  max-height: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(0.8rem, 2vh, 1.4rem);
}

/* 头部 */
.header {
  text-align: center;
  flex-shrink: 0;
}
.title {
  font-size: clamp(2rem, 5.5vh, 3rem);
  font-weight: 900;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Segoe UI', sans-serif;
  text-align: center;
  letter-spacing: clamp(4px, 1vw, 10px);
  line-height: 1.12;
  background: linear-gradient(145deg, #3B82F6 0%, #60A5FA 25%, #2563EB 50%, #3B82F6 75%, #60A5FA 100%);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  text-shadow: 0 1px 0 rgba(255,255,255,0.3), 0 2px 0 rgba(0,0,0,0.1), 0 3px 4px rgba(0,0,0,0.12);
  margin-bottom: clamp(0.25rem, 0.6vh, 0.5rem);
}
.subtitle {
  font-size: clamp(0.8rem, 1.4vh, 0.95rem);
  color: #64748B;
  letter-spacing: 1px;
  font-weight: 500;
  margin-bottom: clamp(0.3rem, 0.7vh, 0.5rem);
}
.title-underline {
  width: 80px;
  height: 3px;
  background: linear-gradient(90deg, #2563EB, #38BDF8);
  margin: 0 auto;
  border-radius: 2px;
}

/* AI 对话框 */
.ai-dialog-section {
  flex-shrink: 0;
}
.initial-dialog {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 20px;
  padding: clamp(1.2rem, 3vh, 1.8rem);
  box-shadow: 0 16px 50px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(20px);
  text-align: center;
}
.dialog-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 12px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2563eb, #6366f1);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.2);
}
.dialog-icon svg { width: 26px; height: 26px; }
.dialog-title { font-size: 20px; margin-bottom: 12px; color: #1E293B; }

.input-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 12px 14px;
}
.input-wrapper { position: relative; }
.message-input {
  width: 100%;
  height: 44px;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 0 8px;
  color: #0f172a;
  background: transparent;
}
.message-input::placeholder { color: #94A3B8; }
.message-input:disabled { opacity: 0.55; }
.input-border {
  height: 1px;
  background: linear-gradient(90deg, transparent, #dbeafe, transparent);
}
.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
}
.actions-left, .actions-right { display: flex; align-items: center; gap: 10px; }

.upload-btn {
  width: 34px; height: 34px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.upload-btn:hover:not(:disabled) { border-color: #93c5fd; color: #2563eb; }
.upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.file-tag {
  font-size: 12px;
  color: #2563eb;
  background: #eff6ff;
  padding: 3px 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #bfdbfe;
}
.file-tag-close {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.model-select-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.model-select-btn:hover { border-color: #93c5fd; }

.send-btn {
  width: 36px; height: 36px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.send-btn:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
.send-btn:disabled { background: #cbd5e1; cursor: not-allowed; }

.spinner { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.loading-indicator {
  margin-top: 14px;
  color: #64748b;
  font-size: 13px;
}
.loading-dots {
  display: inline-flex;
  gap: 5px;
  margin-bottom: 6px;
}
.loading-dots span {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #2563eb;
  animation: dotPulse 1s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.15s; }
.loading-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes dotPulse {
  0%, 100% { opacity: 0.25; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-4px); }
}

/* 分析结果横幅 */
.result-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 14px;
  animation: fadeInUp 0.35s ease-out;
  flex-shrink: 0;
}
.result-banner.phase-pre { background: #eff6ff; border-color: #bfdbfe; }
.result-banner.phase-during { background: #fffbeb; border-color: #fde68a; }
.result-banner.phase-post { background: #f5f3ff; border-color: #ddd6fe; }
.result-info { display: flex; align-items: center; gap: 10px; }
.result-text-group { display: flex; flex-direction: column; gap: 2px; }
.result-icon { font-size: 1.2rem; }
.result-text { font-weight: 700; color: #1e293b; }
.result-desc { color: #64748b; font-size: 0.82rem; }

.jump-to-pre-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid #93c5fd;
  background: linear-gradient(135deg, #2563eb, #6366f1);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.jump-to-pre-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 分割线 */
.divider-section {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
.divider-line { flex: 1; height: 1px; background: #e2e8f0; }
.divider-text { font-size: 0.8rem; color: #94a3b8; font-weight: 500; white-space: nowrap; }

/* 卡片网格 */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(0.7rem, 1.3vw, 1.2rem);
  flex-shrink: 0;
}
.strategy-card {
  background: #FFFFFF;
  border: 1px solid #F1F5F9;
  border-radius: clamp(12px, 1.3vw, 18px);
  padding: clamp(0.8rem, 1.5vh, 1.2rem) clamp(0.7rem, 1.1vw, 1rem);
  transition: all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: clamp(170px, 24vh, 240px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}
.strategy-card:hover {
  transform: translateY(-3px);
  border-color: #CBD5E1;
  box-shadow: 0 10px 20px -8px rgba(0,0,0,0.08);
}
.strategy-card.card-active {
  border: 1.5px solid #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}
.card-header {
  display: flex;
  align-items: center;
  gap: clamp(0.4rem, 0.8vw, 0.7rem);
  margin-bottom: clamp(0.4rem, 1vh, 0.7rem);
  padding-bottom: clamp(0.3rem, 0.8vh, 0.5rem);
  border-bottom: 1px solid #F1F5F9;
}
.card-icon { font-size: clamp(1.1rem, 2.3vh, 1.4rem); }
.card-title { font-size: clamp(0.78rem, 1.6vh, 0.95rem); font-weight: 700; color: #1E293B; }
.card-description {
  color: #64748B;
  line-height: 1.5;
  font-size: clamp(0.68rem, 1.3vh, 0.78rem);
  flex: 1;
}
.card-slogan {
  margin-top: auto;
  padding-top: clamp(0.4rem, 1vh, 0.6rem);
  border-top: 1px solid #F1F5F9;
  text-align: center;
}
.slogan-text {
  font-size: clamp(0.65rem, 1.2vh, 0.73rem);
  font-weight: 600;
  color: #2563EB;
  background: #EFF6FF;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
}

/* 响应式 */
@media (max-width: 768px) {
  .supply-chain-container { padding: 0.75rem; }
  .title { font-size: clamp(1.5rem, 4.5vh, 2rem); letter-spacing: 3px; }
  .cards-grid { grid-template-columns: 1fr; gap: 0.5rem; }
  .strategy-card { min-height: auto; padding: 0.8rem; }
  .input-actions { flex-direction: column; align-items: stretch; gap: 8px; }
  .actions-left, .actions-right { justify-content: space-between; }
}

@media (min-width: 1600px) {
  .content-wrapper { max-width: 1000px; }
}
</style>
