<template>
  <div class="iv-tree">
    <div class="iv-tree__legend">
      <span class="iv-tree__legend-title">影响因素组合</span>
      <span class="iv-tree__demo">示例数据</span>
      <span class="iv-tree__spacer"></span>
      <span v-if="breadcrumb.length" class="iv-tree__crumb">{{ breadcrumb.join(' › ') }}</span>
      <button v-if="picked.length" type="button" class="iv-tree__toggle" @click="reset">重置选择</button>
    </div>

    <div class="iv-tree__board">
      <div class="iv-tcol">
        <div class="iv-tcol__head">干预设计</div>
        <div class="iv-node iv-node--root">
          <span class="iv-node__title">干预措施组合</span>
          <span class="iv-node__sub">{{ factorCount }} 因素 × {{ levelCount }} 档位 = {{ experiments.length }} 组</span>
        </div>
      </div>

      <template v-for="col in columns" :key="col.key">
        <span class="iv-tsep" aria-hidden="true">›</span>
        <div class="iv-tcol">
          <div class="iv-tcol__head">{{ col.head }}</div>
          <button
            v-for="node in col.nodes"
            :key="node.key"
            type="button"
            class="iv-node"
            :class="[node.kind === 'experiment' ? 'iv-node--leaf' : 'iv-node--choice', { 'is-active': node.active }]"
            :disabled="node.count === 0"
            @click="pick(col.depth, node)"
          >
            <span class="iv-node__title">{{ node.label }}</span>
            <span class="iv-node__sub">{{ node.sub }}</span>
            <span v-if="node.kind === 'experiment' && node.active" class="iv-node__flag">已选</span>
          </button>
          <p v-if="!col.nodes.length" class="iv-tcol__empty">无可用组合</p>
        </div>
      </template>

      <template v-if="nextHead">
        <span class="iv-tsep" aria-hidden="true">›</span>
        <div class="iv-tcol">
          <div class="iv-tcol__head">{{ nextHead }}</div>
          <div class="iv-node iv-node--ghost">
            <span class="iv-node__title">待展开</span>
            <span class="iv-node__sub">点左侧档位继续</span>
          </div>
        </div>
      </template>
    </div>

    <p class="iv-tree__hint">
      默认只显示根节点 + 第一档的 3 个影响因素（已剪枝），点任一项逐层展开；走到底点击「实验N」，右侧即显示该组合的干预结果。
    </p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  // [{ key, label, levels: [{ key, label }] }]
  factors: { type: Array, default: () => [] },
  // [{ id, label, combo: { factorKey: levelKey } }]
  experiments: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' }
})
const emit = defineEmits(['select'])

const factors = computed(() => props.factors.slice(0, 3))
const factorCount = computed(() => factors.value.length)
const levelCount = computed(() => factors.value[0]?.levels?.length ?? 0)

// 逐层展开路径：第 i 项 = 第 i 个因素选中的档位 key
const picked = ref([])

const matches = (experiment, constraints) =>
  Object.entries(constraints).every(([factorKey, levelKey]) => experiment.combo?.[factorKey] === levelKey)

const columns = computed(() => {
  const list = factors.value
  if (!list.length || !props.experiments.length) return []
  const cols = []
  const constraints = {}
  for (let depth = 0; depth < list.length; depth += 1) {
    if (depth > 0 && picked.value[depth - 1] === undefined) break
    const factor = list[depth]
    cols.push({
      key: `f${depth}`,
      depth,
      head: `第 ${depth + 1} 档 · ${factor.label}`,
      nodes: factor.levels.map((level) => {
        const scope = { ...constraints, [factor.key]: level.key }
        const count = props.experiments.filter((e) => matches(e, scope)).length
        return {
          key: level.key,
          label: level.label,
          sub: count === 1 ? '1 次实验' : `${count} 组组合`,
          count,
          kind: 'choice',
          active: picked.value[depth] === level.key
        }
      })
    })
    if (picked.value[depth] === undefined) break
    constraints[list[depth].key] = picked.value[depth]
  }

  if (picked.value.length === list.length) {
    const hits = props.experiments.filter((e) => matches(e, constraints))
    cols.push({
      key: 'exp',
      depth: -1,
      head: '实验',
      nodes: hits.map((e) => ({
        key: e.id,
        label: e.label,
        sub: '点击查看干预结果',
        count: 1,
        kind: 'experiment',
        experimentId: e.id,
        active: e.id === props.selectedId
      }))
    })
  }
  return cols
})

const breadcrumb = computed(() => factors.value.flatMap((factor, i) => {
  const key = picked.value[i]
  if (key === undefined) return []
  const level = factor.levels.find((l) => l.key === key)
  return [`${factor.label}：${level?.label ?? key}`]
}))

// 尚未走完的下一档列（虚线占位，提示还能继续展开）
const nextHead = computed(() => {
  const list = factors.value
  const pickedCount = picked.value.length
  if (!list.length || pickedCount >= list.length) return ''
  if (pickedCount === list.length - 1) return '实验'
  const factor = list[pickedCount + 1]
  return factor ? `第 ${pickedCount + 2} 档 · ${factor.label}` : '实验'
})

