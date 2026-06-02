<template>
  <el-scrollbar height="89vh">
    <div class="supply-chain-intelligence">
      <!-- Header Card Section -->
      <div class="header-card">
        <div class="news-ticker-wrap">
          <div class="news-ticker-label">
            <el-icon><BellFilled /></el-icon> 供应链实时动态
          </div>
          <div class="news-ticker-content">
            <div class="news-ticker-track">
              <span
                v-for="(news, idx) in [...tickerNewsList, ...tickerNewsList]"
                :key="idx"
                class="news-ticker-item"
              >
                <span class="ticker-time">{{ news.time }}</span>
                <span class="ticker-title">{{ news.title }}</span>
                <span class="ticker-source">({{ news.source }})</span>
                <span class="ticker-divider">◆</span>
              </span>
            </div>
          </div>
        </div>

        <div class="header-main-content">
          <div class="header-tab-selector">
            <div
              v-for="tab in headerTabs"
              :key="tab.key"
              class="header-tab-item"
              :class="{ active: activeHeaderTab === tab.key }"
              @click="switchTab(tab.key)"
            >
              <div class="tab-icon-wrap" :class="tab.iconClass">
                <el-icon><component :is="tab.icon" /></el-icon>
              </div>
              <div class="tab-text">
                <span class="tab-title">{{ tab.title }}</span>
                <span class="tab-subtitle">{{ tab.subtitle }}</span>
              </div>
              <el-icon class="tab-arrow"><ArrowRight /></el-icon>
            </div>
          </div>

          <div class="header-banner">
            <div class="banner-top">
              <div class="live-tag"><span class="live-dot"></span>实时监控中</div>
              <div class="run-time">
                <el-icon><Timer /></el-icon>运行 {{ runDays }}天 {{ runHours }}时 {{ runMins }}分
              </div>
              <div class="update-time">更新于 {{ currentDate }}</div>
              <el-button text @click="$router.go(-1)">
                <el-icon><Back /></el-icon>返回
              </el-button>
            </div>

            <div class="banner-main">
              <div class="banner-text">
                <h1>开源情报 <span class="highlight">实时追踪</span></h1>
                <p>实时监测全球汽车供应链动态：港口拥堵、政策变化、芯片短缺、物流中断、市场需求波动</p>
              </div>
              <div class="banner-stats">
                <div class="stat">
                  <div class="num">{{ sourceOptions.length || 0 }}</div>
                  <div class="label">监控网址</div>
                </div>
                <div class="stat">
                  <div class="num">{{ events.length }}</div>
                  <div class="label">风险事件</div>
                </div>
                <div class="stat">
                  <div class="num">{{ highRiskCount }}</div>
                  <div class="label">高风险事件</div>
                </div>
                <div class="stat">
                  <div class="num">{{ supplyChainIndex }}</div>
                  <div class="label">供应链指数</div>
                </div>
              </div>
            </div>

            <div class="banner-btn">
              <el-button plain type="primary" @click="openSettings">
                <el-icon><Setting /></el-icon>监控设置
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 地图区域 -->
      <div v-show="activeHeaderTab === '供应链地图'" class="map-section">
        <!-- 爬虫控制面板 -->
        <div class="crawler-panel">
          <el-card shadow="never">
            <div class="crawler-row">
              <el-select
                v-model="selectedSourceIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="选择开源情报网址"
                style="width: 360px"
              >
                <el-option
                  v-for="source in sourceOptions"
                  :key="source.id"
                  :label="source.name"
                  :value="source.id"
                >
                  <span style="float:left">{{ source.name }}</span>
                  <el-tag
                    size="small"
                    style="float:right;margin-left:8px"
                    :type="source.connector === 'web_scraper' ? 'success' : (source.connector === 'jctrans' ? 'primary' : 'info')"
                  >
                    {{ source.connector }}
                  </el-tag>
                  <span
                    v-if="source.healthTag"
                    style="float:right;font-size:12px"
                    :style="{ color: source.health_status === 'healthy' ? '#67c23a' : (source.health_status === 'degraded' ? '#e6a23c' : '#f56c6c') }"
                  >
                    {{ source.healthTag }}
                  </span>
                </el-option>
              </el-select>

              <el-select
                v-model="crawlerKeywords"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="输入主题词，例如：港口拥堵、芯片短缺、关税"
                style="width: 460px"
              >
                <el-option
                  v-for="kw in keywordOptions"
                  :key="kw"
                  :label="kw"
                  :value="kw"
                />
              </el-select>

              <el-button type="primary" :loading="crawlLoading" @click="startCrawl">
                现场爬取
              </el-button>

              <el-button :loading="eventsLoading" @click="loadEvents">
                刷新事件
              </el-button>
            </div>

            <div class="crawler-tip">
              已选择 {{ selectedSourceIds.length }} 个网址，主题词 {{ crawlerKeywords.length }} 个。
              
            </div>

            <!-- 采集状态汇总 -->
            <div v-if="crawlStatusList.length" class="crawl-status-summary">
              <div class="status-title">最近采集状态</div>
              <div
                v-for="s in crawlStatusList"
                :key="s.source_id"
                class="status-row"
              >
                <span
                  class="status-dot"
                  :style="{ background: s.status === 'ok' ? '#67c23a' : (s.status === 'empty' ? '#e6a23c' : '#f56c6c') }"
                ></span>
                <span class="status-name">{{ s.source_name }}</span>
                <span class="status-count">{{ s.items_found }} 条</span>
                <span v-if="s.error" class="status-error">{{ s.error }}</span>
              </div>
            </div>
          </el-card>
        </div>

        <div class="map-container">
          <div id="supplyChainMap" style="width:100%;height:100%"></div>

          <div class="map-controls">
            <el-dropdown trigger="click">
              <el-button size="small">
                <el-icon><Filter /></el-icon>风险筛选
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="item in riskTypes"
                    :key="item.name"
                    @click="filterByType(item.name)"
                  >
                    <span class="filter-dot" :style="{ background: item.color }"></span>
                    {{ item.name }} ({{ getTypeCount(item.name) }})
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="filterByType(null)">
                    全部显示 ({{ events.length }})
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <el-button size="small" @click="resetMapView">
              <el-icon><RefreshRight /></el-icon>重置视图
            </el-button>
          </div>

          <div class="map-footer">
            <span>📍 风险点: {{ visibleMarkersCount }}</span>
            <span>🔄 数据实时更新</span>
          </div>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索港口、城市、事件..."
            :prefix-icon="Search"
            clearable
            @focus="searchActive = true"
            @blur="searchActive = false"
          />
          <div
            v-if="searchActive && searchKeyword && searchResults.length"
            class="search-dropdown"
          >
            <div
              v-for="item in searchResults"
              :key="item.id"
              class="search-item"
              @mousedown.prevent="selectSearchItem(item)"
            >
              <span class="search-dot" :style="{ background: item.color }"></span>
              <span>{{ item.title }}</span>
              <span class="search-loc">{{ item.location }}</span>
            </div>
          </div>
        </div>

        <!-- 详情卡片 -->
        <transition name="slide-up">
          <div v-if="selectedEvent" class="detail-card">
            <div class="detail-header">
              <div class="detail-title">
                <span class="dot" :style="{ background: selectedEvent.color }"></span>
                {{ selectedEvent.title }}
              </div>
              <el-icon class="close" @click="selectedEvent = null">
                <Close />
              </el-icon>
            </div>

            <div class="detail-body">
              <div><el-icon><Location /></el-icon>{{ selectedEvent.location }}</div>
              <div><el-icon><Timer /></el-icon>{{ selectedEvent.time }}</div>
              <div>
                <el-tag
                  :type="selectedEvent.level === '高' ? 'danger' : (selectedEvent.level === '中' ? 'warning' : 'info')"
                  size="small"
                >
                  {{ selectedEvent.level }}风险
                </el-tag>
              </div>
              <p>{{ selectedEvent.description }}</p>

              <div v-if="selectedEvent.source" class="detail-source">
                来源：{{ selectedEvent.source }}
              </div>

              <div class="detail-actions">
                <el-button
                  size="small"
                  type="primary"
                  plain
                  :disabled="!selectedEvent.url"
                  @click="openEventUrl(selectedEvent)"
                >
                  查看来源
                </el-button>
                <el-button size="small" plain>关联分析</el-button>
              </div>
            </div>
          </div>
        </transition>

        <!-- 事件列表 -->
        <div class="events-list">
          <div class="list-header">
            <span><el-icon><List /></el-icon>供应链事件</span>
            <span>{{ filteredEvents.length }}条记录</span>
          </div>

          <el-empty v-if="!filteredEvents.length" description="暂无事件，请先选择网址并现场爬取" />

          <el-row v-else :gutter="16">
            <el-col
              :span="8"
              v-for="event in paginatedEvents"
              :key="event.id"
              style="margin-bottom: 16px"
            >
              <div
                class="event-card"
                :class="{ active: activeEventId === event.id }"
                @click="selectEvent(event)"
              >
                <div
                  class="event-icon"
                  :style="{ background: event.color + '20', color: event.color }"
                >
                  <el-icon><WarningFilled /></el-icon>
                </div>

                <div class="event-info">
                  <div class="event-title">{{ event.title }}</div>
                  <div class="event-location">
                    <el-icon><Location /></el-icon>{{ event.location }}
                  </div>
                  <div class="event-time">
                    <el-icon><Timer /></el-icon>{{ event.time }}
                  </div>
                  <el-tag
                    :type="event.level === '高' ? 'danger' : (event.level === '中' ? 'warning' : 'info')"
                    size="small"
                  >
                    {{ event.level }}风险
                  </el-tag>
                </div>
              </div>
            </el-col>
          </el-row>

          <div v-if="filteredEvents.length" class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="filteredEvents.length"
              layout="prev, pager, next"
              @current-change="currentPage = $event"
            />
          </div>
        </div>
      </div>
    </div>
  </el-scrollbar>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ArrowRight,
  Back,
  BellFilled,
  Close,
  Filter,
  List,
  Location,
  RefreshRight,
  Search,
  Setting,
  Timer,
  WarningFilled
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// ========== 后端接口 ==========
const API_BASE = import.meta.env.VITE_OSINT_API_BASE || 'http://127.0.0.1:9091/SCnet/osint'

