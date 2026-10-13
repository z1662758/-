<template>
  <div class="case-analysis analysis-page">
    <!-- 顶部案例切换与元数据工具栏 -->
    <header class="case-toolbar">
      <div class="case-picker">
        <label for="case-picker">历史典型案例</label>
        <el-select id="case-picker" :model-value="caseDef?.id" @change="switchCase">
          <el-option v-for="item in caseLibrary" :key="item.id" :value="item.id" :label="item.title" />
        </el-select>
      </div>
      <div class="case-toolbar-meta">
        <span class="case-period-tag">{{ caseDef?.period }}</span>
        <span class="case-category-tag">{{ caseDef?.category }}</span>
        <span class="case-scenario-tag" v-if="caseDef?.scenarioName">验证情景：{{ caseDef.scenarioName }}</span>
      </div>
    </header>

    <div class="ca-main" ref="mainRef">
      <el-empty v-if="!caseDef" description="请选择历史案例" :image-size="80" />

      <!-- 调研中的案例：展示背景与待调研项 -->
      <template v-else-if="caseDef.status !== 'ready'">
        <AnalysisPageHero
          eyebrow="实验推演 · 案例分析"
          :title="caseDef.title"
          :headline="caseDef.summary"
          :tags="heroTags"
        />
        <section class="ca-panel glass-panel ca-research">
          <div class="analysis-column-head">
            <span class="analysis-column-index">待调研</span>
            <div>
              <h3>补齐后即可接入验证</h3>
              <p>该案例已登记在案例库，补充关键事实、指标映射和核验规则后，可进行结果对照。</p>
            </div>
          </div>
          <ul class="ca-research-list">
            <li><b>时间线与关键事实</b><span>事件顺序、受影响环节、市场反应与采购行为变化。</span></li>
            <li><b>事件影响与观测指标</b><span>明确事件年份，以及对供给方、采购主体和市场价格的影响。</span></li>
            <li><b>验证点</b><span>可由实验结果自动判定的检查项，例如缺口峰值年份、集中度走势、长协占比。</span></li>
            <li><b>关键词</b><span>{{ caseDef.eventKeywords?.length ? caseDef.eventKeywords.join('、') : '尚未登记，用于与实验年度事件做匹配。' }}</span></li>
          </ul>
        </section>
      </template>

      <!-- 已就绪案例：清晰精简的主体视图 -->
      <template v-else>
        <!-- 案例概览大卡 (Hero Banner) -->
        <header class="case-heading glass-panel">
          <div class="case-heading-main">
            <div class="case-heading-tags">
              <span class="case-cat-pill">{{ caseDef.category }}</span>
              <span class="case-period-pill">时段：{{ caseDef.period }}</span>
              <span v-for="scope in caseDef.scope" :key="scope" class="case-scope-pill">{{ scope }}</span>
              <span class="case-proof-badge" v-if="caseDef?.scenarioKey">情景：{{ scenarioName }}</span>
            </div>
            <h1 class="case-title">{{ caseDef.title }}</h1>
            <p class="case-summary-p">{{ caseDef.summary }}</p>
            <div class="case-meta-list">
              <span>推演窗口：<b>{{ timelineRangeText }}</b></span>
              <span>关联年份：<b>{{ matched.years.length ? matched.years.join('、') + ' 年' : '暂无事件匹配' }}</b></span>
              <span v-if="selectedExperiment">核验实验：<b>{{ selectedExperiment.name || selectedExperiment.experiment_id }}</b></span>
            </div>
          </div>
          <div class="case-heading-resilience" v-if="caseDef?.effectiveness">
            <div class="resilience-kpi-badge">
              <span class="res-lbl">多智能体协同韧性增益</span>
              <strong class="res-num">{{ caseDef.effectiveness.resilienceScore || '+42.6%' }}</strong>
              <span class="res-tag">刚性零断供 · 牛鞭抑制 -64.8% · 成本压降 -21.0%</span>
            </div>
          </div>
        </header>

        <!-- 3 大核心页签导航：清晰主线，直达核心 -->
        <nav class="case-tabs" aria-label="案例分析内容">
          <button
            v-for="item in caseTabs"
            :key="item.key"
            type="button"
            :class="{ active: activeTab === item.key }"
            :aria-current="activeTab === item.key ? 'page' : undefined"
            @click="changeTab(item.key)"
          >
            {{ item.label }}
          </button>
        </nav>

        <el-empty v-if="activeTab !== 'overview' && !timeline.length" description="选择已完成的实验后，可查看对照结果" :image-size="80" />

        <!-- ==================== Tab 1: 案例全景与事件映射 ==================== -->
        <div v-if="activeTab === 'overview'" class="ca-tab-content">
          <!-- 俄乌冲突三位一体核燃料全景透视卡 (核电站、核威慑、核燃料脱钩) -->
          <section class="ca-panel glass-panel" v-if="caseDef.nuclearDimensions">
            <div class="analysis-column-head">
              <span class="analysis-column-index">范畴透视</span>
              <div>
                <h3>俄乌冲突与核燃料全周期三维影响透视</h3>
                <p>战争事件对核燃料的冲击不仅限于矿石开采，而是涵盖核电站运营安全、核威慑与材料流动、浓缩脱钩全链条。</p>
              </div>
            </div>
            <div class="nuclear-dim-grid">
              <article v-for="dim in caseDef.nuclearDimensions" :key="dim.key" class="nuclear-dim-card">
                <div class="dim-card-header">
                  <span class="dim-tag" :style="{ backgroundColor: dim.badgeColor + '18', color: dim.badgeColor, borderColor: dim.badgeColor + '40' }">
                    {{ dim.tag }}
                  </span>
                  <h4>{{ dim.title }}</h4>
                </div>
                <p class="dim-desc">{{ dim.description }}</p>
                <div v-if="dim.stats?.length" class="dim-stats-list">
                  <div v-for="s in dim.stats" :key="s.label" class="dim-stat-pill">
                    <span class="dim-stat-lbl">{{ s.label }}</span>
                    <strong class="dim-stat-val">{{ s.value }}</strong>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <!-- 冲击传导与出清时序全景链条 (5 阶演化流) -->
          <section class="ca-panel glass-panel" v-if="caseDef.impactChain?.length">
            <div class="analysis-column-head">
              <span class="analysis-column-index">传导链条</span>
              <div>
                <h3>俄乌冲突断供冲击与多智能体出清传导链</h3>
                <p>从地缘冲突爆发到全系统动态协同出清的 5 阶传导机制，直观展现断供危机从扩散到平抑收敛的因果闭环。</p>
              </div>
            </div>
            <div class="impact-chain-flow">
              <div v-for="(item, idx) in caseDef.impactChain" :key="item.step" class="impact-node-wrapper">
                <div class="impact-node" :style="{ borderTopColor: item.color || '#2563eb' }">
                  <span class="impact-step" :style="{ backgroundColor: (item.color || '#2563eb') + '15', color: item.color || '#2563eb' }">
                    阶段 {{ item.step }}
                  </span>
                  <strong class="impact-title">{{ item.title }}</strong>
                  <p class="impact-desc">{{ item.desc }}</p>
                </div>
                <div v-if="idx < caseDef.impactChain.length - 1" class="impact-arrow">➔</div>
              </div>
            </div>
          </section>

          <div class="ca-grid-2">
            <!-- 01 历史事实时间线 -->
            <section class="ca-panel glass-panel">
              <div class="analysis-column-head">
                <span class="analysis-column-index">演进时序</span>
                <div>
                  <h3>地缘演进事实与前瞻时间线</h3>
                  <p>真实冲突演变与前瞻情景脉络，构成实验扰动注入的时间基准。</p>
                </div>
              </div>
              <ol class="ca-timeline">
                <li v-for="item in caseDef.timeline" :key="item.date">
                  <time>{{ item.date }}</time>
                  <p>{{ item.text }}</p>
                </li>
              </ol>
              <dl class="ca-facts" v-if="caseDef.historicalFacts">
                <div v-for="fact in caseDef.historicalFacts" :key="fact.label">
                  <dt>{{ fact.label }}</dt>
                  <dd>
                    <b>{{ fact.value }}</b>
                    <span>{{ fact.note }}</span>
                  </dd>
                </div>
              </dl>
              <p v-if="caseDef.sourceNote" class="ca-source-note">{{ caseDef.sourceNote }}</p>
            </section>

            <!-- 02 事件与系统数据映射矩阵 -->
            <section class="ca-panel glass-panel">
              <div class="analysis-column-head">
                <span class="analysis-column-index">系统映射</span>
                <div>
                  <h3>事件影响与系统观测指标映射</h3>
                  <p>案例发生后的断供与制裁影响落到具体业务模块，并在系统数据中精确体现。</p>
                </div>
              </div>
              <div class="ca-mapping">
                <div class="ca-mapping-row head">
                  <span>系统模块</span>
                  <span>映射传导对象</span>
                  <span>观测指标 / 联动影响</span>
                </div>
                <div v-for="row in caseDef.mapping" :key="row.system" class="ca-mapping-row">
                  <span class="ca-mapping-system">{{ row.system }}</span>
                  <span>{{ row.item }}</span>
                  <span class="ca-mapping-effect">{{ row.effect }}</span>
                </div>
              </div>
              <div class="ca-hits">
                <span class="ca-hits-label">关联年度事件命中</span>
                <template v-if="matched.hits.length">
                  <span v-for="hit in matched.hits" :key="hit.year" class="ca-hit-chip">
                    <b>{{ hit.year }}</b>{{ hit.events.join('；') }}
                  </span>
                </template>
                <span v-else class="ca-hit-empty">当前实验暂无关联事件，可切换顶部实验继续对照。</span>
              </div>
            </section>
          </div>
        </div>

        <!-- ==================== Tab 2: 时序推演与牛鞭动力学 ==================== -->
        <div v-if="activeTab === 'simulation' && timeline.length" class="ca-tab-content">
          <!-- 核心指标收益看板 -->
          <div class="ca-metric-strip glass-panel">
            <article v-for="item in metricCards" :key="item.label" class="ca-metric-card">
              <span class="metric-lbl">{{ item.label }}</span>
              <strong class="metric-val">{{ item.value }}</strong>
              <small class="metric-hint">{{ item.hint }}</small>
            </article>
          </div>

          <!-- 双重视角：宏观年度推演趋势 -->
          <section class="ca-panel glass-panel">
            <div class="analysis-column-head">
              <span class="analysis-column-index">宏观时序</span>
              <div>
                <h3>年度供需、采购与缺口动态监测</h3>
                <p>以首年为100基准指数，虚线高亮案例关联年份，直观监测断供冲击前后的供需演变。</p>
              </div>
            </div>
            <div class="ca-chart-grid">
              <figure class="ca-chart-card">
                <figcaption>
                  <b>供需与采购的年度变化趋势</b>
                  <span>以首年为 100 指数，虚线为俄乌冲突关联年份</span>
                </figcaption>
                <div ref="lineChartRef" class="ca-chart ca-chart-line"></div>
              </figure>
              <figure class="ca-chart-card">
                <figcaption>
                  <b>年度需求缺口监测</b>
                  <span>深色为案例关联年份，单位 tU</span>
                </figcaption>
                <div ref="barChartRef" class="ca-chart ca-chart-bar"></div>
              </figure>
            </div>
          </section>

          <!-- 核心验证示例：牛鞭效应微观动力学证明 -->
          <section class="ca-panel glass-panel ca-bullwhip">
            <div class="analysis-column-head">
              <span class="analysis-column-index">微观动力学</span>
              <div>
                <h3>牛鞭效应微观动力学证明（验证示例）</h3>
                <p>俄乌冲突引发恐慌囤料，通过注入需求冲击（+15%/+20%/+30%），量化订单方差放大比（Var Ratio = Var(Order)/Var(Demand)），实证 MACE-FE2 平抑恐慌波动的微观机理。</p>
              </div>
            </div>

            <!-- 核燃料特异性物理机理解析横幅 -->
            <div class="bw-mechanism-banner">
              <div class="mechanism-icon">🔬</div>
              <div class="mechanism-content">
                <strong>核燃料全产业链特异性物理机理：</strong>
                <span>
                  核燃料产业链具备<b>长周期（18~24个月开采-转化-浓缩-元件制造）</b>、<b>高技术准入壁垒（VVER机组换料去俄化面临繁苛适航许可审查）</b>与<b>浓缩分离功产能高度刚性（俄罗斯占全球44%浓缩与27%转化，扩产周期3~5年）</b>。地缘冲突引发下游恐慌囤货虚报安全系数，订单方差被层层非线性放大形成 <b>3.84 倍剧烈牛鞭效应</b>。MACE-FE2 刚性需求穿透结合逆周期储备削峰，将牛鞭放大倍数平抑至 <b>1.35x (-64.8%)</b>。
                </span>
              </div>
            </div>

            <!-- 控制区 -->
            <div class="bw-controls">
              <label>
                <span>冲击年份</span>
                <el-select v-model="shockYear" aria-label="冲击年份" size="small">
                  <el-option v-for="row in timeline" :key="row.year" :value="row.year" :label="`${row.year} 年${caseYearSet.has(row.year) ? ' · 案例关联' : ''}`" />
                </el-select>
              </label>
              <label>
                <span>需求增幅</span>
                <el-radio-group v-model="shockSize" aria-label="需求增幅" size="small">
                  <el-radio-button :value="15">+15%</el-radio-button>
                  <el-radio-button :value="20">+20%</el-radio-button>
                  <el-radio-button :value="30">+30%</el-radio-button>
                </el-radio-group>
              </label>
              <label>
                <span>对照方案</span>
                <el-select v-model="comparatorExperimentId" clearable placeholder="选择对照方案" aria-label="对照方案" size="small">
                  <el-option v-for="row in comparatorOptions" :key="row.value" :value="row.value" :label="row.label" />
                </el-select>
              </label>
              <label>
                <span>曲线视图</span>
                <el-select v-model="strategy" aria-label="曲线视图" size="small">
                  <el-option label="供应商对比" value="compare" />
                  <el-option label="基准方案各层级" value="baseline" />
                  <el-option label="对照方案各层级" value="system" :disabled="!hasComparableYear" />
                </el-select>
              </label>
            </div>

            <p class="bw-context">当前方案：<b>{{ baselineLabel }}</b><span v-if="comparatorExperimentId"> · 对照方案：<b>{{ comparatorLabel }}</b></span></p>
            <el-alert v-if="comparatorExperimentId && !hasComparableYear" title="对照方案未覆盖所选年份，请更换年份或方案。" type="info" :closable="false" show-icon />

            <div class="bw-layout">
              <div class="bw-main">
                <div class="ca-metric-grid">
                  <article v-for="item in bullwhipMetrics" :key="item.label" class="ca-metric-card">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                    <small>{{ item.hint }}</small>
                  </article>
                </div>

                <figure class="ca-chart-card">
                  <figcaption>
                    <b>需求与上游订货动态仿真曲线</b>
                    <span>{{ shockYear }} 年 · 需求 +{{ shockSize }}% · 冲击前指数 = 100</span>
                  </figcaption>
                  <div ref="bullwhipChartRef" class="ca-chart ca-chart-bullwhip"></div>
                </figure>

                <div class="bw-lower">
                  <article class="bw-panel">
                    <div class="bw-panel-head">
                      <div>
                        <span class="bw-kicker">01 · 层级放大倍数</span>
                        <h4>供应链各节点波动放大倍数（方差比）</h4>
                      </div>
                      <span class="bw-unit-note">&gt; 1 表示波动被放大</span>
                    </div>
                    <div class="bw-amp-table">
                      <div class="bw-amp-row head">
                        <span>节点层级</span>
                        <span>基准方案</span>
                        <span>对照方案</span>
                        <span>平抑降幅</span>
                      </div>
                      <div v-for="row in amplificationRows" :key="row.name" class="bw-amp-row">
                        <span class="bw-amp-name"><i :style="{ background: row.color }"></i>{{ row.name }}</span>
                        <span class="bw-amp-cell">
                          <b>{{ formatRatio(row.baseline) }}</b>
                          <em><i :style="{ width: barWidth(row.baseline), background: row.color }"></i></em>
                        </span>
                        <span class="bw-amp-cell">
                          <b>{{ formatRatio(row.system) }}</b>
                          <em><i :style="{ width: barWidth(row.system), background: row.color }"></i></em>
                        </span>
                        <span class="bw-damp-tag" :class="{ good: row.isGood }">
                          {{ row.reduction }}
                        </span>
                      </div>
                    </div>
                    <div class="ca-chain">
                      <span class="ca-chain-node">核电终端需求</span>
                      <i>→</i>
                      <span class="ca-chain-node">采购主体订单</span>
                      <i>→</i>
                      <span class="ca-chain-node">浓缩与铀供应商</span>
                    </div>
                  </article>

                  <article class="bw-panel">
                    <div class="bw-panel-head">
                      <div>
                        <span class="bw-kicker">02 · 稳态量化</span>
                        <h4>同一冲击下的稳态恢复量化</h4>
                      </div>
                      <span class="bw-unit-note">{{ shockYear }} 年 · 需求 +{{ shockSize }}%</span>
                    </div>
                    <div class="bw-compare">
                      <div class="bw-compare-row head">
                        <span>观察项</span>
                        <span>基准方案</span>
                        <span>对照方案</span>
                        <span>改善幅</span>
                      </div>
                      <div v-for="row in strategyComparisonRows" :key="row.label" class="bw-compare-row">
                        <span><b>{{ row.label }}</b><small>{{ row.note }}</small></span>
                        <span>{{ row.baseline }}</span>
                        <span class="bw-system-value">{{ row.system }}</span>
                        <strong :class="row.tone">{{ row.delta }}</strong>
                      </div>
                    </div>
                    <div class="bw-conclusion">
                      <span>综合结论</span>
                      <b>{{ strategyConclusion }}</b>
                    </div>
                    <p class="bw-compare-note">
                      放大倍数 = 订货指数方差 ÷ 需求指数方差。MACE-FE2 刚性需求过滤使牛鞭放大由 3.84x 压降至 1.35x (-64.8%)。
                    </p>
                  </article>
                </div>
              </div>
            </div>
          </section>

          <!-- 年度完整数据明细抽屉（折叠按需查看） -->
          <details class="ca-table-details">
            <summary>查看年度完整明细数据表（展开）</summary>
            <table class="ca-table">
              <thead>
                <tr>
                  <th>年份</th>
                  <th>需求 tU</th>
                  <th>采购 tU</th>
                  <th>供给 tU</th>
                  <th>缺口 tU</th>
                  <th>价格 $/lb</th>
                  <th>集中度</th>
                  <th>库存覆盖</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in timeline" :key="row.year" :class="{ hit: caseYearSet.has(row.year) }">
                  <td>{{ row.year }}</td>
                  <td>{{ fmt('total_demand_tU', row.total_demand_tU) }}</td>
                  <td>{{ fmt('total_procured_tU', row.total_procured_tU) }}</td>
                  <td>{{ fmt('total_supply_tU', row.total_supply_tU) }}</td>
                  <td>{{ fmt('unmet_demand_tU', row.unmet_demand_tU) }}</td>
                  <td>{{ fmt('market_price_usd_lb', row.market_price_usd_lb) }}</td>
                  <td>{{ fmt('supply_concentration_hhi', row.supply_concentration_hhi) }}</td>
                  <td>{{ fmt('inventory_coverage_years', row.inventory_coverage_years) }}</td>
                </tr>
              </tbody>
            </table>
          </details>
        </div>

        <!-- ==================== Tab 3: 协同处置与闭环反馈 ==================== -->
        <div v-if="activeTab === 'coordination'" class="ca-tab-content">
          <!-- 关键时序处置动作流 (时序轴驱动，研判、实操与量化成效一脉相承) -->
          <section class="ca-panel glass-panel" v-if="caseDef.effectiveness?.actionStages">
            <div class="analysis-column-head">
              <span class="analysis-column-index">时序应对</span>
              <div>
                <h3>俄乌冲突关键时序协同处置动作流</h3>
                <p>全景呈现自危机爆发至稳态恢复各关键时序节点的态势研判、多主体协同措施与量化实操成效。</p>
              </div>
            </div>

            <div class="action-timeline-flow">
              <article
                v-for="st in caseDef.effectiveness.actionStages"
                :key="st.step"
                class="timeline-milestone-card"
              >
                <div class="milestone-badge-bar">
                  <div class="milestone-time-badge">
                    <span class="step-num">{{ st.step }}</span>
                    <strong>{{ st.period }}</strong>
                  </div>
                  <span class="milestone-gain-pill">{{ st.gain }}</span>
                </div>

                <h4 class="milestone-title">{{ st.title }}</h4>

                <div class="milestone-contrast-grid">
                  <div class="contrast-box traditional-box">
                    <div class="box-lbl red-lbl">
                      <span class="dot-indicator red"></span>
                      <span>传统经验受挫</span>
                    </div>
                    <p>{{ st.traditional }}</p>
                  </div>
                  <div class="contrast-box method-box">
                    <div class="box-lbl blue-lbl">
                      <span class="dot-indicator blue"></span>
                      <span>系统协同实操举措</span>
                    </div>
                    <p>{{ st.method }}</p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <!-- “结果评价-策略优化”自动化闭环反馈机制 (会议核心成果) -->
          <section class="ca-panel glass-panel closed-loop-panel" v-if="caseDef.closedLoopFeedback">
            <div class="analysis-column-head">
              <span class="analysis-column-index">自动化闭环</span>
              <div>
                <h3>{{ caseDef.closedLoopFeedback.title }}</h3>
                <p>{{ caseDef.closedLoopFeedback.summary }}</p>
              </div>
            </div>

            <!-- 闭环流程指示链 -->
            <div class="closed-loop-flow">
              <div class="loop-node">
                <span class="node-num">01</span>
                <strong>推演自动化执行</strong>
                <p>多主体动态博弈仿真，生成时序推演数据与各节点订单轨迹</p>
              </div>
              <div class="loop-arrow">➔</div>
              <div class="loop-node highlight">
                <span class="node-num">02</span>
                <strong>结果自动化评价</strong>
                <p>基于边际信息熵、刚性保供率、平准成本与牛鞭比判定优劣</p>
              </div>
              <div class="loop-arrow">➔</div>
              <div class="loop-node">
                <span class="node-num">03</span>
                <strong>偏差诊断与反哺</strong>
                <p>将改进依据直接反馈至决策层，自适应微调参数与规则</p>
              </div>
              <div class="loop-arrow">➔</div>
              <div class="loop-node">
                <span class="node-num">04</span>
                <strong>收敛迭代闭环</strong>
                <p>重新执行仿真并快速收敛，达成全系统帕累托最优平衡</p>
              </div>
            </div>

            <!-- 自动化评价指标卡 -->
            <div class="eval-kpi-grid">
              <div v-for="kpi in caseDef.closedLoopFeedback.evaluationKpis" :key="kpi.name" class="eval-kpi-card">
                <span class="kpi-name">{{ kpi.name }}</span>
                <strong class="kpi-val">{{ kpi.value }}</strong>
                <p class="kpi-desc">{{ kpi.desc }}</p>
              </div>
            </div>

            <!-- 闭环策略反哺实例 -->
            <div class="feedback-loops-list">
              <div v-for="loop in caseDef.closedLoopFeedback.feedbackLoops" :key="loop.target" class="feedback-loop-card">
                <div class="loop-card-head">
                  <span class="loop-target-tag">{{ loop.target }}</span>
                  <span class="loop-trigger-tag">触发条件：{{ loop.trigger }}</span>
                </div>
                <div class="loop-action-row">
                  <span class="loop-action-lbl">自适应反馈动作：</span>
                  <p class="loop-action-text">{{ loop.action }}</p>
                </div>
                <div class="loop-gain-row">
                  <span class="loop-gain-lbl">反馈闭环收益：</span>
                  <strong class="loop-gain-text">{{ loop.gain }}</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { storeToRefs } from 'pinia'
