<template>
  <KnowledgeGraphUranium v-if="scenario === 'uranium'" />
  <KnowledgeGraphAuto v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import KnowledgeGraphUranium from './KnowledgeGraph.vue'
import KnowledgeGraphAuto from './KnowledgeGraph_auto.vue'

const route = useRoute()
const scenario = computed(() => route.query.scenario || 'uranium')
</script>
