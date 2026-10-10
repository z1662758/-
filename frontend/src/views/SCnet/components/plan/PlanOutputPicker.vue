<template>
  <PlanSection title="预计输出" :badge="`${enabledCount}/${outputs.length} 项`" hint="选择您最终希望看到的结果形式">
    <div class="out-list">
      <label
        v-for="item in outputs"
        :key="item.id"
        class="out-chip"
        :class="{ 'is-on': item.enabled !== false }"
      >
        <el-checkbox
          :model-value="item.enabled !== false"
          @update:model-value="toggle(item, $event)"
        />
        <span>{{ item.name }}</span>
      </label>
    </div>
    <p v-if="!outputs.length" class="out-empty">本次方案没有生成预计输出。</p>
    <p class="out-note">正式分析完成后，系统会按上述选择组织结果；报告仍使用三章式大框架。</p>
  </PlanSection>
</template>

<script setup>
import { computed } from 'vue'
import PlanSection from './PlanSection.vue'

const props = defineProps({
  outputs: { type: Array, required: true },
})
const emit = defineEmits(['update:outputs', 'dirty'])

const enabledCount = computed(() => props.outputs.filter((item) => item.enabled !== false).length)

function toggle(item, value) {
  emit(
    'update:outputs',
    props.outputs.map((entry) =>
      entry.id === item.id ? { ...entry, enabled: Boolean(value) } : { ...entry },
    ),
  )
  emit('dirty')
}
</script>

<style scoped>
.out-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.out-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px 5px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
}
.out-chip.is-on { border-color: #bfdbfe; background: #f8fbff; color: #1d4ed8; }
.out-empty { margin: 10px 0 0; font-size: 12px; color: #94a3b8; }
.out-note { margin: 12px 0 0; font-size: 12px; color: #94a3b8; }
</style>
