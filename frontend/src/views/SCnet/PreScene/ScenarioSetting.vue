<template>
  <div class="scenario-setting">
    <div class="page-wrap">
      <!-- ===== 顶部标题栏 ===== -->
      <header class="page-head">
        <div class="head-titles">
          <div class="head-eyebrow">
          
            <i class="head-eyebrow__divider"></i>
            <span>{{ scenarioStore.label }}</span>
          </div>
          <h1 class="head-title">场景设定</h1>
          <p class="head-desc">定义本次供应链研判的对象、范围与决策目标</p>
        </div>

        <div class="head-side">
          <div class="head-actions">
            <div v-if="statusTag" class="status-chip" :class="`is-${statusTag.tone}`">
              <span class="status-chip__dot"></span>{{ statusTag.text }}
            </div>
            <!-- 新建分析:只清空前端工作区,不删除旧任务 -->
            <el-button class="case-button" size="small" @click="onNewAnalysis">新建分析</el-button>
            <el-button class="case-button" size="small" @click="applyScenarioExample">设定案例</el-button>
          </div>
          <ol class="flow-steps">
            <li
              v-for="step in flowSteps"
              :key="step.key"
              class="flow-step"
              :class="`is-${step.state}`"
            >
              <span class="flow-step__num">{{ step.num }}</span>
              <span class="flow-step__label">{{ step.label }}</span>
            </li>
          </ol>
        </div>
      </header>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="setting-form"
        @submit.prevent
      >
        <div class="page-body">
          <!-- ===== 左：配置区 ===== -->
          <main class="config">
            <!-- A. 核心研判问题 -->
            <section class="panel">
              <div class="panel-head">
                <div class="panel-head__line">
                  <h2 class="panel-title">核心研判问题</h2>
                  <span class="panel-badge">必填</span>
                </div>
                <p class="panel-desc">
                  用一句完整的问题说明本次研判要回答什么。问题越具体，后续情报检索与推理越有针对性。
                </p>
              </div>

              <el-form-item prop="question" class="question-field">
                <el-input
                  v-model="form.question"
                  type="textarea"
                  :rows="5"
                  resize="none"
                  placeholder="例如：我计划在2026年第四季度从哈萨克斯坦进口800 tU铀燃料，请评估该计划是否适合执行，并给出采购量、采购时机与风险应对建议。"
                />
              </el-form-item>

              <div class="example-row">
                <span class="example-row__label">常见问题参考</span>
                <div class="example-row__list">
                  <button
                    v-for="item in questionHints"
                    :key="item.label"
                    type="button"
                    class="hint-tag"
                    @click="applyHint(item)"
                  >
                    {{ item.label }}
                  </button>
                </div>
              </div>
              <p class="example-row__note">
                点击标签可将对应问题模板填入上方输入框，仅作参考、不参与校验；您也可以直接用自己的说法描述问题。
              </p>
            </section>

            <!-- B. 补充分析条件（选填） -->
            <section class="panel">
              <div class="panel-head">
                <h2 class="panel-title">补充分析条件（选填）</h2>
                <p class="panel-desc">您可以补充已知条件，帮助系统提高分析精度；如果问题中已经包含相关信息，也可以不重复填写。</p>
              </div>

              <div class="field-grid">
                <el-form-item label="背景事件">
                  <el-input
                    v-model="form.backgroundEvent"
                    placeholder="例如：俄乌战争、制裁升级、港口中断"
                  />
                </el-form-item>

                <el-form-item label="研究对象">
                  <el-input
                    v-model="form.commodity"
                    placeholder="例如：天然铀、铀燃料、汽车芯片"
                  />
                </el-form-item>

                <el-form-item label="来源国家或地区">
                  <el-select
                    v-model="form.sourceCountries"
                    multiple
                    filterable
                    allow-create
                    collapse-tags
                    collapse-tags-tooltip
                    default-first-option
                    placeholder="选择或输入国家"
                    style="width: 100%"
                  >
                    <el-option v-for="country in countryOptions" :key="country" :label="country" :value="country" />
                  </el-select>
                </el-form-item>

                <el-form-item label="运输路线">
                  <el-select
                    v-model="form.routeIds"
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                    placeholder="可多选"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="routeItem in routeOptions"
                      :key="routeItem.value"
                      :label="routeItem.label"
                      :value="routeItem.value"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="分析时间范围">
                  <el-date-picker
                    v-model="form.timeRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>

                <el-form-item label="已知采购量或需求量（选填）">
                  <div class="quantity-row">
                    <el-input-number
                      v-model="form.quantity"
                      :min="0"
                      :precision="2"
                      controls-position="right"
                      placeholder="留空则由系统建议"
                    />
                    <el-select v-model="form.unit">
                      <el-option label="tU" value="tU" />
                      <el-option label="吨" value="吨" />
                      <el-option label="批次" value="批次" />
                    </el-select>
                  </div>
                  <p class="field-hint">如果希望系统建议进口多少，请留空。留空不会按 0 处理，也不会影响提交。</p>
                </el-form-item>
              </div>

              <p v-if="needsCostDetail" class="panel-note">
                该问题涉及盈亏测算，建议补充采购量、采购价格与运输成本等信息，以提高测算精度。
              </p>
            </section>
          </main>

          <!-- ===== 右：场景任务摘要 ===== -->
          <aside class="summary">
            <div class="summary-card">
              <div class="summary-head">
                <h2>本次研判任务</h2>
                <span class="summary-scenario">{{ scenarioStore.label }}</span>
              </div>

              <div class="summary-body">
                <div class="summary-question">
                  <span class="summary-question__label">核心问题</span>
                  <p v-if="form.question.trim()">{{ form.question.trim() }}</p>
                  <p v-else class="is-empty">待设定</p>
                </div>

                <dl class="summary-list">
                  <div class="summary-row">
                    <dt>背景事件</dt>
                    <dd :class="{ 'is-empty': !form.backgroundEvent.trim() }">{{ form.backgroundEvent.trim() || '待设定' }}</dd>
                  </div>
                  <div class="summary-row">
                    <dt>来源国家</dt>
                    <dd :class="{ 'is-empty': !countryText }">
                      <span v-if="!countryText">待设定</span>
                      <span v-else class="summary-tags">
                        <span v-for="country in form.sourceCountries" :key="country" class="summary-tag">{{ country }}</span>
                      </span>
                    </dd>
                  </div>
                  <div class="summary-row">
                    <dt>关注路线</dt>
                    <dd :class="{ 'is-empty': !routeText }">{{ routeText || '待设定' }}</dd>
                  </div>
                  <div class="summary-row">
                    <dt>分析时间</dt>
                    <dd :class="{ 'is-empty': !timeText }">{{ timeText || '待设定' }}</dd>
                  </div>
                  <div class="summary-row">
                    <dt>进口量</dt>
                    <dd :class="{ 'is-empty': !quantityText }">{{ quantityText || '待设定' }}</dd>
                  </div>
                </dl>
              </div>

              <div class="summary-foot">
                <p class="summary-foot__title">确认分析方案后，系统将在后台自动依次完成</p>
                <div class="summary-chain">
                  <span>开源情报</span><i>→</i>
                  <span>态势研判</span><i>→</i>
                  <span>态势预测</span><i>→</i>
                  <span>报告生成</span>
                </div>
                <p class="summary-foot__note">提交场景只会生成分析方案，正式分析要等您在方案确认页点「开始分析」。</p>
              </div>
            </div>
          </aside>
        </div>
      </el-form>
    </div>

    <!-- ===== 底部操作区 ===== -->
    <footer class="action-bar">
      <div class="action-bar__inner">
        <div class="action-info">
          <template v-if="!submitted">
            <span class="action-info__dot"></span>
            <span v-if="canSubmit">提交后将生成分析方案，确认方案后再启动正式分析。</span>
            <span v-else>请先填写核心研判问题；补充分析条件均为选填，可以留空。</span>
          </template>
          <template v-else>
            <span class="action-info__dot" :class="`is-${statusTag?.tone}`"></span>
            <span class="action-info__state">{{ startStateText }}</span>
            <i class="action-info__sep"></i>
            <span class="action-info__sub">表单仍可修改；重新生成方案会创建一次新的分析任务。</span>
          </template>
        </div>

        <div class="action-buttons">
          <el-button :disabled="store.loading" @click="resetForm">重置</el-button>

          <el-button
            v-if="!submitted"
            type="primary"
            :loading="store.loading"
            :disabled="!canSubmit"
            @click="submitScenario"
          >
            生成分析方案
          </el-button>

          <template v-else>
            <el-button :loading="store.loading" :disabled="!canSubmit" @click="resubmitScenario">
              以当前内容重新生成方案
            </el-button>
            <ExpertWorkflowNav
              :next="SCNET_ROUTES.planConfirmation"
              next-label="方案确认"
            />
          </template>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { useScenarioStore } from '@/stores/scenario'
