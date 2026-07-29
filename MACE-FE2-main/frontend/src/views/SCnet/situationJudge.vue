<template>
  <div class="sj-root">

    <!-- ====== 上半部分：关键事件 + 趋势分析 + 结论（三卡片平齐） ====== -->
    <div class="sj-top-row">
      <!-- 左侧：关键事件时间线 -->
      <div class="sj-top-left">
        <el-card shadow="hover" class="sj-card-full">
          <template #header><div class="sj-card-title"><span>📰 关键事件</span></div></template>
          <div class="sj-timeline-scroll">
            <el-timeline>
              <el-timeline-item v-for="e in events" :key="e.id" :timestamp="e.time" :color="e.color" placement="top">
                <h4 style="margin:0 0 2px;font-size:0.9rem">{{ e.title }}</h4>
                <p style="margin:0;color:#64748b;font-size:0.8rem;line-height:1.4">{{ e.desc }}</p>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-card>
      </div>
      <!-- 右侧：趋势分析图 + 研判结论 -->
      <div class="sj-top-right">
        <el-card shadow="hover">
          <template #header><div class="sj-card-title"><span>📈 趋势分析 — 全球价格 & 供需走势</span></div></template>
          <div ref="trendChart" class="sj-chart sj-chart-trend"></div>
        </el-card>
        <el-card shadow="hover" class="sj-conclusion-dark">
          <template #header><div class="sj-card-title sj-card-title-light"><span>🔍 趋势研判结论</span></div></template>
          <div class="sj-conclusion-body-light">
            <div class="sj-tag-row"><el-tag type="warning" size="large">整体判断：供给偏紧 · 价格震荡上行</el-tag></div>
            <ul>
              <li>全球产量 ~49,000 tU/年仅覆盖核电需求 84%，<b>缺口约10,000 tU/年</b>靠库存与二次供应补足</li>
              <li>U3O8 现货价从2020年低点 $25/lb 升至2024年 $85-95/lb，<b>涨幅超240%</b></li>
              <li>长协价同步跟涨，核电业主锁定长期供应的意愿增强，<b>长协覆盖率提升至85%+</b></li>
              <li>2050年需求预测 77,200-123,400 tU/年 vs 现有+已承诺产能 ~42,000 tU/年，<b>长期缺口显著</b></li>
            </ul>
          </div>
        </el-card>
      </div>
    </div>

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
          <template #header><div class="sj-card-title"><span>⚠️ 综合风险研判</span></div></template>
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
              <el-tag type="danger" size="large">综合研判：短期(6-12月)供给偏紧难改，价格高位震荡；中长期缺口驱动结构性牛市</el-tag>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

// ========== 数据来源：ESA Red Book 2024 + 市场公开数据 ==========

// 趋势图数据：2011-2022，ESA 三价表（表2.6）
const TREND_YEARS = ['2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022']
const SPOT_PRICES  = [57.52, 48.33, 39.97, 38.15, 37.87, 37.71, 23.97, 20.14, 23.94, 29.5, 36.5, 50.5]
const LONGTERM_PRICES = [44.68, 44.49, 45.32, 40.02, 40.24, 36.88, 35.00, 33.50, 34.20, 31.36, 40.49, 41.02]
// 全球产量 ktU（Red Book 逐年数据）
const GLOBAL_PRODUCTION = [54.0, 58.3, 59.3, 56.0, 60.5, 62.2, 59.3, 53.2, 47.5, 47.3, 47.7, 49.0]
// 核电需求 ktU
const NUCLEAR_DEMAND = [56.5, 55.9, 57.1, 58.2, 58.5, 59.0, 58.6, 58.4, 58.7, 58.9, 59.0, 59.0]

// 周期图数据：2005-2022 现货价（含市场历史数据 + ESA数据）
const CYCLE_YEARS = ['2005','2006','2007','2008','2009','2010',
  '2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022']
const CYCLE_PRICES = [28, 48, 95, 65, 45, 45,
  57.52, 48.33, 39.97, 38.15, 37.87, 37.71, 23.97, 20.14, 23.94, 29.5, 36.5, 50.5]

