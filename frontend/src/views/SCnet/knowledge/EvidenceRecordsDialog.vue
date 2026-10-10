<template>
  <el-dialog
    :model-value="visible"
    width="82%"
    top="4vh"
    class="erd-dialog"
    @update:model-value="v => $emit('update:visible', v)"
    @close="$emit('update:visible', false)"
  >
    <template #header>
      <div class="erd-header">
        <span class="erd-title">关联数据 · {{ evidenceTitle }}</span>
        <span v-if="evidence" class="erd-subtitle">{{ evidence.evidence_type }} · {{ evidence.page ? 'Page ' + evidence.page : '' }}</span>
      </div>
    </template>

    <div class="erd-body">
      <!-- 数据集/指示器选择 -->
      <div v-if="links.length > 1" class="erd-links">
        <el-radio-group v-model="activeDatasetId" size="small">
          <el-radio-button v-for="l in links" :key="l.dataset_id" :value="l.dataset_id">
            {{ datasetLabel(l.dataset_id) }} ({{ l.record_count }})
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="erd-stats">
        <span>总记录: <b>{{ total }}</b></span>
        <span v-if="summary.year_min !== undefined" class="erd-stat-item">年份: {{ summary.year_min }}–{{ summary.year_max }}</span>
        <span v-if="summary.country_count" class="erd-stat-item">国家: {{ summary.country_count }}</span>
        <span v-if="summary.region_count" class="erd-stat-item">地区: {{ summary.region_count }}</span>
        <span v-if="summary.global_count" class="erd-stat-item">全球: {{ summary.global_count }}</span>
        <span v-if="summary.scenario_values" class="erd-stat-item">场景: {{ summary.scenario_values.join(' / ') }}</span>
        <span v-if="summary.projection_vintages" class="erd-stat-item">Vintage: {{ summary.projection_vintages.join(' / ') }}</span>
        <span v-if="summary.resource_basis_values" class="erd-stat-item">Basis: {{ summary.resource_basis_values.join(' / ') }}</span>
      </div>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="items" stripe size="small" max-height="46vh">
        <el-table-column prop="subject" label="国家/地区" width="130" />
        <el-table-column prop="data_year" label="年份" width="80" />
        <el-table-column label="场景/Vintage" width="120">
          <template #default="{ row }">
            <span>{{ row.scenario || '—' }}</span>
            <span v-if="row.projection_vintage" class="erd-vintage">V{{ row.projection_vintage }}</span>
          </template>
        </el-table-column>
        <el-table-column label="资源维度" min-width="180">
          <template #default="{ row }">
            <span v-if="row.resource_basis" class="erd-dim">{{ row.resource_basis }}</span>
            <span v-if="row.resource_category" class="erd-dim">{{ row.resource_category }}</span>
            <span v-if="row.cost_category" class="erd-dim">{{ row.cost_category }}</span>
            <span v-else class="erd-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="值" width="110" align="right">
          <template #default="{ row }">{{ row.value !== null ? row.value.toLocaleString() : '—' }}</template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column prop="value_type" label="值类型" width="90" />
        <el-table-column label="版本" width="80">
          <template #default="{ row }">{{ row.source_edition }}</template>
        </el-table-column>
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="erd-expand">
              <div><b>record_id</b>: <code>{{ row.record_id }}</code></div>
              <div><b>geography</b>: {{ row.geography_level }} · <b>canonical_id</b>: {{ row.canonical_id }}</div>
              <div v-if="row.revision_history && row.revision_history.length"><b>revision_history</b>:
                <span v-for="h in row.revision_history" :key="h.record_id" class="erd-rev">[{{ h.edition }}: {{ h.value }}]</span>
              </div>
              <div><b>source_page</b>: {{ row.source_page }} · <b>record_class</b>: {{ row.record_class }}</div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        class="erd-pagination"
        background
        layout="prev, pager, next, total"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @current-change="loadPage"
      />
    </div>
  </el-dialog>
</template>

<script>
import { getUraniumEvidenceDetail, getUraniumEvidenceRecords } from '@/api/powerGame/uraniumKnowledge'

export default {
  name: 'EvidenceRecordsDialog',
  props: {
    visible: { type: Boolean, default: false },
    evidence: { type: Object, default: null },
  },
  emits: ['update:visible'],
  data() {
    return {
      links: [],
      activeDatasetId: '',
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      loading: false,
      summary: {},
    }
  },
  computed: {
    evidenceTitle() {
      return this.evidence ? this.evidence.title : ''
    },
    activeLink() {
      return this.links.find(l => l.dataset_id === this.activeDatasetId) || this.links[0] || null
    },
  },
  watch: {
    visible(v) {
      if (v && this.evidence) this.load()
    },
    activeDatasetId() {
      this.loadPage(1)
    },
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const res = await getUraniumEvidenceDetail(this.evidence.evidence_id)
        this.links = (res.data && res.data.knowledge_links) || []
        this.activeDatasetId = this.activeDatasetId || (this.links[0] ? this.links[0].dataset_id : '')
        if (this.activeLink) this.summary = this.activeLink.summary || {}
        await this.loadPage(1)
      } catch (e) {
        this.items = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    async loadPage(p = 1) {
      if (!this.activeDatasetId) return
      this.page = p
      this.loading = true
      try {
        const res = await getUraniumEvidenceRecords(this.evidence.evidence_id, this.activeDatasetId, p, this.pageSize)
        const d = res.data || {}
        this.items = d.items || []
        this.total = d.total || 0
        if (this.activeLink) this.summary = this.activeLink.summary || {}
      } catch (e) {
        this.items = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    datasetLabel(datasetId) {
      const map = {
        'redbook.production_history.v1': '生产历史',
        'redbook.cumulative_production_history.v1': '累计产量',
        'redbook.resources_history.v1': '资源',
        'redbook.production_capability_history.v1': '能力历史',
        'redbook.production_capability_projection.v1': '能力预测',
        'redbook.requirements_history.v1': '需求历史',
        'redbook.requirements_projection.v1': '需求预测',
      }
      return map[datasetId] || datasetId
    },
  },
}
</script>

<style scoped>
.erd-header { display: flex; align-items: baseline; gap: 10px; }
.erd-title { font-size: 16px; font-weight: 700; color: #303133; }
.erd-subtitle { font-size: 12px; color: #909399; }
.erd-body { display: flex; flex-direction: column; gap: 10px; }
.erd-links { display: flex; flex-wrap: wrap; }
.erd-stats { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #606266; }
.erd-stat-item { color: #409eff; }
.erd-vintage { color: #e6a23c; font-size: 11px; margin-left: 4px; }
.erd-dim { margin-right: 8px; font-size: 12px; }
.erd-muted { color: #c0c4cc; }
.erd-expand { font-size: 12px; color: #606266; display: flex; flex-direction: column; gap: 3px; padding: 6px 12px; }
.erd-expand code { background: #f5f7fa; padding: 1px 4px; border-radius: 3px; }
.erd-rev { margin-right: 8px; }
.erd-pagination { display: flex; justify-content: flex-end; }
</style>
