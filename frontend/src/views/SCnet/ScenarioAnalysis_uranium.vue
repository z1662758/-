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
                      <div class="task-chips">
                        <div v-for="(task, i) in msg.analysisData.subtasks" :key="i" class="task-chip">
                          <span class="chip-number">{{ i + 1 }}</span>
                          <div class="task-chip-main">
                            <span class="chip-text">{{ task.title || task.description || '' }}</span>
                            <span class="chip-agent">{{ getAgentDisplayName(task.agent_type || task.assigned_agent) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="analysis-section variables-section entity-flow-section" v-if="getSelectedEntities(msg).length">
                      <div class="section-title">
                        <span>实体选择</span>
                      </div>
                      <div class="var-group">
                        <div class="var-tags">
                          <span v-for="(entity, i) in getVisibleSelectedEntities(msg)" :key="i" class="var-tag entity">{{ entity }}</span>
                          <span v-if="getSelectedEntities(msg).length > 6" class="var-tag more-tag">另有 {{ getSelectedEntities(msg).length - 6 }} 个</span>
                        </div>
                      </div>
                    </div>

                    <div class="analysis-section variables-section">
                      <div class="section-title">
                        <span>变量识别</span>
                      </div>
                      <div class="variable-groups">
                        <div class="var-group influence-group" v-if="msg.analysisData.influenceFactors?.length">
                          <span class="var-label">影响因素 <b>{{ msg.analysisData.influenceFactors.length }}</b></span>
                          <div class="var-tags">
                            <span v-for="(f, i) in msg.analysisData.influenceFactors" :key="i" class="var-tag influence">{{ f }}</span>
                          </div>
                        </div>
                        <div class="var-group response-group" v-if="msg.analysisData.responseVars?.length">
                          <span class="var-label">响应变量 <b>{{ msg.analysisData.responseVars.length }}</b></span>
                          <div class="var-tags">
                            <span v-for="(v, i) in msg.analysisData.responseVars" :key="i" class="var-tag response">{{ v }}</span>
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

            <section v-if="tasks.length > 0" class="dialogue-followup">
              <div class="brief-title">
                <span>会话推进</span>
                <b>事中决策</b>
              </div>
              <div class="followup-list">
                <div v-for="item in dialogueFollowups" :key="item.title">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.text }}</span>
                </div>
              </div>
            </section>

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
                <div class="eds-section eds-overview">
                  <div class="eds-overview-copy">
                    <span class="eds-kicker">方案说明</span>
                    <strong>{{ experimentDesign.userGoal || '围绕当前供应链目标生成可执行实验组合' }}</strong>
                    <p>{{ experimentDesign.goalExplain || '系统将实体、影响因素和响应变量组合为候选实验，并通过模型评分与反馈更新筛选出优先方案。' }}</p>
                  </div>
                  <div class="eds-overview-stat"><b>{{ experimentDesign.paramRows.length || tasks.length }}</b><span>候选实验</span></div>
                </div>

                <div class="eds-section eds-design-logic">
                  <div class="eds-section-title">方案生成框架</div>
                  <div class="design-logic-grid">
                    <div v-for="item in designLogicCards" :key="item.title">
                      <span>{{ item.title }}</span>
                      <strong>{{ item.value }}</strong>
                      <p>{{ item.text }}</p>
                    </div>
                  </div>
                </div>

                <div class="eds-section eds-entity-preview">
                  <div class="eds-section-title">实体图预览</div>
                  <button type="button" class="entity-thumbnail entity-thumbnail-wide" @click="openEntityGraph" title="展开查看实体图">
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
                    <div class="entity-thumb-copy">
                      <strong>当前实验实体网络</strong>
                      <span>{{ experimentDesign.entities.length || getGraphPreviewEntities().length }} 个核心实体，已按供应、制造、需求与调度关系组织。点击进入完整实体图页面。</span>
                    </div>
                    <span class="entity-thumb-action">展开查看</span>
                  </button>
                </div>

                <div class="eds-section eds-vars">
                  <div class="eds-vars-col" v-if="experimentDesign.entities.length">
                    <div class="eds-col-title"><span>实体</span><b>{{ experimentDesign.entities.length }}</b></div>
                    <ul class="eds-col-list">
                      <li v-for="(item, i) in experimentDesign.entities" :key="'e' + i">{{ item }}</li>
                    </ul>
                  </div>
                  <div class="eds-vars-arrow" v-if="experimentDesign.entities.length">
                    <el-icon><Right /></el-icon>
                  </div>
                  <div class="eds-vars-col">
                    <div class="eds-col-title"><span>影响因素</span><b>{{ experimentDesign.factors.length }}</b></div>
                    <ul class="eds-col-list" v-if="experimentDesign.factors.length">
                      <li v-for="(item, i) in experimentDesign.factors" :key="'f' + i">{{ item }}</li>
                    </ul>
                    <div v-else class="eds-col-empty">—</div>
                  </div>
                  <div class="eds-vars-arrow">
                    <el-icon><Right /></el-icon>
                  </div>
                  <div class="eds-vars-col">
                    <div class="eds-col-title"><span>响应变量</span><b>{{ experimentDesign.responses.length }}</b></div>
                    <ul class="eds-col-list" v-if="experimentDesign.responses.length">
                      <li v-for="(item, i) in experimentDesign.responses" :key="'r' + i">{{ item }}</li>
                    </ul>
                    <div v-else class="eds-col-empty">—</div>
                  </div>
                </div>

                <div class="eds-section eds-method" v-if="experimentDesign.expMethod">
                  <span class="eds-label">实验方法</span>
                  <span class="eds-method-value">{{ experimentDesign.expMethod }}</span>
                </div>

                <div class="eds-section eds-selection">
                  <div class="eds-section-title">算法如何筛选方案</div>
                  <div class="selection-flow">
                    <article v-for="(step, index) in selectionSteps" :key="step.title" class="selection-step">
                      <span class="selection-index">{{ index + 1 }}</span>
                      <div><strong>{{ step.title }}</strong><p>{{ step.detail }}</p></div>
                    </article>
                  </div>
                  <div class="bayesian-feedback">
                    <span class="bayes-badge">Bayesian Feedback</span>
                    <div>
                      <strong>贝叶斯反馈怎样影响下一轮</strong>
                      <p>把本轮推演观测到的成本、缺口、风险暴露和库存覆盖作为新证据，更新各候选方案的后验可信度；高收益且稳定的参数组合提高采样概率，表现不佳的组合降权，再生成下一轮候选。</p>
                    </div>
                  </div>
                  <div class="score-formula">
                    <span>综合效用</span>
                    <code>保供收益 + 韧性增益 − 成本惩罚 − 风险惩罚</code>
                    <el-tag size="small" type="success" effect="dark">选择后验效用最高方案</el-tag>
                  </div>
                </div>

                <div class="eds-section eds-priority" v-if="planPriorityRows.length">
                  <div class="eds-section-title">方案优先级排序</div>
                  <el-table
                    :data="planPriorityRows"
                    size="small"
                    border
                    stripe
                    class="eds-priority-table"
                  >
                    <el-table-column prop="rank" label="排序" width="66" align="center" />
                    <el-table-column prop="name" label="候选方案" min-width="130" />
                    <el-table-column prop="basis" label="筛选依据" min-width="210" />
                    <el-table-column prop="status" label="状态" width="104" align="center">
                      <template #default="{ row }">
                        <el-tag :type="row.type" size="small" effect="plain">{{ row.status }}</el-tag>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>

                <div class="eds-section eds-params" v-if="experimentDesign.paramRows.length">
                  <div class="eds-section-title">参数范围</div>
                  <el-table
                    :data="experimentDesign.paramRows"
                    size="small"
                    border
                    stripe
                    max-height="240"
                    class="eds-params-table"
                  >
                    <el-table-column prop="index" label="序号" width="78" align="center" />
                    <el-table-column
                      v-for="(key, idx) in experimentDesign.factorKeys"
                      :key="key"
                      :prop="key"
                      align="center"
                    >
                      <template #header>
                        <el-tooltip :content="getParameterDisplayName(key, idx)" placement="top">
                          <span>{{ getParameterDisplayName(key, idx) }}</span>
                        </el-tooltip>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>

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
                <h3>等待实验方案</h3>
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
import { URANIUM_REFERENCE_GRAPH } from '@/views/SCnet/mock/agentGraphMock'
import { ElMessage } from 'element-plus'
import { Right } from '@element-plus/icons-vue'

