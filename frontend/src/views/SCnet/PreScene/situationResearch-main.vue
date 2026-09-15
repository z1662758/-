<template>
  <div class="pred-root" v-loading="loading">
    <!-- Error state -->
    <div v-if="error" class="pred-error">
      <p>⚠️ 数据加载失败：{{ error }}</p>
      <el-button @click="fetchData" type="primary" size="small">重试</el-button>
    </div>

    <template v-if="!error && chartData">
      <!-- 第一部分：顶部核心指标 -->
      <div class="sj-dashboard">
        <div v-for="item in dashboardSummary" :key="item.label"
             class="sj-db-card" :class="item.variant || ''">
          <div class="sj-db-icon">{{ getIcon(item.variant) }}</div>
          <div class="sj-db-info">
            <div class="sj-db-label">{{ item.label }}</div>
            <div class="sj-db-value">{{ item.value }}</div>
            <div class="sj-db-detail">{{ item.detail }}</div>
          </div>
        </div>
      </div>

      <!-- 第二部分：态势预测分析结果（真实算法：趋势/拐点/周期） -->
      <!-- 临时隐藏：态势预测分析结果 整块（含周期特征分析）。如需恢复，把下面 v-if 改为 true（内部趋势/拐点是否显示见各自 v-if） -->
      <div class="pred-section" v-if="false">
        <div class="pred-section-title">
          <span class="pred-section-mark"></span>态势预测分析结果
          <span class="pred-section-sub" v-if="analysisOk">算法真实计算结果 · 基于 {{ analysis.series?.label || '历史序列' }}</span>
        </div>

        <!-- 无可用分析（auto / 数据不足） -->
        <div v-if="!analysisOk" class="ana-empty">
          <el-empty :description="analysis?.reason || '暂无足够的真实数据执行态势分析'" :image-size="80" />
        </div>

        <div v-else class="analysis">
          <!-- 临时隐藏：趋势分析 + 关键拐点识别。如需恢复，删除下行开头的 <template v-if="false"> 与对应 </template> -->
          <template v-if="false">
          <div class="ana-row">
          <!-- 趋势分析 Dashboard（后端真实模型计算） -->
          <div class="ana-card">
            <div class="ana-card-head ana-card-head--wrap">
              <span class="ana-card-title">趋势分析</span>
              <div class="trend-chips" v-if="trendInfo">
                <el-tag size="small" effect="plain" :type="dirTagType(trendInfo.long?.direction)">长期{{ dirCn(trendInfo.long?.direction) }}</el-tag>
                <el-tag size="small" effect="plain" :type="dirTagType(trendInfo.recent?.direction)">近期{{ dirCn(trendInfo.recent?.direction) }}</el-tag>
                <el-tag size="small" effect="plain" :type="dirTagType(trendInfo.fc?.direction)">预测{{ dirCn(trendInfo.fc?.direction) }}</el-tag>
                <el-tag size="small" type="info" effect="plain">波动{{ trendInfo.vol?.level_cn }}</el-tag>
                <el-tag size="small" type="warning" effect="plain">{{ trendInfo.fc?.model_label }}</el-tag>
                <el-tag size="small" effect="plain" :type="confTag(trendInfo.fc?.confidence)">可信度{{ confCn(trendInfo.fc?.confidence) }}</el-tag>
              </div>
            </div>
            <template v-if="trendInfo">
              <div class="trend-summary-bar">
                <div class="tsb-main"><b>主结论</b><span>{{ priceStageShort }}</span></div>
                <div class="tsb-nums">
                  <span>Sen <b>{{ snum(trendInfo.long?.sen_slope) }}</b></span>
                  <span>5Y <b>{{ snum(trendInfo.recent?.slope) }}</b></span>
                  <span>3Y <b>{{ snum(trendInfo.recent?.slope3) }}</b></span>
                  <span>2032E <b>{{ num(forecastAt(2032)) }}</b></span>
                </div>
              </div>
              <p class="trend-overview-line">{{ trendInfo.sum?.forecast_text }}  远期 95% 区间随预测期明显扩大，2032 节点不确定性高。</p>

              <div class="trend-toolbar">
                <span class="trend-tip">实线=历史实际 · 点线=历史缺失期模型估计 · 虚线=未来预测；图例可开关，右端切换时间窗口</span>
                <div class="win-btns">
                  <button v-for="w in trendWindows" :key="w.key" type="button" class="win-btn" :class="{ on: trendWindow === w.key }" @click="setTrendWindow(w.key)">{{ w.label }}</button>
                </div>
              </div>
              <div ref="trendChart" class="trend-main-chart"></div>

              <div class="ov-title">Historical Overview · 1997–2032（含 2007 历史峰值，不参与主图压缩）</div>
              <div ref="trendOverviewChart" class="trend-overview-chart"></div>

              <div class="trend-sub">
                <div class="trend-kpis">
                  <span class="t-kpi"><i>长期(OLS) $/lb/年</i><b>{{ snum(trendInfo.long?.linear_slope) }}</b></span>
                  <span class="t-kpi"><i>Theil-Sen</i><b>{{ snum(trendInfo.long?.sen_slope) }}</b></span>
                  <span class="t-kpi"><i>R² / MK</i><b style="font-size:10px">{{ num(trendInfo.long?.r2) }} / {{ trendInfo.long?.significance ? '显著' : '未达显著' }}</b></span>
                  <span class="t-kpi"><i>近5年 $/lb/年</i><b>{{ snum(trendInfo.recent?.slope) }}</b></span>
                  <span class="t-kpi"><i>近3年 $/lb/年</i><b>{{ snum(trendInfo.recent?.slope3) }}</b></span>
                  <span class="t-kpi"><i>预测累计</i><b>{{ sign(trendInfo.fc?.predicted_change_pct) }}</b></span>
                  <span class="t-kpi"><i>近5年σ</i><b>{{ num(trendInfo.vol?.recent_std) }}</b></span>
                  <span class="t-kpi"><i>最大回撤</i><b>{{ trendInfo.vol?.max_drawdown }}%</b></span>
                </div>
                <div class="trend-states">
                  <span><b>长期趋势</b><i>{{ trendInfo.sum?.long_term_text }}</i></span>
                  <span><b>近期趋势</b><i>{{ trendInfo.sum?.recent_text }}</i></span>
                  <span><b>波动状态</b><i>{{ trendInfo.sum?.volatility_text }}</i></span>
                  <span><b>预测结论</b><i>{{ trendInfo.sum?.forecast_text }}</i></span>
                </div>
              </div>

              <div class="fc-wrap">
                <div class="fc-nodes" v-if="fcNodes.length">预测节点：
                  <span v-for="nd in fcNodes" :key="nd.year"><i>{{ nd.year }}E</i><b>{{ num(nd.mean) }}</b></span>
                </div>
                <details class="fc-unc">
                  <summary>2032 不确定性 / 查看预测区间</summary>
                  <table class="pi-table" v-if="pi2032">
                    <thead><tr><th>节点</th><th>中心预测</th><th>80% 区间</th><th>95% 区间</th></tr></thead>
                    <tbody>
                      <tr v-for="nd in fcNodes" :key="nd.year">
                        <td>{{ nd.year }}E</td><td>{{ num(nd.mean) }} $/lb</td>
                        <td>{{ num(nd.lo80) }} ~ {{ num(nd.hi80) }}</td>
                        <td>{{ num(nd.lo95) }} ~ {{ num(nd.hi95) }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p class="pi-note">说明：80%/95% 区间为基于拟合残差尺度的近似统计区间，下界可能跨越 0，表示“模型误差范围”，不代表真实负价格情景；区间随预测期明显扩大。</p>
                </details>
              </div>

              <div class="trend-markers" v-if="trendInfo.anom?.length || trendInfo.cp?.length">
                <span class="m-line" v-if="trendInfo.anom?.length">异常点(MAD稳健z&gt;2.5)：<em v-for="a in trendInfo.anom" :key="a.year">{{ a.year }}·{{ a.value }}({{ a.score }})</em></span>
                <span class="m-line" v-if="trendInfo.cp?.length">结构转折：<em v-for="c in trendInfo.cp" :key="c.year">{{ c.year }}（{{ snum(c.before_trend) }}→{{ snum(c.after_trend) }}）</em></span>
              </div>
            </template>
            <div v-else class="ana-msg">{{ analysis?.trend?.message || '趋势分析暂不可用' }}</div>
            <details class="ana-evidence" v-if="trendInfo">
              <summary>查看依据 / 模型与计算说明</summary>
              <ul>
                <li>长期趋势：Linear Regression + Theil-Sen 稳健斜率 + Mann-Kendall 趋势检验（内置实现）</li>
                <li>近期趋势：近3年/近5年端到端斜率（含滚动窗口），并计算加速度</li>
                <li>滚动：MA3 / MA5 尾随移动平均（图例开关）</li>
                <li>波动：全期/近期标准差、变异系数、最大回撤、收敛等级</li>
                <li>异常点：稳健 z-score（MAD），仅标最显著 1~3 个</li>
                <li>结构转折：轻量二元分割（分段线性拟合 SSE 最小），最多 1~3 个</li>
                <li>预测：Holt / LinearTrend / ARIMA(1,1,0) 候选，按末段回测 RMSE 择优选一；80%/95% 区间为基于拟合残差尺度的近似区间</li>
                <li>横盘判定：预测累计变化幅度 &lt; {{ trendInfo.side?.threshold_pct || 3 }}%</li>
                <li v-for="(e,i) in trendInfo.evidence || []" :key="'ev'+i">{{ e }}</li>
              </ul>
            </details>
          </div>

          <!-- 拐点识别 -->
          <div class="ana-card">
            <div class="ana-card-head">
              <span class="ana-card-title">关键拐点识别</span>
              <el-tag v-if="turningInfo" size="small" :type="turningTagType(turningInfo.signal)">{{ turningLabel(turningInfo.signal) }}</el-tag>
            </div>
            <template v-if="turningInfo">
              <div ref="turningChart" class="ana-chart"></div>
              <div class="ana-list-mini">
                <span v-for="p in turningPoints" :key="p.date" class="ana-chip" :class="p.type">
                  {{ p.date }} · {{ p.type === 'peak' ? '高点' : '低点' }} {{ num(p.value) }}
                </span>
                <span v-if="!turningPoints.length" class="ana-muted">真实序列内未见显著历史极值</span>
              </div>
              <div class="ana-metrics ana-metrics--3">
                <span class="ana-metric"><i>历史拐点数</i><b>{{ turningCount }}</b></span>
                <span class="ana-metric"><i>当前信号</i><b style="font-size:11px">{{ turningInfo ? turningLabel(turningInfo.signal) : '—' }}</b></span>
                <span class="ana-metric"><i>最高高点</i><b style="font-size:11px">{{ turningMaxTxt }}</b></span>
              </div>
            </template>
            <div v-else class="ana-msg">{{ analysis?.turningPoint?.message || '拐点识别暂不可用' }}</div>
            <div class="ana-note">signal_strength / confidence 为启发式评分，非统计概率</div>
            <details class="ana-evidence" v-if="turningInfo?.evidence?.length">
              <summary>查看依据 / 算法说明</summary>
              <ul><li v-for="(e,i) in turningInfo.evidence" :key="i">{{ e }}</li></ul>
            </details>
          </div>
          </div><!-- /ana-row -->
          </template><!-- /临时隐藏 趋势/拐点 -->

          <!-- 周期分析（整行卡片） -->
          <div class="ana-card ana-cycle-full">
            <div class="ana-card-head">
              <span class="ana-card-title">周期特征分析</span>
              <el-tag v-if="cycleShown || cycleStatus==='no_cycle'" size="small" :type="cycleStatusMeta(cycleStatus).type">{{ cycleStatusMeta(cycleStatus).label }}</el-tag>
            </div>
            <template v-if="cycleShown">
              <div class="cycle-kpis">
                <div class="cycle-kpi"><i>主导周期</i><b>{{ num(cycle.dominant_period) }}<em>年</em></b></div>
                <div class="cycle-kpi"><i>当前阶段</i><b>{{ stageLabel(cycle.current_stage) }}</b></div>
                <div class="cycle-kpi">
                  <i>周期综合强度</i>
                  <el-tooltip content="周期证据强度 = 频谱占比/ACF支持/谐波拟合优度/周期覆盖数的综合评分(0-1)，并非事件发生概率">
                    <b>{{ pct(cycle.cycle_strength) }}</b>
                  </el-tooltip>
                </div>
                <div class="cycle-kpi"><i>覆盖周期</i><b>{{ num(cycle.cycles_covered) }}×</b></div>
              </div>
              <div class="cycle-split">
                <!-- 左：候选周期频谱强度（主图） -->
                <div class="cycle-spec">
                  <div class="cycle-sub-title">候选周期频谱强度<span class="muted">（相对频谱占比 · 非概率）</span></div>
                  <div ref="cycleChart" class="cycle-spectrum-chart"></div>
                  <div class="cycle-cands">
                    <span v-for="cp in cycle.candidate_periods.slice(0,5)" :key="cp.period" class="cand-chip">{{ cp.period }}年<em>{{ pct(cp.relative_strength) }}</em></span>
                  </div>
                  <div class="ana-note">主导周期频谱占比 <b>{{ pct(cycle.spectral_strength) }}</b>——该周期在频谱能量中的相对占比，衡量周期成分强弱，不是事件概率；与“周期综合强度”为两个不同指标。</div>
                </div>
                <!-- 右：周期分量（去趋势）+ 未来窗口 -->
                <div class="cycle-phase">
                  <div class="cycle-sub-title">周期分量（去趋势后）<span class="muted">· 预测范围 {{ cycle.forecast_period_text || '—' }}（{{ cycle.forecast_horizon_steps || 0 }} 步）</span></div>
                  <div ref="cycleCompChart" class="cycle-comp-chart"></div>
                  <div class="cycle-windows">
                    <span>下一未来高点窗口 <b>{{ cycleWindowText(cycle.next_peak_window) }}</b></span>
                    <span>下一未来低点窗口 <b>{{ cycleWindowText(cycle.next_trough_window) }}</b></span>
                  </div>
                  <div class="cycle-firstwin">模型首预测窗口（可能已进入历史）：高点 {{ cycleWindowText(cycle.model_first_peak_window) }} · 低点 {{ cycleWindowText(cycle.model_first_trough_window) }}</div>
                  <div class="ana-note">
                    方法：{{ cycle.method }} · 数据 {{ cycle.sample_start }}–{{ cycle.sample_end }}（{{ cycle.sample_size }} 个年度样本）·
                    预测可靠性 <b>{{ relLabel(cycle.forecast_reliability) }}</b>（回测改善 {{ signPct(cycle.backtest?.improvement) }}）
                    <template v-if="cycleStatus==='candidate'"> · 检测到主导波动周期，历史稳定性有限，按候选周期参考，不解释为严格稳定周期</template>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="cycle-none">
              <div class="cycle-none-icon">🌊</div>
              <p>当前序列未检测到具有预测价值的周期</p>
              <p class="cycle-none-sub">{{ cycle?.message || 'no_cycle' }}</p>
            </div>
            <details class="ana-evidence" v-if="cycle?.evidence?.length">
              <summary>查看依据 / 算法说明</summary>
              <ul><li v-for="(e,i) in cycle.evidence" :key="i">{{ e }}</li></ul>
            </details>
          </div>
        </div>
      </div>

      <!-- 供应链决策：周期研判 → 关键拐点 → 风险预警（只展示 decision 后端结果） -->
      <!-- 临时隐藏：供应链周期研判 · 关键拐点 · 风险预警。如需恢复，把下面 v-if 改为 dec && dec.warning -->
      <div class="pred-section" v-if="false && dec && dec.warning">
        <div class="pred-section-title"><span class="pred-section-mark"></span>供应链周期研判 · 关键拐点 · 风险预警<span class="pred-section-sub">趋势→周期→拐点→预警（复用同一分析结果）</span></div>

        <!-- 周期：仅主维度（价格 + 供需代理），其余折叠 -->
        <div class="cycle-main-row">
          <div class="dec-card dec-main-price" v-if="cycleCards.price">
            <div class="dec-head"><b>价格周期</b><span class="dec-tag dec-tag--ok">真实数据 · 置信{{ confCn(cycleCards.price.confidence) }}</span></div>
            <div class="dec-stage">{{ cycleCards.price.label }}</div>
            <p class="dec-text">{{ cycleCards.price.text }}</p>
            <div class="dec-ev" v-if="cycleCards.price.data">
              <span v-for="(v,l) in cycleCards.price.data" :key="l" class="dec-ev-item"><i>{{ evKeyLabel(l) }}</i><b>{{ evKeyValue(l,v) }}</b></span>
            </div>
            <div class="dec-foot">2032 Outlook：{{ priceOutlookText }}</div>
          </div>
          <div class="dec-card dec-supply" v-if="cycleCards.supply_demand">
            <div class="dec-head"><b>供需周期 · 代理</b><span class="dec-tag dec-tag--proxy">代理指标 · 置信低</span></div>
            <div class="dec-stage">{{ cycleCards.supply_demand.label }}</div>
            <p class="dec-text">{{ cycleCards.supply_demand.text }}</p>
            <div class="dec-ev" v-if="cycleCards.supply_demand.data">
              <span v-for="(v,l) in cycleCards.supply_demand.data" :key="l" class="dec-ev-item"><i>{{ evKeyLabel(l) }}</i><b>{{ evKeyValue(l,v) }}</b></span>
            </div>
          </div>
        </div>
        <details class="expand-strip" v-if="pendingCycleKeys.length">
          <summary>待扩展数据维度 · {{ pendingCycleKeys.length }}</summary>
          <ul>
            <li v-for="k in pendingCycleKeys" :key="k"><b>{{ cycleTitle(k) }}</b>：{{ cycleCards[k] && cycleCards[k].text }}</li>
          </ul>
        </details>

        <!-- 关键拐点：主维度（价格 + 供需代理 + 综合状态），其余折叠 -->
        <div class="tp-list">
          <div class="tp-card" v-if="turningCards.price">
            <div class="tp-idx">01</div>
            <div class="tp-body">
              <div class="tp-head"><b>价格趋势拐点</b><span class="dec-tag dec-tag--red">{{ turningCards.price.triggered ? '已触发' : '未触发' }}</span></div>
              <div class="tp-cond">{{ turningCards.price.condition }}</div>
              <div class="tp-ev" v-if="turningCards.price.evidence">
                <span v-for="(v,l) in turningCards.price.evidence" :key="l">{{ evKeyLabel(l) }} <b>{{ evKeyValue(l,v) }}</b></span>
              </div>
              <div class="tp-suggest" v-if="turningCards.price.suggest">建议：{{ turningCards.price.suggest }}</div>
            </div>
          </div>
          <div class="tp-card" v-if="turningCards.supply_demand">
            <div class="tp-idx">02</div>
            <div class="tp-body">
              <div class="tp-head"><b>供需趋紧代理信号</b><span class="dec-tag dec-tag--proxy">代理信号</span></div>
              <div class="tp-cond">{{ turningCards.supply_demand.condition }}</div>
              <div class="tp-ev"><span>代理评分 <b>{{ cycleCards.supply_demand && cycleCards.supply_demand.data ? evKeyValue('proxy_score', cycleCards.supply_demand.data.proxy_score) : '—' }}</b></span></div>
              <div class="tp-suggest">综合价格趋势与供应风险指标显示供需可能趋紧，但缺逐期真实数据，仅作代理参考。</div>
            </div>
          </div>
          <div class="tp-card tp-card--comp" v-if="warning && warning.level">
            <div class="tp-idx">03</div>
            <div class="tp-body">
              <div class="tp-head"><b>复合风险状态</b><span class="dec-tag dec-tag--red">{{ warning.label }}</span></div>
              <div class="tp-cond">触发 {{ warning.trigger_count }} 项 · 风险指数 {{ warning.risk_index }}× · 预期损失 {{ wan(warning.expected_loss) }}</div>
              <div class="tp-suggest">依据后端 warning/decision 生成；完整原因见下方预警条。</div>
            </div>
          </div>
        </div>
        <details class="expand-strip" v-if="pendingTurnKeys.length">
          <summary>其他拐点 · 数据待接入 {{ pendingTurnKeys.length }} 项</summary>
          <ul>
            <li v-for="k in pendingTurnKeys" :key="k"><b>{{ turningCards[k] && turningCards[k].title }}</b>：{{ turningCards[k] && turningCards[k].condition }}</li>
          </ul>
        </details>

        <!-- 风险预警 banner -->
        <div class="warn-banner" :style="{ borderColor: warning.color, background: warning.color + '14' }">
          <div class="warn-left">
            <span class="warn-dot" :style="{ background: warning.color }"></span>
            <div>
              <div class="warn-title">当前供应链预警 · {{ warning.label }}</div>
              <div class="warn-reason">{{ warning.reason }}</div>
            </div>
          </div>
          <div class="warn-right">
            <span>触发 {{ warning.trigger_count }} 项<br>风险指数 <b>{{ warning.risk_index }}×</b></span>
            <span>风险评分 {{ warning.risk_score }} / 阈值 60<br>预期损失 {{ wan(warning.expected_loss) }}</span>
            <span>响应时限 <b>{{ warning.deadline || '按等级' }}</b><br>2032前高情景 {{ wan(warning.expected_loss_high) }}</span>
          </div>
        </div>
      </div>

      <!-- 第三部分：关键风险预测（评分 / 统计，非概率外推） -->
      <div class="pred-section" v-if="analysisOk">
        <div class="pred-section-title"><span class="pred-section-mark"></span>关键风险预测<span class="pred-section-sub">风险评分与历史波动统计 · 明确标注非概率</span></div>
        <div class="risk-grid">
          <!-- 当前核心挑战（替代原价格风险摘要；统计参数已隐藏，保留后端不展示） -->
          <div class="ana-card">
            <div class="ana-card-head ana-card-head--wrap">
              <span class="ana-card-title">当前核心挑战</span>
              <span class="ana-en-sub">CURRENT CHALLENGES</span>
            </div>
            <p class="chall-summary" v-if="challengeSummary">{{ challengeSummary }}</p>
            <div v-if="challenges.length" class="chall-list">
              <div v-for="c in challenges" :key="c.n" class="chall-item">
                <span class="chall-idx">{{ c.n }}</span>
                <div class="chall-body">
                  <div class="chall-head"><b>{{ c.title }}</b><span class="chall-tag" :class="'tone-' + c.tone">{{ c.tag }}</span></div>
                  <p class="chall-desc">{{ c.desc }}</p>
                </div>
              </div>
            </div>
            <div v-else class="ana-msg">关键风险挑战暂不可用</div>
          </div>

          <!-- 供应/来源风险评分 -->
          <div class="ana-card">
            <div class="ana-card-head"><span class="ana-card-title">供应 / 来源风险评分</span><el-tag size="small" type="warning" effect="plain">评分 ≠ 概率</el-tag></div>
            <table v-if="supplyItems.length" class="risk-table">
              <thead><tr><th>来源</th><th>评分</th><th>等级</th><th>主要风险因素</th></tr></thead>
              <tbody>
                <tr v-for="it in supplyItems" :key="it.country">
                  <td><b>{{ it.country }}</b></td>
                  <td>{{ it.score }}</td>
                  <td><span class="level-tag" :style="levelStyle(it.level)">{{ it.level }}</span></td>
                  <td class="risk-factors"><span v-for="f in it.top_factors" :key="f.key" class="factor-chip">{{ fkLabel(f.key) }} {{ f.value }}</span></td>
                </tr>
              </tbody>
            </table>
            <div v-else class="ana-msg">{{ analysis?.supplyRisks?.message || '暂无供应商风险画像数据' }}</div>
            <div class="ana-note" v-if="supplyItems.length">{{ analysis?.supplyRisks?.note }}（权重：地缘 .35 / 生产 .25 / 政策 .20 / 运输 .10 / 价格 .10）</div>
          </div>

          <!-- 潜在影响 / 预期损失（Expected Loss Model, 情景参数驱动） -->
          <div class="ana-card loss-card" style="grid-column:1/-1" v-if="lossData">
            <div class="ana-card-head ana-card-head--wrap">
              <span class="ana-card-title">潜在影响 / 损失研判</span>
              <div class="loss-head-right">
                <!-- 主状态仅保留一个 Tag；概率来源/可信度移入“查看计算依据”，不占主视图 -->
                <span class="loss-mode-tag">{{ lossModeText(lossActive) }}</span>
              </div>
            </div>

            <!-- 摘要 -->
            <!-- 综合判断：只给潜在损失程度，不展示具体金额 -->
            <div v-if="lossActive" class="loss-assessment">
              
              <div class="scn-impact-row">
                <i>当前情景影响程度</i>
                <b>{{ lossLevel(lossActive.expected_loss) }}</b>
              </div>
              <p class="loss-assess-line">{{ lossNarrative }}</p>
            </div>

            <!-- 情景切换 + 调整参数 -->
            <div class="loss-scn-row">
              <el-radio-group v-model="lossScenario" size="small" @change="onLossScenarioChange">
                <el-radio-button v-for="k in scnKeys" :key="k" :label="k">{{ scnName(k) }}</el-radio-button>
                <el-radio-button label="custom" v-if="lossScenario === 'custom'">自定义情景</el-radio-button>
              </el-radio-group>
              <el-button size="small" plain type="primary" @click="openLossAdjust">调整参数</el-button>
            </div>

            <!-- 情景比较：只显示等级 -->
            <div class="loss-scn-compare" v-if="lossData">
              <div v-for="r in scnKeys" :key="r" class="scn-comp" :class="{ active: lossScenario === r }">
                <i>{{ scnName(r) }}</i>
                <b>潜在损失：{{ lossLevel(scenarioLoss(r)) }}</b>
              </div>
            </div>

            <div class="loss-grid2" v-if="lossActive">
              <!-- 主要影响来源（相对排序，无金额） -->
              <div class="loss-panel">
                <div class="loss-panel-title">主要影响来源 <span class="muted">（当前潜在影响主要来自哪里 · 无金额）</span></div>
                <div class="imp-bars">
                  <div v-for="k in contribKeysPos" :key="k" class="imp-row">
                    <span class="imp-name">{{ shareLabel(k) }}</span>
                    <div class="imp-track"><i :style="{ width: contribPct(k) + '%' }"></i></div>
                    <b class="imp-cat" :class="'cat-' + contribRank(k)">{{ contribCat(k) }}</b>
                  </div>
                  <div v-if="contribInv" class="imp-row imp-row--inv">
                    <span class="imp-name">库存缓冲</span>
                    <div class="imp-track imp-track--dim"><i></i></div>
                    <b class="imp-cat dim">抵减因素</b>
                  </div>
                </div>
              </div>
              <!-- 关键影响因素 -->
              <div class="loss-panel">
                <div class="loss-panel-title">关键影响因素 <span class="muted">（哪些变化最容易放大潜在损失）</span></div>
                <div class="driver-list" v-if="driverRows.length">
                  <span v-for="(d,i) in driverRows" :key="d.factor" class="driver-item">
                    <em>{{ i + 1 }}</em>{{ driverLabel(d.factor) }} <b class="drv-word">{{ driverImpactWord(i) }}</b>
                  </span>
                </div>
                <div v-else class="muted">暂无可用的影响因素排序</div>
              </div>
            </div>

            <!-- 增加 / 降低条件（业务解读，无金额） -->
            <div class="loss-cond-grid" v-if="lossActive">
              <div class="loss-cond">
                <div class="loss-cond-title">潜在损失增加的情况</div>
                <ul class="loss-cond-list">
                  <li v-for="x in raiseConds" :key="x.t"><b>{{ x.t }}</b>{{ x.d }}</li>
                </ul>
              </div>
              <div class="loss-cond">
                <div class="loss-cond-title">潜在损失降低的情况</div>
                <ul class="loss-cond-list">
                  <li v-for="x in lowerConds" :key="x.t"><b>{{ x.t }}</b>{{ x.d }}</li>
                </ul>
              </div>
            </div>

            <!-- 三档说明（典型情况参考） -->
            <details class="ana-evidence">
              <summary>三档说明：潜在损失程度 较低 / 中等 / 较高 的典型情形</summary>
              <div class="tier-legend">
                <div><b>较低</b>供应扰动范围有限、替代来源能够及时补充、交付恢复较快、受影响采购范围较小</div>
                <div><b>中等</b>部分采购受影响、需要替代采购、存在一定交付延误、供应链仍有一定缓冲能力</div>
                <div><b>较高</b>供应扰动范围扩大、替代采购难度提高、替代价差扩大、延误时间较长、缓冲能力下降</div>
              </div>
            </details>

            <!-- 参数/依据 -->
            <details class="ana-evidence">
              <summary>查看计算依据（参数 / 来源 / 公式 / 模型信息）</summary>
              <div class="loss-evidence" v-if="lossActive">
                <div class="upstream-risk" v-if="lossData.risk_score && lossData.risk_score.available">
                  <b>上游趋势风险信号</b>
                  <span>趋势风险评分：{{ lossData.risk_score.score }}/100</span>
                  <p class="muted">来源：长期趋势 / 近期动量 / 波动 / 异常 / 预测。该评分描述市场趋势相关风险信号强弱，不随低风险 / 基准 / 高风险损失情景切换而改变，也不表示事件发生概率。</p>
                </div>
                <table class="param-table" v-if="lossData.params || lossActive">
                  <thead><tr><th>参数</th><th>取值</th><th>数据来源</th></tr></thead>
                  <tbody>
                    <tr v-for="k in paramKeys" :key="k">
                      <td>{{ paramLabel(k) }}</td>
                      <td>{{ paramText(k) }}</td>
                      <td>{{ sourceText(lossData.field_sources?.[k]) }}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="formula-box">
                  <p><b>模型公式：</b>{{ lossActive.trace?.formula }}</p>
                  <ul>
                    <li v-for="(s,i) in lossActive.trace?.steps || []" :key="i">
                      {{ s.label }}：{{ s.formula }} = <b>{{ fmtMoney(s.result) }}</b>
                    </li>
                  </ul>
                  <p class="muted">模型版本 {{ lossData.model_version }} · 情景版本 {{ lossData.scenario_version }} · 最近计算 {{ fmtTime(lossData.calculated_at) }}</p>
                </div>
              </div>
            </details>
          </div>
          <div class="ana-card" style="grid-column:1/-1" v-else>
            <div class="ana-msg">{{ analysis?.lossEstimation?.message || '损失估算暂不可用' }}</div>
          </div>
        </div>
      </div>

      <!-- 调整损失情景参数（只向后端提交，不前端算） -->
      <el-dialog v-model="lossAdjustVisible" title="调整损失情景参数" width="560px" @closed="lossAdjustVisible = false">
        <div class="loss-adj-form" v-if="lossDraft">
          <el-form label-position="left" label-width="150px" size="small">
            <el-form-item label="风险发生概率(%)"><el-input-number v-model="lossDraft.risk_probability" :min="0" :max="1" :step="0.01" :precision="2" style="width:180px" /></el-form-item>
            <el-form-item label="受影响采购量(吨)"><el-input-number v-model="lossDraft.affected_quantity" :min="0" :step="10" style="width:180px" /></el-form-item>
            <el-form-item label="替代采购价差(元/吨)"><el-input-number v-model="lossDraft.replacement_price_diff" :min="0" :step="10" style="width:180px" /></el-form-item>
            <el-form-item label="预计延误(天)"><el-input-number v-model="lossDraft.delay_days" :min="0" :step="1" style="width:180px" /></el-form-item>
            <el-form-item label="每日延误成本(元/天)"><el-input-number v-model="lossDraft.delay_cost_per_day" :min="0" :step="1000" style="width:180px" /></el-form-item>
            <el-form-item label="合同违约成本(元)"><el-input-number v-model="lossDraft.penalty_cost" :min="0" :step="10000" style="width:180px" /></el-form-item>
            <el-form-item label="紧急物流成本(元)"><el-input-number v-model="lossDraft.emergency_logistics_cost" :min="0" :step="10000" style="width:180px" /></el-form-item>
            <el-form-item label="库存缓冲抵减(元)"><el-input-number v-model="lossDraft.inventory_buffer_offset" :min="0" :step="10000" style="width:180px" /></el-form-item>
          </el-form>
        </div>
        <template #footer>
          <el-button size="small" @click="lossRestoreDefaults">恢复当前情景默认值</el-button>
          <el-button size="small" @click="lossAdjustVisible = false">取消</el-button>
          <el-button size="small" type="primary" @click="lossApplyCustom" :loading="lossCalcLoading">重新计算（后端）</el-button>
        </template>
      </el-dialog>

      <!-- ACTION PLAN · 处置预案 -->
      <div class="pred-section" v-if="plan">
        <div class="pred-section-title"><span class="pred-section-mark"></span>ACTION PLAN · 处置预案<span class="pred-section-sub">决策支持建议（非自动执行指令）</span></div>
        <div class="plan-card">
          <div class="plan-head">
            <div class="plan-title-wrap"><b>{{ plan.title }}</b><span class="plan-tag">建议方案 · 非自动执行</span></div>
            <span class="plan-meta">触发原因：{{ plan.trigger_condition }} · 响应时限：{{ plan.deadline }}</span>
          </div>
          <p class="plan-objective">目标：{{ plan.objective }}</p>
          <div class="plan-actions">
            <div class="plan-action" v-for="a in plan.actions" :key="a.order">
              <span class="plan-order">{{ a.order }}</span>
              <div class="plan-a-body">
                <div class="plan-a-title">{{ a.title }} <span class="plan-pri" :class="'pri-'+a.priority">{{ a.priority === 'high' ? '高' : a.priority === 'medium' ? '中' : '低' }}优先</span></div>
                <p>{{ a.detail }}</p>
              </div>
            </div>
          </div>
          <p class="plan-note">{{ plan.disclaimer }}  基准预期损失 {{ wan(plan.loss_reference?.expected_loss_base) }} · 高风险情景 {{ wan(plan.loss_reference?.expected_loss_high) }}（未做策略效果/净收益估算）</p>
        </div>
      </div>

      <!-- 第四部分：详细预测模型结果（原有真实图表保留） -->
      <div class="pred-section">
        <div class="pred-section-title"><span class="pred-section-mark"></span>详细预测模型结果</div>

        <!-- GPR 铀价格预测（整行，已去除右侧预测结论） -->
        <div class="pred-card" style="margin-bottom:1rem">
          <div class="pred-card-title">GPR 高斯过程回归 — {{ gprTitle }}</div>
          <div ref="gprChart" class="pred-chart" style="height:320px"></div>
        </div>

        <!-- 供需缺口 + 多模型对比 -->
        <div class="pred-row">
          <div class="pred-left">
            <div class="pred-card">
              <div class="pred-card-title">供需缺口预测 (2024-2030)</div>
              <div ref="gapChart" class="pred-chart"></div>
            </div>
          </div>
          <div class="pred-right">
            <div class="pred-card">
              <div class="pred-card-title">多模型预测对比</div>
              <div ref="modelCompareChart" class="pred-chart" style="height:220px"></div>
              <div class="pred-model-notes">
                <template v-for="m in modelComparison.models" :key="m.name">
                  <span class="pred-model-tag" :class="modelTagClass(m.name)">{{ m.name }}</span>
                  {{ m.summary }}
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 情景概率演化 + 解读（存量展示保留） -->
        <div class="pred-row">
          <div class="pred-full">
            <div class="pred-card">
              <div class="pred-card-title">情景概率随时间演化</div>
              <div class="pred-scenario-row">
                <div class="pred-scenario-chart">
                  <div ref="scenarioEvoChart" class="pred-chart"></div>
                </div>
                <div class="pred-scenario-interp">
                  <div class="pred-scenario-interp-title">情景解读</div>
                  <ul class="pred-list">
                    <li v-for="(interp, idx) in scenarioEvolution.interpretations" :key="idx" v-html="interp"></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 详细验证报告抽屉 -->
    <el-drawer v-model="verifyDrawer" size="85%" title="详细验证报告" destroy-on-close>
      <VerificationReport page="research" :scenario="scenario" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getResearchData, calculateLoss } from '@/api/situation'
