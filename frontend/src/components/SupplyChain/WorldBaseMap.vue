<template>
  <div class="world-base-map">
    <div ref="chartRef" class="map-canvas"></div>
    <div v-if="loading" class="map-loading">
      <span>地图加载中...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts/core'
import { GeoComponent, TooltipComponent } from 'echarts/components'
import { ScatterChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { ensureEchartsWorldMap } from '@/utils/ensureEchartsWorldMap'

echarts.use([GeoComponent, TooltipComponent, ScatterChart, CanvasRenderer])

const props = defineProps({
  events: { type: Array, default: () => [] }
})

const emit = defineEmits(['select-event', 'zoom'])

const chartRef = ref(null)
const loading = ref(true)
let chart = null
let resizeObserver = null

/** 位置无效的事件不上图:宁可不画,也不能落到 (0,0) 这种假坐标上 */
function plottable(event) {
  const lng = Number(event?.lng)
  const lat = Number(event?.lat)
  return Number.isFinite(lng) && Number.isFinite(lat) && !(lng === 0 && lat === 0)
}

function buildOption() {
  const eventData = (props.events || []).filter(plottable).map((e, i) => {
    const isCluster = Boolean(e.isCluster)
    const size = isCluster
      ? Math.min(46, 20 + Math.log2(Math.max(2, e.count || 2)) * 7)
      : e.level === '高' ? 20 : e.level === '中' ? 15 : 11
    return {
      name: isCluster ? `${e.count} 个事件` : e.title,
      // 聚合点直接用簇中心,单点保留轻微抖动避免完全重叠
      value: [
        Number(e.lng) + (isCluster ? 0 : (i % 3 - 1) * 0.6),
        Number(e.lat) + (isCluster ? 0 : (i % 2) * 0.4),
        e.level === '高' ? 3 : e.level === '中' ? 2 : 1,
      ],
      raw: e,
      symbolSize: size,
      label: isCluster
        ? { show: true, formatter: String(e.count), color: '#fff', fontSize: 12, fontWeight: 700 }
        : { show: false },
      itemStyle: {
        color: e.color || '#ef4444',
        borderColor: '#ffffff',
        borderWidth: 2.5,
        shadowBlur: 12,
        shadowColor: e.color ? e.color + '88' : 'rgba(239,68,68,0.5)'
      }
    }
  })

  return {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#dbe4f0',
      borderWidth: 1,
      textStyle: { color: '#334155' },
      formatter(params) {
        if (params.seriesName === '风险事件' && params.data?.raw) {
          const e = params.data.raw
          if (e.isCluster) {
            const titles = (e.events || []).slice(0, 5).map((x) => `· ${x.title}`).join('<br/>')
            const more = (e.events || []).length > 5 ? `<br/>… 另有 ${e.events.length - 5} 个事件` : ''
            return `<b>该区域共 ${e.count} 个事件</b><br/>${titles}${more}<br/><span style="color:#94a3b8">点击查看该区域事件</span>`
          }
          const loc = e.locationText || e.location || ''
          const time = e.timeText || ''
          return `<b>${e.title}</b><br/>${loc}${time ? '<br/>' + time : ''}<br/><span style="color:${e.color || '#ef4444'}">${e.level || ''}风险</span>`
        }
        return params.name || '-'
      }
    },
    geo: {
      map: 'world',
      roam: true,
      left: 16,
      right: 16,
      top: 14,
      bottom: 14,
      itemStyle: {
        areaColor: '#dbeaf8',
        borderColor: 'rgba(100, 116, 139, 0.32)',
        borderWidth: 0.8
      },
      emphasis: {
        itemStyle: { areaColor: '#bfdbfe' },
        label: { show: false }
      }
    },
    series: [{
      name: '风险事件',
      type: 'scatter',
      coordinateSystem: 'geo',
      z: 10,
      symbol: 'circle',
      label: {
        show: true,
        position: 'right',
        formatter: ({ data }) => data.name?.length > 14 ? data.name.slice(0, 12) + '...' : data.name,
        color: '#334155',
        fontSize: 10,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 999,
        padding: [2, 8]
      },
      emphasis: {
        scale: 1.6,
        label: { fontSize: 12, fontWeight: 'bold' }
      },
      data: eventData
    }]
  }
}

async function renderChart() {
  if (!chartRef.value) return
  try {
    await ensureEchartsWorldMap(echarts)
    if (!chart) {
      chart = echarts.init(chartRef.value, null, {
        renderer: 'canvas',
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.25)
      })
      chart.on('click', (params) => {
        if (params.seriesName === '风险事件' && params.data?.raw) {
          emit('select-event', params.data.raw)
        }
      })
      // 缩放/平移后把比例报给上层,用于重新聚合(放大后聚合点会拆开)
      chart.on('georoam', () => {
        const option = chart?.getOption?.()
        const scale = option?.geo?.[0]?.zoom
        emit('zoom', Number(scale) || 1)
      })
    }
    chart.setOption(buildOption(), {
      notMerge: false,
      replaceMerge: ['series'],
      lazyUpdate: true
    })
    loading.value = false
  } catch (e) {
    console.warn('WorldBaseMap render error:', e)
    loading.value = false
  }
}

function resizeChart() {
  chart?.resize()
}

watch(() => props.events, () => {
  if (chart) renderChart()
}, { deep: true })

onMounted(() => {
  renderChart()
  window.addEventListener('resize', resizeChart)
  if (typeof ResizeObserver !== 'undefined' && chartRef.value) {
    resizeObserver = new ResizeObserver(resizeChart)
    resizeObserver.observe(chartRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.world-base-map {
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
  background:
    radial-gradient(circle at 18% 10%, rgba(56, 189, 248, 0.16), transparent 24%),
    radial-gradient(circle at 82% 12%, rgba(251, 191, 36, 0.14), transparent 22%),
    linear-gradient(180deg, #fbfdff 0%, #edf5fb 100%);
}
.map-canvas {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.map-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  background: rgba(255, 255, 255, 0.66);
}
</style>