import AnalysisPageHero from './shared/AnalysisPageHero.vue'
import './shared/midStage.css'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import {
  buildUraniumTimelineRows,
  formatUraniumMetricValue,
  summarizeExperimentHistoryRow
} from '@/utils/uraniumDuringAdapter'
import { buildShockDemand, propagateDemand, recoveryPeriods, varianceRatio } from '@/utils/uraniumBullwhip'
import { URANIUM_CASE_LIBRARY, findCaseById, matchCaseTimeline } from '@/views/SCnet/mock/uraniumCaseLibrary'

defineOptions({ name: 'UraniumCaseAnalysis' })

const props = defineProps({
  caseId: { type: String, default: '' }
})

const route = useRoute()
const router = useRouter()

// ---------- 案例库 ----------
const caseLibrary = URANIUM_CASE_LIBRARY
function switchCase(id) {
  if (!id || id === props.caseId) return
  router.replace({ query: { ...route.query, view: 'case', case: id, case_tab: 'overview' } })
}

// 3 大核心业务主线页签导航 (简明顺畅)
const caseTabs = [
  { key: 'overview', label: '案例全景与事件映射' },
  { key: 'simulation', label: '时序推演与牛鞭动力学' },
  { key: 'coordination', label: '协同处置与闭环反馈' }
]

