<template>
  <div class="exp-plan-design" :class="{ 'has-assistant': assistantOpen && !assistantPos }">
    <!-- 实验闭环：本页是第 1 步，后面 5 步有实验数据才可进入 -->
    <nav class="epd-steps" aria-label="实验闭环">
      <template v-for="(step, index) in stageSteps" :key="step.key">
        <button type="button" class="epd-step" :class="{ 'is-active': step.key === 'design' }"
          :disabled="step.disabled" :title="step.title" @click="goStage(step)">
          <span class="epd-step-index">{{ step.index }}</span>
          <span class="epd-step-label">{{ step.label }}</span>
        </button>
        <span v-if="index < stageSteps.length - 1" class="epd-step-line" aria-hidden="true"></span>
      </template>
    </nav>

    <p v-if="loadFailure" class="banner banner--warn">{{ loadFailure }}</p>
    <p v-else-if="!fromConversation" class="banner">
      没有读到来自对话的方案草稿：可直接在下面手填。若想让实验目的与研判结论自动带到本页，请从「想定生成」的事后复盘走一遍。
    </p>

    <!-- 方案总览：名称 / 实验矩阵 / 四个关键信息 / 反事实实验工作流程 -->
    <section id="epd-overview" class="plan-card epd-overview">
      <header class="epd-overview-head">
        <div class="epd-overview-title">
          <h1>{{ planTitle }}<span class="epd-title-tag">事后 · 反事实实验</span></h1>
          <p class="epd-overview-sub">
            <span class="epd-overview-purpose" :title="purposeBrief">实验目的：{{ purposeBrief }}</span>
            <span class="epd-overview-time">方案生成时间：{{ createdAtText }}</span>
          </p>
        </div>
        <div class="epd-matrix" :title="matrixHint">
          <p class="epd-matrix-label">当前实验矩阵</p>
          <p class="epd-matrix-value">{{ matrixText }}</p>
          <p class="epd-matrix-hint">对照＝基线不干预 · 干预＝按方案改变量</p>
        </div>
      </header>

      <div class="epd-tiles">
        <div v-for="tile in overviewTiles" :key="tile.label" class="epd-tile">
          <span class="epd-tile-icon">{{ tile.icon }}</span>
          <span class="epd-tile-main">
            <span class="epd-tile-label">{{ tile.label }}</span>
            <span class="epd-tile-value">{{ tile.value }}</span>
          </span>
        </div>
      </div>

      <div class="epd-flow">
        <div class="epd-flow-head">
          <div>
            <p class="epd-flow-eyebrow">COUNTERFACTUAL WORKFLOW</p>
            <h2 class="epd-flow-title">反事实实验工作流程</h2>
          </div>
          <button type="button" class="epd-refresh" @click="refreshPlan">&#8635; 刷新方案</button>
        </div>
        <div class="epd-flow-cards">
          <template v-for="(card, index) in workflowCards" :key="card.key">
            <button type="button" class="epd-flow-card" @click="scrollToSection(card.target)">
              <span class="epd-flow-index">{{ card.index }}</span>
              <span class="epd-flow-icon">{{ card.icon }}</span>
              <span class="epd-flow-name">{{ card.label }}</span>
              <span class="epd-flow-meta">{{ card.meta }}</span>
            </button>
            <span v-if="index < workflowCards.length - 1" class="epd-flow-arrow">&rarr;</span>
          </template>
        </div>
      </div>
    </section>

    <!-- ① 实验目的 -->
    <section id="epd-purpose" class="plan-card">
      <header class="card-head">
        <div>
          <p class="card-eyebrow">OBJECTIVE</p>
          <h2><span class="card-index">1</span>实验目的</h2>
          <p class="card-desc">这句话会作为平台实验的目标问题（user_goal）随参数一起提交后端，观察 / 干预 / 机制三阶段分析都围绕它展开。</p>
        </div>
        <span class="card-tag" :class="{ 'card-tag--muted': !basis.question }">{{ basis.question ? '来自对话研判' : '手工填写' }}</span>
      </header>
      <el-input v-model="purpose" type="textarea" :rows="4" maxlength="600" show-word-limit
        placeholder="例如：在家用智能电动车市场需求下滑的背景下，验证提升工厂产能上限能否缓解订单积压" />
      <div class="card-foot">
        <p v-if="basis.question || basis.conclusion" class="basis-line">
          自动生成依据 · 研判问题「{{ basis.question || '未记录' }}」 · 结论「{{ basis.conclusion || '未记录' }}」
        </p>
        <el-button v-if="basis.question || basis.conclusion" size="small" plain @click="regeneratePurpose">按研判结论重新生成</el-button>
      </div>
    </section>

    <!-- ② 实验方案 -->
    <section id="epd-variables" class="plan-card">
      <header class="card-head">
        <div>
          <p class="card-eyebrow">OBJECTIVE &amp; VARIABLES</p>
          <h2><span class="card-index">2</span>目标与变量设计</h2>
          <p class="card-desc">候选变量、取值范围、默认值全部来自后端参数目录（源头是后端 configs/ 的真实配置），前端不臆造任何参数。</p>
        </div>
        <span class="card-tag card-tag--muted">{{ catalogSourceText }}</span>
      </header>

      <p v-if="catalogLoading" class="hint-line">正在读取参数目录…</p>
      <p v-else-if="catalogError" class="warn-line">{{ catalogError }}</p>

      <div v-if="mappableLevers.length" class="field">
        <p class="field-title">干预变量 <span class="field-note">候选与取值区间来自参数目录；能否写入以本场景参数面板为准</span></p>
        <div class="lever-list">
          <div v-for="lever in mappableLevers" :key="lever.key" class="lever-row"
            :class="{ 'is-picked': isPicked(lever.key), 'is-blocked': !isLeverLandable(lever.key) }">
            <div class="lever-head">
              <el-checkbox v-model="leverKeys" :value="lever.key" :disabled="!isLeverLandable(lever.key)">
                {{ lever.label }}
              </el-checkbox>
              <span class="lever-range">目录区间 {{ lever.rangeText || '未给' }}</span>
              <span v-if="isLeverLandable(lever.key)" class="lever-write">写入 {{ targetTextOf(lever.key) }}</span>
              <span v-else class="lever-blocked">{{ scenarioLabel }}参数面板无此参数，不会写入</span>
            </div>
            <div v-if="isPicked(lever.key)" class="lever-value">
              <template v-if="Array.isArray(leverValues[lever.key])">
                <el-input-number v-model="leverValues[lever.key][0]" size="small" controls-position="right"
                  :min="lever.range ? lever.range[0] : undefined" :max="lever.range ? lever.range[1] : undefined" />
                <span class="lever-tilde">~</span>
                <el-input-number v-model="leverValues[lever.key][1]" size="small" controls-position="right"
                  :min="lever.range ? lever.range[0] : undefined" :max="lever.range ? lever.range[1] : undefined" />
              </template>
              <el-input-number v-else v-model="leverValues[lever.key]" size="small" controls-position="right"
                :min="lever.range ? lever.range[0] : undefined" :max="lever.range ? lever.range[1] : undefined" />
              <span class="lever-default">目录默认值 {{ formatDefault(lever) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="metricOptions.length" class="field">
        <p class="field-title">目标指标 <span class="field-note">用来判断干预是否有效，平台会在这几个口径上对比基线与干预</span></p>
        <el-checkbox-group v-model="metricKeys" class="metric-grid">
          <el-checkbox v-for="metric in metricOptions" :key="metric.key" :value="metric.key" class="metric-chip">{{ metric.label }}</el-checkbox>
        </el-checkbox-group>
      </div>

      <div class="field field--inline">
        <div class="inline-item">
          <span class="inline-label">观测轮次</span>
          <el-input-number v-model="rounds" :min="1" :max="120" size="small" controls-position="right" />
          <span class="field-note">默认沿用基线实验轮数</span>
        </div>
        <div class="inline-item">
          <span class="inline-label">对照组</span>
          <span class="inline-static">{{ PLAN_CONTROL_LABEL }}</span>
        </div>
      </div>

      <p v-if="otherLevers.length" class="hint-line">
        目录内另有 {{ otherLevers.length }} 个变量（{{ otherLeverNames }}）不在平台可调参数面板内，本次方案不写入，仅作记录。
      </p>
      <p v-if="unlandableLevers.length" class="hint-line">
        其中 {{ unlandableNames }} 属于目录候选，但{{ scenarioLabel }}参数面板没有对应输入框，已置灰不可选。
      </p>
    </section>

    <!-- ③ 落地校验 -->
    <section id="epd-ledger" class="plan-card">
      <header class="card-head">
        <div>
          <p class="card-eyebrow">EXPERIMENT GROUPS</p>
          <h2><span class="card-index">3</span>落地校验</h2>
          <p class="card-desc">这里用与平台同一份面板口径做对账：真正写入发生在反事实实验平台点「写入参数面板」时，平台会用绿色方案条显示是否已按本方案写入。</p>
        </div>
        <span class="card-tag card-tag--muted">方案 {{ planIdText }}</span>
      </header>

      <ul class="ledger">
        <li v-if="!selectedLevers.length" class="ledger-empty">
          未勾选干预变量：平台将按基线参数运行，结果与对照组一致，没有可对比的干预效果。
        </li>
        <li v-for="lever in selectedLevers" :key="lever.key">
          <b>{{ lever.label }}</b>
          <span class="ledger-value">{{ formatLeverValue(lever) }}</span>
          <span class="ledger-arrow">&rarr;</span>
          <code>{{ resolveWriteText(lever.key) }}</code>
        </li>
      </ul>

      <ul class="ledger">
        <li v-if="panelControls.length"><b>本场景面板参数</b>{{ panelKeysText }}</li>
        <li><b>对照组</b> {{ PLAN_CONTROL_LABEL }}</li>
        <li><b>目标指标</b> {{ metricText }}</li>
        <li><b>观测轮次</b> {{ roundsText }}</li>
      </ul>

      <p v-if="blockedHint" class="warn-line">{{ blockedHint }}</p>
      <p v-if="panelUnknown" class="warn-line">
        没能取到{{ scenarioLabel }}的参数面板口径，本页无法预先对账；平台运行前仍会再校验一次。
      </p>
    </section>

    <footer id="epd-actions" class="plan-actions">
      <el-button type="primary" size="large" :disabled="!canSubmit" @click="saveAndGo">保存方案，前往反事实实验平台</el-button>
      <el-button size="large" :disabled="!canSubmit" @click="saveOnly">仅保存方案</el-button>
      <span class="actions-tip">跳转后平台顶部会出现绿色方案条：点「写入参数面板」→「按方案运行实验」，出数据后即可依次做观察 / 干预 / 机制分析</span>
    </footer>

    <!-- 事后方案助手：延续对话页的上下文，可折叠 -->
    <aside ref="assistantEl" class="epd-assistant"
      :class="{ 'is-collapsed': !assistantOpen, 'is-floating': !!assistantPos }" :style="assistantStyle">
      <button v-if="!assistantOpen" type="button" class="epd-assistant-pill"
        @pointerdown="startAssistantDrag" @click="expandAssistant">
        <span class="epd-assistant-icon">&#128172;</span>
        <span class="epd-assistant-pill-text">
          <span class="epd-assistant-title">事后方案助手</span>
          <span class="epd-assistant-desc">大模型辅助反事实实验组设计</span>
        </span>
        <span class="epd-assistant-plus">+</span>
      </button>

      <template v-else>
        <header class="epd-assistant-head" title="按住可拖动，双击复位到右侧" @pointerdown="startAssistantDrag" @dblclick="resetAssistantPos">
          <span class="epd-assistant-grip" aria-hidden="true">&#10303;</span>
          <span class="epd-assistant-icon">&#128172;</span>
          <span class="epd-assistant-pill-text">
            <span class="epd-assistant-title">事后方案助手</span>
            <span class="epd-assistant-desc">大模型辅助反事实实验组设计</span>
          </span>
          <button type="button" class="epd-assistant-btn" title="刷新上下文" @pointerdown.stop @click="reloadTranscript">&#8635;</button>
          <button type="button" class="epd-assistant-btn" title="收起" @pointerdown.stop @click="assistantOpen = false">&minus;</button>
        </header>

        <div class="epd-assistant-status">
          <span>{{ transcript.length }} 条消息 · {{ userTurns }} 轮对话</span>
          <span class="epd-assistant-sync">设计上下文已同步</span>
        </div>

        <div ref="assistantListEl" class="epd-assistant-list">
          <p v-if="!transcript.length" class="epd-assistant-empty">
            还没有从对话带过来的上下文：先在对话首页走一遍事后复盘（确认实验目的后再进入本页），这里会接着同一段对话继续。
          </p>
          <div v-for="(item, index) in transcript" :key="index" class="epd-msg" :class="item.role">
            <div v-if="item.goalBrief" class="epd-msg-brief">
              <p>您的目标是：<b class="epd-goal-target">{{ item.goalBrief.goal }}</b>。这是一个全流程目标，后续将拆分为<b>观察</b>（{{ item.goalBrief.dims.observe }}）、<b>干预</b>（{{ item.goalBrief.dims.intervene }}）、<b>机制</b>（{{ item.goalBrief.dims.mechanism }}）三个子问题。</p>
              <p class="epd-msg-brief-confirm">请确认以上实验目的是否准确。准确请输入「确认实验目的」；需要调整时，请直接重新描述实验目的。</p>
            </div>
            <p v-else class="epd-msg-text">{{ item.content }}</p>
          </div>
          <p v-if="assistantSending" class="epd-msg assistant"><span class="epd-msg-text">正在生成…</span></p>
        </div>

        <div class="epd-assistant-input">
          <textarea v-model="assistantDraft" class="epd-assistant-textarea" rows="2"
            placeholder="例如：新增一组提前 10 分钟限流的实验……"
            @keydown.enter.exact.prevent="sendAssistant"></textarea>
          <button type="button" class="epd-assistant-send"
            :disabled="!assistantDraft.trim() || assistantSending" @click="sendAssistant">&#10148;</button>
        </div>
      </template>
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useScenarioStore } from '@/stores/scenario'
import { SCENARIO_VALUES, SCENARIO_LABELS } from '@/constants/scnetScenario'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { unwrapApiData } from '@/utils/session'
import { getParameterCatalog } from '@/api/supplyChain'
import { addChatMessage } from '@/api/scenarioSession'
import { startAgentChat, streamAgentTask, getAgentModels, getAgentConversation } from '@/api/scnet/chatAgent'
import { resolvePanelControls } from '@/utils/scnetPanelParams'
import {
  PLAN_QUERY_KEY, PLAN_CONTROL_LABEL, PLATFORM_LEVER_TARGETS, composePlanPurpose,
  buildLeverOptions, buildMetricOptions, resolveLeverWrites,
  newExperimentPlanId, readExperimentPlan, readLatestExperimentPlan, saveExperimentPlan,
  savePlanTranscript, readPlanTranscript, saveConversationTranscript, readConversationTranscript
} from '@/constants/scnetExperimentPlan'

const route = useRoute()
const router = useRouter()
const scenarioStore = useScenarioStore()

// 场景以 URL 为准（从对话或平台跳进来都带 scenario），并写回 store，保证页面之间口径一致
const routeScenario = String(route.query.scenario || '').trim()
if (Object.values(SCENARIO_VALUES).includes(routeScenario)) scenarioStore.setScenario(routeScenario)

const scenarioLabel = computed(() => SCENARIO_LABELS[scenarioStore.currentScenario] || '')

const planId = ref('')
const fromConversation = ref(false)
const conversationId = ref('')
const purpose = ref('')
const basis = ref({ question: '', conclusion: '' })
const leverKeys = ref([])
const leverValues = reactive({})
const metricKeys = ref([])
const rounds = ref(null)
const catalog = ref(null)
const catalogLoading = ref(false)
const catalogError = ref('')
const loadFailure = ref('')
// 方案总览的「生成时间」：沿用草稿里的创建时间，不因为再次保存而刷新
const createdAt = ref('')

const leverOptions = computed(() => buildLeverOptions(catalog.value))
const metricOptions = computed(() => buildMetricOptions(catalog.value))
const mappableLevers = computed(() => leverOptions.value.filter((item) => item.mappable))
const otherLevers = computed(() => leverOptions.value.filter((item) => !item.mappable))
const otherLeverNames = computed(() => otherLevers.value.slice(0, 3).map((item) => item.label).join('、'))
const selectedLevers = computed(() => mappableLevers.value.filter((lever) => leverKeys.value.includes(lever.key)))
const catalogSourceText = computed(() => (catalog.value ? '参数目录已就绪' : '参数目录未就绪'))
const planIdText = computed(() => planId.value || '尚未保存')

const isPicked = (key) => leverKeys.value.includes(key)

const targetTextOf = (key) => (PLATFORM_LEVER_TARGETS[key] || []).join(' / ') || '（面板无对应参数）'
const resolveWriteText = (key) => targetTextOf(key)

// ── 与平台参数面板的真实对账 ──
// 「目录里能选的候选」不等于「本场景面板写得进去的输入框」：铀场景走的是
// buildCounterfactualParameterControls 的铀分支（矿山产能 / 新矿投产阈值 / 产能爬坡速率），
// 根本没有「工厂协作半径」这一项，而参数目录是两种场景共用的一份。
// 这里调用与平台面板构造完全相同的实现（src/utils/scnetPanelParams.js），
// 所以设计页认的面板键与平台永远一致，不会再出现"确认时好好的、到平台被拦住"。
const panelControls = computed(() => (catalog.value ? resolvePanelControls(scenarioStore.currentScenario, catalog.value) : []))
const panelKeys = computed(() => new Set(panelControls.value.map((item) => item.key)))
const panelKeysText = computed(() => panelControls.value
  .map((item) => item.label + (item.unit ? `（${item.unit}）` : ''))
  .join(' / '))

// 用标称值判断"这个变量能不能落地"，与用户当前填的数无关（填错数不该被读成落不了地）
const landableTargets = (key) => resolveLeverWrites({
  key,
  value: key === 'factory_capacity_range' ? [1, 2] : 1
}).map((write) => write.key)

// 面板口径还没拿到时一律放行（不误伤），真跑起来平台还会再兜一次
const isLeverLandable = (key) => {
  if (!panelControls.value.length) return true
  const targets = landableTargets(key)
  return targets.length > 0 && targets.every((target) => panelKeys.value.has(target))
}
const unlandableLevers = computed(() => mappableLevers.value.filter((lever) => !isLeverLandable(lever.key)))
const unlandableNames = computed(() => unlandableLevers.value.map((lever) => lever.label).join('、'))
// 目录拿到了但面板口径算不出来（多是目录结构异常），如实说明本页没能对账
const panelUnknown = computed(() => Boolean(catalog.value) && !panelControls.value.length)

const formatNumber = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return String(value ?? '')
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(4)))
}
const formatDefault = (lever) => {
  const value = lever.defaultValue
  if (Array.isArray(value)) return value.map(formatNumber).join(' ~ ')
  if (value === null || value === undefined) return '目录未给'
  return formatNumber(value)
}
const formatLeverValue = (lever) => {
  const value = leverValues[lever.key]
  if (Array.isArray(value)) return value.map(formatNumber).join(' ~ ')
  if (value === undefined || value === null || value === '') return '未设定'
  return formatNumber(value)
}

