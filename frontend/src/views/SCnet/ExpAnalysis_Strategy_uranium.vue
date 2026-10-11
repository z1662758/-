<template>
  <div class="strategy-page mid-stage-bg analysis-workspace">
    <AnalysisLinkTabs active="strategy" />

    <!-- 顶层统一 Hero 区域与视图模式切换器 -->
    <header class="strategy-hero glass-panel">
      <div class="strategy-hero-left">
        <div class="strategy-hero-badge-row">
          <span class="strategy-hero-badge">02 · 决策分析与方案优化</span>
          <el-tag size="small" type="primary" effect="plain">情景演化与决策树双方法融合</el-tag>
          <el-tag size="small" type="success" effect="light">2022–2028 俄乌冲突推演时空</el-tag>
        </div>
        <h1 class="strategy-hero-title">供应链抗扰动决策分析与方案优化</h1>
        <p class="strategy-hero-sub">
          融汇宏观情景演化与微观决策树寻优：上游锚定俄乌地缘制裁冲击与脆弱节点，下游动态求解最优调控对策，核验规章前置依赖并输出具体应对措施清单。
        </p>
      </div>

      <div class="strategy-hero-right">
        <div class="view-mode-toggle-wrap">
          <span class="view-mode-label">界面视图布局：</span>
          <el-segmented
            v-model="viewMode"
            :options="viewModeOptions"
            size="default"
            class="view-mode-segmented"
          >
            <template #default="{ item }">
              <span class="seg-item">
                <el-icon :size="14"><component :is="item.icon" /></el-icon>
                {{ item.label }}
              </span>
            </template>
          </el-segmented>
        </div>
      </div>
    </header>

    <!-- 模式一：联合分析全景（上下级联融合单页，答辩与推演汇报最佳实践） -->
    <div v-if="viewMode === 'cascade'" class="cascade-workspace">
      <!-- 决策分析核心逻辑看板：说明分析如何支撑方案选择 -->
      <section class="strategy-narrative-strip glass-panel">
        <div class="narrative-strip-head">
          <span class="narrative-step-pill">Step 02 · 决策评估</span>
          <div class="narrative-title-box">
            <h3>【决策分析在说明什么？】</h3>
            <p>承接【沙盘推演与脆弱性诊断】暴露的断链风险，通过宏观情景演化与决策树博弈寻优，<b>对现有方案进行客观评估</b>，回答：“面对突发外部冲击，如何调控才能以最小代价保障核电机组零非停？”，评估完成后将输出最优解支撑下一步【决策方案生成】。</p>
          </div>
        </div>

        <div class="narrative-two-halves-grid">
          <div class="half-role-card upper">
            <div class="half-role-badge">上半部 · 宏观情景演化想说明：</div>
            <strong>冲击发生时，供应链脆弱断点受损有多严重？</strong>
            <p>基于 2022–2028 年俄乌冲突长周期推演，测算在美国禁俄铀法案落地与现货飙至 $106/lb（2024年）极端情景下，口岸与基地可能暴露出的供需缺口率（达 18.2%）与 CIF 到岸成本激增（超 $290/kgU），为决策提供精确靶向输入。</p>
          </div>
          <div class="half-role-card lower">
            <div class="half-role-badge">下半部 · 决策树博弈寻优想说明：</div>
            <strong>面对上述冲击，多路径应对中哪套方案最优且真能落地？</strong>
            <p>扩展式决策树对比“未干预基线”与“主动调控路径”，综合求解出 91.5 分的最优方案（远洋海运分流 55% + 防城港保税库借调 400 tU），并核验 4 项严苛规章审批，生成切实可行的调控应对措施，避免方案流于口号。</p>
          </div>
        </div>
      </section>

      <!-- ==================== 上半区：01 · 宏观情景推演与扰动锚定 ==================== -->
      <section class="scenario-section glass-panel">
        <div class="section-head">
          <div class="section-title-wrap">
            <span class="analysis-column-index">01</span>
            <div>
              <h3>宏观情景推演与扰动锚定</h3>
              <p>2024–2030 年供应链长周期扰动演化。点击年度时点卡片，立即将冲击参数注入下方决策树。</p>
            </div>
          </div>
          <div class="section-head-tags">
            <el-tag size="small" type="info" effect="plain">
              共 {{ scenarioVm?.yearWindows?.length || 7 }} 个推演时空窗口
            </el-tag>
            <el-tag size="small" :type="activeWindowTagType" effect="dark">
              当前锚定：{{ activeWindow?.title || '2026年' }}
            </el-tag>
          </div>
        </div>

        <!-- 水平横向紧凑型 2024–2030 年份情景卡片条 -->
        <div class="year-ribbon">
          <article
            v-for="(win, idx) in scenarioYearWindows"
            :key="win.id || idx"
            class="year-ribbon-card"
            :class="[win.tone, { active: activeWindowIndex === idx }]"
            role="button"
            tabindex="0"
            @click="selectYearWindow(idx)"
            @keydown.enter.prevent="selectYearWindow(idx)"
            @keydown.space.prevent="selectYearWindow(idx)"
          >
            <div class="ribbon-card-top">
              <span class="ribbon-year">{{ win.year || (2024 + idx) }}年</span>
              <el-tag size="small" :type="toTagType(win.tone)" effect="light">
                {{ win.stageLabel || '演化阶段' }}
              </el-tag>
            </div>
            <strong class="ribbon-headline">{{ win.headline || win.title }}</strong>

            <!-- 稳健度与风险度双微进度条 -->
            <div class="ribbon-progress-stack">
              <div class="ribbon-progress-item">
                <span class="progress-lbl">稳健度 {{ getWindowStability(win) }}%</span>
                <el-progress
                  :percentage="getWindowStability(win)"
                  :stroke-width="4"
                  :show-text="false"
                  :color="getWindowStability(win) >= 70 ? '#10b981' : getWindowStability(win) >= 50 ? '#f59e0b' : '#ef4444'"
                />
              </div>
              <div class="ribbon-progress-item">
                <span class="progress-lbl risk">风险敞口 {{ getWindowRisk(win) }}%</span>
                <el-progress
                  :percentage="getWindowRisk(win)"
                  :stroke-width="4"
                  :show-text="false"
                  color="#f43f5e"
                />
              </div>
            </div>

            <div class="ribbon-card-footer">
              <span class="ribbon-active-indicator" v-if="activeWindowIndex === idx">
                <el-icon><Check /></el-icon> 正在作为下层输入
              </span>
              <span class="ribbon-status" v-else>综合评分 {{ getWindowStability(win) }}</span>
            </div>
          </article>
        </div>

        <!-- 选定年份情景影响画像 (3+1 紧凑分栏) -->
        <div v-if="activeWindow" class="scenario-impact-grid">
          <div class="impact-kpi-card danger">
            <span class="impact-kpi-label">供应链缺口暴露</span>
            <strong class="impact-kpi-val">{{ activeWindowGapText }}</strong>
            <small class="impact-kpi-hint">未干预基线供应缺口预警</small>
          </div>
          <div class="impact-kpi-card warning">
            <span class="impact-kpi-label">到岸完全成本 (CIF)</span>
            <strong class="impact-kpi-val">{{ activeWindowCifText }}</strong>
            <small class="impact-kpi-hint">地缘运力受阻引发溢价冲击</small>
          </div>
          <div class="impact-kpi-card info">
            <span class="impact-kpi-label">第一受阻关键物流走廊</span>
            <strong class="impact-kpi-val">{{ activeWindowChokePoint }}</strong>
            <small class="impact-kpi-hint">跨国宽窄轨换装及通道吞吐挤兑</small>
          </div>
          <div class="impact-narrative-card">
            <div class="narrative-head">
              <el-icon><Document /></el-icon>
              <span>情景演化脉络与扰动特征</span>
            </div>
            <p class="narrative-text">{{ activeWindow.summary || '当前年度处于宏观演进窗口，地缘政治冲突与物流走廊通行能力构成核心制约。' }}</p>
            <div class="narrative-tags">
              <span class="narrative-tag">主要关联节点：{{ activeWindowNodes }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== 级联纽带：上下游模型联动桥梁 ==================== -->
      <section class="cascade-bridge-banner">
        <div class="bridge-left">
          <span class="bridge-pulse-dot"></span>
          <div class="bridge-text">
            <strong>上下游模型联动驱动中</strong>
            <p>已将上方选定的【{{ activeWindow?.title }} · {{ activeWindow?.headline }}】作为扰动初始约束注入下方决策树。</p>
          </div>
        </div>

        <div class="bridge-center-tags">
          <span class="bridge-param-pill">履约率约束：≥ 95%</span>
          <span class="bridge-param-pill">反应堆非停风险：≤ 0.5%</span>
          <span class="bridge-param-pill">求解状态：序贯博弈树已收敛</span>
        </div>

        <div class="bridge-right-actions">
          <div class="branch-toggle-group">
            <button
              type="button"
              class="branch-toggle-btn"
              :class="{ active: activeTreeBranch === 'controlled' }"
              @click="switchTreeBranch('controlled')"
            >
              <el-icon><Promotion /></el-icon>
              调控寻优树
            </button>
            <button
              type="button"
              class="branch-toggle-btn"
              :class="{ active: activeTreeBranch === 'baseline' }"
              @click="switchTreeBranch('baseline')"
            >
              <el-icon><WarningFilled /></el-icon>
              未干预基线
            </button>
          </div>
          <el-button size="small" type="primary" plain @click="refreshDecisionTree">
            <el-icon><Refresh /></el-icon>
            重置树视图
          </el-button>
        </div>
      </section>

      <!-- ==================== 下半区：02 · 决策树推演与落地方案寻优 ==================== -->
      <section class="decision-section glass-panel">
        <div class="section-head">
          <div class="section-title-wrap">
            <span class="analysis-column-index">02</span>
            <div>
              <h3>决策树推演与落地方案寻优</h3>
              <p>以左侧扩展式决策树推演多阶段应对路径，在右侧核验综合得分榜、落地前置规章与具体化下发调度令。</p>
            </div>
          </div>
          <div class="section-head-tags">
            <el-tag size="small" :type="activeTreeBranch === 'controlled' ? 'success' : 'danger'" effect="plain">
              {{ activeTreeBranch === 'controlled' ? '正在查看调控路径分支' : '正在查看未干预自然演化基线' }}
            </el-tag>
            <span class="tree-canvas-hint">滚轮缩放 · 拖拽平移 · 点击节点查看大模型推理与规章依据</span>
          </div>
        </div>

        <div class="decision-layout-grid">
          <!-- 左栏：策略决策树交互画布 (60% 宽度) -->
          <div class="tree-canvas-panel">
            <div class="tree-canvas-header">
              <div class="tree-legend-row">
                <span class="legend-pill root"><i class="dot"></i> 情景扰动起点</span>
                <span class="legend-pill decision"><i class="dot"></i> 调控动作节点</span>
                <span class="legend-pill chance"><i class="dot"></i> 响应概率节点</span>
                <span class="legend-pill leaf"><i class="dot"></i> 最终评估叶子</span>
              </div>
              <span class="tree-tip">节点可点击展开深度推理</span>
            </div>

            <div class="tree-chart-container" :style="treeContainerStyle">
              <div
                v-show="activeTreeBranch === 'controlled'"
                ref="controlledTreeChartRef"
                class="tree-chart"
                :style="controlledChartStyle"
              ></div>
              <div
                v-show="activeTreeBranch === 'baseline'"
                ref="baselineTreeChartRef"
                class="tree-chart"
                :style="baselineChartStyle"
              ></div>
            </div>
          </div>

          <!-- 右栏：策略优选榜单与落地保障清单 (40% 宽度) -->
          <div class="strategy-action-panel">
            <!-- 候选策略综合得分榜 -->
            <div class="sub-panel strategy-ranking-card">
              <div class="sub-panel-head">
                <div class="sub-head-left">
                  <el-icon><TrendCharts /></el-icon>
                  <strong>候选调控方案综合评分榜</strong>
                </div>
                <el-tag size="small" type="success" effect="plain">最优已收敛</el-tag>
              </div>

              <div class="strategy-list">
                <div
                  v-for="(st, idx) in strategyRankList"
                  :key="st.name"
                  class="strategy-rank-item"
                  :class="{ isBest: idx === 0 }"
                  @click="locateStrategyNode(st.id)"
                >
                  <div class="st-rank-badge" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</div>
                  <div class="st-main-info">
                    <div class="st-name-row">
                      <strong class="st-title">{{ st.name }}</strong>
                      <span class="st-score-tag">{{ st.score }} 分</span>
                    </div>
                    <div class="st-metric-row">
                      <span>较基线: <b :class="st.improvement >= 0 ? 'text-success' : 'text-danger'">+{{ st.improvement }}分</b></span>
                      <span>履约完成: <b>{{ st.fulfillmentRate }}%</b></span>
                      <span>非停风险: <b class="text-safe">{{ st.tripRisk }}</b></span>
                    </div>
                  </div>
                  <el-button link size="small" type="primary">
                    <el-icon><ArrowRight /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 方案落地可行性前置条件 (会议纪要核心诉求：增强方案落地性) -->
            <div class="sub-panel feasibility-checklist-card">
              <div class="sub-panel-head">
                <div class="sub-head-left">
                  <el-icon><Check /></el-icon>
                  <strong>方案落地可行性前置条件核验</strong>
                </div>
                <el-tag size="small" type="primary" effect="light">4/4 前置满足</el-tag>
              </div>

              <div class="checklist-grid">
                <div
                  v-for="item in feasibilityChecklist"
                  :key="item.id"
                  class="checklist-item"
                  :class="item.status"
                >
                  <div class="checklist-item-head">
                    <el-icon class="check-icon"><CircleCheckFilled /></el-icon>
                    <strong>{{ item.title }}</strong>
                    <el-tag size="small" :type="item.tagType" effect="plain">{{ item.category }}</el-tag>
                  </div>
                  <p class="checklist-item-desc">{{ item.desc }}</p>
                  <div class="checklist-authority">
                    <small>批准依据：{{ item.authority }}</small>
                  </div>
                </div>
              </div>
            </div>

            <!-- 具体化落地执行应对措施 (非模糊方案，实打实的可操作措施) -->
            <div class="sub-panel dispatch-order-card">
              <div class="sub-panel-head">
                <div class="sub-head-left">
                  <el-icon><Promotion /></el-icon>
                  <strong>核心应对调控动作 (Action Plan)</strong>
                </div>
                <span class="dispatch-no">措施编号: ACT-2026-01</span>
              </div>

              <div class="dispatch-body">
                <div class="dispatch-row">
                  <span class="dispatch-label">核心动作：</span>
                  <strong class="dispatch-val highlight">{{ currentDispatchOrder.primaryAction }}</strong>
                </div>
                <div class="dispatch-row">
                  <span class="dispatch-label">调配运量：</span>
                  <span class="dispatch-val">{{ currentDispatchOrder.allocatedVolume }}</span>
                </div>
                <div class="dispatch-row">
                  <span class="dispatch-label">执行通道：</span>
                  <span class="dispatch-val">{{ currentDispatchOrder.corridor }}</span>
                </div>
                <div class="dispatch-row">
                  <span class="dispatch-label">平准保障：</span>
                  <span class="dispatch-val">{{ currentDispatchOrder.bufferAction }}</span>
                </div>
              </div>

              <div class="dispatch-footer">
                <el-tag size="small" type="success" effect="plain">
                  已匹配最优对策 · 可在顶部进入决策方案
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 模式二：仅看情景分析 (宏观时空演化完整展开) -->
    <main v-else-if="viewMode === 'scenario'" class="strategy-subview-wrap">
      <ScenarioView
        :embedded="true"
        @open-decision-tree="viewMode = 'decisionTree'"
      />
    </main>

    <!-- 模式三：仅看决策树 (微观调控优选完整展开) -->
    <main v-else-if="viewMode === 'decisionTree'" class="strategy-subview-wrap">
      <DecisionTreeView
        :embedded="true"
        @open-scenario="viewMode = 'scenario'"
      />
    </main>

    <!-- 决策树节点深度推理抽屉 (对齐人群聚集与学长实现) -->
    <el-drawer
      v-model="nodePanel.visible"
      direction="rtl"
      size="440px"
      :modal="false"
      append-to-body
      :close-on-click-modal="false"
      :show-close="false"
      :with-header="false"
      class="reasoning-drawer"
    >
      <template v-if="nodePanel.node">
        <div class="drawer-header">
          <div class="drawer-header-main">
            <el-tag size="small" :type="nodePanel.node.isLeaf ? 'success' : 'primary'" effect="dark">
              {{ nodePanel.node.isLeaf ? '结果叶子' : '决策动作' }}
            </el-tag>
            <el-tag
              size="small"
              :type="nodePanel.node.track === 'baseline' ? 'danger' : 'success'"
              effect="plain"
            >
              {{ nodePanel.node.track === 'baseline' ? '未干预基线' : '调控分支' }}
            </el-tag>
            <span class="drawer-title">{{ nodePanel.node.action || nodePanel.node.name }}</span>
          </div>
          <el-button link class="drawer-close-btn" @click="nodePanel.visible = false">关闭</el-button>
        </div>

        <div class="drawer-body">
          <!-- 节点元数据 -->
          <div class="drawer-card">
            <div class="drawer-meta-row">
              <span class="drawer-label">执行主体：</span>
              <strong>{{ nodePanel.node.actor || '中核集团/国家能源局' }}</strong>
            </div>
            <div class="drawer-meta-row" v-if="nodePanel.node.prob && nodePanel.node.prob < 1">
              <span class="drawer-label">分支概率：</span>
              <strong>{{ Math.round(nodePanel.node.prob * 100) }}%</strong>
            </div>
            <p class="drawer-desc">{{ nodePanel.node.desc || '结合当前时点供需缺口、地缘风险与通道冗余进行应对处置。' }}</p>
          </div>

          <!-- 大模型链式推理思考过程 -->
          <div v-if="nodeReasoningDetails" class="drawer-card">
            <h4 class="drawer-card-title">大模型多步推演思考链</h4>
            <el-steps direction="vertical" :active="nodeReasoningDetails.thinkingSteps.length" finish-status="success" class="thinking-steps">
              <el-step
                v-for="(step, idx) in nodeReasoningDetails.thinkingSteps"
                :key="`step-${idx}`"
                :description="step"
              />
            </el-steps>
          </div>

          <!-- 知识库与政策依据 -->
          <div v-if="nodeReasoningDetails" class="drawer-card">
            <h4 class="drawer-card-title">行业规章与政策依据</h4>
            <div class="source-list">
              <div v-for="(src, idx) in nodeReasoningDetails.sources" :key="`src-${idx}`" class="source-item">
                <div class="source-item-head">
                  <el-tag size="small" type="warning" effect="plain">{{ src.type }}</el-tag>
                  <strong class="source-name">{{ src.name }}</strong>
                </div>
                <p class="source-snippet">{{ src.snippet }}</p>
              </div>
            </div>
          </div>

          <!-- 叶子节点成效对比 -->
          <div v-if="nodePanel.node.isLeaf && nodePanel.node.outcome" class="drawer-card">
            <h4 class="drawer-card-title">预测结果成效</h4>
            <div class="leaf-score-box">
              <div class="leaf-score-item">
                <span>对策评分</span>
                <strong>{{ nodePanel.node.outcome.score || 88 }} 分</strong>
              </div>
              <div class="leaf-score-item">
                <span>履约完成率</span>
                <strong class="text-success">{{ nodePanel.node.outcome.fulfillmentRate || '98.5%' }}</strong>
              </div>
              <div class="leaf-score-item">
                <span>非计划停堆</span>
                <strong class="text-safe">0 次</strong>
              </div>
            </div>
            <p class="leaf-situation-text">{{ nodePanel.node.outcome.situation || '战略储备与替代航线有效平准缺口，反应堆维持额定功率稳定运行。' }}</p>
          </div>
        </div>
      </template>
    </el-drawer>

    <!-- 统一流程导航（右下角规范悬浮：上一步脆弱性分析、过程查看(事后回放)、下一步决策生成） -->
    <DuringWorkflowNav
      back="/home/SCnet/expAnalysisGameTheory"
      back-label="上一步：脆弱性分析"
      process-view="/home/SCnet/interface?view=simulation&theaterMode=replay"
      process-label="过程查看 (事后回放)"
      next="/home/SCnet/experimentManager?view=decision"
      next-label="下一步：决策方案生成"
    />
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import * as echarts from 'echarts'
import DuringWorkflowNav from './components/DuringWorkflowNav.vue'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheckFilled,
  Document,
  Grid,
  InfoFilled,
  Promotion,
  Refresh,
  Right,
  TrendCharts,
  VideoPlay,
  WarningFilled
} from '@element-plus/icons-vue'

