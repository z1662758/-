<template>
  <el-scrollbar :height="scrollHeight">
    <div class="supply-chain-intelligence osint-live">
      <!-- ===== 顶部:实时动态(由本次真实事件驱动,不再是固定新闻) ===== -->
      <div class="header-card">
        <div class="news-ticker-wrap">
          <div class="news-ticker-label">
            <el-icon><BellFilled /></el-icon> 供应链实时动态
          </div>
          <div class="news-ticker-content">
            <div v-if="!tickerItems.length" class="osint-ticker-empty">
              本次尚未筛选出与当前问题相关的事件
            </div>
            <div v-else class="news-ticker-track">
              <span v-for="(item, idx) in [...tickerItems, ...tickerItems]" :key="idx" class="news-ticker-item">
                <span class="ticker-time">{{ formatDate(item.occurredAt) }}</span>
                <span class="ticker-title">{{ item.title }}</span>
                <span class="ticker-source">({{ sourceTypeLabel(item) }})</span>
                <span class="ticker-divider">◆</span>
              </span>
            </div>
          </div>
        </div>

        <div class="header-main-content">
          <div class="header-banner">
            <div class="banner-top">
              <div class="source-tag" :class="`is-${sourceType}`">
                <span class="source-tag__dot"></span>{{ sourceLabelText }}
              </div>
              <div class="live-tag">
                <span class="live-dot"></span>
                {{ dataSource === 'example' ? '案例数据' : '当前任务数据' }}
              </div>
              <div v-if="generatedAt" class="update-time">生成于 {{ formatDate(generatedAt) }}</div>
            </div>
            <div class="banner-main">
              <div class="banner-text">
                <h1>开源情报 <span class="highlight">风险事件追踪</span></h1>
                <p>按本次研判问题筛选供应链相关事件，标注发生地点、影响对象与信息来源</p>
              </div>
              <div class="banner-stats">
                <div class="stat">
                  <div class="num">{{ activeEvents.length }}</div>
                  <div class="label">未解除事件</div>
                </div>
                <div class="stat">
                  <div class="num">{{ counts.relevant }}</div>
                  <div class="label">命中本次问题</div>
                </div>
                <div class="stat">
                  <div class="num">{{ counts.effective }}</div>
                  <div class="label">当前有效</div>
                </div>
                <div class="stat">
                  <div class="num">{{ plottedCount }}</div>
                  <div class="label">已定位</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 筛选 ===== -->
      <OsintFilterBar
        v-model:scope="scope"
        v-model:state="stateFilter"
        :counts="counts"
      />

      <!-- ===== 地图 ===== -->
      <div class="map-section">
        <div class="map-container">
          <WorldBaseMap :events="mapEvents" @select-event="onMapSelect" @zoom="onZoom" />

          <div class="map-legend">
            <span><i class="dot" style="background:#ef4444"></i>高风险</span>
            <span><i class="dot" style="background:#f59e0b"></i>中风险</span>
            <span><i class="dot" style="background:#10b981"></i>低风险</span>
            <span class="map-legend__hint">
              数字圆点代表该区域聚合了多个事件，放大地图可拆开
            </span>
          </div>

          <div v-if="!mapEvents.length" class="map-empty">
            <p>当前筛选下没有可定位的事件</p>
            <p class="map-empty__sub">
              共 {{ visibleEvents.length }} 条事件中 {{ unlocatedCount }} 条暂时无法精确定位，详见下方列表。
            </p>
          </div>
        </div>
      </div>

      <!-- ===== 事件列表 ===== -->
      <div class="events-section">
        <div class="events-header">
          <h2>事件列表<span class="events-count">{{ visibleEvents.length }} 条</span></h2>
          <div v-if="clusterIds" class="events-cluster">
            已在图中选中 {{ clusterIds.length }} 个事件
            <el-button link type="primary" size="small" @click="clearCluster">清除</el-button>
          </div>
          <span class="events-tip">点击卡片查看影响对象与来源原文</span>
        </div>

        <div v-if="!visibleEvents.length" class="events-empty">
          <el-empty description="当前筛选条件下没有事件" />
        </div>
        <div v-else class="events-list">
          <OsintEventCard
            v-for="event in pagedEvents"
            :key="event.eventId"
            :event="event"
            :selected="selected?.eventId === event.eventId"
            @select="openDetail"
          />
        </div>

        <el-pagination
          v-if="visibleEvents.length > pageSize"
          class="events-pager"
          layout="prev, pager, next"
          :total="visibleEvents.length"
          :page-size="pageSize"
          :current-page="page"
          @current-change="(p) => (page = p)"
        />
      </div>
    </div>

    <OsintEventDetail
      v-model="detailVisible"
      :event="selected"
      :route-names="routeNames"
    />
  </el-scrollbar>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { BellFilled } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { unwrapApiData } from '@/utils/session'
