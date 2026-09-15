<template>
  <div class="kc-paper-lib" v-loading="loading">
    <!-- 概览统计(K2-P2) -->
    <div v-if="summary" class="kc-paper-summary">
      <span>论文/报告 <b>{{ summary.papers_total }}</b></span>
      <span>可读 PDF <b>{{ summary.pdf_available }}</b></span>
      <span>开放获取 <b>{{ summary.open_access_papers }}</b></span>
      <span>中国相关 <b>{{ summary.china_related }}</b></span>
      <span>研究方向 <b>{{ summary.research_areas_total || '-' }}</b></span>
      <span class="kc-paper-summary-years">年份分布 <b>{{ yearDistText }}</b></span>
      <span>期刊 {{ summary.journal_articles }} · 综述 {{ summary.review_articles }} · 报告 {{ summary.research_reports }} · 章节 {{ summary.book_chapters }}</span>
    </div>

    <!-- 筛选 -->
    <div class="kc-paper-filter">
      <el-input v-model="f.keyword" size="small" placeholder="搜索标题/作者/方法..." clearable style="width:200px" @change="loadPapers" />
      <el-select v-model="f.topic" placeholder="全部主题" clearable size="small" style="width:150px" @change="loadPapers">
        <el-option v-for="t in topicOptions" :key="t" :label="topicLabel(t)" :value="t" />
      </el-select>
      <el-select v-model="f.researchArea" placeholder="全部研究方向" clearable size="small" style="width:150px" @change="loadPapers">
        <el-option v-for="ra in RESEARCH_AREAS" :key="ra.value" :label="ra.label" :value="ra.value" />
      </el-select>
      <el-select v-model="f.country" placeholder="全部国家" clearable size="small" style="width:120px" @change="loadPapers">
        <el-option v-for="c in COUNTRY_OPTIONS" :key="c.value" :label="c.label" :value="c.value" />
      </el-select>
      <el-select v-model="f.year" placeholder="全部年份" clearable size="small" style="width:96px" @change="loadPapers">
        <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
      </el-select>
      <el-select v-model="f.china" placeholder="中国相关" clearable size="small" style="width:100px" @change="loadPapers">
        <el-option label="直接相关" value="DIRECT" />
        <el-option label="间接相关" value="INDIRECT" />
      </el-select>
      <el-switch v-model="f.openAccess" active-text="仅开放获取" size="small" @change="loadPapers" />
      <span class="kc-paper-count">{{ papersTotal }} 篇</span>
    </div>

    <!-- 列表 -->
    <div class="kc-paper-list">
      <div v-for="p in papers" :key="p.paper_id" class="kc-paper-card">
        <div class="kc-paper-main" @click="openDetail(p.paper_id)">
          <div class="kc-paper-head">
            <b>{{ p.title }}</b>
            <span class="kc-paper-type">{{ typeLabel(p.publication_type) }}</span>
            <span class="kc-paper-evidence">{{ evidenceLabel(p.evidence_level) }}</span>
            <span v-if="p.download_status === 'PDF_AVAILABLE'" class="kc-paper-dl">PDF</span>
          </div>
          <p class="kc-paper-authors">{{ (p.authors || []).join(', ') }} · {{ p.year }} · {{ p.journal_or_org }}</p>
          <p class="kc-paper-method" v-if="p.abstract_summary">摘要: {{ p.abstract_summary }}</p>
          <div class="kc-paper-topics">
            <span v-for="ra in (p.research_area || [])" :key="ra" class="kc-paper-topic is-area">{{ researchAreaLabel(ra) }}</span>
            <span v-for="c in (p.country_related || [])" :key="c" class="kc-paper-topic is-country">{{ c }}</span>
            <span v-if="p.china_relevance === 'DIRECT'" class="kc-paper-china">中国</span>
          </div>
        </div>
        <div class="kc-paper-actions">
          <el-button v-if="p.download_status === 'PDF_AVAILABLE'" size="small" type="primary" @click.stop="viewPdf(p)">打开 PDF</el-button>
          <el-button v-else size="small" @click.stop="openLanding(p)">查看详情/原文 ↗</el-button>
        </div>
      </div>
      <el-empty v-if="!papers.length && !loading" description="暂无论文" :image-size="80" />
    </div>

    <!-- 详情(§43-45) -->
    <el-drawer v-model="detailVisible" size="52%" title="研究论文详情" destroy-on-close>
      <div v-if="detail" class="kc-paper-detail">
        <h3 class="kc-paper-detail-title">{{ detail.title }}</h3>
        <p class="kc-paper-detail-authors">{{ detail.authors.join(', ') }} · {{ detail.year }}</p>
        <p class="kc-paper-detail-journal">{{ detail.journal }}<span v-if="detail.volume">, vol {{ detail.volume }}</span><span v-if="detail.pages">, pp. {{ detail.pages }}</span> · {{ detail.publisher }}</p>
        <table class="csd-mini">
          <tr><td>类型</td><td>{{ typeLabel(detail.publication_type) }} · {{ detail.publication_type }}</td></tr>
          <tr v-if="detail.doi"><td>DOI</td><td><a :href="'https://doi.org/' + detail.doi" target="_blank" rel="noopener">{{ detail.doi }} ↗</a></td></tr>
          <tr><td>供应链阶段</td><td>{{ stageLabel(detail.supply_chain_stage) }} · 相关性 {{ detail.supply_chain_relevance }}</td></tr>
          <tr><td>研究方向</td><td><span v-for="ra in (detail.research_area || [])" :key="ra" class="kc-paper-topic is-area">{{ researchAreaLabel(ra) }}</span></td></tr>
          <tr><td>证据等级</td><td>{{ evidenceLabel(detail.evidence_level) }} · 下载 {{ downloadLabel(detail.download_status) }}</td></tr>
          <tr><td>国家相关</td><td>{{ (detail.country_related || []).join(', ') || '-' }} · 中国 {{ detail.china_relevance }}</td></tr>
          <tr><td>Agent 用途</td><td><span v-for="u in (detail.agent_usage || [])" :key="u" class="kc-paper-topic">{{ agentUsageLabel(u) }}</span></td></tr>
          <tr><td>地理/时间范围</td><td>{{ detail.geographic_scope }} · {{ detail.time_scope }}</td></tr>
          <tr><td>开放获取</td><td>{{ detail.open_access ? '是' : '否' }} · PDF {{ pdfStatusLabel(detail.pdf_status) }}</td></tr>
          <tr><td>核验状态</td><td>{{ detail.verification_status }}</td></tr>
        </table>

        <div class="kc-paper-sec"><h4>研究问题</h4><p>{{ detail.research_question }}</p></div>
        <div class="kc-paper-sec kc-paper-method-sec"><h4>研究方法(突出)</h4><p>{{ detail.methodology }}</p></div>
        <div class="kc-paper-sec"><h4>数据</h4><p>{{ detail.data_used }}</p></div>
        <div class="kc-paper-sec"><h4>摘要</h4><p>{{ detail.abstract_summary }}</p></div>
        <div class="kc-paper-sec"><h4>关键结论</h4><ul><li v-for="(k, i) in detail.key_findings" :key="i">{{ k }}</li></ul></div>
        <div class="kc-paper-sec" v-if="detail.limitations"><h4>局限</h4><p>{{ detail.limitations }}</p></div>
        <div class="kc-paper-sec"><h4>引用</h4><p class="kc-paper-cite">{{ detail.citation_text }}</p></div>

        <div class="kc-paper-detail-actions">
          <el-button v-if="detail.pdf_status === 'PDF_AVAILABLE'" type="primary" @click="viewPdf(detail)">查看 PDF</el-button>
          <el-button v-if="detail.landing_page_url" @click="openLanding(detail)">访问原文 / 出版方页面 ↗</el-button>
        </div>
        <p v-if="detail.limitations" class="kc-paper-note">{{ detail.limitations }}</p>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { getResearchPaperSummary, getResearchPapers, getResearchPaper, researchPaperFileUrl } from '@/api/powerGame/uraniumKnowledge'

