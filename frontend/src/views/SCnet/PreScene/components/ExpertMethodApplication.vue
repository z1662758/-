<template>
  <details v-if="application?.recorded" class="application">
    <summary>本轮实际使用的方法、步骤与数据</summary>
    <ol><li v-for="step in application.steps || []" :key="step.index">步骤 {{ step.index }}：{{ step.description }}</li></ol>
    <p><strong>应用得到的判断：</strong>{{ application.finding }}</p>
    <p><strong>适用边界：</strong>{{ application.limitation }}</p>
    <p>使用数据：{{ (application.evidence_ids || []).join('、') }}</p>
    <p>方法原文：<a v-for="source in methodSources" :key="source.id" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }} ↗ </a></p>
  </details>
  <details v-if="response?.recorded" class="application"><summary>本轮回应了什么、修订了什么</summary><p><strong>针对的具体观点：</strong>“{{ response.target_excerpt }}”</p><p><strong>证据回应：</strong>{{ response.response }}</p><p><strong>本轮修订或保留理由：</strong>{{ response.change }}</p></details>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ application: { type: Object, default: null }, response: { type: Object, default: null }, profile: { type: Object, default: null } })
const methodSources = computed(() => (props.profile?.sources || []).filter(row => (props.application?.method_source_ids || []).includes(row.id)))
</script>

<style scoped>
.application{margin:10px 0;padding:9px 12px;background:#f4f8ff;border:1px solid #e0eafa;border-radius:7px;font-size:12px;color:#4d6789;line-height:1.7}.application summary{cursor:pointer;color:#285f9e;font-weight:600}.application p{margin:6px 0}.application ol{padding-left:20px}.application a{color:#1b65b8}
</style>