import VerificationReport from './VerificationReport.vue'

const props = defineProps({
  scenario: { type: String, default: 'uranium' }
})

const gprChart = ref(null)
const gapChart = ref(null)
const modelCompareChart = ref(null)
const scenarioEvoChart = ref(null)
const trendChart = ref(null)
const turningChart = ref(null)
const cycleChart = ref(null)
const cycleCompChart = ref(null)
const chartData = ref(null)
const loading = ref(true)
const error = ref(null)
const verifyDrawer = ref(false)
let charts = []

const isAuto = computed(() => props.scenario === 'auto')

// ── 从 API 数据派生 ─────────────────────
const dashboardSummary = computed(() => chartData.value?.dashboardSummary || [])
const modelComparison = computed(() => chartData.value?.modelComparison || { xAxis: [], models: [] })
const scenarioEvolution = computed(() => chartData.value?.scenarioEvolution || { xAxis: [], scenarios: [], interpretations: [] })

// 新增：真实态势分析（后端真实计算）
const analysis = computed(() => chartData.value?.situationAnalysis || null)
const analysisOk = computed(() => !!analysis.value && analysis.value.status === 'success')
const trendInfo = computed(() => {
  const t = analysis.value?.trend
  if (!t || t.status !== 'success') return null
  return {
    axis: t.x_axis || [], hist: t.historical_series || [],
    long: t.long_term, recent: t.recent, roll: t.rolling, vol: t.volatility,
    anom: t.anomalies || [], cp: t.change_points || [], fc: t.forecast,
    sum: t.summary, side: t.sideways, evidence: t.evidence || [],
  }
})
const turningInfo = computed(() => {
  const t = analysis.value?.turningPoint
  if (!t || t.status !== 'success') return null
  return { signal: t.turning_signal, strength: t.signal_strength, evidence: t.evidence }
})
const turningPoints = computed(() => (analysis.value?.turningPoint?.historical_turning_points || []).slice(-8))
const turningFull = computed(() => (analysis.value?.turningPoint?.historical_turning_points || []))
const turningCount = computed(() => turningFull.value.length)
const turningMaxTxt = computed(() => {
  const peak = [...turningFull.value].filter(p => p.type === 'peak').sort((a, b) => (b.value || 0) - (a.value || 0))[0]
  return peak ? `${peak.date}·${num(peak.value)}` : '—'
})

