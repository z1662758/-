<template>
  <div class="decision-page mid-stage-bg">
    <MidStagePageHeader
      title="事中决策建议"
      subtitle="根据当前实验结果整理候选建议、适用条件与风险触发点；建议需经业务确认后执行"
      :icon="Promotion"
    >
      <template #right>
        <div class="scenario-header-stats">
          <span class="stat-pill"><b>{{ actionRows.length }}</b> 项建议动作</span>
          <span class="stat-pill"><b>{{ recommendedScore }}</b> 推荐评分</span>
          <span class="stat-pill"><b>{{ bestCandidate?.reactorTripRisk || '—' }}</b> 非计划停堆风险</span>
        </div>
        <el-button size="small" plain @click="exportDecisionBrief">
          <el-icon><DocumentCopy /></el-icon>
          <span>复制决策摘要</span>
        </el-button>
        <el-button type="primary" size="small" @click="goToStrategy">
          <span>查看决策分析</span>
          <el-icon><ArrowRight /></el-icon>
        </el-button>
        <el-button size="small" plain @click="goToOverviewReport">
          <span>查看实验总结</span>
        </el-button>
      </template>
    </MidStagePageHeader>

    <div v-if="reportVm" class="decision-scroll">
      <!-- 业务核心问题导引条（阐明“决策方案想解决什么问题”） -->
      <section class="decision-core-question-strip glass-panel">
        <div class="core-question-badge">决策方案目标</div>
        <div class="core-question-text">
          <strong>基于本次实验结果，哪些候选动作值得优先评估？</strong>
          <p>本页展示的是模型建议，不代表已经下达或执行的调度指令。请结合实时态势、审批条件和业务约束进行复核。</p>
        </div>
      </section>

      <!-- 事中全链路推演流程导引横幅 -->
      <nav class="decision-hero-flow glass-panel" aria-label="事中全链路推演时序流">
        <div class="flow-step done">
          <div class="step-badge"><el-icon><Check /></el-icon></div>
          <div class="step-meta">
            <div class="step-title-row">
              <span class="step-num">01</span>
              <strong>沙盘模型</strong>
              <el-tag size="small" type="success" effect="plain">底座就绪</el-tag>
            </div>
            <span class="step-desc">Agent合约 / 环境 / 规则模型</span>
          </div>
        </div>
        <div class="flow-arrow"><el-icon><Right /></el-icon></div>
        <div class="flow-step done">
          <div class="step-badge"><el-icon><Check /></el-icon></div>
          <div class="step-meta">
            <div class="step-title-row">
              <span class="step-num">02</span>
              <strong>想定生成</strong>
              <el-tag size="small" type="success" effect="plain">需求解析</el-tag>
            </div>
            <span class="step-desc">变量拆解与多方案矩阵</span>
          </div>
        </div>
        <div class="flow-arrow"><el-icon><Right /></el-icon></div>
        <div class="flow-step done">
          <div class="step-badge"><el-icon><Check /></el-icon></div>
          <div class="step-meta">
            <div class="step-title-row">
              <span class="step-num">03</span>
              <strong>实验管理</strong>
              <el-tag size="small" type="success" effect="plain">仿真收敛</el-tag>
            </div>
            <span class="step-desc">100轮蒙特卡洛多智能体仿真</span>
          </div>
        </div>
        <div class="flow-arrow"><el-icon><Right /></el-icon></div>
        <div class="flow-step done">
          <div class="step-badge"><el-icon><Check /></el-icon></div>
          <div class="step-meta">
            <div class="step-title-row">
              <span class="step-num">04</span>
              <strong>沙盘推演</strong>
              <el-tag size="small" type="success" effect="plain">剧场回放</el-tag>
            </div>
            <span class="step-desc">复杂网络与地理走廊联动</span>
          </div>
        </div>
        <div class="flow-arrow"><el-icon><Right /></el-icon></div>
        <div class="flow-step active">
          <div class="step-badge"><span>05</span></div>
          <div class="step-meta">
            <div class="step-title-row">
              <span class="step-num">05</span>
              <strong>决策方案</strong>
              <el-tag size="small" type="primary" effect="dark">当前方案</el-tag>
            </div>
          <span class="step-desc">候选建议与适用条件</span>
          </div>
        </div>
        <div class="flow-arrow"><el-icon><Right /></el-icon></div>
        <div class="flow-step" style="cursor: pointer" @click="goToStrategy">
          <div class="step-badge"><span>06</span></div>
          <div class="step-meta">
            <div class="step-title-row">
              <span class="step-num">06</span>
              <strong>决策分析</strong>
              <el-tag size="small" type="info" effect="plain">评估优选</el-tag>
            </div>
            <span class="step-desc">多目标博弈帕累托寻优</span>
          </div>
        </div>
        <div class="flow-arrow"><el-icon><Right /></el-icon></div>
        <div class="flow-step" style="cursor: pointer" @click="goToOverviewReport">
          <div class="step-badge"><span>07</span></div>
          <div class="step-meta">
            <div class="step-title-row">
              <span class="step-num">07</span>
          <strong>实验总结</strong>
              <el-tag size="small" type="info" effect="plain">闭环专报</el-tag>
            </div>
          <span class="step-desc">结果、证据与风险复盘</span>
          </div>
        </div>
      </nav>

      <section class="decision-summary">
        <div class="decision-heading">
          <div>
            <span class="decision-label">实验结果生成的候选建议</span>
            <h1>{{ recommendedStrategy }}</h1>
          </div>
          <div class="decision-gain"><span>较基线变化</span><strong>{{ bestCandidate?.improvementText || '—' }}</strong></div>
        </div>
        <p class="decision-conclusion">{{ simulationConclusion }}</p>
        <dl class="decision-context">
          <div v-for="item in contextRows" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div>
        </dl>
      </section>

      <section class="decision-panel decision-evidence-panel">
        <MidStagePanelHeader title="实验事实与比较结论" :description="`候选方案 ${candidateRows.length} 项，当前优选评分 ${recommendedScore}`" />
        <div class="decision-evidence-grid">
          <article class="decision-evidence-card">
            <span class="decision-evidence-kicker">实验事实</span>
            <strong>本次实验返回的关键指标</strong>
            <div class="decision-evidence-list">
              <div v-for="item in evidenceRows" :key="item.label"><span>{{ item.label }}</span><b>{{ item.value }}</b></div>
            </div>
          </article>
          <article class="decision-evidence-card">
            <span class="decision-evidence-kicker">比较结论</span>
            <strong>{{ bestCandidate?.name || '暂无优选方案' }}</strong>
            <p>{{ bestCandidate?.note || bestCandidate?.outcome || '当前实验没有返回足够的候选方案说明。' }}</p>
            <div class="decision-evidence-note">评分只用于本次实验内的相对比较，不等同于实际执行许可。</div>
          </article>
        </div>
      </section>

      <!-- 核心特色 2：自适应量化触发与切换条件 (Adaptive Thresholds & Circuit-Breakers) -->
      <section class="decision-panel trigger-rules-panel">
        <MidStagePanelHeader
          title="风险触发与切换条件"
          description="把实验中识别出的风险信号整理为后续监测建议，实际阈值仍需结合实时数据校准。"
          :count="`${adaptiveTriggerRules.length} 条自适应规则`"
        />
        <div class="trigger-rules-grid">
          <div v-for="rule in adaptiveTriggerRules" :key="rule.id" class="trigger-rule-card" :class="'tone-' + rule.tone">
            <div class="rule-head">
              <span class="rule-code">{{ rule.code }}</span>
              <el-tag :type="rule.tagType" size="small" effect="plain">{{ rule.category }}</el-tag>
            </div>
            <strong class="rule-name">{{ rule.name }}</strong>
            <div class="rule-threshold-box">
              <span class="thresh-label">量化触发阈值：</span>
              <strong class="thresh-val">{{ rule.threshold }}</strong>
            </div>
            <p class="rule-action-desc"><b>建议响应：</b>{{ rule.action }}</p>
            <div class="rule-footer">
              <span><b>恢复解除条件：</b>{{ rule.recovery }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 核心特色 3：建议动作清单 -->
      <section class="decision-panel">
        <MidStagePanelHeader
          title="本次输出：决策建议"
          description="这里展示实验实际生成的方案内容；下达、审批和执行不属于本页面。"
          :count="`${actionRows.length} 项建议`"
        />
        <div class="decision-output-lead">
          <span>方案名称</span>
          <strong>{{ recommendedStrategy }}</strong>
          <p>{{ simulationConclusion }}</p>
        </div>
        <div class="decision-output-subtitle">具体方案内容</div>
        <div class="recommendation-grid">
          <article v-for="(item, index) in actionRows" :key="item.title" class="recommendation-card">
            <div class="recommendation-card__head">
              <span class="recommendation-index">0{{ index + 1 }}</span>
              <el-tag size="small" type="warning" effect="plain">待确认</el-tag>
            </div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
            <div class="recommendation-card__foot">
              <span>建议来源：实验对比结果</span>
              <span>执行状态：未下达</span>
            </div>
          </article>
        </div>
      </section>

      <!-- 实验结果中的关键采购链路 -->
      <section class="decision-panel">
        <MidStagePanelHeader
          title="关键采购链路"
          description="这里只展示本次实验返回的采购分配结果，不对未验证的替代通道做额外推荐。"
          :count="`${reportVm.routeDigestRows?.length || 0} 条链路`"
        />
        <div class="route-cards-list">
          <div v-for="(item, index) in reportVm.routeDigestRows" :key="item.id || item.label" class="route-card-item">
            <div class="route-card-head">
              <span class="route-rank">0{{ index + 1 }}</span>
              <div class="route-title-wrap">
                <div class="route-name-row">
                  <strong>{{ item.label }}</strong>
                  <el-tag type="info" size="small" effect="plain">实验结果</el-tag>
                </div>
                <span class="route-path">采购量 {{ item.quantityText }}</span>
              </div>
              <div class="route-score-badge">
                <small>采购占比</small>
                <b>{{ item.shareText }}</b>
              </div>
            </div>
            <div class="route-meta-row">
              <span>来源：<b>{{ item.label.split(' → ')[0] || '—' }}</b></span>
              <span>承接方：<b>{{ item.label.split(' → ')[1] || '—' }}</b></span>
            </div>
            <p class="route-adv"><strong>使用说明：</strong>该链路来自当前实验分配结果，是否纳入决策建议需结合实时通道状态复核。</p>
          </div>
          <el-empty v-if="!reportVm.routeDigestRows?.length" description="当前实验未返回采购链路" :image-size="60" />
        </div>
      </section>

      <section class="decision-panel">
        <MidStagePanelHeader title="候选方案对比" description="仅比较本次实验返回的方案结果，不代表已经批准执行" :count="`${candidateRows.length} 项`" />
        <el-table :data="candidateRows" class="decision-table" empty-text="暂无候选方案">
          <el-table-column label="方案" min-width="160">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
              <el-tag v-if="row.isBest" size="small" type="success" effect="plain" class="recommended-tag">实验优选</el-tag>
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
          <el-table-column label="比较说明" min-width="240">
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
import {
  ArrowRight,
  Promotion,
  Check,
  Right,
  DocumentCopy
} from '@element-plus/icons-vue'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { storeToRefs } from 'pinia'
import { useUraniumDemoStore } from '@/stores/scnet/useUraniumDemoStore'
import { useAnalysisSnapshotStore } from '@/stores/scnet/useAnalysisSnapshotStore'
import { buildUraniumReportViewModel } from '@/views/SCnet/adapters/uraniumMockAnalysisAdapter'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

function goToRun() {
  router.push({ path: SCNET_ROUTES.experimentManager, query: { ...route.query, scenario: 'uranium', view: 'run' } })
}
function goToStrategy() {
  router.push({ path: SCNET_ROUTES.expAnalysisScenario, query: { ...route.query, scenario: 'uranium' } })
}
function goToOverviewReport() {
  router.push({ path: SCNET_ROUTES.expAnalysisOverview, query: { ...route.query, scenario: 'uranium' } })
}

async function exportDecisionBrief() {
  const text = [
    `决策建议：${recommendedStrategy.value}`,
    `实验范围：${contextRows.value.map(item => `${item.label} ${item.value}`).join('；')}`,
    `比较结论：${simulationConclusion.value}`,
    `关键指标：${evidenceRows.value.map(item => `${item.label} ${item.value}`).join('；')}`,
    '说明：以上为实验结果生成的候选建议，需结合实时态势和业务流程确认。'
  ].join('\n')
  if (!navigator?.clipboard?.writeText) {
    ElMessage.warning('当前环境不支持复制，请使用页面内容手动保存')
    return
  }
  await navigator.clipboard.writeText(text)
  ElMessage.success('决策摘要已复制')
}

const fallbackAdaptiveTriggerRules = Object.freeze([
  {
    id: 'tr-01',
    code: 'RULE-STOCK-45D',
    name: '安全库存破位自适应储备借调',
    category: '库存熔断',
    tagType: 'danger',
    tone: 'danger',
    threshold: '沿海基地在役安全库存 < 45 天标称需求量',
    action: '立即触发国家战略储备 400 tU 应急平准借调机制，定向锁定装料，免除任何停堆断料风险。',
    recovery: '沿海基地储备回升至 90 天以上且在途海运货物抵港。'
  },
  {
    id: 'tr-02',
    code: 'RULE-PRICE-SPIKE',
    name: '国际现货暴涨价格上限熔断机制',
    category: '价格平抑',
    tagType: 'warning',
    tone: 'warning',
    threshold: '国际现货单周涨幅 > 25% 或绝对价格突破 $95/lb',
    action: '启动现货限价防恐慌机制，冻结国内非紧急高位追涨接盘，全面转入中亚与非洲长协提货。',
    recovery: '国际现货回调至 $80/lb 以下且投机性远期溢价消除。'
  },
  {
    id: 'tr-03',
    code: 'RULE-PORT-BLOCK',
    name: '陆路通道滞留自动南移远洋海运',
    category: '通道切换',
    tagType: 'primary',
    tone: 'primary',
    threshold: '霍尔果斯/阿拉山口口岸在途滞留时间 > 120 小时',
    action: '自动激活纳米比亚湖山矿远洋海运增量 55% 方案，在途散货转为集装箱封闭专运直达沿海。',
    recovery: '边境陆路班列通关时间稳定在 48 小时以内达连续 14 天。'
  },
  {
    id: 'tr-04',
    code: 'RULE-REACTOR-PRIORITY',
    name: '战略主力堆型首炉燃料特级保障',
    category: '优先级管控',
    tagType: 'success',
    tone: 'success',
    threshold: '预测机组停堆断料风险率 > 0.1%',
    action: '启动刚性调度优先级，华龙一号首炉机组享受 100% 转化与制造产能独占，商运机组大修柔性后移。',
    recovery: '首炉装料全部完成并并网发电，系统恢复常规均衡排产。'
  }
])

const adaptiveTriggerRules = computed(() => {
  const alerts = reportVm.value?.alerts || []
  if (!alerts.length) return fallbackAdaptiveTriggerRules
  return alerts.slice(0, 6).map((text, index) => {
    const [name, detail = text] = String(text).split('：')
    return {
      id: `alert-${index + 1}`,
      code: `ALERT-${String(index + 1).padStart(2, '0')}`,
      name: name || `风险监测点 ${index + 1}`,
      category: '实验风险提示',
      tagType: /红线|停堆|超限|突破/.test(text) ? 'danger' : 'warning',
      tone: /红线|停堆|超限|突破/.test(text) ? 'danger' : 'warning',
      threshold: detail.split('，')[0] || '请结合实时数据确认触发阈值',
      action: detail.split('，').slice(1).join('，') || '重新测算候选方案并提交人工复核。',
      recovery: '待业务确认解除条件'
    }
  })
})

const uraniumStore = useUraniumDemoStore()
const snapshotStore = useAnalysisSnapshotStore()
const { history, selectedExperiment } = storeToRefs(uraniumStore)

const effectiveExperiment = computed(() => {
  if (selectedExperiment.value) return selectedExperiment.value
  if (snapshotStore.getActiveSnapshot()?.experiment) return snapshotStore.getActiveSnapshot().experiment
  if (history.value && history.value[0]) return history.value[0]
  const list = Object.values(uraniumStore.experiments || {})
  if (list.length) return list[0]
  return null
})

const reportVm = computed(() => {
  return buildUraniumReportViewModel({
    experiment: effectiveExperiment.value,
    history: history.value,
    snapshot: snapshotStore.getActiveSnapshot()
  })
})
const candidateRows = computed(() => reportVm.value?.decisionSummary?.candidateRows || [])
const bestCandidate = computed(() => candidateRows.value.find(item => item.isBest) || candidateRows.value[0] || null)
const recommendedScore = computed(() => {
  if (bestCandidate.value?.scoreText) return bestCandidate.value.scoreText
  if (bestCandidate.value?.score != null) return `${bestCandidate.value.score} 分`
  return '—'
})
const recommendedStrategy = computed(() => reportVm.value?.decisionSummary?.recommendedStrategy || bestCandidate.value?.name || '暂无推荐方案')
const contextRows = computed(() => [
  { label: '实验范围', value: reportVm.value?.selectedYearRange ? `${reportVm.value.selectedYearRange} 年` : '—' },
  { label: '分析场景', value: reportVm.value?.decisionSummary?.scenarioLabel || '—' },
  { label: '关键事件', value: reportVm.value?.decisionSummary?.eventName || '—' }
])
const simulationConclusion = computed(() => {
  return reportVm.value?.decisionSummary?.headline
    || bestCandidate.value?.note
    || '当前实验尚未形成可用的建议，请先完成一次实验推演。'
})
const evidenceRows = computed(() => (reportVm.value?.keyResultCards || []).slice(0, 4))
const actionRows = computed(() => {
  const recommendations = Array.isArray(reportVm.value?.recommendations)
    ? reportVm.value.recommendations.filter(Boolean)
    : []
  if (recommendations.length) {
    return recommendations.slice(0, 4).map((detail, index) => ({
      title: `建议动作 ${String(index + 1).padStart(2, '0')}`,
      detail
    }))
  }
  return candidateRows.value.slice(0, 3).map((item, index) => ({
    title: item.name || `候选动作 ${String(index + 1).padStart(2, '0')}`,
    detail: item.note || item.outcome || '暂无补充说明'
  }))
})

onMounted(() => uraniumStore.ensureInitialized())
</script>

<style scoped>
/* 事中全链路推演时序流横幅 */
.decision-hero-flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  margin-bottom: 14px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  gap: 8px;
  overflow-x: auto;
}
.flow-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: default;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.flow-step.active {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}
.flow-step .step-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
}
.flow-step.done .step-badge {
  background: #dcfce7;
  color: #15803d;
}
.flow-step.active .step-badge {
  background: #2563eb;
  color: #ffffff;
}
.step-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.step-title-row strong {
  font-size: 13px;
  color: #0f172a;
}
.step-num {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
}
.step-desc {
  font-size: 11px;
  color: #64748b;
  display: block;
}
.flow-arrow {
  color: #cbd5e1;
  display: flex;
  align-items: center;
  font-size: 14px;
  flex-shrink: 0;
}

