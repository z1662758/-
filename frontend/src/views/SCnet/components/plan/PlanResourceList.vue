<template>
  <PlanSection
    title="数据支撑方案"
    :badge="`选用 ${enabledCount}/${resources.length} 项`"
    hint="资源来自当前知识库真实存在且已授权的数据，用途可编辑"
  >
    <div class="res-head">
      <span class="col col--pick">选用</span>
      <span class="col col--name">数据资源</span>
      <span class="col col--meta">类型 / 覆盖 / 更新</span>
      <span class="col col--purpose">在本方案中的用途</span>
    </div>

    <div v-for="item in resources" :key="item.resourceId" class="res-row" :class="{ 'is-off': item.enabled === false }">
      <span class="col col--pick">
        <el-checkbox :model-value="item.enabled !== false" @update:model-value="toggle(item, $event)" />
      </span>
      <span class="col col--name">
        <b>{{ item.name }}</b>
        <i class="res-id">{{ item.resourceId }}</i>
      </span>
      <span class="col col--meta">
        <em>{{ item.type || '—' }}</em>
        <em>{{ item.coverage || '未标注' }}</em>
        <em class="res-update">{{ item.updateStatus || '—' }}</em>
      </span>
      <span class="col col--purpose">
        <el-input
          :model-value="item.purpose"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="说明该资源在本次分析中的用途"
          @update:model-value="setPurpose(item, $event)"
        />
        <button
          v-if="item.required"
          type="button"
          class="req-flag"
          title="系统标记的必要资源，取消选用会影响对应结论"
          @click="warnRequired(item)"
        >必要资源</button>
      </span>
    </div>

    <p v-if="enabledCount === 0" class="res-warn">至少选择一个数据资源才能开始分析。</p>
    <p class="res-note">只能选用知识库中真实存在且当前有权限的数据资源，无法在本页编辑数据本身。</p>
  </PlanSection>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import PlanSection from './PlanSection.vue'

const props = defineProps({
  resources: { type: Array, required: true },
})
const emit = defineEmits(['update:resources', 'dirty'])

const enabledCount = computed(
  () => props.resources.filter((item) => item.enabled !== false).length,
)

const cloneList = () => props.resources.map((item) => ({ ...item }))

function commit(next) {
  emit('update:resources', next)
  emit('dirty')
}

function toggle(item, value) {
  const next = cloneList()
  const target = next.find((entry) => entry.resourceId === item.resourceId)
  if (target) target.enabled = Boolean(value)
  commit(next)
  if (!value && item.required) warnRequired(item)
}

function setPurpose(item, value) {
  const next = cloneList()
  const target = next.find((entry) => entry.resourceId === item.resourceId)
  if (target) target.purpose = value
  commit(next)
}

function warnRequired(item) {
  ElMessage.warning(`「${item.name}」是系统标记的必要资源，取消选用会影响相关结论的可信度。`)
}
</script>

<style scoped>
.res-head, .res-row {
  display: grid;
  grid-template-columns: 52px minmax(180px, 1.1fr) minmax(190px, 1.2fr) minmax(240px, 2fr);
  gap: 12px;
  align-items: start;
}
.res-head {
  font-size: 12px;
  color: #94a3b8;
  padding: 0 8px 8px;
  border-bottom: 1px solid #eef2f7;
}
.res-row {
  padding: 10px 8px;
  border-bottom: 1px solid #f1f5f9;
}
.res-row:hover { background: #f8fafc; }
.res-row.is-off { opacity: .6; }
.col--name { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #0f172a; }
.res-id { font-style: normal; font-size: 11px; color: #94a3b8; word-break: break-all; }
.col--meta { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #64748b; }
.col--meta em { font-style: normal; }
.res-update { color: #059669; }
.col--purpose { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.req-flag {
  font-size: 11px;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 4px;
  padding: 1px 6px;
  cursor: help;
}
.res-warn { margin: 10px 0 0; font-size: 12px; color: #dc2626; }
.res-note { margin: 10px 0 0; font-size: 12px; color: #94a3b8; }
@media (max-width: 1200px) {
  .res-head { display: none; }
  .res-row { grid-template-columns: 44px minmax(0, 1fr); }
  .col--meta, .col--purpose { grid-column: 2 / -1; }
}
</style>
