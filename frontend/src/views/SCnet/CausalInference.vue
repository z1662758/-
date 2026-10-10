<template>
  <div class="causal-inference-page">
    <section class="page-head">
      <div>
        <p class="eyebrow">SCNET CAUSAL INFERENCE</p>
        <h1>因果推断</h1>
        <p class="subtitle">构建实验变量间的因果关系图，支持反事实推理——"如果改变X，Y会如何变化？"</p>
      </div>
      <div class="head-actions">
        <div class="stat-item">
          <span>因果节点</span>
          <strong>{{ nodeCount }}</strong>
        </div>
        <div class="stat-item">
          <span>因果边</span>
          <strong>{{ edgeCount }}</strong>
        </div>
        <el-button type="primary" plain :icon="Refresh" @click="loadCausalGraph" :loading="loading">刷新</el-button>
      </div>
    </section>

    <div class="main-grid">
      <!-- 左侧: 因果图 -->
      <section class="graph-panel">
        <header class="panel-head">
          <el-icon><Connection /></el-icon>
          <span>因果关系图</span>
          <div class="legend">
            <span v-for="cat in categories" :key="cat.key" class="legend-item">
              <span class="legend-dot" :style="{ background: cat.color }"></span>
              {{ cat.name }}
            </span>
          </div>
        </header>
        <div class="graph-body">
          <div v-if="causalData" class="causal-graph-visual">
            <!-- 节点 -->
            <div
              v-for="node in causalData.nodes"
              :key="node.id"
              class="graph-node"
              :class="[`node-${node.category}`]"
              :style="{ borderColor: node.color }"
            >
              <span class="node-name">{{ node.name }}</span>
              <span class="node-value">{{ formatValue(node.value) }}</span>
            </div>
            <!-- 边（简化连线表示） -->
            <div class="edges-info">
              <div v-for="(edge, idx) in causalData.edges" :key="idx" class="edge-item">
                <span class="edge-source">{{ edge.source }}</span>
                <span class="edge-arrow">→</span>
                <span class="edge-target">{{ edge.target }}</span>
                <el-tag size="small" :type="edge.strength > 0.6 ? 'success' : edge.strength > 0.4 ? 'warning' : 'info'" effect="light" round>
                  {{ (edge.strength * 100).toFixed(0) }}%
                </el-tag>
                <span class="edge-desc">{{ edge.description }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-hint">请加载因果图数据</div>
        </div>
      </section>

      <!-- 右侧: 反事实推理 -->
      <section class="counterfactual-panel">
        <header class="panel-head">
          <el-icon><Setting /></el-icon>
          <span>反事实推理</span>
        </header>
        <div class="counterfactual-body">
          <!-- 推理控制 -->
          <div class="cf-control">
            <div class="cf-field">
              <label>干预变量</label>
              <el-select v-model="cfVariable" placeholder="选择变量" size="default">
                <el-option v-for="v in interventionVariables" :key="v" :label="v" :value="v" />
              </el-select>
            </div>
            <div class="cf-field">
              <label>变化幅度</label>
              <el-select v-model="cfChange" placeholder="选择幅度" size="default">
                <el-option label="+10%" value="+10%" />
                <el-option label="+20%" value="+20%" />
                <el-option label="+50%" value="+50%" />
                <el-option label="-10%" value="-10%" />
                <el-option label="-20%" value="-20%" />
                <el-option label="-50%" value="-50%" />
              </el-select>
            </div>
            <el-button type="primary" @click="runCounterfactual" :loading="cfLoading">
              <el-icon><Connection /></el-icon>
              执行推理
            </el-button>
          </div>

          <!-- 推理结果 -->
          <div v-if="cfResult" class="cf-result">
            <el-alert
              :title="cfResult.summary"
              type="info"
              :closable="false"
              show-icon
            />

            <div class="cf-predictions">
              <h4>预测影响</h4>
              <div v-for="(pred, idx) in cfResult.predictions" :key="idx" class="cf-pred-item">
                <div class="cf-pred-head">
                  <span class="pred-target">{{ pred.target_variable }}</span>
                  <el-tag
                    size="small"
                    :type="pred.confidence > 0.7 ? 'success' : pred.confidence > 0.5 ? 'warning' : 'info'"
                    effect="light"
                    round
                  >置信度 {{ (pred.confidence * 100).toFixed(0) }}%</el-tag>
                </div>
                <p class="pred-effect">预期效果: <strong>{{ pred.predicted_effect }}</strong></p>
                <p class="pred-rationale">{{ pred.rationale }}</p>
              </div>
            </div>

            <div class="cf-note">
              <el-icon><WarningFilled /></el-icon>
              <span>{{ cfResult.note }}</span>
            </div>
          </div>

          <div v-else class="cf-empty">
            <p>选择干预变量和变化幅度后，点击"执行推理"进行反事实分析</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, Refresh, Setting, WarningFilled } from '@element-plus/icons-vue'
import { getCausalGraph, postCounterfactualReasoning, getExperiments } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'

const loading = ref(false)
const cfLoading = ref(false)
const causalData = ref(null)
const cfResult = ref(null)
const cfVariable = ref('产能水平')
const cfChange = ref('+20%')

const nodeCount = computed(() => causalData.value?.nodes?.length || 0)
const edgeCount = computed(() => causalData.value?.edges?.length || 0)
const categories = computed(() => causalData.value?.categories || [])
const interventionVariables = computed(() => {
  if (!causalData.value?.nodes) return ['产能水平', '库存容量', '订单倍数']
  return causalData.value.nodes
    .filter(n => n.category === 'intervention')
    .map(n => n.name)
})

