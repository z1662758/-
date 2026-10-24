<template>
  <section class="supply-map">
    <div class="map-bar"><div><strong>铀供应链世界网络</strong><span>{{ network.demo ? '框架空间示意 · 位置及链路不代表真实企业或贸易事实' : rows.length ? (rows.some(x=>x.data_status==='demo') ? '框架默认网络 · 主体与通道参数可配置' : rows.some(x=>x.data_status==='knowledge_base')?'知识库节点与证据支持路线 · 点击节点查看业务数据，点击国家查看政策':rows.some(x=>x.data_status==='framework_default')?'铀供应链参考网络 · 地理位置采用区域与通道锚点':'用户已绑定供需记录') : '尚未绑定地理实例 · 地图不预设企业位置或实际贸易关系' }}</span></div><div><el-button size="small" @click="openBindings">绑定供需实例</el-button><el-button size="small" @click="reset">复位地图</el-button></div></div>
    <div class="map-controls"><el-checkbox v-model="showSupply">供给 / 物流流向</el-checkbox><el-checkbox v-model="showDemand">需求 / 采购方向</el-checkbox><el-checkbox v-if="!rows.length" v-model="showIllustration">查看空间示意</el-checkbox><span>{{ network.nodes.length }} 个节点 · {{ network.edges.length }} 条方向连线</span></div>
    <div class="map-inspection"><el-select :model-value="detailNode?.entity_id" placeholder="选择节点查看详细数据" filterable @update:model-value="inspectNode(rows.find(x=>x.entity_id===$event))"><el-option v-for="row in rows" :key="row.entity_id" :value="row.entity_id" :label="row.name"/></el-select><span>供应国政策：</span><button v-for="(country,id) in policies" :key="id" @click="inspectCountry(id)">{{ country.name }}</button></div><UraniumNodeDetails v-model:open="nodeDrawer" :node="detailNode" :country-id="policyCountryId" :world="model.world_model"/><div class="geo-wrap"><div ref="canvas" class="geo-canvas"/><div v-if="!network.nodes.length" class="empty-binding"><strong>先定义 Agent，再绑定业务主体</strong><p>模型已定义 {{ contract.definition_count }} 类 Agent 行为。绑定主体坐标、供需关系和参数后，在地图查看其建模状态。</p><el-button type="primary" @click="openBindings">绑定业务供需记录</el-button><el-button @click="loadExample">载入框架默认实例</el-button></div></div>
    <div class="map-legend"><span><i class="supplier"/>供应方</span><span><i class="manufacturer"/>制造方</span><span><i class="demander"/>需求方</span><span><i class="logistics"/>仓储物流</span><span><i class="part"/>物料 / 产品</span><span class="supply-line">实线箭头：供给方向</span><span class="demand-line">虚线箭头：需求方向</span></div>
    <div class="flow-detail" v-if="picked"><strong>{{ picked.label }}</strong><p>{{ picked.description }}</p><div v-if="pickedProfile" class="node-agent-contract"><strong>{{ pickedProfile.label }} · {{ pickedBinding?.status==='inputs_bound'?'状态输入已绑定':pickedBinding?'参数待补全':'业务主体未绑定' }}</strong><p>目标：{{ pickedProfile.goal }}</p><p>状态：{{ pickedProfile.states.map(x=>x.label).join('、') }}<br>决策：{{ pickedProfile.decision_variables.map(x=>x.label).join('、') }}<br>方法：{{ pickedProfile.behavior_rules.map(x=>x.method).join('；') }}</p><p v-if="pickedBinding">{{ pickedBinding.states.map(x=>`${x.label}：${x.status==='bound'?`${x.value} ${x.unit}`:x.reason}`).join('；') }}</p><small>完整规则、约束和交互协议见下方 Agent 建模输入。</small></div><el-button text size="small" @click="emit('select',picked.key,picked.id,picked.entityId)">查看{{ picked.key === 'types' ? '对象属性与指标' : '关系定义' }} →</el-button></div>
    <div class="map-note">{{ network.demo ? '同一框架可以绑定不同国家、企业和零件；当前用示意节点展示供给与需求如何连接，不表示已检索到真实业务网络。' : `输入 ${rows.length} 行，定位 ${network.nodes.length} 个对象；${network.missing} 行缺少有效坐标或对象类型，${network.invalidEdges} 条关系引用无效，未绘制。` }} 可缩放、拖动，点击节点或连线查看定义。</div>
    <div v-if="rows.length" class="business-relations"><strong>业务供需记录 · {{ rows.some(x=>x.data_status==='knowledge_base')?'知识库来源记录':rows.some(x=>['demo','framework_default'].includes(x.data_status))?'框架默认值':'用户已绑定' }}</strong><button v-for="(edge,index) in network.edges.filter(x=>x.kind==='supply')" :key="index" @click="inspectEdge(edge)">{{ nodeName(edge.source) }} <span>→ {{ edge.label }} →</span> {{ nodeName(edge.target) }}<small>{{ edge.metadata || '数量 / 价格 / 周期尚未绑定' }}</small></button><p v-if="!network.edges.length">没有可绘制的供需关系，请提供有效端点和匹配的关系类型。</p></div>
    <el-dialog v-model="bindingOpen" title="供需实例绑定 · 前端展示数据" width="min(820px,95vw)" append-to-body><p class="binding-instructions">输入对象行数组。必需：entity_id、name、type、longitude、latitude。supply_to 填供给目标，demand_from 填采购来源；supply_relation / demand_relation 为已有关系编码。product_id、quantity、unit、price、lead_time、time_window、source 用于供需详情。保留 inventory、capacity 等状态字段可检查 Agent 参数。仅在当前页面绑定，不提交至事中。</p><div style="margin-bottom:12px"><el-button @click="fillExample">填入框架默认数据</el-button></div><el-input v-model="bindingText" type="textarea" :rows="15"/><el-alert v-if="bindingError" :title="bindingError" type="error" :closable="false"/><template #footer><el-button @click="bindingOpen=false">取消</el-button><el-button type="primary" @click="commitBindings">应用绑定</el-button></template></el-dialog>
    <details class="map-contract"><summary>如何将实际供需数据放到地图上</summary><p>在“导入数据 / 计算”中导入对象行：entity_id、name、type（目录中的对象编码）、longitude、latitude。supply_to 填供应目标的 entity_id，demand_from 填采购来源的 entity_id，多个对象用英文逗号分隔。可选 supply_relation、demand_relation 指定目录中的关系编码；未指定时按端点类型匹配已有关系，无法匹配则不画线。保留价格、数量、周期等原有计算字段即可同时计算指标。坐标不自动猜测，未提供坐标的数据不会变成真实地图节点。</p></details>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { ensureEchartsWorldMap } from '@/utils/ensureEchartsWorldMap'
