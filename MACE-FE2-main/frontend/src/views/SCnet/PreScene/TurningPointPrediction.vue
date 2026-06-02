<template>
  <div class="tp-page">
    <!-- 顶部控制面板 -->
    <div class="glass-panel control-panel">
      <div class="panel-title">
        <span class="glow-dot"></span>
        <span>汽车供应链拐点预测中枢</span>
        <el-tooltip
          content="基于交期、库存、成本、供应商健康度和订单信号，识别汽车供应链中可能出现方向性突变的关键节点"
          placement="top"
          :show-after="200"
        >
          <el-icon class="help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
        <span v-if="backendAvailable && modelInfo" class="badge ml-badge">
          <span class="ml-dot"></span>
          {{ modelInfo.algorithmLabel || '多因子拐点检测' }}
        </span>
        <span v-else class="badge pulse-badge" :class="{ 'synthetic-badge': !backendAvailable }">
          {{ backendAvailable ? 'RISK TURNING POINT' : '前端合成' }}
        </span>
      </div>

      <div class="control-grid">
        <div class="ctrl-item">
          <label>
            拐点阈值
            <el-tooltip content="拐点判定的概率门槛值，高于此值判为风险上升拐点，低于互补值判为风险缓和拐点" placement="top" :show-after="200">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
            <span class="val-tag">{{ threshold }}</span>
          </label>
          <el-slider v-model="threshold" :min="50" :max="85" :step="1" class="neon-slider" />
        </div>

        <div class="ctrl-item">
          <label>
            预判提前量
            <el-tooltip content="模型在拐点实际形成前多少个时间步发出预警信号" placement="top" :show-after="200">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
            <span class="val-tag">{{ lookahead }}步</span>
          </label>
          <el-slider v-model="lookahead" :min="2" :max="10" :step="1" class="neon-slider" />
        </div>

        <div class="ctrl-item">
          <label>{{ factorLabels.policy }} <span class="val-tag">{{ weights.policy }}</span></label>
          <el-slider v-model="weights.policy" :min="10" :max="70" :step="1" class="neon-slider" />
        </div>

        <div class="ctrl-item">
          <label>{{ factorLabels.sentiment }} <span class="val-tag">{{ weights.sentiment }}</span></label>
          <el-slider v-model="weights.sentiment" :min="10" :max="70" :step="1" class="neon-slider" />
        </div>

        <div class="ctrl-item">
          <label>{{ factorLabels.market }} <span class="val-tag">{{ weights.market }}</span></label>
          <el-slider v-model="weights.market" :min="10" :max="70" :step="1" class="neon-slider" />
        </div>

        <div class="ctrl-item refresh-item">
          <el-button
            class="refresh-btn"
            :loading="loading"
            :icon="loading ? '' : 'Refresh'"
            size="small"
            round
            @click="refreshTurning"
          >
            {{ loading ? '检测中...' : '刷新检测' }}
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
        <span class="mi-sep">|</span>
        <span class="mi-item">
          <span class="mi-label">因子权重</span>
          <span class="mi-value">
            政策{{ ((modelInfo.factorWeights?.policy || 0.35) * 100).toFixed(0) }}% /
            舆情{{ ((modelInfo.factorWeights?.sentiment || 0.30) * 100).toFixed(0) }}% /
            市场{{ ((modelInfo.factorWeights?.market || 0.35) * 100).toFixed(0) }}%
          </span>
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
        {{ currentScenarioMeta.turningAlias }}
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
        <div class="kpi-ring" :style="{ '--ring-color': item.color, '--ring-pct': item.pct + '%' }">
          <div class="kpi-value">{{ item.value }}</div>
        </div>
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-unit">{{ item.unit }}</div>
      </div>
    </div>

    <!-- 主图表区 -->
    <div class="charts-grid">
      <div class="glass-panel chart-main">
        <div class="panel-title">
          <span class="glow-dot cyan"></span>
          {{ governanceBrief.probabilityTitle }}
          <span class="badge info-badge">点击散点查看证据链</span>
        </div>
        <div ref="probabilityChartRef" class="chart-box" style="height: 340px"></div>
      </div>

      <div class="chart-side-col">
        <div class="glass-panel">
          <div class="panel-title">
            <span class="glow-dot purple"></span>
            {{ governanceBrief.factorPanelTitle }}
            <el-tooltip content="以雷达图形式展示交期、需求、库存/成本等因素对拐点触发的贡献度" placement="top" :show-after="200">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
          <div ref="radarChartRef" class="chart-box" style="height: 260px"></div>
        </div>

        <div class="glass-panel candidate-panel">
          <div class="panel-title">
            <span class="glow-dot orange"></span>
            候选供应链拐点信号
            <el-tooltip content="算法检测到的潜在供应链转折点，按概率和置信度排序" placement="top" :show-after="200">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>

          <div class="candidate-list">
            <div
              v-for="c in turningCandidates"
              :key="c.id"
              class="candidate-row"
              :class="{ peak: c.typeKey === 'peak', valley: c.typeKey === 'valley' }"
              @click="openCandidateDetail(c)"
            >
              <div class="c-indicator" :class="c.typeKey"></div>
              <div class="c-info">
                <span class="c-date">{{ c.date }}</span>
                <span class="c-type">{{ c.type }}</span>
              </div>
              <div class="c-prob">{{ c.probability }}%</div>
              <div class="c-conf">置信 {{ c.confidence }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3D 势能图 -->
    <div class="glass-panel">
      <div class="panel-title">
        <span class="glow-dot"></span>
        3D 供应链拐点势能图
        <el-tooltip content="将时间、波动率、拐点概率映射到三维空间，展示供应链风险势能积聚区域" placement="top" :show-after="200">
          <el-icon class="help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
        <span class="badge info-badge">拖拽旋转视角</span>
      </div>
      <div ref="potentialChartRef" class="chart-box" style="height: 400px"></div>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="" size="420px" class="dark-drawer" :with-header="false">
      <div class="drawer-content" v-if="selectedCandidate">
        <div class="drawer-header">
          <div class="drawer-badge" :class="selectedCandidate.typeKey">
            {{ selectedCandidate.type }}
          </div>
          <div class="drawer-date">{{ selectedCandidate.date }}</div>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">预测概率</div>
            <div class="detail-value danger">{{ selectedCandidate.probability }}%</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">
              置信度
              <el-tooltip content="模型对该供应链拐点判定结果的可靠程度，数值越高越可信" placement="top" :show-after="200">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
            <div class="detail-value cyan">{{ selectedCandidate.confidence }}%</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">提前量</div>
            <div class="detail-value">{{ selectedCandidate.leadTime }} 步</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">
              突出度
              <el-tooltip content="拐点相对于周围数据的显著程度，突出度越高说明转折越明显" placement="top" :show-after="200">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
            <div class="detail-value">{{ selectedCandidate.prominence }}</div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">核心驱动因子</div>
          <div class="driver-tags">
            <span v-for="d in selectedCandidate.drivers" :key="d" class="glow-tag">{{ d }}</span>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">证据链分析</div>
          <div class="evidence-text">{{ selectedCandidate.evidence }}</div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import 'echarts-gl'
import { QuestionFilled } from '@element-plus/icons-vue'
import { getTurningPrediction } from '@/api/turningPrediction'

const SCENARIO_FACTOR = {
  shortage_turning: {
    base: 54,
    phase: 0.35,
    volatility: 1.28,
    defaultThreshold: 66,
    defaultLookahead: 6,
    defaultWeights: { policy: 46, sentiment: 26, market: 28 },
    driverScale: { policy: 1.22, sentiment: 0.88, market: 1.05 },
    turningAlias: '关键零部件短缺拐点链路',
    probabilityTitle: '供应短缺拐点概率曲线',
    factorPanelTitle: '短缺触发因素雷达',
    summary: '该场景由车规芯片交期、关键物料库存、供应商准时率和重点车型排产共同驱动，用于判断供应压力是否从可控紧张转向断供风险。',
    focusTags: ['车规芯片交期', '安全库存', '供应商准时率', '重点车型排产'],
    factorLabels: { policy: '交期拉长信号', sentiment: '订单需求强度', market: '库存消耗压力' },
    turningType: { peak: '短缺升温拐点', valley: '短缺缓和拐点' },
    kpiTitles: { turningCount: '候选短缺拐点', topProbability: '最高短缺概率', avgLeadTime: '平均预警提前' }
  },

  cost_rebound: {
    base: 50,
    phase: 0.95,
    volatility: 1.22,
    defaultThreshold: 65,
    defaultLookahead: 5,
    defaultWeights: { policy: 35, sentiment: 24, market: 41 },
    driverScale: { policy: 0.95, sentiment: 0.86, market: 1.24 },
    turningAlias: '成本反弹拐点链路',
    probabilityTitle: '成本反弹拐点概率曲线',
    factorPanelTitle: '成本触发因素雷达',
    summary: '该场景关注锂、镍、钢铝、能源与运价等成本变量，识别低位成本环境是否开始向BOM压力和整车毛利压力传导。',
    focusTags: ['锂价反弹', '钢铝价格', '海运运价', 'BOM成本'],
    factorLabels: { policy: '采购锁价覆盖', sentiment: '订单价格敏感度', market: '材料成本波动' },
    turningType: { peak: '成本反弹拐点', valley: '成本缓和拐点' },
    kpiTitles: { turningCount: '候选成本拐点', topProbability: '最高反弹概率', avgLeadTime: '平均采购提前' }
  },

  inventory_overhang: {
    base: 58,
    phase: 0.78,
    volatility: 1.38,
    defaultThreshold: 64,
    defaultLookahead: 5,
    defaultWeights: { policy: 32, sentiment: 35, market: 33 },
    driverScale: { policy: 0.92, sentiment: 1.18, market: 1.14 },
    turningAlias: '库存积压拐点链路',
    probabilityTitle: '库存积压拐点概率曲线',
    factorPanelTitle: '库存触发因素雷达',
    summary: '该场景由渠道库存天数、终端动销、折扣压力和主机厂排产偏差共同驱动，用于识别是否从合理备货转向被动累库。',
    focusTags: ['库存天数', '终端动销', '渠道折扣', '排产偏差'],
    factorLabels: { policy: '排产调整力度', sentiment: '终端需求变化', market: '库存折扣压力' },
    turningType: { peak: '积压升温拐点', valley: '去库改善拐点' },
    kpiTitles: { turningCount: '候选库存拐点', topProbability: '最高积压概率', avgLeadTime: '平均去库提前' }
  },

  supplier_break: {
    base: 52,
    phase: 1.25,
    volatility: 1.32,
    defaultThreshold: 67,
    defaultLookahead: 7,
    defaultWeights: { policy: 44, sentiment: 22, market: 34 },
    driverScale: { policy: 1.18, sentiment: 0.82, market: 1.16 },
    turningAlias: '核心供应商断点风险链路',
    probabilityTitle: '供应商断点风险概率曲线',
    factorPanelTitle: '断点触发因素雷达',
    summary: '该场景关注核心供应商健康度、财务承压、质量事故、单一来源依赖和交付波动，识别潜在供应链断点。',
    focusTags: ['供应商健康度', '质量事故', '单一来源依赖', '交付波动'],
    factorLabels: { policy: '供应商健康度', sentiment: '质量舆情信号', market: '交付波动压力' },
    turningType: { peak: '断点风险拐点', valley: '风险缓释拐点' },
    kpiTitles: { turningCount: '候选断点拐点', topProbability: '最高断点概率', avgLeadTime: '平均响应提前' }
  }
}

const DEFAULT_TURNING_CONTEXT = {
  mandate: {
    value: 'shortage_turning',
    label: '供应短缺拐点识别',
    desc: '识别芯片、电池、热管理、线束等环节从可控紧张转为断供风险的信号组合。'
  },
  activeDomainIds: ['supplier_health', 'shortage_signal', 'cost_signal', 'inventory_alert'],
  activeDomains: [
    { id: 'supplier_health', label: '核心供应商健康度' },
    { id: 'shortage_signal', label: '短缺预警信号' },
    { id: 'cost_signal', label: '成本波动信号' },
    { id: 'inventory_alert', label: '库存压力信号' }
  ],
  avgQuality: 81,
  outputTitle: '断供风险拐点预警',
  outputHint: '后续拐点曲线会提高对交期拉长、报价跳升和库存下降组合信号的敏感度。'
}

const TURNING_MANDATE_EFFECTS = {
  shortage_turning: {
    probabilityTitle: '供应短缺拐点概率曲线',
    factorPanelTitle: '短缺触发因素雷达',
    outputTitle: '断供风险拐点预警',
    scenarioKey: 'shortage_turning',
    thresholdShift: -2,
    baseShift: 5,
    volatilityShift: 0.18,
    driverBias: { policy: 9, sentiment: 2, market: 5 },
    peakBias: 1.16,
    valleyBias: 0.88
  },

  cost_rebound: {
    probabilityTitle: '成本反弹拐点概率曲线',
    factorPanelTitle: '成本触发因素雷达',
    outputTitle: '成本反弹触发监测',
    scenarioKey: 'cost_rebound',
    thresholdShift: -1,
    baseShift: 3,
    volatilityShift: 0.2,
    driverBias: { policy: 3, sentiment: 2, market: 10 },
    peakBias: 1.14,
    valleyBias: 0.9
  },

  inventory_overhang: {
    probabilityTitle: '库存积压拐点概率曲线',
    factorPanelTitle: '库存触发因素雷达',
    outputTitle: '库存积压拐点识别',
    scenarioKey: 'inventory_overhang',
    thresholdShift: -3,
    baseShift: 6,
    volatilityShift: 0.14,
    driverBias: { policy: 4, sentiment: 8, market: 7 },
    peakBias: 1.18,
    valleyBias: 0.86
  },

  supplier_break: {
    probabilityTitle: '供应商断点风险概率曲线',
    factorPanelTitle: '断点触发因素雷达',
    outputTitle: '供应商断点风险评估',
    scenarioKey: 'supplier_break',
    thresholdShift: -1,
    baseShift: 4,
    volatilityShift: 0.24,
    driverBias: { policy: 9, sentiment: 3, market: 8 },
    peakBias: 1.15,
    valleyBias: 0.9
  }
}

const TURNING_DOMAIN_EFFECTS = {
  supplier_health: { confidence: 4, base: 4, driverBias: { policy: 8, sentiment: 1, market: 4 } },
  shortage_signal: { confidence: 4, base: 5, driverBias: { policy: 9, sentiment: 1, market: 5 } },
  cost_signal: { confidence: 3, base: 3, driverBias: { policy: 2, sentiment: 1, market: 9 } },
  inventory_alert: { confidence: 2, base: 4, driverBias: { policy: 3, sentiment: 8, market: 7 } },

  chip_supply: { confidence: 3, base: 4, driverBias: { policy: 8, sentiment: 0, market: 4 } },
  battery_material: { confidence: 3, base: 3, driverBias: { policy: 2, sentiment: 1, market: 9 } },
  vehicle_inventory: { confidence: 2, base: 4, driverBias: { policy: 3, sentiment: 8, market: 7 } },
  logistics_delivery: { confidence: 2, base: 3, driverBias: { policy: 4, sentiment: 1, market: 6 } }
}

export default {
  name: 'PowerGame_TurningPointPrediction',
  components: { QuestionFilled },

  props: {
    analysisContext: {
      type: Object,
      default: () => DEFAULT_TURNING_CONTEXT
    }
  },

  data() {
    return {
      selectedScenario: 'shortage_turning',
      threshold: 66,
      lookahead: 6,
      weights: { policy: 46, sentiment: 26, market: 28 },
      probabilityChart: null,
      potentialChart: null,
      radarChart: null,
      resizeTimer: null,
      labels: [],
      probabilitySeries: [],
      volatilitySeries: [],
      peakScatter2D: [],
      valleyScatter2D: [],
      potentialLine3D: [],
      potentialScatter3D: [],
      factorContribution: [],
      turningCandidates: [],
      selectedCandidate: null,
      detailVisible: false,
      kpi: { turningCount: 0, topProbability: 0, avgLeadTime: 0 },
      backendAvailable: true,
      modelInfo: null,
      loading: false,
      lastRefreshTime: null
    }
  },

  computed: {
    currentScenarioMeta() {
      const ctx = this.analysisContext || DEFAULT_TURNING_CONTEXT
      const effect = TURNING_MANDATE_EFFECTS[ctx.mandate?.value] || TURNING_MANDATE_EFFECTS.shortage_turning
      return SCENARIO_FACTOR[effect.scenarioKey] || SCENARIO_FACTOR[this.selectedScenario] || SCENARIO_FACTOR.shortage_turning
    },

    governanceBrief() {
      const ctx = this.analysisContext || DEFAULT_TURNING_CONTEXT
      const effect = TURNING_MANDATE_EFFECTS[ctx.mandate?.value] || TURNING_MANDATE_EFFECTS.shortage_turning
      const activeDomains = ctx.activeDomains?.length ? ctx.activeDomains : DEFAULT_TURNING_CONTEXT.activeDomains

      return {
        question: ctx.mandate?.label || DEFAULT_TURNING_CONTEXT.mandate.label,
        desc: ctx.mandate?.desc || DEFAULT_TURNING_CONTEXT.mandate.desc,
        domainText: activeDomains.map(item => item.label).join('、'),
        outputTitle: ctx.outputTitle || effect.outputTitle,
        probabilityTitle: effect.probabilityTitle,
        factorPanelTitle: effect.factorPanelTitle
      }
    },

    factorLabels() {
      return this.currentScenarioMeta.factorLabels
    },

    kpiList() {
      const m = this.currentScenarioMeta.kpiTitles

      return [
        {
          label: m.turningCount,
          value: this.kpi.turningCount,
          unit: '个',
          color: '#f59e0b',
          pct: Math.min(100, this.kpi.turningCount * 14)
        },
        {
          label: m.topProbability,
          value: this.kpi.topProbability,
          unit: '%',
          color: '#ef4444',
          pct: this.kpi.topProbability
        },
        {
          label: m.avgLeadTime,
          value: this.kpi.avgLeadTime,
          unit: '步',
          color: '#06b6d4',
          pct: Math.min(100, this.kpi.avgLeadTime * 10)
        }
      ]
    },

    controlSignature() {
      return [
        this.selectedScenario,
        this.threshold,
        this.lookahead,
        this.weights.policy,
        this.weights.sentiment,
        this.weights.market
      ].join('|')
    },

    renderSignature() {
      const ctx = this.analysisContext || DEFAULT_TURNING_CONTEXT

      return [
        this.controlSignature,
        ctx.mandate?.value || 'shortage_turning',
        (ctx.activeDomainIds || []).join(','),
        ctx.avgQuality || 81
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
    this.probabilityChart?.dispose()
    this.potentialChart?.dispose()
    this.radarChart?.dispose()
  },

  methods: {
    getGovernanceState() {
      const ctx = this.analysisContext || DEFAULT_TURNING_CONTEXT
      const mandateValue = ctx.mandate?.value || DEFAULT_TURNING_CONTEXT.mandate.value
      const effect = TURNING_MANDATE_EFFECTS[mandateValue] || TURNING_MANDATE_EFFECTS.shortage_turning
      const activeDomainIds = ctx.activeDomainIds?.length ? ctx.activeDomainIds : DEFAULT_TURNING_CONTEXT.activeDomainIds
      const avgQuality = Number.isFinite(ctx.avgQuality) ? ctx.avgQuality : DEFAULT_TURNING_CONTEXT.avgQuality

      const domainDriverBias = { policy: 0, sentiment: 0, market: 0 }
      let domainConfidence = 0
      let domainBase = 0

      activeDomainIds.forEach((id) => {
        const domain = TURNING_DOMAIN_EFFECTS[id]
        if (!domain) return

        domainConfidence += domain.confidence
        domainBase += domain.base
        domainDriverBias.policy += domain.driverBias.policy
        domainDriverBias.sentiment += domain.driverBias.sentiment
        domainDriverBias.market += domain.driverBias.market
      })

      return {
        effect,
        qualityFactor: avgQuality / 100,
        coverageFactor: activeDomainIds.length / DEFAULT_TURNING_CONTEXT.activeDomainIds.length,
        domainConfidence,
        domainBase,
        domainDriverBias
      }
    },

    applyScenarioFromMandate(resetControls = false) {
      const ctx = this.analysisContext || DEFAULT_TURNING_CONTEXT
      const effect = TURNING_MANDATE_EFFECTS[ctx.mandate?.value] || TURNING_MANDATE_EFFECTS.shortage_turning
      const scenarioKey = effect.scenarioKey || 'shortage_turning'

      this.selectedScenario = scenarioKey

      if (resetControls) {
        this.applyScenarioPreset()
      }
    },

    applyScenarioPreset() {
      const cfg = this.currentScenarioMeta

      this.threshold = cfg.defaultThreshold
      this.lookahead = cfg.defaultLookahead
      this.weights = { ...cfg.defaultWeights }
    },

    buildLabels(total) {
      const labels = []

      for (let i = 0; i < total; i++) {
        const year = 2024 + Math.floor(i / 12)
        const month = ((i % 12) + 1).toString().padStart(2, '0')
        labels.push(`${year}-${month}`)
      }

      return labels
    },

    clamp(v, min, max) {
      return Math.min(max, Math.max(min, v))
    },

    normalizeWeights() {
      const t = this.weights.policy + this.weights.sentiment + this.weights.market

      if (t <= 0) {
        return { policy: 1 / 3, sentiment: 1 / 3, market: 1 / 3 }
      }

      return {
        policy: this.weights.policy / t,
        sentiment: this.weights.sentiment / t,
        market: this.weights.market / t
      }
    },

    buildSmoothedSeries(values) {
      return values.map((v, i, a) => {
        const p = a[i - 1] ?? v
        const n = a[i + 1] ?? v
        return +(p * 0.25 + v * 0.5 + n * 0.25).toFixed(2)
      })
    },

    async rebuildData() {
      if (this.loading) return
      this.loading = true

      const cfg = this.currentScenarioMeta
      const governance = this.getGovernanceState()

      // 尝试后端 API
      try {
        const nw = this.normalizeWeights()
        const response = await getTurningPrediction({
          metric: 'total_amount',
          threshold: this.threshold / 100,
          lookahead: this.lookahead,
          policy_weight: nw.policy / 100,
          sentiment_weight: nw.sentiment / 100,
          market_weight: nw.market / 100
        })

        if (response && response.success && response.data) {
          this.backendAvailable = true
          this.lastRefreshTime = new Date().toLocaleTimeString('zh-CN', { hour12: false })
          this.applyApiResponse(response.data, cfg, governance)
          this.loading = false
          return
        }
      } catch (e) {
        console.warn('拐点识别API调用失败，回退至前端合成:', e.message)
      }
      this.backendAvailable = false
      this.rebuildDataSynthetic(cfg, governance)
      this.loading = false
    },

    async refreshTurning() {
      this.loading = false
      await this.rebuildData()
      this.renderCharts()
    },

    applyApiResponse(data, cfg, governance) {
      this.labels = data.labels || []
      this.probabilitySeries = data.probabilitySeries || []
      this.volatilitySeries = data.volatilitySeries || []
      this.peakScatter2D = data.peakScatter2D || []
      this.valleyScatter2D = data.valleyScatter2D || []
      this.potentialLine3D = data.potentialLine3D || []
      this.potentialScatter3D = data.potentialScatter3D || []
      this.factorContribution = data.factorContribution || []
      this.modelInfo = data.modelInfo || null
      this.kpi = data.kpi || { turningCount: 0, topProbability: 0, avgLeadTime: 0 }

      this.turningCandidates = (data.turningCandidates || []).map(c => ({
        ...c,
        evidence: c.evidence || `围绕"${this.governanceBrief.question}"，${cfg.turningAlias}在 ${c.date} 附近检测到显著曲率突变信号，主因来自 ${(c.drivers || ['政策']).join('与')} 的同步放大效应，建议提前 ${c.leadTime} 步启动供应链响应预案。`
      }))

      if (!this.selectedCandidate || !this.turningCandidates.find(c => c.id === this.selectedCandidate.id)) {
        this.selectedCandidate = this.turningCandidates[0] || null
      }
    },

    rebuildDataSynthetic(cfg, governance) {
      this.modelInfo = null
      this.lastRefreshTime = null
      const total = 48
      const labels = this.buildLabels(total)
      const nw = this.normalizeWeights()
      const probability = []
      const volatility = []
      const factorTrace = []
      const effectiveThreshold = this.clamp(this.threshold + governance.effect.thresholdShift, 45, 90)

      for (let i = 0; i < total; i++) {
        const pd =
          (12 * Math.sin(i / 3.7 + cfg.phase) + 5 * Math.cos(i / 8.2)) *
            cfg.driverScale.policy +
          governance.effect.driverBias.policy +
          governance.domainDriverBias.policy * 0.18

        const sd =
          (9 * Math.cos(i / 4.3 + cfg.phase * 0.8) + 4 * Math.sin(i / 6.5)) *
            cfg.driverScale.sentiment +
          governance.effect.driverBias.sentiment +
          governance.domainDriverBias.sentiment * 0.18

        const md =
          (8 * Math.sin(i / 5.5 + cfg.phase * 1.2) + 3 * Math.cos(i / 2.6)) *
            cfg.driverScale.market +
          governance.effect.driverBias.market +
          governance.domainDriverBias.market * 0.18

        const core = cfg.base + governance.effect.baseShift + governance.domainBase + i * 0.18
        const combined =
          core +
          pd * nw.policy +
          sd * nw.sentiment +
          md * nw.market +
          Math.sin(i * 1.8) * cfg.volatility

        probability.push(+this.clamp(combined, 8, 96).toFixed(2))

        factorTrace.push({
          policy: +Math.abs(pd * nw.policy).toFixed(2),
          sentiment: +Math.abs(sd * nw.sentiment).toFixed(2),
          market: +Math.abs(md * nw.market).toFixed(2)
        })
      }

      const smoothed = this.buildSmoothedSeries(probability)

      for (let i = 0; i < total; i++) {
        const prev = i > 0 ? smoothed[i - 1] : smoothed[i]
        volatility.push(+((Math.abs(smoothed[i] - prev) * (1 + governance.effect.volatilityShift)).toFixed(2)))
      }

      const candidates = this.buildTurningCandidates(smoothed, labels, factorTrace, cfg, effectiveThreshold, governance)

      const peakScatter = candidates
        .filter(c => c.typeKey === 'peak')
        .map(c => ({ value: [c.date, c.probability], id: c.id, name: c.type }))

      const valleyScatter = candidates
        .filter(c => c.typeKey === 'valley')
        .map(c => ({ value: [c.date, c.probability], id: c.id, name: c.type }))

      const line3D = smoothed.map((v, i) => [i, volatility[i] * 8, v / 10])
      const scatter3D = candidates.map(c => [c.index, volatility[c.index] * 8, c.probability / 10, c.id])

      const recent = factorTrace.slice(-12)
      const avg = recent.reduce(
        (a, c) => {
          a.policy += c.policy
          a.sentiment += c.sentiment
          a.market += c.market
          return a
        },
        { policy: 0, sentiment: 0, market: 0 }
      )

      const n = Math.max(1, recent.length)

      this.factorContribution = [
        { name: cfg.factorLabels.policy, value: +((avg.policy / n) * governance.effect.peakBias).toFixed(2) },
        {
          name: cfg.factorLabels.sentiment,
          value: +((avg.sentiment / n) * ((governance.effect.peakBias + governance.effect.valleyBias) / 2)).toFixed(2)
        },
        { name: cfg.factorLabels.market, value: +((avg.market / n) * governance.effect.valleyBias).toFixed(2) }
      ]

      const avgLead = candidates.reduce((a, c) => a + c.leadTime, 0) / Math.max(1, candidates.length)
      const topProb = candidates.length ? Math.max(...candidates.map(c => c.probability)) : 0

      this.labels = labels
      this.probabilitySeries = smoothed
      this.volatilitySeries = volatility
      this.turningCandidates = candidates
      this.peakScatter2D = peakScatter
      this.valleyScatter2D = valleyScatter
      this.potentialLine3D = line3D
      this.potentialScatter3D = scatter3D
      this.kpi = {
        turningCount: candidates.length,
        topProbability: +topProb.toFixed(1),
        avgLeadTime: +avgLead.toFixed(1)
      }

      if (!this.selectedCandidate || !candidates.find(c => c.id === this.selectedCandidate.id)) {
        this.selectedCandidate = candidates[0] || null
      }
    },

    buildTurningCandidates(series, labels, factorTrace, cfg, effectiveThreshold, governance) {
      const minProm = Math.max(1.4, (100 - effectiveThreshold) * 0.04)

      const buildRow = (index, typeKey, prominence) => {
        const curr = series[index]
        const prev = series[index - 1] ?? curr
        const dp = factorTrace[index]

        const sorted = [
          { key: cfg.factorLabels.policy, value: dp.policy },
          { key: cfg.factorLabels.sentiment, value: dp.sentiment },
          { key: cfg.factorLabels.market, value: dp.market }
        ].sort((a, b) => b.value - a.value)

        const leadTime = Math.max(1, this.lookahead - Math.round(prominence * 0.45))
        const confidence = Math.min(
          97,
          Math.round(58 + prominence * 6 + Math.abs(curr - prev) * 2.4 + governance.domainConfidence + governance.qualityFactor * 8)
        )

        return {
          id: `${labels[index]}-${index}`,
          index,
          date: labels[index],
          typeKey,
          type: cfg.turningType[typeKey],
          probability: +curr.toFixed(1),
          confidence,
          leadTime,
          prominence: +prominence.toFixed(2),
          drivers: sorted.slice(0, 2).map(i => i.key),
          evidence: `围绕“${this.governanceBrief.question}”，${cfg.turningAlias}在 ${labels[index]} 附近检测到显著曲率突变信号，主因来自 ${sorted[0].key} 与 ${sorted[1].key} 的同步放大效应，建议提前 ${leadTime} 步启动供应链响应预案。`
        }
      }

      const raw = []

      for (let i = 2; i < series.length - 2; i++) {
        const c = series[i]
        const p = series[i - 1]
        const nx = series[i + 1]
        const lMin = Math.min(series[i - 2], p)
        const rMin = Math.min(nx, series[i + 2])
        const lMax = Math.max(series[i - 2], p)
        const rMax = Math.max(nx, series[i + 2])

        const pp = (c - Math.min(lMin, rMin)) * governance.effect.peakBias
        const vp = (Math.max(lMax, rMax) - c) * governance.effect.valleyBias

        if (c >= p && c > nx && c >= effectiveThreshold && pp >= minProm) {
          raw.push(buildRow(i, 'peak', pp))
        }

        if (c <= p && c < nx && c <= 100 - effectiveThreshold && vp >= minProm) {
          raw.push(buildRow(i, 'valley', vp))
        }
      }

      const dedupe = (rows) => {
        const s = [...rows].sort((a, b) => a.index - b.index)
        const r = []

        s.forEach(row => {
          const last = r[r.length - 1]

          if (!last || row.index - last.index > 1 || row.typeKey !== last.typeKey) {
            r.push(row)
            return
          }

          const replace =
            row.typeKey === 'peak'
              ? row.probability > last.probability
              : row.probability < last.probability

          if (replace) r[r.length - 1] = row
        })

        return r
      }

      let candidates = dedupe(raw)

      if (!candidates.length) {
        const fb = []

        for (let i = 2; i < series.length - 2; i++) {
          const c = series[i]
          const p = series[i - 1]
          const nx = series[i + 1]
          const lMin = Math.min(series[i - 2], p)
          const rMin = Math.min(nx, series[i + 2])
          const lMax = Math.max(series[i - 2], p)
          const rMax = Math.max(nx, series[i + 2])
          const pp = c - Math.min(lMin, rMin)
          const vp = Math.max(lMax, rMax) - c

          if (c >= p && c > nx && pp > 0.8) fb.push(buildRow(i, 'peak', pp))
          if (c <= p && c < nx && vp > 0.8) fb.push(buildRow(i, 'valley', vp))
        }

        candidates = dedupe(fb).sort((a, b) => b.prominence - a.prominence).slice(0, 8)
      }

      return candidates.sort((a, b) => a.index - b.index)
    },

    initCharts() {
      if (this.$refs.probabilityChartRef && !this.probabilityChart) {
        this.probabilityChart = echarts.init(this.$refs.probabilityChartRef, null, { renderer: 'canvas' })
        this.probabilityChart.on('click', this.onChartClick)
      }

      if (this.$refs.potentialChartRef && !this.potentialChart) {
        this.potentialChart = echarts.init(this.$refs.potentialChartRef)
        this.potentialChart.on('click', this.onPotentialClick)
      }

      if (this.$refs.radarChartRef && !this.radarChart) {
        this.radarChart = echarts.init(this.$refs.radarChartRef)
      }
    },

    renderCharts() {
      this.renderProbabilityChart()
      this.renderRadarChart()
      this.renderPotentialChart()
    },

    renderProbabilityChart() {
      if (!this.probabilityChart) return

      const cfg = this.currentScenarioMeta
      const effectiveThreshold = this.clamp(this.threshold + this.getGovernanceState().effect.thresholdShift, 45, 90)

      this.probabilityChart.setOption({
        backgroundColor: 'transparent',
        legend: { top: 4, textStyle: { color: '#6b7280', fontSize: 11 } },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          borderColor: '#e5e7eb',
          textStyle: { color: '#1f2937' }
        },
        grid: { top: 40, left: 50, right: 24, bottom: 40 },
        xAxis: {
          type: 'category',
          data: this.labels,
          axisLabel: { color: '#6b7280', interval: 3 },
          axisLine: { lineStyle: { color: '#e5e7eb' } },
          splitLine: { show: false }
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          axisLabel: { color: '#6b7280' },
          axisLine: { lineStyle: { color: '#e5e7eb' } },
          splitLine: { lineStyle: { color: '#f3f4f6' } }
        },
        series: [
          {
            name: '拐点概率',
            type: 'line',
            smooth: true,
            showSymbol: false,
            lineStyle: { color: '#ef4444', width: 2, shadowColor: 'rgba(239,68,68,0.5)', shadowBlur: 8 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
                { offset: 1, color: 'rgba(239, 68, 68, 0.02)' }
              ])
            },
            data: this.probabilitySeries
          },
          {
            name: `${cfg.turningType.peak}阈值`,
            type: 'line',
            showSymbol: false,
            lineStyle: { color: '#f97316', type: 'dashed', width: 1 },
            data: this.labels.map(() => effectiveThreshold)
          },
          {
            name: `${cfg.turningType.valley}阈值`,
            type: 'line',
            showSymbol: false,
            lineStyle: { color: '#22c55e', type: 'dashed', width: 1 },
            data: this.labels.map(() => 100 - effectiveThreshold)
          },
          {
            name: cfg.turningType.peak,
            type: 'scatter',
            symbolSize: 16,
            symbol: 'triangle',
            itemStyle: { color: '#ef4444', borderColor: '#fff', borderWidth: 2, shadowColor: 'rgba(239,68,68,0.8)', shadowBlur: 12 },
            data: this.peakScatter2D
          },
          {
            name: cfg.turningType.valley,
            type: 'scatter',
            symbolSize: 16,
            symbol: 'triangle',
            symbolRotate: 180,
            itemStyle: { color: '#22c55e', borderColor: '#fff', borderWidth: 2, shadowColor: 'rgba(34,197,94,0.8)', shadowBlur: 12 },
            data: this.valleyScatter2D
          }
        ]
      }, true)
    },

    renderRadarChart() {
      if (!this.radarChart) return

      const maxVal = Math.max(1, ...this.factorContribution.map(f => f.value))

      this.radarChart.setOption({
        backgroundColor: 'transparent',
        radar: {
          indicator: this.factorContribution.map(f => ({ name: f.name, max: maxVal * 1.3 })),
          shape: 'polygon',
          splitNumber: 4,
          axisName: { color: '#6b7280', fontSize: 11 },
          splitArea: {
            areaStyle: {
              color: [
                'rgba(99, 102, 241, 0.03)',
                'rgba(99, 102, 241, 0.06)',
                'rgba(99, 102, 241, 0.03)',
                'rgba(99, 102, 241, 0.06)'
              ]
            }
          },
          splitLine: { lineStyle: { color: '#e5e7eb' } },
          axisLine: { lineStyle: { color: '#d1d5db' } }
        },
        series: [
          {
            type: 'radar',
            data: [
              {
                value: this.factorContribution.map(f => f.value),
                areaStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(99, 102, 241, 0.6)' },
                    { offset: 1, color: 'rgba(99, 102, 241, 0.1)' }
                  ])
                },
                lineStyle: { color: '#818cf8', width: 2, shadowColor: 'rgba(129,140,248,0.6)', shadowBlur: 8 },
                itemStyle: { color: '#a5b4fc', borderColor: '#818cf8', borderWidth: 2 }
              }
            ]
          }
        ]
      }, true)
    },

    renderPotentialChart() {
      if (!this.potentialChart) return

      this.potentialChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          borderColor: '#e5e7eb',
          textStyle: { color: '#1f2937' },
          formatter: (p) => {
            if (p.seriesType === 'scatter3D') {
              const c = this.turningCandidates.find(x => x.id === p.data[3])
              if (c) return `<strong>${c.type}</strong><br/>时间: ${c.date}<br/>概率: ${c.probability}%`
            }

            return `时间: ${p.data[0]}<br/>波动: ${p.data[1].toFixed(1)}<br/>概率: ${(p.data[2] * 10).toFixed(1)}%`
          }
        },
        visualMap: {
          show: false,
          dimension: 2,
          min: 1,
          max: 10,
          inRange: { color: ['#1e40af', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'] }
        },
        xAxis3D: {
          type: 'value',
          min: 0,
          max: Math.max(1, this.labels.length - 1),
          name: '时间',
          nameTextStyle: { color: '#6b7280' },
          axisLabel: { color: '#6b7280' },
          axisLine: { lineStyle: { color: '#d1d5db' } }
        },
        yAxis3D: {
          type: 'value',
          name: '波动',
          nameTextStyle: { color: '#6b7280' },
          axisLabel: { color: '#6b7280' },
          axisLine: { lineStyle: { color: '#d1d5db' } }
        },
        zAxis3D: {
          type: 'value',
          min: 0,
          max: 10,
          name: '概率',
          nameTextStyle: { color: '#6b7280' },
          axisLabel: { color: '#6b7280' },
          axisLine: { lineStyle: { color: '#d1d5db' } }
        },
        grid3D: {
          top: 8,
          bottom: 12,
          boxWidth: 220,
          boxDepth: 120,
          environment: 'none',
          viewControl: { alpha: 26, beta: 25, distance: 280, autoRotate: true, autoRotateSpeed: 3 },
          light: { main: { intensity: 1.2, shadow: true, shadowQuality: 'high' }, ambient: { intensity: 0.5 } },
          postEffect: { enable: true, bloom: { enable: true, bloomIntensity: 0.15 } }
        },
        series: [
          {
            type: 'line3D',
            data: this.potentialLine3D,
            lineStyle: { width: 4, color: '#60a5fa', opacity: 0.8 }
          },
          {
            type: 'scatter3D',
            name: '拐点候选',
            symbolSize: 14,
            data: this.potentialScatter3D,
            itemStyle: { color: '#fbbf24', borderColor: '#fef3c7', borderWidth: 2, opacity: 1 }
          }
        ]
      }, true)
    },

    onChartClick(p) {
      if (p.seriesType !== 'scatter') return

      const row = this.turningCandidates.find(c => c.id === p.data.id)
      if (row) this.openCandidateDetail(row)
    },

    onPotentialClick(p) {
      if (p.seriesType !== 'scatter3D') return

      const row = this.turningCandidates.find(c => c.id === p.data[3])
      if (row) this.openCandidateDetail(row)
    },

    openCandidateDetail(row) {
      this.selectedCandidate = row
      this.detailVisible = true
    },

    handleResize() {
      if (this.resizeTimer) clearTimeout(this.resizeTimer)

      this.resizeTimer = setTimeout(() => {
        this.probabilityChart?.resize()
        this.potentialChart?.resize()
        this.radarChart?.resize()
      }, 180)
    }
  }
}
</script>

