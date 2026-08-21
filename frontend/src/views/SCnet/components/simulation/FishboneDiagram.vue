<template>
  <div class="section-container fishbone-container">
    <div class="section-title fishbone-section-title">
      <div class="fishbone-title-block">
        <span class="fishbone-title-text">
          <el-icon><Histogram /></el-icon> 供应链变量集合
        </span>
        <span v-if="readOnly" class="fishbone-readonly-tip">只读展示模式</span>
        <div class="fishbone-stepper">
          <div
            class="fishbone-step"
            :class="{ 'is-active': activeFishboneStage === 'influence' }"
            @click="activeFishboneStageProxy = 'influence'"
          >
            <span class="step-title">影响因素</span>
            <span class="step-subtitle">{{ influenceDesignVariables.length }} 项因素</span>
          </div>
          <div
            class="fishbone-step"
            :class="{ 'is-active': activeFishboneStage === 'response' }"
            @click="activeFishboneStageProxy = 'response'"
          >
            <span class="step-title">响应指标</span>
            <span class="step-subtitle">{{ responseDesignVariables.length }} 项观测指标</span>
          </div>
        </div>
      </div>
    </div>
    <div class="panel-body fishbone-panel-body">
      <div v-if="!hasAnyFishboneData" class="fishbone-empty-state">
        <el-empty description="暂无影响因素数据" :image-size="80">
          <template #description>
            <p style="color: #909399; font-size: 13px;">请先在场景建模中完成目标拆解，系统将把影响因素与响应变量同步到此处</p>
          </template>
          <el-button type="primary" size="small" @click="$emit('navigate-scenario-modeling')">
            前往场景建模
          </el-button>
        </el-empty>
      </div>
      <template v-else>
        <div class="fishbone-main-stage fishbone-single-stage">
          <div class="fishbone-chart-wrap">
            <el-button
              v-if="activeFishboneVariables.length > 0"
              type="primary"
              size="small"
              plain
              class="fishbone-inline-expand-btn"
              @click="fishboneFullscreenVisibleProxy = true"
            >
              <el-icon class="el-icon--left"><FullScreen /></el-icon>
              全屏查看
            </el-button>
            <div :ref="setChartRef" class="echarts-fishbone echarts-fishbone-preview"></div>
            <div v-if="activeFishboneVariables.length === 0" class="fishbone-stage-empty">
              <el-empty
                :description="activeFishboneStage === 'response' ? '暂无响应变量数据' : '暂无影响因素数据'"
                :image-size="64"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <el-drawer
    v-model="fishboneDrawerVisibleProxy"
    :title="fishboneDrawerTitle"
    direction="rtl"
    size="440px"
    class="fishbone-config-drawer"
  >
    <template v-if="fishboneDrawerVar">
      <div class="fishbone-drawer-section-title">参数配置</div>
      <div class="fishbone-param-list">
        <div v-if="fishboneParamRows.length === 0" class="fishbone-no-params">
          当前变量暂无可配置系统参数。
        </div>
        <div
          v-for="row in fishboneParamRows"
          :key="row.id"
          class="fishbone-param-item"
        >
          <div v-if="row.displayName || row.rangeHint || row.source" class="fishbone-param-meta">
            <span v-if="row.displayName" class="fishbone-param-display">{{ row.displayName }}</span>
            <span v-if="row.rangeHint" class="fishbone-param-range">{{ row.rangeHint }}</span>
            <span v-if="row.source" class="fishbone-param-source">{{ row.source }}</span>
          </div>
          <div class="fishbone-param-head">
            <el-input v-model="row.name" disabled />
          </div>
          <div class="fishbone-param-body">
            <template v-if="row.type === 'range'">
              <el-input-number
                v-model="row.minValue"
                :controls="true"
                :min="row.minLimit"
                :max="row.maxLimit"
                :step="row.step || 1"
                style="width: 100%"
              />
              <span class="range-sep">~</span>
              <el-input-number
                v-model="row.maxValue"
                :controls="true"
                :min="row.minLimit"
                :max="row.maxLimit"
                :step="row.step || 1"
                style="width: 100%"
              />
            </template>
            <el-input-number
              v-else-if="row.type === 'number'"
              v-model="row.numberValue"
              :controls="true"
              :min="row.minLimit"
              :max="row.maxLimit"
              :step="row.step || 1"
              style="width: 100%"
            />
            <el-input
              v-else
              v-model="row.textValue"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 4 }"
            />
          </div>
        </div>
      </div>
      <div class="fishbone-drawer-actions fishbone-drawer-actions--single">
        <el-button type="primary" @click="$emit('save-drawer')">保存变量配置</el-button>
      </div>
    </template>
  </el-drawer>

  <el-dialog
    v-model="fishboneFullscreenVisibleProxy"
    :title="fishboneFullscreenTitle"
    fullscreen
    destroy-on-close
    class="fishbone-fullscreen-dialog"
    @opened="$emit('fullscreen-opened')"
    @closed="$emit('fullscreen-closed')"
  >
    <div :ref="setFullscreenChartRef" class="echarts-fishbone-fullscreen"></div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { Histogram, FullScreen } from '@element-plus/icons-vue'

