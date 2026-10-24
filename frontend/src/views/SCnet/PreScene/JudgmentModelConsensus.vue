<template>
  <div ref="root" class="model-consensus">
    <div class="comparison-heading"><div><h3>五模型趋势对照 · 全球供应压力</h3><p>共同目标 GSCPI · 2026年10—12月 · 同一观测起点2026年9月 · 每种颜色固定对应一个模型</p></div><span class="agreement">{{ agreement.label }}</span></div>
    <div class="model-key" aria-label="趋势对照模型"><button @click="focus=''" :class="{active:!focus}">全部模型</button><button v-for="model in models" :key="model.id" @click="focus=focus===model.id?'':model.id" :class="{active:focus===model.id}" :aria-pressed="focus===model.id"><i :style="{background:color(model.id)}"></i>{{ shortName(model) }}</button></div>
    <div ref="chartElement" class="trend-chart" role="img" aria-label="DBN、BVAR、MS-AR、DFM与QGBRT的供应压力预测对照"></div>
    <p class="chart-caption">实线为历史观测，彩色虚线为各模型输出。QGBRT是条件中位数，其余为条件均值；按相同目标比较方向与点估计，不添加绘图平滑或波动。</p>
    <div class="table-scroll"><table><thead><tr><th>模型</th><th v-for="month in quarterDates" :key="month">{{ month }}</th><th>Q4均值</th><th>较9月变化</th><th>趋势判断</th><th>验证RMSE / 基线</th></tr></thead><tbody><tr v-for="model in models" :key="model.id" :class="{focused:focus===model.id}"><th><i :style="{background:color(model.id)}"></i>{{ shortName(model) }}</th><td v-for="month in quarterDates" :key="month">{{ number(model.values[data.forecast_dates.indexOf(month)]) }}</td><td>{{ number(mean(model)) }}</td><td>{{ mean(model)-last>=0?'+':'' }}{{ number(mean(model)-last) }}</td><td>{{ direction(model) }}</td><td>{{ number(model.validation?.rmse) }} / {{ number(model.validation?.naive_rmse) }}</td></tr></tbody></table></div>
    <div class="agreement-text"><b>{{ agreement.headline }}</b><p>{{ agreement.text }}</p></div>
    <div class="case-evidence"><h4>采购结论还需核对的案例证据</h4><div class="table-scroll"><table><thead><tr><th>判断问题</th><th>方法</th><th>本案结果</th><th>结论适用范围</th></tr></thead><tbody><tr :class="{focused:activeCaseModel==='simulation'}"><th>130 tU与交期是否可行</th><td>DES逐日履约检验</td><td>正常交付无缺口；前段两笔共同可容忍顺延5天</td><td>检验现有70＋60方案的数量和时点</td></tr><tr :class="{focused:activeCaseModel==='failure'}"><th>哪种事件组合会造成欠料</th><td>FTA组合失效检验</td><td>在所选{{ delayDays }}天坐标下有{{ failureCount }}组最小失效组合</td><td>组合结构结论，不能与压力指数画成同一条预测线</td></tr><tr><th>哪个批量经济上最优</th><td>MILP / Minimax / CVaR</td><td>真实合同参数未齐，未完成经济求解</td><td>不参与已计算模型的一致性计数</td></tr></tbody></table></div></div>
    <p class="boundary-note">趋势一致可形成共同的趋势判断；本图判断的是全球压力方向。它与库存、供方和运输证据共同支持采购建议，不能单凭5条曲线相近就认定本批货物能按时交付。</p>
  </div>
</template>

