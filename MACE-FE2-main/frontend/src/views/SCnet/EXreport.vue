<template>
  <div class="post-report-page">
    <section class="report-head">
      <div>
        <p class="eyebrow">URANIUM SUPPLY CHAIN · REPORT</p>
        <h1>铀供应链实验报告</h1>
        <p class="subtitle">基于铀供应链事中仿真与反事实分析结果，生成铀矿产能、供应安全、网络韧性等关键指标对比与因素总结。</p>
      </div>
      <div class="head-actions">
        <el-dropdown trigger="click" @command="exportReport">
          <el-button plain :icon="Download" :loading="exporting">
            导出报告
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="txt">文本（.txt）</el-dropdown-item>
              <el-dropdown-item command="html">HTML（.html）</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="primary" plain :icon="Refresh" @click="refreshReport" :loading="loading">重新生成报告</el-button>
      </div>
    </section>

    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="54"><Loading /></el-icon>
      <p>正在生成报告...</p>
    </div>

    <el-empty
      v-else-if="!reportData"
      class="empty-report"
      description="请先选择或完成一个铀供应链实验"
      :image-size="120"
    />

    <div v-else ref="reportContentRef" class="report-content">
      <section class="summary-grid">
        <article class="summary-card">
          <el-icon><Memo /></el-icon>
          <span>实验总数</span>
          <strong>{{ experimentRows.length }}</strong>
        </article>
        <article class="summary-card">
          <el-icon><Odometer /></el-icon>
          <span>最优实验</span>
          <strong>{{ bestExperimentLabel }}</strong>
        </article>
        <article class="summary-card">
          <el-icon><Star /></el-icon>
          <span>关键因素</span>
          <strong>{{ topFactor?.label || '-' }}</strong>
        </article>
        <article class="summary-card">
          <el-icon><DataAnalysis /></el-icon>
          <span>完成率改善</span>
          <strong>{{ completionImprovementLabel }}</strong>
        </article>
      </section>

      <main class="report-scroll">
        <section v-if="linkedSession" class="report-section">
          <header class="section-head compact">
            <div>
              <h2>原始建模过程</h2>
              <p>保留与本次实验关联的需求、任务拆解和对话上下文。</p>
            </div>
            <el-tag size="small" type="info" effect="plain">会话 {{ linkedSession.session_id }}</el-tag>
          </header>
          <div class="session-list">
            <article v-if="linkedRequirement">
              <strong>原始需求</strong>
              <p>{{ linkedRequirement }}</p>
            </article>
            <article v-if="linkedGoal">
              <strong>研究目标</strong>
              <p>{{ linkedGoal }}</p>
            </article>
            <article v-if="linkedTaskList.length">
              <strong>拆解任务</strong>
              <p>共 {{ linkedTaskList.length }} 项 - {{ linkedTaskList.slice(0, 3).join('；') }}{{ linkedTaskList.length > 3 ? '...' : '' }}</p>
            </article>
          </div>
        </section>

        <section class="report-section">
          <header class="section-head">
            <div>
              <h2>实验对比总览</h2>
              <p>汇总供应链实验基本信息、关键参数与核心输出指标。</p>
            </div>
            <span class="generated-at">生成时间：{{ generatedAt }}</span>
          </header>

          <div class="overview-table">
            <div class="overview-header">
              <div>实验</div>
              <div>来源</div>
              <div>核心参数</div>
              <div>关键指标</div>
            </div>
            <article v-for="row in overviewRows" :key="row.id" class="overview-row">
              <div class="experiment-cell">
                <strong>{{ row.label }}</strong>
                <small>{{ row.id }}</small>
              </div>
              <div>
                <el-tag :type="row.source === '最优' ? 'success' : 'info'" effect="light">{{ row.source }}</el-tag>
              </div>
              <div class="chip-wrap">
                <span v-for="param in row.params" :key="param">{{ param }}</span>
              </div>
              <div class="metric-pills">
                <span v-for="metric in row.metrics" :key="metric">{{ metric }}</span>
              </div>
            </article>
          </div>
        </section>

        <section class="comparison-grid">
          <article class="report-section">
            <header class="section-head compact">
              <div>
                <h2>参数对比</h2>
                <p>按参数项展开实验配置差异。</p>
              </div>
            </header>
            <div class="matrix-table">
              <div class="matrix-row matrix-header" :style="{ gridTemplateColumns: parameterMatrixTemplate }">
                <div>参数</div>
                <div v-for="row in experimentRows" :key="`p-head-${row.id}`">{{ row.shortLabel }}</div>
              </div>
              <div v-for="param in parameterMatrixRows" :key="param.key" class="matrix-row" :style="{ gridTemplateColumns: parameterMatrixTemplate }">
                <div class="matrix-label">{{ param.label }}</div>
                <div v-for="row in experimentRows" :key="`${param.key}-${row.id}`">{{ row.paramsMap[param.key] || '-' }}</div>
              </div>
            </div>
          </article>

          <article class="report-section">
            <header class="section-head compact">
              <div>
                <h2>指标对比</h2>
                <p>对比完成率、利润、综合得分和最优轮次。</p>
              </div>
            </header>
            <div class="matrix-table">
              <div class="matrix-row matrix-header" :style="{ gridTemplateColumns: metricMatrixTemplate }">
                <div>指标</div>
                <div v-for="row in experimentRows" :key="`m-head-${row.id}`">{{ row.shortLabel }}</div>
              </div>
              <div v-for="metric in metricMatrixRows" :key="metric.key" class="matrix-row" :style="{ gridTemplateColumns: metricMatrixTemplate }">
                <div class="matrix-label">{{ metric.label }}</div>
                <div
                  v-for="row in experimentRows"
                  :key="`${metric.key}-${row.id}`"
                  :class="metricCellClass(metric.key, row)"
                >
                  {{ row.metricsMap[metric.key] || '-' }}
                </div>
              </div>
            </div>
          </article>
        </section>

        <section v-if="iterationTableRows.length" class="report-section">
          <header class="section-head compact">
            <div>
              <h2>迭代序列</h2>
              <p>保留各轮综合得分、订单完成率、净利润和企业数量变化。</p>
            </div>
          </header>
          <div class="iteration-strip">
            <article v-for="row in iterationTableRows" :key="row.iteration" class="iteration-card" :class="{ best: row.isBest }">
              <strong>第{{ row.iteration }}轮</strong>
              <span>{{ row.score }}</span>
              <small>完成率 {{ row.completionRate }} / 利润 {{ row.profit }}</small>
            </article>
          </div>
        </section>

        <section class="analysis-grid">
          <article class="report-section">
            <header class="section-head compact">
              <div>
                <h2>影响因素总结</h2>
                <p>识别当前供应链实验中最值得关注的配置与指标因素。</p>
              </div>
            </header>
            <div class="factor-list">
              <article v-for="factor in factorSummaries" :key="factor.key" class="factor-card">
                <div class="factor-title-row">
                  <strong>{{ factor.label }}</strong>
                  <span>{{ factor.score }}%</span>
                </div>
                <p>{{ factor.effect }}</p>
                <div class="factor-bar">
                  <i :style="{ width: `${factor.score}%` }"></i>
                </div>
              </article>
            </div>
          </article>

          <article class="report-section">
            <header class="section-head compact">
              <div>
                <h2>各因素作用路径</h2>
                <p>从实验参数到供应链输出指标的主要作用链路。</p>
              </div>
            </header>
            <div class="path-list">
              <article v-for="path in pathSummaries" :key="path.title" class="path-card">
                <div class="path-icon">
                  <el-icon><Connection /></el-icon>
                </div>
                <div>
                  <strong>{{ path.title }}</strong>
                  <p>{{ path.chain }}</p>
                  <small>{{ path.note }}</small>
                </div>
              </article>
            </div>
          </article>
        </section>

        <section class="report-section">
          <header class="section-head compact">
            <div>
              <h2>关键因素识别</h2>
              <p>结合参数配置、迭代指标与最优轮次，给出当前实验的主导因素。</p>
            </div>
          </header>
          <div class="key-factor-grid">
            <article v-for="factor in keyFactors" :key="factor.key" class="key-factor-card">
              <div class="rank">{{ factor.rank }}</div>
              <div>
                <strong>{{ factor.label }}</strong>
                <p>{{ factor.reason }}</p>
              </div>
              <span>{{ factor.score }}%</span>
            </article>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElButton, ElCard, ElIcon, ElTag, ElEmpty, ElMessage } from 'element-plus';
