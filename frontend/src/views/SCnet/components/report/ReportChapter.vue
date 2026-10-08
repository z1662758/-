<template>
  <section class="rp-chapter" :id="`chapter-${chapter.number}`">
    <header class="rp-chapter__head">
      <span class="rp-chapter__num">{{ chapter.number }}</span>
      <h2 class="rp-chapter__title">{{ chapter.title }}</h2>
    </header>

    <p v-if="chapter.summary" class="rp-chapter__summary">{{ chapter.summary }}</p>

    <ReportSectionBlock
      v-for="(section, index) in chapter.sections"
      :key="index"
      :section="section"
    />
  </section>
</template>

<script setup>
import ReportSectionBlock from './ReportSectionBlock.vue'

defineProps({
  chapter: { type: Object, required: true },
})
</script>

<style scoped>
.rp-chapter { margin-bottom: 34px; }
.rp-chapter__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 14px;
  background: var(--rp-soft);
  border-left: 4px solid var(--rp-brand);
  border-radius: 0 8px 8px 0;
}
.rp-chapter__num {
  font-size: var(--rp-h2);
  font-weight: 800;
  color: var(--rp-brand);
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}
.rp-chapter__title {
  margin: 0;
  font-size: var(--rp-h2);
  font-weight: 700;
  color: var(--rp-ink);
  line-height: 1.4;
}
.rp-chapter__summary {
  margin: 0 0 18px;
  padding: 10px 14px;
  border-left: 3px solid var(--rp-brand-line);
  background: #fcfdff;
  font-size: var(--rp-body);
  line-height: 1.8;
  color: var(--rp-muted);
  border-radius: 0 6px 6px 0;
}

@media print {
  .rp-chapter { break-before: page; }
  .rp-chapter:first-of-type { break-before: auto; }
  .rp-chapter__head { break-after: avoid; }
  .rp-chapter__summary { break-after: avoid; }
}
</style>
