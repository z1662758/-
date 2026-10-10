<template>
  <div class="rp-root">
    <!-- ===== 第一层:工具栏(在文稿之外,不参与打印) ===== -->
    <div class="rp-toolbar">
      <span v-if="isLegacy" class="rp-toolbar__tag">旧版报告</span>

      <div class="rp-toolbar__ops">
        <button
          v-if="structured"
          type="button"
          class="rp-ev-toggle"
          :class="{ 'is-open': showEvidence }"
          :aria-expanded="showEvidence"
          @click="showEvidence = !showEvidence"
        >
          <span class="rp-ev-toggle__label">证据溯源</span>
          <span class="rp-ev-toggle__hint">查看数据来源、分析依据与完整报告</span>
          <span class="rp-ev-toggle__arrow">{{ showEvidence ? '▴' : '▾' }}</span>
        </button>
        <el-button size="small" @click="copyReport">复制报告</el-button>
        <el-button size="small" type="primary" plain :disabled="!canExport" @click="exportPdf">
          导出PDF
        </el-button>
      </div>
    </div>

    <!-- 证据溯源面板同样在文稿之外:默认文稿页只有报告正文 -->
    <div v-if="structured && showEvidence" class="rp-panel-slot">
      <ReportEvidencePanel
        :report="structured"
        :artifact="envelope"
        :source-text="source.text"
        :audit="audit"
        @close="showEvidence = false"
      />
    </div>

    <!-- ===== 第二层:白色文稿页 ===== -->
    <div class="rp-page">
      <!-- 刊头 + 标题 + 元信息,页面顶部只出现一次正式标题 -->
      <ReportMasthead
        :title="title"
        :topic-line="topicLine"
        :meta-items="mastheadMeta"
        :badge-label="mastheadBadge"
        :note="reportStatus === 'partial' ? '部分阶段数据缺失，报告仅覆盖已完成阶段。' : ''"
      />

      <!-- ===== 正文:三段式正式报告 ===== -->
      <template v-if="structured">
        <ReportBriefView v-if="brief.parts.length" :report="brief" />

        <!-- 简版无法从后端章节文本组织出内容时,回退到完整分章渲染,不显示空白页 -->
        <template v-else>
          <ReportExecutiveSummary :summary="structured.executiveSummary" />

          <ReportChapter
            v-for="chapter in structured.chapters"
            :key="chapter.number"
            :chapter="chapter"
          />

          <ReportAppendix :report="structured" />
        </template>
      </template>

      <!-- ===== 旧版 Markdown 报告:走适配层,不重新生成 ===== -->
      <template v-else-if="legacyMarkdown">
        <div class="rp-legacy-note">
          这是本次改版之前生成的旧版报告，仅作展示；重新生成报告可获得结构化版本。
        </div>
        <article class="rp-markdown" v-html="legacyRendered"></article>
      </template>

      <el-empty v-else description="该任务没有报告内容" />
    </div>

    <!-- 结构化报告的打印专用版式 -->
    <ReportPrintSheet
      v-if="structured"
      :report="structured"
      :source-text="source.text"
      :badge-label="mastheadBadge"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { marked } from 'marked'
import { ElMessage } from 'element-plus'
import ReportExecutiveSummary from './ReportExecutiveSummary.vue'
import ReportChapter from './ReportChapter.vue'
import ReportAppendix from './ReportAppendix.vue'
import ReportBriefView from './ReportBriefView.vue'
import ReportEvidencePanel from './ReportEvidencePanel.vue'
import ReportMasthead from './ReportMasthead.vue'
import ReportPrintSheet from './ReportPrintSheet.vue'
import { buildBriefReport } from './reportBrief'
import { formatDate, isLegacyReport, reportSource } from './reportDisplay'

const props = defineProps({
  /** 兼容两种入参:artifact 信封(含 provenance/result) 或直接给 result */
  artifact: { type: Object, default: null },
  /** 'live' | 'example' */
  dataSource: { type: String, default: 'live' },
})

const envelope = computed(() =>
  props.artifact && Object.prototype.hasOwnProperty.call(props.artifact, 'result')
    ? props.artifact
    : { result: props.artifact, provenance: null },
)
const result = computed(() => envelope.value?.result || null)
const structured = computed(() => result.value?.structured || null)
const audit = computed(() => result.value?.qualityAudit || structured.value?.qualityAudit || null)

