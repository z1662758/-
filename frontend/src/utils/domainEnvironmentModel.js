export function buildEnvironmentModel(model){
  if(model.environment_model)return model.environment_model
  const q=(model.industry==='uranium'||model.world_model?.scenario==='uranium')?'tU':'件',money=(model.industry==='uranium'||model.world_model?.scenario==='uranium')?'USD':'元'
  const fields=[
    ['demand_multiplier','市场需求倍率','market','1',1,0,10,'customer_demand',['demander'],'本期需求 × 需求倍率 → 需求观察与采购量'],
    ['market_price','采购基准价','market',`${money}/${q}`,null,0,null,'purchase_price',['supplier','manufacturer','demander'],'基准价格 → 报价、成本比较与采购决策'],
    ['capacity_availability','产能可用比例','production','1',1,0,1,'manufacturing_capacity',['supplier','manufacturer'],'基准产能 × 可用比例 → 可供量与排产上限'],
    ['material_availability','物料可用比例','production','1',1,0,1,'effective_supply',['manufacturer'],'物料供给 × 可用比例 → 欠料约束与生产等待'],
    ['route_availability','通道可用比例','transport','1',1,0,1,'',['logistics'],'通道容量 × 可用比例 → 承运量上限'],
    ['transport_delay','额外运输延迟','transport','天',0,0,null,'transit_time',['logistics','demander','manufacturer'],'原运输周期 + 延迟 → 到货时间与补货需求'],
    ['tariff_rate','附加关税比例','policy','1',0,0,1,'',['supplier','manufacturer','demander'],'基准价格 × (1 + 附加关税比例) → 采购成本比较'],
    ['export_quota','出口配额上限','policy',q,null,0,null,'',['supplier'],'配额限制 → 发运上限与可行供货方向'],
    ['disruption_intensity','自然扰动强度','natural','1',0,0,1,'',['supplier','manufacturer','logistics'],'灾害或天气事件 → 产能与通道可用性变化，具体映射由事件定义'],
    ['service_level','目标服务水平','operating','1',0.95,0,1,'',['demander','warehouse'],'服务目标 → 安全库存与补货策略设定'],
  ]
  return {time_step_days:1,start_date:'',end_date:'',fields:fields.map(([id,label,layer,unit,value,min,max,domain_input,actor_types,effect])=>({id,label,layer,unit,value,min,max,domain_input,actor_types,effect,source:value==null?'unbound':'framework_default'})),events:[]}
}
export const environmentLayers=[{id:'market',label:'市场与价格',description:'需求、采购价格与成本信号'},{id:'production',label:'生产与资源',description:'产能、物料及资源可用性'},{id:'transport',label:'地理与运输',description:'通道运力、运输周期与可达性'},{id:'policy',label:'政策与制度',description:'关税、配额与供货边界'},{id:'natural',label:'自然环境',description:'天气、灾害与外部扰动'},{id:'operating',label:'运营目标',description:'服务水平和时间窗口'}]
export function validateEnvironment(environment){
  const errors=[]
  if(!Number.isFinite(environment.time_step_days)||environment.time_step_days<=0||environment.time_step_days>365)errors.push('环境步长须大于0且不超过365天')
  if(environment.start_date&&environment.end_date&&environment.end_date<environment.start_date)errors.push('结束日期不得早于开始日期')
  const ids=new Set()
  for(const field of environment.fields||[]){
    if(!field.id||ids.has(field.id))errors.push('环境字段编码为空或重复');ids.add(field.id)
    if(field.value!=null&&(!Number.isFinite(field.value)||field.value<field.min||field.max!=null&&field.value>field.max))errors.push(`${field.label}超出范围`)
  }
  for(const event of environment.events||[]){
    if(!event.label?.trim()||!ids.has(event.parameter_id)||!event.actor_types?.length)errors.push('事件须包含名称、作用参数和受影响角色')
    if(!Number.isInteger(event.start_step)||!Number.isInteger(event.end_step)||event.start_step<0||event.end_step<event.start_step)errors.push('事件步长范围无效')
    if(!Number.isFinite(event.value)||event.value<0)errors.push('事件覆盖值须为非负数')
    const field=environment.fields.find(x=>x.id===event.parameter_id)
    if(field&&field.max!=null&&event.value>field.max)errors.push(`${event.label}的覆盖值超过参数上限`)
  }
  return {valid:!errors.length,errors:[...new Set(errors)]}
}
export function environmentContract(model){
  const environment=buildEnvironmentModel(model)
  return {...JSON.parse(JSON.stringify(environment)),status:environment.fields.some(x=>x.value==null)?'incomplete':'configured',agent_inputs:environment.fields.map(field=>({parameter_id:field.id,label:field.label,unit:field.unit,value:field.value,source:field.source,domain_input:field.domain_input,actor_types:field.actor_types,effect:field.effect})),validation:validateEnvironment(environment),runtime_connected:false}
}
