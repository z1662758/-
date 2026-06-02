<template>
  <div class="scenario-analysis">
    <!-- 卡片1: 标题区域 -->
    <div class="card-1">
      <div class="card-header">
        <h1 class="main-title">
          <el-icon class="title-icon"><TrendCharts /></el-icon>
          供应链假设情景分析
        </h1>
        <div class="action-area">
          <el-button 
            type="primary" 
            :loading="isRunning" 
            @click="handleStartDeduction"
            class="start-btn"
          >
            <el-icon><VideoPlay /></el-icon>
            {{ isRunning ? '推演中...' : '开始推演' }}
          </el-button>
          <el-button @click="handleRefreshResult" :disabled="isRunning" class="refresh-btn">
            <el-icon><Refresh /></el-icon>
            刷新结果
          </el-button>
        </div>
      </div>
    </div>

    <!-- 进度条 -->
    <transition name="slide-down">
      <div v-if="isRunning || progress.total > 0" class="progress-section">
        <div class="progress-card">
          <div class="progress-left">
            <div class="progress-icon">
              <el-icon class="rotating" v-if="isRunning"><Loading /></el-icon>
              <el-icon v-else><CircleCheck /></el-icon>
            </div>
            <div class="progress-info">
              <span class="progress-label">推演进度</span>
              <span class="progress-status">{{ isRunning ? '正在推演...' : '推演完成' }}</span>
            </div>
          </div>
          <div class="progress-right">
            <el-progress
              :percentage="progressPercentage"
              :stroke-width="10"
              :format="progressFormat"
              :color="progressColor"
            />
            <span class="progress-time">
              <el-icon><Timer /></el-icon>
              已用时: {{ formatTime(progress.running_time) }}
            </span>
          </div>
        </div>
      </div>
    </transition>

    <!-- 三栏布局容器 -->
    <div class="three-column-container">
      <!-- 左栏：假设情景选择 -->
      <div class="left-column">
        <div class="panel-header">
          <h2 class="panel-title">
            <el-icon><DataAnalysis /></el-icon>
            供应链情景选择
          </h2>
        </div>
        <div class="scenario-toolbar" v-if="scenarioResults.length > 0">
          <el-input
            v-model="scenarioKeyword"
            placeholder="搜索情景名称或描述"
            clearable
            size="small"
            class="scenario-search"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <div class="scenario-filter-row">
            <el-select v-model="scenarioTypeFilter" size="small" class="scenario-filter" placeholder="情景类型">
              <el-option label="全部类型" value="all" />
              <el-option label="乐观情景" value="optimistic" />
              <el-option label="悲观情景" value="pessimistic" />
              <el-option label="基准情景" value="baseline" />
              <el-option label="其他情景" value="custom" />
            </el-select>
            <el-segmented
              v-model="scenarioSortBy"
              size="small"
              :options="scenarioSortOptions"
              class="scenario-sort"
            />
          </div>
        </div>

        <div v-if="scenarioResults.length === 0" class="empty-state">
          <div class="empty-icon">
            <el-icon><FolderOpened /></el-icon>
          </div>
          <p class="empty-title">暂无推演结果</p>
          <p class="empty-desc">点击上方"开始推演"按钮启动供应链情景分析</p>
        </div>
        <div v-else-if="displayScenarioResults.length === 0" class="empty-state">
          <div class="empty-icon">
            <el-icon><Search /></el-icon>
          </div>
          <p class="empty-title">未匹配到情景</p>
          <p class="empty-desc">请调整筛选条件或关键词</p>
        </div>
        <div v-else class="scenario-cards">
          <div
            v-for="item in displayScenarioResults"
            :key="item.originalIndex"
            class="scenario-card"
            :class="{ 
              active: activeScenarioIndex === item.originalIndex,
              'type-optimistic': item.scenario?.type === 'optimistic',
              'type-pessimistic': item.scenario?.type === 'pessimistic',
              'type-baseline': item.scenario?.type === 'baseline',
              'type-custom': item.scenario?.type === 'custom'
            }"
            @click="activeScenarioIndex = item.originalIndex"
          >
            <div class="scenario-header">
              <div class="scenario-tags">
                <span class="scenario-type-tag" :class="'tag-' + item.scenario?.type">
                  {{ getScenarioTypeLabel(item.scenario?.type) }}
                </span>
                <span class="scenario-name-tag">{{ item.scenario?.name || `情景 ${item.originalIndex + 1}` }}</span>
              </div>
              <div class="scenario-stats-inline">
                <div class="stat-item-inline">
                  <el-icon class="stat-icon"><RefreshRight /></el-icon>
                  <span>{{ item.summary?.total_simulations || 0 }}</span>
                </div>
                <div class="stat-item-inline">
                  <el-icon class="stat-icon"><Clock /></el-icon>
                  <span>{{ (item.summary?.avg_ticks || 0).toFixed(1) }}</span>
                </div>
                <div class="stat-item-inline">
                  <el-icon class="stat-icon"><CircleCheckFilled /></el-icon>
                  <span>{{ ((item.summary?.exit_rate || 0) * 100).toFixed(0) }}%</span>
                </div>
              </div>
            </div>
            <div class="scenario-desc-compact">{{ item.scenario?.description || '暂无描述' }}</div>
            <div class="scenario-viz-row">
              <div class="viz-item">
                <span class="viz-label">稳定性</span>
                <el-progress
                  :percentage="getScenarioStabilityScore(item)"
                  :status="getScenarioHealthStatus(getScenarioStabilityScore(item))"
                  :stroke-width="8"
                  :show-text="false"
                />
              </div>
              <div class="viz-item">
                <span class="viz-label">风险度</span>
                <el-progress
                  :percentage="getScenarioRiskScore(item)"
                  status="exception"
                  :stroke-width="8"
                  :show-text="false"
                />
              </div>
            </div>
            <div class="scenario-viz-footer">
              <el-tag size="small" :type="getScenarioHealthStatus(getScenarioStabilityScore(item))" effect="light">
                趋势: {{ getScenarioTrendText(item) }}
              </el-tag>
              <span class="stability-score">综合评分 {{ getScenarioStabilityScore(item) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 中栏：推演结果 -->
      <div class="middle-column">
        <div class="panel-header">
          <h2 class="panel-title">
            <el-icon><Document /></el-icon>
            推演结果
          </h2>
        </div>
        
        <el-tabs v-model="activeTab" class="detail-tabs">
          <!-- 推演结果 -->
          <el-tab-pane name="results">
            <template #label>
              <span class="tab-label">
                <el-icon><Document /></el-icon>
                推演结果
              </span>
            </template>
            <div class="deduction-results">
              <div v-if="!activeScenario" class="no-data">
                <p>请从左侧选择一个供应链情景查看详细推演结果</p>
              </div>
              <template v-else>
                <div class="results-summary">
                  <span class="summary-item">
                    <el-icon><DataLine /></el-icon>
                    共 {{ activeScenario.deduction_results?.length || 0 }} 次推演
                  </span>
                </div>
                <el-collapse accordion class="results-collapse">
                  <el-collapse-item
                    v-for="(result, rIndex) in activeScenario.deduction_results"
                    :key="rIndex"
                    :name="rIndex"
                  >
                    <template #title>
                      <div class="collapse-title">
                        <span class="collapse-index">#{{ rIndex + 1 }}</span>
                        <span class="collapse-name">推演序列</span>
                        <span class="collapse-meta">
                          <el-tag size="small" type="info">{{ result.length }} 回合</el-tag>
                        </span>
                        <el-button size="small" text class="expand-btn">
                          {{ result.length }} 回合 <el-icon><ArrowRight /></el-icon>
                        </el-button>
                      </div>
                    </template>
                    <div class="timeline-container">
                      <el-timeline>
                        <el-timeline-item
                          v-for="(tick, tIndex) in result"
                          :key="tIndex"
                          :type="tick[5] ? 'success' : 'primary'"
                          :hollow="!tick[5]"
                          size="large"
                        >
                          <template #dot>
                            <div class="timeline-dot" :class="{ 'dot-success': tick[5] }">
                              {{ tIndex + 1 }}
                            </div>
                          </template>
                          <div class="tick-card">
                            <div class="tick-header">
                              <span class="tick-round">回合 {{ tIndex + 1 }}</span>
                              <el-tag v-if="tick[4]" size="small" :type="getCampTagType(tick[3])">
                                {{ tick[3] || '供应链角色' }} 行动
                              </el-tag>
                              <el-tag v-if="tick[5]" type="success" size="small" effect="dark">
                                推演结束
                              </el-tag>
                            </div>
                            <div class="world-scenario" v-if="tick[0]">
                              <div class="section-label">
                                <el-icon><MapLocation /></el-icon>
                                供应链态势
                              </div>
                              <p>{{ tick[0] }}</p>
                            </div>
                            <div class="factors-row" v-if="tick[1]">
                              <div class="factors-group" v-if="tick[1]">
                                <div class="section-label">
                                  <el-icon><TrendCharts /></el-icon>
                                  影响因素
                                </div>
                                <div class="factor-chips">
                                  <span v-for="(value, key) in tick[1]" :key="key" class="factor-chip">
                                    <span class="chip-key">{{ formatFactorKey(key) }}</span>
                                    <span class="chip-value">{{ formatValue(value) }}</span>
                                  </span>
                                </div>
                              </div>
                              <div class="factors-group" v-if="tick[2]">
                                <div class="section-label">
                                  <el-icon><DataAnalysis /></el-icon>
                                  响应变量
                                </div>
                                <div class="factor-chips response-chips">
                                  <span v-for="(value, key) in tick[2]" :key="key" class="factor-chip response">
                                    <span class="chip-key">{{ formatFactorKey(key) }}</span>
                                    <span class="chip-value">{{ formatValue(value) }}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div class="action-section" v-if="tick[4]">
                              <div class="section-label">
                                <el-icon><Position /></el-icon>
                                决策行动
                              </div>
                              <div class="action-card">
                                <div class="action-header">
                                  <span class="action-type">{{ tick[4]?.action }}</span>
                                  <span class="action-target">目标: {{ tick[4]?.target }}</span>
                                </div>
                                <div class="action-declaration">{{ tick[4]?.declaration }}</div>
                              </div>
                            </div>
                          </div>
                        </el-timeline-item>
                      </el-timeline>
                    </div>
                  </el-collapse-item>
                </el-collapse>
              </template>
            </div>
          </el-tab-pane>

          <!-- 统计分析 -->
          <el-tab-pane name="analysis">
            <template #label>
              <span class="tab-label">
                <el-icon><TrendCharts /></el-icon>
                统计分析
              </span>
            </template>
            <div class="analysis-content">
              <div v-if="!activeScenario" class="no-data">
                <p>请从左侧选择一个情景查看统计分析</p>
              </div>
              <template v-else>
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-card-icon stat-card-icon-primary">
                      <el-icon><RefreshRight /></el-icon>
                    </div>
                    <div class="stat-card-value">{{ activeScenario.summary?.total_simulations || 0 }}</div>
                    <div class="stat-card-label">推演总次数</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-card-icon stat-card-icon-warning">
                      <el-icon><Clock /></el-icon>
                    </div>
                    <div class="stat-card-value">{{ (activeScenario.summary?.avg_ticks || 0).toFixed(1) }}</div>
                    <div class="stat-card-label">平均回合数</div>
                  </div>
                  <div class="stat-card success">
                    <div class="stat-card-icon stat-card-icon-success">
                      <el-icon><CircleCheckFilled /></el-icon>
                    </div>
                    <div class="stat-card-value">{{ ((activeScenario.summary?.exit_rate || 0) * 100).toFixed(0) }}%</div>
                    <div class="stat-card-label">推演结束率</div>
                  </div>
                </div>
                
                <!-- 结束状态列表 -->
                <div class="end-states-section" v-if="activeScenario.summary?.end_states">
                  <h3 class="subsection-title">
                    <el-icon><List /></el-icon>
                    各推演结束状态
                  </h3>
                  <div class="end-states-grid">
                    <div 
                      v-for="(state, sIndex) in activeScenario.summary.end_states" 
                      :key="sIndex"
                      class="end-state-card"
                    >
                      <div class="end-state-header">
                        <span class="end-state-index">推演 #{{ sIndex + 1 }}</span>
                        <el-tag :type="state.exit ? 'success' : 'warning'" size="small" effect="dark">
                          {{ state.exit ? '已结束' : '进行中' }}
                        </el-tag>
                      </div>
                      <div class="end-state-stats">
                        <div class="end-stat">
                          <span class="end-stat-value">{{ state.ticks }}</span>
                          <span class="end-stat-label">回合</span>
                        </div>
                      </div>
                      <div class="end-state-scenario">
                        {{ truncateText(state.world_scenario, 100) }}
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </el-tab-pane>

          <!-- 关键因素 -->
          <el-tab-pane name="factors">
            <template #label>
              <span class="tab-label">
                <el-icon><Key /></el-icon>
                关键因素
              </span>
            </template>
            <div class="factors-content">
              <div v-if="!activeScenario" class="no-data">
                <p>请从左侧选择一个情景查看关键因素</p>
              </div>
              <template v-else>
                <div class="key-factors-list">
                  <div class="key-factor-item" v-for="(desc, name) in getKeyFactors(activeScenario)" :key="name">
                    <div class="factor-name">
                      <strong>{{ formatFactorKey(name) }}</strong>
                      <span class="factor-desc-label">({{ name }})</span>
                    </div>
                    <div class="factor-desc">{{ desc }}</div>
                  </div>
                </div>
                <div class="impact-section" v-if="activeScenario.scenario?.potential_impact">
                  <h3 class="subsection-title">
                    <el-icon><Warning /></el-icon>
                    潜在影响
                  </h3>
                  <div class="impact-card">
                    <p>{{ activeScenario.scenario.potential_impact }}</p>
                  </div>
                </div>
              </template>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 右栏：综合分析与建议 -->
      <div class="right-column">
        <div class="panel-header">
          <h2 class="panel-title">
            <el-icon><Flag /></el-icon>
            综合分析与建议
          </h2>
        </div>
        
        <div class="conclusion-container">
          <div v-if="!hasAnyConclusion" class="empty-conclusion">
            <el-empty description="暂无综合建议数据" />
          </div>

          <template v-else>
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
                <span class="overview-label">条目数量</span>
                <span class="overview-value">{{ activeConclusionItems.length }}</span>
              </div>
              <div class="overview-item" v-if="activeConclusionItems.length">
                <span class="overview-label">平均优先级</span>
                <span class="overview-value">{{ averageConclusionScore }}</span>
              </div>
            </div>

            <div class="conclusion-list enhanced-list" v-if="activeConclusionItems.length">
              <div 
                v-for="(item, index) in activeConclusionItems" 
                :key="index"
                class="conclusion-item"
                :class="[
                  activeConclusionType === 'opportunity' ? 'opportunity-item' : '',
                  activeConclusionType === 'risk' ? 'risk-item' : '',
                  activeConclusionType === 'recommendation' ? 'recommendation-item' : '',
                  { active: activeConclusionIndex === index }
                ]"
                @click="activeConclusionIndex = index"
              >
                <span class="item-number" :class="getConclusionNumberClass(activeConclusionType)">{{ index + 1 }}</span>
                <div class="conclusion-main">
                  <span class="item-text">{{ item.text }}</span>
                  <div class="conclusion-item-meta">
                    <el-tag size="small" :type="item.priorityTag">{{ item.priorityLabel }}</el-tag>
                    <span class="confidence">置信度 {{ item.confidence }}%</span>
                  </div>
                  <el-progress :percentage="item.score" :show-text="false" :stroke-width="6" />
                </div>
              </div>
            </div>

            <div class="conclusion-detail" v-if="activeConclusionItem">
              <div class="detail-header">
                <h3 class="conclusion-title" :class="getConclusionTitleClass(activeConclusionType)">
                  <el-icon><Notification /></el-icon>
                  当前选中条目解读
                </h3>
                <el-tag :type="activeConclusionItem.priorityTag">{{ activeConclusionItem.priorityLabel }}</el-tag>
              </div>
              <p class="detail-text">{{ activeConclusionItem.text }}</p>
              <div class="detail-keywords" v-if="activeConclusionItem.keywords.length">
                <el-tag
                  v-for="(keyword, kIndex) in activeConclusionItem.keywords"
                  :key="kIndex"
                  size="small"
                  effect="plain"
                >
                  {{ keyword }}
                </el-tag>
              </div>
            </div>

            <div class="empty-conclusion" v-else>
              <p>该分类暂无条目</p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import {
  triggerScenarioAnalysis,
  getScenarioAnalysisBySession
} from '@/api/decisionAnalysis'
import { unwrapApiData } from '@/utils/apiEnvelope'
import {
  VideoPlay,
  Refresh,
  List,
  Document,
  DataAnalysis,
  Warning,
  ArrowRight,
  Loading,
  CircleCheck,
  Timer,
  Key,
  DataLine,
  MapLocation,
  TrendCharts,
  Position,
  FolderOpened,
  RefreshRight,
  Clock,
  CircleCheckFilled,
  Flag,
  Notification,
  Search
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

export default {
  name: 'SupplyChainScenarioAnalysis',
  components: {
    VideoPlay,
    Refresh,
    List,
    Document,
    DataAnalysis,
    Warning,
    ArrowRight,
    Loading,
    CircleCheck,
    Timer,
    Key,
    DataLine,
    MapLocation,
    TrendCharts,
    Position,
    FolderOpened,
    RefreshRight,
    Clock,
    CircleCheckFilled,
    Flag,
    Notification,
    Search
  },
  setup() {

    // ========== 状态定义 ==========
    const isRunning = ref(false)
    const progress = ref({ running: false, finished: 0, total: 0, running_time: 0 })
    const scenarioResults = ref([])
    const overallConclusion = ref(null)
    const activeScenarioIndex = ref(0)
    const activeTab = ref('results')
    const scenarioTypeFilter = ref('all')
    const scenarioKeyword = ref('')
    const scenarioSortBy = ref('stability')
    const activeConclusionType = ref('opportunity')
    const activeConclusionIndex = ref(0)
    let progressTimer = null

    // ========== 计算属性 ==========
    const progressPercentage = computed(() => {
      if (progress.value.total === 0) return 0
      return Math.round((progress.value.finished / progress.value.total) * 100)
    })

    const progressColor = computed(() => {
      const percentage = progressPercentage.value
      if (percentage < 30) return '#f56c6c'
      if (percentage < 70) return '#e6a23c'
      return '#67c23a'
    })

    const activeScenario = computed(() => {
      if (scenarioResults.value.length === 0) return null
      return scenarioResults.value[activeScenarioIndex.value]
    })

    const scenarioSortOptions = [
      { label: '按稳定性', value: 'stability' },
      { label: '按风险度', value: 'risk' },
      { label: '按推演数', value: 'simulations' }
    ]

    const displayScenarioResults = computed(() => {
      let list = scenarioResults.value.map((item, index) => ({ ...item, originalIndex: index }))

      if (scenarioTypeFilter.value !== 'all') {
        list = list.filter(item => item.scenario?.type === scenarioTypeFilter.value)
      }

      if (scenarioKeyword.value.trim()) {
        const keyword = scenarioKeyword.value.trim().toLowerCase()
        list = list.filter(item => {
          const name = (item.scenario?.name || '').toLowerCase()
          const description = (item.scenario?.description || '').toLowerCase()
          return name.includes(keyword) || description.includes(keyword)
        })
      }

      const sortHandler = {
        stability: (a, b) => getScenarioStabilityScore(b) - getScenarioStabilityScore(a),
        risk: (a, b) => getScenarioRiskScore(b) - getScenarioRiskScore(a),
        simulations: (a, b) => (b.summary?.total_simulations || 0) - (a.summary?.total_simulations || 0)
      }

      return list.sort(sortHandler[scenarioSortBy.value] || sortHandler.stability)
    })

    const hasAnyConclusion = computed(() => {
      if (!overallConclusion.value) return false
      return !!(
        overallConclusion.value.opportunity_windows?.length ||
        overallConclusion.value.risk_points?.length ||
        overallConclusion.value.decision_recommendations?.length
      )
    })

    const conclusionTypeOptions = computed(() => {
      const options = []
      const opportunityCount = overallConclusion.value?.opportunity_windows?.length || 0
      const riskCount = overallConclusion.value?.risk_points?.length || 0
      const recommendationCount = overallConclusion.value?.decision_recommendations?.length || 0

      if (opportunityCount) {
        options.push({ label: `机遇 ${opportunityCount}`, value: 'opportunity' })
      }
      if (riskCount) {
        options.push({ label: `风险 ${riskCount}`, value: 'risk' })
      }
      if (recommendationCount) {
        options.push({ label: `建议 ${recommendationCount}`, value: 'recommendation' })
      }
      return options
    })

    const activeConclusionItems = computed(() => {
      if (!overallConclusion.value) return []

      const map = {
        opportunity: overallConclusion.value.opportunity_windows || [],
        risk: overallConclusion.value.risk_points || [],
        recommendation: overallConclusion.value.decision_recommendations || []
      }

      return (map[activeConclusionType.value] || []).map((text, index) => {
        const score = calculateConclusionScore(text, activeConclusionType.value)
        const confidence = calculateConfidence(text)
        return {
          id: index,
          text,
          score,
          confidence,
          keywords: extractKeywords(text),
          priorityLabel: getPriorityLabel(score),
          priorityTag: getPriorityTag(score)
        }
      })
    })

    const averageConclusionScore = computed(() => {
      if (!activeConclusionItems.value.length) return 0
      const total = activeConclusionItems.value.reduce((sum, item) => sum + item.score, 0)
      return Math.round(total / activeConclusionItems.value.length)
    })

    const activeConclusionItem = computed(() => {
      if (!activeConclusionItems.value.length) return null
      return activeConclusionItems.value[activeConclusionIndex.value] || activeConclusionItems.value[0]
    })

    // ========== 方法 ==========
    const progressFormat = () => {
      return `${progress.value.finished} / ${progress.value.total}`
    }

    const formatTime = (seconds) => {
      if (!seconds) return '0秒'
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      if (mins > 0) {
        return `${mins}分${secs}秒`
      }
      return `${secs}秒`
    }

    const getScenarioTypeLabel = (type) => {
      const labelMap = {
        'optimistic': '乐观情景',
        'pessimistic': '悲观情景',
        'baseline': '基准情景',
        'custom': '其他情景'
      }
      return labelMap[type] || '未知类型'
    }

    const getCampTagType = () => {
      return 'primary'
    }

    const getScenarioStabilityScore = (item) => {
      const exitRate = (item.summary?.exit_rate || 0) * 100
      const avgTicks = item.summary?.avg_ticks || 0
      const simulations = item.summary?.total_simulations || 0
      const ticksScore = Math.max(0, 100 - avgTicks * 12)
      const simulationsScore = Math.min(100, simulations * 20)
      return Math.round(exitRate * 0.55 + ticksScore * 0.3 + simulationsScore * 0.15)
    }

    const getScenarioRiskScore = (item) => {
      const typeRiskMap = {
        optimistic: 25,
        baseline: 50,
        custom: 60,
        pessimistic: 80
      }
      const typeRisk = typeRiskMap[item.scenario?.type] || 50
      const exitRatePenalty = 100 - (item.summary?.exit_rate || 0) * 100
      const avgTicksRisk = Math.min(100, (item.summary?.avg_ticks || 0) * 10)
      return Math.round(typeRisk * 0.45 + exitRatePenalty * 0.35 + avgTicksRisk * 0.2)
    }

    const getScenarioHealthStatus = (score) => {
      if (score >= 75) return 'success'
      if (score >= 50) return 'warning'
      return 'exception'
    }

    const getScenarioTrendText = (item) => {
      const score = getScenarioStabilityScore(item)
      if (score >= 75) return '稳态优化'
      if (score >= 50) return '震荡调整'
      return '高压应对'
    }

    const formatFactorKey = (key) => {
      return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    }

    const formatValue = (value) => {
      if (typeof value === 'number') {
        return value.toFixed(2)
      }
      return value
    }

    const truncateText = (text, maxLength) => {
      if (!text) return ''
      if (text.length <= maxLength) return text
      return text.substring(0, maxLength) + '...'
    }

    const calculateConclusionScore = (text, type) => {
      const normalized = (text || '').toLowerCase()
      const keywordWeights = {
        '立即': 12,
        '尽快': 10,
        '加速': 9,
        '风险': 10,
        '窗口': 8,
        '建议': 7,
        '预警': 8,
        '紧急': 9,
        '优化': 6
      }
      const base = {
        opportunity: 62,
        risk: 72,
        recommendation: 68
      }[type] || 65

      let score = base
      Object.keys(keywordWeights).forEach(keyword => {
        if (normalized.includes(keyword.toLowerCase())) {
          score += keywordWeights[keyword]
        }
      })
      return Math.max(35, Math.min(98, score))
    }

    const calculateConfidence = (text) => {
      const length = (text || '').length
      if (length < 20) return 63
      if (length < 35) return 74
      if (length < 55) return 82
      return 88
    }

    const getPriorityLabel = (score) => {
      if (score >= 82) return '高优先级'
      if (score >= 65) return '中优先级'
      return '低优先级'
    }

    const getPriorityTag = (score) => {
      if (score >= 82) return 'danger'
      if (score >= 65) return 'warning'
      return 'info'
    }

    const extractKeywords = (text) => {
      if (!text) return []
      const seeds = ['供应链', '物流', '库存', '数字化', '碳税', '港口', '采购', '供应商', 'AI', '预测']
      return seeds.filter(item => text.includes(item)).slice(0, 4)
    }

    const getConclusionTitleClass = (type) => {
      if (type === 'opportunity') return 'opportunity-title'
      if (type === 'risk') return 'risk-title'
      return 'recommendations-title'
    }

    const getConclusionNumberClass = (type) => {
      if (type === 'opportunity') return 'opportunity-number'
      if (type === 'risk') return 'risk-number'
      return 'recommendation-number'
    }

    // 获取关键因素（从推演数据中提取）
    const getKeyFactors = (scenario) => {
      const factors = {}
      if (scenario.deduction_results && scenario.deduction_results.length > 0) {
        const firstResult = scenario.deduction_results[0]
        if (firstResult && firstResult.length > 0) {
          const firstTick = firstResult[0]
          if (firstTick && firstTick[1]) {
            if (firstTick[1].Supply_Chain_Disruption_Index !== undefined) {
              factors['Supply_Chain_Disruption_Index'] = '供应链中断指数：核心脆弱性指标，高指数意味着产能恢复周期延长2-3倍，需建立备用产能池。'
            }
            if (firstTick[1].Logistics_Cost_Spike !== undefined) {
              factors['Logistics_Cost_Spike'] = '物流成本飙升倍数：直接影响毛利率，每上升1倍需重新评估运输模式组合。'
            }
            if (firstTick[1].Demand_Volatility !== undefined) {
              factors['Demand_Volatility'] = '需求波动性：高波动环境下传统库存策略失效，需要引入AI预测和动态安全库存。'
            }
            if (firstTick[1].Carbon_Tax_USD !== undefined) {
              factors['Carbon_Tax_USD'] = '碳税成本：推动绿色供应链转型的核心经济杠杆，每吨超过80美元需启动碳抵消策略。'
            }
            if (firstTick[1].AI_Adoption_Level !== undefined) {
              factors['AI_Adoption_Level'] = 'AI采用水平：数字化成熟度关键指标，高于75%可实现预测准确率85%以上。'
            }
          }
        }
      }
      if (Object.keys(factors).length === 0) {
        factors['供应链韧性'] = '供应商多样性、库存策略、物流弹性共同决定供应链抗冲击能力，建议定期压力测试。'
      }
      return factors
    }

    // 情景结果与结论由后端 service/scenario_analysis_service.py 计算
    // 前端只负责展示。

    const store = useSupplyChainStore()

    const sessionId = computed(() =>
      store.currentSessionId || localStorage.getItem('sc_currentSessionId') || ''
    )

    const linkedExperimentId = ref('')

    const applyPayload = (payload) => {
      const data = payload && typeof payload === 'object' ? payload : {}
      scenarioResults.value = Array.isArray(data.scenarios) ? data.scenarios : []
      overallConclusion.value = data.conclusion || null
      linkedExperimentId.value = data.experiment_id || ''
      if (activeScenarioIndex.value >= scenarioResults.value.length) {
        activeScenarioIndex.value = 0
      }
    }

    const ensureSessionOr = () => {
      if (sessionId.value) return true
      ElMessage.warning('请先在「想定生成」中创建会话')
      scenarioResults.value = []
      overallConclusion.value = null
      linkedExperimentId.value = ''
      return false
    }

    const handleStartDeduction = async () => {
      if (isRunning.value) return
      if (!ensureSessionOr()) return
      isRunning.value = true
      progress.value = { running: true, finished: 0, total: 1, running_time: 0 }
      const startTime = Date.now()
      try {
        const response = await triggerScenarioAnalysis(sessionId.value)
        applyPayload(unwrapApiData(response))
        progress.value = {
          running: false,
          finished: 1,
          total: 1,
          running_time: Math.floor((Date.now() - startTime) / 1000)
        }
        ElMessage.success('已生成情景分析结果')
      } catch (e) {
        console.warn('[ScenarioAnalysis] handleStartDeduction failed:', e)
        const message = e?.response?.data?.message || e?.message || '生成情景分析失败'
        ElMessage.warning(message)
        scenarioResults.value = []
        overallConclusion.value = null
        progress.value = { running: false, finished: 0, total: 0, running_time: 0 }
      } finally {
        isRunning.value = false
      }
    }

    const handleRefreshResult = async () => {
      if (isRunning.value) {
        ElMessage.warning('推演进行中，请稍后刷新')
        return
      }
      if (!ensureSessionOr()) return
      try {
        const response = await triggerScenarioAnalysis(sessionId.value)
        applyPayload(unwrapApiData(response))
        ElMessage.success('结果已刷新')
      } catch (e) {
        console.warn('[ScenarioAnalysis] handleRefreshResult failed:', e)
        const message = e?.response?.data?.message || e?.message || '刷新失败'
        ElMessage.warning(message)
      }
    }

    const initData = async () => {
      if (!sessionId.value) return
      try {
        const response = await getScenarioAnalysisBySession(sessionId.value)
        applyPayload(unwrapApiData(response))
      } catch (e) {
        console.warn('[ScenarioAnalysis] initData failed:', e)
        scenarioResults.value = []
        overallConclusion.value = null
      }
    }

    onMounted(() => {
      initData()
    })

    onUnmounted(() => {
      if (progressTimer) {
        clearInterval(progressTimer)
        progressTimer = null
      }
    })

    watch(conclusionTypeOptions, (options) => {
      if (!options.length) return
      const exists = options.some(item => item.value === activeConclusionType.value)
      if (!exists) {
        activeConclusionType.value = options[0].value
      }
    }, { immediate: true })

    watch(activeConclusionType, () => {
      activeConclusionIndex.value = 0
    })

    return {
      isRunning,
      progress,
      scenarioResults,
      overallConclusion,
      activeScenarioIndex,
      activeTab,
      scenarioTypeFilter,
      scenarioKeyword,
      scenarioSortBy,
      scenarioSortOptions,
      displayScenarioResults,
      activeConclusionType,
      activeConclusionIndex,
      hasAnyConclusion,
      conclusionTypeOptions,
      activeConclusionItems,
      averageConclusionScore,
      activeConclusionItem,
      progressPercentage,
      progressColor,
      activeScenario,
      progressFormat,
      formatTime,
      getScenarioTypeLabel,
      getCampTagType,
      getScenarioStabilityScore,
      getScenarioRiskScore,
      getScenarioHealthStatus,
      getScenarioTrendText,
      formatFactorKey,
      formatValue,
      truncateText,
      getConclusionTitleClass,
      getConclusionNumberClass,
      getKeyFactors,
      handleStartDeduction,
      handleRefreshResult
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.scenario-analysis {
  padding: 20px;
  background: linear-gradient(180deg, #f5f7fa 0%, #e8ecf1 100%);
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  overflow-x: hidden;
}

/* ========== 卡片1: 标题区域 ========== */
.card-1 {
  background: linear-gradient(135deg, #6C5CE7 0%, #A55EEA 50%, #9B59B6 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(108, 92, 231, 0.25);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px;
  position: relative;
}

.card-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 10% 20%, rgba(255,255,255,0.1) 0%, transparent 30%),
    radial-gradient(circle at 90% 80%, rgba(255,255,255,0.08) 0%, transparent 25%);
  pointer-events: none;
}

.main-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.5px;
  color: white;
  position: relative;
  z-index: 1;
}

.title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255,255,255,0.2);
  border-radius: 10px;
  font-size: 1.2rem;
}

.action-area {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px;
}

.start-btn {
  background: rgba(255,255,255,0.2) !important;
  border: 1px solid rgba(255,255,255,0.3) !important;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  font-weight: 500;
}

.start-btn:hover {
  background: rgba(255,255,255,0.3) !important;
  transform: translateY(-2px);
}

.refresh-btn {
  background: rgba(255,255,255,0.1) !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  color: white !important;
  font-weight: 500;
}

.refresh-btn:hover {
  background: rgba(255,255,255,0.2) !important;
}

/* ========== 进度区域 ========== */
.progress-section {
  background: white;
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.progress-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
}

.progress-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: white;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-label {
  font-weight: 600;
  font-size: 0.95rem;
  color: #303133;
}

.progress-status {
  font-size: 0.85rem;
  color: #909399;
}

.progress-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 280px;
}

.progress-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 0.85rem;
}