import { useExpertWorkflowStore } from '@/stores/scnet/useExpertWorkflowStore'
import { useExpertPlanStore } from '@/stores/scnet/useExpertPlanStore'
import { useExpertExampleStore } from '@/stores/scnet/useExpertExampleStore'
import { importExpertExampleWorkflow } from '@/api/expertWorkflow'
import ExpertWorkflowNav from '@/views/SCnet/components/ExpertWorkflowNav.vue'

const route = useRoute()
const router = useRouter()
const scenarioStore = useScenarioStore()
const store = useExpertWorkflowStore()
const planStore = useExpertPlanStore()
const exampleStore = useExpertExampleStore()
const formRef = ref(null)
const submitted = ref(false)

/* ---------- 选项数据（沿用原有取值，仅调整呈现方式） ---------- */
const countryOptions = ['哈萨克斯坦', '俄罗斯', '加拿大', '澳大利亚', '纳米比亚', '尼日尔', '乌兹别克斯坦']

const routeOptions = [
  { label: '哈萨克斯坦—中国中亚铁路', value: 'kazakhstan' },
  { label: '俄罗斯—中国欧亚通道', value: 'russia' },
  { label: '加拿大—中国海运', value: 'canada' },
  { label: '澳大利亚—中国海运', value: 'australia' },
  { label: '纳米比亚—中国海运', value: 'namibia' },
  { label: '尼日尔—中国陆海联运', value: 'niger' },
  { label: '乌兹别克斯坦—中国中亚铁路', value: 'uzbekistan' },
]

