<template>
  <div class="uranium-page">

    <!-- =====================================================
         顶部标题
    ====================================================== -->
    <header class="page-header">
      <div class="header-left">
        <div class="title-row">
          <h1>全球铀供应链态势图</h1>
          <span class="china-badge">中国</span>
        </div>

        <div class="subtitle">
          Uranium Supply Chain Situation Awareness
        </div>
      </div>

      <div class="header-right">
        <div class="update-label">数据更新时间</div>
        <div class="update-time">{{ updateTime }}</div>
      </div>
    </header>


    <!-- =====================================================
         顶部总览
    ====================================================== -->
    <section class="top-dashboard">

      <!-- 中国铀燃料需求 -->
      <div class="card demand-card">
        <div class="card-title">
          中国铀燃料需求概况
        </div>

        <div class="metric-list">
          <div class="metric-item">
            <span>天然铀需求量</span>
            <b class="metric-main">
              {{ formatNumber(demandVolume) }} tU
            </b>
          </div>

          <div class="metric-item">
            <span>国内供应量</span>
            <b class="metric-green">
              {{ formatNumber(domesticVolume) }} tU
            </b>
          </div>

          <div class="metric-item">
            <span>海外供应量</span>
            <b class="metric-orange">
              {{ formatNumber(overseasVolume) }} tU
            </b>
          </div>

          <div class="metric-item">
            <span>海外供应国家</span>
            <b>{{ supplierShares.length }} 个</b>
          </div>
        </div>
      </div>


      <!-- 自主 / 海外依存 -->
      <div class="card structure-card">
        <div class="card-title">
          中国铀供应结构
        </div>

        <div class="structure-main">
          <div
            ref="donutRef"
            class="donut-chart"
          ></div>

          <div class="structure-info">
            <div class="structure-line">
              <span class="structure-dot domestic"></span>

              <div>
                <span>独立自主</span>
                <strong class="metric-green">
                  {{ selfPct.toFixed(1) }}%
                </strong>
              </div>
            </div>

            <div class="structure-line">
              <span class="structure-dot overseas"></span>

              <div>
                <span>海外依存</span>
                <strong class="metric-orange">
                  {{ overseasPct.toFixed(1) }}%
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>


      <!-- 海外供应商占比 -->
      <div class="card supplier-share-card">
        <div class="card-title">
          海外供应商占比
        </div>

        <div class="mini-share-list">
          <div
            v-for="item in topSupplierShares"
            :key="item.country"
            class="mini-share-item"
          >
            <div class="mini-share-country">
              <i
                class="mini-dot"
                :style="{
                  background: riskColor(supplierRisk(item))
                }"
              ></i>

              <span>{{ item.country }}</span>
            </div>

            <div class="mini-share-track">
              <div
                class="mini-share-fill"
                :style="{
                  width: Math.min(Number(item.sharePct || 0), 100) + '%'
                }"
              ></div>
            </div>

            <b>
              {{ Number(item.sharePct || 0).toFixed(1) }}%
            </b>
          </div>

          <div
            v-if="!topSupplierShares.length"
            class="empty-small"
          >
            暂无供应商数据
          </div>
        </div>
      </div>


      <!-- 综合风险 -->
      <div class="card total-risk-card">
        <div class="card-title danger-title">
          供应链综合风险
        </div>

        <div class="total-risk-body">
          <div
            class="total-risk-score"
            :style="{
              color: riskColor(overallRisk / 100)
            }"
          >
            {{ overallRisk }}
          </div>

          <div class="total-risk-unit">
            /100
          </div>

          <div
            class="total-risk-label"
            :style="{
              color: riskColor(overallRisk / 100)
            }"
          >
            {{ overallRiskText }}
          </div>
        </div>

        <div class="risk-scale">
          <div class="scale-green"></div>
          <div class="scale-yellow"></div>
          <div class="scale-orange"></div>
          <div class="scale-red"></div>
        </div>

        <div class="risk-scale-labels">
          <span>低</span>
          <span>中</span>
          <span>高</span>
          <span>极高</span>
        </div>
      </div>


      <!-- 雷达 -->
      <div class="card radar-card">
        <div class="card-title">
          风险类型分布
        </div>

        <div
          ref="radarRef"
          class="radar-chart"
        ></div>
      </div>
    </section>


    <!-- =====================================================
         中部：大地图 + 风险排行
    ====================================================== -->
    <section class="main-dashboard">

      <!-- ================= 世界地图 ================= -->
      <main class="map-card">

        <!-- 风险等级图例 -->
        <div class="map-risk-legend">
          <div class="map-risk-title">
            风险等级
          </div>

          <div>
            <i class="risk-dot risk-critical"></i>
            <span>极高风险</span>
            <b>80-100</b>
          </div>

          <div>
            <i class="risk-dot risk-high"></i>
            <span>高风险</span>
            <b>60-79</b>
          </div>

          <div>
            <i class="risk-dot risk-medium"></i>
            <span>中风险</span>
            <b>40-59</b>
          </div>

          <div>
            <i class="risk-dot risk-low"></i>
            <span>低风险</span>
            <b>0-39</b>
          </div>
        </div>


        <!-- 线路图例 -->
        <div class="route-legend">
          <div class="route-legend-item">
            <i class="route-line route-red"></i>
            高风险线路
          </div>

          <div class="route-legend-item">
            <i class="route-line route-orange"></i>
            中风险线路
          </div>

          <div class="route-legend-item">
            <i class="route-line route-green"></i>
            低风险线路
          </div>
        </div>


        <!-- 地图 -->
        <div
          ref="mapRef"
          class="world-map"
        ></div>


        <!-- 节点图例 -->
        <div class="map-node-legend">
          <span>
            <i class="legend-symbol supplier-symbol"></i>
            供应国
          </span>

          <span>
            <i class="legend-symbol chokepoint-symbol"></i>
            关键通道
          </span>

          <span>
            <i class="legend-symbol storage-symbol"></i>
            港口 / 仓储
          </span>

          <span>
            <i class="legend-symbol china-symbol"></i>
            中国接收中心
          </span>
        </div>
      </main>


      <!-- ================= 右侧高风险排行 ================= -->
      <aside class="risk-ranking-panel">

        <div class="panel-title">
          当前高风险节点 TOP 8
        </div>

        <div class="risk-summary">
          <div class="risk-summary-item">
            <span>高风险节点</span>
            <b class="red-text">
              {{ highRiskCount }}
            </b>
          </div>

          <div class="risk-summary-item">
            <span>极高风险节点</span>
            <b class="red-text">
              {{ criticalRiskCount }}
            </b>
          </div>
        </div>


        <div class="risk-ranking-scroll">
          <div
            v-for="(node, index) in topRiskNodes"
            :key="`${node.type}-${node.name}`"
            class="ranking-item"
          >
            <div
              class="ranking-index"
              :class="{
                rankingTop: index < 3
              }"
            >
              {{ index + 1 }}
            </div>

            <div class="ranking-content">
              <div class="ranking-head">
                <strong>{{ node.name }}</strong>

                <span>{{ node.type }}</span>
              </div>

              <div class="ranking-risk-row">
                <div class="ranking-track">
                  <div
                    class="ranking-fill"
                    :style="{
                      width: node.riskScore + '%',
                      background: riskColor(node.risk)
                    }"
                  ></div>
                </div>

                <b
                  :style="{
                    color: riskColor(node.risk)
                  }"
                >
                  {{ node.riskScore }}
                </b>
              </div>

              <div class="ranking-meta">
                <span
                  :style="{
                    color: riskColor(node.risk)
                  }"
                >
                  {{ riskLabel(node.risk) }}
                </span>
              </div>

              <div class="ranking-reason">
                {{ node.reason }}
              </div>
            </div>
          </div>

          <div
            v-if="!topRiskNodes.length"
            class="empty-message"
          >
            暂无风险节点
          </div>
        </div>
      </aside>
    </section>


    <!-- =====================================================
         典型供应链路径
    ====================================================== -->
    <section class="chain-card">

      <div class="chain-header">
        <div>
          <div class="chain-title">
            典型供应链路径
          </div>

          <div class="chain-subtitle">
            矿山 → 内陆运输 → 出口港 →
            国际运输通道 → 中国接收节点 →
            仓储 / 加工 → 需求中心
          </div>
        </div>

        <select
          v-model.number="selectedRouteIndex"
          class="route-select"
        >
          <option
            v-for="(route, index) in routes"
            :key="index"
            :value="index"
          >
            {{
              route.name ||
              `${route.from || ''} → ${route.to || '中国'}`
            }}
          </option>
        </select>
      </div>


      <div
        v-if="selectedChainNodes.length"
        class="chain-track"
      >
        <template
          v-for="(node, index) in selectedChainNodes"
          :key="`${node.name}-${index}`"
        >

          <div class="chain-node">
            <div
              class="chain-node-icon"
              :style="{
                borderColor: riskColor(node.riskScore),
                color: riskColor(node.riskScore),
                boxShadow:
                  normalizeRisk(node.riskScore) >= 0.6
                    ? `0 0 12px ${riskColor(node.riskScore)}55`
                    : 'none'
              }"
            >
              {{ routeNodeIcon(node) }}
            </div>

            <div class="chain-node-name">
              {{ node.name }}
            </div>

            <div
              class="chain-node-score"
              :style="{
                color: riskColor(node.riskScore)
              }"
            >
              风险 {{ risk100(node.riskScore) }}
            </div>

            <div
              class="chain-node-level"
              :style="{
                color: riskColor(node.riskScore)
              }"
            >
              {{ riskLevelShort(node.riskScore) }}
            </div>

            <div
              v-if="node.reason || node.riskReason"
              class="chain-node-reason"
            >
              {{ node.riskReason || node.reason }}
            </div>
          </div>


          <div
            v-if="index < selectedChainNodes.length - 1"
            class="chain-arrow"
          >
            <div
              class="chain-arrow-line"
              :style="{
                background:
                  riskColor(
                    Math.max(
                      normalizeRisk(node.riskScore),
                      normalizeRisk(
                        selectedChainNodes[index + 1]?.riskScore
                      )
                    )
                  )
              }"
            ></div>

            <span
              :style="{
                color:
                  riskColor(
                    Math.max(
                      normalizeRisk(node.riskScore),
                      normalizeRisk(
                        selectedChainNodes[index + 1]?.riskScore
                      )
                    )
                  )
              }"
            >
              ›
            </span>
          </div>

        </template>
      </div>

      <div
        v-else
        class="empty-chain"
      >
        暂无供应链路径数据
      </div>
    </section>


    <!-- =====================================================
         底部重新布局
         风险事件 + 风险构成 + 态势研判
    ====================================================== -->
    <section class="bottom-dashboard">

      <!-- ================= 风险事件监测 ================= -->
      <div class="bottom-card event-card">
        <div class="panel-title">
          风险事件监测
          <span>开源情报 / OSINT</span>
        </div>

        <div class="event-scroll">
          <div
            v-for="event in visibleEvents"
            :key="event.id"
            class="event-item"
          >
            <div class="event-left">
              <div class="event-time">
                {{ formatEventDate(event.time) }}
              </div>

              <div
                class="event-risk-level"
                :style="{
                  color:
                    event.color ||
                    riskColor(eventRisk(event))
                }"
              >
                {{
                  event.level ||
                  riskLevelShort(eventRisk(event))
                }}
              </div>
            </div>


            <div
              class="event-risk-bar"
              :style="{
                background: riskColor(eventRisk(event))
              }"
            ></div>


            <div class="event-info">
              <div class="event-title-row">
                <strong>
                  {{ event.title }}
                </strong>

                <span
                  v-if="event.source"
                  class="event-source"
                >
                  {{ event.source }}
                </span>
              </div>

              <span class="event-desc">
                {{ event.desc }}
              </span>

              <div class="event-score-row">
                <span>影响风险</span>

                <div class="event-score-track">
                  <div
                    class="event-score-fill"
                    :style="{
                      width: risk100(eventRisk(event)) + '%',
                      background: riskColor(eventRisk(event))
                    }"
                  ></div>
                </div>

                <b
                  :style="{
                    color: riskColor(eventRisk(event))
                  }"
                >
                  {{ risk100(eventRisk(event)) }}
                </b>
              </div>
            </div>
          </div>

          <div
            v-if="!visibleEvents.length"
            class="empty-message"
          >
            当前暂无风险事件
          </div>
        </div>
      </div>


      <!-- ================= 风险构成 ================= -->
      <div class="bottom-card risk-composition-card">
        <div class="panel-title">
          供应链风险构成
        </div>

        <div class="risk-composition">

          <div
            v-for="item in riskComposition"
            :key="item.name"
            class="risk-composition-item"
          >
            <div class="composition-head">
              <div class="composition-name">
                <i
                  :style="{
                    background: riskColor(item.value / 100)
                  }"
                ></i>

                {{ item.name }}
              </div>

              <div>
                <b
                  :style="{
                    color: riskColor(item.value / 100)
                  }"
                >
                  {{ item.value }}
                </b>

                <span>
                  {{ riskLevelShort(item.value / 100) }}
                </span>
              </div>
            </div>

            <div class="composition-track">
              <div
                class="composition-fill"
                :style="{
                  width: item.value + '%',
                  background: riskColor(item.value / 100)
                }"
              ></div>
            </div>

            <div class="composition-desc">
              {{ item.desc }}
            </div>
          </div>
        </div>
      </div>


      <!-- ================= 态势研判 ================= -->
      <div class="bottom-card analysis-card">
        <div class="panel-title">
          态势研判结论
        </div>

        <div class="analysis-content">

          <div
            class="analysis-level"
            :style="{
              color: riskColor(overallRisk / 100),
              background: riskBackground(overallRisk / 100)
            }"
          >
            {{ conclusion.tag || overallRiskText }}
          </div>


          <div class="analysis-kpi-row">
            <div class="analysis-kpi">
              <span>综合风险</span>

              <b
                :style="{
                  color: riskColor(overallRisk / 100)
                }"
              >
                {{ overallRisk }}
              </b>
            </div>

            <div class="analysis-kpi">
              <span>高风险节点</span>
              <b class="red-text">
                {{ highRiskCount }}
              </b>
            </div>

            <div class="analysis-kpi">
              <span>风险事件</span>
              <b>
                {{ visibleEvents.length }}
              </b>
            </div>
          </div>


          <div class="analysis-points">
            <div
              v-for="(point, index) in conclusion.points"
              :key="index"
              class="analysis-point"
            >
              <i></i>
              <div v-html="point"></div>
            </div>

            <template
              v-if="!conclusion.points?.length"
            >
              <div class="analysis-point">
                <i></i>

                <div>
                  当前供应链综合风险指数为
                  <b>{{ overallRisk }}</b>，
                  总体处于
                  <b>{{ overallRiskText }}</b>。
                </div>
              </div>

              <div
                v-if="topRiskNodes[0]"
                class="analysis-point"
              >
                <i></i>

                <div>
                  当前最高风险节点为
                  <b>{{ topRiskNodes[0].name }}</b>，
                  风险指数
                  <b>{{ topRiskNodes[0].riskScore }}</b>。
                </div>
              </div>

              <div
                v-if="highestRiskCategory"
                class="analysis-point"
              >
                <i></i>

                <div>
                  当前风险贡献较高的维度为
                  <b>{{ highestRiskCategory.name }}</b>，
                  指数
                  <b>{{ highestRiskCategory.value }}</b>。
                </div>
              </div>
            </template>
          </div>


          <div class="analysis-confidence">
            <span>研判置信度</span>

            <b :style="{ color: scoreColor }">
              {{ verificationSummary.score || 0 }}%
            </b>

            <el-tag
              size="small"
              :type="levelTag"
            >
              {{ verificationSummary.level || '待验证' }}
            </el-tag>
          </div>


          <el-button
            type="primary"
            size="small"
            class="verify-btn"
            @click="$emit('open-verify')"
          >
            验证研判
          </el-button>
        </div>
      </div>
    </section>


    <!-- =====================================================
         时间轴
    ====================================================== -->
    <footer class="timeline-bar">

      <el-button
        size="small"
        type="primary"
        @click="togglePlay"
      >
        {{ playing ? '⏸ 暂停' : '▶ 态势推演' }}
      </el-button>


      <div class="timeline-year">
        {{ currentYear || '当前' }}
      </div>


      <el-slider
        v-model="yearIdx"
        :min="0"
        :max="maxIdx"
        :step="1"
        :show-tooltip="false"
        class="timeline-slider"
        @change="renderAll"
      />


      <div class="timeline-stat">
        高风险节点
        <b class="red-text">
          {{ highRiskCount }}
        </b>
      </div>

      <div class="timeline-stat">
        综合风险
        <b
          :style="{
            color: riskColor(overallRisk / 100)
          }"
        >
          {{ overallRisk }}
        </b>
      </div>
    </footer>
  </div>
