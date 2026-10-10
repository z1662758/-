<template>
  <div
    class="route-progress-rail"
    :class="{ collapsible, collapsed: collapsible && !hovered }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <div class="route-progress-head">{{ title }}</div>
    <div
      v-for="(step, index) in steps"
      :key="step.key"
      class="route-progress-item"
      :class="{
        active: step.key === currentKey,
        completed: isStepCompleted(step.key)
      }"
      :title="step.label"
      @click="onClick(step)"
    >
      <span class="route-progress-dot">
        <template v-if="isStepCompleted(step.key)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </template>
        <template v-else>{{ index + 1 }}</template>
      </span>
      <span class="route-progress-label">{{ step.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  steps: { type: Array, required: true },
  currentKey: { type: String, default: '' },
  completedPredicate: { type: Function, default: () => false },
  title: { type: String, default: '事中流程' },
  /** 参考 MACE 工作台的流程进度栏：默认折叠为圆点，悬停展开标签 */
  collapsible: { type: Boolean, default: false }
})

const emit = defineEmits(['step-click'])

const hovered = ref(false)

function isStepCompleted(key) {
  if (key === props.currentKey) return false
  try {
    return !!props.completedPredicate(key)
  } catch {
    return false
  }
}

function onClick(step) {
  emit('step-click', step)
}
</script>

<style scoped>
.route-progress-rail {
  position: fixed;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1300;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 190px;
  padding: 16px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px) saturate(1.6);
  -webkit-backdrop-filter: blur(18px) saturate(1.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow:
    0 8px 24px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition: width 0.28s cubic-bezier(.4,0,.2,1), padding 0.28s cubic-bezier(.4,0,.2,1), background 0.28s ease;
}

.route-progress-rail.collapsed {
  width: 52px;
  padding: 12px 9px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow:
    0 4px 16px rgba(59, 130, 246, 0.08),
    0 1px 4px rgba(15, 23, 42, 0.04);
}

.route-progress-head {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.2s ease, max-height 0.2s ease;
}

.route-progress-rail.collapsed .route-progress-head {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
}

.route-progress-item {
  right: 3px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  padding: 8px 4px;
  border-radius: 10px;
  transition: background 0.2s ease;
}

.route-progress-item:hover {
  background: rgba(59, 130, 246, 0.06);
}

.route-progress-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 19px;
  transform: translateX(-50%);
  top: 38px;
  width: 2.5px;
  height: calc(100% - 22px);
  border-radius: 2px;
  background: linear-gradient(180deg, #cbd5e1 0%, #e2e8f0 100%);
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.route-progress-item.completed:not(:last-child)::after {
  background: linear-gradient(180deg, #60a5fa 0%, #93c5fd 100%);
  box-shadow: 0 0 6px rgba(96, 165, 250, 0.3);
}

.route-progress-item.active:not(:last-child)::after {
  background: linear-gradient(180deg, #3b82f6 0%, #93c5fd 50%, #cbd5e1 100%);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.25);
}

.route-progress-dot {
  width: 30px;
  height: 30px;
  min-width: 30px;
  border-radius: 50%;
  border: 2.5px solid #cbd5e1;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transition: all 0.3s cubic-bezier(.4,0,.2,1);
  position: relative;
}

.route-progress-dot svg {
  display: block;
}

.route-progress-item:hover .route-progress-dot {
  border-color: #93c5fd;
  color: #3b82f6;
  transform: scale(1.1);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
}

.route-progress-item.active .route-progress-dot {
  border-color: transparent;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  color: #fff;
  box-shadow:
    0 0 0 4px rgba(59, 130, 246, 0.18),
    0 4px 12px rgba(59, 130, 246, 0.30);
  animation: activePulse 2.4s ease-in-out infinite;
}

.route-progress-item.completed .route-progress-dot {
  border-color: transparent;
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
}

@keyframes activePulse {
  0%, 100% {
    box-shadow:
      0 0 0 4px rgba(59, 130, 246, 0.18),
      0 4px 12px rgba(59, 130, 246, 0.30);
  }
  50% {
    box-shadow:
      0 0 0 8px rgba(59, 130, 246, 0.08),
      0 4px 16px rgba(59, 130, 246, 0.20);
  }
}

.route-progress-label {
  font-size: 13px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  opacity: 1;
  font-weight: 500;
  letter-spacing: 0.2px;
  transition: opacity 0.28s cubic-bezier(.4,0,.2,1),
              max-width 0.28s cubic-bezier(.4,0,.2,1),
              color 0.2s ease;
}

.route-progress-rail.collapsed .route-progress-label {
  max-width: 0;
  opacity: 0;
}

.route-progress-item:hover .route-progress-label {
  color: #3b82f6;
}

.route-progress-item.active .route-progress-label {
  color: #1d4ed8;
  font-weight: 700;
}

.route-progress-item.completed .route-progress-label {
  color: #059669;
  font-weight: 600;
}

@media (max-width: 1280px) {
  .route-progress-rail {
    display: none;
  }
}
</style>
