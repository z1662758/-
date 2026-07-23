<template>
  <div class="trend-page">
    <!-- 控制面板 -->
    <div class="glass-panel control-panel">
      <div class="panel-title">
        <span class="glow-dot"></span>
        <span>矿山供应链趋势预测沙盘</span>
        <el-tooltip
          content="基于历史供应链指标拟合未来走势，结合不确定性区间推演矿山产量、库存、价格与运输风险"
          placement="top"
          :show-after="200"
        >
          <el-icon class="help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
        <span v-if="backendAvailable && modelInfo" class="badge ml-badge">
          <span class="ml-dot"></span>
          GPR · ML预测
        </span>
        <span v-else class="badge forecast-badge synthetic-badge">
          {{ backendAvailable ? '加载中...' : '前端合成' }}
        </span>
      </div>

      <div class="control-grid">
        <div class="ctrl-item">
          <label>
            预测跨度
            <el-tooltip content="向未来预测的月份数，跨度越长，不确定性区间越宽" placement="top" :show-after="200">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
            <span class="val-tag">{{ forecastHorizon }}个月</span>
          </label>
          <el-slider v-model="forecastHorizon" :min="6" :max="18" :step="1" />
        </div>

        <div class="ctrl-item">
          <label>
            不确定性
            <el-tooltip content="供应链预测波动范围参数，数值越大代表外部扰动越强" placement="top" :show-after="200">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
            <span class="val-tag">{{ uncertainty }}</span>
          </label>
          <el-slider v-model="uncertainty" :min="8" :max="35" :step="1" />
        </div>

        <div class="ctrl-item">
          <label>
            置信阈值
            <el-tooltip content="预测结果的可信概率下限，高于此值的预测更适合作为采购、锁量和库存策略参考" placement="top" :show-after="200">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
            <span class="val-tag">{{ confidenceLevel }}%</span>
          </label>
          <el-slider v-model="confidenceLevel" :min="50" :max="95" :step="1" />
        </div>

        <div class="ctrl-item">
          <label>可视模式</label>
          <el-switch v-model="enable3D" active-text="3D" inactive-text="2D" />
        </div>

        <div class="ctrl-item refresh-item">
          <el-button
            class="refresh-btn"
            :loading="loading"
            :icon="loading ? '' : 'Refresh'"
            size="small"
            round
            @click="refreshPrediction"
          >
            {{ loading ? '预测中...' : '刷新预测' }}
          </el-button>
        </div>
      </div>

      <!-- ML模型信息条 -->
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
          <span class="mi-label">爬虫</span>
          <span v-if="modelInfo.hasCrawlerData" class="mi-value crawler-on">
            已接入 ({{ modelInfo.crawlerUpdatedAt }})
          </span>
          <span v-else class="mi-value crawler-off">暂无实时数据</span>
        </span>
        <span v-if="lastRefreshTime" class="mi-sep">|</span>
        <span v-if="lastRefreshTime" class="mi-item">
          <span class="mi-label">刷新</span>
          <span class="mi-value">{{ lastRefreshTime }}</span>
        </span>
        <span v-if="modelInfo.hasCrawlerData && modelInfo.crawlerRiskModifiers.length" class="mi-sep">|</span>
        <span v-if="modelInfo.hasCrawlerData" class="mi-item">
          <span class="mi-label">外部信号</span>
          <span class="mi-value">
            <template v-for="(m, i) in modelInfo.crawlerRiskModifiers.slice(0, 3)" :key="i">
              <el-tooltip :content="m.value" placement="top" :show-after="200">
                <span :class="['signal-tag', m.level === '偏高' || m.level === '上涨' || m.level === '关注' ? 'signal-warn' : 'signal-ok']">
                  {{ m.source }}{{ m.level === '偏高' || m.level === '上涨' ? '↑' : m.level === '关注' ? '·' : '↓' }}
                </span>
              </el-tooltip>
            </template>
          </span>
        </span>
      </div>
    </div>

    <!-- 场景描述 -->
    <div class="glass-panel scenario-bar">
      <div class="scenario-title">
        <span class="glow-dot green"></span>
        {{ currentScenarioMeta.alias }}
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
      <div class="kpi-card danger-glow">
        <div class="kpi-header">
          <div class="kpi-num">{{ kpi.peakValue }}</div>
          <div class="kpi-trend-icon up">↑</div>
        </div>
        <div class="kpi-sub">预测峰值 <span>风险指数</span></div>
        <div class="kpi-spark">
          <svg viewBox="0 0 120 30" preserveAspectRatio="none">
            <polyline
              :points="sparkPoints"
              fill="none"
              stroke="#ef4444"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
      </div>

      <div class="kpi-card cyan-glow">
        <div class="kpi-header">
          <div class="kpi-num">{{ kpi.acceleration }}</div>
          <div class="kpi-trend-icon" :class="kpi.acceleration > 0 ? 'up' : 'down'">
            {{ kpi.acceleration > 0 ? '↑' : '↓' }}
          </div>
        </div>
        <div class="kpi-sub">
          风险增速
          <el-tooltip content="预测期内供应链压力指数的平均每月变化率，正值代表压力上升" placement="top" :show-after="200">
            <el-icon class="help-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
          <span>/月</span>
        </div>
        <div class="kpi-bar-wrap">
          <div
            class="kpi-bar-fill accel"
            :style="{ width: Math.min(100, Math.max(5, 50 + kpi.acceleration * 120)) + '%' }"
          ></div>
        </div>
      </div>

      <div class="kpi-card amber-glow">
        <div class="kpi-header">
          <div class="kpi-num">{{ kpi.riskIndex }}%</div>
          <div class="kpi-risk-dot" :class="kpi.riskIndex >= 70 ? 'high' : kpi.riskIndex >= 45 ? 'mid' : 'low'"></div>
        </div>
        <div class="kpi-sub">供应链综合风险</div>
        <div class="kpi-bar-wrap">
          <div class="kpi-bar-fill risk" :style="{ width: kpi.riskIndex + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- 趋势图 + 驱动因子 -->
    <div class="charts-main">
      <div class="glass-panel" style="flex: 1.6">
        <div class="panel-title">
          <span class="glow-dot cyan"></span>
          {{ governanceBrief.chartTitle }}
          <span class="badge info-badge">历史 + 未来 {{ forecastHorizon }} 个月</span>
        </div>
        <div ref="trendChartRef" class="chart-box" style="height: 340px"></div>
      </div>

      <div class="glass-panel driver-panel" style="flex: 1">
        <div class="panel-title">
          <span class="glow-dot orange"></span>
          {{ governanceBrief.driverTitle }}
          <el-tooltip content="影响矿山供应链压力走势的关键变量按贡献度排序" placement="top" :show-after="200">
            <el-icon class="help-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>

        <div class="driver-list">
          <div v-for="(d, idx) in driverRanking" :key="d.name" class="driver-row">
            <div class="driver-rank">#{{ idx + 1 }}</div>
            <div class="driver-info">
              <div class="driver-name">{{ d.name }}</div>
              <div class="driver-signal">{{ d.signal }}</div>
            </div>
            <div class="driver-bar-wrap">
              <div class="driver-bar-fill" :style="{ width: d.avg + '%', background: driverColors[idx] }"></div>
            </div>
            <div class="driver-avg">{{ d.avg }}</div>
            <div class="driver-trend-tag" :class="d.trend === '上行' ? 'up' : 'down'">{{ d.trend }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 供需联动诊断 + 链路信号 + 策略动作 -->
    <div class="trend-insight-grid">
      <div class="glass-panel supply-demand-panel">
        <div class="panel-title">
          <span class="glow-dot cyan"></span>
          供需联动诊断
          <el-tooltip
            content="综合需求恢复、排产响应、库存水位和供应商交付能力，判断供应链当前处于短缺、平衡还是累库状态"
            placement="top"
            :show-after="200"
          >
            <el-icon class="help-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>

        <div class="sd-summary">
          <div class="sd-summary-main">
            <div class="sd-kicker">当前判断</div>
            <div class="sd-title">{{ supplyDemandDiagnosis.title }}</div>
            <div class="sd-desc">{{ supplyDemandDiagnosis.desc }}</div>
          </div>
          <div class="sd-score-card" :class="supplyDemandDiagnosis.level">
            <div class="sd-score">{{ supplyDemandDiagnosis.score }}</div>
            <div class="sd-score-label">供需压力</div>
          </div>
        </div>

        <div class="sd-matrix">
          <div
            v-for="item in supplyDemandMatrix"
            :key="item.key"
            class="sd-cell"
            :class="item.level"
          >
            <div class="sd-cell-top">
              <span class="sd-cell-name">{{ item.name }}</span>
              <span class="sd-cell-value">{{ item.value }}</span>
            </div>
            <div class="sd-cell-desc">{{ item.desc }}</div>
            <div class="sd-cell-bar">
              <div class="sd-cell-fill" :style="{ width: item.pct + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-panel chain-signal-panel">
        <div class="panel-title">
          <span class="glow-dot orange"></span>
          关键链路信号
          <el-tooltip
            content="把趋势预测拆解到芯片、电池、库存、物流、供应商五类链路，辅助定位风险来源"
            placement="top"
            :show-after="200"
          >
            <el-icon class="help-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>

        <div class="chain-list">
          <div
            v-for="item in chainSignals"
            :key="item.name"
            class="chain-row"
          >
            <div class="chain-icon" :class="item.level"></div>
            <div class="chain-info">
              <div class="chain-name">{{ item.name }}</div>
              <div class="chain-desc">{{ item.desc }}</div>
            </div>
            <div class="chain-state" :class="item.level">{{ item.state }}</div>
          </div>
        </div>
      </div>

      <div class="glass-panel action-panel">
        <div class="panel-title">
          <span class="glow-dot green"></span>
          趋势响应动作
          <el-tooltip
            content="根据趋势预测结果生成采购、排产、库存和供应商管理动作建议"
            placement="top"
            :show-after="200"
          >
            <el-icon class="help-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>

        <div class="action-list">
          <div
            v-for="(item, idx) in strategyActions"
            :key="idx"
            class="action-item"
            :class="item.level"
          >
            <div class="action-index">{{ idx + 1 }}</div>
            <div class="action-content">
              <div class="action-title">{{ item.title }}</div>
              <div class="action-desc">{{ item.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3D/2D 风险图 -->
    <div class="glass-panel">
      <div class="panel-title">
        <span class="glow-dot purple"></span>
        {{ enable3D ? '3D 供应链风险势能图' : '2D 供应链风险热力图' }}
        <el-tooltip content="将时间、供应链驱动因子和势能值映射展示各环节在不同时段的风险贡献" placement="top" :show-after="200">
          <el-icon class="help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
        <span class="badge info-badge" v-if="enable3D">拖拽旋转视角</span>
      </div>
      <div ref="momentumChartRef" class="chart-box" style="height: 380px"></div>
    </div>

    <!-- 时间线 + 情景分布 -->
    <div class="charts-bottom">
      <div class="glass-panel" style="flex: 1.3">
        <div class="panel-title">
          <span class="glow-dot"></span>
          供应链阶段预警时间线
          <el-tooltip content="按时间顺序标记预测窗口内的关键供应链风险节点和建议动作时机" placement="top" :show-after="200">
            <el-icon class="help-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>

        <div class="timeline-wrap">
          <div class="timeline-line"></div>
          <div v-for="(m, idx) in milestones" :key="m.id" class="timeline-node" :class="m.type">
            <div class="tn-dot"></div>
            <div class="tn-time">{{ m.time }}</div>
            <div class="tn-card">
              <div class="tn-title">{{ m.title }}</div>
              <div class="tn-desc">{{ m.description }}</div>
            </div>
            <div class="tn-index">{{ idx + 1 }}/{{ milestones.length }}</div>
          </div>
        </div>
      </div>

      <div class="glass-panel" style="flex: 1">
        <div class="panel-title">
          <span class="glow-dot green"></span>
          供应链情景概率分布
          <el-tooltip content="将未来走势划分为宽松、基准、压力三种情景并给出各自概率" placement="top" :show-after="200">
            <el-icon class="help-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>

        <div ref="gaugeChartRef" class="chart-box" style="height: 220px"></div>

        <div class="prob-list">
          <div v-for="p in probabilityDist" :key="p.key" class="prob-row">
            <div class="prob-dot" :class="p.key"></div>
            <div class="prob-label">{{ p.label }}</div>
            <div class="prob-value">{{ p.value }}%</div>
          </div>
        </div>

        <div class="strategy-box">
          <div class="strategy-icon">⚙️</div>
          <div class="strategy-text">
            <div class="strategy-title">{{ strategicSuggestion }}</div>
            <div class="strategy-hint">{{ governanceBrief.strategyHint }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import 'echarts-gl'
import { QuestionFilled } from '@element-plus/icons-vue'
import { getTrendPrediction } from '@/api/trendPrediction'

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

const SCENARIO_MAP = {
  auto_chip_pressure: {
    alias: '矿山生产场景 · 产能约束与重启路径',
    summary: '聚焦哈萨克斯坦/加拿大/纳米比亚/尼日尔等主要产国矿山生产状态、产能爬坡和停产重启，适合评估全球供给趋势。',
    focusTags: ['矿山产量指引', '功率器件', '智能驾驶芯片', '安全库存'],
    metric: 'total_amount',
    base: 48,
    slope: 0.32,
    amplitude: 5.2,
    period: 9,
    phase: 0.35,
    noise: 1.25,
    futureBias: 0.22,
    confidenceBias: 4,
    riskBias: 10,
    defaultHorizon: 10,
    defaultUncertainty: 16,
    defaultConfidence: 82,
    actionHint: '优先锁定长交期芯片和单一来源物料，建立“安全库存+替代料认证”双线机制。',
    driverFactors: [
      { name: '矿山产量指引', weight: 1.24, phase: 0.3, baseline: 58 },
      { name: '库存消费比', weight: 0.92, phase: 1.1, baseline: 54 },
      { name: '重点矿山产量', weight: 1.12, phase: 1.7, baseline: 56 },
      { name: '供应商准时率', weight: 0.86, phase: 2.2, baseline: 52 },
      { name: '替代料认证进度', weight: 0.74, phase: 2.8, baseline: 50 }
    ]
  },

  battery_cost_chain: {
    alias: '动力电池场景 · 成本低位再平衡路径',
    summary: '关注 U3O8 现货价、长协价、Sprott 实物基金持仓和核电业主采购行为变化，评估价格趋势对燃料成本的影响。',
    focusTags: ['U3O8 现货价波动', '长协价格', '转化/浓缩服务费', '核电燃料成本'],
    metric: 'avg_amount',
    base: 44,
    slope: 0.26,
    amplitude: 5.8,
    period: 10,
    phase: 0.9,
    noise: 1.15,
    futureBias: 0.18,
    confidenceBias: 5,
    riskBias: 6,
    defaultHorizon: 12,
    defaultUncertainty: 18,
    defaultConfidence: 84,
    actionHint: '建议将材料价格监测与采购锁价联动，优先管理锂价反弹和长协价格降幅收窄风险。',
    driverFactors: [
      { name: 'U3O8 现货价 $/lb', weight: 1.16, phase: 0.25, baseline: 56 },
      { name: '电芯采购成本', weight: 1.18, phase: 1.05, baseline: 58 },
      { name: 'Pack集成成本', weight: 0.96, phase: 1.6, baseline: 55 },
      { name: '核电装机容量 GW', weight: 0.88, phase: 2.3, baseline: 53 },
      { name: '供应商议价空间', weight: 0.76, phase: 2.9, baseline: 50 }
    ]
  },

  inventory_logistics_chain: {
    alias: '库存与运输场景 · 补库与运输保障路径',
    summary: '通过库存消费比、补库紧迫度、运输时效和到港准时率判断整车库存压力与零部件交付风险。',
    focusTags: ['库存消费比', '补库紧迫度', '运输时效', '到港准时率'],
    metric: 'total_volume',
    base: 51,
    slope: 0.38,
    amplitude: 6.2,
    period: 8,
    phase: 0.8,
    noise: 1.45,
    futureBias: 0.26,
    confidenceBias: 0,
    riskBias: 12,
    defaultHorizon: 9,
    defaultUncertainty: 22,
    defaultConfidence: 76,
    actionHint: '建议把库存消费比、折扣率和排产计划联动监测，避免供应恢复过快形成被动累库。',
    driverFactors: [
      { name: '渠道库存消费比', weight: 1.28, phase: 0.35, baseline: 60 },
      { name: '终端折扣压力', weight: 1.12, phase: 1.1, baseline: 58 },
      { name: '零部件到港准时率', weight: 1.02, phase: 1.75, baseline: 56 },
      { name: '港口运输时效', weight: 0.86, phase: 2.35, baseline: 53 },
      { name: '主机厂排产偏差', weight: 0.82, phase: 2.9, baseline: 51 }
    ]
  }
}

const DEFAULT_TREND_CONTEXT = {
  mandate: {
    value: 'component_pressure',
    label: '关键零部件供给压力预判',
    desc: '识别哈萨克斯坦 ISL 产量、尼日尔出口通道、加拿大矿山重启爬坡等关键供给未来数月的变化。'
  },
  activeDomainIds: ['chip_supply', 'battery_material', 'vehicle_inventory', 'logistics_delivery'],
  activeDomains: [
    { id: 'chip_supply', label: '矿山产量指引' },
    { id: 'battery_material', label: '动力电池材料价格' },
    { id: 'vehicle_inventory', label: '库存水位' },
    { id: 'logistics_delivery', label: '物流交付时效' }
  ],
  avgQuality: 81,
  outputTitle: '供给压力前置预警',
  outputHint: '后续趋势曲线将重点展示关键零部件交期、缺口、安全库存和到港准时率。'
}

const TREND_MANDATE_EFFECTS = {
  component_pressure: {
    chartTitle: '关键零部件供给压力趋势',
    driverTitle: '零部件供给驱动因子排序',
    outputTitle: '供给压力前置预警',
    scenarioKey: 'auto_chip_pressure',
    slopeShift: 0.12,
    amplitudeShift: 0.8,
    noiseShift: 0.16,
    futureShift: 0.07,
    confidenceShift: -2,
    riskShift: 9,
    driverBias: [10, 4, 6, 2, 1],
    strategyLead: '优先判断哪些矿山或运输通道可能进入供给约束，并提前锁定替代来源和长协。'
  },

  battery_cost: {
    chartTitle: '动力电池成本压力趋势',
    driverTitle: '电池成本驱动因子排序',
    outputTitle: '电池成本趋势研判',
    scenarioKey: 'battery_cost_chain',
    slopeShift: 0.04,
    amplitudeShift: 0.45,
    noiseShift: 0.08,
    futureShift: 0.03,
    confidenceShift: 4,
    riskShift: 4,
    driverBias: [9, 10, 5, 2, 3],
    strategyLead: '重点识别材料价格低位后的反弹风险，并评估长协价格降幅收窄对整车毛利的影响。'
  },

  inventory_balance: {
    chartTitle: '整车库存压力趋势',
    driverTitle: '库存压力驱动因子排序',
    outputTitle: '库存消费比动态监测',
    scenarioKey: 'inventory_logistics_chain',
    slopeShift: 0.08,
    amplitudeShift: 1.0,
    noiseShift: 0.12,
    futureShift: 0.05,
    confidenceShift: -1,
    riskShift: 8,
    driverBias: [10, 8, 2, 1, 6],
    strategyLead: '重点观察库存消费比和终端折扣是否同步上行，防止供应恢复过快形成被动累库。'
  },

  logistics_delay: {
    chartTitle: '跨境物流延误趋势',
    driverTitle: '物流交付驱动因子排序',
    outputTitle: '物流延误风险扫描',
    scenarioKey: 'inventory_logistics_chain',
    slopeShift: 0.06,
    amplitudeShift: 0.75,
    noiseShift: 0.2,
    futureShift: 0.06,
    confidenceShift: -2,
    riskShift: 7,
    driverBias: [2, 1, 7, 10, 4],
    strategyLead: '优先识别港口拥堵、运输周期和到港准时率异常，提前调整备货与运输方案。'
  }
}

const TREND_DOMAIN_EFFECTS = {
  chip_supply: { confidence: 3, risk: 5, driverBias: [9, 2, 4, 1, 5] },
  battery_material: { confidence: 3, risk: 2, driverBias: [3, 9, 5, 0, 4] },
  vehicle_inventory: { confidence: 2, risk: 4, driverBias: [2, 4, 0, 8, 5] },
  logistics_delivery: { confidence: 1, risk: 3, driverBias: [1, 0, 4, 9, 3] },
  terminal_demand: { confidence: 2, risk: 3, driverBias: [2, 3, 8, 5, 1] },
  channel_inventory: { confidence: 2, risk: 5, driverBias: [2, 2, 4, 10, 5] },
  production_plan: { confidence: 2, risk: 3, driverBias: [6, 2, 8, 3, 2] },
  supplier_capacity: { confidence: 1, risk: 4, driverBias: [7, 1, 5, 2, 6] }
}

export default {
  name: 'PowerGame_TrendPrediction',
  components: { QuestionFilled },

  props: {
    analysisContext: {
      type: Object,
      default: () => DEFAULT_TREND_CONTEXT
    }
  },

  data() {
    return {
      selectedScenario: 'auto_chip_pressure',
      forecastHorizon: 10,
      uncertainty: 16,
      confidenceLevel: 82,
      enable3D: true,
      historySize: 30,
      labels: [],
      futureLabels: [],
      historySeries: [],
      forecastSeries: [],
      upperSeries: [],
      lowerSeries: [],
      driverNames: [],
      driverCubeData: [],
      driverRanking: [],
      milestones: [],
      probabilityDist: [],
      strategicSuggestion: '',
      sparkPoints: '',
      driverColors: ['#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6', '#22c55e'],
      kpi: { peakValue: 0, acceleration: 0, riskIndex: 0 },
      loading: false,
      backendAvailable: true,
      modelInfo: null,
      lastRefreshTime: null,
      trendChart: null,
      momentumChart: null,
      gaugeChart: null,
      resizeTimer: null
    }
  },

  computed: {
    currentScenarioMeta() {
      const ctx = this.analysisContext || DEFAULT_TREND_CONTEXT
      const effect = TREND_MANDATE_EFFECTS[ctx.mandate?.value] || TREND_MANDATE_EFFECTS.component_pressure
      return SCENARIO_MAP[effect.scenarioKey] || SCENARIO_MAP[this.selectedScenario] || SCENARIO_MAP.auto_chip_pressure
    },

    controlSignature() {
      return [this.selectedScenario, this.forecastHorizon, this.uncertainty, this.confidenceLevel, this.enable3D].join('|')
    },

    renderSignature() {
      const ctx = this.analysisContext || DEFAULT_TREND_CONTEXT
      return [
        this.controlSignature,
        ctx.mandate?.value || 'component_pressure',
        (ctx.activeDomainIds || []).join(','),
        ctx.avgQuality || 81,
        ctx.outputTitle || ''
      ].join('|')
    },

    governanceBrief() {
      const ctx = this.analysisContext || DEFAULT_TREND_CONTEXT
      const effect = TREND_MANDATE_EFFECTS[ctx.mandate?.value] || TREND_MANDATE_EFFECTS.component_pressure
      const activeDomains = ctx.activeDomains?.length ? ctx.activeDomains : DEFAULT_TREND_CONTEXT.activeDomains

      return {
        question: ctx.mandate?.label || DEFAULT_TREND_CONTEXT.mandate.label,
        desc: ctx.mandate?.desc || DEFAULT_TREND_CONTEXT.mandate.desc,
        domainText: activeDomains.map(item => item.label).join('、'),
        outputTitle: ctx.outputTitle || effect.outputTitle,
        chartTitle: effect.chartTitle,
        driverTitle: effect.driverTitle,
        strategyHint: `${effect.strategyLead} ${ctx.outputHint || this.currentScenarioMeta.actionHint}`
      }
    },

    supplyDemandDiagnosis() {
      const mandateValue = this.analysisContext?.mandate?.value || 'component_pressure'
      const risk = this.kpi.riskIndex || 0

      if (mandateValue === 'battery_cost') {
        return {
          title: risk >= 70 ? '电池成本反弹压力上升' : risk >= 50 ? '电池成本低位再平衡' : '电池成本环境相对宽松',
          desc: risk >= 70
            ? '材料价格、采购锁价和长协价格开始同步抬升，需警惕新能源核电燃料成本空间被压缩。'
            : risk >= 50
              ? '电池成本仍处于可控区间，但降幅收窄，建议从单纯压价转向锁价和供应保障。'
              : '电池材料和长协价格压力较低，可适度优化采购节奏并释放部分车型定价空间。',
          score: risk,
          level: risk >= 70 ? 'high' : risk >= 50 ? 'mid' : 'low'
        }
      }

      if (mandateValue === 'inventory_balance') {
        return {
          title: risk >= 70 ? '库存累积风险抬升' : risk >= 50 ? '供需进入再平衡阶段' : '库存压力整体可控',
          desc: risk >= 70
            ? '库存消费比和终端折扣压力同步上行，说明供应恢复可能快于真实需求，需要控制高成本现货采购。'
            : risk >= 50
              ? '需求端恢复与供给端响应基本匹配，但库存水位仍偏高，需要持续跟踪渠道动销。'
              : '库存消费比相对健康，当前更适合维持正常采购节奏而非激进补库。',
          score: risk,
          level: risk >= 70 ? 'high' : risk >= 50 ? 'mid' : 'low'
        }
      }

      if (mandateValue === 'logistics_delay') {
        return {
          title: risk >= 70 ? '物流到厂延误风险突出' : risk >= 50 ? '物流链路存在局部扰动' : '物流交付整体平稳',
          desc: risk >= 70
            ? '矿山产地运输、海运和跨境关务扰动可能影响精矿到港节奏，需要提前切换运输路线和启用替代来源。'
            : risk >= 50
              ? '运输时效存在局部波动，但尚未形成系统性延误，建议对重点物料设定提前预警。'
              : '物流交付维持相对稳定，当前重点是保持到港准时率和异常线路监控。',
          score: risk,
          level: risk >= 70 ? 'high' : risk >= 50 ? 'mid' : 'low'
        }
      }

      return {
        title: risk >= 70 ? '关键零部件供给压力上升' : risk >= 50 ? '结构性紧张但整体可控' : '供给压力处于低位',
        desc: risk >= 70
          ? '哈萨克斯坦、尼日尔或单一来源矿山可能进入供给约束区，应立即寻找替代来源并锁定长协。'
          : risk >= 50
            ? '部分长交期物料仍有结构性压力，但整体供应链尚未进入系统性短缺。'
            : '关键零部件供给整体较为稳定，可维持常规监测和滚动备货。',
        score: risk,
        level: risk >= 70 ? 'high' : risk >= 50 ? 'mid' : 'low'
      }
    },

    supplyDemandMatrix() {
      const mandateValue = this.analysisContext?.mandate?.value || 'component_pressure'
      const risk = this.kpi.riskIndex || 0
      const accel = this.kpi.acceleration || 0

      const demandBase = mandateValue === 'inventory_balance' ? 62 : mandateValue === 'battery_cost' ? 68 : 70
      const supplyBase = mandateValue === 'component_pressure' ? 58 : mandateValue === 'logistics_delay' ? 61 : 74
      const inventoryBase = mandateValue === 'inventory_balance' ? 78 : 64
      const deliveryBase = mandateValue === 'logistics_delay' ? 76 : 66

      const formatLevel = (v) => {
        if (v >= 72) return 'high'
        if (v >= 55) return 'mid'
        return 'low'
      }

      return [
        {
          key: 'demand',
          name: '需求侧',
          value: `${Math.round(demandBase + accel * 8)}%`,
          pct: this.clamp(Math.round(demandBase + accel * 8), 10, 100),
          level: formatLevel(demandBase + accel * 8),
          desc: '核电装机变化、换料周期和核电业主库存目标的综合变化。'
        },
        {
          key: 'supply',
          name: '供给侧',
          value: `${Math.round(supplyBase + (risk - 50) * 0.18)}%`,
          pct: this.clamp(Math.round(supplyBase + (risk - 50) * 0.18), 10, 100),
          level: formatLevel(supplyBase + (risk - 50) * 0.18),
          desc: '供应商产能释放、交付准时率和关键物料供给能力。'
        },
        {
          key: 'inventory',
          name: '库存侧(tU)',
          value: `${Math.round(inventoryBase + risk * 0.12)}%`,
          pct: this.clamp(Math.round(inventoryBase + risk * 0.12), 10, 100),
          level: formatLevel(inventoryBase + risk * 0.12),
          desc: '整车库存消费比、渠道周转和终端折扣压力。'
        },
        {
          key: 'delivery',
          name: '交付侧',
          value: `${Math.round(deliveryBase + this.uncertainty * 0.35)}%`,
          pct: this.clamp(Math.round(deliveryBase + this.uncertainty * 0.35), 10, 100),
          level: formatLevel(deliveryBase + this.uncertainty * 0.35),
          desc: '跨境物流、到港准时率和异常运输线路影响。'
        }
      ]
    },

    chainSignals() {
      const mandateValue = this.analysisContext?.mandate?.value || 'component_pressure'
      const ranking = this.driverRanking || []

      const getSignal = (name, fallback, level = 'mid') => {
        const hit = ranking.find(item => item.name.includes(name))
        if (!hit) return { state: fallback, level }

        return {
          state: hit.avg >= 72 ? '高压' : hit.avg >= 55 ? '关注' : '平稳',
          level: hit.avg >= 72 ? 'high' : hit.avg >= 55 ? 'mid' : 'low'
        }
      }

      const chip = getSignal('芯片', '关注', 'mid')
      const battery = getSignal('电芯', '平稳', 'low')
      const inventory = getSignal('库存', '关注', 'mid')
      const logistics = getSignal('物流', '平稳', 'low')
      const supplier = getSignal('供应商', '关注', 'mid')

      return [
        {
          name: '矿山产量与产能',
          desc: mandateValue === 'component_pressure'
            ? '哈萨克斯坦 ISL 产量和非洲出口通道仍是供给约束的核心来源。'
            : '作为核电关键燃料，需要维持安全库存水平和多元化供应来源。',
          state: chip.state,
          level: chip.level
        },
        {
          name: '动力电池与关键材料',
          desc: mandateValue === 'battery_cost'
            ? '锂价、长协价格和Pack成本决定新能源核电燃料成本弹性。'
            : '当前重点关注材料价格低位后的反弹和锁价窗口。',
          state: battery.state,
          level: battery.level
        },
        {
          name: '整车库存与补库紧迫度',
          desc: mandateValue === 'inventory_balance'
            ? '库存消费比和折扣率同步上行时，容易触发减产或长协折让动作。'
            : '库存消费比变化反映供需匹配质量，是判断价格趋势健康度的关键中间变量。',
          state: inventory.state,
          level: inventory.level
        },
        {
          name: '跨境物流与到港准时率',
          desc: mandateValue === 'logistics_delay'
            ? '运输中断会直接传导到精矿到港和核燃料供应链稳定性。'
            : '需持续监控矿山产地至港口的陆运/海运通道、跨境关务和保险异常。',
          state: logistics.state,
          level: logistics.level
        },
        {
          name: '核心供应商交付稳定性',
          desc: '关注供应商准时率、质量异常、财务承压和单一来源依赖。',
          state: supplier.state,
          level: supplier.level
        }
      ]
    },

    strategyActions() {
      const mandateValue = this.analysisContext?.mandate?.value || 'component_pressure'
      const risk = this.kpi.riskIndex || 0

      if (mandateValue === 'battery_cost') {
        return [
          {
            title: '分批锁定电池材料采购价格',
            desc: '对锂、镍、钴、磷酸铁锂等关键材料采用分批锁价，避免在价格反弹阶段集中暴露。',
            level: risk >= 65 ? 'high' : 'mid'
          },
          {
            title: '重算核燃料采购到岸成本',
            desc: '将电芯、Pack和热管理成本纳入滚动测算，提前评估毛利下行空间。',
            level: 'mid'
          },
          {
            title: '设置成本反弹预警线',
            desc: '当 U3O8 现货价连续两个月上行时，自动触发长协锁量和采购策略复核。',
            level: 'low'
          }
        ]
      }

      if (mandateValue === 'inventory_balance') {
        return [
          {
            title: '控制高成本现货采购',
            desc: '库存消费比高于安全线时，优先压缩低周转车型排产，避免渠道继续被动累库。',
            level: risk >= 65 ? 'high' : 'mid'
          },
          {
            title: '联动库存消费比与终端折扣',
            desc: '将库存消费比、成交折扣和订单转化率放入同一监测口径，识别价格战风险。',
            level: 'mid'
          },
          {
            title: '保持核电需求弹性采购',
            desc: '对核电需求增长较强的机组保留弹性采购额度，避免一刀切锁量影响议价空间。',
            level: 'low'
          }
        ]
      }

      if (mandateValue === 'logistics_delay') {
        return [
          {
            title: '提前切换关键物料运输方案',
            desc: '对高风险运输通道准备替代路线（如绕行好望角或用铁路替代海运），降低到港延误。',
            level: risk >= 65 ? 'high' : 'mid'
          },
          {
            title: '提高在途精矿透明度',
            desc: '跟踪矿山产地至港口陆运、海运、清关节点，按供应来源生成到港风险看板。',
            level: 'mid'
          },
          {
            title: '设置运输异常缓冲库存',
            desc: '对运输周期波动大的供应来源提高短期安全库存，避免物流扰动传导到核燃料供应中断。',
            level: 'low'
          }
        ]
      }

      return [
        {
          title: '锁定长交期关键零部件',
          desc: '对哈萨克斯坦 ISL、尼日尔 Somair、纳米比亚 Langer Heinrich 等关键矿山建立供给监控清单。',
          level: risk >= 65 ? 'high' : 'mid'
        },
        {
          title: '推进替代料和双供认证',
          desc: '对单一来源物料提前推进替代料认证，降低某一供应商异常导致的停线风险。',
          level: 'mid'
        },
        {
          title: '把核电需求预测与安全库存联动',
          desc: '将未来核电装机、换料需求和库存放在同一周期滚动更新。',
          level: 'low'
        }
      ]
    }
  },

  watch: {
    renderSignature() {
      this.applyScenarioFromMandate(false)
      this.rebuildData().then(() => {
        this.renderCharts()
      })
    }
  },

  mounted() {
    this.applyScenarioFromMandate(true)
    this.rebuildData().then(() => {
      this.$nextTick(() => {
        this.initCharts()
        this.renderCharts()
      })
    })
    window.addEventListener('resize', this.handleResize)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    this.trendChart?.dispose()
    this.momentumChart?.dispose()
    this.gaugeChart?.dispose()
  },

  methods: {
    clamp(v, min, max) {
      return Math.max(min, Math.min(max, v))
    },

    getGovernanceState() {
      const ctx = this.analysisContext || DEFAULT_TREND_CONTEXT
      const mandateValue = ctx.mandate?.value || DEFAULT_TREND_CONTEXT.mandate.value
      const activeDomainIds = ctx.activeDomainIds?.length ? ctx.activeDomainIds : DEFAULT_TREND_CONTEXT.activeDomainIds
      const avgQuality = Number.isFinite(ctx.avgQuality) ? ctx.avgQuality : DEFAULT_TREND_CONTEXT.avgQuality
      const domainBias = [0, 0, 0, 0, 0]
      let domainConfidenceShift = 0
      let domainRiskShift = 0

      activeDomainIds.forEach((id) => {
        const effect = TREND_DOMAIN_EFFECTS[id]
        if (!effect) return

        domainConfidenceShift += effect.confidence
        domainRiskShift += effect.risk
        effect.driverBias.forEach((value, index) => {
          domainBias[index] += value
        })
      })

      return {
        mandateValue,
        mandateEffect: TREND_MANDATE_EFFECTS[mandateValue] || TREND_MANDATE_EFFECTS.component_pressure,
        coverageFactor: activeDomainIds.length / DEFAULT_TREND_CONTEXT.activeDomainIds.length,
        qualityFactor: avgQuality / 100,
        domainConfidenceShift,
        domainRiskShift,
        domainBias
      }
    },

    applyScenarioFromMandate(resetControls = false) {
      const ctx = this.analysisContext || DEFAULT_TREND_CONTEXT
      const effect = TREND_MANDATE_EFFECTS[ctx.mandate?.value] || TREND_MANDATE_EFFECTS.component_pressure
      const scenarioKey = effect.scenarioKey || 'auto_chip_pressure'

      this.selectedScenario = scenarioKey

      if (resetControls) {
        this.applyScenarioPreset()
      }
    },

    applyScenarioPreset() {
      const cfg = this.currentScenarioMeta
      this.forecastHorizon = cfg.defaultHorizon
      this.uncertainty = cfg.defaultUncertainty
      this.confidenceLevel = cfg.defaultConfidence
    },

    buildLabels(total) {
      const r = []
      for (let i = 0; i < total; i++) {
        const y = 2024 + Math.floor(i / 12)
        r.push(`${y}-${MONTHS[i % 12]}`)
      }
      return r
    },

    async rebuildData() {
      if (this.loading) return
      this.loading = true

      try {
        const response = await getTrendPrediction({
          metric: this.currentScenarioMeta.metric || 'total_amount',
          horizon: this.forecastHorizon,
          confidence: this.confidenceLevel / 100
        })

        if (response && response.success && response.data) {
          this.backendAvailable = true
          this.applyApiResponse(response.data)
          this.loading = false
          return
        }
      } catch (e) {
        console.warn('趋势预测API调用失败，回退至前端合成数据:', e.message)
      }

      this.backendAvailable = false
      this.rebuildDataSynthetic()
      this.loading = false
    },

    applyApiResponse(data) {
      this.labels = data.labels || []
      this.futureLabels = data.futureLabels || []
      this.historySeries = data.historySeries || []
      this.forecastSeries = data.forecastSeries || []
      this.upperSeries = data.upperSeries || []
      this.lowerSeries = data.lowerSeries || []
      this.driverNames = data.driverNames || []
      this.driverCubeData = data.driverCubeData || []
      this.driverRanking = data.driverRanking || []
      this.milestones = data.milestones || []
      this.kpi = data.kpi || { peakValue: 0, acceleration: 0, riskIndex: 0 }

      // 根据实际数据长度更新 historySize
      const realHistoryLen = this.historySeries.filter(v => v !== null && v !== undefined).length
      if (realHistoryLen > 0) {
        this.historySize = realHistoryLen
      }

      // 捕获模型元信息
      this.modelInfo = data.modelInfo || null
      this.lastRefreshTime = new Date().toLocaleTimeString('zh-CN', { hour12: false })

      this.rebuildSparkline(data.kpi)

      if (data.probabilityDist && data.probabilityDist.length) {
        this.probabilityDist = data.probabilityDist.map(item => ({
          key: item.label || item.key || '',
          label: item.label || item.key || '',
          value: Math.round((item.probability || 0) * 100)
        }))
      } else {
        this.buildProbabilityDistribution(this.kpi.riskIndex, this.getGovernanceState())
      }

      const riskIndex = this.kpi.riskIndex || 0
      this.strategicSuggestion =
        riskIndex >= 75
          ? `${this.governanceBrief.outputTitle}进入高压区，建议立即转入供应保障和排产约束管理状态。`
          : riskIndex >= 55
            ? `${this.governanceBrief.outputTitle}正在抬升，建议强化关键指标滚动监测与分级响应。`
            : `${this.governanceBrief.outputTitle}整体可控，建议维持基础监测并保留快速切换通道。`
    },

    rebuildSparkline(kpiData) {
      const kpi = kpiData || this.kpi
      const peak = kpi.peakValue || 0
      const futLen = this.futureLabels.length || this.forecastHorizon
      const vals = []
      for (let i = 0; i < Math.min(20, futLen); i++) {
        vals.push(peak * (0.7 + 0.3 * Math.sin(i * 0.5)))
      }
      const sparkMin = Math.min(...vals)
      const sparkMax = Math.max(...vals)
      const sparkRange = sparkMax - sparkMin || 1
      this.sparkPoints = vals
        .map((v, i) => `${(i / (vals.length - 1 || 1)) * 120},${30 - ((v - sparkMin) / sparkRange) * 28}`)
        .join(' ')
    },

    async refreshPrediction() {
      // 强制重新加载数据并预测（重新触发 rebuildData，不依赖缓存）
      this.loading = false  // 重置loading防重锁
      await this.rebuildData()
      this.renderCharts()
    },

    rebuildDataSynthetic() {
      const cfg = this.currentScenarioMeta
      const governance = this.getGovernanceState()

      // 合成数据回退时清除后端模型信息
      this.modelInfo = null
      this.lastRefreshTime = null

      const calcSlope = (vals) => {
        const n = vals.length
        if (n <= 1) return 0

        const xm = (n - 1) / 2
        const ym = vals.reduce((s, v) => s + v, 0) / n

        let num = 0
        let den = 0
        for (let i = 0; i < n; i++) {
          num += (i - xm) * (vals[i] - ym)
          den += (i - xm) ** 2
        }

        return den === 0 ? 0 : num / den
      }

      const total = this.historySize + this.forecastHorizon
      const labels = this.buildLabels(total)
      const hist = []
      const fore = []
      const upper = []
      const lower = []
      const allVals = []

      const adjustedSlope = cfg.slope + governance.mandateEffect.slopeShift + (governance.coverageFactor - 0.75) * 0.08
      const adjustedAmplitude = cfg.amplitude + governance.mandateEffect.amplitudeShift
      const adjustedNoise = cfg.noise + governance.mandateEffect.noiseShift + (1 - governance.qualityFactor) * 0.8
      const adjustedFutureBias = cfg.futureBias + governance.mandateEffect.futureShift

      for (let i = 0; i < total; i++) {
        const t = cfg.base + adjustedSlope * i
        const s =
          adjustedAmplitude * Math.sin((2 * Math.PI * i) / cfg.period + cfg.phase) +
          adjustedAmplitude * 0.4 * Math.cos((4 * Math.PI * i) / cfg.period + 0.3)
        const n = Math.sin(i * 0.92 + cfg.phase) * adjustedNoise + Math.cos(i * 0.37) * adjustedNoise * 0.62
        const fg = i >= this.historySize ? (i - this.historySize + 1) * adjustedFutureBias : 0
        const v = +(t + s + n + fg).toFixed(2)

        allVals.push(v)

        if (i < this.historySize) {
          hist.push(v)
          fore.push(null)
          upper.push(null)
          lower.push(null)
        } else {
          hist.push(null)
          fore.push(v)

          const step = i - this.historySize + 1
          const sp = +(this.uncertainty * (1 + step / (this.forecastHorizon * 1.6)) * (1.08 - governance.qualityFactor * 0.18)).toFixed(2)

          upper.push(+(v + sp).toFixed(2))
          lower.push(+(v - sp).toFixed(2))
        }
      }

      const futVals = allVals.slice(this.historySize)
      const futLabels = labels.slice(this.historySize)
      const peak = +Math.max(...futVals).toFixed(2)
      const accel = +calcSlope(futVals).toFixed(3)

      const conf = this.clamp(
        Math.round(
          this.confidenceLevel -
          this.uncertainty * 0.35 +
          cfg.confidenceBias +
          governance.mandateEffect.confidenceShift +
          governance.domainConfidenceShift +
          (governance.qualityFactor - 0.7) * 18
        ),
        45,
        97
      )

      const risk = this.clamp(
        Math.round(
          (peak - 45) * 1.08 +
          this.uncertainty * 0.9 +
          cfg.riskBias +
          governance.mandateEffect.riskShift +
          governance.domainRiskShift +
          (100 - conf) * 0.35 +
          (1 - governance.coverageFactor) * 6
        ),
        8,
        98
      )

      const sparkN = Math.min(20, futVals.length)
      const sparkVals = futVals.slice(0, sparkN)
      const sparkMin = Math.min(...sparkVals)
      const sparkMax = Math.max(...sparkVals)
      const sparkRange = sparkMax - sparkMin || 1

      this.sparkPoints = sparkVals
        .map((v, i) => `${(i / (sparkN - 1 || 1)) * 120},${30 - ((v - sparkMin) / sparkRange) * 28}`)
        .join(' ')

      const cubeData = []
      const rankings = []
      const driverNames = cfg.driverFactors.map(d => d.name)

      cfg.driverFactors.forEach((driver, di) => {
        const vals = []

        for (let t = 0; t < this.forecastHorizon; t++) {
          const v = this.clamp(
            Math.round(
              28 +
              this.uncertainty * 0.42 +
              driver.weight * 22 +
              Math.sin((t + 1) * 0.75 + driver.phase) * 16 +
              Math.cos((t + 1) * 0.3 + driver.phase) * 8 +
              governance.mandateEffect.driverBias[di] +
              governance.domainBias[di]
            ),
            12,
            100
          )

          vals.push(v)
          cubeData.push([t, di, v])
        }

        const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
        rankings.push({
          name: driver.name,
          avg,
          trend: avg >= driver.baseline ? '上行' : '回落',
          signal: avg >= 70 ? '高敏感预警' : avg >= 55 ? '重点关注' : '常规跟踪'
        })
      })

      rankings.sort((a, b) => b.avg - a.avg)

      const peakOff = futVals.findIndex(v => v === Math.max(...futVals))
      const quarter = Math.max(1, Math.floor(this.forecastHorizon / 3))

      this.milestones = [
        {
          id: 'start',
          time: futLabels[0],
          type: 'primary',
          title: '预测窗口开启',
          description: `围绕“${this.governanceBrief.question}”进入预测窗口，优先锁定 ${rankings[0]?.name || '关键供应链驱动'}。`
        },
        {
          id: 'boost',
          time: futLabels[Math.min(this.forecastHorizon - 1, quarter)],
          type: 'warning',
          title: '关键变量放大',
          description: `风险增速 ${accel}，需重点评估${cfg.focusTags[0]}与${cfg.focusTags[1]}的联动影响。`
        },
        {
          id: 'peak',
          time: futLabels[Math.max(0, peakOff)],
          type: 'danger',
          title: '高压区触发',
          description: `供应链风险峰值预计 ${peak}，后续输出将重点回答“${this.governanceBrief.outputTitle}”的落点时机。`
        },
        {
          id: 'settle',
          time: futLabels[this.forecastHorizon - 1],
          type: 'success',
          title: '窗口复盘更新',
          description: `以置信度 ${conf}% 回收模型参数，并依据当前问题设定更新下一轮供应链基线。`
        }
      ]

      this.labels = labels
      this.futureLabels = futLabels
      this.historySeries = hist
      this.forecastSeries = fore
      this.upperSeries = upper
      this.lowerSeries = lower
      this.driverNames = driverNames
      this.driverCubeData = cubeData
      this.driverRanking = rankings
      this.kpi = { peakValue: peak, acceleration: accel, riskIndex: risk }

      this.buildProbabilityDistribution(risk, governance)
    },

    buildProbabilityDistribution(riskIndex, governance) {
      const rn = this.clamp(riskIndex / 100, 0, 1)
      const un = this.clamp(this.uncertainty / 35, 0, 1)
      const cn = this.clamp(this.confidenceLevel / 100, 0, 1)

      let ro = this.clamp(
        1.02 - rn * 0.9 - un * 0.42 + cn * 0.32 - this.currentScenarioMeta.riskBias / 130 + (governance.coverageFactor - 0.75) * 0.2,
        0.08,
        1.25
      )
      let rb = this.clamp(
        0.82 - Math.abs(rn - 0.5) * 0.58 + (1 - Math.abs(un - 0.45)) * 0.2 + governance.qualityFactor * 0.08,
        0.1,
        1.15
      )
      let rs = this.clamp(
        0.36 + rn * 1.02 + un * 0.55 + this.currentScenarioMeta.riskBias / 120 - cn * 0.2 + governance.mandateEffect.riskShift / 28,
        0.08,
        1.4
      )

      const rt = ro + rb + rs

      let opt = +((ro / rt) * 100).toFixed(1)
      let base = +((rb / rt) * 100).toFixed(1)
      let stress = +((rs / rt) * 100).toFixed(1)

      if (opt < 5) opt = 5
      if (base < 5) base = 5
      if (stress < 5) stress = 5

      stress = +(stress + (100 - opt - base - stress)).toFixed(1)

      this.probabilityDist = [
        { key: 'opt', label: '宽松情景', value: opt },
        { key: 'base', label: '基准情景', value: base },
        { key: 'stress', label: '压力情景', value: stress }
      ]

      this.strategicSuggestion =
        riskIndex >= 75
          ? `${this.governanceBrief.outputTitle}进入高压区，建议立即转入供应保障和排产约束管理状态。`
          : riskIndex >= 55
            ? `${this.governanceBrief.outputTitle}正在抬升，建议强化关键指标滚动监测与分级响应。`
            : `${this.governanceBrief.outputTitle}整体可控，建议维持基础监测并保留快速切换通道。`
    },

    initCharts() {
      if (this.$refs.trendChartRef && !this.trendChart) this.trendChart = echarts.init(this.$refs.trendChartRef)
      if (this.$refs.momentumChartRef && !this.momentumChart) this.momentumChart = echarts.init(this.$refs.momentumChartRef)
      if (this.$refs.gaugeChartRef && !this.gaugeChart) this.gaugeChart = echarts.init(this.$refs.gaugeChartRef)
    },

    renderCharts() {
      this.renderTrendChart()
      this.renderMomentumChart()
      this.renderGaugeChart()
    },

    renderTrendChart() {
      if (!this.trendChart) return

      const splitLabel = this.labels[this.historySize - 1]

      this.trendChart.setOption({
        backgroundColor: 'transparent',
        legend: { top: 4, textStyle: { color: '#6b7280', fontSize: 11 } },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderColor: '#e5e7eb',
          textStyle: { color: '#1f2937' }
        },
        grid: { top: 40, left: 48, right: 20, bottom: 40 },
        xAxis: {
          type: 'category',
          data: this.labels,
          axisLabel: { color: '#6b7280', interval: this.labels.length > 38 ? 3 : 2 },
          axisLine: { lineStyle: { color: '#e5e7eb' } }
        },
        yAxis: {
          type: 'value',
          name: '供应链压力',
          nameTextStyle: { color: '#6b7280' },
          axisLabel: { color: '#6b7280' },
          splitLine: { lineStyle: { color: '#f3f4f6' } }
        },
        series: [
          {
            name: '历史压力',
            type: 'line',
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2.5, color: '#3b82f6', shadowColor: 'rgba(59,130,246,0.5)', shadowBlur: 8 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(59,130,246,0.15)' },
                { offset: 1, color: 'rgba(59,130,246,0.01)' }
              ])
            },
            data: this.historySeries,
            markLine: {
              symbol: ['none', 'none'],
              lineStyle: { type: 'dashed', color: '#d1d5db' },
              label: { color: '#6b7280' },
              data: [{ xAxis: splitLabel, label: { formatter: '预测分界' } }]
            }
          },
          {
            name: '预测压力',
            type: 'line',
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2.5, type: 'dashed', color: '#f97316', shadowColor: 'rgba(249,115,22,0.5)', shadowBlur: 8 },
            data: this.forecastSeries
          },
          {
            name: '置信上界',
            type: 'line',
            showSymbol: false,
            lineStyle: { width: 0 },
            areaStyle: { color: 'rgba(249,115,22,0.08)' },
            data: this.upperSeries
          },
          {
            name: '置信下界',
            type: 'line',
            showSymbol: false,
            lineStyle: { width: 0 },
            areaStyle: { color: 'rgba(249,115,22,0.08)' },
            data: this.lowerSeries
          }
        ]
      }, true)
    },

    renderMomentumChart() {
      if (!this.momentumChart) return

      const tooltipCfg = {
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e5e7eb',
        textStyle: { color: '#1f2937' }
      }

      if (this.enable3D) {
        this.momentumChart.setOption({
          backgroundColor: 'transparent',
          tooltip: {
            ...tooltipCfg,
            formatter: p => {
              const [x, y, v] = p.value
              return `${this.futureLabels[x]}<br/>${this.driverNames[y]}: ${v}`
            }
          },
          visualMap: {
            min: 10,
            max: 100,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 6,
            textStyle: { color: '#6b7280' },
            inRange: { color: ['#1e40af', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'] }
          },
          xAxis3D: {
            type: 'category',
            name: '时间',
            data: this.futureLabels,
            nameTextStyle: { color: '#6b7280' },
            axisLabel: { color: '#6b7280' }
          },
          yAxis3D: {
            type: 'category',
            name: '驱动',
            data: this.driverNames,
            nameTextStyle: { color: '#6b7280' },
            axisLabel: { color: '#6b7280' }
          },
          zAxis3D: {
            type: 'value',
            name: '势能',
            nameTextStyle: { color: '#6b7280' },
            axisLabel: { color: '#6b7280' }
          },
          grid3D: {
            top: 12,
            bottom: 66,
            boxWidth: 170,
            boxDepth: 86,
            environment: 'none',
            light: {
              main: { intensity: 1.2, shadow: true, shadowQuality: 'high' },
              ambient: { intensity: 0.5 }
            },
            viewControl: { alpha: 28, beta: 42, distance: 230, autoRotate: true, autoRotateSpeed: 3 },
            postEffect: { enable: true, bloom: { enable: true, bloomIntensity: 0.1 } }
          },
          series: [
            {
              type: 'bar3D',
              data: this.driverCubeData,
              shading: 'lambert',
              label: { show: false },
              itemStyle: { opacity: 0.96 }
            }
          ]
        }, true)
      } else {
        this.momentumChart.setOption({
          backgroundColor: 'transparent',
          tooltip: {
            ...tooltipCfg,
            position: 'top',
            formatter: p => `${this.futureLabels[p.data[0]]}<br/>${this.driverNames[p.data[1]]}: ${p.data[2]}`
          },
          grid: { top: 18, left: 70, right: 10, bottom: 52 },
          xAxis: {
            type: 'category',
            data: this.futureLabels,
            splitArea: { show: false },
            axisLabel: { color: '#6b7280', interval: this.futureLabels.length > 10 ? 1 : 0 },
            axisLine: { lineStyle: { color: '#e5e7eb' } }
          },
          yAxis: {
            type: 'category',
            data: this.driverNames,
            splitArea: { show: false },
            axisLabel: { color: '#6b7280' },
            axisLine: { lineStyle: { color: '#e5e7eb' } }
          },
          visualMap: {
            min: 10,
            max: 100,
            orient: 'horizontal',
            left: 'center',
            bottom: 8,
            textStyle: { color: '#6b7280' },
            inRange: { color: ['#1e40af', '#3b82f6', '#e5e7eb', '#f97316', '#dc2626'] }
          },
          series: [
            {
              type: 'heatmap',
              data: this.driverCubeData,
              label: { show: false },
              itemStyle: { borderWidth: 2, borderColor: '#ffffff', borderRadius: 3 }
            }
          ]
        }, true)
      }
    },

    renderGaugeChart() {
      if (!this.gaugeChart) return

      const data = this.probabilityDist

      this.gaugeChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderColor: '#e5e7eb',
          textStyle: { color: '#1f2937' }
        },
        series: [
          {
            type: 'pie',
            radius: ['55%', '80%'],
            center: ['50%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: { borderColor: '#ffffff', borderWidth: 3, borderRadius: 6 },
            label: { show: false },
            data: [
              {
                value: data[0]?.value || 33,
                name: '宽松',
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                    { offset: 0, color: '#22c55e' },
                    { offset: 1, color: '#16a34a' }
                  ])
                }
              },
              {
                value: data[1]?.value || 34,
                name: '基准',
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                    { offset: 0, color: '#3b82f6' },
                    { offset: 1, color: '#2563eb' }
                  ])
                }
              },
              {
                value: data[2]?.value || 33,
                name: '压力',
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                    { offset: 0, color: '#ef4444' },
                    { offset: 1, color: '#dc2626' }
                  ])
                }
              }
            ]
          }
        ]
      }, true)
    },

    handleResize() {
      if (this.resizeTimer) clearTimeout(this.resizeTimer)

      this.resizeTimer = setTimeout(() => {
        this.trendChart?.resize()
        this.momentumChart?.resize()
        this.gaugeChart?.resize()
      }, 180)
    }
  }
}
</script>