import AnalysisLinkTabs from './components/shared/AnalysisLinkTabs.vue'
import ScenarioView from './ExpAnalysis_Scenario_uranium.vue'
import DecisionTreeView from './ExpAnalysis_DecisionTree_uranium.vue'
import './components/shared/midStage.css'

import { useUraniumAnalysisExperiment } from './composables/useUraniumAnalysisExperiment'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { uraniumDecisionReasoning } from './adapters/uraniumDecisionCopy'
import {
  buildUraniumDecisionTreeViewModel,
  buildUraniumScenarioViewModel,
  URANIUM_SCENARIO_OPTIONS
} from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'
import { createUraniumDemoSeed } from '@/views/SCnet/mock/uraniumDemoLab'

defineOptions({ name: 'ExpAnalysisStrategyUranium' })

const props = defineProps({
  initialMethod: {
    type: String,
    default: ''
  }
})

const route = useRoute()
const router = useRouter()

useUraniumAnalysisExperiment()
const uraniumStore = useUraniumDemoStore()
const snapshotStore = useAnalysisSnapshotStore()
const { selectedExperiment } = storeToRefs(uraniumStore)

// 视图模式: cascade(联合全景，上下联动) | scenario(仅看情景) | decisionTree(仅看决策树)
const viewMode = ref('cascade')

