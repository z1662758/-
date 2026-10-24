<template>
  <div ref="root" class="advanced-judgment" v-loading="loading">
    <template v-if="data">
      <section class="model-workbench">
        <div class="picker-heading"><b>全球供应压力 · 五种已估计模型</b><span>{{ data.manifest.observations }}个月真实观测 · 数据估计参数 · 时间顺序回测</span></div>
        <p class="target-note">共同预测目标：{{ data.target }}。本案将其用于外部环境研判，供应交付与每日库存另按合同和明确情景计算。</p>
        <div class="model-options" role="group" aria-label="五种宏观供应压力辅助模型"><button v-for="(model,i) in data.models" :key="model.id" type="button" :class="{active:pending===model.id}" :aria-pressed="pending===model.id" @click="pending=model.id"><span class="model-no">MODEL 0{{ i+1 }} · {{ model.kind }}</span><strong>{{ model.label }}</strong><small>{{ model.description }}</small><span class="model-tag">{{ model.status==='success' ? '已完成估计与回测' : '计算不可用' }}</span></button></div>
        <div class="run-row"><el-button type="primary" :disabled="pendingModel?.status!=='success'" @click="runModel">运行所选模型</el-button><span>{{ pending!==selected ? '点击运行后切换过程与输出，保留完整多模型对照。' : '已载入案例计算结果，点击可立即展示。' }}</span></div>
        <template v-if="selectedModel">
          <div class="report-heading"><div><span class="eyebrow">ESTIMATED MODEL · {{ selectedModel.point_type }}</span><h3>{{ selectedModel.label }}</h3></div><span class="data-badge">{{ data.manifest.sample_start }}—{{ data.manifest.sample_end }}</span></div>
          <div class="calculation-steps">
            <section><span class="step-index">01</span><h4>观测与特征设计</h4><p>{{ data.manifest.observations }}个月，{{ data.manifest.features.length }}个观测变量，缺失值{{ data.manifest.missing_values }}个。</p><ul><li v-for="feature in data.manifest.features" :key="feature">{{ feature }}</li></ul><p>{{ data.manifest.transforms }}</p><p><b>本模型设计维度</b><br>{{ designSummary }}</p><div class="table-scroll"><table><thead><tr><th>最新输入（月）</th><th>模型输入值</th></tr></thead><tbody><tr v-for="(feature,i) in data.manifest.features" :key="feature"><td>{{ feature }}</td><td>{{ number(data.feature_values.at(-1)?.[i]) }}</td></tr></tbody></table></div><p>上述值为变换后输入；铀价滞后2个月。MS-AR仅使用GSCPI序列，其余变量为其他模型的输入。</p></section>
            <section><span class="step-index">02</span><h4>模型与求解</h4><p>{{ selectedModel.definition }}</p><code v-for="formula in selectedModel.formulas" :key="formula">{{ formula }}</code><div class="source-links"><a :href="selectedModel.source" target="_blank" rel="noopener noreferrer">方法依据 ↗</a><a :href="selectedModel.implementation_source" target="_blank" rel="noopener noreferrer">实现文档 ↗</a></div></section>
            <section><span class="step-index">03</span><h4>本次输出</h4><div class="output-value"><span>2026Q4压力指数均值</span><strong>{{ number(quarterMean(selectedModel)) }}</strong><small>{{ modelDirection(selectedModel) }} · 相对2026年9月</small></div><p>滚动验证RMSE：{{ number(selectedModel.validation?.rmse) }}；有效起点：{{ selectedModel.validation?.folds }}个，每次预测3个月。</p><p>该模型输出{{ selectedModel.point_type }}；正值代表高于指数长期平均水平。</p><dl class="output-details"><div><dt>时间顺序验证MAE</dt><dd>{{ number(selectedModel.validation?.mae) }}</dd></div><div><dt>朴素基线RMSE</dt><dd>{{ number(selectedModel.validation?.naive_rmse) }}</dd></div><div><dt>相对基线误差</dt><dd>{{ selectedModel.validation?.rmse<selectedModel.validation?.naive_rmse?'较低':'较高；不应视为已证明优于基线' }}</dd></div><div><dt>方向判断正确率（回测）</dt><dd>{{ selectedModel.validation?.direction_accuracy==null?'—':number(100*selectedModel.validation.direction_accuracy)+'%' }}</dd></div><div v-if="selectedModel.lower"><dt>Q4首月区间／分位数带</dt><dd>{{ number(selectedModel.lower[0]) }}—{{ number(selectedModel.upper[0]) }}</dd></div></dl></section>
          </div>
          <details class="model-parameters"><summary>查看全部估计参数、12个月逐月输出与验证记录</summary><div class="parameter-grid"><pre>{{ JSON.stringify({parameters:selectedModel.details,validation:selectedModel.validation},null,2) }}</pre><div class="table-scroll"><table><thead><tr><th>月份</th><th>模型值</th><th>下界</th><th>上界</th></tr></thead><tbody><tr v-for="(month,i) in data.forecast_dates" :key="month"><td>{{ month }}</td><td>{{ number(selectedModel.values?.[i]) }}</td><td>{{ number(selectedModel.lower?.[i]) }}</td><td>{{ number(selectedModel.upper?.[i]) }}</td></tr></tbody></table></div></div></details>
        </template>
      </section>
      
      <section class="results-card">
        <div class="plot-heading"><div><h3>五种模型 · 供应压力趋势对照</h3><p>同一预测起点、同一目标与单位；虚线为模型外推，着色区域为本案2026Q4</p></div><span class="data-badge">{{ consensus.label }}</span></div>
        <div ref="curveElement" class="comparison-chart" role="img" aria-label="五种专业模型供应链压力研判曲线"></div><p class="gscpi-axis-note">纵轴为全球供应链压力指数（GSCPI），单位为标准差：0为历史均值，1表示高出历史均值1个标准差，负值表示低于均值；不是本次采购的缺料量或断供概率。来源：<a href="https://www.newyorkfed.org/research/policy/gscpi" target="_blank" rel="noopener noreferrer">纽约联储原始指数</a>；<a href="https://libertystreeteconomics.newyorkfed.org/2022/01/a-new-barometer-of-global-supply-chain-pressures/" target="_blank" rel="noopener noreferrer">编制方法</a>综合运输成本与PMI交期、积压订单、库存等指标，剔除需求影响后提取共同成分。历史线为已发布指数，虚线为本平台模型外推。</p>
        <p class="consensus-text">{{ consensus.text }}</p>
        <div class="plot-heading"><div><h3>2026Q4 · 各模型压力均值</h3><p>直接展示计算值；柱高不表示哈萨克斯坦断供概率</p></div></div>
        <div ref="barElement" class="quarter-chart" role="img" aria-label="第四季度模型压力均值柱状图"></div>
        <details class="validation-details"><summary>查看回测与数据来源</summary><div class="table-scroll"><table><thead><tr><th>模型</th><th>有效起点</th><th>MAE</th><th>RMSE</th><th>朴素基线RMSE</th></tr></thead><tbody><tr v-for="model in successfulModels" :key="model.id"><th>{{ model.label }}</th><td>{{ model.validation.folds }}</td><td>{{ number(model.validation.mae) }}</td><td>{{ number(model.validation.rmse) }}</td><td>{{ number(model.validation.naive_rmse) }}</td></tr></tbody></table></div><p>{{ data.validation_note }}未收敛的回测起点不计入指标；有效起点不同的模型不能仅凭RMSE直接排名。</p><p v-for="source in data.manifest.sources" :key="source.url"><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.publisher }} ↗</a> · 获取日期 {{ source.retrieved_at }}</p></details>
        <p class="scope-note">{{ data.boundary }}</p>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref,computed,nextTick,onMounted,onUnmounted } from 'vue'
