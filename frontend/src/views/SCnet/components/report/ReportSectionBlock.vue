<template>
  <section class="rp-block">
    <h3 v-if="title" class="rp-block__title">{{ title }}</h3>

    <div v-if="type === 'paragraphs'" class="rp-paragraphs">
      <p v-for="(text, index) in items" :key="index">{{ text }}</p>
    </div>

    <ul v-else-if="type === 'keyFindings'" class="rp-findings">
      <li v-for="(text, index) in items" :key="index">
        <span class="rp-findings__index">{{ index + 1 }}</span>
        <span>{{ text }}</span>
      </li>
    </ul>

    <div v-else-if="type === 'metricCards'" class="rp-metrics">
      <div v-for="(card, index) in items" :key="index" class="rp-metric">
        <span class="rp-metric__label">{{ card.label }}</span>
        <span class="rp-metric__value">{{ card.value }}</span>
        <span v-if="card.note" class="rp-metric__note">{{ card.note }}</span>
      </div>
    </div>

    <div v-else-if="type === 'callouts'" class="rp-callouts">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="rp-callout"
        :class="calloutTone(item.tone).className"
      >
        <span class="rp-callout__label">{{ calloutTone(item.tone).label }}</span>
        <p>{{ item.text }}</p>
      </div>
    </div>

    <ol v-else-if="type === 'timeline'" class="rp-timeline">
      <li v-for="(item, index) in items" :key="index" class="rp-timeline__item">
        <span class="rp-timeline__marker"></span>
        <div class="rp-timeline__body">
          <div class="rp-timeline__head">
            <b>{{ item.title }}</b>
            <span v-if="item.time" class="rp-timeline__time">{{ item.time }}</span>
          </div>
          <p v-if="item.detail" class="rp-timeline__detail">{{ item.detail }}</p>
        </div>
      </li>
    </ol>

    <div v-else-if="type === 'recommendations'" class="rp-recs">
      <article v-for="(item, index) in items" :key="index" class="rp-rec">
        <header class="rp-rec__head">
          <b>{{ item.title }}</b>
          <span v-if="item.priority" class="rp-rec__priority">{{ item.priority }}</span>
        </header>
        <p v-if="item.detail" class="rp-rec__detail">{{ item.detail }}</p>
        <dl v-if="hasRecMeta(item)" class="rp-rec__meta">
          <div v-if="item.trigger"><dt>启动条件</dt><dd>{{ item.trigger }}</dd></div>
          <div v-if="item.metric"><dt>监控指标</dt><dd>{{ item.metric }}</dd></div>
          <div v-if="item.owner"><dt>责任环节</dt><dd>{{ item.owner }}</dd></div>
          <div v-if="item.timing"><dt>执行时间</dt><dd>{{ item.timing }}</dd></div>
        </dl>
      </article>
    </div>

    <div v-else-if="isTableType" class="rp-table-wrap">
      <table class="rp-table" :class="`is-${type}`">
        <thead>
          <tr>
            <th v-for="(column, index) in columns" :key="index">{{ column }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
            <td
              v-for="(cell, cellIndex) in row"
              :key="cellIndex"
              :class="{ 'is-numeric': isNumericCell(cell) }"
            >{{ cell }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { calloutTone, isNumericCell, normalizeRows } from './reportDisplay'

const props = defineProps({
  section: { type: Object, required: true },
})

const type = computed(() => props.section?.type || 'paragraphs')
const title = computed(() => props.section?.title || '')
const items = computed(() => props.section?.items || props.section?.paragraphs || [])
const columns = computed(() => props.section?.columns || [])
const rows = computed(() => normalizeRows(columns.value, props.section?.rows || []))
const isTableType = computed(() => ['tables', 'riskMatrix', 'decisionMatrix'].includes(type.value))

const hasRecMeta = (item) => Boolean(item?.trigger || item?.metric || item?.owner || item?.timing)
</script>

<style scoped>
.rp-block { margin-bottom: 22px; }
.rp-block__title {
  margin: 0 0 10px;
  font-size: var(--rp-h3);
  font-weight: 600;
  color: var(--rp-ink);
  line-height: 1.45;
}

.rp-paragraphs p {
  margin: 0 0 12px;
  font-size: var(--rp-body);
  line-height: var(--rp-leading);
  color: var(--rp-text);
  text-align: justify;
}
.rp-paragraphs p:last-child { margin-bottom: 0; }

.rp-findings { list-style: none; margin: 0; padding: 0; }
.rp-findings li {
  display: flex;
  gap: 10px;
  padding: 9px 12px;
  margin-bottom: 8px;
  background: var(--rp-soft);
  border-left: 3px solid var(--rp-brand);
  border-radius: 0 8px 8px 0;
  font-size: var(--rp-body);
  line-height: 1.7;
  color: var(--rp-text);
}
.rp-findings__index {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  border-radius: 50%;
  background: var(--rp-brand);
  color: #fff;
  font-size: 12px;
  display: grid;
  place-items: center;
}

.rp-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
}
.rp-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--rp-line);
  border-radius: 8px;
  background: #fff;
}
.rp-metric__label { font-size: var(--rp-small); color: var(--rp-faint); }
.rp-metric__value { font-size: 15px; font-weight: 700; color: var(--rp-ink); line-height: 1.4; }
.rp-metric__note { font-size: var(--rp-small); color: var(--rp-muted); line-height: 1.6; }

