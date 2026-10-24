<template>

  <div ref="root" class="advanced-judgment" v-loading="loading">

    

    <p v-if="error" class="load-error">{{ error }} <el-button @click="load">重新加载</el-button></p>

    <template v-if="data && core">

      <div class="stage-heading"><b>2. 研判过程</b></div>

      <section class="case-strip"><div><span class="eyebrow">PROCUREMENT DECISION · 2026.10.22</span><h3>{{ data.procurement_case.case.label }}</h3><p>剩余需求240 tU · 可用库存80 tU · 已签待到70 tU · 期末目标40 tU</p></div><div class="case-quantity"><span>物料平衡所需新增量</span><strong>130<small> tU</small></strong></div></section>

      <section class="card evidence" v-if="core.public_evidence">

        <div class="section-heading"><h3><span class="section-letter">A</span> 本次研判使用的数据</h3><span>已核验至 {{ core.public_evidence.as_of }} · 保留来源与统计口径</span></div>

        <details class="data-fold"><summary>展开查看本次使用的数据、统计口径和来源</summary><div class="evidence-grid"><article v-for="item in core.public_evidence.records" :key="item.id"><span class="eyebrow">{{ item.topic }} · {{ item.period }}</span><h4>{{ item.title }}</h4><strong>{{ item.value }} <small>{{ item.unit }}</small></strong><details class="evidence-explainer"><summary>统计口径</summary><p>{{ item.scope }}</p><p class="muted">{{ item.boundary }}</p></details><a :href="item.source_url" target="_blank" rel="noopener noreferrer">{{ item.source_publisher }} ↗</a></article></div>

          <details><summary>继续查看23条公开证据明细</summary><p>{{ core.public_evidence.note }}</p><div class="table-scroll"><table><thead><tr><th>数据／公告</th><th>数值</th><th>统计期</th><th>适用范围与限制</th></tr></thead><tbody><tr v-for="item in core.public_evidence.archive.records" :key="item.id"><th><a :href="item.source_url" target="_blank" rel="noopener noreferrer">{{ item.title }} ↗</a></th><td>{{ typeof item.value==='object'?JSON.stringify(item.value):item.value }} {{ item.unit }}</td><td>{{ item.period }}</td><td>{{ item.boundary }}</td></tr></tbody></table></div></details>
        </details>

      </section>

      <section v-if="core.independent_risk" class="card model-area"><div class="section-heading"><h3><span class="section-letter">B</span> 模型、公式与输出</h3><span>选择模型和情景，查看输入、公式、参数与本次输出</span></div><IndependentRiskDashboard :library="core.independent_risk" mode="process" v-model="replayContext" /></section>

      <details class="legacy-tools"><summary>展开原有下游采购优化结构与DES／FTA诊断</summary><section class="card">

        <div class="section-heading"><h3>下游决策工具 · 采购与履约</h3><span>这些工具不计作五个全链条态势研判模型</span></div>

        <p class="note">专业模型需要可追溯的业务输入。成本优化缺少企业参数时展示完整结构与缺项，不以任意权重生成“最优方案”；履约诊断直接使用本案例计算。</p>

        <div class="model-options" role="group" aria-label="采购与履约研判模型"><button v-for="(model,i) in core.models" :key="model.id" :class="{active:pending===model.id}" :aria-pressed="pending===model.id" @click="selectModel(model.id)"><span class="eyebrow">MODEL 0{{ i+1 }}</span><strong>{{ model.label }}</strong><small>{{ model.kind }}</small><span class="state" :class="{waiting:model.status!=='computed'}">{{ model.status==='computed'?'案例已计算':'待真实合同参数' }}</span></button></div>

        <p class="switch-note">点击模型切换过程与输出；第三步用已完成的DES履约模型计算路径与采购方案的风险后果，FTA另解释失效组合。</p>

        <template v-if="selectedModel">

          <div class="section-heading selected-heading"><div><span class="eyebrow">{{ selectedModel.status==='computed'?'COMPUTED CASE ANALYSIS':'MODEL STRUCTURE · INPUTS REQUIRED' }}</span><h3>{{ selectedModel.label }}</h3></div><span class="badge">{{ selectedModel.status==='computed'?'基于本案逐日计算':'尚未运行经济优化' }}</span></div>

          <div class="calculation-steps" :class="{'fta-process':selected==='failure'}"><section><span class="step-index">01 · INPUT</span><h4>实际使用的输入</h4><template v-if="selected==='failure'"><dl class="order-inputs"><div v-for="order in core.orders" :key="order.id"><dt>{{ order.label }}</dt><dd>{{ order.quantity }} tU · {{ order.date.slice(5) }}</dd></div></dl><p>期初80 tU · 剩余需求240 tU / 70天 · 期末目标40 tU。当天先入库再扣料。</p><p>基本事件为各单顺延{{ boundedDelay }}天；穷举15种非空组合，判断是否出现任一天欠料。</p></template><template v-else><ul><li v-for="item in selectedModel.input_scope" :key="item">{{ item }}</li></ul><p>{{ selectedModel.status==='computed'?'全部数量按tU计量；原70＋60方案是待检验建议，交期尚须供方确认。':'130 tU及库存约束可由现有案例构建，合同经济参数不可由宏观指标替代。' }}</p></template></section><section><span class="step-index">02 · FORMULATION</span><h4>模型定义与计算关系</h4><p>{{ selectedModel.definition }}</p><code v-for="formula in selectedModel.formulas" :key="formula">{{ formula }}</code><a :href="selectedModel.source" target="_blank" rel="noopener noreferrer">方法／实现依据 ↗</a></section></div>

          <template v-if="selectedModel.status==='computed'">

            <div class="section-heading output-heading"><h4>03 · 多项输出</h4><span>{{ selected==='failure'?'输出随延迟坐标实时更新':'库存与交期边界' }}</span></div>

            <div class="output-grid"><article v-for="output in modelOutputs" :key="output.name"><span>{{ output.name }}</span><strong>{{ number(output.value) }}<small>{{ output.unit }}</small></strong></article></div>

            <div v-if="selected==='simulation'" class="table-scroll"><h4>各订单／组合的临界顺延天数</h4><table><thead><tr><th>检验对象</th><th>不出现阶段欠料</th><th>仍满足期末40 tU</th><th>首个欠料幅度</th><th>该幅度的首欠日期</th></tr></thead><tbody><tr v-for="group in core.boundaries" :key="group.id"><th>{{ group.label }}</th><td>{{ group.no_shortage_right_censored?'≥':'' }}{{ group.max_no_shortage_delay }}天</td><td>{{ group.max_target_met_delay }}天</td><td>{{ group.first_failure?group.first_failure.delay_days+'天':'扫描范围内未触发' }}</td><td>{{ group.first_failure?.first_shortage || '—' }}</td></tr></tbody></table><p class="note">单独检验时其余订单均按期；共同顺延只改变该组订单。期末目标与阶段无欠料是两项不同约束。</p></div>

            <div v-else class="failure-panel">

              <div class="section-heading"><h4>故障树逻辑与最小失效组合</h4><label>受影响订单各顺延 <input v-model.number="delay" aria-label="故障组合顺延天数" type="number" min="1" max="70"> 天</label></div>

              <p class="note">先选延迟幅度，再检验4笔订单的15种非空组合。AND表示该组事件同时发生，OR表示任一组合足以导致顶事件；不涉及事故概率。</p>

              <div v-if="selectedFault?.minimal_failure_sets.length" class="fault-tree" aria-label="当前延迟幅度的故障树最小失效逻辑">

                <div class="top-event">顶事件 · 季度内至少一天出现欠料</div><div class="gate-label">{{ selectedFault.minimal_failure_sets.length>1?'OR · 任一组合触发':'由以下最小组合触发' }}</div>

                <div class="fault-branches"><div v-for="(row,i) in selectedFault.minimal_failure_sets" :key="row.events.join()" class="fault-branch"><div class="branch-gate">{{ row.events.length>1?'AND · 同时发生':'基本事件' }}</div><div class="event-leaves"><span v-for="label in row.labels" :key="label">{{ label }}顺延{{ boundedDelay }}天</span></div><p>首欠 {{ row.first_shortage }} · {{ row.shortage_days }}天欠料</p></div></div>

              </div><p v-else class="no-failure">此延迟幅度下，15种组合均未触发阶段性欠料。</p>

              <div class="table-scroll"><table><thead><tr><th>最小失效组合</th><th>首次欠料</th><th>欠料天数</th><th>最大缺口（tU）</th><th>缺料面积（tU·日）</th></tr></thead><tbody><tr v-for="row in selectedFault?.minimal_failure_sets || []" :key="row.events.join()"><th>{{ row.labels.join(' ＋ ') }}</th><td>{{ row.first_shortage }}</td><td>{{ row.shortage_days }}</td><td>{{ number(row.maximum_gap) }}</td><td>{{ number(row.backlog_area) }}</td></tr></tbody></table></div>

              <details><summary>全部15条组合记录与最小性核验</summary><div class="table-scroll"><table><thead><tr><th>顺延事件</th><th>首次欠料</th><th>欠料天数</th><th>最大缺口（tU）</th><th>是否最小组合</th></tr></thead><tbody><tr v-for="row in selectedFault?.tests || []" :key="row.events.join()"><td>{{ row.labels.join('＋') }}</td><td>{{ row.first_shortage || '无' }}</td><td>{{ row.shortage_days }}</td><td>{{ number(row.maximum_gap) }}</td><td>{{ selectedFault.minimal_failure_sets.some(set=>set.events.join()===row.events.join())?'是':row.first_shortage?'否，含更小失效组合':'未触发' }}</td></tr></tbody></table></div><p class="note">已预计算1—70天，每个幅度15个组合。路径数量仅作计算追溯，不作为研判结论。</p></details>

            </div>

            <details v-if="selected==='simulation'" class="inventory-diagnostic" @toggle="render"><summary>展开DES逐日库存回放（订单条件对照）</summary>        <div class="section-heading"><div><h3>库存路径回放 · 查看临界值附近发生了什么</h3><p>净余额小于0表示累计欠料；实物库存不会为负。</p></div><div class="controls"><select v-model="replayGroup" aria-label="库存回放订单组合"><option v-for="group in core.boundaries" :key="group.id" :value="group.id">{{ group.label }}</option></select><label>顺延 <input v-model.number="replayDelay" type="number" min="0" max="70" aria-label="库存回放顺延天数"> 天</label></div></div>

        <div ref="inventoryElement" class="chart inventory-chart" role="img" aria-label="正常交付与所选顺延条件的逐日库存对照"></div>

        <div class="output-grid replay-metrics"><article><span>首个欠料日期</span><strong class="text-value">{{ replayMetrics.first_shortage || '无' }}</strong></article><article><span>最大缺口</span><strong>{{ number(replayMetrics.maximum_gap) }}<small>tU</small></strong></article><article><span>欠料持续</span><strong>{{ replayMetrics.shortage_days }}<small>天</small></strong></article><article><span>期末净库存</span><strong>{{ number(replayMetrics.closing_balance) }}<small>tU</small></strong></article></div>

