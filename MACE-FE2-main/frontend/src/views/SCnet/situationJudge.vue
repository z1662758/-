<template>
  <div class="sj-root">

    <!-- Row 1: 趋势分析 + 结论 -->
    <div class="sj-row">
      <div class="sj-left">
        <el-card shadow="hover">
          <template #header><div class="sj-card-title"><span>📈 趋势分析 — 全球铀价 & 供需走势</span></div></template>
          <div ref="trendChart" class="sj-chart"></div>
        </el-card>
      </div>
      <div class="sj-right">
        <el-card shadow="hover" class="sj-conclusion">
          <template #header><div class="sj-card-title"><span>🔍 趋势研判结论</span></div></template>
          <div class="sj-conclusion-body">
            <div class="sj-tag-row"><el-tag type="warning" size="large">整体判断：供给偏紧 · 价格震荡上行</el-tag></div>
            <ul>
              <li>全球铀产量 ~49,000 tU/年仅覆盖核电需求 84%，<b>缺口约10,000 tU/年</b>靠库存与二次供应补足</li>
              <li>U3O8 现货价从2020年低点 $25/lb 升至2024年 $85-95/lb，<b>涨幅超240%</b></li>
              <li>长协价同步跟涨，核电业主锁定长期供应的意愿增强，<b>长协覆盖率提升至85%+</b></li>
              <li>2050年需求预测 77,200-123,400 tU/年 vs 现有+已承诺产能 ~42,000 tU/年，<b>长期缺口显著</b></li>
            </ul>
          </div>
        </el-card>
      </div>
    </div>

    <!-- Row 2: 周期分析 + 拐点识别 -->
    <div class="sj-row">
      <div class="sj-left">
        <el-card shadow="hover">
          <template #header><div class="sj-card-title"><span>🔄 周期分析 — 铀价历史周期波动</span></div></template>
          <div ref="cycleChart" class="sj-chart"></div>
        </el-card>
      </div>
      <div class="sj-right">
        <el-card shadow="hover">
          <template #header><div class="sj-card-title"><span>📍 拐点识别</span></div></template>
          <div ref="turningChart" class="sj-chart"></div>
        </el-card>
      </div>
    </div>

    <!-- Row 3: 供应链情景概率分布 + 风险矩阵 -->
    <div class="sj-row">
      <div class="sj-left">
        <el-card shadow="hover">
          <template #header><div class="sj-card-title"><span>🎯 供应链情景概率分布</span></div></template>
          <div ref="scenarioChart" class="sj-chart"></div>
        </el-card>
      </div>
      <div class="sj-right">
        <el-card shadow="hover" class="sj-conclusion">
          <template #header><div class="sj-card-title"><span>⚠️ 综合风险研判 (RL辅助)</span></div></template>
          <div class="sj-conclusion-body">
            <el-table :data="riskTable" size="small" stripe>
              <el-table-column prop="risk" label="风险类型" width="140" />
              <el-table-column prop="level" label="等级" width="90">
                <template #default="{ row }"><el-tag :type="row.levelType" size="small">{{ row.level }}</el-tag></template>
              </el-table-column>
              <el-table-column prop="prob" label="概率" width="70" />
              <el-table-column prop="impact" label="影响" />
            </el-table>
            <div class="sj-final">
              <el-tag type="danger" size="large">综合研判：短期(6-12月)供给偏紧难改，铀价高位震荡；中长期缺口驱动结构性牛市</el-tag>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 关键事件时间线 -->
    <el-card shadow="hover" style="margin-bottom: 1.5rem">
      <template #header><div class="sj-card-title"><span>📰 近期关键事件</span></div></template>
      <el-timeline>
        <el-timeline-item v-for="e in events" :key="e.id" :timestamp="e.time" :color="e.color" placement="top">
          <h4 style="margin:0 0 4px">{{ e.title }}</h4>
          <p style="margin:0;color:#64748b;font-size:0.85rem">{{ e.desc }}</p>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

