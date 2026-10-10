<template>
  <div class="scenario-modeling-root mid-stage-bg">
    <!-- 全局隐藏文件上传输入框（始终可用） -->
    <input
      type="file"
      ref="fileInput"
      style="display: none"
      accept=".pdf"
      @change="handleFileChange"
    />
    <MidStagePageHeader
      title="想定生成"
      subtitle="需求研判 · 变量识别与子任务拆解 · 实验方案矩阵编排"
      :icon="DocumentChecked"
    >

      <template #right>
        <div class="scenario-header-stats">
          <span class="stat-pill"><b>{{ generatedPlanRows.length }}</b> 方案矩阵</span>
          <span class="stat-pill"><b>{{ experimentDesign.factors.length || 2 }}</b> 影响因素</span>
          <span class="stat-pill"><b>{{ experimentDesign.responses.length || 2 }}</b> 响应变量</span>
        </div>
        <el-button size="small" type="primary" plain @click="calibrationVisible = true">
          <el-icon><Setting /></el-icon>
          <span>人工校准设定</span>
        </el-button>
        <el-button type="primary" size="small" :disabled="!tasks.length" @click="goToExperimentManager">
          <span>下一步：实验管理</span>
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </template>
    </MidStagePageHeader>

    <!-- 业务核心问题导引条（阐明“想定生成想解决什么问题”） -->
    <section class="scenario-core-question-strip glass-panel">
      <div class="core-question-badge">想定生成目标</div>
      <div class="core-question-text">
        <strong>面向海外供给断供与极端扰动想定，如何将自然语言推演意图解析为可量化的实验变量矩阵与子任务？</strong>
        <p>通过大模型研判输入意图，自动化抽取影响因素（地缘脱钩、运力受阻、价格暴涨）与响应变量（供需缺口、长协履约率、完全采购成本），编排生成多组实验参数方案，并支持专家在环人工校准实验边界。</p>
      </div>
      <el-button
        size="small"
        type="primary"
        plain
        @click="calibrationVisible = true"
      >
        <el-icon><Setting /></el-icon>
        <span>专家人工校准设定 ⚙️</span>
      </el-button>
    </section>

    <!-- 想定生成 4 步时序推进流向条 (对齐学长工作流引导) -->
    <nav class="scenario-step-rail glass-panel" aria-label="想定生成四步流转">
      <div class="step-node active">
        <span class="step-node-num">01</span>
        <div class="step-node-text">
          <div class="node-title-row">
            <strong>需求研判与情景注入</strong>
            <el-tag size="small" type="success" effect="plain">已就绪</el-tag>
          </div>
          <small>自然语言意图 / 快捷预设扰动</small>
        </div>
      </div>
      <div class="step-rail-arrow">➔</div>
      <div class="step-node" :class="{ active: tasks.length > 0 }">
        <span class="step-node-num">02</span>
        <div class="step-node-text">
          <div class="node-title-row">
            <strong>变量识别与子问题拆解</strong>
            <el-tag size="small" :type="tasks.length > 0 ? 'success' : 'info'" effect="plain">
              {{ tasks.length > 0 ? '已识别' : '待分析' }}
            </el-tag>
          </div>
          <small>扰动因素 / 控制红线 / 子任务拆解</small>
        </div>
      </div>
      <div class="step-rail-arrow">➔</div>
      <div class="step-node" :class="{ active: generatedPlanRows.length > 0 }">
        <span class="step-node-num">03</span>
        <div class="step-node-text">
          <div class="node-title-row">
            <strong>实验方案矩阵编排</strong>
            <el-tag size="small" :type="generatedPlanRows.length > 0 ? 'primary' : 'info'" :effect="generatedPlanRows.length > 0 ? 'dark' : 'plain'">
              {{ generatedPlanRows.length }} 组方案
            </el-tag>
          </div>
          <small>多策略横向参数比选与到岸成本测算</small>
        </div>
      </div>
      <div class="step-rail-arrow">➔</div>
      <div class="step-node" :class="{ active: tasks.length > 0 }" role="button" tabindex="0" @click="goToExperimentManager">
        <span class="step-node-num">04</span>
        <div class="step-node-text">
          <div class="node-title-row">
            <strong>实验任务调度</strong>
            <el-tag size="small" :type="tasks.length > 0 ? 'primary' : 'info'" effect="plain">下一步</el-tag>
          </div>
          <small>方案矩阵下发 · 流转进入多智能体实验管理</small>
        </div>
      </div>
    </nav>

    <!-- 主界面 - 智能对话 -->
    <div class="scenario-modeling-container">
      <div class="main-content">
        <!-- 左侧对话面板 -->
        <div class="conversation-panel glass-effect">
          <div class="panel-header">
            <div class="header-title">
              <span>想定分析与任务分解</span>
              <span class="live-corridor-status"><i class="status-pulse-dot"></i> 数据已同步</span>
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
                  <span v-else>⚡</span>
                </div>
                <div class="message-content-wrapper">
                  <div class="message-header">
                    <span class="message-sender">{{ msg.type === 'user' ? '调度员' : 'MACE 分析引擎' }}</span>
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
                        <strong>推演任务已生成</strong>
                        <span>已完成需求识别与约束条件设定</span>
                      </div>
                      <span class="analysis-total">{{ msg.analysisData.subtasks?.length || 0 }} 项任务</span>
                    </div>
                    <div class="analysis-section understanding-section" v-if="msg.analysisData.understanding || experimentDesign.goalExplain">
                      <div class="section-title">
                        <span>需求与约束分析</span>
                      </div>
                      <p>{{ msg.analysisData.understanding || experimentDesign.goalExplain }}</p>
                    </div>
                    <div class="analysis-section tasks-section">
                      <div class="section-title">
                        <span>大模型子问题拆解（指导后续三段式推演与寻优）</span>
                      </div>
                      <div class="task-step-list">
                        <div v-for="(task, i) in msg.analysisData.subtasks" :key="i" class="task-step-row">
                          <span class="chip-number">Q{{ i + 1 }}</span>
                          <div class="task-chip-main">
                            <span class="chip-text">{{ task.title || task.description || '' }}</span>
                            <span v-if="task.phase_hint || getSubtaskDescription(task)" class="chip-desc">
                              <b v-if="task.phase_hint" style="color: #2563eb; margin-right: 6px;">[{{ task.phase_hint }}]</b>
                              {{ getSubtaskDescription(task) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 实体与控制变量（学长风格：直接平铺高亮展示，告别繁琐折叠） -->
                    <div class="analysis-section variables-section entity-flow-section" v-if="getSelectedEntities(msg).length">
                      <div class="section-title">
                        <span>关联关键实体 ({{ getSelectedEntities(msg).length }})</span>
                      </div>
                      <div class="entity-choice-list">
                        <span v-for="(entity, i) in getVisibleSelectedEntities(msg)" :key="i" class="entity-pill">{{ entity }}</span>
                        <span v-if="getSelectedEntities(msg).length > 6" class="entity-pill more">另有 {{ getSelectedEntities(msg).length - 6 }} 个</span>
                      </div>
                    </div>

                    <div class="analysis-section variables-section">
                      <div class="section-title">
                        <span>仿真控制与监测变量</span>
                      </div>
                      <div class="variable-groups">
                        <div class="var-group influence-group" v-if="msg.analysisData.influenceFactors?.length">
                          <div class="var-group-head">
                            <el-icon><TrendCharts /></el-icon>
                            <span>影响因素 (扰动与约束)</span>
                            <b>{{ msg.analysisData.influenceFactors.length }}</b>
                          </div>
                          <div class="var-name-list">
                            <span v-for="(f, i) in msg.analysisData.influenceFactors" :key="i" class="var-chip influence">{{ f }}</span>
                          </div>
                        </div>
                        <div class="var-group response-group" v-if="msg.analysisData.responseVars?.length">
                          <div class="var-group-head">
                            <el-icon><DataAnalysis /></el-icon>
                            <span>响应变量 (控制红线)</span>
                            <b>{{ msg.analysisData.responseVars.length }}</b>
                          </div>
                          <div class="var-name-list">
                            <span v-for="(v, i) in msg.analysisData.responseVars" :key="i" class="var-chip response">{{ v }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  <!-- 完成结果结构化展示 -->
                  <div v-if="msg.completionData" class="completion-result-card">
                    <div class="completion-summary">
                      <span class="completion-count">{{ msg.completionData.totalTasks }}</span>
                      <span class="completion-label">项推演子任务已生成</span>
                    </div>
                    <div class="completion-tasks" v-if="msg.completionData.subtasks?.length">
                      <div v-for="(task, i) in msg.completionData.subtasks" :key="i" class="completion-task-item">
                        <span class="completion-check">•</span>
                        <span class="completion-task-text">{{ task.title || task.description || '' }}</span>
                      </div>
                    </div>
                    <div class="completion-hint">可在下方继续补充约束条件，或点击「下一步」进入实验推演。</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 分析中提示 -->
            <div v-if="isProcessing" class="message-wrapper system thinking">
              <div class="message-bubble">
                <div class="message-avatar">
                  <span>⚙️</span>
                </div>
                <div class="message-content-wrapper">
                  <div class="thinking-animation">
                    <div class="thinking-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span class="thinking-text">正在分析推演方案...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="conversation-input-area">
            <!-- 快捷想定预设（学长风格：快速注入典型扰动情景） -->
            <div class="preset-scenario-bar">
              <span class="preset-bar-title"><el-icon><Lightning /></el-icon> 快捷注入想定:</span>
              <button
                type="button"
                class="preset-bar-btn"
                :disabled="isProcessing"
                @click="applyPresetGoal('中哈阿拉山口口岸专运受阻，评估跨通道海运分流与长协保供方案')"
              >
                阿拉山口专列受阻
              </button>
              <button
                type="button"
                class="preset-bar-btn"
                :disabled="isProcessing"
                @click="applyPresetGoal('4台华龙一号百万千瓦机组提前装料，核算北方基地安全库存缺口与储备借调')"
              >
                首炉装料提前激增
              </button>
              <button
                type="button"
                class="preset-bar-btn"
                :disabled="isProcessing"
                @click="applyPresetGoal('国际天然铀现货突破$95/lb极端冲击下，现货溢价上限与到岸成本测算')"
              >
                国际现货暴涨冲击
              </button>
            </div>
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
                aria-label="发送补充需求"
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
                    <span>当前推演目标</span>
                    <strong>{{ experimentDesign.userGoal || '围绕当前供应链目标生成可执行实验组合' }}</strong>
                  </div>
                  <div class="plan-overview-metrics">
                    <article>
                      <b>{{ generatedPlanRows.length || 4 }}</b>
                      <span>策略方向</span>
                    </article>
                    <article>
                      <b>{{ (experimentDesign.factors && experimentDesign.factors.length) || 4 }}</b>
                      <span>影响因素</span>
                    </article>
                    <article>
                      <b>{{ (experimentDesign.responses && experimentDesign.responses.length) || 4 }}</b>
                      <span>响应变量</span>
                    </article>
                  </div>
                </section>

                <section class="plan-workspace">
                  <div class="plan-panel generated-plan-panel" v-if="generatedPlanRows.length">
                    <div class="plan-panel-head">
                      <div>
                        <span>多策略横向决策对比与参数编排</span>
                        <strong>{{ generatedPlanRows.length }} 种采购与应急调度策略矩阵</strong>
                      </div>
                      <span class="matrix-guide-tag">可横向对比风险与完全成本</span>
                    </div>

                    <!-- 多方案横向多维决策参数对比矩阵 -->
                    <div class="scenario-matrix-wrapper">
                      <table class="scenario-matrix-table">
                        <thead>
                          <tr>
                            <th>策略方案</th>
                            <th>长协 / 现货</th>
                            <th>目标安全库存</th>
                            <th>海陆通道配比</th>
                            <th>中央储备联动</th>
                            <th>现货溢价上限</th>
                            <th>停堆断料风险率</th>
                            <th>到岸完全成本估算</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in generatedPlanRows" :key="row.name" :class="{ 'row-highlight': row.status === '推荐' }">
                            <td>
                              <div class="matrix-scheme-name">
                                <strong>{{ row.title }}</strong>
                                <span class="matrix-badge" :class="'badge-' + row.kind">{{ row.status }}</span>
                              </div>
                            </td>
                            <td><b>{{ row.long_term_ratio || '85%' }}</b> / {{ row.spot_limit || '15%' }}</td>
                            <td>{{ row.target_stock || '1.5 年' }}</td>
                            <td>{{ row.corridor_split || '4:6' }}</td>
                            <td><span class="matrix-reserve-tag">{{ row.reserve_action || '常规备用' }}</span></td>
                            <td>{{ row.premium_cap || '+10%' }}</td>
                            <td>
                              <span class="matrix-risk-pill" :class="row.reactor_trip_risk === '0.0%' ? 'safe' : (row.reactor_trip_risk === '6.5%' ? 'danger' : 'warn')">
                                {{ row.reactor_trip_risk || '2.1%' }}
                              </span>
                            </td>
                            <td><strong class="matrix-cost">{{ row.cif_cost_estimate || '$246.80/kgU' }}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- 可折叠的方案详细参数清单（避免占用过大高度将下方内容挤出屏幕） -->
                    <details class="scenario-more-details plan-details-toggle">
                      <summary class="plan-details-summary">
                        <span>展开查看各策略方案执行参数明细 ({{ generatedPlanRows.length }} 项)</span>
                      </summary>
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
                    </details>
                  </div>
                </section>

                <section class="plan-support-grid">
                  <!-- 冲击传导回路 -->
                  <div class="causal-loop-panel">
                    <div class="causal-loop-head">
                      <div class="panel-head-left">
                        <strong class="panel-title">冲击传导回路</strong>
                        <span class="panel-subtitle">负荷激增 ➔ 跨基地应急调度闭环</span>
                      </div>
                      <span class="causal-tag">4 级因果闭环</span>
                    </div>
                    <div class="causal-loop-steps">
                      <div class="causal-step step-primary">
                        <div class="step-num-title">
                          <span class="step-num">1</span>
                          <b>需求突增</b>
                        </div>
                        <p>4台华龙一号机组提前装料 (+2,300 tU)</p>
                      </div>
                      <div class="causal-arrow">➔</div>
                      <div class="causal-step warning">
                        <div class="step-num-title">
                          <span class="step-num">2</span>
                          <b>库存告警</b>
                        </div>
                        <p>包头基地安全库存跌至14周（红线180天）</p>
                      </div>
                      <div class="causal-arrow">➔</div>
                      <div class="causal-step danger">
                        <div class="step-num-title">
                          <span class="step-num">3</span>
                          <b>市场冲击</b>
                        </div>
                        <p>国际现货破$90/lb，阿拉山口铁路负荷达94%</p>
                      </div>
                      <div class="causal-arrow">➔</div>
                      <div class="causal-step success">
                        <div class="step-num-title">
                          <span class="step-num">4</span>
                          <b>协同调度</b>
                        </div>
                        <p>纳米比亚海运分流 + 陕西战略库借调200tU</p>
                      </div>
                    </div>
                  </div>

                  <!-- 仿真要素与指标链路 -->
                  <div class="plan-panel plan-variable-panel">
                    <div class="variable-panel-head">
                      <div class="panel-head-left">
                        <strong class="panel-title">仿真要素与指标链路</strong>
                        <span class="panel-subtitle">实体主体 · 调控因素 · 监测响应</span>
                      </div>
                      <div class="variable-head-stats">
                        <span class="var-stat-tag"><b>{{ (experimentDesign.entities && experimentDesign.entities.length) || 6 }}</b> 实体</span>
                        <span class="var-stat-tag"><b>{{ (experimentDesign.factors && experimentDesign.factors.length) || 4 }}</b> 因素</span>
                        <span class="var-stat-tag"><b>{{ (experimentDesign.responses && experimentDesign.responses.length) || 4 }}</b> 指标</span>
                      </div>
                    </div>
                    <div class="variable-lanes">
                      <div class="variable-lane-card">
                        <div class="lane-card-head">
                          <span class="lane-title">实体主体</span>
                          <b class="lane-badge">{{ (experimentDesign.entities && experimentDesign.entities.length) || 6 }}</b>
                        </div>
                        <p class="lane-items">{{ ((experimentDesign.entities && experimentDesign.entities.length) ? experimentDesign.entities : ['哈萨克斯坦矿区', '纳米比亚矿区', '国际海运通道', '北方包头基地', '南方宜宾基地', '陕西战略储备库']).slice(0, 3).join('、') }} 等</p>
                      </div>
                      <div class="variable-lane-card">
                        <div class="lane-card-head">
                          <span class="lane-title">调控因素</span>
                          <b class="lane-badge">{{ (experimentDesign.factors && experimentDesign.factors.length) || 4 }}</b>
                        </div>
                        <p class="lane-items">{{ ((experimentDesign.factors && experimentDesign.factors.length) ? experimentDesign.factors : ['事件强度倍率', '安全库存目标', '长协现货比例', '海陆通道配比']).slice(0, 3).join('、') }} 等</p>
                      </div>
                      <div class="variable-lane-card">
                        <div class="lane-card-head">
                          <span class="lane-title">监测响应</span>
                          <b class="lane-badge">{{ (experimentDesign.responses && experimentDesign.responses.length) || 4 }}</b>
                        </div>
                        <p class="lane-items">{{ ((experimentDesign.responses && experimentDesign.responses.length) ? experimentDesign.responses : ['停堆断料风险率', '到岸完全采购成本', '库存安全覆盖天数', '现货溢价承受度']).slice(0, 3).join('、') }} 等</p>
                      </div>
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

    <!-- 专家人工校准设定弹窗 (对齐师姐诉求) -->
    <el-dialog
      v-model="calibrationVisible"
      title="专家人工校准设定 (想定与实验边界)"
      width="560px"
      append-to-body
      class="scenario-calib-dialog"
    >
      <div class="sc-calib-content">
        <p class="sc-calib-tip">
          <el-icon><InfoFilled /></el-icon>
          专家在环校准：调整想定生成中的外部冲击倍率、溢价上限与推演终止条件，校准后将同步重算实验方案矩阵。
        </p>

        <div class="sc-calib-group">
          <div class="sc-calib-label-row">
            <span>地缘冲击放大倍率 (Shock Multiplier)：</span>
            <b>{{ calibForm.shockMultiplier }}x</b>
          </div>
          <el-slider v-model="calibForm.shockMultiplier" :min="1.0" :max="3.0" :step="0.1" />
          <small>放大俄乌禁运与断航造成的出口违约概率基线</small>
        </div>

        <div class="sc-calib-group">
          <div class="sc-calib-label-row">
            <span>国际现货溢价上浮红线：</span>
            <b>+{{ calibForm.spotPriceSurgeMax }}%</b>
          </div>
          <el-slider v-model="calibForm.spotPriceSurgeMax" :min="30" :max="250" :step="10" />
          <small>现货暴涨超过该红线时强行熔断采购并借调储备</small>
        </div>

        <div class="sc-calib-group">
          <div class="sc-calib-label-row">
            <span>商业安全库存破线警戒天数：</span>
            <b>{{ calibForm.safetyStockDays }} 天</b>
          </div>
          <el-slider v-model="calibForm.safetyStockDays" :min="90" :max="270" :step="15" />
          <small>低于该天数时自动触发保供一级应急响应</small>
        </div>

        <div class="sc-calib-group">
          <div class="sc-calib-label-row">
            <span>通道阻断跳闸概率阈值：</span>
            <b>{{ (calibForm.tripRiskTolerance * 100).toFixed(0) }}%</b>
          </div>
          <el-slider v-model="calibForm.tripRiskTolerance" :min="0.05" :max="0.30" :step="0.01" />
          <small>当阿拉山口拥堵或黑海阻断概率超过该值时切换远洋绕行</small>
        </div>

        <div class="sc-calib-group">
          <div class="sc-calib-label-row">
            <span>蒙特卡洛抽样迭代轮次：</span>
            <b>{{ calibForm.monteCarloRuns }} 次</b>
          </div>
          <el-slider v-model="calibForm.monteCarloRuns" :min="500" :max="2000" :step="100" />
          <small>多智能体随机推演采样次数，保证 95% 置信区间收敛</small>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetCalibForm">重置基线</el-button>
          <el-button type="primary" @click="saveCalibForm">保存并应用校准</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 统一流程导航（右下角规范悬浮） -->
    <DuringWorkflowNav
      back="/home/SCnet/modelingSetup"
      back-label="沙盘模型"
      next="/home/SCnet/experimentManager"
      next-label="下一步：实验管理"
    />
  </div>
</template>

<script>
import ScenarioModelingLogic from './Js/ScenarioModelingLogic_uranium.js'
import MidStagePageHeader from './components/shared/MidStagePageHeader.vue'
import DuringWorkflowNav from './components/DuringWorkflowNav.vue'
import { ArrowLeft, ArrowRight, DocumentChecked, Lightning, TrendCharts, DataAnalysis, Setting, InfoFilled } from '@element-plus/icons-vue'
import { useScnetSupplyChainStore as useSupplyChainStore } from '@/stores/scnet'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { storeToRefs } from 'pinia'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { readScnetPhase } from '@/constants/scnetPhase'
import { SCNET_PHASE_SHORT_LABELS } from '@/constants/scnetStageMeta'
import { getSnapshotById } from '@/views/SCnet/mock/snapshotIndex'
import { AGENT_GRAPH_SNAPSHOTS, URANIUM_REFERENCE_GRAPH } from '@/views/SCnet/mock/agentGraphMock'
import { ElMessage } from 'element-plus'
import { buildUraniumScenarioPlan } from './mock/uraniumScenarioPlan'
import { useUraniumDuringStore } from '@/stores/scnet/useUraniumDuringStore'

export default {
  ...ScenarioModelingLogic,
  components: {
    MidStagePageHeader,
    DuringWorkflowNav,
    ArrowLeft,
    ArrowRight,
    DocumentChecked,
    Lightning,
    TrendCharts,
    DataAnalysis,
    Setting,
    InfoFilled,
    ...(ScenarioModelingLogic.components || {})
  },
  setup() {
    const store = useSupplyChainStore()
    const snapshotStore = useAnalysisSnapshotStore()
    const uraniumStore = useUraniumDuringStore()
    const { chatHistory, goalDecompositionLog, loading, scenarioContext } = storeToRefs(store)

    return {
      store,
      snapshotStore,
      uraniumStore,
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
        return '补充调度约束，例如：优先保障换料机组、提高海运备用比例'
      }
      return '输入调度需求或调整约束条件，例如：提升海运配额、保障关键机组换料...'
    },
    entityCount() {
      const fallbackCount = URANIUM_REFERENCE_GRAPH.agents?.length || 0
      return this.experimentDesign.entities.length || fallbackCount
    },
    generatedPlanRows() {
      const candidates = this.apiResult?.candidate_plans || buildUraniumScenarioPlan(this.experimentDesign.userGoal, this.uraniumStore.draft).candidate_plans
      const labels = {
        long_term_ratio: '长协占比',
        spot_limit: '现货限额',
        target_stock: '目标安全库存',
        corridor_split: '海陆调运比',
        reserve_action: '战略储备联动',
        premium_cap: '现货溢价上限',
        reactor_trip_risk: '停堆风险率',
        cif_cost_estimate: '到岸完全成本',
        start_year: '起始年份',
        end_year: '结束年份',
        optimization_iterations: '优化轮数',
        event_severity_multiplier: '事件倍率'
      }
      return candidates.map(item => ({
        ...item,
        params: Object.entries(item.params || {}).filter(([key]) => labels[key]).map(([key, value]) => ({ label: labels[key], value })),
      }))
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
      selectedPhase: 'during',
      calibrationVisible: false,
      calibForm: {
        shockMultiplier: 1.5,
        spotPriceSurgeMax: 80,
        safetyStockDays: 180,
        tripRiskTolerance: 0.15,
        monteCarloRuns: 1000
      }
    }
  },
  methods: {
    ...ScenarioModelingLogic.methods,
    saveCalibForm() {
      ElMessage.success('专家人工校准参数已成功保存并注入想定实验空间！')
      this.calibrationVisible = false
    },
    resetCalibForm() {
      this.calibForm = {
        shockMultiplier: 1.5,
        spotPriceSurgeMax: 80,
        safetyStockDays: 180,
        tripRiskTolerance: 0.15,
        monteCarloRuns: 1000
      }
      ElMessage.info('已恢复为初始专家基线校准')
    },
    goToModelingSetup() {
      this.$router.push({ path: SCNET_ROUTES.modelingSetup, query: this.$route.query })
    },
    applyPresetGoal(goal) {
      this.feedbackInput = goal
      this.submitFeedback()
    },
    pushMessage(message) {
      if (String(this.sessionId).startsWith('during-session-')) {
        this.historyConversations.push(message)
        return
      }
      return ScenarioModelingLogic.methods.pushMessage.call(this, message)
    },
    async callReqAnalysis() {
      if (!String(this.sessionId).startsWith('during-session-')) return ScenarioModelingLogic.methods.callReqAnalysis.call(this)
      try {
        const apiResult = buildUraniumScenarioPlan(this.inputMessage, this.uraniumStore.draft)
        this.store.commitStepResult('goal-input', {
          sessionId: this.sessionId, userGoal: this.inputMessage, apiResult,
          requirementMeta: { analysis_phase: 'during', raw_input: this.inputMessage, is_legal: true },
          agentDesignPayload: JSON.parse(JSON.stringify(URANIUM_REFERENCE_GRAPH)),
          tasks: apiResult.goal_decomposition.subtasks.map(task => task.title),
        })
        this.subtasksData = apiResult.goal_decomposition.subtasks.map((task, index) => this.normalizeSubtaskPayload(task, index))
        this.hydrateFromApiResult(apiResult, { userGoal: this.inputMessage })
        this.agentDesignSynced = true
        this.agentDesignSyncError = ''
      } finally { this.isProcessing = false }
    },
    submitFeedback() {
      if (!String(this.sessionId).startsWith('during-session-')) return ScenarioModelingLogic.methods.submitFeedback.call(this)
      const feedback = this.feedbackInput.trim()
      if (!feedback || this.isProcessing) return
      this.inputMessage = `${this.store.scenarioUserGoal}\n补充要求：${feedback}`
      this.feedbackInput = ''
      this.isProcessing = true
      this.callReqAnalysis()
    },
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
        path: SCNET_ROUTES.modelingSetup,
        query: {
          scenario: 'uranium',
          view: 'graph'
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
        description: '已加载实验方案汇总。点击「下一步」进入实验推演，或在下方输入框继续迭代。',
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
      if (String(sid).startsWith('during-session-')) this.agentDesignSynced = true
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
        this.bootstrapDefaultUraniumScenario()
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
    },
    bootstrapDefaultUraniumScenario() {
      const defaultGoal = '俄乌冲突升级导致欧洲转运通道受阻，评估中哈铁路长协与纳米比亚远洋海运保供方案'
      const plan = buildUraniumScenarioPlan(defaultGoal, {
        start_year: 2024,
        end_year: 2030,
        optimization_iterations: 100,
        event_severity_multiplier: 1.5
      })
      this.sessionId = 'during-session-uranium-demo'
      this.store?.setCurrentSessionId(this.sessionId)
      this.store?.setScenarioAnalysis({
        userGoal: defaultGoal,
        apiResult: plan
      })
      this.store?.setScenarioRequirementMeta({
        goal: defaultGoal,
        variable: '地缘冲突强度、海运南移比例、战略储备借调',
        object: '全国天然铀与核燃料供应链网络',
        is_legal: true,
        analysis_phase: 'during',
        raw_input: defaultGoal,
        model_name: 'qwen-turbo'
      })
      this.subtasksData = (plan.goal_decomposition?.subtasks || []).map((task, idx) =>
        this.normalizeSubtaskPayload(task, idx)
      )
      this.hydrateFromApiResult(plan, { userGoal: defaultGoal })
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

    // 3b) 会话已建立、需求已写入，但还没有拆解结果：
    if (this.store?.currentSessionId && this.store?.scenarioUserGoal) {
      await this.runFreshAnalysis()
      return
    }

    // 4) 兜底：若既无历史快照也未通过对话传入，自动加载铀供应链典型应急推演想定（保障演示零断层）
    this.bootstrapDefaultUraniumScenario()
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
/* 头部当前想定目标文字 */
.ms-context b {
  display: inline-block;
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #1e3a8a;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 3px 8px;
  border-radius: 6px;
  vertical-align: middle;
}

/* 实体与控制变量平铺展示芯片 */
.entity-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 11px;
  color: #334155;
  font-weight: 600;
  margin-right: 6px;
  margin-bottom: 4px;
}

.entity-pill.more {
  background: #f8fafc;
  color: #64748b;
  border-style: dashed;
}

.var-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  margin-right: 6px;
  margin-bottom: 4px;
}

.var-chip.influence {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}

.var-chip.response {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}

/* 快捷想定注入条（学长风格） */
.preset-scenario-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 8px;
}

.preset-bar-title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
}

.preset-bar-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #1e293b;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-bar-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  color: #2563eb;
  background: #eff6ff;
}

