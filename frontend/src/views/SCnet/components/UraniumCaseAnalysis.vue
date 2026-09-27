<template>
  <div class="case-analysis analysis-page">
    <header class="case-toolbar">
      <div class="case-picker">
        <label for="case-picker">历史案例</label>
        <el-select id="case-picker" :model-value="caseDef?.id" @change="switchCase">
          <el-option v-for="item in caseLibrary" :key="item.id" :value="item.id" :label="item.title" />
        </el-select>
      </div>
      <span class="case-period">{{ caseDef?.period }} · {{ caseDef?.category }}</span>
    </header>
    <div class="ca-main" ref="mainRef">
      <el-empty v-if="!caseDef" description="请选择历史案例" :image-size="80" />
        <!-- 调研中的案例：还没有时间线 / 映射 / 验证点，只展示背景与待补充项 -->
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

        <template v-else>
      <div class="case-heading">
        <h1>{{ caseDef.title }}</h1>
        <p v-if="activeTab === 'background'">{{ caseDef.summary }}</p>
        <div class="case-meta"><span>推演时段 {{ timelineRangeText }}</span><span>关联年份 {{ matched.years.length ? matched.years.join('、') : '暂无匹配' }}</span></div>
      </div>

      <!-- 方法有效性量化验证看板 (Method Effectiveness Quantitative Dashboard) -->
      <section class="ca-panel glass-panel method-effectiveness-board" v-if="caseDef?.effectiveness">
        <div class="eff-board-header">
          <div class="eff-board-title-group">
            <span class="eff-badge">方法效能实战验证</span>
            <div class="eff-heading-text">
              <h3>「多智能体动态协同推演」成效量化对照看板</h3>
              <p>以当前历史典型冲击事件为基准，量化对比「传统静态经验决策」与「MACE-FE2 多智能体协同推演」在保供刚性、抗牛鞭震荡、成本控制与稳态复原维度的实战效能。</p>
            </div>
          </div>
          <div class="eff-resilience-badge">
            <span class="eff-resilience-label">综合供应链韧性增益</span>
            <strong class="eff-resilience-value">{{ caseDef.effectiveness.resilienceScore || '+42.6%' }}</strong>
            <small class="eff-resilience-status">刚性保供闭环已达成</small>
          </div>
        </div>

        <!-- 4 核心指标定量对照卡片 -->
        <div class="eff-kpi-grid">
          <div
            v-for="kpi in caseDef.effectiveness.kpis"
            :key="kpi.label"
            class="eff-kpi-card"
          >
            <div class="eff-kpi-title-row">
              <span class="eff-kpi-name">{{ kpi.label }}</span>
              <span class="eff-kpi-delta" :class="{ positive: kpi.good }">{{ kpi.delta }}</span>
            </div>
            <div class="eff-comparison-tracks">
              <div class="eff-track baseline-track">
                <span class="track-label">传统基准</span>
                <strong class="track-val">{{ kpi.baseline }}</strong>
              </div>
              <div class="eff-track method-track">
                <span class="track-label">本平台推演</span>
                <strong class="track-val highlight">{{ kpi.method }}</strong>
              </div>
            </div>
            <p class="eff-kpi-desc">{{ kpi.description }}</p>
          </div>
        </div>

        <!-- 4 核心协同优势机制归因 -->
        <div class="eff-mechanisms-panel" v-if="caseDef.effectiveness.mechanisms?.length">
          <div class="eff-mech-header">
            <span class="eff-mech-title">核心协同优势机制归因 (Attribution of Superiority)</span>
            <span class="eff-mech-subtitle">为什么本系统方法在极端地缘扰动下能稳定化解风险：</span>
          </div>
          <div class="eff-mech-grid">
            <div
              v-for="(mech, idx) in caseDef.effectiveness.mechanisms"
              :key="mech.name"
              class="eff-mech-card"
            >
              <div class="eff-mech-num">0{{ idx + 1 }}</div>
              <div class="eff-mech-info">
                <strong>{{ mech.name }}</strong>
                <span>{{ mech.desc }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav class="case-tabs" aria-label="案例分析内容">
        <button v-for="item in caseTabs" :key="item.key" type="button" :class="{ active: activeTab === item.key }"
          :aria-current="activeTab === item.key ? 'page' : undefined" @click="changeTab(item.key)">{{ item.label }}</button>
      </nav>
      <el-empty v-if="activeTab !== 'background' && !timeline.length" description="选择已完成的实验后，可查看对照结果" :image-size="80" />
      <div v-if="activeTab === 'background'" class="ca-grid-2">

        <!-- 01 案例背景 -->
        <section class="ca-panel glass-panel">
          <div class="analysis-column-head">
            <span class="analysis-column-index">01</span>
            <div>
              <h3>案例背景与时间线</h3>
              <p>历史事件的发生顺序与关键事实，是后续映射与验证的依据。</p>
            </div>
          </div>
          <ol class="ca-timeline">
            <li v-for="item in caseDef.timeline" :key="item.date">
              <time>{{ item.date }}</time>
              <p>{{ item.text }}</p>
            </li>
          </ol>
          <dl class="ca-facts">
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

        <!-- 02 数据映射 -->
        <section class="ca-panel glass-panel">
          <div class="analysis-column-head">
            <span class="analysis-column-index">02</span>
            <div>
              <h3>事件影响与观测指标</h3>
              <p>案例发生后的影响落到哪个业务环节，最终体现在哪些观测指标上。</p>
            </div>
          </div>
          <div class="ca-mapping">
            <div class="ca-mapping-row head">
              <span>系统模块</span>
              <span>映射对象</span>
              <span>观测指标</span>
            </div>
            <div v-for="row in caseDef.mapping" :key="row.system" class="ca-mapping-row">
              <span class="ca-mapping-system">{{ row.system }}</span>
              <span>{{ row.item }}</span>
              <span class="ca-mapping-effect">{{ row.effect }}</span>
            </div>
          </div>
          <div class="ca-hits">
            <span class="ca-hits-label">关联年度事件</span>
            <template v-if="matched.hits.length">
              <span v-for="hit in matched.hits" :key="hit.year" class="ca-hit-chip">
                <b>{{ hit.year }}</b>{{ hit.events.join('；') }}
              </span>
            </template>
            <span v-else class="ca-hit-empty">当前实验暂无关联事件，可切换顶部实验继续对照。</span>
          </div>
        </section>
      </div>

      <!-- 年度结果 -->
      <section v-if="activeTab === 'results' && timeline.length" class="ca-panel glass-panel">
        <div class="analysis-column-head">
          <span class="analysis-column-index">03</span>
          <div>
            <h3>年度结果对照</h3>
            <p>以当前对照实验的年度序列为准，观察案例作用年份前后的供需、缺口与结构变化。</p>
          </div>
        </div>
        <div class="ca-metric-grid">
          <article v-for="item in metricCards" :key="item.label" class="ca-metric-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.hint }}</small>
          </article>
        </div>
        <div class="ca-chart-grid">
          <figure class="ca-chart-card">
            <figcaption>
              <b>供需与采购的年度变化</b>
              <span>以首年为 100 的指数，虚线为案例关联年份</span>
            </figcaption>
            <div ref="lineChartRef" class="ca-chart ca-chart-line"></div>
          </figure>
          <figure class="ca-chart-card">
            <figcaption>
              <b>年度需求缺口</b>
              <span>深色为案例关联年份，单位 tU</span>
            </figcaption>
            <div ref="barChartRef" class="ca-chart ca-chart-bar"></div>
          </figure>
        </div>
        <details class="ca-table-details">
          <summary>年度波动对照</summary>
          <div class="annual-ratios"><span v-for="item in measuredRatios" :key="item.name">{{ item.name }} <b>{{ item.ratioText }}</b></span></div>
          <p class="ca-source-note">{{ amplificationNote }}</p>
        </details>
        <details class="ca-table-details">
          <summary>查看年度数据表</summary>
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
      </section>

      <!-- 04 牛鞭效应分析 -->
      <section v-if="activeTab === 'bullwhip' && timeline.length" class="ca-panel glass-panel ca-bullwhip">
        <div class="analysis-column-head">
          <span class="analysis-column-index">04</span>
          <div>
            <h3>牛鞭效应分析</h3>
            <p>设置相同的需求冲击，按年度比较两种方案的订货波动与恢复年数。</p>
          </div>
        </div>
        <div class="bw-controls">
          <label><span>冲击年份</span><el-select v-model="shockYear" aria-label="冲击年份">
            <el-option v-for="row in timeline" :key="row.year" :value="row.year" :label="`${row.year} 年${caseYearSet.has(row.year) ? ' · 案例关联' : ''}`" />
          </el-select></label>
          <label><span>需求增幅</span><el-radio-group v-model="shockSize" aria-label="需求增幅">
            <el-radio-button :value="15">+15%</el-radio-button><el-radio-button :value="20">+20%</el-radio-button><el-radio-button :value="30">+30%</el-radio-button>
          </el-radio-group></label>
          <label><span>对照方案</span><el-select v-model="comparatorExperimentId" clearable placeholder="选择另一个实验" aria-label="牛鞭效应对照方案">
            <el-option v-for="row in comparatorOptions" :key="row.value" :value="row.value" :label="row.label" />
          </el-select></label>
          <label><span>曲线视图</span><el-select v-model="strategy" aria-label="曲线视图">
            <el-option label="供应商对比" value="compare" /><el-option label="基准方案各层级" value="baseline" /><el-option label="对照方案各层级" value="system" :disabled="!hasComparableYear" />
          </el-select></label>
        </div>
        <p class="bw-context">基准方案：{{ baselineLabel }}<span v-if="comparatorExperimentId"> · 对照方案：{{ comparatorLabel }}</span></p>
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
                <b>需求与上游订货变化</b>
                <span>{{ shockYear }} 年 · 需求 +{{ shockSize }}% · 年度指数（冲击前 = 100）</span>
              </figcaption>
              <div ref="bullwhipChartRef" class="ca-chart ca-chart-bullwhip"></div>
            </figure>

            <div class="bw-lower">
              <article class="bw-panel">
                <div class="bw-panel-head">
                  <div>
                    <span class="bw-kicker">02 · 层级放大倍数</span>
                    <h4>波动在各节点的放大</h4>
                  </div>
                  <span class="bw-unit-note">大于 1 表示波动放大</span>
                </div>
                <div class="bw-amp-table">
                  <div class="bw-amp-row head">
                    <span>层级</span>
                    <span>基准方案</span>
                    <span>对照方案</span>
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
                  </div>
                </div>
                <div class="ca-chain">
                  <span class="ca-chain-node">核电需求</span>
                  <i>→</i>
                  <span class="ca-chain-node">制造方采购</span>
                  <i>→</i>
                  <span class="ca-chain-node">铀供应商</span>
                </div>
              </article>

              <article class="bw-panel">
                <div class="bw-panel-head">
                  <div>
                    <span class="bw-kicker">03 · 策略结论</span>
                    <h4>同一冲击下的变化</h4>
                  </div>
                  <span class="bw-unit-note">固定 {{ shockYear }} 年窗口与 +{{ shockSize }}% 冲击</span>
                </div>
                <div class="bw-compare">
                  <div class="bw-compare-row head">
                    <span>观察项</span>
                    <span>基准方案</span>
                    <span>对照方案</span>
                    <span>改善</span>
                  </div>
                  <div v-for="row in strategyComparisonRows" :key="row.label" class="bw-compare-row">
                    <span><b>{{ row.label }}</b><small>{{ row.note }}</small></span>
                    <span>{{ row.baseline }}</span>
                    <span class="bw-system-value">{{ row.system }}</span>
                    <strong :class="row.tone">{{ row.delta }}</strong>
                  </div>
                </div>
                <div class="bw-conclusion">
                  <span>结论</span>
                  <b>{{ strategyConclusion }}</b>
                </div>
                <p class="bw-compare-note">
                  放大倍数 = 订货指数方差 ÷ 需求指数方差。恢复年数为冲击后回到基准 ±5% 并保持稳定所需的年数。曲线使用所选年度的库存与合同条件进行需求敏感性推演。
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <!-- 核验结论 -->
      <section v-if="activeTab === 'validation' && timeline.length" class="ca-panel glass-panel">
        <div class="analysis-column-head">
          <span class="analysis-column-index">05</span>
          <div>
            <h3>核验结论</h3>
            <p>逐项核对当前实验是否满足案例观察条件，并列出年度依据。</p>
          </div>
        </div>
        <div class="ca-validation-grid">
          <ul class="ca-check-list">
            <li v-for="item in validationRows" :key="item.check" :class="item.state">
              <span class="ca-check-icon">
                <el-icon v-if="item.state === 'pass'"><CircleCheck /></el-icon>
                <el-icon v-else-if="item.state === 'fail'"><Warning /></el-icon>
                <el-icon v-else><InfoFilled /></el-icon>
              </span>
              <div>
                <b>{{ item.title }}<em>{{ item.stateText }}</em></b>
                <span>{{ item.evidence || item.detail }}</span>
              </div>
            </li>
          </ul>
          <div class="ca-compare">
            <div class="ca-compare-row head">
              <span>策略实验</span>
              <span>缺口峰值</span>
              <span>平均风险暴露</span>
              <span>库存覆盖</span>
              <span>集中度</span>
            </div>
            <div
              v-for="row in comparisonRows"
              :key="row.experiment_id"
              class="ca-compare-row"
              tabindex="0" role="button"
              @keydown.enter.prevent="onExperimentChange(row.experiment_id)"
              @keydown.space.prevent="onExperimentChange(row.experiment_id)"
              :class="{ active: row.experiment_id === selectedExperimentId }"
              @click="onExperimentChange(row.experiment_id)"
            >
              <span class="ca-compare-name" :title="row.name">{{ row.name }}</span>
              <span>{{ fmt('max_unmet_demand_tU', row.max_unmet_demand_tU) }}</span>
              <span>{{ fmt('avg_risk_exposure', row.avg_risk_exposure) }}</span>
              <span>{{ fmt('final_inventory_coverage_years', row.final_inventory_coverage_years) }}</span>
              <span>{{ fmt('final_supply_concentration_hhi', row.final_supply_concentration_hhi) }}</span>
            </div>
          </div>
        </div>
      </section>

        </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { storeToRefs } from 'pinia'
import { CircleCheck, InfoFilled, Warning } from '@element-plus/icons-vue'
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

// ---------- 案例库（左栏切换） ----------
const caseLibrary = URANIUM_CASE_LIBRARY
function switchCase(id) {
  if (!id || id === props.caseId) return
  router.replace({ query: { ...route.query, view: 'case', case: id, case_tab: 'background' } })
}

const caseTabs = [
  { key: 'background', label: '案例背景' }, { key: 'results', label: '年度结果' },
  { key: 'bullwhip', label: '牛鞭效应' }, { key: 'validation', label: '核验结论' },
]
const activeTab = computed(() => caseTabs.some(item => item.key === route.query.case_tab) ? route.query.case_tab : 'background')
function changeTab(key) { router.replace({ query: { ...route.query, case_tab: key } }) }
const mainRef = ref(null)

// 图表配色：系列色取自已校验的分类调色板前三档，文字与网格使用墨色刻度
const SERIES_COLORS = Object.freeze({ demand: '#2a78d6', procured: '#eb6834', supply: '#1baf7a' })
const LAYER_COLORS = Object.freeze({ trade: '#2a78d6', conversion: '#eb6834', supplier: '#1baf7a' })
const EMPHASIS_BAR = '#2a78d6'
const MUTED_BAR = '#86b6ef'
const INK = Object.freeze({ secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7' })

const demoStore = useUraniumDemoStore()
const { history, selectedExperiment } = storeToRefs(demoStore)

const caseDef = computed(() => findCaseById(props.caseId || route.query.case) || caseLibrary[0])
const selectedExperimentId = computed(() => demoStore.selectedExperimentId)

const fmt = (key, value) => formatUraniumMetricValue(key, value)
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// ---------- 实验数据 ----------
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

// ---------- 03 指标卡 ----------
const peakRow = computed(() => {
  const rows = timeline.value.filter((row) => Number.isFinite(row.unmet_demand_tU))
  if (!rows.length) return null
  return rows.reduce((best, row) => (row.unmet_demand_tU > best.unmet_demand_tU ? row : best), rows[0])
})

const metricCards = computed(() => {
  const rows = timeline.value
  const first = rows[0]
  const last = rows[rows.length - 1]
  const prices = rows.map((row) => row.market_price_usd_lb).filter(Number.isFinite)
  const hhiDelta = first && last && Number.isFinite(first.supply_concentration_hhi) && Number.isFinite(last.supply_concentration_hhi)
    ? last.supply_concentration_hhi - first.supply_concentration_hhi
    : null
  return [
    {
      label: '缺口峰值',
      value: peakRow.value ? fmt('unmet_demand_tU', peakRow.value.unmet_demand_tU) : '—',
      hint: peakRow.value ? `${peakRow.value.year} 年${caseYearSet.value.has(peakRow.value.year) ? ' · 案例关联年份' : ''}` : '无数据'
    },
    {
      label: '供给集中度变化',
      value: hhiDelta == null ? '—' : `${hhiDelta > 0 ? '+' : ''}${hhiDelta.toFixed(3)}`,
      hint: first && last ? `${fmt('supply_concentration_hhi', first.supply_concentration_hhi)} → ${fmt('supply_concentration_hhi', last.supply_concentration_hhi)}` : '无数据'
    },
    {
      label: '库存覆盖终值',
      value: last ? fmt('inventory_coverage_years', last.inventory_coverage_years) : '—',
      hint: last ? `${last.year} 年期末` : '无数据'
    },
    {
      label: '价格区间',
      value: prices.length ? `$${Math.min(...prices).toFixed(1)} – $${Math.max(...prices).toFixed(1)}` : '—',
      hint: '现货铀价 美元/磅'
    }
  ]
})

// ---------- 04 牛鞭效应分析 ----------
const shockYear = ref(null)
const shockSize = ref(20)
const strategy = ref('compare')
const comparatorExperimentId = ref('')

// 默认冲击窗口：最后一个案例关联年份，其次是缺口峰值年份
watch([() => matched.value.years, timeline], ([years, rows]) => {
  const valid = rows.some((row) => row.year === shockYear.value)
  if (valid) return
  shockYear.value = years[years.length - 1] ?? peakRow.value?.year ?? rows[0]?.year ?? null
}, { immediate: true })


const comparatorOptions = computed(() => history.value
  .filter((row) => row.experiment_id !== selectedExperimentId.value)
  .map((row) => ({ value: row.experiment_id, label: row.name || row.experiment_id })))

// 默认协同对照：其他实验中缺口峰值最低的一个
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

/**
 * 缓冲能力 = 期末长协占比 × 库存覆盖年数（截断到 0–1）。
 * 缓冲越强，需求冲击沿上游传导时被吸收得越多。
 */
function bufferOf(experiment) {
  const rows = buildUraniumTimelineRows(experiment)
  const last = rows.find(row => row.year === shockYear.value)
  if (!last) return null
  const longTerm = (last.contract_mix || []).find((item) => String(item?.contract_type || '').includes('长协'))
  const share = Number(longTerm?.share ?? 0.5)
  const inventory = Number(last.inventory_coverage_years ?? 1)
  return clamp(share * inventory, 0, 1)
}

// 参考放大系数（贸易 / 转化 / 供给），按缓冲能力折算成有效系数
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
const amplificationRows = computed(() => BASE_LAYERS.map((layer, index) => ({
  name: layer.name, color: LAYER_COLORS[layer.key],
  baseline: layerRatio(baselineLayers.value[index]), system: layerRatio(systemLayers.value[index]),
})))
const barWidth = value => {
  const max = Math.max(1, ...amplificationRows.value.flatMap(row => [row.baseline || 0, row.system || 0]))
  return `${((value || 0) / max * 100).toFixed(1)}%`
}

// 年度结果与月度冲击曲线分别计算，避免混用统计口径。
const measuredRatios = computed(() => {
  const rows = timeline.value
  const layers = [
    { name: '采购订单', key: 'total_procured_tU', color: SERIES_COLORS.procured },
    { name: '上游供给', key: 'total_supply_tU', color: SERIES_COLORS.supply }
  ]
  const computedRows = layers.map((layer) => {
    const ratio = varianceRatio(rows.map(row => row.total_demand_tU), rows.map(row => row[layer.key]))
    return { ...layer, ratio }
  })
  const maxRatio = Math.max(1, ...computedRows.map((item) => item.ratio || 0))
  return computedRows.map((item) => ({
    ...item,
    ratioText: item.ratio == null ? '—' : `${item.ratio.toFixed(2)}×`,
    trackWidth: item.ratio == null ? '0%' : `${Math.min(100, (item.ratio / maxRatio) * 100).toFixed(1)}%`
  }))
})
const amplificationNote = computed(() => {
  const ratios = measuredRatios.value.filter((item) => item.ratio != null)
  if (!ratios.length) return '年度有效数据不足，或需求方差为零，暂无法计算放大倍数。'
  const maxItem = ratios.reduce((best, item) => (item.ratio > best.ratio ? item : best), ratios[0])
  if (maxItem.ratio > 1) {
    return `年度结果：${maxItem.name}的年度波动是终端需求的 ${maxItem.ratio.toFixed(2)} 倍，需求冲击在向上游传导时被放大。`
  }
  return `年度结果：各层级年度波动均不高于终端需求（最高 ${maxItem.ratio.toFixed(2)} 倍），该序列未显示明显的波动放大。`
})

// 相同年份、需求冲击与统计窗口下比较订货响应。
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
  return `对照方案的最大放大倍数由 ${formatRatio(base)} ${compared < base ? '降至' : '升至'} ${formatRatio(compared)}。${compared < base ? '对照方案对本次需求波动的吸收能力较强。' : '对照方案的上游订货波动更大，需关注库存与交付压力。'}`
})

// ---------- 05 验证点核验 ----------
const CHECKERS = {
  peak_in_case_years: (ctx) => {
    if (!ctx.peakRow) return { state: 'pending', evidence: '缺少年度缺口数据。' }
    if (!ctx.caseYears.length) return { state: 'pending', evidence: '当前实验未命中案例年份，无法核验。' }
    const pass = ctx.caseYears.includes(ctx.peakRow.year)
    return {
      state: pass ? 'pass' : 'fail',
      evidence: `缺口峰值 ${fmt('unmet_demand_tU', ctx.peakRow.unmet_demand_tU)} 出现在 ${ctx.peakRow.year} 年，案例关联年份为 ${ctx.caseYears.join(' / ')}。`
    }
  },
  hhi_declines: (ctx) => {
    const first = ctx.rows[0]
    const last = ctx.rows[ctx.rows.length - 1]
    if (!first || !last || !Number.isFinite(first.supply_concentration_hhi) || !Number.isFinite(last.supply_concentration_hhi)) {
      return { state: 'pending', evidence: '缺少供给集中度数据。' }
    }
    const pass = last.supply_concentration_hhi < first.supply_concentration_hhi
    return {
      state: pass ? 'pass' : 'fail',
      evidence: `集中度由 ${first.supply_concentration_hhi.toFixed(3)}（${first.year}）变为 ${last.supply_concentration_hhi.toFixed(3)}（${last.year}）。`
    }
  },
  longterm_share_majority: (ctx) => {
    const last = ctx.rows[ctx.rows.length - 1]
    const mix = Array.isArray(last?.contract_mix) ? last.contract_mix : []
    const longTerm = mix.find((item) => String(item?.contract_type || '').includes('长协'))
    if (!longTerm || longTerm.share == null || !Number.isFinite(Number(longTerm.share))) return { state: 'pending', evidence: '实验结果中没有完整的合同结构数据。' }
    const share = Number(longTerm.share || 0)
    return {
      state: share >= 0.5 ? 'pass' : 'fail',
      evidence: `${last.year} 年长协占比 ${(share * 100).toFixed(0)}%。`
    }
  }
}

const STATE_TEXT = { pass: '满足', fail: '不满足', pending: '待核验' }

const validationRows = computed(() => {
  const ctx = { rows: timeline.value, peakRow: peakRow.value, caseYears: matched.value.years }
  return (caseDef.value?.validationPoints || []).map((point) => {
    const checker = CHECKERS[point.check]
    const result = checker ? checker(ctx) : { state: 'pending', evidence: '' }
    return { ...point, ...result, stateText: STATE_TEXT[result.state] || '待核验' }
  })
})

// ---------- Hero ----------
const heroTags = computed(() => {
  const def = caseDef.value
  if (!def) return []
  const base = [
    { label: '时段', value: def.period, type: 'primary' },
    { label: '类型', value: def.category },
    ...(def.scope || []).map((item) => ({ label: item }))
  ]
  if (def.status !== 'ready') return [...base, { label: '状态', value: '调研中', type: 'warning' }]
  const passCount = validationRows.value.filter((item) => item.state === 'pass').length
  return [
    ...base,
    { label: '验证', value: `${passCount} / ${validationRows.value.length} 通过`, type: passCount === validationRows.value.length && validationRows.value.length ? 'success' : 'warning' }
  ]
})

// ---------- 图表 ----------
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
    symbolSize: 8,
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
        label: { show: true, formatter: '案例', color: INK.muted, fontSize: 10, position: 'insideEndTop', rotate: 0 },
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
    grid: { left: 8, right: 16, top: 34, bottom: 6, containLabel: true },
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
    grid: { left: 8, right: 16, top: 34, bottom: 6, containLabel: true },
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
  renderChart(lineChartRef, () => lineChart, (c) => { lineChart = c }, buildLineOption)
  renderChart(barChartRef, () => barChart, (c) => { barChart = c }, buildBarOption)
  renderChart(bullwhipChartRef, () => bullwhipChart, (c) => { bullwhipChart = c }, buildBullwhipOption)
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
.case-analysis { height: 100%; overflow: auto; box-sizing: border-box; padding: 12px 16px 24px; color: #334155; font-size: 13px; }
.case-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
.case-picker { display: flex; align-items: center; gap: 12px; }
.case-picker label, .case-period, .case-meta { color: #64748b; font-size: 12px; }
.case-picker .el-select { width: 340px; max-width: 65vw; }
.ca-main { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.case-heading h1 { margin: 0; font-size: 20px; line-height: 1.5; color: #1e293b; font-weight: 600; }
.case-heading > p { margin: 8px 0; max-width: 1000px; line-height: 1.8; color: #475569; }
.case-meta { display: flex; flex-wrap: wrap; gap: 8px 24px; margin-top: 6px; }
.case-tabs { display: flex; gap: 4px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; position: sticky; top: 0; z-index: 5; }
.case-tabs button { padding: 9px 18px; border: 0; border-radius: 6px; color: #64748b; background: transparent; font: inherit; cursor: pointer; }
.case-tabs button:hover { background: #f8fafc; }
.case-tabs button.active { background: #eff6ff; color: #2563eb; font-weight: 600; }
button:focus-visible, summary:focus-visible, [role=button]:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
.ca-panel { min-width: 0; padding: 18px; }
.ca-grid-2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.analysis-column-head { margin-bottom: 16px; }
.analysis-column-head .analysis-column-index { display: none; }
.analysis-column-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
.analysis-column-head p { margin: 6px 0 0; color: #64748b; font-size: 13px; line-height: 1.7; }
.ca-timeline { padding: 0; margin: 0 0 20px; list-style: none; }
.ca-timeline li { display: grid; grid-template-columns: 94px minmax(0, 1fr); gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
.ca-timeline time { color: #2563eb; font-size: 12px; }
.ca-timeline p { margin: 0; line-height: 1.7; }
.ca-facts { margin: 0; }
.ca-facts > div { display: grid; grid-template-columns: 100px minmax(0, 1fr); gap: 12px; padding: 10px 0; }
.ca-facts dt { color: #64748b; }
.ca-facts dd { margin: 0; line-height: 1.7; }
.ca-facts dd span { display: block; color: #64748b; font-size: 12px; }
.ca-source-note { color: #64748b; font-size: 12px; line-height: 1.7; margin: 12px 0 0; }
.ca-mapping-row { display: grid; grid-template-columns: 110px minmax(0, 1fr) minmax(0, 1fr); gap: 12px; padding: 12px 8px; border-bottom: 1px solid #edf2f7; line-height: 1.7; }
.ca-mapping-row.head { color: #64748b; background: #f8fafc; font-size: 12px; }
.ca-mapping-system { font-weight: 600; }
.ca-hits { display: grid; gap: 8px; margin-top: 20px; }
.ca-hits-label { font-weight: 600; }
.ca-hit-chip { display: flex; gap: 12px; padding: 10px; background: #f8fafc; border-radius: 6px; line-height: 1.7; }
.ca-hit-chip b { color: #2563eb; }
.ca-hit-empty { color: #64748b; line-height: 1.7; }
.ca-metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); background: #f8fafc; border-radius: 8px; margin-bottom: 18px; }
.ca-metric-card { min-width: 0; padding: 14px 16px; }
.ca-metric-card span, .ca-metric-card small { display: block; font-size: 12px; color: #64748b; line-height: 1.6; overflow-wrap: anywhere; }
.ca-metric-card strong { display: block; margin: 5px 0; font-size: 21px; font-weight: 600; color: #1e293b; }
.ca-chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.ca-chart-card { margin: 0; min-width: 0; }
.ca-chart-card figcaption { margin-bottom: 16px; display: flex; flex-direction: column; gap: 4px; }
.ca-chart-card figcaption b { font-size: 14px; font-weight: 600; }
.ca-chart-card figcaption span { color: #64748b; font-size: 12px; line-height: 1.6; }
.ca-chart { width: 100%; height: 280px; }
.ca-chart-bullwhip { height: 310px; }
.ca-table-details { margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 12px; overflow-x: auto; }
.ca-table-details summary { cursor: pointer; color: #475569; padding: 3px 0; }
.ca-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; min-width: 680px; }
.ca-table th, .ca-table td { padding: 10px 8px; text-align: right; border-bottom: 1px solid #edf2f7; white-space: nowrap; }
.ca-table th { color: #64748b; font-weight: 500; background: #f8fafc; }
.ca-table th:first-child, .ca-table td:first-child { text-align: left; }
.ca-table tr.hit { background: #eff6ff; }
.annual-ratios { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-top: 14px; }
.annual-ratios b { margin-left: 8px; color: #1e293b; }
.bw-controls { display: grid; grid-template-columns: 160px 200px minmax(180px, 1fr) 190px; gap: 16px; align-items: end; }
.bw-controls > label { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.bw-controls > label > span { color: #64748b; font-size: 12px; }
.bw-controls .el-select { width: 100%; }
.bw-context { color: #64748b; font-size: 12px; line-height: 1.7; margin: 14px 0 18px; }
.bw-layout, .bw-main { min-width: 0; }
.ca-bullwhip .ca-metric-grid { margin-bottom: 14px; }
.ca-bullwhip .ca-metric-card { padding: 10px 14px; }
.ca-bullwhip .ca-metric-card strong { font-size: 19px; }
.bw-lower { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 28px; margin-top: 24px; }
.bw-panel { min-width: 0; border-top: 1px solid #e2e8f0; padding-top: 18px; }
.bw-panel-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; align-items: baseline; margin-bottom: 12px; }
.bw-panel-head h4 { margin: 0; font-size: 14px; font-weight: 600; }
.bw-kicker { display: none; }
.bw-unit-note { color: #64748b; font-size: 12px; }
.bw-amp-row { display: grid; grid-template-columns: minmax(92px, 1fr) 1fr 1fr; gap: 16px; align-items: center; padding: 12px 0; border-bottom: 1px solid #edf2f7; }
.bw-amp-row.head, .bw-compare-row.head { color: #64748b; font-size: 12px; }
.bw-amp-name { display: flex; align-items: center; gap: 6px; }
.bw-amp-name > i { width: 7px; height: 7px; border-radius: 50%; }
.bw-amp-cell { display: grid; gap: 6px; }
.bw-amp-cell em { height: 4px; background: #f1f5f9; border-radius: 2px; overflow: hidden; }
.bw-amp-cell em i { display: block; height: 100%; }
.ca-chain { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: #64748b; font-size: 12px; margin-top: 16px; }
.ca-chain i { font-style: normal; }
.bw-compare-row { display: grid; grid-template-columns: minmax(140px, 1.5fr) 1fr 1fr 70px; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #edf2f7; font-size: 12px; }
.bw-compare-row small { display: block; color: #64748b; line-height: 1.5; margin-top: 4px; }
.good { color: #15803d; }.bad { color: #b45309; }.neutral { color: #64748b; }
.bw-conclusion { padding: 12px 0; font-size: 13px; line-height: 1.8; }
.bw-conclusion > span { color: #2563eb; margin-right: 8px; }
.bw-conclusion b { font-weight: 500; }
.bw-compare-note { margin: 0; color: #64748b; font-size: 12px; line-height: 1.8; }
.ca-validation-grid { display: grid; gap: 24px; }
.ca-check-list, .ca-research-list { margin: 0; padding: 0; list-style: none; }
.ca-check-list li { display: flex; align-items: start; gap: 12px; padding: 14px 0; border-bottom: 1px solid #edf2f7; }
.ca-check-icon { color: #64748b; font-size: 18px; }
.pass .ca-check-icon { color: #15803d; }.fail .ca-check-icon { color: #b45309; }
.ca-check-list b { font-weight: 600; }.ca-check-list em { margin-left: 10px; color: #64748b; font-size: 12px; font-weight: 400; font-style: normal; }
.ca-check-list li > div > span { display: block; line-height: 1.8; margin-top: 5px; color: #64748b; }
.ca-compare { overflow-x: auto; }
.ca-compare-row { display: grid; grid-template-columns: minmax(220px, 2fr) repeat(4, minmax(100px, 1fr)); gap: 12px; padding: 14px 10px; min-width: 700px; border-bottom: 1px solid #edf2f7; cursor: pointer; font-size: 12px; }
.ca-compare-row.head { cursor: default; color: #64748b; background: #f8fafc; }.ca-compare-row.active { background: #eff6ff; }
.ca-research-list li { padding: 14px 0; border-bottom: 1px solid #edf2f7; }.ca-research-list span { display: block; color: #64748b; margin-top: 6px; line-height: 1.7; }
/* 方法有效性量化验证看板 */
.method-effectiveness-board {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 249, 255, 0.85) 100%);
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  box-shadow: 0 4px 18px rgba(37, 99, 235, 0.06);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.eff-board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  border-bottom: 1px solid #e0f2fe;
  padding-bottom: 14px;
}
.eff-board-title-group {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 280px;
}
.eff-badge {
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  margin-top: 2px;
  flex-shrink: 0;
}
.eff-heading-text h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: #1e3a8a;
  letter-spacing: 0.2px;
}
.eff-heading-text p {
  margin: 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.6;
}
.eff-resilience-badge {
  background: linear-gradient(135deg, #1e40af, #2563eb);
  color: #fff;
  padding: 10px 18px;
  border-radius: 10px;
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  box-shadow: 0 3px 10px rgba(37, 99, 235, 0.25);
}
.eff-resilience-label {
  font-size: 11px;
  opacity: 0.85;
  letter-spacing: 0.5px;
}
.eff-resilience-value {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.5px;
  color: #93c5fd;
}
.eff-resilience-status {
  font-size: 11px;
  color: #dbeafe;
}

/* 4 KPI Cards Grid */
.eff-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.eff-kpi-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.eff-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.08);
  border-color: #93c5fd;
}
.eff-kpi-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.eff-kpi-name {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}
.eff-kpi-delta {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #475569;
}
.eff-kpi-delta.positive {
  background: #dcfce7;
  color: #15803d;
}
.eff-comparison-tracks {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #f8fafc;
  padding: 8px 10px;
  border-radius: 8px;
}
.eff-track {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}
.eff-track .track-label {
  color: #64748b;
  font-size: 11px;
}
.eff-track .track-val {
  font-size: 12px;
  color: #334155;
  font-weight: 600;
}
.eff-track.baseline-track .track-val {
  color: #64748b;
  text-decoration: line-through;
  opacity: 0.85;
}
.eff-track.method-track .track-val.highlight {
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}
.eff-kpi-desc {
  margin: 0;
  font-size: 11px;
  color: #64748b;
  line-height: 1.5;
}

/* 4 Mechanisms Attribution */
.eff-mechanisms-panel {
  border-top: 1px dashed #cbd5e1;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.eff-mech-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.eff-mech-title {
  font-size: 12px;
  font-weight: 700;
  color: #1e3a8a;
}
.eff-mech-subtitle {
  font-size: 11px;
  color: #64748b;
}
.eff-mech-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.eff-mech-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #f0f7ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 8px 10px;
}
.eff-mech-num {
  font-size: 12px;
  font-weight: 800;
  color: #2563eb;
  opacity: 0.7;
}
.eff-mech-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eff-mech-info strong {
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
}
.eff-mech-info span {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

/* 优化 details 样式，避免简陋感 */
.ca-table-details {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  margin-top: 14px;
}
.ca-table-details summary {
  cursor: pointer;
  color: #1e40af;
  font-weight: 600;
  font-size: 13px;
  user-select: none;
}
.ca-table-details summary:hover {
  color: #2563eb;
}
@media (max-width: 1200px) {
  .eff-kpi-grid, .eff-mech-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bw-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bw-lower { grid-template-columns: 1fr; }
}
@media (max-width: 900px) { .ca-grid-2, .ca-chart-grid { grid-template-columns: 1fr; }.case-period { display: none; }.ca-panel { padding: 14px; } }
@media (max-width: 600px) {
  .eff-kpi-grid, .eff-mech-grid { grid-template-columns: 1fr; }
  .case-analysis { padding: 10px; }.case-tabs button { padding: 8px; flex: 1; }.bw-controls { grid-template-columns: 1fr; }.bw-compare-row { grid-template-columns: minmax(100px, 1.5fr) 1fr 1fr 50px; gap: 6px; }.ca-mapping-row { grid-template-columns: 90px minmax(0, 1fr); }.ca-mapping-effect { grid-column: 2; }
}
</style>
