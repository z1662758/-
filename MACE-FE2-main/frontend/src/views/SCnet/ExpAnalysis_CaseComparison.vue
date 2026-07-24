<template>
  <div class="case-comparison-page">
    <section class="page-head">
      <div>
        <h1>案例对比分析</h1>
        <p class="subtitle">对比不同实验的参数配置与指标表现，发现模式差异与优化方向。</p>
      </div>
      <div class="head-actions">
        <div class="stat-item">
          <span>实验库</span>
          <strong>{{ caseCount }}</strong>
        </div>
        <div class="stat-item">
          <span>相似度</span>
          <strong>{{ similarityDisplay }}</strong>
        </div>
        <el-button text size="small" :icon="Refresh" @click="loadCaseLibrary" :loading="loading" />
      </div>
    </section>

    <div class="comparison-grid">
      <!-- 左侧: 实验库 -->
      <aside class="case-library-panel">
        <header class="panel-header">
          <el-icon><Collection /></el-icon>
          <span>实验库</span>
          <el-input
            v-model="searchQuery"
            placeholder="搜索案例..."
            size="small"
            clearable
            class="search-input"
          />
        </header>
        <div class="panel-body">
          <div class="case-category"
            v-for="cat in filteredCategories"
            :key="cat.name"
          >
            <h4 class="category-title">
              <el-icon><FolderOpened /></el-icon>
              {{ cat.name }} ({{ cat.cases.length }})
            </h4>
            <div
              v-for="c in cat.cases"
              :key="c.experiment_id"
              class="case-item"
              :class="{
                active: c.experiment_id === caseAId || c.experiment_id === caseBId,
                'slot-a': c.experiment_id === caseAId,
                'slot-b': c.experiment_id === caseBId
              }"
              @click="selectCase(c)"
            >
              <div class="case-item-head">
                <span class="case-id">{{ c.experiment_id }}</span>
                <el-tag v-if="c.has_extreme_scenario" size="small" type="danger" effect="light" round>极端</el-tag>
                <el-tag v-else size="small" type="info" effect="light" round>基准</el-tag>
              </div>
              <div class="case-item-stats">
                <span>完成率 {{ (c.avg_completion_rate * 100).toFixed(1) }}%</span>
                <span>利润 {{ c.avg_profit?.toFixed(0) || '--' }}</span>
                <span>迭代 {{ c.total_iterations }}轮</span>
              </div>
              <p class="case-goal">{{ c.goal_summary?.substring(0, 60) || '--' }}</p>
            </div>
          </div>
          <div v-if="caseCount === 0 && !loading" class="empty-hint">暂无可用实验数据</div>
        </div>
      </aside>

      <!-- 右侧: 对比视图 -->
      <section class="comparison-main">
        <!-- 选择区域 -->
        <div class="slot-selectors">
          <div class="slot-card slot-a-card" :class="{ filled: !!caseA }">
            <div class="slot-label">
              <el-tag type="primary" effect="dark" round>案例 A</el-tag>
              <span v-if="caseA" class="slot-name">{{ caseA.experiment_id }}</span>
              <span v-else class="slot-placeholder">点击左侧案例库选择</span>
            </div>
            <div v-if="caseA" class="slot-detail">
              <span>完成率 {{ (caseA.avg_completion_rate * 100).toFixed(1) }}%</span>
              <span>利润 {{ caseA.avg_profit?.toFixed(0) || '--' }}</span>
            </div>
          </div>
          <div class="vs-divider">
            <span>VS</span>
          </div>
          <div class="slot-card slot-b-card" :class="{ filled: !!caseB }">
            <div class="slot-label">
              <el-tag type="success" effect="dark" round>案例 B</el-tag>
              <span v-if="caseB" class="slot-name">{{ caseB.experiment_id }}</span>
              <span v-else class="slot-placeholder">点击左侧案例库选择</span>
            </div>
            <div v-if="caseB" class="slot-detail">
              <span>完成率 {{ (caseB.avg_completion_rate * 100).toFixed(1) }}%</span>
              <span>利润 {{ caseB.avg_profit?.toFixed(0) || '--' }}</span>
            </div>
          </div>
        </div>

        <!-- 对比结果 -->
        <div v-if="comparison" class="comparison-results">
          <!-- 基础信息对比 -->
          <section class="compare-section">
            <h3>
              <el-icon><DataLine /></el-icon>
              基础信息对比
            </h3>
            <el-table :data="comparison.basic_comparison" size="small" stripe>
              <el-table-column prop="dimension" label="维度" width="140" />
              <el-table-column prop="value_a" label="案例 A">
                <template #default="{ row }">
                  <span class="val-a">{{ row.value_a }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="value_b" label="案例 B">
                <template #default="{ row }">
                  <span class="val-b">{{ row.value_b }}</span>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <!-- 指标对比 -->
          <section class="compare-section">
            <h3>
              <el-icon><TrendCharts /></el-icon>
              关键指标对比
            </h3>
            <el-table :data="comparison.metrics_comparison" size="small" stripe>
              <el-table-column prop="metric" label="指标" width="140" />
              <el-table-column prop="value_a" label="案例 A" />
              <el-table-column prop="value_b" label="案例 B" />
              <el-table-column prop="diff" label="差异">
                <template #default="{ row }">
                  <span :style="{ color: row.diff.startsWith('+') ? '#22c55e' : row.diff.startsWith('-') ? '#ef4444' : '#64748b' }">
                    {{ row.diff }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="better" label="更优" width="80">
                <template #default="{ row }">
                  <el-tag v-if="row.better === 'A'" type="primary" size="small" effect="light">A</el-tag>
                  <el-tag v-else-if="row.better === 'B'" type="success" size="small" effect="light">B</el-tag>
                  <span v-else>--</span>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <!-- 相似度分析 -->
          <section class="compare-section" v-if="comparison.similarity">
            <h3>
              <el-icon><Odometer /></el-icon>
              相似度分析
            </h3>
            <div class="similarity-card">
              <div class="similarity-main">
                <div class="similarity-score">
                  <span class="score-number">{{ comparison.similarity.overall_score }}%</span>
                  <el-tag :type="comparison.similarity.level === '高度相似' ? 'success' : comparison.similarity.level === '中度相似' ? 'warning' : 'info'" effect="light" round>
                    {{ comparison.similarity.level }}
                  </el-tag>
                </div>
              </div>
              <div class="similarity-dims">
                <div v-for="dim in comparison.similarity.dimensions" :key="dim.dimension" class="sim-dim-item">
                  <span class="dim-label">{{ dim.dimension }}</span>
                  <el-progress :percentage="dim.score" :stroke-width="8" :color="dim.score >= 75 ? '#22c55e' : dim.score >= 50 ? '#eab308' : '#94a3b8'" />
                </div>
              </div>
            </div>
          </section>

          <!-- 推荐 -->
          <section class="compare-section recommendation-section" v-if="comparison.recommendation">
            <h3>
              <el-icon><Setting /></el-icon>
              综合推荐
            </h3>
            <el-alert
              :title="comparison.recommendation"
              type="info"
              :closable="false"
              show-icon
            />
          </section>
        </div>

        <!-- 空状态 -->
        <div v-else class="comparison-empty">
          <el-icon :size="48"><Collection /></el-icon>
          <p>请在左侧案例库中选择两个案例进行对比<br>（点击第一个案例作为A，再点击第二个作为B）</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Collection, DataLine, FolderOpened, Odometer,
  Refresh, Setting, TrendCharts
} from '@element-plus/icons-vue'
import { getCaseLibrary, compareCases } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'

const loading = ref(false)
const searchQuery = ref('')
const caseLibrary = ref([])
const caseAId = ref(null)
const caseBId = ref(null)
const comparison = ref(null)

const caseCount = computed(() => {
  return caseLibrary.value.reduce((sum, cat) => sum + (cat.cases?.length || 0), 0)
})

const similarityDisplay = computed(() => {
  return comparison.value?.similarity?.overall_score
    ? `${comparison.value.similarity.overall_score}%`
    : '--'
})

const caseA = computed(() => {
  for (const cat of caseLibrary.value) {
    const found = cat.cases?.find(c => c.experiment_id === caseAId.value)
    if (found) return found
  }
  return null
})

const caseB = computed(() => {
  for (const cat of caseLibrary.value) {
    const found = cat.cases?.find(c => c.experiment_id === caseBId.value)
    if (found) return found
  }
  return null
})

const filteredCategories = computed(() => {
  if (!searchQuery.value) return caseLibrary.value
  const q = searchQuery.value.toLowerCase()
  return caseLibrary.value.map(cat => ({
    ...cat,
    cases: (cat.cases || []).filter(c =>
      c.experiment_id?.toLowerCase().includes(q) ||
      c.goal_summary?.toLowerCase().includes(q)
    )
  })).filter(cat => cat.cases.length > 0)
})

const loadCaseLibrary = async () => {
  loading.value = true
  try {
    const res = await getCaseLibrary()
    const data = unwrapApiData(res)
    if (data?.categories) {
      caseLibrary.value = data.categories
      ElMessage.success(`案例库已加载，共 ${data.total_cases} 个案例`)
    }
  } catch (e) {
    console.warn('加载案例库失败:', e)
    ElMessage.warning('案例库加载失败')
  } finally {
    loading.value = false
  }
}

const selectCase = async (c) => {
  if (!caseAId.value) {
    caseAId.value = c.experiment_id
    ElMessage.info(`已选择案例 A: ${c.experiment_id}`)
    return
  }
  if (!caseBId.value && c.experiment_id !== caseAId.value) {
    caseBId.value = c.experiment_id
    ElMessage.info(`已选择案例 B: ${c.experiment_id}`)
    // 触发对比
    await runComparison()
    return
  }
  // 重新选择
  caseAId.value = c.experiment_id
  caseBId.value = null
  comparison.value = null
  ElMessage.info(`已重新选择案例 A: ${c.experiment_id}`)
}

const runComparison = async () => {
  if (!caseAId.value || !caseBId.value) return
  loading.value = true
  try {
    const res = await compareCases(caseAId.value, caseBId.value)
    const data = unwrapApiData(res)
    if (data?.comparison) {
      comparison.value = data.comparison
      ElMessage.success('案例对比完成')
    }
  } catch (e) {
    console.warn('案例对比失败:', e)
    ElMessage.warning('案例对比失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCaseLibrary()
})
</script>

<style scoped>
.case-comparison-page {
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

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 14px 22px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.eyebrow {
  margin: 0 0 6px;
  color: #8b5cf6;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.page-head h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 900;
}

.subtitle {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.stat-item {
  min-width: 100px;
  padding: 10px 13px;
  border: 1px solid #ddd6fe;
  border-radius: 10px;
  background: linear-gradient(180deg, #fafafe 0%, #f3f0ff 100%);
}

.stat-item span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.stat-item strong {
  display: block;
  margin-top: 6px;
  color: #5b21b6;
  font-size: 21px;
  line-height: 1.1;
}

.comparison-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 12px;
  min-height: 0;
}

/* 左侧面板 */
.case-library-panel {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #eef2f7;
  font-weight: 800;
  font-size: 14px;
}

.search-input {
  flex: 1;
  max-width: 160px;
  margin-left: auto;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.case-category {
  margin-bottom: 6px;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
}

.case-item {
  padding: 10px 12px;
  margin: 2px 0;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.case-item:hover {
  border-color: #c4b5fd;
  background: #fafafe;
}

.case-item.active {
  border-color: #8b5cf6;
  background: #f3f0ff;
}

.case-item.slot-a {
  border-left: 3px solid #3867f2;
}

.case-item.slot-b {
  border-left: 3px solid #22c55e;
}

.case-item-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.case-id {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.case-item-stats {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.case-goal {
  margin: 6px 0 0;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  line-height: 1.4;
}

.empty-hint {
  padding: 40px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}

/* 右侧区域 */
.comparison-main {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  padding: 16px;
  overflow-y: auto;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
}

.slot-selectors {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
}

.slot-card {
  padding: 16px;
  border: 2px dashed #e2e8f0;
  border-radius: 14px;
  text-align: center;
  transition: all 0.3s ease;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.slot-card.filled {
  border-style: solid;
}

.slot-a-card.filled {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.slot-b-card.filled {
  border-color: #bbf7d0;
  background: #f8fff8;
}

.slot-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.slot-name {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.slot-placeholder {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}

.slot-detail {
  display: flex;
  gap: 16px;
  justify-content: center;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.vs-divider {
  display: flex;
  align-items: center;
  justify-content: center;
}

.vs-divider span {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #8b5cf6;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 14px;
}

/* 对比结果 */
.comparison-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.compare-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
}

.val-a { color: #3867f2; font-weight: 700; }
.val-b { color: #22c55e; font-weight: 700; }

.similarity-card {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fafbfc;
}

.similarity-main {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.similarity-score {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score-number {
  font-size: 36px;
  font-weight: 900;
  color: #8b5cf6;
}

.similarity-dims {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sim-dim-item {
  display: grid;
  grid-template-columns: 100px 1fr;
  align-items: center;
  gap: 12px;
}

.dim-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-align: right;
}

.recommendation-section :deep(.el-alert) {
  border-radius: 12px;
}

.comparison-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: #94a3b8;
  gap: 16px;
}

.comparison-empty p {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .comparison-grid {
    grid-template-columns: 1fr;
  }
  .slot-selectors {
    grid-template-columns: 1fr;
  }
  .vs-divider {
    transform: rotate(90deg);
  }
}
</style>
