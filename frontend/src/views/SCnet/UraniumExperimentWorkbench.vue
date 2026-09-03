<template>
  <div class="uranium-workbench">
    <nav class="workbench-switcher" aria-label="实验推演工作区">
      <div class="switcher-copy">
        <span class="switcher-kicker">EXPERIMENT WORKBENCH</span>
        <strong>实验推演</strong>
        <span>运行管理与推演结果各自成区，实验数据实时联动</span>
      </div>

      <div class="switcher-tabs" role="tablist">
        <button
          v-for="item in views"
          :key="item.value"
          type="button"
          role="tab"
          :aria-selected="activeView === item.value"
          :class="{ active: activeView === item.value }"
          @click="switchView(item.value)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>
            <strong>{{ item.label }}</strong>
            <small>{{ item.description }}</small>
          </span>
        </button>
      </div>
    </nav>

    <main class="workbench-content">
      <ExperimentManager v-if="activeView === 'run'" />
      <SimulationInterface v-else-if="activeView === 'simulation'" />
      <DecisionGeneration v-else />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DataAnalysis, Monitor, Promotion } from '@element-plus/icons-vue'
import ExperimentManager from './ExperimentManager_uranium.vue'
import SimulationInterface from './interface_uranium.vue'
import DecisionGeneration from './DecisionGeneration_uranium.vue'

defineOptions({ name: 'UraniumExperimentWorkbench' })

const route = useRoute()
const router = useRouter()

const views = Object.freeze([
  { value: 'run', label: '运行管理', description: '任务、迭代与实验台账', icon: Monitor },
  { value: 'simulation', label: '态势推演', description: '年度链路与调运结果', icon: DataAnalysis },
  { value: 'decision', label: '决策生成', description: '结论、依据与执行方法', icon: Promotion }
])

const routeDefault = computed(() => route.path.endsWith('/interface') ? 'simulation' : 'run')
const activeView = computed(() => (
  ['run', 'simulation', 'decision'].includes(route.query.view) ? route.query.view : routeDefault.value
))

function switchView(view) {
  if (view === activeView.value) return
  router.replace({ query: { ...route.query, view } })
}
</script>

<style scoped>
.uranium-workbench {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f4f7fb;
}

.workbench-switcher {
  flex: 0 0 auto;
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 10px 18px;
  border-bottom: 1px solid #dce4ee;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  box-sizing: border-box;
}

.switcher-copy {
  min-width: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  column-gap: 9px;
}

.switcher-copy strong { color: #0f172a; font-size: 18px; }
.switcher-copy > span:last-child {
  grid-column: 1 / -1;
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}
.switcher-kicker { color: #2563eb; font-size: 10px; font-weight: 800; letter-spacing: .08em; }

.switcher-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(170px, 1fr));
  gap: 8px;
  padding: 4px;
  border: 1px solid #dce4ee;
  border-radius: 12px;
  background: #f1f5f9;
}

.switcher-tabs button {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 12px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #64748b;
  text-align: left;
  cursor: pointer;
  transition: .18s ease;
}
.switcher-tabs button:hover { color: #2563eb; background: rgba(255,255,255,.7); }
.switcher-tabs button.active {
  color: #2563eb;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, .09);
}
.switcher-tabs .el-icon { flex: 0 0 auto; font-size: 19px; }
.switcher-tabs span { display: flex; flex-direction: column; gap: 1px; }
.switcher-tabs strong { font-size: 13px; }
.switcher-tabs small { color: #94a3b8; font-size: 10px; white-space: nowrap; }

.workbench-content { flex: 1; min-height: 0; overflow: hidden; }
.workbench-content > :deep(*) { height: 100%; }

@media (max-width: 900px) {
  .workbench-switcher { align-items: stretch; flex-direction: column; gap: 8px; }
  .switcher-copy > span:last-child { display: none; }
  .switcher-tabs { width: 100%; box-sizing: border-box; }
}

@media (max-width: 560px) {
  .switcher-tabs { grid-template-columns: 1fr 1fr; }
  .switcher-tabs small { display: none; }
}
</style>
