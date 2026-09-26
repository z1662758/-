<template>
  <el-scrollbar class="env-panel-scroll">
    <div class="env-config-form">
      <!-- 模拟时间 -->
      <div class="config-section-card">
        <div class="section-header">
          <el-icon><Calendar /></el-icon>
          <span>推演时段</span>
        </div>
        <div class="section-body">
          <el-form label-position="top" size="small">
            <el-form-item label="起始年份">
              <el-date-picker
                v-model="simulationTime"
                type="year"
                placeholder="选择年份"
                style="width: 100%"
                value-format="YYYY"
              />
            </el-form-item>
            <el-form-item label="最长推演步数">
              <el-input-number
                v-model="maxSteps"
                :min="1"
                :max="1000"
                style="width: 100%"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 触发事件 -->
      <div class="config-section-card">
        <div class="section-header">
          <el-icon><Warning /></el-icon>
          <span>触发事件</span>
          <el-button link type="primary" size="small" @click="addTriggerEvent">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
        <div class="section-body">
          <div
            v-for="(event, index) in triggerEvents"
            :key="event.id"
            class="trigger-event-item"
          >
            <el-input
              v-model="event.content"
              type="textarea"
              :rows="2"
              placeholder="输入事件描述，如：核心航线临时关闭..."
              @input="commitTriggerEvents"
            />
            <el-button type="danger" link size="small" class="delete-btn" @click="removeTriggerEvent(index)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <div v-if="triggerEvents.length === 0" class="empty-hint">
            点击 + 添加触发事件
          </div>
        </div>
      </div>

      <!-- 历史事件 -->
      <div class="config-section-card">
        <div class="section-header">
          <el-icon><VideoPlay /></el-icon>
          <span>历史事件</span>
        </div>
        <div class="section-body">
          <el-select
            v-model="historicEvents"
            multiple
            placeholder="选择历史事件"
            style="width: 100%"
          >
            <el-option
              v-for="item in historicEventOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <div class="config-hint">
            选中的历史事件将作为背景上下文纳入推演背景。
          </div>
        </div>
      </div>
    </div>
  </el-scrollbar>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Calendar, Warning, VideoPlay, Plus, Delete } from '@element-plus/icons-vue'
import { useSupplyChainStore } from '@/stores/supplyChain'

const store = useSupplyChainStore()
const { environmentConfig } = storeToRefs(store)

const simulationTime = computed({
  get: () => environmentConfig.value?.simulationTime || '',
  set: (val) => store.setEnvironmentConfig({ simulationTime: val })
})
const maxSteps = computed({
  get: () => environmentConfig.value?.maxSteps ?? 60,
  set: (val) => store.setEnvironmentConfig({ maxSteps: Number(val) || 0 })
})
const historicEvents = computed({
  get: () => environmentConfig.value?.historicEvents || [],
  set: (val) => store.setEnvironmentConfig({ historicEvents: Array.isArray(val) ? val : [] })
})

const triggerEvents = ref(
  Array.isArray(environmentConfig.value?.triggerEvents)
    ? environmentConfig.value.triggerEvents.map(e => ({ ...e }))
    : []
)

watch(
  () => environmentConfig.value?.triggerEvents,
  (val) => {
    if (!Array.isArray(val)) return
    if (JSON.stringify(val) !== JSON.stringify(triggerEvents.value)) {
      triggerEvents.value = val.map(e => ({ ...e }))
    }
  }
)

let nextId = 1
function addTriggerEvent() {
  triggerEvents.value.push({ id: `trig_${Date.now()}_${nextId++}`, content: '' })
  commitTriggerEvents()
}
function removeTriggerEvent(index) {
  triggerEvents.value.splice(index, 1)
  commitTriggerEvents()
}
function commitTriggerEvents() {
  store.setEnvironmentConfig({
    triggerEvents: triggerEvents.value.map(e => ({ id: e.id, content: e.content }))
  })
}

const historicEventOptions = [
  { value: 'covid_2020', label: '2020 全球疫情供应中断' },
  { value: 'suez_2021',  label: '2021 苏伊士运河堵塞' },
  { value: 'ic_shortage_2022', label: '2022 半导体供应短缺' },
  { value: 'red_sea_2024', label: '2024 红海航线扰动' }
]
</script>

<style scoped>
.env-panel-scroll {
  height: 100%;
}
.env-config-form {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.config-section-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}
.section-header > .el-button {
  margin-left: auto;
}
.section-body {
  padding: 12px;
}
.trigger-event-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 8px;
}
.trigger-event-item:last-child {
  margin-bottom: 0;
}
.trigger-event-item :deep(.el-textarea__inner) {
  font-size: 12px;
}
.delete-btn {
  margin-top: 4px;
}
.empty-hint {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 6px 0;
}
.config-hint {
  margin-top: 8px;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.6;
}
</style>
