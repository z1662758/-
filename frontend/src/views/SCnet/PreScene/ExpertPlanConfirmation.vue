<template>
  <div class="plan-page">
    <div class="page-wrap">
      <!-- ===== 顶部标题栏 ===== -->
      <header class="page-head">
        <div class="head-titles">
          <div class="head-eyebrow">
            <span>专家模式</span>
            <i class="head-eyebrow__divider"></i>
            <span>{{ scenarioStore.label }}</span>
          </div>
          <h1 class="head-title">方案确认</h1>
          <p class="head-desc">
            系统已根据您的研判问题，从知识库和模型库中生成分析方案。您可以调整方案，确认后再启动正式分析。
          </p>
        </div>

        <div class="head-side">
          <div class="head-actions">
            <div v-if="statusChip" class="status-chip" :class="`is-${statusChip.tone}`">
              <span class="status-chip__dot"></span>{{ statusChip.text }}
            </div>
            <!-- 方案案例任何状态下都可点击,不受生成/加载状态影响 -->
            <el-button class="ghost-button" size="small" @click="onUseExample">
              方案案例
            </el-button>
            <!-- 历史方案:只列真实生成过的,可只读查看并载入当前草稿 -->
            <el-button class="ghost-button" size="small" @click="historyVisible = true">
              历史方案
            </el-button>
            <el-button
              class="ghost-button"
              size="small"
              :disabled="!store.canExport"
              @click="onExportPdf"
            >
              导出PDF
            </el-button>
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

      <!-- ===== 任务摘要条 ===== -->
      <div class="meta-bar">
        <el-button class="ghost-button" size="small" @click="goBack">← 返回上一步</el-button>
        <dl class="meta-list">
          <div><dt>任务编号</dt><dd>{{ store.taskId || '—' }}</dd></div>
          <div><dt>方案状态</dt><dd :class="`tone-${statusChip?.tone || 'muted'}`">{{ store.planStatusLabel }}</dd></div>
          <div><dt>生成时间</dt><dd>{{ generatedAtText }}</dd></div>
          <div><dt>方案版本</dt><dd>v{{ store.planVersion || 1 }}</dd></div>
          <div v-if="store.dirty"><dt>未保存</dt><dd class="tone-warn">有未保存修改</dd></div>
        </dl>
      </div>

      <!-- ===== 方案主体 ===== -->
      <main class="plan-body">
        <!-- 1) 正在生成:骨架屏,不显示任何假方案内容 -->
        <div v-if="store.isGenerating" class="state-card">
          <div class="state-card__head">
            <span class="state-spinner"></span>
            <div>
              <h2>正在生成分析方案</h2>
              <p>正在根据场景设定、知识库数据和模型能力生成分析方案……</p>
              <p class="state-elapsed">{{ store.elapsedText }}</p>
            </div>
          </div>
          <p v-if="store.waitHint" class="state-hint">{{ store.waitHint }}</p>
          <div class="state-card__ops">
            <el-button :loading="store.submitting" @click="onRegenerate">重新生成</el-button>
            <el-button @click="onUseExample">使用方案案例</el-button>
          </div>
          <div class="skeleton">
            <div v-for="row in 5" :key="row" class="skeleton__block">
              <span class="skeleton__title"></span>
              <span v-for="line in 3" :key="line" class="skeleton__line" :style="{ width: `${92 - line * 12}%` }"></span>
            </div>
          </div>
        </div>

        <!-- 2) 生成失败/超时:立即停止骨架屏,给出可执行操作 -->
        <div v-else-if="store.hasFailedOrTimedOut" class="state-card is-failed">
          <div class="state-card__head">
            <span class="state-icon">!</span>
            <div>
              <h2>{{ failureTitle }}</h2>
              <p>{{ failureText }}</p>
              <p v-if="store.plan?.error" class="state-error">{{ store.plan.error }}</p>
            </div>
          </div>
          <div class="state-card__ops">
            <el-button @click="goBack">返回上一步</el-button>
            <el-button type="primary" :loading="store.submitting" @click="onRegenerate">
              重新生成
            </el-button>
            <el-button @click="onUseExample">使用方案案例</el-button>
          </div>
        </div>

        <!-- 3) 场景信息缺失:无法定位任务 -->
        <div v-else-if="!store.sessionId" class="state-card is-failed">
          <div class="state-card__head">
            <span class="state-icon">!</span>
            <div>
              <h2>未找到对应的场景任务</h2>
              <p>请先完成场景设定，系统会在保存后自动进入本页。</p>
            </div>
          </div>
          <div class="state-card__ops">
            <el-button type="primary" @click="router.push({ path: SCNET_ROUTES.scenarioSetting, query: route.query })">
              去填写场景设定
            </el-button>
          </div>
        </div>

        <!-- 4) 有方案:可编辑、可选择 -->
        <template v-else-if="store.draft">
          <div v-if="store.planMode === 'example'" class="example-banner">
            <span>当前为示例方案，您可以继续编辑。</span>
            <el-button link type="primary" size="small" @click="onRegenerate">
              改用真实生成
            </el-button>
          </div>
          <div v-else-if="store.planMode === 'imported'" class="example-banner is-imported">
            <span>
              当前为载入的历史方案（来自任务
              {{ store.plan?.imported_from?.task_id || store.plan?.imported_from?.session_id }}，
              v{{ store.plan?.imported_from?.plan_version }}），您可以继续编辑并确认。
            </span>
          </div>

          <PlanTaskSummary
            :summary="store.draft.taskSummary"
            @update:summary="setSlice('taskSummary', $event)"
            @dirty="store.markDirty()"
          />
          <PlanQuestionList
            :questions="store.draft.analysisQuestions"
            @update:questions="setSlice('analysisQuestions', $event)"
            @dirty="store.markDirty()"
          />
          <PlanResourceList
            :resources="store.draft.dataSources"
            @update:resources="setSlice('dataSources', $event)"
            @dirty="store.markDirty()"
          />
          <PlanModelList
            :models="store.draft.models"
            :catalog-models="store.catalog?.models || []"
            @update:models="setSlice('models', $event)"
            @dirty="store.markDirty()"
          />
          <PlanWorkflowFlow
            :steps="store.draft.workflow"
            @update:steps="setSlice('workflow', $event)"
            @dirty="store.markDirty()"
          />
          <PlanIndicatorList
            :indicators="store.draft.indicators"
            @update:indicators="setSlice('indicators', $event)"
            @dirty="store.markDirty()"
          />
          <PlanOutputPicker
            :outputs="store.draft.outputs"
            @update:outputs="setSlice('outputs', $event)"
            @dirty="store.markDirty()"
          />
          <PlanLimitations
            :limitations="store.draft.limitations"
            @update:limitations="setSlice('limitations', $event)"
            @dirty="store.markDirty()"
          />

          <div v-if="store.draft.droppedSelections?.length" class="dropped-note">
            <b>已自动剔除大模型给出的无效选择：</b>
            {{ store.draft.droppedSelections.join('、') }}（系统中不存在这些数据源或模型 ID）
          </div>
        </template>

        <!-- 5) 尚未生成方案,等待拉起 -->
        <div v-else class="state-card">
          <div class="state-card__head">
            <span class="state-spinner"></span>
            <div>
              <h2>准备生成分析方案</h2>
              <p>正在读取知识库与模型库的可用能力，请稍候……</p>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- ===== 底部固定操作栏 ===== -->
    <footer class="action-bar">
      <div class="action-bar__inner">
        <div class="action-info">
          <span class="action-info__dot" :class="`is-${statusChip?.tone}`"></span>
          <span>{{ footerHint }}</span>
        </div>
        <div class="action-buttons">
          <el-button @click="goBack">返回上一步</el-button>
          <el-button
            :loading="store.saving"
            :disabled="!store.canUsePlan"
            @click="onSave"
          >
            保存方案
          </el-button>
          <el-button
            v-if="store.isConfirmed"
            type="primary"
            @click="goToJudgment"
          >下一步：态势研判</el-button>
          <el-button
            v-else
            type="primary"
            :loading="store.confirming"
            :disabled="startDisabled"
            @click="onStartAnalysis"
          >
            开始分析
          </el-button>
        </div>
      </div>
    </footer>

    <PlanHistoryDrawer v-model="historyVisible" />

    <PlanPrintSheet
      :content="store.draft"
      :task-id="store.taskId"
      :version="store.planVersion"
      :generated-at="generatedAtText"
      :scenario-label="scenarioStore.label"
      :status-text="store.planStatusLabel"
      :mode-text="store.planMode === 'example' ? '示例方案' : '模型生成'"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { useScenarioStore } from '@/stores/scenario'
