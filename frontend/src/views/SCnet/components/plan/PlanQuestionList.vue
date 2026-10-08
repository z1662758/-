<template>
  <PlanSection
    title="拟回答问题"
    :badge="`${enabledCount}/${questions.length} 条启用`"
    hint="由核心问题拆分而来，可编辑、删除、新增与调整顺序"
  >
    <div v-for="(item, index) in questions" :key="item.id" class="q-row" :class="{ 'is-off': item.enabled === false }">
      <el-checkbox :model-value="item.enabled !== false" @update:model-value="toggle(index, $event)" />
      <el-input
        :model-value="item.title"
        class="q-row__input"
        :placeholder="`第 ${index + 1} 个问题`"
        @update:model-value="setTitle(index, $event)"
      />
      <span v-if="item.required" class="q-row__tag">必要</span>
      <div class="q-row__ops">
        <button type="button" class="icon-btn" :disabled="index === 0" title="上移" @click="move(index, -1)">↑</button>
        <button
          type="button"
          class="icon-btn"
          :disabled="index === questions.length - 1"
          title="下移"
          @click="move(index, 1)"
        >↓</button>
        <button type="button" class="icon-btn is-danger" title="删除" @click="remove(index)">✕</button>
      </div>
    </div>

    <p v-if="enabledCount === 0" class="q-warn">至少保留一个分析问题才能开始分析。</p>

    <button type="button" class="add-btn" @click="add">+ 增加自定义问题</button>
  </PlanSection>
</template>

<script setup>
import { computed } from 'vue'
import PlanSection from './PlanSection.vue'

const props = defineProps({
  questions: { type: Array, required: true },
})
const emit = defineEmits(['update:questions', 'dirty'])

const enabledCount = computed(
  () => props.questions.filter((item) => item.enabled !== false).length,
)

const cloneList = () => props.questions.map((item) => ({ ...item }))

function commit(next) {
  emit('update:questions', next)
  emit('dirty')
}

function toggle(index, value) {
  const next = cloneList()
  next[index].enabled = Boolean(value)
  commit(next)
}

function setTitle(index, value) {
  const next = cloneList()
  next[index].title = value
  commit(next)
}

function move(index, delta) {
  const target = index + delta
  if (target < 0 || target >= props.questions.length) return
  const next = cloneList()
  ;[next[index], next[target]] = [next[target], next[index]]
  commit(next)
}

function remove(index) {
  const next = cloneList()
  next.splice(index, 1)
  commit(next)
}

function add() {
  const used = new Set(props.questions.map((item) => item.id))
  let seq = props.questions.length + 1
  while (used.has(`custom_${seq}`)) seq += 1
  commit([
    ...cloneList(),
    { id: `custom_${seq}`, title: '', enabled: true, required: false, custom: true },
  ])
}
</script>

<style scoped>
.q-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
}
.q-row:hover { background: #f8fafc; }
.q-row.is-off .q-row__input { opacity: .55; }
.q-row__input { flex: 1; }
.q-row__tag {
  flex-shrink: 0;
  font-size: 11px;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 4px;
  padding: 1px 6px;
}
.q-row__ops { display: flex; gap: 2px; }
.icon-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  line-height: 1;
}
.icon-btn:hover:not(:disabled) { border-color: #93c5fd; color: #2563eb; }
.icon-btn:disabled { opacity: .35; cursor: not-allowed; }
.icon-btn.is-danger:hover { border-color: #fca5a5; color: #dc2626; }
.q-warn { margin: 8px 0 0; font-size: 12px; color: #dc2626; }
.add-btn {
  margin-top: 10px;
  padding: 6px 12px;
  border: 1px dashed #bfdbfe;
  background: #f8fbff;
  color: #2563eb;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}
.add-btn:hover { background: #eff6ff; }
</style>