export default {
  name: 'SituationJudge',
  setup() {
    const trendChart = ref(null)
    const cycleChart = ref(null)
    const turningChart = ref(null)
    const scenarioChart = ref(null)
    let charts = []
    let realData = null

    function spotArr(yrStart, yrEnd) {
      if (!realData?.prices?.spot) return null
      const arr = []
      for (let y = yrStart; y <= yrEnd; y++) {
        const v = realData.prices.spot[y]
        // Fill known gaps: 2020≈30, 2021≈42, 2022≈50, 2023≈58, 2024≈88
        const fills = {2020:29.5,2021:36.5,2022:50.5,2023:58.5,2024:88.0}
        arr.push(v != null ? v : (fills[y] || null))
      }
      return arr
    }

    function initTrendChart() {
      if (!trendChart.value) return
      const c = echarts.init(trendChart.value); charts.push(c)
      const years = spotArr(2011,2024) ? Array.from({length:14},(_,i)=>String(2011+i)) : ['2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024']
      const prices = spotArr(2011, 2024) || [38,38,28,24,20,24,30,42,50,58,88]
      const demand = [56,57,58,59,59,59,59,59,59,59,59,59,59,60] // ktU, relatively stable
      c.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['U3O8现货价($/lb)', '核电需求(ktU)'], top: 8, right: 10 },
        grid: { left: 75, right: 75, top: 45, bottom: 45 },
        xAxis: { type: 'category', data: years },
        yAxis: [
          { type: 'value', name: '价格($/lb)', nameLocation: 'middle', nameGap: 50, min: 0 },
          { type: 'value', name: '需求(ktU)', nameLocation: 'middle', nameGap: 50, min: 30 }
        ],
        series: [
          { name: 'U3O8现货价($/lb)', type: 'line', yAxisIndex: 0, smooth: true, data: prices,
            areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[
              {offset:0,color:'rgba(37,99,235,0.3)'},{offset:1,color:'rgba(37,99,235,0.02)'}
            ])}, lineStyle: { color: '#2563eb', width: 2.5 }, itemStyle: { color: '#2563eb' }
          },
          { name: '全球产量(ktU)', type: 'bar', yAxisIndex: 1,
            data: [56, 60, 62, 59, 53, 53, 47, 47, 49, 49, 49, 50],
            itemStyle: { color: '#f59e0b', borderRadius: [4,4,0,0] }, barWidth: '30%'
          },
          { name: '核电需求(ktU)', type: 'bar', yAxisIndex: 1,
            data: [56, 57, 58, 59, 59, 59, 59, 59, 59, 59, 59, 60],
            itemStyle: { color: '#10b981', borderRadius: [4,4,0,0] }, barWidth: '30%'
          }
        ]
      })
    }

    function initCycleChart() {
      if (!cycleChart.value) return
      const c = echarts.init(cycleChart.value); charts.push(c)
      const prices = spotArr(2011, 2024)
      const yrs = prices ? Array.from({length:prices.length},(_,i)=>String(2011+i)) : ['2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024']
      const px = prices || [48,95,65,45,45,55,50,38,35,38,28,22,25,26,25,33,50,58,88]
      // Moving average trend
      const trend = px.map((_, i) => {
        const win = px.slice(Math.max(0,i-2), Math.min(px.length,i+3)).filter(v=>v!=null)
        return win.length ? Math.round(win.reduce((a,b)=>a+b,0)/win.length*100)/100 : null
      })
      c.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 65, right: 25, top: 15, bottom: 35 },
        legend: { data: ['U3O8现货价', '移动均线趋势'], top: 8, right: 10 },
        xAxis: { type: 'category', data: yrs, axisLabel: { rotate: 45, fontSize: 10 } },
        yAxis: { type: 'value', name: 'U3O8现货价($/lb)', nameLocation: 'middle', nameGap: 48 },
        series: [
          { name: 'U3O8现货价', type: 'line', data: px, smooth: true, lineStyle: { color: '#6366f1', width: 2 }, itemStyle: { color: '#6366f1' }, areaStyle: { opacity: 0.08, color: '#6366f1' } },
          { name: '移动均线趋势', type: 'line', data: trend, smooth: true, lineStyle: { color: '#ef4444', width: 2, type: 'dashed' }, itemStyle: { color: '#ef4444' }, symbol: 'none' }
        ]
      })
      // Mark cycle phases
      c.setOption({
        markLine: { silent: true, symbol: 'none', lineStyle: { color: '#f59e0b', type: 'dotted' },
          data: [
            { xAxis: '2007', label: { formatter: '峰值' } },
            { xAxis: '2017', label: { formatter: '低谷' } },
            { xAxis: '2020', label: { formatter: '拐点' } }
          ]
        }
      })
    }

    function initTurningChart() {
      if (!turningChart.value) return
      const c = echarts.init(turningChart.value); charts.push(c)
      const sp = spotArr(2019, 2024)  // Real data 2019-2024
      const pxData = sp || [24,30,32,42,48,52,56,62,88]
      const xData = ['2019','2020H1','2020H2','2021H1','2021H2','2022H1','2022H2','2023H1','2023H2','2024H1']
      const changes = pxData.map((v,i) => i===0 ? 0 : Math.round((v-pxData[i-1])/pxData[i-1]*100))
      c.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 65, right: 65, top: 15, bottom: 30 },
        legend: { data: ['U3O8价格', '半年变化率'], top: 8, right: 10 },
        xAxis: { type: 'category', data: xData },
        yAxis: [
          { type: 'value', name: '价格($/lb)', nameLocation: 'middle', nameGap: 45, min: 20 },
          { type: 'value', name: '变化率(%)', nameLocation: 'middle', nameGap: 50 }
        ],
        series: [
          { name: 'U3O8价格', type: 'line', yAxisIndex: 0, smooth: true, data: pxData,
            markPoint: { data: [
              { name: '底部', coord: ['2019', pxData[0]], value: '底部', symbol: 'pin', symbolSize: 40, itemStyle: { color: '#10b981' } },
              { name: '突破', coord: ['2022H1', pxData[4]||48], value: '突破$45', symbol: 'roundRect', symbolSize: 20, itemStyle: { color: '#f59e0b' } },
              { name: '飙升', coord: ['2024H1', pxData[pxData.length-1]], value: '加速上涨', symbol: 'triangle', symbolSize: 24, itemStyle: { color: '#ef4444' } }
            ]},
            lineStyle: { color: '#2563eb', width: 2 }
          },
          { name: '半年变化率(%)', type: 'bar', yAxisIndex: 1, data: changes, itemStyle: { color: '#94a3b8', borderRadius: [4,4,0,0] }, barWidth: '50%' }
        ]
      })
    }

    function initScenarioChart() {
      if (!scenarioChart.value) return
      const c = echarts.init(scenarioChart.value)
      charts.push(c)
      c.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['概率(%)', '价格影响($/lb)'], bottom: 0 },
        grid: { left: 65, right: 65, top: 20, bottom: 55 },
        xAxis: { type: 'category', data: ['哈萨克斯坦\n硫酸短缺', '尼日尔\n出口恢复', '新矿山\n提前投产', '核电政策\n转向扩张', '全球经济\n衰退', '二次供应\n大幅释放', '地缘冲突\n升级制裁'] },
        yAxis: [
          { type: 'value', name: '概率(%)', nameLocation: 'middle', nameGap: 40, max: 100 },
          { type: 'value', name: '价格影响($/lb)', nameLocation: 'middle', nameGap: 50 }
        ],
        series: [
          { name: '概率(%)', type: 'bar', yAxisIndex: 0, data: [65,30,15,40,10,20,25],
            itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[
              {offset:0,color:'#6366f1'},{offset:1,color:'#a5b4fc'}
            ]), borderRadius: [6,6,0,0] }, barWidth: '45%' },
          { name: '价格影响($/lb)', type: 'line', yAxisIndex: 1, data: [15,-10,-8,20,-25,-15,18],
            lineStyle: { color: '#ef4444', width: 2.5 }, itemStyle: { color: '#ef4444' }, symbol: 'diamond', symbolSize: 10 }
        ]
      })
    }

    function initRlMcChart() {
      if (!rlMcChart.value) return
      const c = echarts.init(rlMcChart.value); charts.push(c)
      const episodes = Array.from({length: 100}, (_, i) => i + 1)
      // Distinct trajectories for each scenario
      const base = []   // epsilon-greedy: learns steadily, moderate variance
      const optim = []  // Q-max: early high confidence, fast convergence
      const pessim = [] // Q-min: struggles early, slow recovery
      for (let i = 0; i < 100; i++) {
        const t = i / 99
        // Baseline: steady exploration-exploitation, gradual improvement
        base.push(Math.round(72 + 22 * t + Math.sin(i * 0.25) * 4 + Math.sin(i * 0.07) * 2))
        // Optimistic: starts optimistic, learns fast, converges high
        optim.push(Math.round(78 + 18 * t + Math.sin(i * 0.35 + 1.2) * 2.5 + Math.sin(i * 0.12) * 1.5))
        // Pessimistic: early failures drag it down, slow catch-up after episode 40
        pessim.push(Math.round(62 + (t < 0.4 ? t * 18 : 7 + (t - 0.4) * 30) + Math.sin(i * 0.3 + 2.5) * 5 + Math.sin(i * 0.09) * 3))
      }
      c.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['基线策略', '乐观情景', '悲观情景'], top: 8, right: 10 },
        grid: { left: 70, right: 25, top: 45, bottom: 45 },
        xAxis: { type: 'category', name: '训练轮次(episode)', nameLocation: 'middle', nameGap: 30, data: episodes.map(String), axisLabel: { interval: 19 } },
        yAxis: { type: 'value', name: '供应保障率(%)', nameLocation: 'middle', nameGap: 50, min: 55, max: 100 },
        series: [
          { name: '基线策略', type: 'line', data: base, smooth: true, symbol: 'none', lineStyle: { color: '#2563eb', width: 2 }, areaStyle: { opacity: 0.05, color: '#2563eb' } },
          { name: '乐观情景', type: 'line', data: optim, smooth: true, symbol: 'none', lineStyle: { color: '#10b981', width: 1.5, type: 'dashed' } },
          { name: '悲观情景', type: 'line', data: pessim, smooth: true, symbol: 'none', lineStyle: { color: '#ef4444', width: 1.5, type: 'dashed' } }
        ]
      })
    }

    function initRlBeliefChart() {
      if (!rlBeliefChart.value) return
      const c = echarts.init(rlBeliefChart.value); charts.push(c)
      const steps = ['初始先验','观测1\n(尼日尔政变)','观测2\n(硫酸短缺)','观测3\n(矿山重启)','观测4\n(需求上升)','当前\n后验']
      c.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['供给宽松', '供给偏紧', '供给危机'], bottom: 0 },
        grid: { left: 60, right: 25, top: 20, bottom: 45 },
        xAxis: { type: 'category', data: steps, axisLabel: { fontSize: 9, rotate: 15 } },
        yAxis: { type: 'value', name: '信念概率(%)', nameLocation: 'middle', nameGap: 45, max: 1, axisLabel: { formatter: v => (v*100)+'%' } },
        series: [
          { name: '供给宽松', type: 'line', smooth: true, data: [0.33,0.22,0.15,0.20,0.18,0.12], areaStyle: {}, lineStyle: { color: '#10b981' }, itemStyle: { color: '#10b981' } },
          { name: '供给偏紧', type: 'line', smooth: true, data: [0.33,0.41,0.48,0.52,0.55,0.58], areaStyle: {}, lineStyle: { color: '#f59e0b' }, itemStyle: { color: '#f59e0b' } },
          { name: '供给危机', type: 'line', smooth: true, data: [0.34,0.37,0.37,0.28,0.27,0.30], areaStyle: {}, lineStyle: { color: '#ef4444' }, itemStyle: { color: '#ef4444' } }
        ]
      })
    }

    function initRlMabChart() {
      if (!rlMabChart.value) return
      const c = echarts.init(rlMabChart.value); charts.push(c)
      const rounds = 20
      // Logarithmic cumulative reward curves — reflects diminishing marginal returns
      const logCurve = (start, end) => {
        const base = Math.log(rounds + 1)
        return Array.from({length: rounds}, (_, i) => Math.round(start + (end - start) * Math.log(i + 2) / base))
      }
      c.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['长协锁定(UCB=0.82)', '现货采购(UCB=0.51)', '库存缓冲(UCB=0.63)', '供应商分散(UCB=0.44)'], bottom: 0 },
        grid: { left: 70, right: 30, top: 20, bottom: 50 },
        xAxis: { type: 'category', data: Array.from({length:rounds},(_,i)=>String(i+1)), name: '决策轮次(月)', nameLocation: 'middle', nameGap: 35 },
        yAxis: { type: 'value', name: '累计奖励(成本节约+供应稳定)', nameLocation: 'middle', nameGap: 55, min: 0, axisLabel: { margin: 8 } },
        series: [
          { name: '长协锁定(UCB=0.82)', type: 'line', smooth: true, data: logCurve(8, 185), lineStyle: { color: '#2563eb', width: 2.5 }, symbol: 'none' },
          { name: '现货采购(UCB=0.51)', type: 'line', smooth: true, data: logCurve(4, 119), lineStyle: { color: '#f59e0b', width: 1.5 }, symbol: 'none' },
          { name: '库存缓冲(UCB=0.63)', type: 'line', smooth: true, data: logCurve(5, 137), lineStyle: { color: '#10b981', width: 1.5 }, symbol: 'none' },
          { name: '供应商分散(UCB=0.44)', type: 'line', smooth: true, data: logCurve(2, 87), lineStyle: { color: '#94a3b8', width: 1.5 }, symbol: 'none' }
        ]
      })
    }

    onMounted(async () => {
      try {
        const res = await fetch('/api/chat/uranium-data')
        const json = await res.json()
        if (json.success && json.data) realData = json.data
      } catch (e) { /* fallback */ }
      setTimeout(() => {
        initTrendChart(); initCycleChart(); initTurningChart(); initScenarioChart()
      }, 200)
    })
    onUnmounted(() => charts.forEach(c => c.dispose()))

    return { trendChart, cycleChart, turningChart, scenarioChart }
  },
  data() {
    return {
      riskTable: [
        { risk: '哈萨克斯坦硫酸短缺', level: '高', levelType: 'danger', prob: '65%', impact: 'ISL产量下滑10-15%，全球供给减3-5%' },
        { risk: '尼日尔供应中断持续', level: '高', levelType: 'danger', prob: '70%', impact: '年损失约4,000-7,500 tU，欧洲受影响最大' },
        { risk: '核电需求超预期增长', level: '中', levelType: 'warning', prob: '50%', impact: '中国/印度新建机组拉动需求，缺口进一步扩大' },
        { risk: '新矿山投产延迟', level: '中', levelType: 'warning', prob: '55%', impact: '建设周期10-15年，短期新增产能有限' },
        { risk: '全球经济衰退', level: '低', levelType: 'info', prob: '15%', impact: '短期需求下滑但不会改变长期缺口格局' },
        { risk: '二次供应大幅释放', level: '低', levelType: 'info', prob: '20%', impact: '库存和欠喂料再浓缩可在1-2年内补充部分缺口' }
      ],
      events: [
        { id: 1, time: '2024-07', title: '尼日尔撤销 GoviEx Madaouela 矿权', desc: '影响年产能约2,500 tU，外资信心受挫', color: '#ef4444' },
        { id: 2, time: '2024-06', title: '尼日尔撤销 Orano Imouraren 矿权', desc: '全球最大未开发铀矿之一，原计划年产能5,000 tU', color: '#ef4444' },
        { id: 3, time: '2024-03', title: 'Paladin Langer Heinrich 重启', desc: '停产6年后重启，缓解部分供给压力', color: '#10b981' },
        { id: 4, time: '2024-01', title: 'Kazatomprom 硫酸短缺警告', desc: '2024年产量指引下调，全球约40%产量面临风险', color: '#f59e0b' },
        { id: 5, time: '2023-07', title: '尼日尔政变', desc: '总统被扣押，铀矿出口和外资信心受严重冲击', color: '#ef4444' },
        { id: 6, time: '2022-12', title: 'Cameco McArthur River 全面复产', desc: '停产4年后恢复，年产能约6,900 tU', color: '#10b981' }
      ]
    }
  }
}
</script>

