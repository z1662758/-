<template>
  <el-drawer
    :model-value="modelValue"
    :size="560"
    :with-header="false"
    class="osint-detail-drawer"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="event" class="od">
      <header class="od-head">
        <div class="od-head__tags">
          <span class="od-level" :style="{ background: color }">{{ event.severityLabel }}</span>
          <span class="od-impact" :class="`is-${event.impactMode || 'indirect'}`">
            {{ event.impactModeLabel || '间接影响' }}
          </span>
          <span class="od-state" :class="{ 'is-active': isEffective }">{{ statusLabel(event) }}</span>
          <span v-if="event.riskType" class="od-type">{{ event.riskType }}</span>
        </div>
        <h2>{{ event.title }}</h2>
        <p v-if="event.summary" class="od-summary">{{ event.summary }}</p>
      </header>

      <dl class="od-grid">
        <div><dt>发生时间</dt><dd>{{ formatDate(event.occurredAt) }}</dd></div>
        <div><dt>信息发布时间</dt><dd>{{ formatDate(event.publishedAt) }}</dd></div>
        <div><dt>检索时间</dt><dd>{{ formatDate(event.retrievedAt) }}</dd></div>
        <div><dt>风险类型</dt><dd>{{ event.riskType || '未分类' }}</dd></div>
        <div><dt>风险等级</dt><dd>{{ event.severityLabel }}</dd></div>
        <div>
          <dt>发生地点</dt>
          <dd>
            {{ locationText(event) }}
            <em class="od-precision">{{ locationPrecisionHint(event) }}</em>
          </dd>
        </div>
      </dl>

      <section class="od-block">
        <h3>影响对象</h3>
        <p v-if="!affectedNodes.length && !affectedRoutes.length && !affectedEntities.length" class="od-empty">
          该事件未关联到具体的供应节点或运输路线。
        </p>
        <ul v-else class="od-tags">
          <li v-for="n in affectedNodes" :key="`n-${n}`" class="od-tag is-node">节点 · {{ n }}</li>
          <li v-for="r in affectedRoutes" :key="`r-${r}`" class="od-tag is-route">路线 · {{ routeLabel(r) }}</li>
          <li v-for="e in affectedEntities" :key="`e-${e}`" class="od-tag">实体 · {{ e }}</li>
        </ul>
      </section>

      <section class="od-block">
        <h3>与本次研判问题的关联</h3>
        <p :class="['od-relevance', { 'is-dim': !event.isRelevant }]">{{ relevanceText(event) }}</p>
        <p class="od-impact-reason">{{ event.impactModeReason }}</p>
        <p v-if="event.relevance?.matchedTerms?.length" class="od-terms">
          命中词：{{ event.relevance.matchedTerms.join('、') }}
        </p>
      </section>

      <!-- 内部判定按用户能读懂的方式呈现;内部代码只放在 tooltip 里,不作为可见内容 -->
      <section
        class="od-block od-block--assessment"
        :title="internalCode ? `内部判定代码：${internalCode}` : ''"
      >
        <h3>风险有效性判断</h3>
        <dl class="od-grid">
          <div><dt>当前状态</dt><dd>{{ statusLabel(event) }}</dd></div>
          <div><dt>是否计入当前风险</dt><dd>{{ isEffective ? '是' : '否' }}</dd></div>
          <div><dt>残余影响权重</dt><dd>{{ event.riskAssessment?.residualWeight ?? 0 }}</dd></div>
        </dl>
        <p class="od-assessment-text">{{ event.riskAssessment?.eligibilityReason || '—' }}</p>
        <p v-if="event.riskAssessment?.impactSummary" class="od-assessment-text">
          {{ event.riskAssessment.impactSummary }}
        </p>
      </section>

      <section class="od-block">
        <h3>来源与证据<span class="od-count">{{ event.sources?.length || 0 }} 个来源</span></h3>
        <OsintSourceList :sources="event.sources || []" />
      </section>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue'
import OsintSourceList from './OsintSourceList.vue'
import {
  formatDate,
  locationPrecisionHint,
  locationText,
  relevanceText,
  riskColor,
  statusLabel,
} from './osintDisplay'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  event: { type: Object, default: null },
  /** route_id → 中文线路名,用于把 kazakhstan 显示成"哈萨克斯坦" */
  routeNames: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])

const isEffective = computed(() => props.event?.riskAssessment?.isEffective !== false)
const color = computed(() => riskColor(props.event))
const affectedNodes = computed(() => props.event?.affectedNodeNames || [])
const affectedRoutes = computed(() => props.event?.affectedRouteIds || [])
const affectedEntities = computed(() => props.event?.affectedEntities || [])
const internalCode = computed(() => props.event?.riskAssessment?.eligibilityCode || '')

function routeLabel(id) {
  return props.routeNames?.[id] || id
}
</script>

<style scoped>
.od { display: flex; flex-direction: column; gap: 14px; }
.od-head__tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.od-level { font-size: 12px; color: #fff; border-radius: 4px; padding: 2px 9px; font-weight: 600; }
.od-state { font-size: 12px; color: #94a3b8; }
.od-state.is-active { color: #059669; }
.od-impact { font-size: 11px; border-radius: 999px; padding: 2px 9px; color: #7c3aed; background: #f5f3ff; border: 1px solid #ddd6fe; }
.od-impact.is-direct { color: #0369a1; background: #f0f9ff; border-color: #bae6fd; }
.od-type { font-size: 12px; color: #64748b; }
.od-head h2 { margin: 10px 0 8px; font-size: 17px; color: #0f172a; line-height: 1.5; }
.od-summary { margin: 0; font-size: 13px; color: #475569; line-height: 1.8; }

.od-grid { margin: 0; font-size: 13px; }
.od-grid > div { display: flex; gap: 10px; margin-bottom: 6px; }
.od-grid dt { min-width: 96px; color: #94a3b8; flex-shrink: 0; }
.od-grid dd { margin: 0; color: #334155; line-height: 1.6; }
.od-precision { display: block; font-style: normal; font-size: 11px; color: #94a3b8; margin-top: 2px; }

.od-block {
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
}
.od-block h3 {
  margin: 0 0 10px;
  font-size: 13px;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}
.od-count { font-size: 11px; color: #64748b; font-weight: 400; }
.od-empty { margin: 0; font-size: 12px; color: #94a3b8; }
.od-tags { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; }
.od-tag {
  font-size: 12px;
  border-radius: 999px;
  padding: 2px 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
}
.od-tag.is-node { color: #1d4ed8; background: #eff6ff; border-color: #bfdbfe; }
.od-tag.is-route { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }

.od-relevance { margin: 0; font-size: 13px; color: #334155; line-height: 1.7; }
.od-relevance.is-dim { color: #94a3b8; }
.od-terms { margin: 6px 0 0; font-size: 12px; color: #94a3b8; }
.od-impact-reason { margin: 6px 0 0; font-size: 12px; color: #64748b; line-height: 1.7; }

.od-block--assessment { background: #f8fafc; }
.od-assessment-text { margin: 6px 0 0; font-size: 12px; color: #475569; line-height: 1.7; }
.od-internal { margin: 8px 0 0; font-size: 11px; color: #94a3b8; font-family: ui-monospace, monospace; }
</style>