/** 常见问题参考：点击后把对应问题模板填入核心研判问题，仅供参考、不参与校验、无选中态 */
const questionHints = [
  { label: '价格走势预测', template: '请预测未来半年铀燃料的价格走势，并分析主要上涨和下跌因素。' },
  { label: '是否适合采购', template: '我计划在2026年第四季度从哈萨克斯坦进口铀燃料，请评估该采购计划是否适合执行，并说明主要风险。' },
  { label: '建议进口多少', template: '我计划在2026年第四季度从哈萨克斯坦进口铀燃料，请建议合理的进口量和采购时机。' },
  { label: '采购时机建议', template: '请分析未来两个季度铀燃料的采购时机，说明何时下单更有利，并给出理由。' },
  { label: '供应与运输风险', template: '从哈萨克斯坦进口铀燃料主要有哪些运输路线，各路线的风险有多高？' },
]

/**
 * 一键填充的示例场景（只写入现有表单字段，不提交、不启动任何分析）。
 * 与后端案例包 exampleId=uranium_kazakhstan_russia_ukraine_v1 的场景部分保持一致。
 * 示例刻意不填采购量：进口量正是需要系统给出建议的内容，不是已知条件。
 * 时间区间按页面 value-format 使用 YYYY-MM-DD。
 */
const SCENARIO_EXAMPLE = Object.freeze({
  question: '在俄乌战争这个场景下，我计划在2026年第四季度从哈萨克斯坦进口铀燃料。请结合供应稳定性、中亚铁路运输风险和铀燃料价格走势，评估该计划是否适合执行，并建议合理的进口量、采购时机和风险应对方案。',
  backgroundEvent: '俄乌战争',
  commodity: '铀燃料',
  sourceCountries: ['哈萨克斯坦'],
  routeIds: ['kazakhstan'],
  timeRange: ['2026-10-01', '2026-12-31'],
  quantity: null,
})

/**
 * 接口兼容：后端接口仍要求 objectives / counterfactual 字段，而界面已不再让用户勾选或填写。
 * 这里从核心研判问题中推断用户可能关注的方向；推断不出就发送空值，不虚构用户没有表达的意图。
 */
const OBJECTIVE_RULES = [
  { value: 'supply_risk', keywords: ['风险', '供应', '运输', '中断', '稳定', '安全'] },
  { value: 'price_forecast', keywords: ['价格', '走势', '行情', '涨价', '跌价'] },
  { value: 'profit_loss', keywords: ['盈亏', '成本', '收益', '利润', '亏损'] },
  { value: 'procurement_optimization', keywords: ['采购量', '进口量', '采购时机', '采购', '数量', '时机', '下单'] },
  { value: 'counterfactual_impact', keywords: ['利好', '利空', '影响', '情景'] },
]

// 注意：不含「未来」等时间词，避免把「未来半年价格走势」这类时间范围误判成情景假设
const SCENARIO_KEYWORDS = ['如果', '若', '假如', '假设', '情景', '一旦', '结束', '届时', '发生后']

function deriveObjectives(question) {
  const text = String(question || '')
  return OBJECTIVE_RULES
    .filter(rule => rule.keywords.some(keyword => text.includes(keyword)))
    .map(rule => rule.value)
}

