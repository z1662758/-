<template>
  <div class="scope-switch" role="tablist">
    <button
      type="button"
      class="scope-tab"
      :class="{ 'is-active': scope === 'focused' }"
      @click="emit('update:scope', 'focused')"
    >
      
    </button>
    <button
      type="button"
      class="scope-tab"
      :class="{ 'is-active': scope === 'global' }"
      @click="emit('update:scope', 'global')"
    >
      全局态势
    </button>
  </div>
</template>

<script setup>
defineProps({
  /** 'focused' | 'global' */
  scope: { type: String, default: 'focused' },
})
const emit = defineEmits(['update:scope'])
</script>

<style scoped>
.scope-switch {
  display: inline-flex;
  padding: 2px;
  background: #f1f5f9;
  border-radius: 8px;
}
.scope-tab {
  border: none;
  background: none;
  padding: 4px 14px;
  font-size: 12px;
  color: #475569;
  border-radius: 6px;
  cursor: pointer;
  transition: background .16s ease, color .16s ease;
}
.scope-tab.is-active {
  background: #fff;
  color: #1d4ed8;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .12);
}
</style>
