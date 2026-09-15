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
                <p>实时监测全球供应链动态：港口拥堵、政策变化、芯片短缺、物流中断、市场需求波动</p>
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


          </div>
        </div>
      </div>

      <!-- 地图区域 -->
      <div class="map-section">
        <div class="map-container">
          <WorldBaseMap :events="mapEvents" @select-event="selectEvent" />

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

          <el-empty v-if="!filteredEvents.length" description="暂无风险事件数据" />

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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import WorldBaseMap from '@/components/SupplyChain/WorldBaseMap.vue'
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

const route = useRoute()
// 支持 ?scenario=uranium 直接访问铀开源情报
const isUranium = computed(() => route.query.scenario === 'uranium')

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
const tickerNewsList = ref(
  isUranium.value
    ? [
      { time: '10:30', title: 'Kazatomprom 硫酸供应谈判陷入僵局，Q4产量或再降 10%', source: 'Reuters' },
      { time: '09:15', title: '尼日尔军政府拟提高 Somair 合资矿权益金至 20%', source: 'AFP' },
      { time: '08:00', title: '美国能源部启动第二轮铀战略储备招标 200 万磅', source: 'DOE' },
      { time: '07:45', title: 'Cameco Cigar Lake 维持满产，Q2 产量超预期 5%', source: 'Cameco' },
      { time: '07:20', title: '中核内蒙古 ISL 项目产能突破 500 tU/年', source: 'CNNC' },
      { time: '06:50', title: '法国 Orano 与蒙古签署 Zuuvch-Ovoo 铀矿框架协议', source: 'Orano' },
      { time: '06:20', title: 'Sprott 实物铀基金周度净流入 4,200 万美元', source: 'Sprott' },
      { time: '05:50', title: 'IAEA 上调 2050 年全球核电装机预测至 890 GWe', source: 'IAEA' },
    ]
    : [
      { time: '10:30', title: '比亚迪深汕基地月产能突破 5 万辆，创历史新高', source: 'BYD' },
      { time: '09:15', title: '碳酸锂现货价反弹至 9.8 万元/吨，锂盐厂惜售情绪浓厚', source: 'SMM' },
      { time: '08:00', title: '欧盟正式通过对华电动车反补贴税，比亚迪/吉利/上汽受影响', source: 'EU' },
      { time: '07:45', title: '特斯拉上海工厂 Q3 出口量环比下降 15%，受欧洲关税影响', source: 'Reuters' },
      { time: '07:20', title: '广州港南沙港区滚装船待泊时间延长至 5 天', source: '广州港' },
      { time: '06:50', title: '长安汽车因英飞凌 MCU 缺货，重庆工厂减产 30%', source: '财联社' },
      { time: '06:20', title: '宁德时代宜宾基地碳酸锂库存仅够 2 周，紧急补库中', source: 'SMM' },
      { time: '05:50', title: '中国汽车出口 2025H1 同比增长 28%，新能源占比超 35%', source: 'CAAM' },
    ]
)

