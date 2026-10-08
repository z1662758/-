<template>
  <div class="post-observe-page">
    <ChatHandoffStrip>
      <template #hint>下面按实验逐轮汇总的指标分布与异常判定，可与本次结论对照。</template>
    </ChatHandoffStrip>

    <!-- K5-PIPELINE:实验闭环导航(运行实验 → 观察 → 干预 → 机制),实验 id 从 URL 带入 -->
    <ExperimentStageNav :experiment-id="routeExperimentId" current="observe" />

    <section class="page-head">
      <div>
        <h1>观察分析</h1>
        <p class="subtitle">从事件开始前的共同状态出发，逐层查看各世界线的决策与风险分布。</p>
      </div>
      <div class="head-actions">
        <div class="stat-item">
          <span>实验库（共 {{ totalCaseCount }} 个）</span>
          <strong>{{ caseFolders[0].children.length + caseFolders[1].children.length }}</strong>
        </div>
        <div class="stat-item" v-if="caseA && caseB">
          <span>加权相似度</span>
          <strong>{{ similarityScore != null ? similarityScore + '%' : computeLocalSimilarity() + '%' }}</strong>
        </div>
        <div class="stat-item" v-if="analysisReady">
          <span>显著指标</span>
          <strong>{{ significantRows.length }}/{{ metricRows.length }}</strong>
        </div>
        <el-button text size="small" :icon="Refresh" @click="loadAllCases" :loading="loading" />
      </div>
    </section>

    <!-- 平行世界观察台：共同事实根节点 → 决策节点逐层展开 → 故事线 / 演化时间线 → 平行世界风险分布 -->
    <ObserveWorldView>
      <template #compare>
        <!-- 三标签页结论摘要：指标对比 / 深度分析 / 概率分布 的结论抽象成一句话，随 A/B 选择自动刷新 -->
        <p v-if="libraryNotice" class="conclusion-summary-note">{{ libraryNotice }}</p>
        <div class="conclusion-summary">
          <button
            v-for="card in conclusionSummaryCards"
            :key="card.key"
            type="button"
            class="conclusion-summary-card"
            :class="['conclusion-summary-card--' + card.tone, { 'is-open': activeCard === card.key }]"
            :aria-expanded="activeCard === card.key"
            @click="toggleDetail(card.key)"
          >
            <span class="conclusion-summary-head">
              <el-icon class="conclusion-summary-icon"><component :is="card.icon" /></el-icon>
              <span class="conclusion-summary-title">{{ card.title }}</span>
              <span class="head-spacer"></span>
              <span class="conclusion-summary-tag" :class="{ 'is-ready': card.ready }">{{ card.ready ? '结论已生成' : '待生成' }}</span>
              <el-icon class="conclusion-summary-caret"><component :is="activeCard === card.key ? ArrowUp : ArrowDown" /></el-icon>
            </span>
            <span class="conclusion-summary-text">{{ card.text }}</span>
          </button>
        </div>

      <!-- 详情面板：点击上方结论卡片展开对应详情（指标对比 / 深度分析 / 概率分布） -->
      <section v-if="activeCard" class="observe-panel compare-detail">
        <div class="panel-head-bar panel-head-bar--purple">
          <el-icon :size="18"><component :is="activeCardIcon" /></el-icon>
          <span>{{ activeCardTitle }}</span>
          <span class="head-spacer"></span>
          <el-tag v-if="caseA" size="small" :type="caseA.completed ? 'success' : 'warning'" round>实验 A</el-tag>
          <span v-if="caseA && caseB" class="vs-inline">VS</span>
          <el-tag v-if="caseB" size="small" :type="caseB.completed ? 'success' : 'warning'" round>实验 B</el-tag>
            <div class="compare-head-actions">
              <el-tooltip content="关闭时按报告全部轮次对比（每侧样本=轮次数，可做显著性检验）；开启后只对比案例所属的那一轮（样本=1，无法检验）" placement="bottom">
                <label class="focus-toggle">
                  <el-switch v-model="focusIteration" size="small" />
                  <span>聚焦单轮次</span>
                </label>
              </el-tooltip>
              <el-dropdown trigger="click" @command="exportComparisonReport">
                <el-button type="primary" plain size="small" :icon="Download" :disabled="!caseA || !caseB">
                  导出报告<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="html">HTML（.html）</el-dropdown-item>
                    <el-dropdown-item command="txt">文本（.txt）</el-dropdown-item>
                    <el-dropdown-item command="pdf">PDF（打印保存）</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button text size="small" @click="activeCard = null">收起详情</el-button>
            </div>
        </div>

        <div class="panel-body-fill compare-body">
            <div v-if="!caseA || !caseB" class="compare-empty">
              <el-icon :size="48"><TrendCharts /></el-icon>
              <p>暂无可对比的实验</p>
              <span>观察分析会自动挑一对可比实验（事中实验 A · 反事实实验 B）用于出结论；<br>若长时间为空，可点击右上角刷新，或先在首页运行 / 导入实验。</span>
            </div>

            <!-- ===== Tab 1: 指标对比 ===== -->
            <div v-else-if="activeCard === 'metrics'" class="compare-content">
              <!-- 自选对比维度（可折叠） -->
              <div class="dimension-selector">
                <div class="dim-toggle" @click="dimsExpanded = !dimsExpanded">
                  <el-icon><component :is="dimsExpanded ? ArrowDown : ArrowRight" /></el-icon>
                  <span class="dim-selector-label">自选对比维度</span>
                  <span class="dim-hint">（已选 {{ selectedComparisonDims.length }} / {{ COMPARISON_DIM_OPTIONS.length }}）</span>
                </div>
                <el-checkbox-group v-show="dimsExpanded" v-model="selectedComparisonDims" size="small" class="dim-checkboxes">
                  <el-checkbox v-for="dim in COMPARISON_DIM_OPTIONS" :key="dim.key" :label="dim.key" :value="dim.key" border>{{ dim.label }}</el-checkbox>
                </el-checkbox-group>
              </div>

              <div class="card-pair-row card-pair-row--compact">
                <div class="cmp-card cmp-card--blue cmp-card--sm">
                  <div class="cmp-card-head"><span>实验 A · 参数</span><div class="cmp-card-pip blue"></div></div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="p in filteredParamFields" :key="p.key"><span class="cmp-kv-label">{{ p.label }}</span><span class="cmp-kv-value">{{ caseA[p.key] || '--' }}</span></div>
                    <div v-if="!filteredParamFields.length" class="cmp-empty-hint">未选择参数维度</div>
                  </div>
                </div>
                <div class="cmp-card cmp-card--purple cmp-card--sm">
                  <div class="cmp-card-head"><span>实验 B · 参数</span><div class="cmp-card-pip purple"></div></div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="p in filteredParamFields" :key="p.key"><span class="cmp-kv-label">{{ p.label }}</span><span class="cmp-kv-value">{{ caseB[p.key] || '--' }}</span></div>
                    <div v-if="!filteredParamFields.length" class="cmp-empty-hint">未选择参数维度</div>
                  </div>
                </div>
              </div>

              <div class="card-pair-row card-pair-row--compact">
                <div class="cmp-card cmp-card--teal cmp-card--sm">
                  <div class="cmp-card-head"><span>实验 A · 结果</span><div class="cmp-card-pip teal"></div></div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="r in filteredResultFields" :key="r.key"><span class="cmp-kv-label">{{ r.label }}</span><span class="cmp-kv-value">{{ caseA[r.key] || '--' }}</span></div>
                    <div v-if="!filteredResultFields.length" class="cmp-empty-hint">未选择结果维度</div>
                  </div>
                </div>
                <div class="cmp-card cmp-card--amber cmp-card--sm">
                  <div class="cmp-card-head"><span>实验 B · 结果</span><div class="cmp-card-pip amber"></div></div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="r in filteredResultFields" :key="r.key"><span class="cmp-kv-label">{{ r.label }}</span><span class="cmp-kv-value">{{ caseB[r.key] || '--' }}</span></div>
                    <div v-if="!filteredResultFields.length" class="cmp-empty-hint">未选择结果维度</div>
                  </div>
                </div>
              </div>

              <!-- 综合结论 -->
              <div class="cmp-card cmp-card--conclusion">
                <div class="cmp-card-head">
                  <el-icon><Setting /></el-icon>
                  <span>实验 A vs 实验 B · 综合结论</span>
                  <span class="head-spacer"></span>
                  <el-tag v-if="conclusionSource?.source === 'llm'" size="small" type="success" effect="dark" round>
                    大模型生成{{ conclusionSource.model ? ' · ' + conclusionSource.model : '' }}
                  </el-tag>
                  <el-tag v-else-if="analysisReady" size="small" type="info" round>统计规则生成</el-tag>
                </div>
                <div class="cmp-card-body">
                  <p class="conclusion-text">{{ conclusionText }}</p>
                  <div class="verdict-strip" v-if="analysis?.verdict">
                    <span class="verdict-item">
                      判定：
                      <b>{{ analysis.verdict.winner === '持平' ? '持平' : '实验 ' + analysis.verdict.winner + ' 占优' }}</b>
                      <em>（{{ analysis.verdict.reason }}）</em>
                    </span>
                    <span class="verdict-item">显著指标 A {{ analysis.verdict.significant_a }} / B {{ analysis.verdict.significant_b }}</span>
                    <span class="verdict-item">占优指标 A {{ analysis.verdict.wins_a }} / B {{ analysis.verdict.wins_b }}</span>
                  </div>
                  <p class="conclusion-evidence">证据等级：关联级（因果阶梯第 1 层）——本结论描述两组实验的关联与差异，不含 do(X) 的因果效应；因果判断请以「干预分析」「反事实实验」为准。</p>
                  <el-alert
                    v-if="analysisError"
                    :title="analysisError"
                    type="warning" :closable="false" show-icon class="analysis-alert"
                  />
                </div>
              </div>

              <!-- 指标对比折线图：只画「自选对比维度」里勾选的结果指标，与上面的 A/B 结果卡保持一致 -->
              <div class="cmp-card cmp-card--chart">
                <div class="cmp-card-head">
                  <el-icon><TrendCharts /></el-icon>
                  <span>实验指标对比 · 折线图</span>
                  <span class="head-spacer"></span>
                  <span class="dim-hint">已选 {{ chartMetrics.length }} 项结果指标</span>
                </div>
                <div class="cmp-card-body">
                  <div v-if="chartMetrics.length" ref="metricsLineChartRef" class="metrics-line-chart"></div>
                  <div v-else class="cmp-empty-hint">未勾选任何结果指标：请在上方「自选对比维度」中至少选择一项（完成率 / 缺口率 / 网络协作次数 / 韧性指数）。</div>
                </div>
              </div>
            </div>

            <!-- ===== Tab 2: 深度分析 ===== -->
            <div v-else-if="activeCard === 'deep'" class="compare-content">
              <div v-if="analysisLoading" class="compare-empty-inline">
                <p>正在执行统计检验与归因分析...</p>
              </div>

              <template v-else-if="analysisReady">
                <!-- 数据溯源 -->
                <section class="compare-section" v-if="provenance">
                  <h3><el-icon><Collection /></el-icon>数据溯源</h3>
                  <div class="provenance-bar">
                    <div class="prov-item prov-item--a">
                      <span class="prov-tag">A</span>
                      <div class="prov-body">
                        <b>{{ provenance.case_a?.experiment_id }}</b>
                        <span>{{ provenance.case_a?.report }}</span>
                        <span>系统 {{ provenance.case_a?.system || '--' }} · {{ provenance.case_a?.total_iterations }} 轮
                          样本{{ provenance.case_a?.focus_iteration ? '（聚焦第 ' + provenance.case_a.focus_iteration + ' 轮）' : '' }}</span>
                        <span class="prov-llm">大模型：{{ provenance.case_a?.llm_enabled ? '启用' : '关闭' }}</span>
                      </div>
                    </div>
                    <div class="prov-item prov-item--b">
                      <span class="prov-tag">B</span>
                      <div class="prov-body">
                        <b>{{ provenance.case_b?.experiment_id }}</b>
                        <span>{{ provenance.case_b?.report }}</span>
                        <span>系统 {{ provenance.case_b?.system || '--' }} · {{ provenance.case_b?.total_iterations }} 轮
                          样本{{ provenance.case_b?.focus_iteration ? '（聚焦第 ' + provenance.case_b.focus_iteration + ' 轮）' : '' }}</span>
                        <span class="prov-llm">大模型：{{ provenance.case_b?.llm_enabled ? '启用' : '关闭' }}</span>
                      </div>
                    </div>
                    <div class="prov-meta">
                      <span>样本点合计 <b>{{ provenance.sample_total }}</b></span>
                      <span>生成于 {{ provenance.generated_at }}</span>
                    </div>
                  </div>
                  <el-alert
                    v-if="sameSourceCase"
                    type="warning" :closable="false" show-icon class="analysis-alert"
                    title="实验 A / B 是同一份实验报告的两个轮次（受控对照）"
                    description="两侧网络与产能口径一致，变量是干预本身，属于最可比的一组对照。同一份报告只有一条逐轮曲线，因此趋势图只画一条线并标出两轮位置；指标对比已锁定到各自轮次取值。"
                  />
                </section>

                <!-- 可比性校验 -->
                <section class="compare-section" v-if="comparabilityLevelMeta">
                  <h3>
                    <el-icon><Odometer /></el-icon>可比性校验
                    <el-tag :type="comparabilityLevelMeta.type" size="small" effect="light" round class="h3-tag">{{ comparabilityLevelMeta.text }}</el-tag>
                  </h3>
                  <ul v-if="comparability?.warnings?.length" class="warning-list">
                    <li v-for="(w, i) in comparability.warnings" :key="i">{{ w }}</li>
                  </ul>
                  <p v-else class="ok-hint">两组实验来自同一系统、同一大模型配置，指标口径一致，可直接比较。</p>
                </section>

                <!-- 统计显著性 -->
                <section class="compare-section">
                  <h3>
                    <el-icon><DataAnalysis /></el-icon>统计显著性检验
                    <el-tag size="small" effect="light" round class="h3-tag">Welch t 检验 · 双侧</el-tag>
                  </h3>
                  <p class="section-desc">
                    对比口径：{{ focusIteration ? '仅案例所属轮次' : '报告全部轮次' }}。
                    样本不足 2 时无法估计方差，检验结论会标为「样本不足」而不是给出伪显著性。
                  </p>
                  <el-table :data="metricRows" size="small" stripe class="significance-table">
                    <el-table-column prop="label" label="指标" width="130" fixed />
                    <el-table-column label="实验 A" width="110">
                      <template #default="{ row }"><span class="val-a">{{ row.value_a_text }}</span></template>
                    </el-table-column>
                    <el-table-column label="实验 B" width="110">
                      <template #default="{ row }"><span class="val-b">{{ row.value_b_text }}</span></template>
                    </el-table-column>
                    <el-table-column label="差异 Δ" width="130">
                      <template #default="{ row }">
                        <span :class="row.better === 'B' ? 'delta-up' : row.better === 'A' ? 'delta-down' : 'delta-flat'">{{ row.delta_text }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="标准化差异 Δ′" width="120" align="center">
                      <template #default="{ row }">
                        <span class="mono">{{ formatSigned(row.standardized_delta, 2, 'σ') }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="p 值" width="90" align="center">
                      <template #default="{ row }"><span class="mono">{{ formatPValue(row.p_value) }}</span></template>
                    </el-table-column>
                    <el-table-column label="Cohen's d" width="100" align="center">
                      <template #default="{ row }">
                        <span class="mono">{{ row.cohens_d != null ? Number(row.cohens_d).toFixed(2) : '--' }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="效应量" width="80" align="center">
                      <template #default="{ row }"><span class="mono">{{ effectSizeLabel(row.cohens_d) }}</span></template>
                    </el-table-column>
                    <el-table-column label="检验结论" width="110" align="center">
                      <template #default="{ row }">
                        <el-tag :type="significanceTag(row).type" size="small" effect="light">{{ significanceTag(row).text }}</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="占优" width="80" align="center">
                      <template #default="{ row }">{{ betterLabel(row) }}</template>
                    </el-table-column>
                  </el-table>
                  <p class="table-footnote">
                    样本量：{{ metricRows.map(r => r.label + ' ' + r.sample_a + '/' + r.sample_b).join('，') }}（A/B）
                  </p>
                </section>

                <!-- 差异贡献分解（关联级）：只按标准化差异大小分摊「差异主要出现在哪些指标上」，
                     不是 do(X) 的因果分解，混杂未剔除；因果版见干预/反事实。 -->
                <section class="compare-section" v-if="attributionItems.length">
                  <h3>
                    <el-icon><TrendCharts /></el-icon>差异贡献分解
                    <el-tag size="small" effect="light" round class="h3-tag">关联级 · 非因果分解</el-tag>
                  </h3>
                  <p class="section-desc">
                    按各指标的标准化差异大小分摊份额，回答「差异主要出现在哪些指标上」；
                    它<strong>不是</strong>把总差异因果归给某个变量——份额高只代表关联强，混杂并未剔除。
                  </p>
                  <div class="attribution-list">
                    <div v-for="item in attributionItems" :key="item.key" class="attr-row">
                      <span class="attr-label">{{ item.label }}</span>
                      <el-progress
                        :percentage="Math.min(100, item.contribution)"
                        :stroke-width="12"
                        :color="item.significant ? '#ef4444' : '#3b82f6'"
                        :format="() => item.contribution.toFixed(1) + '%'"
                      />
                      <span class="attr-delta" :class="item.better === 'B' ? 'delta-up' : item.better === 'A' ? 'delta-down' : 'delta-flat'">{{ item.delta_text }}</span>
                      <el-tag v-if="item.significant" type="danger" size="small" effect="light" class="attr-flag">显著</el-tag>
                    </div>
                  </div>
                </section>

                <!-- 演化趋势 -->
                <section class="compare-section" v-if="trendOptions.length">
                  <h3>
                    <el-icon><DataLine /></el-icon>逐轮演化趋势
                    <el-select v-model="trendMetricKey" size="small" class="trend-select">
                      <el-option v-for="opt in trendOptions" :key="opt.key" :label="opt.label" :value="opt.key" />
                    </el-select>
                    <el-tag v-if="trendUnavailable" type="warning" size="small" effect="light" round class="h3-tag">该指标无有效产出</el-tag>
                  </h3>
                  <div ref="trendChartRef" v-show="!trendUnavailable" class="trend-chart"></div>
                  <div v-if="trendUnavailable" class="trend-unavailable">
                    <el-icon class="trend-unavailable-icon"><WarningFilled /></el-icon>
                    <div class="trend-unavailable-body">
                      <b>{{ trendMetricLabel }}：两组实验都没有可用于对比的逐轮取值</b>
                      <p>{{ trendUnavailable }}</p>
                    </div>
                  </div>
                  <p v-if="trendNote && !trendUnavailable" class="trend-note">{{ trendNote }}</p>
                </section>

                <!-- 加权相似度：后端未返回 similarity 时整段不渲染，避免读 undefined 把详情页整块打崩 -->
                <section class="compare-section" v-if="analysisSimilarity">
                  <h3>
                    <el-icon><Odometer /></el-icon>加权多维相似度
                    <el-tag size="small" effect="light" round class="h3-tag">权重按指标重要度归一化</el-tag>
                  </h3>
                  <el-alert
                    v-if="zeroFlatLabels"
                    type="warning" :closable="false" show-icon class="analysis-alert"
                    :title="zeroFlatMetrics.length + ' 项指标在两组实验中均恒为 0：' + zeroFlatLabels"
                    description="这些指标没有产出有效取值（仿真未生成对应统计）。它们参与相似度计算时，“两边都没有数据”会被算成“高度相似”，请以其余有取值的指标为准。"
                  />
                  <div class="similarity-card">
                    <div class="similarity-main">
                      <div class="similarity-score">
                        <span class="score-number">{{ analysisSimilarity.overall_score }}%</span>
                        <el-tag :type="getSimilarityLevelType()" effect="light" round>{{ analysisSimilarity.level }}</el-tag>
                      </div>
                      <div class="shape-block" v-if="shapeInfo">
                        <div class="shape-title">演化形态相关性</div>
                        <template v-if="shapeInfo.correlation != null">
                          <div class="shape-value">{{ shapeInfo.correlation.toFixed(3) }}</div>
                          <div class="shape-desc">
                            {{ shapeInfo.metric_label }}逐轮曲线的 Pearson 相关系数，
                            形态相似度 {{ shapeInfo.score }}%（共 {{ shapeInfo.points }} 个对齐轮次）
                          </div>
                        </template>
                        <div v-else class="shape-desc">{{ shapeInfo.note }}</div>
                      </div>
                    </div>
                    <div class="similarity-dims">
                      <div v-for="dim in (analysisSimilarity.dimensions || [])" :key="dim.key" class="sim-dim-item">
                        <span class="dim-label">{{ dim.dimension }}<em v-if="dim.weight != null" class="dim-weight">权重 {{ (Number(dim.weight) * 100).toFixed(0) }}%</em></span>
                        <el-progress :percentage="Number(dim.score) || 0" :stroke-width="8" :color="dim.score >= 75 ? '#22c55e' : dim.score >= 50 ? '#eab308' : '#94a3b8'" />
                      </div>
                    </div>
                  </div>
                </section>

                <!-- 基础信息对比表 -->
                <section class="compare-section">
                  <h3><el-icon><Document /></el-icon>基础信息对比</h3>
                  <el-table :data="buildBasicComparison()" size="small" stripe>
                    <el-table-column prop="dimension" label="维度" width="140" />
                    <el-table-column prop="value_a" label="实验 A"><template #default="{ row }"><span class="val-a">{{ row.value_a }}</span></template></el-table-column>
                    <el-table-column prop="value_b" label="实验 B"><template #default="{ row }"><span class="val-b">{{ row.value_b }}</span></template></el-table-column>
                  </el-table>
                </section>

                <!-- 综合结论 -->
                <section class="compare-section recommendation-section">
                  <h3>
                    <el-icon><Setting /></el-icon>综合结论
                    <el-tag v-if="conclusionSource?.source === 'llm'" type="success" size="small" effect="dark" round class="h3-tag">
                      大模型生成{{ conclusionSource.model ? ' · ' + conclusionSource.model : '' }}
                    </el-tag>
                    <el-tag v-else type="info" size="small" effect="light" round class="h3-tag">统计规则生成</el-tag>
                  </h3>
                  <el-alert :title="conclusionText" type="info" :closable="false" show-icon />
                  <p class="conclusion-evidence">证据等级：关联级（因果阶梯第 1 层）——本结论描述两组实验的关联与差异，不含 do(X) 的因果效应；因果判断请以「干预分析」「反事实实验」为准。</p>
                </section>
              </template>

              <!-- 后端不可用 → 本地降级 -->
              <template v-else>
                <el-alert
                  title="后端深度分析接口不可用，以下为本地降级结果（不含显著性检验、归因与溯源）"
                  type="warning" :closable="false" show-icon class="analysis-alert"
                />
                <section class="compare-section">
                  <h3><el-icon><DataLine /></el-icon>基础信息对比</h3>
                  <el-table :data="buildBasicComparison()" size="small" stripe>
                    <el-table-column prop="dimension" label="维度" width="140" />
                    <el-table-column prop="value_a" label="实验 A"><template #default="{ row }"><span class="val-a">{{ row.value_a }}</span></template></el-table-column>
                    <el-table-column prop="value_b" label="实验 B"><template #default="{ row }"><span class="val-b">{{ row.value_b }}</span></template></el-table-column>
                  </el-table>
                </section>
                <section class="compare-section">
                  <h3><el-icon><TrendCharts /></el-icon>关键指标对比</h3>
                  <el-table :data="buildMetricsComparison()" size="small" stripe>
                    <el-table-column prop="metric" label="指标" width="140" />
                    <el-table-column prop="value_a" label="实验 A" />
                    <el-table-column prop="value_b" label="实验 B" />
                    <el-table-column prop="diff" label="差异" />
                    <el-table-column prop="better" label="更优" width="80" />
                  </el-table>
                </section>
                <section class="compare-section">
                  <h3><el-icon><Odometer /></el-icon>相似度（本地估算）</h3>
                  <div class="similarity-card">
                    <div class="similarity-main">
                      <div class="similarity-score">
                        <span class="score-number">{{ computeLocalSimilarity() }}%</span>
                        <el-tag :type="getSimilarityLevelType()" effect="light" round>{{ getSimilarityLevelLabel() }}</el-tag>
                      </div>
                    </div>
                    <div class="similarity-dims">
                      <div v-for="dim in localSimilarityDims" :key="dim.dimension" class="sim-dim-item">
                        <span class="dim-label">{{ dim.dimension }}</span>
                        <el-progress :percentage="dim.score" :stroke-width="8" :color="dim.score >= 75 ? '#22c55e' : dim.score >= 50 ? '#eab308' : '#94a3b8'" />
                      </div>
                    </div>
                  </div>
                </section>
                <section class="compare-section recommendation-section">
                  <h3><el-icon><Setting /></el-icon>综合推荐</h3>
                  <el-alert :title="generateLocalRecommendation()" type="info" :closable="false" show-icon />
                </section>
              </template>
            </div>

            <!-- ===== Tab 3: 概率分布 ===== -->
            <div v-else-if="activeCard === 'distribution'" class="compare-content">
              <div class="dimension-selector">
                <div class="dim-toggle" @click="distDimsExpanded = !distDimsExpanded">
                  <el-icon><component :is="distDimsExpanded ? ArrowDown : ArrowRight" /></el-icon>
                  <span class="dim-selector-label">选择分布指标</span>
                  <span class="dim-hint">（已选 {{ selectedDistMetrics.length }} / {{ DIST_METRIC_OPTIONS.length }}）</span>
                </div>
                <el-checkbox-group v-show="distDimsExpanded" v-model="selectedDistMetrics" size="small" class="dim-checkboxes" @change="handleDistMetricToggle">
                  <el-checkbox v-for="opt in DIST_METRIC_OPTIONS" :key="opt.key" :label="opt.key" :value="opt.key" border>{{ opt.label }}</el-checkbox>
                </el-checkbox-group>
              </div>

              <!-- 同源提示：A、B 属于同一实验的不同轮次时，后端 /distribution 只有一份逐轮分布 -->
              <p
                v-if="sameSourceCase && (distributionDataA || distributionDataB)"
                class="distribution-same-source"
              >
                实验 A 与 B 同属实验 <b>{{ caseA?.experimentId }}</b> 的第 {{ caseA?.iteration }} / {{ caseB?.iteration }} 轮：
                后端 <b>/distribution</b> 只按<b>实验</b>给出逐轮分布，A、B 下面是同一份分布，并非两次独立采样；
                因此这里只画一条曲线，避免把一份分布误读成两个样本。
              </p>
              <div ref="distChartRef" class="distribution-chart-container"></div>

              <!-- 分布统计摘要（论文口径：结果是一个分布，真实世界只是一个样本）
                   均值 / 极值来自后端 metric_ranges，离散度由同一份逐轮真实序列现算，不新增任何推断。 -->
              <div class="distribution-summary" v-if="distributionDataA || distributionDataB">
                <div class="dist-summary-card" v-for="card in distSummaryCards" :key="card.key">
                  <div class="dist-summary-head">
                    <span class="dist-summary-label">{{ card.label }}</span>
                    <span class="dist-summary-unit" v-if="card.unit">{{ card.unit }}</span>
                  </div>
                  <div class="dist-summary-block" v-if="card.a">
                    <div class="dist-summary-row">
                      <span class="dist-tag-a">A</span>
                      <span>均值 {{ formatDistNumber(card.a.mean, 3) }}</span>
                      <span class="dist-range">[{{ formatDistNumber(card.a.min, 2) }}, {{ formatDistNumber(card.a.max, 2) }}]</span>
                    </div>
                    <div class="dist-summary-meta">N = {{ card.a.n }} 轮 · 标准差 σ = {{ card.a.stdText }} · 变异系数 CV = {{ card.a.cvText }}</div>
                  </div>
                  <!-- 同源时 A、B 是同一份分布，不再重复列一遍 -->
                  <div class="dist-summary-block" v-if="card.b && !sameSourceCase">
                    <div class="dist-summary-row">
                      <span class="dist-tag-b">B</span>
                      <span>均值 {{ formatDistNumber(card.b.mean, 3) }}</span>
                      <span class="dist-range">[{{ formatDistNumber(card.b.min, 2) }}, {{ formatDistNumber(card.b.max, 2) }}]</span>
                    </div>
                    <div class="dist-summary-meta">N = {{ card.b.n }} 轮 · 标准差 σ = {{ card.b.stdText }} · 变异系数 CV = {{ card.b.cvText }}</div>
                  </div>
                </div>
              </div>
              <p v-if="distSummaryCards.length" class="distribution-footnote">
                以上统计取自每个实验<b>单次仿真内部的逐轮取值</b>（轮间分布），不是独立重复运行的抽样分布；
                轮次之间高度自相关，因此这里不给出置信区间。要得到可推断的区间，需按计算实验规范固定随机种子做多次独立重复
                （见「干预分析」的策略重复与「反事实实验」的成对世界）。
              </p>
              <div v-else-if="distLoading" class="compare-empty-inline">
                <p>正在加载概率分布数据...</p>
              </div>
              <div v-else-if="hasDistributionData" class="compare-empty-inline">
                <p>已取到逐轮数据，但当前勾选的分布指标在这两个实验里都没有有效取值，请在上方「选择分布指标」里更换指标。</p>
              </div>
              <div v-else class="compare-empty-inline">
                <p>未取到这两个实验的逐轮指标数据（后端 /distribution 无有效返回），因此不展示分布图与统计卡，避免用模拟数据误导结论。</p>
              </div>
            </div>

          </div>
      </section>
      </template>
    </ObserveWorldView>

    <!-- ===== 底部：跨库相似度对比 ===== -->
    <section class="cross-library-section" v-if="caseFolders[0].children.length && caseFolders[1].children.length">
      <header class="cross-library-head">
        <el-icon :size="18"><Odometer /></el-icon>
        <span>事中实验库 vs 反事实实验库 — 相似度矩阵</span>
        <span class="cross-library-sub">共 {{ caseFolders[0].children.length }} × {{ caseFolders[1].children.length }} 对</span>
      </header>
      <div class="cross-library-body">
        <!-- 综合分析摘要 -->
        <div class="matrix-summary">
          <p>{{ crossLibrarySummary }}</p>
        </div>
        <!-- 显示/隐藏详情 -->
        <div class="matrix-toggle-row">
          <el-button text size="small" @click="matrixExpanded = !matrixExpanded">
            <el-icon><component :is="matrixExpanded ? ArrowUp : ArrowDown" /></el-icon>
            {{ matrixExpanded ? '收起矩阵详情' : '显示矩阵详情' }}
          </el-button>
        </div>
        <!-- 相似度矩阵（可折叠） -->
        <div v-show="matrixExpanded" class="cross-library-table">
          <el-table :data="crossSimilarityRows" size="small" stripe border max-height="400">
            <el-table-column prop="duringName" label="事中实验" width="200" fixed />
            <el-table-column
              v-for="cf in topCfCases"
              :key="cf.id"
              :label="cf.name?.substring(0, 25) || cf.id"
              min-width="110"
              align="center"
            >
              <template #default="{ row }">
                <span class="sim-cell" :style="{ color: getSimColor(row.scores?.[cf.id]) }">
                  {{ row.scores?.[cf.id] || '--' }}%
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowDown, ArrowRight, ArrowUp, Collection, DataAnalysis, DataLine, Document, Download,
  Odometer, Refresh, Setting, TrendCharts, WarningFilled
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getExperimentDetail, compareCases, getExperimentDistribution } from '@/api/supplyChain'
import ChatHandoffStrip from '@/components/SCnet/ChatHandoffStrip.vue'
import ExperimentStageNav from '@/components/SCnet/ExperimentStageNav.vue'
import ObserveWorldView from '@/components/SCnet/ObserveWorldView.vue'
import { unwrapApiData } from '@/utils/apiEnvelope'
import { useSupplyChainScenario } from '@/composables/useSupplyChainScenario'
import { useRoute } from 'vue-router'
import { PLAN_QUERY_KEY, readExperimentPlan, resolvePlanObserveMetricKeys } from '@/constants/scnetExperimentPlan'

// ---- 状态 ----
const loading = ref(false)
// 当前展开详情的结论卡片：null = 全部收起；点击卡片切换
const activeCard = ref(null)
const caseAId = ref(null)
const caseBId = ref(null)
const comparison = ref(null)
// 后端深度分析（加权相似度 / 显著性检验 / 差异归因 / 演化趋势 / 结论 / 数据溯源）
const analysis = ref(null)
const resolvedIds = ref(null)
const analysisLoading = ref(false)
const analysisError = ref('')
// 案例库提示：说明被过滤掉的“仿真未产出指标”的实验
const libraryNotice = ref('')
// 是否把对比聚焦到案例所属的那一轮（默认关闭：按报告全部轮次对比，才有足够样本做显著性检验）
const focusIteration = ref(false)
const trendChartRef = ref(null)
let trendChartInstance = null
// ---- 场景（铀供应链 / 汽车供应链）：与对话首页共用同一份选择 ----
// ?scenario= 进入时以 URL 为准；场景文案取 sceneText（汽车侧口径来自参数目录与知识库）
const { isUraniumScene, sceneText, routeExperimentId, loadScenarioExperiments } = useSupplyChainScenario()

const caseFolders = reactive([
  { id: 'f1', label: sceneText.value.duringFolder, expanded: true, children: [] },
  { id: 'f2', label: sceneText.value.counterfactualFolder, expanded: true, children: [] }
])

// 场景在本页内切换（首页切换后回到本页）时，重置库名、选择与已加载案例
watch(isUraniumScene, () => {
  caseFolders[0].label = sceneText.value.duringFolder
  caseFolders[1].label = sceneText.value.counterfactualFolder
  caseAId.value = null
  caseBId.value = null
  resetAnalysis()
  loadAllCases()
})

const totalCaseCount = computed(() =>
  caseFolders.reduce((sum, f) => sum + f.children.length, 0)
)

const findCaseById = (id) => {
  for (const f of caseFolders) {
    const found = f.children.find(c => c.id === id)
    if (found) return found
  }
  return null
}

const caseA = computed(() => findCaseById(caseAId.value))
const caseB = computed(() => findCaseById(caseBId.value))

// ---- 字段定义（铀场景） ----
const paramFields = [
  { key: 'demandLevel', label: '需求强度' },
  { key: 'capacityPlan', label: '产能方案' },
  { key: 'intervention', label: '干预策略' },
  { key: 'method', label: '方法' }
]

const resultFields = [
  { key: 'completionRate', label: '完成率' },
  { key: 'backlogRate', label: '缺口率' },
  { key: 'collaboration', label: '协作次数' },
  { key: 'resilience', label: '韧性指数' }
]

const defaultEventNodes = [
  { title: '铀需求冲击触发', step: 4, type: 'red', desc: '全球核电需求上升，铀矿订单量激增 25%' },
  { title: '铀矿产能瓶颈暴露', step: 8, type: 'orange', desc: '现有矿山利用率达上限，供应缺口开始累积' },
  { title: '新矿投产决策启动', step: 12, type: 'blue', desc: '触发新矿开发阈值，评估 Dasa/Wheeler River 等投产时机' },
  { title: '供应完成率回稳', step: 18, type: 'green', desc: '扩产策略生效，铀供应履约完成率逐步恢复' }
]

// 汽车供应链的事件骨架：只描述仿真生命周期与参数目录中的真实参数名，
// 不写任何具体数值（有真实迭代数据时一律走 buildEventNodes）
const carEventNodes = [
  { title: '市场需求参数加载', step: 1, type: 'red', desc: '按参数目录载入市场需求强度（order_multiplier），开始观察订单承载压力。' },
  { title: '工厂产能配置执行', step: 2, type: 'orange', desc: '按工厂产能范围（factory_capacity_range）配置总厂下属工厂产能与协作范围。' },
  { title: '仿真结果回收', step: 3, type: 'blue', desc: '回收订单完成率、系统总利润、企业数量等观测指标。' },
  { title: '策略复盘', step: 4, type: 'green', desc: '汇总综合得分，用于后续反事实实验与案例对比分析。' }
]

const sceneDefaultEventNodes = computed(() =>
  isUraniumScene.value ? defaultEventNodes : carEventNodes
)

// ---- 概率分布图状态 ----
const distributionDataA = ref(null)
const distributionDataB = ref(null)
const distLoading = ref(false)
const distChartRef = ref(null)
let distChartInstance = null
const metricsLineChartRef = ref(null)
let metricsLineChartInstance = null

// 分布图指标：键集合由后端 /distribution 固定给出（两种场景一致），
// 仅产能估算的单位随场景变化 —— 铀矿产能计 tU/年，汽车侧工厂产能无单位
const DIST_METRIC_OPTIONS = computed(() => [
  { key: 'completion_rate', label: '订单完成率', unit: '%', color: '#3b82f6' },
  { key: 'total_profit', label: '系统总利润', unit: '', color: '#22c55e' },
  { key: 'network_density', label: '网络密度', unit: '', color: '#8b5cf6' },
  { key: 'enterprise_count', label: '企业数量', unit: '', color: '#f59e0b' },
  { key: 'network_stability', label: '网络稳定性', unit: '%', color: '#ef4444' },
  { key: 'production_capacity_est', label: isUraniumScene.value ? '产能估算(tU/年)' : '产能估算', unit: '', color: '#0d9488' },
])
const selectedDistMetrics = ref(['completion_rate', 'total_profit', 'network_density', 'network_stability'])
const distDimsExpanded = ref(false)

// 实验方案里勾选的「目标指标」→ 本页指标分布口径（按 key / 别名 / 名称匹配）。
// 此前目标指标只存不消费，方案设计页选的口径到分析页没有任何效果。
const route = useRoute()
const planMetricKeys = resolvePlanObserveMetricKeys(readExperimentPlan(String(route.query[PLAN_QUERY_KEY] || '').trim()))
if (planMetricKeys.length) selectedDistMetrics.value = planMetricKeys

// 观察分析是关联级证据：这里只把「一个分布」展示清楚，不做任何因果推断。
// 口径：样本量 / 均值 / 极值以后端 metric_ranges 为准（后端把恒为 0 或缺失的指标记成 count=0，
// 此时不出卡片）；离散度（标准差 / 变异系数）由同一份逐轮真实序列现算。
// 注意 Number(null) === 0，必须显式剔除空值，否则缺失指标会被当成 0 混进分布。
const computeDistStats = (data, key) => {
  const range = data?.metric_ranges?.[key]
  const count = Number(range?.count)
  if (!Number.isFinite(count) || count <= 0) return null
  const mean = Number(range?.mean)
  if (!Number.isFinite(mean)) return null
  const rows = Array.isArray(data?.metrics_by_iteration) ? data.metrics_by_iteration : []
  const values = rows
    .map((row) => row?.[key])
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map(Number)
    .filter((value) => Number.isFinite(value))
  let std = null
  if (values.length > 1) {
    const seriesMean = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance = values.reduce((sum, value) => sum + (value - seriesMean) ** 2, 0) / (values.length - 1)
    std = Math.sqrt(variance)
  }
  const cv = std !== null && Math.abs(mean) > 1e-9 ? std / Math.abs(mean) : null
  return {
    n: count,
    mean,
    std,
    cv,
    min: range?.min,
    max: range?.max,
    stdText: std === null ? '--' : std.toFixed(3),
    cvText: cv === null ? '--' : `${(cv * 100).toFixed(1)}%`
  }
}

const formatDistNumber = (value, digits) => (
  Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '--'
)

const hasDistributionData = computed(() => Boolean(distributionDataA.value || distributionDataB.value))
// 同源时 A、B 是同一份分布，只有 B 侧有取值的卡片在模板里会被隐藏成空卡，这里直接过滤掉
const distSummaryCards = computed(() =>
  DIST_METRIC_OPTIONS.value
    .filter((opt) => selectedDistMetrics.value.includes(opt.key))
    .map((opt) => ({
      ...opt,
      a: computeDistStats(distributionDataA.value, opt.key),
      b: computeDistStats(distributionDataB.value, opt.key)
    }))
    .filter((card) => card.a || (card.b && !sameSourceCase.value))
)
const matrixExpanded = ref(false)

// ---- 跨库相似度矩阵 ----
const topCfCases = computed(() => caseFolders[1].children.slice(0, 8))

const crossSimilarityRows = computed(() => {
  const during = caseFolders[0].children
  const cf = topCfCases.value
  if (!during.length || !cf.length) return []
  return during.map(dCase => {
    const scores = {}
    cf.forEach(cCase => {
      scores[cCase.id] = computePairSimilarity(dCase, cCase)
    })
    return { duringName: dCase.name, scores }
  })
})

const crossLibrarySummary = computed(() => {
  const during = caseFolders[0].children
  const cf = caseFolders[1].children
  if (!during.length || !cf.length) return ''
  const rows = crossSimilarityRows.value
  if (!rows.length) return ''
  // 计算平均相似度 & 极值
  let totalSim = 0, simCount = 0, maxSim = 0, minSim = 100
  rows.forEach(r => {
    const scores = Object.values(r.scores || {})
    scores.forEach(s => {
      if (typeof s === 'number') {
        totalSim += s; simCount++
        if (s > maxSim) maxSim = s
        if (s < minSim) minSim = s
      }
    })
  })
  const avgSim = simCount ? Math.round(totalSim / simCount) : 0
  const highCount = rows.reduce((c, r) => c + Object.values(r.scores || {}).filter(s => s >= 75).length, 0)
  const lowCount = rows.reduce((c, r) => c + Object.values(r.scores || {}).filter(s => s < 50).length, 0)
  return `事中实验库（${during.length} 个）与反事实实验库（${cf.length} 个）共 ${during.length * Math.min(cf.length, 8)} 对比较，整体平均相似度 ${avgSim}%。其中高度相似（≥75%）${highCount} 对，差异较大（<50%）${lowCount} 对。事中与反事实实验在产能配置和完成率维度上区分度最为显著，可通过调整${sceneText.value.capacityLabel}与${sceneText.value.thresholdField}进一步拉开策略差异。`
})

const computePairSimilarity = (a, b) => {
  if (!a || !b) return 0
  let total = 0, count = 0
  const keys = ['completionRate', 'backlogRate', 'collaboration', 'resilience']
  keys.forEach(k => {
    const va = parseNumeric(a[k]), vb = parseNumeric(b[k])
    if (va > 0 && vb > 0) {
      total += Math.max(10, Math.round((1 - Math.abs(va - vb) / Math.max(Math.abs(va), Math.abs(vb), 1)) * 100))
      count++
    }
  })
  // 产能方案文本相似度
  if (a.capacityPlan && b.capacityPlan) {
    total += a.capacityPlan === b.capacityPlan ? 90 : 40
    count++
  }
  return count > 0 ? Math.round(total / count) : 0
}

const getSimColor = (score) => {
  if (score == null) return '#94a3b8'
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  return '#ef4444'
}

// ---- 自选对比维度（指标对比 tab 的可选维度） ----
// 自选对比维度：名称随场景取（铀需求强度 / 市场需求强度、铀矿产能方案 / 工厂产能方案）
const COMPARISON_DIM_OPTIONS = computed(() => [
  { key: 'completionRate', label: '订单完成率' },
  { key: 'backlogRate', label: '供应缺口率' },
  { key: 'collaboration', label: '网络协作次数' },
  { key: 'resilience', label: '韧性指数' },
  { key: 'demandLevel', label: sceneText.value.demandField },
  { key: 'capacityPlan', label: sceneText.value.capacityField },
  { key: 'intervention', label: '干预策略' },
  { key: 'method', label: '实验方法' },
])
const selectedComparisonDims = ref(['completionRate', 'backlogRate', 'resilience', 'demandLevel'])
const dimsExpanded = ref(false)

// 自选维度过滤
const filteredParamFields = computed(() =>
  paramFields.filter(p => selectedComparisonDims.value.includes(p.key))
)
const filteredResultFields = computed(() =>
  resultFields.filter(r => selectedComparisonDims.value.includes(r.key))
)

// 指标对比折线图的结果指标口径：与「自选对比维度」里勾选的结果项保持一致，
// 勾选项为空时不出图（模板给提示），而不是继续画全部四项。
const chartMetrics = computed(() => [
  { key: 'completionRate', label: '完成率', parse: v => parseFloat(v) || 0 },
  { key: 'backlogRate', label: '缺口率', parse: v => parseFloat(v) || 0 },
  { key: 'collaboration', label: '协作次数', parse: v => parseInt(v) || 0 },
  { key: 'resilience', label: '韧性', parse: v => parseFloat(v) || 0 }
].filter(m => selectedComparisonDims.value.includes(m.key)))

const localSimilarityDims = computed(() => {
  if (!caseA.value || !caseB.value) return []
  return [
    { dimension: '产能配置', score: computeDimSimilarity('capacityPlan') },
    { dimension: '需求强度', score: computeDimSimilarity('demandLevel') },
    { dimension: '干预策略', score: computeDimSimilarity('intervention') },
    { dimension: '完成率表现', score: computeDimSimilarity('completionRate') }
  ]
})

const resetAnalysis = () => {
  analysis.value = null
  resolvedIds.value = null
  analysisError.value = ''
  comparison.value = null
  // 场景/案例被清空时，上一场的逐轮分布也必须一起清掉，否则会挂在新场景的卡片上
  clearDistributionData()
}

// ---- 概率分布数据获取（只使用后端真实轮次数据，不做本地模拟） ----
const fetchDistributionForCase = async (caseObj) => {
  const expId = caseObj?.experimentId
  if (!expId) return null
  try {
    const res = await getExperimentDistribution(expId)
    const data = unwrapApiData(res)
    if (data && data.metrics_by_iteration?.length) return data
    return null
  } catch {
    return null
  }
}

// 序号用于丢弃过期响应：用户连续换 A/B 时，先发的请求可能后返回，
// 不丢弃就会把上一组实验的分布留在卡片上（等于把数据安到别的实验头上）。
let distRequestSeq = 0
const clearDistributionData = () => {
  distRequestSeq += 1
  distributionDataA.value = null
  distributionDataB.value = null
  if (distChartInstance) {
    distChartInstance.dispose()
    distChartInstance = null
  }
}
const loadDistributionData = async () => {
  if (!caseA.value || !caseB.value) {
    clearDistributionData()
    return
  }
  const seq = ++distRequestSeq
  // 换 A/B 后先把上一组的分布清掉：新数据到达前卡片上若仍是上一组的统计，
  // 会被读成这一组实验的结果（序号只保证过期响应不覆盖，挡不住旧数据继续显示）。
  distributionDataA.value = null
  distributionDataB.value = null
  disposeDistChart()
  distLoading.value = true
  try {
    const [a, b] = await Promise.all([
      fetchDistributionForCase(caseA.value),
      fetchDistributionForCase(caseB.value)
    ])
    if (seq !== distRequestSeq) return
    distributionDataA.value = a
    distributionDataB.value = b
    await nextTick()
    renderDistributionChart()
  } finally {
    if (seq === distRequestSeq) distLoading.value = false
  }
}

// ---- ECharts 概率分布图渲染（平滑折线分布图） ----
const hexToRgba = (hex, alpha) => {
  const h = String(hex).replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const areaGradient = (color) => ({
  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
  colorStops: [
    { offset: 0, color: hexToRgba(color, 0.30) },
    { offset: 1, color: hexToRgba(color, 0.02) }
  ]
})

const renderDistributionChart = () => {
  const container = distChartRef.value
  if (!container) return
  if (distChartInstance) distChartInstance.dispose()

  const dataA = distributionDataA.value
  // 同源（A、B 是同一实验的不同轮次）时后端只给一份逐轮分布，不去画第二条曲线
  const dataB = sameSourceCase.value ? null : distributionDataB.value
  if (!dataA && !dataB) return

  const selectedMetrics = selectedDistMetrics.value.filter(k =>
    DIST_METRIC_OPTIONS.value.some(o => o.key === k)
  )
  if (!selectedMetrics.length) return
  distChartInstance = echarts.init(container)

  const rows = selectedMetrics.length
  const colors = ['#3b82f6', '#22c55e']
  // 布局：顶部为第一个图的指标名、底部为图例预留空间，并加大图与图之间的垂直间距，避免文字被遮挡
  const TOP_SPACE = 5
  const LEGEND_SPACE = 8
  const ROW_GAP = rows <= 2 ? 9 : rows <= 4 ? 7 : 5
  const usablePct = 100 - TOP_SPACE - LEGEND_SPACE
  const rowHeightPct = Math.max(8, (usablePct - ROW_GAP * (rows - 1)) / rows)

  const gridItems = []
  const xAxes = []
  const yAxes = []
  const seriesItems = []

  selectedMetrics.forEach((metricKey, idx) => {
    const opt = DIST_METRIC_OPTIONS.value.find(o => o.key === metricKey) || { label: metricKey, unit: '' }
    const topPct = TOP_SPACE + idx * (rowHeightPct + ROW_GAP)

    gridItems.push({
      left: '13%', right: '6%', top: topPct + '%', height: rowHeightPct + '%',
      containLabel: true
    })

    xAxes.push({
      gridIndex: idx,
      type: 'value',
      name: opt.unit || '',
      nameGap: 14,
      nameTextStyle: { fontSize: 10, color: '#94a3b8' },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
    })

    yAxes.push({
      gridIndex: idx,
      type: 'value',
      name: opt.label,
      nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
      axisLabel: { fontSize: 10, color: '#64748b' },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false }
    })

    // 提取数据
    const iterA = dataA?.metrics_by_iteration || []
    const iterB = dataB?.metrics_by_iteration || []

    const getValues = (iters, key) =>
      iters.map(i => Number(i[key])).filter(v => Number.isFinite(v))

    const valuesA = getValues(iterA, metricKey)
    const valuesB = getValues(iterB, metricKey)

    // 构建直方图分箱 → 作为折线的离散分布点（平滑曲线拟合分布形状）
    const buildHistogram = (values) => {
      if (!values.length) return []
      const min = Math.min(...values)
      const max = Math.max(...values)
      if (min === max) return [[min, values.length]]
      const binCount = Math.min(12, Math.max(6, Math.ceil(values.length / 1.5)))
      const binWidth = (max - min) / binCount
      const bins = Array(binCount).fill(0)
      values.forEach(v => {
        const binIdx = Math.min(binCount - 1, Math.floor((v - min) / binWidth))
        bins[binIdx]++
      })
      return bins.map((count, i) => [min + binWidth * i + binWidth / 2, count])
    }

    const histA = buildHistogram(valuesA)
    const histB = buildHistogram(valuesB)

    seriesItems.push({
      name: sameSourceCase.value ? 'A／B 同源分布' : '实验 A', type: 'line', xAxisIndex: idx, yAxisIndex: idx,
      data: histA.map(([x, y]) => [x, y]),
      smooth: 0.6,
      symbol: 'circle', symbolSize: 6, showSymbol: true,
      lineStyle: {
        color: colors[0], width: 2.5,
        shadowColor: hexToRgba(colors[0], 0.4), shadowBlur: 8, shadowOffsetY: 3
      },
      itemStyle: { color: colors[0], borderColor: '#fff', borderWidth: 1.5 },
      areaStyle: { color: areaGradient(colors[0]) },
      emphasis: { focus: 'series', scale: 1.3 },
      z: 3
    })
    if (!sameSourceCase.value) {
      seriesItems.push({
        name: '实验 B', type: 'line', xAxisIndex: idx, yAxisIndex: idx,
        data: histB.map(([x, y]) => [x, y]),
        smooth: 0.6,
        symbol: 'diamond', symbolSize: 6, showSymbol: true,
        lineStyle: {
          color: colors[1], width: 2.5,
          shadowColor: hexToRgba(colors[1], 0.4), shadowBlur: 8, shadowOffsetY: 3
        },
        itemStyle: { color: colors[1], borderColor: '#fff', borderWidth: 1.5 },
        areaStyle: { color: areaGradient(colors[1]) },
        emphasis: { focus: 'series', scale: 1.3 },
        z: 3
      })
    }
  })

  distChartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#94a3b8', type: 'dashed' } },
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (params) => {
        const lines = params.map(p =>
          `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}：<b>${p.value?.[0]?.toFixed?.(3) || p.value?.[0] || '--'}</b> → ${p.value?.[1] ?? 0} 次`
        )
        return lines.join('<br/>')
      }
    },
    legend: {
      data: sameSourceCase.value ? ['A／B 同源分布'] : ['实验 A', '实验 B'],
      bottom: 0,
      textStyle: { fontSize: 11, color: '#64748b' },
      itemWidth: 16, itemHeight: 4, itemGap: 24
    },
    grid: gridItems,
    xAxis: xAxes,
    yAxis: yAxes,
    series: seriesItems
  })
}

