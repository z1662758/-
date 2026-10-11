<template>
  <nav class="analysis-pipeline-container glass-panel" aria-label="事中决策分析业务流水线">
    <!-- 极简单行流水线流转条 -->
    <div class="pipeline-flow-row">
      <div class="pipeline-steps">
        <div
          v-for="(step, idx) in pipelineSteps"
          :key="step.key"
          class="pipeline-step-item"
          :class="{
            active: activeStepKey === step.key,
            passed: currentStepIndex > idx
          }"
          role="button"
          tabindex="0"
          :title="step.question"
          @click="navigateStep(step.key)"
          @keydown.enter.prevent="navigateStep(step.key)"
        >
          <div class="step-num-badge">
            <el-icon v-if="currentStepIndex > idx"><Check /></el-icon>
            <span v-else>0{{ idx + 1 }}</span>
          </div>
          <span class="step-title">{{ step.title }}</span>
          <el-tag
            size="small"
            :type="activeStepKey === step.key ? 'primary' : currentStepIndex > idx ? 'success' : 'info'"
            effect="plain"
            class="step-status-tag"
          >
            {{ activeStepKey === step.key ? '当前' : currentStepIndex > idx ? '完成' : '待办' }}
          </el-tag>
          <!-- 步骤连接箭头 -->
          <div v-if="idx < pipelineSteps.length - 1" class="step-arrow">
            <el-icon><Right /></el-icon>
          </div>
        </div>

        <!-- 悬浮说明问号 Popover：收录原先霸占大横幅的说明文字 -->
        <el-popover
          placement="bottom-start"
          :width="360"
          trigger="hover"
          popper-class="pipeline-info-popover"
        >
          <template #reference>
            <button type="button" class="pipeline-info-btn" aria-label="业务流转说明">
              <el-icon :size="13"><InfoFilled /></el-icon>
              <span>阶段导引</span>
            </button>
          </template>
          <div class="popover-narrative-box" :class="currentStepInfo.tone">
            <div class="pnb-head">
              <span class="pnb-badge">{{ currentStepInfo.badge }}</span>
              <strong>{{ currentStepInfo.headline }}</strong>
            </div>
            <p class="pnb-desc">{{ currentStepInfo.desc }}</p>
            <div class="pnb-footer">
              <span class="pnb-target-lbl">{{ currentStepInfo.handoffLabel }}</span>
              <strong class="pnb-target-val">{{ currentStepInfo.handoffTarget }}</strong>
            </div>
          </div>
        </el-popover>
      </div>

      <!-- 右侧：当前实验快速切换与下一步快捷流转 -->
      <div class="pipeline-actions">
        <el-select
          v-if="isUranium"
          :model-value="experimentStore.selectedExperimentId"
          class="analysis-experiment-select"
          size="small"
          aria-label="分析实验"
          placeholder="选择实验"
          @change="changeExperiment"
        >
          <el-option
            v-for="item in experimentStore.history"
            :key="item.experiment_id"
            :label="item.name || item.experiment_id"
            :value="item.experiment_id"
          />
        </el-select>

        <el-button
          v-if="currentStepInfo.nextStepKey"
          type="primary"
          size="small"
          class="pipeline-next-btn"
          @click="navigateStep(currentStepInfo.nextStepKey)"
        >
          <span>{{ currentStepInfo.nextStepBtnText }}</span>
          <el-icon><Right /></el-icon>
        </el-button>
        <el-button
          v-else
          type="success"
          size="small"
          class="pipeline-next-btn"
          @click="goToSimulation"
        >
          <span>返回仿真推演</span>
          <el-icon><Right /></el-icon>
        </el-button>

        <slot name="right" />
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import {
  Check,
  Document,
  Grid,
  InfoFilled,
  Promotion,
  Right,
  TrendCharts
} from '@element-plus/icons-vue'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useScenarioStore } from '@/stores/scenario'
import { SCNET_DECISION_ROUTE_BY_TAB, SCNET_ROUTES } from '@/constants/scnetRoutes'
import './midStage.css'