const props = defineProps({
  activeFishboneStage: {
    type: String,
    required: true
  },
  influenceDesignVariables: {
    type: Array,
    default: () => []
  },
  responseDesignVariables: {
    type: Array,
    default: () => []
  },
  hasAnyFishboneData: {
    type: Boolean,
    default: false
  },
  activeFishboneVariables: {
    type: Array,
    default: () => []
  },
  fishboneDrawerVisible: {
    type: Boolean,
    default: false
  },
  fishboneDrawerTitle: {
    type: String,
    default: '变量配置'
  },
  fishboneDrawerVar: {
    type: Object,
    default: null
  },
  fishboneParamRows: {
    type: Array,
    default: () => []
  },
  fishboneFullscreenVisible: {
    type: Boolean,
    default: false
  },
  fishboneFullscreenTitle: {
    type: String,
    default: ''
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  setChartRef: {
    type: Function,
    required: true
  },
  setFullscreenChartRef: {
    type: Function,
    required: true
  }
})

const emit = defineEmits([
  'update:activeFishboneStage',
  'update:fishboneDrawerVisible',
  'update:fishboneFullscreenVisible',
  'navigate-scenario-modeling',
  'save-drawer',
  'fullscreen-opened',
  'fullscreen-closed'
])

const activeFishboneStageProxy = computed({
  get: () => props.activeFishboneStage,
  set: (val) => emit('update:activeFishboneStage', val)
})

const fishboneDrawerVisibleProxy = computed({
  get: () => props.fishboneDrawerVisible,
  set: (val) => emit('update:fishboneDrawerVisible', val)
})

const fishboneFullscreenVisibleProxy = computed({
  get: () => props.fishboneFullscreenVisible,
  set: (val) => emit('update:fishboneFullscreenVisible', val)
})

</script>

<style scoped>
.section-container {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-body {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

.fishbone-container {
  flex: 0 0 auto;
  min-height: 400px;
}

.fishbone-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.fishbone-title-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.fishbone-title-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.fishbone-readonly-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.fishbone-stepper {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: min(760px, 100%);
}

.fishbone-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d8e2f2;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
  cursor: pointer;
  transition: all 0.18s ease;
}

.fishbone-step:hover {
  border-color: #93c5fd;
  transform: translateY(-1px);
}

.fishbone-step .step-title {
  color: #334155;
  font-weight: 700;
  width: 100%;
}

.fishbone-step .step-subtitle {
  color: #64748b;
  font-size: 11px;
  width: 100%;
}

.fishbone-step.is-active {
  border-color: #60a5fa;
  background: linear-gradient(180deg, #eff6ff 0%, #f0f9ff 100%);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.12);
}

.fishbone-step.is-active .step-title {
  color: #1d4ed8;
}

.fishbone-step.is-active .step-subtitle {
  color: #2563eb;
}

.fishbone-panel-body {
  min-height: 0;
}

.fishbone-main-stage {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  padding: 10px;
}

.fishbone-single-stage {
  min-height: 0;
}

.fishbone-chart-wrap {
  position: relative;
}

.fishbone-inline-expand-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  background: rgba(255, 255, 255, 0.9);
}

.fishbone-stage-empty {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  border-radius: 10px;
  border: 1px dashed #d1d5db;
  background: #ffffff;
}

.echarts-fishbone {
  width: 100%;
}

.echarts-fishbone-preview {
  height: min(460px, 42vh);
  min-height: 300px;
}

.echarts-fishbone-fullscreen {
  width: 100%;
  height: calc(100vh - 100px);
  min-height: 640px;
}

.fishbone-drawer-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin: 14px 0 8px;
}

.fishbone-no-params {
  margin-bottom: 10px;
  color: #909399;
  font-size: 12px;
}

.fishbone-param-list {
  max-height: 52vh;
  overflow-y: auto;
  padding-right: 4px;
}

.fishbone-param-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  background: #f8fafc;
}

.fishbone-param-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 11px;
  line-height: 1.4;
}

.fishbone-param-display {
  color: #1e40af;
  font-weight: 600;
}

.fishbone-param-range {
  color: #475569;
}

.fishbone-param-source {
  color: #64748b;
}

.fishbone-param-head {
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.fishbone-param-body {
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: 6px;
}

.fishbone-param-body .range-sep {
  text-align: center;
  color: #909399;
  font-size: 12px;
}

.fishbone-drawer-actions {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.fishbone-drawer-actions--single {
  justify-content: flex-end;
}

.fishbone-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

@media (max-width: 1580px) {
  .fishbone-stepper {
    gap: 6px;
  }
}

@media (max-width: 960px) {
  .fishbone-stepper {
    grid-template-columns: 1fr;
  }

  .fishbone-param-head {
    grid-template-columns: 1fr;
  }
}
</style>
