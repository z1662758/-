<template>
  <div class="supply-page">
    <header class="page-header">
      <div>
        
        <div class="snapshot-status" :class="{ error: !!snapshotError, loading: loadingSnapshot || recomputing }">
          <template v-if="loadingSnapshot || recomputing">{{ recomputing ? '正在重新计算态势图…' : '正在加载后端态势快照…' }}</template>
          <template v-else-if="snapshotError">{{ snapshotError }}</template>
          <template v-else-if="recomputeMessage">{{ recomputeMessage }}</template>
        </div>
      </div>

      <div class="header-right">
        <!-- K2-UI-RISK-2:正式态势固定 REAL,移除模式切换(§8) -->
      </div>
    </header>

    <ChinaCurrentSituationBar v-if="mode === 'real'" />

    

    <main class="main-layout">
      <section class="map-panel">
        <div class="map-topbar">
          <div class="filter-buttons">
            <button
              class="label-toggle"
              :class="{ active: showNodeLabels }"
              @click="toggleNodeLabels"
            >
              {{ showNodeLabels ? '隐藏节点名称' : '显示节点名称' }}
            </button>
          </div>

          <div class="snapshot-controls">
            <button
              class="snapshot-btn"
              :disabled="loadingSnapshot || recomputing"
              @click="loadLatestSnapshot"
            >{{ loadingSnapshot ? '加载中…' : '加载最新态势图' }}</button>
            <button
              class="snapshot-btn primary"
              :disabled="recomputing"
              @click="handleRecompute"
            >{{ recomputing ? '计算中…' : '重新计算态势图' }}</button>
            <span v-if="snapshotMeta && snapshotMeta.generated_at" class="snapshot-time"
                  :title="'snapshot_id: ' + (snapshotMeta.snapshot_id || '')">
              快照 {{ snapshotMeta.osint_mode || 'REAL' }} · {{ snapshotMeta.generated_at }}
              <span v-if="snapshotMeta.is_official_runtime_view" class="snapshot-ok">✓ 正式视图</span>
            </span>
          </div>

          
        </div>

        <div ref="chartRef" class="chart"></div>

        <div class="legend">
          <span><i class="node low"></i>低风险</span>
          <span><i class="node medium"></i>中风险</span>
          <span><i class="node high"></i>高风险</span>
          <span><i class="line"></i>供应链路径</span>
        </div>
      </section>

      <aside class="side-panel">
        <!-- K2-UI-RISK-1:非 REAL 快照警告(§58-59) -->
        <div v-if="snapshotData && !snapshotIsReal" class="mode-warning">
          ⚠ 非正式模拟数据(osint_mode={{ snapshotMode }});不作为当前态势
        </div>

        <!-- 当前研判:全局 / 当前路线(§17-19/§51) -->
        <section class="panel k2-head-panel">
          <div class="k2-head-row">
            <h2>当前研判</h2>
            <span class="k2-sub">{{ activeRouteId === 'all' ? '全局态势' : currentRouteName + ' → 中国' }}</span>
            <button v-if="activeRouteId !== 'all'" class="k2-back-btn" @click="changeRoute('all')">← 全局</button>
          </div>

          <!-- 全局态势(§20-21) -->
          <div v-if="activeRouteId === 'all'" class="k2-global-overview">
            <div class="k2-route-stats">
              <span>路线 <b>{{ routes.length }}</b></span>
              <span>高风险 <b class="high">{{ routeStats.high }}</b></span>
              <span>中风险 <b class="medium">{{ routeStats.medium }}</b></span>
              <span>低风险 <b class="low">{{ routeStats.low }}</b></span>
            </div>
            <div v-if="routeRanking.length" class="k2-top-route">
              最高风险路线:<b>{{ routeRanking[0].country }}</b>
              <span :class="['risk-tag', routeRanking[0].level]">{{ riskText(routeRanking[0].level) }}</span>
              <b class="k2-top-risk">{{ num(routeRanking[0].displayRisk) }}</b>
            </div>
            <div class="k2-osint-sum">
              REAL OSINT:<b>{{ osintSummary.effective }}</b> Effective /
              <b>{{ osintSummary.registered }}</b> Registered
            </div>
          </div>

          <!-- 当前路线(§26/§29/§34) -->
          <div v-else-if="currentRoute" class="k2-route-overview">
            <div class="k2-route-tags">
              <span :class="['risk-tag', currentRoute.riskLevel]">{{ riskText(currentRoute.riskLevel) }}</span>
              <span class="k2-transport">运输:{{ currentRoute.transport }}</span>
            </div>
            <div class="k2-scores">
              <span>展示风险<b>{{ num(currentRoute.display_risk_score ?? currentRoute.risk_score ?? 0) }}</b></span>
              <span>原始风险<b>{{ num(currentRoute.raw_risk_score ?? currentRoute.risk_score ?? 0) }}</b></span>
              <span>校准<b>{{ routeCalibrationMethod(currentRoute) }}</b></span>
            </div>
            <div class="k2-route-meta">
              <span>OSINT:{{ routeOsintEventCount(currentRoute) }}</span>
              <span>关键节点:{{ routeKeyRiskPoints(currentRoute).length }}</span>
              <span v-if="routeEvidenceMap[currentRoute.id]">证据:{{ routeEvidenceMap[currentRoute.id].evidence_level }}</span>
            </div>
            <!-- K2-RISK-REAL-1:经验校准概率(§45-49) -->
            <div class="k2-empirical" v-if="currentRoute.empirical_probability_90d != null">
              <span>经验 90 天扰动概率</span>
              <b>{{ (currentRoute.empirical_probability_90d * 100).toFixed(0) }}%</b>
              <span class="k2-emp-method">校准:经验分箱 · n={{ empiricalSampleNote }}</span>
            </div>
            <div v-else class="k2-empirical k2-emp-accum">
              <span>经验 90 天扰动概率</span>
              <b>数据积累中</b>
              <span class="k2-emp-method">历史实证校准未就绪(样本不足),不显示假 0%(§49)</span>
            </div>
          </div>
        </section>

        <!-- 路线筛选(全局 + 国家):仅筛选,不重复供应占比(顶部已有) -->
        <section class="panel k2-route-select-panel">
          <div class="k2-route-panel-title">路线筛选</div>
          <div class="k2-route-chips">
            <button :class="['k2-chip', { active: activeRouteId === 'all' }]" @click="changeRoute('all')">全局</button>
            <button
              v-for="r in routes"
              :key="r.id"
              :class="['k2-chip', { active: activeRouteId === r.id }]"
              @click="changeRoute(r.id)"
            >{{ r.country }}</button>
          </div>
        </section>

        <!-- 风险解释:Tab(§30/§46:tab 内容区内部滚动) -->
        <section class="panel k2-tabs-panel">
          <div class="panel-title">
            <h2>风险解释</h2>
          </div>
          <div class="tabs">
            <button :class="{ active: activeTab === 'risk' }" @click="activeTab = 'risk'">风险解释</button>
            <button :class="{ active: activeTab === 'osint' }" @click="activeTab = 'osint'">
              OSINT 事件 <span v-if="routeOsintEvents.length" class="tab-count">{{ routeOsintEvents.length }}</span>
            </button>
            <button :class="{ active: activeTab === 'chain' }" @click="activeTab = 'chain'">模型链</button>
          </div>
          <div class="k2-tab-scroll">

          <!-- Tab1 风险解释 -->
          <div v-if="activeTab === 'risk'" class="tab-body">
            <!-- 全局态势:路线风险排行榜(§21-23/§48) -->
            <div v-if="activeRouteId === 'all'" class="k2-risk-global">
              <div class="k2-sec-title">路线风险排行榜</div>
              <div class="k2-ranking">
                <div
                  v-for="(r, i) in showAllRanking ? routeRanking : routeRankingTop"
                  :key="r.id"
                  class="k2-rank-row"
                  :class="r.level"
                  @click="changeRoute(r.id)"
                >
                  <span class="k2-rank-no">{{ i + 1 }}</span>
                  <span class="k2-rank-country">{{ r.country }}</span>
                  <span :class="['risk-tag', r.level]">{{ riskText(r.level) }}</span>
                  <span class="k2-rank-risk">{{ num(r.displayRisk) }}</span>
                  <span class="k2-rank-ev">{{ r.evidenceLevel }}</span>
                </div>
                <div v-if="routeRanking.length > 5" class="k2-rank-more" @click="showAllRanking = !showAllRanking">
                  {{ showAllRanking ? '收起' : '查看全部 ' + routeRanking.length + ' 条' }}
                </div>
              </div>
              <div class="k2-sec-title">高风险节点(节点风险,非网络关键性 §10-12)</div>
              <div class="k2-critical-nodes">
                <div v-for="n in highRiskNodesTop" :key="n.name" class="k2-cnode" @click="focusNode(n.routeId, n.name)">
                  <span :class="['dot', n.level]"></span>
                  <span class="k2-cnode-name">{{ n.name }}</span>
                  <span class="k2-cnode-route">{{ n.route }}</span>
                  <span v-if="n.osintCount" class="k2-cnode-osint">OSINT {{ n.osintCount }}</span>
                  <b>{{ num(n.score) }}</b>
                </div>
              </div>

              <div class="k2-sec-title">网络关键节点</div>
              <div class="k2-crit-toggle">
                <button :class="{ active: criticalityView === 'network' }" @click="criticalityView = 'network'">全网关键</button>
                <button :class="{ active: criticalityView === 'external' }" @click="criticalityView = 'external'">外部供应关键</button>
              </div>
              <div class="k2-critical-nodes">
                <div
                  v-for="n in criticalityView === 'external' ? externalSupplyCriticalNodes : networkCriticalNodes"
                  :key="n.name" class="k2-cnode"
                >
                  <span :class="['dot', n.type.includes('接收') ? 'medium' : 'low']"></span>
                  <span class="k2-cnode-name">{{ n.name }}</span>
                  <span class="k2-cnode-route">{{ n.type }}</span>
                  <b>{{ num(n.score) }}</b>
                </div>
              </div>
              <p class="k2-risk-note">高风险节点 = 当前 node risk 高;网络关键节点 = 网络结构重要。两者不同(§12)。展示风险分为 snapshot 内相对校准值(§34)。</p>
            </div>

            <div v-if="selectedNodeDetail" class="node-detail">
              <div class="nd-head">
                <strong>{{ selectedNodeDetail.name }}</strong>
                <span :class="['risk-tag', selectedNodeDetail.risk]">{{ riskText(selectedNodeDetail.risk) }}</span>
              </div>
              <div class="nd-grid">
                <div><span>综合风险</span><b>{{ num(selectedNodeDetail.combined) }}</b></div>
                <div><span>当前脆弱性</span><b>{{ num(selectedNodeDetail.vul) }}</b></div>
                <div><span>供应后果</span><b>{{ num(selectedNodeDetail.cons) }}</b></div>
                <div><span>旧模型风险</span><b>{{ num(selectedNodeDetail.legacy) }}</b></div>
                <div><span>OSINT 增量</span><b :class="{ pos: selectedNodeDetail.delta > 0 }">{{ selectedNodeDetail.delta }}</b></div>
                <div><span>网络关键性</span><b>{{ num(selectedNodeDetail.criticality) }}</b></div>
                <div><span>供应覆盖</span><b>{{ selectedNodeDetail.supplyShare }}%</b></div>
                <div><span>涉及路线</span><b>{{ selectedNodeDetail.routeCount }}</b></div>
              </div>
              <p class="nd-reason">{{ reasonText(selectedNodeDetail.reason) }}</p>
              <p v-if="selectedNodeDetail.delta <= 0" class="nd-none">当前无直接 OSINT 风险事件</p>
              <p v-else class="nd-desc">{{ selectedNodeDetail.description }}</p>
            </div>
            <div v-else class="tab-hint">点击地图节点查看节点风险详情</div>

            <div class="route-expl-list">
              <div
                v-for="route in visibleRoutes"
                :key="route.id"
                class="route-expl"
                :class="{ active: activeRouteId === route.id }"
                @click="changeRoute(route.id)"
              >
                <div class="re-head">
                  <strong>{{ route.country }}</strong>
                  <span :class="['risk-tag', route.riskLevel]">{{ riskText(route.riskLevel) }}</span>
                </div>
                <div class="re-scores">
                  <span>展示 <b>{{ num(route.display_risk_score ?? route.risk_score ?? 0) }}</b></span>
                  <span>原始 <b>{{ num(route.raw_risk_score ?? route.risk_score ?? 0) }}</b></span>
                </div>
                <div class="re-bd">
                  <div
                    v-for="item in breakdownItems(route.risk_breakdown)"
                    :key="item.key"
                    class="re-bd-item"
                  >
                    <span class="re-label">{{ item.label }}</span>
                    <div class="re-bar"><i :style="{ width: Math.min(100, item.value) + '%' }"></i></div>
                    <b>{{ item.value }}</b>
                  </div>
                </div>
                <div class="re-krp">
                  <span class="krp-label">关键风险点</span>
                  <div
                    v-for="p in routeKeyRiskPoints(route)"
                    :key="p.name + p.type"
                    class="krp-item"
                  >
                    <span :class="['dot', p.risk_level]"></span>
                    <span class="krp-name">{{ p.name }}</span>
                    <span class="krp-type">{{ p.type }}</span>
                    <b>{{ num(p.risk_score) }}</b>
                  </div>
                </div>
                <p class="re-note">展示风险分用于当前态势图颜色比较，经过 snapshot 内校准，不代表绝对概率。</p>
              </div>
            </div>
          </div>

          <!-- Tab2 OSINT 事件(K2-UI-RISK-2:全部 REAL 注册事件可浏览 §25-31) -->
          <div v-if="activeTab === 'osint'" class="tab-body">
            <div class="k2-osint-stats">
              <span>Registered <b>{{ osintFilterCounts.all }}</b></span>
              <span>Effective <b class="ok">{{ osintFilterCounts.effective }}</b></span>
              <span>已恢复 {{ osintFilterCounts.recovered }}</span>
              <span>已解决 {{ osintFilterCounts.resolved }}</span>
              <span>正向 {{ osintFilterCounts.positive }}</span>
              <span v-if="activeRouteId !== 'all'">· 当前路线 {{ currentRouteName }}</span>
            </div>
            <div class="k2-osint-filters">
              <button :class="['k2-of', { active: osintFilter === 'all' }]" @click="osintFilter = 'all'">全部 {{ osintFilterCounts.all }}</button>
              <button :class="['k2-of', { active: osintFilter === 'effective' }]" @click="osintFilter = 'effective'">当前有效 {{ osintFilterCounts.effective }}</button>
              <button :class="['k2-of', { active: osintFilter === 'recovered' }]" @click="osintFilter = 'recovered'">已恢复</button>
              <button :class="['k2-of', { active: osintFilter === 'resolved' }]" @click="osintFilter = 'resolved'">已解决</button>
              <button :class="['k2-of', { active: osintFilter === 'positive' }]" @click="osintFilter = 'positive'">正向</button>
              <button :class="['k2-of', { active: osintFilter === 'excluded' }]" @click="osintFilter = 'excluded'">候选/排除</button>
              <button :class="['k2-of', { active: osintFilter === 'breaking' }]" @click="osintFilter = 'breaking'">最新 7 天</button>
              <button :class="['k2-of', { active: osintFilter === 'recent' }]" @click="osintFilter = 'recent'">最新 30 天</button>
              <button :class="['k2-of', { active: osintFilter === 'y2026' }]" @click="osintFilter = 'y2026'">2026</button>
            </div>
            <div v-if="!osintFilteredEvents.length" class="tab-hint">无匹配事件</div>
            <div
              v-for="ev in osintFilteredEvents"
              :key="ev.event_id"
              class="ev-card"
              :class="{ active: selectedEventId === ev.event_id }"
              @click="selectRegisteredEvent(ev)"
            >
              <div class="ev-head">
                <strong>{{ ev.title }}</strong>
                <span v-if="ev.risk_effective" class="ev-reeff">[当前计入风险]</span>
                <span v-else-if="ev.event_year === 2026" class="ev-knowledge">[知识情报]</span>
                <span class="ev-sev" :class="runtimeStatusClass(ev.runtime_status)">
                  {{ runtimeStatusLabel(ev.runtime_status) }}
                </span>
              </div>
              <div class="ev-tags">
                <span class="ev-type">{{ eventTypeLabel(ev.event_type) }}</span>
                <span class="ev-ss">{{ eventStateLabel(ev.event_state) }}</span>
                <span class="ev-dir">{{ directionLabel(ev.direction) }}</span>
                <span v-if="ev.runtime_status !== 'EFFECTIVE'" class="ev-note">{{ ev.runtime_status_reason }}</span>
              </div>
              <div class="ev-stats">
                <span>{{ ev.published_at }}</span>
                <span>国家 {{ ev.country_id || '—' }}</span>
                <span>影响路线 {{ (ev.affected_route_ids || []).join('、') || '—' }}</span>
              </div>
              <div v-if="selectedEventId === ev.event_id" class="ev-detail">
                <div class="ev-row"><span>severity</span><b>{{ ev.severity_class || ev.severity || '—' }}</b></div>
                <div class="ev-row"><span>状态</span><b>{{ eventStateLabel(ev.event_state) }}</b></div>
                <div class="ev-row"><span>方向</span><b>{{ directionLabel(ev.direction) }}</b></div>
                <div class="ev-row"><span>Runtime</span><b>{{ runtimeStatusLabel(ev.runtime_status) }}</b></div>
                <div class="ev-row"><span>核验</span><b>{{ ev.verification_status }}</b></div>
                <div class="ev-row"><span>命中节点</span><b>{{ (ev.affected_node_ids || []).join('、') || '—' }}</b></div>
                <div class="ev-row"><span>影响路线</span><b>{{ (ev.affected_route_ids || []).join('、') || '—' }}</b></div>
                <p class="ev-reason">{{ ev.runtime_status_reason }}</p>
              </div>
            </div>
          </div>

          <!-- Tab3 模型链 -->
          <div v-if="activeTab === 'chain'" class="tab-body">
            <div v-if="modelChainSummary" class="chain-summary">
              <span>模型 <b>{{ modelChainSummary.total_models }}</b></span>
              <span>成功 <b class="ok">{{ modelChainSummary.successful_models }}</b></span>
              <span>失败 <b :class="modelChainSummary.failed_models ? 'bad' : 'ok'">{{ modelChainSummary.failed_models }}</b></span>
              <span>总耗时 <b>{{ modelChainSummary.total_duration_ms }}ms</b></span>
            </div>
            <p class="chain-hint">
              注册中心共 {{ modelCards.length || 11 }} 张模型卡；本次实际执行 {{ modelRuns.length }} 个模型（stage 0 组合模型不在本次执行中）。
            </p>
            <div class="chain-flow">
              <template v-for="(run, i) in modelRuns" :key="run.model_id">
                <div
                  class="chain-node"
                  :class="modelStatusClass(run.status, run.registry_status)"
                  @click="toggleModelDetail(run.model_id)"
                >
                  <div class="cn-head">
                    <strong>{{ modelName(run.model_id) }}</strong>
                    <span class="cn-dur">{{ run.duration_ms }}ms</span>
                  </div>
                  <div class="cn-meta">
                    <span v-if="run.registry_status === 'missing'" class="cn-warn">未注册</span>
                    <span>{{ run.status }}</span>
                    <span>v{{ run.model_version }}</span>
                  </div>
                </div>
                <div v-if="i < modelRuns.length - 1" class="chain-arrow">↓</div>

                <div v-if="expandedModelRun === run.model_id" class="model-detail">
                  <div class="md-row"><span>model_id</span><b>{{ run.model_id }}</b></div>
                  <div class="md-row"><span>model_card_id</span><b>{{ run.model_card_id }}</b></div>
                  <div class="md-row"><span>version</span><b>{{ run.model_version }}</b></div>
                  <div class="md-row"><span>model_type</span><b>{{ run.model_type }}</b></div>
                  <div class="md-row"><span>pipeline_stage</span><b>{{ run.pipeline_stage }}</b></div>
                  <div class="md-row"><span>started_at</span><b>{{ run.started_at }}</b></div>
                  <div class="md-row"><span>finished_at</span><b>{{ run.finished_at }}</b></div>
                  <div class="md-row"><span>duration_ms</span><b>{{ run.duration_ms }}</b></div>
                  <div class="md-row"><span>upstream</span><b>{{ (run.upstream_models || []).join(', ') || '—' }}</b></div>
                  <div class="md-row"><span>input</span><b>{{ run.input_summary || '—' }}</b></div>
                  <div class="md-row"><span>output</span><b>{{ run.output_summary || '—' }}</b></div>
                  <div v-if="run.error" class="md-error">error: {{ run.error }}</div>
                  <button class="md-card-btn" @click="viewModelCard(run.model_id)">查看模型卡</button>
                </div>
              </template>
            </div>

            <div v-if="showModelCard && selectedModelCard" class="model-card">
              <div class="mc-head">
                <strong>{{ selectedModelCard.model_name || selectedModelCard.model_id }}</strong>
                <button class="mc-close" @click="showModelCard = false">✕</button>
              </div>
              <div class="mc-row"><span>model_type</span><b>{{ selectedModelCard.model_type }}</b></div>
              <div class="mc-row"><span>version</span><b>{{ selectedModelCard.version }}</b></div>
              <div class="mc-row"><span>pipeline_stage</span><b>{{ selectedModelCard.pipeline_stage }}</b></div>
              <div class="mc-row"><span>score_type</span><b>{{ scoreTypeText(selectedModelCard) }}</b></div>
              <div v-if="selectedModelCard.model_id === 'uranium_route_risk_model_v1'" class="mc-cali">
                <b>score_type: Absolute + Snapshot Relative</b><br/>
                raw_risk_score = absolute model score<br/>
                display_risk_score = snapshot-relative visualization score
              </div>
              <div v-if="selectedModelCard.calibration" class="mc-row"><span>calibration</span><b>{{ JSON.stringify(selectedModelCard.calibration) }}</b></div>
              <p class="mc-desc">{{ selectedModelCard.description }}</p>
              <p class="mc-algo"><b>算法:</b> {{ selectedModelCard.algorithm_summary }}</p>
              <div class="mc-io">
                <span><b>input_entities</b><br/>{{ (selectedModelCard.input_entities || []).join(', ') || '—' }}</span>
                <span><b>output_entities</b><br/>{{ (selectedModelCard.output_entities || []).join(', ') || '—' }}</span>
              </div>
              <div class="mc-io">
                <span><b>upstream</b><br/>{{ (selectedModelCard.upstream_models || []).join(', ') || '—' }}</span>
                <span><b>downstream</b><br/>{{ (selectedModelCard.downstream_models || []).join(', ') || '—' }}</span>
              </div>
            </div>
          </div>
                  </div>