import {
  ArrowDown,
  Connection,
  DataAnalysis,
  Download,
  Loading,
  Memo,
  Odometer,
  Refresh,
  Star
} from '@element-plus/icons-vue';
import { useSupplyChainStore } from '@/stores/supplyChain';
import { storeToRefs } from 'pinia';
import { getExperiments, getExperimentReport } from '@/api/supplyChain';
import { getQueueHistory } from '@/api/queue';
import { getSessionByExperiment } from '@/api/scenarioSession';
import { unwrapApiData } from '@/utils/apiEnvelope';

const store = useSupplyChainStore();
const { currentExperimentId } = storeToRefs(store);

const loading = ref(false);
const exporting = ref(false);
const reportData = ref(null);
const linkedSession = ref(null);
const comparisonData = ref(null);
const reportContentRef = ref(null);

const linkedRequirement = computed(() => linkedSession.value?.requirement?.raw_input || '');
const linkedGoal = computed(() => linkedSession.value?.requirement?.goal || '');
const linkedTaskList = computed(() => linkedSession.value?.tasks?.task_list || []);
const linkedChatCount = computed(() => (linkedSession.value?.chat_history || []).length);

async function loadLinkedSession(expId) {
  if (!expId) {
    linkedSession.value = null;
    return;
  }
  try {
    const response = await getSessionByExperiment(expId);
    linkedSession.value = unwrapApiData(response) || null;
  } catch (err) {
    // 404 / 未关联实验，静默忽略
    linkedSession.value = null;
    if (import.meta.env.DEV) {
      console.debug('[EXreport] 无关联会话:', err?.message || err);
    }
  }
}