const metricText = computed(() => {
  const picked = metricOptions.value.filter((item) => metricKeys.value.includes(item.key))
  return picked.length ? picked.map((item) => item.label).join(' / ') : '未指定'
})
const roundsText = computed(() => (rounds.value ? `${rounds.value} 轮（提交后端 iterations=${rounds.value}）` : '未指定'))
const blockedHint = computed(() => (
  selectedLevers.value.length
    ? ''
    : '没有干预变量时平台仍可运行，但只能得到基线复现结果，无法回答「干预是否有效」。'
))
const canSubmit = computed(() => Boolean(String(purpose.value).trim()))

/** 把已保存的方案（对话草稿 / 平台里改过的方案）读回表单 */
const fillFromPlan = (plan) => {
  planId.value = plan.id || ''
  createdAt.value = plan.createdAt || ''
  purpose.value = plan.purpose || ''
  basis.value = {
    question: (plan.purposeBasis && plan.purposeBasis.question) || '',
    conclusion: (plan.purposeBasis && plan.purposeBasis.conclusion) || ''
  }
  Object.keys(leverValues).forEach((key) => { delete leverValues[key] })
  leverKeys.value = []
  ;(Array.isArray(plan.levers) ? plan.levers : []).forEach((lever) => {
    // 平台面板落不了的变量不进勾选列表（目录里也没有对应输入框）
    if (!lever || !PLATFORM_LEVER_TARGETS[lever.key]) return
    if (leverKeys.value.includes(lever.key)) return
    leverKeys.value.push(lever.key)
    leverValues[lever.key] = Array.isArray(lever.value) ? lever.value.slice() : lever.value
  })
  metricKeys.value = (Array.isArray(plan.metrics) ? plan.metrics : []).map((item) => item && item.key).filter(Boolean)
  rounds.value = plan.rounds ? Number(plan.rounds) : null
  conversationId.value = String(plan.conversationId || route.query.session_id || '').trim()
  fromConversation.value = Boolean(plan.purposeBasis && (plan.purposeBasis.question || plan.purposeBasis.conclusion))
}

