<template>
  <section class="djp">
    <header class="djp-head">
      <h3 class="djp-title">领域模型研判结果</h3>
      <span class="djp-source">{{ meta.sourceLabel }}</span>
      <span v-if="modelVersion" class="djp-model">{{ modelVersion }}</span>
    </header>

    <p class="djp-method">{{ meta.method }}</p>

    <article class="djp-card djp-card--conclusion">
      <div class="djp-card-label">领域模型最终研判结论</div>
      <p class="djp-conclusion">{{ domainConclusion }}</p>
      <p class="djp-card-note">根据本次快照中的路线风险计算结果整理；展示分为快照内校准值。</p>
    </article>

    <!-- 模型版本与运行状态 -->
    <article class="djp-card">
      <div class="djp-card-label">模型版本与运行状态</div>
      <div class="djp-kpis">
        <div><b>{{ routes.length }}</b><span>路线</span></div>
        <div><b>{{ nodes.length }}</b><span>节点</span></div>
        <div><b>{{ edges.length }}</b><span>运输边</span></div>
        <div><b :class="chain.failed_models ? 'is-bad' : 'is-ok'">{{ chain.total_models ?? '—' }}</b><span>本次执行模型</span></div>
        <div><b>{{ chain.total_duration_ms != null ? chain.total_duration_ms + 'ms' : '—' }}</b><span>模型链总耗时</span></div>
        <div><b>{{ snapshotId ? String(snapshotId).slice(-8) : '—' }}</b><span>快照 ID</span></div>
      </div>
      <p class="djp-card-note">
        生成时间 {{ metrics.generatedAt || '—' }} · 模型版本 {{ modelVersion || '—' }} ·
        成功 {{ chain.successful_models ?? '—' }} / 失败 {{ chain.failed_models ?? 0 }}。
      </p>
    </article>

    <!-- 本次研判到底用了哪些模型:具体到模型名,不用"领域模型"统称代替 -->
    <div class="djp-model-usage">
      <ModelUsagePanel
        :runs="modelRuns"
        :cards="modelCards"
        :cards-loaded="!registryError"
        :chain="chain"
      />
    </div>

    <div class="djp-grid">
      <!-- 路线风险排行榜 -->
      <article class="djp-card">
        <div class="djp-card-label">
          路线风险排行榜
          <span class="djp-card-sub">按展示风险分降序(快照内校准)</span>
        </div>
        <div v-if="!ranking.length" class="djp-none">暂无路线风险结果</div>
        <div v-else class="djp-rows">
          <div v-for="(r, i) in ranking" :key="r.id" class="djp-row">
            <span class="djp-no">{{ i + 1 }}</span>
            <span class="djp-name">{{ r.country }}</span>
            <span class="djp-level" :class="r.level">{{ levelText(r.level) }}</span>
            <span class="djp-score" :title="`原始分 ${r.raw} / 展示分 ${r.display}`">{{ r.display }}</span>
            <span class="djp-sub">原始 {{ r.raw }}</span>
          </div>
        </div>
      </article>

      <!-- 节点风险排名 -->
      <article class="djp-card">
        <div class="djp-card-label">
          节点风险排名
          <span class="djp-card-sub">综合风险 = 脆弱性 × 供应后果,含 OSINT 增量</span>
        </div>
        <div v-if="!nodeRanking.length" class="djp-none">暂无节点风险结果</div>
        <div v-else class="djp-rows">
          <div v-for="(n, i) in nodeRanking" :key="n.name" class="djp-row">
            <span class="djp-no">{{ i + 1 }}</span>
            <span class="djp-name">{{ n.name }}</span>
            <span class="djp-level" :class="n.level">{{ levelText(n.level) }}</span>
            <span class="djp-score">{{ n.score }}</span>
            <span class="djp-sub">
              {{ n.route }} · 脆弱 {{ n.vul }} / 后果 {{ n.cons }}
              <template v-if="n.osintDelta > 0"> · OSINT +{{ n.osintDelta }}</template>
            </span>
          </div>
        </div>
      </article>
    </div>

    <div class="djp-grid">
      <!-- 关键节点分析 -->
      <article class="djp-card">
        <div class="djp-card-label">
          关键节点分析
          <span class="djp-card-sub">网络结构重要度,与"节点风险"不是同一回事</span>
        </div>
        <div v-if="!criticalNodes.length" class="djp-none">暂无网络关键节点结果</div>
        <div v-else class="djp-rows">
          <div v-for="(n, i) in criticalNodes" :key="n.name" class="djp-row">
            <span class="djp-no">{{ i + 1 }}</span>
            <span class="djp-name">{{ n.name }}</span>
            <span class="djp-sub-inline">{{ n.type || '—' }}</span>
            <span class="djp-score">{{ n.score }}</span>
          </div>
        </div>
        <p class="djp-card-note">
          关键节点 = 网络中介中心性等结构指标;节点风险 = 该节点的综合风险。两者不可互相替代。
        </p>
      </article>

      <!-- 风险构成分解 -->
      <article class="djp-card">
        <div class="djp-card-label">
          风险构成分解
          <span class="djp-card-sub">以最高风险路线 {{ topRoute ? topRoute.country : '—' }} 为例</span>
        </div>
        <div v-if="!breakdown.length" class="djp-none">暂无风险构成分解结果</div>
        <div v-else class="djp-bd">
          <div v-for="item in breakdown" :key="item.key" class="djp-bd-item">
            <span class="djp-bd-label">{{ item.label }}</span>
            <div class="djp-bd-bar"><i :style="{ width: Math.min(100, item.value) + '%' }"></i></div>
            <b>{{ item.value }}</b>
          </div>
        </div>
      </article>
    </div>

    <!-- 风险传播路径 -->
    <article class="djp-card">
      <div class="djp-card-label">
        风险传播路径
        <span class="djp-card-sub">事件命中节点 → 沿运输边传导 → 聚合为路线风险</span>
      </div>
      <div v-if="!propagation.length" class="djp-none">暂无可展示的风险传播路径</div>
      <div v-else class="djp-prop">
        <div v-for="p in propagation" :key="p.routeId + p.name" class="djp-prop-row">
          <span class="djp-level" :class="p.level">{{ levelText(p.level) }}</span>
          <span class="djp-prop-route">{{ p.route }}</span>
          <span class="djp-prop-name">{{ p.name }}</span>
          <span class="djp-prop-type">{{ p.type }}</span>
          <span class="djp-prop-score">{{ p.score }}</span>
        </div>
      </div>
      <p class="djp-card-note">
        节点风险经边传导后按路线聚合;下方分数为模型输出，非实测概率。
      </p>
    </article>

    <!-- 风险解释入口(数据说明) -->
    <article class="djp-card">
      <div class="djp-card-label">模型计算参数</div>
      <div class="djp-params">
        <div><span>校准方式</span><b>{{ provenance.calibration_method || 'Snapshot Min-Max(route_minmax_25_85)' }}</b></div>
        <div><span>路线网络口径</span><b>{{ provenance.route_network_basis || '—' }}</b></div>
        <div><span>贸易数据年份</span><b>{{ provenance.trade_data_year || '—' }}</b></div>
        <div><span>供应贡献口径</span><b>{{ provenance.supply_metric_basis || '—' }}</b></div>
        <div><span>物理运力</span><b>{{ provenance.physical_edge_capacity || '—' }}</b></div>
        <div><span>OSINT 模式</span><b>{{ osintInfo.osint_mode || '—' }} · 计入风险 {{ osintInfo.risk_effective_count ?? '—' }} / 登记 {{ osintInfo.registered_total ?? '—' }}</b></div>
      </div>
      <p class="djp-card-note">
        风险为 MODEL-DERIVED + PARTIAL REAL INPUT，非实测现实风险；展示分为快照内相对校准值。
      </p>
    </article>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { JUDGMENT_MODE_META } from '@/constants/judgmentModes'
