/**
 * 迭代（每轮）展示用元数据
 * 供 PlanIterationTimeline.vue（环境标签）与 IterationDetailDrawer.vue（完整指标分组）复用。
 */

// 关键观察指标（在完整指标网格中高亮）
export const KEY_METRICS = new Set([
  'order_completion_rate',
  'overall_score',
  'total_net_profit'
])

/**
 * 指标元信息：label（中文名）+ fmt（格式化类型）
 * fmt: pct(0-1→%)、pct0(0-1→整数%)、float3、int、profit、score
 */
export const METRIC_META = {
  order_completion_rate: { label: '订单完成率', fmt: 'pct' },
  overall_score: { label: '综合得分', fmt: 'score' },
  total_net_profit: { label: '净利润', fmt: 'profit' },

  cooperation_count: { label: '协作次数', fmt: 'int' },
  network_density: { label: '网络密度', fmt: 'float3' },
  edge_count: { label: '协作边数', fmt: 'int' },
  final_enterprise_count: { label: '期末企业数', fmt: 'int' },
  initial_enterprise_count: { label: '初始企业数', fmt: 'int' },
  factory_count: { label: '工厂数量', fmt: 'int' },

  total_orders: { label: '订单总数', fmt: 'int' },
  completed_orders: { label: '已完成订单', fmt: 'int' },
  level1_total: { label: '一级订单总数', fmt: 'int' },
  level1_processed: { label: '一级已处理', fmt: 'int' },
  level1_completion_rate: { label: '一级完成率', fmt: 'pct' },
  level2_total: { label: '二级订单总数', fmt: 'int' },
  level2_processed: { label: '二级已处理', fmt: 'int' },
  level2_completion_rate: { label: '二级完成率', fmt: 'pct' },

  survival_rate: { label: '企业存活率', fmt: 'pct0' },
  api_count: { label: '制造商数量', fmt: 'int' },
  mashup_count: { label: '集成商数量', fmt: 'int' },
  provider_count: { label: '供应商数量', fmt: 'int' }
}

// 完整指标网格的分组与顺序（仅渲染 metrics 中实际存在的键）
export const METRIC_GROUPS = [
  { title: '关键指标', keys: ['order_completion_rate', 'overall_score', 'total_net_profit'] },
  {
    title: '网络协作',
    keys: ['cooperation_count', 'network_density', 'edge_count', 'final_enterprise_count', 'initial_enterprise_count', 'factory_count']
  },
  {
    title: '订单履约',
    keys: ['total_orders', 'completed_orders', 'level1_total', 'level1_processed', 'level1_completion_rate', 'level2_total', 'level2_processed', 'level2_completion_rate']
  },
  { title: '其他指标', keys: ['survival_rate', 'api_count', 'mashup_count', 'provider_count'] }
]

/** 按指标类型安全格式化数值 */
export const formatMetric = (key, value) => {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '-'
  const v = Number(value)
  const fmt = METRIC_META[key]?.fmt || 'float3'
  switch (fmt) {
    case 'pct':
      return `${(v * 100).toFixed(1)}%`
    case 'pct0':
      return `${(v * 100).toFixed(0)}%`
    case 'float3':
      return v.toFixed(3)
    case 'int':
      return Math.round(v).toLocaleString('zh-CN')
    case 'profit':
      return Math.round(v).toLocaleString('zh-CN')
    case 'score':
      return v.toFixed(3)
    default:
      return String(value)
  }
}

/** 市场环境（macro_context.context_type）→ 中文 + Element 标签类型 */
export const CONTEXT_TYPE_META = {
  recession: { label: '市场衰退', type: 'danger' },
  crisis: { label: '危机冲击', type: 'danger' },
  decline: { label: '需求下行', type: 'danger' },
  volatile: { label: '剧烈震荡', type: 'warning' },
  fluctuating: { label: '震荡波动', type: 'warning' },
  stable: { label: '平稳运行', type: 'info' },
  steady: { label: '平稳运行', type: 'info' },
  normal: { label: '常规环境', type: 'info' },
  recovery: { label: '市场复苏', type: 'success' },
  growth: { label: '市场增长', type: 'success' },
  expansion: { label: '市场扩张', type: 'success' },
  boom: { label: '高速增长', type: 'success' }
}

export const getContextMeta = (contextType) => {
  const key = String(contextType || '').trim().toLowerCase()
  return CONTEXT_TYPE_META[key] || { label: contextType || '常规环境', type: 'info' }
}

// 轮次来源（task.source）→ 中文
export const SOURCE_LABELS = {
  new_generation: '新生成',
  mutation: '变异调整',
  crossover: '交叉组合',
  exploitation: '局部优化',
  exploration: '探索尝试',
  native: '基线方案',
  initial: '初始方案'
}

export const getSourceLabel = (source) => SOURCE_LABELS[source] || source || '-'