import { useExpertPlanStore } from '@/stores/scnet/useExpertPlanStore'
import PlanTaskSummary from '@/views/SCnet/components/plan/PlanTaskSummary.vue'
import PlanQuestionList from '@/views/SCnet/components/plan/PlanQuestionList.vue'
import PlanResourceList from '@/views/SCnet/components/plan/PlanResourceList.vue'
import PlanModelList from '@/views/SCnet/components/plan/PlanModelList.vue'
import PlanWorkflowFlow from '@/views/SCnet/components/plan/PlanWorkflowFlow.vue'
import PlanIndicatorList from '@/views/SCnet/components/plan/PlanIndicatorList.vue'
import PlanOutputPicker from '@/views/SCnet/components/plan/PlanOutputPicker.vue'
import PlanLimitations from '@/views/SCnet/components/plan/PlanLimitations.vue'
import PlanHistoryDrawer from '@/views/SCnet/components/plan/PlanHistoryDrawer.vue'
import PlanPrintSheet from '@/views/SCnet/components/plan/PlanPrintSheet.vue'

const route = useRoute()
const router = useRouter()
const scenarioStore = useScenarioStore()
const store = useExpertPlanStore()

const bootstrapping = ref(false)
const historyVisible = ref(false)

const startDisabled = computed(
  () =>
    !store.canUsePlan
    || store.confirming
    || !hasEnabledQuestion.value
    || !hasEnabledResource.value,
)

