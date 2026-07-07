<template>
  <div class="post-intervention-page">
    <section class="page-head">
      <div>
        <p class="eyebrow">URANIUM SUPPLY CHAIN · INTERVENTION & ANOMALY</p>
        <h1>干预分析与异常检测</h1>
        <p class="subtitle">基于铀供应链实验结果进行干预策略对比评估，同时检测实验过程中的指标突变、极端事件和网络异常。</p>
      </div>
      <div class="head-actions">
        <div class="stat-item" v-if="anomalyCount > 0">
          <span>异常总数</span><strong>{{ anomalyCount }}</strong>
        </div>
        <div class="stat-item" v-if="highSeverityCount > 0">
          <span>高严重度</span><strong style="color:#ef4444">{{ highSeverityCount }}</strong>
        </div>
      </div>
    </section>

    <!-- 异常概览卡片 -->
    <section class="overview-strip" v-if="anomaliesData">
      <article v-for="item in overviewCards" :key="item.label" class="overview-card">
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span><strong>{{ item.value }}</strong>
      </article>
    </section>

    <div class="intervention-layout">
      <!-- ======== 左：干预策略选择 ======== -->
      <section class="case-select-panel">
        <div class="case-select-grid">
          <!-- 干预策略库（文件树） -->
          <aside class="case-library">
            <div class="library-head">
              <el-icon><Folder /></el-icon>
              <span>干预策略库</span>
            </div>
            <div class="slot-switch">
              <el-radio-group v-model="activeStrategySlot" size="small">
                <el-radio-button label="primary">选择策略A</el-radio-button>
                <el-radio-button label="secondary">选择策略B</el-radio-button>
              </el-radio-group>
            </div>
            <div class="library-tree">
              <div
                v-for="folder in strategyFolders"
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
                    :class="{
                      active: isStrategySelected(child.id),
                      'active-primary': currentStrategy.id === child.id,
                      'active-secondary': selectedStrategy?.id === child.id
                    }"
                    @click="selectStrategy(child)"
                  >
                    <el-icon><Document /></el-icon>
                    <span class="leaf-name">{{ child.name }}</span>
                    <span v-if="currentStrategy.id === child.id" class="leaf-badge leaf-badge--primary">A</span>
                    <span v-if="selectedStrategy?.id === child.id" class="leaf-badge leaf-badge--secondary">B</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <!-- 当前干预策略 -->
          <div class="current-experiment">
            <!-- 上方面板：对比策略A信息 -->
            <div
              class="info-card info-card--primary"
              :class="{ 'info-card--active': activeStrategySlot === 'primary' }"
              @click="setActiveStrategySlot('primary')"
            >
              <div class="info-card-head">
                <div class="info-card-title">
                  <el-icon><DataAnalysis /></el-icon>
                  <span>对比策略 A</span>
                </div>
                <el-tag v-if="activeStrategySlot === 'primary'" size="small" type="primary" round>正在选择</el-tag>
              </div>
              <div class="info-card-body">
                <div class="info-row" v-for="f in strategyInfoFields" :key="f.key">
                  <span class="info-label">{{ f.label }}</span>
                  <span class="info-value">{{ currentStrategy[f.key] || '--' }}</span>
                </div>
              </div>
            </div>

            <!-- 下方面板：对比策略B信息 -->
            <div
              class="info-card info-card--secondary"
              :class="{ 'info-card--active': activeStrategySlot === 'secondary' }"
              @click="setActiveStrategySlot('secondary')"
            >
              <div class="info-card-head">
                <div class="info-card-title">
                  <el-icon><Collection /></el-icon>
                  <span>对比策略 B</span>
                </div>
                <el-tag v-if="activeStrategySlot === 'secondary'" size="small" type="success" round>正在选择</el-tag>
              </div>
              <div class="info-card-body">
                <div class="info-row" v-for="f in strategyInfoFields" :key="f.key">
                  <span class="info-label">{{ f.label }}</span>
                  <span class="info-value" :class="{ muted: !selectedStrategy }">{{ selectedStrategy?.[f.key] || '--' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ======== 右：干预策略对比 ======== -->
      <section class="compare-panel">
        <div class="compare-inner">
          <header class="compare-head">
            <div class="compare-head-left">
              <el-icon :size="18"><TrendCharts /></el-icon>
              <span>干预策略对比</span>
            </div>
            <el-tag size="small" type="info" round>对比视图</el-tag>
          </header>

          <div class="compare-body">
            <div v-if="!currentStrategy.id || !selectedStrategy" class="compare-empty">
              <el-icon :size="44"><TrendCharts /></el-icon>
              <p>选择两个干预策略后查看对比详情</p>
              <span>先指定策略A或策略B，再在左侧干预策略库中点击策略，即可组成可调整的双策略对比</span>
            </div>

            <div v-else class="compare-content">
              <!-- 策略A横向信息行 -->
              <div class="card-pair-row">
                <div class="cmp-card cmp-card--blue">
                  <div class="cmp-card-head">
                    <el-icon><Setting /></el-icon>
                    <span>策略A · 策略参数</span>
                    <div class="cmp-card-pip blue"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="p in strategyParamFields" :key="p.key">
                      <span class="cmp-kv-label">{{ p.label }}</span>
                      <span class="cmp-kv-value">{{ currentStrategy[p.key] || '--' }}</span>
                    </div>
                  </div>
                </div>

                <div class="cmp-card cmp-card--teal">
                  <div class="cmp-card-head">
                    <el-icon><DataLine /></el-icon>
                    <span>策略A · 预期效果</span>
                    <div class="cmp-card-pip teal"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="r in strategyResultFields" :key="r.key">
                      <span class="cmp-kv-label">{{ r.label }}</span>
                      <span class="cmp-kv-value">{{ currentStrategy[r.key] || '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 策略B横向信息行 -->
              <div class="card-pair-row">
                <div class="cmp-card cmp-card--purple">
                  <div class="cmp-card-head">
                    <el-icon><Setting /></el-icon>
                    <span>策略B · 策略参数</span>
                    <div class="cmp-card-pip purple"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="p in strategyParamFields" :key="p.key">
                      <span class="cmp-kv-label">{{ p.label }}</span>
                      <span class="cmp-kv-value">{{ selectedStrategy[p.key] || '--' }}</span>
                    </div>
                  </div>
                </div>

                <div class="cmp-card cmp-card--amber">
                  <div class="cmp-card-head">
                    <el-icon><DataLine /></el-icon>
                    <span>策略B · 预期效果</span>
                    <div class="cmp-card-pip amber"></div>
                  </div>
                  <div class="cmp-card-body">
                    <div class="cmp-kv" v-for="r in strategyResultFields" :key="r.key">
                      <span class="cmp-kv-label">{{ r.label }}</span>
                      <span class="cmp-kv-value">{{ selectedStrategy[r.key] || '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 结构方程可视化：A vs B 因果路径对比 -->
            <div class="sem-panel" v-if="currentStrategy.id && selectedStrategy">
              <div class="sem-head">
                <el-icon><Promotion /></el-icon>
                <span>策略因果路径对比（结构方程图）</span>
                <span class="sem-legend"><span class="sem-dot-a"></span> 策略A（{{ currentStrategy.name }}）</span>
                <span class="sem-legend"><span class="sem-dot-b"></span> 策略B（{{ selectedStrategy.name }}）</span>
              </div>
              <div ref="semChartRef" class="sem-chart"></div>
            </div>

            <div class="runtime-panel">
              <div class="runtime-head">
                <div class="runtime-title">
                  <el-icon><VideoPlay /></el-icon>
                  <span>干预策略实际运行</span>
                </div>
                <div class="runtime-actions">
                  <el-tag size="small" type="info" round>基础实验 · 15轮</el-tag>
                  <el-button
                    type="primary"
                    size="small"
                    :icon="VideoPlay"
                    :loading="runState.running"
                    @click="startInterventionRun"
                  >
                    {{ runState.running ? '运行中' : '开始运行' }}
                  </el-button>
                  <el-dropdown trigger="click" @command="exportRunReport">
                    <el-button size="small" plain :icon="Download" :disabled="!hasRunResults">
                      导出结果
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
              </div>

              <div class="runtime-problem">
                <span>实验问题</span>
                <strong>{{ interventionProblem }}</strong>
              </div>

              <div class="runtime-status-grid">
                <div
                  v-for="slot in strategySlots"
                  :key="slot.key"
                  class="runtime-status-card"
                  :class="`runtime-status-card--${slot.key}`"
                >
                  <div class="runtime-status-top">
                    <span>{{ slot.label }}</span>
                    <el-tag size="small" :type="taskStatusType(runState.tasks[slot.key]?.status)" round>
                      {{ taskStatusText(runState.tasks[slot.key]?.status) }}
                    </el-tag>
                  </div>
                  <strong>{{ slot.strategy?.name || '--' }}</strong>
                  <p>{{ runState.tasks[slot.key]?.taskId || '等待提交实验任务' }}</p>
                </div>
              </div>

              <div v-if="runState.error" class="runtime-alert runtime-alert--error">
                {{ runState.error }}
              </div>
              <div v-else class="runtime-alert">
                {{ runState.message }}
              </div>

              <div v-if="hasRunResults" class="runtime-result">
                <div class="runtime-result-head">
                  <span>运行结果对比</span>
                  <el-tag size="small" type="success" round>已完成</el-tag>
                </div>
                <div class="result-table">
                  <div class="result-row result-row--head">
                    <span>指标</span>
                    <span>策略A</span>
                    <span>策略B</span>
                  </div>
                  <div class="result-row" v-for="row in runComparisonRows" :key="row.key">
                    <span>{{ row.label }}</span>
                    <span :class="{ winner: isBetterRunValue(row, 'primary') }">{{ row.primary }}</span>
                    <span :class="{ winner: isBetterRunValue(row, 'secondary') }">{{ row.secondary }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="runtime-placeholder">
                <el-icon><TrendCharts /></el-icon>
                <span>运行完成后将在这里展示两个干预策略下的完成率、积压、协作与韧性指标。</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ===== 异常检测区域 ===== -->
    <section class="anomaly-section" v-if="anomaliesData">
      <div class="anomaly-grid">
        <div class="anomaly-list-panel">
          <header class="panel-head">
            <el-icon><WarningFilled /></el-icon>
            <span>铀供应链异常事件列表</span>
            <el-select v-model="severityFilter" placeholder="严重度" size="small" clearable style="width:110px;margin-left:auto">
              <el-option label="全部" value="" /><el-option label="高" value="high" /><el-option label="中" value="medium" /><el-option label="低" value="low" />
            </el-select>
          </header>
          <div class="panel-body">
            <div v-if="filteredAnomalies.length === 0" class="empty-hint">暂无检测到的异常事件</div>
            <div v-for="(a, idx) in filteredAnomalies" :key="idx" class="anomaly-item" :class="{ active: selectedAnomalyIndex === a._originalIndex }" @click="selectAnomaly(a._originalIndex)">
              <div class="anomaly-head">
                <el-tag :type="a.severity==='high'?'danger':a.severity==='medium'?'warning':'info'" size="small" effect="dark" round>{{ a.severity==='high'?'高':a.severity==='medium'?'中':'低' }}</el-tag>
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
        </div>
        <div class="anomaly-detail-panel">
          <template v-if="selectedDetail">
            <header class="panel-head">
              <el-icon><DataLine /></el-icon><span>异常详情</span>
              <el-tag :type="selectedDetail.anomaly.severity==='high'?'danger':selectedDetail.anomaly.severity==='medium'?'warning':'info'" size="small" effect="light" round style="margin-left:8px">{{ selectedDetail.anomaly.severity==='high'?'高严重度':selectedDetail.anomaly.severity==='medium'?'中严重度':'低严重度' }}</el-tag>
            </header>
            <div class="detail-body">
              <section class="detail-section"><h4>异常描述</h4><p>{{ selectedDetail.anomaly.description }}</p></section>
              <section class="detail-section"><h4>可能原因</h4><ul><li v-for="c in selectedDetail.analysis.possible_causes" :key="c">{{ c }}</li></ul></section>
              <section class="detail-section"><h4>影响范围</h4><p>{{ selectedDetail.analysis.impact_scope }}</p></section>
              <section class="detail-section"><h4>建议响应</h4><p>{{ selectedDetail.analysis.suggested_response }}</p></section>
              <section class="detail-section" v-if="selectedDetail.related_metrics && Object.keys(selectedDetail.related_metrics).length">
                <h4>关联指标快照</h4>
                <div class="metrics-grid"><div v-for="(val,key) in selectedDetail.related_metrics" :key="key" class="metric-item"><span class="metric-label">{{ key }}</span><span class="metric-value">{{ typeof val==='number'?val.toFixed(1):val }}</span></div></div>
              </section>
            </div>
          </template>
          <div v-else class="detail-empty"><el-icon :size="48"><WarningFilled /></el-icon><p>点击左侧异常事件查看详情与归因分析</p></div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowDown, ArrowRight, Collection, DataAnalysis, DataLine, Document, Download, Folder,
  FolderOpened, Odometer, Promotion, Refresh, Setting, TrendCharts, VideoPlay, WarningFilled
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { runExperiment } from '@/api/scenarioModeling'
import { getQueueHistory } from '@/api/queue'
import { getExperimentDetail, getInterventionStrategies, compareInterventions, getAnomalies, getAnomalyDetail, getExperiments } from '@/api/supplyChain'
import { unwrapApiData } from '@/utils/apiEnvelope'

// 后端加载的策略数据
const backendStrategies = ref([])
const backendComparison = ref(null)
const strategiesLoading = ref(false)
const strategiesLoaded = ref(false)

// 将后端策略转换为前端策略库格式
const mapBackendStrategyToFrontend = (s) => {
  const typeMap = {
    capacity_expansion: '产能扩张', collaboration: '采购策略', emergency_response: '应急响应',
    inventory_management: '库存缓冲', pricing_strategy: '价格策略', supplier_selection: '供应链优化'
  }
  const targetMap = {
    capacity_expansion: '全球铀矿产能', collaboration: '铀贸易网络', emergency_response: '替代供应来源',
    inventory_management: '战略铀储备', pricing_strategy: '铀市场价格', supplier_selection: '铀供应链节点'
  }
  return {
    id: s.id, name: s.name,
    target: targetMap[s.type] || '铀供应链全网络', phase: '事中',
    expectedCompletionDelta: `+${((s.outcomes?.completion_rate || 0.7) * 100 - 50).toFixed(1)}pp`,
    backlogImprovement: `${((1 - (s.outcomes?.completion_rate || 0.7)) * 100).toFixed(1)}%`,
    collaborationDelta: `+${s.params?.final_collaborations || 0} 次`,
    resilienceDelta: `+${((s.outcomes?.network_density || 0.3) * 1.0).toFixed(2)}`,
    type: typeMap[s.type] || '基准策略', scope: (s.id && s.id.includes('bottleneck')) ? '定向瓶颈' : '全局铀供应链',
    mechanism: s.type === 'capacity_expansion' ? '阶梯式扩产(ISL+硬岩)' : s.type === 'emergency_response' ? '启动替代产能应急预案' : s.type === 'inventory_management' ? '增加铀战略储备缓冲' : s.type === 'pricing_strategy' ? '长期合约锁定铀价' : '多源供应+长期合约',
    trigger: s.has_extreme_scenario ? '极端事件触发' : (s.outcomes?.completion_rate < 0.5 ? '供应完成率 < 50%' : '铀供应链基准策略'),
    _backend: s
  }
}

// 从后端加载策略数据并合并到 strategyFolders
const loadStrategiesFromBackend = async () => {
  strategiesLoading.value = true
  try {
    const expRes = await getExperimentDetail
    // 先获取实验列表
    const { getExperiments } = await import('@/api/supplyChain')
    const listRes = await getExperiments()
    const experiments = unwrapApiData(listRes) || []

    if (!experiments || experiments.length === 0) return

    const latest = experiments[0]
    const experimentId = latest.experiment_id || latest.id
    if (!experimentId) return

    // 加载策略库
    const stratRes = await getInterventionStrategies(experimentId)
    const stratData = unwrapApiData(stratRes)
    if (stratData?.strategies && stratData.strategies.length > 0) {
      backendStrategies.value = stratData.strategies

      // 按策略类型分组，构建前端策略库
      const typeGroups = {}
      stratData.strategies.forEach(s => {
        const mapped = mapBackendStrategyToFrontend(s)
        const typeLabel = mapped.type
        if (!typeGroups[typeLabel]) {
          typeGroups[typeLabel] = []
        }
        typeGroups[typeLabel].push(mapped)
      })

      // 转换为 strategyFolders 格式
      const newFolders = Object.entries(typeGroups).map(([label, children], idx) => ({
        id: `f_bk_${idx}`,
        label,
        expanded: idx < 2,
        children
      }))

      if (newFolders.length > 0) {
        // 后端策略作为补充追加到现有策略库后面，不覆盖本地带标注的策略
        newFolders.forEach(f => {
          const exists = strategyFolders.find(sf => sf.label === f.label)
          if (!exists) strategyFolders.push(f)
        })
        strategiesLoaded.value = true
        ElMessage.success(`已从实验 ${experimentId} 补充 ${stratData.total_strategies} 条干预策略`)
      }
    }
  } catch (e) {
    console.warn('从后端加载策略数据失败，使用默认策略库:', e)
  } finally {
    strategiesLoading.value = false
  }
}

// ---- 铀供应链干预策略库 ----
const strategyFolders = reactive([
  {
    id: 'cat_capacity', label: '一、铀矿产能扩张', expanded: true,
    children: [
      { id: 'cap_global_30',  name: '【A】全球扩产+30%',    desc: '产能 5.5→10.1万 tU/年 | 完成率+18pp | 利润↑',   target: '所有铀矿', phase: '事中', expectedCompletionDelta: '+18.2pp', backlogImprovement: '-28.5%', collaborationDelta: '+18次', resilienceDelta: '+0.35', type: '产能扩张', mechanism: 'ISL+硬岩矿同步阶梯式扩产', trigger: '供应缺口>15%' },
      { id: 'cap_isl_priority', name: '【B】ISL低成本优先', desc: '产能 5.0→9.0万 tU/年 | 完成率+12pp | 成本优',     target: '哈萨克斯坦ISL矿', phase: '事中', expectedCompletionDelta: '+12.5pp', backlogImprovement: '-20.1%', collaborationDelta: '+8次', resilienceDelta: '+0.22', type: '产能扩张', mechanism: '恢复硫酸供应，ISL利用率80%→满产', trigger: 'ISL利用率<80%' },
      { id: 'cap_lower_threshold', name: '【C】降低新矿门槛', desc: '投产阈值 6000→3000 | 完成率+16pp | 新矿↑',        target: '计划矿山项目', phase: '事前', expectedCompletionDelta: '+15.8pp', backlogImprovement: '-24.0%', collaborationDelta: '+25次', resilienceDelta: '+0.42', type: '市场准入', mechanism: '降低Dasa/Wheeler River投产门槛', trigger: '中长期供需缺口预警' }
    ]
  },
  {
    id: 'cat_procurement', label: '二、采购与储备', expanded: true,
    children: [
      { id: 'proc_diversify',  name: '【D】采购多元化',    desc: '协作半径→3000 协作厂→50 | 完成率+10pp | 韧性+0.38',   target: '全球铀贸易网络', phase: '事中', expectedCompletionDelta: '+10.3pp', backlogImprovement: '-16.7%', collaborationDelta: '+28次', resilienceDelta: '+0.38', type: '采购策略', mechanism: '多源供应+长期合约，降低单一来源依赖', trigger: '单一来源>40%' },
      { id: 'proc_stockpile',   name: '【E】战略储备90天', desc: '投产阈值 6000→4500 | 完成率+8pp | 缓冲↑',            target: '国家铀储备库', phase: '事前', expectedCompletionDelta: '+7.8pp', backlogImprovement: '-11.4%', collaborationDelta: '+5次', resilienceDelta: '+0.25', type: '库存缓冲', mechanism: '储备从30天提升至90天安全库存', trigger: '地缘政治风险升级' }
    ]
  },
  {
    id: 'cat_emergency', label: '三、应急响应', expanded: false,
    children: [
      { id: 'emer_niger',       name: '【F】尼日尔断供',  desc: '产能 3.8→7.0万 | 调整速率 0.12 | 快速切换',           target: '非洲→替代来源', phase: '事中', expectedCompletionDelta: '+5.5pp', backlogImprovement: '-8.0%', collaborationDelta: '+12次', resilienceDelta: '+0.19', type: '应急响应', mechanism: '启动纳米比亚+加拿大替代产能', trigger: '政局突变/出口中断' },
      { id: 'emer_kazakh',      name: '【G】哈萨克酸中断', desc: '产能 3.6→6.8万 | 调整速率 0.12 | 启动替代',           target: '中亚→替代ISL', phase: '事中', expectedCompletionDelta: '+6.8pp', backlogImprovement: '-10.5%', collaborationDelta: '+9次', resilienceDelta: '+0.16', type: '应急响应', mechanism: '启动澳Honeymoon+美ISL替代产能', trigger: '硫酸供应中断' }
    ]
  },
  {
    id: 'cat_market', label: '四、市场与金融', expanded: false,
    children: [
      { id: 'mkt_hedge',        name: '【H】长期合约锁价', desc: '调整速率 0.06 | 完成率+4pp | 锁定$55/lb',             target: '铀市场价格', phase: '事前', expectedCompletionDelta: '+4.2pp', backlogImprovement: '-5.8%', collaborationDelta: '+3次', resilienceDelta: '+0.15', type: '价格策略', mechanism: '$50-60/lb长期合约锁定5-10年价格', trigger: '现货铀价>$80/lb' },
      { id: 'mkt_slow_adjust',  name: '【I】稳健保守',    desc: '调整速率 0.04 | 完成率+2pp | 避免过度投资',            target: '全供应链', phase: '事后', expectedCompletionDelta: '+2.0pp', backlogImprovement: '-3.0%', collaborationDelta: '+1次', resilienceDelta: '+0.05', type: '稳健策略', mechanism: '极低调整速率，依赖合约+储备缓冲', trigger: '市场不确定性高' }
    ]
  }
])

// ---- 异常分析状态 ----
const anomaliesData = ref(null)
const severityFilter = ref('')
const selectedAnomalyIndex = ref(null)
const selectedDetail = ref(null)
const typeLabels = { order_drop: '铀需求骤降', completion_change: '供应完成率异常', enterprise_change: '矿山/企业变动', extreme_event: '铀供应链极端事件', network_disruption: '协作网络中断' }
const typeLabel = (t) => typeLabels[t] || t
const anomalyCount = computed(() => anomaliesData.value?.summary?.total_anomalies || 0)
const highSeverityCount = computed(() => anomaliesData.value?.summary?.by_severity?.high || 0)
const overviewCards = computed(() => {
  const s = anomaliesData.value?.summary || {}; const types = s.by_type || []; const topType = types[0]
  return [
    { label: '异常总数', value: s.total_anomalies || 0, icon: WarningFilled },
    { label: '主要类型', value: topType ? `${topType.label} (${topType.count})` : '--', icon: TrendCharts },
    { label: '涉及月份', value: anomaliesData.value?.timeline?.length || 0, icon: Odometer },
    { label: '高严重度', value: highSeverityCount.value, icon: DataLine }
  ]
})
const allAnomalies = computed(() => (anomaliesData.value?.anomalies || []).map((a, i) => ({ ...a, _originalIndex: i })))
const filteredAnomalies = computed(() => severityFilter.value ? allAnomalies.value.filter(a => a.severity === severityFilter.value) : allAnomalies.value)

const loadAnomalies = async () => {
  try {
    const listRes = await getExperiments(); const experiments = unwrapApiData(listRes) || []
    if (!experiments?.length) return
    const latest = experiments[0]; const experimentId = latest.experiment_id || latest.id
    if (!experimentId) return
    const res = await getAnomalies(experimentId); const data = unwrapApiData(res)
    if (data) anomaliesData.value = data
  } catch (e) { console.warn('加载异常数据失败:', e) }
}
const selectAnomaly = async (index) => {
  selectedAnomalyIndex.value = index
  try {
    const listRes = await getExperiments(); const experiments = unwrapApiData(listRes) || []
    const latest = experiments[0]; const experimentId = latest.experiment_id || latest.id
    if (!experimentId) return
    const res = await getAnomalyDetail(experimentId, index); const data = unwrapApiData(res)
    if (data?.detail) selectedDetail.value = data.detail
  } catch (e) { console.warn('加载异常详情失败:', e) }
}

const activeStrategySlot = ref('secondary')

const strategyInfoFields = [
  { key: 'name', label: '策略' },
  { key: 'desc', label: '核心参数' },
  { key: 'mechanism', label: '机制' },
  { key: 'trigger', label: '触发' }
]

const strategyParamFields = [
  { key: 'name', label: '策略' },
  { key: 'desc', label: '核心参数' },
  { key: 'mechanism', label: '机制' }
]

const strategyResultFields = [
  { key: 'expectedCompletionDelta', label: '预期完成率变化' },
  { key: 'backlogImprovement', label: '预期供应缺口改善' },
  { key: 'collaborationDelta', label: '预期协作增量' },
  { key: 'resilienceDelta', label: '预期韧性提升' }
]

const currentStrategy = reactive({ ...strategyFolders[0].children[0] })
const selectedStrategy = ref({ ...strategyFolders[1].children[0] })

// ---- 结构方程可视化 ----
const semChartRef = ref(null)
let semChartInstance = null

const buildSEMOption = () => {
  const a = currentStrategy; const b = selectedStrategy.value
  if (!a?.id || !b?.id) return null
  try {
    const vaA = parseFloat(a.expectedCompletionDelta) || 10
    const vaB = parseFloat(b.expectedCompletionDelta) || 10
    const vcA = parseInt(a.collaborationDelta) || 15
    const vcB = parseInt(b.collaborationDelta) || 15
    const colorA = '#3b82f6'; const colorB = '#22c55e'
    return {
      tooltip: { formatter: function(p) { return p.dataType === 'node' ? p.name : p.data.source + ' -> ' + p.data.target } },
      series: [{
        type: 'graph', layout: 'none', roam: false, draggable: false,
        categories: [{ name: '策略A' }, { name: '策略B' }, { name: '结果指标' }],
        data: [
          { id: 'pA', name: (a.name||'').substring(0,10), x: 76, y: 36, itemStyle: { color: colorA }, symbolSize: 16, category: 0 },
          { id: 'pB', name: (b.name||'').substring(0,10), x: 76, y: 196, itemStyle: { color: colorB }, symbolSize: 16, category: 1 },
          { id: 'mA_cap', name: '产能'+String(vaA>15?'+30%':vaA>10?'+15%':vaA>5?'+10%':'基线'), x: 276, y: 16, symbolSize: 11, category: 0 },
          { id: 'mA_col', name: '协作+'+String(vcA)+'次', x: 276, y: 56, symbolSize: 11, category: 0 },
          { id: 'mB_cap', name: '产能'+String(vaB>15?'+30%':vaB>10?'+15%':vaB>5?'+10%':'基线'), x: 276, y: 176, symbolSize: 11, category: 1 },
          { id: 'mB_col', name: '协作+'+String(vcB)+'次', x: 276, y: 216, symbolSize: 11, category: 1 },
          { id: 'o_comp', name: '供应完成率', x: 476, y: 66, symbolSize: 14, category: 2 },
          { id: 'o_res', name: '网络韧性', x: 476, y: 126, symbolSize: 14, category: 2 },
          { id: 'o_profit', name: '总利润', x: 476, y: 186, symbolSize: 14, category: 2 },
        ],
        links: [
          { source: 'pA', target: 'mA_cap', lineStyle: { color: colorA, width: 2 } },
          { source: 'pA', target: 'mA_col', lineStyle: { color: colorA, width: 2 } },
          { source: 'pB', target: 'mB_cap', lineStyle: { color: colorB, width: 2 } },
          { source: 'pB', target: 'mB_col', lineStyle: { color: colorB, width: 2 } },
          { source: 'mA_cap', target: 'o_comp', lineStyle: { color: colorA, width: 1.5, type: 'dashed' } },
          { source: 'mA_col', target: 'o_comp', lineStyle: { color: colorA, width: 1.5 } },
          { source: 'mA_col', target: 'o_res', lineStyle: { color: colorA, width: 1.5 } },
          { source: 'mB_cap', target: 'o_comp', lineStyle: { color: colorB, width: 1.5, type: 'dashed' } },
          { source: 'mB_col', target: 'o_comp', lineStyle: { color: colorB, width: 1.5 } },
          { source: 'mB_col', target: 'o_res', lineStyle: { color: colorB, width: 1.5 } },
          { source: 'o_comp', target: 'o_profit', lineStyle: { color: '#94a3b8', width: 1 } },
          { source: 'o_res', target: 'o_profit', lineStyle: { color: '#94a3b8', width: 1 } },
        ],
        label: { show: true, fontSize: 9, color: '#1e293b', fontWeight: 'bold' },
        edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 7,
        lineStyle: { curveness: 0.1, opacity: 0.7 }
      }]
    }
  } catch(e) { console.warn('SEM build failed:', e); return null }
}

let _semTimer = null
const renderSEMChart = () => {
  if (_semTimer) clearTimeout(_semTimer)
  _semTimer = setTimeout(function() {
    try {
      if (!semChartRef.value) return
      if (semChartInstance) { semChartInstance.dispose(); semChartInstance = null }
      var opt = buildSEMOption()
      if (!opt) return
      semChartInstance = echarts.init(semChartRef.value)
      semChartInstance.setOption(opt)
    } catch(e) { console.warn('SEM render failed:', e) }
  }, 300)
}

// 选策略时触发渲染
function selectStrategy(child) {
  if (runState.running) { ElMessage.warning('实验运行中，暂不能切换干预策略'); return }
  if (activeStrategySlot.value === 'primary') { Object.assign(currentStrategy, child); clearRunOutputForSelectionChange() }
  else { selectedStrategy.value = child; clearRunOutputForSelectionChange() }
  renderSEMChart()
}
const interventionProblem = '铀矿产能受限与核电需求增长背景下，如何选择最优干预策略以维持铀供应链供应安全和完成率稳定？'
const interventionIterations = 15
const pollingIntervalMs = 5000

const runState = reactive({
  running: false,
  message: '尚未提交实际运行任务。选择策略A与策略B后，点击“开始运行”即可分别提交后端仿真实验。',
  error: '',
  startedAt: '',
  completedAt: '',
  tasks: {
    primary: null,
    secondary: null
  },
  results: {
    primary: null,
    secondary: null
  }
})

const strategySlots = computed(() => [
  { key: 'primary', label: '策略A', strategy: currentStrategy },
  { key: 'secondary', label: '策略B', strategy: selectedStrategy.value }
])

const hasRunResults = computed(() => Boolean(runState.results.primary && runState.results.secondary))

const runComparisonRows = computed(() => {
  const primary = runState.results.primary
  const secondary = runState.results.secondary
  if (!primary || !secondary) return []

  return [
    {
      key: 'completionRate',
      label: '订单完成率',
      primary: formatPercent(primary.completionRate),
      secondary: formatPercent(secondary.completionRate),
      rawPrimary: primary.completionRate,
      rawSecondary: secondary.completionRate,
      direction: 'higher'
    },
    {
      key: 'backlogRate',
      label: '订单积压率',
      primary: formatPercent(primary.backlogRate),
      secondary: formatPercent(secondary.backlogRate),
      rawPrimary: primary.backlogRate,
      rawSecondary: secondary.backlogRate,
      direction: 'lower'
    },
    {
      key: 'overallScore',
      label: '综合得分',
      primary: formatNumber(primary.overallScore, 3),
      secondary: formatNumber(secondary.overallScore, 3),
      rawPrimary: primary.overallScore,
      rawSecondary: secondary.overallScore,
      direction: 'higher'
    },
    {
      key: 'cooperationCount',
      label: '协作次数',
      primary: formatInteger(primary.cooperationCount),
      secondary: formatInteger(secondary.cooperationCount),
      rawPrimary: primary.cooperationCount,
      rawSecondary: secondary.cooperationCount,
      direction: 'higher'
    },
    {
      key: 'netProfit',
      label: '总净利润',
      primary: formatNumber(primary.netProfit, 1),
      secondary: formatNumber(secondary.netProfit, 1),
      rawPrimary: primary.netProfit,
      rawSecondary: secondary.netProfit,
      direction: 'higher'
    },
    {
      key: 'bestIteration',
      label: '最佳迭代',
      primary: primary.bestIteration || '--',
      secondary: secondary.bestIteration || '--'
    },
    {
      key: 'capacityRange',
      label: '最佳产能区间',
      primary: formatRange(primary.capacityRange),
      secondary: formatRange(secondary.capacityRange)
    },
    {
      key: 'reproductionThreshold',
      label: '繁殖阈值',
      primary: formatNumber(primary.reproductionThreshold, 0),
      secondary: formatNumber(secondary.reproductionThreshold, 0)
    }
  ]
})

let runPollingTimer = null

const baseRunPayload = () => ({
  scenario: 'uranium',
  data_dir: 'E:/tju_1/processed',
  iterations: 7,
  model: 'qwen',
  planner_strategy: 'native',
  use_decompose: false,
  enable_llm: false,
  llm_enabled: false,
  user_goal: interventionProblem,
  phase: 'post',
  source_page: 'ExpAnalysis_Intervention'
})

const strategyRuntimeConfig = (strategy = {}) => {
  const baseline = { order_multiplier: 1.0, factory_capacity_range: [42000, 78000], reproduction_threshold: 6000, adjustment_ratio: 0.08 }
  const defaultAgent = { factory: { params: { capacity_range: [42000, 78000] } }, manufacturing_corporation: { params: { capacity_range: [42000, 78000] } } }
  const configs = {
    // 一、产能扩张
    cap_global_30:       { paramOverrides: { ...baseline, factory_capacity_range: [54600, 101400], adjustment_ratio: 0.08 }, agentNodeConfigs: defaultAgent },
    cap_isl_priority:    { paramOverrides: { ...baseline, factory_capacity_range: [50000, 90000], reproduction_threshold: 5000, adjustment_ratio: 0.10 }, agentNodeConfigs: defaultAgent },
    cap_lower_threshold: { paramOverrides: { ...baseline, factory_capacity_range: [42000, 78000], reproduction_threshold: 3000, adjustment_ratio: 0.08 }, agentNodeConfigs: defaultAgent },
    // 二、采购与储备
    proc_diversify: { paramOverrides: { ...baseline }, agentNodeConfigs: { manufacturing_corporation: { params: { collaboration_radius: 3000, max_collaboration_factories: 50, capacity_range: [42000, 78000] } } } },
    proc_stockpile: { paramOverrides: { ...baseline, reproduction_threshold: 4500, adjustment_ratio: 0.10 }, agentNodeConfigs: defaultAgent },
    // 三、应急响应
    emer_niger:  { paramOverrides: { ...baseline, factory_capacity_range: [38000, 70000], reproduction_threshold: 5500, adjustment_ratio: 0.12 }, agentNodeConfigs: defaultAgent },
    emer_kazakh: { paramOverrides: { ...baseline, factory_capacity_range: [36000, 68000], reproduction_threshold: 5000, adjustment_ratio: 0.12 }, agentNodeConfigs: defaultAgent },
    // 四、市场与金融
    mkt_hedge:       { paramOverrides: { ...baseline, adjustment_ratio: 0.06 }, agentNodeConfigs: defaultAgent },
    mkt_slow_adjust: { paramOverrides: { ...baseline, adjustment_ratio: 0.04 }, agentNodeConfigs: defaultAgent },
  }
  return configs[strategy.id] || { paramOverrides: { ...baseline }, agentNodeConfigs: defaultAgent }
}

const buildInterventionRunPayload = (slotKey, strategy) => {
  const runtimeConfig = strategyRuntimeConfig(strategy)
  return {
    ...baseRunPayload(),
    // 顶层参数覆盖（后端仿真器必需）
    param_overrides: {
      order_multiplier: runtimeConfig.paramOverrides.order_multiplier || 1.0,
      factory_capacity_range: runtimeConfig.paramOverrides.factory_capacity_range,
      manufacturer_production_capacity_range: runtimeConfig.paramOverrides.factory_capacity_range,
      reproduction_threshold: runtimeConfig.paramOverrides.reproduction_threshold || 6000,
      adjustment_ratio: runtimeConfig.paramOverrides.adjustment_ratio || 0.08
    },
    intervention_slot: slotKey === 'primary' ? 'A' : 'B',
    intervention_strategy_id: strategy.id,
    intervention_strategy_name: strategy.name,
    intervention_strategy_type: strategy.type,
    intervention_strategy_payload: {
      target: strategy.target,
      scope: strategy.scope,
      mechanism: strategy.mechanism,
      trigger: strategy.trigger,
      param_overrides: runtimeConfig.paramOverrides
    },
    subtask_variable_configs: {
      counterfactual_runtime: {
        paramOverrides: {
          order_multiplier: runtimeConfig.paramOverrides.order_multiplier || 1.0,
          factory_capacity_range: runtimeConfig.paramOverrides.factory_capacity_range,
          manufacturer_production_capacity_range: runtimeConfig.paramOverrides.factory_capacity_range,
          reproduction_threshold: runtimeConfig.paramOverrides.reproduction_threshold || 6000,
          adjustment_ratio: runtimeConfig.paramOverrides.adjustment_ratio || 0.08
        }
      }
    },
    agent_node_configs: {
      factory: { params: { capacity_range: runtimeConfig.paramOverrides.factory_capacity_range } },
      manufacturing_corporation: { params: { capacity_range: runtimeConfig.paramOverrides.factory_capacity_range } }
    },
    scenario_context: {
      actual_problem: interventionProblem,
      selected_strategy: strategy.name,
      strategy_slot: slotKey === 'primary' ? '策略A' : '策略B',
      selected_parameters: [
        { key: 'order_multiplier', label: '铀需求强度', value: runtimeConfig.paramOverrides.order_multiplier || 1.0, unit: '倍' },
        { key: 'factory_capacity_min', label: '铀矿产能下限', value: runtimeConfig.paramOverrides.factory_capacity_range[0], unit: 'tU/年' },
        { key: 'factory_capacity_max', label: '铀矿产能上限', value: runtimeConfig.paramOverrides.factory_capacity_range[1], unit: 'tU/年' },
        { key: 'reproduction_threshold', label: '新矿投产阈值', value: runtimeConfig.paramOverrides.reproduction_threshold || 6000, unit: 'tU/年' },
        { key: 'adjustment_ratio', label: '产能爬坡速率', value: runtimeConfig.paramOverrides.adjustment_ratio || 0.08, unit: '比例' }
      ]
    }
  }
}

const resetRunState = () => {
  stopRunPolling()
  runState.running = false
  runState.error = ''
  runState.startedAt = ''
  runState.completedAt = ''
  runState.message = '正在准备提交两个干预策略的后端实验任务...'
  runState.tasks.primary = null
  runState.tasks.secondary = null
  runState.results.primary = null
  runState.results.secondary = null
}

const sleep = (ms) => new Promise(resolve => window.setTimeout(resolve, ms))

const startInterventionRun = async () => {
  if (runState.running) return
  if (!currentStrategy.id || !selectedStrategy.value?.id) {
    ElMessage.warning('请先选择策略A和策略B，再开始运行')
    return
  }

  resetRunState()
  runState.running = true
  runState.startedAt = new Date().toLocaleString()

  try {
    for (const slot of strategySlots.value) {
      const payload = buildInterventionRunPayload(slot.key, slot.strategy)
      const response = unwrapApiData(await runExperiment(payload))
      if (!response?.task_id || response.status === 'error') {
        throw new Error(response?.message || `${slot.label}实验任务提交失败`)
      }
      runState.tasks[slot.key] = {
        taskId: response.task_id,
        status: response.status || 'queued',
        position: response.position,
        strategyName: slot.strategy.name,
        resultPath: '',
        experimentId: ''
      }
      await sleep(30)
    }

    runState.message = '两个干预策略已提交后端队列，正在等待实际仿真实验完成...'
    ElMessage.success('两个干预策略实验已提交后端队列')
    startRunPolling()
  } catch (error) {
    runState.running = false
    runState.error = `提交失败：${error?.message || '未知错误'}`
    ElMessage.error(runState.error)
  }
}

const startRunPolling = () => {
  stopRunPolling()
  runPollingTimer = window.setInterval(pollRunTasks, pollingIntervalMs)
  pollRunTasks()
}

const stopRunPolling = () => {
  if (runPollingTimer) {
    window.clearInterval(runPollingTimer)
    runPollingTimer = null
  }
}

const pollRunTasks = async () => {
  const taskIds = strategySlots.value
    .map(slot => runState.tasks[slot.key]?.taskId)
    .filter(Boolean)

  if (!taskIds.length) return

  try {
    const history = unwrapApiData(await getQueueHistory(80)) || []
    for (const slot of strategySlots.value) {
      const task = runState.tasks[slot.key]
      if (!task?.taskId) continue

      const found = history.find(item => item.task_id === task.taskId)
      if (!found) continue

      task.status = found.status || task.status
      task.resultPath = found.result_path || task.resultPath
      if (found.status === 'failed') {
        task.error = found.error_message || '后端实验运行失败'
      }

      if (found.status === 'completed' && found.result_path && !runState.results[slot.key]) {
        const experimentId = extractExperimentId(found.result_path)
        task.experimentId = experimentId
        if (experimentId) {
          const detail = unwrapApiData(await getExperimentDetail(experimentId))
          runState.results[slot.key] = summarizeExperimentResult(detail, slot.strategy, task)
        }
      }
    }

    const failedTask = strategySlots.value
      .map(slot => runState.tasks[slot.key])
      .find(task => task?.status === 'failed')

    if (failedTask) {
      runState.running = false
      runState.error = `实验运行失败：${failedTask.error || failedTask.taskId}`
      stopRunPolling()
      return
    }

    if (hasRunResults.value) {
      runState.running = false
      runState.completedAt = new Date().toLocaleString()
      runState.message = '两个干预策略的后端实验均已完成，结果对比已更新。'
      stopRunPolling()
      ElMessage.success('干预策略实际运行完成')
      return
    }

    const statuses = strategySlots.value
      .map(slot => `${slot.label}${taskStatusText(runState.tasks[slot.key]?.status)}`)
      .join('，')
    runState.message = `后端实验运行中：${statuses}`
  } catch (error) {
    runState.message = `轮询队列状态失败，稍后自动重试：${error?.message || '未知错误'}`
  }
}

const extractExperimentId = (resultPath = '') => {
  const matched = String(resultPath).match(/multi_agent_report_(\d{8}_\d{6})\.json$/)
  return matched ? matched[1] : ''
}

const findBestIteration = (iterations = []) => {
  if (!Array.isArray(iterations) || !iterations.length) return null
  return iterations.reduce((best, item) => {
    const bestScore = toNumber(best?.feedback?.overall_score, -1)
    const itemScore = toNumber(item?.feedback?.overall_score, -1)
    return itemScore > bestScore ? item : best
  }, iterations[0])
}

const summarizeExperimentResult = (detail = {}, strategy = {}, task = {}) => {
  const iterations = detail.iterations || []
  const best = findBestIteration(iterations) || {}
  const metrics = best.simulation_result?.metrics || {}
  const params = best.task?.parameters || {}
  const totalOrders = toNumber(metrics.total_orders)
  const completedOrders = toNumber(metrics.completed_orders)
  const backlog = Math.max(totalOrders - completedOrders, 0)

  return {
    strategyName: task.strategyName || strategy.name,
    experimentId: detail.experiment_id || task.experimentId,
    taskId: task.taskId,
    bestIteration: best.iteration,
    completionRate: toNumber(metrics.order_completion_rate, null),
    backlogRate: totalOrders > 0 ? backlog / totalOrders : null,
    totalOrders,
    completedOrders,
    backlog,
    cooperationCount: toNumber(metrics.cooperation_count ?? metrics.collaboration_count, null),
    netProfit: toNumber(metrics.total_net_profit, null),
    overallScore: toNumber(best.feedback?.overall_score, null),
    capacityRange: params.factory_capacity_range || params.manufacturer_production_capacity_range,
    reproductionThreshold: toNumber(params.reproduction_threshold, null),
    orderMultiplier: toNumber(params.order_multiplier, null),
    rawParameters: params
  }
}

const toNumber = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const formatPercent = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return `${(num * 100).toFixed(1)}%`
}

const formatNumber = (value, digits = 2) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return num.toFixed(digits)
}

const formatInteger = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return `${Math.round(num)}`
}

const formatRange = (value) => {
  if (!Array.isArray(value) || value.length < 2) return '--'
  return `${formatNumber(value[0], 0)}-${formatNumber(value[1], 0)}`
}

const taskStatusText = (status) => {
  const textMap = {
    queued: '排队中',
    pending: '排队中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return textMap[status] || '未提交'
}

const taskStatusType = (status) => {
  const typeMap = {
    queued: 'info',
    pending: 'info',
    running: 'warning',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return typeMap[status] || 'info'
}

const isBetterRunValue = (row, slotKey) => {
  if (!row.direction) return false
  const left = Number(row.rawPrimary)
  const right = Number(row.rawSecondary)
  if (!Number.isFinite(left) || !Number.isFinite(right) || left === right) return false
  if (row.direction === 'lower') {
    return slotKey === 'primary' ? left < right : right < left
  }
  return slotKey === 'primary' ? left > right : right > left
}

const buildRunReportText = () => {
  const lines = [
    '干预策略实际运行报告',
    `生成时间：${new Date().toLocaleString()}`,
    `实验问题：${interventionProblem}`,
    `基础实验：${interventionIterations}轮 / native planner / supply_chain`,
    '',
    `策略A：${currentStrategy.name}`,
    `策略B：${selectedStrategy.value?.name || '--'}`,
    '',
    '运行结果对比',
    ...runComparisonRows.value.map(row => `${row.label}：策略A=${row.primary}；策略B=${row.secondary}`)
  ]
  return lines.join('\n')
}

const escapeHtml = (value) => String(value ?? '--')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const buildRunReportHtml = () => {
  const rows = runComparisonRows.value.map(row => `
    <tr>
      <th>${escapeHtml(row.label)}</th>
      <td>${escapeHtml(row.primary)}</td>
      <td>${escapeHtml(row.secondary)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>干预策略实际运行报告</title>
  <style>
    body { margin: 0; padding: 28px; color: #0f172a; font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.6; background: #f8fafc; }
    main { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px; }
    h1 { margin: 0 0 8px; font-size: 26px; }
    .meta { color: #64748b; margin-bottom: 18px; }
    .problem { padding: 12px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; color: #1e40af; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { width: 180px; background: #f1f5f9; }
    thead th { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <main>
    <h1>干预策略实际运行报告</h1>
    <div class="meta">生成时间：${new Date().toLocaleString()}；基础实验：${interventionIterations}轮</div>
    <div class="problem">${escapeHtml(interventionProblem)}</div>
    <p><strong>策略A：</strong>${escapeHtml(currentStrategy.name)}</p>
    <p><strong>策略B：</strong>${escapeHtml(selectedStrategy.value?.name)}</p>
    <table>
      <thead><tr><th>指标</th><th>策略A</th><th>策略B</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>`
}

const downloadRunFile = (content, filename, type) => {
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

const exportRunReport = (format = 'html') => {
  if (!hasRunResults.value) {
    ElMessage.warning('请先完成两个干预策略的实际运行，再导出结果')
    return
  }

  const safeName = `${currentStrategy.name}_vs_${selectedStrategy.value?.name || '策略B'}`.replace(/[\\/:*?"<>|]/g, '_')
  if (format === 'txt') {
    downloadRunFile(buildRunReportText(), `干预策略实际运行报告_${safeName}.txt`, 'text/plain;charset=utf-8')
    ElMessage.success('实际运行报告已导出为TXT')
    return
  }

  if (format === 'pdf') {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      ElMessage.warning('浏览器拦截了PDF打印窗口，请允许弹窗后重试')
      return
    }
    printWindow.document.open()
    printWindow.document.write(buildRunReportHtml())
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => printWindow.print(), 300)
    ElMessage.success('已打开PDF打印窗口，请选择“保存为PDF”')
    return
  }

  downloadRunFile(buildRunReportHtml(), `干预策略实际运行报告_${safeName}.html`, 'text/html;charset=utf-8')
  ElMessage.success('实际运行报告已导出为HTML')
}

onMounted(() => {
  loadStrategiesFromBackend()
  loadAnomalies()
  // 初始渲染结构方程图
  setTimeout(() => renderSEMChart(), 600)
})

onBeforeUnmount(() => {
  stopRunPolling()
  if (semChartInstance) { semChartInstance.dispose(); semChartInstance = null }
})

function setActiveStrategySlot(slot) {
  activeStrategySlot.value = slot
}

function isStrategySelected(strategyId) {
  return currentStrategy.id === strategyId || selectedStrategy.value?.id === strategyId
}

function folderToggleIcon(expanded) {
  return expanded ? ArrowDown : ArrowRight
}

function clearRunOutputForSelectionChange() {
  if (!runState.tasks.primary && !runState.tasks.secondary && !runState.results.primary && !runState.results.secondary) return
  runState.tasks.primary = null
  runState.tasks.secondary = null
  runState.results.primary = null
  runState.results.secondary = null
  runState.error = ''
  runState.message = '策略选择已更新，请重新点击“开始运行”获取新的实际实验结果。'
}
</script>

<style scoped>
.post-intervention-page {
  height: 100%; min-height: 0; box-sizing: border-box; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 10px;
  background: #f6f8fb; color: #0f172a; overflow-y: auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

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

.intervention-layout {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-height: 500px;
  height: calc(100vh - 280px);
}

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

/* ---- 干预策略库 ---- */
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

.slot-switch {
  padding: 10px 12px;
  border-bottom: 1px solid #eef2f7;
  background: #ffffff;
}

.slot-switch :deep(.el-radio-group) {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.slot-switch :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 7px 8px;
  font-size: 12px;
  font-weight: 800;
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

.tree-leaf.active-primary {
  background: #eff6ff;
  color: #1d4ed8;
}

.tree-leaf.active-secondary {
  background: #f5f3ff;
  color: #6d28d9;
}

.tree-leaf .el-icon {
  font-size: 14px;
  color: #cbd5e1;
  flex-shrink: 0;
}

.tree-leaf.active .el-icon { color: #3b82f6; }
.tree-leaf.active-secondary .el-icon { color: #8b5cf6; }

.leaf-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leaf-badge {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
}

.leaf-badge--primary {
  color: #1d4ed8;
  background: #dbeafe;
}

.leaf-badge--secondary {
  color: #6d28d9;
  background: #ede9fe;
}

/* ---- 当前干预策略 ---- */
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
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.info-card--primary { border-top: 3px solid #3b82f6; }
.info-card--secondary { border-top: 3px solid #8b5cf6; }
.info-card--active {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.info-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
  background: #fafbfc;
}

.info-card-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
}

.info-card-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* ---- 右半 ---- */
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

.compare-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-pair-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

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

.cmp-card--blue { border-top: 3px solid #3b82f6; }
.cmp-card--blue .cmp-card-head { background: linear-gradient(180deg, #eff6ff 0%, #fafbfc 100%); }
.cmp-card--blue .cmp-card-head .el-icon { color: #3b82f6; }

.cmp-card--purple { border-top: 3px solid #8b5cf6; }
.cmp-card--purple .cmp-card-head { background: linear-gradient(180deg, #f5f3ff 0%, #fafbfc 100%); }
.cmp-card--purple .cmp-card-head .el-icon { color: #8b5cf6; }

.cmp-card--teal { border-top: 3px solid #0d9488; }
.cmp-card--teal .cmp-card-head { background: linear-gradient(180deg, #f0fdfa 0%, #fafbfc 100%); }
.cmp-card--teal .cmp-card-head .el-icon { color: #0d9488; }

.cmp-card--amber { border-top: 3px solid #d97706; }
.cmp-card--amber .cmp-card-head { background: linear-gradient(180deg, #fffbeb 0%, #fafbfc 100%); }
.cmp-card--amber .cmp-card-head .el-icon { color: #d97706; }

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

/* ---- 实际运行模块 ---- */
/* ---- 结构方程图 ---- */
.sem-panel { margin-top: 14px; border: 1px solid #ddd6fe; border-radius: 8px; background: #fff; overflow: hidden; }
.sem-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #ede9fe; background: linear-gradient(90deg, #faf5ff, #fff); font-size: 13px; font-weight: 800; color: #5b21b6; }
.sem-head .el-icon { color: #7c3aed; }
.sem-legend { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #64748b; }
.sem-dot-a { width: 10px; height: 10px; border-radius: 50%; background: #3b82f6; display: inline-block; }
.sem-dot-b { width: 10px; height: 10px; border-radius: 50%; background: #22c55e; display: inline-block; }
.sem-chart { width: 100%; height: 260px; }

.runtime-panel {
  margin-top: 14px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.runtime-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #e0f2fe;
  background: #f8fbff;
}

.runtime-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e293b;
  font-size: 13px;
  font-weight: 900;
}

.runtime-title .el-icon { color: #2563eb; }

.runtime-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.runtime-problem {
  margin: 12px 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.runtime-problem span {
  color: #3b82f6;
  font-size: 11px;
  font-weight: 900;
}

.runtime-problem strong {
  color: #1e3a8a;
  font-size: 12px;
  line-height: 1.5;
}

.runtime-status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 14px 12px;
}

.runtime-status-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #ffffff;
}

.runtime-status-card--primary { border-top: 3px solid #3b82f6; }
.runtime-status-card--secondary { border-top: 3px solid #8b5cf6; }

.runtime-status-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
}

.runtime-status-top span {
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
}

.runtime-status-card strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.4;
}

.runtime-status-card p {
  margin: 6px 0 0;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  word-break: break-all;
}

.runtime-alert {
  margin: 0 14px 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.runtime-alert--error {
  background: #fef2f2;
  color: #b91c1c;
}

.runtime-result {
  margin: 0 14px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.runtime-result-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #eef2f7;
  background: #f8fafc;
  color: #1e293b;
  font-size: 13px;
  font-weight: 900;
}

.result-table {
  display: flex;
  flex-direction: column;
}

.result-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
}

.result-row:last-child { border-bottom: none; }

.result-row--head {
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 900;
}

.result-row span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.result-row .winner {
  color: #047857;
}

.runtime-placeholder {
  min-height: 88px;
  margin: 0 14px 14px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  color: #94a3b8;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.runtime-placeholder .el-icon {
  color: #cbd5e1;
  font-size: 18px;
  flex-shrink: 0;
}

.library-tree::-webkit-scrollbar,
.current-experiment::-webkit-scrollbar,
.compare-body::-webkit-scrollbar,
.panel-body::-webkit-scrollbar {
  width: 5px;
}
.library-tree::-webkit-scrollbar-thumb,
.current-experiment::-webkit-scrollbar-thumb,
.compare-body::-webkit-scrollbar-thumb,
.panel-body::-webkit-scrollbar-thumb {
  background: #cbd5e1; border-radius: 999px;
}

/* ---- 异常区域 ---- */
.head-actions .stat-item { min-width: 90px; padding: 8px 12px; border: 1px solid #fecaca; border-radius: 10px; background: linear-gradient(180deg, #fff8f8, #fef2f2); }
.head-actions .stat-item span { display: block; color: #64748b; font-size: 11px; font-weight: 800; }
.head-actions .stat-item strong { display: block; margin-top: 4px; color: #991b1b; font-size: 18px; }
.overview-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.overview-card { display: grid; grid-template-columns: 38px 1fr; grid-template-rows: auto auto; column-gap: 10px; align-items: center; min-height: 56px; padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; }
.overview-card .el-icon { grid-row: 1/3; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; background: #fecaca; color: #ef4444; font-size: 16px; }
.overview-card span { color: #64748b; font-size: 12px; font-weight: 800; }
.overview-card strong { color: #0f172a; font-size: 18px; }
.anomaly-section { flex: 0 0 auto; margin-top: 10px; }
.anomaly-grid { display: grid; grid-template-columns: 380px 1fr; gap: 10px; }
.anomaly-list-panel, .anomaly-detail-panel { border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 6px 16px rgba(15,23,42,0.04); max-height: 360px; }
.panel-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid #eef2f7; font-weight: 800; font-size: 13px; flex-shrink: 0; }
.panel-body { flex: 1; overflow-y: auto; padding: 6px; }
.anomaly-item { padding: 10px; margin: 2px 0; border: 1px solid #eef2f7; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.anomaly-item:hover { border-color: #fca5a5; background: #fffafa; }
.anomaly-item.active { border-color: #ef4444; background: #fef2f2; border-left: 3px solid #ef4444; }
.anomaly-head { display: flex; align-items: center; gap: 8px; }
.anomaly-type { font-size: 12px; font-weight: 800; color: #0f172a; }
.anomaly-desc { margin: 6px 0; font-size: 11px; color: #64748b; line-height: 1.5; }
.anomaly-meta { display: flex; gap: 10px; font-size: 11px; color: #94a3b8; font-weight: 600; }
.detail-body { padding: 14px; overflow-y: auto; }
.detail-section { margin-bottom: 12px; }
.detail-section h4 { margin: 0 0 6px; font-size: 13px; font-weight: 800; color: #0f172a; }
.detail-section p, .detail-section li { margin: 0; font-size: 12px; color: #475569; line-height: 1.6; }
.detail-section ul { margin: 0; padding-left: 16px; }
.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.metric-item { padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fafbfc; display: flex; flex-direction: column; gap: 3px; }
.metric-label { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
.metric-value { font-size: 14px; font-weight: 900; color: #0f172a; }
.empty-hint, .detail-empty { padding: 30px 0; text-align: center; color: #94a3b8; font-size: 12px; font-weight: 600; }
.detail-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0; }
</style>
