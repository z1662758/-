<template>
  <div style="display: flex; width: 100%; height: 100vh; overflow: hidden;">
    <!--	左侧菜单栏 -->
    <div class="menu-pos">
      <el-menu :default-active="activeIndex" class="el-menu-vertical-demo"
               :collapse="isCollapse" ref="menuRef" router @select="onMenuSelect">
        <div style="display: flex; width: 100%; justify-content: space-between; margin-top: 0.5rem; height: 40px; margin-bottom: 1rem; padding: 10px">
          <div style="display: flex">
            <img style="height: 18px" src="../assets/images/logo.png" alt="logo"/>
            <span v-show="!isCollapse"
                  style="color: #114f8c; font-weight: bolder; font-size: 18px; margin-left: 5px;">MACE</span>
          </div>
          <div style="cursor: pointer" @click="menuExpend()" v-if="isCollapse">
            <img src="../assets/images/expandIcon.png" style="height: 18px" alt="expandIcon"/>
          </div>
          <div style="cursor: pointer" @click="menuExpend()" v-else>
            <img src="../assets/images/shrinkIcon.png" style="height: 18px" alt="shrinkIcon"/>
          </div>
        </div>

        <!--	阶段徽标（折叠时隐藏文字，保持边距）	-->
        <div v-show="!isCollapse && currentPhase" class="phase-indicator" :class="'phase-' + currentPhase">
          <span class="phase-dot"></span>
          <span class="phase-label">{{ phaseLabels[currentPhase] }}</span>
        <span class="scenario-menu-badge" :class="currentScenario === 'supply_chain' ? 'is-auto' : 'is-uranium'">{{ scenarioLabel }}</span>
        </div>

        <!--	返回对话首页	-->
        <el-menu-item index="/chatHome" class="back-select-item">
          <el-icon size="18"><ChatDotSquare/></el-icon>
          <template #title>对话首页</template>
        </el-menu-item>

        <!-- ========== 事前：风险识别与预警 ========== -->
        <template v-if="currentPhase === 'pre'">
          <el-menu-item
            v-for="item in preMainMenuItems"
            :key="item.index"
            :index="item.index"
          >
            <el-icon size="18"><component :is="item.icon" /></el-icon>
            <template #title>{{ item.label }}</template>
          </el-menu-item>

          <el-sub-menu index="pre-analysis">
            <template #title>
              <el-icon size="18"><DataAnalysis/></el-icon>
              <span>态势分析</span>
            </template>
            <el-menu-item
              v-for="item in preAnalysisMenuItems"
              :key="item.index"
              :index="item.index"
            >
              <el-icon size="18"><component :is="item.icon" /></el-icon>
              <template #title>{{ item.label }}</template>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item
            v-for="item in preTailMenuItems"
            :key="item.index"
            :index="item.index"
          >
            <el-icon size="18"><component :is="item.icon" /></el-icon>
            <template #title>{{ item.label }}</template>
          </el-menu-item>
        </template>

        <!-- ========== 事中：应急响应与调度 ========== -->
        <template v-else-if="currentPhase === 'during'">
          <el-menu-item
            v-for="item in duringMainMenuItems"
            :key="item.index"
            :index="item.index"
          >
            <el-icon size="18"><component :is="item.icon" /></el-icon>
            <template #title>{{ item.label }}</template>
          </el-menu-item>
          <el-sub-menu index="during-analysis">
            <template #title>
              <el-icon size="18"><DataAnalysis/></el-icon>
              <span>决策分析</span>
            </template>
            <el-menu-item
              v-for="item in duringAnalysisMenuItems"
              :key="item.index"
              :index="item.index"
            >
              <el-icon size="18"><component :is="item.icon" /></el-icon>
              <template #title>{{ item.label }}</template>
            </el-menu-item>
          </el-sub-menu>
        </template>

        <!-- ========== 事后：复盘优化与重构 ========== -->
        <template v-else-if="currentPhase === 'post'">
          <el-menu-item
            v-for="item in postMainMenuItems"
            :key="item.index"
            :index="item.index"
          >
            <el-icon size="18"><component :is="item.icon" /></el-icon>
            <template #title>{{ item.label }}</template>
          </el-menu-item>
          <el-sub-menu index="post-analysis">
            <template #title>
              <el-icon size="18"><DataAnalysis/></el-icon>
              <span>实验分析</span>
            </template>
            <el-menu-item
              v-for="item in postAnalysisMenuItems"
              :key="item.index"
              :index="item.index"
            >
              <el-icon size="18"><component :is="item.icon" /></el-icon>
              <template #title>{{ item.label }}</template>
            </el-menu-item>
          </el-sub-menu>
        </template>

        <!-- index 不可为 "0"：router 模式下会执行 router.push("0") 导致无法访问 -->
        <el-menu-item index="scnet-menu-exit" :route="'/home'">
          <el-icon size="18"><SwitchButton/></el-icon>
          <template #title>退出系统</template>
        </el-menu-item>
      </el-menu>
      <div style="height: 60px; width: 100%; display: flex; align-items: center; border-right: #DCDFE6 1px solid">
        <img src="../assets/images/gameImg.png" style="width: 20px; height: 20px; margin-left: 20px" alt="SCnet"/>
        <transition name="fade-delay">
          <div v-show="!isCollapse" style="height: 100%; display: flex; align-items: center">
            <span style="margin-left: 0.5rem; color: #606266; font-weight: bold; transition: opacity 3s ease 3s;">供应链</span>
            <el-button circle size="default" style="margin-left: 2.5rem" color="rgb(248, 152, 152)" plain @click="exit()">
              <el-icon><SwitchButton/></el-icon>
            </el-button>
          </div>
        </transition>
      </div>
    </div>
    <div :class="isCollapse ? 'body-pos-shrink' : 'body-pos-expand'">
      <AppHeader style="flex-shrink: 0; z-index: 2000"/>
      <div class="scnet-router-host">
        <router-view />
      </div>
    </div>

    <!-- 事中阶段：右侧悬浮流程步骤条（对齐学长 PowerGame 实现） -->
    <EventPhaseStepper
      v-if="showDuringFlowStepper"
      :steps="duringSteps"
      :current-key="duringCurrentKey"
      :completed-predicate="isDuringStepCompleted"
      @step-click="onDuringStepClick"
    />

    <!-- 浮动切换按钮：转到对话模式 -->
    <el-tooltip content="切换到AI对话模式" placement="left" effect="dark">
      <button class="chat-toggle-float-btn" @click="$router.push('/chatHome')">
        <el-icon :size="20"><ChatDotSquare /></el-icon>
      </button>
    </el-tooltip>
  </div>
