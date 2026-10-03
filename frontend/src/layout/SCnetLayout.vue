<template>
  <div class="scnet-layout-root" style="display: flex; width: 100%; height: 100vh; overflow: hidden;">
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

        <!-- ===== 常驻顶部：三个阶段下都不随阶段切换 ===== -->
        <!--	返回阶段选择（三个阶段的公用入口页，即 /SCnet/total）	-->
        <el-menu-item index="/home/SCnet/total" class="back-select-item">
          <el-icon size="18"><Grid/></el-icon>
          <template #title>阶段选择</template>
        </el-menu-item>

        <!--	知识库：没有独立路由，打开的是 /SCnet/total 右上角「知识平台」同一个全屏浮层。
              index 不是真路由，用 route 顶成"当前地址"让 el-menu 的 router 模式变成
              重复导航（Vue Router 4 返回 NavigationFailure，不跳转也不报错），
              真正的动作在 @click 里。activeIndex 同步跳过它，见 onMenuSelect。	-->
        <el-menu-item
          index="scnet-knowledge-platform"
          class="back-select-item"
          :route="currentLocation"
          @click="openKnowledgePlatform"
        >
          <el-icon size="18"><Collection/></el-icon>
          <template #title>知识平台</template>
        </el-menu-item>

        <!-- ===== 以下随阶段（事前 / 事中 / 事后）整组切换 ===== -->
        <!-- li 而非 div：el-menu 渲染的就是 ul，插 div 是非法嵌套 -->
        <li class="phase-menu-divider" aria-hidden="true"></li>

        <!--	阶段徽标（折叠时隐藏文字，保持边距）	-->
        <div v-show="!isCollapse && currentPhase" class="phase-indicator" :class="'phase-' + currentPhase">
          <span class="phase-dot"></span>
          <span class="phase-label">{{ phaseLabels[currentPhase] }}</span>
        <span class="scenario-menu-badge" :class="currentScenario === 'supply_chain' ? 'is-auto' : 'is-uranium'">{{ scenarioLabel }}</span>
        </div>

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
          <el-menu-item
            v-for="item in duringDecisionMenuItems"
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
          <el-menu-item
            v-for="item in duringTailMenuItems"
            :key="item.index"
            :index="item.index"
          >
            <el-icon size="18"><component :is="item.icon" /></el-icon>
            <template #title>{{ item.label }}</template>
          </el-menu-item>
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
          <el-menu-item
            v-for="item in postTailMenuItems"
            :key="item.index"
            :index="item.index"
          >
            <el-icon size="18"><component :is="item.icon" /></el-icon>
            <template #title>{{ item.label }}</template>
          </el-menu-item>
        </template>

        <!-- 独立附加功能，不参与任何阶段工作流 -->
        <el-menu-item index="/home/SCnet/expertSeminar">
          <el-icon size="18"><Connection/></el-icon>
          <template #title>专家研讨厅</template>
        </el-menu-item>

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
      <!-- 阶段 / 知识平台快捷导航：零高度锚点 + 绝对定位浮层。
           锚点必须放在滚动容器之外：放进 .scnet-router-host 里的话，
           浮层向上越出容器顶部的那部分会被 overflow-y: auto 直接裁掉。
           它 flex: 0 0 auto + height: 0，既不占高度也不推挤页面内容。 -->
      <ScnetPhaseNav />
      <div class="scnet-router-host">
        <router-view />
      </div>
    </div>

    <!-- 知识库全屏浮层：与 /SCnet/total 右上角「知识平台」是同一个组件，挂在 body 上铺满视口 -->
    <Teleport to="body">
      <component :is="KnowledgePlatform" v-if="showKnowledgePlatform" @close="closeKnowledgePlatform" />
    </Teleport>

    <!-- 专家模式:全局运行进度浮窗(只读真实任务状态,不随案例切换变化) -->
    <ExpertWorkflowProgressFloat v-if="showExpertProgress" />

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
  Aim, Box, Coin, Collection, Connection, DataAnalysis, DataLine, Document, DocumentDelete, Edit,
  FolderOpened, Grid, House, MapLocation, Memo, Monitor, Notification, Operation, Orange,
  PieChart, Place, Postcard, Promotion, ScaleToOriginal, Search as SearchIcon, Setting,
  SwitchButton, TrendCharts, User, WarningFilled, ChatDotSquare, CircleCheck
} from "@element-plus/icons-vue";
import {ref, onMounted, onUnmounted, computed, watch} from "vue";
import {useRoute} from "vue-router";
import {Files, Refresh} from "@element-plus/icons-vue";
import AppHeader from "@/components/Header.vue";
import EventPhaseStepper from "@/components/EventPhaseStepper.vue";
import ScnetPhaseNav from "@/components/ScnetPhaseNav.vue";
import ExpertWorkflowProgressFloat from "@/views/SCnet/components/ExpertWorkflowProgressFloat.vue";
import { useExpertWorkflowStore } from "@/stores/scnet/useExpertWorkflowStore";
import { useDuringFlowSteps, routeToStepKey } from "@/views/SCnet/composables/useDuringFlowSteps";
import {
  useDuringFlowSteps as useUraniumDuringFlowSteps,
  routeToStepKey as uraniumRouteToStepKey
} from "@/views/SCnet/composables/useDuringFlowSteps_uranium";
import { useScenarioStore } from "@/stores/scenario";
import { useKnowledgePlatform } from "@/views/SCnet/composables/useKnowledgePlatform";
import { PHASE_EVENT, PHASE_STORAGE_KEY, ROUTE_TO_PHASE } from "@/constants/scnetPhase";