const TYPE_LABELS = { JOURNAL_ARTICLE: '期刊论文', REVIEW_ARTICLE: '综述', BOOK_CHAPTER: '书章节', CONFERENCE_PAPER: '会议论文', RESEARCH_REPORT: '研究报告' }
const STAGE_LABELS = { MINING: '开采', MILLING: '选矿', PROCESSING: '加工', PRIMARY_SUPPLY: '一次供应', SECONDARY_SUPPLY: '二次供应', CONVERSION: '转化', ENRICHMENT: '浓缩', FUEL_FABRICATION: '燃料制造', FUEL_CYCLE: '燃料循环', TRANSPORT: '运输', TRADE: '贸易', MARKET: '市场', DEMAND: '需求', RESOURCE: '资源', SUPPLY_SECURITY: '供应安全', POLICY: '政策', MULTI_STAGE: '多阶段' }
const TOPIC_LABELS = {
  URANIUM_SUPPLY_CHAIN: '供应链', URANIUM_SUPPLY_SECURITY: '供应安全', URANIUM_MARKET: '市场',
  URANIUM_SUPPLY_DEMAND: '供需', URANIUM_RESOURCE_AVAILABILITY: '资源可得性', URANIUM_TRADE: '贸易',
  CHINA_URANIUM_SECURITY: '中国铀安全', NUCLEAR_FUEL_SUPPLY: '核燃料供应', URANIUM_MINING_SUPPLY: '上游开采',
  GEOPOLITICAL_SUPPLY_RISK: '地缘风险', SUPPLY_RESILIENCE: '供应韧性', SECONDARY_URANIUM_SUPPLY: '二次供应',
}
const RESEARCH_AREAS = [
  { value: 'uranium_supply_chain', label: '供应链' },
  { value: 'uranium_market', label: '市场供需' },
  { value: 'uranium_security', label: '安全' },
  { value: 'uranium_resources', label: '资源' },
  { value: 'uranium_mining', label: '矿业技术' },
  { value: 'nuclear_fuel_cycle', label: '燃料循环' },
  { value: 'uranium_policy', label: '政策' },
  { value: 'china_uranium', label: '中国铀' },
]
const COUNTRY_OPTIONS = [
  { value: 'CHN', label: '中国' }, { value: 'KAZ', label: '哈萨克斯坦' }, { value: 'NAM', label: '纳米比亚' },
  { value: 'CAN', label: '加拿大' }, { value: 'AUS', label: '澳大利亚' }, { value: 'UZB', label: '乌兹别克斯坦' },
  { value: 'RUS', label: '俄罗斯' }, { value: 'NER', label: '尼日尔' },
]

