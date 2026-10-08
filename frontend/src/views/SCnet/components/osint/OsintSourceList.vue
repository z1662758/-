<template>
  <div class="osint-sources">
    <p v-if="!sources.length" class="osint-sources__empty">
      该事件暂无登记来源，无法提供原文链接。
    </p>

    <article v-for="(source, index) in sources" :key="index" class="osint-source">
      <header class="osint-source__head">
        <span class="osint-source__index">来源 {{ index + 1 }}</span>
        <span v-if="source.sourceName" class="osint-source__name">{{ source.sourceName }}</span>
        <span v-if="source.publishedAt" class="osint-source__time">{{ formatDate(source.publishedAt) }}</span>
      </header>

      <p v-if="source.sourceTitle" class="osint-source__title">{{ source.sourceTitle }}</p>
      <p v-if="source.author" class="osint-source__author">作者：{{ source.author }}</p>
      <blockquote v-if="source.evidenceExcerpt" class="osint-source__excerpt">
        {{ source.evidenceExcerpt }}
      </blockquote>

      <!-- 有链接才给按钮;没有链接必须明确说明,不能点了没反应 -->
      <a
        v-if="source.sourceUrl"
        class="osint-source__link"
        :href="source.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        :title="source.sourceUrl"
      >
        <el-icon><Link /></el-icon>查看原文
      </a>
      <span v-else class="osint-source__no-link">该条信息暂无可访问的原文链接</span>
    </article>
  </div>
</template>

<script setup>
import { Link } from '@element-plus/icons-vue'
import { formatDate } from './osintDisplay'

defineProps({
  sources: { type: Array, default: () => [] },
})
</script>

<style scoped>
.osint-sources__empty { margin: 0; font-size: 13px; color: #94a3b8; }
.osint-source {
  padding: 12px 14px;
  margin-bottom: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
}
.osint-source__head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.osint-source__index {
  font-size: 11px;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  padding: 1px 9px;
}
.osint-source__name { font-size: 13px; font-weight: 600; color: #0f172a; }
.osint-source__time { font-size: 12px; color: #94a3b8; margin-left: auto; }
.osint-source__title { margin: 8px 0 4px; font-size: 13px; color: #334155; line-height: 1.6; }
.osint-source__author { margin: 0 0 4px; font-size: 12px; color: #64748b; }
.osint-source__excerpt {
  margin: 6px 0 10px;
  padding: 8px 12px;
  border-left: 3px solid #cbd5e1;
  background: #f8fafc;
  font-size: 12px;
  color: #475569;
  line-height: 1.7;
}
.osint-source__link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
}
.osint-source__link:hover { text-decoration: underline; }
.osint-source__no-link { font-size: 12px; color: #b45309; }
</style>
