<template>
  <div class="pred-root">
    

    <!-- 当前态势摘要（从研判带入） -->
    <div class="sj-dashboard">
      <div class="sj-db-card price-up">
        <div class="sj-db-icon">📈</div>
        <div class="sj-db-info">
          <div class="sj-db-label">整车均价</div>
          <div class="sj-db-value">17.8万元 ↓</div>
          <div class="sj-db-detail">新能源车均价年降8% · 价格战持续 · 比亚迪秦Plus跌破8万</div>
        </div>
      </div>
      <div class="sj-db-card supply-tight">
        <div class="sj-db-icon">⚠️</div>
        <div class="sj-db-info">
          <div class="sj-db-label">芯片缺口</div>
          <div class="sj-db-value">~200万辆/年</div>
          <div class="sj-db-detail">车规MCU/IGBT持续紧张 · 产能缺口8%</div>
        </div>
      </div>
      <div class="sj-db-card risk-high">
        <div class="sj-db-icon">🚨</div>
        <div class="sj-db-info">
          <div class="sj-db-label">风险等级</div>
          <div class="sj-db-value">中高</div>
          <div class="sj-db-detail">贸易壁垒+芯片短缺+碳酸锂波动</div>
        </div>
      </div>
      <div class="sj-db-card overall">
        <div class="sj-db-icon">🧠</div>
        <div class="sj-db-info">
          <div class="sj-db-label">研判结论</div>
          <div class="sj-db-value">成本改善·竞争加剧</div>
          <div class="sj-db-detail">电池成本下降利好整车利润，但价格战压缩毛利空间</div>
        </div>
      </div>
    </div>

    <!-- Row 1: GPR 价格预测 + 预测结论 -->
    <div class="pred-row">
      <div class="pred-left">
        <div class="pred-card">
          <div class="pred-card-title">GPR 高斯过程回归 — 汽车季度产量预测</div>
          <div ref="gprChart" class="pred-chart"></div>
        </div>
      </div>
      <div class="pred-right">
        <div class="pred-card pred-card--highlight">
          <div class="pred-card-title">预测结论</div>
          <div class="pred-conclusion">
            <div class="pred-tag"><span class="pred-tag-label">6个月预测</span><span class="pred-tag-val up">780-820万辆/季</span></div>
            <div class="pred-tag"><span class="pred-tag-label">12个月预测</span><span class="pred-tag-val up">800-850万辆/季</span></div>
            <div class="pred-tag"><span class="pred-tag-label">24个月预测</span><span class="pred-tag-val up">3200-3400万辆/年</span></div>
            <ul class="pred-list">
              <li>GPR 高斯过程回归拟合优度 R²=0.91，预测不确定性随周期延长从 ±5% 扩大至 ±15%</li>
              <li>产量增速由补贴退坡前的年化+12%放缓至+6%，但新能源车份额扩张抵消总量放缓</li>
              <li>最大不确定性来源：欧盟关税政策落地节奏、碳酸锂价格触底反弹时点</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 2: 供需缺口 + 多模型对比 -->
    <div class="pred-row">
      <div class="pred-left">
        <div class="pred-card">
          <div class="pred-card-title">产能与需求预测 (2024-2030)</div>
          <div ref="gapChart" class="pred-chart"></div>
        </div>
      </div>
      <div class="pred-right">
        <div class="pred-card">
          <div class="pred-card-title">多模型预测对比</div>
          <div ref="modelCompareChart" class="pred-chart" style="height:220px"></div>
          <div class="pred-model-notes">
            <span class="pred-model-tag gpr">GPR</span> 均值 810万辆/季
            <span class="pred-model-tag lstm">LSTM</span> 均值 760万辆/季
            <span class="pred-model-tag prophet">Prophet</span> 均值 790万辆/季
            <span class="pred-model-tag rl">RL-GPR</span> 均衡 720-830
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
                <li><b>芯片短缺（红线↓）：</b>当前主流情景，概率从 55% 逐步降至 20%。芯片缓解+新工厂投产，产能瓶颈逐步解除。</li>
                <li><b>贸易壁垒（黄线↑）：</b>概率从 40% 升至 55%，反映欧盟关税升级、地缘贸易摩擦等尾部风险积累。</li>
                <li><b>技术突破（绿线↑）：</b>概率从 5% 升至 25%，反映钠电池/固态电池/芯片国产化加速的增量空间。</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

