/**
 * 结构化报告 → 可读 Markdown。
 *
 * 用于「复制报告」:复制出去的应该是人能读的中文,不是 JSON。
 * 与后端 report_builder.to_markdown 保持同样的章节结构。
 */

function sectionToMarkdown(section) {
  const lines = []
  const title = section?.title
  if (title) lines.push(`### ${title}`, '')

  switch (section?.type) {
    case 'paragraphs':
      (section.paragraphs || []).forEach((text) => lines.push(String(text), ''))
      break
    case 'keyFindings':
    case 'callouts':
      (section.items || []).forEach((item) => {
        if (typeof item === 'string') lines.push(`- ${item}`)
        else if (item?.text) lines.push(`- ${item.text}`)
        else if (item?.title) lines.push(`- ${item.title}`)
      })
      lines.push('')
      break
    case 'tables':
    case 'riskMatrix':
    case 'decisionMatrix': {
      const columns = section.columns || []
      if (columns.length) {
        lines.push(`| ${columns.join(' | ')} |`)
        lines.push(`|${'---|'.repeat(columns.length)}`)
        ;(section.rows || []).forEach((row) => lines.push(`| ${row.join(' | ')} |`))
        lines.push('')
      }
      break
    }
    case 'metricCards':
      (section.items || []).forEach((item) =>
        lines.push(`- ${item.label}：${item.value}${item.note ? `（${item.note}）` : ''}`),
      )
      lines.push('')
      break
    case 'timeline':
      (section.items || []).forEach((item) =>
        lines.push(`- ${item.time || ''} ${item.title || ''}：${item.detail || ''}`),
      )
      lines.push('')
      break
    case 'recommendations':
      (section.items || []).forEach((item) => {
        lines.push(`- **${item.title}**：${item.detail || ''}`)
        const meta = ['priority', 'owner', 'trigger', 'metric', 'timing']
          .filter((key) => item[key])
          .map((key) => `${key}=${item[key]}`)
        if (meta.length) lines.push(`  （${meta.join('；')}）`)
      })
      lines.push('')
      break
    default:
      break
  }
  return lines
}

export function toMarkdown(report) {
  if (!report) return ''
  const out = []
  const meta = report.metadata || {}
  out.push(`# ${meta.title || '供应链分析报告'}`, '')
  out.push(`- 任务编号：${meta.taskId || '—'}`)
  out.push(`- 方案版本：v${meta.planVersion || 0}`)
  out.push(`- 生成时间：${meta.generatedAt || '—'}`)
  if (meta.dataAsOf) out.push(`- 数据截止：${meta.dataAsOf}`)
  if (meta.status === 'partial') out.push('- **报告状态：部分阶段数据缺失**')
  out.push('')

  const summary = report.executiveSummary || {}
  if (Object.keys(summary).length) {
    out.push('## 决策摘要', '')
    ;[
      ['综合结论', 'decision'],
      ['风险等级', 'riskLevel'],
      ['价格趋势', 'priceTrend'],
      ['建议采购量', 'recommendedVolume'],
      ['建议采购窗口', 'recommendedWindow'],
      ['结论置信度', 'confidence'],
    ].forEach(([label, key]) => {
      if (summary[key]) out.push(`- ${label}：${summary[key]}`)
    })
    ;(summary.metricCards || []).forEach((c) =>
      out.push(`- ${c.label}：${c.value}${c.note ? `（${c.note}）` : ''}`),
    )
    if ((summary.keyFindings || []).length) {
      out.push('', '核心结论：')
      summary.keyFindings.forEach((item, index) => out.push(`${index + 1}. ${item}`))
    }
    out.push('')
  }

  ;(report.chapters || []).forEach((chapter) => {
    out.push(`## ${chapter.number} ${chapter.title}`, '')
    if (chapter.summary) out.push(`> ${chapter.summary}`, '')
    ;(chapter.sections || []).forEach((section) => out.push(...sectionToMarkdown(section)))
  })

  if ((report.sources || []).length) {
    out.push('## 参考来源', '')
    report.sources.forEach((source) => {
      const parts = [`${source.index}. ${source.name || '未标注来源机构'}`]
      if (source.title) parts.push(`— ${source.title}`)
      parts.push(`（${source.publishedAt || '时间未标注'}）`)
      parts.push(source.url || '当前证据记录未提供可访问链接。')
      out.push(parts.join(' '))
    })
    out.push('')
  }

  if ((report.limitations || []).length) {
    out.push('## 报告限制', '')
    report.limitations.forEach((item) => out.push(`- ${item}`))
    out.push('')
  }

  out.push('## 数据与模型说明', '')
  if ((report.modelOutputs || []).length) {
    report.modelOutputs.forEach((model) => out.push(`- ${model.modelName}：${model.output}`))
  } else {
    out.push('- 本次没有可引用的模型输出。')
  }
  if ((report.unavailableModelOutputs || []).length) {
    out.push('', '以下内容本次未实际运行，报告未引用：')
    report.unavailableModelOutputs.forEach((item) => out.push(`- ${item.name}：${item.reason}`))
  }
  return out.join('\n').trim()
}
