<template>
  <div class="post-intervention-page">
    <section class="page-head">
      <div>
        <p class="eyebrow">SCNET INTERVENTION ANALYSIS</p>
        <h1>干预分析</h1>
        <p class="subtitle">基于事中供应链结果追加反事实实验，并按实验序列评估产能、协作与履约指标变化。</p>
      </div>
    </section>

    <div class="intervention-layout">
      <!-- ======== 左：干预策略选择 ======== -->
      <section class="case-select-panel">
        <div class="case-select-grid">
          <!-- 干预策略库（文件树） -->
          <aside class="case-library">
            <div class="library-head">
              <el-icon><Folder /></el-icon>
              <span>干预策略库</span>
            </div>
            <div class="slot-switch">
              <el-radio-group v-model="activeStrategySlot" size="small">
                <el-radio-button label="primary">选择策略A</el-radio-button>
                <el-radio-button label="secondary">选择策略B</el-radio-button>
              </el-radio-group>
            </div>
            <div class="library-tree">
              <div
                v-for="folder in strategyFolders"
                :key="folder.id"
                class="tree-folder"
              >
                <div
                  class="tree-folder-head"
                  :class="{ expanded: folder.expanded }"
                  @click="folder.expanded = !folder.expanded"
                >
                  <el-icon><component :is="folderToggleIcon(folder.expanded)" /></el-icon>
                  <el-icon><FolderOpened v-if="folder.expanded" /><Folder v-else /></el-icon>
                  <span class="folder-name">{{ folder.label }}</span>
                  <span class="folder-count">{{ folder.children.length }}</span>
                </div>
                <div v-show="folder.expanded" class="tree-folder-children">
                  <div
                    v-for="child in folder.children"
                    :key="child.id"
                    class="tree-leaf"
                    :class="{
                      active: isStrategySelected(child.id),
                      'active-primary': currentStrategy.id === child.id,
                      'active-secondary': selectedStrategy?.id === child.id
                    }"
                    @click="selectStrategy(child)"
                  >
                    <el-icon><Document /></el-icon>
                    <span class="leaf-name">{{ child.name }}</span>
                    <span v-if="currentStrategy.id === child.id" class="leaf-badge leaf-badge--primary">A</span>
                    <span v-if="selectedStrategy?.id === child.id" class="leaf-badge leaf-badge--secondary">B</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <!-- 当前干预策略 -->
          <div class="current-experiment">
            <!-- 上方面板：对比策略A信息 -->
            <div
              class="info-card info-card--primary"
              :class="{ 'info-card--active': activeStrategySlot === 'primary' }"
              @click="setActiveStrategySlot('primary')"
            >
              <div class="info-card-head">
                <div class="info-card-title">
                  <el-icon><DataAnalysis /></el-icon>
                  <span>对比策略 A</span>
                </div>
                <el-tag v-if="activeStrategySlot === 'primary'" size="small" type="primary" round>正在选择</el-tag>
              </div>
              <div class="info-card-body">
                <div class="info-row" v-for="f in strategyInfoFields" :key="f.key">
                  <span class="info-label">{{ f.label }}</span>
                  <span class="info-value">{{ currentStrategy[f.key] || '--' }}</span>
                </div>
              </div>
            </div>

            <!-- 下方面板：对比策略B信息 -->
            <div
              class="info-card info-card--secondary"
              :class="{ 'info-card--active': activeStrategySlot === 'secondary' }"
              @click="setActiveStrategySlot('secondary')"
            >
              <div class="info-card-head">
                <div class="info-card-title">
                  <el-icon><Collection /></el-icon>
                  <span>对比策略 B</span>
                </div>
                <el-tag v-if="activeStrategySlot === 'secondary'" size="small" type="success" round>正在选择</el-tag>
              </div>
              <div class="info-card-body">
                <div class="info-row" v-for="f in strategyInfoFields" :key="f.key">
                  <span class="info-label">{{ f.label }}</span>
                  <span class="info-value" :class="{ muted: !selectedStrategy }">{{ selectedStrategy?.[f.key] || '--' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ======== 右：干预策略对比 ======== -->
      <section class="compare-panel">
        <div class="compare-inner">
          <header class="compare-head">
            <div class="compare-head-left">
              <el-icon :size="18"><TrendCharts /></el-icon>
              <span>干预策略对比</span>
            </div>
            <el-tag size="small" type="info" round>对比视图</el-tag>
          </header>

          <div class="compare-body">
            <div v-if="!currentStrategy.id || !selectedStrategy" class="compare-empty">
              <el-icon :size="44"><TrendCharts /></el-icon>
              <p>选择两个干预策略后查看对比详情</p>
              <span>先指定策略A或策略B，再在左侧干预策略库中点击策略，即可组成可调整的双策略对比</span>
            </div>

            <div v-else class="compare-content">
              <!-- 策略A横向信息行 -->
              <div class="card-pair-row">
                <div class="cmp-card cmp-card--blue">
                  <div class="cmp-card-head">
                    <el-icon><Setting /></el-icon>
                    <span>策略A · 策略参数</span>
                    <div class="cmp-card-pip blue"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="p in strategyParamFields" :key="p.key">
                      <span class="cmp-kv-label">{{ p.label }}</span>
                      <span class="cmp-kv-value">{{ currentStrategy[p.key] || '--' }}</span>
                    </div>
                  </div>
                </div>

                <div class="cmp-card cmp-card--teal">
                  <div class="cmp-card-head">
                    <el-icon><DataLine /></el-icon>
                    <span>策略A · 预期效果</span>
                    <div class="cmp-card-pip teal"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="r in strategyResultFields" :key="r.key">
                      <span class="cmp-kv-label">{{ r.label }}</span>
                      <span class="cmp-kv-value">{{ currentStrategy[r.key] || '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 策略B横向信息行 -->
              <div class="card-pair-row">
                <div class="cmp-card cmp-card--purple">
                  <div class="cmp-card-head">
                    <el-icon><Setting /></el-icon>
                    <span>策略B · 策略参数</span>
                    <div class="cmp-card-pip purple"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="p in strategyParamFields" :key="p.key">
                      <span class="cmp-kv-label">{{ p.label }}</span>
                      <span class="cmp-kv-value">{{ selectedStrategy[p.key] || '--' }}</span>
                    </div>
                  </div>
                </div>

                <div class="cmp-card cmp-card--amber">
                  <div class="cmp-card-head">
                    <el-icon><DataLine /></el-icon>
                    <span>策略B · 预期效果</span>
                    <div class="cmp-card-pip amber"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="r in strategyResultFields" :key="r.key">
                      <span class="cmp-kv-label">{{ r.label }}</span>
                      <span class="cmp-kv-value">{{ selectedStrategy[r.key] || '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="runtime-panel">
              <div class="runtime-head">
                <div class="runtime-title">
                  <el-icon><VideoPlay /></el-icon>
                  <span>干预策略实际运行</span>
                </div>
                <div class="runtime-actions">
                  <el-tag size="small" type="info" round>基础实验 · 15轮</el-tag>
                  <el-button
                    type="primary"
                    size="small"
                    :icon="VideoPlay"
                    :loading="runState.running"
                    @click="startInterventionRun"
                  >
                    {{ runState.running ? '运行中' : '开始运行' }}
                  </el-button>
                  <el-dropdown trigger="click" @command="exportRunReport">
                    <el-button size="small" plain :icon="Download" :disabled="!hasRunResults">
                      导出结果
                      <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="html">HTML（.html）</el-dropdown-item>
                        <el-dropdown-item command="txt">文本（.txt）</el-dropdown-item>
                        <el-dropdown-item command="pdf">PDF（打印保存）</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>

              <div class="runtime-problem">
                <span>实验问题</span>
                <strong>{{ interventionProblem }}</strong>
              </div>

              <div class="runtime-status-grid">
                <div
                  v-for="slot in strategySlots"
                  :key="slot.key"
                  class="runtime-status-card"
                  :class="`runtime-status-card--${slot.key}`"
                >
                  <div class="runtime-status-top">
                    <span>{{ slot.label }}</span>
                    <el-tag size="small" :type="taskStatusType(runState.tasks[slot.key]?.status)" round>
                      {{ taskStatusText(runState.tasks[slot.key]?.status) }}
                    </el-tag>
                  </div>
                  <strong>{{ slot.strategy?.name || '--' }}</strong>
                  <p>{{ runState.tasks[slot.key]?.taskId || '等待提交实验任务' }}</p>
                </div>
              </div>

              <div v-if="runState.error" class="runtime-alert runtime-alert--error">
                {{ runState.error }}
              </div>
              <div v-else class="runtime-alert">
                {{ runState.message }}
              </div>

              <div v-if="hasRunResults" class="runtime-result">
                <div class="runtime-result-head">
                  <span>运行结果对比</span>
                  <el-tag size="small" type="success" round>已完成</el-tag>
                </div>
                <div class="result-table">
                  <div class="result-row result-row--head">
                    <span>指标</span>
                    <span>策略A</span>
                    <span>策略B</span>
                  </div>
                  <div class="result-row" v-for="row in runComparisonRows" :key="row.key">
                    <span>{{ row.label }}</span>
                    <span :class="{ winner: isBetterRunValue(row, 'primary') }">{{ row.primary }}</span>
                    <span :class="{ winner: isBetterRunValue(row, 'secondary') }">{{ row.secondary }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="runtime-placeholder">
                <el-icon><TrendCharts /></el-icon>
                <span>运行完成后将在这里展示两个干预策略下的完成率、积压、协作与韧性指标。</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowDown, ArrowRight, Collection, DataAnalysis, DataLine, Document, Download, Folder,
  FolderOpened, Setting, TrendCharts, VideoPlay
} from '@element-plus/icons-vue'
import { runExperiment } from '@/api/scenarioModeling'
import { getQueueHistory } from '@/api/queue'
import { getExperimentDetail, getInterventionStrategies, compareInterventions } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'

// 后端加载的策略数据
const backendStrategies = ref([])
const backendComparison = ref(null)
const strategiesLoading = ref(false)
const strategiesLoaded = ref(false)

// 将后端策略转换为前端策略库格式
const mapBackendStrategyToFrontend = (s) => ({
  id: s.id,
  name: s.name,
  target: s.type === 'capacity_expansion' ? '制造商' : s.type === 'collaboration' ? '制造商网络' : s.type === 'inventory_management' ? '销售商' : s.type === 'supplier_selection' ? '供应商' : '全网络',
  phase: '事中',
  expectedCompletionDelta: `+${((s.outcomes?.completion_rate || 0.7) * 100 - 50).toFixed(1)}pp`,
  backlogImprovement: `${((1 - (s.outcomes?.completion_rate || 0.7)) * 100).toFixed(1)}%`,
  collaborationDelta: `+${s.params?.final_collaborations || 0} 次`,
  resilienceDelta: `+${((s.outcomes?.network_density || 0.3) * 1.0).toFixed(2)}`,
  type: s.type === 'capacity_expansion' ? '产能扩张' : s.type === 'collaboration' ? '协作优化' : s.type === 'emergency_response' ? '应急响应' : s.type === 'inventory_management' ? '库存缓冲' : s.type === 'pricing_strategy' ? '价格策略' : s.type === 'scheduling_optimization' ? '调度优化' : s.type === 'supplier_selection' ? '供应商筛选' : '基准策略',
  scope: s.type === 'capacity_expansion' ? (s.id.includes('bottleneck') ? '定向瓶颈' : '全局制造') : '全网络',
  mechanism: s.type === 'capacity_expansion' ? '阶梯式扩产' : s.type === 'collaboration' ? '动态订单调度' : s.type === 'inventory_management' ? '安全库存扩容' : s.type === 'emergency_response' ? '应急预案激活' : s.type === 'supplier_selection' ? '多源供应保障' : '基础运行',
  trigger: s.has_extreme_scenario ? '极端事件触发' : (s.outcomes?.completion_rate < 0.5 ? '完成率低于50%' : '基础策略'),
  _backend: s
})

// 从后端加载策略数据并合并到 strategyFolders
const loadStrategiesFromBackend = async () => {
  strategiesLoading.value = true
  try {
    const expRes = await getExperimentDetail
    // 先获取实验列表
    const { getExperiments } = await import('@/api/supplyChain')
    const listRes = await getExperiments()
    const experiments = unwrapApiData(listRes) || []

    if (!experiments || experiments.length === 0) return

    const latest = experiments[0]
    const experimentId = latest.experiment_id || latest.id
    if (!experimentId) return

    // 加载策略库
    const stratRes = await getInterventionStrategies(experimentId)
    const stratData = unwrapApiData(stratRes)
    if (stratData?.strategies && stratData.strategies.length > 0) {
      backendStrategies.value = stratData.strategies

      // 按策略类型分组，构建前端策略库
      const typeGroups = {}
      stratData.strategies.forEach(s => {
        const mapped = mapBackendStrategyToFrontend(s)
        const typeLabel = mapped.type
        if (!typeGroups[typeLabel]) {
          typeGroups[typeLabel] = []
        }
        typeGroups[typeLabel].push(mapped)
      })

      // 转换为 strategyFolders 格式
      const newFolders = Object.entries(typeGroups).map(([label, children], idx) => ({
        id: `f_bk_${idx}`,
        label,
        expanded: idx < 2,
        children
      }))

      if (newFolders.length > 0) {
        // 清空并更新策略库
        strategyFolders.splice(0, strategyFolders.length, ...newFolders)

        // 更新当前选中的策略
        const allChildren = newFolders.flatMap(f => f.children)
        if (allChildren.length >= 2) {
          Object.assign(currentStrategy, allChildren[0])
          selectedStrategy.value = { ...allChildren[1] }
        }

        strategiesLoaded.value = true
        ElMessage.success(`已从实验 ${experimentId} 加载 ${stratData.total_strategies} 条干预策略`)
      }
    }
  } catch (e) {
    console.warn('从后端加载策略数据失败，使用默认策略库:', e)
  } finally {
    strategiesLoading.value = false
  }
}

const strategyFolders = reactive([
  {
    id: 'f1',
    label: '产能干预',
    expanded: true,
    children: [
      { id: 's1', name: '制造总产能 +15%', target: '制造商', phase: '事中', expectedCompletionDelta: '+14.7pp', backlogImprovement: '-22.5%', collaborationDelta: '+13 次', resilienceDelta: '+0.29', type: '产能扩张', scope: '全局制造', mechanism: '阶梯式扩产', trigger: '订单积压 > 20%' },
      { id: 's2', name: '瓶颈工厂定向扩产', target: '瓶颈工厂', phase: '事中', expectedCompletionDelta: '+9.2pp', backlogImprovement: '-15.1%', collaborationDelta: '+5 次', resilienceDelta: '+0.14', type: '产能扩张', scope: '定向瓶颈', mechanism: '高峰前置扩产', trigger: '单厂利用率 > 90%' }
    ]
  },
  {
    id: 'f2',
    label: '协作干预',
    expanded: true,
    children: [
      { id: 's3', name: '工厂协作范围 +20%', target: '制造商网络', phase: '事中', expectedCompletionDelta: '+11.3pp', backlogImprovement: '-18.7%', collaborationDelta: '+22 次', resilienceDelta: '+0.35', type: '协作优化', scope: '全网络', mechanism: '动态订单调度', trigger: '跨厂协作 < 阈值' },
      { id: 's4', name: '供应商协作强化', target: '供应商层级', phase: '事中', expectedCompletionDelta: '+5.8pp', backlogImprovement: '-9.4%', collaborationDelta: '+16 次', resilienceDelta: '+0.21', type: '协作优化', scope: '上游供应', mechanism: '供应商协同交付', trigger: '供应延迟 > 3天' }
    ]
  },
  {
    id: 'f3',
    label: '库存与缓冲干预',
    expanded: false,
    children: [
      { id: 's5', name: '库存容量上限 +25%', target: '销售商', phase: '事中', expectedCompletionDelta: '+8.5pp', backlogImprovement: '-12.0%', collaborationDelta: '+3 次', resilienceDelta: '+0.18', type: '库存缓冲', scope: '全局库存', mechanism: '安全库存扩容', trigger: '库存周转 < 1.5' },
      { id: 's6', name: '供应保障能力 +20%', target: '供应商', phase: '事前', expectedCompletionDelta: '+6.2pp', backlogImprovement: '-8.8%', collaborationDelta: '+8 次', resilienceDelta: '+0.22', type: '供应保障', scope: '上游供给', mechanism: '多源供应保障', trigger: '供应中断风险预警' }
    ]
  }
])

const activeStrategySlot = ref('secondary')

const strategyInfoFields = [
  { key: 'name', label: '策略名称' },
  { key: 'type', label: '策略类型' },
  { key: 'target', label: '作用对象' },
  { key: 'scope', label: '作用范围' },
  { key: 'mechanism', label: '实施机制' },
  { key: 'trigger', label: '触发条件' }
]

const strategyParamFields = [
  { key: 'type', label: '策略类型' },
  { key: 'target', label: '作用对象' },
  { key: 'scope', label: '作用范围' },
  { key: 'mechanism', label: '实施机制' }
]

const strategyResultFields = [
  { key: 'expectedCompletionDelta', label: '完成率变化' },
  { key: 'backlogImprovement', label: '积压改善' },
  { key: 'collaborationDelta', label: '协作变化' },
  { key: 'resilienceDelta', label: '韧性变化' }
]

const currentStrategy = reactive({ ...strategyFolders[0].children[0] })
const selectedStrategy = ref({ ...strategyFolders[1].children[0] })
const interventionProblem = '市场需求强度上升时，制造总产能需要如何调整，才能减少订单积压并保持完成率稳定？'
const interventionIterations = 15
const pollingIntervalMs = 5000

const runState = reactive({
  running: false,
  message: '尚未提交实际运行任务。选择策略A与策略B后，点击“开始运行”即可分别提交后端仿真实验。',
  error: '',
  startedAt: '',
  completedAt: '',
  tasks: {
    primary: null,
    secondary: null
  },
  results: {
    primary: null,
    secondary: null
  }
})

const strategySlots = computed(() => [
  { key: 'primary', label: '策略A', strategy: currentStrategy },
  { key: 'secondary', label: '策略B', strategy: selectedStrategy.value }
])

const hasRunResults = computed(() => Boolean(runState.results.primary && runState.results.secondary))

const runComparisonRows = computed(() => {
  const primary = runState.results.primary
  const secondary = runState.results.secondary
  if (!primary || !secondary) return []

  return [
    {
      key: 'completionRate',
      label: '订单完成率',
      primary: formatPercent(primary.completionRate),
      secondary: formatPercent(secondary.completionRate),
      rawPrimary: primary.completionRate,
      rawSecondary: secondary.completionRate,
      direction: 'higher'
    },
    {
      key: 'backlogRate',
      label: '订单积压率',
      primary: formatPercent(primary.backlogRate),
      secondary: formatPercent(secondary.backlogRate),
      rawPrimary: primary.backlogRate,
      rawSecondary: secondary.backlogRate,
      direction: 'lower'
    },
    {
      key: 'overallScore',
      label: '综合得分',
      primary: formatNumber(primary.overallScore, 3),
      secondary: formatNumber(secondary.overallScore, 3),
      rawPrimary: primary.overallScore,
      rawSecondary: secondary.overallScore,
      direction: 'higher'
    },
    {
      key: 'cooperationCount',
      label: '协作次数',
      primary: formatInteger(primary.cooperationCount),
      secondary: formatInteger(secondary.cooperationCount),
      rawPrimary: primary.cooperationCount,
      rawSecondary: secondary.cooperationCount,
      direction: 'higher'
    },
    {
      key: 'netProfit',
      label: '总净利润',
      primary: formatNumber(primary.netProfit, 1),
      secondary: formatNumber(secondary.netProfit, 1),
      rawPrimary: primary.netProfit,
      rawSecondary: secondary.netProfit,
      direction: 'higher'
    },
    {
      key: 'bestIteration',
      label: '最佳迭代',
      primary: primary.bestIteration || '--',
      secondary: secondary.bestIteration || '--'
    },
    {
      key: 'capacityRange',
      label: '最佳产能区间',
      primary: formatRange(primary.capacityRange),
      secondary: formatRange(secondary.capacityRange)
    },
    {
      key: 'reproductionThreshold',
      label: '繁殖阈值',
      primary: formatNumber(primary.reproductionThreshold, 0),
      secondary: formatNumber(secondary.reproductionThreshold, 0)
    }
  ]
})

let runPollingTimer = null

const baseRunPayload = () => ({
  scenario: 'supply_chain',
  iterations: interventionIterations,
  model: 'qwen',
  planner_strategy: 'native',
  use_decompose: false,
  enable_llm: false,
  llm_enabled: false,
  user_goal: interventionProblem,
  phase: 'post',
  source_page: 'ExpAnalysis_Intervention',
  baseline_demo: 'SCnet full 15-iteration backend simulation demo'
})

const strategyRuntimeConfig = (strategy = {}) => {
  const configs = {
    s1: {
      paramOverrides: {
        order_multiplier: 1.25,
        factory_capacity_range: [288, 460],
        reproduction_threshold: 600
      },
      agentNodeConfigs: {
        factory: { params: { capacity_range: [288, 460] } },
        manufacturing_corporation: { params: { capacity_range: [288, 460] } }
      }
    },
    s2: {
      paramOverrides: {
        order_multiplier: 1.25,
        factory_capacity_range: [320, 500],
        reproduction_threshold: 600
      },
      agentNodeConfigs: {
        factory: { params: { capacity_range: [320, 500] } },
        manufacturing_corporation: { params: { capacity_range: [320, 500], max_concurrent_orders: 1800 } }
      }
    },
    s3: {
      paramOverrides: {
        order_multiplier: 1.25,
        factory_capacity_range: [250, 400],
        reproduction_threshold: 600
      },
      agentNodeConfigs: {
        manufacturing_corporation: {
          params: {
            collaboration_radius: 2160,
            max_collaboration_factories: 36,
            max_concurrent_orders: 1700
          }
        }
      }
    },
    s4: {
      paramOverrides: {
        order_multiplier: 1.25,
        factory_capacity_range: [250, 400],
        reproduction_threshold: 560
      },
      agentNodeConfigs: {
        manufacturing_corporation: {
          params: {
            collaboration_radius: 1980,
            max_collaboration_factories: 34
          }
        }
      }
    },
    s5: {
      paramOverrides: {
        order_multiplier: 1.25,
        factory_capacity_range: [250, 400],
        reproduction_threshold: 600
      },
      agentNodeConfigs: {
        retailer: { params: { inventory_capacity: [63, 188] } }
      }
    },
    s6: {
      paramOverrides: {
        order_multiplier: 1.25,
        factory_capacity_range: [270, 430],
        reproduction_threshold: 520
      },
      agentNodeConfigs: {
        factory: { params: { capacity_range: [270, 430] } },
        manufacturing_corporation: { params: { max_concurrent_orders: 1800 } }
      }
    }
  }

  return configs[strategy.id] || {
    paramOverrides: {
      order_multiplier: 1.25,
      factory_capacity_range: [250, 400],
      reproduction_threshold: 600
    },
    agentNodeConfigs: {}
  }
}

const buildInterventionRunPayload = (slotKey, strategy) => {
  const runtimeConfig = strategyRuntimeConfig(strategy)
  return {
    ...baseRunPayload(),
    intervention_slot: slotKey === 'primary' ? 'A' : 'B',
    intervention_strategy_id: strategy.id,
    intervention_strategy_name: strategy.name,
    intervention_strategy_type: strategy.type,
    intervention_strategy_payload: {
      target: strategy.target,
      scope: strategy.scope,
      mechanism: strategy.mechanism,
      trigger: strategy.trigger,
      param_overrides: runtimeConfig.paramOverrides
    },
    subtask_variable_configs: {
      intervention_runtime: {
        paramOverrides: runtimeConfig.paramOverrides
      }
    },
    agent_node_configs: runtimeConfig.agentNodeConfigs,
    scenario_context: {
      actual_problem: interventionProblem,
      selected_strategy: strategy.name,
      strategy_slot: slotKey === 'primary' ? '策略A' : '策略B'
    }
  }
}

const resetRunState = () => {
  stopRunPolling()
  runState.running = false
  runState.error = ''
  runState.startedAt = ''
  runState.completedAt = ''
  runState.message = '正在准备提交两个干预策略的后端实验任务...'
  runState.tasks.primary = null
  runState.tasks.secondary = null
  runState.results.primary = null
  runState.results.secondary = null
}

const sleep = (ms) => new Promise(resolve => window.setTimeout(resolve, ms))

const startInterventionRun = async () => {
  if (runState.running) return
  if (!currentStrategy.id || !selectedStrategy.value?.id) {
    ElMessage.warning('请先选择策略A和策略B，再开始运行')
    return
  }

  resetRunState()
  runState.running = true
  runState.startedAt = new Date().toLocaleString()

  try {
    for (const slot of strategySlots.value) {
      const payload = buildInterventionRunPayload(slot.key, slot.strategy)
      const response = unwrapApiData(await runExperiment(payload))
      if (!response?.task_id || response.status === 'error') {
        throw new Error(response?.message || `${slot.label}实验任务提交失败`)
      }
      runState.tasks[slot.key] = {
        taskId: response.task_id,
        status: response.status || 'queued',
        position: response.position,
        strategyName: slot.strategy.name,
        resultPath: '',
        experimentId: ''
      }
      await sleep(30)
    }

    runState.message = '两个干预策略已提交后端队列，正在等待实际仿真实验完成...'
    ElMessage.success('两个干预策略实验已提交后端队列')
    startRunPolling()
  } catch (error) {
    runState.running = false
    runState.error = `提交失败：${error?.message || '未知错误'}`
    ElMessage.error(runState.error)
  }
}

const startRunPolling = () => {
  stopRunPolling()
  runPollingTimer = window.setInterval(pollRunTasks, pollingIntervalMs)
  pollRunTasks()
}

const stopRunPolling = () => {
  if (runPollingTimer) {
    window.clearInterval(runPollingTimer)
    runPollingTimer = null
  }
}

const pollRunTasks = async () => {
  const taskIds = strategySlots.value
    .map(slot => runState.tasks[slot.key]?.taskId)
    .filter(Boolean)

  if (!taskIds.length) return

  try {
    const history = unwrapApiData(await getQueueHistory(80)) || []
    for (const slot of strategySlots.value) {
      const task = runState.tasks[slot.key]
      if (!task?.taskId) continue

      const found = history.find(item => item.task_id === task.taskId)
      if (!found) continue

      task.status = found.status || task.status
      task.resultPath = found.result_path || task.resultPath
      if (found.status === 'failed') {
        task.error = found.error_message || '后端实验运行失败'
      }

      if (found.status === 'completed' && found.result_path && !runState.results[slot.key]) {
        const experimentId = extractExperimentId(found.result_path)
        task.experimentId = experimentId
        if (experimentId) {
          const detail = unwrapApiData(await getExperimentDetail(experimentId))
          runState.results[slot.key] = summarizeExperimentResult(detail, slot.strategy, task)
        }
      }
    }

    const failedTask = strategySlots.value
      .map(slot => runState.tasks[slot.key])
      .find(task => task?.status === 'failed')

    if (failedTask) {
      runState.running = false
      runState.error = `实验运行失败：${failedTask.error || failedTask.taskId}`
      stopRunPolling()
      return
    }

    if (hasRunResults.value) {
      runState.running = false
      runState.completedAt = new Date().toLocaleString()
      runState.message = '两个干预策略的后端实验均已完成，结果对比已更新。'
      stopRunPolling()
      ElMessage.success('干预策略实际运行完成')
      return
    }

    const statuses = strategySlots.value
      .map(slot => `${slot.label}${taskStatusText(runState.tasks[slot.key]?.status)}`)
      .join('，')
    runState.message = `后端实验运行中：${statuses}`
  } catch (error) {
    runState.message = `轮询队列状态失败，稍后自动重试：${error?.message || '未知错误'}`
  }
}

const extractExperimentId = (resultPath = '') => {
  const matched = String(resultPath).match(/multi_agent_report_(\d{8}_\d{6})\.json$/)
  return matched ? matched[1] : ''
}

const findBestIteration = (iterations = []) => {
  if (!Array.isArray(iterations) || !iterations.length) return null
  return iterations.reduce((best, item) => {
    const bestScore = toNumber(best?.feedback?.overall_score, -1)
    const itemScore = toNumber(item?.feedback?.overall_score, -1)
    return itemScore > bestScore ? item : best
  }, iterations[0])
}

const summarizeExperimentResult = (detail = {}, strategy = {}, task = {}) => {
  const iterations = detail.iterations || []
  const best = findBestIteration(iterations) || {}
  const metrics = best.simulation_result?.metrics || {}
  const params = best.task?.parameters || {}
  const totalOrders = toNumber(metrics.total_orders)
  const completedOrders = toNumber(metrics.completed_orders)
  const backlog = Math.max(totalOrders - completedOrders, 0)

  return {
    strategyName: task.strategyName || strategy.name,
    experimentId: detail.experiment_id || task.experimentId,
    taskId: task.taskId,
    bestIteration: best.iteration,
    completionRate: toNumber(metrics.order_completion_rate, null),
    backlogRate: totalOrders > 0 ? backlog / totalOrders : null,
    totalOrders,
    completedOrders,
    backlog,
    cooperationCount: toNumber(metrics.cooperation_count ?? metrics.collaboration_count, null),
    netProfit: toNumber(metrics.total_net_profit, null),
    overallScore: toNumber(best.feedback?.overall_score, null),
    capacityRange: params.factory_capacity_range || params.manufacturer_production_capacity_range,
    reproductionThreshold: toNumber(params.reproduction_threshold, null),
    orderMultiplier: toNumber(params.order_multiplier, null),
    rawParameters: params
  }
}

const toNumber = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const formatPercent = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return `${(num * 100).toFixed(1)}%`
}

const formatNumber = (value, digits = 2) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return num.toFixed(digits)
}

const formatInteger = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return `${Math.round(num)}`
}

const formatRange = (value) => {
  if (!Array.isArray(value) || value.length < 2) return '--'
  return `${formatNumber(value[0], 0)}-${formatNumber(value[1], 0)}`
}

const taskStatusText = (status) => {
  const textMap = {
    queued: '排队中',
    pending: '排队中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return textMap[status] || '未提交'
}

const taskStatusType = (status) => {
  const typeMap = {
    queued: 'info',
    pending: 'info',
    running: 'warning',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return typeMap[status] || 'info'
}

const isBetterRunValue = (row, slotKey) => {
  if (!row.direction) return false
  const left = Number(row.rawPrimary)
  const right = Number(row.rawSecondary)
  if (!Number.isFinite(left) || !Number.isFinite(right) || left === right) return false
  if (row.direction === 'lower') {
    return slotKey === 'primary' ? left < right : right < left
  }
  return slotKey === 'primary' ? left > right : right > left
}

const buildRunReportText = () => {
  const lines = [
    '干预策略实际运行报告',
    `生成时间：${new Date().toLocaleString()}`,
    `实验问题：${interventionProblem}`,
    `基础实验：${interventionIterations}轮 / native planner / supply_chain`,
    '',
    `策略A：${currentStrategy.name}`,
    `策略B：${selectedStrategy.value?.name || '--'}`,
    '',
    '运行结果对比',
    ...runComparisonRows.value.map(row => `${row.label}：策略A=${row.primary}；策略B=${row.secondary}`)
  ]
  return lines.join('\n')
}

const escapeHtml = (value) => String(value ?? '--')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const buildRunReportHtml = () => {
  const rows = runComparisonRows.value.map(row => `
    <tr>
      <th>${escapeHtml(row.label)}</th>
      <td>${escapeHtml(row.primary)}</td>
      <td>${escapeHtml(row.secondary)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>干预策略实际运行报告</title>
  <style>
    body { margin: 0; padding: 28px; color: #0f172a; font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.6; background: #f8fafc; }
    main { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px; }
    h1 { margin: 0 0 8px; font-size: 26px; }
    .meta { color: #64748b; margin-bottom: 18px; }
    .problem { padding: 12px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; color: #1e40af; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { width: 180px; background: #f1f5f9; }
    thead th { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <main>
    <h1>干预策略实际运行报告</h1>
    <div class="meta">生成时间：${new Date().toLocaleString()}；基础实验：${interventionIterations}轮</div>
    <div class="problem">${escapeHtml(interventionProblem)}</div>
    <p><strong>策略A：</strong>${escapeHtml(currentStrategy.name)}</p>
    <p><strong>策略B：</strong>${escapeHtml(selectedStrategy.value?.name)}</p>
    <table>
      <thead><tr><th>指标</th><th>策略A</th><th>策略B</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>`
}

const downloadRunFile = (content, filename, type) => {
  const blob = new Blob([content], { type })
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(blob)
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}

const exportRunReport = (format = 'html') => {
  if (!hasRunResults.value) {
    ElMessage.warning('请先完成两个干预策略的实际运行，再导出结果')
    return
  }

  const safeName = `${currentStrategy.name}_vs_${selectedStrategy.value?.name || '策略B'}`.replace(/[\\/:*?"<>|]/g, '_')
  if (format === 'txt') {
    downloadRunFile(buildRunReportText(), `干预策略实际运行报告_${safeName}.txt`, 'text/plain;charset=utf-8')
    ElMessage.success('实际运行报告已导出为TXT')
    return
  }

  if (format === 'pdf') {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      ElMessage.warning('浏览器拦截了PDF打印窗口，请允许弹窗后重试')
      return
    }
    printWindow.document.open()
    printWindow.document.write(buildRunReportHtml())
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => printWindow.print(), 300)
    ElMessage.success('已打开PDF打印窗口，请选择“保存为PDF”')
    return
  }

  downloadRunFile(buildRunReportHtml(), `干预策略实际运行报告_${safeName}.html`, 'text/html;charset=utf-8')
  ElMessage.success('实际运行报告已导出为HTML')
}

onMounted(() => {
  loadStrategiesFromBackend()
})

onBeforeUnmount(() => {
  stopRunPolling()
})

function selectStrategy(child) {
  if (runState.running) {
    ElMessage.warning('实验运行中，暂不能切换干预策略')
    return
  }

  if (activeStrategySlot.value === 'primary') {
    Object.assign(currentStrategy, child)
    clearRunOutputForSelectionChange()
    return
  }
  selectedStrategy.value = child
  clearRunOutputForSelectionChange()
}

function setActiveStrategySlot(slot) {
  activeStrategySlot.value = slot
}

function isStrategySelected(strategyId) {
  return currentStrategy.id === strategyId || selectedStrategy.value?.id === strategyId
}

function folderToggleIcon(expanded) {
  return expanded ? ArrowDown : ArrowRight
}

function clearRunOutputForSelectionChange() {
  if (!runState.tasks.primary && !runState.tasks.secondary && !runState.results.primary && !runState.results.secondary) return
  runState.tasks.primary = null
  runState.tasks.secondary = null
  runState.results.primary = null
  runState.results.secondary = null
  runState.error = ''
  runState.message = '策略选择已更新，请重新点击“开始运行”获取新的实际实验结果。'
}
</script>

<style scoped>
.post-intervention-page {
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f6f8fb;
  color: #0f172a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-head {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 14px 22px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.eyebrow {
  margin: 0 0 6px;
  color: #3867f2;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.page-head h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 900;
}

.subtitle {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.intervention-layout {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-height: 0;
}

.case-select-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  overflow: hidden;
  display: flex;
  min-height: 0;
}

.case-select-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  min-height: 0;
}

/* ---- 干预策略库 ---- */
.case-library {
  border-right: 1px solid #eef2f7;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.library-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
  background: #f8fafc;
}

.library-head .el-icon {
  color: #3b82f6;
  font-size: 16px;
}

.slot-switch {
  padding: 10px 12px;
  border-bottom: 1px solid #eef2f7;
  background: #ffffff;
}

.slot-switch :deep(.el-radio-group) {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.slot-switch :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 7px 8px;
  font-size: 12px;
  font-weight: 800;
}

.library-tree {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 6px 0;
}

.tree-folder { margin-bottom: 2px; }

.tree-folder-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  transition: background 0.15s;
}

.tree-folder-head:hover { background: #f1f5f9; }

.tree-folder-head .el-icon {
  font-size: 14px;
  color: #94a3b8;
  flex-shrink: 0;
}

.folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-count {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #64748b;
  font-weight: 600;
}

.tree-folder-children { padding-left: 0; }

.tree-leaf {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 36px;
  cursor: pointer;
  font-size: 12px;
  color: #475569;
  transition: background 0.15s;
}

.tree-leaf:hover { background: #f8fafc; }

.tree-leaf.active {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 700;
}

.tree-leaf.active-primary {
  background: #eff6ff;
  color: #1d4ed8;
}

.tree-leaf.active-secondary {
  background: #f5f3ff;
  color: #6d28d9;
}

.tree-leaf .el-icon {
  font-size: 14px;
  color: #cbd5e1;
  flex-shrink: 0;
}

.tree-leaf.active .el-icon { color: #3b82f6; }
.tree-leaf.active-secondary .el-icon { color: #8b5cf6; }

.leaf-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leaf-badge {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
}

.leaf-badge--primary {
  color: #1d4ed8;
  background: #dbeafe;
}

.leaf-badge--secondary {
  color: #6d28d9;
  background: #ede9fe;
}

/* ---- 当前干预策略 ---- */
.current-experiment {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  min-height: 0;
  overflow-y: auto;
}

.info-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.info-card--primary { border-top: 3px solid #3b82f6; }
.info-card--secondary { border-top: 3px solid #8b5cf6; }
.info-card--active {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.info-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
  background: #fafbfc;
}

.info-card-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
}

.info-card-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-card-head .el-icon { font-size: 15px; color: #64748b; }
.info-card--primary .info-card-head .el-icon { color: #3b82f6; }
.info-card--secondary .info-card-head .el-icon { color: #8b5cf6; }

.info-card-body {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed #f1f5f9;
}

.info-row:last-child { border-bottom: none; }

.info-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.info-value {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.info-value.muted { color: #cbd5e1; }

/* ---- 右半 ---- */
.compare-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.compare-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

.compare-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eef2f7;
  background: #f8fafc;
}

.compare-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
}

.compare-head-left .el-icon { color: #8b5cf6; }

.compare-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}

.compare-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #94a3b8;
  gap: 4px;
  padding: 20px;
}

.compare-empty .el-icon { color: #e2e8f0; }

.compare-empty p {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #64748b;
}

.compare-empty span {
  font-size: 12px;
  font-weight: 600;
  max-width: 300px;
  line-height: 1.5;
}

.compare-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-pair-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.cmp-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cmp-card--large {
  flex: 1 1 auto;
  min-height: 0;
}

.cmp-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
  background: #fafbfc;
  position: relative;
}

.cmp-card-head .el-icon { font-size: 15px; flex-shrink: 0; }

.cmp-card-pip {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-left: auto;
  flex-shrink: 0;
}

.cmp-card-pip.blue   { background: #3b82f6; }
.cmp-card-pip.purple { background: #8b5cf6; }
.cmp-card-pip.teal   { background: #0d9488; }
.cmp-card-pip.amber  { background: #d97706; }
.cmp-card-pip.slate  { background: #475569; }

.cmp-card--blue { border-top: 3px solid #3b82f6; }
.cmp-card--blue .cmp-card-head { background: linear-gradient(180deg, #eff6ff 0%, #fafbfc 100%); }
.cmp-card--blue .cmp-card-head .el-icon { color: #3b82f6; }

.cmp-card--purple { border-top: 3px solid #8b5cf6; }
.cmp-card--purple .cmp-card-head { background: linear-gradient(180deg, #f5f3ff 0%, #fafbfc 100%); }
.cmp-card--purple .cmp-card-head .el-icon { color: #8b5cf6; }

.cmp-card--teal { border-top: 3px solid #0d9488; }
.cmp-card--teal .cmp-card-head { background: linear-gradient(180deg, #f0fdfa 0%, #fafbfc 100%); }
.cmp-card--teal .cmp-card-head .el-icon { color: #0d9488; }

.cmp-card--amber { border-top: 3px solid #d97706; }
.cmp-card--amber .cmp-card-head { background: linear-gradient(180deg, #fffbeb 0%, #fafbfc 100%); }
.cmp-card--amber .cmp-card-head .el-icon { color: #d97706; }

.cmp-card-body {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
}

.cmp-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px dashed #f1f5f9;
}

.cmp-kv:last-child { border-bottom: none; }

.cmp-kv-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.cmp-kv-value {
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
}

/* ---- 实际运行模块 ---- */
.runtime-panel {
  margin-top: 14px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.runtime-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #e0f2fe;
  background: #f8fbff;
}

.runtime-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e293b;
  font-size: 13px;
  font-weight: 900;
}

.runtime-title .el-icon { color: #2563eb; }

.runtime-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.runtime-problem {
  margin: 12px 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.runtime-problem span {
  color: #3b82f6;
  font-size: 11px;
  font-weight: 900;
}

.runtime-problem strong {
  color: #1e3a8a;
  font-size: 12px;
  line-height: 1.5;
}

.runtime-status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 14px 12px;
}

.runtime-status-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #ffffff;
}

.runtime-status-card--primary { border-top: 3px solid #3b82f6; }
.runtime-status-card--secondary { border-top: 3px solid #8b5cf6; }

.runtime-status-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
}

.runtime-status-top span {
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
}

.runtime-status-card strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.4;
}

.runtime-status-card p {
  margin: 6px 0 0;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  word-break: break-all;
}

.runtime-alert {
  margin: 0 14px 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.runtime-alert--error {
  background: #fef2f2;
  color: #b91c1c;
}

.runtime-result {
  margin: 0 14px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.runtime-result-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #eef2f7;
  background: #f8fafc;
  color: #1e293b;
  font-size: 13px;
  font-weight: 900;
}

.result-table {
  display: flex;
  flex-direction: column;
}

.result-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
}

.result-row:last-child { border-bottom: none; }

.result-row--head {
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 900;
}

.result-row span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.result-row .winner {
  color: #047857;
}

.runtime-placeholder {
  min-height: 88px;
  margin: 0 14px 14px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  color: #94a3b8;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.runtime-placeholder .el-icon {
  color: #cbd5e1;
  font-size: 18px;
  flex-shrink: 0;
}

.library-tree::-webkit-scrollbar,
.current-experiment::-webkit-scrollbar,
.compare-body::-webkit-scrollbar {
  width: 5px;
}

.library-tree::-webkit-scrollbar-thumb,
.current-experiment::-webkit-scrollbar-thumb,
.compare-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}
</style>