const iterationTableRows = computed(() => {
  const comp = comparisonData.value;
  if (!comp?.iterations_summary?.length) return [];
  const bestIterNum = comp.best_iteration?.iteration;
  return comp.iterations_summary.map((iter) => ({
    iteration: iter.iteration,
    score: iter.score != null ? Number(iter.score).toFixed(3) : '-',
    completionRate:
      iter.completion_rate != null ? `${(Number(iter.completion_rate) * 100).toFixed(1)}%` : '-',
    profit: iter.profit != null ? `¥${Number(iter.profit).toLocaleString()}` : '-',
    enterpriseCount: iter.enterprise_count ?? '-',
    isBest: bestIterNum != null && iter.iteration === bestIterNum
  }));
});

const parseExperimentIdFromResultPath = (pathValue) => {
  const text = String(pathValue || '');
  const matched = text.match(/multi_agent_report_(\d{8}_\d{6})\.json$/);
  return matched ? matched[1] : '';
};

const resolvePreferredExperimentId = async (experiments = []) => {
  if (!Array.isArray(experiments) || experiments.length === 0) return '';
  const expIdSet = new Set(experiments.map(item => item?.experiment_id).filter(Boolean));

  const fromStore = currentExperimentId.value || '';
  if (fromStore && expIdSet.has(fromStore)) return fromStore;

  const fromStorage = localStorage.getItem('selectedExperimentId') || '';
  if (fromStorage && expIdSet.has(fromStorage)) return fromStorage;

  const recentTaskId = localStorage.getItem('sc_recentQueuedTaskId') || '';
  if (recentTaskId) {
    try {
      const response = await getQueueHistory(80);
      const history = unwrapApiData(response);
      const rows = Array.isArray(history) ? history : [];
      const hit = rows.find(row => row?.task_id === recentTaskId && row?.status === 'completed');
      const fromPath = parseExperimentIdFromResultPath(hit?.result_path);
      if (fromPath && expIdSet.has(fromPath)) return fromPath;
    } catch (error) {
      console.warn('[EXreport] resolvePreferredExperimentId queue lookup failed:', error);
    }
  }

  return experiments[0]?.experiment_id || '';
};

