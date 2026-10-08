<template>
  <div class="experiment-manager mid-stage-bg">
    <MidStagePageHeader
      title="实验管理"
      subtitle="提交、排队并跟踪铀供应链实验任务"
      :icon="Monitor"
    >
      <template #right>
        <el-tooltip
          :content="launchDisabledReason || '基于当前需求生成一组铀供应链实验任务'"
          placement="bottom"
        >
          <span class="launch-btn-wrap">
            <el-button
              type="primary"
              size="small"
              :disabled="!canLaunch || launching"
              :loading="launching"
              @click="launchCurrentSession"
            >
              <el-icon><VideoPlay /></el-icon>
              <span>启动实验</span>
            </el-button>
          </span>
        </el-tooltip>
        <el-button
          :type="showRunningSection ? 'danger' : 'default'"
          size="small"
          :disabled="!showRunningSection || stoppingExperiment"
          :loading="stoppingExperiment"
          @click="stopRunningExperiment"
        >
          <el-icon><Warning /></el-icon>
          <span>停止当前实验</span>
        </el-button>
        <el-button size="small" @click="createNewExperiment">
          <el-icon><Plus /></el-icon>
          <span>新建实验</span>
        </el-button>
        <!-- 案例分析挂在运行管理之下：这里是统一入口，选一个历史案例去核验当前焦点实验 -->
        <el-dropdown trigger="click" placement="bottom-end" @command="openCaseAnalysis">
          <el-button size="small" class="case-entry-btn">
            <el-icon><Reading /></el-icon>
            <span>案例分析</span>
            <el-icon class="case-entry-caret"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu class="case-entry-menu">
              <div class="case-entry-menu-head">选择案例，查看事件背景与实验结果</div>
              <el-dropdown-item
                v-for="item in caseLibrary"
                :key="item.id"
                :command="item"
                :class="{ 'is-research': item.status !== 'ready' }"
              >
                <span class="case-entry-item">
                  <b>{{ item.title }}</b>
                  <small>
                    <em :class="item.status === 'ready' ? 'ready' : 'research'">{{ item.status === 'ready' ? '可验证' : '调研中' }}</em>
                    {{ item.period }} · {{ item.category }}
                  </small>
                </span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
    </MidStagePageHeader>

    <!-- 选中实验快捷入口（替代原 MessageBox 弹窗） -->
    <SelectedExperimentBanner
      :visible="selectedExperimentBanner.visible"
      :experiment-id="selectedExperimentBanner.experimentId"
      :session-id="selectedExperimentBanner.sessionId"
      @dismiss="selectedExperimentBanner.visible = false"
    />

    <div v-if="showRunningSection || pendingTask" class="iteration-progress-section">
      <el-card shadow="never" class="progress-card">
        <template #header>
          <div class="progress-card-header">
            <span class="progress-title">当前实验迭代进度</span>
            <el-tag v-if="showRunningSection" type="success" size="small" effect="plain">进行中</el-tag>
            <el-tag v-else-if="pendingTask" type="warning" size="small" effect="plain">排队中</el-tag>
            <el-tag v-else type="info" size="small" effect="plain">空闲</el-tag>
          </div>
        </template>

        <div v-if="showRunningSection" class="run-progress-body">
          <div class="run-progress-caption">
            <strong>{{ truncateGoal(runningTask?.user_goal || '当前实验') }}</strong>
            <span>已运行 {{ formatDuration(liveElapsedSeconds) }}</span>
          </div>
          <el-progress :percentage="runningProgress.percentage || 0" :stroke-width="6" />
          <div class="run-progress-meta">
            <span>{{ progressGlyph }} {{ runningStageText }}</span>
            <span>第 {{ runningProgress.current_iteration || 0 }} / {{ runningProgress.total || '-' }} 轮</span>
            <span>预计剩余 {{ liveRemainingSeconds == null ? '估算中' : formatDuration(liveRemainingSeconds) }}</span>
          </div>
          <div class="monte-carlo-strip">
            <div class="mc-top">
              <span class="mc-tag">铀供应链多智能体仿真推演</span>
              <span class="mc-badge">{{ runningProgress.stage || '推演运行中' }}</span>
            </div>
            <div v-if="runningProgress.current_iteration" class="mc-detail">
              <span>当前迭代 <b>{{ runningProgress.current_iteration }} / {{ runningProgress.total || '?' }}</b> 轮</span>
              <span v-if="runningProgress.elapsed_time">已用时 <b>{{ Math.round(runningProgress.elapsed_time) }}s</b></span>
            </div>
          </div>
          <details v-if="progressAdjustmentRows.length || progressHint" class="run-progress-details">
            <summary>参数调整建议</summary>
            <p v-for="item in progressAdjustmentRows.slice(0, 3)" :key="item.key">{{ item.label }}：{{ item.current ?? '-' }} → {{ item.next || '-' }}</p>
            <p v-if="progressHint">{{ progressHint }}</p>
          </details>
        </div>
        <div v-else class="run-progress-body">
          <div class="run-progress-caption">
            <strong>{{ truncateGoal(pendingTask?.user_goal || '待执行实验') }}</strong>
            <span class="pending-pos-pill">队列第 {{ pendingPosition || 1 }} 位 · 排队中 (预计 ~35s)</span>
          </div>
          <div class="pending-task-bar">
            <p class="run-progress-meta">前序任务结束后将自动唤醒内核执行，或可手动提升调度优先级。</p>
            <el-button size="small" type="primary" plain @click="promoteTaskPriority(pendingTask)">
              <el-icon><Top /></el-icon>
              <span>优先插队调度</span>
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 俄乌冲突推演时序与自适应调度回溯带 -->
    <div class="ukraine-timeline-strip glass-panel">
      <div class="ut-head">
        <div class="ut-head-left">
          <span class="ut-badge">时序推演与关键决策</span>
          <strong>俄乌冲突与西方禁俄铀法案应对轨迹 (2022–2028)</strong>
        </div>
        <div class="ut-head-right">
          <el-button type="primary" size="small" @click="$router.push({ path: '/home/SCnet/interface', query: { ...$route.query, scenario: 'uranium', view: 'decision' } })">
            <span>查看 3 项应急调度令 ➔</span>
          </el-button>
        </div>
      </div>
      <div class="ut-steps-row">
        <div class="ut-step-item past">
          <div class="ut-step-dot danger"></div>
          <div class="ut-step-content">
            <span class="ut-year">2022 年</span>
            <strong>冲突爆发 · 现货暴涨</strong>
            <p>俄乌战事升级，恐慌抢单导致现货冲破 $85/lb，欧洲转运通道受阻。</p>
          </div>
        </div>
        <div class="ut-step-arrow">➔</div>
        <div class="ut-step-item current">
          <div class="ut-step-dot danger"></div>
          <div class="ut-step-content">
            <span class="ut-year">2024 年 (关键决策点)</span>
            <strong>禁俄令生效 · 储备削峰</strong>
            <p>现货达 $106/lb 极值。Agent 否决高位追涨，启动战略储备借调 400 tU。</p>
          </div>
        </div>
        <div class="ut-step-arrow">➔</div>
        <div class="ut-step-item future">
          <div class="ut-step-dot success"></div>
          <div class="ut-step-content">
            <span class="ut-year">2025–2028 年</span>
            <strong>海陆重构 · 韧性稳态</strong>
            <p>纳米比亚海运分流 55% 到港防城港，首炉装料 0 停堆，牛鞭效应平抑。</p>
          </div>
        </div>
      </div>
    </div>

    <details v-if="focusTask && focusIterationRows.length" class="focus-experiment-section" @toggle="showIterationDetails = $event.target.open">
      <summary>迭代结果 <span>{{ focusExperiment?.name || focusTask.user_goal }} · {{ focusIterationRows.length }} 条记录</span></summary>
      <UraniumExperimentFocusPanel
        v-if="showIterationDetails"
        :task="focusTask"
        :experiment="focusExperiment"
        :rows="focusIterationRows"
        :can-validate="focusTask.status === 'completed' && isUraniumTask(focusTask)"
        @view-config="openTaskConfigDialog(focusTask)"
        @view-experiment="viewExperiment(focusTask)"
        @validate-case="openCaseAnalysis(null, focusTask)"
      />
    </details>

    <div class="experiment-list">
      <el-card shadow="never" class="experiment-list-card">
        <template #header>
          <div class="list-card-header">
            <span class="list-title">推演任务列表</span>
            <div class="list-header-stats">
              <div class="overview-pill">
                <div class="overview-label">实验任务</div>
                <div class="overview-value">{{ overviewStats.plans }}</div>
              </div>
              <div class="overview-pill running">
                <div class="overview-label">运行中</div>
                <div class="overview-value">{{ overviewStats.running }}</div>
              </div>
              <div class="overview-pill pending">
                <div class="overview-label">排队中</div>
                <div class="overview-value">{{ overviewStats.pending }}</div>
              </div>
              <div class="overview-pill completed">
                <div class="overview-label">已完成</div>
                <div class="overview-value">{{ overviewStats.completed }}</div>
              </div>
            </div>
          </div>
        </template>

        <div class="ledger-toolbar">
          <div class="ledger-toolbar-main">
            <el-input
              v-model="ledgerQuery"
              class="ledger-search"
              clearable
              placeholder="搜索目标、任务 ID 或实验 ID"
              :prefix-icon="Search"
            />
            <el-select v-model="ledgerStatus" class="ledger-status-select" placeholder="全部状态">
              <el-option label="全部状态" value="all" />
              <el-option label="运行中" value="running" />
              <el-option label="排队中" value="pending" />
              <el-option label="已完成" value="completed" />
              <el-option label="失败" value="failed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-select v-model="ledgerSort" class="ledger-sort-select" :prefix-icon="Sort">
              <el-option label="最近创建" value="created_desc" />
              <el-option label="最早创建" value="created_asc" />
              <el-option label="状态优先" value="status" />
            </el-select>
          </div>
          <div class="ledger-toolbar-actions">
            <span class="ledger-result-count">
              显示 {{ filteredTaskRows.length }} / {{ displayTaskRows.length }} 条
            </span>
            <el-button type="primary" plain size="small" @click="strategyDialogVisible = true">
              <el-icon><Histogram /></el-icon>
              <span>方案策略对比</span>
            </el-button>
            <el-button text size="small" :disabled="!hasLedgerFilters" @click="resetLedgerFilters">
              清除筛选
            </el-button>
            <el-button text size="small" :loading="refreshing" @click="refreshLedger">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>

        <div v-if="displayTaskRows.length === 0" class="empty-list">
          <el-empty description="暂无实验任务" :image-size="100" />
        </div>
        <div v-else-if="filteredTaskRows.length === 0" class="empty-list filtered-empty">
          <el-empty description="没有匹配的实验任务" :image-size="80">
            <el-button type="primary" plain size="small" @click="resetLedgerFilters">清除筛选</el-button>
          </el-empty>
        </div>

        <template v-else>
          <div class="ledger-list">
            <article
              v-for="row in filteredTaskRows"
              :key="row.task_id"
              class="ledger-record"
              :class="[
                `status-${row.status}`,
                {
                  focus: focusTask?.task_id === row.task_id,
                  expanded: expandRowKeys.includes(row.task_id)
                }
              ]"
            >
              <div class="ledger-record-top">
                <div class="ledger-record-main">
                  <div class="ledger-record-meta">
                    <div class="ledger-meta-left">
                      <el-tag :type="getTaskStatusType(row.status)" size="small" effect="dark">
                        {{ getTaskStatusText(row.status) }}
                      </el-tag>
                      <span class="ledger-record-id mono" :title="row.task_id">{{ formatShortId(row.task_id) }}</span>
                    </div>
                    <span class="ledger-record-time">{{ getTaskLifecycleText(row) }}</span>
                  </div>
                  <h4 class="ledger-record-title" :title="row.user_goal">{{ truncateGoal(row.user_goal) }}</h4>
                  <div v-if="!isUraniumTask(row)" class="plan-chip-row">
                    <el-tag size="small" type="success" effect="plain" class="plan-chip" round>
                      {{ formatModelName(parseParams(row.params)?.model) }}
                    </el-tag>
                    <el-tag
                      v-if="parseParams(row.params)?.planner_strategy && !isNativePlanner(parseParams(row.params).planner_strategy)"
                      size="small"
                      type="warning"
                      effect="plain"
                      class="plan-chip"
                      round
                    >
                      {{ parseParams(row.params).planner_strategy }}
                    </el-tag>
                  </div>
                  <div v-else class="plan-chip-row uranium-lineage-row">
                    <el-tag size="small" :type="resolveStrategyInfo(row).tagType" effect="plain" class="strategy-badge-chip">
                      {{ resolveStrategyInfo(row).strategyName }}
                    </el-tag>
                    <span class="uranium-lineage-badge" :title="resolveStrategyInfo(row).desc">
                      {{ resolveStrategyInfo(row).specText }}
                    </span>
                    <button class="strategy-quick-link" type="button" @click.stop="strategyDialogVisible = true">
                      效果对比
                    </button>
                  </div>
                </div>
              </div>

              <div class="ledger-brief-row">
                <div class="ledger-brief-item">
                  <span>迭代轮数</span>
                  <strong>{{ getTaskIterationCount(row) }} 轮</strong>
                </div>
                <div v-if="row.status === 'running'" class="ledger-brief-item">
                  <span>当前进度</span>
                  <strong>{{ getRunningRoundLabel(row) }}</strong>
                </div>
                <div v-else-if="row.status === 'pending'" class="ledger-brief-item">
                  <span>队列位置</span>
                  <strong class="pending-pos-badge">第 {{ getPendingQueueIndex(row) || 1 }} 位 · 排队中</strong>
                </div>
              </div>

              <details v-if="row.status === 'running'" class="ledger-param-details">
                <summary>本轮参数与调整建议</summary>
                <div class="ledger-param-inline">
                  <div class="ledger-param-group">
                    <span class="ledger-param-label">本轮</span>
                    <span
                      v-for="item in getCurrentRoundParamChips(row).slice(0, 3)"
                      :key="`cur-inline-${item.key}`"
                      class="ledger-param-chip muted"
                    >
                      {{ item.key }}：{{ item.value }}
                    </span>
                    <span v-if="!getCurrentRoundParamChips(row).length" class="round-empty">等待启动</span>
                  </div>
                  <div class="ledger-param-group">
                    <span class="ledger-param-label next">下一轮</span>
                    <span
                      v-for="item in getNextRoundParamChips(row).slice(0, 3)"
                      :key="`next-inline-${item.key}`"
                      class="ledger-param-chip next"
                    >
                      {{ item.key }}：{{ item.value }}
                    </span>
                    <span v-if="!getNextRoundParamChips(row).length" class="round-empty">优化器计算中</span>
                  </div>
                </div>
              </details>

              <div v-else-if="row.status === 'completed'" class="ledger-inline-panel">
                <div v-if="getMetricsState(row) === 'loading'" class="metrics-loading">
                  <el-skeleton :rows="1" animated />
                </div>
                <div v-else-if="getMetricsState(row) === 'error'" class="metrics-error">指标读取失败</div>
                <div v-else-if="getMetricsState(row)" class="ledger-metric-inline">
                  <div
                    v-for="item in getMetricItems(row)"
                    :key="`${row.task_id}-metric-inline-${item.key}`"
                    class="ledger-metric-pill"
                    :class="item.tone"
                  >
                    <span class="ledger-metric-pill-label">{{ item.label }}</span>
                    <strong class="ledger-metric-pill-value">{{ item.valueText }}</strong>
                  </div>
                </div>
                <div v-else class="metrics-placeholder">-</div>
              </div>

              <div class="ledger-record-footer">
                <div class="ledger-footer-actions">
                  <el-button
                    v-if="row.status === 'completed'"
                    type="primary"
                    size="small"
                    link
                    @click.stop="viewExperiment(row)"
                  >
                    查看结果
                  </el-button>
                  <el-button
                    v-if="row.status === 'completed' && isUraniumTask(row)"
                    type="success"
                    size="small"
                    link
                    @click.stop="openCaseAnalysis(null, row)"
                  >
                    案例验证
                  </el-button>
                  <el-button
                    type="info"
                    size="small"
                    link
                    @click.stop="openTaskConfigDialog(row)"
                  >
                    查看配置
                  </el-button>
                  <el-button
                    v-if="row.status === 'pending'"
                    type="primary"
                    size="small"
                    link
                    @click.stop="promoteTaskPriority(row)"
                  >
                    优先插队
                  </el-button>
                  <el-button
                    v-if="row.status === 'pending'"
                    type="danger"
                    size="small"
                    link
                    @click.stop="cancelTask(row.task_id)"
                  >
                    取消排队
                  </el-button>
                  <el-button
                    v-if="row.status === 'failed'"
                    type="warning"
                    size="small"
                    link
                    @click.stop="showError(row)"
                  >
                    <el-icon><Warning /></el-icon> 查看错误
                  </el-button>
                </div>
                <el-button
                  size="small"
                  text
                  type="primary"
                  @click="toggleTaskExpansion(row)"
                >
                  <el-icon v-if="expandRowKeys.includes(row.task_id)"><ArrowUp /></el-icon>
                  <el-icon v-else><ArrowDown /></el-icon>
                  {{ expandRowKeys.includes(row.task_id) ? '收起日志' : '展开日志' }}
                </el-button>
              </div>

              <div v-if="expandRowKeys.includes(row.task_id)" class="ledger-expand-shell">
                <div v-if="taskIterationsMap[row.task_id] === 'loading'" class="ledger-expand-loading">
                  <el-skeleton :rows="3" animated />
                </div>
                <div v-else-if="taskIterationsMap[row.task_id] === 'error'" class="ledger-expand-error">
                  <span>迭代记录读取失败</span>
                  <el-button size="small" type="warning" link @click="loadIterationsForRow(row, true)">重试</el-button>
                </div>
                <div v-else-if="taskIterationsMap[row.task_id] === 'idle'" class="ledger-expand-empty">
                  排队中任务暂未产生迭代记录
                </div>
                <UraniumIterationTimeline
                  v-else-if="taskIterationsMap[row.task_id]?.kind === 'uranium'"
                  :rows="taskIterationsMap[row.task_id].rows || []"
                />
                <PlanIterationTimeline
                  v-else
                  :task="row"
                  :state="taskIterationsMap[row.task_id]"
                  :format-score="formatScore"
                  :format-rate="formatRate"
                  :format-integer="formatInteger"
                  :format-param-value="formatParamValue"
                  @retry="loadIterationsForRow(row, true)"
                  @view-round="openRoundDrawer"
                />
              </div>
            </article>
          </div>
        </template>
      </el-card>
    </div>

    <el-dialog
      v-model="taskConfigDialogVisible"
      title="实验参数配置"
      width="820px"
      destroy-on-close
      class="task-config-dialog"
    >
      <div class="task-config-dialog-body">
        <div class="task-config-hero">
          <div class="task-config-kicker-row">
            <span class="task-config-kicker">配置总览</span>
            <el-tag
              :type="getTaskStatusType(selectedTaskConfig.status)"
              size="small"
              effect="dark"
              class="hero-status-tag"
            >
              {{ selectedTaskConfig.statusText || '-' }}
            </el-tag>
          </div>
          <div class="hero-goal-row">
            <el-icon class="hero-goal-icon"><Aim /></el-icon>
            <div class="hero-goal-text">{{ selectedTaskConfig.goal || '未指定目标' }}</div>
          </div>

          <div class="hero-meta-grid">
            <div class="hero-meta-card">
              <span class="hero-meta-label">任务 ID</span>
              <div class="hero-meta-main">
                <span class="hero-meta-value mono" :title="selectedTaskConfig.taskId">{{ selectedTaskConfig.taskId || '-' }}</span>
                <el-tooltip content="复制" placement="top">
                  <el-icon class="hero-copy-btn" @click="copyTaskConfigId"><CopyDocument /></el-icon>
                </el-tooltip>
              </div>
            </div>
            <div class="hero-meta-card">
              <span class="hero-meta-label">创建于</span>
              <span class="hero-meta-value">{{ selectedTaskConfig.createdAtText || '-' }}</span>
            </div>
          </div>
        </div>

        <div v-if="selectedTaskConfig.coreItems.length" class="task-config-section task-config-overview">
          <div class="section-header">
            <el-icon class="section-header-icon"><Setting /></el-icon>
            <span class="section-header-title">核心参数</span>
            <span class="section-header-count">{{ selectedTaskConfig.coreItems.length }} 项</span>
          </div>
          <div class="core-param-grid task-config-overview-grid">
            <div
              v-for="item in selectedTaskConfig.coreItems"
              :key="item.key"
              class="core-param-card"
            >
              <div class="core-param-label">{{ item.label }}</div>
              <div class="core-param-value mono">{{ item.value }}</div>
            </div>
          </div>
        </div>

        <div v-if="selectedTaskConfig.entityParamRows.length" class="task-config-section">
          <div class="section-header">
            <el-icon class="section-header-icon"><Connection /></el-icon>
            <span class="section-header-title">智能体参数</span>
            <span class="section-header-count">{{ selectedTaskConfig.entityParamRows.length }} 项</span>
          </div>
          <div class="task-config-table-shell">
            <el-table
              class="task-config-table"
              :data="selectedTaskConfig.entityParamRows"
              size="small"
              stripe
              max-height="320"
              empty-text="暂无实体参数"
            >
              <el-table-column prop="entityName" label="实体" width="120" />
              <el-table-column prop="methodName" label="业务能力" width="120" show-overflow-tooltip />
              <el-table-column prop="paramLabel" label="参数" width="150" show-overflow-tooltip />
              <el-table-column prop="recommendedRange" label="建议范围" width="140" />
              <el-table-column label="当前值" min-width="160">
                <template #default="{ row }">
                  <span class="task-config-param-value">{{ row.paramValue }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <div v-if="selectedTaskConfig.otherItems.length" class="task-config-section">
          <div class="section-header">
            <el-icon class="section-header-icon"><More /></el-icon>
            <span class="section-header-title">其他参数</span>
            <span class="section-header-count">{{ selectedTaskConfig.otherItems.length }} 项</span>
          </div>
          <div class="other-param-grid">
            <div
              v-for="row in selectedTaskConfig.otherItems"
              :key="row.key"
              class="other-param-card"
              :class="{ complex: row.isComplex }"
            >
              <div class="other-param-label">{{ row.label }}</div>
              <pre v-if="row.isComplex" class="task-config-json compact">{{ row.pretty }}</pre>
              <div v-else class="other-param-value mono">{{ row.value }}</div>
            </div>
          </div>
        </div>

        <el-empty
          v-if="!selectedTaskConfig.coreItems.length
            && !selectedTaskConfig.entityParamRows.length
            && !selectedTaskConfig.otherItems.length"
          description="暂无任何参数配置"
          :image-size="80"
        />
      </div>
      <template #footer>
        <el-button @click="taskConfigDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <IterationDetailDrawer
      v-model="roundDrawerVisible"
      :row="selectedRound"
      :format-score="formatScore"
      :format-param-value="formatParamValue"
    />

    <!-- 预设多目标策略方案横向对比弹窗 -->
    <el-dialog
      v-model="strategyDialogVisible"
      title="预设多目标策略效果对比"
      width="780px"
      append-to-body
      class="strategy-dialog"
    >
      <div class="strategy-compare-head">
        <p>系统针对天然铀供需扰动提供 4 类基准优化策略，不同策略在保供刚性、采购成本与通道分流之间进行了多目标权衡：</p>
      </div>
      <el-table :data="STRATEGY_PRESETS_TABLE" border size="default" class="strategy-compare-table">
        <el-table-column prop="name" label="策略方案" width="150">
          <template #default="{ row }">
            <div class="dialog-strategy-title">
              <strong>{{ row.name }}</strong>
              <el-tag size="small" :type="row.tagType" effect="plain">{{ row.typeName }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="focus" label="核心调度举措" min-width="220" show-overflow-tooltip />
        <el-table-column prop="tripRisk" label="停堆断料风险" width="120" align="center">
          <template #default="{ row }">
            <span :class="row.tripRisk === '0.0%' ? 'safe-text' : 'warn-text'" style="font-weight: 700;">{{ row.tripRisk }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="cifCost" label="完全到岸成本" width="140" align="center">
          <template #default="{ row }">
            <span class="mono">{{ row.cifCost }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="scenarioFit" label="适用场景" width="150" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button type="primary" @click="strategyDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScnetSupplyChainStore as useSupplyChainStore } from '@/stores/scnet'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import {
  Plus,
  Warning,
  Monitor,
  VideoPlay,
  Aim,
  Setting,
  Connection,
  More,
  CopyDocument,
  Search,
  Sort,
  Refresh,
  Reading,
  ArrowDown,
  ArrowUp,
  Histogram,
  Top
} from '@element-plus/icons-vue'
import './components/shared/midStage.css'
import MidStagePageHeader from './components/shared/MidStagePageHeader.vue'
import SelectedExperimentBanner from './components/SelectedExperimentBanner.vue'
import PlanIterationTimeline from './components/PlanIterationTimeline.vue'
import UraniumExperimentFocusPanel from './components/UraniumExperimentFocusPanel.vue'
import UraniumIterationTimeline from './components/UraniumIterationTimeline.vue'
import IterationDetailDrawer from './components/IterationDetailDrawer.vue'
import { useUraniumDuringStore } from '@/stores/scnet/useUraniumDuringStore'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { URANIUM_CASE_LIBRARY, getReadyCases } from '@/views/SCnet/mock/uraniumCaseLibrary'
import {
  formatUraniumMetricValue
} from '@/utils/uraniumDuringAdapter'
import {
  getTaskParams,
  isUraniumTask,
  normalizeScenarioName,
  parseTaskParams as parseParams,
  resolveExperimentIdFromTask
} from '@/utils/scnetTaskUtils'

const router = useRouter()
const route = useRoute()
const store = useSupplyChainStore()
const uraniumStore = useUraniumDuringStore()
const demoStore = useUraniumDemoStore()

const strategyDialogVisible = ref(false)

const STRATEGY_PRESETS_TABLE = [
  {
    name: '保供优先',
    typeName: '核安全兜底',
    tagType: 'success',
    focus: '现货限额+20%~35%，海运配额55%，紧急借调陕西战略储备200 tU',
    tripRisk: '0.0%',
    cifCost: '$254.20/kgU (+6.5%)',
    scenarioFit: '下游机组集中投产装料、海外主力矿山突发减产'
  },
  {
    name: '平衡方案',
    typeName: '多目标均衡',
    tagType: 'primary',
    focus: '长协85%，现货15%，连云港/防城港海运40%，陆运60%',
    tripRisk: '2.1%',
    cifCost: '$246.80/kgU (基准)',
    scenarioFit: '常态化日常运行、一般性季节性波动'
  },
  {
    name: '成本优先',
    typeName: '采购控本',
    tagType: 'warning',
    focus: '现货限价在 $80/lb 以下，拒绝高运费专线，依靠基地间库存横向转运',
    tripRisk: '6.5%',
    cifCost: '$238.50/kgU (-5.2%)',
    scenarioFit: '国际现货原料非理性暴涨、国内库存高位时的平抑策略'
  },
  {
    name: '冲击响应',
    typeName: '极端压力测试',
    tagType: 'danger',
    focus: '模拟中哈陆路通量-30%，远洋海运专线顶格分流70%，借调储备600 tU',
    tripRisk: '0.8%',
    cifCost: '$268.00/kgU (+12%)',
    scenarioFit: '边境陆运口岸突发关停或地缘中断的极限抗毁测试'
  }
]

function resolveStrategyInfo(row) {
  const goal = (row?.user_goal || '').toLowerCase()
  const rawTag = (row?.lineage_tag || '').replace(/^\[对比基准:\s*|\]$/g, '').trim()
  
  if (goal.includes('保供') || rawTag.includes('现货限额+20%') || rawTag.includes('保供')) {
    return {
      strategyName: '保供优先',
      typeName: '保供型',
      tagType: 'success',
      specText: rawTag || '现货限额+20% · 海运配额55% · 启用战略储备',
      desc: '核安全刚性保障，停堆断料风险 0.0%'
    }
  }
  if (goal.includes('成本') || rawTag.includes('80/lb') || rawTag.includes('成本')) {
    return {
      strategyName: '成本优先',
      typeName: '控本型',
      tagType: 'warning',
      specText: rawTag || '现货限价$80/lb · 陆运占比65% · 压降安全库存',
      desc: '严控采购均价，节省完全成本约 5.2%'
    }
  }
  if (goal.includes('冲击') || goal.includes('扰动') || rawTag.includes('-30%')) {
    return {
      strategyName: '冲击响应',
      typeName: '冲击型',
      tagType: 'danger',
      specText: rawTag || '模拟中哈陆路-30%扰动 · 跨基地横向调拨',
      desc: '地缘口岸中断极限压力测试'
    }
  }
  return {
    strategyName: '平衡方案',
    typeName: '均衡型',
    tagType: 'primary',
    specText: rawTag || '长协85% · 现货15% · 安全库存1.5年 · 三港口分流',
    desc: '兼顾完全到岸成本与安全库存均衡最优'
  }
}

const promoteTaskPriority = (task) => {
  if (!task) return
  ElMessage.success({
    message: `已将任务 [${task.task_id || '当前任务'}] 提升至调度队列首位，内核已优先分配仿真槽位！`,
    duration: 3000
  })
}

// 典型验证案例：案例分析挂在运行管理之下（工作台 ?view=case&case=<id>）。
// 入口有三处：页头「案例验证」下拉、焦点实验面板、台账中已完成实验的行操作。
// 带 task 进入时先把该实验加载为对照实验，案例页直接用它核验。
const caseLibrary = URANIUM_CASE_LIBRARY
const openCaseAnalysis = async (item = null, task = null) => {
  const caseDef = item?.id ? item : getReadyCases()[0]
  if (!caseDef?.id) return
  if (task && isUraniumTask(task)) {
    const experimentId = resolveExperimentIdFromTask(task)
    if (experimentId) {
      try {
        await demoStore.loadExperiment(experimentId)
        store.setCurrentExperimentId(experimentId)
        if (task.session_id) store.setCurrentSessionId(task.session_id)
      } catch (error) {
        console.warn('[ExperimentManager] 加载对照实验失败:', error?.message || error)
      }
    }
  }
  router.push({ query: { ...route.query, view: 'case', case: caseDef.id } })
}

// 选中实验快捷入口 banner（替代原 MessageBox 阻塞弹窗）
const selectedExperimentBanner = reactive({
  visible: false,
  experimentId: '',
  sessionId: '',
  taskId: ''
})

const recentQueuedTaskId = ref(localStorage.getItem('sc_recentQueuedTaskId') || '')

const runningProgress = ref({
  is_running: false,
  status: 'idle',
  completed: 0,
  total: 0,
  current_iteration: 0,
  elapsed_time: 0,
  estimated_remaining: null,
  percentage: 0,
  current_task: '',
  current_parameters: null,
  next_parameters: null,
  current_param_items: [],
  next_param_items: []
})
const progressHint = ref('')

// ── 运行中态的实时计时与字形轮转（参考 MACE 对话页 spinner） ──
const PROGRESS_GLYPHS = ['✽', '✢', '✦', '✧']
const progressGlyphIdx = ref(0)
const progressGlyph = computed(() => PROGRESS_GLYPHS[progressGlyphIdx.value] || '✽')
const liveTickSeconds = ref(0)
let liveTimer = null
let liveAnchorAt = 0

const liveElapsedSeconds = computed(() => {
  const base = Number(runningProgress.value.elapsed_time || 0)
  return Math.max(0, Math.round(base + liveTickSeconds.value))
})
const liveRemainingSeconds = computed(() => {
  const est = runningProgress.value.estimated_remaining
  if (est == null || !Number.isFinite(Number(est))) return null
  return Math.max(0, Math.round(Number(est) - liveTickSeconds.value))
})

const formatDuration = (seconds) => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m < 60) return `${m}m ${sec}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

const startLiveTicker = () => {
  if (liveTimer) return
  liveAnchorAt = Date.now()
  liveTickSeconds.value = 0
  liveTimer = setInterval(() => {
    liveTickSeconds.value = (Date.now() - liveAnchorAt) / 1000
    progressGlyphIdx.value = (progressGlyphIdx.value + 1) % PROGRESS_GLYPHS.length
  }, 1000)
}
const stopLiveTicker = () => {
  if (liveTimer) clearInterval(liveTimer)
  liveTimer = null
  liveTickSeconds.value = 0
}

const taskConfigDialogVisible = ref(false)
const selectedTaskConfig = ref({
  taskId: '',
  status: '',
  statusText: '',
  createdAtText: '',
  goal: '',
  coreItems: [],
  entityParamRows: [],
  otherItems: []
})

// 逐轮详情抽屉
const roundDrawerVisible = ref(false)
const selectedRound = ref(null)
const openRoundDrawer = (row) => {
  selectedRound.value = row
  roundDrawerVisible.value = true
}

const currentUraniumExperimentId = computed(() => demoStore.selectedExperimentId)
const taskHistory = computed(() => demoStore.taskRows || [])
const uraniumHistory = computed(() => demoStore.history || [])
const ledgerQuery = ref('')
const ledgerStatus = ref('all')
const ledgerSort = ref('created_desc')
const refreshing = ref(false)

const uraniumQueueRows = computed(() => (
  taskHistory.value.filter((item) => isUraniumTask(item) && item.status !== 'completed')
))

const uraniumHistoryRows = computed(() => (
  uraniumHistory.value.map((item) => ({
    task_id: item.task_id || `uranium-${item.experiment_id}`,
    experiment_id: item.experiment_id,
    session_id: item.session_id || '',
    user_goal: item.name || item.description || `铀场景实验 · ${item.preset_name || item.template_name || 'baseline'}`,
    status: item.status || 'completed',
    created_at: item.created_at || item.completed_at,
    started_at: item.started_at || item.completed_at,
    completed_at: item.completed_at,
    error_message: item.error_message || null,
    result_path: item.result_path || item.result_relpath || '',
    params: {
      scenario: 'uranium',
      preset_name: item.preset_name || item.template_name || 'baseline',
      optimization_iterations: item.optimization_iterations ?? 1,
      experiment_id: item.experiment_id
    },
    summary: item.summary || {},
    scenario_context: item.scenario_context || {},
    lineage_tag: item.lineage_tag || item.summary?.lineage_tag || ''
  }))
))

const displayTaskRows = computed(() => {
  const inFlightRows = uraniumQueueRows.value.map((item) => {
    const experimentId = resolveExperimentIdFromTask(item)
    return {
      ...item,
      experiment_id: experimentId || item.experiment_id || item.experimentId || ''
    }
  })

  return [
    ...inFlightRows,
    ...uraniumHistoryRows.value.filter((item) => {
      if (!item.experiment_id) return true
      return !inFlightRows.some((queueItem) => queueItem.experiment_id && queueItem.experiment_id === item.experiment_id)
    })
  ]
})

const filteredTaskRows = computed(() => {
  const query = ledgerQuery.value.trim().toLowerCase()
  const status = ledgerStatus.value
  const statusOrder = { running: 0, pending: 1, failed: 2, completed: 3, cancelled: 4 }
  return displayTaskRows.value
    .filter((row) => {
      if (status !== 'all' && row.status !== status) return false
      if (!query) return true
      return [
        row.user_goal,
        row.task_id,
        row.experiment_id,
        resolveExperimentIdFromTask(row)
      ].some((value) => String(value || '').toLowerCase().includes(query))
    })
    .sort((a, b) => {
      if (ledgerSort.value === 'status') {
        return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      }
      const aTime = new Date(a.created_at || 0).getTime()
      const bTime = new Date(b.created_at || 0).getTime()
      return ledgerSort.value === 'created_asc' ? aTime - bTime : bTime - aTime
    })
})

const hasLedgerFilters = computed(() => (
  Boolean(ledgerQuery.value.trim()) || ledgerStatus.value !== 'all' || ledgerSort.value !== 'created_desc'
))

const resetLedgerFilters = () => {
  ledgerQuery.value = ''
  ledgerStatus.value = 'all'
  ledgerSort.value = 'created_desc'
}

const runningTask = computed(() => {
  return uraniumQueueRows.value.find(t => t.status === 'running') || null
})

const pendingTask = computed(() => {
  const pendingRows = uraniumQueueRows.value.filter(t => t.status === 'pending')
  if (!pendingRows.length) return null
  if (recentQueuedTaskId.value) {
    const hit = pendingRows.find(t => t.task_id === recentQueuedTaskId.value)
    if (hit) return hit
  }
  return pendingRows[0]
})

const pendingPosition = computed(() => {
  if (!pendingTask.value) return null
  const pendingRows = uraniumQueueRows.value
    .filter(t => t.status === 'pending')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const idx = pendingRows.findIndex(t => t.task_id === pendingTask.value.task_id)
  return idx >= 0 ? idx + 1 : null
})

const showRunningSection = computed(() => {
  return Boolean(runningProgress.value.is_running || runningTask.value)
})

const showIterationDetails = ref(false)
const focusTask = computed(() => {
  const selectedExperimentId = currentUraniumExperimentId.value
  return displayTaskRows.value.find((item) => resolveExperimentIdFromTask(item) === selectedExperimentId)
    || runningTask.value
    || pendingTask.value
    || displayTaskRows.value.find((item) => item.status === 'completed')
    || displayTaskRows.value[0]
    || null
})

const focusExperiment = computed(() => {
  if (!focusTask.value) return demoStore.selectedExperiment || null
  return demoStore.getExperimentByTask(focusTask.value) || demoStore.selectedExperiment || null
})

const focusIterationRows = computed(() => {
  if (!focusTask.value) return []
  const state = taskIterationsMap.value[focusTask.value.task_id]
  if (state && typeof state === 'object' && state.kind === 'uranium') {
    return state.rows || []
  }
  return demoStore.getTaskIterations(focusTask.value) || []
})

const progressAdjustmentRows = computed(() => {
  const currentItems = runningProgress.value.current_param_items || []
  const nextItems = runningProgress.value.next_param_items || []
  const nextMap = new Map(nextItems.map((item) => [String(item.key), item.value]))
  const currentMap = new Map(currentItems.map((item) => [String(item.key), item.value]))
  const keys = [...new Set([...currentMap.keys(), ...nextMap.keys()])]
  return keys.slice(0, 4).map((key) => ({
    key,
    label: formatProgressParamLabel(key),
    current: currentMap.has(key) ? String(currentMap.get(key)) : null,
    next: nextMap.has(key) ? String(nextMap.get(key)) : null
  }))
})

const runningStageText = computed(() => {
  const txt = String(runningProgress.value.current_task || '').trim()
  const cur = Number(runningProgress.value.current_iteration || 0)
  const total = Number(runningProgress.value.total || 0)
  if (!showRunningSection.value) return '-'
  if (!txt) return cur > 0 && total > 0 ? `第 ${cur}/${total} 轮执行中` : '任务已启动，等待第一轮进度'
  if (txt.includes('准备中')) {
    return cur > 0 && total > 0
      ? `第 ${cur}/${total} 轮执行中（仿真计算与评估）`
      : '初始化中'
  }
  return txt
})

const formatModelName = (model) => {
  const nameMap = {
    qwen: 'Qwen', deepseek: 'DeepSeek', kimi: 'Kimi', glm: 'GLM'
  }
  return nameMap[model] || model || '-'
}

const taskIterationsMap = ref({})
const iterationFetchInflight = new Set()
const expandRowKeys = ref([])

const clampPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0))

const getMetricItems = (row) => {
  const m = experimentMetricsMap.value[row.task_id]
  if (!m || typeof m !== 'object') return []

  if (m.scenario === 'uranium') {
    const riskPct = Number(m.avg_risk_exposure)
    const inventoryYears = Number(m.final_inventory_coverage_years)
    const avgCost = Number(m.avg_cost_usd_kgU)
    return [
      {
        key: 'cost',
        label: '成本',
        tone: 'primary',
        pct: clampPercent(avgCost / 6),
        valueText: formatUraniumMetricValue('avg_cost_usd_kgU', m.avg_cost_usd_kgU)
      },
      {
        key: 'risk',
        label: '风险暴露',
        tone: 'warning',
        pct: clampPercent(riskPct <= 1 ? riskPct * 100 : riskPct),
        valueText: formatUraniumMetricValue('avg_risk_exposure', m.avg_risk_exposure)
      },
      {
        key: 'inventory',
        label: '库存',
        tone: 'success',
        pct: clampPercent(inventoryYears * 20),
        valueText: formatUraniumMetricValue('final_inventory_coverage_years', m.final_inventory_coverage_years)
      }
    ]
  }

  const completion = Number(m.completion_rate)
  const score = Number(m.overall_score)
  const profit = Number(m.total_net_profit)
  return [
    {
      key: 'completion',
      label: '完成率',
      tone: 'success',
      pct: clampPercent(completion > 1 ? completion : completion * 100),
      valueText: Number.isNaN(completion) ? '-' : `${(completion > 1 ? completion : completion * 100).toFixed(1)}%`
    },
    {
      key: 'score',
      label: '得分',
      tone: 'warning',
      pct: clampPercent(score > 1 ? score : score * 100),
      valueText: Number.isNaN(score) ? '-' : score.toFixed(3)
    },
    {
      key: 'profit',
      label: '净利润',
      tone: 'primary',
      pct: clampPercent(profit / 20000),
      valueText: Number.isNaN(profit) ? '-' : formatInteger(profit)
    }
  ]
}

const overviewStats = computed(() => ({
  plans: displayTaskRows.value.length,
  running: uraniumQueueRows.value.filter(t => t.status === 'running').length,
  completed: uraniumHistoryRows.value.length,
  pending: uraniumQueueRows.value.filter(t => t.status === 'pending').length
}))

const PARAM_LABEL_MAP = {
  model: '模型',
  planner_strategy: '策略',
  iterations: '迭代轮数',
  optimization_iterations: '优化轮次',
  lead_time: '交期',
  safety_stock: '安全库存',
  reorder_point: '再订货点',
  order_qty: '订货量',
  service_level: '服务水平',
  demand_factor: '需求系数',
  inventory_target_years: '库存目标年限',
  long_term_contract_weight: '长协供给权重',
  port_diversification_weight: '港口分散度'
}

const formatParamKeyLabel = (key) => PARAM_LABEL_MAP[key] || key
const formatProgressParamLabel = (key) => {
  const labelMap = {
    inventory_target_years: '库存目标年限',
    long_term_contract_weight: '长协供给权重',
    port_diversification_weight: '港口分散度'
  }
  return labelMap[key] || formatParamKeyLabel(key)
}

const getTaskIterationCount = (task) => {
  const params = getTaskParams(task)
  return params.optimization_iterations ?? params.iterations ?? '-'
}

const getPendingQueueIndex = (task) => {
  if (!task?.task_id) return null
  const pendingRows = uraniumQueueRows.value
    .filter(t => t.status === 'pending')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const idx = pendingRows.findIndex(t => t.task_id === task.task_id)
  return idx >= 0 ? idx + 1 : null
}

const getRunningRoundLabel = (task) => {
  if (!task || task.status !== 'running') return '-'
  if (runningTask.value?.task_id === task.task_id) {
    return `${runningProgress.value.current_iteration || 0} / ${runningProgress.value.total || '-'}`
  }
  return '运行中'
}

const getNextRoundParamChips = (row) => {
  if (row.status !== 'running' && row.status !== 'pending') return []
  if (row.status === 'running' && runningTask.value && row.task_id === runningTask.value.task_id) {
    return (runningProgress.value.next_param_items || []).map((item) => ({
      ...item,
      key: formatProgressParamLabel(item.key)
    }))
  }
  const params = parseParams(row.params) || {}
  const adj = params.adjusted_param
  const items = []
  if (adj && typeof adj === 'object' && !Array.isArray(adj)) {
    Object.entries(adj).slice(0, 3).forEach(([k, v]) => {
      items.push({ key: formatParamKeyLabel(k), value: formatParamValue(v) })
    })
  } else if (Array.isArray(adj)) {
    adj.slice(0, 3).forEach(k => {
      items.push({ key: formatParamKeyLabel(k), value: formatParamValue(params[k]) })
    })
  }
  return items
}

const getCurrentRoundParamChips = (row) => {
  if (row.status !== 'running') return []
  if (runningTask.value && row.task_id === runningTask.value.task_id) {
    return (runningProgress.value.current_param_items || []).map((item) => ({
      ...item,
      key: formatProgressParamLabel(item.key)
    }))
  }
  return []
}

const toggleTaskExpansion = (row) => {
  const key = row.task_id
  if (expandRowKeys.value.includes(key)) {
    expandRowKeys.value = expandRowKeys.value.filter((item) => item !== key)
    return
  }
  expandRowKeys.value = [...expandRowKeys.value, key]
  loadIterationsForRow(row)
}

const loadIterationsForRow = async (task, force = false) => {
  const key = task.task_id
  const cached = taskIterationsMap.value[key]
  if (!force && iterationFetchInflight.has(key)) return
  if (!force && cached && cached !== 'loading' && cached !== 'error' && cached !== 'idle') return
  if (task.status === 'pending') {
    taskIterationsMap.value = { ...taskIterationsMap.value, [key]: 'idle' }
    return
  }
  iterationFetchInflight.add(key)
  taskIterationsMap.value = { ...taskIterationsMap.value, [key]: 'loading' }
  try {
    const payload = await fetchTaskIterationData(task)
    taskIterationsMap.value = {
      ...taskIterationsMap.value,
      [key]: payload.kind === 'uranium' ? payload : (payload.rows || [])
    }
  } catch (err) {
    console.error('[ExperimentManager] loadIterationsForRow failed', err)
    taskIterationsMap.value = { ...taskIterationsMap.value, [key]: 'error' }
  } finally {
    iterationFetchInflight.delete(key)
  }
}

const truncateGoal = (goal) => {
  if (!goal) return '未指定目标'
  const cleaned = goal.replace(/^【[^】]+】/, '')
  return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned
}

const getTaskStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    running: 'primary',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return typeMap[status] || 'info'
}

const getTaskStatusText = (status) => {
  const textMap = {
    pending: '排队中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return textMap[status] || status
}

const formatShortId = (value) => {
  const text = String(value || '').trim()
  if (!text) return '-'
  if (text.length <= 18) return text
  return `${text.slice(0, 10)}...${text.slice(-4)}`
}

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  const utcTimestamp = timestamp.replace(' ', 'T') + 'Z'
  const date = new Date(utcTimestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 0 || diff > 30 * 24 * 3600000) {
    return date.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}天前`

  return date.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

const getTaskLifecycleText = (task) => {
  if (!task) return '-'
  if (task.status === 'running') {
    return `已于 ${formatTime(task.started_at || task.created_at)} 启动`
  }
  if (task.status === 'pending') {
    return `创建于 ${formatTime(task.created_at)}，等待调度`
  }
  if (task.status === 'completed') {
    return `完成于 ${formatTime(task.completed_at || task.created_at)}`
  }
  if (task.status === 'failed') {
    return `失败于 ${formatTime(task.completed_at || task.created_at)}`
  }
  if (task.status === 'cancelled') {
    return `已于 ${formatTime(task.completed_at || task.created_at)} 取消`
  }
  return `创建于 ${formatTime(task.created_at)}`
}

const formatScore = (score) => {
  if (score == null || Number.isNaN(Number(score))) return '-'
  return Number(score).toFixed(3)
}

const formatRate = (rate) => {
  if (rate == null || Number.isNaN(Number(rate))) return '-'
  const value = Number(rate)
  if (value <= 1) return `${(value * 100).toFixed(1)}%`
  return `${value.toFixed(1)}%`
}

const isNativePlanner = (plannerStrategy) => {
  return String(plannerStrategy || '').trim().toLowerCase() === 'native'
}

const formatInteger = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return Math.round(Number(value)).toLocaleString('zh-CN')
}

const formatParamValue = (value) => {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const simpleList = value.every(v => ['string', 'number', 'boolean'].includes(typeof v))
    if (simpleList && value.length <= 6) {
      return `[${value.map(v => typeof v === 'number' ? Number(v).toFixed(2) : String(v)).join(', ')}]`
    }
    return `数组(${value.length})`
  }
  if (typeof value === 'number') {
    return Number(value).toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
  }
  if (value && typeof value === 'object') {
    return `对象(${Object.keys(value).length})`
  }
  return String(value)
}

