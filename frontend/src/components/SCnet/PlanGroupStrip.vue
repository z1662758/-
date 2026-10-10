<template>
  <section v-if="stageType && groups.length" class="plan-group-strip" :class="'plan-group-strip--' + stage">
    <header class="pgs-head">
      <span class="pgs-badge">{{ stageType.code }}</span>
      <div class="pgs-title">
        <p class="pgs-eyebrow">方案实验组 · {{ stageType.label }}</p>
        <p class="pgs-sub">{{ stageType.short }}按下面 {{ groups.length }} 个实验组逐组比对，每组只相对 F-00 改变一个因素。</p>
      </div>
      <span class="pgs-count">{{ groups.length }} 组</span>
      <button type="button" class="pgs-toggle" @click="expanded = !expanded">{{ expanded ? '收起' : '展开' }}</button>
    </header>

    <div v-show="expanded" class="pgs-body">
      <article v-for="group in groups" :key="group.id" class="pgs-group">
        <span class="pgs-group-id">{{ group.id }}</span>
        <div class="pgs-group-main">
          <p class="pgs-group-name">{{ group.name || '未命名实验组' }}</p>
          <p class="pgs-group-meta">
            <span v-if="group.factor">改变 <b>{{ group.factor }}</b></span>
            <span v-if="group.levels">{{ group.levels }}</span>
            <span>对照 <b>{{ group.control || 'F-00' }}</b></span>
            <span v-if="group.method">方法 <b>{{ group.method }}</b></span>
          </p>
          <p v-if="group.hypothesis" class="pgs-group-hypo">H：{{ group.hypothesis }}</p>
        </div>
      </article>
    </div>

    <p class="pgs-foot">
      来自实验方案设计页的「实验组设计」。
      <router-link v-if="designLink" :to="designLink" class="pgs-link">回到实验组设计</router-link>
    </p>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { PLAN_QUERY_KEY, readExperimentPlan, resolveAnalysisPlans, ANALYSIS_PLAN_TYPES } from '@/constants/scnetExperimentPlan'

const props = defineProps({
  // 三阶段分析页：observe / intervention / mechanism
  stage: { type: String, required: true },
  defaultOpen: { type: Boolean, default: false }
})

const route = useRoute()
const expanded = ref(props.defaultOpen)
const plan = computed(() => readExperimentPlan(String(route.query[PLAN_QUERY_KEY] || '').trim()))
const stageType = computed(() => ANALYSIS_PLAN_TYPES.find((type) => type.key === props.stage) || null)
// 没有方案就不展示：三阶段分析页不能空口造实验组
const groups = computed(() => {
  if (!plan.value) return []
  const plans = resolveAnalysisPlans(plan.value)
  const stagePlan = plans[props.stage]
  return stagePlan && Array.isArray(stagePlan.groups) ? stagePlan.groups : []
})
const designLink = computed(() => {
  const id = plan.value && plan.value.id
  if (!id) return null
  const query = { scenario: route.query.scenario, plan_id: id, phase: 'post' }
  if (route.query.session_id) query.session_id = route.query.session_id
  if (route.query.from_chat) query.from_chat = route.query.from_chat
  return { path: SCNET_ROUTES.experimentPlan, query }
})
</script>

<style scoped>
.plan-group-strip {
  margin: 0 0 14px; padding: 12px 14px;
  border: 1px solid #e2e8f0; border-radius: 12px; background: #fbfcfe;
}
.plan-group-strip--observe { border-color: #bfdbfe; background: #f5f9ff; }
.plan-group-strip--intervention { border-color: #fde68a; background: #fffdf5; }
.plan-group-strip--mechanism { border-color: #ddd6fe; background: #faf8ff; }
.pgs-head { display: flex; align-items: center; gap: 10px; }
.pgs-badge {
  flex: 0 0 auto; padding: 2px 8px; border-radius: 6px;
  background: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: 800; letter-spacing: 0.04em;
}
.pgs-title { flex: 1; min-width: 0; }
.pgs-eyebrow { margin: 0; font-size: 13px; font-weight: 800; color: #0f172a; }
.pgs-sub { margin: 2px 0 0; font-size: 12px; color: #64748b; }
.pgs-count {
  flex: 0 0 auto; padding: 2px 9px; border-radius: 999px;
  background: #eef2ff; color: #4338ca; font-size: 11.5px; font-weight: 700;
}
.pgs-toggle {
  flex: 0 0 auto; padding: 4px 10px; border: 1px solid #cbd5e1; border-radius: 999px;
  background: #fff; color: #475569; font-size: 11.5px; cursor: pointer;
}
.pgs-toggle:hover { border-color: #93c5fd; color: #1d4ed8; }
.pgs-body { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; margin-top: 10px; }
.pgs-group {
  display: flex; gap: 8px; padding: 9px 11px; border: 1px solid #e8edf6; border-radius: 10px; background: #fff;
}
.pgs-group-id {
  flex: 0 0 auto; align-self: flex-start; padding: 1px 7px; border-radius: 6px;
  background: #eef2ff; color: #4338ca; font-size: 10.5px; font-weight: 800;
}
.pgs-group-main { min-width: 0; }
.pgs-group-name { margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; }
.pgs-group-meta { display: flex; flex-wrap: wrap; gap: 3px 12px; margin: 4px 0 0; color: #64748b; font-size: 11.5px; }
.pgs-group-meta b { color: #334155; font-weight: 700; }
.pgs-group-hypo { margin: 4px 0 0; color: #475569; font-size: 11.5px; line-height: 1.5; }
.pgs-foot { margin: 10px 0 0; color: #94a3b8; font-size: 11.5px; }
.pgs-link { margin-left: 6px; color: #2563eb; font-weight: 600; text-decoration: none; }
.pgs-link:hover { text-decoration: underline; }
</style>