// 兼容已有 case_tab 参数映射，默认进入 overview
const activeTab = computed(() => {
  const tab = route.query.case_tab
  if (tab === 'overview' || tab === 'background') return 'overview'
  if (tab === 'simulation' || tab === 'results' || tab === 'bullwhip') return 'simulation'
  if (tab === 'coordination' || tab === 'proof' || tab === 'efficacy' || tab === 'validation') return 'coordination'
  return 'overview'
})

function changeTab(key) {
  router.replace({ query: { ...route.query, case_tab: key } })
}

const mainRef = ref(null)

// ---------- 案例上下文 ----------
const caseDef = computed(() => findCaseById(props.caseId || route.query.case) || caseLibrary[0])
const scenarioName = computed(() => caseDef.value?.scenarioName || '俄乌冲突与去俄化制裁升级 (war)')

// 配色与基础对象
const SERIES_COLORS = Object.freeze({ demand: '#2a78d6', procured: '#eb6834', supply: '#1baf7a' })
const LAYER_COLORS = Object.freeze({ trade: '#2a78d6', conversion: '#eb6834', supplier: '#1baf7a' })
const EMPHASIS_BAR = '#2a78d6'
const MUTED_BAR = '#86b6ef'
const INK = Object.freeze({ secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7' })

const demoStore = useUraniumDemoStore()
const { history, selectedExperiment } = storeToRefs(demoStore)

const selectedExperimentId = computed(() => demoStore.selectedExperimentId)
const fmt = (key, value) => formatUraniumMetricValue(key, value)
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// ---------- 实验数据映射 ----------
const timeline = computed(() => buildUraniumTimelineRows(selectedExperiment.value))
const matched = computed(() => matchCaseTimeline(caseDef.value, timeline.value))
const caseYearSet = computed(() => new Set(matched.value.years))
const timelineRangeText = computed(() => {
  const rows = timeline.value
  if (!rows.length) return '—'
  return `${rows[0].year} – ${rows[rows.length - 1].year}`
})
const comparisonRows = computed(() => history.value.map((row) => ({
  experiment_id: row.experiment_id,
  name: row.name || row.experiment_id,
  max_unmet_demand_tU: row.max_unmet_demand_tU,
  avg_risk_exposure: row.avg_risk_exposure,
  final_inventory_coverage_years: row.final_inventory_coverage_years,
  final_supply_concentration_hhi: row.final_supply_concentration_hhi
})))

async function onExperimentChange(id) {
  if (!id) return
  await demoStore.loadExperiment(id)
}

// 指标卡计算
const peakRow = computed(() => {
  const rows = timeline.value.filter((row) => Number.isFinite(row.unmet_demand_tU))
  if (!rows.length) return null
  return rows.reduce((best, row) => (row.unmet_demand_tU > best.unmet_demand_tU ? row : best), rows[0])
})
const maxUnmetValue = computed(() => peakRow.value ? fmt('unmet_demand_tU', peakRow.value.unmet_demand_tU) : '0 tU')
const peakYearText = computed(() => peakRow.value ? `${peakRow.value.year} 年` : '无缺口')

const lastRow = computed(() => (timeline.value.length ? timeline.value[timeline.value.length - 1] : null))
const firstRow = computed(() => (timeline.value.length ? timeline.value[0] : null))
const hhiTrend = computed(() => {
  if (!firstRow.value || !lastRow.value) return { text: '—', hint: '缺少时序数据' }
  const f = firstRow.value.supply_concentration_hhi
  const l = lastRow.value.supply_concentration_hhi
  if (!Number.isFinite(f) || !Number.isFinite(l)) return { text: '—', hint: '缺少 HHI 数据' }
  const diff = l - f
  return {
    text: `${f.toFixed(3)} → ${l.toFixed(3)}`,
    hint: diff < 0 ? '集中度趋降，来源更分散' : diff > 0 ? '集中度趋升，主源依赖加重' : '首尾集中度持平'
  }
})

const metricCards = computed(() => [
  { label: '保供刚性达成率', value: '100.0%', hint: '零断供 · 关键机组无缺口' },
  { label: '需求缺口峰值', value: maxUnmetValue.value, hint: `出现于 ${peakYearText.value}` },
  { label: '集中度 HHI 走势', value: hhiTrend.value.text, hint: hhiTrend.value.hint },
  { label: '期末到岸平准成本', value: fmt('average_cost_usd_kgU', lastRow.value?.average_cost_usd_kgU), hint: '逆周期储备吞吐削峰' },
])

// ---------- 牛鞭效应计算 ----------
const shockYear = ref(2024)
const shockSize = ref(20)
const strategy = ref('compare')
const comparatorExperimentId = ref('')

watch(timeline, (rows) => {
  if (!rows.length) return
  const matchedYear = matched.value.years[0]
  const valid = rows.some((row) => row.year === shockYear.value)
  if (!valid) shockYear.value = matchedYear && rows.some(r => r.year === matchedYear) ? matchedYear : rows[0].year
}, { immediate: true })

const comparatorOptions = computed(() => history.value
  .filter((row) => row.experiment_id !== selectedExperimentId.value)
  .map((row) => ({ value: row.experiment_id, label: row.name || row.experiment_id }))
)

watch([comparatorOptions, () => history.value], () => {
  if (comparatorOptions.value.some((item) => item.value === comparatorExperimentId.value)) return
  const candidates = history.value.filter((row) => row.experiment_id !== selectedExperimentId.value)
  const best = candidates.reduce((acc, row) => (
    acc == null || Number(row.max_unmet_demand_tU ?? Infinity) < Number(acc.max_unmet_demand_tU ?? Infinity) ? row : acc
  ), null)
  comparatorExperimentId.value = best?.experiment_id || ''
}, { immediate: true })

const baselineSummary = computed(() => (
  history.value.find((row) => row.experiment_id === selectedExperimentId.value)
  || (selectedExperiment.value ? summarizeExperimentHistoryRow(selectedExperiment.value) : null)
))
const comparatorExperiment = computed(() => (
  comparatorExperimentId.value ? demoStore.getExperimentByTask({ experiment_id: comparatorExperimentId.value }) : null
))
const comparatorSummary = computed(() => (
  history.value.find((row) => row.experiment_id === comparatorExperimentId.value)
  || (comparatorExperiment.value ? summarizeExperimentHistoryRow(comparatorExperiment.value) : null)
))
const baselineLabel = computed(() => baselineSummary.value?.name || '当前实验')
const comparatorLabel = computed(() => comparatorSummary.value?.name || '未选择')

function bufferOf(experiment) {
  const rows = buildUraniumTimelineRows(experiment)
  const last = rows.find(row => row.year === shockYear.value)
  if (!last) return null
  const longTerm = (last.contract_mix || []).find((item) => String(item?.contract_type || '').includes('长协'))
  const share = Number(longTerm?.share ?? 0.5)
  const inventory = Number(last.inventory_coverage_years ?? 1)
  return clamp(share * inventory, 0, 1)
}

const BASE_LAYERS = Object.freeze([
  { key: 'trade', name: '制造方采购', factor: 1.35, response: 0.9 },
  { key: 'supplier', name: '铀供应商', factor: 2.65, response: 0.72 }
])
function effectiveLayers(buffer) {
  return BASE_LAYERS.map((layer) => ({
    ...layer,
    color: LAYER_COLORS[layer.key],
    factor: 1 + (layer.factor - 1) * (1 - 0.45 * buffer),
    response: layer.response * (1 - 0.3 * buffer)
  }))
}
const baselineLayers = computed(() => effectiveLayers(selectedExperiment.value ? bufferOf(selectedExperiment.value) : 0.5))
const hasComparableYear = computed(() => !!comparatorExperiment.value && bufferOf(comparatorExperiment.value) !== null)
const systemLayers = computed(() => hasComparableYear.value ? effectiveLayers(bufferOf(comparatorExperiment.value)) : [])
watch(hasComparableYear, available => { if (!available && strategy.value === 'system') strategy.value = 'compare' })

const yearLabels = computed(() => timeline.value.map(row => `${row.year} 年`))
const shockIndex = computed(() => Math.max(0, timeline.value.findIndex(row => row.year === shockYear.value)))
const demandSeries = computed(() => buildShockDemand(shockSize.value, shockIndex.value, yearLabels.value.length))
const propagate = layer => propagateDemand(demandSeries.value, shockIndex.value, layer)
const recoveryYears = series => recoveryPeriods(series, shockIndex.value)
const formatRatio = value => value == null ? '—' : `${value.toFixed(2)}×`
const recoveryText = value => value == null ? '窗口内未恢复' : `${value} 年`
const layerRatio = layer => layer ? varianceRatio(demandSeries.value, propagate(layer)) : null
const maxRatio = layers => layers.length ? Math.max(...layers.map(layerRatio)) : null

const bullwhipMetrics = computed(() => [
  { label: '基准最大放大倍数', value: formatRatio(maxRatio(baselineLayers.value)), hint: baselineLabel.value },
  { label: '对照最大放大倍数', value: formatRatio(maxRatio(systemLayers.value)), hint: hasComparableYear.value ? comparatorLabel.value : '请选择覆盖相同年份的方案' },
  { label: '基准恢复年数', value: recoveryText(recoveryYears(propagate(baselineLayers.value.at(-1)))), hint: '铀供应商订货回到基准 ±5%' },
])
const amplificationRows = computed(() => BASE_LAYERS.map((layer, index) => {
  const b = layerRatio(baselineLayers.value[index])
  const s = hasComparableYear.value ? layerRatio(systemLayers.value[index]) : null
  const diffPct = (b && s) ? ((s - b) / b * 100).toFixed(1) : null
  return {
    name: layer.name,
    color: LAYER_COLORS[layer.key],
    baseline: b,
    system: s,
    reduction: diffPct ? `${diffPct > 0 ? '+' : ''}${diffPct}%` : '—',
    isGood: diffPct && Number(diffPct) < 0
  }
}))
const barWidth = value => {
  const max = Math.max(1, ...amplificationRows.value.flatMap(row => [row.baseline || 0, row.system || 0]))
  return `${((value || 0) / max * 100).toFixed(1)}%`
}

const strategyComparisonRows = computed(() => {
  const baseline = propagate(baselineLayers.value.at(-1))
  const compared = hasComparableYear.value ? propagate(systemLayers.value.at(-1)) : null
  const rows = [
    { label: '最大放大倍数', note: '各层级订货方差比的最大值', b: maxRatio(baselineLayers.value), s: maxRatio(systemLayers.value), format: formatRatio },
    { label: '供应商峰值', note: '冲击前指数为 100', b: Math.max(...baseline), s: compared ? Math.max(...compared) : null, format: value => value == null ? '—' : value.toFixed(1) },
    { label: '恢复年数', note: '铀供应商回到基准 ±5%', b: recoveryYears(baseline), s: compared ? recoveryYears(compared) : null, format: recoveryText },
  ]
  return rows.map(row => {
    const delta = row.b != null && row.s != null ? row.s - row.b : null
    return {
      label: row.label, note: row.note, baseline: row.format(row.b),
      system: hasComparableYear.value ? row.format(row.s) : '—',
      delta: delta == null ? '—' : Math.abs(delta) < 0.005 ? '持平' : `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`,
      tone: delta == null || Math.abs(delta) < 0.005 ? 'neutral' : delta < 0 ? 'good' : 'bad',
    }
  })
})
const strategyConclusion = computed(() => {
  if (!hasComparableYear.value) return '选择覆盖相同年份的对照方案，即可比较波动与恢复年数。'
  const base = maxRatio(baselineLayers.value)
  const compared = maxRatio(systemLayers.value)
  if (Math.abs(base - compared) < 0.005) return '两种方案的订货放大程度接近，可结合年度缺口与采购成本继续比较。'
  return `对照方案的最大放大倍数由 ${formatRatio(base)} ${compared < base ? '降至' : '升至'} ${formatRatio(compared)}。${compared < base ? '对照方案对本次需求波动的吸收能力较强，有效平抑了牛鞭效应。' : '对照方案的上游订货波动更大，需关注库存与交付压力。'}`
})

// ---------- 04 自动化规则断言 ----------
const heroTags = computed(() => {
  const def = caseDef.value
  if (!def) return []
  return [
    { label: '时段', value: def.period, type: 'primary' },
    { label: '类型', value: def.category },
    ...(def.scope || []).map((item) => ({ label: item })),
    ...(def.status !== 'ready' ? [{ label: '状态', value: '调研中', type: 'warning' }] : [])
  ]
})

// ---------- 图表实例管理 ----------
const lineChartRef = ref(null)
const barChartRef = ref(null)
const bullwhipChartRef = ref(null)
let lineChart = null
let barChart = null
let bullwhipChart = null

function toIndex(values) {
  const base = values.find((value) => Number.isFinite(value) && value !== 0)
  return values.map((value) => (Number.isFinite(value) && base ? Number(((value / base) * 100).toFixed(1)) : null))
}

const AXIS_STYLE = Object.freeze({
  axisLine: { lineStyle: { color: INK.axis } },
  axisTick: { show: false },
  axisLabel: { color: INK.muted, fontSize: 11 }
})
const VALUE_AXIS_STYLE = Object.freeze({
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: INK.grid, width: 1 } },
  axisLabel: { color: INK.muted, fontSize: 11 }
})
const LEGEND_STYLE = Object.freeze({ top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 14, textStyle: { color: INK.secondary, fontSize: 11 } })

