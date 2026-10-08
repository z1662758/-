<template>
  <section v-if="plan" class="exp-plan-strip">
    <div class="eps-head">
      <span class="eps-badge">来自对话的实验方案</span>
      <span v-if="scenarioLabel" class="eps-scenario">{{ scenarioLabel }}</span>
      <span v-if="plan.id" class="eps-id">{{ plan.id }}</span>
      <span v-if="statusText" class="eps-status" :data-state="status">{{ statusText }}</span>
      <span v-if="plan.purposeConfirmed === false" class="eps-warn">目的尚未在对话中确认</span>
      <button type="button" class="eps-close" title="收起方案" @click="$emit('dismiss')">&times;</button>
    </div>

    <div class="eps-body">
      <p class="eps-purpose"><b>实验目的</b>{{ plan.purpose || '未填写' }}</p>
      <ul class="eps-meta">
        <li>
          <b>干预变量</b>
          <template v-if="applicableLevers.length">
            <span v-for="(lever, index) in applicableLevers" :key="lever.key || lever.label || index"><span v-if="index">；</span>{{ formatLever(lever) }}<em v-if="panelValueOf(lever)" class="eps-panel-value">（面板当前 {{ panelValueOf(lever) }}）</em></span>
          </template>
          <template v-else>未指定（按基线参数运行）</template>
        </li>
        <li><b>对照组</b>{{ plan.control || '沿用基线参数（本次不干预）' }}</li>
        <li><b>目标指标</b>{{ metricText }}</li>
        <li><b>观测轮次</b>{{ roundsText }}</li>
      </ul>
      <p v-if="roundsHint" class="eps-note eps-note--rounds">{{ roundsHint }}</p>
      <p v-if="unlandedText" class="eps-note">以下变量在当前场景的参数面板没有对应输入框，本次不会写入（仅作方案记录）：{{ unlandedText }}</p>
      <p v-if="blockedReason" class="eps-note eps-note--blocked">当前还不能运行：{{ blockedReason }}</p>
    </div>

    <div class="eps-actions">
      <el-button size="small" text type="primary" @click="$emit('edit')">改方案</el-button>
      <el-button size="small" :disabled="loading" @click="$emit('apply')">写入参数面板</el-button>
      <el-button size="small" type="primary" :disabled="running || loading" @click="$emit('run')">按方案运行实验</el-button>
      <span class="eps-tip">{{ tipText }}</span>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  plan: { type: Object, default: null },
  running: { type: Boolean, default: false },
  // 平台正在载入当前场景的基线实验（参数面板还没就绪），此时两个按钮都不可点
  loading: { type: Boolean, default: false },
  // 方案与参数面板的一致性：pending=未写入 / applied=已写入 / drifted=面板已被手动改动
  status: { type: String, default: 'pending' },
  // 平台当前仿真轮数，用于提示方案轮次何时对齐
  currentRounds: { type: Number, default: 0 },
  // 当前场景的参数面板里没有对应输入框的干预变量标签：不会写入，也不参与「是否已按方案写入」的判定
  unlandedLevers: { type: Array, default: () => [] },
  // 干预变量在面板上的当前值（仅当与方案值不同时由页面给出），用于一眼看出量纲 / 基线差异
  panelValues: { type: Object, default: () => ({}) },
  // 还不能运行的真实原因；空串表示可以运行
  blockedReason: { type: String, default: '' }
})
defineEmits(['apply', 'run', 'edit', 'dismiss'])

const SCENARIO_LABELS = { uranium: '铀供应链', supply_chain: '汽车供应链' }
const scenarioLabel = computed(() => SCENARIO_LABELS[props.plan && props.plan.scenario] || '')

const levers = computed(() => (Array.isArray(props.plan && props.plan.levers) ? props.plan.levers : []))

const formatLever = (lever) => {
  const label = lever.label || lever.key
  const value = Array.isArray(lever.value) ? lever.value.join(' ~ ') : lever.value
  const unit = lever.unit || ''
  return label + ' = ' + value + unit
}

const applicableLevers = computed(() => levers.value.filter((item) => item.mappable !== false))