import ModelUsagePanel from './ModelUsagePanel.vue'
import { useModelRegistry } from './useModelRegistry'

const props = defineProps({
  /** 领域模型路线(来自快照,原样传入,任何视角都不做替换) */
  routes: { type: Array, default: () => [] },
  nodes: { type: Array, default: () => [] },
  criticalNodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
  metrics: { type: Object, default: () => ({}) },
  /** 本次任务的模型执行记录(execution_trace / meta.model_runs) */
  modelRuns: { type: Array, default: () => [] },
})

const { cards: modelCards, error: registryError, ensureLoaded } = useModelRegistry()
onMounted(() => ensureLoaded())


const meta = JUDGMENT_MODE_META.domain

const metrics = computed(() => props.metrics || {})
const provenance = computed(() => metrics.value.dataProvenance || {})
const osintInfo = computed(() => metrics.value.osintInfo || {})
const chain = computed(() => metrics.value.modelChain || {})
const modelVersion = computed(() => metrics.value.modelVersion || '')
const snapshotId = computed(() => metrics.value.snapshotId || '')

const ranking = computed(() =>
  [...props.routes]
    .map((r) => ({
      id: r.id,
      country: r.country,
      level: r.riskLevel || r.risk_level || 'low',
      display: Number(r.display_risk_score ?? r.risk_score ?? 0).toFixed(1),
      raw: Number(r.raw_risk_score ?? r.risk_score ?? 0).toFixed(1),
    }))
    .sort((a, b) => Number(b.display) - Number(a.display)),
)

