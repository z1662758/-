<template>
  <div class="knowledge-center">
    <!-- ====== OVERVIEW MODE ====== -->
    <template v-if="!activeLibrary">
      <div class="kc-header">
        <div class="kc-header-left">
          <h1 class="kc-title">知识库</h1>
          <p class="kc-subtitle">从证据资料到认知结构，再到可复用仿真资产</p>
        </div>
        <div class="kc-header-tools">
          <div class="kc-tool-card kc-tool-config" @click="activeLibrary = 'config'">
            <el-icon :size="18"><Setting /></el-icon>
            <span>知识库配置</span>
          </div>
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
            <button
              v-for="item in section.items"
              :key="item.key"
              type="button"
              :class="['kc-level-card', `kc-level-card--${item.theme}`]"
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
              <span class="kc-level-card__stats">
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
            </button>
          </div>
        </section>
      </div>

      <!-- Dataset Section (collapsible) -->

      <!-- Dataset Section (collapsible → 弹窗打开旧 KnowledgeCreate) -->
    </template>

    <!-- ====== DETAIL MODE ====== -->
    <template v-else>
      <div class="kc-detail">
        <!-- Back button & header -->
        <div class="kc-detail-topbar">
          <el-button text @click="activeLibrary = null">
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
                v-if="!['config', 'subject', 'environment', 'rules', 'experts', 'ontology'].includes(activeLibrary)"
                :model-value="currentLib.enabled"
                @change="(v) => toggleLibrary(activeLibrary, v)"
                size="small"
                style="margin-left: 12px"
              />
            </div>
            <p class="kc-detail-desc">{{ currentLib.desc }}</p>
          </div>
        </div>

        <!-- Stats row (仅四库展示，配置/专家观点不显示) -->
        <div v-if="!['config','experts','ontology'].includes(activeLibrary)" class="kc-detail-stats">
          <div v-for="s in libraryStats" :key="s.label" class="kc-stat-card">
            <div class="kc-stat-card__value">{{ s.value }}</div>
            <div class="kc-stat-card__label">{{ s.label }}</div>
            <div class="kc-stat-card__bar" :style="{ width: s.pct + '%', background: `var(--kc-card-accent, var(--kc-primary))` }" />
          </div>
        </div>

        <!-- Action buttons (仅四库展示) -->
        <div v-if="!['config','experts','ontology'].includes(activeLibrary)" class="kc-detail-actions">
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

        <!-- Tabbed content（四库: Graph / Docs / Entities） -->
        <template v-if="!['config','experts','ontology'].includes(activeLibrary)">
          <el-tabs v-model="viewMode" class="kc-detail-tabs">
            <el-tab-pane label="知识图谱" name="graph">
              <div v-if="currentLib.graphData" ref="graphRef" class="kc-graph-container" />
              <el-empty v-else description="暂无知识图谱数据" :image-size="80" />
            </el-tab-pane>
            <el-tab-pane label="文档列表" name="docs">
              <el-table :data="currentLib.documents || []" stripe size="small" empty-text="暂无文档">
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="type" label="类型" width="100" />
                <el-table-column prop="chunks" label="切片数" width="80" />
                <el-table-column prop="uploadTime" label="上传时间" width="160" />
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="实体分析" name="entities">
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
          </el-tabs>

        </template>

        <!-- 配置库详情 -->
        <div v-else-if="activeLibrary === 'config'" class="kc-config-page">
          <div class="kc-config-placeholder">
            <div class="kc-config-placeholder__icon">
              <el-icon :size="34"><Setting /></el-icon>
            </div>
            <div class="kc-config-placeholder__title">开发中</div>
            <div class="kc-config-placeholder__desc">知识库配置功能正在建设</div>
          </div>
        </div>

        <!-- 本体编辑 -->
        <div v-else-if="activeLibrary === 'ontology'" class="kc-ontology-page">
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

        <!-- 专家观点库详情 -->
        <div v-else-if="activeLibrary === 'experts'" class="kc-expert-page">
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap;">
            <el-select v-model="cognitiveSelectedBook" placeholder="请选择要提取认知的书籍/文章" style="width:360px" @change="extractCognitiveModel(false)" clearable>
              <el-option v-for="b in dataset.books" :key="b.name" :label="b.name" :value="b.name" />
            </el-select>
            <el-button :disabled="!cognitiveSelectedBook" :loading="extracting" type="primary" @click="extractCognitiveModel(true)">
              <el-icon><RefreshRight /></el-icon> 提取/刷新认知模型
            </el-button>
          </div>

          <div v-if="cognitiveModelData" class="kc-expert-section">
            <div class="kc-expert-graph-wrap"><div class="kc-expert-graph-title"><el-icon><Connection /></el-icon> 认知模型流程图谱</div><div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">拖拽节点可微调布局</div><div id="cognitiveChart" class="kc-expert-chart"></div></div>
            <div class="kc-expert-markdown-wrap"><div class="kc-expert-graph-title"><el-icon><Document /></el-icon> 模型深度解析</div><div class="cognitive-markdown" v-html="cognitiveMarkdownHtml"></div></div>
          </div>
          <div v-else-if="extracting" class="kc-expert-loading">
            <el-icon class="is-loading" size="40" color="#409eff"><Loading /></el-icon>
            <div style="font-size:15px;font-weight:500;color:#374151;">AI 正在深度阅读文章，提取核心实体与因果认知模型...</div>
            <div style="font-size:13px;color:#94a3b8;">此过程可能需要 15-30 秒</div>
          </div>
          <el-empty v-else :image-size="80" description="请选择上方书籍/文章并点击提取认知模型" />
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
          <el-input v-model="sidebarPaperQuery" placeholder="搜索论文..." prefix-icon="Search" size="small" clearable class="kc-resource-search" />
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

      <!-- 一级标签：实时新闻 / 社交动态 / 官方情报 -->
      <el-tabs v-model="osintTab" @tab-change="onOsintTabChange">
        <!-- ===== 实时新闻 ===== -->
        <el-tab-pane label="实时新闻" name="news">
          <div class="kc-osint-tab-toolbar" style="display:flex;gap:8px;margin-bottom:8px;">
            <el-input v-model="sidebarOsintKeyword" placeholder="搜索关键词..." prefix-icon="Search" size="small" clearable style="width:260px" @keyup.enter="fetchOsintByType('news')" />
            <el-button size="small" :loading="sidebarOsintLoading" @click="fetchOsintByType('news')"><el-icon><RefreshRight /></el-icon> 刷新</el-button>
            <el-button size="small" type="primary" @click="showOsintUploadDialog = true"><el-icon><Upload /></el-icon> 上传</el-button>
            <el-button size="small" type="primary" plain @click="openOsintVisualPage"><el-icon><DataAnalysis /></el-icon> 可视化分析</el-button>
          </div>
          <div class="kc-resource-list kc-resource-list--osint">
            <div v-for="ev in newsFilteredEvents" :key="ev.id" :class="['kc-sb-osint-card', { 'kc-sb-osint-card--high': ev.alert }]" @click="toggleOsintDetail(ev)">
              <div class="kc-sb-osint-card-top">
                <span class="kc-sb-osint-dot" :style="{ background: ev.color }" />
                <span v-if="ev.alert" class="kc-sb-osint-alert">重要</span>
                <span class="kc-sb-osint-title">{{ ev.title }}</span>
              </div>
              <div class="kc-sb-osint-card-meta">
                <span class="kc-sb-osint-source">{{ ev.source }}</span>
                <span class="kc-sb-osint-time">{{ ev.date }}</span>
                <span class="kc-sb-osint-cat" :style="{ color: ev.color }">{{ ev.category }}</span>
              </div>
              <transition name="sidebar-expand">
                <div v-if="ev._expanded" class="kc-sb-osint-detail">
                  <p v-if="ev._loading" class="kc-sb-osint-desc"><el-icon class="is-loading"><Loading /></el-icon> 加载中...</p>
                  <p v-else class="kc-sb-osint-desc">{{ ev._detail || ev.description || ev.summary || '暂无内容' }}</p>
                  <a v-if="ev._detailFull" :href="ev._detailFull" target="_blank" class="kc-sb-osint-link" style="display:none"></a>
                  <a v-if="ev.url" :href="ev.url" target="_blank" class="kc-sb-osint-link"><el-icon :size="12"><Link /></el-icon> 查看原文</a>
                </div>
              </transition>
            </div>
            <div v-if="!newsFilteredEvents.length" class="kc-sb-empty"><el-empty description="暂无实时新闻" :image-size="80" /></div>
          </div>
        </el-tab-pane>

        <!-- ===== 社交动态 ===== -->
        <el-tab-pane label="社交动态" name="social">
          <div class="kc-osint-tab-toolbar" style="display:flex;gap:8px;margin-bottom:8px;">
            <el-input v-model="sidebarOsintKeyword" placeholder="搜索关键词..." prefix-icon="Search" size="small" clearable style="width:260px" @keyup.enter="fetchOsintByType('social')" />
            <el-button size="small" :loading="sidebarOsintLoading" @click="fetchOsintByType('social')"><el-icon><RefreshRight /></el-icon> 刷新</el-button>
          </div>
          <div class="kc-resource-list kc-resource-list--osint">
            <div v-for="ev in socialFilteredEvents" :key="ev.id" :class="['kc-sb-osint-card', { 'kc-sb-osint-card--high': ev.alert }]" @click="toggleOsintDetail(ev)">
              <div class="kc-sb-osint-card-top">
                <span class="kc-sb-osint-dot" :style="{ background: ev.color }" />
                <span v-if="ev.alert" class="kc-sb-osint-alert">重要</span>
                <span class="kc-sb-osint-title">{{ ev.title }}</span>
              </div>
              <div class="kc-sb-osint-card-meta">
                <span class="kc-sb-osint-source">{{ ev.source }}</span>
                <span class="kc-sb-osint-time">{{ ev.date }}</span>
                <span class="kc-sb-osint-cat" :style="{ color: ev.color }">{{ ev.category }}</span>
              </div>
              <transition name="sidebar-expand">
                <div v-if="ev._expanded" class="kc-sb-osint-detail">
                  <p v-if="ev._loading" class="kc-sb-osint-desc"><el-icon class="is-loading"><Loading /></el-icon> 加载中...</p>
                  <p v-else class="kc-sb-osint-desc">{{ ev._detail || ev.description || ev.summary || '暂无内容' }}</p>
                  <a v-if="ev.url" :href="ev.url" target="_blank" class="kc-sb-osint-link"><el-icon :size="12"><Link /></el-icon> 查看原文</a>
                </div>
              </transition>
            </div>
            <div v-if="!socialFilteredEvents.length" class="kc-sb-empty"><el-empty description="暂无社交动态" :image-size="80" /></div>
          </div>
        </el-tab-pane>

        <!-- ===== 官方情报 ===== -->
        <el-tab-pane label="官方情报" name="official">
          <el-tabs v-model="officialCategory">
            <el-tab-pane label="军控" name="军控">
              <KnowledgeGraphPanel category="军控" @graph-updated="onGraphUpdated" />
            </el-tab-pane>
            <el-tab-pane label="H政策" name="H政策">
              <KnowledgeGraphPanel category="H政策" @graph-updated="onGraphUpdated" />
            </el-tab-pane>
          </el-tabs>
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
    <el-dialog v-model="showOsintUploadDialog" title="上传情报文档" width="420px" :append-to-body="true" destroy-on-close @closed="resetOsintUploadDialog">
      <el-form label-width="60px">
        <el-form-item label="文件">
          <el-upload
            ref="osintUploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".pdf,.doc,.docx,.txt,.epub"
          >
            <el-button size="small" type="primary">选择文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="osintUploadForm.name" placeholder="文档名称（可选）" size="small" />
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
        <KnowledgeCreate standalone />
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
import KnowledgeCreate from './KnowledgeCreate.vue'
import KnowledgeGraphPanel from '@/components/KnowledgeGraphPanel.vue'
import { getOsintBySourceType, getOsintNewsDetail } from '@/api/powerGame/osintKnowledgeGraph'
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

