<template>
  <section class="focus-shell">
    <header class="focus-head">
      <div class="focus-title-block">
        <span class="focus-kicker">当前焦点实验</span>
        <h3 class="focus-title">{{ titleText }}</h3>
        <p class="focus-subtitle">{{ subtitleText }}</p>
      </div>

      <div class="focus-actions">
        <el-button size="small" link @click="emit('view-config')">查看全量配置</el-button>
        <el-button size="small" type="primary" @click="emit('view-experiment')">加载实验</el-button>
      </div>
    </header>

    <div class="focus-kpi-grid">
      <article v-for="item in kpiCards" :key="item.label" class="focus-kpi-card" :class="item.tone">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.hint }}</small>
      </article>
    </div>

    <section class="focus-chart-shell">
      <div class="focus-section-head">
        <div class="focus-section-title">核心指标迭代趋势</div>
        <div class="focus-legend">
          <span class="legend-chip blue"><i></i>成本趋势 (左轴)</span>
          <span class="legend-chip amber"><i></i>风险暴露 (右轴)</span>
          <span class="legend-chip emerald"><i></i>库存覆盖 (右轴)</span>
        </div>
      </div>
      <div v-if="orderedRows.length" ref="chartRef" class="focus-chart"></div>
      <el-empty v-else class="focus-chart-empty" description="等待产生迭代结果" :image-size="56" />
    </section>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { formatUraniumMetricValue } from '@/utils/uraniumDuringAdapter'