const viewModeOptions = [
  { value: 'cascade', label: '🔗 联合全景 (上下级联联动)', icon: markRaw(Grid) },
  { value: 'scenario', label: '📊 仅看情景分析 (宏观演化)', icon: markRaw(TrendCharts) },
  { value: 'decisionTree', label: '🌲 仅看决策树 (调控寻优)', icon: markRaw(Promotion) }
]

// 监听 query 参数
watch(() => route.query.method, (val) => {
  if (val && ['cascade', 'scenario', 'decisionTree'].includes(val)) {
    viewMode.value = val
  }
})

// ================== 上半区情景演化模型 ==================
const effectiveExperiment = computed(() => {
  if (selectedExperiment.value) return selectedExperiment.value
  if (snapshotStore.getActiveSnapshot()?.experiment) return snapshotStore.getActiveSnapshot().experiment
  const list = Object.values(uraniumStore.experiments || {})
  if (list.length) return list[0]
  try {
    const seed = createUraniumDemoSeed()
    return seed?.experiments?.['uranium-security-first-20260708-131000'] || (seed?.experiments ? Object.values(seed.experiments)[0] : null)
  } catch (e) {
    return null
  }
})

const scenarioVm = computed(() => buildUraniumScenarioViewModel({
  experiment: effectiveExperiment.value,
  snapshot: snapshotStore.getActiveSnapshot()
}))

