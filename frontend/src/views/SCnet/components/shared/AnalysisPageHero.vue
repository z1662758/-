<template>
  <section class="analysis-hero glass-panel">
    <div class="analysis-hero-main">
      <p class="analysis-hero-eyebrow">{{ eyebrow }}</p>
      <h2 class="analysis-hero-title">{{ title }}</h2>
      <p v-if="headline" class="analysis-hero-headline">{{ headline }}</p>
      <!-- summary 是每页固定的方法论说明，与结论重复，精简后不再渲染 -->

      <div v-if="tags.length" class="analysis-hero-tags">
        <el-tag
          v-for="item in tags"
          :key="item.label"
          size="small"
          :type="item.type || 'info'"
          effect="light"
        >
          {{ item.value ? `${item.label}：${item.value}` : item.label }}
        </el-tag>
      </div>
    </div>

    <div v-if="$slots.side" class="analysis-hero-side">
      <slot name="side" />
    </div>
  </section>
</template>

<script setup>
import './midStage.css'

defineOptions({ name: 'AnalysisPageHero' })

defineProps({
  /** 顶部小标签，统一使用中文，如「博弈论分析」 */
  eyebrow: { type: String, default: '决策分析' },
  /** 页面主标题：当前分析对象 */
  title: { type: String, required: true },
  /** 一句话结论 */
  headline: { type: String, default: '' },
  /** 一句话方法说明 */
  summary: { type: String, default: '' },
  /** [{ label, value, type }] */
  tags: { type: Array, default: () => [] }
})
</script>
