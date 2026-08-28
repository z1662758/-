<template>
  <div class="supply-chain-page analysis-workspace legacy-analysis-page">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="tl-left">
        <span class="page-title">📊 供应链对策分析</span>
        <span class="page-sub">{{ subtitleText }}</span>
      </div>
      <div class="tl-center">
        <el-tag v-if="experimentId" type="info" effect="plain">
          关联实验 {{ experimentId }}
        </el-tag>
        <el-tag v-else type="warning" effect="plain">
          当前会话尚未关联实验
        </el-tag>
      </div>
      <div class="tl-right">
        <el-button type="primary" size="small" :loading="loading" :disabled="!sessionId" @click="refreshTree">
          <el-icon><Refresh /></el-icon> 刷新推演
        </el-button>
      </div>
    </div>

    <!-- 第一层决策评分对比 -->
    <div class="score-panel">
      <div class="score-header">
        <el-icon><TrendCharts /></el-icon>
        第一层决策期望得分对比（越高越优）
      </div>
      <div class="score-list">
        <div v-for="(item, idx) in firstLevelScores" :key="idx" class="score-card" :class="{ best: item.isBest }">
          <div class="score-name">{{ item.name }}</div>
          <div class="score-value-group">
            <span class="score-value">{{ item.score }}</span>
            <span class="score-unit">分</span>
          </div>
          <el-progress :percentage="item.percent" :color="item.isBest ? '#f59e0b' : '#3b82f6'" :stroke-width="6" :show-text="false" />
          <el-tag v-if="item.isBest" type="warning" size="small" effect="dark" class="score-tag">⭐ 推荐决策</el-tag>
        </div>
      </div>
    </div>

    <!-- 决策树主体 -->
    <div class="tree-container">
      <div class="tree-header">
        <el-icon><Share /></el-icon>
        {{ headerName }} - 决策推理树
        <span class="tree-hint">🖱️ 滚轮缩放 | 拖拽平移 | 点击节点查看详情</span>
      </div>
      <div class="tree-wrapper">
        <div v-show="currentTree" ref="chartRef" class="tree-chart"></div>
        <el-empty
          v-if="!currentTree && !loading"
          :description="emptyHint"
        />
      </div>
    </div>

    <!-- 底部详情栏 -->
    <div v-if="selectedNode" class="footer-detail">
      <div class="footer-detail-header">
        <el-tag :type="selectedNode.isLeaf ? 'warning' : 'primary'" size="default">
          {{ selectedNode.isLeaf ? '📌 决策结果' : '🎯 决策节点' }}
        </el-tag>
        <span class="footer-detail-title">{{ selectedNode.name }}</span>
        <el-button link class="close-btn" @click="selectedNode = null">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <div class="footer-detail-body">
        <div class="footer-detail-desc">{{ selectedNode.desc }}</div>
        <div v-if="selectedNode.isLeaf && selectedNode.score" class="footer-detail-score">
          <span>综合评分：</span>
          <strong :style="{ color: selectedNode.score >= 80 ? '#f59e0b' : selectedNode.score >= 60 ? '#3b82f6' : '#ef4444' }">
            {{ selectedNode.score }}分
          </strong>
        </div>
        <div v-if="!selectedNode.isLeaf && selectedNode.children" class="footer-detail-children">
          <span>后续分支：</span>
          <el-tag v-for="(child, i) in selectedNode.children.slice(0, 3)" :key="i" size="small" type="info">
            {{ child.name }} ({{ Math.round(child.prob * 100) }}%)
          </el-tag>
          <el-button v-if="selectedNode.children.length > 3" link type="primary" size="small" @click="showDetailDrawer = true">
            查看全部 {{ selectedNode.children.length }} 项 →
          </el-button>
        </div>
        <el-button v-if="selectedNode.detail" link type="primary" size="small" class="view-detail-btn" @click="showDetailDrawer = true">
          查看详细分析
        </el-button>
      </div>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer v-model="showDetailDrawer" direction="rtl" size="520px" :with-header="false">
      <div v-if="selectedNode" class="drawer-content">
        <div class="drawer-header">
          <span class="drawer-title">{{ selectedNode.isLeaf ? '📌 决策结果详情' : '🎯 决策节点详情' }}</span>
          <el-button link @click="showDetailDrawer = false"><el-icon><Close /></el-icon></el-button>
        </div>
        <div class="drawer-body">
          <div class="detail-name">{{ selectedNode.name }}</div>
          <div class="detail-desc">{{ selectedNode.desc }}</div>
          
          <div v-if="selectedNode.detail" class="detail-section">
            <el-divider>📊 详细分析</el-divider>
            <div class="detail-text">{{ selectedNode.detail }}</div>
          </div>
          
          <div v-if="selectedNode.isLeaf && selectedNode.score" class="detail-section">
            <el-divider>🔮 综合评分</el-divider>
            <div class="score-big">{{ selectedNode.score }}分</div>
            <div class="score-reason">{{ selectedNode.scoreReason }}</div>
          </div>
          
          <div v-if="selectedNode.children && selectedNode.children.length" class="detail-section">
            <el-divider>🔽 后续分支</el-divider>
            <div v-for="(child, i) in selectedNode.children" :key="i" class="child-item">
              <span>{{ child.name }}</span>
              <el-tag size="small" type="info">{{ Math.round(child.prob * 100) }}%</el-tag>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Refresh, Share, TrendCharts, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { getDecisionTreeBySession } from '@/api/decisionAnalysis'
