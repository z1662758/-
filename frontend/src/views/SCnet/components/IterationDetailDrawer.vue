<template>
  <el-drawer
    :model-value="modelValue"
    :title="drawerTitle"
    direction="rtl"
    size="540px"
    class="iter-detail-drawer"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="row" class="iter-detail-body">
      <!-- 本轮概览 -->
      <section class="detail-section">
        <div class="detail-section-head">
          <el-icon><Aim /></el-icon>
          <span>本轮概览</span>
          <el-tag v-if="row.source" size="small" type="info" effect="plain" class="head-tag">{{ sourceLabel }}</el-tag>
        </div>
        <div class="goal-line">{{ row.objective || '（未提供本轮测试目标）' }}</div>
        <div class="overview-stat-grid">
          <div class="overview-stat">
            <div class="ovs-label">轮次</div>
            <div class="ovs-value">第 {{ row.round_no }} 轮</div>
          </div>
          <div class="overview-stat">
            <div class="ovs-label">综合得分</div>
            <div class="ovs-value">
              {{ formatScore(row.score) }}
              <span
                v-if="row.score_delta != null"
                class="ovs-delta"
                :class="row.score_delta >= 0 ? 'up' : 'down'"
              >{{ row.score_delta >= 0 ? '+' : '' }}{{ Number(row.score_delta).toFixed(3) }}</span>
            </div>
          </div>
          <div v-if="scoreTypeLabel" class="overview-stat">
            <div class="ovs-label">评分类型</div>
            <div class="ovs-value small">{{ scoreTypeLabel }}</div>
          </div>
        </div>
      </section>

      <!-- 市场环境 -->
      <section v-if="hasEnvironment" class="detail-section">
        <div class="detail-section-head">
          <el-icon><Sunrise /></el-icon>
          <span>市场环境</span>
          <el-tag :type="contextMeta.type" size="small" effect="dark" class="head-tag">{{ contextMeta.label }}</el-tag>
          <el-tag
            v-if="row.environment.has_extreme_scenario"
            type="danger"
            size="small"
            effect="plain"
            class="head-tag"
          >⚠ 突发事件</el-tag>
        </div>
        <div v-if="row.environment.description" class="env-desc">{{ row.environment.description }}</div>
        <div v-if="row.environment.trend_slope != null" class="env-line">
          需求趋势斜率：<span class="mono">{{ Number(row.environment.trend_slope).toFixed(3) }}</span>
        </div>
        <div v-if="extremeItems.length" class="extreme-box">
          <div v-for="item in extremeItems" :key="item.key" class="extreme-row">
            <span class="extreme-key">{{ item.key }}</span>
            <span class="extreme-val">{{ item.value }}</span>
          </div>
        </div>
      </section>

      <!-- 控制变量（参数） -->
      <section v-if="row.all_param_items && row.all_param_items.length" class="detail-section">
        <div class="detail-section-head">
          <el-icon><Setting /></el-icon>
          <span>控制变量（本轮参数）</span>
          <span class="head-count">{{ row.all_param_items.length }} 项</span>
        </div>
        <div class="param-grid">
          <div
            v-for="item in row.all_param_items"
            :key="item.key"
            class="param-card"
            :class="{ changed: changedParamKeys.has(item.key) }"
          >
            <div class="param-card-label">
              {{ item.key }}
              <el-tag v-if="changedParamKeys.has(item.key)" size="small" type="danger" effect="dark" class="changed-tag">变化</el-tag>
            </div>
            <div class="param-card-value mono">{{ item.value }}</div>
          </div>
        </div>
      </section>

      <!-- 完整观察指标 -->
      <section v-if="metricGroups.length" class="detail-section">
        <div class="detail-section-head">
          <el-icon><DataAnalysis /></el-icon>
          <span>完整观察指标</span>
          <span class="head-count">{{ metricCount }} 项</span>
        </div>
        <div v-for="group in metricGroups" :key="group.title" class="metric-group">
          <div class="metric-group-title">{{ group.title }}</div>
          <div class="metric-grid">
            <div
              v-for="item in group.items"
              :key="item.key"
              class="metric-card"
              :class="{ highlight: item.highlight }"
            >
              <div class="metric-card-label">{{ item.label }}</div>
              <div class="metric-card-value mono">{{ item.value }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 系统建议 -->
      <section v-if="row.recommendations && row.recommendations.length" class="detail-section">
        <div class="detail-section-head">
          <el-icon><ChatLineSquare /></el-icon>
          <span>系统建议</span>
        </div>
        <ul class="reco-list">
          <li v-for="(rec, idx) in row.recommendations" :key="idx">{{ rec }}</li>
        </ul>
      </section>
    </div>
    <el-empty v-else description="未选择轮次" :image-size="80" />
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { Aim, Sunrise, Setting, DataAnalysis, ChatLineSquare } from '@element-plus/icons-vue'
import { METRIC_GROUPS, METRIC_META, KEY_METRICS, formatMetric, getContextMeta, getSourceLabel } from './shared/iterationMeta'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  row: { type: Object, default: null },
  formatScore: { type: Function, required: true },
  formatParamValue: { type: Function, default: (v) => String(v) }
})

defineEmits(['update:modelValue'])

