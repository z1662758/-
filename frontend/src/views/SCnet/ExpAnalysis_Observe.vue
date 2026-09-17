<template>
  <div class="post-observe-page">
    <section class="page-head">
      <div>
        <h1>观察分析与案例对比</h1>
        <p class="subtitle">基于实验结果进行多维度对比分析，评估策略效果与关键指标表现。</p>
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

    <div class="observe-layout">
      <!-- 篮筐1：铀供应链实验库 -->
      <aside class="observe-panel observe-panel--lib">
        <div class="panel-head-bar panel-head-bar--blue">
          <el-icon><Folder /></el-icon>
          <span>铀供应链实验库</span>
          <el-input v-model="searchQuery" placeholder="搜索..." size="small" clearable class="search-input" />
        </div>
        <div class="panel-body-fill">
          <div v-for="folder in filteredFolders" :key="folder.id" class="tree-folder">
            <div class="tree-folder-head" :class="{ expanded: folder.expanded }" @click="folder.expanded = !folder.expanded">
              <el-icon><component :is="folder.expanded ? ArrowDown : ArrowRight" /></el-icon>
              <el-icon><FolderOpened v-if="folder.expanded" /><Folder v-else /></el-icon>
              <span class="folder-name">{{ folder.label }}</span>
              <span class="folder-stats">
                <span class="stat-done">✓ {{ folder.completedCount }}</span>
                <span class="stat-pending">○ {{ folder.pendingCount }}</span>
              </span>
              <span class="folder-count">{{ folder.children.length }}</span>
            </div>
            <div v-show="folder.expanded" class="tree-folder-children">
              <div
                v-for="child in folder.displayChildren" :key="child.id"
                class="tree-leaf"
                :class="{
                  active: selectedCaseId === child.id,
                  'slot-a': caseAId === child.id,
                  'slot-b': caseBId === child.id
                }"
                @click="selectCaseForComparison(child)"
              >
                <el-icon><Document /></el-icon>
                <span class="leaf-name">{{ child.name }}</span>
                <span class="leaf-badge" :class="child.completed ? 'done' : 'pending'">
                  {{ child.completed ? '完成' : '进行中' }}
                </span>
              </div>
              <div v-if="folder.children.length > folder.displayChildren.length" class="tree-more">
                还有 {{ folder.children.length - folder.displayChildren.length }} 个实验，请搜索筛选查看
              </div>
            </div>
          </div>
          <div v-if="totalCaseCount === 0 && !loading" class="empty-hint">暂无可用实验数据</div>
        </div>
      </aside>

      <!-- 篮筐2：实验对比 -->
      <section class="observe-panel observe-panel--cmp">
        <div class="panel-head-bar panel-head-bar--blue">
          <el-icon><DataAnalysis /></el-icon>
          <span>实验对比</span>
          <span class="head-spacer"></span>
          <el-tag v-if="caseA" size="small" :type="caseA.completed ? 'success' : 'warning'" round>实验 A</el-tag>
          <span v-if="caseA && caseB" class="vs-inline">VS</span>
          <el-tag v-if="caseB" size="small" :type="caseB.completed ? 'success' : 'warning'" round>实验 B</el-tag>
        </div>
        <div class="panel-body-fill">
          <div class="compare-dual">
            <div class="compare-col compare-col--a" :class="{ filled: !!caseA }">
              <div class="compare-col-label">实验 A</div>
              <template v-if="caseA">
                <div class="info-row"><span class="info-label">实验名</span><span class="info-value">{{ caseA.name }}</span></div>
                <div class="info-row"><span class="info-label">完成率</span><span class="info-value">{{ caseA.completionRate }}</span></div>
                <div class="info-row"><span class="info-label">供应缺口率</span><span class="info-value">{{ caseA.backlogRate }}</span></div>
                <div class="info-row"><span class="info-label">产能方案</span><span class="info-value">{{ caseA.capacityPlan }}</span></div>
                <div class="info-row"><span class="info-label">干预变量</span><span class="info-value">{{ caseA.intervention }}</span></div>
              </template>
              <div v-else class="info-empty">点击左侧实验设为 A</div>
            </div>
            <div class="compare-col compare-col--b" :class="{ filled: !!caseB }">
              <div class="compare-col-label">实验 B</div>
              <template v-if="caseB">
                <div class="info-row"><span class="info-label">实验名</span><span class="info-value">{{ caseB.name }}</span></div>
                <div class="info-row"><span class="info-label">完成率</span><span class="info-value">{{ caseB.completionRate }}</span></div>
                <div class="info-row"><span class="info-label">供应缺口率</span><span class="info-value">{{ caseB.backlogRate }}</span></div>
                <div class="info-row"><span class="info-label">产能方案</span><span class="info-value">{{ caseB.capacityPlan }}</span></div>
                <div class="info-row"><span class="info-label">干预变量</span><span class="info-value">{{ caseB.intervention }}</span></div>
              </template>
              <div v-else class="info-empty">再次点击另一实验设为 B</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 篮筐3：案例对比 -->
      <section class="observe-panel observe-panel--chart">
        <div class="panel-head-bar panel-head-bar--purple">
          <el-icon :size="18"><TrendCharts /></el-icon>
          <span>案例对比</span>
            <div class="compare-head-tabs">
              <button class="tab-btn" :class="{ active: activeTab === 'metrics' }" @click="activeTab = 'metrics'">指标对比</button>
              <button class="tab-btn" :class="{ active: activeTab === 'deep' }" @click="activeTab = 'deep'">深度分析</button>
              <button class="tab-btn" :class="{ active: activeTab === 'distribution' }" @click="activeTab = 'distribution'">概率分布</button>
              <button class="tab-btn" :class="{ active: activeTab === 'counterfactual' }" @click="activeTab = 'counterfactual'">反事实推演</button>
            </div>
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
            </div>
        </div>

        <div class="panel-body-fill compare-body">
            <div v-if="!caseA || !caseB" class="compare-empty">
              <el-icon :size="48"><TrendCharts /></el-icon>
              <p>选择两个实验后查看对比详情</p>
              <span>在左侧实验库中：<br>第一次点击 → 设为实验 A<br>第二次点击另一实验 → 设为实验 B 并自动对比<br>第三次点击 → 重新选择 A</span>
            </div>

            <!-- ===== Tab 1: 指标对比 ===== -->
            <div v-else-if="activeTab === 'metrics'" class="compare-content">
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
                  <el-alert
                    v-if="analysisError"
                    :title="analysisError"
                    type="warning" :closable="false" show-icon class="analysis-alert"
                  />
                </div>
              </div>

              <!-- 指标对比折线图 -->
              <div class="cmp-card cmp-card--chart">
                <div class="cmp-card-head">
                  <el-icon><TrendCharts /></el-icon>
                  <span>实验指标对比 · 折线图</span>
                </div>
                <div class="cmp-card-body">
                  <div ref="metricsLineChartRef" class="metrics-line-chart"></div>
                </div>
              </div>
            </div>

            <!-- ===== Tab 2: 深度分析 ===== -->
            <div v-else-if="activeTab === 'deep'" class="compare-content">
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
                </section>

                <!-- 可比性校验 -->
                <section class="compare-section" v-if="comparabilityLevelMeta">
                  <h3>
                    <el-icon><Odometer /></el-icon>可比性校验
                    <el-tag :type="comparabilityLevelMeta.type" size="small" effect="light" round class="h3-tag">{{ comparabilityLevelMeta.text }}</el-tag>
                  </h3>
                  <ul v-if="comparability.warnings.length" class="warning-list">
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

                <!-- 差异归因 -->
                <section class="compare-section" v-if="attributionItems.length">
                  <h3>
                    <el-icon><TrendCharts /></el-icon>差异归因
                    <el-tag size="small" effect="light" round class="h3-tag">按标准化差异分配贡献度</el-tag>
                  </h3>
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
                  </h3>
                  <div ref="trendChartRef" class="trend-chart"></div>
                </section>

                <!-- 加权相似度 -->
                <section class="compare-section">
                  <h3>
                    <el-icon><Odometer /></el-icon>加权多维相似度
                    <el-tag size="small" effect="light" round class="h3-tag">权重按指标重要度归一化</el-tag>
                  </h3>
                  <div class="similarity-card">
                    <div class="similarity-main">
                      <div class="similarity-score">
                        <span class="score-number">{{ analysis.similarity.overall_score }}%</span>
                        <el-tag :type="getSimilarityLevelType()" effect="light" round>{{ analysis.similarity.level }}</el-tag>
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
                      <div v-for="dim in analysis.similarity.dimensions" :key="dim.key" class="sim-dim-item">
                        <span class="dim-label">{{ dim.dimension }}<em class="dim-weight">权重 {{ (dim.weight * 100).toFixed(0) }}%</em></span>
                        <el-progress :percentage="dim.score" :stroke-width="8" :color="dim.score >= 75 ? '#22c55e' : dim.score >= 50 ? '#eab308' : '#94a3b8'" />
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
            <div v-else-if="activeTab === 'distribution'" class="compare-content">
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

              <div ref="distChartRef" class="distribution-chart-container"></div>

              <!-- 分布统计摘要 -->
              <div class="distribution-summary" v-if="distributionDataA || distributionDataB">
                <div class="dist-summary-card" v-for="opt in DIST_METRIC_OPTIONS.filter(o => selectedDistMetrics.includes(o.key))" :key="opt.key">
                  <div class="dist-summary-head">
                    <span class="dist-summary-label">{{ opt.label }}</span>
                    <span class="dist-summary-unit" v-if="opt.unit">{{ opt.unit }}</span>
                  </div>
                  <div class="dist-summary-row" v-if="distributionDataA?.metric_ranges?.[opt.key]">
                    <span class="dist-tag-a">A</span>
                    <span>{{ distributionDataA.metric_ranges[opt.key].mean?.toFixed?.(3) || '--' }}</span>
                    <span class="dist-range">[{{ distributionDataA.metric_ranges[opt.key].min?.toFixed?.(2) || '--' }}, {{ distributionDataA.metric_ranges[opt.key].max?.toFixed?.(2) || '--' }}]</span>
                  </div>
                  <div class="dist-summary-row" v-if="distributionDataB?.metric_ranges?.[opt.key]">
                    <span class="dist-tag-b">B</span>
                    <span>{{ distributionDataB.metric_ranges[opt.key].mean?.toFixed?.(3) || '--' }}</span>
                    <span class="dist-range">[{{ distributionDataB.metric_ranges[opt.key].min?.toFixed?.(2) || '--' }}, {{ distributionDataB.metric_ranges[opt.key].max?.toFixed?.(2) || '--' }}]</span>
                  </div>
                </div>
              </div>
              <div v-else-if="distLoading" class="compare-empty-inline">
                <p>正在加载概率分布数据...</p>
              </div>
              <div v-else class="compare-empty-inline">
                <p>未取到这两个实验的逐轮指标数据（后端 /distribution 接口无返回），因此不展示分布图，避免用模拟数据误导结论。</p>
              </div>
            </div>

            <!-- ===== Tab 4: 反事实推演 ===== -->
            <div v-else-if="activeTab === 'counterfactual'" class="compare-content">
              <section class="compare-section">
                <h3><el-icon><VideoPlay /></el-icon>反事实干预推演</h3>
                <p class="section-desc">
                  针对已完成的实验做「如果当时把某个变量调成另一个值会怎样」的干预推断。
                  后端按 <b>后端仿真 → 数据驱动回归 → 启发式规则</b> 逐层回退，并标明实际生效的方法。
                </p>
                <div class="cf-form">
                  <div class="cf-field">
                    <label>干预对象</label>
                    <el-radio-group v-model="cfTarget" size="small">
                      <el-radio-button value="A" :disabled="!caseA">实验 A{{ caseA ? ' · ' + caseA.name : '' }}</el-radio-button>
                      <el-radio-button value="B" :disabled="!caseB">实验 B{{ caseB ? ' · ' + caseB.name : '' }}</el-radio-button>
                    </el-radio-group>
                  </div>
                  <div class="cf-field">
                    <label>干预变量</label>
                    <el-select v-model="cfForm.variable" size="small" style="width: 150px">
                      <el-option v-for="v in CF_VARIABLE_OPTIONS" :key="v" :label="v" :value="v" />
                    </el-select>
                  </div>
                  <div class="cf-field">
                    <label>变化幅度</label>
                    <el-select v-model="cfForm.change" size="small" style="width: 110px">
                      <el-option v-for="c in CF_CHANGE_OPTIONS" :key="c" :label="c" :value="c" />
                    </el-select>
                  </div>
                  <el-button type="primary" size="small" :icon="VideoPlay" :loading="cfLoading" @click="runCounterfactual">
                    执行干预推断
                  </el-button>
                </div>
                <p class="cf-target-hint" v-if="cfTargetCase">
                  当前干预数据源：<b>{{ cfTargetCase.experimentId }}</b> 第 {{ cfTargetCase.iteration }} 轮
                  （完成率 {{ cfTargetCase.completionRate }} · 净利润 {{ cfTargetCase.metrics?.total_net_profit }}）
                </p>
              </section>

              <el-alert v-if="cfError" :title="cfError" type="error" :closable="false" show-icon class="analysis-alert" />

              <template v-if="cfResult">
                <section class="compare-section">
                  <h3>
                    <el-icon><DataAnalysis /></el-icon>推断结果
                    <el-tag :type="cfMethodTag.type" size="small" effect="light" round class="h3-tag">{{ cfMethodTag.text }}</el-tag>
                  </h3>
                  <div class="cf-summary">{{ cfResult.summary }}</div>
                  <div class="cf-intervention">
                    <span class="cf-var">{{ cfResult.intervention?.variable }}</span>
                    <span class="cf-arrow">{{ cfResult.intervention?.current_value }} → {{ cfResult.intervention?.new_value }}</span>
                    <span class="cf-change">{{ cfResult.intervention?.change }}</span>
                  </div>
                  <el-table :data="cfResult.predictions || []" size="small" stripe class="significance-table">
                    <el-table-column prop="target_variable" label="受影响指标" width="140" />
                    <el-table-column v-if="cfHasNumericValues" label="基准 → 干预后" width="160">
                      <template #default="{ row }">
                        <span class="mono">{{ row.current_value }} → {{ row.predicted_value }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="predicted_effect" label="预测变化" width="140">
                      <template #default="{ row }">
                        <span class="mono" :class="String(row.predicted_effect).startsWith('-') ? 'delta-down' : 'delta-up'">{{ row.predicted_effect }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="置信度" width="140">
                      <template #default="{ row }">
                        <el-progress :percentage="Math.round((row.confidence || 0) * 100)" :stroke-width="10"
                          :color="row.confidence >= 0.75 ? '#22c55e' : row.confidence >= 0.55 ? '#eab308' : '#94a3b8'" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="rationale" label="推断依据" />
                  </el-table>
                  <p class="table-footnote">{{ cfResult.note }}</p>
                </section>

                <section class="compare-section" v-if="cfResult.fallback_chain?.length">
                  <h3><el-icon><Collection /></el-icon>回退链路</h3>
                  <div class="fallback-chain">
                    <div v-for="(layer, i) in cfResult.fallback_chain" :key="i" class="fallback-item" :class="{ used: layer.used }">
                      <span class="fallback-index">{{ layer.layer }}</span>
                      <div class="fallback-body">
                        <b>{{ layer.method }}</b>
                        <span class="fallback-state" :class="layer.used ? 'state-used' : layer.available ? 'state-skip' : 'state-off'">
                          {{ layer.used ? '已采用' : layer.available ? '可用未用' : '不可用' }}
                        </span>
                        <p>{{ layer.reason }}</p>
                      </div>
                    </div>
                  </div>
                  <p class="table-footnote">数据源：{{ cfResult.experiment_id }}{{ cfResult.resolved_id?.iteration ? ' · 第 ' + cfResult.resolved_id.iteration + ' 轮' : '' }}</p>
                </section>
              </template>

              <div v-else-if="!cfLoading && !cfError" class="compare-empty-inline">
                <p>选择干预对象与变量后点击「执行干预推断」</p>
              </div>
            </div>
          </div>
      </section>
    </div>

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
  ArrowDown, ArrowRight, ArrowUp, Collection, DataAnalysis, DataLine, Document, Download, Folder,
  FolderOpened, Odometer, Refresh, Setting, TrendCharts, VideoPlay
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getExperiments, getExperimentDetail, getCaseLibrary, compareCases, getExperimentDistribution, postObserveCounterfactual } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'

// ---- 状态 ----
const loading = ref(false)
const searchQuery = ref('')
const activeTab = ref('metrics')
const caseAId = ref(null)
const caseBId = ref(null)
const comparison = ref(null)
// 后端深度分析（加权相似度 / 显著性检验 / 差异归因 / 演化趋势 / 结论 / 数据溯源）
const analysis = ref(null)
const resolvedIds = ref(null)
const analysisLoading = ref(false)
const analysisError = ref('')
// 是否把对比聚焦到案例所属的那一轮（默认关闭：按报告全部轮次对比，才有足够样本做显著性检验）
const focusIteration = ref(false)
const trendChartRef = ref(null)
let trendChartInstance = null

// 反事实干预推演
const cfForm = reactive({ variable: '产能水平', change: '+20%' })
const cfResult = ref(null)
const cfLoading = ref(false)
const cfError = ref('')
const CF_VARIABLE_OPTIONS = ['产能水平', '库存容量', '订单倍数', '协作频次']
const CF_CHANGE_OPTIONS = ['-50%', '-30%', '-20%', '+10%', '+20%', '+30%', '+50%', '+100%']
const caseFolders = reactive([
  { id: 'f1', label: '铀供应链事中实验', expanded: true, children: [] },
  { id: 'f2', label: '铀供应链反事实实验', expanded: true, children: [] }
])

const totalCaseCount = computed(() =>
  caseFolders.reduce((sum, f) => sum + f.children.length, 0)
)

const MAX_VISIBLE_CHILDREN = 6
const filteredFolders = computed(() => {
  const search = searchQuery.value
  return caseFolders.map(f => {
    const allChildren = search
      ? f.children.filter(c => c.name?.toLowerCase().includes(search) || c.id?.toLowerCase().includes(search))
      : f.children
    const completedCount = allChildren.filter(c => c.completed).length
    const pendingCount = allChildren.length - completedCount
    // 有搜索时展示全部匹配项，无搜索时限制展示数量
    const displayChildren = search ? allChildren : allChildren.slice(0, MAX_VISIBLE_CHILDREN)
    return {
      ...f,
      children: allChildren,
      displayChildren,
      completedCount,
      pendingCount
    }
  }).filter(f => !search || f.children.length > 0)
})

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

// ---- 概率分布图状态 ----
const distributionDataA = ref(null)
const distributionDataB = ref(null)
const distLoading = ref(false)
const distChartRef = ref(null)
let distChartInstance = null
const metricsLineChartRef = ref(null)
let metricsLineChartInstance = null

const DIST_METRIC_OPTIONS = [
  { key: 'completion_rate', label: '订单完成率', unit: '%', color: '#3b82f6' },
  { key: 'total_profit', label: '系统总利润', unit: '', color: '#22c55e' },
  { key: 'network_density', label: '网络密度', unit: '', color: '#8b5cf6' },
  { key: 'enterprise_count', label: '企业数量', unit: '', color: '#f59e0b' },
  { key: 'network_stability', label: '网络稳定性', unit: '%', color: '#ef4444' },
  { key: 'production_capacity_est', label: '产能估算(tU/年)', unit: '', color: '#0d9488' },
]
const selectedDistMetrics = ref(['completion_rate', 'total_profit', 'network_density', 'network_stability'])
const distDimsExpanded = ref(false)
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
  let maxPair = '', minPair = ''
  rows.forEach(r => {
    const scores = Object.values(r.scores || {})
    scores.forEach(s => {
      if (typeof s === 'number') {
        totalSim += s; simCount++
        if (s > maxSim) { maxSim = s; maxPair = `${r.duringName} ↔ ...` }
        if (s < minSim) { minSim = s; minPair = `${r.duringName} ↔ ...` }
      }
    })
  })
  const avgSim = simCount ? Math.round(totalSim / simCount) : 0
  const highCount = rows.reduce((c, r) => c + Object.values(r.scores || {}).filter(s => s >= 75).length, 0)
  const lowCount = rows.reduce((c, r) => c + Object.values(r.scores || {}).filter(s => s < 50).length, 0)
  return `事中实验库（${during.length} 个）与反事实实验库（${cf.length} 个）共 ${during.length * Math.min(cf.length, 8)} 对比较，整体平均相似度 ${avgSim}%。其中高度相似（≥75%）${highCount} 对，差异较大（<50%）${lowCount} 对。事中与反事实实验在产能配置和完成率维度上区分度最为显著，可通过调整铀矿产能与新矿投产阈值进一步拉开策略差异。`
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
const COMPARISON_DIM_OPTIONS = [
  { key: 'completionRate', label: '订单完成率' },
  { key: 'backlogRate', label: '供应缺口率' },
  { key: 'collaboration', label: '网络协作次数' },
  { key: 'resilience', label: '韧性指数' },
  { key: 'demandLevel', label: '铀需求强度' },
  { key: 'capacityPlan', label: '铀矿产能方案' },
  { key: 'intervention', label: '干预策略' },
  { key: 'method', label: '实验方法' },
]
const selectedComparisonDims = ref(['completionRate', 'backlogRate', 'resilience', 'demandLevel'])
const dimsExpanded = ref(false)

// 自选维度过滤
const filteredParamFields = computed(() =>
  paramFields.filter(p => selectedComparisonDims.value.includes(p.key))
)
const filteredResultFields = computed(() =>
  resultFields.filter(r => selectedComparisonDims.value.includes(r.key))
)

const localSimilarityDims = computed(() => {
  if (!caseA.value || !caseB.value) return []
  return [
    { dimension: '产能配置', score: computeDimSimilarity('capacityPlan') },
    { dimension: '需求强度', score: computeDimSimilarity('demandLevel') },
    { dimension: '干预策略', score: computeDimSimilarity('intervention') },
    { dimension: '完成率表现', score: computeDimSimilarity('completionRate') }
  ]
})

// ---- 案例选择（A/B 模式） ----
const selectCaseForComparison = (child) => {
  if (!caseAId.value) {
    caseAId.value = child.id
    caseBId.value = null
    comparison.value = null
    resetAnalysis()
    ElMessage.info(`已选择实验 A: ${child.name}`)
  } else if (!caseBId.value && child.id !== caseAId.value) {
    caseBId.value = child.id
    ElMessage.info(`已选择实验 B: ${child.name}，正在对比...`)
    runComparison()
  } else {
    caseAId.value = child.id
    caseBId.value = null
    comparison.value = null
    resetAnalysis()
    ElMessage.info(`已重新选择实验组: ${child.name}`)
  }
}

const resetAnalysis = () => {
  analysis.value = null
  resolvedIds.value = null
  analysisError.value = ''
  cfResult.value = null
  cfError.value = ''
  comparison.value = null
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

const loadDistributionData = async () => {
  if (!caseA.value || !caseB.value) return
  distLoading.value = true
  try {
    const [a, b] = await Promise.all([
      fetchDistributionForCase(caseA.value),
      fetchDistributionForCase(caseB.value)
    ])
    distributionDataA.value = a
    distributionDataB.value = b
    await nextTick()
    renderDistributionChart()
  } finally {
    distLoading.value = false
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
  const dataB = distributionDataB.value
  if (!dataA && !dataB) return

  distChartInstance = echarts.init(container)
  const selectedMetrics = selectedDistMetrics.value.filter(k =>
    DIST_METRIC_OPTIONS.some(o => o.key === k)
  )
  if (!selectedMetrics.length) return

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
    const opt = DIST_METRIC_OPTIONS.find(o => o.key === metricKey) || { label: metricKey, unit: '' }
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
      iters.map(i => i[key]).filter(v => v != null && Number.isFinite(v))

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

    seriesItems.push(
      {
        name: '实验 A', type: 'line', xAxisIndex: idx, yAxisIndex: idx,
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
      },
      {
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
      }
    )
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
      data: ['实验 A', '实验 B'],
      bottom: 0,
      textStyle: { fontSize: 11, color: '#64748b' },
      itemWidth: 16, itemHeight: 4, itemGap: 24
    },
    grid: gridItems,
    xAxis: xAxes,
    yAxis: yAxes,
    series: seriesItems
  })

  // 响应式
  window.addEventListener('resize', () => distChartInstance?.resize())
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
  if (metricsLineChartInstance) metricsLineChartInstance.dispose()
  metricsLineChartInstance = echarts.init(container)

  const metrics = [
    { key: 'completionRate', label: '完成率', parse: v => parseFloat(v) || 0 },
    { key: 'backlogRate', label: '缺口率', parse: v => parseFloat(v) || 0 },
    { key: 'collaboration', label: '协作次数', parse: v => parseInt(v) || 0 },
    { key: 'resilience', label: '韧性', parse: v => parseFloat(v) || 0 }
  ]

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

  window.addEventListener('resize', () => metricsLineChartInstance?.resize())
}