import { unwrapApiData } from '@/utils/apiEnvelope'

const store = useSupplyChainStore()

const loading = ref(false)
const chartRef = ref(null)
const selectedNode = ref(null)
const showDetailDrawer = ref(false)
let chart = null

const sessionId = ref(store.currentSessionId || localStorage.getItem('sc_currentSessionId') || '')
const experimentId = ref('')
const goalText = ref('')
const currentTree = ref(null)
const firstLevelScores = ref([])

const headerName = computed(() => {
  if (goalText.value) {
    return goalText.value.length > 24 ? `${goalText.value.slice(0, 24)}…` : goalText.value
  }
  return experimentId.value || '当前会话'
})

const subtitleText = computed(() => {
  if (!sessionId.value) return '请先在「想定生成」中创建会话'
  if (!experimentId.value) return '该会话尚未提交实验'
  return '基于当前会话关联实验的多轮迭代生成'
})

const emptyHint = computed(() => {
  if (!sessionId.value) return '尚未创建场景建模会话，请先完成「想定生成」步骤 1-3'
  if (!experimentId.value) return '当前会话尚未关联实验，请先完成「想定生成」第 5 步并提交实验'
  return '暂无可用的迭代数据'
})

// ==================== 后端数据加载 ====================
// 决策树结构与第一层评分由后端 service/decision_tree_service.py 计算，
// 前端只负责渲染。

// 转换为 ECharts 树图
function toEChartsTree(node, isRoot = true) {
  const isLeaf = node.isLeaf || !node.children?.length
  
  // 节点样式
  let color, borderColor, textColor
  if (isRoot) {
    color = '#dbeafe'      // 浅蓝色背景
    borderColor = '#3b82f6'
    textColor = '#1e3a8a'  // 深蓝色文字，清晰可见
  } else if (isLeaf) {
    if (node.score >= 85) {
      color = '#fef3c7'
      borderColor = '#f59e0b'
      textColor = '#92400e'
    } else if (node.score >= 60) {
      color = '#dbeafe'
      borderColor = '#3b82f6'
      textColor = '#1e3a8a'
    } else {
      color = '#fee2e2'
      borderColor = '#ef4444'
      textColor = '#991b1b'
    }
  } else {
    color = '#f0fdf4'
    borderColor = '#22c55e'
    textColor = '#166534'
  }
  
  // 构建显示名称
  let displayName = node.name
  if (!isRoot && !isLeaf && node.prob && node.prob < 1) {
    displayName = `${node.name}\n${Math.round(node.prob * 100)}%`
  }
  if (isLeaf && node.score) {
    displayName = `${node.name}\n${node.score}分`
  }
  
  const result = {
    name: displayName,
    itemStyle: {
      color: color,
      borderColor: borderColor,
      borderWidth: isRoot ? 3 : 2,
      borderRadius: 8,
      shadowBlur: isRoot ? 8 : (node.score >= 85 ? 6 : 0),
      shadowColor: isRoot ? '#3b82f6' : (node.score >= 85 ? '#f59e0b' : 'transparent')
    },
    label: {
      show: true,
      position: 'inside',
      fontSize: isRoot ? 14 : 11,
      fontWeight: isRoot ? 'bold' : 'normal',
      color: textColor,
      lineHeight: isRoot ? 20 : 16,
      padding: [isRoot ? 8 : 4, isRoot ? 12 : 6],
      overflow: 'break',
      width: isRoot ? 160 : 130
    },
    _raw: node
  }
  
  if (!isLeaf && node.children) {
    result.children = node.children.map(child => toEChartsTree(child, false))
  }
  
  return result
}

function renderChart() {
  if (!chart) return

  const tree = currentTree.value
  if (!tree) {
    chart.clear()
    return
  }

  const treeData = toEChartsTree(tree, true)
  
  const option = {
    backgroundColor: '#f8fafc',
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (params) => {
        const raw = params.data?._raw
        if (!raw) return params.name
        let html = `<div style="font-weight:bold;margin-bottom:4px;font-size:14px;">${raw.name}</div>`
        html += `<div style="color:#64748b;font-size:12px;">${raw.desc || ''}</div>`
        if (raw.score) html += `<div style="color:#f59e0b;margin-top:6px;font-size:13px;">⭐ 得分: ${raw.score}分</div>`
        return html
      }
    },
    series: [{
      type: 'tree',
      data: [treeData],
      top: '5%',
      left: '5%',
      bottom: '10%',
      right: '5%',
      symbolSize: [160, 70],
      orient: 'TB',
      edgeShape: 'curve',
      roam: true,
      initialTreeDepth: 2,
      lineStyle: { color: '#94a3b8', width: 2, curveness: 0.5 },
      expandAndCollapse: true,
      animationDuration: 500,
      emphasis: { focus: 'descendant', scale: true }
    }]
  }
  
  chart.setOption(option, true)
}

