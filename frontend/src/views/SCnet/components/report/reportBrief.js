/**
 * 结构化报告 → 默认展示的「简版报告」。
 *
 * 后端返回的是分章的结构化 JSON(01/02/03 + 各式 section),信息量很大,
 * 默认页只保留三段式正文:现状与关键事实 / 背景分析与风险传导 / 启示与应对建议。
 *
 * 这里只做**选取、排序与截断**,不生成任何新的事实、数字、企业或结论:
 * 每一句话都取自后端返回的章节文本,被裁掉的详细数据仍完整保留在「证据溯源」里。
 * 章节序号与标题("一、二、三")是报告体例,与供应链类型无关,不写死任何场景内容。
 */

/** 三段式体例:序号与标题固定,正文全部来自后端数据 */
export const BRIEF_PARTS = Object.freeze([
  { number: '一', title: '供应链现状与关键事实' },
  { number: '二', title: '背景分析与风险传导' },
  { number: '三', title: '供应链启示与应对建议' },
])

/** 第二部分末尾的说明:明确区分既有事实、模型输出与趋势预测 */
const JUDGEMENT_NOTE =
  '本部分为基于已核实事实与模型输出的分析判断。已发生的事实、模型输出结论与未来趋势推测的区分，' +
  '见「证据溯源」中逐条标注的信息性质。'

/** 各部分的篇幅上限:默认页要适合快速阅读,不把原始数据全部铺开 */
const MAX_FACTS = 5
/** 核心事实少于这个数量时,改用段落叙述 */
const FACTS_FALLBACK_THRESHOLD = 3
/** 第一、第二部分的**自然段总数**上限(总述也算一段) */
const MAX_PART_ONE_PARAGRAPHS = 3
const MAX_PART_TWO_PARAGRAPHS = 4
const MAX_ADVICE = 5

/** 总述已经占掉一段时,正文段落可用额度相应减少 */
const paragraphsBudget = (total, hasLead) => Math.max(1, total - (hasLead ? 1 : 0))

const ORDINALS = ['一', '二', '三', '四', '五', '六']

const text = (value) => String(value ?? '').trim()

/** 章节的 section 列表(后端已保证每项含 type) */
function sections(chapter) {
  return (Array.isArray(chapter?.sections) ? chapter.sections : []).filter(
    (item) => item && typeof item === 'object',
  )
}

function paragraphsOf(chapter) {
  return sections(chapter)
    .filter((section) => section.type === 'paragraphs')
    .flatMap((section) => (section.paragraphs || []).map(text))
    .filter(Boolean)
}

function itemsOfType(chapter, type) {
  return sections(chapter)
    .filter((section) => section.type === type)
    .flatMap((section) => (Array.isArray(section.items) ? section.items : []))
    .filter(Boolean)
}

/** 章节按 number 排序:后端固定产出 01/02/03,排序只是防止缺章时错位 */
function orderedChapters(report) {
  const list = (Array.isArray(report?.chapters) ? report.chapters : []).filter(
    (chapter) => chapter && typeof chapter === 'object',
  )
  return list
    .slice()
    .sort((a, b) => String(a.number ?? '').localeCompare(String(b.number ?? '')))
}

function unique(list) {
  const seen = new Set()
  return list.filter((item) => {
    if (!item || seen.has(item)) return false
    seen.add(item)
    return true
  })
}

/** 关键指标/时间线没有独立结论句时,拼成一句可读的事实 */
function joinFact(head, tail) {
  const left = text(head)
  const right = text(tail)
  if (left && right) return `${left}：${right}`
  return left || right
}

/** 第一部分的核心事实:结论句 → 时间线 → 指标卡,按可用性依次回退 */
function factsOf(chapter) {
  const facts = []
  for (const section of sections(chapter)) {
    if (section.type === 'keyFindings') {
      facts.push(...(section.items || []).map(text))
    } else if (section.type === 'timeline') {
      facts.push(
        ...(section.items || []).map((item) =>
          joinFact(
            item.time ? `${text(item.title)}（${text(item.time)}）` : item.title,
            item.detail,
          ),
        ),
      )
    } else if (section.type === 'metricCards') {
      facts.push(
        ...(section.items || []).map((item) =>
          joinFact(item.label, `${text(item.value)}${item.note ? `（${text(item.note)}）` : ''}`),
        ),
      )
    }
  }
  return unique(facts.filter(Boolean)).slice(0, MAX_FACTS)
}

