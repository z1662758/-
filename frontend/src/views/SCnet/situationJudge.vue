<template>
  <div class="sj-root" v-loading="loading">
    <!-- Error state -->
    <div v-if="error" class="sj-error">
      <p>⚠️ 数据加载失败：{{ error }}</p>
      <el-button @click="fetchData" type="primary" size="small">重试</el-button>
    </div>

    <template v-if="!error && chartData">
      <!-- ====== 世界地图态势图（含趋势分析 + 解释 + 结论 + 验证 + 关键事件演化） ====== -->
      <SituationMap
        :scenario="scenario"
        :situation-map="chartData.situationMap"
        :map-evolution="chartData.mapEvolution"
        :conclusion="conclusion"
        :verification-summary="verificationSummary"
        @open-verify="verifyDrawer = true"
      />

      <!-- 供应网络关键节点分析（仅铀场景） -->
      <SupplyNetworkPanel
        v-if="scenario === 'uranium'"
        :supply-network="supplyNetwork"
      />

      <!-- ====== 下半部分：详情分析 ====== -->
      <div class="sj-detail-section">
        <div class="sj-detail-header">
          <span class="sj-detail-title">📊 详情分析</span>
        </div>
        <div class="sj-detail-grid">
          <el-card shadow="hover">
            <template #header><div class="sj-card-title"><span>🔄 周期分析 — 价格历史周期波动</span></div></template>
            <div ref="cycleChart" class="sj-chart"></div>
          </el-card>
          <el-card shadow="hover">
            <template #header><div class="sj-card-title"><span>📍 拐点识别</span></div></template>
            <div ref="turningChart" class="sj-chart"></div>
          </el-card>
          <el-card shadow="hover">
            <template #header><div class="sj-card-title"><span>🎯 供应链情景概率分布</span></div></template>
            <div ref="scenarioChart" class="sj-chart"></div>
          </el-card>
          <el-card shadow="hover">
            <template #header><div class="sj-card-title"><span>📈 趋势分析 — 全球价格 & 供需走势</span></div></template>
            <div ref="trendChart" class="sj-chart"></div>
          </el-card>
        </div>
      </div>
    </template>

    <!-- 详细验证报告抽屉 -->
    <el-drawer v-model="verifyDrawer" size="85%" title="详细验证报告" destroy-on-close>
      <VerificationReport page="judgment" :scenario="scenario" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getJudgmentData } from '@/api/situation'
import VerificationReport from './PreScene/VerificationReport.vue'
import SituationMap from './PreScene/SituationMap.vue'
import SupplyNetworkPanel from './PreScene/SupplyNetworkPanel.vue'

const props = defineProps({
  scenario: { type: String, default: 'uranium' }
})

const trendChart = ref(null)
const cycleChart = ref(null)
const turningChart = ref(null)
const scenarioChart = ref(null)
const chartData = ref(null)
const loading = ref(true)
const error = ref(null)
const verifyDrawer = ref(false)
let charts = []

// ── 从 API 数据派生 ─────────────────────
const riskTable = computed(() => chartData.value?.riskTable || [])
const events = computed(() => chartData.value?.events || [])
const conclusion = computed(() => chartData.value?.conclusion || { tag: '', points: [] })
const verificationSummary = computed(() => chartData.value?.verificationSummary || { score: 0, level: '' })
const supplyNetwork = computed(() => chartData.value?.supplyNetwork || null)

// ── API 数据获取 ─────────────────────────
async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const res = await getJudgmentData(props.scenario)
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

// ── 趋势分析图 ────────────────────────────
function initTrendChart() {
  if (!trendChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(trendChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(trendChart.value); charts.push(c)
  const d = chartData.value.trendChart

  const series = d.series.map((s, idx) => {
    const base = { name: s.name, type: s.type, yAxisIndex: s.yAxisIndex, smooth: true, data: s.data }
    if (idx === 0) {
      return {
        ...base,
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(37,99,235,0.3)' }, { offset: 1, color: 'rgba(37,99,235,0.02)' }
        ]) },
        lineStyle: { color: '#2563eb', width: 2.5 },
        itemStyle: { color: '#2563eb' }
      }
    }
    if (idx === 1) {
      return { ...base, lineStyle: { color: '#8b5cf6', width: 2, type: 'dashed' }, itemStyle: { color: '#8b5cf6' }, symbol: 'diamond', symbolSize: 6 }
    }
    if (idx === 2) {
      return { ...base, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] }, barWidth: '30%', barGap: '30%' }
    }
    if (idx === 3) {
      return { ...base, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] }, barWidth: '30%' }
    }
    return base
  })

  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: d.legend || d.series.map(s => s.name), top: 8, itemWidth: 12 },
    grid: { left: 65, right: 65, top: 55, bottom: 50 },
    xAxis: { type: 'category', data: d.xAxis, axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: (d.yAxis || []).map(ax => ({
      type: 'value', name: ax.name, nameLocation: 'middle', nameGap: 52, min: ax.min
    })),
    series
  })
}

