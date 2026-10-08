<template>
  <div class="expert-stage-gate">
    <!-- ============ 无会话:保留原页面 ============ -->
    <slot v-if="!sessionId" name="legacy" />

    <template v-else>
      <!-- ============ 案例模式 ============ -->
      <template v-if="isExampleMode">
        <ExpertExampleBadge @back="backToLive">
          <!-- 视图范围切换与「返回当前任务」同排,不再单独占一行 -->
          <template v-if="$slots['stage-tools']" #extra>
            <slot name="stage-tools" />
          </template>
        </ExpertExampleBadge>

        <div v-if="exampleLoading" class="stage-state-card">
          <div class="state-spinner"></div>
          <h2>正在载入案例结果</h2>
          <p>正在读取已发布的案例包……</p>
        </div>

        <div v-else-if="exampleError" class="stage-state-card is-failed">
          <div class="state-icon">!</div>
          <h2>案例结果不可用</h2>
          <p>{{ exampleError }}</p>
          <div class="stage-ops">
            <el-button type="primary" plain @click="loadExampleStage(true)">重新读取</el-button>
            <el-button @click="backToLive">返回当前任务</el-button>
          </div>
        </div>

        <template v-else-if="exampleArtifact">
          <div v-if="liveJustFinished" class="stage-notice">
            <span>当前任务的{{ stageLabel }}已完成，可返回查看。</span>
            <el-button link type="primary" size="small" @click="backToLive">
              查看当前任务结果
            </el-button>
          </div>
          <slot
            :artifact="exampleArtifact"
            :detail="store.detail"
            :mode="'example'"
          />
        </template>
      </template>

      <!-- ============ 真实任务模式 ============ -->
      <template v-else>
        <!-- 已完成:直接展示真实结果,同时保留查看案例的入口 -->
        <template v-if="status === 'completed'">
          <div class="stage-head">
            <div class="stage-tag">
              <span class="stage-tag__dot"></span>当前任务结果
            </div>
            <!-- 视图范围切换放在右上,与「当前任务结果」同排 -->
            <div v-if="$slots['stage-tools']" class="stage-head__tools">
              <slot name="stage-tools" />
            </div>
            <ExpertResultModeSwitch :stage="stage" />
          </div>
          <!-- 已完成但产物缺失:明确报错,不能静默回退成背景数据 -->
          <div v-if="!liveArtifact || liveArtifact.result === undefined" class="stage-state-card is-failed">
            <div class="state-icon">!</div>
            <h2>该阶段已完成，但结果数据缺失</h2>
            <p>该阶段已完成，但结果数据缺失，请检查任务记录。</p>
            <div class="stage-ops">
              <el-button type="primary" plain @click="reload">重新读取</el-button>
              <el-button @click="backToLive">返回当前任务</el-button>
            </div>
          </div>
          <slot v-else :artifact="liveArtifact" :detail="store.detail" :mode="'live'" />
        </template>

        <!-- 失败但已有可用结果:先说明失败,再把上一次的结果展示出来 -->
        <template v-else-if="status === 'failed' && hasUsableResult">
          <div class="stage-failed-bar">
            <span class="stage-failed-bar__icon">!</span>
            <div class="stage-failed-bar__text">
              <b>本阶段运行失败，以下为上一次已生成的结果</b>
              <span v-if="stageError">{{ stageError }}</span>
            </div>
            <div class="stage-failed-bar__ops">
              <el-button size="small" @click="onRetry">重试该阶段</el-button>
              <el-button size="small" @click="viewExample">暂时查看案例</el-button>
            </div>
          </div>
          <slot :artifact="liveArtifact" :detail="store.detail" :mode="'live'" />
        </template>

        <!-- 运行中 / 等待中 / 失败(且没有可用结果) -->
        <ExpertStageRunning
          v-else
          :stage="stage"
          :stage-label="stageLabel"
          :status="status"
          :started-at="stageStartedAt"
          :error="stageError"
          :stages="stageItems"
          :stage-status-of="store.stageStatus"
          @retry="onRetry"
          @view-example="viewExample"
        />
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useExpertWorkflowStore } from '@/stores/scnet/useExpertWorkflowStore'
import { useExpertExampleStore } from '@/stores/scnet/useExpertExampleStore'
import { retryExpertStage } from '@/api/expertWorkflow'
import ExpertStageRunning from './ExpertStageRunning.vue'
import ExpertExampleBadge from './ExpertExampleBadge.vue'
import ExpertResultModeSwitch from './ExpertResultModeSwitch.vue'

const props = defineProps({
  sessionId: { type: String, default: '' },
  stage: { type: String, required: true },
  title: { type: String, default: '分析任务运行中' },
  /** 阶段中文名,用于提示文案 */
  stageLabel: { type: String, default: '' },
})

const store = useExpertWorkflowStore()
const exampleStore = useExpertExampleStore()
const route = useRoute()
const router = useRouter()

const stageItems = [
  { key: 'osint', label: '开源情报' },
  { key: 'judgment', label: '态势研判' },
  { key: 'prediction', label: '态势预测' },
  { key: 'report', label: '报告生成' },
]

const label = computed(
  () => props.stageLabel || stageItems.find((s) => s.key === props.stage)?.label || props.stage,
)

