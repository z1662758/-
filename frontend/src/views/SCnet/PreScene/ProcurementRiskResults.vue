<template>
  <div ref="root" class="procurement-risk-results">
    <div class="results-heading"><div><h3>供应链受阻后果 · 环节与方案对照</h3><p>计算模型：{{ library.model_label }} · 下游影响计算；不替代全链条五模型研判</p></div><span class="model-badge">8类受阻范围 · 18项方案 · tU</span></div>
    <div class="condition-bar"><label>受阻持续 <input v-model.number="delay" type="number" min="0" max="70" step="1" aria-label="两图共同顺延天数" @change="delay=boundedDelay"> 天</label><label>路径图使用方案 <select v-model="selectedPlanId" aria-label="路径图采购方案"><option v-for="plan in currentCase.plans" :key="plan.id" :value="plan.id">{{ plan.label }}</option></select></label><button @click="delay=0">按期交付</button><button @click="delay=14">复核14天案例</button></div>
    <p class="small-note">{{ library.condition.definition }} 这里展示条件明确的风险后果，尚未形成五个全链条模型的数值对照。8项是不同受阻范围，18项是候选方案，都不是新增路线或新增模型。</p>
    <div class="chart-grid">
      <section class="plot-panel"><div class="plot-heading"><h4>① 同一路径的八类受阻范围</h4><span>分别检验所选方案各订单与共同暴露</span></div><div ref="routeElement" class="risk-chart" role="img" aria-label="八类供应链受阻范围的最大缺料量柱状图"></div><p class="axis-note"><b>横轴：</b>订单履约、整体供应及共同通道等八类受阻范围；<b>纵轴：</b>该条件下本企业最大缺料量（tU），不是风险评分或概率。0表示本次条件下无阶段欠料。</p><div class="route-evidence" v-for="route in library.routes" :key="route.id"><b>{{ route.origin }} → {{ route.corridor }} → {{ route.delivery_point }}</b><p>{{ route.route_status }}。{{ route.case_mapping }}</p><a :href="route.source_url" target="_blank" rel="noopener noreferrer">{{ route.source_publisher }} · {{ route.source_date }} ↗</a><button class="text-button" @click="traceOpen=true">查看该路径计算记录</button></div></section>
      <section class="plot-panel"><div class="plot-heading"><h4>② 十八项采购与到货方案</h4><span>同一11月10日起通道停运窗口；点击选择方案</span></div><div ref="planElement" class="risk-chart" role="img" aria-label="不同采购数量与交期安排在同一条件下的最大缺料量柱状图"></div><p class="axis-note"><b>横轴：</b>采购数量与到货安排组成的方案；<b>纵轴：</b>同一条件下最大缺料量（tU）。柱高来自模型，0缺口方案还须核验期末40 tU目标。</p><div class="computed-recommendation"><b>{{ recommendation.title }}</b><p>{{ recommendation.text }}</p></div></section>
    </div>
    <div class="table-scroll"><table><thead><tr><th>采购方案</th><th>新增总量</th><th>新增批次／计划可用日</th><th>最大缺料</th><th>首次缺料／持续</th><th>期末库存／目标</th><th></th></tr></thead><tbody><tr v-for="plan in currentCase.plans" :key="plan.id" :class="{selected:plan.id===selectedPlanId}"><th>{{ plan.label }}</th><td>{{ number(plan.new_quantity) }} tU</td><td>{{ schedule(plan) }}</td><td>{{ number(plan.maximum_gap) }} tU</td><td>{{ plan.first_shortage || '无' }} / {{ plan.shortage_days }}天</td><td>{{ number(plan.closing_balance) }} tU · {{ plan.closing_target_met?'达标':'未达标' }}</td><td><button class="text-button" @click="selectedPlanId=plan.id;traceOpen=true">核对</button></td></tr></tbody></table></div>
    <details class="calculation-trace" :open="traceOpen" @toggle="traceOpen=$event.target.open"><summary>所选方案的订单、逐日计算及数据来源</summary><div class="trace-heading"><b>{{ selectedPlan.label }} · 顺延{{ boundedDelay }}天</b><span>最大缺料 {{ number(selectedPlan.maximum_gap) }} tU · 缺料面积 {{ number(selectedPlan.backlog_area) }} tU·日</span></div><code>{{ library.metric.formula }}</code><div class="table-scroll"><table><thead><tr><th>订单</th><th>数量</th><th>计划可用日</th><th>检验后可用日</th><th>受本次事件影响</th></tr></thead><tbody><tr v-for="order in selectedPlan.receipts" :key="order.id"><th>{{ order.label }}</th><td>{{ number(order.quantity) }} tU</td><td>{{ order.planned_date }}</td><td>{{ order.date }}</td><td>{{ order.affected?'是':'否' }}</td></tr></tbody></table></div><p v-if="selectedPlan.id==='frontload130'" class="small-note">模型反求前置量下界 {{ number(selectedPlan.frontload_lower_bound,4) }} tU，展示为 {{ number(selectedPlan.frontload_quantity) }} tU；从11月10日新单调出同量，总新增仍130 tU。{{ library.provenance.frontload_note }}</p><details><summary>展开70天台账</summary><div class="ledger-scroll"><table><thead><tr><th>日期</th><th>当日到货tU</th><th>当日需求tU</th><th>日末净库存tU</th><th>累计欠料tU</th></tr></thead><tbody><tr v-for="day in dailyRows" :key="day.date"><td>{{ day.date }}</td><td>{{ number(day.receipt) }}</td><td>{{ number(day.demand,4) }}</td><td>{{ number(day.net_balance) }}</td><td>{{ number(day.unmet_demand) }}</td></tr></tbody></table></div></details><p class="small-note">需求、库存、旧单日期及期末目标：{{ library.provenance.case_source }}。{{ library.provenance.plan_source }} {{ library.provenance.solver }}</p><a :href="library.provenance.model_source" target="_blank" rel="noopener noreferrer">离散事件方法依据 ↗</a></details>
    <details v-if="library.transport_evidence" class="transport-sources"><summary>公开运输数据与模型使用口径</summary><p class="small-note">{{ library.transport_evidence.summary }}</p><div class="table-scroll"><table><thead><tr><th>公开记录</th><th>观测值</th><th>统计期／方向</th><th>本案用途</th></tr></thead><tbody><tr v-for="record in library.transport_evidence.records" :key="record.id"><th><a :href="record.source_url" target="_blank" rel="noopener noreferrer">{{ record.title }} ↗</a></th><td>{{ typeof record.value==='object'?JSON.stringify(record.value):record.value }} {{ record.unit }}</td><td>{{ record.period }}</td><td>{{ record.model_use }}</td></tr></tbody></table></div></details>
  </div>