</template>


<script setup>
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount
} from 'vue'

import * as echarts from 'echarts'

import {
  ensureEchartsWorldMap
} from '@/utils/ensureEchartsWorldMap'


/* ============================================================
   Props
============================================================ */

const props = defineProps({

  scenario: {
    type: String,
    default: 'uranium'
  },

  situationMap: {
    type: Object,
    default: () => ({
      updateTime: '',
      points: [],
      summary: '',
      selfSufficiency: {},
      supplierShares: [],
      routes: [],
      chokepoints: [],
      storage: []
    })
  },

  mapEvolution: {
    type: Object,
    default: () => ({
      years: [],
      frames: [],
      events: [],
      unit: ''
    })
  },

  conclusion: {
    type: Object,
    default: () => ({
      tag: '',
      points: []
    })
  },

  verificationSummary: {
    type: Object,
    default: () => ({
      score: 0,
      level: ''
    })
  }
})

defineEmits([
  'open-verify'
])


/* ============================================================
   Chart refs
============================================================ */

const mapRef = ref(null)

const donutRef = ref(null)

const radarRef = ref(null)

let mapChart = null

let donutChart = null

let radarChart = null

let resizeObserver = null

let playTimer = null


/* ============================================================
   Timeline
============================================================ */

const playing = ref(false)

const yearIdx = ref(0)

const selectedRouteIndex = ref(0)


const years = computed(() =>
  Array.isArray(
    props.mapEvolution.years
  )
    ? props.mapEvolution.years
    : []
)


const frames = computed(() =>
  Array.isArray(
    props.mapEvolution.frames
  )
    ? props.mapEvolution.frames
    : []
)


const events = computed(() =>
  Array.isArray(
    props.mapEvolution.events
  )
    ? props.mapEvolution.events
    : []
)


const currentYear = computed(() =>
  years.value[yearIdx.value] ||
  ''
)


const maxIdx = computed(() =>
  Math.max(
    years.value.length - 1,
    0
  )
)


const currentFrame = computed(() =>
  frames.value[
    yearIdx.value
  ] || {}
)


/* ============================================================
   Basic data
============================================================ */

const selfSufficiency = computed(() =>
  props.situationMap.selfSufficiency ||
  {}
)


const supplierShares = computed(() =>
  Array.isArray(
    props.situationMap.supplierShares
  )
    ? props.situationMap.supplierShares
    : []
)


const routes = computed(() =>
  Array.isArray(
    props.situationMap.routes
  )
    ? props.situationMap.routes
    : []
)


const chokepoints = computed(() =>
  Array.isArray(
    props.situationMap.chokepoints
  )
    ? props.situationMap.chokepoints
    : []
)


const storageNodes = computed(() =>
  Array.isArray(
    props.situationMap.storage
  )
    ? props.situationMap.storage
    : []
)


/* ============================================================
   Self sufficiency
============================================================ */

const selfPct = computed(() => {

  const value =
    selfSufficiency.value.ratioPct ??
    selfSufficiency.value.selfPct ??
    0

  return Number(value) || 0
})


const overseasPct = computed(() => {

  const value =
    selfSufficiency.value.overseasRatioPct ??
    selfSufficiency.value.overseasPct

  if (value != null) {
    return Number(value) || 0
  }

  return Math.max(
    0,
    100 - selfPct.value
  )
})


const domesticVolume = computed(() =>
  Number(
    selfSufficiency.value.domestic ??
    selfSufficiency.value.domesticVolume ??
    0
  ) || 0
)


const demandVolume = computed(() =>
  Number(
    selfSufficiency.value.demand ??
    selfSufficiency.value.totalDemand ??
    0
  ) || 0
)