const activeWindowIndex = ref(2) // 默认选中 2024 年（美国禁俄铀法案与现货破峰年）

const scenarioYearWindows = computed(() => {
  const defaultList = [
    { year: 2022, title: '2022年', headline: '俄乌冲突爆发与黑海航道阻断', stageLabel: '冲突初发', tone: 'danger', stability: 52, risk: 68, gap: '8.2%', cif: '$248/kgU', choke: '黑海/圣彼得堡航运停滞', summary: '西方制裁初发，俄罗斯 44% 浓缩产能脱钩风险激增，欧洲港口拒运俄籍放射性货物，中欧集运彻底断航。' },
    { year: 2023, title: '2023年', headline: '中欧陆海通道挤兑加剧', stageLabel: '运力挤兑', tone: 'warning', stability: 58, risk: 55, gap: '11.5%', cif: '$265/kgU', choke: '阿拉山口换装负荷 88%', summary: '海运阻断引发陆路过境运力挤兑，阿拉山口宽窄轨换装车皮配额紧俏，在途周期由 18 天拉长至 28 天。' },
    { year: 2024, title: '2024年', headline: '美国禁俄铀法案生效与现货破峰', stageLabel: '极端冲击', tone: 'danger', stability: 38, risk: 88, gap: '18.2%', cif: '$298/kgU', choke: '现货离岸溢价超 85%', summary: '《禁止进口俄罗斯铀法案》正式生效，现货暴涨至 $106/lb 十余年极值，国际公用事业抢购，国内北方基地原料库存破警戒线。' },
    { year: 2025, title: '2025年', headline: '供应链次生牛鞭效应蔓延', stageLabel: '次生承压', tone: 'warning', stability: 48, risk: 65, gap: '14.0%', cif: '$275/kgU', choke: '包头基地库存 14 周破警戒线', summary: '次生断料恐慌向制造端传导，包头燃料基地库存跌破 180 天红线，下游华龙一号面临换料大修停堆重大风险。' },
    { year: 2026, title: '2026年', headline: '跨里海铁海联运与海运分流重构', stageLabel: '通道重构', tone: 'normal', stability: 72, risk: 36, gap: '3.5%', cif: '$242/kgU', choke: '纳米比亚直航防城港畅通', summary: '【绕行令】生效，海运分流提升至 55%，启动纳米比亚直航连云港/防城港，跨里海铁水联运建立新常态。' },
    { year: 2027, title: '2027年', headline: '控股产能扩建释放与长协锁量', stageLabel: '产能释放', tone: 'normal', stability: 82, risk: 20, gap: '0%', cif: '$228/kgU', choke: '海陆双环运力充裕', summary: '纳米比亚湖山/罗辛矿释能，长协锁定 80% 刚性配额，现货采购占比大幅压降，保税储备动态回填。' },
    { year: 2028, title: '2028年', headline: '陆海双环冗余稳态格局形成', stageLabel: '稳态闭环', tone: 'normal', stability: 92, risk: 10, gap: '0%', cif: '$218/kgU', choke: '全链路抗毁度达标', summary: '形成“中亚陆运45% + 非洲海运55%”黄金配比，保税战略库存达24周，实现 0 非计划停堆。' }
  ]

  if (scenarioVm.value?.yearWindows?.length) {
    return scenarioVm.value.yearWindows.map((item, i) => {
      const fallback = defaultList[i] || defaultList[0]
      return {
        ...fallback,
        ...item,
        year: item.year || fallback.year,
        headline: item.headline || fallback.headline,
        stageLabel: item.stageLabel || fallback.stageLabel,
        tone: item.tone || fallback.tone,
        summary: item.summary || fallback.summary
      }
    })
  }
  return defaultList
})