const SCORE_TYPE_LABELS = {
  diversity_contribution: '多样性贡献',
  sensitivity: '敏感性',
  robustness: '鲁棒性',
  comprehensive: '综合评估'
}

const drawerTitle = computed(() => (props.row ? `第 ${props.row.round_no} 轮 · 迭代详情` : '迭代详情'))
const sourceLabel = computed(() => getSourceLabel(props.row?.source))
const scoreTypeLabel = computed(() => {
  const t = props.row?.score_type
  if (!t) return ''
  return SCORE_TYPE_LABELS[t] || t
})

const contextMeta = computed(() => getContextMeta(props.row?.environment?.context_type))
const hasEnvironment = computed(() => {
  const env = props.row?.environment
  return !!(env && (env.context_type || env.description || env.has_extreme_scenario))
})

const extremeItems = computed(() => {
  const ex = props.row?.environment?.extreme_scenario
  if (!ex || typeof ex !== 'object') return []
  return Object.entries(ex)
    .filter(([, v]) => v != null && v !== '')
    .map(([key, v]) => ({ key, value: props.formatParamValue(v) }))
})

const changedParamKeys = computed(() => {
  const set = new Set()
  const prev = props.row?.prev_param_items
  if (!Array.isArray(prev) || !prev.length) return set
  const prevMap = new Map(prev.map((i) => [i.key, String(i.value)]))
  for (const item of props.row?.all_param_items || []) {
    if (prevMap.has(item.key) && prevMap.get(item.key) !== String(item.value)) set.add(item.key)
  }
  return set
})

const metricGroups = computed(() => {
  const metrics = props.row?.metrics_full
  if (!metrics || typeof metrics !== 'object') return []
  const groups = []
  for (const group of METRIC_GROUPS) {
    const items = group.keys
      .filter((k) => metrics[k] != null && metrics[k] !== '')
      .map((k) => ({
        key: k,
        label: METRIC_META[k]?.label || k,
        value: formatMetric(k, metrics[k]),
        highlight: KEY_METRICS.has(k)
      }))
    if (items.length) groups.push({ title: group.title, items })
  }
  return groups
})

const metricCount = computed(() => metricGroups.value.reduce((sum, g) => sum + g.items.length, 0))
</script>

<style scoped>
.iter-detail-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mono {
  font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
}

.detail-section {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: #fff;
  padding: 12px 14px;
}

.detail-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: var(--mid-fs-strong);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.detail-section-head .el-icon {
  color: var(--el-color-primary);
  font-size: 14px;
}

.head-tag {
  margin-left: 2px;
}

.head-count {
  font-size: var(--mid-fs-label);
  font-weight: 500;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  padding: 1px 8px;
  border-radius: 10px;
  margin-left: auto;
}

.goal-line {
  font-size: var(--mid-fs-title);
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: var(--mid-lh-tight);
  margin-bottom: 10px;
}

.overview-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.overview-stat {
  padding: 8px 10px;
  border-radius: 6px;
  background: #fafbfc;
  border: 1px solid var(--el-border-color-lighter);
}

.ovs-label {
  font-size: var(--mid-fs-label);
  color: var(--el-text-color-secondary);
  margin-bottom: 3px;
}

.ovs-value {
  font-size: var(--mid-fs-title);
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-family: 'JetBrains Mono', 'Menlo', monospace;
}

.ovs-value.small {
  font-size: var(--mid-fs-strong);
  font-family: inherit;
}

.ovs-delta {
  font-size: var(--mid-fs-body);
  margin-left: 4px;
}

.ovs-delta.up { color: var(--el-color-success); }
.ovs-delta.down { color: var(--el-color-danger); }

.env-desc {
  font-size: var(--mid-fs-body);
  color: var(--el-text-color-primary);
  line-height: 1.5;
  margin-bottom: 6px;
}

.env-line {
  font-size: var(--mid-fs-label);
  color: var(--el-text-color-secondary);
}

.extreme-box {
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px dashed var(--el-color-danger-light-5);
  border-radius: 6px;
  background: var(--el-color-danger-light-9);
}

.extreme-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--mid-fs-body);
  padding: 2px 0;
}

.extreme-key { color: var(--el-text-color-secondary); }
.extreme-val { color: var(--el-text-color-primary); font-family: 'JetBrains Mono', monospace; }

.param-grid,
.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.param-card,
.metric-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: #fafbfc;
}

.param-card.changed {
  border-color: var(--el-color-danger-light-5);
  background: var(--el-color-danger-light-9);
}

.metric-card.highlight {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.param-card-label,
.metric-card-label {
  font-size: var(--mid-fs-label);
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.changed-tag {
  transform: scale(0.85);
  transform-origin: left center;
}

.param-card-value,
.metric-card-value {
  font-size: var(--mid-fs-strong);
  font-weight: 600;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.metric-card.highlight .metric-card-value {
  color: var(--el-color-primary);
}

.metric-group + .metric-group {
  margin-top: 10px;
}

.metric-group-title {
  font-size: var(--mid-fs-body);
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  padding-left: 6px;
  border-left: 3px solid var(--el-color-primary-light-5);
}

.reco-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reco-list li {
  font-size: var(--mid-fs-body);
  color: var(--el-text-color-primary);
  line-height: 1.5;
}
</style>
