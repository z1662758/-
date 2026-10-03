<template>
  <article
    class="osint-card"
    :class="{ 'is-selected': selected, 'is-inactive': !isEffective }"
    @click="emit('select', event)"
  >
    <header class="osint-card__head">
      <span class="osint-card__level" :style="{ background: color }">{{ event.severityLabel }}</span>
      <span class="osint-card__source-tag" :class="sourceTone">{{ sourceLabel }}</span>
      <span class="osint-card__impact" :class="`is-${event.impactMode || 'indirect'}`">
        {{ event.impactModeLabel || '间接影响' }}
      </span>
      <span class="osint-card__state is-active">{{ statusLabel(event) }}</span>
      <span v-if="event.riskType" class="osint-card__type">{{ event.riskType }}</span>
    </header>

    <h3 class="osint-card__title">{{ event.title }}</h3>

    <!-- 正文只放真实摘要,内部判定文案不在这里出现 -->
    <p v-if="event.summary" class="osint-card__summary">{{ event.summary }}</p>
    <p v-else class="osint-card__summary is-empty">该事件暂无摘要</p>

    <dl class="osint-card__meta">
      <div>
        <dt>发生地点</dt>
        <dd>
          {{ locationText(event) }}
          <em v-if="!hasCoordinates(event)" class="osint-card__unlocated">该事件暂时无法精确定位</em>
        </dd>
      </div>
      <div><dt>发生时间</dt><dd>{{ formatDate(event.occurredAt) }}</dd></div>
      <div>
        <dt>关联原因</dt>
        <dd :class="{ 'is-dim': !event.isRelevant }">{{ relevanceText(event) }}</dd>
      </div>
    </dl>

    <footer class="osint-card__foot">
      <span class="osint-card__sources">
        {{ event.sources?.length || 0 }} 个来源
      </span>
      <span v-if="!isEffective" class="osint-card__hint">
        {{ isImported ? '用户导入，尚未经过风险有效性判定' : '作为市场传导因素展示，不直接增加路线风险' }}
      </span>
      <el-button link type="primary" size="small" @click.stop="emit('select', event)">
        查看详情
      </el-button>
    </footer>
  </article>
</template>

<script setup>
import {
  formatDate,
  hasCoordinates,
  locationText,
  relevanceText,
  riskColor,
  sourceTypeLabel,
  sourceTypeTone,
  statusLabel,
} from './osintDisplay'

const props = defineProps({
  event: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])

const isEffective = props.event?.riskAssessment?.isEffective !== false
const isImported = props.event?.sourceType === 'imported'
const color = riskColor(props.event)
const sourceLabel = sourceTypeLabel(props.event)
const sourceTone = sourceTypeTone(props.event)
</script>

<style scoped>
.osint-card {
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: border-color .16s ease, box-shadow .16s ease;
}
.osint-card:hover { border-color: #bfdbfe; box-shadow: 0 4px 14px rgba(37, 99, 235, .08); }
.osint-card.is-selected { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, .14); }
.osint-card.is-inactive { background: #fafafa; }

.osint-card__head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.osint-card__level {
  font-size: 11px;
  color: #fff;
  border-radius: 4px;
  padding: 1px 7px;
  font-weight: 600;
}
.osint-card__source-tag {
  font-size: 11px;
  border-radius: 999px;
  padding: 1px 9px;
  border: 1px solid #e2e8f0;
  color: #475569;
  background: #f8fafc;
}
.osint-card__source-tag.is-current { color: #1d4ed8; background: #eff6ff; border-color: #bfdbfe; }
.osint-card__source-tag.is-history { color: #92400e; background: #fffbeb; border-color: #fde68a; }
.osint-card__source-tag.is-imported { color: #6d28d9; background: #f5f3ff; border-color: #ddd6fe; }
.osint-card__state { font-size: 11px; color: #94a3b8; }
.osint-card__state.is-active { color: #059669; }
.osint-card__impact {
  font-size: 11px;
  border-radius: 999px;
  padding: 1px 8px;
  color: #7c3aed;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
}
.osint-card__impact.is-direct { color: #0369a1; background: #f0f9ff; border-color: #bae6fd; }
.osint-card__type { font-size: 11px; color: #64748b; margin-left: auto; }

.osint-card__title { margin: 8px 0 6px; font-size: 14px; color: #0f172a; line-height: 1.5; }
.osint-card__summary {
  margin: 0 0 10px;
  font-size: 12px;
  color: #475569;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.osint-card__summary.is-empty { color: #94a3b8; }

.osint-card__meta { margin: 0; font-size: 12px; }
.osint-card__meta > div { display: flex; gap: 8px; margin-bottom: 4px; }
.osint-card__meta dt { min-width: 58px; color: #94a3b8; flex-shrink: 0; }
.osint-card__meta dd { margin: 0; color: #334155; line-height: 1.6; }
.osint-card__meta dd.is-dim { color: #94a3b8; }
.osint-card__unlocated {
  display: inline-block;
  margin-left: 6px;
  font-style: normal;
  font-size: 11px;
  color: #b45309;
}

.osint-card__foot {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #eef2f7;
}
.osint-card__sources { font-size: 12px; color: #64748b; }
.osint-card__hint { font-size: 11px; color: #b45309; }
.osint-card__foot .el-button { margin-left: auto; }
</style>
