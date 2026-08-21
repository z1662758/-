<template>
  <section
    class="analysis-digest-strip"
    :style="{ '--analysis-digest-columns': String(columns || 4) }"
  >
    <article
      v-for="(item, index) in normalizedItems"
      :key="item.id || `${item.label}-${index}`"
      class="analysis-digest-card"
      :class="item.tone"
    >
      <span>{{ item.label }}</span>
      <strong>{{ item.title }}</strong>
      <p v-if="item.body">{{ item.body }}</p>
    </article>
  </section>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'AnalysisDigestStrip' })

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  columns: {
    type: Number,
    default: 4
  }
})

const normalizedItems = computed(() => {
  return (props.items || []).map((item = {}, index) => ({
    id: item.id || item.key || `${item.label || 'item'}-${index}`,
    label: item.label || `0${index + 1}`,
    title: item.value ?? item.title ?? '--',
    body: item.detail ?? item.text ?? item.hint ?? '',
    tone: item.tone || 'neutral'
  }))
})
</script>

<style scoped>
.analysis-digest-strip {
  display: grid;
  grid-template-columns: repeat(var(--analysis-digest-columns, 4), minmax(0, 1fr));
  gap: 8px;
}

.analysis-digest-card {
  position: relative;
  padding: 9px 11px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.98) 100%);
  overflow: hidden;
  min-width: 0;
}

.analysis-digest-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: #3b82f6;
}

.analysis-digest-card.neutral::before { background: #64748b; }
.analysis-digest-card.info::before { background: #3b82f6; }
.analysis-digest-card.primary::before { background: #2563eb; }
.analysis-digest-card.success::before { background: #10b981; }
.analysis-digest-card.warning::before { background: #f59e0b; }
.analysis-digest-card.danger::before { background: #ef4444; }

.analysis-digest-card span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-micro);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.analysis-digest-card strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
  line-height: var(--mid-lh-tight);
  overflow-wrap: anywhere;
}

.analysis-digest-card p {
  margin: 5px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

@media (max-width: 1200px) {
  .analysis-digest-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .analysis-digest-strip {
    grid-template-columns: 1fr;
  }
}
</style>
