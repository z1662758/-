<template>
  <section v-if="seminar.deliberation_policy" class="protocol-card">
    <div class="protocol-head"><h3>研判依据与收敛机制</h3><span :class="{ ready: supported || state.converged }">{{ statusLabel }}</span></div>
    <p class="protocol-flow">独立立论 → 原文与复算 → 方案整合 → 共同条件确认 → 必要时补证复议</p>
    <p v-if="adaptive">第 {{ config.converge_from_round }} 轮开始比较方案，第 {{ config.initial_rounds }} 轮检查是否收敛；未收敛则继续定向复议，当前预算最多 {{ config.max_rounds }} 轮。</p>
    <p v-else>本记录使用旧版固定轮次规则，可点击“补充公开证据并继续复议”升级。</p>
    <div class="controller"><strong>{{ state.stop_reason ? '本次停止原因' : '当前运行决策' }}</strong><p>{{ state.stop_reason || state.next_reason || '正在收集事实、复算数据并核对共同条件。' }}</p><small v-if="state.migration_note">{{ state.migration_note }}</small></div>

    <div v-if="primary.length" class="evidence-overview">
      <h4>已经查到的真实公开资料 <small>{{ primary.length }} 条登记证据 · {{ calculations.length }} 张复算卡</small></h4>
      <div class="fact-grid"><div v-for="year in [2024, 2025]" :key="year"><strong>{{ year }}年末 · 哈铀集团</strong><p>成品库存 {{ inventory(year) }} tU</p><p>年度合并销量 {{ sales(year) }} tU</p><small>供应商集团口径，不是用户企业库存</small></div></div>
      <p v-for="row in calculations" :key="row.id" class="calculation">{{ row.summary }} <small>[{{ row.id }}]</small></p>
      <div v-if="featuredEvidence.length" class="fact-grid"><div v-for="row in featuredEvidence" :key="row.id"><a :href="row.source" target="_blank" rel="noopener noreferrer"><strong>{{ row.title_zh || row.title }}</strong> ↗</a><p>{{ row.summary_zh || row.summary }}</p><small><span v-if="row.published_at">发布 {{ row.published_at }}</span> · {{ row.id }}</small></div></div><details><summary>查看合同披露、库存、实际交付与运输的原始出处</summary><div v-for="row in primary" :key="row.id" class="candidate"><a :href="row.source" target="_blank" rel="noopener noreferrer"><strong>{{ row.title }}</strong> ↗</a><p>{{ row.summary }}</p><small><span v-if="row.published_at">发布 {{ row.published_at }}</span> · 数据口径 {{ row.as_of }} · 原文核验 {{ row.verified_at }}</small><p class="muted">{{ row.limitations }}</p></div></details>
      <p v-if="seminar.public_evidence?.excluded?.length" class="muted">另有 {{ seminar.public_evidence.excluded.length }} 条资料因日期未确认或晚于本场截止日，未纳入本场依据。</p>
    </div>

    <details><summary>收敛判据：如何从不同措辞走向共同结论</summary><p>{{ config.rule }}</p><p class="muted">支持人数、共同前提接受记录与实质反对分别计算；文本相似度不参与收敛。条件共识表示方案在所列前提下获接受，不等于企业已可立即签约。</p></details>
    <div v-if="state.shared_conditions?.length" class="shared"><h4>本场已接受的共同前提</h4><ul><li v-for="condition in state.shared_conditions" :key="condition.id">{{ condition.label }}</li></ul></div>
    <details v-if="checkpoints.length"><summary>查看各轮立场、共同条件接受人数及未收敛原因</summary><div v-for="point in checkpoints" :key="point.round" class="round-row"><strong>第 {{ point.round }} 轮 · {{ point.converged ? point.convergence_level === 'conditional_consensus' ? '形成条件共识' : '形成共识' : '继续核对条件' }}</strong><div v-for="candidate in point.candidates" :key="candidate.candidate_id"><p>{{ candidate.candidate_id }} · 支持/有条件支持 {{ candidate.supporters.length }}/{{ candidate.total }} · 回应 {{ candidate.responded }}/{{ candidate.total }}<span v-if="candidate.accepted_by"> · 明确接受共同条件 {{ candidate.accepted_by.length }}/{{ candidate.total }}</span></p><p v-for="reason in candidate.reasons || []" :key="reason" class="muted">未收敛原因：{{ reason }}</p><ul><li v-for="(vote, name) in candidate.votes" :key="name">{{ name }}：{{ stances[vote.stance] }} · {{ vote.reason }}<span v-if="vote.conditions">；{{ vote.conditions }}</span><b v-if="vote.blocking"> · 阻断意见</b></li></ul></div></div></details>
    <details v-if="state.extensions?.length"><summary>继续研讨的运行记录</summary><p v-for="(extension, i) in state.extensions" :key="i">第{{ extension.after_round }}轮 → 第{{ extension.next_round }}轮：{{ extension.reason }}；{{ extension.added_source_ids?.length ? `新增${extension.added_source_ids.length}条依据` : '复核已有一手原文并定向确认条件' }}。</p></details>
    <details v-if="state.candidates?.length"><summary>当前方案与基线比较（{{ state.candidates.length }}）</summary><p v-if="state.candidate_revision_note" class="muted">{{ state.candidate_revision_note }}</p><div v-for="candidate in state.candidates" :key="candidate.id" class="candidate"><h4>{{ candidate.id }} · {{ candidate.title }}</h4><dl><div v-for="(label, key) in candidateFields" :key="key"><dt>{{ label }}</dt><dd>{{ candidate[key] || '尚未提供' }}</dd></div></dl><small>事实依据：{{ candidate.source_ids?.join('、') || '未登记' }} · 方法出处：{{ candidate.method_source_ids?.join('、') || '见各Agent方法应用' }}</small></div></details>

    <template v-if="gate"><details><summary>公开研判检查 {{ passedChecks }}/{{ gate.checks?.length || 0 }} · 查看逐项依据</summary><div class="check-grid"><span v-for="check in gate.checks || []" :key="check.id" :class="{ pass: check.passed }">{{ check.passed ? '通过' : '需补充' }} · {{ check.label }}</span></div><p class="muted">{{ gate.note }}</p><ul v-if="gate.review?.major_concerns?.length" class="concerns"><li v-for="text in gate.review.major_concerns" :key="text">{{ text }}</li></ul></details></template>
    <details v-if="executionRequirements.length"><summary>企业执行前提（{{ executionRequirements.length }}）· 与公开研判分开</summary><p class="muted">公开披露已经用于分析。真正采购或切换路线前，由对应业务方确认这些具体事项。</p><ul><li v-for="text in executionRequirements" :key="text">{{ text }}</li></ul></details>
    <details v-if="decision && Object.keys(decision).length"><summary>结论、增量价值与反证</summary><p><strong>{{ supported ? '公开证据支持的研判' : '结论草案与待解决问题' }}</strong> {{ decision.rationale }}</p><ul><li v-for="(claim, i) in decision.claims || []" :key="i">{{ claim.statement }} <small>[{{ (claim.source_ids || []).join('、') || '未列出处' }}]</small></li></ul><p v-if="decision.innovation?.difference_from_baseline"><strong>相对基线的增量：</strong>{{ decision.innovation.difference_from_baseline }}；价值：{{ decision.innovation.value }}；反例：{{ decision.innovation.counterexample }}；验证：{{ decision.innovation.validation }}</p><p v-for="text in decision.dissent || []" :key="text">保留分歧：{{ text }}</p></details>
    <p class="muted method-note">各Agent按真实学者的公开方法执行分析，所用步骤、方法原文和数据会在对应发言下展开；AI生成发言，学者本人未参与。</p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ seminar: { type: Object, required: true } })