// 周期（多方法：FFT主周期 + ACF辅助 + Harmonic，稳定/候选/弱/无 四态）
const cycle = computed(() => analysis.value?.cycle || null)
const cycleStatus = computed(() => cycle.value?.cycle_status || 'no_cycle')
const cycleShown = computed(() => ['stable', 'candidate', 'weak'].includes(cycleStatus.value) && !!cycle.value && cycle.value.dominant_period)
const stageLabel = (p) => ({ rising: '上行阶段', high: '高位附近', falling: '下行阶段', low: '低位附近', uncertain: '不确定' })[p] || p || '—'
const cycleStatusMeta = (s) => ({
  stable: { label: '稳定周期', type: 'success' },
  candidate: { label: '候选周期', type: 'warning' },
  weak: { label: '弱周期', type: 'warning' },
  no_cycle: { label: '无周期', type: 'info' },
}[s] || { label: s, type: 'info' })
const relLabel = (r) => ({ high: '高', medium: '中', low: '低' })[r] || r || '—'
const priceRisk = computed(() => {
  const p = analysis.value?.priceRisk
  return p && p.latest_value != null ? p : null
})
const supplyItems = computed(() => (analysis.value?.supplyRisks?.items || []))
// 当前核心挑战：状态全部来自现有真实分析字段，不重复顶部大数字；缺库存/LeadTime/合同数据只作“数据可见性”表述
const dashboardFind = (kw) => (dashboardSummary.value || []).find(d => String(d.label || '').includes(kw))
const challenges = computed(() => {
  const out = []
  const tight = dashboardFind('供需缺口')
  if (tight) {
    out.push({ n: '01', title: '供需紧平衡压力', tag: '偏紧', tone: 'warn',
      desc: '有效供给对需求覆盖不足，供需缺口仍然存在；新增供给释放速度与需求增长之间存在错配压力。' })
  }
  const srcs = supplyItems.value
  if (srcs.length) {
    const hs = srcs.filter(s => s.level === '高' || s.level === '中').length
    out.push({ n: '02', title: '供应来源集中与地缘风险', tag: hs ? `${hs} 个高中风险源` : '需关注', tone: 'warn',
      desc: hs ? '部分关键供应来源受地缘政治、政策变化及运输扰动影响，供应稳定性存在较高外部依赖。'
             : '部分关键供应来源存在外部依赖，需关注地缘与政策变化对供应稳定性的影响。' })
  }
  if (priceRisk.value) {
    const v = trendInfo.value && trendInfo.value.sum && trendInfo.value.sum.volatility_text
    out.push({ n: '03', title: '价格波动与采购成本不确定性', tag: v && v.includes('收敛') ? '收敛中' : '需关注', tone: 'info',
      desc: '历史价格波动幅度较大，市场价格变化可能增加采购预算、长协谈判与现货补充的不确定性。' })
  }
  // 供应弹性与替代能力(解读性挑战,基于供给偏紧+矿山/新增产能释放周期长的真实背景;不虚构统计数字)
  if (dashboardFind('供需缺口') || dashboardFind('风险等级')) {
    out.push({ n: '04', title: '供应弹性与替代能力有限', tag: '弹性偏弱', tone: 'warn',
      desc: '新增产能释放与替代来源扩展周期较长，短期内难以快速填补供给缺口，主要供应来源发生扰动时，替代采购与供应恢复空间有限。' })
  }
  return out.slice(0, 4)
})
const challengeSummary = computed(() => {
  if (dashboardFind('供需缺口') || dashboardFind('风险等级')) {
    return '当前风险主要集中在供需紧平衡、供应来源稳定性及采购成本不确定性。'
  }
  return '当前需优先关注供需平衡、供应来源稳定性与采购成本的变化。'
})
const cycleWindowText = (w) => (w && w.start ? `${w.start}–${w.end}` : '—')