// 兼容你项目里的 ResponseFormatter.success(data=xxx)
const unwrapResponseData = (json) => {
  if (!json) return {}
  return json.data || json
}

// ========== 运行时间 ==========
const runDays = ref(23)
const runHours = ref(14)
const runMins = ref(32)
const currentDate = ref('')
let clockTimer = null

const updateTime = () => {
  currentDate.value = new Date().toLocaleString('zh-CN')
}

// ========== Tab ==========
const activeHeaderTab = ref('供应链地图')
const headerTabs = [
  {
    key: '供应链地图',
    title: '供应链地图',
    subtitle: '全球风险实时监控',
    icon: Location,
    iconClass: 'tab-icon-map'
  }
]

const switchTab = (key) => {
  activeHeaderTab.value = key
}

// ========== 滚动新闻 ==========
const tickerNewsList = ref([
  { time: '--:--', title: '等待开源情报数据接入', source: 'OSINT' }
])

// ========== 风险类型 ==========
const riskTypes = ref([
  { name: '港口拥堵', color: '#E6A23C' },
  { name: '物流中断', color: '#F56C6C' },
  { name: '船期延误', color: '#409EFF' },
  { name: '罢工抗议', color: '#909399' },
  { name: '红海绕航', color: '#8E44AD' },
  { name: '运价上涨', color: '#FF6B6B' },
  { name: '政策变化', color: '#67C23A' },
  { name: '供应链风险', color: '#606266' },
  { name: '供应链事件', color: '#409EFF' }
])