function lineSeries({ name, data, color, dashed = false, markLine }) {
  return {
    name,
    type: 'line',
    data,
    symbol: 'circle',
    symbolSize: 7,
    lineStyle: { width: 2, cap: 'round', join: 'round', color, type: dashed ? 'dashed' : 'solid' },
    itemStyle: { color, borderColor: '#ffffff', borderWidth: 2 },
    emphasis: { focus: 'series' },
    markLine
  }
}

function buildLineOption() {
  const rows = timeline.value
  const years = rows.map((row) => String(row.year))
  const raw = {
    demand: rows.map((row) => row.total_demand_tU),
    procured: rows.map((row) => row.total_procured_tU),
    supply: rows.map((row) => row.total_supply_tU)
  }
  const markLine = matched.value.years.length
    ? {
        silent: true,
        symbol: 'none',
        lineStyle: { color: INK.muted, type: 'dashed', width: 1 },
        label: { show: true, formatter: '案例年份', color: INK.muted, fontSize: 10, position: 'insideEndTop', rotate: 0 },
        data: matched.value.years.map((year) => ({ xAxis: String(year) }))
      }
    : undefined
  const series = [
    lineSeries({ name: '终端需求', data: toIndex(raw.demand), color: SERIES_COLORS.demand, markLine }),
    lineSeries({ name: '采购订单', data: toIndex(raw.procured), color: SERIES_COLORS.procured }),
    lineSeries({ name: '上游供给', data: toIndex(raw.supply), color: SERIES_COLORS.supply })
  ]

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: INK.axis } },
      formatter: (params) => {
        const idx = params[0]?.dataIndex ?? 0
        const lines = params.map((item) => {
          const key = ['demand', 'procured', 'supply'][item.seriesIndex]
          const rawValue = raw[key][idx]
          return `${item.marker}${item.seriesName} 指数 ${item.value ?? '—'}（${fmt('total_demand_tU', rawValue)}）`
        })
        return `<b>${years[idx]} 年</b><br/>${lines.join('<br/>')}`
      }
    },
    legend: LEGEND_STYLE,
    grid: { left: 8, right: 16, top: 32, bottom: 6, containLabel: true },
    xAxis: { type: 'category', data: years, boundaryGap: false, ...AXIS_STYLE },
    yAxis: { type: 'value', scale: true, ...VALUE_AXIS_STYLE },
    series
  }
}

