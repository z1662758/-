<template>
  <div class="stage-running" :class="`is-${status}`">
    <div class="stage-running__main">
      <span v-if="status === 'running'" class="state-spinner"></span>
      <span v-else-if="status === 'failed'" class="state-icon">!</span>
      <span v-else class="state-icon is-waiting">…</span>

      <div class="stage-running__text">
        <h2>{{ heading }}</h2>
        <p>{{ description }}</p>
        <p v-if="startedAtText" class="stage-running__meta">
          本阶段开始于 {{ startedAtText }}
          <template v-if="elapsedText"> · 已运行 {{ elapsedText }}</template>
        </p>
        <p v-if="status === 'failed' && friendlyError" class="stage-running__error">{{ friendlyError }}</p>
        <details v-if="status === 'failed' && showTechnical" class="stage-running__tech">
          <summary>技术详情</summary>
          <p>{{ error }}</p>
        </details>
      </div>
    </div>

    <!-- 报告阶段:展示 7 个生成阶段,避免 3-4 分钟只看到静态"正在生成" -->
    <ol v-if="reportPhases.length" class="report-phases">
      <li
        v-for="phase in reportPhases"
        :key="phase.key"
        class="report-phase"
        :class="`is-${phase.state}`"
      >
        <span class="report-phase__dot"></span>
        <span class="report-phase__label">{{ phase.label }}</span>
        <b class="report-phase__state">{{ phaseStateText(phase.state) }}</b>
      </li>
    </ol>
    <p v-if="reportChapterHint" class="report-chapter-hint">{{ reportChapterHint }}</p>

    <!-- 五步进度:让用户知道自己在整条链路的哪一环 -->
    <ol class="stage-track">
      <li
        v-for="item in stages"
        :key="item.key"
        class="stage-track__item"
        :class="`is-${stageStatusOf(item.key)}`"
      >
        <span class="stage-track__dot"></span>
        <span class="stage-track__label">{{ item.label }}</span>
        <b class="stage-track__status">{{ statusText(stageStatusOf(item.key)) }}</b>
      </li>
    </ol>

    <div class="stage-running__ops">
      <el-button
        v-if="status === 'failed'"
        type="primary"
        @click="emit('retry')"
      >
        重试该阶段
      </el-button>
      <el-button @click="emit('view-example')">
        暂时查看案例
      </el-button>
      <span class="stage-running__hint">
        切换后不会停止后台分析，您可以随时返回当前任务。
      </span>
    </div>

    <div class="stage-running__skeleton">
      <span v-for="row in 3" :key="row" class="skeleton-line" :style="{ width: `${88 - row * 14}%` }"></span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useExpertWorkflowStore } from '@/stores/scnet/useExpertWorkflowStore'
import { friendlyErrorText, hasTechnicalDetail } from './expertErrorText'

const props = defineProps({
  stage: { type: String, required: true },
  stageLabel: { type: String, default: '' },
  /** waiting / running / failed */
  status: { type: String, default: 'waiting' },
  startedAt: { type: String, default: '' },
  error: { type: String, default: '' },
  stages: { type: Array, default: () => [] },
  stageStatusOf: { type: Function, required: true },
})
const emit = defineEmits(['retry', 'view-example'])

const label = computed(() => props.stageLabel || props.stage)

/** 失败原因翻译成人话;原始技术错误收进「技术详情」 */
const friendlyError = computed(() => friendlyErrorText(props.error))
const showTechnical = computed(() => hasTechnicalDetail(props.error))

const heading = computed(() => {
  if (props.status === 'running') return `${label.value}正在运行`
  if (props.status === 'failed') return `${label.value}运行失败`
  return '正在等待前置步骤完成'
})

const description = computed(() => {
  if (props.status === 'running') {
    return `正在生成当前任务的${label.value}结果，请稍候……后台分析将继续运行，您可以暂时查看案例。`
  }
  if (props.status === 'failed') {
    // 报告是最后一步,没有"后续依赖步骤"一说
    return props.stage === 'report'
      ? '该阶段执行失败，已有的分析结果不受影响。您可以重试生成报告，或先查看案例结果。'
      : '该阶段执行失败，后续依赖步骤不会启动。您可以重试，或先查看案例结果。'
  }
  return '分析方案确认后，各步骤会在后台自动依次执行；这一步还没开始。'
})

/* ---------- 报告生成阶段进度 ---------- */
// 报告要跑 3-4 分钟且分章生成,这里把后端落盘的 report 进度展示出来,
// 刷新页面也能看到"进行到哪一章",而不是一个静态的"正在生成"。
const workflowStore = useExpertWorkflowStore()

// 与后端 tofront/service/report/report_builder.py 的 PHASES 保持一致。
// 决策摘要改为确定性组装、质量审计只做规则检查,两者都不再调用大模型,
// 所以不再作为进度步骤展示;done 是任务终态,必须保留。
const REPORT_PHASE_ORDER = [
  { key: 'assembling', label: '装配数据与证据' },
  { key: 'chapter_01', label: '生成第一章' },
  { key: 'chapter_02', label: '生成第二章' },
  { key: 'chapter_03', label: '生成第三章' },
  { key: 'done', label: '报告生成完成' },
]

const reportProgress = computed(() =>
  props.stage === 'report' ? workflowStore.detail?.report || null : null,
)

