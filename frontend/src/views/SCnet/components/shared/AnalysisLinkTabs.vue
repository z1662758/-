<template>
  <nav class="analysis-link-tabs glass-panel" aria-label="决策分析子页面">
    <div class="alt-left">
      <el-icon class="alt-icon"><DataAnalysis /></el-icon>
      <span class="alt-title">决策分析</span>
      <el-segmented
        v-model="activeRef"
        :options="tabs"
        size="small"
        class="alt-segmented"
        @change="handleChange"
        aria-label="切换决策分析页面"
      >
        <template #default="{ item }">
          <span class="alt-segment-item">
            <el-icon :size="14"><component :is="item.icon" /></el-icon>
            {{ item.label }}
          </span>
        </template>
      </el-segmented>
    </div>

    <div class="alt-right">
      <slot name="right" />
    </div>
  </nav>
</template>

<script setup>
import { computed, markRaw, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  DataAnalysis,
  Grid,
  Promotion,
  TrendCharts
} from '@element-plus/icons-vue'
import { SCNET_DECISION_ROUTE_BY_TAB } from '@/constants/scnetRoutes'
import './midStage.css'

const props = defineProps({
  active: {
    type: String,
    required: true,
    validator: v => ['gameTheory', 'decisionTree', 'scenario'].includes(v)
  }
})

const router = useRouter()

const tabs = computed(() => [
  { value: 'gameTheory',   label: '博弈论', icon: markRaw(Grid) },
  { value: 'decisionTree', label: '决策树', icon: markRaw(Promotion) },
  { value: 'scenario',     label: '情景',   icon: markRaw(TrendCharts) }
])

const activeRef = ref(props.active)
watch(() => props.active, v => { activeRef.value = v })

function handleChange(value) {
  if (value === props.active) return
  const target = SCNET_DECISION_ROUTE_BY_TAB[value]
  if (target) router.push({ path: target, query: router.currentRoute.value.query })
}
</script>

<style scoped>
.analysis-link-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 10px;
  margin: 6px 8px 0;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: 0 6px 20px rgba(30, 64, 175, 0.08);
}

.alt-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.alt-icon {
  color: #409eff;
  font-size: 16px;
}

.alt-title {
  font-size: 12px;
  font-weight: 700;
  color: #1f2937;
  margin-right: 4px;
}

.alt-segmented {
  --el-segmented-bg-color: rgba(255, 255, 255, 0.6);
  min-width: 248px;
  max-width: 100%;
}

.alt-segment-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.alt-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-left: auto;
  min-width: 0;
}

.alt-right :deep(.el-select) {
  max-width: 100%;
}
/* 复用 mid-page-header 的按钮节奏:32px 高 + icon/文字 6px 间距 */
.alt-right :deep(.el-button) {
  --el-button-size: 30px;
  min-height: 30px;
}
.alt-right :deep(.el-button > .el-icon + span),
.alt-right :deep(.el-button > span + .el-icon) {
  margin-left: 6px;
}
@media (max-width: 1200px) {
  .analysis-link-tabs { flex-wrap: wrap; }
  .alt-left { width: 100%; }
  .alt-segmented { width: 100%; min-width: 0; }
  .alt-right { flex-wrap: wrap; }
}

@media (max-width: 640px) {
  .analysis-link-tabs {
    margin-inline: 4px;
    padding: 6px;
  }
  .alt-icon,
  .alt-title {
    display: none;
  }
  .alt-left,
  .alt-segmented {
    width: 100%;
  }
  .alt-segmented {
    min-width: 0;
    overflow-x: auto;
  }
  .alt-segment-item {
    white-space: nowrap;
    font-size: 11px;
  }
  .alt-right {
    width: 100%;
    justify-content: stretch;
  }
  .alt-right :deep(.el-select),
  .alt-right :deep(.el-button) {
    flex: 1 1 auto;
  }
}
</style>
