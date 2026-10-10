<template>
  <section class="model-topology" aria-label="复杂网络拓扑关系底座">
    <!-- 顶部固定工具栏：三个区块固定排列，切换时绝不发生位移跳动 -->
    <div class="topology-toolbar">
      <div class="tb-left">
        <strong>天然铀供应链调度关系图 · 复杂网络拓扑底座</strong>
        <span class="tb-sub">节点度数 · 介数中心度 · 级联网络映射 (28 个实体 · 36 条拓扑链路)</span>
      </div>

      <!-- 中间固定位置切换药丸：绝不跳动 -->
      <div class="topology-view-toggle">
        <button
          type="button"
          :class="{ active: currentTab === 'graph' }"
          @click="currentTab = 'graph'"
        >
          <el-icon><Share /></el-icon>
          <span>拓扑关系图谱</span>
        </button>
        <button
          type="button"
          :class="{ active: currentTab === 'matrix' }"
          @click="currentTab = 'matrix'"
        >
          <el-icon><DataAnalysis /></el-icon>
          <span>度数与介数矩阵</span>
        </button>
        <button
          type="button"
          :class="{ active: currentTab === 'cascade' }"
          @click="currentTab = 'cascade'"
        >
          <el-icon><Warning /></el-icon>
          <span>级联失效映射</span>
        </button>
      </div>

      <!-- 右侧控制区：固定宽度占位，防止切换视图时中间按钮发生跳动 -->
      <div class="topology-actions-wrap">
        <div v-if="currentTab === 'graph'" class="topology-actions">
          <button :class="{ active: layoutDir === 'LR' }" @click="layoutDir = 'LR'">横向流向</button>
          <button :class="{ active: layoutDir === 'TB' }" @click="layoutDir = 'TB'">纵向分级</button>
          <button @click="resetViewport">自适应居中</button>
        </div>
        <div v-else class="topology-actions-placeholder">
          <span class="tb-stat-chip">全网 28 节点收敛就绪</span>
        </div>
      </div>
    </div>

    <!-- 复杂网络核心特征指标看板 (Top KPI Strip) -->
    <div class="topology-kpi-strip">
      <div class="kpi-item">
        <span class="kpi-label">全网节点数 (Nodes)</span>
        <strong class="kpi-val text-primary">28</strong>
        <small class="kpi-tip">矿山6 · 口岸5 · 基地4 · 机组13</small>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">平均度中心度 (Degree)</span>
        <strong class="kpi-val">4.82</strong>
        <small class="kpi-tip">高聚集多点连接特性</small>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">第一介数枢纽 (Betweenness)</span>
        <strong class="kpi-val text-danger">0.91</strong>
        <small class="kpi-tip">包头基地 0.91 / 阿拉山口 0.84</small>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">平均网络路径 (Path Len)</span>
        <strong class="kpi-val">2.38 步</strong>
        <small class="kpi-tip">矿山至终端平均跳数</small>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">网络聚类系数 (Clustering)</span>
        <strong class="kpi-val">0.36</strong>
        <small class="kpi-tip">区域多基地协同结构</small>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">单点级联断裂易损度</span>
        <strong class="kpi-val text-warning">0.76 (高危)</strong>
        <small class="kpi-tip">中亚口岸与北方制造依赖</small>
      </div>
    </div>

    <!-- 边权重物理与地缘映射说明条 -->
    <div class="topology-boundary-alert">
      <el-icon><InfoFilled /></el-icon>
      <span><b>边权重物理与地缘映射：</b>边粗细代表年通量规模 (tU/年)；边颜色代表地缘风险 (绿色正常 / 橙黄承压 / 红色断供高危)；连接标签融合物理运距时滞、海运通量与地缘阻断概率。</span>
    </div>

    <!-- 主展示区：三大 Tab 视图 -->
    <div class="topology-main-view">
      <!-- 视图 1：高可靠原生交互式复杂网络拓扑图谱 (绝不白屏、瞬时秒开) -->
      <div v-show="currentTab === 'graph'" class="native-graph-canvas" :class="{ 'is-vertical': layoutDir === 'TB' }">
        <!-- SVG 拓扑连线与流动粒子背景层 -->
        <svg class="graph-svg-layer" viewBox="0 0 1180 500" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
            </marker>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#3b82f6" />
            </marker>
          </defs>

          <!-- 链路 1: 哈萨克斯坦 -> 阿拉山口 (红色承压) -->
          <path d="M 230 110 C 290 110, 310 150, 370 160" class="flow-line line-danger" marker-end="url(#arrow-red)" />
          <!-- 链路 2: 湖山矿 -> 连云港 (绿色畅通) -->
          <path d="M 230 260 C 290 260, 310 300, 370 310" class="flow-line line-safe" marker-end="url(#arrow-green)" />
          <!-- 链路 3: 战略储备 -> 包头基地 (蓝色虚线) -->
          <path d="M 230 400 C 450 420, 520 220, 670 160" class="flow-line line-reserve" marker-end="url(#arrow-blue)" />
          <!-- 链路 4: 战略储备 -> 南方基地 (蓝色虚线) -->
          <path d="M 230 410 C 450 430, 520 340, 670 310" class="flow-line line-reserve" marker-end="url(#arrow-blue)" />
          <!-- 链路 5: 阿拉山口 -> 包头 (红色拥堵) -->
          <path d="M 530 160 C 580 160, 610 155, 670 155" class="flow-line line-danger is-jam" marker-end="url(#arrow-red)" />
          <!-- 链路 6: 连云港 -> 南方基地 (绿色通畅) -->
          <path d="M 530 310 C 580 310, 610 310, 670 310" class="flow-line line-safe" marker-end="url(#arrow-green)" />
          <!-- 链路 7: 包头 -> 核电群 (橙色刚性首炉) -->
          <path d="M 830 155 C 890 155, 910 200, 970 210" class="flow-line line-warning" marker-end="url(#arrow-amber)" />
          <!-- 链路 8: 南方基地 -> 核电群 (绿色商运) -->
          <path d="M 830 310 C 890 310, 910 240, 970 230" class="flow-line line-safe" marker-end="url(#arrow-green)" />
        </svg>

        <!-- 4 列层级网络容器 -->
        <div class="graph-tiers-columns">
          <!-- 第 1 列：海外供给矿山与国家平准库 -->
          <div class="graph-col col-1">
            <div class="col-badge supply">01 海外矿山与战略储备</div>
            <div class="col-nodes">
              <div
                v-for="n in supplyNodes"
                :key="n.id"
                class="node-card"
                :class="{ selected: selectedNodeId === n.id, [n.riskTone]: true }"
                @click="handleNodeClick(n)"
              >
                <div class="nc-top">
                  <span class="nc-type-tag">矿山/储备</span>
                  <span class="nc-risk-pill" :class="n.riskTone">{{ n.riskText }}</span>
                </div>
                <strong class="nc-title">{{ n.name }}</strong>
                <div class="nc-kpis">
                  <span>度数: <b>{{ n.degree }}</b></span>
                  <span>介数: <b>{{ n.betweenness }}</b></span>
                  <span>产能: <b>{{ n.capacityText }}</b></span>
                </div>
                <div class="nc-edge-hint">{{ n.ruleTag }}</div>
              </div>
            </div>
          </div>

          <!-- 第 2 列：陆海跨境通道与口岸枢纽 -->
          <div class="graph-col col-2">
            <div class="col-badge transport">02 陆海走廊与跨境口岸</div>
            <div class="col-nodes">
              <div
                v-for="n in transportNodes"
                :key="n.id"
                class="node-card"
                :class="{ selected: selectedNodeId === n.id, [n.riskTone]: true }"
                @click="handleNodeClick(n)"
              >
                <div class="nc-top">
                  <span class="nc-type-tag">运输咽喉</span>
                  <span class="nc-risk-pill" :class="n.riskTone">{{ n.riskText }}</span>
                </div>
                <strong class="nc-title">{{ n.name }}</strong>
                <div class="nc-kpis">
                  <span>度数: <b>{{ n.degree }}</b></span>
                  <span>介数: <b class="text-danger">{{ n.betweenness }}</b></span>
                  <span>负荷: <b :class="n.stockAlert ? 'text-danger' : 'text-safe'">{{ n.capacityText }}</b></span>
                </div>
                <div class="nc-edge-hint">{{ n.ruleTag }}</div>
              </div>
            </div>
          </div>

          <!-- 第 3 列：南北制造转化枢纽 -->
          <div class="graph-col col-3">
            <div class="col-badge manufacturing">03 制造加工与转化基地</div>
            <div class="col-nodes">
              <div
                v-for="n in manufacturingNodes"
                :key="n.id"
                class="node-card"
                :class="{ selected: selectedNodeId === n.id, [n.riskTone]: true }"
                @click="handleNodeClick(n)"
              >
                <div class="nc-top">
                  <span class="nc-type-tag">制造枢纽</span>
                  <span class="nc-risk-pill" :class="n.riskTone">{{ n.riskText }}</span>
                </div>
                <strong class="nc-title">{{ n.name }}</strong>
                <div class="nc-kpis">
                  <span>度数: <b>{{ n.degree }}</b></span>
                  <span>介数: <b class="text-danger">{{ n.betweenness }}</b></span>
                  <span>库存: <b :class="n.stockAlert ? 'text-danger' : 'text-safe'">{{ n.capacityText }}</b></span>
                </div>
                <div class="nc-edge-hint">{{ n.ruleTag }}</div>
              </div>
            </div>
          </div>

          <!-- 第 4 列：终端核电装料需求群 -->
          <div class="graph-col col-4">
            <div class="col-badge sales">04 终端核电需求集群</div>
            <div class="col-nodes">
              <div
                v-for="n in salesNodes"
                :key="n.id"
                class="node-card"
                :class="{ selected: selectedNodeId === n.id, [n.riskTone]: true }"
                @click="handleNodeClick(n)"
              >
                <div class="nc-top">
                  <span class="nc-type-tag">终端机组</span>
                  <span class="nc-risk-pill" :class="n.riskTone">{{ n.riskText }}</span>
                </div>
                <strong class="nc-title">{{ n.name }}</strong>
                <div class="nc-kpis">
                  <span>度数: <b>{{ n.degree }}</b></span>
                  <span>介数: <b>{{ n.betweenness }}</b></span>
                  <span>基线: <b>{{ n.capacityText }}</b></span>
                </div>
                <div class="nc-edge-hint">{{ n.ruleTag }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 选中节点的微观拓扑特征抽屉/悬浮面板 -->
        <transition name="el-fade-in-linear">
          <div v-if="activeNodeDetails" class="node-inspect-drawer glass-panel">
            <div class="nid-head">
              <div class="nid-title-row">
                <span class="nid-dot" :style="{ background: activeNodeDetails.color }"></span>
                <strong>{{ activeNodeDetails.name }}</strong>
                <el-tag size="small" effect="plain">{{ activeNodeDetails.categoryLabel }}</el-tag>
              </div>
              <button type="button" class="nid-close-btn" @click="activeNodeDetails = null">×</button>
            </div>

            <div class="nid-body">
              <div class="nid-stat-row">
                <div>
                  <small>网络度中心度</small>
                  <strong>{{ activeNodeDetails.degree }}</strong>
                </div>
                <div>
                  <small>介数中心度</small>
                  <strong class="text-danger">{{ activeNodeDetails.betweenness }}</strong>
                </div>
                <div>
                  <small>级联脆弱等级</small>
                  <strong :class="'text-' + activeNodeDetails.riskTone">{{ activeNodeDetails.riskText }}</strong>
                </div>
              </div>

              <div class="nid-section">
                <span>物理与地缘约束</span>
                <p>{{ activeNodeDetails.desc }}</p>
              </div>

              <div class="nid-section">
                <span>直连链路与阻断概率</span>
                <ul class="nid-link-list">
                  <li v-for="link in activeNodeDetails.links" :key="link.target">
                    <span>{{ link.rel }} ➔ {{ link.target }}</span>
                    <el-tag size="small" :type="link.tone" effect="light">{{ link.prob }}</el-tag>
                  </li>
                </ul>
              </div>

              <div class="nid-section">
                <span>自适应平准与替代预案</span>
                <div class="nid-rec-box">
                  {{ activeNodeDetails.backupStrategy }}
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- 视图 2：节点度数与介数中心度量化矩阵 (Table) -->
      <div v-show="currentTab === 'matrix'" class="matrix-table-wrapper">
        <el-table :data="nodeMatrixData" size="small" border stripe class="matrix-table">
          <el-table-column prop="rank" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="实体节点名称" min-width="180">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
              <el-tag size="small" :type="row.typeTag" effect="plain" style="margin-left: 6px;">{{ row.tierName }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="degree" label="节点度数 (Degree)" width="130" align="center" sortable>
            <template #default="{ row }">
              <span class="metric-mono"><b>{{ row.degree }}</b></span>
            </template>
          </el-table-column>
          <el-table-column prop="betweenness" label="介数中心度 (Betweenness)" width="160" align="center" sortable>
            <template #default="{ row }">
              <span class="metric-mono font-bold" :class="row.betweenness >= 0.8 ? 'text-danger' : 'text-primary'">
                {{ row.betweenness.toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="inDegree" label="入度 (In)" width="90" align="center" />
          <el-table-column prop="outDegree" label="出度 (Out)" width="90" align="center" />
          <el-table-column prop="chokeRisk" label="单点断链敏感度" width="130" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.riskTag" effect="light">{{ row.chokeRisk }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="roleDesc" label="网络拓扑职能与级联特征" min-width="260" show-overflow-tooltip />
        </el-table>
      </div>

      <!-- 视图 3：级联失效映射分析 (Cascade) -->
      <div v-show="currentTab === 'cascade'" class="cascade-flow-wrapper">
        <div class="cascade-intro-box">
          <span class="ci-badge">级联失效传导模拟</span>
          <div class="ci-content">
            <strong>复杂网络单点故障级联扩散链路：地缘冲击 ➔ 运输咽喉挤兑 ➔ 加工基地原料断供 ➔ 核电机组非计划停堆</strong>
            <p>基于网络介数中心度与度分布分析，阿拉山口（介数0.84）与包头基地（介数0.91）构成双重刚性咽喉。若未部署纳米比亚海运分流与国家储备平准，单点冲击将在 60–90 天内沿网络拓扑向全国核电站蔓延。</p>
          </div>
        </div>

        <div class="cascade-timeline-steps">
          <div v-for="(st, idx) in cascadeStages" :key="st.title" class="cascade-step-card" :class="st.tone">
            <div class="csc-badge">阶段 0{{ idx + 1 }} · {{ st.timePoint }}</div>
            <strong class="csc-title">{{ st.title }}</strong>
            <p class="csc-desc">{{ st.desc }}</p>
            <div class="csc-metrics">
              <span v-for="m in st.metrics" :key="m.label">
                <small>{{ m.label }}：</small><b>{{ m.val }}</b>
              </span>
            </div>
            <div class="csc-solution">
              <span>应急对冲对策：</span>
              <strong>{{ st.solution }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, markRaw } from 'vue'
import {
  Share,
  DataAnalysis,
  Warning,
  InfoFilled,
  Guide,
  OfficeBuilding,
  Cpu,
  Box
} from '@element-plus/icons-vue'

const props = defineProps({
  groups: { type: Array, required: true },
  selectedTier: { type: String, default: '' }
})

const emit = defineEmits(['select'])
const currentTab = ref('graph')
const layoutDir = ref('LR')
const selectedNodeId = ref('transport_land')
const activeNodeDetails = ref(null)

// 复杂网络实体节点丰富定义 (包含度数、介数中心度、库存、规则)
const TOPOLOGY_DETAILED_NODES = [
  {
    id: 'supplier_kazakhstan',
    tier: 'supply',
    categoryLabel: '海外地浸矿山',
    name: '哈萨克斯坦 Inkai 矿区',
    color: '#2563eb',
    icon: markRaw(Box),
    degree: 4,
    betweenness: 0.68,
    riskTone: 'warning',
    riskText: '中度脆弱 (俄制裁溢价)',
    capacityText: '年产 1,600 tU',
    stockAlert: false,
    desc: '陆运长协核心来源，原位浸出开采成本 $25/lb，受硫酸配额与俄过境脱钩制裁直接制约。',
    ruleTag: '双轨竞价 / 现货溢价',
    backupStrategy: '提高纳米比亚控股矿山采购配比，建立中亚原油换铀多边对冲。',
    links: [
      { target: '中哈阿拉山口口岸', rel: '中欧铁路集运', prob: '阻断率 28%', tone: 'danger' }
    ]
  },
  {
    id: 'supplier_namibia',
    tier: 'supply',
    categoryLabel: '海外全资矿山',
    name: '纳米比亚湖山铀矿 (Husab)',
    color: '#2563eb',
    icon: markRaw(Box),
    degree: 3,
    betweenness: 0.62,
    riskTone: 'safe',
    riskText: '安全受控 (自主控股)',
    capacityText: '年产 5,500 tU',
    stockAlert: false,
    desc: '中广核自主控股战略露天矿山，经鲸湾港 FOB 交付，海运船期 32–45 天，抗扰能力强。',
    ruleTag: '自主保供 / 长协履约98%',
    backupStrategy: '激活在途海运集装箱紧急转运航线，运力弹性支持 +55% 扩增。',
    links: [
      { target: '连云港/防城港海运接卸基地', rel: '远洋海运专线 (好望角)', prob: '阻断率 5%', tone: 'success' }
    ]
  },
  {
    id: 'supplier_reserve',
    tier: 'supply',
    categoryLabel: '战略平准储备',
    name: '国家战略原料平准储备库',
    color: '#2563eb',
    icon: markRaw(Box),
    degree: 4,
    betweenness: 0.72,
    riskTone: 'safe',
    riskText: '应急压舱石',
    capacityText: '储备 400 tU 现货',
    stockAlert: false,
    desc: '中央级应急原料储备，当北方或南方基地库存跌破安全红线时，授权定向平准借调。',
    ruleTag: '自适应借调 / 零利息平准',
    backupStrategy: '触发 45 天安全库存借调阈值，定向借调装料，待在途现货到港后 1:1 返还。',
    links: [
      { target: '北方包头燃料元件基地', rel: '特快铁路应急配额', prob: '阻断率 0%', tone: 'success' },
      { target: '南方宜宾燃料基地', rel: '公路封闭专运借调', prob: '阻断率 0%', tone: 'success' }
    ]
  },
  {
    id: 'transport_land',
    tier: 'transport',
    categoryLabel: '陆路咽喉口岸',
    name: '中哈阿拉山口铁路口岸',
    color: '#d97706',
    icon: markRaw(Guide),
    degree: 8,
    betweenness: 0.84,
    riskTone: 'danger',
    riskText: '第一咽喉 (极高危)',
    capacityText: '负荷率 94% (拥堵)',
    stockAlert: true,
    desc: '中亚陆运必经铁路转运口岸，宽轨转窄轨换装能力已达物理极限，地缘制裁下极易拥堵挤兑。',
    ruleTag: '第一介数咽喉 (0.84)',
    backupStrategy: '启动霍尔果斯口岸紧急分流，滞留超 120 小时自动激活远洋海运替代。',
    links: [
      { target: '北方包头燃料元件基地', rel: '铁路干线直达', prob: '拥堵挤兑 94%', tone: 'danger' }
    ]
  },
  {
    id: 'transport_ocean',
    tier: 'transport',
    categoryLabel: '远洋海运走廊',
    name: '连云港/防城港海运接卸基地',
    color: '#d97706',
    icon: markRaw(Guide),
    degree: 6,
    betweenness: 0.72,
    riskTone: 'safe',
    riskText: '运力弹性充足',
    capacityText: '负荷率 58% (稳态)',
    stockAlert: false,
    desc: '辐射南方及沿海核电机组的深水放射性危运港口（IMO Class 7），随时可承接非洲海运增量。',
    ruleTag: '海运分流缓冲',
    backupStrategy: '常态维持 2 艘专运散货轮巡航，与陆运通道形成海陆双轨互备。',
    links: [
      { target: '南方宜宾燃料基地', rel: '沿海铁水联运', prob: '通畅稳态 58%', tone: 'success' }
    ]
  },
  {
    id: 'factory_fuel_north',
    tier: 'manufacturing',
    categoryLabel: '核心制造枢纽',
    name: '中核北方包头燃料元件基地',
    color: '#059669',
    icon: markRaw(OfficeBuilding),
    degree: 12,
    betweenness: 0.91,
    riskTone: 'danger',
    riskText: '制造单点 (库存破线)',
    capacityText: '在役库存 14 周 (红线)',
    stockAlert: true,
    desc: '承担全国 60% 燃料组件加工制造，华龙一号首炉装料独家配套，对中亚原料断供高度敏感。',
    ruleTag: '第一制造枢纽 (介数0.91)',
    backupStrategy: '向国家储备库申请 400 tU 原料平准借调，柔性延后商运机组大修排产。',
    links: [
      { target: '华龙一号首炉示范机组群', rel: '首炉燃料装料直供', prob: '停堆风险 6.5%', tone: 'danger' }
    ]
  },
  {
    id: 'factory_fuel_south',
    tier: 'manufacturing',
    categoryLabel: '南方制造基地',
    name: '中广核南方燃料元件基地',
    color: '#059669',
    icon: markRaw(OfficeBuilding),
    degree: 9,
    betweenness: 0.75,
    riskTone: 'safe',
    riskText: '安全充裕 (储备良好)',
    capacityText: '在役库存 34 周 (健康)',
    stockAlert: false,
    desc: '承接南方沿海大亚湾、阳江等商运机组组件制造，海运通道顺畅，具备应急对外借调能力。',
    ruleTag: '多基地协同 / 互助平准',
    backupStrategy: '向北方包头基地临时借调 200 tU 加工半成品，对冲陆路口岸断链。',
    links: [
      { target: '全国商用沿海核电在役机组', rel: '商运机组换料交付', prob: '保障率 100%', tone: 'success' }
    ]
  },
  {
    id: 'retailer_nuclear',
    tier: 'sales',
    categoryLabel: '终端需求集群',
    name: '华龙一号与全国核电机组群',
    color: '#7c3aed',
    icon: markRaw(Cpu),
    degree: 14,
    betweenness: 0.88,
    riskTone: 'warning',
    riskText: '战略刚性保障',
    capacityText: '基线 11,500 tU/年',
    stockAlert: false,
    desc: '华龙一号首炉机组对燃料断料零容忍（0 停堆红线），商用在役机组换料大修具备 15–30 天柔性裕度。',
    ruleTag: '刚性保供优先级 / 0非停',
    backupStrategy: '战略主力堆型享受 100% 独占排产优先级，非计划停堆险情提前预警。',
    links: []
  }
]

const supplyNodes = computed(() => TOPOLOGY_DETAILED_NODES.filter(n => n.tier === 'supply'))
const transportNodes = computed(() => TOPOLOGY_DETAILED_NODES.filter(n => n.tier === 'transport'))
const manufacturingNodes = computed(() => TOPOLOGY_DETAILED_NODES.filter(n => n.tier === 'manufacturing'))
const salesNodes = computed(() => TOPOLOGY_DETAILED_NODES.filter(n => n.tier === 'sales'))

// 节点度数与介数矩阵量化数据表
const nodeMatrixData = [
  {
    rank: 1,
    name: '北方包头燃料元件基地',
    tierName: '制造枢纽',
    typeTag: 'success',
    degree: 12,
    betweenness: 0.91,
    inDegree: 5,
    outDegree: 7,
    chokeRisk: '特级断点',
    riskTag: 'danger',
    roleDesc: '承载全国60%燃料制造，介数中心度第一，单点断料将在90天内蔓延至沿海机组。'
  },
  {
    rank: 2,
    name: '华龙一号与全国核电机组群',
    tierName: '终端需求',
    typeTag: 'primary',
    degree: 14,
    betweenness: 0.88,
    inDegree: 9,
    outDegree: 5,
    chokeRisk: '刚性敏感',
    riskTag: 'warning',
    roleDesc: '全网最终需求汇聚点，首炉装料对上游级联波动承受阈值为0。'
  },
  {
    rank: 3,
    name: '中哈阿拉山口铁路口岸',
    tierName: '口岸咽喉',
    typeTag: 'warning',
    degree: 8,
    betweenness: 0.84,
    inDegree: 3,
    outDegree: 5,
    chokeRisk: '特级断点',
    riskTag: 'danger',
    roleDesc: '中亚陆运控制力的绝对咽喉，介数0.84，负荷率94%处于换轨挤兑边缘。'
  },
  {
    rank: 4,
    name: '南方宜宾燃料元件基地',
    tierName: '制造枢纽',
    typeTag: 'success',
    degree: 9,
    betweenness: 0.75,
    inDegree: 4,
    outDegree: 5,
    chokeRisk: '弹性较强',
    riskTag: 'success',
    roleDesc: '南方大亚湾及沿海保供主力，与包头基地形成南北双核对冲协同。'
  },
  {
    rank: 5,
    name: '连云港/防城港海运接卸基地',
    tierName: '港口中转',
    typeTag: 'warning',
    degree: 6,
    betweenness: 0.72,
    inDegree: 2,
    outDegree: 4,
    chokeRisk: '战略备份',
    riskTag: 'success',
    roleDesc: '非洲矿石主要分流港口，接卸负荷率仅58%，具备400tU应急扩运潜力。'
  },
  {
    rank: 6,
    name: '国家战略原料平准储备库',
    tierName: '平准缓冲',
    typeTag: 'info',
    degree: 4,
    betweenness: 0.72,
    inDegree: 1,
    outDegree: 3,
    chokeRisk: '安全压舱',
    riskTag: 'success',
    roleDesc: '独立于常规供应链的平准蓄水池，在系统临界时提供无时滞借调。'
  },
  {
    rank: 7,
    name: '哈萨克斯坦 Inkai 矿区',
    tierName: '海外矿山',
    typeTag: 'info',
    degree: 4,
    betweenness: 0.68,
    inDegree: 1,
    outDegree: 3,
    chokeRisk: '地缘敏感',
    riskTag: 'warning',
    roleDesc: '长协保供占比高，但受跨俄过境及铁路运力排队限制。'
  },
  {
    rank: 8,
    name: '纳米比亚湖山铀矿 (Husab)',
    tierName: '海外矿山',
    typeTag: 'info',
    degree: 3,
    betweenness: 0.62,
    inDegree: 1,
    outDegree: 2,
    chokeRisk: '自主稳定',
    riskTag: 'success',
    roleDesc: '自主控股深水海运矿山，长协履约率高，是跨洋保供的基石。'
  }
]

// 级联失效演化全流程阶段
const cascadeStages = [
  {
    title: '外部地缘冲击注入：涉俄脱钩与运输阻断',
    timePoint: '推演第 1 周',
    tone: 'danger',
    desc: '美欧涉俄核燃料次级制裁生效，中亚出境列车在俄过境安检滞期增加 14 天，国际现货暴涨至 $106/lb。',
    metrics: [{ label: '地缘扰动指数', val: '0.75' }, { label: '现货涨幅', val: '+38%' }],
    solution: '启动长协防套牢机制，全面冻结高位盲目追现货，锁定自主持股矿山基线。'
  },
  {
    title: '第一咽喉挤兑：阿拉山口口岸负荷突破 94%',
    timePoint: '推演第 4 周',
    tone: 'danger',
    desc: '边境陆桥列车编组排队堆积，宽轨换装严重受阻，阿拉山口口岸形成单点拥堵瓶颈（介数 0.84 触发告警）。',
    metrics: [{ label: '口岸通关时滞', val: '18 天' }, { label: '换装负荷', val: '94% (极危)' }],
    solution: '启动跨里海-南线绕行方案，在途散货分流 55% 转向纳米比亚远洋集装箱海运。'
  },
  {
    title: '级联下传中游：包头制造基地在役库存击穿 14 周红线',
    timePoint: '推演第 8 周',
    tone: 'warning',
    desc: '陆运断料导致北方包头基地安全库存跌至 14 周破位红线，华龙一号首炉燃料组件排产面临停线风险。',
    metrics: [{ label: '北方安全库存', val: '14 周 (警戒)' }, { label: '停堆风险率', val: '6.5%' }],
    solution: '立即激活国家战略储备 400 tU 平准借调令，南方基地调拨 200 tU 在途配额支援。'
  },
  {
    title: '全网策略收敛自愈：多基地平准借调实现 0 非停',
    timePoint: '推演第 12 周',
    tone: 'success',
    desc: '远洋海运增运抵港，国家战略储备平准补齐缺口，华龙一号首炉实现 100% 刚性装料，全网恢复均衡。',
    metrics: [{ label: '机组停堆率', val: '0 次' }, { label: '保供达成率', val: '99.2%' }],
    solution: '形成常态化双轨互备机制，健全长协底账与港口应急深水接卸预案。'
  }
]

function handleNodeClick(nodeData) {
  selectedNodeId.value = nodeData.id
  activeNodeDetails.value = nodeData
  emit('select', nodeData.tier)
}

function resetViewport() {
  selectedNodeId.value = 'transport_land'
  activeNodeDetails.value = TOPOLOGY_DETAILED_NODES.find(n => n.id === 'transport_land')
}
</script>

<style scoped>
.model-topology {
  display: flex;
  flex-direction: column;
  min-height: 520px;
  border: 1px solid #dce5ee;
  border-radius: 12px;
  overflow: hidden;
  background: #f8fafc;
}

/* 顶部固定工具栏：三个区块平稳排列，切换绝不跳位 */
.topology-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 18px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}
.tb-left {
  flex: 1;
  min-width: 0;
}
.tb-left strong {
  display: block;
  color: #0f172a;
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tb-sub {
  color: #64748b;
  font-size: 11px;
}
.topology-view-toggle {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.topology-view-toggle button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #475569;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.topology-view-toggle button.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}
.topology-actions-wrap {
  width: 220px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}
.topology-actions {
  display: flex;
  gap: 6px;
}
.topology-actions button {
  padding: 4px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  background: #ffffff;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
}
.topology-actions button.active {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
  font-weight: 700;
}
.tb-stat-chip {
  font-size: 11px;
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 3px 8px;
  border-radius: 4px;
}

/* 复杂网络特征指标栏 */
.topology-kpi-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  padding: 10px 16px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}
.kpi-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
}
.kpi-label {
  font-size: 10px;
  color: #64748b;
  white-space: nowrap;
}
.kpi-val {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  margin: 1px 0;
}
.kpi-tip {
  font-size: 9.5px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.text-primary { color: #2563eb; }
.text-danger { color: #dc2626; }
.text-warning { color: #d97706; }
.text-safe { color: #059669; }

/* 边界提示栏 */
.topology-boundary-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  background: #eff6ff;
  border-bottom: 1px solid #bfdbfe;
  color: #1e40af;
  font-size: 11px;
  line-height: 1.45;
}

/* 主展示容器 */
.topology-main-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 500px;
}

/* 原生高保真拓扑图画布 */
.native-graph-canvas {
  position: relative;
  width: 100%;
  min-height: 500px;
  padding: 24px 20px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  overflow-x: auto;
}
.graph-svg-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
.flow-line {
  fill: none;
  stroke-linecap: round;
}
.flow-line.line-danger {
  stroke: #ef4444;
  stroke-width: 2.2;
}
.flow-line.line-safe {
  stroke: #10b981;
  stroke-width: 2.2;
}
.flow-line.line-warning {
  stroke: #f59e0b;
  stroke-width: 2.2;
}
.flow-line.line-reserve {
  stroke: #3b82f6;
  stroke-width: 2;
  stroke-dasharray: 6,4;
}
.flow-line.is-jam {
  stroke-dasharray: 8,4;
  animation: dash 1s linear infinite;
}
@keyframes dash {
  to { stroke-dashoffset: -12; }
}

/* 4 列层级网络容器 */
.graph-tiers-columns {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  max-width: 1140px;
  margin: 0 auto;
}
.graph-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.col-badge {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.3px;
}
.col-badge.supply { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.col-badge.transport { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
.col-badge.manufacturing { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.col-badge.sales { background: #faf5ff; color: #6b21a8; border: 1px solid #e9d5ff; }

.col-nodes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.node-card {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #94a3b8;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  transition: all 0.2s ease;
}
.node-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);
  border-color: #3b82f6;
}
.node-card.selected {
  border-color: #2563eb;
  border-left-width: 5px;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25), 0 8px 20px rgba(15, 23, 42, 0.12);
  background: #f8fbff;
}
.node-card.danger { border-left-color: #ef4444; }
.node-card.warning { border-left-color: #f59e0b; }
.node-card.safe { border-left-color: #10b981; }

.nc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.nc-type-tag {
  font-size: 10px;
  color: #64748b;
}
.nc-risk-pill {
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}
.nc-risk-pill.danger { background: #fee2e2; color: #dc2626; }
.nc-risk-pill.warning { background: #fef3c7; color: #d97706; }
.nc-risk-pill.safe { background: #dcfce7; color: #16a34a; }

.nc-title {
  display: block;
  font-size: 12px;
  color: #0f172a;
  margin-bottom: 6px;
  line-height: 1.35;
}
.nc-kpis {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #64748b;
  background: #f8fafc;
  padding: 4px 6px;
  border-radius: 4px;
  margin-bottom: 6px;
}
.nc-kpis b {
  color: #0f172a;
}
.nc-edge-hint {
  font-size: 10px;
  color: #3b82f6;
  font-weight: 600;
}

/* 节点特征解析抽屉面板 */
.node-inspect-drawer {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 310px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.15);
  z-index: 10;
  padding: 14px 16px;
  max-height: calc(100% - 32px);
  overflow-y: auto;
}
.nid-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}
.nid-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nid-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.nid-title-row strong {
  font-size: 13px;
  color: #0f172a;
}
.nid-close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
}
.nid-stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 12px;
}
.nid-stat-row small {
  display: block;
  font-size: 9.5px;
  color: #64748b;
}
.nid-stat-row strong {
  font-size: 13px;
}
.nid-section {
  margin-bottom: 10px;
}
.nid-section span {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}
.nid-section p {
  margin: 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.45;
}
.nid-link-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.nid-link-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10.5px;
  background: #f8fafc;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #f1f5f9;
}
.nid-rec-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 11px;
  color: #1e40af;
  line-height: 1.45;
}

/* 矩阵视图 */
.matrix-table-wrapper {
  padding: 14px 18px;
  background: #ffffff;
}
.metric-mono {
  font-family: monospace;
}
.font-bold {
  font-weight: 700;
}

/* 级联失效视图 */
.cascade-flow-wrapper {
  padding: 16px 20px;
  background: #ffffff;
}
.cascade-intro-box {
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(135deg, rgba(254, 242, 242, 0.95), rgba(255, 251, 235, 0.95));
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}
.ci-badge {
  flex-shrink: 0;
  padding: 4px 8px;
  background: #dc2626;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
}
.ci-content strong {
  display: block;
  font-size: 12.5px;
  color: #991b1b;
  margin-bottom: 2px;
}
.ci-content p {
  margin: 0;
  font-size: 11.5px;
  color: #475569;
  line-height: 1.45;
}
.cascade-timeline-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.cascade-step-card {
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 12px 14px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}
.cascade-step-card.danger {
  border-top: 3px solid #ef4444;
  background: #fffafa;
}
.cascade-step-card.warning {
  border-top: 3px solid #f59e0b;
  background: #fffdf5;
}
.cascade-step-card.success {
  border-top: 3px solid #10b981;
  background: #f6fef9;
}
.csc-badge {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 6px;
}
.csc-title {
  font-size: 12.5px;
  color: #0f172a;
  margin-bottom: 6px;
}
.csc-desc {
  font-size: 11px;
  color: #475569;
  line-height: 1.45;
  margin: 0 0 10px;
  flex: 1;
}
.csc-metrics {
  display: flex;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 10px;
  margin-bottom: 8px;
}
.csc-solution {
  font-size: 10.5px;
  color: #1e3a8a;
  background: #eff6ff;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #bfdbfe;
}
.csc-solution span {
  display: block;
  font-weight: 700;
  color: #1d4ed8;
  margin-bottom: 1px;
}

@media (max-width: 1200px) {
  .topology-kpi-strip {
    grid-template-columns: repeat(3, 1fr);
  }
  .cascade-timeline-steps {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .topology-kpi-strip {
    grid-template-columns: repeat(2, 1fr);
  }
  .cascade-timeline-steps {
    grid-template-columns: 1fr;
  }
  .graph-tiers-columns {
    grid-template-columns: 1fr;
  }
}
</style>
