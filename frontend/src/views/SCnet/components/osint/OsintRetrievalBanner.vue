<template>
  <div v-if="retrieval" class="osint-retrieval">
    <div class="osint-retrieval__main">
      <span class="osint-retrieval__icon">◎</span>
      <div>
        <p class="osint-retrieval__lead">{{ lead }}</p>
        <p class="osint-retrieval__mode">{{ retrieval.modeLabel || '按本次研判问题筛选已登记的开源情报' }}</p>
      </div>
    </div>

    <div class="osint-retrieval__stats">
      <span><b>{{ retrieval.totalRetrieved ?? 0 }}</b> 条已登记</span>
      <span><b>{{ retrieval.relevantCount ?? 0 }}</b> 条命中问题</span>
      <span><b>{{ retrieval.effectiveCount ?? 0 }}</b> 条当前有效</span>
      <span v-if="retrieval.deduplicatedCount"><b>{{ retrieval.deduplicatedCount }}</b> 条已合并</span>
    </div>

    <dl v-if="queryTerms.length" class="osint-retrieval__query">
      <dt>检索条件</dt>
      <dd>
        <span v-for="term in queryTerms" :key="term" class="osint-term">{{ term }}</span>
      </dd>
    </dl>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  retrieval: { type: Object, default: null },
})

const lead = computed(() => {
  const r = props.retrieval
  if (!r) return ''
  const relevant = r.relevantCount ?? 0
  const effective = r.effectiveCount ?? 0
  return `根据当前问题筛选出 ${relevant} 条相关事件，其中 ${effective} 条仍对当前风险有效。`
})

const queryTerms = computed(() => (props.retrieval?.query || []).slice(0, 12))
</script>

<style scoped>
.osint-retrieval {
  padding: 12px 16px;
  margin-bottom: 12px;
  background: #f8fbff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
}
.osint-retrieval__main { display: flex; gap: 10px; align-items: flex-start; }
.osint-retrieval__icon { color: #2563eb; font-size: 15px; line-height: 1.5; }
.osint-retrieval__lead { margin: 0 0 3px; font-size: 13px; color: #1d4ed8; font-weight: 600; }
.osint-retrieval__mode { margin: 0; font-size: 12px; color: #64748b; }
.osint-retrieval__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin-top: 10px;
  font-size: 12px;
  color: #475569;
}
.osint-retrieval__stats b { color: #1d4ed8; font-variant-numeric: tabular-nums; }
.osint-retrieval__query { margin: 10px 0 0; font-size: 12px; }
.osint-retrieval__query dt { color: #94a3b8; margin-bottom: 5px; }
.osint-retrieval__query dd { margin: 0; display: flex; flex-wrap: wrap; gap: 5px; }
.osint-term {
  background: #fff;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  padding: 1px 9px;
  color: #1d4ed8;
}
</style>