import * as echarts from 'echarts'
import request from '@/utils/request'
const props=defineProps({network:{type:Object,default:null},analysis:{type:Object,required:true}})
const root=ref(null),curveElement=ref(null),barElement=ref(null),data=ref(null),loading=ref(false),error=ref('')
const pending=ref('gaussian_dbn'),selected=ref('gaussian_dbn')
let curve,bar,observer,alive=true
const colors=['#2563eb','#7c3aed','#0891b2','#d97706','#db2777']
const number=value=>value==null || !Number.isFinite(Number(value))?'—':Number(value).toFixed(3)
const pendingModel=computed(()=>data.value?.models.find(model=>model.id===pending.value))
const selectedModel=computed(()=>data.value?.models.find(model=>model.id===selected.value && model.status==='success'))
const designSummary=computed(()=>{const m=selectedModel.value;if(!m)return '';const d=m.details;return m.id==='markov_ar'?`2个隐状态、1阶AR；估计转换矩阵、状态均值、方差和过滤概率；${d.simulation_draws}条预测路径。`:m.id==='dynamic_factor'?`4个指标、${d.factor_count}个动态因子；${d.parameter_count}个状态空间参数。`:m.id==='quantile_gbrt'?`4变量×3阶滞后及滚动统计；${d.trees}棵树、深度${d.tree_depth}；分别估计0.1/0.5/0.9分位数。`:`4个观测变量、${d.lags}阶滞后；目标方程${d.target_coefficient_count}个回归系数，另估计噪声与收缩精度。`})
const successfulModels=computed(()=>data.value?.models.filter(model=>model.status==='success'&&model.details?.status==='converged') || [])
const quarterMean=model=>{const values=(model?.values || []).filter((_,i)=>data.value?.case_context.target_window.includes(data.value.forecast_dates[i]));return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
const modelDirection=model=>{const mean=quarterMean(model),last=data.value?.observations.at(-1);if(mean==null||last==null)return '待核验';return Math.abs(mean-last)<.1?'基本持平':mean<last?'压力回落':'压力上升'}
const consensus=computed(()=>{
  const models=successfulModels.value;const counts={};models.forEach(model=>{const direction=modelDirection(model);counts[direction]=(counts[direction]||0)+1})
  const groups=Object.entries(counts).sort((a,b)=>b[1]-a[1]);if(!groups.length)return {label:'暂无可比模型',text:'暂缺可比较结果。'}
  const [direction,count]=groups[0],all=count===models.length
  return {label:all?`方向一致 · ${count}/${models.length}`:`存在分歧 · ${count}/${models.length}`,
    text:`相对最后观测月${data.value.dates.at(-1)}的${number(data.value.observations.at(-1))}，${count}种模型判断Q4${direction}（持平阈值为±0.1指数点）。${all?'方向一致，幅度仍有差异。':'其他模型判断不同，应对照其误差和假设。'}各模型共用历史资料，结论一致不等于当地交付已得到保障。`}
})
const networkSummary=computed(()=>{
  const net=props.network || data.value?.reference_assessment?.network
  if(!net)return []
  const routes=net.routes || [],nodes=net.metrics?.criticalNodes || net.critical_nodes || []
  const score=r=>Number(r.display_risk_score ?? r.riskScore ?? r.risk_score ?? 0)
  const highest=[...routes].sort((a,b)=>score(b)-score(a))[0]
  const focus=routes.find(r=>r.id==='kazakhstan')
  const relevant=nodes.filter(n=>(n.affected_routes || n.affectedRoutes || []).includes('kazakhstan')).slice(0,3)
  return [highest?`参考网络中，${highest.country || highest.id}的展示风险分最高，为${number(score(highest))}/100；${focus?`本案哈萨克斯坦路线为${number(score(focus))}/100。`:''}这是原有态势模型的风险评分，不能与上方供应压力指数混用。`:'',
    relevant.length?`本案关键节点包括${relevant.map(n=>n.name || n.node_id).join('、')}。应优先核验供方备货、口岸通行及验收可用日期，防止同一通道使两笔计划到货同时失效。`:'本案应重点核验哈萨克斯坦备货、中哈铁路口岸通行及验收环节。俄乌冲突的间接影响不代表中哈直达路线必然中断。',
    '本案为天然铀精矿U₃O₈、数量按tU计；参考网络中的其他铀商品贸易代理量不能直接作为本批精矿可交付量或铁路核定运力。'].filter(Boolean)
})
async function load(){loading.value=true;error.value='';try{const result=await request({url:'/SCnet/uraniumDecision/supply-judgment-models',method:'get'});if(!alive)return;if(!result.success)throw new Error(result.message || '专业研判结果不可用');data.value=result.data;await render()}catch(e){if(alive)error.value=e.message || '模型加载失败'}finally{if(alive)loading.value=false}}
async function runModel(){selected.value=pending.value;await render()}
async function render(){
  await nextTick();if(!curveElement.value||!barElement.value||!data.value)return
  curve ||= echarts.init(curveElement.value);bar ||= echarts.init(barElement.value)
  const lib=data.value,history=lib.observations.slice(-24),dates=lib.dates.slice(-24),axis=dates.concat(lib.forecast_dates),n=history.length
  const models=successfulModels.value
  const series=[{name:'GSCPI历史观测',type:'line',smooth:false,symbol:'circle',symbolSize:4,data:history.concat(Array(lib.forecast_dates.length).fill(null)),lineStyle:{color:'#263e5c',width:2.4},itemStyle:{color:'#263e5c'},
    markLine:{silent:true,symbol:'none',data:[{xAxis:dates.at(-1),label:{formatter:'观测截止'}},{yAxis:0,label:{formatter:'长期均值'}}],lineStyle:{color:'#a5b4c8',type:'dashed'}},
    markArea:{silent:true,itemStyle:{color:'rgba(37,99,235,.06)'},data:[[{name:'2026 Q4',xAxis:'2026-10'},{xAxis:'2026-12'}]]}},
    ...models.map((model,i)=>({name:model.label,type:'line',smooth:false,symbol:'circle',symbolSize:4,data:Array(n-1).fill(null).concat([history.at(-1)],model.values),lineStyle:{color:colors[i],width:model.id===selected.value?3.5:1.7,type:'dashed'},itemStyle:{color:colors[i]}}))]
  curve.setOption({animation:false,tooltip:{trigger:'axis',confine:true,valueFormatter:number},legend:{type:'scroll',top:6,textStyle:{fontSize:11}},grid:{left:65,right:28,top:58,bottom:65},
    xAxis:{type:'category',data:axis,axisLabel:{rotate:35,fontSize:10}},yAxis:{type:'value',name:'供应压力（标准差指数）',scale:true,splitLine:{lineStyle:{color:'#edf2f8'}}},series},true)
  bar.setOption({animation:false,tooltip:{trigger:'axis',axisPointer:{type:'shadow'},valueFormatter:number},grid:{left:65,right:28,top:40,bottom:65},xAxis:{type:'category',data:models.map(m=>m.label.split(' · ')[1]),axisLabel:{fontSize:11}},
    yAxis:{type:'value',name:'Q4均值',min:0},series:[{type:'bar',barMaxWidth:58,data:models.map((m,i)=>({value:quarterMean(m),itemStyle:{color:colors[i],borderRadius:[5,5,0,0]}})),label:{show:true,position:'top',formatter:p=>number(p.value)}}]},true)
  curve.resize();bar.resize()
}
onMounted(()=>{observer=new ResizeObserver(()=>{curve?.resize();bar?.resize()});if(root.value)observer.observe(root.value);data.value=props.analysis;render()})
onUnmounted(()=>{alive=false;observer?.disconnect();curve?.dispose();bar?.dispose()})
</script>

<style scoped>
.output-details{font-size:12px;line-height:1.8}.output-details>div{padding:8px 0;border-bottom:1px solid #e0e9f7}.output-details dt{color:#8395ad}.output-details dd{margin:3px 0;color:#3f6390}.advanced-judgment{color:#263d59;min-width:0}.stage-heading{display:flex;align-items:baseline;gap:14px;margin:26px 0 14px}.stage-heading b{font-size:17px;border-left:3px solid #397cf2;padding-left:10px}.stage-heading span{font-size:12px;color:#8192ac}.case-strip{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:22px 24px;background:linear-gradient(110deg,#eff6ff,#f7faff);border:1px solid #d8e7fc;border-radius:14px;margin-bottom:18px}.eyebrow{font-size:10px;letter-spacing:1.4px;color:#7193bd}.case-strip h3{font-size:18px;margin:10px 0}.case-strip p{font-size:12px;color:#7085a3;margin:0;line-height:1.9}.case-quantity{border-left:1px solid #dbe6f6;padding-left:26px;white-space:nowrap}.case-quantity>span{font-size:11px;color:#8192aa;display:block}.case-quantity strong{font-size:35px;color:#2664c1;display:block;margin-top:6px}.case-quantity small{font-size:14px}.model-workbench,.results-card{background:#fff;border:1px solid #dce6f3;border-radius:15px;padding:22px}.picker-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.picker-heading b{font-size:15px}.picker-heading span,.target-note{font-size:11px;color:#7b8fa9;line-height:1.9}.target-note{margin:10px 0 16px}.model-options{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.model-options button{display:flex;flex-direction:column;text-align:left;min-height:190px;background:#fff;border:1px solid #dce5f2;border-radius:10px;padding:14px;cursor:pointer;color:#304969;font:inherit}.model-options button.active{background:#f4f8ff;border:2px solid #4b84ed;padding:13px}.model-no{font-size:9px;color:#8a9ab2;line-height:1.7;margin-bottom:12px}.model-options strong{font-size:13px;line-height:1.7}.model-options small{font-size:11px;line-height:1.9;color:#7388a6;margin:8px 0}.model-tag{font-size:10px;color:#3c7bc4;margin-top:auto;padding-top:12px}.run-row{display:flex;gap:14px;align-items:center;margin:18px 0}.run-row>span{font-size:11px;color:#8493aa}.report-heading{display:flex;justify-content:space-between;align-items:center;margin:25px 0 16px;padding-top:22px;border-top:1px solid #edf2f8}.report-heading h3{font-size:17px;margin:9px 0 0}.data-badge{font-size:11px;white-space:nowrap;color:#3972b7;background:#eff6ff;border:1px solid #d3e5fe;padding:7px 12px;border-radius:20px}.calculation-steps{display:grid;grid-template-columns:1fr 1.45fr 1fr;gap:20px}.calculation-steps section{background:#f8fafe;border:1px solid #e7eef8;border-radius:10px;padding:18px;min-width:0}.step-index{font-size:10px;letter-spacing:2px;color:#93a9c4}.calculation-steps h4{font-size:14px;margin:8px 0 12px}.calculation-steps p,.calculation-steps li{font-size:12px;line-height:1.95;color:#607b9b}.calculation-steps ul{padding-left:16px}.calculation-steps code{display:block;margin:10px 0;padding:10px;background:#ecf2fb;font:11px/1.9 Consolas,monospace;color:#385e8b;overflow-wrap:anywhere}.source-links{display:flex;gap:14px}.source-links a,.validation-details a{font-size:11px;color:#3370be}.output-value{padding:14px;background:#eff5ff;border-radius:8px}.output-value span,.output-value small{font-size:11px;display:block;color:#7790b1}.output-value strong{font-size:35px;display:block;color:#2864b7;margin:8px 0}.model-parameters,.validation-details{font-size:12px;line-height:1.9;margin-top:18px;color:#7187a4}.parameter-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}pre{background:#f5f8fc;font-size:11px;padding:14px;overflow:auto;max-height:280px}.table-scroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap}th,td{text-align:left;padding:10px;border-bottom:1px solid #e8eef8}thead{background:#f5f8fe;color:#8092aa}tbody th{font-weight:500}.plot-heading{display:flex;justify-content:space-between;gap:16px;align-items:center}.plot-heading h3{font-size:16px;margin:0 0 8px}.plot-heading p{font-size:11px;color:#8192ac;margin:0;line-height:1.9}.comparison-chart{height:380px;width:100%;margin-top:12px}.quarter-chart{height:260px;width:100%}.consensus-text{font-size:13px;line-height:2;padding:14px 18px;background:#f2f7fe;border-left:3px solid #4b88e6;margin-bottom:26px}.decision-prose,.network-prose{padding-top:22px;margin-top:24px;border-top:1px solid #e8eef7}.decision-prose h3,.network-prose h3{font-size:16px}.decision-prose p,.network-prose p{font-size:14px;line-height:2.05;margin:12px 0}.scope-note{font-size:11px;color:#8494ab;line-height:1.9;margin:20px 0 0}.load-error{background:#fff7ed;padding:20px;color:#9a6344;font-size:13px}button:focus-visible{outline:3px solid #9ac1ff;outline-offset:3px}@media(max-width:1250px){.model-options{grid-template-columns:repeat(5,minmax(180px,1fr));overflow-x:auto;padding-bottom:8px}.calculation-steps{grid-template-columns:1fr}.model-options button{min-height:185px}}@media(max-width:700px){.stage-heading{align-items:flex-start;flex-direction:column;gap:8px}.case-strip,.plot-heading,.report-heading{align-items:flex-start;flex-direction:column}.case-quantity{border-left:0;padding-left:0}.model-workbench,.results-card{padding:16px}.picker-heading{align-items:flex-start;flex-direction:column}.parameter-grid{grid-template-columns:1fr}.run-row{align-items:flex-start;flex-direction:column}.comparison-chart{height:340px}}
.gscpi-axis-note{font-size:11px;line-height:1.85;color:#7c8da5;margin:8px 0}.gscpi-axis-note a{color:#4779af}
</style>