</template>

<script>
import {
  Aim, Box, Coin, Collection, DataAnalysis, DataLine, Document, DocumentDelete, Edit,
  FolderOpened, Grid, House, Memo, Monitor, Notification, Operation, Orange,
  PieChart, Place, Postcard, Promotion, ScaleToOriginal, Search as SearchIcon, Setting,
  SwitchButton, TrendCharts, User, WarningFilled, ChatDotSquare, CircleCheck
} from "@element-plus/icons-vue";
import {ref, onMounted, onUnmounted, computed, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {Files, Refresh} from "@element-plus/icons-vue";
import AppHeader from "@/components/Header.vue";
import EventPhaseStepper from "@/components/EventPhaseStepper.vue";
import { useDuringFlowSteps, routeToStepKey } from "@/views/SCnet/composables/useDuringFlowSteps";
import {
  useDuringFlowSteps as useUraniumDuringFlowSteps,
  routeToStepKey as uraniumRouteToStepKey
} from "@/views/SCnet/composables/useDuringFlowSteps_uranium";
import { useScenarioStore } from "@/stores/scenario";
import { PHASE_EVENT, PHASE_STORAGE_KEY, ROUTE_TO_PHASE } from "@/constants/scnetPhase";

const PRE_MAIN_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/situationAnalysis', label: '需求分析', icon: DataLine },
  { index: '/home/SCnet/openSourceIntelligence', label: '开源情报', icon: WarningFilled },
  { index: '/home/SCnet/knowledgeGraph', label: '本体网络', icon: Collection },
  { index: '/home/SCnet/reportGeneration', label: '报告生成', icon: Document }
])

const PRE_ANALYSIS_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/situationJudge', label: '态势研判', icon: DataLine },
  { index: '/home/SCnet/situationResearch-main', label: '态势预测', icon: Promotion }
])

const DURING_MAIN_MENU_ITEMS = Object.freeze([
  { path: 'scenario', key: 'scenario', label: '想定生成', icon: Edit },
  { index: '/home/SCnet/experimentManager', label: '实验推演', icon: Monitor },
  { index: '/home/SCnet/expAnalysisOverview', label: '报告生成', icon: Document }
])

const DURING_ANALYSIS_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/expAnalysisGameTheory', label: '博弈论分析', icon: Grid },
  { index: '/home/SCnet/expAnalysisDecisionTree', label: '决策树分析', icon: Promotion },
  { index: '/home/SCnet/expAnalysisScenario', label: '情景分析', icon: TrendCharts }
])

const POST_MAIN_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/counterfactualExperiment', label: '反事实实验', icon: PieChart },
  { index: '/home/SCnet/EXreport', label: '供应链实验报告', icon: Postcard }
])

