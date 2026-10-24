import { enrichAgentBehaviors } from '@/utils/domainAgentBehaviors'
import { enrichAgentConstraints } from '@/utils/domainAgentConstraints'
import { environmentContract } from '@/utils/domainEnvironmentModel'
// Frontend modeling definitions and binding preview. Never dispatches Agents.
const clone=value=>JSON.parse(JSON.stringify(value))
export function buildAgentDefinitions(model){
  if(model.agent_definitions?.length)return model.agent_definitions.map(profile=>enrichAgentBehaviors(enrichAgentConstraints(profile,model)))
  const q=model.industry==='uranium'?'tU':'件',money=model.industry==='uranium'?'USD':'元'
  const specifications=[
    ['supplier','供给方 Agent','在产能、库存与合同约束下分配供货并给出报价',
      [['stock','可发运库存',q,'inventory'],['capacity','日供给能力',`${q}/天`,'capacity'],['lead_time','交付周期','天','lead_time']],
      [['shipment','发运量',q],['quote','供货报价',`${money}/${q}`]],
      [['allocate','收到采购请求','产能约束分配','发运量 ≤ min(订单量, 可用库存, 日供给能力 × 步长天数)'],['disruption','产能下降或运输受阻','供给重排与缺口反馈','优先履行已承诺订单；对不足部分发送缺货或延期消息']],
      ['发运量不能超过可用库存和本步可用产能','报价、供货量和交付周期非负','替代供货须通过产品规格与认证检查'],['supply','upstream','material_supply']],
    ['manufacturer','制造方 Agent','根据订单与BOM安排生产、采购和多级制造协作',
      [['stock','成品库存',q,'inventory'],['capacity','日制造产能',`${q}/天`,'manufacturing_capacity'],['cycle','生产周期','天','production_cycle'],['backlog','待交订单量',q,'']],
      [['production','本步计划产量',q],['procurement','物料采购量',q]],
      [['bom_plan','收到订单或产能变化','BOM需求展开 + 有限产能排程','物料需求 = 计划产量 × 单位用量；计划产量 ≤ 日产能 × 步长天数'],['shortage','原料不足或上游延期','欠料等待与生产重排','缺料任务进入等待；向供给方发送采购请求，完成生产周期后才形成成品库存']],
      ['库存不得为负，BOM投入与产出必须守恒','生产量受产能、物料可用量和生产周期共同约束','委外任务必须绑定明确的制造协作关系'],['produce','manufacturing_chain','component_production','assembly_production','finished_production']],
    ['demander','需求方 Agent','满足需求并平衡库存、采购成本和交付周期',
      [['stock','可用库存',q,'inventory'],['demand','本期需求',q,'customer_demand'],['cycle','补货周期','天','demand_cycle'],['target_stock','目标库存',q,''],['in_transit','在途量',q,'']],
      [['order_qty','采购量',q],['supplier_share','供方分配比例','1']],
      [['reorder','库存不足或到达补货周期','订货至目标库存策略','采购量 = max(0, 目标库存 + 本期需求 - 库存 - 在途量)'],['switch','上游断供或交期超限','受约束的供方比较','仅在已定义、已认证的候选供方中比较报价与交期，不自动创造供方']],
      ['采购量非负并满足预算约束','分配比例在0至1之间且总和为1','替代品必须满足规格、质量和认证要求'],['demand_relation','downstream','distribution','retail_flow','consumption']],
    ['logistics','物流方 Agent','在通道容量、成本和时效约束下安排运输',
      [['transit','运输周期','天','transit_time'],['cost','单位运输成本',`${money}/${q}`,'transport_cost'],['route_capacity','本步通道容量',q,'']],
      [['allocated_qty','承运量',q],['route_choice','路径选择编号','1']],
      [['dispatch','收到发运请求','容量约束路径分配','承运量 ≤ 剩余通道容量；在可用路径中比较到达时间和运输成本'],['reroute','通道关闭或拥堵','可行路径重选','仅使用已绑定的备选线路；无路径可用时返回阻断状态并发送延期消息']],
      ['承运量不得超过通道容量','到货时间不得早于发运时间','禁运或关闭的路径不可使用'],['transport']],
    ['warehouse','仓储方 Agent','维护库存平衡并执行出入库与安全库存补货',
      [['stock','当前库存',q,'warehouse_stock'],['capacity','仓储容量',q,'warehouse_capacity'],['safety_stock','安全库存',q,'']],
      [['release','出库量',q],['replenish','补货请求量',q]],
      [['stock_balance','收货或发货事件','库存守恒更新','下一期库存 = 本期库存 + 实际到货 - 实际出库'],['replenish','库存低于安全库存','阈值补货','补货请求 = max(0, 安全库存 - 可用库存 - 在途量)']],
      ['0 ≤ 库存 ≤ 仓储容量','出库量不得超过可用库存','入库须有对应的到货记录'],['warehousing','transport']],
  ]
  const relationIds=new Set(model.relations.map(x=>x.id))
  return specifications.filter(x=>model.types.some(t=>t.id===x[0])).map(([type,label,goal,states,decisions,rules,constraints,relations])=>({
    id:`${type}_agent`,actor_type:type,label,goal,grain:'一个主体 × 一种产品 × 同一时间步；不同层级使用独立实例',step_unit:'天',step_days:1,
    states:states.map(([id,label,unit,source_input])=>({id,label,unit,source_input,required:true})),
    decision_variables:decisions.map(([id,label,unit])=>({id,label,unit,min:0})),
    behavior_rules:rules.map(([id,trigger,method,definition])=>({id,trigger,method,definition})),constraints,
    interactions:relations.filter(id=>relationIds.has(id)).map(relation_id=>({relation_id,receive:type==='supplier'?['采购请求','交期要求']:type==='manufacturer'?['客户订单','到货与缺料消息']:type==='demander'?['报价','交付状态']:['发运 / 出入库请求','通道状态'],send:type==='supplier'?['报价','可供数量','发运与缺口通知']:type==='manufacturer'?['生产计划','物料采购请求','完工通知']:type==='demander'?['采购订单','需求变化']:['承运 / 库存状态','到货与延期通知'],required_fields:['source_id','target_id','product_id','quantity','unit','time_window']})),
    state_transition:'接收事件 → 更新观测 → 检查约束 → 形成决策 → 执行动作后更新库存 / 在途 / 待交订单。此处仅定义过程。',
  })).map(profile=>enrichAgentBehaviors(enrichAgentConstraints(profile,model)))
}
export function resolveAgentDefinition(model,type){
  const definitions=buildAgentDefinitions(model),queue=[type],seen=new Set()
  while(queue.length){const current=queue.shift();if(seen.has(current))continue;seen.add(current);const profile=definitions.find(x=>x.actor_type===current);if(profile)return profile;queue.push(...(model.types.find(x=>x.id===current)?.parents||[]))}
  return null
}
export function validateAgentDefinitions(model){
  const errors=[],definitions=model.agent_definitions||[],actors=new Set(),ids=new Set()
  if(!Array.isArray(definitions)||definitions.length>50)return {valid:false,errors:['Agent定义须为最多50项数组']}
  const code=value=>typeof value==='string'&&/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(value)
  for(const profile of definitions){
    if(!profile||!code(profile.id)){errors.push('Agent编码无效');continue}
    if(ids.has(profile.id)||actors.has(profile.actor_type))errors.push('Agent编码或角色类型重复')
    ids.add(profile.id);actors.add(profile.actor_type)
    if(!model.types.some(x=>x.id===profile.actor_type))errors.push('主体类型不存在')
    for(const key of ['label','goal','grain','state_transition'])if(!profile[key]?.trim())errors.push(`${key}不能为空`)
    if(profile.step_days!=null&&(!Number.isFinite(profile.step_days)||profile.step_days<=0||profile.step_days>365))errors.push('时间步须大于0且不超过365天')
    for(const key of ['states','decision_variables','behavior_rules','constraints','interactions']){
      if(!Array.isArray(profile[key])||!profile[key].length||profile[key].length>50){errors.push(`${key}须为1至50项`);continue}
      const rowIds=new Set()
      for(const row of profile[key]){
        if(key==='constraints'){if(typeof row!=='string'||!row.trim())errors.push('约束不能为空');continue}
        if(!row||typeof row!=='object'){errors.push('定义格式无效');continue}
        if(key==='interactions'){
          if(!model.relations.some(x=>x.id===row.relation_id))errors.push('交互关系不存在')
          for(const field of ['receive','send','required_fields'])if(!Array.isArray(row[field])||!row[field].length||row[field].some(x=>typeof x!=='string'||!x.trim()))errors.push('交互消息契约不完整')
          continue
        }
        if(!code(row.id)||rowIds.has(row.id))errors.push('字段编码无效或重复');rowIds.add(row.id)
        if(key==='behavior_rules'){if(['trigger','method','definition'].some(x=>!row[x]?.trim()))errors.push('规则缺少触发、方法或定义');continue}
        if(!row.label?.trim()||!row.unit?.trim())errors.push('变量缺少名称或单位')
        if(key==='states'&&row.source_input&&!model.inputs.some(x=>x.id===row.source_input&&x.unit===row.unit))errors.push('状态绑定字段不存在或单位不一致')
        if(key==='decision_variables'&&(!Number.isFinite(row.min)||row.min<0))errors.push('决策变量下界须为非负数')
      }
    }
  }
  return {valid:!errors.length,errors:[...new Set(errors)]}
}
export function previewAgentContract(model,instance){
  const definitions=buildAgentDefinitions(model),rows=instance?.rows||[],mapping=instance?.mapping||{},units=instance?.units||{},seen=new Set(),bindings=[]
  for(const [index,row] of rows.entries()){
    const profile=resolveAgentDefinition(model,row.type),identity=String(row.entity_id||'').trim()
    if(!profile||!identity)continue
    const issues=[]
    if(seen.has(identity))issues.push('主体ID重复，请确认主体×产品×窗口的建模粒度');seen.add(identity)
    const states=profile.states.map(state=>{
      const source=state.source_input||state.id,column=mapping[source]||source,raw=row[column]
      const numeric=(typeof raw==='number'||typeof raw==='string'&&raw.trim()!=='')?Number(raw):NaN
      let reason=raw==null||raw===''?'未绑定':!Number.isFinite(numeric)||numeric<0?'须为非负有限数':units[source]&&units[source]!==state.unit?'单位不一致':null
      if(state.required&&reason)issues.push(`${state.label}：${reason}`)
      return {...state,column,value:reason?null:numeric,status:reason?'missing':'bound',reason}
    })
    if(!profile.step_days)issues.push('决策时间步尚未设定')
    bindings.push({entity_id:identity,name:String(row.name||identity),actor_type:row.type,definition_id:profile.id,row:index+1,states,status:issues.length?'incomplete':'inputs_bound',issues,data_status:row.data_status||'user_bound'})
  }
  const byId=new Map(rows.filter(x=>x.entity_id).map(x=>[String(x.entity_id),x])),relationships=[],relationship_issues=[]
  const targets=value=>Array.isArray(value)?value.map(String):String(value||'').split(',').map(x=>x.trim()).filter(Boolean)
  const parents=type=>{const queue=[type],seen=new Set();while(queue.length){const id=queue.shift();if(seen.has(id))continue;seen.add(id);queue.push(...(model.types.find(x=>x.id===id)?.parents||[]))}return seen}
  for(const row of rows)for(const [key,direction] of [['supply_to','supply'],['demand_from','demand']])for(const targetId of targets(row[key])){
    const target=byId.get(targetId),from=direction==='supply'?row:target,to=direction==='supply'?target:row
    const explicit=row[direction==='supply'?'supply_relation':'demand_relation']
    const relation=from&&to&&model.relations.find(x=>(!explicit||x.id===explicit)&&parents(from.type).has(x.source)&&parents(to.type).has(x.target))
    if(!relation){relationship_issues.push(`${row.entity_id||row.name}: ${key} → ${targetId} 无有效类型关系`);continue}
    relationships.push({source_id:String(row.entity_id),target_id:targetId,relation_id:relation.id,direction,product_id:row.product_id||null,quantity:row.quantity??null,unit:row.unit||null,price:row.price??null,lead_time:row.lead_time??null,time_window:row.time_window||null,source:row.source||null,data_status:row.data_status||'user_bound'})
  }
  return {world_model:model.world_model||null,environment_model:environmentContract(model),entities:rows.map(x=>({entity_id:x.entity_id||null,name:x.name||null,type:x.type||null,longitude:x.longitude??null,latitude:x.latitude??null})),relationships,relationship_issues,purpose:'pre_event_agent_modeling_input',model_id:model.id,version:model.version,definitions:clone(definitions),bindings,definition_count:definitions.length,bound_entity_count:bindings.length,inputs_bound_count:bindings.filter(x=>x.status==='inputs_bound').length,runtime_connected:false,note:'前端事前建模预览：规则与约束为声明式定义，参数绑定不代表事实已核验；不接入事中引擎，不运行仿真。'}
}
