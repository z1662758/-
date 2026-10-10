<template>
  <div class="auto-kb-lib">
    <div class="auto-kb-top">
      <el-button text @click="backOrEmit">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h3 class="auto-kb-title">{{ title }}（汽车）</h3>
      <span v-if="items.length" class="auto-kb-count">{{ items.length }} 条</span>
      <span v-if="detail" class="auto-kb-crumb">/ {{ detailTitle }}</span>
    </div>

    <!-- 详情视图 -->
    <div v-if="detail" class="auto-kb-detail">
      <h4 class="auto-kb-detail-title">{{ detailTitle }}</h4>
      <table class="auto-kb-table">
        <tbody>
          <tr v-for="(val, field) in presentFields(detail)" :key="field">
            <td class="auto-kb-td-key">{{ field }}</td>
            <td class="auto-kb-td-val">{{ val }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 跨库关联 -->
      <div v-for="grp in relatedGroups" :key="grp.key" class="auto-kb-rel">
        <div class="auto-kb-rel-title">{{ grp.label }} <span>({{ grp.items.length }})</span></div>
        <div class="auto-kb-rel-list">
          <button v-for="it in grp.items" :key="it.id" class="auto-kb-rel-chip" @click="openDetail(grp.lib, it.id)">
            {{ it.label }}
          </button>
        </div>
      </div>

      <!-- 来源与证据 -->
      <KnowledgeEvidencePanel :evidence="detail.evidence || []" :sources="detail.sources || []" />

      <div class="auto-kb-backrow">
        <el-button size="small" @click="detail = null">返回列表</el-button>
      </div>
    </div>

    <!-- 列表视图 -->
    <template v-else>
      <div v-if="loading" class="auto-kb-state"><el-icon class="is-loading"><Loading /></el-icon> 正在加载{{ title }}…</div>
      <div v-else-if="error" class="auto-kb-state">
        <el-icon color="#f59e0b"><WarningFilled /></el-icon>
        <p>{{ error }}</p>
        <el-button size="small" @click="load">重试</el-button>
      </div>
      <div v-else-if="!items.length" class="auto-kb-state">
        <el-icon color="#d1d5db"><ChatDotRound /></el-icon>
        <p>暂无汽车{{ title }}数据（数据仍在建设中）</p>
      </div>
      <div v-else class="auto-kb-list">
        <div v-for="it in items" :key="keyOf(it)" class="auto-kb-row" @click="pick(it)">
          <div class="auto-kb-row-main">
            <b>{{ titleOf(it) }}</b>
            <span v-if="subOf(it)" class="auto-kb-sub">{{ subOf(it) }}</span>
          </div>
          <div class="auto-kb-row-tags">
            <el-tag v-if="typeOf(it)" size="small" effect="plain">{{ typeOf(it) }}</el-tag>
            <el-tag v-if="statusOf(it)" size="small" :type="statusTag(statusOf(it))">{{ statusOf(it) }}</el-tag>
            <el-tag v-if="yearOf(it)" size="small" type="info" effect="plain">{{ yearOf(it) }}</el-tag>
          </div>
          <span class="auto-kb-row-arrow">›</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { ArrowLeft, Loading, WarningFilled, ChatDotRound } from '@element-plus/icons-vue'
import { getAutomotiveLibrary, getAutomotiveOntology, getAutomotiveItem } from '@/api/powerGame/automotiveKnowledge'
import KnowledgeEvidencePanel from './KnowledgeEvidencePanel.vue'

const TITLES = {
  documents: '专家文档库', papers: '研究论文库', osint: '开源情报库', expertViews: '专家观点',
  subjects: '主体库', environment: '环境库', rules: '规则库', models: '模型库', ontology: '本体网络',
}
const FIELD = {
  documents: { title: 'title', sub: 'publisher', type: 'document_type', year: 'year', status: 'verification_status', id: 'document_id' },
  papers: { title: 'title', sub: 'authors', type: 'venue', year: 'year', status: 'verification_status', id: 'paper_id' },
  osint: { title: 'title', sub: 'summary', type: 'event_type', year: 'event_date', status: 'event_state', id: 'event_id' },
  expertViews: { title: 'title', sub: 'organization', type: 'view_type', year: 'published_at', status: 'verification_status', id: 'view_id' },
  subjects: { title: 'canonical_name', sub: 'name_zh', type: 'subject_type', year: '', status: 'status', id: 'subject_id' },
  environment: { title: 'name', sub: 'description', type: 'geography', year: '', status: 'verification_status', id: 'dataset_id' },
  rules: { title: 'name_zh', sub: 'description', type: 'rule_category', year: 'version', status: 'enabled', id: 'rule_id' },
  models: { title: 'name', sub: 'purpose', type: 'model_category', year: 'version', status: 'data_readiness', id: 'model_id' },
  ontology: { title: 'name_zh', sub: 'description', type: '_kind', year: '', status: '', id: 'class_id' },
}

export default {
  name: 'AutomotiveLibraryView',
  components: { ArrowLeft, Loading, WarningFilled, ChatDotRound, KnowledgeEvidencePanel },
  props: { lib: { type: String, default: '' } },
  emits: ['back'],
  data() {
    return { curLib: this.lib, items: [], loading: true, error: '', detail: null, detailLib: '' }
  },
  computed: {
    title() { return TITLES[this.curLib] || this.curLib },
    detailTitle() {
      if (!this.detail) return ''
      const fm = FIELD[this.detailLib] || {}
      for (const k of ['title', 'name_zh', 'name', 'canonical_name']) {
        if (this.detail[k]) return String(this.detail[k])
      }
      return this.detail[fm.id] || this.detail[fm.title] || '详情'
    },
    relatedGroups() {
      const d = this.detail
      if (!d) return []
      const g = []
      const put = (key, label, lib, arr, idKey, labelFn) => {
        const list = (arr || []).map(x => ({ id: x[idKey], label: labelFn(x) })).filter(x => x.id)
        if (list.length) g.push({ key, label, lib, items: list })
      }
      put('events', '相关开源情报', 'osint', d.related_events, 'event_id', x => `${x.title || x.event_id}（${x.event_date || ''} ${x.event_state || ''}）`)
      put('subjects', '相关主体', 'subjects', d.related_subjects, 'subject_id', x => x.name_zh || x.canonical_name || x.subject_id)
      put('docs', '相关文档', 'documents', d.related_documents, 'document_id', x => `${x.title || x.document_id}`)
      put('views', '相关专家观点', 'expertViews', d.related_views, 'view_id', x => `${x.organization ? x.organization + ' · ' : ''}${x.title || x.view_id}`)
      put('models', '相关模型', 'models', d.related_models, 'model_id', x => x.name || x.model_id)
      return g
    },
  },
  methods: {
    fm() { return FIELD[this.curLib] || { title: 'title' } },
    async load() {
      this.loading = true; this.error = ''
      try {
        if (this.curLib === 'ontology') {
          const res = await getAutomotiveOntology()
          const d = (res && res.data) || {}
          this.items = [
            ...(d.classes || []).map(c => ({ ...c, _kind: '类' })),
            ...(d.relations || []).map(r => ({ ...r, _kind: '关系' })),
            ...(d.constraints || []).map(c => ({ ...c, _kind: '约束' })),
          ]
        } else {
          const res = await getAutomotiveLibrary(this.curLib)
          this.items = (res && res.data && res.data.items) || []
        }
      } catch (e) { this.error = (e && e.message) || '加载失败' }
      finally { this.loading = false }
    },
    titleOf(it) { const v = it[this.fm().title]; return Array.isArray(v) ? (v.join(', ') || '(未命名)') : (v || '(未命名)') },
    subOf(it) { let v = it[this.fm().sub]; if (Array.isArray(v)) v = v.join(', '); return String(v || '').slice(0, 140) },
    typeOf(it) { const v = it[this.fm().type]; return Array.isArray(v) ? v.join('/') : v },
    yearOf(it) { const k = this.fm().year; return (k && it[k]) ? String(it[k]).slice(0, 10) : '' },
    statusOf(it) {
      const k = this.fm().status; if (!k) return ''
      const v = it[k]
      return (v === true || v === 'true') ? '生效' : (v === false || v === 'false') ? '停用' : v
    },
    statusTag(s) {
      const up = String(s || '').toUpperCase()
      if (up.includes('VERIFIED') || up === 'OPERATING' || up === 'RESOLVED' || up === 'COMPLETED' || up === 'ACADEMIC_BACKED' || up === 'ACTIVE') return up === 'ACTIVE' ? 'danger' : 'success'
      if (up === 'ONGOING' || up === 'HIGH' || up === 'MISSING_DATA') return 'warning'
      if (up.includes('CANDIDATE') || up === 'UNKNOWN') return 'warning'
      return 'info'
    },
    keyOf(it) { const fm = this.fm(); return it[fm.id] || it[fm.title] || JSON.stringify(it).slice(0, 24) },
    pick(it) {
      const id = it[this.fm().id]
      if (this.curLib === 'ontology' || !id) { this.detail = it; this.detailLib = this.curLib; return }
      this.openDetail(this.curLib, id)
    },
    async openDetail(lib, id) {
      this.detail = null
      try {
        const res = await getAutomotiveItem(lib, id)
        const d = (res && res.data) || null
        if (d) { this.detailLib = lib; this.detail = d; this.$nextTick(() => { window.scrollTo({ top: 0 }) }) }
      } catch (e) { this.error = (e && e.message) || '详情加载失败' }
    },
    backOrEmit() { if (this.detail) { this.detail = null } else { this.$emit('back') } },
    presentFields(it) {
      const out = {}
      const skip = new Set(['evidence', 'sources', 'related_events', 'related_subjects', 'related_documents', 'related_views', 'related_models'])
      for (const k of Object.keys(it)) {
        if (skip.has(k)) continue
        let v = it[k]
        if (v === null || v === undefined || v === '') continue
        if (Array.isArray(v)) v = v.map(x => (x && typeof x === 'object') ? JSON.stringify(x) : x).join('；')
        else if (typeof v === 'object') v = JSON.stringify(v)
        out[k] = String(v)
      }
      return out
    },
  },
  created() { this.load() },
}
</script>

<style scoped>
.auto-kb-lib { padding: 8px 4px; }
.auto-kb-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.auto-kb-title { margin: 0; font-size: 17px; font-weight: 700; color: #1e293b; }
.auto-kb-count { font-size: 12px; color: #94a3b8; }
.auto-kb-crumb { font-size: 13px; color: #64748b; }
.auto-kb-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0; color: #94a3b8; }
.auto-kb-state p { margin: 0; font-size: 13px; }
.auto-kb-list { display: flex; flex-direction: column; gap: 6px; }
.auto-kb-row {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px;
  border: 1px solid #e2e8f0; background: #fff; cursor: pointer; transition: all .12s;
}
.auto-kb-row:hover { border-color: #93c5fd; background: #f8fafc; }
.auto-kb-row-main { flex: 1; min-width: 0; }
.auto-kb-row-main b { display: block; font-size: 13.5px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.auto-kb-sub { display: block; font-size: 11.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.auto-kb-row-tags { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.auto-kb-row-arrow { color: #cbd5e1; }
.auto-kb-detail-title { margin: 0 0 8px; font-size: 15px; color: #0f172a; }
.auto-kb-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.auto-kb-table td { border: 1px solid #eef2f7; padding: 6px 10px; vertical-align: top; }
.auto-kb-td-key { width: 130px; color: #64748b; background: #f8fafc; font-weight: 600; white-space: nowrap; }
.auto-kb-td-val { color: #1e293b; word-break: break-word; }
.auto-kb-rel { margin-top: 10px; }
.auto-kb-rel-title { font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px; }
.auto-kb-rel-title span { color: #94a3b8; font-weight: 500; }
.auto-kb-rel-list { display: flex; flex-wrap: wrap; gap: 6px; }
.auto-kb-rel-chip {
  font-size: 0.74rem; color: #1d4ed8; background: #eef2ff; border: 1px solid #c7d2fe;
  border-radius: 999px; padding: 3px 10px; cursor: pointer; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.auto-kb-rel-chip:hover { background: #dbeafe; }
.auto-kb-backrow { margin-top: 14px; }
</style>
