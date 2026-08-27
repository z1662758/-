<template>
  <div class="right-column">
    <div class="agent-studio-wrapper">
      <div class="right-inner-layout">
        <div class="sidebar left-sidebar">
          <div class="panel-header">
            <div class="panel-heading-copy">
              <strong>{{ readOnly ? '方案实体' : '企业实体' }}</strong>
              <span>按业务层级浏览</span>
            </div>
            <span class="panel-count">{{ totalAgentCount }}</span>
          </div>
          <div class="search-box">
            <el-input v-model="searchKeywordProxy" placeholder="搜索实体名称" :prefix-icon="Search" clearable size="small" />
          </div>
          <el-scrollbar class="sidebar-scroll">
            <div class="agent-list">
              <div class="agent-group" v-for="(group, key) in groupedAgents" :key="key">
                <div class="group-title">
                  <span><el-icon><Folder /></el-icon>{{ categoryLabelMap[key] || key }}</span>
                  <span class="group-count">{{ group.length }}</span>
                </div>
                <button
                  class="agent-item"
                  v-for="agent in group"
                  :key="agent.id"
                  :class="{ active: selectedNode?.id === agent.id }"
                  type="button"
                  @click="handleLocateAgent(agent.id)"
                  @dblclick.stop="!readOnly && $emit('open-agent-method-dialog', agent)"
                >
                  <div class="agent-icon" :class="agent.category">
                    <el-icon v-if="agent.category === 'supply'"><Box /></el-icon>
                    <el-icon v-else-if="agent.category === 'transport'"><Guide /></el-icon>
                    <el-icon v-else-if="agent.category === 'sales'"><Sell /></el-icon>
                    <el-icon v-else-if="agent.category === 'other'"><Grid /></el-icon>
                    <el-icon v-else><OfficeBuilding /></el-icon>
                  </div>
                  <div class="agent-info">
                    <div class="agent-name">{{ agent.name }}</div>
                    <div class="agent-category">
                      {{ categoryLabelMap[agent.category] || agent.category }}
                      <span v-if="agent.entityCount" class="entity-count">× {{ agent.entityCount }}</span>
                    </div>
                  </div>
                  <span class="agent-locate">›</span>
                </button>
              </div>
              <el-empty v-if="totalAgentCount === 0" description="暂无匹配实体" :image-size="70" />
            </div>
          </el-scrollbar>
        </div>

        <div class="right-content-area">
          <div class="canvas-area">
            <div class="canvas-toolbar">
              <div class="canvas-summary">
                <strong>实体关系</strong>
                <span>{{ nodesProxy.length }} 个实体</span>
                <span>{{ edgesProxy.length }} 条关系</span>
              </div>
              <div class="canvas-actions">
                <div class="canvas-legend">
                  <span v-for="item in visibleCategories" :key="item.key" class="legend-item">
                    <i :class="item.key"></i>{{ item.label }}
                  </span>
                </div>
                <el-button size="small" plain :icon="FullScreen" @click="fitCanvas">适配视图</el-button>
              </div>
            </div>
            <div class="canvas-stage">
              <VueFlow
                v-model:nodes="nodesProxy"
                v-model:edges="edgesProxy"
                style="width: 100%; height: 100%;"
                :fit-view-on-init="true"
                :min-zoom="0.6"
                :max-zoom="1.2"
                @node-click="payload => $emit('select-node', payload)"
              >
                <template #node-CardNode="nodeProps">
                  <div class="custom-node" :class="[nodeProps.data.category, { selected: nodeProps.selected }]">
                    <div class="node-header">
                      <div class="node-title">
                        {{ nodeProps.data.name }}
                        <span v-if="nodeProps.data.entityCount" class="entity-badge">× {{ nodeProps.data.entityCount }}</span>
                      </div>
                      <div class="node-tag">{{ categoryLabelMap[nodeProps.data.category] || nodeProps.data.category }}</div>
                    </div>
                    <div class="node-body">
                      <div v-if="nodeProps.data.selectedMethod" class="node-method">方法：{{ nodeProps.data.selectedMethod }}</div>
                      <div v-else class="node-method muted">点击查看实体详情</div>
                    </div>
                    <Handle id="t-top" type="target" :position="Position.Top" class="handle-top" />
                    <Handle id="s-bottom" type="source" :position="Position.Bottom" class="handle-bottom" />
                    <Handle id="t-left" type="target" :position="Position.Left" class="handle-left" />
                    <Handle id="t-right" type="target" :position="Position.Right" class="handle-right target-right" />
                    <Handle id="s-right" type="source" :position="Position.Right" class="handle-right source-right" />
                  </div>
                </template>
                <Background variant="dots" gap="20" color="#e5e7eb" />
                <Controls />
              </VueFlow>
              <div v-if="nodesProxy.length === 0" class="canvas-empty">
                <span>⌁</span>
                <strong>方案关系尚未生成</strong>
                <p>完成智能对话后，实体与关系将在这里展示</p>
              </div>
            </div>
          </div>

          <div class="properties-panel">
            <div class="panel-header">
              <span>实体详情</span>
              <span class="panel-header-hint">{{ selectedNode ? '已选择' : '未选择' }}</span>
            </div>
            <el-scrollbar class="properties-scroll">
              <div v-if="!selectedNode" class="empty-tip">
                <div class="empty-tip-icon">◎</div>
                <strong>选择一个实体</strong>
                <span>{{ readOnly ? '点击左侧目录或画布节点，查看实体参数与说明' : '点击节点配置企业实体参数' }}</span>
              </div>
              <div v-else class="property-card">
                <div class="property-summary">
                  <div class="property-hero">
                    <div class="property-hero-icon" :class="selectedNode?.data?.category">
                      <el-icon><OfficeBuilding /></el-icon>
                    </div>
                    <div>
                      <strong>{{ selectedNode?.data?.name || selectedNode?.id }}</strong>
                      <span>{{ categoryLabelMap[selectedNode?.data?.category] || selectedNode?.data?.category || '未分类' }}</span>
                    </div>
                  </div>
                  <div class="property-summary-row">
                    <span>参数数量</span>
                    <strong>{{ getConfigurableParams(selectedNode.id).length }} 项</strong>
                  </div>
                  <div v-if="selectedNode?.data?.description" class="property-summary-copy">
                    {{ selectedNode.data.description }}
                  </div>
                  <div v-if="selectedNode?.data?.tags?.length" class="property-chip-row">
                    <span v-for="tag in selectedNode.data.tags" :key="tag" class="property-chip">{{ tag }}</span>
                  </div>
                </div>
                <template v-if="getConfigurableParams(selectedNode.id).length > 0">
                  <div class="property-section-title">{{ readOnly ? '实体参数（只读）' : '实体参数' }}</div>
                  <el-form size="small" label-position="top" class="property-form">
                    <el-form-item
                      v-for="param in getConfigurableParams(selectedNode.id)"
                      :key="param.key"
                      :label="param.label"
                      class="property-form-item"
                    >
                      <template v-if="param.type === 'range'">
                        <div class="range-inputs">
                          <el-input-number
                            size="small"
                            :model-value="getParamValue(selectedNode.id, param.key, 0, param)"
                            :min="param.min"
                            :max="param.max"
                            :step="param.step"
                            controls-position="right"
                            class="range-input"
                            :disabled="readOnly"
                            @update:model-value="val => emitParamUpdate(selectedNode.id, param.key, 0, val, param)"
                          />
                          <span class="range-divider">至</span>
                          <el-input-number
                            size="small"
                            :model-value="getParamValue(selectedNode.id, param.key, 1, param)"
                            :min="param.min"
                            :max="param.max"
                            :step="param.step"
                            controls-position="right"
                            class="range-input"
                            :disabled="readOnly"
                            @update:model-value="val => emitParamUpdate(selectedNode.id, param.key, 1, val, param)"
                          />
                        </div>
                      </template>
                      <template v-else>
                        <el-input-number
                          size="small"
                          :model-value="getParamValue(selectedNode.id, param.key, null, param)"
                          :min="param.min"
                          :max="param.max"
                          :step="param.step"
                          controls-position="right"
                          class="number-input"
                          :disabled="readOnly"
                          @update:model-value="val => emitParamUpdate(selectedNode.id, param.key, null, val, param)"
                        />
                      </template>
                    </el-form-item>
                  </el-form>
                </template>
                <el-empty v-else description="该实体暂无可配置参数" :image-size="64" />
              </div>
            </el-scrollbar>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="methodDialogVisibleProxy"
      title="选择 Agent 能力方法"
      width="400px"
      @close="methodDialogVisibleProxy = false"
    >
      <div class="dialog-content" v-if="methodDialogAgent">
        <p>当前 Agent：<span style="color: #409EFF; font-weight: 600">{{ methodDialogAgent.name }}</span></p>
        <p class="method-dialog-hint">能力方法即该实体在仿真中的业务策略选项，将随队列参数提交。</p>
        <el-radio-group
          v-model="methodDialogSelectedProxy"
          style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;"
        >
          <el-radio
            v-for="method in methodDialogAgent.availableMethods"
            :key="method"
            :value="method"
          >{{ method }}</el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="methodDialogVisibleProxy = false">取消</el-button>
          <el-button type="primary" :disabled="!methodDialogSelectedProxy" @click="$emit('confirm-method-selection')">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, nextTick, ref } from 'vue'
