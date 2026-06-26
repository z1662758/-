<template>
  <el-scrollbar height="89vh">
    <div class="oil-intelligence">
      <!-- Header Card Section -->
      <div class="header-card">
        <div class="news-ticker-wrap">
          <div class="news-ticker-label">
            <el-icon><BellFilled /></el-icon> 铀矿供应链实时动态
          </div>
          <div class="news-ticker-content">
            <div class="news-ticker-track">
              <span v-for="(news, idx) in [...tickerNewsList, ...tickerNewsList]" :key="idx" class="news-ticker-item">
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
            <div v-for="tab in headerTabs" :key="tab.key" class="header-tab-item" :class="{ active: activeHeaderTab === tab.key }" @click="switchTab(tab.key)">
              <div class="tab-icon-wrap" :class="tab.iconClass"><el-icon><component :is="tab.icon"/></el-icon></div>
              <div class="tab-text"><span class="tab-title">{{ tab.title }}</span><span class="tab-subtitle">{{ tab.subtitle }}</span></div>
              <el-icon class="tab-arrow"><ArrowRight/></el-icon>
            </div>
          </div>

          <div class="header-banner">
            <div class="banner-top">
              <div class="live-tag"><span class="live-dot"></span>实时监控中</div>
              <div class="run-time"><el-icon><Timer/></el-icon>运行 {{ runDays }}天 {{ runHours }}时 {{ runMins }}分</div>
              <div class="update-time">更新于 {{ currentDate }}</div>
              <el-button text @click="$router.go(-1)"><el-icon><Back/></el-icon>返回</el-button>
            </div>
            <div class="banner-main">
              <div class="banner-text">
                <h1>铀矿情报   <span class="highlight">核燃料安全</span></h1>
                <p>实时监测全球铀矿供应链动态：矿山生产、地缘政治风险、化学供应、运输物流、核电需求、库存变化</p>
              </div>
              <div class="banner-stats">
                <div class="stat"><div class="num">{{ mineCount }}</div><div class="label">监控铀矿山</div></div>
                <div class="stat"><div class="num">{{ riskEventCount }}</div><div class="label">风险事件</div></div>
                <div class="stat"><div class="num">{{ transportCount }}</div><div class="label">关键运输通道</div></div>
                <div class="stat"><div class="num">{{ currentU3O8Price }}</div><div class="label">U3O8 现货 ($/lb)</div></div>
              </div>
            </div>
            <div class="banner-btn">
              <el-button plain type="primary" @click="openSettings"><el-icon><Setting/></el-icon>监控设置</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 地图区域 -->
      <div v-show="activeHeaderTab === '风险地图'" class="map-section">
        <div class="map-container">
          <div id="oilIntelligenceMap" style="width:100%;height:100%"></div>
          <div class="map-controls">
            <el-dropdown trigger="click">
              <el-button size="small"><el-icon><Filter/></el-icon>风险筛选</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="item in riskTypes" :key="item.name" @click="filterByType(item.name)">
                    <span class="filter-dot" :style="{ background: item.color }"></span>{{ item.name }} ({{ getTypeCount(item.name) }})
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="filterByType(null)">全部显示 ({{ events.length }})</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button size="small" @click="resetMapView"><el-icon><RefreshRight/></el-icon>重置视图</el-button>
          </div>
          <div class="map-footer">
            <span>📍 风险点：{{ visibleMarkersCount }}</span>
            <span>🛢️ 数据实时更新</span>
          </div>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索铀矿山、加工厂、运输节点、事件..."
            :prefix-icon="Search"
            clearable
            @focus="searchActive=true"
            @blur="searchActive=false"
          />
          <div v-if="searchActive && searchKeyword && searchResults.length" class="search-dropdown">
            <div v-for="item in searchResults" :key="item.id" class="search-item" @mousedown.prevent="selectSearchItem(item)">
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
              <el-icon class="close" @click="selectedEvent=null"><Close/></el-icon>
            </div>
            <div class="detail-body">
              <div><el-icon><Location/></el-icon>{{ selectedEvent.location }}</div>
              <div><el-icon><Timer/></el-icon>{{ selectedEvent.time }}</div>
              <div>
                <el-tag :type="selectedEvent.level==='高'?'danger':(selectedEvent.level==='中'?'warning':'info')" size="small">
                  {{ selectedEvent.level }}风险
                </el-tag>
              </div>
              <p>{{ selectedEvent.description }}</p>
              <div class="detail-actions">
                <el-button size="small" type="primary" plain>查看详情</el-button>
                <el-button size="small" plain>关联分析</el-button>
              </div>
            </div>
          </div>
        </transition>

        <!-- 事件列表 -->
        <div class="events-list">
          <div class="list-header">
            <span><el-icon><List/></el-icon>供应链风险事件</span>
            <span>{{ filteredEvents.length }}条记录</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="8" v-for="event in paginatedEvents" :key="event.id" style="margin-bottom: 16px">
              <div class="event-card" :class="{ active: activeEventId === event.id }" @click="selectEvent(event)">
                <div class="event-icon" :style="{ background: event.color + '20', color: event.color }">
                  <el-icon><WarningFilled/></el-icon>
                </div>
                <div class="event-info">
                  <div class="event-title">{{ event.title }}</div>
                  <div class="event-location"><el-icon><Location/></el-icon>{{ event.location }}</div>
                  <div class="event-time"><el-icon><Timer/></el-icon>{{ event.time }}</div>
                  <el-tag :type="event.level==='高'?'danger':(event.level==='中'?'warning':'info')" size="small">
                    {{ event.level }}风险
                  </el-tag>
                </div>
              </div>
            </el-col>
          </el-row>
          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="9"
              :total="filteredEvents.length"
              layout="prev, pager, next"
              @current-change="currentPage=$event"
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
import { ArrowRight, Back, BellFilled, Close, Filter, List, Location, RefreshRight, Search, Setting, Timer, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// ========== 运行时间 ==========
const runDays = ref(23)
const runHours = ref(14)
const runMins = ref(32)
const currentDate = ref('')
const updateTime = () => { currentDate.value = new Date().toLocaleString('zh-CN') }
setInterval(updateTime, 1000)
updateTime()

// ========== Tab ==========
const activeHeaderTab = ref('风险地图')
const headerTabs = [
  { key: '风险地图', title: '风险地图', subtitle: '全球铀矿风险实时监控', icon: Location, iconClass: 'tab-icon-map' }
]
const switchTab = (key) => { activeHeaderTab.value = key }

// ========== 滚动新闻 ==========
const tickerNewsList = ref([
  { time: '16:30', title: 'Kazatomprom 因硫酸短缺下调产量指引', source: '路透社' },
  { time: '15:45', title: '尼日尔军政府撤销 Orano Imouraren 开采许可', source: '法新社' },
  { time: '14:20', title: 'Cameco McArthur River 爬坡至设计产能 75%', source: 'Cameco季报' },
  { time: '13:50', title: 'Sprott 实物铀基金单日买入 50 万磅 U3O8', source: 'Sprott' },
  { time: '12:30', title: 'U3O8 现货价突破 $90/lb', source: 'UxC' },
  { time: '11:15', title: '中国核准 6 台新核电机组', source: '中国核能行业协会' }
])

// ========== 头部统计数据 ==========
const mineCount = ref(42)
const riskEventCount = ref(89)
const transportCount = ref(18)
const currentU3O8Price = ref(85.0)

// ========== 风险类型 ==========
const riskTypes = ref([
  { name: '地缘政治', color: '#F56C6C' },
  { name: '矿山停产', color: '#E6A23C' },
  { name: '化学供应', color: '#409EFF' },
  { name: '运输物流', color: '#909399' },
  { name: '许可证政策', color: '#67C23A' },
  { name: '价格异常', color: '#8B5CF6' }
])

// ========== 铀矿供应链事件数据 ==========
const events = ref([
  { id: 1, title: 'Kazatomprom 硫酸短缺减产', location: '哈萨克斯坦', lat: 47.00, lng: 65.00, type: '化学供应', color: '#409EFF', level: '高', time: '2026-04-23', description: '硫酸供应不足导致 ISL 地浸产量下降约 10%，下调年度产量指引。' },
  { id: 2, title: 'Inkai 矿山 ISL 酸液供应中断', location: 'Inkai, 哈萨克斯坦', lat: 45.00, lng: 67.00, type: '化学供应', color: '#409EFF', level: '高', time: '2026-04-22', description: '硫酸运输中断，矿山浸出液循环受限，月产量预计减少 200 tU。' },
  { id: 3, title: 'Budenovskoye 恢复满产推迟', location: 'Budenovskoye, 哈萨克斯坦', lat: 44.00, lng: 66.00, type: '矿山停产', color: '#E6A23C', level: '中', time: '2026-04-21', description: '2025 年恢复矿权协议 100% 产量计划因酸供应受限推迟。' },
  { id: 4, title: '尼日尔撤销 Imouraren 开采许可', location: 'Imouraren, 尼日尔', lat: 18.00, lng: 9.00, type: '地缘政治', color: '#F56C6C', level: '高', time: '2026-04-23', description: '军政府撤销 Orano 对全球最大未开发铀矿之一的开采许可，储量约 175,000 tU。' },
  { id: 5, title: '尼日尔撤回 Madaouela 采矿权', location: 'Madaouela, 尼日尔', lat: 17.50, lng: 8.50, type: '许可证政策', color: '#67C23A', level: '高', time: '2026-04-22', description: 'GoviEx 的 Madaouela 项目采矿权被撤回，项目停滞。' },
  { id: 6, title: '尼日尔 Somair 面临税费重谈风险', location: 'Arlit, 尼日尔', lat: 18.73, lng: 7.38, type: '矿山停产', color: '#E6A23C', level: '高', time: '2026-04-21', description: '仅存的合资矿山仍在运营，但军政府可能提高权益金或变更合同条款。' },
  { id: 7, title: '纳米比亚 Langer Heinrich 重启爬坡', location: 'Langer Heinrich, 纳米比亚', lat: -22.50, lng: 14.50, type: '矿山停产', color: '#E6A23C', level: '中', time: '2026-04-21', description: '停产 6 年后于 2024.3 重启，首批铀精矿已产出，2025-2026 年爬坡至满产。' },
  { id: 8, title: '纳米比亚 Dasa 项目在建中', location: 'Dasa, 纳米比亚', lat: -22.00, lng: 15.00, type: '矿山停产', color: '#67C23A', level: '低', time: '2026-04-20', description: 'Global Atomic 高品位铀矿在建，预计 2026 年投产，年产能 1,200 tU。' },
  { id: 9, title: '中广核湖山铀矿扩产', location: 'Husab, 纳米比亚', lat: -22.50, lng: 14.50, type: '矿山停产', color: '#67C23A', level: '低', time: '2026-04-19', description: '年产能有望从 5,000 提升至 6,000 tU。' },
  { id: 10, title: '加拿大 McArthur River 爬坡慢于预期', location: 'Saskatchewan, 加拿大', lat: 57.50, lng: -105.00, type: '矿山停产', color: '#E6A23C', level: '中', time: '2026-04-23', description: '停产 4 年后重启，爬坡至 75%，地下开采面品位恢复慢于预期，满产推迟至 2025H1。' },
  { id: 11, title: '加拿大 Cigar Lake 维持满产运行', location: 'Cigar Lake, 加拿大', lat: 58.00, lng: -104.00, type: '矿山停产', color: '#67C23A', level: '低', time: '2026-04-21', description: '全球最高品位铀矿满产运行，年产量约 6,900 tU（1,800 万磅 U3O8）。' },
  { id: 12, title: '美国禁止俄浓缩铀进口法案通过', location: '华盛顿，美国', lat: 38.90, lng: -77.04, type: '地缘政治', color: '#F56C6C', level: '高', time: '2026-04-22', description: 'Prohibiting Russian Uranium Imports Act 通过，利好非俄铀矿和转化/浓缩替代产能。' },
  { id: 13, title: '美国铀战略储备采购启动', location: '华盛顿，美国', lat: 38.90, lng: -77.04, type: '许可证政策', color: '#67C23A', level: '中', time: '2026-04-19', description: '能源部推进铀战略储备，首批招标 100 万磅 U3O8，支持本土铀矿复产。' },
  { id: 14, title: '美国 Lance ISL 项目重启', location: 'Wyoming, 美国', lat: 43.00, lng: -107.50, type: '矿山停产', color: '#E6A23C', level: '中', time: '2026-04-18', description: 'Peninsula Energy 重启 Wyoming Lance ISL，初期年产能 200 万磅 U3O8。' },
  { id: 15, title: '澳大利亚 Honeymoon ISL 重启', location: 'Honeymoon, 南澳', lat: -31.50, lng: 140.00, type: '矿山停产', color: '#67C23A', level: '低', time: '2026-04-19', description: 'Boss Energy 重启 Honeymoon ISL 项目，初期年产能 880 tU。' },
  { id: 16, title: 'Olympic Dam 副产品铀稳定产出', location: 'Olympic Dam, 南澳', lat: -30.44, lng: 136.88, type: '矿山停产', color: '#67C23A', level: '低', time: '2026-04-18', description: 'BHP 铜金铀伴生矿维持铀年产量约 3,500 tU。' },
  { id: 17, title: 'Ranger 矿关闭修复至 2035 年', location: 'Ranger, 北领地', lat: -12.68, lng: 132.92, type: '许可证政策', color: '#67C23A', level: '中', time: '2026-04-17', description: '2021 年停产，进入长期环境修复，澳大利亚铀产量永久减少。' },
  { id: 18, title: '俄铀面临西方去俄化采购浪潮', location: '莫斯科，俄罗斯', lat: 55.75, lng: 37.61, type: '地缘政治', color: '#F56C6C', level: '高', time: '2026-04-23', description: 'EU 和美国电力公司主动减少俄铀采购，非俄来源长协溢价上升 15-20%。' },
  { id: 19, title: 'Rosatom 加速非洲铀矿布局', location: '莫斯科，俄罗斯', lat: 55.75, lng: 37.61, type: '矿山停产', color: '#E6A23C', level: '中', time: '2026-04-21', description: '俄罗斯在纳米比亚、坦桑尼亚推进铀矿项目，弥补西方市场损失。' },
  { id: 20, title: '中国核准 6 台新核电机组', location: '北京，中国', lat: 39.90, lng: 116.40, type: '许可证政策', color: '#67C23A', level: '中', time: '2026-04-23', description: '新机组长期铀需求预计增加 1,200 tU/年，中国铀进口依赖度进一步上升。' },
  { id: 21, title: '中国北方 ISL 产能稳步提升', location: '内蒙古/新疆，中国', lat: 43.00, lng: 113.00, type: '矿山停产', color: '#67C23A', level: '低', time: '2026-04-19', description: '国内 ISL 地浸产能提升，年产量约 1,500-2,000 tU，自给率约 15-20%。' },
  { id: 22, title: '法国核电复兴计划推进', location: '巴黎，法国', lat: 48.86, lng: 2.35, type: '许可证政策', color: '#67C23A', level: '中', time: '2026-04-21', description: '法国新建 6 座 EPR2 反应堆，长期铀需求预计增加 2,000 tU/年。' },
  { id: 23, title: 'Euratom ESA 强化供应多元化', location: '布鲁塞尔，比利时', lat: 50.85, lng: 4.35, type: '许可证政策', color: '#67C23A', level: '中', time: '2026-04-20', description: 'ESA 强制要求核电业主多元化铀来源，降低对单一供应国依赖。' },
  { id: 24, title: '瑞典核电扩张计划落地', location: '斯德哥尔摩，瑞典', lat: 59.33, lng: 18.07, type: '许可证政策', color: '#67C23A', level: '中', time: '2026-04-19', description: '2035 年前 2 座大型机组 + 2045 年前 10 座 SMR，铀需求翻倍。' },
  { id: 25, title: 'U3O8 现货突破 $95/lb', location: '全球', lat: 0, lng: 0, type: '价格异常', color: '#8B5CF6', level: '高', time: '2026-04-22', description: '受尼日尔和哈萨克斯坦双重供给风险推动，月涨 15%，距 2024.1 高点 $106 仍有上涨空间。' },
  { id: 26, title: 'Sprott 实物铀基金持续买入', location: '多伦多，加拿大', lat: 43.65, lng: -79.38, type: '价格异常', color: '#8B5CF6', level: '中', time: '2026-04-21', description: 'SPUT 月内增持 120 万磅 U3O8，总持仓突破 6,500 万磅，持续吸收现货市场流动性。' },
  { id: 27, title: '全球铀库存消费比降至历史低位', location: '全球', lat: 0, lng: 0, type: '价格异常', color: '#8B5CF6', level: '高', time: '2026-04-20', description: 'EU 库存 51,892->38,302 tU，美国 46,589->39,400 tU，全球库存消费比不足 2 年。' },
  { id: 28, title: '铀长协价格突破 $80/lb', location: '全球', lat: 0, lng: 0, type: '价格异常', color: '#8B5CF6', level: '中', time: '2026-04-19', description: '长协价跟随现货上涨，电力公司加速锁量，3-5 年长约占比提升。' },
  { id: 29, title: '全球年度铀需求突破 65,000 tU', location: '全球', lat: 0, lng: 0, type: '矿山停产', color: '#E6A23C', level: '中', time: '2026-04-18', description: '核电复兴+库存补库推动需求增长，矿山产量仅覆盖约 85%，缺口由库存和二次供应补足。' },
  { id: 30, title: '哈萨克斯坦-中国铀燃料运输通道畅通', location: '哈萨克斯坦/中国', lat: 45.00, lng: 80.00, type: '运输物流', color: '#909399', level: '低', time: '2026-04-17', description: '中哈铁路铀精矿运输稳定，年运输量约 8,000-10,000 tU。' }

])

// ========== 地图相关 ==========
let map = null
let markerLayer = null
let currentFilter = ref(null)
const visibleMarkersCount = ref(0)
const selectedEvent = ref(null)
const activeEventId = ref(null)
const searchKeyword = ref('')
const searchActive = ref(false)
const currentPage = ref(1)
const pageSize = 9

// ========== 计算属性 ==========
const mapEvents = computed(() => events.value.filter(e => e.lat !== 0 && e.lng !== 0))

const filteredEvents = computed(() => {
  let result = events.value
  if (currentFilter.value) result = events.value.filter(e => e.type === currentFilter.value)
  return result
})

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredEvents.value.slice(start, start + pageSize)
})

