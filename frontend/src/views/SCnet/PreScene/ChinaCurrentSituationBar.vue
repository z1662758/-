<template>
  <div class="csbar-wrap">
    <!-- K2-SUPPLY-SHARE-3F-R:统一供应来源占比(Domestic + 7 海外路线 = 100%,主条简洁不带技术标签) -->
    <div class="csbar">
      <div class="csbar-title" :title="'方法/来源见详情'">
        供应来源占比
        <span class="csbar-info">ⓘ</span>
      </div>

      <div
        v-for="c in allocationComponents"
        :key="c.id"
        class="cs-chip src"
        :class="c.source_type === 'DOMESTIC' ? 'self' : 'foreign'"
        :title="allocationTip(c)"
      >
        {{ c.country === '中国' ? '自主' : countryName(c.country) }} <b>{{ fmtShare(c.display_share_percent) }}</b>
      </div>

      <div class="csbar-right">
        <button class="cs-detail-btn" @click="openDetails">详情 ▾</button>
      </div>
    </div>

    <!-- ── Current Supply Details ─────────────────────── -->
    <el-drawer v-model="detailsOpen" size="46%" :title="'Current Supply Details · ' + situation.year" destroy-on-close>
      <div class="csd-body" v-loading="detailLoading">
        <!-- A. 当前自主率 -->
        <section class="csd-sec">
          <h4>A · 当前自主率</h4>
          <div class="csd-self-row">
            <b class="csd-self-val">{{ selfValue }}%</b>
            <span class="est">ESTIMATED</span>
            <span class="csd-conf">置信 {{ selfReliance.confidence_class }}</span>
          </div>
          <p class="csd-note">{{ selfReliance.label }}</p>
          <table class="csd-mini">
            <tr><td>2024 国内产量</td><td>{{ fmtNum(selfReliance.domestic_production_estimate) }} tU</td></tr>
            <tr><td>2024 需求</td><td>{{ fmtNum(selfReliance.requirement_estimate) }} tU</td></tr>
            <tr><td>估算区间</td><td>{{ fmtNum(selfReliance.estimate_range && selfReliance.estimate_range.requirement_low) }} – {{ fmtNum(selfReliance.estimate_range && selfReliance.estimate_range.requirement_high) }} tU</td></tr>
            <tr><td>方法</td><td>{{ selfReliance.methodology_id }}</td></tr>
            <tr><td>不含</td><td>库存 · 二次供应 · 再处理铀 · 战略储备 · 海外权益铀</td></tr>
          </table>
          <div class="csd-hist" v-if="verifiedHistory.length">
            <strong>历史自主率(已核验)</strong>
            <p v-for="h in verifiedHistory" :key="h.year" class="csd-hist-row">
              {{ h.year }} · {{ h.production }} tU / {{ h.requirements }} tU → <b>{{ h.coverage_percent }}%</b>
            </p>
            <p class="csd-hist-note">2013 为最近已核验历史可比年份</p>
          </div>
        </section>

        <!-- B/C. 按商品阶段国家份额 + 历史年份切换 -->
        <section class="csd-sec">
          <div class="csd-sec-head">
            <h4>B · 按商品阶段国家份额</h4>
            <div class="csd-years">
              <button
                v-for="y in tradeYears"
                :key="y"
                :class="{ active: detailYear === y }"
                @click="switchDetailYear(y)"
              >{{ y }}</button>
            </div>
          </div>
          <div v-for="grp in stageGroups" :key="grp.title" class="csd-stage">
            <div class="csd-stage-head">
              <span class="csd-stage-title">{{ grp.title }}</span>
              <span class="csd-stage-world">{{ grp.worldLabel }}</span>
            </div>
            <table class="csd-table">
              <thead><tr><th>国家</th><th>Quantity</th><th>Share</th><th>Status</th><th></th></tr></thead>
              <tbody>
                <tr v-for="p in grp.partners" :key="p.country_id + grp.stage">
                  <td class="csd-country">{{ countryName(p.country_id) }}</td>
                  <td>{{ p.quantity != null ? fmtKg(p.quantity) + ' kg' : '—' }}</td>
                  <td>{{ p.share_percent != null ? fmtShare(p.share_percent) : '—' }}</td>
                  <td><span class="csd-badge" :class="statusClass(p.verification_status)">{{ statusText(p.verification_status) }}</span></td>
                  <td>
                    <a v-if="p.source_url" class="csd-src" :href="p.source_url" target="_blank" rel="noopener">WITS/UN Comtrade ↗</a>
                    <span v-else class="csd-src muted">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="grp.mirror && grp.mirror.length" class="csd-mirror">
              <strong>贸易统计差异(mirror vs reporter)</strong>
              <p v-for="m in grp.mirror" :key="m.mirror_exporter_country_id + m.year" class="csd-mirror-line">
                {{ countryName(m.mirror_exporter_country_id) }} 对华出口
                <b>{{ fmtKg(m.quantity) }} kg</b>
                <template v-if="m.reporter_import_quantity != null"> / 中国申报 <b>{{ fmtKg(m.reporter_import_quantity) }} kg</b></template>
                <span class="csd-badge warn">MIRROR</span>
              </p>
            </div>
          </div>
        </section>

        <!-- E. 模型方法 -->
        <section class="csd-sec">
          <h4>E · 模型方法</h4>
          <p class="csd-note">综合供应贡献指数 = Σ( 阶段国家份额 × 阶段权重 × 数据质量权重 ),态势展示指标,非跨商品物理质量份额。</p>
          <table class="csd-mini">
            <tr v-for="(w, stage) in stageWeights" :key="stage"><td>{{ stageName(stage) }}</td><td><b>{{ (w * 100).toFixed(0) }}%</b></td></tr>
            <tr><td>权重状态</td><td>{{ weightStatus }}</td></tr>
            <tr><td>方法版本</td><td>{{ methodVersion }}</td></tr>
            <tr><td>排除层</td><td>{{ excludedStages.join(', ') }} — {{ exclusionReason }}</td></tr>
          </table>
        </section>

        <!-- F. 物理供应平衡(K2-SUPPLY-SHARE-2,§29-33) -->
        <section class="csd-sec" v-if="balance">
          <div class="csd-sec-head">
            <h4>F · 物理供应平衡(严格口径 · {{ balance.year }})</h4>
            <span v-if="!balance.physical_share_ready" class="csd-badge bad">NOT READY</span>
          </div>
          <p class="csd-note">只含可比物理数据;HS 数量为商品毛重非 uranium 含量,缺 assay/需求/库存/二次供应 → 无法构成"国内+海外=100%"。</p>
          <table class="csd-mini">
            <tr>
              <td>国内一次铀产量</td>
              <td>{{ fmtNum(balance.components.domestic_primary_production.value_tU) }} tU
                <span class="csd-badge warn">{{ balance.components.domestic_primary_production.status }}</span>
                <span class="csd-sub">{{ balance.components.domestic_primary_production.year }} 年 · Red Book</span>
              </td>
            </tr>
            <tr>
              <td>天然铀进口(HS284410)</td>
              <td><b>{{ fmtKg(balance.components.natural_uranium_import.value_kg_product) }} kg</b>
                <span class="csd-badge bad">NON-COMPARABLE</span>
                <span class="csd-sub">商品毛重,非 uranium 含量,不能直接 /1000 当 tU</span>
              </td>
            </tr>
            <tr>
              <td>浓缩相关进口(HS284420)</td>
              <td><b>{{ fmtKg(balance.components.enrichment_related_import.value_kg_product) }} kg</b>
                <span class="csd-badge bad">NON-COMPARABLE</span>
                <span class="csd-sub">缺 assay,无法转天然铀当量</span>
              </td>
            </tr>
            <tr><td>库存变化</td><td><span class="csd-badge bad">MISSING</span></td></tr>
            <tr><td>二次供应</td><td><span class="csd-badge bad">MISSING</span></td></tr>
            <tr>
              <td>2024 需求</td>
              <td><span class="csd-badge bad">MISSING</span>
                <span class="csd-sub">2025 投影 12,300 tU 可用(非 2024)</span>
              </td>
            </tr>
            <tr><td>物理总供应份额</td><td><b class="csd-err">NOT READY</b>
              <span class="csd-sub">跨商品不兼容 + 需求/库存/二次供应缺失</span>
            </td></tr>
          </table>
          <div class="csd-missing" v-if="balance.readiness">
            <strong>最小缺口(不能算 100% 的原因)</strong>
            <p v-for="m in balance.readiness.missing_components" :key="m">· {{ m }}</p>
          </div>
        </section>

        <!-- D. 数据源 -->
        <section class="csd-sec" v-if="sources.length">
          <h4>D · 数据源</h4>
          <ul class="csd-sources">
            <li v-for="s in sources" :key="s">
              <a v-if="s.startsWith('http')" :href="s" target="_blank" rel="noopener">{{ s }}</a>
              <span v-else>{{ s }}</span>
            </li>
          </ul>
        </section>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getChinaCurrentSituation, getChinaSupplySummary, getChinaTradeStructure, getChinaSupplyShareSemantics, getChinaPhysicalSupplyBalance, getChinaSourceAllocation } from '@/api/powerGame/uraniumKnowledge'