// ── 实验闭环步骤条（本页是第 1 步，其余 5 步都要有实验数据才有内容） ──
const STAGE_STEPS = [
  { key: 'design', index: '1', label: '实验方案设计', desc: '确认基线、实验组与算法' },
  { key: 'run', index: '2', label: '实验运行', desc: '批量执行事实与反事实组', path: SCNET_ROUTES.counterfactualExperiment },
  { key: 'observe', index: '3', label: '观察分析', desc: '看指标分布与异常判定', path: SCNET_ROUTES.expAnalysisObserve, needsExperiment: true },
  { key: 'intervention', index: '4', label: '干预分析', desc: '看干预策略是否显著', path: SCNET_ROUTES.expAnalysisIntervention, needsExperiment: true },
  { key: 'mechanism', index: '5', label: '机制分析', desc: '看因果路径与传导机制', path: SCNET_ROUTES.expAnalysisMechanism, needsExperiment: true },
  { key: 'report', index: '6', label: '复盘报告', desc: '汇总因果证据与结论', path: SCNET_ROUTES.EXreport, needsExperiment: true }
]
const experimentId = computed(() => String(route.query.experiment_id || '').trim())
const stageSteps = computed(() => STAGE_STEPS.map((step) => {
  const needRun = Boolean(step.needsExperiment) && !experimentId.value
  const hint = !step.path
    ? '当前页面'
    : (needRun ? '需要先运行反事实实验，拿到实验数据后该阶段才有内容' : `前往${step.label}`)
  return {
    ...step,
    disabled: !step.path || needRun,
    title: `${step.index}. ${step.label} · ${step.desc}（${hint}）`
  }
}))
const goStage = (step) => {
  if (step.disabled || !step.path) return
  const query = { phase: 'post', scenario: scenarioStore.currentScenario }
  if (planId.value) query[PLAN_QUERY_KEY] = planId.value
  if (experimentId.value) query.experiment_id = experimentId.value
  if (conversationId.value) { query.from_chat = '1'; query.session_id = conversationId.value }
  router.push({ path: step.path, query })
}

