<template>
  <div class="pred-root" v-loading="loading">
    <!-- Error state -->
    <div v-if="error" class="pred-error">
      <p>⚠️ 数据加载失败：{{ error }}</p>
      <el-button @click="fetchData" type="primary" size="small">重试</el-button>
    </div>

    <template v-if="!error && chartData">
      <!-- 当前态势摘要 -->
      <div class="sj-dashboard">
        <div v-for="item in dashboardSummary" :key="item.label"
             class="sj-db-card" :class="item.variant || ''">
          <div class="sj-db-icon">{{ getIcon(item.variant) }}</div>
          <div class="sj-db-info">
            <div class="sj-db-label">{{ item.label }}</div>
            <div class="sj-db-value">{{ item.value }}</div>
            <div class="sj-db-detail">{{ item.detail }}</div>
          </div>
        </div>
      </div>

      <!-- Row 1: GPR 预测 + 预测结论 -->
      <div class="pred-row">
        <div class="pred-left">
          <div class="pred-card">
            <div class="pred-card-title">GPR 高斯过程回归 — {{ gprTitle }}</div>
            <div ref="gprChart" class="pred-chart"></div>
          </div>
        </div>
        <div class="pred-right">
          <div class="pred-card pred-card--highlight">
            <div class="pred-card-title">预测结论</div>
            <div class="pred-conclusion">
              <div class="pred-tag"><span class="pred-tag-label">6个月预测</span><span class="pred-tag-val up">{{ conclusions.horizon6m }}</span></div>
              <div class="pred-tag"><span class="pred-tag-label">12个月预测</span><span class="pred-tag-val up">{{ conclusions.horizon12m }}</span></div>
              <div class="pred-tag"><span class="pred-tag-label">24个月预测</span><span class="pred-tag-val up">{{ conclusions.horizon24m }}</span></div>
              <ul class="pred-list">
                <li v-for="(note, idx) in conclusions.notes" :key="idx">{{ note }}</li>
              </ul>
              <div class="pred-verify-badge" @click="verifyDrawer = true">
                <span class="pred-verify-icon">🛡️</span>
                <span class="pred-verify-label">可信评分</span>
                <span class="pred-verify-score">{{ verificationSummary.score }}%</span>
                <span class="pred-verify-level">{{ verificationSummary.level }}</span>
                <span class="pred-verify-arrow">▸</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 2: 供需缺口 + 多模型对比 -->
      <div class="pred-row">
        <div class="pred-left">
          <div class="pred-card">
            <div class="pred-card-title">供需缺口预测 (2024-2030)</div>
            <div ref="gapChart" class="pred-chart"></div>
          </div>
        </div>
        <div class="pred-right">
          <div class="pred-card">
            <div class="pred-card-title">多模型预测对比</div>
            <div ref="modelCompareChart" class="pred-chart" style="height:220px"></div>
            <div class="pred-model-notes">
              <template v-for="m in modelComparison.models" :key="m.name">
                <span class="pred-model-tag" :class="modelTagClass(m.name)">{{ m.name }}</span>
                {{ m.summary }}
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 3: 情景概率演化 + 解读 -->
      <div class="pred-row">
        <div class="pred-full">
          <div class="pred-card">
            <div class="pred-card-title">情景概率随时间演化</div>
            <div class="pred-scenario-row">
              <div class="pred-scenario-chart">
                <div ref="scenarioEvoChart" class="pred-chart"></div>
              </div>
              <div class="pred-scenario-interp">
                <div class="pred-scenario-interp-title">情景解读</div>
                <ul class="pred-list">
                  <li v-for="(interp, idx) in scenarioEvolution.interpretations" :key="idx" v-html="interp"></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 详细验证报告抽屉 -->
    <el-drawer v-model="verifyDrawer" size="85%" title="详细验证报告" destroy-on-close>
      <VerificationReport page="research" :scenario="scenario" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getResearchData } from '@/api/situation'