const props = defineProps({
  active: {
    type: String,
    required: true,
    validator: v => ['decision', 'gameTheory', 'strategy', 'decisionTree', 'scenario', 'report', 'overview'].includes(v)
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

// 统一的 4 阶段流水线步骤定义：脆弱性诊断 → 决策分析寻优 → 创新决策方案 → 闭环专报
const pipelineSteps = [
  {
    key: 'gameTheory',
    title: '脆弱性分析',
    subtitle: '诊断定点 · 排查断供咽喉',
    question: '“供应链网络里，谁最脆弱、谁最难替代？”',
    icon: markRaw(Grid)
  },
  {
    key: 'strategy',
    title: '决策分析',
    subtitle: '对策寻优 · 情景与决策树',
    question: '“面对脆弱断点与外部冲击，如何形成可比较的决策建议？”',
    icon: markRaw(TrendCharts)
  },
  {
    key: 'decision',
    title: '决策方案',
    subtitle: '落地闭环 · 核心措施与自适应规则',
    question: '“如何将推演与评估成果转化为落地应对调度指令与规则？”',
    icon: markRaw(Promotion)
  },
  {
    key: 'report',
    title: '报告生成',
    subtitle: '专报输出 · 闭环决策专报',
    question: '“如何汇总推演结论与调控建议形成综合专报？”',
    icon: markRaw(Document)
  }
]

// 规格化当前激活 key
const activeStepKey = computed(() => {
  if (['scenario', 'decisionTree', 'strategy'].includes(props.active)) return 'strategy'
  if (['report', 'overview'].includes(props.active)) return 'report'
  return props.active
})

const currentStepIndex = computed(() => {
  const idx = pipelineSteps.findIndex(s => s.key === activeStepKey.value)
  return idx >= 0 ? idx : 0
})

// 当前步骤的业务逻辑导引信息
const currentStepInfo = computed(() => {
  if (activeStepKey.value === 'gameTheory') {
    return {
      tone: 'tone-vulnerability',
      badge: 'Step 01 · 诊断定点',
      headline: '面对突发外部冲击，系统哪里最脆弱？',
      desc: '承接长周期推演异常，通过网络拓扑介数与依赖矩阵排查单点失效。已诊断出：中哈阿拉山口口岸（介数 0.84，负荷率 94%）与包头制造基地（库存破 14 周警戒线）构成全网首要脆弱咽喉。',
      handoffLabel: '下一步流转：',
      handoffTarget: '将上述脆弱点作为约束输入，送入决策分析寻优',
      nextStepKey: 'strategy',
      nextStepBtnText: '下一步：决策分析'
    }
  }

  if (activeStepKey.value === 'strategy') {
    return {
      tone: 'tone-strategy',
      badge: 'Step 02 · 对策寻优',
      headline: '面对脆弱断点，如何科学评估各种调控对策？',
      desc: '上层锚定 2024–2030 宏观扰动情景，下层展开扩展式博弈决策树多路径寻优。已求解出最优方案：“跨里海多式联运绕行 + 防城港保税库应急借调平准”（综合评分 91.5 分）。',
      handoffLabel: '下一步流转：',
      handoffTarget: '将评估优选结论输入，生成创新决策方案与自适应规则',
      nextStepKey: 'decision',
      nextStepBtnText: '下一步：决策方案'
    }
  }

  if (activeStepKey.value === 'decision') {
    return {
      tone: 'tone-strategy',
      badge: 'Step 03 · 决策方案',
      headline: '面对突发冲击，生成哪些具体调控指令与规则？',
      desc: '汇总脆弱性诊断与决策树多目标评估成果，生成包含“跨里海绕行 + 战略平准库借调 + 长协现货动态配比”的落地执行方案与自适应熔断规则。',
      handoffLabel: '下一步流转：',
      handoffTarget: '将应对措施与推演证据链汇总生成综合决策专报',
      nextStepKey: 'report',
      nextStepBtnText: '下一步：报告生成'
    }
  }

  return {
    tone: 'tone-report',
    badge: 'Step 04 · 闭环专报',
    headline: '汇总推演全链路分析结论，输出高管级综合决策专报',
    desc: '汇总脆弱性诊断（定点）、决策树博弈求解（寻优）与落地决策调控措施的完整因果证据链，形成高管级闭环决策报告并支持导出 PDF。',
    handoffLabel: '推演闭环：',
    handoffTarget: '全链路决策推演已完成闭环',
    nextStepKey: null,
    nextStepBtnText: '返回沙盘推演'
  }
})

function navigateStep(key) {
  if (key === activeStepKey.value) return
  const target = SCNET_DECISION_ROUTE_BY_TAB[key] || (key === 'strategy' ? SCNET_ROUTES.expAnalysisScenario : null)
  if (target) {
    const query = { ...router.currentRoute.value.query }
    delete query.section
    router.push({ path: target, query })
  }
}

function goToSimulation() {
  router.push({
    path: '/home/SCnet/interface',
    query: {
      scenario: 'uranium',
      view: 'simulation'
    }
  })
}
</script>

<style scoped>
.analysis-pipeline-container {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  margin: 6px 8px 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
}

/* 流水线单行布局 */
.pipeline-flow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.pipeline-steps {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.pipeline-step-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.pipeline-step-item:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}
.pipeline-step-item.active {
  background: #eff6ff;
  border-color: #2563eb;
  box-shadow: 0 0 0 1.5px rgba(37, 99, 235, 0.2);
}
.pipeline-step-item.passed {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.step-num-badge {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  background: #e2e8f0;
  color: #475569;
  flex-shrink: 0;
}
.pipeline-step-item.active .step-num-badge {
  background: #2563eb;
  color: #ffffff;
}
.pipeline-step-item.passed .step-num-badge {
  background: #10b981;
  color: #ffffff;
}

.step-title {
  font-size: 12.5px;
  font-weight: 600;
  color: #1e293b;
}
.pipeline-step-item.active .step-title {
  color: #1d4ed8;
  font-weight: 700;
}

.step-status-tag {
  font-size: 10px;
  height: 18px;
  line-height: 16px;
  padding: 0 4px;
}

.step-arrow {
  display: flex;
  align-items: center;
  color: #cbd5e1;
  font-size: 11px;
  margin-left: 2px;
}

/* 阶段说明问号按钮 */
.pipeline-info-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px dashed #cbd5e1;
  background: transparent;
  color: #64748b;
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-left: 4px;
}
.pipeline-info-btn:hover {
  border-color: #3b82f6;
  color: #2563eb;
  background: #eff6ff;
}

/* 悬浮 Popover 样式 */
.popover-narrative-box {
  padding: 4px;
  font-size: 12px;
  line-height: 1.5;
}
.pnb-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.pnb-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #e2e8f0;
  color: #0f172a;
}
.pnb-desc {
  color: #475569;
  margin: 0 0 8px 0;
  font-size: 12px;
}
.pnb-footer {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
  font-size: 11.5px;
}
.pnb-target-lbl {
  color: #64748b;
}
.pnb-target-val {
  color: #0f172a;
}

.pipeline-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.analysis-experiment-select {
  width: 220px;
}
.pipeline-next-btn {
  font-weight: 500;
}

@media (max-width: 1280px) {
  .analysis-experiment-select {
    width: 170px;
  }
  .pipeline-step-item {
    padding: 3px 6px;
  }
}
</style>