import { Search, Folder, OfficeBuilding, Grid, Box, Sell, Guide, FullScreen } from '@element-plus/icons-vue'
import { VueFlow, Handle, Position, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'

const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
  },
  edges: {
    type: Array,
    default: () => []
  },
  searchKeyword: {
    type: String,
    default: ''
  },
  groupedAgents: {
    type: Object,
    default: () => ({})
  },
  categoryLabelMap: {
    type: Object,
    default: () => ({})
  },
  selectedNode: {
    type: Object,
    default: null
  },
  getConfigurableParams: {
    type: Function,
    required: true
  },
  getParamValue: {
    type: Function,
    required: true
  },
  methodDialogVisible: {
    type: Boolean,
    default: false
  },
  methodDialogAgent: {
    type: Object,
    default: null
  },
  methodDialogSelected: {
    type: String,
    default: ''
  },
  readOnly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:nodes',
  'update:edges',
  'update:searchKeyword',
  'locate-agent',
  'open-agent-method-dialog',
  'select-node',
  'update-param-value',
  'update:methodDialogVisible',
  'update:methodDialogSelected',
  'confirm-method-selection'
])

const { fitView } = useVueFlow()
const totalAgentCount = computed(() => Object.values(props.groupedAgents || {}).reduce((sum, group) => sum + (group?.length || 0), 0))
const visibleCategories = computed(() => Object.entries(props.groupedAgents || {})
  .filter(([, group]) => Array.isArray(group) && group.length)
  .map(([key]) => ({ key, label: props.categoryLabelMap[key] || key })))

