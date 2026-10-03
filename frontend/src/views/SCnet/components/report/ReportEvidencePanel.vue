<template>
  <section class="rp-ev">
    <header class="rp-ev__top">
      <div>
        <h2 class="rp-ev__title">证据溯源</h2>
        <p class="rp-ev__sub">查看数据来源、分析依据与完整报告</p>
      </div>
      <el-button size="small" @click="$emit('close')">收起</el-button>
    </header>

    <!-- ============ 一、数据来源与更新时间 ============ -->
    <article class="rp-ev__block">
      <h3 class="rp-ev__h">一、数据来源与更新时间</h3>
      <dl class="rp-ev__facts">
        <div><dt>报告来源</dt><dd>{{ sourceText || '—' }}</dd></div>
        <div><dt>生成时间</dt><dd>{{ formatDate(meta.generatedAt) }}</dd></div>
        <div><dt>数据截止</dt><dd>{{ formatDate(meta.dataAsOf) }}</dd></div>
        <div><dt>任务编号</dt><dd>{{ meta.taskId || '—' }}</dd></div>
        <div><dt>方案版本</dt><dd>v{{ meta.planVersion || 0 }}</dd></div>
        <div v-if="exampleId"><dt>案例编号</dt><dd>{{ exampleId }}</dd></div>
        <div v-if="technical.snapshotId"><dt>数据快照</dt><dd>{{ technical.snapshotId }}</dd></div>
      </dl>

      <h4 class="rp-ev__h4">本次任务启用的数据源</h4>
      <ul v-if="dataSources.length" class="rp-ev__list">
        <li v-for="(item, index) in dataSources" :key="`ds-${index}`">
          {{ item.name }}<span v-if="item.resourceId" class="rp-ev__id">{{ item.resourceId }}</span>
        </li>
      </ul>
      <p v-else class="rp-ev__empty">本次任务未记录启用的数据源清单。</p>

      <h4 class="rp-ev__h4">本次任务启用的模型</h4>
      <ul v-if="models.length" class="rp-ev__list">
        <li v-for="(item, index) in models" :key="`m-${index}`">
          {{ item.name }}<span v-if="item.capability" class="rp-ev__id">{{ item.capability }}</span>
        </li>
      </ul>
      <p v-else class="rp-ev__empty">本次任务未记录启用的模型清单。</p>
    </article>

    <!-- ============ 二、涉及的关键对象与事实 ============ -->
    <article v-if="factEvidence.length" class="rp-ev__block">
      <h3 class="rp-ev__h">二、涉及的关键对象与事实</h3>
      <p class="rp-ev__lead">
        以下条目来自本次分析实际使用的供应链节点、国家、运输路线与市场记录，
        是报告正文中事实性表述的依据。
      </p>
      <ul class="rp-ev__items">
        <li v-for="(item, index) in factEvidence" :key="`fe-${index}`">
          <p class="rp-ev__item-head">
            {{ item.statement || '未标注陈述' }}
            <span v-if="item.informationType" class="rp-ev__tag">{{ item.informationType }}</span>
          </p>
          <p class="rp-ev__item-body">{{ item.value || '—' }}</p>
          <p v-if="item.sourceRefs && item.sourceRefs.length" class="rp-ev__item-meta">
            依据来源：{{ item.sourceRefs.map((ref) => `[${ref}]`).join(' ') }}
          </p>
        </li>
      </ul>
    </article>

    <!-- ============ 三、关键指标及计算依据 ============ -->
    <article v-if="hasMetrics" class="rp-ev__block">
      <h3 class="rp-ev__h">三、关键指标及计算依据</h3>

      <dl v-if="summaryFacts.length" class="rp-ev__facts">
        <div v-for="fact in summaryFacts" :key="fact.label">
          <dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd>
        </div>
      </dl>

      <div v-if="metricCards.length" class="rp-ev__table-wrap">
        <table class="rp-ev__table">
          <thead>
            <tr><th>指标</th><th>取值</th><th>说明</th></tr>
          </thead>
          <tbody>
            <tr v-for="(card, index) in metricCards" :key="`mc-${index}`">
              <td>{{ card.label }}</td>
              <td>{{ card.value }}</td>
              <td>{{ card.note || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="rp-ev__lead">
        指标口径与计算依据来自下方「数据与模型说明」中本次实际运行的模型输入与输出；
        未实际运行的能力不会出现在本报告中。
      </p>
    </article>

    <!-- ============ 四、风险判断依据 ============ -->
    <article v-if="hasRiskBasis" class="rp-ev__block">
      <h3 class="rp-ev__h">四、风险判断依据</h3>

      <ul v-if="riskEvidence.length" class="rp-ev__items">
        <li v-for="(item, index) in riskEvidence" :key="`re-${index}`">
          <p class="rp-ev__item-head">
            {{ item.statement || '未标注陈述' }}
            <span class="rp-ev__tag">{{ item.informationType || '模型输出' }}</span>
          </p>
          <p class="rp-ev__item-body">{{ item.value || '—' }}</p>
        </li>
      </ul>

      <div v-for="(section, index) in riskSections" :key="`rs-${index}`" class="rp-ev__table-wrap">
        <p v-if="section.title" class="rp-ev__table-title">{{ section.title }}</p>
        <table class="rp-ev__table">
          <thead>
            <tr><th v-for="(column, ci) in section.columns" :key="ci">{{ column }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in section.rows" :key="ri">
              <td v-for="(cell, ci) in row" :key="ci">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul v-if="riskCallouts.length" class="rp-ev__list">
        <li v-for="(item, index) in riskCallouts" :key="`rc-${index}`">
          <b>{{ calloutTone(item.tone).label }}：</b>{{ item.text }}
        </li>
      </ul>
    </article>

    <!-- ============ 五、事实、分析与预测的区分 ============ -->
    <article v-if="evidence.length" class="rp-ev__block">
      <h3 class="rp-ev__h">五、事实、分析与预测的区分</h3>
      <p class="rp-ev__lead">
        已核实事实：有来源支撑的既成事实；模型输出：由本次启用的模型计算得出，可复现但依赖输入假设；
        情报判断：来源不完整、仍需进一步验证。以下逐条标注信息性质与证据可信度。
      </p>
      <div class="rp-ev__table-wrap">
        <table class="rp-ev__table">
          <thead>
            <tr><th>陈述</th><th>取值 / 说明</th><th>信息性质</th><th>证据可信度</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in evidence" :key="`ev-${index}`">
              <td>{{ item.statement || '—' }}</td>
              <td>{{ item.value || '—' }}</td>
              <td>{{ item.informationType || '—' }}</td>
              <td>{{ item.credibility || '—' }}</td>
              <td>{{ item.state || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <!-- ============ 六、报告完整正文 ============ -->
    <article class="rp-ev__block">
      <h3 class="rp-ev__h">六、报告完整正文</h3>
      <p class="rp-ev__lead">
        默认页只展示三段式简版；这里保留后端产出的完整分章报告，「复制报告」与「导出PDF」使用的也是这一份。
      </p>
      <details class="rp-ev__details">
        <summary>展开完整分章报告（{{ chapters.length }} 章）</summary>
        <div class="rp-ev__full">
          <ReportChapter
            v-for="chapter in chapters"
            :key="chapter.number"
            :chapter="chapter"
          />
        </div>
      </details>
    </article>

    <!-- ============ 七、生成阶段记录 ============ -->
    <article class="rp-ev__block">
      <h3 class="rp-ev__h">七、生成阶段记录</h3>
      <div class="rp-ev__table-wrap">
        <table class="rp-ev__table">
          <thead>
            <tr><th>阶段</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr v-for="stage in stageRows" :key="stage.key">
              <td>{{ stage.label }}</td>
              <td>{{ stage.status }}</td>
            </tr>
            <tr v-if="!stageRows.length">
              <td colspan="2">本次任务未记录阶段状态。</td>
            </tr>
          </tbody>
        </table>
      </div>
      <dl class="rp-ev__facts">
        <div><dt>阶段开始</dt><dd>{{ formatDate(artifact?.startedAt) }}</dd></div>
        <div><dt>阶段完成</dt><dd>{{ formatDate(artifact?.completedAt) }}</dd></div>
        <div v-if="audit" class="rp-ev__audit">
          <dt>质量审计</dt>
          <dd>
            {{ audit.passed ? '通过' : '存在问题' }}
            <span v-if="!audit.passed">（{{ (audit.issues || []).length }} 项待改进）</span>
          </dd>
        </div>
      </dl>
    </article>

    <!-- ============ 附:参考来源、模型说明与报告限制(自带标题,不占编号) ============ -->
    <article class="rp-ev__block">
      <ReportAppendix :report="report" />
    </article>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import ReportChapter from './ReportChapter.vue'
import ReportAppendix from './ReportAppendix.vue'
import { calloutTone, formatDate, normalizeRows } from './reportDisplay'

const props = defineProps({
  /** 后端产出的结构化报告 */
  report: { type: Object, required: true },
  /** 阶段产物信封:取数据源/模型/时间等运行元信息 */
  artifact: { type: Object, default: null },
  /** 报告来源文案(当前任务 / 案例) */
  sourceText: { type: String, default: '' },
  audit: { type: Object, default: null },
})

defineEmits(['close'])

/** 与决策摘要、打印版保持一致的结论字段顺序 */
const SUMMARY_FACT_FIELDS = [
  ['decision', '综合结论'],
  ['riskLevel', '风险等级'],
  ['priceTrend', '价格趋势'],
  ['recommendedVolume', '建议采购量'],
  ['recommendedWindow', '建议采购窗口'],
  ['confidence', '结论置信度'],
]

const STAGE_LABELS = {
  osint: '开源情报',
  judgment: '态势研判',
  prediction: '态势预测',
  report: '报告生成',
}

const STATUS_LABELS = {
  completed: '已完成',
  running: '进行中',
  failed: '失败',
  pending: '待运行',
  queued: '排队中',
  waiting: '等待中',
}

const meta = computed(() => props.report?.metadata || {})
const technical = computed(() => props.report?.technicalDetails || {})
const chapters = computed(() => props.report?.chapters || [])
const evidence = computed(() => props.report?.evidence || [])

const dataSources = computed(() => props.artifact?.dataSourcesUsed || [])
const models = computed(() => props.artifact?.modelsUsed || [])
/** 案例编号:来自案例包 provenance,只展示不改动 */
const exampleId = computed(() => String(props.artifact?.provenance?.exampleId || ''))

/** 模型输出之外的都是既成事实或待验证情报,单独成块展示依据 */
const isModelOutput = (item) => String(item?.informationType || '').includes('模型')
const factEvidence = computed(() => evidence.value.filter((item) => !isModelOutput(item)))
const riskEvidence = computed(() => evidence.value.filter(isModelOutput))

/** 结论字段:只显示后端确实给出的项 */
const summaryFacts = computed(() =>
  SUMMARY_FACT_FIELDS.filter(([key]) => String(props.report?.executiveSummary?.[key] || '').trim())
    .map(([key, label]) => ({ label, value: props.report.executiveSummary[key] })),
)

/** 指标卡:决策摘要里的 + 各章正文里的,按「标签+取值」去重 */
const metricCards = computed(() => {
  const seen = new Set()
  const out = []
  const push = (card) => {
    if (!card || !card.label) return
    const key = `${card.label}|${card.value}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ label: card.label, value: card.value, note: card.note || '' })
  }
  ;(props.report?.executiveSummary?.metricCards || []).forEach(push)
  chapters.value.forEach((chapter) => {
    ;(chapter.sections || []).forEach((section) => {
      if (section?.type === 'metricCards') (section.items || []).forEach(push)
    })
  })
  return out
})

const hasMetrics = computed(() => summaryFacts.value.length > 0 || metricCards.value.length > 0)

/** 风险矩阵/决策矩阵:风险等级判断的表格依据 */
const riskSections = computed(() => {
  const out = []
  chapters.value.forEach((chapter) => {
    ;(chapter.sections || []).forEach((section) => {
      if (!['riskMatrix', 'decisionMatrix'].includes(section?.type)) return
      out.push({
        title: section.title || '',
        columns: section.columns || [],
        rows: normalizeRows(section.columns || [], section.rows || []),
      })
    })
  })
  return out
})

/** 风险相关的提示条 */
const riskCallouts = computed(() => {
  const out = []
  chapters.value.forEach((chapter) => {
    ;(chapter.sections || []).forEach((section) => {
      if (section?.type !== 'callouts') return
      ;(section.items || []).forEach((item) => {
        if (['warning', 'limited'].includes(String(item?.tone || ''))) out.push(item)
      })
    })
  })
  return out
})

const hasRiskBasis = computed(
  () => riskEvidence.value.length > 0 || riskSections.value.length > 0 || riskCallouts.value.length > 0,
)

const stageRows = computed(() => {
  const statuses = technical.value.stageStatuses
  if (!statuses || typeof statuses !== 'object') return []
  return Object.entries(statuses).map(([key, value]) => ({
    key,
    label: STAGE_LABELS[key] || key,
    status: STATUS_LABELS[String(value)] || String(value ?? '—'),
  }))
})
</script>

<style scoped>
.rp-ev {
  margin-bottom: 28px;
  padding: 20px 22px 22px;
  background: #fbfcfe;
  border: 1px solid var(--rp-line);
  border-top: 3px solid var(--rp-brand);
  border-radius: 10px;
}
.rp-ev__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--rp-line);
}
.rp-ev__title { margin: 0 0 4px; font-size: 19px; font-weight: 700; color: var(--rp-ink); }
.rp-ev__sub { margin: 0; font-size: var(--rp-small); color: var(--rp-muted); }

.rp-ev__block { margin-bottom: 26px; }
.rp-ev__block:last-child { margin-bottom: 0; }
.rp-ev__h {
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 3px solid var(--rp-brand);
  font-size: var(--rp-h3);
  font-weight: 700;
  color: var(--rp-ink);
}
.rp-ev__h4 {
  margin: 16px 0 7px;
  font-size: var(--rp-small);
  font-weight: 600;
  color: var(--rp-muted);
}
.rp-ev__lead {
  margin: 0 0 12px;
  font-size: var(--rp-small);
  line-height: 1.75;
  color: var(--rp-muted);
}
.rp-ev__empty { margin: 0; font-size: var(--rp-small); color: var(--rp-faint); }

.rp-ev__facts { margin: 0; font-size: var(--rp-body); }
.rp-ev__facts > div { display: flex; gap: 12px; margin-bottom: 6px; }
.rp-ev__facts dt { min-width: 76px; flex-shrink: 0; color: var(--rp-faint); }
.rp-ev__facts dd { margin: 0; color: var(--rp-text); line-height: 1.7; }
.rp-ev__audit dd { color: var(--rp-text); }

.rp-ev__list { margin: 0; padding-left: 18px; font-size: var(--rp-body); color: var(--rp-text); line-height: 1.8; }
.rp-ev__list li { margin-bottom: 4px; }
.rp-ev__id {
  margin-left: 8px;
  font-size: var(--rp-small);
  color: var(--rp-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.rp-ev__items { list-style: none; margin: 0; padding: 0; }
.rp-ev__items > li {
  padding: 9px 0;
  border-bottom: 1px dashed var(--rp-line);
}
.rp-ev__items > li:last-child { border-bottom: none; }
.rp-ev__item-head {
  margin: 0 0 3px;
  font-size: var(--rp-body);
  font-weight: 600;
  color: var(--rp-ink);
}
.rp-ev__item-body { margin: 0; font-size: var(--rp-small); line-height: 1.75; color: var(--rp-text); }
.rp-ev__item-meta { margin: 4px 0 0; font-size: var(--rp-small); color: var(--rp-faint); }
.rp-ev__tag {
  margin-left: 8px;
  padding: 0 8px;
  font-size: var(--rp-small);
  font-weight: 400;
  color: var(--rp-brand-dark);
  background: var(--rp-soft);
  border-radius: 999px;
}

.rp-ev__table-wrap { overflow-x: auto; margin-bottom: 12px; }
.rp-ev__table-title { margin: 0 0 6px; font-size: var(--rp-small); font-weight: 600; color: var(--rp-muted); }
.rp-ev__table { width: 100%; border-collapse: collapse; font-size: var(--rp-small); background: #fff; }
.rp-ev__table th,
.rp-ev__table td {
  padding: 7px 9px;
  border: 1px solid var(--rp-line);
  text-align: left;
  vertical-align: top;
  line-height: 1.65;
  word-break: break-word;
}
.rp-ev__table th { background: #f1f5f9; color: var(--rp-muted); font-weight: 600; white-space: nowrap; }

.rp-ev__details {
  padding: 10px 14px;
  background: #fff;
  border: 1px solid var(--rp-line);
  border-radius: 8px;
}
.rp-ev__details summary {
  cursor: pointer;
  font-size: var(--rp-body);
  font-weight: 600;
  color: var(--rp-brand-dark);
}
.rp-ev__full { margin-top: 18px; }

@media print {
  .rp-ev { display: none; }
}
</style>
