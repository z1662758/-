<template>
  <section class="ljp">
    <header class="ljp-head">
      <h3 class="ljp-title">大模型研判结果</h3>
      <span class="ljp-source">{{ meta.sourceLabel }}</span>
      <span v-if="available" class="ljp-model" :title="modelTitle">
        {{ llm.provider }}{{ llm.model ? ' · ' + llm.model : '' }} · {{ llm.prompt_version }}
      </span>
    </header>

    <p class="ljp-method">{{ meta.method }}</p>

    <!-- ============ 没有真实大模型结果 ============ -->
    <div v-if="!available" class="ljp-empty">
      <div class="ljp-empty-head">
        <span class="ljp-empty-icon">🗒️</span>
        <strong>{{ meta.emptyText }}</strong>
      </div>
      <p>
        本页不会用领域模型的风险分数冒充大模型结论。大模型结论需要后端在态势研判阶段
        真实调用大模型后产出；当前这份结果里没有大模型研判数据。
      </p>
      <p v-if="llm && llm.reason" class="ljp-empty-reason">原因：{{ llm.reason }}</p>
      <p v-else-if="llm && llm.prompt_version !== 'llm_judgment_v2'" class="ljp-empty-reason">
        原因：旧版大模型结果曾读取领域模型分数，不符合独立研判口径；请重新运行态势研判。
      </p>
      <p v-else-if="!llm" class="ljp-empty-reason">
        原因：本次任务(或案例包)未包含大模型研判产物。重新运行「态势研判」阶段会重新生成。
      </p>
      <div v-if="llm && llm.evidence" class="ljp-empty-evidence">
        本次可用的事实基础：登记情报 <b>{{ llm.evidence.registered_count }}</b> 条，
        当前计入风险 <b>{{ llm.evidence.intel_count }}</b> 条，
        证据来源 <b>{{ llm.evidence.source_count }}</b> 个，
        供应路线 <b>{{ llm.evidence.route_count }}</b> 条。
      </div>
    </div>

    <!-- ============ 有真实大模型结果 ============ -->
    <template v-else>
      <!-- 关键研判结论卡片 -->
      <div class="ljp-cards">
        <article class="ljp-card ljp-card--conclusion">
          <div class="ljp-card-label">研判结论</div>
          <p class="ljp-conclusion">{{ llm.conclusion || '—' }}</p>
          <div class="ljp-card-foot">
            <span class="ljp-level" :class="llm.risk_level">大模型定性：{{ levelText(llm.risk_level) }}</span>
            <span class="ljp-confidence" :class="confidenceLevel">
              结论置信度：{{ levelText(confidenceLevel) }}<template v-if="confidenceScore != null"> ({{ confidenceScore }}/100)</template>
            </span>
          </div>
          <p v-if="llm.confidence && llm.confidence.basis" class="ljp-basis">
            置信度依据：{{ llm.confidence.basis }}
          </p>
        </article>

        <article class="ljp-card">
          <div class="ljp-card-label">关联情报 / 证据来源</div>
          <div class="ljp-kpis">
            <div><b>{{ evidence.intel_count ?? '—' }}</b><span>计入风险的关联情报</span></div>
            <div><b>{{ evidence.registered_count ?? '—' }}</b><span>登记情报总数</span></div>
            <div><b>{{ evidence.source_count ?? '—' }}</b><span>证据来源数量</span></div>
            <div><b>{{ citedEvents.length }}</b><span>结论引用的情报</span></div>
          </div>
          <p class="ljp-card-note">
            情报与来源数量由后端按真实事件登记表统计，不采用大模型自报数字。
          </p>
        </article>
      </div>

      <!-- 风险主题 + 影响方向 -->
      <div class="ljp-grid">
        <article class="ljp-card">
          <div class="ljp-card-label">主要风险主题与影响方向</div>
          <p v-if="!llm.themes || !llm.themes.length" class="ljp-none">大模型未归纳出风险主题</p>
          <ul v-else class="ljp-themes">
            <li v-for="(t, i) in llm.themes" :key="t.name + i">
              <span class="ljp-dir" :class="t.direction">{{ directionText(t.direction) }}</span>
              <div>
                <strong>{{ t.name }}</strong>
                <p>{{ t.description }}</p>
              </div>
            </li>
          </ul>
        </article>

        <article class="ljp-card">
          <div class="ljp-card-label">影响路径</div>
          <p v-if="!llm.impact_paths || !llm.impact_paths.length" class="ljp-none">大模型未给出影响路径</p>
          <div v-for="(p, i) in llm.impact_paths" :key="p.route_id + i" class="ljp-path">
            <div class="ljp-path-head">
              <span class="ljp-path-route">{{ p.country }}</span>
              <span class="ljp-path-chain">
                {{ p.from || '—' }}
                <template v-for="n in p.via || []" :key="n"> → {{ n }}</template>
                → {{ p.to || '—' }}
              </span>
            </div>
            <p class="ljp-path-desc">{{ p.description }}</p>
          </div>
        </article>
      </div>

      <!-- 影响范围 + 重点国家/路线 -->
      <div class="ljp-grid">
        <article class="ljp-card">
          <div class="ljp-card-label">风险事件影响范围</div>
          <p class="ljp-scope-desc">{{ (llm.impact_scope || {}).description || '大模型未给出影响范围说明' }}</p>
          <div class="ljp-tags">
            <span class="ljp-tag-title">受影响路线</span>
            <span v-for="id in (llm.impact_scope || {}).route_ids || []" :key="id" class="ljp-tag">
              {{ routeCountry(id) }}
            </span>
            <span v-if="!((llm.impact_scope || {}).route_ids || []).length" class="ljp-none-inline">—</span>
          </div>
          <div class="ljp-tags">
            <span class="ljp-tag-title">受影响节点</span>
            <span v-for="n in (llm.impact_scope || {}).node_names || []" :key="n" class="ljp-tag">{{ n }}</span>
            <span v-if="!((llm.impact_scope || {}).node_names || []).length" class="ljp-none-inline">—</span>
          </div>
        </article>

        <article class="ljp-card">
          <div class="ljp-card-label">重点风险国家与供应路线</div>
          <div class="ljp-list">
            <div v-for="c in llm.key_countries || []" :key="'c' + c.country" class="ljp-list-row">
              <span class="ljp-list-kind">国家</span>
              <strong>{{ c.country }}</strong>
              <span class="ljp-list-reason">{{ c.reason }}</span>
            </div>
            <div v-for="r in llm.key_routes || []" :key="'r' + r.route_id" class="ljp-list-row">
              <span class="ljp-list-kind">路线</span>
              <strong>{{ r.country }}</strong>
              <span class="ljp-level" :class="r.llm_risk_level">{{ levelText(r.llm_risk_level) }}</span>
              <span class="ljp-list-reason">{{ r.reason }}</span>
            </div>
            <p v-if="!((llm.key_countries || []).length || (llm.key_routes || []).length)" class="ljp-none">
              大模型未点名重点国家或路线
            </p>
          </div>
        </article>
      </div>

      <!-- 演化方向 + 待核验问题 -->
      <div class="ljp-grid">
        <article class="ljp-card">
          <div class="ljp-card-label">可能演化方向</div>
          <ol v-if="(llm.evolution || []).length" class="ljp-ol">
            <li v-for="(e, i) in llm.evolution" :key="i">{{ e }}</li>
          </ol>
          <p v-else class="ljp-none">大模型未给出演化方向</p>
        </article>

        <article class="ljp-card">
          <div class="ljp-card-label">待核验问题</div>
          <ol v-if="(llm.pending_questions || []).length" class="ljp-ol ljp-ol--pending">
            <li v-for="(q, i) in llm.pending_questions" :key="i">{{ q }}</li>
          </ol>
          <p v-else class="ljp-none">大模型未提出待核验问题</p>
        </article>
      </div>

      <!-- 情报事件时间线 -->
      <article class="ljp-card ljp-card--timeline">
        <div class="ljp-card-label">
          情报事件时间线
          <span class="ljp-card-sub">共 {{ timeline.length }} 条 · 高亮为大模型结论实际引用的情报</span>
        </div>
        <p v-if="!timeline.length" class="ljp-none">本次没有可展示的登记情报</p>
        <ul v-else class="ljp-timeline">
          <li
            v-for="ev in timeline"
            :key="ev.event_id"
            class="ljp-tl-item"
            :class="{ 'is-cited': citedSet.has(ev.event_id) }"
          >
            <span class="ljp-tl-date">{{ (ev.event_date || ev.published_at || '').slice(0, 10) }}</span>
            <span class="ljp-tl-dot" :class="ev.severity_class ? ev.severity_class.toLowerCase() : 'medium'"></span>
            <div class="ljp-tl-body">
              <div class="ljp-tl-title">
                {{ ev.title }}
                <span v-if="citedSet.has(ev.event_id)" class="ljp-cited">结论引用</span>
                <span v-if="ev.risk_effective" class="ljp-reeff">计入风险</span>
              </div>
              <div class="ljp-tl-meta">
                <span>{{ ev.country_id || '—' }}</span>
                <span>严重度 {{ ev.severity_class || '—' }}</span>
                <span>方向 {{ directionText(ev.direction) }}</span>
                <span>路线 {{ (ev.affected_route_ids || []).map(routeCountry).join('、') || '—' }}</span>
                <span>节点 {{ (ev.affected_node_ids || []).join('、') || '—' }}</span>
              </div>
              <a
                v-if="ev.primary_source"
                class="ljp-tl-src"
                :href="ev.primary_source"
                target="_blank"
                rel="noopener"
              >证据来源 ↗</a>
            </div>
          </li>
        </ul>
      </article>

      <p v-if="llm.limitations" class="ljp-limitations">
        <b>本次研判的局限：</b>{{ llm.limitations }}
      </p>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { JUDGMENT_MODE_META, isLlmAvailable } from '@/constants/judgmentModes'

