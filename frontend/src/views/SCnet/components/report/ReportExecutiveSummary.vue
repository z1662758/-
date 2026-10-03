<template>
  <section v-if="hasContent" class="rp-summary">
    <h2 class="rp-summary__title">决策摘要</h2>

    <!-- 六项结论字段:紧凑列表,不用巨型卡片 -->
    <dl class="rp-summary__facts">
      <div v-for="fact in facts" :key="fact.label">
        <dt>{{ fact.label }}</dt>
        <dd>{{ fact.value }}</dd>
      </div>
    </dl>

    <div v-if="cards.length" class="rp-summary__cards">
      <div v-for="(card, index) in cards" :key="index" class="rp-summary__card">
        <span class="rp-summary__card-label">{{ card.label }}</span>
        <span class="rp-summary__card-value">{{ card.value }}</span>
        <span v-if="card.note" class="rp-summary__card-note">{{ card.note }}</span>
      </div>
    </div>

    <div v-if="findings.length" class="rp-summary__findings">
      <h3 class="rp-summary__subtitle">核心结论</h3>
      <ul>
        <li v-for="(item, index) in findings" :key="index">
          <span class="rp-summary__idx">{{ index + 1 }}</span>
          <span>{{ item }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
})

const FACT_FIELDS = [
  ['decision', '综合结论'],
  ['riskLevel', '风险等级'],
  ['priceTrend', '价格趋势'],
  ['recommendedVolume', '建议采购量'],
  ['recommendedWindow', '建议采购窗口'],
  ['confidence', '结论置信度'],
]

const facts = computed(() =>
  FACT_FIELDS
    .filter(([key]) => String(props.summary?.[key] || '').trim())
    .map(([key, label]) => ({ label, value: String(props.summary[key]).trim() })),
)

const cards = computed(() =>
  (props.summary?.metricCards || []).filter((c) => c && c.label),
)
const findings = computed(() =>
  (props.summary?.keyFindings || []).filter((x) => String(x || '').trim()),
)

const hasContent = computed(() => facts.value.length || cards.value.length || findings.value.length)
</script>

<style scoped>
.rp-summary {
  margin-bottom: 30px;
  padding: 16px 18px;
  background: #fff;
  border: 1px solid var(--rp-line);
  border-radius: 10px;
}
.rp-summary__title {
  margin: 0 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rp-line);
  font-size: var(--rp-h2);
  font-weight: 700;
  color: var(--rp-ink);
}

.rp-summary__facts { margin: 0 0 16px; font-size: var(--rp-body); }
.rp-summary__facts > div { display: flex; gap: 12px; margin-bottom: 6px; }
.rp-summary__facts dt {
  min-width: 84px;
  flex-shrink: 0;
  color: var(--rp-faint);
}
.rp-summary__facts dd { margin: 0; color: var(--rp-text); line-height: 1.75; }

.rp-summary__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.rp-summary__card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 12px;
  border: 1px solid var(--rp-line);
  border-radius: 8px;
  background: #fcfdff;
}
.rp-summary__card-label { font-size: var(--rp-small); color: var(--rp-faint); }
.rp-summary__card-value { font-size: 15px; font-weight: 700; color: var(--rp-ink); line-height: 1.4; }
.rp-summary__card-note { font-size: var(--rp-small); color: var(--rp-muted); line-height: 1.6; }

.rp-summary__subtitle {
  margin: 0 0 8px;
  font-size: var(--rp-h3);
  font-weight: 600;
  color: var(--rp-ink);
}
.rp-summary__findings ul { list-style: none; margin: 0; padding: 0; }
.rp-summary__findings li {
  display: flex;
  gap: 9px;
  margin-bottom: 7px;
  font-size: var(--rp-body);
  line-height: 1.75;
  color: var(--rp-text);
}
.rp-summary__idx {
  flex-shrink: 0;
  width: 19px;
  height: 19px;
  margin-top: 3px;
  border-radius: 50%;
  background: var(--rp-soft);
  color: var(--rp-brand-dark);
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
}

@media print {
  .rp-summary { break-inside: avoid; }
  .rp-summary__card { break-inside: avoid; }
}
</style>
