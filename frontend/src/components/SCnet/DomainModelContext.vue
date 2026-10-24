<template>
  <p v-if="modelValue?.model" class="domain-binding-note">已使用当前领域模型</p>
</template>

<script setup>
import { onBeforeUnmount, watch } from 'vue'
import { analyzeDomainModel } from '@/api/domainModel'

const props = defineProps({
  modelValue: { type: Object, default: null },
  industry: { type: String, required: true },
  question: { type: String, default: '' },
})
const emit = defineEmits(['analysis-change'])
let timer, requestId = 0

watch(() => [props.modelValue, props.question, props.industry], () => {
  clearTimeout(timer)
  const id = ++requestId
  emit('analysis-change', null)
  if (!props.modelValue?.model) return
  timer = setTimeout(async () => {
    try {
      const result = await analyzeDomainModel(props.modelValue.model, props.question, props.modelValue.instance, props.modelValue.factor_ids)
      if (id === requestId) emit('analysis-change', result)
    } catch {
      if (id === requestId) emit('analysis-change', null)
    }
  }, 300)
}, { deep: true, immediate: true })
onBeforeUnmount(() => { clearTimeout(timer); requestId++ })
</script>

<style scoped>
.domain-binding-note {
  margin: 0 0 10px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}
</style>