// ===== 潜在影响 / 预期损失（Expected Loss Model, 数据来自后端 lossEstimation / /loss-estimation） =====
const lossChart = ref(null)
const lossDriversChart = ref(null)
const lossData = ref(null)
const lossScenario = ref('base')
const lossAdjustVisible = ref(false)
const lossCalcLoading = ref(false)
const lossDraft = ref(null)

function initLossFromAnalysis() {
  const le = analysis.value?.lossEstimation
  if (le && le.status === 'available') {
    lossData.value = le
    const as = le.active_scenario
    const key = typeof as === 'string' ? as : (as && (as.key || as.scenario_key))
    lossScenario.value = (key && key !== 'custom') ? key : 'base'
  } else {
    lossData.value = null
  }
}
const scnKeys = ['low', 'base', 'high']
const scnName = (k) => ({ low: '低风险情景', base: '基准情景', high: '高风险情景' }[k] || k)
const scnNameShort = (k) => ({ low: '低风险', base: '基准', high: '高风险' }[k] || k)
const scnKeyOf = () => {
  const s = lossScenario
  if (typeof s === 'string') return s
  if (s && typeof s === 'object') return s.key || s.scenario_key || 'base'
  return 'base'
}
const scnPhrase = () => {
  const k = scnKeyOf()
  if (k !== 'custom') return `${scnNameShort(k)}情景`
  const a = lossActive.value
  const L = scenarioLabelOf(a && (a.scenario_name || a))
  return L.endsWith('情景') ? L : `${L}情景`
}
const lossActive = computed(() => {
  if (!lossData.value) return null
  if (lossScenario.value === 'custom') return lossData.value.active
  return lossData.value.scenarios?.[lossScenario.value] || lossData.value.active || null
})
const shareRows = computed(() => {
  const c = lossActive.value?.contribution
  if (!c) return []
  return [['replacement', '替代采购'], ['delay', '延误成本'], ['penalty', '合同违约'], ['logistics', '紧急物流']]
    .map(([k, label]) => ({ k, label, share: c[k] }))
})
const shareLabel = (k) => ({ replacement: '替代采购', delay: '延误成本', penalty: '合同违约', logistics: '紧急物流' }[k] || k)
const shareColor = (k) => ({ replacement: '#f97316', delay: '#f59e0b', penalty: '#ef4444', logistics: '#64748b' }[k] || '#64748b')
const driverRows = computed(() => (lossActive.value?.sensitivity?.top_loss_drivers || []).slice(0, 5))
const paramKeys = ['risk_probability', 'affected_quantity', 'replacement_price_diff', 'delay_days', 'delay_cost_per_day', 'penalty_cost', 'emergency_logistics_cost', 'inventory_buffer_offset']
const paramLabel = (k) => ({ risk_probability: '风险发生概率', affected_quantity: '受影响采购量', replacement_price_diff: '替代采购价差', delay_days: '预计延误', delay_cost_per_day: '每日延误成本', penalty_cost: '合同违约成本', emergency_logistics_cost: '紧急物流成本', inventory_buffer_offset: '库存缓冲抵减' }[k] || k)
const paramText = (k) => {
  const p = lossActive.value
  if (!p) return '—'
  const v = p[k]
  if (k === 'risk_probability') return pct2(v)
  const unit = k === 'affected_quantity' ? ' 吨' : k === 'replacement_price_diff' ? ' 元/吨' : k === 'delay_days' ? ' 天' : k === 'delay_cost_per_day' ? ' 元/天' : ''
  return `${fmtMoney(v)}${unit}`
}
const sourceText = (s) => ({ actual: '实际业务数据', risk_model: '模型计算', model: '模型计算', scenario_assumption: '情景假设', scenario: '情景假设', manual: '用户设定' }[s] || s || '—')
const probSourceText = (s) => sourceText(s)
const scenarioLabelOf = (o) => {
  if (o == null) return '当前'
  if (typeof o === 'string') return o || '当前'
  if (typeof o === 'object') return o.label || o.name || o.scenario_name || '当前'
  return '当前'
}
const lossModeText = (a) => (a ? `${scenarioLabelOf(a.scenario_name || a)} · 情景估算` : '情景估算')
const wan = (v) => (v == null || isNaN(v) ? '—' : `${(v / 10000).toFixed(2)} 万`)
const fmtMoney = (v) => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString('zh-CN'))
const pct2 = (v) => (v == null || isNaN(v) ? '—' : `${(v * 100).toFixed(0)}%`)
const fmtTime = (s) => (s ? String(s).replace('T', ' ').slice(0, 16) : '—')

// ── 潜在损失研判展示层（内部金额模型保留，仅用于定级/叙述，不展示金额） ──
const lossAnchors = () => {
  const d = lossData.value || {}
  const pull = (o) => (o && o.expected_loss != null ? o.expected_loss : null)
  const raw = []
  const s = d.scenarios || {}; const r = d.range || {}
  for (const key of ['low', 'base', 'high']) {
    const v = pull(s[key]) != null ? pull(s[key]) : pull(r[key])
    if (v != null) raw.push(v)
  }
  if (!raw.length) return null
  const u = [...new Set(raw)].sort((a, b) => a - b)
  return { low: u[0], high: u[u.length - 1], mid: u[Math.floor((u.length - 1) / 2)] }
}
const lossLevel = (amt) => {
  if (amt == null || isNaN(amt)) return '—'
  const a = lossAnchors()
  if (!a) return '—'
  if (amt < (a.low + a.mid) / 2) return '较低'
  if (amt < (a.mid + a.high) / 2) return '中等'
  return '较高'
}
const scenarioLoss = (key) => {
  const d = lossData.value || {}
  const o = (d.scenarios || {})[key] || (d.range || {})[key] || {}
  return o.expected_loss
}
const conAmt = (k) => {
  const v = (lossActive.value && lossActive.value.contribution) ? lossActive.value.contribution[k] : null
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'object') return (v.amount != null ? v.amount : (v.share != null ? v.share : 0))
  return 0
}
const contribKeysPos = computed(() => ['replacement', 'delay', 'penalty', 'logistics'].filter(k => conAmt(k) > 0))
const posSorted = () => contribKeysPos.value.slice().sort((a, b) => conAmt(b) - conAmt(a))
const contribRank = (k) => posSorted().indexOf(k)
const contribCat = (k) => { const rk = contribRank(k); if (rk < 2) return '主要影响'; if (rk === 2) return '影响中等'; return '影响有限' }
const contribPct = (k) => {
  const tot = contribKeysPos.value.reduce((s, kk) => s + conAmt(kk), 0)
  return tot ? Math.round((conAmt(k) / tot) * 100) : 0
}
const contribInv = computed(() => {
  const o = lossActive.value ? lossActive.value.inventory_buffer_offset : null
  return typeof o === 'number' && o !== 0
})
const driverLabel = (f) => paramLabel(f)
const driverImpactWord = (i) => (['影响最大', '影响较大', '影响较大', '中等影响', '中等影响'][i]) || '影响较小'
const raiseConds = [
  { t: '受影响采购规模扩大', d: '更多采购量受到供应扰动影响时，需要替代采购或应急调配的规模随之扩大。' },
  { t: '替代采购价差扩大', d: '原供应来源受限后，若替代采购价格明显高于正常水平，采购成本压力进一步增加。' },
  { t: '交付延误时间延长', d: '供应恢复越慢，对生产计划、合同履约和应急调度的影响越明显。' },
  { t: '风险发生可能性升高', d: '供应扰动发生可能性进一步上升时，整体潜在损失水平随之提高。' },
  { t: '紧急物流或违约压力增加', d: '需要临时运输、加急调配或面临合同履约压力时，整体影响进一步放大。' },
]
const lowerConds = [
  { t: '提前锁定部分采购量', d: '减少未来价格或供应波动带来的影响。' },
  { t: '替代供应来源及时到位', d: '降低单一供应来源受扰后的采购压力。' },
  { t: '交付周期较快恢复', d: '缩短延误持续时间，缓解生产与履约压力。' },
  { t: '受影响采购范围缩小', d: '降低需要临时替代的业务规模。' },
  { t: '库存缓冲能力增强', d: '库存缓冲增强时，可在供应中断期间提供更长的调整时间。' },
]
const lossNarrative = computed(() => {
  const a = lossActive.value
  const raw = lossScenario.value
  if (!a) return ''
  const k = typeof raw === 'string' ? raw : (raw && (raw.key || raw.scenario_key)) || 'base'
  let phrase
  if (k !== 'custom') {
    phrase = `${({ low: '低风险', base: '基准', high: '高风险' }[k] || k)}情景`
  } else {
    const L = scenarioLabelOf(a.scenario_name || a)
    phrase = L.endsWith('情景') ? L : `${L}情景`
  }
  const lv = lossLevel(a.expected_loss)
  const top = posSorted().slice(0, 2).map(shareLabel).filter(Boolean).join('、') || '替代采购与交付延误'
  return `当前${phrase}下，潜在损失程度${lv}。主要影响来自${top}；若供应扰动扩大、受影响采购规模增加或替代采购价差上升，潜在损失程度将进一步提高。`
})

function loadLossByScenario(key) {
  if (!lossData.value || key === 'custom') return
  lossScenario.value = key
  nextTick(() => initLossCharts())
}
function onLossScenarioChange(k) {
  loadLossByScenario(k)
}
function openLossAdjust() {
  const base = lossData.value?.scenarios?.base
  if (!base) return
  lossDraft.value = { ...pickParams(base) }
  lossAdjustVisible.value = true
}
function pickParams(obj) {
  return {
    risk_probability: obj.risk_probability, affected_quantity: obj.affected_quantity,
    replacement_price_diff: obj.replacement_price_diff, delay_days: obj.delay_days,
    delay_cost_per_day: obj.delay_cost_per_day, penalty_cost: obj.penalty_cost,
    emergency_logistics_cost: obj.emergency_logistics_cost, inventory_buffer_offset: obj.inventory_buffer_offset,
  }
}
function lossRestoreDefaults() {
  const base = lossData.value?.scenarios?.base
  if (!base) return
  lossDraft.value = { ...pickParams(base) }
}
async function lossApplyCustom() {
  if (!lossDraft.value) return
  lossCalcLoading.value = true
  try {
    const r = await calculateLoss({ ...lossDraft.value })
    if (r && r.success && r.data) {
      const oldRisk = lossData.value && lossData.value.risk_score
      lossData.value = r.data
      if (oldRisk && oldRisk.available && !(r.data.risk_score || {}).available) lossData.value.risk_score = oldRisk
      lossScenario.value = 'custom'
      lossAdjustVisible.value = false
      await nextTick()
      initLossCharts()
    } else {
      console.warn('loss custom calculate failed', r && r.message)
    }
  } catch (e) {
    console.warn('loss custom calculate error', e)
  } finally {
    lossCalcLoading.value = false
  }
}
function initLossCharts() {
  initLossBreakdown()
  initLossDrivers()
}
function initLossBreakdown() {
  const el = lossChart.value
  const a = lossActive.value
  if (!el || !a || !a.contribution) return
  const inst = echarts.getInstanceByDom(el); if (inst) inst.dispose()
  const c = echarts.init(el); charts.push(c)
  const con = a.contribution
  const rows = [
    { name: '替代采购', v: con.replacement.amount },
    { name: '延误成本', v: con.delay.amount },
    { name: '合同违约', v: con.penalty.amount },
    { name: '紧急物流', v: con.logistics.amount },
    { name: '库存缓冲', v: -a.inventory_buffer_offset },
  ]
  const cats = rows.map(r => r.name)
  const vals = rows.map(r => +(r.v / 10000).toFixed(2))
  c.setOption({
    tooltip: { trigger: 'item', formatter: (p) => `${p.name}：${p.value} 万元` },
    grid: { left: 66, right: 40, top: 10, bottom: 24 },
    xAxis: { type: 'value', name: '万元' },
    yAxis: { type: 'category', data: cats, axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar', data: vals, barWidth: '55%',
      itemStyle: { color: (p) => (p.value >= 0 ? '#f59e0b' : '#10b981'), borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', formatter: p => `${p.value}万`, fontSize: 10 },
    }],
  })
}
function initLossDrivers() {
  const el = lossDriversChart.value
  const a = lossActive.value
  if (!el || !a || !driverRows.value.length) return
  const inst = echarts.getInstanceByDom(el); if (inst) inst.dispose()
  const c = echarts.init(el); charts.push(c)
  const rows = [...driverRows.value].reverse()
  const cats = rows.map(d => d.label)
  const vals = rows.map(d => +(d.impact / 10000).toFixed(2))
  c.setOption({
    tooltip: { trigger: 'item', formatter: (p) => `${p.name}：±10% 使预期损失变动 ${p.value} 万元` },
    grid: { left: 96, right: 46, top: 8, bottom: 24 },
    xAxis: { type: 'value', name: '预期损失变动(万元)' },
    yAxis: { type: 'category', data: cats, axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar', data: vals, barWidth: '55%',
      itemStyle: { color: '#6366f1', borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', formatter: p => `${p.value}万`, fontSize: 10 },
    }],
  })
}