import WorldBaseMap from '@/components/SupplyChain/WorldBaseMap.vue'
import OsintFilterBar from '@/views/SCnet/components/osint/OsintFilterBar.vue'
import OsintEventCard from '@/views/SCnet/components/osint/OsintEventCard.vue'
import OsintEventDetail from '@/views/SCnet/components/osint/OsintEventDetail.vue'
import {
  formatDate,
  hasCoordinates,
  locationText,
  riskColor,
  riskLevelChar,
  sourceTypeLabel,
} from '@/views/SCnet/components/osint/osintDisplay'

const props = defineProps({
  /** 开源情报阶段的 artifact 信封(真实任务与案例共用同一结构) */
  artifact: { type: Object, default: null },
  /** 'live' | 'example' */
  dataSource: { type: String, default: 'live' },
  /**
   * 初始事件范围。默认 'relevant'(跟随本次研判问题);知识平台的
   * 「数据治理」没有研判问题可用,全部事件的 relevance 都是 0,
   * 那里传 'all' 才能看到已入库的情报。
   */
  initialScope: { type: String, default: 'relevant' },
  /** 滚动区高度(内嵌到知识平台时由外层给,默认沿用整页时的 89vh) */
  scrollHeight: { type: String, default: '89vh' },
  /**
   * 没有任务上下文时取哪一份情报。默认 'uranium' 沿用原有行为；
   * 知识平台的「数据治理」按当前领域传，否则汽车领域导入的条目取不到。
   */
  scenario: { type: String, default: 'uranium' },
})

/**
 * 没有任务上下文(直接访问本页)时,向后端取一份标准化事件,
 * 结构与任务里的 osint artifact 完全一致 —— 页面代码只有一套。
 */
const fallback = ref(null)
const fallbackLoading = ref(false)
const fallbackError = ref('')

const activeArtifact = computed(() => props.artifact || fallback.value)

/**
 * 旧任务保存的是 registry 原始事件(event_id/risk_effective/country_id)，
 * 新任务保存的是标准展示事件(eventId/riskAssessment/location)。历史任务不能
 * 因为字段升级而显示成 0 条；这里仅做确定性的字段兼容，不改变风险结论。
 */
const LEGACY_COUNTRY_LOCATIONS = Object.freeze({
  KAZ: { name: '哈萨克斯坦供应区', country: '哈萨克斯坦', latitude: 48, longitude: 67 },
  CHN: { name: '中国供应链节点', country: '中国', latitude: 35, longitude: 104 },
  CAN: { name: '加拿大供应区', country: '加拿大', latitude: 56.1, longitude: -106.3 },
  NAM: { name: '纳米比亚供应区', country: '纳米比亚', latitude: -22.6, longitude: 17.1 },
  RUS: { name: '俄罗斯供应区', country: '俄罗斯', latitude: 61.5, longitude: 105.3 },
  UZB: { name: '乌兹别克斯坦供应区', country: '乌兹别克斯坦', latitude: 41.4, longitude: 64.6 },
  AUS: { name: '澳大利亚供应区', country: '澳大利亚', latitude: -25.3, longitude: 133.8 },
  NER: { name: '尼日尔供应区', country: '尼日尔', latitude: 17.6, longitude: 8.1 },
})