/** 用户若在问题中描述了未来事件，则把该句作为情景文本一并提交；没有则留空 */
function deriveScenario(question) {
  const sentences = String(question || '')
    .split(/[。；;！!？?\n]+/)
    .map(item => item.trim())
    .filter(Boolean)
  return sentences.find(item => SCENARIO_KEYWORDS.some(keyword => item.includes(keyword))) || ''
}

/* ---------- 表单模型（界面字段，提交参数结构保持不变） ---------- */
const createDefaultForm = () => ({
  question: '',
  backgroundEvent: '',
  commodity: '',
  sourceCountries: [],
  routeIds: [],
  timeRange: [],
  quantity: null,
  unit: 'tU',
})

const form = reactive(createDefaultForm())
const rules = { question: [{ required: true, message: '请填写需要研判的问题', trigger: 'blur' }] }

/* ---------- 摘要展示 ---------- */
const countryText = computed(() => form.sourceCountries.join('、'))
const routeText = computed(() =>
  form.routeIds.map(id => routeOptions.find(item => item.value === id)?.label || id).join('、'),
)
const timeText = computed(() =>
  Array.isArray(form.timeRange) && form.timeRange.length === 2 ? form.timeRange.join(' 至 ') : '',
)
const quantityText = computed(() => {
  if (form.quantity === null || form.quantity === undefined || form.quantity === '') return ''
  return `${form.quantity} ${form.unit || ''}`.trim()
})
/* ---------- 顶部步骤条与运行状态 ---------- */
/** 专家模式六步流程:本页是 01,方案确认是 02,之后的正式分析阶段由后台自动串行执行 */
const WORKFLOW_STEPS = [
  { key: 'plan', num: '02', label: '方案确认' },
  { key: 'osint', num: '03', label: '开源情报' },
  { key: 'judgment', num: '04', label: '态势研判' },
  { key: 'prediction', num: '05', label: '态势预测' },
  { key: 'report', num: '06', label: '报告生成' },
]

/** 方案确认步骤的状态来自方案记录,而不是分析阶段 */
function planStepState() {
  if (!submitted.value) return 'muted'
  const status = store.detail?.plan?.generation_status
  const analysis = store.detail?.plan?.analysis_status
  if (status === 'generating') return 'running'
  if (status === 'failed') return 'failed'
  if (status === 'draft') return 'done'
  if (analysis && analysis !== 'pending') return 'running'
  return 'muted'
}

function stageStepState(key) {
  if (!submitted.value) return 'muted'
  const status = store.stageStatus(key)
  if (status === 'completed') return 'done'
  if (status === 'running') return 'running'
  if (status === 'failed') return 'failed'
  return 'muted'
}

const flowSteps = computed(() => [
  { key: 'setting', num: '01', label: '场景设定', state: 'current' },
  ...WORKFLOW_STEPS.map(step => ({
    ...step,
    state: step.key === 'plan' ? planStepState() : stageStepState(step.key),
  })),
])

const statusTag = computed(() => {
  if (!submitted.value) return null
  const analysis = store.detail?.plan?.analysis_status || 'pending'
  if (analysis === 'completed') return { text: '分析完成', tone: 'ok' }
  if (analysis === 'failed') return { text: '分析运行失败', tone: 'error' }
  if (analysis === 'running' || analysis === 'confirmed') return { text: '分析运行中', tone: 'running' }
  const generation = store.detail?.plan?.generation_status
  if (generation === 'failed') return { text: '方案生成失败', tone: 'error' }
  if (generation === 'generating') return { text: '方案生成中', tone: 'running' }
  return { text: '方案待确认', tone: 'muted' }
})

const startStateText = computed(() => {
  const analysis = store.detail?.plan?.analysis_status || 'pending'
  if (analysis === 'completed') return '分析已完成'
  if (analysis === 'failed') return '分析运行失败'
  if (analysis === 'running' || analysis === 'confirmed') return '分析流程已启动'
  const generation = store.detail?.plan?.generation_status
  if (generation === 'generating') return '正在生成分析方案'
  if (generation === 'draft') return '分析方案待确认'
  return '场景已保存，等待生成分析方案'
})

/* ---------- 交互 ---------- */
/** 补充分析条件全部选填，只有核心研判问题会决定提交按钮是否可用 */
const canSubmit = computed(() => Boolean(form.question.trim()))