const hasEnabledQuestion = computed(
  () => (store.draft?.analysisQuestions || []).some(
    (item) => item.enabled !== false && String(item.title || '').trim(),
  ),
)
const hasEnabledResource = computed(
  () => (store.draft?.dataSources || []).some((item) => item.enabled !== false),
)

/* ---------- 顶部步骤条 ---------- */
const flowSteps = computed(() => {
  const list = [
    { key: 'setting', num: '01', label: '场景设定', state: 'done' },
    { key: 'plan', num: '02', label: '方案确认', state: 'current' },
    { key: 'osint', num: '03', label: '开源情报' },
    { key: 'judgment', num: '04', label: '态势研判' },
    { key: 'prediction', num: '05', label: '态势预测' },
    { key: 'report', num: '06', label: '报告生成' },
  ]
  return list.map((step) => (step.state ? step : { ...step, state: 'muted' }))
})

const statusChip = computed(() => {
  if (store.isGenerating) return { text: '正在生成方案', tone: 'running' }
  if (store.generationStatus === 'timeout') return { text: '生成超时', tone: 'error' }
  if (store.generationStatus === 'superseded') return { text: '结果已被替代', tone: 'error' }
  if (store.generationStatus === 'failed') return { text: '生成失败', tone: 'error' }
  if (store.analysisStatus === 'completed') return { text: '分析完成', tone: 'ok' }
  if (store.analysisStatus === 'failed') return { text: '分析运行失败', tone: 'error' }
  if (['running', 'confirmed'].includes(store.analysisStatus)) {
    return { text: '已确认 · 分析执行中', tone: 'ok' }
  }
  if (store.planMode === 'example') return { text: '示例方案 · 待确认', tone: 'muted' }
  if (store.draft) return { text: '待确认', tone: 'muted' }
  return { text: '待生成', tone: 'muted' }
})

const failureTitle = computed(() => {
  if (store.generationStatus === 'timeout') return '方案生成超时'
  if (store.generationStatus === 'superseded') return '方案生成结果已被替代'
  return '分析方案生成失败'
})

const failureText = computed(() => {
  if (store.generationStatus === 'timeout') {
    return '生成时间超过服务端允许的上限，任务已停止。您可以重新生成，或直接使用方案案例继续。'
  }
  if (store.generationStatus === 'superseded') {
    return '这次生成的结果在返回时已被其他操作替代，没有写入当前方案。您可以重新生成。'
  }
  return '分析方案生成失败，请重试或返回修改场景设定。'
})

const generatedAtText = computed(() => {
  const raw = store.plan?.content?._generation?.generated_at || store.plan?.saved_at || store.plan?.created_at
  return formatTime(raw)
})

function formatTime(raw) {
  if (!raw) return '—'
  const text = String(raw).replace('T', ' ')
  return text.length > 16 ? text.slice(0, 16) : text
}