const props = defineProps({
  /** artifact.result.llm(可能为 null) */
  llm: { type: Object, default: null },
  /** 真实登记的 OSINT 事件(来自快照 osint_registered_events) */
  events: { type: Array, default: () => [] },
  /** 路线 id → 国家名,用于把 route_id 还原成可读名称 */
  routeNames: { type: Object, default: () => ({}) },
})

const meta = JUDGMENT_MODE_META.llm

const available = computed(() => isLlmAvailable(props.llm))
const evidence = computed(() => (props.llm && props.llm.evidence) || {})
const confidenceLevel = computed(() => ((props.llm || {}).confidence || {}).level || 'medium')
const confidenceScore = computed(() => ((props.llm || {}).confidence || {}).score)
const modelTitle = computed(() =>
  props.llm ? `prompt ${props.llm.prompt_version} · 生成于 ${props.llm.generated_at}` : '',
)

const citedSet = computed(() => new Set((props.llm && props.llm.cited_event_ids) || []))
const citedEvents = computed(() => (props.llm && props.llm.cited_event_ids) || [])

/** 时间线:按发布时间倒序,便于"最新情报在最上面" */
const timeline = computed(() =>
  [...(props.events || [])].sort((a, b) =>
    String(b.published_at || b.event_date || '').localeCompare(String(a.published_at || a.event_date || '')),
  ),
)

