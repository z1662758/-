<template>
  <div class="uranium-workbench">
    <nav class="workbench-switcher" :class="{ standalone: activeView === 'decision' }" aria-label="实验推演工作区">
      <div class="switcher-copy">
        <span class="switcher-kicker">事中工作台</span>
        <strong>{{ activeViewMeta.title }}</strong>
        <span>{{ activeViewMeta.summary }}</span>
      </div>

      <div v-if="activeView !== 'decision'" class="switcher-tabs" role="tablist">
        <button
          v-for="item in workbenchViews"
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

const workbenchViews = Object.freeze([
  {
    value: 'run',
    label: '运行管理',
    description: '任务、迭代、台账',
    icon: Monitor,
    title: '实验推演',
    summary: '管理实验启动、队列状态、迭代日志和参数修正。'
  },
  {
    value: 'simulation',
    label: '态势推演',
    description: '链路、指标、结果',
    icon: DataAnalysis,
    title: '态势推演',
    summary: '查看年度供应链链路、压力窗口和实验输出指标。'
  }
])

const standaloneViews = Object.freeze([
  {
    value: 'decision',
    label: '决策生成',
    description: '建议、依据、执行',
    icon: Promotion,
    title: '决策生成',
    summary: '把推演结果转成可执行建议、证据依据和执行顺序。'
  }
])

const routeDefault = computed(() => route.path.endsWith('/interface') ? 'simulation' : 'run')
const activeView = computed(() => (
  ['run', 'simulation', 'decision'].includes(route.query.view) ? route.query.view : routeDefault.value
))
const activeViewMeta = computed(() => (
  [...workbenchViews, ...standaloneViews].find(item => item.value === activeView.value) || workbenchViews[0]
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
  display: grid;
  grid-template-columns: minmax(220px, .8fr) minmax(390px, 1.2fr);
  align-items: center;
  gap: 14px;
  padding: 10px 18px;
  border-bottom: 1px solid #dce4ee;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  box-sizing: border-box;
}

.workbench-switcher.standalone {
  grid-template-columns: 1fr;
}

.switcher-copy {
  min-width: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  column-gap: 9px;
}

.switcher-copy strong { color: #0f172a; font-size: 18px; line-height: 1.25; }
.switcher-copy > span:last-child {
  grid-column: 1 / -1;
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}
.switcher-kicker { color: #2563eb; font-size: 11px; font-weight: 800; }

.switcher-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

@media (max-width: 1280px) {
  .workbench-switcher {
    grid-template-columns: 1fr;
    align-items: stretch;
    gap: 8px;
  }
  .switcher-copy > span:last-child { display: none; }
  .switcher-tabs { width: 100%; box-sizing: border-box; }
}

@media (max-width: 560px) {
  .switcher-tabs { grid-template-columns: 1fr 1fr; }
  .switcher-tabs small { display: none; }
}
</style>
