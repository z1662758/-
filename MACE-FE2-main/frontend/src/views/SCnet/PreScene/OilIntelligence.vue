<template>
  <el-scrollbar height="89vh">
    <div class="oil-intelligence">
      <!-- Header Card Section -->
      <div class="header-card">
        <div class="news-ticker-wrap">
          <div class="news-ticker-label">
            <el-icon><BellFilled /></el-icon> 石油供应链实时动态
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
                <h1>石油情报   <span class="highlight">能源安全</span></h1>
                <p>实时监测全球石油供应链动态：OPEC 产能、地缘政治风险、航运通道、炼厂开工率、战略储备</p>
              </div>
              <div class="banner-stats">
                <div class="stat"><div class="num">{{ oilfieldCount }}</div><div class="label">监控油田</div></div>
                <div class="stat"><div class="num">{{ riskEventCount }}</div><div class="label">风险事件</div></div>
                <div class="stat"><div class="num">{{ tankerCount }}</div><div class="label">追踪油轮</div></div>
                <div class="stat"><div class="num">{{ currentBrentPrice }}</div><div class="label">布伦特原油 ($/桶)</div></div>
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
            placeholder="搜索油田、港口、炼油厂、事件..."
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
            <span><el-icon><List/></el-icon>石油供应链风险事件</span>
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
  { key: '风险地图', title: '风险地图', subtitle: '全球石油风险实时监控', icon: Location, iconClass: 'tab-icon-map' }
]
const switchTab = (key) => { activeHeaderTab.value = key }

// ========== 滚动新闻 ==========
const tickerNewsList = ref([
  { time: '16:30', title: 'OPEC+ 宣布延长减产协议至 Q3', source: '路透社' },
  { time: '15:45', title: '霍尔木兹海峡油轮通行延迟', source: '航运情报' },
  { time: '14:20', title: '美国 SPR 释放 3000 万桶战略储备', source: '能源部' },
  { time: '13:50', title: '北海 Brent 油田维护停工', source: 'Equinor' },
  { time: '12:30', title: '红海航线保险费用上涨 35%', source: '劳合社' },
  { time: '11:15', title: '沙特 Aramco 提高亚洲客户油价', source: '彭博社' }
])

// ========== 头部统计数据 ==========
const oilfieldCount = ref(156)
const riskEventCount = ref(89)
const tankerCount = ref(234)
const currentBrentPrice = ref(82.4)

// ========== 风险类型 ==========
const riskTypes = ref([
  { name: '地缘政治', color: '#F56C6C' },
  { name: '产能波动', color: '#E6A23C' },
  { name: '航运中断', color: '#409EFF' },
  { name: '炼厂停工', color: '#909399' },
  { name: '管道故障', color: '#67C23A' },
  { name: '价格异常', color: '#8B5CF6' }
])