const config = computed(() => props.seminar.deliberation_policy || {})
const adaptive = computed(() => config.value.version === 'evidence-deliberation-v2')
const state = computed(() => props.seminar.deliberation || {})
const gate = computed(() => props.seminar.quality_gate)
const decision = computed(() => props.seminar.decision_record)
const supported = computed(() => ['research_supported', 'ready_for_human_review'].includes(gate.value?.status))
const statusLabel = computed(() => supported.value ? '公开研判已形成' : gate.value ? '公开论证尚需完善' : state.value.converged ? '共同条件已确认 · 正在审查' : props.seminar.resume_from_round ? '补证与定向复议中' : '研讨中')
const primary = computed(() => (props.seminar.evidence || []).filter(row => ['primary_public', 'issuer_rns_transcript'].includes(row.source_type) && row.eligible_for_claims))
const featuredEvidence = computed(() => primary.value.filter(row => ['KAP-CHINA-TITR-WEST-2025-021', 'KAP-CNUC-ALASHANKOU-013', 'CN-ALASHANKOU-BONDED-2023-003', 'CN-ALASHANKOU-IMPORT-2023-004', 'KAP-CHINA-TIME-015', 'KAP-CHINA-RAIL-2024-012'].includes(row.id)))
const calculations = computed(() => (props.seminar.evidence || []).filter(row => row.source_type === 'derived_public'))
const checkpoints = computed(() => (state.value.checkpoints || []).filter(row => row.stage === 'converging' && (!adaptive.value || row.normalization === 'condition_ids')))
const executionRequirements = computed(() => gate.value?.execution_requirements || decision.value?.execution_requirements || [])
const passedChecks = computed(() => (gate.value?.checks || []).filter(row => row.passed).length)
const stances = { support: '支持', conditional: '有条件支持', oppose: '反对', insufficient: '证据不足' }
const candidateFields = { baseline: '公开基线', difference: '增量', benefit: '预期价值', cost: '代价', constraint: '适用条件', falsifier: '可推翻结论的反例', test: '验证办法' }
const factValue = (year, field) => primary.value.find(row => row.id === `KAP-FY${String(year).slice(-2)}-STOCK-${year === 2024 ? '002' : '001'}`)?.facts?.find(row => row.field === field)?.value ?? '未载入'
const inventory = year => factValue(year, 'Group finished goods inventory')
const sales = year => factValue(year, 'Consolidated sales volume')
</script>

