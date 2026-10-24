<template>

  <section ref="root" class="professional-forecast" v-loading="loading">

    <div class="section-heading"><div><span class="eyebrow">01 · 价格预测与模型检验</span><h2>从历史观测到模型判断</h2><p>天然铀精矿U₃O₈采购 · 月度价格方法对照</p></div><span v-if="library" class="data-badge">{{ library.years[0] }}–{{ library.years.at(-1) }} · {{ library.values.length }}个月 · 最新月末 {{ number(library.values.at(-1)) }} USD/lb</span></div>

    <div v-if="error" class="load-error">{{ error }} <el-button size="small" @click="load">重新加载</el-button></div>

    <template v-if="library">

      <div class="method-workspace"><nav class="method-tabs" aria-label="预测分析类型"><button v-for="(tab,i) in tabs" :key="tab.id" type="button" :class="{active:activeTab===tab.id}" :aria-pressed="activeTab===tab.id" @click="switchTab(tab.id)"><span>0{{ i+1 }}</span>{{ tab.label }}</button></nav>

      <div class="method-intro"><b>{{ currentTab.title }}</b><span>{{ currentTab.description }}</span></div>

      <div class="method-options" role="group" :aria-label="currentTab.title"><button v-for="model in options" :key="model.id" type="button" :class="{selected:selected[activeTab]===model.id}" :aria-pressed="selected[activeTab]===model.id" :title="model.description" @click="selected[activeTab]=model.id"><span class="method-type">{{ model.kind || currentTab.label }}</span><strong>{{ model.label }}</strong><span class="method-selected" aria-hidden="true">{{ selected[activeTab]===model.id ? '✓' : '' }}</span></button></div>

      <p class="selection-description">{{ options.find(m=>m.id===selected[activeTab])?.description }}</p><div class="generate-row"><el-button type="primary" @click="generate">展示模型预测</el-button><span>{{ selected[activeTab] !== generated[activeTab] ? '已选择新方法，点击生成后切换图形' : '案例已预计算 · 展示真实模型输出' }}</span></div>

      </div><template v-if="shown">

        <div class="forecast-results"><div class="plot-card"><div class="plot-heading"><div><h3>{{ shown.label }}</h3><p>{{ chartCaption }}</p></div><span>{{ shown.unit || library.unit }}</span></div><div ref="chartElement" class="model-chart" role="img" :aria-label="shown.label+'计算曲线'"></div><div class="plot-guide">{{ activeTab==='trend' ? '蓝色为历史实测，橙色为模型外推；历史占60%，预测占40%，分界两侧时间间距不同，请勿直接比较斜率。点预测可能平直，并不代表未来没有波动。' : activeTab==='turning' ? '识别历史变化，不生成虚构的未来拐点；不同方法分别识别极值、结构变化或异常累积。' : '周期图按其实际横轴展示：月份、候选周期或滞后月数。周期诊断不等同于确定的未来价格。' }}</div></div>

        <div v-if="activeTab==='trend'" class="forecast-summary"><div v-for="period in forecastPeriods" :key="period.label"><span>{{ period.label }}</span><strong>{{ number(periodMean(shown.values,period.start,period.end)) }}</strong><small>USD/lb · 月均值</small></div><p>2027–2028为中期探索；仅依赖历史价格，组合均值会抵消各模型波动。模型间差异不等同于预测区间。</p></div><details v-if="activeTab==='trend'" class="monthly-details"><summary>查看全部{{ library.trend.forecast.forecast_years.length }}个月的预测值</summary><div class="forecast-values"><span>逐月预测 · USD/lb</span><div v-for="(month,i) in library.trend.forecast.forecast_years" :key="month"><span>{{ month }}</span><strong>{{ number(shown.values[i]) }}</strong></div></div></details>

        </div><details class="method-details"><summary>模型输入、完整公式、拟合参数与输出</summary>
          <div v-if="activeTab==='trend' && shown.details" class="model-audit">
            <p class="audit-heading"><b>{{ shown.label }}</b><span>{{ shown.details.engine }} · 当前案例的实际拟合记录</span></p>
            <div class="audit-io">
              <section><h4>01 · 输入与处理</h4><dl>
                <dt>数据来源</dt><dd>{{ library.source.publisher }}</dd>
                <dt>观测口径</dt><dd>{{ library.source.definition }}</dd>
                <dt>历史窗口</dt><dd>{{ library.years[0] }}—{{ library.years.at(-1) }}，{{ library.values.length }}个连续月度观测</dd>
                <dt>实际估计样本</dt><dd>{{ shown.details.training_rows }}组{{ shown.id==='ensemble' ? '（全历史基模型输入；估权训练窗另列）' : '（变换或滞后后的模型样本口径）' }}</dd>
                <dt>预处理与递推</dt><dd>{{ shown.details.transform }}</dd>
                <dt>变量定义</dt><dd>y(t)：第t个月末现货指标（USD/lb U₃O₈）；h：向前预测的月数；H：总预测月数；ε：模型误差。</dd>
              </dl></section>
              <section><h4>02 · 实际输出</h4><dl>
                <dt>输出范围</dt><dd>{{ library.trend.forecast.forecast_years[0] }}—{{ library.forecast_end }}，共{{ shown.values.length }}个逐月点预测</dd>
                <dt>首月 / 末月</dt><dd>{{ number(shown.values[0]) }} / {{ number(shown.values.at(-1)) }} USD/lb</dd>
                <dt>路径最小 / 最大</dt><dd>{{ number(Math.min(...shown.values)) }} / {{ number(Math.max(...shown.values)) }} USD/lb</dd>
                <template v-if="shown.rolling"><dt>3月回测 RMSE</dt><dd>{{ number(shown.rolling.rmse) }} USD/lb · {{ shown.rolling.folds }}个起点</dd>
                <dt>24月回测 RMSE</dt><dd>{{ number(shown.longRolling?.rmse) }} USD/lb · {{ shown.longRolling?.folds }}个起点（窗口重叠）</dd></template>
                <dt>输出类型</dt><dd>预测路径及历史回测误差；当前未输出校准后的预测区间。</dd>
              </dl><p>{{ trendConclusion }}</p></section>
            </div>
            <section class="audit-equations"><h4>03 · 模型方程与计算顺序</h4><ol><li v-for="(equation,i) in shown.details.equations" :key="i"><code>{{ equation }}</code></li></ol><a :href="shown.source" target="_blank" rel="noopener noreferrer">查看方法文档 ↗</a></section>
            <div class="audit-io audit-tables">
              <section><h4>04 · 配置与估计方法</h4><table><tbody><tr v-for="row in shown.details.settings" :key="row.name"><th>{{ row.name }}</th><td>{{ parameter(row.value) }}</td></tr><tr v-if="!shown.details.settings.length"><td>无可调训练参数，使用最后一期观测作为基准。</td></tr></tbody></table></section>
              <section v-if="shown.id!=='ensemble'"><h4>05 · 本次拟合参数</h4><p class="audit-note">数值直接来自当前模型的拟合对象；显示保留6位有效数字。</p><table><tbody><tr v-for="row in shown.details.parameters" :key="row.name"><th>{{ row.name }}</th><td>{{ parameter(row.value) }}</td></tr></tbody></table></section>
            </div>
            <section v-if="shown.id==='ensemble'" class="audit-wide"><h4>05 · 7个基模型的实际组合权重</h4><p class="audit-note">RMSE取末12个月留出预测，权重为误差倒数归一化；这些误差用于估权，不是独立测试结果。完整模型方程与参数可在上方切换对应模型查看。</p><div class="audit-overflow"><table><thead><tr><th>基模型</th><th>留出 RMSE (USD/lb)</th><th>权重</th><th>首月预测</th><th>末月预测</th></tr></thead><tbody><tr v-for="m in library.trend.forecast.model_forecasts" :key="m.model"><th>{{ m.label }}</th><td>{{ parameter(m.validation_rmse) }}</td><td>{{ (100*m.weight).toFixed(3) }}%</td><td>{{ number(m.values[0]) }}</td><td>{{ number(m.values.at(-1)) }}</td></tr></tbody></table></div></section>
            <section v-if="shown.details.features?.length" class="audit-wide"><h4>06 · 输入特征及本次训练结果</h4><div class="audit-overflow"><table><thead><tr><th>特征</th><template v-if="shown.id==='LagRF'"><th>不纯度重要性</th></template><template v-else><th>标准化后系数 β</th><th>训练均值 μ</th><th>训练尺度 s</th></template></tr></thead><tbody><tr v-for="feature in shown.details.features" :key="feature.name"><th>{{ feature.name }}</th><td v-if="shown.id==='LagRF'">{{ parameter(feature.importance) }}</td><template v-else><td>{{ parameter(feature.coefficient) }}</td><td>{{ parameter(feature.mean) }}</td><td>{{ parameter(feature.scale) }}</td></template></tr></tbody></table></div></section>
            <section v-if="shown.details.candidates?.length" class="audit-wide"><h4>06 · AIC选阶比较</h4><div class="audit-candidates"><span v-for="row in shown.details.candidates" :key="row.name">{{ row.name }}：<b>{{ parameter(row.value) }}</b></span></div></section>
            <p class="audit-limit"><b>解释边界：</b>{{ shown.details.limitations }} {{ library.validation_note }}</p>
          </div>
          <div v-else class="method-report"><div><span>01 · 输入</span><p>{{ library.values.length }}个月度价格，{{ library.years[0] }}–{{ library.years.at(-1) }}；全球铀价月末现货指标均值（{{ library.unit }}）。{{ shown.input || '同一历史序列，原始观测不做绘图平滑。' }}</p></div><div><span>02 · 计算依据</span><code>{{ shown.formula }}</code><a :href="shown.source" target="_blank" rel="noopener noreferrer">查看公开方法出处 ↗</a></div><div><span>03 · 输出解释</span><p>{{ shown.conclusion || trendConclusion }}</p></div></div>

        </details><div v-if="activeTab==='trend'" class="validation-section">

          <div class="validation-heading"><h3>回测与模型对照</h3><span>短期3个月 / 中期24个月 · USD/lb</span></div>

          <div class="validation-scroll"><table><thead><tr><th>方法</th><th>有效起点</th><th>MAE</th><th>RMSE</th><th>24月 MAE</th><th>24月 RMSE</th><th>2026Q4均值</th><th>Q4方向</th></tr></thead><tbody><tr v-for="model in library.trend.forecast.model_forecasts" :key="model.model" :class="{highlight:generated.trend===model.model}"><th>{{ model.label }}</th><td>{{ model.rolling?.folds ?? '—' }}</td><td>{{ number(model.rolling?.mae) }}</td><td>{{ number(model.rolling?.rmse) }}</td><td>{{ number(model.long_rolling?.mae) }}</td><td>{{ number(model.long_rolling?.rmse) }}</td><td>{{ number(quarterMean(model.values)) }}</td><td>{{ direction(quarterMean(model.values)) }}</td></tr></tbody></table></div>

          <p class="validation-note">{{ library.validation_note }}</p>

          <p class="model-consensus">{{ trendConsensus }}</p>

        </div>

      </template>

      <p class="data-source">数据来源：<a :href="library.source.url" target="_blank" rel="noopener noreferrer">{{ library.source.publisher }}</a>。{{ library.caveat }} 所有物料按tU计量，美元/磅U₃O₈报价不能直接当作每tU成本。</p>

    </template>

  </section>