// ========== 石油供应链事件数据 ==========
const events = ref([
  // 中东地区
  { id: 1, title: '霍尔木兹海峡通行受限', location: '霍尔木兹海峡', lat: 26.57, lng: 56.25, type: '地缘政治', color: '#F56C6C', level: '高', time: '2026-04-23', description: '紧张局势导致油轮通行检查加强，平均等待时间延长至 18 小时。' },
  { id: 2, title: '沙特 Ghawar 油田减产', location: 'Ghawar, 沙特', lat: 25.75, lng: 49.62, type: '产能波动', color: '#E6A23C', level: '高', time: '2026-04-22', description: '全球最大油田进行季度维护，日产量减少 50 万桶。' },
  { id: 3, title: '伊朗油轮遭扣押', location: '阿巴斯港，伊朗', lat: 27.18, lng: 56.28, type: '地缘政治', color: '#F56C6C', level: '高', time: '2026-04-21', description: '涉嫌违反制裁，油轮及货物被扣押。' },
  { id: 4, title: '阿联酋 ADNOC 扩产计划延期', location: '阿布扎比，阿联酋', lat: 24.45, lng: 54.37, type: '产能波动', color: '#E6A23C', level: '中', time: '2026-04-20', description: '产能扩张计划推迟至 2027 年。' },
  { id: 5, title: '伊拉克 Kirkuk 管道泄漏', location: 'Kirkuk, 伊拉克', lat: 35.47, lng: 44.39, type: '管道故障', color: '#67C23A', level: '中', time: '2026-04-22', description: '管道老化导致泄漏，修复需 2-3 周。' },
  { id: 6, title: '科威特炼油厂罢工', location: '科威特城', lat: 29.37, lng: 47.98, type: '炼厂停工', color: '#909399', level: '中', time: '2026-04-21', description: '工会要求提高薪资，炼厂产能下降 40%。' },
  { id: 7, title: '卡塔尔 LNG 出口创新高', location: '多哈，卡塔尔', lat: 25.29, lng: 51.53, type: '产能波动', color: '#67C23A', level: '低', time: '2026-04-20', description: '北部气田扩产，日出口量突破历史纪录。' },
  { id: 8, title: '也门胡塞武装袭击预警', location: '亚丁湾', lat: 12.78, lng: 45.02, type: '地缘政治', color: '#F56C6C', level: '高', time: '2026-04-23', description: '发布航运安全警告，多家公司改道好望角。' },

  // 欧洲地区
  { id: 9, title: '欧盟对俄油限价生效', location: '布鲁塞尔，比利时', lat: 50.85, lng: 4.35, type: '地缘政治', color: '#F56C6C', level: '高', time: '2026-04-23', description: 'G7 达成价格上限协议，违反者禁止保险服务。' },
  { id: 10, title: '挪威 Equinor 工人罢工', location: '斯塔万格，挪威', lat: 58.97, lng: 5.73, type: '炼厂停工', color: '#909399', level: '中', time: '2026-04-22', description: '北海主要供应商停产，影响日供应 20 万桶。' },
  { id: 11, title: '荷兰鹿特丹港拥堵', location: '鹿特丹，荷兰', lat: 51.92, lng: 4.48, type: '航运中断', color: '#409EFF', level: '中', time: '2026-04-21', description: '油轮等待泊位时间延长至 5 天。' },
  { id: 12, title: '英国 Brent 油田衰退加速', location: '北海，英国', lat: 61.00, lng: 1.00, type: '产能波动', color: '#E6A23C', level: '中', time: '2026-04-20', description: '老油田产量同比下降 12%。' },
  { id: 13, title: '德国 Leuna 炼厂检修', location: 'Leuna, 德国', lat: 51.32, lng: 11.90, type: '炼厂停工', color: '#909399', level: '低', time: '2026-04-19', description: '计划内年度维护，持续 3 周。' },
  { id: 14, title: '意大利 Saras 炼厂关闭风险', location: '撒丁岛，意大利', lat: 39.22, lng: 9.12, type: '炼厂停工', color: '#909399', level: '高', time: '2026-04-18', description: '环保压力可能导致永久关闭。' },
  { id: 15, title: '波罗的海油运量激增', location: '波罗的海', lat: 58.00, lng: 20.00, type: '航运中断', color: '#409EFF', level: '中', time: '2026-04-17', description: '俄油转道导致航运密度增加 60%。' },

  // 北美地区
  { id: 16, title: '美国 SPR 释放计划', location: '华盛顿，美国', lat: 38.90, lng: -77.04, type: '产能波动', color: '#E6A23C', level: '中', time: '2026-04-23', description: '宣布释放 3000 万桶战略石油储备。' },
  { id: 17, title: '墨西哥湾飓风预警', location: '墨西哥湾', lat: 25.00, lng: -90.00, type: '地缘政治', color: '#F56C6C', level: '高', time: '2026-04-22', description: '热带风暴可能影响海上钻井平台。' },
  { id: 18, title: '德州 Permian 盆地产量下滑', location: 'Permian Basin, 美国', lat: 31.50, lng: -102.00, type: '产能波动', color: '#E6A23C', level: '中', time: '2026-04-21', description: '页岩油井衰减率超预期。' },
  { id: 19, title: '加拿大 Keystone 管道泄漏', location: 'Alberta, 加拿大', lat: 56.73, lng: -111.38, type: '管道故障', color: '#67C23A', level: '高', time: '2026-04-20', description: '重油管道泄漏，影响日输送 30 万桶。' },
  { id: 20, title: '加州炼厂环保限制升级', location: '洛杉矶，美国', lat: 34.05, lng: -118.24, type: '炼厂停工', color: '#909399', level: '中', time: '2026-04-19', description: '新法规要求额外脱硫设备。' },

  // 俄罗斯及中亚
  { id: 21, title: '俄罗斯乌拉尔油折扣扩大', location: '莫斯科，俄罗斯', lat: 55.75, lng: 37.61, type: '价格异常', color: '#8B5CF6', level: '中', time: '2026-04-23', description: '较 Brent 折扣达 35 美元/桶。' },
  { id: 22, title: '东西伯利亚管道扩建', location: '东西伯利亚', lat: 60.00, lng: 120.00, type: '产能波动', color: '#67C23A', level: '低', time: '2026-04-22', description: 'ESPO 管道扩能至 8000 万吨/年。' },
  { id: 23, title: '哈萨克斯坦 CPC 管道检修', location: 'Atyrau, 哈萨克斯坦', lat: 47.11, lng: 51.92, type: '管道故障', color: '#67C23A', level: '中', time: '2026-04-21', description: '里海管道联盟进行年度维护。' },

  // 非洲地区
  { id: 24, title: '尼日利亚尼日尔三角洲武装袭击', location: '尼日尔三角洲', lat: 4.75, lng: 6.50, type: '地缘政治', color: '#F56C6C', level: '高', time: '2026-04-22', description: '武装分子袭击输油设施，日损失 20 万桶。' },
  { id: 25, title: '利比亚 Sharara 油田关闭', location: 'Sharara, 利比亚', lat: 26.33, lng: 14.33, type: '产能波动', color: '#F56C6C', level: '高', time: '2026-04-21', description: '部落冲突导致油田无限期关闭。' },
  { id: 26, title: '苏伊士运河通行费上涨', location: '苏伊士，埃及', lat: 30.00, lng: 32.58, type: '航运中断', color: '#409EFF', level: '中', time: '2026-04-18', description: '通行费上调 15%，影响东西向油运。' },

  // 亚太地区
  { id: 27, title: '中国战略储备采购', location: '北京，中国', lat: 39.90, lng: 116.40, type: '价格异常', color: '#8B5CF6', level: '中', time: '2026-04-23', description: '逢低买入充实 SPR，推动亚洲溢价。' },
  { id: 28, title: '印度 MRPL 炼厂爆炸', location: 'Mangalore, 印度', lat: 12.91, lng: 74.85, type: '炼厂停工', color: '#909399', level: '高', time: '2026-04-22', description: '蒸馏装置爆炸，日产能 15 万桶停工。' },
  { id: 29, title: '日本 JXTG 炼厂地震影响', location: '仙台，日本', lat: 38.27, lng: 140.87, type: '炼厂停工', color: '#909399', level: '中', time: '2026-04-21', description: '地震导致部分装置临时停车。' },
  { id: 30, title: '韩国 SK Innovation 扩产', location: '蔚山，韩国', lat: 35.54, lng: 129.31, type: '产能波动', color: '#67C23A', level: '低', time: '2026-04-20', description: '新增 10 万桶/日炼化能力。' },
  { id: 31, title: '马来西亚船对船转运受限', location: '马六甲海峡', lat: 2.50, lng: 101.50, type: '航运中断', color: '#409EFF', level: '中', time: '2026-04-19', description: '加强 STS 作业监管。' },

  // 南美地区
  { id: 32, title: '委内瑞拉 PDVSA 债务违约', location: '加拉加斯，委内瑞拉', lat: 10.50, lng: -66.91, type: '地缘政治', color: '#F56C6C', level: '高', time: '2026-04-21', description: '无法支付服务商，产量进一步下滑。' },
  { id: 33, title: '巴西 Petrobras 盐下层突破', location: '里约热内卢，巴西', lat: -22.90, lng: -43.20, type: '产能波动', color: '#67C23A', level: '低', time: '2026-04-20', description: '新钻井日产超 5 万桶。' },
  { id: 34, title: '哥伦比亚管道爆炸', location: 'Cano Limon Pipeline', lat: 9.00, lng: -73.00, type: '管道故障', color: '#67C23A', level: '高', time: '2026-04-19', description: 'ELN 游击队炸毁管道。' },

  // 价格与市场
  { id: 35, title: 'Brent 原油突破 90 美元', location: 'ICE Europe', lat: 51.51, lng: -0.09, type: '价格异常', color: '#8B5CF6', level: '高', time: '2026-04-23', description: '地缘风险溢价推动价格上涨。' },
  { id: 36, title: 'WTI-Brent 价差倒挂', location: 'NYMEX', lat: 40.71, lng: -74.01, type: '价格异常', color: '#8B5CF6', level: '中', time: '2026-04-22', description: '美国出口需求推高 WTI。' },
  { id: 37, title: '迪拜-Oman 价差异常', location: 'DME', lat: 25.20, lng: 55.27, type: '价格异常', color: '#8B5CF6', level: '中', time: '2026-04-21', description: '中东现货紧张推升溢价。' },
  { id: 38, title: '燃油裂解价差收窄', location: '新加坡', lat: 1.35, lng: 103.82, type: '价格异常', color: '#8B5CF6', level: '低', time: '2026-04-20', description: '炼厂利润受挤压。' }
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