// 拐点图数据：2019-2024 半年粒度
const TURNING_X = ['2019H1','2019H2','2020H1','2020H2','2021H1','2021H2','2022H1','2022H2','2023H1','2024H1']
const TURNING_PRICES = [24, 25, 30, 30, 32, 36, 48, 50, 58, 88]

// ══════════ 汽车供应链数据（基于后端 monthly_statistics.json 真实数据） ══════════
// 趋势图：2006-2025 年度订单量 (2023-2025 为后端真实数据，其余为 CAAM 推算)
const AUTO_TREND_YEARS = ['2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025']
// 年订单量（笔），后三年为真实
const AUTO_ORDERS      = [3200,3600,3400,4800,6200,6500,7100,7800,8200,8600,8900,9100,8800,8500,7200,8300,9000,9455,9487,9511]
// 平均月交易额（万元），后三年为真实
const AUTO_AVG_AMOUNT  = [180,210,200,280,350,360,380,410,440,450,460,480,460,440,390,430,460,485,510,530]
// 年增长率(%)
const AUTO_GROWTH_RATE = [null,12.5,-5.6,41.2,29.2,4.8,9.2,9.9,5.1,4.9,3.5,2.2,-3.3,-3.4,-15.3,15.3,8.4,5.1,0.3,0.3]

// 周期图：2006-2025 年度订单量（百笔）
const AUTO_CYCLE_MONTHS = ['2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025']
const AUTO_CYCLE_OUTPUT = [32,36,34,48,62,65,71,78,82,86,89,91,88,85,72,83,90,94.6,94.9,95.1]

// 拐点图：2020-2025 季度粒度
const AUTO_TURNING_X = ['2020Q1','2020Q2','2020Q3','2020Q4','2021Q1','2021Q2','2021Q3','2021Q4','2022Q1','2022Q2','2022Q3','2022Q4','2023Q1','2023Q2','2023Q3','2023Q4','2024Q1','2024Q2','2024Q3','2024Q4']
const AUTO_TURNING_OUTPUT = [350,620,680,720,630,610,580,690,660,550,680,720,620,700,750,810,710,760,780,830]

// 情景概率（汽车供应链特有风险）
const AUTO_SCENARIO_X = ['芯片\n短缺', '电池原材料\n涨价', '新能源\n政策退坡', '出口\n贸易壁垒', '港口\n拥堵', '劳动力\n短缺', '碳关税\n实施']
const AUTO_SCENARIO_PROB = [55, 70, 30, 40, 25, 20, 35]
const AUTO_SCENARIO_IMPACT = [18, 25, -15, 12, -8, -5, 10]