</section>
        <!-- K2-UI-RISK-2:数据说明(默认折叠,§7) 
        <section class="panel k2-data-status">
          <button class="k2-ds-toggle" @click="showDataStatus = !showDataStatus">
            {{ showDataStatus ? '▼ 数据说明' : '▶ 数据说明' }}
          </button>
          <div v-if="showDataStatus && dataProvenance">
            <div class="k2-ds-row"><span>OSINT</span><b>{{ dataProvenance.osint_mode }} · {{ dataProvenance.osint_effective_count }} Effective / {{ dataProvenance.osint_registered_total }} Registered</b></div>
            <div class="k2-ds-row"><span>路线</span><b>{{ dataProvenance.route_network_basis }} / PARTIAL</b></div>
            <div class="k2-ds-row"><span>贸易</span><b>OBSERVED {{ dataProvenance.trade_data_year }}</b></div>
            <div class="k2-ds-row"><span>供应贡献</span><b>{{ dataProvenance.supply_metric_basis }}</b></div>
            <div class="k2-ds-row"><span>物理运力</span><b>{{ dataProvenance.physical_edge_capacity }}</b></div>
            <div class="k2-ds-row"><span>校准</span><b>{{ dataProvenance.calibration_method }}</b></div>
            <p class="k2-ds-note">风险为 MODEL-DERIVED / PARTIAL REAL INPUT,非实测现实风险</p>
          </div>
        </section>-->

      </aside>
    </main>
  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import worldAtlas from 'world-atlas/countries-110m.json'