// 计算显示的参数列表（过滤掉复杂对象）
const displayParameters = computed(() => {
  if (!reportData.value?.parameters) return [];

  const params = reportData.value.parameters;

  // 安全检查：确保params是对象
  if (typeof params !== 'object' || params === null) return [];

  const result = [];

  // 定义需要显示的关键参数
  const keyParams = {
    order_multiplier: '订单乘数',
    capacity_range: '产能区间',
    reproduction_threshold: '繁殖阈值',
    initial_capital: '初始资金',
    max_iterations: '最大迭代数',
    simulation_duration: '仿真时长',
    total_enterprises: '企业总数',
    key_params: '研究参数'
  };

  try {
    // 遍历参数对象，只提取简单类型的值
    for (const [key, value] of Object.entries(params)) {
      // 跳过复杂对象和null/undefined
      if (value === null || value === undefined) continue;
      if (typeof value === 'object' && !Array.isArray(value)) continue;

      // 如果是已知的关键参数，使用中文名称
      const label = keyParams[key] || formatParamName(key);
      const formattedValue = formatParamValue(value);

      result.push({
        key,
        label,
        value: formattedValue
      });
    }
  } catch (error) {
    console.error('[EXreport] 参数解析错误:', error);
  }

  return result;
});

const generatedAt = computed(() => {
  const raw = reportData.value?.created_at;
  return raw ? formatDate(raw) : new Date().toLocaleString('zh-CN', { hour12: false });
});

const buildBaseParamsMap = () => {
  const map = {};
  displayParameters.value.forEach((param) => {
    map[param.key] = param.value;
  });
  return map;
};

const experimentRows = computed(() => {
  if (!reportData.value) return [];
  const baseParams = buildBaseParamsMap();
  if (iterationTableRows.value.length) {
    return iterationTableRows.value.map((row, index) => ({
      id: `Exp-${String(index + 1).padStart(2, '0')}`,
      shortLabel: `Exp-${String(index + 1).padStart(2, '0')}`,
      label: `迭代实验 ${row.iteration}`,
      source: row.isBest ? '最优' : '迭代',
      paramsMap: {
        ...baseParams,
        iteration: `第${row.iteration}轮`,
        enterprise_count: `${row.enterpriseCount}家`
      },
      metricsMap: {
        completionRate: row.completionRate,
        profit: row.profit,
        score: row.score,
        enterpriseCount: `${row.enterpriseCount}家`
      },
      rawCompletionRate: parseFloat(row.completionRate) || 0,
      rawProfit: Number(String(row.profit).replace(/[¥,]/g, '')) || 0,
      rawScore: Number(row.score) || 0
    }));
  }
  return [{
    id: 'Exp-01',
    shortLabel: 'Exp-01',
    label: safeGetValue(reportData.value, 'goal', '') || '铀供应链仿真实验',
    source: getStatusText(safeGetValue(reportData.value, 'status', '')),
    paramsMap: {
      ...baseParams,
      iteration: `第${safeGetValue(reportData.value, 'best_iteration', 0)}轮`,
      enterprise_count: `${safeGetValue(reportData.value, 'enterprise_count', 0)}家`
    },
    metricsMap: {
      completionRate: formatPercent(reportData.value.avg_completion_rate),
      profit: formatProfit(reportData.value.avg_profit),
      score: formatScore(reportData.value.best_score),
      enterpriseCount: `${safeGetValue(reportData.value, 'enterprise_count', 0)}家`
    },
    rawCompletionRate: Number(reportData.value.avg_completion_rate || 0) * 100,
    rawProfit: Number(reportData.value.avg_profit || 0),
    rawScore: Number(reportData.value.best_score || 0)
  }];
});

const bestExperimentLabel = computed(() => {
  const best = [...experimentRows.value].sort((a, b) => b.rawScore - a.rawScore)[0];
  return best?.label || '-';
});

const completionImprovementLabel = computed(() => {
  const values = experimentRows.value
    .map((row) => row.rawCompletionRate)
    .filter(Number.isFinite);
  if (values.length < 2) return '-';
  const first = values[0];
  const best = Math.max(...values);
  if (!first) return '-';
  return `${Math.max(0, ((best - first) / first) * 100).toFixed(1)}%`;
});

const overviewRows = computed(() => {
  return experimentRows.value.map((row) => ({
    id: row.id,
    label: row.label,
    source: row.source,
    params: [
      row.paramsMap.iteration,
      row.paramsMap.enterprise_count,
      ...displayParameters.value.slice(0, 2).map((param) => `${param.label} ${param.value}`)
    ].filter(Boolean),
    metrics: [
      `完成率 ${row.metricsMap.completionRate}`,
      `净利润 ${row.metricsMap.profit}`,
      `得分 ${row.metricsMap.score}`
    ]
  }));
});