const topRoute = computed(() => props.routes.find((r) => r.id === ranking.value[0]?.id) || null)
const domainConclusion = computed(() => {
  if (!ranking.value.length) return '暂无领域模型研判结果。'
  const top = ranking.value[0]
  const high = ranking.value.filter((r) => r.level === 'high').length
  const medium = ranking.value.filter((r) => r.level === 'medium').length
  const low = ranking.value.filter((r) => r.level === 'low').length
  return `本次领域模型对 ${ranking.value.length} 条供应路线完成风险计算，其中高风险 ${high} 条、中风险 ${medium} 条、低风险 ${low} 条。${top.country}路线的展示风险分最高，为 ${top.display}/100，原始风险分为 ${top.raw}/100，等级为${levelText(top.level)}。该判断来自节点风险、运输边风险和路线聚合的计算结果；展示分不等于实际中断概率。`
})

const nodeRanking = computed(() =>
  [...props.nodes]
    .map((n) => ({
      name: n.name,
      route: n.route || '',
      level: n.risk_level || n.risk || 'low',
      score: Number(n.combined_risk_score ?? n.risk_score ?? 0).toFixed(1),
      vul: Number(n.vulnerability_score ?? 0).toFixed(1),
      cons: Number(n.consequence_score ?? 0).toFixed(1),
      osintDelta: Number(n.osint_risk_delta ?? 0),
    }))
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 10),
)

const criticalNodes = computed(() =>
  [...props.criticalNodes]
    .map((n) => ({ name: n.name, type: n.type || '', score: Number(n.criticality_score ?? 0).toFixed(1) }))
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 10),
)

const BREAKDOWN_LABELS = {
  avg_node_edge_risk: '节点/边风险',
  max_bottleneck_risk: '网络关键性',
  route_share_risk: '供应依赖',
  critical_node_risk: '关键节点',
  event_route_risk: '事件影响',
  endpoint_risk: '端点风险',
  transport_mode_risk: '运输方式',
  route_context_risk: '路线上下文',
  event_impact_risk: '事件影响',
  distance_or_cycle_risk: '距离/周期',
}

const breakdown = computed(() => {
  const obj = (topRoute.value && topRoute.value.risk_breakdown) || {}
  return Object.entries(obj).map(([key, value]) => ({
    key,
    label: BREAKDOWN_LABELS[key] || key,
    value,
  }))
})

const propagation = computed(() =>
  props.routes.flatMap((r) =>
    (r.key_risk_points || []).map((p) => ({
      routeId: r.id,
      route: r.country,
      name: p.name,
      type: p.type || '',
      level: p.risk_level || 'low',
      score: Number(p.risk_score ?? 0).toFixed(1),
    })),
  ).slice(0, 14),
)

