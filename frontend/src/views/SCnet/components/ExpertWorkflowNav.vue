<template>
  <div class="expert-flow-nav">
    <el-button v-if="back" @click="go(back)">上一步</el-button>
    <el-button v-if="next" type="primary" @click="go(next)">下一步：{{ nextLabel }}</el-button>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { buildExpertRoute } from '@/constants/scnetRoutes'
import { useExpertWorkflowStore } from '@/stores/scnet/useExpertWorkflowStore'

defineProps({
  back: { type: String, default: '' },
  next: { type: String, default: '' },
  nextLabel: { type: String, default: '' },
})

const route = useRoute()
const router = useRouter()
const workflowStore = useExpertWorkflowStore()

/**
 * 统一走 buildExpertRoute:URL 上有 session_id 就用 URL 的,
 * 没有则回落到 store 里的当前任务,避免跳转后丢失任务上下文。
 */
function go(path) {
  const sessionId = String(route.query.session_id || workflowStore.sessionId || '')
  const scenario = route.query.scenario || workflowStore.detail?.scenario || ''
  const extraQuery = route.query.view === 'example' ? { view: 'example' } : {}
  router.push(buildExpertRoute(path, { sessionId, scenario, extraQuery }))
}
</script>

<style scoped>
.expert-flow-nav { position: fixed; right: 28px; bottom: 24px; z-index: 2200; display: flex; gap: 10px; width: max-content; min-height: 0; height: auto; padding: 10px; border-radius: 12px; background: rgba(255,255,255,.92); border: 1px solid #e2e8f0; box-shadow: 0 8px 24px rgba(15,23,42,.12); backdrop-filter: blur(10px); }
</style>