</details>

          </template>

          <div v-else class="required-inputs"><h4>03 · 尚不能计算的经济输出与缺项</h4><p>批量／到货窗口最优解、采购现金流、持有与停料损失、最坏损失及CVaR需要以下真实参数。现在不展示虚构数值。</p><div class="table-scroll"><table><thead><tr><th>所需字段</th><th>作用</th><th>通常从哪里取得</th><th>为什么公开指标不能直接替代</th></tr></thead><tbody><tr v-for="item in selectedModel.required_inputs" :key="item.name"><th>{{ item.name }}</th><td>{{ item.reason }}</td><td>{{ item.provider }}</td><td>{{ item.public_substitute }}</td></tr></tbody></table></div><p class="note">{{ selectedModel.computed_constraint }} 这里展示的是待实例化模型结构，不是本案已完成求解的模型。</p></div>

        </template>

      </section></details>

      <section class="card macro-card"><div class="section-heading"><div><h3>辅助模型 · 五种宏观供应压力模型</h3><p>DBN、BVAR、MS-AR、DFM和QGBRT经过数据估计与时间顺序回测，目标是全球压力；属于研判过程，不直接输出本企业交付概率。</p></div><el-button @click="showMacro=!showMacro">{{ showMacro?'收起宏观模型':'展开宏观模型的输入、公式与输出' }}</el-button></div><MacroSupplyEvidence v-if="showMacro" :analysis="data" /></section>

      <div class="stage-heading"><b>3. 研判结果</b></div>

      <section class="card results-card">

        <IndependentRiskDashboard v-if="core.independent_risk" :library="core.independent_risk" mode="results" v-model="replayContext" />
        <ProcurementRiskResults v-else-if="core.decision_charts" :library="core.decision_charts" />

        <div class="decision-prose"><h3>案例决策 · 固定案例研讨报告</h3><p class="note">报告按固定案例基准形成，14天中断为条件检验；上方交互图按当前选择更新，供料量与价格敞口分别计算。</p><p v-for="paragraph in core.report" :key="paragraph">{{ paragraph }}</p></div>

        <div v-if="networkSummary.length" class="decision-prose"><h3>路线、关键节点与脆弱环节</h3><p v-for="paragraph in networkSummary" :key="paragraph">{{ paragraph }}</p></div>

        <p class="note">{{ core.boundary }}</p>

      </section>

    </template>

  </div>