<style scoped>
.trend-page {
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
  background: #8b5cf6;
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
.forecast-badge {
  background: #f5f3ff;
  color: #7c3aed;
  border: 1px solid #ddd6fe;
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

/* 模型信息条 */
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
.mi-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}
.mi-label {
  color: #94a3b8;
  font-weight: 500;
}
.mi-value {
  color: #334155;
  font-weight: 600;
}
.mi-sep {
  color: #cbd5e1;
  margin: 0 2px;
}
.crawler-on {
  color: #059669;
}
.crawler-off {
  color: #94a3b8;
}
.signal-tag {
  display: inline-block;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: default;
}
.signal-warn {
  background: #fef2f2;
  color: #dc2626;
}
.signal-ok {
  background: #f0fdf4;
  color: #16a34a;
}

/* 刷新按钮 */
.refresh-item {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
}
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
  color: #7c3aed;
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
  color: #7c3aed;
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
  background: #f5f3ff;
  color: #6d28d9;
  border: 1px solid #ddd6fe;
}

.governance-brief {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: stretch;
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
  color: #6b7280;
  line-height: 1.6;
}
.governance-brief-side {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
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
  color: #1f2937;
  line-height: 1.5;
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
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.kpi-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
}
.kpi-card.danger-glow::after { background: linear-gradient(90deg, transparent, #ef4444, transparent); }
.kpi-card.cyan-glow::after { background: linear-gradient(90deg, transparent, #06b6d4, transparent); }
.kpi-card.amber-glow::after { background: linear-gradient(90deg, transparent, #f59e0b, transparent); }

.kpi-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.kpi-num {
  font-size: 26px;
  font-weight: 800;
  color: #1f2937;
}
.kpi-trend-icon {
  font-size: 16px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.kpi-trend-icon.up {
  background: #fef2f2;
  color: #dc2626;
}
.kpi-trend-icon.down {
  background: #f0fdf4;
  color: #16a34a;
}
.kpi-sub {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}
.kpi-sub span {
  color: #9ca3af;
}
.kpi-spark {
  height: 30px;
  margin-top: 4px;
}
.kpi-spark svg {
  width: 100%;
  height: 30px;
}
.kpi-risk-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.kpi-risk-dot.high { background: #ef4444; }
.kpi-risk-dot.mid { background: #f59e0b; }
.kpi-risk-dot.low { background: #22c55e; }
.kpi-bar-wrap {
  height: 4px;
  border-radius: 2px;
  background: #f3f4f6;
  overflow: hidden;
  margin-top: 6px;
}
.kpi-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}
.kpi-bar-fill.accel {
  background: linear-gradient(90deg, #06b6d4, #22d3ee);
}
.kpi-bar-fill.risk {
  background: linear-gradient(90deg, #f59e0b, #ef4444);
}

.charts-main {
  display: flex;
  gap: 12px;
}
.chart-box {
  width: 100%;
}

.driver-panel {
  overflow-y: auto;
}
.driver-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.driver-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f9fafb;
  transition: background 0.2s;
}
.driver-row:hover {
  background: #f3f4f6;
}
.driver-rank {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 700;
  min-width: 28px;
}
.driver-info {
  flex: 1;
  min-width: 0;
}
.driver-name {
  font-size: 13px;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.driver-signal {
  font-size: 10px;
  color: #9ca3af;
}
.driver-bar-wrap {
  width: 80px;
  height: 4px;
  border-radius: 2px;
  background: #f3f4f6;
  overflow: hidden;
}
.driver-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}
.driver-avg {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
  min-width: 30px;
  text-align: right;
}
.driver-trend-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.driver-trend-tag.up {
  background: #fef2f2;
  color: #dc2626;
}
.driver-trend-tag.down {
  background: #f0fdf4;
  color: #16a34a;
}

.trend-insight-grid {
  display: grid;
  grid-template-columns: 1.35fr 1fr 1fr;
  gap: 12px;
}

.supply-demand-panel,
.chain-signal-panel,
.action-panel {
  min-height: 100%;
}

.sd-summary {
  display: flex;
  gap: 14px;
  align-items: stretch;
  margin-bottom: 12px;
}

.sd-summary-main {
  flex: 1;
  min-width: 0;
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.sd-kicker {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.sd-title {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 800;
  color: #111827;
}

.sd-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
}

.sd-score-card {
  width: 94px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid;
}

.sd-score-card.high {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.sd-score-card.mid {
  background: #fffbeb;
  border-color: #fde68a;
  color: #d97706;
}

.sd-score-card.low {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #16a34a;
}

.sd-score {
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
}

.sd-score-label {
  margin-top: 5px;
  font-size: 11px;
  font-weight: 700;
}

.sd-matrix {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.sd-cell {
  padding: 10px;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.sd-cell.high {
  border-color: #fecaca;
  background: #fff7f7;
}

.sd-cell.mid {
  border-color: #fde68a;
  background: #fffbeb;
}

.sd-cell.low {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.sd-cell-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.sd-cell-name {
  font-size: 12px;
  font-weight: 700;
  color: #1f2937;
}

.sd-cell-value {
  font-size: 13px;
  font-weight: 800;
  color: #111827;
}

.sd-cell-desc {
  margin-top: 5px;
  min-height: 34px;
  font-size: 11px;
  line-height: 1.5;
  color: #6b7280;
}

.sd-cell-bar {
  height: 4px;
  margin-top: 8px;
  border-radius: 2px;
  background: #e5e7eb;
  overflow: hidden;
}

.sd-cell-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #06b6d4, #f59e0b, #ef4444);
  transition: width 0.4s ease;
}

.chain-list,
.action-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.chain-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 9px 10px;
  border-radius: 9px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.chain-icon {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chain-icon.high {
  background: #ef4444;
}

.chain-icon.mid {
  background: #f59e0b;
}

.chain-icon.low {
  background: #22c55e;
}

.chain-info {
  flex: 1;
  min-width: 0;
}

.chain-name {
  font-size: 12.5px;
  font-weight: 700;
  color: #1f2937;
}

.chain-desc {
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.5;
  color: #6b7280;
}

.chain-state {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.chain-state.high {
  background: #fef2f2;
  color: #dc2626;
}

.chain-state.mid {
  background: #fffbeb;
  color: #d97706;
}

.chain-state.low {
  background: #f0fdf4;
  color: #16a34a;
}

.action-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 9px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.action-item.high {
  border-left: 3px solid #ef4444;
}

.action-item.mid {
  border-left: 3px solid #f59e0b;
}

.action-item.low {
  border-left: 3px solid #22c55e;
}

.action-index {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #eef2ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-size: 12.5px;
  font-weight: 800;
  color: #1f2937;
}

.action-desc {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.55;
  color: #6b7280;
}

.charts-bottom {
  display: flex;
  gap: 12px;
}

.timeline-wrap {
  position: relative;
  padding-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.timeline-line {
  position: absolute;
  left: 7px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(180deg, #8b5cf6, #06b6d4, #22c55e);
  border-radius: 1px;
}
.timeline-node {
  position: relative;
}
.tn-dot {
  position: absolute;
  left: -21px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid;
  background: #ffffff;
}
.timeline-node.primary .tn-dot { border-color: #6366f1; }
.timeline-node.warning .tn-dot { border-color: #f59e0b; }
.timeline-node.danger .tn-dot { border-color: #ef4444; }
.timeline-node.success .tn-dot { border-color: #22c55e; }
.tn-time {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 4px;
}
.tn-card {
  background: #f9fafb;
  border-radius: 8px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
}
.tn-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}
.tn-desc {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}
.tn-index {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 4px;
}

.prob-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}
.prob-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.prob-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.prob-dot.opt { background: #22c55e; }
.prob-dot.base { background: #3b82f6; }
.prob-dot.stress { background: #ef4444; }
.prob-label {
  flex: 1;
  font-size: 13px;
  color: #6b7280;
}
.prob-value {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.strategy-box {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}
.strategy-icon {
  font-size: 20px;
}
.strategy-title {
  font-size: 13px;
  color: #1f2937;
  font-weight: 600;
  margin-bottom: 4px;
}
.strategy-hint {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}

@media (max-width: 1200px) {
  .trend-insight-grid {
    grid-template-columns: 1fr;
  }

  .sd-summary {
    flex-direction: column;
  }

  .sd-score-card {
    width: 100%;
    min-height: 72px;
  }
}

@media (max-width: 1100px) {
  .charts-main {
    flex-direction: column;
  }

  .charts-bottom {
    flex-direction: column;
  }

  .governance-brief {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }

  .sd-matrix {
    grid-template-columns: 1fr;
  }
}
</style>