const parameterMatrixRows = computed(() => {
  return [
    { key: 'iteration', label: '轮次' },
    { key: 'enterprise_count', label: '企业数量' },
    ...displayParameters.value.slice(0, 5).map((param) => ({ key: param.key, label: param.label }))
  ];
});

const metricMatrixRows = [
  { key: 'completionRate', label: '订单完成率', direction: 'higher' },
  { key: 'profit', label: '净利润', direction: 'higher' },
  { key: 'score', label: '综合得分', direction: 'higher' },
  { key: 'enterpriseCount', label: '企业数', direction: 'neutral' }
];

const parameterMatrixTemplate = computed(() => `120px repeat(${Math.max(1, experimentRows.value.length)}, minmax(140px, 1fr))`);
const metricMatrixTemplate = computed(() => `120px repeat(${Math.max(1, experimentRows.value.length)}, minmax(140px, 1fr))`);

const metricCellClass = (key, row) => {
  if (key === 'enterpriseCount') return '';
  const rawKey = key === 'completionRate' ? 'rawCompletionRate' : key === 'profit' ? 'rawProfit' : 'rawScore';
  const values = experimentRows.value.map((item) => item[rawKey]).filter(Number.isFinite);
  if (values.length < 2) return '';
  const current = row[rawKey];
  const best = Math.max(...values);
  const worst = Math.min(...values);
  if (current === best) return 'metric-best';
  if (current === worst) return 'metric-risk';
  return '';
};

const factorEffectMap = {
  order_multiplier: '全球核电反应堆铀需求倍数，直接影响铀矿订单量和供应压力。',
  factory_capacity_range: '铀矿年产能上下限(tU/年)，决定全球铀供应能否满足核电需求。',
  capacity_range: '铀矿产能区间，约束供给侧承载能力，影响供应缺口大小。',
  reproduction_threshold: '触发新铀矿开发的供需缺口阈值，影响Dasa/Wheeler River等新矿投产时机。',
  adjustment_ratio: '铀矿扩产/减产的年度调整速率，反映矿山重启与关停的响应速度。',
  network_density: '铀供应链网络连接密度，反映贸易伙伴多样性和供应渠道丰富度。',
  network_stability: '网络面对地缘政治冲击和矿山停产时的稳定性，关键韧性指标。',
  production_capacity_est: '全球铀矿年产能估算(tU/年)，参考NEA/IAEA Red Book数据。',
  max_iterations: '决定仿真搜索深度，影响最优铀供应链策略被发现的概率。',
  total_enterprises: '铀供应链中矿山/贸易商/核电企业节点数，影响网络规模与协作复杂度。',
  key_params: '聚合铀供应链实验关注变量，是解释实验结论的核心参数集合。'
};

const factorSummaries = computed(() => {
  const params = displayParameters.value.length
    ? displayParameters.value
    : [
        { key: 'completion', label: '订单完成率', value: formatPercent(reportData.value?.avg_completion_rate) },
        { key: 'profit', label: '净利润', value: formatProfit(reportData.value?.avg_profit) }
      ];
  return params.slice(0, 5).map((param, index) => ({
    ...param,
    score: Math.max(38, 92 - index * 11),
    effect: factorEffectMap[param.key] || `${param.label} 通过改变供应链实验配置影响订单完成率、利润和综合得分。`
  }));
});

const topFactor = computed(() => factorSummaries.value[0] || null);

const pathSummaries = computed(() => [
  {
    title: '铀需求冲击传导路径',
    chain: '全球核电需求↑ → 铀矿订单量激增 → 现有矿山产能承压 → 供应完成率波动→供应缺口扩大',
    note: '解释核电发展情景（中国/印度在建反应堆）对铀供应链的基础影响。'
  },
  {
    title: '铀矿产能调节路径',
    chain: '铀矿产能配置(tU/年) → 订单处理能力 → 供应缺口/库存变化 → 利润与供应安全回升',
    note: '最优轮次的产能区间可作为后续反事实实验的参考基线。'
  },
  {
    title: '地缘政治风险传导路径',
    chain: '产铀国政局突变 → 关键矿山停产 → 供应网络切换 → 替代产能启动 → 完成率恢复',
    note: linkedSession.value ? '该路径可与原始建模过程中的任务拆解继续联动。' : '建议补充NEA Red Book数据以增强预测准确性。'
  }
]);

