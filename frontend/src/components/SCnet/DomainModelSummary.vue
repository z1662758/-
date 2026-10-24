<template>
  <section v-if="analysis" class="model-summary">
    <div class="summary-title"><strong>领域模型 · {{ analysis.model_name }}</strong><span :title="`框架第${analysis.version}次保存`">本次任务使用的框架快照</span></div>
    <p><b>分析范围</b>{{ analysis.factors.map(x=>x.label).join('、') || '未选择' }}</p>
    <p><b>指标</b>{{ analysis.metrics.map(x=>x.label).join('、') || '暂无' }}</p>
    <p><b>关键因素</b>{{ analysis.factors.flatMap(x=>x.qualitative).join('；') || '暂无' }}</p>
    <p v-if="analysis.instance_results"><b>数据输入</b>{{ analysis.instance_results.rows.length }} 行 · {{ computedCount }} 项有效计算；其余缺失或待确认项保留待核验状态。</p>
    <p v-else><b>数据输入</b>尚未绑定数据，按指标契约获取所需输入。</p>
    <details v-if="analysis.retrieval"><summary>查看本体检索依据</summary><DomainRetrievalDetails :retrieval="analysis.retrieval" /></details>
  </section>
</template>
<script setup>
import { computed } from 'vue'
import DomainRetrievalDetails from '@/components/SCnet/DomainRetrievalDetails.vue'
const props=defineProps({analysis:{type:Object,default:null}})
const computedCount=computed(()=>props.analysis?.instance_results?.rows.reduce((count,row)=>count+Object.values(row.outputs).filter(x=>x.status==='computed').length,0)||0)
</script>
<style scoped>
.model-summary{padding:18px 22px;margin:16px 0;background:#f8fbff;border:1px solid #dbe6f7;border-radius:10px}.summary-title{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:14px;color:#1e40af}.summary-title span{font-size:11px;color:#64748b}.model-summary p{font-size:12px;line-height:1.9;color:#475569;margin:8px 0 0}.model-summary b{margin-right:10px;color:#64748b}
</style>
