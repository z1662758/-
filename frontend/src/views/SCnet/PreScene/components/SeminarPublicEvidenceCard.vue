<template>

  <article class="public-source-card">

    <p class="source-type">已核验公开案例<span v-if="document.published_at"> · 发布 {{ document.published_at }}</span> · 核验 {{ document.verified_at }}</p>

    <p v-if="document.reuse_provenance?.source_thread" class="location">资料复用：重构铀供应链领域模型。{{ document.reuse_provenance.verification_basis }}</p><p class="abstract">{{ document.abstract }}</p>

    <p v-if="document.scope_note">{{ document.scope_note }}</p>

    <details><summary>原文支持的事实（{{ document.facts?.length || 0 }}）</summary><dl><div v-for="(fact, index) in document.facts || []" :key="index"><dt>{{ fact.label || fact.field }}</dt><dd>{{ fact.value }} {{ fact.unit }}<small>{{ fact.period }}</small></dd></div></dl></details>

    <details v-if="document.limits_note"><summary>数据口径与使用边界</summary><p>{{ document.limits_note }}</p></details>

    <p v-if="document.source_locator" class="location">原文定位：{{ document.source_locator }}</p>

    <p class="location">{{ document.attribution }}</p>

  </article>

</template>

<script setup>

defineProps({ document: { type: Object, required: true } })

</script>

<style scoped>

.public-source-card{padding:18px 20px;margin:18px 0;border:1px solid #d9e6fb;border-radius:10px;background:#f8fbff;line-height:1.8;color:#365579;overflow-wrap:anywhere}.source-type,.location,small{color:#7287a3;font-size:12px}.abstract{font-size:14px;color:#174b89}.public-source-card details{margin:12px 0;border-top:1px solid #e5edf8;padding-top:10px}.public-source-card summary{cursor:pointer;color:#2361a8}.public-source-card dl>div{display:grid;grid-template-columns:minmax(140px,1fr) 2fr;gap:15px;margin:10px 0}.public-source-card dt{font-weight:600}.public-source-card dd{margin:0}.public-source-card small{display:block}@media(max-width:700px){.public-source-card dl>div{display:block}}

</style>

