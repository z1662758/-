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
        </div>

        <!--	返回对话首页	-->
        <el-menu-item index="/chatHome" class="back-select-item">
          <el-icon size="18"><ChatDotSquare/></el-icon>
          <template #title>对话首页</template>
        </el-menu-item>

        <!-- ========== 事前：风险识别与预警 ========== -->
        <template v-if="currentPhase === 'pre'">
          <el-menu-item index="/home/SCnet/situationAnalysis">
            <el-icon size="18"><DataLine/></el-icon>
            <template #title>需求分析</template>
          </el-menu-item>

          <el-menu-item index="/home/SCnet/oilIntelligence">
            <el-icon size="18"><WarningFilled/></el-icon>
            <template #title>开源情报</template>
          </el-menu-item>

          <!-- <el-menu-item index="/home/SCnet/knowledgeCreate">
            <el-icon size="18"><FolderOpened/></el-icon>
            <template #title>数据集管理</template>
          </el-menu-item> -->

          <el-menu-item index="/home/SCnet/oilSituationAnalysis">
            <el-icon size="18"><Document/></el-icon>
            <template #title>知识库</template>
          </el-menu-item>

          <!-- <el-menu-item index="/home/SCnet/knowledgeGraph">
            <el-icon size="18"><Collection/></el-icon>
            <template #title>主体网络</template>
          </el-menu-item> -->

          <!-- <el-menu-item index="/home/SCnet/openSourceIntelligence">
            <el-icon size="18"><Search/></el-icon>
            <template #title>开源情报</template>
          </el-menu-item> -->

          <el-sub-menu index="during-analysis">
            <template #title>
              <el-icon size="18"><DataAnalysis/></el-icon>
              <span>态势研判</span>
            </template>
            <el-menu-item index="/home/SCnet/situationResearch-main">
              <el-icon size="18"><Promotion/></el-icon>
              <template #title>态势预测</template>
            </el-menu-item>
            <el-menu-item index="/home/SCnet/reportGeneration">
              <el-icon size="18"><Document/></el-icon>
              <template #title>报告生成</template>
            </el-menu-item>
            <!-- <el-menu-item index="/home/SCnet/oilReportGeneration">
              <el-icon size="18"><Document/></el-icon>
              <template #title>石油报告</template>
            </el-menu-item> -->
          </el-sub-menu>
        </template>

        <!-- ========== 事中：应急响应与调度 ========== -->
        <template v-else-if="currentPhase === 'during'">
          <el-menu-item index="/home/SCnet/scenarioModeling">
            <el-icon size="18"><Edit/></el-icon>
            <template #title>想定生成</template>
          </el-menu-item>
          <el-menu-item index="/home/SCnet/experimentManager">
            <el-icon size="18"><Monitor/></el-icon>
            <template #title>实验运行</template>
          </el-menu-item>
          <el-menu-item index="/home/SCnet/interface">
            <el-icon size="18"><Place/></el-icon>
            <template #title>推演界面</template>
          </el-menu-item>
          <el-sub-menu index="during-analysis">
            <template #title>
              <el-icon size="18"><DataAnalysis/></el-icon>
              <span>决策分析</span>
            </template>
            <el-menu-item index="/home/SCnet/expAnalysisGameTheory">
              <el-icon size="18"><Grid/></el-icon>
              <template #title>博弈论分析</template>
            </el-menu-item>
            <el-menu-item index="/home/SCnet/expAnalysisDecisionTree">
              <el-icon size="18"><Promotion/></el-icon>
              <template #title>决策树分析</template>
            </el-menu-item>
            <el-menu-item index="/home/SCnet/expAnalysisScenario">
              <el-icon size="18"><TrendCharts/></el-icon>
              <template #title>情景分析</template>
            </el-menu-item>

          </el-sub-menu>

        
        </template>

        <!-- ========== 事后：复盘优化与重构 ========== -->
        
        <template v-else-if="currentPhase === 'post'">
          <el-menu-item index="/home/SCnet/counterfactualExperiment">
            <el-icon size="18"><PieChart/></el-icon>
            <template #title>反事实实验</template>
          </el-menu-item>
          <el-sub-menu index="post-analysis">
            <template #title>
              <el-icon size="18"><DataAnalysis/></el-icon>
              <span>实验分析</span>
            </template>
            <el-menu-item index="/home/SCnet/expAnalysisObserve">
              <el-icon size="18"><Search/></el-icon>
              <template #title>观察分析</template>
            </el-menu-item>
            <el-menu-item index="/home/SCnet/expAnalysisIntervention">
              <el-icon size="18"><Operation/></el-icon>
              <template #title>干预分析</template>
            </el-menu-item>
            <el-menu-item index="/home/SCnet/expAnalysisMechanism">
              <el-icon size="18"><ScaleToOriginal/></el-icon>
              <template #title>机制与因果</template>
            </el-menu-item>
          </el-sub-menu>

          <el-menu-item index="/home/SCnet/EXreport">
            <el-icon size="18"><Postcard/></el-icon>
            <template #title>铀供应链实验报告</template>
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
        <transition name="fade-delay" v-show="!isCollapse">
          <div style="height: 100%; display: flex; align-items: center">
            <span style="margin-left: 0.5rem; color: #606266; font-weight: bold; transition: opacity 3s ease 3s;">铀供应链</span>
            <el-button circle size="default" style="margin-left: 2.5rem" color="rgb(248, 152, 152)" plain @click="exit()">
              <el-icon><SwitchButton/></el-icon>
            </el-button>
          </div>
        </transition>
      </div>
    </div>
    <div :class="isCollapse ? 'body-pos-shrink' : 'body-pos-expand'">
      <Header style="flex-shrink: 0; z-index: 2000"/>
      <router-view class="scnet-router-view"/>
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
  Aim, Box, Coin, Collection, Connection, DataAnalysis, DataLine, Document, DocumentDelete, Edit,
  Filter, FolderOpened, Grid, House, Memo, Monitor, Notification, Odometer, Operation, Orange,
  PieChart, Place, Postcard, Promotion, ScaleToOriginal, Search, Setting, Share,
  SwitchButton, TrendCharts, User, WarningFilled, ChatDotSquare
} from "@element-plus/icons-vue";
import {ref, onMounted, onUnmounted, computed} from "vue";
import {useRoute, useRouter} from "vue-router";
import {Files, Refresh} from "@element-plus/icons-vue";
import Header from "@/components/Header.vue";
import EventPhaseStepper from "@/components/EventPhaseStepper.vue";
import { useDuringFlowSteps, routeToStepKey } from "@/views/SCnet/composables/useDuringFlowSteps";
import { PHASE_EVENT, PHASE_STORAGE_KEY, ROUTE_TO_PHASE } from "@/constants/scnetPhase";