// 场景切换时更新 ticker
watch(isUranium, (isU) => {
  tickerNewsList.value = isU
    ? [
      { time: '10:30', title: 'Kazatomprom 硫酸供应谈判陷入僵局，Q4产量或再降 10%', source: 'Reuters' },
      { time: '09:15', title: '尼日尔军政府拟提高 Somair 合资矿权益金至 20%', source: 'AFP' },
      { time: '08:00', title: '美国能源部启动第二轮铀战略储备招标 200 万磅', source: 'DOE' },
      { time: '07:45', title: 'Cameco Cigar Lake 维持满产，Q2 产量超预期 5%', source: 'Cameco' },
      { time: '07:20', title: '中核内蒙古 ISL 项目产能突破 500 tU/年', source: 'CNNC' },
      { time: '06:50', title: '法国 Orano 与蒙古签署 Zuuvch-Ovoo 铀矿框架协议', source: 'Orano' },
      { time: '06:20', title: 'Sprott 实物铀基金周度净流入 4,200 万美元', source: 'Sprott' },
      { time: '05:50', title: 'IAEA 上调 2050 年全球核电装机预测至 890 GWe', source: 'IAEA' },
    ]
    : [
      { time: '10:30', title: '比亚迪深汕基地月产能突破 5 万辆，创历史新高', source: 'BYD' },
      { time: '09:15', title: '碳酸锂现货价反弹至 9.8 万元/吨，锂盐厂惜售情绪浓厚', source: 'SMM' },
      { time: '08:00', title: '欧盟正式通过对华电动车反补贴税，比亚迪/吉利/上汽受影响', source: 'EU' },
      { time: '07:45', title: '特斯拉上海工厂 Q3 出口量环比下降 15%，受欧洲关税影响', source: 'Reuters' },
      { time: '07:20', title: '广州港南沙港区滚装船待泊时间延长至 5 天', source: '广州港' },
      { time: '06:50', title: '长安汽车因英飞凌 MCU 缺货，重庆工厂减产 30%', source: '财联社' },
      { time: '06:20', title: '宁德时代宜宾基地碳酸锂库存仅够 2 周，紧急补库中', source: 'SMM' },
      { time: '05:50', title: '中国汽车出口 2025H1 同比增长 28%，新能源占比超 35%', source: 'CAAM' },
    ]
})

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
const crawlerKeywords = ref(isUranium.value
  ? ['铀矿停产', '地缘政治', '核电站', '硫酸短缺', '运输物流', '库存变化']
  : ['芯片短缺', '碳酸锂价格', '欧盟关税', '电池原材料', '新能源补贴', '车规芯片'])
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
const currentFilter = ref(null)
const visibleMarkersCount = ref(0)
const selectedEvent = ref(null)
const activeEventId = ref(null)
const searchKeyword = ref('')
const searchActive = ref(false)
const currentPage = ref(1)
const pageSize = 9


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


const filterByType = (type) => {
  currentFilter.value = type
  currentPage.value = 1

  ElMessage.info(
    type
      ? `已筛选: ${type} (${getTypeCount(type)}个事件)`
      : `显示全部 (${events.value.length}个事件)`
  )
}



const selectEvent = (event) => {
  selectedEvent.value = event
  activeEventId.value = event.id
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



// 初始化地图


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
    const res = await fetch(`${API_BASE}/events?scenario=${isUranium.value ? 'uranium' : 'supply_chain'}`)
    const json = await res.json()
    const payload = unwrapResponseData(json)

    if (Array.isArray(payload.events)) {
      // 直接展示后端返回的 osint_events.json 事件，不再按场景关键词过滤
      // （此前铀场景下会滤掉全部航运/汽车事件导致页面为空）
      events.value = payload.events
    }

    // 补充场景事件
    events.value = [...events.value, ...getScenarioEvents()]


    currentPage.value = 1
    selectedEvent.value = null
    activeEventId.value = null

  } catch (err) {
    console.error(err)
    events.value = getScenarioEvents()
    ElMessage.warning('后端事件加载失败，使用本地数据')
  } finally {
    eventsLoading.value = false
  }
}

