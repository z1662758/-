<template>
  <nav class="exp-stage-nav">
    <span class="esn-title">实验闭环</span>
    <ol class="esn-steps">
      <li v-for="(step, index) in steps" :key="step.key" class="esn-step"
        :title="step.disabled ? step.title : ''">
        <button
          type="button"
          class="esn-btn"
          :class="stepClass(step)"
          :disabled="step.disabled"
          :title="step.title"
          @click="go(step)"
        >
          <span class="esn-index">{{ step.index }}</span>
          <span class="esn-label">{{ step.label }}</span>
        </button>
        <span v-if="index < steps.length - 1" class="esn-sep">&rsaquo;</span>
      </li>
    </ol>
    <button v-if="showBack" type="button" class="esn-back" @click="backToChat">回到本次对话</button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { PLAN_CONTEXT_KEYS } from '@/constants/scnetExperimentPlan'

const props = defineProps({
  // run | observe | intervention | mechanism：当前所处环节
  current: { type: String, default: '' },
  // 本轮实验 id，三阶段分析页据此加载同一份实验数据
  experimentId: { type: String, default: '' },
  planId: { type: String, default: '' }
})

const route = useRoute()
const router = useRouter()

const sessionId = computed(() => String(route.query.session_id || '').trim())
const resolvedExperimentId = computed(() => String(props.experimentId || route.query.experiment_id || '').trim())
const resolvedPlanId = computed(() => String(props.planId || route.query.plan_id || '').trim())

// 从对话跳进来时，页面顶部已有 <ChatHandoffStrip> 提供同一个「回到本次对话」入口，
// 这里就不再重复渲染第二个，避免同一动作在一屏里出现两次。
const hasHandoffStrip = computed(() => (
  String(route.query.from_chat || '') === '1' &&
  Boolean(String(route.query.session_id || route.query.conversation_id || '').trim())
))
const showBack = computed(() => Boolean(sessionId.value) && !hasHandoffStrip.value)

// 跳转时把闭环上下文整体带上：实验 id + 方案 id + 来源对话 + 阶段 + 场景
const buildQuery = (extra) => {
  const query = {}
  PLAN_CONTEXT_KEYS.forEach((key) => {
    const value = route.query[key]
    if (value !== undefined && value !== '') query[key] = value
  })
  if (resolvedExperimentId.value) query.experiment_id = resolvedExperimentId.value
  if (resolvedPlanId.value) query.plan_id = resolvedPlanId.value
  return Object.assign(query, extra || {})
}

const steps = computed(() => {
  const hasExperiment = Boolean(resolvedExperimentId.value)
  const needRun = '需要先运行反事实实验，拿到实验数据后该阶段才有内容'
  return [
    { key: 'run', index: '0', label: '运行实验', path: SCNET_ROUTES.counterfactualExperiment, disabled: false, title: '回到反事实实验平台' },
    { key: 'observe', index: '1', label: '观察分析', path: SCNET_ROUTES.expAnalysisObserve, disabled: !hasExperiment, title: hasExperiment ? '看指标分布、基线与异常判定' : needRun },
    { key: 'intervention', index: '2', label: '干预分析', path: SCNET_ROUTES.expAnalysisIntervention, disabled: !hasExperiment, title: hasExperiment ? '看干预策略效果与异常事件' : needRun },
    { key: 'mechanism', index: '3', label: '机制分析', path: SCNET_ROUTES.expAnalysisMechanism, disabled: !hasExperiment, title: hasExperiment ? '看因果路径与传导机制' : needRun }
  ]
})

const currentKey = computed(() => {
  if (props.current) return props.current
  const path = String(route.path || '')
  if (path.includes('/counterfactualExperiment')) return 'run'
  if (path.includes('/expAnalysisObserve')) return 'observe'
  if (path.includes('/expAnalysisIntervention')) return 'intervention'
  if (path.includes('/expAnalysisMechanism')) return 'mechanism'
  return ''
})

const stepClass = (step) => ({
  active: step.key === currentKey.value,
  done: !step.disabled && step.key !== currentKey.value
})

const go = (step) => {
  if (step.disabled) return
  if (step.key === currentKey.value) return
  router.push({ path: step.path, query: buildQuery() })
}

const backToChat = () => {
  router.push({ path: '/chatHome', query: sessionId.value ? { conversation_id: sessionId.value } : {} })
}
</script>

<style scoped>
.exp-stage-nav {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin: 0 0 14px; padding: 8px 14px;
  border: 1px solid #e5e7eb; border-radius: 10px; background: #fafafa;
}
.esn-title { color: #6b7280; font-size: 12px; }
.esn-steps { display: flex; align-items: center; gap: 4px; margin: 0; padding: 0; list-style: none; }
.esn-step { display: flex; align-items: center; gap: 4px; }
.esn-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border: 1px solid #e5e7eb; border-radius: 999px;
  background: #fff; color: #4b5563; font-size: 12.5px; cursor: pointer; transition: all 0.2s;
}
.esn-btn:hover:not(:disabled) { border-color: #a5b4fc; color: #4338ca; }
.esn-btn.done { color: #047857; border-color: #bbf7d0; }
.esn-btn.active { background: #eef2ff; border-color: #a5b4fc; color: #4338ca; font-weight: 600; }
.esn-btn:disabled { color: #d1d5db; border-color: #f3f4f6; cursor: not-allowed; }
.esn-index {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%; background: #eef2ff; color: #4338ca; font-size: 10.5px;
}
.esn-btn:disabled .esn-index { background: #f3f4f6; color: #d1d5db; }
.esn-sep { color: #d1d5db; font-size: 13px; }
.esn-back {
  margin-left: auto; padding: 5px 12px; border: 1px solid #c4b5fd; border-radius: 999px;
  background: #fff; color: #5b21b6; font-size: 12.5px; cursor: pointer;
}
.esn-back:hover { background: #5b21b6; border-color: #5b21b6; color: #fff; }
</style>
