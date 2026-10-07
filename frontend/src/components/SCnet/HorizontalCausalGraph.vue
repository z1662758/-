<template>
  <div class="hcg">
    <div v-if="!active" class="hcg__empty">
      暂无可展示的因果路径：请先在上方选择策略 A 与策略 B。
    </div>

    <template v-else>
      <!-- 工具条：数据口径徽标 + A/B 侧切换 -->
      <header class="hcg__bar">
        <div class="hcg__bar-main">
          <span class="hcg__title">因果路径分解</span>
          <span class="hcg__badge" :class="active.available ? 'is-measured' : 'is-skeleton'">
            {{ active.available ? '实测路径系数' : '结构示意' }}
          </span>
          <span v-if="!active.available" class="hcg__demo">示例数据</span>
        </div>
        <div class="hcg__switch" role="tablist">
          <button
            v-for="side in sides" :key="side.key" type="button" role="tab"
            class="hcg__switch-btn" :class="{ 'is-active': side.key === activeKey }"
            :style="{ '--c': side.color }"
            :aria-selected="side.key === activeKey"
            @click="activeKey = side.key"
          >
            <b>{{ side.tag }}</b><span>{{ side.name }}</span>
          </button>
        </div>
      </header>

      <div class="hcg__meta">
        <span class="hcg__meta-item">观测单位 <b>{{ active.n === null || active.n === undefined ? '--' : active.n + ' 个月' }}</b></span>
        <span class="hcg__meta-item">模型 <b>{{ modelLabel }}</b></span>
        <span class="hcg__meta-item">结果变量 R² <b>{{ active.r2 === null || active.r2 === undefined ? '--' : Number(active.r2).toFixed(3) }}</b></span>
        <span v-if="active.reason" class="hcg__meta-note">{{ active.reason }}</span>
      </div>

      <div class="hcg__body">
        <!-- 左：横向因果路径 -->
        <div class="hcg__graph">
          <div class="hcg__cols">
            <article v-for="col in chain" :key="col.id" class="hcg__col">
              <div class="hcg__node" :class="'is-' + col.tone">
                <span class="hcg__node-role">{{ col.role }}</span>
                <span class="hcg__node-label">{{ col.label }}</span>
                <span class="hcg__node-metric">{{ col.metric }}</span>
                <span class="hcg__node-foot" :class="{ 'is-muted': col.muted }">{{ col.foot }}</span>
              </div>
              <div v-if="col.edge" class="hcg__edge" :class="{ 'is-insig': col.edge.sig === false || col.edge.muted, 'is-demo': col.edge.demo }">
                <span class="hcg__edge-head">
                  <span class="hcg__edge-name">{{ col.edge.name }}</span>
                  <span class="hcg__edge-beta">{{ col.edge.text }}</span>
                </span>
                <span class="hcg__edge-rail">
                  <span class="hcg__edge-line" :style="{ height: col.edge.width + 'px' }"></span>
                  <svg class="hcg__edge-arrow" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M0 0 L10 5 L0 10 Z" fill="currentColor" />
                  </svg>
                </span>
                <span class="hcg__edge-sub">{{ col.edge.sub }}</span>
              </div>
            </article>
          </div>

          <div class="hcg__direct" :class="{ 'is-insig': directRow.sig === false, 'is-demo': directRow.demo }">
            <span class="hcg__direct-name">直接路径</span>
            <span class="hcg__direct-rail">
              <span class="hcg__direct-line"></span>
              <span class="hcg__direct-dot"></span>
              <span class="hcg__direct-line"></span>
            </span>
            <span class="hcg__direct-value">{{ directRow.text }}</span>
            <span class="hcg__direct-sub">{{ directRow.sub }}</span>
          </div>
        </div>

        <!-- 右：效应分解 + A/B 系数对比 -->
        <aside class="hcg__aside">
          <p class="hcg__aside-title">效应分解</p>
          <article v-for="item in effects" :key="item.key" class="hcg__effect" :class="{ 'is-muted': item.muted }">
            <span class="hcg__effect-name">{{ item.name }}</span>
            <b class="hcg__effect-value">{{ item.value }}</b>
            <span class="hcg__effect-sub">{{ item.sub }}</span>
          </article>

          <p class="hcg__aside-title">A / B 路径系数对比</p>
          <table class="hcg__cmp">
            <thead>
              <tr>
                <th>路径</th>
                <th v-for="side in sides" :key="side.key" :style="{ color: side.color }">{{ side.tag }} · {{ shortName(side.name) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in compareRows" :key="row.key">
                <td>{{ row.name }}</td>
                <td v-for="(cell, i) in row.cells" :key="i" :class="{ 'is-muted': cell.muted }">{{ cell.text }}</td>
              </tr>
            </tbody>
          </table>
        </aside>
      </div>

      <div v-if="share" class="hcg__share">
        <span class="hcg__share-title">中介效应占比</span>
        <span class="hcg__share-bar">
          <span class="hcg__share-fill" :style="{ width: share.indirectPct + '%' }"></span>
        </span>
        <span class="hcg__share-legend">
          间接 a×b <b>{{ share.indirectPct }}%</b> ／ 直接 c′ <b>{{ 100 - share.indirectPct }}%</b>
        </span>
      </div>

      <div v-if="conclusion" class="hcg__conclusion">
        <el-icon><Promotion /></el-icon>
        <p>{{ conclusion }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Promotion } from '@element-plus/icons-vue'

const props = defineProps({
  // 每个策略一侧：{ key, tag, name, color, available, mediation, reason, n, r2, a, b, direct, total, path, indirect }
  sides: { type: Array, default: () => [] },
  // 后端未返回结构方程估计时的示例系数（与页面「结构方程模型 · SEM」同一份口径）
  fallback: { type: Object, default: () => ({ a: 0.42, b: 0.51, cPrime: 0.18 }) },
  conclusion: { type: String, default: '' }
})

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null)
const fmtBeta = (v) => { const n = num(v); return n === null ? '--' : (n >= 0 ? '+' : '') + n.toFixed(2) }
const fmtNum3 = (v) => { const n = num(v); return n === null ? '--' : n.toFixed(3) }
const fmtP = (v) => { const n = num(v); if (n === null) return '--'; return n < 0.001 ? '<0.001' : n.toFixed(3) }
const star = (v) => {
  const n = num(v)
  if (n === null) return ''
  if (n < 0.001) return '***'
  if (n < 0.01) return '**'
  if (n < 0.05) return '*'
  return ''
}
const isSig = (v) => { const n = num(v); return n !== null && n < 0.05 }
// 线宽随 |β| 走：把系数大小直接画进图里，不额外引入数值
const edgeWidth = (beta) => 2 + 3 * Math.min(1, Math.abs(num(beta) || 0))
const demoA = () => num(props.fallback?.a) ?? 0.42
const demoB = () => num(props.fallback?.b) ?? 0.51
const demoC = () => num(props.fallback?.cPrime) ?? 0.18

const activeKey = ref('')
watch(() => props.sides, (list) => {
  if (!list || !list.length) { activeKey.value = ''; return }
  if (!list.some((side) => side.key === activeKey.value)) activeKey.value = list[0].key
}, { immediate: true })

const sides = computed(() => props.sides || [])
const active = computed(() => sides.value.find((side) => side.key === activeKey.value) || sides.value[0] || null)
const shortName = (name) => {
  const text = String(name || '')
  return text.length > 12 ? text.slice(0, 11) + '…' : text
}

const modelLabel = computed(() => {
  if (!active.value) return '--'
  if (!active.value.available) return '未估计'
  return active.value.mediation ? '中介路径（月度标准化 OLS）' : '单路径（中介段降级）'
})

// 当前侧系数：实测取后端估计；可用但中介段降级时只保留总效应；完全缺失时才退回示例系数
const coef = computed(() => {
  const side = active.value
  if (!side || !side.available) {
    return { demo: true, measured: false, degraded: false, a: demoA(), b: demoB(), cPrime: demoC(), aStat: null, bStat: null, cStat: null }
  }
  if (!side.mediation) {
    const stat = side.total || side.path || null
    return { demo: false, measured: true, degraded: true, a: null, b: null, cPrime: num(stat?.beta), aStat: null, bStat: null, cStat: stat }
  }
  return {
    demo: false, measured: true, degraded: false,
    a: num(side.a?.beta), b: num(side.b?.beta), cPrime: num(side.direct?.beta),
    aStat: side.a || null, bStat: side.b || null, cStat: side.direct || null
  }
})

const chain = computed(() => {
  const side = active.value
  if (!side) return []
  const c = coef.value
  const mediation = Boolean(side.available && side.mediation)
  const edge = (name, beta, stat, fallbackBeta) => {
    if (mediation) {
      return {
        name,
        text: `β = ${fmtBeta(beta)}${star(stat?.p_value)}`,
        sub: `SE ${fmtNum3(stat?.se)} · p ${fmtP(stat?.p_value)} · ${isSig(stat?.p_value) ? '显著' : '不显著'}`,
        sig: isSig(stat?.p_value), demo: false, muted: false, width: edgeWidth(beta)
      }
    }
    if (c.measured && c.degraded) {
      return { name, text: '不可估计', sub: '协作强度月度序列无波动', sig: null, demo: false, muted: true, width: 2 }
    }
    return { name, text: `β = ${fmtBeta(fallbackBeta)}`, sub: '示例系数 · 非实测', sig: null, demo: true, muted: false, width: edgeWidth(fallbackBeta) }
  }
  return [
    {
      id: 'env', tone: 'factor', role: '外生变量', label: '需求压力',
      metric: '月订单量 total_orders（z 标准化）',
      foot: side.available ? '实测输入' : '结构示意', muted: !side.available,
      edge: edge('路径 a', c.a, c.aStat, demoA())
    },
    {
      id: 'med', tone: 'mediator', role: '中介变量', label: '协作强度',
      metric: '月协作次数 collaboration_count',
      foot: mediation ? '可估计' : '不可估计', muted: !mediation,
      edge: edge('路径 b', c.b, c.bStat, demoB())
    },
    {
      id: 'out', tone: 'outcome', role: '结果变量', label: '供应完成率',
      metric: '完工订单 ÷ 订单总量',
      foot: side.r2 === null || side.r2 === undefined ? '—' : `R² = ${Number(side.r2).toFixed(3)}`,
      muted: !side.available,
      edge: null
    }
  ]
})

const directRow = computed(() => {
  const c = coef.value
  if (!active.value) return { text: '--', sub: '', sig: null, demo: false }
  if (c.measured && !c.degraded) {
    return {
      text: `c′ = ${fmtBeta(c.cPrime)}${star(c.cStat?.p_value)}`,
      sub: `已控制协作强度 · p ${fmtP(c.cStat?.p_value)} · ${isSig(c.cStat?.p_value) ? '显著' : '不显著'}`,
      sig: isSig(c.cStat?.p_value), demo: false
    }
  }
  if (c.measured && c.degraded) {
    return {
      text: `c = ${fmtBeta(c.cPrime)}${star(c.cStat?.p_value)}`,
      sub: `仅总效应可估计 · p ${fmtP(c.cStat?.p_value)}`,
      sig: isSig(c.cStat?.p_value), demo: false
    }
  }
  return { text: `c′ = ${fmtBeta(c.cPrime)}`, sub: '示例系数 · 非实测', sig: null, demo: true }
})

const effects = computed(() => {
  const side = active.value
  const c = coef.value
  if (!side) return []
  if (c.measured && !c.degraded) {
    const indirect = side.indirect || null
    const indirectValue = indirect ? num(indirect.indirect_effect) : (num(c.a) || 0) * (num(c.b) || 0)
    const totalValue = num(side.total?.beta) ?? ((num(c.a) || 0) * (num(c.b) || 0) + (num(c.cPrime) || 0))
    return [
      {
        key: 'indirect', name: '间接效应 a×b', value: fmtBeta(indirectValue),
        sub: indirect
          ? `Sobel z = ${fmtNum3(indirect.z)} · p ${fmtP(indirect.p_value)} · ${indirect.significant ? '显著' : '不显著'}`
          : 'Sobel 检验不适用（间接效应方差退化）',
        muted: false
      },
      { key: 'direct', name: '直接效应 c′', value: fmtBeta(c.cPrime), sub: `已控制协作强度 · p ${fmtP(c.cStat?.p_value)}`, muted: false },
      { key: 'total', name: '总效应 c = c′ + a×b', value: fmtBeta(totalValue), sub: '平衡方程组分解', muted: false }
    ]
  }
  if (c.measured && c.degraded) {
    return [{ key: 'total', name: '总效应 c', value: fmtBeta(c.cPrime), sub: side.reason || '中介段不可估计，只保留总效应', muted: false }]
  }
  return [
    { key: 'indirect', name: '间接效应 a×b（示例）', value: fmtBeta((num(c.a) || 0) * (num(c.b) || 0)), sub: '后端未返回估计，仅作结构示意', muted: true },
    { key: 'total', name: '总效应 c（示例）', value: fmtBeta((num(c.a) || 0) * (num(c.b) || 0) + (num(c.cPrime) || 0)), sub: '示例系数 · 非实测', muted: true }
  ]
})

const compareRows = computed(() => {
  const rows = [
    { key: 'a', name: 'a 需求压力 → 协作强度', pick: (side) => side.a },
    { key: 'b', name: 'b 协作强度 → 完成率', pick: (side) => side.b },
    { key: 'c', name: 'c′ 直接效应', pick: (side) => side.direct },
    { key: 'total', name: 'c 总效应', pick: (side) => side.total || side.path }
  ]
  return rows.map((row) => ({
    key: row.key,
    name: row.name,
    cells: sides.value.map((side) => {
      if (!side.available) return { text: '示例', muted: true }
      const stat = row.pick(side)
      const beta = num(stat?.beta)
      if (beta === null) return { text: '--', muted: true }
      const p = stat?.p_value
      const pKnown = p !== null && p !== undefined
      return { text: `${fmtBeta(beta)}${star(p)}`, muted: pKnown && !isSig(p) }
    })
  }))
})

const share = computed(() => {
  const c = coef.value
  if (c.measured && c.degraded) return null
  const indirect = (num(c.a) || 0) * (num(c.b) || 0)
  const total = indirect + (num(c.cPrime) || 0)
  if (!total) return null
  return { indirectPct: Math.max(0, Math.min(100, Math.round((indirect / total) * 100))) }
})
</script>

<style scoped>
.hcg { width: 100%; }
.hcg__empty { padding: 32px 0; text-align: center; font-size: 12.5px; color: #94a3b8; }

.hcg__bar { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.hcg__bar-main { display: flex; align-items: center; gap: 8px; }
.hcg__title { font-size: 13.5px; font-weight: 800; color: #1e293b; }
.hcg__badge {
  padding: 4px 11px; border-radius: 999px; border: 1px solid #bfdbfe;
  background: linear-gradient(180deg, #eff6ff, #dbeafe); color: #1d4ed8;
  font-size: 11.5px; font-weight: 800; white-space: nowrap;
}
.hcg__badge.is-measured { border-color: #a7f3d0; background: linear-gradient(180deg, #ecfdf5, #d1fae5); color: #047857; }
.hcg__demo {
  padding: 4px 11px; border-radius: 999px; border: 1px solid #fcd34d;
  background: linear-gradient(180deg, #fffbeb, #fef3c7); color: #b45309;
  font-size: 11.5px; font-weight: 800; white-space: nowrap;
}

.hcg__switch { display: inline-flex; gap: 6px; padding: 3px; border-radius: 999px; background: #eff6ff; border: 1px solid #dbeafe; }
.hcg__switch-btn {
  display: inline-flex; align-items: center; gap: 6px; max-width: 230px;
  padding: 4px 12px; border: 1px solid transparent; border-radius: 999px;
  background: transparent; color: #475569; font-size: 12px; font-weight: 700; cursor: pointer;
}
.hcg__switch-btn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hcg__switch-btn b { color: var(--c); }
.hcg__switch-btn.is-active { background: #fff; border-color: #dbeafe; color: #0f172a; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); }

.hcg__meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.hcg__meta-item {
  padding: 3px 10px; border-radius: 999px; border: 1px solid #e6ebf2; background: #f8fafc;
  font-size: 11.5px; color: #64748b;
}
.hcg__meta-item b { color: #0f172a; font-weight: 800; }
.hcg__meta-note {
  padding: 3px 10px; border-radius: 999px; border: 1px solid #fcd34d; background: #fffbeb;
  font-size: 11.5px; color: #b45309;
}

.hcg__body { display: grid; grid-template-columns: minmax(0, 1fr) 296px; gap: 14px; margin-top: 12px; }
@media (max-width: 1180px) { .hcg__body { grid-template-columns: minmax(0, 1fr); } }

.hcg__graph {
  padding: 16px 14px; border: 1px solid #e6ebf2; border-radius: 14px;
  background: linear-gradient(180deg, #ffffff, #f8fafc); overflow-x: auto;
}
.hcg__cols { display: flex; align-items: stretch; justify-content: center; min-width: 560px; }
.hcg__col { display: flex; align-items: center; }

.hcg__node {
  display: flex; flex-direction: column; gap: 4px; width: 172px; padding: 12px 13px;
  border-radius: 13px; border: 1.5px solid #93c5fd;
  background: linear-gradient(180deg, #ffffff, #eff6ff);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}
.hcg__node.is-mediator { border-color: #5eead4; background: linear-gradient(180deg, #ffffff, #f0fdfa); }
.hcg__node.is-outcome { border-color: #86efac; background: linear-gradient(180deg, #ffffff, #f0fdf4); }
.hcg__node-role { font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; color: #64748b; }
.hcg__node-label { font-size: 15px; font-weight: 800; color: #1d4ed8; }
.hcg__node.is-mediator .hcg__node-label { color: #0f766e; }
.hcg__node.is-outcome .hcg__node-label { color: #15803d; }
.hcg__node-metric { font-size: 11px; line-height: 1.5; color: #94a3b8; }
.hcg__node-foot { margin-top: 2px; font-size: 11px; font-weight: 800; color: #334155; }
.hcg__node-foot.is-muted { color: #94a3b8; font-weight: 700; }

.hcg__edge { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 136px; padding: 0 6px; color: #0f172a; }
.hcg__edge.is-demo { color: #94a3b8; }
.hcg__edge.is-insig { color: #cbd5e1; }
.hcg__edge-head { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.hcg__edge-name { font-size: 10.5px; font-weight: 800; color: #64748b; letter-spacing: 0.3px; }
.hcg__edge-beta { font-size: 12.5px; font-weight: 800; color: inherit; }
.hcg__edge-rail { display: flex; align-items: center; width: 100%; }
.hcg__edge-line { flex: 1; min-height: 2px; border-radius: 3px; background: currentColor; }
.hcg__edge-arrow { width: 10px; height: 10px; margin-left: -1px; flex: 0 0 auto; }
.hcg__edge.is-insig .hcg__edge-line { background: none; border-top: 2px dashed currentColor; height: 0 !important; }
.hcg__edge-sub { font-size: 10.5px; line-height: 1.5; color: #94a3b8; text-align: center; }

.hcg__direct {
  display: flex; align-items: center; gap: 10px; margin-top: 14px; padding-top: 12px;
  border-top: 1px dashed #e2e8f0; color: #7c3aed;
}
.hcg__direct.is-demo { color: #94a3b8; }
.hcg__direct.is-insig { color: #cbd5e1; }
.hcg__direct-name { font-size: 11.5px; font-weight: 800; color: #64748b; white-space: nowrap; }
.hcg__direct-rail { flex: 1; display: flex; align-items: center; gap: 4px; min-width: 60px; }
.hcg__direct-line { flex: 1; height: 0; border-top: 2px dashed currentColor; }
.hcg__direct-dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.hcg__direct-value { font-size: 12.5px; font-weight: 800; color: #5b21b6; white-space: nowrap; }
.hcg__direct.is-demo .hcg__direct-value, .hcg__direct.is-insig .hcg__direct-value { color: #94a3b8; }
.hcg__direct-sub { font-size: 11px; color: #94a3b8; white-space: nowrap; }

.hcg__aside { display: flex; flex-direction: column; gap: 8px; padding: 14px; border: 1px solid #e6ebf2; border-radius: 14px; background: #ffffff; }
.hcg__aside-title { margin: 0; font-size: 11.5px; font-weight: 800; color: #1e293b; letter-spacing: 0.3px; }
.hcg__effect {
  display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; padding: 9px 11px;
  border: 1px solid #e6ebf2; border-left: 3px solid #7c3aed; border-radius: 10px; background: #faf5ff;
}
.hcg__effect.is-muted { border-left-color: #cbd5e1; background: #f8fafc; }
.hcg__effect-name { font-size: 11.5px; font-weight: 700; color: #475569; }
.hcg__effect-value { font-size: 13.5px; font-weight: 800; color: #0f172a; text-align: right; font-variant-numeric: tabular-nums; }
.hcg__effect-sub { grid-column: 1 / -1; font-size: 10.5px; line-height: 1.5; color: #94a3b8; }

.hcg__cmp { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.hcg__cmp th {
  padding: 5px 6px; text-align: left; font-size: 10.5px; font-weight: 800; color: #64748b;
  border-bottom: 1px solid #e6ebf2; white-space: nowrap;
}
.hcg__cmp td {
  padding: 5px 6px; border-bottom: 1px dashed #eef2f7; color: #0f172a;
  font-weight: 700; font-variant-numeric: tabular-nums;
}
.hcg__cmp td:first-child { color: #475569; font-weight: 600; }
.hcg__cmp td.is-muted { color: #94a3b8; font-weight: 600; }

.hcg__share {
  display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 14px;
  border: 1px solid #e6ebf2; border-radius: 12px; background: #ffffff;
}
.hcg__share-title { font-size: 11.5px; font-weight: 800; color: #1e293b; white-space: nowrap; }
.hcg__share-bar { flex: 1; min-width: 80px; height: 10px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
.hcg__share-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #0d9488, #2dd4bf); transition: width 0.3s ease; }
.hcg__share-legend { font-size: 11.5px; color: #475569; white-space: nowrap; }
.hcg__share-legend b { color: #0f172a; }

.hcg__conclusion {
  display: flex; gap: 8px; align-items: flex-start; margin-top: 10px; padding: 10px 12px;
  border: 1px solid #ddd6fe; border-left: 3px solid #7c3aed; border-radius: 10px; background: #faf5ff;
}
.hcg__conclusion .el-icon { color: #7c3aed; margin-top: 2px; }
.hcg__conclusion p { margin: 0; font-size: 12.5px; line-height: 1.75; color: #4c1d95; }
</style>