// 场景特定补充事件
function getScenarioEvents() {
  if (isUranium.value) {
    return [
      { id: 'u1', title: '中核内蒙古乌拉特中旗 ISL 扩产', location: '巴彦淖尔，中国', lat: 41.57, lng: 108.52, type: '铀矿开采', color: '#67C23A', level: '低', time: '2025-09', description: '中核内蒙古矿业乌拉特中旗 ISL 地浸项目年产能提升至 500 tU，国内自给率提高。', source: 'CNNC' },
      { id: 'u2', title: '中广核纳米比亚湖山矿扩产获批', location: '斯瓦科普蒙德，纳米比亚', lat: -22.68, lng: 14.53, type: '铀矿开采', color: '#67C23A', level: '低', time: '2025-08', description: '中广核 Husab 矿扩产至 6,000 tU/年获纳米比亚政府批准。', source: 'CGN' },
      { id: 'u3', title: '中核集团新疆伊犁铀矿地浸产能爬坡', location: '伊犁，中国', lat: 43.92, lng: 81.32, type: '铀矿开采', color: '#409EFF', level: '低', time: '2025-07', description: '新疆伊犁盆地砂岩型铀矿 ISL 产能爬坡至满产，年产量超 500 tU。', source: 'CNNC' },
      { id: 'u4', title: '秦山核电站延寿改造获批', location: '海盐，中国', lat: 30.44, lng: 120.86, type: '核电政策', color: '#67C23A', level: '低', time: '2025-08', description: '秦山一期 320MWe 机组获 20 年延寿许可，长期铀需求锁定。', source: 'NNSA' },
      { id: 'u5', title: '宁德核电站 5 号机组首次装料', location: '宁德，中国', lat: 27.05, lng: 120.28, type: '核电政策', color: '#409EFF', level: '低', time: '2025-09', description: '宁德核电 5 号机组（华龙一号）首次装料，年铀需求预计增加约 200 tU。', source: 'CGN' },
      { id: 'u6', title: '法国 Orano 蒙古铀矿项目推进', location: '乌兰巴托，蒙古', lat: 47.92, lng: 106.92, type: '铀矿开采', color: '#E6A23C', level: '中', time: '2025-07', description: 'Orano 与蒙古政府签署 Zuuvch-Ovoo 铀矿开发框架协议，预计 2028 年投产。', source: 'Orano' },
      { id: 'u7', title: '哈萨克斯坦硫酸供应谈判破裂', location: '努尔苏丹，哈萨克斯坦', lat: 51.17, lng: 71.45, type: '化学供应', color: '#F56C6C', level: '高', time: '2025-08', description: 'Kazatomprom 与主要硫酸供应商谈判破裂，Q4 产量指引可能再下调 8-12%。', source: 'Kazatomprom' },
      { id: 'u8', title: '俄罗斯浮动核电站北极投运', location: '佩韦克，俄罗斯', lat: 69.70, lng: 170.31, type: '核电政策', color: '#409EFF', level: '低', time: '2025-08', description: 'Rosatom 第二座浮动核电站 RITM-200M 在北极佩韦克投运，开辟极地铀供应链。', source: 'Rosatom' },
      { id: 'u9', title: '美国 White Mesa 铀加工厂重启', location: '犹他州，美国', lat: 37.75, lng: -109.55, type: '铀矿开采', color: '#E6A23C', level: '中', time: '2025-07', description: 'Energy Fuels 重启 White Mesa 铀加工厂，处理稀土副产品铀，年产能约 500 tU。', source: 'Energy Fuels' },
      { id: 'u10', title: '南非 Koeberg 核电站延寿铀招标', location: '开普敦，南非', lat: -33.68, lng: 18.43, type: '核电政策', color: '#409EFF', level: '低', time: '2025-09', description: 'Eskom 为 Koeberg 延寿 20 年发布 5,000 tU 长期采购招标，多家供应商竞标。', source: 'Eskom' },
    ]
  }
  return [
      { id: 'a1', title: '比亚迪深汕基地产能突破', location: '深圳，中国', lat: 22.54, lng: 114.06, type: '供应链事件', color: '#67C23A', level: '低', time: '2025-09', description: '比亚迪深汕汽车工业园年产能突破 60 万辆，新能源整车出口大幅增长。', source: 'BYD 官方' },
      { id: 'a2', title: '特斯拉上海超级工厂产能调整', location: '上海，中国', lat: 30.87, lng: 121.90, type: '供应链事件', color: '#E6A23C', level: '中', time: '2025-09', description: '特斯拉上海工厂受欧洲关税影响，对欧盟出口量有所下调，部分产能转向亚太市场。', source: 'Reuters' },
      { id: 'a3', title: '吉利长春新能源基地投产', location: '长春，中国', lat: 43.88, lng: 125.32, type: '供应链事件', color: '#67C23A', level: '低', time: '2025-08', description: '吉利汽车长春新能源基地正式投产，规划年产能 20 万辆纯电动车。', source: '吉利官方' },
      { id: 'a4', title: '广州港汽车出口量创新高', location: '广州，中国', lat: 23.13, lng: 113.26, type: '港口拥堵', color: '#409EFF', level: '低', time: '2025-09', description: '广州港南沙港区月度汽车出口突破 10 万辆，滚装船泊位持续紧张。', source: '广州港集团' },
      { id: 'a5', title: '重庆长安汽车芯片供应趋紧', location: '重庆，中国', lat: 29.56, lng: 106.55, type: '芯片短缺', color: '#F56C6C', level: '高', time: '2025-09', description: '长安汽车因英飞凌 MCU 交付延迟，部分车型产线面临减产风险，影响约 2 万辆/月。', source: '财联社' },
      { id: 'a6', title: '宁德时代宜宾基地碳酸锂库存告急', location: '宜宾，中国', lat: 28.77, lng: 104.62, type: '原材料事件', color: '#F56C6C', level: '高', time: '2025-08', description: '碳酸锂现货价反弹至 9.5 万/吨，宁德时代宜宾基地库存仅够 2 周生产。', source: 'SMM' },
      { id: 'a7', title: '武汉东风本田零部件断供', location: '武汉，中国', lat: 30.59, lng: 114.31, type: '供应链事件', color: '#F56C6C', level: '高', time: '2025-08', description: '东风本田因日本电装燃油喷射系统供应中断，三款车型停产检修。', source: '东风集团' },
      { id: 'a8', title: '柳州五菱新能源汽车出口飙升', location: '柳州，中国', lat: 24.31, lng: 109.41, type: '供应链事件', color: '#67C23A', level: '低', time: '2025-09', description: '上汽通用五菱微型电动车出口东南亚月均超 2 万辆，产能持续扩张。', source: 'SGMW' },
      { id: 'a9', title: '天津港滚装码头拥堵加剧', location: '天津，中国', lat: 38.98, lng: 117.72, type: '港口拥堵', color: '#E6A23C', level: '中', time: '2025-09', description: '天津港滚装船待泊时间延长至 5-7 天，影响长城、北汽等企业出口节奏。', source: 'Lloyd\'s List' },
      { id: 'a10', title: '蔚来合肥工厂电池包产线升级', location: '合肥，中国', lat: 31.82, lng: 117.23, type: '供应链事件', color: '#409EFF', level: '低', time: '2025-08', description: '蔚来合肥 NeoPark 电池包产线升级至 150kWh 半固态电池，良率爬坡中。', source: 'NIO' },
      { id: 'a11', title: '欧盟对中国电动车反补贴税生效', location: '布鲁塞尔，比利时', lat: 50.85, lng: 4.35, type: '政策变化', color: '#F56C6C', level: '高', time: '2025-07', description: '欧盟确认对中国产电动车征收最高 35.3% 反补贴税，比亚迪/吉利/上汽受影响最大。', source: 'EU Commission' },
      { id: 'a12', title: '印度对华汽车零部件加征关税', location: '新德里，印度', lat: 28.61, lng: 77.23, type: '政策变化', color: '#E6A23C', level: '中', time: '2025-08', description: '印度对从中国进口的汽车电子零部件加征 10-15% 关税，影响 Tier1 供应商出口。', source: '印度商工部' },
  ]
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
    await loadSources()
    await loadKeywords()
    await loadEvents()
  })
})

onUnmounted(() => {
  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
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

</style>