const formatValue = (v) => {
  if (typeof v !== 'number') return v
  if (v < 1) return (v * 100).toFixed(1) + '%'
  return v.toFixed(1)
}

const loadCausalGraph = async () => {
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

    const res = await getCausalGraph(experimentId)
    const data = unwrapApiData(res)
    if (data) {
      causalData.value = data
      ElMessage.success(`因果图已加载: ${data.nodes?.length || 0} 节点, ${data.edges?.length || 0} 边`)
    }
  } catch (e) {
    console.warn('加载因果图失败:', e)
    ElMessage.warning('因果图数据加载失败')
  } finally {
    loading.value = false
  }
}

const runCounterfactual = async () => {
  cfLoading.value = true
  cfResult.value = null
  try {
    const listRes = await getExperiments()
    const experiments = unwrapApiData(listRes) || []
    const latest = experiments[0]
    const experimentId = latest.experiment_id || latest.id
    if (!experimentId) {
      ElMessage.warning('未找到有效实验ID')
      return
    }

    const res = await postCounterfactualReasoning(experimentId, {
      variable: cfVariable.value,
      change: cfChange.value
    })
    const data = unwrapApiData(res)
    if (data) {
      cfResult.value = data
      ElMessage.success('反事实推理完成')
    }
  } catch (e) {
    console.warn('反事实推理失败:', e)
    ElMessage.warning('反事实推理失败')
  } finally {
    cfLoading.value = false
  }
}

onMounted(() => {
  loadCausalGraph()
})
</script>

<style scoped>
.causal-inference-page {
  height: 100%; min-height: 0; box-sizing: border-box; padding: 14px 16px; overflow: auto;
  display: flex; flex-direction: column; gap: 12px; background: #f6f8fb; color: #0f172a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-head { display: flex; justify-content: space-between; gap: 20px; align-items: center; padding: 14px 22px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; box-shadow: 0 10px 28px rgba(15,23,42,0.05); }
.eyebrow { margin: 0 0 6px; color: #22c55e; font-size: 12px; font-weight: 900; letter-spacing: 0.1em; }
.page-head h1 { margin: 0; font-size: 26px; font-weight: 900; }
.subtitle { margin: 8px 0 0; color: #64748b; font-size: 13px; font-weight: 600; }
.head-actions { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; }
.stat-item { min-width: 100px; padding: 10px 13px; border: 1px solid #bbf7d0; border-radius: 10px; background: linear-gradient(180deg, #f8fff8 0%, #eefbf2 100%); }
.stat-item span { display: block; color: #64748b; font-size: 12px; font-weight: 800; }
.stat-item strong { display: block; margin-top: 6px; color: #166534; font-size: 21px; }

.main-grid { flex: 1; display: grid; grid-template-columns: 1fr 420px; gap: 12px; min-height: 0; }

.graph-panel, .counterfactual-panel { border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 14px 34px rgba(15,23,42,0.06); }
.panel-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #eef2f7; font-weight: 800; font-size: 14px; }
.legend { display: flex; gap: 14px; margin-left: auto; }
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #64748b; }
.legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }

.graph-body { flex: 1; padding: 16px; overflow-y: auto; }

.causal-graph-visual { display: flex; flex-direction: column; gap: 16px; }
.graph-node { padding: 12px 16px; border: 2px solid; border-radius: 12px; background: #fafbfc; display: flex; justify-content: space-between; align-items: center; }
.node-name { font-size: 15px; font-weight: 800; color: #0f172a; }
.node-value { font-size: 14px; font-weight: 700; color: #64748b; }

.edges-info { display: flex; flex-direction: column; gap: 6px; }
.edge-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid #eef2f7; border-radius: 8px; font-size: 12px; flex-wrap: wrap; }
.edge-source { font-weight: 700; color: #3b82f6; }
.edge-arrow { color: #94a3b8; font-weight: 900; }
.edge-target { font-weight: 700; color: #22c55e; }
.edge-desc { color: #94a3b8; font-size: 11px; margin-left: auto; }

.counterfactual-body { padding: 16px; overflow-y: auto; flex: 1; }
.cf-control { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.cf-field { display: flex; flex-direction: column; gap: 4px; }
.cf-field label { font-size: 12px; font-weight: 700; color: #64748b; }

.cf-result { display: flex; flex-direction: column; gap: 16px; }
.cf-predictions h4 { margin: 0 0 10px; font-size: 14px; font-weight: 800; }
.cf-pred-item { padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fafbfc; margin-bottom: 8px; }
.cf-pred-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.pred-target { font-size: 14px; font-weight: 800; color: #0f172a; }
.pred-effect { margin: 0 0 4px; font-size: 13px; color: #475569; }
.pred-rationale { margin: 0; font-size: 11px; color: #94a3b8; }
.cf-note { display: flex; align-items: flex-start; gap: 8px; padding: 10px; background: #fefce8; border-radius: 8px; font-size: 11px; color: #a16207; }

.empty-hint, .cf-empty { padding: 60px 0; text-align: center; color: #94a3b8; font-size: 13px; font-weight: 600; }

@media (max-width: 1100px) {
  .main-grid { grid-template-columns: 1fr; }
}
</style>