const COUNTRY_NAMES = {
  KAZ: '哈萨克斯坦', NAM: '纳米比亚', UZB: '乌兹别克斯坦', RUS: '俄罗斯',
  NLD: '荷兰', GBR: '英国', FRA: '法国', USA: '美国', AUT: '奥地利',
  NER: '尼日尔', CZE: '捷克', CAN: '加拿大', AUS: '澳大利亚', CHN: '中国',
}
const STAGE_NAMES = { NATURAL_URANIUM: '天然铀', ENRICHMENT_RELATED: '浓缩相关', ORE_CONCENTRATE: '矿石/精矿' }
const STAGE_TITLES = {
  ore_concentrate: '矿石/精矿来源 · HS261210',
  natural_uranium: '天然铀来源 · HS284410',
  enrichment_related: '浓缩相关来源 · HS284420',
}

const situation = ref({})
const semantics = ref({})
const domestic = ref(null)
const detailLoading = ref(false)
const detailsOpen = ref(false)
const detailYear = ref(2024)
const trade = ref(null)
const balance = ref(null)
const allocation = ref(null)

onMounted(async () => {
  try {
    const r = await getChinaCurrentSituation()
    situation.value = r.data || {}
    detailYear.value = situation.value.year || 2024
  } catch (e) { /* 保持空 */ }
  try {
    const s = await getChinaSupplyShareSemantics()
    semantics.value = (s && s.data) || {}
  } catch (e) { /* 语义层不可用时降级 */ }
  try {
    const b = await getChinaPhysicalSupplyBalance()
    balance.value = (b && b.data) || null
  } catch (e) { balance.value = null }
  try {
    const a = await getChinaSourceAllocation()
    allocation.value = (a && a.data) || null
  } catch (e) { allocation.value = null }
})

