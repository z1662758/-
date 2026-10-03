<template>
  <PlanSection
    title="分析模型方案"
    :badge="`启用 ${enabledCount}/${models.length} 个模型`"
    hint="模型来自当前模型库，只能决定本次任务是否使用"
  >
    <div v-for="group in groupedModels" :key="group.capability" class="model-group">
      <h3 class="model-group__title">
        {{ group.capability }}
        <span class="model-group__count">{{ group.items.length }}</span>
      </h3>

      <div v-for="item in group.items" :key="item.modelId" class="model-row" :class="{ 'is-off': item.enabled === false }">
        <span class="model-row__pick">
          <el-checkbox :model-value="item.enabled !== false" @update:model-value="toggle(item, $event)" />
        </span>
        <span class="model-row__name">
          <b>{{ item.name }}</b>
          <i>{{ item.modelId }}</i>
        </span>
        <span class="model-row__io">
          <em>需要的数据：{{ formatList(meta(item.modelId)?.inputs) || '未标注' }}</em>
          <em>预计输出：{{ formatList(meta(item.modelId)?.outputs) || '未标注' }}</em>
        </span>
        <span class="model-row__purpose">
          <el-input
            :model-value="item.purpose"
            type="textarea"
            :rows="2"
            resize="none"
            placeholder="说明该模型在本次分析中的用途"
            @update:model-value="setPurpose(item, $event)"
          />
        </span>
      </div>
    </div>

    <p v-if="enabledCount === 0" class="model-warn">至少要启用一个分析模型（或一条可执行的分析步骤）才能开始分析。</p>
  </PlanSection>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PlanSection from './PlanSection.vue'

const props = defineProps({
  models: { type: Array, required: true },
  catalogModels: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:models', 'dirty'])

const catalogIndex = computed(() => {
  const index = {}
  for (const item of props.catalogModels) index[item.modelId] = item
  return index
})

const meta = (modelId) => catalogIndex.value[modelId]

const enabledCount = computed(() => props.models.filter((item) => item.enabled !== false).length)

const cloneList = () => props.models.map((item) => ({ ...item }))

function commit(next) {
  emit('update:models', next)
  emit('dirty')
}

function setPurpose(item, value) {
  const next = cloneList()
  const target = next.find((entry) => entry.modelId === item.modelId)
  if (target) target.purpose = value
  commit(next)
}

const groupedModels = computed(() => {
  const groups = []
  const index = {}
  for (const item of props.models) {
    const key = item.capability || '其他分析能力'
    if (!index[key]) {
      index[key] = { capability: key, items: [] }
      groups.push(index[key])
    }
    index[key].items.push(item)
  }
  return groups
})

const formatList = (value) => (Array.isArray(value) && value.length ? value.join('、') : '')

/** 取消必要模型时提示会影响哪些输出，但不阻止用户编辑 */
async function toggle(item, value) {
  if (value) {
    setEnabled(item, true)
    return
  }
  if (item.required) {
    try {
      await ElMessageBox.confirm(
        `「${item.name}」承担「${item.capability || '本次分析'}」能力。取消启用后，`
        + `方案中依赖该能力的指标与结论将只能给出定性判断或标记为不可测算。是否继续取消？`,
        '取消必要模型',
        { type: 'warning', confirmButtonText: '继续取消', cancelButtonText: '保持启用' },
      )
    } catch {
      return
    }
  }
  setEnabled(item, false)
  if (item.required) ElMessage.warning(`已取消「${item.name}」，相关输出将标记为受限。`)
}

function setEnabled(item, value) {
  const next = cloneList()
  const target = next.find((entry) => entry.modelId === item.modelId)
  if (target) target.enabled = Boolean(value)
  commit(next)
}
</script>

<style scoped>
.model-group + .model-group { margin-top: 14px; }
.model-group__title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 6px;
}
.model-group__count {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 0 7px;
}
.model-row {
  display: grid;
  grid-template-columns: 34px minmax(180px, 1.1fr) minmax(200px, 1.3fr) minmax(220px, 1.8fr);
  gap: 10px;
  align-items: start;
  padding: 9px 8px;
  border-bottom: 1px solid #f1f5f9;
}
.model-row:hover { background: #f8fafc; }
.model-row.is-off { opacity: .6; }
.model-row__name { display: flex; flex-direction: column; gap: 3px; font-size: 13px; color: #0f172a; }
.model-row__name i { font-style: normal; font-size: 11px; color: #94a3b8; word-break: break-all; }
.model-row__io { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #64748b; }
.model-row__io em { font-style: normal; }
.model-warn { margin: 12px 0 0; font-size: 12px; color: #dc2626; }
@media (max-width: 1200px) {
  .model-row { grid-template-columns: 30px minmax(0, 1fr); }
  .model-row__io, .model-row__purpose { grid-column: 2 / -1; }
}
</style>
