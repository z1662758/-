<template>
  <div class="anomaly-analysis-page">
    <section class="page-head">
      <div>
        <h1>异常分析</h1>
        <p class="subtitle">检测实验过程中的指标突变与网络异常，进行多维度归因分析。</p>
      </div>
      <div class="head-actions">
        <el-button text size="small" :icon="Refresh" @click="loadAnomalies" :loading="loading" />
      </div>
    </section>

    <div class="main-grid">
      <!-- 异常列表 -->
      <section class="anomaly-list-panel">
        <header class="panel-head">
          <el-icon><WarningFilled /></el-icon>
          <span>异常事件列表</span>
          <el-select v-model="severityFilter" placeholder="严重度" size="small" clearable style="width:110px;margin-left:auto">
            <el-option label="全部" value="" />
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </header>
        <div class="panel-body">
          <div v-if="filteredAnomalies.length === 0 && !loading" class="empty-hint">暂无检测到的异常事件</div>
          <div
            v-for="(a, idx) in filteredAnomalies"
            :key="idx"
            class="anomaly-item"
            :class="{ active: selectedAnomalyIndex === a._originalIndex }"
            @click="selectAnomaly(a._originalIndex)"
          >
            <div class="anomaly-head">
              <el-tag
                :type="a.severity === 'high' ? 'danger' : a.severity === 'medium' ? 'warning' : 'info'"
                size="small"
                effect="dark"
                round
              >
                {{ a.severity === 'high' ? '高' : a.severity === 'medium' ? '中' : '低' }}
              </el-tag>
              <span class="anomaly-type">{{ typeLabel(a.type) }}</span>
            </div>
            <p class="anomaly-desc">{{ a.description }}</p>
            <div class="anomaly-meta">
              <span v-if="a.month">第{{ a.month }}月</span>
              <span v-if="a.iteration">迭代{{ a.iteration }}</span>
              <span v-if="a.change_pct">变化 {{ a.change_pct }}%</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 详情面板 -->
      <section class="anomaly-detail-panel">
        <template v-if="selectedDetail">
          <header class="panel-head">
            <el-icon><DataLine /></el-icon>
            <span>异常详情</span>
            <el-tag
              :type="selectedDetail.anomaly.severity === 'high' ? 'danger' : selectedDetail.anomaly.severity === 'medium' ? 'warning' : 'info'"
              size="small"
              effect="light"
              round
              style="margin-left:8px"
            >
              {{ selectedDetail.anomaly.severity === 'high' ? '高严重度' : selectedDetail.anomaly.severity === 'medium' ? '中严重度' : '低严重度' }}
            </el-tag>
          </header>
          <div class="detail-body">
            <section class="detail-section">
              <h4>异常描述</h4>
              <p>{{ selectedDetail.anomaly.description }}</p>
            </section>
            <section class="detail-section">
              <h4>可能原因</h4>
              <ul>
                <li v-for="cause in selectedDetail.analysis.possible_causes" :key="cause">{{ cause }}</li>
              </ul>
            </section>
            <section class="detail-section">
              <h4>影响范围</h4>
              <p>{{ selectedDetail.analysis.impact_scope }}</p>
            </section>
            <section class="detail-section">
              <h4>建议响应</h4>
              <p>{{ selectedDetail.analysis.suggested_response }}</p>
            </section>
            <section class="detail-section" v-if="selectedDetail.related_metrics && Object.keys(selectedDetail.related_metrics).length">
              <h4>关联指标快照</h4>
              <div class="metrics-grid">
                <div v-for="(val, key) in selectedDetail.related_metrics" :key="key" class="metric-item">
                  <span class="metric-label">{{ key }}</span>
                  <span class="metric-value">{{ typeof val === 'number' ? val.toFixed(1) : val }}</span>
                </div>
              </div>
            </section>
          </div>
        </template>
        <div v-else class="detail-empty">
          <el-icon :size="48"><WarningFilled /></el-icon>
          <p>点击左侧异常事件查看详情</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { DataLine, Odometer, Refresh, TrendCharts, WarningFilled } from '@element-plus/icons-vue'
import { getAnomalies, getAnomalyDetail, getExperiments } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'

const loading = ref(false)
const anomaliesData = ref(null)
const severityFilter = ref('')
const selectedAnomalyIndex = ref(null)
const selectedDetail = ref(null)

const typeLabels = {
  order_drop: '订单骤降',
  completion_change: '完成率异常',
  enterprise_change: '企业变化',
  extreme_event: '极端事件'
}

const typeLabel = (t) => typeLabels[t] || t

const anomalyCount = computed(() => anomaliesData.value?.summary?.total_anomalies || 0)
const highSeverityCount = computed(() => anomaliesData.value?.summary?.by_severity?.high || 0)

const overviewCards = computed(() => {
  const s = anomaliesData.value?.summary || {}
  const types = s.by_type || []
  const topType = types[0]
  return [
    { label: '异常总数', value: s.total_anomalies || 0, icon: WarningFilled },
    { label: '主要类型', value: topType ? `${topType.label} (${topType.count})` : '--', icon: TrendCharts },
    { label: '涉及月份', value: anomaliesData.value?.timeline?.length || 0, icon: Odometer },
    { label: '高严重度', value: highSeverityCount.value, icon: DataLine }
  ]
})

