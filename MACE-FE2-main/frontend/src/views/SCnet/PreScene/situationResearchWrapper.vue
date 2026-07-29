<template>
  <SituationResearchUranium v-if="scenario === 'uranium'" />
  <SituationResearchAuto v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SituationResearchUranium from './situationResearch-main.vue'
import SituationResearchAuto from './situationResearch_auto.vue'

const route = useRoute()
const scenario = computed(() => route.query.scenario || 'uranium')
</script>