const activeWindow = computed(() => {
  return scenarioYearWindows.value[activeWindowIndex.value] || scenarioYearWindows.value[0]
})

const activeWindowTagType = computed(() => {
  const tone = activeWindow.value?.tone
  if (tone === 'danger') return 'danger'
  if (tone === 'warning') return 'warning'
  return 'success'
})

const activeWindowGapText = computed(() => {
  return activeWindow.value?.gap || (activeWindowIndex.value === 2 ? '18.2%' : '4.5%')
})

const activeWindowCifText = computed(() => {
  return activeWindow.value?.cif || (activeWindowIndex.value === 2 ? '$298/kgU' : '$230/kgU')
})

const activeWindowChokePoint = computed(() => {
  return activeWindow.value?.choke || '黑海阻断与阿拉山口口岸挤兑'
})

const activeWindowNodes = computed(() => {
  if (activeWindowIndex.value === 2) return '阿拉山口口岸、圣彼得堡港、包头燃料元件厂、防城港保税库'
  if (activeWindowIndex.value === 3 || activeWindowIndex.value === 4) return '连云港接卸港、纳米比亚湖山矿、海阳/大亚湾核电厂'
  return '中哈阿拉山口口岸、包头燃料基地、大亚湾核电站'
})

function getWindowStability(win) {
  if (win.stability != null) return win.stability
  return win.tone === 'danger' ? 42 : win.tone === 'warning' ? 58 : 82
}

function getWindowRisk(win) {
  if (win.risk != null) return win.risk
  return win.tone === 'danger' ? 78 : win.tone === 'warning' ? 55 : 18
}

function toTagType(tone) {
  if (tone === 'danger') return 'danger'
  if (tone === 'warning') return 'warning'
  return 'info'
}

// 切换年份时，联动更新决策树
function selectYearWindow(idx) {
  activeWindowIndex.value = idx
  // 联动映射到决策树的时间节点与情景
  if (idx <= 1) {
    manualTimeIndex.value = idx
    manualScenarioKey.value = 'regionalDemandSurge'
  } else if (idx === 2) {
    manualTimeIndex.value = 1
    manualScenarioKey.value = 'rawShortage'
  } else if (idx <= 4) {
    manualTimeIndex.value = 1
    manualScenarioKey.value = 'logisticsCongestion'
  } else {
    manualTimeIndex.value = 2
    manualScenarioKey.value = 'rawShortage'
  }
}

// ================== 下半区决策树模型 ==================
const manualScenarioKey = ref('rawShortage')
const manualTimeIndex = ref(1)

const decisionVm = computed(() => buildUraniumDecisionTreeViewModel({
  experiment: effectiveExperiment.value,
  snapshot: snapshotStore.getActiveSnapshot(),
  manualScenarioKey: manualScenarioKey.value,
  manualTimeIndex: manualTimeIndex.value
}))

const activeTreeBranch = ref('controlled')
const baselineTreeChartRef = ref(null)
const controlledTreeChartRef = ref(null)
let baselineTreeChart = null
let controlledTreeChart = null

const nodePanel = reactive({ visible: false, node: null })

const baselineBranchTree = computed(() => {
  return decisionVm.value?.tree?.children?.find((item) => item.track === 'baseline') || null
})

const controlledBranchTree = computed(() => {
  return decisionVm.value?.controlledBranchTree || decisionVm.value?.tree?.children?.find((item) => item.track === 'controlled') || null
})

const treeContainerStyle = computed(() => ({
  minHeight: '440px',
  height: '440px'
}))

const baselineChartStyle = computed(() => ({
  width: '100%',
  height: '440px'
}))

const controlledChartStyle = computed(() => ({
  width: '100%',
  height: '440px'
}))

// 策略排行榜数据
const strategyRankList = computed(() => {
  if (decisionVm.value?.strategyDeck?.length) {
    const tripRisks = ['0.2% (极低)', '3.4% (受控)', '12.8% (高危)']
    const tagTypes = ['success', 'warning', 'danger']
    return decisionVm.value.strategyDeck.map((st, idx) => ({
      id: st.id,
      name: st.title || st.name,
      score: st.score || (idx === 0 ? 91.5 : idx === 1 ? 79.0 : 61.2),
      improvement: st.improvement != null ? Math.round(st.improvement * 10) / 10 : (idx === 0 ? 23.5 : idx === 1 ? 11.0 : -6.8),
      fulfillmentRate: st.successProbability || (idx === 0 ? 98.2 : idx === 1 ? 91.5 : 82.0),
      tripRisk: tripRisks[idx % tripRisks.length],
      tagType: tagTypes[idx % tagTypes.length]
    }))
  }
  return [
    {
      id: 'controlled-opt-1',
      name: '跨里海多式联运绕行 + 防城港保税库应急借调平准',
      score: 91.5,
      improvement: 23.5,
      fulfillmentRate: 98.2,
      tripRisk: '0.2% (极低)',
      tagType: 'success'
    },
    {
      id: 'controlled-opt-2',
      name: '国际现货市场紧急采购补库 + 纳米比亚海运提速',
      score: 79.0,
      improvement: 11.0,
      fulfillmentRate: 91.5,
      tripRisk: '3.4% (受控)',
      tagType: 'warning'
    },
    {
      id: 'controlled-opt-3',
      name: '国内核电机组降负荷运行 + 延长换料大修窗口',
      score: 61.2,
      improvement: -6.8,
      fulfillmentRate: 82.0,
      tripRisk: '12.8% (高危)',
      tagType: 'danger'
    }
  ]
})

