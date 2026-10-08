<template>
  <ExpertStageGate
    :session-id="sessionId"
    stage="osint"
    stage-label="开源情报"
    title="开源情报正在运行中"
  >
    <template #legacy><OpenSourceIntelligence /></template>
    <template #default="{ artifact, mode }">
      <OpenSourceIntelligence :artifact="artifact" :data-source="mode" />
    </template>
  </ExpertStageGate>
  <ExpertWorkflowNav v-if="sessionId && route.query.view !== 'example'"
    :back="SCNET_ROUTES.planConfirmation" :next="SCNET_ROUTES.situationJudge" next-label="态势研判" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import ExpertStageGate from '@/views/SCnet/components/ExpertStageGate.vue'
import ExpertWorkflowNav from '@/views/SCnet/components/ExpertWorkflowNav.vue'
import OpenSourceIntelligence from './OpenSourceIntelligence.vue'

const route = useRoute()
const sessionId = computed(() => String(route.query.session_id || ''))
</script>