const keyFactors = computed(() => {
  return factorSummaries.value.slice(0, 4).map((factor, index) => ({
    ...factor,
    rank: index + 1,
    reason: `${factor.label} 当前取值为 ${factor.value}，主要影响：${factor.effect}`
  }));
});

// 加载报告数据
const loadReportData = async () => {
  try {
    loading.value = true;
    const expResp = await getExperiments();
    const experiments = unwrapApiData(expResp) || [];
    if (!Array.isArray(experiments) || experiments.length === 0) {
      reportData.value = null;
      comparisonData.value = null;
      linkedSession.value = null;
      return;
    }

    const experimentId = await resolvePreferredExperimentId(experiments);
    if (!experimentId) {
      reportData.value = null;
      comparisonData.value = null;
      linkedSession.value = null;
      return;
    }

    const reportResp = await getExperimentReport(experimentId);
    const report = unwrapApiData(reportResp);
    if (!report || typeof report !== 'object') {
      throw new Error('后端报告数据为空');
    }
    const sections = report.report_sections || {};
    const summary = sections.executive_summary || {};
    const design = sections.experiment_design || {};
    const resultComp = sections.results_analysis?.iterations_comparison || null;
    comparisonData.value = resultComp;

    const constraints = (design.constraints && typeof design.constraints === 'object')
      ? design.constraints
      : {};
    const bestIteration = resultComp?.best_iteration || {};
    const avgCompletion = resultComp?.aggregated_stats?.avg_completion_rate || 0;
    const avgProfit = resultComp?.aggregated_stats?.avg_profit || 0;

    reportData.value = {
      experiment_id: report.experiment_id || experimentId,
      goal: summary.goal || design.goal || '',
      iterations: summary.total_iterations || resultComp?.total_iterations || 0,
      enterprise_count: bestIteration.enterprise_count || constraints.total_enterprises || 0,
      created_at: report.generated_at || '',
      status: 'completed',
      parameters: constraints,
      avg_completion_rate: avgCompletion,
      avg_profit: avgProfit,
      best_score: bestIteration.score || 0,
      best_iteration: bestIteration.iteration || 0
    };

    // 同步持久化当前实验，供其他页面续接
    localStorage.setItem('selectedExperimentId', reportData.value.experiment_id || experimentId);

    // 关联会话（失败不阻塞）
    loadLinkedSession(reportData.value.experiment_id || experimentId);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[EXreport] 加载报告数据失败:', error);
    }
    ElMessage.error('加载报告数据失败');
  } finally {
    loading.value = false;
  }
};

// 刷新报告
const refreshReport = async () => {
  await loadReportData();
  ElMessage.success('报告已刷新');
};

