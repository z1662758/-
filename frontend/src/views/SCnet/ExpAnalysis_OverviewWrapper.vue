<template>
  <UraniumView v-if="scenario === 'uranium'" />
  <AutoView v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useScenarioStore } from '@/stores/scenario'
import UraniumView from './ExpAnalysis_Overview_uranium.vue'
import AutoView from './ExpAnalysis_Overview.vue'

const route = useRoute()
const scenarioStore = useScenarioStore()
const scenario = computed(() => route.query.scenario || scenarioStore.currentScenario || 'uranium')
</script>
