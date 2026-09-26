<template>
  <div class="case-analysis analysis-page">
    <div class="ca-layout">
      <!-- 案例库：案例分析挂在运行管理之下，这里可以在案例之间切换，调研中的案例只展示背景 -->
      <aside class="ca-library glass-panel">
        <div class="ca-library-head">
          <strong>典型验证案例</strong>
          <span>{{ readyCount }} 个可验证 · {{ researchCount }} 个调研中</span>
        </div>
        <button
          v-for="item in caseLibrary"
          :key="item.id"
          type="button"
          class="ca-library-item"
          :class="{ active: item.id === caseDef?.id, research: item.status !== 'ready' }"
          @click="switchCase(item.id)"
        >
          <b>{{ item.title }}</b>
          <small>
            <em>{{ item.status === 'ready' ? '可验证' : '调研中' }}</em>
            {{ item.period }}
          </small>
          <span>{{ item.category }}</span>
        </button>
        <p class="ca-library-note">案例发生后的影响需映射到系统数据：事件库 → 供给 / 价格 / 制造模块 → 观测指标。</p>
      </aside>

      <div class="ca-main">
        <div v-if="!caseDef" class="ca-empty">
          <el-empty description="未找到该案例，请从左侧案例库选择" :image-size="90" />
        </div>

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
                <p>该案例已登记在案例库，历史数据补充完成后会自动获得下方的时间线、数据映射、仿真对照与验证点核验。</p>
              </div>
            </div>
            <ul class="ca-research-list">
              <li><b>时间线与关键事实</b><span>事件顺序、受影响环节、市场反应与采购行为变化。</span></li>
              <li><b>事件到系统数据的映射</b><span>对应年份注入事件库，落到供给方 / 价格模型 / 制造方 Agent 的哪些参数。</span></li>
              <li><b>验证点</b><span>可由实验结果自动判定的检查项，例如缺口峰值年份、集中度走势、长协占比。</span></li>
              <li><b>关键词</b><span>{{ caseDef.eventKeywords?.length ? caseDef.eventKeywords.join('、') : '尚未登记，用于与实验年度事件做匹配。' }}</span></li>
            </ul>
          </section>
        </template>

        <template v-else>
      <AnalysisPageHero
        eyebrow="实验推演 · 案例分析"
        :title="caseDef.title"
        :headline="caseDef.summary"
        :tags="heroTags"
      >
        <template #side>
          <div class="ca-side">
            <label class="ca-select">
              <span>对照实验</span>
              <el-select
                v-model="selectedExperimentId"
                size="small"
                placeholder="选择已完成实验"
                @change="onExperimentChange"
              >
                <el-option
                  v-for="row in experimentOptions"
                  :key="row.value"
                  :label="row.label"
                  :value="row.value"
                />
              </el-select>
            </label>
            <div class="ca-side-stats">
              <article>
                <span>命中年份</span>
                <strong>{{ matched.years.length ? matched.years.join(' / ') : '无' }}</strong>
              </article>
              <article>
                <span>年度窗口</span>
                <strong>{{ timelineRangeText }}</strong>
              </article>
            </div>
          </div>
        </template>
      </AnalysisPageHero>

      <div class="ca-grid-2">
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
              <h3>事件到系统数据的映射</h3>
              <p>案例发生后的影响落到哪个仿真模块，最终体现在哪些观测指标上。</p>
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
            <span class="ca-hits-label">本实验命中的年度事件</span>
            <template v-if="matched.hits.length">
              <span v-for="hit in matched.hits" :key="hit.year" class="ca-hit-chip">
                <b>{{ hit.year }}</b>{{ hit.events.join('；') }}
              </span>
            </template>
            <span v-else class="ca-hit-empty">当前实验的年度事件中没有匹配到案例关键词，请更换对照实验。</span>
          </div>
        </section>
      </div>

      <!-- 03 仿真结果对照 -->
      <section class="ca-panel glass-panel">
        <div class="analysis-column-head">
          <span class="analysis-column-index">03</span>
          <div>
            <h3>仿真结果与案例对照</h3>
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
              <span>以首年为 100 的指数，虚线为案例命中年份</span>
            </figcaption>
            <div ref="lineChartRef" class="ca-chart ca-chart-line"></div>
          </figure>
          <figure class="ca-chart-card">
            <figcaption>
              <b>年度需求缺口</b>
              <span>深色为案例命中年份，单位 tU</span>
            </figcaption>
            <div ref="barChartRef" class="ca-chart ca-chart-bar"></div>
          </figure>
        </div>
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

      <!-- 04 牛鞭效应实验 -->
      <section class="ca-panel glass-panel ca-bullwhip">
        <div class="analysis-column-head">
          <span class="analysis-column-index">04</span>
          <div>
            <h3>牛鞭效应实验</h3>
            <p>在案例作用年份注入需求冲击，观察采购信号沿贸易、转化与供给节点的传导与放大，并对照基线采购与协同调度两种策略。</p>
          </div>
        </div>
        <div class="bw-layout">
          <aside class="bw-rail">
            <div class="bw-rail-title"><span>实验设定</span><b>01</b></div>
            <label>需求冲击窗口</label>
            <el-select v-model="shockYear" size="small" class="bw-full">
              <el-option
                v-for="row in timeline"
                :key="row.year"
                :label="`${row.year} 年 · ${fmt('unmet_demand_tU', row.unmet_demand_tU)} 缺口${caseYearSet.has(row.year) ? ' · 案例' : ''}`"
                :value="row.year"
              />
            </el-select>
            <label>冲击幅度</label>
            <el-radio-group v-model="shockSize" size="small" class="bw-shock-options">
              <el-radio-button :value="15">+15%</el-radio-button>
              <el-radio-button :value="20">+20%</el-radio-button>
              <el-radio-button :value="30">+30%</el-radio-button>
            </el-radio-group>
            <label>策略口径</label>
            <el-select v-model="strategy" size="small" class="bw-full">
              <el-option label="基线 / 协同对照" value="compare" />
              <el-option label="基线采购" value="baseline" />
              <el-option label="协同调度" value="system" />
            </el-select>
            <label>协同调度对照实验</label>
            <el-select v-model="comparatorExperimentId" size="small" class="bw-full" placeholder="选择另一个实验">
              <el-option v-for="row in comparatorOptions" :key="row.value" :label="row.label" :value="row.value" />
            </el-select>
            <div class="bw-formula">
              <span>放大倍数</span>
              <b>Var(层级订货) ÷ Var(终端需求)</b>
              <small>用于判断波动是否沿上游放大</small>
            </div>
            <div class="bw-window-signal">
              <div><span>风险暴露</span><b>{{ fmt('average_risk_exposure', shockRow?.average_risk_exposure) }}</b></div>
              <div><span>供给集中度</span><b>{{ fmt('supply_concentration_hhi', shockRow?.supply_concentration_hhi) }}</b></div>
            </div>
            <div class="bw-rail-note">
              <i></i>
              <div>
                <b>为什么看这个指标？</b>
                <p>库存覆盖和缺口说明结果，放大倍数解释结果为什么发生。</p>
              </div>
            </div>
          </aside>

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
                <b>需求冲击如何向上游放大</b>
                <span>{{ shockYear }} 年 · 需求 +{{ shockSize }}% · 月度指数（冲击前 = 100）· 模型推演</span>
              </figcaption>
              <div ref="bullwhipChartRef" class="ca-chart ca-chart-bullwhip"></div>
            </figure>

            <div class="bw-lower">
              <article class="bw-panel">
                <div class="bw-panel-head">
                  <div>
                    <span class="bw-kicker">02 · 分层结果</span>
                    <h4>波动在各节点的放大</h4>
                  </div>
                  <span class="bw-unit-note">越接近 1 越稳定 · 模型系数</span>
                </div>
                <div class="bw-amp-table">
                  <div class="bw-amp-row head">
                    <span>层级</span>
                    <span>基线采购</span>
                    <span>协同调度</span>
                  </div>
                  <div v-for="row in amplificationRows" :key="row.name" class="bw-amp-row">
                    <span class="bw-amp-name"><i :style="{ background: row.color }"></i>{{ row.name }}</span>
                    <span class="bw-amp-cell">
                      <b>{{ row.baseline.toFixed(2) }}×</b>
                      <em><i :style="{ width: barWidth(row.baseline), background: row.color }"></i></em>
                    </span>
                    <span class="bw-amp-cell">
                      <b>{{ row.system.toFixed(2) }}×</b>
                      <em><i :style="{ width: barWidth(row.system), background: row.color }"></i></em>
                    </span>
                  </div>
                </div>
                <div class="bw-measured">
                  <span class="bw-kicker">实测 · 当前实验年度序列</span>
                  <div v-for="item in measuredRatios" :key="item.name" class="bw-measured-row">
                    <span>{{ item.name }}</span>
                    <em><i :style="{ width: item.trackWidth, background: item.color }"></i></em>
                    <b>{{ item.ratioText }}</b>
                  </div>
                  <p>{{ amplificationNote }}</p>
                </div>
                <div class="ca-chain">
                  <span class="ca-chain-node">核电需求</span>
                  <i>→</i>
                  <span class="ca-chain-node">贸易商</span>
                  <i>→</i>
                  <span class="ca-chain-node">转化节点</span>
                  <i>→</i>
                  <span class="ca-chain-node">铀供应商</span>
                </div>
              </article>

              <article class="bw-panel">
                <div class="bw-panel-head">
                  <div>
                    <span class="bw-kicker">03 · 策略结论</span>
                    <h4>同一冲击下的方案对照</h4>
                  </div>
                  <span class="bw-unit-note">固定 {{ shockYear }} 年窗口与 +{{ shockSize }}% 冲击</span>
                </div>
                <div class="bw-compare">
                  <div class="bw-compare-row head">
                    <span>观察项</span>
                    <span>基线采购</span>
                    <span>协同调度</span>
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
                  基线采购 = 当前对照实验「{{ baselineLabel }}」；协同调度 = 「{{ comparatorLabel }}」。缺口、风险、库存、集中度来自实验结果；放大倍数与恢复时间为模型推演。
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <!-- 05 验证结论 -->
      <section class="ca-panel glass-panel">
        <div class="analysis-column-head">
          <span class="analysis-column-index">05</span>
          <div>
            <h3>验证结论</h3>
            <p>按案例预设的验证点自动核验当前实验结果，并给出各策略实验的对照。</p>
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
              <span>平均风险</span>
              <span>库存覆盖</span>
              <span>集中度</span>
            </div>
            <div
              v-for="row in comparisonRows"
              :key="row.experiment_id"
              class="ca-compare-row"
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

      <footer class="ca-foot">
        <span>数据链路：历史案例 → 事件库注入 → 年度仿真 → 观测指标 → 牛鞭效应实验 → 验证点核验</span>
        <em>{{ experimentLabel }}</em>
      </footer>
        </template>
      </div>
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
import { URANIUM_CASE_LIBRARY, findCaseById, matchCaseTimeline } from '@/views/SCnet/mock/uraniumCaseLibrary'

