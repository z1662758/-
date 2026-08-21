<template>
  <div class="uranium-iter-timeline" :class="{ compact }">
    <div v-if="!rows.length" class="iter-empty">
      <el-empty description="该实验暂无迭代记录" :image-size="64" />
    </div>

    <template v-else>
      <div v-if="!compact" class="iter-summary">
        <article v-for="item in summaryCards" :key="item.label" class="summary-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.hint }}</small>
        </article>
      </div>

      <div v-if="!compact && rows.length >= 2" class="iter-chart-shell">
        <div class="iter-chart-title">迭代趋势</div>
        <div ref="chartRef" class="iter-chart"></div>
      </div>

      <div class="iter-list">
        <article
          v-for="row in rows"
          :key="row.id || row.round_no"
          class="iter-card"
          :class="{ baseline: row.is_baseline }"
        >
          <div class="iter-head">
            <div class="iter-head-left">
              <strong>{{ row.round_label }}</strong>
              <el-tag size="small" :type="row.is_baseline ? 'info' : 'success'" effect="plain">
                {{ row.is_baseline ? '起始结果' : '迭代结果' }}
              </el-tag>
            </div>

            <div class="iter-head-right">
              <el-tag v-if="row.objective_score != null" size="small" type="warning" effect="plain">
                目标 {{ formatScore(row.objective_score) }}
              </el-tag>
              <span
                v-if="row.objective_improvement != null"
                class="iter-delta"
                :class="row.objective_improvement >= 0 ? 'good' : 'bad'"
              >
                {{ row.objective_improvement >= 0 ? '改善' : '回落' }}
                {{ formatScore(Math.abs(row.objective_improvement)) }}
              </span>
            </div>
          </div>

          <div class="iter-metric-grid">
            <article v-for="item in buildMetricCards(row)" :key="item.label" class="metric-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>

          <div v-if="row.feedback_signals?.length" class="chip-line">
            <span class="chip-label">反馈</span>
            <div class="chip-wrap">
              <el-tag
                v-for="item in row.feedback_signals"
                :key="`${row.id}-feedback-${item}`"
                size="small"
                type="warning"
                effect="plain"
              >
                {{ item }}
              </el-tag>
            </div>
          </div>

          <div v-if="row.manufacturer_alerts?.length" class="alert-list">
            <article
              v-for="item in row.manufacturer_alerts.slice(0, 3)"
              :key="`${row.id}-alert-${item}`"
              class="alert-card"
            >
              {{ item }}
            </article>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { formatUraniumMetricValue } from '@/utils/uraniumDuringAdapter'