/** 仅在问题明确要求测算盈亏时，才提示补充数量 / 价格 / 运输成本 */
const COST_KEYWORDS = ['盈亏', '成本', '利润', '收益', '亏损', '测算']
const needsCostDetail = computed(() => {
  const text = form.question
  return COST_KEYWORDS.some(keyword => text.includes(keyword))
})

const hasInput = computed(() => Boolean(
  form.question.trim() || form.backgroundEvent.trim() || form.commodity.trim()
  || form.sourceCountries.length || form.routeIds.length
  || (Array.isArray(form.timeRange) && form.timeRange.length)
  || (form.quantity !== null && form.quantity !== undefined && form.quantity !== ''),
))

/** 常见问题参考：填入问题模板；若已手工输入过内容，先确认再覆盖 */
async function applyHint(item) {
  const current = form.question.trim()
  const typedByUser = current && !questionHints.some(hint => hint.template === current)
  if (typedByUser) {
    try {
      await ElMessageBox.confirm('填入问题模板将替换当前核心研判问题内容，是否继续？', '填入问题模板', {
        type: 'warning',
        confirmButtonText: '继续填入',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
  }
  form.question = item.template
  formRef.value?.clearValidate()
}

/**
 * 新建分析:清空当前工作区,开始一个全新的问题。
 *
 * 只清前端当前活动任务上下文 + 表单 + 各阶段展示状态;
 * 不删除后端旧会话,不修改旧任务,不终止仍在跑的旧任务 ——
 * 旧任务以后仍可从「历史方案」重新打开。
 */
async function onNewAnalysis() {
  try {
    await ElMessageBox.confirm(
      '将清空当前工作区并开始新的场景设定。当前任务及其历史结果不会删除，是否继续？',
      '新建分析',
      { type: 'warning', confirmButtonText: '开始新建', cancelButtonText: '取消' },
    )
  } catch {
    return
  }

  // 1) 停止当前任务的前端轮询,并作废未完成的旧请求回调
  store.resetActiveTask()
  // 2) 清空前端方案状态与各阶段展示结果
  planStore.reset()
  // 3) 清空案例查看状态
  exampleStore.reset()

  // 4) 清空场景设定表单(不复制旧任务的问题/国家/路线/时间/数量)
  formRef.value?.clearValidate()
  Object.assign(form, createDefaultForm())
  submitted.value = false

  // 5) 移除 URL 上的旧任务参数,进入空白新建状态(保留场景类型)
  const scenario = scenarioStore.isSupplyChain ? 'supply_chain' : 'uranium'
  await router.replace({ path: SCNET_ROUTES.scenarioSetting, query: { scenario } })

  ElMessage.success('已清空当前工作区，请填写新的研判问题。')
}

/** 导入完整案例任务，留在场景页；用户点击下一步逐页查看案例产物。 */
async function applyScenarioExample() {
  if (hasInput.value) {
    try {
      await ElMessageBox.confirm(
        '导入设定案例将覆盖当前填写内容，是否继续？',
        '使用示例场景',
        { type: 'warning', confirmButtonText: '继续填入', cancelButtonText: '取消' },
      )
    } catch {
      return
    }
  }

  try {
    const response = await importExpertExampleWorkflow()
    const data = response?.data || response
    const spec = data?.scenario_spec || {}
    Object.assign(form, {
      question: spec.question || SCENARIO_EXAMPLE.question,
      backgroundEvent: spec.background_event || '',
      commodity: spec.commodity || '',
      sourceCountries: [...(spec.source_countries || [])],
      routeIds: [...(spec.route_ids || [])],
      timeRange: [spec.time_window?.start || '', spec.time_window?.end || ''],
      quantity: spec.quantity ?? null,
    })
    formRef.value?.clearValidate()
    await store.refresh(data.session_id)
    submitted.value = true
    await router.replace({ path: SCNET_ROUTES.scenarioSetting,
      query: { scenario: 'uranium', session_id: data.session_id, view: 'example' } })
    ElMessage.success('设定案例已导入，点击下一步依次查看方案、研判、预测和报告。')
  } catch (e) {
    ElMessage.error(e?.message || '设定案例导入失败')
  }
}

async function resetForm() {
  const hadInput = hasInput.value
  if (hadInput) {
    try {
      await ElMessageBox.confirm(
        submitted.value
          ? '重置只会清空当前表单内容，不会中断已在后台运行的分析任务。确定重置吗？'
          : '将清空已填写的全部内容，确定重置吗？',
        '重置场景设定',
        { type: 'warning', confirmButtonText: '重置', cancelButtonText: '取消' },
      )
    } catch {
      return
    }
  }
  formRef.value?.clearValidate()
  Object.assign(form, createDefaultForm())
  if (hadInput) ElMessage.success('已重置为默认场景设定')
}

/** 提交只负责保存场景并创建任务,不等待方案生成;方案在「方案确认」页再拉起 */
async function submitScenario() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('请先填写核心研判问题')
    return
  }

  try {
    const scenario = scenarioStore.isSupplyChain ? 'auto' : 'uranium'
    const result = await store.start({
      scenario,
      scenario_spec: {
        question: form.question.trim(),
        background_event: form.backgroundEvent.trim(),
        commodity: form.commodity.trim(),
        source_countries: form.sourceCountries,
        route_ids: form.routeIds,
        time_window: { start: form.timeRange?.[0] || '', end: form.timeRange?.[1] || '' },
        // 采购量为空时保持 null：不转成 0，也不生成默认数量
        quantity: form.quantity ?? null,
        unit: form.unit,
        objectives: deriveObjectives(form.question),
        counterfactual: deriveScenario(form.question),
      },
    })
    submitted.value = true
    scenarioStore.setLastUserMessage(form.question.trim())
    // 先 replace 把 session_id 写进当前记录,再 push 到方案确认页:
    // 这样浏览器「返回上一步」能带着 session_id 回到本页并保留已填内容。
    const query = { ...route.query, session_id: result.session_id, scenario }
    await router.replace({ query })
    await router.push({ path: SCNET_ROUTES.planConfirmation, query })
  } catch (e) {
    ElMessage.error(e?.message || '场景保存失败')
  }
}

/** 任务已创建后再次提交：明确提示这是一次新的分析任务 */
async function resubmitScenario() {
  try {
    await ElMessageBox.confirm(
      '当前已有一次分析任务。重新生成会基于当前表单内容创建一次新的分析方案，原任务不会被中断。',
      '确认创建新的分析任务',
      { type: 'warning', confirmButtonText: '创建新任务', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  await submitScenario()
}

onMounted(async () => {
  const sid = String(route.query.session_id || '')
  if (!sid) return
  try {
    const data = await store.refresh(sid)
    const spec = data?.scenario_spec || {}
    form.question = spec.question || ''
    form.backgroundEvent = spec.background_event || ''
    form.commodity = spec.commodity || ''
    form.sourceCountries = spec.source_countries || []
    form.routeIds = spec.route_ids || []
    form.timeRange = [spec.time_window?.start, spec.time_window?.end].filter(Boolean)
    form.quantity = spec.quantity ?? null
    form.unit = spec.unit || 'tU'
    // 兼容字段（objectives / counterfactual）不再回填到界面，提交时由核心问题推断
    submitted.value = true
    // 回到本页时按会话恢复全局进度;轮询由布局统一持有
    store.ensurePolling(sid)
  } catch { /* 保留表单供重新提交 */ }
})
</script>

<style scoped>
/* ============ 设计令牌：本页统一蓝白灰层级 ============ */
.scenario-setting {
  --brand: #2563eb;
  --brand-dark: #1d4ed8;
  --brand-soft: #eff6ff;
  --brand-line: #bfdbfe;
  --ink: #0f172a;
  --text: #334155;
  --muted: #64748b;
  --faint: #94a3b8;
  --line: #e2e8f0;
  --line-soft: #f1f5f9;
  --radius: 12px;
  --radius-sm: 8px;

  /* 让本页的 Element Plus 控件共用同一套高度 / 圆角 / 主色 */
  --el-color-primary: #2563eb;
  --el-border-color: #e2e8f0;
  --el-border-radius-base: 8px;
  --el-component-size: 38px;

  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #f5f7fa;
  color: var(--text);
  font-size: 14px;
}

.page-wrap {
  flex: 1 1 auto;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 22px 28px 20px;
  box-sizing: border-box;
}

/* ============ 顶部标题栏 ============ */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 18px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--line);
}

.head-titles { min-width: 0; }

.head-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--brand);
}