import { feature } from 'topojson-client'
import { getLatestSnapshot, recomputeSnapshot, getModelRegistry } from '@/api/uraniumSituationSnapshot'
import { getChinaSourceAllocation } from '@/api/powerGame/uraniumKnowledge'
import ChinaCurrentSituationBar from './ChinaCurrentSituationBar.vue'
import { getChinaEvidenceBackedNetwork } from '@/api/powerGame/uraniumKnowledge'

const chartRef = ref(null)
let chart = null

// 页面模式:当前态势(默认) / Simulation Demo
// 当前态势模式:地图节点显示证据背书名称,不显示 Demo 标签。
// K2-UI-RISK-2:正式态势固定 REAL(§4/§8);移除 demo 模式切换
const mode = ref('real')

// 证据背书网络元数据(K2-C3E):旧节点名 → 显示名/真实实体/证据等级。
// 内部身份仍用旧 name(risk model / focusNode / tests 不变),仅展示层替换。
const evidenceNetwork = ref(null)

async function loadEvidenceNetwork() {
  try {
    const r = await getChinaEvidenceBackedNetwork()
    evidenceNetwork.value = r.data || null
  } catch (e) {
    evidenceNetwork.value = null
  }
}

const nodeMetaMap = computed(() => {
  const map = {}
  const routes = (evidenceNetwork.value && evidenceNetwork.value.routes) || []
  for (const route of routes) {
    for (const n of route.nodes || []) {
      // 同一旧节点名出现在多条路线(如"国内接收枢纽"、"中哈边境口岸")时按路线区分绑定
      map[`${route.route_id}|${n.old_name}`] = n
    }
  }
  return map
})

const routeEvidenceMap = computed(() => {
  const map = {}
  const routes = (evidenceNetwork.value && evidenceNetwork.value.routes) || []
  for (const route of routes) map[route.route_id] = route
  return map
})

function displayNodeName(node, routeId) {
  const meta = nodeMetaMap.value[`${routeId}|${node.name}`]
  // DISPLAY LAYER 中文化:display_name_zh 优先,保留英文 canonical display_name 作兜底/溯源
  return (meta && (meta.display_name_zh || meta.display_name)) || node.name
}

function nodeEvidenceMeta(node, routeId) {
  return nodeMetaMap.value[`${routeId}|${node.name}`] || null
}

const activeRouteId = ref('all')
const showNodeLabels = ref(true)

const summary = ref({
  self: 35,
  importShown: 55,
  other: 10
})

const MOCK_ROUTES = [
  {
    id: 'kazakhstan',
    country: '哈萨克斯坦',
    mapName: 'Kazakhstan',
    material: '天然铀 / 铀产品',
    share: 16,
    color: '#E9B949',
    riskLevel: 'medium',
    transport: '铁路联运为主',
    desc: '中亚陆路方向，主要关注铁路运力、边境口岸通关效率和跨境物流稳定性。',
    nodes: [
      {
        name: '哈萨克斯坦供应区',
        type: '海外供应商',
        coord: [67.0, 48.0],
        risk: 'medium',
        score: 58,
        reason: '资源国出口安排、矿山产能和合同执行节奏变化可能影响供应。'
      },
      {
        name: '中亚铁路集结点',
        type: '铁路节点',
        coord: [76.9, 43.2],
        risk: 'low',
        score: 32,
        reason: '常规铁路节点，主要风险来自调度延误和换装效率。'
      },
      {
        name: '中哈边境口岸',
        type: '边境口岸',
        coord: [82.6, 45.2],
        risk: 'high',
        score: 78,
        reason: '跨境口岸若出现拥堵、通关变化或铁路换装延迟，可能形成瓶颈。'
      },
      {
        name: '西北物流枢纽',
        type: '国内转运',
        coord: [87.6, 43.8],
        risk: 'medium',
        score: 51,
        reason: '内陆转运受铁路组织、安保调度和天气影响。'
      },
      {
        name: '国内接收枢纽',
        type: '国内接收',
        coord: [103.8, 36.1],
        risk: 'low',
        score: 26,
        reason: '脱敏聚合节点，用于前端展示，不对应真实仓储地点。'
      }
    ]
  },
  {
    id: 'namibia',
    country: '纳米比亚',
    mapName: 'Namibia',
    material: '天然铀 / 铀矿产品',
    share: 10,
    color: '#F97316',
    riskLevel: 'high',
    transport: '海运为主',
    desc: '非洲西南方向，远洋链路较长，港口、船期和航运通道风险更突出。',
    nodes: [
      {
        name: '纳米比亚供应区',
        type: '海外供应商',
        coord: [17.1, -22.5],
        risk: 'medium',
        score: 61,
        reason: '矿山生产、出口政策和港口外运能力会影响交付节奏。'
      },
      {
        name: '西南非洲出海港',
        type: '港口',
        coord: [14.5, -22.9],
        risk: 'high',
        score: 82,
        reason: '港口拥堵、设备检修、罢工或安保事件可能导致装船延误。'
      },
      {
        name: '印度洋航运通道',
        type: '海运通道',
        coord: [57.0, -20.0],
        risk: 'medium',
        score: 55,
        reason: '长距离海运受天气、保险、绕航和航运价格波动影响。'
      },
      {
        name: '中国东部接收港',
        type: '港口',
        coord: [121.5, 31.2],
        risk: 'medium',
        score: 49,
        reason: '港口排期、监管检查和内陆衔接可能影响运输时效。'
      },
      {
        name: '国内接收枢纽',
        type: '国内接收',
        coord: [114.3, 30.6],
        risk: 'low',
        score: 28,
        reason: '脱敏聚合节点，用于前端展示，不对应真实仓储地点。'
      }
    ]
  },
  {
    id: 'canada',
    country: '加拿大',
    mapName: 'Canada',
    material: '铀产品 / 长协供应',
    share: 8,
    color: '#3B82F6',
    riskLevel: 'medium',
    transport: '铁路 + 太平洋海运',
    desc: '北美方向，关注出口许可、铁路到港、港口排期和跨太平洋船期。',
    nodes: [
      {
        name: '加拿大供应区',
        type: '海外供应商',
        coord: [-106.3, 56.1],
        risk: 'medium',
        score: 57,
        reason: '出口许可、监管政策和合同执行节奏可能影响供应。'
      },
      {
        name: '北美西岸港口',
        type: '港口',
        coord: [-123.1, 49.3],
        risk: 'medium',
        score: 54,
        reason: '港口劳资、铁路到港衔接和船期波动可能带来延误。'
      },
      {
        name: '北太平洋航线',
        type: '海运通道',
        coord: [-160.0, 42.0],
        risk: 'low',
        score: 36,
        reason: '常规远洋运输风险，主要受天气和航线调度影响。'
      },
      {
        name: '中国东部接收港',
        type: '港口',
        coord: [121.5, 31.2],
        risk: 'medium',
        score: 48,
        reason: '港口排期、监管检查和内陆转运衔接可能影响到货节奏。'
      },
      {
        name: '国内接收枢纽',
        type: '国内接收',
        coord: [116.4, 39.9],
        risk: 'low',
        score: 25,
        reason: '脱敏聚合节点，用于前端展示，不对应真实仓储地点。'
      }
    ]
  },
  {
    id: 'australia',
    country: '澳大利亚',
    mapName: 'Australia',
    material: '铀产品 / 海运供应',
    share: 7,
    color: '#8B5CF6',
    riskLevel: 'medium',
    transport: '海运为主',
    desc: '澳洲方向以海运为主，关注出口政策、港口调度和西太平洋航线。',
    nodes: [
      {
        name: '澳大利亚供应区',
        type: '海外供应商',
        coord: [134.0, -25.0],
        risk: 'medium',
        score: 59,
        reason: '资源政策、监管审批和合同安排可能影响供应节奏。'
      },
      {
        name: '澳洲南部出海港',
        type: '港口',
        coord: [138.6, -34.9],
        risk: 'medium',
        score: 53,
        reason: '港口排期、铁路集港和海运调度可能带来延误。'
      },
      {
        name: '西太平洋航线',
        type: '海运通道',
        coord: [150.0, -5.0],
        risk: 'low',
        score: 34,
        reason: '常规海运风险，受天气和航线安排影响。'
      },
      {
        name: '中国南部接收港',
        type: '港口',
        coord: [113.3, 23.1],
        risk: 'medium',
        score: 46,
        reason: '港口作业、监管检查和内陆衔接可能影响运输时效。'
      },
      {
        name: '国内接收枢纽',
        type: '国内接收',
        coord: [112.9, 28.2],
        risk: 'low',
        score: 24,
        reason: '脱敏聚合节点，用于前端展示，不对应真实仓储地点。'
      }
    ]
  },
  {
    id: 'uzbekistan',
    country: '乌兹别克斯坦',
    mapName: 'Uzbekistan',
    material: '天然铀 / 中亚供应',
    share: 6,
    color: '#22C55E',
    riskLevel: 'medium',
    transport: '铁路联运为主',
    desc: '中亚陆路方向，依赖区域铁路转运和跨境口岸稳定性。',
    nodes: [
      {
        name: '乌兹别克斯坦供应区',
        type: '海外供应商',
        coord: [64.6, 41.4],
        risk: 'medium',
        score: 56,
        reason: '出口政策和铁路联运能力变化可能影响供应稳定性。'
      },
      {
        name: '中亚铁路转运点',
        type: '铁路节点',
        coord: [69.2, 41.3],
        risk: 'medium',
        score: 50,
        reason: '区域铁路调度、换装能力和边境等待时间可能影响时效。'
      },
      {
        name: '中亚铁路走廊',
        type: '铁路通道',
        coord: [74.6, 43.0],
        risk: 'low',
        score: 35,
        reason: '主要风险为天气、调度和运力波动。'
      },
      {
        name: '中哈边境口岸',
        type: '边境口岸',
        coord: [82.6, 45.2],
        risk: 'high',
        score: 77,
        reason: '该类跨境节点一旦拥堵，会影响多条中亚路线。'
      },
      {
        name: '国内接收枢纽',
        type: '国内接收',
        coord: [103.8, 36.1],
        risk: 'low',
        score: 26,
        reason: '脱敏聚合节点，用于前端展示，不对应真实仓储地点。'
      }
    ]
  },
  {
    id: 'niger',
    country: '尼日尔',
    mapName: 'Niger',
    material: '天然铀 / 非洲供应',
    share: 4,
    color: '#EF4444',
    riskLevel: 'high',
    transport: '陆路转运 + 海运',
    desc: '西非内陆方向，陆路转运和周边港口衔接是主要风险来源。',
    nodes: [
      {
        name: '尼日尔供应区',
        type: '海外供应商',
        coord: [8.1, 17.6],
        risk: 'high',
        score: 84,
        reason: '资源国政策、安全形势和出口通道变化可能显著影响供应。'
      },
      {
        name: '西非陆路通道',
        type: '陆路通道',
        coord: [3.4, 11.8],
        risk: 'high',
        score: 80,
        reason: '内陆运输距离长，边境、道路和区域安全因素可能造成不确定性。'
      },
      {
        name: '西非出海港',
        type: '港口',
        coord: [2.4, 6.4],
        risk: 'medium',
        score: 60,
        reason: '港口排期、陆海联运衔接和区域物流变化可能影响装船。'
      },
      {
        name: '印度洋/南海航线',
        type: '海运通道',
        coord: [75.0, 5.0],
        risk: 'medium',
        score: 54,
        reason: '长距离海运受天气、保险、绕航和船期影响。'
      },
      {
        name: '中国南部接收港',
        type: '港口',
        coord: [113.3, 23.1],
        risk: 'medium',
        score: 47,
        reason: '港口排期和监管检查可能影响内陆转运节奏。'
      }
    ]
  },
  {
    id: 'russia',
    country: '俄罗斯',
    mapName: 'Russia',
    material: '铀产品 / 核燃料服务',
    share: 3,
    color: '#06B6D4',
    riskLevel: 'medium',
    transport: '铁路 / 海运组合',
    desc: '欧亚方向，关注制裁、支付、保险、铁路和口岸通行变化。',
    nodes: [
      {
        name: '俄罗斯供应区',
        type: '海外供应商',
        coord: [90.0, 60.0],
        risk: 'medium',
        score: 63,
        reason: '外部制裁、贸易政策和物流保险安排可能影响履约。'
      },
      {
        name: '西伯利亚铁路通道',
        type: '铁路通道',
        coord: [82.0, 56.0],
        risk: 'medium',
        score: 52,
        reason: '长距离铁路运输受调度、天气和运力影响。'
      },
      {
        name: '欧亚边境通道',
        type: '边境口岸',
        coord: [106.0, 50.0],
        risk: 'medium',
        score: 55,
        reason: '跨境通关和铁路调度变化可能影响运输时效。'
      },
      {
        name: '东北物流枢纽',
        type: '国内转运',
        coord: [126.6, 45.8],
        risk: 'low',
        score: 31,
        reason: '常规内陆转运风险，受天气和调度影响。'
      },
      {
        name: '国内接收枢纽',
        type: '国内接收',
        coord: [116.4, 39.9],
        risk: 'low',
        score: 25,
        reason: '脱敏聚合节点，用于前端展示，不对应真实仓储地点。'
      }
    ]
  }
]

