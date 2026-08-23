<template>
  <div class="gt-page analysis-workspace legacy-analysis-page">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="tl-left">
        <span class="page-title">博弈论分析</span>
        <div class="page-sub-row">
          <span class="page-sub">供应链销售商 × 制造商策略博弈与纳什均衡</span>
          <el-tag size="small" effect="plain" class="scenario-tag">{{ scenarioTagText }}</el-tag>
        </div>
      </div>
      <div class="tl-right">
        <span v-if="sessionId" class="session-badge" :title="sessionId">会话 {{ sessionIdShort }}</span>
        <el-button type="primary" size="small" :loading="loading" @click="reload">
          <el-icon><Refresh /></el-icon> 重新分析
        </el-button>
      </div>
    </div>

    <div v-if="loading" class="loading-block">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在加载博弈论分析…</span>
    </div>

    <div v-else-if="!hasData" class="empty-block">
      <el-empty :image-size="72" description="暂无博弈论分析数据，请先完成实验" />
      <el-button type="primary" plain @click="$router.push('/home/SCnet/experimentManager')">前往实验运行</el-button>
    </div>

    <div v-else class="view-panel">
      <!-- 参与方与策略空间 -->
      <el-card shadow="never" class="custom-card">
        <template #header>
          <div class="card-header">
            <span class="title-with-icon"><el-icon><TrendCharts /></el-icon> 参与方与策略空间</span>
            <span class="header-desc">鼠标悬停查看收益矩阵对应行列</span>
          </div>
        </template>
        <el-row :gutter="24">
          <el-col :span="12">
            <div class="player-card retailer">
              <div class="player-title">🛒 {{ retailer.label }} (Player 1)</div>
              <div class="strategy-list">
                <div
                  v-for="(s, i) in retailerStrategies"
                  :key="'r-' + i"
                  class="strategy-item"
                  :class="{ 'active-strategy-retailer': hoverRow === i }"
                  @mouseenter="hoverRow = i"
                  @mouseleave="hoverRow = null"
                >
                  <el-tag effect="dark" :color="hoverRow === i ? '#1d4ed8' : '#3b82f6'" style="border:none">{{ s.id }}</el-tag>
                  <div class="strategy-info">
                    <div class="strategy-name">{{ s.name }}</div>
                    <div class="strategy-desc">{{ s.desc }}</div>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="player-card manufacturer">
              <div class="player-title">🏭 {{ manufacturer.label }} (Player 2)</div>
              <div class="strategy-list">
                <div
                  v-for="(s, j) in manufacturerStrategies"
                  :key="'m-' + j"
                  class="strategy-item"
                  :class="{ 'active-strategy-manufacturer': hoverCol === j }"
                  @mouseenter="hoverCol = j"
                  @mouseleave="hoverCol = null"
                >
                  <el-tag effect="dark" :color="hoverCol === j ? '#b91c1c' : '#f97316'" style="border:none">{{ s.id }}</el-tag>
                  <div class="strategy-info">
                    <div class="strategy-name">{{ s.name }}</div>
                    <div class="strategy-desc">{{ s.desc }}</div>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 收益矩阵 + 纳什均衡 -->
      <el-row :gutter="20" class="mt-4">
        <el-col :span="15">
          <el-card shadow="never" class="custom-card matrix-card">
            <template #header>
              <div class="card-header">
                <span class="title-with-icon"><el-icon><Grid /></el-icon> 收益矩阵 (Payoff Matrix)</span>
                <span class="header-desc">单元格格式：销售商收益 / 制造商收益</span>
              </div>
            </template>
            <div class="table-wrapper">
              <table class="payoff-table">
                <thead>
                  <tr>
                    <th class="empty-cell">
                      <div class="diagonal-label">
                        <span class="p2-label">{{ manufacturer.shortLabel }}</span>
                        <span class="p1-label">{{ retailer.shortLabel }}</span>
                      </div>
                    </th>
                    <th
                      v-for="(m, j) in manufacturerStrategies"
                      :key="'m-th-' + j"
                      :class="{ 'hover-highlight': hoverCol === j }"
                      @mouseenter="hoverCol = j"
                      @mouseleave="hoverCol = null"
                    >
                      {{ m.name }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in retailerStrategies" :key="'r-tr-' + i">
                    <th
                      :class="{ 'hover-highlight': hoverRow === i }"
                      @mouseenter="hoverRow = i"
                      @mouseleave="hoverRow = null"
                    >
                      {{ r.name }}
                    </th>
                    <td
                      v-for="(m, j) in manufacturerStrategies"
                      :key="'cell-' + i + '-' + j"
                      :class="{
                        'nash-cell': isNash(i, j),
                        'hover-cell': hoverRow === i || hoverCol === j
                      }"
                      @mouseenter="hoverRow = i; hoverCol = j"
                      @mouseleave="hoverRow = null; hoverCol = null"
                    >
                      <div class="cell-value">
                        <span class="p1-payoff">{{ formatPayoff(payoffMatrix[i]?.[j]?.p1) }}</span>
                        <span class="payoff-sep">/</span>
                        <span class="p2-payoff">{{ formatPayoff(payoffMatrix[i]?.[j]?.p2) }}</span>
                      </div>
                      <div v-if="isNash(i, j)" class="nash-badge">⭐ 纳什均衡</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </el-card>
        </el-col>
        <el-col :span="9">
          <el-card shadow="never" class="custom-card equilibrium-card">
            <template #header>
              <div class="card-header">
                <span class="title-with-icon"><el-icon><Aim /></el-icon> 纳什均衡分析</span>
              </div>
            </template>
            <div v-if="nashEquilibria.length === 0" class="no-nash">未识别到纯策略纳什均衡，可能存在混合策略均衡。</div>
            <div v-else>
              <div v-for="(eq, idx) in nashEquilibria" :key="idx" class="nash-item">
                <div class="nash-title">均衡 {{ idx + 1 }}</div>
                <div class="nash-content">
                  <div><strong>{{ retailer.label }}</strong>：{{ retailerStrategies[eq.row]?.name }}</div>
                  <div><strong>{{ manufacturer.label }}</strong>：{{ manufacturerStrategies[eq.col]?.name }}</div>
                  <div class="nash-payoff">
                    收益：销售商 {{ formatPayoff(eq.p1) }} ／ 制造商 {{ formatPayoff(eq.p2) }}
                  </div>
                  <div v-if="eq.rationale" class="nash-rationale">{{ eq.rationale }}</div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 整体结论 -->
      <el-card v-if="overallConclusion" shadow="never" class="custom-card mt-4">
        <template #header>
          <div class="card-header">
            <span class="title-with-icon"><el-icon><DataAnalysis /></el-icon> 整体博弈结论</span>
          </div>
        </template>
        <div class="conclusion-text">{{ overallConclusion }}</div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, TrendCharts, Grid, Aim, Loading, DataAnalysis } from '@element-plus/icons-vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { getGameTheoryBySession } from '@/api/decisionAnalysis'