.panel-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f2f5;
}

.scenario-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.scenario-search {
  width: 100%;
}

.scenario-filter-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.scenario-filter {
  width: 120px;
  flex-shrink: 0;
}

.scenario-sort {
  flex: 1;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05rem;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.5;
  color: #c0c4cc;
}

.empty-title {
  font-size: 1rem;
  color: #606266;
  margin: 0 0 6px;
}

.empty-desc {
  font-size: 0.85rem;
  color: #909399;
  margin: 0;
}

.scenario-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  max-height: calc(100% - 80px);
  padding-right: 4px;
}

.scenario-cards::-webkit-scrollbar,
.left-column::-webkit-scrollbar,
.right-column::-webkit-scrollbar,
.timeline-container::-webkit-scrollbar,
.conclusion-list::-webkit-scrollbar {
  width: 6px;
}

.scenario-cards::-webkit-scrollbar-track,
.left-column::-webkit-scrollbar-track,
.right-column::-webkit-scrollbar-track,
.timeline-container::-webkit-scrollbar-track,
.conclusion-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.scenario-cards::-webkit-scrollbar-thumb,
.left-column::-webkit-scrollbar-thumb,
.right-column::-webkit-scrollbar-thumb,
.timeline-container::-webkit-scrollbar-thumb,
.conclusion-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 10px;
}

