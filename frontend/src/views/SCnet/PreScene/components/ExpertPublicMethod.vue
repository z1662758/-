<template>
  <details v-if="expert.simulation" :key="expert.id" class="method-card">
    <summary class="method-title"><strong>{{ expert.school }}</strong><span>公开方法驱动的分析Agent</span><small>{{ expert.sources?.length || 0 }} 项来源 · {{ expert.knowledge_document_count || 0 }} 篇知识卡 · 展开画像与知识</small></summary>
    <p class="method-note">{{ expert.disclosure }}</p>
    <div class="method-grid">
      <div><h4>公开主张</h4><ul><li v-for="(claim, i) in expert.public_claims || []" :key="i">{{ claim.text }} <a v-for="id in claim.source_ids || []" :key="id" :href="source(id)?.url" target="_blank" rel="noopener noreferrer">[出处]</a></li></ul></div>
      <div><h4>分析步骤 · 系统提炼</h4><ol><li v-for="step in expert.analysis_steps || []" :key="step">{{ step }}</li></ol></div>
    </div>
    <p><strong>优先追问：</strong>{{ expert.distinctive_question }}</p>
    <p><strong>方法差异与边界：</strong>{{ expert.method_limits }}</p>
    <p v-if="expert.knowledge_document_count" class="method-note">已接入专属检索 {{ expert.knowledge_document_count }} 篇知识卡：公开全文 {{ expert.knowledge_access_counts?.full_text || 0 }}，摘要 {{ expert.knowledge_access_counts?.abstract || 0 }}，官方介绍 {{ expert.knowledge_access_counts?.official_summary || 0 }}。每场研讨冻结资料版本；步骤与场景应用由系统提炼。</p>
    <details class="source-list"><summary>原始来源与知识提炼（{{ expert.sources?.length || 0 }}）</summary>
      <details v-for="row in expert.sources || []" :key="row.id" class="source-item">
        <summary>{{ row.title }} <small>{{ row.year || '官方资料' }}{{ row.access_label ? ` · ${row.access_label}` : '' }}</small></summary>
        <p v-if="row.summary">{{ row.summary }}</p><p v-else>{{ row.supports }}</p>
        <p v-if="row.publication_note" class="method-note">{{ row.publication_note }}</p>
        <p v-if="row.summary"><strong>支持观点：</strong>{{ row.supports }}</p>
        <template v-if="row.analysis_moves?.length"><strong>分析操作 · 系统提炼</strong><ol><li v-for="move in row.analysis_moves" :key="move">{{ move }}</li></ol></template>
        <p v-for="limit in row.limitations || []" :key="limit" class="method-note">适用边界：{{ limit }}</p>
        <p class="method-note">核验 {{ row.verified_at }}{{ row.verification_basis ? ` · ${row.verification_basis}` : '' }}</p>
        <a :href="row.url" target="_blank" rel="noopener noreferrer">查看原始来源 ↗</a>
        <a v-if="row.reading_url && row.reading_url !== row.url" class="knowledge-link" :href="row.reading_url" target="_blank" rel="noopener noreferrer">核验阅读来源 ↗</a>
        <button v-if="row.knowledge_id" type="button" class="knowledge-link" @click="$emit('open-knowledge', row.knowledge_id)">查看知识库卡片</button>
      </details>
      <p>{{ expert.domain_boundary }}</p>
    </details>
  </details>
</template>

<script setup>
const props = defineProps({ expert: { type: Object, required: true } })
defineEmits(['open-knowledge'])
const source = id => (props.expert.sources || []).find(row => row.id === id)
</script>

<style scoped>
.method-card{margin:16px 0;padding:18px 20px;background:#fff;border:1px solid #d6e4fb;border-radius:12px;color:#344e70;font-size:13px;line-height:1.75}.method-title{cursor:pointer;color:#174d8b}.method-title strong{font-size:16px;margin-right:12px}.method-title span{color:#3471ba;background:#edf5ff;padding:2px 10px;border-radius:12px;font-size:11px}.method-title small{margin-left:12px}.method-note,small{color:#78899f}.method-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.method-grid h4{margin:10px 0 3px}.method-grid ul,.method-grid ol{padding-left:20px;margin:4px 0}.method-card a{color:#1566bf}.method-card summary{cursor:pointer}.source-list>summary{color:#2262a3}.source-item{margin:10px 0;padding:10px 12px;border:1px solid #e5edf8;border-radius:6px}.source-item p{margin:8px 0}.source-item ol{padding-left:22px}.method-card p,.source-item summary{overflow-wrap:anywhere}.knowledge-link{margin-left:16px;border:0;background:transparent;color:#1566bf;cursor:pointer;font:inherit}@media(max-width:720px){.method-grid{grid-template-columns:1fr;gap:0}.method-title small{display:block;margin-left:16px}}
</style>
