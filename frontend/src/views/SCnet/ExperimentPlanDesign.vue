<template>
  <div class="exp-plan-design">
    <section class="page-head">
      <div>
        <p class="eyebrow">POST-HOC · EXPERIMENT DESIGN</p>
        <h1>实验方案设计</h1>
        <p class="subtitle">
          {{ scenarioLabel }} · 把对话研判的结论落成一份可执行的反事实实验方案：实验目的 → 干预变量 → 目标指标与轮次 → 写入平台参数面板
        </p>
      </div>
      <div class="page-actions">
        <span class="state-chip" :data-state="planState">{{ planStateText }}</span>
        <el-button v-if="conversationId" plain size="large" @click="backToChat">回到本次对话</el-button>
      </div>
    </section>

    <p v-if="loadFailure" class="banner banner--warn">{{ loadFailure }}</p>
    <p v-else-if="!fromConversation" class="banner">
      没有读到来自对话的方案草稿：可直接在下面手填。若想让实验目的与研判结论自动带到本页，请从「想定生成」的事后复盘走一遍。
    </p>

    <!-- ① 实验目的 -->
    <section class="plan-card">
      <header class="card-head">
        <div>
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
    <section class="plan-card">
      <header class="card-head">
        <div>
          <h2><span class="card-index">2</span>实验方案</h2>
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
          <el-checkbox v-for="metric in metricOptions" :key="metric.key" :value="metric.key">{{ metric.label }}</el-checkbox>
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
    <section class="plan-card">
      <header class="card-head">
        <div>
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

    <footer class="plan-actions">
      <el-button type="primary" size="large" :disabled="!canSubmit" @click="saveAndGo">保存方案，前往反事实实验平台</el-button>
      <el-button size="large" :disabled="!canSubmit" @click="saveOnly">仅保存方案</el-button>
      <span class="actions-tip">跳转后平台顶部会出现绿色方案条：点「写入参数面板」→「按方案运行实验」，出数据后即可依次做观察 / 干预 / 机制分析</span>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useScenarioStore } from '@/stores/scenario'
import { SCENARIO_VALUES, SCENARIO_LABELS } from '@/constants/scnetScenario'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { unwrapApiData } from '@/utils/session'
import { getParameterCatalog } from '@/api/supplyChain'
import { resolvePanelControls } from '@/utils/scnetPanelParams'
import {
  PLAN_QUERY_KEY, PLAN_CONTROL_LABEL, PLATFORM_LEVER_TARGETS, composePlanPurpose,
  buildLeverOptions, buildMetricOptions, isExperimentPlanApplied, resolveLeverWrites,
  newExperimentPlanId, readExperimentPlan, readLatestExperimentPlan, saveExperimentPlan
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
const planAppliedBefore = ref(false)

const leverOptions = computed(() => buildLeverOptions(catalog.value))
const metricOptions = computed(() => buildMetricOptions(catalog.value))
const mappableLevers = computed(() => leverOptions.value.filter((item) => item.mappable))
const otherLevers = computed(() => leverOptions.value.filter((item) => !item.mappable))
const otherLeverNames = computed(() => otherLevers.value.slice(0, 3).map((item) => item.label).join('、'))
const selectedLevers = computed(() => mappableLevers.value.filter((lever) => leverKeys.value.includes(lever.key)))
const catalogSourceText = computed(() => (catalog.value ? '参数目录已就绪' : '参数目录未就绪'))
const planIdText = computed(() => planId.value || '尚未保存')

const planState = computed(() => {
  if (planAppliedBefore.value) return 'applied'
  return planId.value ? 'draft' : 'new'
})
const planStateText = computed(() => {
  if (planAppliedBefore.value) return '已写入过平台参数面板'
  return planId.value ? '方案草稿' : '新方案'
})

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
  planAppliedBefore.value = isExperimentPlanApplied(plan.id)
}

