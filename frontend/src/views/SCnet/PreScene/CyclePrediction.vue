<template>
  <div class="cp-page">
    <!-- 控制面板 -->
    <div class="glass-panel control-panel">
      <div class="panel-title">
        <span class="glow-dot cyan"></span>
        <span>矿山供应链周期预测引擎</span>
        <el-tooltip
          content="利用供需关系、库存消费比、产量指引节奏和供应商产能响应，识别矿山供应链中的补库、去库和供需错配周期"
          placement="top"
          :show-after="200"
        >
          <el-icon class="help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
        <span v-if="backendAvailable && modelInfo" class="badge ml-badge">
          <span class="ml-dot"></span>
          {{ modelInfo.algorithmLabel || 'ACF + FFT 分析' }}
        </span>
        <span v-else class="badge wave-badge" :class="{ 'synthetic-badge': !backendAvailable }">
          {{ backendAvailable ? 'SUPPLY-DEMAND CYCLE' : '前端合成' }}
        </span>
      </div>

      <div class="control-grid">
        <div class="ctrl-item">
          <label>周期长度 <span class="val-tag">{{ periodLength }}个月</span></label>
          <el-slider v-model="periodLength" :min="6" :max="24" :step="1" class="neon-slider" />
        </div>

        <div class="ctrl-item">
          <label>
            检测灵敏度
            <el-tooltip content="灵敏度越高，越容易捕捉供需关系中的短周期波动，但也可能引入更多噪声" placement="top" :show-after="200">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
            <span class="val-tag">{{ sensitivity }}</span>
          </label>
          <el-slider v-model="sensitivity" :min="20" :max="90" :step="1" class="neon-slider" />
        </div>

        <div class="ctrl-item">
          <label>
            观察窗口
            <el-tooltip content="用于周期分析的数据时间范围，调整起止比例可聚焦特定阶段的供需变化" placement="top" :show-after="200">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </label>
          <el-slider v-model="windowRange" range :min="0" :max="100" :step="5" class="neon-slider" />
        </div>

        <div class="ctrl-item">
          <label>同比视图</label>
          <el-switch v-model="showYearOnYear" class="dark-switch" />
        </div>

        <div class="ctrl-item refresh-item">
          <el-button
            class="refresh-btn"
            :loading="loading"
            :icon="loading ? '' : 'Refresh'"
            size="small"
            round
            @click="refreshCycle"
          >
            {{ loading ? '分析中...' : '刷新分析' }}
          </el-button>
        </div>
      </div>

      <!-- 模型信息条 -->
      <div v-if="backendAvailable && modelInfo" class="model-info-bar">
        <span class="mi-item">
          <span class="mi-label">算法</span>
          <span class="mi-value">{{ modelInfo.algorithmLabel }}</span>
        </span>
        <span class="mi-sep">|</span>
        <span class="mi-item">
          <span class="mi-label">数据</span>
          <span class="mi-value">{{ modelInfo.dataMonths }}个月 ({{ modelInfo.dataRange }})</span>
        </span>
        <span v-if="lastRefreshTime" class="mi-sep">|</span>
        <span v-if="lastRefreshTime" class="mi-item">
          <span class="mi-label">刷新</span>
          <span class="mi-value">{{ lastRefreshTime }}</span>
        </span>
      </div>
    </div>

    <!-- 场景描述 -->
    <div class="glass-panel scenario-bar">
      <div class="scenario-title">
        <span class="glow-dot green"></span>
        {{ currentScenarioMeta.cycleAlias }}
      </div>
      <div class="scenario-desc">{{ currentScenarioMeta.summary }}</div>
      <div class="tag-row">
        <span v-for="t in currentScenarioMeta.focusTags" :key="t" class="glow-tag">{{ t }}</span>
      </div>
    </div>

    <!-- 问题设定 -->
    <div class="glass-panel governance-brief">
      <div class="governance-brief-main">
        <div class="governance-kicker">问题设定</div>
        <div class="governance-title">{{ governanceBrief.question }}</div>
        <div class="governance-text">{{ governanceBrief.desc }}</div>
      </div>

      <div class="governance-brief-side">
        <div class="governance-side-item">
          <span>证据覆盖</span>
          <strong>{{ governanceBrief.domainText }}</strong>
        </div>
        <div class="governance-side-item">
          <span>输出导向</span>
          <strong>{{ governanceBrief.outputTitle }}</strong>
        </div>
      </div>
    </div>

    <!-- KPI 区 -->
    <div class="kpi-row">
      <div class="kpi-card" v-for="(item, idx) in kpiList" :key="idx">
        <div class="kpi-icon-bg" :style="{ background: item.bgGrad }">
          <div class="kpi-num">{{ item.value }}</div>
          <div class="kpi-unit">{{ item.unit }}</div>
        </div>
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-bar">
          <div class="kpi-bar-fill" :style="{ width: item.pct + '%', background: item.color }"></div>
        </div>
      </div>
    </div>

    <!-- 时序分解图 -->
    <div class="glass-panel">
      <div class="panel-title">
        <span class="glow-dot"></span>
        {{ governanceBrief.decomposeTitle }} · {{ currentScenarioMeta.cycleAlias }}
        <el-tooltip content="将矿山供应链供需压力分解为长期趋势项、周期项和异常残差项" placement="top" :show-after="200">
          <el-icon class="help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
        <span class="badge info-badge">选中候选周期高亮窗口</span>
      </div>
      <div ref="decomposeChartRef" class="chart-box" style="height: 320px"></div>
    </div>

    <!-- 热力图 -->
    <div class="glass-panel">
      <div class="panel-title">
        <span class="glow-dot orange"></span>
        {{ governanceBrief.heatmapTitle }}
        <el-tooltip content="以颜色深浅表示不同年份各月供需错配、库存压力或成本波动强度" placement="top" :show-after="200">
          <el-icon class="help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
      </div>
      <div ref="heatmapChartRef" class="chart-box" style="height: 300px"></div>
    </div>

    <!-- 候选周期卡片 -->
    <div class="glass-panel">
      <div class="panel-title">
        <span class="glow-dot green"></span>
        候选供应链周期信号
        <el-tooltip content="自相关分析中检测到的潜在周期模式，按相关系数强弱排序" placement="top" :show-after="200">
          <el-icon class="help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
      </div>

      <div class="cycle-cards">
        <div
          v-for="c in cycleCandidates"
          :key="c.id"
          class="cycle-card"
          :class="{ active: selectedCandidate && selectedCandidate.id === c.id }"
          @click="selectCandidate(c)"
        >
          <div class="cc-header">
            <div class="cc-lag">{{ c.lag }}个月</div>
            <el-tooltip content="相关系数 r：衡量周期性强弱，r 越接近 1 表示周期越稳定" placement="top" :show-after="200">
              <div class="cc-score" :class="c.score > 0.5 ? 'high' : c.score > 0.2 ? 'mid' : 'low'">
                r={{ c.score }}
              </div>
            </el-tooltip>
          </div>
          <div class="cc-conf">置信度 {{ c.confidence }}%</div>
          <div class="cc-bar">
            <div class="cc-bar-fill" :style="{ width: Math.max(5, (c.score + 1) * 50) + '%' }"></div>
          </div>
          <div class="cc-action" @click.stop="openCandidateDetail(c)">查看详情</div>
        </div>
      </div>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" size="420px" :with-header="false" class="dark-drawer">
      <div class="drawer-content" v-if="selectedCandidate">
        <div class="drawer-header">
          <div class="drawer-badge cycle">周期分析</div>
          <div class="drawer-lag">{{ selectedCandidate.lag }} 个月周期</div>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">相关系数</div>
            <div class="detail-value cyan">{{ selectedCandidate.score }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">置信度</div>
            <div class="detail-value">{{ selectedCandidate.confidence }}%</div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">周期解释</div>
          <div class="evidence-text">{{ selectedCandidate.explain }}</div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">建议策略</div>
          <div class="evidence-text strategy">{{ selectedCandidate.strategy }}</div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { QuestionFilled } from '@element-plus/icons-vue'
import { getCyclePrediction } from '@/api/cyclePrediction'

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

const SCENARIO_FACTOR = {
  supply_demand_balance: {
    base: 52,
    drift: 0.36,
    amplitude: 6.8,
    phase: 0.45,
    recommendedPeriod: 12,
    defaultSensitivity: 66,
    defaultWindowRange: [10, 100],
    stabilityBias: 1,
    anomalyBias: 5,
    cycleAlias: '供需匹配-库存联动周期',
    heatmapTitle: '供需错配热力矩阵',
    phaseTitle: '供需压力相位图',
    summary: '该场景围绕终端需求、主机厂产量指引、供应商产能和渠道库存之间的循环关系，识别供给短缺、供需平衡和供给过剩的阶段切换。',
    focusTags: ['终端需求', '主机厂产量指引', '渠道库存', '供应商产能'],
    strategyFocus: '终端需求、产量指引计划与库存消费比的匹配关系',
    kpiTitles: {
      dominantCycle: '主导供需周期',
      stability: '供需匹配稳定性',
      anomaly: '供需错配概率'
    }
  },

  inventory_cycle: {
    base: 55,
    drift: 0.32,
    amplitude: 7.4,
    phase: 0.8,
    recommendedPeriod: 10,
    defaultSensitivity: 62,
    defaultWindowRange: [8, 96],
    stabilityBias: -3,
    anomalyBias: 9,
    cycleAlias: '补库-去库切换周期',
    heatmapTitle: '库存压力热力矩阵',
    phaseTitle: '库存消费比相位图',
    summary: '该场景关注全球商业库存、战略储备、核电业主库存水平和补库紧迫度，识别主动补库、被动累库和去库调整的切换节奏。',
    focusTags: ['库存消费比', '周转率', '补库紧迫度', '备货节奏'],
    strategyFocus: '库存消费比、补库紧迫度与高成本现货产量指引调整',
    kpiTitles: {
      dominantCycle: '主导库存周期',
      stability: '库存稳定性',
      anomaly: '被动累库概率'
    }
  },

  production_rhythm: {
    base: 49,
    drift: 0.41,
    amplitude: 5.9,
    phase: 1.1,
    recommendedPeriod: 9,
    defaultSensitivity: 58,
    defaultWindowRange: [12, 100],
    stabilityBias: 2,
    anomalyBias: 4,
    cycleAlias: '产量指引-交付节律周期',
    heatmapTitle: '产量指引强度热力矩阵',
    phaseTitle: '产量指引压力相位图',
    summary: '该场景关注哈萨克斯坦/加拿大/纳米比亚等主要矿山的月度产量、ISL/矿山产能利用率和新矿投产节奏，识别供给变化对价格和采购策略的影响。',
    focusTags: ['月度产量指引', 'ISL/矿山产能利用率', '矿山状态切换(停产/重启/爬坡)', '精矿到港准时率'],
    strategyFocus: '产量指引计划、关键物料精矿到港准时率与矿山状态切换(停产/重启/爬坡)节奏',
    kpiTitles: {
      dominantCycle: '主导矿山生产周期',
      stability: '产量指引稳定性',
      anomaly: '产量指引偏差概率'
    }
  },

  material_price_cycle: {
    base: 46,
    drift: 0.28,
    amplitude: 6.3,
    phase: 1.35,
    recommendedPeriod: 14,
    defaultSensitivity: 64,
    defaultWindowRange: [10, 100],
    stabilityBias: 4,
    anomalyBias: 3,
    cycleAlias: '材料价格-长协锁量周期',
    heatmapTitle: '材料成本波动热力矩阵',
    phaseTitle: '采购成本相位图',
    summary: '该场景围绕锂、镍、钢、铝、橡胶等关键原材料，识别价格低位、反弹、锁价和成本传导周期。',
    focusTags: ['锂价', '钢铝价格', '长协锁量', 'BOM成本'],
    strategyFocus: 'U3O8 现货价/长协价、采购锁量窗口与核燃料到岸成本变化',
    kpiTitles: {
      dominantCycle: '主导成本周期',
      stability: '成本稳定性',
      anomaly: '价格反弹概率'
    }
  }
}

const DEFAULT_CYCLE_CONTEXT = {
  mandate: {
    value: 'supply_demand',
    label: '供需关系周期分析',
    desc: '综合核电需求、全球库存、主要矿山产量和二次供应能力，判断当前市场处于供给短缺、供需平衡还是供给过剩阶段。'
  },
  activeDomainIds: ['terminal_demand', 'channel_inventory', 'production_plan', 'supplier_capacity'],
  activeDomains: [
    { id: 'terminal_demand', label: '终端需求与订单' },
    { id: 'channel_inventory', label: '渠道库存周期' },
    { id: 'production_plan', label: '主机厂产量指引计划' },
    { id: 'supplier_capacity', label: '供应商产能响应' }
  ],
  avgQuality: 79,
  outputTitle: '供需匹配周期判断',
  outputHint: '后续周期分析将把供需关系作为主线，比较终端需求、产量指引计划、库存消费比和供应商产能响应。'
}

const CYCLE_MANDATE_EFFECTS = {
  supply_demand: {
    decomposeTitle: '供需关系周期分解',
    heatmapTitle: '供需错配热力矩阵',
    outputTitle: '供需匹配周期判断',
    scenarioKey: 'supply_demand_balance',
    periodShift: 0,
    amplitudeShift: 0.8,
    driftShift: 0.02,
    stabilityShift: -2,
    anomalyShift: 7,
    strategyLead: '优先判断需求恢复速度是否匹配产量指引和供应商产能释放，避免供给恢复过快造成库存积压。'
  },

  inventory_cycle: {
    decomposeTitle: '补库/去库周期分解',
    heatmapTitle: '库存压力热力矩阵',
    outputTitle: '补库/去库周期定位',
    scenarioKey: 'inventory_cycle',
    periodShift: -1,
    amplitudeShift: 1.0,
    driftShift: 0.01,
    stabilityShift: -4,
    anomalyShift: 10,
    strategyLead: '重点判断当前是主动补库、被动累库还是去库调整，并将库存消费比与折扣率联动监测。'
  },

  production_rhythm: {
    decomposeTitle: '主机厂矿山生产周期分解',
    heatmapTitle: '产量指引强度热力矩阵',
    outputTitle: '产量指引节律识别',
    scenarioKey: 'production_rhythm',
    periodShift: -2,
    amplitudeShift: 0.6,
    driftShift: 0.03,
    stabilityShift: 2,
    anomalyShift: 5,
    strategyLead: '优先识别月度产量指引高峰、矿山状态切换(停产/重启/爬坡)节点和关键精矿到厂偏差，提前调整采购和供应商排程。'
  },

  material_price_cycle: {
    decomposeTitle: '材料价格周期分解',
    heatmapTitle: '材料成本波动热力矩阵',
    outputTitle: '成本周期窗口判断',
    scenarioKey: 'material_price_cycle',
    periodShift: 2,
    amplitudeShift: 0.5,
    driftShift: 0.01,
    stabilityShift: 5,
    anomalyShift: 4,
    strategyLead: '重点识别关键材料低位震荡、反弹和锁价窗口，避免在价格拐点附近暴露采购风险。'
  }
}

const CYCLE_DOMAIN_EFFECTS = {
  terminal_demand: { stability: 3, anomaly: 5, period: 0 },
  channel_inventory: { stability: -2, anomaly: 8, period: -1 },
  production_plan: { stability: 4, anomaly: 3, period: -1 },
  supplier_capacity: { stability: 2, anomaly: 4, period: 1 },

  chip_supply: { stability: 2, anomaly: 4, period: 1 },
  battery_material: { stability: 4, anomaly: 3, period: 2 },
  vehicle_inventory: { stability: -2, anomaly: 8, period: -1 },
  logistics_delivery: { stability: 1, anomaly: 5, period: 0 }
}

export default {
  name: 'PowerGame_CyclePrediction',
  components: { QuestionFilled },

  props: {
    analysisContext: {
      type: Object,
      default: () => DEFAULT_CYCLE_CONTEXT
    }
  },

  data() {
    return {
      selectedScenario: 'supply_demand_balance',
      periodLength: 12,
      sensitivity: 66,
      windowRange: [10, 100],
      showYearOnYear: false,
      decomposeChart: null,
      heatmapChart: null,
      resizeTimer: null,
      labels: [],
      observedSeries: [],
      trendSeries: [],
      seasonalSeries: [],
      residualSeries: [],
      heatmapYears: [],
      heatmapData: [],
      cycleCandidates: [],
      selectedCandidate: null,
      detailVisible: false,
      kpi: {
        dominantCycle: 0,
        stability: 0,
        anomalyProbability: 0
      },
      backendAvailable: true,
      modelInfo: null,
      loading: false,
      lastRefreshTime: null
    }
  },

  computed: {
    currentScenarioMeta() {
      const ctx = this.analysisContext || DEFAULT_CYCLE_CONTEXT
      const effect = CYCLE_MANDATE_EFFECTS[ctx.mandate?.value] || CYCLE_MANDATE_EFFECTS.supply_demand
      return SCENARIO_FACTOR[effect.scenarioKey] || SCENARIO_FACTOR[this.selectedScenario] || SCENARIO_FACTOR.supply_demand_balance
    },

    governanceBrief() {
      const ctx = this.analysisContext || DEFAULT_CYCLE_CONTEXT
      const effect = CYCLE_MANDATE_EFFECTS[ctx.mandate?.value] || CYCLE_MANDATE_EFFECTS.supply_demand
      const activeDomains = ctx.activeDomains?.length ? ctx.activeDomains : DEFAULT_CYCLE_CONTEXT.activeDomains

      return {
        question: ctx.mandate?.label || DEFAULT_CYCLE_CONTEXT.mandate.label,
        desc: ctx.mandate?.desc || DEFAULT_CYCLE_CONTEXT.mandate.desc,
        domainText: activeDomains.map(item => item.label).join('、'),
        outputTitle: ctx.outputTitle || effect.outputTitle,
        decomposeTitle: effect.decomposeTitle,
        heatmapTitle: effect.heatmapTitle,
        strategyHint: `${effect.strategyLead} ${ctx.outputHint || ''}`.trim()
      }
    },

    kpiList() {
      const m = this.currentScenarioMeta.kpiTitles

      return [
        {
          label: m.dominantCycle,
          value: this.kpi.dominantCycle,
          unit: '个月',
          color: '#6366f1',
          bgGrad: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))',
          pct: Math.min(100, this.kpi.dominantCycle * 4)
        },
        {
          label: m.stability,
          value: this.kpi.stability,
          unit: '%',
          color: '#22c55e',
          bgGrad: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
          pct: this.kpi.stability
        },
        {
          label: m.anomaly,
          value: this.kpi.anomalyProbability,
          unit: '%',
          color: '#f59e0b',
          bgGrad: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
          pct: this.kpi.anomalyProbability
        }
      ]
    },

    controlSignature() {
      return [
        this.selectedScenario,
        this.periodLength,
        this.sensitivity,
        this.windowRange.join(','),
        this.showYearOnYear
      ].join('|')
    },

    renderSignature() {
      const ctx = this.analysisContext || DEFAULT_CYCLE_CONTEXT

      return [
        this.controlSignature,
        ctx.mandate?.value || 'supply_demand',
        (ctx.activeDomainIds || []).join(','),
        ctx.avgQuality || 79
      ].join('|')
    }
  },

  watch: {
    async 'renderSignature'() {
      this.applyScenarioFromMandate(false)
      await this.rebuildData()
      this.renderCharts()
    }
  },

  async mounted() {
    this.applyScenarioFromMandate(true)
    await this.rebuildData()

    this.$nextTick(() => {
      this.initCharts()
      this.renderCharts()
    })

    window.addEventListener('resize', this.handleResize)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    this.decomposeChart?.dispose()
    this.heatmapChart?.dispose()
  },

  methods: {
    getGovernanceState() {
      const ctx = this.analysisContext || DEFAULT_CYCLE_CONTEXT
      const mandateValue = ctx.mandate?.value || DEFAULT_CYCLE_CONTEXT.mandate.value
      const effect = CYCLE_MANDATE_EFFECTS[mandateValue] || CYCLE_MANDATE_EFFECTS.supply_demand
      const activeDomainIds = ctx.activeDomainIds?.length ? ctx.activeDomainIds : DEFAULT_CYCLE_CONTEXT.activeDomainIds
      const avgQuality = Number.isFinite(ctx.avgQuality) ? ctx.avgQuality : DEFAULT_CYCLE_CONTEXT.avgQuality

      let domainStability = 0
      let domainAnomaly = 0
      let domainPeriod = 0

      activeDomainIds.forEach((id) => {
        const domain = CYCLE_DOMAIN_EFFECTS[id]
        if (!domain) return

        domainStability += domain.stability
        domainAnomaly += domain.anomaly
        domainPeriod += domain.period
      })

      return {
        mandateValue,
        effect,
        coverageFactor: activeDomainIds.length / DEFAULT_CYCLE_CONTEXT.activeDomainIds.length,
        qualityFactor: avgQuality / 100,
        domainStability,
        domainAnomaly,
        domainPeriod
      }
    },

    applyScenarioFromMandate(resetControls = false) {
      const ctx = this.analysisContext || DEFAULT_CYCLE_CONTEXT
      const effect = CYCLE_MANDATE_EFFECTS[ctx.mandate?.value] || CYCLE_MANDATE_EFFECTS.supply_demand
      const scenarioKey = effect.scenarioKey || 'supply_demand_balance'

      this.selectedScenario = scenarioKey

      if (resetControls) {
        this.applyScenarioPreset()
      }
    },

    applyScenarioPreset() {
      const cfg = this.currentScenarioMeta
      this.periodLength = cfg.recommendedPeriod
      this.sensitivity = cfg.defaultSensitivity
      this.windowRange = [...cfg.defaultWindowRange]
    },

    buildLabels(total) {
      const r = []

      for (let i = 0; i < total; i++) {
        const y = 2020 + Math.floor(i / 12)
        const m = MONTHS[i % 12]
        r.push(`${y}-${m}`)
      }

      return r
    },

    calcAutocorrelation(values, lag) {
      if (lag <= 0 || lag >= values.length) return 0

      const mean = values.reduce((a, c) => a + c, 0) / values.length

      let num = 0
      let den = 0

      for (let i = lag; i < values.length; i++) {
        num += (values[i] - mean) * (values[i - lag] - mean)
      }

      for (let i = 0; i < values.length; i++) {
        den += Math.pow(values[i] - mean, 2)
      }

      return den === 0 ? 0 : +(num / den).toFixed(3)
    },

    async rebuildData() {
      if (this.loading) return
      this.loading = true

      const cfg = this.currentScenarioMeta
      const governance = this.getGovernanceState()
      const effectivePeriod = Math.max(
        6,
        this.periodLength + governance.effect.periodShift + Math.round(governance.domainPeriod)
      )

      // 尝试后端 API
      try {
        const response = await getCyclePrediction({
          metric: 'total_amount',
          period_min: Math.max(4, effectivePeriod - 4),
          period_max: Math.min(36, effectivePeriod + 4),
          sensitivity: this.sensitivity / 100,
          window_start: this.windowRange[0] / 100,
          window_end: this.windowRange[1] / 100
        })

        if (response && response.success && response.data) {
          this.backendAvailable = true
          this.lastRefreshTime = new Date().toLocaleTimeString('zh-CN', { hour12: false })
          this.applyApiResponse(response.data, cfg, governance, effectivePeriod)
          this.loading = false
          return
        }
      } catch (e) {
        console.warn('周期分析API调用失败，回退至前端合成:', e.message)
      }
      this.backendAvailable = false
      this.rebuildDataSynthetic(cfg, governance, effectivePeriod)
      this.loading = false
    },

    async refreshCycle() {
      this.loading = false
      await this.rebuildData()
      this.renderCharts()
    },

    applyApiResponse(data, cfg, governance, effectivePeriod) {
      this.labels = data.labels || []
      this.observedSeries = data.observedSeries || []
      this.trendSeries = data.trendSeries || []
      this.seasonalSeries = data.seasonalSeries || []
      this.residualSeries = data.residualSeries || []
      this.modelInfo = data.modelInfo || null
      this.kpi = data.kpi || { dominantCycle: 0, stability: 0, anomalyProbability: 0 }

      // 构建热力图数据
      const yearMap = new Map()
      const years = []
      const heatData = []
      const labels = this.labels
      const seaSlice = this.seasonalSeries
      labels.forEach((l, idx) => {
        const [y, m] = l.split('-')
        if (!yearMap.has(y)) {
          yearMap.set(y, years.length)
          years.push(y)
        }
        heatData.push([
          Math.max(0, MONTHS.indexOf(m)),
          yearMap.get(y),
          +(seaSlice[idx] || 0).toFixed(2)
        ])
      })
      this.heatmapYears = years
      this.heatmapData = heatData

      this.cycleCandidates = (data.cycleCandidates || []).map(c => ({
        ...c,
        explain: `${this.governanceBrief.question}呈现 ${Math.round(Math.abs(c.score) * 100)}% 的周期相关性，${cfg.focusTags[0]}与${cfg.focusTags[1]}之间的联动仍是主要驱动。`,
        strategy: `建议以 ${c.lag} 个月为滚动复盘周期，重点监控${cfg.strategyFocus}，并围绕"${this.governanceBrief.outputTitle}"生成下一轮采购、锁量和库存策略。`
      }))

      if (!this.selectedCandidate || !this.cycleCandidates.find(c => c.id === this.selectedCandidate.id)) {
        this.selectedCandidate = this.cycleCandidates[0] || null
      }
    },

    rebuildDataSynthetic(cfg, governance, effectivePeriod) {
      this.modelInfo = null
      this.lastRefreshTime = null
      const fullLen = 84
      const fullLabels = this.buildLabels(fullLen)
      const observed = []
      const trend = []
      const seasonal = []
      const residual = []

      for (let i = 0; i < fullLen; i++) {
        const t = cfg.base + (cfg.drift + governance.effect.driftShift) * i

        const s =
          (cfg.amplitude + governance.effect.amplitudeShift) *
          Math.sin((2 * Math.PI * i) / effectivePeriod + cfg.phase) +
          (cfg.amplitude + governance.effect.amplitudeShift) *
          0.36 *
          Math.sin((4 * Math.PI * i) / effectivePeriod)

        const n =
          Math.sin(i * 1.2 + cfg.phase) * (1.2 + (1 - governance.qualityFactor) * 0.5) +
          Math.cos(i * 0.65) * 0.7

        trend.push(+t.toFixed(2))
        seasonal.push(+s.toFixed(2))
        residual.push(+n.toFixed(2))
        observed.push(+(t + s + n).toFixed(2))
      }

      const si = Math.floor((fullLen * this.windowRange[0]) / 100)
      const ei = Math.max(si + 24, Math.floor((fullLen * this.windowRange[1]) / 100))

      const labels = fullLabels.slice(si, ei)
      const obsSlice = observed.slice(si, ei)
      const trendSlice = trend.slice(si, ei)
      const seaSlice = seasonal.slice(si, ei)
      const resSlice = residual.slice(si, ei)

      const lags = []
      const startLag = Math.max(3, effectivePeriod - 4)
      const endLag = Math.min(Math.max(6, obsSlice.length - 2), effectivePeriod + 4)

      for (let lag = startLag; lag <= endLag; lag += 2) {
        const corr = this.calcAutocorrelation(obsSlice, lag)
        const conf = Math.max(
          35,
          Math.min(
            96,
            Math.round((corr + 1) * 46 + governance.qualityFactor * 8 + governance.coverageFactor * 4)
          )
        )

        lags.push({
          id: `${lag}-${corr}`,
          lag,
          score: corr,
          confidence: conf,
          explain: `${this.governanceBrief.question}在当前窗口内呈现 ${Math.round(Math.abs(corr) * 100)}% 的周期相关性，${cfg.focusTags[0]}与${cfg.focusTags[1]}之间的联动仍是主要驱动。`,
          strategy: `建议以 ${lag} 个月为滚动复盘周期，重点监控${cfg.strategyFocus}，并围绕“${this.governanceBrief.outputTitle}”生成下一轮采购、锁量和库存策略。`
        })
      }

      const candidates = lags.sort((a, b) => b.score - a.score).slice(0, 6)

      if (!this.selectedCandidate || !candidates.find(c => c.id === this.selectedCandidate.id)) {
        this.selectedCandidate = candidates[0] || null
      }

      const yearMap = new Map()
      const years = []
      const heatData = []

      labels.forEach((l, idx) => {
        const [y, m] = l.split('-')

        if (!yearMap.has(y)) {
          yearMap.set(y, years.length)
          years.push(y)
        }

        heatData.push([
          Math.max(0, MONTHS.indexOf(m)),
          yearMap.get(y),
          +seaSlice[idx].toFixed(2)
        ])
      })

      const resThr = Math.max(1.6, (100 - this.sensitivity) / 18)
      const outliers = resSlice.filter(v => Math.abs(v) >= resThr).length

      this.labels = labels
      this.observedSeries = obsSlice
      this.trendSeries = trendSlice
      this.seasonalSeries = seaSlice
      this.residualSeries = resSlice
      this.cycleCandidates = candidates
      this.heatmapYears = years
      this.heatmapData = heatData

      this.kpi = {
        dominantCycle: candidates[0] ? candidates[0].lag : 0,
        stability: candidates[0]
          ? Math.max(
              30,
              Math.min(
                98,
                Math.round(
                  (candidates[0].score + 1) * 50 +
                  cfg.stabilityBias +
                  governance.effect.stabilityShift +
                  governance.domainStability
                )
              )
            )
          : 0,
        anomalyProbability: Math.min(
          95,
          Math.max(
            5,
            Math.round(
              (outliers / Math.max(1, resSlice.length)) * 100 +
              (100 - this.sensitivity) * 0.25 +
              cfg.anomalyBias +
              governance.effect.anomalyShift +
              governance.domainAnomaly +
              (1 - governance.coverageFactor) * 10
            )
          )
        )
      }
    },

    initCharts() {
      if (this.$refs.decomposeChartRef && !this.decomposeChart) {
        this.decomposeChart = echarts.init(this.$refs.decomposeChartRef)
      }

      if (this.$refs.heatmapChartRef && !this.heatmapChart) {
        this.heatmapChart = echarts.init(this.$refs.heatmapChartRef)
      }
    },

    renderCharts() {
      this.renderDecomposeChart()
      this.renderHeatmapChart()
    },

    renderDecomposeChart() {
      if (!this.decomposeChart) return

      const lag = this.selectedCandidate ? this.selectedCandidate.lag : 0
      const markEnd = Math.min(this.labels.length - 1, lag)
      const seaAbs = this.seasonalSeries.map(v => Math.abs(v || 0))
      const resAbs = this.residualSeries.map(v => Math.abs(v || 0))
      const fMax = Math.max(4, ...seaAbs, ...resAbs)
      const fBound = Math.ceil(fMax * 1.2)

      this.decomposeChart.setOption({
        backgroundColor: 'transparent',
        legend: { top: 4, textStyle: { color: '#6b7280', fontSize: 11 } },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          borderColor: '#e5e7eb',
          textStyle: { color: '#1f2937' }
        },
        grid: { top: 34, left: 50, right: 60, bottom: 40 },
        xAxis: {
          type: 'category',
          data: this.labels,
          axisLabel: { color: '#6b7280', interval: this.showYearOnYear ? 1 : 3 },
          axisLine: { lineStyle: { color: '#e5e7eb' } }
        },
        yAxis: [
          {
            type: 'value',
            name: '供需压力',
            nameTextStyle: { color: '#6b7280' },
            axisLabel: { color: '#6b7280' },
            splitLine: { lineStyle: { color: '#f3f4f6' } }
          },
          {
            type: 'value',
            name: '周期/残差',
            position: 'right',
            min: -fBound,
            max: fBound,
            nameTextStyle: { color: '#6b7280' },
            axisLabel: { color: '#6b7280' },
            splitLine: { show: false }
          }
        ],
        series: [
          {
            name: '供需压力指数',
            type: 'line',
            yAxisIndex: 0,
            smooth: true,
            showSymbol: false,
            lineStyle: { color: '#60a5fa', width: 2, shadowColor: 'rgba(96,165,250,0.5)', shadowBlur: 6 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(96,165,250,0.15)' },
                { offset: 1, color: 'rgba(96,165,250,0.01)' }
              ])
            },
            data: this.observedSeries,
            markArea: lag > 0
              ? {
                  itemStyle: { color: 'rgba(99,102,241,0.08)' },
                  data: [[{ xAxis: this.labels[0] }, { xAxis: this.labels[markEnd] }]]
                }
              : undefined
          },
          {
            name: '长期趋势项',
            type: 'line',
            yAxisIndex: 0,
            smooth: true,
            showSymbol: false,
            lineStyle: { color: '#22c55e', width: 2, type: 'dashed' },
            data: this.trendSeries
          },
          {
            name: '周期项',
            type: 'line',
            yAxisIndex: 1,
            smooth: true,
            showSymbol: false,
            lineStyle: { color: '#f59e0b', width: 1.8 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(245,158,11,0.12)' },
                { offset: 1, color: 'rgba(245,158,11,0.01)' }
              ])
            },
            data: this.seasonalSeries
          },
          {
            name: '异常残差项',
            type: 'line',
            yAxisIndex: 1,
            smooth: true,
            showSymbol: false,
            lineStyle: { color: '#64748b', width: 1.2 },
            data: this.residualSeries
          }
        ]
      }, true)
    },

    renderHeatmapChart() {
      if (!this.heatmapChart) return

      this.heatmapChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          position: 'top',
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderColor: '#e5e7eb',
          textStyle: { color: '#1f2937' },
          formatter: p => {
            const m = MONTHS[p.data[0]]
            const y = this.heatmapYears[p.data[1]]
            return `${y}-${m}<br/>周期强度: ${p.data[2]}`
          }
        },
        grid: { top: 10, left: 45, right: 10, bottom: 50 },
        xAxis: {
          type: 'category',
          data: MONTHS,
          splitArea: { show: false },
          axisLabel: { color: '#6b7280' },
          axisLine: { lineStyle: { color: '#e5e7eb' } }
        },
        yAxis: {
          type: 'category',
          data: this.heatmapYears,
          splitArea: { show: false },
          axisLabel: { color: '#6b7280' },
          axisLine: { lineStyle: { color: '#e5e7eb' } }
        },
        visualMap: {
          min: -10,
          max: 10,
          orient: 'horizontal',
          left: 'center',
          bottom: 4,
          textStyle: { color: '#6b7280' },
          inRange: { color: ['#1e40af', '#3b82f6', '#e5e7eb', '#f97316', '#dc2626'] }
        },
        series: [
          {
            type: 'heatmap',
            data: this.heatmapData,
            label: { show: false },
            itemStyle: { borderWidth: 2, borderColor: '#ffffff', borderRadius: 3 }
          }
        ]
      }, true)
    },

    selectCandidate(row) {
      this.selectedCandidate = row
      this.renderDecomposeChart()
    },

    openCandidateDetail(row) {
      this.selectedCandidate = row
      this.detailVisible = true
      this.renderDecomposeChart()
    },

    handleResize() {
      if (this.resizeTimer) clearTimeout(this.resizeTimer)

      this.resizeTimer = setTimeout(() => {
        this.decomposeChart?.resize()
        this.heatmapChart?.resize()
      }, 180)
    }
  }
}
</script>

