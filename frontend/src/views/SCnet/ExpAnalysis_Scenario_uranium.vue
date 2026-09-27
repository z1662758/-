<template>
  <div class="scenario-page mid-stage-bg scenario-console analysis-workspace">
    <AnalysisLinkTabs active="scenario" />

    <el-empty
      v-if="!scenarioVm"
      class="scenario-empty"
      description="请先在实验运行页面选择一个铀供应链实验"
      :image-size="120"
    />

    <template v-else>
      <AnalysisPageHero
        eyebrow="情景分析"
        :title="scenarioVm.hero.title"
        :headline="scenarioVm.hero.headline"
        :summary="scenarioVm.hero.summary"
        :tags="scenarioVm.hero.tags"
      >
      </AnalysisPageHero>

      <section class="scenario-conclusion-strip glass-panel">
        <article v-for="item in scenarioConclusionCards" :key="item.label" :class="item.tone">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.detail }}</p>
        </article>
      </section>

      <div class="scenario-workbench">
        <div class="scenario-stage-grid">
          <aside class="window-column glass-panel">
            <div class="column-head">
              <div class="analysis-column-head">
                <span class="analysis-column-index">01</span>
                <div>
                  <h3>年度列表</h3>
                  <p>选择年份，查看事件、风险与调运关系。</p>
                </div>
              </div>
              <div>
                <el-tag size="small" type="info" effect="light">{{ scenarioVm.yearWindows.length }} 个窗口</el-tag>
              </div>
            </div>

            <div class="window-list">
              <article
                v-for="(item, index) in scenarioVm.yearWindows"
                :key="item.id"
                class="window-card"
                role="button"
                :aria-pressed="activeWindowIndex === index"
                :class="[item.tone, { active: activeWindowIndex === index }]"
                tabindex="0"
                @click="selectWindow(index)"
                @keydown.enter.prevent="selectWindow(index)"
                @keydown.space.prevent="selectWindow(index)"
              >
                <div class="window-card-top">
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.headline }}</p>
                  </div>
                  <div class="window-stage">
                    <span class="window-order">{{ item.positionText }}</span>
                    <el-tag size="small" :type="toTagType(item.tone)" effect="light">
                      {{ item.stageLabel }}
                    </el-tag>
                  </div>
                </div>

              </article>
            </div>
          </aside>

          <main v-if="activeWindow" class="detail-column glass-panel">
            <div class="detail-head">
              <div class="analysis-column-head">
                <span class="analysis-column-index">02</span>
                <div>
                  <h3>{{ activeWindow.title }}</h3>
                  <p>{{ activeWindow.summary }}</p>
                </div>
              </div>
              <el-tag :type="toTagType(activeWindow.tone)" effect="dark">{{ activeWindow.stageLabel }}</el-tag>
            </div>

            <div class="detail-tab-row">
              <button
                v-for="item in scenarioTabs"
                :key="item.key"
                type="button"
                class="detail-tab"
                :class="{ active: scenarioTab === item.key }"
                :aria-pressed="scenarioTab === item.key"
                @click="scenarioTab = item.key"
              >
                {{ item.label }}
              </button>
            </div>

            <template v-if="scenarioTab === 'overview'">
              <div class="main-summary-grid">
                <article
                  v-for="item in activeWindow.metricCards"
                  :key="item.label"
                  class="main-summary-card"
                >
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <small>{{ item.hint }}</small>
                </article>
              </div>

              <section class="main-section">
                <div class="section-title">关键扰动</div>
                <div class="event-chip-row">
                  <el-tag
                    v-for="item in activeWindow.events"
                    :key="item"
                    size="small"
                    type="danger"
                    effect="plain"
                  >
                    {{ item }}
                  </el-tag>
                  <span v-if="!activeWindow.events.length" class="section-empty-text">该年度未出现显著外部冲击</span>
                </div>
              </section>

              <section class="main-section">
                <div class="section-title">扰动过程</div>
                <div class="evidence-grid">
                  <article
                    v-for="item in activeWindow.steps"
                    :key="`${activeWindow.id}-${item.label}`"
                    class="evidence-card"
                  >
                    <div class="evidence-card-top">
                      <span>{{ item.label }}</span>
                      <strong>{{ item.title }}</strong>
                    </div>
                    <p>{{ item.text }}</p>
                  </article>
                  <el-empty
                    v-if="!activeWindow.steps.length"
                    description="当前窗口暂无扰动过程"
                    :image-size="70"
                  />
                </div>
              </section>

              <section class="main-section">
                <div class="section-title">结构信号</div>
                <div class="factor-card-grid">
                  <article
                    v-for="item in activeWindow.factorRows"
                    :key="item.label"
                    class="factor-card"
                  >
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </article>
                  <el-empty
                    v-if="!activeWindow.factorRows.length"
                    description="当前窗口暂无结构信号"
                    :image-size="70"
                  />
                </div>
              </section>
            </template>

            <template v-else-if="scenarioTab === 'routes'">
              <section class="main-section">
                <div class="section-title">重点航线</div>
                <div class="route-list">
                  <article
                    v-for="row in activeWindow.routeRows"
                    :key="`${row.supplier_name}-${row.manufacturer_name}`"
                    class="route-item"
                  >
                    <div class="route-item-top">
                      <strong>{{ row.supplier_name }} → {{ row.manufacturer_name }}</strong>
                      <span>{{ formatUraniumMetricValue('total_procured_tU', row.quantity_tU) }}</span>
                    </div>
                    <div class="route-track">
                      <div class="route-fill" :style="{ width: `${row.sharePct}%` }"></div>
                    </div>
                    <div class="route-item-meta">
                      <span>占年度采购 {{ row.shareText }}</span>
                      <span>{{ row.channelLabel }}</span>
                    </div>
                  </article>
                  <el-empty
                    v-if="!activeWindow.routeRows.length"
                    description="当前窗口暂无重点航线数据"
                    :image-size="70"
                  />
                </div>
              </section>

              <section class="main-section">
                <div class="section-title">关键节点</div>
                <div class="node-grid">
                  <article
                    v-for="item in activeWindow.nodeRows"
                    :key="item.id"
                    class="node-card"
                  >
                    <div class="node-card-head">
                      <strong>{{ item.name }}</strong>
                      <span>{{ item.location }}</span>
                    </div>
                    <div class="node-card-metrics">
                      <div>
                        <span>采购量</span>
                        <strong>{{ item.procuredText }}</strong>
                      </div>
                      <div>
                        <span>库存覆盖</span>
                        <strong>{{ item.inventoryText }}</strong>
                      </div>
                      <div>
                        <span>缺口</span>
                        <strong>{{ item.unmetText }}</strong>
                      </div>
                    </div>
                  </article>
                  <el-empty
                    v-if="!activeWindow.nodeRows.length"
                    description="当前窗口暂无关键节点数据"
                    :image-size="70"
                  />
                </div>
              </section>
            </template>

            <template v-else>
              <section class="main-section compare-section">
                <div class="section-title">全年窗口对比</div>
                <el-table
                  :data="scenarioVm.yearComparisonRows"
                  stripe
                  size="small"
                  class="year-compare-table"
                  empty-text="暂无年度窗口数据"
                >
                  <el-table-column prop="year" label="年份" width="84" />
                  <el-table-column prop="stageLabel" label="阶段" width="108" />
                  <el-table-column prop="headline" label="关键扰动" min-width="180" show-overflow-tooltip />
                  <el-table-column prop="riskText" label="风险" width="94" />
                  <el-table-column prop="inventoryText" label="库存" width="96" />
                  <el-table-column prop="unmetText" label="缺口" width="110" />
                  <el-table-column prop="routeText" label="主通道" min-width="220" show-overflow-tooltip />
                </el-table>
              </section>
            </template>
          </main>

          <aside v-if="activeWindow" class="insight-column glass-panel">
            <div class="column-head compact">
              <div class="analysis-column-head">
                <span class="analysis-column-index">03</span>
                <div>
                  <h3>{{ activeWindow.title }} · 执行提示</h3>
                  <p>依据所选年度的风险、库存与运输情况提出建议。</p>
                </div>
              </div>
            </div>
            <div class="insight-subsection">
              <div class="rail-card-list">
                <article
                  v-for="item in activeWindow.actionRows"
                  :key="item"
                  class="rail-card action"
                >
                  {{ item }}
                </article>
                <article
                  v-for="item in activeWindow.alertRows"
                  :key="`alert-${item}`"
                  class="rail-card warning"
                >
                  {{ item }}
                </article>
                <el-empty
                  v-if="!activeWindow.actionRows.length && !activeWindow.alertRows.length"
                  description="当前窗口暂无执行提示"
                  :image-size="60"
                />
              </div>
            </div>
          </aside>
        </div>

      </div>
      <!-- 情景分布与方案筛选 (现代化高管驾驶舱面板) -->
      <section class="scenario-supplement glass-panel">
        <div class="supplement-header">
          <div class="supplement-title-group">
            <span class="analysis-column-index">04</span>
            <div>
              <h3>情景分布与方案筛选</h3>
              <p>按年度风险等级统计占比，用于了解本次实验的压力分布，并结合 Monte-Carlo 压力传导进行应急处置方案初筛。</p>
            </div>
          </div>
          <div class="supplement-actions">
            <el-tag type="primary" effect="plain" round>{{ scenarioPlanCards.length }} 类情景全景覆盖</el-tag>
            <el-tag type="success" effect="plain" round>优选 {{ preferredPlanRows.length }} / 剔除 {{ rejectedPlanRows.length }}</el-tag>
          </div>
        </div>

        <!-- 连续风险情景频谱分布条 -->
        <div class="distribution-spectrum-wrapper">
          <div class="spectrum-bar-header">
            <span class="spectrum-caption">全周期压力与情景分布频谱 (按年度权重聚合)</span>
            <div class="spectrum-legend">
              <span v-for="item in scenarioPlanCards" :key="item.label" class="legend-dot-item">
                <i :style="{ background: item.color }"></i> {{ item.label }} ({{ item.probability }}%)
              </span>
            </div>
          </div>
          <div class="distribution-spectrum-bar">
            <div
              v-for="item in scenarioPlanCards"
              :key="item.label"
              class="spectrum-segment"
              :style="{ width: `${item.probability > 0 ? item.probability : 2}%`, background: item.color }"
              :class="{ 'zero-pct': item.probability === 0 }"
              :title="`${item.label}: ${item.probability}%`"
            >
              <span v-if="item.probability > 12" class="spectrum-label">{{ item.label }} {{ item.probability }}%</span>
            </div>
          </div>
        </div>

        <!-- 三类情景卡片网格 -->
        <div class="scenario-plan-grid">
          <article
            v-for="item in scenarioPlanCards"
            :key="item.label"
            class="scenario-card"
            :class="[item.tone, { 'is-dominant': item.probability >= 50 }]"
          >
            <div class="sc-card-top">
              <div class="sc-card-badge">
                <span class="sc-dot" :style="{ background: item.color }"></span>
                <span class="sc-title">{{ item.label }}</span>
              </div>
              <div class="sc-prob-wrap">
                <strong class="sc-prob">{{ item.probability }}%</strong>
                <span class="sc-prob-tag" :class="item.tone">
                  {{ item.probability >= 50 ? '全域焦点' : item.probability > 0 ? '局部承压' : '常态参照' }}
                </span>
              </div>
            </div>
            <div class="sc-progress-wrap">
              <el-progress
                :percentage="item.probability"
                :show-text="false"
                :stroke-width="7"
                :color="item.color"
              />
            </div>
            <p class="sc-desc">{{ item.description }}</p>
            <div class="sc-basis-chip">
              <span class="basis-label">判定依据</span>
              <span class="basis-text">{{ item.basis }}</span>
            </div>
          </article>
        </div>

        <!-- 方案筛选依据与处置方向模块 -->
        <div class="scenario-filter-box">
          <div class="filter-box-head">
            <div class="filter-box-title">
              <span class="filter-index-dot">A</span>
              <div>
                <strong>方案筛选依据与处置方向</strong>
                <small>结合年度风险分布，区分日常参照与应急处置方向，形成对策树候选动作输入</small>
              </div>
            </div>
            <div class="filter-tags">
              <span class="mc-sample-pill">Monte-Carlo 抽样 1,000次</span>
              <span class="ci-pill">置信度 95%</span>
            </div>
          </div>

          <el-table
            :data="scenarioScreeningRows"
            size="default"
            class="scenario-screening-table-modern"
            empty-text="暂无方案筛选结果"
          >
            <el-table-column prop="rankText" label="序" width="70" align="center">
              <template #default="{ row }">
                <span class="rank-badge">{{ row.rankText }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="方案" width="130">
              <template #default="{ row }">
                <strong class="scheme-name">{{ row.name }}</strong>
              </template>
            </el-table-column>
            <el-table-column prop="purpose" label="作用" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="scheme-purpose">{{ row.purpose }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="monteCarlo" label="年度占比" width="110" align="center">
              <template #default="{ row }">
                <span class="percentage-pill" :class="row.statusType">{{ row.monteCarlo }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="bayes" label="处置方向" width="140" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="row.statusType === 'danger' ? 'danger' : row.statusType === 'warning' ? 'warning' : 'primary'" effect="plain">
                  {{ row.bayes }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="结果" width="100" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="row.statusType" effect="dark" class="result-tag">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AnalysisLinkTabs from './components/shared/AnalysisLinkTabs.vue'
import AnalysisPageHero from './components/shared/AnalysisPageHero.vue'
import './components/shared/midStage.css'
import { useUraniumAnalysisExperiment } from './composables/useUraniumAnalysisExperiment'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { formatUraniumMetricValue } from '@/utils/uraniumDuringAdapter'
import { buildUraniumScenarioViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'

useUraniumAnalysisExperiment()
const store = useUraniumDemoStore()
const snapshotStore = useAnalysisSnapshotStore()
const { history, selectedExperiment } = storeToRefs(store)

const activeWindowIndex = ref(0)
const scenarioTab = ref('overview')
const scenarioTabs = [
  { key: 'overview', label: '年度概况' },
  { key: 'routes', label: '航线与节点' },
  { key: 'compare', label: '年度对比' }
]

function toTagType(tone = '') {
  if (tone === 'danger') return 'danger'
  if (tone === 'warning') return 'warning'
  if (tone === 'success') return 'success'
  return 'info'
}
const activeSnapshot = computed(() => snapshotStore.getActiveSnapshot())
const scenarioVm = computed(() => buildUraniumScenarioViewModel({
  experiment: selectedExperiment.value,
  history: history.value,
  snapshot: activeSnapshot.value
}))
const scenarioPlanCards = computed(() => {
  const windows = scenarioVm.value?.yearWindows || []
  const severeCount = windows.filter(item => ['danger', 'critical'].includes(item.tone)).length
  const warningCount = windows.filter(item => item.tone === 'warning').length
  const total = Math.max(1, windows.length)
  const extreme = Math.round((severeCount / total) * 100)
  const disruption = Math.round((warningCount / total) * 100)
  const baseline = 100 - extreme - disruption
  return [
    { label: '基准情景', probability: baseline, tone: 'baseline', color: '#2563eb', description: '供应与运输按计划运行。', basis: '历史窗口 / 库存基线' },
    { label: '扰动情景', probability: disruption, tone: 'warning', color: '#f59e0b', description: '单一供应国或主通道局部中断。', basis: '风险事件 / 节点暴露 / 延迟' },
    { label: '极端情景', probability: extreme, tone: 'danger', color: '#ef4444', description: '多节点叠加失效，库存和替代航线同步承压。', basis: '高风险窗口 / 缺口放大' }
  ]
})
const scenarioConclusionCards = computed(() => {
  const windows = scenarioVm.value?.yearWindows || []
  const active = activeWindow.value
  const dangerCount = windows.filter(item => ['danger', 'critical'].includes(item.tone)).length
  const warningCount = windows.filter(item => item.tone === 'warning').length
  return [
    {
      label: '当前年度',
      value: active?.title || '等待窗口',
      detail: active?.headline || '选择年度窗口后查看关键扰动。',
      tone: active?.tone || 'info'
    },
    {
      label: '高压年度',
      value: `${dangerCount}`,
      detail: `${warningCount} 个年度处于预警状态。`,
      tone: dangerCount ? 'danger' : warningCount ? 'warning' : 'success'
    },
    {
      label: '主通道',
      value: active?.routeRows?.[0]?.channelLabel || '暂无通道',
      detail: active?.routeRows?.[0]
        ? `${active.routeRows[0].supplier_name} → ${active.routeRows[0].manufacturer_name}`
        : '点击航线与节点页签查看。',
      tone: 'primary'
    }
  ]
})
const activeWindow = computed(() => scenarioVm.value?.yearWindows?.[activeWindowIndex.value] || null)
const scenarioScreeningRows = computed(() => {
  const cards = scenarioPlanCards.value
  const active = activeWindow.value
  const riskText = active?.riskText || '当前风险'
  const routeText = active?.routeRows?.[0]?.channelLabel || '主通道'
  return cards
    .map((item, index) => {
      const keep = item.tone === 'danger' || item.tone === 'warning' || index === 0
      const observeOnly = item.tone === 'baseline' && cards.some(row => row.tone === 'danger')
      return {
        rankText: `#${index + 1}`,
        name: item.label,
        purpose: item.tone === 'baseline'
          ? '保留原采购节奏，作为未干预参照。'
          : item.tone === 'warning'
            ? `${routeText}绕行、补库、合同补位。`
            : `${riskText}年份启用组合应急。`,
        monteCarlo: `${item.probability}%`,
        bayes: item.tone === 'danger' ? '组合应急' : item.tone === 'warning' ? '通道补位' : '常态监测',
        status: observeOnly ? '参照' : keep ? '优选' : '剔除',
        statusType: observeOnly ? 'info' : keep ? 'success' : 'danger'
      }
    })
    .sort((left, right) => {
      const order = { '优选': 0, '参照': 1, '剔除': 2 }
      return order[left.status] - order[right.status]
    })
    .map((item, index) => ({ ...item, rankText: `#${index + 1}` }))
})
const preferredPlanRows = computed(() => scenarioScreeningRows.value.filter(row => row.status === '优选'))
const rejectedPlanRows = computed(() => scenarioScreeningRows.value.filter(row => row.status === '剔除'))

function selectWindow(index) {
  activeWindowIndex.value = index
  if (scenarioTab.value === 'compare') scenarioTab.value = 'overview'
}

watch(() => scenarioVm.value?.yearWindows || [], (rows) => {
  if (!rows.length) {
    activeWindowIndex.value = 0
    return
  }
  activeWindowIndex.value = Math.min(activeWindowIndex.value, rows.length - 1)
  if (activeWindowIndex.value === 0 && scenarioVm.value) {
    activeWindowIndex.value = Math.min(scenarioVm.value.defaultActiveWindowIndex, rows.length - 1)
  }
}, { immediate: true })

watch(activeWindowIndex, () => {
  if (scenarioTab.value === 'compare') return
  scenarioTab.value = 'overview'
})
</script>

<style scoped>
.scenario-supplement {
  margin: 0 8px 20px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid #dbe6f3;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(246, 250, 255, 0.88) 100%);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.05);
}

.supplement-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #eef3f9;
}

.supplement-title-group {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.supplement-title-group h3 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.supplement-title-group p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.supplement-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 风险情景频谱分布条 */
.distribution-spectrum-wrapper {
  margin-top: 14px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.spectrum-bar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}

.spectrum-caption {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.02em;
}

.spectrum-legend {
  display: flex;
  align-items: center;
  gap: 12px;
}

.legend-dot-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.legend-dot-item i {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.distribution-spectrum-bar {
  display: flex;
  height: 20px;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
}

.spectrum-segment {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  transition: width 0.3s ease;
  position: relative;
}

.spectrum-segment.zero-pct {
  opacity: 0.25;
}

.spectrum-label {
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* 情景卡片网格 */
.scenario-plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.scenario-card {
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.scenario-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
}

.scenario-card.is-dominant {
  border-color: #fca5a5;
  background: linear-gradient(180deg, #fff5f5 0%, #ffffff 100%);
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.08);
}

.scenario-card.warning {
  border-color: #fde68a;
  background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);
}

.sc-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.sc-card-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sc-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sc-title {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.sc-prob-wrap {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.sc-prob {
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
  font-family: var(--mid-font-mono, monospace);
}

.sc-prob-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  background: #f1f5f9;
  color: #64748b;
}

.sc-prob-tag.danger {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.sc-prob-tag.warning {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.sc-progress-wrap {
  margin-bottom: 10px;
}

.sc-desc {
  margin: 0 0 10px;
  color: #334155;
  font-size: 12px;
  line-height: 1.55;
  flex: 1;
}

.sc-basis-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  font-size: 11px;
}

.basis-label {
  color: #94a3b8;
  font-weight: 700;
  flex-shrink: 0;
}

.basis-text {
  color: #475569;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 方案筛选依据卡片 */
.scenario-filter-box {
  margin-top: 16px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.filter-box-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.filter-box-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-index-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid #bfdbfe;
}

.filter-box-title strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.filter-box-title small {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 11px;
}

.filter-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mc-sample-pill,
.ci-pill {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.mc-sample-pill {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #dbeafe;
}

.ci-pill {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #dcfce7;
}

.scenario-screening-table-modern {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #eef2f6;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--mid-font-mono, monospace);
}

.scheme-name {
  color: #0f172a;
  font-size: 12px;
}

.scheme-purpose {
  color: #334155;
  font-size: 12px;
  line-height: 1.5;
}

.percentage-pill {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--mid-font-mono, monospace);
  background: #f8fafc;
  color: #475569;
}

.percentage-pill.danger {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fee2e2;
}

.percentage-pill.warning {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fef3c7;
}

.result-tag {
  font-weight: 700;
  letter-spacing: 0.05em;
}

.scenario-conclusion-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin: 0 8px 10px;
  padding: 10px;
}
.scenario-conclusion-strip article {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #dbe4ef;
  border-radius: 9px;
  background: #fff;
}
.scenario-conclusion-strip span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 700;
}
.scenario-conclusion-strip strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: var(--mid-fs-title);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scenario-conclusion-strip p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: var(--mid-fs-label);
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scenario-conclusion-strip article.danger { border-color: #fecaca; background: #fef2f2; }
.scenario-conclusion-strip article.warning { border-color: #fde68a; background: #fffbeb; }
.scenario-conclusion-strip article.success { border-color: #bbf7d0; background: #f0fdf4; }
.scenario-conclusion-strip article.primary { border-color: #bfdbfe; background: #eff6ff; }

.scenario-console {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
  padding: 8px 0 32px;
  font-family: var(--mid-font-sans);
}
.scenario-console.analysis-workspace { overflow: visible; }

.scenario-summary-grid,
.scenario-workbench {
  margin: 0 8px;
}

.command-focus-card {
  flex: 1;
  min-width: 0;
  padding: 9px 11px;
  border-radius: var(--mid-radius-md);
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.command-focus-card span,
.main-summary-card span,
.scenario-brief-card span {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.command-focus-card strong,
.main-summary-card strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
  line-height: var(--mid-lh-tight);
}

.command-focus-card p,
.scenario-brief-card p {
  margin: 5px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.main-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.main-summary-card {
  padding: 14px 16px;
  border-radius: var(--mid-radius-md);
  border: 1px solid #dbe4f0;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.main-summary-card small {
  display: block;
  margin-top: 4px;
  color: #94a3b8;
  font-size: var(--mid-fs-label);
  line-height: 1.55;
}

.scenario-brief-card {
  padding: 10px 12px;
  border-radius: var(--mid-radius-md);
}

.scenario-brief-card.success {
  border-color: #bbf7d0;
  background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
}

.scenario-brief-card.warning {
  border-color: #fed7aa;
  background: linear-gradient(180deg, #fff7ed 0%, #ffffff 100%);
}

.scenario-brief-card.danger {
  border-color: #fecaca;
  background: linear-gradient(180deg, #fff1f2 0%, #ffffff 100%);
}

.scenario-workbench {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scenario-stage-grid {
  display: grid;
  grid-template-columns: minmax(240px, 0.65fr) minmax(0, 1.8fr);
  gap: 12px;
  align-items: stretch;
}

.insight-column { grid-column: 1 / -1; }

.scenario-stage-grid > * {
  min-width: 0;
  height: 100%;
}

.window-column,
.detail-column,
.insight-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
}

.insight-column {
  gap: 14px;
  height: auto;
  position: sticky;
  top: 8px;
  align-self: start;
  max-height: calc(100vh - 136px);
  overflow: auto;
}

.column-head,
.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.column-head .analysis-column-head,
.detail-head .analysis-column-head {
  margin-bottom: 0;
  min-width: 0;
}

.column-head.compact {
  margin-bottom: 8px;
}

.section-title {
  font-size: var(--mid-fs-strong);
  font-weight: 700;
  color: #0f172a;
}

.window-list,
.route-list,
.rail-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.window-card,
.route-item,
.rail-card {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  min-width: 0;
}

.window-card,
.route-item {
  border-radius: 10px;
}


.window-card {
  padding: 14px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.window-card:hover {
  transform: translateY(-1px);
  box-shadow: none;
}

.window-card:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.window-card.active {
  border-color: #2563eb;
  background: #f8fbff;
  box-shadow: none;
}

.window-card.success {
  border-left: 4px solid #16a34a;
}

.window-card.warning {
  border-left: 4px solid #d97706;
}

.window-card.danger {
  border-left: 4px solid #dc2626;
}

.window-card-top,
.route-item-top,
.route-item-meta,
.node-card-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.window-card-top > div:first-child,
.route-item-top strong,
.node-card-head strong {
  min-width: 0;
}

.window-stage {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.window-order {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #64748b;
}

.window-card-top strong,
.route-item-top strong,
.node-card-head strong {
  font-size: var(--mid-fs-strong);
  color: #0f172a;
  overflow-wrap: anywhere;
}

.window-card-top p,
.route-item-top span,
.route-item-meta span,
.node-card-head span {
  margin: 4px 0 0;
  font-size: 11px;
  color: #64748b;
}

.window-kpi-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 12px 0 10px;
}

.window-kpi {
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid #e2e8f0;
}

.window-kpi span,
.node-card-metrics span {
  display: block;
  color: #94a3b8;
  font-size: 11px;
}

.window-kpi strong,
.node-card-metrics strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 13px;
}

.window-desc {
  margin: 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

.detail-column {
  gap: 0;
}

.detail-tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-tab {
  border: 0;
  border-radius: 999px;
  padding: 6px 11px;
  background: #e2e8f0;
  color: #475569;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.detail-tab:hover {
  transform: translateY(-1px);
}

.detail-tab.active {
  background: #1d4ed8;
  color: #ffffff;
}


.main-section + .main-section {
  margin-top: 18px;
}

.event-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-empty-text {
  color: #94a3b8;
  font-size: 12px;
}

.evidence-card strong {
  display: block;
  color: #0f172a;
  font-size: var(--mid-fs-strong);
  font-weight: 800;
}

.evidence-card p {
  margin: 8px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
}

.evidence-grid,
.factor-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.evidence-card,
.factor-card {
  padding: 14px 16px;
  border-radius: var(--mid-radius-md);
  border: 1px solid #dbe4f0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.evidence-card-top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.evidence-card span,
.factor-card span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-width: 34px;
  height: 34px;
  border-radius: 12px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.factor-card span {
  justify-content: flex-start;
  width: auto;
  min-width: 0;
  height: auto;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: #64748b;
}

.factor-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 16px;
  line-height: 1.4;
}

.route-item,
.node-card {
  padding: 14px;
}

.route-track {
  margin: 10px 0 8px;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #e2e8f0;
}

.route-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%);
}

.node-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.node-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  min-width: 0;
}

.node-card-metrics {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.compare-section {
  min-height: 100%;
}

.year-compare-table {
  width: 100%;
}

.scenario-brief-grid.in-column {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.bridge-card {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid #dbeafe;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 34%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.bridge-card span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.bridge-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 16px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.bridge-card p {
  margin: 8px 0 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.72;
  overflow-wrap: anywhere;
}

.bridge-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.insight-subsection {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #dbe4f0;
}

.insight-subtitle {
  font-size: var(--mid-fs-strong);
  font-weight: 700;
  color: #0f172a;
}

.rail-summary {
  margin: 10px 0 12px;
  color: #64748b;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
}

.rail-card {
  padding: 12px 14px;
  border-radius: var(--mid-radius-md);
  line-height: var(--mid-lh-body);
  font-size: var(--mid-fs-label);
}

.rail-card.action {
  color: #1e3a8a;
  background: #f8fbff;
  border-color: #dbeafe;
}

.rail-card.warning {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.scenario-empty {
  margin: auto;
}


@media (max-width: 1360px) {
  .scenario-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .scenario-stage-grid {
    grid-template-columns: minmax(240px, 0.82fr) minmax(0, 1.2fr);
  }

  .insight-column {
    grid-column: 1 / -1;
    position: static;
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 1080px) {
  .scenario-plan-grid,
  .scenario-conclusion-strip { grid-template-columns: 1fr; }
  .scenario-stage-grid {
    grid-template-columns: 1fr;
  }

  .node-grid,
  .evidence-grid,
  .factor-card-grid,
  .main-summary-grid,
  .scenario-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .scenario-summary-grid,
  .main-summary-grid,
  .node-grid,
  .evidence-grid,
  .factor-card-grid,
  .window-kpi-row,
  .bridge-actions {
    grid-template-columns: 1fr;
  }
}
</style>
