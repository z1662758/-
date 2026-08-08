<template>
  <ResultVerification :scenario="scenario" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ResultVerification from './ResultVerification.vue'
const route = useRoute()
const scenario = computed(() => route.query.scenario || 'uranium')
</script>