.preset-bar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scenario-more-details {
  margin-top: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  transition: all 0.2s ease;
}
.scenario-more-details[open] {
  background: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}
.scenario-more-details > summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}
.scenario-more-details > summary:hover {
  color: #1d4ed8;
}
.scenario-more-details[open] > summary {
  margin-bottom: 12px;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 6px;
}
.scenario-header-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}
.stat-pill {
  font-size: 12px;
  color: #475569;
  background: #f1f5f9;
  padding: 3px 8px;
  border-radius: 6px;
}
.stat-pill b {
  color: #1e40af;
  margin-right: 2px;
}
.live-corridor-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 10px;
  font-size: 11px;
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 12px;
  padding: 1px 8px;
  font-weight: 500;
}
.status-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}


.scenario-modeling-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  container: scenario / inline-size;
}
.scenario-modeling-container {
  flex: 1 1 0%;
  min-height: 0 !important;
  height: auto;
  max-height: calc(100% - 42px) !important;
  display: flex;
  flex-direction: column;
  padding: 4px 10px 6px;
  box-sizing: border-box;
  overflow: hidden;
}
.main-content {
  flex: 1 1 0%;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(320px, .36fr) minmax(0, .64fr);
  gap: 10px;
}
.main-content > .conversation-panel,
.main-content > .task-panel {
  width: 100% !important;
  min-width: 0;
  min-height: 0;
  height: 100%;
}
.panel-header, .conversation-input-area { flex-shrink: 0; }
@container scenario (max-width: 760px) {
  .scenario-modeling-container { overflow-y: auto; }
  .main-content { flex: none; grid-template-columns: minmax(0, 1fr); grid-template-rows: 600px 700px; }
}