import VerificationReport from './VerificationReport.vue'

const props = defineProps({
  scenario: { type: String, default: 'uranium' }
})

const gprChart = ref(null)
const gapChart = ref(null)
const modelCompareChart = ref(null)
const scenarioEvoChart = ref(null)
const chartData = ref(null)
const loading = ref(true)
const error = ref(null)
const verifyDrawer = ref(false)
let charts = []

const isAuto = computed(() => props.scenario === 'auto')

// ── 从 API 数据派生 ─────────────────────
const dashboardSummary = computed(() => chartData.value?.dashboardSummary || [])
const conclusions = computed(() => chartData.value?.predictionConclusions || { horizon6m: '', horizon12m: '', horizon24m: '', notes: [] })
const modelComparison = computed(() => chartData.value?.modelComparison || { xAxis: [], models: [] })
const scenarioEvolution = computed(() => chartData.value?.scenarioEvolution || { xAxis: [], scenarios: [], interpretations: [] })
const verificationSummary = computed(() => chartData.value?.verificationSummary || { score: 0, level: '' })

const gprTitle = computed(() => {
  const gpr = chartData.value?.gprPrediction
  if (!gpr) return '预测'
  return isAuto.value ? `新能源汽车产量预测 (${gpr.unit})` : `U3O8 现货价预测 (${gpr.unit})`
})

function getIcon(variant) {
  const map = { 'price-up': '📈', 'supply-tight': '⚠️', 'risk-high': '🚨', 'overall': '🧠' }
  return map[variant] || '📊'
}

function modelTagClass(name) {
  const map = { 'GPR': 'gpr', 'LSTM': 'lstm', 'Prophet': 'prophet', 'RL-GPR优化': 'rl', 'RL-GPR': 'rl' }
  return map[name] || ''
}

// ── API 数据获取 ─────────────────────────
async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const res = await getResearchData(props.scenario)
    if (res.success) {
      chartData.value = res.data
      await nextTick()
      initAllCharts()
    } else {
      error.value = res.message || '未知错误'
    }
  } catch (e) {
    error.value = e.message || '网络请求失败'
  } finally {
    loading.value = false
  }
}

// ── GPR 预测图 ────────────────────────────
function initGprChart() {
  if (!gprChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(gprChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(gprChart.value); charts.push(c)
  const d = chartData.value.gprPrediction
  const isAuto = props.scenario === 'auto'

  // 用淡色面积绑定上下界，形成一个置信带
  const bandData = d.series[2]?.data?.map((v, i) => {
    const lo = d.series[3]?.data?.[i]
    return v != null && lo != null ? [lo, v] : null
  }) || []

  const series = [
    ...(bandData.some(b => b != null) ? [{
      name: '95%置信区间', type: 'line', data: bandData, smooth: true,
      lineStyle: { opacity: 0 }, symbol: 'none',
      areaStyle: { color: 'rgba(239,68,68,0.1)', origin: 'auto' }, z: 0
    }] : []),
    {
      name: d.series[0]?.name || '历史', type: 'line', smooth: true,
      data: d.series[0]?.data || [],
      lineStyle: { color: '#2563eb', width: 2.5 }, itemStyle: { color: '#2563eb' }, z: 3
    },
    {
      name: d.series[1]?.name || '预测', type: 'line', smooth: true,
      data: d.series[1]?.data || [],
      lineStyle: { color: '#ef4444', width: 2.5, type: 'dashed' },
      itemStyle: { color: '#ef4444' }, symbol: 'diamond', symbolSize: 8, z: 2
    },
    {
      name: '95%置信上界', type: 'line', smooth: true,
      data: d.series[2]?.data || [],
      lineStyle: { color: '#fca5a5', width: 1, type: 'dotted' }, symbol: 'none', z: 1
    },
    {
      name: '95%置信下界', type: 'line', smooth: true,
      data: d.series[3]?.data || [],
      lineStyle: { color: '#fca5a5', width: 1, type: 'dotted' }, symbol: 'none', z: 1
    }
  ]

  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 8, right: 10, data: [d.series[0]?.name, d.series[1]?.name, '95%置信区间'].filter(Boolean) },
    grid: { left: 78, right: 48, top: 45, bottom: 35 },
    xAxis: { type: 'category', data: d.xAxis, axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: { type: 'value', name: isAuto ? '万辆/月' : (d.unit || '$/lb'), nameLocation: 'middle', nameGap: 54 },
    series
  })
}