const selfReliance = computed(() => situation.value.self_reliance || {})
const selfValue = computed(() => {
  const v = selfReliance.value.value
  return v != null ? v.toFixed(1) : '待核验'
})

const topCountries = computed(() => (situation.value.main_ui && situation.value.main_ui.top) || [])
const otherShare = computed(() => (situation.value.main_ui && situation.value.main_ui.other_share_percent != null
  ? situation.value.main_ui.other_share_percent : null))
const otherCountries = computed(() => (situation.value.main_ui && situation.value.main_ui.other_countries) || [])

// K2-SUPPLY-SHARE-1:按商品分开的进口结构(顶部条,§11/§29)
const naturalUGroup = computed(() => {
  const s = semantics.value.natural_uranium_import_structure
  return (s && s.countries) ? s.countries.filter(c => (c.share_percent || 0) > 0) : []
})
const enrichmentGroup = computed(() => {
  const s = semantics.value.enrichment_related_import_structure
  return (s && s.countries) ? s.countries.filter(c => (c.share_percent || 0) > 0) : []
})

// K2-SUPPLY-SHARE-3F-R:8 来源(自主 + 7 海外路线),display 干净
const allocationComponents = computed(() => {
  const comps = (allocation.value && allocation.value.components) || []
  return comps.map(c => ({ id: c.id, country: c.country, source_type: c.source_type,
    display_share_percent: c.display_share_percent, allocation_basis: c.allocation_basis }))
})
function allocationTip(c) {
  return `${c.country} ${c.display_share_percent}%
来源:${c.allocation_basis}(详细见供应来源详情)`
}
function commodityTip(commodity, c) {
  return `${commodity} 2024\n${c.country_id} 占中国申报进口(世界伙伴合计) ${c.share_percent != null ? c.share_percent.toFixed(1) + '%' : '—'}\n非"中国总铀供应份额"(§35)`
}

const stageWeights = computed(() => (situation.value.weights && situation.value.weights.stage_weights) || {})
const weightStatus = computed(() => (situation.value.weights && situation.value.weights.weight_status) || '')
const methodVersion = computed(() => (situation.value.weights && situation.value.weights.methodology_version) || '')
const excludedStages = computed(() => situation.value.excluded_stages || [])
const exclusionReason = computed(() => situation.value.exclusion_reason || '')
const sources = computed(() => situation.value.source_refs || [])

const selfTip = computed(() => {
  const s = selfReliance.value
  return `国内一次铀产量覆盖率 · ${situation.value.year}\n不含库存/二次供应/海外权益铀\n${s.methodology_id || ''}`
})