const searchResults = computed(() => {
  if (!searchKeyword.value) return []
  const kw = searchKeyword.value.toLowerCase()
  return events.value.filter(e =>
    e.title.toLowerCase().includes(kw) || e.location.toLowerCase().includes(kw)
  ).slice(0, 8)
})

// ========== 方法 ==========
const getTypeCount = (type) => events.value.filter(e => e.type === type).length

const filterByType = (type) => {
  currentFilter.value = type
  currentPage.value = 1
  updateMarkersVisibility()
  fitMapToEvents()
  ElMessage.info(type ? `已筛选：${type} (${getTypeCount(type)}个事件)` : `显示全部 (${events.value.length}个事件)`)
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
  if (currentFilter.value) filtered = mapEvents.value.filter(e => e.type === currentFilter.value)
  visibleMarkersCount.value = filtered.length

  filtered.forEach(event => {
    const marker = L.circleMarker([event.lat, event.lng], {
      radius: 10,
      fillColor: event.color,
      color: '#ffffff',
      weight: 2.5,
      opacity: 1,
      fillOpacity: 0.85
    })
    marker.bindTooltip(`<b>${event.title}</b><br>${event.location}<br><span style="color:#ff6b6b">${event.level}风险</span>`, {
      direction: 'top',
      offset: [0, -15],
      className: 'custom-tooltip'
    })
    marker.on('click', () => selectEvent(event))
    markerLayer.addLayer(marker)
  })
}