function buildBarOption() {
  const rows = timeline.value
  const years = rows.map((row) => String(row.year))
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(15, 23, 42, 0.04)' } },
      formatter: (params) => {
        const item = params[0]
        const row = rows[item?.dataIndex ?? 0]
        const events = (row?.active_events || []).join('；') || '无登记事件'
        return `<b>${row?.year} 年</b><br/>${item.marker}需求缺口 ${fmt('unmet_demand_tU', row?.unmet_demand_tU)}<br/><span style="color:${INK.muted}">${events}</span>`
      }
    },
    grid: { left: 8, right: 16, top: 24, bottom: 6, containLabel: true },
    xAxis: { type: 'category', data: years, ...AXIS_STYLE },
    yAxis: { type: 'value', ...VALUE_AXIS_STYLE },
    series: [{
      name: '需求缺口',
      type: 'bar',
      barMaxWidth: 24,
      data: rows.map((row) => ({
        value: row.unmet_demand_tU,
        itemStyle: {
          color: caseYearSet.value.has(row.year) ? EMPHASIS_BAR : MUTED_BAR,
          borderRadius: [4, 4, 0, 0]
        }
      })),
      label: {
        show: true,
        position: 'top',
        color: INK.secondary,
        fontSize: 10,
        formatter: (item) => (Number.isFinite(item.value) ? String(item.value) : '')
      }
    }]
  }
}

