<template>
  <div class="uranium-workbench">
    <nav class="workbench-switcher" :class="{ standalone: isStandalone }" aria-label="实验推演工作区">
      <div class="switcher-copy">
        <span class="switcher-kicker">事中工作台</span>
        <strong>{{ activeViewMeta.title }}</strong>
        <span>{{ activeViewMeta.summary }}</span>
      </div>

      <div v-if="!isStandalone" class="switcher-tabs" role="tablist">
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

      <!-- 案例分析挂在运行管理之下，这里只提供返回入口 -->
      <div v-else-if="activeView === 'case'" class="switcher-actions">
        <el-button size="small" @click="backToRun">
          <el-icon><Back /></el-icon>
          <span>返回实验管理</span>
        </el-button>
      </div>
    </nav>

    <div class="workbench-evidence-bar">
      <span>关联实验<span v-if="demoStore.selectedExperiment"> · {{ demoStore.selectedExperiment.name }}</span><span v-else> · 尚未选择</span></span>
      <el-button size="small" :disabled="!demoStore.selectedExperiment" @click="askAboutExperiment">询问当前实验</el-button>
    </div>

    <main class="workbench-content">
      <ExperimentManager v-if="activeView === 'run'" />
      <SimulationInterface v-else-if="activeView === 'simulation'" />
      <UraniumCaseAnalysis v-else-if="activeView === 'case'" :case-id="activeCaseId" />
      <DecisionGeneration v-else />
    </main>

    <!-- 独立操作栏预留空间，不覆盖图表、地图时间轴和结果内容 -->
    <div v-if="nextViewMeta || prevViewMeta" class="workbench-next-fab workbench-flow-footer">
      <el-button v-if="prevViewMeta" class="workbench-prev-button" size="large" @click="switchView(prevViewMeta.value)">
        <el-icon class="prev-icon"><ArrowLeft /></el-icon>
        <span class="prev-text">上一步：{{ prevViewMeta.label }}</span>
      </el-button>
      <el-button v-if="nextViewMeta" class="workbench-next-button" type="primary" size="large" @click="switchView(nextViewMeta.value)">
        <span class="next-text">下一步：{{ nextViewMeta.label }}</span>
        <el-icon class="next-icon"><ArrowRight /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Back, ArrowLeft, ArrowRight, DataAnalysis, Monitor, Promotion, Reading } from '@element-plus/icons-vue'
import ExperimentManager from './ExperimentManager_uranium.vue'
import SimulationInterface from './interface_uranium.vue'
import DecisionGeneration from './DecisionGeneration_uranium.vue'
import UraniumCaseAnalysis from './components/UraniumCaseAnalysis.vue'
import './components/shared/midStage.css'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { ElMessage } from 'element-plus'

defineOptions({ name: 'UraniumExperimentWorkbench' })

const route = useRoute()
const router = useRouter()
const demoStore = useUraniumDemoStore()

onMounted(async () => {
  await demoStore.ensureInitialized()
  if (route.query.experiment_id) {
    const result = await demoStore.loadExperiment(String(route.query.experiment_id))
    if (!result) ElMessage.warning('指定实验不存在，请重新选择实验')
  }
})

function askAboutExperiment() {
  if (!demoStore.selectedExperiment) return
  router.push({ path: SCNET_ROUTES.chatHome, query: {
    mode: 'during', scenario: 'uranium',
    experiment_id: demoStore.selectedExperiment.experiment_id,
  } })
}

// 平行页签只保留运行管理与态势推演；案例分析是运行管理内的验证示例，不作为平行页签
const workbenchViews = Object.freeze([
  {
    value: 'run',
    label: '实验管理',
    description: '任务、迭代、台账、案例',
    icon: Monitor,
    title: '实验推演',
    summary: '管理实验启动、队列状态、迭代日志、参数修正与典型验证案例。'
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
  },
  {
    value: 'case',
    label: '案例分析',
    description: '历史事件、数据映射、验证',
    icon: Reading,
    title: '案例分析',
    summary: '用历史事件检验仿真结果与机制解释，作为实验管理中的验证示例。'
  }
])

const VIEW_KEYS = ['run', 'simulation', 'case', 'decision']

const routeDefault = computed(() => route.path.endsWith('/interface') ? 'simulation' : 'run')
const activeView = computed(() => (
  VIEW_KEYS.includes(route.query.view) ? route.query.view : routeDefault.value
))
const isStandalone = computed(() => standaloneViews.some(item => item.value === activeView.value))
const activeCaseId = computed(() => String(route.query.case || ''))
const activeViewMeta = computed(() => (
  [...workbenchViews, ...standaloneViews].find(item => item.value === activeView.value) || workbenchViews[0]
))

// 事中推进顺序：运行管理 → 态势推演 → 决策生成；案例分析只保留返回入口
const NEXT_VIEW = Object.freeze({ run: 'simulation', simulation: 'decision' })
const PREV_VIEW = Object.freeze({ simulation: 'run', decision: 'simulation' })
const findView = (value) => [...workbenchViews, ...standaloneViews].find(item => item.value === value) || null
const nextViewMeta = computed(() => findView(NEXT_VIEW[activeView.value]))
const prevViewMeta = computed(() => findView(PREV_VIEW[activeView.value]))

function switchView(view) {
  if (view === activeView.value) return
  const query = { ...route.query, view }
  delete query.case
  router.replace({ query })
}

function backToRun() {
  const query = { ...route.query, view: 'run' }
  delete query.case
  router.replace({ query })
}
</script>

<style scoped>
.workbench-evidence-bar {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 14px;
  background: #f8fbff;
  color: #475569;
  font-size: 12px;
}
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
  padding: 8px 14px;
  border-bottom: 1px solid #dce4ee;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  box-sizing: border-box;
}

.workbench-switcher.standalone {
  grid-template-columns: minmax(0, 1fr) auto;
}

.switcher-copy {
  min-width: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  column-gap: 9px;
}

.switcher-copy strong { color: #0f172a; font-size: 16px; line-height: 1.25; }
.switcher-copy > span:last-child {
  grid-column: 1 / -1;
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}
.switcher-kicker { color: #2563eb; font-size: 11px; font-weight: 800; }

.switcher-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: min(100%, 440px);
  justify-self: end;
  padding: 4px;
  border: 1px solid #dce4ee;
  border-radius: 12px;
  background: #f1f5f9;
}

.switcher-tabs button {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 10px;
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

.switcher-actions {
  justify-self: end;
}
.switcher-actions .el-button > .el-icon + span { margin-left: 6px; }

.workbench-content { flex: 1; min-height: 0; overflow: hidden; }
.workbench-content > :deep(*) { height: 100%; }

@media (max-width: 1050px) {
  .workbench-switcher {
    grid-template-columns: 1fr;
    align-items: stretch;
    gap: 8px;
  }
  .switcher-copy > span:last-child { display: none; }
  .switcher-tabs { width: 100%; max-width: none; box-sizing: border-box; }
  .switcher-actions { justify-self: start; }
}

@media (max-width: 560px) {
  .switcher-tabs { gap: 4px; }
  .switcher-tabs button { padding: 7px 6px; gap: 5px; }
  .switcher-tabs .el-icon { font-size: 16px; }
  .switcher-tabs small { display: none; }
}
</style>
