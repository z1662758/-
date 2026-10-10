<template>
  <div class="kc-expert-view-lib" v-loading="loading">
    <!-- 概览统计(§35/39:真实观点数/机构数/主题数) -->
    <div v-if="summary" class="kc-evs-summary">
      <span>观点 <b>{{ summary.views_total }}</b></span>
      <span>来源机构 <b>{{ summary.organizations_total }}</b></span>
      <span>主题 <b>{{ summary.topics_total }}</b></span>
      <span>当前 <b>{{ summary.current_views }}</b></span>
      <span>积极 {{ summary.positive }} · 消极 {{ summary.negative }} · 中性 {{ summary.neutral }} · 混合 {{ summary.mixed }}</span>
    </div>

    <!-- 筛选(§39) -->
    <div class="kc-evs-filter">
      <el-select v-model="f.organization" placeholder="全部机构" clearable filterable size="small" style="width:180px" @change="loadViews">
        <el-option v-for="o in organizations" :key="o" :label="o" :value="o" />
      </el-select>
      <el-select v-model="f.type" placeholder="全部观点类型" clearable size="small" style="width:150px" @change="loadViews">
        <el-option v-for="t in viewTypes" :key="t" :label="typeLabel(t)" :value="t" />
      </el-select>
      <el-select v-model="f.country" placeholder="全部国家" clearable size="small" style="width:120px" @change="loadViews">
        <el-option v-for="c in countries" :key="c" :label="c" :value="c" />
      </el-select>
      <el-select v-model="f.year" placeholder="全部年份" clearable size="small" style="width:110px" @change="loadViews">
        <el-option v-for="y in years" :key="y" :label="y" :value="y" />
      </el-select>
      <span class="kc-evs-count">{{ viewsTotal }} 条</span>
    </div>

    <!-- 观点列表(§40) -->
    <div class="kc-evs-list">
      <div v-for="v in views" :key="v.view_id" class="kc-evs-card" @click="openDetail(v.view_id)">
        <div class="kc-evs-head">
          <b>{{ v.title }}</b>
          <span class="kc-evs-type">{{ typeLabel(v.view_type) }}</span>
          <span class="kc-evs-dir" :class="dirClass(v.direction)">{{ dirLabel(v.direction) }}</span>
        </div>
        <p class="kc-evs-card-summary">{{ v.summary }}</p>
        <div class="kc-evs-meta">
          <span>{{ v.organization }}</span>
          <span v-if="v.speaker_name">· {{ v.speaker_name }}</span>
          <span>· {{ (v.country_ids || []).join(' / ') || '—' }}</span>
          <span>· {{ v.published_at }}</span>
          <span class="kc-evs-sr" :class="v.self_reported ? 'ok' : 'muted'">{{ v.self_reported ? 'SELF-REPORTED' : '官方/转述' }}</span>
        </div>
      </div>
      <el-empty v-if="!views.length && !loading" description="暂无观点" :image-size="80" />
    </div>

    <!-- 详情(§41) -->
    <el-drawer v-model="detailVisible" size="48%" title="专家观点详情" destroy-on-close>
      <div v-if="detail" class="kc-evs-detail">
        <h3 class="kc-evs-detail-title">{{ detail.title }} <span class="kc-evs-type">{{ typeLabel(detail.view_type) }}</span></h3>
        <p class="kc-evs-claim"><b>核心判断:</b>{{ detail.claim }}</p>
        <p class="kc-evs-summary-text"><b>摘要:</b>{{ detail.summary }}</p>
        <table class="csd-mini">
          <tr><td>机构/专家</td><td>{{ detail.organization }}{{ detail.speaker_name ? ' · ' + detail.speaker_name : '' }}</td></tr>
          <tr><td>观点类型</td><td>{{ typeLabel(detail.view_type) }} ({{ detail.view_type }})</td></tr>
          <tr><td>方向</td><td>{{ dirLabel(detail.direction) }}</td></tr>
          <tr><td>国家/主体</td><td>{{ (detail.country_ids || []).join(' / ') || '—' }} · {{ (detail.entity_ids || []).join(' / ') || '—' }}</td></tr>
          <tr><td>关联路线</td><td>{{ (detail.route_ids || []).join(' / ') || '—' }}</td></tr>
          <tr><td>时间范围</td><td>{{ detail.time_scope }} · {{ detail.outlook_horizon }}</td></tr>
          <tr><td>发布时间</td><td>{{ detail.published_at }}</td></tr>
          <tr><td>置信标注</td><td>{{ detail.confidence_label }}</td></tr>
          <tr><td>来源文档</td><td>{{ detail.document_id }}</td></tr>
        </table>

        <!-- Evidence 与原文(§42/§57) -->
        <div class="kc-evs-evidence" v-if="detail.evidence && detail.evidence.length">
          <h4>Evidence / 原文定位</h4>
          <div v-for="e in detail.evidence" :key="e.evidence_id" class="kc-evs-ev">
            <span class="kc-evs-ev-id">{{ e.evidence_id }} · p.{{ e.page }}{{ e.section ? ' · ' + e.section : '' }}</span>
            <p class="kc-evs-quote">"{{ e.locator_text }}"</p>
            <a v-if="e.url" :href="e.url" target="_blank" rel="noopener">查看原文/官方 PDF ↗</a>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { getExpertViewsSummary, getExpertViews, getExpertView } from '@/api/powerGame/uraniumKnowledge'