// ── 供需缺口图 ────────────────────────────
function initGapChart() {
  if (!gapChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(gapChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(gapChart.value); charts.push(c)
  const d = chartData.value.supplyDemandGap

  const lineColors = { '核电需求': '#2563eb', '矿山产量': '#10b981', '新能源汽车产量': '#2563eb', '芯片产能': '#10b981' }
  const barColorMap = { '库存补充': '#f59e0b', '电池缺口': '#f59e0b', '净缺口': '#ef4444', '产能缺口': '#ef4444' }

  const series = d.series.map(s => {
    const isBar = s.type === 'bar'
    if (isBar) {
      return {
        name: s.name, type: 'bar', data: s.data, yAxisIndex: 1,
        itemStyle: { color: barColorMap[s.name] || '#f59e0b', borderRadius: [6, 6, 0, 0] },
        barWidth: '35%',
        label: { show: true, position: 'top', fontSize: 10, formatter: p => p.value != null ? p.value : '' }
      }
    }
    const color = lineColors[s.name] || '#2563eb'
    return {
      name: s.name, type: 'line', data: s.data, smooth: true, yAxisIndex: 0,
      lineStyle: { color, width: 2.5 }, symbol: 'circle', symbolSize: 8, itemStyle: { color }
    }
  })

  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 8, right: 10, data: d.series.map(s => s.name) },
    grid: { left: 95, right: 82, top: 50, bottom: 40 },
    xAxis: { type: 'category', data: d.xAxis, axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: [
      { type: 'value', name: isAuto.value ? '产量/产能(万辆)' : '需求/产量(ktU)', nameLocation: 'middle', nameGap: 84 },
      { type: 'value', name: isAuto.value ? '缺口(万辆)' : '缺口/补充(ktU)', nameLocation: 'middle', nameGap: 72 }
    ],
    series
  })
}

// ── 多模型对比图 ──────────────────────────
function initModelCompareChart() {
  if (!modelCompareChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(modelCompareChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(modelCompareChart.value); charts.push(c)
  const d = chartData.value.modelComparison

  const symbols = ['diamond', 'circle', 'triangle', 'rect']
  const lineStyles = ['solid', 'solid', 'dashed', 'dotted']
  const lineWidths = [3, 2.5, 2, 2]

  const allVals = d.models.flatMap(m => m.data)
  const yMin = Math.floor(Math.min(...allVals) * 0.92)
  const yMax = Math.ceil(Math.max(...allVals) * 1.08)

  const series = d.models.map((m, idx) => ({
    name: m.name, type: 'line', smooth: true, data: m.data,
    lineStyle: { color: m.color, width: lineWidths[idx] || 2.5, type: lineStyles[idx] || 'solid' },
    symbol: symbols[idx] || 'circle', symbolSize: idx === 0 ? 10 : 8,
    itemStyle: { color: m.color }, emphasis: { focus: 'series' }
  }))

  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 8, right: 10, data: d.models.map(m => m.name) },
    grid: { left: 74, right: 44, top: 45, bottom: 35 },
    xAxis: { type: 'category', data: d.xAxis },
    yAxis: { type: 'value', name: isAuto.value ? '万辆/月' : '$/lb', nameLocation: 'middle', nameGap: 52,
             min: yMin, max: yMax },
    series
  })
}

