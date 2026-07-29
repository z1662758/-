<template>
  <SituationJudgeUranium v-if="scenario === 'uranium'" />
  <SituationJudgeAuto v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SituationJudgeUranium from './situationJudge.vue'
import SituationJudgeAuto from './situationJudge_auto.vue'

const route = useRoute()
const scenario = computed(() => route.query.scenario || 'uranium')
</script>