// 落地可行性前置清单（会议纪要核心落地诉求）
const feasibilityChecklist = ref([
  {
    id: 'check-1',
    title: '7类放射性专用车皮运力调度批文',
    category: '运输监管许可',
    status: 'pass',
    tagType: 'success',
    desc: '跨国危化品专列需中铁集装箱调度中心与哈铁运力协同调度，已锁定2列专项车皮。',
    authority: '中国国家铁路集团 / 哈萨克斯坦国家铁路 (KTZ)'
  },
  {
    id: 'check-2',
    title: '两用物项最终用户与过境免税通关',
    category: '外贸过境合规',
    status: 'pass',
    tagType: 'success',
    desc: '天然铀属于核两用物项，已取得阿塞拜疆、格鲁吉亚两国过境安全免检通道许可。',
    authority: '商务部配额许可证事务局 / 海关总署两用物项清关'
  },
  {
    id: 'check-3',
    title: '国家战略铀矿储备平准借贷协议',
    category: '储备资产动用',
    status: 'pass',
    tagType: 'success',
    desc: '从防城港国家战略储备库借调300tU现货，承诺18个月内以海外进口现货原数平准归还。',
    authority: '国家能源局 / 国家战略物资储备局 / 中核集团'
  },
  {
    id: 'check-4',
    title: '跨境结算多币种汇率锁汇风险对冲',
    category: '金融与外汇',
    status: 'pass',
    tagType: 'success',
    desc: '采用中哈本币互换协议与中行远期锁汇期权，锁定USD/CNY及KZT汇率敞口，规避汇率波动。',
    authority: '中国银行跨境结算部 / 国家外汇管理局'
  }
])

// 具体化落地执行调度令
const currentDispatchOrder = computed(() => {
  if (activeWindowIndex.value === 2) {
    return {
      primaryAction: '启动跨里海走廊紧急换线调度，下达防城港保税库平准借调令',
      allocatedVolume: '跨里海发运 500 tU + 防城港保税库应急动用 300 tU',
      corridor: '阿克套港（哈）→ 巴库港（阿）→ 连云港海铁联运',
      bufferAction: '包头燃料基地库存由 14 周拉升至 22 周安全基准'
    }
  }
  if (activeWindowIndex.value <= 1) {
    return {
      primaryAction: '下达阿拉山口 Class 7 专列扩容调度令，统筹包头与宜宾两大燃料基地滚动排产',
      allocatedVolume: '增配专列车皮 2 列，增运 600 tU，两基地排产 1,800 tU',
      corridor: '中哈铁路阿拉山口口岸直通专线 + 南北两基地铁路联运',
      bufferAction: '在役核电机组安全库存由 180 天提升至 210 天'
    }
  }
  if (activeWindowIndex.value <= 4) {
    return {
      primaryAction: '下达纳米比亚湖山矿远洋提速起运令，沿海港口分流接卸',
      allocatedVolume: '湖山矿提前 20 天装船起运 1,000 tU，防城港保税库借调 300 tU',
      corridor: '非洲鲸湾港 → 连云港 / 防城港海运专船直航',
      bufferAction: '平抑完全到岸成本，对冲国际现货市场 +40% 溢价'
    }
  }
  return {
    primaryAction: '常态多源长协与双通道稳态运行，固化中哈跨境绿色通道',
    allocatedVolume: '中哈陆运 1,680 tU/年 + 非洲海运 1,200 tU/年 刚性履约',
    corridor: '阿拉山口陆路 (70%) + 连云港海运 (30%) 双通道互为冗余',
    bufferAction: '防城港保税战略储备库充实至 24 周安全库存水平'
  }
})

// 抽屉详情
const nodeReasoningDetails = computed(() => {
  const node = nodePanel.node
  if (!node || node.isLeaf) return null
  return node.reasoning || uraniumDecisionReasoning(node.action || node.name, node.desc || '')
})

function switchTreeBranch(branch) {
  activeTreeBranch.value = branch
  nextTick(() => {
    if (branch === 'baseline' && baselineTreeChart) {
      baselineTreeChart.resize()
    } else if (branch === 'controlled' && controlledTreeChart) {
      controlledTreeChart.resize()
    }
  })
}

function refreshDecisionTree() {
  initBranchCharts(true)
}

function locateStrategyNode(nodeId) {
  activeTreeBranch.value = 'controlled'
  const target = findNodeById(controlledBranchTree.value, nodeId) || controlledBranchTree.value
  if (target) {
    nodePanel.node = target
    nodePanel.visible = true
  }
}

function goToSimulationTheatre(mode = 'replay') {
  router.push({
    path: '/home/SCnet/interface',
    query: {
      scenario: 'uranium',
      view: 'simulation',
      theaterMode: mode
    }
  })
}

function goToPrevAnalysis() {
  router.push({
    path: '/home/SCnet/expAnalysisGameTheory',
    query: {
      ...route.query,
      scenario: 'uranium'
    }
  })
}

function goToDecisionGeneration() {
  router.push({
    path: '/home/SCnet/decisionGeneration',
    query: {
      ...route.query,
      scenario: 'uranium'
    }
  })
}

// ================== ECharts 树图构建 ==================
function toEcNode(node, compact = false) {
  if (!node) return null
  const isRoot = node.depth === 0
  const isLeaf = node.isLeaf || !node.children?.length
  let color = '#e0edff', border = '#4f8cf6', shadow = 'rgba(79, 140, 246, 0.24)'
  if (isRoot) {
    color = '#f3e8ff'; border = '#9333ea'; shadow = 'rgba(147, 51, 234, 0.28)'
  } else if (!isLeaf && node.track === 'baseline') {
    color = '#fff1f2'; border = '#fb7185'
  } else if (!isLeaf && node.track === 'controlled') {
    color = '#ecfdf5'; border = '#22c55e'
  } else if (isLeaf) {
    const s = node.outcome?.score || 0
    if (s >= 80) { color = '#dcfce7'; border = '#10b981'; shadow = 'rgba(16,185,129,0.24)' }
    else if (s >= 70) { color = '#ffedd5'; border = '#f59e0b'; shadow = 'rgba(245,158,11,0.24)' }
    else { color = '#fee2e2'; border = '#ef4444'; shadow = 'rgba(239,68,68,0.24)' }
  }

  const title = node.name || node.action || '节点'
  const scoreText = node.outcome?.score ? `${node.outcome.score}分` : ''
  const subtitle = isRoot ? '情景起点' : (isLeaf ? '成效叶子' : '调控策略')

  return {
    name: node.name || node.action,
    _raw: node,
    symbol: 'roundRect',
    symbolSize: isRoot ? [160, 56] : isLeaf ? [136, 52] : [148, 54],
    itemStyle: {
      color,
      borderColor: border,
      borderWidth: isRoot ? 2.5 : 1.8,
      borderRadius: 12,
      shadowBlur: 3,
      shadowOffsetY: 2,
      shadowColor: shadow
    },
    label: {
      lineHeight: 16,
      rich: {
        title: { color: '#0f172a', fontSize: isRoot ? 12 : 11, fontWeight: 700, lineHeight: 16 },
        sub: { color: '#64748b', fontSize: 9.5, fontWeight: 500, lineHeight: 13 },
        score: { color: '#0f172a', fontSize: 10, fontWeight: 700, lineHeight: 14 }
      },
      formatter(p) {
        const raw = p.data?._raw
        if (!raw) return p.name
        if (raw.isLeaf && raw.outcome?.score && raw.track !== 'baseline') {
          return `{title|${title}}\n{score|${scoreText}}`
        }
        return `{title|${title}}\n{sub|${subtitle}}`
      }
    },
    children: isLeaf ? [] : node.children.map((c) => toEcNode(c, compact))
  }
}

