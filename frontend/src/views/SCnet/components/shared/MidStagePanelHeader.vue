<template>
  <header class="mid-panel-header">
    <div class="mid-panel-heading">
      <h3>{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
    </div>
    <span v-if="count !== undefined" class="mid-panel-count">{{ count }}</span>
    <slot />
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  count: { type: [Number, String], default: undefined },
})
</script>

<style scoped>
.mid-panel-header { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--mid-border-soft, #e2e8f0); flex: 0 0 auto; }
.mid-panel-heading { flex: 1; min-width: 0; }
h3 { margin: 0; color: #1e293b; font-size: 14px; line-height: 1.5; font-weight: 600; }
p { margin: 3px 0 0; color: #64748b; font-size: 12px; line-height: 1.5; }
.mid-panel-count { color: #475569; font-size: 12px; font-variant-numeric: tabular-nums; }
</style>
