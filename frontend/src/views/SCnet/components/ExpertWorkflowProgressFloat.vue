<template>
  <div
    class="expert-progress-float"
    :class="{ 'is-collapsed': collapsed, 'is-narrow': isNarrow }"
  >
    <!-- 收起态:小圆点/按钮 -->
    <button
      v-if="collapsed"
      type="button"
      class="epf-fab"
      :class="`is-${overallStatus}`"
      :title="store.currentLabel"
      @click="collapsed = false"
    >
      <span class="epf-fab__dot"></span>
      <span class="epf-fab__count">{{ store.completedCount }}/{{ store.totalCount }}</span>
    </button>

    <!-- 展开态:步骤 + 汇总 -->
    <div v-else class="epf-panel">
      <div class="epf-head">
        <span class="epf-head__dot" :class="`is-${overallStatus}`"></span>
        <span class="epf-head__title">分析进度</span>
        <button type="button" class="epf-head__toggle" title="收起" @click="collapsed = true">—</button>
      </div>

      <p class="epf-current">{{ store.currentLabel }}</p>

      <ol class="epf-steps">
        <li
          v-for="step in store.progressSteps"
          :key="step.key"
          class="epf-step"
          :class="`is-${step.status}`"
          :title="`点击跳转到${step.label}`"
          @click="goStep(step)"
        >
          <span class="epf-step__dot"></span>
          <span class="epf-step__label">{{ step.label }}</span>
          <b class="epf-step__status">{{ statusText(step.status) }}</b>
        </li>
      </ol>

      <dl class="epf-meta">
        <div><dt>已完成</dt><dd>{{ store.progressText }}</dd></div>
        <div>
          <dt>当前步骤运行</dt>
          <dd>{{ store.runningElapsedText || '—' }}</dd>
        </div>
        <div><dt>最近更新</dt><dd>{{ store.lastUpdatedText }}</dd></div>
      </dl>

      <p v-if="store.pollingStatus === 'error'" class="epf-warn">状态读取异常，正在重试…</p>
      <p v-if="isExampleMode" class="epf-note">正在查看案例结果，此处仍显示当前任务的真实进度。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { buildExpertRoute } from '@/constants/scnetRoutes'
import { useExpertWorkflowStore } from '@/stores/scnet/useExpertWorkflowStore'

const store = useExpertWorkflowStore()
const route = useRoute()
const router = useRouter()

const collapsed = ref(true)
const isNarrow = ref(false)

const isExampleMode = computed(() => store.displayMode === 'example')

/** 浮窗整体状态:失败 > 运行中 > 完成 > 等待 */
const overallStatus = computed(() => {
  if (store.failedStep) return 'failed'
  if (store.runningStep) return 'running'
  if (store.completedCount === store.totalCount) return 'completed'
  return 'waiting'
})

const statusText = (value) =>
  ({ waiting: '等待中', running: '运行中', completed: '已完成', failed: '失败', skipped: '已跳过' }[value] || value)

function goStep(step) {
  const target = routeList(step)
  if (!target) return
  if (route.path === target.path) return
  // 只做页面跳转,不影响后台任务的任何状态;任务上下文由 buildExpertRoute 统一带上
  router.push(target)
}

/** 统一构造步骤跳转目标,始终携带当前 session_id */
function routeList(step) {
  const sessionId = String(route.query.session_id || store.sessionId || '')
  const scenario = route.query.scenario || store.detail?.scenario || ''
  return buildExpertRoute(step.route, { sessionId, scenario })
}

function syncWidth() {
  isNarrow.value = typeof window !== 'undefined' && window.innerWidth <= 1280
  // 窄屏默认收起(要求:窄屏时改为右下角可展开按钮)
  if (isNarrow.value) collapsed.value = true
}

onMounted(() => {
  syncWidth()
  window.addEventListener('resize', syncWidth)
})
onBeforeUnmount(() => window.removeEventListener('resize', syncWidth))
</script>

<style scoped>
.expert-progress-float {
  position: fixed;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1300;
  width: 216px;
}
.expert-progress-float.is-collapsed { width: auto; }
/* 窄屏:收到右下角,避免遮挡页面操作区 */
.expert-progress-float.is-narrow {
  top: auto;
  bottom: 96px;
  right: 16px;
  transform: none;
}

.epf-fab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, .96);
  box-shadow: 0 6px 20px rgba(15, 23, 42, .14);
  cursor: pointer;
  font-size: 12px;
  color: #334155;
}
.epf-fab__dot { width: 9px; height: 9px; border-radius: 50%; background: #cbd5e1; }
.epf-fab.is-running .epf-fab__dot { background: #3b82f6; animation: epf-pulse 1.6s ease-in-out infinite; }
.epf-fab.is-completed .epf-fab__dot { background: #10b981; }
.epf-fab.is-failed .epf-fab__dot { background: #ef4444; }
.epf-fab__count { font-variant-numeric: tabular-nums; font-weight: 600; }

.epf-panel {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, .96);
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 30px rgba(15, 23, 42, .14);
  backdrop-filter: blur(10px);
}
.epf-head { display: flex; align-items: center; gap: 7px; }
.epf-head__dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; }
.epf-head__dot.is-running { background: #3b82f6; animation: epf-pulse 1.6s ease-in-out infinite; }
.epf-head__dot.is-completed { background: #10b981; }
.epf-head__dot.is-failed { background: #ef4444; }
.epf-head__title { font-size: 13px; font-weight: 600; color: #0f172a; }
.epf-head__toggle {
  margin-left: auto;
  border: none;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
}
.epf-head__toggle:hover { color: #2563eb; }

.epf-current { margin: 8px 0 10px; font-size: 12px; color: #1d4ed8; font-weight: 600; }

.epf-steps { list-style: none; margin: 0; padding: 0; }
.epf-step {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 4px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #475569;
}
.epf-step:hover { background: #f1f5f9; }
.epf-step__dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; flex-shrink: 0; }
.epf-step.is-running .epf-step__dot { background: #3b82f6; box-shadow: 0 0 0 4px #dbeafe; }
.epf-step.is-completed .epf-step__dot { background: #10b981; }
.epf-step.is-failed .epf-step__dot { background: #ef4444; }
.epf-step__label { flex: 1; }
.epf-step.is-running .epf-step__label { color: #1d4ed8; font-weight: 600; }
.epf-step.is-completed .epf-step__label { color: #059669; }
.epf-step.is-failed .epf-step__label { color: #dc2626; }
.epf-step__status { font-size: 10px; color: #94a3b8; font-weight: 500; }

.epf-meta { margin: 10px 0 0; padding-top: 8px; border-top: 1px dashed #e2e8f0; font-size: 11px; }
.epf-meta > div { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
.epf-meta dt { color: #94a3b8; }
.epf-meta dd { margin: 0; color: #334155; font-variant-numeric: tabular-nums; font-weight: 600; }

.epf-warn { margin: 8px 0 0; font-size: 11px; color: #b45309; }
.epf-note { margin: 8px 0 0; font-size: 11px; color: #b45309; line-height: 1.5; }

@keyframes epf-pulse { 50% { opacity: .35; } }

/* 打印方案 PDF 时不出现 */
@media print {
  .expert-progress-float { display: none !important; }
}
</style>