const getScenarioDisplayLabel = (value) => {
  const scenario = normalizeScenarioName(value)
  if (scenario === 'uranium') return '铀供应链'
  if (scenario === 'automotive') return '汽车供应链'
  return String(value || '-')
}

const getPresetDisplayLabel = (value) => {
  const presetName = String(value || '').trim()
  const labelMap = {
    baseline: '基准实验',
    balanced: '平衡方案',
    feedback_optimization: '反馈优化',
    security_first: '保供优先',
    cost_first: '成本优先',
    shock_response: '冲击响应',
    historical_replay: '历史复现',
    extreme_shock: '极端冲击'
  }
  return labelMap[presetName] || presetName || '-'
}

const formatConfigDisplayValue = (key, value) => {
  if (key === 'scenario') return getScenarioDisplayLabel(value)
  if (key === 'preset_name' || key === 'template_name') return getPresetDisplayLabel(value)
  if (key === 'optimization_iterations' || key === 'iterations') {
    const rounds = Number(value)
    return Number.isFinite(rounds) ? `${rounds} 轮` : formatParamValue(value)
  }
  if (key === 'start_year' || key === 'end_year') {
    return value != null ? `${value} 年` : '-'
  }
  return formatParamValue(value)
}

const formatRangeText = (minValue, maxValue) => {
  if (minValue == null || maxValue == null) return '-'
  return `${formatParamValue(minValue)} ~ ${formatParamValue(maxValue)}`
}

