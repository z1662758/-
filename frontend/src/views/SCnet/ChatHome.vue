<template>
  <div class="chat-shell">
    <ChatSidebar
      :conversations="conversations"
      :activeId="currentConversationId"
      :collapsed="sidebarCollapsed"
      :history-loaded="historyLoaded"
      :history-error="historyError"
      :history-loading="historyLoading"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @new-conversation="startNewConversation"
      @select-conversation="loadConversation"
      @delete-conversation="handleDeleteConversation"
      @batch-delete="handleBatchDelete"
      @rename-conversation="handleRenameConversation"
      @open-knowledge="openKnowledge"
      @exit="goToMainPage"
      @retry-history="retryHistory"
    />

    <div class="chat-main" :class="[sidebarCollapsed ? 'chat-main-shrink' : 'chat-main-expand', isPostMode ? 'has-post' : (execPanelVisible ? 'has-exec' : '')]">

      <section v-if="duringExperimentId && currentMode === 'during' && scenarioStore.currentScenario === 'uranium'" class="chat-expert-context">
        <div>
          <strong>关联专家实验 · {{ duringExperimentId }}</strong>
          <p>建模参数、年度指标与决策依据已关联，可直接围绕当前实验提问</p>
        </div>
        <button :disabled="isStreaming" @click="openExpertExperiment">查看专家页面</button>
        <button :disabled="isStreaming" @click="startIndependentDuring">新建推演需求</button>
      </section>

      <!-- ====== Welcome ====== -->
      <template v-if="messages.length === 0 && !isStreaming">
        <div class="chat-welcome-wrap" :class="{ 'is-post': isPostMode }">
          <div class="chat-welcome" :class="{ 'is-post': isPostMode }">
            <div class="chat-welcome-brand">
              <img :src="logoUrl" alt="SCnet" class="chat-welcome-logo" />
              <span class="chat-welcome-text">SCnet 供应链推演与应急调度系统</span>
            </div>
            <!-- 事后复盘欢迎页保持干净：场景与阶段进入前已确定，这里不再重复摆提示语与选择器 -->
            <template v-if="!isPostMode">
              <p class="chat-welcome-hint">本系统支持 <b>铀供应链</b> 与 <b>汽车供应链</b> 两大场景，请先<b>手动选择</b>场景，再选择分析阶段直接提问，即可进入对应的推演分析。</p>

              <!-- 场景切换（手动） -->
              <div class="chat-scenario-switch" role="radiogroup" aria-label="选择供应链场景">
                <button v-for="opt in scenarioOptions" :key="opt.value" type="button"
                  class="chat-scenario-option" :class="[opt.className, { active: scenarioStore.currentScenario === opt.value }]"
                  role="radio" :aria-checked="scenarioStore.currentScenario === opt.value"
                  @click="selectScenario(opt.value)">
                  <span class="chat-scenario-dot"></span>
                  <span>{{ opt.label }}</span>
                </button>
              </div>

              <!-- Mode selector -->
              <div class="chat-mode-wrap">
                <div class="chat-mode-selector" @pointermove="handleModeGlassPointer" @pointerleave="resetModeGlassPointer">
                  <div class="chat-mode-slider" :class="'pos-' + modeIndex"></div>
                  <button v-for="opt in modeOptions" :key="opt.value" class="chat-mode-option"
                    :class="{ active: currentMode === opt.value }" @click="selectMode(opt.value)">
                    <el-icon :size="16"><component :is="opt.icon" /></el-icon>
                    <span>{{ opt.label }}</span>
                  </button>
                </div>
              </div>
            </template>

            <!-- 事后复盘：进入该阶段先讲清这次实验要做什么（见 PostReviewBrief） -->
            <PostReviewBrief
              v-if="isPostMode"
              class="chat-post-brief-welcome"
              :scenario-label="postScenarioLabel"
              :chain="postChainTemplate"
            />

            <!-- Input -->
            <div class="chat-welcome-input">
              <div class="chat-input-wrapper">
                <div class="chat-input-box">
                  <div class="chat-composer-body">
                    <textarea ref="welcomeTextarea" v-model="inputText" class="chat-input-textarea"
                      :placeholder="inputPlaceholder" rows="2"
                      @keydown.enter.exact.prevent="handleSend" @input="autoResizeWelcome"></textarea>
                  </div>
                  <div class="chat-composer-footer">
                    <div class="chat-composer-tools">
                      <button class="chat-composer-icon-btn chat-input-attach" @click="triggerFileInput" title="添加附件">
                        <el-icon :size="16"><Link /></el-icon>
                      </button>
                      <el-popover trigger="click" placement="top" :width="180" popper-class="chat-popover">
                        <template #reference>
                          <button class="chat-composer-tag-btn" title="执行模式">
                            <el-icon :size="15"><component :is="currentExecMode.icon" /></el-icon>
                            <span>{{ currentExecMode.label }}</span>
                          </button>
                        </template>
                        <div class="chat-selector-menu">
                          <button v-for="m in EXEC_MODES" :key="m.value" class="chat-selector-item"
                            :class="{ active: execMode === m.value }" @click="execMode = m.value">
                            <el-icon :size="16"><component :is="m.icon" /></el-icon>
                            <div class="chat-selector-item-text">
                              <span class="chat-selector-item-label">{{ m.label }}</span>
                              <span class="chat-selector-item-desc">{{ m.desc }}</span>
                            </div>
                          </button>
                        </div>
                      </el-popover>
                      <el-popover trigger="click" placement="top" :width="200" popper-class="chat-model-popover">
                        <template #reference>
                          <button class="chat-composer-tag-btn" title="选择模型">
                            <el-icon :size="15"><Cpu /></el-icon>
                            <span>{{ currentModelLabel }}</span>
                          </button>
                        </template>
                        <div class="chat-model-menu">
                          <button v-for="m in chatModels" :key="m.value" class="chat-model-item"
                            :class="{ active: selectedModel === m.value }"
                            :disabled="m.configured === false"
                            :title="m.configured === false ? '后端未配置该 provider 的 API Key' : ''"
                            @click="selectedModel = m.value">{{ m.configured === false ? m.label + '（未配置 Key）' : m.label }}</button>
                        </div>
                      </el-popover>
                    </div>
                    <div class="chat-composer-actions">
                      <button class="chat-send-btn" :disabled="!inputText.trim() && attachments.length === 0" @click="handleSend" title="发送消息">
                        <el-icon :size="15"><Position /></el-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 预设问题：按当前场景 × 阶段展示，点击后填入输入框 -->
            <div class="chat-preset-wrap">
              <div class="chat-preset-head">
                <span>{{ presetTitle }}</span>
              </div>
              <div class="chat-preset-grid">
                <button v-for="(q, i) in presetQuestions" :key="q.phase + '-' + i" type="button"
                  class="chat-preset-card" :title="q.text" @click="applyPreset(q)">
                  <span class="chat-preset-icon">{{ q.icon }}</span>
                  <span class="chat-preset-body">
                    <span class="chat-preset-title">
                      {{ q.title }}
                      <span v-if="q.tag" class="chat-preset-tag">{{ q.tag }}</span>
                      <em v-if="currentMode === 'auto'" class="chat-preset-phase" :class="'is-' + q.phase">{{ phaseShortLabels[q.phase] }}</em>
                    </span>
                    <span class="chat-preset-text">{{ q.text }}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ====== Messages ====== -->
      <template v-else>
        <div class="chat-messages" ref="msgContainer">
          <div class="chat-messages-inner">
            <!-- 事后复盘：阶段说明常驻对话页顶部，翻历史也不会丢「这一步该干嘛」 -->
            <PostReviewBrief
              v-if="isPostMode"
              :scenario-label="postScenarioLabel"
              :chain="postChainTemplate"
            />
            <div v-for="msg in messages" :key="msg.id" class="chat-msg" :class="msg.role">
              <div class="chat-msg-avatar" :class="msg.role">
                <img v-if="msg.role === 'assistant'" :src="logoUrl" alt="" />
                <span v-else>U</span>
              </div>
              <div class="chat-msg-body">
                <!-- K3-CHAT-2:三部分结果卡 -->
                <div v-if="msg.role === 'assistant' && execPanelVisible && !msg.goalBrief" class="chat-result-cards">
                  <div v-for="card in RESULT_CARDS" :key="card.key" class="chat-result-card"
                    :class="{ active: isSectionDone(card.key) }">
                    <span class="chat-result-card-num">{{ card.key }}</span>
                    <span class="chat-result-card-label">{{ card.label }}</span>
                    <span class="chat-result-card-check">{{ isSectionDone(card.key) ? '✓' : '…' }}</span>
                  </div>
                </div>
                <!-- 事后阶段:先把目标复述清楚,再按「观察 / 干预 / 机制」拆成三个子问题 -->
                <div v-if="msg.goalBrief" class="chat-goal-brief">
                  <p class="chat-goal-line">
                    您的目标是：<b class="chat-goal-target">{{ msg.goalBrief.goal }}</b>。这是一个全流程目标，后续将拆分为<b>观察</b>（{{ msg.goalBrief.dims.observe }}）、<b>干预</b>（{{ msg.goalBrief.dims.intervene }}）、<b>机制</b>（{{ msg.goalBrief.dims.mechanism }}）三个子问题。
                  </p>
                  <p class="chat-goal-confirm">请确认以上实验目的是否准确。准确请输入「确认实验目的」；需要调整时，请直接重新描述实验目的。</p>
                </div>
                <div v-if="msg.content" class="chat-msg-bubble" :class="{ 'is-streaming': msg._streaming }" v-html="renderMarkdown(msg.content)"></div>
                <div v-if="msg._error" class="chat-msg-error">
                  <span>本次研判未完成</span>
                  <button type="button" :disabled="isStreaming" @click="retryMessage(msg)">重试</button>
                </div>
                <div v-if="msg.role === 'assistant' && !msg.goalBrief" class="chat-disclaimer">
                  {{ isUraniumScenario || currentMode === 'during' ? '测算结果基于核燃料供需模型与运筹算法实时求解生成' : '本回答由 AI 生成，内容仅供参考' }}
                </div>
                <div v-if="msg._completedDuration" class="chat-completed-line">&#10047; 耗时 {{ formatDuration(msg._completedDuration) }}</div>
                <UraniumExpertEvidence v-if="msg._expertEvidence" :evidence="msg._expertEvidence" @open="openEvidenceDetail" />
                <!-- K2-FLOW:本次研判结果操作区 -->
                <div v-if="analysisSuccess && msg.id === lastAnalysisMsgId" class="chat-analysis-actions">
                  <button class="chat-pdf-btn" :disabled="pdfGenerating" @click="exportPdf">
                    {{ pdfStateText }}
                  </button>
                </div>
              </div>
            </div>
            <div v-if="isStreaming" class="chat-spinner" :style="{ '--spinner-color': spinnerColor }">
              <span class="chat-spinner-glyph">{{ spinnerGlyph }}</span>
              <span class="chat-spinner-verb">{{ spinnerVerb }}&hellip;</span>
              <span class="chat-spinner-timer">{{ formatDuration(streamElapsed) }}</span>
              <span v-if="execState === 'running' && execStatus" class="chat-spinner-info">&middot; {{ execStatus }}</span>
            </div>
          </div>
        </div>
        <!-- 操作入口固定在输入区上方，长回答完成后仍然可见。 -->
        <div v-if="analysisSuccess" class="chat-visualize-zone">
          <!-- 事后复盘:实验方案设计(实验目的 + 干预变量 + 目标指标 + 轮次都收敛到方案设计页,对话里只留一个入口) -->
          <div v-if="isPostPhase" class="chat-plan-step">
            <p class="chat-plan-title">实验方案设计</p>
            <p class="chat-plan-desc">实验目的已按本次研判拟好；干预变量、目标指标与观测轮次在方案设计页里配置，保存后直接写入反事实实验平台的参数面板。</p>
            <p class="chat-plan-preview">{{ planPurpose || '（尚未生成实验目的，可在方案设计页手填）' }}</p>
            <p v-if="planPurposeConfirmed" class="chat-plan-confirmed">✓ 实验目的已确认，可进入方案设计</p>
            <div class="chat-plan-actions">
              <button class="chat-visualize-btn" @click="openPlanDesign">
                <span>进入实验方案设计</span>
                <b class="chat-visualize-arrow">&rarr;</b>
              </button>
              <el-popover trigger="click" placement="top" :width="330" popper-class="chat-model-popover">
                <template #reference>
                  <button class="chat-handoff-more">跳过方案，去别处</button>
                </template>
                <div class="chat-handoff-menu">
                  <button v-for="t in postSideTargets" :key="t.path" class="chat-handoff-item" @click="goVisualization(t)">
                    <span class="chat-handoff-item-label">{{ t.label }}</span>
                    <span class="chat-handoff-item-hint">{{ t.hint }}</span>
                  </button>
                </div>
              </el-popover>
            </div>
          </div>

          <!-- 事中研判/推演入口 -->
          <div v-else-if="currentMode === 'during'" class="chat-handoff-zone">
            <button class="chat-visualize-btn" @click="goVisualization()">
              <span>{{ activeDuringPlan ? '查看建模设定' : '进入可视化界面' }}</span>
              <b class="chat-visualize-arrow">&rarr;</b>
            </button>
          </div>

          <!-- 事前研判:态势研判 / 态势预测 -->
          <div v-else class="chat-handoff-zone">
            <span class="chat-handoff-lead">带着这次研判继续：</span>
            <button class="chat-visualize-btn" @click="goVisualization(primaryHandoffTarget)">
              <span>进入{{ primaryHandoffTarget?.label || '可视化界面' }}</span>
              <b class="chat-visualize-arrow">&rarr;</b>
            </button>
            <el-popover v-if="handoffTargets && handoffTargets.length > 1" trigger="click" placement="top"
              :width="330" popper-class="chat-model-popover">
              <template #reference>
                <button class="chat-handoff-more">其它去向</button>
              </template>
              <div class="chat-handoff-menu">
                <button v-for="t in handoffTargets" :key="t.path" class="chat-handoff-item"
                  :class="{ active: t.path === primaryHandoffTarget?.path }" @click="goVisualization(t)">
                  <span class="chat-handoff-item-label">{{ t.label }}</span>
                  <span class="chat-handoff-item-hint">{{ t.hint }}</span>
                </button>
              </div>
            </el-popover>
            <p class="chat-handoff-note">跳转会带上本次问题与阶段，落地页顶部可一键回到本对话</p>
          </div>
        </div>
        </div>
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <div class="chat-input-box">
              <div v-if="attachments.length > 0" class="chat-file-previews">
                <div v-for="(f, idx) in attachments" :key="idx" class="chat-file-preview">
                  <img v-if="f.preview && f.type.startsWith('image/')" :src="f.preview" :alt="f.name" />
                  <div v-else class="chat-file-preview-doc">
                    <el-icon :size="20"><Document /></el-icon>
                    <span>{{ f.name.length > 8 ? f.name.slice(0, 8) + '..' : f.name }}</span>
                  </div>
                  <button class="chat-file-preview-remove" @click="removeAttachment(idx)">&times;</button>
                </div>
              </div>
              <div class="chat-composer-body">
                <textarea ref="chatTextarea" v-model="inputText" class="chat-input-textarea"
                  placeholder="输入调度需求或调整约束条件，按 Enter 发送..." rows="2" :disabled="isStreaming"
                  @keydown.enter.exact.prevent="handleSend" @input="autoResizeChat"></textarea>
              </div>
              <div class="chat-composer-footer">
                <div class="chat-composer-tools">
                  <button class="chat-composer-icon-btn chat-input-attach" @click="triggerFileInput" title="添加附件">
                    <el-icon :size="16"><Link /></el-icon>
                  </button>
                  <el-popover trigger="click" placement="top" :width="180" popper-class="chat-popover">
                    <template #reference>
                      <button class="chat-composer-tag-btn" :disabled="isStreaming" title="执行模式">
                        <el-icon :size="15"><component :is="currentExecMode.icon" /></el-icon>
                        <span>{{ currentExecMode.label }}</span>
                      </button>
                    </template>
                    <div class="chat-selector-menu">
                      <button v-for="m in EXEC_MODES" :key="m.value" class="chat-selector-item"
                        :class="{ active: execMode === m.value }" @click="execMode = m.value">
                        <el-icon :size="16"><component :is="m.icon" /></el-icon>
                        <div class="chat-selector-item-text">
                          <span class="chat-selector-item-label">{{ m.label }}</span>
                          <span class="chat-selector-item-desc">{{ m.desc }}</span>
                        </div>
                      </button>
                    </div>
                  </el-popover>
                  <el-popover trigger="click" placement="top" :width="200" popper-class="chat-model-popover">
                    <template #reference>
                      <button class="chat-composer-tag-btn" :class="{ 'is-unconfigured': currentModelOption && currentModelOption.configured === false }"
                        :disabled="isStreaming" title="选择模型">
                        <el-icon :size="15"><Cpu /></el-icon>
                        <span>{{ currentModelLabel }}</span>
                      </button>
                    </template>
                    <div class="chat-model-menu">
                      <button v-for="m in chatModels" :key="m.value" class="chat-model-item"
                        :class="{ active: selectedModel === m.value }"
                        :disabled="m.configured === false"
                        :title="m.configured === false ? '后端未配置该 provider 的 API Key' : ''"
                        @click="selectedModel = m.value">{{ m.configured === false ? m.label + '（未配置 Key）' : m.label }}</button>
                    </div>
                  </el-popover>
                </div>
                <div class="chat-composer-actions">
                  <button v-if="!isStreaming" class="chat-send-btn" :disabled="!inputText.trim() && attachments.length === 0"
                    @click="handleSend" title="发送消息">
                    <el-icon :size="15"><Position /></el-icon>
                  </button>
                  <button v-else class="chat-stop-btn" @click="abortStream" title="中止对话"></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 右侧：事后阶段固定为复盘工作台（内含 Agent 执行状态），其余阶段是 Agent 研判执行面板 -->
    <aside v-if="execPanelVisible && !isPostMode" class="chat-exec-panel">
      <div class="chat-exec-header">
        <span class="chat-exec-title">{{ activeRun?.kind === 'requirement' ? '事中需求分析 · Agent 执行' : execPanelTitle }}</span>
        <button class="chat-exec-close" @click="execPanelVisible = false" title="收起">&times;</button>
      </div>
      <div class="chat-exec-body">
        <div class="chat-exec-model" v-if="activeRun && activeRun.model">
          <span class="chat-exec-model-provider">{{ activeRun.provider }}</span>
          <span class="chat-exec-model-name">{{ activeRun.model }}</span>
        </div>
        <div class="chat-exec-status">
          <span class="chat-exec-status-dot" :class="execState"></span>
          <span>{{ execStatus }}</span>
        </div>
        <nav v-if="activeRun?.phase === 'during'" class="chat-exec-tabs" aria-label="实验解读面板">
          <button v-for="tab in [{ id: 'steps', label: '步骤' }, { id: 'parameters', label: '参数' }, { id: 'result', label: '结果' }]" :key="tab.id" :class="{ active: execActiveTab === tab.id }" @click="execActiveTab = tab.id">{{ tab.label }}</button>
        </nav>
        <template v-if="activeRun?.phase !== 'during' || execActiveTab === 'steps'">
        <div class="chat-exec-sections">
          <span v-for="s in SECTION_ORDER" :key="s" class="chat-exec-section-chip"
            :class="{ active: execSections.includes(s) || execState === 'done' }">
            {{ SECTION_LABELS[s] }}
          </span>
        </div>

        <!-- 事中需求分析步骤流水线 -->
        <div v-if="activeRun?.kind === 'requirement'" class="chat-exec-step-timeline">
          <div class="chat-step-item" :class="{ done: execSections.includes('一') || execState === 'done' }">
            <div class="step-line-col">
              <span class="step-num-dot">1</span>
              <span class="step-vertical-line"></span>
            </div>
            <div class="step-card-content">
              <div class="step-card-header">
                <strong>需求意图识别与定标</strong>
                <el-tag size="small" :type="(execSections.includes('一') || execState === 'done') ? 'success' : 'info'" effect="plain">
                  {{ (execSections.includes('一') || execState === 'done') ? '已完成' : '执行中' }}
                </el-tag>
              </div>
              <p class="step-card-desc">自动解析用户输入，定标全国基线需求 11,500 tU，识别出 +2,300 tU 峰值缺口敞口。</p>
            </div>
          </div>

          <div class="chat-step-item" :class="{ done: execSections.includes('二') || execState === 'done' }">
            <div class="step-line-col">
              <span class="step-num-dot">2</span>
              <span class="step-vertical-line"></span>
            </div>
            <div class="step-card-content">
              <div class="step-card-header">
                <strong>网络映射与策略生成</strong>
                <el-tag size="small" :type="(execSections.includes('二') || execState === 'done') ? 'success' : 'info'" effect="plain">
                  {{ (execSections.includes('二') || execState === 'done') ? '已完成' : '计算中' }}
                </el-tag>
              </div>
              <p class="step-card-desc">匹配全球矿山与口岸物流，生成【保供优先】、【成本优先】、【平衡方案】3 大对比策略。</p>
            </div>
          </div>

          <div class="chat-step-item" :class="{ done: execSections.includes('三') || execState === 'done' }">
            <div class="step-line-col">
              <span class="step-num-dot">3</span>
            </div>
            <div class="step-card-content">
              <div class="step-card-header">
                <strong>参数绑定与下一步安排</strong>
                <el-tag size="small" :type="(execSections.includes('三') || execState === 'done') ? 'success' : 'info'" effect="plain">
                  {{ (execSections.includes('三') || execState === 'done') ? '就绪' : '等待' }}
                </el-tag>
              </div>
              <p class="step-card-desc">绑定 Monte-Carlo 采样约束，决策参数已持久化，可直接载入建模设定开展实盘推演。</p>
              <div v-if="execSections.includes('三') || execState === 'done'" class="step-card-btn-wrap">
                <button class="chat-mini-action-btn" @click="goVisualization">查看建模设定 →</button>
              </div>
            </div>
          </div>
        </div>
        </template>
        <div v-else-if="execActiveTab === 'parameters'" class="chat-exec-parameters">
          <template v-if="activeEvidence">
            <div class="chat-param-badge">实盘推演参数环境</div>
            <strong>{{ activeEvidence.name }}</strong>
            <dl>
              <div><dt>业务场景</dt><dd>天然铀（Nat-U）战略供给与应急调度</dd></div>
              <div><dt>推演窗口</dt><dd>{{ activeEvidence.results[0]?.data?.plan?.start_year || 2024 }}–{{ activeEvidence.results[0]?.data?.plan?.end_year || 2028 }}（季度步长）</dd></div>
              <div><dt>全国基线需求</dt><dd>11,500 tU/年</dd></div>
              <div><dt>库存红线</dt><dd>国内商业安全库存 180 天</dd></div>
              <div><dt>陆运口岸上限</dt><dd>阿拉山口 1,200 tU/月</dd></div>
              <div><dt>海运周期</dt><dd>Class 7 专用散货 40–50 天</dd></div>
              <div><dt>重点基地</dt><dd>北方包头基地、南方沿海基地、陕西储备库</dd></div>
            </dl>
          </template>
          <template v-else-if="activeDuringPlan">
            <div class="chat-param-badge">事中应急调度基线</div>
            <strong>天然铀（U3O8 / Nat-U）跨基地保供</strong>
            <dl>
              <div><dt>业务场景</dt><dd>突发增量保供与口岸通道防断链</dd></div>
              <div><dt>推演窗口</dt><dd>{{ activeDuringPlan.plan.exp_params.params.start_year }}–{{ activeDuringPlan.plan.exp_params.params.end_year }} 年（季度步长）</dd></div>
              <div><dt>全国基线</dt><dd>11,500 tU/年（突发增量 +2,300 tU）</dd></div>
              <div><dt>缺口承接</dt><dd>北方基地 60% / 南方基地 40%</dd></div>
              <div><dt>口岸约束</dt><dd>阿拉山口上限 1,200 tU/月</dd></div>
              <div><dt>库存红线</dt><dd>商业库存不得低于 180 天</dd></div>
              <div><dt>优化算法</dt><dd>蒙特卡洛多轮多智能体博弈（1000次采样）</dd></div>
            </dl>
          </template>
          <div v-else class="chat-param-empty">
            <dl>
              <div><dt>业务场景</dt><dd>天然铀（Nat-U）战略供给与应急调度</dd></div>
              <div><dt>安全库存红线</dt><dd>180 天储备刚性底线</dd></div>
              <div><dt>陆运通量上限</dt><dd>阿拉山口 1,200 tU/月</dd></div>
              <div><dt>海运资质</dt><dd>国际 Class 7 放射品专用船期</dd></div>
            </dl>
          </div>
        </div>
        <div v-else class="chat-exec-parameters">
          <template v-if="activeEvidence && analysisSuccess">
            <div class="chat-alert-banner success">
              <span class="chat-alert-dot"></span>
              <strong>推演方案已就绪</strong>
            </div>
            <p>已关联 {{ activeEvidence.results.length }} 项推演依据，北方与南方基地分配比例已计算完成。</p>
            <button class="chat-visualize-btn" @click="openEvidenceDetail(activeEvidence.detail)">查看完整推演看板 →</button>
          </template>
          <template v-else-if="activeDuringPlan && analysisSuccess">
            <div class="chat-alert-banner warning">
              <span class="chat-alert-dot warning"></span>
              <strong>实时扰动风险预警</strong>
            </div>
            <dl class="chat-mini-risk-grid">
              <div><dt>未决风险敞口</dt><dd class="warn-text">~850 tU</dd></div>
              <div><dt>受波及机组</dt><dd>3 台次（华龙/AP1000）</dd></div>
              <div><dt>北方基地周数</dt><dd class="danger-text">剩余 14 周（预警）</dd></div>
              <div><dt>南方基地周数</dt><dd class="safe-text">剩余 36 周（安全）</dd></div>
            </dl>
            <p class="chat-mini-risk-hint">当前态势：南北基地原料库存失衡正在扩大，需进入建模设定配置口岸通量与分配规则。</p>
            <button class="chat-visualize-btn" @click="goVisualization">进入建模设定 →</button>
          </template>
          <div v-else class="chat-mini-risk-empty">
            <div class="chat-alert-banner info">
              <span class="chat-alert-dot info"></span>
              <strong>态势监控中</strong>
            </div>
            <p>当前系统正持续监听口岸通量与国际现货指数，提出应急诉求后即刻输出扰动估算。</p>
          </div>
        </div>
        <div v-if="activeRun?.phase !== 'during' || execActiveTab === 'steps'" class="chat-exec-tools">
          <div v-for="t in execTools" :key="t.call_id" class="chat-exec-tool" :class="t.status">
            <span class="chat-exec-tool-dot"></span>
            <span class="chat-exec-tool-name">{{ toolDisplayName(t.tool) }}</span>
            <span class="chat-exec-tool-state">{{ t.status === 'running' ? '执行中…' : (t.status === 'done' ? '完成' : '失败') }}</span>
          </div>
        </div>
        <div v-if="!activeRun && execTools.length === 0" class="chat-exec-empty">
          提交问题后，Agent 将在此展示执行状态、工具调用与研判进度。
        </div>
      </div>
    </aside>

    <!-- 右侧：事后复盘工作台（阶段操作 + 参数展示 + Agent 执行） -->
    <aside v-if="isPostMode" class="chat-post-panel">
      <PostReviewWorkspace
        :actions="postReviewActions"
        :progress="postReviewProgress"
        :parameters="postReviewParameterGroups"
        :scenario-label="postScenarioLabel"
        :agent="postReviewAgent"
        @consult="consultPostAction"
        @enter="enterPostAction"
      />
    </aside>

    <input ref="fileInput" type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.json,.csv,.xlsx"
      style="display:none" @change="handleFileChange" />

    <!-- Debug thinking panel -->
    <div v-if="debugThinkingVisible" class="chat-debug-panel">
      <div class="chat-debug-panel-header">
        <span>思考内容</span>
        <button class="chat-debug-panel-close" @click="debugThinkingVisible = false">&times;</button>
      </div>
      <div class="chat-debug-panel-body" ref="debugPanelBody">
        <pre>{{ debugThinking || '(等待思考内容...)' }}</pre>
      </div>
    </div>

    <!-- Debug eye toggle -->
    <el-tooltip content="思考内容" placement="left" effect="dark">
      <button class="chat-toggle-float-btn is-debug" :class="{ 'is-chat-active': debugThinkingVisible }"
        @click="debugThinkingVisible = !debugThinkingVisible">
        <el-icon :size="18"><View /></el-icon>
      </button>
    </el-tooltip>

    <!-- Main toggle -->
    <el-tooltip content="切换到主页面" placement="left" effect="dark">
      <button class="chat-toggle-float-btn is-chat-active" @click="goToMainPage">
        <el-icon :size="20"><Switch /></el-icon>
      </button>
    </el-tooltip>
  </div>
