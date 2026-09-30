<template>
  <div class="decision-page mid-stage-bg">
    <MidStagePageHeader
      title="决策生成"
      subtitle="基于多目标优化与地缘风险评价的铀供应链应急调度指令方案"
      :icon="Promotion"
    >
      <template #right>
        <div class="scenario-header-stats">
          <span class="stat-pill"><b>4</b> 项应急调度令</span>
          <span class="stat-pill"><b>79</b> 综合加权评分</span>
          <span class="stat-pill"><b>4</b> 种备选方案</span>
        </div>
        <el-button size="small" @click="goToRun">
          <el-icon><ArrowLeft /></el-icon>
          <span>上一步：实验推演</span>
        </el-button>
        <el-button type="primary" size="small" @click="goToAnalysis">
          <span>下一步：情景分析</span>
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </template>
    </MidStagePageHeader>

    <div v-if="reportVm" class="decision-scroll">
      <section class="decision-summary">
        <div class="decision-heading">
          <div>
            <span class="decision-label">推荐方案</span>
            <h1>{{ summary.recommendedStrategy }}</h1>
          </div>
          <div class="decision-gain"><span>较基线增益</span><strong>{{ summary.improvementText }}</strong></div>
        </div>
        <p class="decision-conclusion">{{ simulationConclusion }}</p>
        <dl class="decision-context">
          <div v-for="item in contextRows" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div>
        </dl>
      </section>

      <dl class="decision-metrics" aria-label="关键结果">
        <div v-for="item in evidenceRows" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div>
      </dl>

      <!-- 五维决策风控评估雷达图与综合得分拆解 -->
      <section class="decision-panel radar-section">
        <MidStagePanelHeader title="对策评估五维风控雷达" description="推荐方案综合加权评分 79 分（各维度达标率与决策权重拆解）" />
        <div class="radar-body">
          <div class="radar-chart-container">
            <svg viewBox="0 0 320 280" class="radar-svg">
              <!-- Concentric Pentagons -->
              <polygon points="160,50 245.6,112.2 212.9,212.8 107.1,212.8 74.4,112.2" fill="none" stroke="#e2e8f0" stroke-width="1" />
              <polygon points="160,72 228.5,121.8 202.3,202.2 117.7,202.2 91.5,121.8" fill="none" stroke="#e2e8f0" stroke-width="1" />
              <polygon points="160,95 211.4,131.3 191.7,191.7 128.3,191.7 108.6,131.3" fill="none" stroke="#e2e8f0" stroke-width="1" />
              <polygon points="160,117 194.2,140.9 181.2,181.1 138.8,181.1 125.8,140.9" fill="none" stroke="#e2e8f0" stroke-width="1" />
              
              <!-- Axes -->
              <line x1="160" y1="140" x2="160" y2="50" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2" />
              <line x1="160" y1="140" x2="245.6" y2="112.2" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2" />
              <line x1="160" y1="140" x2="212.9" y2="212.8" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2" />
              <line x1="160" y1="140" x2="107.1" y2="212.8" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2" />
              <line x1="160" y1="140" x2="74.4" y2="112.2" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2" />
              
              <!-- Data Polygon: (95, 72, 84, 88, 90) -->
              <polygon points="160,54.5 221.7,120.0 204.4,201.2 113.4,204.1 83.0,115.0" fill="rgba(37, 99, 235, 0.18)" stroke="#2563eb" stroke-width="2" />
              
              <!-- Dots on vertices -->
              <circle cx="160" cy="54.5" r="4" fill="#2563eb" />
              <circle cx="221.7" cy="120.0" r="4" fill="#2563eb" />
              <circle cx="204.4" cy="201.2" r="4" fill="#2563eb" />
              <circle cx="113.4" cy="204.1" r="4" fill="#2563eb" />
              <circle cx="83.0" cy="115.0" r="4" fill="#2563eb" />
              
              <!-- Labels -->
              <text x="160" y="38" text-anchor="middle" font-size="11" font-weight="600" fill="#1e293b">战略保供履约度 (95分 / 30%)</text>
              <text x="252" y="112" text-anchor="start" font-size="11" font-weight="600" fill="#1e293b">平抑完全成本 (72分 / 25%)</text>
              <text x="218" y="230" text-anchor="start" font-size="11" font-weight="600" fill="#1e293b">断链冗余度 (84分 / 20%)</text>
              <text x="100" y="230" text-anchor="end" font-size="11" font-weight="600" fill="#1e293b">库存均衡指数 (88分 / 15%)</text>
              <text x="68" y="112" text-anchor="end" font-size="11" font-weight="600" fill="#1e293b">长协防违约 (90分 / 10%)</text>
            </svg>
          </div>
          <div class="radar-score-cards">
            <div class="score-card-item">
              <span class="score-dim">战略保供履约度</span>
              <strong class="score-val safe">95 分</strong>
              <small>权重 30% · 4台华龙一号首炉 0 停堆</small>
            </div>
            <div class="score-card-item">
              <span class="score-dim">平抑到岸完全成本</span>
              <strong class="score-val normal">72 分</strong>
              <small>权重 25% · CIF到岸 $246.80/kgU</small>
            </div>
            <div class="score-card-item">
              <span class="score-dim">地缘运输断链冗余度</span>
              <strong class="score-val safe">84 分</strong>
              <small>权重 20% · 纳米比亚海运分流 55%</small>
            </div>
            <div class="score-card-item">
              <span class="score-dim">跨基地安全库存均衡</span>
              <strong class="score-val safe">88 分</strong>
              <small>权重 15% · 北方210天 / 南方240天</small>
            </div>
            <div class="score-card-item">
              <span class="score-dim">长协契约违约风险</span>
              <strong class="score-val safe">90 分</strong>
              <small>权重 10% · 刚性履约 0 违约敞口</small>
            </div>
          </div>
        </div>
      </section>

      <section class="decision-panel">
        <MidStagePanelHeader title="国家/集团级应急调度令清单" description="按优先顺序下达供应定向、通道提速与储备借调调度指令" />
        <div class="dispatch-order-grid">
          <article v-for="(item, index) in actionRows" :key="item" class="dispatch-order-card" :class="'order-' + actionTagType(index)">
            <div class="doc-header">
              <div class="doc-badge-row">
                <span class="doc-num">调度令 #2026-U-0{{ index + 1 }}</span>
                <el-tag :type="actionTagType(index)" size="small" effect="dark">{{ actionTagText(index) }}</el-tag>
              </div>
              <strong class="doc-title">{{ actionTitles[index] || `应急调度令 ${index + 1}` }}</strong>
            </div>
            <p class="doc-content">{{ item }}</p>
            <div class="doc-footer">
              <span class="doc-dept">签发：供应链应急联合指挥部</span>
              <span class="doc-status">时效：72 小时内响应闭环</span>
            </div>
          </article>
        </div>
      </section>

      <!-- 多通道替代物流走廊与来源国推荐 -->
      <section class="decision-panel">
        <MidStagePanelHeader
          title="多通道替代物流走廊与来源国推荐"
          description="基于低风险(30%)、可用容量(20%)、断链韧性(20%)、分散度(15%)与舆情清洁度(15%)算法加权输出"
          :count="`${alternativeRoutes.length} 条走廊`"
        />
        <div class="route-cards-list">
          <div v-for="item in alternativeRoutes" :key="item.route_id" class="route-card-item">
            <div class="route-card-head">
              <span class="route-rank">0{{ item.rank }}</span>
              <div class="route-title-wrap">
                <div class="route-name-row">
                  <strong>{{ item.name }}</strong>
                  <el-tag :type="item.tagType" size="small" effect="plain">{{ item.level }}</el-tag>
                </div>
                <span class="route-path">{{ item.path }}</span>
              </div>
              <div class="route-score-badge">
                <small>算法评分</small>
                <b>{{ item.score }}</b>
              </div>
            </div>
            <div class="route-meta-row">
              <span>可用容量：<b>{{ item.capacity }}</b></span>
              <span>路径风险指数：<b>{{ item.risk }}</b></span>
              <span>断链冗余度：<b>{{ item.resilience }}</b></span>
            </div>
            <p class="route-adv"><strong>决策评估：</strong>{{ item.advantages }}</p>
          </div>
        </div>
      </section>

      <section class="decision-panel">
        <MidStagePanelHeader title="候选方案对比" description="结合对策评分、停堆风险与适用条件选择执行方案" :count="`${candidateRows.length} 项`" />
        <el-table :data="candidateRows" class="decision-table" empty-text="暂无候选方案">
          <el-table-column label="方案" min-width="160">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
              <el-tag v-if="row.isBest" size="small" type="success" effect="plain" class="recommended-tag">推荐</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="机组停堆风险率" width="130">
            <template #default="{ row }">
              <span :class="['risk-pill', row.reactorTripRisk === '0.0%' ? 'safe' : (row.reactorTripRisk === '6.5%' ? 'danger' : 'warn')]">
                {{ row.reactorTripRisk || '0.0%' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="budgetDelta" label="应急超额预算" width="120" />
          <el-table-column prop="cifCost" label="到岸成本" width="110" />
          <el-table-column prop="inventoryBalance" label="基地库存均衡" min-width="160" />
          <el-table-column prop="scoreText" label="综合评分" width="100" />
          <el-table-column prop="improvementText" label="较基线变化" width="110" />
          <el-table-column label="调度适用说明" min-width="240">
            <template #default="{ row }">{{ row.note || row.outcome || '暂无说明' }}</template>
          </el-table-column>
        </el-table>
      </section>
    </div>
    <div v-else class="decision-empty">
      <el-empty description="完成实验后，可查看决策建议" :image-size="80">
        <el-button type="primary" @click="goToRun">前往实验管理</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MidStagePageHeader from './components/shared/MidStagePageHeader.vue'
import MidStagePanelHeader from './components/shared/MidStagePanelHeader.vue'
import { ArrowLeft, ArrowRight, Promotion } from '@element-plus/icons-vue'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { storeToRefs } from 'pinia'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { buildUraniumReportViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'

const route = useRoute()
const router = useRouter()
function goToRun() {
  const query = { ...route.query, view: 'run' }
  router.replace({ query })
}
function goToAnalysis() {
  router.push({ path: SCNET_ROUTES.expAnalysisScenario, query: { ...route.query, scenario: 'uranium' } })
}

const alternativeRoutes = [
  {
    rank: 1,
    route_id: 'namibia',
    name: '纳米比亚西非远洋航线 (鲸湾港-连云港/广州港)',
    country: '纳米比亚',
    capacity: '6,504 tU',
    risk: '56.2',
    resilience: '1.0',
    score: '73.6分',
    level: '强烈推荐',
    tagType: 'success',
    path: '湖山/罗辛矿区 → 鲸湾港(Walvis Bay) → 南非好望角/东亚海运段 → 中国沿海接收港 → 国内核燃料转运网络',
    advantages: '中广核独资大矿直控；可用容量充足；与欧亚大陆中断路线无共同脆弱瓶颈；海运走廊无负面舆情干预'
  },
  {
    rank: 2,
    route_id: 'uzbekistan',
    name: '乌兹别克斯坦中亚铁路直达班列',
    country: '乌兹别克斯坦',
    capacity: '3,500 tU',
    risk: '51.3',
    resilience: '1.0',
    score: '64.6分',
    level: '推荐',
    tagType: 'primary',
    path: '纳沃伊矿区 → 中亚跨国铁路走廊 → 霍尔果斯/阿拉山口口岸 → 兰州/包头核燃料元件基地',
    advantages: '陆路直达，规避地中海/红海狭窄海峡风险；中乌双边本币结算通道稳定；常态化专运列车保障'
  },
  {
    rank: 3,
    route_id: 'australia',
    name: '澳大利亚西太平洋远洋航线 (奥林匹克坝)',
    country: '澳大利亚',
    capacity: '3,800 tU',
    risk: '51.4',
    resilience: '0.85',
    score: '60.8分',
    level: '推荐',
    tagType: 'warning',
    path: '奥林匹克坝矿区 → 阿德莱德/达尔文港 → 西太平洋海运航线 → 连云港/防城港',
    advantages: '副产物规模化生产成本低；海运周期仅18-22天；受地缘政策许可波动影响需保持长协跟踪'
  },
  {
    rank: 4,
    route_id: 'niger',
    name: '尼日尔西非多式联运走廊 (Somaïr / Arlit)',
    country: '尼日尔',
    capacity: '2,000 tU',
    risk: '47.4',
    resilience: '0.7',
    score: '58.3分',
    level: '备选',
    tagType: 'info',
    path: '阿利特矿区 → 贝宁科托努港 → 远洋海运段 → 连云港',
    advantages: '高品位原料来源；但受西非政局与萨赫勒地缘局势扰动，需配置陆运安保冗余'
  },
  {
    rank: 5,
    route_id: 'canada',
    name: '加拿大萨斯喀彻温北太平洋航线 (Cameco / Cigar Lake)',
    country: '加拿大',
    capacity: '5,800 tU',
    risk: '51.9',
    resilience: '0.75',
    score: '56.9分',
    level: '备选',
    tagType: 'info',
    path: '阿萨巴斯卡盆地 → 蒙特利尔/温哥华港 → 北太平洋海运 → 沿海港口',
    advantages: '世界最高品位优质矿石；作为全球现货压舱石，但出口许可受西方双重管制制约'
  }
]

const uraniumStore = useUraniumDemoStore()
const snapshotStore = useAnalysisSnapshotStore()
const { history, selectedExperiment } = storeToRefs(uraniumStore)
const reportVm = computed(() => buildUraniumReportViewModel({
  experiment: selectedExperiment.value,
  history: history.value,
  snapshot: snapshotStore.getActiveSnapshot()
}))
const summary = computed(() => reportVm.value?.decisionSummary || {})
const candidateRows = computed(() => summary.value?.candidateRows || [])
const stressedWindow = computed(() => {
  const windows = reportVm.value?.focusWindowCards || []
  return windows.find(item => item.isPeak) || windows.find(item => item.tone === 'danger') || windows[0] || null
})
const contextRows = computed(() => [
  { label: '适用场景', value: summary.value.scenarioLabel || '-' },
  { label: '决策时点', value: summary.value.timeLabel || '-' },
  { label: '触发事件', value: summary.value.eventName || '-' }
])
const simulationConclusion = computed(() => {
  const window = stressedWindow.value
  const headline = summary.value?.headline || '推演结果显示当前供应链需要主动干预。'
  if (!window) return headline
  return `${headline} 其中 ${window.year || '-'} 年窗口最值得优先处置，触发因素为“${window.headline || '常态运行'}”，主链路为 ${window.routeText || '关键采购链路'}。`
})
const evidenceRows = computed(() => (reportVm.value?.keyResultCards || []).slice(0, 4))
const actionTitles = [
  '调度令 01：【中哈陆路定向分流令】阿拉山口口岸直达直供',
  '调度令 02：【远洋现货锁定与船期加速令】鲸湾港专船起运',
  '调度令 03：【中央战略储备紧急平抑令】陕西/兰州储备库借调',
  '调度令 04：【跨基地动态安全库存均衡令】两用物项调运平衡'
]
const actionRows = computed(() => [
  '指令哈萨克斯坦 Inkai 矿区 1,680 tU 原料全部经阿拉山口铁路口岸专列直达中核北方包头基地，优先保障 4 台华龙一号机组首炉装料工期，严防停堆断料。',
  '指令中广核纳米比亚湖山矿通过鲸湾港提前 20 天装船起运 1,000 tU，直航连云港/广州港，定向补足南方沿海机组商业大修换料缺口。',
  '向国家能源局与集团申请从陕西/兰州原料储备库借调 200 tU 天然铀原料，平抑南方基地短期交货缺口，承诺于 2026.Q4 前滚动回填归还。',
  '启动北方包头（14周）与南方沿海（36周）基地库存联动监测，在 180 天商业安全库存红线约束下执行横向转运与 Class 7 危运报备。'
])
function actionTagText(index) {
  return index === 0 ? '立即执行' : index === 1 ? '船期加速' : index === 2 ? '审批借调' : '持续监控'
}

function actionTagType(index) {
  return index === 0 ? 'danger' : index === 1 ? 'warning' : index === 2 ? 'primary' : 'success'
}

onMounted(() => uraniumStore.ensureInitialized())
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

/* 调度令卡片网格 */
.dispatch-order-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 14px 18px 18px;
}

.dispatch-order-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;
  border-left-width: 4px;
}

.dispatch-order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dispatch-order-card.order-danger { border-left-color: #ef4444; }
.dispatch-order-card.order-warning { border-left-color: #f59e0b; }
.dispatch-order-card.order-primary { border-left-color: #3b82f6; }
.dispatch-order-card.order-success { border-left-color: #10b981; }

.doc-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.doc-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.doc-num {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.02em;
}

.doc-title {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.doc-content {
  margin: 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.6;
}

.doc-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
}

.doc-status {
  font-weight: 600;
  color: #2563eb;
}

@media (max-width: 960px) {
  .dispatch-order-grid {
    grid-template-columns: 1fr;
  }
}

.decision-page { height: 100%; min-height: 0; background: var(--mid-stage-bg); color: #1e293b; }
.decision-scroll { height: 100%; overflow-y: auto; box-sizing: border-box; padding: 16px; }
.decision-summary, .decision-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.decision-summary { padding: 18px 20px; }
.decision-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.decision-label { color: #2563eb; font-size: 12px; }
h1 { margin: 6px 0 0; font-size: 20px; line-height: 1.5; font-weight: 600; }
.decision-gain { flex: 0 0 auto; display: flex; flex-direction: column; gap: 4px; text-align: right; }
.decision-gain span { color: #64748b; font-size: 12px; }
.decision-gain strong { color: #2563eb; font-size: 22px; font-weight: 600; }
.decision-conclusion { color: #475569; font-size: 13px; line-height: 1.8; margin: 14px 0; }
.decision-context { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 0; padding-top: 12px; border-top: 1px solid #f1f5f9; }
.decision-context > div { display: flex; gap: 8px; font-size: 12px; line-height: 1.6; }
dt { color: #64748b; }
dd { margin: 0; }
.decision-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 16px 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.decision-metrics > div { padding: 14px 20px; }
.decision-metrics dt { font-size: 12px; }
.decision-metrics dd { margin-top: 6px; font-size: 18px; font-weight: 600; }
.decision-panel + .decision-panel { margin-top: 16px; }
.action-list { margin: 0; padding: 0 16px; list-style: none; }
.action-row { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 12px; align-items: start; padding: 14px 0; }
.action-row + .action-row { border-top: 1px solid #f1f5f9; }
.action-number { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #2563eb; background: #eff6ff; font-size: 12px; }
.action-row strong { font-size: 13px; font-weight: 600; }
.action-row p { margin: 5px 0 0; color: #64748b; font-size: 13px; line-height: 1.7; }
.decision-table { border-radius: 0 0 8px 8px; font-size: 13px; }
.recommended-tag { margin-left: 8px; }
.decision-empty { display: grid; place-items: center; height: 100%; }
@media (max-width: 900px) { .decision-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) {
  .decision-scroll { padding: 10px; }
  .decision-heading { align-items: start; }
  .action-row { grid-template-columns: 24px minmax(0, 1fr); }
  .action-row .el-tag { grid-column: 2; justify-self: start; }
}

/* 五维雷达图与得分卡 */
.radar-section {
  padding-bottom: 16px;
}
.radar-body {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  padding: 12px 20px 0;
}
.radar-chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
}
.radar-svg {
  width: 100%;
  max-width: 320px;
  height: auto;
}
.radar-score-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
.score-card-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 12px;
}
.score-dim {
  display: block;
  font-size: 11px;
  color: #475569;
}
.score-val {
  display: block;
  font-size: 18px;
  font-weight: 700;
  margin: 2px 0;
}
.score-val.safe {
  color: #166534;
}
.score-val.normal {
  color: #0369a1;
}
.score-card-item small {
  display: block;
  font-size: 10px;
  color: #94a3b8;
  line-height: 1.4;
}

/* 停堆风险与预算标签 */
.risk-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
}
.risk-pill.safe {
  background: #dcfce7;
  color: #166534;
}
.risk-pill.warn {
  background: #fef3c7;
  color: #92400e;
}
.risk-pill.danger {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 860px) {
  .radar-body {
    grid-template-columns: 1fr;
  }
}

/* 替代走廊推荐卡片列表 */
.route-cards-list {
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.route-card-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  transition: all 0.2s ease;
}
.route-card-item:hover {
  background: #fff;
  border-color: #cbd5e1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}
.route-card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.route-rank {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  background: #eff6ff;
  flex-shrink: 0;
}
.route-title-wrap {
  flex: 1;
  min-width: 0;
}
.route-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.route-name-row strong {
  font-size: 13px;
  color: #1e293b;
}
.route-path {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-top: 3px;
}
.route-score-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 6px;
}
.route-score-badge small {
  font-size: 10px;
  color: #94a3b8;
}
.route-score-badge b {
  font-size: 14px;
  color: #2563eb;
}
.route-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed #e2e8f0;
  font-size: 11px;
  color: #64748b;
}
.route-meta-row b {
  color: #1e293b;
}
.route-adv {
  margin: 6px 0 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.5;
}
.route-adv strong {
  color: #334155;
}
</style>

