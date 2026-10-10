<template>
  <PlanSection title="分析限制与说明" :badge="`${limitations.length} 条`" hint="客观限制，不代表分析结论">
    <ul class="lim-list">
      <li v-for="(item, index) in limitations" :key="`lim-${index}`" class="lim-row">
        <span class="lim-row__dot"></span>
        <el-input
          :model-value="item"
          type="textarea"
          :rows="2"
          resize="none"
          @update:model-value="setItem(index, $event)"
        />
        <button type="button" class="lim-row__del" title="删除" @click="remove(index)">✕</button>
      </li>
    </ul>
    <p v-if="!limitations.length" class="lim-empty">本次方案没有生成限制说明。</p>
    <button type="button" class="add-btn" @click="add">+ 增加一条限制</button>
  </PlanSection>
</template>

<script setup>
import PlanSection from './PlanSection.vue'

const props = defineProps({
  limitations: { type: Array, required: true },
})
const emit = defineEmits(['update:limitations', 'dirty'])

function commit(next) {
  emit('update:limitations', next)
  emit('dirty')
}

function setItem(index, value) {
  const next = [...props.limitations]
  next[index] = value
  commit(next)
}

function remove(index) {
  const next = [...props.limitations]
  next.splice(index, 1)
  commit(next)
}

function add() {
  commit([...props.limitations, ''])
}
</script>

<style scoped>
.lim-list { list-style: none; margin: 0; padding: 0; }
.lim-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 0;
}
.lim-row__dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
  margin-top: 12px;
}
.lim-row__del {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-top: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  line-height: 1;
}
.lim-row__del:hover { border-color: #fca5a5; color: #dc2626; }
.lim-empty { margin: 10px 0 0; font-size: 12px; color: #94a3b8; }
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
