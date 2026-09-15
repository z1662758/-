<template>
  <div class="kev-panel">
    <div class="kev-title">来源与证据
      <span class="kev-count">{{ evidence.length }} 条证据 · {{ sources.length }} 个来源</span>
    </div>

    <div v-if="!evidence.length" class="kev-empty">暂无已核验的来源／证据</div>

    <div v-for="e in evidence" :key="e.evidence_id" class="kev-item">
      <div class="kev-row1">
        <span class="kev-src">{{ (e.source && e.source.name) || e.source_id }}</span>
        <el-tag size="small" effect="plain">{{ srcTypeLabel(e.source && e.source.source_type) }}</el-tag>
        <el-tag size="small" :type="relTag(e.source && e.source.reliability)" effect="plain">
          {{ relLabel(e.source && e.source.reliability) }}
        </el-tag>
        <el-tag size="small" :type="e.verification_status === 'VERIFIED' ? 'success' : 'info'" effect="plain">
          {{ e.verification_status === 'VERIFIED' ? '已验证' : '候选' }}
        </el-tag>
      </div>
      <div class="kev-row2">
        <span class="kev-etype">{{ evTypeLabel(e.evidence_type) }}</span>
        <span v-if="e.page">P{{ e.page }}</span>
        <span v-if="e.section">§{{ e.section }}</span>
        <span v-if="e.publication_date">{{ e.publication_date }}</span>
      </div>
      <div class="kev-actions">
        <a v-if="e.original_url" class="kev-btn" :href="e.original_url" target="_blank" rel="noopener noreferrer">查看来源</a>
        <a v-if="e.pdf_url" class="kev-btn" :href="e.pdf_url" target="_blank" rel="noopener noreferrer">查看PDF</a>
        <a v-if="e.file_url || e.local_file" class="kev-btn" :href="e.file_url || e.local_file" target="_blank" rel="noopener noreferrer">下载本地数据文件</a>
        <span v-if="!e.original_url && !e.pdf_url && !e.file_url && !e.local_file" class="kev-none">暂无已核验在线链接</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'KnowledgeEvidencePanel',
  props: {
    evidence: { type: Array, default: () => [] },
    sources: { type: Array, default: () => [] },
  },
  methods: {
    srcTypeLabel(t) {
      return ({
        GOVERNMENT: '政府', REGULATOR: '监管', INTERNATIONAL_ORGANIZATION: '国际组织',
        INDUSTRY_ASSOCIATION: '行业协会', COMPANY_PRIMARY: '企业官方', ACADEMIC_PUBLISHER: '学术出版',
        ACADEMIC_INDEX: '学术索引', NEWS_AGENCY: '新闻机构', DATABASE: '数据库', OTHER: '其他',
      })[t] || (t || '其他')
    },
    relLabel(r) {
      return ({
        primary_authoritative: '权威一手', authoritative_industry: '行业权威', company_primary: '企业一手',
        reputable_secondary: '可信二手', academic_publisher: '学术出版', metadata_index_only: '仅元数据索引',
        reference_database: '参考数据库', unclassified: '未分级',
      })[r] || (r || '未分级')
    },
    relTag(r) {
      if (r === 'primary_authoritative' || r === 'authoritative_industry' || r === 'company_primary') return 'success'
      if (r === 'metadata_index_only') return 'info'
      return 'warning'
    },
    evTypeLabel(t) {
      return ({
        DOCUMENT_LEVEL: '文档级', PAGE_LEVEL: '页级', SECTION_LEVEL: '章节级', TABLE_LEVEL: '表级',
        FIGURE_LEVEL: '图级', WEB_PAGE: '网页', REGULATORY_NOTICE: '法规/公告', PRESS_RELEASE: '新闻稿',
        NEWS_REPORT: '新闻报道', DATASET_RECORD: '数据集记录', DOI_METADATA: 'DOI 元数据',
        PAPER_ABSTRACT: '论文摘要', PAPER_FULLTEXT: '论文全文',
      })[t] || (t || '证据')
    },
  },
}
</script>

<style scoped>
.kev-panel { border-top: 1px dashed #e2e8f0; margin-top: 10px; padding-top: 8px; }
.kev-title { font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 6px; }
.kev-count { font-size: 0.7rem; color: #94a3b8; font-weight: 500; margin-left: 6px; }
.kev-empty { font-size: 0.76rem; color: #94a3b8; }
.kev-item { border: 1px solid #eef2f7; border-radius: 8px; padding: 7px 9px; margin-bottom: 6px; background: #fbfcfe; }
.kev-row1 { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.kev-src { font-size: 0.79rem; font-weight: 700; color: #0f172a; }
.kev-row2 { display: flex; gap: 10px; font-size: 0.72rem; color: #64748b; margin: 3px 0; flex-wrap: wrap; }
.kev-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.kev-btn {
  font-size: 0.74rem; color: #2563eb; text-decoration: none; border: 1px solid #bfdbfe;
  border-radius: 6px; padding: 2px 9px; background: #eff6ff;
}
.kev-btn:hover { background: #dbeafe; }
.kev-none { font-size: 0.72rem; color: #94a3b8; }
</style>