const selectEvent = (event) => {
  selectedEvent.value = event
  activeEventId.value = event.id
  if (map && event.lat !== 0) {
    map.flyTo([event.lat, event.lng], 6, { duration: 1 })
  }
}

const selectSearchItem = (item) => {
  searchKeyword.value = ''
  searchActive.value = false
  selectEvent(item)
}

const openSettings = () => { ElMessage.info('设置功能开发中') }

// ========== 地图初始化 ==========
const DEFAULT_CENTER = [35, 105]
const DEFAULT_ZOOM = 4

const fitMapToEvents = () => {
  if (!map) return
  const points = currentFilter.value
    ? mapEvents.value.filter(e => e.type === currentFilter.value)
    : mapEvents.value

  if (!points.length) {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    return
  }

  const bounds = L.latLngBounds(points.map(e => [e.lat, e.lng]))
  map.fitBounds(bounds, {
    padding: [36, 36],
    maxZoom: 8
  })
}

const initMap = () => {
  const container = document.getElementById('oilIntelligenceMap')
  if (!container) {
    console.error('地图容器未找到')
    return
  }

  map = L.map('oilIntelligenceMap').setView(DEFAULT_CENTER, DEFAULT_ZOOM)

  const baseLayer = L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}', {
    subdomains: ['1', '2', '3', '4'],
    attribution: '高德地图',
    maxZoom: 18,
    minZoom: 3
  })
  baseLayer.on('tileerror', () => {
    ElMessage.error('地图底图加载失败，请检查网络或地图服务可用性')
  })
  baseLayer.addTo(map)

  L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(map)
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