// 当前展示数据源:默认用 mock 兜底,后端 latest 快照加载成功后替换
const routes = ref(MOCK_ROUTES)
const loadingSnapshot = ref(false)
const snapshotError = ref('')
const snapshotMeta = ref(null)
const recomputing = ref(false)
const recomputeMessage = ref('')

// ── 第十二步:风险解释与模型链可视化状态 ─────────────
const snapshotData = ref(null) // 完整快照(osint_events / model_chain / model_runs / edges)
const activeTab = ref('risk') // risk | osint | chain
const expandedRouteId = ref('')
const showDataStatus = ref(false)
const selectedNodeDetail = ref(null)
const selectedEventId = ref('')
const emphasizedNodeNames = ref([])
const emphasizedEdgeKeys = ref([])
const expandedModelRun = ref('')
const modelCards = ref([])
const showModelCard = ref(false)
const selectedModelCard = ref(null)

const currentRouteName = computed(() => {
  const route = routes.value.find(item => item.id === activeRouteId.value)
  return route ? route.country : '全部'
})

const visibleRoutes = computed(() => {
  if (activeRouteId.value === 'all') return routes.value
  return routes.value.filter(item => item.id === activeRouteId.value)
})

const allRiskNodes = computed(() => {
  return routes.value.flatMap(route =>
    route.nodes.map(node => ({
      routeId: route.id,
      route: route.country,
      node: node.name,
      level: node.risk,
      reason: node.reason,
      score: node.score
    }))
  )
})

const riskCount = computed(() => {
  const nodes = visibleRoutes.value.flatMap(route => route.nodes)

  return {
    high: nodes.filter(node => node.risk === 'high').length,
    medium: nodes.filter(node => node.risk === 'medium').length,
    low: nodes.filter(node => node.risk === 'low').length
  }
})

const visibleRiskEvents = computed(() => {
  const activeIds = visibleRoutes.value.map(item => item.id)

  return allRiskNodes.value
    .filter(item => activeIds.includes(item.routeId))
    .filter(item => item.level !== 'low')
    .sort((a, b) => b.score - a.score)
})

function riskText(level) {
  return {
    low: '低风险',
    medium: '中风险',
    high: '高风险'
  }[level]
}

function riskColor(level) {
  return {
    low: '#16A34A',
    medium: '#F59E0B',
    high: '#DC2626'
  }[level]
}

// 路线风险语义色:high→red / medium→orange / low→green
// 所有路线主线必须使用此函数,选中/高亮只能改变宽度/透明度/glow,不能改变风险色
const ROUTE_RISK_COLOR = { high: '#DC2626', medium: '#F59E0B', low: '#16A34A' }
const ROUTE_RISK_DEFAULT_COLOR = '#64748B'

function getRouteRiskColor(route) {
  const level = route.riskLevel || route.risk_level
  return ROUTE_RISK_COLOR[level] || ROUTE_RISK_DEFAULT_COLOR
}

// ═══════════════════════════════════════════════
// 第十二步:风险解释 / OSINT / 模型链 计算与辅助
// ═══════════════════════════════════════════════

const edges = computed(() => snapshotData.value?.edges || [])

const osintEvents = computed(() => {
  const evs = (snapshotData.value?.osint_events || []).map(ev => ({
    ...ev,
    effective_severity: Number(ev.effective_severity || 0)
  }))
  return evs.sort((a, b) => b.effective_severity - a.effective_severity)
})

const modelRuns = computed(() => {
  // K2-UI-RISK-2:优先本次真实 execution_trace(§42),回退 meta.model_runs
  const runs = snapshotData.value?.execution_trace || snapshotData.value?.meta?.model_runs || []
  return [...runs].sort(
    (a, b) => (a.pipeline_stage ?? 99) - (b.pipeline_stage ?? 99)
  )
})

const modelChainSummary = computed(() => snapshotData.value?.model_chain || null)

const routeStats = computed(() => {
  const arr = routes.value
  return {
    high: arr.filter(r => r.riskLevel === 'high').length,
    medium: arr.filter(r => r.riskLevel === 'medium').length,
    low: arr.filter(r => r.riskLevel === 'low').length
  }
})

const osintSummary = computed(() => {
  const oi = snapshotData.value?.osint_info || {}
  const base = {
    nodes: snapshotData.value?.summary?.affectedNodes ?? 0,
    edges: snapshotData.value?.summary?.affectedEdges ?? 0,
    registered: oi.registered_total ?? oi.real_event_count ?? 0,
    effective: oi.effective_count ?? oi.real_event_count ?? osintEvents.value.length
  }
  if (mode.value === 'real' && oi.osint_mode === 'REAL') {
    return {
      ...base,
      events: oi.real_event_count ?? osintEvents.value.length,
      active: oi.active_event_count ?? 0,
      recovered: oi.recovered_event_count ?? 0,
      riskEffective: oi.risk_effective_count ?? 0,
      isReal: true
    }
  }
  return { ...base, events: osintEvents.value.length, active: 0, recovered: 0, isReal: false }
})

// K2-UI-RISK-1:快照真实性/溯源(§56-59)
const routeShareMap = ref({})
// K2-SUPPLY-SHARE-3F-R:路线供应占比(route_id → display %)
async function loadSourceAllocation() {
  try {
    const r = await getChinaSourceAllocation()
    const comps = ((r && r.data) || {}).components || []
    const m = {}
    comps.forEach(c => { if (c.route_id) m[c.route_id] = c.display_share_percent })
    routeShareMap.value = m
  } catch (e) { /* 降级为空 */ }
}
function routeShare(routeId) { return routeShareMap.value[routeId] }
const empiricalCalibration = computed(() => snapshotData.value?.empirical_calibration || null)
const empiricalSampleNote = computed(() => {
  const c = empiricalCalibration.value
  return c ? (c.horizon_days + ' 天 · ' + (c.method || '经验分箱')) : '样本积累中'
})
const snapshotIsReal = computed(() => {
  const oi = snapshotData.value?.osint_info || {}
  return mode.value === 'real' && oi.osint_mode === 'REAL' && !!snapshotData.value?.is_official_runtime_view
})
const snapshotMode = computed(() => (snapshotData.value?.osint_info || {}).osint_mode || 'REAL')
const dataProvenance = computed(() => snapshotData.value?.data_provenance || null)

// K2-UI-RISK-1:路线风险排行榜(§22-23),按 display risk 降序
const routeRanking = computed(() => {
  return [...routes.value]
    .map(r => ({
      id: r.id,
      country: r.country,
      level: r.riskLevel || r.risk_level || 'low',
      displayRisk: Number(r.display_risk_score ?? r.risk_score ?? 0),
      rawRisk: Number(r.raw_risk_score ?? r.risk_score ?? 0),
      osintCount: routeOsintEventCount(r),
      evidenceLevel: routeEvidenceMap.value[r.id]?.evidence_level || '—',
      transport: r.transport || ''
    }))
    .sort((a, b) => b.displayRisk - a.displayRisk)
})
const routeRankingTop = computed(() => routeRanking.value.slice(0, 5))
const showAllRanking = ref(false)
const currentRoute = computed(() => routes.value.find(r => r.id === activeRouteId.value) || null)
// K2-UI-RISK-2:高风险节点(来自 node risk 输出,非 criticality;按 name 去重 §10-12)
const highRiskNodesTop = computed(() => {
  const byName = {}
  ;(snapshotData.value?.nodes || []).forEach(n => {
    const score = Number(n.combined_risk_score ?? n.risk_score ?? 0)
    const key = n.name
    if (!key) return
    if (!byName[key] || score > byName[key].score) {
      byName[key] = {
        name: n.name, type: n.type || '', route: n.route || '', routeId: n.routeId || '',
        score, level: n.risk_level || n.risk || 'low',
        osintCount: Number(n.osint_event_count ?? 0), osintDelta: Number(n.osint_risk_delta ?? 0),
        criticality: Number(n.criticality_score ?? 0), supplyShare: n.supply_share
      }
    }
  })
  return Object.values(byName).sort((a, b) => b.score - a.score).slice(0, 5)
})
// K2-UI-RISK-2:网络关键节点(全网 criticality,按 name 去重 §20)
const networkCriticalNodes = computed(() => {
  const byName = {}
  ;(snapshotData.value?.critical_nodes || []).forEach(n => {
    const score = Number(n.criticality_score ?? 0)
    const key = n.name
    if (!key) return
    if (!byName[key] || score > byName[key].score) byName[key] = { name: n.name, score, type: n.type || '' }
  })
  return Object.values(byName).sort((a, b) => b.score - a.score)
})
// K2-UI-RISK-2:外部供应关键节点(排除国内接收/转运,供应侧研判视角 §21)
const externalSupplyCriticalNodes = computed(() => {
  const exclude = ['国内接收', '国内转运', '接收枢纽', 'Receiving']
  return networkCriticalNodes.value.filter(n =>
    !exclude.some(k => ((n.type || '') + (n.name || '')).includes(k)))
})
const criticalityView = ref('network') // network | external
// K2-UI-RISK-2:本次真实执行轨迹(§42)
const executionTrace = computed(() => snapshotData.value?.execution_trace || [])
// K2-UI-RISK-1:按当前路线过滤的 OSINT(§38);全局=全部
const routeOsintEvents = computed(() => {
  if (activeRouteId.value === 'all') return osintEvents.value
  const evs = osintEvents.value.filter(ev => (ev.affected_route_ids || []).includes(activeRouteId.value))
  return evs
})
// K2-UI-RISK-2:全部 REAL 注册事件(13)+ runtime 状态(§25-31)
const osintRegisteredEvents = computed(() => snapshotData.value?.osint_registered_events || [])
const osintFilter = ref('all') // all|effective|recovered|resolved|positive|excluded
const osintFilteredEvents = computed(() => {
  let list = activeRouteId.value === 'all'
    ? osintRegisteredEvents.value
    : osintRegisteredEvents.value.filter(ev => (ev.affected_route_ids || []).includes(activeRouteId.value))
  const f = osintFilter.value
  if (f === 'effective') list = list.filter(e => e.runtime_status === 'EFFECTIVE')
  else if (f === 'recovered') list = list.filter(e => e.event_state === 'RECOVERED')
  else if (f === 'resolved') list = list.filter(e => e.event_state === 'RESOLVED')
  else if (f === 'positive') list = list.filter(e => e.direction === 'POSITIVE')
  else if (f === 'excluded') list = list.filter(e => e.runtime_status !== 'EFFECTIVE')
  else if (f === 'breaking') list = list.filter(e => e.freshness_class === 'BREAKING')
  else if (f === 'recent') list = list.filter(e => ['BREAKING', 'RECENT'].includes(e.freshness_class))
  else if (f === 'y2026') list = list.filter(e => (e.event_date || '').startsWith('2026'))
  // 默认最新优先(§42)
  return [...list].sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')))
})
const osintFilterCounts = computed(() => {
  const list = activeRouteId.value === 'all' ? osintRegisteredEvents.value
    : osintRegisteredEvents.value.filter(ev => (ev.affected_route_ids || []).includes(activeRouteId.value))
  return {
    all: list.length,
    effective: list.filter(e => e.runtime_status === 'EFFECTIVE').length,
    recovered: list.filter(e => e.event_state === 'RECOVERED').length,
    resolved: list.filter(e => e.event_state === 'RESOLVED').length,
    positive: list.filter(e => e.direction === 'POSITIVE').length,
    excluded: list.filter(e => e.runtime_status !== 'EFFECTIVE').length,
  }
})
function runtimeStatusLabel(s) {
  return { EFFECTIVE: '当前生效', ELIGIBLE_NOT_EFFECTIVE: '已登记/不计入当前', EXCLUDED: '排除' }[s] || s
}
function runtimeStatusClass(s) {
  return s === 'EFFECTIVE' ? 'ok' : s === 'EXCLUDED' ? 'bad' : 'muted'
}