</template>



<script setup>

import { ref,computed,nextTick,watch,onMounted,onUnmounted } from 'vue'

import * as echarts from 'echarts'

import request from '@/utils/request'

import MacroSupplyEvidence from './MacroSupplyEvidence.vue'

import ProcurementRiskResults from './ProcurementRiskResults.vue'
import IndependentRiskDashboard from './IndependentRiskDashboard.vue'

const props=defineProps({network:{type:Object,default:null}})

const root=ref(null),data=ref(null),loading=ref(false),error=ref(''),pending=ref('failure'),selected=ref('failure'),showMacro=ref(false)

const replayContext=ref({eventId:'nominal',quantity:70,arrival:'2026-11-10',priceQuantity:130,horizon:3})

const inventoryElement=ref(null),replayGroup=ref('early_common'),replayDelay=ref(6),delay=ref(14)

let inventoryChart,observer,alive=true

const number=value=>value==null?'—':Number(value).toLocaleString('zh-CN',{maximumFractionDigits:2})

const core=computed(()=>data.value?.case_models)

const pendingModel=computed(()=>core.value?.models.find(m=>m.id===pending.value))

const selectedModel=computed(()=>core.value?.models.find(m=>m.id===selected.value))

const boundedDelay=computed(()=>Math.min(70,Math.max(1,Math.trunc(Number(delay.value)||1))))