</template>

<script setup>
import {ref,computed,watch,nextTick,onMounted,onUnmounted} from 'vue'
import * as echarts from 'echarts'
const props=defineProps({library:{type:Object,required:true}})
const root=ref(null),routeElement=ref(null),planElement=ref(null),delay=ref(props.library.default_delay_days),selectedPlanId=ref(props.library.default_plan),traceOpen=ref(false)
let routeChart,planChart,observer,alive=true
const number=(value,digits=2)=>value==null?'—':Number(value).toLocaleString('zh-CN',{maximumFractionDigits:digits})
const boundedDelay=computed(()=>Math.min(70,Math.max(0,Math.trunc(Number(delay.value)||0))))
const currentCase=computed(()=>props.library.cases[boundedDelay.value])
const selectedPlan=computed(()=>currentCase.value.plans.find(p=>p.id===selectedPlanId.value) || currentCase.value.plans[0])
const dailyRows=computed(()=>{
 let numerator=80*7
 return Array.from({length:70},(_,i)=>{
  const date=new Date(Date.UTC(2026,9,23)+i*86400000).toISOString().slice(0,10)
  const receipt=selectedPlan.value.receipts.filter(r=>r.date===date).reduce((sum,r)=>sum+Number(r.quantity),0)
  numerator+=receipt*7-24
  return {date,receipt,demand:24/7,net_balance:numerator/7,unmet_demand:Math.max(0,-numerator/7)}
 })
})
const schedule=plan=>plan.new_receipts.length?plan.new_receipts.map(r=>`${number(r.quantity)} tU / ${r.date.slice(5)}`).join('；'):'—'
const recommendation=computed(()=>{
 const original=currentCase.value.plans.find(p=>p.id==='staged130'),front=currentCase.value.plans.find(p=>p.id==='frontload130')
 const feasible=currentCase.value.plans.filter(p=>p.maximum_gap<1e-8&&p.closing_target_met),minimum=Math.min(...feasible.map(p=>p.new_quantity))
 if(!feasible.length)return {title:'本条件下，已比较方案均未同时满足两项库存约束',text:'应重新确认旧单交期、可用到货或需求安排；单看一根0缺口柱不能代替期末目标核验。'}
 if(original.maximum_gap<1e-8)return {title:`本条件下，130 tU原分批方案无阶段缺料且期末达标`,text:`已比较的可行方案中最小新增总量为${number(minimum)} tU。增加到160 tU并非物料平衡所必需；此处不比较缺少报价支持的经济成本。`}
 return {title:`同样新增130 tU，前置${number(front.frontload_quantity)} tU可将最大缺料从${number(original.maximum_gap)}降至${number(front.maximum_gap)} tU`,text:`这是模型反求的目标安排：${schedule(front)}。${front.closing_target_met?'期末仍为40 tU。':'期末尚未达40 tU。'}前置量从原首批调出，交货窗口需落实后再执行。`}
})
const axisLabel=plan=>({
 no_new:'不新增\n0 tU',qty80:'80 tU\n70＋10',qty100:'100 tU\n70＋30',qty120:'120 tU\n70＋50',
 staged130:'130 tU\n70＋60',qty140:'140 tU\n70＋70',qty160:'160 tU\n100＋60',once130:'130 tU\n一次到货',
 split30:'130 tU\n30＋100',split50:'130 tU\n50＋80',split90:'130 tU\n90＋40',split110:'130 tU\n110＋20',
 early05:'130 tU\n首批11/05',early09:'130 tU\n首批11/09',late20:'130 tU\n首批11/20',late01:'130 tU\n首批12/01',
 three_batches:'130 tU\n40＋40＋50',frontload130:`130 tU\n前置${number(plan.frontload_quantity)}`
 })[plan.id] || plan.label

