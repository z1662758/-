<template>
  <!--
    精简版页头：全局 Header 已经带了平台名与阶段徽标，这里不再重复图标与整句副标题，
    只保留一个用于定位当前页的短标题（左侧菜单默认是折叠的）+ 中间上下文 + 右侧操作。
  -->
  <div class="mid-page-header glass-panel is-compact">
    <span class="mph-title">{{ title }}</span>

    <div v-if="$slots.center" class="mph-center">
      <slot name="center" />
    </div>

    <div v-if="$slots.right" class="mph-right">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup>
import './midStage.css'

defineProps({
  title: { type: String, required: true },
  // subtitle / icon / emoji 保留为兼容属性（精简后不再渲染），避免改动各调用页
  subtitle: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  emoji: { type: String, default: '' }
})
</script>

<style scoped>
.mid-page-header.is-compact {
  padding: 6px 14px;
}
.mid-page-header.is-compact .mph-title {
  flex-shrink: 0;
}
</style>