const overseasVolume = computed(() => {

  if (
    selfSufficiency.value.overseasVolume != null
  ) {
    return Number(
      selfSufficiency.value.overseasVolume
    ) || 0
  }

  return Math.max(
    demandVolume.value -
    domesticVolume.value,
    0
  )
})


/* ============================================================
   Update time
============================================================ */

const updateTime = computed(() => {

  if (
    props.situationMap.updateTime
  ) {
    return props.situationMap.updateTime
  }

  return new Date().toLocaleString(
    'zh-CN',
    {
      hour12: false
    }
  )
})


/* ============================================================
   Risk
============================================================ */

function normalizeRisk(value) {

  let number =
    Number(value) || 0

  if (number > 1) {
    number =
      number / 100
  }

  return Math.max(
    0,
    Math.min(
      1,
      number
    )
  )
}


function risk100(value) {

  return Math.round(
    normalizeRisk(value) *
    100
  )
}


function riskColor(value) {

  const risk =
    normalizeRisk(value)

  if (risk >= 0.8) {
    return '#dc2626'
  }

  if (risk >= 0.6) {
    return '#f97316'
  }

  if (risk >= 0.4) {
    return '#eab308'
  }

  return '#16a34a'
}


function riskBackground(value) {

  const risk =
    normalizeRisk(value)

  if (risk >= 0.8) {
    return '#fee2e2'
  }

  if (risk >= 0.6) {
    return '#ffedd5'
  }

  if (risk >= 0.4) {
    return '#fef9c3'
  }

  return '#dcfce7'
}


function riskLabel(value) {

  const risk =
    normalizeRisk(value)

  if (risk >= 0.8) {
    return '极高风险'
  }

  if (risk >= 0.6) {
    return '高风险'
  }

  if (risk >= 0.4) {
    return '中风险'
  }

  return '低风险'
}


function riskLevelShort(value) {

  const risk =
    normalizeRisk(value)

  if (risk >= 0.8) {
    return '极高'
  }

  if (risk >= 0.6) {
    return '高'
  }

  if (risk >= 0.4) {
    return '中'
  }

  return '低'
}


function supplierRisk(item = {}) {

  return Math.max(

    normalizeRisk(
      item.riskScore
    ),

    normalizeRisk(
      item.policyRisk
    ),

    normalizeRisk(
      item.transportRisk
    ),

    normalizeRisk(
      item.geopoliticalRisk
    ),

    normalizeRisk(
      item.supplyRisk
    )
  )
}


/* ============================================================
   Supplier shares
============================================================ */

const topSupplierShares = computed(() => {

  return [
    ...supplierShares.value
  ]
    .sort(
      (a, b) =>
        Number(b.sharePct || 0) -
        Number(a.sharePct || 0)
    )
    .slice(
      0,
      7
    )
})


/* ============================================================
   Risk averages
============================================================ */

const supplierAverageRisk = computed(() => {

  if (
    !supplierShares.value.length
  ) {
    return 0
  }

  let weightedRisk = 0
  let totalWeight = 0

  supplierShares.value.forEach(
    item => {

      const weight =
        Number(
          item.sharePct
        ) || 1

      weightedRisk +=
        supplierRisk(item) *
        weight

      totalWeight +=
        weight
    }
  )

  return weightedRisk /
    Math.max(
      totalWeight,
      1
    )
})


const policyAverageRisk = computed(() => {

  if (
    !supplierShares.value.length
  ) {
    return 0
  }

  return supplierShares.value.reduce(
    (sum, item) =>
      sum +
      normalizeRisk(
        item.policyRisk
      ),
    0
  ) /
  supplierShares.value.length
})


const geopoliticalAverageRisk = computed(() => {

  if (
    !supplierShares.value.length
  ) {
    return 0
  }

  return supplierShares.value.reduce(
    (sum, item) =>
      sum +
      normalizeRisk(
        item.geopoliticalRisk
      ),
    0
  ) /
  supplierShares.value.length
})


const routeAverageRisk = computed(() => {

  if (
    !routes.value.length
  ) {
    return 0
  }

  return routes.value.reduce(
    (sum, item) =>
      sum +
      normalizeRisk(
        item.riskScore
      ),
    0
  ) /
  routes.value.length
})


const chokepointAverageRisk = computed(() => {

  if (
    !chokepoints.value.length
  ) {
    return 0
  }

  return chokepoints.value.reduce(
    (sum, item) =>
      sum +
      normalizeRisk(
        item.riskScore
      ),
    0
  ) /
  chokepoints.value.length
})


const storageAverageRisk = computed(() => {

  if (
    !storageNodes.value.length
  ) {
    return 0
  }

  return storageNodes.value.reduce(
    (sum, item) =>
      sum +
      normalizeRisk(
        item.riskScore
      ),
    0
  ) /
  storageNodes.value.length
})


/* ============================================================
   Overall risk
============================================================ */

const overallRisk = computed(() => {

  const frameRisk =
    currentFrame.value.risk

  if (
    frameRisk?.overall != null
  ) {
    return risk100(
      frameRisk.overall
    )
  }

  const value =
    supplierAverageRisk.value * 0.30 +
    routeAverageRisk.value * 0.25 +
    chokepointAverageRisk.value * 0.30 +
    storageAverageRisk.value * 0.15

  return Math.round(
    value * 100
  )
})


const overallRiskText = computed(() =>
  riskLabel(
    overallRisk.value /
    100
  )
)


/* ============================================================
   Radar
============================================================ */

const radarValues = computed(() => [

  Math.round(
    policyAverageRisk.value *
    100
  ),

  Math.round(
    geopoliticalAverageRisk.value *
    100
  ),

  Math.round(
    routeAverageRisk.value *
    100
  ),

  Math.round(
    chokepointAverageRisk.value *
    100
  ),

  Math.round(
    storageAverageRisk.value *
    100
  )
])


/* ============================================================
   Bottom risk composition
============================================================ */

const riskComposition = computed(() => [

  {
    name:
      '政策风险',

    value:
      Math.round(
        policyAverageRisk.value *
        100
      ),

    desc:
      '出口限制、矿业政策、监管制度等变化'
  },

  {
    name:
      '地缘风险',

    value:
      Math.round(
        geopoliticalAverageRisk.value *
        100
      ),

    desc:
      '供应国局势、外交环境及区域冲突影响'
  },

  {
    name:
      '运输风险',

    value:
      Math.round(
        routeAverageRisk.value *
        100
      ),

    desc:
      '铁路、公路、海运及国际物流中断风险'
  },

  {
    name:
      '关键通道风险',

    value:
      Math.round(
        chokepointAverageRisk.value *
        100
      ),

    desc:
      '海峡、运河、港口等关键物流节点风险'
  },

  {
    name:
      '接收仓储风险',

    value:
      Math.round(
        storageAverageRisk.value *
        100
      ),

    desc:
      '国内接收、库存、储备及周转能力风险'
  }
])


const highestRiskCategory = computed(() => {

  if (
    !riskComposition.value.length
  ) {
    return null
  }

  return [
    ...riskComposition.value
  ].sort(
    (a, b) =>
      b.value -
      a.value
  )[0]
})


/* ============================================================
   Risk ranking
============================================================ */

function buildSupplierReason(item) {

  if (
    item.riskReason
  ) {
    return item.riskReason
  }

  const reasons = []

  if (
    normalizeRisk(
      item.policyRisk
    ) >= 0.6
  ) {
    reasons.push(
      '政策变化风险较高'
    )
  }

  if (
    normalizeRisk(
      item.geopoliticalRisk
    ) >= 0.6
  ) {
    reasons.push(
      '地缘环境风险较高'
    )
  }

  if (
    normalizeRisk(
      item.transportRisk
    ) >= 0.6
  ) {
    reasons.push(
      '运输链路风险较高'
    )
  }

  if (
    normalizeRisk(
      item.supplyRisk
    ) >= 0.6
  ) {
    reasons.push(
      '原料供应稳定性下降'
    )
  }

  return reasons.length
    ? reasons.join('、')
    : '当前风险总体可控'
}


const allRiskNodes = computed(() => {

  const result = []


  supplierShares.value.forEach(
    item => {

      const risk =
        supplierRisk(item)

      result.push({

        name:
          item.country,

        type:
          '供应国',

        risk,

        riskScore:
          risk100(risk),

        reason:
          buildSupplierReason(
            item
          )
      })
    }
  )


  routes.value.forEach(
    item => {

      const risk =
        normalizeRisk(
          item.riskScore
        )

      result.push({

        name:
          item.name ||
          `${item.from || ''} → ${item.to || '中国'}`,

        type:
          '运输线路',

        risk,

        riskScore:
          risk100(risk),

        reason:
          item.riskReason ||
          item.reason ||
          '运输中断、物流受阻或运输周期延长'
      })
    }
  )


  chokepoints.value.forEach(
    item => {

      const risk =
        normalizeRisk(
          item.riskScore
        )

      result.push({

        name:
          item.name,

        type:
          '关键通道',

        risk,

        riskScore:
          risk100(risk),

        reason:
          item.riskReason ||
          item.reason ||
          '通道拥堵、中断或替代运输路径受限'
      })
    }
  )


  storageNodes.value.forEach(
    item => {

      const risk =
        normalizeRisk(
          item.riskScore
        )

      result.push({

        name:
          item.name,

        type:
          item.type === 'port'
            ? '接收港'
            : '仓储节点',

        risk,

        riskScore:
          risk100(risk),

        reason:
          item.riskReason ||
          item.reason ||
          '接收能力、库存能力或物流衔接存在风险'
      })
    }
  )


  return result.sort(
    (a, b) =>
      b.riskScore -
      a.riskScore
  )
})


const topRiskNodes = computed(() =>
  allRiskNodes.value.slice(
    0,
    8
  )
)


const highRiskCount = computed(() =>
  allRiskNodes.value.filter(
    item =>
      item.riskScore >= 60
  ).length
)


const criticalRiskCount = computed(() =>
  allRiskNodes.value.filter(
    item =>
      item.riskScore >= 80
  ).length
)


/* ============================================================
   Events
============================================================ */