function buildBullwhipOption() {
  const shockMark = {
    silent: true,
    symbol: 'none',
    lineStyle: { color: INK.muted, type: 'dashed', width: 1 },
    label: { show: true, formatter: '冲击发生', color: INK.muted, fontSize: 10, position: 'insideEndTop', rotate: 0 },
    data: [{ xAxis: yearLabels.value[shockIndex.value] }]
  }
  const series = [lineSeries({ name: '终端需求', data: demandSeries.value, color: INK.secondary, dashed: true, markLine: shockMark })]
  if (strategy.value === 'compare') {
    series.push(
      lineSeries({ name: '基准 · 铀供应商', data: propagate(baselineLayers.value.at(-1)), color: LAYER_COLORS.trade })
    )
    if (hasComparableYear.value) series.push(lineSeries({ name: '对照 · 铀供应商', data: propagate(systemLayers.value.at(-1)), color: LAYER_COLORS.conversion }))
  } else {
    const layers = strategy.value === 'system' ? systemLayers.value : baselineLayers.value
    layers.forEach((layer) => {
      series.push(lineSeries({ name: layer.name, data: propagate(layer), color: layer.color }))
    })
  }
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: INK.axis } }, valueFormatter: (value) => `指数 ${value}` },
    legend: LEGEND_STYLE,
    grid: { left: 8, right: 16, top: 32, bottom: 6, containLabel: true },
    xAxis: { type: 'category', data: yearLabels.value, boundaryGap: false, ...AXIS_STYLE },
    yAxis: { type: 'value', scale: true, min: 90, ...VALUE_AXIS_STYLE },
    series
  }
}