<style scoped>
.tp-page {
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
.pulse-badge {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
.info-badge {
  background: #f0f9ff;
  color: #0891b2;
  border: 1px solid #bae6fd;
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
  color: #4f46e5;
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
  color: #6366f1;
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
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
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
  padding: 16px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.kpi-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--ring-color), transparent);
  opacity: 0.5;
}
.kpi-ring {
  width: 72px;
  height: 72px;
  margin: 0 auto 8px;
  border-radius: 50%;
  background: conic-gradient(var(--ring-color) 0% var(--ring-pct), #f3f4f6 var(--ring-pct) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.kpi-ring::before {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: #ffffff;
}
.kpi-value {
  position: relative;
  z-index: 1;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}
.kpi-label {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}
.kpi-unit {
  font-size: 11px;
  color: #9ca3af;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 12px;
}
.chart-side-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.chart-box {
  width: 100%;
}

.candidate-panel {
  flex: 1;
}
.candidate-list {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.candidate-list::-webkit-scrollbar {
  width: 4px;
}
.candidate-list::-webkit-scrollbar-track {
  background: transparent;
}
.candidate-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}
.candidate-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.candidate-row:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}
.c-indicator {
  width: 5px;
  height: 22px;
  border-radius: 3px;
}
.c-indicator.peak {
  background: #ef4444;
}
.c-indicator.valley {
  background: #22c55e;
}
.c-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.c-date {
  font-size: 13px;
  color: #1f2937;
}
.c-type {
  font-size: 11px;
  color: #6b7280;
}
.c-prob {
  font-size: 15px;
  font-weight: 700;
  color: #dc2626;
}
.c-conf {
  font-size: 11px;
  color: #9ca3af;
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
.drawer-badge.peak {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
.drawer-badge.valley {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}
.drawer-date {
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
.detail-value.danger {
  color: #dc2626;
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
.driver-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.evidence-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.8;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 3px solid #6366f1;
}

@media (max-width: 1100px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .governance-brief {
    flex-direction: column;
  }

  .kpi-row {
    grid-template-columns: 1fr;
  }

  .control-grid {
    grid-template-columns: 1fr;
  }
}

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
