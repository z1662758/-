<template>
  <section id="dual-judgment-result" class="dup">
    <header class="dup-head">
      <h3 class="dup-title">双驱动研判结果</h3>
      <span class="dup-source">{{ meta.sourceLabel }}</span>
    </header>

    <p class="dup-method">
      <b>大模型根据情报与研判问题发起态势模型调用，读取节点、边和路线的实际计算结果，再形成双驱动结论。</b>
    </p>

    <article class="dup-card dup-card--conclusion">
      <div class="dup-card-label">双驱动最终研判结论</div>
      <p v-if="dualAvailable" class="dup-conclusion">{{ dual.conclusion }}</p>
      <p v-else class="dup-none">暂无双驱动研判结果{{ dual?.reason ? '：' + dual.reason : '；本任务没有保存大模型调用态势模型后的结论' }}</p>
      <p v-if="dualAvailable" class="dup-execution">
        实际调用 {{ dual.tool_calls?.length || 0 }} 次态势模型工具 ·
        模型链成功 {{ dual.model_runs?.filter((run) => run.status === 'success').length || 0 }} 步 ·
        引用情报 {{ dual.cited_event_ids?.length || 0 }} 条
      </p>
      <ul v-if="dualAvailable && dual.advantages?.length" class="dup-ol">
        <li v-for="(item, i) in dual.advantages" :key="i">{{ item }}</li>
      </ul>
    </article>

    <!-- 统计卡片 -->
    <div class="dup-stats">
      <div class="dup-stat is-ok">
        <b>{{ dualAvailable ? counts.consistent : '—' }}</b><span>基线一致</span>
      </div>
      <div class="dup-stat is-partial">
        <b>{{ dualAvailable ? counts.partial : '—' }}</b><span>基线部分一致</span>
      </div>
      <div class="dup-stat is-bad">
        <b>{{ dualAvailable ? counts.divergent : '—' }}</b><span>基线存在分歧</span>
      </div>
      <div class="dup-stat is-unknown">
        <b>{{ dualAvailable ? counts.unknown : '—' }}</b><span>无法比对</span>
      </div>
      <div class="dup-stat">
        <b>{{ dualAvailable ? pendingCount : '—' }}</b><span>待核验问题</span>
      </div>
      <div class="dup-stat is-overall">
        <b :class="overallLevel">{{ levelText(overallLevel) }}</b><span>双驱动风险等级</span>
      </div>
      <div class="dup-stat is-fusion" :class="fusionStateClass">
        <b>{{ fusionState.text }}</b><span>双驱动运行状态</span>
      </div>
    </div>

    <!-- 综合研判摘要 -->
    <article class="dup-card dup-card--summary">
      <div class="dup-card-label">综合态势研判</div>
      <div class="dup-summary-grid">
        <div><span>综合风险等级</span><b :class="overallLevel">{{ levelText(overallLevel) }}</b></div>
        <div>
          <span>大模型判断</span>
          <b :class="llmLevel">{{ llmAvailable ? levelText(llmLevel) : '暂无大模型研判结果' }}</b>
        </div>
        <div>
          <span>态势模型评分</span>
          <b>{{ domainTop ? domainTop.score + ' / 100' : '—' }}</b>
        </div>
        <div>
          <span>研判一致性</span>
          <b :class="'agree-' + agreementValue">{{ agreementText(agreementValue) }}</b>
        </div>
        <div class="is-wide">
          <span>主要影响路线</span>
          <b>{{ mainRoutes.length ? mainRoutes.join('、') : '—' }}</b>
        </div>
        <div class="is-wide">
          <span>关键风险节点</span>
          <b>{{ keyNodes.length ? keyNodes.join('、') : '—' }}</b>
        </div>
        <div class="is-wide">
          <span>独立大模型情报输入</span>
          <b>
            登记情报 {{ evidence.registered_count ?? '—' }} 条 ·
            计入风险 {{ evidence.intel_count ?? '—' }} 条 ·
            来源 {{ evidence.source_count ?? '—' }} 个
          </b>
        </div>
        <div class="is-wide">
          <span>待核验问题</span>
          <b>{{ dualAvailable ? pendingCount + ' 项' : '—' }}{{ pendingCount ? '（见下方清单）' : '' }}</b>
        </div>
      </div>
      <p v-if="!dualAvailable" class="dup-warn">
        本任务没有可核验的双驱动执行结论。下面仍可对照两条基线，但不会据此拼出第三份结果。
      </p>
    </article>

    <!-- 三列对比 -->
    <article class="dup-card">
      <div class="dup-card-label">
        三方研判结果对比
        <span class="dup-card-sub">大模型独立研判 / 态势模型研判 / 大模型调用态势模型的双驱动研判</span>
      </div>
      <div class="dup-table-wrap">
        <table class="dup-table">
          <thead>
            <tr>
              <th class="col-dim">对比维度</th>
              <th>大模型研判</th>
              <th>态势模型研判</th>
              <th>双驱动研判</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in compareRows" :key="row.dimension">
              <td class="col-dim">{{ row.dimension }}</td>
              <td :class="{ 'is-empty': row.llmEmpty }">{{ row.llm }}</td>
              <td>{{ row.domain }}</td>
              <td class="col-merged" :class="{ 'is-empty': !dualAvailable }">{{ row.dual }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <!-- 逐路线一致性 -->
    <article class="dup-card">
      <div class="dup-card-label">
        两条基线的逐路线一致性对照
        <span class="dup-card-sub">大模型定性等级 vs 态势模型数值等级</span>
      </div>
      <div v-if="!routeRows.length" class="dup-none">暂无可比对的路线</div>
      <div v-else class="dup-rows">
        <div v-for="r in routeRows" :key="r.id" class="dup-row">
          <span class="dup-route">{{ r.country }}</span>
          <span class="dup-cell">
            <span class="dup-cell-label">大模型</span>
            <span v-if="r.llmLevel" class="dup-level" :class="r.llmLevel">{{ levelText(r.llmLevel) }}</span>
            <span v-else class="dup-none-inline">未研判</span>
          </span>
          <span class="dup-cell">
            <span class="dup-cell-label">态势模型</span>
            <span class="dup-level" :class="r.domainLevel">{{ levelText(r.domainLevel) }}</span>
            <span class="dup-cell-score">{{ r.domainScore }}</span>
          </span>
          <span class="dup-agree" :class="'agree-' + r.agreement">{{ agreementText(r.agreement) }}</span>
        </div>
      </div>
    </article>

    <!-- 待核验问题 -->
    <article class="dup-card">
      <div class="dup-card-label">双驱动待核验问题</div>
      <ol v-if="pendingQuestions.length" class="dup-ol">
        <li v-for="(q, i) in pendingQuestions" :key="i">{{ q }}</li>
      </ol>
      <p v-else class="dup-none">{{ dualAvailable ? '双驱动结论未列出待核验问题' : '暂无双驱动研判结果' }}</p>
      <p v-if="limitations" class="dup-limitations"><b>保留意见：</b>{{ limitations }}</p>
    </article>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { JUDGMENT_MODE_META, agreementText, isLlmAvailable, judgeAgreement } from '@/constants/judgmentModes'

const props = defineProps({
  dual: { type: Object, default: null },
  llm: { type: Object, default: null },
  /** 态势模型路线(原样传入) */
  routes: { type: Array, default: () => [] },
  /** 网络关键节点(来自快照 critical_nodes) */
  criticalNodes: { type: Array, default: () => [] },
  /** 高风险节点(来自快照 nodes,已按综合风险排序) */
  riskNodes: { type: Array, default: () => [] },
})

const meta = JUDGMENT_MODE_META.dual

const dualAvailable = computed(() => Boolean(props.dual?.status === 'completed'
  && props.dual?.prompt_version === 'dual_judgment_v1'
  && props.dual?.conclusion && props.dual?.tool_calls?.length && props.dual?.model_runs?.length))
const llmAvailable = computed(() => isLlmAvailable(props.llm))
const evidence = computed(() => (props.llm && props.llm.evidence) || {})

const domainRanking = computed(() =>
  [...props.routes]
    .map((r) => ({
      id: r.id,
      country: r.country,
      level: r.riskLevel || r.risk_level || 'low',
      score: Number(r.display_risk_score ?? r.risk_score ?? 0),
    }))
    .sort((a, b) => b.score - a.score),
)
const domainTop = computed(() => domainRanking.value[0] || null)

const llmLevelMap = computed(() => {
  const map = {}
  for (const item of (props.llm && props.llm.key_routes) || []) {
    if (item && item.route_id) map[item.route_id] = item.llm_risk_level
  }
  return map
})

/** 逐路线一致性:大模型只对部分路线有判断,没判断的记 unknown */
const routeRows = computed(() =>
  domainRanking.value.map((r) => {
    const llmLevel = llmLevelMap.value[r.id] || null
    return {
      ...r,
      llmLevel,
      domainLevel: r.level,
      domainScore: r.score,
      agreement: judgeAgreement(r.level, llmLevel),
    }
  }),
)

const counts = computed(() => {
  const base = { consistent: 0, partial: 0, divergent: 0, unknown: 0 }
  for (const r of routeRows.value) base[r.agreement] += 1
  return base
})

const llmLevel = computed(() => (props.llm && props.llm.risk_level) || 'medium')
const pendingQuestions = computed(() => dualAvailable.value ? props.dual.pending_questions || [] : [])
const pendingCount = computed(() => pendingQuestions.value.length)
const limitations = computed(() => dualAvailable.value ? props.dual.limitations || '' : '')

const agreementValue = computed(() =>
  judgeAgreement(domainTop.value?.level, llmAvailable.value ? llmLevel.value : null),
)

const overallLevel = computed(() => dualAvailable.value ? props.dual.risk_level : 'unknown')

const fusionState = computed(() => {
  return dualAvailable.value
    ? { text: '调用完成', class: 'is-ok' }
    : { text: '尚未生成', class: 'is-single' }
})
const fusionStateClass = computed(() => fusionState.value.class)

const mainRoutes = computed(() => {
  if (!dualAvailable.value) return []
  return (props.dual.key_route_ids || [])
    .map((id) => props.routes.find((r) => r.id === id)?.country || id)
})

const keyNodes = computed(() => {
  return dualAvailable.value ? (props.dual.key_node_names || []).slice(0, 4) : []
})

const compareRows = computed(() => {
  const llm = props.llm || {}
  const hasLlm = llmAvailable.value
  const noLlm = '暂无大模型研判结果'
  const topNodeNames = props.riskNodes.slice(0, 3).map((n) => n.name || n)
  const critNames = props.criticalNodes.slice(0, 3).map((n) => n.name || n)
  const dTop = domainTop.value

  return [
    {
      dimension: '风险对象',
      llm: hasLlm
        ? (llm.key_countries || []).map((c) => c.country).join('、') ||
          (llm.key_routes || []).map((r) => r.country).join('、') || '未点名'
        : noLlm,
      llmEmpty: !hasLlm,
      domain: `定量计算得到 ${props.routes.length} 条路线风险，最高为 ${dTop ? dTop.country : '—'}`,
      dual: dualAvailable.value ? props.dual.comparison?.risk_object || '未说明' : '暂无双驱动研判结果',
    },
    {
      dimension: '影响范围',
      llm: hasLlm
        ? (llm.impact_scope || {}).description ||
          `路线 ${((llm.impact_scope || {}).route_ids || []).length} 条 / 节点 ${((llm.impact_scope || {}).node_names || []).length} 个`
        : noLlm,
      llmEmpty: !hasLlm,
      domain: `节点、边、路线传播：高风险节点 ${topNodeNames.join('、') || '—'}；网络关键节点 ${critNames.join('、') || '—'}`,
      dual: dualAvailable.value ? props.dual.comparison?.impact_scope || '未说明' : '暂无双驱动研判结果',
    },
    {
      dimension: '风险等级',
      llm: hasLlm ? `语言判断：${levelText(llmLevel.value)}` : noLlm,
      llmEmpty: !hasLlm,
      domain: `数值与等级：最高风险路线展示分 ${dTop ? dTop.score : '—'}，等级 ${dTop ? levelText(dTop.level) : '—'}`,
      dual: dualAvailable.value ? props.dual.comparison?.risk_level || levelText(overallLevel.value) : '暂无双驱动研判结果',
    },
    {
      dimension: '判断依据',
      llm: hasLlm
        ? `情报 ${evidence.value.intel_count ?? '—'} 条 · 来源 ${evidence.value.source_count ?? '—'} 个 · 知识库关联`
        : noLlm,
      llmEmpty: !hasLlm,
      domain: '模型参数与网络指标（脆弱性、供应后果、中介中心性、边风险传导）',
      dual: dualAvailable.value ? props.dual.comparison?.evidence || '未说明' : '暂无双驱动研判结果',
    },
    {
      dimension: '不确定性',
      llm: hasLlm
        ? `置信度 ${levelText((llm.confidence || {}).level)}${(llm.confidence || {}).score != null ? `（${llm.confidence.score}/100，推理置信，非概率）` : ''}；待核验 ${(llm.pending_questions || []).length} 项`
        : noLlm,
      llmEmpty: !hasLlm,
      domain: '样本量、快照内相对校准与模型假设限制；展示分不等于绝对概率',
      dual: dualAvailable.value ? props.dual.comparison?.uncertainty || '未说明' : '暂无双驱动研判结果',
    },
  ]
})

function levelText(level) {
  return { high: '高风险', medium: '中风险', low: '低风险' }[level] || '—'
}
</script>

<style scoped>
.dup {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
  padding: 1rem 1.2rem 1.2rem; margin-bottom: 1rem; scroll-margin-top: 90px;
}
.dup-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.dup-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; }
.dup-source {
  font-size: 11.5px; font-weight: 600; color: #0369a1;
  background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.28);
  border-radius: 999px; padding: 2px 10px;
}
.dup-method {
  margin: 8px 0 14px; font-size: 12.5px; color: #475569; line-height: 1.7;
  padding: 8px 12px; background: #fff; border-left: 3px solid #0ea5e9; border-radius: 8px;
}
.dup-method b { color: #0f172a; }
.dup-conclusion { margin: 10px 0; color: #0f172a; line-height: 1.85; font-size: 14px; white-space: pre-line; }
.dup-execution { margin: 6px 0; color: #0369a1; font-size: 12px; }

/* 统计卡片 */
.dup-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  gap: 10px; margin-bottom: 12px;
}
.dup-stat {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 10px 12px; display: flex; flex-direction: column; gap: 3px;
}
.dup-stat b { font-size: 19px; line-height: 1.2; color: #1e293b; font-weight: 800; }
.dup-stat span { font-size: 11px; color: #64748b; }
.dup-stat.is-ok b, .dup-stat b.low { color: #15803d; }
.dup-stat.is-partial b, .dup-stat b.medium { color: #b45309; }
.dup-stat.is-bad b, .dup-stat b.high { color: #b91c1c; }
.dup-stat.is-unknown b { color: #94a3b8; }
.dup-stat.is-overall { border-color: #bfdbfe; background: #eff6ff; }
.dup-stat.is-fusion b { font-size: 13.5px; }
.dup-stat.is-fusion.is-ok { border-color: #a7f3d0; background: #ecfdf5; }
.dup-stat.is-fusion.is-ok b { color: #15803d; }
.dup-stat.is-fusion.is-partial { border-color: #fde68a; background: #fffbeb; }
.dup-stat.is-fusion.is-partial b { color: #b45309; }
.dup-stat.is-fusion.is-bad { border-color: #fecaca; background: #fef2f2; }
.dup-stat.is-fusion.is-bad b { color: #b91c1c; }
.dup-stat.is-fusion.is-single b { color: #475569; }

/* 卡片 */
.dup-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; }
.dup-card--conclusion { border-color: #bae6fd; background: #f0f9ff; }
.dup-card:last-child { margin-bottom: 0; }
.dup-card-label {
  font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 10px;
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
}
.dup-card-sub { font-size: 11px; font-weight: 400; color: #94a3b8; }

.dup-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px 16px; }
.dup-summary-grid > div { display: flex; flex-direction: column; gap: 2px; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
.dup-summary-grid > div.is-wide { grid-column: 1 / -1; }
.dup-summary-grid span { font-size: 11px; color: #64748b; }
.dup-summary-grid b { font-size: 12.5px; color: #1e293b; font-weight: 650; line-height: 1.6; }
.dup-summary-grid b.high { color: #b91c1c; }
.dup-summary-grid b.medium { color: #b45309; }
.dup-summary-grid b.low { color: #15803d; }

.dup-warn {
  margin: 10px 0 0; padding: 9px 12px; border-radius: 9px;
  background: #fffbeb; border: 1px solid #fde68a;
  font-size: 11.5px; color: #92400e; line-height: 1.7;
}

/* 对比表 */
.dup-table-wrap { overflow-x: auto; }
.dup-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dup-table th {
  text-align: left; font-size: 11.5px; color: #64748b; font-weight: 700;
  padding: 7px 10px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap;
}
.dup-table td {
  padding: 9px 10px; border-bottom: 1px solid #f1f5f9;
  color: #334155; line-height: 1.7; vertical-align: top;
}
.dup-table tr:last-child td { border-bottom: none; }
.col-dim { font-weight: 700; color: #1e293b; white-space: nowrap; width: 90px; }
.col-merged { background: #f8fbff; }
.dup-table td.is-empty { color: #94a3b8; font-style: italic; }

/* 逐路线 */
.dup-rows { display: flex; flex-direction: column; }
.dup-row {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px;
}
.dup-row:last-child { border-bottom: none; }
.dup-route { width: 96px; font-weight: 650; color: #1e293b; flex-shrink: 0; }
.dup-cell { display: inline-flex; align-items: center; gap: 5px; }
.dup-cell-label { font-size: 11px; color: #94a3b8; }
.dup-cell-score { font-size: 11px; color: #64748b; font-variant-numeric: tabular-nums; }
.dup-agree { margin-left: auto; font-size: 11.5px; font-weight: 700; border-radius: 999px; padding: 1px 9px; }
.agree-consistent { color: #15803d; background: rgba(22, 163, 74, 0.12); }
.agree-partial { color: #b45309; background: rgba(245, 158, 11, 0.14); }
.agree-divergent { color: #b91c1c; background: rgba(220, 38, 38, 0.1); }
.agree-unknown { color: #64748b; background: #f1f5f9; }

.dup-level { font-size: 11px; font-weight: 700; border-radius: 999px; padding: 1px 8px; }
.dup-level.high { color: #b91c1c; background: rgba(220, 38, 38, 0.1); }
.dup-level.medium { color: #b45309; background: rgba(245, 158, 11, 0.14); }
.dup-level.low { color: #15803d; background: rgba(22, 163, 74, 0.12); }
.dup-none-inline { font-size: 11.5px; color: #94a3b8; }
.dup-none { margin: 0; font-size: 12px; color: #94a3b8; }

.dup-ol { margin: 0; padding-left: 18px; font-size: 12px; color: #334155; line-height: 1.75; }
.dup-ol li { margin-bottom: 4px; }
.dup-ol li::marker { color: #b45309; }
.dup-limitations {
  margin: 10px 0 0; padding: 9px 12px; border-radius: 9px;
  background: #fffbeb; border: 1px solid #fde68a;
  font-size: 11.5px; color: #92400e; line-height: 1.7;
}
</style>
