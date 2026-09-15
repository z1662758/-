<template>
  <div class="aont">
    <div class="aont-top">
      <el-button text @click="$emit('back')">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h3 class="aont-title">本体网络（汽车）</h3>
      <div class="aont-tabs">
        <button :class="{ on: mode === 'class' }" @click="setMode('class')">本体类关系</button>
        <button :class="{ on: mode === 'graph' }" @click="setMode('graph')">主体关系网络</button>
      </div>
      <span v-if="mode === 'graph'" class="aont-legend">
        <i class="lg lg-oem"></i>OEM
        <i class="lg lg-tier"></i>供应商
        <i class="lg lg-batt"></i>电池
        <i class="lg lg-semi"></i>半导体
        <i class="lg lg-mat"></i>材料
        <i class="lg lg-port"></i>工厂/港口/物流
      </span>
      <span v-else class="aont-legend">
        <i class="lg" style="background:#6366f1"></i>企业主体
        <i class="lg" style="background:#0ea5e9"></i>设施资产
        <i class="lg" style="background:#10b981"></i>物料与产品
        <i class="lg" style="background:#94a3b8"></i>地理区域
        <i class="lg" style="background:#f59e0b"></i>情报与证据
        <i class="lg" style="background:#8b5cf6"></i>网络与路线
      </span>
    </div>

    <div v-if="loading" class="aont-state"><el-icon class="is-loading"><Loading /></el-icon> 正在加载网络…</div>
    <div v-else-if="error" class="aont-state">{{ error }}</div>
    <div v-else class="aont-canvas-wrap">
      <div ref="canvas" class="aont-canvas"></div>
      <div class="aont-meta">
        <span>节点 <b>{{ nodeCount }}</b></span>
        <span>关系 <b>{{ edgeCount }}</b></span>
        <span v-if="mode === 'graph'">数据：主体库 + 关系表（真实）</span>
        <span v-else>数据：本体类 + 谓词定义</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ArrowLeft, Loading } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getAutomotiveLibrary, getAutomotiveOntology } from '@/api/powerGame/automotiveKnowledge'

const CAT = {
  OEM: { name: 'OEM', color: '#6366f1' },
  TIER1: { name: '供应商', color: '#f59e0b' },
  BATTERY_COMPANY: { name: '电池', color: '#10b981' },
  SEMICONDUCTOR_COMPANY: { name: '半导体', color: '#ef4444' },
  RAW_MATERIAL_COMPANY: { name: '材料', color: '#8b5cf6' },
  VEHICLE_PLANT: { name: '工厂/港口/物流', color: '#0ea5e9' },
  BATTERY_PLANT: { name: '工厂/港口/物流', color: '#0ea5e9' },
  SEMICONDUCTOR_FAB: { name: '工厂/港口/物流', color: '#0ea5e9' },
  PORT: { name: '工厂/港口/物流', color: '#0ea5e9' },
  LOGISTICS_HUB: { name: '工厂/港口/物流', color: '#0ea5e9' },
  MINE: { name: '材料', color: '#8b5cf6' },
  REFINERY: { name: '材料', color: '#8b5cf6' },
  SUPPLIER: { name: '供应商', color: '#f59e0b' },
}
const CAT_ORDER = ['OEM', '供应商', '电池', '半导体', '材料', '工厂/港口/物流']
// 本体类语义分组(按类语义,非父类层级)
const CLASS_GROUP = {
  Company: '企业主体', OEM: '企业主体', Supplier: '企业主体', Tier1Supplier: '企业主体', Tier2Supplier: '企业主体',
  BatteryManufacturer: '企业主体', SemiconductorCompany: '企业主体', RawMaterialSupplier: '企业主体',
  Mine: '设施资产', Refinery: '设施资产', VehiclePlant: '设施资产', BatteryPlant: '设施资产',
  SemiconductorFab: '设施资产', Port: '设施资产', RailNode: '设施资产', LogisticsHub: '设施资产',
  Commodity: '物料与产品', Component: '物料与产品', VehicleModel: '物料与产品',
  Country: '地理区域',
  OSINTEvent: '情报与证据', Document: '情报与证据', Evidence: '情报与证据',
  SupplyRoute: '网络与路线',
}
const CLASS_GROUP_ORDER = ['企业主体', '设施资产', '物料与产品', '地理区域', '情报与证据', '网络与路线', '其他']
const CLASS_GROUP_COLOR = {
  企业主体: '#6366f1', 设施资产: '#0ea5e9', 物料与产品: '#10b981',
  地理区域: '#94a3b8', 情报与证据: '#f59e0b', 网络与路线: '#8b5cf6', 其他: '#cbd5e1',
}
const ISO_ZH = {
  CN: '中国', DE: '德国', US: '美国', JP: '日本', KR: '韩国', FR: '法国', GB: '英国', IT: '意大利',
  ES: '西班牙', HU: '匈牙利', PL: '波兰', MX: '墨西哥', BR: '巴西', IN: '印度', ID: '印尼',
  AU: '澳大利亚', CA: '加拿大', CL: '智利', CD: '刚果(金)', MZ: '莫桑比克', TW: '中国台湾',
  BE: '比利时', NL: '荷兰', TH: '泰国', VN: '越南', RU: '俄罗斯', AR: '阿根廷', ZA: '南非',
  SE: '瑞典', TR: '土耳其', AT: '奥地利', CZ: '捷克', SK: '斯洛伐克', PT: '葡萄牙', MA: '摩洛哥',
  PH: '菲律宾', MY: '马来西亚', SG: '新加坡', FI: '芬兰', NO: '挪威', CH: '瑞士',
}