</template>



<script setup>

import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

import * as echarts from 'echarts'

import request from '@/utils/request'

const props = defineProps({ analysis: { type:Object, default:null } })

const root=ref(null), chartElement=ref(null), library=ref(null), loading=ref(false), error=ref('')

const activeTab=ref('trend'), selected=ref({trend:'ensemble',turning:'segmented',cycle:'fourier'}), generated=ref({...selected.value})

let chart, observer, requestId=0

const tabs=[{id:'trend',label:'趋势预测',title:'选择价格趋势模型',description:'统计模型与机器学习使用同一序列，按时间顺序回测。'},

  {id:'turning',label:'拐点识别',title:'选择结构变化识别方法',description:'对比价格极值、回归结构断点与累积偏差报警。'},

  {id:'cycle',label:'周期分析',title:'选择周期诊断方法',description:'谐波回归、频域估计与自相关相互对照，判断周期假设是否有依据。'}]

const currentTab=computed(()=>tabs.find(tab=>tab.id===activeTab.value))

const number=v=>v==null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(2)

const parameter=value=>typeof value==='number' ? (Number.isFinite(value)?Number(value.toPrecision(6)).toString():'—') : String(value)

const specs={

  Naive:{kind:'基准模型',description:'随机游走基准，检查复杂模型是否真正改善预测。',formula:'ŷₜ₊ₕ=yₜ',source:'https://otexts.com/fpp3/simple-methods.html'},

  ETS:{kind:'状态空间平滑',description:'估计水平与阻尼趋势，控制长期线性外推的发散。',formula:'ℓₜ=αyₜ+(1−α)(ℓₜ₋₁+φbₜ₋₁)；ŷₜ₊ₕ=ℓₜ+Σᵢ₌₁ʰφⁱbₜ',source:'https://www.statsmodels.org/stable/generated/statsmodels.tsa.holtwinters.ExponentialSmoothing.html'},

  ARIMA110:{kind:'差分自回归',description:'对一阶价格差分拟合自回归，显式建模序列依赖。',formula:'(1−φB)(1−B)yₜ=εₜ；ARIMA(1,1,0)',source:'https://www.statsmodels.org/stable/generated/statsmodels.tsa.arima.model.ARIMA.html'},

  ReturnAR:{kind:'动态收益率',description:'在1–6阶候选中按AIC选择对数收益率自回归，递推未来月度变化；不预设涨跌形状。',formula:'p*=argmin AIC(p)；rₜ=c+Σφᵢrₜ₋ᵢ+εₜ；ŷₜ₊ₕ=yₜ exp(Σr̂ₜ₊ⱼ)',source:'https://www.statsmodels.org/stable/generated/statsmodels.tsa.ar_model.AutoReg.html'},

  SeasonalETS:{kind:'季节性候选',description:'在对数价格上估计12月季节项与阻尼趋势；季节性是否有效由滚动回测比较，不预设周期成立。',formula:'log y：ETS 加性水平＋阻尼趋势＋12月加性季节项；ŷ=exp(预测)',source:'https://www.statsmodels.org/stable/generated/statsmodels.tsa.holtwinters.ExponentialSmoothing.html'},

  ARIMA100:{kind:'平稳自回归',description:'估计长期均值及价格对上一月份的依赖，展示均值回归。',formula:'yₜ−μ=φ(yₜ₋₁−μ)+εₜ；ARIMA(1,0,0)',source:'https://www.statsmodels.org/stable/generated/statsmodels.tsa.arima.model.ARIMA.html'},

  Theta:{kind:'趋势分解',description:'结合长期趋势与局部水平，作为小样本序列预测对照。',formula:'θ=2：曲率放大Theta线＋θ=0线性趋势的组合外推',source:'https://www.statsmodels.org/stable/generated/statsmodels.tsa.forecasting.theta.ThetaModel.html'},

  LagRF:{kind:'机器学习 · 集成树',description:'用3个月对数滞后价格、均值、波动及差分特征拟合非线性关系。',formula:'log ŷₜ₊₁=(1/B)ΣᵦTᵦ(xₜ)；160棵树、深度≤3、叶样本≥2',source:'https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestRegressor.html',input:'滞后3个月对数特征；只用当前训练窗；随机种子42，多步递推。'},

  LagRidge:{kind:'机器学习 · 正则化',description:'通过L2正则约束滞后特征共线性，以简约回归对照非线性模型。',formula:'β*=argminβ ||log y−Xβ||²₂+10||β||²₂；ŷ=exp(Xβ*)',source:'https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html',input:'滞后3个月对数特征；标准化仅在训练窗拟合；多步递推。'},

}