</template>

<script>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Switch, Cpu, Position, MagicStick, TrendCharts, Aim, DataAnalysis,
  Link, Document, View, ChatDotRound, List, Monitor
} from '@element-plus/icons-vue'
import { marked } from 'marked'
import ChatSidebar from './ChatSidebar.vue'
import UraniumExpertEvidence from './components/UraniumExpertEvidence.vue'
import PostReviewWorkspace from '@/components/SCnet/PostReviewWorkspace.vue'
import PostReviewBrief from '@/components/SCnet/PostReviewBrief.vue'
import logoUrl from '@/assets/images/logo.png'
import { useScenarioStore } from '@/stores/scenario'
import { useScnetScenarioStore } from '@/stores/scnet/useScenarioStore'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useUraniumDuringStore } from '@/stores/scnet/useUraniumDuringStore'
import { URANIUM_EXPERT_SKILLS } from '@/utils/uraniumExpertSkills'
import { streamUraniumExpertChat, streamUraniumRequirementChat } from './mock/uraniumExpertChat'
import { readUraniumConversations, saveUraniumConversation, removeUraniumConversation } from '@/utils/uraniumChatHistory'
import { SCENARIO_VALUES, SCENARIO_LABELS } from '@/constants/scnetScenario'
import { getPresetQuestions, PHASE_SHORT_LABELS } from '@/constants/scnetPresetQuestions'
import { writeScnetPhase } from '@/constants/scnetPhase'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { toolDisplayName as toolLabelOf } from '@/constants/scnetToolLabels'
import { unwrapApiData } from '@/utils/session'
import { inferAutoPhase } from '@/utils/phaseInfer'
import { PLAN_QUERY_KEY, PLAN_CONTROL_LABEL, composePlanPurpose, newExperimentPlanId, saveExperimentPlan, savePlanTranscript, saveConversationTranscript, readLatestExperimentPlan, describePlanLevers } from '@/constants/scnetExperimentPlan'
import { loadCounterfactualReport } from '@/utils/counterfactualReport'
import { getSessions, getSessionDetail, createSession, addChatMessage } from '@/api/scenarioSession'
import { startAgentChat, streamAgentTask, cancelAgentTask, getAgentModels, getAgentConversations, getAgentConversation, markConversationPdf } from '@/api/scnet/chatAgent'

const SPINNER_GLYPHS = ['✽', '✢', '✦', '✧']
// 参考 MACE 对话页：推演中的动词随机轮换，配合阶段色流光
const SPINNER_VERBS = ['推演中', '演算中', '筹划中', '编排中', '调度中', '聚合中', '稽核中', '厘定中', '甄别中', '穷理中', '索隐中', '探赜中']
const PHASE_COLORS = { auto: '#4d6beb', pre: '#0ea5e9', during: '#f97316', post: '#8b5cf6' }

// 三部分 section(§74)
const SECTION_ORDER = ['一', '二', '三']
const SECTION_LABELS = { 一: '① 事实梳理', 二: '② 风险评估', 三: '③ 应对策略' }

// 工具 → 展示名 / 执行状态文案(§67-68, 与交接条共用, 见 @/constants/scnetToolLabels)
const TOOL_DISPLAY_NAMES = {
  ...Object.fromEntries(URANIUM_EXPERT_SKILLS.map(skill => [skill.id, skill.label])),
  skill: '加载研判技能',
  uranium_supply_overview: '供应概览',
  uranium_route_network: '路线网络',
  uranium_current_risk: '当前风险',
  uranium_osint_events: 'OSINT 事件',
  uranium_knowledge_search: '知识检索',
  uranium_scenario_analysis: '情景分析',
}
const TOOL_STATUS_TEXT = {
  skill: '正在制定分析计划',
  uranium_supply_overview: '正在筛选供应链数据',
  uranium_route_network: '正在读取供应路线',
  uranium_current_risk: '正在分析路线风险',
  uranium_osint_events: '正在读取最新 OSINT',
  uranium_knowledge_search: '正在检索知识库',
  uranium_scenario_analysis: '正在运行情景分析',
}

// K3-CHAT-2:三部分结果卡
const RESULT_CARDS = [
  { key: '一', label: '事实梳理' },
  { key: '二', label: '风险研判' },
  { key: '三', label: '策略方案' },
]