function nodeOsintDetail(node) {
  return {
    name: node.name,
    type: node.type || '',
    risk: node.risk || node.risk_level || 'low',
    combined: node.combined_risk_score ?? node.risk_score ?? node.score ?? 0,
    vul: node.vulnerability_score ?? node.base_risk_score ?? node.score ?? 0,
    cons: node.consequence_score ?? 0,
    legacy: node.legacy_risk_score ?? node.risk_score ?? 0,
    delta: Number(node.osint_risk_delta ?? 0),
    count: Number(node.osint_event_count ?? 0),
    criticality: node.criticality_score ?? 0,
    supplyShare: node.supply_share ?? 0,
    routeCount: node.route_count ?? 0,
    reason: node.risk_level_reason || '',
    description: node.description || node.reason || ''
  }
}

function reasonText(reason) {
  return {
    combined_high: '综合风险高（脆弱性与供应后果均较高）',
    high_consequence_shared_hub: '高风险主要由供应后果驱动：该节点连接多条供应路线，失效后果极高',
    high_vulnerability_high_impact: '脆弱性与供应后果均高',
    medium_exposure: '当前暴露/脆弱性中等',
    medium_consequence: '供应后果中等',
    low_overall: '综合风险较低'
  }[reason] || reason || ''
}

function routeCalibrationMethod(route) {
  const m = route.calibration_method
  if (m === 'route_minmax_25_85') return 'Snapshot Min-Max'
  if (m === 'raw') return '未校准(直接使用模型分)'
  return m || '—'
}

function routeKeyRiskPoints(route) {
  return route.key_risk_points || []
}

function routeOsintEventCount(route) {
  const nodeNames = new Set((route.nodes || []).map(n => n.name))
  const routeEdges = edges.value.filter(e => e.route_id === route.id)
  const routeEdgeIds = new Set(routeEdges.map(e => e.edge_id))
  return osintEvents.value.filter(ev => {
    const hitNode = (ev.affected_node_ids || []).some(n => nodeNames.has(n))
    const hitEdge = (ev.affected_edge_ids || []).some(id => routeEdgeIds.has(id))
    return hitNode || hitEdge
  }).length
}

function pointOsint(p, route) {
  if ((p.type || '').startsWith('边/')) {
    const [fromNode, toNode] = (p.name || '').split('→')
    const e = edges.value.find(
      x => x.route_id === route.id && x.from_node === fromNode && x.to_node === toNode
    )
    const delta = Number(e?.osint_risk_delta ?? 0)
    return { affected: delta > 0, delta }
  }
  const n = (route.nodes || []).find(x => x.name === p.name)
  const delta = Number(n?.osint_risk_delta ?? 0)
  return { affected: delta > 0, delta }
}

function eventAffectedRoutes(event) {
  const routeIds = new Set()
  const evNodes = new Set(event.affected_node_ids || [])
  const evEdges = new Set(event.affected_edge_ids || [])
  edges.value.forEach(e => {
    if (evEdges.has(e.edge_id)) routeIds.add(e.route_id)
  })
  routes.value.forEach(r => {
    const hasNode = (r.nodes || []).some(n => evNodes.has(n.name))
    if (hasNode) routeIds.add(r.id)
  })
  return routes.value.filter(r => routeIds.has(r.id))
}

function severityLabel(eff) {
  if (eff >= 0.7) return { text: 'severe', cls: 'severe' }
  if (eff >= 0.4) return { text: 'elevated', cls: 'elevated' }
  return { text: 'moderate', cls: 'moderate' }
}

function eventTypeLabel(t) {
  return {
    port_congestion: '港口拥堵',
    supplier_policy: '供应政策',
    geopolitical: '地缘政治',
    customs_delay: '通关延误',
    logistics_disruption: '物流扰动',
    warehouse_abnormal: '仓储异常',
    transport_accident: '运输事故',
    sanction_or_export_control: '制裁/出口管制'
  }[t] || t || '—'
}

// K2-UI-RISK-1:REAL OSINT 状态/方向标签(§40-41)
function eventStateLabel(s) {
  return {
    ACTIVE: 'ACTIVE', ONGOING: 'ONGOING', RECOVERED: 'RECOVERED', RESOLVED: 'RESOLVED', SUPERSEDED: 'SUPERSEDED'
  }[s] || s || '—'
}
function directionLabel(d) {
  return {
    POSITIVE: '正向', NEGATIVE: '负向', NEUTRAL: '中性', MIXED: '混合'
  }[d] || d || '—'
}

const ROUTE_BREAKDOWN_LABELS = {
  avg_node_edge_risk: '节点/边风险',
  max_bottleneck_risk: '网络关键性',
  route_share_risk: '供应依赖',
  critical_node_risk: '关键节点',
  event_route_risk: '事件影响',
  endpoint_risk: '端点风险',
  transport_mode_risk: '运输方式',
  route_context_risk: '路线上下文',
  event_impact_risk: '事件影响',
  distance_or_cycle_risk: '距离/周期',
  base_risk: '基础风险',
  country_or_region_risk: '国家/区域',
  transport_or_storage_risk: '运输/仓储',
  event_risk: '事件风险',
  criticality_risk: '网络关键性',
  alternative_risk: '替代性',
  osint_delta: 'OSINT 增量',
  osint_direct_delta: 'OSINT 直接',
  node_transmission_delta: '节点传导'
}

function breakdownItems(obj) {
  const o = obj || {}
  return Object.entries(o).map(([k, v]) => ({
    key: k,
    label: ROUTE_BREAKDOWN_LABELS[k] || k,
    value: v
  }))
}

function modelName(id) {
  return {
    uranium_supply_graph_builder_v1: '图谱构建',
    uranium_dependency_model_v1: '依赖度',
    uranium_osint_event_model_v1: 'OSINT 事件',
    uranium_event_mapping_model_v1: '事件映射',
    uranium_osint_risk_model_v1: 'OSINT 风险',
    uranium_network_criticality_model_v1: '关键节点',
    uranium_node_risk_model_v1: '节点风险',
    uranium_edge_risk_model_v1: '边风险',
    uranium_route_risk_model_v1: '路径风险',
    uranium_snapshot_builder_v1: '快照生成',
    uranium_supply_situation_snapshot_v1: '态势快照(组合)'
  }[id] || id
}

function modelStatusClass(status, registryStatus) {
  if (status === 'failed') return 'failed'
  if (registryStatus === 'missing') return 'warning'
  return 'success'
}

function selectEvent(ev) {
  selectedEventId.value = ev.event_id
  emphasizedNodeNames.value = ev.affected_node_ids || []
  emphasizedEdgeKeys.value = (ev.affected_edge_ids || []).map(id => {
    const e = edges.value.find(x => x.edge_id === id)
    return e ? `${e.route_id}:${e.from_node}>${e.to_node}` : id
  })
  const affected = eventAffectedRoutes(ev)
  if (affected.length) activeRouteId.value = affected[0].id
  renderChart()
}

// K2-UI-RISK-2:注册事件(含已解决/候选)地图高亮;按 event_id 兼容 osint_events 与 registered
function selectRegisteredEvent(ev) {
  selectedEventId.value = ev.event_id
  emphasizedNodeNames.value = ev.affected_node_ids || []
  emphasizedEdgeKeys.value = (ev.affected_edge_ids || []).map(id => {
    const e = edges.value.find(x => x.edge_id === id)
    return e ? `${e.route_id}:${e.from_node}>${e.to_node}` : id
  })
  const routes = ev.affected_route_ids || []
  if (routes.length) activeRouteId.value = routes[0]
  renderChart()
}

function selectNodeOnMap(node, route) {
  selectedNodeDetail.value = nodeOsintDetail(node)
  activeTab.value = 'risk'
  if (route) changeRoute(route.id)
}

function toggleModelDetail(runId) {
  expandedModelRun.value = expandedModelRun.value === runId ? '' : runId
}

async function viewModelCard(modelId) {
  if (!modelCards.value.length) {
    try {
      const res = await getModelRegistry()
      if (res.success && res.data?.model_groups?.length) {
        modelCards.value = res.data.model_groups.flatMap(g => g.models || [])
      }
    } catch (e) {
      console.warn('加载模型卡失败:', e)
    }
  }
  selectedModelCard.value = modelCards.value.find(c => c.model_id === modelId) || null
  showModelCard.value = true
}

function scoreTypeText(card) {
  const t = card?.score_type
  if (t === 'absolute_and_relative') return 'Absolute + Snapshot Relative'
  if (t === 'absolute') return 'Absolute(0-100)'
  return '—'
}

function buildHighlightedEdges() {
  if (!emphasizedEdgeKeys.value.length) return []
  const coordMap = new Map()
  routes.value.forEach(r =>
    (r.nodes || []).forEach(n => {
      if (!coordMap.has(n.name)) coordMap.set(n.name, n.coord)
    })
  )
  const result = []
  emphasizedEdgeKeys.value.forEach(key => {
    const sep = key.indexOf(':')
    const pair = key.slice(sep + 1)
    const [fromNode, toNode] = pair.split('>')
    const c1 = coordMap.get(fromNode)
    const c2 = coordMap.get(toNode)
    if (c1 && c2) result.push({ coords: [c1, c2], name: `${fromNode}→${toNode}` })
  })
  return result
}

function num(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? n : n.toFixed(1)
}

// ═══════════════════════════════════════════════
// 后端 latest 快照接入(不触发 recompute)
// ═══════════════════════════════════════════════
async function loadLatestSnapshot() {
  loadingSnapshot.value = true
  snapshotError.value = ''
  try {
    // K2-UI-RISK-1:正式页面始终请求 REAL snapshot(§6);后端按模式隔离缓存(§61)
    const res = await getLatestSnapshot('REAL')
    if (res.success && res.data && Array.isArray(res.data.routes) && res.data.routes.length) {
      // 后端快照优先:routes 字段已兼容当前组件,直接替换
      routes.value = res.data.routes
      snapshotData.value = res.data
      if (res.data.summary) {
        summary.value = { ...summary.value, ...res.data.summary }
      }
      snapshotMeta.value = {
        generated_at: res.data.generated_at || '',
        model_version: res.data.model_version || '',
        meta: res.data.meta || null,
        osint_mode: (res.data.osint_info || {}).osint_mode || 'REAL',
        snapshot_id: res.data.snapshot_id || '',
        is_official_runtime_view: !!res.data.is_official_runtime_view,
        data_provenance: res.data.data_provenance || null,
        osint_info: res.data.osint_info || null,
      }
      // 清理选择状态(切换快照后不残留旧高亮)
      selectedEventId.value = ''
      emphasizedNodeNames.value = []
      emphasizedEdgeKeys.value = []
      expandedModelRun.value = ''
      selectedNodeDetail.value = null
    } else {
      // 接口正常但无数据:保持 mock fallback
      snapshotError.value = '后端态势快照为空，当前展示本地默认态势图'
    }
  } catch (e) {
    // 后端不可用:不崩溃,继续用 mock fallback
    console.warn('加载后端态势快照失败:', e)
    snapshotError.value = '后端态势快照加载失败，当前展示本地默认态势图'
  } finally {
    loadingSnapshot.value = false
    renderChart()
  }
}

// 重新计算态势图:POST recompute 只返回摘要,必须再 GET latest 拿完整快照刷新地图
// K2-UI-RISK-2:重算前后 diff(§54-58)
function snapshotDiff(before, after) {
  const bRoutes = {}, aRoutes = {}
  ;(before?.routes || []).forEach(r => { bRoutes[r.id] = Number(r.display_risk_score ?? r.risk_score ?? 0) })
  ;(after?.routes || []).forEach(r => { aRoutes[r.id] = Number(r.display_risk_score ?? r.risk_score ?? 0) })
  const changedRoutes = Object.keys(aRoutes).filter(id => Math.abs((aRoutes[id] || 0) - (bRoutes[id] || 0)) > 0.05)
  const bl = {}, al = {}
  ;(before?.nodes || []).forEach(n => { bl[n.name] = n.risk_level || n.risk })
  ;(after?.nodes || []).forEach(n => { al[n.name] = n.risk_level || n.risk })
  const changedNodes = Object.keys(al).filter(name => al[name] !== bl[name])
  return {
    changedRoutes,
    changedNodes,
    levelsChanged: changedNodes.length,
    effectiveOsintBefore: (before?.osint_info || {}).effective_count ?? (before?.osint_info || {}).real_event_count ?? 0,
    effectiveOsintAfter: (after?.osint_info || {}).effective_count ?? (after?.osint_info || {}).real_event_count ?? 0,
  }
}