.head-eyebrow__divider { width: 1px; height: 11px; background: var(--line); }
.head-eyebrow span:last-child { color: var(--faint); font-weight: 500; letter-spacing: 0; }

.head-title {
  margin: 8px 0 6px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.head-desc { margin: 0; font-size: 13px; line-height: 1.6; color: var(--muted); }

.head-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.head-actions { display: flex; align-items: center; gap: 8px; }

/* 设定案例：紧凑次级按钮，浅蓝底浅描边，不与底部主按钮争夺层级 */
.case-button {
  height: 26px;
  padding: 0 12px;
  border: 1px solid var(--brand-line);
  border-radius: 6px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 12px;
  font-weight: 500;
  transition: color 0.16s ease, background 0.16s ease, border-color 0.16s ease;
}

.case-button:hover,
.case-button:focus {
  border-color: var(--brand);
  background: var(--brand);
  color: #fff;
}

/* 运行状态标签 */
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 26px;
  padding: 0 11px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
}

.status-chip__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--faint); }

.status-chip.is-running { color: var(--brand-dark); border-color: var(--brand-line); background: var(--brand-soft); }
.status-chip.is-running .status-chip__dot { background: var(--brand); animation: chip-pulse 1.5s ease-in-out infinite; }
.status-chip.is-ok { color: #047857; border-color: #a7f3d0; background: #ecfdf5; }
.status-chip.is-ok .status-chip__dot { background: #10b981; }
.status-chip.is-error { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
.status-chip.is-error .status-chip__dot { background: #ef4444; }

@keyframes chip-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.35); }
  50% { box-shadow: 0 0 0 4px rgba(37, 99, 235, 0); }
}

/* 五步流程步骤条 */
.flow-steps {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 2px;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  color: var(--faint);
}

.flow-step + .flow-step { position: relative; margin-left: 18px; }
.flow-step + .flow-step::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 50%;
  width: 3px;
  height: 3px;
  margin-top: -1.5px;
  border-radius: 50%;
  background: #cbd5e1;
}