// 监听 tab 切换
watch(activeTab, (val) => {
  if (val === 'metrics' && caseA.value && caseB.value) {
    nextTick(() => renderMetricsLineChart())
  }
  if (val === 'deep' && analysis.value) {
    nextTick(() => renderTrendChart())
  }
  if (val === 'distribution') {
    if (caseA.value && caseB.value) {
      loadDistributionData()
    }
  }
})

// 监听 caseA/caseB 变化 → 自动渲染图表
watch([caseA, caseB], ([a, b]) => {
  if (a && b && activeTab.value === 'metrics') {
    nextTick(() => renderMetricsLineChart())
  }
})

// ================= 后端深度分析结果 =================
const metricRows = computed(() => analysis.value?.metrics || [])
const significantRows = computed(() => metricRows.value.filter(r => r.significant))
const attributionItems = computed(() => analysis.value?.attribution || [])
const comparability = computed(() => analysis.value?.comparability || null)
const provenance = computed(() => analysis.value?.provenance || null)
const shapeInfo = computed(() => analysis.value?.similarity?.shape || null)
const similarityScore = computed(() =>
  analysis.value?.similarity?.overall_score ?? comparison.value?.similarity?.overall_score ?? null)
const conclusionText = computed(() => {
  const c = analysis.value?.conclusion
  if (c?.text) return c.text
  return generateLocalRecommendation()
})
const conclusionSource = computed(() => analysis.value?.conclusion || null)
const analysisReady = computed(() => !!analysis.value)

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
const trendMetricKey = ref('')
const trendOptions = computed(() => (analysis.value?.trend || []).map(t => ({ key: t.key, label: t.label })))