export default {
  name: 'NewKnowledgeCenter',
  components: {
    UserFilled, MapLocation, List, Reading,
    FolderOpened, Upload, Download, Delete, ArrowLeft,
    Coin, MagicStick, CollectionTag, Document, Plus,
    Setting, Connection, Loading, RefreshRight, Edit, Search, HelpFilled,
    KnowledgeIndex, KnowledgeCreate, KnowledgeGraphPanel, Collection, Link, Clock, DataAnalysis,
  },
  data() {
    return {
      // Resource data
      showPapersDialog: false,
      showOsintDialog: false,
      sidebarTab: 'papers',
      sidebarPaperQuery: '',
      sidebarCategoryFilter: '',
      sidebarDatasetFilter: '',
      sidebarOsintKeyword: '',
      sidebarOsintLoading: false,
      sidebarOsintEvents: [],
      sidebarOsintLastUpdate: '',
      sidebarOsintCategoryFilter: 'all',
      osintTab: 'news',
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
      osintUploadForm: { name: '' },
      sidebarTabs: [
        { key: 'dataset', label: '专家文档库', icon: 'FolderOpened' },
        { key: 'osint', label: '开源情报库', icon: 'DataAnalysis' },
        { key: 'papers', label: '研究论文库', icon: 'Reading' },
      ],
      knowledgeSections: [
        {
          key: 'resources',
          title: '知识资源',
          desc: '汇聚专家文档、开源情报与研究论文，提供可追溯的证据材料。',
          items: [
            { key: 'dataset', title: '专家文档库', desc: '沉淀专家报告、书籍和领域文档', icon: 'FolderOpened', theme: 'dataset', meta: 'Docs', action: 'dialog', dialog: 'dataset' },
            { key: 'osint', title: '开源情报库', desc: '跟踪事件新闻与公开情报', icon: 'DataAnalysis', theme: 'osint', meta: 'OSINT', action: 'dialog', dialog: 'osint' },
            { key: 'papers', title: '研究论文库', desc: '检索、爬取和管理研究论文', icon: 'Reading', theme: 'papers', meta: 'arXiv / PDF', action: 'dialog', dialog: 'papers' },
          ],
        },
        {
          key: 'construct',
          title: '知识建构',
          desc: '将资料转化为观点、概念和关系，形成可解释的认知结构。',
          items: [
            { key: 'experts', title: '专家观点', desc: '抽取专家认知模型和观点网络', icon: 'Connection', theme: 'experts', meta: '观点图谱', action: 'library', library: 'experts' },
            { key: 'ontology', title: '本体编辑', desc: '编辑领域概念、实体类型和关系规则', icon: 'Collection', theme: 'ontology', meta: 'Ontology', action: 'library', library: 'ontology' },
          ],
        },
        {
          key: 'assets',
          title: '仿真资产',
          desc: '面向实验与推演复用，组织主体、环境和规则资产。',
          items: [
            { key: 'subject', title: '主体库', desc: 'Agent 角色、组织与行为知识', icon: 'UserFilled', theme: 'subject', meta: 'Agent', action: 'library', library: 'subject' },
            { key: 'environment', title: '环境库', desc: '地理空间、场景条件与外部约束', icon: 'MapLocation', theme: 'environment', meta: 'Scene', action: 'library', library: 'environment' },
            { key: 'rules', title: '规则库', desc: '博弈规则、红线条件与行为约束', icon: 'List', theme: 'rules', meta: 'Rules', action: 'library', library: 'rules' },
          ],
        },
      ],
      sidebarOsintFilterOptions: [
        { key: 'all', label: '全部' },
        { key: '外交事件', label: '外交事件' },
        { key: '军事基地', label: '军事基地' },
        { key: '经济影响', label: '经济影响' },
      ],
      activeLibrary: null,
      papersData: [],
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
      expertStatsRequestId: 0,

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
        subject: {
          name: '主体库', desc: '博弈主体 Agent 知识体系',
          docCount: 12, chunkCount: 342, entityCount: 156, relationCount: 423,
          enabled: true, keywords: ['肯尼迪', '赫鲁晓夫', '卡斯特罗'],
          documents: [
            { name: 'John F. Kennedy 档案', type: '人物', chunks: 45, uploadTime: '2024-01-10' },
            { name: 'Nikita Khrushchev 档案', type: '人物', chunks: 38, uploadTime: '2024-01-12' },
            { name: 'Fidel Castro 档案', type: '人物', chunks: 22, uploadTime: '2024-01-14' },
          ],
          entityCategories: {
            person: { name: '人物', count: 45, entities: ['John F. Kennedy', 'Nikita Khrushchev', 'Fidel Castro', 'Robert McNamara', 'Dean Rusk'], overflow: 40 },
            org: { name: '组织', count: 28, entities: ['CIA', 'KGB', 'UN Security Council', 'Warsaw Pact', 'NATO'], overflow: 23 },
            event: { name: '事件', count: 35, entities: ['Bay of Pigs Invasion', 'Cuban Missile Crisis', 'Berlin Blockade'], overflow: 32 },
            location: { name: '地点', count: 22, entities: ['Cuba', 'Soviet Union', 'United States', 'Berlin', 'Turkey'], overflow: 17 },
          },
          graphData: true,
        },
        environment: {
          name: '环境库', desc: '博弈环境与地理空间信息',
          docCount: 8, chunkCount: 245, entityCount: 89, relationCount: 201,
          enabled: true, keywords: ['加勒比海', '导弹发射井', '海上封锁线'],
          documents: [
            { name: '加勒比海地区军事部署图', type: '地理', chunks: 56, uploadTime: '2024-01-08' },
            { name: '苏联导弹射程分析', type: '军事', chunks: 34, uploadTime: '2024-01-16' },
          ],
          entityCategories: {
            person: { name: '人物', count: 12, entities: ['Nikita Khrushchev', 'John F. Kennedy'], overflow: 10 },
            org: { name: '组织', count: 18, entities: ['US Navy', 'US Air Force', 'Strategic Air Command'], overflow: 15 },
            location: { name: '地点', count: 34, entities: ['Cuba', 'Florida', 'Turkey', 'Berlin', 'Moscow', 'Washington DC'], overflow: 28 },
          },
          graphData: true,
        },
        rules: {
          name: '规则库', desc: '博弈规则与行为约束条件',
          docCount: 5, chunkCount: 89, entityCount: 34, relationCount: 67,
          enabled: true, keywords: ['威慑平衡', '红线规则', ' escalation'],
          documents: [
            { name: '核威慑博弈规则集', type: '规则', chunks: 28, uploadTime: '2024-01-05' },
            { name: '危机升级阶梯模型', type: '模型', chunks: 19, uploadTime: '2024-01-20' },
          ],
          entityCategories: {
            event: { name: '事件', count: 15, entities: ['Nuclear Strike', 'Naval Blockade', 'Diplomatic Negotiation'], overflow: 12 },
            org: { name: '组织', count: 8, entities: ['UN', 'NATO', 'WTO'], overflow: 5 },
          },
          graphData: true,
        },
      },
    }
  },

  computed: {
    currentLib() {
      if (!this.activeLibrary) return {}
      return this.libraries[this.activeLibrary] || {}
    },
    filteredBooks() {
      let list = this.dataset.books
      const q = this.dataset.filter.toLowerCase()
      if (q) list = list.filter(b => b.name.toLowerCase().includes(q))
      if (this.categoryFilter) list = list.filter(b => b.categories && b.categories.includes(this.categoryFilter))
      return list
    },
    libraryStats() {
      const lib = this.currentLib
      if (!lib) return []
      const maxVal = Math.max(lib.docCount || 1, lib.chunkCount || 1, lib.entityCount || 1, lib.relationCount || 1)
      return [
        { label: '文档', value: lib.docCount || 0, pct: ((lib.docCount || 0) / maxVal) * 100 },
        { label: '切片', value: lib.chunkCount || 0, pct: ((lib.chunkCount || 0) / maxVal) * 100 },
        { label: '实体', value: lib.entityCount || 0, pct: ((lib.entityCount || 0) / maxVal) * 100 },
        { label: '关系', value: lib.relationCount || 0, pct: ((lib.relationCount || 0) / maxVal) * 100 },
      ]
    },
    resourceOverviewByKey() {
      const paperLoading = this.loading.papers || this.loading.stats
      const datasetLoading = this.dataset.loading
      const osintLoading = this.sidebarOsintLoading
      const expertLoading = this.expertOverviewStats.loading
      const paperTotal = this.paperStats.total || this.sidebarPaperStats.total
      const paperDownloaded = this.paperStats.downloaded || this.sidebarPaperStats.downloaded
      const paperKeywordCount = this.paperStats.keywordCount > 0 ? this.paperStats.keywordCount : this.sidebarPaperStats.keywordCount
      const osintEvents = this.sidebarOsintEvents || []
      const datasetBooks = this.dataset.books || []
      const libraryStats = (key) => {
        const lib = this.libraries[key] || {}
        return [
          { label: '文档', value: lib.docCount || 0 },
          { label: '实体', value: lib.entityCount || 0 },
          { label: '关系', value: lib.relationCount || 0 },
        ]
      }

      return {
        papers: [
          { label: '论文', value: paperTotal, loading: paperLoading },
          { label: '已下载', value: paperDownloaded, loading: paperLoading },
          { label: '关键词', value: paperKeywordCount, loading: paperLoading },
        ],
        osint: [
          { label: '情报', value: osintEvents.length, loading: osintLoading },
          { label: '预警', value: osintEvents.filter(item => item.alert).length, loading: osintLoading },
          { label: '分类', value: new Set(osintEvents.map(item => item.category).filter(Boolean)).size, loading: osintLoading },
        ],
        dataset: [
          { label: '文档', value: datasetBooks.length, loading: datasetLoading },
          { label: '已解析', value: datasetBooks.filter(item => item.status === 'finished').length, loading: datasetLoading },
          { label: '分类', value: new Set(datasetBooks.flatMap(item => item.categories || [])).size, loading: datasetLoading },
        ],
        experts: [
          { label: '文档', value: datasetBooks.length, loading: datasetLoading },
          { label: '模型', value: this.expertOverviewStats.models, loading: expertLoading },
          { label: '节点', value: this.expertOverviewStats.nodes, loading: expertLoading },
        ],
        ontology: [
          { label: '实体', value: this.ontologyGraphData.nodes.length },
          { label: '关系', value: this.ontologyGraphData.links.length },
          { label: '规则', value: this.ontologyStats.decision.rules },
        ],
        subject: libraryStats('subject'),
        environment: libraryStats('environment'),
        rules: libraryStats('rules'),
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
    socialFilteredEvents() {
      return this.socialEvents || []
    },
  },

  watch: {
    activeLibrary: {
      handler(val) {
        this.$nextTick(() => {
          if (val === 'experts' && !this.resourceCache.expertStatsLoaded && !this.expertOverviewStats.loading) {
            this.fetchExpertOverviewStats(this.dataset.books)
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
  },

  mounted() {
    this.fetchBookList()
    this.fetchSidebarPapers()
    this.fetchPaperStats()
    this.fetchSidebarOsint()
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
    openKnowledgeEntry(item) {
      if (!item) return
      if (item.action === 'dialog') {
        if (item.dialog === 'papers') {
          this.showPapersDialog = true
          this.switchSidebarTab('papers')
        } else if (item.dialog === 'osint') {
          this.showOsintDialog = true
          this.switchSidebarTab('osint')
        } else if (item.dialog === 'dataset') {
          this.showDatasetDialog = true
        }
        return
      }
      if (item.action === 'library' && item.library) {
        this.activeLibrary = item.library
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
      }
      await this.refreshPaperKeywordStatsFromPapers()
    },
    async onOsintDialogOpen() {
      if (!this.resourceCache.osintLoaded) {
        await this.fetchOsintByType('news')
      }
    },
    async onOsintTabChange(tab) {
      if (tab === 'news' && !this.newsEvents.length) {
        await this.fetchOsintByType('news')
      } else if (tab === 'social' && !this.socialEvents.length) {
        await this.fetchOsintByType('social')
      }
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
      if (ev._detail || !ev.id) return
      ev._loading = true
      try {
        const res = await getOsintNewsDetail(ev.id)
        if (res?.success && res.data) {
          ev._detail = res.data.content || res.data.summary || '暂无内容'
          ev._detailFull = res.data.content || ''
        }
      } catch (e) {
        console.warn('Failed to load detail:', e)
        ev._detail = '加载失败'
      } finally {
        ev._loading = false
      }
    },
    async fetchOsintByType(sourceCategory) {
      this.sidebarOsintLoading = true
      try {
        const res = await getOsintBySourceType(sourceCategory, this.sidebarOsintKeyword || undefined)
        if (res?.success && res.data) {
          const items = []
          Object.entries(res.data).forEach(([keyword, events]) => {
            if (Array.isArray(events)) {
              events.forEach(item => items.push({ ...item, _keyword: keyword }))
            }
          })
          const mapped = items.map((item, idx) => {
            const catMapping = { Economy: '经济影响', Military: '军事基地', Politics: '外交事件', General: '外交事件' }
            const cat = catMapping[item.category] || item.category || '外交事件'
            const colors = { '外交事件': '#6366f1', '军事基地': '#f43f5e', '经济影响': '#10b981' }
            return {
              id: item.id || `osint-${idx}`,
              title: item.title || '-',
              source: item.source || '-',
              url: item.url || '',
              date: (item.date || item.fullTime || item.time || '').split(' ')[0] || '-',
              description: item.summary || item.description || item.snippet || '',
              category: cat,
              color: colors[cat] || '#6366f1',
              alert: item.priority != null && item.priority >= 80,
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
        }
      } catch (e) {
        console.warn(`OSINT ${sourceCategory} API failed:`, e)
      }
      this.sidebarOsintLoading = false
    },
    async fetchSidebarOsint(force = false) {
      if (this.resourceCache.osintLoaded && !force) return
      this.sidebarOsintLoading = true
      const request = (await import('@/utils/request.js')).default
      try {
        // Use same approach as OSINTConsole.vue openEventsDialog():
        // GET /powerGame/osint/all_news → returns { keyword1: [...], keyword2: [...] }
        const res = await request.get('/powerGame/osint/all_news')
        if (res?.success && res.data) {
          const allEvents = []
          Object.entries(res.data).forEach(([keyword, events]) => {
            if (Array.isArray(events)) {
              events.forEach(item => allEvents.push({ ...item, _keyword: keyword }))
            }
          })
          if (allEvents.length) {
            this.sidebarOsintEvents = allEvents.map((item, idx) => {
              const catMapping = { Economy: '经济影响', Military: '军事基地', Politics: '外交事件', General: '外交事件' }
              const cat = catMapping[item.category] || item.category || '外交事件'
              const colors = { '外交事件': '#6366f1', '军事基地': '#f43f5e', '经济影响': '#10b981' }
              return {
                id: item.id || `osint-${idx}`,
                title: item.title || '-',
                source: item.source || '-',
                url: item.url || '',
                date: (item.date || item.fullTime || item.time || '').split(' ')[0] || '-',
                description: item.summary || item.description || item.snippet || '',
                category: cat,
                color: colors[cat] || '#6366f1',
                alert: item.priority != null && item.priority >= 80,
                _expanded: false,
              }
            })
            this.sidebarOsintLastUpdate = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
            this.resourceCache.osintLoaded = true
          } else {
            this.fallbackSidebarOsint()
          }
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
      this.osintUploadForm.name = ''
      this.$refs.osintUploadRef?.clearFiles()
    },
    async submitPaperUpload() {
      const files = this.$refs.paperUploadRef?.uploadFiles || []
      const rawFile = files[0]?.raw
      if (!rawFile) {
        this.$message.warning('请先选择要上传的论文文件')
        return
      }
      this.paperUploadLoading = true
      try {
        const res = await uploadPaper(rawFile)
        if (res?.success || Number(res?.code) === 200) {
          this.$message.success('论文上传成功')
          this.showPaperUploadDialog = false
          await this.fetchSidebarPapers(true)
        } else {
          this.$message.error(res?.message || '论文上传失败，请重试')
        }
      } catch (e) {
        this.$message.error('论文上传服务暂不可用')
        console.warn('[Paper Upload Error]', e)
      } finally {
        this.paperUploadLoading = false
      }
    },
    async submitOsintUpload() {
      const files = this.$refs.osintUploadRef?.uploadFiles || []
      const rawFile = files[0]?.raw
      if (!rawFile) {
        this.$message.warning('请先选择要上传的情报文件')
        return
      }
      this.osintUploadLoading = true
      try {
        const res = await uploadOsint(rawFile)
        if (res?.success || Number(res?.code) === 200) {
          this.$message.success('开源情报上传成功')
          this.showOsintUploadDialog = false
          await this.fetchSidebarOsint(true)
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
      const icons = { subject: 'UserFilled', environment: 'MapLocation', rules: 'List', ontology: 'Collection' }
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
        this.fetchExpertOverviewStats(this.dataset.books, force)
      }
    },

    async fetchExpertOverviewStats(books = this.dataset.books, force = false) {
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
              params: { book_name: bookName, force_refresh: false }
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
          params: { book_name: this.cognitiveSelectedBook, force_refresh: forceRefresh }
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

.kc-level-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.kc-level-section--construct .kc-level-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.kc-level-card {
  position: relative;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) minmax(116px, auto);
  align-items: center;
  gap: 12px;
  min-height: 96px;
  width: 100%;
  padding: 14px 14px 14px 16px;
  border: 1px solid var(--kc-border);
  border-radius: var(--kc-radius);
  background: #ffffff;
  color: var(--kc-text);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--kc-transition), box-shadow var(--kc-transition), transform var(--kc-transition), background var(--kc-transition);
  overflow: hidden;
}

.kc-level-card:hover {
  border-color: var(--kc-entry-accent);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
  background: linear-gradient(180deg, #ffffff 0%, var(--kc-entry-bg) 100%);
}

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
  min-width: 116px;
  justify-self: end;
}

.kc-level-card__stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
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