// ── 情景演化图 ────────────────────────────
function initScenarioEvoChart() {
  if (!scenarioEvoChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(scenarioEvoChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(scenarioEvoChart.value); charts.push(c)
  const d = chartData.value.scenarioEvolution

  const series = d.scenarios.map(s => ({
    name: s.name, type: 'line', smooth: true, data: s.data,
    areaStyle: {}, lineStyle: { color: s.color, width: 2 }, itemStyle: { color: s.color }
  }))

  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 8, right: 10, data: d.scenarios.map(s => s.name) },
    grid: { left: 55, right: 30, top: 45, bottom: 35 },
    xAxis: { type: 'category', data: d.xAxis },
    yAxis: { type: 'value', name: '概率(%)', nameLocation: 'middle', nameGap: 48, max: 70,
             axisLabel: { formatter: '{value}%' } },
    series
  })
}

// ── 初始化所有图表 ─────────────────────────
function initAllCharts() {
  ;[gprChart, gapChart, modelCompareChart, scenarioEvoChart].forEach(elRef => {
    if (elRef.value) {
      const inst = echarts.getInstanceByDom(elRef.value)
      if (inst) inst.dispose()
    }
  })
  charts.forEach(c => { try { c.dispose() } catch {} })
  charts = []
  setTimeout(() => {
    initGprChart()
    initGapChart()
    initModelCompareChart()
    initScenarioEvoChart()
  }, 200)
}

// ResizeObserver + resize 监听
let resizeObserver = null

watch(() => props.scenario, () => { fetchData() })

onMounted(() => {
  fetchData()
  // 等 v-loading 移除、DOM 渲染后再监听容器尺寸
  setTimeout(() => {
    const root = document.querySelector('.pred-root')
    if (root && !resizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        charts.forEach(c => { try { c.resize() } catch {} })
      })
      resizeObserver.observe(root)
    }
  }, 600)
  window.addEventListener('resize', handleResize)
})

function handleResize() {
  charts.forEach(c => { try { c.resize() } catch {} })
}

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', handleResize)
  charts.forEach(c => c.dispose())
})
</script>

<style scoped>
.pred-root { padding: 1.2rem 1.5rem; height: calc(100vh - 60px); overflow-y: auto; }