const handleDistMetricToggle = () => {
  nextTick(() => renderDistributionChart())
}

// 销毁 chart
const disposeDistChart = () => {
  if (distChartInstance) {
    distChartInstance.dispose()
    distChartInstance = null
  }
}
const disposeMetricsLineChart = () => {
  if (metricsLineChartInstance) {
    metricsLineChartInstance.dispose()
    metricsLineChartInstance = null
  }
}

// ---- 指标对比折线图 ----
const renderMetricsLineChart = () => {
  const container = metricsLineChartRef.value
  if (!container || !caseA.value || !caseB.value) return
  const metrics = chartMetrics.value
  if (!metrics.length) return
  if (metricsLineChartInstance) metricsLineChartInstance.dispose()
  metricsLineChartInstance = echarts.init(container)

  const aData = metrics.map(m => m.parse(caseA.value[m.key]))
  const bData = metrics.map(m => m.parse(caseB.value[m.key]))
  const labels = metrics.map(m => m.label)

  metricsLineChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['实验 A', '实验 B'],
      bottom: 0,
      itemGap: 20,
      textStyle: { fontSize: 11, color: '#64748b', padding: [2, 8] }
    },
    grid: { left: '12%', right: '8%', top: 16, bottom: 40 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { fontSize: 11, color: '#64748b' },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { fontSize: 10, color: '#94a3b8' }
    },
    series: [
      {
        name: '实验 A', type: 'line',
        data: aData,
        smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' }
      },
      {
        name: '实验 B', type: 'line',
        data: bData,
        smooth: true, symbol: 'diamond', symbolSize: 6,
        lineStyle: { color: '#22c55e', width: 2 },
        itemStyle: { color: '#22c55e' }
      }
    ]
  })
}

