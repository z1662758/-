<template>
  <section class="prw">
    <header class="prw-head">
      <div class="prw-head-main">
        <p class="prw-eyebrow">POST REVIEW WORKSPACE</p>
        <h2 class="prw-title">事后复盘工作台</h2>
      </div>
      <span class="prw-count">{{ progress.done }}/{{ progress.total }}</span>
    </header>

    <div class="prw-progress">
      <div class="prw-progress-bar"><span :style="{ width: progress.percent + '%' }"></span></div>
      <span class="prw-progress-text">{{ progress.percent }}%</span>
    </div>

    <div class="prw-body">
      <!-- 阶段操作：把事后闭环的五个环节摆在同一屏，可直接进页面或就地咨询 -->
      <section class="prw-block">
        <header class="prw-block-head">
          <p class="prw-block-eyebrow">POST ACTIONS</p>
          <h3 class="prw-block-title">事后复盘阶段操作</h3>
        </header>
        <div class="prw-actions">
          <article v-for="action in actions" :key="action.key" class="prw-action" :class="{ 'is-ready': action.ready }">
            <div class="prw-action-head">
              <span class="prw-action-icon">{{ action.icon }}</span>
              <span class="prw-action-title">{{ action.label }}</span>
              <span class="prw-action-state" :data-state="action.state">{{ stateText(action) }}</span>
            </div>
            <p class="prw-action-desc">{{ action.desc }}</p>
            <div class="prw-action-btns">
              <button type="button" class="prw-btn" @click="$emit('consult', action)">咨询</button>
              <button type="button" class="prw-btn is-primary" @click="$emit('enter', action)">进入</button>
            </div>
          </article>
        </div>
      </section>

      <!-- 参数展示列表：只展示对话与方案里真实存在的取值，没有的写「待生成」 -->
      <section class="prw-block">
        <header class="prw-block-head is-row">
          <div>
            <p class="prw-block-eyebrow">PARAMETERS</p>
            <h3 class="prw-block-title">参数展示列表</h3>
          </div>
          <span class="prw-scenario">{{ scenarioLabel || '--' }}</span>
        </header>
        <div class="prw-table">
          <div class="prw-tr prw-tr--head">
            <span>类型</span><span>参数</span><span>当前值</span>
          </div>
          <template v-for="group in parameters" :key="group.group">
            <div v-for="(item, index) in group.items" :key="group.group + '-' + item.label" class="prw-tr">
              <span class="prw-td-type">{{ index === 0 ? group.group : '' }}</span>
              <span class="prw-td-label" :title="item.label">{{ item.label }}</span>
              <span class="prw-td-value" :class="{ 'is-pending': item.pending }" :title="item.value">{{ item.value }}</span>
            </div>
          </template>
        </div>
      </section>

      <!-- Agent 执行：事后阶段右侧只剩工作台，这里保留原先执行面板的状态与工具进度 -->
      <section v-if="agent.visible" class="prw-block">
        <header class="prw-block-head">
          <p class="prw-block-eyebrow">AGENT RUN</p>
          <h3 class="prw-block-title">Agent 执行</h3>
        </header>
        <div class="prw-agent">
          <span class="prw-agent-dot" :data-state="agent.state"></span>
          <span class="prw-agent-status">{{ agent.status }}</span>
        </div>
        <div v-if="agent.tools.length" class="prw-agent-tools">
          <div v-for="tool in agent.tools" :key="tool.call_id" class="prw-agent-tool" :data-status="tool.status">
            <span class="prw-agent-tool-dot"></span>
            <span class="prw-agent-tool-name">{{ tool.name }}</span>
            <span class="prw-agent-tool-state">{{ toolStateText(tool.status) }}</span>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
defineProps({
  // [{ key, icon, label, desc, state, ready, path }]
  actions: { type: Array, default: () => [] },
  // { done, total, percent }
  progress: { type: Object, default: () => ({ done: 0, total: 0, percent: 0 }) },
  // [{ group, items: [{ label, value, pending }] }]
  parameters: { type: Array, default: () => [] },
  scenarioLabel: { type: String, default: '' },
  // { visible, state, status, tools: [{ call_id, name, status }] }
  agent: { type: Object, default: () => ({ visible: false, state: 'idle', status: '', tools: [] }) }
})

defineEmits(['consult', 'enter'])

const STATE_TEXT = { done: '已完成', ready: '可进入', waiting: '待运行' }
const stateText = (action) => STATE_TEXT[action && action.state] || '待运行'
const TOOL_STATE_TEXT = { running: '执行中…', done: '完成', error: '失败' }
const toolStateText = (status) => TOOL_STATE_TEXT[status] || '--'
</script>

