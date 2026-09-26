<template>
  <!-- 「建模设定」是铀事中流程专有页；汽车场景下回落到想定生成（场景设定向导） -->
  <UraniumView v-if="scenario === 'uranium'" />
  <AutoView v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useScenarioStore } from '@/stores/scenario'
import UraniumView from './ModelingSetup_uranium.vue'
import AutoView from './ScenarioModeling.vue'

const route = useRoute()
const scenarioStore = useScenarioStore()
// 与事前各 Wrapper 一致：优先取 URL 上的 ?scenario=，回落到全局场景 store
const scenario = computed(() => route.query.scenario || scenarioStore.currentScenario || 'uranium')
</script>