// 展开结论卡片 → 渲染对应图表（图表容器在 v-if 内，须等 DOM 就绪）
watch(activeCard, (key) => {
  // 离开某张卡片时它的容器会被 v-if 移除，图表实例要一并销毁：
  // 否则窗口 resize 会对已脱离文档的 DOM 调 resize，ECharts 拿不到宽高会持续告警。
  if (key !== 'distribution') disposeDistChart()
  if (key !== 'metrics') disposeMetricsLineChart()
  if (key !== 'deep') disposeTrendChart()
  if (key === 'metrics' && caseA.value && caseB.value) {
    nextTick(() => renderMetricsLineChart())
  }
  if (key === 'deep' && analysis.value) {
    nextTick(() => renderTrendChart())
  }
  if (key === 'distribution' && caseA.value && caseB.value) loadDistributionData()
})

// 监听 caseA/caseB 变化 → 自动渲染图表
watch([caseA, caseB], ([a, b]) => {
  // /distribution 是「按实验」返回的：换 A/B 必须重新拉取，否则摘要会继续显示上一组实验的分布。
  if (!a || !b) { clearDistributionData(); return }
  loadDistributionData()
  // 已展开的详情卡片要跟着换数据重绘
  if (activeCard.value === 'metrics') nextTick(() => renderMetricsLineChart())
  if (activeCard.value === 'deep') nextTick(() => renderTrendChart())
})