.flow-step__num { font-weight: 700; font-variant-numeric: tabular-nums; }

.flow-step.is-current {
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--brand-soft);
  color: var(--brand);
  font-weight: 600;
}

.flow-step.is-done .flow-step__label { color: var(--ink); }
.flow-step.is-done .flow-step__num { color: #10b981; }
.flow-step.is-running .flow-step__label,
.flow-step.is-running .flow-step__num { color: var(--brand); }
.flow-step.is-failed .flow-step__label,
.flow-step.is-failed .flow-step__num { color: #dc2626; }

/* ============ 主体两栏布局 ============ */
.page-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.47fr);
  gap: 20px;
  align-items: start;
}

.config { display: flex; flex-direction: column; min-width: 0; }

/* ============ 配置区块 ============ */
.panel {
  padding: 20px 22px 22px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.panel + .panel { margin-top: 16px; }

.panel-head {
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 3px solid var(--brand);
}

.panel-head__line { display: flex; align-items: center; gap: 8px; }

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--ink);
}

.panel-badge {
  display: inline-flex;
  align-items: center;
  height: 19px;
  padding: 0 7px;
  border-radius: 4px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 11px;
  line-height: 1;
}

.panel-desc { margin: 6px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--muted); }

/* 表单控件统一外观 */
.setting-form :deep(.el-form-item) { margin-bottom: 0; }
.setting-form :deep(.el-form-item__label) {
  padding: 0 0 7px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--text);
}
.setting-form :deep(.el-form-item__error) { padding-top: 5px; font-size: 11.5px; }
.setting-form :deep(.el-textarea__inner) {
  padding: 11px 14px;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink);
}
.setting-form :deep(.el-date-editor) { height: var(--el-component-size); }

/* A. 核心研判问题 */
.question-field :deep(.el-textarea__inner) {
  padding: 14px 16px;
  font-size: 14px;
  line-height: 1.8;
  border-radius: 10px;
}

.example-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
}

.example-row__label { flex-shrink: 0; padding-top: 5px; font-size: 12px; color: var(--faint); }
.example-row__list { display: flex; flex-wrap: wrap; gap: 8px; }

/* 纯提示标签：无选择态、不可点击，避免被误认为必选项 */
/* 问题模板标签：可点击填入，但无选中态、无对勾，避免被误认为必选项 */
.hint-tag {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 11px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: #f8fafc;
  color: var(--muted);
  font-size: 12.5px;
  font-family: inherit;
  line-height: 1;
  cursor: pointer;
  transition: color 0.16s ease, border-color 0.16s ease, background 0.16s ease;
}

.hint-tag:hover {
  border-color: var(--brand-line);
  background: var(--brand-soft);
  color: var(--brand);
}

/* 字段下方的补充说明：在 el-form-item__content 的 flex 布局中单独占一行 */
.field-hint {
  width: 100%;
  margin: 8px 0 0;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--faint);
}

/* 按问题内容出现的轻提示，不是固定卡片 */
.panel-note {
  margin: 16px 0 0;
  padding: 10px 12px;
  border: 1px solid var(--brand-line);
  border-radius: var(--radius-sm);
  background: var(--brand-soft);
  color: var(--brand-dark);
  font-size: 12px;
  line-height: 1.7;
}

