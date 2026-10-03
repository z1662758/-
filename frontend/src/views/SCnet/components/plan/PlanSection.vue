<template>
  <section class="plan-section" :class="{ 'is-collapsed': collapsed }">
    <header class="plan-section__head" @click="collapsed = !collapsed">
      <span class="plan-section__caret" :class="{ 'is-open': !collapsed }">▸</span>
      <h2 class="plan-section__title">{{ title }}</h2>
      <span v-if="badge" class="plan-section__badge">{{ badge }}</span>
      <span v-if="hint" class="plan-section__hint">{{ hint }}</span>
      <slot name="actions" />
    </header>
    <div v-show="!collapsed" class="plan-section__body">
      <slot />
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  title: { type: String, required: true },
  badge: { type: String, default: '' },
  hint: { type: String, default: '' },
})

const collapsed = ref(false)
</script>

<style scoped>
.plan-section {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
}
.plan-section__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  background: #f8fafc;
  border-bottom: 1px solid #eef2f7;
}
.plan-section.is-collapsed .plan-section__head { border-bottom-color: transparent; }
.plan-section__head:hover { background: #f1f5f9; }
.plan-section__caret {
  color: #94a3b8;
  font-size: 12px;
  transition: transform .18s ease;
}
.plan-section__caret.is-open { transform: rotate(90deg); }
.plan-section__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}
.plan-section__badge {
  font-size: 12px;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  padding: 1px 9px;
}
.plan-section__hint {
  font-size: 12px;
  color: #94a3b8;
  margin-left: auto;
}
.plan-section__body { padding: 14px 16px 16px; }
</style>
