<template>
  <UraniumView v-if="scenario === 'uranium'" />
  <AutoView v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useScenarioStore } from '@/stores/scenario'
// 旧“推演界面”地址继续可用，但铀场景统一进入实验推演工作台。
import UraniumView from './UraniumExperimentWorkbench.vue'
import AutoView from './interface.vue'

const route = useRoute()
const scenarioStore = useScenarioStore()
// 与事前各 Wrapper 一致：优先取 URL 上的 ?scenario=，回落到全局场景 store
const scenario = computed(() => route.query.scenario || scenarioStore.currentScenario || 'uranium')
</script>
