<template>
  <div class="research-data">
    <div class="data-meta"><label v-for="field in meta" :key="field.id">{{ field.label }}<input :value="modelValue[field.id]" @input="set(field.id, $event.target.value)" :placeholder="field.hint"></label></div>
    <div class="data-values"><label v-for="field in fields" :key="field.id">{{ field.label }}<small>{{ field.unit }}</small><input type="number" min="0" step="any" :value="modelValue.values?.[field.id] ?? ''" @input="setValue(field.id, $event.target.value)" placeholder="缺失可留空"></label><label>供应份额<small>0–1小数，合计为1</small><input :value="(modelValue.values?.supplier_shares || []).join(', ')" @input="setShares($event.target.value)" placeholder="例如：0.5, 0.3, 0.2"></label></div>
    <p class="data-note">同一对象、同一时间窗口、相同计量单位；填写数值后必须注明来源和时间。留空会显示数据不足。</p>
    <label class="data-upload">导入单条 JSON 数据<input type="file" accept=".json" @change="importData"></label><p v-if="fileError" class="data-error">{{ fileError }}</p>
    <details class="data-format"><summary>数据格式说明</summary><pre>{{ JSON.stringify({ object: '研究对象', source: '实际数据出处', window: '分析时间窗口', values: { inventory: null, daily_demand: null, window_demand: null, effective_supply: null, supplier_shares: [] } }, null, 2) }}</pre><p>数值按上方单位填写，不自动转换单位。</p></details>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue'
const props = defineProps({ modelValue: { type: Object, default: () => ({ values: {} }) }, unit: { type: String, default: 'tU' } })
const emit = defineEmits(['update:modelValue'])
const fileError = ref('')
const meta = [{ id: 'object', label: '研究对象', hint: '例如：某采购方案' }, { id: 'source', label: '数据来源', hint: '文件名或公开资料出处' }, { id: 'window', label: '时间窗口', hint: '例如：2026年第四季度' }]
const fields = computed(() => [{ id: 'inventory', label: '可用库存', unit: props.unit }, { id: 'daily_demand', label: '日均需求', unit: `${props.unit}/天` }, { id: 'window_demand', label: '窗口需求量', unit: props.unit }, { id: 'effective_supply', label: '窗口有效供给', unit: props.unit }])
const set = (key, value) => emit('update:modelValue', { ...props.modelValue, unit: props.unit, [key]: value })
function setValue(key, value) { set('values', { ...props.modelValue.values, [key]: value === '' ? null : Number(value) }) }
function setShares(text) { set('values', { ...props.modelValue.values, supplier_shares: text.trim() ? text.split(/[,，\s]+/).filter(Boolean).map(Number) : null }) }
async function importData(event) {
  fileError.value = ''
  const file = event.target.files?.[0]
  if (!file) return
  try {
    if (file.size > 1024 * 1024) throw new Error('文件不能超过1MB')
    const value = JSON.parse(await file.text())
    if (!value || typeof value !== 'object' || Array.isArray(value) || !value.values || typeof value.values !== 'object' || Array.isArray(value.values)) throw new Error('请导入格式说明中的单条数据对象')
    const values = {}
    for (const key of ['inventory', 'daily_demand', 'window_demand', 'effective_supply', 'supplier_shares']) if (value.values[key] != null) values[key] = value.values[key]
    if (values.supplier_shares && !Array.isArray(values.supplier_shares)) throw new Error('供应份额须为数组')
    if (value.unit && value.unit !== props.unit) throw new Error(`文件单位 ${value.unit} 与当前 ${props.unit} 不同，请先转换或选择匹配的模型`)
    emit('update:modelValue', { object: String(value.object || ''), source: String(value.source || file.name), window: String(value.window || ''), unit: props.unit, values })
  } catch (error) { fileError.value = error.message || '数据导入失败' }
  event.target.value = ''
}
</script>
<style scoped>
.data-meta,.data-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:10px 0}.research-data label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#405772}.research-data input{width:100%;box-sizing:border-box;min-width:0;border:1px solid #d9e5f3;border-radius:7px;padding:9px;font:inherit;color:#193956;background:white}.research-data small,.data-note,.data-format{color:#74879e;font-size:11px}.data-note{line-height:1.7}.data-error{color:#c63e3e;font-size:12px}.data-upload{max-width:300px}.data-format{margin-top:12px}.data-format summary{cursor:pointer}.data-format pre{white-space:pre-wrap;background:#f6f9fd;padding:10px;border-radius:7px}@media(max-width:700px){.data-meta,.data-values{grid-template-columns:1fr 1fr}}@media(max-width:450px){.data-meta,.data-values{grid-template-columns:1fr}}
</style>
