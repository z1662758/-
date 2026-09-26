<template>
  <details class="expert-evidence">
    <summary><span>实验依据</span><small>{{ evidence.experiment_id }} · {{ evidence.results.length }} 项已读取</small></summary>
    <div class="evidence-body">
      <div class="evidence-heading"><strong>{{ evidence.name }}</strong><span>{{ timeLabel }}</span></div>
      <div class="evidence-grid">
        <article v-for="item in metrics" :key="item.label"><span>{{ item.label }}</span><b>{{ item.value }}</b></article>
      </div>
      <div v-for="result in evidence.results" :key="result.skill" class="evidence-source">
        <i>✓</i><span>{{ result.label }}</span><small>已关联当前实验</small>
      </div>
      <button type="button" @click="$emit('open', evidence.detail)">在专家模式中核对 →</button>
    </div>
  </details>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ evidence: { type: Object, required: true } })
defineEmits(['open'])
const timeLabel = computed(() => new Date(props.evidence.retrieved_at).toLocaleString('zh-CN', { hour12: false }))
const number = (value, unit) => Number.isFinite(value) ? `${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} ${unit}` : '暂无记录'
const metrics = computed(() => {
  const summary = props.evidence.results[1]?.data?.summary || {}
  return [
    { label: '平均采购成本', value: number(summary.avg_cost_usd_kgU, '美元/kgU') },
    { label: '期末库存覆盖', value: number(summary.final_inventory_coverage_years, '年') },
    { label: '最大需求缺口', value: number(summary.max_unmet_demand_tU, 'tU') },
  ]
})
</script>

<style scoped>
.expert-evidence { margin-top: 16px; border: 1px solid #dce5ee; border-radius: 12px; background: #f8fafc; color: #334155; font-size: 12px; overflow: hidden; }
summary { padding: 12px 14px; cursor: pointer; }
summary > span { font-weight: 600; margin-right: 10px; }
summary small { color: #64748b; overflow-wrap: anywhere; }
.evidence-body { padding: 0 14px 14px; }
.evidence-heading { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.evidence-heading span { color: #94a3b8; }
.evidence-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(125px, 1fr)); gap: 8px; margin-bottom: 12px; }
article { display: grid; gap: 7px; padding: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
article span { color: #64748b; }
article b { color: #0f172a; font-size: 13px; }
.evidence-source { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
.evidence-source i { color: #059669; font-style: normal; }
.evidence-source small { margin-left: auto; color: #94a3b8; }
button { margin-top: 12px; padding: 0; border: 0; background: transparent; color: #2563eb; cursor: pointer; font: inherit; }
</style>
