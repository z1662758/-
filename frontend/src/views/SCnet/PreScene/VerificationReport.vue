<template>
  <div class="vr-root" v-loading="loading">
    <!-- 加载中 -->
    <div v-if="loading" class="vr-loading">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="vr-error">
      <el-result icon="error" title="验证报告加载失败" :sub-title="error">
        <template #extra><el-button type="primary" @click="fetchData">重新加载</el-button></template>
      </el-result>
    </div>

    <template v-else-if="report">
      <!-- 头部信息 -->
      <div class="vr-header">
        <div class="vr-header-title">{{ report.pageLabel }} · {{ report.scenarioLabel }}</div>
        <div class="vr-header-sub">结论可信度验证报告</div>
      </div>

      <!-- ══ 可信度仪表盘 ══ -->
      <div class="vr-cred">
        <div class="vr-gauge">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e8eaf6" stroke-width="8"/>
            <circle cx="60" cy="60" r="52" fill="none" :stroke="scoreColor"
              stroke-width="8" stroke-linecap="round"
              :stroke-dasharray="326.7"
              :stroke-dashoffset="326.7 * (1 - report.credibility.score / 100)"
              transform="rotate(-90,60,60)"
              style="transition: stroke-dashoffset 1s ease;"/>
          </svg>
          <span class="vr-gauge-num" :style="{color:scoreColor}">{{ report.credibility.score }}%</span>
        </div>
        <div class="vr-cred-info">
          <el-tag :type="levelTag" size="large">{{ report.credibility.level }}</el-tag>
          <p class="vr-cred-summary">{{ report.credibility.summary }}</p>
        </div>
      </div>

      <!-- ══ 验证方法 ══ -->
      <div class="vr-section">
        <h3 class="vr-sec-title">🔬 验证方法</h3>
        <div v-for="m in report.verificationMethods" :key="m.name" class="vr-method-card">
          <div class="vr-method-card-head">
            <span class="vr-method-card-name">{{ m.name }}</span>
            <el-tag size="small" type="info">{{ m.purpose }}</el-tag>
          </div>
          <div class="vr-method-card-detail">{{ m.detail }}</div>
        </div>
      </div>

      <!-- ══ 数据来源 ══ -->
      <div class="vr-section">
        <h3 class="vr-sec-title">📦 数据来源</h3>
        <el-table :data="report.dataSources" stripe size="small">
          <el-table-column prop="chart" label="图表" min-width="160" />
          <el-table-column prop="source" label="数据文件" min-width="200" show-overflow-tooltip />
          <el-table-column prop="field" label="字段" min-width="140" show-overflow-tooltip />
          <el-table-column label="真实数据" width="90">
            <template #default="{ row }">
              <el-tag :type="row.real ? 'success' : 'warning'" size="small">{{ row.real ? '真实' : '回退' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="note" label="说明" min-width="220" show-overflow-tooltip />
        </el-table>
      </div>

      <!-- ══ 分析过程（推理链） ══ -->
      <div class="vr-section">
        <h3 class="vr-sec-title">🧠 分析过程（推理链）</h3>
        <el-timeline>
          <el-timeline-item
            v-for="p in report.analysisProcess"
            :key="p.step"
            :timestamp="`第 ${p.step} 步`"
            placement="top"
            type="primary"
          >
            <div class="vr-step-title">{{ p.title }}</div>
            <div class="vr-step-detail">{{ p.detail }}</div>
          </el-timeline-item>
        </el-timeline>
      </div>

      <!-- ══ 统计验证 / 一致性校验 ══ -->
      <div class="vr-section">
        <h3 class="vr-sec-title">📊 {{ report.statisticalVerification.label }}</h3>
        <p v-if="report.statisticalVerification.description" class="vr-sec-desc">{{ report.statisticalVerification.description }}</p>

        <!-- 统计型（预测页）：维度 + 方法 -->
        <template v-if="report.statisticalVerification.type === 'statistical'">
          <div v-if="report.statisticalVerification.gpr_available === false" class="vr-warn">⚠ GPR 不可用，使用线性回归回退</div>
          <div class="vr-dim-row">
            <div
              v-for="(dim, key) in report.statisticalVerification.dimensions"
              :key="key"
              class="vr-dim-card"
            >
              <div class="vr-dim-num" :style="{color: dimColor(dim.score)}">{{ dim.score }}%</div>
              <div class="vr-dim-label">{{ dim.label }}</div>
              <div class="vr-dim-desc">{{ dim.description }}</div>
            </div>
          </div>

          <!-- 各方法明细 -->
          <div v-for="(dim, dkey) in report.statisticalVerification.dimensions" :key="dkey" class="vr-methods">
            <h4 class="vr-sub-h">{{ dim.label }}</h4>
            <div v-for="(method, mkey) in dim.methods" :key="mkey" class="vr-method">
              <div class="vr-method-head">
                <span class="vr-method-name">{{ method.method }}</span>
                <span v-if="method.error" class="vr-warn-inline">{{ method.error }}</span>
                <span v-else class="vr-method-score" :style="{color: dimColor(method.score)}">{{ method.score }} 分</span>
              </div>
              <div v-if="!method.error" class="vr-method-body">
                <!-- 历史拟合优度：全量拟合 R² + 交叉验证 R² -->
                <template v-if="method.fit_r2 !== undefined">
                  <span class="vr-kv">全量拟合 R²：<b>{{ method.fit_r2 }}</b>（历史拟合度核心指标）</span>
                  <span class="vr-kv">交叉验证外推 R²：<b>{{ method.cv_r2_mean }}</b>（外推泛化参考）</span>
                  <el-table :data="method.folds || []" size="mini" stripe class="vr-mini-table">
                    <el-table-column prop="fold" label="折" width="50" />
                    <el-table-column prop="train_size" label="训练" width="60" />
                    <el-table-column prop="test_size" label="测试" width="60" />
                    <el-table-column prop="r2" label="R²" width="80" />
                    <el-table-column prop="test_range" label="范围" />
                  </el-table>
                </template>
                <!-- 残差检验 -->
                <template v-else-if="method.durbin_watson !== undefined">
                  <span class="vr-kv">DW = <b>{{ method.durbin_watson }}</b></span>
                  <span class="vr-kv">ACF(1-3) = {{ (method.acf_lags_1_3 || []).join(', ') }}</span>
                  <span class="vr-kv" :style="{color: method.is_white_noise ? '#67C23A' : '#E6A23C'}">{{ method.verdict }}</span>
                </template>
                <!-- PICP -->
                <template v-else-if="method.picp !== undefined">
                  <span class="vr-kv">覆盖率：<b>{{ method.picp }}%</b> / 目标 95%</span>
                  <span class="vr-kv">{{ method.covered }}/{{ method.total }} 个落入区间</span>
                  <span class="vr-kv">预测区间：{{ method.forecast_range }}</span>
                </template>
                <!-- 多模型一致性 -->
                <template v-else-if="method.models">
                  <span class="vr-kv">方向：{{ method.consensus }}</span>
                  <div class="vr-model-chips">
                    <span v-for="(m, mk) in method.models" :key="mk" class="vr-model-chip">
                      <b>{{ mk }}</b> {{ m.direction }}
                    </span>
                  </div>
                </template>
                <div v-if="method.interpretation" class="vr-interp">{{ method.interpretation }}</div>
              </div>
            </div>
          </div>
        </template>

        <!-- 一致性型（研判页）：维度说明 -->
        <template v-else>
          <div class="vr-dim-row">
            <div
              v-for="(dim, key) in report.statisticalVerification.dimensions"
              :key="key"
              class="vr-dim-card"
            >
              <div class="vr-dim-num">{{ Math.round(dim.weight * 100) }}%</div>
              <div class="vr-dim-label">{{ dim.label }}</div>
              <div class="vr-dim-desc">{{ dim.note }}</div>
            </div>
          </div>
        </template>
      </div>

      <!-- ══ 合理性校验 ══ -->
      <div class="vr-section">
        <h3 class="vr-sec-title">✅ 合理性校验</h3>
        <el-table :data="report.reasonablenessChecks" stripe size="small">
          <el-table-column prop="metric" label="指标" min-width="140" />
          <el-table-column prop="value" label="数值" min-width="140" />
          <el-table-column prop="range" label="合理范围" min-width="180" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'pass' ? 'success' : 'warning'" size="small">
                {{ row.status === 'pass' ? '通过' : '关注' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getVerificationReport } from '@/api/situation'

const props = defineProps({
  page: { type: String, default: 'judgment' },
  scenario: { type: String, default: 'uranium' }
})

const loading = ref(true)
const error = ref('')
const report = ref(null)

const scoreColor = computed(() => {
  const s = report.value?.credibility?.score ?? 0
  return s >= 80 ? '#67C23A' : s >= 60 ? '#E6A23C' : '#F56C6C'
})
const levelTag = computed(() => {
  const s = report.value?.credibility?.score ?? 0
  return s >= 80 ? 'success' : s >= 60 ? 'warning' : 'danger'
})
const dimColor = (s) => (s >= 80 ? '#67C23A' : s >= 60 ? '#E6A23C' : '#F56C6C')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await getVerificationReport(props.page, props.scenario)
    if (!res || !res.success) {
      error.value = (res && res.message) || '后端返回异常'
      return
    }
    report.value = res.data
  } catch (e) {
    error.value = e.message || '网络请求失败'
  } finally {
    loading.value = false
  }
}

// 场景切换时重新加载
watch(() => props.scenario, () => fetchData())

onMounted(() => fetchData())
</script>

<style scoped>
.vr-root { padding: 0 8px; min-height: 100%; }
.vr-loading, .vr-error { padding: 24px; }

.vr-header { margin-bottom: 16px; }
.vr-header-title { font-size: 18px; font-weight: 700; color: #303133; }
.vr-header-sub { font-size: 13px; color: #909399; margin-top: 2px; }

/* 可信度仪表盘 */
.vr-cred { display: flex; align-items: center; gap: 20px; background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
.vr-gauge { position: relative; width: 120px; height: 120px; flex-shrink: 0; }
.vr-gauge svg { width: 100%; height: 100%; }
.vr-gauge-num { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 26px; font-weight: 800; }
.vr-cred-info { flex: 1; }
.vr-cred-summary { font-size: 13px; color: #606266; margin: 8px 0 0; line-height: 1.6; }

/* 章节 */
.vr-section { background: #fff; border-radius: 10px; padding: 18px; margin-bottom: 14px; border: 1px solid #eef0f4; }
.vr-sec-title { font-size: 15px; font-weight: 600; color: #303133; margin: 0 0 12px; }
.vr-sec-desc { font-size: 12px; color: #909399; margin: 0 0 12px; line-height: 1.5; }
.vr-warn { color: #E6A23C; background: #fdf6ec; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 10px; }
.vr-warn-inline { color: #E6A23C; font-size: 12px; }

/* 验证方法卡片 */
.vr-method-card { border: 1px solid #eef0f4; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; background: #fafbfc; }
.vr-method-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.vr-method-card-name { font-size: 13px; font-weight: 600; color: #303133; }
.vr-method-card-detail { font-size: 12px; color: #606266; line-height: 1.6; }

/* 分析过程 */
.vr-step-title { font-weight: 600; color: #303133; font-size: 14px; }
.vr-step-detail { color: #606266; font-size: 13px; line-height: 1.6; margin-top: 2px; }

/* 维度卡片 */
.vr-dim-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.vr-dim-card { flex: 1; min-width: 150px; background: #f8fafc; border-radius: 10px; padding: 14px; text-align: center; }
.vr-dim-num { font-size: 22px; font-weight: 700; color: #303133; }
.vr-dim-label { font-size: 13px; color: #606266; font-weight: 600; margin-top: 4px; }
.vr-dim-desc { font-size: 11px; color: #b0b0b0; margin-top: 4px; line-height: 1.4; }

/* 方法明细 */
.vr-methods { margin-bottom: 12px; }
.vr-sub-h { font-size: 13px; font-weight: 600; color: #606266; margin: 8px 0; }
.vr-method { border: 1px solid #f0f0f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
.vr-method-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.vr-method-name { font-size: 13px; font-weight: 600; color: #303133; }
.vr-method-score { font-size: 15px; font-weight: 800; }
.vr-method-body { display: flex; flex-direction: column; gap: 4px; }
.vr-kv { font-size: 12px; color: #606266; }
.vr-interp { font-size: 12px; color: #606266; background: #f5f7fa; border-radius: 6px; padding: 6px 10px; margin-top: 4px; }
.vr-mini-table { margin-top: 6px; }
.vr-model-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.vr-model-chip { font-size: 12px; background: #f0f2f5; border-radius: 6px; padding: 4px 8px; }
</style>