const MODE_OPTIONS = [
  { label: '智能识别', value: 'auto', icon: MagicStick },
  { label: '事前研判', value: 'pre', icon: TrendCharts },
  { label: '事中决策', value: 'during', icon: Aim },
  { label: '事后复盘', value: 'post', icon: DataAnalysis },
]
// 场景由用户手动切换，不再按输入关键词自动识别
const SCENARIO_OPTIONS = [
  { label: SCENARIO_LABELS[SCENARIO_VALUES.URANIUM], value: SCENARIO_VALUES.URANIUM, className: 'is-uranium' },
  { label: SCENARIO_LABELS[SCENARIO_VALUES.SUPPLY_CHAIN], value: SCENARIO_VALUES.SUPPLY_CHAIN, className: 'is-auto' },
]
const PLACEHOLDERS = {
  auto: '输入供应链事件或分析需求...',
  pre: '输入供需态势研判需求，例如：未来三年原料供需平衡分析...',
  during: '输入突发冲击或保供调度需求，例如：某矿山减产或需求激增应对方案...',
  post: '输入历史事件复盘需求，例如：某次供应链中断应对效果复盘...',
}
const EXEC_MODES = [
  { label: '问答模式', value: 'ask', icon: ChatDotRound, desc: '快速问答分析' },
  { label: '规划模式', value: 'plan', icon: List, desc: '先规划再执行' },
  { label: 'Agent模式', value: 'agent', icon: Monitor, desc: '多智能体协作执行' },
]
// 兜底模型列表：/api/agent/models 拉取失败时才用。
// 真实列表由 loadAgentModels() 从后端覆盖，并带上 provider_id 与"是否已配置 Key"。
const CHAT_MODELS = [
  { label: 'Qwen-Turbo', value: 'qwen::qwen-turbo', providerId: 'qwen', modelId: 'qwen-turbo', configured: true },
  { label: 'Qwen-Plus', value: 'qwen::qwen-plus', providerId: 'qwen', modelId: 'qwen-plus', configured: true },
  { label: 'Qwen-Max', value: 'qwen::qwen-max', providerId: 'qwen', modelId: 'qwen-max', configured: true },
]
export default {
  name: 'ChatHome',
  components: { ChatSidebar, UraniumExpertEvidence, PostReviewWorkspace, PostReviewBrief, Switch, Cpu, Position, MagicStick, TrendCharts, Aim, DataAnalysis, Link, Document, View, ChatDotRound, List, Monitor },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const scenarioStore = useScenarioStore()
    // 事中流程用的是 SCnet 场景建模 store（与全局的「铀/汽车」场景选择 store 不是同一个）
    const scnetScenarioStore = useScnetScenarioStore()
    const demoStore = useUraniumDemoStore()
    const uraniumStore = useUraniumDuringStore()
    const duringExperimentId = computed(() => String(route.query.experiment_id || '').trim())
    let requestVersion = 0
    const msgContainer = ref(null)
    const welcomeTextarea = ref(null)
    const chatTextarea = ref(null)
    const fileInput = ref(null)
    const debugPanelBody = ref(null)

    const messages = ref([])
    const inputText = ref('')
    const selectedModel = ref('qwen::qwen-turbo')
    // 模型选项（含 provider）由 loadAgentModels() 从后端覆盖
    const chatModels = ref(CHAT_MODELS)
    const isStreaming = ref(false)
    const currentConversationId = ref('')
    const conversations = ref([])
    const sidebarCollapsed = ref(false)
    const currentMode = ref('auto')
    const execMode = ref('ask')
    const attachments = ref([])
    const debugThinkingVisible = ref(false)
    const debugThinking = ref('')
    const spinnerGlyphIdx = ref(0)
    const spinnerVerb = ref(SPINNER_VERBS[0])
    const streamElapsed = ref(0)
    let streamStartedAt = 0
    let elapsedTimer = null
    let abortController = null
    let glyphTimer = null
    // K3-CHAT-1:Agent 执行面板状态
    const execPanelVisible = ref(false)
    const activeRun = ref(null) // {task_id, conversation_id, provider, model}
    const execTools = ref([]) // [{call_id, tool, status}]
    const execStatus = ref('')
    const execState = ref('idle') // idle | running | done | error
    const execSections = ref([])
    const execActiveTab = ref('steps')
    const activeEvidence = computed(() => messages.value.at(-1)?._expertEvidence || null)
    const activeDuringPlan = computed(() => messages.value.find(item => item.id === lastAnalysisMsgId.value)?._duringPlan || null)
    const sectionLabels = computed(() => activeRun.value?.phase === 'during'
      ? activeRun.value?.kind === 'requirement' ? { 一: '① 需求理解', 二: '② 建模安排', 三: '③ 下一步' } : { 一: '① 实验概况', 二: '② 年度指标', 三: '③ 决策建议' } : SECTION_LABELS)
    const resultCards = computed(() => activeRun.value?.phase === 'during'
      ? activeRun.value?.kind === 'requirement' ? [{ key: '一', label: '需求理解' }, { key: '二', label: '建模安排' }, { key: '三', label: '下一步' }] : [{ key: '一', label: '实验概况' }, { key: '二', label: '年度指标' }, { key: '三', label: '决策建议' }] : RESULT_CARDS)
    // 本次 Agent 任务的分析阶段(pre/during/post):决定执行面板标题,
    // 否则事后复盘时面板仍写着"事前态势研判"。
    const runPhase = ref('pre')
    // K2-FLOW:分析完成状态(用于导出PDF/进入可视化)
    const analysisSuccess = ref(false)
    const lastAnalysisMsgId = ref('')
    const pdfGenerating = ref(false)
    const pdfReady = ref(false)
    let agentStream = null

    const pdfStateText = computed(() => {
      if (pdfGenerating.value) return '正在生成报告…'
      if (pdfReady.value) return 'PDF 已生成(再次点击下载)'
      return '导出 PDF'
    })

    const currentModelOption = computed(() => chatModels.value.find(o => o.value === selectedModel.value) || null)
    const currentModelLabel = computed(() => {
      const m = currentModelOption.value
      if (!m) return selectedModel.value || '未选择模型'
      return m.configured === false ? `${m.label} · 未配置 Key` : m.label
    })
    const EXEC_PANEL_TITLES = {
      pre: '事前态势研判 · Agent 执行',
      during: '事中决策 · Agent 执行',
      post: '事后复盘 · Agent 执行'
    }
    const execPanelTitle = computed(() => EXEC_PANEL_TITLES[runPhase.value] || EXEC_PANEL_TITLES.pre)
    const spinnerGlyph = computed(() => SPINNER_GLYPHS[spinnerGlyphIdx.value] || '✽')
    const spinnerColor = computed(() => PHASE_COLORS[currentMode.value] || PHASE_COLORS.auto)
    const formatDuration = (s) => {
      const sec = Math.max(0, Math.floor(Number(s) || 0))
      if (sec < 60) return sec + 's'
      return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's'
    }
    const startStreamTimers = () => {
      stopStreamTimers()
      streamStartedAt = Date.now()
      streamElapsed.value = 0
      spinnerVerb.value = SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)]
      glyphTimer = setInterval(() => { spinnerGlyphIdx.value = (spinnerGlyphIdx.value + 1) % SPINNER_GLYPHS.length }, 180)
      elapsedTimer = setInterval(() => {
        streamElapsed.value = Math.floor((Date.now() - streamStartedAt) / 1000)
        if (streamElapsed.value > 0 && streamElapsed.value % 6 === 0) {
          spinnerVerb.value = SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)]
        }
      }, 1000)
    }
    const stopStreamTimers = () => {
      clearInterval(glyphTimer); glyphTimer = null
      clearInterval(elapsedTimer); elapsedTimer = null
    }
    const streamDurationSeconds = () => (streamStartedAt ? Math.max(1, Math.round((Date.now() - streamStartedAt) / 1000)) : 0)
    const modeIndex = computed(() => ({ auto: 0, pre: 1, during: 2, post: 3 }[currentMode.value] || 0))
    const inputPlaceholder = computed(() => PLACEHOLDERS[currentMode.value] || PLACEHOLDERS.auto)
    const currentExecMode = computed(() => EXEC_MODES.find(m => m.value === execMode.value) || EXEC_MODES[0])

    const goToMainPage = () => router.push('/home')
    const openExpertExperiment = () => router.push({ path: SCNET_ROUTES.experimentManager, query: {
      scenario: 'uranium', view: 'simulation', experiment_id: duringExperimentId.value,
    } })
    const openEvidenceDetail = (location) => router.push(location)
    const startIndependentDuring = () => {
      startNewConversation()
      router.replace({ path: SCNET_ROUTES.chatHome, query: { mode: 'during', scenario: 'uranium' } })
    }
    // 阶段与左侧菜单/流程步骤条共用 localStorage，选模式时同步写入，
    // 免得停在事前页却看到事中菜单（反之亦然）。
    const selectMode = (mode) => {
      if (isStreaming.value) return
      currentMode.value = mode
      if (mode === 'pre' || mode === 'during' || mode === 'post') writeScnetPhase(mode)
    }
    const applyModeFromRoute = (mode) => {
      const next = String(mode || '').trim()
      if (['pre', 'during', 'post'].includes(next)) selectMode(next)
    }
    // 恢复历史对话时一并恢复阶段:会话文档里没有存阶段字段,用最后一条用户问题按
    // auto 模式同一套口径反推。不这么做的话,事后复盘的对话重新打开会回落到事前,
    // 「实验方案设计」入口(以及执行面板的"事后复盘"标题)都会消失,用户找不到下一步。
    const restorePhaseFromHistory = (msgs) => {
      const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
      const phase = inferAutoPhase(lastUser ? lastUser.content : '')
      runPhase.value = phase
      selectMode(phase)
    }
    const selectScenario = (value) => { if (!isStreaming.value) scenarioStore.setScenario(value) }

    // 预设问题：跟随当前场景与阶段；智能识别模式下三阶段混排并标注阶段
    const presetQuestions = computed(() => currentMode.value === 'during' && duringExperimentId.value ? [
      { title: '定位保供缺口', icon: '📊', text: '当前实验哪一年需求缺口最大，应该怎样调整库存？', phase: 'during' },
      { title: '解读采购成本', icon: '📈', text: '当前实验的采购成本和价格如何变化？', phase: 'during' },
      { title: '追踪事件影响', icon: '🔎', text: '哪些事件对应主要风险窗口？请结合年度指标分析。', phase: 'during' },
      { title: '梳理决策依据', icon: '💡', text: '请汇总当前实验的决策建议及对应依据。', phase: 'during' },
    ] : getPresetQuestions(scenarioStore.currentScenario, currentMode.value))
    const presetTitle = computed(() => {
      const modeLabel = currentMode.value === 'auto' ? '' : (MODE_OPTIONS.find(o => o.value === currentMode.value)?.label || '')
      return `${scenarioStore.label}${modeLabel ? ' · ' + modeLabel : ''} · 试试这样问`
    })
    const applyPreset = (q) => {
      if (!q) return
      // 智能识别下点了带阶段的预设，顺带切到对应阶段，后续跳转才落到正确页面
      if (currentMode.value === 'auto' && q.phase) selectMode(q.phase)
      inputText.value = q.text
      nextTick(() => {
        autoResizeWelcome()
        welcomeTextarea.value?.focus()
      })
    }
    const openKnowledge = () => router.push('/chatKnowledge')

    const handleModeGlassPointer = (event) => {
      const t = event.currentTarget; const r = t.getBoundingClientRect()
      t.style.setProperty('--glass-x', `${Math.max(0, Math.min(100, ((event.clientX - r.left) / r.width) * 100)).toFixed(1)}%`)
      t.style.setProperty('--glass-y', `${Math.max(0, Math.min(100, ((event.clientY - r.top) / r.height) * 100)).toFixed(1)}%`)
    }
    const resetModeGlassPointer = (e) => { e.currentTarget.style.setProperty('--glass-x', '18%'); e.currentTarget.style.setProperty('--glass-y', '0%') }

    const triggerFileInput = () => fileInput.value?.click()
    const handleFileChange = (e) => {
      const files = Array.from(e.target.files || [])
      for (const file of files) {
        const reader = new FileReader()
        reader.onload = (ev) => attachments.value.push({ name: file.name, type: file.type, size: file.size, data: ev.target.result, preview: file.type.startsWith('image/') ? ev.target.result : null })
        reader.readAsDataURL(file)
      }
      e.target.value = ''
    }
    const removeAttachment = (idx) => attachments.value.splice(idx, 1)

    const autoResizeWelcome = () => { const el = welcomeTextarea.value; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px' } }
    const autoResizeChat = () => { const el = chatTextarea.value; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px' } }
    const scrollToBottom = () => { nextTick(() => { const el = msgContainer.value; if (el) el.scrollTop = el.scrollHeight }) }

    // ── 历史会话列表加载(稳定化:失败不清空 + stale 请求防覆盖) ──
    // 语义: 成功(HTTP200,即使空[])才写 conversations;timeout/500/网络错误一律保留旧列表。
    const historyLoading = ref(false)
    const historyLoaded = ref(false)
    const historyError = ref(false)
    let historyRequestSeq = 0
    const apiBody = (resp) => (resp && typeof resp === 'object' && resp.data && typeof resp.data === 'object') ? resp.data : resp
    const asArray = (value) => Array.isArray(value) ? value : []
    const normalizeAgentConversations = (resp) => {
      const body = apiBody(resp) || {}
      return asArray(body.conversations || body.items || body.list || body.records)
    }
    const normalizeScenarioSessions = (resp) => {
      const body = apiBody(resp) || {}
      return asArray(body.sessions || body.items || body.list || body.records)
    }

    const fetchConversations = async () => {
      const requestId = ++historyRequestSeq
      if (currentMode.value === 'during') {
        conversations.value = readUraniumConversations()
        historyLoaded.value = true
        historyError.value = false
        historyLoading.value = false
        return conversations.value
      }
      const oldCount = conversations.value.length
      console.log(`[History Fetch Start] rid=${requestId} currentCount=${oldCount} t=${Date.now()}`)
      historyLoading.value = true
      try {
        let agList = []
        let sessList = []
        let agentError = null
        let sessionError = null
        try {
          const agResp = await getAgentConversations()
          agList = normalizeAgentConversations(agResp)
        } catch (err) {
          agentError = err
          console.warn(`[History] rid=${requestId} agent request FAIL`, err && err.message)
        }
        if (requestId !== historyRequestSeq) {
          console.log(`[History Fetch Ignored Stale] rid=${requestId}`)
          return conversations.value
        }
        try {
          const s = await getSessions()
          sessList = normalizeScenarioSessions(s)
        } catch (err) {
          sessionError = err
          console.warn(`[History] rid=${requestId} sessions request FAIL`, err && err.message)
        }
        if (requestId !== historyRequestSeq) {
          console.log(`[History Fetch Ignored Stale] rid=${requestId}`)
          return conversations.value
        }
        if (agentError && sessionError) throw agentError
        const byId = {}
        ;(sessList || []).forEach(x => { byId[x.session_id] = { id: x.session_id, source: 'scenario', title: x.requirement_text || '新对话', created_at: x.timestamp, updated_at: x.timestamp } })
        ;(agList || []).forEach(x => { byId[x.conversation_id] = { id: x.conversation_id, source: 'agent', title: x.title || x.last_user_message || '新对话', created_at: x.created_at, updated_at: x.updated_at, message_count: x.message_count, latest_analysis_id: x.latest_analysis_id } })
        const next = Object.values(byId).sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''))
        console.log(`[History Fetch Success] rid=${requestId} serverCount=${next.length}`)
        console.log(`[History Mutation] fetch.assign ${oldCount} -> ${next.length} (rid=${requestId})`)
        conversations.value = next
        historyLoaded.value = true
        historyError.value = false
        return next
      } catch (err) {
        if (requestId !== historyRequestSeq) {
          console.log(`[History Fetch Ignored Stale] rid=${requestId}`)
          return conversations.value
        }
        // 失败:不清空。已加载过 → 保留旧列表;从未成功 → 置 error(侧栏显示加载失败,而非"暂无对话")
        console.log(`[History Fetch Failed] rid=${requestId} error=${(err && err.message) || String(err)}`)
        historyError.value = true
        console.log(`[History Mutation] fetch.keep-old ${oldCount} -> ${oldCount} (错误不覆盖 rid=${requestId})`)
        throw err
      } finally {
        if (requestId === historyRequestSeq) historyLoading.value = false
      }
    }
    // 保留既有追踪 watcher
    watch(conversations, (v, o) => {
      console.log(`[History watcher] count ${o && o.length} -> ${v && v.length} at=${Date.now()}`)
    }, { flush: 'sync' })
    // 本地 upsert 当前会话(发送后立即置顶/更新,不依赖网络;以 conversation_id 去重)
    const upsertLocalConversation = (convId, title) => {
      if (!convId) return
      const now = new Date().toISOString()
      const list = conversations.value.slice()
      const idx = list.findIndex(c => c.id === convId)
      const oldCount = list.length
      if (idx >= 0) {
        // 只合并更新,不覆盖服务器已有对象(source/服务端 id/created_at 保留)
        list[idx] = { ...list[idx], title: title || list[idx].title || '新对话', updated_at: now }
      } else {
        // 新会话刚 createSession → scenario 会话;agent doc 持久化后刷新会以真实对象替换
        list.unshift({ id: convId, source: 'scenario', title: title || '新对话', created_at: now, updated_at: now })
      }
      console.log(`[History Mutation] local-upsert ${oldCount} -> ${list.length} id=${convId}`)
      conversations.value = list
    }
    // 静默后台刷新(Agent 完成/阶段切换后调用):失败仅 warn,绝不把已有列表清空
    const refreshHistorySilently = () => {
      fetchConversations().catch(() => {
        // fetchConversations 内部已保留旧列表
      })
    }
    const retryHistory = () => refreshHistorySilently()
    const startNewConversation = () => {
      abortStream()
      messages.value = []; currentConversationId.value = ''; inputText.value = ''; isStreaming.value = false
      attachments.value = []; debugThinking.value = ''
      execPanelVisible.value = false; activeRun.value = null
      execTools.value = []; execSections.value = []; execStatus.value = ''; execState.value = 'idle'
      analysisSuccess.value = false; lastAnalysisMsgId.value = ''; pdfReady.value = false
      persistActiveConv('')
      nextTick(() => welcomeTextarea.value?.focus())
    }
    const httpStatus = (e) => (e && (e.status || (e.response && e.response.status))) || 0
    const pushDetailMessage = (text) => { messages.value = []; messages.value.push({ id: 'err' + Date.now(), role: 'assistant', content: text }) }
    const renderScenarioMessages = (detail) => {
      const hist = detail?.chat_history || []
      const req = detail?.requirement
      const qRaw = typeof req === 'string' ? req : (req && (req.raw_input || req.goal))
      const qText = typeof qRaw === 'string' && qRaw.trim() ? qRaw.trim() : ''
      const ar = detail?.analysis_result
      const bodyText = (typeof ar === 'string' && ar.trim()) ? ar.trim() : ''
      if (hist.length) {
        messages.value = hist.map((m, i) => ({
          id: m.id || `h${i}`, role: m.type === 'user' ? 'user' : 'assistant', content: m.content || ''
        }))
      } else if (qText || bodyText) {
        const ms = []
        if (qText) ms.push({ id: 's-q-' + Date.now(), role: 'user', content: qText })
        ms.push({ id: 's-a-' + Date.now(), role: 'assistant',
                  content: bodyText || '（该历史会话为早期需求记录：仅保存了原始问题，恢复审计未发现当时保存的分析正文，未重新生成。）' })
        messages.value = ms
      } else {
        // 记录存在但无正文:诚实说明,绝不显示"已失效"
        messages.value = []
        messages.value.push({ id: 's-empty-' + Date.now(), role: 'assistant',
          content: '该历史会话记录为空：经审计未发现当时保存的分析正文（当时未生成或未落盘），未重新生成。' })
      }
      execState.value = 'done'; execStatus.value = '历史对话加载成功(scenario 会话)'
      restorePhaseFromHistory(messages.value)
      scrollToBottom()
    }

    const loadConversation = async (convId) => {
      abortStream()
      const saved = readUraniumConversations().find(item => item.id === convId)
      if (saved) {
        currentConversationId.value = saved.id
        persistActiveConv(saved.id)
        messages.value = saved.messages
        selectMode('during')
        scenarioStore.setScenario('uranium')
        await router.replace({ path: SCNET_ROUTES.chatHome, query: { mode: 'during', scenario: 'uranium', experiment_id: saved.experiment_id } })
        const last = [...messages.value].reverse().find(item => (item._expertEvidence || item._duringPlan) && !item._error)
        lastAnalysisMsgId.value = last?.id || ''
        analysisSuccess.value = !!last
        activeRun.value = { phase: 'during', kind: last?._duringPlan ? 'requirement' : 'experiment', conversation_id: saved.id }
        execPanelVisible.value = true
        execState.value = 'done'; execStatus.value = last?._duringPlan ? '需求分析已恢复' : '实验解读已恢复'
        execTools.value = (last?._expertEvidence.results || []).map(item => ({ call_id: item.skill, tool: item.skill, status: 'done' }))
        execSections.value = last ? [...SECTION_ORDER] : []
        scrollToBottom()
        return
      }
      // K2-PERSIST:优先读 agent conversation doc(完整消息+结构化元数据),不重新执行 Agent;
      // 按列表条目 source 路由:agent→agent detail;scenario→scenario detail。仅后端 404/410 才提示"已失效"。
      currentConversationId.value = convId
      persistActiveConv(convId)
      execPanelVisible.value = true
      execState.value = 'done'; execStatus.value = '正在加载历史对话…'
      const entry = conversations.value.find(c => c.id === convId)
      const source = entry && entry.source
      const tryScenario = async () => {
        try {
          const sess = await getSessionDetail(convId)
          const detail = apiBody(sess)
          if (detail && (detail.session_id || Array.isArray(detail.chat_history))) {
            renderScenarioMessages(detail)
            return true
          }
        } catch (e2) { /* 由调用方统一分类 */ }
        return false
      }
      // scenario 记录(仅存在 scenario session,无 agent doc)只走 scenario detail
      if (source === 'scenario') {
        const ok = await tryScenario()
        if (!ok) pushDetailMessage('该历史对话不存在或已失效。')
        return
      }
      // agent / 未知:agent detail 优先;404/410 时降级 scenario
      try {
        const d = await getAgentConversation(convId)
        const doc = apiBody(d)
        if (doc && Array.isArray(doc.messages) && doc.messages.length) {
          const msgs = doc.messages.map(m => {
            const isUser = m.role === 'user'
            const isJudgment = !isUser && m.message_type === 'judgment'
            return {
              id: m.message_id || 'h' + Math.random(),
              role: isUser ? 'user' : 'assistant',
              content: m.content || '',
              _streaming: false,
              _meta: { message_type: m.message_type, analysis_id: m.analysis_id,
                       snapshot_id: m.snapshot_id, sections: m.sections || [],
                       tools: m.tools || [], pdf_status: m.pdf_status || 'none' },
            }
          })
          messages.value = msgs
          restorePhaseFromHistory(msgs)
          // 恢复最近研判状态(分析完成/PDF/可视化入口)
          const lastJ = [...msgs].reverse().find(m => m.role === 'assistant' && m._meta && m._meta.message_type === 'judgment')
          if (lastJ && lastJ.content) {
            analysisSuccess.value = true
            lastAnalysisMsgId.value = lastJ.id
            execState.value = 'done'; execStatus.value = '研判完成(历史)'
            execSections.value = (lastJ._meta.sections || [])
            pdfReady.value = (lastJ._meta.pdf_status === 'ready')
            execPanelVisible.value = true
          }
          scrollToBottom()
          return
        }
        // agent doc 存在但空(异常)或旧 scenario session
        const ok = await tryScenario()
        if (!ok) pushDetailMessage('该历史对话不存在或已失效。')
      } catch (e) {
        const code = httpStatus(e)
        const ok = await tryScenario()
        if (ok) return
        if (code === 404 || code === 410) {
          pushDetailMessage('该历史对话不存在或已失效。')
          return
        }
        // timeout/5xx/网络错误 = 加载失败,不清空旧状态、不判失效,允许再次点击重试
        console.warn('[History] 详情加载失败(非404),可重试 code=' + code, e && e.message)
        pushDetailMessage('历史对话加载失败,请稍后重试。')
      }
    }
    // K2-PERSIST:持久化当前会话 id(localStorage),供跨页/刷新恢复
    const ACTIVE_CONV_KEY = 'scnet_active_conversation_id'
    const persistActiveConv = (id) => { try { localStorage.setItem(ACTIVE_CONV_KEY, id || '') } catch (_) {} }
    // 后端没有删除/重命名会话的接口，这里只动本地列表（刷新后回到后端的真实列表）
    const handleDeleteConversation = async (convId) => {
      removeUraniumConversation(convId)
      conversations.value = conversations.value.filter(c => c.id !== convId)
      if (currentConversationId.value === convId) startNewConversation()
    }
    const handleBatchDelete = async (ids) => { for (const id of ids) await handleDeleteConversation(id) }
    const handleRenameConversation = async ({ id, title }) => {
      const conv = conversations.value.find(c => c.id === id)
      if (conv) conv.title = title
      const saved = readUraniumConversations().find(item => item.id === id)
      if (saved) saveUraniumConversation({ ...saved, title })
    }

    // 事中：把问题当作本次推演的需求，建会话 + 写入 SCnet 场景 store。
    // 铀场景先落到「建模设定」展示 Agent 设定与数量，再由该页带着 fresh=1 进入「想定生成分析」
    // （fresh=1 会在想定生成页发起首轮需求判断与目标拆解）。
    // 汽车场景的想定生成是 5 步向导，另有自己的 store，这里只把问题带过去预填。
    const enterDuringFlow = async (sid, text, scenario) => {
      writeScnetPhase('during')
      scnetScenarioStore.commitStepResult('goal-input', {
        sessionId: sid,
        userGoal: text,
        requirementMeta: {
          analysis_phase: 'during',
          raw_input: text,
          model_name: selectedModel.value || 'qwen-turbo',
          is_legal: false
        }
      })
      if (scenario === 'uranium') {
        return router.push({ path: SCNET_ROUTES.modelingSetup, query: { scenario, fresh: '1' } })
      }
      // 汽车想定生成仍是原来的 5 步向导（另一套 store / 旧接口），这里只把问题带过去预填
      return router.push({ path: SCNET_ROUTES.scenarioModeling, query: { scenario, q: text } })
    }

    // 事后：不落入事前的态势分析页，直接进入「事后」入口（反事实实验），
    // 与 total.vue 的事后入口保持一致。
    const enterPostFlow = (scenario) => {
      writeScnetPhase('post')
      return router.push({
        path: SCNET_ROUTES.counterfactualExperiment,
        query: { scenario }
      })
    }

    // 事前 / 智能识别：带着问题跳到态势分析。
    const enterSituationAnalysis = (sid, text, scenario) => {
      if (currentMode.value === 'post') return enterPostFlow(scenario)
      writeScnetPhase('pre')
      return router.push({
        path: SCNET_ROUTES.situationAnalysis,
        query: { session_id: sid, scenario, message: text }
      })
    }

    const handleSend = async () => {
      const text = inputText.value.trim()
      // 场景以用户在首页手动选择的为准（scenarioStore.currentScenario），不再按关键词自动切换
      // 保存用户问题，供报告生成等页面使用
      if (text) scenarioStore.setLastUserMessage(text)
      if ((!text && attachments.value.length === 0) || isStreaming.value) return

      // 当前阶段透传给后端 Agent：事后复盘必须带 post，
      // 否则后端按事前研判的提示词与工具集回答，答案与用户意图不符。
      // 智能识别(auto)下没有用户选定的阶段，按问题意图推断：归因/机理/反事实类问题
      // 走事后闭环（确认实验目的 → 设计实验方案 → 反事实实验 → 三阶段分析），
      // 其余仍按事前研判。显式选过模式的，一律以用户选择为准，不被推断覆盖。
      const currentAgentPhase = () => {
        if (currentMode.value === 'during' || currentMode.value === 'post' || currentMode.value === 'pre') {
          return currentMode.value
        }
        return inferAutoPhase(text)
      }

      // K3-CHAT-1:事前/智能识别/事后不再跳需求分析页,在对话首页内 Agent 研判。
      // 铀场景的事中需求先在本页生成分析，用户确认后再进入建模。
      const isDuring = currentMode.value === 'during'
      const isExpertQuestion = isDuring && scenarioStore.currentScenario === 'uranium' && !!duringExperimentId.value
      const version = ++requestVersion
      // 阶段只在这里解析一次：占位文案、后端 phase、落地页去向都用同一份判断
      const agentPhase = currentAgentPhase()
      const fileInfo = attachments.value.length > 0 ? '\n[附件: ' + attachments.value.map(a => a.name).join(', ') + ']' : ''
      inputText.value = ''; attachments.value = []
      messages.value.push({ id: 'u' + Date.now(), role: 'user', content: text + fileInfo })

      // 事后阶段第一步是「确认实验目的」:先把目标复述清楚并按三个分析拆解,再让 Agent 展开研判
      if (agentPhase === 'post') {
        if (GOAL_CONFIRM_PATTERN.test(text)) {
          planPurposeConfirmed.value = true
          if (!planPurpose.value) planPurpose.value = derivePlanPurpose()
          messages.value.push({
            id: 'a' + Date.now(),
            role: 'assistant',
            content: '实验目的已确认。下一步进入「实验方案设计」，配置干预变量、目标指标与观测轮次；保存后即可运行反事实实验。'
          })
          persistChatTranscript()
          scrollToBottom()
          return
        }
        planPurposeConfirmed.value = false
        messages.value.push({
          id: 'g' + Date.now(),
          role: 'assistant',
          content: '',
          goalBrief: composeGoalBrief(text)
        })
      }

      messages.value.push({
        id: 'a' + Date.now(),
        role: 'assistant',
        content: isDuring ? ''
          : agentPhase === 'post'
            ? '📈 正在进入事后复盘（反事实实验）...'
            : '🔍 正在建立会话并进入态势分析...',
        _streaming: true,
        // 占位文案不是答案：首个 text_delta 到达时丢弃，出错时也可被错误信息替换
        _placeholder: true
      })
      isStreaming.value = true
      scrollToBottom()
      startStreamTimers()
      try {
        // 结果追问使用 Agent 会话；只读技能先取得指定实验，不新建想定或启动实验。
        if (isExpertQuestion) {
          await runAgentChat(text, currentConversationId.value || null, { phase: 'during', version })
          return
        }
        if (isDuring && scenarioStore.currentScenario === 'uranium') {
          runDuringRequirementChat(version)
          return
        }
        let sid = currentConversationId.value
        if (sid) {
          // 复用已打开的历史会话，把这条追问补进会话记录
          await addChatMessage(sid, { type: 'user', content: text })
        } else {
          const d = await createSession(text)
          sid = unwrapApiData(d)?.session_id || ''
          if (!sid) throw new Error('后端未返回 session_id')
          currentConversationId.value = sid
          persistActiveConv(sid)
        }
        const sc = scenarioStore.currentScenario || 'uranium'
        // 本地 upsert:发送后当前会话立即置顶(不阻塞、不依赖历史 API),避免启动瞬间全量拉取挂起
        upsertLocalConversation(sid, text.slice(0, 40))
        if (isDuring) {
          await enterDuringFlow(sid, text, sc)
        } else {
          // 不跳页:在本对话页内运行 Agent 研判
          await runAgentChat(text, sid, agentPhase)
        }
      } catch (e) {
        messages.value.pop()
        messages.value.push({ id: 'a' + Date.now(), role: 'assistant', content: `会话创建失败：${e.message}` })
        execState.value = 'error'; execStatus.value = '会话创建失败'
      }
      // Agent 流式任务由 handleAgentEvent 的 complete/error 收尾；只有非流式路径在这里立即收尾
      if (!agentStream && version === requestVersion) {
        stopStreamTimers()
        isStreaming.value = false
      }
      persistChatTranscript()
      scrollToBottom()
    }

    const runDuringRequirementChat = (version) => {
      const lastMsg = messages.value.at(-1)
      const previousPlan = [...messages.value].reverse().find(item => item._duringPlan)?._duringPlan
      const sessionId = previousPlan?.sessionId || `during-session-${Date.now()}`
      const conversationId = currentConversationId.value.startsWith('during-chat-') ? currentConversationId.value : `during-chat-${Date.now()}`
      const userGoal = messages.value.filter(item => item.role === 'user').map(item => item.content).join('\n补充要求：')
      currentConversationId.value = conversationId
      persistActiveConv(conversationId)
      activeRun.value = { phase: 'during', kind: 'requirement', conversation_id: conversationId }
      execPanelVisible.value = true
      execActiveTab.value = 'steps'
      execTools.value = []; execSections.value = []
      execState.value = 'running'; execStatus.value = '正在整理需求…'
      analysisSuccess.value = false; lastAnalysisMsgId.value = ''; pdfReady.value = false
      agentStream = streamUraniumRequirementChat({
        userGoal, sessionId, draft: { ...uraniumStore.draft },
        onPlan: plan => { if (version === requestVersion) lastMsg._duringPlan = plan },
        onEvent: event => { if (version === requestVersion) handleAgentEvent(event, lastMsg) },
      })
    }

    // 对话快照按会话 id 存一份：从侧边栏或平台进方案设计页时，方案 id 对得上但只有会话能认出这段对话
    // 一次运行里 currentConversationId 与 activeRun.conversation_id 可能不同，两个都存
    const transcriptConversationIds = () => {
      const ids = [currentConversationId.value, activeRun.value && activeRun.value.conversation_id]
      return [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))]
    }
    const persistChatTranscript = () => {
      transcriptConversationIds().forEach((id) => saveConversationTranscript(id, messages.value))
    }

    // ── K3-CHAT-1:对话首页 Agent 事前研判 ──────
    /**
     * 模型选项来自后端 /api/agent/models，并带上「该 provider 是否已配置 Key」。
     * 此前这里是写死的三个 Qwen 模型、且请求不带 provider_id —— 后端会回落到
     * DEFAULT_PROVIDER(qwen)，所以 qwen 没 Key 时在界面上怎么换模型都救不回来。
     */
    const loadAgentModels = async () => {
      try {
        const res = await getAgentModels()
        const payload = unwrapApiData(res) || {}
        const providers = payload.providers || []
        const options = []
        providers.forEach((p) => {
          const models = Array.isArray(p.models) ? p.models.filter(Boolean) : []
          // 老后端没有该字段时不误判为"未配置"
          const configured = p.api_key_configured !== false
          models.forEach((m) => options.push({
            value: `${p.provider_id}::${m}`,
            providerId: p.provider_id,
            modelId: m,
            label: `${p.display_name || p.provider_id} · ${m}`,
            configured
          }))
        })
        if (!options.length) return
        chatModels.value = options
        // 默认选中:优先跟随后端生效的默认 provider(LLM_PROVIDER 环境变量),
        // 其次任一已配置 Key 的 provider —— 前端不自己猜默认值,猜错就会在
        // 没配 Key 的 provider 上开局,撞出"模型服务调用失败"。
        const preferred = options.find((o) => o.providerId === payload.default_provider && o.configured)
        const keep = options.find((o) => o.value === selectedModel.value && o.configured)
        if (!keep) selectedModel.value = (preferred || options.find((o) => o.configured) || options[0]).value
      } catch (e) {
        console.warn('加载 agent 模型列表失败，使用兜底列表:', e?.message)
      }
    }

    const runAgentChat = async (text, sid, options = 'pre') => {
      const phase = typeof options === 'string' ? options : (options?.phase || 'pre')
      const version = typeof options === 'object' && options?.version ? options.version : requestVersion
      // lastMsg 必须先声明:下面"未配置 Key"的分支会提前 return 并写回错误气泡
      const lastMsg = messages.value[messages.value.length - 1]
      const chosen = currentModelOption.value
      if (chosen && chosen.configured === false) {
        execState.value = 'error'
        execStatus.value = `${chosen.label} 未配置 API Key`
        failAssistantMessage(lastMsg, `当前模型 ${chosen.label} 未在后端配置 API Key；请配置对应环境变量后重启后端，或在上方切换到已配置的模型`)
        return
      }
      runPhase.value = phase
      execPanelVisible.value = true
      execTools.value = []; execSections.value = []
      execActiveTab.value = 'steps'
      execState.value = 'running'; execStatus.value = '正在启动 Agent 任务…'
      analysisSuccess.value = false; lastAnalysisMsgId.value = ''; pdfReady.value = false
      activeRun.value = { phase }
      if (lastMsg) lastMsg.content = ''
      try {
        if (phase === 'during') {
          const conversationId = sid?.startsWith('during-chat-') ? sid : `during-chat-${Date.now()}`
          currentConversationId.value = conversationId
          persistActiveConv(conversationId)
          upsertLocalConversation(conversationId, text.slice(0, 40))
          activeRun.value = { phase, conversation_id: conversationId }
          agentStream = streamUraniumExpertChat({
            experimentId: duringExperimentId.value,
            question: text,
            readExperiment: async (id) => {
              await demoStore.ensureInitialized()
              return demoStore.getExperiment(id)
            },
            onEvidence: evidence => { if (version === requestVersion) lastMsg._expertEvidence = evidence },
            onEvent: ev => {
              if (version === requestVersion) handleAgentEvent(ev, lastMsg)
            },
          })
          return
        }
        const res = await startAgentChat({
          message: text,
          conversationId: sid,
          // provider 必须一起送：后端缺省会回落到 DEFAULT_PROVIDER(qwen)，
          // 只换模型名换不掉 provider。
          providerId: currentModelOption.value?.providerId || null,
          modelId: currentModelOption.value?.modelId || selectedModel.value,
          mode: 'agent',
          phase,
          // 场景跟着走:后端的实验证据工具按场景取最新实验
          scenario: scenarioStore.currentScenario || 'uranium',
        })
        const data = unwrapApiData(res) || res?.data || res || {}
        const taskId = data?.task_id
        if (!taskId) throw new Error(data?.message || 'Agent 任务启动失败')
        if (version !== requestVersion) {
          cancelAgentTask(taskId).catch(() => {})
          return
        }
        currentConversationId.value = data.conversation_id || sid || ''
        persistActiveConv(currentConversationId.value)
        upsertLocalConversation(currentConversationId.value, text.slice(0, 40))
        activeRun.value = {
          phase,
          task_id: taskId,
          conversation_id: data.conversation_id || sid,
          provider: data.provider,
          model: data.model,
        }
        execStatus.value = 'Agent 任务已启动,正在理解研判目标…'
        const stream = streamAgentTask({
          taskId,
          afterSeq: 0,
          onEvent: (ev) => { if (version === requestVersion) handleAgentEvent(ev, lastMsg) },
          onError: (err) => { if (version === requestVersion) handleAgentEvent({ type: 'error', message: (err && err.message) || String(err) }, lastMsg) },
          onClose: () => {
            if (version === requestVersion && isStreaming.value) handleAgentEvent({ type: 'error', message: '连接已结束，但未收到完成确认，请重试' }, lastMsg)
          },
        })
        agentStream = stream
      } catch (e) {
        if (version !== requestVersion) return
        execState.value = 'error'; execStatus.value = 'Agent 启动失败'
        if (lastMsg) { lastMsg.content = `❌ Agent 任务启动失败：${e.message}`; lastMsg._streaming = false; lastMsg._error = true }
      } finally {
        if (version === requestVersion && !agentStream) {
          stopStreamTimers()
          isStreaming.value = false
        }
      }
    }

    // 把错误原因写进对话气泡。旧实现用 `if (!lastMsg.content)` 判断，
    // 而气泡里本来就有「正在进入事后复盘…」占位文案，导致失败原因被静默吞掉。
    const failAssistantMessage = (msg, reason) => {
      if (!msg) return
      // 复用该气泡已记录的失败原因：complete 事件里 task.error 可能为 null，
      // 直接用兜底文案会追加一行无信息的「Agent 执行出错」。
      const effective = reason || msg._failReason || 'Agent 执行出错'
      const text = `❌ ${effective}`
      if (msg.content && msg.content.includes(text)) return // error / done / complete 都会触发，避免重复追加
      if (msg._placeholder || !msg.content) {
        msg.content = text
        msg._placeholder = false
      } else {
        msg.content += `\n\n${text}`
      }
      msg._streaming = false
      // 记在消息上：后续 done / complete 事件要据此判断本次研判是失败的
      msg._failed = true
      msg._failReason = reason || ''
    }

    const handleAgentEvent = (ev, lastMsg) => {
      const type = ev.type
      if (type === 'status') {
        execStatus.value = ev.status || execStatus.value
      } else if (type === 'tool_call') {
        execTools.value.push({ call_id: ev.call_id, tool: ev.tool, status: 'running' })
        execStatus.value = ev.tool === 'skill'
          ? '正在制定分析计划…'
          : (TOOL_STATUS_TEXT[ev.tool] || `正在调用 ${toolDisplayName(ev.tool)}`)
      } else if (type === 'tool_result') {
        const t = execTools.value.find(x => x.call_id === ev.call_id)
        if (t) t.status = ev.status === 'error' ? 'error' : 'done'
      } else if (type === 'text_delta') {
        if (lastMsg) {
          // 首个增量到达即丢弃占位文案，否则「正在…」会一直挂在答案前面
          if (lastMsg._placeholder) { lastMsg.content = ''; lastMsg._placeholder = false }
          lastMsg.content += ev.content
          scrollToBottom()
        }
      } else if (type === 'section') {
        if (!execSections.value.includes(ev.section)) {
          execSections.value.push(ev.section)
          if (execSections.value.length >= 3) execStatus.value = '研判方案已生成'
        }
      } else if (type === 'phase') {
        if (ev.phase === 'output') execStatus.value = '正在生成研判方案…'
      } else if (type === 'done') {
        stopStreamTimers()
        isStreaming.value = false
        // 模型调用失败时后端仍会补发 done{reason:'llm_error'}，任务终态随之变成 completed，
        // 只看 done/complete 会把失败显示成「研判完成」，这里用 reason 与消息失败标记兜住。
        if (ev.reason === 'llm_error' || (lastMsg && lastMsg._failed)) {
          execState.value = 'error'
          execStatus.value = (lastMsg && lastMsg._failReason) || execStatus.value || '模型服务调用失败'
          analysisSuccess.value = false
          lastAnalysisMsgId.value = ''
        } else {
          execState.value = 'done'; execStatus.value = '研判完成'
          if (lastMsg) { lastMsg._streaming = false; lastMsg._completedDuration = lastMsg._completedDuration || streamDurationSeconds() }
        }
      } else if (type === 'complete') {
        // 后端在任务终态（含 error / cancelled）都会补发 complete，
        // 不能一律当成研判成功：否则调用失败也显示「研判完成」并给出导出 PDF / 进入可视化入口。
        const taskStatus = ev.task && ev.task.status
        const taskError = (ev.task && ev.task.error) || ''
        const runFailed = taskStatus === 'error' || !!(lastMsg && lastMsg._failed)
        if (agentStream) { try { agentStream.close() } catch {} ; agentStream = null }
        stopStreamTimers()
        isStreaming.value = false
        if (lastMsg) {
          lastMsg._streaming = false
          lastMsg._completedDuration = streamDurationSeconds()
        }
        if (runFailed) {
          execState.value = 'error'
          execStatus.value = taskError || (lastMsg && lastMsg._failReason) || execStatus.value || '执行出错'
          analysisSuccess.value = false; lastAnalysisMsgId.value = ''
          failAssistantMessage(lastMsg, taskError)
        } else if (taskStatus === 'cancelled') {
          execState.value = 'done'; execStatus.value = '已取消'
          analysisSuccess.value = false; lastAnalysisMsgId.value = ''
        } else {
          execState.value = 'done'; execStatus.value = '研判完成'
          // K2-FLOW:只有真实流式内容才算研判成功（占位文案不算）
          if (lastMsg && lastMsg.content && !lastMsg._placeholder) {
            analysisSuccess.value = true
            lastAnalysisMsgId.value = lastMsg.id
          }
        }
        }
        // Agent 完成:后台同步真实列表(title/updated_at/新会话);失败不影响当前列表
        if (activeRun.value?.phase === 'during') {
          const existing = readUraniumConversations().find(item => item.id === currentConversationId.value)
          saveUraniumConversation({
            id: currentConversationId.value, source: 'during',
            experiment_id: lastMsg?._expertEvidence?.experiment_id || duringExperimentId.value,
            title: existing?.title || messages.value.find(item => item.role === 'user')?.content?.slice(0, 40) || '实验解读',
            created_at: existing?.created_at || new Date().toISOString(), updated_at: new Date().toISOString(),
            messages: messages.value.map(item => ({ ...item, _streaming: false })),
          })
          fetchConversations()
        } else setTimeout(() => { refreshHistorySilently() }, 600)
      } else if (type === 'cancelled') {
        execState.value = 'done'; execStatus.value = '已取消'
        analysisSuccess.value = false
        if (agentStream) { try { agentStream.close() } catch {} ; agentStream = null }
        stopStreamTimers(); isStreaming.value = false
        if (lastMsg) lastMsg._streaming = false
      } else if (type === 'error') {
        execState.value = 'error'; execStatus.value = ev.message || '执行出错'
        analysisSuccess.value = false; lastAnalysisMsgId.value = ''
        if (agentStream) { try { agentStream.close() } catch {} ; agentStream = null }
        stopStreamTimers(); isStreaming.value = false
        if (lastMsg) { lastMsg._streaming = false; lastMsg._error = true }
        failAssistantMessage(lastMsg, ev.message)
      }
    }

    // 失败消息可一键重试：取回对应的用户问题重新提交
    const retryMessage = (msg) => {
      if (isStreaming.value) return
      const idx = messages.value.findIndex(m => m.id === msg.id)
      if (idx < 0) return
      let userIdx = idx - 1
      while (userIdx >= 0 && messages.value[userIdx].role !== 'user') userIdx -= 1
      if (userIdx < 0) return
      const question = messages.value[userIdx].content.replace(/\n\[附件:.*\]$/, '')
      messages.value.splice(userIdx, idx - userIdx + 1)
      inputText.value = question
      handleSend()
    }

    // ── K2-FLOW:导出PDF(从当前研判内容生成,不跳旧报告页) ──
    const exportPdf = async () => {
      if (pdfGenerating.value) return
      const msg = messages.value.find(m => m.id === lastAnalysisMsgId.value)
      if (!msg || !msg.content) return
      const userMsg = messages.value.filter(m => m.role === 'user')
      const question = userMsg.length ? userMsg[userMsg.length - 1].content.replace(/^\[附件.*$/, '') : ''
      pdfGenerating.value = true
      let wrap = null
      try {
        const { default: html2canvas } = await import('html2canvas')
        const { jsPDF } = await import('jspdf')
        // 纯 DOM 构建,外部文本一律 textContent(不解析 HTML,防注入)
        const now = new Date().toLocaleString('zh-CN', { hour12: false })
        const safeQ = String(question || '').slice(0, 200)
        wrap = document.createElement('div')
        wrap.style.cssText = "font-family:'PingFang SC','Microsoft YaHei',sans-serif;padding:28px;color:#111;position:absolute;left:-9999px;top:0;width:760px;"
        const h = document.createElement('h2'); h.textContent = '中国铀供应链 · 智能态势研判报告'
        h.style.cssText = 'text-align:center;margin:0 0 8px;'
        const meta = document.createElement('p'); meta.textContent = '用户问题：' + safeQ
        meta.style.cssText = 'text-align:center;color:#555;font-size:12px;margin:2px 0;'
        const meta2 = document.createElement('p'); meta2.textContent = '生成时间：' + now
        meta2.style.cssText = 'text-align:center;color:#555;font-size:12px;margin:2px 0;'
        const hr = document.createElement('hr')
        const body = document.createElement('div')
        body.textContent = msg.content
        body.style.cssText = 'white-space:pre-wrap;font-size:13px;line-height:1.7;margin:12px 0;'
        const foot = document.createElement('p')
        foot.textContent = msg._expertEvidence
          ? `推演依据：${msg._expertEvidence.experiment_id} · 供应链模型 / 年度指标 / 调度建议。`
          : '数据来源：供应链拓扑台账 / 统计快照 / 运筹求解模型。'
        foot.style.cssText = 'color:#777;font-size:11px;margin-top:16px;'
        wrap.appendChild(h); wrap.appendChild(meta); wrap.appendChild(meta2)
        wrap.appendChild(hr); wrap.appendChild(body); wrap.appendChild(foot)
        document.body.appendChild(wrap)
        const canvas = await html2canvas(wrap, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        })
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
        const pageW = pdf.internal.pageSize.getWidth()
        const pageH = pdf.internal.pageSize.getHeight()
        const margin = 34
        const contentW = pageW - margin * 2
        const scaleFactor = contentW / canvas.width
        const renderedH = canvas.height * scaleFactor
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, contentW, renderedH)
        pdf.save('铀供应链研判_' + Date.now() + '.pdf')
        pdfReady.value = true
        if (currentConversationId.value && !msg._expertEvidence && !msg._duringPlan) { try { await markConversationPdf(currentConversationId.value) } catch { /* 导出不依赖远程标记 */ } }
      } catch (e) {
        console.warn('导出PDF失败:', e)
        try { ElMessage({ type: 'error', message: '报告生成失败，请重试' }) } catch (_) {}
      } finally {
        if (wrap) wrap.remove()
        pdfGenerating.value = false
      }
    }

    // ── K4-HANDOFF:研判决完之后的去向 ──
    // 之前的问题:不管阶段都跳同一个页面,且按钮只写"进入可视化界面" ——
    // 用户既不知道要去哪、也不知道去了和自己刚才那轮对话有什么关系。
    // 现在每个去向都带一句"去看什么",并按阶段给默认项。
    const HANDOFF_TARGETS = {
      pre: [
        {
          path: SCNET_ROUTES.situationJudge,
          label: '态势研判',
          hint: '看路线风险排行榜、关键节点与 OSINT 事件（与本次研判同一份 REAL 快照）'
        },
        {
          path: SCNET_ROUTES.situationResearch,
          label: '态势预测',
          hint: '看风险/中断在时间轴上的演进与转折点'
        }
      ],
      // 事后走 K5-PIPELINE 的实验闭环向导(见 postSideTargets),这里不再列平行去向
      post: []
    }

    const handoffTargets = computed(() => {
      // during(事中)没有专属落点,复用事前那组
      return HANDOFF_TARGETS[runPhase.value] || HANDOFF_TARGETS.pre
    })
    const primaryHandoffTarget = computed(() => handoffTargets.value[0] || HANDOFF_TARGETS.pre[0])

    const goVisualization = (target) => {
      const message = messages.value.find(item => item.id === lastAnalysisMsgId.value)
      if (message?._duringPlan) {
        const { sessionId, userGoal } = message._duringPlan
        enterDuringFlow(sessionId, userGoal, 'uranium')
        return
      }
      if (message?._expertEvidence) {
        router.push(message._expertEvidence.detail)
        return
      }
      const dest = target || primaryHandoffTarget.value || HANDOFF_TARGETS.pre[0]
      // 没有 path 就说明去向表配错了:router.push({path: undefined}) 只会改 query、
      // 页面不动,表现成"点了没反应",所以这里显式拦住并提示。
      if (!dest || !dest.path) {
        ElMessage.error('该去向未配置页面路径，跳转已取消')
        return
      }
      const query = { from_chat: '1' }
      // 会话 id 优先取本次运行,其次取当前打开的会话(历史会话没有 activeRun,
      // 不带 id 落地页的交接条就不渲染、也回不到本对话)
      const conversationId = (activeRun.value && activeRun.value.conversation_id) || currentConversationId.value || ''
      if (conversationId) {
        query.session_id = conversationId
      } else {
        delete query.from_chat
      }
      // 阶段必须带上:落地页的交接条靠它显示"事前研判/事后复盘"
      query.phase = runPhase.value === 'post' ? 'post' : 'pre'
      // 铀/汽车场景也跟着走,否则落地页会落回默认场景
      query.scenario = scenarioStore.currentScenario || 'uranium'
      persistChatTranscript()
      router.push({ path: dest.path, query })
    }

    // ── K5-PIPELINE:事后复盘的实验闭环 ──
    // 用户要的链路是:先确认目的 → 设计实验方案 → 进反事实实验平台运行 → 拿到实验数据
    // → 观察分析 / 干预分析 / 机制分析。
    // 此前从结论直接跳页面,目的与方案都要在平台上重新想一遍,闭环是断的。现在把
    // 「实验目的 + 实验方案」收敛成独立的方案设计页(views/SCnet/ExperimentPlanDesign.vue),
    // 对话里只留一个入口,方案用 plan_id 一路带到平台(见 scnetExperimentPlan)。
    // 实验闭环之外的旁路去向:只想看结构/出报告,或直接去平台自己设参数
    const POST_SIDE_TARGETS = [
      {
        path: SCNET_ROUTES.counterfactualExperiment,
        label: '反事实实验平台（自定义参数）',
        hint: '不预设方案，直接上平台手动设干预变量与产能参数'
      },
      {
        path: SCNET_ROUTES.EXreport,
        label: '供应链实验报告',
        hint: '汇总结论与关键指标，导出可交付的实验报告'
      }
    ]

    const isPostPhase = computed(() => runPhase.value === 'post')
    const postSideTargets = computed(() => POST_SIDE_TARGETS)

    // ── K6-WORKSPACE:事后复盘工作台(右侧常驻) ──
    // 事后阶段右侧改成工作台:把「这一步要做什么 / 现在做到哪 / 参数填了什么」摆在一屏,
    // 并可直接进任一环节、或就地把复盘问题抛给助手。此前右侧只有 Agent 工具调用,
    // 工具跑完就空了,用户还得回头去猜五个页面的名字。
    const isPostMode = computed(() => currentMode.value === 'post' || runPhase.value === 'post')
    // 方案存在 sessionStorage 里;从方案设计页回来时按场景重新读一次
    const activePlan = ref(null)
    const refreshActivePlan = () => {
      activePlan.value = readLatestExperimentPlan(scenarioStore.currentScenario) || null
    }
    // 工作台里的实验 id:从实验闭环跳回本对话时会带在 URL 上
    const workspaceExperimentId = computed(() => String(route.query?.experiment_id || '').trim())
    const postScenarioLabel = computed(() => SCENARIO_LABELS[scenarioStore.currentScenario] || '')

    // 事后介绍里的「典型传导链」：只用本场景参数目录 / 指标里真实存在的变量名，
    // 而且明确标成链路结构示例 —— 复盘要沿着它逐段核对，不是已经发生过的结论。
    const POST_CHAIN_TEMPLATES = {
      [SCENARIO_VALUES.URANIUM]: {
        root: '外部扰动',
        branches: [
          ['铀矿产能不足', '供应完成率下滑'],
          ['新矿投产阈值过高', '缺口持续扩大'],
          ['网络协作密度下降', '调配能力受限'],
          ['产能爬坡速率偏慢', '系统总利润收缩']
        ]
      },
      [SCENARIO_VALUES.SUPPLY_CHAIN]: {
        root: '外部扰动',
        branches: [
          ['产能水平不足', '订单完成率下滑'],
          ['库存容量告罄', '交付超期'],
          ['协作频次下降', '调配能力受限'],
          ['订单倍数过高', '系统净利润收缩']
        ]
      }
    }
    const postChainTemplate = computed(
      () => POST_CHAIN_TEMPLATES[scenarioStore.currentScenario] || POST_CHAIN_TEMPLATES[SCENARIO_VALUES.URANIUM]
    )

    // 事后阶段第一个回复要复述目标并按三个分析拆解:三个子问题只写本场景真实存在的指标 / 参数 / 链条
    const POST_GOAL_TEMPLATES = {
      [SCENARIO_VALUES.URANIUM]: {
        observe: '铀矿产能、供应缺口与网络协作密度的逐轮演化',
        intervene: '新矿投产阈值、产能爬坡速率在哪些轮次介入能把供应缺口压回基线',
        mechanism: '产能爬坡、缺口扩散与协作密度之间的因果链条'
      },
      [SCENARIO_VALUES.SUPPLY_CHAIN]: {
        observe: '订单完成率、系统净利润与协作次数的逐轮演化',
        intervene: '产能区间、订单倍数在哪些轮次介入能把订单完成率拉回基线',
        mechanism: '产能、库存、协作频次与订单之间的因果链条'
      }
    }
    const postGoalTemplate = computed(
      () => POST_GOAL_TEMPLATES[scenarioStore.currentScenario] || POST_GOAL_TEMPLATES[SCENARIO_VALUES.URANIUM]
    )
    // 确认实验目的的口令:命中后本地应答,不再调 Agent
    const GOAL_CONFIRM_PATTERN = /^确认实验目的[。.！!]?$/
    // 目标复述:目标句取自用户原话,三个子问题取自本场景口径模板
    const composeGoalBrief = (question) => {
      const asked = String(question || '').replace(/^\[附件[\s\S]*$/m, '').trim()
      const label = SCENARIO_LABELS[scenarioStore.currentScenario] || '本场景'
      return {
        goal: `基于${label}的计算实验结果，梳理事后复盘结论，回答「${asked}」这一问题，并为后续${label}的管控决策提供经验依据`,
        dims: postGoalTemplate.value
      }
    }

    // 五个环节与各自的一句话职责;consult 是「咨询」按钮填进输入框的复盘问题
    const POST_REVIEW_ACTIONS = [
      {
        key: 'observe',
        icon: '📈',
        label: '观察分析',
        desc: '回看仿真基线的逐轮指标序列，标出何时、在哪个环节开始偏离基线。',
        path: SCNET_ROUTES.expAnalysisObserve,
        needsExperiment: true,
        consult: '复盘本次仿真：关键指标在哪些轮次开始偏离基线，偏离最明显的是哪个环节？'
      },
      {
        key: 'counterfactual',
        icon: '🧪',
        label: '反事实实验',
        desc: '按本次实验方案在成对世界上跑事实 / 反事实两次推演，两者只差一个干预。',
        path: SCNET_ROUTES.counterfactualExperiment,
        needsExperiment: false,
        consult: '帮我把本次实验方案里的干预变量与取值整理清楚，并说明对照组应该怎么设。'
      },
      {
        key: 'intervention',
        icon: '🎛️',
        label: '干预分析',
        desc: '比较基线与干预方案的指标变化，用校正后的显著性判定哪组策略真的更优。',
        path: SCNET_ROUTES.expAnalysisIntervention,
        needsExperiment: true,
        consult: '对比几组干预策略：哪一组在完成率与成本上的改善是统计上显著的？'
      },
      {
        key: 'mechanism',
        icon: '🔗',
        label: '机制分析',
        desc: '沿微观→中观→宏观定位因果链路，把机制假设变成可验证的反事实实验。',
        path: SCNET_ROUTES.expAnalysisMechanism,
        needsExperiment: true,
        consult: '本次复盘里主导的传导机制是什么？哪条链路最值得用反事实实验验证？'
      },
      {
        key: 'report',
        icon: '📄',
        label: '复盘报告',
        desc: '汇总实验对比、关键因子与复盘结论，导出可交付的实验报告。',
        path: SCNET_ROUTES.EXreport,
        needsExperiment: true,
        consult: '把本次复盘的关键结论整理成一份可以交付的实验报告要点。'
      }
    ]

    // 反事实结论是否已按同一实验 id 交接给复盘报告(EXreport 的读取口径)
    const postReviewReport = computed(() =>
      (workspaceExperimentId.value ? loadCounterfactualReport(workspaceExperimentId.value) : null)
    )

    // 状态分三级:已完成 = 本次实验真的产出了对应证据;可进入 = 前置条件满足(有方案/有实验 id);
    // 待运行 = 前置条件也没满足。之前把「可进入」直接当「已完成」，会导致存过方案就显示实验已完成。
    const postReviewActions = computed(() => {
      const hasExperiment = Boolean(workspaceExperimentId.value)
      const hasPlan = Boolean(activePlan.value)
      const report = postReviewReport.value
      const evidence = {
        observe: Boolean(report && report.distribution),
        counterfactual: Boolean(report),
        intervention: Boolean(report && report.effect && Number.isFinite(report.effect.pValue)),
        mechanism: Boolean(report && Array.isArray(report.interventionDiff) && report.interventionDiff.length),
        report: Boolean(report)
      }
      return POST_REVIEW_ACTIONS.map((action) => {
        const ready = action.needsExperiment ? hasExperiment : hasPlan
        const done = Boolean(evidence[action.key])
        return { ...action, ready: ready || done, state: done ? 'done' : (ready ? 'ready' : 'waiting') }
      })
    })

    // 进度只统计「本次实验」真实产出的证据。
    // 方案设计是进入事后阶段之前的前置工作，且 readLatestExperimentPlan 会捞到本会话里
    // 上一份残留方案，把它算进进度会让新开的事后复盘页凭空显示 50%。
    const postReviewProgress = computed(() => {
      const report = postReviewReport.value
      const milestones = [
        Boolean(workspaceExperimentId.value),                                       // 反事实实验已运行
        Boolean(report && report.distribution),                                     // 有逐轮样本，分布可比
        Boolean(report && report.effect && Number.isFinite(report.effect.pValue)),  // 干预效应已配对检验
        Boolean(report)                                                             // 复盘报告已归档
      ]
      const done = milestones.filter(Boolean).length
      const total = milestones.length
      return { done, total, percent: Math.round((done / total) * 100) }
    })

    const PENDING_TEXT = '待生成'
    const postReviewParameterGroups = computed(() => {
      const plan = activePlan.value || {}
      const metricText = (plan.metrics || [])
        .map((item) => item.label || item.key)
        .filter(Boolean)
        .join('、')
      const hasExperiment = Boolean(workspaceExperimentId.value)
      const rows = (items) => items.map((item) => ({
        label: item.label,
        value: item.value || PENDING_TEXT,
        pending: !item.value
      }))
      return [
        { group: '基础设置', items: rows([
          { label: '场景', value: postScenarioLabel.value },
          { label: '实验名称', value: plan.purpose ? plan.purpose.slice(0, 20) : '' },
          { label: '实验 ID', value: workspaceExperimentId.value },
          { label: '实验目的', value: plan.purpose || '' }
        ]) },
        { group: '实验设置', items: rows([
          { label: '干预变量', value: plan.levers?.length ? describePlanLevers(plan) : '' },
          { label: '目标指标', value: metricText },
          { label: '观测轮次', value: plan.rounds ? `${plan.rounds} 轮` : '' },
          { label: '对照组', value: plan.control || '' }
        ]) },
        { group: '分析设置', items: rows([
          { label: '观察分析', value: hasExperiment ? '已就绪' : '' },
          { label: '干预分析', value: hasExperiment ? '已就绪' : '' },
          { label: '机制分析', value: hasExperiment ? '已就绪' : '' }
        ]) }
      ]
    })

    // 事后阶段右侧只剩工作台,原来的执行面板内容(状态 + 工具进度)并进来
    const postReviewAgent = computed(() => ({
      visible: Boolean(execStatus.value) || execTools.value.length > 0,
      state: execState.value,
      status: execStatus.value || '等待提交复盘问题',
      tools: execTools.value.map((tool) => ({ ...tool, name: toolLabelOf(tool.tool) }))
    }))

    // 「咨询」:把该环节的复盘问题填进输入框并聚焦,用户可改完再发
    const consultPostAction = (action) => {
      const question = String(action?.consult || '').trim()
      if (!question) return
      inputText.value = question
      nextTick(() => {
        const target = messages.value.length ? chatTextarea.value : welcomeTextarea.value
        if (target && target.focus) target.focus()
      })
    }

    // 「进入」:带上本次实验闭环上下文(方案 / 实验 / 来源对话 / 场景)跳转
    const enterPostAction = (action) => {
      if (!action || !action.path) {
        ElMessage.error('该环节未配置页面路径，跳转已取消')
        return
      }
      const query = { phase: 'post', scenario: scenarioStore.currentScenario || SCENARIO_VALUES.URANIUM }
      const conversationId = (activeRun.value && activeRun.value.conversation_id) || currentConversationId.value || ''
      if (conversationId) { query.from_chat = '1'; query.session_id = conversationId }
      if (activePlan.value && activePlan.value.id) query[PLAN_QUERY_KEY] = activePlan.value.id
      if (workspaceExperimentId.value) query.experiment_id = workspaceExperimentId.value
      // 走到别处之前也把对话快照留下：方案设计页的「事后方案助手」要从这里续上下文
      persistChatTranscript()
      router.push({ path: action.path, query })
    }

    // 事后复盘 → 「实验方案设计」页的交接:对话里只保留实验目的的自动拟稿与本页入口,
    // 干预变量 / 目标指标 / 观测轮次全部收敛到方案设计页(views/SCnet/ExperimentPlanDesign.vue),
    // 草稿通过 sessionStorage 用同一个 plan_id 带过去,两个页面不各存一份状态。
    const planPurpose = ref('')
    const planPurposeBasis = ref({ question: '', conclusion: '' })
    // 「确认实验目的」是否已被用户确认:带进方案设计页的草稿,决定 purposeConfirmed
    const planPurposeConfirmed = ref(false)

    // 实验目的不是凭空写的:由本次问题 + 研判结论首句拼出,用户可在方案设计页改
    const derivePlanPurpose = () => {
      const lastUser = [...messages.value].reverse().find((m) => m.role === 'user')
      const question = String(lastUser ? lastUser.content : '').replace(/^\[附件[\s\S]*$/m, '').trim()
      const conclusionMsg = messages.value.find((m) => m.id === lastAnalysisMsgId.value)
      const conclusion = String(conclusionMsg ? conclusionMsg.content : '')
      // 跳过"我将使用工具…请稍等"这类过程性话术,取第一句有信息量的结论
      const NOISE = ['请稍等', '我将', '我需要先', '为了回答', '以上', '以下是', '调用以下工具', '我需要调用', '为了进行', '正在进行']
      const firstLine = conclusion
        .split('\n')
        .map((line) => line.replace(/^[#>\-*\s]+/, '').replace(/\*\*/g, '').trim())
        .find((line) => line.length > 10 && !NOISE.some((kw) => line.includes(kw))) || ''
      planPurposeBasis.value = { question, conclusion: firstLine }
      return composePlanPurpose({ question, conclusion: firstLine })
    }

    // 带着草稿去方案设计页:目的 / 生成依据 / 来源对话一起带过去,页面加载参数目录后再选变量
    const openPlanDesign = () => {
      const purpose = planPurpose.value.trim() || derivePlanPurpose()
      planPurpose.value = purpose
      const conversationId = (activeRun.value && activeRun.value.conversation_id) || currentConversationId.value || ''
      const draft = {
        id: newExperimentPlanId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scenario: scenarioStore.currentScenario,
        scenarioLabel: SCENARIO_LABELS[scenarioStore.currentScenario] || '',
        purpose,
        purposeConfirmed: planPurposeConfirmed.value,
        purposeBasis: { ...planPurposeBasis.value },
        control: PLAN_CONTROL_LABEL,
        levers: [],
        metrics: [],
        rounds: null,
        conversationId
      }
      // 草稿写不进去(例如浏览器禁用了 sessionStorage)也照常跳转:方案设计页支持手填
      saveExperimentPlan(draft)
      // 把这段对话一起带过去:方案设计页右侧的「事后方案助手」要接着聊同一件事
      savePlanTranscript(draft.id, messages.value)
      saveConversationTranscript(conversationId, messages.value)
      persistChatTranscript()
      const query = { phase: 'post', scenario: draft.scenario }
      query[PLAN_QUERY_KEY] = draft.id
      if (conversationId) { query.from_chat = '1'; query.session_id = conversationId }
      router.push({ path: SCNET_ROUTES.experimentPlan, query })
    }

    // 新一轮研判出结论时重新拟稿:目的按新结论生成
    watch(analysisSuccess, (ok) => {
      if (!ok) return
      planPurpose.value = derivePlanPurpose()
      // 入口是研判结论的下一步,别让用户还停在结论中间去找它
      scrollToBottom()
    })

    const toolDisplayName = (t) => toolLabelOf(t)
    const isSectionDone = (k) => execSections.value.includes(k)

    const abortStream = () => {
      requestVersion += 1
      if (agentStream) { try { agentStream.close() } catch {} ; agentStream = null }
      if (activeRun.value?.task_id) { cancelAgentTask(activeRun.value.task_id).catch(() => {}) }
      stopStreamTimers(); isStreaming.value = false
      const last = messages.value[messages.value.length - 1]
      if (last && last.role === 'assistant') {
        last._streaming = false
        if (!last.content) last.content = '（已中止）'
      }
      execState.value = 'done'; execStatus.value = '已中止'
    }

    const renderMarkdown = (c) => { if (!c) return ''; try { return marked.parse(c, { breaks: true }) } catch { return c } }

    const restoreConversation = async () => {
      // K2-PERSIST:URL query(conversation_id/session_id)优先,其次 localStorage active
      const q = route.query?.conversation_id || route.query?.session_id
      let key = q ? String(q) : ''
      if (!key) { try { key = localStorage.getItem('scnet_active_conversation_id') || '' } catch (_) {} }
      if (key) { await loadConversation(key); return true }
      return false
    }
    onMounted(async () => {
      loadAgentModels()
      applyModeFromRoute(route.query?.mode)
      fetchConversations().catch(() => {})
      refreshActivePlan()
      if (route.query?.scenario === 'uranium' && duringExperimentId.value) scenarioStore.setScenario('uranium')
      // 模式入口(事中)不自动恢复历史,避免覆盖 ?mode=during 流程
      if (!route.query?.mode) { await restoreConversation() }
      else if (currentMode.value === 'during') {
        const saved = readUraniumConversations().find(item => duringExperimentId.value
          ? item.experiment_id === duringExperimentId.value
          : item.id === localStorage.getItem(ACTIVE_CONV_KEY) && !item.experiment_id)
        if (saved) await loadConversation(saved.id)
      }
      nextTick(() => { if (messages.value.length === 0) welcomeTextarea.value?.focus() })
    })
    // 切到事后(或换场景)时重读方案:工作台的参数与进度按当前场景的实际方案展示
    watch([currentMode, () => scenarioStore.currentScenario], refreshActivePlan)
    watch(() => route.query?.conversation_id, (v) => { if (v) loadConversation(String(v)) })
    watch(() => route.query?.mode, (mode) => applyModeFromRoute(mode))
    onUnmounted(() => { requestVersion += 1; if (abortController) abortController.abort(); if (agentStream) { try { agentStream.close() } catch {} } stopStreamTimers() })
    // DEV-only 调试句柄:供回归验证(竞态/迟到失败)驱动 refresh 并读取 count
    if (import.meta.env.DEV) {
      window.__chatHistoryDebug = {
        count: () => conversations.value.length,
        refresh: () => fetchConversations().catch(() => {}),
        upsert: (id, title) => upsertLocalConversation(id, title),
      }
    }

    return {
      scenarioStore,
      duringExperimentId, openExpertExperiment, openEvidenceDetail, startIndependentDuring,
      logoUrl, msgContainer, welcomeTextarea, chatTextarea, fileInput, debugPanelBody,
      messages, inputText, selectedModel, isStreaming, currentConversationId, conversations,
      historyLoading, historyError, historyLoaded, retryHistory,
      sidebarCollapsed, currentMode, modeIndex, execMode, attachments,
      debugThinking, debugThinkingVisible, spinnerGlyph, spinnerVerb, spinnerColor, streamElapsed, formatDuration, retryMessage,
      currentModelLabel, currentModelOption, currentExecMode, inputPlaceholder,
      modeOptions: MODE_OPTIONS, chatModels, EXEC_MODES,
      scenarioOptions: SCENARIO_OPTIONS, selectScenario,
      presetQuestions, presetTitle, applyPreset, phaseShortLabels: PHASE_SHORT_LABELS,
      execPanelVisible, execPanelTitle, activeRun, execTools, execStatus, execState, execSections,
      analysisSuccess, lastAnalysisMsgId, pdfGenerating, pdfReady, pdfStateText,
      SECTION_ORDER, SECTION_LABELS: sectionLabels, RESULT_CARDS: resultCards,
      execActiveTab, activeEvidence, activeDuringPlan,
      toolDisplayName, isSectionDone,
      exportPdf, goVisualization, handoffTargets, primaryHandoffTarget, postSideTargets,
      isPostPhase, planPurpose, planPurposeConfirmed, openPlanDesign,
      isPostMode, postScenarioLabel, postReviewActions, postReviewProgress,
      postReviewParameterGroups, postReviewAgent, consultPostAction, enterPostAction,
      postChainTemplate,
      goToMainPage, selectMode, openKnowledge,
      handleModeGlassPointer, resetModeGlassPointer,
      triggerFileInput, handleFileChange, removeAttachment,
      handleSend, abortStream, autoResizeWelcome, autoResizeChat,
      startNewConversation, loadConversation,
      handleDeleteConversation, handleBatchDelete, handleRenameConversation,
      renderMarkdown,
    }
  },
}
</script>

<style scoped>
.chat-exec-tabs { display: flex; gap: 4px; padding: 4px; border-radius: 8px; background: #f1f5f9; margin: 12px 0; }
.chat-exec-tabs button { flex: 1; border: 0; padding: 7px; border-radius: 5px; color: #64748b; background: transparent; cursor: pointer; }
.chat-exec-tabs button.active { background: #fff; color: #2563eb; box-shadow: 0 1px 3px #0f172a12; }
.chat-exec-parameters { color: #475569; font-size: 12px; line-height: 1.8; overflow-wrap: anywhere; }
.chat-exec-parameters dl > div { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 8px 0; gap: 10px; }
.chat-exec-parameters dd { color: #0f172a; font-weight: 600; margin: 0; }
.chat-msg-bubble :deep(table) { width: 100%; border-collapse: collapse; font-size: 12px; margin: 12px 0; }
.chat-msg-bubble :deep(th), .chat-msg-bubble :deep(td) { padding: 8px; border: 1px solid #dce5ee; text-align: left; }
.chat-msg-bubble :deep(th) { background: #edf3fa; }
.chat-expert-context { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #dbeafe; background: #f8fbff; color: #334155; font-size: 12px; }
.chat-expert-context > div { flex: 1; min-width: 200px; overflow-wrap: anywhere; }
.chat-expert-context p { margin: 4px 0 0; }
.chat-expert-context button { border: 1px solid #cbd5e1; background: #fff; color: #2563eb; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
/* ── Shell ─────────────────────────────────── */
.chat-shell { position: relative; display: flex; width: 100%; height: 100vh; background: #ffffff; overflow: hidden; }
.chat-main { display: flex; flex-direction: column; height: 100vh; min-width: 0; transition: margin-left 0.3s ease, margin-right 0.3s ease; }
.chat-main-expand { margin-left: 260px; width: calc(100vw - 260px); }
.chat-main-shrink { margin-left: 64px; width: calc(100vw - 64px); }
.chat-main-expand.has-exec { margin-right: 320px; width: calc(100vw - 260px - 320px); }
.chat-main-shrink.has-exec { margin-right: 320px; width: calc(100vw - 64px - 320px); }
/* 事后复盘工作台比执行面板宽（两列卡片 + 参数表），单独一套留白口径 */
.chat-main-expand.has-post { margin-right: 380px; width: calc(100vw - 260px - 380px); }
.chat-main-shrink.has-post { margin-right: 380px; width: calc(100vw - 64px - 380px); }

/* ── Welcome ───────────────────────────────── */
.chat-welcome-wrap {
  flex: 1; display: flex; align-items: center; justify-content: center;
  min-height: 0; position: relative; overflow-x: hidden; overflow-y: auto; isolation: isolate;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}
.chat-welcome-wrap::before {
  content: ''; position: absolute; left: 50%; top: 52%; z-index: -1; pointer-events: none;
  transform: translate(-50%, -45%); width: 112%; max-width: 920px; height: 56%;
  max-height: 340px; border-radius: 9999px;
  background: radial-gradient(ellipse 100% 100% at center 8%, #fdfcfc 0, #9dd2ff 50%);
  filter: blur(125px); animation: glowSpread 1s cubic-bezier(0.2, 0, 0, 1) both;
}
@keyframes glowSpread { 0% { opacity: 0; transform: translate(-50%, -45%) scale(0); } 100% { opacity: 1; transform: translate(-50%, -45%) scale(1); } }

.chat-welcome { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 840px; margin: auto; padding: 0 32px 64px; position: relative; z-index: 1; }
/* 事后阶段的说明比较长：顶端对齐（参考口径），居中会让开头被压到折叠线以上；
   正文区保持纯白无底色（参考口径），蓝色光晕只在非事后欢迎页出现 */
.chat-welcome-wrap.is-post { align-items: flex-start; background: #fff; }
.chat-welcome-wrap.is-post::before { display: none; }
.chat-welcome.is-post { margin: 0 auto; padding: 28px 32px 0; }
.chat-welcome-brand { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.chat-welcome-logo { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; }
.chat-welcome-text { color: #111827; font-size: 24px; font-weight: 600; line-height: 1.3; }
.chat-welcome-hint { margin: 12px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center; }
.chat-welcome-hint b { color: #4f46e5; }

/* 场景切换（手动） */
.chat-scenario-switch {
  display: inline-flex; align-items: center; gap: 4px;
  margin-top: 12px; padding: 3px;
  border-radius: 999px; background: #f3f4f6; border: 1px solid #e5e7eb;
}
.chat-scenario-option {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 14px; border: none; border-radius: 999px;
  background: transparent; color: #6b7280; font-size: 13px; font-weight: 500;
  cursor: pointer; user-select: none; transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}
.chat-scenario-option:hover:not(.active) { color: #111827; }
.chat-scenario-option.active { font-weight: 600; box-shadow: 0 1px 2px rgba(17,24,39,0.06); }
.chat-scenario-option.is-uranium.active { background: #eef2ff; color: #4f46e5; }
.chat-scenario-option.is-auto.active { background: #ecfdf5; color: #059669; }
.chat-scenario-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: #d1d5db; }
.chat-scenario-option.is-uranium.active .chat-scenario-dot { background: #6366f1; }
.chat-scenario-option.is-auto.active .chat-scenario-dot { background: #10b981; }
.chat-welcome-input { width: 100%; }

/* 事后复盘阶段说明：组件见 @/components/SCnet/PostReviewBrief.vue，这里只管两处落点的留白 */
.chat-post-brief-welcome { margin-top: 18px; }

/* 事后模式：提问框吸底常驻，说明区在上方滚动（参考口径：正文区无底色）。
   预设问题排在提问框之前，提问框才能一直是最后一项、全程钉在底部 */
.chat-welcome.is-post .chat-preset-wrap { order: 1; }
.chat-welcome.is-post .chat-welcome-input {
  order: 2;
  position: sticky; bottom: 0; z-index: 3;
  margin-top: 20px; padding: 14px 0 22px;
  background: #fff;
}
.chat-welcome.is-post .chat-welcome-input::before {
  content: ''; position: absolute; left: 0; right: 0; top: -30px; height: 30px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), #ffffff);
  pointer-events: none;
}

/* 预设问题 */
.chat-preset-wrap { width: 100%; margin-top: 18px; }
.chat-preset-head { display: flex; align-items: center; margin-bottom: 10px; padding: 0 2px; color: #9ca3af; font-size: 12px; letter-spacing: 0.02em; }
.chat-preset-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.chat-preset-card {
  display: flex; align-items: flex-start; gap: 10px; width: 100%; min-width: 0;
  padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 12px;
  background: rgba(255,255,255,0.86); text-align: left; cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, background 0.18s ease;
}
.chat-preset-card:hover { border-color: #a5b4fc; background: #fff; box-shadow: 0 6px 18px rgba(79,70,229,0.08); transform: translateY(-1px); }
.chat-preset-icon { flex-shrink: 0; font-size: 16px; line-height: 20px; }
.chat-preset-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.chat-preset-title { display: flex; align-items: center; gap: 6px; color: #111827; font-size: 13px; font-weight: 600; line-height: 20px; }
.chat-preset-phase { padding: 0 6px; border-radius: 999px; font-size: 11px; font-style: normal; font-weight: 500; line-height: 16px; }
.chat-preset-phase.is-pre { background: #eff6ff; color: #2563eb; }
.chat-preset-phase.is-during { background: #fff7ed; color: #ea580c; }
.chat-preset-phase.is-post { background: #f0fdf4; color: #16a34a; }
.chat-preset-tag {
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 500;
  line-height: 16px;
}
.chat-preset-text {
  color: #6b7280; font-size: 12px; line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

/* ── Mode Selector ─────────────────────────── */
.chat-mode-wrap { display: flex; align-items: center; justify-content: center; margin: 6px 0 38px; }
.chat-mode-selector {
  --chat-mode-gap: 4px; --glass-x: 18%; --glass-y: 0%;
  position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--chat-mode-gap); padding: 3px; border-radius: 999px; overflow: hidden; isolation: isolate;
  background: linear-gradient(135deg, rgba(255,255,255,0.56) 0%, rgba(231,243,255,0.28) 52%, rgba(167,213,251,0.12) 100%), rgba(246,251,255,0.42);
  border: 1px solid rgba(104,159,222,0.24);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.86), inset 0 -7px 18px rgba(72,139,216,0.04), 0 0 0 1px rgba(255,255,255,0.3), 0 10px 30px rgba(46,93,168,0.09);
  backdrop-filter: blur(16px) saturate(1.28) contrast(1.03);
}
.chat-mode-selector::before {
  content: ''; position: absolute; inset: 0; z-index: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 48%),
    linear-gradient(100deg, rgba(255,255,255,0) 8%, rgba(255,255,255,0.2) 42%, rgba(255,255,255,0) 70%);
  opacity: 0.78; mix-blend-mode: screen;
}
.chat-mode-selector::after {
  content: ''; position: absolute; inset: 1px; z-index: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 16%, rgba(57,121,197,0.02) 84%, rgba(255,255,255,0.18) 100%),
    radial-gradient(140% 120% at 50% 128%, rgba(58,147,232,0.045) 0%, rgba(58,147,232,0.01) 58%, rgba(58,147,232,0) 78%);
  box-shadow: inset 1px 0 1px rgba(255,255,255,0.38), inset -1px 0 1px rgba(45,90,148,0.08), inset 0 -1px 1px rgba(45,96,160,0.045);
}
.chat-mode-slider {
  position: absolute; z-index: 1; top: 3px; left: 3px;
  width: calc((100% - 3 * var(--chat-mode-gap) - 6px) / 4); height: calc(100% - 6px);
  border-radius: 999px; overflow: hidden;
  background: linear-gradient(135deg, rgba(255,255,255,0.62) 0%, rgba(226,240,253,0.24) 48%, rgba(132,195,248,0.13) 100%),
    linear-gradient(180deg, rgba(252,254,255,0.22) 0%, rgba(149,203,249,0.08) 100%);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -7px 16px rgba(54,116,190,0.075),
    inset 0 0 0 1px rgba(255,255,255,0.32), 0 0 0 1px rgba(90,151,218,0.22),
    0 8px 18px rgba(40,95,166,0.12), 0 1px 3px rgba(20,36,64,0.07);
  backdrop-filter: blur(18px) saturate(1.55) contrast(1.05);
  transition: transform 0.44s cubic-bezier(0.2, 0.85, 0.22, 1.12), box-shadow 0.28s ease, background 0.28s ease;
}
.chat-mode-slider::before {
  content: ''; position: absolute; inset: 0; z-index: 1; border-radius: inherit; pointer-events: none;
  background: radial-gradient(95% 85% at var(--glass-x) var(--glass-y), rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.28) 34%, rgba(255,255,255,0) 66%),
    linear-gradient(105deg, rgba(255,255,255,0) 8%, rgba(255,255,255,0.34) 42%, rgba(255,255,255,0) 68%),
    linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0) 48%);
  mix-blend-mode: screen; opacity: 0.74; animation: liquidSheen 4.8s cubic-bezier(0.2,0,0,1) infinite;
}
@keyframes liquidSheen {
  0% { opacity: 0.5; transform: translateX(-32%) skewX(-10deg); }
  45% { opacity: 0.78; transform: translateX(4%) skewX(-6deg); }
  100% { opacity: 0.5; transform: translateX(32%) skewX(-10deg); }
}
.chat-mode-slider.pos-0 { transform: translateX(0); }
.chat-mode-slider.pos-1 { transform: translateX(calc(100% + var(--chat-mode-gap))); }
.chat-mode-slider.pos-2 { transform: translateX(calc(200% + 2 * var(--chat-mode-gap))); }
.chat-mode-slider.pos-3 { transform: translateX(calc(300% + 3 * var(--chat-mode-gap))); }

.chat-mode-option {
  position: relative; z-index: 2; display: flex; align-items: center; justify-content: center;
  gap: 8px; min-width: 100px; padding: 12px 16px; border: none; border-radius: 999px;
  background: transparent; color: #4b5563; font-size: 15px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: color 0.2s ease;
}
.chat-mode-option.active { color: #4d6beb; font-weight: 600; }
.chat-mode-option:hover:not(.active) { color: #111827; }

/* ── Messages ──────────────────────────────── */
.chat-messages { flex: 1; min-height: 0; overflow-y: auto; }
.chat-messages::-webkit-scrollbar { width: 6px; }
.chat-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.chat-messages-inner { max-width: 840px; margin: 0 auto; padding: 8px 32px 28px; display: flex; flex-direction: column; gap: 1rem; }
.chat-msg { display: flex; gap: 0.6rem; }
.chat-msg.user { flex-direction: row-reverse; }
.chat-msg-avatar { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; background: #f3f4f6; color: #6b7280; overflow: hidden; }
.chat-msg-avatar img { width: 100%; height: 100%; object-fit: cover; }
.chat-msg-avatar.user { background: #dbeafe; color: #2563eb; }
.chat-msg-body { max-width: 72%; min-width: 0; }
/* K2-FLOW:导出PDF */
.chat-analysis-actions { margin-top: 8px; display: flex; }
.chat-pdf-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 14px; border: 1px solid #c7d2fe; border-radius: 8px;
  background: #eef2ff; color: #4f46e5; font-size: 12.5px; font-weight: 600;
  cursor: pointer; transition: all 0.18s;
}
.chat-pdf-btn:hover:not(:disabled) { border-color: #4f46e5; background: #e0e7ff; }
.chat-pdf-btn:disabled { opacity: 0.55; cursor: not-allowed; }
/* K2-FLOW:进入可视化(消息区右下,不覆盖内容) */
.chat-visualize-zone { display: flex; flex-shrink: 0; justify-content: flex-end; padding: 10px 32px 12px; }
.chat-visualize-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border: none; border-radius: 999px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 14px rgba(79,70,229,0.28); transition: all 0.2s;
}
.chat-visualize-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,70,229,0.36); }
.chat-visualize-arrow { font-size: 15px; }
.chat-plan-step {
  padding: 12px 14px; border: 1px solid #e0e7ff; border-left: 3px solid #4f46e5;
  border-radius: 10px; background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%);
}
.chat-plan-title { margin: 0 0 4px; color: #312e81; font-size: 13.5px; font-weight: 700; }
.chat-plan-desc { margin: 0 0 8px; color: #6b7280; font-size: 12px; line-height: 1.5; }
.chat-plan-preview {
  margin: 0; padding: 8px 10px; border: 1px solid #e0e7ff; border-radius: 8px;
  background: #f8faff; color: #3730a3; font-size: 12.5px; line-height: 1.6;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.chat-plan-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.chat-plan-confirmed { margin: 8px 0 0; color: #059669; font-size: 12px; font-weight: 600; }
.chat-handoff-zone { display: flex; align-items: center; gap: 8px; }
.chat-handoff-lead { color: #6b7280; font-size: 12.5px; }
.chat-handoff-more {
  padding: 6px 12px; border: 1px solid #ddd6fe; border-radius: 999px;
  background: #fff; color: #5b21b6; font-size: 12.5px; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
}
.chat-handoff-more:hover { background: #f5f3ff; border-color: #c4b5fd; }
.chat-handoff-note { margin: 6px 0 0; text-align: right; color: #9ca3af; font-size: 11.5px; }
.chat-handoff-menu { display: flex; flex-direction: column; gap: 2px; }
.chat-handoff-item {
  display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 8px 10px;
  border: none; border-radius: 8px; background: transparent; text-align: left; cursor: pointer;
}
.chat-handoff-item:hover { background: #f5f3ff; }
.chat-handoff-item.active { background: #ede9fe; }
.chat-handoff-item-label { color: #1f2937; font-size: 13px; font-weight: 600; }
.chat-handoff-item-hint { color: #6b7280; font-size: 11.5px; line-height: 1.45; }
.chat-result-cards { display: flex; gap: 6px; margin-bottom: 8px; }
.chat-result-card {
  flex: 1; display: flex; align-items: center; gap: 5px;
  padding: 5px 8px; border: 1px solid #e5e7eb; border-radius: 8px;
  background: #f9fafb; color: #9ca3af; font-size: 12px; font-weight: 500;
  transition: all 0.25s;
}
.chat-result-card-num { font-weight: 700; }
.chat-result-card-label { flex: 1; white-space: nowrap; }
.chat-result-card-check { font-size: 13px; }
.chat-result-card.active { border-color: #c7d2fe; background: #eef2ff; color: #4f46e5; }
.chat-msg-bubble { padding: 0.65rem 1rem; border-radius: 12px; font-size: 0.9rem; line-height: 1.6; word-break: break-word; }
.chat-msg.user .chat-msg-bubble { background: #2563eb; color: #fff; border-bottom-right-radius: 4px; }
.chat-msg.assistant .chat-msg-bubble { background: #f9fafb; color: #111827; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; }
.chat-msg-bubble :deep(p) { margin: 0 0 0.5rem; }
.chat-msg-bubble :deep(p:last-child) { margin-bottom: 0; }
.chat-msg-bubble :deep(pre) { background: #1e293b; color: #e2e8f0; padding: 0.8rem 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.82rem; }
.chat-msg-bubble :deep(ul), .chat-msg-bubble :deep(ol) { padding-left: 1.2rem; margin: 0.3rem 0; }

/* 事后阶段的目标复述卡:目标整句高亮,后面接观察 / 干预 / 机制三个子问题 */
.chat-goal-brief { padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; background: #f9fafb; }
.chat-goal-line { margin: 0; font-size: 0.9rem; line-height: 2; color: #374151; }
.chat-goal-line b { color: #2563eb; font-weight: 600; }
.chat-goal-target { padding: 1px 3px; border-radius: 4px; background: #dbeafe; color: #1d4ed8; font-weight: 600; }
.chat-goal-confirm { margin: 10px 0 0; font-size: 0.86rem; line-height: 1.8; color: #6b7280; }
.chat-disclaimer { font-size: 0.7rem; color: #9ca3af; margin-top: 0.25rem; padding-left: 0.2rem; }
.chat-completed-line { font-size: 0.72rem; color: #8899c4; font-style: italic; padding: 2px 0.2rem 0; }
.chat-msg { animation: msgSlideIn 0.28s ease-out; }
@keyframes msgSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
/* 流式输出中的光标 */
.chat-msg-bubble.is-streaming :deep(p:last-child)::after,
.chat-msg-bubble.is-streaming :deep(li:last-child)::after {
  content: '';
  display: inline-block;
  width: 2px; height: 1em;
  margin-left: 3px;
  vertical-align: -0.15em;
  background: #6366f1;
  animation: chatCursorBlink 0.9s steps(2, start) infinite;
}
@keyframes chatCursorBlink { to { visibility: hidden; } }
.chat-msg-error {
  display: flex; align-items: center; gap: 8px;
  margin-top: 8px; padding: 8px 12px;
  border: 1px solid #fecaca; border-radius: 12px;
  background: #fef2f2; color: #dc2626; font-size: 12px;
}
.chat-msg-error button {
  margin-left: auto; padding: 4px 10px;
  border: 1px solid #fca5a5; border-radius: 8px;
  background: #fff; color: #dc2626; font-size: 11px; cursor: pointer;
  transition: background 0.15s;
}
.chat-msg-error button:hover:not(:disabled) { background: #fff5f5; }
.chat-msg-error button:disabled { opacity: 0.5; cursor: not-allowed; }
/* 参考 MACE 对话页 spinner：字形轮转 + 动词流光 + 计时 */
.chat-spinner { --spinner-color: #4d6beb; display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; padding: 0.5rem 0; color: #9ca3af; font-size: 0.9rem; user-select: none; }
.chat-spinner-glyph { display: inline-flex; justify-content: center; width: 18px; font-size: 1rem; color: var(--spinner-color); flex-shrink: 0; }
.chat-spinner-verb {
  font-weight: 500; color: var(--spinner-color);
  background: linear-gradient(110deg, var(--spinner-color) 40%, #a5b4fc 50%, var(--spinner-color) 60%);
  background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  animation: chatVerbShimmer 2.4s ease-in-out infinite;
}
@keyframes chatVerbShimmer { 0%, 100% { background-position: 100% 0; } 50% { background-position: 0 0; } }
.chat-spinner-timer { color: var(--spinner-color); font-size: 0.8rem; font-weight: 500; font-variant-numeric: tabular-nums; }
.chat-spinner-info { color: var(--spinner-color); opacity: 0.65; font-size: 0.8rem; }

/* ── Input ─────────────────────────────────── */
.chat-input-area { flex-shrink: 0; padding: 0 32px 24px; }
.chat-input-wrapper { width: 100%; max-width: 840px; margin: 0 auto; }
.chat-input-box { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 0.5rem 0.8rem; transition: border-color 0.2s; }
.chat-input-box:focus-within { border-color: #818cf8; }
.chat-file-previews { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.chat-file-preview { position: relative; width: 56px; height: 56px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; flex-shrink: 0; }
.chat-file-preview img { width: 100%; height: 100%; object-fit: cover; }
.chat-file-preview-doc { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f9fafb; font-size: 10px; color: #6b7280; }
.chat-file-preview-remove { position: absolute; top: -2px; right: -2px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #ef4444; color: #fff; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }
.chat-composer-body { margin-bottom: 0.3rem; }
.chat-input-textarea { width: 100%; border: none; outline: none; font-size: 0.9rem; color: #111827; resize: none; font-family: inherit; line-height: 1.5; background: transparent; }
.chat-input-textarea::placeholder { color: #9ca3af; }
.chat-input-textarea:disabled { opacity: 0.5; }
.chat-composer-footer { display: flex; align-items: center; justify-content: space-between; }
.chat-composer-tools { display: flex; align-items: center; gap: 6px; }
.chat-composer-actions { display: flex; align-items: center; }

.chat-composer-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; color: #6b7280; cursor: pointer; transition: all 0.15s; }
.chat-composer-icon-btn:hover { border-color: #93c5fd; color: #2563eb; }
.chat-composer-tag-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; color: #4b5563; font-size: 12px; cursor: pointer; transition: border-color 0.2s; }
.chat-composer-tag-btn:hover:not(:disabled) { border-color: #93c5fd; }
.chat-composer-tag-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.chat-selector-menu { display: flex; flex-direction: column; gap: 2px; }
.chat-selector-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; border: none; border-radius: 6px; background: none; cursor: pointer; font-size: 13px; color: #374151; }
.chat-selector-item:hover { background: #f3f4f6; }
.chat-selector-item.active { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.chat-selector-item-text { display: flex; flex-direction: column; gap: 1px; }
.chat-selector-item-label { font-size: 13px; }
.chat-selector-item-desc { font-size: 11px; color: #9ca3af; }
.chat-model-menu { display: flex; flex-direction: column; gap: 2px; }
.chat-model-item { width: 100%; padding: 8px 10px; border: none; border-radius: 6px; background: none; cursor: pointer; text-align: left; font-size: 13px; color: #4b5563; }
.chat-model-item:hover { background: #f3f4f6; }
.chat-model-item.active { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.chat-model-item:disabled { opacity: 0.5; cursor: not-allowed; }
.chat-model-item:disabled:hover { background: none; }
.chat-composer-tag-btn.is-unconfigured { color: #dc2626; border-color: #fecaca; background: #fef2f2; }

.chat-send-btn { width: 34px; height: 34px; border: none; border-radius: 10px; background: #2563eb; color: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; }
.chat-send-btn:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
.chat-send-btn:disabled { background: #d1d5db; cursor: not-allowed; }
.chat-stop-btn { width: 34px; height: 34px; border: 2px solid #ef4444; border-radius: 10px; background: #fff; cursor: pointer; position: relative; }
.chat-stop-btn::after { content: ''; position: absolute; inset: 6px; background: #ef4444; border-radius: 3px; }

/* ── Agent 执行面板 ───────────────────────── */
.chat-exec-panel {
  position: fixed; right: 0; top: 0; bottom: 0; width: 320px; z-index: 4000;
  background: #fafbfc; border-left: 1px solid #e5e7eb;
  display: flex; flex-direction: column;
  box-shadow: -4px 0 24px rgba(0,0,0,0.06);
}
.chat-exec-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid #e5e7eb; background: #fff;
}
.chat-exec-title { font-weight: 600; font-size: 14px; color: #111827; }
.chat-exec-close { background: none; border: none; font-size: 20px; color: #9ca3af; cursor: pointer; line-height: 1; }
.chat-exec-close:hover { color: #374151; }
.chat-exec-body { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 14px; }
.chat-exec-model { display: flex; align-items: center; gap: 8px; }
.chat-exec-model-provider {
  padding: 2px 8px; border-radius: 6px; background: #eef2ff; color: #4f46e5;
  font-size: 12px; font-weight: 600;
}
.chat-exec-model-name { font-size: 13px; color: #4b5563; }
.chat-exec-status { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; }
.chat-exec-status-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.chat-exec-status-dot.running { background: #f59e0b; animation: execPulse 1s ease-in-out infinite; }
.chat-exec-status-dot.done { background: #10b981; }
.chat-exec-status-dot.error { background: #ef4444; }
.chat-exec-status-dot.idle { background: #d1d5db; }
@keyframes execPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
.chat-exec-sections { display: flex; gap: 6px; }
.chat-exec-section-chip {
  flex: 1; text-align: center; padding: 5px 4px; border-radius: 8px;
  background: #f3f4f6; color: #9ca3af; font-size: 12px; font-weight: 500;
  transition: all 0.25s;
}
.chat-exec-section-chip.active { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.chat-exec-step-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}
.chat-step-item {
  display: flex;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  transition: all 0.2s ease;
}
.chat-step-item.done {
  background: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.step-line-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  flex-shrink: 0;
}
.step-num-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat-step-item.done .step-num-dot {
  background: #dcfce7;
  color: #15803d;
}
.step-vertical-line {
  flex: 1;
  width: 2px;
  background: #e2e8f0;
  margin-top: 6px;
  min-height: 18px;
}
.step-card-content {
  flex: 1;
  min-width: 0;
}
.step-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.step-card-header strong {
  font-size: 12.5px;
  color: #1e293b;
}
.step-card-desc {
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}
.step-card-btn-wrap {
  margin-top: 8px;
}
.chat-mini-action-btn {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.chat-mini-action-btn:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}
.chat-exec-tools { display: flex; flex-direction: column; gap: 6px; }
.chat-exec-tool {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 8px;
  background: #fff; font-size: 12.5px; color: #374151;
}
.chat-exec-tool-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: #d1d5db; }
.chat-exec-tool.running .chat-exec-tool-dot { background: #f59e0b; animation: execPulse 1s ease-in-out infinite; }
.chat-exec-tool.done .chat-exec-tool-dot { background: #10b981; }
.chat-exec-tool-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-exec-tool-state { font-size: 11.5px; color: #9ca3af; flex-shrink: 0; }
.chat-exec-tool.running .chat-exec-tool-state { color: #d97706; }
.chat-exec-tool.done .chat-exec-tool-state { color: #059669; }
.chat-exec-empty { font-size: 12.5px; color: #9ca3af; line-height: 1.6; padding: 8px 2px; }

/* ── 事后复盘工作台（右侧固定面板） ── */
.chat-post-panel {
  position: fixed; right: 0; top: 0; bottom: 0; width: 380px; z-index: 4000;
  background: #f7f8fa; border-left: 1px solid #e5e7eb;
  box-shadow: -4px 0 24px rgba(0,0,0,0.06);
}
/* 窗口不够宽时先收工作台再谈正文：宁可工作台窄一点，也不把对话区挤到不可读 */
@media (max-width: 1360px) {
  .chat-main-expand.has-post { margin-right: 340px; width: calc(100vw - 260px - 340px); }
  .chat-main-shrink.has-post { margin-right: 340px; width: calc(100vw - 64px - 340px); }
  .chat-post-panel { width: 340px; }
}
@media (max-width: 1100px) {
  .chat-main-expand.has-post { margin-right: 300px; width: calc(100vw - 260px - 300px); }
  .chat-main-shrink.has-post { margin-right: 300px; width: calc(100vw - 64px - 300px); }
  .chat-post-panel { width: 300px; }
}

/* ── Debug Panel ───────────────────────────── */
.chat-debug-panel {
  position: fixed; right: 0; top: 0; bottom: 0; width: 380px; z-index: 5000;
  background: #fff; border-left: 1px solid #e5e7eb; display: flex; flex-direction: column;
  box-shadow: -4px 0 24px rgba(0,0,0,0.08); animation: slideIn 0.25s ease-out;
}
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
.chat-debug-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 14px; }
.chat-debug-panel-close { background: none; border: none; font-size: 20px; color: #6b7280; cursor: pointer; }
.chat-debug-panel-body { flex: 1; overflow-y: auto; padding: 12px 16px; }
.chat-debug-panel-body pre { white-space: pre-wrap; font-size: 13px; color: #374151; line-height: 1.5; margin: 0; font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; }

/* ── Toggle buttons ────────────────────────── */
.chat-toggle-float-btn {
  position: fixed; z-index: 9999; width: 44px; height: 44px; border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.08); background: #fff; color: #4b5563;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.25s ease; backdrop-filter: blur(12px);
}
.chat-toggle-float-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06); color: #6366f1; border-color: rgba(99,102,241,0.2); }
.chat-toggle-float-btn.is-chat-active { bottom: 24px; right: 24px; }
.chat-toggle-float-btn.is-debug { bottom: 80px; right: 24px; }
.chat-toggle-float-btn.is-debug.is-chat-active { color: #6366f1; border-color: rgba(99,102,241,0.2); }

/* ── Knowledge tab button in sidebar ──────── */
:deep(.chat-sidebar-tab-btn) {
  display: flex; align-items: center; justify-content: flex-start; gap: 8px;
  width: 100%; height: 38px; margin-top: 8px; padding: 0 12px;
  border: none; border-radius: 10px; background: transparent; color: #4b5563;
  font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s, color 0.15s;
  overflow: hidden; white-space: nowrap;
}
:deep(.chat-sidebar-tab-btn:hover) { background: #f3f4f6; color: #111827; }
:deep(.chat-sidebar-tab-btn.active) { background: #e5e7eb; color: #111827; }

@media (max-width: 768px) {
  .chat-main-expand { margin-left: 0; width: 100vw; }
  .chat-welcome { padding: 0 16px 48px; }
  .chat-welcome-text { font-size: 20px; }
  .chat-mode-option { min-width: 70px; padding: 10px 10px; font-size: 13px; gap: 4px; }
  .chat-preset-grid { grid-template-columns: 1fr; }
  .chat-messages-inner { padding: 8px 16px 20px; }
  .chat-input-area { padding: 0 16px 20px; }
  .chat-msg-body { max-width: 85%; }
  .chat-debug-panel { width: 100vw; }
}

.chat-param-badge {
  display: inline-block;
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: 4px;
  background: #0284c7;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
}
.chat-alert-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}
.chat-alert-banner.warning { background: #fef3c7; color: #92400e; }
.chat-alert-banner.success { background: #ecfdf5; color: #065f46; }
.chat-alert-banner.info { background: #eff6ff; color: #1e40af; }
.chat-alert-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; }
.chat-alert-dot.warning { background: #f59e0b; }
.chat-alert-dot.info { background: #3b82f6; }

.chat-mini-risk-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 6px 0 10px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}
.chat-mini-risk-grid dt { font-size: 11px; color: #64748b; margin: 0; }
.chat-mini-risk-grid dd { font-size: 12px; font-weight: 600; color: #1e293b; margin: 2px 0 0; }
.chat-mini-risk-grid .warn-text { color: #d97706; }
.chat-mini-risk-grid .danger-text { color: #dc2626; }
.chat-mini-risk-grid .safe-text { color: #16a34a; }
.chat-mini-risk-hint { font-size: 11.5px; color: #64748b; line-height: 1.5; margin: 4px 0 10px; }
.chat-param-empty dt { font-size: 11px; color: #64748b; }
.chat-param-empty dd { font-size: 12px; font-weight: 500; color: #334155; }
</style>
