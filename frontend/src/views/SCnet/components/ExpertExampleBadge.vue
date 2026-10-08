<template>
  <div class="example-badge">
    <span class="example-badge__dot"></span>
    <span class="example-badge__text">{{ store.badgeText }}</span>
    <!-- 可选的同排控件,例如「与本次需求相关 / 全局态势」范围切换 -->
    <span v-if="$slots.extra" class="example-badge__extra"><slot name="extra" /></span>
    <el-button link type="primary" size="small" @click="emit('back')">
      返回当前任务
    </el-button>
  </div>
</template>

<script setup>
import { useExpertExampleStore } from '@/stores/scnet/useExpertExampleStore'

const emit = defineEmits(['back'])

const store = useExpertExampleStore()
</script>

<style scoped>
.example-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  /* 窄屏时整条信息栏折行,而不是把中间的研判子标签挤没 */
  flex-wrap: wrap;
  row-gap: 6px;
  padding: 7px 14px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}
.example-badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}
.example-badge__text { font-weight: 600; }
/* 推到「返回当前任务」左侧;未提供插槽时不渲染,不占位 */
.example-badge__extra { margin-left: auto; display: inline-flex; }
</style>