const modelOutputs=computed(()=>selected.value==='failure'?[

 {name:'最小失效组合',value:selectedFault.value?.minimal_failure_sets.length || 0,unit:'组'},

 {name:'15种组合中最大缺口',value:Math.max(0,...(selectedFault.value?.tests || []).map(r=>r.maximum_gap)),unit:'tU'},

 {name:'15种组合中最长欠料',value:Math.max(0,...(selectedFault.value?.tests || []).map(r=>r.shortage_days)),unit:'天'},

 {name:'前段共同暴露量',value:100,unit:'tU；两笔同期到货'}

]:selectedModel.value?.outputs || [])

const selectedFault=computed(()=>core.value?.failure_scan[boundedDelay.value-1])

const replay=computed(()=>{

  if(!core.value)return []

  const group=core.value.boundaries.find(g=>g.id===replayGroup.value),d=Math.max(0,Math.min(70,Number(replayDelay.value)||0))

  const start=Date.parse('2026-10-23T00:00:00Z'),dayMs=86400000

  const receipts=core.value.orders.map(row=>({...row,date:group.orders.includes(row.id)?new Date(Date.parse(row.date+'T00:00:00Z')+d*dayMs).toISOString().slice(0,10):row.date}))

  // Integer numerators preserve the exact daily 24/7 tU balance at all dates.

  let numerator=80*7

  return Array.from({length:70},(_,i)=>{const date=new Date(start+i*dayMs).toISOString().slice(0,10);numerator+=7*receipts.filter(r=>r.date===date).reduce((sum,r)=>sum+r.quantity,0)-24;return {date,net_balance:numerator/7}})

})

const replayMetrics=computed(()=>{const rows=replay.value,negative=rows.filter(r=>r.net_balance<0);return {first_shortage:negative[0]?.date,shortage_days:negative.length,maximum_gap:Math.max(0,...rows.map(r=>-r.net_balance)),closing_balance:rows.at(-1)?.net_balance}})

const networkSummary=computed(()=>[
 '公开公司披露可确认哈萨克斯坦天然铀产品经铁路交付阿拉山口。本组只对这条已核实通路的事件作用进行案例检验，未创建未经核实的霍尔果斯替代铀货路线。',
 '应重点核验供方备货、政策许可、铁路通行和验收可用日期。历史矿山停产或厂区道路中断并不直接证明中哈铀货延误；上游库存与替代采购可能缓冲影响。'
])

async function load(){loading.value=true;error.value='';try{const response=await request({url:'/SCnet/uraniumDecision/supply-judgment-models',method:'get'});if(!alive)return;if(!response.success || !response.data?.case_models)throw new Error('案例研判输入与计算结果尚未就绪');data.value=response.data;await render()}catch(e){if(alive)error.value=e.message || '加载失败'}finally{if(alive)loading.value=false}}

