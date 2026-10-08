<template>
  <div class="osint-filter">
    <div class="osint-filter__group">
      <span class="osint-filter__label">事件范围</span>
      <button
        v-for="option in scopeOptions"
        :key="option.value"
        type="button"
        class="osint-chip"
        :class="{ 'is-active': scope === option.value }"
        @click="emit('update:scope', option.value)"
      >{{ option.label }}<em v-if="option.count !== undefined">{{ option.count }}</em></button>
    </div>

    <div class="osint-filter__group">
      <span class="osint-filter__label">风险状态</span>
      <button
        v-for="option in stateOptions"
        :key="option.value"
        type="button"
        class="osint-chip"
        :class="{ 'is-active': state === option.value }"
        @click="emit('update:state', option.value)"
      >{{ option.label }}<em v-if="option.count !== undefined">{{ option.count }}</em></button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 'relevant' | 'fresh' | 'knowledge' | 'historical' | 'imported' | 'all' */
  scope: { type: String, default: 'relevant' },
  /** 'active' | 'effective' | 'high'（已解除事件不进入本组件） */
  state: { type: String, default: 'active' },
  /** 每个筛选值的命中数量,由父组件按真实数据算好 */
  counts: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:scope', 'update:state'])

const scopeOptions = computed(() => {
  const options = [
    { value: 'relevant', label: '与本次需求相关', count: props.counts.relevant },
    { value: 'fresh', label: '本次筛选命中', count: props.counts.fresh },
    { value: 'knowledge', label: '知识库事件', count: props.counts.knowledge },
    { value: 'historical', label: '历史事件', count: props.counts.historical },
    { value: 'all', label: '全部事件', count: props.counts.all },
  ]
  // 没有用户导入件时不占位,老页面的筛选行保持原样
  if (props.counts.imported > 0) {
    options.splice(4, 0, { value: 'imported', label: '用户导入', count: props.counts.imported })
  }
  return options
})

const stateOptions = computed(() => [
  { value: 'active', label: '未解除', count: props.counts.active },
  { value: 'effective', label: '计入当前风险', count: props.counts.effective },
  { value: 'high', label: '高风险', count: props.counts.high },
])
</script>

<style scoped>
.osint-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}
.osint-filter__group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.osint-filter__label { font-size: 12px; color: #94a3b8; margin-right: 2px; }
.osint-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 12px;
  border-radius: 999px;
  padding: 3px 12px;
  cursor: pointer;
  transition: all .16s ease;
}
.osint-chip:hover { border-color: #bfdbfe; color: #1d4ed8; }
.osint-chip.is-active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #1d4ed8;
  font-weight: 600;
}
.osint-chip em { font-style: normal; font-size: 11px; color: #94a3b8; }
.osint-chip.is-active em { color: #2563eb; }
</style>