/* 核心特色 1：分阶段执行时序与推进图样式 */
.phased-timeline-container {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 16px 18px 20px;
}
.phase-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;
  position: relative;
  cursor: pointer;
}
.phase-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}
.phase-card.phase-active {
  border-top: 3px solid #10b981;
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.4) 0%, #ffffff 40%);
}
.phase-card.phase-running {
  border-top: 3px solid #2563eb;
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.4) 0%, #ffffff 40%);
}
.phase-card.phase-ready {
  border-top: 3px solid #f59e0b;
  background: linear-gradient(180deg, rgba(254, 243, 199, 0.3) 0%, #ffffff 40%);
}
.phase-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.phase-tag-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.phase-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: #0f172a;
  color: #ffffff;
  letter-spacing: 0.04em;
}
.phase-time-pill {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  background: #f1f5f9;
  padding: 2px 7px;
  border-radius: 4px;
}
.phase-card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.phase-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 800;
  color: #0f172a;
}
.phase-progress-val {
  font-size: 13px;
  font-weight: 800;
  color: #2563eb;
}
.phase-progress-bar-wrap {
  margin-top: -4px;
}
.phase-responsible {
  font-size: 11px;
  background: #f8fafc;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
  color: #334155;
}
.resp-label { color: #64748b; font-weight: 600; }
.phase-actions-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.actions-heading {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
}
.phase-action-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.phase-action-list li {
  font-size: 11.5px;
  color: #334155;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.act-dot {
  color: #2563eb;
  font-weight: bold;
}
.phase-criteria-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}
.criteria-box {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 11px;
}
.criteria-finish {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}
.criteria-finish .crit-label {
  color: #15803d;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}
.criteria-finish p {
  margin: 0;
  color: #166534;
  line-height: 1.4;
}
.criteria-next {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}
.criteria-next .crit-label {
  color: #1d4ed8;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}
.criteria-next p {
  margin: 0;
  color: #1e40af;
  line-height: 1.4;
}

/* 核心特色 2：自适应量化触发与切换规则样式 */
.trigger-rules-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 14px 18px 18px;
}
.trigger-rule-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 3px solid #94a3b8;
  transition: all 0.2s ease;
}
.trigger-rule-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}
.trigger-rule-card.tone-danger { border-top-color: #ef4444; }
.trigger-rule-card.tone-warning { border-top-color: #f59e0b; }
.trigger-rule-card.tone-primary { border-top-color: #3b82f6; }
.trigger-rule-card.tone-success { border-top-color: #10b981; }

.rule-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rule-code {
  font-family: var(--mid-font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  padding: 1px 5px;
  border-radius: 4px;
}
.rule-name {
  font-size: 12.5px;
  font-weight: 800;
  color: #0f172a;
}
.rule-threshold-box {
  background: #f8fafc;
  padding: 6px 8px;
  border-radius: 6px;
  border-left: 3px solid #2563eb;
  font-size: 11px;
}
.thresh-label { color: #64748b; font-size: 10px; }
.thresh-val { color: #1e293b; display: block; margin-top: 1px; }
.rule-action-desc {
  margin: 0;
  font-size: 11.5px;
  color: #334155;
  line-height: 1.5;
}
.rule-footer {
  margin-top: auto;
  padding-top: 6px;
  border-top: 1px dashed #e2e8f0;
  font-size: 10.5px;
  color: #64748b;
}

/* 核心特色 3：战情文书化调度令样式与公章水印 */
.dispatch-order-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 14px 18px 18px;
}

.dispatch-order-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease;
  border-left-width: 4px;
  position: relative;
  overflow: hidden;
}

.dispatch-order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dispatch-order-card.order-danger { border-left-color: #ef4444; }
.dispatch-order-card.order-warning { border-left-color: #f59e0b; }
.dispatch-order-card.order-primary { border-left-color: #3b82f6; }
.dispatch-order-card.order-success { border-left-color: #10b981; }

.doc-entities-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #334155;
  background: #f8fafc;
  padding: 6px 10px;
  border-radius: 6px;
}
.ent-label { color: #64748b; }
.doc-hash {
  font-family: var(--mid-font-mono, monospace);
  font-size: 9.5px;
  color: #94a3b8;
}

/* 官方红色印章水印设计 */
.stamp-watermark {
  position: absolute;
  right: 12px;
  bottom: 34px;
  width: 82px;
  height: 82px;
  border-radius: 50%;
  border: 2px dashed rgba(220, 38, 38, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-12deg);
  pointer-events: none;
  user-select: none;
}
.stamp-inner {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 1px solid rgba(220, 38, 38, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: rgba(220, 38, 38, 0.65);
}
.stamp-star {
  font-size: 11px;
  line-height: 1;
}
.stamp-title {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1.15;
  padding: 1px 4px;
}
.stamp-sub {
  font-size: 7.5px;
  font-weight: 700;
  margin-top: 1px;
}

/* 核心特色 4：大模型策略提示词与溯源案例 */
.copilot-body {
  display: grid;
  grid-template-columns: 1.25fr 0.75fr;
  gap: 14px;
  padding: 14px 18px 18px;
}
.copilot-prompt-card,
.copilot-benchmark-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.prompt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.prompt-header-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #0f172a;
}
.prompt-box {
  margin: 0;
  padding: 12px;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  font-family: var(--mid-font-mono, monospace);
  font-size: 11.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 220px;
  overflow-y: auto;
}
.benchmark-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #0f172a;
}
.benchmark-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.benchmark-item {
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.b-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #0f172a;
}
.b-org {
  font-size: 10.5px;
  color: #64748b;
}
.b-desc {
  margin: 0;
  font-size: 11px;
  color: #334155;
  line-height: 1.45;
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
.decision-evidence-grid { display: grid; gap: 12px; padding: 14px 16px 16px; }
.decision-evidence-card { padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
.decision-evidence-kicker { display: block; margin-bottom: 5px; color: #2563eb; font-size: 11px; font-weight: 700; letter-spacing: .04em; }
.decision-evidence-card > strong { display: block; color: #0f172a; font-size: 14px; line-height: 1.5; }
.decision-evidence-list { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.decision-evidence-list > div { display: flex; min-width: 0; flex-direction: column; gap: 5px; padding: 10px 12px; border-radius: 8px; background: #ffffff; }
.decision-evidence-list span { overflow: hidden; color: #64748b; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.decision-evidence-list b { color: #0f172a; font-size: 16px; line-height: 1.25; }
.decision-evidence-card > p { margin: 8px 0 0; color: #475569; font-size: 12px; line-height: 1.7; }
.decision-evidence-note { margin-top: 12px; padding: 8px 10px; border-left: 3px solid #f59e0b; color: #92400e; background: #fffbeb; font-size: 11px; line-height: 1.5; }
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
.recommendation-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.decision-output-lead { margin: 0 16px; padding: 14px 16px; border-left: 4px solid #2563eb; border-radius: 8px; background: #eff6ff; }
.decision-output-lead > span, .decision-output-subtitle { color: #64748b; font-size: 11px; font-weight: 700; }
.decision-output-lead > strong { display: block; margin-top: 4px; color: #1e3a8a; font-size: 17px; line-height: 1.45; }
.decision-output-lead > p { margin: 6px 0 0; color: #475569; font-size: 12px; line-height: 1.6; }
.decision-output-subtitle { margin: 14px 16px 0; color: #334155; }
.recommendation-card { display: flex; flex-direction: column; gap: 9px; min-height: 150px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
.recommendation-card__head, .recommendation-card__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.recommendation-index { color: #2563eb; font: 700 12px var(--mid-font-mono, monospace); }
.recommendation-card > strong { color: #0f172a; font-size: 13px; line-height: 1.5; }
.recommendation-card > p { flex: 1; margin: 0; color: #64748b; font-size: 11px; line-height: 1.65; }
.recommendation-card__foot { padding-top: 8px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; }
@media (max-width: 900px) { .recommendation-grid { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .decision-evidence-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .decision-evidence-list { grid-template-columns: 1fr; } }
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

/* 落地可行性与前置保障检查样式 */
.feasibility-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.feasibility-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.feasibility-card.passed {
  border-color: #bbf7d0;
  background: rgba(240, 253, 244, 0.6);
}
.feasibility-card.in_progress {
  border-color: #fed7aa;
  background: rgba(255, 247, 237, 0.6);
}
.feasibility-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.feasibility-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
}
.feasibility-tag.passed {
  background: #dcfce7;
  color: #15803d;
}
.feasibility-tag.in_progress {
  background: #ffedd5;
  color: #c2410c;
}
.feasibility-dept {
  font-size: 11px;
  color: #64748b;
}
.feasibility-title {
  font-size: 13px;
  color: #0f172a;
  font-weight: 700;
}
.feasibility-detail {
  font-size: 11.5px;
  color: #475569;
  line-height: 1.5;
  margin: 0;
}
.feasibility-meta {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: #94a3b8;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed #e2e8f0;
}

@media (max-width: 900px) {
  .feasibility-grid {
    grid-template-columns: 1fr;
  }
}

/* 顶部核心业务问题导引条 */
.decision-core-question-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  margin-bottom: 10px;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(240, 253, 250, 0.95));
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.05);
}
.decision-core-question-strip .core-question-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
  letter-spacing: 0.5px;
}
.decision-core-question-strip .core-question-text {
  flex: 1;
  min-width: 0;
}
.decision-core-question-strip .core-question-text strong {
  display: block;
  font-size: 12.5px;
  color: #1e3a8a;
  margin-bottom: 2px;
}
.decision-core-question-strip .core-question-text p {
  margin: 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.4;
}
</style>