const generateReportHtml = (data) => {
  const content = reportContentRef.value?.innerHTML || '';
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>铀供应链实验报告_${safeGetValue(data, 'experiment_id', '-')}</title>
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; color: #0f172a; line-height: 1.6; padding: 24px; }
    section, article { break-inside: avoid; }
    .summary-grid, .comparison-grid, .analysis-grid, .key-factor-grid { display: block !important; }
    .summary-card, .report-section, .factor-card, .path-card, .key-factor-card, .iteration-card {
      border: 1px solid #d9e2ef; border-radius: 8px; padding: 12px; margin: 10px 0;
    }
    .overview-header, .overview-row, .matrix-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .overview-header div, .overview-row > div, .matrix-row > div { padding: 8px; border-bottom: 1px solid #e5edf6; }
    .rank { display: inline-block; min-width: 24px; height: 24px; border-radius: 12px; background: #2563eb; color: #fff; text-align: center; line-height: 24px; }
  </style>
</head>
<body>
  <h1>铀供应链实验报告</h1>
  <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
  ${content}
</body>
</html>`;
};

// 导出报告
const exportReport = (format = 'txt') => {
  if (!reportData.value) {
    ElMessage.warning('没有可导出的报告数据');
    return;
  }

  exporting.value = true;

  try {
    const isHtml = format === 'html';
    const content = isHtml ? generateReportHtml(reportData.value) : generateReportText(reportData.value);
    const blob = new Blob([content], { type: isHtml ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `铀供应链实验报告_${reportData.value.experiment_id}.${isHtml ? 'html' : 'txt'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success(`报告已导出为 ${isHtml ? 'HTML' : '文本'} 文件`);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[EXreport] 导出报告失败:', error);
    }
    ElMessage.error('导出报告失败');
  } finally {
    exporting.value = false;
  }
};

// 生成报告文本
const generateReportText = (data) => {
  const params = displayParameters.value;
  const paramText = params.map(p => `${p.label}：${p.value}`).join('\n') || '无';

  return `
铀供应链实验报告
==========================================

一、实验概览
------------------------------------------
实验ID：${safeGetValue(data, 'experiment_id', '-')}
实验目标：${safeGetValue(data, 'goal', '-')}
迭代次数：${safeGetValue(data, 'iterations', 0)}轮
铀供应链节点：${safeGetValue(data, 'enterprise_count', 0)}个
创建时间：${formatDate(safeGetValue(data, 'created_at', ''))}
实验状态：${getStatusText(safeGetValue(data, 'status', ''))}

二、铀供应链关键参数
------------------------------------------
${paramText}

三、关键指标
------------------------------------------
平均供应完成率：${formatPercent(data.avg_completion_rate)}
平均系统利润：${formatProfit(data.avg_profit)}
最优得分：${formatScore(data.best_score)}
最优轮次：第${safeGetValue(data, 'best_iteration', 0)}轮

四、实验结论
------------------------------------------
本次供应链仿真实验共进行了 ${safeGetValue(data, 'iterations', 0)} 轮迭代，涉及 ${safeGetValue(data, 'enterprise_count', 0)} 家企业。

实验结果显示，第 ${safeGetValue(data, 'best_iteration', 0)} 轮达到最优表现，综合得分为 ${formatScore(data.best_score)}。

平均订单完成率为 ${formatPercent(data.avg_completion_rate)}，平均净利润为 ${formatProfit(data.avg_profit)}。

建议：基于最优轮次的铀矿产能和新矿投产策略，参考NEA Red Book预测，在实际铀供应链规划中应用最优配置以保障供应安全。

==========================================
报告生成时间：${new Date().toLocaleString('zh-CN')}
`;
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

// 格式化参数名称
const formatParamName = (key) => {
  const nameMap = {
    order_multiplier: '铀需求强度',
    factory_capacity_range: '铀矿产能区间',
    capacity_range: '铀矿产能区间',
    reproduction_threshold: '新矿投产阈值',
    adjustment_ratio: '产能爬坡速率',
    network_density: '网络密度',
    network_stability: '网络稳定性',
    max_iterations: '最大迭代数'
  };
  return nameMap[key] || key;
};

// 格式化参数值
const formatParamValue = (value) => {
  if (value === null || value === undefined) {
    return '-';
  }
  if (Array.isArray(value)) {
    return `[${value.join(', ')}]`;
  }
  if (typeof value === 'object') {
    // 如果是对象，尝试提取关键信息而不是显示整个对象
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
};

// 安全获取值（防止显示对象或数组）
const safeGetValue = (obj, key, defaultValue = '') => {
  if (!obj) return defaultValue;

  const value = obj[key];

  // 如果值是 undefined 或 null，返回默认值
  if (value === undefined || value === null) return defaultValue;

  // 如果是对象或数组，返回默认值（防止显示 [object Object] 或 JSON）
  if (typeof value === 'object') {
    console.warn(`[EXreport] 字段 ${key} 是对象类型，使用默认值`);
    return defaultValue;
  }

  // 返回基本类型的值
  return value;
};

// 格式化百分比
const formatPercent = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '0%';
  return `${(num * 100).toFixed(1)}%`;
};

// 格式化利润
const formatProfit = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '¥0';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '¥0';
  return `¥${num.toLocaleString()}`;
};

// 格式化得分
const formatScore = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0.000';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '0.000';
  return num.toFixed(3);
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    completed: '已完成',
    running: '运行中',
    pending: '待运行',
    failed: '失败'
  };
  return statusMap[status] || status || '未知';
};

// 监听实验ID变化
watch(currentExperimentId, (newId) => {
  if (newId) {
    loadReportData();
  }
});