defineOptions({ name: 'UraniumCaseAnalysis' })

const props = defineProps({
  caseId: { type: String, default: '' }
})

const route = useRoute()
const router = useRouter()

// ---------- 案例库（左栏切换） ----------
const caseLibrary = URANIUM_CASE_LIBRARY
const readyCount = caseLibrary.filter((item) => item.status === 'ready').length
const researchCount = caseLibrary.length - readyCount
function switchCase(id) {
  if (!id || id === props.caseId) return
  router.replace({ query: { ...route.query, view: 'case', case: id } })
}

// 图表配色：系列色取自已校验的分类调色板前三档，文字与网格使用墨色刻度
const SERIES_COLORS = Object.freeze({ demand: '#2a78d6', procured: '#eb6834', supply: '#1baf7a' })
const LAYER_COLORS = Object.freeze({ trade: '#2a78d6', conversion: '#eb6834', supplier: '#1baf7a' })
const EMPHASIS_BAR = '#2a78d6'
const MUTED_BAR = '#86b6ef'
const INK = Object.freeze({ secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7' })

const demoStore = useUraniumDemoStore()
const { history, selectedExperiment } = storeToRefs(demoStore)

const caseDef = computed(() => findCaseById(props.caseId))
const selectedExperimentId = ref('')

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
const experimentLabel = computed(() => {
  const exp = selectedExperiment.value
  if (!exp) return '尚未选择对照实验'
  return `对照实验：${exp.name || exp.experiment_id}`
})

const experimentOptions = computed(() => history.value.map((row) => ({
  value: row.experiment_id,
  label: row.name || row.experiment_id
})))

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
  selectedExperimentId.value = id
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
      hint: peakRow.value ? `${peakRow.value.year} 年${caseYearSet.value.has(peakRow.value.year) ? ' · 案例命中年份' : ''}` : '无数据'
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

// ---------- 04 牛鞭效应实验 ----------
const shockYear = ref(null)
const shockSize = ref(20)
const strategy = ref('compare')
const comparatorExperimentId = ref('')

// 默认冲击窗口：最后一个案例命中年份，其次是缺口峰值年份
watch([() => matched.value.years, timeline], ([years, rows]) => {
  const valid = rows.some((row) => row.year === shockYear.value)
  if (valid) return
  shockYear.value = years[years.length - 1] ?? peakRow.value?.year ?? rows[0]?.year ?? null
}, { immediate: true })

const shockRow = computed(() => timeline.value.find((row) => row.year === shockYear.value) || timeline.value[0] || null)

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
  const last = rows[rows.length - 1]
  if (!last) return 0.5
  const longTerm = (last.contract_mix || []).find((item) => String(item?.contract_type || '').includes('长协'))
  const share = Number(longTerm?.share ?? 0.5)
  const inventory = Number(last.inventory_coverage_years ?? 1)
  return clamp(share * inventory, 0, 1)
}

// 参考放大系数（贸易 / 转化 / 供给），按缓冲能力折算成有效系数
const BASE_LAYERS = Object.freeze([
  { key: 'trade', name: '贸易商', factor: 1.35, response: 0.9 },
  { key: 'conversion', name: '转化节点', factor: 1.85, response: 0.82 },
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
const systemLayers = computed(() => effectiveLayers(comparatorExperiment.value ? bufferOf(comparatorExperiment.value) : 0.85))

const MONTHS = Array.from({ length: 21 }, (_, index) => `月${index + 1}`)
const shockIndex = computed(() => {
  const idx = timeline.value.findIndex((row) => row.year === shockYear.value)
  return clamp(4 + Math.max(idx, 0) * 3, 4, 14)
})
const demandSeries = computed(() => MONTHS.map((_, index) => {
  if (index === shockIndex.value) return 100 + shockSize.value
  if (index === shockIndex.value + 1) return Math.round(100 + shockSize.value * 0.4)
  return 100
}))
function propagate(layer) {
  return demandSeries.value.map((value, index) => {
    const delay = index - shockIndex.value
    const excess = value * (layer.factor - 1)
    let pulse = 0
    if (delay === 0) pulse = excess
    else if (delay === 1) pulse = excess * layer.response
    else if (delay === 2) pulse = excess * layer.response * 0.45
    else if (delay === 3) pulse = excess * layer.response * 0.15
    return Math.round(value + pulse)
  })
}
function recoveryMonths(series) {
  let last = shockIndex.value
  series.forEach((value, index) => {
    if (Math.abs(value - 100) > 5) last = index
  })
  return Math.max(1, last - shockIndex.value + 1)
}

const bullwhipMetrics = computed(() => {
  const layers = strategy.value === 'system' ? systemLayers.value : baselineLayers.value
  const maxFactor = Math.max(...layers.map((item) => item.factor))
  const supplierSeries = propagate(layers[layers.length - 1])
  return [
    { label: '最大放大倍数', value: `${maxFactor.toFixed(2)}×`, hint: `${strategy.value === 'system' ? '协同调度' : '基线采购'} · 模型系数` },
    { label: '当前需求缺口', value: shockRow.value ? fmt('unmet_demand_tU', shockRow.value.unmet_demand_tU) : '—', hint: `${shockYear.value ?? '—'} 年压力窗口 · 实验结果` },
    { label: '库存覆盖', value: shockRow.value ? fmt('inventory_coverage_years', shockRow.value.inventory_coverage_years) : '—', hint: '来自当前对照实验' },
    { label: '预计恢复时间', value: `${recoveryMonths(supplierSeries)} 个月`, hint: '供应商层回到冲击前 ±5% · 模型推演' }
  ]
})

const amplificationRows = computed(() => BASE_LAYERS.map((layer, index) => ({
  name: layer.name,
  color: LAYER_COLORS[layer.key],
  baseline: baselineLayers.value[index].factor,
  system: systemLayers.value[index].factor
})))
const barWidth = (value) => `${Math.min(100, (value / 3) * 100).toFixed(1)}%`

// 实测方差比：由当前实验年度序列计算
function variance(values = []) {
  const nums = values.map(Number).filter(Number.isFinite)
  if (nums.length < 2) return null
  const mean = nums.reduce((sum, item) => sum + item, 0) / nums.length
  return nums.reduce((sum, item) => sum + (item - mean) ** 2, 0) / nums.length
}
const measuredRatios = computed(() => {
  const rows = timeline.value
  const demandVar = variance(rows.map((row) => row.total_demand_tU))
  const layers = [
    { name: '采购订单', key: 'total_procured_tU', color: SERIES_COLORS.procured },
    { name: '上游供给', key: 'total_supply_tU', color: SERIES_COLORS.supply }
  ]
  const computedRows = layers.map((layer) => {
    const layerVar = variance(rows.map((row) => row[layer.key]))
    const ratio = demandVar && layerVar != null ? layerVar / demandVar : null
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
  if (!ratios.length) return '当前实验年度序列不足，无法计算实测放大倍数。'
  const maxItem = ratios.reduce((best, item) => (item.ratio > best.ratio ? item : best), ratios[0])
  if (maxItem.ratio > 1) {
    return `实测：${maxItem.name}的年度波动是终端需求的 ${maxItem.ratio.toFixed(2)} 倍，需求冲击在向上游传导时被放大。`
  }
  return `实测：各层级年度波动均不高于终端需求（最高 ${maxItem.ratio.toFixed(2)} 倍），长协与库存缓冲吸收了需求波动，未出现明显牛鞭放大。`
})

// 策略对照：实验结果指标 + 模型指标
function deltaText(baseline, system, { lowerIsBetter = true, unit = '', digits = 1 } = {}) {
  const b = Number(baseline)
  const s = Number(system)
  if (!Number.isFinite(b) || !Number.isFinite(s)) return { text: '—', tone: 'neutral' }
  if (unit) {
    const diff = s - b
    const better = lowerIsBetter ? diff < 0 : diff > 0
    return { text: `${diff > 0 ? '↑' : diff < 0 ? '↓' : '—'} ${Math.abs(diff).toFixed(digits)}${unit}`, tone: better ? 'good' : diff === 0 ? 'neutral' : 'bad' }
  }
  if (b === 0) return { text: '—', tone: 'neutral' }
  const pct = ((s - b) / Math.abs(b)) * 100
  const better = lowerIsBetter ? pct < 0 : pct > 0
  return { text: `${pct > 0 ? '↑' : pct < 0 ? '↓' : '—'} ${Math.abs(pct).toFixed(digits)}%`, tone: better ? 'good' : pct === 0 ? 'neutral' : 'bad' }
}

const strategyComparisonRows = computed(() => {
  const b = baselineSummary.value || {}
  const s = comparatorSummary.value || {}
  const hasComparator = !!comparatorSummary.value
  const baseMax = Math.max(...baselineLayers.value.map((item) => item.factor))
  const sysMax = Math.max(...systemLayers.value.map((item) => item.factor))
  const baseRecovery = recoveryMonths(propagate(baselineLayers.value[2]))
  const sysRecovery = recoveryMonths(propagate(systemLayers.value[2]))
  const rows = [
    { label: '缺口峰值', note: '年度最大值 · 实验结果', b: b.max_unmet_demand_tU, s: s.max_unmet_demand_tU, key: 'max_unmet_demand_tU' },
    { label: '平均风险暴露', note: '全窗口均值 · 实验结果', b: b.avg_risk_exposure, s: s.avg_risk_exposure, key: 'avg_risk_exposure' },
    { label: '库存覆盖', note: '年度期末 · 实验结果', b: b.final_inventory_coverage_years, s: s.final_inventory_coverage_years, key: 'final_inventory_coverage_years', lowerIsBetter: false, unit: ' 年', digits: 2 },
    { label: '供给集中度', note: '期末 HHI · 实验结果', b: b.final_supply_concentration_hhi, s: s.final_supply_concentration_hhi, key: 'final_supply_concentration_hhi' }
  ].map((row) => {
    const delta = hasComparator ? deltaText(row.b, row.s, { lowerIsBetter: row.lowerIsBetter !== false, unit: row.unit || '', digits: row.digits ?? 1 }) : { text: '—', tone: 'neutral' }
    return {
      label: row.label,
      note: row.note,
      baseline: fmt(row.key, row.b),
      system: hasComparator ? fmt(row.key, row.s) : '—',
      delta: delta.text,
      tone: delta.tone
    }
  })
  const ampDelta = deltaText(baseMax, sysMax)
  const recDelta = deltaText(baseRecovery, sysRecovery, { unit: ' 个月', digits: 0 })
  rows.push(
    { label: '最大放大倍数', note: '供应商层级 · 模型', baseline: `${baseMax.toFixed(2)}×`, system: `${sysMax.toFixed(2)}×`, delta: ampDelta.text, tone: ampDelta.tone },
    { label: '恢复时间', note: '回到冲击前 ±5% · 模型', baseline: `${baseRecovery} 个月`, system: `${sysRecovery} 个月`, delta: recDelta.text, tone: recDelta.tone }
  )
  return rows
})

const strategyConclusion = computed(() => {
  if (!comparatorSummary.value) return '选择另一个已完成实验作为协同调度对照，即可比较两种策略在同一冲击下的表现。'
  const goodCount = strategyComparisonRows.value.filter((row) => row.tone === 'good').length
  if (goodCount >= 4) return '先平滑采购信号，再用库存和多源分配承接压力，才能同时降低上游波动与缺口风险。'
  if (goodCount >= 2) return '协同调度在部分指标上改善明显，但需检查其成本与库存代价是否可接受。'
  return '当前对照实验未体现协同优势，建议更换对照或检查其长协占比与库存目标设定。'
})

// ---------- 05 验证点核验 ----------
const CHECKERS = {
  peak_in_case_years: (ctx) => {
    if (!ctx.peakRow) return { state: 'pending', evidence: '缺少年度缺口数据。' }
    if (!ctx.caseYears.length) return { state: 'pending', evidence: '当前实验未命中案例年份，无法核验。' }
    const pass = ctx.caseYears.includes(ctx.peakRow.year)
    return {
      state: pass ? 'pass' : 'fail',
      evidence: `缺口峰值 ${fmt('unmet_demand_tU', ctx.peakRow.unmet_demand_tU)} 出现在 ${ctx.peakRow.year} 年，案例命中年份为 ${ctx.caseYears.join(' / ')}。`
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
    if (!longTerm) return { state: 'pending', evidence: '实验结果中没有合同结构数据。' }
    const share = Number(longTerm.share || 0)
    return {
      state: share >= 0.5 ? 'pass' : 'fail',
      evidence: `${last.year} 年长协占比 ${(share * 100).toFixed(0)}%。`
    }
  }
}

const STATE_TEXT = { pass: '通过', fail: '未通过', pending: '待核验' }

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
    data: [{ xAxis: MONTHS[shockIndex.value] }]
  }
  const series = [lineSeries({ name: '终端需求', data: demandSeries.value, color: INK.secondary, dashed: true, markLine: shockMark })]
  if (strategy.value === 'compare') {
    series.push(
      lineSeries({ name: '基线 · 铀供应商', data: propagate(baselineLayers.value[2]), color: LAYER_COLORS.trade }),
      lineSeries({ name: '协同 · 铀供应商', data: propagate(systemLayers.value[2]), color: LAYER_COLORS.conversion })
    )
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
    xAxis: { type: 'category', data: MONTHS, boundaryGap: false, ...AXIS_STYLE },
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

watch([timeline, () => caseDef.value?.id, shockYear, shockSize, strategy, comparatorExperimentId], () => nextTick(renderCharts))

onMounted(async () => {
  await demoStore.ensureInitialized()
  selectedExperimentId.value = demoStore.selectedExperimentId || ''
  if (selectedExperimentId.value && !selectedExperiment.value) {
    await demoStore.loadExperiment(selectedExperimentId.value)
  }
  window.addEventListener('resize', resizeCharts)
  await nextTick()
  renderCharts()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  lineChart?.dispose()
  barChart?.dispose()
  bullwhipChart?.dispose()
  lineChart = null
  barChart = null
  bullwhipChart = null
})
</script>

<style scoped>
.case-analysis {
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
  padding-bottom: 20px;
}
.ca-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Hero 侧栏 */
.ca-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 260px;
}
.ca-select {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ca-select > span {
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: var(--mid-text-muted);
}
.ca-side-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.ca-side-stats article {
  padding: 6px 8px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #dbe4f0;
  background: rgba(255, 255, 255, 0.86);
}
.ca-side-stats span {
  display: block;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  font-weight: 700;
}
.ca-side-stats strong {
  display: block;
  margin-top: 2px;
  font-size: var(--mid-fs-strong);
  color: var(--mid-text-strong);
}

/* 页面布局：左侧案例库 + 右侧分析主体 */
.ca-layout {
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
  gap: 0 8px;
  align-items: start;
  padding-left: 8px;
}
.ca-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ca-library {
  position: sticky;
  top: 6px;
  margin-top: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ca-library-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}
.ca-library-head strong {
  font-size: var(--mid-fs-strong);
  color: var(--mid-text-strong);
}
.ca-library-head span {
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
}
.ca-library-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border: 1px solid #dbe4f0;
  border-radius: var(--mid-radius-sm);
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
}
.ca-library-item:hover { border-color: #93c5fd; }
.ca-library-item.active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, .12);
}
.ca-library-item.research { background: #f8fafc; }
.ca-library-item.research.active { background: #fff7ed; border-color: #f59e0b; }
.ca-library-item b {
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-tight);
  color: var(--mid-text-strong);
}
.ca-library-item small {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  font-family: var(--mid-font-mono);
}
.ca-library-item small em {
  font-style: normal;
  font-family: var(--mid-font-sans);
  padding: 0 5px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
}
.ca-library-item.research small em { background: #f1f5f9; color: #64748b; }
.ca-library-item span {
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
}
.ca-library-note {
  margin: 4px 0 0;
  font-size: var(--mid-fs-micro);
  line-height: var(--mid-lh-body);
  color: var(--mid-text-muted);
}

/* 调研中案例 */
.ca-research-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.ca-research-list li {
  padding: 8px 10px;
  border-radius: 6px;
  background: #f8fafc;
  border-left: 3px solid #f59e0b;
}
.ca-research-list b {
  display: block;
  font-size: var(--mid-fs-label);
  color: var(--mid-text-strong);
}
.ca-research-list span {
  display: block;
  margin-top: 2px;
  font-size: var(--mid-fs-micro);
  line-height: var(--mid-lh-body);
  color: var(--mid-text-muted);
}

/* 面板布局 */
.ca-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 8px 8px 0 0;
}
.ca-panel {
  padding: 12px 14px;
  min-width: 0;
}
.ca-main > .ca-panel {
  margin: 8px 8px 0 0;
}
.ca-main > .analysis-hero {
  margin-left: 0;
}

/* 01 时间线 */
.ca-timeline {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-left: 2px solid #dbe4f0;
  margin-left: 4px;
}
.ca-timeline li {
  position: relative;
  padding-left: 14px;
}
.ca-timeline li::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2a78d6;
  box-shadow: 0 0 0 2px #fff;
}
.ca-timeline time {
  font-family: var(--mid-font-mono);
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
}
.ca-timeline p {
  margin: 1px 0 0;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  color: var(--mid-text-body);
}
.ca-facts {
  margin: 12px 0 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.ca-facts > div {
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
}
.ca-facts dt {
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: var(--mid-text-muted);
}
.ca-facts dd {
  margin: 2px 0 0;
  display: flex;
  flex-direction: column;
}
.ca-facts dd b {
  font-size: var(--mid-fs-label);
  color: var(--mid-text-strong);
}
.ca-facts dd span {
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
}
.ca-source-note {
  margin: 10px 0 0;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  line-height: var(--mid-lh-body);
}

/* 02 映射 */
.ca-mapping {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ca-mapping-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: var(--mid-fs-label);
  color: var(--mid-text-body);
  line-height: var(--mid-lh-body);
}
.ca-mapping-row.head {
  background: transparent;
  padding-top: 0;
  padding-bottom: 2px;
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: var(--mid-text-muted);
}
.ca-mapping-system {
  font-weight: 700;
  color: var(--mid-text-strong);
}
.ca-mapping-effect {
  font-family: var(--mid-font-mono);
  font-size: var(--mid-fs-micro);
  color: #1d4ed8;
  word-break: break-all;
}
.ca-hits {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e2e8f0;
}
.ca-hits-label {
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: var(--mid-text-muted);
}
.ca-hit-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #c7d7f5;
  background: #eff6ff;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-body);
}
.ca-hit-chip b {
  font-family: var(--mid-font-mono);
  color: #1d4ed8;
}
.ca-hit-empty {
  font-size: var(--mid-fs-micro);
  color: #b45309;
}

/* 03 指标与图表 */
.ca-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.ca-metric-card {
  padding: 10px 12px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #dbe4f0;
  background: #fff;
}
.ca-metric-card span,
.ca-metric-card small {
  display: block;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  font-weight: 700;
}
.ca-metric-card small { font-weight: 400; }
.ca-metric-card strong {
  display: block;
  margin: 4px 0 2px;
  font-size: var(--mid-fs-hero);
  line-height: 1.1;
  color: var(--mid-text-strong);
}
.ca-chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 10px;
  margin-top: 10px;
}
.ca-chart-card {
  margin: 0;
  padding: 10px 12px 6px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #dbe4f0;
  background: #fff;
  min-width: 0;
}
.ca-chart-card figcaption {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}
.ca-chart-card figcaption b {
  font-size: var(--mid-fs-label);
  color: var(--mid-text-strong);
}
.ca-chart-card figcaption span {
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  white-space: nowrap;
}
.ca-chart { width: 100%; }
.ca-chart-line { height: 250px; }
.ca-chart-bar { height: 250px; }
.ca-chart-bullwhip { height: 270px; }
.ca-table-details {
  margin-top: 8px;
}
.ca-table-details summary {
  cursor: pointer;
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: #1d4ed8;
  user-select: none;
}
.ca-table {
  width: 100%;
  margin-top: 6px;
  border-collapse: collapse;
  font-size: var(--mid-fs-label);
  font-variant-numeric: tabular-nums;
}
.ca-table th,
.ca-table td {
  padding: 5px 8px;
  text-align: right;
  border-bottom: 1px solid #edf1f5;
}
.ca-table th:first-child,
.ca-table td:first-child { text-align: left; }
.ca-table th {
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  font-weight: 700;
}
.ca-table tr.hit td { background: #eff6ff; }

/* 04 牛鞭效应实验 */
.bw-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}
.bw-rail {
  position: sticky;
  top: 8px;
  padding: 12px 12px 14px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #dbe4f0;
  background: #fff;
}
.bw-rail-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.bw-rail-title span,
.bw-kicker {
  font-size: var(--mid-fs-micro);
  color: #3268aa;
  letter-spacing: 0.08em;
  font-weight: 700;
}
.bw-rail-title b { font-size: 18px; color: #cbd5e1; }
.bw-rail label {
  display: block;
  margin: 12px 0 5px;
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: var(--mid-text-muted);
}
.bw-full { width: 100%; }
.bw-shock-options { display: flex; width: 100%; }
.bw-shock-options :deep(.el-radio-button) { flex: 1; }
.bw-shock-options :deep(.el-radio-button__inner) { width: 100%; padding: 6px 3px; font-size: 11px; }
.bw-formula {
  margin-top: 14px;
  padding: 10px;
  background: #f6f9fc;
  border-radius: 7px;
}
.bw-formula span,
.bw-formula small {
  display: block;
  color: var(--mid-text-muted);
  font-size: var(--mid-fs-micro);
}
.bw-formula b {
  display: block;
  margin: 5px 0;
  font-size: var(--mid-fs-label);
  color: #1e3a62;
}
.bw-window-signal {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 10px;
}
.bw-window-signal > div {
  padding: 8px 7px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  border-radius: 6px;
}
.bw-window-signal span,
.bw-window-signal b { display: block; }
.bw-window-signal span { font-size: 9px; color: var(--mid-text-muted); }
.bw-window-signal b { margin-top: 4px; font-size: var(--mid-fs-strong); color: #274c77; }
.bw-rail-note {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #e6edf4;
}
.bw-rail-note i { width: 5px; border-radius: 5px; background: #4f7cff; flex: 0 0 auto; }
.bw-rail-note b { font-size: var(--mid-fs-label); color: var(--mid-text-strong); }
.bw-rail-note p { margin: 4px 0 0; color: #7b8798; font-size: var(--mid-fs-micro); line-height: 1.5; }

.bw-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bw-lower {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 10px;
}
.bw-panel {
  min-width: 0;
  padding: 12px 14px;
  border-radius: var(--mid-radius-sm);
  border: 1px solid #dbe4f0;
  background: #fff;
}
.bw-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.bw-panel-head h4 {
  margin: 4px 0 0;
  font-size: var(--mid-fs-strong);
  color: var(--mid-text-strong);
}
.bw-unit-note { font-size: var(--mid-fs-micro); color: var(--mid-text-muted); white-space: nowrap; }

.bw-amp-table { margin-top: 12px; }
.bw-amp-row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid #edf1f5;
  font-size: var(--mid-fs-label);
  color: var(--mid-text-body);
}
.bw-amp-row.head {
  padding-top: 0;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  font-weight: 700;
}
.bw-amp-name { display: inline-flex; align-items: center; gap: 6px; }
.bw-amp-name i { width: 10px; height: 10px; border-radius: 3px; }
.bw-amp-cell { display: flex; flex-direction: column; gap: 4px; }
.bw-amp-cell b {
  font-size: var(--mid-fs-strong);
  color: var(--mid-text-strong);
  font-variant-numeric: tabular-nums;
}
.bw-amp-cell em,
.bw-measured-row em {
  display: block;
  height: 6px;
  border-radius: 4px;
  background: #edf2f7;
  overflow: hidden;
}
.bw-amp-cell em i,
.bw-measured-row em i { display: block; height: 100%; border-radius: 4px; }

.bw-measured {
  margin-top: 12px;
  padding: 10px;
  border-radius: 7px;
  background: #f8fafc;
}
.bw-measured-row {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr) 52px;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-body);
}
.bw-measured-row b {
  text-align: right;
  font-size: var(--mid-fs-label);
  color: var(--mid-text-strong);
  font-variant-numeric: tabular-nums;
}
.bw-measured p {
  margin: 8px 0 0;
  font-size: var(--mid-fs-micro);
  line-height: var(--mid-lh-body);
  color: var(--mid-text-body);
}

.bw-compare { margin-top: 12px; }
.bw-compare-row {
  display: grid;
  grid-template-columns: 1.35fr 1fr 1fr 0.8fr;
  gap: 10px;
  align-items: center;
  padding: 8px 4px;
  border-bottom: 1px solid #edf1f5;
  font-size: var(--mid-fs-label);
  color: var(--mid-text-body);
  font-variant-numeric: tabular-nums;
}
.bw-compare-row.head {
  padding-top: 0;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  font-weight: 700;
}
.bw-compare-row span:first-child { display: flex; flex-direction: column; gap: 2px; }
.bw-compare-row span:first-child b { color: var(--mid-text-strong); }
.bw-compare-row span:first-child small { font-size: var(--mid-fs-micro); color: var(--mid-text-muted); }
.bw-system-value { color: #2563eb; font-weight: 700; }
.bw-compare-row > strong { font-size: var(--mid-fs-label); color: var(--mid-text-muted); }
.bw-compare-row > strong.good { color: #2d7b58; }
.bw-compare-row > strong.bad { color: #b45309; }
.bw-conclusion {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 12px;
  padding: 10px 12px;
  border-left: 3px solid #4f7cff;
  background: #f3f7ff;
  border-radius: 0 6px 6px 0;
}
.bw-conclusion span { color: #3268aa; font-size: var(--mid-fs-micro); font-weight: 700; white-space: nowrap; }
.bw-conclusion b { font-size: var(--mid-fs-label); line-height: 1.55; color: #36516e; }
.bw-compare-note {
  margin: 8px 0 0;
  font-size: var(--mid-fs-micro);
  line-height: var(--mid-lh-body);
  color: var(--mid-text-muted);
}

.ca-chain {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: 12px;
  padding: 8px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-body);
}
.ca-chain i {
  color: #a8b5c4;
  font-style: normal;
}
.ca-chain-node {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #dbe6f2;
  background: #fff;
  white-space: nowrap;
}

/* 05 验证 */
.ca-validation-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 12px;
  align-items: start;
}
.ca-check-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ca-check-list li {
  display: flex;
  gap: 8px;
  padding: 7px 9px;
  border-radius: 6px;
  background: #f8fafc;
  border-left: 3px solid #cbd5e1;
}
.ca-check-list li.pass { border-left-color: #0ca30c; }
.ca-check-list li.fail { border-left-color: #ec835a; }
.ca-check-icon {
  flex: 0 0 auto;
  font-size: 15px;
  color: #898781;
  margin-top: 1px;
}
.ca-check-list li.pass .ca-check-icon { color: #0ca30c; }
.ca-check-list li.fail .ca-check-icon { color: #ec835a; }
.ca-check-list b {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--mid-fs-label);
  color: var(--mid-text-strong);
}
.ca-check-list b em {
  font-style: normal;
  font-size: var(--mid-fs-micro);
  padding: 0 6px;
  border-radius: 999px;
  background: #e2e8f0;
  color: var(--mid-text-body);
}
.ca-check-list li.pass b em { background: #dcfce7; color: #166534; }
.ca-check-list li.fail b em { background: #ffedd5; color: #9a3412; }
.ca-check-list span:not(.ca-check-icon) {
  display: block;
  margin-top: 2px;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  line-height: var(--mid-lh-body);
}
.ca-compare {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ca-compare-row {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(4, minmax(0, 1fr));
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: var(--mid-fs-label);
  color: var(--mid-text-body);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.ca-compare-row span:not(:first-child) { text-align: right; }
.ca-compare-row.head {
  cursor: default;
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: var(--mid-text-muted);
}
.ca-compare-row:not(.head):hover { background: #f1f5f9; }
.ca-compare-row.active {
  background: #eff6ff;
  color: var(--mid-text-strong);
  font-weight: 600;
}
.ca-compare-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ca-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 10px 8px 0 0;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
}
.ca-foot em {
  font-style: normal;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .ca-layout { grid-template-columns: 1fr; }
  .ca-library { position: static; margin-right: 8px; }
  .ca-grid-2,
  .ca-chart-grid,
  .bw-lower,
  .ca-research-list,
  .ca-validation-grid { grid-template-columns: 1fr; }
  .bw-layout { grid-template-columns: 1fr; }
  .bw-rail { position: static; }
  .ca-metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ca-mapping-row { grid-template-columns: 96px minmax(0, 1fr); }
  .ca-mapping-effect { grid-column: 2; }
}
</style>