// 自选对比维度变化 → 折线图跟着增减结果指标
watch(selectedComparisonDims, () => {
  if (activeCard.value === 'metrics') nextTick(() => renderMetricsLineChart())
})

// ================= 后端深度分析结果 =================
const metricRows = computed(() => analysis.value?.metrics || [])
const significantRows = computed(() => metricRows.value.filter(r => r.significant))
const attributionItems = computed(() => analysis.value?.attribution || [])
const comparability = computed(() => analysis.value?.comparability || null)
const provenance = computed(() => analysis.value?.provenance || null)
const shapeInfo = computed(() => analysis.value?.similarity?.shape || null)
// 后端深度分析可能只给结论/指标、不给 similarity；读取处统一走这里做空值保护
const analysisSimilarity = computed(() => analysis.value?.similarity || null)
const similarityScore = computed(() =>
  analysis.value?.similarity?.overall_score ?? comparison.value?.similarity?.overall_score ?? null)
const conclusionText = computed(() => {
  const c = analysis.value?.conclusion
  if (c?.text) return c.text
  return generateLocalRecommendation()
})
const conclusionSource = computed(() => analysis.value?.conclusion || null)
const analysisReady = computed(() => !!analysis.value)

// 三标签页结论摘要：把「指标对比 / 深度分析 / 概率分布」的结论抽象成一句话，直接显示在对比区顶部
const deepConclusionText = computed(() => analysis.value?.recommendation || generateLocalRecommendation())
const distributionConclusionText = computed(() => {
  if (sameSourceCase.value && (distributionDataA.value || distributionDataB.value)) {
    return '实验 A / B 是同一份实验报告的两个轮次，只有一条逐轮曲线；可比较两轮取值位置，但不能当作两次独立采样。'
  }
  const cards = distSummaryCards.value
  if (!cards.length) return '选择 A / B 后，这里会给出各指标分布的均值、区间与离散度摘要。'
  const first = cards[0]
  const parts = []
  if (first.a) parts.push(`A 均值 ${formatDistNumber(first.a.mean, 3)}（σ=${first.a.stdText}）`)
  if (first.b) parts.push(`B 均值 ${formatDistNumber(first.b.mean, 3)}（σ=${first.b.stdText}）`)
  return `${first.label}：${parts.join('，')}。共 ${cards.length} 个指标已按真实逐轮取值给出分布摘要。`
})
const conclusionSummaryCards = computed(() => [
  { key: 'metrics', tone: 'blue', icon: TrendCharts, title: '指标对比', text: conclusionText.value, ready: Boolean(caseA.value && caseB.value) },
  { key: 'deep', tone: 'indigo', icon: Setting, title: '深度分析', text: deepConclusionText.value, ready: analysisReady.value },
  { key: 'distribution', tone: 'green', icon: DataLine, title: '概率分布', text: distributionConclusionText.value, ready: distSummaryCards.value.length > 0 }
])

// 详情面板标题 / 图标：跟随当前展开的卡片；全部收起时 activeCard 为 null
const activeCardMeta = computed(() => conclusionSummaryCards.value.find(c => c.key === activeCard.value) || null)
const activeCardTitle = computed(() => (activeCardMeta.value ? `${activeCardMeta.value.title} · 详情` : '对比详情'))
const activeCardIcon = computed(() => activeCardMeta.value?.icon || TrendCharts)
const toggleDetail = (key) => { activeCard.value = activeCard.value === key ? null : key }

// 效应量分级（Cohen 1988 惯例）
const effectSizeLabel = (d) => {
  const v = Math.abs(Number(d))
  if (!Number.isFinite(v)) return '--'
  if (v < 0.2) return '几乎无'
  if (v < 0.5) return '小'
  if (v < 0.8) return '中'
  return '大'
}

const formatPValue = (p) => {
  const v = Number(p)
  if (!Number.isFinite(v)) return '--'
  if (v < 0.001) return '< 0.001'
  return v.toFixed(3)
}