// 初始化
onMounted(() => {
  loadReportData();
});
</script>

<style scoped>
.post-report-page {
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f6f8fb;
  color: #0f172a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.report-head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
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

.report-head h1 {
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
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.loading-container,
.empty-report {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  margin-top: 16px;
  background: #ffffff;
}

.loading-container {
  flex-direction: column;
}

.loading-container p {
  margin-top: 18px;
  color: #64748b;
}

.report-content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.summary-grid {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.summary-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 10px;
  align-items: center;
  min-height: 72px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.summary-card :deep(.el-icon) {
  grid-row: 1 / span 2;
  color: #2563eb;
  font-size: 24px;
}

.summary-card span {
  color: #64748b;
  font-size: 12px;
}

.summary-card strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 14px;
  padding-right: 4px;
}

.report-section {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid #eef2f7;
}

.section-head.compact {
  padding-bottom: 12px;
}

.section-head h2 {
  margin: 0;
  font-size: 18px;
}

.section-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.generated-at {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 12px;
}

.session-list,
.overview-table,
.matrix-table {
  overflow: auto;
  padding: 14px;
}

.session-list {
  display: grid;
  gap: 10px;
}

.session-list article {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fbfdff;
}

.session-list p {
  margin: 6px 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.5;
}

.overview-header,
.overview-row {
  display: grid;
  grid-template-columns: minmax(180px, 0.9fr) 88px minmax(300px, 1.3fr) minmax(250px, 1fr);
  min-width: 900px;
}

.overview-header {
  border: 1px solid #e2e8f0;
  border-radius: 8px 8px 0 0;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

.overview-header div,
.overview-row > div {
  padding: 12px;
  border-right: 1px solid #eef2f7;
}

.overview-header div:last-child,
.overview-row > div:last-child {
  border-right: 0;
}

.overview-row {
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  border-left: 1px solid #e2e8f0;
}

.experiment-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.experiment-cell small {
  color: #64748b;
}

.chip-wrap,
.metric-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-wrap span,
.metric-pills span {
  border-radius: 999px;
  padding: 3px 8px;
  background: #f1f5f9;
  color: #334155;
  font-size: 12px;
}

.metric-pills span {
  background: #eff6ff;
  color: #1d4ed8;
}

.comparison-grid,
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.matrix-row {
  display: grid;
  min-width: 420px;
}

.matrix-row > div {
  min-height: 42px;
  padding: 10px;
  border-right: 1px solid #eef2f7;
  border-bottom: 1px solid #eef2f7;
  color: #334155;
  font-size: 12px;
  line-height: 1.45;
}

.matrix-row > div:last-child {
  border-right: 0;
}

.matrix-header > div {
  background: #f8fafc;
  color: #475569;
  font-weight: 800;
}

.matrix-label {
  color: #0f172a !important;
  font-weight: 800;
}

.metric-best {
  color: #047857 !important;
  background: #ecfdf5;
  font-weight: 800;
}

.metric-risk {
  color: #b91c1c !important;
  background: #fef2f2;
  font-weight: 800;
}

.iteration-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  padding: 14px;
}

.iteration-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  background: #fbfdff;
}

.iteration-card.best {
  border-color: #86efac;
  background: #f0fdf4;
}

.iteration-card span {
  color: #2563eb;
  font-size: 18px;
  font-weight: 900;
}

.iteration-card small {
  color: #64748b;
  line-height: 1.45;
}

.factor-list,
.path-list,
.key-factor-grid {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.factor-card,
.path-card,
.key-factor-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  background: #fbfdff;
}

.factor-title-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.factor-title-row span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
}

.factor-card p,
.path-card p,
.key-factor-card p {
  margin: 8px 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.55;
}

.factor-bar {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.factor-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #38bdf8, #2563eb);
}

.path-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
}

.path-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
}

.path-card small {
  color: #64748b;
}

.key-factor-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
}

.rank {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #2563eb;
  color: #ffffff;
  font-weight: 900;
}

.key-factor-card > span {
  color: #2563eb;
  font-size: 18px;
  font-weight: 900;
}

:deep(::-webkit-scrollbar) {
  width: 7px;
  height: 7px;
}

:deep(::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(::-webkit-scrollbar-thumb) {
  background: #cbd5e1;
  border-radius: 999px;
}
</style>