export default {
  name: 'AutomotiveOntologyNetwork',
  components: { ArrowLeft, Loading },
  emits: ['back'],
  data() { return { mode: 'class', loading: true, error: '', nodeCount: 0, edgeCount: 0, chart: null, subjects: [], relations: [], ontology: null } },
  methods: {
    async load() {
      this.loading = true; this.error = ''
      try {
        const [s, r, o] = await Promise.all([
          getAutomotiveLibrary('subjects'), getAutomotiveLibrary('relations'), getAutomotiveOntology(),
        ])
        this.subjects = (s && s.data && s.data.items) || []
        this.relations = (r && r.data && r.data.items) || []
        this.ontology = (o && o.data) || null
        this.loading = false
        await this.$nextTick()
        this.render()
      } catch (e) { this.error = (e && e.message) || '加载失败'; this.loading = false }
    },
    setMode(m) { this.mode = m; this.$nextTick(() => this.render()) },
    catOf(t) { return CAT[t] || { name: '其他', color: '#94a3b8' } },
    render() {
      const el = this.$refs.canvas
      if (!el) return
      if (!this.chart) this.chart = echarts.init(el)
      const opt = this.mode === 'graph' ? this.buildSubjectGraph() : this.buildClassGraph()
      this.chart.setOption(opt, true)
      this.nodeCount = opt.series[0].data.length
      this.edgeCount = opt.series[0].links.length
    },
    buildSubjectGraph() {
      const idSet = new Set(this.subjects.map(s => s.subject_id))
      const catSeen = new Map()
      const nodes = this.subjects.map(s => {
        const c = this.catOf(s.subject_type)
        if (!catSeen.has(c.name)) catSeen.set(c.name, { name: c.name, itemStyle: { color: c.color } })
        return { id: s.subject_id, name: s.canonical_name || s.name_zh || s.subject_id, category: c.name, symbolSize: 12, value: s.name_zh || '' }
      })
      // 国家节点(LOCATED_IN 目标为 ISO 码,非 subject)
      const cSeen = new Set()
      for (const r of this.relations) {
        const t = r.target_subject_id
        if (t && !idSet.has(t) && /^[A-Z]{2}$/.test(t)) {
          if (!cSeen.has(t)) cSeen.add(t)
        }
      }
      if (cSeen.size) catSeen.set('国家', { name: '国家', itemStyle: { color: '#94a3b8' } })
      for (const iso of cSeen) nodes.push({ id: 'C:' + iso, name: ISO_ZH[iso] || iso, category: '国家', symbolSize: 10, value: iso })
      const links = this.relations
        .map(r => {
          const s = r.source_subject_id, t = r.target_subject_id
          if (!idSet.has(s)) return null
          const tgt = idSet.has(t) ? t : (cSeen.has(t) ? 'C:' + t : null)
          if (!tgt) return null
          return { source: s, target: tgt, value: r.relation_type }
        })
        .filter(Boolean)
      const cats = CAT_ORDER.filter(n => catSeen.has(n)).map(n => catSeen.get(n))
      if (catSeen.has('国家')) cats.push(catSeen.get('国家'))
      return {
        tooltip: { formatter: p => p.dataType === 'edge' ? `${p.data.value}` : `${p.data.name}${p.data.value ? ' · ' + p.data.value : ''}` },
        legend: [{ data: cats.map(c => c.name), top: 0, textStyle: { fontSize: 11 } }],
        series: [{
          type: 'graph', layout: 'force', roam: true, draggable: true,
          categories: cats, force: { repulsion: 130, edgeLength: 60, gravity: 0.08 },
          label: { show: true, position: 'right', fontSize: 9, formatter: p => (p.data.name || '').slice(0, 10) },
          edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 5,
          lineStyle: { color: '#cbd5e1', width: 1, curveness: 0.06, opacity: 0.7 },
          emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
          data: nodes, links,
        }],
      }
    },
    buildClassGraph() {
      const ont = this.ontology || { classes: [], relations: [] }
      const cls = new Set(ont.classes.map(c => c.class_id))
      const used = new Map()
      const nodes = ont.classes.map(c => {
        const grp = CLASS_GROUP[c.class_id] || '其他'
        if (!used.has(grp)) used.set(grp, { name: grp, itemStyle: { color: CLASS_GROUP_COLOR[grp] || '#94a3b8' } })
        return { id: c.class_id, name: c.name_zh || c.class_id, category: grp, symbolSize: c.parent ? 14 : 20, value: c.class_id }
      })
      const links = []
      for (const r of ont.relations) {
        for (const d of (r.domain || [])) {
          for (const rg of (r.range || [])) {
            if (cls.has(d) && cls.has(rg)) links.push({ source: d, target: rg, value: r.label_zh || r.relation_id })
          }
        }
      }
      const cats = CLASS_GROUP_ORDER.filter(n => used.has(n)).map(n => used.get(n))
      return {
        tooltip: { formatter: p => p.dataType === 'edge' ? `${p.data.value}` : `${p.data.name}（${p.data.value}）` },
        legend: [{ data: cats.map(c => c.name), top: 0, textStyle: { fontSize: 11 } }],
        series: [{
          type: 'graph', layout: 'force', roam: true, draggable: true,
          categories: cats, force: { repulsion: 260, edgeLength: 90, gravity: 0.1 },
          label: { show: true, position: 'bottom', fontSize: 9 },
          edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 5,
          lineStyle: { color: '#94a3b8', width: 1, curveness: 0.1, opacity: 0.7 },
          emphasis: { focus: 'adjacency' },
          data: nodes, links,
        }],
      }
    },
    onResize() { if (this.chart) this.chart.resize() },
  },
  mounted() { this.load(); window.addEventListener('resize', this.onResize) },
  beforeUnmount() { window.removeEventListener('resize', this.onResize); if (this.chart) { this.chart.dispose(); this.chart = null } },
}
</script>

<style scoped>
.aont { padding: 8px 4px; }
.aont-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
.aont-title { margin: 0; font-size: 17px; font-weight: 700; color: #1e293b; }
.aont-tabs { display: inline-flex; gap: 4px; padding: 3px; background: #f1f5f9; border-radius: 999px; border: 1px solid #e2e8f0; }
.aont-tabs button { border: none; background: transparent; color: #64748b; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; cursor: pointer; }
.aont-tabs button.on { background: #6366f1; color: #fff; }
.aont-legend { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; color: #64748b; flex-wrap: wrap; }
.aont-legend .lg { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 3px; }
.lg-oem { background: #6366f1; } .lg-tier { background: #f59e0b; } .lg-batt { background: #10b981; }
.lg-semi { background: #ef4444; } .lg-mat { background: #8b5cf6; } .lg-port { background: #0ea5e9; }
.aont-state { display: flex; align-items: center; gap: 8px; padding: 60px 0; justify-content: center; color: #94a3b8; }
.aont-canvas-wrap { position: relative; }
.aont-canvas { width: 100%; height: 560px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
.aont-meta { display: flex; gap: 16px; font-size: 11.5px; color: #64748b; padding: 6px 4px; }
.aont-meta b { color: #0f172a; }
</style>