const visibleEvents = computed(() => {

  if (
    !events.value.length
  ) {
    return []
  }

  if (
    !currentYear.value
  ) {
    return events.value.slice(
      0,
      10
    )
  }

  const result =
    events.value.filter(
      item =>
        String(
          item.time || ''
        ).startsWith(
          String(
            currentYear.value
          )
        )
    )

  return result.length
    ? result.slice(
        0,
        10
      )
    : events.value.slice(
        0,
        10
      )
})


function eventRisk(event) {

  if (
    event.riskScore != null
  ) {
    return normalizeRisk(
      event.riskScore
    )
  }

  if (
    event.level === '极高'
  ) {
    return 0.9
  }

  if (
    event.level === '高'
  ) {
    return 0.7
  }

  if (
    event.level === '中'
  ) {
    return 0.5
  }

  return 0.25
}


function formatEventDate(value) {

  if (!value) {
    return '--'
  }

  return String(value).slice(
    0,
    10
  )
}


/* ============================================================
   Selected route
============================================================ */

const selectedRoute = computed(() =>
  routes.value[
    selectedRouteIndex.value
  ] || null
)


watch(
  routes,
  () => {

    if (
      selectedRouteIndex.value >=
      routes.value.length
    ) {
      selectedRouteIndex.value = 0
    }
  },
  {
    deep: true
  }
)


const selectedChainNodes = computed(() => {

  const route =
    selectedRoute.value

  if (!route) {
    return []
  }

  if (
    Array.isArray(
      route.nodes
    ) &&
    route.nodes.length
  ) {
    return route.nodes
  }


  const result = []


  if (
    route.from
  ) {

    const supplier =
      supplierShares.value.find(
        item =>
          item.country ===
          route.from
      )

    result.push({

      name:
        route.from,

      type:
        'supplier',

      riskScore:
        supplier
          ? supplierRisk(
              supplier
            )
          : route.riskScore
    })
  }


  chokepoints.value.forEach(
    item => {

      result.push({

        ...item,

        type:
          item.type ||
          'chokepoint'
      })
    }
  )


  result.push({

    name:
      '中国接收中心',

    type:
      'china',

    riskScore:
      0.25
  })


  return result
})


function routeNodeIcon(node) {

  const type =
    String(
      node.type || ''
    ).toLowerCase()

  if (
    type.includes('mine') ||
    type.includes('矿')
  ) {
    return '◆'
  }

  if (
    type.includes('rail') ||
    type.includes('铁路')
  ) {
    return '▣'
  }

  if (
    type.includes('road') ||
    type.includes('公路')
  ) {
    return '▦'
  }

  if (
    type.includes('port') ||
    type.includes('港')
  ) {
    return '⚓'
  }

  if (
    type.includes('storage') ||
    type.includes('仓')
  ) {
    return '▤'
  }

  if (
    type.includes('choke') ||
    type.includes('海峡') ||
    type.includes('运河') ||
    type.includes('通道')
  ) {
    return '●'
  }

  if (
    type.includes('china') ||
    node.name?.includes('中国')
  ) {
    return '★'
  }

  return '●'
}


/* ============================================================
   China destination
============================================================ */

/*
 * 统一对华供应线路最终汇聚坐标。
 *
 * 用东部接收 / 需求中心，而不是几何中心，
 * 海运线路视觉效果更自然。
 */
const CHINA_DEMAND_CENTER = [
  116.5,
  31.5
]


/* ============================================================
   Route coordinates
============================================================ */

function correctRouteCoords(route) {

  let coords =
    Array.isArray(
      route.waypoints
    )
      ? route.waypoints
          .filter(
            point =>
              Array.isArray(
                point
              ) &&
              point.length >= 2
          )
          .map(
            point => [
              Number(
                point[0]
              ),
              Number(
                point[1]
              )
            ]
          )
      : []


  /*
   * waypoints 为空时，
   * 自动尝试供应国坐标。
   */
  if (
    !coords.length
  ) {

    const supplier =
      supplierShares.value.find(
        item =>
          item.country ===
          route.from
      )

    if (
      supplier &&
      Number.isFinite(
        Number(
          supplier.lng
        )
      ) &&
      Number.isFinite(
        Number(
          supplier.lat
        )
      )
    ) {

      coords.push([
        Number(
          supplier.lng
        ),
        Number(
          supplier.lat
        )
      ])
    }
  }


  if (
    !coords.length
  ) {
    return []
  }


  const last =
    coords[
      coords.length - 1
    ]


  const distance =
    Math.sqrt(

      Math.pow(
        last[0] -
        CHINA_DEMAND_CENTER[0],
        2
      ) +

      Math.pow(
        last[1] -
        CHINA_DEMAND_CENTER[1],
        2
      )
    )


  /*
   * 无论后台传什么，
   * 最后一段统一真正连到中国。
   */
  if (
    distance > 2
  ) {

    coords.push(
      [
        ...CHINA_DEMAND_CENTER
      ]
    )
  }
  else {

    coords[
      coords.length - 1
    ] = [
      ...CHINA_DEMAND_CENTER
    ]
  }


  return coords
}


/* ============================================================
   Map series
============================================================ */