function findNodeById(node, targetId) {
  if (!node || !targetId) return null
  if (node.id === targetId) return node
  if (!node.children?.length) return null
  for (const child of node.children) {
    const matched = findNodeById(child, targetId)
    if (matched) return matched
  }
  return null
}

function renderTree(chart, branchTree) {
  if (!chart || !branchTree) return
  const ecRoot = toEcNode(branchTree)
  chart.setOption({
    backgroundColor: '#ffffff',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: '#1e293b',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12, lineHeight: 18 },
      padding: 10,
      formatter(params) {
        const raw = params.data?._raw
        if (!raw) return ''
        const probability = raw.prob < 1 ? `<br/>分支概率：${Math.round(raw.prob * 100)}%` : ''
        const score = raw.outcome?.score && raw.track !== 'baseline' ? `<br/>对策评分：${raw.outcome.score} 分` : ''
        return `<b style="font-size:13px;color:#f8fafc;">${raw.action || raw.name}</b><br/><span style="color:#cbd5e1;">${raw.desc || ''}</span>${probability}${score}`
      }
    },
    series: [{
      type: 'tree',
      data: [ecRoot],
      top: 40,
      left: 100,
      bottom: 40,
      right: 90,
      orient: 'LR',
      roam: true,
      scaleLimit: { min: 0.65, max: 1.8 },
      initialTreeDepth: -1,
      edgeShape: 'curve',
      edgeForkPosition: '60%',
      symbol: 'roundRect',
      lineStyle: {
        color: branchTree.track === 'baseline' ? '#fda4af' : '#86efac',
        width: 1.8,
        curveness: 0.5
      },
      emphasis: {
        focus: 'descendant',
        itemStyle: { borderWidth: 3, shadowBlur: 8 }
      },
      animationDuration: 400
    }]
  })
}

function bindTreeClick(chart) {
  chart.on('click', (params) => {
    if (!params.data?._raw) return
    nodePanel.node = params.data._raw
    nodePanel.visible = true
  })
}

function initBranchCharts(force = false) {
  if (force) {
    if (baselineTreeChart) { baselineTreeChart.dispose(); baselineTreeChart = null }
    if (controlledTreeChart) { controlledTreeChart.dispose(); controlledTreeChart = null }
  }

  nextTick(() => {
    if (baselineTreeChartRef.value && baselineBranchTree.value) {
      const el = baselineTreeChartRef.value
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        if (!baselineTreeChart) {
          baselineTreeChart = echarts.init(el)
          bindTreeClick(baselineTreeChart)
        }
        renderTree(baselineTreeChart, baselineBranchTree.value)
      }
    }

    if (controlledTreeChartRef.value && controlledBranchTree.value) {
      const el = controlledTreeChartRef.value
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        if (!controlledTreeChart) {
          controlledTreeChart = echarts.init(el)
          bindTreeClick(controlledTreeChart)
        }
        renderTree(controlledTreeChart, controlledBranchTree.value)
      }
    }
  })
}

function handleResize() {
  if (baselineTreeChart) baselineTreeChart.resize()
  if (controlledTreeChart) controlledTreeChart.resize()
}

watch(
  () => [
    viewMode.value,
    baselineBranchTree.value?.id,
    controlledBranchTree.value?.id,
    activeTreeBranch.value
  ],
  () => {
    if (viewMode.value !== 'cascade') return
    nextTick(() => initBranchCharts())
  }
)

onMounted(() => {
  window.addEventListener('resize', handleResize)
  if (viewMode.value === 'cascade') {
    nextTick(() => initBranchCharts())
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (baselineTreeChart) { baselineTreeChart.dispose(); baselineTreeChart = null }
  if (controlledTreeChart) { controlledTreeChart.dispose(); controlledTreeChart = null }
})
</script>

<style scoped>
.strategy-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 24px 36px;
  min-height: 100vh;
}

/* ================== 顶层统一 Hero ================== */
.strategy-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 18px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92));
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  color: #f8fafc;
}
.strategy-hero-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.strategy-hero-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #38bdf8;
}
.strategy-hero-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.02em;
}
.strategy-hero-sub {
  margin: 0;
  font-size: 12.5px;
  color: #94a3b8;
  line-height: 1.5;
  max-width: 820px;
}
.view-mode-toggle-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.6);
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.view-mode-label {
  font-size: 12px;
  color: #cbd5e1;
  white-space: nowrap;
}
.seg-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
}

/* ================== 联合全景布局 ================== */
.cascade-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 策略分析核心逻辑看板样式 */
.strategy-narrative-strip {
  padding: 14px 18px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}
.narrative-strip-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}
.narrative-step-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  background: #dcfce7;
  color: #15803d;
  white-space: nowrap;
}
.narrative-title-box h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}
.narrative-title-box p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #475569;
}
.narrative-two-halves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.half-role-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.half-role-card.upper {
  border-left: 3px solid #3b82f6;
  background: #f0f7ff;
}
.half-role-card.lower {
  border-left: 3px solid #10b981;
  background: #f0fdf4;
}
.half-role-badge {
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
}
.half-role-card.lower .half-role-badge {
  color: #15803d;
}
.half-role-card strong {
  font-size: 12.5px;
  color: #0f172a;
}
.half-role-card p {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: #475569;
  line-height: 1.45;
}