const KNOWLEDGE_PLATFORM_INDEX = 'scnet-knowledge-platform'

const PRE_MAIN_MENU_ITEMS = Object.freeze([
  // 「场景设定」为事前新入口(需求分析页保留供直接访问,不再作为卡片默认跳转)
  // 知识库 / 开源情报 不再作为事前菜单项：知识库入口已提到左侧栏顶部常驻
  // （index 固定为 阶段选择 之后），开源情报由知识平台的「数据治理」页签承载。
  // 页面和路由都还在，去掉下面两行注释即可恢复。
  // { index: '/home/SCnet/knowledgeGraph', label: '知识库', icon: Collection },
  { index: '/home/SCnet/scenarioSetting', label: '场景设定', icon: Setting },
  // 方案确认位于场景设定与知识库之间:场景设定后先生成方案,确认后才进入正式分析
  { index: '/home/SCnet/planConfirmation', label: '事前方案确认', icon: Memo },
  // { index: '/home/SCnet/openSourceIntelligence', label: '开源情报', icon: WarningFilled },
])

const PRE_ANALYSIS_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/situationJudge', label: '态势研判', icon: DataLine },
  { index: '/home/SCnet/situationResearch-main', label: '态势预测', icon: Promotion }
])

const PRE_TAIL_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/reportGeneration', label: '报告生成', icon: Document }
])

const DURING_MAIN_MENU_ITEMS = Object.freeze([
  { path: 'scenario', key: 'scenario', label: '想定生成', icon: Edit },
  { index: '/home/SCnet/experimentManager', label: '实验推演', icon: Monitor }
])

const DURING_DECISION_MENU_ITEMS = Object.freeze([
  { path: 'decision', key: 'decision', label: '决策生成', icon: Promotion }
])

const DURING_TAIL_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/expAnalysisOverview', label: '报告生成', icon: Document }
])

const DURING_ANALYSIS_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/expAnalysisScenario', label: '情景分析', icon: TrendCharts },
  { index: '/home/SCnet/expAnalysisGameTheory', label: '脆弱性分析', icon: Grid },
  { index: '/home/SCnet/expAnalysisDecisionTree', label: '对策分析', icon: Promotion }
])

// 实验分析子菜单之前展示的主菜单项
const POST_MAIN_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/counterfactualExperiment', label: '反事实实验', icon: PieChart }
])

const POST_ANALYSIS_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/expAnalysisObserve', label: '观察分析', icon: SearchIcon },
  { index: '/home/SCnet/expAnalysisIntervention', label: '干预分析', icon: Operation },
  { index: '/home/SCnet/expAnalysisMechanism', label: '机制与因果', icon: ScaleToOriginal }
])

// 实验分析子菜单之后展示的主菜单项
const POST_TAIL_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/expAnalysisMap', label: '供应链态势地图', icon: MapLocation },
  { index: '/home/SCnet/EXreport', label: '供应链实验报告', icon: Postcard }
])

