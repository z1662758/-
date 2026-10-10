<template>
  <div class="plan-iter-timeline">
    <div v-if="state === 'loading'" class="iter-loading">
      <el-skeleton :rows="4" animated />
    </div>
    <div v-else-if="state === 'error'" class="iter-error">
      <el-icon><WarningFilled /></el-icon>
      <span>读取迭代数据失败</span>
      <el-button type="primary" size="small" link @click="$emit('retry')">重试</el-button>
    </div>
    <div v-else-if="!rows.length && state === 'idle'" class="iter-empty">
      <el-icon><InfoFilled /></el-icon>
      <span>等待该方案运行后展开迭代细节</span>
    </div>
    <div v-else-if="!rows.length" class="iter-empty">
      <el-empty description="该方案暂无迭代记录" :image-size="60" />
    </div>
    <template v-else>
      <div class="iter-summary">
        <div class="iter-summary-item">
          <span class="iter-sum-label">总轮次</span>
          <span class="iter-sum-value">{{ rows.length }}</span>
        </div>
        <div class="iter-summary-item">
          <span class="iter-sum-label">起始得分</span>
          <span class="iter-sum-value">{{ formatScore(rows[0]?.score) }}</span>
        </div>
        <div class="iter-summary-item">
          <span class="iter-sum-label">最终得分</span>
          <span class="iter-sum-value">{{ formatScore(rows[rows.length - 1]?.score) }}</span>
        </div>
        <div class="iter-summary-item highlight">
          <span class="iter-sum-label">提升</span>
          <span class="iter-sum-value" :class="improvementClass">{{ improvementText }}</span>
        </div>
      </div>

      <!-- 跨轮趋势图：得分 / 完成率 / 净利润 随轮次变化 -->
      <div v-if="rows.length >= 2" class="iter-trend">
        <div class="iter-trend-title">指标趋势（逐轮）</div>
        <div ref="chartRef" class="iter-trend-chart"></div>
      </div>

      <div class="iter-list">
        <div
          v-for="(row, idx) in rows"
          :key="row.round_no"
          class="iter-row"
          :class="{ 'is-best': row.round_no === bestRoundNo }"
        >
          <div class="iter-axis">
            <div class="iter-dot" :class="dotClass(row, idx)">
              <span>{{ row.round_no }}</span>
            </div>
            <div v-if="idx < rows.length - 1" class="iter-line"></div>
          </div>

          <div class="iter-body">
            <div class="iter-row-head">
              <span class="iter-round-label">第 {{ row.round_no }} 轮</span>
              <el-tag
                v-if="row.round_no === bestRoundNo"
                size="small"
                type="warning"
                effect="light"
              >🏆 最优轮次</el-tag>
              <el-tag size="small" type="info" effect="plain">来源 {{ getSourceLabel(row.source) }}</el-tag>
              <el-tag
                v-if="row.environment && row.environment.context_type"
                size="small"
                :type="getContextMeta(row.environment.context_type).type"
                effect="plain"
              >{{ getContextMeta(row.environment.context_type).label }}</el-tag>
              <el-tag
                v-if="row.environment && row.environment.has_extreme_scenario"
                size="small"
                type="danger"
                effect="plain"
              >⚠ 突发</el-tag>
              <div class="iter-head-right">
                <span v-if="row.score_delta != null" class="iter-delta" :class="row.score_delta >= 0 ? 'up' : 'down'">
                  <el-icon><CaretTop v-if="row.score_delta >= 0" /><CaretBottom v-else /></el-icon>
                  <span>{{ row.score_delta >= 0 ? '+' : '' }}{{ Number(row.score_delta).toFixed(3) }}</span>
                </span>
                <el-button type="primary" size="small" link @click="$emit('view-round', row)">
                  详情<el-icon class="el-icon--right"><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>

            <div v-if="row.objective" class="iter-objective">
              <el-icon><Aim /></el-icon>
              <span>{{ row.objective }}</span>
            </div>

            <div class="iter-row-grid">
              <div class="iter-cell">
                <div class="iter-cell-label">本轮参数</div>
                <div class="iter-chips">
                  <el-tag
                    v-for="item in row.current_param_items.slice(0, 6)"
                    :key="`p-${row.round_no}-${item.key}`"
                    size="small"
                    :type="diffSet(idx).has(item.key) ? 'danger' : 'info'"
                    :effect="diffSet(idx).has(item.key) ? 'dark' : 'plain'"
                    class="iter-param-chip"
                  >
                    {{ item.key }}={{ item.value }}
                  </el-tag>
                  <el-tooltip
                    v-if="row.current_param_items.length > 6"
                    :content="row.current_param_items.slice(6).map(i => i.key + '=' + i.value).join(' · ')"
                  >
                    <el-tag size="small" type="info" class="iter-param-chip">+{{ row.current_param_items.length - 6 }}</el-tag>
                  </el-tooltip>
                </div>
              </div>

              <div class="iter-cell results-cell">
                <div class="iter-cell-label">本轮结果</div>
                <div class="iter-result-bars">
                  <div class="iter-result-row">
                    <span class="iter-res-lbl">得分</span>
                    <div class="iter-res-track">
                      <div class="iter-res-fill warning" :style="{ width: scorePct(row.score) + '%' }"></div>
                    </div>
                    <span class="iter-res-val">{{ formatScore(row.score) }}</span>
                  </div>
                  <div class="iter-result-row">
                    <span class="iter-res-lbl">完成率</span>
                    <div class="iter-res-track">
                      <div class="iter-res-fill success" :style="{ width: ratePct(row.completion_rate) + '%' }"></div>
                    </div>
                    <span class="iter-res-val">{{ formatRate(row.completion_rate) }}</span>
                  </div>
                  <div class="iter-result-row">
                    <span class="iter-res-lbl">净利润</span>
                    <div class="iter-res-track">
                      <div class="iter-res-fill primary" :style="{ width: profitPct(row.total_net_profit) + '%' }"></div>
                    </div>
                    <span class="iter-res-val">{{ formatInteger(row.total_net_profit) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="row.adjusted_param_text" class="iter-adjust-line">
              <el-icon><Edit /></el-icon>
              <span class="iter-adjust-label">本轮调整：</span>
              <span class="iter-adjust-text">{{ row.adjusted_param_text }}</span>
            </div>

            <div v-if="row.recommendations && row.recommendations.length" class="iter-reco-line">
              <el-icon><ChatLineSquare /></el-icon>
              <span class="iter-reco-text">{{ row.recommendations[0] }}</span>
              <el-tooltip
                v-if="row.recommendations.length > 1"
                :content="row.recommendations.slice(1).join('\n')"
              >
                <span class="iter-reco-more">+{{ row.recommendations.length - 1 }} 条</span>
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Edit, CaretTop, CaretBottom, WarningFilled, InfoFilled, Aim, ArrowRight, ChatLineSquare } from '@element-plus/icons-vue'
import { getContextMeta, getSourceLabel } from './shared/iterationMeta'

const props = defineProps({
  task: { type: Object, required: true },
  state: { type: [String, Array, Object], default: 'idle' },
  formatScore: { type: Function, required: true },
  formatRate: { type: Function, required: true },
  formatInteger: { type: Function, required: true },
  formatParamValue: { type: Function, required: true }
})

defineEmits(['retry', 'view-round'])

const rows = computed(() => Array.isArray(props.state) ? props.state : [])

const bestRoundNo = computed(() => {
  let bestScore = -Infinity
  let bestNo = null
  for (const r of rows.value) {
    const s = Number(r.score)
    if (!Number.isNaN(s) && s > bestScore) {
      bestScore = s
      bestNo = r.round_no
    }
  }
  return bestNo
})

const improvementText = computed(() => {
  if (!rows.value.length) return '-'
  const first = Number(rows.value[0]?.score)
  const last = Number(rows.value[rows.value.length - 1]?.score)
  if (Number.isNaN(first) || Number.isNaN(last)) return '-'
  const delta = last - first
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta.toFixed(3)}`
})

const improvementClass = computed(() => {
  if (!rows.value.length) return ''
  const first = Number(rows.value[0]?.score)
  const last = Number(rows.value[rows.value.length - 1]?.score)
  if (Number.isNaN(first) || Number.isNaN(last)) return ''
  return last - first >= 0 ? 'up' : 'down'
})

const diffSet = (idx) => {
  if (idx === 0) return new Set()
  const prev = rows.value[idx - 1]?.current_param_items || []
  const cur = rows.value[idx]?.current_param_items || []
  const prevMap = new Map(prev.map(i => [i.key, String(i.value)]))
  const set = new Set()
  for (const item of cur) {
    if (prevMap.get(item.key) !== String(item.value)) set.add(item.key)
  }
  return set
}

const dotClass = (row, idx) => {
  if (row.round_no === bestRoundNo.value) return 'best'
  if (idx === 0) return 'start'
  if (idx === rows.value.length - 1) return 'end'
  return ''
}

const scorePct = (s) => {
  const v = Number(s)
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(100, v > 1 ? v : v * 100))
}

const ratePct = (r) => {
  const v = Number(r)
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(100, v > 1 ? v : v * 100))
}

const profitPct = (p) => {
  const v = Number(p)
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(100, v / 20000))
}

/* —— 跨轮趋势图（ECharts，自包含初始化/销毁）—— */
const chartRef = ref(null)
let chartInstance = null
let resizeObserver = null

const buildChartOption = () => {
  const rs = rows.value
  const cats = rs.map(r => `第${r.round_no}轮`)
  const scoreData = rs.map(r => (r.score != null && !Number.isNaN(Number(r.score))) ? +(Number(r.score) * 100).toFixed(2) : null)
  const compData = rs.map(r => {
    const v = Number(r.completion_rate)
    if (Number.isNaN(v)) return null
    return +(v <= 1 ? v * 100 : v).toFixed(2)
  })
  const profitData = rs.map(r => (r.total_net_profit != null && !Number.isNaN(Number(r.total_net_profit))) ? Math.round(Number(r.total_net_profit)) : null)
  return {
    grid: { left: 46, right: 58, top: 34, bottom: 26 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        let s = `${params[0].axisValue}<br/>`
        params.forEach(p => {
          let val = '-'
          if (p.value != null) {
            if (p.seriesName === '得分') val = (p.value / 100).toFixed(3)
            else if (p.seriesName === '完成率') val = `${p.value.toFixed(1)}%`
            else val = Math.round(p.value).toLocaleString('zh-CN')
          }
          s += `${p.marker}${p.seriesName}: ${val}<br/>`
        })
        return s
      }
    },
    legend: { data: ['得分', '完成率', '净利润'], top: 2, itemWidth: 14, itemHeight: 8, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: cats, boundaryGap: true, axisLabel: { fontSize: 10 } },
    yAxis: [
      {
        type: 'value', name: '得分/完成率', min: 0, max: 100,
        axisLabel: { fontSize: 10, formatter: '{value}%' }, nameTextStyle: { fontSize: 10 },
        splitLine: { lineStyle: { type: 'dashed' } }
      },
      {
        type: 'value', name: '净利润',
        axisLabel: { fontSize: 10 }, nameTextStyle: { fontSize: 10 }, splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '得分', type: 'line', smooth: true, connectNulls: true, data: scoreData, yAxisIndex: 0,
        itemStyle: { color: '#e6a23c' }, lineStyle: { color: '#e6a23c' },
        markPoint: { symbolSize: 46, data: [{ type: 'max', name: '最优' }], label: { fontSize: 10 } }
      },
      {
        name: '完成率', type: 'line', smooth: true, connectNulls: true, data: compData, yAxisIndex: 0,
        itemStyle: { color: '#67c23a' }, lineStyle: { color: '#67c23a' }
      },
      {
        name: '净利润', type: 'line', smooth: true, connectNulls: true, data: profitData, yAxisIndex: 1,
        itemStyle: { color: '#409eff' }, lineStyle: { color: '#409eff', type: 'dashed' }
      }
    ]
  }
}

const renderChart = () => {
  if (!chartRef.value || rows.value.length < 2) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => chartInstance && chartInstance.resize())
      resizeObserver.observe(chartRef.value)
    }
  }
  chartInstance.setOption(buildChartOption(), true)
}

onMounted(() => nextTick(renderChart))
watch(rows, () => nextTick(renderChart))

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
.plan-iter-timeline {
  padding: 10px 18px 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.iter-loading,
.iter-error,
.iter-empty {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: var(--mid-fs-body);
}

.iter-error {
  color: var(--el-color-danger);
}

.iter-summary {
  display: flex;
  gap: 14px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.iter-summary-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 90px;
}

.iter-summary-item.highlight {
  margin-left: auto;
}

.iter-sum-label {
  font-size: var(--mid-fs-label);
  color: var(--el-text-color-secondary);
}

.iter-sum-value {
  font-size: var(--mid-fs-title);
  font-weight: 600;
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  color: var(--el-text-color-primary);
}

.iter-sum-value.up { color: var(--el-color-success); }
.iter-sum-value.down { color: var(--el-color-danger); }

.iter-trend {
  margin-bottom: 10px;
  padding: 10px 12px 6px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.iter-trend-title {
  font-size: var(--mid-fs-body);
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.iter-trend-chart {
  width: 100%;
  height: 170px;
}

.iter-list {
  display: flex;
  flex-direction: column;
}

.iter-row {
  display: flex;
  gap: 12px;
  padding: 8px 0;
}

.iter-row.is-best .iter-body {
  background: linear-gradient(135deg, rgba(230, 162, 60, 0.06), transparent);
  border-color: var(--el-color-warning-light-5);
}

.iter-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 32px;
  flex-shrink: 0;
}

.iter-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  box-shadow: 0 0 0 3px var(--el-color-primary-light-9);
}

.iter-dot.start { background: var(--el-color-info); box-shadow: 0 0 0 3px var(--el-color-info-light-9); }
.iter-dot.end { background: var(--el-color-success); box-shadow: 0 0 0 3px var(--el-color-success-light-9); }
.iter-dot.best { background: var(--el-color-warning); box-shadow: 0 0 0 3px var(--el-color-warning-light-9); }

.iter-line {
  flex: 1;
  width: 2px;
  background: var(--el-border-color);
  margin-top: 2px;
}

.iter-body {
  flex: 1;
  padding: 9px 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.iter-row-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.iter-round-label {
  font-size: var(--mid-fs-strong);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.iter-head-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.iter-delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--mid-fs-body);
  font-family: 'JetBrains Mono', monospace;
}

.iter-delta.up { color: var(--el-color-success); }
.iter-delta.down { color: var(--el-color-danger); }

.iter-objective {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
  padding: 6px 9px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: var(--mid-fs-body);
  color: var(--el-text-color-primary);
  line-height: 1.5;
}

.iter-objective .el-icon {
  color: var(--el-color-primary);
  margin-top: 2px;
  flex-shrink: 0;
}

.iter-row-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 12px;
}

.iter-cell-label {
  font-size: var(--mid-fs-label);
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.iter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.iter-param-chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--mid-fs-label);
}

.iter-result-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.iter-result-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--mid-fs-label);
}

.iter-res-lbl {
  width: 44px;
  color: var(--el-text-color-secondary);
}

.iter-res-track {
  flex: 1;
  height: 6px;
  background: var(--el-fill-color);
  border-radius: 3px;
  overflow: hidden;
}

.iter-res-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.iter-res-fill.success { background: linear-gradient(90deg, #95d475, #67c23a); }
.iter-res-fill.warning { background: linear-gradient(90deg, #f3d19e, #e6a23c); }
.iter-res-fill.primary { background: linear-gradient(90deg, #a0cfff, #409eff); }

.iter-res-val {
  width: 70px;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.iter-adjust-line {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.iter-adjust-label {
  font-weight: 600;
}

.iter-adjust-text {
  color: var(--el-color-primary);
  font-family: 'JetBrains Mono', monospace;
}

.iter-reco-line {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.iter-reco-line .el-icon {
  color: var(--el-color-warning);
  flex-shrink: 0;
}

.iter-reco-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.iter-reco-more {
  flex-shrink: 0;
  color: var(--el-color-primary);
  cursor: default;
}
</style>