function buildMapSeries() {

  const series = []


  /* ========================================================
     1. 国际运输线路
  ======================================================== */

  const lineData = []


  routes.value.forEach(
    route => {

      const coords =
        correctRouteCoords(
          route
        )


      if (
        coords.length < 2
      ) {
        return
      }


      const risk =
        normalizeRisk(
          route.riskScore
        )


      lineData.push({

        name:
          route.name ||
          `${route.from || ''} → 中国`,

        coords,

        riskScore:
          risk,

        mode:
          route.mode ||
          '综合运输',

        riskReason:
          route.riskReason ||
          route.reason ||
          '',

        lineStyle: {

          color:
            riskColor(risk),

          width:
            risk >= 0.8
              ? 4.5
              : risk >= 0.6
                ? 3.6
                : risk >= 0.4
                  ? 2.6
                  : 1.8,

          opacity:
            risk >= 0.6
              ? 0.95
              : 0.75,

          type:
            route.backup
              ? 'dashed'
              : 'solid'
        },

        effect: {
          color:
            riskColor(risk)
        }
      })
    }
  )


  if (
    lineData.length
  ) {

    series.push({

      name:
        '全球铀运输线路',

      type:
        'lines',

      coordinateSystem:
        'geo',

      polyline:
        true,

      zlevel:
        2,

      effect: {

        show:
          true,

        constantSpeed:
          26,

        trailLength:
          0.07,

        symbol:
          'arrow',

        symbolSize:
          7
      },

      lineStyle: {

        opacity:
          0.82
      },

      data:
        lineData
    })
  }


  /* ========================================================
     2. 供应国
  ======================================================== */

  const supplierData =
    supplierShares.value
      .filter(
        item =>
          Number.isFinite(
            Number(
              item.lng
            )
          ) &&
          Number.isFinite(
            Number(
              item.lat
            )
          )
      )
      .map(
        item => {

          const risk =
            supplierRisk(
              item
            )

          return {

            name:
              item.country,

            supplier:
              item,

            riskScore:
              risk,

            value: [
              Number(
                item.lng
              ),
              Number(
                item.lat
              ),
              Number(
                item.sharePct
              ) || 0
            ],

            symbolSize:
              Math.max(
                12,
                Math.min(
                  25,
                  12 +
                  Number(
                    item.sharePct || 0
                  ) *
                  0.22
                )
              ),

            itemStyle: {

              color:
                riskColor(
                  risk
                ),

              borderColor:
                '#ffffff',

              borderWidth:
                2,

              shadowBlur:
                risk >= 0.6
                  ? 14
                  : 5,

              shadowColor:
                riskColor(
                  risk
                )
            }
          }
        }
      )


  if (
    supplierData.length
  ) {

    series.push({

      name:
        '供应国',

      type:
        'effectScatter',

      coordinateSystem:
        'geo',

      zlevel:
        5,

      rippleEffect: {

        brushType:
          'stroke',

        scale:
          2.6
      },

      label: {

        show:
          true,

        position:
          'top',

        distance:
          7,

        formatter(params) {

          const item =
            params.data.supplier

          return (
            `{country|${item.country}}\n` +
            `{share|供应 ${Number(item.sharePct || 0).toFixed(1)}%} ` +
            `{risk|风险 ${risk100(params.data.riskScore)}}`
          )
        },

        rich: {

          country: {

            color:
              '#1e293b',

            fontSize:
              11,

            fontWeight:
              700,

            lineHeight:
              17,

            backgroundColor:
              'rgba(255,255,255,.91)',

            borderColor:
              '#dbe4ec',

            borderWidth:
              1,

            padding:
              [2, 4],

            borderRadius:
              3
          },

          share: {

            color:
              '#475569',

            fontSize:
              9,

            lineHeight:
              16
          },

          risk: {

            color:
              '#b91c1c',

            fontSize:
              9,

            fontWeight:
              700,

            lineHeight:
              16
          }
        }
      },

      data:
        supplierData
    })
  }


  /* ========================================================
     3. 关键海峡 / 运河
  ======================================================== */

  const chokepointData =
    chokepoints.value
      .filter(
        item =>
          Number.isFinite(
            Number(
              item.lng
            )
          ) &&
          Number.isFinite(
            Number(
              item.lat
            )
          )
      )
      .map(
        item => {

          const risk =
            normalizeRisk(
              item.riskScore
            )

          return {

            name:
              item.name,

            raw:
              item,

            riskScore:
              risk,

            value: [
              Number(
                item.lng
              ),
              Number(
                item.lat
              ),
              risk100(
                risk
              )
            ],

            symbolSize:
              risk >= 0.8
                ? 31
                : risk >= 0.6
                  ? 27
                  : risk >= 0.4
                    ? 22
                    : 18,

            itemStyle: {

              color:
                riskColor(
                  risk
                ),

              shadowBlur:
                risk >= 0.6
                  ? 16
                  : 5,

              shadowColor:
                riskColor(
                  risk
                )
            }
          }
        }
      )


  if (
    chokepointData.length
  ) {

    series.push({

      name:
        '关键咽喉',

      type:
        'effectScatter',

      coordinateSystem:
        'geo',

      zlevel:
        8,

      symbol:
        'pin',

      rippleEffect: {

        brushType:
          'stroke',

        scale:
          3
      },

      label: {

        show:
          true,

        position:
          'right',

        distance:
          7,

        formatter(params) {

          return (
            `{name|${params.name}}\n` +
            `{risk|风险 ${risk100(params.data.riskScore)} · ${riskLevelShort(params.data.riskScore)}}`
          )
        },

        rich: {

          name: {

            color:
              '#1e293b',

            fontSize:
              10,

            fontWeight:
              700,

            backgroundColor:
              'rgba(255,255,255,.92)',

            borderColor:
              '#dbe4ec',

            borderWidth:
              1,

            padding:
              [2, 4],

            borderRadius:
              3
          },

          risk: {

            color:
              '#b91c1c',

            fontSize:
              9,

            lineHeight:
              16
          }
        }
      },

      data:
        chokepointData
    })
  }


  /* ========================================================
     4. 国内港口 / 仓储
  ======================================================== */

  const storageData =
    storageNodes.value
      .filter(
        item =>
          Number.isFinite(
            Number(
              item.lng
            )
          ) &&
          Number.isFinite(
            Number(
              item.lat
            )
          )
      )
      .map(
        item => {

          const risk =
            normalizeRisk(
              item.riskScore
            )

          return {

            name:
              item.name,

            raw:
              item,

            riskScore:
              risk,

            value: [
              Number(
                item.lng
              ),
              Number(
                item.lat
              ),
              risk100(
                risk
              )
            ],

            itemStyle: {

              color:
                riskColor(
                  risk
                ),

              borderColor:
                '#ffffff',

              borderWidth:
                2,

              shadowBlur:
                risk >= 0.6
                  ? 11
                  : 4,

              shadowColor:
                riskColor(
                  risk
                )
            }
          }
        }
      )


  if (
    storageData.length
  ) {

    series.push({

      name:
        '港口/仓储',

      type:
        'scatter',

      coordinateSystem:
        'geo',

      zlevel:
        9,

      symbol:
        'diamond',

      symbolSize:
        16,

      label: {

        show:
          true,

        position:
          'right',

        distance:
          7,

        formatter(params) {

          return (
            `{name|${params.name}}\n` +
            `{risk|风险 ${risk100(params.data.riskScore)}}`
          )
        },

        rich: {

          name: {

            color:
              '#334155',

            fontSize:
              10,

            fontWeight:
              700,

            backgroundColor:
              'rgba(255,255,255,.92)',

            borderColor:
              '#dbe4ec',

            borderWidth:
              1,

            padding:
              [2, 4],

            borderRadius:
              3
          },

          risk: {

            color:
              '#b91c1c',

            fontSize:
              9,

            lineHeight:
              16
          }
        }
      },

      data:
        storageData
    })
  }


  /* ========================================================
     5. 中国接收中心
  ======================================================== */

  series.push({

    name:
      '中国接收中心',

    type:
      'effectScatter',

    coordinateSystem:
      'geo',

    zlevel:
      15,

    symbol:
      'diamond',

    symbolSize:
      28,

    rippleEffect: {

      scale:
        3.5,

      brushType:
        'stroke'
    },

    label: {

      show:
        true,

      position:
        'top',

      distance:
        9,

      formatter:
        '{china|中国}\n{desc|铀供应接收汇聚中心}',

      rich: {

        china: {

          color:
            '#b91c1c',

          fontSize:
            13,

          fontWeight:
            800
        },

        desc: {

          color:
            '#64748b',

          fontSize:
            9
        }
      }
    },

    data: [

      {

        name:
          '中国',

        value: [
          CHINA_DEMAND_CENTER[0],
          CHINA_DEMAND_CENTER[1],
          100
        ],

        itemStyle: {

          color:
            '#facc15',

          borderColor:
            '#ffffff',

          borderWidth:
            2,

          shadowBlur:
            16,

          shadowColor:
            '#f59e0b'
        }
      }
    ]
  })


  /* ========================================================
     6. 极高风险预警圈
  ======================================================== */

  const criticalNodes = []


  supplierShares.value.forEach(
    item => {

      if (
        supplierRisk(
          item
        ) >= 0.8 &&
        Number.isFinite(
          Number(
            item.lng
          )
        ) &&
        Number.isFinite(
          Number(
            item.lat
          )
        )
      ) {

        criticalNodes.push({

          name:
            item.country,

          value: [
            Number(
              item.lng
            ),
            Number(
              item.lat
            ),
            risk100(
              supplierRisk(
                item
              )
            )
          ]
        })
      }
    }
  )


  chokepoints.value.forEach(
    item => {

      if (
        normalizeRisk(
          item.riskScore
        ) >= 0.8 &&
        Number.isFinite(
          Number(
            item.lng
          )
        ) &&
        Number.isFinite(
          Number(
            item.lat
          )
        )
      ) {

        criticalNodes.push({

          name:
            item.name,

          value: [
            Number(
              item.lng
            ),
            Number(
              item.lat
            ),
            risk100(
              item.riskScore
            )
          ]
        })
      }
    }
  )


  storageNodes.value.forEach(
    item => {

      if (
        normalizeRisk(
          item.riskScore
        ) >= 0.8 &&
        Number.isFinite(
          Number(
            item.lng
          )
        ) &&
        Number.isFinite(
          Number(
            item.lat
          )
        )
      ) {

        criticalNodes.push({

          name:
            item.name,

          value: [
            Number(
              item.lng
            ),
            Number(
              item.lat
            ),
            risk100(
              item.riskScore
            )
          ]
        })
      }
    }
  )


  if (
    criticalNodes.length
  ) {

    series.push({

      name:
        '极高风险预警',

      type:
        'effectScatter',

      coordinateSystem:
        'geo',

      zlevel:
        4,

      symbol:
        'circle',

      symbolSize:
        38,

      rippleEffect: {

        period:
          2,

        scale:
          4,

        brushType:
          'stroke'
      },

      itemStyle: {

        color:
          'rgba(220,38,38,.18)'
      },

      label: {
        show:
          false
      },

      data:
        criticalNodes
    })
  }


  return series
}


/* ============================================================
   Map option
============================================================ */

function buildMapOption() {

  return {

    backgroundColor:
      '#eef5fa',

    animation:
      true,

    tooltip: {

      trigger:
        'item',

      confine:
        true,

      backgroundColor:
        'rgba(255,255,255,.98)',

      borderColor:
        '#cbd5e1',

      borderWidth:
        1,

      padding:
        10,

      textStyle: {

        color:
          '#334155',

        fontSize:
          12
      },

      extraCssText:
        'box-shadow:0 8px 26px rgba(15,23,42,.14);border-radius:8px;',

      formatter(params) {


        /* 线路 */
        if (
          params.seriesName ===
          '全球铀运输线路'
        ) {

          const data =
            params.data ||
            {}

          return `
            <div style="
              font-size:14px;
              font-weight:700;
              margin-bottom:7px;
            ">
              ${data.name || ''}
            </div>

            <div>
              运输方式：
              <b>${data.mode || '--'}</b>
            </div>

            <div>
              风险指数：
              <b style="
                color:${riskColor(data.riskScore)}
              ">
                ${risk100(data.riskScore)}
              </b>
            </div>

            <div>
              风险等级：
              <b style="
                color:${riskColor(data.riskScore)}
              ">
                ${riskLabel(data.riskScore)}
              </b>
            </div>

            ${
              data.riskReason
                ? `
                  <div style="
                    margin-top:6px;
                    max-width:280px;
                    color:#64748b;
                    line-height:1.5;
                  ">
                    风险原因：
                    ${data.riskReason}
                  </div>
                `
                : ''
            }
          `
        }


        /* 供应国 */
        if (
          params.seriesName ===
          '供应国'
        ) {

          const data =
            params.data.supplier ||
            {}

          const risk =
            supplierRisk(
              data
            )

          return `
            <div style="
              font-size:14px;
              font-weight:700;
              margin-bottom:7px;
            ">
              ${data.country || ''}
            </div>

            <div>
              对华供应占比：
              <b>
                ${Number(data.sharePct || 0).toFixed(1)}%
              </b>
            </div>

            ${
              data.annualImport != null
                ? `
                  <div>
                    供应量：
                    ${formatNumber(data.annualImport)} tU
                  </div>
                `
                : ''
            }

            <div>
              政策风险：
              ${risk100(data.policyRisk)}
            </div>

            <div>
              地缘风险：
              ${risk100(data.geopoliticalRisk)}
            </div>

            <div>
              运输风险：
              ${risk100(data.transportRisk)}
            </div>

            <div>
              供应风险：
              ${risk100(data.supplyRisk)}
            </div>

            <div style="
              margin-top:5px;
            ">
              综合风险：
              <b style="
                color:${riskColor(risk)}
              ">
                ${risk100(risk)}
                ·
                ${riskLabel(risk)}
              </b>
            </div>

            ${
              data.riskReason
                ? `
                  <div style="
                    margin-top:6px;
                    max-width:280px;
                    color:#64748b;
                    line-height:1.5;
                  ">
                    ${data.riskReason}
                  </div>
                `
                : ''
            }
          `
        }


        /* 咽喉 */
        if (
          params.seriesName ===
          '关键咽喉'
        ) {

          const data =
            params.data.raw ||
            {}

          return `
            <div style="
              font-size:14px;
              font-weight:700;
              margin-bottom:6px;
            ">
              ${data.name || ''}
            </div>

            <div>
              风险指数：
              <b style="
                color:${riskColor(data.riskScore)}
              ">
                ${risk100(data.riskScore)}
              </b>
            </div>

            <div>
              风险等级：
              <b style="
                color:${riskColor(data.riskScore)}
              ">
                ${riskLabel(data.riskScore)}
              </b>
            </div>

            ${
              data.reason ||
              data.riskReason
                ? `
                  <div style="
                    margin-top:6px;
                    max-width:280px;
                    color:#64748b;
                    line-height:1.5;
                  ">
                    ${
                      data.riskReason ||
                      data.reason
                    }
                  </div>
                `
                : ''
            }
          `
        }


        /* 仓储 */
        if (
          params.seriesName ===
          '港口/仓储'
        ) {

          const data =
            params.data.raw ||
            {}

          return `
            <div style="
              font-size:14px;
              font-weight:700;
              margin-bottom:6px;
            ">
              ${data.name || ''}
            </div>

            <div>
              类型：
              ${data.type || '港口/仓储'}
            </div>

            <div>
              风险指数：
              <b style="
                color:${riskColor(data.riskScore)}
              ">
                ${risk100(data.riskScore)}
              </b>
            </div>

            ${
              data.capacity != null
                ? `
                  <div>
                    库容：
                    ${formatNumber(data.capacity)} tU
                  </div>
                `
                : ''
            }

            ${
              data.reason ||
              data.riskReason
                ? `
                  <div style="
                    margin-top:6px;
                    max-width:280px;
                    color:#64748b;
                    line-height:1.5;
                  ">
                    ${
                      data.riskReason ||
                      data.reason
                    }
                  </div>
                `
                : ''
            }
          `
        }


        return params.name ||
          ''
      }
    },


    geo: {

      map:
        'world',

      roam:
        true,

      zoom:
        1.08,

      center:
        [
          66,
          23
        ],

      left:
        0,

      right:
        0,

      top:
        0,

      bottom:
        0,

      label: {
        show:
          false
      },

      itemStyle: {

        areaColor:
          '#e0eaf2',

        borderColor:
          '#acbdcb',

        borderWidth:
          0.65,

        shadowColor:
          'rgba(100,116,139,.08)',

        shadowBlur:
          2
      },

      emphasis: {

        itemStyle: {

          areaColor:
            '#ccdce8'
        },

        label: {
          show:
            false
        }
      },

      regions: [

        {

          name:
            'China',

          itemStyle: {

            areaColor:
              '#f5b5b5',

            borderColor:
              '#dc2626',

            borderWidth:
              1.5
          }
        }
      ]
    },


    series:
      buildMapSeries()
  }
}