const dec = computed(() => analysis.value?.decision || null)
const cycleCards = computed(() => dec.value?.cycle || {})
const cycleTitle = (k) => ({ price: '价格周期', supply_demand: '供需周期（代理）', inventory: '库存周期', logistics: '交付周期', procurement: '采购周期' }[k] || k)
const turningCards = computed(() => dec.value?.turning_points || {})
const warning = computed(() => dec.value?.warning || {})
const plan = computed(() => dec.value?.action_plan || null)
const pendingCycleKeys = computed(() => Object.keys(cycleCards.value || {}).filter(k => cycleCards.value[k] && cycleCards.value[k].status === 'unavailable'))
const pendingTurnKeys = computed(() => Object.keys(turningCards.value || {}).filter(k => turningCards.value[k] && turningCards.value[k].confidence === 'unavailable'))
const priceOutlookText = computed(() => {
  const fc = trendInfo.value?.fc
  if (!fc || !fc.forecast_end_year) return '—'
  const dir = fc.direction === 'up' ? '温和上行' : fc.direction === 'down' ? '下行' : '震荡'
  return `若基准预测路径成立，价格中枢预计至 ${fc.forecast_end_year} 保持${dir}（累计 ${sign(fc.predicted_change_pct)}）`
})
const evKeyLabel = (l) => ({ sen_slope: '长期 Sen', ols_slope: '长期 OLS', slope_5y: '5Y', slope_3y: '3Y', volatility_recent: '近5年σ', forecast_change: '预测累计', proxy_score: '代理评分', high_medium_suppliers: '高中风险源' }[l] || l)
const evKeyValue = (l, v) => {
  if (v == null) return '—'
  if (typeof v === 'object') return Array.isArray(v) ? v.join('、') : JSON.stringify(v)
  if (typeof v === 'number') {
    if (l === 'forecast_change' || l === 'proxy_score') return `${(v * 100).toFixed(1)}%`
    if (Math.abs(v) >= 1000) return Number(v).toLocaleString('zh-CN')
    return Number.isInteger(v) ? v : Number(v).toFixed(2)
  }
  return v
}
// 预测节点 2028/2030/2032(直接取后端 forecast 数组, 不另算)
const fcNodes = computed(() => {
  const t = analysis.value?.trend
  if (!t) return []
  const fc = t.forecast || {}
  const fy = fc.forecast_years || []
  const out = []
  for (const y of [2028, 2030, 2032]) {
    const i = fy.findIndex(v => String(v) === String(y))
    if (i >= 0 && fc.values && fc.values[i] != null) {
      out.push({ year: y, mean: fc.values[i], lo80: (fc.lower_80 || [])[i], hi80: (fc.upper_80 || [])[i], lo95: (fc.lower_95 || [])[i], hi95: (fc.upper_95 || [])[i] })
    }
  }
  return out
})

// 趋势主图时间窗口与概览(纯前端视图控制, 不参与业务计算)
const trendWindow = ref('recent')
const trendOverviewChart = ref(null)
const trendWindows = [
  { key: 'recent', label: '近期(2016–2032)' },
  { key: '10y', label: '10Y' },
  { key: 'all', label: '全历史' },
]
const setTrendWindow = (k) => { trendWindow.value = k; nextTick(() => initTrendChart()) }
const priceStageShort = computed(() => {
  const pc = dec.value?.cycle?.price
  if (pc && pc.status !== 'unavailable' && pc.label) return pc.label
  if (trendInfo.value && trendInfo.value.sum) return trendInfo.value.sum.recent_text
  return '—'
})
const forecastAt = (y) => {
  const t = analysis.value?.trend
  if (!t) return null
  const fc = t.forecast || {}
  const fy = fc.forecast_years || []
  const i = fy.findIndex(v => String(v) === String(y))
  return i >= 0 && fc.values ? fc.values[i] : null
}
const pi2032 = computed(() => fcNodes.value)

const gprTitle = computed(() => {
  const gpr = chartData.value?.gprPrediction
  if (!gpr) return '预测'
  return isAuto.value ? `新能源汽车产量预测 (${gpr.unit})` : `U3O8 现货价预测 (${gpr.unit})`
})

function getIcon(variant) {
  const map = { 'price-up': '📈', 'supply-tight': '⚠️', 'risk-high': '🚨', 'overall': '🧠' }
  return map[variant] || '📊'
}

function modelTagClass(name) {
  const map = { 'GPR': 'gpr', 'LSTM': 'lstm', 'Prophet': 'prophet', 'RL-GPR优化': 'rl', 'RL-GPR': 'rl' }
  return map[name] || ''
}

// ── 文案/颜色映射（来自真实算法字段） ──────
const dirCn = (d) => ({ up: '上行', down: '回落', sideways: '横盘' })[d] || '—'
const dirTagType = (d) => (d === 'up' ? 'danger' : d === 'down' ? 'success' : 'info')
const confCn = (c) => ({ high: '高', medium: '中', low: '低' })[c] || c || '—'
const confTag = (c) => ({ high: 'success', medium: 'warning', low: 'info' })[c] || 'info'
const turningLabel = (s) => ({ possible_peak: '见顶信号', possible_trough: '见底信号', none: '无明显信号' })[s] || '—'
const turningTagType = (s) => (s === 'possible_peak' ? 'warning' : s === 'possible_trough' ? 'success' : 'info')
const fkLabel = (k) => ({ geopolitical_risk: '地缘', production_risk: '生产', policy_risk: '政策', transport_risk: '运输', price_volatility: '价格' })[k] || k
const num = (v) => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString())
const pct = (v) => (v == null || isNaN(v) ? '—' : `${(Number(v) * 100).toFixed(1)}%`)
const sign = (v) => (v == null || isNaN(v) ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%`)
const signPct = (v) => (v == null || isNaN(v) ? '—' : `${(Number(v) * 100).toFixed(1)}%`)
const nulls = (n) => Array(n).fill(null)
const snum = (v) => (v == null || isNaN(v) ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}`)
const levelStyle = (lv) => {
  const m = { 高: { color: '#ef4444', background: '#fef2f2', borderColor: '#fecaca' }, 中: { color: '#d97706', background: '#fffbeb', borderColor: '#fde68a' }, 低: { color: '#059669', background: '#ecfdf5', borderColor: '#a7f3d0' } }
  return m[lv] || m['中']
}

// ── API 数据获取 ─────────────────────────
async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const res = await getResearchData(props.scenario)
    if (res.success) {
      chartData.value = res.data
      initLossFromAnalysis()
      await nextTick()
      initAllCharts()
    } else {
      error.value = res.message || '未知错误'
    }
  } catch (e) {
    error.value = e.message || '网络请求失败'
  } finally {
    loading.value = false
  }
}

function chartSeriesMeta() {
  const sa = analysis.value
  return {
    xAxis: sa?.xAxis || [],
    values: sa?.values || [],
    unit: sa?.series?.unit || 'USD/lb',
  }
}

// ── 趋势分析图（真实历史 + 真实外推） ─────
function initTrendChart() {
  if (!trendChart.value || !trendInfo.value) return
  const inst = echarts.getInstanceByDom(trendChart.value); if (inst) inst.dispose()
  const c = echarts.init(trendChart.value); charts.push(c)
  const ti = trendInfo.value
  const axis = ti.axis
  const n = axis.length
  const fc = ti.fc || {}
  const fy = fc.forecast_years || []
  const h = fy.length
  const hist = ti.hist || []
  const cat = axis.concat(fy.map(y => `${y}E`))
  const padH = nulls(h)
  const padArr = (arr) => (arr && arr.length ? arr.concat(padH) : nulls(n).concat(padH))
  const fyIdx = new Map(fy.map((s, i) => [Number(s), n + i]))
  const lastY = fc.last_actual_year != null ? Number(fc.last_actual_year) : Number(axis[axis.length - 1])
  const curY = fc.current_year != null ? Number(fc.current_year) : lastY + 1

  // 分段主轨迹：每段含“共享边界点”(仅引用真实/同一预测值，不重算、不插值)
  const A = nulls(cat.length)
  hist.forEach((v, i) => { A[i] = v })
  const G = nulls(cat.length)
  if (lastY >= Number(axis[0])) G[n - 1] = hist[n - 1]
  fy.forEach((s, i) => { const y = Number(s); if (fc.values && y > lastY && y <= curY) G[fyIdx.get(y)] = fc.values[i] })
  const F = nulls(cat.length)
  fy.forEach((s, i) => { const y = Number(s); if (fc.values && y >= curY) F[fyIdx.get(y)] = fc.values[i] })
  const curIdx = fyIdx.get(curY)
  const curVal = curIdx != null && fc.values ? fc.values[curIdx - n] : null

  // 时间窗口
  let i0 = 0
  if (trendWindow.value === 'recent') { const s2 = axis.indexOf('2016'); i0 = s2 >= 0 ? s2 : Math.max(0, axis.length - 5) }
  else if (trendWindow.value === '10y') i0 = Math.max(0, cat.length - 10)
  const i1 = cat.length - 1
  const visCat = cat.slice(i0, i1 + 1)
  const slic = (arr) => (arr ? arr.slice(i0, i1 + 1) : arr)

  // Y 范围只由可见 Actual+Estimate+ForecastMean 决定
  const yvals = []
  for (let i = i0; i <= i1; i++) {
    const v = i < n ? hist[i] : (fc.values || [])[i - n]
    if (v != null && isFinite(v)) yvals.push(v)
  }
  let yMin = 0, yMax = 10
  if (yvals.length) {
    const mn = Math.min(...yvals), mx = Math.max(...yvals)
    const pad = Math.max((mx - mn) * 0.15, 3)
    yMin = Math.max(0, Math.floor(mn - pad)); yMax = Math.ceil(mx + pad)
  }

  // 80% 面积带（视觉用途，不进 Y 范围）
  const bBase = nulls(cat.length)
  const bH = nulls(cat.length)
  if (fc.lower_80 && fc.upper_80) {
    fy.forEach((_, i) => {
      const idx = n + i
      bBase[idx] = fc.lower_80[i]
      bH[idx] = (fc.upper_80[i] != null && fc.lower_80[i] != null) ? fc.upper_80[i] - fc.lower_80[i] : null
    })
  }
  const series = [
    { name: '实际价格', type: 'line', smooth: false, data: slic(A), lineStyle: { color: '#2563eb', width: 2.2 }, symbol: 'none', z: 3 },
    { name: '缺失期估计', type: 'line', smooth: false, data: slic(G), lineStyle: { color: '#f59e0b', width: 2, type: 'dotted' }, symbol: 'none', z: 3 },
    { name: '未来预测', type: 'line', smooth: false, data: slic(F), lineStyle: { color: '#d97706', width: 2.4, type: 'dashed' }, symbol: 'none', z: 3 },
  ]
  if (curVal != null && curIdx != null) {
    series.push({ name: '当前年估计', type: 'scatter', data: [[curIdx, curVal]], symbol: 'circle', symbolSize: 9, itemStyle: { color: '#f59e0b', borderColor: '#fff', borderWidth: 2 }, label: { show: true, position: 'top', formatter: `${curY}E`, fontSize: 9, color: '#b45309' }, z: 6 })
    series.push({ name: '_curLine', type: 'line', data: nulls(cat.length), lineStyle: { opacity: 0 }, symbol: 'none', markLine: { silent: true, symbol: 'none', lineStyle: { color: '#f59e0b', type: 'dashed', width: 1 }, label: { show: true, position: 'start', formatter: `${curY}E 当前年估计`, fontSize: 9, color: '#b45309' }, data: [{ xAxis: `${curY}E` }] } })
  }
  if (ti.recent && ti.recent.fit) series.push({ name: '近期趋势', type: 'line', data: slic(padArr(ti.recent.fit)), lineStyle: { color: '#f97316', width: 3 }, symbol: 'none', z: 2 })
  if (ti.long && ti.long.fit_sen) series.push({ name: '长期稳健趋势(Theil-Sen)', type: 'line', data: slic(padArr(ti.long.fit_sen)), lineStyle: { color: '#2563eb', width: 1.6, type: 'dashed', opacity: 0.75 }, symbol: 'none', z: 1 })
  if (ti.long && ti.long.fit) series.push({ name: '长期趋势(OLS)', type: 'line', data: slic(padArr(ti.long.fit)), lineStyle: { color: '#60a5fa', width: 1.4 }, symbol: 'none', z: 1 })
  if (ti.roll && ti.roll.ma5) series.push({ name: 'MA5', type: 'line', data: slic(padArr(ti.roll.ma5)), lineStyle: { color: '#94a3b8', width: 1 }, symbol: 'none', z: 0 })
  series.push({ name: '_b80base', type: 'line', data: slic(bBase), lineStyle: { opacity: 0 }, symbol: 'none', stack: 'b80', silent: true, tooltip: { show: false }, z: 0 })
  series.push({ name: '_b80area', type: 'line', data: slic(bH), lineStyle: { opacity: 0 }, symbol: 'none', stack: 'b80', areaStyle: { color: 'rgba(249,115,22,0.14)' }, silent: true, tooltip: { show: false }, z: 0 })
  if (trendWindow.value === 'all' && ti.anom && ti.anom.length) {
    series.push({ name: '异常点', type: 'scatter', data: ti.anom.filter(a => axis.indexOf(String(a.year)) >= 0).map(a => ({ value: [axis.indexOf(String(a.year)), a.value], name: `${a.year}` })), symbol: 'pin', symbolSize: 22, itemStyle: { color: '#dc2626' }, label: { show: true, formatter: p => p.data.name, fontSize: 8, color: '#fff' }, z: 5 })
  }

  function dataTypeText(label) {
    const y = Number(String(label).replace('E', ''))
    if (isNaN(y)) return ['', '']
    if (y <= lastY) return ['历史实际', '实际历史价格数据']
    if (y === curY) return ['当前年估计', '当前年度模型估计（年度未完整/待核验）']
    if (y < curY) return ['缺失期估计', '模型回填估计值，非实际历史数据']
    return ['未来预测', '模型预测(Holt)']
  }
  const legendData = series.map(s => s.name).filter(x => !String(x).startsWith('_'))
  const selected = {
    '实际价格': true, '缺失期估计': true, '未来预测': true, '当前年估计': true,
    '近期趋势': true, '长期稳健趋势(Theil-Sen)': true,
    '长期趋势(OLS)': false, 'MA5': false, '异常点': false,
  }
  c.setOption({
    tooltip: {
      trigger: 'axis', confine: true,
      formatter: (params) => {
        const first = params && params[0]
        if (!first) return ''
        const label = String(first.axisValue || '')
        const [type, note] = dataTypeText(label)
        let val = null
        for (const p of params) { if (p.value != null && isFinite(p.value)) { val = p.value; break } }
        const lines = [`<b>${label}</b>`]
        if (val != null) lines.push(`价格：${Number(val).toFixed(2)} $/lb`)
        lines.push(`数据类型：<b>${type}</b>`)
        if (String(label).includes('E') && type === '缺失期估计') lines.push(`<span style="color:#b45309">说明：${note}</span>`)
        else if (type === '未来预测') lines.push(`<span style="color:#b45309">模型：${fc.model_label || 'Holt'}（${note}）</span>`)
        else if (type === '当前年估计') lines.push(`<span style="color:#b45309">${note}</span>`)
        return lines.join('<br/>')
      },
    },
    legend: { top: 2, left: 4, data: legendData, selected, type: 'scroll', textStyle: { fontSize: 10 } },
    grid: { left: 66, right: 36, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: visCat, axisLabel: { rotate: 45, fontSize: 9 } },
    yAxis: { type: 'value', name: '$/lb', nameLocation: 'middle', nameGap: 46, min: yMin, max: yMax },
    series,
  })
}