const pick = (depth, node) => {
  if (depth < 0) { emit('select', node.experimentId); return }
  const next = picked.value.slice(0, depth)
  next.push(node.key)
  picked.value = next
}

const reset = () => { picked.value = [] }

// 右侧卡片选中的实验与树的展开路径保持同步
watch(() => props.selectedId, (id) => {
  if (!id) return
  const hit = props.experiments.find((e) => e.id === id)
  if (!hit) return
  picked.value = factors.value.map((f) => hit.combo?.[f.key]).filter((v) => v !== undefined)
}, { immediate: true })
</script>

<style scoped>
.iv-tree { width: 100%; }
.iv-tree__legend { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.iv-tree__legend-title { font-size: 13px; font-weight: 800; color: #1e293b; }
.iv-tree__demo {
  font-size: 11.5px; font-weight: 800; padding: 4px 11px; border-radius: 999px; white-space: nowrap;
  color: #b45309; background: linear-gradient(180deg, #fffbeb, #fef3c7); border: 1px solid #fcd34d;
  box-shadow: 0 1px 2px rgba(180, 83, 9, 0.16);
}
.iv-tree__spacer { flex: 1; }
.iv-tree__crumb {
  font-size: 11.5px; font-weight: 800; color: #1d4ed8; white-space: nowrap;
  padding: 4px 11px; border-radius: 999px;
  background: linear-gradient(180deg, #eff6ff, #dbeafe); border: 1px solid #bfdbfe;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.12);
}
.iv-tree__toggle {
  padding: 3px 11px; border-radius: 999px; border: 1px solid #e6ebf2; background: #ffffff;
  font-size: 11.5px; font-weight: 700; color: #475569; cursor: pointer; transition: all .16s;
}
.iv-tree__toggle:hover { border-color: #c7d2fe; color: #4338ca; }
.iv-tree__toggle:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }

.iv-tree__board {
  display: flex; align-items: flex-start; gap: 6px;
  margin-top: 10px; padding: 16px 14px;
  border: 1px solid #e6ebf2; border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  overflow-x: auto; justify-content: center;
}
.iv-tcol { display: flex; flex-direction: column; gap: 8px; min-width: 168px; }
.iv-tcol__head {
  font-size: 11px; font-weight: 800; color: #94a3b8;
  letter-spacing: .4px; padding-left: 2px;
}
.iv-tcol__empty { margin: 0; font-size: 11.5px; color: #cbd5e1; }
.iv-tsep { align-self: center; color: #cbd5e1; font-size: 20px; font-weight: 700; line-height: 1; }

.iv-node {
  display: flex; flex-direction: column; gap: 2px; align-items: flex-start;
  width: 100%; padding: 9px 12px; border-radius: 10px; text-align: left;
  border: 1px solid #e6ebf2; background: #ffffff;
  font-family: inherit; cursor: pointer; transition: all .16s;
}
.iv-node--root {
  border-color: #3b82f6; cursor: default;
  background: linear-gradient(120deg, #172554, #1e40af 55%, #2563eb);
  box-shadow: 0 6px 16px -10px rgba(30, 58, 138, 0.9);
}
.iv-node--root .iv-node__title { color: #ffffff; }
.iv-node--root .iv-node__sub { color: rgba(191, 219, 254, 0.92); }
.iv-node__title { font-size: 13px; font-weight: 800; color: #1e293b; }
.iv-node__sub { font-size: 11px; color: #94a3b8; }

.iv-node--choice:hover:not(:disabled) { border-color: #a5b4fc; background: #f5f7ff; }
.iv-node--choice.is-active {
  border-color: #6366f1; background: #eef2ff;
  box-shadow: inset 3px 0 0 #6366f1;
}
.iv-node--choice.is-active .iv-node__title { color: #4338ca; }
.iv-node:disabled { opacity: .5; cursor: not-allowed; }

.iv-node--leaf { border-color: #a7f3d0; background: linear-gradient(180deg, #ffffff, #f0fdf4); }
.iv-node--leaf .iv-node__title { color: #15803d; }
.iv-node--leaf.is-active { border-color: #16a34a; background: #dcfce7; box-shadow: 0 1px 2px rgba(22, 163, 74, 0.16); }
.iv-node__flag { font-size: 10px; font-weight: 800; color: #15803d; }

.iv-node--ghost {
  border-style: dashed; border-color: #cbd5e1; background: #fbfdff;
  cursor: default; opacity: .9;
}
.iv-node--ghost .iv-node__title { color: #94a3b8; font-weight: 700; }

.iv-tree__hint { margin: 8px 0 0; font-size: 12px; line-height: 1.7; color: #64748b; }
@media (prefers-reduced-motion: reduce) { .iv-node, .iv-tree__toggle { transition: none; } }
</style>