// ========== 后端数据 ==========
const events = ref([])
const sourceOptions = ref([])
const selectedSourceIds = ref([])
const crawlerKeywords = ref(['港口拥堵', '芯片短缺', '关税', '物流中断'])
const keywordOptions = ref([])
const crawlLoading = ref(false)
const eventsLoading = ref(false)
const crawlStatusList = ref([])

// ========== 统计 ==========
const highRiskCount = computed(() => {
  return events.value.filter(item => item.level === '高').length
})

const supplyChainIndex = computed(() => {
  const total = events.value.length
  if (!total) return '100.0'

  const high = events.value.filter(item => item.level === '高').length
  const mid = events.value.filter(item => item.level === '中').length
  const score = 100 - high * 2.5 - mid * 1.2

  return Math.max(0, score).toFixed(1)
})

// ========== 地图相关 ==========
let map = null
let markerLayer = null
const currentFilter = ref(null)
const visibleMarkersCount = ref(0)
const selectedEvent = ref(null)
const activeEventId = ref(null)
const searchKeyword = ref('')
const searchActive = ref(false)
const currentPage = ref(1)
const pageSize = 9

const DEFAULT_CENTER = [35, 105]
const DEFAULT_ZOOM = 4

// 过滤有效坐标的点
const mapEvents = computed(() => {
  return events.value.filter(e => Number(e.lat) !== 0 && Number(e.lng) !== 0)
})