/* ============================================================
   Donut
============================================================ */

function renderDonut() {

  if (
    !donutRef.value
  ) {
    return
  }

  if (
    !donutChart
  ) {

    donutChart =
      echarts.init(
        donutRef.value
      )
  }


  donutChart.setOption(
    {

      tooltip: {

        trigger:
          'item',

        formatter:
          '{b}<br/>{c}%'
      },

      series: [

        {

          type:
            'pie',

          radius:
            [
              '57%',
              '79%'
            ],

          center:
            [
              '50%',
              '50%'
            ],

          label: {
            show:
              false
          },

          emphasis: {

            scale:
              true,

            scaleSize:
              5
          },

          data: [

            {

              name:
                '独立自主',

              value:
                selfPct.value,

              itemStyle: {

                color:
                  '#16a34a'
              }
            },

            {

              name:
                '海外依存',

              value:
                overseasPct.value,

              itemStyle: {

                color:
                  '#f59e0b'
              }
            }
          ]
        }
      ]
    },
    true
  )
}


/* ============================================================
   Radar
============================================================ */

function renderRadar() {

  if (
    !radarRef.value
  ) {
    return
  }

  if (
    !radarChart
  ) {

    radarChart =
      echarts.init(
        radarRef.value
      )
  }


  radarChart.setOption(
    {

      radar: {

        center:
          [
            '50%',
            '53%'
          ],

        radius:
          '60%',

        splitNumber:
          4,

        indicator: [

          {
            name:
              '政策',
            max:
              100
          },

          {
            name:
              '地缘',
            max:
              100
          },

          {
            name:
              '运输',
            max:
              100
          },

          {
            name:
              '关键通道',
            max:
              100
          },

          {
            name:
              '接收仓储',
            max:
              100
          }
        ],

        axisName: {

          color:
            '#64748b',

          fontSize:
            10
        },

        splitArea: {

          areaStyle: {

            color: [

              'rgba(248,250,252,.7)',

              'rgba(241,245,249,.6)'
            ]
          }
        },

        splitLine: {

          lineStyle: {

            color:
              '#cbd5e1'
          }
        },

        axisLine: {

          lineStyle: {

            color:
              '#d5dee7'
          }
        }
      },


      series: [

        {

          type:
            'radar',

          data: [

            {

              value:
                radarValues.value,

              areaStyle: {

                color:
                  'rgba(239,68,68,.20)'
              },

              lineStyle: {

                color:
                  '#ef4444',

                width:
                  2
              },

              itemStyle: {

                color:
                  '#ef4444'
              },

              symbolSize:
                4
            }
          ]
        }
      ]
    },
    true
  )
}


/* ============================================================
   Render map
============================================================ */

async function renderMap() {

  if (
    !mapRef.value
  ) {
    return
  }

  try {

    await ensureEchartsWorldMap(
      echarts
    )


    if (
      !mapChart
    ) {

      mapChart =
        echarts.init(
          mapRef.value
        )
    }


    mapChart.setOption(
      buildMapOption(),
      true
    )
  }
  catch (error) {

    console.warn(
      'Uranium map render error:',
      error
    )
  }
}


/* ============================================================
   Render all
============================================================ */

async function renderAll() {

  await nextTick()

  await renderMap()

  renderDonut()

  renderRadar()
}


/* ============================================================
   Play
============================================================ */

function togglePlay() {

  if (
    playing.value
  ) {

    stopPlay()
  }
  else {

    startPlay()
  }
}


function startPlay() {

  if (
    !years.value.length
  ) {
    return
  }


  playing.value =
    true


  if (
    yearIdx.value >=
    maxIdx.value
  ) {

    yearIdx.value =
      0
  }


  playTimer =
    window.setInterval(
      () => {

        if (
          yearIdx.value <
          maxIdx.value
        ) {

          yearIdx.value +=
            1

          renderAll()
        }
        else {

          stopPlay()
        }
      },
      1200
    )
}


function stopPlay() {

  playing.value =
    false


  if (
    playTimer
  ) {

    clearInterval(
      playTimer
    )

    playTimer =
      null
  }
}


/* ============================================================
   Format
============================================================ */

function formatNumber(value) {

  return (
    Number(value) || 0
  ).toLocaleString(
    'zh-CN'
  )
}


/* ============================================================
   Verification
============================================================ */

const scoreColor = computed(() => {

  const score =
    Number(
      props.verificationSummary.score
    ) || 0

  if (
    score >= 80
  ) {
    return '#16a34a'
  }

  if (
    score >= 60
  ) {
    return '#f59e0b'
  }

  return '#dc2626'
})


const levelTag = computed(() => {

  const score =
    Number(
      props.verificationSummary.score
    ) || 0

  if (
    score >= 80
  ) {
    return 'success'
  }

  if (
    score >= 60
  ) {
    return 'warning'
  }

  return 'danger'
})


/* ============================================================
   Watch
============================================================ */

watch(
  () =>
    props.situationMap,
  () => {

    nextTick(
      renderAll
    )
  },
  {
    deep:
      true
  }
)


watch(
  () =>
    props.mapEvolution,
  () => {

    yearIdx.value =
      0

    stopPlay()

    nextTick(
      renderAll
    )
  },
  {
    deep:
      true
  }
)


watch(
  () =>
    props.scenario,
  () => {

    nextTick(
      renderAll
    )
  }
)


/* ============================================================
   Resize
============================================================ */

function resizeCharts() {

  mapChart?.resize()

  donutChart?.resize()

  radarChart?.resize()
}


/* ============================================================
   Lifecycle
============================================================ */

onMounted(() => {

  nextTick(
    renderAll
  )


  window.addEventListener(
    'resize',
    resizeCharts
  )


  if (
    typeof ResizeObserver !==
    'undefined'
  ) {

    resizeObserver =
      new ResizeObserver(
        resizeCharts
      )

    if (
      mapRef.value
    ) {

      resizeObserver.observe(
        mapRef.value
      )
    }
  }
})


onBeforeUnmount(() => {

  stopPlay()


  window.removeEventListener(
    'resize',
    resizeCharts
  )


  resizeObserver?.disconnect()


  mapChart?.dispose()

  donutChart?.dispose()

  radarChart?.dispose()


  mapChart =
    null

  donutChart =
    null

  radarChart =
    null
})
</script>


<style scoped>

/* ============================================================
   Root
============================================================ */

.uranium-page {
  --page-bg: #eef5fa;
  --card-bg: #ffffff;
  --border: #d8e4ed;

  --text: #1e293b;
  --text2: #475569;
  --muted: #94a3b8;

  --blue: #0284c7;
  --green: #16a34a;
  --yellow: #eab308;
  --orange: #f97316;
  --red: #dc2626;

  width: 100%;

  min-width: 1180px;

  box-sizing: border-box;

  padding: 12px;

  color: var(--text);

  background:
    linear-gradient(
      180deg,
      #f8fbfd 0%,
      #edf5fa 100%
    );

  font-family:
    Inter,
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;
}


/* ============================================================
   Header
============================================================ */

.page-header {
  height: 62px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  box-sizing: border-box;

  padding:
    0 8px;

  border-bottom:
    1px solid #dbe7ef;
}


.title-row {
  display: flex;

  align-items: center;

  gap: 10px;
}


.title-row h1 {
  margin: 0;

  color: #15324a;

  font-size: 25px;

  font-weight: 800;

  letter-spacing: 1px;
}


.china-badge {
  padding:
    3px 8px;

  border-radius:
    4px;

  color:
    #fff;

  background:
    #dc2626;

  font-size:
    11px;

  font-weight:
    700;
}


.subtitle {
  margin-top:
    3px;

  color:
    #94a3b8;

  font-size:
    10px;

  letter-spacing:
    1px;
}


.header-right {
  text-align:
    right;
}


.update-label {
  color:
    #94a3b8;

  font-size:
    9px;
}


.update-time {
  margin-top:
    3px;

  color:
    #475569;

  font-size:
    11px;
}


/* ============================================================
   Shared cards
============================================================ */

.card,
.map-card,
.risk-ranking-panel,
.chain-card,
.bottom-card {
  box-sizing:
    border-box;

  background:
    #ffffff;

  border:
    1px solid var(--border);

  border-radius:
    8px;

  box-shadow:
    0 4px 15px
    rgba(15, 23, 42, .045);
}


.card-title,
.panel-title {
  height:
    34px;

  display:
    flex;

  align-items:
    center;

  box-sizing:
    border-box;

  padding:
    0 12px;

  color:
    #334155;

  border-bottom:
    1px solid #edf2f7;

  font-size:
    12px;

  font-weight:
    700;
}


.panel-title span {
  margin-left:
    6px;

  color:
    #94a3b8;

  font-size:
    8px;

  font-weight:
    400;
}


.danger-title {
  color:
    #b91c1c;
}