<style scoped>
.cp-page {
  padding: 14px;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #1f2937;
}

.glass-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
}

.glow-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6366f1;
  flex-shrink: 0;
}
.glow-dot.green { background: #22c55e; }
.glow-dot.cyan { background: #06b6d4; }
.glow-dot.purple { background: #a855f7; }
.glow-dot.orange { background: #f59e0b; }

.badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.wave-badge {
  background: #ecfeff;
  color: #0891b2;
  border: 1px solid #a5f3fc;
}
.info-badge {
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px 16px;
}
.ctrl-item label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}
.val-tag {
  color: #0891b2;
  font-weight: 600;
}

.help-icon {
  font-size: 14px;
  color: #9ca3af;
  cursor: help;
  vertical-align: middle;
  margin-left: 2px;
  transition: color 0.2s;
}
.help-icon:hover {
  color: #06b6d4;
}

.scenario-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.scenario-title {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 8px;
}
.scenario-desc {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}
.tag-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.glow-tag {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 20px;
  background: #ecfeff;
  color: #0e7490;
  border: 1px solid #a5f3fc;
}

.governance-brief {
  display: flex;
  gap: 16px;
  justify-content: space-between;
}
.governance-brief-main {
  flex: 1.2;
  min-width: 0;
}
.governance-kicker {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.governance-title {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}
.governance-text {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #6b7280;
}
.governance-brief-side {
  flex: 1;
  display: grid;
  gap: 10px;
}
.governance-side-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}
.governance-side-item span {
  display: block;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
}
.governance-side-item strong {
  display: block;
  font-size: 13px;
  line-height: 1.5;
  color: #1f2937;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.kpi-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.kpi-icon-bg {
  border-radius: 8px;
  padding: 12px 0;
  margin-bottom: 6px;
}
.kpi-num {
  font-size: 26px;
  font-weight: 800;
  color: #1f2937;
}
.kpi-unit {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}
.kpi-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}
.kpi-bar {
  height: 4px;
  border-radius: 2px;
  background: #f3f4f6;
  overflow: hidden;
}
.kpi-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

.chart-box {
  width: 100%;
}

.cycle-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
}
.cycle-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.25s;
}
.cycle-card:hover,
.cycle-card.active {
  border-color: #06b6d4;
  background: #f0fdfa;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.1);
}
.cc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.cc-lag {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}
.cc-score {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}
.cc-score.high {
  background: #f0fdf4;
  color: #16a34a;
}
.cc-score.mid {
  background: #fffbeb;
  color: #d97706;
}
.cc-score.low {
  background: #f3f4f6;
  color: #6b7280;
}
.cc-conf {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 6px;
}
.cc-bar {
  height: 3px;
  border-radius: 2px;
  background: #f3f4f6;
  overflow: hidden;
  margin-bottom: 6px;
}
.cc-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #06b6d4, #22d3ee);
  transition: width 0.4s;
}
.cc-action {
  font-size: 11px;
  color: #0891b2;
  cursor: pointer;
}
.cc-action:hover {
  text-decoration: underline;
}