function tooltipPlan(plan){return `${plan.label}<br/>模型：DES逐日履约模型<br/>最大缺料：${number(plan.maximum_gap)} tU<br/>首次缺料：${plan.first_shortage || '无'}；持续${plan.shortage_days}天<br/>期末净库存：${number(plan.closing_balance)} tU（${plan.closing_target_met?'达标':'未达标'}）<br/>新增安排：${schedule(plan)}`}
async function render(){
 await nextTick();if(!alive||!routeElement.value||!planElement.value)return
 routeChart ||= echarts.init(routeElement.value);planChart ||= echarts.init(planElement.value)
 const plans=currentCase.value.plans,maximum=Math.max(10,Math.ceil(Math.max(...plans.map(p=>p.maximum_gap))/10)*10)
 const yAxis={type:'value',min:0,max:maximum,name:'最大缺料量（tU）',axisLabel:{fontSize:11},splitLine:{lineStyle:{color:'#edf1f6'}}}
 const impacts=selectedPlan.value.risk_impacts || [],scopes=props.library.risk_scopes || []
 routeChart.setOption({animation:false,grid:{left:62,right:24,top:46,bottom:64},tooltip:{trigger:'item',confine:true,formatter:p=>{
  const impact=impacts[p.dataIndex],scope=scopes[p.dataIndex]
  return `${scope.label}<br/>${scope.definition}<br/>最大缺料：${number(impact.maximum_gap)} tU<br/>首次缺料：${impact.first_shortage || '无'}；持续${impact.shortage_days}天<br/>受影响货量：${number(impact.affected_quantity)} tU<br/>${!impact.applicable?'此方案无该范围受影响订单':'计算基于所列受阻条件'}`
 }},xAxis:{type:'category',data:scopes.map(s=>s.axis_label),axisLabel:{fontSize:11,interval:0,lineHeight:17}},yAxis:{...yAxis,max:Math.max(10,Math.ceil(Math.max(0,...impacts.map(r=>r.maximum_gap))/10)*10)},series:[{name:'DES条件后果',type:'bar',barMaxWidth:48,data:impacts.map(r=>r.applicable?r.maximum_gap:null),itemStyle:{color:'#2966b9',borderRadius:[3,3,0,0]},label:{show:true,position:'top',fontSize:11,color:'#335c8f',formatter:p=>number(p.value)}}]},true)

 planChart.setOption({animation:false,grid:{left:54,right:15,top:46,bottom:70},tooltip:{trigger:'item',confine:true,formatter:p=>tooltipPlan(plans[p.dataIndex])},xAxis:{type:'category',data:plans.map(axisLabel),axisLabel:{fontSize:11,interval:0,lineHeight:17}},yAxis,series:[{name:'DES逐日履约模型',type:'bar',barMaxWidth:34,data:plans.map(p=>({value:p.maximum_gap,itemStyle:{color:p.id===selectedPlanId.value?'#1f5aa5':'#89addc',borderRadius:[4,4,0,0]}})),label:{show:true,position:'top',fontSize:12,color:'#335c8f',formatter:p=>number(p.value)}}]},true)
 routeChart.off('click');routeChart.on('click',()=>{traceOpen.value=true})
 planChart.off('click');planChart.on('click',p=>{if(p.componentType==='series'){selectedPlanId.value=plans[p.dataIndex].id;traceOpen.value=true}})
 routeChart.resize();planChart.resize()
}
watch([boundedDelay,selectedPlanId,()=>props.library],render)
onMounted(()=>{observer=new ResizeObserver(()=>{routeChart?.resize();planChart?.resize()});observer.observe(root.value);render()})
onUnmounted(()=>{alive=false;observer?.disconnect();routeChart?.dispose();planChart?.dispose()})
</script>