<script setup>
import {ref,computed,nextTick,onMounted,onUnmounted,watch} from 'vue'
import * as echarts from 'echarts'
const props=defineProps({data:{type:Object,required:true},activeCaseModel:{type:String,default:''},delayDays:{type:Number,default:14},failureCount:{type:Number,default:0}})
const root=ref(null),chartElement=ref(null),focus=ref('')
let chart,observer
const palette={gaussian_dbn:'#2563eb',bayesian_var:'#8b5cf6',markov_ar:'#069b8c',dynamic_factor:'#d48a16',quantile_gbrt:'#d64f82'}
const color=id=>palette[id] || '#64748b'
const shortName=model=>model.label.split(' · ').at(-1)
const number=value=>value==null?'—':Number(value).toFixed(3)
const quarterDates=computed(()=>props.data.forecast_dates.filter(d=>['2026-10','2026-11','2026-12'].includes(d)))
const models=computed(()=>props.data.models.filter(m=>m.status==='success'&&m.details?.status==='converged'&&quarterDates.value.every(d=>Number.isFinite(m.values[props.data.forecast_dates.indexOf(d)]))))
const last=computed(()=>props.data.observations.at(-1))
const mean=model=>quarterDates.value.reduce((sum,d)=>sum+model.values[props.data.forecast_dates.indexOf(d)],0)/quarterDates.value.length
const direction=model=>Math.abs(mean(model)-last.value)<1e-8?'持平':mean(model)<last.value?'压力回落':'压力上升'
const agreement=computed(()=>{
 const groups={};models.value.forEach(m=>{const key=direction(m);groups[key]=(groups[key]||0)+1})
 const sorted=Object.entries(groups).sort((a,b)=>b[1]-a[1]),[trend,count]=sorted[0] || ['待核验',0],total=models.value.length,all=total>1&&count===total
 const strong=models.value.filter(m=>m.validation?.rmse!=null&&m.validation.rmse<m.validation.naive_rmse).length
 return {label:all?`方向一致 ${count}/${total}`:`存在分歧 ${count}/${total}`,headline:all?`共同趋势判断：2026Q4${trend}`:`趋势判断存在分歧：${sorted.map(([key,n])=>`${n}种${key}`).join('，')}`,
 text:`以Q4点预测的均值相对9月观测${number(last.value)}的变化正负判断方向。${all?`${total}种模型支持相同方向，幅度仍不同。`:'应保留各模型的差异。'}${strong}/${total}种模型在各自有效回测窗的RMSE低于朴素基线；各模型共享历史资料，一致判断不等于多份独立验证。`}
})
async function render(){
 await nextTick();if(!chartElement.value)return;chart ||= echarts.init(chartElement.value)
 const history=props.data.observations.slice(-6),pastDates=props.data.dates.slice(-6),axis=[...pastDates,...quarterDates.value],n=history.length
 const series=[{name:'历史观测',type:'line',showSymbol:true,symbolSize:4,data:history.concat(quarterDates.value.map(()=>null)),lineStyle:{width:2,color:'#5d6b80'},itemStyle:{color:'#5d6b80'},markLine:{silent:true,symbol:'none',data:[{xAxis:pastDates.at(-1),label:{formatter:'预测起点',position:'insideEndTop'}}],lineStyle:{type:'dotted',color:'#a3b2c6'}},markArea:{silent:true,itemStyle:{color:'rgba(37,99,235,.035)'},data:[[{xAxis:quarterDates.value[0]},{xAxis:quarterDates.value.at(-1)}]]}},
 ...models.value.map(m=>({name:shortName(m),type:'line',smooth:false,symbol:'circle',symbolSize:focus.value===m.id?7:5,data:Array(n-1).fill(null).concat([history.at(-1)],quarterDates.value.map(d=>m.values[props.data.forecast_dates.indexOf(d)])),lineStyle:{color:color(m.id),width:focus.value===m.id?3:2,type:'dashed',opacity:(focus.value&&focus.value!==m.id)?0.3:1},itemStyle:{color:color(m.id),opacity:(focus.value&&focus.value!==m.id)?0.3:1},emphasis:{focus:'series'}}))]
 chart.setOption({animation:false,tooltip:{trigger:'axis',confine:true,valueFormatter:number},grid:{left:58,right:24,top:32,bottom:30},xAxis:{type:'category',data:axis,boundaryGap:false,axisLabel:{fontSize:11}},yAxis:{type:'value',name:'GSCPI（标准差指数）',scale:true,axisLabel:{fontSize:11},splitLine:{lineStyle:{color:'#edf1f6'}}},series},true);chart.resize()
}
watch([focus,()=>props.data],render)
onMounted(()=>{observer=new ResizeObserver(()=>chart?.resize());observer.observe(root.value);render()})
onUnmounted(()=>{observer?.disconnect();chart?.dispose()})
</script>

<style scoped>
.comparison-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.comparison-heading h3{font-size:15px;margin:0 0 6px}.comparison-heading p,.chart-caption,.boundary-note{font-size:12px;line-height:1.8;color:#73849c;margin:0}.agreement{font-size:12px;white-space:nowrap;border:1px solid #bbded4;background:#eff8f4;color:#22745c;padding:5px 10px;border-radius:5px}.model-key{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:14px 0 6px}.model-key button{border:1px solid #e0e7f0;color:#61748b;background:#fff;font:inherit;font-size:12px;padding:5px 10px;border-radius:4px;cursor:pointer}.model-key button.active{background:#f2f6fc;border-color:#a1bce6;color:#284f7f}i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:7px}.trend-chart{height:265px;width:100%}.table-scroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.8;min-width:720px;margin-top:10px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e8edf4;vertical-align:top}thead{background:#f6f8fb;color:#6c809b}tbody th{font-weight:500}.focused{background:#f0f5fc}.agreement-text{margin-top:14px;border-left:3px solid #4c87c3;background:#f4f8fd;padding:10px 13px;font-size:13px}.agreement-text p{font-size:12px;line-height:1.9;margin:5px 0 0;color:#637d9b}.case-evidence h4{font-size:14px;margin:20px 0 0}.boundary-note{margin-top:12px}@media(max-width:760px){.comparison-heading{align-items:flex-start;flex-direction:column;gap:9px}.trend-chart{height:250px}}
</style>