// Historical Overview: 1997-2032 连续主轨迹（共享边界点） + Theil-Sen
function initTrendOverviewChart() {
  const el = trendOverviewChart.value
  if (!el || !trendInfo.value) return
  const inst = echarts.getInstanceByDom(el); if (inst) inst.dispose()
  const c = echarts.init(el); charts.push(c)
  const ti = trendInfo.value
  const axis = ti.axis
  const n = axis.length
  const fc = ti.fc || {}
  const fy = fc.forecast_years || []
  const h = fy.length
  const hist = ti.hist || []
  const cat = axis.concat(fy.map(y => `${y}E`))
  const lastY = fc.last_actual_year != null ? Number(fc.last_actual_year) : Number(axis[axis.length - 1])
  const curY = fc.current_year != null ? Number(fc.current_year) : lastY + 1
  const padH = nulls(h)
  const A = (hist || []).concat(padH)
  const G = nulls(cat.length)
  if (lastY >= Number(axis[0])) G[n - 1] = hist[n - 1]
  fy.forEach((s, i) => { const y = Number(s); if (fc.values && y > lastY && y <= curY) G[n + i] = fc.values[i] })
  const F = nulls(cat.length)
  fy.forEach((s, i) => { const y = Number(s); if (fc.values && y >= curY) F[n + i] = fc.values[i] })
  const sen = ti.long && ti.long.fit_sen ? (ti.long.fit_sen || []).concat(padH) : null
  c.setOption({
    tooltip: { trigger: 'axis', confine: true },
    grid: { left: 52, right: 30, top: 6, bottom: 22 },
    xAxis: { type: 'category', data: cat, axisLabel: { interval: 5, rotate: 30, fontSize: 8 } },
    yAxis: { type: 'value', name: '$/lb', nameLocation: 'middle', nameGap: 40 },
    series: [
      { name: '实际', type: 'line', data: A, lineStyle: { color: '#2563eb', width: 1.4 }, symbol: 'none', z: 3 },
      { name: '缺失期估计', type: 'line', data: G, lineStyle: { color: '#f59e0b', width: 1.2, type: 'dotted' }, symbol: 'none', z: 3 },
      { name: '未来预测', type: 'line', data: F, lineStyle: { color: '#d97706', width: 1.4, type: 'dashed' }, symbol: 'none', z: 3 },
      ...(sen ? [{ name: 'Theil-Sen', type: 'line', data: sen, lineStyle: { color: '#2563eb', width: 1.1, type: 'dashed', opacity: 0.6 }, symbol: 'none', z: 1 }] : []),
    ],
  })
}
function initTurningChart() {
  if (!turningChart.value || !turningInfo.value) return
  const inst = echarts.getInstanceByDom(turningChart.value); if (inst) inst.dispose()
  const c = echarts.init(turningChart.value); charts.push(c)
  const meta = chartSeriesMeta()
  const idxByDate = {}
  meta.xAxis.forEach((y, i) => { idxByDate[String(y)] = i })
  const peaks = [], troughs = []
  turningPoints.value.forEach(p => {
    const i = idxByDate[String(p.date)]
    if (i == null) return
    ;(p.type === 'peak' ? peaks : troughs).push({ value: [i, p.value], date: p.date, val: p.value })
  })
  const series = [{ name: '价格', type: 'line', smooth: false, data: meta.values, lineStyle: { color: '#2563eb', width: 2.2 }, itemStyle: { color: '#2563eb' }, symbolSize: 5, z: 1 }]
  if (peaks.length) series.push({ name: '高点拐点', type: 'scatter', data: peaks, symbol: 'pin', symbolSize: 40, itemStyle: { color: '#ef4444' }, label: { show: true, formatter: p => `${p.data.date}`, fontSize: 9, color: '#fff', position: 'top' }, z: 3 })
  if (troughs.length) series.push({ name: '低点拐点', type: 'scatter', data: troughs, symbol: 'pin', symbolSize: 34, itemStyle: { color: '#10b981' }, label: { show: true, formatter: p => `${p.data.date}`, fontSize: 9, color: '#fff', position: 'bottom' }, z: 3 })
  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 4, right: 10, data: series.map(s => s.name) },
    grid: { left: 60, right: 40, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: meta.xAxis, axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: { type: 'value', name: meta.unit, nameLocation: 'middle', nameGap: 44 },
    series,
  })
}

function histYearAxis(n0) {
  const cy = cycle.value
  const out = []
  if (cy && cy.sample_start != null) {
    const s = parseInt(cy.sample_start, 10)
    for (let i = 0; i < n0; i++) out.push(String(s + i))
  } else {
    out.push(...chartSeriesMeta().xAxis.slice(0, n0))
  }
  return out
}

// ── 周期主图：候选周期频谱强度（横向条形，非价格曲线） ──
function initCycleChart() {
  if (!cycleChart.value || !cycleShown.value || !cycle.value) return
  const inst = echarts.getInstanceByDom(cycleChart.value); if (inst) inst.dispose()
  const c = echarts.init(cycleChart.value); charts.push(c)
  const cands = [...(cycle.value.candidate_periods || [])].sort((a, b) => b.relative_strength - a.relative_strength).slice(0, 5)
  const cats = cands.map(x => `${x.period} 年`)
  const vals = cands.map(x => +(x.relative_strength * 100).toFixed(1))
  const maxV = Math.max(...vals, 0.01)
  const purples = ['#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd']
  c.setOption({
    tooltip: { trigger: 'item', formatter: p => `周期 ${p.name}：相对频谱强度 ${p.value}%（表示该周期在频域能量中的相对占比，不代表事件发生概率）` },
    grid: { left: 60, right: 46, top: 12, bottom: 26 },
    xAxis: { type: 'value', name: '相对频谱占比(%)', nameLocation: 'middle', nameGap: 26, max: maxV * 1.18, axisLabel: { formatter: '{value}%', fontSize: 10 } },
    yAxis: { type: 'category', data: cats, axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar', data: vals, barWidth: '58%',
      itemStyle: { color: (p) => purples[p.dataIndex % purples.length], borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10, color: '#6d28d9' },
    }],
  })
}

// ── 周期辅助图：去趋势后的周期分量（历史波动 + 谐波拟合 + 谐波外推） ──
function initCycleCompChart() {
  if (!cycleCompChart.value || !cycleShown.value || !cycle.value) return
  const inst = echarts.getInstanceByDom(cycleCompChart.value); if (inst) inst.dispose()
  const c = echarts.init(cycleCompChart.value); charts.push(c)
  const cy = cycle.value
  const n0 = (cy.detrended_series || []).length
  if (!n0) return
  const fy = cy.forecast_years || []
  const cat = histYearAxis(n0).concat(fy)
  const det = (cy.detrended_series || []).concat(nulls(fy.length))
  const comp = (cy.cycle_component || []).concat(nulls(fy.length))
  const fcomp = nulls(n0).concat(cy.forecast_cycle_component || [])
  const series = [
    { name: '去趋势波动', type: 'line', smooth: false, data: det, lineStyle: { color: '#94a3b8', width: 1.2 }, symbol: 'none', z: 1 },
    { name: '周期拟合(谐波)', type: 'line', smooth: false, data: comp, lineStyle: { color: '#7c3aed', width: 2.2 }, symbol: 'none', z: 2,
      markLine: { silent: true, symbol: 'none', lineStyle: { color: '#cbd5e1', type: 'dashed' }, data: [{ yAxis: 0 }], label: { show: false } } },
    { name: '谐波外推', type: 'line', smooth: false, data: fcomp, lineStyle: { color: '#c084fc', width: 2.2, type: 'dashed' }, symbol: 'diamond', symbolSize: 5, z: 2 },
  ]
  c.setOption({
    tooltip: { trigger: 'axis', valueFormatter: v => `${v} $/lb` },
    legend: { top: 2, right: 6, data: ['去趋势波动', '周期拟合(谐波)', '谐波外推'] },
    grid: { left: 56, right: 30, top: 34, bottom: 26 },
    xAxis: { type: 'category', data: cat, axisLabel: { rotate: 30, fontSize: 9 } },
    yAxis: { type: 'value', name: '偏离 $/lb', nameLocation: 'middle', nameGap: 40 },
    series,
  })
}

// ── GPR 预测图 ────────────────────────────
function initGprChart() {
  if (!gprChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(gprChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(gprChart.value); charts.push(c)
  const d = chartData.value.gprPrediction

  const bandData = d.series[2]?.data?.map((v, i) => {
    const lo = d.series[3]?.data?.[i]
    return v != null && lo != null ? [lo, v] : null
  }) || []

  const series = [
    ...(bandData.some(b => b != null) ? [{
      name: '95%置信区间', type: 'line', data: bandData, smooth: true,
      lineStyle: { opacity: 0 }, symbol: 'none',
      areaStyle: { color: 'rgba(239,68,68,0.1)', origin: 'auto' }, z: 0
    }] : []),
    {
      name: d.series[0]?.name || '历史', type: 'line', smooth: true,
      data: d.series[0]?.data || [],
      lineStyle: { color: '#2563eb', width: 2.5 }, itemStyle: { color: '#2563eb' }, z: 3
    },
    {
      name: d.series[1]?.name || '预测', type: 'line', smooth: true,
      data: d.series[1]?.data || [],
      lineStyle: { color: '#ef4444', width: 2.5, type: 'dashed' },
      itemStyle: { color: '#ef4444' }, symbol: 'diamond', symbolSize: 8, z: 2
    },
    {
      name: '95%置信上界', type: 'line', smooth: true,
      data: d.series[2]?.data || [],
      lineStyle: { color: '#fca5a5', width: 1, type: 'dotted' }, symbol: 'none', z: 1
    },
    {
      name: '95%置信下界', type: 'line', smooth: true,
      data: d.series[3]?.data || [],
      lineStyle: { color: '#fca5a5', width: 1, type: 'dotted' }, symbol: 'none', z: 1
    }
  ]

  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 8, right: 10, data: [d.series[0]?.name, d.series[1]?.name, '95%置信区间'].filter(Boolean) },
    grid: { left: 78, right: 48, top: 45, bottom: 35 },
    xAxis: { type: 'category', data: d.xAxis, axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: { type: 'value', name: isAuto.value ? '万辆/月' : (d.unit || '$/lb'), nameLocation: 'middle', nameGap: 54 },
    series
  })
}

// ── 供需缺口图 ────────────────────────────
function initGapChart() {
  if (!gapChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(gapChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(gapChart.value); charts.push(c)
  const d = chartData.value.supplyDemandGap

  const lineColors = { '核电需求': '#2563eb', '矿山产量': '#10b981', '新能源汽车产量': '#2563eb', '芯片产能': '#10b981' }
  const barColorMap = { '库存补充': '#f59e0b', '电池缺口': '#f59e0b', '净缺口': '#ef4444', '产能缺口': '#ef4444' }

  const series = d.series.map(s => {
    const isBar = s.type === 'bar'
    if (isBar) {
      return {
        name: s.name, type: 'bar', data: s.data, yAxisIndex: 1,
        itemStyle: { color: barColorMap[s.name] || '#f59e0b', borderRadius: [6, 6, 0, 0] },
        barWidth: '35%',
        label: { show: true, position: 'top', fontSize: 10, formatter: p => p.value != null ? p.value : '' }
      }
    }
    const color = lineColors[s.name] || '#2563eb'
    return {
      name: s.name, type: 'line', data: s.data, smooth: true, yAxisIndex: 0,
      lineStyle: { color, width: 2.5 }, symbol: 'circle', symbolSize: 8, itemStyle: { color }
    }
  })

  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 8, right: 10, data: d.series.map(s => s.name) },
    grid: { left: 95, right: 82, top: 50, bottom: 40 },
    xAxis: { type: 'category', data: d.xAxis, axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: [
      { type: 'value', name: isAuto.value ? '产量/产能(万辆)' : '需求/产量(ktU)', nameLocation: 'middle', nameGap: 84 },
      { type: 'value', name: isAuto.value ? '缺口(万辆)' : '缺口/补充(ktU)', nameLocation: 'middle', nameGap: 72 }
    ],
    series
  })
}

// ── 多模型对比图 ──────────────────────────
function initModelCompareChart() {
  if (!modelCompareChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(modelCompareChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(modelCompareChart.value); charts.push(c)
  const d = chartData.value.modelComparison

  const symbols = ['diamond', 'circle', 'triangle', 'rect']
  const lineStyles = ['solid', 'solid', 'dashed', 'dotted']
  const lineWidths = [3, 2.5, 2, 2]

  const allVals = d.models.flatMap(m => m.data)
  const yMin = Math.floor(Math.min(...allVals) * 0.92)
  const yMax = Math.ceil(Math.max(...allVals) * 1.08)

  const series = d.models.map((m, idx) => ({
    name: m.name, type: 'line', smooth: true, data: m.data,
    lineStyle: { color: m.color, width: lineWidths[idx] || 2.5, type: lineStyles[idx] || 'solid' },
    symbol: symbols[idx] || 'circle', symbolSize: idx === 0 ? 10 : 8,
    itemStyle: { color: m.color }, emphasis: { focus: 'series' }
  }))

  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 8, right: 10, data: d.models.map(m => m.name) },
    grid: { left: 74, right: 44, top: 45, bottom: 35 },
    xAxis: { type: 'category', data: d.xAxis },
    yAxis: { type: 'value', name: isAuto.value ? '万辆/月' : '$/lb', nameLocation: 'middle', nameGap: 52,
             min: yMin, max: yMax },
    series
  })
}

