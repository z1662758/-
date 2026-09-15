<template>
  <KnowledgeGraphUranium v-if="scenario === 'uranium'" />
  <KnowledgeGraphAuto v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useScenarioStore } from '@/stores/scenario'
import KnowledgeGraphUranium from './KnowledgeGraph.vue'
import KnowledgeGraphAuto from './KnowledgeGraph_auto.vue'

const route = useRoute()
const scenarioStore = useScenarioStore()
// 优先 URL 参数，其次全局场景（嵌入知识库时跟随 铀/汽车 切换）
const scenario = computed(() => route.query.scenario || scenarioStore.currentScenario || 'uranium')
</script>