import { unwrapApiData } from '@/utils/apiEnvelope'

const store = useSupplyChainStore()

const loading = ref(false)
const retailer = ref({ label: '销售商', shortLabel: '销售商' })
const manufacturer = ref({ label: '制造商', shortLabel: '制造商' })
const retailerStrategies = ref([])
const manufacturerStrategies = ref([])
const payoffMatrix = ref([])
const nashEquilibria = ref([])
const overallConclusion = ref('')
const experimentId = ref('')

const hoverRow = ref(null)
const hoverCol = ref(null)

const sessionId = computed(() => store.currentSessionId || localStorage.getItem('sc_currentSessionId') || '')
const sessionIdShort = computed(() => {
  const sid = sessionId.value
  return sid ? sid.slice(-8) : ''
})
const scenarioTagText = computed(() => experimentId.value ? `实验 ${experimentId.value}` : '默认博弈空间')
const hasData = computed(() => payoffMatrix.value.length > 0 && retailerStrategies.value.length > 0)

function formatPayoff(val) {
  if (val === undefined || val === null) return '—'
  return Number(val).toFixed(1)
}

function isNash(i, j) {
  return nashEquilibria.value.some(eq => eq.row === i && eq.col === j)
}

// 兜底默认博弈空间：当后端没有实验数据时使用
function applyDefaultGame() {
  retailerStrategies.value = [
    { id: 'R1', name: '激进促销', desc: '低价快销，靠规模冲击订单完成率，但库存压力大' },
    { id: 'R2', name: '平稳定价', desc: '维持参考价位，跟随市场节奏，求稳' },
    { id: 'R3', name: '保守提价', desc: '上调零售价保护利润率，可能丢失部分订单' }
  ]
  manufacturerStrategies.value = [
    { id: 'M1', name: '扩产', desc: '加大产能，下游订单接得多但有过剩风险' },
    { id: 'M2', name: '维持', desc: '产能与历史均值持平' },
    { id: 'M3', name: '收缩', desc: '减少产能，控制成本但可能错失需求高峰' }
  ]
  payoffMatrix.value = [
    [
      { p1: 6, p2: 5, rationale: '销售激进 × 制造扩产：订单完成率高，双方都拿到利润，但库存敏感' },
      { p1: 4, p2: 3, rationale: '销售激进 × 制造维持：上游产能跟不上，订单部分流失' },
      { p1: -2, p2: -1, rationale: '销售激进 × 制造收缩：双输，库存严重不足' }
    ],
    [
      { p1: 3, p2: 6, rationale: '销售平稳 × 制造扩产：制造方堆库存，销售吃不下' },
      { p1: 5, p2: 5, rationale: '销售平稳 × 制造维持：经典稳态' },
      { p1: 2, p2: 3, rationale: '销售平稳 × 制造收缩：略偏紧，但能维持' }
    ],
    [
      { p1: 1, p2: 4, rationale: '销售保守 × 制造扩产：制造方过剩' },
      { p1: 4, p2: 2, rationale: '销售保守 × 制造维持：销售利润率高但量少' },
      { p1: 3, p2: 4, rationale: '销售保守 × 制造收缩：协同收缩，双方稳健盈利' }
    ]
  ]
  nashEquilibria.value = [
    { row: 1, col: 1, p1: 5, p2: 5, rationale: '稳态均衡：双方都没有单方面偏离动力' }
  ]
  overallConclusion.value = '默认博弈空间下，平稳定价 × 维持产能是稳态纳什均衡；激进促销与扩产虽然短期收益高，但对协同与库存压力极敏感。'
  experimentId.value = ''
}