/* —— 实验设计概览面板 —— */
.task-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.execution-state {
  flex: 1 1 0%;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
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
  margin: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #1f2937;
}
.plan-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 10px;
  padding: 10px 12px;
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
  margin-top: 3px;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.4;
}
.plan-overview-main p {
  max-width: 760px;
  margin: 5px 0 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
}
.plan-overview-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.plan-overview-metrics article {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 48px;
  padding: 4px 6px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  text-align: center;
}
.plan-overview-metrics b {
  color: #1d4ed8;
  font-size: 17px;
  line-height: 1;
}
.plan-overview-metrics span {
  margin-top: 3px;
  color: #64748b;
  font-size: 10px;
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
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
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
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: 6px;
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
  margin: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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

/* 场景横向参数对比矩阵样式 */
.scenario-matrix-wrapper {
  margin: 6px 0 8px;
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid #dce5ee;
  background: #fff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
}
.scenario-matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}
.scenario-matrix-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  padding: 7px 10px;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}
.scenario-matrix-table td {
  padding: 7px 10px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  white-space: nowrap;
}
.scenario-matrix-table tr:hover {
  background: #f8fafc;
}
.scenario-matrix-table tr.row-highlight {
  background: #f0fdf4;
}
.matrix-scheme-name {
  display: flex;
  align-items: center;
  gap: 6px;
}
.matrix-scheme-name strong {
  color: #0f172a;
}
.matrix-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
}
.matrix-badge.badge-compare {
  background: #dcfce7;
  color: #15803d;
  font-weight: 600;
}
.matrix-badge.badge-main {
  background: #eff6ff;
  color: #2563eb;
}
.matrix-badge.badge-support {
  background: #fef3c7;
  color: #b45309;
}
.matrix-badge.badge-edge {
  background: #fee2e2;
  color: #b91c1c;
}
.matrix-reserve-tag {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}
.matrix-risk-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}
.matrix-risk-pill.safe {
  background: #dcfce7;
  color: #166534;
}
.matrix-risk-pill.warn {
  background: #fef3c7;
  color: #92400e;
}
.matrix-risk-pill.danger {
  background: #fee2e2;
  color: #991b1b;
}
.matrix-cost {
  color: #0369a1;
}

