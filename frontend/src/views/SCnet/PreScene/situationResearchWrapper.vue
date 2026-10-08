<template>
  <ExpertStageGate
    :session-id="sessionId"
    stage="prediction"
    stage-label="态势预测"
    title="态势预测正在运行中"
  >
    <template #legacy><SituationResearchMain :scenario="scenario" /></template>
    <template #default="{ artifact, mode }">
      <SituationResearchMain
        :scenario="scenario"
        :initial-data="stageResult(artifact)"
        :data-source="mode"
      />
    </template>
  </ExpertStageGate>
  <ExpertWorkflowNav v-if="sessionId"
    :back="SCNET_ROUTES.situationJudge" :next="SCNET_ROUTES.reportGeneration" next-label="报告生成" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SituationResearchMain from './situationResearch-main.vue'
import ExpertStageGate from '@/views/SCnet/components/ExpertStageGate.vue'
import ExpertWorkflowNav from '@/views/SCnet/components/ExpertWorkflowNav.vue'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'

const route = useRoute()
const sessionId = computed(() => String(route.query.session_id || ''))
const scenario = computed(() => {
  const s = route.query.scenario || 'uranium'
  return s === 'supply_chain' ? 'auto' : s
})

/** 预测结果在 artifact.result;真实结果与案例结果结构一致 */
function stageResult(artifact) {
  return artifact?.result || null
}
</script>
