<template>
  <SituationJudge :scenario="scenario" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SituationJudge from './situationJudge.vue'

const route = useRoute()
const scenario = computed(() => {
  const s = route.query.scenario || 'uranium'
  return s === 'supply_chain' ? 'auto' : s
})
</script>