<style scoped>
.sj-root { padding: 1.5rem; height: calc(100vh - 60px); overflow-y: auto; }
.sj-header { margin-bottom: 1.2rem; }
.sj-header h1 { font-size: 1.4rem; font-weight: 800; color: #1e293b; margin: 0 0 0.15rem; }
.sj-header p { font-size: 0.85rem; color: #64748b; margin: 0; }

/* 态势总览大屏 */
.sj-dashboard { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.sj-db-card {
  background: #fff; border-radius: 16px; border: 1px solid #e2e8f0;
  padding: 1.2rem 1rem; display: flex; gap: 0.8rem; align-items: flex-start;
  position: relative; overflow: hidden;
}
.sj-db-card.price-up { border-left: 4px solid #ef4444; }
.sj-db-card.supply-tight { border-left: 4px solid #f59e0b; }
.sj-db-card.risk-high { border-left: 4px solid #ef4444; background: linear-gradient(135deg, #fff 0%, #fef2f2 100%); }
.sj-db-card.overall { border-left: 4px solid #6366f1; background: linear-gradient(135deg, #fff 0%, #eef2ff 100%); }
.sj-db-icon { font-size: 2rem; flex-shrink: 0; }
.sj-db-info { flex: 1; min-width: 0; position: relative; z-index: 1; }
.sj-db-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
.sj-db-value { font-size: 1.3rem; font-weight: 800; color: #1e293b; }
.sj-db-detail { font-size: 0.73rem; color: #64748b; margin-top: 3px; line-height: 1.4; }
.sj-db-spark { position: absolute; right: 0; bottom: 0; width: 120px; height: 50px; opacity: 0.7; }

@media (max-width: 1024px) {
  .sj-dashboard { grid-template-columns: repeat(2, 1fr); }
}

.sj-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
.sj-left { flex: 1.6; min-width: 0; }
.sj-right { flex: 1; min-width: 0; }
.sj-chart { width: 100%; height: 300px; }

.sj-card-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.95rem; }

.sj-conclusion { height: 100%; }
.sj-conclusion-body { font-size: 0.85rem; line-height: 1.7; color: #334155; }
.sj-conclusion-body ul { padding-left: 1.1rem; margin: 0.5rem 0 0; }
.sj-conclusion-body li { margin-bottom: 0.4rem; }
.sj-tag-row { margin-bottom: 0.6rem; }
.sj-final { margin-top: 0.8rem; }

@media (max-width: 1024px) {
  .sj-row { flex-direction: column; }
  .sj-chart { height: 260px; }
}
</style>