async function handleRecompute() {
  if (recomputing.value) return
  recomputing.value = true
  recomputeMessage.value = '正在重新计算 REAL 态势…'
  snapshotError.value = ''
  const before = snapshotData.value
  // K2-UI-RISK-2:正式页面始终 REAL(§4/§6);不依赖后端隐式默认
  const osintMode = 'REAL'
  const t0 = performance.now()
  try {
    const res = await recomputeSnapshot(osintMode)
    const durMs = Math.round(performance.now() - t0)
    if (res.success) {
      await loadLatestSnapshot()
      const after = snapshotData.value
      const diff = snapshotDiff(before, after)
      const newId = snapshotMeta.value?.snapshot_id || ''
      let msg
      if (diff.changedRoutes.length === 0 && diff.levelsChanged === 0
          && diff.effectiveOsintBefore === diff.effectiveOsintAfter) {
        msg = `重新计算完成。输入数据未变化,风险结果与上一快照一致。(REAL · ${durMs}ms · 新快照 ${String(newId).slice(-8)})`
      } else {
        msg = `重新计算完成:${diff.changedRoutes.length} 条路线风险变化,${diff.levelsChanged} 个节点等级变化。(REAL · ${durMs}ms)`
      }
      recomputeMessage.value = msg
      try { ElMessage({ type: diff.changedRoutes.length ? 'success' : 'info', message: msg, duration: 6000 }) } catch (e) { /* ignore */ }
    } else {
      recomputeMessage.value = '重新计算失败,已保留上次快照'
      snapshotError.value = res.message || '重新计算失败'
      try { ElMessage({ type: 'error', message: '态势重新计算失败,已保留上次快照' }) } catch (e) { /* ignore */ }
    }
  } catch (e) {
    console.warn('重新计算态势图失败:', e)
    recomputeMessage.value = '重新计算失败,已保留上次快照'
    snapshotError.value = '重新计算失败: ' + ((e && e.message) || e)
    try { ElMessage({ type: 'error', message: '态势重新计算失败,已保留上次快照' }) } catch (err) { /* ignore */ }
  } finally {
    recomputing.value = false
  }
}

function changeRoute(id) {
  activeRouteId.value = id
  renderChart()
}

function toggleNodeLabels() {
  showNodeLabels.value = !showNodeLabels.value
  renderChart()
}

function focusNode(routeId, nodeName) {
  activeRouteId.value = routeId
  renderChart()

  const route = routes.value.find(item => item.id === routeId)
  const node = route?.nodes.find(item => item.name === nodeName)

  if (!node || !chart) return

  chart.dispatchAction({
    type: 'showTip',
    seriesIndex: 4,
    name: node.name
  })
}

function createLineData(route) {
  const isActive = activeRouteId.value === route.id
  const isAnyActive = activeRouteId.value !== 'all'
  const baseColor = getRouteRiskColor(route)
  const high = route.riskLevel === 'high'
  return {
    name: `${route.country}供应链`,
    coords: route.nodes.map(node => node.coord),
    routeId: route.id,
    country: route.country,
    riskLevel: route.riskLevel,
    lineStyle: {
      // 风险语义色(high红/medium橙/low绿),选中只改宽度/透明度/glow,不改颜色
      color: baseColor,
      width: isActive ? (high ? 5.6 : 4.6) : high ? 4.2 : 3.0,
      opacity: isAnyActive ? (isActive ? 1 : 0.42) : 0.74,
      shadowBlur: isActive ? 28 : 16,
      shadowColor: baseColor
    }
  }
}

function createNodeData(route) {
  return route.nodes.map(node => {
    const emphasized = emphasizedNodeNames.value.includes(node.name)
    const baseSize = node.risk === 'high' ? 18 : node.risk === 'medium' ? 14 : 10
    // 填充色始终用节点风险色;OSINT 高亮仅加橙色描边 + glow,不覆盖风险色语义
    const baseColor = riskColor(node.risk)
    const meta = nodeEvidenceMeta(node, route.id)
    return {
      name: node.name,
      displayName: displayNodeName(node, route.id),
      realEntity: meta ? meta.real_entity || '' : '',
      evidenceLevel: meta ? meta.evidence_level || '' : '',
      aggregationLevel: meta ? meta.aggregation_level || '' : '',
      evidenceCount: meta ? (meta.evidence_refs || []).length : 0,
      value: [...node.coord, node.score],
      routeId: route.id,
      country: route.country,
      nodeType: node.type,
      risk: node.risk,
      reason: node.reason,
      score: node.score,
      baseRiskScore: node.base_risk_score ?? node.score,
      vul: node.vulnerability_score ?? node.score,
      cons: node.consequence_score ?? 0,
      osintDelta: Number(node.osint_risk_delta ?? 0),
      osintCount: Number(node.osint_event_count ?? 0),
      itemStyle: {
        color: baseColor,
        borderColor: emphasized ? '#F97316' : '#ffffff',
        borderWidth: emphasized ? 3 : 2,
        shadowBlur: emphasized
          ? 32
          : node.risk === 'high'
            ? 26
            : node.risk === 'medium'
              ? 18
              : 10,
        shadowColor: emphasized ? '#F97316' : baseColor
      },
      symbolSize: emphasized ? baseSize + 6 : baseSize
    }
  })
}

function getWorldGeoJson() {
  const geoJson = feature(worldAtlas, worldAtlas.objects.countries)

  geoJson.features.forEach(item => {
    const name = item.properties?.name || item.id

    item.properties = {
      ...item.properties,
      name
    }
  })

  return cleanAntimeridianLines(geoJson)
}

function cleanAntimeridianLines(geoJson) {
  const cloned = JSON.parse(JSON.stringify(geoJson))

  cloned.features = cloned.features.map(featureItem => {
    const geometry = featureItem.geometry
    if (!geometry) return featureItem

    if (geometry.type === 'Polygon') {
      geometry.coordinates = geometry.coordinates
        .map(cleanRing)
        .filter(ring => ring.length >= 4)
    }

    if (geometry.type === 'MultiPolygon') {
      geometry.coordinates = geometry.coordinates
        .map(polygon => polygon.map(cleanRing).filter(ring => ring.length >= 4))
        .filter(polygon => polygon.length > 0)
    }

    return featureItem
  })

  return cloned
}

function cleanRing(ring) {
  if (!Array.isArray(ring) || ring.length < 2) return ring

  const result = []

  for (let i = 0; i < ring.length; i++) {
    const current = ring[i]
    const prev = result[result.length - 1]

    if (!prev) {
      result.push(current)
      continue
    }

    const lngDiff = Math.abs(current[0] - prev[0])
    const latDiff = Math.abs(current[1] - prev[1])

    if (lngDiff > 120 && latDiff < 8) {
      continue
    }

    result.push(current)
  }

  if (result.length >= 3) {
    const first = result[0]
    const last = result[result.length - 1]

    if (first[0] !== last[0] || first[1] !== last[1]) {
      result.push([...first])
    }
  }

  return result
}

function getRegions() {
  const regionMap = new Map()

  regionMap.set('China', {
    name: 'China',
    itemStyle: {
      areaColor: '#DBEAFE',
      borderColor: '#2563EB',
      borderWidth: 1.5
    }
  })

  routes.value.forEach(route => {
    if (!route.mapName) return

    regionMap.set(route.mapName, {
      name: route.mapName,
      itemStyle: {
        areaColor: 'rgba(96,165,250,0.13)',
        borderColor: '#93C5FD',
        borderWidth: 1
      },
      emphasis: {
        itemStyle: {
          areaColor: 'rgba(59,130,246,0.22)',
          borderColor: '#2563EB',
          borderWidth: 1.2
        }
      }
    })
  })

  return Array.from(regionMap.values())
}

function renderChart() {
  if (!chart) return

  const lineData = visibleRoutes.value.map(createLineData)
  const nodeData = visibleRoutes.value.flatMap(createNodeData)

  chart.setOption(
    {
      backgroundColor: 'transparent',

      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderColor: '#D6E4F0',
        borderWidth: 1,
        extraCssText:
          'box-shadow: 0 18px 50px rgba(31, 41, 55, 0.16); border-radius: 14px;',
        padding: 12,
        textStyle: {
          color: '#0F172A'
        },
        formatter(params) {
          if (params.seriesType === 'effectScatter') {
            const d = params.data
            const osintLine =
              d.osintCount > 0
                ? `OSINT 增量：+${d.osintDelta}（${d.osintCount} 事件）<br/>`
                : '当前无直接 OSINT 风险事件<br/>'
            const dimLine =
              typeof d.vul !== 'undefined'
                ? `脆弱性：${d.vul}　/　供应后果：${d.cons}<br/>`
                : ''
            const entityLine = d.realEntity
              ? `真实实体：${d.realEntity}<br/>`
              : ''
            const evLine = d.evidenceLevel
              ? `证据等级：${d.evidenceLevel}　/　来源数：${d.evidenceCount}<br/>`
              : ''

            return `
              <div style="width:300px">
                <div style="font-size:15px;font-weight:800;margin-bottom:8px;color:#0F172A;">
                  ${d.displayName || d.name}
                </div>
                <div style="line-height:1.8;color:#334155;">
                  所属路线：${d.country}<br/>
                  节点类型：${d.nodeType}<br/>
                  风险等级：${riskText(d.risk)}<br/>
                  综合风险：${d.score}/100<br/>
                  ${entityLine}${evLine}${dimLine}${osintLine}
                </div>
                <div style="margin-top:8px;color:#475569;line-height:1.55;">
                  ${d.reason}
                </div>
              </div>
            `
          }

          if (params.seriesType === 'lines') {
            return `
              <div>
                <b>${params.data.country} → 中国</b><br/>
                风险等级：${riskText(params.data.riskLevel)}
              </div>
            `
          }

          return params.name || ''
        }
      },

      geo: {
        map: 'world-high-light',

  // 保留缩放，但是默认展示完整供应链区域
        roam: true,

  // 放大一点，减少上下空白
        zoom: 1.45,

  // 视觉中心向右上移动
        center: [85, 25],
        scaleLimit: {
          min: 1.15,
          max: 6
        },
        itemStyle: {
          areaColor: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#FCFEFF' },
              { offset: 0.45, color: '#F1F7FF' },
              { offset: 1, color: '#E6F0FB' }
            ]
          },
          borderColor: '#A8C1DD',
          borderWidth: 0.8,
          shadowBlur: 10,
          shadowColor: 'rgba(59,130,246,0.10)'
        },
        emphasis: {
          itemStyle: {
            areaColor: '#DCEBFF',
            borderColor: '#60A5FA',
            borderWidth: 1.2
          },
          label: {
            show: false
          }
        },
        label: {
          show: false
        },
        regions: getRegions()
      },

      series: [
        {
          name: '中国态势中心光晕',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 1,
          rippleEffect: {
            scale: 6,
            brushType: 'stroke'
          },
          symbolSize: 12,
          itemStyle: {
            color: '#2563EB',
            shadowBlur: 28,
            shadowColor: '#2563EB'
          },
          data: [
            {
              name: '中国供应链态势中心',
              value: [103.8, 36.1, 100]
            }
          ]
        },
        {
          name: '供应链路径底线',
          type: 'lines',
          coordinateSystem: 'geo',
          polyline: true,
          zlevel: 2,
          silent: true,
          lineStyle: {
            color: 'rgba(100,116,139,0.16)',
            width: 8,
            opacity: 0.46,
            cap: 'round',
            join: 'round'
          },
          data: lineData
        },
        {
          name: '供应链路径',
          type: 'lines',
          coordinateSystem: 'geo',
          polyline: true,
          zlevel: 3,
          effect: {
            show: true,
            period: 5,
            trailLength: 0.22,
            symbol: 'arrow',
            symbolSize: 9,
            color: '#ffffff'
          },
          lineStyle: {
            curveness: 0.16,
            cap: 'round',
            join: 'round'
          },
          data: lineData
        },
        {
          name: 'OSINT 高亮边',
          type: 'lines',
          coordinateSystem: 'geo',
          polyline: false,
          zlevel: 5,
          silent: true,
          lineStyle: {
            color: '#F97316',
            type: 'dashed',
            width: 4,
            opacity: 0.9,
            cap: 'round',
            shadowBlur: 20,
            shadowColor: '#F97316'
          },
          data: buildHighlightedEdges()
        },
        {
          name: '风险节点',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 4,
          rippleEffect: {
            scale: 3.8,
            brushType: 'stroke'
          },
          label: {
            show: showNodeLabels.value,
            position: 'right',
            formatter: (p) => (p.data && p.data.displayName) || p.name,
            color: '#1E293B',
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: 'rgba(255,255,255,0.88)',
            borderColor: 'rgba(148,163,184,0.32)',
            borderWidth: 1,
            padding: [4, 6],
            borderRadius: 6
          },
          emphasis: {
            scale: 1.25,
            label: {
              show: true,
              color: '#0F172A',
              fontWeight: 700,
              backgroundColor: 'rgba(255,255,255,0.94)'
            }
          },
          data: nodeData
        }
      ]
    },
    true
  )
}

