<template>
  <div class="agent-grid">
    <article v-for="agent in Object.values(agents || {})" :key="agent.agent_id" class="agent-card">
      <header><strong>{{ agent.expert }}</strong><span :class="['badge', agent.status]">{{ statuses[agent.status] || agent.status }}</span></header>
      <div class="stats">模型实验 {{ agent.model_runs }} / {{ agent.max_model_runs }} · 研究决策 {{ agent.turns }} / {{ agent.max_turns }} · 检索资料 {{ agent.retrieved_sources?.length || 0 }} 条</div>
      <p v-if="agent.hypotheses?.length"><b>当前假设：</b>{{ agent.hypotheses.at(-1).hypothesis }}</p>
      <p v-if="agent.summary"><b>结果评估：</b>{{ agent.summary }}</p>
      <p v-if="agent.stop_reason" class="reason"><b>结束原因：</b>{{ agent.stop_reason }}</p>
      <details><summary>资料范围与工具权限</summary><p>{{ (agent.allowed_tools || []).map(label).join('、') }}</p><ul><li v-for="source in agent.retrieved_sources" :key="source.id">{{ source.title }}</li></ul><small>仅检索分配给本专家的资料。研究上下文与工作记忆独立，实验卡在讨论阶段共享复核。</small></details>
      <details v-if="agent.activities?.length"><summary>研究记录（{{ agent.activities.length }}）</summary><ol><li v-for="(event, index) in agent.activities" :key="index"><span class="time">{{ event.created_at?.slice(11, 19) }}</span> {{ event.description }}<span v-if="event.action"> · {{ event.action === 'finish' ? '结束研究' : '继续实验' }}</span><button v-if="event.experiment_id" type="button" @click="$emit('open-experiment', event.experiment_id)">查看实验</button><pre v-if="event.parameters">{{ JSON.stringify(event.parameters, null, 2) }}</pre></li></ol></details>
    </article>
  </div>
</template>
<script setup>
defineProps({ agents: Object })
defineEmits(['open-experiment'])
const statuses = { ready: '等待研究', researching: '自主研究中', completed: '研究完成', limited: '研究受限', failed: '研究失败' }
const labels = { analyze_procurement: '逐日采购量与到货压力复算', assess_risk: '风险模型链', analyze_flow: '供应流与最小割', analyze_resilience: 'N−1 / N−k韧性', analyze_criticality: '网络关键性', simulate_events: '事件情景推演', compare_routes: '替代与来源路线', analyze_market: '市场拐点与周期' }
const label = id => labels[id] || id
</script>
<style scoped>
.agent-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:12px;margin:16px 0}.agent-card{border:1px solid #dce6f3;border-radius:10px;padding:16px;background:#fbfdff;font-size:12px;color:#36536e}.agent-card header{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px}.badge{border-radius:12px;padding:4px 9px;background:#edf1f6;color:#667b90;font-size:11px}.researching{background:#e6f0ff;color:#2265bc}.completed{background:#e2f5eb;color:#178153}.limited,.failed{background:#fff1df;color:#a56c17}.stats,.time,small{font-size:11px;color:#7c8fa6}.stats{margin-top:12px}.agent-card p{line-height:1.8;overflow-wrap:anywhere}.agent-card details{margin-top:12px}.agent-card summary{cursor:pointer;color:#386d9c}.agent-card li{line-height:1.8;margin:8px 0}.agent-card ol,.agent-card ul{padding-left:18px;max-height:290px;overflow:auto}.reason{color:#7b6c4d}.agent-card pre{background:#eff4fa;padding:8px;white-space:pre-wrap}.agent-card button{margin-left:8px;color:#2168bc;border:0;background:transparent;cursor:pointer;font-size:11px}
</style>