// ── 情景演化图 ────────────────────────────
function initScenarioEvoChart() {
  if (!scenarioEvoChart.value || !chartData.value) return
  const existingInstance = echarts.getInstanceByDom(scenarioEvoChart.value)
  if (existingInstance) existingInstance.dispose()
  const c = echarts.init(scenarioEvoChart.value); charts.push(c)
  const d = chartData.value.scenarioEvolution

  const series = d.scenarios.map(s => ({
    name: s.name, type: 'line', smooth: true, data: s.data,
    areaStyle: {}, lineStyle: { color: s.color, width: 2 }, itemStyle: { color: s.color }
  }))

  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 8, right: 10, data: d.scenarios.map(s => s.name) },
    grid: { left: 55, right: 30, top: 45, bottom: 35 },
    xAxis: { type: 'category', data: d.xAxis },
    yAxis: { type: 'value', name: '概率(%)', nameLocation: 'middle', nameGap: 48, max: 70,
             axisLabel: { formatter: '{value}%' } },
    series
  })
}

// ── 初始化所有图表 ─────────────────────────
function initAllCharts() {
  ;[gprChart, gapChart, modelCompareChart, scenarioEvoChart, trendChart, trendOverviewChart, turningChart, cycleChart, cycleCompChart, lossChart, lossDriversChart].forEach(elRef => {
    if (elRef.value) {
      const inst = echarts.getInstanceByDom(elRef.value)
      if (inst) inst.dispose()
    }
  })
  charts.forEach(c => { try { c.dispose() } catch (e) { void e } })
  charts = []
  setTimeout(() => {
    initTrendChart()
    initTrendOverviewChart()
    initTurningChart()
    initCycleChart()
    initCycleCompChart()
    initGprChart()
    initLossCharts()
    initGapChart()
    initModelCompareChart()
    initScenarioEvoChart()
  }, 200)
}

// ResizeObserver + resize 监听
let resizeObserver = null

watch(() => props.scenario, () => { fetchData() })

onMounted(() => {
  fetchData()
  // 等 v-loading 移除、DOM 渲染后再监听容器尺寸
  setTimeout(() => {
    const root = document.querySelector('.pred-root')
    if (root && !resizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        charts.forEach(c => { try { c.resize() } catch (e) { void e } })
      })
      resizeObserver.observe(root)
    }
  }, 600)
  window.addEventListener('resize', handleResize)
})

function handleResize() {
  charts.forEach(c => { try { c.resize() } catch (e) { void e } })
}

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', handleResize)
  charts.forEach(c => c.dispose())
})
</script>

<style scoped>
.pred-root { padding: 1.2rem 1.5rem; height: calc(100vh - 60px); overflow-y: auto; }

