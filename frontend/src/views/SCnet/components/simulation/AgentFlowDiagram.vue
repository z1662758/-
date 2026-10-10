<template>
  <div class="section-container agent-flow-container">
    <div class="section-title">
      <el-icon><Connection /></el-icon> {{ sectionTitle }}
    </div>
    <div class="flow-wrapper">
      <svg class="flow-svg">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L8,3 z" fill="#b1b3b8" />
          </marker>
        </defs>

        <path class="connector-path" d="M140,100 L180,100" />
        <path class="connector-path" d="M340,100 L380,100" />
        <path class="connector-path" d="M540,100 C560,100 560,60 580,60" />
        <path class="connector-path" d="M540,100 C560,100 560,140 580,140" />
        <path class="connector-path" d="M740,60 C760,60 760,100 780,100" />
        <path class="connector-path" d="M740,140 C760,140 760,100 780,100" />
      </svg>

      <div class="flow-nodes">
        <el-tooltip
          :content="userGoalTooltip"
          placement="top"
          :show-after="200"
          :max-width="360"
        >
          <div class="flow-node user-node user-node--instruction-only">
            <div class="node-icon"><el-icon><UserFilled /></el-icon></div>
            <div class="node-content">
              <div class="node-title">用户指令</div>
            </div>
          </div>
        </el-tooltip>

        <div class="flow-node agent-node blue">
          <div class="node-header">
            <el-icon><DataAnalysis /></el-icon> 需求分析 Agent
          </div>
          <div class="node-body">
            <div class="tag">目标拆解</div>
            <div class="tag">变量归并</div>
          </div>
        </div>

        <div class="flow-node agent-node orange main-agent">
          <div class="node-header">
            <el-icon><VideoCamera /></el-icon> planner Agent
          </div>
          <div class="node-body">
            <template v-if="plannerStrategyOptions.length <= 1">
              <div class="single-select-readonly">{{ plannerStrategyLabel }}</div>
            </template>
            <el-select
              v-else
              v-model="plannerStrategyProxy"
              size="small"
              style="width: 100%; margin-top: 4px;"
              @click.stop
            >
              <el-option
                v-for="opt in plannerStrategyOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
        </div>

        <div class="flow-branches">
          <div class="flow-node agent-node green sub-agent">
            <div class="node-header">
              <el-icon><Operation /></el-icon> environment Agent
            </div>
            <div class="node-body">
              <div class="tag">订单流仿真</div>
              <div class="tag">扰动场景注入</div>
            </div>
          </div>
          <div class="flow-node agent-node purple sub-agent">
            <div class="node-header">
              <el-icon><Document /></el-icon> observer Agent
            </div>
            <div class="node-body">
              <div class="tag">指标观测</div>
              <div class="tag">敏感性评估</div>
            </div>
          </div>
        </div>

        <div class="actor-stack">
          <div class="actor-card-bg card-1"></div>
          <div class="actor-card-bg card-2"></div>
          <div class="flow-node agent-node red actor-agent">
            <div class="node-header">
              <el-icon><User /></el-icon> social Agents
            </div>
            <div class="node-body">
              <div class="tag">制造总厂</div>
              <div class="tag">供应商</div>
              <div class="tag">销售商</div>
              <div class="tag">协作网络</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Connection,
  UserFilled,
  DataAnalysis,
  VideoCamera,
  Operation,
  Document,
  User
} from '@element-plus/icons-vue'

const props = defineProps({
  sectionTitle: {
    type: String,
    default: '智能体协作流程'
  },
  userGoalTooltip: {
    type: String,
    default: ''
  },
  plannerStrategy: {
    type: String,
    required: true
  },
  plannerStrategyOptions: {
    type: Array,
    default: () => []
  },
  plannerStrategyLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:plannerStrategy'])

const plannerStrategyProxy = computed({
  get: () => props.plannerStrategy,
  set: (val) => emit('update:plannerStrategy', val)
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

.agent-flow-container {
  flex: 0 0 auto;
  min-height: 200px;
}

.flow-wrapper {
  position: relative;
  height: 160px;
  display: flex;
  align-items: center;
  padding-left: 10px;
}

.user-node.user-node--instruction-only {
  cursor: help;
}

.user-node.user-node--instruction-only .node-content {
  min-width: 0;
}

.user-node.user-node--instruction-only .node-title {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}

.single-select-readonly {
  margin-top: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.flow-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.connector-path {
  fill: none;
  stroke: #dcdfe6;
  stroke-width: 2;
  stroke-dasharray: 10;
  animation: dash 30s linear infinite;
  marker-end: url(#arrow);
}

@keyframes dash {
  to {
    stroke-dashoffset: -1000;
  }
}

.flow-nodes {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  width: 100%;
}

.flow-node {
  background: #fff;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: default;
}

.user-node {
  width: 120px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #dcdfe6;
  margin-right: 20px;
}

.user-node .node-icon {
  width: 30px;
  height: 30px;
  background: #f0f2f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #606266;
}

.user-node .node-title {
  font-size: 11px;
  color: #909399;
}

.agent-node {
  width: 140px;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  overflow: hidden;
  margin-right: 20px;
  cursor: pointer;
}

.agent-node:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.agent-node .node-header {
  padding: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 6px;
}

.agent-node.blue .node-header { background: linear-gradient(135deg, #409EFF, #337ecc); }
.agent-node.orange .node-header { background: linear-gradient(135deg, #E6A23C, #cf9236); }
.agent-node.green .node-header { background: linear-gradient(135deg, #67C23A, #529b2e); }
.agent-node.purple .node-header { background: linear-gradient(135deg, #8e44ad, #9b59b6); }
.agent-node.red .node-header { background: linear-gradient(135deg, #F56C6C, #c45656); }

.agent-node .node-body {
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.method-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
}

.method-label {
  font-size: 10px;
  color: #606266;
  min-width: 44px;
}

.method-select {
  flex: 1;
  min-width: 0;
}

.agent-node .tag {
  font-size: 9px;
  background: #f4f4f5;
  color: #909399;
  padding: 1px 4px;
  border-radius: 3px;
}

.flow-branches {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-left: 0;
  margin-right: 20px;
}

.sub-agent {
  margin-right: 0;
  cursor: pointer;
}

.actor-stack {
  position: relative;
  width: 140px;
  height: 80px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.actor-agent {
  position: relative;
  z-index: 3;
  width: 100%;
  margin: 0;
}

.actor-card-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

.card-1 {
  z-index: 2;
  transform: translate(3px, 3px);
}

.card-2 {
  z-index: 1;
  transform: translate(6px, 6px);
}
</style>