const trendOptions=computed(()=>{

  if(!library.value) return []

  const fc=library.value.trend.forecast

  return [{id:'ensemble',label:'多模型误差加权组合',kind:'模型组合',description:'保留各模型的独立路径，按历史留出误差估计组合权重。',formula:'wₘ ∝ 1/RMSEₘ；ŷₜ₊ₕ=Σₘwₘŷₘ,ₜ₊ₕ',source:'https://otexts.com/fpp3/combinations.html',values:fc.values,details:fc.details,unit:'USD/lb U₃O₈'},

    ...fc.model_forecasts.map(model=>({id:model.model,label:model.label,...specs[model.model],values:model.values,details:model.details,rolling:model.rolling,longRolling:model.long_rolling,unit:'USD/lb U₃O₈'}))]

})

const options=computed(()=>activeTab.value==='trend' ? trendOptions.value : library.value?.[activeTab.value] || [])

const shown=computed(()=>options.value.find(model=>model.id===generated.value[activeTab.value]))

const forecastPeriods=[{label:'2026 Q4',start:'2026-10',end:'2026-12'},

  {label:'2027 全年',start:'2027-01',end:'2027-12'},{label:'2028 全年',start:'2028-01',end:'2028-12'}]

const periodMean=(values,start,end)=>{const months=library.value?.trend.forecast.forecast_years || [];const chosen=(values || []).filter((_,i)=>months[i]>=start && months[i]<=end);return chosen.length?chosen.reduce((a,b)=>a+b,0)/chosen.length:null}