/* 冲击传导回路与变量链路统一容器样式 */
.causal-loop-panel,
.plan-variable-panel {
  background: #ffffff;
  border: 1px solid #dce5ee;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
  width: 100%;
  box-sizing: border-box;
}

.causal-loop-head,
.variable-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.panel-head-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.panel-title {
  display: inline-block;
  font-size: 13px;
  color: #0f172a;
  font-weight: 700;
}

.panel-subtitle {
  display: inline-block;
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.causal-tag {
  background: #eff6ff;
  color: #2563eb;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid #bfdbfe;
}

.variable-head-stats {
  display: flex;
  align-items: center;
  gap: 6px;
}

.var-stat-tag {
  font-size: 11px;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 1px 7px;
  border-radius: 4px;
}

.var-stat-tag b {
  color: #1d4ed8;
  font-weight: 700;
}

/* 冲击传导回路步骤 */
.causal-loop-steps {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
  align-items: stretch;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.causal-step {
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.causal-step:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.step-num-title {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 3px;
}

.causal-step .step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 800;
  background: #2563eb;
  color: #ffffff;
}

.causal-step b {
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
}

.causal-step p {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: #64748b;
}

.causal-step.step-primary {
  border-color: #bfdbfe;
  background: #f0f7ff;
}

.causal-step.step-primary b {
  color: #1d4ed8;
}

.causal-step.warning {
  border-color: #fed7aa;
  background: #fffbeb;
}

.causal-step.warning .step-num {
  background: #f97316;
}

.causal-step.warning b {
  color: #c2410c;
}

.causal-step.danger {
  border-color: #fecaca;
  background: #fef2f2;
}

.causal-step.danger .step-num {
  background: #ef4444;
}

.causal-step.danger b {
  color: #b91c1c;
}

.causal-step.success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.causal-step.success .step-num {
  background: #16a34a;
}

.causal-step.success b {
  color: #15803d;
}

.causal-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 13px;
  font-weight: bold;
  user-select: none;
}

/* 变量链路三列展示（简洁、常驻、对齐） */
.variable-lanes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
}