const footerHint = computed(() => {
  if (store.isGenerating) return '方案生成中，完成后可以编辑与确认。'
  if (store.generationStatus === 'timeout') return '方案生成超时，可重新生成或使用方案案例。'
  if (store.generationStatus === 'superseded') return '本次生成结果已被替代，可重新生成。'
  if (store.generationStatus === 'failed') return '方案生成失败，可重试或返回修改场景设定。'
  if (store.analysisStatus === 'completed') return '分析已完成，点击下一步依次查看研判、预测和报告。'
  if (['running', 'confirmed'].includes(store.analysisStatus)) {
    return '分析已在后台自动执行，无需停留在本页。'
  }
  if (store.dirty) return '有未保存修改，确认前建议先保存方案。'
  return '确认方案后才会启动开源情报及后续步骤。'
})

/* ---------- 数据加载 ---------- */
async function bootstrap() {
  const sessionId = String(route.query.session_id || '')
  store.bind(sessionId)
  if (!sessionId) return

  bootstrapping.value = true
  try {
    await store.refresh(sessionId)
    store.loadCatalog(sessionId).catch(() => {})
    const plan = store.plan
    const status = plan?.generation_status || 'idle'
    // 刷新后按后端状态恢复:
    // - generating → 接着轮询,不重复发起
    // - draft/example → 直接展示,不重新触发生成
    // - timeout/failed/superseded → 展示失败态,等用户点「重新生成」
    // - idle/空 → 这是首次进入,自动拉起真实生成
    if (status === 'generating') {
      store.startPolling(sessionId)
    } else if (
      plan?.plan_mode !== 'example'
      && !store.draft
      && ['idle', ''].includes(status)
    ) {
      await store.ensureGenerated()
    }
  } catch (e) {
    ElMessage.error(e?.message || '读取分析方案失败')
  } finally {
    bootstrapping.value = false
  }
}

onMounted(bootstrap)
onBeforeUnmount(() => store.stopAll())

/* ---------- 交互 ---------- */
/** 子组件统一通过 emit 回写方案切片,页面这里落到草稿上 */
function setSlice(key, value) {
  if (!store.draft) return
  store.draft[key] = value
}

function goBack() {
  router.push({ path: SCNET_ROUTES.scenarioSetting, query: route.query })
}

function goToJudgment() {
  router.push({ path: SCNET_ROUTES.situationJudge, query: route.query }).catch((error) => {
    ElMessage.error(error?.message || '进入态势研判失败')
  })
}

