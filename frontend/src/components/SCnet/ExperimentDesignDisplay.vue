<template>
  <div class="experiment-design-display">
    <!-- Loading State -->
    <el-skeleton v-if="loading" :rows="8" animated />

    <!-- Empty State -->
    <el-empty v-else-if="!hasAnyDisplayData" description="暂无会话设计；下方可查看队列提交的参数" />

    <!-- Content -->
    <div v-else class="design-content">
      <!-- 实验目标 -->
      <el-card shadow="hover" class="section-card">
        <template #header>
          <div class="section-header">
            <span>实验目标</span>
            <el-tag v-if="goalType" type="primary" size="small">
              {{ formatGoalType(goalType) }}
            </el-tag>
          </div>
        </template>
        <div class="goal-content">
          <h3>{{ userGoal }}</h3>
          <div v-if="userRawInput && userRawInput !== userGoal" class="raw-input">
            <span class="label">原始输入：</span>{{ userRawInput }}
          </div>
          <el-divider v-if="goalUnderstanding" />
          <p v-if="goalUnderstanding" class="goal-understanding">
            <span class="label">AI 理解：</span>{{ goalUnderstanding }}
          </p>
        </div>
      </el-card>

      <!-- 研究设计 -->
      <el-card shadow="hover" class="section-card">
        <template #header>
          <span>研究设计</span>
        </template>
        <div class="design-grid">
          <!-- 研究变量 -->
          <div v-if="userVariables.length > 0" class="design-item">
            <div class="design-label">研究变量</div>
            <div class="variable-tags">
              <el-tag
                v-for="(v, index) in userVariables"
                :key="index"
                size="default"
                effect="plain"
                type="primary"
              >
                {{ v }}
              </el-tag>
            </div>
          </div>

          <!-- 研究对象 -->
          <div v-if="userObject" class="design-item">
            <div class="design-label">研究对象</div>
            <el-tag size="default" effect="plain" type="success">{{ userObject }}</el-tag>
          </div>

          <!-- 分析阶段 -->
          <div v-if="analysisPhase" class="design-item">
            <div class="design-label">分析阶段</div>
            <el-tag size="default" :type="phaseTagType">{{ analysisPhase }}</el-tag>
          </div>

          <!-- 实验方法 -->
          <div v-if="experimentMethod" class="design-item">
            <div class="design-label">实验方法</div>
            <span class="design-value">{{ experimentMethod }}</span>
          </div>
        </div>
      </el-card>

      <!-- 执行配置 -->
      <el-card shadow="hover" class="section-card">
        <template #header>
          <span>执行配置</span>
        </template>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="场景 (run.py)">
            <el-tag type="info" size="small">{{ formatScenario(executionParams?.scenario) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="规划策略">
            <span class="mono-text">{{ executionParams?.planner_strategy || 'native' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="子任务数">
            {{ queueSubtaskCount }}
          </el-descriptions-item>
          <el-descriptions-item label="迭代次数">
            <el-tag type="primary" size="small">
              {{ executionParams?.iterations || sessionIterations || '-' }} 轮
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="LLM 模型">
            <el-tag type="success" size="small">
              {{ formatModel(executionParams?.model || sessionModel) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="目标拆解">
            <el-tag :type="useDecompose ? 'warning' : 'info'" size="small">
              {{ useDecompose ? '已启用' : '未启用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="仿真周期">
            {{ simDuration }} 个月
          </el-descriptions-item>
          <el-descriptions-item label="会话ID">
            <span class="mono-text">{{ sessionData?.session_id || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTimestamp(sessionData?.timestamp) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 实际执行命令（任务启动后由后端合并回 params） -->
      <el-card v-if="executedCliLines" shadow="hover" class="section-card">
        <template #header>
          <span>实际执行命令（run.py）</span>
        </template>
        <pre class="cli-block">{{ executedCliLines }}</pre>
      </el-card>

      <!-- 队列提交完整参数 JSON -->
      <el-card v-if="queueParamsJson" shadow="hover" class="section-card">
        <template #header>
          <span>队列提交参数（完整 JSON）</span>
        </template>
        <el-input
          type="textarea"
          :model-value="queueParamsJson"
          readonly
          :autosize="{ minRows: 8, maxRows: 22 }"
          class="json-textarea"
        />
      </el-card>

      <!-- 目标拆解 -->
      <el-card v-if="subtasks && subtasks.length > 0" shadow="hover" class="section-card">
        <template #header>
          <div class="section-header">
            <span>目标拆解</span>
            <el-tag size="small" type="info">{{ subtasks.length }} 个子任务</el-tag>
          </div>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="(task, index) in subtasks"
            :key="index"
          >
            <div class="task-item">
              <div class="task-header">
                <div class="task-title-row">
                  <span class="task-index">#{{ index + 1 }}</span>
                  <el-tag :type="getAgentTypeColor(task.agent_type)" size="small">
                    {{ task.agent_type }}
                  </el-tag>
                </div>
                <div v-if="task.priority" class="task-priority">
                  P{{ task.priority }}
                </div>
              </div>
              <h4>{{ task.title }}</h4>
              <p>{{ task.description }}</p>
              <div v-if="task.expected_output" class="task-output">
                预期输出: {{ task.expected_output }}
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sessionData: {
    type: Object,
    required: false,
    default: null
  },
  executionParams: {
    type: Object,
    required: false,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// === 用户需求数据 ===
const userGoal = computed(() =>
  props.sessionData?.requirement?.goal ||
  props.sessionData?.user_goal ||
  props.sessionData?.analysis_result?.goal_decomposition?.user_goal ||
  props.executionParams?.user_goal ||
  '未指定'
)

const userRawInput = computed(() =>
  props.sessionData?.requirement?.raw_input || ''
)

const userVariables = computed(() => {
  const vars = props.sessionData?.requirement?.variable
  if (Array.isArray(vars)) return vars
  if (typeof vars === 'string') return [vars]
  return []
})

const userObject = computed(() =>
  props.sessionData?.requirement?.object || ''
)

// === 分析阶段（从原始输入提取） ===
const analysisPhase = computed(() => {
  const raw = userRawInput.value || ''
  if (raw.includes('事前')) return '事前分析'
  if (raw.includes('事中')) return '事中监控'
  if (raw.includes('事后')) return '事后评估'
  return ''
})

const phaseTagType = computed(() => {
  const phase = analysisPhase.value
  if (phase.includes('事前')) return 'primary'
  if (phase.includes('事中')) return 'warning'
  if (phase.includes('事后')) return 'success'
  return 'info'
})

// === 实验配置 ===
const goalUnderstanding = computed(() =>
  props.sessionData?.analysis_result?.goal_decomposition?.goal_understanding ||
  props.sessionData?.analysis_result?.goal?.explain ||
  ''
)

const goalType = computed(() =>
  props.sessionData?.analysis_result?.goal_decomposition?.goal_type || ''
)

const experimentMethod = computed(() =>
  props.sessionData?.analysis_result?.exp_params?.exp_method || ''
)

const sessionIterations = computed(() => {
  const params = props.sessionData?.analysis_result?.exp_params?.params
  if (Array.isArray(params)) {
    const iter = params.find(p => p.name === '迭代次数')
    return iter?.default || ''
  }
  return ''
})

const sessionModel = computed(() => {
  // 尝试从 decomposed_goal 中提取模型信息
  return props.sessionData?.decomposed_goal?.model_name || 'qwen'
})

const simDuration = computed(() => {
  const params = props.sessionData?.analysis_result?.exp_params?.params
  if (Array.isArray(params)) {
    const dur = params.find(p => p.name === '仿真周期')
    return dur?.default || '21'
  }
  return '21'
})

const useDecompose = computed(() =>
  props.executionParams?.use_decompose !== false
)

const hasAnyDisplayData = computed(() => {
  if (props.sessionData) return true
  const p = props.executionParams
  return p != null && typeof p === 'object' && Object.keys(p).length > 0
})

const queueSubtaskCount = computed(() => {
  const list = props.executionParams?.goal_decomposition_subtasks
  return Array.isArray(list) ? list.length : 0
})

const executedCliLines = computed(() => {
  const cli = props.executionParams?.executed_cli_summary
  if (!cli) return ''
  if (Array.isArray(cli)) return cli.join(' ')
  return String(cli)
})

const queueParamsJson = computed(() => {
  const p = props.executionParams
  if (!p || typeof p !== 'object') return ''
  try {
    return JSON.stringify(p, null, 2)
  } catch {
    return ''
  }
})

const subtasks = computed(() => {
  const fromSession = props.sessionData?.analysis_result?.goal_decomposition?.subtasks
  if (Array.isArray(fromSession) && fromSession.length) return fromSession
  const fromQueue = props.executionParams?.goal_decomposition_subtasks
  return Array.isArray(fromQueue) ? fromQueue : []
})

// === 格式化 ===
const formatGoalType = (type) => {
  const typeMap = {
    'performance_optimization': '性能优化',
    'risk_analysis': '风险分析',
    'scenario_comparison': '场景对比',
    'supply_chain_optimization': '供应链优化',
    'stability_analysis': '稳定性分析',
    'cost_control': '成本控制',
    'market_adaptation': '市场适应',
    'collaboration_strategy': '协作策略',
    'policy_evaluation': '政策评估',
    'general_inquiry': '综合分析'
  }
  return typeMap[type] || type
}

const formatModel = (model) => {
  const map = {
    qwen: 'Qwen', gpt: 'GPT', gpt4: 'GPT-4', claude: 'Claude', deepseek: 'DeepSeek',
    kimi: 'Kimi', glm: 'GLM', gemini: 'Gemini'
  }
  return map[model] || model || '-'
}

const formatScenario = (scenario) => {
  if (!scenario) return 'api（默认）'
  const s = { automotive: 'automotive（汽车供应链）', api: 'api（Web 服务生态）' }
  return s[scenario] || String(scenario)
}

const formatTimestamp = (ts) => {
  if (!ts) return '-'
  try {
    const date = new Date(ts)
    return date.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return ts
  }
}

const getAgentTypeColor = (type) => {
  const colorMap = {
    'ENVIRONMENT': 'primary',
    'OBSERVER': 'success',
    'PLANNER': 'warning',
    'SOCIAL': 'danger',
    'environment Agent': 'primary',
    'observer Agent': 'success',
    'planner Agent': 'warning',
    'social Agent': 'danger'
  }
  return colorMap[type] || 'info'
}
</script>

<style scoped>
.experiment-design-display {
  padding: 16px;
}

.design-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-card :deep(.el-card__header) {
  padding: 12px 16px;
  font-weight: 600;
  font-size: 14px;
}

.section-card :deep(.el-card__body) {
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goal-content h3 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
  font-size: 15px;
  line-height: 1.6;
}

.raw-input {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
  line-height: 1.5;
}

.goal-understanding {
  color: var(--el-text-color-regular);
  line-height: 1.8;
  font-size: 13px;
  margin: 0;
}

.label {
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

/* 研究设计网格 */
.design-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.design-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.design-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.design-value {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.variable-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mono-text {
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.cli-block {
  margin: 0;
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  font-family: 'Menlo', 'Monaco', monospace;
}

.json-textarea :deep(textarea) {
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 12px;
}

/* 子任务 */
.task-item {
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-index {
  font-size: 12px;
  font-weight: 700;
  color: var(--el-text-color-secondary);
}

.task-priority {
  font-size: 11px;
  font-weight: 700;
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  padding: 2px 6px;
  border-radius: 4px;
}

.task-item h4 {
  margin: 4px 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.task-item p {
  margin: 4px 0;
  color: var(--el-text-color-regular);
  line-height: 1.6;
  font-size: 13px;
}

.task-output {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
</style>