const isLegacy = computed(() => isLegacyReport(result.value))
const legacyMarkdown = computed(() => (isLegacy.value ? String(result.value?.content || '') : ''))
const legacyRendered = computed(() => marked(legacyMarkdown.value))

/**
 * 数据来源:优先用 artifact 的 provenance;旧 artifact 没有该字段时按取数模式补齐。
 */
const source = computed(() => {
  const provenance = envelope.value?.provenance
  if (provenance?.sourceType) return reportSource({ provenance })
  return reportSource({
    provenance: { sourceType: props.dataSource === 'example' ? 'example' : 'current_task' },
  })
})

const meta = computed(() => structured.value?.metadata || result.value?.metadata || {})
const title = computed(() => meta.value.title || '供应链风险与采购决策分析报告')
const reportStatus = computed(() => meta.value.status || result.value?.reportStatus || 'complete')
const canExport = computed(() => Boolean(structured.value || legacyMarkdown.value))

/**
 * 默认页只渲染三段式简版:
 * 报告自带 brief 时直接用它(案例包可以直接给出已经组织好的三段式正文),
 * 否则从后端章节文本里选取最重要的内容。
 */
const brief = computed(() => {
  const preset = structured.value?.brief
  if (preset && Array.isArray(preset.parts) && preset.parts.length) return preset
  return buildBriefReport(structured.value)
})

/** 证据溯源面板默认收起 */
const showEvidence = ref(false)

/**
 * 刊头右侧标识:案例报告固定显示「案例报告」,其他来源显示已有的来源文案。
 * 完整的案例编号不占刊头位置,放进元信息行。
 */
const mastheadBadge = computed(() => {
  const provenance = envelope.value?.provenance || {}
  if (provenance.sourceType === 'example' || props.dataSource === 'example') return '案例报告'
  return source.value.text
})

/** 主题标识:只有报告自带版面配置时才显示(案例报告带,通用报告不带) */
const topicLine = computed(() => String(structured.value?.document?.topicLine || ''))

/** 标题下的元信息行:只列后端确实给出的字段,不编造 */
/**
 * 标题下的元信息行:只保留生成日期与报告编号。
 * 数据截止与案例编号不上刊头(案例编号过长会抢标题的视觉重点),
 * 它们仍可在「证据溯源」的「数据来源与更新时间」里查到。
 */
const mastheadMeta = computed(() => {
  const value = meta.value || {}
  const items = []
  if (value.generatedAt) items.push({ label: '生成日期', value: formatDate(value.generatedAt) })
  if (value.taskId) items.push({ label: '报告编号', value: value.taskId })
  return items
})
async function copyReport() {
  const text = structured.value
    ? await buildPlainText()
    : legacyMarkdown.value
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('报告已复制')
  } catch {
    ElMessage.error('复制失败，请手动选择文本')
  }
}

/** 复制出去的也是可读中文,不是 JSON */
async function buildPlainText() {
  const { toMarkdown } = await import('@/views/SCnet/components/report/reportMarkdown')
  return toMarkdown(structured.value)
}

