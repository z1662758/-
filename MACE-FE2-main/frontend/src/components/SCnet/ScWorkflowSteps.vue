<template>
  <div class="sc-workflow" aria-label="供应链仿真实验流程">
    <div
      v-for="(step, i) in steps"
      :key="step.path"
      class="sc-workflow__item"
      :class="{ active: isActive(step), done: isDone(i) }"
    >
      <router-link :to="step.path" class="sc-workflow__link">
        <span class="sc-workflow__index">{{ i + 1 }}</span>
        <span class="sc-workflow__label">{{ step.label }}</span>
        <span class="sc-workflow__hint">{{ step.hint }}</span>
      </router-link>
      <span v-if="i < steps.length - 1" class="sc-workflow__sep" aria-hidden="true">→</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const steps = [
  { path: '/home/SCnet/scenarioModeling', label: '目标拆解', hint: '需求判断与任务分解' },
  { path: '/home/SCnet/agentSimulationStudio', label: '实验设计', hint: '智能体与变量配置' },
  { path: '/home/SCnet/experimentManager', label: '任务管理', hint: '队列与运行状态' }
]

const activeOrder = computed(() => {
  const idx = steps.findIndex(s => route.path === s.path || route.path.startsWith(s.path + '/'))
  return idx >= 0 ? idx : -1
})

function isActive(step) {
  return route.path === step.path || route.path.startsWith(step.path + '/')
}

function isDone(i) {
  const cur = activeOrder.value
  return cur >= 0 && i < cur
}
</script>

<style scoped>
.sc-workflow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 4px;
  padding: 10px 16px;
  background: linear-gradient(90deg, #f0f6fc 0%, #fff 100%);
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.sc-workflow__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sc-workflow__link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: #606266;
  transition: background 0.2s, color 0.2s;
  border: 1px solid transparent;
}

.sc-workflow__link:hover {
  background: #ecf5ff;
  color: #409eff;
}

.sc-workflow__item.active .sc-workflow__link {
  background: #ecf5ff;
  color: #114f8c;
  border-color: #b3d8ff;
  font-weight: 600;
}

.sc-workflow__item.done .sc-workflow__index {
  background: #67c23a;
  color: #fff;
}

.sc-workflow__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 12px;
  background: #dcdfe6;
  color: #fff;
}

.sc-workflow__item.active .sc-workflow__index {
  background: #409eff;
}

.sc-workflow__label {
  font-size: 13px;
}

.sc-workflow__hint {
  font-size: 11px;
  color: #909399;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-workflow__item.active .sc-workflow__hint {
  color: #606266;
}

.sc-workflow__sep {
  color: #c0c4cc;
  font-size: 12px;
  user-select: none;
}

@media (max-width: 900px) {
  .sc-workflow__hint {
    display: none;
  }
}
</style>