async function runModel(){inventoryChart?.dispose();inventoryChart=null;selected.value=pending.value;await nextTick();await render()}

async function selectModel(id){pending.value=id;await runModel()}

async function render(){

 await nextTick();if(!alive||!core.value||!inventoryElement.value||!inventoryElement.value.clientWidth)return

 inventoryChart ||= echarts.init(inventoryElement.value)

 const nominal=core.value.nominal.daily

 inventoryChart.setOption({animation:false,tooltip:{trigger:'axis',confine:true,valueFormatter:v=>number(v)+' tU'},legend:{top:5},grid:{left:65,right:30,top:50,bottom:50},xAxis:{type:'category',data:nominal.map(r=>r.date),axisLabel:{formatter:v=>v.slice(5)}},yAxis:{type:'value',name:'日末净库存（tU）',splitLine:{lineStyle:{color:'#edf2f8'}}},series:[{name:'原方案按期交付',type:'line',smooth:false,showSymbol:false,data:nominal.map(r=>r.net_balance),lineStyle:{color:'#3f79d9',width:2},itemStyle:{color:'#3f79d9'}},{name:'所选订单顺延后',type:'line',smooth:false,showSymbol:false,data:replay.value.map(r=>r.net_balance),lineStyle:{color:'#e0526f',width:2.5},itemStyle:{color:'#e0526f'},markLine:{silent:true,symbol:'none',data:[{yAxis:0,label:{formatter:'欠料边界'}}],lineStyle:{color:'#a2afc1',type:'dashed'}}}]},true)

 inventoryChart.resize()

}

watch([replayGroup,replayDelay],render)

onMounted(()=>{observer=new ResizeObserver(()=>{inventoryChart?.resize()});if(root.value)observer.observe(root.value);load()})

onUnmounted(()=>{alive=false;observer?.disconnect();inventoryChart?.dispose()})

</script>



