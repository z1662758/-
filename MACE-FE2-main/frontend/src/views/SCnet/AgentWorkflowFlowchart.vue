<template>
  <div class="workflow-page" :class="{ loaded: pageLoaded }">
    <div class="page-header">
      <div class="header-content">
        <h1>
          <el-icon><Cpu/></el-icon>
          仿真工作室
        </h1>
        <p>多智能体协同流程图 - {{ userGoalSnippet || '请先完成步骤 1-3 录入需求' }}</p>
      </div>
      <el-button type="primary" size="large" round class="enter-btn" @click="$emit('next')">
        进入仿真引擎
        <el-icon class="el-icon--right"><ArrowRight/></el-icon>
      </el-button>
    </div>

    <div class="main-content">
      <div class="section-container">
        <div class="section-title">
          <el-icon><Connection/></el-icon>
          仿真引擎
        </div>
        <div class="simulation-engine-tip">
          仿真工作室由需求分析、实验设计、变量生成、剧本选择与角色演员协同驱动，形成从指令到多角色推演执行的完整链路。
        </div>

        <div class="flow-wrapper">
          <svg class="flow-svg">
            <defs>
              <marker id="scnet-flow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L8,3 z" fill="#b1b3b8"/>
              </marker>
            </defs>
            <path class="connector-path" d="M200,100 L290,100"/>
            <path class="connector-path" d="M450,100 L540,100"/>
            <path class="connector-path" d="M700,100 C745,100 745,50 790,50"/>
            <path class="connector-path" d="M700,100 C745,100 745,150 790,150"/>
            <path class="connector-path" d="M950,50 C995,50 995,100 1040,100"/>
            <path class="connector-path" d="M950,150 C995,150 995,100 1040,100"/>
          </svg>

          <div class="flow-nodes">
            <div class="flow-node user-node">
              <div class="node-icon"><el-icon><UserFilled/></el-icon></div>
              <div class="node-content">
                <div class="node-title">用户指令</div>
                <div class="node-desc">{{ userGoalSnippet || '待录入' }}</div>
              </div>
            </div>

            <div class="flow-node agent-node blue">
              <div class="node-header"><el-icon><DataAnalysis/></el-icon>需求分析 Agent</div>
              <div class="node-body">
                <div class="tag">关键要素提取</div>
                <div class="tag">意图识别</div>
              </div>
            </div>

            <div class="flow-node agent-node orange main-agent">
              <div class="node-header"><el-icon><VideoCamera/></el-icon>实验设计 Agent (导演)</div>
              <div class="node-body">
                <div class="tag">流程统筹</div>
                <div class="tag">任务分发</div>
              </div>
            </div>

            <div class="flow-branches">
              <div class="flow-node agent-node green sub-agent">
                <div class="node-header"><el-icon><Operation/></el-icon>变量生成 Agent</div>
                <div class="node-body">
                  <div class="tag" v-for="(name, idx) in variableTags" :key="idx">{{ name }}</div>
                </div>
              </div>

              <div class="flow-node agent-node purple sub-agent">
                <div class="node-header"><el-icon><Document/></el-icon>剧本选择 Agent (编剧)</div>
                <div class="node-body">
                  <div class="tag" v-for="(name, idx) in subtaskTags" :key="idx">{{ name }}</div>
                  <div v-if="!subtaskTags.length" class="tag">暂无拆解子任务</div>
                </div>
              </div>
            </div>

            <div class="actor-stack">
              <div class="actor-card-bg card-1"></div>
              <div class="actor-card-bg card-2"></div>
              <div class="flow-node agent-node red actor-agent">
                <div class="node-header"><el-icon><User/></el-icon>角色演员 Agents</div>
                <div class="node-body">
                  <div class="tag" v-for="(role, idx) in actorTags" :key="idx">{{ role }}</div>
                  <div v-if="!actorTags.length" class="tag">销售商 / 制造商 / 供应商</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="empty" class="empty-state">
        暂无可用的智能体设计。请先在步骤 1-3 完成需求分析，并提交进入步骤 4。
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import {
  ArrowRight,
  Connection,
  Cpu,
  DataAnalysis,
  Document,
  Operation,
  User,
  UserFilled,
  VideoCamera
} from '@element-plus/icons-vue'