const formatSigned = (v, digits = 1, suffix = '') => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}${suffix}`
}

const significanceTag = (row) => {
  if (row.significant) return { type: 'success', text: row.verdict || '显著' }
  if (row.verdict === '样本不足') return { type: 'info', text: '样本不足' }
  return { type: 'info', text: row.verdict || '不显著' }
}

const betterLabel = (row) => (row.better === 'B' ? '实验 B' : row.better === 'A' ? '实验 A' : '持平')

const comparabilityLevelMeta = computed(() => {
  const level = comparability.value?.level
  if (level === 'high') return { type: 'success', text: '可比性高' }
  if (level === 'medium') return { type: 'warning', text: '可比性中等' }
  if (level === 'low') return { type: 'error', text: '可比性低' }
  return null
})

// ---- 演化趋势图 ----
const trendMetricKey = ref('') // probe
const trendOptions = computed(() => (analysis.value?.trend || []).map(t => ({ key: t.key, label: t.label })))

// 判定一条曲线的“信号”：有点、且取值不全为同一个常数。
// 恒定曲线（尤其全为 0）画出来是一条水平线，A/B 叠加会完全重合，看着像“两组表现一致”，
// 实际是仿真根本没产出这项统计（铀场景的完成率/利润全为 0 就是这个情况）。
const seriesStats = (pts) => {
  const values = (Array.isArray(pts) ? pts : [])
    .map(p => Number(p?.value))
    .filter(v => Number.isFinite(v))
  if (!values.length) return { count: 0, empty: true, allZero: false, constant: false, hasSignal: false }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const allZero = values.every(v => Math.abs(v) < 1e-12)
  const constant = (max - min) <= 1e-12
  return { count: values.length, empty: false, allZero, constant, hasSignal: !constant }
}

const trendUnavailable = ref('')
const trendNote = ref('')
const trendMetricLabel = computed(
  () => (analysis.value?.trend || []).find(t => t.key === trendMetricKey.value)?.label || '该指标')
const sameSourceCase = computed(() => {
  const a = caseA.value
  const b = caseB.value
  return !!(a && b && a.experimentId && a.experimentId === b.experimentId)
})
// 两侧都没有有效波动的指标：会被相似度算成“完全一致”，需要显式提示
const zeroFlatMetrics = computed(() => (analysis.value?.trend || [])
  .filter(t => !seriesStats(t.series_a).hasSignal && !seriesStats(t.series_b).hasSignal))
const zeroFlatLabels = computed(() => zeroFlatMetrics.value.map(m => m.label).join('、'))

watch(trendOptions, (opts) => {
  if (!opts.length) { trendMetricKey.value = ''; return }
  if (!opts.some(o => o.key === trendMetricKey.value)) trendMetricKey.value = opts[0].key
}, { immediate: true })

watch(trendMetricKey, () => { nextTick(() => renderTrendChart()) })

// 深度分析结果到达后，若「深度分析」卡片正展开则立即渲染趋势图
watch(analysis, (val) => {
  if (val && activeCard.value === 'deep') nextTick(() => renderTrendChart())
})

// 切换"聚焦单轮次"后重新对比
watch(focusIteration, () => {
  if (caseA.value && caseB.value) runComparison()
})

const renderTrendChart = () => {
  const trend = (analysis.value?.trend || []).find(t => t.key === trendMetricKey.value)
  trendUnavailable.value = ''
  trendNote.value = ''
  if (trendChartInstance) { trendChartInstance.dispose(); trendChartInstance = null }
  if (!trend) return

  const ptsA = trend.series_a || []
  const ptsB = trend.series_b || []
  const statA = seriesStats(ptsA)
  const statB = seriesStats(ptsB)

  // 两侧都没有有效波动：不画重合线，直接说明原因
  if (!statA.hasSignal && !statB.hasSignal) {
    if (statA.empty && statB.empty) {
      trendUnavailable.value = '两组实验报告里都没有这项指标的逐轮取值。'
    } else if (statA.allZero && statB.allZero) {
      trendUnavailable.value = '两组实验该指标的逐轮取值全部为 0，说明仿真没有产出这项统计，并不代表“两组表现一致”。请换看其它指标，或回到反事实实验平台重跑一次能产出该指标的实验。'
    } else {
      trendUnavailable.value = '两组实验该指标的逐轮取值恒定不变，无法体现两组之间的演化差异。'
    }
    return
  }
  // A/B 同属一份实验时，后端按整份报告返回的 series_a 与 series_b 本来就是同一条曲线
  const sameSource = sameSourceCase.value
  const sourceExpId = caseA.value?.experimentId || ''
  if (sameSource) {
    trendNote.value = `A、B 同属一份实验报告（${sourceExpId}）：两侧逐轮序列本就相同，图中改为这一份报告的逐轮曲线，并标出第 ${caseA.value?.iteration ?? '--'} 轮（事中·基准）与第 ${caseB.value?.iteration ?? '--'} 轮（反事实·干预）；指标对比已锁到这两个轮次取值。`
  } else if (!statA.hasSignal) {
    trendNote.value = '实验 A 该指标无有效波动（恒定或全为 0），图中只显示实验 B 的演化。'
  } else if (!statB.hasSignal) {
    trendNote.value = '实验 B 该指标无有效波动（恒定或全为 0），图中只显示实验 A 的演化。'
  }

  const container = trendChartRef.value
  // 容器为 null 说明「深度分析」页签此刻没被渲染（v-else-if），必须直接返回。
  // 原先这里是 nextTick 自我重试：容器永远为 null → 无限微任务循环，主线程被
  // 一直占住，整页表现为「点不动、滚动条也不动」。切到深度分析页签时
  // watch(activeCard) 会再次调用本函数，届时容器已就绪。
  if (!container) return
  trendChartInstance = echarts.init(container)

  const xs = Array.from(new Set([...ptsA, ...ptsB].map(p => p.iteration))).sort((x, y) => x - y)
  const pick = (pts) => {
    const map = new Map(pts.map(p => [p.iteration, p.value]))
    return xs.map(x => (map.has(x) ? map.get(x) : null))
  }
  const isRate = trend.kind === 'rate'
  const axisLabel = isRate ? { formatter: (v) => `${(v * 100).toFixed(0)}%` } : {}
  // 图例带上实验 ID：A/B 是否来自同一份报告一眼可见
  const nameA = resolvedIds.value?.case_a?.experiment_id
    ? `实验 A · ${resolvedIds.value.case_a.experiment_id}` : '实验 A'
  const nameB = resolvedIds.value?.case_b?.experiment_id
    ? `实验 B · ${resolvedIds.value.case_b.experiment_id}` : '实验 B'
  // 同源时只画一条曲线，用标记点标出 A / B 各自所在轮次
  const sameSourceName = `逐轮演化 · ${sourceExpId}`
  const lineValues = sameSource ? pick(ptsA) : null
  const markPoints = []
  if (sameSource) {
    ;[
      { tag: 'A', iter: caseA.value?.iteration, color: '#3b82f6' },
      { tag: 'B', iter: caseB.value?.iteration, color: '#22c55e' }
    ].forEach(({ tag, iter, color }) => {
      const idx = xs.indexOf(Number(iter))
      if (idx < 0 || !lineValues || lineValues[idx] == null) return
      markPoints.push({
        name: tag,
        coord: [`第${xs[idx]}轮`, lineValues[idx]],
        value: tag,
        itemStyle: { color },
        label: { formatter: tag, fontSize: 11, fontWeight: 600 }
      })
    })
  }

  trendChartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => (v == null ? '--' : isRate ? `${(v * 100).toFixed(2)}%` : Number(v).toFixed(2))
    },
    legend: { data: sameSource ? [sameSourceName] : [nameA, nameB], bottom: 0, type: 'scroll', textStyle: { fontSize: 11, color: '#64748b' } },
    grid: { left: 56, right: 20, top: 18, bottom: 40 },
    xAxis: {
      type: 'category',
      data: xs.map(x => `第${x}轮`),
      boundaryGap: false,
      axisLabel: { fontSize: 10, color: '#94a3b8' },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { fontSize: 10, color: '#94a3b8', ...axisLabel }
    },
    series: sameSource
      ? [
          {
            name: sameSourceName, type: 'line', data: lineValues, smooth: true,
            symbol: 'circle', symbolSize: 6, connectNulls: false,
            lineStyle: { color: '#3b82f6', width: 2.5 }, itemStyle: { color: '#3b82f6' },
            areaStyle: { color: 'rgba(59,130,246,0.10)' },
            markPoint: { symbol: 'pin', symbolSize: 42, data: markPoints }
          }
        ]
      : [
          {
            name: nameA, type: 'line', data: pick(ptsA), smooth: true,
            symbol: 'circle', symbolSize: 7, connectNulls: false,
            lineStyle: { color: '#3b82f6', width: 2.5 }, itemStyle: { color: '#3b82f6' },
            areaStyle: { color: 'rgba(59,130,246,0.10)' }
          },
          {
            name: nameB, type: 'line', data: pick(ptsB), smooth: true,
            symbol: 'diamond', symbolSize: 7, connectNulls: false,
            lineStyle: { color: '#22c55e', width: 2.5 }, itemStyle: { color: '#22c55e' },
            areaStyle: { color: 'rgba(34,197,94,0.10)' }
          }
        ]
  })
  // 空态用 v-show 切换容器，重新显示后需要重算尺寸
  nextTick(() => { if (trendChartInstance) trendChartInstance.resize() })
}

const disposeTrendChart = () => {
  if (trendChartInstance) { trendChartInstance.dispose(); trendChartInstance = null }
}

const runComparison = async () => {
  const a = caseA.value
  const b = caseB.value
  if (!a || !b) return
  analysisLoading.value = true
  analysisError.value = ''
  // 先清空上一次的深度分析：新一组若返回空，旧结论不能继续挂在新的 A/B 上
  analysis.value = null
  resolvedIds.value = null
  try {
    // 传纯实验ID；默认对比报告全部轮次（每侧样本 = 轮次数），开启聚焦后才锁定到该案例所属轮次。
    // A/B 同属一份实验时必须锁轮次：否则后端拿同一份报告自我对比，差异恒为 0、相似度恒为 100%。
    const lockIteration = focusIteration.value || (!!a.experimentId && a.experimentId === b.experimentId)
    const iterA = lockIteration ? (a.iteration ?? null) : null
    const iterB = lockIteration ? (b.iteration ?? null) : null
    const res = await compareCases(
      a.experimentId || a.id,
      b.experimentId || b.id,
      { caseAIteration: iterA, caseBIteration: iterB, useLlm: true }
    )
    const data = unwrapApiData(res)
    if (data?.analysis) {
      analysis.value = data.analysis
      resolvedIds.value = data.resolved_ids || null
    }
    if (data?.comparison) {
      comparison.value = data.comparison
      ElMessage.success('实验对比完成')
      return
    }
  } catch (e) {
    console.warn('后端案例对比接口不可用，使用本地对比:', e)
    analysisError.value = '后端深度分析接口不可用，已降级为本地对比（无显著性检验与归因）'
  } finally {
    analysisLoading.value = false
  }
  // API 失败或返回空 → 构建本地对比数据
  buildLocalComparison()
}

const buildLocalComparison = () => {
  if (!caseA.value || !caseB.value) return
  const overall = computeLocalSimilarity()
  const level = overall >= 75 ? '高度相似' : overall >= 50 ? '中度相似' : '差异较大'
  comparison.value = {
    basic_comparison: buildBasicComparison().map(r => ({ dimension: r.dimension, value_a: String(r.value_a), value_b: String(r.value_b) })),
    metrics_comparison: buildMetricsComparison(),
    similarity: {
      overall_score: overall,
      level,
      dimensions: localSimilarityDims.value.map(d => ({ dimension: d.dimension, score: d.score }))
    },
    recommendation: generateLocalRecommendation()
  }
  ElMessage.success('本地对比分析完成')
}

// ---- 本地对比逻辑（后端不可用时的 fallback） ----
const parseNumeric = (val) => {
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(num) ? num : 0
}

const computeDimSimilarity = (key) => {
  const a = String(caseA.value?.[key] || '')
  const b = String(caseB.value?.[key] || '')
  if (!a && !b) return 100
  if (!a || !b) return 50
  if (a === b) return 100
  const aNum = parseNumeric(a)
  const bNum = parseNumeric(b)
  if (aNum && bNum) {
    const maxVal = Math.max(Math.abs(aNum), Math.abs(bNum), 1)
    return Math.max(10, Math.round((1 - Math.abs(aNum - bNum) / maxVal) * 100))
  }
  return Math.max(30, a.length === b.length ? 60 : 30)
}

const computeLocalSimilarity = () => {
  if (!localSimilarityDims.value.length) return 0
  return Math.round(localSimilarityDims.value.reduce((s, d) => s + d.score, 0) / localSimilarityDims.value.length)
}

const getSimilarityLevelLabel = () => {
  const score = comparison.value?.similarity?.overall_score || computeLocalSimilarity()
  if (score >= 75) return '高度相似'
  if (score >= 50) return '中度相似'
  return '差异较大'
}

const getSimilarityLevelType = () => {
  const score = comparison.value?.similarity?.overall_score || computeLocalSimilarity()
  if (score >= 75) return 'success'
  if (score >= 50) return 'warning'
  return 'info'
}

const buildBasicComparison = () => {
  if (!caseA.value || !caseB.value) return []
  return [
    { dimension: '实验名称', value_a: caseA.value.name, value_b: caseB.value.name },
    { dimension: '是否完成', value_a: caseA.value.completed ? '是' : '否', value_b: caseB.value.completed ? '是' : '否' },
    { dimension: sceneText.value.demandField, value_a: caseA.value.demandLevel, value_b: caseB.value.demandLevel },
    { dimension: sceneText.value.capacityField, value_a: caseA.value.capacityPlan, value_b: caseB.value.capacityPlan },
    { dimension: '干预策略', value_a: caseA.value.intervention, value_b: caseB.value.intervention }
  ]
}

const buildMetricsComparison = () => {
  if (!caseA.value || !caseB.value) return []
  const aComp = parseNumeric(caseA.value.completionRate)
  const bComp = parseNumeric(caseB.value.completionRate)
  const aBack = parseNumeric(caseA.value.backlogRate)
  const bBack = parseNumeric(caseB.value.backlogRate)
  const aCol = parseNumeric(caseA.value.collaboration)
  const bCol = parseNumeric(caseB.value.collaboration)
  const aRes = parseNumeric(caseA.value.resilience)
  const bRes = parseNumeric(caseB.value.resilience)

  const diffPercent = (a, b) => {
    if (!a || !b) return '--'
    const d = b - a
    return `${d >= 0 ? '+' : ''}${d.toFixed(1)}pp`
  }

  return [
    { metric: '订单完成率', value_a: caseA.value.completionRate, value_b: caseB.value.completionRate, diff: diffPercent(aComp, bComp), better: bComp > aComp ? 'B' : aComp > bComp ? 'A' : null },
    { metric: '供应缺口率', value_a: caseA.value.backlogRate, value_b: caseB.value.backlogRate, diff: diffPercent(-aBack, -bBack), better: bBack < aBack ? 'B' : aBack < bBack ? 'A' : null },
    { metric: '网络协作次数', value_a: caseA.value.collaboration, value_b: caseB.value.collaboration, diff: diffPercent(aCol, bCol), better: bCol > aCol ? 'B' : aCol > bCol ? 'A' : null },
    { metric: '韧性指数', value_a: caseA.value.resilience, value_b: caseB.value.resilience, diff: diffPercent(aRes, bRes), better: bRes > aRes ? 'B' : aRes > bRes ? 'A' : null }
  ]
}

const generateLocalRecommendation = () => {
  if (!caseA.value || !caseB.value) return '请先选择两个案例进行对比'
  const aComp = parseNumeric(caseA.value.completionRate)
  const bComp = parseNumeric(caseB.value.completionRate)
  const aRes = parseNumeric(caseA.value.resilience)
  const bRes = parseNumeric(caseB.value.resilience)
  const similar = computeLocalSimilarity()

  let recommendation = ''
  if (bComp > aComp && bRes > aRes) {
    recommendation = `推荐采用实验 B「${caseB.value.name}」的策略。该方案在${sceneText.value.capacityField}与供应安全方面均优于实验 A，完成率高出 ${(bComp - aComp).toFixed(1)}pp，且网络韧性更强。`
  } else if (aComp > bComp && aRes > bRes) {
    recommendation = `实验 A「${caseA.value.name}」在当前对比中表现更优，建议以该方案为基准进行后续反事实实验验证。`
  } else if (similar >= 75) {
    recommendation = `两个实验在${sceneText.value.systemLabel}指标上高度相似（相似度 ${similar}%），产能方案和需求配置接近。如需区分优劣，建议在反事实实验中进一步调整${sceneText.value.capacityLabel}和${sceneText.value.thresholdField}等关键参数。`
  } else {
    recommendation = isUraniumScene.value
      ? `两个实验存在显著差异（相似度 ${similar}%），实验 B 在供应完成率上表现更优，但需关注其网络韧性和协作次数是否可持续。建议结合 NEA Red Book 中长期预测选择最适合的铀矿产能规划路径。`
      : `两个实验存在显著差异（相似度 ${similar}%），实验 B 在订单完成率上表现更优，但需关注其网络韧性和协作次数是否可持续。建议结合汽车产业运行数据与知识库事件规则，重新核定${sceneText.value.capacityField}的调整幅度。`
  }
  return recommendation
}

// ---- 数据加载 ----
const toNumber = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback }
const formatRate = (v) => { const n = Number(v); return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '--' }
const summarizeBacklog = (m = {}) => {
  const t = toNumber(m.total_orders); const c = toNumber(m.completed_orders)
  return t > 0 ? `${(Math.max(t - c, 0) / t * 100).toFixed(1)}%` : '--'
}
const factoryCapacityText = (p = {}) => {
  const r = p.factory_capacity_range || p.capacity_range
  const unit = sceneText.value.capacityUnit ? ` ${sceneText.value.capacityUnit}` : ''
  // 后端未记录产能覆盖时（部分历史报告写作 [0, 0]）视为沿用基线，不展示 0-0
  if (Array.isArray(r) && r.length >= 2 && (Number(r[0]) > 0 || Number(r[1]) > 0)) {
    return `${Number(r[0]).toFixed(0)}-${Number(r[1]).toFixed(0)}${unit}`
  }
  if (p.capacity_multiplier) return `${Number(p.capacity_multiplier).toFixed(2)}x 倍率`
  return '基线区间'
}
const interventionText = (p = {}) => {
  const adj = p.adjusted_param; const ratio = p.adjustment_ratio
  if (adj === 'factory_capacity_range') return `产能 ${formatRate(ratio)}`
  if (adj === 'order_multiplier') return `需求 ${formatRate(ratio)}`
  if (adj === 'reproduction_threshold') return `阈值 ${formatRate(ratio)}`
  return '不干预'
}
// ---- 案例可用性与“是否施加干预”的判定 ----
// 某项指标恒为 0 说明仿真没产出这项统计（铀场景 94 份报告里有 92 份如此），
// 这类轮次不能作为事中/反事实案例参与对比。
const iterationHasSignal = (iteration) => {
  const m = iteration?.simulation_result?.metrics || {}
  const ocr = toNumber(m.order_completion_rate)
  const profit = toNumber(m.total_net_profit)
  return ocr > 0 || profit !== 0
}
const demandMultiplierOf = (iteration) => {
  const n = toNumber(iteration?.task?.parameters?.order_multiplier)
  return n > 0 ? n : 1
}
const capacityKeyOf = (iteration) => {
  const range = iteration?.task?.parameters?.factory_capacity_range
  return Array.isArray(range) ? range.map(v => toNumber(v)).join(',') : ''
}
// 是否施加了干预：默认看需求倍数（≈1 为基准轮，偏离即需求冲击）。
// 产能逐轮增长是实验自身的优化过程，不据此判定干预，只在配对时用来配平两侧口径。
const isDemandShockIteration = (iteration) => Math.abs(demandMultiplierOf(iteration) - 1) > 1e-6
// 兜底：若整个案例库都没有需求冲击轮（例如只做产能扫描的实验），退化为“产能偏离基准档”也算干预
const isCapacityShiftIteration = (iteration, baselineCapacityKey = '') => {
  const key = capacityKeyOf(iteration)
  return !!baselineCapacityKey && key !== '' && key !== baselineCapacityKey
}
// 默认配对：优先“同一实验、同一产能档”的干预轮 —— 两侧网络规模与产能完全相同，
// 唯一变量是需求倍数，才是受控的反事实对照；找不到再放宽到同一实验，最后跨实验。
const pickCounterfactualFor = (caseA, candidates) => {
  if (!candidates.length) return null
  if (!caseA) return candidates[0]
  const sameExp = candidates.filter(c => c.experimentId === caseA.experimentId)
  if (!sameExp.length) return candidates[0]
  const sameCapacity = sameExp.filter(c => c.capacityKey && c.capacityKey === caseA.capacityKey)
  const pool = sameCapacity.length ? sameCapacity : sameExp
  const base = toNumber(caseA.metrics?.order_completion_rate)
  return pool.reduce((best, c) => {
    const diff = Math.abs(toNumber(c.metrics?.order_completion_rate) - base)
    const bestDiff = Math.abs(toNumber(best.metrics?.order_completion_rate) - base)
    return diff > bestDiff ? c : best
  }, pool[0])
}
const buildEventNodes = (iteration = {}) => {
  const m = iteration.simulation_result?.metrics || {}
  const p = iteration.task?.parameters || {}
  // 汽车供应链：同一套仿真生命周期，改用参数目录中的参数名与观测口径
  if (!isUraniumScene.value) {
    return [
      { title: '市场需求参数加载', step: 1, type: 'red', desc: `市场需求强度设为 ${Number(p.order_multiplier || 1).toFixed(2)}x，开始观察订单承载压力。` },
      { title: '工厂产能配置执行', step: Math.max(1, Number(iteration.iteration || 1)), type: 'orange', desc: `${factoryCapacityText(p)}，监测工厂侧生产承载能力。` },
      { title: '仿真结果回收', step: 21, type: 'blue', desc: `完成率 ${formatRate(m.order_completion_rate)}，供应缺口率 ${summarizeBacklog(m)}。` },
      { title: '策略复盘', step: 22, type: 'green', desc: `综合得分 ${Number(iteration.feedback?.overall_score || 0).toFixed(3)}，用于后续反事实实验与案例对比分析。` }
    ]
  }
  return [
    { title: '铀需求参数加载', step: 1, type: 'red', desc: `铀需求强度设为 ${Number(p.order_multiplier || 1).toFixed(2)}x（~${(Number(p.order_multiplier||1)*123860).toFixed(0)} tU/年），开始观察供应压力。` },
    { title: '铀矿产能配置执行', step: Math.max(1, Number(iteration.iteration || 1)), type: 'orange', desc: `${factoryCapacityText(p)}，监测铀矿供给侧承载能力。` },
    { title: '仿真结果回收', step: 21, type: 'blue', desc: `完成率 ${formatRate(m.order_completion_rate)}，供应缺口率 ${summarizeBacklog(m)}。` },
    { title: '策略复盘', step: 22, type: 'green', desc: `综合得分 ${Number(iteration.feedback?.overall_score || 0).toFixed(3)}，用于后续反事实实验与案例对比分析。` }
  ]
}
const buildCaseFromIteration = (iteration, experiment, index, prefix = 'Exp') => {
  const p = iteration?.task?.parameters || {}
  const m = iteration?.simulation_result?.metrics || {}
  const score = toNumber(iteration?.feedback?.overall_score)
  const iterNo = Number(iteration?.iteration || index + 1)
  return {
    id: `${prefix.toLowerCase()}-${experiment.experiment_id}-${iterNo}`,
    // 供后端 ID 规整使用：纯实验ID + 聚焦轮次
    experimentId: experiment.experiment_id,
    iteration: iterNo,
    name: `${prefix}${String(index + 1).padStart(2, '0')}`,
    completed: experiment.status === 'completed',
    completionRate: formatRate(m.order_completion_rate),
    method: `MA仿真 (${p.type || 'native'})`,
    backlogRate: summarizeBacklog(m),
    collaboration: `${m.cooperation_count ?? 0} 次`,
    resilience: score ? score.toFixed(2) : '--',
    // 供案例库筛选与受控配对使用
    hasSignal: iterationHasSignal(iteration),
    capacityKey: capacityKeyOf(iteration),
    demandMultiplier: demandMultiplierOf(iteration),
    isIntervention: isDemandShockIteration(iteration),
    demandLevel: `需求 ${Number(p.order_multiplier || 1).toFixed(2)}x`,
    capacityPlan: factoryCapacityText(p),
    intervention: interventionText(p),
    metrics: {
      order_completion_rate: toNumber(m.order_completion_rate),
      level1_completion_rate: toNumber(m.level1_completion_rate),
      level2_completion_rate: toNumber(m.level2_completion_rate),
      total_net_profit: toNumber(m.total_net_profit),
      final_enterprise_count: toNumber(m.final_enterprise_count),
      production_capacity_est: toNumber(m.production_capacity_est),
      network_stability: toNumber(m.network_stability)
    },
    eventNodes: buildEventNodes(iteration)
  }
}
// 案例库加载预算：results/multi_agent 下有 100+ 份报告（共 170MB+，单份最大 13MB），
// 后端每份详情都要完整解析一次 JSON（实测 ~2.6 秒）。原先串行拉取全部报告，首屏要等
// 5 分钟以上且期间界面全空 —— 用户体验上就是「点不动、滚动条也不动」。
// 这里改为：只取当前场景最新的 MAX_LIBRARY_EXPERIMENTS 份，并按固定并发拉取详情。
// 例外：最新这一批可能整批都是「仿真未产出指标」的空实验（铀场景 94 份里 92 份如此），
// 那就继续向历史回溯扫描，最多再看 MAX_DETAIL_SCAN 份 —— 否则案例库会空掉，
// 分布图没有数据源，用户只能看到「无数据」提示。
const MAX_LIBRARY_EXPERIMENTS = 24
const MAX_DETAIL_SCAN = 96
const DETAIL_CONCURRENCY = 6
const DETAIL_TIMEOUT_MS = 20000
const libraryLoading = ref(false)
const libraryProgress = reactive({ done: 0, total: 0 })

// 给单个请求加超时：某一份报告解析卡住时，不能让整个案例库一直等
const withTimeout = (promise, ms, label) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`${label} 请求超时（${ms}ms）`)), ms)
  Promise.resolve(promise).then(
    (value) => { clearTimeout(timer); resolve(value) },
    (error) => { clearTimeout(timer); reject(error) }
  )
})

// 有限并发映射：并发数固定，结果按输入顺序返回，单个失败不影响其余
const mapWithConcurrency = async (items, limit, worker) => {
  const results = new Array(items.length).fill(null)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

// 取最新 N 份；URL 带了 experiment_id（对话闭环入口）时把它换进来，保证三阶段看的是同一次实验
const selectLibraryExperiments = (list) => {
  const scoped = list.slice(0, MAX_LIBRARY_EXPERIMENTS)
  const preferred = String(routeExperimentId.value || '').trim()
  if (!preferred || scoped.some(e => String(e.experiment_id || e.id || '') === preferred)) return scoped
  const hit = list.find(e => String(e.experiment_id || e.id || '') === preferred)
  if (hit && scoped.length) scoped[scoped.length - 1] = hit
  return scoped
}

// 清空案例库与选中项：换场景 / 刷新后若没有可用实验，不能把上一批案例继续留在页面上
// （否则页头仍显示上一场的实验数，还会弹「已加载」的成功提示）
const clearCaseLibrary = () => {
  caseFolders[0].children = []
  caseFolders[1].children = []
  caseAId.value = null
  caseBId.value = null
}

const buildLocalCases = async () => {
  try {
    // 只加载当前场景（铀 / 汽车）的已完成实验，并按时间倒序取最新
    const allExperiments = await loadScenarioExperiments({ completedOnly: true })
    if (!allExperiments.length) {
      clearCaseLibrary()
      return
    }
    const experiments = selectLibraryExperiments(allExperiments)
    const skippedByCap = allExperiments.length - experiments.length

    libraryLoading.value = true
    libraryProgress.total = Math.min(allExperiments.length, MAX_LIBRARY_EXPERIMENTS + MAX_DETAIL_SCAN)
    libraryProgress.done = 0
    const fetchDetail = async (experiment) => {
      try {
        const detailPayload = await withTimeout(
          getExperimentDetail(experiment.experiment_id),
          DETAIL_TIMEOUT_MS,
          experiment.experiment_id
        )
        const detail = unwrapApiData(detailPayload)
        // 该实验的基准产能档（首轮），用于判定后续轮次是否做了产能干预
        experiment.baselineCapacityKey = capacityKeyOf((detail?.iterations || [])[0])
        return { meta: experiment, detail }
      } catch (e) {
        console.warn(`[ObserveAnalysis] 实验 ${experiment.experiment_id} 详情加载失败：`, e?.message || e)
        return null
      } finally {
        libraryProgress.done += 1
      }
    }
    // 先看最新一批。若这批一份「有指标产出」的实验都没有（铀场景最新 24 份全是空仿真），
    // 就按批继续向历史回溯扫描 —— 否则案例库会整库落空，分布图也就没有数据源。
    let details = (await mapWithConcurrency(experiments, DETAIL_CONCURRENCY, fetchDetail)).filter(Boolean)
    const hasSignalDetail = ({ detail }) => (detail?.iterations || []).some(iterationHasSignal)
    const scannedKeys = new Set(experiments.map((e) => String(e.experiment_id)))
    const backlog = allExperiments.filter((e) => !scannedKeys.has(String(e.experiment_id)))
    let scannedExtra = 0
    while (!details.some(hasSignalDetail) && scannedExtra < MAX_DETAIL_SCAN && scannedExtra < backlog.length) {
      const batch = backlog.slice(scannedExtra, scannedExtra + MAX_LIBRARY_EXPERIMENTS)
      scannedExtra += batch.length
      const batchDetails = (await mapWithConcurrency(batch, DETAIL_CONCURRENCY, fetchDetail)).filter(Boolean)
      details = details.concat(batchDetails)
    }
    // 详情一份都没拉到（后端不可用）时不虚构，留空交给「暂无可用实验数据」提示
    if (!details.length) {
      clearCaseLibrary()
      return
    }

    // ---- 只保留“有没有产出真实指标”的实验：完成率与利润恒为 0 的实验无法参与对比，
    //      也绝不拿它们（更不拿硬编码案例）凑数，否则分布图与结论都会是假的 ----
    const usable = details.filter(hasSignalDetail)
    const degradedCount = details.length - usable.length
    const scoped = usable
    const widenedNote = scannedExtra > 0
      ? `最新 ${experiments.length} 份实验均未产出可用指标，已向前回溯扫描 ${experiments.length + scannedExtra} 份，取到 ${usable.length} 份有指标产出的实验用于对比。`
      : ''
    const degradedNote = !degradedCount
      ? ''
      : usable.length
        ? `已过滤 ${degradedCount} 份“仿真未产出指标”的实验（完成率与利润恒为 0），它们无法参与对比。`
        : `当前 ${degradedCount} 份实验的完成率/利润均为 0（仿真未产出），无法作为对比案例，因此不展示对比结论。`
    // 说明加载上限，避免用户误以为案例库里只有这么多实验
    const capNote = skippedByCap > 0
      ? `本场景共 ${allExperiments.length} 份已完成实验，为快速加载仅取最新 ${experiments.length} 份。`
      : ''
    libraryNotice.value = [widenedNote, degradedNote, capNote].filter(Boolean).join(' ')

    // ---- 事中 / 反事实按“有没有施加干预”切分（此前按“最佳迭代 / 剩下的轮次”切分，
    //      只是把同一批数据分成两堆，不构成对照）----
    // 事中库   = 基准轮次：需求倍数 ≈1（需求未被冲击）
    // 反事实库 = 干预轮次：需求倍数偏离 1；若整个库都没有需求冲击轮，才退化为“产能偏离基准档”
    // 产能档不参与干预判定（它是实验自身的逐轮优化结果），只在配对时用来配平两侧口径
    const duringCases = []
    const counterfactualCases = []
    let cfIndex = 0
    // 先判断本场景有没有需求冲击轮，决定干预口径
    const hasDemandShock = scoped.some(({ detail }) =>
      (detail?.iterations || []).some((it) => isDemandShockIteration(it)))
    const classifyIntervention = hasDemandShock
      ? (it) => isDemandShockIteration(it)
      : (it, meta) => isCapacityShiftIteration(it, meta.baselineCapacityKey)
    scoped.forEach(({ meta, detail }) => {
      const countable = (detail?.iterations || []).filter(iterationHasSignal)
      const baselineIters = countable.filter((it) => !classifyIntervention(it, meta))
      const intervened = countable.filter((it) => classifyIntervention(it, meta))
      // 事中库按“实验 × 产能档”留档：同一产能档只保留完成率最高的一轮基准。
      // 保留每个产能档，是为了让干预轮能找到“同产能档”的基准轮做受控对照（第 7 轮 ↔ 第 8 轮这种）。
      const baselineByCapacity = new Map()
      baselineIters.forEach((it) => {
        const key = capacityKeyOf(it)
        const prev = baselineByCapacity.get(key)
        const ocr = toNumber(it?.simulation_result?.metrics?.order_completion_rate)
        const prevOcr = toNumber(prev?.simulation_result?.metrics?.order_completion_rate)
        if (!prev || ocr > prevOcr) baselineByCapacity.set(key, it)
      })
      if (!baselineByCapacity.size && countable[0]) {
        baselineByCapacity.set(capacityKeyOf(countable[0]), countable[0])
      }
      baselineByCapacity.forEach((it) => {
        duringCases.push(buildCaseFromIteration(it, meta, duringCases.length, 'Exp'))
      })
      intervened.forEach((it) => {
        counterfactualCases.push(buildCaseFromIteration(it, meta, cfIndex, 'CF'))
        cfIndex += 1
      })
    })

    const dedupedDuring = duringCases.slice(0, 30)

    // 默认选一组受控对照：优先“同一实验 + 同一产能档”的基准轮 vs 干预轮 ——
    // 两侧网络规模与产能完全一致，唯一变量是需求倍数，才能谈因果；
    // 有多个候选时取完成率差异最大的那一对（信息量最大）。
    const matchedPairs = dedupedDuring
      .map((aCase) => ({ a: aCase, b: pickCounterfactualFor(aCase, counterfactualCases) }))
      .filter(({ a, b }) => b && b.experimentId === a.experimentId
        && b.capacityKey && b.capacityKey === a.capacityKey)
    const ocrDiff = ({ a, b }) => Math.abs(
      toNumber(a.metrics?.order_completion_rate) - toNumber(b.metrics?.order_completion_rate))
    const bestPair = matchedPairs.reduce(
      (top, cur) => (!top || ocrDiff(cur) > ocrDiff(top) ? cur : top), null)
    const defaultPair = bestPair || {
      a: dedupedDuring[0] || null,
      b: pickCounterfactualFor(dedupedDuring[0] || null, counterfactualCases)
    }

    // 把默认选中那一对提到各自列表最前：列表只显示前几条，否则高亮的案例会被折叠掉
    if (defaultPair.a) {
      const idx = dedupedDuring.findIndex(c => c.id === defaultPair.a.id)
      if (idx > 0) dedupedDuring.unshift(dedupedDuring.splice(idx, 1)[0])
    }
    let cappedCf = counterfactualCases.slice(0, 40)
    if (defaultPair.b) {
      cappedCf = [defaultPair.b, ...cappedCf.filter(c => c.id !== defaultPair.b.id)]
    }

    if (dedupedDuring.length) {
      caseFolders[0].children = dedupedDuring
      caseAId.value = defaultPair.a?.id || dedupedDuring[0].id
    }
    if (cappedCf.length) {
      caseFolders[1].children = cappedCf
      caseBId.value = defaultPair.b?.id || null
      if (caseBId.value && caseAId.value) runComparison()
    }
    // 没有真实案例时保持空库：由「暂无可用实验数据」与 libraryNotice 说明原因。
    // 不用硬编码案例充数 —— 前端造数会让分布图与对比结论都变成假的。
  } catch (error) {
    console.warn('[ObserveAnalysis] 案例数据加载失败：', error)
    clearCaseLibrary()
    libraryNotice.value = `案例数据加载失败：${error?.message || error}。请确认后端服务可用后点击刷新重试。`
  }
}

const loadAllCases = async () => {
  loading.value = true
  try {
    // 直接使用 buildLocalCases：从所有已完成实验的迭代中构建事中/反事实分类
    // getCaseLibrary API 按极端/正常分类，不适用于事中/反事实的展示需求
    await buildLocalCases()
    if (totalCaseCount.value) {
      ElMessage.success(`${sceneText.value.libraryLabel}已加载，共 ${totalCaseCount.value} 个实验`)
    } else {
      ElMessage.warning(`${sceneText.value.systemLabel}暂无可用实验，请先在首页运行实验或导入实验报告`)
    }
  } catch {
    clearCaseLibrary()
  } finally {
    loading.value = false
    libraryLoading.value = false
    libraryProgress.done = 0
    libraryProgress.total = 0
  }
}

// ---- 导出报告 ----
const escapeHtml = (v) => String(v ?? '--').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const buildReportHtml = () => {
  const rows = [...buildBasicComparison(), ...buildMetricsComparison()]
  const tbody = rows.map(r => `<tr><th>${escapeHtml(r.dimension || r.metric)}</th><td>${escapeHtml(r.value_a)}</td><td>${escapeHtml(r.value_b)}</td>${r.diff ? `<td>${escapeHtml(r.diff)}</td>` : ''}</tr>`).join('')
  const events = (caseA.value?.eventNodes || sceneDefaultEventNodes.value).map(e => `<li><strong>${escapeHtml(e.title)}</strong><span>第 ${e.step} 轮</span><p>${escapeHtml(e.desc)}</p></li>`).join('')
  const statsRows = metricRows.value.map(r => `<tr><th>${escapeHtml(r.label)}</th><td>${escapeHtml(r.value_a_text)}</td><td>${escapeHtml(r.value_b_text)}</td><td>${escapeHtml(r.delta_text)}</td><td>${escapeHtml(formatPValue(r.p_value))}</td><td>${escapeHtml(r.cohens_d != null ? Number(r.cohens_d).toFixed(2) : '--')}</td><td>${escapeHtml(r.verdict)}</td></tr>`).join('')
  const statsBlock = statsRows
    ? `<h2>统计显著性检验（Welch t 检验）</h2><table><thead><tr><th>指标</th><th>实验 A</th><th>实验 B</th><th>差异</th><th>p 值</th><th>Cohen's d</th><th>结论</th></tr></thead><tbody>${statsRows}</tbody></table>`
    : ''
  const attrBlock = attributionItems.value.length
    ? `<h2>差异贡献分解（关联级）</h2><ul>${attributionItems.value.map(i => `<li>${escapeHtml(i.label)}：贡献度 ${i.contribution}%（${escapeHtml(i.delta_text)}${i.significant ? '，显著' : ''}）</li>`).join('')}</ul>`
    : ''
  const provBlock = provenance.value
    ? `<h2>数据溯源</h2><ul><li>实验 A：${escapeHtml(provenance.value.case_a?.report)}（${provenance.value.case_a?.total_iterations} 轮，聚焦第 ${escapeHtml(String(provenance.value.case_a?.focus_iteration ?? '全部'))} 轮）</li><li>实验 B：${escapeHtml(provenance.value.case_b?.report)}（${provenance.value.case_b?.total_iterations} 轮，聚焦第 ${escapeHtml(String(provenance.value.case_b?.focus_iteration ?? '全部'))} 轮）</li><li>指标来源：${escapeHtml(provenance.value.metric_source)}</li></ul>`
    : ''

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${sceneText.value.reportTitle}</title>
<style>body{margin:0;padding:28px;color:#0f172a;font-family:"Microsoft YaHei",Arial,sans-serif;line-height:1.6;background:#f8fafc}
main{max-width:980px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:28px}
h1{margin:0 0 8px;font-size:26px}.meta{color:#64748b;margin-bottom:22px}
table{width:100%;border-collapse:collapse;margin:18px 0 24px}th,td{border:1px solid #e2e8f0;padding:10px 12px;text-align:left}
th{width:180px;background:#f1f5f9}thead th{background:#dbeafe;color:#1e40af}
h2{margin:24px 0 10px;font-size:18px}li{margin-bottom:12px}li span{display:inline-block;margin-left:10px;color:#64748b;font-size:13px}li p{margin:4px 0 0;color:#334155}</style></head>
<body><main><h1>${sceneText.value.reportTitle}</h1><div class="meta">生成时间：${new Date().toLocaleString()}<br>实验 A: ${escapeHtml(caseA.value?.name||'--')}<br>实验 B: ${escapeHtml(caseB.value?.name||'--')}</div>
<h2>实验对比</h2><table><thead><tr><th>对比项</th><th>实验 A</th><th>实验 B</th><th>差异</th></tr></thead><tbody>${tbody}</tbody></table>
${events ? `<h2>典型事件序列（实验 A）</h2><ul>${events}</ul>` : ''}
${statsBlock}
${attrBlock}
${provBlock}
<h2>综合结论</h2><p>${escapeHtml(conclusionText.value)}</p>
<p class="evidence">证据等级：关联级（因果阶梯第 1 层）——本结论描述两组实验的关联与差异，不含 do(X) 的因果效应；因果判断请以「干预分析」「反事实实验」为准。</p></main></body></html>`
}

const exportComparisonReport = (format) => {
  if (!caseA.value || !caseB.value) { ElMessage.warning('请先选择两个对比案例'); return }
  const safeName = sceneText.value.reportFileBase
  if (format === 'txt') {
    const lines = [sceneText.value.reportTitle, `生成时间：${new Date().toLocaleString()}`, '', '一、案例对比', ...[...buildBasicComparison(), ...buildMetricsComparison()].map(r => `${r.dimension||r.metric}：A=${r.value_a}；B=${r.value_b}${r.diff?'（差异：'+r.diff+'）':''}`), '', '二、综合推荐', generateLocalRecommendation(), '', '证据等级：关联级（因果阶梯第 1 层）——本结论描述两组实验的关联与差异，不含 do(X) 的因果效应；因果判断请以「干预分析」「反事实实验」为准。']
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${safeName}.txt`; a.click()
    ElMessage.success('已导出为TXT')
  } else if (format === 'pdf') {
    const w = window.open('', '_blank')
    if (!w) { ElMessage.warning('浏览器拦截了弹窗，请允许后重试'); return }
    w.document.open(); w.document.write(buildReportHtml()); w.document.close(); setTimeout(() => w.print(), 500)
    ElMessage.success('已打开PDF打印窗口')
  } else {
    const blob = new Blob([buildReportHtml()], { type: 'text/html;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${safeName}.html`; a.click()
    ElMessage.success('已导出为HTML')
  }
}

// 三张图共用同一个窗口 resize 监听：只注册一次、卸载时移除。
// 之前在 render 函数里 addEventListener 匿名函数，既不回收，又会随每次重绘不断叠加。
const handleChartResize = () => {
  distChartInstance?.resize()
  metricsLineChartInstance?.resize()
  trendChartInstance?.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleChartResize)
  loadAllCases()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleChartResize)
  disposeDistChart(); disposeMetricsLineChart(); disposeTrendChart()
})
</script>

<style scoped>
.post-observe-page {
  height: 100%; min-height: 0; box-sizing: border-box; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 10px;
  background: radial-gradient(1200px 420px at 18% -12%, #e8f0ff 0%, rgba(232, 240, 255, 0) 62%), #f6f8fb; color: #0f172a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  overflow-y: auto;
}
.page-head {
  flex: 0 0 auto; display: flex; justify-content: space-between; gap: 24px; align-items: center;
  padding: 20px 30px; border: none; border-radius: 16px; margin-bottom: 14px;
  background:
    radial-gradient(130% 190% at 88% -40%, rgba(125, 211, 252, 0.42), transparent 62%),
    linear-gradient(120deg, #172554 0%, #1e40af 38%, #2563eb 68%, #3b82f6 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 20px 44px -26px rgba(30, 58, 138, 0.95), 0 3px 10px rgba(30, 58, 138, 0.18);
  position: relative; overflow: hidden;
}
.page-head::before { content: ''; position: absolute; top: -62%; right: -8%; width: 330px; height: 330px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 255, 255, 0.18), transparent 66%); pointer-events: none; }
.page-head::after { content: ''; position: absolute; inset: 0; background-image: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.055) 0 2px, transparent 2px 28px); pointer-events: none; }
.page-head > div:first-child { position: relative; z-index: 1; }
.page-head h1 { margin: 0; font-size: 25px; line-height: 1.2; font-weight: 900; color: #fff; letter-spacing: 0.5px; text-shadow: 0 2px 14px rgba(15, 23, 42, 0.38); }
.subtitle { margin: 7px 0 0; color: rgba(255,255,255,0.82); font-size: 13px; font-weight: 500; letter-spacing: 0.01em; }
.head-actions { display: flex; align-items: center; gap: 14px; flex-shrink: 0; position: relative; z-index: 1; }
.stat-item { min-width: 86px; padding: 7px 12px; border: 1px solid rgba(255,255,255,0.24); border-radius: 10px; background: rgba(255,255,255,0.14); backdrop-filter: blur(6px); transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease; }
.stat-item:hover { transform: translateY(-1px); background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.42); }
.stat-item span { display: block; color: rgba(255,255,255,0.74); font-size: 10px; font-weight: 800; letter-spacing: 0.06em; }
.stat-item strong { display: block; margin-top: 3px; color: #fff; font-size: 19px; line-height: 1.1; font-variant-numeric: tabular-nums; }
.head-actions :deep(.el-button.is-text) { width: 30px; height: 30px; border-radius: 50%; color: rgba(255, 255, 255, 0.92); background: rgba(255, 255, 255, 0.14); }
.head-actions :deep(.el-button.is-text:hover) { color: #fff; background: rgba(255, 255, 255, 0.26); }

.observe-layout { flex: 0 0 auto; display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: 10px; min-height: 520px; height: calc(100vh - 260px); align-items: stretch; }
.observe-layout--two { grid-template-columns: 1fr 1fr; }
.conclusion-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; margin-bottom: 12px; }
.conclusion-summary-note { margin: 0 0 10px; padding: 9px 12px; border: 1px solid #fde68a; border-left: 3px solid #f59e0b; border-radius: 8px; background: #fffbeb; color: #92400e; font-size: 12px; line-height: 1.65; }
.conclusion-summary-card { position: relative; display: flex; flex-direction: column; padding: 0; border: 1px solid #e6ebf2; border-radius: 12px; background: #fff; text-align: left; font: inherit; cursor: pointer; overflow: hidden; transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease; }
.conclusion-summary-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #cbd5e1; }
.conclusion-summary-card:hover { transform: translateY(-2px); border-color: #93c5fd; box-shadow: 0 16px 30px -20px rgba(37, 99, 235, 0.6); }
.conclusion-summary-card.is-open { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14), 0 18px 34px -22px rgba(37, 99, 235, 0.7); }
.conclusion-summary-head { display: flex; align-items: center; gap: 8px; padding: 9px 12px 9px 14px; border-bottom: 1px solid #eef2f7; background: linear-gradient(180deg, #fafbfc, #fff); }
.conclusion-summary-icon { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; font-size: 14px; background: #f1f5f9; color: #475569; }
.conclusion-summary-title { font-size: 12.5px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
.conclusion-summary-tag { padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: #94a3b8; font-size: 10.5px; font-weight: 700; }
.conclusion-summary-tag.is-ready { background: linear-gradient(180deg, #dcfce7, #bbf7d0); color: #15803d; box-shadow: 0 1px 2px rgba(21, 128, 61, 0.2); }
.conclusion-summary-caret { font-size: 12px; color: #94a3b8; transition: color 0.18s ease; }
.conclusion-summary-card.is-open .conclusion-summary-caret { color: #2563eb; }
.conclusion-summary-text { margin: 0; padding: 11px 13px 12px 14px; color: #475569; font-size: 12px; line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.conclusion-summary-card--blue::before { background: linear-gradient(180deg, #3b82f6, #60a5fa); }
.conclusion-summary-card--blue .conclusion-summary-head { background: linear-gradient(180deg, #eff6ff, #fff); }
.conclusion-summary-card--blue .conclusion-summary-icon { background: #dbeafe; color: #2563eb; }
.conclusion-summary-card--indigo::before { background: linear-gradient(180deg, #6366f1, #8b5cf6); }
.conclusion-summary-card--indigo .conclusion-summary-head { background: linear-gradient(180deg, #eef2ff, #fff); }
.conclusion-summary-card--indigo .conclusion-summary-icon { background: #e0e7ff; color: #4338ca; }
.conclusion-summary-card--green::before { background: linear-gradient(180deg, #16a34a, #34d399); }
.conclusion-summary-card--green .conclusion-summary-head { background: linear-gradient(180deg, #f0fdf4, #fff); }
.conclusion-summary-card--green .conclusion-summary-icon { background: #dcfce7; color: #059669; }
.conclusion-summary-link { color: #2563eb; font-size: 11.5px; font-weight: 600; }
.compare-detail { animation: compare-detail-in 0.2s ease-out; }
@keyframes compare-detail-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }

.observe-panel { background: #fff; border: 1px solid #e6ebf2; border-radius: 16px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 18px 36px -24px rgba(15, 23, 42, 0.55); overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
.panel-head-bar { display: flex; align-items: center; gap: 8px; padding: 11px 14px; font-size: 13px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #eef2f7; flex-shrink: 0; }
.panel-head-bar--blue { border-top: 3px solid #3b82f6; background: linear-gradient(180deg, #eff6ff, #ffffff); }
.panel-head-bar--blue .el-icon { color: #3b82f6; }
.panel-head-bar--purple { border-top: 3px solid #8b5cf6; background: linear-gradient(180deg, #f5f3ff, #ffffff); }
.panel-head-bar--purple .el-icon { color: #8b5cf6; }
.panel-body-fill { flex: 1; overflow-y: auto; padding: 6px; min-height: 0; }
.search-input { flex: 1; max-width: 130px; margin-left: auto; }
.library-tree { flex: 1 1 auto; overflow-y: auto; padding: 4px 0; }
.tree-folder { margin-bottom: 2px; }
.tree-folder-head { display: flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px; font-weight: 700; color: #334155; transition: background 0.15s; }
.tree-folder-head:hover { background: #f1f5f9; }
.folder-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.folder-count { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: #fde68a; color: #92400e; font-weight: 600; }
.folder-stats { display: flex; gap: 6px; font-size: 10px; font-weight: 700; margin-left: 4px; }
.stat-done { color: #15803d; }
.stat-pending { color: #94a3b8; }
.tree-more { padding: 6px 12px 6px 34px; font-size: 11px; color: #94a3b8; font-weight: 600; font-style: italic; }
.tree-leaf { display: flex; align-items: center; gap: 6px; padding: 5px 12px 5px 34px; cursor: pointer; font-size: 12px; color: #475569; transition: background 0.15s; }
.tree-leaf:hover { background: #f8fafc; }
.tree-leaf.active { background: #fffbeb; color: #92400e; font-weight: 700; }
.tree-leaf.slot-a { border-left: 3px solid #3867f2; background: #eff6ff; }
.tree-leaf.slot-b { border-left: 3px solid #22c55e; background: #f0fdf4; }
.leaf-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.leaf-badge { font-size: 10px; padding: 1px 6px; border-radius: 999px; font-weight: 700; flex-shrink: 0; }
.leaf-badge.done { background: #dcfce7; color: #15803d; }
.leaf-badge.pending { background: #fef3c7; color: #92400e; }
.empty-hint { padding: 40px 0; text-align: center; color: #94a3b8; font-size: 13px; font-weight: 600; }

.info-card { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; }
.info-card--unified { border-top: 3px solid #3b82f6; }
.info-card-head { display: flex; align-items: center; gap: 7px; padding: 8px 12px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #eef2f7; background: linear-gradient(180deg, #eff6ff, #fafbfc); }
.info-card--unified .info-card-head .el-icon { color: #3b82f6; }
.head-spacer { flex: 1; }
.vs-inline { width: 24px; height: 24px; border-radius: 50%; background: #3b82f6; color: #fff; display: grid; place-items: center; font-weight: 900; font-size: 10px; flex-shrink: 0; }
.info-card-body { padding: 8px 12px; display: flex; flex-direction: column; gap: 3px; overflow-y: auto; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed #f1f5f9; }
.info-label { font-size: 11px; font-weight: 700; color: #64748b; }
.info-value { font-size: 12px; font-weight: 800; color: #0f172a; }
.info-empty { padding: 16px 0; text-align: center; color: #94a3b8; font-size: 12px; font-weight: 600; }

.compare-dual { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
.compare-col { padding: 8px 10px; display: flex; flex-direction: column; gap: 3px; min-height: 0; }
.compare-col--a { border-right: 1px solid #eef2f7; background: #f8fbff; border-radius: 6px 0 0 6px; }
.compare-col--b { background: #f8fff8; border-radius: 0 6px 6px 0; }
.compare-col.filled { background: #fff; }
.compare-col-label { font-size: 11px; font-weight: 900; color: #64748b; text-align: center; padding-bottom: 6px; border-bottom: 1px solid #eef2f7; margin-bottom: 4px; letter-spacing: 0.3px; }
.compare-col--a .compare-col-label { color: #2563eb; }
.compare-col--b .compare-col-label { color: #059669; }

.compare-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 6px 16px rgba(15,23,42,0.06); display: flex; min-height: 0; overflow: hidden; }
.compare-inner { display: flex; flex-direction: column; width: 100%; min-height: 0; flex: 1; }
.compare-head { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-top: 3px solid #8b5cf6; border-bottom: 1px solid #eef2f7; background: linear-gradient(180deg, #f5f3ff, #ffffff); gap: 12px; }
.compare-inner { display: flex; flex-direction: column; width: 100%; min-height: 0; }
.compare-head-left { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: #1e293b; }
.compare-head-left .el-icon { color: #8b5cf6; }
.compare-head-tabs { display: flex; gap: 4px; }
.tab-btn { padding: 5px 16px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; color: #64748b; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.tab-btn.active { background: #7c3aed; color: #fff; border-color: #7c3aed; }
.compare-head-actions { flex-shrink: 0; }
.compare-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 14px; }
.compare-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #94a3b8; gap: 8px; padding: 24px; }
.compare-empty .el-icon { display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #f1f5f9, #eef2f7); color: #cbd5e1; }
.compare-empty p { margin: 0; font-size: 15px; font-weight: 800; color: #64748b; }
.compare-empty span { font-size: 12px; font-weight: 600; max-width: 360px; line-height: 1.65; }

.compare-content { display: flex; flex-direction: column; gap: 14px; }
.card-pair-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cmp-card { border: 1px solid #e6ebf2; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; transition: box-shadow 0.15s ease, border-color 0.15s ease; }
.cmp-card:hover { border-color: #dbe4f0; box-shadow: 0 12px 26px -22px rgba(15, 23, 42, 0.6); }
.cmp-card--large { flex: 1 1 auto; min-height: 0; }
.cmp-card-head { display: flex; align-items: center; gap: 8px; padding: 9px 13px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #eef2f7; background: #fafbfc; position: relative; letter-spacing: -0.01em; }
.cmp-card-pip { width: 10px; height: 10px; border-radius: 999px; margin-left: auto; box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.05); }
.cmp-card-pip.blue { background: #3b82f6; } .cmp-card-pip.purple { background: #8b5cf6; }
.cmp-card-pip.teal { background: #0d9488; } .cmp-card-pip.amber { background: #d97706; }
.cmp-card-pip.slate { background: #475569; }
.cmp-card--blue { border-top: 3px solid #3b82f6; } .cmp-card--blue .cmp-card-head { background: linear-gradient(180deg, #eff6ff, #fafbfc); }
.cmp-card--purple { border-top: 3px solid #8b5cf6; } .cmp-card--purple .cmp-card-head { background: linear-gradient(180deg, #f5f3ff, #fafbfc); }
.cmp-card--teal { border-top: 3px solid #0d9488; } .cmp-card--teal .cmp-card-head { background: linear-gradient(180deg, #f0fdfa, #fafbfc); }
.cmp-card--amber { border-top: 3px solid #d97706; } .cmp-card--amber .cmp-card-head { background: linear-gradient(180deg, #fffbeb, #fafbfc); }
.cmp-card--slate { border-top: 3px solid #475569; } .cmp-card--slate .cmp-card-head { background: linear-gradient(180deg, #f8fafc, #fafbfc); }
.cmp-card-body { padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
.cmp-card--sm .cmp-card-head { padding: 5px 10px; font-size: 11px; }
.cmp-card--sm .cmp-card-body { padding: 4px 8px; gap: 1px; }
.cmp-card--sm .cmp-kv { padding: 2px 0; }
.cmp-card--sm .cmp-kv-label { font-size: 10px; }
.cmp-card--sm .cmp-kv-value { font-size: 11px; }
.card-pair-row--compact { gap: 6px; margin-bottom: 2px; }
.cmp-kv { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed #f1f5f9; }
.cmp-kv-label { font-size: 11px; font-weight: 700; color: #64748b; }
.cmp-kv-value { font-size: 12px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; }
.cmp-kv:last-child { border-bottom: none; }

.cmp-card--conclusion { border: 1px solid #e6ebf2; border-top: 3px solid #6366f1; border-radius: 12px; overflow: hidden; margin-bottom: 8px; }
.cmp-card--conclusion .cmp-card-head { background: linear-gradient(180deg, #eef2ff, #fafbfc); border-bottom: 1px solid #eef2f7; padding: 9px 14px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px; color: #4338ca; }
.cmp-card--conclusion .cmp-card-body { padding: 12px 16px; background: linear-gradient(120deg, #fafafe, #f8faff); }
.conclusion-text { margin: 0; font-size: 13px; line-height: 1.8; color: #334155; font-weight: 600; }
.conclusion-evidence { margin: 12px 0 0; padding: 8px 12px; border-left: 3px solid #2563eb; border-radius: 0 8px 8px 0; background: #eff6ff; font-size: 12px; line-height: 1.75; color: #334155; }

.cmp-card--chart { border: 1px solid #e6ebf2; border-top: 3px solid #10b981; border-radius: 12px; overflow: hidden; }
.cmp-card--chart .cmp-card-head { background: linear-gradient(180deg, #f0fdf4, #fafbfc); border-bottom: 1px solid #eef2f7; padding: 9px 14px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px; color: #059669; }
.cmp-card--chart .cmp-card-body { padding: 10px; background: #fff; }
.metrics-line-chart { width: 100%; height: 280px; }

.compare-section { margin-bottom: 6px; }
.compare-section h3 { display: flex; align-items: center; gap: 9px; margin: 0 0 10px; font-size: 15px; font-weight: 900; color: #0f172a; letter-spacing: -0.01em; }
.compare-section h3::before { content: ''; flex: 0 0 auto; width: 4px; height: 16px; border-radius: 999px; background: linear-gradient(180deg, #3b82f6, #6366f1); }
.compare-section h3 .el-icon { color: #2563eb; }
.compare-section :deep(.el-table) { border-radius: 10px; overflow: hidden; border-color: #e6ebf2; }
.compare-section :deep(.el-table th.el-table__cell) { background: #f8fafc; color: #475569; font-weight: 800; }
.compare-section :deep(.el-table .el-table__row:hover > td.el-table__cell) { background: #f8fbff; }
.val-a { color: #3867f2; font-weight: 700; } .val-b { color: #22c55e; font-weight: 700; }
.similarity-card { padding: 16px; border: 1px solid #e6ebf2; border-radius: 14px; background: linear-gradient(135deg, #fafbfc, #f5f9ff 60%, #f8fafc); box-shadow: inset 0 1px 0 #fff; }
.similarity-main { display: flex; justify-content: center; margin-bottom: 12px; }
.similarity-score { display: flex; align-items: center; gap: 12px; }
.score-number { font-size: 34px; line-height: 1.1; font-weight: 900; color: #d97706; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.similarity-dims { display: flex; flex-direction: column; gap: 8px; }
.sim-dim-item { display: grid; grid-template-columns: 100px 1fr; align-items: center; gap: 12px; }
.dim-label { font-size: 12px; font-weight: 700; color: #64748b; text-align: right; }

.event-timeline { display: flex; flex-direction: column; gap: 0; padding-left: 4px; }
.event-node { display: flex; gap: 10px; padding: 6px 0 6px 2px; position: relative; }
.event-node:not(:last-child)::before { content: ''; position: absolute; left: 9px; top: 26px; bottom: -2px; width: 2px; background: #e2e8f0; }
.event-dot { width: 13px; height: 13px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.12); }
.event-dot.red { background: #ef4444; } .event-dot.orange { background: #f59e0b; }
.event-dot.blue { background: #3b82f6; } .event-dot.green { background: #22c55e; }
.event-info { flex: 1; min-width: 0; }
.event-info strong { display: block; font-size: 12px; font-weight: 800; color: #1e293b; }
.event-time { display: inline-block; margin-top: 2px; font-size: 11px; font-weight: 700; color: #94a3b8; }
.event-desc { margin: 4px 0 0; font-size: 11px; color: #64748b; line-height: 1.4; }

/* ---- 自选维度 & 分布图 ---- */
.dimension-selector { display: flex; flex-direction: column; gap: 8px; padding: 4px 0; margin-bottom: 4px; }
.dim-toggle { display: flex; align-items: center; gap: 7px; cursor: pointer; padding: 8px 12px; border-radius: 10px; background: linear-gradient(120deg, #f8fafc, #f5f9ff); border: 1px solid #e6ebf2; user-select: none; transition: background 0.15s, border-color 0.15s, box-shadow 0.15s; }
.dim-toggle:hover { background: #f1f5f9; border-color: #c7d2fe; box-shadow: 0 8px 18px -16px rgba(37, 99, 235, 0.7); }
.dim-toggle .el-icon { color: #2563eb; }
.dim-selector-label { font-size: 12px; font-weight: 800; color: #64748b; white-space: nowrap; }
.dim-hint { font-size: 11px; color: #94a3b8; font-weight: 600; }
.dim-checkboxes { padding: 6px 10px; display: flex; flex-wrap: wrap; gap: 7px; }
.cmp-empty-hint { text-align: center; color: #cbd5e1; font-size: 12px; padding: 14px 0; }

.distribution-chart-container { width: 100%; height: 470px; margin: 10px 0; border: 1px solid #e6ebf2; border-radius: 14px; background: linear-gradient(180deg, #fdfefe, #f8fbfd); box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.04); }
.distribution-same-source { margin: 0 0 8px; padding: 8px 12px; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; background: #fffbeb; font-size: 12px; line-height: 1.7; color: #78350f; }

.distribution-summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.dist-summary-card { padding: 12px 14px; border: 1px solid #e6ebf2; border-radius: 12px; background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03); transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
.dist-summary-card:hover { transform: translateY(-2px); border-color: #c7d2fe; box-shadow: 0 16px 30px -22px rgba(15, 23, 42, 0.6); }
.dist-summary-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
.dist-summary-label { font-size: 12.5px; font-weight: 800; color: #1e293b; letter-spacing: -0.01em; }
.dist-summary-unit { font-size: 11px; color: #94a3b8; }
.dist-summary-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }
.dist-tag-a { padding: 1px 7px; border-radius: 5px; background: #dbeafe; color: #1d4ed8; font-size: 10px; font-weight: 900; }
.dist-tag-b { padding: 1px 7px; border-radius: 5px; background: #dcfce7; color: #15803d; font-size: 10px; font-weight: 900; }
.dist-range { font-size: 11px; color: #94a3b8; margin-left: auto; font-variant-numeric: tabular-nums; }
.dist-summary-block + .dist-summary-block { margin-top: 4px; padding-top: 4px; border-top: 1px dashed #eef2f7; }
.dist-summary-meta { font-size: 11px; color: #64748b; font-weight: 600; padding: 0 0 2px 22px; }
.distribution-footnote { margin: 10px 0 0; padding: 10px 14px; border: 1px dashed #cbd5e1; border-radius: 10px; background: #f8fafc; font-size: 12px; line-height: 1.75; color: #475569; }

.compare-empty-inline { display: flex; justify-content: center; padding: 44px 24px; margin: 4px 0; border: 1px dashed #dbe4f0; border-radius: 12px; background: #fafbfc; color: #94a3b8; font-size: 13px; font-weight: 600; text-align: center; }
.compare-empty-inline p { margin: 0; max-width: 640px; line-height: 1.75; }

/* ---- 跨库相似度矩阵 ---- */
.cross-library-section { flex: 0 0 auto; margin-top: 12px; border: 1px solid #e6ebf2; border-radius: 16px; background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 30px -24px rgba(15, 23, 42, 0.5); overflow: hidden; max-height: 360px; }
.cross-library-section .el-table { font-size: 12px; }
.cross-library-head { display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-bottom: 1px solid #eef2f7; background: linear-gradient(180deg, #f0fdf4, #ffffff); font-size: 14px; font-weight: 800; color: #065f46; }
.cross-library-head .el-icon { color: #10b981; }
.cross-library-sub { margin-left: auto; font-size: 11px; font-weight: 600; color: #94a3b8; }
.cross-library-body { padding: 8px; overflow-x: auto; display: flex; flex-direction: column; gap: 8px; }
.matrix-summary { padding: 12px 16px; background: linear-gradient(120deg, #fffbeb, #fffdf5); border: 1px solid #fde68a; border-left: 3px solid #f59e0b; border-radius: 10px; }
.matrix-summary p { margin: 0; font-size: 12px; line-height: 1.7; color: #78350f; font-weight: 600; }
.matrix-toggle-row { display: flex; justify-content: center; }
.cross-library-table { overflow-x: auto; }
.sim-cell { font-size: 12px; font-weight: 800; }

/* ---- 深度分析：溯源 / 显著性 / 归因 / 趋势 ---- */
.h3-tag { margin-left: 4px; }
.focus-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #475569; cursor: pointer; user-select: none; white-space: nowrap; }
.compare-head-actions { display: flex; align-items: center; gap: 12px; }
.analysis-alert { margin-bottom: 10px; }
.section-desc { margin: 0 0 10px; font-size: 12px; line-height: 1.7; color: #64748b; }
.table-footnote { margin: 8px 0 0; font-size: 11px; line-height: 1.6; color: #94a3b8; }
.mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; font-size: 12px; }
.delta-up { color: #16a34a; font-weight: 800; }
.delta-down { color: #dc2626; font-weight: 800; }
.delta-flat { color: #64748b; font-weight: 700; }

.verdict-strip { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; }
.verdict-item { font-size: 12px; color: #475569; }
.verdict-item b { color: #0f172a; }
.verdict-item em { font-style: normal; color: #94a3b8; }

.provenance-bar { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.prov-item { display: flex; gap: 10px; padding: 12px 14px; border: 1px solid #e6ebf2; border-radius: 12px; background: linear-gradient(120deg, #fafbfc, #f8fbff); transition: transform 0.15s ease, box-shadow 0.15s ease; }
.prov-item:hover { transform: translateY(-2px); box-shadow: 0 14px 26px -22px rgba(15, 23, 42, 0.6); }
.prov-item--a { border-left: 3px solid #3867f2; }
.prov-item--b { border-left: 3px solid #22c55e; }
.prov-tag { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; font-size: 11px; font-weight: 900; color: #fff; display: flex; align-items: center; justify-content: center; }
.prov-item--a .prov-tag { background: #3867f2; }
.prov-item--b .prov-tag { background: #22c55e; }
.prov-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.prov-body b { font-size: 12px; color: #0f172a; }
.prov-body span { font-size: 11px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prov-llm { font-weight: 800; color: #9333ea !important; }
.prov-meta { grid-column: 1 / -1; display: flex; gap: 18px; font-size: 11px; color: #94a3b8; padding: 2px 4px; }

.warning-list { margin: 0; padding-left: 18px; }
.warning-list li { font-size: 12px; line-height: 1.8; color: #b45309; }
.ok-hint { margin: 0; font-size: 12px; color: #15803d; font-weight: 600; }

.significance-table { font-size: 12px; }
.significance-table :deep(.el-table__cell) { padding: 6px 0; }
.attribution-list { display: flex; flex-direction: column; gap: 8px; }
.attr-row { display: grid; grid-template-columns: 140px 1fr 110px 56px; align-items: center; gap: 12px; }
.attr-label { font-size: 12px; font-weight: 700; color: #334155; text-align: right; }
.attr-delta { font-size: 12px; font-weight: 800; text-align: right; }

.trend-select { margin-left: auto; width: 170px; }
.trend-chart { width: 100%; height: 300px; }
.trend-unavailable { display: flex; gap: 10px; align-items: flex-start; padding: 14px 16px; border: 1px dashed #f0c36d; border-radius: 10px; background: #fffbeb; }
.trend-unavailable-icon { font-size: 18px; color: #d97706; margin-top: 2px; }
.trend-unavailable-body b { display: block; font-size: 13px; color: #92400e; margin-bottom: 4px; }
.trend-unavailable-body p { margin: 0; font-size: 12px; line-height: 1.6; color: #a16207; }
.trend-note { margin: 8px 0 0; font-size: 12px; color: #b45309; }
.library-notice { margin: 0 0 8px; padding: 6px 8px; font-size: 11px; line-height: 1.5; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; }
.library-progress { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; padding: 6px 8px; font-size: 11px; font-weight: 600; color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; }

.shape-block { margin-left: 24px; padding-left: 20px; border-left: 1px solid #e2e8f0; }
.shape-title { font-size: 11px; font-weight: 800; color: #94a3b8; }
.shape-value { font-size: 22px; font-weight: 900; color: #2563eb; line-height: 1.2; }
.shape-desc { max-width: 260px; font-size: 11px; line-height: 1.6; color: #64748b; }
.similarity-dims .sim-dim-item { grid-template-columns: 132px 1fr; }
.dim-weight { display: block; font-style: normal; font-size: 10px; font-weight: 700; color: #a3aebd; }

/* ---- 反事实推演 ---- */
.cf-form { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fafbfc; }
.cf-field { display: flex; flex-direction: column; gap: 5px; }
.cf-field label { font-size: 11px; font-weight: 800; color: #64748b; }
.cf-target-hint { margin: 8px 0 0; font-size: 11px; color: #94a3b8; }
.cf-target-hint b { color: #475569; }
.cf-summary { padding: 10px 14px; margin-bottom: 10px; border-radius: 10px; background: #eff6ff; border: 1px solid #bfdbfe; font-size: 12px; line-height: 1.8; color: #1e3a8a; }
.cf-intervention { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; font-size: 13px; }
.cf-var { font-weight: 900; color: #0f172a; }
.cf-arrow { font-weight: 800; color: #2563eb; }
.cf-change { padding: 1px 8px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 800; }

.fallback-chain { display: flex; flex-direction: column; gap: 8px; }
.fallback-item { display: flex; gap: 10px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; opacity: 0.62; }
.fallback-item.used { opacity: 1; border-color: #86efac; background: #f0fdf4; }
.fallback-index { flex-shrink: 0; width: 22px; height: 22px; border-radius: 6px; background: #e2e8f0; color: #475569; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.fallback-item.used .fallback-index { background: #22c55e; color: #fff; }
.fallback-body { flex: 1; min-width: 0; }
.fallback-body b { font-size: 12px; color: #0f172a; margin-right: 8px; }
.fallback-state { font-size: 10px; font-weight: 800; padding: 1px 7px; border-radius: 999px; }
.state-used { background: #dcfce7; color: #15803d; }
.state-skip { background: #fef3c7; color: #92400e; }
.state-off { background: #f1f5f9; color: #94a3b8; }
.fallback-body p { margin: 4px 0 0; font-size: 11px; line-height: 1.6; color: #64748b; }

.conclusion-summary-card:focus-visible, .dim-toggle:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .conclusion-summary-card, .cmp-card, .dist-summary-card, .prov-item, .stat-item, .dim-toggle { transition: none; }
  .conclusion-summary-card:hover, .dist-summary-card:hover, .prov-item:hover, .stat-item:hover { transform: none; }
  .compare-detail { animation: none; }
}

@media (max-width: 1100px) {
  .observe-layout { grid-template-columns: 1fr; }
  .card-pair-row { grid-template-columns: 1fr; }
  .provenance-bar, .attr-row { grid-template-columns: 1fr; }
  .attr-label, .attr-delta { text-align: left; }
}
</style>
