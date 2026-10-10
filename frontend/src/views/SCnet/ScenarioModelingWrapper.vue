<template>
  <UraniumView v-if="scenario === 'uranium'" />
  <AutoView v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useScenarioStore } from '@/stores/scenario'
import UraniumView from './ScenarioModeling_uranium.vue'
import AutoView from './ScenarioModeling.vue'

const route = useRoute()
const scenarioStore = useScenarioStore()
// 与事前各 Wrapper 一致：优先取 URL 上的 ?scenario=，回落到全局场景 store
const scenario = computed(() => route.query.scenario || scenarioStore.currentScenario || 'uranium')
</script>