.scenario-cards::-webkit-scrollbar-thumb:hover,
.left-column::-webkit-scrollbar-thumb:hover,
.right-column::-webkit-scrollbar-thumb:hover,
.timeline-container::-webkit-scrollbar-thumb:hover,
.conclusion-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.scenario-card {
  position: relative;
  padding: 12px 16px;
  background: #fafbfc;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-bottom: 8px;
}

.scenario-card:hover {
  background: #f5f7fa;
  transform: translateX(4px);
}

.scenario-card.active {
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.08) 0%, rgba(165, 94, 234, 0.08) 100%);
  border-color: #6C5CE7;
  box-shadow: 0 4px 16px rgba(108, 92, 231, 0.12);
}

.scenario-card.type-optimistic {
  border-left: 4px solid #4CAF50;
}

.scenario-card.type-pessimistic {
  border-left: 4px solid #F44336;
}

.scenario-card.type-baseline {
  border-left: 4px solid #2196F3;
}

.scenario-card.type-custom {
  border-left: 4px solid #E91E63;
}

.scenario-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.scenario-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.scenario-stats-inline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-item-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: #606266;
}

.stat-item-inline .stat-icon {
  font-size: 1rem;
  color: #909399;
}

.scenario-type-tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.tag-optimistic { 
  background: #E8F5E9; 
  color: #4CAF50; 
}