const quarterMean=values=>{const months=library.value?.trend.forecast.forecast_years || [];const chosen=(values || []).filter((_,i)=>['2026-10','2026-11','2026-12'].includes(months[i]));return chosen.length?chosen.reduce((a,b)=>a+b,0)/chosen.length:null}

const direction=value=>{const last=library.value?.values.at(-1);if(value==null||!last)return '—';const change=(value-last)/last;return Math.abs(change)<0.03?'基本持平':change>0?'上行':'下行'}

const trendConclusion=computed(()=>{

  if(!shown.value)return ''

  return `所选模型的2026Q4月末指标的均值为${number(quarterMean(shown.value.values))} USD/lb U₃O₈，相对最后实测月${library.value.years.at(-1)}为${direction(quarterMean(shown.value.values))}（±3%为基本持平）。预测延伸至2028年12月，中期路径仅依赖历史价格；短期回测表现不能证明两年预测可靠。`

})

const trendConsensus=computed(()=>{

  const models=library.value?.trend.forecast.model_forecasts || [];const counts={}

  models.forEach(model=>{const key=direction(quarterMean(model.values));counts[key]=(counts[key]||0)+1})

  const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]);if(!entries.length)return ''

  return `模型方向对照：${entries.map(([key,count])=>`${count}种${key}`).join('，')}。${entries.length===1?'当前方向一致，但共用同一价格序列，不能视为独立事实验证。':'当前方法存在分歧，需结合回测误差和供应、运输证据继续判断。'}`

})

const chartCaption=computed(()=>activeTab.value==='trend'?`实测至${library.value.years.at(-1)} · 外推至${library.value.forecast_end} · 预测区展开40%`:shown.value?.description || '')

async function load(){

  const id=++requestId;library.value=null;error.value='';loading.value=true

  chart?.dispose();chart=null

  try{

    const result=await request({url:'/SCnet/uraniumDecision/market-forecast-models',method:'get'})

    if(id!==requestId)return

    if(!result.success)throw new Error(result.message || '模型结果加载失败')

    library.value=result.data;await render()

  }catch(e){if(id===requestId)error.value=e.message || '专业模型服务暂不可用'}finally{if(id===requestId)loading.value=false}

}

async function switchTab(tab){activeTab.value=tab;await render()}

async function generate(){generated.value[activeTab.value]=selected.value[activeTab.value];await render()}