export default {
  name: "SCnetLayout",
  components: {
    Memo,
    Monitor,
    Place,
    Edit,
    EventPhaseStepper,
    Refresh, Files, DataAnalysis, DataLine, DocumentDelete, House, Aim, Box, Collection,
    Document, Notification, Operation, Postcard, Promotion, ScaleToOriginal, Search, Setting,
    Coin, PieChart, Filter, FolderOpened, Grid, Odometer, SwitchButton, Orange, TrendCharts, User, Header, WarningFilled, ChatDotSquare
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const activeIndex = ref('1')
    const storedPhase = ref(localStorage.getItem(PHASE_STORAGE_KEY) || '')

    // currentPhase 优先读 localStorage，若为空则根据当前路由推断
    const currentPhase = computed(() => {
      if (storedPhase.value) return storedPhase.value
      return ROUTE_TO_PHASE[route.path] || ''
    })

    const { steps: duringSteps, isStepCompleted: isDuringStepCompleted } = useDuringFlowSteps()
    const duringCurrentKey = computed(() => routeToStepKey(route.path, route.query || {}))
    const duringFlowVisiblePrefixes = [
      '/home/SCnet/scenarioModeling',
      '/home/SCnet/agent-design-studio',
      '/home/SCnet/agentSimulationStudio'
    ]
    const showDuringFlowStepper = computed(() => (
      currentPhase.value === 'during' &&
      duringFlowVisiblePrefixes.some(prefix => route.path.startsWith(prefix))
    ))
    const onDuringStepClick = (step) => {
      if (!step) return
      const isSamePath = route.path === step.route
      const sameQuery = isSamePath && JSON.stringify(route.query || {}) === JSON.stringify(step.query || {})
      if (sameQuery) return
      router.push({ path: step.route, query: step.query || {} })
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
  width: calc(100vw - 64px);
  max-width: calc(100vw - 64px);
  margin-left: 64px;
  transition: all 0.3s ease-in-out;
}

.scnet-router-view {
  flex: 1;
  min-height: 0;
  height: calc(100vh - 60px);
  overflow: auto;
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