// 工作流程卡片点一下滚到对应段落
const scrollToSection = (id) => {
  const el = document.getElementById(id)
  if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const pad2 = (n) => String(n).padStart(2, '0')
const createdAtText = computed(() => {
  const d = createdAt.value ? new Date(createdAt.value) : new Date()
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
})
// 标题不搬整句实验目的（目的文案很长，撑得标题栏难看）：名称固定为「场景 + 反事实实验方案」，
// 目的原文放副标题单行省略，悬停看全文。
const planTitle = computed(() => `${scenarioLabel.value || '本场景'}反事实实验方案`)
const purposeBrief = computed(() => String(purpose.value).trim() || '尚未填写实验目的')
// 方案里只有一个干预取值组合：一组干预 + 一组对照，不按变量个数拆成多组
const cfGroupCount = computed(() => (selectedLevers.value.length ? 1 : 0))
const matrixText = computed(() => `1 组对照 + ${cfGroupCount.value} 组干预 · 每组 ${rounds.value || '—'} 轮`)
const leverNamesText = computed(() => (selectedLevers.value.length
  ? selectedLevers.value.map((lever) => lever.label).join('、')
  : '未指定（按基线运行）'))
const matrixHint = computed(() => (cfGroupCount.value
  ? `对照组沿用基线参数、不做干预；干预组按方案改「${leverNamesText.value}」的取值，每组各跑 ${rounds.value || '—'} 轮，再比较两组差异。`
  : '对照＝沿用基线参数不干预。当前没有勾选干预变量，只会跑出基线复现结果，回答不了「干预是否有效」。'))
const overviewTiles = computed(() => [
  { icon: '🗺️', label: '复盘场景', value: scenarioLabel.value || '—' },
  { icon: '🎛️', label: '干预变量', value: leverNamesText.value },
  { icon: '🔁', label: '观测轮次', value: rounds.value ? `${rounds.value} 轮` : '未指定' },
  { icon: '🕒', label: '生成时间', value: createdAtText.value }
])
const workflowCards = computed(() => [
  { key: 'society', index: '01', icon: '🏭', label: scenarioLabel.value || '场景', meta: `${mappableLevers.value.length} 类可调参数`, target: 'epd-variables' },
  { key: 'objective', index: '02', icon: '🎯', label: '目标与变量设计', meta: `${metricKeys.value.length} 指标 · ${selectedLevers.value.length} 干预变量`, target: 'epd-variables' },
  { key: 'groups', index: '03', icon: '🧪', label: '实验组设计', meta: `1 组对照 + ${cfGroupCount.value} 组干预`, target: 'epd-ledger' }
])
// 刷新方案 = 按参数目录重取一遍候选（换场景或目录更新后要能重算）
const refreshPlan = async () => {
  catalog.value = null
  await loadCatalog()
  ElMessage.success('已按参数目录刷新方案候选')
}

// ── 事后方案助手：延续对话页上下文，可折叠，输入可直接问大模型 ──
const assistantOpen = ref(true)
const transcript = ref([])
const assistantDraft = ref('')
const assistantSending = ref(false)
const assistantListEl = ref(null)
const assistantModel = ref({ providerId: null, modelId: null })
let assistantStream = null

const userTurns = computed(() => transcript.value.filter((item) => item.role === 'user').length)
// 快照按方案 id 存过一份，也按会话 id 存过一份：侧边栏/平台进来时只有会话对得上。
// 两份都没有就退回后端会话记录 —— 至少把问答续上（目标复述卡是本页本地渲染的，后端没有）。
const loadTranscriptFromConversation = async () => {
  const id = String(conversationId.value || '').trim()
  if (!id) return []
  try {
    const doc = unwrapApiData(await getAgentConversation(id)) || {}
    const list = Array.isArray(doc.messages) ? doc.messages : []
    return list
      .filter((item) => item && String(item.content || '').trim())
      .map((item) => ({
        role: item.role === 'user' ? 'user' : 'assistant',
        content: String(item.content || ''),
        goalBrief: null
      }))
      .slice(-40)
  } catch {
    return []
  }
}
const loadTranscript = async () => {
  const byPlan = readPlanTranscript(planId.value)
  if (byPlan.length) { transcript.value = byPlan; return }
  const byConv = readConversationTranscript(conversationId.value)
  if (byConv.length) { transcript.value = byConv; return }
  transcript.value = await loadTranscriptFromConversation()
}
const persistTranscript = () => {
  savePlanTranscript(planId.value, transcript.value)
  saveConversationTranscript(conversationId.value, transcript.value)
}
const reloadTranscript = async () => {
  await loadTranscript()
  ElMessage.success(transcript.value.length ? '已重新读取对话上下文' : '没找到可续上的对话上下文')
}

// 面板可拖拽：拖过之后脱离右侧停靠，双击面板头复位
const assistantEl = ref(null)
const assistantPos = ref(null)
const suppressAssistantClick = ref(false)
const ASSISTANT_WIDTH = 376
const ASSISTANT_MIN_HEIGHT = 320
const ASSISTANT_MARGIN = 12
// 全局头部固定 60px 且 z-index 高于面板，拖动时顶部不能越过它
const ASSISTANT_TOP_LIMIT = 60
const assistantStyle = computed(() => {
  const pos = assistantPos.value
  if (!pos) return null
  const style = { left: pos.left + 'px', top: pos.top + 'px', right: 'auto', bottom: 'auto', width: pos.width + 'px' }
  if (pos.height) style.height = pos.height + 'px'
  return style
})
const clamp = (value, min, max) => Math.min(Math.max(min, value), Math.max(min, max))
// 展开态浮窗：宽度固定，高度随落点自适应，保证底边不出视口、消息列表还能滚
const assistantBox = (left, top, width) => {
  const w = clamp(Math.round(width) || ASSISTANT_WIDTH, 280, Math.max(280, window.innerWidth - ASSISTANT_MARGIN * 2))
  const l = clamp(Math.round(left), ASSISTANT_MARGIN, window.innerWidth - w - ASSISTANT_MARGIN)
  const t = clamp(Math.round(top), ASSISTANT_TOP_LIMIT, window.innerHeight - ASSISTANT_MIN_HEIGHT - ASSISTANT_MARGIN)
  return { left: l, top: t, width: w, height: Math.max(ASSISTANT_MIN_HEIGHT, window.innerHeight - t - ASSISTANT_MARGIN) }
}
// 收起态胶囊保持自身尺寸，只挪位置
const assistantPillBox = (left, top, width, height) => ({
  left: clamp(Math.round(left), ASSISTANT_MARGIN, window.innerWidth - width - ASSISTANT_MARGIN),
  top: clamp(Math.round(top), ASSISTANT_TOP_LIMIT, window.innerHeight - height - ASSISTANT_MARGIN),
  width,
  height: 0
})
const resetAssistantPos = () => {
  if (!assistantPos.value) return
  assistantPos.value = null
  ElMessage.success('已复位到右侧停靠')
}
const expandAssistant = () => {
  if (suppressAssistantClick.value) return
  const wasOpen = assistantOpen.value
  assistantOpen.value = true
  // 从胶囊展开时面板尺寸变了，按落点重算一次浮窗几何，否则会沿用胶囊的窄宽度
  if (!wasOpen && assistantPos.value) {
    assistantPos.value = assistantBox(assistantPos.value.left, assistantPos.value.top, ASSISTANT_WIDTH)
  }
}
const startAssistantDrag = (event) => {
  if (event.button && event.button !== 0) return
  const panel = assistantEl.value
  if (!panel) return
  const rect = panel.getBoundingClientRect()
  const collapsed = !assistantOpen.value
  const startX = event.clientX
  const startY = event.clientY
  const originLeft = rect.left
  const originTop = rect.top
  let moved = false
  const onMove = (moveEvent) => {
    const dx = moveEvent.clientX - startX
    const dy = moveEvent.clientY - startY
    // 4px 死区：避免「点一下收起」被当成拖动
    if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return
    moved = true
    assistantPos.value = collapsed
      ? assistantPillBox(originLeft + dx, originTop + dy, rect.width, rect.height)
      : assistantBox(originLeft + dx, originTop + dy, rect.width)
  }
  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    if (!moved) return
    suppressAssistantClick.value = true
    window.setTimeout(() => { suppressAssistantClick.value = false }, 0)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}
// 窗口尺寸变化时把浮窗收回视口，避免拖过之后半个面板在屏幕外
const onViewportResize = () => {
  const pos = assistantPos.value
  if (!pos) return
  const rect = assistantEl.value ? assistantEl.value.getBoundingClientRect() : null
  assistantPos.value = assistantOpen.value
    ? assistantBox(pos.left, pos.top, pos.width)
    : assistantPillBox(pos.left, pos.top, pos.width, rect ? rect.height : 40)
}
const scrollAssistant = () => {
  const el = assistantListEl.value
  if (el) el.scrollTop = el.scrollHeight
}
// 模型口径与对话页一致：跟随已配置 Key 的后端默认 provider，不自己猜
const loadAssistantModel = async () => {
  try {
    const payload = unwrapApiData(await getAgentModels()) || {}
    const options = []
    ;(payload.providers || []).forEach((provider) => {
      const configured = provider.api_key_configured !== false
      ;(Array.isArray(provider.models) ? provider.models : []).filter(Boolean).forEach((model) => options.push({
        providerId: provider.provider_id, modelId: model, configured, isDefault: provider.provider_id === payload.default_provider
      }))
    })
    const picked = options.find((item) => item.isDefault && item.configured) || options.find((item) => item.configured)
    if (picked) assistantModel.value = { providerId: picked.providerId, modelId: picked.modelId }
  } catch { /* 取不到模型列表就交给后端默认 provider */ }
}
const sendAssistant = async () => {
  const text = assistantDraft.value.trim()
  if (!text || assistantSending.value) return
  assistantDraft.value = ''
  transcript.value.push({ role: 'user', content: text, goalBrief: null })
  const reply = { role: 'assistant', content: '', goalBrief: null }
  transcript.value.push(reply)
  assistantSending.value = true
  persistTranscript()
  nextTick(scrollAssistant)
  // 同步回原对话：回到对话页也能看到这次追加的问题
  if (conversationId.value) addChatMessage(conversationId.value, { type: 'user', content: text }).catch(() => {})
  try {
    const res = await startAgentChat({
      message: text,
      conversationId: conversationId.value || null,
      providerId: assistantModel.value.providerId,
      modelId: assistantModel.value.modelId,
      mode: 'agent',
      phase: 'post',
      scenario: scenarioStore.currentScenario
    })
    const data = unwrapApiData(res) || res?.data || res || {}
    if (!data?.task_id) throw new Error(data?.message || 'Agent 任务启动失败')
    assistantStream = streamAgentTask({
      taskId: data.task_id,
      afterSeq: 0,
      onEvent: (ev) => {
        if (ev.type === 'text_delta') {
          reply.content += ev.content
          nextTick(scrollAssistant)
        } else if (ev.type === 'error') {
          reply.content = reply.content || `❌ ${ev.message || 'Agent 执行出错'}`
          assistantSending.value = false
          persistTranscript()
        } else if (ev.type === 'done' || ev.type === 'complete') {
          assistantSending.value = false
          persistTranscript()
        }
      },
      onError: (err) => {
        reply.content = reply.content || `❌ ${(err && err.message) || '连接中断'}`
        assistantSending.value = false
        persistTranscript()
      }
    })
  } catch (e) {
    reply.content = `❌ Agent 任务启动失败：${(e && e.message) || e}`
    assistantSending.value = false
    persistTranscript()
  }
}

const restorePlan = () => {
  const idFromQuery = String(route.query[PLAN_QUERY_KEY] || '').trim()
  const plan = idFromQuery ? readExperimentPlan(idFromQuery) : readLatestExperimentPlan(scenarioStore.currentScenario)
  if (plan) { fillFromPlan(plan); loadTranscript(); return }
  if (idFromQuery) {
    loadFailure.value = `没有找到方案 ${idFromQuery}（它只存在于发起页面所在的浏览器标签会话里，可能已过期）。可以在下面重新配置一份。`
  }
  conversationId.value = String(route.query.session_id || '').trim()
  loadTranscript()
}

const loadCatalog = async () => {
  if (catalog.value || catalogLoading.value) return
  catalogLoading.value = true
  catalogError.value = ''
  try {
    const data = unwrapApiData(await getParameterCatalog(scenarioStore.currentScenario)) || {}
    catalog.value = data
    const stepsParam = ((data.exp_params || {}).params || []).find((item) => item.key === 'simulation_steps')
    const defaultRounds = Number(stepsParam ? stepsParam.default : NaN)
    if (!rounds.value && Number.isFinite(defaultRounds)) rounds.value = defaultRounds
    if (!metricKeys.value.length) {
      const preferred = ['order_completion_rate', 'net_profit']
      metricKeys.value = buildMetricOptions(data).filter((item) => preferred.includes(item.key)).map((item) => item.key)
    }
    if (!buildLeverOptions(data).length) {
      catalogError.value = '参数目录未返回可用干预变量，可直接去平台手动设置参数。'
    }
    pruneUnlandableLevers()
  } catch (e) {
    catalogError.value = '参数目录加载失败（' + ((e && e.message) || '网络错误') + '），方案仍可保存，只是暂时看不到候选变量。'
  } finally {
    catalogLoading.value = false
  }
}

// 目录就绪、面板口径算得出来之后，把「本场景面板写不进去」的变量从方案里划掉并说明原因。
// 从平台「改方案」带回来的旧方案可能含这类变量（例如铀场景里的工厂协作范围），
// 与其到平台才被红字拦住，不如在确认这一步就说清并移除。
const pruneUnlandableLevers = () => {
  if (!panelControls.value.length) return
  const dropped = leverKeys.value.filter((key) => !isLeverLandable(key))
  if (!dropped.length) return
  leverKeys.value = leverKeys.value.filter((key) => isLeverLandable(key))
  const names = dropped
    .map((key) => (leverOptions.value.find((lever) => lever.key === key) || {}).label || key)
    .join('、')
  ElMessage.info(`${scenarioLabel.value}参数面板没有「${names}」，已从方案中移除（写不进面板，不会参与实验）`)
}

// 勾选干预变量时用目录给出的真实默认值初始化取值，不编造数
watch(leverKeys, (keys) => {
  keys.forEach((key) => {
    if (leverValues[key] !== undefined) return
    const lever = leverOptions.value.find((item) => item.key === key)
    if (!lever) return
    // 区间型参数的默认值本身就是数组（如工厂产能范围 [250,400]），标量型（如市场需求强度 1.0）是数字
    if (Array.isArray(lever.defaultValue)) leverValues[key] = lever.defaultValue.slice()
    else if (lever.defaultValue !== null && lever.defaultValue !== undefined) leverValues[key] = lever.defaultValue
    else if (lever.range) leverValues[key] = lever.range[0]
  })
})

const regeneratePurpose = () => {
  purpose.value = composePlanPurpose(basis.value)
}

const buildPlanLevers = () => selectedLevers.value.map((lever) => {
  const raw = leverValues[lever.key]
  return {
    key: lever.key,
    label: lever.label,
    source: lever.source || '',
    rangeText: lever.rangeText || '',
    mappable: true,
    value: Array.isArray(raw) ? raw.map((item) => Number(item)) : Number(raw)
  }
})

const buildPlanPayload = () => ({
  id: planId.value || newExperimentPlanId(),
  createdAt: createdAt.value || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  scenario: scenarioStore.currentScenario,
  scenarioLabel: scenarioLabel.value,
  purpose: String(purpose.value).trim(),
  purposeConfirmed: true,
  purposeBasis: { question: basis.value.question || '', conclusion: basis.value.conclusion || '' },
  control: PLAN_CONTROL_LABEL,
  levers: buildPlanLevers(),
  metrics: metricOptions.value
    .filter((item) => metricKeys.value.includes(item.key))
    .map((item) => ({ key: item.key, label: item.label })),
  rounds: rounds.value || null,
  conversationId: conversationId.value || ''
})

const savePlan = () => {
  if (!canSubmit.value) {
    ElMessage.warning('请先填写实验目的')
    return null
  }
  const plan = buildPlanPayload()
  if (!saveExperimentPlan(plan)) {
    ElMessage.error('方案写入浏览器会话失败（可能禁用了 sessionStorage），无法带到实验平台')
    return null
  }
  planId.value = plan.id
  // 方案一旦有了 id，就把这段对话也记到该方案名下，之后从侧边栏进来还能续上
  persistTranscript()
  return plan
}

const saveOnly = () => {
  if (savePlan()) ElMessage.success('方案已保存：' + planId.value)
}

const saveAndGo = () => {
  const plan = savePlan()
  if (!plan) return
  const query = { phase: 'post', scenario: plan.scenario }
  query[PLAN_QUERY_KEY] = plan.id
  if (conversationId.value) {
    query.from_chat = '1'
    query.session_id = conversationId.value
  }
  router.push({ path: SCNET_ROUTES.counterfactualExperiment, query })
}

// 同一个组件被复用来回跳（平台 → 改方案 → 平台）时重新读取方案
watch(() => route.query[PLAN_QUERY_KEY], (next, prev) => {
  if (String(next || '') === String(prev || '')) return
  restorePlan()
})

onMounted(async () => {
  window.addEventListener('resize', onViewportResize)
  restorePlan()
  await loadCatalog()
  loadAssistantModel()
})

onUnmounted(() => {
  window.removeEventListener('resize', onViewportResize)
  if (assistantStream) { try { assistantStream.close() } catch { /* 关闭失败不影响离开页面 */ } }
})
</script>

<style scoped>
.exp-plan-design {
  --plan-primary: #2563eb;
  --plan-border: #e2e8f0;
  --plan-muted: #64748b;
  width: 100%;
  min-height: 100%;
  padding: 18px 20px 26px;
  box-sizing: border-box;
  background-color: #f6f8fb;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
  color: #0f172a;
}

.banner {
  margin: 0 0 14px; padding: 10px 16px; border-radius: 10px; font-size: 12.5px; line-height: 1.6;
  border: 1px solid #dbeafe; background: #eff6ff; color: #1e40af;
}
.banner--warn { border-color: #fde68a; background: #fffbeb; color: #92400e; }

.plan-card {
  margin-bottom: 14px; padding: 18px 20px 20px;
  border: 1px solid var(--plan-border); border-radius: 14px; background: #fff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
}
.card-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
.card-head h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 16px; font-weight: 800; letter-spacing: 0.01em; }
.card-index {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 7px;
  background: linear-gradient(135deg, #3b82f6, #4f46e5); color: #fff;
  font-size: 12px; font-weight: 800; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.28);
}
.card-desc { margin: 6px 0 0; color: var(--plan-muted); font-size: 12.5px; line-height: 1.6; }
.card-tag { flex: 0 0 auto; padding: 3px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600; border: 1px solid #c7d2fe; background: #eef2ff; color: #4338ca; }
.card-tag--muted { border-color: var(--plan-border); background: #f8fafc; color: var(--plan-muted); }
.card-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
.basis-line { margin: 0; color: #94a3b8; font-size: 11.5px; line-height: 1.6; flex: 1 1 320px; }

.field { margin-top: 14px; }
.field-title { margin: 0 0 8px; color: #3730a3; font-size: 13px; font-weight: 700; }
.field-note { margin-left: 8px; color: #94a3b8; font-size: 11.5px; font-weight: 400; }
.field--inline { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
.inline-item { display: flex; align-items: center; gap: 10px; }
.inline-label { color: #3730a3; font-size: 13px; font-weight: 700; }
.inline-static { color: #4b5563; font-size: 12.5px; }

.lever-list { display: flex; flex-direction: column; gap: 8px; }
.lever-row {
  position: relative; padding: 10px 12px 10px 16px; border: 1px solid var(--plan-border); border-radius: 12px;
  background: #fbfcfe; transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
}
.lever-row::before {
  content: ''; position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px;
  border-radius: 0 3px 3px 0; background: transparent; transition: background 0.18s;
}
.lever-row.is-picked { border-color: #a5b4fc; background: #f7f9ff; box-shadow: 0 6px 16px rgba(79, 70, 229, 0.07); }
.lever-row.is-picked::before { background: linear-gradient(180deg, #3b82f6, #4f46e5); }
.lever-row.is-blocked { border-style: dashed; background: #fcfcfd; }
.lever-row.is-blocked .el-checkbox { color: #b0b7c3; }
.lever-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.lever-range { padding: 2px 9px; border-radius: 999px; background: #f1f5f9; color: #64748b; font-size: 11.5px; }
.lever-default { color: #94a3b8; font-size: 11.5px; }
.lever-write { margin-left: auto; color: #4338ca; font-size: 11.5px; font-weight: 600; }
.lever-blocked { margin-left: auto; color: #b45309; font-size: 11.5px; font-weight: 600; }
.lever-value { display: flex; align-items: center; gap: 8px; margin-top: 9px; padding: 8px 10px; border: 1px dashed #dce4f2; border-radius: 9px; background: #fff; flex-wrap: wrap; }
.lever-tilde { color: #9ca3af; }

/* 目标指标做成可点选的胶囊，比一整片裸 checkbox 更好认 */
.metric-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.metric-grid :deep(.el-checkbox) {
  height: auto; margin: 0; padding: 6px 13px 6px 11px;
  border: 1px solid #e2e8f0; border-radius: 999px; background: #fbfcfe;
  transition: border-color 0.16s, background 0.16s, box-shadow 0.16s;
}
.metric-grid :deep(.el-checkbox:hover) { border-color: #a5b4fc; background: #f8faff; }
.metric-grid :deep(.el-checkbox.is-checked) { border-color: #4f46e5; background: #eef2ff; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.12); }
.metric-grid :deep(.el-checkbox__label) { font-size: 12.5px; color: #475569; }
.metric-grid :deep(.el-checkbox.is-checked .el-checkbox__label) { color: #3730a3; font-weight: 700; }
.metric-grid :deep(.el-checkbox__input.is-checked .el-checkbox__inner),
.metric-grid :deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner) { background: #4f46e5; border-color: #4f46e5; }
.hint-line { margin: 10px 0 0; color: var(--plan-muted); font-size: 12px; line-height: 1.6; }
.warn-line { margin: 10px 0 0; color: #b45309; font-size: 12.5px; line-height: 1.6; }

.ledger { margin: 6px 0 0; padding: 0; list-style: none; }
.ledger li {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 7px 0; border-bottom: 1px dashed #eef2f7; font-size: 12.5px; color: #334155;
}
.ledger li:last-child { border-bottom: none; }
.ledger b { color: #0f172a; font-weight: 700; }
.ledger-value { color: #4338ca; font-weight: 600; }
.ledger-arrow { color: #cbd5e1; }
.ledger code { padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #475569; font-size: 11.5px; }
.ledger-empty { color: #b45309; }

.plan-actions {
  position: sticky; bottom: 0; z-index: 2;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 12px 18px; margin-bottom: 4px;
  border: 1px solid var(--plan-border); border-radius: 14px; background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.08);
}
.plan-actions :deep(.el-button--primary) {
  border: none; font-weight: 700;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
  box-shadow: 0 8px 18px rgba(59, 130, 246, 0.28);
}
.plan-actions :deep(.el-button--primary:hover) { background: linear-gradient(135deg, #2563eb, #4338ca); }
.actions-tip { color: var(--plan-muted); font-size: 11.5px; line-height: 1.6; flex: 1 1 320px; }

/* ── 实验闭环步骤条 ───────────────────────── */
.epd-steps {
  display: flex; align-items: center;
  margin-bottom: 14px; padding: 10px 14px;
  border: 1px solid var(--plan-border); border-radius: 14px; background: #fff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
  overflow-x: auto; scrollbar-width: thin;
}
.epd-step {
  flex: 0 0 auto; display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border: none; border-radius: 10px; background: transparent;
  white-space: nowrap; cursor: pointer; transition: background 0.16s;
}
.epd-step:hover:not(:disabled) { background: #f1f5f9; }
.epd-step.is-active { background: #eff6ff; }
.epd-step:disabled { cursor: not-allowed; opacity: 0.55; }
.epd-step-index {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: #eef2ff; color: #4338ca; font-size: 12px; font-weight: 700;
}
.epd-step.is-active .epd-step-index { background: linear-gradient(135deg, #3b82f6, #4f46e5); color: #fff; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); }
.epd-step-label { font-size: 13px; font-weight: 700; color: #334155; }
.epd-step.is-active .epd-step-label { color: #1d4ed8; }
/* 步骤之间的连接线：用弹性宽度把 6 步均匀铺开，窄屏时整条可横向滚动 */
.epd-step-line { flex: 1 1 12px; min-width: 10px; height: 2px; border-radius: 2px; background: #e8ecf3; }

/* ── 方案总览 ─────────────────────────────── */
.epd-overview { padding-bottom: 18px; }
.epd-overview-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 18px;
  padding: 16px 18px; border: 1px solid #e3ebfb; border-radius: 12px;
  background: linear-gradient(135deg, #eef4ff 0%, #f7f5ff 100%);
}
.epd-overview-title { flex: 1 1 auto; min-width: 0; }
.epd-overview-title h1 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 0; font-size: 24px; line-height: 1.25; font-weight: 900; color: #0f172a; letter-spacing: -0.01em; }
.epd-title-tag { padding: 3px 10px; border-radius: 999px; background: #ecfdf5; color: #059669; font-size: 12px; font-weight: 700; border: 1px solid #bbf7d0; }
.epd-overview-sub { display: flex; align-items: baseline; gap: 14px; min-width: 0; margin: 10px 0 0; color: #64748b; font-size: 12.5px; }
/* 实验目的原文可能整段很长：单行省略，鼠标悬停看全文，别把标题栏撑高 */
.epd-overview-purpose { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.epd-overview-time { flex: 0 0 auto; }
.epd-matrix {
  flex: 0 0 auto; text-align: right; padding: 10px 14px; border-radius: 10px;
  background: #fff; border: 1px solid #e3ebfb; box-shadow: 0 6px 16px rgba(37, 99, 235, 0.07);
}
.epd-matrix-label { margin: 0; color: #64748b; font-size: 12px; }
.epd-matrix-value { margin: 4px 0 0; color: #1d4ed8; font-size: 17px; font-weight: 800; }
.epd-matrix-hint { margin: 4px 0 0; color: #94a3b8; font-size: 11.5px; }

.epd-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 14px; }
.epd-tile {
  display: flex; align-items: center; gap: 10px; padding: 11px 13px;
  border: 1px solid #eef1f6; border-radius: 12px; background: #fbfcfe;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s, background 0.18s;
}
.epd-tile:hover { border-color: #c7d2fe; background: #fff; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.08); transform: translateY(-1px); }
.epd-tile-icon { flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px; background: #eef4ff; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; }
.epd-tile-main { display: flex; flex-direction: column; min-width: 0; }
.epd-tile-label { color: #94a3b8; font-size: 11.5px; }
.epd-tile-value { color: #0f172a; font-size: 13.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.epd-flow { margin-top: 16px; padding: 16px; border: 1px solid #eef1f6; border-radius: 12px; background: #f8fafc; }
.epd-flow-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.epd-flow-eyebrow { margin: 0; color: #2563eb; font-size: 11.5px; font-weight: 800; letter-spacing: 0.06em; }
.epd-flow-title { margin: 4px 0 0; font-size: 18px; font-weight: 800; color: #0f172a; }
.epd-flow-cards { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.epd-flow-card {
  flex: 1 1 180px; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 18px 12px 16px; border: 1px solid #e8eaef; border-top: 3px solid #93c5fd; border-radius: 12px;
  background: #fff; cursor: pointer; transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
}
.epd-flow-card:hover { box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1); transform: translateY(-2px); }
/* 三张流程卡按环节换色，和参考图一致：人工社会 / 目标变量 / 实验组 */
.epd-flow-cards button:nth-of-type(1) { border-top-color: #60a5fa; }
.epd-flow-cards button:nth-of-type(2) { border-top-color: #a78bfa; }
.epd-flow-cards button:nth-of-type(3) { border-top-color: #fbbf24; }
.epd-flow-index { color: #cbd5e1; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; }
.epd-flow-icon { font-size: 22px; line-height: 1.2; }
.epd-flow-name { color: #0f172a; font-size: 14px; font-weight: 800; }
.epd-flow-meta { color: #94a3b8; font-size: 11.5px; }
.epd-flow-arrow { flex: 0 0 auto; color: #cbd5e1; font-size: 16px; }
.epd-refresh {
  flex: 0 0 auto; padding: 6px 12px; border: 1px solid #dbe3f1; border-radius: 999px;
  background: #fff; color: #4338ca; font-size: 12px; font-weight: 700; cursor: pointer;
  transition: border-color 0.16s, background 0.16s, box-shadow 0.16s;
}
.epd-refresh:hover { border-color: #a5b4fc; background: #f5f7ff; box-shadow: 0 6px 14px rgba(79, 70, 229, 0.12); }

.card-eyebrow { margin: 0 0 4px; color: #2563eb; font-size: 11.5px; font-weight: 800; letter-spacing: 0.06em; }
.plan-card { scroll-margin-top: 16px; }

/* ── 事后方案助手（右侧可折叠） ───────────── */
.exp-plan-design.has-assistant { padding-right: 392px; }
.epd-assistant {
  /* 顶部让开全局头部（.head 固定 60px 且 z-index 2000），否则面板会被压在页头下面 */
  position: fixed; right: 0; top: 60px; bottom: 0; width: 376px; z-index: 60;
  display: flex; flex-direction: column;
  background: #fff; border-left: 1px solid var(--plan-border); box-shadow: -6px 0 24px rgba(15, 23, 42, 0.08);
}
.epd-assistant.is-collapsed { top: auto; bottom: 24px; right: 24px; width: auto; height: auto; background: transparent; border: none; box-shadow: none; }
.epd-assistant-pill {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border: 1px solid #c7d2fe; border-radius: 12px; background: #fff; cursor: pointer;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
}
.epd-assistant-pill, .epd-assistant-head { cursor: grab; user-select: none; touch-action: none; }
.epd-assistant-pill:active, .epd-assistant-head:active { cursor: grabbing; }
/* 拖动过之后脱离右侧停靠，变成可自由摆放的浮窗 */
.epd-assistant.is-floating {
  border: 1px solid var(--plan-border); border-radius: 14px; overflow: hidden;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.2);
}
.epd-assistant.is-collapsed.is-floating { box-shadow: none; border: none; }
.epd-assistant-pill:hover { background: #f8faff; }
.epd-assistant-icon {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center; background: #eef2ff; font-size: 14px;
}
.epd-assistant-pill-text { display: flex; flex-direction: column; min-width: 0; }
.epd-assistant-title { font-size: 13.5px; font-weight: 800; color: #0f172a; }
.epd-assistant-desc { font-size: 11.5px; color: var(--plan-muted); }
.epd-assistant-plus { margin-left: auto; color: #4338ca; font-size: 16px; font-weight: 700; }
.epd-assistant-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px 10px; border-bottom: 1px solid #eef0f4; }
.epd-assistant-grip { flex-shrink: 0; color: #cbd5e1; font-size: 15px; line-height: 1; }
.epd-assistant-head:active .epd-assistant-grip { color: #93c5fd; }
.epd-assistant-btn {
  flex-shrink: 0; width: 26px; height: 26px; border: 1px solid #e5e7eb; border-radius: 8px;
  background: #fff; color: #64748b; font-size: 13px; cursor: pointer;
}
.epd-assistant-btn:hover { border-color: #93c5fd; color: #2563eb; }
.epd-assistant-status {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 8px 16px; border-bottom: 1px solid #eef0f4; color: var(--plan-muted); font-size: 11.5px;
}
.epd-assistant-sync { padding: 2px 8px; border-radius: 999px; background: #ecfdf5; color: #059669; font-weight: 700; }
.epd-assistant-list { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.epd-assistant-empty { margin: 0; color: #94a3b8; font-size: 12.5px; line-height: 1.7; }
.epd-msg { display: flex; }
.epd-msg.user { justify-content: flex-end; }
.epd-msg-text {
  margin: 0; max-width: 92%; padding: 9px 12px; border-radius: 12px;
  font-size: 12.5px; line-height: 1.8; white-space: pre-wrap; word-break: break-word;
}
.epd-msg.assistant .epd-msg-text { background: #f8fafc; border: 1px solid #eef0f4; color: #1f2937; border-bottom-left-radius: 4px; }
.epd-msg.user .epd-msg-text { background: #2563eb; color: #fff; border-bottom-right-radius: 4px; }
.epd-msg-brief { max-width: 92%; padding: 10px 12px; border: 1px solid #eef0f4; border-radius: 12px; border-bottom-left-radius: 4px; background: #f8fafc; }
.epd-msg-brief p { margin: 0; font-size: 12.5px; line-height: 2; color: #374151; }
.epd-msg-brief b { color: #2563eb; font-weight: 600; }
.epd-goal-target { padding: 1px 3px; border-radius: 4px; background: #dbeafe; color: #1d4ed8 !important; font-weight: 600; }
.epd-msg-brief-confirm { margin-top: 8px !important; color: #6b7280 !important; }
.epd-assistant-input { display: flex; align-items: flex-end; gap: 8px; padding: 10px 14px 14px; border-top: 1px solid #eef0f4; }
.epd-assistant-textarea {
  flex: 1; min-width: 0; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 10px;
  font-family: inherit; font-size: 12.5px; line-height: 1.6; color: #0f172a; resize: none; outline: none;
}
.epd-assistant-textarea:focus { border-color: #93c5fd; }
.epd-assistant-send {
  flex-shrink: 0; width: 34px; height: 34px; border: none; border-radius: 10px;
  background: #2563eb; color: #fff; font-size: 14px; cursor: pointer;
}
.epd-assistant-send:disabled { background: #cbd5e1; cursor: not-allowed; }

@media (max-width: 1280px) {
  .exp-plan-design.has-assistant { padding-right: 16px; }
}
</style>
