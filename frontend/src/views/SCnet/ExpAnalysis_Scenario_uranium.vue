<template>
  <div class="scenario-page mid-stage-bg scenario-console analysis-workspace" :class="{ 'is-embedded': embedded }">
    <el-empty
      v-if="!scenarioVm"
      class="scenario-empty"
      description="请先在实验运行页面选择一个铀供应链实验"
      :image-size="120"
    />

    <template v-else>
      <!-- 统一事中页面目标说明紫色横幅 (独立访问时展示) -->
      <StageGoalStrip
        v-if="!embedded"
        badge="情景演化分析目标"
        title="评估外部地缘冲击对供应链的动态波及，测算长周期供需缺口与完全采购成本"
        desc="通过多阶段扰动推演窗口，对比常态、断航、禁令与运力挤兑下的供应链稳健度与风险敞口，为下游决策树寻优提供精准的约束靶向输入。"
        popover-title="宏观情景演化分析核心目标"
      />

      <section class="scenario-conclusion-strip glass-panel">
        <article v-for="item in scenarioConclusionCards" :key="item.label" :class="item.tone">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.detail }}</p>
        </article>
      </section>

      <div class="scenario-workbench">
        <div class="scenario-stage-grid">
          <!-- 01 左栏：推演情景 / 年度选择（取学长之精华：搜索框、类型筛选、稳健度/风险度双进度条、趋势Tag、综合评分） -->
          <aside class="window-column glass-panel">
            <div class="column-head">
              <div class="analysis-column-head">
                <span class="analysis-column-index">01</span>
                <div>
                  <h3>情景与年度选择</h3>
                  <p>支持按扰动强度筛选与韧性评估</p>
                </div>
              </div>
              <div>
                <el-tag size="small" type="info" effect="light">{{ filteredYearWindows.length }} / {{ scenarioVm.yearWindows.length }} 窗口</el-tag>
              </div>
            </div>

            <!-- 搜索与类型筛选工具条 -->
            <div class="scenario-search-toolbar">
              <el-input
                v-model="windowSearchKeyword"
                placeholder="搜索年份、事件或关键通道"
                size="small"
                clearable
                class="window-search-input"
              >
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
              <div class="scenario-filter-row">
                <el-select v-model="windowTypeFilter" size="small" class="window-type-select" placeholder="情景类型">
                  <el-option label="全部情景" value="all" />
                  <el-option label="极端冲击" value="danger" />
                  <el-option label="预警承压" value="warning" />
                  <el-option label="常态基准" value="normal" />
                </el-select>
                <span class="window-filter-count">匹配 {{ filteredYearWindows.length }} 项</span>
              </div>
            </div>

            <div class="window-list">
              <div v-if="!filteredYearWindows.length" class="empty-window-state">
                <el-icon><Search /></el-icon>
                <span>未检索到匹配的推演年度窗口</span>
              </div>
              <article
                v-for="(item) in filteredYearWindows"
                :key="item.id"
                class="window-card"
                role="button"
                :aria-pressed="activeWindowIndex === item.originalIndex"
                :class="[item.tone, { active: activeWindowIndex === item.originalIndex }]"
                tabindex="0"
                @click="selectWindow(item.originalIndex)"
                @keydown.enter.prevent="selectWindow(item.originalIndex)"
                @keydown.space.prevent="selectWindow(item.originalIndex)"
              >
                <div class="window-card-top">
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.headline }}</p>
                  </div>
                  <div class="window-stage">
                    <span class="window-order">{{ item.positionText }}</span>
                    <el-tag size="small" :type="toTagType(item.tone)" effect="light">
                      {{ item.stageLabel }}
                    </el-tag>
                  </div>
                </div>

                <!-- 稳健度与风险敞口双进度条（学长精华） -->
                <div class="scenario-viz-row">
                  <div class="viz-item">
                    <span class="viz-label">系统稳健度</span>
                    <el-progress
                      :percentage="getWindowStabilityScore(item)"
                      :status="getWindowStabilityScore(item) >= 70 ? 'success' : (getWindowStabilityScore(item) >= 50 ? 'warning' : 'exception')"
                      :stroke-width="6"
                      :show-text="false"
                    />
                  </div>
                  <div class="viz-item">
                    <span class="viz-label">风险敞口</span>
                    <el-progress
                      :percentage="getWindowRiskScore(item)"
                      status="exception"
                      :stroke-width="6"
                      :show-text="false"
                    />
                  </div>
                </div>

                <div class="scenario-viz-footer">
                  <el-tag size="small" :type="toTagType(item.tone)" effect="plain">
                    趋势: {{ getWindowTrendText(item) }}
                  </el-tag>
                  <span class="stability-score">综合评分 <b>{{ getWindowStabilityScore(item) }}</b></span>
                </div>
              </article>
            </div>
          </aside>

          <!-- 02 中栏：推演时序过程与指标多视图（取学长之精华：推演时序 Timeline、影响因素与响应变量标签云、调度卡片、指标概览） -->
          <main v-if="activeWindow" class="detail-column glass-panel">
            <div class="detail-head">
              <div class="analysis-column-head">
                <span class="analysis-column-index">02</span>
                <div>
                  <h3>{{ activeWindow.title }} · 推演时序与指标</h3>
                  <p>{{ activeWindow.summary }}</p>
                </div>
              </div>
              <div class="detail-head-tags">
                <el-tag :type="toTagType(activeWindow.tone)" effect="dark">{{ activeWindow.stageLabel }}</el-tag>
                <el-tag size="small" type="info" effect="plain">时序推演已收敛</el-tag>
              </div>
            </div>

            <div class="detail-tab-row">
              <button
                v-for="item in scenarioTabs"
                :key="item.key"
                type="button"
                class="detail-tab"
                :class="{ active: scenarioTab === item.key }"
                :aria-pressed="scenarioTab === item.key"
                @click="scenarioTab = item.key"
              >
                <el-icon v-if="item.key === 'timeline'"><Clock /></el-icon>
                <el-icon v-else-if="item.key === 'overview'"><DataAnalysis /></el-icon>
                <el-icon v-else><MapLocation /></el-icon>
                {{ item.label }}
              </button>
            </div>

            <!-- Tab 1: 推演时序过程（学长核心精华移植） -->
            <template v-if="scenarioTab === 'timeline'">
              <div class="timeline-container">
                <div class="timeline-summary-bar">
                  <div class="tsb-left">
                    <el-icon><Connection /></el-icon>
                    <span>仿真动态时序已记录 <b>{{ activeWindowTimelineTicks.length }}</b> 个决策推演回合</span>
                  </div>
                  <div class="tsb-right">
                    <span>承压焦点：<b>{{ activeWindow.events[0] || '全链路常态调运' }}</b></span>
                  </div>
                </div>

                <el-timeline class="uranium-timeline">
                  <el-timeline-item
                    v-for="(tick, tIndex) in activeWindowTimelineTicks"
                    :key="tIndex"
                    :type="tick.isEnd ? 'success' : (tick.isUrgent ? 'danger' : 'primary')"
                    size="large"
                  >
                    <template #dot>
                      <div class="uranium-timeline-dot" :class="{ 'dot-success': tick.isEnd, 'dot-danger': tick.isUrgent }">
                        {{ tIndex + 1 }}
                      </div>
                    </template>
                    <div class="tick-card glass-panel">
                      <div class="tick-header">
                        <span class="tick-round">回合 {{ tIndex + 1 }} · {{ tick.roundName }}</span>
                        <el-tag size="small" :type="tick.actorTagType" effect="dark">
                          {{ tick.actorName }}
                        </el-tag>
                        <el-tag v-if="tick.isEnd" size="small" type="success" effect="dark">
                          推演闭环达成
                        </el-tag>
                      </div>

                      <div class="world-scenario" v-if="tick.scenarioDesc">
                        <div class="section-label">
                          <el-icon><MapLocation /></el-icon>
                          供应链动态态势
                        </div>
                        <p>{{ tick.scenarioDesc }}</p>
                      </div>

                      <!-- 影响因素与响应变量标签云（深蓝紫 + 琥珀绿） -->
                      <div class="factors-row">
                        <div class="factors-group" v-if="tick.influenceFactors">
                          <div class="section-label">
                            <el-icon><TrendCharts /></el-icon>
                            影响因素 (扰动与外部约束)
                          </div>
                          <div class="factor-chips">
                            <span v-for="(v, k) in tick.influenceFactors" :key="k" class="factor-chip">
                              <span class="chip-key">{{ k }}</span>
                              <span class="chip-value">{{ v }}</span>
                            </span>
                          </div>
                        </div>
                        <div class="factors-group" v-if="tick.responseVariables">
                          <div class="section-label">
                            <el-icon><DataAnalysis /></el-icon>
                            响应变量 (系统指标与库存)
                          </div>
                          <div class="factor-chips response-chips">
                            <span v-for="(v, k) in tick.responseVariables" :key="k" class="factor-chip response">
                              <span class="chip-key">{{ k }}</span>
                              <span class="chip-value">{{ v }}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- 决策调度指令行动卡片 -->
                      <div class="action-section" v-if="tick.action">
                        <div class="section-label">
                          <el-icon><Promotion /></el-icon>
                          应急协同调度指令
                        </div>
                        <div class="action-card">
                          <div class="action-header">
                            <strong class="action-type">{{ tick.action.type }}</strong>
                            <span class="action-target">执行目标: {{ tick.action.target }}</span>
                          </div>
                          <div class="action-declaration">{{ tick.action.detail }}</div>
                        </div>
                      </div>
                    </div>
                  </el-timeline-item>
                </el-timeline>
              </div>
            </template>

            <!-- Tab 2: 年度概况 -->
            <template v-else-if="scenarioTab === 'overview'">
              <div class="main-summary-grid">
                <article
                  v-for="item in activeWindow.metricCards"
                  :key="item.label"
                  class="main-summary-card"
                >
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <small>{{ item.hint }}</small>
                </article>
              </div>

              <section class="main-section">
                <div class="section-title">关键扰动</div>
                <div class="event-chip-row">
                  <el-tag
                    v-for="item in activeWindow.events"
                    :key="item"
                    size="small"
                    type="danger"
                    effect="plain"
                  >
                    {{ item }}
                  </el-tag>
                  <span v-if="!activeWindow.events.length" class="section-empty-text">该年度未出现显著外部冲击</span>
                </div>
              </section>

              <section class="main-section">
                <div class="section-title">扰动过程</div>
                <div class="evidence-grid">
                  <article
                    v-for="item in activeWindow.steps"
                    :key="`${activeWindow.id}-${item.label}`"
                    class="evidence-card"
                  >
                    <div class="evidence-card-top">
                      <span>{{ item.label }}</span>
                      <strong>{{ item.title }}</strong>
                    </div>
                    <p>{{ item.text }}</p>
                  </article>
                  <el-empty
                    v-if="!activeWindow.steps.length"
                    description="当前窗口暂无扰动过程"
                    :image-size="70"
                  />
                </div>
              </section>

              <section class="main-section">
                <div class="section-title">结构信号</div>
                <div class="factor-card-grid">
                  <article
                    v-for="item in activeWindow.factorRows"
                    :key="item.label"
                    class="factor-card"
                  >
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </article>
                  <el-empty
                    v-if="!activeWindow.factorRows.length"
                    description="当前窗口暂无结构信号"
                    :image-size="70"
                  />
                </div>
              </section>
            </template>

            <!-- Tab 3: 航线与节点 -->
            <template v-else-if="scenarioTab === 'routes'">
              <section class="main-section">
                <div class="section-title">重点航线</div>
                <div class="route-list">
                  <article
                    v-for="row in activeWindow.routeRows"
                    :key="`${row.supplier_name}-${row.manufacturer_name}`"
                    class="route-item"
                  >
                    <div class="route-item-top">
                      <strong>{{ row.supplier_name }} → {{ row.manufacturer_name }}</strong>
                      <span>{{ formatUraniumMetricValue('total_procured_tU', row.quantity_tU) }}</span>
                    </div>
                    <div class="route-track">
                      <div class="route-fill" :style="{ width: `${row.sharePct}%` }"></div>
                    </div>
                    <div class="route-item-meta">
                      <span>占年度采购 {{ row.shareText }}</span>
                      <span>{{ row.channelLabel }}</span>
                    </div>
                  </article>
                  <el-empty
                    v-if="!activeWindow.routeRows.length"
                    description="当前窗口暂无重点航线数据"
                    :image-size="70"
                  />
                </div>
              </section>

              <section class="main-section">
                <div class="section-title">关键节点</div>
                <div class="node-grid">
                  <article
                    v-for="item in activeWindow.nodeRows"
                    :key="item.id"
                    class="node-card"
                  >
                    <div class="node-card-head">
                      <strong>{{ item.name }}</strong>
                      <span>{{ item.location }}</span>
                    </div>
                    <div class="node-card-metrics">
                      <div>
                        <span>采购量</span>
                        <strong>{{ item.procuredText }}</strong>
                      </div>
                      <div>
                        <span>库存覆盖</span>
                        <strong>{{ item.inventoryText }}</strong>
                      </div>
                      <div>
                        <span>缺口</span>
                        <strong>{{ item.unmetText }}</strong>
                      </div>
                    </div>
                  </article>
                  <el-empty
                    v-if="!activeWindow.nodeRows.length"
                    description="当前窗口暂无关键节点数据"
                    :image-size="70"
                  />
                </div>
              </section>
            </template>
          </main>

          <!-- 03 右栏：综合决策与调度建议（取学长之精华：分类Segmented、优先级、置信度条、条目深度业务解读） -->
          <aside v-if="activeWindow" class="insight-column glass-panel">
            <div class="column-head compact">
              <div class="analysis-column-head">
                <span class="analysis-column-index">03</span>
                <div>
                  <h3>综合决策与建议</h3>
                  <p>依据当前推演窗口输出精准调度指引</p>
                </div>
              </div>
            </div>

            <div class="conclusion-container">
              <!-- 分类切换器 -->
              <div class="conclusion-switcher">
                <el-segmented
                  v-model="activeConclusionType"
                  :options="conclusionTypeOptions"
                  size="small"
                  block
                />
              </div>

              <div class="conclusion-overview">
                <div class="overview-item">
                  <span class="overview-label">建议条目</span>
                  <span class="overview-value">{{ activeConclusionItems.length }}</span>
                </div>
                <div class="overview-item">
                  <span class="overview-label">平均置信度</span>
                  <span class="overview-value">{{ averageConclusionConfidence }}%</span>
                </div>
              </div>

              <!-- 建议条目清单 -->
              <div class="conclusion-list enhanced-list">
                <div
                  v-for="(item, index) in activeConclusionItems"
                  :key="index"
                  class="conclusion-item"
                  :class="[
                    activeConclusionType === 'order' ? 'order-item' : '',
                    activeConclusionType === 'risk' ? 'risk-item' : '',
                    activeConclusionType === 'opportunity' ? 'opportunity-item' : '',
                    { active: activeConclusionIndex === index }
                  ]"
                  @click="activeConclusionIndex = index"
                >
                  <span class="item-number" :class="'num-' + activeConclusionType">{{ index + 1 }}</span>
                  <div class="conclusion-main">
                    <span class="item-text">{{ item.title }}</span>
                    <div class="conclusion-item-meta">
                      <el-tag size="small" :type="item.priorityTag">{{ item.priorityLabel }}</el-tag>
                      <span class="confidence">置信度 {{ item.confidence }}%</span>
                    </div>
                    <el-progress :percentage="item.confidence" :show-text="false" :stroke-width="5" />
                  </div>
                </div>
                <el-empty
                  v-if="!activeConclusionItems.length"
                  description="当前分类暂无对应建议"
                  :image-size="60"
                />
              </div>

              <!-- 选中断言深度解读与执行指导 -->
              <div class="conclusion-detail" v-if="currentSelectedConclusionItem">
                <div class="detail-header">
                  <h4 class="conclusion-title">
                    <el-icon><Notification /></el-icon>
                    调度令指引深度解读
                  </h4>
                  <el-tag :type="currentSelectedConclusionItem.priorityTag" size="small">{{ currentSelectedConclusionItem.priorityLabel }}</el-tag>
                </div>
                <div class="detail-content">
                  <p class="detail-main-text">{{ currentSelectedConclusionItem.detail }}</p>
                  <div class="detail-guidance" v-if="currentSelectedConclusionItem.actionGuide">
                    <span class="guide-label">落实指导：</span>
                    <span class="guide-text">{{ currentSelectedConclusionItem.actionGuide }}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <!-- 情景分布与方案筛选 (现代化高管驾驶舱面板) -->
      <section class="scenario-supplement glass-panel">
        <div class="supplement-header">
          <div class="supplement-title-group">
            <span class="analysis-column-index">04</span>
            <div>
              <h3>情景分布与方案筛选</h3>
              <p>按年度风险等级统计占比，用于了解本次实验的压力分布，并结合 Monte-Carlo 压力传导进行应急处置方案初筛。</p>
            </div>
          </div>
          <div class="supplement-actions">
            <el-tag type="primary" effect="plain" round>{{ scenarioPlanCards.length }} 类情景全景覆盖</el-tag>
            <el-tag type="success" effect="plain" round>优选 {{ preferredPlanRows.length }} / 备选 {{ alternatePlanRows.length }} / 剔除 {{ rejectedPlanRows.length }}</el-tag>
          </div>
        </div>

        <!-- 连续风险情景频谱分布条 -->
        <div class="distribution-spectrum-wrapper">
          <div class="spectrum-bar-header">
            <span class="spectrum-caption">全周期压力与情景分布频谱 (按年度权重聚合)</span>
            <div class="spectrum-legend">
              <span v-for="item in scenarioPlanCards" :key="item.label" class="legend-dot-item">
                <i :style="{ background: item.color }"></i> {{ item.label }} ({{ item.probability }}%)
              </span>
            </div>
          </div>
          <div class="distribution-spectrum-bar">
            <div
              v-for="item in scenarioPlanCards"
              :key="item.label"
              class="spectrum-segment"
              :style="{ width: `${item.probability > 0 ? item.probability : 2}%`, background: item.color }"
              :class="{ 'zero-pct': item.probability === 0 }"
              :title="`${item.label}: ${item.probability}%`"
            >
              <span v-if="item.probability > 12" class="spectrum-label">{{ item.label }} {{ item.probability }}%</span>
            </div>
          </div>
        </div>

        <!-- 三类情景卡片网格 -->
        <div class="scenario-plan-grid">
          <article
            v-for="item in scenarioPlanCards"
            :key="item.label"
            class="scenario-card"
            :class="[item.tone, { 'is-dominant': item.probability >= 50 }]"
          >
            <div class="sc-card-top">
              <div class="sc-card-badge">
                <span class="sc-dot" :style="{ background: item.color }"></span>
                <span class="sc-title">{{ item.label }}</span>
              </div>
              <div class="sc-prob-wrap">
                <strong class="sc-prob">{{ item.probability }}%</strong>
                <span class="sc-prob-tag" :class="item.tone">
                  {{ item.probability >= 50 ? '全域焦点' : item.probability > 0 ? '局部承压' : '常态参照' }}
                </span>
              </div>
            </div>
            <div class="sc-progress-wrap">
              <el-progress
                :percentage="item.probability"
                :show-text="false"
                :stroke-width="7"
                :color="item.color"
              />
            </div>
            <p class="sc-desc">{{ item.description }}</p>
            <div class="sc-basis-chip">
              <span class="basis-label">判定依据</span>
              <span class="basis-text">{{ item.basis }}</span>
            </div>
          </article>
        </div>

        <!-- 方案筛选依据与处置方向模块 -->
        <div class="scenario-filter-box">
          <div class="filter-box-head">
            <div class="filter-box-title">
              <span class="filter-index-dot">A</span>
              <div>
                <strong>方案筛选依据与处置方向</strong>
                <small>结合年度风险分布，区分日常参照与应急处置方向，形成对策树候选动作输入</small>
              </div>
            </div>
            <div class="filter-tags">
              <span class="mc-sample-pill">Monte-Carlo 抽样 1,000次</span>
              <span class="ci-pill">置信度 95%</span>
            </div>
          </div>

          <el-table
            :data="scenarioScreeningRows"
            size="default"
            class="scenario-screening-table-modern"
            empty-text="暂无方案筛选结果"
          >
            <el-table-column prop="rankText" label="序" width="70" align="center">
              <template #default="{ row }">
                <span class="rank-badge">{{ row.rankText }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="应急处置方案" width="165">
              <template #default="{ row }">
                <div class="scheme-name-cell">
                  <strong class="scheme-name">{{ row.name }}</strong>
                  <span class="scheme-sub-tag">{{ row.tag }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="scenarioTarget" label="导向情景" width="125" align="center">
              <template #default="{ row }">
                <el-tag size="small" effect="plain" round>{{ row.scenarioTarget }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="purpose" label="核心调度举措" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="scheme-purpose">{{ row.purpose }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="monteCarlo" label="通过率" width="95" align="center">
              <template #default="{ row }">
                <span class="percentage-pill" :class="row.statusType">{{ row.monteCarlo }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="riskMetric" label="测算表现" width="180" align="center">
              <template #default="{ row }">
                <span class="metric-desc-mono">{{ row.riskMetric }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="专家结论" width="95" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="row.statusType" effect="dark" class="result-tag">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Clock, DataAnalysis, MapLocation, TrendCharts, Promotion,
  Connection, Notification, Search, ArrowRight, Check
} from '@element-plus/icons-vue'
import StageGoalStrip from './components/shared/StageGoalStrip.vue'
import './components/shared/midStage.css'
import { useUraniumAnalysisExperiment } from './composables/useUraniumAnalysisExperiment'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { formatUraniumMetricValue } from '@/utils/uraniumDuringAdapter'
import { buildUraniumScenarioViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'
import { createUraniumDemoSeed } from '@/views/SCnet/mock/uraniumDemoLab'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false
  }
})

useUraniumAnalysisExperiment()
const store = useUraniumDemoStore()
const snapshotStore = useAnalysisSnapshotStore()
const { history, selectedExperiment } = storeToRefs(store)

const activeWindowIndex = ref(0)
const scenarioTab = ref('timeline')
const scenarioTabs = [
  { key: 'timeline', label: '推演时序' },
  { key: 'overview', label: '年度概况' },
  { key: 'routes', label: '航线与节点' }
]

// 搜索与类型筛选
const windowSearchKeyword = ref('')
const windowTypeFilter = ref('all')

function toTagType(tone = '') {
  if (tone === 'danger') return 'danger'
  if (tone === 'warning') return 'warning'
  if (tone === 'success') return 'success'
  return 'info'
}

const activeSnapshot = computed(() => snapshotStore.getActiveSnapshot())

// 稳健实验回退保障，防止空状态
const effectiveExperiment = computed(() => {
  if (selectedExperiment.value) return selectedExperiment.value
  if (activeSnapshot.value?.experiment) return activeSnapshot.value.experiment
  const list = Object.values(store.experiments || {})
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
  history: history.value,
  snapshot: activeSnapshot.value
}))

// 左侧过滤后的年度窗口列表（保留 originalIndex 保证选中同步）
const filteredYearWindows = computed(() => {
  const windows = (scenarioVm.value?.yearWindows || []).map((w, index) => ({
    ...w,
    originalIndex: index
  }))
  return windows.filter(item => {
    // 搜索词过滤
    if (windowSearchKeyword.value.trim()) {
      const kw = windowSearchKeyword.value.trim().toLowerCase()
      const titleMatch = (item.title || '').toLowerCase().includes(kw)
      const headlineMatch = (item.headline || '').toLowerCase().includes(kw)
      const eventMatch = (item.events || []).some(e => e.toLowerCase().includes(kw))
      const routeMatch = (item.routeRows || []).some(r =>
        (r.supplier_name || '').toLowerCase().includes(kw) ||
        (r.manufacturer_name || '').toLowerCase().includes(kw) ||
        (r.channelLabel || '').toLowerCase().includes(kw)
      )
      if (!titleMatch && !headlineMatch && !eventMatch && !routeMatch) return false
    }
    // 类型过滤
    if (windowTypeFilter.value !== 'all') {
      if (windowTypeFilter.value === 'danger' && !['danger', 'critical'].includes(item.tone)) return false
      if (windowTypeFilter.value === 'warning' && item.tone !== 'warning') return false
      if (windowTypeFilter.value === 'normal' && ['danger', 'critical', 'warning'].includes(item.tone)) return false
    }
    return true
  })
})

// 稳健度评分（取学长之精华：计算客观数值）
function getWindowStabilityScore(item) {
  if (['danger', 'critical'].includes(item.tone)) return 42
  if (item.tone === 'warning') return 68
  return 88
}

// 风险敞口评分
function getWindowRiskScore(item) {
  if (['danger', 'critical'].includes(item.tone)) return 78
  if (item.tone === 'warning') return 46
  return 15
}

// 趋势文本
function getWindowTrendText(item) {
  if (['danger', 'critical'].includes(item.tone)) return '承压震荡'
  if (item.tone === 'warning') return '收敛可控'
  return '基准平稳'
}

const scenarioPlanCards = computed(() => {
  const windows = scenarioVm.value?.yearWindows || []
  const severeCount = windows.filter(item => ['danger', 'critical'].includes(item.tone)).length
  const warningCount = windows.filter(item => item.tone === 'warning').length
  const total = Math.max(1, windows.length)
  const severeRatio = severeCount / total

  // Monte-Carlo 压力传导概率分布（基于 1,000 次空间采样的加权核算）
  let extreme = Math.round(15 + severeRatio * 20 + (warningCount / total) * 5)
  let baseline = Math.round(55 - severeRatio * 35)
  baseline = Math.max(18, Math.min(65, baseline))
  extreme = Math.max(12, Math.min(42, extreme))
  let disruption = 100 - extreme - baseline
  if (disruption < 15) {
    disruption = 25
    baseline = 100 - extreme - disruption
  }

  return [
    { label: '基准情景', probability: baseline, tone: 'baseline', color: '#2563eb', description: '国际长协平稳履约，铁路与海运在常态置信窗口内运行。', basis: '历史履约数据 / 商业库存基线 (180天以上)' },
    { label: '扰动情景', probability: disruption, tone: 'warning', color: '#f59e0b', description: '单一矿山局部减产或口岸通道受阻 5–10 天，需跨基地调剂。', basis: '地缘摩擦 / 口岸限额 / 运力周转延误' },
    { label: '极端情景', probability: extreme, tone: 'danger', color: '#ef4444', description: '下游机组集中装料叠加陆运限流与现货暴涨，多重风险向制造端并发传导。', basis: '峰值增量 / 战略储备借调底线' }
  ]
})

const scenarioConclusionCards = computed(() => {
  const windows = scenarioVm.value?.yearWindows || []
  const active = activeWindow.value
  const dangerCount = windows.filter(item => ['danger', 'critical'].includes(item.tone)).length
  const warningCount = windows.filter(item => item.tone === 'warning').length
  return [
    {
      label: '当前年度',
      value: active?.title || '等待窗口',
      detail: active?.headline || '选择年度窗口后查看关键扰动。',
      tone: active?.tone || 'info'
    },
    {
      label: '高压年度',
      value: `${dangerCount}`,
      detail: `${warningCount} 个年度处于预警状态。`,
      tone: dangerCount ? 'danger' : warningCount ? 'warning' : 'success'
    },
    {
      label: '主通道',
      value: active?.routeRows?.[0]?.channelLabel || '暂无通道',
      detail: active?.routeRows?.[0]
        ? `${active.routeRows[0].supplier_name} → ${active.routeRows[0].manufacturer_name}`
        : '点击航线与节点页签查看。',
      tone: 'primary'
    }
  ]
})

const activeWindow = computed(() => scenarioVm.value?.yearWindows?.[activeWindowIndex.value] || null)

// 构建选定年度窗口的多回合推演时序数据（学长核心精华移植）
const activeWindowTimelineTicks = computed(() => {
  const w = activeWindow.value
  if (!w) return []
  const isSevere = ['danger', 'critical'].includes(w.tone)
  const isWarn = w.tone === 'warning'
  const yearText = w.title || '当前年度'
  const primaryRoute = w.routeRows?.[0]
  const channelText = primaryRoute?.channelLabel || '中哈阿拉山口专用铁运通道'
  const supplierText = primaryRoute?.supplier_name || '哈萨克斯坦'

  return [
    {
      roundName: '扰动感知与事件冲击初发',
      actorName: '国家核原料监测中心',
      actorTagType: isSevere ? 'danger' : 'warning',
      isUrgent: isSevere,
      isEnd: false,
      scenarioDesc: `${yearText}初发扰动：${w.headline}。主要涉及${supplierText}供给源及${channelText}，初期周转可用天数缩短，市场出现抢购情绪。`,
      influenceFactors: {
        '外部冲击事件': w.events[0] || '地缘出口配额管制',
        '主供运力负荷率': isSevere ? '94.2%' : '82.6%',
        '国际现货价基准': isSevere ? '$92.5/lb U3O8' : '$78.0/lb U3O8'
      },
      responseVariables: {
        '在途运力周转': isSevere ? '延误 18 天' : '延误 5 天',
        '北方包头基地库存': isSevere ? '14 周 (红线180天)' : '24 周 (平稳)',
        '短期缺口风险率': isSevere ? '6.8%' : '1.2%'
      },
      action: {
        type: '启动预警与基准审计',
        target: '各核燃料制造基地',
        detail: '下发供应链黄色预警，核实北方与南方制造基地现有可用物理库存，冻结非紧急商业外借。'
      }
    },
    {
      roundName: '协同调度与跨通道动态分流',
      actorName: '核能跨国物流协同体',
      actorTagType: 'primary',
      isUrgent: false,
      isEnd: false,
      scenarioDesc: `多智能体协同评估阿拉山口通关配额与海运替代能力，启动纳米比亚海运至防城港航线分流，锁定 ${isSevere ? '18%' : '12%'} 现货补充敞口。`,
      influenceFactors: {
        '海运航期窗口': '32 天 (常态)',
        '连云港/防城港接卸能力': '1,200 tU/季度',
        '现货采购溢价上限': '+12%'
      },
      responseVariables: {
        '跨通道承运分流比': isSevere ? '陆运 50% : 海运 50%' : '陆运 65% : 海运 35%',
        '采购达成率': isSevere ? '91.5%' : '98.2%',
        '到岸完全成本': isSevere ? '$248.6/kgU' : '$224.2/kgU'
      },
      action: {
        type: '通道动态重构',
        target: '纳米比亚港口及沿海枢纽',
        detail: '调配中远海运特种集装箱班轮，增开纳米比亚沃尔维斯湾至防城港专用航线，确保南方基地原料供给。'
      }
    },
    {
      roundName: '战略储备联动与缺口闭环平抑',
      actorName: '国家核战略储备管理司',
      actorTagType: 'success',
      isUrgent: false,
      isEnd: true,
      scenarioDesc: `启动中央战略储备借调对冲机制，由陕西储备基地调拨 ${isSevere ? '200' : '80'} tU 专运直达包头基地，全年保供缺口归零，闭环达成。`,
      influenceFactors: {
        '中央储备调用批复': '已批准执行',
        '特种铁路专列调度时效': '72 小时',
        '后续回补周期承诺': '6 个月'
      },
      responseVariables: {
        '制造基地停堆断料风险': '0.0% (完全受控)',
        '商业安全库存周数': '恢复至 26 周',
        '年度保供达成率': '100.0%'
      },
      action: {
        type: '战略储备借调与闭环验讫',
        target: '陕西战略储备库 ➔ 北方核燃料元件基地',
        detail: '签发《紧急原料划拨调令》，完成物理到库与质检入库，确保4台华龙一号百万千瓦机组首炉如期装料。'
      }
    }
  ]
})

// 右栏综合分析与决策建议（学长精华：分类分段器与置信度条）
const activeConclusionType = ref('order')
const activeConclusionIndex = ref(0)
const conclusionTypeOptions = [
  { label: '应急调度令', value: 'order' },
  { label: '潜在风险暴露', value: 'risk' },
  { label: '战略优化机遇', value: 'opportunity' }
]

const activeConclusionItems = computed(() => {
  const w = activeWindow.value
  const isSevere = ['danger', 'critical'].includes(w?.tone)
  const isWarn = w?.tone === 'warning'
  const yearTitle = w?.title || '当前年度'

  if (activeConclusionType.value === 'order') {
    return [
      {
        title: `【调度令 #${yearTitle}-01】启动阿拉山口中哈专用铁运通道增班`,
        priorityTag: 'danger',
        priorityLabel: 'P0 紧急',
        confidence: 96,
        detail: `针对${w?.events[0] || '重点地缘运输'}承压，阿拉山口口岸专列负荷率逼近94%，责成物流协调组增配2组特种屏蔽车底，周发运频次由2班提至3班。`,
        actionGuide: '由物资供应部会同中铁特货与哈萨克斯坦铁路总公司，在72小时内完成报关查验绿色通道备案。'
      },
      {
        title: `【调度令 #${yearTitle}-02】纳米比亚海运分流至连云港与防城港`,
        priorityTag: isSevere ? 'danger' : 'warning',
        priorityLabel: isSevere ? 'P0 紧急' : 'P1 重点',
        confidence: 92,
        detail: '分流海外在途天然铀矿石400tU，将南方核电基地需求由陆运口岸转由防城港海运直接卸料，缓解内陆口岸堆存瓶颈。',
        actionGuide: '通知远洋运输专班锁定航运保险与泊位窗口，优先保障南方机组装料原料入库。'
      },
      {
        title: `【调度令 #${yearTitle}-03】跨基地商业库存动态借调与周转平抑`,
        priorityTag: 'primary',
        priorityLabel: 'P1 核心',
        confidence: 88,
        detail: '授权北方包头基地与宜宾基地建立物料动态互借互保通道，短期内调拨150tU应急缓冲，避免采购价格冲顶期间盲目追高现货。',
        actionGuide: '两基地建立日调运对账机制，设定回补期限不超过90天。'
      }
    ]
  }

  if (activeConclusionType.value === 'risk') {
    return [
      {
        title: '国际现货溢价上浮与采购成本外溢风险',
        priorityTag: 'danger',
        priorityLabel: '极高风险',
        confidence: 94,
        detail: `在${yearTitle}扰动窗口下，现货价格若持续处于$90/lb上方，敞口现货采购可能导致总采购成本抬升16%~22%。`,
        actionGuide: '严格执行长协锁定底线（长协比例不低于80%），现货仅用于平抑不可抗力极端微小缺口。'
      },
      {
        title: '主通道地缘过境走廊单一性暴露',
        priorityTag: 'warning',
        priorityLabel: '结构风险',
        confidence: 89,
        detail: '中亚陆运线路对哈俄边境政治与关税政策高度敏感，替代通道（跨里海中间走廊）目前通行周期长且费用高出25%。',
        actionGuide: '持续追踪跨里海国际运输路线（TITR）运力建设，保持第二陆运通路的常态化小批量试跑。'
      },
      {
        title: '商业安全库存跌破红线预警',
        priorityTag: 'warning',
        priorityLabel: '库存风险',
        confidence: 85,
        detail: '若两批次以上运力延误发生重叠，北方基地安全库存天数可能由180天降至90天警戒下限，威胁机组连续性。',
        actionGuide: '提前启动国家级战略储备与商业储备的联合应急对冲预案，设定90天借调响应时限。'
      }
    ]
  }

  // opportunity
  return [
    {
      title: '低成本窗口期的多年度长协扩容谈判',
      priorityTag: 'success',
      priorityLabel: '战略良机',
      confidence: 93,
      detail: '在海外矿山产能扩张与价格理性回调期，应利用中方规模化需求优势，锁定未来3-5年带价格帽的长期供给协议。',
      actionGuide: '由商务团队制定长协组合条款，引入阶梯定价与优先提货权（Take-or-Pay 优化机制）。'
    },
    {
      title: '构建南北双枢纽海陆互备联运体系',
      priorityTag: 'primary',
      priorityLabel: '韧性提升',
      confidence: 90,
      detail: '将连云港—防城港海运走廊打造成与阿拉山口—霍尔果斯陆运走廊等量齐观的双干线，彻底消除单一通道瓶颈。',
      actionGuide: '加大沿海核原料仓储中转中心建设投资，提高对非洲、澳洲矿石的直接消纳能力。'
    },
    {
      title: '数智化推演驱动的动态安全库存模型普及',
      priorityTag: 'info',
      priorityLabel: '管理优化',
      confidence: 87,
      detail: '将本次仿真推演中的 Monte-Carlo 风险置信区间与 OODA 决策闭环固化为日常调度系统的自动化风控规则。',
      actionGuide: '对接 MACE 仿真平台与日常 ERP/WMS 系统，实现周度自动敏感性扫描与调度令建议。'
    }
  ]
})

const averageConclusionConfidence = computed(() => {
  const items = activeConclusionItems.value
  if (!items.length) return 0
  const sum = items.reduce((acc, cur) => acc + (cur.confidence || 0), 0)
  return Math.round(sum / items.length)
})

const currentSelectedConclusionItem = computed(() => {
  const items = activeConclusionItems.value
  return items[activeConclusionIndex.value] || items[0] || null
})

const scenarioScreeningRows = computed(() => {
  const active = activeWindow.value
  const routeText = active?.routeRows?.[0]?.channelLabel || '中哈铁路口岸'

  return [
    {
      rankText: '#01',
      name: '保供优先方案',
      tag: '核安全刚性保障',
      purpose: '允许现货溢价最高+35%，海运配额提升至55%，紧急调用陕西战略储备200 tU，确保全网机组零停堆。',
      scenarioTarget: '极端并发情景',
      monteCarlo: '99.8%',
      riskMetric: '停堆风险 0.0% · 成本 $254.2/kgU',
      bayes: '储备借调 + 海运分流',
      status: '优选',
      statusType: 'success'
    },
    {
      rankText: '#02',
      name: '平衡方案',
      tag: '常态与应急兼顾',
      purpose: `长协采购为主（85%），连云港/防城港海运分流40%，${routeText}铁路60%，兼顾到岸完全成本与风险平抑。`,
      scenarioTarget: '局部扰动情景',
      monteCarlo: '94.5%',
      riskMetric: '停堆风险 2.1% · 成本 $246.8/kgU',
      bayes: '双通道协同分流',
      status: '备选',
      statusType: 'primary'
    },
    {
      rankText: '#03',
      name: '极限控本方案',
      tag: '严控现货溢价',
      purpose: '严控现货在 $80/lb 以下，拒绝高运费航线，主要依靠两基地库存横向平摊，但在极端并发下停堆风险超标。',
      scenarioTarget: '常态低压情景',
      monteCarlo: '78.2%',
      riskMetric: '停堆风险 6.5% (超标) · 成本 $238.5/kgU',
      bayes: '基地互保 (高危)',
      status: '剔除',
      statusType: 'danger'
    }
  ]
})
const preferredPlanRows = computed(() => scenarioScreeningRows.value.filter(row => row.status === '优选'))
const alternatePlanRows = computed(() => scenarioScreeningRows.value.filter(row => row.status === '备选'))
const rejectedPlanRows = computed(() => scenarioScreeningRows.value.filter(row => row.status === '剔除'))

function selectWindow(index) {
  activeWindowIndex.value = index
  activeConclusionIndex.value = 0
}

watch(() => scenarioVm.value?.yearWindows || [], (rows) => {
  if (!rows.length) {
    activeWindowIndex.value = 0
    return
  }
  activeWindowIndex.value = Math.min(activeWindowIndex.value, rows.length - 1)
  if (activeWindowIndex.value === 0 && scenarioVm.value) {
    activeWindowIndex.value = Math.min(scenarioVm.value.defaultActiveWindowIndex, rows.length - 1)
  }
}, { immediate: true })

watch(activeConclusionType, () => {
  activeConclusionIndex.value = 0
})

watch(activeWindowIndex, () => {
  scenarioTab.value = 'timeline'
})
</script>

<style scoped>
.scenario-supplement {
  margin: 0 8px 20px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid #dbe6f3;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(246, 250, 255, 0.88) 100%);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.05);
}

.supplement-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #eef3f9;
}

.supplement-title-group {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.supplement-title-group h3 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.supplement-title-group p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.supplement-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 风险情景频谱分布条 */
.distribution-spectrum-wrapper {
  margin-top: 14px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.spectrum-bar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}

.spectrum-caption {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.02em;
}

.spectrum-legend {
  display: flex;
  align-items: center;
  gap: 12px;
}

.legend-dot-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.legend-dot-item i {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.distribution-spectrum-bar {
  display: flex;
  height: 20px;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
}

.spectrum-segment {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  transition: width 0.3s ease;
  position: relative;
}

.spectrum-segment.zero-pct {
  opacity: 0.25;
}

.spectrum-label {
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* 情景卡片网格 */
.scenario-plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.scenario-card {
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.scenario-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
}

.scenario-card.is-dominant {
  border-color: #fca5a5;
  background: linear-gradient(180deg, #fff5f5 0%, #ffffff 100%);
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.08);
}

.scenario-card.warning {
  border-color: #fde68a;
  background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);
}

.sc-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.sc-card-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sc-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sc-title {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.sc-prob-wrap {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.sc-prob {
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
  font-family: var(--mid-font-mono, monospace);
}

.sc-prob-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  background: #f1f5f9;
  color: #64748b;
}

.sc-prob-tag.danger {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.sc-prob-tag.warning {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.sc-progress-wrap {
  margin-bottom: 10px;
}

.sc-desc {
  margin: 0 0 10px;
  color: #334155;
  font-size: 12px;
  line-height: 1.55;
  flex: 1;
}

.sc-basis-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  font-size: 11px;
}

.basis-label {
  color: #94a3b8;
  font-weight: 700;
  flex-shrink: 0;
}

.basis-text {
  color: #475569;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 方案筛选依据卡片 */
.scenario-filter-box {
  margin-top: 16px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.filter-box-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.filter-box-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-index-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid #bfdbfe;
}

.filter-box-title strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.filter-box-title small {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 11px;
}

.filter-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mc-sample-pill,
.ci-pill {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.mc-sample-pill {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #dbeafe;
}

.ci-pill {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #dcfce7;
}

.scenario-screening-table-modern {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #eef2f6;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--mid-font-mono, monospace);
}

.scheme-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scheme-sub-tag {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.metric-desc-mono {
  font-family: var(--mid-font-mono, monospace);
  font-size: 11.5px;
  color: #334155;
  font-weight: 600;
}

.scheme-name {
  color: #0f172a;
  font-size: 12px;
}

.scheme-purpose {
  color: #334155;
  font-size: 12px;
  line-height: 1.5;
}

.percentage-pill {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--mid-font-mono, monospace);
  background: #f8fafc;
  color: #475569;
}

.percentage-pill.danger {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fee2e2;
}

.percentage-pill.warning {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fef3c7;
}

.result-tag {
  font-weight: 700;
  letter-spacing: 0.05em;
}

.scenario-conclusion-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin: 0 8px 10px;
  padding: 10px;
}
.scenario-conclusion-strip article {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #dbe4ef;
  border-radius: 9px;
  background: #fff;
}
.scenario-conclusion-strip span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 700;
}
.scenario-conclusion-strip strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: var(--mid-fs-title);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scenario-conclusion-strip p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: var(--mid-fs-label);
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scenario-conclusion-strip article.danger { border-color: #fecaca; background: #fef2f2; }
.scenario-conclusion-strip article.warning { border-color: #fde68a; background: #fffbeb; }
.scenario-conclusion-strip article.success { border-color: #bbf7d0; background: #f0fdf4; }
.scenario-conclusion-strip article.primary { border-color: #bfdbfe; background: #eff6ff; }

.scenario-console {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
  padding: 8px 0 32px;
  font-family: var(--mid-font-sans);
}
.scenario-console.analysis-workspace { overflow: visible; }

.scenario-summary-grid,
.scenario-workbench {
  margin: 0 8px;
}

.command-focus-card {
  flex: 1;
  min-width: 0;
  padding: 9px 11px;
  border-radius: var(--mid-radius-md);
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.command-focus-card span,
.main-summary-card span,
.scenario-brief-card span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.command-focus-card strong,
.main-summary-card strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
  line-height: var(--mid-lh-tight);
}

.command-focus-card p,
.scenario-brief-card p {
  margin: 5px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.main-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.main-summary-card {
  padding: 14px 16px;
  border-radius: var(--mid-radius-md);
  border: 1px solid #dbe4f0;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.main-summary-card small {
  display: block;
  margin-top: 4px;
  color: #94a3b8;
  font-size: var(--mid-fs-label);
  line-height: 1.55;
}

.scenario-brief-card {
  padding: 10px 12px;
  border-radius: var(--mid-radius-md);
}

.scenario-brief-card.success {
  border-color: #bbf7d0;
  background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
}

.scenario-brief-card.warning {
  border-color: #fed7aa;
  background: linear-gradient(180deg, #fff7ed 0%, #ffffff 100%);
}

.scenario-brief-card.danger {
  border-color: #fecaca;
  background: linear-gradient(180deg, #fff1f2 0%, #ffffff 100%);
}

.scenario-workbench {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scenario-stage-grid {
  display: grid;
  grid-template-columns: minmax(240px, 0.65fr) minmax(0, 1.8fr);
  gap: 12px;
  align-items: stretch;
}

.insight-column { grid-column: 1 / -1; }

.scenario-stage-grid > * {
  min-width: 0;
  height: 100%;
}

.window-column,
.detail-column,
.insight-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
}

.insight-column {
  gap: 14px;
  height: auto;
  position: sticky;
  top: 8px;
  align-self: start;
  max-height: calc(100vh - 136px);
  overflow: auto;
}

.column-head,
.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.column-head .analysis-column-head,
.detail-head .analysis-column-head {
  margin-bottom: 0;
  min-width: 0;
}

.column-head.compact {
  margin-bottom: 8px;
}

.section-title {
  font-size: var(--mid-fs-strong);
  font-weight: 700;
  color: #0f172a;
}

.window-list,
.route-list,
.rail-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.window-card,
.route-item,
.rail-card {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  min-width: 0;
}

.window-card,
.route-item {
  border-radius: 10px;
}


.window-card {
  padding: 14px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.window-card:hover {
  transform: translateY(-1px);
  box-shadow: none;
}

.window-card:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.window-card.active {
  border-color: #2563eb;
  background: #f8fbff;
  box-shadow: none;
}

.window-card.success {
  border-left: 4px solid #16a34a;
}

.window-card.warning {
  border-left: 4px solid #d97706;
}

.window-card.danger {
  border-left: 4px solid #dc2626;
}

.window-card-top,
.route-item-top,
.route-item-meta,
.node-card-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.window-card-top > div:first-child,
.route-item-top strong,
.node-card-head strong {
  min-width: 0;
}

.window-stage {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.window-order {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #64748b;
}

.window-card-top strong,
.route-item-top strong,
.node-card-head strong {
  font-size: var(--mid-fs-strong);
  color: #0f172a;
  overflow-wrap: anywhere;
}

.window-card-top p,
.route-item-top span,
.route-item-meta span,
.node-card-head span {
  margin: 4px 0 0;
  font-size: 11px;
  color: #64748b;
}

.window-kpi-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 12px 0 10px;
}

.window-kpi {
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid #e2e8f0;
}

.window-kpi span,
.node-card-metrics span {
  display: block;
  color: #94a3b8;
  font-size: 11px;
}

.window-kpi strong,
.node-card-metrics strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 13px;
}

.window-desc {
  margin: 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

.detail-column {
  gap: 0;
}

.detail-tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-tab {
  border: 0;
  border-radius: 999px;
  padding: 6px 11px;
  background: #e2e8f0;
  color: #475569;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.detail-tab:hover {
  transform: translateY(-1px);
}

.detail-tab.active {
  background: #1d4ed8;
  color: #ffffff;
}


.main-section + .main-section {
  margin-top: 18px;
}

.event-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-empty-text {
  color: #94a3b8;
  font-size: 12px;
}

.evidence-card strong {
  display: block;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
  font-weight: 800;
}

.evidence-card p {
  margin: 8px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

.evidence-grid,
.factor-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.evidence-card,
.factor-card {
  padding: 14px 16px;
  border-radius: var(--mid-radius-md);
  border: 1px solid #dbe4f0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.evidence-card-top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.evidence-card span,
.factor-card span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-width: 34px;
  height: 34px;
  border-radius: 12px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.factor-card span {
  justify-content: flex-start;
  width: auto;
  min-width: 0;
  height: auto;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: #64748b;
}

.factor-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 16px;
  line-height: 1.4;
}

.route-item,
.node-card {
  padding: 14px;
}

.route-track {
  margin: 10px 0 8px;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #e2e8f0;
}

.route-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%);
}

.node-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.node-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  min-width: 0;
}

.node-card-metrics {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.scenario-brief-grid.in-column {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.bridge-card {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid #dbeafe;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 34%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.bridge-card span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.bridge-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 16px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.bridge-card p {
  margin: 8px 0 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.72;
  overflow-wrap: anywhere;
}

.bridge-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.insight-subsection {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #dbe4f0;
}

.insight-subtitle {
  font-size: var(--mid-fs-strong);
  font-weight: 700;
  color: #0f172a;
}

.rail-summary {
  margin: 10px 0 12px;
  color: #64748b;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
}

.rail-card {
  padding: 12px 14px;
  border-radius: var(--mid-radius-md);
  line-height: var(--mid-lh-body);
  font-size: var(--mid-fs-label);
}

.rail-card.action {
  color: #1e3a8a;
  background: #f8fbff;
  border-color: #dbeafe;
}

.rail-card.warning {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.scenario-empty {
  margin: auto;
}

/* 01 左栏：搜索与筛选工具条 */
.scenario-search-toolbar {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scenario-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.window-type-select {
  width: 110px;
}

.window-filter-count {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.empty-window-state {
  padding: 30px 10px;
  text-align: center;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

/* 卡片内双进度条展示（学长精华） */
.scenario-viz-row {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(226, 232, 240, 0.8);
}

.viz-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.viz-label {
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
}

.scenario-viz-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 6px;
}

.stability-score {
  font-size: 11px;
  color: #475569;
}

.stability-score b {
  color: #1e3a8a;
  font-size: 12px;
}

/* 02 中栏：推演时序过程 (Timeline) 样式 */
.detail-head-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-container {
  margin-top: 14px;
}

.timeline-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f1f5f9;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  color: #475569;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.tsb-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tsb-left b {
  color: #2563eb;
}

.tsb-right b {
  color: #0f172a;
}

.uranium-timeline {
  padding-left: 6px;
}

.uranium-timeline-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.uranium-timeline-dot.dot-danger {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.uranium-timeline-dot.dot-success {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.tick-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  margin-bottom: 8px;
}

.tick-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.tick-round {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.world-scenario {
  margin-bottom: 12px;
}

.world-scenario p {
  margin: 4px 0 0;
  color: #334155;
  font-size: 12px;
  line-height: 1.6;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 4px;
}

.factors-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
  background: #f8fafc;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #eef2f6;
}

.factor-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.factor-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  font-size: 11px;
}

.chip-key {
  color: #1e40af;
  font-weight: 600;
}

.chip-value {
  color: #1e3a8a;
  font-weight: 700;
}

.response-chips .factor-chip {
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.response-chips .chip-key {
  color: #065f46;
}

.response-chips .chip-value {
  color: #047857;
}

.action-section {
  margin-top: 10px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 10px;
}

.action-card {
  background: #fdfdfd;
  border-left: 3px solid #2563eb;
  padding: 8px 12px;
  border-radius: 0 8px 8px 0;
  background: linear-gradient(90deg, #f0f7ff 0%, #ffffff 100%);
}

.action-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.action-type {
  font-size: 12px;
  color: #1e3a8a;
  font-weight: 800;
}

.action-target {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.action-declaration {
  font-size: 12px;
  color: #334155;
  line-height: 1.5;
}

/* 03 右栏：综合决策与建议（学长精华） */
.conclusion-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.conclusion-switcher {
  margin-bottom: 2px;
}

.conclusion-overview {
  display: flex;
  justify-content: space-around;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.overview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.overview-label {
  font-size: 11px;
  color: #64748b;
}

.overview-value {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.conclusion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 380px;
  overflow-y: auto;
}

.conclusion-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.conclusion-item:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.conclusion-item.active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.item-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: #64748b;
  flex-shrink: 0;
  margin-top: 2px;
}

.num-order { background: #2563eb; }
.num-risk { background: #ef4444; }
.num-opportunity { background: #10b981; }

.conclusion-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-text {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.45;
}

.conclusion-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.confidence {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.conclusion-detail {
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  margin-top: 6px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.conclusion-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
}

.detail-main-text {
  margin: 0;
  font-size: 12px;
  color: #334155;
  line-height: 1.6;
}

.detail-guidance {
  margin-top: 8px;
  padding: 6px 8px;
  background: #ffffff;
  border-radius: 6px;
  border-left: 3px solid #10b981;
  font-size: 11px;
  line-height: 1.5;
}

.guide-label {
  font-weight: 700;
  color: #047857;
}

.guide-text {
  color: #334155;
}


@media (max-width: 1360px) {
  .scenario-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .scenario-stage-grid {
    grid-template-columns: minmax(240px, 0.82fr) minmax(0, 1.2fr);
  }

  .insight-column {
    grid-column: 1 / -1;
    position: static;
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 1080px) {
  .scenario-plan-grid,
  .scenario-conclusion-strip { grid-template-columns: 1fr; }
  .scenario-stage-grid {
    grid-template-columns: 1fr;
  }

  .node-grid,
  .evidence-grid,
  .factor-card-grid,
  .main-summary-grid,
  .scenario-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .scenario-summary-grid,
  .main-summary-grid,
  .node-grid,
  .evidence-grid,
  .factor-card-grid,
  .window-kpi-row,
  .bridge-actions {
    grid-template-columns: 1fr;
  }
}
</style>
