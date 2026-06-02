<template>
  <!-- 全局隐藏文件上传输入框（始终可用） -->
  <input
    type="file"
    ref="fileInput"
    style="display: none"
    accept=".pdf"
    @change="handleFileChange"
  />
  <!-- 步骤1：场景设定 - 全屏白色背景表单 -->
  <div v-if="currentFlowStepKey === 'scenario-setup'" class="scenario-setup-page">
    <button class="back-btn-3d" @click="goBackToPhaseSelection">
      <el-icon><Back/></el-icon>
      <span class="back-btn-text">返回选择</span>
    </button>

    <div class="scenario-dialog">
      <div class="scenario-page-header">
        <div class="dialog-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
          </svg>
        </div>
        <div class="setup-step-badge">
          <span class="step-num">01</span>
          <span class="step-name">场景设定</span>
          <span class="step-of">/ 共 5 步</span>
        </div>
        <p class="header-subtitle">请完成以下场景上下文，作为后续推演的事实基线</p>
      </div>

      <div class="scenario-setup-content">
        <!-- 场景设定 -->
        <div class="setup-section">
          <div class="section-header">
            <el-icon><Location /></el-icon>
            <span>场景设定</span>
          </div>

          <div class="setup-item">
            <div class="item-label">
              <el-icon><Clock /></el-icon>
              <span>事件历史背景</span>
              <span class="item-desc">交代事件发生前的供应链格局与外部约束</span>
            </div>
            <el-input
              v-model="scenarioContextData.historicalBackground"
              type="textarea"
              :rows="3"
              placeholder="例如：北美—亚太双枢纽供应链长期依赖单一海运通道，2025 年 Q3 出现持续拥堵..."
              class="setup-textarea"
            />
          </div>

          <div class="setup-item">
            <div class="item-label">
              <el-icon><Flag /></el-icon>
              <span>初始事件</span>
              <span class="item-desc">触发本次推演的关键事件</span>
            </div>
            <el-input
              v-model="scenarioContextData.initialEvent"
              type="textarea"
              :rows="3"
              placeholder="例如：核心海运通道因突发事件中断，3 家关键工厂面临原料断供..."
              class="setup-textarea"
            />
          </div>
        </div>

        <!-- 事件当前进展（事中专属，但默认展示，便于引导填写） -->
        <div class="setup-section during-section">
          <div class="section-header during">
            <el-icon><Odometer /></el-icon>
            <span>事件当前进展</span>
          </div>
          <div class="setup-item">
            <el-input
              v-model="scenarioContextData.currentProgress"
              type="textarea"
              :rows="4"
              placeholder="例如：已启用应急库存 30%，下游销售商交付延误平均 5 天，董事会要求 72 小时内给出调度方案..."
              class="setup-textarea"
            />
          </div>
        </div>
      </div>

      <div class="scenario-action-buttons">
        <el-button
          type="primary"
          size="large"
          :disabled="!isScenarioValid"
          class="save-scenario-btn"
          @click="submitScenarioSetup"
        >
          <el-icon><FolderChecked /></el-icon>
          <span>完成场景设定，进入需求输入</span>
        </el-button>
      </div>
    </div>
  </div>

  <!-- 步骤2：需求输入（居中对话框） -->
  <div v-if="currentFlowStepKey === 'requirement-input'" class="initial-dialog-overlay">
    <button class="back-btn-3d" style="width: 160px;" @click="goToFlowStep('scenario-setup')">
      <el-icon><Back/></el-icon>
      <span class="back-btn-text">修改场景设定</span>
    </button>

    <div class="particles">
      <div class="particle" v-for="i in 20" :key="i" :style="getParticleStyle(i)"></div>
    </div>

    <div class="initial-dialog">
      <div class="setup-step-badge">
        <span class="step-num">02</span>
        <span class="step-name">需求输入</span>
        <span class="step-of">/ 共 5 步</span>
      </div>

      <div class="dialog-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
        </svg>
      </div>
      <h2>需求输入</h2>
      <p>描述您本次推演的具体需求，AI 将基于场景上下文自动拆解为分析任务</p>

      <div class="initial-input-container">
        <div class="input-wrapper">
          <input
            v-model="inputMessage"
            @keyup.enter="startAnalysis"
            placeholder="例如：分析突发供应链断裂下的应急响应策略..."
            class="initial-message-input"
            :disabled="isProcessing"
            ref="initialInput"
          />
          <div class="input-border"></div>
        </div>

        <div class="initial-actions">
          <div class="initial-actions-left">
            <el-tooltip content="上传 PDF 文档作为补充输入" placement="top" effect="light">
              <el-button circle text @click="triggerFileUpload" :disabled="isProcessing">
                <el-icon><Plus/></el-icon>
              </el-button>
            </el-tooltip>
            <el-tag v-if="selectedFile" type="primary" round closable @close="selectedFile = null">
              {{ selectedFile.name }}
            </el-tag>
          </div>

          <div class="initial-actions-right">
            <el-dropdown @command="handleModelChange" trigger="click">
              <el-button text>
                <span class="model-name">{{ selectedModelLabel }}</span>
                <el-icon class="el-icon--right"><ArrowDown/></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="opt in modelOptions"
                    :key="opt.value"
                    :command="opt.value"
                    :disabled="opt.disabled"
                  >{{ opt.label }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              circle
              :type="inputMessage.trim() ? 'primary' : 'default'"
              :disabled="isProcessing || !inputMessage.trim()"
              @click="startAnalysis"
            >
              <el-icon v-if="!isProcessing"><Position/></el-icon>
              <el-icon v-else class="is-loading"><Loading/></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="isProcessing" class="initial-loading">
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <p>正在准备分析环境...</p>
      </div>
    </div>

    <div class="knowledge-base-float-button" @click="toggleKnowledgeBase">
      <span>知识库</span>
    </div>

    <div class="knowledge-base-drawer-overlay" v-if="showKnowledgeBase" @click="toggleKnowledgeBase"></div>
    <div class="knowledge-base-drawer" :class="{ 'open': showKnowledgeBase }">
      <div class="drawer-header">
        <h3>知识库管理</h3>
        <div class="drawer-close" @click="toggleKnowledgeBase">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
      </div>
      <div class="drawer-content">
        <KnowledgeCreate />
      </div>
    </div>
  </div>

  <!-- 主界面 - 智能对话（步骤3） -->
  <div v-if="currentFlowStepKey === 'smart-dialogue'" class="scenario-modeling-container">
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
              <el-popover placement="bottom-end" trigger="click" :width="300">
                <template #reference>
                  <button
                    class="session-history-mini-btn"
                    :disabled="restoringSession"
                  >
                    {{ restoringSession ? '恢复中' : '历史恢复' }}
                  </button>
                </template>
                <div class="session-restore-popover">
                  <div class="session-restore-popover-head">
                    <span>历史会话</span>
                    <button
                      class="session-refresh-btn"
                      @click="loadSessionHistory"
                      :disabled="sessionsLoading || restoringSession"
                    >
                      {{ sessionsLoading ? '刷新中' : '刷新' }}
                    </button>
                  </div>
                  <el-select
                    v-model="selectedSessionId"
                    placeholder="选择历史会话"
                    size="small"
                    filterable
                    class="session-select-popover"
                    :loading="sessionsLoading"
                    :disabled="sessionsLoading || restoringSession || !sessionHistory.length"
                  >
                    <el-option
                      v-for="session in sessionHistory"
                      :key="session.session_id"
                      :label="sessionOptionLabel(session)"
                      :value="session.session_id"
                    />
                  </el-select>
                  <button
                    class="session-restore-mini-btn"
                    @click="restoreSessionById()"
                    :disabled="!selectedSessionId || restoringSession"
                  >
                    {{ restoringSession ? '恢复中...' : '恢复会话' }}
                  </button>
                  <div v-if="!sessionsLoading && !sessionHistory.length" class="session-empty-tip">
                    暂无历史会话
                  </div>
                </div>
              </el-popover>
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
                  <div class="message-text" style="white-space: pre-wrap;">{{ msg.content }}</div>

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
                    <div class="analysis-section understanding-section">
                      <div class="section-title">
                        <span class="section-icon">📌</span>
                        <span>目标理解</span>
                      </div>
                      <div class="section-content">{{ msg.analysisData.understanding }}</div>
                    </div>

                    <div class="analysis-section tasks-section">
                      <div class="section-title">
                        <span class="section-icon">📋</span>
                        <span>任务拆解</span>
                      </div>
                      <div class="task-chips">
                        <div v-for="(task, i) in msg.analysisData.subtasks" :key="i" class="task-chip">
                          <span class="chip-number">{{ i + 1 }}</span>
                          <span class="chip-emoji">{{ task.emoji }}</span>
                          <span class="chip-text">{{ (task.title || task.description || '').substring(0, 35) }}{{ (task.title || task.description || '').length > 35 ? '...' : '' }}</span>
                          <span class="chip-agent">{{ getAgentDisplayName(task.agent_type || task.assigned_agent) }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="analysis-section variables-section">
                      <div class="var-group" v-if="msg.analysisData.influenceFactors?.length">
                        <span class="var-label">影响因素</span>
                        <div class="var-tags">
                          <span v-for="(f, i) in msg.analysisData.influenceFactors" :key="i" class="var-tag influence">{{ f }}</span>
                        </div>
                      </div>
                      <div class="var-group" v-if="msg.analysisData.responseVars?.length">
                        <span class="var-label">响应变量</span>
                        <div class="var-tags">
                          <span v-for="(v, i) in msg.analysisData.responseVars" :key="i" class="var-tag response">{{ v }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 完成结果结构化展示 -->
                  <div v-if="msg.completionData" class="completion-result-card">
                    <div class="completion-summary">
                      <span class="completion-count">{{ msg.completionData.totalTasks }}</span>
                      <span class="completion-label">个拆解任务已生成</span>
                    </div>
                    <div class="completion-tasks" v-if="msg.completionData.subtasks?.length">
                      <div v-for="(task, i) in msg.completionData.subtasks" :key="i" class="completion-task-item">
                        <span class="completion-check">•</span>
                        <span class="completion-task-text">{{ task.title || task.description || '' }}</span>
                      </div>
                    </div>
                    <div class="completion-hint">已完成五步流程前 3 步，并已尝试同步智能体配置。点击「下一步」进入仿真工作室继续执行。</div>
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
                placeholder="输入您的问题或反馈..."
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
            <div class="input-hint">
              <span>💡 提示：</span>
              <span>{{ isRequirementLegal ? '输入反馈可优化当前任务' : '完善需求要素后重新分析' }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧任务面板 -->
        <div class="task-panel glass-effect">
          <!-- 分析阶段 -->
          <div v-if="currentState === 'analysis'" class="analysis-state">
            <div class="panel-header">
              <div class="header-title">
                <span class="header-icon-small">🔍</span>
                <span>任务分析</span>
              </div>
              <div class="status-badge analysis">
                <span class="pulse-dot"></span>
                分析中
              </div>
            </div>

            <div class="analysis-content" v-if="taskAnalysisHtml">
              <div v-html="taskAnalysisHtml"></div>
            </div>

            <div v-else class="analysis-placeholder">
              <div class="placeholder-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <p>等待AI分析任务...</p>
            </div>
          </div>

          <!-- 执行阶段 -->
          <div v-else class="execution-state">
            <div class="panel-header">
              <div class="header-title">
                <span>任务拆解</span>
                <span class="header-subhint">（已与后端会话联动）</span>
              </div>
              <div class="status-badge" :class="{ 'active': isProcessing, 'completed': currentTaskIndex >= tasks.length }">
                <span v-if="currentTaskIndex < tasks.length" class="pulse-dot"></span>
                {{ currentTaskIndex >= tasks.length ? '已生成' : `生成中 ${currentTaskIndex + 1}/${tasks.length}` }}
              </div>
            </div>
            <div class="current-task-strip" v-if="tasks.length > 0">
              <span class="strip-icon">📌</span>
              <span class="strip-text">{{ currentTaskText }}</span>
            </div>

            <div class="execution-progress">
              <div class="progress-info">
                <span class="progress-label">拆解进度</span>
                <span class="progress-value">{{ Math.round(progressPercentage) }}%</span>
              </div>
              <div class="progress-bar">
                <!-- 已完成部分背景 - 蓝色 -->
                <div class="progress-completed-bg" :style="{ width: progressPercentage + '%' }"></div>

                <!-- 任务分段 -->
                <div
                  v-for="(task, index) in tasks"
                  :key="index"
                  class="progress-segment"
                  :class="{
                    'completed': index < currentTaskIndex || currentTaskIndex >= tasks.length,
                    'active': index === currentTaskIndex && currentTaskIndex < tasks.length,
                    'pending': index > currentTaskIndex
                  }"
                  :style="{ width: (100 / tasks.length) + '%' }"
                  @mouseenter="showTaskTooltip(index, $event)"
                  @mouseleave="hideTaskTooltip"
                  @click="selectHistoryTask(index)"
                >
                </div>

                <!-- 任务提示框 -->
                <div
                  v-if="hoveredTaskIndex !== null"
                  class="task-tooltip"
                  :style="{
                    left: tooltipX + 'px',
                    top: tooltipY + 'px'
                  }"
                >
                  {{ tasks[hoveredTaskIndex] }}
                  <div class="tooltip-arrow"></div>
                </div>

                <div class="progress-shine"></div>
              </div>
              <div class="progress-nav">
                <button class="nav-button nav-prev" @click="prevTask" aria-label="上一任务">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <button class="nav-button nav-next" @click="nextTask" aria-label="下一任务">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>

            <!-- 任务结果预览 -->
            <div class="task-result-preview" v-if="selectedResult || currentResult" :class="{ 'content-updated': isContentUpdated }">
              <div class="preview-header">
                <h4>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  拆解结果
                </h4>
              </div>
              <div class="preview-content">
                <div
                  class="result-content"
                  v-html="formatResultContent(editingContent)"
                  placeholder="拆解结果将显示在这里..."
                ></div>
              </div>
            </div>

            <!-- 空状态提示 -->
            <div v-else-if="currentState === 'execution' && tasks.length > 0" class="empty-result-state">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3>等待拆解展示</h3>
              <p>拆解结果将在生成后显示在这里</p>
            </div>
            <div v-if="currentTaskIndex >= tasks.length" class="next-button-container">
              <button 
                class="next-button" 
                @click="goToNextPage"
                :disabled="isProcessing"
              >
                <span>下一步</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- 右侧悬浮知识库按钮 -->
      <div class="knowledge-base-float-button" @click="toggleKnowledgeBase">
        <span>知识库</span>
      </div>

      <!-- 知识库抽屉 -->
      <div class="knowledge-base-drawer-overlay" v-if="showKnowledgeBase" @click="toggleKnowledgeBase"></div>
      <div class="knowledge-base-drawer" :class="{ 'open': showKnowledgeBase }">
        <div class="drawer-header">
          <h3>知识库管理</h3>
          <div class="drawer-close" @click="toggleKnowledgeBase">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
        </div>
        <div class="drawer-content">
          <KnowledgeCreate />
        </div>
      </div>
    </div>
</template>

<script>
import ScenarioModelingLogic from './Js/ScenarioModelingLogic.js'
import KnowledgeCreate from './PreScene/KnowledgeCreate.vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { storeToRefs } from 'pinia'
import {
  Back, Location, Clock, Flag, Odometer, FolderChecked, Plus, ArrowDown, Position, Loading
} from '@element-plus/icons-vue'

export default {
  ...ScenarioModelingLogic,
  components: {
    KnowledgeCreate,
    Back, Location, Clock, Flag, Odometer, FolderChecked, Plus, ArrowDown, Position, Loading
  },
  setup() {
    const store = useSupplyChainStore()
    const { chatHistory, goalDecompositionLog, loading, scenarioContext } = storeToRefs(store)

    return {
      store,
      chatHistory,
      goalDecompositionLog,
      storeLoading: loading,
      scenarioContext
    }
  },
  computed: {
    ...(ScenarioModelingLogic.computed || {}),
    currentFlowStepKey() {
      const raw = this.$route?.query?.step
      if (raw === 'requirement-input') return 'requirement-input'
      if (raw === 'smart-dialogue') return 'smart-dialogue'
      return 'scenario-setup'
    },
    scenarioSetupStep() {
      if (this.currentFlowStepKey === 'requirement-input') return 2
      if (this.currentFlowStepKey === 'smart-dialogue') return 3
      return 1
    },
    isScenarioValid() {
      const c = this.scenarioContextData || {}
      return Boolean(
        (c.historicalBackground || '').trim() &&
        (c.initialEvent || '').trim() &&
        (c.currentProgress || '').trim()
      )
    },
    selectedModelLabel() {
      const opt = this.modelOptions.find(o => o.value === this.selectedModel)
      return opt ? opt.label : this.selectedModel
    },
    // 根据选中阶段动态返回示例问题（保留以兼容旧逻辑/缓存键）
    exampleQuestions() {
      if (!this.selectedPhase) {
        return this.phaseExampleQuestions?.pre || []
      }
      return this.phaseExampleQuestions?.[this.selectedPhase] || []
    },
    parsedApiResult() {
      if (typeof this.apiResult === 'string') {
        try { return JSON.parse(this.apiResult) } catch (error) { return {} }
      }
      return this.apiResult || {}
    },
    decompositionSteps() {
      return this.goalDecompositionLog?.decomposition_steps || []
    },
    loadingDecomposition() {
      return this.storeLoading.decomposition
    }
  },
  data() {
    return {
      ...ScenarioModelingLogic.data(),
      showKnowledgeBase: false,
      // 步骤1 表单的本地副本（提交时再写回 store）
      scenarioContextData: {
        historicalBackground: '',
        initialEvent: '',
        currentProgress: '',
        completeTimeline: ''
      },
      selectedModel: 'qwen3.5-122b-a10b',
      modelOptions: [
        { label: 'Qwen3.5-122B-A10B', value: 'qwen3.5-122b-a10b', disabled: false },
        { label: 'Qwen3-235B-A22B', value: 'qwen3-235b-a22b', disabled: true }
      ],
      selectedPhase: 'pre',
      phases: [
        { value: 'pre',  label: '事前', icon: '📊', description: '供应链网络设计、产能规划、销售商布局策略' },
        { value: 'during',  label: '事中', icon: '🚨', description: '订单调度优化、工厂协作、库存动态管理' },
        { value: 'post', label: '事后', icon: '📈', description: '协作网络评估、成本分析、策略复盘' }
      ]
    }
  },
  created() {
    // 从 store 同步已保存的场景上下文
    if (this.scenarioContext) {
      this.scenarioContextData = {
        ...this.scenarioContextData,
        ...this.scenarioContext
      }
    }
    // 默认进入事中阶段（因步骤1-5是事中流程）
    this.selectedPhase = 'during'
  },
  methods: {
    ...ScenarioModelingLogic.methods,
    goToFlowStep(stepKey) {
      const query = { ...(this.$route?.query || {}), step: stepKey }
      this.$router.replace({ path: '/home/SCnet/scenarioModeling', query })
    },
    goBackToPhaseSelection() {
      this.$router.push('/home/SCnet/total')
    },
    submitScenarioSetup() {
      if (!this.isScenarioValid) return
      this.store.setScenarioContext(this.scenarioContextData)
      this.goToFlowStep('requirement-input')
    },
    handleModelChange(value) {
      this.selectedModel = value
    },
    // 重写：开始分析，携带阶段信息
    startAnalysis() {
      ScenarioModelingLogic.methods.startAnalysis.call(this)
    },
    goToNextPage() {
      if (!this.sessionId) {
        this.$message.warning('会话未就绪，请先完成需求判断与目标拆解')
        return
      }
      if (!this.tasks?.length) {
        this.$message.warning('暂无拆解任务，请先完成目标分析')
        return
      }
      this.store.setCurrentSessionId(this.sessionId)
      this.$router.push({ path: '/home/SCnet/agent-design-studio', query: { view: 'workflow' } })
    },
    phaseLabel(val) {
      const p = this.phases.find(x => x.value === val)
      return p ? p.label : val
    },
    toggleKnowledgeBase() {
      this.showKnowledgeBase = !this.showKnowledgeBase
    }
  }
}
</script>

<style scoped src="./Css/ScenarioModeling.css"></style>

<style scoped>
.current-task-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin: 12px 24px 0;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(99, 102, 241, 0.06));
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 10px;
  font-size: 13px;
  color: #1e3a8a;
  line-height: 1.4;
}
.strip-icon { 
  flex-shrink: 0; 
}
.strip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.session-refresh-btn,
.session-restore-mini-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.session-refresh-btn:hover,
.session-restore-mini-btn:hover {
  border-color: #60a5fa;
  color: #1d4ed8;
}

.session-refresh-btn:disabled,
.session-restore-mini-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.session-history-mini-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 10px;
}

.session-history-mini-btn:hover {
  border-color: #60a5fa;
  color: #1d4ed8;
}

.session-history-mini-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.session-restore-popover {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-restore-popover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #475569;
}

.session-select-popover {
  width: 100%;
}

.session-restore-mini-btn {
  width: 100%;
  padding: 6px 8px;
}

.session-empty-tip {
  font-size: 12px;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .current-task-strip {
    margin: 10px 12px 0;
    padding: 9px 10px;
  }

  .session-history-mini-btn {
    margin-left: 6px;
  }
}
</style>