function countryTip(c) {
  const comps = c.stage_components || {}
  const lines = Object.entries(comps).map(([k, v]) => `  ${STAGE_NAMES[k] || k} ${v.share_percent != null ? v.share_percent.toFixed(1) + '%' : '—'}%`)
  return `当前供应贡献指数 ${c.share_percent.toFixed(1)}% · ${situation.value.year}\nComposite method: stage-weighted\n主要贡献:\n${lines.join('\n')}`
}

const otherTip = computed(() => `其他合计(剩余国家):\n${otherCountries.value.map(countryName).join('、') || '—'}\n含历史伙伴(如 UZB 2022)见详情`)

function openDetails() {
  detailsOpen.value = true
  loadDetails()
}

async function loadDetails() {
  detailLoading.value = true
  try {
    if (!domestic.value) {
      const r = await getChinaSupplySummary()
      domestic.value = r.data || {}
    }
    await loadTrade(detailYear.value)
  } finally {
    detailLoading.value = false
  }
}

async function loadTrade(y) {
  try {
    const r = await getChinaTradeStructure(y)
    trade.value = r.data || {}
    detailYear.value = trade.value.year || y
  } catch (e) { /* 保持 */ }
}

function switchDetailYear(y) {
  detailYear.value = y
  loadTrade(y)
}

const tradeYears = computed(() => (trade.value && trade.value.years_available) || [2022, 2023, 2024])

const verifiedHistory = computed(() => (domestic.value && domestic.value.domestic && domestic.value.domestic.history) || [])
const domesticLatest = computed(() => (domestic.value && domestic.value.domestic && domestic.value.domestic.latest) || null)

const stageGroups = computed(() => {
  const t = trade.value
  if (!t || !t.stages) return []
  const keys = ['ore_concentrate', 'natural_uranium', 'enrichment_related']
  return keys.map(k => {
    const st = t.stages[k]
    if (!st) return null
    const worldQty = st.world_quantity != null ? st.world_quantity : st.observed_total_quantity
    return {
      title: STAGE_TITLES[k],
      stage: st.commodity_stage,
      worldLabel: `World ${st.country_total_share_ready ? fmtKg(worldQty) + ' kg' : '聚合缺失 · Observed'}`,
      partners: st.partners || [],
      mirror: st.mirror || [],
    }
  }).filter(Boolean)
})

function countryName(id) { return COUNTRY_NAMES[id] || id }
function stageName(s) { return STAGE_NAMES[s] || s }
function fmtNum(v) { return v == null ? '—' : Number(v).toLocaleString('en-US') }
function fmtKg(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}
function fmtShare(v) {
  if (v == null) return '—'
  v = Number(v)  // display_share_percent 可能为字符串(凑整后)
  // 小值(<0.1%)保留 2 位,避免 0.02 被 toFixed(1) 显示成误导性的 0.0%
  if (v > 0 && v < 0.1) return v.toFixed(2) + '%'
  return v.toFixed(1) + '%'
}

function statusClass(s) {
  if (s === 'VERIFIED' || s === 'PRESENT') return 'ok'
  if (s === 'TRACE') return 'warn'
  if (s === 'MIRROR_REPORTED') return 'mir'
  return 'muted'
}
function statusText(s) {
  if (s === 'VERIFIED' || s === 'PRESENT') return 'VERIFIED'
  if (s === 'TRACE') return 'TRACE'
  if (s === 'MIRROR_REPORTED') return 'MIRROR'
  if (s === 'NOT_REPORTED_IN_CURRENT_QUERY') return 'NOT REPORTED'
  if (s === 'REPORTED_ZERO') return 'ZERO'
  return s || '—'
}
</script>