const filteredEvents = computed(() => {
  let result = events.value

  if (currentFilter.value) {
    result = events.value.filter(e => e.type === currentFilter.value)
  }

  return result
})

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredEvents.value.slice(start, start + pageSize)
})

const searchResults = computed(() => {
  if (!searchKeyword.value) return []

  const kw = searchKeyword.value.toLowerCase()

  return events.value
    .filter(e => {
      const title = String(e.title || '').toLowerCase()
      const location = String(e.location || '').toLowerCase()
      const description = String(e.description || '').toLowerCase()

      return title.includes(kw) || location.includes(kw) || description.includes(kw)
    })
    .slice(0, 8)
})

const getTypeCount = (type) => {
  return events.value.filter(e => e.type === type).length
}

const refreshMap = () => {
  nextTick(() => {
    updateMarkersVisibility()
    fitMapToEvents()
  })
}

const filterByType = (type) => {
  currentFilter.value = type
  currentPage.value = 1
  updateMarkersVisibility()
  fitMapToEvents()

  ElMessage.info(
    type
      ? `已筛选: ${type} (${getTypeCount(type)}个事件)`
      : `显示全部 (${events.value.length}个事件)`
  )
}

const resetMapView = () => {
  currentFilter.value = null
  currentPage.value = 1
  updateMarkersVisibility()
  fitMapToEvents()
}

const updateMarkersVisibility = () => {
  if (!markerLayer) return

  markerLayer.clearLayers()

  let filtered = mapEvents.value

  if (currentFilter.value) {
    filtered = mapEvents.value.filter(e => e.type === currentFilter.value)
  }

  visibleMarkersCount.value = filtered.length

  filtered.forEach(event => {
    const marker = L.circleMarker([Number(event.lat), Number(event.lng)], {
      radius: 10,
      fillColor: event.color || '#909399',
      color: '#ffffff',
      weight: 2.5,
      opacity: 1,
      fillOpacity: 0.85
    })

    marker.bindTooltip(
      `<b>${event.title || '未知事件'}</b><br>${event.location || '未知地点'}<br><span style="color:#ff6b6b">${event.level || '未知'}风险</span>`,
      {
        direction: 'top',
        offset: [0, -15],
        className: 'custom-tooltip'
      }
    )

    marker.on('click', () => {
      selectEvent(event)
    })

    markerLayer.addLayer(marker)
  })
}

