<template>
  <section class="jp-flow" :style="{ '--jp-accent': accent }">
    <header class="jp-flow-head">
      <h3 class="jp-flow-title">{{ title }}</h3>
      <span class="jp-flow-source">{{ sourceLabel }}</span>
    </header>

    <ol class="jp-steps">
      <li
        v-for="(step, i) in steps"
        :key="step.title"
        class="jp-step"
        :class="{ 'is-pending': isPending(i) }"
      >
        <div class="jp-step-index">{{ i + 1 }}</div>
        <div class="jp-step-body">
          <div class="jp-step-title">{{ step.title }}</div>
          <div v-if="step.detail" class="jp-step-detail">{{ step.detail }}</div>
        </div>
        <div v-if="i < steps.length - 1" class="jp-step-arrow" aria-hidden="true">→</div>
      </li>
    </ol>

    <p v-if="note" class="jp-flow-note">{{ note }}</p>
  </section>
</template>

<script setup>
const props = defineProps({
  title: { type: String, required: true },
  sourceLabel: { type: String, default: '' },
  /** [{ title, detail }] */
  steps: { type: Array, default: () => [] },
  /** 未完成的步骤数量(从末尾往前数),用于把"没有产出"的环节标成待产出 */
  pendingCount: { type: Number, default: 0 },
  /** 整段流程的补充说明,例如"该步骤本次没有产出结果" */
  note: { type: String, default: '' },
  accent: { type: String, default: '#2563eb' },
})

function isPending(index) {
  if (typeof props.steps[index]?.pending === 'boolean') return props.steps[index].pending
  if (!props.pendingCount) return false
  return index >= props.steps.length - props.pendingCount
}
</script>

<style scoped>
.jp-flow {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1rem 1.2rem 1.1rem;
  margin-bottom: 1rem;
}

.jp-flow-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 0.9rem;
}
.jp-flow-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; }
.jp-flow-source {
  font-size: 11.5px;
  color: var(--jp-accent);
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 2px 10px;
  font-weight: 600;
}

.jp-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 6px;
}

.jp-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1 1 158px;
  min-width: 158px;
  max-width: 240px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-left: 3px solid var(--jp-accent);
  border-radius: 10px;
  padding: 8px 12px 8px 10px;
}
.jp-step.is-pending {
  border-left-color: #cbd5e1;
  background: #fbfcfe;
}
.jp-step.is-pending .jp-step-index { background: #cbd5e1; }
.jp-step.is-pending .jp-step-title { color: #64748b; }

.jp-step-index {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--jp-accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
  margin-top: 1px;
}
.jp-step-title { font-size: 12.5px; font-weight: 650; color: #0f172a; line-height: 1.5; }
.jp-step-detail { font-size: 11px; color: #64748b; line-height: 1.5; margin-top: 2px; }

.jp-step-arrow {
  position: absolute;
  right: -10px;
  top: 50%;
  transform: translateY(-50%);
  color: #cbd5e1;
  font-size: 12px;
  z-index: 1;
}
.jp-step:last-child .jp-step-arrow { display: none; }

.jp-flow-note {
  margin: 0.85rem 0 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
}

@media (max-width: 1200px) {
  .jp-step-arrow { display: none; }
}
</style>
