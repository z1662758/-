<template>
  <div class="supply-network-page">
    <!-- ── 供应链数据治理配置 ──────────────────────────────── -->
    <section class="sc-gov-panel" :class="{ 'sc-gov-collapsed': scGovCollapsed }">
      <div class="sc-gov-header" @click="scGovCollapsed = !scGovCollapsed">
        <div class="sc-gov-header-left">
          <span class="sc-gov-dot" :class="scGovStatusClass"></span>
          <span class="sc-gov-title">问题设定</span>
          <span class="sc-gov-phase-tag">汽车供应链网络分析</span>
        </div>
        <div class="sc-gov-header-right">
          <template v-if="scGovCollapsed">
            <span class="sc-gov-mandate-chip">{{ scMandateLabel }}</span>
            <span class="sc-gov-domain-summary">{{ scActiveDomainCount }} 类数据源 · 均质 {{ scAvgQuality }}%</span>
          </template>
          <svg class="sc-gov-chevron" :class="{ rotated: !scGovCollapsed }" width="14" height="14" viewBox="0 0 14 14">
            <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
      </div>

      <transition name="sc-gov-slide">
        <div v-show="!scGovCollapsed" class="sc-gov-body">
          <div class="sc-gov-grid">
            <div class="sc-gov-col">
              <div class="sc-gov-col-header">分析议题锁定</div>
              <div class="sc-mandate-list">
                <div
                  v-for="opt in SUPPLY_GOVERNANCE.mandateOptions"
                  :key="opt.value"
                  class="sc-mandate-item"
                  :class="{ active: scSelectedMandate === opt.value }"
                  @click.stop="scSelectedMandate = opt.value"
                >
                  <span class="sc-mandate-radio" :class="{ active: scSelectedMandate === opt.value }"></span>
                  <div class="sc-mandate-text">
                    <div class="sc-mandate-label">{{ opt.label }}</div>
                    <div class="sc-mandate-desc">{{ opt.desc }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="sc-gov-col">
              <div class="sc-gov-col-header">数据来源配置</div>
              <div class="sc-domain-list">
                <div
                  v-for="domain in SUPPLY_GOVERNANCE.dataDomains"
                  :key="domain.id"
                  class="sc-domain-row"
                  :class="{ 'sc-domain-off': !scEnabledDomains.includes(domain.id) }"
                  @click.stop="scToggleDomain(domain.id)"
                >
                  <span class="sc-domain-check" :class="{ active: scEnabledDomains.includes(domain.id) }">
                    <svg v-if="scEnabledDomains.includes(domain.id)" width="10" height="10" viewBox="0 0 10 10">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    </svg>
                  </span>
                  <div class="sc-domain-info">
                    <div class="sc-domain-name">{{ domain.label }}</div>
                    <div class="sc-domain-coverage">{{ domain.coverage }}</div>
                  </div>
                  <div class="sc-domain-q-wrap">
                    <div class="sc-domain-q-bar">
                      <div class="sc-domain-q-fill" :style="{ width: domain.quality + '%', background: scQualityColor(domain.quality) }"></div>
                    </div>
                    <span class="sc-domain-q-val" :style="{ color: scQualityColor(domain.quality) }">{{ domain.quality }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="sc-gov-col">
              <div class="sc-gov-col-header">分析基线假设</div>
              <div class="sc-assume-list">
                <div v-for="(a, i) in SUPPLY_GOVERNANCE.assumptions" :key="i" class="sc-assume-item">
                  <span class="sc-assume-index">{{ i + 1 }}</span>
                  <span class="sc-assume-text">{{ a }}</span>
                </div>
              </div>
              <div class="sc-gov-scope">
                <div class="sc-gov-scope-label">供应链覆盖范围</div>
                <div class="sc-gov-scope-val">整车厂 · Tier 1/Tier 2 · 关键零部件 · 原材料 · 物流节点</div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </section>
    <!-- ── /供应链数据治理配置 ─────────────────────────────── -->

    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-eyebrow">Automotive Supply Chain Network Analysis</div>
        <h1>{{ heroTitle }}</h1>
        <p>{{ scNarrativeCopy.heroDescription }}</p>
        <div class="hero-meta">{{ resolvedCoverageText }}</div>
      </div>
      <div class="hero-tags">
        <el-tag
          v-for="(tag, index) in heroTags"
          :key="tag"
          :effect="index === 0 ? 'dark' : 'plain'"
          :type="index === 0 ? 'primary' : undefined"
        >
          {{ tag }}
        </el-tag>
      </div>
    </section>

    <section class="metric-grid">
      <div v-for="item in scMetricCards" :key="item.label" class="metric-card">
        <div class="metric-label">{{ item.label }}</div>
        <div class="metric-value">{{ item.value }}</div>
        <div class="metric-desc">{{ item.desc }}</div>
      </div>
    </section>

    <section class="panel-card control-card">
      <div class="card-title-row">
        <div>
          <h2>筛选与时间轴</h2>
          <p>支持按节点类型、关系类型、风险阈值、时间窗口与供应链关键词探索依赖结构。</p>
        </div>
        <el-button class="reset-btn" plain @click="resetFilters">
          <el-icon><RefreshRight /></el-icon>
          重置筛选
        </el-button>
      </div>

      <div class="query-toolbar">
        <div class="query-item keyword">
          <label>分析关键词</label>
          <el-select
            v-model="networkKeyword"
            filterable
            allow-create
            clearable
            default-first-option
            placeholder="从后端关键词中选择或手动输入"
          >
            <el-option
              v-for="item in keywordOptions"
              :key="`${item.source}-${item.value}`"
              :label="item.label"
              :value="item.value"
            >
              <div class="keyword-option">
                <span>{{ item.label }}</span>
                <span class="keyword-option-source">{{ item.source }}</span>
              </div>
            </el-option>
          </el-select>
        </div>

        <div class="query-item mode">
          <label>节点识别模式</label>
          <el-select v-model="extractionMode" placeholder="选择识别模式">
            <el-option
              v-for="mode in extractionModeOptions"
              :key="mode.value"
              :label="mode.label"
              :value="mode.value"
            />
          </el-select>
          <div class="query-scope-chip">{{ extractionModeHint }}</div>
        </div>

        <div class="query-item expansion">
          <label>上下游扩展检索</label>
          <el-switch
            v-model="expansionEnabled"
            inline-prompt
            active-text="开启"
            inactive-text="关闭"
          />
          <div class="query-scope-chip">{{ expansionHint }}</div>
          <el-switch
            v-model="expansionCrawlExternal"
            :disabled="!expansionEnabled"
            inline-prompt
            active-text="外部情报"
            inactive-text="仅库内"
          />
        </div>

        <div class="query-item expansion-params">
          <label>扩展深度参数</label>
          <div class="expansion-grid">
            <div class="expansion-cell">
              <span>最大层级</span>
              <el-input-number v-model="expansionDepth" :min="0" :max="5" :step="1" :disabled="!expansionEnabled" />
            </div>
            <div class="expansion-cell">
              <span>每层种子数</span>
              <el-input-number v-model="expansionSeedsPerLayer" :min="1" :max="40" :step="1" :disabled="!expansionEnabled" />
            </div>
            <div class="expansion-cell">
              <span>每种子文档数</span>
              <el-input-number v-model="expansionDocsPerSeed" :min="5" :max="200" :step="5" :disabled="!expansionEnabled" />
            </div>
          </div>
        </div>

        <div class="query-item scope">
          <label>数据范围</label>
          <div class="query-scope-chip">检查该关键词下的全部已存储供应链情报</div>
        </div>

        <div class="query-item action">
          <label>网络构建</label>
          <el-button type="primary" :loading="networkLoading" @click="startSupplyChainAnalysis">
            {{ networkLoading ? '任务创建中...' : '重建供应链网络' }}
          </el-button>
        </div>
      </div>

      <div v-if="networkError" class="query-error">{{ networkError }}</div>
      <div v-if="networkStage" class="progress-panel">
        <div class="progress-top">
          <div>
            <div class="progress-title">分析进度</div>
            <div class="progress-stage">{{ networkStage }}</div>
          </div>
          <div class="progress-meta">
            <span v-if="networkJobStatus === 'done'">已完成</span>
            <span v-else-if="networkJobStatus === 'failed'">失败</span>
            <span v-else>执行中</span>
            <strong>{{ networkProgress }}%</strong>
          </div>
        </div>
        <el-progress :percentage="networkProgress" :status="networkJobStatus === 'failed' ? 'exception' : undefined" />
      </div>
      <div v-if="networkCacheHint" class="cache-hint">{{ networkCacheHint }}</div>

      <div class="filters-grid">
        <div class="filter-item filter-span-2">
          <label>节点搜索</label>
          <el-input
            v-model="searchKeyword"
            clearable
            placeholder="输入供应商、工厂、零部件、地区、标签或职责"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div class="filter-item">
          <label>时间窗口</label>
          <el-select v-model="timeWindowMode">
            <el-option
              v-for="option in timeWindowOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>

        <div class="filter-item">
          <label>依赖风险阈值</label>
          <el-slider v-model="minRisk" :min="35" :max="95" :step="5" />
        </div>

        <div class="filter-item filter-span-2">
          <label>节点类型筛选</label>
          <el-checkbox-group v-model="selectedNodeTypes" class="chip-group">
            <el-checkbox-button
              v-for="type in allNodeTypes"
              :key="type"
              :label="type"
            >
              {{ type }}
            </el-checkbox-button>
          </el-checkbox-group>
        </div>

        <div class="filter-item filter-span-2">
          <label>关系类型筛选</label>
          <el-checkbox-group v-model="selectedRelationTypes" class="chip-group">
            <el-checkbox-button
              v-for="type in allRelationTypes"
              :key="type"
              :label="type"
            >
              {{ type }}
            </el-checkbox-button>
          </el-checkbox-group>
        </div>
      </div>

      <div class="timeline-wrap">
        <div class="timeline-header">
          <div>
            <div class="mini-title">供应风险演化时间轴</div>
            <div class="timeline-summary">{{ activeSnapshot.title }} | {{ activeSnapshot.summary }} | {{ scNarrativeCopy.timelineHint }}</div>
          </div>
          <div class="timeline-current">
            <el-icon><Clock /></el-icon>
            <span>{{ activeSnapshot.label }}</span>
          </div>
        </div>

        <el-slider
          v-model="activeSnapshotIndex"
          :min="0"
          :max="resolvedSnapshots.length - 1"
          :step="1"
          :marks="timelineMarks"
          show-stops
        />

        <div class="timeline-cards">
          <button
            v-for="(snapshot, idx) in resolvedSnapshots"
            :key="snapshot.id"
            type="button"
            :class="['timeline-card', { active: idx === activeSnapshotIndex }]"
            @click="activeSnapshotIndex = idx"
          >
            <div class="timeline-card-date">{{ snapshot.label }}</div>
            <div class="timeline-card-title">{{ snapshot.title }}</div>
            <div class="timeline-card-desc">{{ snapshot.summary }}</div>
          </button>
        </div>
      </div>
    </section>

    <section class="panel-card subject-panel">
      <div class="card-title-row compact">
        <div>
          <h2>识别供应节点总览</h2>
          <p>优先展示已存储的供应商、零部件、工厂、物流节点识别结果，可展开查看全部节点并快速定位到图谱。</p>
        </div>
        <el-button text @click="subjectsExpanded = !subjectsExpanded">
          {{ subjectsExpanded ? '收起节点' : `展开全部节点 (${recognizedSubjects.length})` }}
        </el-button>
      </div>
      <div class="subject-grid">
        <button
          v-for="subject in visibleSubjects"
          :key="subject.id"
          type="button"
          class="subject-card"
          :class="{ active: selectedNode?.id === subject.id }"
          @click="selectedNodeId = subject.id"
        >
          <div class="subject-card-top">
            <span class="subject-name">{{ subject.name }}</span>
            <span class="subject-weight">{{ subject.weight }}</span>
          </div>
          <div class="subject-role">{{ subject.type }} | {{ subject.organization }}</div>
          <div class="subject-tags">
            <span v-for="tag in (subject.tags || []).slice(0, 3)" :key="tag" class="subject-tag">{{ tag }}</span>
          </div>
        </button>
      </div>
    </section>

    <section class="workspace-grid">
      <div class="panel-card network-card">
        <div class="card-title-row">
          <div>
            <h2>{{ scNarrativeCopy.networkTitle }}</h2>
            <p>{{ scNarrativeCopy.networkDesc }}</p>
          </div>
          <div class="legend-group">
            <span class="legend-item">
              <i class="legend-dot" style="background:#2563eb"></i>
              主机厂/整车
            </span>
            <span class="legend-item">
              <i class="legend-dot" style="background:#059669"></i>
              关键供应商
            </span>
            <span class="legend-item">
              <i class="legend-dot" style="background:#d97706"></i>
              工厂/物流/原材料
            </span>
          </div>
        </div>
        <div ref="networkChartRef" class="network-chart"></div>
        <div class="chart-note">
          <span>说明：</span>
          {{ scNarrativeCopy.chartNote }} 当前时间窗口：{{ timeWindowText }}。
        </div>
      </div>

      <div class="panel-card side-card">
        <div class="card-title-row compact">
          <div>
            <h2>供应节点详情</h2>
            <p>聚焦单一供应节点的能力、依赖对象、影响车型与风险依据。</p>
          </div>
        </div>

        <div v-if="selectedNode" class="profile-card">
          <div class="profile-header">
            <div>
              <div class="profile-name">{{ selectedNode.name }}</div>
              <div class="profile-role">{{ selectedNode.type }} | {{ selectedNode.organization }}</div>
            </div>
            <el-tag effect="dark">{{ selectedNode.weight }}</el-tag>
          </div>
          <p class="profile-desc">{{ selectedNode.description }}</p>
          <div class="profile-tags">
            <el-tag v-for="tag in selectedNode.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
          </div>
          <div v-if="selectedNode.aliases?.length" class="profile-aliases">
            别名/物料号：{{ selectedNode.aliases.join('、') }}
          </div>
        </div>

        <div v-else class="empty-tip">
          当前筛选结果下暂无节点，请调整条件。
        </div>

        <div class="detail-section">
          <div class="mini-title">关联依赖关系</div>
          <div v-if="selectedNodeConnections.length" class="connection-list">
            <div
              v-for="item in selectedNodeConnections"
              :key="`${item.source}-${item.target}-${item.type}`"
              class="connection-item"
            >
              <div class="connection-top">
                <span>{{ item.counterpart }}</span>
                <el-tag size="small" :type="item.strength >= 80 ? 'danger' : 'info'">
                  {{ item.strength }}
                </el-tag>
              </div>
              <div class="connection-meta">{{ item.type }} | {{ item.description }}</div>
            </div>
          </div>
          <div v-else class="empty-inline">暂无依赖明细</div>
        </div>

        <div class="detail-section">
          <div class="mini-title">风险依据</div>
          <div class="osint-feed">
            <div v-for="item in visibleSources" :key="item.title" class="osint-item">
              <div class="osint-source">{{ item.source }} | {{ item.date }}</div>
              <div class="osint-title">{{ item.title }}</div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="mini-title">节点证据标题</div>
          <div v-if="selectedNode?.evidence_titles?.length" class="evidence-list">
            <div v-for="title in selectedNode.evidence_titles" :key="title" class="evidence-item">{{ title }}</div>
          </div>
          <div v-else class="empty-inline">暂无节点证据标题</div>
        </div>
      </div>
    </section>

    <section class="analysis-grid">
      <div class="panel-card analysis-card">
        <div class="card-title-row compact">
          <div>
            <h2>{{ scNarrativeCopy.rankingTitle }}</h2>
            <p>{{ scNarrativeCopy.rankingDesc }}</p>
          </div>
        </div>
        <div class="ranking-list">
          <div v-for="(item, idx) in influenceRanking" :key="item.id" class="ranking-item">
            <div class="ranking-index">{{ idx + 1 }}</div>
            <div class="ranking-body">
              <div class="ranking-top">
                <span>{{ item.name }}</span>
                <span class="ranking-score">{{ item.score }}</span>
              </div>
              <div class="ranking-meta">
                {{ item.type }} | 加权依赖 {{ item.weightedDegree }} | 瓶颈值 {{ item.bottleneckScore }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-card analysis-card">
        <div class="card-title-row compact">
          <div>
            <h2>{{ scNarrativeCopy.circleTitle }}</h2>
            <p>{{ scNarrativeCopy.circleDesc }}</p>
          </div>
        </div>

        <div class="circle-list">
          <div v-for="circle in coreCircleAnalysis" :key="circle.name" class="circle-item">
            <div class="circle-top">
              <span>{{ circle.name }}</span>
              <el-tag size="small" :type="circle.density >= 70 ? 'success' : 'warning'">
                紧密度 {{ circle.density }}
              </el-tag>
            </div>
            <div class="circle-meta">
              成员：{{ circle.members.join('、') }}
            </div>
            <div class="circle-meta">
              主导节点：{{ circle.coordinator }} | 平均依赖风险：{{ circle.averageStrength }}
            </div>
          </div>
        </div>

        <div class="mini-title edge-title">低影响节点识别</div>
        <div class="edge-list">
          <el-tag
            v-for="item in peripheralNodes"
            :key="item.id"
            effect="plain"
            type="info"
          >
            {{ item.name }} (连接 {{ item.degree }})
          </el-tag>
        </div>
      </div>

      <div class="panel-card analysis-card">
        <div class="card-title-row compact">
          <div>
            <h2>{{ scNarrativeCopy.vulnerabilityTitle }}</h2>
            <p>{{ scNarrativeCopy.vulnerabilityDesc }}</p>
          </div>
        </div>

        <div class="vulnerability-list">
          <div v-for="item in vulnerabilityReport" :key="item.id" class="vulnerability-item">
            <div class="vulnerability-top">
              <span>{{ item.name }}</span>
              <span class="risk-badge">{{ item.riskLevel }}</span>
            </div>
            <div class="vulnerability-text">{{ item.reason }}</div>
            <div class="vulnerability-alt">替代路径：{{ item.alternativePath }}</div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { Clock, RefreshRight, Search } from '@element-plus/icons-vue';
import request from '@/utils/request';

// ── 供应链数据治理配置 ───────────────────────────────────────
const SUPPLY_GOVERNANCE = {
  mandateOptions: [
    {
      value: 'critical_supplier',
      label: '关键供应商识别',
      desc: '识别对整车生产、关键零部件和多车型交付影响最大的 Tier 1 / Tier 2 / 原材料供应节点。'
    },
    {
      value: 'bottleneck',
      label: '瓶颈零部件识别',
      desc: '定位交期长、替代难、库存缓冲低、断供后会直接影响产线的关键物料。'
    },
    {
      value: 'risk_propagation',
      label: '断供风险传播分析',
      desc: '模拟供应商、工厂、港口、原材料异常后对上游、下游、车型和产线的传导路径。'
    },
    {
      value: 'resilience',
      label: '供应链韧性评估',
      desc: '评估替代供应、库存缓冲、区域冗余、物流冗余与恢复能力，输出补链优先级。'
    }
  ],
  dataDomains: [
    { id: 'procurement', label: '采购与订单记录', quality: 90, coverage: '2023.01 – 2026.05' },
    { id: 'bom', label: 'BOM 与车型配置', quality: 86, coverage: '2023.01 – 2026.05' },
    { id: 'logistics', label: '物流与交付追踪', quality: 74, coverage: '2024.01 – 2026.05' },
    { id: 'quality', label: '质量与售后反馈', quality: 68, coverage: '2024.01 – 2026.05' },
    { id: 'external_risk', label: '外部风险情报', quality: 62, coverage: '2024.06 – 2026.05' }
  ],
  assumptions: [
    '供应链关系以已存储采购、BOM、物流、质量与外部风险证据为依据，不将传闻关系计入正式依赖边。',
    '关系权重综合采购占比、替代难度、交付周期、库存覆盖天数与历史异常频次。',
    '时间切片内的供应依赖视为该阶段持续有效，用于对比风险重心与瓶颈节点变化。'
  ]
};

const SUPPLY_MANDATE_EFFECTS = {
  critical_supplier: {
    heroDescription: '围绕关键供应商识别目标，对汽车供应链中的主机厂、一级供应商、二级供应商、原材料和物流节点进行依赖图谱分析。',
    heroTags: ['关键供应商', '供应依赖图谱', '多车型影响', '风险演化时间轴'],
    networkTitle: '汽车供应链依赖网络图',
    networkDesc: '节点大小反映供应关键度，边粗细反映依赖风险与断供影响；点击节点查看供应画像。',
    chartNote: '当前问题设定偏向识别哪些供应商或节点对整车生产影响最大，以及风险如何沿上下游扩散。',
    rankingTitle: '关键供应节点排行',
    rankingDesc: '综合节点关键度、加权依赖、瓶颈值识别最需要重点保障的供应节点。',
    circleTitle: '核心供应链集群',
    circleDesc: '识别动力电池、车规芯片、物流交付等核心供应链集群。',
    vulnerabilityTitle: '断供脆弱性评估',
    vulnerabilityDesc: '定位一旦失效会造成产线、车型或交付冲击的关键节点。',
    timelineHint: '重点观察供应风险重心是否向电池、芯片、物流或原材料环节迁移。',
    typeBoost: { '一级供应商': 7, '二级供应商': 5, '关键零部件': 6, '原材料': 4 },
    relationBoost: { '供货关系': 6, 'BOM依赖': 7, '产能依赖': 5 },
    crossTierBoost: 3
  },
  bottleneck: {
    heroDescription: '围绕瓶颈零部件识别目标，定位交期长、替代难、单一供应占比高、会导致停线的关键物料与上游节点。',
    heroTags: ['瓶颈零部件', '替代难度', '安全库存', '单点故障'],
    networkTitle: '瓶颈零部件与上游依赖网络图',
    networkDesc: '节点大小反映物料瓶颈程度，边粗细强调单点供应、长周期交付与替代难度。',
    chartNote: '当前问题设定优先回答哪些零部件或上游节点最容易造成卡点，以及需要优先建立第二供应源。',
    rankingTitle: '瓶颈物料优先级报告',
    rankingDesc: '综合替代难度、库存缓冲、加权依赖与车型影响识别关键卡点。',
    circleTitle: '瓶颈供应集群',
    circleDesc: '识别围绕电池、芯片、功率器件、线束、热管理等形成的高风险集群。',
    vulnerabilityTitle: '单点故障评估',
    vulnerabilityDesc: '定位关键断点，并给出可替代供应链路或补链建议。',
    timelineHint: '重点观察瓶颈是否集中在少数零部件或少数区域。',
    typeBoost: { '关键零部件': 10, '二级供应商': 6, '原材料': 6 },
    relationBoost: { '独家供应': 10, 'BOM依赖': 6, '产能依赖': 6 },
    crossTierBoost: 5
  },
  risk_propagation: {
    heroDescription: '围绕断供风险传播分析目标，模拟供应商、工厂、港口和原材料异常对上下游、车型、产线和交付的影响路径。',
    heroTags: ['风险传播', '影响路径', '车型联动', '产线冲击'],
    networkTitle: '断供风险传播网络图',
    networkDesc: '节点大小反映风险传播价值，边粗细强调异常事件向车型与产线传导的强度。',
    chartNote: '当前问题设定更关注某个节点异常后，风险会沿哪些依赖链路扩散到整车生产与交付。',
    rankingTitle: '风险传播中心报告',
    rankingDesc: '综合传播路径数量、加权风险和跨层级连接识别主要风险扩散源。',
    circleTitle: '风险传播集群',
    circleDesc: '识别容易共同受影响的供应商、零部件、工厂和物流节点团簇。',
    vulnerabilityTitle: '传播断点评估',
    vulnerabilityDesc: '定位断供冲击最大、替代路径不足的传播节点。',
    timelineHint: '重点观察风险是否从局部供应商扩散到车型、工厂与物流网络。',
    typeBoost: { '生产工厂': 5, '物流节点': 6, '一级供应商': 5, '原材料': 5 },
    relationBoost: { '物流路径': 8, '供货关系': 5, '质量风险关联': 6 },
    crossTierBoost: 8
  },
  resilience: {
    heroDescription: '围绕供应链韧性评估目标，综合替代供应、库存缓冲、区域冗余、物流冗余和恢复能力，输出补链与降险优先级。',
    heroTags: ['供应链韧性', '替代供应', '库存缓冲', '恢复能力'],
    networkTitle: '供应链韧性与替代路径网络图',
    networkDesc: '节点大小反映韧性建设优先级，边粗细突出替代路径、冗余能力和恢复瓶颈。',
    chartNote: '当前问题设定聚焦如何降低单点故障风险，并找到可执行的替代供应与补链路径。',
    rankingTitle: '韧性补强优先级',
    rankingDesc: '识别最需要增加替代供应、提高库存或建设区域冗余的节点。',
    circleTitle: '替代供应与冗余集群',
    circleDesc: '识别具备替代能力的供应链团簇，以及当前冗余不足的环节。',
    vulnerabilityTitle: '韧性短板评估',
    vulnerabilityDesc: '定位恢复能力弱、替代路径不足、库存缓冲低的短板节点。',
    timelineHint: '重点观察替代覆盖率和库存缓冲是否足以对冲异常事件。',
    typeBoost: { '一级供应商': 4, '二级供应商': 5, '物流节点': 5, '原材料': 6 },
    relationBoost: { '替代供应': 8, '物流路径': 5, '独家供应': 6 },
    crossTierBoost: 4
  }
};

const SUPPLY_DOMAIN_EFFECTS = {
  procurement: {
    typeBoost: { '一级供应商': 5, '二级供应商': 4 },
    relationBoost: { '供货关系': 6, '独家供应': 4 }
  },
  bom: {
    typeBoost: { '关键零部件': 7, '主机厂': 3, '生产工厂': 3 },
    relationBoost: { 'BOM依赖': 8, '产能依赖': 3 }
  },
  logistics: {
    typeBoost: { '物流节点': 7, '生产工厂': 4 },
    relationBoost: { '物流路径': 8, '产能依赖': 2 }
  },
  quality: {
    typeBoost: { '一级供应商': 3, '二级供应商': 5, '关键零部件': 4 },
    relationBoost: { '质量风险关联': 8, '供货关系': 2 }
  },
  external_risk: {
    typeBoost: { '原材料': 6, '物流节点': 5, '二级供应商': 4 },
    relationBoost: { '物流路径': 4, '独家供应': 4, '产能依赖': 3 }
  }
};

const scGovCollapsed = ref(false);
const scSelectedMandate = ref('risk_propagation');
const scEnabledDomains = ref(['procurement', 'bom', 'logistics', 'quality', 'external_risk']);

const scActiveDomainCount = computed(() => scEnabledDomains.value.length);
const scAvgQuality = computed(() => {
  const domains = SUPPLY_GOVERNANCE.dataDomains.filter(d => scEnabledDomains.value.includes(d.id));
  if (!domains.length) return 0;
  return Math.round(domains.reduce((s, d) => s + d.quality, 0) / domains.length);
});
const scMandateLabel = computed(() => {
  const opt = SUPPLY_GOVERNANCE.mandateOptions.find(o => o.value === scSelectedMandate.value);
  return opt ? opt.label : '—';
});
const scGovStatusClass = computed(() => {
  const q = scAvgQuality.value;
  if (q >= 80) return 'status-good';
  if (q >= 65) return 'status-warn';
  return 'status-poor';
});
function scToggleDomain(id) {
  const list = scEnabledDomains.value;
  const idx = list.indexOf(id);
  if (idx >= 0) {
    if (list.length > 1) list.splice(idx, 1);
  } else {
    list.push(id);
  }
}
function scQualityColor(q) {
  if (q >= 80) return '#22c55e';
  if (q >= 65) return '#f59e0b';
  return '#ef4444';
}

const scContextState = computed(() => {
  const mandate = SUPPLY_MANDATE_EFFECTS[scSelectedMandate.value] || SUPPLY_MANDATE_EFFECTS.risk_propagation;
  const activeDomains = SUPPLY_GOVERNANCE.dataDomains.filter(domain => scEnabledDomains.value.includes(domain.id));
  const domainTypeBoost = {};
  const domainRelationBoost = {};
  activeDomains.forEach((domain) => {
    const effect = SUPPLY_DOMAIN_EFFECTS[domain.id];
    if (!effect) return;
    Object.entries(effect.typeBoost).forEach(([key, value]) => {
      domainTypeBoost[key] = (domainTypeBoost[key] || 0) + value;
    });
    Object.entries(effect.relationBoost).forEach(([key, value]) => {
      domainRelationBoost[key] = (domainRelationBoost[key] || 0) + value;
    });
  });
  return {
    mandate,
    activeDomains,
    coverageFactor: activeDomains.length / SUPPLY_GOVERNANCE.dataDomains.length,
    qualityFactor: scAvgQuality.value / 100,
    domainTypeBoost,
    domainRelationBoost
  };
});

const scNarrativeCopy = computed(() => scContextState.value.mandate);
const heroTags = computed(() => scContextState.value.mandate.heroTags);

function clampWeight(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function adjustNodeWeight(node, baseWeight) {
  const context = scContextState.value;
  const typeBoost = (context.mandate.typeBoost?.[node.type] || 0) + (context.domainTypeBoost[node.type] || 0);
  const damp = (1 - context.coverageFactor) * 4;
  return clampWeight(Math.round(baseWeight + typeBoost + (context.qualityFactor - 0.65) * 10 - damp), 45, 99);
}

function adjustRelationStrength(relation, sourceNode, targetNode) {
  const context = scContextState.value;
  const crossTierBoost = sourceNode?.tier !== targetNode?.tier ? context.mandate.crossTierBoost : 0;
  const relationBoost = (context.mandate.relationBoost?.[relation.type] || 0) + (context.domainRelationBoost[relation.type] || 0);
  const damp = (1 - context.coverageFactor) * 6;
  return clampWeight(Math.round(relation.strength + relationBoost + crossTierBoost + (context.qualityFactor - 0.65) * 8 - damp), 35, 98);
}

function classifySourceDomain(item) {
  const text = `${item?.title || ''} ${item?.source || ''}`.toLowerCase();
  if (/bom|车型|配置|material list|物料/.test(text)) return 'bom';
  if (/logistics|port|shipping|港口|运输|物流|交付/.test(text)) return 'logistics';
  if (/quality|recall|defect|fault|质量|召回|故障/.test(text)) return 'quality';
  if (/risk|sanction|policy|export|原材料|制裁|出口|价格/.test(text)) return 'external_risk';
  return 'procurement';
}
// ── /供应链数据治理配置 ──────────────────────────────────────

const nodeColorMap = {
  '主机厂': '#2563eb',
  '一级供应商': '#059669',
  '二级供应商': '#0f766e',
  '关键零部件': '#7c3aed',
  '原材料': '#d97706',
  '生产工厂': '#ea580c',
  '物流节点': '#64748b'
};

const relationColorMap = {
  '供货关系': '#2563eb',
  'BOM依赖': '#1d4ed8',
  '独家供应': '#dc2626',
  '替代供应': '#16a34a',
  '物流路径': '#ea580c',
  '质量风险关联': '#7c3aed',
  '产能依赖': '#0f766e'
};

const supplyNodeProfiles = {
  oem_byd: {
    id: 'oem_byd',
    name: '比亚迪整车平台',
    type: '主机厂',
    tier: 'OEM',
    organization: '整车制造与车型平台',
    title: '整车需求牵引节点',
    camp: '整车制造',
    baseWeight: 86,
    tags: ['多车型覆盖', '需求牵引', '产线排产'],
    aliases: ['OEM-BYD', 'Vehicle Platform'],
    description: '承接整车交付目标并向上游零部件、工厂与物流网络传导需求压力。',
    evidence_titles: ['多车型排产计划更新', '整车交付节奏对动力电池与功率器件需求上调']
  },
  plant_xian: {
    id: 'plant_xian',
    name: '西安总装工厂',
    type: '生产工厂',
    tier: 'OEM',
    organization: '整车生产基地',
    title: '产能承接节点',
    camp: '整车制造',
    baseWeight: 80,
    tags: ['总装产能', '库存缓冲', '交付压力'],
    aliases: ['Plant-XA', 'Final Assembly'],
    description: '承担核心车型总装任务，对电池包、线束、制动系统、物流到货稳定性高度敏感。',
    evidence_titles: ['总装工厂安全库存低于目标阈值', '港口与干线运输延迟影响到厂节拍']
  },
  catl_battery: {
    id: 'catl_battery',
    name: '宁德时代动力电池',
    type: '一级供应商',
    tier: 'Tier1',
    organization: '动力电池系统供应商',
    title: '动力电池核心供应商',
    camp: '核心零部件',
    baseWeight: 91,
    tags: ['动力电池', '高采购占比', '长周期产能'],
    aliases: ['CATL', 'Battery Pack'],
    description: '动力电池系统直接影响新能源车型排产，是整车交付的核心约束节点。',
    evidence_titles: ['动力电池产能利用率接近上限', '电池包交付周期较历史均值拉长']
  },
  bosch_brake: {
    id: 'bosch_brake',
    name: '博世制动控制系统',
    type: '一级供应商',
    tier: 'Tier1',
    organization: '制动与底盘控制供应商',
    title: '安全件供应节点',
    camp: '核心零部件',
    baseWeight: 82,
    tags: ['制动系统', '安全件', '质量敏感'],
    aliases: ['Bosch ESP', 'Brake Control'],
    description: '制动控制系统具备高安全认证门槛，替代验证周期较长。',
    evidence_titles: ['制动控制模块认证周期较长', '安全件替代供应需要重新验证']
  },
  infineon_mcu: {
    id: 'infineon_mcu',
    name: '英飞凌车规 MCU',
    type: '二级供应商',
    tier: 'Tier2',
    organization: '车规半导体供应商',
    title: '车规芯片瓶颈节点',
    camp: '半导体链',
    baseWeight: 88,
    tags: ['车规芯片', '长交期', '替代难'],
    aliases: ['Infineon MCU', 'AURIX'],
    description: '车规 MCU 影响多个控制器供应，具备典型长交期和替代认证难特征。',
    evidence_titles: ['车规 MCU 交期持续高于安全阈值', '控制器平台对特定 MCU 型号依赖较高']
  },
  sic_power: {
    id: 'sic_power',
    name: 'SiC 功率模块',
    type: '关键零部件',
    tier: 'Part',
    organization: '电驱与高压平台关键物料',
    title: '高压电驱瓶颈物料',
    camp: '半导体链',
    baseWeight: 84,
    tags: ['功率器件', '电驱系统', '替代验证'],
    aliases: ['SiC Module', 'Power Module'],
    description: 'SiC 功率模块决定高压电驱平台供给稳定性，替代供应需要电驱系统级验证。',
    evidence_titles: ['SiC 模块产能扩张滞后于车型需求', '功率器件替代验证窗口偏长']
  },
  lithium_material: {
    id: 'lithium_material',
    name: '碳酸锂原材料',
    type: '原材料',
    tier: 'RawMaterial',
    organization: '电池上游材料',
    title: '电池成本与供给波动源',
    camp: '原材料链',
    baseWeight: 78,
    tags: ['锂材料', '价格波动', '上游供给'],
    aliases: ['Li2CO3', 'Lithium Carbonate'],
    description: '锂材料价格与供给波动会传导至电芯、电池包和整车成本。',
    evidence_titles: ['碳酸锂价格波动影响电池成本', '上游材料库存波动增加采购不确定性']
  },
  wire_harness: {
    id: 'wire_harness',
    name: '高压线束供应商',
    type: '一级供应商',
    tier: 'Tier1',
    organization: '电气连接系统供应商',
    title: '人工密集型瓶颈供应商',
    camp: '核心零部件',
    baseWeight: 74,
    tags: ['高压线束', '人工密集', '产能爬坡'],
    aliases: ['HV Harness', 'Wire Harness'],
    description: '高压线束定制化程度高，短期切换供应商会影响排产与质量稳定。',
    evidence_titles: ['线束供应商产能爬坡低于计划', '高压线束批次交付延迟']
  },
  ningbo_port: {
    id: 'ningbo_port',
    name: '宁波港出口物流',
    type: '物流节点',
    tier: 'Logistics',
    organization: '港口与出口运输节点',
    title: '整车与零部件物流枢纽',
    camp: '物流网络',
    baseWeight: 72,
    tags: ['港口拥堵', '出口物流', '运输延迟'],
    aliases: ['Ningbo Port', 'Export Logistics'],
    description: '港口与干线运输效率影响整车出口、零部件到厂和海外交付节奏。',
    evidence_titles: ['港口装船排队时间延长', '出口车型交付周期受港口拥堵影响']
  },
  thermal_system: {
    id: 'thermal_system',
    name: '热管理系统模块',
    type: '关键零部件',
    tier: 'Part',
    organization: '新能源热管理平台',
    title: '电池与座舱热管理关键物料',
    camp: '核心零部件',
    baseWeight: 70,
    tags: ['热管理', '跨车型复用', '质量关联'],
    aliases: ['Thermal Module', 'Heat Pump'],
    description: '热管理系统跨多车型复用，质量异常会在多个车型之间形成联动风险。',
    evidence_titles: ['热管理模块跨车型共用比例较高', '售后反馈显示热管理相关故障上升']
  }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const relationTemplates = [
  {
    source: 'catl_battery',
    target: 'plant_xian',
    type: '供货关系',
    base: 74,
    influences: { battery: 3.5, capacity: 1.2, demand: 0.8 },
    description: '动力电池包对总装工厂的直接供货链路。'
  },
  {
    source: 'plant_xian',
    target: 'oem_byd',
    type: '产能依赖',
    base: 70,
    influences: { demand: 2.8, logistics: 0.8, capacity: 1.4 },
    description: '总装工厂产能与整车交付目标之间的排产依赖。'
  },
  {
    source: 'lithium_material',
    target: 'catl_battery',
    type: 'BOM依赖',
    base: 72,
    influences: { material: 3.8, battery: 1.4, cost: 0.8 },
    description: '碳酸锂等上游材料对电芯与电池包成本和供给的传导链。'
  },
  {
    source: 'infineon_mcu',
    target: 'bosch_brake',
    type: '独家供应',
    base: 70,
    influences: { chip: 4.0, quality: 0.8, capacity: 0.7 },
    description: '车规 MCU 对制动控制模块的高替代难度供应链路。'
  },
  {
    source: 'bosch_brake',
    target: 'plant_xian',
    type: '供货关系',
    base: 66,
    influences: { quality: 2.4, demand: 1.0, logistics: 0.7 },
    description: '制动控制系统作为安全件对总装工厂形成高认证门槛供货关系。'
  },
  {
    source: 'sic_power',
    target: 'plant_xian',
    type: 'BOM依赖',
    base: 67,
    influences: { chip: 2.8, battery: 0.7, demand: 1.0 },
    description: 'SiC 功率模块对高压电驱平台与新能源车型排产形成关键依赖。'
  },
  {
    source: 'wire_harness',
    target: 'plant_xian',
    type: '产能依赖',
    base: 63,
    influences: { capacity: 2.7, logistics: 0.8, quality: 0.5 },
    description: '高压线束交付节拍对总装排产和返工风险形成影响。'
  },
  {
    source: 'ningbo_port',
    target: 'oem_byd',
    type: '物流路径',
    base: 62,
    influences: { logistics: 3.6, demand: 0.8, geopolitics: 0.7 },
    description: '港口出口物流对海外整车交付与零部件补给的传导路径。'
  },
  {
    source: 'thermal_system',
    target: 'plant_xian',
    type: '质量风险关联',
    base: 58,
    influences: { quality: 3.2, demand: 0.6, capacity: 0.5 },
    description: '热管理系统跨车型共用，质量异常会放大为多车型联动风险。'
  },
  {
    source: 'sic_power',
    target: 'infineon_mcu',
    type: '替代供应',
    base: 55,
    influences: { chip: 1.8, capacity: 0.8 },
    description: '半导体链内部存在部分替代与协同验证路径，但替代周期较长。'
  }
];

const keywordBuckets = {
  battery: ['电池', '电芯', '动力电池', 'battery', 'cell', 'pack'],
  chip: ['芯片', 'mcu', '半导体', 'sic', 'igbt', '功率模块', 'chip', 'semiconductor'],
  logistics: ['港口', '物流', '运输', '交付', '船期', 'port', 'logistics', 'shipping', 'delivery'],
  material: ['锂', '镍', '钴', '稀土', '原材料', '碳酸锂', 'lithium', 'material', 'nickel'],
  quality: ['质量', '召回', '缺陷', '故障', '售后', 'quality', 'recall', 'defect', 'fault'],
  demand: ['订单', '销量', '排产', '车型', '产线', 'demand', 'vehicle', 'production'],
  capacity: ['产能', '爬坡', '停线', '利用率', 'capacity', 'ramp', 'shutdown'],
  geopolitics: ['制裁', '出口管制', '政策', '关税', 'sanction', 'export control', 'tariff']
};

const themeLabelMap = {
  battery: '动力电池',
  chip: '车规芯片',
  logistics: '物流交付',
  material: '原材料波动',
  quality: '质量风险',
  demand: '车型需求',
  capacity: '产能约束',
  geopolitics: '外部政策风险'
};

const safeParseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatShortDate = (date) => {
  if (!(date instanceof Date)) return '';
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${month}/${day}`;
};

const formatLongDate = (date) => {
  if (!(date instanceof Date)) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

const normalizeSourceName = (source) => {
  const value = String(source || '').trim();
  if (!value) return '本地供应链情报源';
  return value
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
};

const supplyEventItems = [
  {
    fullTime: '2026-03-12T00:00:00Z',
    title: '动力电池包交付周期上升，部分车型安全库存低于目标天数',
    summary: '电池包与碳酸锂原材料波动共同影响新能源车型排产。',
    category: 'battery material capacity',
    location: '华东/华中',
    source: 'procurement.system'
  },
  {
    fullTime: '2026-03-12T00:00:00Z',
    title: '车规 MCU 长交期影响制动控制模块交付节奏',
    summary: '半导体供应紧张叠加安全件认证周期，替代路径有限。',
    category: 'chip quality capacity',
    location: '欧洲/中国',
    source: 'supplier.risk'
  },
  {
    fullTime: '2026-03-19T00:00:00Z',
    title: '港口装船排队时间延长，出口车型交付周期拉长',
    summary: '宁波港出口物流拥堵影响整车海外交付与零部件补给。',
    category: 'logistics delivery demand',
    location: '宁波港',
    source: 'logistics.dashboard'
  },
  {
    fullTime: '2026-03-19T00:00:00Z',
    title: '高压线束供应商产能爬坡低于计划',
    summary: '人工密集型线束产能波动影响总装工厂日排产节奏。',
    category: 'capacity demand quality',
    location: '华南',
    source: 'manufacturing.ops'
  },
  {
    fullTime: '2026-04-02T00:00:00Z',
    title: '热管理系统售后故障率上升，跨车型共用模块需重点排查',
    summary: '质量风险可能在多个车型间联动放大。',
    category: 'quality vehicle demand',
    location: '全国售后网络',
    source: 'quality.aftermarket'
  },
  {
    fullTime: '2026-04-02T00:00:00Z',
    title: 'SiC 功率模块替代验证周期偏长，电驱平台存在瓶颈风险',
    summary: '高压平台关键功率器件供给成为短期交付约束。',
    category: 'chip capacity demand',
    location: '华东',
    source: 'engineering.bom'
  },
  {
    fullTime: '2026-04-18T00:00:00Z',
    title: '原材料价格波动加大，电池成本向整车利润传导',
    summary: '碳酸锂价格变化影响电池包成本和采购策略。',
    category: 'material battery cost',
    location: '上游材料市场',
    source: 'external.risk'
  },
  {
    fullTime: '2026-04-18T00:00:00Z',
    title: '出口管制与关税不确定性提升半导体供应风险',
    summary: '外部政策风险可能影响 MCU 与功率器件采购稳定性。',
    category: 'geopolitics chip policy',
    location: '全球供应链',
    source: 'external.risk'
  }
].map((item) => ({ ...item, parsedDate: safeParseDate(item.fullTime) })).filter((item) => item.parsedDate);

const scoreFeatures = (items) => {
  const scores = Object.fromEntries(Object.keys(keywordBuckets).map((key) => [key, 0]));
  items.forEach((item) => {
    const text = [item.title, item.summary, item.category, item.location].join(' ').toLowerCase();
    Object.entries(keywordBuckets).forEach(([bucket, keywords]) => {
      const hits = keywords.reduce((count, keyword) => count + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0);
      scores[bucket] += hits;
    });
  });
  return scores;
};

const summarizeTopThemes = (featureScores) =>
  Object.entries(featureScores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0)
    .slice(0, 3)
    .map(([key]) => themeLabelMap[key]);

const buildSnapshotTitle = (featureScores) => {
  const dominantTheme = Object.entries(featureScores).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (dominantTheme === 'battery' || dominantTheme === 'material') return '动力电池与原材料波动';
  if (dominantTheme === 'chip') return '车规芯片与功率器件瓶颈';
  if (dominantTheme === 'logistics') return '物流拥堵与交付延迟';
  if (dominantTheme === 'quality') return '质量异常与跨车型联动';
  if (dominantTheme === 'capacity') return '产能爬坡与停线风险';
  if (dominantTheme === 'geopolitics') return '外部政策与供应安全';
  return '供应链综合风险演化';
};

const buildSnapshotSummary = (items, featureScores) => {
  const themeText = summarizeTopThemes(featureScores);
  const topLocations = [...new Set(items.map((item) => item.location).filter(Boolean))].slice(0, 3);
  const locationText = topLocations.length ? `覆盖 ${topLocations.join('、')}` : '聚焦汽车供应链关键节点';
  const themeSummary = themeText.length ? `重点风险：${themeText.join('、')}` : '重点风险：供应、物流与质量动态';
  return `收录 ${items.length} 条供应链情报，${locationText}，${themeSummary}。`;
};

const buildDynamicWeights = (featureScores) => ({
  oem_byd: clamp(Math.round(supplyNodeProfiles.oem_byd.baseWeight + featureScores.demand * 0.9 + featureScores.logistics * 0.35 + featureScores.quality * 0.25), 60, 98),
  plant_xian: clamp(Math.round(supplyNodeProfiles.plant_xian.baseWeight + featureScores.capacity * 0.95 + featureScores.logistics * 0.65 + featureScores.demand * 0.45), 60, 96),
  catl_battery: clamp(Math.round(supplyNodeProfiles.catl_battery.baseWeight + featureScores.battery * 0.95 + featureScores.material * 0.45 + featureScores.capacity * 0.35), 70, 99),
  bosch_brake: clamp(Math.round(supplyNodeProfiles.bosch_brake.baseWeight + featureScores.quality * 0.75 + featureScores.chip * 0.45 + featureScores.demand * 0.25), 60, 94),
  infineon_mcu: clamp(Math.round(supplyNodeProfiles.infineon_mcu.baseWeight + featureScores.chip * 1.1 + featureScores.geopolitics * 0.55 + featureScores.capacity * 0.35), 68, 99),
  sic_power: clamp(Math.round(supplyNodeProfiles.sic_power.baseWeight + featureScores.chip * 0.95 + featureScores.demand * 0.5 + featureScores.capacity * 0.35), 62, 97),
  lithium_material: clamp(Math.round(supplyNodeProfiles.lithium_material.baseWeight + featureScores.material * 1.0 + featureScores.battery * 0.45 + featureScores.geopolitics * 0.3), 58, 95),
  wire_harness: clamp(Math.round(supplyNodeProfiles.wire_harness.baseWeight + featureScores.capacity * 0.9 + featureScores.quality * 0.35 + featureScores.logistics * 0.25), 55, 92),
  ningbo_port: clamp(Math.round(supplyNodeProfiles.ningbo_port.baseWeight + featureScores.logistics * 1.0 + featureScores.demand * 0.3 + featureScores.geopolitics * 0.25), 55, 92),
  thermal_system: clamp(Math.round(supplyNodeProfiles.thermal_system.baseWeight + featureScores.quality * 0.95 + featureScores.demand * 0.35 + featureScores.capacity * 0.25), 50, 90)
});

const buildDynamicRelations = (featureScores) =>
  relationTemplates.map((template) => {
    const strength = Object.entries(template.influences).reduce(
      (total, [key, factor]) => total + (featureScores[key] || 0) * factor,
      template.base
    );

    return {
      source: template.source,
      target: template.target,
      type: template.type,
      strength: clamp(Math.round(strength), 45, 96),
      description: template.description
    };
  });

const buildSnapshotNodes = (weights) =>
  Object.values(supplyNodeProfiles)
    .filter((node) => weights[node.id] !== undefined)
    .map((node) => ({
      ...node,
      weight: weights[node.id]
    }));

const groupedSupplyItems = (() => {
  const groups = new Map();
  supplyEventItems
    .sort((a, b) => a.parsedDate - b.parsedDate)
    .forEach((item) => {
      const dateKey = item.parsedDate.toISOString().slice(0, 10);
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey).push(item);
    });
  return groups;
})();

const fallbackFeatureScores = {
  battery: 6,
  chip: 6,
  logistics: 4,
  material: 4,
  quality: 3,
  demand: 5,
  capacity: 5,
  geopolitics: 2
};

const fallbackSnapshots = [
  {
    id: '2026-03-12',
    label: '2026.03.12',
    shortLabel: '03/12',
    title: '动力电池与车规芯片瓶颈',
    summary: '本地兜底时间线，展示汽车供应链风险传播与韧性分析样例。',
    weights: buildDynamicWeights(fallbackFeatureScores),
    relations: buildDynamicRelations(fallbackFeatureScores),
    sources: [
      { source: 'procurement.system', date: '2026-03-12', title: '动力电池交付周期拉长，安全库存低于目标阈值' },
      { source: 'supplier.risk', date: '2026-03-12', title: '车规 MCU 长交期影响制动控制模块供货节奏' }
    ]
  }
];

const snapshotConfigs = (() => {
  const snapshots = [...groupedSupplyItems.entries()].map(([dateKey, items]) => {
    const date = safeParseDate(`${dateKey}T00:00:00Z`);
    const featureScores = scoreFeatures(items);
    const weights = buildDynamicWeights(featureScores);
    const relations = buildDynamicRelations(featureScores);

    return {
      id: dateKey,
      label: formatLongDate(date),
      shortLabel: formatShortDate(date),
      title: buildSnapshotTitle(featureScores),
      summary: buildSnapshotSummary(items, featureScores),
      weights,
      relations,
      sources: [...items]
        .sort((a, b) => b.parsedDate - a.parsedDate)
        .slice(0, 6)
        .map((item) => ({
          source: normalizeSourceName(item.source),
          date: item.parsedDate.toISOString().slice(0, 10),
          title: item.title
        }))
    };
  });

  return snapshots.length ? snapshots : fallbackSnapshots;
})();

const fallbackNetworkSnapshots = snapshotConfigs.map((snapshot) => ({
  ...snapshot,
  nodes: buildSnapshotNodes(snapshot.weights),
  persons: buildSnapshotNodes(snapshot.weights)
}));

const timeWindowOptions = [
  { label: '当前切片', value: 'current' },
  { label: '最近两期', value: 'recent' },
  { label: '累计至今', value: 'all' }
];

const datasetCoverageText = (() => {
  const dates = [...groupedSupplyItems.keys()].sort();
  if (!dates.length) return '数据来源：前端内置供应链样例 | 当前使用兜底时间线';
  const totalItems = [...groupedSupplyItems.values()].reduce((sum, items) => sum + items.length, 0);
  return `数据来源：采购/BOM/物流/质量/外部风险情报 | 共 ${totalItems} 条供应链风险事件 | 覆盖 ${dates[0]} 至 ${dates[dates.length - 1]}`;
})();

const apiGraphData = ref(null);
const networkKeyword = ref('battery');
const networkLoading = ref(false);
const networkError = ref('');
const networkProgress = ref(0);
const networkStage = ref('');
const networkJobId = ref('');
const networkJobStatus = ref('idle');
const keywordOptions = ref([]);
const extractionModeOptions = [
  { value: 'precision', label: '精确识别（低噪声）' },
  { value: 'recall', label: '全量识别（高召回）' }
];
const extractionMode = ref('precision');
const expansionEnabled = ref(true);
const expansionDepth = ref(2);
const expansionSeedsPerLayer = ref(12);
const expansionDocsPerSeed = ref(50);
const expansionCrawlExternal = ref(true);
const subjectsExpanded = ref(false);
let networkPollTimer = null;

const resolvedCoverageText = computed(() => apiGraphData.value?.coverage_text || datasetCoverageText);
const heroTitle = computed(() => `${(networkKeyword.value || 'automotive').toUpperCase()} 汽车供应链风险传播与韧性分析`);
const extractionModeHint = computed(() =>
  extractionMode.value === 'recall'
    ? '尽可能多召回供应商、物料、工厂、物流节点，适合全量排查'
    : '优先高置信供应链节点，减少噪声，适合精确研判'
);
const expansionHint = computed(() =>
  expansionEnabled.value
    ? `已开启上下游扩展（层级 ${expansionDepth.value}，${expansionCrawlExternal.value ? '可接入外部情报' : '仅数据库扩展'}）`
    : '关闭后仅基于当前语料识别供应链节点'
);
const expansionConfig = computed(() => ({
  enabled: expansionEnabled.value,
  max_depth: expansionDepth.value,
  seeds_per_layer: expansionSeedsPerLayer.value,
  docs_per_seed: expansionDocsPerSeed.value,
  crawl_external: expansionCrawlExternal.value
}));
const resolvedSnapshots = computed(() => {
  const snapshots = apiGraphData.value?.snapshots;
  if (Array.isArray(snapshots) && snapshots.length) {
    return snapshots.map((snapshot) => ({
      ...snapshot,
      nodes: snapshot.nodes || snapshot.persons || []
    }));
  }
  return fallbackNetworkSnapshots;
});
const resolvedNodeProfiles = computed(() => {
  if (Array.isArray(apiGraphData.value?.nodes) && apiGraphData.value.nodes.length) {
    return Object.fromEntries(apiGraphData.value.nodes.map((node) => [node.id, node]));
  }
  return supplyNodeProfiles;
});
const recognizedSubjects = computed(() =>
  Object.values(resolvedNodeProfiles.value || {}).sort((a, b) => (b.weight || b.baseWeight || 0) - (a.weight || a.baseWeight || 0))
);
const visibleSubjects = computed(() =>
  subjectsExpanded.value ? recognizedSubjects.value : recognizedSubjects.value.slice(0, 8)
);
const networkCacheHint = computed(() => {
  if (networkJobStatus.value === 'done') return '已完成最新一轮供应链节点识别、依赖关系抽取与风险传播计算。';
  if (apiGraphData.value?.generated_at) return `当前优先展示已存储结果，生成时间：${apiGraphData.value.generated_at}`;
  return '';
});

const activeSnapshotIndex = ref(Math.max(0, resolvedSnapshots.value.length - 1));
const searchKeyword = ref('');
const minRisk = ref(60);
const allNodeTypes = computed(() => [...new Set(resolvedSnapshots.value.flatMap((item) => (item.nodes || item.persons || []).map((node) => node.type)).filter(Boolean))]);
const allRelationTypes = computed(() => [...new Set(resolvedSnapshots.value.flatMap((item) => (item.relations || []).map((relation) => relation.type)).filter(Boolean))]);
const selectedNodeTypes = ref([]);
const selectedRelationTypes = ref([]);
const timeWindowMode = ref('current');
const selectedNodeId = ref('');
const networkChartRef = ref(null);

const timelineMarks = computed(() => Object.fromEntries(
  resolvedSnapshots.value.map((snapshot, idx) => [idx, snapshot.shortLabel || snapshot.label || String(idx)])
));

const activeSnapshot = computed(() => resolvedSnapshots.value[activeSnapshotIndex.value] || resolvedSnapshots.value[0] || fallbackNetworkSnapshots[0]);

const timeWindowText = computed(() => {
  const current = activeSnapshot.value.label;
  if (timeWindowMode.value === 'current') return `${current} 当前切片`;
  if (timeWindowMode.value === 'recent') {
    const startIdx = Math.max(0, activeSnapshotIndex.value - 1);
    return `${resolvedSnapshots.value[startIdx].label} - ${current}`;
  }
  return `${resolvedSnapshots.value[0].label} - ${current}`;
});

const windowSnapshots = computed(() => {
  if (timeWindowMode.value === 'current') return [activeSnapshot.value];
  if (timeWindowMode.value === 'recent') {
    const startIdx = Math.max(0, activeSnapshotIndex.value - 1);
    return resolvedSnapshots.value.slice(startIdx, activeSnapshotIndex.value + 1);
  }
  return resolvedSnapshots.value.slice(0, activeSnapshotIndex.value + 1);
});

const filteredGraph = computed(() => {
  const nodeMap = new Map();
  const linkMap = new Map();
  const activeNodes = activeSnapshot.value.nodes || activeSnapshot.value.persons || [];
  const latestNodeMap = new Map(activeNodes.map((item) => [item.id, item]));

  windowSnapshots.value.forEach((snapshot) => {
    const nodes = snapshot.nodes || snapshot.persons || [];
    nodes.forEach((node) => {
      if (!selectedNodeTypes.value.includes(node.type)) return;
      const existing = nodeMap.get(node.id);
      const latest = latestNodeMap.get(node.id) || node;
      const adjustedWeight = adjustNodeWeight(latest, Math.max(node.weight || node.baseWeight || 50, latest.weight || latest.baseWeight || 50));
      if (!existing) {
        nodeMap.set(node.id, { ...latest, weight: adjustedWeight });
      } else {
        existing.weight = Math.max(existing.weight, adjustedWeight);
      }
    });

    (snapshot.relations || []).forEach((relation) => {
      const sourceNode = latestNodeMap.get(relation.source) || resolvedNodeProfiles.value[relation.source];
      const targetNode = latestNodeMap.get(relation.target) || resolvedNodeProfiles.value[relation.target];
      const adjustedStrength = adjustRelationStrength(relation, sourceNode, targetNode);
      if (!selectedRelationTypes.value.includes(relation.type) || adjustedStrength < minRisk.value) return;
      if (!nodeMap.has(relation.source) || !nodeMap.has(relation.target)) return;
      const pairKey = [relation.source, relation.target].sort().join('__') + `__${relation.type}`;
      const existing = linkMap.get(pairKey);
      if (!existing) {
        linkMap.set(pairKey, { ...relation, strength: adjustedStrength, snapshots: [snapshot.label] });
      } else {
        existing.strength = Math.round((existing.strength + adjustedStrength) / 2);
        existing.snapshots.push(snapshot.label);
      }
    });
  });

  let nodes = [...nodeMap.values()];
  let links = [...linkMap.values()];

  const keyword = searchKeyword.value.trim().toLowerCase();
  if (keyword) {
    const matchedIds = new Set(
      nodes
        .filter((node) => {
          const haystack = [node.name, node.organization, node.type, node.title, node.camp, ...(node.tags || []), ...(node.aliases || [])]
            .join(' ')
            .toLowerCase();
          return haystack.includes(keyword);
        })
        .map((node) => node.id)
    );

    if (matchedIds.size) {
      links.forEach((link) => {
        if (matchedIds.has(link.source) || matchedIds.has(link.target)) {
          matchedIds.add(link.source);
          matchedIds.add(link.target);
        }
      });
      nodes = nodes.filter((node) => matchedIds.has(node.id));
      links = links.filter((link) => matchedIds.has(link.source) && matchedIds.has(link.target));
    } else {
      nodes = [];
      links = [];
    }
  }

  const activeNodeIds = new Set(nodes.map((node) => node.id));
  links = links.filter((link) => activeNodeIds.has(link.source) && activeNodeIds.has(link.target));

  return { nodes, links };
});

const filteredNodes = computed(() => filteredGraph.value.nodes);
const filteredLinks = computed(() => filteredGraph.value.links);

const crossTierLinkCount = computed(() =>
  filteredLinks.value.filter((link) => {
    const sourceNode = filteredNodes.value.find((node) => node.id === link.source);
    const targetNode = filteredNodes.value.find((node) => node.id === link.target);
    return sourceNode && targetNode && sourceNode.tier !== targetNode.tier;
  }).length
);

const bottleneckNodes = computed(() => filteredNodes.value.filter((node) => ['关键零部件', '二级供应商', '原材料'].includes(node.type)));
const substituteLinks = computed(() => filteredLinks.value.filter((link) => link.type === '替代供应'));
const exclusiveLinks = computed(() => filteredLinks.value.filter((link) => link.type === '独家供应'));

const degreeMap = computed(() => {
  const map = new Map();
  filteredNodes.value.forEach((node) => {
    map.set(node.id, { degree: 0, weightedDegree: 0, bottleneckScore: 0 });
  });

  filteredLinks.value.forEach((link) => {
    const sourceNode = filteredNodes.value.find((node) => node.id === link.source);
    const targetNode = filteredNodes.value.find((node) => node.id === link.target);
    const source = map.get(link.source);
    const target = map.get(link.target);

    if (!source || !target || !sourceNode || !targetNode) return;
    source.degree += 1;
    target.degree += 1;
    source.weightedDegree += link.strength;
    target.weightedDegree += link.strength;

    const isBottleneck = sourceNode.tier !== targetNode.tier || ['独家供应', 'BOM依赖', '产能依赖'].includes(link.type);
    if (isBottleneck) {
      source.bottleneckScore += link.strength;
      target.bottleneckScore += link.strength;
    }
  });

  return map;
});

const influenceRanking = computed(() =>
  filteredNodes.value
    .map((node) => {
      const degree = degreeMap.value.get(node.id) || { degree: 0, weightedDegree: 0, bottleneckScore: 0 };
      const score = Math.round(node.weight * 0.55 + degree.weightedDegree * 0.25 + degree.bottleneckScore * 0.2);
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        score,
        weightedDegree: degree.weightedDegree,
        bottleneckScore: degree.bottleneckScore
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
);

const topInfluencer = computed(() => influenceRanking.value[0]);

const visibleSources = computed(() => {
  const sources = activeSnapshot.value.sources || [];
  const filtered = sources.filter((item) => scEnabledDomains.value.includes(classifySourceDomain(item)));
  return filtered.length ? filtered : sources.slice(0, 4);
});

const averageRelationStrength = computed(() => {
  if (!filteredLinks.value.length) return 0;
  const total = filteredLinks.value.reduce((sum, item) => sum + item.strength, 0);
  return Math.round(total / filteredLinks.value.length);
});

const substitutionCoverage = computed(() => {
  if (!filteredLinks.value.length) return 0;
  return Math.round((substituteLinks.value.length / filteredLinks.value.length) * 100);
});

const scMetricCards = computed(() => {
  if (scSelectedMandate.value === 'bottleneck') {
    return [
      { label: '瓶颈节点', value: bottleneckNodes.value.length, desc: '当前窗口内识别到的零部件、二级供应商与原材料瓶颈' },
      { label: '单点依赖', value: exclusiveLinks.value.length, desc: '缺少成熟替代方案的独家或强依赖链路' },
      { label: '平均风险', value: averageRelationStrength.value, desc: '依赖边风险均值，用于观察停线压力' },
      { label: '高风险物料', value: bottleneckNodes.value[0]?.name || '--', desc: '当前最值得优先补链的瓶颈对象' }
    ];
  }
  if (scSelectedMandate.value === 'risk_propagation') {
    return [
      { label: '供应节点', value: filteredNodes.value.length, desc: '当前窗口内识别到的供应链关键节点' },
      { label: '风险链路', value: filteredLinks.value.length, desc: '满足筛选条件的依赖风险边' },
      { label: '平均传播强度', value: averageRelationStrength.value, desc: '风险沿上下游传导的平均强度' },
      { label: '传播中心', value: topInfluencer.value?.name || '--', desc: '当前最可能放大风险的核心节点' }
    ];
  }
  if (scSelectedMandate.value === 'resilience') {
    return [
      { label: '替代覆盖率', value: `${substitutionCoverage.value}%`, desc: '当前有效链路中具备替代关系的比例' },
      { label: '冗余链路', value: substituteLinks.value.length, desc: '可用于风险对冲的替代供应或冗余路径' },
      { label: '平均风险', value: averageRelationStrength.value, desc: '韧性建设前需优先压降的关系风险均值' },
      { label: '优先补链', value: vulnerabilityReport.value[0]?.name || '--', desc: '当前最需要建立替代方案的节点' }
    ];
  }
  return [
    { label: '供应节点', value: filteredNodes.value.length, desc: '当前窗口内识别到的供应商、工厂、物料与物流节点' },
    { label: '关键依赖', value: filteredLinks.value.length, desc: '满足筛选条件的高风险依赖边' },
    { label: '跨层级链路', value: crossTierLinkCount.value, desc: '连接 OEM、Tier1、Tier2、原材料和物流的跨层级链路' },
    { label: '关键供应商', value: topInfluencer.value?.name || '--', desc: '综合关键度与加权依赖得到' }
  ];
});

const selectedNode = computed(() => {
  if (!filteredNodes.value.length) return null;
  const match = filteredNodes.value.find((node) => node.id === selectedNodeId.value);
  return match || filteredNodes.value[0];
});

const selectedNodeConnections = computed(() => {
  if (!selectedNode.value) return [];
  const nameMap = new Map(filteredNodes.value.map((node) => [node.id, node.name]));

  return filteredLinks.value
    .filter((link) => link.source === selectedNode.value.id || link.target === selectedNode.value.id)
    .map((link) => {
      const counterpartId = link.source === selectedNode.value.id ? link.target : link.source;
      return { ...link, counterpart: nameMap.get(counterpartId) || counterpartId };
    })
    .sort((a, b) => b.strength - a.strength);
});

const coreCircleDefinitions = [
  { name: '动力电池链', members: ['lithium_material', 'catl_battery', 'plant_xian', 'oem_byd'] },
  { name: '车规芯片链', members: ['infineon_mcu', 'sic_power', 'bosch_brake', 'plant_xian'] },
  { name: '制造与物流链', members: ['wire_harness', 'thermal_system', 'plant_xian', 'ningbo_port', 'oem_byd'] }
];

const coreCircleAnalysis = computed(() => {
  if (Array.isArray(apiGraphData.value?.communities) && apiGraphData.value.communities.length) return apiGraphData.value.communities;
  return coreCircleDefinitions
    .map((circle) => {
      const activeMembers = circle.members.filter((memberId) => filteredNodes.value.some((node) => node.id === memberId));
      if (activeMembers.length < 2) return null;

      const internalLinks = filteredLinks.value.filter((link) => activeMembers.includes(link.source) && activeMembers.includes(link.target));
      const possibleLinks = (activeMembers.length * (activeMembers.length - 1)) / 2;
      const density = possibleLinks ? Math.round((internalLinks.length / possibleLinks) * 100) : 0;
      const averageStrength = internalLinks.length
        ? Math.round(internalLinks.reduce((sum, item) => sum + item.strength, 0) / internalLinks.length)
        : 0;

      const coordinator = activeMembers
        .map((memberId) => {
          const node = filteredNodes.value.find((item) => item.id === memberId);
          const metrics = degreeMap.value.get(memberId) || { weightedDegree: 0 };
          return { name: node?.name || memberId, weightedDegree: metrics.weightedDegree };
        })
        .sort((a, b) => b.weightedDegree - a.weightedDegree)[0]?.name || '--';

      return {
        name: circle.name,
        members: activeMembers.map((memberId) => resolvedNodeProfiles.value[memberId]?.name || memberId),
        density,
        averageStrength,
        coordinator
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.density - a.density);
});

const peripheralNodes = computed(() =>
  filteredNodes.value
    .map((node) => {
      const metrics = degreeMap.value.get(node.id) || { degree: 0, weightedDegree: 0 };
      return { id: node.id, name: node.name, degree: metrics.degree, weightedDegree: metrics.weightedDegree };
    })
    .sort((a, b) => a.degree - b.degree || a.weightedDegree - b.weightedDegree)
    .slice(0, 3)
);

const alternativePathMap = {
  catl_battery: '第二电池供应商 -> 电池包平台复用 -> 车型排产重平衡',
  infineon_mcu: '替代 MCU 型号 -> 控制器软件适配 -> 安全件重新验证',
  sic_power: 'IGBT 备选平台 -> 电驱系统降配方案 -> 高压平台验证',
  lithium_material: '多区域锂盐供应 -> 长协锁价 -> 安全库存提升',
  ningbo_port: '上海港/太仓港分流 -> 铁水联运 -> 海外仓缓冲',
  plant_xian: '兄弟工厂转产 -> 关键物料优先配给 -> 车型组合调整',
  wire_harness: '区域第二线束厂 -> 标准化线束平台 -> 人员外协爬坡',
  thermal_system: '替代模块供应商 -> 跨车型质量隔离 -> 售后批次追溯'
};

const vulnerabilityReport = computed(() =>
  (Array.isArray(apiGraphData.value?.risks) && apiGraphData.value.risks.length ? apiGraphData.value.risks : filteredNodes.value
    .map((node) => {
      const metrics = degreeMap.value.get(node.id) || { bottleneckScore: 0, degree: 0, weightedDegree: 0 };
      const riskScore = metrics.bottleneckScore + Math.round(node.weight * 0.4);
      const riskLevel = riskScore >= 115 ? '高风险断点' : riskScore >= 85 ? '中风险断点' : '观察节点';
      return {
        id: node.id,
        name: node.name,
        riskScore,
        riskLevel,
        reason:
          metrics.bottleneckScore > 0
            ? `瓶颈值 ${metrics.bottleneckScore}，一旦异常将影响 ${node.camp} 与上下游节点的供应连续性。`
            : `节点关键度 ${node.weight}，但跨层级依赖较少，更多体现为局部影响。`,
        alternativePath: alternativePathMap[node.id] || '建立第二供应源、提高安全库存、扩展区域冗余与替代物流路径'
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 4))
);

let chartInstance = null;

const renderNetworkChart = () => {
  if (!networkChartRef.value) return;
  if (!chartInstance) chartInstance = echarts.init(networkChartRef.value);

  const categories = allNodeTypes.value.map((type) => ({ name: type }));
  const categoryIndexMap = new Map(allNodeTypes.value.map((type, idx) => [type, idx]));

  const option = {
    backgroundColor: 'transparent',
    animationDuration: 700,
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.dataType === 'node') {
          const node = params.data;
          return `
            <div style="font-weight:600;margin-bottom:6px;">${node.name}</div>
            <div>类型：${node.type}</div>
            <div>组织/品类：${node.organization}</div>
            <div>关键度：${node.value}</div>
          `;
        }
        if (params.dataType === 'edge') {
          const edge = params.data;
          return `
            <div style="font-weight:600;margin-bottom:6px;">${edge.sourceName} - ${edge.targetName}</div>
            <div>关系：${edge.relationType}</div>
            <div>风险强度：${edge.value}</div>
            <div>窗口：${edge.snapshots?.join(' / ') || '--'}</div>
          `;
        }
        return '';
      }
    },
    legend: { show: false, data: categories.map((item) => item.name) },
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        force: {
          repulsion: 520,
          edgeLength: [120, 230],
          gravity: 0.08
        },
        label: {
          show: true,
          color: '#0f172a',
          fontSize: 12,
          formatter: '{b}'
        },
        emphasis: {
          scale: true,
          focus: 'adjacency',
          lineStyle: { width: 5 }
        },
        categories,
        data: filteredNodes.value.map((node) => ({
          ...node,
          category: categoryIndexMap.get(node.type) || 0,
          symbolSize: Math.max(34, Math.round(node.weight * 0.72)),
          value: node.weight,
          itemStyle: {
            color: nodeColorMap[node.type] || '#64748b',
            borderColor: selectedNode.value?.id === node.id ? '#111827' : '#ffffff',
            borderWidth: selectedNode.value?.id === node.id ? 4 : 2,
            shadowBlur: 18,
            shadowColor: 'rgba(15, 23, 42, 0.15)'
          }
        })),
        links: filteredLinks.value.map((link) => ({
          source: link.source,
          target: link.target,
          value: link.strength,
          relationType: link.type,
          sourceName: resolvedNodeProfiles.value[link.source]?.name || link.source,
          targetName: resolvedNodeProfiles.value[link.target]?.name || link.target,
          snapshots: link.snapshots,
          lineStyle: {
            width: Math.max(2, Math.round(link.strength / 14)),
            color: relationColorMap[link.type] || '#94a3b8',
            opacity: 0.82,
            curveness: 0.12
          }
        }))
      }
    ]
  };

  chartInstance.setOption(option, true);
  chartInstance.off('click');
  chartInstance.on('click', (params) => {
    if (params.dataType === 'node' && params.data?.id) selectedNodeId.value = params.data.id;
  });
  chartInstance.resize();
};

const resetFilters = () => {
  searchKeyword.value = '';
  minRisk.value = 60;
  timeWindowMode.value = 'current';
  selectedNodeTypes.value = [...allNodeTypes.value];
  selectedRelationTypes.value = [...allRelationTypes.value];
  activeSnapshotIndex.value = Math.max(0, resolvedSnapshots.value.length - 1);
  selectedNodeId.value = '';
};

const applyGraphData = (graph) => {
  if (!graph) return;
  apiGraphData.value = graph;
  activeSnapshotIndex.value = Math.max(0, (graph.snapshots || []).length - 1);
  selectedNodeId.value = '';
};

const loadSupplyChainNetwork = async () => {
  networkLoading.value = true;
  networkError.value = '';
  try {
    const res = await request.get('/powerGame/supply_chain/network', {
      params: {
        keyword: networkKeyword.value?.trim() || 'battery',
        extraction_mode: extractionMode.value,
        expansion_enabled: expansionConfig.value.enabled ? 1 : 0,
        expansion_depth: expansionConfig.value.max_depth,
        expansion_seeds_per_layer: expansionConfig.value.seeds_per_layer,
        expansion_docs_per_seed: expansionConfig.value.docs_per_seed,
        expansion_crawl_external: expansionConfig.value.crawl_external ? 1 : 0,
        force_refresh: false
      },
      timeout: 0
    });
    if (res?.success && res.data) {
      apiGraphData.value = res.data;
      activeSnapshotIndex.value = Math.max(0, (res.data.snapshots || []).length - 1);
      selectedNodeId.value = '';
      networkStage.value = res.cached
        ? `已读取已存储的供应链网络结果（${extractionMode.value === 'recall' ? '全量识别' : '精确识别'}）`
        : '已生成最新供应链网络';
      networkProgress.value = 100;
      networkJobStatus.value = 'done';
    } else {
      networkStage.value = '暂无已存储供应链网络，可点击“重建供应链网络”开始分析';
      networkProgress.value = 0;
      networkJobStatus.value = 'idle';
    }
  } catch (error) {
    networkError.value = `读取已存储供应链网络失败：${error?.message || '请求异常'}，当前已切换到前端内置示例数据。`;
    networkStage.value = '';
    networkProgress.value = 0;
    networkJobStatus.value = 'idle';
  } finally {
    networkLoading.value = false;
  }
};

const clearNetworkPollTimer = () => {
  if (networkPollTimer) {
    window.clearTimeout(networkPollTimer);
    networkPollTimer = null;
  }
};

const pollSupplyChainJob = async (jobId) => {
  try {
    const res = await request.get(`/powerGame/supply_chain/network/jobs/${jobId}`, { timeout: 0 });
    if (!res?.success || !res.data) throw new Error(res?.message || '任务状态读取失败');
    const job = res.data;
    networkJobId.value = job.job_id || jobId;
    networkProgress.value = Number(job.progress || 0);
    networkStage.value = job.stage || '任务执行中';
    networkJobStatus.value = job.status || 'running';
    if (job.status === 'done') {
      if (res.graph) applyGraphData(res.graph);
      clearNetworkPollTimer();
      return;
    }
    if (job.status === 'failed') {
      networkError.value = `供应链网络分析失败：${job.error || '未知错误'}`;
      clearNetworkPollTimer();
      return;
    }
    clearNetworkPollTimer();
    networkPollTimer = window.setTimeout(() => pollSupplyChainJob(jobId), 1500);
  } catch (error) {
    networkError.value = `轮询分析进度失败：${error?.message || '请求异常'}`;
    networkJobStatus.value = 'failed';
    clearNetworkPollTimer();
  }
};

const startSupplyChainAnalysis = async () => {
  networkLoading.value = true;
  networkError.value = '';
  networkProgress.value = 2;
  networkStage.value = `正在创建供应链网络分析任务（${extractionMode.value === 'recall' ? '全量识别' : '精确识别'}，扩展层级 ${expansionConfig.value.max_depth}）`;
  networkJobStatus.value = 'pending';
  clearNetworkPollTimer();
  try {
    const res = await request.post('/powerGame/supply_chain/network/jobs', {
      keyword: networkKeyword.value?.trim() || 'battery',
      extraction_mode: extractionMode.value,
      expansion_config: expansionConfig.value,
      force_refresh: true
    }, { timeout: 0 });
    if (!res?.success) throw new Error(res?.message || '任务创建失败');
    if (res.cached && res.data) {
      applyGraphData(res.data);
      networkProgress.value = 100;
      networkStage.value = '已直接读取已存储供应链网络';
      networkJobStatus.value = 'done';
      return;
    }
    const jobId = res.job_id || res.job?.job_id;
    if (!jobId) throw new Error('未返回任务 ID');
    networkJobId.value = jobId;
    networkProgress.value = Number(res.job?.progress || 5);
    networkStage.value = res.job?.stage || '任务已创建，等待执行';
    networkJobStatus.value = res.job?.status || 'pending';
    await pollSupplyChainJob(jobId);
  } catch (error) {
    networkError.value = `供应链网络构建失败：${error?.message || '请求异常'}，当前继续展示已存储或前端示例数据。`;
    networkJobStatus.value = 'failed';
  } finally {
    networkLoading.value = false;
  }
};

const fetchKeywordOptions = async () => {
  try {
    const res = await request.get('/powerGame/supply_chain/keywords');
    keywordOptions.value = Array.isArray(res?.data) ? res.data : [];
    if (!networkKeyword.value && keywordOptions.value.length) networkKeyword.value = keywordOptions.value[0].value;
  } catch (error) {
    keywordOptions.value = [
      { label: '动力电池', value: 'battery', source: 'default' },
      { label: '车规芯片', value: 'chip', source: 'default' },
      { label: '物流交付', value: 'logistics', source: 'default' },
      { label: '原材料', value: 'material', source: 'default' }
    ];
  }
};

const handleResize = () => chartInstance?.resize();

watch(
  [filteredNodes, filteredLinks, activeSnapshotIndex, timeWindowMode, selectedNode],
  async () => {
    await nextTick();
    renderNetworkChart();
  },
  { deep: true }
);

watch(
  allNodeTypes,
  (types) => {
    if (!types.length) {
      selectedNodeTypes.value = [];
      return;
    }
    if (!selectedNodeTypes.value.length || selectedNodeTypes.value.some((item) => !types.includes(item))) {
      selectedNodeTypes.value = [...types];
    }
  },
  { immediate: true }
);

watch(
  allRelationTypes,
  (types) => {
    if (!types.length) {
      selectedRelationTypes.value = [];
      return;
    }
    if (!selectedRelationTypes.value.length || selectedRelationTypes.value.some((item) => !types.includes(item))) {
      selectedRelationTypes.value = [...types];
    }
  },
  { immediate: true }
);

watch(
  filteredNodes,
  (nodes) => {
    if (!nodes.length) {
      selectedNodeId.value = '';
      return;
    }
    if (!nodes.some((node) => node.id === selectedNodeId.value)) selectedNodeId.value = nodes[0].id;
  },
  { immediate: true, deep: true }
);

watch(
  extractionMode,
  async () => {
    if (extractionMode.value === 'recall') {
      expansionEnabled.value = true;
      expansionCrawlExternal.value = true;
      if (expansionDepth.value < 2) expansionDepth.value = 2;
      if (expansionSeedsPerLayer.value < 12) expansionSeedsPerLayer.value = 12;
      if (expansionDocsPerSeed.value < 50) expansionDocsPerSeed.value = 50;
    }
    clearNetworkPollTimer();
    networkError.value = '';
    networkJobStatus.value = 'idle';
    networkProgress.value = 0;
    networkStage.value = '已切换识别模式，正在读取对应结果...';
    await loadSupplyChainNetwork();
  }
);


onMounted(async () => {
  await fetchKeywordOptions();
  await loadSupplyChainNetwork();
  await nextTick();
  renderNetworkChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  clearNetworkPollTimer();
  window.removeEventListener('resize', handleResize);
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});
</script>

<style scoped>
.supply-network-page {
  min-height: 100%;
  padding: 20px;
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card,
.panel-card,
.metric-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.hero-card {
  padding: 28px 30px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  background:
    radial-gradient(circle at right top, rgba(37, 99, 235, 0.08), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.hero-main h1 {
  margin: 8px 0 10px;
  font-size: 30px;
  line-height: 1.2;
  color: #0f172a;
}

.hero-main p {
  margin: 0;
  max-width: 860px;
  font-size: 14px;
  line-height: 1.8;
  color: #475569;
}

.hero-meta {
  margin-top: 12px;
  font-size: 13px;
  color: #64748b;
}

.hero-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #2563eb;
  text-transform: uppercase;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric-card {
  padding: 20px 22px;
}

.metric-label {
  font-size: 13px;
  color: #64748b;
}

.metric-value {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.metric-desc {
  margin-top: 8px;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
}

.panel-card {
  padding: 22px 24px;
}

.card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.card-title-row.compact {
  margin-bottom: 18px;
}

.card-title-row h2 {
  margin: 0;
  font-size: 20px;
  color: #111827;
}

.card-title-row p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: #6b7280;
}

.reset-btn {
  border-radius: 10px;
}

.query-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) 220px minmax(260px, 1fr) 180px;
  gap: 14px;
  margin: 16px 0 8px;
  padding: 14px 16px;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  background: linear-gradient(180deg, #f8fbff 0%, #f5f9ff 100%);
}

.query-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.query-item label,
.filter-item label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.query-item.action {
  justify-content: flex-end;
}

.query-item.expansion-params {
  grid-column: span 2;
}

.expansion-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 10px;
}

.expansion-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.expansion-cell span {
  font-size: 12px;
  color: #64748b;
}

.query-scope-chip {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.keyword-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.keyword-option-source {
  color: #94a3b8;
  font-size: 11px;
  text-transform: uppercase;
}

.query-error {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #c2410c;
  font-size: 12px;
}

.progress-panel {
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
}

.progress-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.progress-title {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.progress-stage {
  margin-top: 4px;
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
}

.progress-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
}

.progress-meta strong {
  color: #0f172a;
  font-size: 18px;
}

.cache-hint {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  font-size: 12px;
}

.filters-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-span-2 {
  grid-column: span 2;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip-group :deep(.el-checkbox-button__inner) {
  border-radius: 999px !important;
  border: 1px solid #dbe2ea !important;
  box-shadow: none !important;
  padding: 8px 14px;
}

.timeline-wrap {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid #eef2f7;
  border-radius: 14px;
  background: #f8fafc;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.mini-title {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: 0.04em;
}

.timeline-summary {
  margin-top: 6px;
  font-size: 14px;
  color: #475569;
}

.timeline-current {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
  border: 1px solid #dbe2ea;
}

.timeline-cards {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.timeline-card {
  text-align: left;
  border: 1px solid #dbe2ea;
  background: #ffffff;
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.22s ease;
}

.timeline-card:hover,
.timeline-card.active {
  border-color: #2563eb;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.12);
  transform: translateY(-2px);
}

.timeline-card-date {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
}

.timeline-card-title {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.timeline-card-desc {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
}

.subject-panel {
  margin-top: 18px;
}

.subject-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.subject-card {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.subject-card:hover,
.subject-card.active {
  border-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(37, 99, 235, 0.12);
}

.subject-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.subject-name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.subject-weight {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
}

.subject-role {
  margin-top: 8px;
  font-size: 12px;
  color: #475569;
  line-height: 1.5;
}

.subject-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.subject-tag {
  padding: 3px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 0.95fr);
  gap: 20px;
}

.network-chart {
  margin-top: 18px;
  width: 100%;
  height: 620px;
}

.legend-group {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: #64748b;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.chart-note {
  margin-top: 14px;
  font-size: 13px;
  color: #64748b;
}

.side-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.profile-card {
  padding: 18px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.profile-name {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.profile-role {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.profile-desc {
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1.8;
  color: #475569;
}

.profile-tags {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-aliases {
  margin-top: 10px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.detail-section {
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

.connection-list,
.osint-feed,
.ranking-list,
.circle-list,
.vulnerability-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.connection-item,
.ranking-item,
.circle-item,
.vulnerability-item {
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e8edf3;
}

.connection-top,
.circle-top,
.ranking-top,
.vulnerability-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.connection-top span,
.circle-top span:first-child,
.ranking-top span:first-child,
.vulnerability-top span:first-child {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.connection-meta,
.circle-meta,
.ranking-meta,
.vulnerability-text,
.vulnerability-alt,
.osint-source,
.osint-title {
  font-size: 13px;
  line-height: 1.7;
  color: #64748b;
}

.connection-meta,
.circle-meta,
.vulnerability-text,
.vulnerability-alt,
.osint-title {
  margin-top: 6px;
}

.osint-item {
  padding: 12px 0;
  border-bottom: 1px dashed #e5e7eb;
}

.osint-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.osint-source {
  color: #2563eb;
}

.evidence-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.evidence-item {
  padding: 9px 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  color: #334155;
  line-height: 1.55;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.ranking-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.ranking-index {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(180deg, #1d4ed8, #2563eb);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.ranking-body {
  flex: 1;
}

.ranking-score {
  font-weight: 700;
  color: #1d4ed8;
}

.edge-title {
  margin-top: 18px;
}

.edge-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.risk-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #b91c1c;
  background: #fee2e2;
}

.empty-tip,
.empty-inline {
  font-size: 13px;
  color: #94a3b8;
}

/* ── 供应链数据治理面板 ──────────────────────────────────── */
.sc-gov-panel {
  margin: 0 0 8px;
  flex-shrink: 0;
  border: 1px solid #c7d7f4;
  border-left: 3px solid #0f766e;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8fbff 0%, #edfaf7 100%);
  overflow: hidden;
}

.sc-gov-panel.sc-gov-collapsed { border-left-color: #94b4e8; }

.sc-gov-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  gap: 12px;
}

.sc-gov-header:hover { background: rgba(15, 118, 110, 0.04); }
.sc-gov-header-left { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.sc-gov-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; animation: pulse-dot 2s infinite; }
.sc-gov-dot.status-good { background: #22c55e; }
.sc-gov-dot.status-warn { background: #f59e0b; }
.sc-gov-dot.status-poor { background: #ef4444; }
.sc-gov-title { font-size: 13px; font-weight: 700; color: #134e4a; letter-spacing: 0.01em; }
.sc-gov-phase-tag { font-size: 11px; padding: 1px 8px; border-radius: 999px; background: #ccfbf1; color: #0f766e; font-weight: 600; }
.sc-gov-header-right { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; justify-content: flex-end; }
.sc-gov-mandate-chip { font-size: 12px; font-weight: 600; color: #0f766e; background: #ccfbf1; padding: 2px 10px; border-radius: 999px; white-space: nowrap; }
.sc-gov-domain-summary { font-size: 12px; color: #6b7280; white-space: nowrap; }
.sc-gov-chevron { color: #6b7280; flex-shrink: 0; transition: transform 0.25s ease; }
.sc-gov-chevron.rotated { transform: rotate(180deg); }

.sc-gov-slide-enter-active,
.sc-gov-slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
  max-height: 600px;
  overflow: hidden;
}
.sc-gov-slide-enter-from,
.sc-gov-slide-leave-to { max-height: 0; opacity: 0; }

.sc-gov-body { padding: 0 16px 16px; border-top: 1px solid #99f6e4; }
.sc-gov-grid { display: grid; grid-template-columns: 1.1fr 1fr 0.9fr; gap: 16px; padding-top: 14px; }
.sc-gov-col-header { font-size: 11px; font-weight: 700; color: #4b5b7c; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #99f6e4; }
.sc-mandate-list { display: flex; flex-direction: column; gap: 8px; }
.sc-mandate-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.sc-mandate-item:hover { background: #f0fdf4; }
.sc-mandate-item.active { background: #f0fdf9; border-color: #5eead4; }
.sc-mandate-radio { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #94a3b8; flex-shrink: 0; margin-top: 2px; transition: border-color 0.15s; }
.sc-mandate-radio.active { border-color: #0f766e; background: radial-gradient(circle, #0f766e 40%, transparent 40%); }
.sc-mandate-label { font-size: 12.5px; font-weight: 600; color: #134e4a; line-height: 1.3; }
.sc-mandate-desc { font-size: 11px; color: #6b7280; margin-top: 2px; line-height: 1.5; }
.sc-domain-list { display: flex; flex-direction: column; gap: 7px; }
.sc-domain-row { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; border: 1px solid #e5edf8; background: #fff; cursor: pointer; transition: opacity 0.2s, border-color 0.15s; }
.sc-domain-row:hover { border-color: #5eead4; }
.sc-domain-row.sc-domain-off { opacity: 0.42; }
.sc-domain-check { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid #94a3b8; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background 0.15s, border-color 0.15s; }
.sc-domain-check.active { background: #0f766e; border-color: #0f766e; }
.sc-domain-info { flex: 1; min-width: 0; }
.sc-domain-name { font-size: 12px; font-weight: 600; color: #134e4a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-domain-coverage { font-size: 10.5px; color: #9ca3af; margin-top: 1px; }
.sc-domain-q-wrap { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.sc-domain-q-bar { width: 52px; height: 5px; background: #e5e7eb; border-radius: 99px; overflow: hidden; }
.sc-domain-q-fill { height: 100%; border-radius: 99px; transition: width 0.3s; }
.sc-domain-q-val { font-size: 11px; font-weight: 700; min-width: 30px; text-align: right; }
.sc-assume-list { display: flex; flex-direction: column; gap: 7px; }
.sc-assume-item { display: flex; gap: 8px; align-items: flex-start; font-size: 11.5px; line-height: 1.5; }
.sc-assume-index { flex-shrink: 0; width: 16px; height: 16px; border-radius: 50%; background: #0f766e; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
.sc-assume-text { color: #374151; }
.sc-gov-scope { margin-top: 12px; padding: 7px 10px; background: #f0fdf9; border-radius: 8px; border: 1px solid #99f6e4; }
.sc-gov-scope-label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 3px; }
.sc-gov-scope-val { font-size: 11.5px; color: #134e4a; font-weight: 600; }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}


@media (max-width: 1400px) {
  .metric-grid,
  .timeline-cards,
  .analysis-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filters-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .workspace-grid { grid-template-columns: 1fr; }
}

@media (max-width: 900px) {
  .supply-network-page { padding: 14px; }
  .hero-card,
  .card-title-row,
  .timeline-header { flex-direction: column; align-items: flex-start; }
  .metric-grid,
  .timeline-cards,
  .analysis-grid,
  .filters-grid,
  .query-toolbar,
  .sc-gov-grid { grid-template-columns: 1fr; }
  .filter-span-2 { grid-column: span 1; }
  .query-item.expansion-params { grid-column: span 1; }
  .network-chart { height: 460px; }
}
</style>
