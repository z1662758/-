<template>
  <div style="display: flex; width: 100%; height: 100vh; overflow: hidden;">
    <!--	左侧菜单栏 -->
    <div class="menu-pos">
      <el-menu :default-active="activeIndex" class="el-menu-vertical-demo"
               :collapse="isCollapse" ref="menuRef" router>
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
  Aim, Box, Coin, Collection, Connection, Cpu, DataAnalysis, DataLine, Document, DocumentDelete, Edit,
  FolderOpened, Grid, House, MapLocation, Memo, Monitor, Notification, Operation, Orange,
  PieChart, Place, Postcard, Promotion, ScaleToOriginal, Search as SearchIcon, Setting,
  SwitchButton, TrendCharts, User, WarningFilled, ChatDotSquare, CircleCheck
} from "@element-plus/icons-vue";
import {ref, onMounted, onUnmounted, computed, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {Files, Refresh} from "@element-plus/icons-vue";
import AppHeader from "@/components/Header.vue";
import { useScenarioStore } from "@/stores/scenario";
import { PHASE_EVENT, PHASE_STORAGE_KEY, ROUTE_TO_PHASE } from "@/constants/scnetPhase";

const PRE_MAIN_MENU_ITEMS = Object.freeze([
  // 需求分析已从主流程移除(K2-FLOW):对话首页承担研判入口,页面/路由保留供直接访问
  // { index: '/home/SCnet/situationAnalysis', label: '需求分析', icon: DataLine },
  { index: '/home/SCnet/knowledgeGraph', label: '知识库', icon: Collection },
  { index: '/home/SCnet/openSourceIntelligence', label: '开源情报', icon: WarningFilled },
])

const PRE_ANALYSIS_MENU_ITEMS = Object.freeze([
  { index: '/home/SCnet/situationJudge', label: '态势研判', icon: DataLine },
  { index: '/home/SCnet/situationResearch-main', label: '态势预测', icon: Promotion }
])

const PRE_TAIL_MENU_ITEMS = Object.freeze([
  // 报告生成已从主流程移除(K2-FLOW):对话结果内「导出PDF」替代;页面/路由保留供直接访问
  // { index: '/home/SCnet/reportGeneration', label: '报告生成', icon: Document }
])

const DURING_MAIN_MENU_ITEMS = Object.freeze([
  // 铀场景事中主线：建模设定 → 想定生成 → 实验推演 → 决策生成（实体关系图作为想定生成的“下一步”流转，不展示在左侧菜单栏）
  { index: '/home/SCnet/modelingSetup', label: '建模设定', icon: Cpu, uraniumOnly: true },
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

/**
 * 按当前路由反查应高亮的菜单项。
 * 菜单 index 形如 `/home/SCnet/experimentManager?scenario=uranium&view=decision`，
 * 而 route.path 不带 query，直接比较永远不相等，导致刷新 / 「下一步」跳转后菜单失去高亮。
 * 规则：path 相同，且菜单 index 上除 scenario 以外的 query 都与当前路由一致；
 * 多个候选时取 query 条件最多的（decision 视图优先匹配「决策生成」而非「实验推演」）。
 */
function resolveActiveMenuIndex(route, items) {
  const routePath = String(route?.path || '')
  const routeQuery = route?.query || {}
  let best = null
  let bestScore = -1
  for (const item of items) {
    const raw = String(item?.index || '')
    if (!raw) continue
    const [itemPath, search = ''] = raw.split('?')
    if (itemPath !== routePath) continue
    const params = new URLSearchParams(search)
    let score = 0
    let matched = true
    for (const [key, value] of params.entries()) {
      if (key === 'scenario') continue
      if (String(routeQuery[key] ?? '') !== value) { matched = false; break }
      score += 1
    }
    if (matched && score > bestScore) {
      best = raw
      bestScore = score
    }
  }
  return best || routePath
}

export default {
  name: "SCnetLayout",
  components: {
    Memo,
    Monitor,
    Place,
    Edit,
    Cpu,
    Connection,
    Refresh, Files, DataAnalysis, DataLine, DocumentDelete, House, Aim, Box, Collection,
    Document, Notification, Operation, Postcard, Promotion, ScaleToOriginal, SearchIcon, Setting,
    Coin, PieChart, FolderOpened, Grid, SwitchButton, Orange, TrendCharts, User, AppHeader, WarningFilled, ChatDotSquare, CircleCheck,
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
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

    const isUraniumScenario = computed(() => currentScenario.value === 'uranium')

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

    const withScenario = (item) => ({
      ...item,
      index: `${item.index}?scenario=${currentScenario.value}${item.extraQuery ? `&${item.extraQuery}` : ''}`
    })
    const preMainMenuItems = computed(() => PRE_MAIN_MENU_ITEMS.map(withScenario))
    const preAnalysisMenuItems = computed(() => PRE_ANALYSIS_MENU_ITEMS.map(withScenario))
    const preTailMenuItems = computed(() => PRE_TAIL_MENU_ITEMS.map(withScenario))
    const duringMainMenuItems = computed(() => DURING_MAIN_MENU_ITEMS
      .filter((item) => !item.uraniumOnly || isUraniumScenario.value)
      .map((item) => {
        if (item.path === 'scenario') {
          return {
            ...item,
            index: `/home/SCnet/${isUraniumScenario.value ? 'scenarioAnalysis' : 'scenarioModeling'}?scenario=${currentScenario.value}`
          }
        }
        if (item.path === 'decision') {
          return { ...item, index: `/home/SCnet/experimentManager?scenario=${currentScenario.value}&view=decision` }
        }
        return withScenario(item)
      }))
    const duringAnalysisMenuItems = computed(() => DURING_ANALYSIS_MENU_ITEMS.map(withScenario))
    const duringDecisionMenuItems = computed(() => DURING_DECISION_MENU_ITEMS.map((item) => ({
      ...item,
      index: `/home/SCnet/experimentManager?scenario=${currentScenario.value}&view=decision`
    })))
    const duringTailMenuItems = computed(() => DURING_TAIL_MENU_ITEMS.map(withScenario))

    // 当前高亮项：按路由反查（见 resolveActiveMenuIndex），不再依赖点击事件维护
    const activeIndex = computed(() => resolveActiveMenuIndex(route, [
      ...preMainMenuItems.value,
      ...preAnalysisMenuItems.value,
      ...preTailMenuItems.value,
      ...duringMainMenuItems.value,
      ...duringDecisionMenuItems.value,
      ...duringAnalysisMenuItems.value,
      ...duringTailMenuItems.value,
      ...POST_MAIN_MENU_ITEMS,
      ...POST_ANALYSIS_MENU_ITEMS,
      ...POST_TAIL_MENU_ITEMS
    ]))

    return {
      activeIndex,
      currentPhase,
      currentScenario,
      scenarioLabel,
      preMainMenuItems,
      preAnalysisMenuItems,
      preTailMenuItems,
      duringMainMenuItems,
      duringAnalysisMenuItems,
      duringDecisionMenuItems,
      duringTailMenuItems,
      postMainMenuItems: POST_MAIN_MENU_ITEMS,
      postAnalysisMenuItems: POST_ANALYSIS_MENU_ITEMS,
      postTailMenuItems: POST_TAIL_MENU_ITEMS
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
  methods: {
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
