<template>
  <div class="rv-root">
    <h2 class="rv-title">📋 态势预测结果验证 — {{ scenarioLabel }}</h2>
    <p class="rv-subtitle">
      基于历史拟合度 + 预测稳健性双维度交叉检验，GPR模型自动评估
      <span v-if="!gprAvailable" style="color:#E6A23C;margin-left:8px;">⚠ GPR不可用，使用线性回归回退</span>
    </p>

    <!-- ══ 加载中 ══ -->
    <div v-if="loading" class="rv-loading">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- ══ 加载失败 ══ -->
    <div v-else-if="error" class="rv-error">
      <el-result icon="error" title="验证数据加载失败" :sub-title="error">
        <template #extra><el-button type="primary" @click="fetchData">重新加载</el-button></template>
      </el-result>
    </div>

    <template v-else>
      <!-- ══ 总体可信度仪表盘 ══ -->
      <div class="rv-dashboard">
        <div class="rv-gauge-card">
          <div class="rv-gauge-label">综合可信度</div>
          <div class="rv-gauge-ring">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e8eaf6" stroke-width="8"/>
              <circle cx="60" cy="60" r="52" fill="none" :stroke="scoreColor"
                stroke-width="8" stroke-linecap="round"
                :stroke-dasharray="326.7"
                :stroke-dashoffset="326.7 * (1 - overallScore / 100)"
                transform="rotate(-90,60,60)"
                style="transition: stroke-dashoffset 1s ease;"/>
            </svg>
            <span class="rv-gauge-num" :style="{color:scoreColor}">{{ overallScore }}%</span>
          </div>
          <el-tag :type="levelTag" size="large" style="margin-top:8px;">{{ credibilityLevel }}</el-tag>
        </div>

        <div class="rv-metrics">
          <!-- 维度一：历史拟合度 -->
          <div class="rv-metric-card rv-dim-card">
            <div class="rv-metric-icon">📐</div>
            <div class="rv-metric-num" :style="{color: dimColor(histFit.score)}">{{ histFit.score }}%</div>
            <div class="rv-metric-label">{{ histFit.label }}</div>
            <div class="rv-dim-desc">{{ histFit.description }}</div>
          </div>
          <!-- 维度二：预测稳健性 -->
          <div class="rv-metric-card rv-dim-card">
            <div class="rv-metric-icon">🛡️</div>
            <div class="rv-metric-num" :style="{color: dimColor(predRobust.score)}">{{ predRobust.score }}%</div>
            <div class="rv-metric-label">{{ predRobust.label }}</div>
            <div class="rv-dim-desc">{{ predRobust.description }}</div>
          </div>
          <!-- 数据点 -->
          <div class="rv-metric-card">
            <div class="rv-metric-icon">📊</div>
            <div class="rv-metric-num">{{ dataPoints }}</div>
            <div class="rv-metric-label">历史数据(月)</div>
          </div>
          <!-- GPR状态 -->
          <div class="rv-metric-card">
            <div class="rv-metric-icon">🧠</div>
            <div class="rv-metric-num" :style="{color: gprAvailable ? '#67C23A' : '#E6A23C'}">{{ gprAvailable ? 'GPR' : 'LR' }}</div>
            <div class="rv-metric-label">预测引擎</div>
          </div>
        </div>
      </div>

      <!-- ══ 维度一：历史拟合度 ══ -->
      <div class="rv-section">
        <h3>📐 维度一：历史拟合度 (权重50%)</h3>

        <!-- K折交叉验证 -->
        <h4 class="rv-sub-h">🔬 K折GPR交叉验证 — R²决定系数</h4>
        <p class="rv-method-desc">把数据平均分成 {{ cvFolds }} 份，每次留1份做测试集，用其余训练GPR去预测它。R²接近1说明模型抓住了数据规律。</p>
        <div v-if="cvError" class="rv-warn">{{ cvError }}</div>
        <template v-else>
          <div class="rv-score-row">
            <span class="rv-score-label">交叉验证得分</span>
            <span class="rv-score-val" :style="{color: dimColor(cvScore)}">{{ cvScore }}分</span>
            <span class="rv-score-label2">R²均值: {{ cvR2Mean }}</span>
          </div>
          <el-table :data="cvFoldsData" stripe size="small">
            <el-table-column prop="fold" label="折次" width="70" />
            <el-table-column prop="train_size" label="训练集(月)" width="100" />
            <el-table-column prop="test_size" label="测试集(月)" width="100" />
            <el-table-column prop="r2" label="R²" width="100">
              <template #default="{row}">
                <span :style="{color: r2Color(row.r2), fontWeight:'bold'}">{{ row.r2 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="test_range" label="测试范围" />
          </el-table>
          <p class="rv-verdict">{{ cvInterpretation }}</p>
        </template>

        <!-- 残差白噪声检验 -->
        <h4 class="rv-sub-h" style="margin-top:20px;">🔊 残差白噪声检验 — Durbin-Watson + ACF</h4>
        <p class="rv-method-desc">好的预测应把数据信号全部提取，残差应为纯随机白噪声。DW≈2说明无自相关，前3阶ACF≈0证实白噪声。</p>
        <div v-if="residError" class="rv-warn">{{ residError }}</div>
        <template v-else>
          <div class="rv-score-row">
            <span class="rv-score-label">白噪声得分</span>
            <span class="rv-score-val" :style="{color: dimColor(residScore)}">{{ residScore }}分</span>
          </div>
          <el-table :data="residTableData" stripe size="small">
            <el-table-column prop="item" label="检验项" width="160" />
            <el-table-column prop="value" label="数值" width="120" />
            <el-table-column prop="interpretation" label="解读" />
          </el-table>
          <p class="rv-verdict" :style="{color: residPassed ? '#67C23A' : '#E6A23C'}">{{ residVerdict }}</p>
        </template>
      </div>

      <!-- ══ 维度二：预测稳健性 ══ -->
      <div class="rv-section">
        <h3>🛡️ 维度二：预测稳健性 (权重50%)</h3>

        <!-- PICP区间覆盖率 -->
        <h4 class="rv-sub-h">🎯 PICP区间覆盖率 — 95%置信区间验证</h4>
        <p class="rv-method-desc">用前N-{{ picpTestMonths }}个月训练GPR，预测最后{{ picpTestMonths }}个月并构建95% CI（预测值±1.96σ）。约95%实际值在区间内说明置信区间设置合理。</p>
        <div v-if="picpError" class="rv-warn">{{ picpError }}</div>
        <template v-else>
          <div class="rv-score-row">
            <span class="rv-score-label">PICP得分</span>
            <span class="rv-score-val" :style="{color: dimColor(picpScore)}">{{ picpScore }}分</span>
            <span class="rv-score-label2">覆盖率 {{ picpValue }}% / 目标 95%</span>
          </div>
          <div class="rv-picp-bar-wrap">
            <div class="rv-picp-bar">
              <div class="rv-picp-fill" :style="{width: picpValue+'%', background: picpBarColor}"></div>
            </div>
            <span class="rv-picp-target" :style="{left:'95%'}">▾ 95%</span>
          </div>
          <div class="rv-picp-stats">
            <span>{{ picpCovered }}/{{ picpTotal }} 个实际值落入区间</span>
            <span>预测区间: {{ picpRange }}</span>
          </div>
          <p class="rv-verdict">{{ picpInterpretation }}</p>
        </template>

        <!-- 多模型一致性 -->
        <h4 class="rv-sub-h" style="margin-top:20px;">🤖 多模型一致性 — GPR / LSTM / Prophet</h4>
        <p class="rv-method-desc">单个模型可能"蒙对"，但三个不同模型如果都说涨，可信度就高。LSTM和Prophet基于GPR斜率偏移模拟。</p>
        <div v-if="consensusError" class="rv-warn">{{ consensusError }}</div>
        <template v-else>
          <div class="rv-score-row">
            <span class="rv-score-label">一致性得分</span>
            <span class="rv-score-val" :style="{color: dimColor(consensusScore)}">{{ consensusScore }}分</span>
            <el-tag :type="consensusAgreement === 3 ? 'success' : consensusAgreement === 2 ? 'warning' : 'danger'" size="small" style="margin-left:12px;">{{ consensusLabel }}</el-tag>
          </div>
          <el-table :data="consensusModels" stripe size="small">
            <el-table-column prop="name" label="模型" width="120" />
            <el-table-column prop="description" label="说明" min-width="180" />
            <el-table-column prop="slope" label="趋势斜率" width="110">
              <template #default="{row}"><code>{{ row.slope }}</code></template>
            </el-table-column>
            <el-table-column prop="direction" label="方向" width="110">
              <template #default="{row}">{{ row.direction }}</template>
            </el-table-column>
          </el-table>
          <p class="rv-verdict">{{ consensusInterpretation }}</p>
        </template>
      </div>

      <!-- ══ 权重公式 ══ -->
      <div class="rv-section rv-formula">
        <h3>⚖️ 综合可信度计算公式</h3>
        <div class="rv-formula-box">
          <code>综合可信度 = (K折CV×0.30) + (残差白噪声×0.20) + (PICP覆盖率×0.25) + (多模型一致性×0.25)</code>
          <div class="rv-formula-detail">
            <span>历史拟合度 50% = 交叉验证(30%) + 残差检验(20%)</span>
            <span>预测稳健性 50% = PICP(25%) + 一致性(25%)</span>
          </div>
        </div>
        <div class="rv-levels">
          <el-tag type="success" size="large">≥80% 高可信</el-tag>
          <el-tag type="warning" size="large">60-80% 存疑</el-tag>
          <el-tag type="danger" size="large">&lt;60% 低信</el-tag>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getVerificationAll } from '@/api/predictionVerification'

const props = defineProps({
  scenario: { type: String, default: 'uranium' }
})

// ── 场景标签 ──
const scenarioLabel = computed(() => props.scenario === 'uranium' ? '铀供应链' : '汽车供应链')

// ── 状态 ──
const loading = ref(true)
const error = ref('')

// ── 综合 ──
const overallScore = ref(0)
const credibilityLevel = ref('')
const gprAvailable = ref(true)
const dataPoints = ref(0)

// ── 维度 ──
const histFit = ref({ score: 0, label: '历史拟合度', description: '' })
const predRobust = ref({ score: 0, label: '预测稳健性', description: '' })

// ── 交叉验证 ──
const cvError = ref('')
const cvScore = ref(0)
const cvR2Mean = ref(0)
const cvFolds = ref(0)
const cvFoldsData = ref([])
const cvInterpretation = ref('')

// ── 残差检验 ──
const residError = ref('')
const residScore = ref(0)
const residTableData = ref([])
const residPassed = ref(false)
const residVerdict = ref('')

// ── PICP ──
const picpError = ref('')
const picpScore = ref(0)
const picpValue = ref(0)
const picpTestMonths = ref(6)
const picpCovered = ref(0)
const picpTotal = ref(0)
const picpRange = ref('')
const picpInterpretation = ref('')

// ── 一致性 ──
const consensusError = ref('')
const consensusScore = ref(0)
const consensusAgreement = ref(0)
const consensusLabel = ref('')
const consensusModels = ref([])
const consensusInterpretation = ref('')

// ── 颜色辅助 ──
const scoreColor = computed(() =>
  overallScore.value >= 80 ? '#67C23A' : overallScore.value >= 60 ? '#E6A23C' : '#F56C6C'
)
const levelTag = computed(() =>
  overallScore.value >= 80 ? 'success' : overallScore.value >= 60 ? 'warning' : 'danger'
)

const dimColor = (s) => s >= 80 ? '#67C23A' : s >= 60 ? '#E6A23C' : '#F56C6C'
const r2Color = (r2) => r2 >= 0.7 ? '#67C23A' : r2 >= 0.5 ? '#E6A23C' : r2 >= 0.3 ? '#E6A23C' : '#F56C6C'

const picpBarColor = computed(() => {
  const v = picpValue.value
  if (v >= 90 && v <= 98) return '#67C23A'
  if (v >= 80 && v < 90) return '#E6A23C'
  return '#F56C6C'
})

// ── 数据获取 ──
async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await getVerificationAll({ scenario: props.scenario, metric: 'order_count' })
    if (!res || !res.success) {
      error.value = (res && res.message) || '后端返回异常'
      return
    }
    const d = res.data

    // 综合
    overallScore.value = d.overall_credibility || 0
    credibilityLevel.value = d.credibility_level || ''
    gprAvailable.value = d.gpr_available !== false
    dataPoints.value = d.data_points || 0

    // 维度
    if (d.dimensions) {
      const hf = d.dimensions.historical_fit
      if (hf) {
        histFit.value = { score: hf.score || 0, label: hf.label || '历史拟合度', description: hf.description || '' }

        // 交叉验证
        const cv = hf.methods?.cross_validation
        if (cv) {
          if (cv.error) {
            cvError.value = cv.error
          } else {
            cvScore.value = cv.score || 0
            cvR2Mean.value = cv.cv_r2_mean
            cvFolds.value = (cv.folds || []).length
            cvFoldsData.value = cv.folds || []
            cvInterpretation.value = cv.interpretation || ''
          }
        }

        // 残差检验
        const rs = hf.methods?.residual_white_noise
        if (rs) {
          if (rs.error) {
            residError.value = rs.error
          } else {
            residScore.value = rs.score || 0
            residPassed.value = rs.is_white_noise
            residVerdict.value = rs.verdict || ''
            residTableData.value = [
              { item: 'Durbin-Watson统计量', value: rs.durbin_watson, interpretation: rs.dw_interpretation || '' },
              { item: 'ACF(1阶)', value: (rs.acf_lags_1_3 || [])[0] ?? '-', interpretation: '' },
              { item: 'ACF(2阶)', value: (rs.acf_lags_1_3 || [])[1] ?? '-', interpretation: '' },
              { item: 'ACF(3阶)', value: (rs.acf_lags_1_3 || [])[2] ?? '-', interpretation: '|ACF|<0.3 通过白噪声检验' },
            ]
          }
        }
      }

      const pr = d.dimensions?.prediction_robustness
      if (pr) {
        predRobust.value = { score: pr.score || 0, label: pr.label || '预测稳健性', description: pr.description || '' }

        // PICP
        const pp = pr.methods?.picp_coverage
        if (pp) {
          if (pp.error) {
            picpError.value = pp.error
          } else {
            picpScore.value = pp.score || 0
            picpValue.value = pp.picp || 0
            picpTestMonths.value = pp.test_months || 6
            picpCovered.value = pp.covered || 0
            picpTotal.value = pp.total || 0
            picpRange.value = pp.forecast_range || ''
            picpInterpretation.value = pp.interpretation || ''
          }
        }

        // 一致性
        const mc = pr.methods?.model_consensus
        if (mc) {
          if (mc.error) {
            consensusError.value = mc.error
          } else {
            consensusScore.value = mc.score || 0
            consensusAgreement.value = mc.agreement_count || 0
            consensusLabel.value = mc.consensus || ''
            consensusInterpretation.value = mc.interpretation || ''
            const models = mc.models
            if (models) {
              consensusModels.value = [
                { name: 'GPR (主模型)', description: models.GPR?.description || '', slope: models.GPR?.slope, direction: models.GPR?.direction },
                { name: 'LSTM (模拟)', description: models.LSTM?.description || '', slope: models.LSTM?.slope, direction: models.LSTM?.direction },
                { name: 'Prophet (模拟)', description: models.Prophet?.description || '', slope: models.Prophet?.slope, direction: models.Prophet?.direction },
              ]
            }
          }
        }
      }
    }
  } catch (e) {
    error.value = e.message || '网络请求失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.rv-root { padding: 1.5rem 2rem; height: calc(100vh - 60px); overflow-y: auto; background: #f5f7fa; }
.rv-title { font-size: 20px; font-weight: 700; color: #303133; margin: 0 0 4px; }
.rv-subtitle { font-size: 13px; color: #909399; margin: 0 0 20px; }

.rv-loading, .rv-error { background: #fff; border-radius: 10px; padding: 40px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.rv-warn { color: #E6A23C; background: #fdf6ec; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 10px; }

/* ── 仪表盘 ── */
.rv-dashboard { display: flex; gap: 24px; margin-bottom: 24px; align-items: stretch; }
.rv-gauge-card { text-align: center; background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); display:flex; flex-direction:column; align-items:center; }
.rv-gauge-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.rv-gauge-ring { position: relative; width: 120px; height: 120px; margin: 0 auto; }
.rv-gauge-ring svg { width: 100%; height: 100%; }
.rv-gauge-num { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 28px; font-weight: 800; }

.rv-metrics { display: flex; gap: 16px; flex: 1; flex-wrap: wrap; }
.rv-metric-card { flex: 1; min-width: 140px; background: #fff; border-radius: 10px; padding: 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.rv-metric-icon { font-size: 24px; margin-bottom: 6px; }
.rv-metric-num { font-size: 22px; font-weight: 700; color: #303133; }
.rv-metric-label { font-size: 12px; color: #909399; margin-top: 4px; font-weight: 600; }
.rv-dim-desc { font-size: 11px; color: #b0b0b0; margin-top: 4px; line-height: 1.3; }

/* ── 章节 ── */
.rv-section { background: #fff; border-radius: 10px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.rv-section h3 { font-size: 16px; font-weight: 600; color: #303133; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 2px solid #f0f0f0; }
.rv-sub-h { font-size: 14px; font-weight: 600; color: #606266; margin: 0 0 6px; }
.rv-method-desc { font-size: 12px; color: #909399; margin: 0 0 12px; line-height: 1.5; }

.rv-score-row { display: flex; align-items: center; margin-bottom: 10px; gap: 8px; }
.rv-score-label { font-size: 12px; color: #909399; }
.rv-score-label2 { font-size: 12px; color: #606266; margin-left: 8px; }
.rv-score-val { font-size: 22px; font-weight: 800; }

.rv-verdict { font-size: 13px; color: #606266; margin-top: 8px; padding: 8px 12px; background: #f5f7fa; border-radius: 6px; }

/* ── PICP进度条 ── */
.rv-picp-bar-wrap { position: relative; margin: 12px 0 8px; padding-right: 28px; }
.rv-picp-bar { height: 10px; background: #e8eaf6; border-radius: 5px; overflow: hidden; }
.rv-picp-fill { height: 100%; border-radius: 5px; transition: width 1s ease; }
.rv-picp-target { position: absolute; top: -18px; font-size: 11px; color: #409EFF; font-weight: 600; transform: translateX(-50%); }
.rv-picp-stats { display: flex; gap: 20px; font-size: 12px; color: #909399; }

/* ── 公式 ── */
.rv-formula-box { background: #f5f7fa; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.rv-formula-box code { font-size: 13px; color: #303133; display: block; margin-bottom: 8px; }
.rv-formula-detail { display: flex; gap: 20px; font-size: 12px; color: #909399; }
.rv-levels { display: flex; gap: 12px; margin-top: 12px; }
</style>