async function loadGameTheory() {
  const sid = sessionId.value
  if (!sid) {
    applyDefaultGame()
    return
  }
  loading.value = true
  try {
    const response = await getGameTheoryBySession(sid)
    const data = unwrapApiData(response)
    if (data && Array.isArray(data.payoff_matrix) && data.payoff_matrix.length > 0) {
      if (data.players?.player1) {
        retailer.value = {
          label: data.players.player1.label || '销售商',
          shortLabel: data.players.player1.shortLabel || data.players.player1.label || '销售商'
        }
      }
      if (data.players?.player2) {
        manufacturer.value = {
          label: data.players.player2.label || '制造商',
          shortLabel: data.players.player2.shortLabel || data.players.player2.label || '制造商'
        }
      }
      retailerStrategies.value = Array.isArray(data.player1_strategies) ? data.player1_strategies : []
      manufacturerStrategies.value = Array.isArray(data.player2_strategies) ? data.player2_strategies : []
      payoffMatrix.value = data.payoff_matrix
      nashEquilibria.value = Array.isArray(data.nash_equilibria) ? data.nash_equilibria : []
      overallConclusion.value = data.overall_conclusion || ''
      experimentId.value = data.experiment_id || ''
    } else {
      // 后端无数据：用默认博弈空间兜底
      applyDefaultGame()
    }
  } catch (e) {
    console.warn('[GameTheory] getGameTheoryBySession failed:', e?.message || e)
    ElMessage.warning('后端暂未返回博弈数据，已展示默认博弈空间')
    applyDefaultGame()
  } finally {
    loading.value = false
  }
}

function reload() {
  loadGameTheory()
}

