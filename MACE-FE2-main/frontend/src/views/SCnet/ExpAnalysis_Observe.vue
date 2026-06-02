<template>
  <div class="post-observe-page">
    <section class="page-head">
      <div>
        <p class="eyebrow">SCNET OBSERVE ANALYSIS</p>
        <h1>观察分析</h1>
        <p class="subtitle">基于事中供应链结果进行多维度观察，评估系统状态、指标变化与演化趋势。</p>
      </div>
    </section>

    <div class="observe-layout">
      <!-- ======== 左：实验案例选择 ======== -->
      <section class="case-select-panel">
        <div class="case-select-grid">
          <!-- 实验案例库（文件树） -->
          <aside class="case-library">
            <div class="library-head">
              <el-icon><Folder /></el-icon>
              <span>实验案例库</span>
            </div>
            <div class="library-tree">
              <div
                v-for="folder in caseFolders"
                :key="folder.id"
                class="tree-folder"
              >
                <div
                  class="tree-folder-head"
                  :class="{ expanded: folder.expanded }"
                  @click="folder.expanded = !folder.expanded"
                >
                  <el-icon><component :is="folderToggleIcon(folder.expanded)" /></el-icon>
                  <el-icon><FolderOpened v-if="folder.expanded" /><Folder v-else /></el-icon>
                  <span class="folder-name">{{ folder.label }}</span>
                  <span class="folder-count">{{ folder.children.length }}</span>
                </div>
                <div v-show="folder.expanded" class="tree-folder-children">
                  <div
                    v-for="child in folder.children"
                    :key="child.id"
                    class="tree-leaf"
                    :class="{ active: selectedCaseId === child.id }"
                    @click="selectCase(child)"
                  >
                    <el-icon><Document /></el-icon>
                    <span class="leaf-name">{{ child.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <!-- 当前实验 -->
          <div class="current-experiment">
            <!-- 上方面板：当前实验信息 -->
            <div class="info-card info-card--primary">
              <div class="info-card-head">
                <el-icon><DataAnalysis /></el-icon>
                <span>当前实验</span>
                <el-tag v-if="currentExperiment" size="small" :type="currentExperiment.completed ? 'success' : 'warning'" round>
                  {{ currentExperiment.completed ? '已完成' : '进行中' }}
                </el-tag>
              </div>
              <div class="info-card-body">
                <div class="info-row">
                  <span class="info-label">实验名</span>
                  <span class="info-value">{{ currentExperiment?.name || '--' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">是否完成</span>
                  <span class="info-value">{{ currentExperiment?.completed ? '是' : '否' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">完成率</span>
                  <span class="info-value">{{ currentExperiment?.completionRate || '--' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">实验方法</span>
                  <span class="info-value">{{ currentExperiment?.method || '--' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">订单积压率</span>
                  <span class="info-value">{{ currentExperiment?.backlogRate || '--' }}</span>
                </div>
              </div>
            </div>

            <!-- 下方面板：选中案例信息 -->
            <div class="info-card info-card--secondary">
              <div class="info-card-head">
                <el-icon><Collection /></el-icon>
                <span>{{ selectedCase ? selectedCase.name : '未选择案例' }}</span>
              </div>
              <div class="info-card-body">
                <div class="info-row">
                  <span class="info-label">实验名</span>
                  <span class="info-value" :class="{ muted: !selectedCase }">{{ selectedCase?.name || '--' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">是否完成</span>
                  <span class="info-value" :class="{ muted: !selectedCase }">{{ selectedCase ? (selectedCase.completed ? '是' : '否') : '--' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">完成率</span>
                  <span class="info-value" :class="{ muted: !selectedCase }">{{ selectedCase?.completionRate || '--' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">实验方法</span>
                  <span class="info-value" :class="{ muted: !selectedCase }">{{ selectedCase?.method || '--' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">订单积压率</span>
                  <span class="info-value" :class="{ muted: !selectedCase }">{{ selectedCase?.backlogRate || '--' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ======== 右：实验案例对比信息 ======== -->
      <section class="compare-panel">
        <div class="compare-inner">
          <header class="compare-head">
            <div class="compare-head-left">
              <el-icon :size="18"><TrendCharts /></el-icon>
              <span>实验案例对比</span>
            </div>
            <div class="compare-head-actions">
              <el-tag size="small" type="info" round>对比视图</el-tag>
              <el-dropdown trigger="click" @command="exportComparisonReport">
                <el-button type="primary" plain size="small" :icon="Download">
                  导出报告
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="html">HTML（.html）</el-dropdown-item>
                    <el-dropdown-item command="txt">文本（.txt）</el-dropdown-item>
                    <el-dropdown-item command="pdf">PDF（打印保存）</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </header>

          <div class="compare-body">
            <div v-if="!selectedCase" class="compare-empty">
              <el-icon :size="44"><TrendCharts /></el-icon>
              <p>选择实验案例后查看对比详情</p>
              <span>在左侧实验案例库中点击任意案例，即可在此处查看当前实验与所选案例的指标对比</span>
            </div>

            <div v-else class="compare-content">
              <!-- 参数对比行 -->
              <div class="card-pair-row">
                <div class="cmp-card cmp-card--blue">
                  <div class="cmp-card-head">
                    <el-icon><Setting /></el-icon>
                    <span>当前实验 · 实验参数</span>
                    <div class="cmp-card-pip blue"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="p in paramFields" :key="p.key">
                      <span class="cmp-kv-label">{{ p.label }}</span>
                      <span class="cmp-kv-value">{{ currentExperiment[p.key] || '--' }}</span>
                    </div>
                  </div>
                </div>

                <div class="cmp-card cmp-card--purple">
                  <div class="cmp-card-head">
                    <el-icon><Setting /></el-icon>
                    <span>对比案例 · 实验参数</span>
                    <div class="cmp-card-pip purple"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="p in paramFields" :key="p.key">
                      <span class="cmp-kv-label">{{ p.label }}</span>
                      <span class="cmp-kv-value">{{ selectedCase[p.key] || '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 结果对比行 -->
              <div class="card-pair-row">
                <div class="cmp-card cmp-card--teal">
                  <div class="cmp-card-head">
                    <el-icon><DataLine /></el-icon>
                    <span>当前实验 · 实验结果</span>
                    <div class="cmp-card-pip teal"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="r in resultFields" :key="r.key">
                      <span class="cmp-kv-label">{{ r.label }}</span>
                      <span class="cmp-kv-value">{{ currentExperiment[r.key] || '--' }}</span>
                    </div>
                  </div>
                </div>

                <div class="cmp-card cmp-card--amber">
                  <div class="cmp-card-head">
                    <el-icon><DataLine /></el-icon>
                    <span>对比案例 · 实验结果</span>
                    <div class="cmp-card-pip amber"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="r in resultFields" :key="r.key">
                      <span class="cmp-kv-label">{{ r.label }}</span>
                      <span class="cmp-kv-value">{{ selectedCase[r.key] || '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 关键事件节点决策回放 -->
              <div class="cmp-card cmp-card--large cmp-card--slate">
                <div class="cmp-card-head">
                  <el-icon><VideoPlay /></el-icon>
                  <span>关键事件节点决策回放</span>
                  <div class="cmp-card-pip slate"></div>
                </div>
                <div class="cmp-card-body">
                  <div class="event-timeline">
                    <div class="event-node" v-for="(evt, idx) in activeEventNodes" :key="idx">
                      <div class="event-dot" :class="evt.type"></div>
                      <div class="event-info">
                        <strong>{{ evt.title }}</strong>
                        <span class="event-time">第 {{ evt.step }} 轮</span>
                        <p class="event-desc">{{ evt.desc }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowDown, ArrowRight, Collection, DataAnalysis, DataLine, Document, Download, Folder,
  FolderOpened, Setting, TrendCharts, VideoPlay
} from '@element-plus/icons-vue'
import { getExperiments, getExperimentDetail, getExperimentReport } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'

const caseFolders = reactive([
  {
    id: 'f1',
    label: '事中实验',
    expanded: true,
    children: [
      { id: 'c1', name: 'Exp-01 需求冲击基线', completed: true, completionRate: '68.4%', method: 'Multi-Agent 仿真 (native)', backlogRate: '高积压', collaboration: '18 次', resilience: '0.42', demandLevel: '需求强度 1.25x', capacityPlan: '产能保持基线区间', intervention: '不干预，沿用原始参数' },
      { id: 'c2', name: 'Exp-02 扩产策略对照', completed: true, completionRate: '83.1%', method: 'Multi-Agent 仿真 (native)', backlogRate: '-22.5%', collaboration: '31 次', resilience: '0.71', demandLevel: '需求强度 1.25x', capacityPlan: '阶梯式扩产', intervention: '制造总产能 +15%' },
      { id: 'c3', name: 'Exp-03 协作优化方案', completed: false, completionRate: '--', method: 'Multi-Agent 仿真 (mcml)', backlogRate: '--', collaboration: '--', resilience: '--', demandLevel: '需求强度 1.40x', capacityPlan: '瓶颈工厂扩产', intervention: '工厂协作范围 +20%' }
    ]
  },
  {
    id: 'f2',
    label: '反事实实验',
    expanded: true,
    children: [
      { id: 'c4', name: 'CF-01 产能+15%', completed: true, completionRate: '86.8%', method: '反事实 (阶梯扩产)', backlogRate: '-28.6%', collaboration: '36 次', resilience: '0.78', demandLevel: '需求强度 1.25x', capacityPlan: '阶梯式扩产', intervention: '制造总产能 +15%' },
      { id: 'c5', name: 'CF-02 库存扩容 25%', completed: false, completionRate: '--', method: '反事实 (库存调整)', backlogRate: '--', collaboration: '--', resilience: '--', demandLevel: '需求强度 1.10x', capacityPlan: '保持基线', intervention: '库存容量上限 +25%' }
    ]
  }
])

const selectedCaseId = ref(null)
const selectedCase = ref(null)

const paramFields = [
  { key: 'demandLevel', label: '需求强度' },
  { key: 'capacityPlan', label: '产能方案' },
  { key: 'intervention', label: '干预变量' },
  { key: 'method', label: '实验方法' }
]

const resultFields = [
  { key: 'completionRate', label: '完成率' },
  { key: 'backlogRate', label: '订单积压率' },
  { key: 'collaboration', label: '协作次数' },
  { key: 'resilience', label: '韧性指数' }
]

const defaultEventNodes = [
  { title: '需求冲击触发', step: 4, type: 'red', desc: '市场订单激增，Level 1 订单量上升 25%' },
  { title: '产能瓶颈暴露', step: 8, type: 'orange', desc: '制造商工厂利用率达上限，订单积压开始累积' },
  { title: '协作调度启动', step: 12, type: 'blue', desc: '跨厂协作范围扩大，订单动态重分配' },
  { title: '完成率回稳', step: 18, type: 'green', desc: '扩产策略生效，履约完成率逐步恢复' }
]

const activeEventNodes = ref(defaultEventNodes)

const currentExperiment = reactive({
  name: 'Exp-01 需求冲击基线',
  completed: true,
  completionRate: '68.4%',
  method: 'Multi-Agent 仿真 (native)',
  backlogRate: '高积压',
  collaboration: '18 次',
  resilience: '0.42',
  demandLevel: '需求强度 1.25x',
  capacityPlan: '产能保持基线区间',
  intervention: '不干预，沿用原始参数'
})

function selectCase(child) {
  selectedCaseId.value = child.id
  selectedCase.value = child
  activeEventNodes.value = child.eventNodes || defaultEventNodes
}

const escapeHtml = (value) => String(value ?? '--')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const reportRow = (label, currentValue, compareValue) => `
  <tr>
    <th>${escapeHtml(label)}</th>
    <td>${escapeHtml(currentValue)}</td>
    <td>${escapeHtml(compareValue)}</td>
  </tr>
`

const reportRowsData = () => [
  { label: '实验名称', current: currentExperiment.name, compare: selectedCase.value.name },
  { label: '是否完成', current: currentExperiment.completed ? '是' : '否', compare: selectedCase.value.completed ? '是' : '否' },
  ...paramFields.map(field => ({
    label: field.label,
    current: currentExperiment[field.key],
    compare: selectedCase.value[field.key]
  })),
  ...resultFields.map(field => ({
    label: field.label,
    current: currentExperiment[field.key],
    compare: selectedCase.value[field.key]
  }))
]

const buildComparisonReportHtml = () => {
  const rows = reportRowsData()
    .map(row => reportRow(row.label, row.current, row.compare))
    .join('')

  const events = activeEventNodes.value.map(event => `
    <li>
      <strong>${escapeHtml(event.title)}</strong>
      <span>第 ${escapeHtml(event.step)} 轮</span>
      <p>${escapeHtml(event.desc)}</p>
    </li>
  `).join('')

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>观察分析对比报告</title>
  <style>
    body { margin: 0; padding: 28px; color: #0f172a; font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.6; background: #f8fafc; }
    main { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px; }
    h1 { margin: 0 0 8px; font-size: 26px; }
    .meta { color: #64748b; margin-bottom: 22px; }
    table { width: 100%; border-collapse: collapse; margin: 18px 0 24px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { width: 180px; background: #f1f5f9; }
    thead th { background: #dbeafe; color: #1e40af; }
    h2 { margin: 24px 0 10px; font-size: 18px; }
    li { margin-bottom: 12px; }
    li span { display: inline-block; margin-left: 10px; color: #64748b; font-size: 13px; }
    li p { margin: 4px 0 0; color: #334155; }
  </style>
</head>
<body>
  <main>
    <h1>观察分析对比报告</h1>
    <div class="meta">生成时间：${new Date().toLocaleString()}</div>
    <h2>实验案例对比</h2>
    <table>
      <thead>
        <tr><th>对比项</th><th>当前实验</th><th>对比案例</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>关键事件节点回放</h2>
    <ol>${events}</ol>
  </main>
</body>
</html>`
}

const buildComparisonReportText = () => {
  const lines = [
    '观察分析对比报告',
    `生成时间：${new Date().toLocaleString()}`,
    '',
    '一、实验案例对比',
    ...reportRowsData().map(row => `${row.label}：当前实验=${row.current ?? '--'}；对比案例=${row.compare ?? '--'}`),
    '',
    '二、关键事件节点回放',
    ...activeEventNodes.value.map((event, index) => (
      `${index + 1}. ${event.title}（第 ${event.step} 轮）：${event.desc}`
    ))
  ]

  return lines.join('\n')
}

const downloadTextFile = (content, filename, type) => {
  const blob = new Blob([content], { type })
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(blob)
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}

const openPdfPrintReport = () => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    ElMessage.warning('浏览器拦截了PDF打印窗口，请允许弹窗后重试')
    return
  }

  printWindow.document.open()
  printWindow.document.write(buildComparisonReportHtml())
  printWindow.document.close()
  printWindow.focus()
  window.setTimeout(() => {
    printWindow.print()
  }, 300)
  ElMessage.success('已打开PDF打印窗口，请选择“保存为PDF”')
}

const exportComparisonReport = (format = 'html') => {
  if (!selectedCase.value) {
    ElMessage.warning('请先在左侧选择一个对比案例，再导出报告')
    return
  }

  const safeName = String(selectedCase.value.name || 'observe-report').replace(/[\\/:*?"<>|]/g, '_')
  if (format === 'txt') {
    downloadTextFile(
      buildComparisonReportText(),
      `观察分析对比报告_${safeName}.txt`,
      'text/plain;charset=utf-8'
    )
    ElMessage.success('观察分析对比报告已导出为TXT')
    return
  }

  if (format === 'pdf') {
    openPdfPrintReport()
    return
  }

  downloadTextFile(
    buildComparisonReportHtml(),
    `观察分析对比报告_${safeName}.html`,
    'text/html;charset=utf-8'
  )
  ElMessage.success('观察分析对比报告已导出为HTML')
}

const folderToggleIcon = (expanded) => expanded ? ArrowDown : ArrowRight

const formatPercent = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return `${(num * 100).toFixed(1)}%`
}

const formatSignedPercent = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  const sign = num > 0 ? '+' : ''
  return `${sign}${(num * 100).toFixed(1)}%`
}

const toNumber = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const summarizeBacklog = (metrics = {}) => {
  const total = toNumber(metrics.total_orders)
  const completed = toNumber(metrics.completed_orders)
  if (total <= 0) return '--'
  const backlogRate = Math.max(total - completed, 0) / total
  return `${(backlogRate * 100).toFixed(1)}%`
}

const findBestIteration = (iterations = []) => {
  if (!Array.isArray(iterations) || !iterations.length) return null
  return iterations.reduce((best, item) => {
    const bestScore = toNumber(best?.feedback?.overall_score, -1)
    const itemScore = toNumber(item?.feedback?.overall_score, -1)
    return itemScore > bestScore ? item : best
  }, iterations[0])
}

const factoryCapacityText = (params = {}) => {
  const range = params.factory_capacity_range || params.capacity_range
  if (Array.isArray(range) && range.length >= 2) {
    return `产能区间 ${Number(range[0]).toFixed(0)}-${Number(range[1]).toFixed(0)}`
  }
  if (params.capacity_multiplier) {
    return `产能倍率 ${Number(params.capacity_multiplier).toFixed(2)}x`
  }
  return '产能保持基线区间'
}

const interventionText = (params = {}) => {
  const adjusted = params.adjusted_param
  const ratio = params.adjustment_ratio
  if (adjusted === 'factory_capacity_range') return `制造总产能 ${formatSignedPercent(ratio)}`
  if (adjusted === 'order_multiplier') return `需求强度 ${formatSignedPercent(ratio)}`
  if (adjusted === 'reproduction_threshold') return `扩张阈值 ${formatSignedPercent(ratio)}`
  return '沿用实验参数'
}

const buildEventNodes = (iteration = {}) => {
  const metrics = iteration.simulation_result?.metrics || {}
  const params = iteration.task?.parameters || {}
  const completion = formatPercent(metrics.order_completion_rate)
  const backlog = summarizeBacklog(metrics)
  return [
    {
      title: '需求参数加载',
      step: 1,
      type: 'red',
      desc: `需求强度设为 ${Number(params.order_multiplier || 1).toFixed(2)}x，开始观察订单压力。`
    },
    {
      title: '产能参数执行',
      step: Math.max(1, Number(iteration.iteration || 1)),
      type: 'orange',
      desc: `${factoryCapacityText(params)}，监测制造侧承载能力。`
    },
    {
      title: '仿真结果回收',
      step: 21,
      type: 'blue',
      desc: `完成率 ${completion}，订单积压率 ${backlog}。`
    },
    {
      title: '策略复盘',
      step: 22,
      type: 'green',
      desc: `综合得分 ${Number(iteration.feedback?.overall_score || 0).toFixed(3)}，用于后续反事实对比。`
    }
  ]
}

const buildCaseFromIteration = (iteration, experiment, index, prefix = 'Exp') => {
  const params = iteration?.task?.parameters || {}
  const metrics = iteration?.simulation_result?.metrics || {}
  const score = toNumber(iteration?.feedback?.overall_score)
  const iterationNo = iteration?.iteration || index + 1
  return {
    id: `${prefix.toLowerCase()}-${experiment.experiment_id}-${iterationNo}`,
    name: `${prefix}-${String(index + 1).padStart(2, '0')} ${experiment.experiment_id} #${iterationNo}`,
    completed: experiment.status === 'completed',
    completionRate: formatPercent(metrics.order_completion_rate),
    method: `Multi-Agent 仿真 (${params.type || 'native'})`,
    backlogRate: summarizeBacklog(metrics),
    collaboration: `${metrics.cooperation_count ?? 0} 次`,
    resilience: score ? score.toFixed(2) : '--',
    demandLevel: `需求强度 ${Number(params.order_multiplier || 1).toFixed(2)}x`,
    capacityPlan: factoryCapacityText(params),
    intervention: interventionText(params),
    eventNodes: buildEventNodes(iteration)
  }
}

const experimentRelevanceScore = (item = {}) => {
  const goal = String(item.goal || '')
  let score = 0
  if (/供应链|产能|订单|制造|库存|工厂/.test(goal)) score += 1000
  score += Number(item.iterations || 0) * 10
  score += new Date(item.timestamp || 0).getTime() / 1000000000000
  return score
}

const applyBackendCases = async () => {
  try {
    const experimentsPayload = await getExperiments()
    const experiments = (unwrapApiData(experimentsPayload) || [])
      .filter(item => item && item.status === 'completed')
      .sort((a, b) => experimentRelevanceScore(b) - experimentRelevanceScore(a))
      .slice(0, 4)

    if (!experiments.length) return

    const details = []
    for (const experiment of experiments) {
      const detailPayload = await getExperimentDetail(experiment.experiment_id)
      const reportPayload = await getExperimentReport(experiment.experiment_id).catch(() => null)
      details.push({
        meta: experiment,
        detail: unwrapApiData(detailPayload),
        report: reportPayload ? unwrapApiData(reportPayload) : null
      })
    }

    const duringCases = details
      .map(({ meta, detail }, index) => {
        const bestIteration = findBestIteration(detail?.iterations || [])
        return bestIteration ? buildCaseFromIteration(bestIteration, meta, index, 'Exp') : null
      })
      .filter(Boolean)

    const latest = details[0]
    const latestIterations = latest?.detail?.iterations || []
    const counterfactualCases = latestIterations
      .map((iteration, index) => buildCaseFromIteration(iteration, latest.meta, index, 'CF'))
      .sort((a, b) => Number(b.resilience || 0) - Number(a.resilience || 0))
      .slice(0, 5)

    if (duringCases.length) {
      Object.assign(currentExperiment, duringCases[0])
    }

    caseFolders.splice(
      0,
      caseFolders.length,
      {
        id: 'f1',
        label: '事中实验',
        expanded: true,
        children: duringCases.length ? duringCases : caseFolders[0].children
      },
      {
        id: 'f2',
        label: '反事实实验',
        expanded: true,
        children: counterfactualCases.length ? counterfactualCases : caseFolders[1].children
      }
    )

    if (!selectedCase.value && counterfactualCases[0]) {
      selectCase(counterfactualCases[0])
    }
  } catch (error) {
    console.warn('[ObserveAnalysis] 后端案例数据加载失败，使用本地静态数据:', error)
  }
}

onMounted(() => {
  applyBackendCases()
})
</script>

<style scoped>
.post-observe-page {
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f6f8fb;
  color: #0f172a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* ---- 页面标题 ---- */
.page-head {
  flex: 0 0 auto;
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
  color: #3867f2;
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

/* ---- 主布局 ---- */
.observe-layout {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-height: 0;
}

/* ---- 左半 ---- */
.case-select-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  overflow: hidden;
  display: flex;
  min-height: 0;
}

.case-select-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  min-height: 0;
}

/* ---- 实验案例库（文件树） ---- */
.case-library {
  border-right: 1px solid #eef2f7;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.library-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
  background: #f8fafc;
}

.library-head .el-icon {
  color: #3b82f6;
  font-size: 16px;
}

.library-tree {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 6px 0;
}

.tree-folder { margin-bottom: 2px; }

.tree-folder-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  transition: background 0.15s;
}

.tree-folder-head:hover { background: #f1f5f9; }

.tree-folder-head .el-icon {
  font-size: 14px;
  color: #94a3b8;
  flex-shrink: 0;
}

.folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-count {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #64748b;
  font-weight: 600;
}

.tree-folder-children { padding-left: 0; }

.tree-leaf {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 36px;
  cursor: pointer;
  font-size: 12px;
  color: #475569;
  transition: background 0.15s;
}

.tree-leaf:hover { background: #f8fafc; }

.tree-leaf.active {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 700;
}

.tree-leaf .el-icon {
  font-size: 14px;
  color: #cbd5e1;
  flex-shrink: 0;
}

.tree-leaf.active .el-icon { color: #3b82f6; }

.leaf-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leaf-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 700;
  flex-shrink: 0;
}

.leaf-badge.done { background: #dcfce7; color: #15803d; }
.leaf-badge.pending { background: #fef3c7; color: #92400e; }

/* ---- 当前实验（上下两面板） ---- */
.current-experiment {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  min-height: 0;
  overflow-y: auto;
}

.info-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.info-card--primary { border-top: 3px solid #3b82f6; }
.info-card--secondary { border-top: 3px solid #8b5cf6; }

.info-card-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
  background: #fafbfc;
}

.info-card-head .el-icon { font-size: 15px; color: #64748b; }
.info-card--primary .info-card-head .el-icon { color: #3b82f6; }
.info-card--secondary .info-card-head .el-icon { color: #8b5cf6; }

.info-card-body {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed #f1f5f9;
}

.info-row:last-child { border-bottom: none; }

.info-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.info-value {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.info-value.muted { color: #cbd5e1; }

/* ---- 右半：对比面板 ---- */
.compare-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.compare-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

.compare-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eef2f7;
  background: #f8fafc;
}

.compare-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
}

.compare-head-left .el-icon { color: #8b5cf6; }

.compare-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.compare-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}

.compare-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #94a3b8;
  gap: 4px;
  padding: 20px;
}

.compare-empty .el-icon { color: #e2e8f0; }

.compare-empty p {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #64748b;
}

.compare-empty span {
  font-size: 12px;
  font-weight: 600;
  max-width: 300px;
  line-height: 1.5;
}

/* ---- 对比内容 ---- */
.compare-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---- 卡片对行 ---- */
.card-pair-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* ---- 通用卡片 ---- */
.cmp-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cmp-card--large {
  flex: 1 1 auto;
  min-height: 0;
}

.cmp-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
  background: #fafbfc;
  position: relative;
}

.cmp-card-head .el-icon { font-size: 15px; flex-shrink: 0; }

.cmp-card-pip {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-left: auto;
  flex-shrink: 0;
}

.cmp-card-pip.blue   { background: #3b82f6; }
.cmp-card-pip.purple { background: #8b5cf6; }
.cmp-card-pip.teal   { background: #0d9488; }
.cmp-card-pip.amber  { background: #d97706; }
.cmp-card-pip.slate  { background: #475569; }

/* ---- 蓝色卡片（当前实验参数） ---- */
.cmp-card--blue { border-top: 3px solid #3b82f6; }
.cmp-card--blue .cmp-card-head { background: linear-gradient(180deg, #eff6ff 0%, #fafbfc 100%); }
.cmp-card--blue .cmp-card-head .el-icon { color: #3b82f6; }

/* ---- 紫色卡片（对比案例参数） ---- */
.cmp-card--purple { border-top: 3px solid #8b5cf6; }
.cmp-card--purple .cmp-card-head { background: linear-gradient(180deg, #f5f3ff 0%, #fafbfc 100%); }
.cmp-card--purple .cmp-card-head .el-icon { color: #8b5cf6; }

/* ---- 青色卡片（当前实验结果） ---- */
.cmp-card--teal { border-top: 3px solid #0d9488; }
.cmp-card--teal .cmp-card-head { background: linear-gradient(180deg, #f0fdfa 0%, #fafbfc 100%); }
.cmp-card--teal .cmp-card-head .el-icon { color: #0d9488; }

/* ---- 琥珀卡片（对比案例结果） ---- */
.cmp-card--amber { border-top: 3px solid #d97706; }
.cmp-card--amber .cmp-card-head { background: linear-gradient(180deg, #fffbeb 0%, #fafbfc 100%); }
.cmp-card--amber .cmp-card-head .el-icon { color: #d97706; }

/* ---- 深灰卡片（事件回放） ---- */
.cmp-card--slate { border-top: 3px solid #475569; }
.cmp-card--slate .cmp-card-head { background: linear-gradient(180deg, #f8fafc 0%, #fafbfc 100%); }
.cmp-card--slate .cmp-card-head .el-icon { color: #475569; }

/* ---- 卡片内容 ---- */
.cmp-card-body {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
}

.cmp-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px dashed #f1f5f9;
}

.cmp-kv:last-child { border-bottom: none; }

.cmp-kv-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.cmp-kv-value {
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
}

/* ---- 事件时间线 ---- */
.event-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-left: 6px;
}

.event-node {
  display: flex;
  gap: 12px;
  padding: 8px 0 8px 2px;
  position: relative;
}

.event-node:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 28px;
  bottom: -2px;
  width: 2px;
  background: #e2e8f0;
}

.event-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
}

.event-dot.red    { background: #ef4444; }
.event-dot.orange { background: #f59e0b; }
.event-dot.blue   { background: #3b82f6; }
.event-dot.green  { background: #22c55e; }

.event-info {
  flex: 1;
  min-width: 0;
}

.event-info strong {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
}

.event-time {
  display: inline-block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
}

.event-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
}

/* ---- 滚动条 ---- */
.library-tree::-webkit-scrollbar,
.current-experiment::-webkit-scrollbar,
.compare-body::-webkit-scrollbar {
  width: 5px;
}

.library-tree::-webkit-scrollbar-thumb,
.current-experiment::-webkit-scrollbar-thumb,
.compare-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}
</style>
