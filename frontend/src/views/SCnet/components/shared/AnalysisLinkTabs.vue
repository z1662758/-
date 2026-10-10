<template>
  <nav class="analysis-pipeline-container glass-panel" aria-label="事中决策分析业务流水线">
    <!-- 顶部：三阶段业务流水线流转条 (对齐人群聚集与大国博弈的贯通式工作流) -->
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
          @click="navigateStep(step.key)"
          @keydown.enter.prevent="navigateStep(step.key)"
        >
          <div class="step-num-badge">
            <el-icon v-if="currentStepIndex > idx"><Check /></el-icon>
            <span v-else>0{{ idx + 1 }}</span>
          </div>
          <div class="step-content">
            <div class="step-title-row">
              <span class="step-title">{{ step.title }}</span>
              <el-tag
                size="small"
                :type="activeStepKey === step.key ? 'primary' : currentStepIndex > idx ? 'success' : 'info'"
                effect="plain"
                class="step-status-tag"
              >
                {{ activeStepKey === step.key ? '正在分析' : currentStepIndex > idx ? '已完成' : '待流转' }}
              </el-tag>
            </div>
            <span class="step-subtitle">{{ step.subtitle }}</span>
            <small class="step-question">{{ step.question }}</small>
          </div>
          <!-- 步骤连接箭头 -->
          <div v-if="idx < pipelineSteps.length - 1" class="step-arrow">
            <el-icon><Right /></el-icon>
          </div>
        </div>
      </div>

      <!-- 右侧：当前实验快速切换与行动入口 -->
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
        <slot name="right" />
      </div>
    </div>

    <!-- 底部：当前步骤业务逻辑导引横幅 (彻底回答“本分析想说明什么”) -->
    <div class="pipeline-narrative-banner" :class="currentStepInfo.tone">
      <div class="narrative-left">
        <span class="narrative-badge">{{ currentStepInfo.badge }}</span>
        <div class="narrative-text-wrap">
          <strong class="narrative-headline">{{ currentStepInfo.headline }}</strong>
          <p class="narrative-desc">{{ currentStepInfo.desc }}</p>
        </div>
      </div>

      <div class="narrative-right">
        <div class="narrative-handoff-hint">
          <small>{{ currentStepInfo.handoffLabel }}</small>
          <strong>{{ currentStepInfo.handoffTarget }}</strong>
        </div>
        <el-button
          v-if="currentStepInfo.nextStepKey"
          type="primary"
          size="small"
          @click="navigateStep(currentStepInfo.nextStepKey)"
        >
          <span>{{ currentStepInfo.nextStepBtnText }}</span>
          <el-icon><Right /></el-icon>
        </el-button>
        <el-button
          v-else
          type="success"
          size="small"
          @click="goToSimulation"
        >
          <span>返回仿真推演大盘</span>
          <el-icon><Right /></el-icon>
        </el-button>
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
      headline: '本分析想说明：面对突发外部冲击，系统哪里最脆弱？',
      desc: '承接 2024–2030 年长周期推演运行异常，通过网络拓扑介数与依赖矩阵排查单点失效。已诊断出：中哈阿拉山口口岸（介数 0.84，负荷率 94%）与包头制造基地（库存破 14 周警戒线）构成全网首要脆弱咽喉。',
      handoffLabel: '下一步流转：',
      handoffTarget: '将上述脆弱点作为约束输入，送入决策分析寻优',
      nextStepKey: 'strategy',
      nextStepBtnText: '下一步：前往决策分析评估'
    }
  }

  if (activeStepKey.value === 'strategy') {
    return {
      tone: 'tone-strategy',
      badge: 'Step 02 · 对策寻优',
      headline: '本分析想说明：面对已确定的脆弱断点，如何科学评估各种调控对策？',
      desc: '承接上一步【脆弱性诊断】结果：上层锚定 2024–2030 宏观扰动情景画像，下层展开扩展式博弈决策树多路径寻优。已求解出最优方案：“跨里海多式联运绕行 + 防城港保税库应急借调平准”（综合评分 91.5 分，较基线提升 +23.5 分）。',
      handoffLabel: '下一步流转：',
      handoffTarget: '将评估优选结论输入，生成创新决策方案与自适应规则',
      nextStepKey: 'decision',
      nextStepBtnText: '下一步：前往决策方案生成'
    }
  }

  if (activeStepKey.value === 'decision') {
    return {
      tone: 'tone-strategy',
      badge: 'Step 03 · 决策方案',
      headline: '本方案想说明：面对突发外部冲击，生成哪些具体应对调控指令与触发规则？',
      desc: '汇总脆弱性诊断与决策树多目标博弈评估成果，创新生成包含“跨里海绕行 + 战略平准库借调 + 长协现货配比动态优化”的落地执行方案与自适应熔断触发规则。',
      handoffLabel: '下一步流转：',
      handoffTarget: '将应对措施与推演证据链汇总生成综合决策专报',
      nextStepKey: 'report',
      nextStepBtnText: '下一步：前往报告生成'
    }
  }

  return {
    tone: 'tone-report',
    badge: 'Step 04 · 闭环专报',
    headline: '本报告想说明：汇总推演全链路分析结论，输出高管级综合决策专报',
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
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px 12px;
  margin: 6px 8px 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

/* 流水线步骤行 */
.pipeline-flow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.pipeline-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.pipeline-step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 220px;
}
.pipeline-step-item:hover {
  background: #f0f7ff;
  border-color: #3b82f6;
  transform: translateY(-1px);
}
.pipeline-step-item.active {
  background: #eff6ff;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}
.pipeline-step-item.passed {
  border-color: #cbd5e1;
}

.step-num-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
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

.step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.step-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.step-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
}
.step-status-tag {
  font-size: 10px;
  height: 18px;
  padding: 0 6px;
}
.step-subtitle {
  font-size: 11px;
  font-weight: 600;
  color: #2563eb;
}
.pipeline-step-item.passed .step-subtitle {
  color: #10b981;
}
.step-question {
  font-size: 10px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 14px;
  margin-left: 4px;
  flex-shrink: 0;
}

.pipeline-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.analysis-experiment-select {
  width: 240px;
}

/* 底部业务导引横幅 */
.pipeline-narrative-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 14px;
  border-radius: 6px;
  background: #f8fafc;
  border-left: 4px solid #3b82f6;
  font-size: 11.5px;
}
.pipeline-narrative-banner.tone-vulnerability {
  border-left-color: #f59e0b;
  background: #fffbeb;
}
.pipeline-narrative-banner.tone-strategy {
  border-left-color: #10b981;
  background: #f0fdf4;
}
.pipeline-narrative-banner.tone-report {
  border-left-color: #8b5cf6;
  background: #f5f3ff;
}

.narrative-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.narrative-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.06);
  color: #0f172a;
  white-space: nowrap;
}
.narrative-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.narrative-headline {
  font-size: 12.5px;
  color: #0f172a;
}
.narrative-desc {
  margin: 0;
  font-size: 11.5px;
  color: #475569;
  line-height: 1.4;
}

.narrative-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
.narrative-handoff-hint {
  display: flex;
  flex-direction: column;
  text-align: right;
  gap: 1px;
}
.narrative-handoff-hint small {
  font-size: 10px;
  color: #64748b;
}
.narrative-handoff-hint strong {
  font-size: 11.5px;
  color: #0f172a;
}

@media (max-width: 1280px) {
  .pipeline-steps {
    flex-wrap: wrap;
  }
  .pipeline-step-item {
    min-width: 180px;
  }
  .pipeline-narrative-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .narrative-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