async function render(){

  await nextTick();if(!chartElement.value || !shown.value || !library.value)return

  chart ||= echarts.init(chartElement.value)

  const model=shown.value,lib=library.value,fc=lib.trend.forecast

  // 纵轴只写 USD/lb U₃O₈ 时看不出量纲含义:凡是价格单位都注明"价格";
  // 功率谱密度、自相关系数、标准化累积偏差等非价格量纲保持原样。
  const yName=unit=>{const u=unit || lib.unit || '';return /usd\s*\/\s*lb/i.test(u) ? `价格（${u}）` : u}

  const colors=['#2563eb','#0891b2','#7c3aed','#d97706','#db2777','#059669','#64748b','#a855f7']

  let axis=[], series=[],thresholds=[],boundary

  if(activeTab.value==='trend'){

    // Separate grids preserve all observations while reserving 40% for the forecast.

    const left=68,right=28,plotWidth=Math.max(100,chartElement.value.clientWidth-left-right)

    const historicalWidth=plotWidth*0.6, futureLeft=left+historicalWidth

    const futureAxis=[lib.years.at(-1),...fc.forecast_years]

    const paths=model.id==='ensemble'?fc.model_forecasts:[]

    const all=[...lib.values,...model.values,...paths.flatMap(p=>p.values)]

    const padding=Math.max(1,(Math.max(...all)-Math.min(...all))*0.1)

    const min=Math.floor(Math.min(...all)-padding),max=Math.ceil(Math.max(...all)+padding)

    const futureSeries=(name,values,color,width=2)=>({name,type:'line',xAxisIndex:1,yAxisIndex:1,

      data:[lib.values.at(-1),...values],smooth:false,symbol:'circle',symbolSize:fc.forecast_years.length>12?3:6,

      lineStyle:{width,color,type:'dashed'},itemStyle:{color}})

    series=[{name:'历史实测',type:'line',data:lib.values,smooth:false,symbol:'none',

      lineStyle:{width:2,color:colors[0]},itemStyle:{color:colors[0]}}]

    series.push(...paths.map((p,i)=>futureSeries(p.label,p.values,colors[(i+1)%colors.length],1.4)))

    const main=futureSeries(model.label,model.values,'#ea7c24',3)

    main.markArea={silent:true,itemStyle:{color:'rgba(234,124,36,0.055)'},data:[[{xAxis:futureAxis[0]},{xAxis:futureAxis.at(-1)}]]}

    main.markLine={silent:true,symbol:'none',data:[{xAxis:futureAxis[0],label:{formatter:'实测截止 / 预测展开',position:'insideEndTop'},lineStyle:{color:'#94a3b8',type:'dashed'}}]}

    series.push(main)

    chart.setOption({animation:false,legend:{top:6,type:'scroll',textStyle:{fontSize:11}},

      tooltip:{trigger:'axis',confine:true,valueFormatter:v=>v==null?'—':number(v)},

      grid:[{left,width:historicalWidth,top:65,bottom:75},{left:futureLeft,right,top:65,bottom:75}],

      xAxis:[{type:'category',gridIndex:0,data:lib.years,boundaryGap:false,

        axisLabel:{fontSize:11,hideOverlap:true,formatter:(v,i)=>i===0||i===lib.years.length-1||v.endsWith('-01')?v:''}},

        {type:'category',gridIndex:1,data:futureAxis,boundaryGap:false,

          axisLabel:{interval:0,hideOverlap:true,fontSize:11,color:'#b96723',formatter:(v,i)=>i===0?'':fc.forecast_years.length<=8||i===1||i===futureAxis.length-1||v.endsWith('-01')||v.endsWith('-07')?v:''}}],

      yAxis:[{type:'value',min,max,name:yName(model.unit),nameGap:30,splitLine:{lineStyle:{color:'#edf1f7'}}},

        {type:'value',gridIndex:1,min,max,axisLabel:{show:false},axisTick:{show:false},axisLine:{show:false},splitLine:{lineStyle:{color:'#edf1f7'}}}],

      graphic:[{type:'text',left,top:40,style:{text:'历史实测 · 时间压缩',fill:'#64748b',fontSize:11}},

        {type:'text',left:futureLeft+12,top:40,style:{text:'模型预测 · 展开至2028年底',fill:'#b96723',fontSize:11}}],

      dataZoom:[{type:'inside',xAxisIndex:0,filterMode:'none'},{type:'slider',xAxisIndex:0,left,width:historicalWidth,bottom:8,height:18,start:0,end:100,brushSelect:false}],series},true)

    chart.resize()

    return

  }else{

    axis=model.x_axis;thresholds=model.thresholds || [];boundary=model.boundary_index

    series=model.series.map((row,i)=>({name:row.name,type:'line',data:row.values,smooth:false,symbol:'circle',symbolSize:3,lineStyle:{color:colors[i],width:2,type:row.dashed?'dashed':'solid'},itemStyle:{color:colors[i]}}))

    if(model.markers?.length)series.push({name:'识别位置',type:'scatter',symbolSize:12,itemStyle:{color:'#dc4b50'},data:model.markers.map(p=>[axis[p.index],p.value]),label:{show:true,position:'top',formatter:p=>`${p.value[0]}`,fontSize:10}})

  }

  if(series.length){series[0].markLine={silent:true,symbol:'none',data:[...thresholds.map(y=>({yAxis:y,label:{formatter:number(y)}})),...(boundary!=null?[{xAxis:axis[boundary],label:{formatter:'实测截止'},lineStyle:{color:'#9aaec8',type:'dashed'}}]:[])]}}

  chart.setOption({animation:false,tooltip:{trigger:'axis',confine:true,valueFormatter:value=>value==null?'—':number(value)},legend:{top:4,type:'scroll',textStyle:{fontSize:11}},

    grid:{left:75,right:30,top:58,bottom:82},xAxis:{type:'category',data:axis,boundaryGap:false,name:model.x_name || '月份',nameLocation:'middle',nameGap:30,axisLabel:{fontSize:11}},

    yAxis:{type:'value',name:yName(model.unit),nameTextStyle:{fontSize:11},scale:true,splitLine:{lineStyle:{color:'#edf1f7'}}},

    dataZoom:axis.length>16?[{type:'inside',filterMode:'none'},{type:'slider',bottom:8,height:20,start:Math.max(0,(axis.length-20)/axis.length*100),end:100,brushSelect:false}]:[],series},true)

  chart.resize()

}

