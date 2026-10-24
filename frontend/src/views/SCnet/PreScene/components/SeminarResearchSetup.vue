<template>
<section class="research-setup">
  <div class="heading"><h2>研究方式</h2><span>独立专家 Agent · 专业模型实验</span></div>
  <div class="choices"><label><input type="radio" :checked="modelValue.mode === 'discussion'" @change="set('mode', 'discussion')">直接研讨</label><label><input type="radio" :checked="modelValue.mode === 'experiment'" @change="set('mode', 'experiment')">先研究实验再研讨</label></div>
  <template v-if="modelValue.mode === 'experiment'">
    <div class="guide"><strong>填写议题后，点击下方“开始研究研讨”即可</strong><p>每位专家独立检索资料、提出假设、自主调用专业模型，评估实际结果后决定继续实验或进入讨论。系统读取已有数据，无需逐位填写。</p></div>
    <p v-if="loading" class="hint">正在匹配系统已有数据…</p>
    <p v-if="error" class="error">{{ error }} <button type="button" @click="loadDefaults">重新读取数据</button></p>
    <div class="summary"><strong>系统资料 + 证据路线网络 + 贸易数据 + 事件快照 + 历史序列</strong><p>启动时冻结本场模型输入，各专家拥有独立研究状态和资料范围；工具权限按专业职责分配。</p><small>专业模型保留原有成熟度与数据局限。贸易代理流不是实际物理运力，风险分不是概率，历史序列不是当前行情。</small></div>
    <div class="resources"><div v-for="name in names" :key="name"><strong>{{ name }}</strong><span>{{ resources(name).knowledge_ids?.length || 0 }} 条已有资料 · {{ (resources(name).tools || []).map(toolLabel).join('、') || '匹配工具中' }}</span></div></div>
    <details class="advanced"><summary>可选设置：扰动假设、模型范围与本体关联</summary>
      <div class="settings"><label>默认供应扰动幅度（%）<input type="number" min="0" max="100" :value="effectivePercent" @input="set('perturbation', Number($event.target.value))"></label></div>
      <label class="check"><input type="checkbox" :checked="modelValue.auto_run" @change="set('auto_run', $event.target.checked)">自动开始专家自主研究</label><p class="hint">取消勾选会先准备各专家与数据快照，点击“启动专家研究并进入研讨”后执行。每位专家最多 3 次模型实验、6 次研究决策；达到上限会标记研究受限。</p>
      <div class="choices"><label v-for="tool in tools" :key="tool.id" :title="tool.method + '；' + tool.maturity"><input type="checkbox" :checked="modelValue.tools.includes(tool.id)" @change="toggleTool(tool.id)">{{ tool.label }}</label></div><p v-if="!modelValue.tools.length" class="hint">默认开放各专家职责内的全部模型，由专家自主选择；勾选后限制本场可用范围。</p>
      <label class="check"><input type="checkbox" :checked="modelValue.use_ontology" @change="set('use_ontology', $event.target.checked)">查看本体关联线索</label><input v-if="modelValue.use_ontology" class="query" :value="modelValue.ontology_query" @input="set('ontology_query', $event.target.value)" placeholder="可选：关注对象；默认从议题匹配">
    </details>
  </template>
</section>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getSeminarResearchCatalog, getSeminarResearchDefaults } from '@/api/expertSeminar'
const props = defineProps({ modelValue: { type: Object, required: true }, names: { type: Array, default: () => [] }, profiles: { type: Array, default: () => [] }, scenario: { type: String, default: 'uranium' }, question: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
const catalog = ref({ models: [], tools: [] })
const defaults = ref({ resources: {}, summary: null })
const loading = ref(false), error = ref('')
let timer, revision = 0
const tools = computed(() => catalog.value.agent_tools || [])
const set = (key, value) => emit('update:modelValue', { ...props.modelValue, engine: 'expert_agents_v1', ...(key === 'perturbation' ? { perturbation_source: 'user' } : {}), [key]: value })
const effectivePercent = computed(() => props.modelValue.perturbation_source !== 'user' && defaults.value.summary?.requested_percent != null ? defaults.value.summary.requested_percent : props.modelValue.perturbation)
const resources = name => defaults.value.resources?.[name] || {}
const toolLabel = id => tools.value.find(row => row.id === id)?.label || id
function toggleTool(id) { set('tools', props.modelValue.tools.includes(id) ? props.modelValue.tools.filter(key => key !== id) : [...props.modelValue.tools, id]) }
async function loadDefaults() {
  const current = ++revision; loading.value = true
  try { const response = await getSeminarResearchDefaults(props.scenario, props.question); if (current === revision) { defaults.value = response.data || response; error.value = '' } }
  catch (err) { if (current === revision) error.value = err.message || '系统数据读取失败' }
  finally { if (current === revision) loading.value = false }
}
watch(() => props.scenario, () => { emit('update:modelValue', { ...props.modelValue, model_id: '', model_version: undefined, unit: '', expert_data: {}, tools: [] }); loadDefaults() })
watch(() => props.question, () => { clearTimeout(timer); timer = setTimeout(loadDefaults, 700) })
onMounted(async () => { try { const response = await getSeminarResearchCatalog(); catalog.value = response.data || response } catch (err) { error.value = err.message }; await loadDefaults() })
onBeforeUnmount(() => { clearTimeout(timer); revision++ })
</script>
<style scoped>
.research-setup{padding:22px 24px;background:white;border:1px solid #dbe6f5;border-radius:13px;margin:16px 0}.heading{display:flex;justify-content:space-between;gap:12px;align-items:center}.heading h2{font-size:16px;margin:0}.heading span,.hint{font-size:12px;color:#71839d;line-height:1.7}.choices{display:flex;gap:20px;flex-wrap:wrap;margin:15px 0}.choices label,.check{display:flex;align-items:center;gap:6px;font-size:13px;color:#294c70}.guide{background:#eff6ff;border:1px solid #dce9ff;border-radius:9px;padding:14px;color:#28588b;font-size:13px}.guide p{margin:7px 0 0;line-height:1.8}.summary{padding:14px 0;font-size:13px;color:#32577c}.summary p,.summary small{font-size:11px;color:#778ca5;line-height:1.7;margin:5px 0;overflow-wrap:anywhere}.resources>div{display:flex;gap:16px;align-items:center;padding:10px 0;border-bottom:1px solid #edf1f7;font-size:12px}.resources span{color:#7288a2}.advanced{margin-top:18px}.advanced>summary{font-size:12px;color:#416d9a;cursor:pointer}.settings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:15px 0}.settings label{font-size:12px;display:flex;flex-direction:column;gap:7px;color:#405772}.settings input,.settings select,.query{box-sizing:border-box;min-width:0;padding:10px;border:1px solid #d9e5f3;border-radius:7px;background:#fff;font:inherit;color:#193956}.query{width:100%;margin:10px 0}.dataset{border:1px solid #e1eaf5;border-radius:8px;padding:12px;margin-top:10px}.dataset summary{font-size:13px;color:#245489;cursor:pointer}.error{color:#bf3636;font-size:12px}@media(max-width:700px){.settings{grid-template-columns:1fr}.heading,.resources>div{align-items:flex-start;flex-direction:column}}
</style>