<style scoped>
.protocol-card{margin:14px 0;padding:18px 20px;background:#fff;border:1px solid #d6e4fb;border-radius:12px;color:#3f5573;font-size:12px;line-height:1.7;overflow-wrap:anywhere}.protocol-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.protocol-head h3{margin:0;color:#184a85;font-size:15px}.protocol-head>span{padding:3px 10px;border-radius:12px;color:#986500;background:#fff4d8}.protocol-head>span.ready{background:#e8f6ef;color:#277155}.protocol-flow{color:#2163ae;font-weight:600}.protocol-card details{border-top:1px solid #edf2f9;margin-top:10px;padding-top:9px}.protocol-card summary{cursor:pointer;color:#1d5f9e;font-weight:600}.round-row,.candidate{border-left:3px solid #d8e6fa;padding-left:12px;margin:12px 0}.candidate h4,h4{margin:9px 0;color:#215287}.candidate dl>div{display:flex;gap:12px;margin:4px 0}.candidate dt{flex:0 0 110px;color:#70829b}.candidate dd{margin:0}.check-grid,.fact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.check-grid>span{padding:6px 10px;background:#fff7e9;border-radius:5px;color:#906519}.check-grid>span.pass{background:#eef8f2;color:#367453}.fact-grid>div{padding:12px;background:#f3f8ff;border:1px solid #dce9fb;border-radius:8px}.fact-grid p{margin:5px 0}.muted,small{color:#7c8ba0}.concerns{color:#946512}.protocol-card ul{padding-left:20px}.controller{padding:10px 12px;background:#f6f9fe;border-radius:7px}.controller p{margin:3px 0}.calculation{padding:10px 12px;background:#f0f8f5;border-left:3px solid #6aab95}.protocol-card a{color:#1d65b2}.method-note{margin:14px 0 0;font-size:11px}@media(max-width:720px){.check-grid,.fact-grid{grid-template-columns:1fr}.candidate dl>div{display:block}}
</style>