function levelText(level) {
  return { high: '高风险', medium: '中风险', low: '低风险' }[level] || '—'
}
</script>

<style scoped>
.djp {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
  padding: 1rem 1.2rem 1.2rem; margin-bottom: 1rem;
}
.djp-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.djp-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; }
.djp-source {
  font-size: 11.5px; font-weight: 600; color: #1d4ed8;
  background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.24);
  border-radius: 999px; padding: 2px 10px;
}
.djp-model { font-size: 11px; color: #94a3b8; }
.djp-method { margin: 6px 0 14px; font-size: 12px; color: #64748b; }

.djp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.djp-model-usage { margin-bottom: 12px; }
.djp-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; }
.djp-card--conclusion { border-color: #bfdbfe; background: #eff6ff; }
.djp-conclusion { margin: 9px 0; color: #0f172a; line-height: 1.8; font-size: 13.5px; }
.djp-grid .djp-card { margin-bottom: 0; }
.djp-card-label {
  font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px;
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
}
.djp-card-sub { font-size: 11px; font-weight: 400; color: #94a3b8; }
.djp-card-note { margin: 8px 0 0; font-size: 11px; color: #94a3b8; line-height: 1.6; }
.djp-none { font-size: 12px; color: #94a3b8; }

.djp-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(104px, 1fr)); gap: 10px; }
.djp-kpis > div { display: flex; flex-direction: column; gap: 2px; }
.djp-kpis b { font-size: 18px; color: #1e293b; line-height: 1.2; }
.djp-kpis b.is-bad { color: #b91c1c; }
.djp-kpis b.is-ok { color: #15803d; }
.djp-kpis span { font-size: 11px; color: #64748b; }

.djp-rows { display: flex; flex-direction: column; }
.djp-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px;
}
.djp-row:last-child { border-bottom: none; }
.djp-no { width: 18px; color: #94a3b8; font-size: 11px; font-variant-numeric: tabular-nums; }
.djp-name { font-weight: 600; color: #1e293b; }
.djp-score { margin-left: auto; font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
.djp-sub { flex: 1 1 100%; font-size: 11px; color: #94a3b8; padding-left: 26px; }
.djp-sub-inline { font-size: 11px; color: #94a3b8; }

.djp-level { font-size: 11px; font-weight: 700; border-radius: 999px; padding: 1px 8px; flex-shrink: 0; }
.djp-level.high { color: #b91c1c; background: rgba(220, 38, 38, 0.1); }
.djp-level.medium { color: #b45309; background: rgba(245, 158, 11, 0.14); }
.djp-level.low { color: #15803d; background: rgba(22, 163, 74, 0.12); }

.djp-bd { display: flex; flex-direction: column; gap: 7px; }
.djp-bd-item { display: flex; align-items: center; gap: 8px; font-size: 11.5px; }
.djp-bd-label { width: 86px; color: #475569; flex-shrink: 0; }
.djp-bd-bar { flex: 1; height: 6px; border-radius: 999px; background: #f1f5f9; overflow: hidden; }
.djp-bd-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #60a5fa, #2563eb); }
.djp-bd-item b { width: 42px; text-align: right; color: #1e293b; font-variant-numeric: tabular-nums; }

.djp-prop { display: flex; flex-direction: column; gap: 4px; max-height: 300px; overflow-y: auto; }
.djp-prop-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 4px 0; }
.djp-prop-route { color: #475569; width: 96px; flex-shrink: 0; }
.djp-prop-name { font-weight: 600; color: #1e293b; }
.djp-prop-type { font-size: 11px; color: #94a3b8; }
.djp-prop-score { margin-left: auto; font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }

.djp-params { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; }
.djp-params > div { display: flex; justify-content: space-between; gap: 10px; font-size: 11.5px; border-bottom: 1px solid #f1f5f9; padding: 4px 0; }
.djp-params span { color: #64748b; }
.djp-params b { color: #1e293b; font-weight: 600; text-align: right; }

@media (max-width: 1200px) {
  .djp-grid, .djp-params { grid-template-columns: 1fr; }
}
</style>