function routeCountry(id) {
  return props.routeNames[id] || id
}

function levelText(level) {
  return { high: '高风险', medium: '中风险', low: '低风险' }[level] || '—'
}

function directionText(d) {
  return { POSITIVE: '正向', NEGATIVE: '负向', NEUTRAL: '中性', MIXED: '混合' }[d] || d || '—'
}
</script>

<style scoped>
.ljp {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1rem 1.2rem 1.2rem;
  margin-bottom: 1rem;
}

.ljp-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.ljp-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; }
.ljp-source {
  font-size: 11.5px; font-weight: 600; color: #7c3aed;
  background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.24);
  border-radius: 999px; padding: 2px 10px;
}
.ljp-model { font-size: 11px; color: #94a3b8; }
.ljp-method { margin: 6px 0 14px; font-size: 12px; color: #64748b; }

/* ── 空态 ── */
.ljp-empty {
  background: #fff; border: 1px dashed #cbd5e1; border-radius: 12px;
  padding: 16px 18px; color: #475569; font-size: 12.5px; line-height: 1.8;
}
.ljp-empty-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.ljp-empty-head strong { font-size: 14px; color: #334155; }
.ljp-empty-icon { font-size: 16px; }
.ljp-empty p { margin: 0 0 6px; }
.ljp-empty-reason { color: #b45309; }
.ljp-empty-evidence {
  margin-top: 10px; padding: 8px 10px; border-radius: 8px;
  background: #f8fafc; border: 1px solid #e2e8f0; color: #475569;
}
.ljp-empty-evidence b { color: #1e293b; }

/* ── 卡片 ── */
.ljp-cards { display: grid; grid-template-columns: 1.4fr 1fr; gap: 12px; margin-bottom: 12px; }
.ljp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.ljp-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 12px 14px;
}
.ljp-card--conclusion { border-left: 3px solid #7c3aed; }
.ljp-card--timeline { margin-bottom: 12px; }
.ljp-card-label {
  font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px;
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
}
.ljp-card-sub { font-size: 11px; font-weight: 400; color: #94a3b8; }
.ljp-card-note { margin: 8px 0 0; font-size: 11px; color: #94a3b8; line-height: 1.6; }
.ljp-conclusion { margin: 0; font-size: 13px; line-height: 1.85; color: #1e293b; white-space: pre-wrap; }
.ljp-card-foot { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.ljp-basis { margin: 8px 0 0; font-size: 11.5px; color: #64748b; line-height: 1.6; }
.ljp-none { margin: 0; font-size: 12px; color: #94a3b8; }
.ljp-none-inline { font-size: 12px; color: #94a3b8; }

.ljp-level {
  font-size: 11.5px; font-weight: 700; border-radius: 999px; padding: 2px 9px;
}
.ljp-level.high { color: #b91c1c; background: rgba(220, 38, 38, 0.1); }
.ljp-level.medium { color: #b45309; background: rgba(245, 158, 11, 0.14); }
.ljp-level.low { color: #15803d; background: rgba(22, 163, 74, 0.12); }
.ljp-confidence { font-size: 11.5px; font-weight: 700; border-radius: 999px; padding: 2px 9px; color: #1d4ed8; background: rgba(37, 99, 235, 0.1); }
.ljp-confidence.high { color: #15803d; background: rgba(22, 163, 74, 0.12); }
.ljp-confidence.low { color: #b45309; background: rgba(245, 158, 11, 0.14); }

/* KPI */
.ljp-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ljp-kpis > div { display: flex; flex-direction: column; gap: 2px; }
.ljp-kpis b { font-size: 18px; color: #1e293b; line-height: 1.2; }
.ljp-kpis span { font-size: 11px; color: #64748b; }

/* 主题 */
.ljp-themes { list-style: none; margin: 0; padding: 0; }
.ljp-themes li { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 10px; }
.ljp-themes li:last-child { margin-bottom: 0; }
.ljp-themes strong { font-size: 12.5px; color: #1e293b; }
.ljp-themes p { margin: 2px 0 0; font-size: 11.5px; color: #64748b; line-height: 1.6; }
.ljp-dir {
  flex-shrink: 0; font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 7px;
  color: #475569; background: #f1f5f9;
}
.ljp-dir.NEGATIVE { color: #b91c1c; background: rgba(220, 38, 38, 0.1); }
.ljp-dir.POSITIVE { color: #15803d; background: rgba(22, 163, 74, 0.12); }
.ljp-dir.MIXED { color: #6d28d9; background: rgba(109, 40, 217, 0.1); }

/* 影响路径 */
.ljp-path { padding: 8px 0; border-bottom: 1px dashed #e2e8f0; }
.ljp-path:last-child { border-bottom: none; padding-bottom: 0; }
.ljp-path-head { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.ljp-path-route { font-size: 12px; font-weight: 700; color: #1e293b; }
.ljp-path-chain { font-size: 11.5px; color: #475569; }
.ljp-path-desc { margin: 3px 0 0; font-size: 11.5px; color: #64748b; line-height: 1.6; }

/* 范围 */
.ljp-scope-desc { margin: 0 0 8px; font-size: 12px; color: #475569; line-height: 1.7; }
.ljp-tags { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin-bottom: 6px; }
.ljp-tag-title { font-size: 11px; color: #94a3b8; }
.ljp-tag {
  font-size: 11.5px; color: #1e3a8a; background: #eef2ff;
  border-radius: 999px; padding: 2px 9px; font-weight: 600;
}

/* 列表 */
.ljp-list { display: flex; flex-direction: column; gap: 8px; }
.ljp-list-row { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.ljp-list-kind { font-size: 11px; color: #94a3b8; }
.ljp-list-row strong { font-size: 12.5px; color: #1e293b; }
.ljp-list-reason { font-size: 11.5px; color: #64748b; line-height: 1.6; flex: 1 1 100%; }

/* 有序列表 */
.ljp-ol { margin: 0; padding-left: 18px; font-size: 12px; color: #334155; line-height: 1.75; }
.ljp-ol li { margin-bottom: 4px; }
.ljp-ol--pending li::marker { color: #b45309; }

/* 时间线 */
.ljp-timeline { list-style: none; margin: 0; padding: 0; max-height: 340px; overflow-y: auto; }
.ljp-tl-item {
  display: flex; gap: 10px; padding: 7px 8px; border-radius: 8px;
  border-left: 3px solid transparent;
}
.ljp-tl-item.is-cited { background: rgba(124, 58, 237, 0.06); border-left-color: #7c3aed; }
.ljp-tl-date { flex-shrink: 0; width: 78px; font-size: 11px; color: #64748b; font-variant-numeric: tabular-nums; }
.ljp-tl-dot { flex-shrink: 0; width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; background: #f59e0b; }
.ljp-tl-dot.high { background: #dc2626; }
.ljp-tl-dot.medium { background: #f59e0b; }
.ljp-tl-dot.low { background: #16a34a; }
.ljp-tl-body { min-width: 0; flex: 1; }
.ljp-tl-title { font-size: 12.5px; color: #1e293b; font-weight: 600; line-height: 1.55; }
.ljp-cited {
  font-size: 10.5px; font-weight: 700; color: #6d28d9; background: rgba(109, 40, 217, 0.1);
  border-radius: 999px; padding: 1px 7px; margin-left: 6px;
}
.ljp-reeff {
  font-size: 10.5px; font-weight: 700; color: #b45309; background: rgba(245, 158, 11, 0.14);
  border-radius: 999px; padding: 1px 7px; margin-left: 6px;
}
.ljp-tl-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: #94a3b8; margin-top: 2px; }
.ljp-tl-src { font-size: 11px; color: #2563eb; text-decoration: none; }

.ljp-limitations {
  margin: 0; padding: 10px 12px; border-radius: 10px;
  background: #fffbeb; border: 1px solid #fde68a;
  font-size: 12px; color: #92400e; line-height: 1.7;
}

@media (max-width: 1200px) {
  .ljp-cards, .ljp-grid { grid-template-columns: 1fr; }
}
</style>
