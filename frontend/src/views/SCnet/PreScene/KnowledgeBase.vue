<template>
  <div class="kb-page">
    <KnowledgeCreate />
  </div>
</template>

<script setup>
import KnowledgeCreate from './KnowledgeCreate.vue'
</script>

<style scoped>
.kb-page {
  width: 100%;
  min-height: 100%;
  padding: 12px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top left, rgba(41, 94, 168, 0.08), transparent 34%),
    linear-gradient(180deg, #f6f9fd 0%, #eef3fb 100%);
}
</style>