const POST_ANALYSIS_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/expAnalysisObserve', label: '观察分析', icon: SearchIcon },
  { index: '/home/SCnet/expAnalysisIntervention', label: '干预分析', icon: Operation },
  { index: '/home/SCnet/expAnalysisMechanism', label: '机制与因果', icon: ScaleToOriginal }
])

export default {
  name: "SCnetLayout",
  components: {
    Memo,
    Monitor,
    Place,
    Edit,
    EventPhaseStepper,
    Refresh, Files, DataAnalysis, DataLine, DocumentDelete, House, Aim, Box, Collection,
    Document, Notification, Operation, Postcard, Promotion, ScaleToOriginal, SearchIcon, Setting,
    Coin, PieChart, FolderOpened, Grid, SwitchButton, Orange, TrendCharts, User, AppHeader, WarningFilled, ChatDotSquare, CircleCheck
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const activeIndex = ref('1')
    const storedPhase = ref(localStorage.getItem(PHASE_STORAGE_KEY) || '')

    // currentPhase 优先按当前路由推断，避免旧的 localStorage 状态把菜单带偏；
    // 仅当路由无法识别时再回落到 localStorage。
    const currentPhase = computed(() => {
      return ROUTE_TO_PHASE[route.path] || storedPhase.value || ''
    })

    // ── 场景感知：从 URL 或 store 获取当前场景 ──
    const scenarioStore = useScenarioStore()
    const currentScenario = computed(() => {
      return route.query.scenario || scenarioStore.currentScenario || 'uranium'
    })

    // 监听路由变化，同步场景到 store
    watch(() => route.query.scenario, (val) => {
      if (val) scenarioStore.setScenario(val)
    })

    // 场景标签
    const scenarioLabel = computed(() => currentScenario.value === 'supply_chain' ? '🚗 汽车' : '☢️ 铀')

    const { steps: autoDuringSteps, isStepCompleted: isAutoDuringStepCompleted } = useDuringFlowSteps()
    const { steps: uraniumDuringSteps, isStepCompleted: isUraniumDuringStepCompleted } = useUraniumDuringFlowSteps()
    const isUraniumScenario = computed(() => currentScenario.value === 'uranium')

    // 事中流程步骤条按场景分流：铀=智能对话/实体图/实验运行/推演界面，汽车=原 5 步
    const duringSteps = computed(() => (
      isUraniumScenario.value ? uraniumDuringSteps : autoDuringSteps
    ))
    const duringCurrentKey = computed(() => (
      isUraniumScenario.value
        ? uraniumRouteToStepKey(route.path)
        : routeToStepKey(route.path, route.query || {})
    ))
    const isDuringStepCompleted = (stepKey) => (
      isUraniumScenario.value
        ? isUraniumDuringStepCompleted(stepKey)
        : isAutoDuringStepCompleted(stepKey)
    )
    const AUTO_DURING_FLOW_PREFIXES = [
      '/home/SCnet/scenarioModeling',
      '/home/SCnet/agent-design-studio',
      '/home/SCnet/agentSimulationStudio'
    ]
    // 步骤条是浮层，只在「流程编排」类页面显示（沿用本项目原有约定）；
    // 实验运行 / 推演界面 版面很密，浮层会盖住内容，改由左侧菜单进入。
    const URANIUM_DURING_FLOW_PREFIXES = [
      '/home/SCnet/scenarioModeling',
      '/home/SCnet/scenarioAnalysis',
      '/home/SCnet/agent-design-studio',
      '/home/SCnet/agentSimulationStudio'
    ]
    const showDuringFlowStepper = computed(() => {
      const prefixes = isUraniumScenario.value ? URANIUM_DURING_FLOW_PREFIXES : AUTO_DURING_FLOW_PREFIXES
      return currentPhase.value === 'during' && prefixes.some(prefix => route.path.startsWith(prefix))
    })
    const onDuringStepClick = (step) => {
      if (!step) return
      // 事中各页按 ?scenario= 分流，跳步时必须带上当前场景
      const nextQuery = { ...(step.query || {}) }
      if (route.query.scenario) nextQuery.scenario = route.query.scenario
      const isSamePath = route.path === step.route
      const sameQuery = isSamePath && JSON.stringify(route.query || {}) === JSON.stringify(nextQuery)
      if (sameQuery) return
      router.push({ path: step.route, query: nextQuery })
    }

    const handleStorageChange = (event) => {
      if (event.key === PHASE_STORAGE_KEY) {
        storedPhase.value = event.newValue || ''
      }
    }
    const handleCustomChange = (event) => {
      if (event && event.detail) {
        storedPhase.value = event.detail
      }
    }

    onMounted(() => {
      window.addEventListener('storage', handleStorageChange)
      window.addEventListener(PHASE_EVENT, handleCustomChange)
    })
    onUnmounted(() => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(PHASE_EVENT, handleCustomChange)
    })

    return {
      activeIndex,
      currentPhase,
      currentScenario,
      scenarioLabel,
      preMainMenuItems: computed(() => PRE_MAIN_MENU_ITEMS.map((item) => ({
        ...item,
        index: `${item.index}?scenario=${currentScenario.value}`
      }))),
      preAnalysisMenuItems: computed(() => PRE_ANALYSIS_MENU_ITEMS.map((item) => ({
        ...item,
        index: `${item.index}?scenario=${currentScenario.value}`
      }))),
      duringMainMenuItems: computed(() => DURING_MAIN_MENU_ITEMS.map((item) => ({
        ...item,
        index: item.path === 'scenario'
          ? `/home/SCnet/${isUraniumScenario.value ? 'scenarioAnalysis' : 'scenarioModeling'}?scenario=${currentScenario.value}`
          : `${item.index}?scenario=${currentScenario.value}`
      }))),
      duringAnalysisMenuItems: computed(() => DURING_ANALYSIS_MENU_ITEMS.map((item) => ({
        ...item,
        index: `${item.index}?scenario=${currentScenario.value}`
      }))),
      postMainMenuItems: POST_MAIN_MENU_ITEMS,
      postAnalysisMenuItems: POST_ANALYSIS_MENU_ITEMS,
      duringSteps,
      duringCurrentKey,
      showDuringFlowStepper,
      isDuringStepCompleted,
      onDuringStepClick
    }
  },
  data() {
    return {
      isCollapse: true,
      phaseLabels: {
        pre: '事前 · 风险识别与预警',
        during: '事中 · 应急响应与调度',
        post: '事后 · 复盘优化与重构'
      }
    }
  },
  created() {
    this.activeIndex = this.$route.path
  },
  watch: {
    '$route.path'(path) {
      this.activeIndex = path
    }
  },
  methods: {
    onMenuSelect(index) {
      if (index && index !== 'scnet-menu-exit') {
        this.activeIndex = index
      }
    },
    exit() {
      this.$router.push('/home')
    },
    menuExpend() {
      this.isCollapse = !this.isCollapse
    },
    drawerOpenMsg(name) {
      window.sessionStorage.setItem(name, 1);
    }
  }
}
</script>