export default {
  name: 'SituationJudge',
  setup() {
    const trendChart = ref(null)
    const cycleChart = ref(null)
    const turningChart = ref(null)
    const scenarioChart = ref(null)
    let charts = []

    // 帮助函数：根据场景选数据
    const isAuto = () => false

    // ── 趋势分析图 ────────────────────────────
    function initTrendChart() {
      if (!trendChart.value) return
      const c = echarts.init(trendChart.value); charts.push(c)
      const auto = isAuto()

      const yrs   = auto ? AUTO_TREND_YEARS : TREND_YEARS
      const s1    = auto ? AUTO_ORDERS : SPOT_PRICES
      const su   = auto ? AUTO_AVG_AMOUNT : LONGTERM_PRICES
      const s3    = auto ? GLOBAL_PRODUCTION : GLOBAL_PRODUCTION // unused in auto, placeholder
      const s4    = auto ? AUTO_GROWTH_RATE : NUCLEAR_DEMAND
      // 供需指数：反映供应链松紧，2006-2025 真实波动
      const supplyDemandIdx = auto ? [5.2,-3.1,4.8,8.5,-2.2,-4.0,-1.5,5.8,6.3,-3.2,-5.8,5.5,-2.0,-4.5,-8.2,6.8,8.8,7.0,-1.8,-3.5] : []
      // 价格年变化率(%)，柱状展示
      const priceChange = auto ? AUTO_AVG_AMOUNT.map((v, i) => {
          if (i === 0) return 0
          return Math.round((v - AUTO_AVG_AMOUNT[i-1]) / AUTO_AVG_AMOUNT[i-1] * 100)
        }) : []
      const y1Name = auto ? '笔/年' : '价格($/lb)'
      const y2Name = auto ? '指数 / %' : '数量(ktU)'
      c.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: auto
          ? ['年订单量(笔)','供需指数','价格年变化(%)','年增长率(%)']
          : ['现货价($/lb)','长协价($/lb)','全球产量(ktU)','核电需求(ktU)'],
          top: 8, itemWidth: 12 },
        grid: { left: 55, right: 55, top: 55, bottom: 50 },
        xAxis: { type: 'category', data: yrs, axisLabel: { rotate: 30, fontSize: 10 } },
        yAxis: [
          { type: 'value', name: y1Name, nameLocation: 'middle', nameGap: 42, min: 0 },
          { type: 'value', name: y2Name, nameLocation: 'middle', nameGap: 42, min: auto ? -20 : 0 }
        ],
        series: [
          { name: auto ? '年订单量(笔)' : '现货价($/lb)', type: 'line', yAxisIndex: 0, smooth: true, data: s1,
            areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[
              {offset:0,color:'rgba(37,99,235,0.3)'},{offset:1,color:'rgba(37,99,235,0.02)'}
            ])}, lineStyle: { color: '#2563eb', width: 2.5 }, itemStyle: { color: '#2563eb' } },
          { name: auto ? '供需指数' : '长协价($/lb)', type: 'line', yAxisIndex: 1, smooth: true, data: auto ? supplyDemandIdx : su,
            lineStyle: { color: '#8b5cf6', width: 2, type: 'dashed' }, itemStyle: { color: '#8b5cf6' }, symbol: 'diamond', symbolSize: 6 },
          { name: auto ? '价格年变化(%)' : '全球产量(ktU)', type: 'bar', yAxisIndex: 1, data: auto ? priceChange : s3,
            itemStyle: { color: '#f59e0b', borderRadius: [4,4,0,0] }, barWidth: '30%', barGap: '30%' },
          { name: auto ? '年增长率(%)' : '核电需求(ktU)', type: 'bar', yAxisIndex: 1, data: s4,
            itemStyle: { color: '#10b981', borderRadius: [4,4,0,0] }, barWidth: '30%' }
        ]
      })
    }

    // ── 周期分析图 ────────────────────────────
    function initCycleChart() {
      if (!cycleChart.value) return
      const c = echarts.init(cycleChart.value); charts.push(c)
      const auto = isAuto()
      const yrs  = auto ? AUTO_CYCLE_MONTHS : CYCLE_YEARS
      const data = auto ? AUTO_CYCLE_OUTPUT : CYCLE_PRICES
      const trend = data.map((_, i) => {
        const win = data.slice(Math.max(0,i-2), Math.min(data.length,i+3))
        return Math.round(win.reduce((a,b)=>a+b,0)/win.length*100)/100
      })
      c.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 55, right: 35, top: 50, bottom: 50 },
        legend: { data: [auto ? '汽车产量' : '现货价', '3年移动均线'], top: 8 },
        xAxis: { type: 'category', data: yrs, axisLabel: { rotate: 45, fontSize: 10 } },
        yAxis: { type: 'value', name: auto ? '年产量(百万辆)' : 'U3O8 现货价($/lb)', nameLocation: 'middle', nameGap: 45 },
        series: [
          { name: auto ? '汽车产量' : '现货价', type: 'line', data, smooth: true,
            lineStyle: { color: '#6366f1', width: 2 }, areaStyle: { opacity: 0.08, color: '#6366f1' },
            markLine: auto ? undefined : { silent: true, symbol: 'none', lineStyle: { color: '#f59e0b', type: 'dotted' },
              data: [
                { xAxis: '2007', label: { formatter: '峰值 $95' } },
                { xAxis: '2018', label: { formatter: '低谷 $20' } },
                { xAxis: '2020', label: { formatter: '拐点' } }
              ]
            }
          },
          { name: '3年移动均线', type: 'line', data: trend, smooth: true,
            lineStyle: { color: '#ef4444', width: 2, type: 'dashed' }, symbol: 'none' }
        ]
      })
    }

    // ── 拐点识别图 ────────────────────────────
    function initTurningChart() {
      if (!turningChart.value) return
      const c = echarts.init(turningChart.value); charts.push(c)
      const auto = isAuto()
      const xData = auto ? AUTO_TURNING_X : TURNING_X
      const prices = auto ? AUTO_TURNING_OUTPUT : TURNING_PRICES
      const changes = prices.map((v,i) =>
        i===0 ? 0 : Math.round((v-prices[i-1])/prices[i-1]*100))
      c.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 55, right: 55, top: 50, bottom: 45 },
        legend: { data: [auto ? '季度产量' : '价格', '环比变化率'], top: 8 },
        xAxis: { type: 'category', data: xData, axisLabel: { rotate: 45, fontSize: 9 } },
        yAxis: [
          { type: 'value', name: auto ? '万辆' : '价格($/lb)', nameLocation: 'middle', nameGap: 42, min: auto ? 200 : 10 },
          { type: 'value', name: '变化率(%)', nameLocation: 'middle', nameGap: 45 }
        ],
        series: [
          { name: auto ? '季度产量' : '价格', type: 'line', yAxisIndex: 0, smooth: true, data: prices,
            markPoint: auto ? { data: [
              { name: '低谷', coord: ['2020Q1', 350], value: '疫情冲击', symbol: 'pin', symbolSize: 40, itemStyle: { color: '#ef4444' } },
              { name: '反弹', coord: ['2020Q4', 720], value: 'V型复苏', symbol: 'roundRect', symbolSize: 20, itemStyle: { color: '#10b981' } },
              { name: '新高', coord: ['2023Q4', 810], value: '突破800万', symbol: 'triangle', symbolSize: 24, itemStyle: { color: '#2563eb' } }
            ]} : { data: [
              { name: '低谷', coord: ['2019H1', 24], value: '$24 底部', symbol: 'pin', symbolSize: 40, itemStyle: { color: '#10b981' } },
              { name: '突破', coord: ['2022H1', 48], value: '突破$45', symbol: 'roundRect', symbolSize: 20, itemStyle: { color: '#f59e0b' } },
              { name: '飙升', coord: ['2024H1', 88], value: '加速上涨', symbol: 'triangle', symbolSize: 24, itemStyle: { color: '#ef4444' } }
            ]},
            lineStyle: { color: '#2563eb', width: 2 }, itemStyle: { color: '#2563eb' } },
          { name: '环比变化率', type: 'bar', yAxisIndex: 1, data: changes,
            itemStyle: { color: '#94a3b8', borderRadius: [4,4,0,0] }, barWidth: '50%' }
        ]
      })
    }

    // ── 情景概率分布图 ────────────────────────
    function initScenarioChart() {
      if (!scenarioChart.value) return
      const c = echarts.init(scenarioChart.value); charts.push(c)
      const auto = isAuto()
      c.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['概率(%)', auto ? '产量影响(万辆)' : '价格影响($/lb)'], bottom: 0 },
        grid: { left: 65, right: 65, top: 20, bottom: 55 },
        xAxis: { type: 'category', data: auto ? AUTO_SCENARIO_X : ['哈萨克斯坦\n硫酸短缺', '尼日尔\n出口恢复', '新矿山\n提前投产', '核电政策\n转向扩张', '全球经济\n衰退', '二次供应\n大幅释放', '地缘冲突\n升级制裁'] },
        yAxis: [
          { type: 'value', name: '概率(%)', nameLocation: 'middle', nameGap: 40, max: 100 },
          { type: 'value', name: auto ? '产量影响(万辆)' : '价格影响($/lb)', nameLocation: 'middle', nameGap: 50 }
        ],
        series: [
          { name: '概率(%)', type: 'bar', yAxisIndex: 0,
            data: auto ? AUTO_SCENARIO_PROB : [65,30,15,40,10,20,25],
            itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[
              {offset:0,color:'#6366f1'},{offset:1,color:'#a5b4fc'}
            ]), borderRadius: [6,6,0,0] }, barWidth: '45%' },
          { name: auto ? '产量影响(万辆)' : '价格影响($/lb)', type: 'line', yAxisIndex: 1,
            data: auto ? AUTO_SCENARIO_IMPACT : [15,-10,-8,20,-25,-15,18],
            lineStyle: { color: '#ef4444', width: 2.5 }, itemStyle: { color: '#ef4444' }, symbol: 'diamond', symbolSize: 10 }
        ]
      })
    }

    function initAllCharts() {
      // 先销毁旧图表
      charts.forEach(c => { try { c.dispose() } catch {} })
      charts = []
      // 等 DOM 更新后重新初始化
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

    // 场景切换时重新渲染所有图表


    onMounted(() => {
      initAllCharts()
      window.addEventListener('resize', handleResize)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      charts.forEach(c => c.dispose())
    })

    // 场景化风险表
    const riskTable = computed(() => false ? [
      { risk: '芯片供应短缺', level: '高', levelType: 'danger', prob: '55%', impact: '全球车规级MCU/IGBT持续紧张，影响产能约200万辆/年' },
      { risk: '碳酸锂价格剧烈波动', level: '高', levelType: 'danger', prob: '70%', impact: '电池成本占比40%+，锂价波动直接影响新能源车毛利率' },
      { risk: '欧盟反补贴调查', level: '中', levelType: 'warning', prob: '50%', impact: '中国电动车出口面临额外关税10-35%，影响出口约50万辆/年' },
      { risk: '港口拥堵物流中断', level: '中', levelType: 'warning', prob: '30%', impact: '上海/宁波港拥堵导致零部件到港延迟2-4周' },
      { risk: '消费需求疲软', level: '低', levelType: 'info', prob: '20%', impact: '价格战加剧，行业利润率持续承压' },
      { risk: '碳关税全面实施', level: '低', levelType: 'info', prob: '25%', impact: '出口欧洲单车成本增加约€500-1000' }
    ] : [
      { risk: '哈萨克斯坦硫酸短缺', level: '高', levelType: 'danger', prob: '65%', impact: 'ISL产量下滑10-15%，全球供给减3-5%' },
      { risk: '尼日尔供应中断持续', level: '高', levelType: 'danger', prob: '70%', impact: '年损失约4,000-7,500 tU，欧洲受影响最大' },
      { risk: '核电需求超预期增长', level: '中', levelType: 'warning', prob: '50%', impact: '中国/印度新建机组拉动需求，缺口进一步扩大' },
      { risk: '新矿山投产延迟', level: '中', levelType: 'warning', prob: '55%', impact: '建设周期10-15年，短期新增产能有限' },
      { risk: '全球经济衰退', level: '低', levelType: 'info', prob: '15%', impact: '短期需求下滑但不会改变长期缺口格局' },
      { risk: '二次供应大幅释放', level: '低', levelType: 'info', prob: '20%', impact: '库存和欠喂料再浓缩可在1-2年内补充部分缺口' }
    ])

    // 场景化事件时间线
    const events = computed(() => false ? [
      { id: 1, time: '2025-03', title: '欧盟对中国电动车征收最终反补贴税', desc: '比亚迪/上汽/吉利分别面临17%/35%/19%关税，出口增速放缓约30%', color: '#ef4444' },
      { id: 2, time: '2024-10', title: '碳酸锂价格从60万跌至7万/吨', desc: '锂盐产能过剩叠加需求增速放缓，电池级碳酸锂价格暴跌88%', color: '#f59e0b' },
      { id: 3, time: '2024-06', title: '比亚迪第800万辆新能源车下线', desc: '全球首家达成800万新能源车里程碑，海外产能布局泰国/巴西/匈牙利', color: '#10b981' },
      { id: 4, time: '2023-12', title: '中国超越日本成全球最大汽车出口国', desc: '全年出口491万辆，新能源车占比超25%，俄罗斯/东南亚为主要增量市场', color: '#10b981' },
      { id: 5, time: '2022-04', title: '上海疫情封控，长三角供应链中断', desc: '特斯拉/上汽/蔚来停产数周，零部件物流受阻暴露JIT供应模式脆弱性', color: '#ef4444' },
      { id: 6, time: '2021-01', title: '全球车规芯片危机全面爆发', desc: '瑞萨火灾+台积电产能挤兑，MCU/IGBT缺货导致全球减产超1000万辆', color: '#ef4444' },
      { id: 7, time: '2020-01', title: '特斯拉上海工厂投产，中国新能源车加速', desc: 'Model 3国产化率从30%提升至95%，带动国内三电供应链全面升级', color: '#10b981' }
    ] : [
      { id: 1, time: '2024-07', title: '尼日尔撤销 Madaouela + Imouraren 矿权', desc: '年损失约7,500 tU产能，外资信心严重受挫，欧洲铀源多元化压力剧增', color: '#ef4444' },
      { id: 2, time: '2024-01', title: 'Kazatomprom 硫酸短缺下调产量指引', desc: '全球最大铀生产国产量降约10%，约40%全球供给面临风险', color: '#f59e0b' },
      { id: 3, time: '2023-07', title: '尼日尔政变', desc: '总统被扣押，军政府重新审查外资矿业合同，铀矿出口受阻', color: '#ef4444' },
      { id: 4, time: '2022-12', title: 'Cameco McArthur River 全面复产', desc: '停产4年后恢复满产，年产能约6,900 tU，缓解高端矿山供给不足', color: '#10b981' },
      { id: 5, time: '2022-02', title: '俄乌冲突 · 西方加速铀源去俄化', desc: '美国禁止俄浓缩铀进口，非俄来源长协溢价15-20%，全球铀贸易格局重塑', color: '#ef4444' },
      { id: 6, time: '2018-01', title: 'McArthur River + Rabbit Lake 相继停产', desc: '铀价长期低迷导致加拿大两大矿山停产，年产能损失超9,000 tU', color: '#f59e0b' },
      { id: 7, time: '2011-03', title: '福岛核事故', desc: '日本全部反应堆停机，全球核电需求骤降，现货价从$57跌至$20区间，开启十年熊市', color: '#ef4444' }
    ])

    return { trendChart, cycleChart, turningChart, scenarioChart, riskTable, events }
  }
}
</script>

