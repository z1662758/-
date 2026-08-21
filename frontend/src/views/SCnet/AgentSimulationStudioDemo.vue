<template>
  <div class="studio-host" :class="{ 'page-loaded': pageLoaded }">
    <transition name="view-switch" mode="out-in">
      <AgentWorkflowFlowchart
        v-if="showWorkflow"
        key="workflow"
        :empty="!simulationData && !loadingData"
        @next="goStudio"
      />
      <AgentSimulationStudio
        v-else-if="simulationData"
        key="studio"
        :simulation-data="simulationData"
      />
      <div v-else key="studio-empty" class="empty-state">
        暂无可用的智能体设计。请先完成步骤 1-3 并生成智能体方案。
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AgentSimulationStudio from './AgentSimulationStudio.vue'
import AgentWorkflowFlowchart from './AgentWorkflowFlowchart.vue'
import { useAgentDesignPayload } from './composables/useAgentDesignPayload'

const route = useRoute()
const router = useRouter()
const pageLoaded = ref(false)

const { simulationData, loadingData, loadAgentDesignPayload } = useAgentDesignPayload('AgentStudioHost')

const showWorkflow = computed(() => route.query.view !== 'studio')

const ensureViewQuery = async (view) => {
  if (route.query.view === view) return
  await router.replace({ path: route.path, query: { ...route.query, view } })
}

const goStudio = async () => {
  // 切到 /home/SCnet/agentSimulationStudio?view=studio，保持 5 步路由语义
  if (route.path.includes('agent-design-studio')) {
    await router.push({ path: '/home/SCnet/agentSimulationStudio', query: { view: 'studio' } })
  } else {
    await ensureViewQuery('studio')
  }
}

const inferInitialView = () => {
  if (route.query.view) return route.query.view
  return route.path.includes('agent-design-studio') ? 'workflow' : 'studio'
}

onMounted(async () => {
  await ensureViewQuery(inferInitialView())
  await loadAgentDesignPayload()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { pageLoaded.value = true })
  })
})

watch(() => route.query.view, async (next, prev) => {
  if (next === prev) return
  await loadAgentDesignPayload()
})

watch(() => route.path, async () => {
  await ensureViewQuery(inferInitialView())
  await loadAgentDesignPayload()
})
</script>

<style scoped>
.studio-host {
  width: 100%;
  height: calc(100vh - 60px);
  overflow: auto;
  opacity: 0;
  transition: opacity 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.studio-host.page-loaded { opacity: 1; }

.view-switch-enter-active {
  transition: opacity 0.4s cubic-bezier(0.22, 0.61, 0.36, 1),
              transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.view-switch-leave-active {
  transition: opacity 0.25s cubic-bezier(0.55, 0, 1, 0.45),
              transform 0.25s cubic-bezier(0.55, 0, 1, 0.45);
}
.view-switch-enter-from { opacity: 0; transform: translateX(24px); }
.view-switch-leave-to { opacity: 0; transform: translateX(-24px); }

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  font-size: 14px;
}
</style>