const props = defineProps({
  rows: {
    type: Array,
    default: () => []
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const chartRef = ref(null)
let chartInstance = null
let resizeObserver = null

const summaryCards = computed(() => {
  const first = props.rows[0] || {}
  const last = props.rows[props.rows.length - 1] || {}
  return [
    {
      label: '总轮次',
      value: String(props.rows.length),
      hint: '本次实验迭代总数'
    },
    {
      label: '起始成本',
      value: formatUraniumMetricValue('avg_cost_usd_kgU', first.avg_cost_usd_kgU),
      hint: '初始方案'
    },
    {
      label: '最终风险',
      value: formatUraniumMetricValue('avg_risk_exposure', last.avg_risk_exposure),
      hint: '最后一轮结果'
    },
    {
      label: '最终库存覆盖',
      value: formatUraniumMetricValue('final_inventory_coverage_years', last.inventory_coverage_years),
      hint: '最后一轮结果'
    }
  ]
})

function formatScore(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(3)
}

function normalizePercent(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return num <= 1 ? num * 100 : num
}

function buildMetricCards(row) {
  return [
    {
      label: '平均成本',
      value: formatUraniumMetricValue('avg_cost_usd_kgU', row.avg_cost_usd_kgU)
    },
    {
      label: '平均风险',
      value: formatUraniumMetricValue('avg_risk_exposure', row.avg_risk_exposure)
    },
    {
      label: '库存覆盖',
      value: formatUraniumMetricValue('final_inventory_coverage_years', row.inventory_coverage_years)
    },
    {
      label: '需求缺口',
      value: formatUraniumMetricValue('max_unmet_demand_tU', row.max_unmet_demand_tU)
    }
  ]
}

function buildChartOption() {
  return {
    grid: {
      left: 56,
      right: 110,
      top: 42,
      bottom: 28
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      top: 6,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: {
        fontSize: 11
      }
    },
    xAxis: {
      type: 'category',
      data: props.rows.map((item) => item.round_label),
      axisLabel: {
        fontSize: 10
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '成本',
        axisLabel: {
          formatter: '${value}'
        },
        splitLine: {
          lineStyle: {
            type: 'dashed'
          }
        }
      },
      {
        type: 'value',
        name: '风险',
        position: 'right',
        axisLabel: {
          formatter: '{value}%'
        },
        splitLine: {
          show: false
        }
      },
      {
        type: 'value',
        name: '库存',
        position: 'right',
        offset: 56,
        axisLabel: {
          formatter: '{value}年'
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: '平均成本',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: props.rows.map((item) => Number.isFinite(Number(item.avg_cost_usd_kgU)) ? Number(item.avg_cost_usd_kgU) : null),
        itemStyle: { color: '#2563eb' },
        lineStyle: { color: '#2563eb', width: 2.5 }
      },
      {
        name: '平均风险',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: props.rows.map((item) => normalizePercent(item.avg_risk_exposure)),
        itemStyle: { color: '#d97706' },
        lineStyle: { color: '#d97706', width: 2.5 }
      },
      {
        name: '库存覆盖',
        type: 'line',
        smooth: true,
        yAxisIndex: 2,
        data: props.rows.map((item) => Number.isFinite(Number(item.inventory_coverage_years)) ? Number(item.inventory_coverage_years) : null),
        itemStyle: { color: '#16a34a' },
        lineStyle: { color: '#16a34a', width: 2.5 }
      }
    ]
  }
}

function renderChart() {
  if (props.compact || !chartRef.value || props.rows.length < 2) return
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
watch(() => props.rows, () => nextTick(renderChart), { deep: true })

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
.uranium-iter-timeline {
  padding: 10px 18px 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.uranium-iter-timeline.compact {
  padding: 0;
  background: transparent;
}

.iter-empty {
  padding: 14px;
}

.iter-summary,
.iter-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.summary-card,
.metric-card,
.iter-card,
.alert-card {
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: #fff;
}

.summary-card,
.metric-card {
  padding: 8px 10px;
}

.summary-card span,
.metric-card span,
.summary-card small,
.chip-label,
.iter-delta,
.alert-card {
  font-size: var(--mid-fs-label);
  color: var(--el-text-color-secondary);
}

.summary-card strong,
.metric-card strong,
.iter-head strong {
  color: var(--el-text-color-primary);
}

.summary-card strong,
.metric-card strong {
  display: block;
  margin-top: 4px;
  font-size: var(--mid-fs-title);
}

.summary-card small {
  display: block;
  margin-top: 4px;
}

.iter-chart-shell {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: #fff;
}

.iter-chart-title {
  margin-bottom: 6px;
  font-size: var(--mid-fs-strong);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.iter-chart {
  width: 100%;
  height: 210px;
}

.iter-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.iter-card {
  padding: 10px 12px;
}

.uranium-iter-timeline.compact .iter-list {
  margin-top: 0;
  gap: 8px;
}

.uranium-iter-timeline.compact .iter-card {
  padding: 10px 12px;
}

.uranium-iter-timeline.compact .iter-metric-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.iter-card.baseline {
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.iter-head,
.iter-head-left,
.iter-head-right,
.chip-line,
.chip-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.iter-head {
  justify-content: space-between;
}

.iter-head-left,
.chip-line,
.chip-wrap {
  flex-wrap: wrap;
}

.iter-head strong {
  font-size: var(--mid-fs-strong);
}

.iter-delta.good {
  color: var(--el-color-success);
}

.iter-delta.bad {
  color: var(--el-color-danger);
}

.iter-metric-grid {
  margin-top: 10px;
}

.chip-line,
.alert-list {
  margin-top: 10px;
}

.alert-list {
  display: grid;
  gap: 8px;
}

.alert-card {
  padding: 10px 12px;
  background: #fff7ed;
  border-color: #fed7aa;
}

@media (max-width: 960px) {
  .iter-summary,
  .iter-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .iter-summary,
  .iter-metric-grid {
    grid-template-columns: 1fr;
  }

  .iter-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