.drawer-content {
  padding: 0 4px;
}
.drawer-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.drawer-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}
.drawer-badge.cycle {
  background: #ecfeff;
  color: #0891b2;
  border: 1px solid #a5f3fc;
}
.drawer-lag {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.detail-item {
  background: #f9fafb;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #f3f4f6;
}
.detail-label {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
}
.detail-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}
.detail-value.cyan {
  color: #0891b2;
}
.detail-section {
  margin-bottom: 14px;
}
.detail-section-title {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e5e7eb;
}
.evidence-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.8;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 3px solid #06b6d4;
}
.evidence-text.strategy {
  border-left-color: #22c55e;
}

@media (max-width: 768px) {
  .governance-brief {
    flex-direction: column;
  }

  .kpi-row {
    grid-template-columns: 1fr;
  }

  .cycle-cards {
    grid-template-columns: 1fr;
  }
}

/* 模型标签 */
.ml-badge {
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
  color: #059669;
  border: 1px solid #6ee7b7;
}
.ml-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  margin-right: 5px;
  animation: ml-pulse 2s ease-in-out infinite;
}
@keyframes ml-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 4px #10b981; }
  50% { opacity: 0.5; box-shadow: 0 0 8px #34d399; }
}
.synthetic-badge {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fcd34d;
}
.model-info-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
}
.mi-item { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
.mi-label { color: #94a3b8; font-weight: 500; }
.mi-value { color: #334155; font-weight: 600; }
.mi-sep { color: #cbd5e1; margin: 0 2px; }
.refresh-item { display: flex; align-items: flex-end; justify-content: flex-end; }
.refresh-btn {
  background: linear-gradient(135deg, #eff6ff, #f0f9ff);
  border: 1px solid #93c5fd;
  color: #2563eb;
  font-weight: 600;
  transition: all 0.2s;
}
.refresh-btn:hover {
  background: linear-gradient(135deg, #dbeafe, #e0f2fe);
  border-color: #60a5fa;
  box-shadow: 0 0 8px rgba(59,130,246,0.2);
}
</style>