.example-row__note { margin: 10px 0 0; font-size: 11.5px; line-height: 1.7; color: var(--faint); }

/* B. 场景边界 */
.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 24px;
}

.field-grid :deep(.el-form-item) { min-width: 0; }

.quantity-row { display: flex; gap: 8px; width: 100%; }
.quantity-row :deep(.el-input-number) { flex: 1 1 auto; min-width: 0; }
.quantity-row :deep(.el-select) { flex: 0 0 104px; }

/* ============ 右侧任务摘要 ============ */
.summary { min-width: 0; }

.summary-card {
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 168px);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}

.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 15px 18px;
  border-bottom: 1px solid var(--line-soft);
}

.summary-head h2 { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--ink); }

.summary-scenario {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border: 1px solid var(--brand-line);
  border-radius: 6px;
  background: var(--brand-soft);
  color: var(--brand-dark);
  font-size: 11.5px;
}

.summary-body { flex: 1 1 auto; min-height: 0; padding: 16px 18px 18px; overflow-y: auto; }
.summary-body::-webkit-scrollbar { width: 6px; }
.summary-body::-webkit-scrollbar-thumb { border-radius: 3px; background: #e2e8f0; }

.summary-question {
  padding: 12px 13px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: #f8fafc;
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--text);
}

.summary-question__label {
  display: block;
  margin-bottom: 6px;
  font-size: 11.5px;
  letter-spacing: 0.04em;
  color: var(--faint);
}

.summary-question p { margin: 0; white-space: pre-wrap; word-break: break-word; }

.summary-list { margin: 14px 0 0; }

.summary-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid var(--line-soft);
  font-size: 12.5px;
  line-height: 1.6;
}

.summary-row:first-child { border-top: 0; padding-top: 0; }
.summary-row dt { color: var(--faint); }
.summary-row dd { margin: 0; color: var(--text); word-break: break-word; }
.summary-row dd.is-empty,
.summary-question p.is-empty { color: var(--faint); }

.summary-tags { display: flex; flex-wrap: wrap; gap: 6px; }

.summary-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--brand-soft);
  color: var(--brand-dark);
  font-size: 11.5px;
}

.summary-foot { padding: 14px 18px 16px; border-top: 1px solid var(--line-soft); background: #fafbfc; }
.summary-foot__title { margin: 0 0 9px; font-size: 12px; color: var(--muted); }

.summary-chain {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text);
}

.summary-chain i { font-style: normal; color: #cbd5e1; }
.summary-foot__note { margin: 10px 0 0; font-size: 11.5px; line-height: 1.6; color: var(--faint); }

/* ============ 底部操作区 ============ */
.action-bar {
  position: sticky;
  bottom: 0;
  z-index: 6;
  border-top: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -2px 10px rgba(15, 23, 42, 0.04);
  backdrop-filter: blur(6px);
}

.action-bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  max-width: 1600px;
  margin: 0 auto;
  padding: 12px 28px;
  box-sizing: border-box;
}

.action-info { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 12.5px; color: var(--muted); }
.action-info__dot { flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: var(--brand); }
.action-info__dot.is-running { animation: chip-pulse 1.5s ease-in-out infinite; }
.action-info__dot.is-ok { background: #10b981; }
.action-info__dot.is-error { background: #ef4444; }
.action-info__state { font-weight: 600; color: var(--brand-dark); }
.action-info__sep { width: 1px; height: 12px; background: var(--line); }
.action-info__sub { color: var(--faint); }

.action-buttons { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

/* ExpertWorkflowNav 默认是右下角浮层，此处并入底部操作栏统一排布 */
.action-buttons :deep(.expert-flow-nav) {
  position: static;
  right: auto;
  bottom: auto;
  gap: 0;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

/* ============ 响应式 ============ */
@media (max-width: 1280px) {
  .page-body { grid-template-columns: minmax(0, 1fr) minmax(300px, 0.5fr); }
}

@media (max-width: 1100px) {
  .page-body { grid-template-columns: minmax(0, 1fr); }
  .summary-card { position: static; max-height: none; }
  .summary-body { overflow: visible; }
  .page-head { flex-direction: column; align-items: flex-start; gap: 16px; }
  .head-side { align-items: flex-start; }
}

@media (max-width: 860px) {
  .page-wrap { padding: 18px 16px; }
  .field-grid { grid-template-columns: minmax(0, 1fr); }
  .action-bar__inner { padding: 12px 16px; }
  .action-info__sub,
  .action-info__sep { display: none; }
}
</style>
