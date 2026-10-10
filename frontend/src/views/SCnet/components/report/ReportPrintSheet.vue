<template>
  <Teleport to="body">
    <div class="report-print-sheet">
      <!-- ===== 专题文稿:与页面上的白色报告页同一份内容(刊头/标题/元信息/正文) ===== -->
      <article v-if="docBrief" class="rpp-doc">
        <ReportMasthead
          :title="report.metadata?.title || '供应链分析报告'"
          :topic-line="report.document?.topicLine || ''"
          :meta-items="metaItems"
          :badge-label="badgeLabel"
        />

        <ReportBriefView :report="docBrief" />
      </article>

      <template v-else>
        <header class="rpp-head">
          <h1>{{ report.metadata?.title || '供应链分析报告' }}</h1>
          <table class="rpp-meta">
            <tbody>
              <tr>
                <th>任务编号</th><td>{{ report.metadata?.taskId || '—' }}</td>
                <th>方案版本</th><td>v{{ report.metadata?.planVersion || 0 }}</td>
              </tr>
              <tr>
                <th>生成时间</th><td>{{ formatDate(report.metadata?.generatedAt) }}</td>
                <th>数据截止</th><td>{{ formatDate(report.metadata?.dataAsOf) }}</td>
              </tr>
              <tr>
                <th>报告来源</th><td colspan="3">{{ sourceText }}</td>
              </tr>
            </tbody>
          </table>
        </header>

        <section v-if="hasSummary" class="rpp-summary">
          <h2>决策摘要</h2>
          <ul>
            <li v-for="fact in facts" :key="fact.label"><b>{{ fact.label }}：</b>{{ fact.value }}</li>
          </ul>
          <ol v-if="findings.length" class="rpp-findings">
            <li v-for="(item, index) in findings" :key="index">{{ item }}</li>
          </ol>
        </section>

        <section v-for="chapter in report.chapters" :key="chapter.number" class="rpp-chapter">
          <h2><span class="rpp-chapter__num">{{ chapter.number }}</span>{{ chapter.title }}</h2>
          <p v-if="chapter.summary" class="rpp-chapter__summary">{{ chapter.summary }}</p>

          <div v-for="(section, index) in chapter.sections" :key="index" class="rpp-section">
            <h3 v-if="section.title">{{ section.title }}</h3>

            <p v-for="(text, i) in section.paragraphs || []" :key="`p-${i}`">{{ text }}</p>

            <ul v-if="section.type === 'keyFindings'">
              <li v-for="(item, i) in section.items || []" :key="`k-${i}`">{{ item }}</li>
            </ul>

            <ul v-else-if="section.type === 'callouts'">
              <li v-for="(item, i) in section.items || []" :key="`c-${i}`">
                <b>{{ calloutLabel(item.tone) }}：</b>{{ item.text }}
              </li>
            </ul>

            <ul v-else-if="section.type === 'metricCards'">
              <li v-for="(item, i) in section.items || []" :key="`m-${i}`">
                <b>{{ item.label }}：</b>{{ item.value }}<span v-if="item.note">（{{ item.note }}）</span>
              </li>
            </ul>

            <ol v-else-if="section.type === 'timeline'">
              <li v-for="(item, i) in section.items || []" :key="`t-${i}`">
                <b>{{ item.title }}</b><span v-if="item.time">（{{ item.time }}）</span>{{ item.detail ? '：' + item.detail : '' }}
              </li>
            </ol>

            <ul v-else-if="section.type === 'recommendations'">
              <li v-for="(item, i) in section.items || []" :key="`r-${i}`">
                <b>{{ item.title }}</b>{{ item.detail ? '：' + item.detail : '' }}
                <span v-if="item.trigger">（启动条件：{{ item.trigger }}）</span>
              </li>
            </ul>

            <table v-else-if="isTable(section)" class="rpp-table">
              <thead>
                <tr><th v-for="(column, i) in section.columns" :key="i">{{ column }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in rowsOf(section)" :key="i">
                  <td v-for="(cell, j) in row" :key="j">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="(report.sources || []).length" class="rpp-block">
          <h2>参考来源</h2>
          <ol class="rpp-sources">
            <li v-for="source in report.sources" :key="source.index">
              {{ source.name || '未标注来源机构' }}
              <span v-if="source.title">— {{ source.title }}</span>
              （{{ formatDate(source.publishedAt) }}）
              <span class="rpp-url">{{ source.url || '当前证据记录未提供可访问链接。' }}</span>
            </li>
          </ol>
        </section>

        <section v-if="(report.limitations || []).length" class="rpp-block">
          <h2>报告限制</h2>
          <ul><li v-for="(item, i) in report.limitations" :key="i">{{ item }}</li></ul>
        </section>

        <section class="rpp-block">
          <h2>数据与模型说明</h2>
          <ul v-if="(report.modelOutputs || []).length">
            <li v-for="(model, i) in report.modelOutputs" :key="i">
              <b>{{ model.modelName }}</b>：{{ model.output }}
              <span v-if="model.limitations">（限制：{{ model.limitations }}）</span>
            </li>
          </ul>
          <p v-else>本次没有可引用的模型输出。</p>
          <template v-if="(report.unavailableModelOutputs || []).length">
            <p class="rpp-note">以下内容本次未实际运行，报告未引用：</p>
            <ul>
              <li v-for="(item, i) in report.unavailableModelOutputs" :key="`u-${i}`">
                {{ item.name }}：{{ item.reason }}
              </li>
            </ul>
          </template>
        </section>

        <footer class="rpp-foot">
          <span>任务编号 {{ report.metadata?.taskId || '—' }}</span>
          <span>生成时间 {{ formatDate(report.metadata?.generatedAt) }}</span>
        </footer>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import ReportBriefView from './ReportBriefView.vue'
import ReportMasthead from './ReportMasthead.vue'
import { calloutTone, formatDate, normalizeRows } from './reportDisplay'

const props = defineProps({
  report: { type: Object, required: true },
  sourceText: { type: String, default: '' },
  /** 刊头右侧标识:案例报告 / 当前任务报告 */
  badgeLabel: { type: String, default: '' },
})

/** 报告自带三段式正文时,打印与页面上的白色报告页保持一致 */
const docBrief = computed(() => {
  const preset = props.report?.brief
  if (preset && Array.isArray(preset.parts) && preset.parts.length) return preset
  return null
})

/** 标题下的元信息行:与页面上的刊头一致(生成日期 + 报告编号) */
const metaItems = computed(() => {
  const meta = props.report?.metadata || {}
  const items = []
  if (meta.generatedAt) items.push({ label: '生成日期', value: formatDate(meta.generatedAt) })
  if (meta.taskId) items.push({ label: '报告编号', value: meta.taskId })
  return items
})

const FACT_FIELDS = [
  ['decision', '综合结论'], ['riskLevel', '风险等级'], ['priceTrend', '价格趋势'],
  ['recommendedVolume', '建议采购量'], ['recommendedWindow', '建议采购窗口'],
  ['confidence', '结论置信度'],
]

const facts = computed(() =>
  FACT_FIELDS
    .filter(([key]) => String(props.report?.executiveSummary?.[key] || '').trim())
    .map(([key, label]) => ({ label, value: props.report.executiveSummary[key] })),
)
const findings = computed(() => props.report?.executiveSummary?.keyFindings || [])
const hasSummary = computed(() => facts.value.length || findings.value.length)

const isTable = (section) => ['tables', 'riskMatrix', 'decisionMatrix'].includes(section?.type)
const rowsOf = (section) => normalizeRows(section?.columns || [], section?.rows || [])
const calloutLabel = (tone) => calloutTone(tone).label
</script>

<style>
@media screen {
  .report-print-sheet { display: none; }
}

/* ===== 专题文稿版式:与页面上的白色报告页一致,字号按 A4 纸面重新标定 ===== */
.rpp-doc {
  --rp-h2: 14pt;      /* 章节标题 */
  --rp-h3: 11pt;      /* 小节标题 */
  --rp-body: 10.5pt;  /* 正文 */
  --rp-table: 9pt;
  --rp-small: 8.5pt;
  --rp-leading: 1.75;
  --rp-title: 17pt;   /* 报告主标题 */
  --rp-chip: 8.5pt;
  --rp-ink: #0f172a;
  --rp-text: #334155;
  --rp-muted: #64748b;
  --rp-faint: #94a3b8;
  --rp-line: #cbd5e1;
  --rp-navy: #1b3a5f;
  --rp-navy-soft: #2f5b86;
  --rp-accent: #b07d3a;
  --rp-brand-line: #bfdbfe;
}

@media print {
  @page { size: A4 portrait; margin: 14mm 12mm; }

  /* 打印时只保留报告正文:左侧导航、进度浮窗、操作按钮都会被这行隐藏 */
  body > *:not(.report-print-sheet) { display: none !important; }
  .report-print-sheet { display: block !important; }

  .report-print-sheet {
    color: #0f172a;
    font-size: 10pt;
    line-height: 1.75;
  }
  .rpp-doc { break-inside: auto; }
  .rpp-head h1 { font-size: 17pt; margin: 0 0 8px; }
  .rpp-meta { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 14px; }
  .rpp-meta th, .rpp-meta td { border: 1px solid #cbd5e1; padding: 3px 6px; text-align: left; }
  .rpp-meta th { background: #f1f5f9; width: 62px; font-weight: 600; color: #334155; }

  .rpp-summary { margin-bottom: 14px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; break-inside: avoid; }
  .rpp-summary h2 { font-size: 12pt; margin: 0 0 6px; padding: 0; border: none; background: none; }
  .rpp-summary ul, .rpp-findings { margin: 0; padding-left: 16px; font-size: 9.5pt; }
  .rpp-summary li { margin-bottom: 3px; }

  /* 章节从新页开始,标题不与正文分离 */
  .rpp-chapter { break-before: page; }
  .rpp-chapter h2 {
    font-size: 14pt;
    margin: 0 0 8px;
    padding: 6px 10px;
    background: #eff6ff;
    border-left: 4px solid #2563eb;
    break-after: avoid;
  }
  .rpp-chapter__num { margin-right: 10px; color: #2563eb; font-weight: 800; }
  .rpp-chapter__summary { font-size: 9.5pt; color: #475569; margin: 0 0 10px; break-after: avoid; }
  .rpp-section h3 { font-size: 11pt; margin: 12px 0 5px; color: #1e3a8a; break-after: avoid; }
  .rpp-section p { margin: 0 0 7px; text-align: justify; }
  .rpp-section ul, .rpp-section ol { margin: 0 0 8px; padding-left: 18px; }
  .rpp-section li { margin-bottom: 4px; }

  .rpp-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 10px; }
  .rpp-table th, .rpp-table td { border: 1px solid #cbd5e1; padding: 3px 5px; text-align: left; vertical-align: top; }
  .rpp-table th { background: #f1f5f9; font-weight: 600; }
  .rpp-table tr { break-inside: avoid; }

  .rpp-block { break-before: page; }
  .rpp-block h2 { font-size: 13pt; margin: 0 0 8px; break-after: avoid; }
  .rpp-block li { margin-bottom: 4px; }
  .rpp-sources { padding-left: 16px; font-size: 8.5pt; }
  .rpp-url { color: #475569; word-break: break-all; display: block; }
  .rpp-note { margin: 8px 0 4px; color: #b45309; }

  .rpp-foot {
    margin-top: 14px;
    padding-top: 6px;
    border-top: 1px solid #e2e8f0;
    font-size: 8pt;
    color: #64748b;
    display: flex;
    justify-content: space-between;
  }
}
</style>
