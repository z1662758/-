import { canadaExtraPolicies } from '@/utils/canadaUraniumProfile'
export const uraniumCountryPolicies={
  KAZ:{name:'哈萨克斯坦',mapNames:['Kazakhstan'],items:[
    {title:'核材料活动许可',authority:'哈萨克斯坦电子许可门户',scope:'核材料经营及运输等许可活动',summary:'核材料活动和境内运输（含过境）设置许可办理入口。节点应绑定对应主体许可、货物与运输活动，不能将一般经营信息视为某批次已经获批。',effect:'许可状态 → 可发运方向、过境可行性与计划交期',period:'官方许可服务页面；具体许可有效期按业务文件',url:'https://www.elicense.kz/LicensingContent/Passport?lang=en&servicesParameters=%7B%22ActivityTypeId%22%3A%2289%22%2C%22SelectedSubActivityIds%22%3A%22%22%7D&servicesType=LicenseEl3'},
    {title:'对华铁路供应依据',authority:'Kazatomprom 2024年报',scope:'企业披露的对华运输路线',summary:'年报披露铀材料经铁路运往阿拉山口。该信息支持供应国到口岸的路线，不支持未经证实的具体矿山、工厂或批次供货关系。',effect:'铁路 / 口岸依赖 → 通道选择与交付周期',period:'2024年度披露',url:'https://www.kazatomprom.kz/storage/cb/eng_kap_ar2024_07_14.pdf'}]},
  CAN:{name:'加拿大',mapNames:['Canada'],items:[
    {title:'核物项进出口许可',authority:'加拿大核安全委员会 CNSC',scope:'受控核物质、设备与技术',summary:'CNSC实施进出口许可与合规程序；具体货物是否受控、许可范围及收货方条件应按实际物项绑定。',effect:'出口许可、收货方与用途条件 → 订单可行性',period:'官方进出口控制政策页面',url:'https://www.cnsc-ccsn.gc.ca/eng/nuclear-substances/import-and-export-controls/index.cfm'},
    {title:'核不扩散与合作协议',authority:'CNSC',scope:'主要核出口及进口国安排',summary:'主要核出口受核合作协议及相关保障安排约束。应将目的国、最终用途及协议适用性作为环境约束输入。',effect:'目的国与最终用途条件 → 供应资格筛选',period:'官方核不扩散政策页面',url:'https://www.cnsc-ccsn.gc.ca/eng/resources/non-proliferation/'}]},
  AUS:{name:'澳大利亚',mapNames:['Australia'],items:[
    {title:'铀出口政策与保障安排',authority:'澳大利亚外交贸易部 DFAT',scope:'澳大利亚义务核材料及铀出口',summary:'官方政策将铀出口与不扩散、IAEA保障及双边核合作安排关联；附加议定书也是供货政策条件之一。具体目的国资格需单独绑定。',effect:'目的国保障条件 → 采购候选与出口可行性',period:'DFAT现行政策说明页面',url:'https://www.dfat.gov.au/international-relations/security/non-proliferation-disarmament-arms-control/policies-agreements-treaties/australias-uranium-export-policy'},
    {title:'铀浓缩物许可与记录',authority:'ASNO / DFAT',scope:'铀矿石浓缩物生产、运输、分析与出口',summary:'ASNO提供面向铀浓缩物活动的许可模板和合规准则。可将材料核算、运输记录与许可信息纳入主体和交接数据。',effect:'材料记录与许可 → 发运、追溯和库存核算',period:'官方许可模板页面',url:'https://www.dfat.gov.au/international-relations/global-security/asno/template-permits-and-compliance-codes'}]},
  NAM:{name:'纳米比亚',mapNames:['Namibia'],items:[
    {title:'矿产品出口许可',authority:'纳米比亚贸易信息门户',scope:'矿产品出口程序',summary:'官方贸易门户提供矿产品出口许可申请流程。铀具体批次还需绑定适用物项、主管部门文件和有效期，不将一般流程视为已签发许可。',effect:'出口申请与有效期 → 发运准备与交期约束',period:'官方矿产品出口程序页面',url:'https://namibiatradeportal.gov.na/trade-goods/procedure-details/view_express_entity/373'},
    {title:'出口税费依据',authority:'NamRA',scope:'出口税法及矿产品分类',summary:'出口税法包含矿产品税目。实际适用税目、税率与计税口径须按货物和申报文件补充，界面不预填税率。',effect:'税目与税率 → 出口成本参数',period:'Export Levy Act 2 of 2016；具体税则适用待绑定',url:'https://www.namra.org.na/documents/cms/uploaded/export-levy-act-2-of-2016-6b1764275a.pdf'}]},
  UZB:{name:'乌兹别克斯坦',mapNames:['Uzbekistan'],items:[
    {title:'原子能和平利用法律框架',authority:'乌兹别克斯坦 LexUZ',scope:'原子能和平利用相关活动',summary:'官方法律数据库提供原子能和平利用法律文本。具体出口、运输、物项及许可条款应与批次文件关联，尚未绑定的条款不自动判定通过。',effect:'许可与用途条件 → 供应资格与运输约束',period:'2019年法律；版本适用性按官方文本核对',url:'https://lex.uz/en/docs/4506948'},
    {title:'天然铀出口主体信息',authority:'Navoiyuran',scope:'主体业务披露，非出口许可证明',summary:'企业公开业务范围包括天然铀开采及氧化铀出口，可作为供应主体角色依据；不代表已取得某条路线的批次许可。',effect:'主体角色 → 供应方定义',period:'企业业务介绍页面',url:'https://navoiyuran.uz/en/main-activity/'}]},
  NER:{name:'尼日尔',mapNames:['Niger'],items:[
    {title:'SOMAÏR权益及控制权变化',authority:'Orano公开声明',scope:'SOMAÏR项目及其经营安排',summary:'Orano在2025年6月声明中回应尼日尔方面的SOMAÏR国有化计划。此项为企业一方公开披露的历史政策事件，应复核当前控制权及供货安排。',effect:'经营控制权与合同安排 → 供给可用性和交易对手筛选',period:'2025-06历史披露，当前批次状态待绑定',url:'https://www.orano.group/en/news/news-group/2025/june/orano-opposes-nationalization-plans-of-somair-in-niger'}]},
  RUS:{name:'俄罗斯',mapNames:['Russia','Russian Federation'],items:[
    {title:'美国对俄罗斯低浓铀进口限制',authority:'美国能源部 DOE',scope:'俄罗斯来源低浓铀进入美国的情形',summary:'DOE说明相关美国进口禁令及豁免申请安排。该限制有明确的目的地与产品范围，不能直接当作俄罗斯对华天然铀或燃料贸易全面禁止。',effect:'产品形态 + 目的地 + 豁免条件 → 路线资格与替代采购',period:'禁令2024-08-11生效；具体豁免及适用期按文件',url:'https://www.energy.gov/ne/russian-uranium-ban-waiver-guidance'}]},
}
uraniumCountryPolicies.CAN.items.push(...canadaExtraPolicies)
export const policyCountry=id=>uraniumCountryPolicies[id]||null
export const countryFromMap=name=>Object.keys(uraniumCountryPolicies).find(id=>uraniumCountryPolicies[id].mapNames.includes(name))