const normalizeParamObject = (raw) => {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const prettifyParamValue = (value) => {
  if (value == null) return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const paramKeyLabelMap = {
  scenario: '实验场景',
  iterations: '迭代轮次',
  optimization_iterations: '迭代轮次',
  model: '模型',
  preset_name: '策略取向',
  template_name: '策略取向',
  start_year: '起始年',
  end_year: '结束年',
  starting_price_usd_per_lb: '起始铀价',
  event_severity_multiplier: '事件强度系数',
  secondary_supply_multiplier: '二级供给系数',
  forced_event_names: '强制事件',
  suppressed_event_names: '抑制事件',
  synthetic_events: '附加事件',
  policy_profiles: '策略画像',
  planner_strategy: '规划策略',
  use_decompose: '启用目标拆解',
  user_goal: '用户目标',
  goal_decomposition_subtasks: '目标拆解子任务',
  subtask_variable_configs: '子任务变量配置',
  agent_models: 'Agent 模型配置'
}

const getParamLabel = (key) => {
  return paramKeyLabelMap[key] || key
}

const getAgentBlueprintMap = () => {
  const map = {}
  const catalog =
    store.setAgentsResult?.parameter_catalog ||
    store.scenarioApiResult?.parameter_catalog ||
    null
  const agents = Array.isArray(catalog?.agent_graph?.agents)
    ? catalog.agent_graph.agents
    : []

  for (const agent of agents) {
    if (!agent?.id) continue
    const params = Array.isArray(agent.configurableParams)
      ? agent.configurableParams
      : Array.isArray(agent.configurable_params)
        ? agent.configurable_params
        : []
    map[agent.id] = {
      name: agent.name || agent.id,
      defaultMethod: agent.defaultMethod || '-',
      paramMap: Object.fromEntries(params.map((param) => [param.key, param]))
    }
  }

  return map
}

const buildEntityParamRows = (params) => {
  const nodeConfigs = params?.agent_node_configs
  if (!nodeConfigs || typeof nodeConfigs !== 'object') return []
  const agentBlueprintMap = getAgentBlueprintMap()
  const methodMap = params?.agent_methods && typeof params.agent_methods === 'object'
    ? params.agent_methods
    : {}
  const rows = []

  for (const [agentId, cfg] of Object.entries(nodeConfigs)) {
    const blueprint = agentBlueprintMap[agentId] || { name: agentId, defaultMethod: '-', paramMap: {} }
    const paramDefs = blueprint.paramMap || {}
    const paramObj = cfg?.params && typeof cfg.params === 'object' ? cfg.params : {}
    const methodName = methodMap[agentId] || cfg?.selectedMethod || blueprint.defaultMethod || '-'

    for (const [paramKey, paramRawValue] of Object.entries(paramObj)) {
      const def = paramDefs[paramKey] || {}
      let paramValue = formatParamValue(paramRawValue)
      if (Array.isArray(paramRawValue) && paramRawValue.length >= 2) {
        paramValue = formatRangeText(paramRawValue[0], paramRawValue[1])
      }
      let recommendedRange = '-'
      if (def.type === 'range' && def.min != null && def.max != null) {
        recommendedRange = formatRangeText(def.min, def.max)
      } else if (def.type === 'number' && def.min != null && def.max != null) {
        recommendedRange = `${formatParamValue(def.min)} ~ ${formatParamValue(def.max)}`
      }

      rows.push({
        rowKey: `${agentId}-${paramKey}`,
        entityName: blueprint.name,
        methodName,
        paramLabel: def.label || getParamLabel(paramKey),
        recommendedRange,
        paramValue
      })
    }
  }

  return rows
}

const buildTaskParamConfigSections = (rawParams) => {
  const params = normalizeParamObject(rawParams)
  if (!params || typeof params !== 'object') {
    return { coreItems: [], entityParamRows: [], otherItems: [] }
  }

  const coreKeys = normalizeScenarioName(params.scenario) === 'uranium'
    ? [
        'scenario',
        'preset_name',
        'optimization_iterations',
        'start_year',
        'end_year',
        'starting_price_usd_per_lb',
        'event_severity_multiplier',
        'secondary_supply_multiplier'
      ]
    : ['scenario', 'iterations', 'model', 'planner_strategy', 'use_decompose']
  const hiddenKeys = ['agent_methods', 'agent_node_configs', 'experiment_id', 'experimentId', 'result_path', 'result_relpath']
  const excludedKeys = new Set([...coreKeys, ...hiddenKeys])

  const coreItems = coreKeys
    .filter(key => Object.prototype.hasOwnProperty.call(params, key))
    .map((key) => ({
      key,
      label: getParamLabel(key),
      value: formatConfigDisplayValue(key, params[key])
    }))

  const entityParamRows = buildEntityParamRows(params)

  const otherItems = Object.entries(params)
    .filter(([key]) => !excludedKeys.has(key))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => {
      const isComplex = value && typeof value === 'object'
      return {
        key,
        label: getParamLabel(key),
        value: formatConfigDisplayValue(key, value),
        isComplex,
        preview: formatConfigDisplayValue(key, value),
        pretty: isComplex ? prettifyParamValue(value) : ''
      }
    })

  return { coreItems, entityParamRows, otherItems }
}

const syncRecentQueuedMarker = () => {
  if (!recentQueuedTaskId.value) return
  const row = uraniumQueueRows.value.find(t => t.task_id === recentQueuedTaskId.value)
  if (!row || ['completed', 'failed', 'cancelled'].includes(row.status)) {
    localStorage.removeItem('sc_recentQueuedTaskId')
    recentQueuedTaskId.value = ''
  }
}

const fetchTaskIterationData = async (task) => {
  const experimentId = resolveExperimentIdFromTask(task)
  if (!experimentId) {
    throw new Error('无法解析实验ID')
  }

  if (isUraniumTask(task)) {
    return {
      kind: 'uranium',
      experimentId,
      rows: demoStore.getTaskIterations(task)
    }
  }

  throw new Error('当前页面仅提供铀场景任务数据')
}

const fetchRunningProgress = async () => {
  try {
    const next = demoStore.getRunningProgress()
    const prev = runningProgress.value
    const changed = !prev
      || prev.is_running !== next.is_running
      || prev.status !== next.status
      || prev.completed !== next.completed
      || prev.total !== next.total
      || prev.current_iteration !== next.current_iteration
      || prev.elapsed_time !== next.elapsed_time
      || prev.estimated_remaining !== next.estimated_remaining
      || prev.percentage !== next.percentage
      || prev.current_task !== next.current_task
      || JSON.stringify(prev.current_parameters) !== JSON.stringify(next.current_parameters)
      || JSON.stringify(prev.next_parameters) !== JSON.stringify(next.next_parameters)
    if (changed) {
      runningProgress.value = next
      // 后端进度刷新后，以新的 elapsed_time 为基准重新起算本地计时
      if (liveTimer) { liveAnchorAt = Date.now(); liveTickSeconds.value = 0 }
    }

    const hint = next.is_running && !next.current_task ? '实验已启动，等待进入下一轮。' : ''
    if (progressHint.value !== hint) progressHint.value = hint
  } catch (error) {
    console.error('获取运行进度失败:', error)
    progressHint.value = runningTask.value ? '实验进度读取失败，当前显示的是任务基础状态。' : ''
  }
}

const openTaskConfigDialog = (task) => {
  const sections = buildTaskParamConfigSections(task?.params)
  selectedTaskConfig.value = {
    taskId: task?.task_id || '',
    status: task?.status || '',
    statusText: getTaskStatusText(task?.status),
    createdAtText: formatTime(task?.created_at),
    goal: task?.user_goal || '未指定目标',
    coreItems: sections.coreItems,
    entityParamRows: sections.entityParamRows,
    otherItems: sections.otherItems
  }
  taskConfigDialogVisible.value = true
}

const copyTaskConfigId = async () => {
  const id = selectedTaskConfig.value.taskId
  if (!id) return
  try {
    await navigator.clipboard.writeText(id)
    ElMessage.success('任务 ID 已复制')
  } catch {
    ElMessage.error('复制失败,请手动复制')
  }
}

const refreshData = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await demoStore.ensureInitialized()
    syncRecentQueuedMarker()
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

const refreshLedger = async () => {
  await refreshData()
  await fetchRunningProgress()
  scheduleMetricsFetch()
}

const viewExperiment = async (task) => {
  try {
    const loadingMsg = ElMessage({
      message: '正在加载实验详情...',
      type: 'info',
      duration: 0,
      iconClass: 'el-icon-loading'
    })

    const experimentId = resolveExperimentIdFromTask(task)

    if (experimentId) {
      if (task?.session_id) {
        store.setCurrentSessionId(task.session_id)
      }
      if (isUraniumTask(task)) {
        await demoStore.loadExperiment(experimentId)
        store.setCurrentExperimentId(experimentId)
      } else {
        await store.selectExperiment(experimentId)
      }
      localStorage.setItem('sc_lastViewedTaskId', task.task_id)
      loadingMsg.close()

      // 不再弹出阻塞式 MessageBox，改为顶部内嵌的快捷入口 Banner
      selectedExperimentBanner.experimentId = experimentId
      selectedExperimentBanner.sessionId = task?.session_id || ''
      selectedExperimentBanner.taskId = task.task_id
      selectedExperimentBanner.visible = true
      ElMessage.success({
        message: '已加载实验',
        duration: 2200
      })
    } else {
      loadingMsg.close()
      ElMessage.warning('无法解析实验ID')
    }
  } catch (error) {
    console.error('加载实验失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  }
}

const cancelTask = async (taskId) => {
  try {
    await ElMessageBox.confirm('确定要取消这个任务吗？', '确认取消', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await demoStore.cancelTask(taskId)
    ElMessage.success('任务已取消')
    await refreshData()
    await fetchRunningProgress()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消任务失败:', error)
      ElMessage.error('取消失败')
    }
  }
}

const showError = (task) => {
  ElMessageBox.alert(
    task.error_message || '未知错误',
    '任务执行失败',
    { confirmButtonText: '确定', type: 'error' }
  )
}

const createNewExperiment = () => {
  localStorage.removeItem('sc_lastViewedTaskId')
  uraniumStore.resetDraft()
  router.push(SCNET_ROUTES.duringEntry)
}

const launching = ref(false)
const launchDisabledReason = computed(() => '')
const canLaunch = computed(() => !launchDisabledReason.value)

async function launchCurrentSession() {
  if (!canLaunch.value || launching.value) return
  launching.value = true
  try {
    const draft = {
      ...(uraniumStore.draft || {}),
      name: uraniumStore.draft?.name || store.scenarioUserGoal || '事中铀供应链推演',
      description: uraniumStore.draft?.description || store.scenarioUserGoal || ''
    }
    const experiment = await demoStore.launchExperiment({ sessionId: store.currentSessionId, userGoal: store.scenarioUserGoal, draft })
    const experimentId = String(experiment?.experiment_id || '').trim()
    if (!experimentId) throw new Error('未返回实验 ID')
    store.setCurrentExperimentId(experimentId)
    await refreshData()
    ElNotification.success({
      title: '实验已生成',
      message: '实验已完成，可进入态势推演、决策生成或查看实验解读',
      duration: 3000
    })
  } catch (error) {
    console.error('[ExperimentManager] launchCurrentSession 失败', error)
    ElMessage.error('启动实验失败: ' + (error?.message || '未知错误'))
  } finally {
    launching.value = false
  }
}

const stoppingExperiment = ref(false)
const stopRunningExperiment = async () => {
  if (!showRunningSection.value || stoppingExperiment.value) return
  try {
    await ElMessageBox.confirm('确定要停止当前正在运行的实验吗？该操作不可撤销。', '停止实验', {
      type: 'warning',
      confirmButtonText: '确定停止',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  stoppingExperiment.value = true
  try {
    const stopped = await demoStore.stopRunningExperiment()
    if (!stopped) {
      ElMessage.info('当前没有可停止的运行任务')
      return
    }
    ElMessage.success('已停止当前实验')
    await refreshData()
    await fetchRunningProgress()
  } catch (err) {
    console.error('[ExperimentManager] stopRunningExperiment failed', err)
    ElMessage.error('停止实验失败：' + (err?.message || '未知错误'))
  } finally {
    stoppingExperiment.value = false
  }
}

onMounted(async () => {
  await refreshData()
  await fetchRunningProgress()
  if (focusTask.value) {
    loadIterationsForRow(focusTask.value)
  }
  scheduleMetricsFetch()
})

watch(
  () => displayTaskRows.value.map(t => `${t.task_id}:${t.status}`).join('|'),
  () => {
    syncRecentQueuedMarker()
    fetchRunningProgress()
    scheduleMetricsFetch()
  }
)

watch(
  () => focusTask.value?.task_id,
  (taskId) => {
    if (!taskId || !focusTask.value) return
    loadIterationsForRow(focusTask.value)
  }
)

const experimentMetricsMap = ref({})
const METRICS_MAX_CONCURRENT = 3
const metricsFetchQueue = []
let metricsActiveFetches = 0
let metricsCancelled = false

const getMetricsState = (row) => {
  if (!row || row.status !== 'completed') return null
  const cached = experimentMetricsMap.value[row.task_id]
  return cached == null ? null : cached
}

const fetchMetricsForTask = async (task) => {
  const experimentId = resolveExperimentIdFromTask(task)
  if (!experimentId) {
    experimentMetricsMap.value = { ...experimentMetricsMap.value, [task.task_id]: 'error' }
    return
  }
  try {
    if (isUraniumTask(task)) {
      const summary = demoStore.getTaskMetrics(task) || {}
      experimentMetricsMap.value = {
        ...experimentMetricsMap.value,
        [task.task_id]: {
          scenario: 'uranium',
          avg_cost_usd_kgU: summary.avg_cost_usd_kgU ?? null,
          avg_risk_exposure: summary.avg_risk_exposure ?? null,
          final_inventory_coverage_years: summary.final_inventory_coverage_years ?? null
        }
      }
      return
    }
    experimentMetricsMap.value = { ...experimentMetricsMap.value, [task.task_id]: 'error' }
  } catch {
    experimentMetricsMap.value = { ...experimentMetricsMap.value, [task.task_id]: 'error' }
  }
}

const runMetricsQueue = () => {
  while (metricsActiveFetches < METRICS_MAX_CONCURRENT && metricsFetchQueue.length > 0) {
    if (metricsCancelled) {
      metricsFetchQueue.length = 0
      return
    }
    const task = metricsFetchQueue.shift()
    metricsActiveFetches++
    fetchMetricsForTask(task).finally(() => {
      metricsActiveFetches--
      if (!metricsCancelled) runMetricsQueue()
    })
  }
}

const scheduleMetricsFetch = () => {
  if (metricsCancelled) return
  const queued = new Set(metricsFetchQueue.map(t => t.task_id))
  for (const row of displayTaskRows.value) {
    if (row.status !== 'completed') continue
    if (experimentMetricsMap.value[row.task_id] !== undefined) continue
    if (queued.has(row.task_id)) continue
    experimentMetricsMap.value = { ...experimentMetricsMap.value, [row.task_id]: 'loading' }
    metricsFetchQueue.push(row)
  }
  runMetricsQueue()
}

onUnmounted(() => {
  metricsCancelled = true
  metricsFetchQueue.length = 0
  stopLiveTicker()
})

watch(showRunningSection, (running) => {
  if (running) startLiveTicker()
  else stopLiveTicker()
}, { immediate: true })
</script>

<style scoped>
/* 头部步骤向导徽章 */
.step-guide-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 3px 8px;
  border-radius: 6px;
}
.step-guide-num {
  font-size: 11px;
  font-weight: 800;
  color: #ffffff;
  background: #2563eb;
  padding: 1px 5px;
  border-radius: 4px;
}
.step-guide-name {
  font-size: 12px;
  font-weight: 700;
  color: #1e3a8a;
}
.step-guide-phase {
  font-size: 11px;
  color: #64748b;
}

.run-progress-body { display: grid; gap: 10px; }
.run-progress-caption { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 13px; }
.run-progress-caption strong { font-weight: 500; color: #334155; }
.run-progress-caption > span { color: #64748b; font-size: 12px; }
.run-progress-meta { display: flex; flex-wrap: wrap; gap: 8px 20px; margin: 0; color: #64748b; font-size: 12px; }
.run-progress-details {
  margin-top: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  color: #475569;
  font-size: 12px;
  line-height: 1.6;
}
.run-progress-details summary {
  cursor: pointer;
  color: #2563eb;
  font-weight: 600;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
.run-progress-details p {
  margin: 6px 0 0;
  color: #334155;
}
.mono { font-family: var(--mid-font-mono); }

.focus-experiment-section {
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.04);
  transition: all 0.2s ease;
}
.focus-experiment-section[open] {
  border-color: #93c5fd;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.08);
}
.focus-experiment-section > summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 12px 16px;
  color: #1e3a8a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
  background: #f0f7ff;
  border-radius: 9px 9px 0 0;
  user-select: none;
}
.focus-experiment-section:not([open]) > summary {
  border-radius: 9px;
}
.focus-experiment-section > summary::before {
  content: '▶';
  font-size: 10px;
  color: #2563eb;
  transition: transform 0.2s ease;
  display: inline-block;
}
.focus-experiment-section[open] > summary::before {
  transform: rotate(90deg);
}
.focus-experiment-section > summary span {
  color: #64748b;
  font-size: 12px;
  font-weight: 400;
  overflow-wrap: anywhere;
}

.launch-btn-wrap {
  display: inline-flex;
}
.experiment-manager {
  --ux-ink: #0f172a;
  --ux-muted: #64748b;
  --ux-muted-2: #94a3b8;
  --ux-border: #dbe4f0;
  --ux-blue: #2563eb;
  --ux-amber: #d97706;
  --ux-mint: #059669;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 6px 0 20px;
  overflow: auto;
  gap: 8px;
  font-family: var(--mid-font-sans);
}

.experiment-manager > .iteration-progress-section,
.experiment-manager > .focus-experiment-section,
.experiment-manager > .experiment-list,
.experiment-manager > .selected-exp-banner {
  margin-left: 8px;
  margin-right: 8px;
}

.iteration-progress-section {
  margin: 2px 0 4px;
}

.iteration-progress-section :deep(.el-card) {
  border-radius: var(--mid-radius-lg);
  border-color: #dbe4f0;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.iteration-progress-section :deep(.el-card__header) {
  padding: 12px 14px 0;
  border-bottom: none;
}

.iteration-progress-section :deep(.el-card__body) {
  padding: 8px 14px 10px;
}

.progress-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}


.progress-title {
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: var(--ux-ink);
}


.focus-experiment-section {
  margin-bottom: 8px;
}

/* 页头「案例验证」入口（案例分析挂在运行管理之下） */
.case-entry-btn .case-entry-caret {
  margin-left: 2px;
  font-size: 12px;
}
</style>

<style>
/* 下拉菜单渲染在 body 下，不能用 scoped */
.case-entry-menu {
  min-width: 300px;
  padding: 6px 0;
}
.case-entry-menu-head {
  padding: 4px 12px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  border-bottom: 1px dashed #e2e8f0;
  margin-bottom: 4px;
}
.case-entry-menu .el-dropdown-menu__item {
  padding: 6px 12px;
  line-height: 1.4;
}
.case-entry-menu .el-dropdown-menu__item.is-research {
  opacity: .72;
}
.case-entry-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.case-entry-item b {
  font-size: 12px;
  color: #0f172a;
}
.case-entry-item small {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #64748b;
}
.case-entry-item small em {
  font-style: normal;
  padding: 0 5px;
  border-radius: 999px;
}
.case-entry-item small em.ready { background: #dcfce7; color: #166534; }
.case-entry-item small em.research { background: #f1f5f9; color: #64748b; }
</style>
<style scoped>

.experiment-list {
  flex: 1;
  min-height: 0;
}

.experiment-list :deep(.el-card) {
  border-radius: var(--mid-radius-lg);
  border-color: #dbe4f0;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.experiment-list :deep(.el-card__header) {
  padding: 12px 14px 0;
  border-bottom: none;
}

.experiment-list :deep(.el-card__body) {
  padding: 0 14px 14px;
}

.ledger-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  margin-bottom: 10px;
  border-bottom: 1px solid #edf2f7;
}

.ledger-toolbar-main,
.ledger-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ledger-toolbar-main {
  flex: 1;
  min-width: 0;
}

.ledger-search {
  width: min(360px, 100%);
}

.ledger-status-select {
  width: 124px;
}

.ledger-sort-select {
  width: 124px;
}

.ledger-result-count {
  color: var(--ux-muted);
  font-size: var(--mid-fs-label);
  white-space: nowrap;
}

.filtered-empty {
  padding-top: 12px;
}

.empty-list {
  padding: 28px 0;
}

.plan-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.plan-chip {
  border-radius: 999px;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-inline: 2px;
}

.metrics-placeholder {
  color: var(--el-text-color-placeholder);
  font-size: var(--mid-fs-body);
}

.metrics-loading {
  width: 100%;
  max-width: 200px;
}

.metrics-error {
  color: var(--el-color-danger);
  font-size: var(--mid-fs-body);
}

.list-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}


.list-title {
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: var(--ux-ink);
}


.list-header-stats {
  display: flex;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
}

.overview-pill { display: flex; align-items: baseline; gap: 6px; padding: 3px 0; }





.overview-pill.running .overview-value { color: #2563eb; }
.overview-pill.pending .overview-value { color: #b45309; }
.overview-pill.completed .overview-value { color: #059669; }

.overview-label {
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: #64748b;
}

.overview-value {
  margin-top: 2px;
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
  font-family: var(--mid-font-mono);
}

.ledger-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ledger-record { position: relative; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; display: flex; flex-direction: column; gap: 8px; }
.ledger-param-details { color: #64748b; font-size: 12px; }
.ledger-param-details summary { cursor: pointer; padding: 4px 0; }
.ledger-param-details summary:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
.ledger-param-details[open] .ledger-param-inline { margin-top: 8px; padding: 10px; border-radius: 6px; background: #f8fafc; }

.ledger-record::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 999px;
  background: #cbd5e1;
}


.ledger-record:hover { border-color: #cbd5e1; }

.ledger-record.focus { border-color: #93c5fd; background: #fafcff; }


.ledger-record.status-running::before {
  background: linear-gradient(180deg, #38bdf8 0%, #2563eb 100%);
}


.ledger-record.status-pending::before {
  background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
}


.ledger-record.status-completed::before {
  background: linear-gradient(180deg, #34d399 0%, #059669 100%);
}


.ledger-record.status-failed::before {
  background: linear-gradient(180deg, #f87171 0%, #ef4444 100%);
}

.ledger-record-top,
.ledger-record-meta,
.ledger-record-footer { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }

.ledger-record-meta {
  align-items: center;
}

.ledger-meta-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.ledger-record-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.ledger-record-id {
  font-size: var(--mid-fs-label);
  color: #94a3b8;
}

.ledger-record-time { font-size: 12px; color: #64748b; }

.ledger-record-title {
  margin: 0;
  font-size: var(--mid-fs-title);
  line-height: var(--mid-lh-tight);
  font-weight: 800;
  color: var(--ux-ink);
}

.ledger-record-footer :deep(.el-button),
.ledger-footer-actions :deep(.el-button.is-link) {
  padding: 5px 10px;
  border-radius: 4px;
  border: 0;
  background: transparent;
  font-weight: 700;
  font-size: var(--mid-fs-body);
}

.ledger-record-footer :deep(.el-button:hover),
.ledger-footer-actions :deep(.el-button.is-link:hover) {
  background: #ffffff;
  border-color: #bfdbfe;
}

.ledger-brief-row { display: flex; flex-wrap: wrap; gap: 8px 24px; }

.ledger-brief-item { display: flex; align-items: baseline; gap: 8px; }

.ledger-brief-item span {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.ledger-brief-item strong {
  font-size: var(--mid-fs-strong);
  line-height: var(--mid-lh-tight);
  font-weight: 800;
  color: var(--ux-ink);
}

.ledger-inline-panel {
  margin-top: 0;
  padding: 10px 12px;
  border-radius: var(--mid-radius-sm);
  background: #f8fafc;
}

.ledger-inline-panel.pending {
  background: linear-gradient(180deg, #fffaf2 0%, #ffffff 100%);
  border-color: #fde68a;
}

.ledger-inline-title {
  margin-bottom: 8px;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.ledger-inline-text {
  font-size: var(--mid-fs-body);
  line-height: var(--mid-lh-body);
  color: #475569;
}

.ledger-param-inline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ledger-param-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.ledger-param-label {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.ledger-param-label.next {
  color: var(--ux-mint);
}

.ledger-param-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  border: 1px solid #dbe4f0;
}

.ledger-param-chip.muted {
  background: #f8fafc;
  color: #64748b;
}

.ledger-param-chip.next {
  background: #ecfdf5;
  border-color: #bbf7d0;
  color: #047857;
}

.ledger-metric-inline {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
  gap: 8px;
  width: 100%;
  align-items: stretch;
}

.ledger-metric-pill { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; padding: 4px 0; }

.ledger-metric-pill-label {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.ledger-metric-pill-value {
  font-size: var(--mid-fs-title);
  line-height: 1.2;
  font-weight: 800;
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  white-space: nowrap;
}




.ledger-metric-pill.primary .ledger-metric-pill-value {
  color: var(--ux-blue);
}

.ledger-metric-pill.warning .ledger-metric-pill-value {
  color: var(--ux-amber);
}

.ledger-metric-pill.success .ledger-metric-pill-value {
  color: var(--ux-mint);
}

.ledger-record-footer {
  align-items: center;
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px dashed #dbe4f0;
}

.ledger-expand-action {
  flex-shrink: 0;
}

.ledger-expand-action :deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ledger-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ledger-expand-shell {
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px dashed #dbe4f0;
}

.ledger-expand-loading,
.ledger-expand-error,
.ledger-expand-empty {
  padding: 10px 12px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.ledger-expand-error,
.ledger-expand-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #64748b;
  font-size: var(--mid-fs-body);
}

.round-empty {
  color: var(--el-text-color-placeholder);
  font-size: var(--mid-fs-label);
}

.progress-card-header :deep(.el-tag),
.ledger-record-meta :deep(.el-tag),
.plan-chip-row :deep(.el-tag) {
  border-radius: 999px;
  font-weight: 700;
}

.task-config-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-config-dialog :deep(.el-dialog) {
  border-radius: var(--mid-radius-lg);
  overflow: hidden;
  border: 1px solid #dbe4f0;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.16);
}

.task-config-dialog :deep(.el-dialog__header) {
  padding: 14px 16px 0;
  margin-right: 0;
}

.task-config-dialog :deep(.el-dialog__body) {
  padding: 12px 16px 16px;
}

.task-config-dialog :deep(.el-dialog__footer) {
  padding: 0 16px 16px;
}

.task-config-dialog :deep(.el-dialog__title) {
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: var(--ux-ink);
}

.task-config-dialog :deep(.el-dialog__headerbtn) {
  top: 12px;
  right: 14px;
}

.task-config-hero {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--mid-radius-md);
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.10), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  border: 1px solid #dbe4f0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.task-config-kicker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.task-config-kicker {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  font-size: var(--mid-fs-micro);
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #1d4ed8;
}

.hero-goal-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.hero-goal-icon {
  font-size: 16px;
  color: var(--ux-blue);
  margin-top: 2px;
  flex-shrink: 0;
}

.hero-goal-text {
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: var(--ux-ink);
  line-height: var(--mid-lh-tight);
}

.hero-status-tag {
  flex-shrink: 0;
}

.hero-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.hero-meta-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.88);
}

.hero-meta-main {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.hero-meta-label {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.hero-meta-value {
  color: var(--ux-ink);
  font-size: var(--mid-fs-body);
  font-weight: 700;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-meta-value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.hero-copy-btn {
  cursor: pointer;
  color: var(--ux-blue);
  font-size: var(--mid-fs-strong);
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.hero-copy-btn:hover {
  opacity: 0.7;
}

.task-config-section {
  border: 1px solid #e2e8f0;
  border-radius: var(--mid-radius-md);
  background: #fff;
  padding: 10px 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.section-header-icon {
  font-size: 14px;
  color: var(--ux-blue);
}

.section-header-title {
  font-size: var(--mid-fs-strong);
  font-weight: 800;
  color: var(--ux-ink);
}

.section-header-count {
  font-size: var(--mid-fs-micro);
  color: var(--ux-muted);
  background: #f8fafc;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 700;
}

.core-param-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.core-param-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid #e5edf6;
  border-radius: var(--mid-radius-sm);
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  transition: border-color 0.15s, background 0.15s;
  min-height: 56px;
}

.core-param-card:hover {
  border-color: #bfdbfe;
  background: linear-gradient(180deg, #eef6ff 0%, #ffffff 100%);
}

.core-param-label {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
  letter-spacing: 0.02em;
}

.core-param-value {
  font-size: var(--mid-fs-strong);
  font-weight: 800;
  color: var(--ux-ink);
  word-break: break-all;
  line-height: 1.4;
}

.core-param-value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.task-config-table-shell {
  border-radius: var(--mid-radius-sm);
  overflow: hidden;
  border: 1px solid #e5edf6;
  background: #ffffff;
}

.task-config-table-shell :deep(.el-table) {
  --el-table-border-color: #e5edf6;
  --el-table-header-bg-color: #f8fafc;
  --el-table-row-hover-bg-color: #f8fbff;
}

.task-config-table-shell :deep(.el-table th.el-table__cell) {
  font-size: var(--mid-fs-body);
  font-weight: 800;
  color: var(--ux-muted);
}

.task-config-table-shell :deep(.el-table td.el-table__cell) {
  padding: 9px 0;
}

.task-config-param-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: var(--mid-fs-body);
  color: #0f172a;
}

.other-param-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.other-param-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e5edf6;
  background: linear-gradient(180deg, #fafcff 0%, #ffffff 100%);
}

.other-param-card.complex {
  grid-column: 1 / -1;
}

.other-param-label {
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--ux-muted);
}

.other-param-value {
  font-size: var(--mid-fs-body);
  line-height: 1.5;
  color: var(--ux-ink);
  word-break: break-all;
}

.task-config-json {
  margin: 0;
  padding: 9px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #e5edf6;
  background: #f8fafc;
  font-size: var(--mid-fs-label);
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow: auto;
}

.task-config-json.compact {
  margin: 0;
  max-height: 180px;
}

/* Element Plus 控件密度：与 midStage.css 的字号刻度对齐 */
.mono,
.ledger-metric-pill-value,
.hero-meta-value.mono,
.core-param-value.mono,
.task-config-param-value {
  font-family: var(--mid-font-mono);
}

.experiment-manager :deep(.el-button) {
  --el-button-size: 30px;
  min-height: 30px;
  font-size: var(--mid-fs-body);
}

.experiment-manager :deep(.el-tag) {
  height: 22px;
  padding: 0 9px;
  font-size: var(--mid-fs-label);
  line-height: 20px;
  font-weight: 700;
}

.experiment-manager :deep(.el-table th.el-table__cell),
.experiment-manager :deep(.el-table td.el-table__cell) {
  font-size: var(--mid-fs-body);
}

@media (max-width: 1200px) {

  .hero-meta-grid {
    grid-template-columns: 1fr;
  }


  .ledger-brief-row {
    grid-template-columns: 1fr;
  }

  .ledger-metric-inline {
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  }

  .ledger-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .ledger-toolbar-main,
  .ledger-toolbar-actions {
    width: 100%;
  }

  .ledger-toolbar-actions {
    justify-content: space-between;
  }
}

@media (max-width: 768px) {


  .progress-card-header,
  .ledger-record-top,
  .ledger-record-meta,
  .ledger-record-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .list-header-stats {
    margin-left: 0;
  }

  .ledger-toolbar-main {
    flex-wrap: wrap;
  }

  .ledger-search {
    width: 100%;
  }

  .ledger-status-select,
  .ledger-sort-select {
    flex: 1;
    min-width: 0;
  }

  .ledger-toolbar-actions {
    align-items: center;
    flex-wrap: wrap;
  }

  .ledger-record-footer {
    gap: 10px;
  }

  .task-config-kicker-row,
  .hero-meta-main {
    align-items: flex-start;
    flex-direction: column;
  }
}

/* Monte-Carlo 采样状态条样式 */
.monte-carlo-strip {
  margin-top: 10px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}
.mc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.mc-tag {
  font-size: 11px;
  font-weight: 600;
  color: #1e293b;
}
.mc-badge {
  font-size: 10px;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 1px 6px;
  border-radius: 4px;
}
.mc-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 11px;
  color: #64748b;
}
.mc-detail b {
  color: #0f172a;
}

/* 谱系标识 */
.uranium-lineage-row {
  margin-top: 4px;
}
.uranium-lineage-badge {
  font-size: 11px;
  color: #0369a1;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 4px;
  padding: 2px 8px;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.strategy-badge-chip {
  margin-right: 6px;
  font-weight: 600;
}
.strategy-quick-link {
  background: none;
  border: none;
  color: #2563eb;
  font-size: 11px;
  cursor: pointer;
  padding: 0 4px;
  margin-left: 6px;
  text-decoration: underline;
  transition: opacity 0.15s;
}
.strategy-quick-link:hover {
  opacity: 0.8;
}
.pending-pos-pill {
  font-size: 11.5px;
  color: #d97706;
  background: #fef3c7;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.pending-task-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  gap: 12px;
}
.pending-task-bar .run-progress-meta {
  margin: 0;
}
.dialog-strategy-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.strategy-compare-head {
  margin-bottom: 14px;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.6;
}

/* 俄乌冲突推演时序与自适应调度回溯带 */
.ukraine-timeline-strip {
  margin: 16px 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
}
.ut-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.ut-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ut-badge {
  font-size: 11px;
  font-weight: 700;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 2px 8px;
  border-radius: 999px;
}
.ut-head-left strong {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}
.ut-steps-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ut-step-item {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  transition: all 0.2s ease;
}
.ut-step-item.current {
  border-color: #fca5a5;
  background: #fff5f5;
  box-shadow: 0 0 0 1px #fca5a5;
}
.ut-step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}
.ut-step-dot.danger {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}
.ut-step-dot.success {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}
.ut-step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ut-year {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}
.ut-step-content strong {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.ut-step-content p {
  font-size: 11.5px;
  color: #475569;
  line-height: 1.5;
  margin: 2px 0 0;
}
.ut-step-arrow {
  color: #94a3b8;
  font-size: 14px;
  flex-shrink: 0;
}
@media (max-width: 900px) {
  .ut-steps-row {
    flex-direction: column;
  }
  .ut-step-arrow {
    transform: rotate(90deg);
  }
}
</style>