export default {
  name: "SCnetLayout",
  components: {
    Memo,
    Monitor,
    Place,
    Edit,
    ExpertWorkflowProgressFloat,
    Refresh, Files, DataAnalysis, DataLine, DocumentDelete, House, Aim, Box, Collection, Connection,
    Document, Notification, Operation, Postcard, Promotion, ScaleToOriginal, SearchIcon, Setting,
    Coin, PieChart, FolderOpened, Grid, SwitchButton, Orange, TrendCharts, User, AppHeader, WarningFilled, ChatDotSquare, CircleCheck,
    ScnetPhaseNav
  },
  setup() {
    const route = useRoute()
    const activeIndex = ref('1')
    const storedPhase = ref(localStorage.getItem(PHASE_STORAGE_KEY) || '')

    // currentPhase 优先按当前路由推断，避免旧的 localStorage 状态把菜单带偏；
    // 仅当路由无法识别时再回落到 localStorage。
    const currentPhase = computed(() => {
      if (route.path === '/home/SCnet/expertSeminar') return ''
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

    // ── 知识库（左侧栏常驻入口）──
    // 与 /SCnet/total 右上角「知识平台」共用同一个全屏浮层
    const {
      KnowledgePlatform,
      visible: showKnowledgePlatform,
      open: openKnowledgePlatform,
      close: closeKnowledgePlatform
    } = useKnowledgePlatform()
    /**
     * 知识库菜单项不是真路由：el-menu 开了 router 模式，会把 index 当 path 推。
     * 这里把 route 顶成"当前地址"，push 退化成重复导航（不跳转、不报错），
     * 菜单项的选中态再由 onMenuSelect 跳过，避免它把高亮抢走。
     */
    const currentLocation = computed(() => ({
      path: route.path,
      query: route.query,
      hash: route.hash
    }))

    // ── 知识库（左侧栏常驻入口）──
    // 与 /SCnet/total 右上角「知识平台」共用同一个全屏浮层
    const {
      KnowledgePlatform,
      visible: showKnowledgePlatform,
      open: openKnowledgePlatform,
      close: closeKnowledgePlatform
    } = useKnowledgePlatform()
    /**
     * 知识库菜单项不是真路由：el-menu 开了 router 模式，会把 index 当 path 推。
     * 这里把 route 顶成"当前地址"，push 退化成重复导航（不跳转、不报错），
     * 菜单项的选中态再由 onMenuSelect 跳过，避免它把高亮抢走。
     */
    const currentLocation = computed(() => ({
      path: route.path,
      query: route.query,
      hash: route.hash
    }))

    const isUraniumScenario = computed(() => currentScenario.value === 'uranium')

    // ── 专家模式全局进度:浮窗 + 唯一的轮询归属方 ──
    // 轮询由布局统一持有,专家模式内部换页不会中断;
    // 离开专家模式(切到非专家页面)才清理,避免后台空转。
    const expertWorkflowStore = useExpertWorkflowStore()
    const EXPERT_ROUTE_PATHS = [
      '/home/SCnet/planConfirmation',
      '/home/SCnet/openSourceIntelligence',
      '/home/SCnet/situationJudge',
      '/home/SCnet/situationResearch-main',
      '/home/SCnet/reportGeneration'
    ]
    const isExpertRoute = computed(() => EXPERT_ROUTE_PATHS.includes(route.path))
    const expertSessionId = computed(
      () => String(route.query.session_id || expertWorkflowStore.sessionId || '')
    )
    const showExpertProgress = computed(
      () => isExpertRoute.value && Boolean(expertSessionId.value)
    )
    /**
     * 左侧导航统一带任务上下文。
     * 只带 scenario 不带 session_id 会让目标页以为"没有当前任务",
     * 于是渲染默认页面 —— 这正是"报告完成后回看前置步骤结果消失"的原因。
     */
    const withTaskContext = (path) => {
      const parts = [`scenario=${currentScenario.value}`]
      if (expertSessionId.value) parts.push(`session_id=${expertSessionId.value}`)
      return `${path}?${parts.join('&')}`
    }
    watch(
      () => [isExpertRoute.value, expertSessionId.value],
      ([onExpertRoute, sid]) => {
        if (onExpertRoute && sid) expertWorkflowStore.ensurePolling(sid)
        else if (!onExpertRoute) expertWorkflowStore.cleanup()
      },
      { immediate: true }
    )

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
      KnowledgePlatform,
      showKnowledgePlatform,
      openKnowledgePlatform,
      closeKnowledgePlatform,
      currentLocation,
      preMainMenuItems: computed(() => PRE_MAIN_MENU_ITEMS.map((item) => ({
        ...item,
        index: withTaskContext(item.index)
      }))),
      preAnalysisMenuItems: computed(() => PRE_ANALYSIS_MENU_ITEMS.map((item) => ({
        ...item,
        index: withTaskContext(item.index)
      }))),
      preTailMenuItems: computed(() => PRE_TAIL_MENU_ITEMS.map((item) => ({
        ...item,
        index: withTaskContext(item.index)
      }))),
      duringMainMenuItems: computed(() => DURING_MAIN_MENU_ITEMS.map((item) => ({
        ...item,
        index: item.path === 'scenario'
          ? `/home/SCnet/${isUraniumScenario.value ? 'scenarioAnalysis' : 'scenarioModeling'}?scenario=${currentScenario.value}`
          : item.path === 'decision'
            ? `/home/SCnet/experimentManager?scenario=${currentScenario.value}&view=decision`
            : `${item.index}?scenario=${currentScenario.value}`
      }))),
      duringAnalysisMenuItems: computed(() => DURING_ANALYSIS_MENU_ITEMS.map((item) => ({
        ...item,
        index: `${item.index}?scenario=${currentScenario.value}`
      }))),
      duringDecisionMenuItems: computed(() => DURING_DECISION_MENU_ITEMS.map((item) => ({
        ...item,
        index: `/home/SCnet/experimentManager?scenario=${currentScenario.value}&view=decision`
      }))),
      duringTailMenuItems: computed(() => DURING_TAIL_MENU_ITEMS.map((item) => ({
        ...item,
        index: `${item.index}?scenario=${currentScenario.value}`
      }))),
      postMainMenuItems: POST_MAIN_MENU_ITEMS,
      postAnalysisMenuItems: POST_ANALYSIS_MENU_ITEMS,
      postTailMenuItems: POST_TAIL_MENU_ITEMS,
      duringSteps,
      duringCurrentKey,
      showDuringFlowStepper,
      isDuringStepCompleted,
      onDuringStepClick,
      showExpertProgress
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
      // 退出系统是跳转项、知识库是浮层项，两者都不改变当前页，别让它们抢走高亮
      if (index && index !== 'scnet-menu-exit' && index !== KNOWLEDGE_PLATFORM_INDEX) {
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
  /* 这里**不能**加 padding-bottom 给悬浮按钮让位:
     ScenarioSetting / ExpertPlanConfirmation 的 action-bar 是 sticky bottom:0,
     容器底部一有内边距,它就被整体顶上去,正好撞进悬浮按钮的位置(实测
     padding-bottom:88px 时底栏按钮 y=810~850、按钮 y=818~862,反而重叠)。
     页面底部本来就由这两个操作区占住,不需要再额外留白。 */
}

.scnet-router-host > * {
  /* 注意：这里不能强制 display: block，否则会覆盖各页面根元素自己的
     display: flex / grid（如反事实实验、EXreport 等用 flex 根布局让内部面板
     约束到视口高度并各自滚动），导致内容溢出被 overflow:hidden 裁掉而无法滚动。 */
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

/* 常驻入口（阶段选择 / 知识库）与随阶段切换的菜单之间的分隔线 */
.phase-menu-divider {
  height: 1px;
  margin: 4px 10px 10px;
  background: #e2e8f0;
}

/* 右下角浮层的避让带。
   页面底部有两类操作区会占住这个角落:
     - ExpertWorkflowNav 的"下一步"(fixed, bottom:24px, 高约 52px → 顶到 ~76px)
     - ScenarioSetting / ExpertPlanConfirmation 的 sticky action-bar(高约 56px → 顶到 ~80px)
   悬浮按钮必须抬到它们之上,页面内容也要在本区域内留白,否则会相互遮挡。 */
.scnet-layout-root {
  --scnet-float-safe-bottom: 88px;
}

/* 浮动切换按钮 */
.chat-toggle-float-btn {
  position: fixed;
  bottom: var(--scnet-float-safe-bottom);
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

/* 窄屏(与 ExpertWorkflowProgressFloat 的 is-narrow 断点一致):
   进度浮窗也收到右下角(bottom:96px),切换按钮要再抬一层,避免压住它 */
@media (max-width: 1280px) {
  .chat-toggle-float-btn {
    bottom: 152px;
  }
}
</style>
