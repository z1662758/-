<template>
  <section v-if="method" class="mechanism">
    <div class="mechanism-head"><h3>{{ seminar ? '本场研讨机制' : '所选模式如何进行' }} · {{ method.title }}</h3><small v-if="rounds.length">已记录 {{ rounds.length }} 轮</small></div>
    <p>{{ method.purpose }}</p>
    <div class="method-flow"><span v-for="(step, i) in method.steps" :key="step"><b>{{ i + 1 }}</b>{{ step }}</span></div>
    <p class="basis"><strong>收敛依据：</strong>{{ method.convergence_basis }}</p>
    <p><strong>本模式怎样收束：</strong>{{ method.closure_rule }}</p>
    <p v-if="method.ranking_rule" class="small">本场排序规则：{{ method.ranking_rule }}</p>
    <p v-if="!['open','brainstorm'].includes(method.id)" class="small">共同意见预设：至少 {{ Math.round((policy.agreement_threshold || .8) * 100) }}% 支持或条件支持，连续 {{ policy.stable_rounds || 2 }} 轮接受同一方案与共同前提，无未解决的实质阻断。不同分析侧重点可以互补，无须措辞相同。</p>
    <p v-else class="small">本模式按上述产物与流程规则结束；是否达成共同意见单独记录，排序或探索完成不等于方案通过。</p>
    <p v-if="lastPoint.method_closure" class="small">模式流程：{{ lastPoint.method_closure.process_complete ? '已完成' : '进行中' }}；本模式专项检查：{{ lastPoint.method_closure.extra_conditions_met ? '已满足' : lastPoint.method_closure.unresolved?.join('；') || '待核对' }}。</p>
    <div v-if="latestRows.length" class="metric-scroll"><table><caption>实际表态与条件的计算结果 · 第 {{ lastPoint.round }} 轮</caption><thead><tr><th>候选</th><th>支持/条件支持</th><th>共同条件接受</th><th>立场变化率</th><th>条件集合重合</th><th>实质阻断</th><th v-if="hasScores">评分中位数 / IQR</th></tr></thead><tbody><tr v-for="row in latestRows" :key="row.candidate_id"><td>{{ row.candidate_id }}</td><td>{{ supportCount(row) }}/{{ row.metrics.participants }}（{{ percent(supportRate(row)) }}）</td><td>{{ row.accepted_by?.length || 0 }}/{{ row.metrics.participants }}（{{ percent(row.metrics.condition_acceptance_rate) }}）</td><td>{{ percent(row.metrics.stance_change_rate) }}</td><td>{{ percent(row.metrics.condition_jaccard) }}</td><td>{{ row.metrics.blocking_count + row.metrics.condition_conflict_count }}</td><td v-if="hasScores">{{ row.metrics.score_count ? `${row.metrics.median} / ${row.metrics.iqr}（${row.metrics.score_count}份）` : '本轮未评分' }}</td></tr></tbody></table></div>
    <details v-if="seminar"><summary>本场实际步骤与各轮变化</summary><div v-for="round in rounds" :key="round.number" class="round"><strong>第 {{ round.number }} 轮 · {{ round.label }}</strong><span>{{ round.count }} 位已发言{{ round.controlled ? ' · 上一轮去姓名受控反馈' : '' }}</span><p v-for="row in round.points" :key="row.candidate_id">{{ row.candidate_id }}：{{ row.stable ? '同一版本方案与条件连续确认' : (row.reasons || []).join('；') || '形成候选/首次征询' }}<small v-if="row.metrics">；支持 {{ percent(supportRate(row)) }}，条件接受 {{ percent(row.metrics.condition_acceptance_rate) }}，立场变化 {{ percent(row.metrics.stance_change_rate) }}</small></p></div></details>
    <details v-if="lastPoint.method_closure?.scenario_assessments"><summary>分情景判断与触发条件</summary><div v-for="(rows, key) in lastPoint.method_closure.scenario_assessments" :key="key"><strong>{{ {baseline:'基准情景',stress:'压力情景',recovery:'恢复情景'}[key] }}</strong><p v-for="(row, i) in rows" :key="i">{{ row.candidate_id }} · {{ {viable:'成立',conditional:'条件成立',not_viable:'不成立',unknown:'暂无法判断'}[row.judgement] }}：{{ row.reason }}；触发：{{ row.trigger }}</p></div></details>
    <details><summary>计算口径与方法出处</summary><ul><li>支持率＝支持或条件支持人数 ÷ 本场参与人数；回应率另按实际回复人数计算。</li><li>共同条件接受率＝明确接受上一轮共同条件的人数 ÷ 参与人数。</li><li>立场变化率＝与上一轮表态类别不同的人数 ÷ 参与人数；仅在同一版候选之间比较。</li><li>条件集合重合度＝两轮条件ID交集数 ÷ 并集数；首次确认显示“—”，不伪造上一轮。</li><li>德尔菲若有1–9分适当程度评分，展示中位数与四分位距 IQR＝Q3−Q1；评分反映方案评价，不能覆盖关键反对意见。</li></ul><p class="small">{{ method.implementation }}</p><p v-if="method.id === 'delphi' && seminar && !rounds.some(row => row.controlled)" class="small">本记录未保存去姓名反馈日志；以上是模式机制说明，不能据此追认旧轮次已执行匿名反馈。</p><a v-for="source in method.sources || []" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }} ↗</a></details>
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { getSeminarDeliberationPolicy } from '@/api/expertSeminar'
const props = defineProps({ seminar: { type: Object, default: null }, mode: { type: String, default: 'topic' } })
const loaded = ref(null)
let revision = 0
watch(() => [props.mode, props.seminar?.mode, props.seminar?.deliberation_policy?.method], async () => {
  const current = ++revision
  if (props.seminar?.deliberation_policy?.method) return
  try { const result = await getSeminarDeliberationPolicy(props.seminar?.mode || props.mode); if (current === revision) loaded.value = result.data || result } catch { loaded.value = null }
}, { immediate: true })
const policy = computed(() => props.seminar?.deliberation_policy?.method ? props.seminar.deliberation_policy : loaded.value || {})
const method = computed(() => policy.value.method)
const points = computed(() => props.seminar?.deliberation?.checkpoints || [])
const lastPoint = computed(() => points.value.at(-1) || {})
const latestRows = computed(() => (lastPoint.value.candidates || []).filter(row => row.metrics))
const supportCount = row => Object.values(row.votes || {}).filter(vote => ['support', 'conditional'].includes(vote.stance)).length
const supportRate = row => supportCount(row) / (row.metrics?.participants || row.total || 1)
const hasScores = computed(() => latestRows.value.some(row => row.metrics.score_count))
const percent = value => value == null ? '—' : `${Math.round(value * 1000) / 10}%`
const rounds = computed(() => {
  const grouped = new Map()
  for (const row of props.seminar?.opinions || []) {
    if (!grouped.has(row.round)) grouped.set(row.round, { number: row.round, label: row.round_label, count: 0, controlled: false, points: points.value.find(point => point.round === row.round)?.candidates || [] })
    const group = grouped.get(row.round); group.count++; group.controlled ||= row.feedback_protocol?.type === 'controlled_anonymous'
  }
  return [...grouped.values()].sort((a, b) => a.number - b.number)
})
</script>
<style scoped>
.mechanism{margin:16px 0;padding:18px 20px;background:#fff;border:1px solid #d6e4fb;border-radius:12px;color:#3f5573;font-size:13px;line-height:1.8;overflow-wrap:anywhere}.mechanism-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.mechanism h3{margin:0;color:#184a85;font-size:15px}.mechanism p{margin:8px 0}.method-flow{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.method-flow>span{background:#f1f6ff;padding:7px 10px;border-radius:6px;display:flex;gap:8px;align-items:center;font-size:12px}.method-flow b{color:#2369b8}.basis{color:#174f89}.small,small{color:#7c8ba0;font-size:12px}.mechanism details{border-top:1px solid #e8eef7;padding-top:10px;margin-top:12px}.mechanism summary{cursor:pointer;color:#225f9e}.mechanism a{color:#2266ad;display:block}.metric-scroll{overflow:auto}.mechanism table{width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap}.mechanism th,.mechanism td{padding:8px;text-align:left;border-bottom:1px solid #e6eef8}.mechanism th{background:#f4f8fe}.mechanism caption{text-align:left;font-weight:600;padding:10px 0;color:#245b91}.round{border-left:3px solid #dce8f9;margin:12px 0;padding-left:12px}.round>span{margin-left:12px;font-size:12px;color:#78899f}.round p{font-size:12px;margin:4px 0}@media(max-width:700px){.mechanism-head{display:block}}
</style>
