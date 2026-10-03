<template>
  <PlanSection
    title="指标与判断口径"
    :badge="`纳入 ${enabledCount}/${indicators.length} 项`"
    hint="按本次问题动态生成，不同场景不必套用同一套指标"
  >
    <div class="ind-head">
      <span class="col col--pick">纳入</span>
      <span class="col col--name">指标</span>
      <span class="col col--method">计算或判断方法</span>
      <span class="col col--src">数据来源</span>
      <span class="col col--form">输出形式</span>
    </div>

    <div v-for="(item, index) in indicators" :key="`ind-${index}`" class="ind-row" :class="{ 'is-off': item.enabled === false }">
      <span class="col col--pick">
        <el-checkbox :model-value="item.enabled !== false" @update:model-value="setField(index, 'enabled', $event)" />
      </span>
      <span class="col col--name">
        <el-input
          :model-value="item.name"
          placeholder="指标名称"
          @update:model-value="setField(index, 'name', $event)"
        />
      </span>
      <span class="col col--method">
        <el-input
          :model-value="item.method"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="说明计算或判断口径"
          @update:model-value="setField(index, 'method', $event)"
        />
      </span>
      <span class="col col--src">
        <el-input
          :model-value="formatList(item.dataSources)"
          placeholder="用顿号分隔"
          @update:model-value="setSources(index, $event)"
        />
      </span>
      <span class="col col--form">
        <el-input
          :model-value="item.outputForm"
          placeholder="例如：区间 / 等级"
          @update:model-value="setField(index, 'outputForm', $event)"
        />
      </span>
    </div>

    <p v-if="!indicators.length" class="ind-empty">本次方案没有生成判断指标。</p>
    <button type="button" class="add-btn" @click="add">+ 增加指标</button>
  </PlanSection>
</template>

<script setup>
import { computed } from 'vue'
import PlanSection from './PlanSection.vue'

const props = defineProps({
  indicators: { type: Array, required: true },
})
const emit = defineEmits(['update:indicators', 'dirty'])

const enabledCount = computed(
  () => props.indicators.filter((item) => item.enabled !== false).length,
)

const formatList = (value) => (Array.isArray(value) ? value.join('、') : '')

const splitList = (text) =>
  String(text || '')
    .split(/[、,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const cloneList = () => props.indicators.map((item) => ({ ...item }))

function commit(next) {
  emit('update:indicators', next)
  emit('dirty')
}

function setField(index, field, value) {
  const next = cloneList()
  next[index][field] = value
  commit(next)
}

function setSources(index, value) {
  setField(index, 'dataSources', splitList(value))
}

function add() {
  commit([
    ...cloneList(),
    { name: '', method: '', dataSources: [], outputForm: '', enabled: true },
  ])
}
</script>

<style scoped>
.ind-head, .ind-row {
  display: grid;
  grid-template-columns: 52px minmax(140px, 1fr) minmax(220px, 1.7fr) minmax(150px, 1fr) minmax(120px, .8fr);
  gap: 12px;
  align-items: start;
}
.ind-head {
  font-size: 12px;
  color: #94a3b8;
  padding: 0 8px 8px;
  border-bottom: 1px solid #eef2f7;
}
.ind-row { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
.ind-row:hover { background: #f8fafc; }
.ind-row.is-off { opacity: .6; }
.ind-empty { margin: 10px 0 0; font-size: 12px; color: #94a3b8; }
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
@media (max-width: 1200px) {
  .ind-head { display: none; }
  .ind-row { grid-template-columns: 40px minmax(0, 1fr); }
  .col--method, .col--src, .col--form { grid-column: 2 / -1; }
}
</style>