const allAnomalies = computed(() => {
  return (anomaliesData.value?.anomalies || []).map((a, i) => ({ ...a, _originalIndex: i }))
})

const filteredAnomalies = computed(() => {
  if (!severityFilter.value) return allAnomalies.value
  return allAnomalies.value.filter(a => a.severity === severityFilter.value)
})

const loadAnomalies = async () => {
  loading.value = true
  try {
    const listRes = await getExperiments()
    const experiments = unwrapApiData(listRes) || []
    if (!experiments || experiments.length === 0) {
      ElMessage.warning('暂无可用实验数据')
      return
    }

    const latest = experiments[0]
    const experimentId = latest.experiment_id || latest.id
    if (!experimentId) {
      ElMessage.warning('未找到有效实验ID')
      return
    }

    const res = await getAnomalies(experimentId)
    const data = unwrapApiData(res)
    if (data) {
      anomaliesData.value = data
      ElMessage.success(`检测到 ${data.summary?.total_anomalies || 0} 个异常`)
    }
  } catch (e) {
    console.warn('加载异常数据失败:', e)
    ElMessage.warning('异常数据加载失败')
  } finally {
    loading.value = false
  }
}

const selectAnomaly = async (index) => {
  selectedAnomalyIndex.value = index
  loading.value = true
  try {
    const listRes = await getExperiments()
    const experiments = unwrapApiData(listRes) || []
    const latest = experiments[0]
    const experimentId = latest.experiment_id || latest.id
    if (!experimentId) return

    const res = await getAnomalyDetail(experimentId, index)
    const data = unwrapApiData(res)
    if (data?.detail) {
      selectedDetail.value = data.detail
    }
  } catch (e) {
    console.warn('加载异常详情失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAnomalies()
})
</script>

<style scoped>
.anomaly-analysis-page {
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 14px 16px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f6f8fb;
  color: #0f172a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-head { display: flex; justify-content: space-between; gap: 20px; align-items: center; padding: 14px 22px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; box-shadow: 0 10px 28px rgba(15,23,42,0.05); }
.eyebrow { margin: 0 0 6px; color: #ef4444; font-size: 12px; font-weight: 900; letter-spacing: 0.1em; }
.page-head h1 { margin: 0; font-size: 26px; font-weight: 900; }
.subtitle { margin: 8px 0 0; color: #64748b; font-size: 13px; font-weight: 600; }
.head-actions { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; }
.stat-item { min-width: 100px; padding: 10px 13px; border: 1px solid #fecaca; border-radius: 10px; background: linear-gradient(180deg, #fff8f8 0%, #fef2f2 100%); }
.stat-item span { display: block; color: #64748b; font-size: 12px; font-weight: 800; }
.stat-item strong { display: block; margin-top: 6px; color: #991b1b; font-size: 21px; }

.overview-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.overview-card { display: grid; grid-template-columns: 42px 1fr; grid-template-rows: auto auto; column-gap: 12px; align-items: center; min-height: 64px; padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; }
.overview-card .el-icon { grid-row: 1/3; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: #fecaca; color: #ef4444; font-size: 18px; }
.overview-card span { color: #64748b; font-size: 13px; font-weight: 800; }
.overview-card strong { color: #0f172a; font-size: 20px; }

.main-grid { flex: 1; display: grid; grid-template-columns: 380px 1fr; gap: 12px; min-height: 0; }

.anomaly-list-panel, .anomaly-detail-panel { border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 14px 34px rgba(15,23,42,0.06); }
.panel-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #eef2f7; font-weight: 800; font-size: 14px; }
.panel-body { flex: 1; overflow-y: auto; padding: 8px; }

.anomaly-item { padding: 12px; margin: 2px 0; border: 1px solid #eef2f7; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
.anomaly-item:hover { border-color: #fca5a5; background: #fffafafa; }
.anomaly-item.active { border-color: #ef4444; background: #fef2f2; border-left: 3px solid #ef4444; }
.anomaly-head { display: flex; align-items: center; gap: 8px; }
.anomaly-type { font-size: 13px; font-weight: 800; color: #0f172a; }
.anomaly-desc { margin: 8px 0; font-size: 12px; color: #64748b; line-height: 1.5; font-weight: 500; }
.anomaly-meta { display: flex; gap: 12px; font-size: 11px; color: #94a3b8; font-weight: 600; }

.detail-body { padding: 16px; overflow-y: auto; }
.detail-section { margin-bottom: 16px; }
.detail-section h4 { margin: 0 0 8px; font-size: 14px; font-weight: 800; color: #0f172a; }
.detail-section p, .detail-section li { margin: 0; font-size: 13px; color: #475569; line-height: 1.6; }
.detail-section ul { margin: 0; padding-left: 18px; }

.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.metric-item { padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafbfc; display: flex; flex-direction: column; gap: 4px; }
.metric-label { font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
.metric-value { font-size: 16px; font-weight: 900; color: #0f172a; }

.empty-hint, .detail-empty { padding: 40px 0; text-align: center; color: #94a3b8; font-size: 13px; font-weight: 600; }
.detail-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 100px 0; }
</style>