const TYPE_LABELS = {
  SUPPLY_OUTLOOK: '供应展望', DEMAND_OUTLOOK: '需求展望', PRODUCTION_OUTLOOK: '生产展望',
  MARKET_OUTLOOK: '市场展望', RESOURCE_OUTLOOK: '资源展望', OPERATIONAL_RISK: '运营风险',
  LOGISTICS_RISK: '物流风险', INPUT_CONSTRAINT: '输入约束', POLICY_OUTLOOK: '政策展望',
  GEOPOLITICAL_RISK: '地缘政治风险', CAPACITY_OUTLOOK: '产能展望', RESILIENCE_VIEW: '韧性观点',
  STRATEGIC_VIEW: '战略观点', OTHER: '其他',
}
const DIR_LABELS = { POSITIVE: '积极', NEGATIVE: '消极', NEUTRAL: '中性', MIXED: '混合' }

export default {
  name: 'UraniumExpertViewLibrary',
  data() {
    return {
      loading: false,
      summary: null,
      views: [],
      viewsTotal: 0,
      detail: null,
      detailVisible: false,
      organizations: [],
      viewTypes: [],
      countries: [],
      years: [],
      f: { organization: '', type: '', country: '', year: '' },
    }
  },
  mounted() { this.loadSummary(); this.loadViews() },
  methods: {
    async loadSummary() {
      try {
        const s = await getExpertViewsSummary()
        this.summary = (s && s.data) || null
        if (this.summary) {
          this.organizations = Object.keys(this.summary.by_organization || {})
          this.viewTypes = Object.keys(this.summary.by_type || {})
          this.years = Object.keys(this.summary.by_year || {}).sort().reverse()
        }
      } catch (e) { this.summary = null }
      // 国家列表从视图数据补充
      try {
        const r = await getExpertViews({ page_size: 100 })
        const items = ((r && r.data) || {}).items || []
        this.countries = [...new Set(items.flatMap(i => i.country_ids || []))].sort()
      } catch (e) { /* ignore */ }
    },
    async loadViews() {
      this.loading = true
      try {
        const params = {}
        if (this.f.organization) params.organization = this.f.organization
        if (this.f.type) params.type = this.f.type
        if (this.f.country) params.country_id = this.f.country
        if (this.f.year) params.year = this.f.year
        params.page_size = 100
        const r = await getExpertViews(params)
        this.views = ((r && r.data) || {}).items || []
        this.viewsTotal = ((r && r.data) || {}).total || 0
      } catch (e) { this.views = [] } finally { this.loading = false }
    },
    async openDetail(id) {
      try {
        const r = await getExpertView(id)
        this.detail = (r && r.data) || null
        this.detailVisible = true
      } catch (e) { this.detail = null }
    },
    typeLabel(t) { return TYPE_LABELS[t] || t },
    dirLabel(d) { return DIR_LABELS[d] || d },
    dirClass(d) { return d === 'POSITIVE' ? 'ok' : d === 'NEGATIVE' ? 'bad' : 'warn' },
  },
}
</script>

<style scoped>
.kc-expert-view-lib { padding: 4px; }
.kc-evs-summary { display: flex; flex-wrap: wrap; gap: 8px 16px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12.5px; color: #475569; }
.kc-evs-summary b { color: #0f172a; font-size: 15px; }
.kc-evs-filter { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; align-items: center; }
.kc-evs-count { color: #64748b; font-size: 12px; }
.kc-evs-list { display: flex; flex-direction: column; gap: 8px; }
.kc-evs-card { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: border-color .15s; }
.kc-evs-card:hover { border-color: #60a5fa; }
.kc-evs-head { display: flex; align-items: center; gap: 8px; }
.kc-evs-head b { font-size: 13.5px; }
.kc-evs-type { font-size: 11px; color: #1d4ed8; background: #eff6ff; padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
.kc-evs-dir { font-size: 11px; padding: 1px 6px; border-radius: 4px; }
.kc-evs-dir.ok { color: #15803d; background: #f0fdf4; }
.kc-evs-dir.bad { color: #b91c1c; background: #fef2f2; }
.kc-evs-dir.warn { color: #b45309; background: #fffbeb; }
.kc-evs-card-summary { margin: 6px 0 4px; color: #475569; font-size: 12.5px; line-height: 1.5; }
.kc-evs-meta { display: flex; flex-wrap: wrap; gap: 4px 10px; color: #64748b; font-size: 11.5px; }
.kc-evs-sr.ok { color: #15803d; } .kc-evs-sr.muted { color: #94a3b8; }
.kc-evs-detail-title { font-size: 15px; }
.kc-evs-claim { margin: 10px 0 6px; padding: 8px 10px; background: #f0f9ff; border-left: 3px solid #3b82f6; border-radius: 4px; font-size: 13px; line-height: 1.6; }
.kc-evs-summary-text { margin: 0 0 10px; color: #475569; font-size: 12.5px; line-height: 1.6; }
.kc-evs-evidence { margin-top: 14px; }
.kc-evs-evidence h4 { margin: 0 0 8px; font-size: 13px; }
.kc-evs-ev { padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 6px; }
.kc-evs-ev-id { font-size: 11.5px; color: #64748b; }
.kc-evs-quote { margin: 4px 0; padding: 6px 8px; background: #f8fafc; border-left: 3px solid #e2e8f0; color: #334155; font-size: 12px; line-height: 1.5; }
.kc-evs-ev a { font-size: 12px; color: #2563eb; text-decoration: none; }
</style>