<style scoped>
.csbar-wrap {
  margin: 0 0 10px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #0f172a;
}
.csbar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 8px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.26);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07);
  backdrop-filter: blur(12px);
  overflow-x: auto;
  white-space: nowrap;
}
.cs-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: #eef2ff;
  color: #1e3a8a;
  flex: 0 0 auto;
  cursor: default;
}
.cs-chip b { font-weight: 850; }
.cs-chip.self { background: #ecfdf5; color: #065f46; }
.cs-chip.c-KAZ { background: #dbeafe; color: #1e40af; }
.cs-chip.c-RUS { background: #ede9fe; color: #5b21b6; }
.cs-chip.c-NAM { background: #ffedd5; color: #9a3412; }
.cs-chip.c-NLD { background: #e0f2fe; color: #075985; }
.cs-chip.c-other, .cs-chip.other { background: #f1f5f9; color: #475569; }

/* K2-SUPPLY-SHARE-1:商品分组 + 分隔 */
.cs-bar-sep { width: 1px; align-self: stretch; background: #e2e8f0; margin: 0 4px; }
.cs-commodity-group { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto; }
.cs-group-label { font-size: 10.5px; color: #64748b; font-weight: 700; white-space: nowrap; }
.cs-chip.mini { padding: 3px 8px; font-size: 11px; background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; }
.cs-chip-label { font-size: 10.5px; font-weight: 800; color: #64748b; }
.est {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
  font-size: 9px;
  font-style: normal;
  font-weight: 850;
  letter-spacing: 0.05em;
}

.csbar-title { font-size: 12px; font-weight: 800; color: #334155; white-space: nowrap; display: inline-flex; align-items: center; gap: 3px; }
.csbar-info { font-size: 10px; color: #94a3b8; cursor: help; }
.cs-chip.src { padding: 4px 10px; font-size: 11.5px; }
.cs-chip.src.self { background: #ecfdf5; color: #065f46; }
.cs-chip.src.foreign { background: #eef2ff; color: #1e3a8a; }

.csbar-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex: 0 0 auto;
}
.cs-year { font-size: 12px; font-weight: 800; color: #334155; }
.cs-detail-btn {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
}
.cs-detail-btn:hover { background: #1d4ed8; }

/* drawer */
.csd-body { font-size: 12.5px; }
.csd-sec { margin-bottom: 18px; }
.csd-sec h4 { margin: 0 0 8px; font-size: 13px; font-weight: 850; }
.csd-sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.csd-years { display: flex; gap: 4px; }
.csd-years button {
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.csd-years button.active { background: #2563eb; border-color: #2563eb; color: #fff; }
.csd-self-row { display: flex; align-items: center; gap: 10px; }
.csd-self-val { font-size: 30px; line-height: 1.1; color: #2563eb; }
.csd-conf { color: #64748b; font-size: 11.5px; }
.csd-note { margin: 6px 0; color: #64748b; }
.csd-mini { width: 100%; border-collapse: collapse; }
.csd-mini td { padding: 4px 6px; border-bottom: 1px solid rgba(148, 163, 184, 0.14); }
.csd-mini td:first-child { color: #64748b; width: 46%; }
.csd-hist { margin-top: 8px; padding: 8px 10px; border-radius: 10px; background: rgba(59, 130, 246, 0.06); border: 1px solid rgba(59, 130, 246, 0.16); }
.csd-hist strong { font-size: 11.5px; color: #1e40af; }
.csd-hist-row { margin: 5px 0 0; }
.csd-hist-note { margin: 6px 0 0; color: #64748b; font-size: 11px; }
.csd-stage { margin-bottom: 14px; }
.csd-stage-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.csd-stage-title { font-weight: 800; font-size: 12.5px; }
.csd-stage-world { color: #64748b; font-size: 11px; }
.csd-table { width: 100%; border-collapse: collapse; }
.csd-table th { text-align: left; color: #64748b; font-size: 11px; font-weight: 700; padding: 4px 6px; border-bottom: 1px solid rgba(148, 163, 184, 0.3); }
.csd-table td { padding: 4px 6px; border-bottom: 1px solid rgba(148, 163, 184, 0.14); white-space: nowrap; }
.csd-country { font-weight: 700; }
.csd-badge { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 10px; font-weight: 800; }
.csd-badge.ok { color: #15803d; background: rgba(22, 163, 74, 0.12); }
.csd-badge.warn { color: #b45309; background: rgba(245, 158, 11, 0.14); }
.csd-badge.mir { color: #6d28d9; background: rgba(109, 40, 217, 0.1); }
.csd-badge.muted { color: #64748b; background: rgba(100, 116, 139, 0.12); }
.csd-src { color: #2563eb; font-size: 11px; text-decoration: none; }
.csd-src.muted { color: #94a3b8; }
.csd-mirror { margin-top: 6px; padding: 8px 10px; border-radius: 10px; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.18); }
.csd-mirror strong { font-size: 11.5px; color: #b91c1c; }

.csd-badge.bad { background: #fef2f2; color: #b91c1c; }
.csd-sub { display: block; font-size: 10.5px; color: #94a3b8; margin-top: 2px; }
.csd-err { color: #b91c1c; font-weight: 800; }
.csd-missing { margin-top: 8px; padding: 8px; background: #fef2f2; border-radius: 6px; font-size: 11.5px; }
.csd-missing strong { color: #b91c1c; }
.csd-missing p { margin: 2px 0 0; color: #7f1d1d; }

.csd-mirror-line { margin: 5px 0 0; font-size: 12px; }
.csd-sources { margin: 0; padding-left: 18px; color: #475569; word-break: break-all; }
.csd-sources a { color: #2563eb; }
</style>