const LEGACY_ROUTE_NAMES = Object.freeze({
  kazakhstan: '哈萨克斯坦—中国中亚铁路运输路线',
  canada: '加拿大供应路线',
  namibia: '纳米比亚供应路线',
  russia: '俄罗斯供应路线',
  uzbekistan: '乌兹别克斯坦供应路线',
  australia: '澳大利亚供应路线',
  niger: '尼日尔供应路线',
})

function sourceNameFromUrl(value) {
  if (!value) return ''
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function normalizeLegacyEvent(event) {
  if (!event || event.eventId) return event

  const routes = Array.isArray(event.affected_route_ids) ? event.affected_route_ids : []
  const nodes = Array.isArray(event.affected_node_ids) ? event.affected_node_ids : []
  const country = LEGACY_COUNTRY_LOCATIONS[String(event.country_id || '').toUpperCase()]
  const sourceUrl = event.primary_source || (/^https?:\/\//i.test(event.source || '') ? event.source : '')
  const isEffective = Boolean(event.risk_effective)
  const isRelevant = routes.length > 0 || nodes.length > 0 || event.event_scope === 'ROUTE_SPECIFIC'
  const routeText = routes.map((id) => LEGACY_ROUTE_NAMES[id] || id).join('、')
  const impact = event.risk_effective_reason || event.runtime_status_reason || ''

  return {
    eventId: event.event_id || event.id || `legacy-${event.title || 'event'}`,
    title: event.title || '未命名风险事件',
    summary: event.summary || event.description || (routeText
      ? `该事件涉及${country?.country || '相关供应区域'}，可能影响${routeText}。`
      : `该事件涉及${country?.country || '相关供应区域'}的供应链运行。`),
    contentExcerpt: event.content || event.summary || event.description || '',
    riskType: event.event_type || '',
    severity: String(event.severity_class || 'LOW').toLowerCase(),
    severityLabel: `${event.severity_class === 'HIGH' ? '高' : event.severity_class === 'MEDIUM' ? '中' : '低'}风险`,
    severityScore: Number(event.severity) || 0,
    status: event.event_state || '',
    occurredAt: event.event_date || event.published_at || '',
    publishedAt: event.published_at || event.event_date || '',
    retrievedAt: '',
    location: country
      ? { ...country, region: country.country, city: '', precision: 'country' }
      : { name: '', country: '', region: '', city: '', latitude: null, longitude: null, precision: 'unresolved' },
    affectedEntities: [],
    affectedNodeIds: nodes,
    affectedNodeNames: [],
    affectedRouteIds: routes,
    relevance: {
      score: isRelevant ? 1 : 0,
      reason: isRelevant ? `与本次关注路线相关：${routeText || '已关联供应链节点'}` : '',
      matchedTerms: [],
    },
    riskAssessment: {
      isEffective,
      residualWeight: isEffective ? 1 : 0,
      impactSummary: impact,
      eligibilityCode: event.runtime_status || '',
      eligibilityReason: event.runtime_status_reason || event.risk_effective_reason || '',
    },
    sources: sourceUrl ? [{
      sourceName: sourceNameFromUrl(sourceUrl),
      sourceTitle: event.title || '',
      sourceUrl,
      author: '',
      publishedAt: event.published_at || '',
      language: '',
      evidenceExcerpt: event.description || '',
    }] : [],
    sourceType: event.freshness_class === 'HISTORICAL_CONTEXT' ? 'historical' : 'knowledge_base',
    isRelevant,
    impactMode: routes.includes('kazakhstan') ? 'direct' : 'indirect',
    impactModeLabel: routes.includes('kazakhstan') ? '直接影响' : '间接影响',
    impactModeReason: routes.includes('kazakhstan')
      ? '事件直接关联用户关注的供应路线或路线节点。'
      : '事件通过全球供需、价格、替代采购或合规成本传导，不直接代表用户关注路线发生中断。',
  }
}

const events = computed(() => {
  const value = activeArtifact.value?.result?.events
  return Array.isArray(value) ? value.map(normalizeLegacyEvent) : []
})

const CLOSED_EVENT_STATES = new Set(['RESOLVED', 'RECOVERED', 'SUPERSEDED'])
const activeEvents = computed(() => events.value.filter(
  (event) => !CLOSED_EVENT_STATES.has(String(event.status || '').toUpperCase()),
))
/**
 * 数据来源与正式性标签(要求十四):
 * 只给用户看来源类型,不展示 osint_mode / eligibility code 这类内部字段。
 */
const SOURCE_LABELS = {
  current_task: '数据来源：当前任务',
  example: '数据来源：案例结果',
  fallback: '背景数据，仅供参考',
  simulation: '模拟结果，不作为当前任务结论',
  imported: '导入结果',
}
const sourceType = computed(() => {
  const declared = activeArtifact.value?.provenance?.sourceType
  if (declared) return declared
  return props.dataSource === 'example' ? 'example' : 'current_task'
})
const sourceLabelText = computed(() => SOURCE_LABELS[sourceType.value] || SOURCE_LABELS.fallback)
const generatedAt = computed(
  () => activeArtifact.value?.result?.generated_at || activeArtifact.value?.completedAt || '',
)

async function loadFallback() {
  if (props.artifact || fallback.value || fallbackLoading.value) return
  fallbackLoading.value = true
  fallbackError.value = ''
  try {
    const response = await request({
      url: '/scenario/expert/osint/events',
      method: 'get',
      params: { scenario: props.scenario },
    })
    const data = unwrapApiData(response) || response?.data || response
    if (data?.events) fallback.value = { result: data, status: 'completed' }
  } catch (e) {
    fallbackError.value = e?.message || '开源情报数据加载失败'
  } finally {
    fallbackLoading.value = false
  }
}

// fallback 缓存后本实例不再重取；换领域/导入后要刷新由外层改 key 重挂载
onMounted(loadFallback)
watch(() => props.artifact, (next) => { if (!next) loadFallback() })

/** 路线 id → 中文名,详情里把 kazakhstan 显示成哈萨克斯坦 */
const routeNames = computed(() => {
  const routes = activeArtifact.value?.result?.routes || []
  const map = { ...LEGACY_ROUTE_NAMES }
  for (const route of routes) {
    if (route?.id) map[route.id] = route.country || route.id
  }
  return map
})

/* ---------- 筛选 ---------- */
const scope = ref(props.initialScope || 'relevant')
// 默认仅展示尚未解除的相关事件；已解除、已恢复事件不进入列表和地图。
const stateFilter = ref('active')
const page = ref(1)
const pageSize = 10
const selected = ref(null)
const detailVisible = ref(false)
/** 点聚合点时把列表收敛到该簇的事件。必须在 watch 使用前声明。 */
const clusterIds = ref(null)

const counts = computed(() => {
  const list = activeEvents.value
  return {
    all: list.length,
    relevant: list.filter((e) => e.isRelevant).length,
    fresh: list.filter((e) => e.sourceType === 'current_retrieval').length,
    knowledge: list.filter((e) => e.sourceType === 'knowledge_base').length,
    historical: list.filter((e) => e.sourceType === 'historical').length,
    effective: list.filter((e) => e.riskAssessment?.isEffective).length,
    active: list.length,
    high: list.filter((e) => e.severity === 'high').length,
    imported: list.filter((e) => e.sourceType === 'imported').length,
  }
})

const visibleEvents = computed(() => {
  let list = activeEvents.value
  if (clusterIds.value) {
    const set = new Set(clusterIds.value)
    list = list.filter((e) => set.has(e.eventId))
  }
  if (scope.value === 'relevant') list = list.filter((e) => e.isRelevant)
  else if (scope.value === 'fresh') list = list.filter((e) => e.sourceType === 'current_retrieval')
  else if (scope.value === 'knowledge') list = list.filter((e) => e.sourceType === 'knowledge_base')
  else if (scope.value === 'historical') list = list.filter((e) => e.sourceType === 'historical')
  else if (scope.value === 'imported') list = list.filter((e) => e.sourceType === 'imported')

  if (stateFilter.value === 'effective') list = list.filter((e) => e.riskAssessment?.isEffective)
  else if (stateFilter.value === 'high') list = list.filter((e) => e.severity === 'high')
  return list
})

watch([scope, stateFilter, clusterIds], () => {
  page.value = 1
  if (
    selected.value &&
    !visibleEvents.value.some((event) => event.eventId === selected.value?.eventId)
  ) {
    selected.value = null
    detailVisible.value = false
  }
})
const pagedEvents = computed(() =>
  visibleEvents.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)

/* ---------- 地图 ---------- */
const zoom = ref(1)
function onZoom(scale) {
  const next = Math.max(1, Math.min(20, Number(scale) || 1))
  if (Math.abs(next - zoom.value) > 0.15) zoom.value = next
}

const located = computed(() => visibleEvents.value.filter(hasCoordinates))
const unlocatedCount = computed(() => visibleEvents.value.length - located.value.length)
const plottedCount = computed(() => activeEvents.value.filter(hasCoordinates).length)

/**
 * 网格聚合:格子随缩放变小,放大后自动拆开。
 * 聚合只是"同一小块里的多个点合成一个标记",不改变事件本身。
 */
const mapEvents = computed(() => {
  const cell = 24 / Math.max(1, zoom.value)
  const buckets = new Map()
  for (const event of located.value) {
    const lng = event.location.longitude
    const lat = event.location.latitude
    const key = `${Math.floor(lng / cell)}:${Math.floor(lat / cell)}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(event)
  }
  const out = []
  for (const group of buckets.values()) {
    if (group.length === 1) {
      const event = group[0]
      out.push({
        title: event.title,
        lng: event.location.longitude,
        lat: event.location.latitude,
        level: riskLevelChar(event),
        color: riskColor(event),
        locationText: locationText(event),
        timeText: formatDate(event.occurredAt),
        event,
      })
    } else {
      const lng = group.reduce((sum, e) => sum + e.location.longitude, 0) / group.length
      const lat = group.reduce((sum, e) => sum + e.location.latitude, 0) / group.length
      const worst = group.some((e) => e.severity === 'high' && e.riskAssessment?.isEffective)
        ? '高'
        : group.some((e) => e.severity === 'medium' && e.riskAssessment?.isEffective) ? '中' : '低'
      out.push({
        isCluster: true,
        count: group.length,
        events: group,
        lng,
        lat,
        level: worst,
        color: group.every((e) => !e.riskAssessment?.isEffective) ? '#94a3b8' : riskColor({ severity: worst === '高' ? 'high' : worst === '中' ? 'medium' : 'low', riskAssessment: { isEffective: true } }),
      })
    }
  }
  return out
})

/* ---------- 实时动态 = ---------- */
const tickerItems = computed(() => {
  const priority = visibleEvents.value.filter((e) => e.riskAssessment?.isEffective)
  const list = priority.length ? priority : visibleEvents.value
  return list.slice(0, 8)
})

/* ---------- 选中联动 ---------- */
function openDetail(event) {
  selected.value = event
  detailVisible.value = true
}

function onMapSelect(marker) {
  if (!marker) return
  if (marker.isCluster) {
    clusterIds.value = marker.events.map((e) => e.eventId)
    return
  }
  openDetail(marker.event || marker)
}

function clearCluster() {
  clusterIds.value = null
}
</script>

<style scoped>
.osint-live {
  --brand: #2563eb;
  --line: #e2e8f0;
  --ink: #0f172a;
  --text: #334155;
  --muted: #64748b;
  padding: 18px 20px 40px;
  background: #f1f5f9;
  min-height: 100%;
}

/* ===== 顶部 ===== */
.header-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}
.news-ticker-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #eef2f7;
}
.news-ticker-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--brand);
  white-space: nowrap;
}
.news-ticker-content { flex: 1; overflow: hidden; }
.news-ticker-track {
  display: flex;
  gap: 26px;
  white-space: nowrap;
  animation: osint-ticker 46s linear infinite;
}
.news-ticker-item { font-size: 12px; color: var(--muted); display: inline-flex; gap: 7px; }
.ticker-time { color: #94a3b8; font-variant-numeric: tabular-nums; }
.ticker-title { color: var(--text); }
.ticker-source { color: #94a3b8; }
.ticker-divider { color: #cbd5e1; margin-left: 6px; }
.osint-ticker-empty { font-size: 12px; color: #94a3b8; }
@keyframes osint-ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.header-banner {
  padding: 20px 24px 22px;
  color: #fff;
  background:
    radial-gradient(circle at 86% 12%, rgba(59, 130, 246, .42), transparent 28%),
    linear-gradient(135deg, #14213d 0%, #172554 48%, #1d4ed8 100%);
}
.banner-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.source-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  border-radius: 999px;
  padding: 2px 11px;
  border: 1px solid var(--line);
  color: var(--muted);
  background: #fff;
  font-weight: 600;
}
.source-tag__dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
.source-tag.is-current_task { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
.source-tag.is-current_task .source-tag__dot { background: #10b981; }
.source-tag.is-example { color: #b45309; background: #fffbeb; border-color: #fde68a; }
.source-tag.is-example .source-tag__dot { background: #f59e0b; }
.source-tag.is-fallback, .source-tag.is-simulation { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
.source-tag.is-fallback .source-tag__dot, .source-tag.is-simulation .source-tag__dot { background: #ef4444; }
.live-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #dbeafe; }
.live-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #10b981;
  animation: osint-pulse 1.8s ease-in-out infinite;
}
@keyframes osint-pulse { 50% { opacity: .35; } }
.update-time { font-size: 12px; color: #bfdbfe; margin-left: auto; }

.banner-main { display: flex; justify-content: space-between; gap: 24px; margin-top: 12px; flex-wrap: wrap; }
.banner-text h1 { margin: 0 0 6px; font-size: 22px; color: #fff; }
.banner-text .highlight { color: #93c5fd; }
.banner-text p { margin: 0; font-size: 13px; color: #cbd5e1; }
.banner-stats { display: flex; gap: 26px; }
.banner-stats .stat { text-align: center; }
.banner-stats .num { font-size: 23px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.banner-stats .label { font-size: 12px; color: #bfdbfe; margin-top: 2px; }

/* ===== 地图 ===== */
.map-section { margin-bottom: 12px; }
.map-container {
  position: relative;
  height: 520px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}
.map-legend {
  position: absolute;
  left: 14px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, .94);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 12px;
  color: var(--muted);
}
.map-legend .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
.map-legend__hint { color: #94a3b8; }
.map-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(248, 250, 252, .86);
  color: var(--muted);
  font-size: 13px;
}
.map-empty p { margin: 0; }
.map-empty__sub { color: #94a3b8; font-size: 12px; }

/* ===== 列表 ===== */
.events-section {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px 18px;
}
.events-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
.events-header h2 { margin: 0; font-size: 15px; color: var(--ink); display: flex; align-items: center; gap: 8px; }
.events-count {
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 1px 9px;
}
.events-cluster { font-size: 12px; color: #1d4ed8; }
.events-tip { margin-left: auto; font-size: 12px; color: #94a3b8; }
.events-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
.events-empty { padding: 20px 0; }
.events-pager { margin-top: 14px; justify-content: center; }

@media (max-width: 1280px) {
  .map-legend__hint { display: none; }
}
</style>
