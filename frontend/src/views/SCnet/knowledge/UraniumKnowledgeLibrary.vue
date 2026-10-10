<template>
  <div class="ukl-root">
    <!-- 加载状态 -->
    <div v-if="loading" v-loading="true" class="ukl-loading" />

    <!-- 错误状态 -->
    <div v-else-if="error" class="ukl-state ukl-state--error">
      <el-empty :description="error" :image-size="80" />
      <el-button size="small" type="primary" plain @click="loadAll">重试</el-button>
    </div>

    <!-- 成功/空状态 -->
    <div v-else class="ukl-body">
      <!-- 统计行 -->
      <div class="ukl-stats">
        <div class="ukl-stat"><span class="ukl-stat__v">{{ summary.documents.total }}</span><span class="ukl-stat__l">文档</span></div>
        <div class="ukl-stat"><span class="ukl-stat__v">{{ summary.documents.verified }}</span><span class="ukl-stat__l">已验证</span></div>
        <div class="ukl-stat"><span class="ukl-stat__v">{{ summary.evidence.total }}</span><span class="ukl-stat__l">证据</span></div>
        <div class="ukl-stat"><span class="ukl-stat__v">{{ summary.papers.total }}</span><span class="ukl-stat__l">论文</span></div>
        <div class="ukl-stat"><span class="ukl-stat__v">{{ summary.sources.total }}</span><span class="ukl-stat__l">来源</span></div>
      </div>

      <!-- 主布局:文档列表 + 详情 -->
      <div class="ukl-layout">
        <!-- 左:文档列表 -->
        <div class="ukl-list">
          <div class="ukl-section-title">专家文档库 · Uranium Expert Documents</div>
          <div v-if="documents.length === 0" class="ukl-state">
            <el-empty description="当前暂无已收录文档" :image-size="80" />
          </div>
          <div v-else class="ukl-doc-list">
            <div v-for="doc in documents" :key="doc.document_id"
                 class="ukl-doc-card" :class="{ 'ukl-doc-card--active': doc.document_id === selected?.document_id }"
                 @click="selectDocument(doc.document_id)">
              <div class="ukl-doc-card__top">
                <span class="ukl-doc-card__title">{{ doc.title }}</span>
                <el-tag v-if="doc.verification_status === 'VERIFIED'" size="small" type="success" effect="light">VERIFIED</el-tag>
              </div>
              <div class="ukl-doc-card__meta">
                <span>{{ doc.publisher }}</span>
                <span class="ukl-doc-card__year">{{ doc.publication_year }}</span>
              </div>
              <div class="ukl-doc-card__foot">
                <el-tag size="small" type="info" effect="plain">{{ doc.document_type }}</el-tag>
                <el-tag size="small" effect="plain">{{ doc.evidence_count }} 证据</el-tag>
                <el-tag v-if="doc.has_local_file" size="small" type="success" effect="plain">本地PDF</el-tag>
              </div>
            </div>
          </div>

          <!-- 研究论文库(空状态) -->
          <div class="ukl-section-title ukl-section-title--mt">研究论文库</div>
          <div class="ukl-papers-empty">
            <el-empty description="当前尚未收录已验证研究论文" :image-size="70" />
            <div class="ukl-papers-note">论文库为只读空状态;真实论文经 paper_registry 入库后自动出现。</div>
          </div>

          <!-- 开源情报库(诚实标记) -->
          <div class="ukl-section-title ukl-section-title--mt">开源情报库</div>
          <div class="ukl-osint-note">
            <el-tag size="small" type="warning">MOCK / DEMO</el-tag>
            <span class="ukl-osint-text">{{ summary.osint.total }} 条模拟情报 · {{ summary.osint.verified }} 条真实情报</span>
          </div>
        </div>

        <!-- 右:文档详情 -->
        <div class="ukl-detail">
          <div v-if="!selected" class="ukl-state">
            <el-empty description="点击左侧文档查看详情" :image-size="80" />
          </div>
          <div v-else class="ukl-detail-body">
            <div class="ukl-detail-header">
              <h3 class="ukl-detail-title">{{ selected.title }}</h3>
              <div class="ukl-detail-actions">
                <el-button v-if="selected.file.available" size="small" type="primary"
                           @click="openPdf(selected.document_id)">
                  <el-icon><View /></el-icon>&nbsp;查看原文
                </el-button>
                <el-button v-if="selected.file.available" size="small" plain
                           @click="downloadPdf(selected.document_id)">
                  <el-icon><Download /></el-icon>&nbsp;下载
                </el-button>
                <el-button v-if="!selected.file.available && selected.official_url" size="small" type="success" plain
                           @click="openOfficialUrl(selected.official_url)">
                  <el-icon><Link /></el-icon>&nbsp;访问官方来源
                </el-button>
              </div>
            </div>

            <!-- 基本信息 -->
            <div class="ukl-block">
              <div class="ukl-block-title">基本信息</div>
              <el-descriptions :column="2" size="small" border>
                <el-descriptions-item label="文档ID">{{ selected.document_id }}</el-descriptions-item>
                <el-descriptions-item label="文档类型">{{ selected.document_type }}</el-descriptions-item>
                <el-descriptions-item label="年份">{{ selected.publication_year }}</el-descriptions-item>
                <el-descriptions-item label="版本">{{ selected.edition }}</el-descriptions-item>
                <el-descriptions-item label="语言">{{ selected.language }}</el-descriptions-item>
                <el-descriptions-item label="验证状态">
                  <el-tag size="small" type="success">{{ selected.verification_status }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="数据状态">
                  <el-tag size="small" :type="dataStatusType(selected.data_status)">{{ selected.data_status }}</el-tag>
                </el-descriptions-item>
              </el-descriptions>
              <div v-if="selected.data_status_reason" class="ukl-status-reason">{{ selected.data_status_reason }}</div>
            </div>

            <!-- 来源与证据 -->
            <div class="ukl-block">
              <div class="ukl-block-title">来源与证据</div>
              <div v-if="selected.source" class="ukl-source">
                <div class="ukl-source__name">{{ selected.source.name }}</div>
                <div class="ukl-source__meta">
                  <el-tag size="small" effect="plain">{{ selected.source.source_type }}</el-tag>
                  <el-tag v-if="selected.source.reliability_class" size="small" type="warning" effect="plain">{{ selected.source.reliability_class }}</el-tag>
                  <el-tag v-if="selected.source.self_reported" size="small" type="warning" effect="dark">SELF-REPORTED</el-tag>
                  <el-tag v-else-if="selected.self_reported !== undefined && selected.self_reported" size="small" type="warning" effect="dark">SELF-REPORTED</el-tag>
                  <span class="ukl-source__pub">{{ selected.source.publisher }}</span>
                </div>
                <div class="ukl-source__url">
                  <template v-if="selected.source.homepage_url">
                    <el-link type="primary" :href="selected.source.homepage_url" target="_blank">原始网址</el-link>
                  </template>
                  <template v-else>
                    <span class="ukl-muted">暂无已核验在线链接</span>
                  </template>
                </div>
              </div>
              <div v-else class="ukl-muted">来源未登记</div>

              <div class="ukl-evidence">
                <div v-for="ev in selected.evidence" :key="ev.evidence_id" class="ukl-evidence-item">
                  <el-icon class="ukl-evidence-icon"><Collection /></el-icon>
                  <div class="ukl-evidence-body">
                    <div class="ukl-evidence-title">{{ ev.title }}</div>
                    <div class="ukl-evidence-loc">
                      <el-tag v-if="ev.evidence_type" size="small" effect="plain">{{ ev.evidence_type }}</el-tag>
                      <span v-if="ev.page" class="ukl-evidence-page">Page {{ ev.page }}</span>
                      <span v-if="ev.table" class="ukl-evidence-page">Table {{ ev.table }}</span>
                      <span v-if="ev.section" class="ukl-evidence-page">{{ ev.section }}</span>
                    </div>
                    <div v-if="evidenceLinks[ev.evidence_id] && evidenceLinks[ev.evidence_id].length" class="ukl-ev-links">
                      <div v-for="l in evidenceLinks[ev.evidence_id]" :key="l.link_id" class="ukl-ev-link">
                        <div class="ukl-ev-link__sup">
                          <el-tag size="small" :type="linkTagType(l.support_type)" effect="plain">{{ linkLabel(l.support_type) }}</el-tag>
                          <span v-if="l.dataset_id" class="ukl-ev-link__ds">{{ datasetLabel(l.dataset_id) }}</span>
                          <span v-else-if="l.object_id" class="ukl-ev-link__ds">{{ l.object_id }}</span>
                          <span v-if="l.indicator" class="ukl-ev-link__ind">{{ l.indicator }}</span>
                        </div>
                        <div v-if="l.support_type === 'DATASET_SLICE' && l.summary" class="ukl-ev-link__stats">
                          <span>关联记录: <b>{{ l.record_count }}</b> 条</span>
                          <span v-if="l.summary?.year_min !== undefined" class="ukl-ev-meta">年份 {{ l.summary?.year_min }}–{{ l.summary?.year_max }}</span>
                          <span v-if="l.summary?.scenario_values" class="ukl-ev-meta">场景 {{ l.summary.scenario_values.join('/') }}</span>
                          <span v-if="l.summary?.projection_vintages" class="ukl-ev-meta">Vintage {{ l.summary.projection_vintages.join('/') }}</span>
                          <span v-if="l.summary?.resource_basis_values" class="ukl-ev-meta">Basis {{ l.summary.resource_basis_values.join('/') }}</span>
                        </div>
                        <div v-else-if="l.object_id" class="ukl-ev-link__stats">
                          <span>关联对象: <b>{{ l.object_id }}</b></span>
                          <span class="ukl-ev-meta">{{ linkObjectType(l.object_id) }}</span>
                        </div>
                        <el-button v-if="l.dataset_id" size="small" type="primary" plain @click.stop="openEvidenceRecords(ev, l.dataset_id)">
                          查看关联数据
                        </el-button>
                        <el-button v-else-if="l.object_id && l.support_type === 'ENTITY'" size="small" type="primary" plain @click.stop="openEntityObject(l.object_id)">
                          查看实体
                        </el-button>
                      </div>
                    </div>
                    <div v-else class="ukl-ev-empty">暂未建立知识记录关联</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Provenance -->
            <div class="ukl-block">
              <div class="ukl-block-title">Provenance</div>
              <div class="ukl-provenance">
                <div v-if="selected.provenance?.sha256" class="ukl-prov-item">SHA256: <code>{{ selected.provenance?.sha256 }}</code></div>
                <div v-if="selected.provenance?.page_count" class="ukl-prov-item">页数: {{ selected.provenance?.page_count }}</div>
                <div class="ukl-prov-item">{{ selected.provenance?.note }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EvidenceRecordsDialog :visible="showEvidenceRecords" :evidence="selectedEvidence" @update:visible="v => showEvidenceRecords = v" />
      <el-dialog :model-value="showEntityDialog" width="60%" top="8vh" @update:model-value="v => showEntityDialog = v" @close="showEntityDialog = false">
        <template #header><span class="ukl-ent-title">关联实体</span></template>
        <div v-if="selectedEntity" class="ukl-ent-body">
          <div v-if="selectedEntity.error" class="ukl-muted">{{ selectedEntity.error }}</div>
          <el-descriptions v-else :column="2" size="small" border>
            <el-descriptions-item label="ID">{{ selectedEntity.entity_id || selectedEntity.mine_id || selectedEntity.company_id || selectedEntity.deposit_id || selectedEntity.facility_id }}</el-descriptions-item>
            <el-descriptions-item label="名称">{{ selectedEntity.canonical_name }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedEntity.entity_type }}</el-descriptions-item>
            <el-descriptions-item label="国家">{{ selectedEntity.country_id }}</el-descriptions-item>
            <el-descriptions-item v-if="selectedEntity.mine_status" label="矿山状态">{{ selectedEntity.mine_status }}</el-descriptions-item>
            <el-descriptions-item v-if="selectedEntity.facility_type" label="设施类型">{{ selectedEntity.facility_type }}</el-descriptions-item>
            <el-descriptions-item v-if="selectedEntity.deposit_type" label="矿床类型">{{ selectedEntity.deposit_type }}</el-descriptions-item>
            <el-descriptions-item label="验证状态">{{ selectedEntity.verification_status }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="selectedEntity.notes" class="ukl-ent-notes">{{ selectedEntity.notes }}</div>
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<script>
import { View, Download, Collection, Link } from '@element-plus/icons-vue'
import { getUraniumKnowledgeSummary, getUraniumDocuments, getUraniumDocumentDetail, getUraniumEvidenceDetail, getUraniumEntityDetail, uraniumDocumentFileUrl } from '@/api/powerGame/uraniumKnowledge'
import EvidenceRecordsDialog from './EvidenceRecordsDialog.vue'

export default {
  name: 'UraniumKnowledgeLibrary',
  components: { View, Download, Collection, Link, EvidenceRecordsDialog },
  data() {
    return {
      loading: true,
      error: '',
      summary: { documents: { total: 0, verified: 0 }, evidence: { total: 0 }, papers: { total: 0 }, sources: { total: 0 }, osint: { total: 0, verified: 0 } },
      documents: [],
      selected: null,
      evidenceLinks: {},
      showEvidenceRecords: false,
      selectedEvidence: null,
      showEntityDialog: false,
      selectedEntity: null,
    }
  },
  created() {
    this.loadAll()
  },
  methods: {
    async loadAll() {
      this.loading = true
      this.error = ''
      try {
        const [summaryRes, docsRes] = await Promise.all([
          getUraniumKnowledgeSummary(),
          getUraniumDocuments(),
        ])
        this.summary = summaryRes.data || this.summary
        this.documents = (docsRes.data && docsRes.data.items) || []
        if (this.documents.length) {
          this.selectDocument(this.documents[0].document_id)
        }
      } catch (e) {
        this.error = e.message || '加载专家文档库失败'
      } finally {
        this.loading = false
      }
    },
    async selectDocument(documentId) {
      try {
        const res = await getUraniumDocumentDetail(documentId)
        this.selected = res.data
        // 列表 evidence_count 由 detail 补全
        const doc = this.documents.find(d => d.document_id === documentId)
        if (doc && this.selected) doc.evidence_count = this.selected.evidence.length
        this.fetchEvidenceLinks(documentId)
      } catch (e) {
        this.selected = { document_id: documentId, title: documentId, error: e.message || '加载详情失败', evidence: [], file: {}, provenance: {} }
      }
    },
    async fetchEvidenceLinks(documentId) {
      const evs = (this.selected && this.selected.evidence) || []
      const links = {}
      await Promise.all(evs.map(async ev => {
        try {
          const res = await getUraniumEvidenceDetail(ev.evidence_id)
          links[ev.evidence_id] = (res.data && res.data.knowledge_links) || []
        } catch (e) {
          links[ev.evidence_id] = []
        }
      }))
      this.evidenceLinks = links
    },
    datasetLabel(datasetId) {
      const map = {
        'redbook.production_history.v1': 'Production History',
        'redbook.cumulative_production_history.v1': 'Cumulative Production',
        'redbook.resources_history.v1': 'Resources',
        'redbook.production_capability_history.v1': 'Production Capability History',
        'redbook.production_capability_projection.v1': 'Production Capability Projection',
        'redbook.requirements_history.v1': 'Requirements History',
        'redbook.requirements_projection.v1': 'Requirements Projection',
      }
      return map[datasetId] || datasetId
    },
    openEvidenceRecords(ev, datasetId) {
      this.selectedEvidence = { ...ev }
      this.showEvidenceRecords = true
    },
    dataStatusType(status) {
      const map = { EXTRACTED_AND_LINKED: 'success', EXTRACTION_PENDING: 'warning', NO_EXTRACTABLE_KNOWLEDGE: 'info', BLOCKED: 'danger' }
      return map[status] || 'info'
    },
    linkTagType(st) {
      const map = { DATASET_SLICE: 'success', ENTITY: 'warning', OPERATIONAL_FACT: 'info', DOCUMENT: 'info' }
      return map[st] || 'info'
    },
    linkLabel(st) {
      const map = { DATASET_SLICE: '支持数据切片', ENTITY: '支持实体', OPERATIONAL_FACT: '支持事实', DOCUMENT: '文档' }
      return map[st] || st
    },
    linkObjectType(id) {
      if (!id) return ''
      if (id.startsWith('company_')) return '公司'
      if (id.startsWith('mine_')) return '矿山'
      if (id.startsWith('deposit_')) return '矿床'
      if (id.startsWith('facility_')) return '设施'
      if (id.startsWith('fact_')) return '运营事实'
      return '关联对象'
    },
    entityTypeFromId(id) {
      if (id.startsWith('company_')) return 'company'
      if (id.startsWith('mine_')) return 'mine'
      if (id.startsWith('deposit_')) return 'deposit'
      if (id.startsWith('facility_')) return 'facility'
      return 'company'
    },
    async openEntityObject(objectId) {
      try {
        const res = await getUraniumEntityDetail(objectId, this.entityTypeFromId(objectId))
        this.selectedEntity = res.data
        this.showEntityDialog = true
      } catch (e) {
        this.selectedEntity = { entity_id: objectId, error: e.message || '加载实体失败' }
        this.showEntityDialog = true
      }
    },
    openPdf(documentId) {
      window.open(uraniumDocumentFileUrl(documentId), '_blank')
    },
    downloadPdf(documentId) {
      window.open(uraniumDocumentFileUrl(documentId, true), '_blank')
    },
    openOfficialUrl(url) {
      if (url) window.open(url, '_blank')
    },
  },
}
</script>

<style scoped>
.ukl-root { height: 100%; display: flex; flex-direction: column; }
.ukl-loading { height: 100%; }
.ukl-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; gap: 12px; }
.ukl-body { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.ukl-stats { display: flex; gap: 12px; padding: 8px 4px 12px; border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5); }
.ukl-stat { flex: 1; text-align: center; }
.ukl-stat__v { display: block; font-size: 26px; font-weight: 700; color: var(--el-color-primary, #409eff); }
.ukl-stat__l { font-size: 12px; color: #909399; }
.ukl-layout { flex: 1; min-height: 0; display: flex; gap: 16px; overflow: hidden; }
.ukl-list { width: 380px; min-width: 340px; overflow-y: auto; padding-right: 4px; }
.ukl-detail { flex: 1; min-width: 0; overflow-y: auto; padding: 0 4px; }
.ukl-section-title { font-size: 13px; font-weight: 600; color: #606266; padding: 10px 0 8px; }
.ukl-section-title--mt { margin-top: 18px; border-top: 1px dashed var(--el-border-color-lighter, #ebeef5); padding-top: 14px; }
.ukl-doc-card { border: 1px solid var(--el-border-color-lighter, #ebeef5); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer; transition: all .15s; }
.ukl-doc-card:hover { border-color: var(--el-color-primary-light-5, #a0cfff); }
.ukl-doc-card--active { border-color: var(--el-color-primary, #409eff); background: var(--el-color-primary-light-9, #ecf5ff); }
.ukl-doc-card__top { display: flex; align-items: center; gap: 6px; }
.ukl-doc-card__title { font-size: 13px; font-weight: 600; color: #303133; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ukl-doc-card__meta { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #909399; margin-top: 4px; }
.ukl-doc-card__year { font-weight: 700; color: var(--el-color-primary, #409eff); }
.ukl-doc-card__foot { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.ukl-papers-empty { border: 1px dashed var(--el-border-color-lighter, #ebeef5); border-radius: 8px; padding: 8px; }
.ukl-papers-note { font-size: 12px; color: #909399; text-align: center; padding-bottom: 8px; }
.ukl-osint-note { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #606266; }
.ukl-osint-text { color: #909399; }
.ukl-detail-body { display: flex; flex-direction: column; gap: 14px; }
.ukl-detail-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.ukl-detail-title { font-size: 16px; font-weight: 700; color: #303133; margin: 0; flex: 1; }
.ukl-detail-actions { display: flex; gap: 6px; white-space: nowrap; }
.ukl-block { border: 1px solid var(--el-border-color-lighter, #ebeef5); border-radius: 8px; padding: 10px 12px; }
.ukl-block-title { font-size: 13px; font-weight: 600; color: #606266; margin-bottom: 8px; }
.ukl-source__name { font-size: 14px; font-weight: 600; color: #303133; }
.ukl-source__meta { display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.ukl-source__pub { font-size: 12px; color: #909399; }
.ukl-source__url { margin-top: 6px; font-size: 12px; }
.ukl-muted { font-size: 12px; color: #c0c4cc; }
.ukl-evidence { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.ukl-evidence-item { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; background: var(--el-fill-color-light, #f5f7fa); border-radius: 6px; }
.ukl-evidence-icon { color: var(--el-color-primary, #409eff); margin-top: 2px; }
.ukl-evidence-body { flex: 1; }
.ukl-evidence-title { font-size: 12px; font-weight: 600; color: #303133; }
.ukl-evidence-loc { display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.ukl-evidence-page { font-size: 12px; color: #606266; }
.ukl-evidence-note { font-size: 11px; color: #909399; margin-top: 3px; }
.ukl-ev-links { margin-top: 6px; display: flex; flex-direction: column; gap: 6px; }
.ukl-ev-link { border: 1px solid var(--el-border-color-lighter, #ebeef5); border-radius: 6px; padding: 6px 8px; background: #fff; }
.ukl-ev-link__sup { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ukl-ev-link__ds { font-size: 12px; font-weight: 600; color: #303133; }
.ukl-ev-link__ind { font-size: 12px; color: #606266; }
.ukl-ev-link__stats { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #606266; margin-top: 4px; align-items: center; }
.ukl-ev-meta { color: #409eff; }
.ukl-ev-empty { font-size: 12px; color: #c0c4cc; margin-top: 4px; }
.ukl-provenance { font-size: 12px; color: #606266; display: flex; flex-direction: column; gap: 4px; }
.ukl-prov-item code { background: var(--el-fill-color-light, #f5f7fa); padding: 1px 4px; border-radius: 3px; font-size: 11px; }
.ukl-status-reason { font-size: 12px; color: #909399; margin-top: 6px; }
.ukl-ent-title { font-size: 15px; font-weight: 700; color: #303133; }
.ukl-ent-body { display: flex; flex-direction: column; gap: 8px; }
.ukl-ent-notes { font-size: 12px; color: #606266; background: var(--el-fill-color-light, #f5f7fa); padding: 6px 8px; border-radius: 6px; }
</style>