<style scoped>
.legacy-tools{font-size:12px;color:#7187a3;margin:12px 0;line-height:1.9}.legacy-tools>summary{cursor:pointer}.legacy-tools[open]>section{margin-top:10px}

.advanced-judgment{color:#263d59;min-width:0}.stage-heading{display:flex;align-items:baseline;gap:14px;margin:26px 0 14px}.stage-heading>b{font-size:17px;border-left:3px solid #397cf2;padding-left:10px}.stage-heading>span,.section-heading>span{font-size:12px;color:#8192ac}.case-strip{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:22px 24px;background:linear-gradient(110deg,#eff6ff,#f7faff);border:1px solid #d8e7fc;border-radius:14px;margin-bottom:18px}.eyebrow{font-size:10px;letter-spacing:1px;color:#7193bd}.case-strip h3{font-size:18px;margin:10px 0}.case-strip p{font-size:12px;color:#7085a3;margin:0;line-height:1.9}.case-quantity{border-left:1px solid #dbe6f6;padding-left:26px;white-space:nowrap}.case-quantity>span{font-size:11px;color:#8192aa;display:block}.case-quantity strong{font-size:35px;color:#2664c1;display:block;margin-top:6px}.case-quantity small{font-size:14px}.card{background:#fff;border:1px solid #dce6f3;border-radius:14px;padding:22px;margin-bottom:18px}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:16px}.section-heading h3{font-size:16px;margin:0}.section-heading h4{font-size:14px;margin:0}.section-heading p,.note{font-size:12px;line-height:1.9;color:#7388a4;margin:8px 0}.section-heading p{margin-bottom:0}.evidence-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.evidence-grid article{background:#f7faff;border:1px solid #e2ebf9;padding:16px;border-radius:10px;min-width:0}.evidence-grid h4{font-size:13px;margin:9px 0}.evidence-grid article>strong{display:block;font-size:20px;line-height:1.6;color:#2f609b}.evidence-grid strong small{font-size:11px;font-weight:400}.evidence-grid p{font-size:12px;line-height:1.85}.evidence-grid .muted{color:#7d8fa7}a{font-size:12px;color:#3370be}.table-scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:12px;line-height:1.8;min-width:760px}th,td{text-align:left;padding:12px 10px;border-bottom:1px solid #e8eef8;vertical-align:top}thead{background:#f5f8fe;color:#7489a5}tbody th{font-weight:500;color:#365779}td{color:#65809f}.origin{color:#3c73a7}.model-options{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:18px}.model-options button{display:flex;flex-direction:column;gap:12px;text-align:left;border:1px solid #dce5f2;border-radius:10px;padding:15px;min-height:172px;background:#fff;cursor:pointer;color:#304969;font:inherit}.model-options button.active{background:#f4f8ff;border:2px solid #4b84ed;padding:14px}.model-options strong{font-size:13px;line-height:1.8}.model-options small{font-size:11px;line-height:1.8;color:#7388a6}.state{font-size:10px;color:#16867d;margin-top:auto}.state.waiting{color:#967032}.run-row{display:flex;gap:14px;align-items:center;margin:18px 0}.run-row>span{font-size:11px;color:#8493aa}.selected-heading{padding-top:22px;margin-top:22px;border-top:1px solid #e7eef7}.selected-heading h3{margin-top:9px}.badge{font-size:11px;white-space:nowrap;color:#3972b7;background:#eff6ff;border:1px solid #d3e5fe;padding:7px 12px;border-radius:20px}.calculation-steps{display:grid;grid-template-columns:1fr 1.8fr;gap:18px}.calculation-steps section{background:#f8fafe;border:1px solid #e7eef8;border-radius:10px;padding:18px;min-width:0}.step-index{font-size:10px;letter-spacing:1px;color:#93a9c4}.calculation-steps h4{font-size:14px;margin:10px 0}.calculation-steps p,.calculation-steps li{font-size:12px;line-height:1.95;color:#607b9b}.calculation-steps ul{padding-left:16px}.calculation-steps code{display:block;margin:10px 0;padding:10px;background:#ecf2fb;font:12px/1.9 Consolas,monospace;color:#385e8b;overflow-wrap:anywhere}.output-heading{margin:22px 0 14px}.output-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:22px}.output-grid article{background:#f3f7fe;border:1px solid #e4ecf9;border-radius:9px;padding:16px}.output-grid article>span{font-size:12px;color:#758ca9;display:block}.output-grid strong{font-size:27px;color:#2e65aa;display:block;margin-top:10px}.output-grid small{font-size:11px;font-weight:400;display:block;color:#7389a5;line-height:1.8;margin-top:5px}.output-grid strong.text-value{font-size:22px}.table-scroll h4,.required-inputs h4{font-size:14px}.required-inputs{margin-top:22px}.required-inputs>p{font-size:12px;line-height:1.9;color:#7187a4}.failure-panel{padding-top:5px}.failure-row{display:flex;flex-direction:column;gap:8px;padding:14px 16px;background:#f6f9fd;border-left:3px solid #d2914e;margin:12px 0;font-size:12px;line-height:1.9}.failure-row span{color:#768ba7}details{font-size:12px;color:#7187a4;line-height:1.9;margin-top:16px}.controls{display:flex;gap:14px;align-items:center;font-size:12px;flex-wrap:wrap}select,input{font:inherit;color:#456582;border:1px solid #d8e4f4;border-radius:5px;padding:7px;background:#fff}input{width:64px}label{font-size:12px;color:#6c82a0}.chart{height:370px;width:100%}.inventory-chart{height:330px}.replay-metrics{grid-template-columns:repeat(4,minmax(0,1fr))}.decision-prose{padding-top:22px;margin-top:24px;border-top:1px solid #e8eef7}.decision-prose h3{font-size:16px}.decision-prose p{font-size:14px;line-height:2.05;margin:12px 0}.load-error{background:#fff7ed;padding:20px;color:#9a6344;font-size:13px}button:focus-visible{outline:3px solid #9ac1ff;outline-offset:3px}@media(max-width:1250px){.model-options{grid-template-columns:repeat(5,minmax(175px,1fr));overflow-x:auto;padding-bottom:8px}.calculation-steps{grid-template-columns:1fr}.evidence-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:750px){.case-strip,.section-heading,.stage-heading,.run-row{align-items:flex-start;flex-direction:column}.case-quantity{border:0;padding:0}.card{padding:16px}.evidence-grid,.output-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.chart{height:330px}}



/* Dense research workspace: content height follows content, rather than cards. */

.card{padding:14px 16px;border-radius:8px;margin-bottom:12px}.case-strip{padding:12px 16px;margin-bottom:12px;border-radius:8px}.case-strip h3{font-size:16px;margin:5px 0}.case-quantity strong{font-size:27px;margin-top:2px}.section-heading{margin-bottom:10px;gap:12px}.stage-heading{margin:18px 0 10px}.stage-heading>b{font-size:16px}.evidence-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:0;border-top:1px solid #e8eef5;border-bottom:1px solid #e8eef5}.evidence-grid article{padding:10px 12px;background:#fff;border:0;border-right:1px solid #e8eef5;border-radius:0}.evidence-grid article:last-child{border-right:0}.evidence-grid h4{font-size:12px;line-height:1.6;margin:5px 0}.evidence-grid article>strong{font-size:17px;line-height:1.6}.evidence-grid strong small{display:block;font-size:10px}.evidence-grid a{font-size:10px}.evidence-explainer{margin:5px 0;font-size:11px}.evidence-grid p{font-size:11px}.eyebrow{font-size:9px;letter-spacing:.5px}.model-options{margin-top:10px;gap:6px}.model-options button{min-height:0;gap:5px;padding:9px 11px;border-radius:5px}.model-options button.active{padding:8px 10px}.model-options strong{font-size:12px;line-height:1.55}.model-options small{line-height:1.5;font-size:11px}.state{padding-top:3px}.switch-note{font-size:11px;color:#7d8da3;margin:9px 0}.selected-heading{padding-top:12px;margin-top:12px}.selected-heading h3{margin-top:5px;font-size:15px}.calculation-steps{align-items:start;gap:14px;grid-template-columns:1fr 1.65fr}.calculation-steps section{padding:10px 12px;background:#fff;border:0;border-left:2px solid #e0e9f5;border-radius:0}.calculation-steps h4{margin:5px 0 8px;font-size:13px}.calculation-steps p,.calculation-steps li{font-size:12px;line-height:1.75;margin:5px 0}.calculation-steps code{padding:5px 8px;margin:5px 0;background:#f5f7fb;font-size:11px;line-height:1.8}.order-inputs{display:grid;grid-template-columns:1fr 1fr;gap:5px 12px;margin:8px 0}.order-inputs>div{display:flex;justify-content:space-between;gap:7px;font-size:12px;padding:5px 0;border-bottom:1px solid #eef1f5}.order-inputs dt{color:#536d8b}.order-inputs dd{margin:0;color:#2e527b;white-space:nowrap}.output-heading{margin:13px 0 7px}.output-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:0;margin-bottom:12px;border-top:1px solid #e6edf6;border-bottom:1px solid #e6edf6}.fta-process+.output-heading+.output-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.output-grid article{background:#fff;border:0;border-right:1px solid #e6edf6;border-radius:0;padding:9px 12px}.output-grid article:last-child{border-right:0}.output-grid article>span{font-size:11px}.output-grid strong{display:flex;align-items:baseline;gap:8px;font-size:22px;line-height:1.5;margin-top:3px}.output-grid small{display:inline;font-size:10px;margin:0}.output-grid strong.text-value{font-size:16px}.replay-metrics{grid-template-columns:repeat(4,minmax(0,1fr))}.note{font-size:11px;line-height:1.75;margin:5px 0}.failure-panel{padding-top:0}.fault-tree{margin:10px 0 12px;text-align:center;max-width:1050px}.top-event{display:inline-block;background:#f1f5fb;border:1px solid #b8cbe4;border-radius:4px;padding:6px 18px;font-size:12px;color:#345b88}.gate-label{font-size:10px;color:#8b7181;line-height:22px}.fault-branches{display:flex;gap:20px;justify-content:center;border-top:1px solid #d4deeb;padding-top:8px}.fault-branch{flex:1;max-width:500px;border-left:1px solid #d4deeb;padding-left:10px}.branch-gate{font-size:10px;color:#8b7181;margin-bottom:5px}.event-leaves{display:flex;gap:7px;justify-content:center;flex-wrap:wrap}.event-leaves span{font-size:11px;line-height:1.7;padding:4px 9px;border:1px solid #e1e7ef;background:#fafbfd;border-radius:3px}.fault-branch p{font-size:10px;color:#7c8ca1;margin:6px 0 0}.no-failure{font-size:12px;color:#397869;padding:12px;background:#f4faf7}table{line-height:1.65}th,td{padding:7px 9px}.failure-panel table{min-width:640px}.chart{height:250px}.decision-prose{margin-top:16px;padding-top:14px}.decision-prose p{font-size:13px;line-height:1.9;margin:8px 0}details{margin-top:9px}.inventory-diagnostic{margin-top:14px}.input-ledger{margin-top:0}.macro-card :deep(.model-options button){min-height:110px;padding:9px}.macro-card :deep(.model-workbench),.macro-card :deep(.results-card){padding:12px;border-radius:6px}.macro-card :deep(.calculation-steps){align-items:start}.macro-card :deep(.calculation-steps section){padding:12px}.macro-card :deep(.comparison-chart){height:260px}

@media(max-width:1250px){.evidence-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.evidence-grid article:nth-child(3){border-right:0}.model-options{grid-template-columns:repeat(5,minmax(150px,1fr))}.calculation-steps{grid-template-columns:1fr 1.4fr}.output-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:850px){.calculation-steps{grid-template-columns:1fr}.evidence-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.order-inputs{grid-template-columns:1fr}.output-grid,.fta-process+.output-heading+.output-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fault-branches{gap:8px}.event-leaves{flex-direction:column}}




/* Five stages use distinct structures on light surfaces. */
.advanced-judgment{padding-top:18px}.card{padding:22px;border-radius:12px;margin-bottom:0;border-color:#dce4ed;box-shadow:0 2px 6px #29456104;scroll-margin-top:18px}
.case-strip{background:#f0f5fb;border:1px solid #dae5f1;border-radius:10px;padding:18px 22px;margin-bottom:20px}.case-strip h3{color:#304e70}.case-quantity strong{color:#356ca8}
.section-letter{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;margin-right:9px;border-radius:9px;background:#fff4dc;color:#946d2e;font-size:15px;font-weight:600;flex-shrink:0}
.section-heading{align-items:center;margin-bottom:12px}.section-heading h3{display:flex;align-items:center;line-height:1.6}.section-heading>span{color:#60758c;line-height:1.8}.stage-purpose{font-size:13px;line-height:1.9;color:#60758b;margin:0 0 18px}
.evidence{border-top:3px solid #d6bb82}.evidence-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;border:0}.evidence-grid article{background:#fffdf8;border:1px solid #eee5d4;border-radius:8px;padding:14px 16px}.evidence-grid h4{font-size:13px}.evidence-grid article>strong{font-size:21px;color:#7e6538}.evidence-grid strong small{display:inline}.evidence-grid a{font-size:11px}
.case-ledger{background:#f7f9fc;border-left:3px solid #a2b1c5}.case-ledger .section-letter{background:#e9eef5;color:#586d88}.balance-line{display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:18px 20px;margin:14px 0;background:white;border:1px solid #e0e6ee;border-radius:8px;font-size:12px;color:#60728a}.balance-line b{display:block;font-size:23px;color:#3d536e;margin-top:5px;font-variant-numeric:tabular-nums}.balance-line i{font-style:normal;color:#9aaabc;font-size:18px}.balance-line>strong{margin-left:auto;padding:12px 16px;background:#edf4fc;border-radius:7px;color:#3e6da5;font-size:16px}.case-ledger .stage-purpose{margin-bottom:10px}
.model-area{border-top:3px solid #91b0dc}.model-area .section-letter{background:#eaf2fd;color:#4778b6}.model-area>.section-heading{border-bottom:1px solid #e4ebf5;padding-bottom:14px}.model-area::before,.results-card::before{content:none}
.results-card{border-top:3px solid #91bdab;background:#fcfefd}.results-card .section-letter{background:#e7f4ed;color:#397b60}.results-card>.section-heading{padding-bottom:14px;border-bottom:1px solid #deebe4}.decision-prose{padding:20px 22px;border:1px solid #dce9e0;border-left:3px solid #8eb49d;background:#fff;border-radius:8px}.decision-prose h3{color:#37614c}.decision-prose p{color:#4d6558}
.data-fold{margin-top:0;padding:13px 15px;border:1px solid #e7dcc8;border-radius:8px;background:#fffdf9}.data-fold>summary{font-size:13px;font-weight:500;color:#725d39}.data-fold[open]>.evidence-grid{margin-top:14px}.legacy-tools{border:1px dashed #d5dee8;padding:12px 16px;background:#f8fafc;border-radius:8px;margin-top:18px}.macro-card{margin-top:12px;background:#f8fafc}.macro-card .section-heading{margin-bottom:0}
@media(max-width:1000px){.evidence-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.balance-line{gap:10px}.balance-line>strong{margin-left:0}}
@media(max-width:750px){.card{padding:16px}.section-heading{align-items:flex-start;gap:8px}.balance-line{padding:12px;gap:10px}.balance-line>strong{width:100%;text-align:center}.evidence-grid{grid-template-columns:1fr}.case-strip{padding:16px}.decision-prose{padding:16px}}
</style>