onMounted(() => {
  nextTick(() => {
    initMap()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (map) map.remove()
})
</script>

<style scoped>
/* 基础样式 */
.oil-intelligence {
  background: #f0f2f5;
  min-height: 100vh;
}

/* Header Card */
.header-card {
  background: #fff;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
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
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.news-ticker-item {
  display: inline-flex;
  gap: 8px;
  margin-right: 32px;
  font-size: 13px;
}

.ticker-time { color: #909399; }
.ticker-title { color: #303133; font-weight: 500; }
.ticker-source { color: #67c23a; font-size: 12px; }

/* Header Main Content */
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
  background: rgba(64,158,255,0.08);
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

.tab-text { flex: 1; }
.tab-title { display: block; font-weight: 600; color: #303133; }
.tab-subtitle { font-size: 11px; color: #909399; }
.tab-arrow { color: #909399; }

/* Header Banner */
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
  background: rgba(16,185,129,0.2);
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
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.run-time, .update-time {
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

/* Map Section */
.map-section {
  padding: 20px;
}

.map-container {
  position: relative;
  height: 55vh;
  background: #e8eef3;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #ddd;
}

#oilIntelligenceMap {
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
  background: rgba(0,0,0,0.65);
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

/* Search Bar */
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
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
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

/* Detail Card */
.detail-card {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 380px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.2);
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

.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Events List */
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
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

.event-info { flex: 1; }
.event-title { font-weight: 600; margin-bottom: 6px; font-size: 14px; }
.event-location, .event-time { font-size: 12px; color: #909399; display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e8eef3;
}

/* Deep selectors */
:deep(.custom-tooltip) {
  font-size: 12px;
  padding: 6px 10px;
  background: rgba(0,0,0,0.8);
  color: #fff;
  border-radius: 6px;
}

:deep(.leaflet-container) {
  background: #e8eef3;
}
</style>
