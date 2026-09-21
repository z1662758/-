<template>
  <div class="scenario-modeling-root">
    <!-- 全局隐藏文件上传输入框（始终可用） -->
    <input
      type="file"
      ref="fileInput"
      style="display: none"
      accept=".pdf"
      @change="handleFileChange"
    />
    <!-- 主界面 - 智能对话 -->
    <div class="scenario-modeling-container">
      <div class="main-content">
        <!-- 左侧对话面板 -->
        <div class="conversation-panel glass-effect">
          <div class="panel-header">
            <div class="header-title">
              <span class="header-icon-small">💬</span>
              <span>智能对话</span>
            </div>
            <div class="conversation-stats">
              <span class="stat-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {{ historyConversations.length }}
              </span>
            </div>
          </div>

          <!-- 对话历史区域 -->
          <div class="conversation-messages" ref="messagesContainer">
            <!-- 对话消息 -->
            <div
              v-for="(msg, index) in historyConversations"
              :key="index"
              class="message-wrapper"
              :class="msg.type"
            >
              <div class="message-bubble">
                <div class="message-avatar">
                  <span v-if="msg.type === 'user'">👤</span>
                  <span v-else>🤖</span>
                </div>
                <div class="message-content-wrapper">
                  <div class="message-header">
                    <span class="message-sender">{{ msg.type === 'user' ? '您' : 'AI助手' }}</span>
                    <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                  </div>
                  <div v-if="!msg.analysisData" class="message-text" style="white-space: pre-wrap;">{{ msg.content }}</div>

                  <!-- 如果是判断结果，显示要素表格 -->
                  <div v-if="msg.data && msg.type === 'system' && msg.data.flag === 0 && msg.data.goal" class="requirement-mini-table">
                    <div class="mini-table-row">
                      <span class="mini-label">目标</span>
                      <span class="mini-value" :class="{ 'missing': !msg.data.goal }">
                        {{ msg.data.goal || '缺失' }}
                      </span>
                    </div>
                    <div class="mini-table-row">
                      <span class="mini-label">变量</span>
                      <span class="mini-value" :class="{ 'missing': !msg.data.variable }">
                        <template v-if="Array.isArray(msg.data.variable)">
                          <span v-for="(v, i) in msg.data.variable" :key="i" class="var-tag influence">{{ v }}</span>
                        </template>
                        <template v-else>{{ msg.data.variable || '缺失' }}</template>
                      </span>
                    </div>
                    <div class="mini-table-row">
                      <span class="mini-label">对象</span>
                      <span class="mini-value" :class="{ 'missing': !msg.data.object }">
                        {{ msg.data.object || '缺失' }}
                      </span>
                    </div>
                  </div>

                  <!-- 分析结果结构化展示 -->
                  <div v-if="msg.analysisData" class="analysis-result-card">
                    <div class="analysis-card-header">
                      <div>
                        <strong>实验方案已生成</strong>
                        <span>已完成需求拆解与变量识别</span>
                      </div>
                      <span class="analysis-total">{{ msg.analysisData.subtasks?.length || 0 }} 项任务</span>
                    </div>
                    <div class="analysis-section understanding-section" v-if="msg.analysisData.understanding || experimentDesign.goalExplain">
                      <div class="section-title">
                        <span>目标理解</span>
                      </div>
                      <p>{{ msg.analysisData.understanding || experimentDesign.goalExplain }}</p>
                    </div>
                    <div class="analysis-section tasks-section">
                      <div class="section-title">
                        <span>任务拆解</span>
                      </div>
                      <div class="task-step-list">
                        <div v-for="(task, i) in msg.analysisData.subtasks" :key="i" class="task-step-row">
                          <span class="chip-number">{{ i + 1 }}</span>
                          <div class="task-chip-main">
                            <span class="chip-text">{{ task.title || task.description || '' }}</span>
                            <span v-if="getSubtaskDescription(task)" class="chip-desc">{{ getSubtaskDescription(task) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="analysis-section variables-section entity-flow-section" v-if="getSelectedEntities(msg).length">
                      <div class="section-title">
                        <span>实体选择</span>
                      </div>
                      <div class="entity-choice-list">
                        <span v-for="(entity, i) in getVisibleSelectedEntities(msg)" :key="i">{{ entity }}</span>
                        <span v-if="getSelectedEntities(msg).length > 6">另有 {{ getSelectedEntities(msg).length - 6 }} 个</span>
                      </div>
                    </div>

                    <div class="analysis-section variables-section">
                      <div class="section-title">
                        <span>变量识别</span>
                      </div>
                      <div class="variable-groups">
                        <div class="var-group influence-group" v-if="msg.analysisData.influenceFactors?.length">
                          <div class="var-group-head">
                            <span>影响因素</span>
                            <b>{{ msg.analysisData.influenceFactors.length }}</b>
                          </div>
                          <div class="var-name-list">
                            <span v-for="(f, i) in msg.analysisData.influenceFactors" :key="i">{{ f }}</span>
                          </div>
                        </div>
                        <div class="var-group response-group" v-if="msg.analysisData.responseVars?.length">
                          <div class="var-group-head">
                            <span>响应变量</span>
                            <b>{{ msg.analysisData.responseVars.length }}</b>
                          </div>
                          <div class="var-name-list">
                            <span v-for="(v, i) in msg.analysisData.responseVars" :key="i">{{ v }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  <!-- 完成结果结构化展示 -->
                  <div v-if="msg.completionData" class="completion-result-card">
                    <div class="completion-summary">
                      <span class="completion-count">{{ msg.completionData.totalTasks }}</span>
                      <span class="completion-label">项实验子任务已生成</span>
                    </div>
                    <div class="completion-tasks" v-if="msg.completionData.subtasks?.length">
                      <div v-for="(task, i) in msg.completionData.subtasks" :key="i" class="completion-task-item">
                        <span class="completion-check">•</span>
                        <span class="completion-task-text">{{ task.title || task.description || '' }}</span>
                      </div>
                    </div>
                    <div class="completion-hint">可继续在下方输入框迭代调整，或前往「实体图」查看方案。</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- AI思考中提示 -->
            <div v-if="isProcessing" class="message-wrapper system thinking">
              <div class="message-bubble">
                <div class="message-avatar">
                  <span>🤖</span>
                </div>
                <div class="message-content-wrapper">
                  <div class="thinking-animation">
                    <div class="thinking-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span class="thinking-text">AI正在思考...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="conversation-input-area">
            <div class="input-container">
              <button
                class="upload-icon-button"
                @click="triggerFileUpload"
                :disabled="isProcessing"
                title="上传PDF文档"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="12" y2="12"></line>
                  <line x1="15" y1="15" x2="12" y2="12"></line>
                </svg>
              </button>
              <input
                v-model="feedbackInput"
                class="conversation-input"
                :placeholder="conversationInputPlaceholder"
                @keyup.enter="submitFeedback"
                :disabled="isProcessing"
              />
              <button
                class="send-button"
                @click="submitFeedback"
                :disabled="isProcessing || !feedbackInput.trim()"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 右侧任务面板 -->
        <div class="task-panel glass-effect">
          <div class="execution-state">
            <div class="panel-header">
              <div class="header-title">
                <span>实验方案汇总</span>
              </div>
              <div class="status-badge completed" v-if="tasks.length > 0">已生成</div>
            </div>
            <div class="task-panel-body">
              <!-- 实验设计概览 -->
              <div
                v-if="tasks.length > 0"
                class="experiment-design-summary"
              >
                <section class="plan-overview">
                  <div class="plan-overview-main">
                    <span>实验方案</span>
                    <strong>{{ experimentDesign.userGoal || '围绕当前供应链目标生成可执行实验组合' }}</strong>
                    <p>{{ experimentDesign.goalExplain || '当前展示已生成的候选参数组合，用于说明方案意图和参数边界。' }}</p>
                  </div>
                  <div class="plan-overview-metrics">
                    <article>
                      <b>{{ experimentDesign.paramRows.length || tasks.length }}</b>
                      <span>候选实验</span>
                    </article>
                    <article>
                      <b>{{ experimentDesign.factors.length || 0 }}</b>
                      <span>影响因素</span>
                    </article>
                    <article>
                      <b>{{ experimentDesign.responses.length || 0 }}</b>
                      <span>响应变量</span>
                    </article>
                  </div>
                </section>

                <section class="plan-workspace">
                  <div class="plan-panel generated-plan-panel" v-if="generatedPlanRows.length">
                    <div class="plan-panel-head">
                      <div>
                        <span>生成方案</span>
                        <strong>根据参数组合生成 {{ generatedPlanRows.length }} 个候选方案</strong>
                      </div>
                    </div>
                    <div class="generated-plan-list">
                      <article v-for="row in generatedPlanRows" :key="row.name" class="generated-plan-card">
                        <div class="generated-plan-meta" :class="'plan-meta-' + row.kind">
                          <span>{{ row.name }}</span>
                          <b>{{ row.status }}</b>
                        </div>
                        <div class="generated-plan-title">
                          <div>
                            <strong>{{ row.title }}</strong>
                          </div>
                        </div>
                        <p class="generated-plan-desc">{{ row.focus }}</p>
                        <div class="generated-param-grid">
                          <div v-for="param in row.params" :key="param.label">
                            <span>{{ param.label }}</span>
                            <b>{{ param.value }}</b>
                          </div>
                        </div>
                      </article>
                    </div>
                  </div>
                </section>

                <section class="plan-support-grid">
                  <button type="button" class="entity-mini-panel" @click="openEntityGraph" title="展开查看实体图">
                    <div class="entity-mini-head">
                      <span>实体图缩略图</span>
                      <strong>{{ getSelectedEntities().length }} 个核心实体</strong>
                    </div>
                    <div class="entity-mini-body">
                      <div class="entity-thumb-canvas">
                        <span
                          v-for="(entity, i) in getGraphPreviewEntities()"
                          :key="entity + i"
                          class="entity-thumb-node"
                          :class="'node-' + i"
                        >{{ getEntityInitial(entity) }}</span>
                        <span class="entity-thumb-line line-a"></span>
                        <span class="entity-thumb-line line-b"></span>
                        <span class="entity-thumb-line line-c"></span>
                      </div>
                      <div>
                        <span>已选实体</span>
                        <p>{{ getGraphPreviewEntities().slice(0, 4).join('、') }}</p>
                      </div>
                    </div>
                    <ul class="entity-mini-list">
                      <li v-for="entity in getGraphPreviewEntities().slice(0, 4)" :key="entity">{{ entity }}</li>
                    </ul>
                  </button>

                  <div class="plan-panel plan-variable-panel">
                    <div class="plan-panel-head compact">
                      <div>
                        <span>变量链路</span>
                        <strong>实体 - 因素 - 指标</strong>
                      </div>
                    </div>
                    <div class="variable-lanes">
                      <article v-if="experimentDesign.entities.length">
                        <span>实体</span>
                        <b>{{ experimentDesign.entities.length }}</b>
                        <p>{{ experimentDesign.entities.slice(0, 3).join('、') }}</p>
                      </article>
                      <article>
                        <span>影响因素</span>
                        <b>{{ experimentDesign.factors.length }}</b>
                        <p>{{ experimentDesign.factors.slice(0, 3).join('、') || '暂未识别' }}</p>
                      </article>
                      <article>
                        <span>响应变量</span>
                        <b>{{ experimentDesign.responses.length }}</b>
                        <p>{{ experimentDesign.responses.slice(0, 3).join('、') || '暂未识别' }}</p>
                      </article>
                    </div>
                  </div>
                </section>

                <div class="eds-section eds-formula" v-if="experimentDesign.formulas.length">
                  <div class="eds-section-title">关键公式</div>
                  <div class="eds-formula-list">
                    <div v-for="f in experimentDesign.formulas" :key="f.key" class="eds-formula-item">
                      <span class="eds-formula-key">{{ f.key }}</span>
                      <span class="eds-formula-eq">=</span>
                      <span class="eds-formula-value">{{ f.value }}</span>
                    </div>
                  </div>
                </div>

                <div class="eds-next">
                  <el-button type="primary" round :disabled="isProcessing" @click="goToNextPage">
                    下一步：查看实体图
                  </el-button>
                </div>
              </div>

              <!-- 空状态：尚未生成方案 -->
              <div v-else class="empty-result-state">
                <div class="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <h3>尚未生成实验方案</h3>
                <p>完成左侧对话后，这里展示实验方案汇总</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ScenarioModelingLogic from './Js/ScenarioModelingLogic_uranium.js'
import { useScnetSupplyChainStore as useSupplyChainStore } from '@/stores/scnet'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { storeToRefs } from 'pinia'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { readScnetPhase } from '@/constants/scnetPhase'
import { SCNET_PHASE_SHORT_LABELS } from '@/constants/scnetStageMeta'
import { getSnapshotById } from '@/views/SCnet/mock/snapshotIndex'
import { AGENT_GRAPH_SNAPSHOTS, URANIUM_REFERENCE_GRAPH } from '@/views/SCnet/mock/agentGraphMock'
import { ElMessage } from 'element-plus'

export default {
  ...ScenarioModelingLogic,
  components: {
    ...(ScenarioModelingLogic.components || {})
  },
  setup() {
    const store = useSupplyChainStore()
    const snapshotStore = useAnalysisSnapshotStore()
    const { chatHistory, goalDecompositionLog, loading, scenarioContext } = storeToRefs(store)

    return {
      store,
      snapshotStore,
      chatHistory,
      goalDecompositionLog,
      storeLoading: loading,
      scenarioContext
    }
  },
  computed: {
    ...(ScenarioModelingLogic.computed || {}),
    conversationInputPlaceholder() {
      if (this.tasks?.length > 0 && this.currentTaskIndex >= this.tasks.length) {
        return '输入调整诉求继续迭代, 例如: 把库存上限改成 [200, 800]…'
      }
      return '输入您的问题或反馈...'
    },
    entityCount() {
      const fallbackCount = URANIUM_REFERENCE_GRAPH.agents?.length || 0
      return this.experimentDesign.entities.length || fallbackCount
    },
    generatedPlanRows() {
      const rows = this.experimentDesign.paramRows.length
        ? this.experimentDesign.paramRows
        : this.tasks.map((task, index) => ({ index: `方案 ${index + 1}`, task: task.title || task.description || '' }))
      return rows.slice(0, 4).map((row, index) => {
        const name = row.index || `方案 ${index + 1}`
        const title = [
          '保供增强方案',
          '成本对照方案',
          '库存缓冲方案',
          '边界压力方案'
        ][index] || '补充验证方案'
        const statusMeta = [
          { status: '主方案', kind: 'main' },
          { status: '对照', kind: 'compare' },
          { status: '补充', kind: 'support' },
          { status: '边界', kind: 'edge' }
        ][index] || { status: '补充', kind: 'support' }
        const params = this.experimentDesign.factorKeys.map((key, idx) => ({
          label: this.getParameterDisplayName(key, idx),
          value: row[key] ?? '-'
        }))
        const focus = [
          '验证提高订货量后，服务水平是否明显改善。',
          '验证较低投入下，成本变化是否可接受。',
          '验证库存提高后，对提前期扰动的缓冲效果。',
          '验证高压力参数下，系统是否仍满足基本约束。'
        ][index] || '补充观察该参数组合对核心指标的影响。'
        return {
          name,
          title,
          description: params.length
            ? `该方案使用第 ${index + 1} 组参数，作为实验运行页的输入组合。`
            : (row.task || '该方案来自当前任务拆解结果。'),
          params,
          focus,
          ...statusMeta
        }
      })
    },
    experimentDesign() {
      const r = (this.apiResult && typeof this.apiResult === 'object') ? this.apiResult : {}
      const userGoal = this.sanitizeDisplayText(this.store?.scenarioUserGoal || r.goal_decomposition?.user_goal || '')
      const goalExplain = this.sanitizeDisplayText(r.goal_decomposition?.goal_understanding || '')
      const phaseLabel = SCNET_PHASE_SHORT_LABELS[this.selectedPhase] || '事中'

      const factors = (this.toDisplayNameList(r.influence_factor || []) || [])
        .map(x => this.sanitizeDisplayText(x))
        .filter(Boolean)
      const responses = (this.toDisplayNameList(r.response_var || []) || [])
        .map(x => this.sanitizeDisplayText(x))
        .filter(Boolean)
      const entities = this.extractSelectedEntities(r)

      const expBlock = (r.exp_params && typeof r.exp_params === 'object')
        ? (r.exp_params.exp_params && typeof r.exp_params.exp_params === 'object' ? r.exp_params.exp_params : r.exp_params)
        : {}
      const paramsObj = (expBlock.params && typeof expBlock.params === 'object') ? expBlock.params : {}
      const factorKeys = Object.keys(paramsObj).filter(k => Array.isArray(paramsObj[k]) && paramsObj[k].length > 0)
      const rowCount = factorKeys.length ? Math.max(...factorKeys.map(k => paramsObj[k].length)) : 0
      const paramRows = []
      for (let i = 0; i < rowCount; i++) {
        const row = { index: `实验 ${i + 1}` }
        factorKeys.forEach(k => {
          const val = paramsObj[k][i]
          row[k] = (val === null || val === undefined) ? '-' : (Array.isArray(val) ? `[${val.join(', ')}]` : String(val))
        })
        paramRows.push(row)
      }

      const formulaSrc = (r.formula && typeof r.formula === 'object') ? r.formula : {}
      const formulas = Object.entries(formulaSrc).map(([key, value]) => ({
        key: this.sanitizeDisplayText(key),
        value: this.sanitizeDisplayText(typeof value === 'string' ? value : JSON.stringify(value))
      })).filter(f => f.key && f.value)

      return {
        goalCategory: phaseLabel,
        userGoal,
        goalExplain,
        factors,
        responses,
        entities,
        factorKeys,
        paramRows,
        formulas
      }
    }
  },
  data() {
    return {
      ...ScenarioModelingLogic.data(),
      // 分析页固定不再展示初始输入弹窗
      showInitialDialog: false,
      // 分析页默认从 store 恢复已有结果；fresh 路径会在本页发起首轮 requirement analyze
      isRequirementLegal: true,
      selectedPhase: 'during'
    }
  },
  methods: {
    ...ScenarioModelingLogic.methods,
    extractSelectedEntities(result = {}) {
      const goal = result?.goal_decomposition || {}
      const direct = [
        result?.selected_entities,
        result?.entities,
        goal?.selected_entities,
        goal?.entities
      ]
      const names = direct.flatMap((value) => {
        if (Array.isArray(value)) return this.toDisplayNameList(value)
        if (typeof value === 'string') return value.split(/[、,，;；]/).map(item => this.sanitizeDisplayText(item))
        if (value && typeof value === 'object') return this.toDisplayNameList([value])
        return []
      }).filter(Boolean)
      if (names.length) return Array.from(new Set(names))

      return []
    },
    getAgentGraphEntityNames() {
      const snapshot = this.snapshotStore?.getActiveSnapshot?.()
      const snapshotAgents = AGENT_GRAPH_SNAPSHOTS[snapshot?.agentGraphId]?.agents || []
      const snapshotNames = snapshotAgents.map((agent) => this.sanitizeDisplayText(agent?.name || '')).filter(Boolean)
      if (snapshotNames.length) return Array.from(new Set(snapshotNames))
      return (URANIUM_REFERENCE_GRAPH.agents || []).map(agent => agent.name).filter(Boolean)
    },
    getSelectedEntities() {
      const graphEntities = this.getAgentGraphEntityNames()
      if (graphEntities.length) return graphEntities
      return (URANIUM_REFERENCE_GRAPH.agents || []).map(agent => agent.name).filter(Boolean)
    },
    getVisibleSelectedEntities(msg = {}) {
      return this.getSelectedEntities(msg).slice(0, 6)
    },
    getGraphPreviewEntities(msg = {}) {
      const selectedEntities = this.getSelectedEntities(msg)
      const source = selectedEntities.length ? selectedEntities : this.experimentDesign.entities
      const fallback = (URANIUM_REFERENCE_GRAPH.agents || []).map(agent => agent.name).filter(Boolean)
      return (source?.length ? source : fallback).slice(0, 5)
    },
    getEntityInitial(entity = '') {
      const clean = this.sanitizeDisplayText(entity).replace(/\s+/g, '')
      return clean ? clean.slice(0, 2) : '实体'
    },
    openEntityGraph() {
      this.$router.push({
        path: SCNET_ROUTES.agentSimulationStudio,
        query: {
          scenario: 'uranium',
          view: 'workflow',
          expand: 'entityGraph'
        }
      })
    },
    getParameterDisplayName(key, index) {
      const raw = this.sanitizeDisplayText(key || '')
      if (!/^var[ _-]?\d+$/i.test(raw)) return raw || `参数${index + 1}`
      return this.experimentDesign.factors[index] || `影响因素${index + 1}`
    },
    /**
     * 把已有的 apiResult 一次性渲染为已完成态（用于快照/store 恢复路径）
     */
    hydrateFromApiResult(apiResult, { userGoal = '', chatMessages = null } = {}) {
      const normalized = this.normalizeApiResultForDisplay(apiResult)
      this.apiResult = normalized
      this.inputMessage = userGoal || this.inputMessage || ''

      const tasks = this.generateTaskList(normalized)
      this.tasks = tasks

      // 历史对话：若快照提供则直接灌入；否则补一组用户+系统消息回放
      if (Array.isArray(chatMessages) && chatMessages.length) {
        this.historyConversations = chatMessages.map((m) => ({ ...m }))
      } else if (userGoal) {
        const subtasks = normalized?.goal_decomposition?.subtasks || []
        const factors = this.toDisplayNameList(normalized?.influence_factor || [])
        const responses = this.toDisplayNameList(normalized?.response_var || [])
        this.historyConversations = [
          { type: 'user', content: userGoal, timestamp: new Date() },
          {
            type: 'system',
            content: `✅ 目标分析完成，已生成 ${tasks.length} 个拆解任务`,
            timestamp: new Date(),
            analysisData: {
              understanding: normalized?.goal_decomposition?.goal_understanding || '系统将分步骤完成您的需求分析',
              subtasks,
              selectedEntities: this.extractSelectedEntities(normalized),
              influenceFactors: factors,
              responseVars: responses
            }
          }
        ]
      }

      // 任务结果：用 subtasksData + apiResult 即时合成（不调用任何后端持久化）
      this.taskResults = (this.subtasksData || []).map((sub, idx) => this.buildSubtaskResult(sub, idx, normalized))
      this.currentTaskIndex = tasks.length
      this.selectedTaskIndex = null
      this.selectedResult = null
      this.currentResult = {
        agent_type: 'SUMMARY',
        title: '实验方案生成完成',
        description: '已加载实验方案汇总。点击「下一步」查看完整实体图，或在下方输入框继续迭代。',
        emoji: '🎉'
      }
      this.editingContent = this.currentResult
      this.currentState = 'execution'
    },
    bootstrapFromSnapshot(snapshot) {
      const dialogue = snapshot?.dialogue
      if (!dialogue) return false
      const requirementMeta = dialogue.requirementMeta || {
        goal: dialogue.userGoal,
        variable: '',
        object: '',
        is_legal: true,
        analysis_phase: this.selectedPhase || 'during',
        raw_input: dialogue.userGoal,
        model_name: 'qwen-turbo'
      }

      this.sessionId = `snapshot:${snapshot.id}`
      this.store?.setCurrentSessionId(this.sessionId)
      this.store?.setScenarioAnalysis({
        userGoal: dialogue.userGoal,
        apiResult: dialogue.apiResult
      })
      this.store?.setScenarioTasks({
        tasks: dialogue.tasks || [],
        taskResults: []
      })
      this.store?.setScenarioRequirementMeta(requirementMeta)
      if (dialogue.scenarioContext) {
        this.store?.setScenarioContext(dialogue.scenarioContext)
      }
      this.selectedPhase = requirementMeta.analysis_phase || this.selectedPhase
      this.agentDesignSynced = true
      this.agentDesignSyncError = ''

      this.subtasksData = (dialogue.apiResult?.goal_decomposition?.subtasks || []).map((task, idx) =>
        this.normalizeSubtaskPayload(task, idx)
      )
      this.hydrateFromApiResult(dialogue.apiResult, {
        userGoal: dialogue.userGoal,
        chatMessages: dialogue.chatMessages
      })
      return true
    },
    bootstrapFromStore() {
      const sid = this.store?.currentSessionId
      const userGoal = this.store?.scenarioUserGoal || ''
      const apiResult = this.store?.scenarioApiResult
      if (!sid || !apiResult) return false

      this.sessionId = sid
      this.inputMessage = userGoal
      this.isRequirementLegal = !!this.store?.scenarioRequirementMeta?.is_legal
      this.selectedPhase = this.store?.scenarioRequirementMeta?.analysis_phase || this.selectedPhase
      this.subtasksData = (apiResult?.goal_decomposition?.subtasks || []).map((task, idx) =>
        this.normalizeSubtaskPayload(task, idx)
      )
      this.hydrateFromApiResult(apiResult, { userGoal })
      return true
    },
    /**
     * fresh 路径：刚从输入页跳来，立即调用 requirement analyze 完成 judge + 拆解。
     */
    async runFreshAnalysis() {
      this.sessionId = this.store?.currentSessionId || ''
      this.inputMessage = this.store?.scenarioUserGoal || ''
      this.selectedPhase = this.store?.scenarioRequirementMeta?.analysis_phase || this.selectedPhase
      if (!this.sessionId || !this.inputMessage) {
        ElMessage.warning('需求会话信息缺失，请回到对话入口重新提交')
        this.$router.replace(SCNET_ROUTES.duringEntry)
        return
      }
      this.isRequirementLegal = true
      this.isProcessing = true
      this.pushMessage({
        type: 'user',
        content: this.inputMessage,
        timestamp: new Date()
      })
      try {
        await this.callReqAnalysis()
      } catch (e) {
        console.warn('[ScenarioAnalysis] runFreshAnalysis 失败:', e?.message || e)
      }
    }
  },
  async mounted() {
    const storedPhase = readScnetPhase('')
    if (storedPhase === 'pre' || storedPhase === 'during' || storedPhase === 'post') {
      this.selectedPhase = storedPhase
    }

    // 1) fresh 路径优先：刚从「对话首页 · 事中决策」提交了新问题，在本页发起首轮分析。
    //    activeSnapshotId 是持久化的，若不先处理 fresh，上一次加载的历史快照会顶掉新问题。
    if (this.$route?.query?.fresh === '1') {
      this.snapshotStore?.clearSnapshot?.()
      await this.runFreshAnalysis()
      return
    }

    // 2) 快照：launcher 选中后跳来，直接读取 mock 对话
    const snapshotId = this.snapshotStore?.activeSnapshotId
    const snapshot = snapshotId ? getSnapshotById(snapshotId) : null
    if (snapshot?.dialogue) {
      this.bootstrapFromSnapshot(snapshot)
      return
    }

    // 3) 否则尝试从 store 恢复（刷新场景）
    if (this.bootstrapFromStore()) return

    // 4) 兜底：店里也没有数据，回到事中流程入口
    ElMessage.warning('请先通过事中流程写入会话或加载历史快照')
    this.$router.replace(SCNET_ROUTES.duringEntry)
  },
  beforeUnmount() {
    if (this.autoExecutionTimer) {
      clearTimeout(this.autoExecutionTimer)
    }
  }
}
</script>

<style scoped src="./Css/ScenarioModeling.css"></style>

<style scoped>

/* —— 实验设计概览面板 —— */
.task-panel {
  min-height: 0;
}
.conversation-panel { width: 38%; min-width: 340px; }
.task-panel { width: 62%; }
.conversation-panel :deep(.panel-header),
.task-panel :deep(.panel-header) { padding: 14px 18px; }
.conversation-panel :deep(.conversation-messages) { padding: 16px; gap: 14px; }
.conversation-panel :deep(.conversation-messages) {
  background: linear-gradient(180deg, rgba(248, 250, 252, .72), rgba(239, 246, 255, .42));
}
.conversation-panel :deep(.message-wrapper.system .message-bubble) { width: 100%; max-width: 100%; }
.conversation-panel :deep(.message-avatar) { width: 34px; height: 34px; font-size: 16px; }
.conversation-panel :deep(.conversation-input-area) { padding: 12px 16px; }
.conversation-panel :deep(.input-container) { margin-bottom: 0; }
.conversation-panel :deep(.conversation-input) { padding: 11px 14px; font-size: 14px; }
.conversation-panel :deep(.send-button),
.conversation-panel :deep(.upload-icon-button) { width: 42px; height: 42px; }
.conversation-panel :deep(.analysis-result-card) { margin-top: 6px; border-radius: 10px; overflow: hidden; }
.conversation-panel :deep(.analysis-card-header) { padding: 10px 12px; }
.conversation-panel :deep(.analysis-section) { padding: 10px 12px; }
.conversation-panel :deep(.understanding-section p) { margin: 0; color: #475569; font-size: 12px; line-height: 1.55; }
.conversation-panel :deep(.task-chips) { gap: 6px; }
.conversation-panel :deep(.task-chip) { padding: 8px 9px; gap: 7px; min-height: auto; }
.conversation-panel :deep(.task-step-list) {
  display: grid;
  grid-template-columns: 1fr;
  gap: 7px;
}
.conversation-panel :deep(.task-step-row) {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  min-height: 46px;
  padding: 9px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.conversation-panel :deep(.chip-number) { width: 18px; height: 18px; }
.conversation-panel :deep(.task-step-row .chip-number) {
  width: 22px;
  height: 22px;
  margin-top: 1px;
  background: #2563eb;
  color: #ffffff;
  font-size: 11px;
}
.conversation-panel :deep(.task-chip-main) { gap: 3px; }
.conversation-panel :deep(.task-step-row .chip-text) {
  color: #0f172a;
  font-size: 12px;
  line-height: 1.35;
}
.conversation-panel :deep(.task-step-row .chip-desc) {
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
}
.conversation-panel :deep(.variables-section) { padding-top: 8px; }
.conversation-panel :deep(.entity-choice-list) {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}
.conversation-panel :deep(.entity-choice-list span) {
  display: block;
  padding: 7px 9px;
  border-radius: 7px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  font-size: 12px;
  line-height: 1.35;
}
.conversation-panel :deep(.variable-groups) {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.conversation-panel :deep(.variable-groups .var-group) {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 9px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}
.conversation-panel :deep(.var-group-head) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.conversation-panel :deep(.var-group-head span) {
  color: #334155;
  font-size: 12px;
  font-weight: 800;
}
.conversation-panel :deep(.var-group-head b) {
  min-width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
}
.conversation-panel :deep(.var-name-list) {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.conversation-panel :deep(.var-name-list span) {
  padding: 4px 7px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 11px;
  line-height: 1.25;
}
.conversation-panel :deep(.var-tags) { gap: 4px; }
.conversation-panel :deep(.var-tag) { padding: 2px 8px; font-size: 11px; }
.experiment-design-summary {
  margin: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #1f2937;
}
.plan-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 14px;
  padding: 16px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #ffffff;
}
.plan-overview-main {
  min-width: 0;
}
.plan-overview-main > span,
.plan-panel-head span,
.entity-mini-panel span,
.variable-lanes span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}
.plan-overview-main strong {
  display: block;
  margin-top: 5px;
  color: #0f172a;
  font-size: 18px;
  line-height: 1.45;
}
.plan-overview-main p {
  max-width: 760px;
  margin: 7px 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.65;
}
.plan-overview-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.plan-overview-metrics article {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 76px;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  text-align: center;
}
.plan-overview-metrics b {
  color: #1d4ed8;
  font-size: 24px;
  line-height: 1;
}
.plan-overview-metrics span {
  margin-top: 8px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}
.plan-workspace {
  display: block;
}
.plan-main-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.plan-panel,
.entity-mini-panel,
.experiment-design-summary .eds-section {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: none;
}
.plan-panel {
  padding: 14px;
}
.plan-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.plan-panel-head.compact {
  margin-bottom: 10px;
}
.plan-panel-head strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 15px;
  line-height: 1.35;
}
.plan-panel-head em {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}
.selection-rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
}
.selection-rail article {
  position: relative;
  min-width: 0;
  padding: 12px;
  background: #ffffff;
}
.selection-rail article + article {
  border-left: 1px solid #e2e8f0;
}
.selection-rail article > span {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 900;
}
.selection-rail strong {
  display: block;
  margin-top: 10px;
  color: #0f172a;
  font-size: 13px;
}
.selection-rail b {
  display: block;
  margin-top: 4px;
  color: #1d4ed8;
  font-size: 16px;
}
.selection-rail p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
}
.selection-rail article:nth-child(3) {
  background: #f8fafc;
}
.selection-rail article:nth-child(3) > span {
  background: #e0e7ff;
  color: #4338ca;
}
.selection-rail article:nth-child(4) {
  background: #f8fafc;
}
.utility-strip {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #c7d2fe;
  background: #eef2ff;
}
.utility-copy {
  min-width: 0;
}
.utility-copy span {
  display: block;
  color: #4338ca;
  font-size: 11px;
  font-weight: 900;
}
.utility-copy strong {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.35;
}
.utility-copy p {
  margin: 5px 0 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
}
.utility-pill {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: #4338ca;
  color: #ffffff;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}
.generated-plan-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.generated-plan-card {
  min-width: 0;
  display: grid;
  grid-template-columns: 86px minmax(140px, .75fr) minmax(220px, 1fr) minmax(280px, 1.15fr);
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}
.generated-plan-card:first-child {
  border-color: #bfdbfe;
  background: linear-gradient(90deg, #eff6ff 0%, #ffffff 68%);
}
.generated-plan-meta {
  min-height: 58px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  background: #f8fafc;
  border-left: 3px solid #94a3b8;
}
.generated-plan-meta span {
  color: #0f172a;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
}
.generated-plan-meta b {
  color: #64748b;
  font-size: 11px;
  line-height: 1.2;
}
.generated-plan-meta.plan-meta-main {
  border-left-color: #2563eb;
  background: #eff6ff;
}
.generated-plan-meta.plan-meta-compare {
  border-left-color: #f59e0b;
  background: #fffbeb;
}
.generated-plan-meta.plan-meta-support {
  border-left-color: #6366f1;
  background: #eef2ff;
}
.generated-plan-meta.plan-meta-edge {
  border-left-color: #94a3b8;
}
.generated-plan-title {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 10px;
}
.generated-plan-title strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.35;
}
.generated-plan-desc {
  min-width: 0;
  margin: 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
}
.generated-param-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}
.generated-param-grid div {
  min-width: 0;
  padding: 7px 8px;
  border-radius: 7px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.generated-param-grid span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.generated-param-grid b {
  display: block;
  margin-top: 3px;
  color: #0f172a;
  font-size: 12px;
  line-height: 1.25;
}
.ranked-plan-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ranked-plan-list article {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}
.ranked-plan-list article.active {
  border-color: #bfdbfe;
  background: linear-gradient(90deg, #eff6ff 0%, #ffffff 62%);
}
.ranked-plan-list article.backup {
  border-color: #fde68a;
  background: linear-gradient(90deg, #fffbeb 0%, #ffffff 62%);
}
.ranked-plan-index {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #f1f5f9;
}
.ranked-plan-index b {
  color: #0f172a;
  font-size: 21px;
  line-height: 1;
}
.ranked-plan-index span {
  margin-top: 5px;
  color: #2563eb;
  font-size: 11px;
  font-weight: 900;
}
.ranked-plan-body {
  min-width: 0;
}
.ranked-plan-title,
.ranked-plan-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ranked-plan-title strong {
  min-width: 0;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.3;
}
.ranked-plan-body p {
  margin: 5px 0 7px;
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
}
.ranked-plan-foot span {
  min-width: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
}
.ranked-plan-foot b {
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 6px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  white-space: nowrap;
}
.plan-support-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.entity-mini-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 2px solid #93c5fd;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  box-shadow: 0 4px 12px rgba(37, 99, 235, .1);
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}
.entity-mini-panel:hover {
  border-color: #2563eb;
  box-shadow: 0 8px 20px rgba(37, 99, 235, .18);
  transform: translateY(-1px);
}
.entity-mini-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}
.entity-mini-head span,
.entity-mini-body span {
  display: block;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
}
.entity-mini-head > span {
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 900;
}
.entity-mini-head strong {
  color: #0f172a;
  font-size: 13px;
  line-height: 1.35;
}
.entity-mini-body {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  width: 100%;
}
.entity-mini-panel .entity-thumb-canvas {
  height: 82px;
  background: #ffffff;
  border: 2px solid #bfdbfe;
}
.entity-mini-panel .entity-thumb-node {
  border-width: 2px;
}
.entity-mini-panel .entity-thumb-line {
  height: 3px;
}
.entity-mini-panel p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
}
.entity-mini-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}
.entity-mini-list li {
  min-width: 0;
  padding: 5px 7px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-size: 11px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.variable-lanes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.variable-lanes article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.variable-lanes b {
  grid-row: span 2;
  align-self: center;
  justify-self: end;
  min-width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 12px;
}
.variable-lanes p {
  min-width: 0;
  margin: 0;
  color: #334155;
  font-size: 12px;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.plan-support-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.entity-thumbnail {
  width: 100%;
  display: grid;
  grid-template-columns: 92px 1fr;
  align-items: center;
  gap: 10px;
  padding: 9px;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  background: linear-gradient(135deg, #f8fafc, #eef2ff);
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}
.entity-thumbnail:hover {
  border-color: #2563eb;
  box-shadow: 0 6px 16px rgba(37, 99, 235, .13);
  transform: translateY(-1px);
}
.entity-thumb-canvas {
  position: relative;
  height: 62px;
  border-radius: 7px;
  background: #ffffff;
  overflow: hidden;
}
.entity-thumb-node {
  position: absolute;
  z-index: 2;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #dbeafe;
  border: 1px solid #93c5fd;
  color: #1d4ed8;
  font-size: 10px;
  font-weight: 800;
}
.entity-thumb-node.node-0 { left: 8px; top: 17px; background: #dcfce7; border-color: #86efac; color: #166534; }
.entity-thumb-node.node-1 { left: 34px; top: 6px; }
.entity-thumb-node.node-2 { right: 10px; top: 17px; background: #fee2e2; border-color: #fecaca; color: #991b1b; }
.entity-thumb-node.node-3 { left: 35px; bottom: 5px; background: #fef3c7; border-color: #fde68a; color: #92400e; }
.entity-thumb-node.node-4 { right: 31px; bottom: 5px; background: #ede9fe; border-color: #c4b5fd; color: #5b21b6; }
.entity-thumb-line {
  position: absolute;
  height: 2px;
  border-radius: 999px;
  background: #bfdbfe;
  transform-origin: left center;
}
.entity-thumb-line.line-a { left: 31px; top: 29px; width: 36px; transform: rotate(-18deg); }
.entity-thumb-line.line-b { left: 57px; top: 26px; width: 28px; transform: rotate(18deg); }
.entity-thumb-line.line-c { left: 48px; bottom: 19px; width: 34px; transform: rotate(-8deg); background: #fed7aa; }
.entity-thumb-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.entity-thumb-copy strong {
  color: #1e3a8a;
  font-size: 12px;
}
.entity-thumb-copy span {
  color: #64748b;
  font-size: 11px;
}
.eds-entity-preview {
  background: linear-gradient(135deg, #ffffff, #f8fafc) !important;
}
.entity-thumbnail-wide {
  grid-template-columns: 142px minmax(0, 1fr) auto;
  min-height: 116px;
  padding: 12px;
  border-color: #bfdbfe;
  background: linear-gradient(135deg, #eff6ff, #ffffff);
}
.entity-thumbnail-wide .entity-thumb-canvas {
  height: 88px;
  border: 1px solid #dbeafe;
}
.entity-thumbnail-wide .entity-thumb-node {
  width: 36px;
  height: 36px;
  font-size: 11px;
}
.entity-thumbnail-wide .entity-thumb-node.node-0 { left: 12px; top: 27px; }
.entity-thumbnail-wide .entity-thumb-node.node-1 { left: 55px; top: 10px; }
.entity-thumbnail-wide .entity-thumb-node.node-2 { right: 12px; top: 27px; }
.entity-thumbnail-wide .entity-thumb-node.node-3 { left: 56px; bottom: 10px; }
.entity-thumbnail-wide .entity-thumb-node.node-4 { right: 48px; bottom: 10px; }
.entity-thumbnail-wide .entity-thumb-line.line-a { left: 43px; top: 44px; width: 54px; }
.entity-thumbnail-wide .entity-thumb-line.line-b { left: 88px; top: 38px; width: 46px; }
.entity-thumbnail-wide .entity-thumb-line.line-c { left: 75px; bottom: 29px; width: 52px; }
.entity-thumbnail-wide .entity-thumb-copy strong {
  font-size: 15px;
  color: #0f172a;
}
.entity-thumbnail-wide .entity-thumb-copy span {
  max-width: 540px;
  font-size: 12px;
  line-height: 1.6;
}
.entity-thumb-action {
  flex: 0 0 auto;
  align-self: center;
  padding: 6px 11px;
  border-radius: 7px;
  background: #2563eb;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.eds-design-logic {
  background: #ffffff !important;
}
.design-logic-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.design-logic-grid div {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}
.design-logic-grid span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
}
.design-logic-grid strong {
  display: block;
  margin: 4px 0;
  color: #1e3a8a;
  font-size: 14px;
}
.design-logic-grid p {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
}
.execution-state {
  min-height: 0;
}
.task-panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: 14px;
}
.task-panel-body::-webkit-scrollbar {
  width: 8px;
}
.task-panel-body::-webkit-scrollbar-track {
  background: transparent;
}
.task-panel-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}
.task-panel-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
.experiment-design-summary {
  margin: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #1f2937;
}
.experiment-design-summary .eds-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
}
.experiment-design-summary .eds-section-title {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8px;
}
.experiment-design-summary .eds-label {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #9d3807;
  margin-right: 8px;
}
.eds-overview { display: flex; align-items: center; gap: 18px; background: linear-gradient(135deg, #eff6ff, #f8fafc) !important; }
.eds-overview-copy { flex: 1; min-width: 0; }
.eds-kicker { display: block; color: #2563eb; font-size: 10px; font-weight: 800; letter-spacing: .08em; margin-bottom: 4px; }
.eds-overview-copy strong { display: block; color: #0f172a; font-size: 14px; line-height: 1.5; }
.eds-overview-copy p { margin: 4px 0 0; color: #64748b; font-size: 12px; line-height: 1.6; }
.eds-overview-stat { flex: 0 0 82px; min-height: 66px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 1px solid #bfdbfe; }
.eds-overview-stat b { color: #1d4ed8; font-size: 24px; line-height: 1; }
.eds-overview-stat span { margin-top: 6px; color: #64748b; font-size: 11px; }
.selection-flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.selection-step { position: relative; min-width: 0; padding: 11px 10px 10px 34px; border: 1px solid #dbeafe; border-radius: 8px; background: #f8fafc; }
.selection-step:not(:last-child)::after { content: '›'; position: absolute; right: -8px; top: 25px; z-index: 1; color: #2563eb; font-size: 18px; font-weight: 800; }
.selection-index { position: absolute; left: 9px; top: 10px; width: 18px; height: 18px; display: grid; place-items: center; border-radius: 50%; background: #2563eb; color: white; font-size: 10px; font-weight: 800; }
.selection-step strong { color: #1e3a8a; font-size: 12px; }
.selection-step p { margin: 4px 0 0; color: #64748b; font-size: 11px; line-height: 1.45; }
.bayesian-feedback { display: flex; gap: 12px; align-items: flex-start; margin-top: 9px; padding: 10px; border-radius: 8px; background: #fff7ed; border: 1px solid #fed7aa; }
.bayes-badge { flex: 0 0 auto; padding: 4px 7px; border-radius: 5px; background: #f97316; color: #fff; font-size: 9px; font-weight: 800; letter-spacing: .04em; }
.bayesian-feedback strong { display: block; color: #9a3412; font-size: 12px; }
.bayesian-feedback p { margin: 3px 0 0; color: #7c2d12; font-size: 11px; line-height: 1.55; }
.utility-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 92px;
  gap: 12px;
  align-items: stretch;
  margin-top: 9px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  background: linear-gradient(135deg, #f0fdf4, #ffffff);
}
.utility-main {
  min-width: 0;
}
.utility-kicker {
  display: inline-flex;
  margin-bottom: 4px;
  color: #15803d;
  font-size: 11px;
  font-weight: 800;
}
.utility-main strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.4;
}
.utility-equation {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.utility-equation span {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}
.utility-equation .positive {
  background: #dcfce7;
  color: #166534;
}
.utility-equation .negative {
  background: #fee2e2;
  color: #991b1b;
}
.utility-equation i {
  color: #64748b;
  font-style: normal;
  font-size: 12px;
  font-weight: 800;
}
.utility-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #16a34a;
  color: #ffffff;
}
.utility-result b {
  font-size: 22px;
  line-height: 1;
}
.utility-result span {
  margin-top: 6px;
  font-size: 11px;
  font-weight: 700;
}
.screening-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 9px;
}
.screening-board article {
  min-width: 0;
  padding: 9px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}
.screening-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.screening-head em {
  color: #94a3b8;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}
.screening-head span {
  display: inline-flex;
  min-width: 42px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 6px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 15px;
  font-weight: 800;
}
.screening-board strong {
  display: block;
  margin-top: 6px;
  color: #1e3a8a;
  font-size: 12px;
}
.screening-board p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
}
.eds-priority-table {
  width: 100%;
}
.eds-priority-table :deep(.el-table__cell) {
  font-size: 12px;
}
.eds-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
}
.eds-section-heading .eds-section-title {
  margin-bottom: 3px;
}
.eds-section-heading p {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
}
.eds-section-heading > span {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 11px;
  font-weight: 800;
}
.priority-card-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.priority-card {
  display: grid;
  grid-template-columns: 66px minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}
.priority-card.priority-1 {
  border-color: #86efac;
  background: linear-gradient(135deg, #f0fdf4, #ffffff);
}
.priority-card.priority-2 {
  border-color: #fde68a;
  background: linear-gradient(135deg, #fffbeb, #ffffff);
}
.priority-rank {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #f1f5f9;
}
.priority-rank b {
  color: #0f172a;
  font-size: 22px;
  line-height: 1;
}
.priority-rank span {
  margin-top: 5px;
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
}
.priority-content {
  min-width: 0;
}
.priority-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.priority-title-row strong {
  color: #0f172a;
  font-size: 13px;
}
.priority-content p {
  margin: 5px 0 7px;
  color: #475569;
  font-size: 12px;
  line-height: 1.45;
}
.priority-meta {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}
.priority-meta span {
  min-width: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
}
.priority-meta b {
  padding: 4px 7px;
  border-radius: 6px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
  white-space: nowrap;
}

.eds-goal {
  display: flex;
  align-items: stretch;
  gap: 12px;
}
.eds-goal-tag {
  flex-shrink: 0;
  min-width: 92px;
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  border: 1px solid #93c5fd;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.eds-goal-tag-label {
  font-size: 12px;
  color: #1e40af;
  font-weight: 600;
}
.eds-goal-tag-value {
  font-size: 14px;
  font-weight: 700;
  color: #1d4ed8;
}
.eds-goal-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  line-height: 1.6;
}
.eds-goal-explain {
  color: #334155;
  word-break: break-word;
}

.eds-vars {
  display: flex;
  align-items: stretch;
  gap: 8px;
}
.eds-vars-col {
  flex: 1;
  min-width: 0;
  background: #f8fafc;
  border: 1px dashed #c7d2fe;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.eds-col-title {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  color: #4338ca;
  margin-bottom: 6px;
}
.eds-col-title b {
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e0e7ff;
  color: #4338ca;
  font-size: 11px;
}
.eds-col-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-height: 140px;
  overflow-y: auto;
}
.eds-col-list li {
  font-size: 12.5px;
  color: #1f2937;
  text-align: center;
  padding: 3px 6px;
  background: #ffffff;
  border-radius: 4px;
}
.eds-col-empty {
  font-size: 12px;
  color: #9ca3af;
}
.eds-vars-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
  font-size: 22px;
  padding: 0 4px;
}

.eds-formula-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.eds-formula-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #1f2937;
}
.eds-formula-key {
  font-weight: 700;
  color: #1e3a8a;
  flex-shrink: 0;
}
.eds-formula-eq {
  color: #94a3b8;
  flex-shrink: 0;
  padding-top: 1px;
}
.eds-formula-value {
  flex: 1;
  min-width: 0;
  display: block;
  color: #475569;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  word-break: normal;
  padding-bottom: 2px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.eds-formula-value::-webkit-scrollbar {
  height: 6px;
}
.eds-formula-value::-webkit-scrollbar-track {
  background: transparent;
}
.eds-formula-value::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.eds-next {
  display: flex;
  justify-content: center;
  padding: 4px 0 2px;
}
.eds-next .el-button {
  min-width: 168px;
  font-weight: 600;
}

@media (max-width: 1180px) {
  .generated-plan-card {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
  .entity-mini-body {
    grid-template-columns: 1fr;
  }
  .selection-flow { grid-template-columns: 1fr 1fr; }
  .screening-board { grid-template-columns: 1fr 1fr; }
  .selection-step::after { display: none; }
  .entity-thumbnail-wide { grid-template-columns: 120px minmax(0, 1fr); }
  .entity-thumb-action { grid-column: 2; justify-self: start; }
  .design-logic-grid { grid-template-columns: 1fr; }
  .eds-vars {
    display: grid;
    grid-template-columns: 1fr;
  }
  .eds-vars-arrow {
    transform: rotate(90deg);
    padding: 0;
  }
}

@media (max-width: 960px) {
  .conversation-panel,
  .task-panel { width: 100%; }
  .entity-thumbnail,
  .entity-thumbnail-wide { grid-template-columns: 1fr; }
  .entity-thumb-action { grid-column: auto; }
  .screening-board { grid-template-columns: 1fr; }
}
</style>