export default {
  ...ScenarioModelingLogic,
  components: {
    ...(ScenarioModelingLogic.components || {}),
    Right
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
    selectionSteps() {
      return [
        { title: '生成候选', detail: `按 ${this.experimentDesign.factors.length || 0} 个影响因素的参数范围组合实验点，覆盖成本、风险与保供取向。` },
        { title: '模型推演', detail: '多智能体模型逐一运行候选方案，输出成本、供需缺口、风险暴露与库存覆盖。' },
        { title: '多目标评分', detail: '先剔除违反供给与安全约束的方案，再按保供、韧性、成本和风险加权排序。' },
        { title: '反馈收敛', detail: '将推演结果写回贝叶斯后验，重点探索高潜力参数区域，直到收益趋稳。' }
      ]
    },
    designLogicCards() {
      return [
        {
          title: '输入',
          value: `${this.entityCount} 类实体`,
          text: '结合供应、制造、需求和调度对象形成实验边界。'
        },
        {
          title: '变量',
          value: `${this.experimentDesign.factors.length || 0} 个因素`,
          text: '把可调因素映射为候选实验参数范围。'
        },
        {
          title: '输出',
          value: `${this.experimentDesign.responses.length || 0} 个指标`,
          text: '用响应变量评价方案成本、缺口、风险和韧性。'
        }
      ]
    },
    entityCount() {
      const fallbackCount = URANIUM_REFERENCE_GRAPH.agents?.length || 0
      return this.experimentDesign.entities.length || fallbackCount
    },
    dialogueFollowups() {
      return [
        { title: '实体图前置', text: '右侧展示缩略图，完整图在独立页面查看与编辑。' },
        { title: '方案说明补齐', text: '方案目的、实施意图和变量关系已在右侧展开。' },
        { title: '决策闭环', text: '完成推演后进入决策生成，输出建议、依据和执行顺序。' }
      ]
    },
    planPriorityRows() {
      const rows = this.experimentDesign.paramRows.length
        ? this.experimentDesign.paramRows
        : this.tasks.map((task, index) => ({ index: `方案 ${index + 1}`, task: task.title || task.description || '' }))
      return rows.slice(0, 5).map((row, index) => {
        const name = row.index || `方案 ${index + 1}`
        const factor = this.experimentDesign.factors[index % Math.max(this.experimentDesign.factors.length, 1)] || '关键变量'
        const response = this.experimentDesign.responses[index % Math.max(this.experimentDesign.responses.length, 1)] || '目标指标'
        const statusMeta = index === 0
          ? { status: '优选执行', type: 'success' }
          : index === 1
            ? { status: '备选保留', type: 'warning' }
            : index < 4
              ? { status: '继续观测', type: 'primary' }
              : { status: '降权剔除', type: 'info' }
        return {
          rank: index + 1,
          name,
          basis: `${factor} 对 ${response} 的改善幅度更高，同时未触发供给和风险约束。`,
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
      const expMethod = this.sanitizeDisplayText(expBlock.exp_method || '')
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
        expMethod,
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
        goal?.entities,
        goal?.object,
        result?.object
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
    getSelectedEntities(msg = {}) {
      const explicit = Array.isArray(msg?.analysisData?.selectedEntities)
        ? msg.analysisData.selectedEntities.filter(Boolean)
        : []
      if (explicit.length) return explicit

      const currentSessionId = this.store?.currentSessionId || this.sessionId || ''
      const candidates = [
        {
          payload: this.store?.setAgentsResult,
          sessionId: this.store?.setAgentsResultSessionId
        },
        {
          payload: this.store?.agentDesignPayload,
          sessionId: this.store?.agentDesignPayloadSessionId
        }
      ]
      for (const candidate of candidates) {
        if (!candidate.payload || (currentSessionId && candidate.sessionId && candidate.sessionId !== currentSessionId)) continue
        const agents = Array.isArray(candidate.payload?.agents) ? candidate.payload.agents : []
        const names = agents.map((agent) => this.sanitizeDisplayText(
          agent?.name || agent?.displayName || agent?.label || agent?.entity_name || ''
        )).filter(Boolean)
        if (names.length) return Array.from(new Set(names))
      }
      const requirementObject = this.store?.scenarioRequirementMeta?.object
      if (Array.isArray(requirementObject)) return this.toDisplayNameList(requirementObject)
      if (typeof requirementObject === 'string' && requirementObject.trim()) {
        return requirementObject.split(/[、,，;；]/).map(item => this.sanitizeDisplayText(item)).filter(Boolean)
      }
      return []
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
.conversation-panel :deep(.tasks-section) { max-height: 236px; overflow-y: auto; }
.conversation-panel :deep(.task-chips) { gap: 6px; }
.conversation-panel :deep(.task-chip) { padding: 7px 8px; gap: 7px; }
.conversation-panel :deep(.chip-number) { width: 18px; height: 18px; }
.conversation-panel :deep(.task-chip-main) { gap: 3px; }
.conversation-panel :deep(.variables-section) { padding-top: 8px; }
.conversation-panel :deep(.variable-groups) { gap: 7px; grid-template-columns: 1fr; }
.conversation-panel :deep(.variable-groups .var-group) { padding: 8px; }
.conversation-panel :deep(.var-tags) { gap: 4px; }
.conversation-panel :deep(.var-tag) { padding: 2px 8px; font-size: 11px; }
.dialogue-followup {
  padding: 12px;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  background: linear-gradient(135deg, #ffffff, #eff6ff);
  box-shadow: 0 4px 12px rgba(37, 99, 235, .08);
}
.brief-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
}
.brief-title span {
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
}
.brief-title b {
  padding: 2px 7px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
}
.followup-list {
  display: grid;
  gap: 7px;
}
.followup-list div {
  padding: 8px 9px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: rgba(255,255,255,.88);
}
.followup-list strong {
  display: block;
  color: #1e3a8a;
  font-size: 12px;
}
.followup-list span {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
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
  margin: 12px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  color: #1f2937;
}
.experiment-design-summary .eds-section {
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 10px 12px;
}
.experiment-design-summary .eds-section-title {
  font-size: 13px;
  font-weight: 700;
  color: #1e3a8a;
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
.score-formula { display: flex; align-items: center; gap: 9px; margin-top: 8px; font-size: 11px; color: #475569; }
.score-formula code { flex: 1; padding: 5px 8px; border-radius: 5px; background: #eef2ff; color: #4338ca; white-space: normal; }
.eds-priority-table {
  width: 100%;
}
.eds-priority-table :deep(.el-table__cell) {
  font-size: 12px;
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

.eds-method {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.eds-method-value {
  color: #d97706;
  font-weight: 600;
}

.eds-params-table {
  width: 100%;
  overflow-x: auto;
}
.eds-params-table :deep(.el-table) {
  font-size: 12px;
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
  .selection-flow { grid-template-columns: 1fr 1fr; }
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
}
</style>