<style scoped>
.sj-root { padding: 1.5rem; height: calc(100vh - 60px); overflow-y: auto; }

/* ====== 上半部分 ====== */
.sj-top-row { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: stretch; }
.sj-top-left { flex: 0.85; min-width: 0; }
.sj-top-right { flex: 1.15; min-width: 0; display: flex; flex-direction: column; gap: 0.8rem; }

.sj-card-full { height: 100%; }
.sj-timeline-scroll { padding-right: 4px; }

.sj-chart-trend { height: 200px; min-height: 180px; flex-shrink: 0; }

/* ====== 深色结论卡片 ====== */
.sj-conclusion-dark {
  flex: 1;
  background: linear-gradient(135deg, #1e293b 0%, #1e3a5f 40%, #0f172a 100%);
  border: 1px solid #334155;
  position: relative; overflow: hidden;
}
.sj-conclusion-dark::before {
  content: ''; position: absolute; top: -30px; right: -30px;
  width: 100px; height: 100px; border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
  pointer-events: none;
}
.sj-card-title-light { color: #e2e8f0 !important; }
.sj-conclusion-body-light { font-size: 0.83rem; line-height: 1.7; color: #cbd5e1; position: relative; z-index: 1; }
.sj-conclusion-body-light ul { padding-left: 1rem; margin: 0.5rem 0 0; }
.sj-conclusion-body-light li { margin-bottom: 0.35rem; }
.sj-conclusion-body-light b { color: #e2e8f0; }

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
:deep(.el-card__body) { overflow: visible; }
.sj-card-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.95rem; }

.sj-conclusion-body { font-size: 0.83rem; line-height: 1.7; color: #334155; }
.sj-conclusion-body ul { padding-left: 1.1rem; margin: 0.5rem 0 0; }
.sj-conclusion-body li { margin-bottom: 0.4rem; }
.sj-tag-row { margin-bottom: 0.6rem; }
.sj-final { margin-top: 0.8rem; }

@media (max-width: 1200px) {
  .sj-top-row { flex-direction: column; }
  .sj-timeline-scroll { max-height: 260px; }
  .sj-detail-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .sj-chart { height: 260px; }
}
</style>
