<template>
  <!-- 「智能对话」是铀事中流程专有页；汽车场景下回落到想定生成（需求输入） -->
  <UraniumView v-if="scenario === 'uranium'" />
  <AutoView v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useScenarioStore } from '@/stores/scenario'
import UraniumView from './ScenarioAnalysis_uranium.vue'
import AutoView from './ScenarioModeling.vue'

const route = useRoute()
const scenarioStore = useScenarioStore()
const scenario = computed(() => route.query.scenario || scenarioStore.currentScenario || 'uranium')
</script>