const status = computed(() => store.stageStatus(props.stage))
const liveArtifact = computed(() => store.artifacts?.[props.stage] || null)
const stageStartedAt = computed(() => store.stages?.[props.stage]?.started_at || '')
const stageError = computed(() => store.stages?.[props.stage]?.error || '')

/**
 * 阶段失败时是否还有可展示的结果。
 * 报告重跑失败、但 artifact 里还留着一份完整报告时,不能只给一张失败卡。
 */
const hasUsableResult = computed(() => {
  const value = liveArtifact.value?.result
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return Object.keys(value).length > 0
})

const isExampleMode = computed(() => store.displayMode === 'example')
const exampleArtifact = computed(() => exampleStore.stageArtifacts?.[props.stage] || null)
const exampleLoading = computed(() => Boolean(exampleStore.stageLoading?.[props.stage]))
const exampleError = computed(() => exampleStore.stageError?.[props.stage] || '')

/** 用户在看案例时真实阶段完成了:给一条轻提示,不强制跳回 */
const liveJustFinished = ref(false)

watch(
  () => [store.displayMode, status.value],
  ([mode, current], previous) => {
    if (mode === 'example' && previous && previous[1] !== 'completed' && current === 'completed') {
      liveJustFinished.value = true
    }
    if (mode === 'live') liveJustFinished.value = false
  },
)

async function loadExampleStage(force = false) {
  try {
    await exampleStore.loadMeta()
    await exampleStore.loadStageArtifact(props.stage, { force })
  } catch (e) {
    ElMessage.error(e?.message || '案例阶段结果读取失败')
  }
}

async function viewExample() {
  try {
    await loadExampleStage()
  } catch {
    return
  }
  store.setDisplayMode('example')
}

function backToLive() {
  store.setDisplayMode('live')
}

/** 产物缺失时重新向后端取一次状态 */
async function reload() {
  try {
    await store.refresh(props.sessionId)
  } catch (e) {
    ElMessage.error(e?.message || '重新读取失败')
  }
}

async function onRetry() {
  try {
    await retryExpertStage(props.sessionId, props.stage)
    store.ensurePolling(props.sessionId)
    ElMessage.success(`已重新启动${label.value}阶段`)
  } catch (e) {
    ElMessage.error(e?.message || '重试失败')
  }
}

// 有会话就保证后台轮询在跑:页面切换不会中断它
if (props.sessionId) store.ensurePolling(props.sessionId)

// 进入页面时把已有的案例包元信息读进来,便于「暂时查看案例」按钮判断可用性
exampleStore.loadMeta().catch(() => {})

/* ---------- 展示模式与 URL 同步:刷新后仍能恢复案例视图 ---------- */
// 首次进入:URL 上标了 view=example 就恢复案例模式(并补齐该阶段产物)
if (route.query.view === 'example') {
  store.setDisplayMode('example')
  loadExampleStage().catch(() => {})
}

let syncingFromUrl = false
watch(
  () => store.displayMode,
  (mode) => {
    if (syncingFromUrl) return
    const query = { ...route.query }
    if (mode === 'example') query.view = 'example'
    else delete query.view
    const sameView = (route.query.view || '') === (query.view || '')
    if (sameView) return
    router.replace({ path: route.path, query })
  },
)

// 浏览器前进/后退时跟随 URL
watch(
  () => route.query.view,
  (view) => {
    const want = view === 'example' ? 'example' : 'live'
    if (store.displayMode === want) return
    syncingFromUrl = true
    store.setDisplayMode(want)
    if (want === 'example') loadExampleStage().catch(() => {})
    syncingFromUrl = false
  },
)
</script>

<style scoped>
.expert-stage-gate { width: 100%; height: 100%; min-height: 0; }

.stage-head {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
/* 范围切换推到右侧;未提供该插槽时不渲染,其他阶段布局不变 */
.stage-head__tools { margin-left: auto; display: inline-flex; align-items: center; }
.stage-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  padding: 2px 10px;
}
.stage-tag__dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }

.stage-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
}

/* 失败但仍有可用结果时的提示条 */
.stage-failed-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: #fef7f7;
  border: 1px solid #fecaca;
  border-radius: 8px;
  flex-wrap: wrap;
}
.stage-failed-bar__icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  display: grid;
  place-items: center;
}
.stage-failed-bar__text { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 2px; }
.stage-failed-bar__text b { font-size: 13px; color: #b91c1c; font-weight: 600; }
.stage-failed-bar__text span { font-size: 12px; color: #64748b; word-break: break-all; }
.stage-failed-bar__ops { display: flex; gap: 8px; flex-shrink: 0; }

.stage-state-card {
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  background: linear-gradient(135deg, #f8fafc, #eff6ff);
}
.stage-state-card h2 { margin: 18px 0 8px; color: #0f172a; font-size: 22px; }
.stage-state-card p { color: #64748b; margin: 0 0 24px; }
.stage-ops { display: flex; gap: 10px; }
.state-spinner {
  width: 42px; height: 42px;
  border: 4px solid #dbeafe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin .9s linear infinite;
}
.state-icon {
  width: 42px; height: 42px;
  border-radius: 50%;
  display: grid; place-items: center;
  color: #fff; background: #ef4444;
  font-weight: 800;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