const selectEvent = (event) => {
  selectedEvent.value = event
  activeEventId.value = event.id

  if (map && Number(event.lat) !== 0 && Number(event.lng) !== 0) {
    map.flyTo([Number(event.lat), Number(event.lng)], 6, { duration: 1 })
  }
}

const selectSearchItem = (item) => {
  searchKeyword.value = ''
  searchActive.value = false
  selectEvent(item)
}

const openEventUrl = (event) => {
  if (!event?.url) {
    ElMessage.warning('该事件暂无来源链接')
    return
  }

  window.open(event.url, '_blank')
}

const openSettings = () => {
  ElMessage.info('设置功能开发中')
}

const fitMapToEvents = () => {
  if (!map) return

  const points = currentFilter.value
    ? mapEvents.value.filter(e => e.type === currentFilter.value)
    : mapEvents.value

  if (!points.length) {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    return
  }

  const bounds = L.latLngBounds(points.map(e => [Number(e.lat), Number(e.lng)]))

  map.fitBounds(bounds, {
    padding: [36, 36],
    maxZoom: 8
  })
}

// 初始化地图
const initMap = () => {
  const container = document.getElementById('supplyChainMap')

  if (!container) {
    console.error('地图容器未找到')
    return
  }

  if (map) {
    map.remove()
    map = null
  }

  map = L.map('supplyChainMap').setView(DEFAULT_CENTER, DEFAULT_ZOOM)

  // 使用高德矢量底图
  const baseLayer = L.tileLayer(
    'https://webst0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}',
    {
      subdomains: ['1', '2', '3', '4'],
      attribution: '高德地图',
      maxZoom: 18,
      minZoom: 3
    }
  )

  baseLayer.on('tileerror', () => {
    ElMessage.error('地图底图加载失败，请检查网络或地图服务可用性')
  })

  baseLayer.addTo(map)

  L.control.scale({
    metric: true,
    imperial: false,
    position: 'bottomright'
  }).addTo(map)

  markerLayer = L.layerGroup().addTo(map)

  updateMarkersVisibility()
  fitMapToEvents()

  setTimeout(() => {
    if (map) {
      map.invalidateSize()
      updateMarkersVisibility()
    }
  }, 200)
}

const handleResize = () => {
  if (map) {
    setTimeout(() => {
      map.invalidateSize()
    }, 100)
  }
}

