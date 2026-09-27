<template>
  <div class="knowledge-center">
    <!-- ====== OVERVIEW MODE ====== -->
    <template v-if="!activeLibrary">
      

      <div class="kc-home-toolbar">
        <div class="kc-home-title">
          <h1 class="kc-home-title__text">知识库</h1>
          <span class="kc-home-title__sub">{{ domainLabel }}领域{{ scenarioStore.isSupplyChain ? ' · 统计信息' : ' · 实时统计' }}</span>
        </div>
        <div class="kc-domain-switch" role="group" aria-label="知识库领域切换">
          <button
            v-for="d in domainOptions"
            :key="d.id"
            type="button"
            class="kc-domain-switch__btn"
            :class="{ 'is-active': domainId === d.id }"
            @click="setDomain(d.id)"
          >
            <span class="kc-domain-switch__dot" :class="`is-${d.id}`"></span>{{ d.label }}
          </button>
        </div>
      </div>

      <div class="kc-level-stack">
        <section
          v-for="section in knowledgeSections"
          :key="section.key"
          :class="['kc-level-section', `kc-level-section--${section.key}`]"
        >
          <div class="kc-level-section__head">
            <div>
              <h2 class="kc-level-section__title">{{ section.title }}</h2>
              <p class="kc-level-section__desc">{{ section.desc }}</p>
            </div>
            <span class="kc-level-section__count">{{ section.items.length }} 项</span>
          </div>
          <div class="kc-level-grid">
            <div
              v-for="item in section.items"
              :key="item.key"
              :class="['kc-level-card', `kc-level-card--${item.theme}`]"
            >
              <!-- 单领域入口：卡片只服务当前 selectedDomain（铀/汽车由页头切换器决定） -->
              <button
                type="button"
                :class="['kc-level-card__side', scenarioStore.isSupplyChain ? 'kc-level-card__side--right' : 'kc-level-card__side--left']"
                @click="openKnowledgeEntry(item)"
              >
                <span class="kc-level-card__mark"></span>
                <span class="kc-level-card__icon">
                  <el-icon :size="24"><component :is="item.icon" /></el-icon>
                </span>
                <span class="kc-level-card__body">
                  <span class="kc-level-card__title">{{ item.title }}</span>
                  <span class="kc-level-card__desc">{{ item.desc }}</span>
                </span>
                <span class="kc-level-card__side-tag">{{ domainLabel }}</span>
              </button>
              <!-- 统计信息（共用，放在卡片底部） -->
              <span class="kc-level-card__stats" v-if="resourceOverviewByKey[item.key]?.length">
                <span
                  v-for="stat in resourceOverviewByKey[item.key] || []"
                  :key="`${item.key}-${stat.label}`"
                  class="kc-level-card__stat"
                >
                  <span class="kc-level-card__stat-value">
                    <el-icon v-if="stat.loading" class="kc-level-card__stat-loading"><Loading /></el-icon>
                    <template v-else>{{ stat.value }}</template>
                  </span>
                  <span class="kc-level-card__stat-label">{{ stat.label }}</span>
                </span>
              </span>
            </div>
          </div>
        </section>
      </div>

      <!-- Dataset Section (collapsible) -->

      <!-- Dataset Section (collapsible → 弹窗打开旧 KnowledgeCreate) -->
    </template>

    <!-- ====== AUTO-K2-E1 汽车本体网络(图谱) ====== -->
    <template v-else-if="activeLibrary === 'auto_ontology_net'">
      <div class="kc-detail">
        <AutomotiveOntologyNetwork @back="backToKnowledgeHub" />
      </div>
    </template>

    <!-- ====== AUTO-K1 汽车库通用查看器 ====== -->
    <template v-else-if="isAutoLibraryDetail">
      <div class="kc-detail kc-auto-lib-host">
        <AutomotiveLibraryView :lib="autoLibKey" @back="backToKnowledgeHub" />
      </div>
    </template>

    <!-- ====== DETAIL MODE ====== -->
    <template v-else>
      <div class="kc-detail">
        <!-- Back button & header -->
        <div class="kc-detail-topbar">
          <el-button text @click="backToKnowledgeHub">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <div class="kc-detail-header">
            <div class="kc-detail-title-row">
              <el-icon :size="24" :class="`kc-icon-${activeLibrary}`">
                <component :is="getLibraryIcon(activeLibrary)" />
              </el-icon>
              <h2 class="kc-detail-title">{{ currentLib.name }}</h2>
              <el-switch
                v-if="!['config', 'subject', 'subject_uranium', 'subject_auto', 'environment', 'environment_uranium', 'environment_auto', 'rules', 'rules_uranium', 'rules_auto', 'experts', 'papers_lib', 'ontology', 'ontology_uranium', 'ontology_auto', 'ontology_network', 'model_library'].includes(activeLibrary)"
                :model-value="currentLib.enabled"
                @change="(v) => toggleLibrary(activeLibrary, v)"
                size="small"
                style="margin-left: 12px"
              />
            </div>
            <p class="kc-detail-desc">{{ currentLib.desc }}</p>
          </div>
          <!-- 专家观点右上角：知识图谱 / 返回专家观点（仅铀场景，同页切换不跳路由） -->
          <el-button
            v-if="activeLibrary === 'experts' && !scenarioStore.isSupplyChain"
            class="kc-expert-graph-btn"
            plain
            type="primary"
            @click="toggleExpertGraph"
          >
            <el-icon v-if="expertViewMode === 'graph'" style="margin-right:4px"><ArrowLeft /></el-icon>
            <el-icon v-else style="margin-right:4px"><Connection /></el-icon>
            {{ expertViewMode === 'graph' ? '返回专家观点' : '知识图谱' }}
          </el-button>
        </div>

        <!-- Stats row (仅四库展示，配置/专家观点/本体编辑不显示) -->
        <div v-if="!automotiveEmptyDetail && !['config','experts','papers_lib','ontology','ontology_uranium','ontology_auto','ontology_network','model_library'].includes(activeLibrary)" class="kc-detail-stats">
          <div v-for="s in libraryStats" :key="s.label" class="kc-stat-card">
            <div class="kc-stat-card__value">{{ s.value }}</div>
            <div class="kc-stat-card__label">{{ s.label }}</div>
            <div class="kc-stat-card__bar" :style="{ width: s.pct + '%', background: `var(--kc-card-accent, var(--kc-primary))` }" />
          </div>
        </div>

        <!-- Action buttons (仅四库展示;主体库/环境库/规则库/模型库为只读) -->
        <div v-if="!automotiveEmptyDetail && !isSubjectLibrary && !isEnvironmentLibrary && !isRuleLibrary && !isModelLibrary && !['config','experts','papers_lib','ontology','ontology_uranium','ontology_auto','ontology_network'].includes(activeLibrary)" class="kc-detail-actions">
          <el-button size="small" type="primary" @click="showUploadDialog = true">
            <el-icon><Upload /></el-icon>
            上传文档
          </el-button>
          <el-button size="small" @click="showKeywordDialog = true">
            <el-icon><Coin /></el-icon>
            关键词管理
          </el-button>
          <el-button size="small" @click="handleExpand" :loading="expanding">
            <el-icon><MagicStick /></el-icon>
            AI 拓展
          </el-button>
          <el-popconfirm title="确认删除该知识库?" @confirm="handleDeleteLibrary">
            <template #reference>
              <el-button size="small" type="danger" plain>
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </template>
          </el-popconfirm>
        </div>

        <!-- 汽车领域空态守卫：防止点汽车库看到铀/演示数据 -->
        <div v-if="automotiveEmptyDetail" class="kc-detail-empty">
          <el-empty :description="autoEmptyDesc" :image-size="120">
            <p style="color:#94a3b8;font-size:12px">汽车场景「{{ autoEmptyLibName }}」数据尚未建设，后续接入后此页自动填充。</p>
          </el-empty>
        </div>

        <!-- 模型库(铀):只读模型浏览 -->
        <div v-if="isModelLibrary && !automotiveEmptyDetail" class="kc-models" v-loading="modelsLoading">
          <div v-if="modelSummary" class="kc-models-summary">
            <span>态势模型 <b>{{ modelSummary.situation_models }}</b></span>
            <span>专业模型 <b>{{ modelSummary.professional_models }}</b></span>
            <span>通用算法 <b>{{ modelSummary.general_algorithms }}</b>({{ modelSummary.algorithm_implementations }} 实现)</span>
            <span>Runtime 生效 <b>{{ modelSummary.runtime_effective_models }}</b></span>
            <span>引擎就绪 <b>{{ modelSummary.engine_ready_models }}</b></span>
          </div>
          <el-tabs v-model="modelTab" class="kc-models-tabs">
            <el-tab-pane label="态势模型" name="SITUATION">
              <div class="kc-models-pipeline">Graph Builder → Dependency → OSINT Event → Event Mapping → OSINT Risk → Network Criticality → Node Risk → Edge Risk → Route Risk → Snapshot Builder</div>
            </el-tab-pane>
            <el-tab-pane label="专业模型" name="PROFESSIONAL" />
            <el-tab-pane label="通用算法" name="ALGORITHM" />
          </el-tabs>
          <div class="kc-models-filter">
            <el-input v-model="modelFilter.keyword" size="small" placeholder="搜索模型/方法..." clearable style="width:220px" />
          </div>
          <div class="kc-models-list">
            <div v-for="m in filteredModels()" :key="m.model_id" class="kc-model-card" @click="openModelDetail(m.model_id)">
              <div class="kc-model-head">
                <b>{{ m.model_name }}</b>
                <span class="kc-model-cat">{{ modelCategoryLabel(m.model_category) }}</span>
                <span class="kc-model-method">{{ m.methodology }}</span>
                <span class="kc-model-rt" :class="m.runtime_effective ? 'ok' : 'muted'">{{ m.runtime_effective ? 'RUNTIME' : 'AVAILABLE' }}</span>
              </div>
              <p class="kc-model-desc">{{ m.purpose }}</p>
              <div class="kc-model-meta">
                <span>数据: <b class="kc-mr" :class="modelReadinessClass(m.data_readiness)">{{ m.data_readiness }}</b></span>
                <span>引擎: {{ m.engine_status }}</span>
                <span>测试: {{ m.test_status }}</span>
                <span v-if="m.implementations">实现: {{ m.implementations.join(' / ') }}</span>
              </div>
            </div>
            <el-empty v-if="!filteredModels().length" description="暂无模型" :image-size="60" />
          </div>

          <!-- 模型详情抽屉 -->
          <el-drawer v-model="modelDetailVisible" size="48%" title="模型详情" destroy-on-close>
            <div v-if="modelDetail" class="kc-model-detail">
              <h3 class="kc-model-detail-title">{{ modelDetail.model_name }} <span class="kc-model-cat">{{ modelCategoryLabel(modelDetail.model_category) }}</span></h3>
              <table class="csd-mini">
                <tr><td>用途</td><td>{{ modelDetail.purpose }}</td></tr>
                <tr><td>方法</td><td><b>{{ modelDetail.methodology }}</b></td></tr>
                <tr><td>模型类型</td><td>{{ modelDetail.model_type }} · {{ modelDetail.algorithm_family }}</td></tr>
                <tr><td>状态</td><td>{{ modelDetail.runtime_effective ? 'Runtime 生效' : 'Available / 未在当前 runtime' }} · 引擎 {{ modelDetail.engine_status }}</td></tr>
                <tr><td>数据就绪</td><td><b :class="modelReadinessClass(modelDetail.data_readiness)">{{ modelReadinessLabel(modelDetail.data_readiness) }}</b></td></tr>
                <tr><td>源码</td><td>{{ modelDetail.source_location }}</td></tr>
                <tr><td>版本</td><td>{{ modelDetail.version }}</td></tr>
              </table>

              <!-- K2-M2:真实数据运行(PARALLEL,不改 runtime risk) -->
              <div v-if="['PROFESSIONAL','ALGORITHM'].includes(modelDetail.model_category)" class="kc-model-run">
                <el-button type="primary" size="small" :loading="modelRunning" @click="runModel(modelDetail)">
                  {{ modelRunning ? '运行中…' : '以真实数据运行' }}
                </el-button>
                <span class="kc-model-run-note">PARALLEL 分析;不改当前态势风险</span>
                <div v-if="modelRunResult" class="kc-model-run-result">
                  <h4>运行结果(REAL input)</h4>
                  <pre>{{ formatRunResult(modelRunResult) }}</pre>
                </div>
              </div>

              <!-- K2-M2:真实数据就绪矩阵 -->
              <div class="kc-model-detail-sec" v-if="modelDetail.real_data_readiness"><h4>真实数据就绪(K2-M2)</h4>
                <table class="csd-mini">
                  <tr v-for="(v, k) in modelDetail.real_data_readiness" :key="k"><td>{{ k }}</td><td>{{ v }}</td></tr>
                </table>
              </div>

              <!-- K2-M2:算法真实数据绑定 -->
              <div class="kc-model-detail-sec" v-if="modelDetail.data_bindings && modelDetail.data_bindings.length"><h4>真实数据绑定</h4>
                <div v-for="b in modelDetail.data_bindings" :key="b.implementation" class="kc-model-binding">
                  <b>{{ b.implementation }}</b>
                  <span :class="modelReadinessClass(b.readiness)">{{ b.readiness }}</span>
                  <p>{{ b.default_series }} — {{ b.output_semantics }}</p>
                </div>
              </div>

              <div class="kc-model-detail-sec" v-if="modelDetail.inputs && modelDetail.inputs.length"><h4>输入</h4><p>{{ modelDetail.inputs.join(' · ') || '—' }}</p></div>
              <div class="kc-model-detail-sec" v-if="modelDetail.outputs && modelDetail.outputs.length"><h4>输出</h4><p>{{ modelDetail.outputs.join(' · ') || '—' }}</p></div>
              <div class="kc-model-detail-sec" v-if="modelDetail.implementations"><h4>实现</h4><p>{{ modelDetail.implementations.join(' / ') }}</p></div>
              <p v-if="modelDetail.notes" class="kc-model-note">{{ modelDetail.notes }}</p>
            </div>
          </el-drawer>
        </div>

        <!-- 规则库(铀):只读规则浏览 -->
        <div v-else-if="isRuleLibrary" class="kc-rules" v-loading="rulesLoading">
          <div v-if="rulesSummary" class="kc-rules-summary">
            <span>规则 <b>{{ rulesSummary.rules_total }}</b></span>
            <span>Runtime 生效 <b>{{ rulesSummary.runtime_effective_rules }}</b></span>
            <span>规则组 <b>{{ rulesSummary.rule_groups }}</b></span>
            <span>事件规则 <b>{{ rulesSummary.event_rules }}</b></span>
            <span>风险规则 <b>{{ rulesSummary.risk_rules }}</b></span>
            <span>数据守卫 <b>{{ rulesSummary.data_guard_rules }}</b></span>
          </div>
          <div class="kc-rules-filter">
            <el-input v-model="rulesFilter.keyword" size="small" placeholder="搜索规则(OSINT/recovery/route/threshold/...)..." clearable style="width:260px" />
            <el-select v-model="rulesFilter.group" size="small" clearable placeholder="全部规则组" style="width:150px">
              <el-option v-for="g in Object.keys({EVENT_MAPPING:1,EVENT_STATE:1,EVENT_RISK:1,TIME_DECAY:1,NETWORK_CRITICALITY:1,NODE_RISK:1,EDGE_RISK:1,ROUTE_RISK:1,RISK_LEVEL:1,CALIBRATION:1,DATA_GATE:1,QUALITY_GUARD:1,DEPENDENCY:1})" :key="g" :label="ruleGroupLabel(g)" :value="g" />
            </el-select>
            <el-button size="small" @click="loadRules()">刷新</el-button>
          </div>
          <div class="kc-rules-list">
            <div v-for="rr in filteredRules()" :key="rr.rule_id" class="kc-rule-card" @click="openRuleDetail(rr.rule_id)">
              <div class="kc-rule-head">
                <b>{{ rr.label_zh }}</b>
                <span class="kc-rule-group">{{ ruleGroupLabel(rr.rule_group) }}</span>
                <span class="kc-rule-stage">{{ rr.model_stage }}</span>
                <span class="kc-rule-rt" :class="rr.runtime_effective ? 'ok' : 'muted'">{{ rr.runtime_effective ? 'Runtime' : 'KB' }}</span>
              </div>
              <p class="kc-rule-desc">{{ rr.description }}</p>
              <div class="kc-rule-params" v-if="rr.parameters && Object.keys(rr.parameters).length">
                <span v-for="(v, k) in rr.parameters" :key="k" class="kc-rule-param">{{ k }} = {{ typeof v === 'object' ? JSON.stringify(v) : v }}</span>
              </div>
            </div>
            <el-empty v-if="!filteredRules().length" description="暂无符合的规则" :image-size="60" />
          </div>

          <!-- 规则详情抽屉 -->
          <el-drawer v-model="ruleDetailVisible" size="46%" title="规则详情" destroy-on-close>
            <div v-if="ruleDetail" class="kc-rule-detail">
              <h3 class="kc-rule-detail-title">{{ ruleDetail.label_zh }} <span class="kc-rule-group">{{ ruleGroupLabel(ruleDetail.rule_group) }}</span></h3>
              <table class="csd-mini">
                <tr><td>规则名称</td><td>{{ ruleDetail.rule_name }}</td></tr>
                <tr><td>类别</td><td>{{ ruleGroupLabel(ruleDetail.rule_group) }} ({{ ruleDetail.rule_group }})</td></tr>
                <tr><td>模型阶段</td><td>{{ ruleDetail.model_stage }}</td></tr>
                <tr><td>规则类型</td><td>{{ ruleDetail.rule_type }}</td></tr>
                <tr><td>Runtime 生效</td><td>{{ ruleDetail.runtime_effective ? '是' : '否' }} ({{ ruleDetail.source_type }})</td></tr>
                <tr><td>来源</td><td>{{ ruleDetail.source_location }}</td></tr>
                <tr><td>版本</td><td>{{ ruleDetail.version }}</td></tr>
              </table>
              <div class="kc-rule-detail-sec"><h4>说明</h4><p>{{ ruleDetail.description }}</p></div>
              <div class="kc-rule-detail-sec" v-if="ruleDetail.inputs && ruleDetail.inputs.length"><h4>输入</h4><p>{{ ruleDetail.inputs.join(' · ') }}</p></div>
              <div class="kc-rule-detail-sec" v-if="ruleDetail.outputs && ruleDetail.outputs.length"><h4>输出</h4><p>{{ ruleDetail.outputs.join(' · ') }}</p></div>
              <div class="kc-rule-detail-sec" v-if="ruleDetail.parameters && Object.keys(ruleDetail.parameters).length"><h4>参数</h4>
                <table class="csd-mini"><tr v-for="(v, k) in ruleDetail.parameters" :key="k"><td>{{ k }}</td><td>{{ typeof v === 'object' ? JSON.stringify(v) : v }}</td></tr></table>
              </div>
              <p v-if="ruleDetail.notes" class="kc-rule-note">{{ ruleDetail.notes }}</p>
            </div>
          </el-drawer>
        </div>

        <!-- 环境库(铀):只读环境数据浏览;点击数据集就地展开/收起 -->
        <div v-else-if="isEnvironmentLibrary" class="kc-env" v-loading="envLoading">
          <div v-if="envSummary" class="kc-env-summary">
            <span>核心数据集 <b>{{ envSummary.datasets_total }}</b></span>
            <span>Canonical <b>{{ envSummary.canonical_records }}</b></span>
            <span>Red Book <b>{{ envSummary.redbook_editions }}</b> 版</span>
            <span>最新年份 <b>{{ envSummary.latest_year }}</b></span>
            <span>贸易年份 <b>{{ (envSummary.trade_years || []).join(' / ') }}</b></span>
            <span class="kc-env-legacy">Legacy 隐藏 {{ envSummary.legacy_visible }}</span>
          </div>
          <el-tabs v-model="envTab" class="kc-env-tabs">
            <el-tab-pane label="资源" name="resources">
              <div
                class="kc-env-dataset"
                :class="{ 'is-expanded': envExpanded === 'redbook.resources_history.v1' }"
                @click="toggleEnvDataset('redbook.resources_history.v1', 'Uranium Resources History')"
              >
                <div class="kc-env-dataset-head">
                  <b>Uranium Resources History</b>
                  <span class="kc-env-dataset-count">{{ (envDatasetMeta('resources') || {}).record_count }} 条 <i class="kc-env-chev">{{ envExpanded === 'redbook.resources_history.v1' ? '▾' : '▸' }}</i></span>
                </div>
                <div class="kc-env-dataset-meta">年份 {{ (envDatasetMeta('resources') || {}).year_min }}–{{ (envDatasetMeta('resources') || {}).year_max }} · 国家 {{ ((envDatasetMeta('resources') || {}).countries || []).slice(0, 6).join(' / ') }}</div>
                <div v-if="envExpanded === 'redbook.resources_history.v1'" class="kc-env-records">
                  <div class="kc-env-records-note">共 {{ envExpandedTotal }} 条(显示前 50)</div>
                  <el-table :data="envRecords" stripe size="small" max-height="420">
                    <el-table-column prop="subject" label="国家/主体" width="150" />
                    <el-table-column prop="data_year" label="年份" width="70" />
                    <el-table-column prop="indicator" label="指标" width="140" />
                    <el-table-column prop="value" label="值" width="100" />
                    <el-table-column prop="unit" label="单位" width="70" />
                    <el-table-column prop="resource_basis" label="Resource Basis" width="120" />
                    <el-table-column prop="resource_category" label="类别" width="90" />
                    <el-table-column prop="cost_category" label="成本" width="90" />
                  </el-table>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="生产" name="production">
              <div
                class="kc-env-dataset"
                :class="{ 'is-expanded': envExpanded === 'redbook.production_history.v1' }"
                @click="toggleEnvDataset('redbook.production_history.v1', 'Uranium Production History')"
              >
                <div class="kc-env-dataset-head"><b>Uranium Production History</b><span class="kc-env-dataset-count">{{ (envDatasetMeta('production') || {}).record_count }} 条 <i class="kc-env-chev">{{ envExpanded === 'redbook.production_history.v1' ? '▾' : '▸' }}</i></span></div>
                <div class="kc-env-dataset-meta">国家级铀产量历史</div>
                <div v-if="envExpanded === 'redbook.production_history.v1'" class="kc-env-records">
                  <div class="kc-env-records-note">共 {{ envExpandedTotal }} 条(显示前 50)</div>
                  <el-table :data="envRecords" stripe size="small" max-height="420">
                    <el-table-column prop="subject" label="国家" width="150" />
                    <el-table-column prop="data_year" label="年份" width="70" />
                    <el-table-column prop="indicator" label="指标" width="140" />
                    <el-table-column prop="value" label="值" width="100" />
                    <el-table-column prop="unit" label="单位" width="70" />
                    <el-table-column prop="value_type" label="值类型" width="90" />
                    <el-table-column prop="source_edition" label="Edition" width="90" />
                  </el-table>
                </div>
              </div>
              <div
                class="kc-env-dataset"
                :class="{ 'is-expanded': envExpanded === 'redbook.cumulative_production_history.v1' }"
                @click="toggleEnvDataset('redbook.cumulative_production_history.v1', '累计生产')"
              >
                <div class="kc-env-dataset-head"><b>累计生产</b><span class="kc-env-dataset-count">({{ (envDatasets.find(d => d.dataset_id.includes('cumulative')) || {}).record_count }}) <i class="kc-env-chev">{{ envExpanded === 'redbook.cumulative_production_history.v1' ? '▾' : '▸' }}</i></span></div>
                <div v-if="envExpanded === 'redbook.cumulative_production_history.v1'" class="kc-env-records">
                  <div class="kc-env-records-note">共 {{ envExpandedTotal }} 条(显示前 50)</div>
                  <el-table :data="envRecords" stripe size="small" max-height="420">
                    <el-table-column prop="subject" label="国家" width="150" />
                    <el-table-column prop="data_year" label="年份" width="70" />
                    <el-table-column prop="value" label="值" width="100" />
                    <el-table-column prop="unit" label="单位" width="70" />
                  </el-table>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="需求" name="requirements">
              <div
                class="kc-env-dataset"
                :class="{ 'is-expanded': envExpanded === 'redbook.requirements_history.v1' }"
                @click="toggleEnvDataset('redbook.requirements_history.v1', 'Historical Requirements')"
              >
                <div class="kc-env-dataset-head"><b>Historical Requirements</b><span class="kc-env-dataset-count"><i class="kc-env-chev">{{ envExpanded === 'redbook.requirements_history.v1' ? '▾' : '▸' }}</i></span></div>
                <div class="kc-env-dataset-meta">历史需求</div>
                <div v-if="envExpanded === 'redbook.requirements_history.v1'" class="kc-env-records">
                  <div class="kc-env-records-note">共 {{ envExpandedTotal }} 条(显示前 50)</div>
                  <el-table :data="envRecords" stripe size="small" max-height="420">
                    <el-table-column prop="subject" label="国家" width="150" />
                    <el-table-column prop="data_year" label="年份" width="70" />
                    <el-table-column prop="value" label="值" width="100" />
                    <el-table-column prop="unit" label="单位" width="70" />
                    <el-table-column prop="value_type" label="值类型" width="90" />
                  </el-table>
                </div>
              </div>
              <div
                class="kc-env-dataset"
                :class="{ 'is-expanded': envExpanded === 'redbook.requirements_projection.v1' }"
                @click="toggleEnvDataset('redbook.requirements_projection.v1', 'Projection Requirements')"
              >
                <div class="kc-env-dataset-head"><b>Projection Requirements</b><span class="kc-env-dataset-count">vintage/scenario <i class="kc-env-chev">{{ envExpanded === 'redbook.requirements_projection.v1' ? '▾' : '▸' }}</i></span></div>
                <div class="kc-env-dataset-meta">预测需求(区分历史/预测,保留 vintage/scenario)</div>
                <div v-if="envExpanded === 'redbook.requirements_projection.v1'" class="kc-env-records">
                  <div class="kc-env-records-note">共 {{ envExpandedTotal }} 条(显示前 50)</div>
                  <el-table :data="envRecords" stripe size="small" max-height="420">
                    <el-table-column prop="subject" label="国家" width="150" />
                    <el-table-column prop="data_year" label="年份" width="70" />
                    <el-table-column prop="value" label="值" width="100" />
                    <el-table-column prop="unit" label="单位" width="70" />
                    <el-table-column prop="scenario" label="情景" width="80" />
                    <el-table-column prop="projection_vintage" label="Vintage" width="90" />
                  </el-table>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="产能" name="capability">
              <div
                class="kc-env-dataset"
                :class="{ 'is-expanded': envExpanded === 'redbook.production_capability_history.v1' }"
                @click="toggleEnvDataset('redbook.production_capability_history.v1', 'Production Capability History')"
              >
                <div class="kc-env-dataset-head"><b>Production Capability History</b><span class="kc-env-dataset-count"><i class="kc-env-chev">{{ envExpanded === 'redbook.production_capability_history.v1' ? '▾' : '▸' }}</i></span></div>
                <div v-if="envExpanded === 'redbook.production_capability_history.v1'" class="kc-env-records">
                  <div class="kc-env-records-note">共 {{ envExpandedTotal }} 条(显示前 50)</div>
                  <el-table :data="envRecords" stripe size="small" max-height="420">
                    <el-table-column prop="subject" label="国家" width="150" />
                    <el-table-column prop="data_year" label="年份" width="70" />
                    <el-table-column prop="value" label="值" width="100" />
                    <el-table-column prop="unit" label="单位" width="70" />
                  </el-table>
                </div>
              </div>
              <div
                class="kc-env-dataset"
                :class="{ 'is-expanded': envExpanded === 'redbook.production_capability_projection.v1' }"
                @click="toggleEnvDataset('redbook.production_capability_projection.v1', 'Production Capability Projection')"
              >
                <div class="kc-env-dataset-head"><b>Production Capability Projection</b><span class="kc-env-dataset-count">scenario <i class="kc-env-chev">{{ envExpanded === 'redbook.production_capability_projection.v1' ? '▾' : '▸' }}</i></span></div>
                <div v-if="envExpanded === 'redbook.production_capability_projection.v1'" class="kc-env-records">
                  <div class="kc-env-records-note">共 {{ envExpandedTotal }} 条(显示前 50)</div>
                  <el-table :data="envRecords" stripe size="small" max-height="420">
                    <el-table-column prop="subject" label="国家" width="150" />
                    <el-table-column prop="data_year" label="年份" width="70" />
                    <el-table-column prop="value" label="值" width="100" />
                    <el-table-column prop="unit" label="单位" width="70" />
                    <el-table-column prop="scenario" label="情景" width="80" />
                  </el-table>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="贸易" name="trade">
              <div class="kc-env-note">HS284410 天然铀 · HS284420 浓缩相关 · HS261210 矿石/精矿;不同商品不按 kg 合并。Reporter 与 Mirror 冲突并存。</div>
              <div class="kc-env-dataset">
                <div class="kc-env-dataset-head"><b>多商品贸易结构</b><span class="kc-env-dataset-count">{{ (envSummary && envSummary.trade_years || []).join(' / ') }}</span></div>
                <div class="kc-env-dataset-meta">2024 天然铀:KAZ 63.5% · NAM 36.5%;浓缩相关:RUS 86.3%(详见中国供应/贸易页)</div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="数据质量" name="readiness">
              <div class="kc-env-dataset">
                <div class="kc-env-dataset-head"><b>Data Readiness</b></div>
                <div class="kc-env-dataset-meta">历史/贸易/实体/物流/OSINT/路线/模型 就绪度(读 data_readiness)</div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- Tabbed content（Graph / Docs / Entities / 主体库;论文库走专门分支,不在此通用 UI。
             主体库(铀/汽车)需渲染本模板的「主体库」tab,故不排除 isSubjectLibrary;
             graph/docs/entities pane 已各自 v-if=!isSubjectLibrary 自动隐藏） -->
        <template v-else-if="!isEnvironmentLibrary && !isRuleLibrary && !['config','experts','papers_lib','ontology','ontology_uranium','ontology_auto','ontology_network','model_library'].includes(activeLibrary)">
          <el-tabs v-model="viewMode" class="kc-detail-tabs">
            <el-tab-pane v-if="!isSubjectLibrary" label="知识图谱" name="graph">
              <div v-if="currentLib.graphData" ref="graphRef" class="kc-graph-container" />
              <el-empty v-else description="暂无知识图谱数据" :image-size="80" />
            </el-tab-pane>
            <el-tab-pane v-if="!isSubjectLibrary" label="文档列表" name="docs">
              <el-table :data="currentLib.documents || []" stripe size="small" empty-text="暂无文档">
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="type" label="类型" width="100" />
                <el-table-column prop="chunks" label="切片数" width="80" />
                <el-table-column prop="uploadTime" label="上传时间" width="160" />
              </el-table>
            </el-tab-pane>
            <el-tab-pane v-if="!isSubjectLibrary" label="实体分析" name="entities">
              <div v-if="entityList.length" class="kc-entity-grid">
                <div v-for="group in entityList" :key="group.name" class="kc-entity-group">
                  <h4 class="kc-entity-group__title">{{ group.label }} ({{ group.count }})</h4>
                  <div class="kc-entity-tags">
                    <el-tag v-for="e in group.entities" :key="e" size="small" :type="group.type" style="margin: 2px">{{ e }}</el-tag>
                    <el-tag v-if="group.overflow" size="small" effect="plain">+{{ group.overflow }} 更多</el-tag>
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无实体数据" :image-size="80" />
            </el-tab-pane>
            <!-- 主体库(K2-S1)-->
            <el-tab-pane label="主体库" name="subjects">
              <div v-if="isSubjectAutoLibrary" class="kc-subjects">
                <el-empty description="汽车主体库暂无数据" :image-size="80">
                  <p style="color:#94a3b8;font-size:12px">当前汽车场景主体库为空,后续再接入汽车主体数据。</p>
                </el-empty>
              </div>
              <div v-else class="kc-subjects">
                <div v-if="subjectsSummary" class="kc-subj-summary">
                  <span>主体 <b>{{ subjectsSummary.total }}</b></span>
                  <span>已验证 <b>{{ subjectsSummary.usable }}</b></span>
                  <span>关系 <b>{{ subjectsSummary.relations || 0 }}</b></span>
                  <span>公司 <b>{{ subjectsSummary.by_type.COMPANY || 0 }}</b></span>
                  <span>矿山 <b>{{ subjectsSummary.by_type.MINE || 0 }}</b></span>
                  <span>矿床 <b>{{ subjectsSummary.by_type.DEPOSIT || 0 }}</b></span>
                  <span>设施 <b>{{ (subjectsSummary.by_type.PROCESSING_FACILITY || 0) + (subjectsSummary.by_type.CONVERSION_FACILITY || 0) + (subjectsSummary.by_type.FUEL_FABRICATION_FACILITY || 0) }}</b></span>
                  <span>物流 <b>{{ subjectsSummary.by_type.LOGISTICS_NODE || 0 }}</b></span>
                  <span>核电站 <b>{{ subjectsSummary.by_type.NUCLEAR_POWER_PLANT || 0 }}</b></span>
                </div>
                <div class="kc-subj-filter">
                  <el-input v-model="subjectsFilter.keyword" size="small" placeholder="搜索主体..." clearable style="width:180px" @input="subjectsFilter.page=1" />
                  <el-select v-model="subjectsFilter.type" size="small" clearable placeholder="全部类型" style="width:130px" @change="subjectsFilter.page=1">
                    <el-option label="公司" value="COMPANY" /><el-option label="矿山" value="MINE" /><el-option label="矿床" value="DEPOSIT" />
                    <el-option label="加工设施" value="PROCESSING_FACILITY" /><el-option label="转化设施" value="CONVERSION_FACILITY" />
                    <el-option label="燃料制造" value="FUEL_FABRICATION_FACILITY" /><el-option label="港口" value="PORT" />
                    <el-option label="边境口岸" value="BORDER_CROSSING" /><el-option label="物流节点" value="LOGISTICS_NODE" />
                    <el-option label="核电站" value="NUCLEAR_POWER_PLANT" /><el-option label="运输基础设施" value="TRANSPORT_INFRASTRUCTURE" />
                    <el-option label="供应网络" value="SUPPLY_NETWORK" />
                  </el-select>
                  <el-select v-model="subjectsFilter.country" size="small" clearable placeholder="全部国家" style="width:120px" @change="subjectsFilter.page=1">
                    <el-option label="中国" value="CHN" /><el-option label="哈萨克斯坦" value="KAZ" /><el-option label="纳米比亚" value="NAM" />
                    <el-option label="加拿大" value="CAN" /><el-option label="澳大利亚" value="AUS" /><el-option label="乌兹别克斯坦" value="UZB" />
                    <el-option label="尼日尔" value="NER" /><el-option label="俄罗斯" value="RUS" />
                  </el-select>
                  <el-select v-model="subjectsFilter.status" size="small" clearable placeholder="全部状态" style="width:120px" @change="subjectsFilter.page=1">
                    <el-option label="运营中" value="OPERATING" /><el-option label="已恢复" value="RECOVERED" /><el-option label="暂停" value="SUSPENDED" />
                    <el-option label="中断" value="DISRUPTED" /><el-option label="未知" value="UNKNOWN" />
                  </el-select>
                  <el-button size="small" @click="loadSubjectsSummary(); loadSubjects()">刷新</el-button>
                </div>
                <div v-loading="subjectsLoading" class="kc-subj-list">
                  <div v-for="s in subjectsPageSlice()" :key="s.subject_id" class="kc-sb-osint-card" @click="openSubjectDetail(s.subject_id)">
                    <div class="kc-sb-osint-card-top">
                      <span class="kc-sb-osint-dot" :style="{ background: '#2563eb' }" />
                      <span class="kc-sb-osint-title">{{ s.canonical_name }}</span>
                      <span class="kc-sb-osint-cat" :class="{ 'kcre-aggregate': String(s.aggregation_level).includes('AGGREGATE'), 'kcre-candidate': s.verification_status === 'CANDIDATE' }">{{ subjectVerifText(s.verification_status) }}</span>
                    </div>
                    <div class="kc-sb-osint-card-meta">
                      <span class="kc-sb-osint-source">{{ subjectTypeName(s.subject_type) }}</span>
                      <span class="kc-sb-osint-time">{{ s.country_id }} · {{ subjectStatusText(s.current_status && s.current_status.status) }}</span>
                      <span class="kc-sb-osint-cat">证据 {{ s.evidence_count }} · 路线 {{ (s.related_route_ids || []).length }} · 事件 {{ (s.related_osint_event_ids || []).length }}</span>
                    </div>
                  </div>
                  <el-empty v-if="!subjectsLoading && !subjectsPageSlice().length" description="暂无符合条件的主体" :image-size="60" />
                </div>
                <div class="kc-subj-pager" v-if="subjectsPageItems().length > subjectsFilter.pageSize">
                  <el-pagination layout="prev, pager, next" :total="subjectsPageItems().length" :page-size="subjectsFilter.pageSize" :current-page="subjectsFilter.page" @current-change="p => { subjectsFilter.page = p }" small />
                </div>
              </div>

              <!-- 主体详情抽屉 -->
              <el-drawer v-model="subjectDetailVisible" size="44%" title="主体详情" destroy-on-close>
                <div v-if="subjectDetail" class="kc-subj-detail">
                  <h3 class="kc-subj-detail-title">{{ subjectDetail.canonical_name }}</h3>
                  <p class="kc-subj-detail-meta">
                    {{ subjectTypeName(subjectDetail.subject_type) }} · {{ subjectDetail.country_id }}
                    · <span :class="subjectDetail.verification_status === 'CANDIDATE' ? 'kcre-candidate' : ''">{{ subjectVerifText(subjectDetail.verification_status) }}</span>
                    <span v-if="String(subjectDetail.aggregation_level).includes('AGGREGATE')" class="kcre-aggregate-tag">聚合主体</span>
                  </p>
                  <table class="csd-mini">
                    <tr v-if="subjectDetail.current_status && subjectDetail.current_status.status"><td>当前状态</td><td><b>{{ subjectStatusText(subjectDetail.current_status.status) }}</b> <span class="kc-subj-note" v-if="subjectDetail.current_status.as_of">as of {{ subjectDetail.current_status.as_of }}</span></td></tr>
                    <tr v-if="subjectDetail.roles && subjectDetail.roles.length"><td>角色</td><td>{{ subjectDetail.roles.join('、') }}</td></tr>
                    <tr v-if="subjectDetail.operator_company_ids && subjectDetail.operator_company_ids.length"><td>运营</td><td>{{ subjectDetail.operator_company_ids.join(' / ') }}</td></tr>
                    <tr v-if="subjectDetail.owner_company_ids && subjectDetail.owner_company_ids.length"><td>拥有</td><td>{{ subjectDetail.owner_company_ids.join(' / ') }}</td></tr>
                    <tr v-if="subjectDetail.related_route_ids && subjectDetail.related_route_ids.length"><td>关联路线</td><td>{{ subjectDetail.related_route_ids.join(' / ') }}</td></tr>
                    <tr v-if="subjectDetail.runtime_node_ids && subjectDetail.runtime_node_ids.length"><td>态势节点</td><td>{{ subjectDetail.runtime_node_ids.slice(0, 4).join(' / ') }}</td></tr>
                    <tr v-if="subjectDetail.evidence_ids && subjectDetail.evidence_ids.length"><td>证据</td><td>{{ subjectDetail.evidence_ids.length }} 条 · {{ (subjectDetail.source_refs || []).slice(0, 3).join(' / ') }}</td></tr>
                  </table>
                  <div class="kc-subj-sec" v-if="subjectDetailEvents.length">
                    <h4>最近 OSINT 事件</h4>
                    <div v-for="ev in subjectDetailEvents.slice(0, 5)" :key="ev.event_id" class="kc-sb-osint-card">
                      <div class="kc-sb-osint-card-top">
                        <span class="kc-sb-osint-alert" :class="ev.event_state === 'ACTIVE' ? 'kcre-active' : ''">{{ ev.event_state }}</span>
                        <span class="kc-sb-osint-title">{{ ev.title }}</span>
                      </div>
                      <div class="kc-sb-osint-card-meta">
                        <span class="kc-sb-osint-time">{{ ev.event_date }} · {{ ev.direction }} · {{ ev.event_type }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="kc-subj-sec" v-if="subjectDetailRelations.length">
                    <h4>关联关系</h4>
                    <div v-for="r in subjectDetailRelations.slice(0, 8)" :key="r.relation_id" class="kc-subj-rel">
                      <span class="kc-subj-rel-type">{{ r.relation_type }}</span>
                      <span class="kc-subj-rel-target">{{ r.related_subject_id }}</span>
                    </div>
                  </div>
                </div>
              </el-drawer>
            </el-tab-pane>
          </el-tabs>
        </template>

        <!-- 专家观点(铀:真实观点库 + 右上角"知识图谱"同页切换真实动态本体图谱; 汽车:保持空逻辑 §60) -->
        <div v-else-if="activeLibrary === 'experts'" class="kc-experts-page">
          <template v-if="!scenarioStore.isSupplyChain">
            <UraniumExpertViewLibrary v-if="expertViewMode === 'list'" />
            <div v-else class="kc-experts-graph-pane">
              <KnowledgeGraph
                embedded
                initial-view="dynamic"
                initial-window="t_2024"
              />
            </div>
          </template>
          <el-empty v-else description="专家观点功能开发中(汽车场景)" :image-size="120" />
        </div>
        <!-- 研究论文库(铀:K2-P1 真实论文;汽车:保持空 §60) -->
        <div v-else-if="activeLibrary === 'papers_lib'" class="kc-paper-page">
          <UraniumPaperLibrary v-if="!scenarioStore.isSupplyChain" />
          <el-empty v-else description="研究论文库(汽车场景)" :image-size="120" />
        </div>
        <div v-else-if="activeLibrary === 'config'" class="kc-config-page">
          <div class="kc-config-placeholder">
            <div class="kc-config-placeholder__icon">
              <el-icon :size="34"><Setting /></el-icon>
            </div>
            <div class="kc-config-placeholder__title">开发中</div>
            <div class="kc-config-placeholder__desc">知识库配置功能正在建设</div>
          </div>
        </div>

        <!-- 本体编辑（铀 & 汽车共用） -->
        <div v-else-if="['ontology','ontology_uranium','ontology_auto'].includes(activeLibrary)" class="kc-ontology-page">
          <div class="kc-ontology-layout">
            <!-- ===== LEFT: Config Panel ===== -->
            <div class="kc-ontology-config">
              <div class="kc-ontology-config-header">
                <h3><el-icon><Collection /></el-icon> 本体配置</h3>
                <el-button size="small" type="primary" @click="saveOntologyConfig">保存配置</el-button>
              </div>
              <el-collapse v-model="ontologyActivePanels" class="kc-ontology-collapse">
                <el-collapse-item title="数据工作流" name="workflow">
                  <el-form label-position="top" size="small">
                    <el-form-item label="工作流名称"><el-input v-model="ontologyForm.workflowName" /></el-form-item>
                    <el-form-item label="数据源"><el-select v-model="ontologyForm.dataSource" style="width:100%"><el-option label="结构化数据库" value="database" /><el-option label="非结构化文档" value="documents" /><el-option label="混合模式" value="hybrid" /></el-select></el-form-item>
                    <el-form-item label="自动执行"><el-switch v-model="ontologyForm.autoSchedule" /></el-form-item>
                    <el-form-item v-if="ontologyForm.autoSchedule" label="频率"><el-select v-model="ontologyForm.scheduleCron" style="width:100%"><el-option label="每小时" value="0 * * * *" /><el-option label="每日凌晨" value="0 0 * * *" /></el-select></el-form-item>
                  </el-form>
                </el-collapse-item>
                <el-collapse-item title="抽取规则" name="extraction">
                  <el-form label-position="top" size="small">
                    <el-form-item label="实体类型"><el-checkbox-group v-model="ontologyForm.entityTypes"><el-checkbox v-for="t in ontologyTypeOptions" :key="t" :label="t" /></el-checkbox-group></el-form-item>
                    <el-form-item label="关系类型"><el-checkbox-group v-model="ontologyForm.relationTypes"><el-checkbox v-for="t in ontologyRelationOptions" :key="t" :label="t" /></el-checkbox-group></el-form-item>
                    <el-form-item label="抽取深度"><el-slider v-model="ontologyForm.extractionDepth" :min="1" :max="5" show-input /></el-form-item>
                    <el-form-item label="NLP模型"><el-select v-model="ontologyForm.nlpModel" style="width:100%"><el-option label="BERT-CRF" value="bert-crf" /><el-option label="BiLSTM-CRF" value="bilstm-crf" /><el-option label="规则匹配" value="rule-based" /></el-select></el-form-item>
                  </el-form>
                </el-collapse-item>
                <el-collapse-item title="领域规则" name="domain">
                  <el-form label-position="top" size="small">
                    <el-form-item label="领域"><el-select v-model="ontologyForm.domain" style="width:100%"><el-option label="军事" value="military" /><el-option label="政治" value="politics" /><el-option label="经济" value="economy" /><el-option label="跨领域" value="cross-domain" /></el-select></el-form-item>
                    <el-form-item label="自定义规则"><el-input v-model="ontologyForm.customRules" type="textarea" :rows="3" placeholder="军事基地 -> 位于 -> 地理位置" /></el-form-item>
                    <el-form-item label="规则优先级"><el-slider v-model="ontologyForm.rulePriority" :min="0" :max="100" show-input /></el-form-item>
                  </el-form>
                </el-collapse-item>
                <el-collapse-item title="输出规范" name="output">
                  <el-form label-position="top" size="small">
                    <el-form-item label="输出格式"><el-select v-model="ontologyForm.outputFormat" style="width:100%"><el-option label="JSON-LD" value="json-ld" /><el-option label="RDF/XML" value="rdf-xml" /><el-option label="GraphML" value="graphml" /></el-select></el-form-item>
                    <el-form-item label="包含元数据"><el-switch v-model="ontologyForm.includeMetadata" /></el-form-item>
                    <el-form-item label="最大实体数"><el-input-number v-model="ontologyForm.maxEntities" :min="10" :max="10000" :step="100" style="width:100%" /></el-form-item>
                    <el-form-item label="输出路径"><el-input v-model="ontologyForm.outputPath" /></el-form-item>
                  </el-form>
                </el-collapse-item>
              </el-collapse>
            </div>

            <!-- ===== RIGHT: Visualization ===== -->
            <div class="kc-ontology-viz">
              <!-- Toolbar -->
              <div class="kc-ontology-toolbar">
                <div class="kc-ontology-toolbar-left">
                  <el-button :type="ontologyMode === 'view' ? 'primary' : ''" size="small" @click="ontologyMode='view'"><el-icon><Connection /></el-icon> 浏览</el-button>
                  <el-button :type="ontologyMode === 'edit' ? 'primary' : ''" size="small" @click="ontologyMode='edit'"><el-icon><Edit /></el-icon> 编辑</el-button>
                  <el-button :type="ontologyMode === 'link' ? 'primary' : ''" size="small" @click="toggleLinkMode"><el-icon><Plus /></el-icon> 连线</el-button>
                  <el-divider direction="vertical" />
                  <el-button size="small" @click="addOntologyNode"><el-icon><Plus /></el-icon> 添加节点</el-button>
                  <el-button size="small" @click="showAddRelationDialog = true"><el-icon><Connection /></el-icon> 添加关系</el-button>
                  <el-popconfirm title="清空所有节点和关系?" @confirm="resetOntologyGraph">
                    <template #reference><el-button size="small" type="danger" plain><el-icon><Delete /></el-icon> 重置</el-button></template>
                  </el-popconfirm>
                </div>
                <div class="kc-ontology-toolbar-right">
                  <el-tag v-for="cat in ontologyCategoryTags" :key="cat.name" size="small" :style="{ background: cat.color + '20', color: cat.color, borderColor: cat.color + '40' }">
                    <span :style="{ display:'inline-block', width:'8px', height:'8px', borderRadius:'50%', background: cat.color, marginRight:'4px' }"></span>
                    {{ cat.name }} ({{ cat.count }})
                  </el-tag>
                  <el-tooltip content="连线模式：依次点击两个节点创建关系，或使用「添加关系」弹窗"><el-icon :size="16" color="#94a3b8" style="margin-left:4px;cursor:pointer"><HelpFilled /></el-icon></el-tooltip>
                </div>
              </div>

              <!-- Graph -->
              <div class="kc-ontology-graph-wrap">
                <div ref="ontologyGraphRef" class="kc-ontology-graph" />
              </div>

              <!-- Selected entity detail -->
              <div v-if="ontologySelected" class="kc-ontology-detail-bar">
                <div class="kc-ontology-detail-info">
                  <span class="kc-ontology-detail-label">选中：</span>
                  <el-tag :color="ontologyCategoryColors[ontologySelected.category]" effect="dark" size="small" style="border:none">
                    {{ ontologySelected.name }}
                  </el-tag>
                  <span style="color:#94a3b8;font-size:12px;margin-left:8px">{{ ontologyTypeOptions[ontologySelected.category] || '实体' }}</span>
                </div>
                <div class="kc-ontology-detail-actions">
                  <el-button link size="small" @click="editOntologySelectedName"><el-icon><Edit /></el-icon> 重命名</el-button>
                  <el-popconfirm :title="'删除 ' + ontologySelected.name + '?'" @confirm="deleteOntologySelected">
                    <template #reference><el-button link size="small" type="danger"><el-icon><Delete /></el-icon> 删除</el-button></template>
                  </el-popconfirm>
                </div>
              </div>

              <!-- Edge detail -->
              <div v-if="ontologySelectedEdge" class="kc-ontology-detail-bar" style="border-left-color: #f59e0b;">
                <div class="kc-ontology-detail-info">
                  <span class="kc-ontology-detail-label">关系：</span>
                  <span style="font-weight:600;font-size:13px">{{ ontologySelectedEdge.sourceName }} → {{ ontologySelectedEdge.targetName }}</span>
                  <el-tag size="small" type="warning" style="margin-left:8px">{{ ontologySelectedEdge.value || '关联' }}</el-tag>
                </div>
                <div class="kc-ontology-detail-actions">
                  <el-popover placement="top" trigger="click" width="240">
                    <div style="display:flex;gap:8px;align-items:center">
                      <el-select v-model="tempRelationLabel" size="small" placeholder="关系类型" style="width:130px">
                        <el-option v-for="r in ontologyRelationOptions" :key="r" :label="r" :value="r" />
                      </el-select>
                      <el-button size="small" type="primary" @click="updateEdgeLabel">修改</el-button>
                    </div>
                    <template #reference><el-button link size="small"><el-icon><Edit /></el-icon> 修改关系</el-button></template>
                  </el-popover>
                  <el-popconfirm title="删除这条关系?" @confirm="deleteOntologySelectedEdge">
                    <template #reference><el-button link size="small" type="danger"><el-icon><Delete /></el-icon> 删除</el-button></template>
                  </el-popconfirm>
                </div>
              </div>

              <!-- 4 Model Summary Cards -->
              <div class="kc-ontology-models">
                <el-card shadow="hover" class="kc-ontology-model-card">
                  <template #header><div class="kc-ontology-model-header"><el-icon><Connection /></el-icon><span>知识图谱</span><el-tag size="small" type="success">已构建</el-tag></div></template>
                  <div class="kc-ontology-model-body">
                    <div class="kc-ontology-model-stat"><span class="kc-ontology-model-stat-value">{{ ontologyStats.graph.nodes }}</span><span class="kc-ontology-model-stat-label">实体节点</span></div>
                    <div class="kc-ontology-model-stat"><span class="kc-ontology-model-stat-value">{{ ontologyStats.graph.edges }}</span><span class="kc-ontology-model-stat-label">关系边</span></div>
                  </div>
                </el-card>
                <el-card shadow="hover" class="kc-ontology-model-card">
                  <template #header><div class="kc-ontology-model-header"><el-icon><Coin /></el-icon><span>态势模型</span><el-tag size="small" type="warning">模拟中</el-tag></div></template>
                  <div class="kc-ontology-model-body"><p class="kc-ontology-model-desc">基于当前本体构建动态态势感知模型，支持趋势预测与异常检测</p><div class="kc-ontology-model-stat"><span class="kc-ontology-model-stat-value">{{ ontologyStats.situation.factors }}</span><span class="kc-ontology-model-stat-label">态势因子</span></div></div>
                </el-card>
                <el-card shadow="hover" class="kc-ontology-model-card">
                  <template #header><div class="kc-ontology-model-header"><el-icon><MagicStick /></el-icon><span>决策模型</span><el-tag size="small" type="primary">就绪</el-tag></div></template>
                  <div class="kc-ontology-model-body"><p class="kc-ontology-model-desc">利用本体推理规则生成决策支持模型</p><div class="kc-ontology-model-stat"><span class="kc-ontology-model-stat-value">{{ ontologyStats.decision.rules }}</span><span class="kc-ontology-model-stat-label">推理规则</span></div></div>
                </el-card>
                <el-card shadow="hover" class="kc-ontology-model-card">
                  <template #header><div class="kc-ontology-model-header"><el-icon><MapLocation /></el-icon><span>环境模型</span><el-tag size="small" type="info">就绪</el-tag></div></template>
                  <div class="kc-ontology-model-body"><p class="kc-ontology-model-desc">从本体数据中提取地理空间和环境约束</p><div class="kc-ontology-model-stat"><span class="kc-ontology-model-stat-value">{{ ontologyStats.environment.locations }}</span><span class="kc-ontology-model-stat-label">地理实体</span></div></div>
                </el-card>
              </div>
            </div>
          </div>
        </div>

        <!-- 本体网络（事前页面：嵌入原本体网络界面 KnowledgeGraph / KnowledgeGraph_auto） -->
        <div v-else-if="activeLibrary === 'ontology_network'" class="kc-ontology-network-page">
          <KnowledgeGraphWrapper />
        </div>

        <!-- 模型库（事前页面：内容暂为空） -->
        <div v-else-if="activeLibrary === 'model_library'" class="kc-model-library-page">
          <el-empty description="暂无模型" :image-size="120" />
        </div>

        <!-- 专家观点库详情（暂时注释） -->
        <div v-else-if="activeLibrary === 'experts'" class="kc-expert-page">
          <el-empty description="专家观点功能开发中" :image-size="120" />
        </div>
      </div>
    </template>

    <!-- ====== DIALOGS ====== -->

    <!-- Upload Dialog -->
    <el-dialog v-model="showUploadDialog" title="上传数据集" width="480px" @closed="selectedFile = null">
      <el-form label-width="80px">
        <el-form-item label="文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".pdf,.epub,.txt,.doc,.docx"
            @change="onUploadFileChange"
          >
            <el-button size="small" type="primary">选择文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="uploadForm.name" placeholder="数据集名称（可选）" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="uploadForm.category" placeholder="选择分类" clearable>
            <el-option label="场景设定" value="场景设定" />
            <el-option label="态势建模" value="态势建模" />
            <el-option label="主体建模" value="主体建模" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUploadDialog = false">取消</el-button>
        <el-button type="primary" :loading="uploadLoading" @click="submitUpload">{{ uploadLoading ? '上传中...' : '上传' }}</el-button>
      </template>
    </el-dialog>

    <!-- Crawl Dialog -->
    <el-dialog v-model="showCrawlDialog" title="从 arXiv 爬取论文" width="420px">
      <el-form label-width="100px">
        <el-form-item label="关键词">
          <el-input v-model="crawlForm.keyword" placeholder="如：nuclear deterrence" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="crawlForm.maxResults" :min="1" :max="50" :step="5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCrawlDialog = false">取消</el-button>
        <el-button type="primary" :loading="loading.papers" @click="submitCrawl">
          开始爬取
        </el-button>
      </template>
    </el-dialog>

    <!-- Config Dialog -->
    <el-dialog v-model="showConfigDialog" title="知识库配置 — 解析与提取规则设定" width="900px">
      <div style="display: flex;">
        <div style="width: 45%; display: flex; flex-direction: column;">
          <el-form :model="configForm" label-position="top" label-width="auto">
            <el-form-item label="知识库名称" required>
              <el-input v-model="configForm.name" style="width: 95%" />
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="configForm.description" style="width: 95%" />
            </el-form-item>
            <el-form-item label="文档语言">
              <el-select v-model="configForm.language" style="width: 95%">
                <el-option label="简体中文" :value="0" />
                <el-option label="英文" :value="1" />
              </el-select>
            </el-form-item>
            <el-form-item label="权限">
              <el-radio-group v-model="configForm.authority">
                <el-radio label="0">只有我</el-radio>
                <el-radio label="1">团队</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="嵌入模型">
              <el-select v-model="configForm.model" style="width: 95%">
                <el-option-group label="BAAI">
                  <el-option value="0" label="BAAI/bge-large-zh-v1.5" />
                </el-option-group>
                <el-option-group label="FastEmbed">
                  <el-option value="1" label="BAAI/bge-base-en-v1.5" />
                  <el-option value="2" label="BAAI/bge-large-en-v1.5" />
                </el-option-group>
              </el-select>
            </el-form-item>
            <el-form-item label="解析方法">
              <el-select v-model="configForm.analyticMethod" style="width: 95%">
                <el-option v-for="m in analyticMethodOptions" :key="m.value" :label="m.label" :value="m.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="页面排名">
              <el-slider v-model="configForm.pageRank" :max="100" show-input style="width: 92%; margin-left: 2%" />
            </el-form-item>
            <el-form-item label="自动关键词">
              <el-slider v-model="configForm.autoKeyWord" :max="30" show-input style="width: 92%; margin-left: 2%" />
            </el-form-item>
            <el-form-item label="自动问题">
              <el-slider v-model="configForm.autoQuestion" :max="10" show-input style="width: 92%; margin-left: 2%" />
            </el-form-item>
            <el-form-item label="块 Token数">
              <el-slider v-model="configForm.tokenNum" :min="128" :max="2048" show-input style="width: 92%; margin-left: 2%" />
            </el-form-item>
            <el-form-item label="分段标识符">
              <el-input v-model="configForm.segmentIdentifier" style="width: 95%" />
            </el-form-item>
            <el-form-item label="布局识别和OCR">
              <el-select v-model="configForm.layoutAndOCR" style="width: 95%">
                <el-option label="DeepDoc" :value="0" />
                <el-option label="Plain Text" :value="1" />
              </el-select>
            </el-form-item>
            <el-form-item label="表格转HTML">
              <el-switch v-model="configForm.isTableToHtml" />
            </el-form-item>
            <el-form-item label="使用召回增强RAPTOR策略">
              <el-switch v-model="configForm.isRAPTOR" />
            </el-form-item>
            <el-form-item v-if="configForm.isRAPTOR" label="RAPTOR提示词">
              <el-input v-model="configForm.RAPTORPrompt" :rows="4" type="textarea" style="width: 95%" />
            </el-form-item>
            <el-card style="width: 95%; background: #fafcff;">
              <el-form-item label="提取知识图谱">
                <el-switch v-model="configForm.isGetKnowledgeMap" />
              </el-form-item>
              <template v-if="configForm.isGetKnowledgeMap">
                <el-form-item label="实体类型">
                  <el-tag v-for="tag in configForm.knowledgeMapCategory" :key="tag" closable style="margin-right: 4px; margin-bottom: 4px;" @close="removeMapCategory(tag)">
                    {{ tag }}
                  </el-tag>
                  <el-input v-if="mapInputVisible" v-model="mapInputValue" size="small" style="width: 120px; display: inline-flex;" @blur="confirmMapCategory" @keyup.enter="confirmMapCategory" />
                  <el-button v-else size="small" @click="mapInputVisible = true">+ New</el-button>
                </el-form-item>
                <el-form-item label="方法">
                  <el-select v-model="configForm.knowledgeMapMethod" style="width: 95%">
                    <el-option label="Light" :value="0" />
                    <el-option label="General" :value="1" />
                  </el-select>
                </el-form-item>
                <el-form-item label="实体归一化">
                  <el-switch v-model="configForm.knowledgeMapNormalize" />
                </el-form-item>
                <el-form-item label="社区报告生成">
                  <el-switch v-model="configForm.knowledgeMapReport" />
                </el-form-item>
              </template>
            </el-card>
          </el-form>
          <div style="display: flex; justify-content: center; gap: 12px; margin-top: 20px;">
            <el-button @click="showConfigDialog = false">取消</el-button>
            <el-button type="primary" @click="saveConfig">保存</el-button>
          </div>
        </div>
        <div style="width: 2%; display: flex;">
          <el-divider direction="vertical" style="height: 100%;" />
        </div>
        <div style="width: 48%; padding-left: 12px;">
          <div v-if="configForm.analyticMethod === 0" class="kc-config-help">
            <b style="font-size: 16px;">"General" 分块方法说明</b>
            <p style="margin-top: 8px;">支持 DOCX, EXCEL, PPT, IMAGE, PDF, TXT, MD, JSON, EML, HTML。</p>
            <p>将连续文本分割成多个片段，合并成Token数不超过设定值的块。</p>
          </div>
          <div v-else-if="configForm.analyticMethod === 1" class="kc-config-help">
            <b style="font-size: 16px;">"Q&A" 分块方法说明</b>
            <p style="margin-top: 8px;">支持 excel 和 csv/txt 文件格式。</p>
            <p>Excel：问题和答案两列；CSV/TXT：TAB定界符。</p>
          </div>
          <div v-else class="kc-config-help">
            <b style="font-size: 16px;">"Resume" 分块方法说明</b>
            <p style="margin-top: 8px;">支持 DOCX, PDF, TXT。</p>
            <p>将简历解析为结构化数据，便于搜索和筛选。</p>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- Keyword Dialog -->
    <el-dialog v-model="showKeywordDialog" title="关键词管理" width="480px">
      <div class="kc-keyword-section">
        <div class="kc-keyword-input-row">
          <el-input v-model="newKeyword" placeholder="输入新关键词" size="small" @keyup.enter="addKeyword" />
          <el-button size="small" type="primary" @click="addKeyword">添加</el-button>
        </div>
        <div class="kc-keyword-list">
          <el-tag
            v-for="kw in currentLib.keywords"
            :key="kw"
            closable
            :color="getKeywordColor(kw)"
            style="margin: 4px; color: #fff; border: none"
            @close="removeKeyword(kw)"
          >
            {{ kw }}
          </el-tag>
          <span v-if="!currentLib.keywords?.length" class="kc-keyword-empty">暂无关键词</span>
        </div>
      </div>
    </el-dialog>

    <!-- Expansion Dialog -->
    <el-dialog v-model="showExpansionDialog" title="AI 拓展方案" width="600px">
      <div v-if="expansionSchemes.length" class="kc-expansion-list">
        <div v-for="s in expansionSchemes" :key="s.id" class="kc-expansion-item">
          <div class="kc-expansion-item__header">
            <span class="kc-expansion-item__title">{{ s.title }}</span>
            <el-tag :type="s.confidence >= 0.7 ? 'success' : s.confidence >= 0.4 ? 'warning' : 'info'" size="small">
              {{ (s.confidence * 100).toFixed(0) }}%
            </el-tag>
          </div>
          <p v-if="s.rationale" class="kc-expansion-item__desc">{{ s.rationale }}</p>
          <span class="kc-expansion-item__time">{{ s.created_at?.slice(0, 10) || '' }}</span>
        </div>
      </div>
      <el-empty v-else description="暂无拓展方案，点击上方按钮生成" :image-size="60" />
    </el-dialog>
    <!-- Add Relation Dialog -->
    <el-dialog v-model="showAddRelationDialog" title="添加关系" width="480px">
      <el-form label-width="80px">
        <el-form-item label="源节点">
          <el-select v-model="addRelationForm.source" filterable placeholder="选择源节点" style="width:100%">
            <el-option v-for="n in ontologyGraphData.nodes" :key="n.id" :label="n.name" :value="n.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标节点">
          <el-select v-model="addRelationForm.target" filterable placeholder="选择目标节点" style="width:100%">
            <el-option v-for="n in ontologyGraphData.nodes" :key="n.id" :label="n.name" :value="n.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关系类型">
          <el-select v-model="addRelationForm.label" placeholder="选择关系类型" style="width:100%">
            <el-option v-for="r in ontologyRelationOptions" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddRelationDialog = false">取消</el-button>
        <el-button type="primary" @click="submitAddRelation">确认添加</el-button>
      </template>
    </el-dialog>
    <!-- Category Edit Dialog -->
    <el-dialog v-model="categoryDialogVisible" align-center append-to-body class="category-edit-dialog compact-kc-dialog" title="编辑分类" width="500px" center>
      <div class="category-dialog">
        <div class="dialog-header">
          <span class="book-name">{{ currentBookForCategory?.name }}</span>
        </div>
        <div class="category-selection">
          <div class="selection-title">请选择分类（可多选）</div>
          <el-checkbox-group v-model="selectedCategories" class="category-checkbox-group">
            <el-checkbox v-for="c in categoryOptions" :key="c.value" :label="c.label" class="category-checkbox">{{ c.label }}</el-checkbox>
          </el-checkbox-group>
        </div>
      </div>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCategoryUpdate">确定</el-button>
      </template>
    </el-dialog>

    <!-- Index/Tree Dialog (复用 KnowledgeIndex 组件) -->
    <KnowledgeIndex ref="knowledgeIndexRef" :book-name="indexBookName" @close="indexBookName = ''" />

    <!-- Query Dialog -->
    <el-dialog v-model="queryDialogVisible" :close-on-click-modal="false" align-center append-to-body class="book-query-dialog compact-kc-dialog" title="书籍查询" width="680px">
      <div v-if="currentBookForQuery" class="query-dialog-body">
        <div class="query-book-label">📖 查询书籍：<strong>{{ currentBookForQuery.name }}</strong></div>
        <div class="query-input-area">
          <el-input v-model="userQuery" :rows="5" type="textarea" placeholder="请输入您的问题，例如：这篇文档的核心观点是什么？" />
        </div>
        <div class="query-actions">
          <el-button size="default" @click="queryDialogVisible = false">取消</el-button>
          <el-button :disabled="!userQuery.trim()" :loading="isQuerying" size="default" type="primary" @click="sendQuery">发送查询</el-button>
        </div>
        <div v-if="queryResult" class="query-result-section">
          <h4 class="query-result-heading">📝 查询结果</h4>
          <div class="query-answer">{{ queryResult.content }}</div>
          <div v-if="queryResult.original_text" class="query-source-section">
            <h5 class="query-source-heading">📎 引用原文：</h5>
            <div class="query-source-text">{{ queryResult.original_text }}</div>
          </div>
        </div>
      </div>
    </el-dialog>
    <!-- Papers Library Dialog -->
    <el-dialog
      v-model="showPapersDialog"
      width="70%"
      top="3.5vh"
      class="kc-dataset-dialog kc-resource-dialog"
      body-class="kc-dataset-dialog__body"
      @open="fetchSidebarPapers(true)"
    >
      <template #header>
        <div class="kc-dialog-header">
          <span class="kc-dialog-dot kc-dialog-dot--close" @click="showPapersDialog = false"></span>
          <span class="kc-dialog-dot kc-dialog-dot--minimize"></span>
          <span class="kc-dialog-dot kc-dialog-dot--maximize"></span>
          <span class="kc-dialog-title">研究论文库</span>
        </div>
      </template>
      <div class="kc-resource-dialog__content">
        <div class="kc-resource-toolbar">
          <el-input
            v-model="sidebarPaperQuery"
            placeholder="搜索论文..."
            prefix-icon="Search"
            size="small"
            clearable
            class="kc-resource-search"
            @keyup.enter="handlePaperSearch"
            @clear="handlePaperSearch"
          />
          <el-button size="small" type="primary" plain @click="showSideCrawlDialog = true">
            <el-icon><Plus /></el-icon>
            爬取
          </el-button>
          <el-button size="small" type="primary" @click="showPaperUploadDialog = true">
            <el-icon><Upload /></el-icon>
            上传
          </el-button>
        </div>
        <div class="kc-sb-stats-row kc-resource-stats">
          <div class="kc-sb-stat"><span class="kc-sb-stat__v">{{ sidebarPaperStats.total }}</span><span class="kc-sb-stat__l">总数</span></div>
          <div class="kc-sb-stat"><span class="kc-sb-stat__v">{{ sidebarPaperStats.downloaded }}</span><span class="kc-sb-stat__l">已下载</span></div>
          <div class="kc-sb-stat"><span class="kc-sb-stat__v">{{ sidebarPaperStats.keywordCount }}</span><span class="kc-sb-stat__l">关键词</span></div>
        </div>
        <div v-loading="loading.papers" class="kc-resource-list kc-resource-list--papers">
          <div v-for="p in sidebarFilteredPapers" :key="p.name" class="kc-sb-paper-card">
            <div class="kc-sb-paper-top">
              <span class="kc-sb-paper-title">{{ p.title || p.name }}</span>
            </div>
            <div class="kc-sb-paper-meta">
              <span v-if="p.authors?.length" class="kc-sb-paper-authors">{{ p.authors.slice(0,2).join(', ') }}{{ p.authors.length > 2 ? ' 等' : '' }}</span>
              <span v-if="p.date" class="kc-sb-paper-date">{{ p.date }}</span>
            </div>
            <div class="kc-sb-paper-tags">
              <el-tag v-for="kw in getPaperKeywords(p).slice(0,3)" :key="kw" size="small" class="kc-sb-tag">{{ kw }}</el-tag>
              <el-tag v-for="cat in (p.categories || []).slice(0,2)" :key="cat" :type="getCategoryType(cat)" size="small" class="kc-sb-tag">{{ getCategoryLabel(cat) }}</el-tag>
            </div>
            <div class="kc-sb-paper-actions">
              <el-tooltip content="下载PDF"><el-button link type="primary" size="small" @click="handleDownload(p)"><el-icon><Download /></el-icon></el-button></el-tooltip>
              <el-tooltip content="AI拓展"><el-button link type="primary" size="small" @click="handleExpandPaper(p)"><el-icon><MagicStick /></el-icon></el-button></el-tooltip>
              <el-popconfirm title="删除这篇论文?" @confirm="handleDeletePaper(p)"><template #reference><el-button link type="danger" size="small"><el-icon><Delete /></el-icon></el-button></template></el-popconfirm>
            </div>
          </div>
          <div v-if="!sidebarFilteredPapers.length && !loading.papers" class="kc-sb-empty">
            <el-empty description="暂无论文" :image-size="80" />
          </div>
        </div>
        <el-pagination
          v-if="paperPagination.total > paperPagination.pageSize"
          class="kc-resource-pagination"
          background
          layout="prev, pager, next, total"
          :current-page="paperPagination.page"
          :page-size="paperPagination.pageSize"
          :total="paperPagination.total"
          @current-change="handlePaperPageChange"
        />
      </div>
    </el-dialog>

    <!-- ===== 改造后的 OSINT Dialog (三标签) ===== -->
    <el-dialog
      v-model="showOsintDialog"
      width="75%"
      top="3vh"
      class="kc-dataset-dialog kc-resource-dialog"
      body-class="kc-dataset-dialog__body"
      @open="onOsintDialogOpen"
      style="max-height: 85vh; display: flex; flex-direction: column;"
    >
      <template #header>
        <div class="kc-dialog-header">
          <span class="kc-dialog-dot kc-dialog-dot--close" @click="showOsintDialog = false"></span>
          <span class="kc-dialog-dot kc-dialog-dot--minimize"></span>
          <span class="kc-dialog-dot kc-dialog-dot--maximize"></span>
          <span class="kc-dialog-title">开源情报库</span>
        </div>
      </template>

      <!-- 开源情报库：仅"实时新闻"标签，铀/汽车事件由顶部场景按钮切换 -->
      <el-tabs v-model="osintTab" @tab-change="onOsintTabChange">
        <!-- ===== 实时新闻 ===== -->
        <!-- 开源情报(单一来源:真实 OSINT 事件 + 路线工件 + 用户上传) -->
        <el-tab-pane label="开源情报" name="osint">
          <div class="kc-osint-tab-toolbar" style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
            <el-input v-model="sidebarOsintKeyword" placeholder="搜索关键词..." prefix-icon="Search" size="small" clearable style="width:240px" />
            <el-button size="small" :loading="routeEvidenceLoading" @click="loadRouteEvidence(); fetchOsintByType('news')"><el-icon><RefreshRight /></el-icon> 刷新</el-button>
            <el-button size="small" type="primary" style="margin-left:auto;" @click="showOsintUploadDialog = true"><el-icon><Upload /></el-icon> 上传</el-button>
          </div>

          <div v-loading="routeEvidenceLoading" class="kc-resource-list kc-resource-list--osint">
            <div v-for="ev in osintEventList" :key="ev.event_id || ev.id" class="kc-sb-osint-card" :class="{ 'kc-sb-osint-card--high': ev.alert }">
              <div class="kc-sb-osint-card-top">
                <span class="kc-sb-osint-dot" :style="{ background: ev.color }" />
                <span v-if="ev.stateLabel" class="kc-sb-osint-alert" :class="ev.stateActive ? 'kcre-active' : ''">{{ ev.stateLabel }}</span>
                <span class="kc-sb-osint-title">{{ ev.title }}</span>
              </div>
              <p v-if="ev.summary" class="kc-sb-osint-desc">{{ ev.summary }}</p>
              <div class="kc-sb-osint-card-meta">
                <span class="kc-sb-osint-source">{{ ev.sourceLabel }}</span>
                <span class="kc-sb-osint-time">{{ ev.dateLabel }}</span>
                <span class="kc-sb-osint-cat" :class="ev.tone">{{ ev.categoryLabel }}</span>
              </div>
              <div class="kcre-actions" v-if="ev.links && ev.links.length">
                <a v-for="(l, li) in ev.links" :key="li" :href="l.url" target="_blank" rel="noopener" class="kc-sb-osint-link">
                  <el-icon :size="12"><Link /></el-icon> {{ l.label }}
                </a>
              </div>
            </div>
            <div v-if="!osintEventList.length" class="kc-sb-empty"><el-empty description="暂无开源情报" :image-size="80" /></div>
          </div>
        </el-tab-pane>

      </el-tabs>
    </el-dialog>

    <!-- Sidebar crawl dialog (papers) -->
    <el-dialog v-model="showSideCrawlDialog" title="从 arXiv 爬取论文" width="380px">
      <el-form label-width="90px">
        <el-form-item label="关键词">
          <el-input v-model="sideCrawlForm.keyword" placeholder="如：nuclear deterrence" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="sideCrawlForm.maxResults" :min="1" :max="50" :step="5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSideCrawlDialog = false">取消</el-button>
        <el-button type="primary" :loading="loading.papers" @click="submitSideCrawl">开始爬取</el-button>
      </template>
    </el-dialog>

    <!-- Paper Upload Dialog -->
    <el-dialog v-model="showPaperUploadDialog" title="上传论文" width="420px" :append-to-body="true" destroy-on-close @closed="resetPaperUploadDialog">
      <el-form label-width="60px">
        <el-form-item label="文件">
          <el-upload
            ref="paperUploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".pdf,.doc,.docx,.txt,.epub"
          >
            <el-button size="small" type="primary">选择文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="paperUploadForm.name" placeholder="文档名称（可选）" size="small" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showPaperUploadDialog = false">取消</el-button>
        <el-button size="small" type="primary" :loading="paperUploadLoading" @click="submitPaperUpload">
          {{ paperUploadLoading ? '上传中...' : '上传' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- OSINT Upload Dialog -->
    <el-dialog v-model="showOsintUploadDialog" title="上传开源情报" width="480px" :append-to-body="true" destroy-on-close @closed="resetOsintUploadDialog">
      <el-form label-width="78px">
        <el-form-item label="文件">
          <el-upload
            ref="osintUploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".pdf,.doc,.docx,.txt,.epub,.md,.json,.csv,.xlsx,.png,.jpg,.jpeg"
          >
            <el-button size="small" type="primary">选择文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="osintUploadForm.title" placeholder="情报标题（可选，留空则用文件名）" size="small" />
        </el-form-item>
        <el-form-item label="来源">
          <el-input v-model="osintUploadForm.source" placeholder="来源机构 / 媒体（可选）" size="small" />
        </el-form-item>
        <el-form-item label="原文链接">
          <el-input v-model="osintUploadForm.url" placeholder="https://...（可选）" size="small" />
        </el-form-item>
        <el-form-item label="日期">
          <el-input v-model="osintUploadForm.date" placeholder="YYYY-MM-DD（可选，默认今天）" size="small" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="osintUploadForm.summary" type="textarea" :rows="3" placeholder="情报摘要 / 要点（可选）" size="small" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showOsintUploadDialog = false">取消</el-button>
        <el-button size="small" type="primary" :loading="osintUploadLoading" @click="submitOsintUpload">
          {{ osintUploadLoading ? '上传中...' : '上传' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Dataset Management Dialog (内嵌旧 KnowledgeCreate) -->
    <el-dialog
      v-model="showDatasetDialog"
      width="70%"
      top="3.5vh"
      class="kc-dataset-dialog"
      body-class="kc-dataset-dialog__body"
    >
      <template #header>
        <div class="kc-dialog-header">
          <span class="kc-dialog-dot kc-dialog-dot--close" @click="showDatasetDialog = false"></span>
          <span class="kc-dialog-dot kc-dialog-dot--minimize"></span>
          <span class="kc-dialog-dot kc-dialog-dot--maximize"></span>
          <span class="kc-dialog-title">专家文档库</span>
        </div>
      </template>
      <div class="kc-dataset-dialog__content">
        <UraniumKnowledgeLibrary v-if="datasetScenario === 'uranium'" key="uranium" />
        <AutomotiveKnowledgeEmpty v-else key="automotive" />
      </div>
    </el-dialog>

  </div>
</template>

<script>
import {
  UserFilled, MapLocation, List, Reading,
  FolderOpened, Upload, Download, Delete,
  ArrowLeft, Coin, MagicStick, CollectionTag, Document, Plus,
  Setting, Connection, Loading, RefreshRight, Edit, Search, HelpFilled,
  Collection, Link, Clock, DataAnalysis
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getPapers, crawlPapers, uploadPaper, uploadOsint, deletePaper, downloadPaper, getPaperStats, addPaperKeyword, removePaperKeyword, getPaperKeywords as fetchPaperKeywords, expandPaper, categorizePaper, searchPapers } from '@/api/powerGame/papers.js'
import KnowledgeIndex from './knowledge/KnowledgeIndex.vue'
import UraniumKnowledgeLibrary from './knowledge/UraniumKnowledgeLibrary.vue'
import AutomotiveKnowledgeEmpty from './knowledge/AutomotiveKnowledgeEmpty.vue'
import UraniumExpertViewLibrary from './UraniumExpertViewLibrary.vue'
import UraniumPaperLibrary from './UraniumPaperLibrary.vue'
import AutomotiveLibraryView from './knowledge/AutomotiveLibraryView.vue'
import AutomotiveOntologyNetwork from './knowledge/AutomotiveOntologyNetwork.vue'
import KnowledgeCreate from './KnowledgeCreate.vue'
import KnowledgeGraphPanel from '@/components/KnowledgeGraphPanel.vue'
import KnowledgeGraphWrapper from './PreScene/KnowledgeGraphWrapper.vue'
import KnowledgeGraph from './PreScene/KnowledgeGraph.vue'
import { getScnetOsintEvents, getOsintNewsDetail } from '@/api/powerGame/osintKnowledgeGraph'
import { getUraniumKnowledgeSummary, getChinaRouteEvidence, getSubjectsSummary, getSubjects, getSubjectDetail, getSubjectEvents, getSubjectRelations, getEnvironmentSummary, getEnvironmentDatasets, getEnvironmentDataset, getChinaCurrentSituation, getChinaTradeStructure, getRulesSummary, getRules, getRuleDetail, getUraniumModelSummary, getUraniumModels, getUraniumModel, runUraniumModel, getExpertViewsSummary, getUraniumPaperSummary } from '@/api/powerGame/uraniumKnowledge'
import { getAutomotiveKnowledgeSummary } from '@/api/powerGame/automotiveKnowledge'
import './KnowledgeCenter.css'

const CATEGORY_LABELS = {
  intelligence_analysis: '情报分析',
  strategic_gaming: '战略博弈',
  game_theory: '博弈论',
  nuclear_deterrence: '核威慑',
  nuclear_strategy: '核战略',
  crisis_management: '危机管理',
  geopolitics: '地缘政治',
  international_relations: '国际关系',
  ai_security: 'AI安全',
  military_technology: '军事科技',
}

const CATEGORY_TYPES = {
  intelligence_analysis: 'warning',
  strategic_gaming: 'danger',
  game_theory: 'success',
  nuclear_deterrence: 'danger',
  nuclear_strategy: 'danger',
  crisis_management: 'warning',
  geopolitics: 'info',
  international_relations: 'primary',
  ai_security: 'success',
  military_technology: '',
}

import { useScenarioStore } from '@/stores/scenario'

export default {
  name: 'NewKnowledgeCenter',
  props: {
    // 事前页面启用「知识建构 → 本体网络」入口，嵌入原本体网络界面
    showOntologyNetwork: { type: Boolean, default: true },
  },
  setup() {
    const scenarioStore = useScenarioStore()
    return { scenarioStore }
  },
  components: {
    UserFilled, MapLocation, List, Reading,
    FolderOpened, Upload, Download, Delete, ArrowLeft,
    Coin, MagicStick, CollectionTag, Document, Plus,
    Setting, Connection, Loading, RefreshRight, Edit, Search, HelpFilled,
    KnowledgeIndex, KnowledgeCreate, KnowledgeGraphPanel, KnowledgeGraphWrapper, KnowledgeGraph, Collection, Link, Clock, DataAnalysis,
    UraniumKnowledgeLibrary, AutomotiveKnowledgeEmpty, UraniumExpertViewLibrary, UraniumPaperLibrary,
    AutomotiveLibraryView,
    AutomotiveOntologyNetwork,
  },
  data() {
    return {
      // 专家观点子页：'list' 观点列表 | 'graph' 真实动态知识图谱（右上角按钮同页切换）
      expertViewMode: 'list',
      // Resource data
      showPapersDialog: false,
      showOsintDialog: false,
      sidebarTab: 'dataset',
      sidebarPaperQuery: '',
      sidebarCategoryFilter: '',
      sidebarDatasetFilter: '',
      sidebarOsintKeyword: '',
      sidebarOsintLoading: false,
      sidebarOsintEvents: [],
      sidebarOsintLastUpdate: '',
      sidebarOsintCategoryFilter: 'all',
      osintTab: 'osint',
      routeEvidence: { artifacts: [], real_events: [], route_packs: {} },
      routeEvidenceLoading: false,
      subjectsSummary: null,
      subjectsList: { total: 0, items: [] },
      allSubjects: [],
      subjectsFilter: { type: '', country: '', status: '', keyword: '', page: 1, pageSize: 20 },
      subjectsLoading: false,
      subjectDetail: null,
      subjectDetailEvents: [],
      subjectDetailRelations: [],
      subjectDetailVisible: false,
      envSummary: null,
      envDatasets: [],
      envTab: 'resources',
      envLoading: false,
      envExpanded: '',
      envRecords: [],
      envExpandedLabel: '',
      envExpandedTotal: 0,
      envExpanding: false,
      rulesSummary: null,
      allRules: [],
      rulesFilter: { group: '', keyword: '' },
      ruleDetail: null,
      ruleDetailVisible: false,
      rulesLoading: false,
      modelSummary: null,
      allModels: [],
      modelTab: 'SITUATION',
      modelFilter: { keyword: '' },
      modelDetail: null,
      modelDetailVisible: false,
      modelsLoading: false,
      modelRunResult: null,
      modelRunning: false,
      officialCategory: '军控',
      newsEvents: [],
      socialEvents: [],
      showSideCrawlDialog: false,
      sideCrawlForm: { keyword: 'intelligence analysis', maxResults: 10 },
      showPaperUploadDialog: false,
      paperUploadLoading: false,
      paperUploadRef: null,
      paperUploadForm: { name: '' },
      showOsintUploadDialog: false,
      osintUploadLoading: false,
      osintUploadRef: null,
      osintUploadForm: { title: '', source: '', url: '', date: '', summary: '' },
      sidebarTabs: [
        { key: 'dataset', label: '专家文档库', icon: 'FolderOpened' },
        { key: 'osint', label: '开源情报库', icon: 'DataAnalysis' },
        { key: 'papers', label: '研究论文库', icon: 'Reading' },
      ],
      knowledgeSections: [], // 已改为 computed：knowledgeSections()（按 showOntologyNetwork 注入「本体网络」）
      sidebarOsintFilterOptions: [
        { key: 'all', label: '全部' },
        { key: '外交事件', label: '外交事件' },
        { key: '军事基地', label: '军事基地' },
        { key: '经济影响', label: '经济影响' },
      ],
      activeLibrary: null,
      papersData: [],
      paperPagination: { page: 1, pageSize: 10, total: 0 },
      viewMode: 'graph',
      datasetExpanded: false,
      showDatasetDialog: false,
      showUploadDialog: false,
      selectedFile: null,
      uploadLoading: false,
      showCrawlDialog: false,
      showKeywordDialog: false,
      showExpansionDialog: false,
      expanding: false,
      paperQuery: '',
      newKeyword: '',
      expansionSchemes: [],
      crawlForm: { keyword: 'intelligence analysis', maxResults: 10 },
      uploadForm: { name: '', category: '' },
      uploadRef: null,

      // 知识库配置
      showConfigDialog: false,
      configForm: {
        name: '', description: '', language: 0, authority: '0', model: 0,
        analyticMethod: 0, pageRank: 0, autoKeyWord: 0, autoQuestion: 0,
        tokenNum: 128, segmentIdentifier: '\\n!?;。；！？',
        layoutAndOCR: 0, isTableToHtml: false,
        isRAPTOR: false, RAPTORPrompt: '',
        isGetKnowledgeMap: false,
        knowledgeMapCategory: ['organization', 'person', 'geo', 'event', 'category'],
        knowledgeMapMethod: 0, knowledgeMapNormalize: false, knowledgeMapReport: false,
      },
      analyticMethodOptions: [
        { label: 'General', value: 0 }, { label: 'Q&A', value: 1 },
        { label: 'Resume', value: 2 }, { label: 'Manual', value: 3 },
        { label: 'Table', value: 4 }, { label: 'Paper', value: 5 },
        { label: 'Book', value: 6 }, { label: 'Laws', value: 7 },
        { label: 'Presentation', value: 8 }, { label: 'One', value: 9 },
        { label: 'Tag', value: 10 },
      ],
      mapInputVisible: false,
      mapInputValue: '',

      // 专家观点/认知模型
      cognitiveSelectedBook: '',
      extracting: false,
      cognitiveModelData: null,
      cognitiveMarkdownHtml: '',
      cognitiveChartInstance: null,
      expertOverviewStats: { models: 0, nodes: 0, loading: false },
      expertViewsSummary: null,
      paperSummary: null,
      expertStatsRequestId: 0,
      //模型库数量统计，暂时先写死
      modelLibraryCount: 12,
      modelLibraryLoading: false,
      enabledModelCount: 4,
      modelTypeCount: 3,



      loading: { papers: false, dataset: false, stats: false },
      error: null,

      paperStats: { total: 0, downloaded: 0, keywordCount: 0 },
      paperKeywordStatsRequestId: 0,
      resourceCache: {
        papersLoaded: false,
        paperStatsLoaded: false,
        booksLoaded: false,
        osintLoaded: false,
        expertStatsLoaded: false,
      },

      // 分类编辑
      categoryDialogVisible: false,
      currentBookForCategory: null,
      selectedCategories: [],
      categoryOptions: [
        { label: '场景设定', value: 'scene' },
        { label: '态势建模', value: 'situation' },
        { label: '主体建模', value: 'subject' },
        { label: '其他', value: 'other' },
      ],
      categoryFilter: '',

      // 索引/目录树（由 KnowledgeIndex 组件管理）
      indexBookName: '',

      // 查询测试
      queryDialogVisible: false,
      currentBookForQuery: null,
      userQuery: '',
      isQuerying: false,
      queryResult: null,

      // 本体编辑
      ontologyForm: {
        workflowName: '军事本体抽取流水线', dataSource: 'hybrid', autoSchedule: false, scheduleCron: '0 0 * * *',
        entityTypes: ['军事组织', '政治实体', '经济组织', '人物', '事件'],
        relationTypes: ['影响', '冲突', '贸易', '联盟', '包含', '依赖'],
        extractionDepth: 3, nlpModel: 'bert-crf',
        domain: 'cross-domain', customRules: '军事基地 -> 位于 -> 地理位置\n国家 -> 签署 -> 条约', rulePriority: 75,
        outputFormat: 'json-ld', includeMetadata: true, maxEntities: 5000, outputPath: '/output/ontology/',
      },
      ontologyActivePanels: ['workflow', 'extraction'],
      ontologyChartInstance: null,
      ontologyResizeHandler: null,
      ontologyMode: 'view',
      ontologySelected: null,
      ontologySelectedEdge: null,
      tempRelationLabel: '',
      ontologyLinkStart: null,
      showAddRelationDialog: false,
      addRelationForm: { source: '', target: '', label: '关联' },
      ontologyGraphData: {
        categories: [
          { name: '军事', itemStyle: { color: '#f43f5e' } },
          { name: '政治', itemStyle: { color: '#6366f1' } },
          { name: '经济', itemStyle: { color: '#10b981' } },
        ],
        nodes: [
          { id: 'n1', name: '航母战斗群', category: 0, symbolSize: 48 },
          { id: 'n2', name: '导弹防御系统', category: 0, symbolSize: 42 },
          { id: 'n3', name: '军事基地', category: 0, symbolSize: 44 },
          { id: 'n4', name: '网络战部队', category: 0, symbolSize: 36 },
          { id: 'n5', name: '卫星侦察', category: 0, symbolSize: 38 },
          { id: 'n6', name: '联合国', category: 1, symbolSize: 52 },
          { id: 'n7', name: '外交谈判', category: 1, symbolSize: 42 },
          { id: 'n8', name: '同盟条约', category: 1, symbolSize: 44 },
          { id: 'n9', name: '制裁决议', category: 1, symbolSize: 38 },
          { id: 'n10', name: '首脑会晤', category: 1, symbolSize: 40 },
          { id: 'n11', name: '国际贸易', category: 2, symbolSize: 46 },
          { id: 'n12', name: '能源供应链', category: 2, symbolSize: 42 },
          { id: 'n13', name: '金融制裁', category: 2, symbolSize: 40 },
          { id: 'n14', name: '科技出口管制', category: 2, symbolSize: 38 },
        ],
        links: [
          { source: 'n1', target: 'n2', value: '协同防御' },
          { source: 'n1', target: 'n3', value: '部署于' },
          { source: 'n2', target: 'n6', value: '安理会授权' },
          { source: 'n3', target: 'n8', value: '防务协议' },
          { source: 'n4', target: 'n14', value: '技术对抗' },
          { source: 'n5', target: 'n4', value: '信息支援' },
          { source: 'n6', target: 'n9', value: '通过' },
          { source: 'n7', target: 'n2', value: '军控谈判' },
          { source: 'n7', target: 'n11', value: '贸易协定' },
          { source: 'n8', target: 'n10', value: '缔约方会议' },
          { source: 'n9', target: 'n13', value: '经济制裁' },
          { source: 'n11', target: 'n12', value: '依赖' },
          { source: 'n12', target: 'n1', value: '燃料供应' },
          { source: 'n13', target: 'n11', value: '抑制' },
          { source: 'n11', target: 'n10', value: '经济对话' },
          { source: 'n5', target: 'n14', value: '监视' },
        ],
      },
      ontologyTypeOptions: ['军事', '政治', '经济'],
      ontologyRelationOptions: ['影响', '冲突', '贸易', '联盟', '包含', '依赖'],
      ontologyStats: {
        graph: { nodes: 14, edges: 16 },
        situation: { factors: 24 },
        decision: { rules: 36 },
        environment: { locations: 18 },
      },

      uraniumSummary: { documents: { total: 0, verified: 0, with_local_file: 0 }, evidence: { total: 0 }, papers: { total: 0 }, sources: { total: 0 }, osint: { total: 0, verified: 0, mock: 0 } },
      // AUTO-K1:汽车九库动态统计(domain=supply_chain)
      automotiveSummary: null,
      automotiveLoaded: false,
      autoLibKey: '',
      datasetScenario: 'uranium',
      dataset: {
        books: [
          { name: '古巴导弹危机分析报告.pdf', date: '2024-01-15', categories: ['场景设定'], status: 'finished' },
          { name: '核威慑理论综述.docx', date: '2024-02-20', categories: ['态势建模', '主体建模'], status: 'finished' },
          { name: '中美博弈态势评估.pdf', date: '2024-03-10', categories: ['态势建模'], status: 'analysing' },
          { name: '国际关系理论导论.epub', date: '2024-04-05', categories: ['其他'], status: 'pending' },
        ],
        loading: false,
        filter: '',
      },

      libraries: {
        // ── 主体库（铀 & 汽车两套） ──
        subject_uranium: {
          name: '主体库（铀）', desc: '铀供应链博弈主体 Agent 知识体系',
          docCount: 8, chunkCount: 210, entityCount: 98, relationCount: 256,
          enabled: true, keywords: ['Kazatomprom', 'Cameco', 'CNNC', 'Orano', '哈萨克斯坦'],
          documents: [
            { name: 'Kazatomprom 企业档案', type: '供应商', chunks: 32, uploadTime: '2024-03-10' },
            { name: 'CNNC 中核集团档案', type: '采购商', chunks: 28, uploadTime: '2024-03-12' },
            { name: 'Cameco 企业档案', type: '供应商', chunks: 25, uploadTime: '2024-03-14' },
          ],
          entityCategories: {
            supplier: { name: '供应商', count: 31, entities: ['Kazatomprom', 'Cameco', 'Orano', 'Uranium One', 'BHP'], overflow: 26 },
            buyer: { name: '采购商', count: 18, entities: ['CNNC', 'CGN', 'EDF', 'KHNP', 'Exelon'], overflow: 13 },
            regulator: { name: '监管机构', count: 9, entities: ['IAEA', 'NRC', 'EURATOM', 'CNCA'], overflow: 5 },
            port: { name: '港口', count: 8, entities: ['连云港', '防城港', '秦皇岛', '圣彼得堡'], overflow: 4 },
          },
          graphData: true,
        },
        subject_auto: {
          name: '主体库（汽车）', desc: '汽车供应链博弈主体 Agent 知识体系',
          docCount: 10, chunkCount: 280, entityCount: 124, relationCount: 345,
          enabled: true, keywords: ['比亚迪', '特斯拉', '宁德时代', '博世', '芯片'],
          documents: [
            { name: '比亚迪企业档案', type: '整车厂', chunks: 45, uploadTime: '2024-03-10' },
            { name: '宁德时代企业档案', type: '电池供应商', chunks: 38, uploadTime: '2024-03-12' },
            { name: '博世汽车电子档案', type: 'Tier1', chunks: 30, uploadTime: '2024-03-14' },
          ],
          entityCategories: {
            oem: { name: '整车厂', count: 22, entities: ['比亚迪', '特斯拉', '上汽', '蔚来', '小鹏', '理想'], overflow: 16 },
            tier1: { name: 'Tier1供应商', count: 35, entities: ['博世', '大陆', '电装', '采埃孚', '宁德时代'], overflow: 30 },
            chip: { name: '芯片厂商', count: 15, entities: ['英飞凌', '瑞萨', 'NXP', 'TI', '地平线'], overflow: 10 },
            port: { name: '港口/物流', count: 10, entities: ['上海港', '宁波港', '天津港', '汉堡港'], overflow: 6 },
          },
          graphData: true,
        },
        // ── 环境库（铀 & 汽车两套） ──
        environment_uranium: {
          name: '环境库（铀）', desc: '铀矿地理分布、地缘政治环境与运输通道',
          docCount: 6, chunkCount: 190, entityCount: 72, relationCount: 168,
          enabled: true, keywords: ['哈萨克斯坦', '尼日尔', '纳米比亚', '运输路线', '海上封锁'],
          documents: [
            { name: '哈萨克斯坦铀矿地理分布图', type: '地理', chunks: 42, uploadTime: '2024-02-08' },
            { name: '全球铀运输通道分析', type: '物流', chunks: 35, uploadTime: '2024-02-16' },
          ],
          entityCategories: {
            mine: { name: '矿山', count: 25, entities: ['Inkai', 'McArthur River', 'Cigar Lake', 'Olympic Dam', 'SOMAIR'], overflow: 20 },
            country: { name: '国家/地区', count: 18, entities: ['哈萨克斯坦', '加拿大', '澳大利亚', '尼日尔', '纳米比亚', '俄罗斯'], overflow: 12 },
            route: { name: '运输路线', count: 12, entities: ['中亚→中国', '北美→欧洲', '非洲→欧洲', '澳大利亚→亚洲'], overflow: 8 },
          },
          graphData: true,
        },
        environment_auto: {
          name: '环境库（汽车）', desc: '汽车产业布局、区域市场与贸易政策环境',
          docCount: 8, chunkCount: 230, entityCount: 94, relationCount: 212,
          enabled: true, keywords: ['长三角', '珠三角', '欧洲市场', '碳关税', '电池回收'],
          documents: [
            { name: '中国新能源汽车产业布局图', type: '产业地理', chunks: 52, uploadTime: '2024-02-08' },
            { name: '欧盟汽车贸易政策汇编', type: '政策', chunks: 38, uploadTime: '2024-02-16' },
          ],
          entityCategories: {
            cluster: { name: '产业集群', count: 15, entities: ['长三角', '珠三角', '京津冀', '成渝', '中部'], overflow: 10 },
            market: { name: '目标市场', count: 20, entities: ['中国', '欧盟', '东南亚', '俄罗斯', '中东', '南美'], overflow: 14 },
            policy: { name: '政策环境', count: 12, entities: ['碳关税', '反补贴调查', '双积分政策', 'IRA法案', '国六排放'], overflow: 7 },
          },
          graphData: true,
        },
        // ── 规则库（铀 & 汽车两套） ──
        rules_uranium: {
          name: '规则库（铀）', desc: '铀供应链调度规则、地缘与两用管制合规与刚性库存红线',
          docCount: 6, chunkCount: 124, entityCount: 46, relationCount: 88,
          enabled: true, keywords: ['美国禁俄铀法案', 'Class 7海运资质', '中哈过境协定', '180天安全库存', '照付不议长协'],
          documents: [
            { name: '美国禁俄铀法案 (Prohibiting Russian Uranium Imports Act) 实施细则', type: '管制法规', chunks: 36, uploadTime: '2024-05-18' },
            { name: '中哈放射性核材料过境与阿拉山口专用编组站技术协议', type: '双边规程', chunks: 28, uploadTime: '2024-03-12' },
            { name: '国际海事组织 (IMO) Class 7 放射性危化物海运与港口接卸规程', type: '国际标准', chunks: 32, uploadTime: '2024-02-15' },
            { name: '国家战略天然铀商业储备借调与紧急平抑联动机制', type: '集团制度', chunks: 28, uploadTime: '2024-06-01' },
          ],
          entityCategories: {
            sanction: { name: '管制法规', count: 12, entities: ['美国禁俄铀法案', 'Class 7危品航运资质', '中哈过境协定', '两用物项管制', 'IAEA保障监督'], overflow: 7 },
            contract: { name: '合约与配额', count: 10, entities: ['Inkai长协40%权益', 'Husab全资离岸FOB', 'Take-or-Pay照付不议', '180天安全库存红线'], overflow: 6 },
            logistics: { name: '口岸通运规则', count: 8, entities: ['阿拉山口1200tU/月上限', '连云港Class 7接卸资质', '鲸湾港45天船期窗口', '中走廊TITR通量限制'], overflow: 4 },
          },
          graphData: true,
        },
        papers_lib: {
          name: '研究论文库（铀）', desc: 'K2-P1 联网核验的铀供应链研究论文',
          docCount: 0, chunkCount: 0, entityCount: 0, relationCount: 0,
          enabled: true, keywords: ['uranium', 'supply', 'market', 'resources', 'China'],
          graphData: false,
        },
        rules_auto: {
          name: '规则库（汽车）', desc: '汽车供应链博弈规则、贸易壁垒与合规约束',
          docCount: 6, chunkCount: 110, entityCount: 42, relationCount: 78,
          enabled: true, keywords: ['关税规则', '芯片禁运', '电池合规', '原产地规则'],
          documents: [
            { name: '中欧汽车贸易规则集', type: '贸易规则', chunks: 35, uploadTime: '2024-01-05' },
            { name: '车规芯片出口管制条例', type: '法规', chunks: 28, uploadTime: '2024-01-20' },
          ],
          entityCategories: {
            tariff: { name: '关税壁垒', count: 8, entities: ['EU反补贴税17-35%', 'US Section 301', '碳边境税CBAM'], overflow: 5 },
            tech: { name: '技术管制', count: 7, entities: ['芯片出口管制', '电池技术限制', '数据安全合规'], overflow: 4 },
            standard: { name: '准入标准', count: 6, entities: ['Euro NCAP', 'GB国标', 'UN R155网络安全'], overflow: 3 },
          },
          graphData: true,
        },
        // ── 本体编辑 & 专家观点（保留共用） ──
        environment: {
          name: '环境库', desc: '博弈环境与地理空间信息（旧版，请使用场景版本）',
          docCount: 0, chunkCount: 0, entityCount: 0, relationCount: 0,
          enabled: false, keywords: [], documents: [], entityCategories: {}, graphData: false,
        },
        rules: {
          name: '规则库', desc: '博弈规则与行为约束条件（旧版，请使用场景版本）',
          docCount: 0, chunkCount: 0, entityCount: 0, relationCount: 0,
          enabled: false, keywords: [], documents: [], entityCategories: {}, graphData: false,
        },
      },
    }
  },

  computed: {
    // 知识库分区：资源 → 建构 → 资产（事前页面额外注入「本体网络」入口）
    knowledgeSections() {
      const sections = [
        {
          key: 'resources',
          title: '知识资源',
          desc: '汇聚专家文档与开源情报，提供可追溯的证据材料。',
          items: [
            { key: 'dataset', title: '专家文档库', desc: '沉淀专家报告、书籍和领域文档', icon: 'FolderOpened', theme: 'dataset', meta: 'Docs', action: 'dialog', dialog: 'dataset' },
            { key: 'osint', title: '开源情报库', desc: '跟踪事件新闻与公开情报', icon: 'DataAnalysis', theme: 'osint', meta: 'OSINT', action: 'dialog', dialog: 'osint' },
            { key: 'papers', title: '研究论文库', desc: '供应链相关研究论文', icon: 'Reading', theme: 'papers', meta: 'Verified', action: 'library', library: 'papers_lib' },
          ],
        },
        {
          key: 'construct',
          title: '模型与知识建构',
          desc: '将资料转化为观点、概念和关系，形成可解释的认知结构。',
          items: [
            { key: 'experts', title: '专家观点', desc: '抽取专家认知模型和观点网络', icon: 'Connection', theme: 'experts', meta: '观点图谱', action: 'library', library: 'experts' },
          ],
        },
        {
          key: 'assets',
          title: '仿真资产',
          desc: '面向实验与推演复用，组织主体、环境和规则资产。',
          items: [
            { key: 'subject', title: '主体库', desc: 'Agent 角色、组织与行为知识（按场景切换）', icon: 'UserFilled', theme: 'subject', meta: 'Agent', action: 'library', library: 'subject' },
            { key: 'environment', title: '环境库', desc: '地理空间、场景条件与外部约束（按场景切换）', icon: 'MapLocation', theme: 'environment', meta: 'Scene', action: 'library', library: 'environment' },
            { key: 'rules', title: '规则库', desc: '博弈规则、红线条件与行为约束（按场景切换）', icon: 'List', theme: 'rules', meta: 'Rules', action: 'library', library: 'rules' },
          ],
        },
      ]
      // 事前页面：在「专家观点」之后追加「本体网络」「模型库」，同一行展示
      if (this.showOntologyNetwork) {
        sections[1].items.push(
          {
            key: 'ontology_network', title: '本体网络', desc: '动态本体网络与 OWL 规则推理',
            icon: 'Collection', theme: 'ontology_network', meta: 'Network',
            action: 'library', library: 'ontology_network',
          },
          {
            key: 'model', title: '模型库', desc: '决策/仿真模型资产，按场景切换',
            icon: 'MagicStick', theme: 'model_library', meta: 'Model',
            action: 'library', library: 'model_library',
          },
        )
      }
      return sections
    },
    // 场景对应的 graph key：uranium → "uranium"，supply_chain → "supply_chain"
    scenarioGraphKey() {
      return this.scenarioStore.isSupplyChain ? 'supply_chain' : 'uranium'
    },
    // ── 知识库首页 · 领域切换（单一 canonical：scenarioStore 派生 uranium / automotive） ──
    domainOptions() {
      return [
        { id: 'uranium', label: '铀' },
        { id: 'automotive', label: '汽车' },
      ]
    },
    domainId() {
      return this.scenarioStore.isSupplyChain ? 'automotive' : 'uranium'
    },
    domainLabel() {
      return this.domainId === 'automotive' ? '汽车' : '铀'
    },
    // 汽车领域下这些详情页会泄漏铀/演示数据 → 一律显示统一空态
    automotiveEmptyDetail() {
      if (!this.scenarioStore.isSupplyChain) return false
      return ['environment_auto', 'rules_auto', 'model_library', 'ontology_network'].includes(this.activeLibrary)
    },
    autoEmptyLibName() {
      const names = {
        environment_auto: '环境库', rules_auto: '规则库',
        model_library: '模型库', ontology_network: '本体网络',
      }
      return names[this.activeLibrary] || '知识库'
    },
    autoEmptyDesc() {
      return `暂无汽车${this.autoEmptyLibName}数据`
    },
    // AUTO-K1:汽车库通用查看器
    isAutoLibraryDetail() {
      return this.activeLibrary === 'auto_lib'
    },
    // 按场景过滤的书籍（铀场景只显示铀相关，汽车场景显示汽车相关）
    scenarioBooks() {
      const books = this.dataset.books || []
      const isAuto = this.scenarioStore.isSupplyChain
      // 铀关键词 vs 汽车关键词
      const uraniumKW = ['铀', 'uranium', '核', 'nuclear', '矿山', 'mine', '核电', 'u3o8', '红皮书', 'redbook']
      const autoKW = ['汽车', 'auto', '车', 'vehicle', '供应链', 'supply', '电池', 'battery', '芯片', 'chip', '零部件', '制造', 'byd', '比亚迪', 'caam', '乘联会', '新能源', 'ev', '电动']
      return books.filter(b => {
        const name = (b.name || '').toLowerCase()
        const cats = (b.categories || []).join(' ').toLowerCase()
        const text = name + ' ' + cats
        if (isAuto) {
          return autoKW.some(k => text.includes(k.toLowerCase())) ||
                 !uraniumKW.some(k => text.includes(k.toLowerCase()))
        }
        return uraniumKW.some(k => text.includes(k.toLowerCase())) ||
               !autoKW.some(k => text.includes(k.toLowerCase()))
      })
    },
    currentLib() {
      if (!this.activeLibrary) return {}
      if (this.activeLibrary === 'ontology_network') {
        return { name: '本体网络', desc: '供应链动态本体网络 · 时间演化 / OWL 规则推理' }
      }
      if (this.activeLibrary === 'model_library') {
        return { name: '模型库', desc: '决策 / 仿真模型资产库' }
      }
      return this.libraries[this.activeLibrary] || {}
    },
    filteredBooks() {
      let list = this.scenarioBooks
      const q = this.dataset.filter.toLowerCase()
      if (q) list = list.filter(b => b.name.toLowerCase().includes(q))
      if (this.categoryFilter) list = list.filter(b => b.categories && b.categories.includes(this.categoryFilter))
      return list
    },
    isSubjectLibrary() {
      return ['subject_uranium', 'subject', 'subject_auto'].includes(this.activeLibrary)
    },
    isSubjectAutoLibrary() {
      return this.activeLibrary === 'subject_auto'
    },
    isEnvironmentLibrary() {
      return this.activeLibrary === 'environment_uranium' || this.activeLibrary === 'environment'
    },
    isRuleLibrary() {
      return this.activeLibrary === 'rules_uranium' || this.activeLibrary === 'rules'
    },
    isModelLibrary() {
      return this.activeLibrary === 'model_library'
    },
    isPaperLibrary() {
      return this.activeLibrary === 'papers_lib'
    },
    libraryStats() {
      const lib = this.currentLib
      if (!lib) return []
      // 主体库:使用真实 K2-S1 summary
      if ((this.activeLibrary === 'subject_uranium' || this.activeLibrary === 'subject') && this.subjectsSummary) {
        const total = this.subjectsSummary.total || 0
        const usable = this.subjectsSummary.usable || 0
        const rel = this.subjectsSummary.relations || 0
        return [
          { label: '主体', value: total, pct: 100 },
          { label: '已验证', value: usable, pct: total ? (usable / total) * 100 : 0 },
          { label: '关系', value: rel, pct: 80 },
        ]
      }
      // 环境库:真实 environment summary
      if (this.isEnvironmentLibrary && this.envSummary) {
        return [
          { label: '数据集', value: this.envSummary.datasets_total || 0, pct: 100 },
          { label: 'Canonical', value: this.envSummary.canonical_records || 0, pct: 80 },
          { label: '最新年份', value: this.envSummary.latest_year || 0, pct: 60 },
        ]
      }
      // 规则库:真实 rule summary
      if (this.isRuleLibrary && this.rulesSummary) {
        return [
          { label: '规则', value: this.rulesSummary.rules_total || 0, pct: 100 },
          { label: '生效', value: this.rulesSummary.runtime_effective_rules || 0, pct: 90 },
          { label: '规则组', value: this.rulesSummary.rule_groups || 0, pct: 70 },
        ]
      }
      // 模型库:真实 model summary
      if (this.isModelLibrary && this.modelSummary) {
        return [
          { label: '态势', value: this.modelSummary.situation_models || 0, pct: 100 },
          { label: '专业', value: this.modelSummary.professional_models || 0, pct: 70 },
          { label: '算法', value: this.modelSummary.general_algorithms || 0, pct: 60 },
        ]
      }
      // 研究论文库:K2-P1 真实论文 summary
      if (this.isPaperLibrary && this.paperSummary) {
        return [
          { label: '论文', value: this.paperSummary.papers_total || 0, pct: 100 },
          { label: 'PDF', value: this.paperSummary.pdf_available || 0, pct: 80 },
          { label: '中国', value: this.paperSummary.china_related || 0, pct: 60 },
        ]
      }
      const maxVal = Math.max(lib.docCount || 1, lib.chunkCount || 1, lib.entityCount || 1, lib.relationCount || 1)
      return [
        { label: '文档', value: lib.docCount || 0, pct: ((lib.docCount || 0) / maxVal) * 100 },
        { label: '切片', value: lib.chunkCount || 0, pct: ((lib.chunkCount || 0) / maxVal) * 100 },
        { label: '实体', value: lib.entityCount || 0, pct: ((lib.entityCount || 0) / maxVal) * 100 },
        { label: '关系', value: lib.relationCount || 0, pct: ((lib.relationCount || 0) / maxVal) * 100 },
      ]
    },
    resourceOverviewByKey() {
      // 汽车领域：统计来自 automotive summary(动态真实);数据未就绪的库显示真实 0
      const isAuto = this.scenarioStore.isSupplyChain
      if (isAuto) {
        const s = this.automotiveSummary || {}
        const d = s.documents || {}, o = s.osint || {}, p = s.papers || {}
        const v = s.expertViews || {}, ot = s.ontology || {}, md = s.models || {}
        const sub = s.subjects || {}, env = s.environment || {}, r = s.rules || {}
        const ld = !this.automotiveLoaded
        return {
          dataset: [{ label: '文档', value: d.total || 0, loading: ld }, { label: '已验证', value: d.verified || 0 }, { label: '证据', value: d.evidence || 0 }],
          osint: [{ label: '情报', value: o.total || 0, loading: ld }, { label: '预警', value: o.active || 0 }, { label: '分类', value: o.categories || 0 }],
          papers: [{ label: '论文', value: p.total || 0, loading: ld }, { label: 'PDF', value: p.pdf || 0 }, { label: '覆盖国家', value: p.countries || 0 }],
          experts: [{ label: '观点', value: v.total || 0, loading: ld }, { label: '机构', value: v.organizations || 0 }, { label: '主题', value: v.topics || 0 }],
          subject: [{ label: '主体', value: sub.total || 0, loading: ld }, { label: '已验证', value: sub.verified || 0 }, { label: '关系', value: sub.relations || 0 }],
          environment: [{ label: '数据集', value: env.datasets || 0, loading: ld }, { label: '记录', value: env.records || 0 }, { label: '最新年份', value: env.latest_year || '—' }],
          rules: [{ label: '规则', value: r.total || 0, loading: ld }, { label: '生效', value: r.active || 0 }, { label: '规则组', value: r.groups || 0 }],
          model: [{ label: '模型', value: md.total || 0, loading: ld }, { label: '专业', value: md.professional || 0 }, { label: '算法', value: md.algorithms || 0 }],
          ontology_network: [{ label: '类', value: ot.classes || 0, loading: ld }, { label: '关系', value: ot.relations || 0 }, { label: '约束', value: ot.constraints || 0 }],
        }
      }
      const paperLoading = this.loading.papers || this.loading.stats
      const datasetLoading = this.dataset.loading
      const osintLoading = this.sidebarOsintLoading
      const expertLoading = this.expertOverviewStats.loading
      const paperTotal = this.paperStats.total || this.sidebarPaperStats.total
      const paperDownloaded = this.paperStats.downloaded || this.sidebarPaperStats.downloaded
      const paperKeywordCount = this.paperStats.keywordCount > 0 ? this.paperStats.keywordCount : this.sidebarPaperStats.keywordCount
      const osintEvents = this.sidebarOsintEvents || []
      const datasetBooks = this.scenarioBooks || []
      const libraryStats = (key) => {
        const lib = this.libraries[key] || {}
        return [
          { label: '文档', value: lib.docCount || 0 },
          { label: '实体', value: lib.entityCount || 0 },
          { label: '关系', value: lib.relationCount || 0 },
        ]
      }

      return {
        papers: this.scenarioStore.isSupplyChain
          ? [{ label: '论文', value: 0 }, { label: 'PDF', value: 0 }, { label: '中国', value: 0 }]
          : (this.paperSummary
              ? [
                  { label: '论文', value: this.paperSummary.papers_total || 0 },
                  { label: 'PDF', value: this.paperSummary.pdf_available || 0 },
                  { label: '中国', value: this.paperSummary.china_related || 0 },
                ]
              : [{ label: '论文', value: 0, loading: true }, { label: 'PDF', value: 0 }, { label: '中国', value: 0 }]),
        osint: (() => {
          // 铀:口径与开源情报库一致 = 真实 OSINT 事件(路线证据 event_registry) + 用户上传
          const reg = this.routeEvidence.event_registry || []
          if (!reg.length) {
            return [
              { label: '情报', value: osintEvents.length, loading: osintLoading },
              { label: '预警', value: osintEvents.filter(item => item.alert).length, loading: osintLoading },
              { label: '分类', value: new Set(osintEvents.map(item => item.category).filter(Boolean)).size, loading: osintLoading },
            ]
          }
          const uploads = (this.newsEvents || []).filter(e => e.origin === 'USER_UPLOAD').length
          const active = reg.filter(e => e.event_state === 'ACTIVE' || e.event_state === 'ONGOING').length
          return [
            { label: '情报', value: reg.length + uploads, loading: this.routeEvidenceLoading },
            { label: '预警', value: active, loading: this.routeEvidenceLoading },
            { label: '分类', value: new Set(reg.map(e => e.event_type).filter(Boolean)).size, loading: this.routeEvidenceLoading },
          ]
        })(),
        dataset: [
          { label: '文档', value: this.scenarioStore.isSupplyChain ? 0 : this.uraniumSummary.documents.total, loading: datasetLoading },
          { label: '已验证', value: this.scenarioStore.isSupplyChain ? 0 : this.uraniumSummary.documents.verified, loading: datasetLoading },
          { label: '证据', value: this.scenarioStore.isSupplyChain ? 0 : this.uraniumSummary.evidence.total, loading: datasetLoading },
        ],
        experts: this.scenarioStore.isSupplyChain
          ? [{ label: '观点', value: 0 }, { label: '机构', value: 0 }, { label: '主题', value: 0 }]
          : (this.expertViewsSummary
              ? [
                  { label: '观点', value: this.expertViewsSummary.views_total || 0 },
                  { label: '机构', value: this.expertViewsSummary.organizations_total || 0 },
                  { label: '主题', value: this.expertViewsSummary.topics_total || 0 },
                ]
              : [{ label: '观点', value: 0, loading: true }, { label: '机构', value: 0 }, { label: '主题', value: 0 }]),
        ontology_network: [
          { label: '实体', value: this.ontologyGraphData.nodes.length },
          { label: '关系', value: this.ontologyGraphData.links.length },
          { label: '规则', value: this.ontologyStats.decision.rules },
        ],
        model: this.modelSummary
          ? [
              { label: '态势', value: this.modelSummary.situation_models || 0 },
              { label: '专业', value: this.modelSummary.professional_models || 0 },
              { label: '算法', value: this.modelSummary.general_algorithms || 0 },
            ]
          : [
              { label: '模型', value: this.modelLibraryCount || 0, loading: false },
              { label: '已启用', value: this.enabledModelCount || 0, loading: this.modelLibraryLoading },
              { label: '类型', value: this.modelTypeCount || 0, loading: this.modelLibraryLoading },
            ],
        subject: this.scenarioStore.isSupplyChain
          ? [
              { label: '主体', value: 0 },
              { label: '已验证', value: 0 },
              { label: '关系', value: 0 },
            ]
          : (this.subjectsSummary
              ? [
                  { label: '主体', value: this.subjectsSummary.total || 0 },
                  { label: '已验证', value: this.subjectsSummary.usable || 0 },
                  { label: '关系', value: this.subjectsSummary.relations || 0 },
                ]
              : libraryStats('subject_uranium')),
        environment: this.scenarioStore.isSupplyChain
          ? libraryStats('environment_auto')
          : (this.envSummary
              ? [
                  { label: '数据集', value: this.envSummary.datasets_total || 0 },
                  { label: 'Canonical', value: this.envSummary.canonical_records || 0 },
                  { label: '最新年份', value: this.envSummary.latest_year || 0 },
                ]
              : libraryStats('environment_uranium')),
        rules: this.scenarioStore.isSupplyChain
          ? libraryStats('rules_auto')
          : (this.rulesSummary
              ? [
                  { label: '规则', value: this.rulesSummary.rules_total || 0 },
                  { label: '生效', value: this.rulesSummary.runtime_effective_rules || 0 },
                  { label: '规则组', value: this.rulesSummary.rule_groups || 0 },
                ]
              : libraryStats('rules_uranium')),
      }
    },
    ontologyCategoryTags() {
      const cats = this.ontologyGraphData.categories
      const nodes = this.ontologyGraphData.nodes
      return cats.map((c, i) => ({
        name: c.name,
        color: c.itemStyle.color,
        count: nodes.filter(n => n.category === i).length,
      }))
    },
    ontologyCategoryColors() {
      return this.ontologyGraphData.categories.map(c => c.itemStyle.color)
    },
    entityList() {
      const cats = this.currentLib.entityCategories
      if (!cats) return []
      return Object.entries(cats).map(([key, val]) => ({
        ...val,
        type: key === 'person' ? '' : key === 'org' ? 'success' : key === 'event' ? 'warning' : 'info',
        overflow: Math.max(0, val.count - (val.entities?.length || 0)),
      }))
    },
    // Sidebar computed
    sidebarFilteredPapers() {
      const papers = this.papersData || []
      const q = this.sidebarPaperQuery.toLowerCase()
      if (!q) return papers
      return papers.filter(p => (p.title || p.name).toLowerCase().includes(q) || (p.authors || []).join(' ').toLowerCase().includes(q))
    },
    sidebarPaperStats() {
      const papers = this.papersData || []
      return {
        total: papers.length,
        downloaded: papers.filter(p => p.downloaded).length,
        keywordCount: this.countPaperKeywords(papers),
      }
    },
    sidebarFilteredBooks() {
      let list = this.dataset.books
      const q = this.sidebarDatasetFilter.toLowerCase()
      if (q) list = list.filter(b => b.name.toLowerCase().includes(q))
      if (this.sidebarCategoryFilter) list = list.filter(b => b.categories && b.categories.includes(this.sidebarCategoryFilter))
      return list
    },
    sidebarOsintFilteredEvents() {
      const cf = this.sidebarOsintCategoryFilter
      if (cf === 'all') return this.sidebarOsintEvents
      return this.sidebarOsintEvents.filter(e => e.category === cf)
    },
    newsFilteredEvents() {
      return this.newsEvents || []
    },
    // 开源情报库列表 = 真实 OSINT 事件(路线证据) + 用户上传,关键词本地过滤
    osintEventList() {
      const kw = String(this.sidebarOsintKeyword || '').trim().toLowerCase()
      const rows = []
      for (const ev of (this.routeEvidence.event_registry || [])) {
        const st = String(ev.event_state || '')
        rows.push({
          event_id: ev.event_id,
          title: ev.title || ev.event_id,
          summary: ev.summary || '',
          stateLabel: st,
          stateActive: st === 'ACTIVE' || st === 'ONGOING',
          alert: ev.severity_class === 'HIGH' || ev.severity === 'high' || st === 'ACTIVE',
          color: ev.direction === 'NEGATIVE' ? '#dc2626' : ev.direction === 'POSITIVE' ? '#16a34a' : '#f59e0b',
          tone: ev.direction === 'NEGATIVE' ? 'warn' : 'ok',
          sourceLabel: ev.event_type || ev.primary_source || '',
          dateLabel: `${ev.event_date || ''} · ${ev.direction || ''}`,
          categoryLabel: (ev.affected_route_ids || []).map(this.routeName).join(' / ') || ev.country_id || '',
          links: (ev.artifact_ids || []).slice(0, 2).map(a => ({ label: '查看原文', url: this.artifactUrl(a) })).filter(x => x.url),
          _kw: `${ev.title || ''} ${ev.summary || ''} ${(ev.affected_route_ids || []).join(' ')} ${ev.event_type || ''}`.toLowerCase(),
        })
      }
      for (const up of (this.newsEvents || []).filter(e => e.origin === 'USER_UPLOAD')) {
        rows.push({
          event_id: up.id, title: up.title, summary: up.description || '',
          stateLabel: '用户上传', stateActive: false, alert: false,
          color: '#6366f1', tone: 'ok',
          sourceLabel: up.source || '用户上传', dateLabel: up.date || '',
          categoryLabel: '用户上传',
          links: up.url ? [{ label: '查看原文', url: up.url }] : [],
          _kw: `${up.title || ''} ${up.description || ''} 用户上传`.toLowerCase(),
        })
      }
      return kw ? rows.filter(r => r._kw.includes(kw)) : rows
    },
    socialFilteredEvents() {
      return this.socialEvents || []
    },
  },

  watch: {
    activeLibrary: {
      handler(val) {
        this.$nextTick(() => {
          if (val === 'subject_uranium' || val === 'subject') {
            this.viewMode = 'subjects'
            this.loadSubjectsSummary()
            this.loadSubjects()
          }
          if (val === 'subject_auto') {
            // 汽车主体库:暂空,不放铀主体
            this.viewMode = 'subjects'
            this.allSubjects = []
            this.subjectsList = { total: 0, items: [] }
          }
          if (val === 'environment_uranium' || val === 'environment') {
            this.envTab = 'resources'
            this.loadEnvironment()
          }
          if (val === 'rules_uranium' || val === 'rules') {
            this.loadRules()
          }
          if (val === 'model_library') {
            this.modelTab = 'SITUATION'
            this.loadModels()
          }
          if (val === 'experts' && !this.resourceCache.expertStatsLoaded && !this.expertOverviewStats.loading) {
            this.fetchExpertOverviewStats(this.scenarioBooks)
          }
          if (val && this.currentLib.graphData) {
            this.initGraph()
          }
          if (val === 'ontology') {
            this.ontologyStats.graph.nodes = this.ontologyGraphData.nodes.length
            this.ontologyStats.graph.edges = this.ontologyGraphData.links.length
            this.$nextTick(() => this.renderOntologyGraph())
          }
        })
      },
      immediate: false,
    },
    viewMode() {
      this.$nextTick(() => {
        if (this.viewMode === 'graph' && this.currentLib.graphData) {
          this.initGraph()
        }
      })
    },
    // 场景切换时刷新知识库数据
    'scenarioStore.currentScenario'() {
      this.resourceCache.booksLoaded = false
      this.resourceCache.expertStatsLoaded = false
      this.fetchBookList(true)
      if (this.activeLibrary) {
        this.fetchSidebarOsint(true)
      }
    },
  },

  mounted() {
    // 知识库首页每次新进入默认铀领域（全局 scenarioStore 可能停在汽车，这里不沿用）
    if (!this.activeLibrary && this.scenarioStore.isSupplyChain) {
      this.scenarioStore.setScenario('uranium')
    }
    this.fetchBookList()
    this.fetchSidebarOsint()
    this.fetchUraniumSummary()
    this.loadSubjectsSummary()  // K2-S1.2:主体库卡片统计
    this.loadEnvironment()      // K2-E1:环境库卡片统计
    this.loadRules()            // K2-R1:规则库卡片统计
    this.loadModels()           // K2-M1:模型库卡片统计
    this.loadExpertViewsSummary()  // K2-V1:专家观点卡片统计
    this.loadPaperSummary()        // K2-P1:研究论文卡片统计
    // 开源情报卡片口径 = 真实 OSINT 事件(路线证据);铀场景加载,汽车走 automotive 分支
    if (!this.scenarioStore.isSupplyChain) { this.loadRouteEvidence(); this.fetchOsintByType('news') }
  },

  methods: {
    normalizeKeywordList(value) {
      if (Array.isArray(value)) {
        return value.flatMap(item => this.normalizeKeywordList(item))
      }
      if (value && typeof value === 'object') {
        if ('keyword' in value) return this.normalizeKeywordList(value.keyword)
        if ('name' in value) return this.normalizeKeywordList(value.name)
        if ('label' in value) return this.normalizeKeywordList(value.label)
        return []
      }
      if (typeof value === 'string') {
        return value
          .split(/[,，;；|、\n\r\t]+/)
          .map(item => item.trim())
          .filter(Boolean)
      }
      return []
    },
    uniqueKeywordList(values = []) {
      const seen = new Set()
      const result = []
      this.normalizeKeywordList(values).forEach(item => {
        const key = item.trim().toLowerCase()
        if (!key || seen.has(key)) return
        seen.add(key)
        result.push(item.trim())
      })
      return result
    },
    getPaperKeywords(paper) {
      const keywords = this.normalizeKeywordList(paper?.keywords ?? paper?.keyword ?? paper?.search_keyword ?? paper?.crawl_keyword)
      if (keywords.length) return this.uniqueKeywordList(keywords)
      const categories = this.normalizeKeywordList(paper?.categories).map(cat => CATEGORY_LABELS[cat] || cat)
      if (categories.length) return this.uniqueKeywordList(categories)
      return this.uniqueKeywordList(paper?.tags)
    },
    countPaperKeywords(papers = []) {
      return this.uniqueKeywordList(papers.flatMap(paper => this.getPaperKeywords(paper))).length
    },
    getPaperFilename(paper) {
      return paper?.name || paper?.filename || paper?.file_name || paper?.title || ''
    },
    getStatsKeywordCount(stats = {}) {
      const directCount = stats.keywordCount ?? stats.keyword_count ?? stats.keywords_count ?? stats.totalKeywords ?? stats.total_keywords
      const distributionCount = this.countKeywordDistribution(stats.keywords)
      if (distributionCount > 0) return distributionCount
      const categoryCount = this.countKeywordDistribution(stats.categories)
      if (categoryCount > 0) return categoryCount
      if (Array.isArray(stats.papers)) return this.countPaperKeywords(stats.papers)
      if (typeof directCount === 'number') return directCount
      return 0
    },
    countKeywordDistribution(keywords) {
      if (!keywords) return 0
      if (Array.isArray(keywords) || typeof keywords === 'string') {
        return this.uniqueKeywordList(keywords).length
      }
      if (typeof keywords === 'object') {
        const keys = this.uniqueKeywordList(Object.keys(keywords))
        if (keys.length) return keys.length
        return this.uniqueKeywordList(Object.values(keywords).flatMap(value => {
          if (typeof value === 'number') return []
          if (Array.isArray(value) || typeof value === 'string') return this.normalizeKeywordList(value)
          if (value && typeof value === 'object') {
            return this.normalizeKeywordList(value.keyword ?? value.name ?? value.label ?? [])
          }
          return []
        })).length
      }
      return 0
    },
    updatePaperStatsFromList(keywordCount = this.countPaperKeywords(this.papersData || [])) {
      const papers = this.papersData || []
      this.paperStats = {
        total: this.paperStats.total || papers.length,
        downloaded: this.paperStats.downloaded || papers.filter(p => p.downloaded).length,
        keywordCount,
      }
    },
    async refreshPaperKeywordStatsFromPapers(forceRemote = false) {
      const papers = this.papersData || []
      const localCount = this.countPaperKeywords(papers)
      if (!forceRemote && localCount > 0) {
        this.updatePaperStatsFromList(localCount)
        return localCount
      }
      if (!papers.length) {
        this.updatePaperStatsFromList(0)
        return 0
      }

      const requestId = this.paperKeywordStatsRequestId + 1
      this.paperKeywordStatsRequestId = requestId
      this.loading.stats = true
      const keywordSet = new Set()
      try {
        let cursor = 0
        const workerCount = Math.min(4, papers.length)
        const readOne = async (paper) => {
          const filename = this.getPaperFilename(paper)
          if (!filename) return
          try {
            const res = await fetchPaperKeywords(filename)
            let keywords = this.normalizeKeywordList(res?.keywords ?? res?.data?.keywords ?? res?.data ?? res)
            if (!keywords.length) {
              keywords = this.getPaperKeywords(paper)
            }
            if (keywords.length) {
              paper.keywords = this.uniqueKeywordList(keywords)
              paper.keywords.forEach(keyword => keywordSet.add(keyword.toLowerCase()))
            }
          } catch (e) {
            console.warn(`paper keywords unavailable for ${filename}`, e)
          }
        }
        const workers = Array.from({ length: workerCount }, async () => {
          while (cursor < papers.length) {
            const paper = papers[cursor]
            cursor += 1
            await readOne(paper)
          }
        })
        await Promise.all(workers)
      } finally {
        if (this.paperKeywordStatsRequestId === requestId) {
          this.updatePaperStatsFromList(keywordSet.size)
          this.resourceCache.paperStatsLoaded = true
          this.loading.stats = false
        }
      }
      return keywordSet.size
    },
    // ===== Resource dialogs =====
    // 领域切换：复用 scenarioStore(uranium / supply_chain)，不新增重复状态
    setDomain(domainId) {
      const target = domainId === 'automotive' ? 'supply_chain' : 'uranium'
      if (this.scenarioStore.currentScenario === target) return
      this.expertViewMode = 'list' // 切领域时复位专家观点子视图，避免残留铀图谱
      this.scenarioStore.setScenario(target)
      if (domainId === 'automotive') this.loadAutomotiveSummary()
      else { this.loadRouteEvidence(); this.fetchOsintByType('news') }
    },
    async loadAutomotiveSummary() {
      this.automotiveLoaded = false
      try {
        const res = await getAutomotiveKnowledgeSummary()
        this.automotiveSummary = (res && res.data) || null
      } catch (e) {
        console.warn('汽车知识库 summary 加载失败', e)
        this.automotiveSummary = null
      } finally {
        this.automotiveLoaded = true
      }
    },
    openAutoLibrary(lib) {
      this.autoLibKey = lib
      this.activeLibrary = 'auto_lib'
    },
    openKnowledgeEntry(item) {
      if (!item) return
      // AUTO-K1:汽车领域 → 通用九库查看器(dataset/osint 卡也从对话框转为库页,统一走 automotive API)
      if (this.scenarioStore.isSupplyChain) {
        if (item.key === 'ontology_network') { this.activeLibrary = 'auto_ontology_net'; return }
        const AUTO_LIB = {
          dataset: 'documents', osint: 'osint', papers: 'papers', experts: 'expertViews',
          subject: 'subjects', environment: 'environment', rules: 'rules',
          model: 'models',
        }
        const lib = AUTO_LIB[item.key]
        if (lib) { this.openAutoLibrary(lib) }
        return
      }
      if (item.action === 'dialog') {
        if (item.dialog === 'osint') {
          this.showOsintDialog = true
          this.switchSidebarTab('osint')
        } else if (item.dialog === 'dataset') {
          this.datasetScenario = this.scenarioStore.isSupplyChain ? 'automotive' : 'uranium'
          if (!this.scenarioStore.isSupplyChain) this.fetchUraniumSummary()
          this.showDatasetDialog = true
        } else if (item.dialog === 'papers') {
          this.showPapersDialog = true
          this.switchSidebarTab('papers')
        }
        return
      }
      if (item.action === 'library' && item.library) {
        // 主体库/环境库/规则库/本体编辑按场景切换：点铀按钮显示铀内容，点汽车按钮显示汽车内容
        const scenarioSuffix = this.scenarioStore.isSupplyChain ? '_auto' : '_uranium'
        if (['subject', 'environment', 'rules', 'ontology'].includes(item.library)) {
          this.activeLibrary = item.library + scenarioSuffix
        } else if (item.library === 'ontology_uranium') {
          this.activeLibrary = 'ontology_uranium'
        } else if (item.library === 'ontology_auto') {
          this.activeLibrary = 'ontology_auto'
        } else {
          // 打开任意库（含专家观点）时复位其子视图为默认
          if (item.library === 'experts') this.expertViewMode = 'list'
          this.activeLibrary = item.library
        }
      }
    },
    // 专家观点右上角：知识图谱 ⇄ 观点列表 同页切换
    toggleExpertGraph() {
      this.expertViewMode = this.expertViewMode === 'graph' ? 'list' : 'graph'
    },
    // 返回知识库首页：同时复位专家观点子视图为列表
    backToKnowledgeHub() {
      this.expertViewMode = 'list'
      this.activeLibrary = null
    },
    async fetchUraniumSummary() {
      if (this.scenarioStore.isSupplyChain) return  // automotive 不调用 uranium API
      try {
        const res = await getUraniumKnowledgeSummary()
        if (res && res.data) this.uraniumSummary = res.data
      } catch (e) {
        this.uraniumSummary = { documents: { total: 0, verified: 0, with_local_file: 0 }, evidence: { total: 0 }, papers: { total: 0 }, sources: { total: 0 }, osint: { total: 0, verified: 0, mock: 0 } }
      }
    },
    switchSidebarTab(key) {
      this.sidebarTab = key
      if (key === 'osint') {
        this.fetchSidebarOsint()
      }
      if (key === 'papers') {
        this.fetchSidebarPapers()
      }
      if (key === 'dataset') {
        // fetchBookList already called from mounted
      }
    },
    openOsintVisualPage() {
      const target = this.$router.resolve('/home/powerGame/osint')
      window.open(target.href, '_blank', 'noopener,noreferrer')
    },
    async fetchSidebarPapers(force = false) {
      if (this.resourceCache.papersLoaded && !force) return
      this.loading.papers = true
      // Clear previous data so we show loading state, not stale seed data
      this.papersData = []
      try {
        const res = await getPapers()
        // Accept multiple response formats:
        // 1. { success: true, data: [...] } — common axios wrapper
        // 2. { success: true, papers: [...] } — original expected format
        // 3. [...] — direct array response
        let paperList = null
        if (Array.isArray(res)) {
          paperList = res
        } else if (res?.success) {
          paperList = res.data || res.papers || null
        } else if (res?.data && Array.isArray(res.data)) {
          paperList = res.data
        }
        if (Array.isArray(paperList) && paperList.length > 0) {
          this.papersData = paperList
        }
        this.resourceCache.papersLoaded = true
      } catch (e) {
        console.warn('Paper API unavailable, no data loaded:', e)
        this.papersData = []
        this.resourceCache.papersLoaded = true
      } finally {
        this.loading.papers = false
        this.paperPagination.total = this.sidebarFilteredPapers.length
      }
      await this.refreshPaperKeywordStatsFromPapers()
    },
    handlePaperSearch() {
      // sidebarFilteredPapers 是响应式 computed，输入即过滤；这里同步分页总数并回到第一页
      this.paperPagination.total = this.sidebarFilteredPapers.length
      this.paperPagination.page = 1
    },
    async handleDownload(p) {
      const filename = p.name || p.filename || p.title
      if (!filename) return
      try {
        const res = await downloadPaper(filename)
        const blob = res instanceof Blob ? res : new Blob([res])
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename.includes('.') ? filename : `${filename}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (e) {
        console.warn('下载论文失败:', e)
      }
    },
    async handleExpandPaper(p) {
      const filename = p.name || p.filename || p.title
      if (!filename) return
      try {
        await expandPaper(filename)
        await this.fetchSidebarPapers(true)
      } catch (e) {
        console.warn('AI拓展论文失败:', e)
      }
    },
    async handleDeletePaper(p) {
      const filename = p.name || p.filename || p.title
      if (!filename) return
      try {
        await deletePaper(filename)
        await this.fetchSidebarPapers(true)
      } catch (e) {
        console.warn('删除论文失败:', e)
      }
    },
    handlePaperPageChange(page) {
      this.paperPagination.page = page
    },
    async onOsintDialogOpen() {
      // 每次打开都按当前场景（铀/汽车）重新拉取，避免切换场景后数据是旧的
      await this.fetchOsintByType('news')
      // 路线证据(铀)现已并入实时新闻页;汽车场景不适用
      if (!this.scenarioStore.isSupplyChain) this.loadRouteEvidence()
    },
    async onOsintTabChange(tab) {
      if (tab === 'news' && !this.newsEvents.length) {
        await this.fetchOsintByType('news')
      } else if (tab === 'social' && !this.socialEvents.length) {
        await this.fetchOsintByType('social')
      }
    },
    async loadRouteEvidence() {
      if (this.routeEvidenceLoading) return
      this.routeEvidenceLoading = true
      try {
        const r = await getChinaRouteEvidence()
        this.routeEvidence = (r && r.data) || { artifacts: [], real_events: [], route_packs: {} }
      } catch (e) {
        this.routeEvidence = { artifacts: [], real_events: [], route_packs: {} }
      } finally {
        this.routeEvidenceLoading = false
      }
    },
    routeName(rid) {
      const m = { kazakhstan: '哈萨克斯坦', namibia: '纳米比亚', canada: '加拿大', australia: '澳大利亚', uzbekistan: '乌兹别克斯坦', niger: '尼日尔', russia: '俄罗斯' }
      return m[rid] || rid
    },
    routeArtifacts(rid) {
      const arts = this.routeEvidence.artifacts || []
      return arts.filter(a => (a.related_route_ids || []).includes(rid))
    },
    artifactUrl(artId) {
      const arts = this.routeEvidence.artifacts || []
      const a = arts.find(x => x.artifact_id === artId)
      return (a && a.official_url) || ''
    },
    async loadSubjectsSummary() {
      try {
        const r = await getSubjectsSummary()
        this.subjectsSummary = (r && r.data) || null
      } catch (e) { this.subjectsSummary = null }
    },
    async loadSubjects() {
      this.subjectsLoading = true
      try {
        // K2-S1.3:一次加载全部 68,前端本地筛选/分页(避免后端 filter 参数兼容问题)
        const r = await getSubjects({ page: 1, page_size: 100 })
        const data = (r && r.data) || { total: 0, items: [] }
        this.allSubjects = data.items || []
        this.subjectsList = { total: data.total || this.allSubjects.length, items: this.allSubjects }
      } catch (e) { this.allSubjects = []; this.subjectsList = { total: 0, items: [] } } finally { this.subjectsLoading = false }
    },
    subjectsPageItems() {
      const f = this.subjectsFilter
      const kw = (f.keyword || '').trim().toLowerCase()
      let list = this.allSubjects
      if (f.type) list = list.filter(s => s.subject_type === f.type)
      if (f.country) list = list.filter(s => s.country_id === f.country)
      if (f.status) list = list.filter(s => (s.current_status || {}).status === f.status)
      if (kw) list = list.filter(s =>
        (s.canonical_name || '').toLowerCase().includes(kw) ||
        (s.aliases || []).some(a => String(a).toLowerCase().includes(kw)))
      this.subjectsFilter.page = Math.min(this.subjectsFilter.page, Math.max(1, Math.ceil(list.length / this.subjectsFilter.pageSize)))
      return list
    },
    subjectsPageSlice() {
      const list = this.subjectsPageItems()
      const start = (this.subjectsFilter.page - 1) * this.subjectsFilter.pageSize
      return list.slice(start, start + this.subjectsFilter.pageSize)
    },
    async openSubjectDetail(id) {
      try {
        const d = await getSubjectDetail(id)
        this.subjectDetail = (d && d.data) || null
        const ev = await getSubjectEvents(id)
        this.subjectDetailEvents = ((ev && ev.data) || {}).items || []
        const rel = await getSubjectRelations(id)
        this.subjectDetailRelations = ((rel && rel.data) || {}).items || []
        this.subjectDetailVisible = true
      } catch (e) { this.subjectDetail = null }
    },
    subjectVerifText(v) {
      const m = { VERIFIED_PUBLIC_ENTITY: '已验证', VERIFIED_PUBLIC_LOCATION: '已核验位置', EVIDENCE_BACKED_AGGREGATE: '聚合', CANDIDATE: '候选' }
      return m[v] || v || '—'
    },
    async loadEnvironment() {
      this.envLoading = true
      try {
        const s = await getEnvironmentSummary()
        this.envSummary = (s && s.data) || null
        const d = await getEnvironmentDatasets()
        this.envDatasets = ((d && d.data) || {}).items || []
      } catch (e) { this.envSummary = null; this.envDatasets = [] } finally { this.envLoading = false }
    },
    envDatasetMeta(cat) {
      return this.envDatasets.find(d => d.category === cat) || null
    },
    async toggleEnvDataset(datasetId, label) {
      if (this.envExpanded === datasetId) {
        this.envExpanded = ''
        this.envRecords = []
        return
      }
      this.envExpanding = true
      try {
        const r = await getEnvironmentDataset(datasetId, { page: 1, page_size: 50 })
        const d = (r && r.data) || null
        this.envRecords = d ? d.items : []
        this.envExpandedTotal = d ? d.total : 0
        this.envExpandedLabel = label || (d && d.name) || datasetId
        this.envExpanded = datasetId
      } catch (e) { this.envRecords = []; this.envExpanded = '' } finally { this.envExpanding = false }
    },
    envCatLabel(cat) {
      const m = { resources: '资源', production: '生产', requirements: '需求', capability: '产能' }
      return m[cat] || cat
    },
    async loadRules() {
      this.rulesLoading = true
      try {
        const s = await getRulesSummary()
        this.rulesSummary = (s && s.data) || null
        const r = await getRules({})
        this.allRules = ((r && r.data) || {}).items || []
      } catch (e) { this.rulesSummary = null; this.allRules = [] } finally { this.rulesLoading = false }
    },
    filteredRules() {
      const f = this.rulesFilter
      let list = this.allRules
      if (f.group) list = list.filter(rr => rr.rule_group === f.group)
      const kw = (f.keyword || '').trim().toLowerCase()
      if (kw) list = list.filter(rr => (rr.rule_name + rr.label_zh + rr.description).toLowerCase().includes(kw))
      return list
    },
    async openRuleDetail(id) {
      try {
        const r = await getRuleDetail(id)
        this.ruleDetail = (r && r.data) || null
        this.ruleDetailVisible = true
      } catch (e) { this.ruleDetail = null }
    },
    ruleGroupLabel(g) {
      const m = { EVENT_MAPPING: '事件映射', EVENT_STATE: '事件状态', EVENT_RISK: '事件风险', TIME_DECAY: '时间衰减', NETWORK_CRITICALITY: '网络关键性', NODE_RISK: '节点风险', EDGE_RISK: '边风险', ROUTE_RISK: '路线风险', RISK_LEVEL: '风险等级', CALIBRATION: '校准', DATA_GATE: '数据门禁', QUALITY_GUARD: '质量守卫', DEPENDENCY: '依赖' }
      return m[g] || g
    },
    async loadModels() {
      this.modelsLoading = true
      try {
        const s = await getUraniumModelSummary()
        this.modelSummary = (s && s.data) || null
        const r = await getUraniumModels({})
        this.allModels = ((r && r.data) || {}).items || []
      } catch (e) { this.modelSummary = null; this.allModels = [] } finally { this.modelsLoading = false }
    },
    async loadExpertViewsSummary() {
      try {
        const s = await getExpertViewsSummary()
        this.expertViewsSummary = (s && s.data) || null
      } catch (e) { this.expertViewsSummary = null }
    },
    async loadPaperSummary() {
      try {
        const s = await getUraniumPaperSummary()
        this.paperSummary = (s && s.data) || null
      } catch (e) { this.paperSummary = null }
    },
    filteredModels() {
      const kw = (this.modelFilter.keyword || '').trim().toLowerCase()
      let list = this.allModels.filter(m => m.model_category === this.modelTab)
      if (kw) list = list.filter(m => (m.model_name + m.methodology + m.purpose).toLowerCase().includes(kw))
      return list
    },
    async openModelDetail(id) {
      try {
        const r = await getUraniumModel(id)
        this.modelDetail = (r && r.data) || null
        this.modelDetailVisible = true
      } catch (e) { this.modelDetail = null }
    },
    modelCategoryLabel(c) {
      const m = { SITUATION: '态势模型', PROFESSIONAL: '专业模型', ALGORITHM: '通用算法' }
      return m[c] || c
    },
    modelReadinessClass(v) {
      const ok = ['READY', 'REAL_READY', 'DATA_READY', 'N/A']
      const warn = ['PARTIAL', 'PARTIAL_REAL', 'DATA_PARTIAL', 'REAL_BASELINE_ASSUMED', 'DERIVED_REAL_DATA', 'READY_DERIVED', 'ESTIMATED']
      return ok.includes(v) ? 'ok' : warn.includes(v) ? 'warn' : 'bad'
    },
    modelReadinessLabel(v) {
      const m = {
        REAL_READY: 'REAL READY', DATA_READY: 'REAL DATA BOUND', PARTIAL_REAL: 'PARTIAL REAL',
        REAL_BASELINE_ASSUMED: 'REAL BASELINE / ASSUMED PARAMETER', NOT_READY: 'NOT READY',
        INSUFFICIENT_HISTORY: 'INSUFFICIENT HISTORY', NOT_READY_FOR_SERIES: 'NOT READY (series too short)',
        DEMO_ONLY: 'DEMO', 'N/A': 'N/A'
      }
      return m[v] || v
    },
    async runModel(m) {
      this.modelRunning = true
      this.modelRunResult = null
      try {
        const params = {}
        if (m.model_category === 'ALGORITHM' && m.implementations && m.implementations.length) {
          params.implementation = m.implementations[0]
        }
        const r = await runUraniumModel(m.model_id, params)
        this.modelRunResult = (r && r.data) || null
      } catch (e) {
        this.modelRunResult = { error: (e && e.message) || '运行失败' }
      } finally {
        this.modelRunning = false
      }
    },
    formatRunResult(res) {
      const out = {}
      if (res.implementation) out['实现'] = res.implementation
      if (res.readiness) out['就绪'] = res.readiness
      if (res.capacity_basis) out['容量基准'] = res.capacity_basis
      if (res.unit) out['单位'] = res.unit
      if (res.baseline_flow !== undefined && res.baseline_flow !== null) out['基线流量'] = res.baseline_flow
      if (res.mode) out['模式'] = res.mode
      if (res.scenario_type) out['场景类型'] = res.scenario_type
      if (res.assumption_source) out['假设来源'] = res.assumption_source
      if (res.error) out['错误'] = res.error
      if (res.bottleneck_relative_score) out['瓶颈'] = res.bottleneck_relative_score
      if (res.current_availability_loss !== undefined) out['当前可用性损失'] = res.current_availability_loss
      if (res.missing_fields && res.missing_fields.length) out['缺失字段'] = res.missing_fields.join(', ')
      if (res.result && typeof res.result === 'object') out['结果'] = res.result
      return JSON.stringify(out, null, 2)
    },
    subjectTypeName(t) {
      const m = { COMPANY: '公司', MINE: '矿山', DEPOSIT: '矿床', PROCESSING_FACILITY: '加工设施', CONVERSION_FACILITY: '转化设施', FUEL_FABRICATION_FACILITY: '燃料制造设施', PORT: '港口', BORDER_CROSSING: '口岸', RAIL_NODE: '铁路节点', LOGISTICS_NODE: '物流节点', NUCLEAR_POWER_PLANT: '核电站', SUPPLY_NETWORK: '供应网络', TRANSPORT_INFRASTRUCTURE: '运输基础设施', OTHER: '其他' }
      return m[t] || t || '—'
    },
    subjectStatusText(s) {
      const m = { ACTIVE: '运行中', OPERATING: '运营中', SUSPENDED: '暂停', DISRUPTED: '中断', RECOVERED: '已恢复', UNKNOWN: '未知' }
      return m[s] || s || '—'
    },
    onGraphUpdated(stats) {
      // 图谱更新回调
    },
    async toggleOsintDetail(ev) {
  if (ev._expanded) {
    ev._expanded = false
    return
  }

  ev._expanded = true

  // 已经有详情，直接展示
  if (ev._detail) return

  // 列表数据里已经有摘要，先直接展示，避免显示“加载失败”
  if (ev.description || ev.summary || ev.content) {
    ev._detail = ev.description || ev.summary || ev.content
    return
  }

  if (!ev.id) {
    ev._detail = '暂无内容'
    return
  }

  ev._loading = true

  try {
    const res = await getOsintNewsDetail(ev.id)

    if (res?.success && res.data) {
      ev._detail =
        res.data.content ||
        res.data.summary ||
        ev.description ||
        ev.summary ||
        '暂无内容'

      ev._detailFull = res.data.content || ''
    } else {
      ev._detail = ev.description || ev.summary || '暂无内容'
    }
  } catch (e) {
    console.warn('Failed to load detail:', e)

    // 不要直接写“加载失败”，优先回退到已有摘要
    ev._detail = ev.description || ev.summary || ev.content || '暂无内容'
  } finally {
    ev._loading = false
  }
},

    async fetchOsintByType(sourceCategory) {
      this.sidebarOsintLoading = true
      try {
        // 改为调用 SCnet 后端接口，按场景（铀/汽车）获取开源情报
        const scenario = this.scenarioStore.isSupplyChain ? 'supply_chain' : 'uranium'
        const res = await getScnetOsintEvents(scenario, this.sidebarOsintKeyword || undefined)
        const events = Array.isArray(res?.data?.events) ? res.data.events : []
        const mapped = events.map((item, idx) => {
          const catMapping = { Economy: '经济影响', Military: '军事基地', Politics: '外交事件', General: '外交事件' }
          const cat = catMapping[item.type] || item.type || item.category || '外交事件'
          const colors = { '外交事件': '#6366f1', '军事基地': '#f43f5e', '经济影响': '#10b981' }
          return {
            id: item.id || `osint-${idx}`,
            title: item.title || '-',
            source: item.source || '-',
            url: item.url || '',
            date: (item.date || item.fullTime || item.time || '').split(' ')[0] || '-',
            description: item.summary || item.description || item.snippet || '',
            category: cat,
            color: item.color || colors[cat] || '#6366f1',
            alert: item.priority != null ? item.priority >= 80 : String(item.level || '').includes('高'),
            origin: item.origin || 'CRAWLER',
            _expanded: false,
          }
        })
        if (sourceCategory === 'news') {
          this.newsEvents = mapped
        } else if (sourceCategory === 'social') {
          this.socialEvents = mapped
        }
        this.sidebarOsintLastUpdate = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        this.resourceCache.osintLoaded = true
      } catch (e) {
        console.warn(`OSINT ${sourceCategory} API failed:`, e)
      }
      this.sidebarOsintLoading = false
    },
    async fetchSidebarOsint(force = false) {
      if (this.resourceCache.osintLoaded && !force) return
      this.sidebarOsintLoading = true
      try {
        // 改为调用 SCnet 后端接口，按场景（铀/汽车）获取开源情报
        const scenario = this.scenarioStore.isSupplyChain ? 'supply_chain' : 'uranium'
        const res = await getScnetOsintEvents(scenario)
        const allEvents = Array.isArray(res?.data?.events) ? res.data.events : []
        if (allEvents.length) {
          this.sidebarOsintEvents = allEvents.map((item, idx) => {
            const catMapping = { Economy: '经济影响', Military: '军事基地', Politics: '外交事件', General: '外交事件' }
            const cat = catMapping[item.type] || item.type || item.category || '外交事件'
            const colors = { '外交事件': '#6366f1', '军事基地': '#f43f5e', '经济影响': '#10b981' }
            return {
              id: item.id || `osint-${idx}`,
              title: item.title || '-',
              source: item.source || '-',
              url: item.url || '',
              date: (item.date || item.fullTime || item.time || '').split(' ')[0] || '-',
              description: item.summary || item.description || item.snippet || '',
              category: cat,
              color: item.color || colors[cat] || '#6366f1',
              alert: item.priority != null ? item.priority >= 80 : String(item.level || '').includes('高'),
              _expanded: false,
            }
          })
          this.sidebarOsintLastUpdate = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          this.resourceCache.osintLoaded = true
        } else {
          this.fallbackSidebarOsint()
        }
      } catch (e) {
        console.warn('OSINT API failed:', e)
        this.fallbackSidebarOsint()
      }
      this.sidebarOsintLoading = false
    },

    fallbackSidebarOsint() {
      const titles = [
        '伊朗宣布启动新一代离心机研发计划',
        '北约在波罗的海举行大规模联合军演',
        '联合国安理会就中东局势召开紧急会议',
        '美日韩三国签署新的防务合作协议',
        '俄罗斯与印度达成新的能源供应协定',
        '朝鲜向东部海域发射弹道导弹',
        '全球人工智能安全峰会在伦敦开幕',
        '中国与东盟就南海行为准则取得新进展',
        '美国国防部发布年度中国军力报告',
        '欧盟通过对俄罗斯新一轮制裁措施',
      ]
      const cats = ['外交事件', '军事基地', '外交事件', '军事基地', '经济影响', '军事基地', '外交事件', '外交事件', '军事基地', '经济影响']
      const sources = ['路透社', '新华社', '美联社', '共同社', '塔斯社', '朝中社', 'BBC', '环球网', '美国国防部', '欧洲动态']
      const colors = { '外交事件': '#6366f1', '军事基地': '#f43f5e', '经济影响': '#10b981' }
      this.sidebarOsintEvents = titles.map((t, i) => ({
        id: `fallback-osint-${i}`,
        title: t,
        source: sources[i % sources.length],
        url: '',
        date: new Date(Date.now() - i * 3600000).toLocaleDateString('zh-CN'),
        description: `${t}的相关情报摘要。此数据为本地示例数据。`,
        category: cats[i],
        color: colors[cats[i]],
        alert: i < 3,
        _expanded: false,
      }))
      this.sidebarOsintLastUpdate = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      this.resourceCache.osintLoaded = true
    },
    async submitSideCrawl() {
      this.loading.papers = true
      this.showSideCrawlDialog = false
      try {
        const res = await crawlPapers(this.sideCrawlForm.keyword, this.sideCrawlForm.maxResults)
        if (res?.success) {
          this.$message.success(res.message || `成功获取 ${res.count || 0} 篇论文`)
          await this.fetchSidebarPapers(true)
        } else {
          this.$message.warning(res?.message || '爬取失败')
        }
      } catch (e) {
        this.$message.error('爬取服务不可用')
        console.error(e)
      }
      this.loading.papers = false
    },
    resetPaperUploadDialog() {
      this.paperUploadForm.name = ''
      this.$refs.paperUploadRef?.clearFiles()
    },
    resetOsintUploadDialog() {
      this.osintUploadForm = { title: '', source: '', url: '', date: '', summary: '' }
      this.$refs.osintUploadRef?.clearFiles()
    },
    async submitPaperUpload() {
      this.$message.info('研究论文功能暂不可用')
    },
    async submitOsintUpload() {
      const files = this.$refs.osintUploadRef?.uploadFiles || []
      const rawFile = files[0]?.raw
      const f = this.osintUploadForm
      if (!rawFile && !(f.title || f.summary || f.url)) {
        this.$message.warning('请至少上传文件,或填写标题/摘要/原文链接')
        return
      }
      this.osintUploadLoading = true
      try {
        const res = await uploadOsint(rawFile || null, {
          title: f.title, source: f.source, url: f.url, date: f.date, summary: f.summary,
          scenario: this.scenarioStore.isSupplyChain ? 'supply_chain' : 'uranium',
        })
        if (res?.success || Number(res?.code) === 200) {
          this.$message.success('开源情报上传成功')
          this.showOsintUploadDialog = false
          await this.fetchOsintByType('news')
        } else {
          this.$message.error(res?.message || '开源情报上传失败，请重试')
        }
      } catch (e) {
        this.$message.error('开源情报上传服务暂不可用')
        console.warn('[OSINT Upload Error]', e)
      } finally {
        this.osintUploadLoading = false
      }
    },
    // ===== Navigation =====
    getLibraryIcon(key) {
      const icons = { subject: 'UserFilled', environment: 'MapLocation', rules: 'List', ontology: 'Collection', ontology_network: 'Collection', model_library: 'MagicStick' }
      return icons[key] || 'Document'
    },
    openLibrary(key) {
      this.activeLibrary = key
      this.viewMode = 'graph'
    },

    // ===== Library Controls =====
    toggleLibrary(key, val) {
      if (this.libraries[key]) {
        this.libraries[key].enabled = val
      }
    },
    handleDeleteLibrary() {
      if (this.activeLibrary && this.libraries[this.activeLibrary]) {
        this.libraries[this.activeLibrary].docCount = 0
        this.libraries[this.activeLibrary].documents = []
        this.libraries[this.activeLibrary].keywords = []
        this.$message.success('已清空知识库')
      }
    },

    // ===== Knowledge Graph =====
    initGraph() {
      this.$nextTick(() => {
        const el = this.$refs.graphRef
        if (!el) return
        if (this._chart) this._chart.dispose()

        const nodeCount = 12 + Math.floor(Math.random() * 8)
        const nodes = Array.from({ length: nodeCount }, (_, i) => ({
          id: `n${i}`,
          name: ['USA', 'USSR', 'Cuba', 'Turkey', 'NATO', 'WarsawPact', 'UN', 'CIA', 'KGB', 'Kennedy', 'Khrushchev', 'Castro', 'BayOfPigs', 'Berlin', 'NavalBlockade', 'MissileSites', 'EXCOMM', 'Pentagon', 'Kremlin'][i] || `Node${i}`,
          symbolSize: 20 + Math.random() * 30,
          category: Math.floor(Math.random() * 4),
        }))

        const edges = []
        for (let i = 0; i < nodeCount; i++) {
          const targets = new Set()
          const linkCount = 1 + Math.floor(Math.random() * 3)
          for (let j = 0; j < linkCount; j++) {
            const t = Math.floor(Math.random() * nodeCount)
            if (t !== i && !targets.has(t)) {
              targets.add(t)
              edges.push({ source: `n${i}`, target: `n${t}`, value: 1 + Math.random() * 3 })
            }
          }
        }

        this._chart = echarts.init(el)
        this._chart.setOption({
          backgroundColor: 'transparent',
          tooltip: { trigger: 'item', formatter: '{b}' },
          series: [{
            type: 'graph',
            layout: 'force',
            force: { repulsion: 300, edgeLength: 100, friction: 0.1 },
            roam: true,
            draggable: true,
            data: nodes,
            links: edges,
            categories: [
              { name: '国家', itemStyle: { color: '#6366f1' } },
              { name: '组织', itemStyle: { color: '#10b981' } },
              { name: '人物', itemStyle: { color: '#f59e0b' } },
              { name: '事件', itemStyle: { color: '#f43f5e' } },
            ],
            edgeSymbol: ['', 'arrow'],
            edgeSymbolSize: [0, 8],
            lineStyle: { color: 'source', curveness: 0.2, width: 1.5, opacity: 0.5 },
            label: { show: true, position: 'right', fontSize: 10, color: '#334155' },
            emphasis: {
              focus: 'adjacency',
              lineStyle: { width: 3, opacity: 0.8 },
            },
          }],
        })

        window.addEventListener('resize', () => this._chart?.resize())
      })
    },

    // ===== Dataset API (real backend - same pattern as KnowledgeCreate.vue) =====
    async fetchBookList(force = false) {
      if (this.resourceCache.booksLoaded && !force) return
      const axios = (await import('axios')).default
      this.dataset.loading = true
      try {
        let res = await axios.get('/api/domain/book/list')
        let data = res.data
        if (typeof data === 'string') {
          data = JSON.parse(data)
        }
        if (data.success && Array.isArray(data.message)) {
          this.dataset.books = data.message.map(item => ({
            name: item.book_name || item.name || '',
            date: String(item.upload_date || item.date || '').split(' ')[0],
            categories: item.categories || [],
            status: item.status || (item.is_analyzed ? 'finished' : 'pending'),
          }))
        }
        this.resourceCache.booksLoaded = true
      } catch (e) {
        console.warn('fetchBookList API unavailable, using mock data')
        this.resourceCache.booksLoaded = true
      } finally {
        this.dataset.loading = false
      }
      if (this.activeLibrary === 'experts') {
        this.fetchExpertOverviewStats(this.scenarioBooks, force)
      }
    },

    async fetchExpertOverviewStats(books = this.scenarioBooks, force = false) {
      if (this.resourceCache.expertStatsLoaded && !force) return
      const bookNames = [...new Set((books || []).map(item => item?.name).filter(Boolean))]
      const requestId = this.expertStatsRequestId + 1
      this.expertStatsRequestId = requestId
      this.expertOverviewStats = { models: 0, nodes: 0, loading: true }

      if (!bookNames.length) {
        this.expertOverviewStats = { models: 0, nodes: 0, loading: false }
        this.resourceCache.expertStatsLoaded = true
        return
      }

      const totals = { models: 0, nodes: 0 }
      try {
        const axios = (await import('axios')).default
        let cursor = 0
        const workerCount = Math.min(4, bookNames.length)
        const readOne = async (bookName) => {
          try {
            const res = await axios.get('/api/domain/book/cognitiveModel', {
              params: { book_name: bookName, force_refresh: false, graph_key: this.scenarioGraphKey }
            })
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
            const model = data?.success ? data.data : null
            if (!model) return

            const nodeCount = Array.isArray(model.nodes) ? model.nodes.length : 0
            const linkCount = Array.isArray(model.links) ? model.links.length : 0
            const hasExplanation = Boolean(model.markdown_explanation)
            if (nodeCount || linkCount || hasExplanation) {
              totals.models += 1
              totals.nodes += nodeCount
            }
          } catch (e) {
            console.warn(`cognitiveModel stats unavailable for ${bookName}`, e)
          }
        }
        const workers = Array.from({ length: workerCount }, async () => {
          while (cursor < bookNames.length) {
            const bookName = bookNames[cursor]
            cursor += 1
            await readOne(bookName)
          }
        })
        await Promise.all(workers)
      } catch (e) {
        console.warn('fetchExpertOverviewStats failed', e)
      } finally {
        if (this.expertStatsRequestId === requestId) {
          this.expertOverviewStats = { ...totals, loading: false }
          this.resourceCache.expertStatsLoaded = true
        }
      }
    },

    // ===== Paper API =====
    async fetchPapers(force = false) {
      if (this.resourceCache.papersLoaded && !force) return
      this.loading.papers = true
      try {
        const res = await getPapers()
        if (res?.success && Array.isArray(res?.papers)) {
          if (res.papers.length > 0) {
            this.papersData = res.papers
          }
        }
        this.resourceCache.papersLoaded = true
      } catch (e) {
        console.warn('Paper API unavailable', e)
        this.resourceCache.papersLoaded = true
      }
      this.loading.papers = false
      this.fetchPaperStats(force)
    },
    async fetchPaperStats(force = false) {
      if (this.resourceCache.paperStatsLoaded && !force) return
      this.loading.stats = true
      let needsKeywordFallback = false
      try {
        const res = await getPaperStats()
        if (res?.success && res?.data) {
          const keywordCount = this.getStatsKeywordCount(res.data)
          this.paperStats = {
            total: res.data.total || 0,
            downloaded: res.data.downloaded || 0,
            keywordCount,
          }
          needsKeywordFallback = keywordCount === 0
        }
      } catch (e) {
        // Fallback: compute from local data
        const papers = this.papersData || []
        const keywordCount = this.countPaperKeywords(papers)
        this.paperStats = {
          total: papers.length,
          downloaded: papers.filter(p => p.downloaded).length,
          keywordCount,
        }
        needsKeywordFallback = keywordCount === 0
      } finally {
        this.loading.stats = false
        this.resourceCache.paperStatsLoaded = true
      }
      if (needsKeywordFallback && (this.papersData || []).length) {
        await this.refreshPaperKeywordStatsFromPapers()
      }
    },
    async submitCrawl() {
      this.loading.papers = true
      this.showCrawlDialog = false
      try {
        const res = await crawlPapers(this.crawlForm.keyword, this.crawlForm.maxResults)
        if (res?.success) {
          this.$message.success(res.message || `成功获取 ${res.count || 0} 篇论文`)
          await this.fetchPapers(true)
        } else {
          this.$message.warning(res?.message || '爬取失败')
        }
      } catch (e) {
        this.$message.error('爬取服务不可用')
        console.error(e)
      }
      this.loading.papers = false
    },
    async handleDownload(row) {
      try {
        const blob = await downloadPaper(row.name)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = row.name
        a.click()
        window.URL.revokeObjectURL(url)
      } catch (e) {
        this.$message.info('下载功能需后端支持')
        window.open(row.url || '', '_blank')
      }
    },
    async handleDeletePaper(row) {
      try {
        const res = await deletePaper(row.name)
        if (res?.success) {
          this.$message.success('论文已删除')
          await this.fetchPapers(true)
        } else {
          this.$message.warning(res?.message || '删除失败')
        }
      } catch (e) {
        // Fallback: remove from local list
        this.papersData = (this.papersData || []).filter(p => p.name !== row.name)
        this.$message.success('论文已删除')
      }
    },
    async handleExpandPaper(row) {
      try {
        const res = await expandPaper(row.name)
        if (res?.success) {
          this.expansionSchemes = res.expansion_schemes || []
          this.showExpansionDialog = true
        } else {
          this.$message.warning(res?.message || '扩展失败')
        }
      } catch (e) {
        this.$message.info('AI扩展服务暂不可用')
      }
    },
    async handleCategorize(row) {
      try {
        const res = await categorizePaper(row.name)
        if (res?.success) {
          this.$message.success(`分类完成: ${res.label || res.categories?.join(', ')}`)
          await this.fetchPapers(true)
        } else {
          this.$message.warning(res?.message || '分类失败')
        }
      } catch (e) {
        this.$message.info('自动分类服务暂不可用')
      }
    },

    // ===== Keywords =====
    async addKeyword() {
      const kw = this.newKeyword.trim()
      if (!kw) return
      if (!this.currentLib.keywords) {
        this.currentLib.keywords = []
      }
      if (this.currentLib.keywords.includes(kw)) {
        this.$message.info('关键词已存在')
        return
      }

      this.currentLib.keywords.push(kw)
      this.newKeyword = ''
      this.$message.success(`关键词 "${kw}" 已添加`)
    },
    removeKeyword(kw) {
      if (!this.currentLib.keywords) return
      this.currentLib.keywords = this.currentLib.keywords.filter(k => k !== kw)
      this.$message.success(`关键词 "${kw}" 已移除`)
    },
    getKeywordColor(kw) {
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6', '#ec4899']
      let hash = 0
      for (let i = 0; i < kw.length; i++) hash = kw.charCodeAt(i) + ((hash << 5) - hash)
      return colors[Math.abs(hash) % colors.length]
    },

    // ===== Config =====
    removeMapCategory(tag) {
      this.configForm.knowledgeMapCategory = this.configForm.knowledgeMapCategory.filter(t => t !== tag)
    },
    confirmMapCategory() {
      const val = this.mapInputValue.trim()
      if (val && !this.configForm.knowledgeMapCategory.includes(val)) {
        this.configForm.knowledgeMapCategory.push(val)
      }
      this.mapInputVisible = false
      this.mapInputValue = ''
    },
    async saveConfig() {
      try {
        const axios = (await import('axios')).default
        const res = await axios.post('/api/domain/book/config', this.configForm)
        if (res.data?.success) {
          this.$message.success('配置已保存')
          this.showConfigDialog = false
        } else {
          this.$message.warning(res.data?.message || '保存失败')
        }
      } catch (e) {
        this.$message.success('配置已保存（本地）')
        this.showConfigDialog = false
      }
    },

    // ===== 专家观点 — 认知模型提取 (calls /api/domain/book/cognitiveModel) =====
    extractCognitiveModel(forceRefresh = false) {
      if (!this.cognitiveSelectedBook) return
      this.extracting = true
      if (forceRefresh) {
        this.cognitiveModelData = null
        this.cognitiveMarkdownHtml = ''
      }

      const axiosPromise = (async () => {
        const axios = (await import('axios')).default
        return axios.get('/api/domain/book/cognitiveModel', {
          params: { book_name: this.cognitiveSelectedBook, force_refresh: forceRefresh, graph_key: this.scenarioGraphKey }
        })
      })()

      axiosPromise.then(res => {
        this.extracting = false
        const data = res.data
        if (data?.success && data?.data) {
          this.cognitiveModelData = data.data
          if (data.data.markdown_explanation) {
            this.cognitiveMarkdownHtml = data.data.markdown_explanation
          }
          this.$nextTick(() => {
            this.renderCognitiveChart()
          })
          if (forceRefresh) {
            this.$message.success('已重新提取并保存认知模型')
            this.fetchExpertOverviewStats(this.dataset.books, true)
          }
        } else {
          this.$message.warning(data?.message || '提取失败')
        }
      }).catch(err => {
        this.extracting = false
        this.$message.error('网络错误，请检查后端服务')
        console.error('extractCognitiveModel error:', err)
      })
    },
    renderCognitiveChart() {
      const chartDom = document.getElementById('cognitiveChart')
      if (!chartDom || !this.cognitiveModelData) return

      if (this.cognitiveChartInstance) {
        this.cognitiveChartInstance.dispose()
      }
      this.cognitiveChartInstance = echarts.init(chartDom)

      const rawNodes = Array.isArray(this.cognitiveModelData.nodes) ? this.cognitiveModelData.nodes : []
      const rawLinks = Array.isArray(this.cognitiveModelData.links) ? this.cognitiveModelData.links : []

      const categoryMetaMap = new Map()
      const categoryOrder = []
      rawNodes.forEach((node) => {
        const key = String(node.category ?? node.type ?? node.category_name ?? node.category_label ?? '未分类')
        if (!categoryMetaMap.has(key)) {
          const readableName = String(node.category_name || node.category_label || node.type || node.category || '未分类')
          categoryMetaMap.set(key, readableName)
          categoryOrder.push(key)
        }
      })

      const colorPalette = ['#2563eb', '#7c3aed', '#0891b2', '#d946ef', '#16a34a', '#ea580c', '#0f766e', '#e11d48']
      const symbolPalette = ['circle', 'roundRect', 'diamond', 'triangle', 'pin', 'rect']

      const categories = categoryOrder.map((key, idx) => ({
        name: categoryMetaMap.get(key),
        itemStyle: { color: colorPalette[idx % colorPalette.length] }
      }))

      const degreeMap = {}
      rawLinks.forEach((link) => {
        const s = String(link.source)
        const t = String(link.target)
        degreeMap[s] = (degreeMap[s] || 0) + 1
        degreeMap[t] = (degreeMap[t] || 0) + 1
      })

      const nodes = rawNodes.map((node) => {
        const key = String(node.category ?? node.type ?? node.category_name ?? node.category_label ?? '未分类')
        const idx = Math.max(0, categoryOrder.indexOf(key))
        const nid = String(node.id || node.name || `node_${Math.random().toString(36).slice(2)}`)
        const deg = degreeMap[nid] || 1
        const color = colorPalette[idx % colorPalette.length]
        return {
          name: node.name || nid, id: nid, category: idx,
          symbol: symbolPalette[idx % symbolPalette.length],
          symbolSize: Math.min(78, Math.max(40, 34 + deg * 5)),
          draggable: true,
          itemStyle: { color, shadowBlur: 18, shadowColor: `${color}88`, borderColor: '#ffffff', borderWidth: 2 },
          label: { show: true, color: '#0f172a', fontSize: 12, backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 6, padding: [3, 6] }
        }
      })

      const links = rawLinks.map((link, i) => ({
        source: String(link.source), target: String(link.target),
        value: link.label || link.value || '',
        lineStyle: { width: 1.8 + (i % 3) * 0.45, curveness: 0.12 + (i % 4) * 0.05, opacity: 0.72 },
        label: { show: true, formatter: '{c}', fontSize: 11, color: '#334155', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 4, padding: [1, 4] }
      }))

      this.cognitiveChartInstance.setOption({
        backgroundColor: '#ffffff',
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            if (params.dataType === 'node') {
              return `<b>${params.data.name}</b><br/>类别：${categories[params.data.category]?.name || '未分类'}`
            }
            return `<b>${params.data.source}</b> → <b>${params.data.target}</b><br/>关系：${params.data.value || '关联'}`
          }
        },
        legend: [{
          type: 'scroll', data: categories.map(c => c.name),
          top: 8, left: 20, right: 20, orient: 'horizontal',
          selectedMode: true, textStyle: { color: '#334155', fontSize: 12 }
        }],
        animationDuration: 1700, animationEasing: 'elasticOut',
        animationDurationUpdate: 1300, animationEasingUpdate: 'quarticInOut',
        series: [{
          type: 'graph', layout: 'force', top: 72, left: 12, right: 12, bottom: 10,
          data: nodes, links, categories,
          roam: true, draggable: true, focusNodeAdjacency: false,
          edgeSymbol: ['none', 'arrow'], edgeSymbolSize: [0, 10],
          lineStyle: { color: '#94a3b8', curveness: 0.25 },
          emphasis: { scale: true, focus: 'none', lineStyle: { width: 5, opacity: 1 } },
          force: { repulsion: 980, gravity: 0.07, edgeLength: [180, 270], friction: 0.16, layoutAnimation: true }
        }]
      }, true)
    },

    // ===== Expansion =====
    // ===== Ontology Editor =====
    getNextNodeId() {
      const ids = this.ontologyGraphData.nodes.map(n => parseInt(n.id.replace('n', '')) || 0)
      return 'n' + (Math.max(0, ...ids) + 1)
    },
    findNodeById(id) {
      return this.ontologyGraphData.nodes.find(n => n.id === id)
    },
    findNodeByName(name) {
      return this.ontologyGraphData.nodes.find(n => n.name === name)
    },
    renderOntologyGraph() {
      this.$nextTick(() => {
        if (this.ontologyChartInstance) {
          this.ontologyChartInstance.dispose()
          this.ontologyChartInstance = null
        }
        const el = this.$refs.ontologyGraphRef
        if (!el) return

        const data = this.ontologyGraphData
        const colors = data.categories.map(c => c.itemStyle.color)

        // Calculate degree for sizing
        const degMap = {}
        data.links.forEach(l => {
          degMap[l.source] = (degMap[l.source] || 0) + 1
          degMap[l.target] = (degMap[l.target] || 0) + 1
        })

        const nodes = data.nodes.map(n => ({
          id: n.id,
          name: n.name,
          value: n.name,
          category: n.category,
          symbolSize: n.symbolSize + (degMap[n.id] || 0) * 2,
          draggable: true,
          itemStyle: {
            color: colors[n.category],
            shadowBlur: 10,
            shadowColor: colors[n.category] + '44',
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            color: '#0f172a',
            fontSize: 11,
            backgroundColor: 'rgba(255,255,255,0.85)',
            borderRadius: 6,
            padding: [2, 6],
          },
        }))

        const links = data.links.map(l => ({
          source: l.source, target: l.target, value: l.value,
          lineStyle: { width: 1.6, curveness: 0.15, opacity: 0.55 },
          label: { show: true, formatter: '{c}', fontSize: 10, color: '#475569', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 4, padding: [1, 4] },
        }))

        this.ontologyChartInstance = echarts.init(el)

        const self = this
        this.ontologyChartInstance.setOption({
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            formatter: (params) => {
              if (params.dataType === 'node') {
                return `<b>${params.data.name}</b><br/>类别：${data.categories[params.data.category]?.name || '未知'}`
              }
              return `<b>${params.data.source}</b> → <b>${params.data.target}</b><br/>关系：${params.data.value || '关联'}`
            },
          },
          series: [{
            type: 'graph', layout: 'force', data: nodes, links, categories: data.categories,
            roam: true, draggable: true,
            focusNodeAdjacency: 'allEdges',
            edgeSymbol: ['none', 'arrow'],
            edgeSymbolSize: [0, 8],
            lineStyle: { color: '#cbd5e1', curveness: 0.2 },
            emphasis: {
              focus: 'adjacency',
              lineStyle: { width: 3, opacity: 0.9 },
              itemStyle: { shadowBlur: 20 },
            },
            force: { repulsion: 500, gravity: 0.05, edgeLength: [100, 180], friction: 0.15, layoutAnimation: true },
            animationDuration: 800,
            animationEasing: 'elasticOut',
          }],
        }, true)

        // Click-to-create-link: click two nodes sequentially in link mode
        this.ontologyChartInstance.off('click')
        this.ontologyChartInstance.on('click', (params) => {
          // Handle link mode first
          if (self.ontologyMode === 'link' && params.dataType === 'node') {
            if (!self.ontologyLinkStart) {
              // First node selected
              self.ontologyLinkStart = params.data.id
              self.ontologyChartInstance.setOption({
                series: [{
                  data: self.ontologyGraphData.nodes.map(n => ({
                    ...n,
                    itemStyle: n.id === params.data.id
                      ? { ...n.itemStyle, shadowBlur: 20, shadowColor: '#f59e0b66', borderColor: '#f59e0b', borderWidth: 3 }
                      : n.itemStyle
                  }))
                }]
              })
              self.$message.info('已选择起点「' + params.data.name + '」，请点击目标节点')
            } else if (self.ontologyLinkStart !== params.data.id) {
              // Second node selected - create link
              const src = self.ontologyLinkStart
              const tgt = params.data.id
              if (!self.ontologyGraphData.links.find(l => l.source === src && l.target === tgt)) {
                self.ontologyGraphData.links.push({ source: src, target: tgt, value: '关联' })
                self.ontologyStats.graph.edges = self.ontologyGraphData.links.length
                self.renderOntologyGraph()
                self.$message.success('关系已创建')
              } else {
                self.$message.info('该关系已存在')
                self.renderOntologyGraph()
              }
              self.ontologyLinkStart = null
            } else {
              self.ontologyLinkStart = null
              self.renderOntologyGraph()
              self.$message.info('已取消连线')
            }
            return
          }

          // Normal click: select node/edge (only in view/edit mode)
          if (self.ontologyMode !== 'link' && params.dataType === 'node') {
            self.ontologySelected = self.findNodeById(params.data.id)
            self.ontologySelectedEdge = null
          } else if (self.ontologyMode !== 'link' && params.dataType === 'edge') {
            const src = typeof params.data.source === 'object' ? params.data.source.id : params.data.source
            const tgt = typeof params.data.target === 'object' ? params.data.target.id : params.data.target
            const edge = self.ontologyGraphData.links.find(l => l.source === src && l.target === tgt)
            if (edge) {
              self.ontologySelectedEdge = { ...edge, sourceName: self.findNodeById(src)?.name, targetName: self.findNodeById(tgt)?.name }
              self.ontologySelected = null
            }
          } else {
            self.ontologySelected = null
            self.ontologySelectedEdge = null
          }
        })

        // Resize handler
        if (this.ontologyResizeHandler) window.removeEventListener('resize', this.ontologyResizeHandler)
        this.ontologyResizeHandler = () => this.ontologyChartInstance?.resize()
        window.addEventListener('resize', this.ontologyResizeHandler)
      })
    },
    addOntologyNode() {
      this.$prompt('输入新实体名称', '添加实体', { inputValue: '' }).then(({ value }) => {
        if (!value) return
        this.$prompt('选择分类（0=军事, 1=政治, 2=经济）', '分类', { inputValue: '0' }).then(({ value: catVal }) => {
          const cat = parseInt(catVal) || 0
          const id = this.getNextNodeId()
          this.ontologyGraphData.nodes.push({ id, name: value, category: Math.min(cat, 2), symbolSize: 36 + Math.random() * 12 })
          this.ontologyStats.graph.nodes = this.ontologyGraphData.nodes.length
          this.renderOntologyGraph()
          this.$message.success(`实体 "${value}" 已添加`)
        })
      })
    },
    editOntologySelectedName() {
      if (!this.ontologySelected) return
      this.$prompt('修改实体名称', '重命名', { inputValue: this.ontologySelected.name }).then(({ value }) => {
        if (value) {
          this.ontologySelected.name = value
          this.renderOntologyGraph()
          this.$message.success('名称已更新')
        }
      })
    },
    deleteOntologySelected() {
      if (!this.ontologySelected) return
      const id = this.ontologySelected.id
      this.ontologyGraphData.nodes = this.ontologyGraphData.nodes.filter(n => n.id !== id)
      this.ontologyGraphData.links = this.ontologyGraphData.links.filter(l => l.source !== id && l.target !== id)
      this.ontologySelected = null
      this.ontologyStats.graph.nodes = this.ontologyGraphData.nodes.length
      this.ontologyStats.graph.edges = this.ontologyGraphData.links.length
      this.renderOntologyGraph()
      this.$message.success('实体已删除')
    },
    deleteOntologySelectedEdge() {
      if (!this.ontologySelectedEdge) return
      this.ontologyGraphData.links = this.ontologyGraphData.links.filter(l =>
        !(l.source === this.ontologySelectedEdge.source && l.target === this.ontologySelectedEdge.target)
      )
      this.ontologySelectedEdge = null
      this.ontologyStats.graph.edges = this.ontologyGraphData.links.length
      this.renderOntologyGraph()
      this.$message.success('关系已删除')
    },
    updateEdgeLabel() {
      if (!this.ontologySelectedEdge || !this.tempRelationLabel) return
      const e = this.ontologyGraphData.links.find(l =>
        l.source === this.ontologySelectedEdge.source && l.target === this.ontologySelectedEdge.target
      )
      if (e) {
        e.value = this.tempRelationLabel
        this.ontologySelectedEdge.value = this.tempRelationLabel
        this.renderOntologyGraph()
        this.$message.success('关系标签已更新')
      }
    },
    resetOntologyGraph() {
      const cats = [
        { name: '军事', itemStyle: { color: '#f43f5e' } },
        { name: '政治', itemStyle: { color: '#6366f1' } },
        { name: '经济', itemStyle: { color: '#10b981' } },
      ]
      this.ontologyGraphData = {
        categories: cats,
        nodes: [
          { id: 'n1', name: '航母战斗群', category: 0, symbolSize: 48 },
          { id: 'n2', name: '导弹防御系统', category: 0, symbolSize: 42 },
          { id: 'n3', name: '军事基地', category: 0, symbolSize: 44 },
          { id: 'n6', name: '联合国', category: 1, symbolSize: 52 },
          { id: 'n7', name: '外交谈判', category: 1, symbolSize: 42 },
          { id: 'n8', name: '同盟条约', category: 1, symbolSize: 44 },
          { id: 'n11', name: '国际贸易', category: 2, symbolSize: 46 },
          { id: 'n12', name: '能源供应链', category: 2, symbolSize: 42 },
        ],
        links: [
          { source: 'n1', target: 'n2', value: '协同防御' },
          { source: 'n2', target: 'n6', value: '安理会授权' },
          { source: 'n7', target: 'n11', value: '贸易协定' },
          { source: 'n11', target: 'n12', value: '依赖' },
          { source: 'n12', target: 'n1', value: '燃料供应' },
        ],
      }
      this.ontologyStats.graph.nodes = this.ontologyGraphData.nodes.length
      this.ontologyStats.graph.edges = this.ontologyGraphData.links.length
      this.ontologySelected = null
      this.ontologySelectedEdge = null
      this.renderOntologyGraph()
      this.$message.success('已重置为默认本体')
    },
    saveOntologyConfig() {
      this.$message.success('本体配置已保存（本地模式）')
    },
    toggleLinkMode() {
      if (this.ontologyMode === 'link') {
        this.ontologyMode = 'view'
        this.ontologyLinkStart = null
      } else {
        this.ontologyMode = 'link'
        this.$message.info('连线模式：点击一个节点作为起点，再点击另一个节点创建关系')
      }
    },
    submitAddRelation() {
      const { source, target, label } = this.addRelationForm
      if (!source || !target) {
        this.$message.warning('请选择源节点和目标节点')
        return
      }
      if (source === target) {
        this.$message.warning('不能与自身建立关系')
        return
      }
      if (this.ontologyGraphData.links.find(l => l.source === source && l.target === target)) {
        this.$message.info('该关系已存在')
        return
      }
      this.ontologyGraphData.links.push({ source, target, value: label || '关联' })
      this.ontologyStats.graph.edges = this.ontologyGraphData.links.length
      this.renderOntologyGraph()
      this.showAddRelationDialog = false
      this.addRelationForm = { source: '', target: '', label: '关联' }
      this.$message.success('关系已添加')
    },

    async handleExpand() {
      this.expanding = true
      // Generate mock expansion schemes for non-paper libraries
      const lib = this.currentLib
      const keywords = lib.keywords || ['strategic analysis']
      this.expansionSchemes = keywords.map((kw, i) => ({
        id: `scheme_${i}_${Date.now()}`,
        title: `拓展方向: ${kw} 深度研究`,
        rationale: `基于 "${kw}" 的进一步情报收集与分析，建议关注该领域的相关文献与案例研究。`,
        confidence: 0.6 + Math.random() * 0.35,
        created_at: new Date().toISOString(),
      }))
      this.showExpansionDialog = true
      this.expanding = false
    },

    // ===== Category Management =====
    getCategoryTagType(category) {
      const typeMap = { '场景设定': 'warning', '态势建模': 'primary', '主体建模': 'success', '其他': 'info' }
      return typeMap[category] || 'info'
    },
    openCategoryDialog(book) {
      this.currentBookForCategory = book
      this.selectedCategories = book.categories ? [...book.categories] : []
      this.categoryDialogVisible = true
    },
    async submitCategoryUpdate() {
      if (!this.currentBookForCategory) return
      try {
        const axios = (await import('axios')).default
        const res = await axios.post('/api/domain/book/updateCategories', {
          book_name: this.currentBookForCategory.name,
          categories: this.selectedCategories
        })
        if (res.data.success) {
          this.$message.success('分类更新成功')
          this.categoryDialogVisible = false
          this.fetchBookList(true)
        } else {
          this.$message.error(res.data.message || '分类更新失败')
        }
      } catch (e) {
        // 本地 fallback
        if (this.currentBookForCategory) {
          this.currentBookForCategory.categories = [...this.selectedCategories]
        }
        this.$message.success('分类已更新（本地）')
        this.categoryDialogVisible = false
      }
    },

    // ===== Index / Tree View =====
    async handleGetIndex(row) {
      this.indexBookName = row.name
      this.$nextTick(() => {
        this.$refs.knowledgeIndexRef?.open(row.name)
      })
    },
    handleDatasetRowClick(row) {
      this.indexBookName = row.name
      this.$nextTick(() => {
        this.$refs.knowledgeIndexRef?.open(row.name)
      })
    },

    // ===== Query =====
    openQueryDialog(book) {
      this.currentBookForQuery = book
      this.userQuery = ''
      this.queryResult = null
      this.queryDialogVisible = true
    },
    async sendQuery() {
      if (!this.userQuery.trim() || !this.currentBookForQuery) return
      this.isQuerying = true
      try {
        const axios = (await import('axios')).default
        const res = await axios.get('/api/domain/book/query', {
          params: { book_name: this.currentBookForQuery.name, query: this.userQuery.trim() }
        })
        if (res.data.success) {
          this.queryResult = res.data.data
        } else {
          this.$message.error(res.data.message || '查询失败，请重试')
        }
      } catch (e) {
        this.$message.error('查询服务暂不可用')
        console.warn(e)
      }
      this.isQuerying = false
    },

    // ===== Dataset (fallback mock) =====
    onUploadFileChange(file) {
      this.selectedFile = file?.raw || null
    },
    submitUpload() {
      const rawFile = this.selectedFile
      if (!rawFile) {
        this.$message.warning('请先选择要上传的文件')
        return
      }
      this.uploadLoading = true
      uploadPaper(rawFile)
        .then(res => {
          if (res && res.code === 200) {
            this.$message.success('上传成功')
            this.dataset.books.push({
              name: this.uploadForm.name || rawFile.name,
              date: new Date().toISOString().slice(0, 10),
              categories: this.uploadForm.category ? [this.uploadForm.category] : ['其他'],
              status: 'finished',
            })
            this.showUploadDialog = false
            this.uploadForm = { name: '', category: '' }
            this.selectedFile = null
            const uploadComponent = this.$refs.uploadRef
            if (uploadComponent) uploadComponent.clearFiles()
            this.fetchExpertOverviewStats(this.dataset.books, true)
          } else {
            this.$message.error(res?.message || '上传失败，请重试')
          }
        })
        .catch(e => {
          this.$message.error('上传服务暂不可用: ' + (e.message || '网络错误'))
          console.warn('[Upload Error]', e)
        })
        .finally(() => { this.uploadLoading = false })
    },
    handleAnalyse(row) {
      row.status = 'analysing'
      this.$message.info(`开始分析 "${row.name}"`)
      setTimeout(() => { row.status = 'finished' }, 2000)
    },
    handleRename(row) {
      this.$prompt('输入新名称', '重命名', {
        inputValue: row.name,
        customClass: 'rename-book-message-box compact-kc-message-box'
      }).then(({ value }) => {
        if (value) row.name = value
      })
    },
    handleDelete(row) {
      this.dataset.books = this.dataset.books.filter(b => b.name !== row.name)
      this.fetchExpertOverviewStats(this.dataset.books, true)
      this.$message.success('已删除')
    },

    // ===== Helpers =====
    getCategoryLabel(cat) {
      return CATEGORY_LABELS[cat] || cat
    },
    getCategoryType(cat) {
      return CATEGORY_TYPES[cat] || 'info'
    },
  },
}
</script>

<style scoped>
/* CSS imported via JS module in <script> */

/* ===== Layout ===== */
.knowledge-center {
  padding: 24px 28px;
  min-height: 100%;
  background: var(--kc-bg);
}

/* ===== Header ===== */
.kc-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 28px;
}
.kc-header-left { flex: 1; }
.kc-header-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* ===== Header Tool Cards (配置/数据集/专家观点) ===== */
.kc-tool-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--kc-border);
  background: var(--kc-surface);
  color: var(--kc-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--kc-transition);
  white-space: nowrap;
}
.kc-tool-card:hover {
  border-color: var(--kc-primary-light);
  color: var(--kc-primary);
  background: var(--kc-primary-bg);
  transform: translateY(-1px);
  box-shadow: var(--kc-shadow-sm);
}

/* 专家观点 — 特殊醒目样式 */
.kc-tool-experts {
  gap: 10px;
  padding: 8px 18px 8px 14px;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  border-color: #d8b4fe;
  color: #7c3aed;
  font-weight: 600;
}
.kc-tool-experts:hover {
  background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
  border-color: #a855f7;
  color: #6d28d9;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.15);
}
.kc-tool-experts .kc-tool-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
}
.kc-tool-experts .kc-tool-card__text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.kc-tool-experts .kc-tool-card__label {
  font-size: 14px;
  font-weight: 600;
}
.kc-tool-experts .kc-tool-card__hint {
  font-size: 11px;
  font-weight: 400;
  color: #a78bfa;
}

/* 配置/数据集 — 简洁样式 */
.kc-tool-config,
.kc-tool-dataset {
  background: var(--kc-surface);
}
.kc-tool-config:hover,
.kc-tool-dataset:hover {
  color: var(--kc-primary);
}

.kc-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--kc-text);
  letter-spacing: -0.5px;
  margin: 0 0 4px;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.kc-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--kc-text-tertiary);
  letter-spacing: 0.3px;
}
.kc-dataset-toggle {
  border-radius: var(--kc-radius-sm);
}

/* ===== Overview Groups ===== */
.kc-level-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.kc-level-section {
  padding: 18px;
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius-lg);
  background: var(--kc-surface);
  box-shadow: var(--kc-shadow-sm);
}

.kc-level-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.kc-level-section__title {
  margin: 0 0 4px;
  color: var(--kc-text);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
}

.kc-level-section__desc {
  margin: 0;
  color: var(--kc-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.kc-level-section__count {
  flex-shrink: 0;
  padding: 4px 9px;
  border-radius: 999px;
  background: #f8fafc;
  color: var(--kc-text-tertiary);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--kc-border-light);
}

/* ── 知识库首页：领域切换页头 ── */
.kc-home-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; margin: 4px 0 16px; flex-wrap: wrap;
}
.kc-home-title { display: flex; align-items: baseline; flex-wrap: wrap; row-gap: 2px; }
.kc-home-title__text { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: 0.3px; }
.kc-home-title__sub { margin-left: 10px; font-size: 12px; color: #94a3b8; font-weight: 500; }

.kc-domain-switch {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px;
  background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 999px;
}
.kc-domain-switch__btn {
  display: inline-flex; align-items: center; gap: 6px;
  border: none; background: transparent; color: #64748b;
  padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.15s ease; font-family: inherit;
}
.kc-domain-switch__btn:hover { color: #334155; }
.kc-domain-switch__btn.is-active { background: #6366f1; color: #fff; box-shadow: 0 1px 4px rgba(99, 102, 241, 0.35); }
.kc-domain-switch__dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.kc-domain-switch__dot.is-uranium { background: #6366f1; }
.kc-domain-switch__dot.is-automotive { background: #10b981; }
.kc-domain-switch__btn.is-active .kc-domain-switch__dot { background: #fff; }

/* 汽车领域详情空态 */
.kc-detail-empty {
  display: flex; align-items: center; justify-content: center;
  min-height: 320px; padding: 24px;
}

.kc-level-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.kc-level-section--construct .kc-level-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.kc-level-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius);
  background: #ffffff;
  color: var(--kc-text);
  transition: border-color var(--kc-transition), box-shadow var(--kc-transition), transform var(--kc-transition);
  overflow: hidden;
}
.kc-level-card:hover {
  border-color: var(--kc-entry-accent);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}

/* 左右两半 */
.kc-level-card__side {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--kc-transition);
  width: 100%;
  font-family: inherit;
}
.kc-level-card__side--left {
  border-bottom: 1px solid var(--kc-border-light);
}
.kc-level-card__side:hover {
  background: var(--kc-entry-bg);
}
.kc-level-card__side.is-active {
  background: var(--kc-entry-bg);
}

/* 场景标签 */
.kc-level-card__side-tag {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 20px; border-radius: 4px;
  font-size: 10px; font-weight: 700; flex-shrink: 0;
}
.kc-level-card__side--left .kc-level-card__side-tag  { background: #eef2ff; color: #4f46e5; }
.kc-level-card__side--right .kc-level-card__side-tag { background: #ecfdf5; color: #059669; }
.kc-level-card__side--left.is-active .kc-level-card__side-tag  { background: #6366f1; color: #fff; }
.kc-level-card__side--right.is-active .kc-level-card__side-tag { background: #10b981; color: #fff; }

.kc-level-card__mark {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--kc-entry-accent);
}

.kc-level-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--kc-entry-bg);
  color: var(--kc-entry-accent);
}

.kc-level-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.kc-level-card__title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
}

.kc-level-card__desc {
  color: var(--kc-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.kc-level-card__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(34px, 1fr));
  gap: 6px;
  padding: 6px 14px 10px;
  border-top: 1px solid var(--kc-border-light);
  width: 100%;
}

.kc-level-card__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.kc-level-card__stat-value {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 16px;
  color: var(--kc-entry-accent);
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.kc-level-card__stat-loading {
  color: var(--kc-entry-accent);
  font-size: 15px;
  animation: kc-stat-spin 0.9s linear infinite;
}

@keyframes kc-stat-spin {
  to { transform: rotate(360deg); }
}

.kc-level-card__stat-label {
  max-width: 48px;
  color: var(--kc-text-tertiary);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kc-level-card--papers { --kc-entry-accent: #f43f5e; --kc-entry-bg: #fff1f2; }
.kc-level-card--osint { --kc-entry-accent: #06b6d4; --kc-entry-bg: #ecfeff; }
.kc-level-card--dataset { --kc-entry-accent: #10b981; --kc-entry-bg: #ecfdf5; }
.kc-level-card--experts { --kc-entry-accent: #7c3aed; --kc-entry-bg: #f5f3ff; }
.kc-level-card--ontology { --kc-entry-accent: #0891b2; --kc-entry-bg: #ecfeff; }
.kc-level-card--subject { --kc-entry-accent: #6366f1; --kc-entry-bg: #eef2ff; }
.kc-level-card--environment { --kc-entry-accent: #14b8a6; --kc-entry-bg: #f0fdfa; }
.kc-level-card--rules { --kc-entry-accent: #f59e0b; --kc-entry-bg: #fffbeb; }
.kc-level-card--ontology_network { --kc-entry-accent: #2563eb; --kc-entry-bg: #eff6ff; }
.kc-level-card--model_library { --kc-entry-accent: #ea580c; --kc-entry-bg: #fff7ed; }

/* ===== Cards Grid ===== */
.kc-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

/* ===== Library Card ===== */
.kc-lib-card {
  position: relative;
  background: var(--kc-surface);
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius-lg);
  padding: 24px;
  cursor: pointer;
  transition: all var(--kc-transition);
  overflow: hidden;
  isolation: isolate;
}
.kc-lib-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--kc-shadow-xl);
  border-color: var(--kc-card-accent, var(--kc-primary));
}
.kc-lib-card--disabled { opacity: 0.5; }

.kc-lib-card__bg-pattern {
  position: absolute;
  top: -30px; right: -30px;
  width: 120px; height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--kc-card-bg) 0%, transparent 70%);
  z-index: 0;
  pointer-events: none;
}

.kc-lib-card__status-dot {
  position: absolute;
  top: 16px; right: 16px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #cbd5e1;
  transition: background var(--kc-transition);
}
.kc-lib-card__status-dot.active {
  background: var(--kc-card-accent, var(--kc-primary));
  box-shadow: 0 0 8px var(--kc-card-accent, var(--kc-primary));
}

.kc-lib-card__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px; height: 48px;
  border-radius: var(--kc-radius);
  background: var(--kc-card-bg);
  color: var(--kc-card-accent, var(--kc-primary));
  margin-bottom: 14px;
  position: relative;
  z-index: 1;
}

.kc-lib-card__name {
  font-size: 17px;
  font-weight: 600;
  color: var(--kc-text);
  margin: 0 0 4px;
  position: relative;
  z-index: 1;
}
.kc-lib-card__desc {
  font-size: 12px;
  color: var(--kc-text-secondary);
  margin: 0 0 16px;
  position: relative;
  z-index: 1;
}

.kc-lib-card__stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}
.kc-lib-card__stat {
  flex: 1;
  text-align: center;
}
.kc-lib-card__stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: var(--kc-text);
  line-height: 1.2;
}
.kc-lib-card__stat-label {
  font-size: 11px;
  color: var(--kc-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.kc-lib-card__stat-divider {
  width: 1px;
  height: 32px;
  background: var(--kc-border-light);
}

.kc-lib-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--kc-border-light);
  position: relative;
  z-index: 1;
}
.kc-lib-card__enter-hint {
  font-size: 12px;
  color: var(--kc-text-tertiary);
  transition: color var(--kc-transition);
}
.kc-lib-card:hover .kc-lib-card__enter-hint {
  color: var(--kc-card-accent, var(--kc-primary));
}

/* ===== Detail Mode ===== */
.kc-detail {
  animation: kc-slideIn 0.3s ease;
}
@keyframes kc-slideIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.kc-detail-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--kc-border-light);
}
.kc-detail-header { flex: 1; }
.kc-detail-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.kc-icon-subject { color: #6366f1; }
.kc-icon-environment { color: #10b981; }
.kc-icon-rules { color: #f59e0b; }
.kc-icon-papers { color: #f43f5e; }

.kc-detail-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--kc-text);
  margin: 0;
}
.kc-detail-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--kc-text-secondary);
}

/* ===== Stats Cards ===== */
.kc-detail-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.kc-stat-card {
  background: var(--kc-surface);
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius);
  padding: 16px 20px;
  position: relative;
  overflow: hidden;
  transition: box-shadow var(--kc-transition);
}
.kc-stat-card:hover {
  box-shadow: var(--kc-shadow-md);
}
.kc-stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--kc-text);
  line-height: 1.2;
}
.kc-stat-card__label {
  font-size: 12px;
  color: var(--kc-text-tertiary);
  margin-top: 2px;
}
.kc-stat-card__bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 0 2px 0 0;
  transition: width 0.4s ease;
}

/* ===== Detail Actions ===== */
.kc-detail-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

/* ===== Tabs ===== */
.kc-detail-tabs { margin-bottom: 12px; }

/* ===== Graph ===== */
.kc-graph-container {
  width: 100%;
  height: 400px;
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius);
  background: var(--kc-surface);
}

/* ===== Entities ===== */
.kc-entity-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.kc-entity-group {
  background: var(--kc-surface);
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius);
  padding: 16px;
}
.kc-entity-group__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--kc-text);
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--kc-border-light);
}
.kc-entity-tags {
  display: flex;
  flex-wrap: wrap;
}

/* ===== Dataset Section ===== */
.kc-dataset-section {
  background: var(--kc-surface);
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius-lg);
  padding: 20px;
  animation: kc-slideIn 0.25s ease;
}
.kc-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.kc-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--kc-text);
  margin: 0;
}
.kc-section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.kc-search-input { width: 200px; }
.kc-book-name {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ===== Paper Section ===== */
.kc-paper-section {
  margin-top: 8px;
}
.kc-section-divider {
  height: 1px;
  background: var(--kc-border);
  margin: 20px 0;
}
.kc-paper-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.kc-paper-stat {
  background: linear-gradient(135deg, var(--kc-surface) 0%, var(--kc-bg) 100%);
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius);
  padding: 12px 16px;
  text-align: center;
}
.kc-paper-stat__value {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--kc-text);
}
.kc-paper-stat__label {
  font-size: 11px;
  color: var(--kc-text-tertiary);
}
.kc-paper-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.kc-paper-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== Keyword Dialog ===== */
.kc-keyword-section {
  padding: 8px 0;
}
.kc-keyword-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.kc-keyword-list {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  min-height: 50px;
}
.kc-keyword-empty {
  color: var(--kc-text-tertiary);
  font-size: 13px;
}

/* ===== Expansion Dialog ===== */
.kc-expansion-list {
  max-height: 400px;
  overflow-y: auto;
}
.kc-expansion-item {
  background: var(--kc-bg);
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius);
  padding: 14px 16px;
  margin-bottom: 10px;
  transition: border-color var(--kc-transition);
}
.kc-expansion-item:hover {
  border-color: var(--kc-primary);
}
.kc-expansion-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.kc-expansion-item__title {
  font-weight: 600;
  font-size: 14px;
  color: var(--kc-text);
}
.kc-expansion-item__desc {
  font-size: 13px;
  color: var(--kc-text-secondary);
  margin: 0 0 4px;
  line-height: 1.5;
}
.kc-expansion-item__time {
  font-size: 11px;
  color: var(--kc-text-tertiary);
}

/* ===== Config Dialog Help ===== */
.kc-config-page {
  min-height: 420px;
}
.kc-config-placeholder {
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px dashed var(--kc-border);
  border-radius: var(--kc-radius-lg);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: var(--kc-text-secondary);
}
.kc-config-placeholder__icon {
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--kc-primary);
  background: rgba(59, 130, 246, 0.1);
}
.kc-config-placeholder__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--kc-text);
}
.kc-config-placeholder__desc {
  font-size: 13px;
  color: var(--kc-text-tertiary);
}
.kc-config-help {
  padding: 16px;
  color: var(--kc-text-secondary);
  font-size: 14px;
  line-height: 1.8;
}
.kc-config-help p { margin: 6px 0; }

/* ===== 专家观点 ===== */
.kc-expert-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.kc-expert-graph-wrap {
  width: 100%; height: 560px;
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius);
  padding: 16px;
  background: var(--kc-surface);
}
.kc-expert-graph-title {
  font-weight: 600; margin-bottom: 10px; color: var(--kc-text);
  display: flex; align-items: center; gap: 6px; font-size: 15px;
}
.kc-expert-chart {
  width: 100%; height: calc(100% - 30px);
}
.kc-expert-markdown-wrap {
  width: 100%;
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius);
  padding: 24px;
  background: var(--kc-surface);
}
.kc-expert-loading {
  height: 50vh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  color: var(--kc-text-secondary);
  background: var(--kc-bg);
  border-radius: var(--kc-radius);
  border: 1px dashed var(--kc-border);
  gap: 12px;
}
/* 专家观点右上角按钮（同页切换知识图谱，右对齐） */
.kc-expert-graph-btn {
  margin-left: auto;
  border-radius: 10px;
  font-weight: 500;
  flex-shrink: 0;
}
/* 专家观点内嵌真实动态知识图谱（KnowledgeGraph.vue，embedded 模式） */
.kc-experts-graph-pane {
  height: calc(100vh - 210px);
  min-height: 620px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  background: #f5f7fa;
}
.kc-experts-graph-pane :deep(.ukg-container) {
  height: 100% !important;
  border-radius: 12px;
}
.cognitive-markdown {
  font-size: 14px; line-height: 1.7; color: var(--kc-text);
}
.cognitive-markdown :deep(h1), .cognitive-markdown :deep(h2), .cognitive-markdown :deep(h3) {
  margin-top: 20px; margin-bottom: 10px;
  font-weight: 600;
}
.cognitive-markdown :deep(p) { margin: 8px 0; }
.cognitive-markdown :deep(ul), .cognitive-markdown :deep(ol) { padding-left: 20px; }

/* ===== Responsive ===== */
@media (max-width: 1200px) {
  .kc-level-grid,
  .kc-level-section--construct .kc-level-grid { grid-template-columns: repeat(2, 1fr); }
  .kc-cards-grid { grid-template-columns: repeat(2, 1fr); }
  .kc-detail-stats { grid-template-columns: repeat(2, 1fr); }
  .kc-paper-stats-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .kc-level-section__head { flex-direction: column; }
  .kc-level-grid,
  .kc-level-section--construct .kc-level-grid { grid-template-columns: 1fr; }
  .kc-level-card { grid-template-columns: 42px minmax(0, 1fr); }
  .kc-level-card__stats {
    grid-column: 2;
    justify-self: stretch;
    min-width: 0;
  }
  .kc-level-card__stat { align-items: flex-start; }
  .kc-level-card__stat-value { justify-content: flex-start; }
  .kc-level-card__stat-label { text-align: left; }
  .kc-cards-grid { grid-template-columns: 1fr; }
  .kc-entity-grid { grid-template-columns: 1fr; }
  .kc-detail-stats { grid-template-columns: repeat(2, 1fr); }
}

/* ===== El overrides ===== */
:deep(.el-table) { border-radius: var(--kc-radius-sm); }
:deep(.el-tabs__item) { font-weight: 500; }
:deep(.el-dialog__body) { padding: 20px 24px; }

/* ===== Category Dialog ===== */
:deep(.category-dialog .dialog-header .book-name) { font-weight:600;font-size:15px;color:#1e293b;margin-bottom:12px;display:block; }
:deep(.category-selection .selection-title) { font-size:13px;color:#64748b;margin-bottom:10px; }
:deep(.category-checkbox-group) { display:flex;flex-wrap:wrap;gap:8px; }
:deep(.category-checkbox) { margin-right:12px; }

/* ===== Query Dialog ===== */
:deep(.query-dialog-body) { padding:4px 0; }
:deep(.query-book-label) { font-size:15px;color:#374151;margin-bottom:18px;padding:10px 14px;background:#f0f4ff;border-radius:8px;border:1px solid #dbeafe; }
:deep(.query-input-area) { margin-bottom:14px; }
:deep(.query-actions) { display:flex;justify-content:flex-end;gap:10px;margin-bottom:18px; }
:deep(.query-result-section) { margin-top:22px;border-top:2px solid #e5e7eb;padding-top:20px; }
:deep(.query-result-heading) { font-size:16px;font-weight:600;color:#059669;margin:0 0 14px 0; }
:deep(.query-answer) { line-height:1.8;font-size:15px;color:#1e293b;padding:16px 18px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:16px; }
:deep(.query-source-section) { margin-top:16px; }
:deep(.query-source-heading) { font-size:14px;font-weight:600;color:#6b7280;margin:0 0 10px 0; }
:deep(.query-source-text) { padding:14px 16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;font-size:14px;line-height:1.7;color:#4b5563; }

/* ===== Ontology Editor ===== */
.kc-ontology-page { animation: kc-slideIn 0.3s ease;height:calc(100vh - 180px);overflow-y:auto;padding-right:4px; }

/* 本体网络（事前页面嵌入 KnowledgeGraph） */
.kc-ontology-network-page {
  animation: kc-slideIn 0.3s ease;
  height: calc(100vh - 180px);
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  background: #f5f7fa;
}
.kc-ontology-network-page :deep(.ukg-container) {
  height: 100% !important;
}
.kc-ontology-layout { display:flex;gap:18px;align-items:flex-start; }
.kc-ontology-config { width:360px;min-width:320px;flex-shrink:0;background:var(--kc-surface);border:1px solid var(--kc-border);border-radius:var(--kc-radius-lg);overflow:hidden; }
.kc-ontology-config-header { display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--kc-border-light);background:var(--kc-bg); }
.kc-ontology-config-header h3 { display:flex;align-items:center;gap:6px;margin:0;font-size:15px;font-weight:600;color:var(--kc-text); }
.kc-ontology-collapse :deep(.el-collapse-item__header) { font-weight:600;font-size:13px;padding-left:12px; }
.kc-ontology-collapse :deep(.el-collapse-item__content) { padding:6px 12px 12px; }
.kc-ontology-collapse :deep(.el-form-item) { margin-bottom:10px; }
.kc-ontology-collapse :deep(.el-form-item__label) { font-size:12px;color:var(--kc-text-secondary);padding-bottom:2px; }
.kc-ontology-viz { flex:1;min-width:0;display:flex;flex-direction:column;gap:12px; }
.kc-ontology-toolbar { display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--kc-surface);border:1px solid var(--kc-border);border-radius:var(--kc-radius);flex-wrap:wrap;gap:8px; }
.kc-ontology-toolbar-left { display:flex;align-items:center;gap:6px;flex-wrap:wrap; }
.kc-ontology-toolbar-right { display:flex;align-items:center;gap:6px;flex-wrap:wrap; }
.kc-ontology-graph-wrap { background:var(--kc-surface);border:1px solid var(--kc-border);border-radius:var(--kc-radius-lg);padding:8px; }
.kc-ontology-graph { width:100%;height:420px;border-radius:var(--kc-radius-sm);background:#fafcff;min-height:300px; }
.kc-ontology-detail-bar { display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:var(--kc-surface);border:1px solid var(--kc-border);border-radius:var(--kc-radius);border-left:4px solid var(--kc-primary); }
.kc-ontology-detail-info { display:flex;align-items:center;gap:6px;flex-wrap:wrap; }
.kc-ontology-detail-label { font-size:12px;color:#94a3b8; }
.kc-ontology-detail-actions { display:flex;gap:4px; }
.kc-ontology-models { display:grid;grid-template-columns:repeat(2,1fr);gap:10px; }
.kc-ontology-model-card { border-radius:var(--kc-radius);border:1px solid var(--kc-border);transition:all var(--kc-transition); }
.kc-ontology-model-card:hover { box-shadow:var(--kc-shadow-md);transform:translateY(-2px); }
.kc-ontology-model-header { display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--kc-text); }
.kc-ontology-model-header .el-tag { margin-left:auto; }
.kc-ontology-model-body { padding:2px 0; }
.kc-ontology-model-desc { font-size:11px;color:var(--kc-text-secondary);line-height:1.5;margin:0 0 8px; }
.kc-ontology-model-stat { display:flex;align-items:baseline;gap:6px;margin-top:2px; }
.kc-ontology-model-stat-value { font-size:20px;font-weight:700;color:var(--kc-text); }
.kc-ontology-model-stat-label { font-size:11px;color:var(--kc-text-tertiary); }

/* Ontology header tool button */
.kc-tool-ontology { gap:10px;padding:8px 18px 8px 14px;background:linear-gradient(135deg,#ecfeff 0%,#cffafe 100%);border-color:#67e8f9;color:#0891b2;font-weight:600; }
.kc-tool-ontology:hover { background:linear-gradient(135deg,#cffafe 0%,#a5f3fc 100%);border-color:#06b6d4;color:#0e7490;box-shadow:0 2px 12px rgba(6,182,212,0.15); }
.kc-tool-ontology .kc-tool-card__icon { display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:rgba(6,182,212,0.1);color:#0891b2; }
.kc-tool-ontology .kc-tool-card__text { display:flex;flex-direction:column;line-height:1.3; }
.kc-tool-ontology .kc-tool-card__label { font-size:14px;font-weight:600; }
.kc-tool-ontology .kc-tool-card__hint { font-size:11px;font-weight:400;color:#22d3ee; }

@media (max-width:1200px) { .kc-ontology-layout { flex-direction:column; } .kc-ontology-config { width:100%;min-width:unset; } }
@media (max-width:768px) { .kc-ontology-models { grid-template-columns:1fr; } }

.kc-resource-dialog__content {
  height: 84vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  background: #ffffff;
}

.kc-resource-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}

.kc-resource-search { flex: 1; }

.kc-resource-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.kc-resource-list--papers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 10px;
}

.kc-resource-list--osint {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Stats row (papers) */
.kc-sb-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.kc-sb-stat {
  text-align: center;
  padding: 10px 8px;
  background: var(--kc-bg, #f8fafc);
  border-radius: 8px;
  border: 1px solid var(--kc-border-light, #f1f5f9);
}
.kc-sb-stat__v {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: var(--kc-text, #0f172a);
  line-height: 1.2;
}
.kc-sb-stat__l {
  display: block;
  font-size: 11px;
  color: var(--kc-text-tertiary, #94a3b8);
  margin-top: 1px;
}

/* Scrollable list area */
.kc-sb-list {
  flex: 1;
  overflow-y: auto;
  min-height: 100px;
}
.kc-sb-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

/* ===== Paper Cards ===== */
.kc-sb-paper-card {
  padding: 12px 14px;
  margin-bottom: 8px;
  border: 1px solid var(--kc-border-light, #f1f5f9);
  border-radius: 10px;
  background: var(--kc-surface, #fff);
  transition: all 0.2s;
}
.kc-sb-paper-card:hover {
  border-color: #f43f5e40;
  box-shadow: 0 2px 8px rgba(244,63,94,0.06);
}
.kc-sb-paper-top { margin-bottom: 4px; }
.kc-sb-paper-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--kc-text, #0f172a);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}
.kc-sb-paper-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 11px;
  color: var(--kc-text-tertiary, #94a3b8);
}
.kc-sb-paper-authors { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.kc-sb-paper-date { white-space: nowrap; flex-shrink: 0; }
.kc-sb-paper-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px; }
.kc-sb-tag { margin: 0 !important; }
.kc-sb-paper-actions {
  display: flex;
  gap: 2px;
  padding-top: 6px;
  border-top: 1px solid var(--kc-border-light, #f1f5f9);
}

/* ===== OSINT Cards ===== */
.kc-sb-osint-filters {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.kc-sb-osint-filter {
  padding: 4px 12px;
  border: 1px solid var(--kc-border, #e2e8f0);
  border-radius: 20px;
  background: var(--kc-surface, #fff);
  font-size: 12px;
  color: var(--kc-text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.4;
}
.kc-sb-osint-filter:hover { border-color: #06b6d4; color: #06b6d4; }
.kc-sb-osint-filter.active {
  background: #06b6d4;
  color: #fff;
  border-color: #06b6d4;
}
.kc-sb-osint-update {
  font-size: 11px;
  color: var(--kc-text-tertiary, #94a3b8);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.kc-sb-osint-card {
  padding: 10px 12px;
  margin-bottom: 6px;
  border: 1px solid var(--kc-border-light, #f1f5f9);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--kc-surface, #fff);
}
.kc-sb-osint-card:hover { border-color: #06b6d440; background: #f0fdff; }
.kc-sb-osint-card--high {
  border-left: 3px solid #f43f5e;
  background: #fff5f5;
}
.kc-sb-osint-card-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.kc-sb-osint-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.kc-sb-osint-alert {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: #f43f5e;
  padding: 0 6px;
  border-radius: 4px;
  line-height: 18px;
  flex-shrink: 0;
}
.kc-sb-osint-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--kc-text, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.kc-sb-osint-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--kc-text-tertiary, #94a3b8);
  margin-left: 14px;
}
.kc-sb-osint-source { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
.kc-sb-osint-time { white-space: nowrap; }
.kc-sb-osint-cat { font-weight: 500; }
.kc-sb-osint-detail {
  padding: 8px 0 4px 14px;
  font-size: 12px;
  color: var(--kc-text-secondary, #64748b);
  line-height: 1.5;
}
.kc-sb-osint-desc { margin: 0 0 6px; }
.kc-sb-osint-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #06b6d4;
  text-decoration: none;
}
.kc-sb-osint-link:hover { text-decoration: underline; }
.kcre-sec { margin-bottom: 14px; }
.kcre-sec-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12.5px;
  font-weight: 800;
  color: #0f172a;
}
.kcre-count {
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(6, 182, 212, 0.1);
  color: #06b6d4;
  font-size: 10.5px;
  font-weight: 700;
}
.kcre-actions {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}
.kc-sb-osint-cat.warn { color: #b45309; font-weight: 700; }
.kc-sb-osint-cat.ok { color: #15803d; font-weight: 700; }
.kcre-active { color: #dc2626; background: rgba(220, 38, 38, 0.12); }
.kc-subjects { display: flex; flex-direction: column; gap: 10px; }
.kc-subj-summary { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: #64748b; }
.kc-subj-summary b { color: #0f172a; }
.kc-subj-filter { display: flex; gap: 8px; align-items: center; }
.kc-subj-list { display: flex; flex-direction: column; gap: 8px; }
.kc-subj-detail-title { margin: 0 0 4px; }
.kc-subj-detail-meta { margin: 0 0 8px; color: #64748b; font-size: 12px; }
.kc-subj-note { color: #94a3b8; font-size: 11px; margin-left: 6px; }
.kc-subj-sec { margin-top: 14px; }
.kc-subj-sec h4 { margin: 0 0 6px; font-size: 13px; font-weight: 800; }
.kc-subj-pager { display: flex; justify-content: flex-end; margin-top: 8px; }
.kc-subj-rel { display: flex; gap: 8px; padding: 4px 0; font-size: 12px; border-bottom: 1px dashed rgba(148,163,184,0.2); }
.kc-subj-rel-type { color: #2563eb; font-weight: 700; min-width: 120px; }
.kc-subj-rel-target { color: #334155; }
.kcre-aggregate { color: #6d28d9; background: rgba(109, 40, 217, 0.1); }
.kcre-aggregate-tag { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 6px; background: rgba(109, 40, 217, 0.1); color: #6d28d9; font-size: 11px; font-weight: 700; }
.kcre-candidate { color: #b45309; background: rgba(245, 158, 11, 0.14); }
.kc-env { display: flex; flex-direction: column; gap: 10px; }
.kc-env-summary { display: flex; flex-wrap: wrap; gap: 12px; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.7); border: 1px solid rgba(148,163,184,0.2); font-size: 12.5px; color: #64748b; }
.kc-env-summary b { color: #0f172a; }
.kc-env-legacy { color: #94a3b8; }
.kc-env-tabs :deep(.el-tabs__item) { font-size: 13px; }
.kc-env-china { display: flex; flex-wrap: wrap; gap: 12px; }
.kc-env-card { flex: 1 1 220px; padding: 14px; border-radius: 12px; background: #fff; border: 1px solid rgba(148,163,184,0.24); display: flex; flex-direction: column; gap: 6px; }
.kc-env-label { font-size: 12px; color: #64748b; }
.kc-env-big { font-size: 28px; line-height: 1.1; color: #2563eb; }
.kc-env-tag { display: inline-block; align-self: flex-start; padding: 2px 8px; border-radius: 999px; background: rgba(245,158,11,0.14); color: #b45309; font-size: 11px; font-weight: 700; }
.kc-env-note { color: #64748b; font-size: 12px; margin: 4px 0; }
.kc-env-dataset { padding: 12px 14px; border-radius: 10px; background: #fff; border: 1px solid rgba(148,163,184,0.24); margin-bottom: 8px; cursor: pointer; }
.kc-env-dataset:hover { border-color: #2563eb; }
.kc-env-dataset-head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 800; }
.kc-env-dataset-count { color: #2563eb; font-size: 11.5px; font-weight: 700; }
.kc-env-dataset-meta { margin-top: 4px; color: #64748b; font-size: 11.5px; }
.kc-env-dataset.is-expanded { border-color: #2563eb; }
.kc-env-chev { font-style: normal; margin-left: 4px; color: #2563eb; }
.kc-env-records { margin-top: 10px; }
.kc-env-records-note { color: #64748b; font-size: 11.5px; margin-bottom: 6px; }
.kc-rules { display: flex; flex-direction: column; gap: 10px; }
.kc-rules-summary { display: flex; flex-wrap: wrap; gap: 12px; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.7); border: 1px solid rgba(148,163,184,0.2); font-size: 12.5px; color: #64748b; }
.kc-rules-summary b { color: #0f172a; }
.kc-rules-filter { display: flex; gap: 8px; align-items: center; }
.kc-rules-list { display: flex; flex-direction: column; gap: 8px; }
.kc-rule-card { padding: 12px 14px; border-radius: 10px; background: #fff; border: 1px solid rgba(148,163,184,0.24); cursor: pointer; }
.kc-rule-card:hover { border-color: #2563eb; }
.kc-rule-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kc-rule-head b { font-size: 13.5px; }
.kc-rule-group { padding: 1px 7px; border-radius: 999px; background: rgba(37,99,235,0.1); color: #2563eb; font-size: 10.5px; font-weight: 700; }
.kc-rule-stage { color: #64748b; font-size: 11px; }
.kc-rule-rt { padding: 1px 6px; border-radius: 6px; font-size: 10px; font-weight: 800; }
.kc-rule-rt.ok { color: #15803d; background: rgba(22,163,74,0.12); }
.kc-rule-rt.muted { color: #64748b; background: rgba(100,116,139,0.12); }
.kc-rule-desc { margin: 6px 0 4px; color: #475569; font-size: 12px; line-height: 1.5; }
.kc-rule-params { display: flex; flex-wrap: wrap; gap: 6px; }
.kc-rule-param { padding: 2px 8px; border-radius: 6px; background: rgba(245,158,11,0.08); color: #92400e; font-size: 11px; }
.kc-rule-detail-title { margin: 0 0 8px; }
.kc-rule-detail-sec { margin-top: 10px; }
.kc-rule-detail-sec h4 { margin: 0 0 4px; font-size: 13px; font-weight: 800; }
.kc-rule-detail-sec p { margin: 0; color: #475569; font-size: 12.5px; line-height: 1.55; }
.kc-rule-note { margin-top: 8px; color: #b45309; font-size: 11.5px; }
.kc-models { display: flex; flex-direction: column; gap: 10px; }
.kc-models-summary { display: flex; flex-wrap: wrap; gap: 12px; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.7); border: 1px solid rgba(148,163,184,0.2); font-size: 12.5px; color: #64748b; }
.kc-models-summary b { color: #0f172a; }
.kc-models-pipeline { padding: 8px 10px; border-radius: 8px; background: rgba(37,99,235,0.05); color: #1e40af; font-size: 12px; line-height: 1.6; margin-bottom: 6px; }
.kc-models-filter { display: flex; gap: 8px; }
.kc-models-list { display: flex; flex-direction: column; gap: 8px; }
.kc-model-card { padding: 12px 14px; border-radius: 10px; background: #fff; border: 1px solid rgba(148,163,184,0.24); cursor: pointer; }
.kc-model-card:hover { border-color: #2563eb; }
.kc-model-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kc-model-head b { font-size: 13.5px; }
.kc-model-cat { padding: 1px 7px; border-radius: 999px; background: rgba(37,99,235,0.1); color: #2563eb; font-size: 10.5px; font-weight: 700; }
.kc-model-method { color: #475569; font-size: 11.5px; }
.kc-model-rt { padding: 1px 6px; border-radius: 6px; font-size: 10px; font-weight: 800; }
.kc-model-rt.ok { color: #15803d; background: rgba(22,163,74,0.12); }
.kc-model-rt.muted { color: #64748b; background: rgba(100,116,139,0.12); }
.kc-model-desc { margin: 6px 0 4px; color: #475569; font-size: 12px; line-height: 1.5; }
.kc-model-meta { display: flex; flex-wrap: wrap; gap: 10px; color: #64748b; font-size: 11.5px; }
.kc-mr.ok { color: #15803d; }
.kc-mr.warn { color: #b45309; }
.kc-mr.bad { color: #dc2626; }
.kc-model-detail-title { margin: 0 0 8px; }
.kc-model-detail-sec { margin-top: 10px; }
.kc-model-detail-sec h4 { margin: 0 0 4px; font-size: 13px; font-weight: 800; }
.kc-model-detail-sec p { margin: 0; color: #475569; font-size: 12.5px; line-height: 1.55; }
.kc-model-note { margin-top: 8px; color: #b45309; font-size: 11.5px; }
.kc-model-run { margin-top: 12px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
.kc-model-run-note { margin-left: 8px; color: #64748b; font-size: 11.5px; }
.kc-model-run-result { margin-top: 10px; }
.kc-model-run-result h4 { margin: 0 0 4px; font-size: 12.5px; font-weight: 800; }
.kc-model-run-result pre { margin: 0; padding: 8px; background: #0f172a; color: #a5f3fc; font-size: 11.5px; line-height: 1.5; border-radius: 6px; overflow: auto; max-height: 260px; white-space: pre-wrap; word-break: break-all; }
.kc-model-binding { margin: 4px 0; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }
.kc-model-binding b { font-size: 12px; margin-right: 6px; }
.kc-model-binding span { font-size: 11px; }
.kc-model-binding p { margin: 2px 0 0; color: #64748b; font-size: 11.5px; }
.kc-env-detail-head { display: flex; gap: 14px; margin-bottom: 8px; font-size: 12px; color: #64748b; }
.kc-env-detail-head b { color: #0f172a; }
.sidebar-expand-enter-active, .sidebar-expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.sidebar-expand-enter-from, .sidebar-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.sidebar-expand-enter-to, .sidebar-expand-leave-from {
  opacity: 1;
  max-height: 300px;
}

@media (max-width: 720px) {
  .kc-resource-list--papers { grid-template-columns: 1fr; }
}
</style>
<style>
.kc-dataset-dialog {
  --el-dialog-margin-top: 3.5vh;
  margin: var(--el-dialog-margin-top) auto 0;
  border-radius: 10px;
  overflow: hidden;
  padding: 0;
  box-shadow: 0 0 0 1px rgba(0,0,0,.08), 0 25px 60px rgba(0,0,0,.25);
  background: #fff;
}
.kc-dataset-dialog > .el-dialog__header {
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
}
.kc-dataset-dialog > .el-dialog__header .el-dialog__close { display: none; }
.kc-dataset-dialog__body {
  padding: 0;
  overflow: hidden;
  background: transparent;
}
.kc-dataset-dialog__content {
  height: 84vh;
  overflow: hidden;
  background: transparent;
}
.kc-resource-dialog .el-dialog__body {
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.kc-resource-dialog .el-dialog__body .el-tabs,
.kc-resource-dialog .el-dialog__body .el-tabs__content,
.kc-resource-dialog .el-dialog__body .el-tab-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.kc-resource-dialog .el-dialog__body .el-tabs__content {
  flex: 1;
  min-height: 0;
}
.kc-resource-dialog .el-dialog__body .el-tab-pane {
  height: 100%;
}
.compact-kc-dialog.el-dialog {
  --el-dialog-padding-primary: 0;
  height: auto !important;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
}
.compact-kc-dialog.el-dialog > .el-dialog__header {
  flex: 0 0 auto;
  margin-right: 0;
  padding: 18px 24px 15px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}
.compact-kc-dialog.el-dialog .el-dialog__title {
  color: #0f172a;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: 0;
}
.compact-kc-dialog.el-dialog .el-dialog__headerbtn {
  top: 0;
  width: 52px;
  height: 52px;
}
.compact-kc-dialog.el-dialog > .el-dialog__body {
  flex: 0 1 auto;
  height: auto !important;
  min-height: 0 !important;
  max-height: calc(100vh - 220px);
  padding: 22px 28px 18px;
  overflow-y: auto;
  background: #ffffff;
}
.compact-kc-dialog.el-dialog > .el-dialog__footer {
  flex: 0 0 auto;
  padding: 15px 24px 18px;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
}
.compact-kc-dialog.el-dialog > .el-dialog__footer .el-button {
  min-width: 78px;
  border-radius: 6px;
}
.compact-kc-message-box.el-message-box {
  --el-messagebox-width: 420px;
  width: min(420px, calc(100vw - 32px));
  height: auto !important;
  min-height: 0 !important;
  max-height: calc(100vh - 120px);
  padding-bottom: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
}
.compact-kc-message-box.el-message-box .el-message-box__content {
  height: auto !important;
  min-height: 0 !important;
  padding: 18px 24px;
}
.compact-kc-message-box.el-message-box .el-message-box__btns {
  padding: 12px 24px 18px;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
}
.book-query-dialog.el-dialog .query-answer,
.book-query-dialog.el-dialog .query-source-text {
  max-height: 28vh;
  overflow-y: auto;
}
.kc-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 10px;
  background: linear-gradient(180deg, #f6f6f6 0%, #e8e8e8 100%);
  border-radius: 10px 10px 0 0;
  border-bottom: 1px solid #d4d4d4;
}
.kc-dialog-dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  flex-shrink: 0;
}
.kc-dialog-dot--close {
  background: #ee5a5a;
  border: 1px solid #e04444;
  cursor: pointer;
}
.kc-dialog-dot--close:hover { background: #ef7676; }
.kc-dialog-dot--minimize {
  background: #f5bf4f;
  border: 1px solid #e0a830;
}
.kc-dialog-dot--maximize {
  background: #5fc646;
  border: 1px solid #45a630;
}
.kc-dialog-title {
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: #3a3a3a;
  margin-right: 40px;
  user-select: none;
}
</style>