/** 导出当前报告:用打印专用版式 + 浏览器另存为 PDF(与方案页一致的做法) */
function exportPdf() {
  if (!canExport.value) return
  const taskNo = meta.value.taskId || 'report'
  const date = new Date().toISOString().slice(0, 10)
  const original = document.title
  document.title = `供应链分析报告_${taskNo}_${date}`
  const restore = () => {
    document.title = original
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  window.print()
  window.setTimeout(restore, 2000)
}
</script>

<style scoped>
/* ===== 统一字号体系:整个报告只在这里定义一次 ===== */
.rp-root {
  --rp-brand: #2563eb;
  --rp-brand-dark: #1d4ed8;
  --rp-brand-line: #bfdbfe;
  --rp-soft: #eff6ff;
  /* 分隔线与表格边框色。注意:行高请用 --rp-leading,
     两者曾共用 --rp-line 导致边框声明解析失败(border 宽度被丢弃)。 */
  --rp-line: #e2e8f0;
  --rp-ink: #0f172a;
  --rp-text: #334155;
  --rp-muted: #64748b;
  --rp-faint: #94a3b8;

  --rp-h2: 20px;      /* 章节标题 */
  --rp-h3: 15.5px;    /* 小节标题 */
  --rp-body: 15px;    /* 正文 */
  --rp-table: 14px;   /* 表格 */
  --rp-small: 12.5px; /* 注释与来源 */
  --rp-leading: 1.8;  /* 正文行高 */
  --rp-title: 26px;   /* 报告主标题 */
  --rp-chip: 12px;    /* 刊头标识 */
  /* 文稿主色:藏蓝;强调色:铜金(整页只用于刊头节点与标题短线) */
  --rp-navy: #1b3a5f;
  --rp-navy-soft: #2f5b86;
  --rp-accent: #b07d3a;

  min-height: 100%;
  padding: 22px 20px 64px;
  background: #eef2f7;
  box-sizing: border-box;
}

/* ===== 第一层:工具栏 + 证据溯源,都在文稿之外 ===== */
.rp-toolbar {
  max-width: 880px;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.rp-toolbar__tag {
  font-size: var(--rp-small);
  color: #475569;
  background: #f1f5f9;
  border: 1px solid var(--rp-line);
  border-radius: 999px;
  padding: 2px 10px;
}
.rp-toolbar__ops {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.rp-panel-slot { max-width: 880px; margin: 0 auto 18px; }

/* 「证据溯源」开关:与复制/导出同排 */
.rp-ev-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid var(--rp-line);
  border-radius: 6px;
  transition: border-color .15s, background .15s;
}
.rp-ev-toggle:hover { background: var(--rp-soft); border-color: var(--rp-brand-line); }
.rp-ev-toggle.is-open { background: var(--rp-soft); border-color: var(--rp-brand-line); }
.rp-ev-toggle__label { font-size: var(--rp-body); font-weight: 600; color: var(--rp-navy); }
.rp-ev-toggle__hint { font-size: var(--rp-small); color: var(--rp-muted); }
.rp-ev-toggle__arrow { font-size: var(--rp-small); color: var(--rp-faint); }

/* ===== 第二层:白色文稿页(刊头与标题样式见 ReportMasthead.vue) ===== */
.rp-page {
  position: relative;
  max-width: 880px;
  margin: 0 auto;
  padding: 40px 62px 56px;
  background: #fff;
  border: 1px solid #e4e9ef;
  border-radius: 3px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .04), 0 10px 28px rgba(15, 23, 42, .06);
}

/* ===== 旧版 Markdown ===== */
.rp-legacy-note {
  padding: 9px 14px;
  margin-bottom: 18px;
  font-size: var(--rp-small);
  color: #475569;
  background: #f8fafc;
  border: 1px solid var(--rp-line);
  border-radius: 8px;
}
.rp-markdown {
  font-size: var(--rp-body);
  line-height: var(--rp-leading);
  color: var(--rp-text);
}
.rp-markdown :deep(h1) { margin: 26px 0 12px; font-size: var(--rp-h2); color: var(--rp-ink); }
.rp-markdown :deep(h2) { margin: 22px 0 10px; font-size: var(--rp-h2); color: var(--rp-ink); }
.rp-markdown :deep(h3) { margin: 18px 0 8px; font-size: var(--rp-h3); color: var(--rp-ink); }
.rp-markdown :deep(p) { margin: 0 0 12px; }
.rp-markdown :deep(table) { width: 100%; border-collapse: collapse; font-size: var(--rp-table); margin-bottom: 14px; }
.rp-markdown :deep(th), .rp-markdown :deep(td) { padding: 8px 10px; border: 1px solid var(--rp-line); text-align: left; }
.rp-markdown :deep(th) { background: #f8fafc; color: var(--rp-muted); }
.rp-markdown :deep(li) { margin-bottom: 5px; }

/* ===== 窄屏:文稿宽度自适应,不出现横向滚动 ===== */
@media (max-width: 768px) {
  .rp-root { padding: 14px 12px 40px; --rp-title: 20px; }
  .rp-page { padding: 26px 20px 34px; border-radius: 2px; }
  .rp-toolbar__ops { margin-left: 0; width: 100%; }
  .rp-ev-toggle { flex: 1 1 auto; }
  .rp-ev-toggle__hint { display: none; }
}

/* ===== 打印:只输出文稿页(正文走 ReportPrintSheet),隐藏背景与操作按钮 ===== */
@media print {
  .rp-root { padding: 0; background: #fff; }
  .rp-toolbar,
  .rp-panel-slot { display: none !important; }
  .rp-page {
    max-width: none;
    padding: 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }
}
</style>
