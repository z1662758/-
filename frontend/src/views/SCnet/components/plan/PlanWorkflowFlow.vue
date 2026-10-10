<template>
  <PlanSection
    title="分析执行流程"
    :badge="`${enabledCount}/${steps.length} 步启用`"
    hint="确认后后台将按此顺序自动执行，不依赖您停留在页面上"
  >
    <ol class="flow">
      <li v-for="(step, index) in steps" :key="step.id" class="flow-item" :class="{ 'is-off': step.enabled === false }">
        <span class="flow-item__marker">
          <b>{{ String(index + 1).padStart(2, '0') }}</b>
        </span>
        <div class="flow-item__body">
          <div class="flow-item__head">
            <span class="flow-item__name">{{ step.name }}</span>
            <el-checkbox :model-value="step.enabled !== false" @update:model-value="toggle(step, $event)">
              {{ step.enabled === false ? '已停用' : '启用' }}
            </el-checkbox>
          </div>
          <p class="flow-item__desc">{{ step.description || '—' }}</p>
          <div class="flow-item__meta">
            <span>
              前置依赖：
              <template v-if="step.dependencies?.length">
                {{ step.dependencies.map(nameOf).join(' → ') }}
              </template>
              <template v-else>无（起始步骤）</template>
            </span>
          </div>
        </div>
      </li>
    </ol>

    <p v-if="enabledCount === 0" class="flow-warn">
      至少要启用一个分析步骤，否则确认后没有可执行的分析能力。
    </p>
    <p v-if="disabledNotice" class="flow-notice">{{ disabledNotice }}</p>
  </PlanSection>
</template>

<script setup>
import { computed, ref } from 'vue'
import PlanSection from './PlanSection.vue'

const props = defineProps({
  steps: { type: Array, required: true },
})
const emit = defineEmits(['update:steps', 'dirty'])

const disabledNotice = ref('')

const enabledCount = computed(() => props.steps.filter((item) => item.enabled !== false).length)
const nameOf = (id) => props.steps.find((item) => item.id === id)?.name || id

/**
 * 依赖有效性:停用某一步时,所有依赖它的后续步骤必须一并停用,
 * 否则确认后会出现「依赖了不执行的步骤」的无效流程。
 */
function toggle(step, value) {
  const next = props.steps.map((item) => ({ ...item }))
  const target = next.find((item) => item.id === step.id)
  if (!target) return
  target.enabled = Boolean(value)

  const cascaded = []
  if (!target.enabled) {
    const queue = [step.id]
    while (queue.length) {
      const current = queue.shift()
      for (const candidate of next) {
        if (candidate.enabled === false) continue
        if (!(candidate.dependencies || []).includes(current)) continue
        candidate.enabled = false
        cascaded.push(candidate.name)
        queue.push(candidate.id)
      }
    }
    // 起始步骤必须保持启用,否则整个流程没有入口
    const first = next[0]
    if (first && first.enabled === false) {
      first.enabled = true
      cascaded.length = 0
    }
  }

  disabledNotice.value = cascaded.length
    ? `停用「${step.name}」后，依赖它的步骤已一并停用：${cascaded.join('、')}。`
    : ''
  emit('update:steps', next)
  emit('dirty')
}
</script>

<style scoped>
.flow { list-style: none; margin: 0; padding: 0; }
.flow-item {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 12px;
  position: relative;
  padding-bottom: 14px;
}
.flow-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 14px;
  top: 30px;
  bottom: 0;
  width: 2px;
  background: #e2e8f0;
}
.flow-item.is-off::before { background: repeating-linear-gradient(180deg, #e2e8f0 0 4px, transparent 4px 8px); }
.flow-item__marker {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  z-index: 1;
}
.flow-item.is-off .flow-item__marker { background: #f1f5f9; border-color: #e2e8f0; color: #94a3b8; }
.flow-item__body { padding-top: 3px; }
.flow-item__head { display: flex; align-items: center; gap: 12px; }
.flow-item__name { font-size: 13px; font-weight: 600; color: #0f172a; }
.flow-item.is-off .flow-item__name { color: #94a3b8; text-decoration: line-through; }
.flow-item__desc { margin: 4px 0 4px; font-size: 12px; color: #64748b; line-height: 1.55; }
.flow-item__meta { font-size: 12px; color: #94a3b8; }
.flow-warn { margin: 10px 0 0; font-size: 12px; color: #dc2626; }
.flow-notice { margin: 8px 0 0; font-size: 12px; color: #b45309; }
</style>
