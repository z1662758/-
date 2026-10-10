<template>
  <div class="judgment-mode-tabs" role="tablist" aria-label="研判视角">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      role="tab"
      class="jmt-tab"
      :class="{ 'is-active': item.key === mode }"
      :aria-selected="item.key === mode"
      :title="item.title"
      @click="emit('update:mode', item.key)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { JUDGMENT_MODES, JUDGMENT_MODE_META } from '@/constants/judgmentModes'

defineProps({
  /** 'llm' | 'domain' | 'dual' */
  mode: { type: String, default: 'dual' },
})
const emit = defineEmits(['update:mode'])

const items = computed(() =>
  JUDGMENT_MODES.map((key) => {
    const meta = JUDGMENT_MODE_META[key]
    return {
      key,
      label: meta.label,
      title: `${meta.label} · ${meta.method}`,
    }
  }),
)
</script>

<style scoped>
/* 独立成行展示(位于顶部信息栏与供应来源占比栏之间)的分段控件:
   浅灰底 + 白色选中胶囊 + 蓝色主色文字,与「与本次需求相关 / 全局态势」同一套观感。
   窄屏时本控件内部折行,不把页面顶宽。 */
.judgment-mode-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  box-sizing: border-box;
  max-width: 100%;
}

.jmt-tab {
  border: none;
  background: none;
  padding: 4px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: #475569;
  border-radius: 7px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.jmt-tab:hover {
  color: #1d4ed8;
}

.jmt-tab.is-active {
  background: #fff;
  color: #1d4ed8;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
}
</style>