// ========== 后端 API ==========
const loadSources = async () => {
  try {
    // 使用 V2 多源接口，获取 15 个数据源 + 健康状态
    const res = await fetch(`${API_BASE}/sources-v2`)
    const json = await res.json()
    const payload = unwrapResponseData(json)

    const rawSources = Array.isArray(payload.sources) ? payload.sources : []
    // 注入健康状态标签
    sourceOptions.value = rawSources.map(s => ({
      ...s,
      healthTag: s.health_status === 'healthy' ? '✓' : (s.health_status === 'degraded' ? '⚠' : ''),
    }))

    if (!selectedSourceIds.value.length) {
      // 默认选中 web_scraper（国内可访问）+ jctrans
      selectedSourceIds.value = sourceOptions.value
        .filter(item => item.enabled !== false && ['web_scraper', 'jctrans'].includes(item.connector))
        .map(item => item.id)
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('V2 数据源加载失败，请检查后端 /SCnet/osint/sources-v2')
  }
}

const loadKeywords = async () => {
  try {
    const res = await fetch(`${API_BASE}/keywords`)
    const json = await res.json()
    const payload = unwrapResponseData(json)
    const groups = Array.isArray(payload.groups) ? payload.groups : []
    // 从关键词组中提取所有关键词作为下拉选项
    const allKeywords = new Set()
    groups.forEach(g => {
      (g.keywords || []).forEach(kw => allKeywords.add(kw))
      ;(g.tags || []).forEach(t => allKeywords.add(t))
    })
    keywordOptions.value = [...allKeywords].sort()
  } catch (err) {
    console.warn('关键词选项加载失败，将使用默认关键词', err)
    // 后端不可用时用硬编码的默认值
    keywordOptions.value = [
      '港口拥堵', '船期延误', '物流中断', '运价上涨',
      '芯片短缺', '供应链中断', '关税', '贸易战',
      '新能源汽车', '动力电池', '固态电池', '充电桩',
      '车规级芯片', 'MCU', 'IGBT', '碳化硅',
      '钢铁', '铝', '铜', '锂', '稀土', '石油',
    ]
  }
}

const loadEvents = async () => {
  eventsLoading.value = true

  try {
    const res = await fetch(`${API_BASE}/events`)
    const json = await res.json()
    const payload = unwrapResponseData(json)

    if (Array.isArray(payload.events)) {
      events.value = payload.events
    }

    if (Array.isArray(payload.ticker) && payload.ticker.length) {
      tickerNewsList.value = payload.ticker
    }

    currentPage.value = 1
    selectedEvent.value = null
    activeEventId.value = null

    refreshMap()
  } catch (err) {
    console.error(err)
    ElMessage.error('事件加载失败，请检查后端 /SCnet/osint/events')
  } finally {
    eventsLoading.value = false
  }
}

const startCrawl = async () => {
  if (!selectedSourceIds.value.length) {
    ElMessage.warning('请至少选择一个网址')
    return
  }

  if (!crawlerKeywords.value.length) {
    ElMessage.warning('请至少输入一个主题词')
    return
  }

  crawlLoading.value = true
  crawlStatusList.value = []

  // 对每个关键词依次调用 V2 多源采集接口
  const allSourceStatus = []
  let totalCount = 0

  try {
    for (const kw of crawlerKeywords.value) {
      const res = await fetch(`${API_BASE}/crawl-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: kw,
          max_records: 15,
          time_range_hours: 720,
          include_history: false,
          source_selector: {
            source_ids: selectedSourceIds.value,
          },
        })
      })

      const json = await res.json()
      const payload = unwrapResponseData(json)

      totalCount += payload.count || 0

      // 合并事件（crawl-v2 已自动将 new_events 写入 osint_events.json）
      if (Array.isArray(payload.source_status)) {
        allSourceStatus.push(...payload.source_status)
      }
    }

    // 更新状态列表
    crawlStatusList.value = allSourceStatus

    // 重新加载事件（从 osint_events.json 读取合并后的结果）
    await loadEvents()

    // 汇总逐源状态
    const okSources = allSourceStatus.filter(s => s.status === 'ok').length
    const errSources = allSourceStatus.filter(s => s.status === 'error').length
    ElMessage.success(
      `V2 多源采集完成：${totalCount} 条，成功 ${okSources} 源，失败 ${errSources} 源`
    )
  } catch (err) {
    console.error(err)
    ElMessage.error('V2 多源采集失败，请检查后端日志')
  } finally {
    crawlLoading.value = false
  }
}

onMounted(() => {
  updateTime()
  clockTimer = setInterval(updateTime, 1000)

  nextTick(async () => {
    initMap()
    await loadSources()
    await loadKeywords()
    await loadEvents()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)

  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
  }

  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.supply-chain-intelligence {
  background: #f0f2f5;
  min-height: 100vh;
}

.header-card {
  background: #fff;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.news-ticker-wrap {
  background: #fafbfc;
  border-bottom: 1px solid #e8eef3;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
}

.news-ticker-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #f56c6c;
  font-weight: 500;
  white-space: nowrap;
}

.news-ticker-content {
  flex: 1;
  overflow: hidden;
}

.news-ticker-track {
  display: flex;
  white-space: nowrap;
  animation: scroll 35s linear infinite;
}

@keyframes scroll {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-50%);
  }
}

.news-ticker-item {
  display: inline-flex;
  gap: 8px;
  margin-right: 32px;
  font-size: 13px;
}

.ticker-time {
  color: #909399;
}

.ticker-title {
  color: #303133;
  font-weight: 500;
}

.ticker-source {
  color: #67c23a;
  font-size: 12px;
}

.header-main-content {
  display: flex;
}

.header-tab-selector {
  width: 220px;
  background: #f8f9fb;
  border-radius: 8px 0 0 8px;
  padding: 20px 0;
}

.header-tab-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.header-tab-item.active {
  background: rgba(64, 158, 255, 0.08);
  border-left-color: #409eff;
}

.tab-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f0fe;
  color: #409eff;
}

.tab-text {
  flex: 1;
}

.tab-title {
  display: block;
  font-weight: 600;
  color: #303133;
}

.tab-subtitle {
  font-size: 11px;
  color: #909399;
}

.header-banner {
  flex: 1;
  background: linear-gradient(135deg, #1a2a3a 0%, #0f1a24 100%);
  border-radius: 0 8px 8px 0;
  padding: 20px 30px;
  color: #fff;
}

.banner-top {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.live-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  color: #10b981;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}

.run-time,
.update-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #8b9dc3;
}

.banner-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.banner-text h1 {
  font-size: 28px;
  margin: 0 0 8px;
}

.banner-text .highlight {
  color: #ffd93d;
}

.banner-text p {
  color: #8b9dc3;
  font-size: 13px;
  margin: 0;
}

.banner-stats {
  display: flex;
  gap: 24px;
}

.stat {
  text-align: center;
}

.stat .num {
  font-size: 28px;
  font-weight: 700;
}

.stat .label {
  font-size: 11px;
  color: #8b9dc3;
}

.banner-btn {
  text-align: right;
}

.map-section {
  padding: 20px;
}

.crawler-panel {
  margin-bottom: 16px;
}

.crawler-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.crawler-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
}

.crawl-status-summary {
  margin-top: 12px;
  padding: 12px 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #e8eef3;
}

.crawl-status-summary .status-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.crawl-status-summary .status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
}

.crawl-status-summary .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.crawl-status-summary .status-name {
  color: #606266;
  min-width: 140px;
}

.crawl-status-summary .status-count {
  color: #409eff;
  font-weight: 500;
}

.crawl-status-summary .status-error {
  color: #f56c6c;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-container {
  position: relative;
  height: 55vh;
  background: #e8eef3;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #ddd;
}

#supplyChainMap {
  width: 100%;
  height: 100%;
  z-index: 1;
  background: #e8eef3;
}

.map-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  z-index: 1000;
}

.map-footer {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.65);
  padding: 8px 16px;
  border-radius: 24px;
  color: #fff;
  font-size: 13px;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.filter-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

.search-bar {
  position: relative;
  margin-top: 16px;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 4px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
}

.search-item:hover {
  background: #f5f7fa;
}

.search-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.search-loc {
  color: #909399;
  font-size: 12px;
  margin-left: auto;
}

.detail-card {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 380px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  overflow: hidden;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8eef3;
}

.detail-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.detail-title .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.close {
  cursor: pointer;
  color: #909399;
  font-size: 18px;
}

.close:hover {
  color: #f56c6c;
}

.detail-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-body p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.detail-source {
  color: #909399;
  font-size: 12px;
}

.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.events-list {
  background: #fff;
  border-radius: 16px;
  margin-top: 20px;
  padding: 16px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8eef3;
  font-weight: 600;
}

.event-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: #fafbfc;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.event-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background: #fff;
}

.event-card.active {
  border-color: #409eff;
  background: #f0f7ff;
}

.event-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.event-info {
  flex: 1;
}

.event-title {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 14px;
}

.event-location,
.event-time {
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e8eef3;
}

:deep(.custom-tooltip) {
  font-size: 12px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  border-radius: 6px;
}

:deep(.leaflet-container) {
  background: #e8eef3;
}
</style>