// ── 周期分析图 ────────────────────────────
function initCycleChart() {
  if (!cycleChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(cycleChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(cycleChart.value); charts.push(c)
  const d = chartData.value.cycleChart
  const auto = props.scenario === 'auto'

  c.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 62, right: 48, top: 50, bottom: 50 },
    legend: { data: d.series.map(s => s.name), top: 8 },
    xAxis: { type: 'category', data: d.xAxis, axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: { type: 'value', name: d.yAxisName || (auto ? '年订单量(百笔)' : 'U3O8 现货价($/lb)'), nameLocation: 'middle', nameGap: 50 },
    series: [
      { name: d.series[0].name, type: 'line', data: d.series[0].data, smooth: true,
        lineStyle: { color: '#6366f1', width: 2 },
        areaStyle: { opacity: 0.08, color: '#6366f1' },
        markLine: d.markLines ? {
          silent: true, symbol: 'none',
          lineStyle: { color: '#f59e0b', type: 'dotted' },
          data: d.markLines.map(ml => ({ xAxis: ml.xAxis, label: { formatter: ml.label } }))
        } : undefined
      },
      { name: d.series[1].name, type: 'line', data: d.series[1].data, smooth: true,
        lineStyle: { color: '#ef4444', width: 2, type: 'dashed' }, symbol: 'none' }
    ]
  })
}

// ── 拐点识别图 ────────────────────────────
function initTurningChart() {
  if (!turningChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(turningChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(turningChart.value); charts.push(c)
  const d = chartData.value.turningChart
  const auto = props.scenario === 'auto'

  // markPoint colors by symbol type
  const mpColors = { pin: '#ef4444', roundRect: '#10b981', triangle: '#2563eb' }

  c.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 62, right: 62, top: 50, bottom: 45 },
    legend: { data: d.series.map(s => s.name), top: 8 },
    xAxis: { type: 'category', data: d.xAxis, axisLabel: { rotate: 45, fontSize: 9 } },
    yAxis: [
      { type: 'value', name: auto ? '万辆' : '价格($/lb)', nameLocation: 'middle', nameGap: 50, min: auto ? 200 : 10 },
      { type: 'value', name: '变化率(%)', nameLocation: 'middle', nameGap: 50 }
    ],
    series: [
      { name: d.series[0].name, type: 'line', yAxisIndex: 0, smooth: true, data: d.series[0].data,
        markPoint: d.markPoints ? { data: d.markPoints.map(mp => ({
          name: mp.label, coord: mp.coord, value: mp.label,
          symbol: mp.symbol || 'pin',
          symbolSize: mp.symbol === 'roundRect' ? 20 : mp.symbol === 'triangle' ? 24 : 40,
          itemStyle: { color: mpColors[mp.symbol] || '#ef4444' }
        })) } : undefined,
        lineStyle: { color: '#2563eb', width: 2 },
        itemStyle: { color: '#2563eb' } },
      { name: d.series[1].name, type: 'bar', yAxisIndex: 1, data: d.series[1].data,
        itemStyle: { color: '#94a3b8', borderRadius: [4, 4, 0, 0] }, barWidth: '50%' }
    ]
  })
}

// ── 情景概率分布图 ────────────────────────
function initScenarioChart() {
  if (!scenarioChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(scenarioChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(scenarioChart.value); charts.push(c)
  const d = chartData.value.scenarioDistribution
  const auto = props.scenario === 'auto'

  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['概率(%)', auto ? '产量影响(万辆)' : '价格影响($/lb)'], bottom: 0 },
    grid: { left: 72, right: 72, top: 20, bottom: 55 },
    xAxis: { type: 'category', data: d.categories },
    yAxis: [
      { type: 'value', name: '概率(%)', nameLocation: 'middle', nameGap: 46, max: 100 },
      { type: 'value', name: d.impactUnit, nameLocation: 'middle', nameGap: 54 }
    ],
    series: [
      { name: '概率(%)', type: 'bar', yAxisIndex: 0, data: d.probabilities,
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#6366f1' }, { offset: 1, color: '#a5b4fc' }
        ]), borderRadius: [6, 6, 0, 0] }, barWidth: '45%' },
      { name: d.impactUnit, type: 'line', yAxisIndex: 1, data: d.impacts,
        lineStyle: { color: '#ef4444', width: 2.5 },
        itemStyle: { color: '#ef4444' }, symbol: 'diamond', symbolSize: 10 }
    ]
  })
}