.rp-callouts { display: flex; flex-direction: column; gap: 9px; }
.rp-callout {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--rp-line);
  background: #f8fafc;
}
.rp-callout__label {
  display: inline-block;
  font-size: var(--rp-small);
  font-weight: 600;
  margin-bottom: 4px;
}
.rp-callout p { margin: 0; font-size: var(--rp-body); line-height: 1.75; color: var(--rp-text); }
.rp-callout.is-core { border-color: #bfdbfe; background: #f8fbff; }
.rp-callout.is-core .rp-callout__label { color: #1d4ed8; }
.rp-callout.is-warning { border-color: #fecaca; background: #fef7f7; }
.rp-callout.is-warning .rp-callout__label { color: #b91c1c; }
.rp-callout.is-advice { border-color: #a7f3d0; background: #f7fdfa; }
.rp-callout.is-advice .rp-callout__label { color: #047857; }
.rp-callout.is-limited { border-color: #fde68a; background: #fffdf5; }
.rp-callout.is-limited .rp-callout__label { color: #b45309; }

.rp-timeline { list-style: none; margin: 0; padding: 0; }
.rp-timeline__item {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 0 0 14px 0;
}
.rp-timeline__marker {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
  background: #fff;
  border: 2.5px solid var(--rp-brand);
  z-index: 1;
}
.rp-timeline__item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 16px;
  bottom: 0;
  width: 1.5px;
  background: var(--rp-line);
}
.rp-timeline__head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.rp-timeline__head b { font-size: var(--rp-body); color: var(--rp-ink); font-weight: 600; }
.rp-timeline__time {
  font-size: var(--rp-small);
  color: var(--rp-brand-dark);
  background: var(--rp-soft);
  border-radius: 999px;
  padding: 1px 9px;
}
.rp-timeline__detail { margin: 4px 0 0; font-size: var(--rp-body); line-height: 1.7; color: var(--rp-text); }

.rp-recs { display: flex; flex-direction: column; gap: 10px; }
.rp-rec {
  padding: 11px 14px;
  border: 1px solid var(--rp-line);
  border-radius: 8px;
  background: #fff;
}
.rp-rec__head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.rp-rec__head b { font-size: var(--rp-body); color: var(--rp-ink); }
.rp-rec__priority {
  font-size: var(--rp-small);
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 999px;
  padding: 0 8px;
}
.rp-rec__detail { margin: 5px 0 0; font-size: var(--rp-body); line-height: 1.75; color: var(--rp-text); }
.rp-rec__meta { margin: 8px 0 0; font-size: var(--rp-small); }
.rp-rec__meta > div { display: flex; gap: 8px; margin-bottom: 3px; }
.rp-rec__meta dt { min-width: 62px; color: var(--rp-faint); flex-shrink: 0; }
.rp-rec__meta dd { margin: 0; color: var(--rp-text); }

.rp-table-wrap { overflow-x: auto; }
.rp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--rp-table);
  background: #fff;
}
.rp-table th,
.rp-table td {
  padding: 8px 10px;
  border: 1px solid var(--rp-line);
  text-align: left;
  vertical-align: top;
  line-height: 1.65;
  word-break: break-word;
}
.rp-table th {
  background: #f8fafc;
  color: var(--rp-muted);
  font-weight: 600;
  white-space: nowrap;
}
.rp-table td.is-numeric { text-align: right; font-variant-numeric: tabular-nums; }
.rp-table.is-riskMatrix th:first-child,
.rp-table.is-riskMatrix td:first-child { font-weight: 600; color: var(--rp-ink); }
.rp-table tbody tr:nth-child(even) { background: #fcfdfe; }

@media print {
  .rp-block { break-inside: auto; }
  .rp-table { font-size: 9pt; }
  .rp-table tr { break-inside: avoid; }
  .rp-callout, .rp-rec, .rp-metric, .rp-findings li { break-inside: avoid; }
}
</style>