.pred-error { text-align: center; padding: 3rem; color: #ef4444; }
.pred-error p { margin-bottom: 1rem; }

/* 态势总览卡片 */
.sj-dashboard { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.2rem; }
.sj-db-card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 1rem; display: flex; gap: 0.8rem; align-items: flex-start; position: relative; overflow: hidden; }
.sj-db-card.price-up { border-left: 4px solid #ef4444; }
.sj-db-card.supply-tight { border-left: 4px solid #f59e0b; }
.sj-db-card.risk-high { border-left: 4px solid #ef4444; background: linear-gradient(135deg, #fff 0%, #fef2f2 100%); }
.sj-db-card.overall { border-left: 4px solid #6366f1; background: linear-gradient(135deg, #fff 0%, #eef2ff 100%); }
.sj-db-icon { font-size: 2rem; flex-shrink: 0; }
.sj-db-info { flex: 1; min-width: 0; }
.sj-db-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
.sj-db-value { font-size: 1.2rem; font-weight: 800; color: #1e293b; }
.sj-db-detail { font-size: 0.73rem; color: #64748b; margin-top: 3px; line-height: 1.4; }

@media (max-width: 1024px) { .sj-dashboard { grid-template-columns: repeat(2, 1fr); } }

.pred-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
.pred-left { flex: 1.5; min-width: 0; }
.pred-right { flex: 1; min-width: 0; }
.pred-full { flex: 1; min-width: 0; }
.pred-scenario-row { display: flex; gap: 1.5rem; }
.pred-scenario-chart { flex: 1.8; min-width: 0; }
.pred-scenario-chart .pred-chart { height: 280px; }
.pred-scenario-interp { flex: 1; min-width: 0; padding-left: 1.5rem; }
.pred-scenario-interp-title { font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 0.6rem; }
.pred-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; height: 100%; }

/* 预测结论高亮卡片 */
.pred-card--highlight {
  background: linear-gradient(135deg, #1e293b 0%, #1e3a5f 40%, #0f172a 100%);
  border: 1px solid #334155;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.25), 0 1px 4px rgba(0, 0, 0, 0.15);
  position: relative; overflow: hidden;
}
.pred-card--highlight::before {
  content: ''; position: absolute; top: -40px; right: -40px;
  width: 120px; height: 120px; border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  pointer-events: none;
}
.pred-card--highlight .pred-card-title { color: #e2e8f0; border-bottom-color: rgba(255, 255, 255, 0.1); font-size: 0.95rem; }
.pred-card--highlight .pred-conclusion { color: #cbd5e1; }
.pred-card--highlight .pred-tag { border-bottom-color: rgba(255, 255, 255, 0.08); }
.pred-card--highlight .pred-tag-label { color: #94a3b8; }
.pred-card--highlight .pred-tag-val.up { color: #f87171; }
.pred-card--highlight .pred-list li { color: #cbd5e1; }
.pred-card--highlight .pred-list li b { color: #e2e8f0; }
.pred-card-title { font-size: 0.9rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid #f1f5f9; }
.pred-chart { width: 100%; height: 280px; }

.pred-conclusion { font-size: 0.84rem; color: #334155; line-height: 1.7; }
.pred-tag { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9; }
.pred-tag-label { color: #64748b; }
.pred-tag-val { font-weight: 700; }
.pred-tag-val.up { color: #ef4444; }
.pred-list { padding-left: 1rem; margin: 0.5rem 0 0; }
.pred-list li { margin-bottom: 0.4rem; }

/* 可信评分条 */
.pred-verify-badge {
  display: flex; align-items: center; gap: 8px;
  margin-top: 0.7rem; padding: 8px 12px;
  background: rgba(99,102,241,0.16);
  border: 1px solid rgba(99,102,241,0.35);
  border-radius: 8px; cursor: pointer;
  transition: all 0.2s ease;
}
.pred-verify-badge:hover { background: rgba(99,102,241,0.28); }
.pred-verify-icon { font-size: 0.9rem; }
.pred-verify-label { font-size: 0.78rem; color: #c7d2fe; }
.pred-verify-score { font-size: 1rem; font-weight: 800; color: #e2e8f0; }
.pred-verify-level { font-size: 0.78rem; color: #c7d2fe; }
.pred-verify-arrow { margin-left: auto; color: #818cf8; font-size: 0.9rem; }
.pred-model-notes { margin-top: 0.5rem; font-size: 0.78rem; color: #64748b; display: flex; flex-wrap: wrap; gap: 0.3rem 0.8rem; }
.pred-model-tag { font-weight: 600; font-size: 0.75rem; padding: 1px 6px; border-radius: 4px; }
.pred-model-tag.gpr { color: #ef4444; background: #fef2f2; }
.pred-model-tag.lstm { color: #10b981; background: #ecfdf5; }
.pred-model-tag.prophet { color: #f59e0b; background: #fffbeb; }
.pred-model-tag.rl { color: #6366f1; background: #eef2ff; }

/* 响应式：侧边栏展开约 200px，折叠约 64px — 可用宽度变化时自动换行 */
@media (max-width: 1200px) {
  .pred-row { flex-direction: column; }
  .pred-scenario-row { flex-direction: column; }
  .pred-scenario-interp { padding-left: 0; padding-top: 1rem; }
  .pred-chart { height: 240px; }
  .sj-dashboard { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 900px) {
  .sj-dashboard { grid-template-columns: 1fr; }
  .pred-chart { height: 220px; }
}
</style>
