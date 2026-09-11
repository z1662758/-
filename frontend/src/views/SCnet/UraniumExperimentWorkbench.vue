<template>
  <div class="uranium-workbench">
    <nav class="workbench-switcher" aria-label="实验推演工作区">
      <div class="switcher-copy">
        <span class="switcher-kicker">事中工作台</span>
        <strong>{{ activeViewMeta.title }}</strong>
        <span>{{ activeViewMeta.summary }}</span>
      </div>

      <div class="flow-strip" aria-label="事中流程进度">
        <button
          v-for="(step, index) in flowSteps"
          :key="step.key"
          type="button"
          :class="['flow-step', { active: step.key === activeFlowKey, done: index < activeFlowIndex }]"
          @click="goToFlowStep(step)"
        >
          <span>{{ index + 1 }}</span>
          <strong>{{ step.label }}</strong>
        </button>
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
import { DURING_FLOW_STEPS, routeToStepKey } from './composables/useDuringFlowSteps_uranium'

defineOptions({ name: 'UraniumExperimentWorkbench' })

const route = useRoute()
const router = useRouter()

const views = Object.freeze([
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
  },
  {
    value: 'decision',
    label: '决策生成',
    description: '建议、依据、执行',
    icon: Promotion,
    title: '决策生成',
    summary: '把推演结果转成可执行建议、证据依据和执行顺序。'
  }
])
const flowSteps = DURING_FLOW_STEPS

const routeDefault = computed(() => route.path.endsWith('/interface') ? 'simulation' : 'run')
const activeView = computed(() => (
  ['run', 'simulation', 'decision'].includes(route.query.view) ? route.query.view : routeDefault.value
))
const activeViewMeta = computed(() => views.find(item => item.value === activeView.value) || views[0])
const activeFlowKey = computed(() => routeToStepKey(route.path, route.query))
const activeFlowIndex = computed(() => flowSteps.findIndex(step => step.key === activeFlowKey.value))

function switchView(view) {
  if (view === activeView.value) return
  router.replace({ query: { ...route.query, view } })
}

function goToFlowStep(step) {
  if (!step?.route) return
  router.push({
    path: step.route,
    query: {
      scenario: route.query.scenario || 'uranium',
      ...(step.query || {})
    }
  })
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
  grid-template-columns: minmax(210px, .85fr) minmax(320px, 1.1fr) minmax(390px, 1.25fr);
  align-items: center;
  gap: 14px;
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

.switcher-copy strong { color: #0f172a; font-size: 18px; line-height: 1.25; }
.switcher-copy > span:last-child {
  grid-column: 1 / -1;
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}
.switcher-kicker { color: #2563eb; font-size: 11px; font-weight: 800; }

.flow-strip {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.flow-step {
  min-width: 0;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  height: 42px;
  padding: 0 8px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease, color .18s ease;
}

.flow-step:hover {
  border-color: #93c5fd;
  color: #2563eb;
}

.flow-step span {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.flow-step strong {
  min-width: 0;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-step.done span {
  background: #dcfce7;
  color: #15803d;
}

.flow-step.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.flow-step.active span {
  background: #2563eb;
  color: #fff;
}

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
  .flow-strip,
  .switcher-tabs { grid-template-columns: 1fr 1fr; }
  .switcher-tabs small { display: none; }
}
</style>
