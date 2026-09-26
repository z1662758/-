<template>
  <nav class="analysis-link-tabs glass-panel" aria-label="决策分析子页面">
    <div class="alt-left">
      <el-icon class="alt-icon"><DataAnalysis /></el-icon>

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
      <el-select v-if="isUranium" :model-value="experimentStore.selectedExperimentId" class="analysis-experiment-select" size="small" aria-label="分析实验" placeholder="选择实验" @change="changeExperiment">
        <el-option v-for="item in experimentStore.history" :key="item.experiment_id" :label="item.name || item.experiment_id" :value="item.experiment_id" />
      </el-select>
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
  TrendCharts, Document
} from '@element-plus/icons-vue'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useScenarioStore } from '@/stores/scenario'
import { SCNET_DECISION_ROUTE_BY_TAB } from '@/constants/scnetRoutes'
import './midStage.css'

const props = defineProps({
  active: {
    type: String,
    required: true,
    validator: v => ['gameTheory', 'decisionTree', 'scenario', 'report'].includes(v)
  }
})

const router = useRouter()
const experimentStore = useUraniumDemoStore()
const scenarioStore = useScenarioStore()
const isUranium = computed(() => (router.currentRoute.value.query.scenario || scenarioStore.currentScenario) === 'uranium')
async function changeExperiment(id) {
  await experimentStore.loadExperiment(id)
  router.replace({ query: { ...router.currentRoute.value.query, experiment_id: id } })
}

const tabs = computed(() => [
  { value: 'scenario',     label: '情景分析', icon: markRaw(TrendCharts) },
  { value: 'gameTheory',   label: '脆弱性分析', icon: markRaw(Grid) },
  { value: 'decisionTree', label: '对策分析', icon: markRaw(Promotion) },
  { value: 'report', label: '决策报告', icon: markRaw(Document) }
])

const activeRef = ref(props.active)
watch(() => props.active, v => { activeRef.value = v })

function handleChange(value) {
  if (value === props.active) return
  const target = SCNET_DECISION_ROUTE_BY_TAB[value]
  if (target) {
    const query = { ...router.currentRoute.value.query }
    delete query.section
    router.push({ path: target, query })
  }
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
  box-shadow: none;
  flex-wrap: wrap;
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
  margin-right: 2px;
}

.alt-segmented {
  --el-segmented-bg-color: rgba(255, 255, 255, 0.6);
  min-width: 0;
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
@media (max-width: 800px) {
  .analysis-link-tabs { flex-wrap: wrap; }
  .alt-left { width: 100%; flex-wrap: nowrap; }
  .alt-segmented { flex: 1; min-width: 0; }
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
.analysis-experiment-select { width: 250px; max-width: 100%; }
@media (max-width: 800px) { .analysis-experiment-select { width: 200px; } }
</style>