// ── 初始化所有图表 ─────────────────────────
function initAllCharts() {
  // 先销毁所有 ref 上的旧 ECharts 实例
  [trendChart, cycleChart, turningChart, scenarioChart].forEach(elRef => {
    if (elRef.value) {
      const inst = echarts.getInstanceByDom(elRef.value)
      if (inst) inst.dispose()
    }
  })
  charts.forEach(c => { try { c.dispose() } catch {} })
  charts = []
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initTrendChart()
      initCycleChart()
      initTurningChart()
      initScenarioChart()
      setTimeout(handleResize, 200)
    })
  })
}

function handleResize() {
  charts.forEach(c => { try { c.resize() } catch {} })
}

// ResizeObserver：侧边栏折叠/展开时不触发 window.resize，需要用 ResizeObserver
let resizeObserver = null

// 场景切换时重新获取数据
watch(() => props.scenario, () => {
  fetchData()
})

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
  const root = document.querySelector('.sj-root')
  if (root) {
    resizeObserver = new ResizeObserver(() => {
      charts.forEach(c => { try { c.resize() } catch {} })
    })
    resizeObserver.observe(root)
  }
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', handleResize)
  charts.forEach(c => c.dispose())
})
</script>

<style scoped>
.sj-root { padding: 1.5rem; height: calc(100vh - 60px); overflow-y: auto; }

.sj-error { text-align: center; padding: 3rem; color: #ef4444; }
.sj-error p { margin-bottom: 1rem; }

/* ====== 趋势分析卡片 ====== */
.sj-trend-card { margin-bottom: 1.5rem; }

.sj-chart-trend { height: 260px; }

/* ====== 深色结论卡片 ====== */
.sj-conclusion-dark {
  flex: 1;
  background: linear-gradient(135deg, #1e293b 0%, #1e3a5f 40%, #0f172a 100%);
  border: 1px solid #334155;
  position: relative; overflow: hidden;
}
.sj-conclusion-dark::before {
  content: ''; position: absolute; top: -20px; right: -20px;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
  pointer-events: none;
}
.sj-card-title-light { color: #e2e8f0 !important; }
.sj-conclusion-body-light { font-size: 0.92rem; line-height: 1.9; color: #cbd5e1; position: relative; z-index: 1; }
.sj-conclusion-body-light ul { padding-left: 1rem; margin: 0.5rem 0 0; }
.sj-conclusion-body-light li { margin-bottom: 0.55rem; }
.sj-conclusion-body-light b { color: #e2e8f0; }
.sj-tag-row { margin-bottom: 0.45rem; }

/* 可信评分条 */
.sj-verify-badge {
  display: flex; align-items: center; gap: 8px;
  margin-top: 0.7rem; padding: 8px 12px;
  background: rgba(99,102,241,0.16);
  border: 1px solid rgba(99,102,241,0.35);
  border-radius: 8px; cursor: pointer;
  transition: all 0.2s ease;
}
.sj-verify-badge:hover { background: rgba(99,102,241,0.28); }
.sj-verify-icon { font-size: 0.9rem; }
.sj-verify-label { font-size: 0.78rem; color: #c7d2fe; }
.sj-verify-score { font-size: 1rem; font-weight: 800; color: #e2e8f0; }
.sj-verify-level { font-size: 0.78rem; color: #c7d2fe; }
.sj-verify-arrow { margin-left: auto; color: #818cf8; font-size: 0.9rem; }

/* ====== 下半部分：详情分析 ====== */
.sj-detail-section {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
  padding: 1.2rem 1.2rem 0.4rem; margin-bottom: 1rem;
}
.sj-detail-header { margin-bottom: 1rem; }
.sj-detail-title { font-size: 1.05rem; font-weight: 700; color: #1e293b; }

.sj-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding-bottom: 1rem; }

/* ====== 通用 ====== */
.sj-chart { width: 100%; height: 300px; min-height: 260px; }
.sj-chart-trend { height: 260px; }
:deep(.el-card__body) { overflow: visible; }
.sj-card-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.95rem; }

.sj-conclusion-body { font-size: 0.83rem; line-height: 1.7; color: #334155; }
.sj-conclusion-body ul { padding-left: 1.1rem; margin: 0.5rem 0 0; }
.sj-conclusion-body li { margin-bottom: 0.4rem; }
.sj-tag-row { margin-bottom: 0.6rem; }
.sj-final { margin-top: 0.8rem; }

/* ── 响应式：侧边栏折叠/展开 → 布局自适应 ── */
@media (max-width: 1350px) {
  .sj-detail-grid { grid-template-columns: 1fr; }
}

@media (max-width: 900px) {
  .sj-chart { height: 240px; min-height: 200px; }
}
</style>
