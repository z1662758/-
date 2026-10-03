<template>
  <section class="rp-appendix">
    <!-- 参考来源 -->
    <div v-if="sources.length" class="rp-appendix__block">
      <h2 class="rp-appendix__title">参考来源</h2>
      <ol class="rp-sources">
        <li v-for="source in sources" :key="source.index" class="rp-source">
          <span class="rp-source__index">[{{ source.index }}]</span>
          <div class="rp-source__body">
            <p class="rp-source__name">
              {{ source.name || '未标注来源机构' }}
              <span v-if="source.dataType" class="rp-source__type">{{ source.dataType }}</span>
              <span v-if="source.credibility" class="rp-source__credit">{{ source.credibility }}</span>
            </p>
            <p v-if="source.title" class="rp-source__title">{{ source.title }}</p>
            <p class="rp-source__meta">
              <span>{{ formatDate(source.publishedAt) }}</span>
              <a
                v-if="source.url"
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="rp-source__link"
              >查看原文</a>
              <span v-else class="rp-source__nourl">当前证据记录未提供可访问链接。</span>
            </p>
          </div>
        </li>
      </ol>
    </div>

    <!-- 数据与模型说明 -->
    <div class="rp-appendix__block">
      <h2 class="rp-appendix__title">数据与模型说明</h2>

      <template v-if="modelOutputs.length">
        <h3 class="rp-appendix__sub">本次实际运行的模型</h3>
        <div class="rp-table-wrap">
          <table class="rp-table">
            <thead>
              <tr><th>模型</th><th>本次用途</th><th>输入摘要</th><th>输出</th><th>置信程度</th><th>限制</th></tr>
            </thead>
            <tbody>
              <tr v-for="(model, index) in modelOutputs" :key="index">
                <td>{{ model.modelName }}</td>
                <td>{{ model.purpose }}</td>
                <td>{{ model.inputSummary }}</td>
                <td>{{ model.output }}</td>
                <td>{{ model.confidence || '—' }}</td>
                <td>{{ model.limitations || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <p v-else class="rp-appendix__empty">本次没有可引用的模型输出。</p>

      <template v-if="unavailable.length">
        <h3 class="rp-appendix__sub is-warn">本次未运行、报告未引用的内容</h3>
        <ul class="rp-unavailable">
          <li v-for="(item, index) in unavailable" :key="index">
            <b>{{ item.name }}</b>：{{ item.reason }}
          </li>
        </ul>
      </template>
    </div>

    <!-- 报告限制 -->
    <div v-if="limitations.length" class="rp-appendix__block">
      <h2 class="rp-appendix__title">报告限制</h2>
      <ul class="rp-limits">
        <li v-for="(item, index) in limitations" :key="index">{{ item }}</li>
      </ul>
    </div>

    <!-- 技术详情:内部 ID 只在这里出现,不进正文 -->
    <details v-if="hasTechnical" class="rp-tech">
      <summary>技术详情（内部标识，仅供排查）</summary>
      <dl>
        <div v-if="technical.sessionId"><dt>会话编号</dt><dd>{{ technical.sessionId }}</dd></div>
        <div v-if="technical.snapshotId"><dt>快照编号</dt><dd>{{ technical.snapshotId }}</dd></div>
        <div v-if="modelIds.length"><dt>模型标识</dt><dd>{{ modelIds.join('、') }}</dd></div>
      </dl>
    </details>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { formatDate } from './reportDisplay'

const props = defineProps({
  report: { type: Object, required: true },
})

const sources = computed(() => props.report?.sources || [])
const limitations = computed(() => props.report?.limitations || [])
const modelOutputs = computed(() => props.report?.modelOutputs || [])
const unavailable = computed(() => props.report?.unavailableModelOutputs || [])
const technical = computed(() => props.report?.technicalDetails || {})
const modelIds = computed(() => modelOutputs.value.map((m) => m.modelId).filter(Boolean))
const hasTechnical = computed(
  () => Boolean(technical.value.sessionId || technical.value.snapshotId || modelIds.value.length),
)
</script>

<style scoped>
.rp-appendix { margin-top: 34px; padding-top: 22px; border-top: 2px solid var(--rp-line); }
.rp-appendix__block { margin-bottom: 26px; }
.rp-appendix__title {
  margin: 0 0 12px;
  font-size: var(--rp-h2);
  font-weight: 700;
  color: var(--rp-ink);
}
.rp-appendix__sub {
  margin: 16px 0 8px;
  font-size: var(--rp-h3);
  font-weight: 600;
  color: var(--rp-ink);
}
.rp-appendix__sub.is-warn { color: #b45309; }
.rp-appendix__empty { margin: 0; font-size: var(--rp-body); color: var(--rp-faint); }

.rp-sources { list-style: none; margin: 0; padding: 0; }
.rp-source { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px dashed var(--rp-line); }
.rp-source:last-child { border-bottom: none; }
.rp-source__index {
  flex-shrink: 0;
  font-size: var(--rp-small);
  color: var(--rp-brand);
  font-variant-numeric: tabular-nums;
  padding-top: 2px;
}
.rp-source__body { flex: 1; min-width: 0; }
.rp-source__name {
  margin: 0 0 3px;
  font-size: var(--rp-body);
  font-weight: 600;
  color: var(--rp-ink);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rp-source__type,
.rp-source__credit {
  font-size: var(--rp-small);
  font-weight: 400;
  color: var(--rp-muted);
  background: var(--rp-soft);
  border-radius: 999px;
  padding: 0 8px;
}
.rp-source__title { margin: 0 0 3px; font-size: var(--rp-small); color: var(--rp-text); line-height: 1.7; }
.rp-source__meta {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: var(--rp-small);
  color: var(--rp-faint);
}
.rp-source__link { color: var(--rp-brand); text-decoration: none; }
.rp-source__link:hover { text-decoration: underline; }
.rp-source__nourl { color: #b45309; }

.rp-unavailable { margin: 0; padding-left: 18px; font-size: var(--rp-small); color: var(--rp-text); line-height: 1.8; }
.rp-limits { margin: 0; padding-left: 18px; font-size: var(--rp-body); color: var(--rp-text); line-height: 1.85; }
.rp-limits li { margin-bottom: 5px; }

.rp-table-wrap { overflow-x: auto; }
.rp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--rp-table);
  background: #fff;
}
.rp-table th, .rp-table td {
  padding: 8px 10px;
  border: 1px solid var(--rp-line);
  text-align: left;
  vertical-align: top;
  line-height: 1.65;
  word-break: break-word;
}
.rp-table th { background: #f8fafc; color: var(--rp-muted); font-weight: 600; }

.rp-tech {
  margin-top: 18px;
  padding: 10px 14px;
  border: 1px dashed var(--rp-line);
  border-radius: 8px;
  font-size: var(--rp-small);
  color: var(--rp-muted);
}
.rp-tech summary { cursor: pointer; color: var(--rp-faint); }
.rp-tech dl { margin: 10px 0 0; }
.rp-tech dl > div { display: flex; gap: 10px; margin-bottom: 4px; }
.rp-tech dt { min-width: 68px; color: var(--rp-faint); }
.rp-tech dd { margin: 0; word-break: break-all; }

@media print {
  .rp-tech { display: none; }
  .rp-appendix { break-before: page; }
  .rp-appendix__title { break-after: avoid; }
  .rp-source, .rp-table tr { break-inside: avoid; }
}
</style>
