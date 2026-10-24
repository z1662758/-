export const FOCUS_OPTIONS = [
  { id: 'transport', label: '运输与物流' },
  { id: 'supply', label: '供应与产量' },
  { id: 'policy', label: '政策与制裁' },
  { id: 'cost', label: '价格与成本' },
  { id: 'facilities', label: '企业与设施' },
]

const DOMAIN_TERMS = {
  uranium: ['铀', 'uranium', 'u3o8', '核燃料', 'kazatomprom', 'cameco'],
  supply_chain: ['汽车', 'automotive', 'vehicle', '整车', '零部件', '动力电池', '日产', 'nissan', '丰田', 'toyota', '大众汽车'],
}
const FOCUS_TERMS = {
  transport: ['运输', '运输路线', '路线', '物流', '铁路', '港口', '红海', '船运', '航运', 'transport', 'route', 'shipping', 'logistics', 'maritime'],
  supply: ['供应', '供给', '产量', '生产', '产能', '矿山', '电池', '原材料', 'supply', 'production', 'capacity', 'output', 'battery', 'material'],
  policy: ['制裁', '政策', '出口管制', '禁运', '贸易限制', '法规', 'sanction', 'policy', 'export control', 'embargo', 'trade restriction'],
  cost: ['价格', '成本', '报价', '市场价', 'price', 'cost', 'pricing', 'market'],
  facilities: ['企业', '公司', '矿山', '工厂', '设施', '工厂', '厂房', 'company', 'facility', 'plant', 'mine', 'site'],
}
const TARGETS = [
  { id: 'kazakhstan', aliases: ['哈萨克斯坦', 'kazakhstan', 'kaz', 'kazatomprom'] },
  { id: 'china', aliases: ['中国', 'china', 'chinese'] },
  { id: 'niger', aliases: ['尼日尔', 'niger'] },
  { id: 'russia', aliases: ['俄罗斯', 'russia', 'russian'] },
  { id: 'canada', aliases: ['加拿大', 'canada', 'cameco'] },
  { id: 'namibia', aliases: ['纳米比亚', 'namibia'] },
  { id: 'red_sea', aliases: ['红海', 'red sea'] },
  { id: 'nissan', aliases: ['日产', 'nissan'] },
  { id: 'chip', aliases: ['芯片', '半导体', 'chip', 'semiconductor'] },
  { id: 'battery', aliases: ['动力电池', '电池', 'battery'] },
]

function normalized(text) { return String(text || '').toLowerCase() }
export function sceneTerms(scene) { return DOMAIN_TERMS[scene] || DOMAIN_TERMS.supply_chain }
export function focusTerms(focus) { return FOCUS_TERMS[focus] || [] }
export function targetAliases(target, question = '') {
  const value = normalized(target).trim()
  if (!value) return TARGETS.filter((item) => item.aliases.some((alias) => normalized(question).includes(alias))).flatMap((item) => item.aliases)
  const match = TARGETS.find((item) => item.id === value || item.aliases.some((alias) => normalized(alias) === value))
  return match?.aliases || [value]
}
export function hasAny(text, terms) {
  const content = normalized(text)
  return terms.some((term) => content.includes(normalized(term)))
}
function hasPositiveFocus(text, terms) {
  const content = normalized(text)
  const negatedChinesePrefix = /(?:不是|并非|不涉及|未涉及|不映射|未映射|不经过|未经过|不走|未走|不包含|不包括|没有|无关)[\w\u4e00-\u9fff-]{0,8}$/u
  const negatedEnglishPrefix = /\b(?:not|no|without)\b(?:\s+[\w-]+){0,2}\s*$/i
  return terms.some((term) => {
    const needle = normalized(term)
    let offset = content.indexOf(needle)
    while (offset >= 0) {
      const before = content.slice(Math.max(0, offset - 16), offset)
      if (!negatedChinesePrefix.test(before) && !negatedEnglishPrefix.test(before)) return true
      offset = content.indexOf(needle, offset + needle.length)
    }
    return false
  })
}
export function isFocusedEvidence({ scene, focus, target = '', question = '', text = '', targetText = text }) {
  const targets = targetAliases(target, question)
  return hasAny(text, sceneTerms(scene)) && (!focus || hasPositiveFocus(text, focusTerms(focus))) && (!targets.length || hasAny(targetText, targets))
}