.tag-pessimistic { 
  background: #FFEBEE; 
  color: #F44336; 
}

.tag-baseline { 
  background: #E3F2FD; 
  color: #2196F3; 
}

.tag-custom { 
  background: #FCE4EC; 
  color: #E91E63; 
}

.scenario-name-tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #F3E5F5;
  color: #7B1FA2;
}

.scenario-desc-compact {
  font-size: 0.8rem;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.scenario-viz-row {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.viz-item {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px;
}

.viz-label {
  display: inline-block;
  margin-bottom: 6px;
  font-size: 0.75rem;
  color: #909399;
}

.scenario-viz-footer {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.stability-score {
  font-size: 0.78rem;
  color: #606266;
}

/* ========== 推演结果详情 ========== */
.detail-tabs {
  margin-top: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.detail-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.detail-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.no-data {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.deduction-results {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.results-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: #f5f7fa;
  border-radius: 8px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #606266;
}

.results-collapse {
  border: none;
  flex: 1;
}

.results-collapse :deep(.el-collapse-item__header) {
  background: #fafbfc;
  border-radius: 8px;
  padding: 0 14px;
  margin-bottom: 6px;
  border: 1px solid #ebeef5;
  font-weight: 500;
}

.results-collapse :deep(.el-collapse-item__wrap) {
  border: none;
}

.results-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 12px;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.collapse-index {
  font-size: 0.85rem;
  color: #6C5CE7;
  font-weight: 600;
}

.collapse-name {
  font-weight: 500;
  color: #303133;
}

.collapse-meta {
  margin-left: auto;
  margin-right: 8px;
}

.expand-btn {
  color: #909399 !important;
  font-size: 0.85rem;
}

.timeline-container {
  max-height: 50vh;
  overflow-y: auto;
  padding: 14px;
  background: #fafbfc;
  border-radius: 8px;
  flex: 1;
}

.timeline-dot {
  width: 26px;
  height: 26px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.timeline-dot.dot-success {
  background: #67c23a;
}

.tick-card {
  padding: 14px 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #ebeef5;
}

.tick-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f2f5;
}

.tick-round {
  font-weight: 600;
  color: #303133;
  font-size: 0.9rem;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #606266;
  margin-bottom: 6px;
}

.world-scenario {
  margin-bottom: 14px;
}

.world-scenario p {
  margin: 0;
  color: #606266;
  font-size: 0.85rem;
  line-height: 1.6;
  background: #f5f7fa;
  padding: 10px 14px;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.factors-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.factors-group {
  background: #fafbfc;
  padding: 10px;
  border-radius: 6px;
}

.factor-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.factor-chip {
  display: inline-flex;
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f7ff 100%);
  border: 1px solid #b3d8ff;
  border-radius: 14px;
  padding: 3px 8px;
  font-size: 0.75rem;
}

.factor-chip.response {
  background: linear-gradient(135deg, #f0e6ff 0%, #f7f0ff 100%);
  border-color: #d0b3ff;
}

.chip-key {
  color: #606266;
  margin-right: 4px;
}

.chip-value {
  color: #409eff;
  font-weight: 500;
}

.factor-chip.response .chip-value {
  color: #9b59b6;
}

.action-section {
  margin-top: 14px;
}

.action-card {
  background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%);
  border: 1px solid #ffd591;
  border-radius: 8px;
  padding: 12px 14px;
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.action-type {
  font-weight: 600;
  color: #d48806;
  font-size: 0.9rem;
}

.action-target {
  font-size: 0.8rem;
  color: #ad6800;
}

.action-declaration {
  font-size: 0.85rem;
  color: #595959;
  line-height: 1.5;
}

/* ========== 统计分析 ========== */
.analysis-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.stat-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 18px;
  text-align: center;
  transition: all 0.3s ease;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.stat-card.success {
  background: linear-gradient(135deg, #f0f9eb 0%, #ffffff 100%);
  border-color: #c2e7b0;
}

.stat-card-icon {
  font-size: 1.6rem;
  margin-bottom: 10px;
}

.stat-card-value {
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-card.success .stat-card-value {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-card-label {
  font-size: 0.8rem;
  color: #909399;
  margin-top: 6px;
}

.subsection-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #303133;
  margin: 0 0 14px;
}

.end-states-section {
  margin-top: 20px;
  flex: 1;
  overflow-y: auto;
}

.end-states-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.end-state-card {
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s ease;
}

.end-state-card:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
}

.end-state-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.end-state-index {
  font-weight: 600;
  color: #606266;
  font-size: 0.85rem;
}

.end-state-stats {
  margin-bottom: 10px;
}

.end-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.end-stat-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #667eea;
}

.end-stat-label {
  font-size: 0.75rem;
  color: #909399;
}

.end-state-scenario {
  font-size: 0.8rem;
  color: #606266;
  line-height: 1.5;
  background: white;
  padding: 8px;
  border-radius: 6px;
}

/* ========== 关键因素 ========== */
.factors-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.key-factors-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  overflow-y: auto;
}

.key-factor-item {
  padding: 14px 16px;
  background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
  border: 1px solid #e8ecf1;
  border-radius: 10px;
  border-left: 4px solid #6C5CE7;
}

.factor-name {
  margin-bottom: 8px;
  font-size: 0.95rem;
}

.factor-name strong {
  color: #303133;
}

.factor-desc-label {
  font-size: 0.8rem;
  color: #909399;
  margin-left: 6px;
}

.factor-desc {
  font-size: 0.85rem;
  color: #606266;
  line-height: 1.7;
}

.impact-section {
  margin-top: 20px;
}

.impact-card {
  background: linear-gradient(135deg, #fff7e6 0%, #fffbf0 100%);
  border: 1px solid #ffd591;
  border-radius: 10px;
  padding: 16px 18px;
}

.impact-card p {
  margin: 0;
  color: #595959;
  line-height: 1.7;
  font-size: 0.9rem;
}

/* ========== 动画 ========== */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* ========== 三栏布局 ========== */
.three-column-container {
  display: flex;
  flex: 1;
  gap: 20px;
  height: 0;
}

.left-column {
  flex: 1;
  background: white;
  border-radius: 16px;
  padding: 20px;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.middle-column {
  flex: 1.5;
  background: white;
  border-radius: 16px;
  padding: 20px;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.right-column {
  flex: 1;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-column .panel-header {
  padding: 20px 20px 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f2f5;
}

.conclusion-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.conclusion-switcher {
  margin-bottom: 12px;
}

.conclusion-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.overview-item {
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px 10px;
}

.overview-label {
  display: block;
  font-size: 0.75rem;
  color: #909399;
}

.overview-value {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
}

.conclusion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.enhanced-list {
  margin-bottom: 14px;
}

.conclusion-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.conclusion-item.active {
  box-shadow: 0 0 0 1px #409eff inset, 0 2px 8px rgba(64, 158, 255, 0.16);
}

.conclusion-main {
  flex: 1;
}

.conclusion-item-meta {
  margin: 6px 0 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.confidence {
  font-size: 0.75rem;
  color: #909399;
}

.opportunity-item {
  background: linear-gradient(135deg, #f0f9eb 0%, #f6fbf3 100%);
  border: 1px solid #c2e7b0;
}

.risk-item {
  background: linear-gradient(135deg, #fff1f0 0%, #fff7f6 100%);
  border: 1px solid #fde2e2;
}

.recommendation-item {
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f7ff 100%);
  border: 1px solid #b3d8ff;
}

.conclusion-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.item-number {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  flex-shrink: 0;
}

.opportunity-number {
  background: #67c23a;
  color: white;
}

.risk-number {
  background: #f56c6c;
  color: white;
}

.recommendation-number {
  background: #409eff;
  color: white;
}

.item-text {
  font-size: 0.8rem;
  color: #606266;
  line-height: 1.5;
  word-break: break-word;
}

.conclusion-detail {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #fff;
  padding: 12px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.conclusion-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
}

.opportunity-title {
  color: #67c23a !important;
}

.risk-title {
  color: #f56c6c !important;
}

.recommendations-title {
  color: #409eff !important;
}

.detail-text {
  margin: 0;
  font-size: 0.85rem;
  color: #606266;
  line-height: 1.6;
}

.detail-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.empty-conclusion {
  text-align: center;
  padding: 20px 16px;
  color: #c0c4cc;
}

.empty-conclusion p {
  margin: 0;
  font-size: 0.85rem;
}
</style>