export default {
  name: 'UraniumPaperLibrary',
  data() {
    return {
      loading: false,
      summary: null,
      papers: [],
      papersTotal: 0,
      detail: null,
      detailVisible: false,
      topicOptions: Object.keys(TOPIC_LABELS),
      RESEARCH_AREAS,
      COUNTRY_OPTIONS,
      yearOptions: [],
      f: { keyword: '', topic: '', researchArea: '', country: '', year: '', china: '', openAccess: false },
    }
  },
  computed: {
    yearDistText() {
      if (!this.summary || !this.summary.by_year) return '-'
      return Object.entries(this.summary.by_year).slice(0, 5)
        .map(([y, n]) => `${y}:${n}`).join(' ')
    },
  },
  mounted() { this.loadSummary(); this.loadPapers() },
  methods: {
    async loadSummary() {
      try {
        const s = await getResearchPaperSummary()
        this.summary = (s && s.data) || null
        if (this.summary && this.summary.by_year) {
          this.yearOptions = Object.keys(this.summary.by_year).map(Number).sort((a, b) => b - a)
        }
      } catch (e) { this.summary = null }
    },
    async loadPapers() {
      this.loading = true
      try {
        const params = { page_size: 100 }
        if (this.f.keyword) params.keyword = this.f.keyword
        if (this.f.topic) params.topic = this.f.topic
        if (this.f.researchArea) params.research_area = this.f.researchArea
        if (this.f.country) params.country = this.f.country
        if (this.f.year) params.year = this.f.year
        if (this.f.china) params.china_relevance = this.f.china
        if (this.f.openAccess) params.open_access = 'true'
        const r = await getResearchPapers(params)
        this.papers = ((r && r.data) || {}).items || []
        this.papersTotal = ((r && r.data) || {}).total || 0
      } catch (e) { this.papers = [] } finally { this.loading = false }
    },
    async openDetail(id) {
      try {
        const r = await getResearchPaper(id)
        this.detail = (r && r.data) || null
        this.detailVisible = true
      } catch (e) { this.detail = null }
    },
    viewPdf(p) {
      // 外部公开 PDF 直开;本地文件走 file 端点
      if (p && p.pdf_url) window.open(p.pdf_url, '_blank')
      else window.open(researchPaperFileUrl(p.paper_id), '_blank')
    },
    openLanding(p) {
      const url = p.pdf_url || p.landing_page_url
      if (url) window.open(url, '_blank')
    },
    typeLabel(t) { return TYPE_LABELS[t] || t },
    stageLabel(s) { return STAGE_LABELS[s] || s },
    topicLabel(t) { return TOPIC_LABELS[t] || t },
    researchAreaLabel(ra) { const m = RESEARCH_AREAS.find(x => x.value === ra); return m ? m.label : ra },
    evidenceLabel(e) { return { PEER_REVIEWED: '同行评审', INSTITUTIONAL: '机构报告', REPORT: '报告' }[e] || e || '-' },
    downloadLabel(s) { return { PDF_AVAILABLE: 'PDF 可下载', METADATA_ONLY: '仅元数据' }[s] || s || '-' },
    agentUsageLabel(u) { return { fact_reference: '事实引用', risk_analysis: '风险分析', strategy_support: '策略支撑' }[u] || u },
    pdfStatusLabel(s) { return { PDF_AVAILABLE: '可下载', PAYWALLED: '付费', OA_NO_ACCESS: 'OA(下载受限)' }[s] || s },
  },
}
</script>