<style scoped>
.menu-pos {
  display: flex;
  flex-direction: column;
  position: fixed;
  justify-content: space-between;
  height: 100vh;
}

.el-menu-vertical-demo{
  min-height: calc(100vh - 60px);
}
.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
}

.body-pos-expand {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100vh;
  width: calc(100vw - 200px);
  max-width: calc(100vw - 200px);
  margin-left: 200px;
  transition: all 0.3s ease-in-out;
}

.body-pos-shrink {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100vh;
  width: calc(100vw - 64px);
  max-width: calc(100vw - 64px);
  margin-left: 64px;
  transition: all 0.3s ease-in-out;
}

.scnet-router-host {
  flex: 1 1 auto;
  min-height: 0;
  height: auto;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  background: #f1f5f9;
}

.scnet-router-host > * {
  display: block;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
}

.fade-delay-enter-active {
  transition: opacity 0.3s ease 0.3s;
}

.fade-delay-leave-active {
  transition: opacity 0.2s ease;
}

.fade-delay-enter-from,
.fade-delay-leave-to {
  opacity: 0;
}

/* 阶段徽标 */
.phase-indicator {
  display: flex;
  align-items: center;
  margin: 0 10px 10px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  border: 1px solid transparent;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.phase-indicator .phase-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}
.phase-indicator .phase-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.phase-indicator.phase-pre {
  color: #3b82f6;
  background-color: #eff6ff;
  border-color: #bfdbfe;
}
.phase-indicator.phase-pre .phase-dot {
  background: #3b82f6;
}
.phase-indicator.phase-during {
  color: #f59e0b;
  background-color: #fffbeb;
  border-color: #fde68a;
}
.phase-indicator.phase-during .phase-dot {
  background: #f59e0b;
}
.phase-indicator.phase-post {
  color: #8b5cf6;
  background-color: #f5f3ff;
  border-color: #ddd6fe;
}
.phase-indicator.phase-post .phase-dot {
  background: #8b5cf6;
}

/* 返回阶段选择 */
.back-select-item {
  margin-bottom: 6px;
}

/* 浮动切换按钮 */
.chat-toggle-float-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #ffffff;
  color: #4b5563;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  backdrop-filter: blur(12px);
}
.chat-toggle-float-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06);
  color: #6366f1;
  border-color: rgba(99, 102, 241, 0.2);
}
</style>