defineEmits(['next'])
defineProps({
  empty: { type: Boolean, default: false }
})

const store = useSupplyChainStore()
const pageLoaded = ref(false)

const userGoalSnippet = computed(() => {
  const goal = (store.scenarioUserGoal || '').trim()
  return goal.length > 40 ? goal.slice(0, 40) + '…' : goal
})

const subtaskTags = computed(() => {
  const subtasks = Array.isArray(store.scenarioSubtasks) ? store.scenarioSubtasks : []
  return subtasks
    .map((t) => t?.title || t?.description || '')
    .filter(Boolean)
    .slice(0, 3)
})

const variableTags = computed(() => {
  const result = store.scenarioApiResult || {}
  const factors = Array.isArray(result.influence_factor) ? result.influence_factor : []
  if (factors.length) return factors.slice(0, 3)
  return ['参数定义', '初始状态']
})

const actorTags = computed(() => {
  const payload = store.agentDesignPayload
  if (!payload || !Array.isArray(payload.agents)) return []
  return payload.agents.map((a) => a?.name || a?.role || '').filter(Boolean).slice(0, 4)
})

onMounted(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { pageLoaded.value = true })
  })
})
</script>

<style scoped>
.workflow-page {
  width: 100%;
  min-height: 100%;
  padding: 24px 32px 32px;
  background: linear-gradient(180deg, #f8fafc, #eef2ff);
  opacity: 0;
  transition: opacity 0.45s ease;
}
.workflow-page.loaded { opacity: 1; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.header-content h1 {
  margin: 0 0 4px;
  font-size: 22px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e3a8a;
}
.header-content p { margin: 0; color: #475569; font-size: 13px; }
.enter-btn { font-weight: 600; }

.section-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #1f2937;
  font-size: 15px;
}
.simulation-engine-tip {
  margin: 10px 0 24px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.flow-wrapper {
  position: relative;
  height: 220px;
}
.flow-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.connector-path {
  fill: none;
  stroke: #94a3b8;
  stroke-width: 1.4;
  marker-end: url(#scnet-flow-arrow);
}
.flow-nodes {
  position: relative;
  display: grid;
  grid-template-columns: 200px 260px 260px 240px 260px;
  align-items: center;
  gap: 30px;
  height: 100%;
}
.flow-node {
  background: #ffffff;
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
  min-height: 90px;
}
.user-node {
  display: flex;
  align-items: center;
  gap: 10px;
  border-color: #cbd5e1;
}
.node-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e0f2fe;
  color: #0369a1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.node-title { font-weight: 700; color: #0f172a; }
.node-desc { font-size: 12px; color: #475569; }

.agent-node .node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #1e293b;
}
.agent-node.blue { border-color: #bfdbfe; background: linear-gradient(135deg, #eff6ff, #ffffff); }
.agent-node.orange { border-color: #fed7aa; background: linear-gradient(135deg, #fff7ed, #ffffff); }
.agent-node.green { border-color: #bbf7d0; background: linear-gradient(135deg, #ecfdf5, #ffffff); }
.agent-node.purple { border-color: #ddd6fe; background: linear-gradient(135deg, #f5f3ff, #ffffff); }
.agent-node.red { border-color: #fecaca; background: linear-gradient(135deg, #fef2f2, #ffffff); }
.main-agent { box-shadow: 0 10px 24px rgba(249, 115, 22, 0.15); }
.tag {
  display: inline-block;
  background: #f1f5f9;
  color: #334155;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  margin-right: 6px;
  margin-bottom: 4px;
}

.flow-branches {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.flow-branches .sub-agent { min-height: 78px; }

.actor-stack {
  position: relative;
}
.actor-card-bg {
  position: absolute;
  inset: 6px -10px -10px 10px;
  background: #ffffff;
  border: 1px solid #fecaca;
  border-radius: 12px;
  z-index: 0;
  opacity: 0.6;
}
.actor-card-bg.card-2 { inset: 12px -20px -16px 18px; opacity: 0.35; }
.actor-agent { position: relative; z-index: 1; }

.empty-state {
  margin-top: 20px;
  padding: 14px 18px;
  background: #fff7ed;
  border: 1px dashed #fdba74;
  color: #9a3412;
  border-radius: 10px;
  font-size: 13px;
}
</style>
