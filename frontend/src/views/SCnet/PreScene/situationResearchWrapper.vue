<template>
  <SituationResearchMain :scenario="scenario" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SituationResearchMain from './situationResearch-main.vue'

const route = useRoute()
const scenario = computed(() => {
  const s = route.query.scenario || 'uranium'
  return s === 'supply_chain' ? 'auto' : s
})
</script>