watch(trendOptions, (opts) => {
  if (!opts.length) { trendMetricKey.value = ''; return }
  if (!opts.some(o => o.key === trendMetricKey.value)) trendMetricKey.value = opts[0].key
}, { immediate: true })

watch(trendMetricKey, () => { nextTick(() => renderTrendChart()) })

// 深度分析结果到达后，若正在看深度分析 tab 则立即渲染趋势图
watch(analysis, (val) => {
  if (val && activeTab.value === 'deep') nextTick(() => renderTrendChart())
})

// 切换"聚焦单轮次"后重新对比
watch(focusIteration, () => {
  if (caseA.value && caseB.value) runComparison()
})

const renderTrendChart = () => {
  const container = trendChartRef.value
  if (!container) return
  if (trendChartInstance) { trendChartInstance.dispose(); trendChartInstance = null }
  const trend = (analysis.value?.trend || []).find(t => t.key === trendMetricKey.value)
  if (!trend) return
  trendChartInstance = echarts.init(container)

  const ptsA = trend.series_a || []
  const ptsB = trend.series_b || []
  const xs = Array.from(new Set([...ptsA, ...ptsB].map(p => p.iteration))).sort((x, y) => x - y)
  const pick = (pts) => {
    const map = new Map(pts.map(p => [p.iteration, p.value]))
    return xs.map(x => (map.has(x) ? map.get(x) : null))
  }
  const isRate = trend.kind === 'rate'
  const axisLabel = isRate ? { formatter: (v) => `${(v * 100).toFixed(0)}%` } : {}

  trendChartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => (v == null ? '--' : isRate ? `${(v * 100).toFixed(2)}%` : Number(v).toFixed(2))
    },
    legend: { data: ['实验 A', '实验 B'], bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
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
    series: [
      {
        name: '实验 A', type: 'line', data: pick(ptsA), smooth: true,
        symbol: 'circle', symbolSize: 7, connectNulls: false,
        lineStyle: { color: '#3b82f6', width: 2.5 }, itemStyle: { color: '#3b82f6' },
        areaStyle: { color: 'rgba(59,130,246,0.10)' }
      },
      {
        name: '实验 B', type: 'line', data: pick(ptsB), smooth: true,
        symbol: 'diamond', symbolSize: 7, connectNulls: false,
        lineStyle: { color: '#22c55e', width: 2.5 }, itemStyle: { color: '#22c55e' },
        areaStyle: { color: 'rgba(34,197,94,0.10)' }
      }
    ]
  })
}