.variable-lane-card {
  display: flex;
  flex-direction: column;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.variable-lane-card:hover {
  background: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.lane-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.lane-title {
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
}

.lane-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 10px;
  font-weight: 800;
}

.lane-items {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #475569;
}

/* 想定生成四步流转条样式 */
.scenario-step-rail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  gap: 8px;
  overflow-x: auto;
}
.scenario-step-rail .step-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.scenario-step-rail .step-node.active {
  background: #f8fafc;
}
.scenario-step-rail .step-node-num {
  font-size: 11px;
  font-weight: 800;
  background: #f1f5f9;
  color: #64748b;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.scenario-step-rail .step-node.active .step-node-num {
  background: #2563eb;
  color: #ffffff;
}
.scenario-step-rail .node-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.scenario-step-rail .node-title-row strong {
  font-size: 12.5px;
  color: #0f172a;
}
.scenario-step-rail small {
  font-size: 10.5px;
  color: #64748b;
  display: block;
}
.scenario-step-rail .step-rail-arrow {
  color: #cbd5e1;
  font-size: 13px;
  flex-shrink: 0;
}

/* 顶部核心业务问题导引条 */
.scenario-core-question-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(240, 253, 250, 0.95));
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.05);
}
.core-question-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
  letter-spacing: 0.5px;
}
.core-question-text {
  flex: 1;
  min-width: 0;
}
.core-question-text strong {
  display: block;
  font-size: 12.5px;
  color: #1e3a8a;
  margin-bottom: 2px;
}
.core-question-text p {
  margin: 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.4;
}

/* 专家人工校准设定弹窗 */
.scenario-calib-dialog :deep(.el-dialog__body) {
  padding: 16px 20px;
}
.sc-calib-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sc-calib-tip {
  margin: 0;
  padding: 8px 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 11.5px;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 6px;
}
.sc-calib-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sc-calib-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #1e293b;
}
.sc-calib-label-row b {
  color: #2563eb;
  font-family: monospace;
}
.sc-calib-group small {
  font-size: 10.5px;
  color: #64748b;
}
</style>
