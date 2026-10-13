<template>
  <ExpertStageGate
    :session-id="sessionId"
    stage="judgment"
    stage-label="态势研判"
    title="态势研判正在运行中"
  >
    <!-- 无会话时没有顶部信息栏:子标签由 SituationMap 渲染在地图上方(供应来源占比栏之上),
         这里只把 store 里的视角与切换事件接上去,保证三种研判视角始终可切换。 -->
    <template #legacy>
      <SituationJudge
        :scenario="scenario"
        :judgment-mode="workflowStore.judgmentMode"
        @update:judgmentMode="workflowStore.setJudgmentMode($event)"
      />
    </template>
    <!-- 视图范围切换由 gate 渲染到标题行右上,与「当前任务结果」同排 -->
    <template #stage-tools>
      <JudgmentScopeSwitch
        :scope="workflowStore.judgmentScope"
        @update:scope="workflowStore.setJudgmentScope($event)"
      />
    </template>
    <template #default="{ artifact, mode }">
      <SituationJudge
        :scenario="scenario"
        :initial-data="legacyPayload(artifact)"
        :global-network="globalNetwork(artifact, mode)"
        :focused="focusedPayload(artifact)"
        :llm-judgment="llmJudgment(artifact)"
        :dual-judgment="dualJudgment(artifact)"
        :judgment-scope="workflowStore.judgmentScope"
        :judgment-mode="workflowStore.judgmentMode"
        :data-source="mode"
        @update:judgmentMode="workflowStore.setJudgmentMode($event)"
      />
    </template>
  </ExpertStageGate>
  <ExpertWorkflowNav v-if="sessionId"
    :back="SCNET_ROUTES.planConfirmation" :next="SCNET_ROUTES.situationResearch" next-label="态势预测" />
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SituationJudge from './situationJudge.vue'
import ExpertStageGate from './components/ExpertStageGate.vue'
import ExpertWorkflowNav from './components/ExpertWorkflowNav.vue'
import JudgmentScopeSwitch from './components/JudgmentScopeSwitch.vue'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { useExpertWorkflowStore } from '@/stores/scnet/useExpertWorkflowStore'

const route = useRoute()
const router = useRouter()
const workflowStore = useExpertWorkflowStore()
const sessionId = computed(() => String(route.query.session_id || ''))
const scenario = computed(() => {
  const s = route.query.scenario || 'uranium'
  return s === 'supply_chain' ? 'auto' : s
})

/* ---------- 视图范围与 URL 同步:刷新后仍停在同一视图 ---------- */
if (route.query.scope === 'global') workflowStore.setJudgmentScope('global')

watch(
  () => workflowStore.judgmentScope,
  (scope) => {
    const query = { ...route.query }
    if (scope === 'global') query.scope = 'global'
    else delete query.scope
    if ((route.query.scope || '') === (query.scope || '')) return
    router.replace({ path: route.path, query })
  },
)

watch(
  () => route.query.scope,
  (scope) => {
    workflowStore.setJudgmentScope(scope === 'global' ? 'global' : 'focused')
  },
)

/**
 * artifact 统一信封里,态势研判的 result 分成两块:
 *   global  —— 唯一的一套网络数据(节点/路线/事件/指标) + 现有研判图表(legacy)
 *   focused —— 与本次需求相关的 ID 集合,只用于高亮与置灰
 * 真实结果与案例结果结构完全一致。
 */
const result = (artifact) => artifact?.result || null

function legacyPayload(artifact) {
  return result(artifact)?.global?.legacy || null
}

/**
 * 数据来源:优先用 artifact 自带的 provenance。
 * 旧任务(本次改动之前生成)的 artifact 没有 provenance 字段,
 * 这时按"这份 artifact 是从哪个会话、以什么模式取来的"补齐:
 * live 模式下从当前会话取到的已完成阶段产物,本身就是当前任务的真实结果。
 */
function provenanceOf(artifact, mode) {
  if (artifact?.provenance) return artifact.provenance
  const fromCurrentTask = mode !== 'example'
  return {
    sourceType: fromCurrentTask ? 'current_task' : 'example',
    sessionId: artifact?.sessionId || '',
    scenario: artifact?.scenario || scenario.value,
    planVersion: artifact?.inputPlanVersion || 0,
    generatedAt: artifact?.completedAt || '',
    isOfficialResult: fromCurrentTask && artifact?.status === 'completed',
  }
}

function globalNetwork(artifact, mode) {
  const global = result(artifact)?.global
  if (!global) return null
  // 案例包保留原始阶段产物；地图与复杂网络图共用按原案例时间截点
  // 用现行固定模型链复算的网络，避免路线已高风险但节点/边仍是旧分级。
  const network = mode === 'example' && global.recomputedNetwork
    ? global.recomputedNetwork : global
  return {
    routes: network.routes || [],
    nodes: network.nodes || [],
    events: network.events || [],
    metrics: network.metrics || {},
    // 来源随网络一起透传,供地图判断能否标记为「当前任务真实结果」
    provenance: provenanceOf(artifact, mode),
  }
}

function focusedPayload(artifact) {
  return result(artifact)?.focused || null
}

/**
 * 大模型研判结果(result.llm)。
 *
 * 由后端 llm_judgment_service 真实调用大模型产出,只含理解层结论
 * (风险主题/影响方向/影响路径/置信度/待核验问题),不含任何风险分数。
 * 旧任务与案例包没有这一块 —— 返回 null,页面显示"暂无大模型研判结果",
 * 绝不用领域模型结果顶替。
 */
function llmJudgment(artifact) {
  return result(artifact)?.llm || null
}

function dualJudgment(artifact) {
  return result(artifact)?.dual || null
}
</script>