function initChart() {
  if (!chartRef.value) return
  if (chart) chart.dispose()
  chart = echarts.init(chartRef.value)
  renderChart()
  
  chart.on('click', (params) => {
    if (params.data && params.data._raw) {
      selectedNode.value = params.data._raw
      showDetailDrawer.value = false
    }
  })
  
  window.addEventListener('resize', () => chart?.resize())
}

async function loadDecisionTree() {
  const sid = sessionId.value || store.currentSessionId || localStorage.getItem('sc_currentSessionId') || ''
  sessionId.value = sid
  if (!sid) {
    currentTree.value = null
    firstLevelScores.value = []
    experimentId.value = ''
    nextTick(() => renderChart())
    return
  }
  loading.value = true
  try {
    const response = await getDecisionTreeBySession(sid)
    const payload = unwrapApiData(response) || {}
    currentTree.value = payload.tree || null
    firstLevelScores.value = Array.isArray(payload.first_level_scores) ? payload.first_level_scores : []
    experimentId.value = payload.experiment_id || ''
    goalText.value = payload.goal || ''
  } catch (e) {
    console.warn('[DecisionTree] loadDecisionTree failed:', e)
    const message = e?.response?.data?.message || e?.message || '加载决策树失败'
    ElMessage.warning(message)
    currentTree.value = null
    firstLevelScores.value = []
    experimentId.value = ''
  } finally {
    loading.value = false
    nextTick(() => renderChart())
  }
}

function refreshTree() {
  selectedNode.value = null
  loadDecisionTree()
}

onMounted(() => {
  nextTick(() => {
    initChart()
    loadDecisionTree()
  })
})

onBeforeUnmount(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<style scoped>
.supply-chain-page {
  box-sizing: border-box;
  padding: 16px 20px 32px;
  background-color: #f5f7fa;
  min-height: 100%;
  height: auto;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  flex-shrink: 0;
}
.tl-left { display: flex; flex-direction: column; }
.page-title { font-size: 18px; font-weight: 700; color: #1e293b; }
.page-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
.tl-center { flex: 1; display: flex; justify-content: center; }
.tl-right { display: flex; align-items: center; gap: 16px; }

.score-panel {
  background: #fff;
  padding: 14px 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.score-header { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }
.score-list { display: flex; gap: 16px; flex-wrap: wrap; }
.score-card {
  flex: 1;
  min-width: 170px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}
.score-card.best { border-color: #f59e0b; background: #fffbeb; }
.score-name { font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
.score-value-group { display: flex; align-items: baseline; gap: 2px; margin-bottom: 8px; }
.score-value { font-size: 28px; font-weight: 800; color: #1e293b; }
.score-card.best .score-value { color: #d97706; }
.score-unit { font-size: 12px; color: #94a3b8; }
.score-tag { margin-top: 8px; }

.tree-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  min-height: 500px;
  margin-bottom: 20px;
}
.tree-header {
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  background: #fafbfc;
  border-bottom: 1px solid #e8edf2;
  flex-shrink: 0;
}
.tree-hint { font-size: 11px; color: #94a3b8; margin-left: auto; float: right; font-weight: normal; }
.tree-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 450px;
}
.tree-chart {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.footer-detail {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
  border-top: 1px solid #e8edf2;
  margin-top: auto;
  flex-shrink: 0;
}
.footer-detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid #f0f2f5;
}
.footer-detail-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
}
.close-btn {
  color: #94a3b8;
}
.footer-detail-body {
  padding: 16px 20px;
}
.footer-detail-desc {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
  margin-bottom: 12px;
}
.footer-detail-score {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 10px;
}
.footer-detail-score strong {
  font-size: 18px;
  margin-left: 8px;
}
.footer-detail-children {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #64748b;
}
.view-detail-btn {
  margin-top: 12px;
  padding: 0;
}

.drawer-content { display: flex; flex-direction: column; height: 100%; }
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8edf2;
  background: #fafbfc;
}
.drawer-title { font-size: 16px; font-weight: 700; color: #1e293b; }
.drawer-body { flex: 1; padding: 20px; overflow-y: auto; }
.detail-name { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
.detail-desc { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 20px; }
.detail-section { margin: 16px 0; }
.detail-text { font-size: 13px; color: #475569; line-height: 1.6; background: #f8fafc; padding: 14px; border-radius: 8px; }
.score-big { font-size: 48px; font-weight: 800; color: #f59e0b; text-align: center; margin: 16px 0; }
.score-reason { font-size: 13px; color: #64748b; text-align: center; }
.child-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 8px;
}
</style>
