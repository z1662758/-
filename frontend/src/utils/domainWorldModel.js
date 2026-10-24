import network from '@/assets/data/uraniumDomainNetwork.json'
export function buildUraniumWorld(){
  const nodes=JSON.parse(JSON.stringify(network.nodes)),edges=JSON.parse(JSON.stringify(network.edges))
  return {data_revision:3,name:'铀供应链世界模型',scenario:'uranium',product:'天然铀 / 核燃料组件',quantity_unit:'tU',step_days:1,start_date:'',end_date:'',boundary:'海外供给、陆海通道、燃料制造、战略储备与核电需求',update_order:['供给释放','通道运输','燃料加工','需求履约','库存更新'],coordinate_basis:'区域与通道锚点，非实时位置',source:'铀知识库证据支持路线 · '+(network.as_of||'资料时间见节点详情'),nodes,edges}
}