const reportPhases = computed(() => {
  const progress = reportProgress.value
  if (!progress || !progress.phase) return []
  const list = progress.phases?.length ? progress.phases : REPORT_PHASE_ORDER
  const currentIndex = list.findIndex((item) => item.key === progress.phase)
  return list.map((item, index) => ({
    key: item.key,
    // 后端 label 形如"正在生成第二章";芯片右侧已经标了状态,这里去掉"正在"避免重复
    label: String(item.label || '').replace(/^正在/, ''),
    state: progress.phase === 'done'
      ? 'done'
      : index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending',
  }))
})

const reportChapterHint = computed(() => {
  const done = Object.keys(reportProgress.value?.chapters || {}).sort()
  return done.length ? `已完成章节：${done.join(' / ')}` : ''
})

const phaseStateText = (state) =>
  ({ done: '已完成', active: '进行中', pending: '等待中' }[state] || '')

function formatTime(raw) {
  if (!raw) return ''
  const text = String(raw).replace('T', ' ')
  return text.length > 16 ? text.slice(0, 16) : text
}

const startedAtText = computed(() => formatTime(props.startedAt))

const elapsedText = computed(() => {
  // 由全局浮窗负责秒级刷新,这里只做一次粗略展示
  const start = Date.parse(String(props.startedAt || '').replace(' ', 'T'))
  if (!start || props.status !== 'running') return ''
  const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000))
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
})

const statusText = (value) =>
  ({ waiting: '等待中', running: '运行中', completed: '已完成', failed: '失败' }[value] || value)
</script>

<style scoped>
.stage-running {
  min-height: 420px;
  padding: 34px 40px;
  background: linear-gradient(135deg, #f8fafc, #eff6ff);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}
.stage-running__main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
  max-width: 720px;
  margin: 0 auto;
}
.stage-running h2 { margin: 0 0 8px; font-size: 20px; color: #0f172a; }
.stage-running p { margin: 0; font-size: 13px; color: #64748b; line-height: 1.7; }
.stage-running__meta { margin-top: 6px !important; color: #94a3b8 !important; font-variant-numeric: tabular-nums; }
.stage-running__error {
  margin-top: 8px !important;
  color: #b91c1c !important;
  font-size: 13px !important;
  line-height: 1.7;
}
.stage-running__tech {
  margin-top: 8px;
  font-size: 11px;
  color: #94a3b8;
}
.stage-running__tech summary { cursor: pointer; color: #94a3b8; }
.stage-running__tech p {
  margin: 6px 0 0 !important;
  font-family: ui-monospace, monospace;
  font-size: 11px !important;
  color: #94a3b8 !important;
  word-break: break-all;
}
.state-spinner {
  flex-shrink: 0;
  width: 30px; height: 30px;
  margin-top: 2px;
  border: 3px solid #dbeafe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin .9s linear infinite;
}
.state-icon {
  flex-shrink: 0;
  width: 30px; height: 30px;
  margin-top: 2px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: #ef4444; color: #fff;
  font-weight: 800; font-size: 15px;
}
.state-icon.is-waiting { background: #cbd5e1; color: #475569; }
@keyframes spin { to { transform: rotate(360deg); } }

.stage-track {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  max-width: 860px;
  margin: 26px auto 0;
  padding: 0;
}
.stage-track__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 12px 6px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 12px;
  color: #475569;
}
.stage-track__dot { width: 9px; height: 9px; border-radius: 50%; background: #cbd5e1; }
.stage-track__item.is-running .stage-track__dot { background: #3b82f6; box-shadow: 0 0 0 5px #dbeafe; }
.stage-track__item.is-completed .stage-track__dot { background: #10b981; }
.stage-track__item.is-failed .stage-track__dot { background: #ef4444; }
.stage-track__status { font-size: 11px; color: #94a3b8; }
.stage-track__item.is-completed .stage-track__status { color: #059669; }
.stage-track__item.is-failed .stage-track__status { color: #dc2626; }

/* ===== 报告生成阶段进度 ===== */
.report-phases {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 860px;
  margin: 22px auto 0;
  padding: 0;
  justify-content: center;
}
.report-phase {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #fff;
  font-size: 12.5px;
  color: #94a3b8;
}
.report-phase__dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; }
.report-phase__state { font-size: 11px; font-weight: 500; color: #cbd5e1; }
.report-phase.is-done { color: #059669; border-color: #a7f3d0; background: #ecfdf5; }
.report-phase.is-done .report-phase__dot { background: #10b981; }
.report-phase.is-done .report-phase__state { color: #059669; }
.report-phase.is-active {
  color: #1d4ed8;
  border-color: #93c5fd;
  background: #eff6ff;
  font-weight: 600;
}
.report-phase.is-active .report-phase__dot { background: #3b82f6; box-shadow: 0 0 0 4px #dbeafe; }
.report-phase.is-active .report-phase__state { color: #2563eb; }
.report-chapter-hint {
  margin: 10px 0 0;
  text-align: center;
  font-size: 12px;
  color: #64748b;
}

.stage-running__ops {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 24px;
}
.stage-running__hint { font-size: 12px; color: #64748b; }

.stage-running__skeleton { margin: 26px auto 0; max-width: 620px; }
.skeleton-line {
  display: block;
  height: 11px;
  margin-bottom: 10px;
  border-radius: 5px;
  background: linear-gradient(90deg, #eef2f7 25%, #e2e8f0 37%, #eef2f7 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
</style>
