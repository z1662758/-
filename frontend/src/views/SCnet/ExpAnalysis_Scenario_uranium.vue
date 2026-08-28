<template>
  <div class="scenario-page mid-stage-bg scenario-console analysis-workspace">
    <AnalysisLinkTabs active="scenario">
      <template #right>
        <el-button plain size="small" @click="navigateTo(SCNET_ROUTES.interface)">
          <el-icon><Place /></el-icon>
          <span>推演界面</span>
        </el-button>
        <el-button type="success" plain size="small" @click="navigateTo(SCNET_ROUTES.EXreport)">
          <el-icon><Document /></el-icon>
          <span>实验结果页</span>
        </el-button>
      </template>
    </AnalysisLinkTabs>

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
        <template #side>
          <article class="command-focus-card">
            <span>{{ scenarioVm.hero.spotlight.label }}</span>
            <strong>{{ scenarioVm.hero.spotlight.title }}</strong>
            <p>{{ scenarioVm.hero.spotlight.text }}</p>
          </article>
        </template>
      </AnalysisPageHero>


      <div class="scenario-workbench">
        <div class="scenario-stage-grid">
          <aside class="window-column glass-panel">
            <div class="column-head">
              <div class="analysis-column-head">
                <span class="analysis-column-index">01</span>
                <div>
                  <h3>年度窗口列表</h3>
                  <p>先选窗口，再读证据，再送入下游模型。</p>
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

                <div class="window-kpi-row">
                  <div class="window-kpi">
                    <span>风险</span>
                    <strong>{{ item.riskText }}</strong>
                  </div>
                  <div class="window-kpi">
                    <span>库存</span>
                    <strong>{{ item.inventoryText }}</strong>
                  </div>
                  <div class="window-kpi">
                    <span>缺口</span>
                    <strong>{{ item.unmetText }}</strong>
                  </div>
                </div>

                <p class="window-desc">{{ item.summary }}</p>
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
                @click="scenarioTab = item.key"
              >
                {{ item.label }}
              </button>
            </div>

            <template v-if="scenarioTab === 'overview'">
              <section class="window-verdict-card">
                <div class="window-verdict-main">
                  <span>窗口结论</span>
                  <strong>{{ activeWindow.stageLabel }}</strong>
                  <p>{{ activeWindow.stageDetail }}</p>
                </div>
                <div class="window-verdict-meta">
                  <div>
                    <small>主通道</small>
                    <strong>
                      {{ activeWindow.routeRows[0]
                        ? `${activeWindow.routeRows[0].supplier_name} → ${activeWindow.routeRows[0].manufacturer_name}`
                        : '暂无主通道' }}
                    </strong>
                  </div>
                  <div>
                    <small>下一步</small>
                    <strong>{{ activeWindow.nextStep }}</strong>
                  </div>
                </div>
              </section>

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
                <div class="section-title">窗口证据链</div>
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
                    description="当前窗口暂无证据链"
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
                  <h3>窗口结论</h3>
                  <p>把年度指标收敛成状态判断、主通道和下一步模型输入。</p>
                </div>
              </div>
            </div>
            <div class="scenario-brief-grid in-column">
              <article
                v-for="item in scenarioVm.briefCards"
                :key="item.label"
                class="scenario-brief-card"
                :class="item.tone"
              >
                <span>{{ item.label }}</span>
                <p>{{ item.text }}</p>
              </article>
            </div>

            <article class="bridge-card">
              <span>下游衔接</span>
              <strong>{{ downstreamModelCard?.value || '等待模型' }}</strong>
              <p>{{ downstreamModelCard?.detail || '当前窗口识别完成后，将继续进入模型选择和动作展开。' }}</p>
              <div class="bridge-actions">
                <el-button type="primary" plain size="small" @click="navigateTo(SCNET_ROUTES.expAnalysisGameTheory)">
                  进入博弈论
                </el-button>
                <el-button type="warning" plain size="small" @click="navigateTo(SCNET_ROUTES.expAnalysisDecisionTree)">
                  查看对策分析
                </el-button>
              </div>
            </article>

            <div class="insight-subsection">
              <div class="insight-subtitle">执行提示</div>
              <p class="rail-summary">情景页只负责识别窗口，下一步把这个窗口送入模型选择和动作展开。</p>
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
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { Document, Place } from '@element-plus/icons-vue'
import AnalysisLinkTabs from './components/shared/AnalysisLinkTabs.vue'
import AnalysisPageHero from './components/shared/AnalysisPageHero.vue'
import './components/shared/midStage.css'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { formatUraniumMetricValue } from '@/utils/uraniumDuringAdapter'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { buildUraniumScenarioViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'

const store = useUraniumDemoStore()
const snapshotStore = useAnalysisSnapshotStore()
const router = useRouter()
const { history, selectedExperiment, selectedExperimentId } = storeToRefs(store)

const activeWindowIndex = ref(0)
const scenarioTab = ref('overview')
const scenarioTabs = [
  { key: 'overview', label: '窗口主线' },
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
const activeWindow = computed(() => scenarioVm.value?.yearWindows?.[activeWindowIndex.value] || null)
const scenarioDigestCards = computed(() => scenarioVm.value?.scenarioDigestCards || [])
const downstreamModelCard = computed(() => scenarioDigestCards.value.find((item) => item.label === '下一步模型') || null)

function navigateTo(path) {
  router.push(path)
}

function selectWindow(index) {
  activeWindowIndex.value = index
  if (scenarioTab.value === 'compare') scenarioTab.value = 'overview'
}

async function ensureExperimentLoaded(force = false) {
  await store.ensureInitialized()
  const targetId = selectedExperimentId.value || history.value[0]?.experiment_id || ''
  if (!targetId) return
  if (!force && selectedExperiment.value?.experiment_id === targetId) return
  await store.loadExperiment(targetId)
}

onMounted(() => {
  ensureExperimentLoaded().catch(() => {})
})

watch(selectedExperimentId, (nextId) => {
  if (!nextId) return
  if (selectedExperiment.value?.experiment_id === nextId) return
  ensureExperimentLoaded(true).catch(() => {})
})

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

.window-verdict-card {
  display: grid;
  grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
  gap: 10px;
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid #bfdbfe;
  border-radius: var(--mid-radius-md);
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 34%),
    linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.window-verdict-main,
.window-verdict-meta {
  min-width: 0;
}

.window-verdict-main > span,
.window-verdict-meta small {
  display: block;
  color: #64748b;
  font-size: var(--mid-fs-label);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.window-verdict-main > strong {
  display: block;
  margin-top: 4px;
  color: #1d4ed8;
  font-size: var(--mid-fs-title);
}

.window-verdict-main p {
  margin: 5px 0 0;
  color: #475569;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
}

.window-verdict-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.window-verdict-meta > div {
  padding: 8px 10px;
  border: 1px solid rgba(191, 219, 254, 0.9);
  border-radius: var(--mid-radius-sm);
  background: rgba(255, 255, 255, 0.82);
}

.window-verdict-meta strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  overflow-wrap: anywhere;
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
  grid-template-columns: minmax(300px, 0.9fr) minmax(0, 1.55fr) minmax(320px, 0.92fr);
  gap: 12px;
  align-items: stretch;
}

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
  border-radius: 16px;
}


.window-card {
  padding: 14px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.window-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.window-card:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.window-card.active {
  border-color: #2563eb;
  background: #f8fbff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.12);
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
  border-radius: 16px;
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

  .window-verdict-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .scenario-summary-grid,
  .main-summary-grid,
  .node-grid,
  .evidence-grid,
  .factor-card-grid,
  .window-kpi-row,
  .bridge-actions,
  .window-verdict-meta {
    grid-template-columns: 1fr;
  }
}
</style>