// 面板当前值只在确实与方案值不同时展示，避免"1 倍 vs 1"这种噪声对比
const panelValueOf = (lever) => {
  const key = lever && lever.key
  if (!key) return ''
  return (props.panelValues && props.panelValues[key]) || ''
}

const unlandedText = computed(() => (Array.isArray(props.unlandedLevers) ? props.unlandedLevers : []).join('；'))

const metricText = computed(() => {
  const metrics = Array.isArray(props.plan && props.plan.metrics) ? props.plan.metrics : []
  if (!metrics.length) return '未指定'
  return metrics.map((item) => item.label || item.key).join(' / ')
})

const roundsText = computed(() => {
  const rounds = props.plan && props.plan.rounds
  return rounds ? rounds + ' 轮' : '跟随基线实验轮数'
})

const STATUS_TEXT = {
  pending: '面板尚未按方案写入',
  applied: '已写入参数面板',
  drifted: '面板已被手动改动，与方案不一致'
}
const statusText = computed(() => STATUS_TEXT[props.status] || '')

const tipText = computed(() => {
  if (props.blockedReason) return '点「按方案运行实验」会先自动补齐上面的前置条件，再提交后端'
  if (props.status === 'drifted') return '面板当前值已偏离方案，点「写入参数面板」可恢复为方案值'
  if (props.status === 'applied') return '已按方案写入，可在左侧「可修改实验参数」复核，再点运行提交后端'
  return '面板当前值不是方案值，点「写入参数面板」按方案对齐后，再点运行提交后端'
})

// 方案的观测轮次与平台当前轮数不一致时提前说清，避免用户以为方案没生效
const roundsHint = computed(() => {
  const rounds = props.plan && props.plan.rounds
  const current = Number(props.currentRounds) || 0
  if (!rounds || !current || Number(rounds) === current) return ''
  return '当前页面按基线 ' + current + ' 轮运行，写入参数面板后对齐为方案的 ' + rounds + ' 轮。'
})
</script>

<style scoped>
.exp-plan-strip {
  margin: 0 0 14px; padding: 12px 16px;
  border: 1px solid #bbf7d0; border-left: 3px solid #047857; border-radius: 10px;
  background: linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%);
}
.eps-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.eps-badge {
  padding: 3px 8px; border-radius: 999px; background: #d1fae5; color: #065f46;
  font-size: 11.5px; font-weight: 600;
}
.eps-scenario { color: #047857; font-size: 12px; }
.eps-id { color: #6b7280; font-size: 11.5px; font-family: ui-monospace, Menlo, Consolas, monospace; }
.eps-warn { color: #b45309; font-size: 11.5px; }
.eps-status {
  padding: 2px 8px; border-radius: 999px;
  background: #e5e7eb; color: #4b5563; font-size: 11.5px; font-weight: 600;
}
.eps-status[data-state='applied'] { background: #d1fae5; color: #065f46; }
.eps-status[data-state='drifted'] { background: #fde68a; color: #92400e; }
.eps-close {
  margin-left: auto; width: 24px; height: 24px; border: none; border-radius: 50%;
  background: transparent; color: #9ca3af; font-size: 16px; line-height: 1; cursor: pointer;
}
.eps-close:hover { background: #d1fae5; color: #047857; }
.eps-purpose { margin: 8px 0 6px; color: #1f2937; font-size: 13.5px; line-height: 1.5; }
.eps-purpose b, .eps-meta b { margin-right: 8px; color: #065f46; font-weight: 600; }
.eps-meta {
  display: flex; flex-wrap: wrap; gap: 6px 20px; margin: 0; padding: 0; list-style: none;
  color: #374151; font-size: 12.5px;
}
.eps-note { margin: 6px 0 0; color: #b45309; font-size: 12px; }
.eps-note--rounds { color: #4338ca; }
.eps-note--blocked { color: #b45309; font-weight: 600; }
.eps-panel-value { margin-left: 4px; color: #6b7280; font-style: normal; font-size: 11.5px; }
.eps-actions { display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
.eps-tip { color: #6b7280; font-size: 11.5px; }
</style>