function initChart() {
  chart = echarts.init(chartRef.value)

  const worldGeoJson = getWorldGeoJson()

  echarts.registerMap('world-high-light', worldGeoJson)

  renderChart()

  chart.on('click', params => {
    if (params?.data?.routeId) {
      if (params.seriesType === 'effectScatter' && params.data.name) {
        const route = routes.value.find(r => r.id === params.data.routeId)
        const node = route?.nodes.find(n => n.name === params.data.name)
        if (node) {
          selectNodeOnMap(node, route)
          return
        }
      }
      changeRoute(params.data.routeId)
    }
  })

  window.addEventListener('resize', handleResize)
}

function handleResize() {
  chart?.resize()
}

onMounted(async () => {
  await nextTick()
  initChart()
  loadEvidenceNetwork()  // 证据背书节点名称(K2-C3E)
  await loadLatestSnapshot()
  loadSourceAllocation()  // K2-SUPPLY-SHARE-3F-R:路线供应占比
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.supply-page {
  min-height: 100vh;
  padding: 18px;
  box-sizing: border-box;
  color: #0f172a;
  background:
    radial-gradient(circle at 14% 8%, rgba(59, 130, 246, 0.16), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(14, 165, 233, 0.10), transparent 24%),
    linear-gradient(135deg, #f8fbff 0%, #eef5ff 44%, #f9fbff 100%);
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  margin-bottom: none;
}

.eyebrow {
  display: inline-flex;
  padding: 5px 10px;
  margin-bottom: 8px;
  border-radius: 999px;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.18);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.page-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 850;
  letter-spacing: 0.04em;
}

.page-header p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 13px;
}

.snapshot-status {
  margin-top: 6px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
}
.snapshot-status.loading {
  color: #2563eb;
}
.snapshot-status.error {
  color: #ef4444;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.mode-switch {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.3);
}
.mode-switch button {
  padding: 5px 13px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.mode-switch button.active {
  background: #2563eb;
  color: #fff;
}

.demo-tag {
  display: inline-block;
  margin-left: 2px;
  padding: 1px 5px;
  border-radius: 6px;
  background: rgba(100, 116, 139, 0.16);
  color: #64748b;
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.05em;
  vertical-align: 1px;
}

.map-demo-note {
  margin: 0 0 12px;
  padding: 8px 14px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.22);
  color: #92400e;
  font-size: 12px;
  line-height: 1.5;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 116px);
  gap: 10px;
  justify-content: end;
}

.summary-card {
  padding: 13px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.26);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
}

.summary-card span {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.summary-card strong {
  display: block;
  margin-top: 4px;
  font-size: 28px;
  line-height: 1;
}

.summary-card.self strong {
  color: #16a34a;
}

.summary-card.import strong {
  color: #2563eb;
}

.summary-card.other strong {
  color: #94a3b8;
}

.summary-card.total strong {
  color: #dc2626;
}

.main-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 14px;

  /*
   * 核心：
   * 首屏高度永远不超过浏览器可视区域
   */
  height: calc(100dvh - 118px);
  min-height: 520px;
  max-height: 820px;
}


.map-panel {
  position: relative;
  min-height: calc(100vh - 136px);
  overflow: hidden;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(244, 248, 255, 0.90)),
    radial-gradient(circle at center, rgba(59, 130, 246, 0.06), transparent 60%);
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow:
    inset 0 0 60px rgba(59, 130, 246, 0.04),
    0 24px 70px rgba(15, 23, 42, 0.08);
}

.map-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(37, 99, 235, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37, 99, 235, 0.035) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at center, black 48%, transparent 94%);
  z-index: 1;
}

.map-topbar {
  position: absolute;
  z-index: 8;
  top: 14px;
  left: 14px;
  right: 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-buttons button {
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  color: #334155;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.30);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(12px);
}

.filter-buttons button.active,
.filter-buttons button:hover {
  color: #ffffff;
  background: #2563eb;
  border-color: #2563eb;
}

.filter-buttons .label-toggle {
  border-color: rgba(15, 118, 110, 0.26);
}

.filter-buttons .label-toggle.active {
  background: #0f766e;
  border-color: #0f766e;
  color: #ffffff;
}

.snapshot-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.snapshot-btn {
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  color: #334155;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.30);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(12px);
  font-size: 12px;
}

.snapshot-btn.primary {
  color: #ffffff;
  background: #2563eb;
  border-color: #2563eb;
}

.snapshot-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.snapshot-time {
  color: #475569;
  font-size: 11px;
  white-space: nowrap;
}

.risk-summary {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-radius: 999px;
  color: #475569;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(148, 163, 184, 0.26);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(12px);
  white-space: nowrap;
  font-size: 12px;
}

.chart {
  position: relative;
  z-index: 2;
  width: 100%;
  height: calc(100vh - 136px);
  min-height: 600px;
}

.legend {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 8;
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 10px 13px;
  border-radius: 16px;
  color: #475569;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07);
  backdrop-filter: blur(12px);
  font-size: 12px;
}

.node {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 6px;
  border-radius: 50%;
}

.node.low {
  background: #16a34a;
}

.node.medium {
  background: #f59e0b;
}

.node.high {
  background: #dc2626;
}

.line {
  display: inline-block;
  width: 28px;
  height: 3px;
  margin-right: 6px;
  vertical-align: middle;
  border-radius: 999px;
  background: #2563eb;
  box-shadow: 0 0 12px rgba(37, 99, 235, 0.45);
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 136px);
  overflow-y: auto;
  padding-right: 2px;
}

.panel {
  padding: 16px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 20px 58px rgba(15, 23, 42, 0.07);
  backdrop-filter: blur(14px);
}