import UraniumNodeDetails from '@/components/SCnet/UraniumNodeDetails.vue'
import { uraniumCountryPolicies, countryFromMap } from '@/utils/uraniumCountryPolicies'
import { previewAgentContract, resolveAgentDefinition } from '@/utils/domainAgentModel'
const props=defineProps({ model:{type:Object,required:true},rows:{type:Array,default:()=>[]},instance:{type:Object,default:null} })
const emit=defineEmits(['select','bind-rows'])
const canvas=ref(null),showSupply=ref(true),showDemand=ref(true),picked=ref(null)
const showIllustration=ref(false),bindingOpen=ref(false),bindingText=ref('[]'),bindingError=ref('')
const nodeDrawer=ref(false),detailNode=ref(null),policyCountryId=ref('')
const policies=uraniumCountryPolicies
function inspectNode(row){detailNode.value=row;policyCountryId.value=row?.supplier_country||row?.country_id||'';nodeDrawer.value=true}
function inspectCountry(id){if(!id)return;detailNode.value=null;policyCountryId.value=id;nodeDrawer.value=true}
const contract=computed(()=>previewAgentContract(props.model,props.instance||{rows:props.rows}))
const profileFor=type=>resolveAgentDefinition(props.model,type)
const pickedBinding=computed(()=>contract.value.bindings.find(x=>x.entity_id===picked.value?.entityId))
const pickedProfile=computed(()=>picked.value?.key==='types'?profileFor(picked.value.id):null)
let chart,observer,disposed=false
const colors={supplier:'#38bdf8',manufacturer:'#a78bfa',demander:'#fbbf24',logistics:'#34d399',part:'#f472b6'}
const ancestry=id=>{const result=new Set([id]);const visit=code=>{for(const parent of props.model.types.find(x=>x.id===code)?.parents||[]) if(!result.has(parent)){result.add(parent);visit(parent)}};visit(id);return result}
const group=type=>[...ancestry(type)].find(x=>Object.hasOwn(colors,x))||'supplier'
const list=value=>Array.isArray(value)?value.map(String):String(value||'').split(',').map(x=>x.trim()).filter(Boolean)
const network=computed(()=>{
  const typeIds=new Set(props.model.types.map(x=>x.id)),relations=new Map(props.model.relations.map(x=>[x.id,x]))
  let nodes=[],edges=[],missing=0,invalidEdges=0
  if(!props.rows.length&&!showIllustration.value)return {nodes,edges,missing,invalidEdges,demo:false}
  const match=(id,source,target)=>{
    const valid=rel=>ancestry(source.type).has(rel.source)&&ancestry(target.type).has(rel.target)
    return id ? (relations.has(id)&&valid(relations.get(id)) ? relations.get(id):null) : props.model.relations.find(valid)
  }
  if(props.rows.length && props.rows.every(x=>x.network_basis==='uranium_reference')){
    nodes=props.rows.map(row=>({id:row.entity_id,name:row.name,type:row.type,value:[row.longitude,row.latitude],row}))
    const ids=new Set(nodes.map(x=>x.id))
    edges=(props.model.world_model?.edges||[]).filter(edge=>ids.has(edge.source_id)&&ids.has(edge.target_id)).map(edge=>({source:edge.source_id,target:edge.target_id,relation:edge.direction==='demand'?'demand_relation':'transport',kind:edge.direction,label:edge.label,metadata:props.model.world_model.source}))
    return {nodes,edges,missing,invalidEdges,demo:false}
  }
  if(props.rows.length){
    const ids=new Set()
    for(const row of props.rows){
      const lon=Number(row.longitude),lat=Number(row.latitude),id=String(row.entity_id||'').trim()
      if(!id||ids.has(id)||row.longitude==null||row.longitude===''||row.latitude==null||row.latitude===''||!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90||!typeIds.has(row.type)){missing++;continue}
      ids.add(id);nodes.push({id,name:String(row.name||id),type:row.type,value:[lon,lat],row})
    }
    const byId=new Map(nodes.map(x=>[x.id,x]))
    for(const source of nodes) for(const [field,kind] of [['supply_to','supply'],['demand_from','demand']]) for(const targetId of list(source.row[field])){
      const target=byId.get(targetId)
      const rel=target&&(kind==='supply'?match(source.row.supply_relation,source,target):match(source.row.demand_relation,target,source))
      if(!target||!rel||source===target){invalidEdges++;continue}
      const metadata=[source.row.product_id&&`产品：${source.row.product_id}`,source.row.quantity!=null&&`数量：${source.row.quantity} ${source.row.unit||''}`,source.row.price!=null&&`价格：${source.row.price}`,source.row.lead_time!=null&&`周期：${source.row.lead_time}天`,source.row.time_window&&`窗口：${source.row.time_window}`,source.row.source&&`来源：${source.row.source}`].filter(Boolean).join(' · ')
      edges.push({source:source.id,target:target.id,relation:rel.id,kind,label:kind==='demand'?'需求 / 采购':rel.label,metadata})
      if(kind==='supply')edges.push({source:target.id,target:source.id,relation:rel.id,kind:'demand',label:'采购需求（同一供需记录反向展示）',metadata})
    }
  }else{
    const seeds=[
      ['s3','三级供应商','supplier',-105,50],['s2','二级供应商','supplier',-65,-10],['s1','一级供应商','supplier',20,-20],
      ['m3','三级制造商','manufacturer',15,55],['m2','二级制造商','manufacturer',75,25],['m1','一级制造商','manufacturer',115,35],
      ['part','零件 / 产品','part',115,5],['d1','一级需求商','demander',140,40],['d2','二级需求商','demander',135,-25],
      ['channel','分销商','distributor',-115,30],['retail','零售商','retailer',-85,15],['customer','终端客户','end_customer',-55,40],
      ['logistics','物流服务商','logistics',55,-5],['warehouse','仓储中心','warehouse',95,55],['recycle','回收再制造','recycler',35,35],
      ['raw_material','原材料','raw_material',-30,-30],['component','零部件','component',60,48],['assembly','组件 / 半成品','assembly',90,-20],['finished_product','成品','finished_product',-145,5],
    ]
    nodes=seeds.filter(x=>typeIds.has(x[2])).map(([id,name,type,lon,lat])=>({id,name,type,value:[lon,lat]}))
    const byId=new Map(nodes.map(x=>[x.id,x]))
    for(const [source,target,relation,kind] of [
      ['s3','s2','upstream','supply'],['s2','s1','upstream','supply'],['s1','part','supply','supply'],
      ['m3','m2','manufacturing_chain','supply'],['m2','m1','manufacturing_chain','supply'],['m1','part','produce','supply'],
      ['part','d1','demand_relation','supply'],['d1','d2','downstream','supply'],
      ['d1','part','demand_relation','demand'],['d2','d1','downstream','demand'],['part','s1','supply','demand'],
      ['channel','retail','retail_flow','supply'],['retail','customer','consumption','supply'],['customer','retail','consumption','demand'],
      ['logistics','part','transport','supply'],['part','warehouse','warehousing','supply'],['customer','recycle','return_flow','supply'],
      ['s1','raw_material','material_supply','supply'],['m3','raw_material','material_processing','supply'],['m2','component','component_production','supply'],['m1','assembly','assembly_production','supply'],['m1','finished_product','finished_production','supply'],['finished_product','channel','distribution','supply'],['recycle','raw_material','recovered_material','supply'],
    ]) if(byId.has(source)&&byId.has(target)&&relations.has(relation)) edges.push({source,target,relation,kind,label:kind==='demand'?'需求 / 采购':relations.get(relation).label})
  }
  return {nodes,edges,missing,invalidEdges,demo:!props.rows.length}
})
function draw(){
  if(!chart||disposed)return
  const byId=new Map(network.value.nodes.map(x=>[x.id,x]))
  const lineData=kind=>network.value.edges.filter(x=>x.kind===kind).map(edge=>({...edge,coords:[byId.get(edge.source).value,byId.get(edge.target).value],name:`${byId.get(edge.source).name} → ${byId.get(edge.target).name}`}))
  chart.setOption({backgroundColor:'#0d1b32',tooltip:{trigger:'item',formatter:p=>{const d=p.data;const profile=d.type&&profileFor(d.type),binding=contract.value.bindings.find(x=>x.entity_id===d.id);return echarts.format.encodeHTML(`${network.value.demo?'框架示意 · ':''}${d.name||''}${d.label?' · '+d.label:''}${profile?' · '+profile.label+' · '+(binding?.status==='inputs_bound'?'状态输入已绑定':binding?'参数待补全':'未绑定实例'):''}`)}},geo:{map:'world',roam:true,zoom:1.07,center:[8,15],boundingCoords:[[-180,85],[180,-60]],itemStyle:{areaColor:'#1c3452',borderColor:'#3b5975',borderWidth:.7},emphasis:{itemStyle:{areaColor:'#284b6b'},label:{show:false}},label:{show:false}},series:[
    ...[['supply',showSupply.value,'#38bdf8',.18],['demand',showDemand.value,'#fbbf24',-.25]].map(([kind,show,color,curveness])=>({name:kind==='supply'?'供给流向':'需求方向',type:'lines',coordinateSystem:'geo',zlevel:1,data:show?lineData(kind):[],symbol:['none','arrow'],symbolSize:7,lineStyle:{color,width:kind==='supply'?1.7:1.3,opacity:.75,curveness,type:kind==='supply'?'solid':'dashed'},emphasis:{lineStyle:{width:4,opacity:1}},effect:{show:kind==='supply',period:7,symbol:'arrow',symbolSize:5,trailLength:0}})),
    {name:'供应链角色',type:'scatter',coordinateSystem:'geo',zlevel:2,symbolSize:13,data:network.value.nodes.map(n=>({...n,symbolSize:n.type==='part'?6:15,itemStyle:{color:colors[group(n.type)],borderColor:'#e2e8f0',borderWidth:1},label:{show:n.type==='supplier'||n.id===picked.value?.entityId,formatter:n.name+'\n'+(profileFor(n.type)?(contract.value.bindings.find(x=>x.entity_id===n.id)?.status==='inputs_bound'?'输入已绑定':props.rows.length?'参数待补全':'实例未绑定'):'产品对象'),position:n.type==='manufacturer'?'left':n.type==='supplier'?'top':'bottom',color:'#e2e8f0',fontSize:10,backgroundColor:'rgba(13,27,50,.75)',padding:[3,5],borderRadius:3}})),emphasis:{scale:1.5}},
  ]},true)
}
function nodeName(id){return network.value.nodes.find(x=>x.id===id)?.name||id}
function inspectEdge(edge){picked.value={id:edge.relation,key:'relations',label:`${nodeName(edge.source)} → ${nodeName(edge.target)}`,description:`${edge.label}；${edge.metadata||'数量、价格、周期尚未绑定'}。${props.rows.some(x=>['demo','framework_default'].includes(x.data_status))?'框架默认记录。':'已绑定记录。'}`};emit('select','relations',edge.relation)}
function reset(){draw()}
function openBindings(){bindingText.value=JSON.stringify(props.rows,null,2);bindingError.value='';bindingOpen.value=true}
function exampleRows(){return [
 {entity_id:'demo_supplier',name:'参考供给主体·汉堡',type:'supplier',longitude:9.99,latitude:53.55,inventory:600,capacity:200,lead_time:3,supply_to:'demo_part',supply_relation:'supply',product_id:'demo_part',quantity:100,unit:'件',price:80,time_window:'初始时间窗口',source:'框架默认值',data_status:'demo'},
 {entity_id:'demo_manufacturer',name:'参考制造主体·上海',type:'manufacturer',longitude:121.48,latitude:31.23,inventory:100,manufacturing_capacity:150,production_cycle:2,backlog:120,supply_to:'demo_part',supply_relation:'produce',data_status:'demo'},
 {entity_id:'demo_part',name:'参考零件1（上海）',type:'part',longitude:121.48,latitude:31.23,supply_to:'demo_demander',supply_relation:'demand_relation',product_id:'demo_part',quantity:100,unit:'件',price:110,lead_time:5,source:'框架默认值',data_status:'demo'},
 {entity_id:'demo_demander',name:'参考需求主体·东京',type:'demander',longitude:139.69,latitude:35.68,inventory:40,customer_demand:100,demand_cycle:7,target_stock:80,in_transit:30,data_status:'demo'},
 {entity_id:'demo_logistics',name:'参考物流主体·新加坡',type:'logistics',longitude:103.85,latitude:1.29,transit_time:5,transport_cost:5,route_capacity:300,supply_to:'demo_part',supply_relation:'transport',data_status:'demo'},
 {entity_id:'demo_warehouse',name:'参考仓储主体·鹿特丹',type:'warehouse',longitude:4.48,latitude:51.92,warehouse_stock:150,warehouse_capacity:400,safety_stock:100,data_status:'demo'},
]}
function fillExample(){bindingText.value=JSON.stringify(exampleRows(),null,2)}
function loadExample(){emit('bind-rows',exampleRows())}
function commitBindings(){try{const value=JSON.parse(bindingText.value);if(!Array.isArray(value)||value.length>1000||value.some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw new Error('需要最多1000行对象数组');const ids=new Set();for(const row of value){if(typeof row.entity_id!=='string'||!row.entity_id.trim()||ids.has(row.entity_id))throw new Error('主体ID须为非空且唯一');ids.add(row.entity_id);if(!props.model.types.some(x=>x.id===row.type))throw new Error('对象类型须使用目录中的编码');if(!Number.isFinite(Number(row.longitude))||!Number.isFinite(Number(row.latitude))||Math.abs(Number(row.longitude))>180||Math.abs(Number(row.latitude))>90||row.longitude==null||row.latitude==null||row.longitude===''||row.latitude==='')throw new Error('经纬度无效')}for(const row of value)for(const key of ['supply_to','demand_from'])if(list(row[key]).some(id=>!ids.has(id)))throw new Error('供需关系引用了不存在的主体ID');emit('bind-rows',value);bindingOpen.value=false;bindingError.value=''}catch(e){bindingError.value=e.message}}

watch([network,showSupply,showDemand],()=>{picked.value=null;nextTick(draw)},{deep:true})
onMounted(async()=>{
  await ensureEchartsWorldMap(echarts);if(disposed||!canvas.value)return
  chart=echarts.init(canvas.value)
  chart.on('click',p=>{if(p.componentType==='geo'){inspectCountry(countryFromMap(p.name));return}const d=p.data;if(!d)return;if(d.type){inspectNode(d.row||props.rows.find(x=>x.entity_id===d.id));picked.value={id:d.type,key:'types',entityId:d.id,label:d.name,description:`${network.value.demo?'示意位置；':''}对象类型：${props.model.types.find(x=>x.id===d.type)?.label}。价格、周期、产能等定义见右侧。`};emit('select','types',d.type,d.id)}else if(d.relation){picked.value={id:d.relation,key:'relations',label:d.name,description:`${d.label}；${d.metadata||'数量 / 价格 / 周期未绑定'}；箭头表示${d.kind==='demand'?'采购需求的发起方向':'物料或服务的供给方向'}。`};emit('select','relations',d.relation)}})
  draw();observer=new ResizeObserver(()=>chart?.resize());observer.observe(canvas.value)
})
onBeforeUnmount(()=>{disposed=true;observer?.disconnect();chart?.dispose()})
</script>

<style scoped>
.supply-map{background:#0d1b32;color:#dbeafe}.map-bar{padding:18px 20px 8px;display:flex;justify-content:space-between;align-items:center;gap:12px}.map-bar strong{font-size:16px;letter-spacing:1px}.map-bar span{display:block;font-size:11px;color:#94a3b8;margin-top:7px;line-height:1.7}.map-controls{padding:0 20px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.map-controls :deep(.el-checkbox__label){color:#cbd5e1;font-size:11px}.map-controls>span{margin-left:auto;color:#94a3b8;font-size:11px}.geo-canvas{height:540px;width:100%}.map-legend{display:flex;flex-wrap:wrap;gap:12px;padding:8px 20px;font-size:10px;color:#cbd5e1}.map-legend i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}.supplier{background:#38bdf8}.manufacturer{background:#a78bfa}.demander{background:#fbbf24}.logistics{background:#34d399}.supply-line{color:#38bdf8}.demand-line{color:#fbbf24}.map-note,.map-contract{padding:10px 20px;font-size:11px;line-height:1.9;color:#94a3b8;border-top:1px solid #263d56}.map-contract summary{cursor:pointer;color:#93c5fd}.flow-detail{margin:10px 20px;padding:12px;background:#192e47;border:1px solid #34526e;border-radius:8px;font-size:12px}.flow-detail p{color:#a9bdd4;font-size:11px;line-height:1.8}.flow-detail :deep(.el-button){color:#7dd3fc}@media(max-width:700px){.geo-canvas{height:420px}.map-bar{align-items:flex-start}.map-controls>span{margin-left:0}}
.geo-wrap{position:relative}.empty-binding{position:absolute;top:32%;left:15%;right:15%;text-align:center;padding:24px;background:rgba(13,27,50,.9);border:1px solid #3b5975;border-radius:12px}.empty-binding strong{font-size:19px}.empty-binding p{font-size:12px;line-height:1.9;color:#a9bdd4}.business-relations{padding:16px 20px;border-top:1px solid #263d56}.business-relations>strong{font-size:12px}.business-relations button{display:block;width:100%;padding:12px;margin-top:8px;background:#172c43;border:1px solid #2d4964;border-radius:7px;color:#dbeafe;text-align:left;cursor:pointer;font-size:12px}.business-relations button span{color:#7dd3fc}.business-relations small{display:block;color:#9fb4cb;margin-top:6px;line-height:1.8}.business-relations p{font-size:12px;color:#94a3b8}.node-agent-contract{padding:12px;border-top:1px solid #3b5975}.node-agent-contract small{color:#94a3b8}.binding-instructions{color:#64748b;line-height:1.9;font-size:12px}.part{background:#f472b6}.map-inspection{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:8px 20px;border-bottom:1px solid #263d56}.map-inspection .el-select{width:260px}.map-inspection>span{font-size:11px;color:#94a3b8}.map-inspection>button{border:1px solid #365473;border-radius:5px;padding:6px 8px;background:#182c44;color:#bad6ee;font-size:11px;cursor:pointer}.map-inspection>button:hover{background:#254768}</style>