const props = defineProps({
  task: {
    type: Object,
    default: null
  },
  experiment: {
    type: Object,
    default: null
  },
  rows: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['view-config', 'view-experiment'])

const chartRef = ref(null)
let chartInstance = null
let resizeObserver = null

const orderedRows = computed(() => (Array.isArray(props.rows) ? props.rows : []).filter(Boolean))
const latestRow = computed(() => orderedRows.value[orderedRows.value.length - 1] || null)
const baselineRow = computed(() => orderedRows.value[0] || null)

const bestRiskRow = computed(() => {
  return [...orderedRows.value]
    .filter((item) => Number.isFinite(Number(item.avg_risk_exposure)))
    .sort((a, b) => Number(a.avg_risk_exposure) - Number(b.avg_risk_exposure))[0] || latestRow.value
})

const bestInventoryRow = computed(() => {
  return [...orderedRows.value]
    .filter((item) => Number.isFinite(Number(item.inventory_coverage_years)))
    .sort((a, b) => Number(b.inventory_coverage_years) - Number(a.inventory_coverage_years))[0] || latestRow.value
})

const titleText = computed(() => (
  props.experiment?.name
  || props.task?.user_goal
  || '铀供应链实验'
))

const subtitleText = computed(() => {
  const taskId = String(props.task?.task_id || '').trim()
  const shortTaskId = taskId.length > 18 ? `${taskId.slice(0, 14)}...` : taskId || '-'
  return `任务 ${shortTaskId} · ${orderedRows.value.length || 0} 轮结果`
})

const kpiCards = computed(() => [
  {
    label: '总迭代轮次',
    value: `${orderedRows.value.length || 0} 轮`,
    hint: '本次实验预设总数',
    tone: 'slate'
  },
  {
    label: '初始平均成本',
    value: formatUraniumMetricValue('avg_cost_usd_kgU', baselineRow.value?.avg_cost_usd_kgU),
    hint: '初始方案基线',
    tone: 'blue'
  },
  {
    label: '极值/最低风险',
    value: formatUraniumMetricValue('avg_risk_exposure', bestRiskRow.value?.avg_risk_exposure),
    hint: formatAchievementText(bestRiskRow.value, '最低风险结果'),
    tone: 'amber'
  },
  {
    label: '最优库存覆盖',
    value: formatUraniumMetricValue(
      'final_inventory_coverage_years',
      bestInventoryRow.value?.final_inventory_coverage_years ?? bestInventoryRow.value?.inventory_coverage_years
    ),
    hint: formatAchievementText(bestInventoryRow.value, '最佳库存结果'),
    tone: 'emerald'
  }
])

function formatAchievementText(row, fallback = '目标轮次') {
  if (!row) return fallback
  if (row.is_baseline) return '达成于初始方案'
  const roundNo = Number(row.iteration ?? row.round_no)
  if (Number.isFinite(roundNo) && roundNo > 0) return `达成于第 ${roundNo} 轮迭代`
  return row.round_label ? `达成于${row.round_label}` : fallback
}

function buildChartOption() {
  return {
    grid: {
      left: 52,
      right: 76,
      top: 28,
      bottom: 36
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderWidth: 0,
      textStyle: {
        color: '#f8fafc'
      }
    },
    legend: {
      show: false
    },
    xAxis: {
      type: 'category',
      data: orderedRows.value.map((item) => item.round_label),
      axisLine: {
        lineStyle: {
          color: '#cbd5e1'
        }
      },
      axisLabel: {
        color: '#64748b',
        fontSize: 12
      },
      splitLine: {
        show: false
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '成本',
        nameTextStyle: {
          color: '#3b82f6',
          fontWeight: 700
        },
        axisLabel: {
          color: '#3b82f6',
          formatter: '${value}'
        },
        splitLine: {
          lineStyle: {
            color: '#e2e8f0',
            type: 'dashed'
          }
        }
      },
      {
        type: 'value',
        name: '风险/库存',
        position: 'right',
        nameTextStyle: {
          color: '#64748b',
          fontWeight: 700
        },
        axisLabel: {
          color: '#64748b'
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
        symbolSize: 8,
        data: orderedRows.value.map((item) => Number(item.avg_cost_usd_kgU) || null),
        lineStyle: {
          width: 3,
          color: '#3b82f6'
        },
        itemStyle: {
          color: '#3b82f6'
        },
        areaStyle: {
          color: 'rgba(59, 130, 246, 0.10)'
        }
      },
      {
        name: '平均风险',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        symbolSize: 7,
        data: orderedRows.value.map((item) => normalizePercent(item.avg_risk_exposure)),
        lineStyle: {
          width: 3,
          color: '#f59e0b'
        },
        itemStyle: {
          color: '#f59e0b'
        }
      },
      {
        name: '库存覆盖',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        symbolSize: 7,
        data: orderedRows.value.map((item) => Number(item.inventory_coverage_years) || null),
        lineStyle: {
          width: 3,
          type: 'dashed',
          color: '#10b981'
        },
        itemStyle: {
          color: '#10b981'
        }
      }
    ]
  }
}

function normalizePercent(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return num <= 1 ? Number((num * 100).toFixed(2)) : num
}

function renderChart() {
  if (!chartRef.value || !orderedRows.value.length) {
    if (chartInstance) {
      chartInstance.clear()
    }
    return
  }
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
.focus-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--mid-radius-lg);
  border: 1px solid #dbe5f1;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 26%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.focus-head,
.focus-section-head,
.focus-actions,
.focus-legend {
  display: flex;
  align-items: center;
  gap: 10px;
}

.focus-head,
.focus-section-head {
  justify-content: space-between;
}

.focus-head {
  flex-wrap: wrap;
}

.focus-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.focus-kicker {
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3b82f6;
}

.focus-title {
  margin: 0;
  font-size: var(--mid-fs-title);
  line-height: var(--mid-lh-tight);
  font-weight: 800;
  color: #0f172a;
}

.focus-subtitle {
  margin: 0;
  font-size: var(--mid-fs-label);
  color: #64748b;
}

.focus-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.focus-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.focus-kpi-card {
  padding: 9px 11px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
}

.focus-kpi-card span,
.focus-kpi-card small {
  display: block;
}

.focus-kpi-card span {
  font-size: var(--mid-fs-label);
  color: #64748b;
}

.focus-kpi-card strong {
  display: block;
  margin-top: 4px;
  font-size: var(--mid-fs-hero);
  line-height: 1.1;
  font-weight: 900;
  color: #0f172a;
}

.focus-kpi-card small {
  margin-top: 4px;
  font-size: var(--mid-fs-micro);
  color: #94a3b8;
}

.focus-kpi-card.blue strong { color: #2563eb; }
.focus-kpi-card.amber strong { color: #d97706; }
.focus-kpi-card.emerald strong { color: #059669; }

.focus-chart-shell {
  padding: 10px 12px;
  border-radius: var(--mid-radius-md);
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.92);
}

.focus-section-title {
  font-size: var(--mid-fs-strong);
  font-weight: 800;
  color: #0f172a;
}

.focus-legend {
  flex-wrap: wrap;
}

.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  font-size: var(--mid-fs-label);
  font-weight: 700;
}

.legend-chip i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
}

.legend-chip.blue { color: #2563eb; }
.legend-chip.blue i { background: #2563eb; }
.legend-chip.amber { color: #d97706; }
.legend-chip.amber i { background: #f59e0b; }
.legend-chip.emerald { color: #059669; }
.legend-chip.emerald i { background: #10b981; }

.focus-chart {
  width: 100%;
  height: 240px;
  margin-top: 10px;
}

.focus-chart-empty {
  height: 190px;
  margin-top: 8px;
  border: 1px dashed #dbe4f0;
  border-radius: var(--mid-radius-sm);
  background: #f8fafc;
}

@media (max-width: 1200px) {
  .focus-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .focus-shell {
    padding: 12px;
  }

  .focus-kpi-grid {
    grid-template-columns: 1fr;
  }

  .focus-chart {
    height: 210px;
  }

  .focus-section-head,
  .focus-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
