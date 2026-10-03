<template>
  <ExpertStageGate
    :session-id="sessionId"
    stage="report"
    stage-label="报告生成"
    title="报告正在生成中"
  >
    <template #legacy><ReportGeneration /></template>
    <template #default="{ artifact, mode }">
      <!-- 传完整信封(而不只是 result):报告页要用 provenance 判断当前任务/案例 -->
      <ExpertReportView :artifact="artifact" :data-source="mode" />
    </template>
  </ExpertStageGate>
  <ExpertWorkflowNav v-if="sessionId" :back="SCNET_ROUTES.situationResearch" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import ExpertStageGate from '@/views/SCnet/components/ExpertStageGate.vue'
import ExpertWorkflowNav from '@/views/SCnet/components/ExpertWorkflowNav.vue'
import ReportGeneration from './ReportGeneration.vue'
import ExpertReportView from '@/views/SCnet/components/report/ExpertReportView.vue'

const route = useRoute()
const sessionId = computed(() => String(route.query.session_id || ''))
</script>