/* ── K2-UI-RISK-1:右栏研判重构 ─────────────── */
.mode-warning {
  padding: 8px 12px;
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 700;
}
.k2-head-panel { padding: 12px 14px; }
.k2-head-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.k2-head-row h2 { margin: 0; font-size: 15px; }
.k2-sub { color: #64748b; font-size: 12.5px; }
.k2-back-btn {
  margin-left: auto; font-size: 11.5px; color: #2563eb; background: none; border: none; cursor: pointer;
}
.k2-global-overview, .k2-route-overview { margin-top: 10px; }
.k2-route-stats { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: #475569; }
.k2-route-stats b.high { color: #DC2626; } .k2-route-stats b.medium { color: #F59E0B; } .k2-route-stats b.low { color: #16A34A; }
.k2-top-route { margin-top: 8px; font-size: 12.5px; color: #334155; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.k2-top-risk { color: #DC2626; font-size: 14px; }
.k2-osint-sum { margin-top: 8px; font-size: 12px; color: #64748b; }
.k2-osint-sum b { color: #0f172a; }
.k2-route-tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.k2-transport { font-size: 12px; color: #64748b; }
.k2-scores { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px; font-size: 12px; color: #475569; }
.k2-scores b { font-size: 13.5px; color: #0f172a; }
.k2-route-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 6px; font-size: 11.5px; color: #64748b; }
.k2-empirical { margin-top: 8px; padding: 6px 8px; background: #f0fdf4; border-left: 3px solid #16A34A; border-radius: 4px; font-size: 12px; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.k2-empirical b { font-size: 15px; color: #15803d; }
.k2-emp-accum { background: #fffbeb; border-left-color: #f59e0b; }
.k2-emp-accum b { color: #b45309; }
.k2-emp-method { font-size: 10.5px; color: #64748b; }

.k2-route-select-panel { padding: 8px 12px; }
.k2-route-panel-title { font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; letter-spacing: 0.5px; }
.k2-route-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.k2-chip {
  padding: 4px 10px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc;
  font-size: 12px; color: #475569; cursor: pointer; transition: all .12s;
}
.k2-chip.active { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
.k2-rank-share { font-size: 10.5px; color: #1e3a8a; background: #eef2ff; padding: 1px 5px; border-radius: 4px; }
.k2-chip b { font-weight: 800; }

.k2-chip:hover { border-color: #93c5fd; }
.k2-tabs-panel { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 12px 14px; }
.k2-tab-scroll { overflow-y: auto; flex: 1; min-height: 0; max-height: calc(100vh - 470px); }
.k2-risk-global { margin-bottom: 12px; }
.k2-sec-title { font-size: 12.5px; font-weight: 800; margin: 10px 0 6px; color: #334155; }
.k2-ranking { display: flex; flex-direction: column; gap: 4px; }
.k2-rank-row {
  display: flex; align-items: center; gap: 7px; padding: 6px 8px; border-radius: 8px;
  background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer; min-height: 40px;
}
.k2-rank-row:hover { border-color: #93c5fd; }
.k2-rank-no { width: 16px; color: #94a3b8; font-size: 11px; flex: 0 0 auto; }
.k2-rank-country {
  flex: 1 1 auto; min-width: 0; font-size: 13px; font-weight: 700; color: #1e293b;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;
}
.k2-rank-row .risk-tag { flex: 0 0 auto; white-space: nowrap; }
.k2-rank-risk { font-size: 14px; font-weight: 800; color: #0f172a; width: 44px; flex: 0 0 auto; text-align: right; }
.k2-rank-ev {
  font-size: 10px; font-weight: 500; color: #7c8aa5; letter-spacing: 0.3px;
  flex: 0 0 auto; white-space: nowrap; padding-left: 2px;
}
.k2-rank-more { text-align: center; font-size: 12px; color: #2563eb; cursor: pointer; padding: 6px; }
.k2-critical-nodes { display: flex; flex-direction: column; gap: 4px; }
.k2-cnode {
  display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 8px;
  background: #f8fafc; border: 1px solid #e2e8f0; font-size: 12px;
}
.k2-cnode-name { flex: 1; }
.k2-cnode-route { color: #94a3b8; font-size: 11px; }
.k2-cnode b { font-size: 12.5px; }
.k2-risk-note { margin-top: 8px; font-size: 11px; color: #94a3b8; }
.k2-osint-filter-note { margin-bottom: 8px; font-size: 11.5px; color: #64748b; }
.ev-dir { font-size: 11px; color: #64748b; }
.ev-recovered-note { margin-left: 4px; color: #16A34A; font-size: 11px; }
.snapshot-ok { margin-left: 6px; color: #16A34A; font-size: 11px; }
.k2-data-status { padding: 10px 12px; font-size: 11px; }
.k2-ds-toggle { width: 100%; text-align: left; background: none; border: none; font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer; padding: 2px 0 6px; }
.k2-osint-stats { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 11.5px; color: #475569; margin-bottom: 8px; }
.k2-osint-stats b { font-size: 12.5px; color: #0f172a; } .k2-osint-stats b.ok { color: #16A34A; }
.k2-osint-filters { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.k2-of { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; cursor: pointer; }
.k2-of.active { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
.ev-note { font-size: 10.5px; color: #94a3b8; }
.ev-reeff { font-size: 10.5px; color: #b91c1c; background: #fef2f2; padding: 1px 6px; border-radius: 4px; }
.ev-knowledge { font-size: 10.5px; color: #64748b; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; }

.ev-reason { margin: 6px 0 0; font-size: 11px; color: #b45309; }
.k2-crit-toggle { display: flex; gap: 5px; margin-bottom: 6px; }
.k2-crit-toggle button { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; cursor: pointer; }
.k2-crit-toggle button.active { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
.k2-cnode-osint { font-size: 10.5px; color: #b45309; }


.k2-ds-title { font-size: 12px; font-weight: 800; margin-bottom: 6px; color: #334155; }
.k2-ds-row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; color: #64748b; }
.k2-ds-row b { color: #334155; font-weight: 600; text-align: right; }
.k2-ds-note { margin: 6px 0 0; font-size: 10.5px; color: #94a3b8; }


.panel-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 13px;
}

.panel-title h2 {
  margin: 0;
  font-size: 16px;
}

.panel-title span {
  color: #64748b;
  font-size: 12px;
}

.coverage {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.coverage-bar {
  display: flex;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.coverage-self {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

.coverage-import {
  background: linear-gradient(90deg, #60a5fa, #2563eb);
}

.coverage-other {
  background: linear-gradient(90deg, #cbd5e1, #94a3b8);
}

.coverage-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
}

.supplier-row {
  display: grid;
  grid-template-columns: 108px 1fr 42px;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  cursor: pointer;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.supplier-row:hover strong {
  color: #2563eb;
}

.supplier-main strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
}

.supplier-main span {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
}

.supplier-bar {
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.supplier-fill {
  height: 100%;
  border-radius: 999px;
  box-shadow: 0 0 12px rgba(37, 99, 235, 0.20);
}

.supplier-row b {
  text-align: right;
  color: #334155;
}

.route-card {
  padding: 13px;
  margin-bottom: 12px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.route-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.route-head strong {
  font-size: 14px;
}

.route-head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.risk-tag {
  align-self: flex-start;
  padding: 4px 9px;
  border-radius: 999px;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
}

.risk-tag.low {
  color: #15803d;
  background: rgba(34, 197, 94, 0.12);
}

.risk-tag.medium {
  color: #b45309;
  background: rgba(245, 158, 11, 0.14);
}

.risk-tag.high {
  color: #b91c1c;
  background: rgba(220, 38, 38, 0.12);
}

.node-chain {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
  margin: 12px 0;
}

.node-chain i {
  color: #94a3b8;
  font-style: normal;
}

.chain-node {
  padding: 6px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #ffffff;
  cursor: pointer;
  font-size: 12px;
}

.chain-node.low {
  color: #15803d;
}

.chain-node.medium {
  color: #b45309;
}

.chain-node.high {
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.22);
  background: rgba(254, 242, 242, 0.9);
  box-shadow: 0 0 18px rgba(220, 38, 38, 0.08);
}

.route-desc {
  margin: 0;
  color: #475569;
  line-height: 1.6;
  font-size: 12px;
}

.risk-card {
  padding: 13px;
  margin-bottom: 10px;
  border-radius: 18px;
  cursor: pointer;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-left: 5px solid #94a3b8;
}

.risk-card.high {
  border-left-color: #dc2626;
  background: linear-gradient(90deg, rgba(254, 242, 242, 0.9), #ffffff);
}

.risk-card.medium {
  border-left-color: #f59e0b;
  background: linear-gradient(90deg, rgba(255, 251, 235, 0.9), #ffffff);
}

.risk-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
}

.risk-card-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.risk-card-head strong {
  font-size: 14px;
}

.risk-card-head span {
  color: #64748b;
  font-size: 12px;
}

.risk-card p {
  margin: 8px 0;
  color: #475569;
  line-height: 1.55;
  font-size: 12px;
}

.risk-score {
  display: flex;
  justify-content: space-between;
  color: #64748b;
  font-size: 12px;
}

.risk-score b {
  color: #0f172a;
}

/* ── 第十二步:统计条 / 路线双分 / Tab / OSINT / 模型链 ── */
.stats-strip {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(12px);
  font-size: 12px;
}

.stat-chip .sc-label {
  color: #64748b;
  font-weight: 700;
  font-size: 11px;
}

.stat-chip .sc-value {
  color: #334155;
}

.chip-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin: 0 2px;
  border-radius: 50%;
  vertical-align: middle;
}

.chip-dot.high {
  background: #dc2626;
}

/* route 双分 */
.route-scores {
  margin: 10px 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.score-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 3px 0;
  font-size: 12px;
  color: #475569;
}

.score-row b {
  color: #0f172a;
  font-size: 14px;
}

.score-row.muted b {
  color: #64748b;
}

.score-row.meta {
  font-size: 11px;
  color: #94a3b8;
}

.route-toggle {
  display: block;
  width: 100%;
  margin: 2px 0 8px;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
  cursor: pointer;
}

.route-toggle:hover {
  background: #e2e8f0;
  color: #2563eb;
}

.route-breakdown {
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.bd-note,
.re-note {
  margin: 0 0 8px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.5;
}

.bd-item {
  display: grid;
  grid-template-columns: 72px 1fr 40px;
  gap: 8px;
  align-items: center;
  padding: 3px 0;
  font-size: 12px;
}

.bd-label,
.re-label {
  color: #64748b;
}

.bd-bar,
.re-bar {
  height: 7px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.bd-bar i,
.re-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #93c5fd, #2563eb);
}

.bd-val {
  text-align: right;
  color: #334155;
}

.krp-title,
.krp-label {
  display: block;
  margin: 8px 0 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.krp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
}

.krp-item .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot.low {
  background: #16a34a;
}

.dot.medium {
  background: #f59e0b;
}

.dot.high {
  background: #dc2626;
}

.krp-main {
  flex: 1;
  min-width: 0;
}

.route-evidence {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.16);
}
.ev-list {
  margin: 4px 0 6px;
  padding-left: 16px;
  color: #475569;
  font-size: 11.5px;
  line-height: 1.55;
}
.ev-list a {
  color: #2563eb;
  text-decoration: none;
  word-break: break-all;
}
.ev-level {
  margin: 2px 0 0;
  color: #1e40af;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
}
.ev-level.muted {
  color: #64748b;
  font-weight: 500;
}

.krp-main strong {
  display: block;
  color: #0f172a;
}

.krp-main small {
  display: block;
  color: #94a3b8;
  font-size: 11px;
}

.osint-flag {
  color: #ea580c !important;
  font-weight: 700;
}

.krp-name {
  color: #0f172a;
  font-weight: 600;
}

.krp-type {
  flex: 1;
  color: #94a3b8;
  font-size: 11px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.tabs button {
  flex: 1;
  padding: 7px 4px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
  cursor: pointer;
}

.tabs button.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.tab-count {
  display: inline-block;
  margin-left: 3px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  font-size: 11px;
}

.tab-body {
  min-height: 120px;
}

.tab-hint {
  padding: 16px;
  color: #94a3b8;
  text-align: center;
  font-size: 12px;
}

/* 节点详情 */
.node-detail {
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(37, 99, 235, 0.2);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.08);
}

.nd-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.nd-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 10px 0;
}

.nd-grid > div {
  padding: 8px;
  border-radius: 10px;
  background: #f8fafc;
  text-align: center;
}

.nd-grid span {
  display: block;
  color: #94a3b8;
  font-size: 11px;
}

.nd-grid b {
  display: block;
  margin-top: 3px;
  color: #0f172a;
  font-size: 16px;
}

.nd-grid b.pos {
  color: #ea580c;
}

.nd-none {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
}

.nd-reason {
  margin: 6px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 12px;
  line-height: 1.6;
}

.nd-desc {
  margin: 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.6;
}

/* 路线解释列表 */
.route-expl-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.route-expl {
  padding: 10px 12px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.14);
  cursor: pointer;
}

.route-expl.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.re-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.re-scores {
  display: flex;
  gap: 16px;
  margin: 6px 0;
  color: #64748b;
  font-size: 12px;
}

.re-scores b {
  color: #0f172a;
}

.re-bd {
  margin: 6px 0;
}

.re-bd-item {
  display: grid;
  grid-template-columns: 72px 1fr 40px;
  gap: 8px;
  align-items: center;
  padding: 2px 0;
  font-size: 11px;
}

.re-krp {
  margin-top: 6px;
}

.re-note {
  margin-top: 6px;
  margin-bottom: 0;
}

/* OSINT 事件 */
.ev-card {
  padding: 11px 12px;
  margin-bottom: 8px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.16);
  cursor: pointer;
}

.ev-card.active {
  border-color: #f97316;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.14);
}

.ev-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.ev-head strong {
  font-size: 13px;
  color: #0f172a;
  line-height: 1.4;
}

.ev-sev {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.ev-sev.severe {
  color: #b91c1c;
  background: rgba(220, 38, 38, 0.12);
}

.ev-sev.elevated {
  color: #b45309;
  background: rgba(245, 158, 11, 0.14);
}

.ev-sev.moderate {
  color: #0f766e;
  background: rgba(20, 184, 166, 0.14);
}

.ev-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0;
}

.ev-type {
  padding: 2px 8px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 11px;
}

.ev-ss {
  color: #94a3b8;
  font-size: 11px;
}

.ev-src {
  color: #cbd5e1;
  font-size: 11px;
}

.ev-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #64748b;
  font-size: 12px;
}

.ev-detail {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(148, 163, 184, 0.3);
}

.ev-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 0;
  color: #64748b;
  font-size: 12px;
}

.ev-row b {
  color: #334155;
  text-align: right;
}

.ev-affected {
  margin-top: 6px;
}

.ev-af-label {
  color: #94a3b8;
  font-size: 11px;
}

.ev-chips {
  margin: 3px 0 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
  word-break: break-all;
}

/* 模型链 */
.chain-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.16);
  font-size: 12px;
  color: #64748b;
}

.chain-summary b.ok {
  color: #16a34a;
}

.chain-summary b.bad {
  color: #dc2626;
}

.chain-hint {
  margin: 0 0 8px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.5;
}

.chain-flow {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chain-node {
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #ffffff;
  cursor: pointer;
}

.chain-node.success {
  border-left: 4px solid #16a34a;
}

.chain-node.failed {
  border-left: 4px solid #dc2626;
  background: rgba(254, 242, 242, 0.7);
}

.chain-node.warning {
  border-left: 4px solid #f59e0b;
}

.cn-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.cn-head strong {
  color: #0f172a;
  font-size: 13px;
}

.cn-dur {
  color: #94a3b8;
  font-size: 11px;
}

.cn-meta {
  display: flex;
  gap: 8px;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
}

.cn-warn {
  color: #b45309;
  font-weight: 700;
}

.chain-arrow {
  color: #94a3b8;
  text-align: center;
  font-size: 12px;
  line-height: 1;
}

.model-detail {
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.14);
  margin: 2px 0;
}

.md-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 0;
  color: #64748b;
  font-size: 12px;
}

.md-row b {
  color: #334155;
  text-align: right;
  word-break: break-all;
}

.md-error {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 12px;
}

.md-card-btn {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(37, 99, 235, 0.3);
  background: #ffffff;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
}

.md-card-btn:hover {
  background: #eff6ff;
}

.model-card {
  margin-top: 10px;
  padding: 12px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid rgba(37, 99, 235, 0.25);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.mc-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.mc-head strong {
  color: #0f172a;
}

.mc-close {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
}

.mc-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 0;
  color: #64748b;
  font-size: 12px;
}

.mc-row b {
  color: #334155;
  text-align: right;
  word-break: break-all;
}

.mc-cali {
  margin: 6px 0;
  padding: 8px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 12px;
  line-height: 1.6;
}

.mc-desc {
  margin: 8px 0 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.6;
}

.mc-algo {
  margin: 6px 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.mc-io {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.mc-io span {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
  line-height: 1.6;
}

.mc-io b {
  color: #334155;
}

@media (max-width: 1280px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: repeat(4, minmax(100px, 1fr));
    width: 100%;
  }

  .main-layout {
    grid-template-columns: 1fr;
  }

  .side-panel {
    max-height: none;
  }
}

@media (max-width: 720px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .map-topbar {
    position: relative;
    flex-direction: column;
    top: auto;
    left: auto;
    right: auto;
    padding: 14px;
  }

  .chart {
    height: 620px;
    min-height: 620px;
  }

  .map-panel {
    min-height: auto;
  }

  .legend {
    position: static;
    margin: 0 14px 14px;
    flex-wrap: wrap;
  }
}
</style>