const nodesProxy = computed({
  get: () => props.nodes,
  set: (val) => emit('update:nodes', val)
})

const edgesProxy = computed({
  get: () => props.edges,
  set: (val) => emit('update:edges', val)
})

const searchKeywordProxy = computed({
  get: () => props.searchKeyword,
  set: (val) => emit('update:searchKeyword', val)
})

const methodDialogVisibleProxy = computed({
  get: () => props.methodDialogVisible,
  set: (val) => emit('update:methodDialogVisible', val)
})

const methodDialogSelectedProxy = computed({
  get: () => props.methodDialogSelected,
  set: (val) => emit('update:methodDialogSelected', val)
})

const handleLocateAgent = (nodeId) => {
  emit('locate-agent', nodeId)
  nextTick(() => {
    fitView({ padding: 0.1, duration: 500 })
  })
}

const emitParamUpdate = (agentId, paramKey, index, val, param) => {
  if (props.readOnly) return
  emit('update-param-value', { agentId, paramKey, index, value: val, paramDef: param })
}

const handleResize = () => {
  fitView({ padding: 0.1 })
}

const fitCanvas = () => {
  fitView({ padding: 0.12, duration: 500 })
}

onMounted(() => {
  setTimeout(() => {
    fitView({ padding: 0.1, duration: 800 })
  }, 300)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.right-column {
  flex: 1;
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.agent-studio-wrapper {
  width: 100%;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.right-inner-layout {
  display: flex;
  width: 100%;
  height: 100%;
  gap: 12px;
  padding: 10px;
  background: #f0f9ff;
  box-sizing: border-box;
}

.sidebar.left-sidebar {
  width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  overflow: hidden;
}

.sidebar.left-sidebar .panel-header {
  padding: 12px 16px;
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-heading-copy { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.panel-heading-copy strong { color: #0f172a; font-size: 14px; }
.panel-heading-copy span { color: #94a3b8; font-size: 10px; font-weight: 500; }
.panel-count { min-width: 24px; height: 24px; padding: 0 6px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; background: #eff6ff; color: #2563eb; }
.panel-count,
.panel-header-hint {
  color: #64748b;
  font-size: 11px;
  font-weight: 500;
}

.sidebar.left-sidebar .left-sidebar-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.sidebar.left-sidebar :deep(.el-tabs__header) {
  margin: 0;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}
.sidebar.left-sidebar :deep(.el-tabs__nav-wrap)::after {
  display: none;
}
.sidebar.left-sidebar :deep(.el-tabs__item) {
  height: 42px;
  line-height: 42px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}
.sidebar.left-sidebar :deep(.el-tabs__item.is-active) {
  color: #1d4ed8;
}
.sidebar.left-sidebar :deep(.el-tabs__active-bar) {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  height: 3px;
}
.sidebar.left-sidebar :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.sidebar.left-sidebar :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar.left-sidebar .search-box {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #fff;
}

.enter-studio-btn {
  background: linear-gradient(135deg, #409EFF, #337ecc);
  border: none;
  font-size: 12px;
}

.sidebar-scroll {
  flex: 1;
  height: calc(100% - 96px);
  overflow-y: auto;
}

.agent-list {
  padding: 8px;
}

.agent-group {
  margin-bottom: 16px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-weight: 600;
  color: #334155;
  font-size: 14px;
  margin-bottom: 8px;
  background-color: #f1f5f9;
  border-radius: 6px;
}
.group-title > span:first-child { display: inline-flex; align-items: center; gap: 6px; }

.group-count {
  font-size: 12px;
  color: #64748b;
  font-weight: normal;
  margin-left: auto;
}

.agent-item {
  width: 100%;
  font-family: inherit;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #fff;
  border: 1px solid transparent;
  outline: none;
}
.agent-item:focus-visible { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.16); }
.agent-locate { color: #cbd5e1; font-size: 20px; line-height: 1; transition: transform 0.2s ease; }
.agent-item:hover .agent-locate { color: #0284c7; transform: translateX(2px); }
.agent-item.active .agent-locate { color: #fff; }

.agent-item:hover {
  background-color: #e0f2fe;
  border-color: #bae6fd;
}

.agent-item.active {
  background-color: #0ea5e9;
  color: #fff;
  border-color: #0284c7;
}

.agent-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.agent-icon.enterprise {
  background-color: #3b82f6;
}

.agent-icon.facility {
  background-color: #22c55e;
}

.agent-icon.supplier {
  background-color: #6366f1;
}

.agent-icon.manufacturer {
  background-color: #f97316;
}

.agent-icon.factory {
  background-color: #14b8a6;
}

.agent-icon.retailer {
  background-color: #ec4899;
}

/* 供应链三级配色 */
.agent-icon.supply {
  background-color: #6366f1;
}

.agent-icon.transport {
  background-color: #0891b2;
}

.agent-icon.manufacturing {
  background-color: #f97316;
}

.agent-icon.sales {
  background-color: #ec4899;
}

.agent-icon.other {
  background-color: #94a3b8;
}

.agent-info {
  flex: 1;
}

.agent-name {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 2px;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-item.active .agent-name {
  color: #fff;
}

.agent-category {
  font-size: 12px;
  color: #64748b;
}
.agent-info { min-width: 0; }

.entity-count {
  font-size: 11px;
  color: #409EFF;
  font-weight: 600;
  margin-left: 4px;
}

.agent-item.active .agent-category {
  color: #e0f2fe;
}

.right-content-area {
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 12px;
  height: 100%;
  min-width: 0;
}

.canvas-area {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 0;
  overflow: hidden;
}

.canvas-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #64748b;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  padding: 9px 10px 9px 12px;
}
.canvas-stage { flex: 1; min-height: 0; position: relative; background: linear-gradient(180deg, #fff, #f8fbff); }
.canvas-summary,
.canvas-actions,
.canvas-legend { display: flex; align-items: center; }
.canvas-summary { gap: 10px; font-size: 11px; white-space: nowrap; }
.canvas-summary strong { color: #0f172a; font-size: 13px; }
.canvas-summary span { padding-left: 10px; border-left: 1px solid #e2e8f0; }
.canvas-actions { gap: 12px; }
.canvas-legend { gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.legend-item { display: inline-flex; align-items: center; gap: 4px; color: #475569; font-size: 10px; white-space: nowrap; }
.legend-item i { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
.legend-item i.supply { background: #6366f1; }
.legend-item i.transport { background: #0891b2; }
.legend-item i.manufacturing { background: #f97316; }
.legend-item i.sales { background: #ec4899; }
.legend-item i.other { background: #94a3b8; }

.properties-panel {
  width: 320px;
  min-width: 320px;
  height: 100%;
  background: #fff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 10px;
  overflow: hidden;
}

.properties-panel .panel-header {
  padding: 8px 12px;
  font-weight: 600;
  color: #0ea5e9;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.properties-scroll { height: calc(100% - 44px); }

.custom-node {
  width: 200px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border: 2px solid transparent;
  transition: all 0.2s;
  overflow: hidden;
}
.custom-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 9px 24px rgba(15, 23, 42, 0.16);
}
.custom-node.selected {
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.16), 0 10px 26px rgba(15, 23, 42, 0.18);
}
.canvas-empty {
  position: absolute;
  inset: 50% auto auto 50%;
  z-index: 5;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  color: #94a3b8;
  text-align: center;
}
.canvas-empty > span { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 50%; background: #eff6ff; color: #3b82f6; font-size: 25px; }
.canvas-empty strong { color: #475569; font-size: 13px; }
.canvas-empty p { margin: 0; font-size: 11px; }

.custom-node.enterprise {
  border-color: #3b82f6;
}

.custom-node.facility {
  border-color: #22c55e;
}

.custom-node.supplier {
  border-color: #6366f1;
}

.custom-node.manufacturer {
  border-color: #f97316;
}

.custom-node.factory {
  border-color: #14b8a6;
}

.custom-node.retailer {
  border-color: #ec4899;
}

/* 供应链三级配色 */
.custom-node.supply {
  border-color: #6366f1;
}

.custom-node.transport {
  border-color: #0891b2;
}

.custom-node.manufacturing {
  border-color: #f97316;
}

.custom-node.sales {
  border-color: #ec4899;
}

.custom-node.other {
  border-color: #94a3b8;
}

.node-header {
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e5e7eb;
}

.node-title {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}

.entity-badge {
  display: inline-block;
  background: #409EFF;
  color: #fff;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 8px;
  margin-left: 4px;
  font-weight: 600;
  vertical-align: middle;
}

.node-tag {
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 4px;
  color: #fff;
  font-weight: 500;
}

.enterprise .node-tag { background: #3b82f6; }
.facility .node-tag { background: #22c55e; }
.supplier .node-tag { background: #6366f1; }
.manufacturer .node-tag { background: #f97316; }
.factory .node-tag { background: #14b8a6; }
.retailer .node-tag { background: #ec4899; }
/* 供应链三级配色 */
.supply .node-tag { background: #6366f1; }
.transport .node-tag { background: #0891b2; }
.manufacturing .node-tag { background: #f97316; }
.sales .node-tag { background: #ec4899; }
.other .node-tag { background: #94a3b8; }

.node-body {
  padding: 10px;
  font-size: 11px;
  color: #64748b;
}
.node-method.muted { color: #94a3b8; }

.handle-left, .handle-right, .handle-top, .handle-bottom {
  width: 8px;
  height: 8px;
  background: #0ea5e9;
  border: 2px solid #fff;
  border-radius: 50%;
}

.source-right {
  transform: translateX(2px);
}

.target-right {
  transform: translateX(-2px);
}

.property-card {
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.properties-panel :deep(.el-form-item__label) {
  padding-bottom: 4px;
  color: #475569;
  font-size: 11px;
  line-height: 1.4;
}
.properties-panel :deep(.el-input-number) { max-width: 100%; }
.properties-panel :deep(.el-input-number .el-input__wrapper) { box-shadow: 0 0 0 1px #dbeafe inset; }

.property-summary {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}
.property-hero {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}
.property-hero-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #64748b;
  color: #fff;
}
.property-hero-icon.supply { background: #6366f1; }
.property-hero-icon.transport { background: #0891b2; }
.property-hero-icon.manufacturing { background: #f97316; }
.property-hero-icon.sales { background: #ec4899; }
.property-hero > div:last-child { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.property-hero strong { color: #0f172a; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.property-hero span { color: #64748b; font-size: 11px; }

.property-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: #64748b;
}

.property-summary-row strong {
  color: #0f172a;
  font-size: 12px;
}

.property-summary-copy {
  padding: 8px 10px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
}

.property-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.property-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(8, 145, 178, 0.1);
  color: #0f766e;
  font-size: 11px;
}

.empty-tip {
  min-height: 180px;
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #94a3b8;
  text-align: center;
  font-size: 12px;
  line-height: 1.6;
}
.empty-tip-icon { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #eff6ff; color: #3b82f6; font-size: 24px; }
.empty-tip strong { color: #334155; font-size: 13px; }
.property-section-title { margin-bottom: 8px; color: #303133; font-size: 12px; font-weight: 600; }
.property-form { padding: 0 4px; }
.property-form-item { margin-bottom: 12px; }
.range-inputs { width: 100%; display: flex; align-items: center; gap: 6px; }
.range-input { flex: 1; min-width: 0; }
.range-divider { flex-shrink: 0; color: #909399; font-size: 11px; }
.number-input { width: 100%; }

.method-dialog-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.45;
}

.dialog-content {
  padding: 10px 0;
}

.dialog-footer {
  text-align: right;
}

@media (max-width: 1280px) {
  .properties-panel {
    width: 280px;
    min-width: 280px;
  }
}

@media (max-width: 1050px) {
  .right-inner-layout { flex-direction: column; }
  .sidebar.left-sidebar { width: 100%; height: 230px; }
  .agent-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .canvas-toolbar { align-items: flex-start; }
  .canvas-legend { display: none; }
}

@media (max-width: 760px) {
  .right-content-area { flex-direction: column; }
  .properties-panel { width: 100%; min-width: 0; height: 280px; }
  .canvas-summary span { display: none; }
}
</style>