.red-text {
  color:
    #dc2626 !important;
}


/* ============================================================
   Top dashboard
============================================================ */

.top-dashboard {
  height:
    150px;

  display:
    grid;

  grid-template-columns:
    1fr
    1.35fr
    1.35fr
    1fr
    1.1fr;

  gap:
    7px;

  margin-top:
    7px;
}


/* demand */

.metric-list {
  padding:
    7px 12px;
}


.metric-item {
  height:
    23px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  color:
    #64748b;

  font-size:
    10px;
}


.metric-item b {
  color:
    #334155;

  font-size:
    11px;
}


.metric-main {
  color:
    #0284c7 !important;
}


.metric-green {
  color:
    #16a34a !important;
}


.metric-orange {
  color:
    #f59e0b !important;
}


/* structure */

.structure-main {
  height:
    calc(100% - 34px);

  display:
    flex;

  align-items:
    center;
}


.donut-chart {
  width:
    55%;

  height:
    100%;
}


.structure-info {
  flex:
    1;
}


.structure-line {
  display:
    flex;

  align-items:
    center;

  gap:
    7px;

  margin:
    8px 0;
}


.structure-dot {
  width:
    8px;

  height:
    8px;

  flex-shrink:
    0;

  border-radius:
    50%;
}


.structure-dot.domestic {
  background:
    #16a34a;
}


.structure-dot.overseas {
  background:
    #f59e0b;
}


.structure-line div {
  display:
    flex;

  flex-direction:
    column;
}


.structure-line div span {
  color:
    #64748b;

  font-size:
    9px;
}


.structure-line strong {
  margin-top:
    2px;

  font-size:
    16px;
}


/* supplier shares */

.mini-share-list {
  padding:
    6px 10px;
}


.mini-share-item {
  min-height:
    15px;

  display:
    grid;

  grid-template-columns:
    72px
    1fr
    37px;

  align-items:
    center;

  gap:
    6px;
}


.mini-share-country {
  min-width:
    0;

  display:
    flex;

  align-items:
    center;

  gap:
    5px;

  color:
    #475569;

  font-size:
    9px;
}


.mini-share-country span {
  overflow:
    hidden;

  white-space:
    nowrap;

  text-overflow:
    ellipsis;
}


.mini-dot {
  width:
    6px;

  height:
    6px;

  flex-shrink:
    0;

  border-radius:
    50%;
}


.mini-share-track {
  height:
    5px;

  overflow:
    hidden;

  border-radius:
    4px;

  background:
    #edf2f7;
}


.mini-share-fill {
  height:
    100%;

  border-radius:
    4px;

  background:
    linear-gradient(
      90deg,
      #38bdf8,
      #0284c7
    );
}


.mini-share-item b {
  color:
    #334155;

  text-align:
    right;

  font-size:
    9px;
}


.empty-small {
  padding:
    15px;

  color:
    #94a3b8;

  text-align:
    center;

  font-size:
    9px;
}


/* total risk */

.total-risk-body {
  height:
    67px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  gap:
    3px;
}


.total-risk-score {
  font-size:
    40px;

  font-weight:
    800;
}


.total-risk-unit {
  margin-top:
    14px;

  color:
    #94a3b8;

  font-size:
    11px;
}


.total-risk-label {
  margin-left:
    8px;

  font-size:
    11px;

  font-weight:
    700;
}


.risk-scale {
  height:
    5px;

  display:
    flex;

  margin:
    0 12px;

  overflow:
    hidden;

  border-radius:
    4px;
}


.risk-scale > div {
  flex:
    1;
}


.scale-green {
  background:
    #16a34a;
}


.scale-yellow {
  background:
    #eab308;
}


.scale-orange {
  background:
    #f97316;
}


.scale-red {
  background:
    #dc2626;
}


.risk-scale-labels {
  display:
    flex;

  justify-content:
    space-between;

  margin:
    4px 12px;

  color:
    #94a3b8;

  font-size:
    8px;
}


.radar-chart {
  height:
    calc(100% - 34px);
}


/* ============================================================
   Main
============================================================ */

.main-dashboard {
  height:
    500px;

  display:
    grid;

  grid-template-columns:
    minmax(760px, 1fr)
    295px;

  gap:
    7px;

  margin-top:
    7px;
}


/* ============================================================
   Map
============================================================ */

.map-card {
  position:
    relative;

  overflow:
    hidden;

  background:
    #eef5fa;
}


.world-map {
  position:
    absolute;

  inset:
    0;
}


.map-risk-legend {
  position:
    absolute;

  z-index:
    30;

  left:
    12px;

  top:
    12px;

  width:
    132px;

  box-sizing:
    border-box;

  padding:
    8px 10px;

  border:
    1px solid #d7e2ea;

  border-radius:
    7px;

  background:
    rgba(255, 255, 255, .95);

  box-shadow:
    0 4px 15px
    rgba(15, 23, 42, .08);

  pointer-events:
    none;
}


.map-risk-title {
  margin-bottom:
    5px;

  color:
    #334155;

  font-size:
    10px;

  font-weight:
    700;
}


.map-risk-legend > div:not(:first-child) {
  height:
    20px;

  display:
    grid;

  grid-template-columns:
    8px
    1fr
    auto;

  align-items:
    center;

  gap:
    5px;

  color:
    #64748b;

  font-size:
    8px;
}


.map-risk-legend b {
  color:
    #94a3b8;

  font-size:
    7px;
}


.risk-dot {
  width:
    7px;

  height:
    7px;

  border-radius:
    50%;
}


.risk-critical {
  background:
    #dc2626;
}


.risk-high {
  background:
    #f97316;
}


.risk-medium {
  background:
    #eab308;
}


.risk-low {
  background:
    #16a34a;
}


/* route legend */

.route-legend {
  position:
    absolute;

  z-index:
    30;

  left:
    158px;

  top:
    12px;

  display:
    flex;

  gap:
    13px;

  padding:
    7px 10px;

  border:
    1px solid #d7e2ea;

  border-radius:
    7px;

  background:
    rgba(255,255,255,.95);

  box-shadow:
    0 4px 15px
    rgba(15,23,42,.06);

  pointer-events:
    none;
}


.route-legend-item {
  display:
    flex;

  align-items:
    center;

  gap:
    5px;

  color:
    #64748b;

  font-size:
    8px;
}


.route-line {
  width:
    20px;

  height:
    3px;

  display:
    inline-block;

  border-radius:
    2px;
}


.route-red {
  background:
    #dc2626;
}


.route-orange {
  background:
    #f97316;
}


.route-green {
  background:
    #16a34a;
}


/* bottom node legend */

.map-node-legend {
  position:
    absolute;

  z-index:
    30;

  left:
    50%;

  bottom:
    11px;

  transform:
    translateX(-50%);

  display:
    flex;

  gap:
    19px;

  padding:
    6px 13px;

  border:
    1px solid #d8e3eb;

  border-radius:
    6px;

  background:
    rgba(255,255,255,.95);

  box-shadow:
    0 3px 12px
    rgba(15,23,42,.07);

  color:
    #64748b;

  font-size:
    8px;

  white-space:
    nowrap;

  pointer-events:
    none;
}


.map-node-legend span {
  display:
    flex;

  align-items:
    center;

  gap:
    5px;
}


.legend-symbol {
  width:
    8px;

  height:
    8px;

  display:
    inline-block;
}


.supplier-symbol {
  border-radius:
    50%;

  background:
    #16a34a;
}


.chokepoint-symbol {
  transform:
    rotate(45deg);

  background:
    #dc2626;
}


.storage-symbol {
  background:
    #0284c7;
}


.china-symbol {
  transform:
    rotate(45deg);

  background:
    #facc15;
}


/* ============================================================
   Risk ranking
============================================================ */

.risk-ranking-panel {
  overflow:
    hidden;
}


.risk-summary {
  height:
    50px;

  display:
    grid;

  grid-template-columns:
    1fr 1fr;

  border-bottom:
    1px solid #edf2f7;

  background:
    #fafcfd;
}


.risk-summary-item {
  display:
    flex;

  flex-direction:
    column;

  align-items:
    center;

  justify-content:
    center;

  gap:
    2px;

  color:
    #94a3b8;

  font-size:
    8px;
}


.risk-summary-item:first-child {
  border-right:
    1px solid #edf2f7;
}


.risk-summary-item b {
  font-size:
    16px;
}


.risk-ranking-scroll {
  height:
    calc(100% - 84px);

  overflow-y:
    auto;

  padding:
    3px 9px;
}


.ranking-item {
  display:
    flex;

  gap:
    8px;

  padding:
    9px 2px;

  border-bottom:
    1px solid #eef2f6;
}


.ranking-index {
  width:
    22px;

  height:
    22px;

  flex-shrink:
    0;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border-radius:
    5px;

  background:
    #eef4f8;

  color:
    #64748b;

  font-size:
    9px;

  font-weight:
    700;
}


.ranking-index.rankingTop {
  color:
    #ffffff;

  background:
    #dc2626;
}


.ranking-content {
  min-width:
    0;

  flex:
    1;
}


.ranking-head {
  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    6px;
}


.ranking-head strong {
  min-width:
    0;

  color:
    #334155;

  font-size:
    10px;

  overflow:
    hidden;

  white-space:
    nowrap;

  text-overflow:
    ellipsis;
}


.ranking-head span {
  color:
    #94a3b8;

  font-size:
    7px;

  white-space:
    nowrap;
}


.ranking-risk-row {
  display:
    flex;

  align-items:
    center;

  gap:
    7px;

  margin-top:
    5px;
}


.ranking-track {
  height:
    6px;

  flex:
    1;

  overflow:
    hidden;

  border-radius:
    4px;

  background:
    #edf2f7;
}


.ranking-fill {
  height:
    100%;

  border-radius:
    4px;
}


.ranking-risk-row b {
  width:
    25px;

  text-align:
    right;

  font-size:
    11px;
}


.ranking-meta {
  margin-top:
    3px;

  font-size:
    8px;

  font-weight:
    600;
}


.ranking-reason {
  margin-top:
    3px;

  color:
    #94a3b8;

  font-size:
    7.5px;

  line-height:
    1.45;
}


/* ============================================================
   Chain
============================================================ */

.chain-card {
  min-height:
    155px;

  margin-top:
    7px;

  padding:
    11px 15px;
}