const restorePlan = () => {
  const idFromQuery = String(route.query[PLAN_QUERY_KEY] || '').trim()
  const plan = idFromQuery ? readExperimentPlan(idFromQuery) : readLatestExperimentPlan(scenarioStore.currentScenario)
  if (plan) { fillFromPlan(plan); return }
  if (idFromQuery) {
    loadFailure.value = `没有找到方案 ${idFromQuery}（它只存在于发起页面所在的浏览器标签会话里，可能已过期）。可以在下面重新配置一份。`
  }
  conversationId.value = String(route.query.session_id || '').trim()
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
  createdAt: new Date().toISOString(),
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

const backToChat = () => {
  router.push({ path: SCNET_ROUTES.chatHome, query: { conversation_id: conversationId.value } })
}

// 同一个组件被复用来回跳（平台 → 改方案 → 平台）时重新读取方案
watch(() => route.query[PLAN_QUERY_KEY], (next, prev) => {
  if (String(next || '') === String(prev || '')) return
  restorePlan()
})

onMounted(async () => {
  restorePlan()
  await loadCatalog()
})
</script>

<style scoped>
.exp-plan-design {
  --plan-primary: #2563eb;
  --plan-border: #e2e8f0;
  --plan-muted: #64748b;
  width: 100%;
  min-height: 100%;
  padding: 16px;
  box-sizing: border-box;
  background-color: #f6f8fb;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
  color: #0f172a;
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 14px 22px;
  margin-bottom: 14px;
  border: 1px solid var(--plan-border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}
.page-head .eyebrow {
  margin: 0 0 6px;
  color: #3867f2;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.page-head h1 { margin: 0; font-size: 26px; line-height: 1.2; font-weight: 900; }
.page-head .subtitle { margin: 8px 0 0; color: var(--plan-muted); font-size: 13px; font-weight: 600; }
.page-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.state-chip {
  padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;
  border: 1px solid #cbd5f5; background: #eef2ff; color: #4338ca;
}
.state-chip[data-state='applied'] { border-color: #bbf7d0; background: #ecfdf5; color: #047857; }
.state-chip[data-state='new'] { border-color: #e2e8f0; background: #f8fafc; color: #64748b; }

.banner {
  margin: 0 0 14px; padding: 10px 16px; border-radius: 8px; font-size: 12.5px; line-height: 1.6;
  border: 1px solid #dbeafe; background: #eff6ff; color: #1e40af;
}
.banner--warn { border-color: #fde68a; background: #fffbeb; color: #92400e; }

.plan-card {
  margin-bottom: 14px; padding: 16px 20px 18px;
  border: 1px solid var(--plan-border); border-radius: 10px; background: #fff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
}
.card-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 12px; }
.card-head h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 800; }
.card-index {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%; background: #eef2ff; color: #4338ca;
  font-size: 12px; font-weight: 800;
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
  padding: 10px 12px; border: 1px solid var(--plan-border); border-radius: 8px;
  background: #fbfcfe; transition: border-color 0.2s, background 0.2s;
}
.lever-row.is-picked { border-color: #a5b4fc; background: #f8f9ff; }
.lever-row.is-blocked { border-style: dashed; background: #fcfcfd; }
.lever-row.is-blocked .el-checkbox { color: #b0b7c3; }
.lever-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.lever-range { padding: 1px 8px; border-radius: 999px; background: #f1f5f9; color: #64748b; font-size: 11.5px; }
.lever-default { color: #94a3b8; font-size: 11.5px; }
.lever-write { margin-left: auto; color: #4338ca; font-size: 11.5px; font-weight: 600; }
.lever-blocked { margin-left: auto; color: #b45309; font-size: 11.5px; font-weight: 600; }
.lever-value { display: flex; align-items: center; gap: 8px; margin-top: 8px; padding-left: 24px; flex-wrap: wrap; }
.lever-tilde { color: #9ca3af; }
.metric-grid { display: flex; flex-wrap: wrap; gap: 6px 18px; }
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
  padding: 12px 20px; margin-bottom: 4px;
  border: 1px solid var(--plan-border); border-radius: 10px; background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -6px 18px rgba(15, 23, 42, 0.06);
}
.actions-tip { color: var(--plan-muted); font-size: 11.5px; line-height: 1.6; flex: 1 1 320px; }
</style>