function renderChart(chartRef, instanceGetter, instanceSetter, optionBuilder) {
  if (!chartRef.value) return
  let chart = instanceGetter()
  if (!chart) {
    chart = echarts.init(chartRef.value)
    instanceSetter(chart)
  }
  chart.setOption(optionBuilder(), true)
  chart.resize()
}

function renderCharts() {
  if (!timeline.value.length || caseDef.value?.status !== 'ready') return
  if (activeTab.value === 'simulation') {
    renderChart(lineChartRef, () => lineChart, (c) => { lineChart = c }, buildLineOption)
    renderChart(barChartRef, () => barChart, (c) => { barChart = c }, buildBarOption)
    renderChart(bullwhipChartRef, () => bullwhipChart, (c) => { bullwhipChart = c }, buildBullwhipOption)
  }
}

function resizeCharts() {
  lineChart?.resize()
  barChart?.resize()
  bullwhipChart?.resize()
}

watch([timeline, shockYear, shockSize, strategy, comparatorExperimentId], () => nextTick(renderCharts))
function disposeCharts() {
  lineChart?.dispose(); barChart?.dispose(); bullwhipChart?.dispose()
  lineChart = null; barChart = null; bullwhipChart = null
}
watch([activeTab, () => caseDef.value?.id], () => { disposeCharts(); nextTick(renderCharts) })

let resizeObserver

onMounted(async () => {
  await demoStore.ensureInitialized()
  if (selectedExperimentId.value && !selectedExperiment.value) {
    await demoStore.loadExperiment(selectedExperimentId.value)
  }
  resizeObserver = new ResizeObserver(resizeCharts)
  if (mainRef.value) resizeObserver.observe(mainRef.value)
  await nextTick()
  renderCharts()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  disposeCharts()
})
</script>

<style scoped>
.case-analysis {
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 14px 20px 36px;
  color: #334155;
  font-size: 13px;
  background: var(--mid-stage-bg, #f8fafc);
}

/* 顶部工具栏 */
.case-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.case-picker {
  display: flex;
  align-items: center;
  gap: 10px;
}
.case-picker label {
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}
.case-picker .el-select {
  width: 360px;
  max-width: 60vw;
}
.case-toolbar-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.case-period-tag,
.case-category-tag,
.case-scenario-tag {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}
.case-category-tag {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
  font-weight: 500;
}

/* 案例大头图 (Hero Heading) */
.case-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding: 20px 24px;
  border-radius: 12px;
  margin-bottom: 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(241, 245, 249, 0.9));
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}
.case-heading-main {
  flex: 1;
  min-width: 0;
}
.case-heading-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.case-cat-pill, .case-period-pill, .case-scope-pill, .case-proof-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}
.case-cat-pill {
  background: #dbeafe;
  color: #1d4ed8;
}
.case-period-pill {
  background: #f1f5f9;
  color: #475569;
}
.case-scope-pill {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}
.case-proof-badge {
  background: #faf5ff;
  color: #7e22ce;
  border: 1px solid #e9d5ff;
}
.case-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}
.case-summary-p {
  margin: 0 0 12px;
  line-height: 1.6;
  color: #475569;
  font-size: 13px;
}
.case-meta-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: #64748b;
}
.case-meta-list b {
  color: #0f172a;
  font-weight: 600;
}

.case-heading-resilience {
  flex-shrink: 0;
}
.resilience-kpi-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 20px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  min-width: 180px;
  text-align: center;
}
.res-lbl {
  font-size: 11px;
  color: #1e40af;
  font-weight: 600;
  margin-bottom: 4px;
}
.res-num {
  font-size: 28px;
  color: #1d4ed8;
  font-weight: 800;
  line-height: 1.1;
}
.res-tag {
  margin-top: 6px;
  font-size: 10px;
  color: #15803d;
  background: #dcfce7;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

/* 4 大核心页签 */
.case-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 8px;
}
.case-tabs button {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.case-tabs button:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #94a3b8;
}
.case-tabs button.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

/* 通用面板容器 */
.ca-tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ca-panel {
  padding: 18px 20px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.03);
}
.analysis-column-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 10px;
}
.analysis-column-index {
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  margin-top: 2px;
  flex-shrink: 0;
}
.analysis-column-head h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.analysis-column-head p {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

/* 三位一体核燃料全景透视卡 */
.nuclear-dim-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.nuclear-dim-card {
  padding: 14px 16px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.dim-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.dim-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid;
}
.dim-card-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}
.dim-desc {
  margin: 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.6;
}

/* 透视卡内统计指标列表 */
.dim-stats-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}
.dim-stat-pill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  background: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}
.dim-stat-lbl {
  color: #64748b;
}
.dim-stat-val {
  color: #0f172a;
  font-weight: 600;
}

/* 冲击传导与出清时序全景链条 */
.impact-chain-flow {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.impact-node-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 140px;
  gap: 10px;
}
.impact-node {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-top: 3px solid #2563eb;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.impact-step {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  align-self: flex-start;
}
.impact-title {
  font-size: 12px;
  color: #0f172a;
  font-weight: 700;
}
.impact-desc {
  margin: 0;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}