.chain-header {
  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;
}


.chain-title {
  color:
    #334155;

  font-size:
    12px;

  font-weight:
    700;
}


.chain-subtitle {
  margin-top:
    3px;

  color:
    #94a3b8;

  font-size:
    8px;
}


.route-select {
  max-width:
    260px;

  height:
    29px;

  padding:
    0 9px;

  outline:
    none;

  color:
    #475569;

  border:
    1px solid #d6e0e8;

  border-radius:
    5px;

  background:
    #fff;

  font-size:
    9px;
}


.chain-track {
  display:
    flex;

  align-items:
    flex-start;

  justify-content:
    center;

  margin-top:
    16px;

  overflow-x:
    auto;

  padding-bottom:
    5px;
}


.chain-node {
  min-width:
    90px;

  max-width:
    110px;

  text-align:
    center;
}


.chain-node-icon {
  width:
    34px;

  height:
    34px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  margin:
    auto;

  border:
    2px solid;

  border-radius:
    50%;

  background:
    #fff;

  font-size:
    14px;
}


.chain-node-name {
  max-width:
    100px;

  margin:
    6px auto 0;

  color:
    #475569;

  font-size:
    8px;

  overflow:
    hidden;

  white-space:
    nowrap;

  text-overflow:
    ellipsis;
}


.chain-node-score {
  margin-top:
    2px;

  font-size:
    8px;

  font-weight:
    700;
}


.chain-node-level {
  margin-top:
    1px;

  font-size:
    7px;
}


.chain-node-reason {
  max-width:
    105px;

  margin:
    3px auto 0;

  color:
    #94a3b8;

  font-size:
    6.5px;

  line-height:
    1.35;

  display:
    -webkit-box;

  overflow:
    hidden;

  -webkit-line-clamp:
    2;

  -webkit-box-orient:
    vertical;
}


.chain-arrow {
  width:
    50px;

  display:
    flex;

  align-items:
    center;

  margin-top:
    16px;
}


.chain-arrow-line {
  height:
    2px;

  flex:
    1;
}


.chain-arrow span {
  margin-left:
    -1px;

  font-size:
    19px;

  line-height:
    10px;
}


.empty-chain {
  padding:
    30px 0;

  color:
    #94a3b8;

  text-align:
    center;

  font-size:
    9px;
}


/* ============================================================
   Bottom dashboard
============================================================ */

.bottom-dashboard {
  height:
    250px;

  display:
    grid;

  grid-template-columns:
    1.55fr
    1fr
    1.05fr;

  gap:
    7px;

  margin-top:
    7px;
}


.bottom-card {
  overflow:
    hidden;
}


/* ============================================================
   Events
============================================================ */

.event-scroll {
  height:
    calc(100% - 34px);

  overflow-y:
    auto;
}


.event-item {
  display:
    grid;

  grid-template-columns:
    58px
    4px
    1fr;

  gap:
    9px;

  padding:
    9px 10px;

  border-bottom:
    1px solid #eef2f6;
}


.event-left {
  display:
    flex;

  flex-direction:
    column;

  gap:
    4px;
}


.event-time {
  color:
    #94a3b8;

  font-size:
    7px;
}


.event-risk-level {
  font-size:
    9px;

  font-weight:
    700;
}


.event-risk-bar {
  width:
    3px;

  min-height:
    38px;

  border-radius:
    3px;
}


.event-info {
  min-width:
    0;
}


.event-title-row {
  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    8px;
}


.event-title-row strong {
  min-width:
    0;

  color:
    #475569;

  font-size:
    9px;

  overflow:
    hidden;

  white-space:
    nowrap;

  text-overflow:
    ellipsis;
}


.event-source {
  padding:
    1px 4px;

  border-radius:
    3px;

  color:
    #64748b;

  background:
    #f1f5f9;

  font-size:
    6.5px;

  white-space:
    nowrap;
}


.event-desc {
  display:
    block;

  margin-top:
    3px;

  color:
    #94a3b8;

  font-size:
    7.5px;

  line-height:
    1.4;
}


.event-score-row {
  display:
    grid;

  grid-template-columns:
    38px
    1fr
    24px;

  align-items:
    center;

  gap:
    5px;

  margin-top:
    5px;

  color:
    #94a3b8;

  font-size:
    7px;
}


.event-score-track {
  height:
    4px;

  overflow:
    hidden;

  border-radius:
    3px;

  background:
    #edf2f7;
}


.event-score-fill {
  height:
    100%;
}


.event-score-row b {
  text-align:
    right;

  font-size:
    8px;
}


/* ============================================================
   Risk composition
============================================================ */

.risk-composition {
  height:
    calc(100% - 34px);

  box-sizing:
    border-box;

  padding:
    7px 11px;

  overflow-y:
    auto;
}


.risk-composition-item {
  padding:
    6px 0;

  border-bottom:
    1px solid #f0f4f7;
}


.composition-head {
  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    8px;
}


.composition-name {
  display:
    flex;

  align-items:
    center;

  gap:
    6px;

  color:
    #475569;

  font-size:
    9px;

  font-weight:
    600;
}


.composition-name i {
  width:
    7px;

  height:
    7px;

  border-radius:
    50%;
}


.composition-head > div:last-child {
  display:
    flex;

  align-items:
    baseline;

  gap:
    5px;
}


.composition-head b {
  font-size:
    12px;
}


.composition-head span {
  color:
    #94a3b8;

  font-size:
    7px;
}


.composition-track {
  height:
    5px;

  margin-top:
    5px;

  overflow:
    hidden;

  border-radius:
    4px;

  background:
    #edf2f7;
}


.composition-fill {
  height:
    100%;

  border-radius:
    4px;
}


.composition-desc {
  margin-top:
    3px;

  color:
    #94a3b8;

  font-size:
    7px;
}


/* ============================================================
   Analysis
============================================================ */

.analysis-content {
  height:
    calc(100% - 34px);

  box-sizing:
    border-box;

  padding:
    9px 10px;

  overflow-y:
    auto;
}


.analysis-level {
  display:
    inline-flex;

  align-items:
    center;

  min-height:
    23px;

  box-sizing:
    border-box;

  padding:
    3px 8px;

  border-radius:
    5px;

  font-size:
    9px;

  font-weight:
    700;
}


.analysis-kpi-row {
  display:
    grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap:
    5px;

  margin-top:
    8px;
}


.analysis-kpi {
  display:
    flex;

  flex-direction:
    column;

  align-items:
    center;

  justify-content:
    center;

  min-height:
    43px;

  border:
    1px solid #edf2f7;

  border-radius:
    5px;

  background:
    #fafcfd;
}


.analysis-kpi span {
  color:
    #94a3b8;

  font-size:
    7px;
}


.analysis-kpi b {
  margin-top:
    2px;

  color:
    #334155;

  font-size:
    14px;
}


.analysis-points {
  margin-top:
    7px;
}


.analysis-point {
  display:
    flex;

  align-items:
    flex-start;

  gap:
    6px;

  margin-bottom:
    5px;

  color:
    #64748b;

  font-size:
    7.5px;

  line-height:
    1.5;
}


.analysis-point > i {
  width:
    5px;

  height:
    5px;

  flex-shrink:
    0;

  margin-top:
    4px;

  border-radius:
    50%;

  background:
    #0284c7;
}


.analysis-point b {
  color:
    #334155;
}


.analysis-confidence {
  display:
    flex;

  align-items:
    center;

  gap:
    6px;

  margin-top:
    7px;

  padding:
    6px;

  border-radius:
    5px;

  background:
    #f8fafc;

  color:
    #94a3b8;

  font-size:
    8px;
}


.analysis-confidence b {
  font-size:
    12px;
}


.verify-btn {
  width:
    100%;

  margin-top:
    7px;
}


/* ============================================================
   Timeline
============================================================ */

.timeline-bar {
  height:
    52px;

  display:
    flex;

  align-items:
    center;

  gap:
    12px;

  box-sizing:
    border-box;

  margin-top:
    7px;

  padding:
    0 12px;

  border:
    1px solid #d8e4ed;

  border-radius:
    7px;

  background:
    #ffffff;

  box-shadow:
    0 3px 12px
    rgba(15,23,42,.035);
}


.timeline-year {
  min-width:
    48px;

  color:
    #0284c7;

  text-align:
    center;

  font-size:
    11px;

  font-weight:
    700;
}


.timeline-slider {
  flex:
    1;
}


.timeline-stat {
  display:
    flex;

  align-items:
    center;

  gap:
    4px;

  color:
    #94a3b8;

  font-size:
    8px;

  white-space:
    nowrap;
}


.timeline-stat b {
  font-size:
    11px;
}


/* ============================================================
   Empty
============================================================ */

.empty-message {
  padding:
    20px 10px;

  color:
    #94a3b8;

  text-align:
    center;

  font-size:
    9px;
}


/* ============================================================
   Scrollbars
============================================================ */

.risk-ranking-scroll::-webkit-scrollbar,
.event-scroll::-webkit-scrollbar,
.risk-composition::-webkit-scrollbar,
.analysis-content::-webkit-scrollbar,
.chain-track::-webkit-scrollbar {
  width:
    4px;

  height:
    4px;
}


.risk-ranking-scroll::-webkit-scrollbar-thumb,
.event-scroll::-webkit-scrollbar-thumb,
.risk-composition::-webkit-scrollbar-thumb,
.analysis-content::-webkit-scrollbar-thumb,
.chain-track::-webkit-scrollbar-thumb {
  border-radius:
    4px;

  background:
    #cbd5e1;
}


/* ============================================================
   Element Plus
============================================================ */

:deep(.el-slider__runway) {
  height:
    3px;

  background:
    #e2e8f0;
}


:deep(.el-slider__bar) {
  height:
    3px;

  background:
    #0284c7;
}


:deep(.el-slider__button) {
  width:
    11px;

  height:
    11px;

  border:
    2px solid #0284c7;
}


/* ============================================================
   Responsive
============================================================ */

@media (max-width: 1450px) {

  .uranium-page {
    min-width:
      1100px;
  }


  .main-dashboard {
    grid-template-columns:
      minmax(690px, 1fr)
      270px;
  }


  .bottom-dashboard {
    grid-template-columns:
      1.45fr
      .95fr
      1fr;
  }
}

</style>
