<template>
  <section class="knowledge-extract">
    <div class="knowledge-meta"><span>{{ document.expert_names?.join(' / ') }}</span><span>{{ document.year }} · {{ document.access_label }}</span><span>核验 {{ document.verified_at }}</span></div>
    <p class="reading-scope">本卡为依据{{ document.access_label }}整理的中文知识提炼。分析操作与研讨应用由系统归纳；原始出处可查看。</p>
    <p v-if="document.publication_note" class="reading-scope">{{ document.publication_note }}</p>
    <h3>知识摘要</h3><p>{{ document.summary }}</p>
    <h3>研究观点 · 来源转述</h3><ul><li v-for="finding in document.key_findings || []" :key="finding">{{ finding }}</li></ul>
    <details><summary>分析操作与研讨应用 · 系统提炼</summary><ol><li v-for="move in document.analysis_moves || []" :key="move">{{ move }}</li></ol><p>{{ document.application_to_seminar }}</p></details>
    <details><summary>研究假设、适用边界与核验记录</summary><ul><li v-for="limit in document.limitations || []" :key="limit">{{ limit }}</li></ul><p>{{ document.verification?.basis }}</p><p>作者：{{ document.authors?.join('、') }}</p><a v-if="document.verification?.url && document.verification.url !== document.url" :href="document.verification.url" target="_blank" rel="noopener noreferrer">核验阅读来源 ↗</a></details>
  </section>
</template>
<script setup>
defineProps({ document: { type: Object, required: true } })
</script>
<style scoped>
.knowledge-extract{line-height:1.85;color:#344e70}.knowledge-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:#657e9a}.knowledge-meta span{background:#f0f6fe;border-radius:5px;padding:3px 9px}.reading-scope{font-size:13px;color:#78899f}.knowledge-extract h3{font-size:15px;margin:20px 0 6px;color:#174d8b}.knowledge-extract details{margin:14px 0;border-top:1px solid #e6eef9;padding-top:12px}.knowledge-extract summary{cursor:pointer;color:#2262a3}.knowledge-extract ul,.knowledge-extract ol{padding-left:24px}.knowledge-extract p,.knowledge-extract li{overflow-wrap:anywhere}
</style>