onMounted(() => {
  loadGameTheory()
})
</script>

<style scoped>
.gt-page {
  box-sizing: border-box;
  padding: 16px 20px 32px;
  background: #f5f7fa;
  min-height: 100%;
  height: auto;
  overflow: visible;
}

.toolbar {
  background: #fff;
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
}

.tl-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.page-sub-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-sub {
  font-size: 12px;
  color: #64748b;
}

.scenario-tag {
  font-size: 11px;
}

.tl-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.session-badge {
  font-size: 12px;
  color: #475569;
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 999px;
}

.loading-block,
.empty-block {
  background: #fff;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #64748b;
}

.loading-block .el-icon {
  font-size: 28px;
  color: #3b82f6;
}

.custom-card {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: #0f172a;
  font-size: 14px;
}

.header-desc {
  font-size: 11px;
  color: #94a3b8;
}

.player-card {
  border-radius: 10px;
  padding: 14px;
  background: linear-gradient(135deg, #f8fafc, #ffffff);
  border: 1px solid #e2e8f0;
  height: 100%;
}

.player-card.retailer {
  border-color: #bfdbfe;
  background: linear-gradient(135deg, #eff6ff, #ffffff);
}

.player-card.manufacturer {
  border-color: #fed7aa;
  background: linear-gradient(135deg, #fff7ed, #ffffff);
}

.player-title {
  font-weight: 700;
  font-size: 14px;
  color: #1e293b;
  margin-bottom: 10px;
}

.strategy-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strategy-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
}

.strategy-item.active-strategy-retailer {
  border-color: #3b82f6;
  background: #eff6ff;
}

.strategy-item.active-strategy-manufacturer {
  border-color: #f97316;
  background: #fff7ed;
}

.strategy-info {
  flex: 1;
}

.strategy-name {
  font-weight: 600;
  font-size: 13px;
  color: #1e293b;
}

.strategy-desc {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.mt-4 {
  margin-top: 16px;
}

.matrix-card {
  height: 100%;
}

.table-wrapper {
  overflow: auto;
}

.payoff-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.payoff-table th,
.payoff-table td {
  padding: 12px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.payoff-table thead th {
  background: #f8fafc;
  color: #334155;
  font-weight: 600;
}

.payoff-table tbody th {
  background: #f1f5f9;
  font-weight: 600;
  text-align: right;
  color: #1e293b;
  width: 130px;
}

.payoff-table td {
  background: #fff;
  position: relative;
}

.hover-highlight {
  background: #fef3c7 !important;
}

.hover-cell {
  background: #fefce8 !important;
}

.nash-cell {
  background: #ecfdf5 !important;
  border-color: #10b981 !important;
  font-weight: 700;
}

.cell-value {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.p1-payoff {
  color: #3b82f6;
  font-weight: 700;
}

.p2-payoff {
  color: #f97316;
  font-weight: 700;
}

.payoff-sep {
  color: #94a3b8;
}

.nash-badge {
  margin-top: 6px;
  font-size: 11px;
  color: #059669;
  font-weight: 600;
}

.empty-cell {
  background: #f1f5f9;
}

.diagonal-label {
  position: relative;
  height: 40px;
}

.p1-label {
  position: absolute;
  bottom: 4px;
  left: 4px;
  font-size: 11px;
  color: #3b82f6;
}

.p2-label {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 11px;
  color: #f97316;
}

.equilibrium-card {
  height: 100%;
}

.no-nash {
  color: #94a3b8;
  font-size: 13px;
  padding: 20px;
  text-align: center;
}

.nash-item {
  padding: 12px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ecfdf5, #ffffff);
  border: 1px solid #a7f3d0;
  margin-bottom: 12px;
}

.nash-title {
  font-weight: 700;
  color: #059669;
  margin-bottom: 8px;
}

.nash-content {
  font-size: 13px;
  color: #1e293b;
  line-height: 1.8;
}

.nash-payoff {
  margin-top: 6px;
  font-size: 12px;
  color: #475569;
}

.nash-rationale {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
  font-style: italic;
}

.conclusion-text {
  color: #334155;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-line;
}
</style>