<style scoped>
.prw { display: flex; flex-direction: column; height: 100%; min-height: 0; background: #f7f8fa; font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }

.prw-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 16px 20px 12px; background: #fff; border-bottom: 1px solid #eef0f4; }
.prw-head-main { min-width: 0; }
.prw-eyebrow { margin: 0; font-size: 10.5px; font-weight: 700; letter-spacing: 0.1em; color: #9aa3af; }
.prw-title { margin: 4px 0 0; font-size: 19px; font-weight: 700; color: #111827; }
.prw-count { flex-shrink: 0; padding: 3px 12px; border-radius: 999px; background: #eef2ff; color: #4f46e5; font-size: 12.5px; font-weight: 700; }

.prw-progress { display: flex; align-items: center; gap: 10px; padding: 10px 20px 12px; background: #fff; border-bottom: 1px solid #eef0f4; }
.prw-progress-bar { flex: 1; min-width: 0; height: 6px; border-radius: 999px; background: #eceef2; overflow: hidden; }
.prw-progress-bar span { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #6366f1, #22c55e); transition: width 0.3s ease; }
.prw-progress-text { flex-shrink: 0; font-size: 12px; font-weight: 700; color: #6b7280; }

.prw-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 14px; }
.prw-block { border: 1px solid #e8eaef; border-radius: 12px; background: #fff; }
.prw-block-head { padding: 12px 16px; border-bottom: 1px solid #f1f3f7; }
.prw-block-head.is-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.prw-block-eyebrow { margin: 0; font-size: 10.5px; font-weight: 700; letter-spacing: 0.1em; color: #9aa3af; }
.prw-block-title { margin: 3px 0 0; font-size: 15px; font-weight: 700; color: #111827; }
.prw-scenario { flex-shrink: 0; padding: 3px 10px; border-radius: 999px; background: #f3f4f6; color: #4b5563; font-size: 11.5px; font-weight: 600; }

/* 列数跟着面板实际宽度走：宽面板两列，被压窄时自动回落成一列，不把卡片挤成一条 */
.prw-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; padding: 12px; }
.prw-action { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid #e8eaef; border-radius: 10px; background: #fff; }
.prw-action.is-ready { border-color: #dbe4ff; background: #fbfcff; }
.prw-action-head { display: flex; align-items: center; gap: 7px; }
.prw-action-icon { flex-shrink: 0; font-size: 15px; line-height: 1; }
.prw-action-title { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 700; color: #111827; }
.prw-action-state { flex-shrink: 0; padding: 1px 7px; border-radius: 999px; font-size: 10.5px; font-weight: 700; background: #f3f4f6; color: #9ca3af; }
.prw-action-state[data-state="done"] { background: #ecfdf5; color: #059669; }
.prw-action-state[data-state="ready"] { background: #eef2ff; color: #4f46e5; }
.prw-action-desc { flex: 1; margin: 0; font-size: 12px; line-height: 1.6; color: #6b7280; }
.prw-action-btns { display: flex; gap: 8px; }
.prw-btn { flex: 1; padding: 6px 0; border: 1px solid #dfe3ea; border-radius: 8px; background: #fff; color: #4b5563; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease; }
.prw-btn:hover { border-color: #b9c3d6; color: #1f2937; }
.prw-btn.is-primary { border-color: #c7d2fe; background: #eef2ff; color: #4338ca; }
.prw-btn.is-primary:hover { background: #e0e7ff; }

.prw-table { padding: 6px 0 8px; }
.prw-tr { display: grid; grid-template-columns: 70px minmax(0, 1fr) 100px; gap: 8px; align-items: center; padding: 8px 16px; border-top: 1px solid #f4f6fa; }
.prw-tr--head { border-top: none; padding-bottom: 6px; font-size: 11px; font-weight: 700; color: #9aa3af; }
.prw-td-type { font-size: 11.5px; font-weight: 600; color: #6b7280; }
.prw-td-label, .prw-td-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prw-td-label { font-size: 12px; color: #374151; }
.prw-td-value { font-size: 12px; font-weight: 600; color: #111827; }
.prw-td-value.is-pending { font-weight: 500; color: #b6bcc7; }

.prw-agent { display: flex; align-items: center; gap: 8px; padding: 8px 12px; font-size: 12px; color: #374151; }
.prw-agent-dot { flex-shrink: 0; width: 8px; height: 8px; border-radius: 50%; background: #d1d5db; }
.prw-agent-dot[data-state="running"] { background: #f59e0b; animation: prwPulse 1s ease-in-out infinite; }
.prw-agent-dot[data-state="done"] { background: #10b981; }
.prw-agent-dot[data-state="error"] { background: #ef4444; }
@keyframes prwPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.prw-agent-tools { display: flex; flex-direction: column; gap: 4px; padding: 0 12px 10px; }
.prw-agent-tool { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #4b5563; }
.prw-agent-tool-dot { flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: #d1d5db; }
.prw-agent-tool[data-status="running"] .prw-agent-tool-dot { background: #f59e0b; }
.prw-agent-tool[data-status="done"] .prw-agent-tool-dot { background: #10b981; }
.prw-agent-tool[data-status="error"] .prw-agent-tool-dot { background: #ef4444; }
.prw-agent-tool-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prw-agent-tool-state { flex-shrink: 0; font-size: 11px; color: #9ca3af; }
.prw-agent-tool[data-status="running"] .prw-agent-tool-state { color: #d97706; }
.prw-agent-tool[data-status="done"] .prw-agent-tool-state { color: #059669; }
</style>