const disposeTrendChart = () => {
  if (trendChartInstance) { trendChartInstance.dispose(); trendChartInstance = null }
}

// ---- 反事实干预推断 ----
const cfTarget = ref('A')
const cfTargetCase = computed(() => (cfTarget.value === 'B' ? caseB.value : caseA.value))

const runCounterfactual = async () => {
  const target = cfTargetCase.value
  if (!target) { ElMessage.warning('请先选择要干预的案例'); return }
  cfLoading.value = true
  cfError.value = ''
  cfResult.value = null
  try {
    const res = await postObserveCounterfactual(target.experimentId || target.id, {
      iteration: target.iteration ?? null,
      variable: cfForm.variable,
      change: cfForm.change
    })
    const data = unwrapApiData(res)
    if (!data) { cfError.value = '后端未返回推断结果'; return }
    cfResult.value = data
  } catch (e) {
    console.warn('反事实推断失败:', e)
    cfError.value = '反事实推断接口不可用，请确认后端已启动'
  } finally {
    cfLoading.value = false
  }
}

const cfMethodTag = computed(() => {
  const m = cfResult.value?.analysis_method
  if (m === 'backend_simulation') return { type: 'success', text: '后端仿真（实跑）' }
  if (m === 'data_driven') return { type: 'warning', text: '数据驱动回归' }
  if (m === 'heuristic') return { type: 'info', text: '启发式规则' }
  return { type: 'info', text: '--' }
})