/** 一、供应链现状与关键事实:一段总述 + 3~5 条核心事实(事实不足时回退为短段落) */
function partFacts(chapter, meta) {
  if (!chapter) return { ...meta, kind: 'facts', hasContent: false, lead: '', paragraphs: [], facts: [] }

  const sourceParagraphs = paragraphsOf(chapter)
  const lead = text(chapter.summary) || sourceParagraphs[0] || ''
  const facts = factsOf(chapter)

  // 事实够多就只留事实,避免同一批内容既有段落又有清单
  const bodyParagraphs =
    facts.length >= FACTS_FALLBACK_THRESHOLD
      ? []
      : unique(sourceParagraphs.filter((item) => item !== lead)).slice(
          0,
          paragraphsBudget(MAX_PART_ONE_PARAGRAPHS, Boolean(lead)),
        )

  return {
    ...meta,
    kind: 'facts',
    lead,
    paragraphs: bodyParagraphs,
    facts,
    hasContent: Boolean(lead || bodyParagraphs.length || facts.length),
  }
}

/** 二、背景分析与风险传导:总述 + 说明性段落(段落不足时用提示条补齐) */
function partBackground(chapter, meta) {
  if (!chapter) return { ...meta, kind: 'paragraphs', hasContent: false, lead: '', paragraphs: [] }

  const sourceParagraphs = paragraphsOf(chapter)
  const lead = text(chapter.summary) || sourceParagraphs[0] || ''
  const body = unique(sourceParagraphs.filter((item) => item !== lead))

  // 段落数量不够时,用核心判断/风险提醒的提示条补足,保证这一部分有解释性文字
  const callouts = unique(
    itemsOfType(chapter, 'callouts')
      .filter((item) => ['core', 'warning', 'limited'].includes(text(item.tone)))
      .map((item) => text(item.text)),
  ).filter(Boolean)

  const paragraphs = (body.length ? body : callouts).slice(
    0,
    paragraphsBudget(MAX_PART_TWO_PARAGRAPHS, Boolean(lead)),
  )
  const hasContent = Boolean(lead || paragraphs.length)

  return {
    ...meta,
    kind: 'paragraphs',
    lead,
    paragraphs,
    note: hasContent ? JUDGEMENT_NOTE : '',
    hasContent,
  }
}

/**
 * 三、供应链启示与应对建议:按后端给出的行动建议分小节。
 * 建议标题缺失时依次回退到核心结论、正文段落,只给出与当前场景相关的条目,
 * 不凭空补一整套通用建议。
 */
function partAdvice(chapter, meta) {
  if (!chapter) return { ...meta, kind: 'advice', hasContent: false, items: [] }

  let entries = itemsOfType(chapter, 'recommendations')
    .map((item) => ({ title: text(item.title), detail: text(item.detail) }))
    .filter((item) => item.title || item.detail)

  if (!entries.length) {
    entries = itemsOfType(chapter, 'keyFindings')
      .map(text)
      .filter(Boolean)
      .map((detail) => ({ title: '', detail }))
  }
  if (!entries.length) {
    entries = paragraphsOf(chapter)
      .map((detail) => ({ title: '', detail }))
      .slice(0, MAX_ADVICE)
  }

  const items = entries.slice(0, MAX_ADVICE).map((entry, index) => ({
    title: entry.title,
    // 正文段落回退时不再加小节序号,避免出现没有标题的「（一）（二）」
    ordinal: entry.title ? `（${ORDINALS[index]}）` : '',
    detail: entry.detail,
  }))

  return { ...meta, kind: 'advice', items, hasContent: items.length > 0 }
}

/**
 * 结构化报告 → 默认页三段式简版报告。
 * 三段都没有内容时返回空 parts,调用方应回退到完整分章渲染。
 */
export function buildBriefReport(report) {
  const chapters = orderedChapters(report)
  const parts = [
    partFacts(chapters[0], BRIEF_PARTS[0]),
    partBackground(chapters[1], BRIEF_PARTS[1]),
    partAdvice(chapters[2], BRIEF_PARTS[2]),
  ].filter((part) => part.hasContent)

  return { parts }
}

/** 结论句里的「标签：正文」拆开,便于把标签加粗(重点结论突出) */
export function splitFact(fact) {
  const value = text(fact)
  const index = value.indexOf('：')
  if (index <= 0 || index >= value.length - 1) return { head: '', tail: value }
  return { head: value.slice(0, index), tail: value.slice(index + 1) }
}