.pred-error { text-align: center; padding: 3rem; color: #ef4444; }
.pred-error p { margin-bottom: 1rem; }

/* 态势总览卡片 */
.sj-dashboard { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.2rem; }
.sj-db-card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 1rem; display: flex; gap: 0.8rem; align-items: flex-start; position: relative; overflow: hidden; }
.sj-db-card.price-up { border-left: 4px solid #ef4444; }
.sj-db-card.supply-tight { border-left: 4px solid #f59e0b; }
.sj-db-card.risk-high { border-left: 4px solid #ef4444; background: linear-gradient(135deg, #fff 0%, #fef2f2 100%); }
.sj-db-card.overall { border-left: 4px solid #6366f1; background: linear-gradient(135deg, #fff 0%, #eef2ff 100%); }
.sj-db-icon { font-size: 2rem; flex-shrink: 0; }
.sj-db-info { flex: 1; min-width: 0; }
.sj-db-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
.sj-db-value { font-size: 1.2rem; font-weight: 800; color: #1e293b; }
.sj-db-detail { font-size: 0.73rem; color: #64748b; margin-top: 3px; line-height: 1.4; }

@media (max-width: 1024px) { .sj-dashboard { grid-template-columns: repeat(2, 1fr); } }

/* 分区 */
.pred-section { margin-bottom: 1.2rem; }
.pred-section-title { display: flex; align-items: center; gap: 8px; font-size: 1.02rem; font-weight: 800; color: #1e293b; margin-bottom: 0.7rem; }
.pred-section-mark { width: 4px; height: 16px; border-radius: 2px; background: linear-gradient(180deg, #3b82f6, #2563eb); }
.pred-section-sub { font-size: 0.75rem; color: #94a3b8; font-weight: 500; margin-left: 2px; }

.pred-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
.pred-left { flex: 1.5; min-width: 0; }
.pred-right { flex: 1; min-width: 0; }
.pred-full { flex: 1; min-width: 0; }
.pred-scenario-row { display: flex; gap: 1.5rem; }
.pred-scenario-chart { flex: 1.8; min-width: 0; }
.pred-scenario-chart .pred-chart { height: 280px; }
.pred-scenario-interp { flex: 1; min-width: 0; padding-left: 1.5rem; }
.pred-scenario-interp-title { font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 0.6rem; }
.pred-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; height: 100%; }
.pred-card-title { font-size: 0.9rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid #f1f5f9; }
.pred-chart { width: 100%; height: 280px; }

/* 态势预测分析结果 */
.analysis { display: block; }
.ana-row { display: grid; grid-template-columns: 1fr; gap: 1rem; align-items: start; margin-bottom: 1rem; }
.analysis .ana-card { height: auto; align-self: start; }
.ana-metrics--3 { grid-template-columns: repeat(3, 1fr); }
.ana-card-head--wrap { flex-wrap: wrap; row-gap: 6px; }
.trend-chips { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.trend-overall { margin: 0 0 0.5rem; padding: 8px 12px; background: #eff6ff; border: 1px solid #dbeafe; border-left: 3px solid #2563eb; border-radius: 8px; color: #1e40af; font-size: 0.82rem; line-height: 1.6; }
.trend-main-chart { width: 100%; height: 320px; }
.trend-summary-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 8px 14px; margin-bottom: 6px; }
.tsb-main { display: flex; gap: 8px; align-items: baseline; }
.tsb-main b { font-size: 0.8rem; color: #1d4ed8; }
.tsb-main span { font-size: 0.95rem; font-weight: 800; color: #0f172a; }
.tsb-nums { display: flex; gap: 10px; font-size: 0.72rem; color: #64748b; }
.tsb-nums b { color: #0f172a; }
.trend-overview-line { font-size: 0.76rem; color: #b45309; margin: 2px 0 6px; }
.trend-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.trend-tip { font-size: 0.7rem; color: #94a3b8; }
.win-btns { display: flex; gap: 4px; }
.win-btn { font-size: 0.7rem; padding: 2px 10px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; color: #475569; cursor: pointer; }
.win-btn.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.ov-title { font-size: 0.68rem; color: #94a3b8; margin-top: 6px; }
.trend-overview-chart { width: 100%; height: 96px; }
.fc-wrap { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.fc-unc summary { cursor: pointer; font-size: 0.74rem; color: #2563eb; }
.pi-table { width: 100%; border-collapse: collapse; font-size: 0.72rem; margin: 6px 0; }
.pi-table th, .pi-table td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #f1f5f9; }
.pi-table th { color: #94a3b8; font-weight: 600; }
.pi-note { font-size: 0.7rem; color: #94a3b8; line-height: 1.6; }
.trend-sub { display: flex; gap: 1rem; margin-top: 0.4rem; align-items: flex-start; }
.trend-kpis { flex: 1.1; min-width: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.t-kpi { display: flex; flex-direction: column; align-items: center; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; padding: 6px 2px; }
.t-kpi i { font-style: normal; font-size: 0.64rem; color: #94a3b8; margin-bottom: 2px; }
.t-kpi b { font-size: 0.8rem; color: #1e293b; }
.trend-states { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; font-size: 0.74rem; color: #475569; }
.trend-states span { display: flex; gap: 8px; background: #f8fafc; border-radius: 6px; padding: 4px 8px; align-items: baseline; }
.trend-states b { color: #1d4ed8; white-space: nowrap; }
.trend-states i { font-style: normal; color: #475569; line-height: 1.4; }
.trend-markers { display: flex; flex-direction: column; gap: 3px; margin-top: 0.4rem; font-size: 0.72rem; color: #64748b; }
.m-line em { font-style: normal; color: #b91c1c; margin-right: 8px; }
.m-line em:last-of-type { margin-right: 0; }
.trend-markers .m-line:nth-child(2) em { color: #7c3aed; }
.ana-empty { border: 1px dashed #e2e8f0; background: #fbfdff; border-radius: 12px; }
.ana-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.ana-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ana-card-title { font-size: 0.88rem; font-weight: 800; color: #334155; }
.ana-chart { width: 100%; height: 215px; }
.ana-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.ana-metric { display: flex; flex-direction: column; align-items: center; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; padding: 5px 2px; }
.ana-metric i { font-style: normal; font-size: 0.68rem; color: #94a3b8; }
.ana-metric b { font-size: 0.85rem; color: #1e293b; }
.ana-list-mini { display: flex; flex-wrap: wrap; gap: 4px; }
.ana-chip { font-size: 0.72rem; padding: 2px 7px; border-radius: 999px; }
.ana-chip.peak { color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; }
.ana-chip.trough { color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; }
.ana-msg { color: #64748b; font-size: 0.82rem; padding: 1rem 0.2rem; line-height: 1.6; }
.ana-muted { color: #94a3b8; font-size: 0.75rem; }
.ana-note { font-size: 0.7rem; color: #94a3b8; line-height: 1.5; }
.ana-evidence { margin-top: auto; font-size: 0.72rem; color: #64748b; }
.ana-evidence summary { cursor: pointer; color: #2563eb; user-select: none; }
.ana-evidence ul { margin: 6px 0 0; padding-left: 16px; color: #64748b; }

/* 周期 */
.cycle-body { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 0.4rem 0; }
.cycle-big { font-size: 2rem; font-weight: 800; color: #1e293b; }
.cycle-big em { font-style: normal; font-size: 0.9rem; color: #94a3b8; margin-left: 4px; }
.cycle-none { text-align: center; padding: 1rem 0; color: #64748b; }
.cycle-none-icon { font-size: 1.8rem; }
.cycle-none p { margin: 4px 0; font-weight: 600; }
.cycle-none-sub { font-weight: 400 !important; font-size: 0.75rem; color: #94a3b8; line-height: 1.5; padding: 0 0.5rem; }
.ana-head-tags { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.cycle-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.cycle-kpi { text-align: center; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; padding: 6px 2px; }
.cycle-kpi i { display: block; font-style: normal; font-size: 0.66rem; color: #94a3b8; margin-bottom: 2px; }
.cycle-kpi b { font-size: 0.9rem; color: #1e293b; }
.cycle-kpi b em { font-style: normal; font-size: 0.7rem; color: #94a3b8; }
.cycle-windows { display: flex; gap: 14px; font-size: 0.76rem; color: #64748b; background: #fef9ef; border: 1px solid #fde68a; border-radius: 8px; padding: 6px 10px; flex-wrap: wrap; }
.cycle-windows b { color: #b45309; }
.cycle-cands { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; font-size: 0.74rem; }
.cycle-cands-label { color: #64748b; }
.cand-chip { font-size: 0.72rem; padding: 1px 8px; border-radius: 999px; color: #7c3aed; background: #f5f3ff; border: 1px solid #ddd6fe; }
.cand-chip em { font-style: normal; opacity: 0.75; margin-left: 2px; }

/* 周期卡整行 + 左右布局 */
.ana-cycle-full { width: 100%; }
.cycle-split { display: grid; grid-template-columns: 45% 55%; gap: 1rem; align-items: stretch; }
.cycle-spec, .cycle-phase { min-width: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.cycle-sub-title { font-size: 0.8rem; font-weight: 700; color: #334155; display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.cycle-sub-title .muted { font-size: 0.68rem; color: #94a3b8; font-weight: 500; }
.cycle-spectrum-chart { width: 100%; height: 175px; }
.cycle-comp-chart { width: 100%; height: 130px; }
.cycle-firstwin { font-size: 0.72rem; color: #94a3b8; line-height: 1.5; }

/* 关键风险预测 */
.risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.ana-en-sub { font-size: 10px; letter-spacing: 0.4px; color: #94a3b8; font-weight: 600; }
.chall-summary { margin: 0; font-size: 12px; color: #475569; background: #eff6ff; border-left: 3px solid #3b82f6; padding: 6px 10px; border-radius: 6px; line-height: 1.6; }
.chall-list { display: flex; flex-direction: column; gap: 8px; }
.chall-item { display: flex; gap: 8px; align-items: flex-start; }
.chall-idx { font-size: 10px; font-weight: 800; color: #3b82f6; background: #eef2ff; border-radius: 6px; padding: 2px 5px; flex-shrink: 0; margin-top: 1px; }
.chall-body { flex: 1; min-width: 0; }
.chall-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.chall-head b { font-size: 13px; color: #0f172a; }
.chall-tag { font-size: 10.5px; font-weight: 700; padding: 1px 7px; border-radius: 999px; flex-shrink: 0; white-space: nowrap; }
.chall-tag.tone-warn { color: #b45309; background: #fef3c7; }
.chall-tag.tone-info { color: #1d4ed8; background: #dbeafe; }
.chall-tag.tone-neutral { color: #64748b; background: #eef2f7; }
.chall-desc { margin: 2px 0 0; font-size: 11.5px; line-height: 1.6; color: #475569; }
.price-risk-hero { display: flex; align-items: baseline; gap: 8px; }
.price-risk-num { font-size: 1.8rem; font-weight: 800; color: #1e293b; }
.price-risk-num em { font-style: normal; font-size: 0.85rem; color: #64748b; }
.price-risk-year { color: #94a3b8; font-size: 0.75rem; }
.price-risk-band { font-size: 0.75rem; color: #64748b; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; padding: 6px 8px; }
.risk-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.risk-table th, .risk-table td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #f1f5f9; }
.risk-table th { color: #94a3b8; font-weight: 600; font-size: 0.72rem; }
.level-tag { display: inline-block; font-size: 0.72rem; padding: 1px 8px; border-radius: 999px; border: 1px solid; }
.risk-factors { display: flex; gap: 4px; flex-wrap: wrap; }
.factor-chip { font-size: 0.68rem; color: #64748b; background: #f1f5f9; border-radius: 4px; padding: 1px 5px; }
.loss-body { display: flex; gap: 12px; align-items: flex-start; }
.loss-icon { font-size: 1.5rem; }
.loss-text b { color: #b45309; font-size: 0.9rem; }
.loss-text p { color: #64748b; font-size: 0.8rem; margin: 4px 0 0; line-height: 1.6; }
.loss-req { color: #94a3b8 !important; }

/* ===== 潜在影响 / 预期损失 ===== */
.loss-card { overflow: hidden; }
.loss-head-right { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.loss-mode-tag { font-size: 0.72rem; padding: 2px 9px; border-radius: 999px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; white-space: nowrap; }
.loss-mode-tag.loss-mode--soft { color: #94a3b8; background: #f8fafc; border-color: #e2e8f0; }
.loss-mode-tag.loss-mode--blue { color: #1d4ed8; background: #eff6ff; border-color: #bfdbfe; }
.loss-summary { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; font-size: 0.8rem; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 0.7rem; }
.loss-summary-title { font-weight: 700; color: #1d4ed8; }
.loss-summary-note { color: #b45309; }
.loss-hero { display: flex; align-items: stretch; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.8rem; }
.loss-hero-main { flex: 1.4; min-width: 240px; background: linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 18px; }
.lh-label { font-size: 0.75rem; color: #64748b; }
.lh-num { font-size: 2rem; font-weight: 800; color: #0f172a; }
.lh-num em { font-style: normal; font-size: 0.75rem; color: #94a3b8; margin-left: 6px; }
.lh-sub { font-size: 0.72rem; color: #94a3b8; margin-top: 2px; }
.loss-hero-side { flex: 1; min-width: 180px; display: flex; flex-direction: column; justify-content: center; gap: 8px; }
.lhs-item { display: flex; align-items: baseline; justify-content: space-between; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; }
.lhs-item i { font-style: normal; font-size: 0.74rem; color: #64748b; }
.lhs-item b { color: #0f172a; font-size: 1.05rem; }
.loss-rel { flex-basis: 100%; font-size: 0.78rem; color: #64748b; display: flex; flex-wrap: wrap; gap: 8px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 8px 12px; }
.loss-rel b { color: #c2410c; }
.risk-score-line { flex-basis: 100%; font-size: 0.76rem; color: #475569; display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 6px 12px; }
.risk-score-line b { color: #0369a1; }
.risk-score-line .muted { font-size: 0.7rem; }
.loss-scn-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 0.6rem; }
.loss-range { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 0.8rem; }
.range-card { text-align: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 6px; }
.range-card.active { border-color: #2563eb; background: #eff6ff; }
.range-card i { font-style: normal; display: block; font-size: 0.72rem; color: #94a3b8; }
.range-card b { font-size: 1rem; color: #1e293b; }
.loss-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.8rem; }
.loss-panel { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; min-width: 0; }
.loss-panel-title { font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px; }
.loss-assessment { margin-bottom: 0.6rem; }
.loss-assess-head { display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
.loss-level-pill { background: #1d4ed8; color: #fff; font-size: 0.82rem; font-weight: 800; padding: 2px 12px; border-radius: 999px; }
.loss-assess-line { margin: 0; font-size: 0.82rem; line-height: 1.7; color: #334155; }
.loss-assess-note { margin: 2px 0 0; font-size: 0.72rem; }
.scn-impact-row { display: flex; align-items: baseline; gap: 8px; margin: 2px 0 6px; }
.scn-impact-row i { font-style: normal; font-size: 0.78rem; color: #64748b; }
.scn-impact-row b { font-size: 0.95rem; font-weight: 800; color: #1d4ed8; }
.upstream-risk { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 2px; }
.upstream-risk b { font-size: 0.78rem; color: #1e293b; }
.upstream-risk span { font-size: 0.8rem; color: #0f172a; }
.upstream-risk p { margin: 2px 0 0; font-size: 0.72rem; line-height: 1.6; }
.loss-scn-compare { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0.7rem 0; }
.scn-comp { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; background: #f8fafc; }
.scn-comp.active { border-color: #6366f1; background: #eef2ff; }
.scn-comp i { font-style: normal; font-size: 0.76rem; color: #64748b; }
.scn-comp b { font-size: 0.84rem; color: #1e293b; }
.imp-bars { display: flex; flex-direction: column; gap: 3px; }
.imp-row { display: flex; gap: 8px; align-items: center; padding: 2px 0; }
.imp-name { width: 70px; font-size: 0.76rem; color: #475569; flex-shrink: 0; }
.imp-track { flex: 1; background: #eef2f7; border-radius: 6px; height: 12px; overflow: hidden; min-width: 0; }
.imp-track i { display: block; height: 100%; background: linear-gradient(90deg, #3b82f6, #6366f1); border-radius: 6px; }
.imp-cat { width: 70px; text-align: right; font-size: 0.7rem; color: #475569; flex-shrink: 0; }
.imp-cat.cat-0 { color: #b45309; font-weight: 700; }
.imp-cat.cat-1 { color: #7c3aed; font-weight: 700; }
.imp-row--inv .imp-name { color: #94a3b8; }
.imp-track--dim i { background: #cbd5e1; width: 6%; }
.imp-cat.dim { color: #94a3b8; font-weight: 400; }
.drv-word { color: #7c3aed; font-weight: 700 !important; }
.loss-cond-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0.2rem 0 0.6rem; }
.loss-cond { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; background: #fff; }
.loss-cond-title { font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px; }
.loss-cond-list { margin: 0; padding-left: 1.05rem; }
.loss-cond-list li { font-size: 0.76rem; color: #475569; margin: 4px 0; line-height: 1.55; }
.loss-cond-list b { color: #1e293b; margin-right: 6px; }
.tier-legend { font-size: 0.74rem; color: #475569; display: flex; flex-direction: column; gap: 4px; line-height: 1.6; }
.tier-legend b { display: inline-block; min-width: 34px; margin-right: 6px; }
.loss-breakdown-chart { width: 100%; height: 210px; }
.loss-tornado-chart { width: 100%; height: 210px; }
.loss-share { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.share-chip { font-size: 0.72rem; color: #475569; display: inline-flex; gap: 4px; align-items: center; }
.share-chip i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
.driver-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.driver-item { font-size: 0.74rem; color: #475569; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 999px; padding: 2px 9px; display: inline-flex; gap: 5px; align-items: center; }
.driver-item em { font-style: normal; color: #7c3aed; font-weight: 700; }
.driver-item b { color: #1e293b; }
.loss-evidence { font-size: 0.78rem; color: #475569; }
.param-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 0.78rem; }
.param-table th, .param-table td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #f1f5f9; }
.param-table th { color: #94a3b8; font-weight: 600; }
.formula-box { background: #f8fafc; border-radius: 8px; padding: 8px 12px; }
.formula-box ul { margin: 6px 0; padding-left: 18px; }
.formula-box li { margin-bottom: 3px; }
.formula-box .muted { font-size: 0.7rem; }
.loss-adj-form .el-input-number { width: 180px; }

/* ===== 供应链周期研判 / 关键拐点 / 预警 / 处置预案 ===== */
.fc-nodes { display: flex; gap: 6px; align-items: baseline; margin-top: 6px; font-size: 0.72rem; color: #64748b; flex-wrap: wrap; }
.fc-nodes span { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 2px 8px; display: inline-flex; gap: 6px; align-items: baseline; }
.fc-nodes i { font-style: normal; color: #0369a1; font-weight: 700; }
.fc-nodes b { color: #0f172a; }
.fc-nodes em { font-style: normal; color: #94a3b8; font-size: 0.68rem; }
.dec-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem; margin-bottom: 1rem; }
.dec-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #fff; }
.dec-c--unav { background: #f8fafc; }
.dec-c--proxy { background: #fffbeb; border-color: #fde68a; }
.dec-head { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.dec-head b { font-size: 0.85rem; }
.dec-tag { font-size: 0.66rem; padding: 1px 7px; border-radius: 999px; color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; white-space: nowrap; }
.dec-tag--proxy { color: #b45309; background: #fffbeb; border-color: #fde68a; }
.dec-tag--ok { color: #059669; background: #ecfdf5; border-color: #a7f3d0; }
.dec-tag--unav { color: #64748b; background: #f1f5f9; border-color: #e2e8f0; }
.dec-tag--red { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
.dec-stage { font-size: 0.92rem; font-weight: 800; color: #1e293b; margin: 6px 0 2px; }
.dec-text { font-size: 0.74rem; color: #475569; line-height: 1.5; margin: 0; }
.dec-ev { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.dec-ev-item { font-size: 0.7rem; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 6px; padding: 2px 6px; display: inline-flex; gap: 4px; }
.dec-ev-item i { font-style: normal; color: #94a3b8; }
.dec-ev-item b { color: #334155; }
.dec-foot { font-size: 0.66rem; color: #94a3b8; margin-top: 6px; }
.dec-unav { font-size: 0.74rem; color: #64748b; line-height: 1.5; }
.cycle-main-row { display: grid; grid-template-columns: 3fr 2fr; gap: 0.8rem; margin-bottom: 0.5rem; }
.dec-main-price { border-left: 4px solid #2563eb; }
.dec-supply { border-left: 4px solid #f59e0b; }
.expand-strip { margin: 0 0 0.8rem; font-size: 0.74rem; color: #64748b; }
.expand-strip summary { cursor: pointer; color: #475569; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 4px 10px; }
.expand-strip ul { margin: 6px 0 0; padding-left: 18px; line-height: 1.6; }
.tp-card--comp { border-left: 3px solid #f97316; }
@media (max-width: 900px) { .cycle-main-row { grid-template-columns: 1fr; } }
.tp-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 1rem; }
.tp-card { display: flex; gap: 10px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; background: #fff; }
.tp-idx { font-weight: 800; color: #7c3aed; font-size: 0.85rem; }
.tp-body { flex: 1; min-width: 0; }
.tp-head { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.tp-head b { font-size: 0.85rem; }
.tp-cond { font-size: 0.75rem; color: #475569; margin-top: 2px; }
.tp-ev { display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.72rem; color: #64748b; margin-top: 4px; }
.tp-ev b { color: #334155; }
.tp-suggest { font-size: 0.74rem; color: #0369a1; background: #eff6ff; border-radius: 6px; padding: 4px 8px; margin-top: 6px; }
.warn-banner { display: flex; gap: 1rem; justify-content: space-between; align-items: center; border: 1px solid; border-radius: 12px; padding: 12px 16px; margin-top: 0.2rem; flex-wrap: wrap; }
.warn-left { display: flex; gap: 10px; align-items: center; min-width: 220px; flex: 1; }
.warn-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.warn-title { font-size: 0.9rem; font-weight: 800; color: #0f172a; }
.warn-reason { font-size: 0.74rem; color: #475569; line-height: 1.5; }
.warn-right { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.72rem; color: #475569; }
.warn-right span { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; line-height: 1.5; }
.warn-right b { color: #0f172a; }
.plan-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; background: #fff; }
.plan-head { display: flex; justify-content: space-between; gap: 10px; align-items: center; flex-wrap: wrap; }
.plan-title-wrap { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.plan-title-wrap b { font-size: 0.95rem; color: #1e293b; }
.plan-tag { font-size: 0.7rem; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 999px; padding: 2px 9px; }
.plan-meta { font-size: 0.74rem; color: #64748b; }
.plan-objective { font-size: 0.78rem; color: #475569; margin: 8px 0; }
.plan-actions { display: flex; flex-direction: column; gap: 6px; }
.plan-action { display: flex; gap: 10px; border: 1px solid #eef2f7; border-radius: 8px; padding: 6px 10px; background: #fbfdff; }
.plan-order { font-weight: 800; color: #2563eb; font-size: 0.9rem; }
.plan-a-body { flex: 1; }
.plan-a-title { display: flex; gap: 6px; align-items: center; font-size: 0.82rem; color: #1e293b; font-weight: 600; }
.plan-pri { font-size: 0.62rem; padding: 0 6px; border-radius: 999px; }
.pri-high { color: #dc2626; background: #fef2f2; }
.pri-medium { color: #b45309; background: #fffbeb; }
.pri-low { color: #64748b; background: #f1f5f9; }
.plan-action p { font-size: 0.74rem; color: #64748b; margin: 2px 0 0; line-height: 1.5; }
.plan-note { font-size: 0.72rem; color: #94a3b8; margin-top: 10px; line-height: 1.5; }
@media (max-width: 1200px) { .dec-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px) { .dec-grid { grid-template-columns: 1fr; } }
@media (max-width: 1100px) {
  .loss-grid2 { grid-template-columns: 1fr; }
  .loss-range { grid-template-columns: repeat(3, 1fr); }
}

.pred-model-notes { margin-top: 0.5rem; font-size: 0.78rem; color: #64748b; display: flex; flex-wrap: wrap; gap: 0.3rem 0.8rem; }
.pred-model-tag { font-weight: 600; font-size: 0.75rem; padding: 1px 6px; border-radius: 4px; }
.pred-model-tag.gpr { color: #ef4444; background: #fef2f2; }
.pred-model-tag.lstm { color: #10b981; background: #ecfdf5; }
.pred-model-tag.prophet { color: #f59e0b; background: #fffbeb; }
.pred-model-tag.rl { color: #6366f1; background: #eef2ff; }

/* 响应式：侧边栏展开约 200px，折叠约 64px — 可用宽度变化时自动换行 */
@media (max-width: 1200px) {
  .ana-row { grid-template-columns: 1fr; }
  .cycle-split { grid-template-columns: 1fr; }
  .pred-row { flex-direction: column; }
  .pred-scenario-row { flex-direction: column; }
  .pred-scenario-interp { padding-left: 0; padding-top: 1rem; }
  .pred-chart { height: 240px; }
  .sj-dashboard { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 1000px) {
  .risk-grid { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .sj-dashboard { grid-template-columns: 1fr; }
  .pred-chart { height: 220px; }
}
</style>
