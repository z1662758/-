<template>
  <article class="rp-brief">
    <section v-for="part in parts" :key="part.title" class="rp-brief__part">
      <h2 class="rp-brief__head">
        <span class="rp-brief__num">{{ part.number }}、</span>{{ part.title }}
      </h2>

      <p v-if="part.lead" class="rp-brief__p">{{ part.lead }}</p>
      <p v-for="(paragraph, index) in part.paragraphs" :key="`p-${index}`" class="rp-brief__p">
        {{ paragraph }}
      </p>

      <!-- 一、核心事实:编号 + 完整句子,不做指标卡 -->
      <ol v-if="part.kind === 'facts' && part.rows.length" class="rp-brief__facts">
        <li v-for="(row, index) in part.rows" :key="`f-${index}`">
          <span class="rp-brief__fact-index">{{ index + 1 }}.</span>
          <p class="rp-brief__fact-text">
            <b v-if="row.head">{{ row.head }}：</b>{{ row.tail }}
          </p>
        </li>
      </ol>

      <!-- 三、应对建议:（一）（二）（三）分小节,每条一段简短说明 -->
      <div v-else-if="part.kind === 'advice'" class="rp-brief__advice">
        <section v-for="(item, index) in part.items" :key="`a-${index}`" class="rp-brief__advice-item">
          <h3 v-if="item.title" class="rp-brief__sub">
            <span v-if="item.ordinal" class="rp-brief__ordinal">{{ item.ordinal }}</span>{{ item.title }}
          </h3>
          <p
            v-for="(paragraph, pi) in adviceParagraphs(item)"
            :key="`ap-${pi}`"
            class="rp-brief__p"
          >
            <b v-if="pi === 0 && !item.title && item.ordinal">{{ item.ordinal }}</b>{{ paragraph }}
          </p>
        </section>

        <!-- 结语:全文唯一使用底色的正文区域 -->
        <div v-if="part.closingRow" class="rp-brief__closing">
          <p>
            <b v-if="part.closingRow.head">{{ part.closingRow.head }}：</b>{{ part.closingRow.tail }}
          </p>
        </div>
      </div>

      <p v-if="part.note" class="rp-brief__note">{{ part.note }}</p>
    </section>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { splitFact } from './reportBrief'

const props = defineProps({
  /** buildBriefReport() 的结果 */
  report: { type: Object, required: true },
})

/** 事实行与结语预先拆成「标签 / 正文」,便于把标签加粗突出结论 */
const parts = computed(() =>
  (props.report?.parts || []).map((part) => {
    if (part.kind === 'facts') return { ...part, rows: (part.facts || []).map(splitFact) }
    if (part.kind === 'advice' && part.closing) return { ...part, closingRow: splitFact(part.closing) }
    return part
  }),
)

/** 建议小节可以有多段(案例正文按小节给出多段),兼容只有单段 detail 的报告 */
function adviceParagraphs(item) {
  if (Array.isArray(item?.paragraphs) && item.paragraphs.length) return item.paragraphs
  return item?.detail ? [item.detail] : []
}
</script>

<style scoped>
.rp-brief__part { margin-bottom: 34px; }
.rp-brief__part:last-child { margin-bottom: 0; }

/* 一级章节:一、二、三。深蓝竖线 + 深蓝序号做标识,章节名保持易读 */
.rp-brief__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 15px;
  padding-left: 12px;
  border-left: 3px solid var(--rp-navy, var(--rp-brand-dark));
  font-size: var(--rp-h2);
  font-weight: 700;
  color: var(--rp-ink);
  line-height: 1.5;
  letter-spacing: .01em;
}
.rp-brief__num {
  flex-shrink: 0;
  color: var(--rp-navy, var(--rp-brand-dark));
  font-variant-numeric: tabular-nums;
}

/* 正文段落:首行缩进两字,行距放宽,整份报告统一 */
.rp-brief__p {
  margin: 0 0 13px;
  font-size: var(--rp-body);
  line-height: var(--rp-leading);
  color: var(--rp-text);
  text-align: justify;
  text-indent: 2em;
}
.rp-brief__p:last-child { margin-bottom: 0; }

/* 核心事实:编号 + 句子,不做卡片 */
.rp-brief__facts { list-style: none; margin: 0; padding: 0; }
.rp-brief__facts li { display: flex; gap: 8px; margin-bottom: 10px; }
.rp-brief__facts li:last-child { margin-bottom: 0; }
.rp-brief__fact-index {
  flex-shrink: 0;
  padding-top: 2px;
  font-size: var(--rp-body);
  font-weight: 700;
  color: var(--rp-navy, var(--rp-brand-dark));
  font-variant-numeric: tabular-nums;
}
.rp-brief__fact-text {
  margin: 0;
  font-size: var(--rp-body);
  line-height: var(--rp-leading);
  color: var(--rp-text);
  text-align: justify;
}
.rp-brief__fact-text b { color: var(--rp-ink); }

/* 建议小节:（一）（二）（三）。次级样式,比章节标题轻 */
.rp-brief__advice { display: flex; flex-direction: column; gap: 17px; }
.rp-brief__sub {
  margin: 0 0 7px;
  font-size: var(--rp-h3);
  font-weight: 600;
  color: var(--rp-navy-soft, #2f5b86);
  line-height: 1.6;
  letter-spacing: .01em;
}
.rp-brief__ordinal { margin-right: 2px; color: inherit; }
.rp-brief__advice-item .rp-brief__p:last-child { margin-bottom: 0; }

/* 结语:全文唯一使用底色的正文区域。带细边框,打印未开启"背景图形"时仍能看出结语范围 */
.rp-brief__closing {
  margin-top: 4px;
  padding: 14px 18px;
  background: #f1f6fc;
  border: 1px solid #dbe7f6;
  border-left: 3px solid var(--rp-navy, var(--rp-brand-dark));
}
.rp-brief__closing p {
  margin: 0;
  font-size: var(--rp-body);
  line-height: var(--rp-leading);
  color: var(--rp-ink);
  text-align: justify;
  text-indent: 0;
}

/* 事实/分析/预测的区分说明 */
.rp-brief__note {
  margin: 16px 0 0;
  padding-left: 12px;
  border-left: 3px solid var(--rp-brand-line);
  font-size: var(--rp-small);
  line-height: 1.75;
  color: var(--rp-muted);
}

@media print {
  /* 章节标题不与正文分离,段落不留孤行 */
  .rp-brief__head { break-after: avoid; break-inside: avoid; }
  .rp-brief__sub { break-after: avoid; break-inside: avoid; }
  .rp-brief__p { orphans: 3; widows: 3; }
  .rp-brief__facts li,
  .rp-brief__advice-item,
  .rp-brief__closing { break-inside: avoid; }
  .rp-brief__note { display: none; }
}
</style>
