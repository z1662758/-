<template>
  <section class="mup">
    <header class="mup-head">
      <h4 class="mup-title">本次研判实际使用的模型</h4>
      <span v-if="view.hasRuns" class="mup-count">
        关联快照运行 <b>{{ view.summary.usedCount }}</b> 个模型
        <template v-if="view.cardsLoaded">
          · 注册表登记 <b>{{ view.summary.registeredCount }}</b> 个
          <template v-if="view.summary.unusedCount">
            ，其中 <b class="is-unused">{{ view.summary.unusedCount }}</b> 个本任务未运行
          </template>
        </template>
      </span>
    </header>

    <p class="mup-note">
      模型名称、作用、输入输出取自模型注册表；运行状态取自本次研判关联快照的执行记录。
      这是领域模型快照的执行链，不代表大模型逐个调用了这些模型。注册表里有但该快照没跑的模型单独列出。
    </p>

    <!-- 完全没有执行记录 -->
    <div v-if="!view.hasRuns" class="mup-empty">暂无模型运行记录</div>

    <template v-else>
      <!-- 三个关键环节由哪个模型完成 -->
      <div class="mup-steps">
        <article v-for="step in view.keySteps" :key="step.key" class="mup-step" :class="step.tone">
          <div class="mup-step-label">{{ step.label }}</div>
          <div class="mup-step-model">{{ step.name }}</div>
          <div class="mup-step-meta">
            <span v-if="step.version">v{{ step.version }}</span>
            <span class="mup-status" :class="step.tone">{{ step.statusText }}</span>
            <span v-if="step.durationMs != null" class="mup-dur">{{ step.durationMs }}ms</span>
          </div>
          <p class="mup-step-desc">{{ step.desc }}</p>
          <p v-if="step.algorithm" class="mup-step-algo">{{ step.algorithm }}</p>
          <div class="mup-step-io">
            <span><em>输入</em>{{ step.inputEntities.join('、') || '—' }}</span>
            <span><em>输出</em>{{ step.outputEntities.join('、') || '—' }}</span>
          </div>
        </article>
      </div>

      <!-- 本次运行的模型清单 -->
      <div class="mup-table-wrap">
        <table class="mup-table">
          <thead>
            <tr>
              <th class="col-stage">阶段</th>
              <th>模型名称</th>
              <th>作用</th>
              <th>输入 → 输出</th>
              <th class="col-ver">版本</th>
              <th class="col-status">运行状态</th>
              <th class="col-dur">耗时</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in view.used" :key="m.modelId">
              <td class="col-stage">{{ m.stage ?? '—' }}</td>
              <td>
                <div class="mup-name">{{ m.name }}</div>
                <div class="mup-id">{{ m.modelId }}</div>
                <div v-if="!m.hasCard" class="mup-warn">注册表中无此模型卡</div>
              </td>
              <td class="mup-purpose">{{ m.purpose || '暂无模型卡描述' }}</td>
              <td class="mup-io">
                <div>{{ m.inputEntities.join('、') || '—' }}</div>
                <div class="mup-io-out">→ {{ m.outputEntities.join('、') || '—' }}</div>
              </td>
              <td class="col-ver">
                v{{ m.version || '—' }}
                <div v-if="m.registeredVersion && m.registeredVersion !== m.version" class="mup-ver-diff">
                  注册表 v{{ m.registeredVersion }}
                </div>
              </td>
              <td class="col-status">
                <span class="mup-status" :class="m.tone">{{ m.statusText }}</span>
                <div v-if="m.error" class="mup-err">{{ m.error }}</div>
              </td>
              <td class="col-dur">{{ m.durationMs != null ? m.durationMs + 'ms' : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 注册表里有、本次没跑 -->
      <div v-if="view.unused.length" class="mup-unused">
        <div class="mup-unused-title">
          注册表登记但本任务未运行的模型（{{ view.unused.length }} 个）
        </div>
        <div class="mup-unused-list">
          <span v-for="m in view.unused" :key="m.modelId" class="mup-unused-chip">
            {{ m.name }}
            <em>v{{ m.version || '—' }} · {{ m.reason }}</em>
          </span>
        </div>
        <p class="mup-unused-note">
          这些模型本次没有出现在执行记录里，因此不参与本次研判结果，也不计为「已使用」。
        </p>
      </div>
      <div v-else-if="!view.cardsLoaded" class="mup-hint">
        模型注册表暂不可用，无法列出未运行的模型；本次运行的模型清单以上表为准。
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { buildModelChainView } from './modelChainView'

const props = defineProps({
  /** 本次任务的模型执行记录(execution_trace / meta.model_runs) */
  runs: { type: Array, default: () => [] },
  /** 模型注册表的模型卡 */
  cards: { type: Array, default: () => [] },
  /** 注册表是否加载成功 */
  cardsLoaded: { type: Boolean, default: false },
  /** model_chain 摘要 */
  chain: { type: Object, default: null },
})

const view = computed(() =>
  buildModelChainView({
    runs: props.runs,
    cards: props.cards,
    cardsLoaded: props.cardsLoaded,
    chain: props.chain,
  }),
)
</script>

<style scoped>
.mup {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 14px;
}
.mup-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.mup-title { margin: 0; font-size: 12.5px; font-weight: 700; color: #334155; }
.mup-count { font-size: 11.5px; color: #475569; }
.mup-count b { color: #1e293b; }
.mup-count b.is-unused { color: #b45309; }
.mup-note { margin: 6px 0 10px; font-size: 11px; color: #94a3b8; line-height: 1.65; }

.mup-empty {
  padding: 1.6rem 1rem; text-align: center;
  background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;
  font-size: 12.5px; color: #64748b;
}
.mup-hint { margin-top: 8px; font-size: 11px; color: #94a3b8; }

/* 三个关键环节 */
.mup-steps {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(215px, 1fr));
  gap: 10px; margin-bottom: 12px;
}
.mup-step {
  border: 1px solid #e2e8f0; border-left: 3px solid #2563eb;
  border-radius: 10px; padding: 9px 11px; background: #fbfdff;
}
.mup-step.success { border-left-color: #16a34a; }
.mup-step.failed { border-left-color: #dc2626; background: #fffafa; }
.mup-step.warning { border-left-color: #f59e0b; background: #fffdf7; }
.mup-step.unknown { border-left-color: #cbd5e1; background: #fafafa; }
.mup-step-label { font-size: 11px; color: #64748b; font-weight: 700; }
.mup-step-model { font-size: 12.5px; font-weight: 700; color: #1e293b; margin: 2px 0 4px; line-height: 1.45; }
.mup-step-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 11px; color: #64748b; }
.mup-step-desc { margin: 6px 0 0; font-size: 11px; color: #475569; line-height: 1.6; }
.mup-step-algo {
  margin: 5px 0 0; font-size: 10.5px; color: #94a3b8; line-height: 1.55;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-word;
}
.mup-step-io { margin-top: 6px; display: flex; flex-direction: column; gap: 2px; font-size: 10.5px; color: #64748b; }
.mup-step-io em { font-style: normal; color: #94a3b8; margin-right: 5px; }

/* 状态标签 */
.mup-status {
  font-size: 10.5px; font-weight: 700; border-radius: 999px; padding: 1px 7px;
  color: #475569; background: #f1f5f9; white-space: nowrap;
}
.mup-status.success { color: #15803d; background: rgba(22, 163, 74, 0.12); }
.mup-status.failed { color: #b91c1c; background: rgba(220, 38, 38, 0.1); }
.mup-status.warning { color: #b45309; background: rgba(245, 158, 11, 0.14); }

/* 清单表 */
.mup-table-wrap { overflow-x: auto; }
.mup-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.mup-table th {
  text-align: left; font-size: 11px; color: #64748b; font-weight: 700;
  padding: 6px 8px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap;
}
.mup-table td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; line-height: 1.6; }
.mup-table tr:last-child td { border-bottom: none; }
.col-stage { width: 34px; color: #94a3b8; text-align: center; }
.col-ver, .col-status, .col-dur { white-space: nowrap; width: 1%; }
.mup-name { font-weight: 650; color: #1e293b; }
.mup-id {
  font-size: 10.5px; color: #94a3b8; margin-top: 1px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-all;
}
.mup-warn { font-size: 10.5px; color: #b45309; margin-top: 2px; }
.mup-purpose { color: #475569; min-width: 180px; }
.mup-io { font-size: 11px; color: #64748b; min-width: 150px; }
.mup-io-out { color: #1e3a8a; }
.mup-ver-diff { font-size: 10px; color: #b45309; margin-top: 2px; }
.mup-err { font-size: 10.5px; color: #b91c1c; margin-top: 2px; word-break: break-word; }

/* 未运行 */
.mup-unused {
  margin-top: 12px; padding: 10px 12px; border-radius: 10px;
  background: #fffbeb; border: 1px solid #fde68a;
}
.mup-unused-title { font-size: 11.5px; font-weight: 700; color: #92400e; margin-bottom: 7px; }
.mup-unused-list { display: flex; flex-wrap: wrap; gap: 6px; }
.mup-unused-chip {
  display: inline-flex; flex-direction: column; gap: 1px;
  padding: 5px 9px; border-radius: 8px;
  background: #fff; border: 1px solid #fde68a;
  font-size: 11.5px; color: #475569; font-weight: 600;
}
.mup-unused-chip em { font-style: normal; font-size: 10px; color: #b45309; font-weight: 400; }
.mup-unused-note { margin: 8px 0 0; font-size: 10.5px; color: #92400e; line-height: 1.6; }
</style>