<style scoped>
.kc-paper-lib { padding: 4px; }
.kc-paper-summary { display: flex; flex-wrap: wrap; gap: 8px 16px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12.5px; color: #475569; }
.kc-paper-summary b { color: #0f172a; font-size: 15px; }
.kc-paper-filter { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; align-items: center; }
.kc-paper-count { color: #64748b; font-size: 12px; }
.kc-paper-list { display: flex; flex-direction: column; gap: 8px; }
.kc-paper-card { display: flex; justify-content: space-between; gap: 10px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
.kc-paper-main { cursor: pointer; flex: 1; min-width: 0; }
.kc-paper-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.kc-paper-head b { font-size: 13.5px; line-height: 1.4; }
.kc-paper-type { font-size: 11px; color: #1d4ed8; background: #eff6ff; padding: 1px 6px; border-radius: 4px; }
.kc-paper-rel { font-size: 11px; padding: 1px 6px; border-radius: 4px; }
.kc-paper-rel.ok { color: #15803d; background: #f0fdf4; }
.kc-paper-rel.warn { color: #b45309; background: #fffbeb; }
.kc-paper-china { font-size: 11px; color: #b91c1c; background: #fef2f2; padding: 1px 6px; border-radius: 4px; }
.kc-paper-authors { margin: 4px 0 0; font-size: 12px; color: #334155; }
.kc-paper-journal { margin: 2px 0 0; font-size: 11.5px; color: #64748b; }
.kc-paper-method { margin: 4px 0 0; font-size: 12px; color: #0f172a; line-height: 1.5; }
.kc-paper-topics { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.kc-paper-topic { font-size: 10.5px; color: #475569; background: #f1f5f9; padding: 1px 5px; border-radius: 3px; }
.kc-paper-topic.is-area { color: #1e40af; background: #e0e7ff; }
.kc-paper-topic.is-country { color: #065f46; background: #d1fae5; }
.kc-paper-evidence { font-size: 11px; color: #6d28d9; background: #ede9fe; padding: 1px 6px; border-radius: 4px; }
.kc-paper-dl { font-size: 11px; color: #15803d; background: #f0fdf4; padding: 1px 6px; border-radius: 4px; }
.kc-paper-summary-years b { color: #0f172a; font-size: 13px; }
.kc-paper-actions { display: flex; align-items: center; }
.kc-paper-detail-title { font-size: 15px; line-height: 1.4; }
.kc-paper-detail-authors { margin: 4px 0 2px; color: #334155; font-size: 13px; }
.kc-paper-detail-journal { margin: 0 0 10px; color: #64748b; font-size: 12px; }
.kc-paper-sec { margin-top: 12px; }
.kc-paper-sec h4 { margin: 0 0 4px; font-size: 12.5px; font-weight: 800; }
.kc-paper-sec p { margin: 0; color: #475569; font-size: 12.5px; line-height: 1.6; }
.kc-paper-sec ul { margin: 0; padding-left: 18px; color: #475569; font-size: 12.5px; line-height: 1.6; }
.kc-paper-method-sec p { padding: 8px 10px; background: #f0f9ff; border-left: 3px solid #3b82f6; border-radius: 4px; }
.kc-paper-cite { font-family: ui-monospace, monospace; font-size: 11.5px; color: #64748b; }
.kc-paper-detail-actions { margin-top: 14px; display: flex; gap: 8px; }
.kc-paper-note { margin-top: 8px; color: #b45309; font-size: 11.5px; }
</style>