async function onRegenerate() {
  try {
    await ElMessageBox.confirm(
      '重新生成会由大模型基于当前场景设定与知识库重新产出方案，将覆盖当前草稿并作废正在进行的生成结果。是否继续？',
      '重新生成方案',
      { type: 'warning', confirmButtonText: '重新生成', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await store.regenerate()
    ElMessage.success('已开始重新生成方案')
  } catch (e) {
    ElMessage.error(e?.message || '重新生成失败')
  }
}

/**
 * 方案案例:只替换当前草稿,不启动任何正式分析。
 * 真实方案仍在生成时给出明确提示并等用户确认,确认后立即生效,
 * 不会等大模型跑完才响应。
 */
async function onUseExample() {
  const generating = store.isGenerating
  if (generating) {
    try {
      await ElMessageBox.confirm(
        '真实方案仍在生成。切换到方案案例后，当前生成结果将不会覆盖案例内容，是否继续？',
        '使用方案案例',
        { type: 'warning', confirmButtonText: '使用方案案例', cancelButtonText: '取消' },
      )
    } catch {
      return
    }
  } else if (store.draft) {
    try {
      await ElMessageBox.confirm(
        '使用方案案例将覆盖当前方案草稿，是否继续？',
        '使用方案案例',
        { type: 'warning', confirmButtonText: '继续使用', cancelButtonText: '取消' },
      )
    } catch {
      return
    }
  }
  try {
    await store.loadExample()
    ElMessage.success('方案案例已载入，您可以继续编辑。')
  } catch (e) {
    ElMessage.error(e?.message || '载入方案案例失败')
  }
}

async function onSave() {
  if (!store.draft) return
  if (!hasEnabledQuestion.value) {
    ElMessage.warning('请至少保留一个分析问题')
    return
  }
  try {
    await store.saveDraft()
    ElMessage.success('方案草稿已保存')
  } catch (e) {
    ElMessage.error(e?.message || '保存方案失败')
  }
}

async function onStartAnalysis() {
  if (!hasEnabledQuestion.value) {
    ElMessage.warning('请至少保留一个分析问题')
    return
  }
  if (!hasEnabledResource.value) {
    ElMessage.warning('请至少选择一个数据资源')
    return
  }
  const hasModelOrStep =
    (store.draft?.models || []).some((item) => item.enabled !== false)
    || (store.draft?.workflow || []).some((item) => item.enabled !== false)
  if (!hasModelOrStep) {
    ElMessage.warning('请至少选择一个分析模型或可执行分析能力')
    return
  }

  try {
    await ElMessageBox.confirm(
      '确认方案后将启动正式分析，开源情报、态势研判、态势预测与报告生成会在后台自动依次执行，且依据本方案进行。是否继续？',
      '确认并开始分析',
      { type: 'info', confirmButtonText: '开始分析', cancelButtonText: '再看看' },
    )
  } catch {
    return
  }

  try {
    await store.confirm()
    ElMessage.success('方案已确认，分析流程已启动')
    await router.push({
      path: SCNET_ROUTES.situationJudge,
      query: { ...route.query, scenario: scenarioStore.isSupplyChain ? 'supply_chain' : 'uranium' },
    })
  } catch (e) {
    ElMessage.error(e?.message || '确认方案失败')
  }
}

/** 导出的是当前分析方案,不是最终分析报告;用打印专用版式 + 浏览器另存为 PDF */
function onExportPdf() {
  if (!store.canExport) return
  const taskNo = store.taskId || 'unknown'
  const date = new Date().toISOString().slice(0, 10)
  const original = document.title
  document.title = `供应链分析方案_${taskNo}_${date}`
  const restore = () => {
    document.title = original
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  window.print()
  window.setTimeout(restore, 2000)
}

/** 有未保存内容时离开路由需要用户确认 */
onBeforeRouteLeave(async (to, from, next) => {
  // 离开页面一律停掉轮询与在飞请求,避免组件卸载后回调泄漏
  // 已导入的完整案例只用于逐页浏览。案例产物已固定，不能把页面草稿
  // 保存为新的研判输入；即使编辑控件标记了 dirty，也应能直接进入下一步。
  if (
    to.path === SCNET_ROUTES.situationJudge
    && store.planMode === 'example'
    && store.analysisStatus === 'completed'
  ) {
    store.stopAll()
    next()
    return
  }
  if (!store.dirty || !store.draft) {
    store.stopAll()
    next()
    return
  }
  try {
    await ElMessageBox.confirm(
      '当前方案有未保存的修改，离开后将丢失。是否保存后再离开？',
      '有未保存修改',
      {
        type: 'warning',
        distinguishCancelAndClose: true,
        confirmButtonText: '保存并离开',
        cancelButtonText: '放弃修改',
      },
    )
    await store.saveDraft()
    store.stopAll()
    next()
  } catch (action) {
    store.stopAll()
    if (action === 'cancel') {
      // 「放弃修改」:直接离开
      next()
      return
    }
    next(false)
  }
})
</script>

<style scoped>
.plan-page {
  --brand: #2563eb;
  --brand-dark: #1d4ed8;
  --brand-soft: #eff6ff;
  --brand-line: #bfdbfe;
  --ink: #0f172a;
  --text: #334155;
  --muted: #64748b;
  --faint: #94a3b8;
  --line: #e2e8f0;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #f5f7fa;
}
.page-wrap {
  flex: 1 1 auto;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 18px 22px 20px;
  box-sizing: border-box;
}

/* ===== 顶部标题栏 ===== */
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px 20px;
}
.head-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--faint);
  letter-spacing: .4px;
}
.head-eyebrow__divider { width: 1px; height: 11px; background: var(--line); }
.head-title { margin: 4px 0 4px; font-size: 21px; color: var(--ink); }
.head-desc { margin: 0; font-size: 13px; color: var(--muted); max-width: 720px; line-height: 1.6; }
.head-side { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; }
.head-actions { display: flex; align-items: center; gap: 8px; }

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  color: var(--muted);
  background: #fff;
}
.status-chip__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--faint); }
.status-chip.is-running { color: var(--brand-dark); border-color: var(--brand-line); background: var(--brand-soft); }
.status-chip.is-running .status-chip__dot { background: var(--brand); animation: chip-pulse 1.5s ease-in-out infinite; }
.status-chip.is-ok { color: #047857; border-color: #a7f3d0; background: #ecfdf5; }
.status-chip.is-ok .status-chip__dot { background: #10b981; }
.status-chip.is-error { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
.status-chip.is-error .status-chip__dot { background: #ef4444; }
@keyframes chip-pulse { 50% { opacity: .35; } }

.ghost-button { border-color: var(--line); color: var(--text); }
.ghost-button:hover { border-color: var(--brand-line); color: var(--brand-dark); }

/* ===== 步骤条 ===== */
.flow-steps {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  font-size: 12px;
}
.flow-step { display: flex; align-items: center; gap: 5px; color: var(--faint); }
.flow-step + .flow-step { position: relative; margin-left: 14px; }
.flow-step + .flow-step::before {
  content: '›';
  position: absolute;
  left: -12px;
  color: #cbd5e1;
}
.flow-step__num { font-weight: 700; font-variant-numeric: tabular-nums; }
.flow-step.is-current { color: var(--brand-dark); }
.flow-step.is-current .flow-step__num { color: var(--brand); }
.flow-step.is-done { color: #059669; }
.flow-step.is-running .flow-step__label, .flow-step.is-running .flow-step__num { color: var(--brand); }
.flow-step.is-failed .flow-step__label, .flow-step.is-failed .flow-step__num { color: #dc2626; }

/* ===== 任务摘要条 ===== */
.meta-bar {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 12px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
}
.meta-list { display: flex; flex-wrap: wrap; gap: 22px; margin: 0; font-size: 12px; }
.meta-list > div { display: flex; align-items: baseline; gap: 6px; }
.meta-list dt { color: var(--faint); }
.meta-list dd { margin: 0; color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.meta-list dd.tone-warn { color: #b45309; }
.meta-list dd.tone-running { color: var(--brand-dark); }
.meta-list dd.tone-ok { color: #059669; }
.meta-list dd.tone-error { color: #dc2626; }

/* ===== 方案主体 ===== */
.plan-body { margin-top: 12px; }

.example-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}
.example-banner.is-imported {
  color: #1d4ed8;
  background: #f8fbff;
  border-color: #bfdbfe;
}

.state-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 26px 24px;
}
.state-card.is-failed { border-color: #fecaca; background: #fffdfd; }
.state-card__head { display: flex; gap: 14px; align-items: flex-start; }
.state-card h2 { margin: 0 0 6px; font-size: 17px; color: var(--ink); }
.state-card p { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.6; }
.state-error { margin-top: 8px !important; color: #b91c1c !important; font-family: ui-monospace, monospace; font-size: 12px !important; }
.state-elapsed { margin-top: 4px !important; font-size: 12px !important; color: #94a3b8 !important; font-variant-numeric: tabular-nums; }
.state-hint {
  margin: 16px 0 0 !important;
  padding: 9px 12px;
  font-size: 12px !important;
  color: #b45309 !important;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  line-height: 1.6;
}
.state-card__ops { margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap; }
.state-spinner {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  margin-top: 2px;
  border: 3px solid #dbeafe;
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin .9s linear infinite;
}
.state-icon {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  margin-top: 2px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #ef4444;
  color: #fff;
  font-weight: 800;
  font-size: 14px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.skeleton { margin-top: 22px; }
.skeleton__block { margin-bottom: 18px; }
.skeleton__title, .skeleton__line {
  display: block;
  height: 11px;
  border-radius: 5px;
  background: linear-gradient(90deg, #eef2f7 25%, #e2e8f0 37%, #eef2f7 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  margin-bottom: 8px;
}
.skeleton__title { width: 160px; height: 14px; }
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }

.dropped-note {
  margin-top: 4px;
  padding: 10px 14px;
  font-size: 12px;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}
.dropped-note b { font-weight: 600; }

/* ===== 底部固定操作栏 ===== */
.action-bar {
  position: sticky;
  bottom: 0;
  z-index: 6;
  background: rgba(255, 255, 255, .96);
  border-top: 1px solid var(--line);
  box-shadow: 0 -2px 10px rgba(15, 23, 42, .04);
  backdrop-filter: blur(6px);
}
.action-bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 22px;
}
.action-info { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
.action-info__dot { flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: var(--brand); }
.action-info__dot.is-running { animation: chip-pulse 1.5s ease-in-out infinite; }
.action-info__dot.is-ok { background: #10b981; }
.action-info__dot.is-error { background: #ef4444; }
.action-buttons { display: flex; gap: 10px; }

@media (max-width: 1200px) {
  .page-head { flex-direction: column; }
  .head-side { align-items: flex-start; }
  .flow-step + .flow-step { margin-left: 10px; }
  .flow-step + .flow-step::before { left: -9px; }
}
</style>