.glass-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}
.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.analysis-column-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}
.section-title-wrap h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.section-title-wrap p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}
.section-head-tags {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tree-canvas-hint {
  font-size: 11px;
  color: #94a3b8;
}

/* ================== 水平横向紧凑型 2024–2030 年份情景卡片条 ================== */
.year-ribbon {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.year-ribbon-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 110px;
}
.year-ribbon-card:hover {
  border-color: #3b82f6;
  background: #f0f7ff;
  transform: translateY(-2px);
}
.year-ribbon-card.active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}
.year-ribbon-card.danger.active {
  border-color: #ef4444;
  background: #fef2f2;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}
.ribbon-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.ribbon-year {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.ribbon-headline {
  font-size: 11.5px;
  font-weight: 600;
  color: #334155;
  line-height: 1.3;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ribbon-progress-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
}
.progress-lbl {
  font-size: 10px;
  color: #64748b;
  display: block;
}
.progress-lbl.risk {
  color: #e11d48;
}
.ribbon-card-footer {
  font-size: 10px;
  color: #64748b;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ribbon-active-indicator {
  color: #2563eb;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* 选定年份影响画像 3+1 分栏 */
.scenario-impact-grid {
  display: grid;
  grid-template-columns: 180px 180px 220px minmax(0, 1fr);
  gap: 12px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.impact-kpi-card {
  padding: 10px 14px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.impact-kpi-card.danger { border-left: 3px solid #ef4444; }
.impact-kpi-card.warning { border-left: 3px solid #f59e0b; }
.impact-kpi-card.info { border-left: 3px solid #3b82f6; }
.impact-kpi-label { font-size: 11px; color: #64748b; }
.impact-kpi-val { font-size: 15px; font-weight: 700; color: #0f172a; margin: 2px 0; }
.impact-kpi-hint { font-size: 10px; color: #94a3b8; }

.impact-narrative-card {
  padding: 10px 14px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.narrative-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}
.narrative-text {
  margin: 4px 0;
  font-size: 12px;
  color: #334155;
  line-height: 1.4;
}
.narrative-tags {
  font-size: 11px;
  color: #64748b;
}

/* ================== 级联过渡纽带 ================== */
.cascade-bridge-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
  border: 1px solid #38bdf840;
  box-shadow: 0 4px 16px rgba(56, 189, 248, 0.08);
  color: #f8fafc;
}
.bridge-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bridge-pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 10px #38bdf8;
  animation: pulse-dot 2s infinite ease-in-out;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.15); }
}
.bridge-text strong {
  display: block;
  font-size: 13px;
  color: #38bdf8;
}
.bridge-text p {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: #cbd5e1;
}
.bridge-center-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bridge-param-pill {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
}
.bridge-right-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.branch-toggle-group {
  display: flex;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  overflow: hidden;
}
.branch-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 11.5px;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.branch-toggle-btn.active {
  background: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

/* ================== 下半区决策树与方案优选 ================== */
.decision-layout-grid {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: 16px;
}

.tree-canvas-panel {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
  display: flex;
  flex-direction: column;
}
.tree-canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}
.tree-legend-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #475569;
}
.legend-pill .dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}
.legend-pill.root .dot { background: #9333ea; }
.legend-pill.decision .dot { background: #22c55e; }
.legend-pill.chance .dot { background: #3b82f6; }
.legend-pill.leaf .dot { background: #f59e0b; }
.tree-tip {
  font-size: 11px;
  color: #94a3b8;
}
.tree-chart-container {
  width: 100%;
  position: relative;
}
.tree-chart {
  width: 100%;
}

/* 右栏策略与落地 */
.strategy-action-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sub-panel {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
}
.sub-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}
.sub-head-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

/* 策略排行榜 */
.strategy-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.strategy-rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
}
.strategy-rank-item:hover {
  background: #f0f7ff;
  border-color: #3b82f6;
}
.strategy-rank-item.isBest {
  background: #ecfdf5;
  border-color: #10b981;
}
.st-rank-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  background: #94a3b8;
}
.st-rank-badge.rank-1 { background: #f59e0b; }
.st-rank-badge.rank-2 { background: #3b82f6; }
.st-rank-badge.rank-3 { background: #64748b; }
.st-main-info {
  flex: 1;
  min-width: 0;
}
.st-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}
.st-title {
  font-size: 12px;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-score-tag {
  font-size: 12px;
  font-weight: 700;
  color: #10b981;
}
.st-metric-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 10.5px;
  color: #64748b;
}
.text-success { color: #10b981; }
.text-danger { color: #ef4444; }
.text-safe { color: #15803d; }

/* 落地可行性前置核验 */
.checklist-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.checklist-item {
  padding: 8px 10px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.checklist-item.pass {
  border-left: 3px solid #10b981;
}
.checklist-item-head {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
}
.checklist-item-head strong {
  font-size: 11px;
  color: #0f172a;
  flex: 1;
}
.check-icon {
  color: #10b981;
  font-size: 13px;
}
.checklist-item-desc {
  margin: 0 0 4px;
  font-size: 10px;
  color: #475569;
  line-height: 1.35;
}
.checklist-authority {
  font-size: 9.5px;
  color: #94a3b8;
}

/* 调度令卡片 */
.dispatch-order-card {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.dispatch-no {
  font-size: 10.5px;
  color: #64748b;
  font-family: monospace;
}
.dispatch-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  margin-bottom: 8px;
}
.dispatch-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.dispatch-label {
  color: #64748b;
  width: 70px;
  flex-shrink: 0;
}
.dispatch-val {
  color: #1e293b;
  flex: 1;
}
.dispatch-val.highlight {
  color: #2563eb;
  font-weight: 600;
}
.dispatch-footer {
  display: flex;
  justify-content: flex-end;
}

/* ================== 侧边推理抽屉 ================== */
.reasoning-drawer :deep(.el-drawer__body) {
  padding: 0;
  background: #f8fafc;
}
.drawer-header {
  padding: 14px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.drawer-header-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.drawer-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.drawer-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.drawer-card {
  padding: 12px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.drawer-card-title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}
.drawer-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 4px;
}
.drawer-label { color: #64748b; }
.drawer-desc {
  margin: 8px 0 0;
  font-size: 11.5px;
  color: #475569;
  line-height: 1.45;
}
.thinking-steps {
  margin-top: 6px;
}
.thinking-steps :deep(.el-step__description) {
  font-size: 11px;
  color: #475569;
}
.source-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.source-item {
  padding: 6px 8px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
}
.source-item-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.source-name {
  font-size: 11px;
  color: #1e293b;
}
.source-snippet {
  margin: 0;
  font-size: 10px;
  color: #64748b;
  line-height: 1.35;
}
.leaf-score-box {
  display: flex;
  justify-content: space-around;
  padding: 8px;
  background: #f0fdf4;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
  margin-bottom: 8px;
}
.leaf-score-item {
  text-align: center;
}
.leaf-score-item span {
  display: block;
  font-size: 10px;
  color: #64748b;
}
.leaf-score-item strong {
  font-size: 14px;
  color: #0f172a;
}
.leaf-situation-text {
  margin: 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.4;
}

/* 响应式适配 */
@media (max-width: 1440px) {
  .decision-layout-grid {
    grid-template-columns: 1fr;
  }
  .year-ribbon {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