<style scoped>
.procurement-risk-results{color:#304963;min-width:0}.results-heading,.plot-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.results-heading h3{font-size:16px;margin:0 0 6px}.results-heading p,.plot-heading>span{font-size:11px;color:#7b8da3;margin:0;line-height:1.8}.model-badge{font-size:11px;padding:5px 9px;border:1px solid #d7e4f5;color:#47749d;background:#f5f9fd;border-radius:4px;white-space:nowrap}.condition-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 0;margin:8px 0 0;border-bottom:1px solid #e7edf5}.condition-bar label{font-size:12px;color:#59718e}.condition-bar input,.condition-bar select{font:inherit;padding:5px 7px;border:1px solid #cedceb;border-radius:4px;color:#345b84;background:#fff}.condition-bar input{width:54px}.condition-bar button,.text-button{font:inherit;font-size:11px;color:#376fae;background:#fff;border:1px solid #d9e4f2;border-radius:4px;padding:5px 8px;cursor:pointer}.small-note,.axis-note{font-size:11px;color:#7b8da3;line-height:1.85;margin:8px 0}.chart-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;margin-top:16px}.plot-panel{min-width:0}.plot-panel+section{border-top:1px solid #e7edf5;padding-top:16px}.plot-heading{min-height:32px;align-items:baseline}.plot-heading h4{font-size:14px;margin:0}.risk-chart{height:305px;width:100%}.route-evidence{font-size:11px;line-height:1.8;border-top:1px solid #e7edf5;padding-top:9px}.route-evidence b{font-size:12px;font-weight:500}.route-evidence p{color:#7b8da3;margin:5px 0}.route-evidence .text-button{display:block;margin-top:7px}.computed-recommendation{border-left:3px solid #5687bf;background:#f5f8fc;padding:9px 12px;margin-top:10px;font-size:12px;line-height:1.85}.computed-recommendation p{font-size:11px;color:#6c83a0;margin:4px 0 0}.table-scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:12px;line-height:1.75;min-width:780px;margin-top:14px}th,td{text-align:left;padding:8px 9px;border-bottom:1px solid #e8edf4;vertical-align:top}thead{background:#f6f8fb;color:#768aa5}tbody th{font-weight:500}.selected{background:#f0f5fc}a{font-size:11px;color:#3971ab}.text-button{border:0;padding:0;background:transparent}details{font-size:12px;color:#6f839d;line-height:1.9;margin-top:14px}.trace-heading{display:flex;gap:15px;justify-content:space-between;flex-wrap:wrap;margin:12px 0 8px;color:#486788}.trace-heading span{font-size:11px}code{display:block;background:#f4f7fb;padding:7px 9px;font:11px/1.8 Consolas,monospace;color:#4c7096;overflow-wrap:anywhere}.ledger-scroll{max-height:280px;overflow:auto}.ledger-scroll table{min-width:620px}.calculation-trace{border-top:1px solid #e7edf5;padding-top:10px}button:focus-visible{outline:2px solid #83afe9;outline-offset:2px}@media(max-width:1000px){.chart-grid{grid-template-columns:1fr}.plot-panel+section{border-left:0;padding-left:0;border-top:1px solid #e7edf5;padding-top:16px}.risk-chart{height:260px}}@media(max-width:750px){.results-heading{align-items:flex-start;flex-direction:column}.condition-bar{align-items:flex-start;flex-direction:column}.plot-heading{flex-wrap:wrap}}
</style>