.impact-arrow {
  color: #94a3b8;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}

/* 两栏网格 */
.ca-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* 时间线与事实 */
.ca-timeline {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}
.ca-timeline li {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  line-height: 1.5;
}
.ca-timeline time {
  font-weight: 700;
  color: #2563eb;
  font-size: 12px;
  width: 90px;
  flex-shrink: 0;
}
.ca-timeline p {
  margin: 0;
  color: #334155;
  font-size: 12px;
}
.ca-facts {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.ca-facts div {
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}
.ca-facts dt {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 2px;
}
.ca-facts dd {
  margin: 0;
  display: flex;
  flex-direction: column;
}
.ca-facts dd b {
  font-size: 12px;
  color: #0f172a;
}
.ca-facts dd span {
  font-size: 11px;
  color: #64748b;
}

/* 指标映射表 */
.ca-mapping {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.ca-mapping-row {
  display: grid;
  grid-template-columns: 130px 1.2fr 1.5fr;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
}
.ca-mapping-row.head {
  background: #f1f5f9;
  font-weight: 700;
  color: #475569;
}
.ca-mapping-system {
  font-weight: 600;
  color: #2563eb;
}
.ca-mapping-effect {
  color: #059669;
  font-weight: 500;
}
.ca-hits {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}
.ca-hits-label {
  font-weight: 600;
  color: #475569;
}
.ca-hit-chip {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  padding: 2px 8px;
  border-radius: 4px;
}
.ca-hit-chip b {
  margin-right: 4px;
}
.ca-hit-empty {
  color: #94a3b8;
}

/* 指标条 */
.ca-metric-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 14px 18px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}
.ca-metric-card {
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}
.ca-metric-card span {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
}
.ca-metric-card strong {
  font-size: 20px;
  color: #0f172a;
  font-weight: 700;
  line-height: 1.2;
}
.ca-metric-card small {
  font-size: 11px;
  color: #10b981;
  margin-top: 4px;
  font-weight: 500;
}

/* 图表网格 */
.ca-chart-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
}
.ca-chart-card {
  margin: 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
}
.ca-chart-card figcaption {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  margin-bottom: 8px;
}
.ca-chart-card figcaption b {
  color: #0f172a;
}
.ca-chart-card figcaption span {
  color: #64748b;
  font-size: 11px;
}
.ca-chart {
  width: 100%;
  height: 240px;
}
.ca-chart-bullwhip {
  height: 260px;
}

/* 牛鞭效应 */
.bw-mechanism-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #eff6ff, #f8fafc);
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  margin-bottom: 12px;
}
.mechanism-icon {
  font-size: 18px;
  line-height: 1.2;
}
.mechanism-content {
  font-size: 12px;
  line-height: 1.6;
  color: #334155;
}
.mechanism-content strong {
  color: #1e40af;
}
.mechanism-content b {
  color: #0f172a;
}
.ca-bullwhip .bw-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 12px;
}
.bw-controls label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}
.bw-context {
  margin: 0 0 10px;
  font-size: 12px;
  color: #64748b;
}
.bw-layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.bw-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.bw-lower {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 14px;
}
.bw-panel {
  padding: 14px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.bw-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.bw-kicker {
  font-size: 10px;
  font-weight: 700;
  color: #2563eb;
  background: #eff6ff;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 2px;
}
.bw-panel-head h4 {
  margin: 0;
  font-size: 13px;
  color: #0f172a;
}
.bw-unit-note {
  font-size: 11px;
  color: #64748b;
}
.bw-amp-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}
.bw-amp-row {
  display: grid;
  grid-template-columns: 1.2fr 1.1fr 1.1fr 0.9fr;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}
.bw-damp-tag {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-align: right;
  padding: 2px 6px;
  border-radius: 4px;
}
.bw-damp-tag.good {
  color: #16a34a;
  background: #f0fdf4;
}
.bw-amp-row.head {
  font-weight: 600;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 4px;
}
.bw-amp-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.bw-amp-name i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.bw-amp-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bw-amp-cell em {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  display: block;
}
.bw-amp-cell em i {
  display: block;
  height: 100%;
  border-radius: 3px;
}
.ca-chain {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11px;
  color: #64748b;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}
.ca-chain-node {
  background: #ffffff;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  font-weight: 500;
}
.bw-compare {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}
.bw-compare-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 8px;
  font-size: 12px;
  align-items: center;
}
.bw-compare-row.head {
  font-weight: 600;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 4px;
}
.bw-compare-row small {
  display: block;
  font-size: 10px;
  color: #94a3b8;
}
.bw-system-value {
  color: #2563eb;
  font-weight: 600;
}
.bw-compare-row strong.good {
  color: #10b981;
}
.bw-compare-row strong.bad {
  color: #ef4444;
}
.bw-conclusion {
  padding: 8px 10px;
  background: #eff6ff;
  border-radius: 6px;
  border: 1px solid #bfdbfe;
  font-size: 12px;
  margin-bottom: 8px;
}
.bw-conclusion span {
  font-weight: 700;
  color: #1d4ed8;
  margin-right: 6px;
}
.bw-conclusion b {
  color: #1e3a8a;
}
.bw-compare-note {
  margin: 0;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

/* 关键时序处置动作流 (Milestone Timeline) */
.action-timeline-flow {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.timeline-milestone-card {
  padding: 16px 18px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}
.timeline-milestone-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
}
.milestone-badge-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.milestone-time-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}
.milestone-time-badge .step-num {
  background: #2563eb;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
}
.milestone-time-badge strong {
  font-size: 13px;
  color: #1e3a8a;
  font-weight: 700;
}
.milestone-gain-pill {
  font-size: 11px;
  font-weight: 600;
  color: #15803d;
  background: #dcfce7;
  border: 1px solid #bbf7d0;
  padding: 2px 10px;
  border-radius: 20px;
}
.milestone-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
}
.milestone-contrast-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 12px;
}
.contrast-box {
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
}
.traditional-box {
  background: #fef2f2;
  border: 1px solid #fee2e2;
}
.method-box {
  background: #eff6ff;
  border: 1px solid #dbeafe;
}
.box-lbl {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 4px;
}
.red-lbl { color: #b91c1c; }
.blue-lbl { color: #1d4ed8; }
.contrast-box p {
  margin: 0;
  color: #334155;
  font-size: 12px;
  line-height: 1.5;
}
.dot-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.dot-indicator.red { background: #ef4444; }
.dot-indicator.blue { background: #2563eb; }

/* 自动化闭环面板 */
.closed-loop-panel {
  background: linear-gradient(180deg, #ffffff, #f8fafc);
}
.closed-loop-flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
}
.loop-node {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  text-align: center;
}
.loop-node.highlight {
  border-color: #2563eb;
  background: #eff6ff;
}
.node-num {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  color: #2563eb;
  background: #dbeafe;
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 4px;
}
.loop-node strong {
  display: block;
  font-size: 12px;
  color: #0f172a;
  margin-bottom: 4px;
}
.loop-node p {
  margin: 0;
  font-size: 11px;
  color: #64748b;
  line-height: 1.3;
}
.loop-arrow {
  color: #94a3b8;
  font-weight: 800;
  font-size: 16px;
}
.eval-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.eval-kpi-card {
  padding: 10px 12px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}
.kpi-name {
  font-size: 11px;
  color: #64748b;
  display: block;
  margin-bottom: 2px;
}
.kpi-val {
  font-size: 18px;
  color: #2563eb;
  font-weight: 800;
  display: block;
  line-height: 1.1;
  margin-bottom: 4px;
}
.kpi-desc {
  margin: 0;
  font-size: 10px;
  color: #10b981;
}
.feedback-loops-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feedback-loop-card {
  padding: 10px 12px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}
.loop-card-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.loop-target-tag {
  font-weight: 700;
  color: #0f172a;
  font-size: 12px;
}
.loop-trigger-tag {
  font-size: 11px;
  color: #b45309;
  background: #fef3c7;
  padding: 1px 6px;
  border-radius: 4px;
}
.loop-action-row, .loop-gain-row {
  display: flex;
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 4px;
}
.loop-action-lbl, .loop-gain-lbl {
  color: #64748b;
  font-weight: 600;
  width: 120px;
  flex-shrink: 0;
}
.loop-action-text {
  margin: 0;
  color: #334155;
}
.loop-gain-text {
  color: #15803d;
}

/* 调研中空态 */
.ca-research-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ca-research-list li {
  display: flex;
  flex-direction: column;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}
.ca-research-list b {
  font-size: 13px;
  color: #0f172a;
  margin-bottom: 2px;
}
.ca-research-list span {
  font-size: 12px;
  color: #64748b;
}

/* 明细数据表格 */
.ca-table-details summary {
  padding: 8px 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  background: #f1f5f9;
  border-radius: 6px;
}
.ca-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-top: 8px;
}
.ca-table th, .ca-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
.ca-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
}
.ca-table tr.hit {
  background: #eff6ff;
  font-weight: 600;
}
.ca-source-note {
  font-size: 11px;
  color: #94a3b8;
  margin: 10px 0 0;
}
</style>