// 只有后端仿真层级会返回基准值与干预后的实际值
const cfHasNumericValues = computed(() =>
  (cfResult.value?.predictions || []).some(p => p.current_value != null && p.predicted_value != null))

const runComparison = async () => {
  const a = caseA.value
  const b = caseB.value
  if (!a || !b) return
  analysisLoading.value = true
  analysisError.value = ''
  cfResult.value = null
  cfError.value = ''
  try {
    // 传纯实验ID；默认对比报告全部轮次（每侧样本 = 轮次数），开启聚焦后才锁定到该案例所属轮次
    const iterA = focusIteration.value ? (a.iteration ?? null) : null
    const iterB = focusIteration.value ? (b.iteration ?? null) : null
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
// 如果当前在概率分布 tab，自动加载分布数据
if (activeTab.value === 'distribution') {
  loadDistributionData()
}

// ---- 本地对比逻辑（后端不可用时的 fallback） ----
const parseNumeric = (val) => {
  const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''))
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
    { dimension: '铀需求强度', value_a: caseA.value.demandLevel, value_b: caseB.value.demandLevel },
    { dimension: '铀矿产能方案', value_a: caseA.value.capacityPlan, value_b: caseB.value.capacityPlan },
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
    recommendation = `推荐采用实验 B「${caseB.value.name}」的策略。该方案在铀矿产能配置和供应安全方面均优于实验 A，完成率高出 ${(bComp - aComp).toFixed(1)}pp，且网络韧性更强。`
  } else if (aComp > bComp && aRes > bRes) {
    recommendation = `实验 A「${caseA.value.name}」在当前对比中表现更优，建议以该方案为基准进行后续反事实实验验证。`
  } else if (similar >= 75) {
    recommendation = `两个实验在铀供应链指标上高度相似（相似度 ${similar}%），产能方案和需求配置接近。如需区分优劣，建议在反事实实验中进一步调整铀矿产能和新矿投产阈值等关键参数。`
  } else {
    recommendation = `两个实验存在显著差异（相似度 ${similar}%），实验 B 在供应完成率上表现更优，但需关注其网络韧性和协作次数是否可持续。建议结合 NEA Red Book 中长期预测选择最适合的铀矿产能规划路径。`
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
  if (Array.isArray(r) && r.length >= 2) return `${Number(r[0]).toFixed(0)}-${Number(r[1]).toFixed(0)} tU/年`
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
const findBestIteration = (arr = []) => {
  if (!Array.isArray(arr) || !arr.length) return null
  return arr.reduce((b, i) => (toNumber(i?.feedback?.overall_score, -1) > toNumber(b?.feedback?.overall_score, -1) ? i : b), arr[0])
}
const buildEventNodes = (iteration = {}) => {
  const m = iteration.simulation_result?.metrics || {}
  const p = iteration.task?.parameters || {}
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
const experimentRelevanceScore = (item = {}) => {
  const goal = String(item.goal || '')
  let score = 0
  if (/铀|供应链|产能|矿山|核电|uranium/i.test(goal)) score += 1000
  score += Number(item.iterations || 0) * 10
  score += new Date(item.timestamp || 0).getTime() / 1000000000000
  return score
}

const buildLocalCases = async () => {
  try {
    const experimentsPayload = await getExperiments()
    const experiments = (unwrapApiData(experimentsPayload) || [])
      .filter(item => item && item.status === 'completed')
      .sort((a, b) => experimentRelevanceScore(b) - experimentRelevanceScore(a))
    if (!experiments.length) return

    // 加载所有已完成实验（不再限制 4 个）
    const details = []
    for (const experiment of experiments) {
      try {
        const detailPayload = await getExperimentDetail(experiment.experiment_id)
        details.push({ meta: experiment, detail: unwrapApiData(detailPayload) })
      } catch { /* skip failed loads */ }
    }
    if (!details.length) return

    // 事中案例：每个实验取最佳迭代
    const duringCases = details
      .map(({ meta, detail }, idx) => {
        const best = findBestIteration(detail?.iterations || [])
        return best ? buildCaseFromIteration(best, meta, idx, 'Exp') : null
      })
      .filter(Boolean)

    // 反事实案例：从所有实验的所有迭代中收集（不再只取最新实验）
    const rawCfCases = []
    details.forEach(({ meta, detail }) => {
      const iters = detail?.iterations || []
      iters.forEach((iter) => {
        const cf = buildCaseFromIteration(iter, meta, 0, 'CF')
        if (cf) rawCfCases.push({ cf, meta, iter })
      })
    })

    // ---- 去重：仅剔除已在事中库展示过的同一（实验, 轮次），其余迭代全部保留 ----
    // 此前按 experiment_id 整实验剔除，而事中库覆盖了全部实验，导致反事实库被清空、
    // 只能落到 buildStaticCases('CF') 的 2 条静态兜底。这里改为按 (experiment_id, 轮次) 精确去重。
    const duringKeys = new Set(duringCases.map((c) => {
      const m = c.id?.match(/^exp-(.+?)-(\d+)$/)
      return m ? `${m[1]}:${m[2]}` : null
    }).filter(Boolean))
    const cfDeduped = rawCfCases.filter(({ cf }) => {
      const m = cf.id?.match(/^cf-(.+?)-(\d+)$/)
      return m ? !duringKeys.has(`${m[1]}:${m[2]}`) : true
    })

    // 重新连续编号 + 按韧性排序，最多保留 30 个
    let counterfactualCases = cfDeduped
      .map(({ meta, iter }, idx) => buildCaseFromIteration(iter, meta, idx, 'CF'))
      .sort((a, b) => Number(b.resilience || 0) - Number(a.resilience || 0))
      .slice(0, 30)

    // ---- 事中案例内部去重（同 experiment_id 只保留最佳） ----
    const seenDuring = new Set()
    const dedupedDuring = []
    duringCases.forEach(c => {
      const m = c.id?.match(/^exp-(.+?)-\d+$/); const key = m ? m[1] : c.id
      if (!seenDuring.has(key)) { seenDuring.add(key); dedupedDuring.push(c) }
    })

    if (dedupedDuring.length) {
      caseFolders[0].children = dedupedDuring
      caseAId.value = dedupedDuring[0].id
    }
    if (counterfactualCases.length) {
      caseFolders[1].children = counterfactualCases
      caseBId.value = counterfactualCases[0]?.id || null
      if (caseBId.value && caseAId.value) runComparison()
    }
    // 确保两个库都有数据
    if (!caseFolders[0].children.length) caseFolders[0].children = buildStaticCases('Exp')
    if (!caseFolders[1].children.length) caseFolders[1].children = buildStaticCases('CF')
  } catch (error) {
    console.warn('[ObserveAnalysis] 后端案例数据加载失败，使用本地静态数据:', error)
    caseFolders[0].children = buildStaticCases('Exp')
    caseFolders[1].children = buildStaticCases('CF')
  }
}

const buildStaticCases = (prefix) => {
  if (prefix === 'Exp') return [
    { id: 'exp-uranium-baseline', name: 'Exp01', completed: true, completionRate: '68.4%', method: 'MA仿真', backlogRate: '31.6%', collaboration: '18 次', resilience: '0.42', demandLevel: '需求 1.25x', capacityPlan: '基线区间', intervention: '不干预', eventNodes: defaultEventNodes },
    { id: 'exp-uranium-expand', name: 'Exp02', completed: true, completionRate: '83.1%', method: 'MA仿真', backlogRate: '16.9%', collaboration: '31 次', resilience: '0.71', demandLevel: '需求 1.25x', capacityPlan: '阶梯扩产', intervention: '产能 +30%', eventNodes: defaultEventNodes },
    { id: 'exp-uranium-threshold', name: 'Exp03', completed: false, completionRate: '--', method: 'MA仿真', backlogRate: '--', collaboration: '--', resilience: '--', demandLevel: '需求 1.40x', capacityPlan: '计划矿山', intervention: '阈值 -50%', eventNodes: defaultEventNodes }
  ]
  return [
    { id: 'cf-uranium-cap15', name: 'CF01', completed: true, completionRate: '86.8%', method: '反事实', backlogRate: '13.2%', collaboration: '36 次', resilience: '0.78', demandLevel: '需求 1.25x', capacityPlan: '阶梯扩产', intervention: '产能 +15%', eventNodes: defaultEventNodes },
    { id: 'cf-uranium-threshold-half', name: 'CF02', completed: false, completionRate: '--', method: '反事实', backlogRate: '--', collaboration: '--', resilience: '--', demandLevel: '需求 1.10x', capacityPlan: '保持基线', intervention: '阈值 -50%', eventNodes: defaultEventNodes }
  ]
}

const loadAllCases = async () => {
  loading.value = true
  try {
    // 直接使用 buildLocalCases：从所有已完成实验的迭代中构建事中/反事实分类
    // getCaseLibrary API 按极端/正常分类，不适用于事中/反事实的展示需求
    await buildLocalCases()
    ElMessage.success(`铀供应链实验库已加载，共 ${totalCaseCount.value} 个实验`)
  } catch {
    caseFolders[0].children = buildStaticCases('Exp')
    caseFolders[1].children = buildStaticCases('CF')
  } finally {
    loading.value = false
  }
}

// ---- 导出报告 ----
const escapeHtml = (v) => String(v ?? '--').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const buildReportHtml = () => {
  const rows = [...buildBasicComparison(), ...buildMetricsComparison()]
  const tbody = rows.map(r => `<tr><th>${escapeHtml(r.dimension || r.metric)}</th><td>${escapeHtml(r.value_a)}</td><td>${escapeHtml(r.value_b)}</td>${r.diff ? `<td>${escapeHtml(r.diff)}</td>` : ''}</tr>`).join('')
  const events = (caseA.value?.eventNodes || defaultEventNodes).map(e => `<li><strong>${escapeHtml(e.title)}</strong><span>第 ${e.step} 轮</span><p>${escapeHtml(e.desc)}</p></li>`).join('')
  const statsRows = metricRows.value.map(r => `<tr><th>${escapeHtml(r.label)}</th><td>${escapeHtml(r.value_a_text)}</td><td>${escapeHtml(r.value_b_text)}</td><td>${escapeHtml(r.delta_text)}</td><td>${escapeHtml(formatPValue(r.p_value))}</td><td>${escapeHtml(r.cohens_d != null ? Number(r.cohens_d).toFixed(2) : '--')}</td><td>${escapeHtml(r.verdict)}</td></tr>`).join('')
  const statsBlock = statsRows
    ? `<h2>统计显著性检验（Welch t 检验）</h2><table><thead><tr><th>指标</th><th>实验 A</th><th>实验 B</th><th>差异</th><th>p 值</th><th>Cohen's d</th><th>结论</th></tr></thead><tbody>${statsRows}</tbody></table>`
    : ''
  const attrBlock = attributionItems.value.length
    ? `<h2>差异归因</h2><ul>${attributionItems.value.map(i => `<li>${escapeHtml(i.label)}：贡献度 ${i.contribution}%（${escapeHtml(i.delta_text)}${i.significant ? '，显著' : ''}）</li>`).join('')}</ul>`
    : ''
  const provBlock = provenance.value
    ? `<h2>数据溯源</h2><ul><li>实验 A：${escapeHtml(provenance.value.case_a?.report)}（${provenance.value.case_a?.total_iterations} 轮，聚焦第 ${escapeHtml(String(provenance.value.case_a?.focus_iteration ?? '全部'))} 轮）</li><li>实验 B：${escapeHtml(provenance.value.case_b?.report)}（${provenance.value.case_b?.total_iterations} 轮，聚焦第 ${escapeHtml(String(provenance.value.case_b?.focus_iteration ?? '全部'))} 轮）</li><li>指标来源：${escapeHtml(provenance.value.metric_source)}</li></ul>`
    : ''

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>铀供应链观察分析对比报告</title>
<style>body{margin:0;padding:28px;color:#0f172a;font-family:"Microsoft YaHei",Arial,sans-serif;line-height:1.6;background:#f8fafc}
main{max-width:980px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:28px}
h1{margin:0 0 8px;font-size:26px}.meta{color:#64748b;margin-bottom:22px}
table{width:100%;border-collapse:collapse;margin:18px 0 24px}th,td{border:1px solid #e2e8f0;padding:10px 12px;text-align:left}
th{width:180px;background:#f1f5f9}thead th{background:#dbeafe;color:#1e40af}
h2{margin:24px 0 10px;font-size:18px}li{margin-bottom:12px}li span{display:inline-block;margin-left:10px;color:#64748b;font-size:13px}li p{margin:4px 0 0;color:#334155}</style></head>
<body><main><h1>铀供应链观察分析对比报告</h1><div class="meta">生成时间：${new Date().toLocaleString()}<br>实验 A: ${escapeHtml(caseA.value?.name||'--')}<br>实验 B: ${escapeHtml(caseB.value?.name||'--')}</div>
<h2>实验对比</h2><table><thead><tr><th>对比项</th><th>实验 A</th><th>实验 B</th><th>差异</th></tr></thead><tbody>${tbody}</tbody></table>
${statsBlock}
${attrBlock}
${provBlock}
<h2>综合结论</h2><p>${escapeHtml(conclusionText.value)}</p></main></body></html>`
}

const exportComparisonReport = (format) => {
  if (!caseA.value || !caseB.value) { ElMessage.warning('请先选择两个对比案例'); return }
  const safeName = '铀供应链_观察分析对比报告'
  if (format === 'txt') {
    const lines = ['铀供应链观察分析对比报告', `生成时间：${new Date().toLocaleString()}`, '', '一、案例对比', ...[...buildBasicComparison(), ...buildMetricsComparison()].map(r => `${r.dimension||r.metric}：A=${r.value_a}；B=${r.value_b}${r.diff?'（差异：'+r.diff+'）':''}`), '', '二、综合推荐', generateLocalRecommendation()]
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

onMounted(() => { loadAllCases() })
onBeforeUnmount(() => { disposeDistChart(); disposeMetricsLineChart(); disposeTrendChart() })
</script>

<style scoped>
.post-observe-page {
  height: 100%; min-height: 0; box-sizing: border-box; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 10px;
  background: #f6f8fb; color: #0f172a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  overflow-y: auto;
}
.page-head {
  flex: 0 0 auto; display: flex; justify-content: space-between; gap: 24px; align-items: center;
  padding: 18px 28px; border: none; border-radius: 14px; margin-bottom: 14px;
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 40%, #3b82f6 70%, #60a5fa 100%);
  box-shadow: 0 8px 32px rgba(37, 99, 235, 0.28), 0 2px 8px rgba(30, 58, 138, 0.15);
  position: relative; overflow: hidden;
}
.page-head::before { content: ''; position: absolute; top: -50%; right: -10%; width: 300px; height: 300px; border-radius: 50%; background: rgba(255,255,255,0.06); pointer-events: none; }
.page-head::after { content: ''; position: absolute; bottom: -60%; left: 5%; width: 220px; height: 220px; border-radius: 50%; background: rgba(255,255,255,0.04); pointer-events: none; }
.page-head > div:first-child { position: relative; z-index: 1; }
.page-head h1 { margin: 0; font-size: 24px; line-height: 1.2; font-weight: 900; color: #fff; letter-spacing: 1px; }
.subtitle { margin: 6px 0 0; color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 500; }
.head-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; position: relative; z-index: 1; }
.stat-item { min-width: 80px; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(255,255,255,0.12); }
.stat-item span { display: block; color: rgba(255,255,255,0.7); font-size: 10px; font-weight: 800; }
.stat-item strong { display: block; margin-top: 2px; color: #fff; font-size: 18px; line-height: 1.1; }

.observe-layout { flex: 0 0 auto; display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: 10px; min-height: 520px; height: calc(100vh - 260px); align-items: stretch; }

.observe-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 6px 16px rgba(15,23,42,0.06); overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
.panel-head-bar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; font-size: 13px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #eef2f7; flex-shrink: 0; }
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
.compare-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #94a3b8; gap: 6px; padding: 20px; }
.compare-empty .el-icon { color: #e2e8f0; }
.compare-empty p { margin: 0; font-size: 15px; font-weight: 700; color: #64748b; }
.compare-empty span { font-size: 12px; font-weight: 600; max-width: 350px; line-height: 1.6; }

.compare-content { display: flex; flex-direction: column; gap: 12px; }
.card-pair-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.cmp-card { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
.cmp-card--large { flex: 1 1 auto; min-height: 0; }
.cmp-card-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #eef2f7; background: #fafbfc; position: relative; }
.cmp-card-pip { width: 10px; height: 10px; border-radius: 3px; margin-left: auto; }
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
.cmp-kv-value { font-size: 12px; font-weight: 800; color: #0f172a; }

.cmp-card--conclusion { border-top: 3px solid #6366f1; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 8px; }
.cmp-card--conclusion .cmp-card-head { background: linear-gradient(180deg, #eef2ff, #fafbfc); border-bottom: 1px solid #eef2f7; padding: 8px 12px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px; color: #4338ca; }
.cmp-card--conclusion .cmp-card-body { padding: 10px 14px; background: #fafafe; }
.conclusion-text { margin: 0; font-size: 13px; line-height: 1.7; color: #334155; font-weight: 600; }

.cmp-card--chart { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
.cmp-card--chart .cmp-card-head { background: linear-gradient(180deg, #f0fdf4, #fafbfc); border-bottom: 1px solid #eef2f7; padding: 8px 12px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px; color: #059669; }
.cmp-card--chart .cmp-card-body { padding: 8px; background: #fff; }
.metrics-line-chart { width: 100%; height: 280px; }

.compare-section { margin-bottom: 4px; }
.compare-section h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 15px; font-weight: 900; color: #0f172a; }
.val-a { color: #3867f2; font-weight: 700; } .val-b { color: #22c55e; font-weight: 700; }
.similarity-card { padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fafbfc; }
.similarity-main { display: flex; justify-content: center; margin-bottom: 12px; }
.similarity-score { display: flex; align-items: center; gap: 12px; }
.score-number { font-size: 32px; font-weight: 900; color: #d97706; }
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
.dimension-selector { display: flex; flex-direction: column; gap: 6px; padding: 4px 0; margin-bottom: 4px; }
.dim-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 4px 8px; border-radius: 6px; background: #f8fafc; border: 1px solid #eef2f7; user-select: none; transition: background 0.15s; }
.dim-toggle:hover { background: #f1f5f9; }
.dim-selector-label { font-size: 12px; font-weight: 800; color: #64748b; white-space: nowrap; }
.dim-hint { font-size: 11px; color: #94a3b8; font-weight: 600; }
.dim-checkboxes { padding: 4px 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.cmp-empty-hint { text-align: center; color: #cbd5e1; font-size: 12px; padding: 12px 0; }

.distribution-chart-container { width: 100%; height: 470px; margin: 8px 0; border: 1px solid #e2e8f0; border-radius: 10px; background: #fafbfc; }

.distribution-summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
.dist-summary-card { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
.dist-summary-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
.dist-summary-label { font-size: 12px; font-weight: 800; color: #1e293b; }
.dist-summary-unit { font-size: 11px; color: #94a3b8; }
.dist-summary-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; font-weight: 700; color: #0f172a; }
.dist-tag-a { padding: 1px 6px; border-radius: 4px; background: #dbeafe; color: #1d4ed8; font-size: 10px; font-weight: 900; }
.dist-tag-b { padding: 1px 6px; border-radius: 4px; background: #dcfce7; color: #15803d; font-size: 10px; font-weight: 900; }
.dist-range { font-size: 11px; color: #94a3b8; margin-left: auto; }
.compare-empty-inline { display: flex; justify-content: center; padding: 40px; color: #94a3b8; font-size: 13px; font-weight: 600; }

/* ---- 跨库相似度矩阵 ---- */
.cross-library-section { flex: 0 0 auto; margin-top: 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; box-shadow: 0 6px 16px rgba(15,23,42,0.04); overflow: hidden; max-height: 340px; }
.cross-library-section .el-table { font-size: 12px; }
.cross-library-head { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-bottom: 1px solid #eef2f7; background: linear-gradient(180deg, #f0fdf4, #ffffff); font-size: 14px; font-weight: 800; color: #065f46; }
.cross-library-head .el-icon { color: #10b981; }
.cross-library-sub { margin-left: auto; font-size: 11px; font-weight: 600; color: #94a3b8; }
.cross-library-body { padding: 8px; overflow-x: auto; display: flex; flex-direction: column; gap: 8px; }
.matrix-summary { padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; }
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

.provenance-bar { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.prov-item { display: flex; gap: 10px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fafbfc; }
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
.attribution-list { display: flex; flex-direction: column; gap: 8px; }
.attr-row { display: grid; grid-template-columns: 140px 1fr 110px 56px; align-items: center; gap: 12px; }
.attr-label { font-size: 12px; font-weight: 700; color: #334155; text-align: right; }
.attr-delta { font-size: 12px; font-weight: 800; text-align: right; }

.trend-select { margin-left: auto; width: 170px; }
.trend-chart { width: 100%; height: 300px; }

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

@media (max-width: 1100px) {
  .observe-layout { grid-template-columns: 1fr; }
  .card-pair-row { grid-template-columns: 1fr; }
  .provenance-bar, .attr-row { grid-template-columns: 1fr; }
  .attr-label, .attr-delta { text-align: left; }
}
</style>
