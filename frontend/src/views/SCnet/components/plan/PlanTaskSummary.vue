<template>
  <PlanSection title="任务理解" hint="大模型对本次需求的结构化理解，可直接编辑" :badge="summaryBadge">
    <div class="task-grid">
      <label class="task-field task-field--wide">
        <span>核心研判问题</span>
        <el-input
          :model-value="summary.question"
          type="textarea"
          :rows="3"
          resize="none"
          @update:model-value="setField('question', $event)"
        />
      </label>
      <label class="task-field">
        <span>研究对象</span>
        <el-input
          :model-value="summary.object"
          placeholder="例如：铀燃料"
          @update:model-value="setField('object', $event)"
        />
      </label>
      <label class="task-field">
        <span>分析时间范围</span>
        <el-input
          :model-value="summary.timeRange"
          placeholder="例如：2026-10-01 至 2026-12-31"
          @update:model-value="setField('timeRange', $event)"
        />
      </label>
      <label class="task-field">
        <span>关注国家或地区</span>
        <el-input
          :model-value="regionsText"
          placeholder="用顿号或逗号分隔"
          @update:model-value="setList('regions', $event)"
        />
      </label>
      <label class="task-field">
        <span>关注路线</span>
        <el-input
          :model-value="routesText"
          placeholder="用顿号或逗号分隔"
          @update:model-value="setList('routes', $event)"
        />
      </label>
    </div>

    <div class="task-lists">
      <div class="task-list">
        <div class="task-list__head">
          <span>已知条件</span>
          <button type="button" class="link-btn" @click="addItem('knownConditions')">+ 增加</button>
        </div>
        <p v-if="!knownConditions.length" class="task-list__empty">暂无已知条件</p>
        <div v-for="(item, index) in knownConditions" :key="`known-${index}`" class="task-list__row">
          <el-input
            :model-value="item"
            @update:model-value="setItem('knownConditions', index, $event)"
          />
          <button type="button" class="link-btn is-danger" @click="removeItem('knownConditions', index)">删除</button>
        </div>
      </div>

      <div class="task-list">
        <div class="task-list__head">
          <span>待系统回答的问题</span>
          <button type="button" class="link-btn" @click="addItem('openQuestions')">+ 增加</button>
        </div>
        <p v-if="!openQuestions.length" class="task-list__empty">暂无待回答问题</p>
        <div v-for="(item, index) in openQuestions" :key="`open-${index}`" class="task-list__row">
          <el-input
            :model-value="item"
            @update:model-value="setItem('openQuestions', index, $event)"
          />
          <button type="button" class="link-btn is-danger" @click="removeItem('openQuestions', index)">删除</button>
        </div>
      </div>
    </div>
  </PlanSection>
</template>

<script setup>
import { computed } from 'vue'
import PlanSection from './PlanSection.vue'

const props = defineProps({
  summary: { type: Object, required: true },
})
const emit = defineEmits(['update:summary', 'dirty'])

const knownConditions = computed(() => props.summary.knownConditions || [])
const openQuestions = computed(() => props.summary.openQuestions || [])

const summaryBadge = computed(() => {
  const regions = props.summary.regions?.length || 0
  const routes = props.summary.routes?.length || 0
  if (!regions && !routes) return ''
  return `${regions} 个国家 / ${routes} 条路线`
})

const joinText = (list) => (Array.isArray(list) ? list.join('、') : '')
const regionsText = computed(() => joinText(props.summary.regions))
const routesText = computed(() => joinText(props.summary.routes))

const splitList = (text) =>
  String(text || '')
    .split(/[、,，;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)

/** 统一出口:产出新的 summary 对象,不直接改 prop */
function commit(patch) {
  emit('update:summary', { ...props.summary, ...patch })
  emit('dirty')
}

function setField(field, value) {
  commit({ [field]: value })
}

function setList(field, value) {
  commit({ [field]: splitList(value) })
}

function setItem(field, index, value) {
  const list = [...(props.summary[field] || [])]
  list[index] = value
  commit({ [field]: list })
}

function addItem(field) {
  commit({ [field]: [...(props.summary[field] || []), ''] })
}

function removeItem(field, index) {
  const list = [...(props.summary[field] || [])]
  list.splice(index, 1)
  commit({ [field]: list })
}
</script>

<style scoped>
.task-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}
.task-field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #475569; }
.task-field--wide { grid-column: 1 / -1; }
.task-lists {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 24px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed #e2e8f0;
}
.task-list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}
.task-list__empty { margin: 0; font-size: 12px; color: #94a3b8; }
.task-list__row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.link-btn {
  border: none;
  background: none;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}
.link-btn:hover { text-decoration: underline; }
.link-btn.is-danger { color: #dc2626; }
@media (max-width: 1100px) {
  .task-grid, .task-lists { grid-template-columns: minmax(0, 1fr); }
}
</style>