watch(()=>props.analysis,()=>{if(props.analysis?.status==='success')load()},{immediate:true})

onMounted(()=>{observer=new ResizeObserver(()=>{chart?.resize();if(library.value)render()});if(root.value)observer.observe(root.value)})

onUnmounted(()=>{requestId++;observer?.disconnect();chart?.dispose()})

</script>



<style scoped>

.professional-forecast{background:#fff;border:1px solid #dce5f2;border-radius:18px;margin:18px 0 26px;padding:26px;color:#243851;min-width:0}.section-heading{display:flex;justify-content:space-between;gap:16px;align-items:center}.eyebrow{font-size:10px;letter-spacing:1.6px;color:#7190b4}.section-heading h2{font-size:22px;margin:8px 0}.section-heading p{font-size:12px;color:#7b8ba1;margin:0}.data-badge{font-size:11px;background:#eff6ff;color:#3870b7;border-radius:20px;padding:8px 12px;white-space:nowrap}.method-tabs{display:flex;gap:8px;border-bottom:1px solid #e5edf7;margin:16px 0 12px;padding-bottom:12px}.method-tabs button{border:0;background:#f3f6fb;color:#60758f;border-radius:8px;padding:12px 20px;font:inherit;font-size:14px;cursor:pointer}.method-tabs button span{font-size:11px;opacity:.6;margin-right:9px}.method-tabs button.active{background:#2563eb;color:#fff}.method-intro{display:flex;gap:12px;align-items:baseline;margin-bottom:14px}.method-intro b{font-size:14px}.method-intro span{font-size:12px;color:#8291a6}.method-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.method-options button{text-align:left;cursor:pointer;background:#fff;border:1px solid #dce6f3;border-radius:10px;padding:10px 28px 10px 12px;display:flex;flex-direction:column;min-height:64px;position:relative;color:#243851;font:inherit}.method-options button.selected{border:2px solid #4380f4;background:#f5f9ff;padding:9px 27px 9px 11px}.method-type{font-size:10px;color:#7c8da7;margin-bottom:6px}.method-options strong{font-size:13px;margin-bottom:8px}.method-options small{font-size:11px;line-height:1.8;color:#6f829d}.method-selected{font-size:10px;color:#3674d9;position:absolute;right:10px;top:22px;font-size:15px}.generate-row{display:flex;align-items:center;gap:16px;margin:8px 0 14px}.generate-row span{font-size:11px;color:#7d8fa7}.plot-card{border:1px solid #e4ebf5;border-radius:12px;padding:18px}.plot-heading{display:flex;justify-content:space-between;align-items:flex-start}.plot-heading h3{font-size:15px;margin:0 0 7px}.plot-heading p,.plot-heading>span{font-size:11px;color:#7a8ca6;margin:0;line-height:1.8}.model-chart{width:100%;height:400px;margin-top:8px}.plot-guide{font-size:11px;color:#7e8da5;line-height:1.8;padding:10px;background:#f7f9fd;border-radius:5px}.method-report{display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:20px;margin:24px 0}.method-report>div{min-width:0}.method-report span{font-size:11px;color:#5282b9;font-weight:600}.method-report p{font-size:12px;line-height:1.9;color:#536b88}.method-report code{display:block;font:12px/1.8 Consolas,monospace;margin-top:12px;overflow-wrap:anywhere;background:#f3f6fb;padding:12px;color:#455e7d}.method-report a,.data-source a{font-size:11px;color:#3673bc}.method-report a{display:inline-block;margin-top:8px}.validation-heading{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #edf1f7;padding-top:20px}.validation-heading h3{font-size:14px}.validation-heading span{font-size:11px;color:#8190a5}.validation-scroll{overflow:auto}table{width:100%;border-collapse:collapse;min-width:640px;font-size:12px}th,td{text-align:left;padding:12px;border-bottom:1px solid #edf1f7}thead{background:#f6f9fe;color:#7287a1}tbody th{font-weight:500}.highlight{background:#f2f7ff}.validation-note,.data-source{font-size:11px;color:#8190a5;line-height:1.9;margin-top:12px}.model-consensus{font-size:13px;line-height:1.9;background:#eff6ff;border-left:3px solid #4481e8;padding:13px 16px;color:#3d5e85}.load-error{padding:30px;color:#b4533c;font-size:13px}button:focus-visible{outline:3px solid #9cc0ff;outline-offset:3px}@media(min-width:1700px){.method-options{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:1100px){.method-options{grid-template-columns:repeat(2,minmax(0,1fr))}.method-report{grid-template-columns:1fr}.section-heading{align-items:flex-start;flex-direction:column}.method-intro{flex-direction:column;gap:8px}}@media(max-width:650px){.professional-forecast{padding:16px}.method-tabs button{padding:10px;font-size:12px}.model-chart{height:340px}.method-options{grid-template-columns:repeat(2,minmax(0,1fr))}.generate-row{align-items:flex-start;flex-direction:column}}

.selection-description{font-size:12px;color:#6f829d;line-height:1.6;margin:8px 0;min-height:20px}.forecast-values{display:flex;align-items:center;gap:24px;padding:12px 16px;background:#fff8ef;border-radius:8px;margin-top:12px;flex-wrap:wrap}.forecast-values>span{font-size:11px;color:#927450}.forecast-values>div{display:flex;flex-direction:column;gap:4px}.forecast-values span{font-size:11px;color:#8b7964}.forecast-values strong{font-size:16px;font-variant-numeric:tabular-nums;color:#b96723}.method-details{margin-top:16px}.method-details summary{font-size:12px;color:#5282b9;cursor:pointer}.method-options strong{margin-bottom:0;line-height:1.4}.professional-forecast{padding:20px}.method-tabs button{padding:9px 18px}

.forecast-summary{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px}.forecast-summary>div{flex:1;min-width:130px;display:flex;flex-direction:column;gap:6px;padding:14px 18px;background:#fff8ef;border:1px solid #f6e4ce;border-radius:8px}.forecast-summary span{font-size:12px;color:#8b7964}.forecast-summary strong{font-size:22px;color:#b96723;font-variant-numeric:tabular-nums}.forecast-summary small{font-size:10px;color:#8b7964}.forecast-summary p{flex-basis:100%;font-size:11px;line-height:1.7;color:#8190a5;margin:0}.monthly-details{margin-top:10px}.monthly-details summary{font-size:12px;color:#5282b9;cursor:pointer}

.model-audit{margin-top:16px;padding:18px;background:#fafcff;border:1px solid #e3eaf4;border-radius:10px}.audit-heading{display:flex;align-items:baseline;flex-wrap:wrap;gap:12px;margin:0 0 16px}.audit-heading b{font-size:15px}.audit-heading span,.audit-note{font-size:11px;color:#74869e;line-height:1.8}.audit-io{display:grid;grid-template-columns:1fr 1fr;gap:24px}.model-audit section{min-width:0}.model-audit h4{font-size:12px;color:#3c6d9e;margin:0 0 12px}.model-audit dl{display:grid;grid-template-columns:108px minmax(0,1fr);gap:9px 12px;font-size:12px;line-height:1.8;margin:0}.model-audit dt{color:#7c8da3}.model-audit dd{margin:0;color:#354d69;overflow-wrap:anywhere}.audit-io section>p,.audit-limit{font-size:12px;line-height:1.9;color:#647991}.audit-equations,.audit-wide,.audit-tables{margin-top:22px}.audit-equations ol{margin:0;padding-left:24px}.audit-equations li{padding:6px;color:#8190a5}.audit-equations code{display:block;background:#eef3fa;padding:10px 12px;font:13px/1.9 Consolas,monospace;color:#314e72;white-space:pre-wrap;overflow-wrap:anywhere}.audit-equations a{display:inline-block;margin-top:10px;color:#3673bc;font-size:12px}.model-audit table{min-width:0;font-size:12px}.model-audit th,.model-audit td{padding:9px 12px;overflow-wrap:anywhere}.model-audit tbody th{font-weight:400;color:#647991}.model-audit td{font-variant-numeric:tabular-nums}.audit-overflow{overflow:auto}.audit-overflow table{min-width:550px}.audit-candidates{display:flex;flex-wrap:wrap;gap:10px}.audit-candidates span{padding:8px 12px;background:#eef3fa;font-size:12px;color:#647991}.audit-limit{margin:18px 0 0;border-top:1px solid #dfe8f4;padding-top:12px}@media(max-width:950px){.audit-io{grid-template-columns:1fr}.model-audit{padding:12px}.model-audit dl{grid-template-columns:92px minmax(0,1fr)}}

/* Visual hierarchy: module > working area > content; accents indicate function. */
.professional-forecast{--text:#243447;--muted:#536579;--line:#cbd5e1;--accent:#2456a6;background:#fff;border:1px solid #bac7d7;border-radius:12px;padding:0;margin:18px 0 36px;color:var(--text);box-shadow:none;overflow:hidden}
.section-heading{padding:22px 24px;background:#fff;color:#243447;border-bottom:1px solid #cbd5e1}
.eyebrow{font-size:11px;letter-spacing:1px;color:#64748b;font-weight:600}.section-heading h2{font-size:22px;line-height:1.4;margin:8px 0}.section-heading p{color:#64748b;font-size:12px}.data-badge{background:#fff;border:1px solid #cbd5e1;color:#475569;font-size:11px;white-space:normal;line-height:1.7}
.method-workspace{margin:20px 24px;padding:16px 18px;background:#fff;border:1px solid #ced7e2;border-radius:8px}.method-tabs{margin:0 0 14px;padding:0 0 12px;border-bottom:1px solid #c7d1df}.method-tabs button{background:transparent;border:1px solid #b9c8da;color:#3c526c;padding:8px 16px;border-radius:6px;font-weight:600}.method-tabs button.active{background:#2456a6;border-color:#2456a6;color:white}.method-intro span,.selection-description,.generate-row span{color:#536579}.method-intro b{color:#253c58}.method-options{gap:8px}.method-options button{border-color:#becbda;box-shadow:none;border-radius:6px;background:#fff;min-height:62px}.method-options button:hover{border-color:#4575b6;background:#f8fbff}.method-options button.selected{border-color:#2456a6;background:#e3edfb;box-shadow:inset 3px 0 #2456a6}.method-type{color:#596e86}.method-options strong{color:#203b5f}.method-selected{color:#2456a6}.generate-row{margin-bottom:0}
.forecast-results{margin:22px 24px 18px;border:1px solid #b8c8dc;border-radius:8px;overflow:hidden;background:#fff}.plot-card{border:0;border-radius:0;padding:18px 18px 0}.plot-heading{padding-bottom:12px;border-bottom:1px solid #d5dfe9}.plot-heading h3{font-size:17px;font-weight:650;color:#203b5f}.plot-heading p,.plot-heading>span{color:#596c83;font-size:12px}.plot-guide{background:#fff;border-radius:0;border-left:1px solid #cbd5e1;color:#536579;font-size:12px;padding:10px 12px;margin-bottom:0}.forecast-summary{gap:0;margin:16px 18px 0;background:#fff;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden}.forecast-summary>div{background:transparent;border:0;border-right:1px solid #cbd5e1;border-radius:0;padding:13px 20px}.forecast-summary>div:nth-child(3){border-right:0}.forecast-summary span{color:#735434;font-weight:600}.forecast-summary strong{color:#9a4c0d;font-size:24px}.forecast-summary small{color:#795d41}.forecast-summary p{background:#fff;border-top:1px solid #cbd5e1;padding:10px 12px;color:#5f6d7c;font-size:12px;line-height:1.7}.monthly-details{margin:14px 18px 18px}.monthly-details summary{font-size:12px;color:#3e5674;font-weight:600;padding:8px 0}.forecast-values{background:#fff;border:1px solid #cbd5e1}.forecast-values span{color:#715c46}
.method-details{margin:18px 24px;border:1px solid #c3cdd9;border-radius:8px;background:#fff;overflow:hidden}.method-details>summary{padding:15px 18px;font-size:13px;font-weight:600;color:#344960}.method-details[open]>summary{border-bottom:1px solid #c3cdd9;background:#fff}.model-audit{margin:0;border:0;border-radius:0;padding:20px;background:#fff}.audit-heading{padding-bottom:14px;border-bottom:1px solid #cfd9e3}.audit-heading span,.audit-note{color:#596c83}.audit-io{gap:20px}.audit-io>section{padding:15px;background:#fff;border-top:1px solid #cbd5e1}.model-audit h4{color:#283e59;font-size:13px}.model-audit dt{color:#5c6c7e}.model-audit dd{color:#253b54}.audit-equations code{background:#eaf0f6;color:#203c5e;border:1px solid #cfdae5}.model-audit td,.model-audit tbody th{color:#344960}.audit-tables>section{background:#fff;border-top:1px solid #bccbd9}.audit-wide{padding-top:16px;border-top:1px solid #c9d5e1}.method-report{padding:18px;margin:0}
.validation-section{margin:22px 24px;border:1px solid #aebfd2;border-radius:8px;overflow:hidden;background:#fff}.validation-heading{background:#fff;border:0;border-bottom:1px solid #bdcbdb;padding:12px 18px;gap:12px}.validation-heading h3{font-size:15px;font-weight:650;color:#273f5d;margin:0}.validation-heading span{color:#52677e;font-size:12px}.validation-scroll{padding:0 16px}thead{background:#fff;color:#344960}th,td{border-bottom-color:#d5dee8;padding:12px}tbody td,tbody th{color:#34465d}tbody tr:nth-child(even){background:#fff}tbody tr.highlight{background:#e5effd;box-shadow:inset 3px 0 #3a6daf}.validation-note{padding:0 18px;color:#5e6f82;font-size:12px;line-height:1.8}.model-consensus{margin:14px 18px 18px;background:#fff;border:1px solid #c6d2e1;border-left:1px solid #cbd5e1;border-radius:4px;color:#344f72;font-size:12px}.data-source{margin:0;padding:16px 24px;border-top:1px solid #cbd5e1;background:#fff;color:#596b7e;font-size:11px;line-height:1.9}.data-source a{color:#2456a6}
@media(max-width:950px){.section-heading{padding:18px}.method-workspace,.forecast-results,.method-details,.validation-section{margin-left:16px;margin-right:16px}.audit-io{grid-template-columns:1fr}.validation-heading{align-items:flex-start;flex-direction:column;gap:6px}.model-audit{padding:14px}}@media(max-width:650px){.professional-forecast{padding:0}.section-heading h2{font-size:19px}.method-workspace{padding:12px}.method-tabs{gap:5px}.method-tabs button{padding:8px;font-size:12px}.forecast-summary>div{padding:12px;min-width:100px}.forecast-summary strong{font-size:20px}.forecast-summary>div:nth-child(2){border-right:0}.plot-card{padding:14px 12px 0}.validation-scroll{padding:0 8px}.data-source{padding:14px 16px}}

</style>