export default {
  name: 'SituationPrediction',
  setup() {
    const gprChart = ref(null)
    const gapChart = ref(null)
    const modelCompareChart = ref(null)
    const scenarioEvoChart = ref(null)
    let charts = []

    function initGprChart() {
      if (!gprChart.value) return
      const c = echarts.init(gprChart.value); charts.push(c)
      const xData = ['2019','2020','2021','2022','2023','2024Q1','2024Q2','2024Q3','2024Q4',
        '2025Q1E','2025Q2E','2025Q3E','2025Q4E','2026Q1E','2026Q2E','2026Q3E','2026Q4E']
      const hist = [210,180,220,250,260,270,275,280,290,null,null,null,null,null,null,null,null]
      const mean = [null,null,null,null,null,null,null,null,290,310,330,350,365,380,395,410,425]
      const upper = [null,null,null,null,null,null,null,null,290,335,375,410,440,465,495,525,555]
      const lower = [null,null,null,null,null,null,null,null,290,285,290,295,300,305,310,315,320]
      c.setOption({
        tooltip: { trigger: 'axis' },
        legend: { top: 8, right: 10, data: ['历史产量','GPR预测均值','95%置信区间'] },
        grid: { left: 70, right: 30, top: 45, bottom: 35 },
        xAxis: { type: 'category', data: xData, axisLabel: { rotate: 30, fontSize: 10 } },
        yAxis: { type: 'value', name: '万辆/月', nameLocation: 'middle', nameGap: 40 },
        series: [
          { name: '历史产量', type: 'line', data: hist, smooth: true, lineStyle: { color: '#2563eb', width: 2.5 }, itemStyle: { color: '#2563eb' } },
          { name: 'GPR预测均值', type: 'line', data: mean, smooth: true, lineStyle: { color: '#ef4444', width: 2.5, type: 'dashed' }, itemStyle: { color: '#ef4444' }, symbol: 'diamond', symbolSize: 8 },
          { name: '95%置信区间', type: 'line', data: upper, smooth: true, lineStyle: { color: '#fca5a5', width: 1, type: 'dotted' }, symbol: 'none', areaStyle: { color: 'rgba(239,68,68,0.08)' } },
          { name: '95%置信区间', type: 'line', data: lower, smooth: true, lineStyle: { color: '#fca5a5', width: 1, type: 'dotted' }, symbol: 'none' }
        ]
      })
    }

    function initGapChart() {
      if (!gapChart.value) return
      const c = echarts.init(gapChart.value); charts.push(c)
      const yrs = ['2024','2025E','2026E','2027E','2028E','2029E','2030E']
      c.setOption({
        tooltip: { trigger: 'axis' },
        legend: { top: 8, right: 10, data: ['NEV产量','芯片产能','电池缺口','产能缺口'] },
        grid: { left: 65, right: 30, top: 45, bottom: 35 },
        xAxis: { type: 'category', data: yrs },
        yAxis: { type: 'value', name: '万辆', nameLocation: 'middle', nameGap: 40 },
        series: [
          { name: 'NEV产量', type: 'line', data: [950,1100,1300,1550,1800,2100,2450], smooth: true, lineStyle: { color: '#2563eb', width: 2.5 }, symbol: 'circle', symbolSize: 8 },
          { name: '芯片产能', type: 'line', data: [850,1050,1250,1450,1700,2000,2350], smooth: true, lineStyle: { color: '#10b981', width: 2.5 }, symbol: 'circle', symbolSize: 8 },
          { name: '电池缺口', type: 'bar', data: [60,50,45,40,35,30,25], itemStyle: { color: '#f59e0b', borderRadius: [4,4,0,0] }, barWidth: '30%' },
          { name: '产能缺口', type: 'bar', data: [100,50,50,100,100,100,100], itemStyle: { color: '#ef4444', borderRadius: [4,4,0,0] }, barWidth: '30%' }
        ]
      })
    }

    function initModelCompareChart() {
      if (!modelCompareChart.value) return
      const c = echarts.init(modelCompareChart.value); charts.push(c)
      const x = ['2024Q4','2025Q1','2025Q2','2025Q3','2025Q4','2026Q1','2026Q2']
      c.setOption({
        tooltip: { trigger: 'axis' },
        legend: { top: 8, right: 10, data: ['GPR','LSTM','Prophet','RL-GPR'] },
        grid: { left: 65, right: 30, top: 45, bottom: 35 },
        xAxis: { type: 'category', data: x },
        yAxis: { type: 'value', name: '万辆/月', nameLocation: 'middle', nameGap: 40 },
        series: [
          { name: 'GPR', type: 'line', smooth: true, data: [290,310,330,350,365,380,395], lineStyle: { color: '#ef4444', width: 2.5 }, symbol: 'diamond', symbolSize: 8 },
          { name: 'LSTM', type: 'line', smooth: true, data: [280,300,315,330,345,360,375], lineStyle: { color: '#10b981', width: 2 }, symbol: 'circle', symbolSize: 8 },
          { name: 'Prophet', type: 'line', smooth: true, data: [285,305,325,340,355,370,385], lineStyle: { color: '#f59e0b', width: 2 }, symbol: 'triangle', symbolSize: 8 },
          { name: 'RL-GPR优化', type: 'line', smooth: true, data: [270,290,310,325,340,355,370], lineStyle: { color: '#6366f1', width: 2, type: 'dashed' }, symbol: 'rect', symbolSize: 8 }
        ]
      })
    }

    function initScenarioEvoChart() {
      if (!scenarioEvoChart.value) return
      const c = echarts.init(scenarioEvoChart.value); charts.push(c)
      const months = ['当前','3月','6月','9月','12月','18月','24月']
      c.setOption({
        tooltip: { trigger: 'axis' },
        legend: { top: 8, right: 10, data: ['芯片短缺','贸易壁垒','技术突破'] },
        grid: { left: 55, right: 30, top: 45, bottom: 35 },
        xAxis: { type: 'category', data: months },
        yAxis: { type: 'value', name: '概率(%)', nameLocation: 'middle', nameGap: 40, max: 70, axisLabel: { formatter: '{value}%' } },
        series: [
          { name: '芯片短缺', type: 'line', smooth: true, data: [55,50,42,35,30,25,20], areaStyle: {}, lineStyle: { color: '#ef4444', width: 2 }, itemStyle: { color: '#ef4444' } },
          { name: '贸易壁垒', type: 'line', smooth: true, data: [40,42,45,48,50,52,55], areaStyle: {}, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
          { name: '技术突破', type: 'line', smooth: true, data: [5,8,13,17,20,23,25], areaStyle: {}, lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981' } }
        ]
      })
    }

    onMounted(() => {
      setTimeout(() => {
        initGprChart(); initGapChart(); initModelCompareChart(); initScenarioEvoChart()
      }, 200)
    })
    onUnmounted(() => charts.forEach(c => c.dispose()))

    return { gprChart, gapChart, modelCompareChart, scenarioEvoChart }
  }
}
</script>

<style scoped>
.pred-root { padding: 1.2rem 1.5rem; height: calc(100vh - 60px); overflow-y: auto; }
.pred-header { margin-bottom: 1rem; }
.pred-header h1 { font-size: 1.3rem; font-weight: 800; color: #1e293b; margin: 0 0 0.1rem; }
.pred-header p { font-size: 0.82rem; color: #64748b; margin: 0; }

/* 态势总览卡片（同研判页） */
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

/* 预测结论高亮卡片 —— 用户最关注的核心结论 */
.pred-card--highlight {
  background: linear-gradient(135deg, #1e293b 0%, #1e3a5f 40%, #0f172a 100%);
  border: 1px solid #334155;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.25), 0 1px 4px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}
.pred-card--highlight::before {
  content: '';
  position: absolute;
  top: -40px; right: -40px;
  width: 120px; height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  pointer-events: none;
}
.pred-card--highlight .pred-card-title {
  color: #e2e8f0;
  border-bottom-color: rgba(255, 255, 255, 0.1);
  font-size: 0.95rem;
}
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
.pred-model-notes { margin-top: 0.5rem; font-size: 0.78rem; color: #64748b; display: flex; flex-wrap: wrap; gap: 0.3rem 0.8rem; }
.pred-model-tag { font-weight: 600; font-size: 0.75rem; padding: 1px 6px; border-radius: 4px; }
.pred-model-tag.gpr { color: #ef4444; background: #fef2f2; }
.pred-model-tag.lstm { color: #10b981; background: #ecfdf5; }
.pred-model-tag.prophet { color: #f59e0b; background: #fffbeb; }
.pred-model-tag.rl { color: #6366f1; background: #eef2ff; }

@media (max-width: 1024px) { .pred-row { flex-direction: column; } }
</style>
