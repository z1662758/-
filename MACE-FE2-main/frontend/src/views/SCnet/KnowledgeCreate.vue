<template>
  <div class="main-content" :class="{ 'main-content--standalone': standalone }">
    <!--     左侧头像+选项卡     -->
    <div v-if="!standalone" class="left-sidebar">
      <div class="avatar-card">
        <img alt="pic"
             src="../../assets/images/books/bookIcon.png" style="width: 60%; height: 60%"/>
      </div>
      <span style="font-size: 15px; margin-top: 1rem; font-weight: 600; color: #111827;">{{
          knowledgeBaseName
        }}</span>

      <el-divider/>

      <div style="display: flex; flex-direction: column; width: 100%;">
        <div v-for="(item, index) in itemCard"
             :class="index === selectedCard ? 'item-card-selected' : 'item-card'" @click="itemCardClick(index)">
          <div style="display: flex; align-items: center">
            <el-icon size="18" style="margin-right: 8px;">
              <component :is="item.icon"></component>
            </el-icon>
            {{ item.name }}
          </div>
        </div>
      </div>
    </div>
    <!--     右侧主体     -->
    <div class="right-content">
      <el-scrollbar
        class="knowledge-create-scroll"
        :class="{ 'document-library-scroll-shell': standalone && selectedCard === 0 }"
        :max-height="standalone ? '' : 'calc(100vh - 120px)'"
        :style="standalone ? { height: '100%' } : {}"
      >
        <div v-if="selectedCard === 0"
             class="document-library-panel">
          <div v-if="!standalone" class="section-title">专家文档库</div>
          <div class="section-subtitle">
            <el-icon size="14" style="margin-right: 5px">
              <Shop/>
            </el-icon>
            解析成功后才可以回答哦
          </div>
          <el-divider class="content-divider"></el-divider>
          <div class="document-library-content">
            <div class="document-library-toolbar">
              <div class="document-library-filters">
                <el-select v-model="categoryFilter" placeholder="按分类筛选" style="width: 150px">
                  <el-option label="全部" value=""/>
                  <el-option v-for="item in categoryOptions"
                             :key="item.value" :label="item.label" :value="item.label"/>
                </el-select>
                <el-input
                  v-model="docNameSearch"
                  clearable
                  placeholder="搜索文档"
                  class="document-library-search"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </div>
              <el-button plain type="primary" @click="openDialog">+
                新增文件
              </el-button>
            </div>
            <div class="document-library-table-wrap" @wheel="handleDocumentTableWheel">
              <el-table
                ref="bookTableRef"
                class="document-library-table"
                :data="filteredBooks"
                :height="standalone ? '100%' : undefined"
                style="width: 100%"
                row-key="name"
              >
              <!-- 拖拽手柄列 -->
              <el-table-column align="center" width="40">
                <template #default>
                  <span
                    class="drag-handle"
                    :style="{
                      cursor: isBookListFiltered ? 'not-allowed' : 'grab',
                      color: isBookListFiltered ? '#e0e0e0' : '#c0c4cc',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }"
                  >
                    <el-icon><Rank /></el-icon>
                  </span>
                </template>
              </el-table-column>
              <el-table-column
                align="center"
                label="名称"
                min-width="200"
                prop="name"
                style="color: #67C23A"
              />
              <el-table-column
                align="center"
                label="上传日期"
                min-width="120"
                prop="date"
              />
              <el-table-column
                align="center"
                label="分类"
                min-width="150"
                prop="categories"
              >
                <template #default="scope">
                  <div class="category-tags">
                    <template v-if="scope.row.categories && scope.row.categories.length > 0">
                      <el-tag
                        v-for="category in scope.row.categories"
                        :key="category"
                        :type="getCategoryTagType(category)"
                        effect="light"
                        size="small"
                        style="margin: 2px"
                      >
                        {{ category }}
                      </el-tag>
                    </template>
                    <template v-else>
                      <span style="color: #909399; font-size: 12px;">未分类</span>
                    </template>
                  </div>
                  <el-button
                    size="small"
                    style="margin-top: 4px"
                    type="text"
                    @click="openCategoryDialog(scope.row)"
                  >
                    编辑分类
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column
                align="center"
                label="解析进度"
                min-width="110"
                prop="progress"
              >
                <template #default="scope">

                  <div v-if="scope.row.showProgress" class="progress-wrapper">
                    <!-- 页面解析进度 -->
                    <div class="progress-item">
                      <div class="step-header">
                        <span :style="{ color: scope.row.parsePercentage === 100 ? '#67c23a' : '#409eff', fontWeight: 'bold' }"
                              class="step-label">页面解析</span>
                        <div class="step-status">
                          <div v-if="scope.row.parsePercentage < 100" class="loading-dots">
                            <span></span><span></span><span></span>
                          </div>
                          <svg v-else class="custom-success-tick" height="20" viewBox="0 0 24 24"
                               width="20">
                            <path d="M5 13l4 4L19 7" fill="none" stroke="#67c23a"
                                  stroke-linecap="round" stroke-linejoin="round"
                                  stroke-width="3"/>
                          </svg>
                        </div>
                      </div>
                      <el-tooltip v-if="scope.row.parsePercentage < 100"
                                  :content="getParseProgressTooltip(scope.row)" effect="dark"
                                  placement="bottom">
                        <el-progress
                          :percentage="scope.row.parsePercentage || 0"
                          :show-text="false"
                          :status="scope.row.parsePercentage === 100 ? 'success' : ''"
                          class="custom-progress"
                          stroke-width="8"
                        />
                      </el-tooltip>
                    </div>

                    <!-- 目录重建进度动画 -->
                    <div v-if="scope.row.parsePercentage === 100 && scope.row.treePercentage < 100"
                         class="progress-item">
                      <div class="step-header">
                        <span class="step-label"
                              style="color: #409eff; font-weight: bold;">目录重建</span>
                        <div class="step-status">
                          <div class="loading-dots">
                            <span></span><span></span><span></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 最终完成状态 -->
                    <div v-if="scope.row.treePercentage === 100" class="progress-item">
                      <div class="step-header">
                        <span class="step-label"
                              style="color: #67c23a; font-weight: bold;">目录重建</span>
                        <div class="step-status">
                          <svg class="custom-success-tick" height="20" viewBox="0 0 24 24"
                               width="20">
                            <path d="M5 13l4 4L19 7" fill="none" stroke="#67c23a"
                                  stroke-linecap="round" stroke-linejoin="round"
                                  stroke-width="3"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <span
                    v-else-if="isBookFinished(scope.row)"
                    style="color: #67c23a; font-weight: bold; display: flex; align-items: center; justify-content: center;">
                     <span>解析完成</span>
                     <div class="step-status" style="margin-left: 6px;">
                       <svg class="custom-success-tick" height="20" viewBox="0 0 24 24" width="20">
                         <path d="M5 13l4 4L19 7" fill="none" stroke="#67c23a" stroke-linecap="round"
                               stroke-linejoin="round" stroke-width="3"/>
                       </svg>
                     </div>
                  </span>
                  <span v-else-if="scope.row.status === 'interrupted'" style="color: #e6a23c; font-size: 12px; font-weight: 600;">已中止</span>
                  <span v-else style="color: #909399; font-size: 12px;">未解析</span>
                </template>
              </el-table-column>
              <el-table-column align="center" label="动作" min-width="180" prop="action">
                <template #default="scope">
                  <div class="book-action-cell">
                    <!-- 解析按钮 -->
                    <el-tooltip v-if="!isBookFinished(scope.row) && !isBookAnalysing(scope.row)" content="解析书籍" effect="dark" placement="top">
                      <el-button :disabled="isBookFinished(scope.row) || (isPageParseRunning(scope.row) && !scope.row.cancelRequested)" plain size="small"
                                 style="padding: 0 6px"
                                 @click="handleAnalyse(scope.row)"
                      >
                        <el-icon>
                          <refresh/>
                        </el-icon>
                      </el-button>
                    </el-tooltip>
                    <!-- 中止解析按钮 -->
                    <el-tooltip v-if="isBookAnalysing(scope.row)" content="中止解析" effect="dark" placement="top">
                      <el-button
                        :disabled="scope.row.cancelRequested"
                        plain
                        size="small"
                        style="padding: 0 6px"
                        type="warning"
                        @click="handleCancelAnalyse(scope.row)"
                      >
                        中止
                      </el-button>
                    </el-tooltip>
                    <!-- 查看目录按钮 -->
                    <el-tooltip content="查看目录" effect="dark" placement="bottom">
                      <el-button
                        plain
                        size="small"
                        style="padding: 0 6px"
                        @click="handleGetIndex(scope.row)"
                      >
                        <el-icon>
                          <folder-opened/>
                        </el-icon>
                      </el-button>
                    </el-tooltip>
                    <!-- 查询按钮 -->
                    <el-tooltip content="查询书籍" effect="dark" placement="bottom">
                      <el-button
                        plain
                        size="small"
                        style="padding: 0 6px"
                        @click="openQueryDialog(scope.row)"
                      >
                        <el-icon>
                          <HelpFilled/>
                        </el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-dropdown trigger="click" @command="handleBookActionCommand(scope.row, $event)">
                      <el-button plain size="small" style="padding: 0 6px">
                        <el-icon>
                          <MoreFilled/>
                        </el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="rename">
                            重命名
                          </el-dropdown-item>
                          <el-dropdown-item
                            command="resetTree"
                            :disabled="isBookAnalysing(scope.row) || Number(scope.row.treePercentage || 0) <= 0"
                          >
                            清除目录
                          </el-dropdown-item>
                          <el-dropdown-item
                            command="resetPages"
                            :disabled="isBookAnalysing(scope.row) || Number(scope.row.parsePercentage || 0) <= 0"
                          >
                            清除页面解析
                          </el-dropdown-item>
                          <el-dropdown-item command="delete" divided>
                            删除文件
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </template>
              </el-table-column>
              </el-table>
            </div>
          </div>
        </div>
        <div v-if="selectedCard === 1"
             style="display: flex; width: 100%; flex-direction: column;">
          <div class="section-title">知识库详情</div>
          <div class="section-subtitle">
            <el-icon size="14" style="margin-right: 5px">
              <Aim/>
            </el-icon>
            查看知识库的分类、文档统计与实体关系
          </div>
          <el-divider class="content-divider"></el-divider>
          <div class="knowledge-detail-container">
            <!-- 左侧知识库列表 -->
            <div class="knowledge-sidebar">
              <div class="sidebar-header">
                <el-icon>
                  <Collection/>
                </el-icon>
                <span>知识库分类</span>
              </div>
              <el-tabs v-model="knowledgeActiveTab" class="knowledge-tabs" tab-position="left">
                <el-tab-pane label="主体库" name="subject">
                  <template #label>
                    <div class="tab-label">
                      <el-icon>
                        <User/>
                      </el-icon>
                      <span>主体库</span>
                    </div>
                  </template>
                </el-tab-pane>
                <el-tab-pane label="环境库" name="environment">
                  <template #label>
                    <div class="tab-label">
                      <el-icon>
                        <PictureFilled/>
                      </el-icon>
                      <span>环境库</span>
                    </div>
                  </template>
                </el-tab-pane>
                <el-tab-pane label="规则库" name="rules">
                  <template #label>
                    <div class="tab-label">
                      <el-icon>
                        <Document/>
                      </el-icon>
                      <span>规则库</span>
                    </div>
                  </template>
                </el-tab-pane>
              </el-tabs>
              <!-- 知识库卡片列表 -->
              <div class="knowledge-card-list">
                <el-scrollbar height="400px">
                  <div
                    v-for="(item, index) in currentKnowledgeList"
                    :key="index"
                    :class="{ 'is-selected': selectedKnowledgeIndex === index }"
                    class="knowledge-card-item"
                    @click="selectKnowledge(index)"
                  >
                    <div class="card-item-icon">
                      <el-icon :size="20">
                        <Notebook/>
                      </el-icon>
                    </div>
                    <div class="card-item-info">
                      <div class="card-item-title">{{ item.name }}</div>
                      <div class="card-item-meta">{{ item.docCount }} 个文档 · {{
                          item.updateTime
                        }}
                      </div>
                    </div>
                    <el-tag :type="item.enabled ? 'success' : 'info'" size="small">
                      {{ item.enabled ? '启用' : '禁用' }}
                    </el-tag>
                  </div>
                </el-scrollbar>
              </div>
            </div>

            <!-- 右侧详情内容 -->
            <div class="knowledge-main">
              <template v-if="selectedKnowledgeData">
                <!-- 顶部信息 -->
                <div class="knowledge-header">
                  <div class="header-left">
                    <h2 class="knowledge-title">{{ selectedKnowledgeData.name }}</h2>
                    <p class="knowledge-desc">{{ selectedKnowledgeData.description }}</p>
                  </div>
                  <div class="header-actions">
                    <el-button plain size="small" type="primary">
                      <el-icon>
                        <Connection/>
                      </el-icon>
                      加载到Agent
                    </el-button>
                  </div>
                </div>

                <!-- 统计卡片 -->
                <div class="knowledge-stats">
                  <div class="stat-card">
                    <div class="stat-value">{{ selectedKnowledgeData.docCount }}</div>
                    <div class="stat-label">文档数量</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">{{ selectedKnowledgeData.chunkCount }}</div>
                    <div class="stat-label">知识切片</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">{{ selectedKnowledgeData.entityCount }}</div>
                    <div class="stat-label">实体节点</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">{{ selectedKnowledgeData.relationCount }}</div>
                    <div class="stat-label">关系边</div>
                  </div>
                </div>

                <!-- 展示方式切换 -->
                <el-tabs v-model="knowledgeViewMode" class="knowledge-view-tabs">
                  <el-tab-pane label="知识图谱" name="graph">
                    <div ref="knowledgeGraphRef" class="knowledge-graph-container"></div>
                  </el-tab-pane>
                  <el-tab-pane label="文档列表" name="docs">
                    <el-table :data="selectedKnowledgeData.documents" max-height="350" stripe
                              style="width: 100%">
                      <el-table-column label="文档名称" min-width="200"
                                       prop="name"></el-table-column>
                      <el-table-column label="类型" prop="type" width="100"></el-table-column>
                      <el-table-column label="切片数" prop="chunks" width="100"></el-table-column>
                      <el-table-column label="状态" prop="status" width="100">
                        <template #default="scope">
                          <el-tag :type="scope.row.status === '已解析' ? 'success' : 'warning'"
                                  size="small">
                            {{ scope.row.status }}
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column label="上传时间" prop="uploadTime"
                                       width="150"></el-table-column>
                    </el-table>
                  </el-tab-pane>
                  <el-tab-pane label="实体分析" name="entities">
                    <div class="entity-analysis">
                      <div v-for="(category, key) in selectedKnowledgeData.entityCategories"
                           :key="key"
                           class="entity-category">
                        <div class="category-header">
                          <span class="category-name">{{ category.name }}</span>
                          <el-tag effect="plain" size="small">{{ category.count }}</el-tag>
                        </div>
                        <div class="entity-tags">
                          <el-tag
                            v-for="entity in category.entities.slice(0, 8)"
                            :key="entity"
                            class="entity-tag"
                            effect="light"
                            size="small"
                          >
                            {{ entity }}
                          </el-tag>
                          <el-tag v-if="category.entities.length > 8" size="small" type="info">
                            +{{ category.entities.length - 8 }}
                          </el-tag>
                        </div>
                      </div>
                    </div>
                  </el-tab-pane>
                </el-tabs>
              </template>
              <template v-else>
                <div class="empty-knowledge">
                  <el-empty description="请从左侧选择一个知识库查看详情"/>
                </div>
              </template>
            </div>
          </div>
        </div>
        <div v-if="selectedCard === 2"
             style="display: flex; width: 100%; flex-direction: column;">
          <div class="section-title">配置</div>
          <div class="section-subtitle">
            <el-icon size="14" style="margin-right: 5px">
              <Setting/>
            </el-icon>
            知识库的解析与提取规则设定
          </div>
          <el-divider class="content-divider"></el-divider>
          <div style="display: flex; width: 100%;">
            <!--      中间表单      -->
            <div style="width: 38%; display: flex; flex-direction: column">
              <el-form :model="knowledgeBaseForm" label-position="top" label-width="auto"
                       style="max-width: 600px">
                <el-form-item label="知识库名称" required>
                  <el-input v-model="knowledgeBaseForm.name" style="width: 90%"/>
                </el-form-item>
                <el-form-item label="知识库图片">
                  <el-upload
                    :auto-upload="false"
                    action="https://run.mocky.io/v3/9d059bf9-4660-45f2-925d-ce80ad6c4d15" list-type="picture-card" multiple
                    style="display: flex; width: 100%; justify-content: center; flex-grow: 1">
                    <el-icon size="60">
                      <Plus/>
                    </el-icon>
                  </el-upload>
                </el-form-item>
                <el-form-item label="描述">
                  <el-input v-model="knowledgeBaseForm.description"
                            style="width: 90%"></el-input>
                </el-form-item>
                <el-form-item label="文档语言" required>
                  <el-select v-model="knowledgeBaseForm.language" style="width: 90%">
                    <el-option v-for="item in languageOptions"
                               :key="item.value" :label="item.label" :value="item.value"/>
                  </el-select>
                </el-form-item>
                <el-form-item label="权限" required>
                  <el-radio-group v-model="knowledgeBaseForm.authority">
                    <el-radio label="0">只有我</el-radio>
                    <el-radio label="1">团队</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="嵌入模型" required>
                  <el-select v-model="knowledgeBaseForm.model" style="width: 90%">
                    <el-option-group
                      v-for="group in modelOptions"
                      :key="group.label"
                      :label="group.label">
                      <el-option
                        v-for="item in group.options"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"/>
                    </el-option-group>
                  </el-select>
                </el-form-item>
                <el-form-item label="解析方法" required>
                  <el-select v-model="knowledgeBaseForm.analyticMethod" style="width: 90%">
                    <el-option v-for="item in analyticMethodOptions"
                               :key="item.value" :label="item.label" :value="item.value"/>
                  </el-select>
                </el-form-item>
                <el-form-item label="页面排名">
                  <el-slider v-model="knowledgeBaseForm.pageRank" :max="100"
                             show-input style="width: 88%; margin-left: 2%"></el-slider>
                </el-form-item>
                <el-form-item label="自动关键词">
                  <el-slider v-model="knowledgeBaseForm.autoKeyWord" :max="30"
                             show-input style="width: 88%; margin-left: 2%"></el-slider>
                </el-form-item>
                <el-form-item label="自动问题">
                  <el-slider v-model="knowledgeBaseForm.autoQuestion" :max="10"
                             show-input style="width: 88%; margin-left: 2%"></el-slider>
                </el-form-item>
                <el-form-item label="块Token数">
                  <el-slider v-model="knowledgeBaseForm.tokenNum" :max="2048" :min="128"
                             show-input style="width: 88%; margin-left: 2%"></el-slider>
                </el-form-item>
                <el-form-item label="分段标识符" required>
                  <el-input v-model="knowledgeBaseForm.segmentIdentifier" style="width: 90%"/>
                </el-form-item>
                <el-form-item label="布局识别和OCR">
                  <el-select v-model="knowledgeBaseForm.layoutAndOCR" style="width: 90%">
                    <el-option v-for="item in layoutAndOCROptions"
                               :key="item.value" :label="item.label" :value="item.value"/>
                  </el-select>
                </el-form-item>
                <el-form-item label="表格转HTML">
                  <el-switch v-model="knowledgeBaseForm.isTableToHtml"/>
                </el-form-item>
                <el-form-item label="使用召回增强RAPTOR策略">
                  <el-switch v-model="knowledgeBaseForm.isRAPTOR"/>
                </el-form-item>
                <el-form-item v-if="knowledgeBaseForm.isRAPTOR === true" label="提示词"
                              required>
                  <el-input v-model="knowledgeBaseForm.RAPTORPrompt" :rows="5"
                            type="textarea"></el-input>
                </el-form-item>
                <el-card
                  style="width: 90%; display: flex; flex-direction: column; background-color: #FAFCFF; --el-card-padding: 5px">
                  <el-form-item label="提取知识图谱">
                    <el-switch v-model="knowledgeBaseForm.isGetKnowledgeMap"/>
                  </el-form-item>
                  <div v-if="knowledgeBaseForm.isGetKnowledgeMap === true">
                    <el-form-item label="实体类型" required>
                      <el-tag v-for="tag in knowledgeBaseForm.knowledgeMapCategory"
                              :key="tag"
                              closable style="margin-right: 5px" @close="knowledgeMapCategoryClose(tag)">
                        {{ tag }}
                      </el-tag>
                      <el-input v-if="inputVisible" ref="InputRef"
                                v-model="inputValue" size="small" style="width: 90%"
                                @blur="handleInputConfirm" @keyup.enter="handleInputConfirm"/>
                      <el-button v-else class="button-new-tag" size="small"
                                 @click="knowledgeMapCategoryShowInput()">
                        + New
                      </el-button>
                    </el-form-item>
                    <el-form-item label="方法">
                      <el-select v-model="knowledgeBaseForm.knowledgeMapMethod"
                                 style="width: 90%">
                        <el-option v-for="item in knowledgeMapMethodOptions"
                                   :key="item.value" :label="item.label" :value="item.value"/>
                      </el-select>
                    </el-form-item>
                    <el-form-item label="实体归一化">
                      <el-switch v-model="knowledgeBaseForm.knowledgeMapNormalize"/>
                    </el-form-item>
                    <el-form-item label="社区报告生成">
                      <el-switch v-model="knowledgeBaseForm.knowledgeMapReport"/>
                    </el-form-item>
                  </div>
                </el-card>
              </el-form>
              <div
                style="width: 100%; display: flex; justify-content: center; margin-top: 2rem">
                <el-button>取消</el-button>
                <el-button type="primary" @click="onSubmit">保存</el-button>
              </div>
            </div>
            <div style="width: 2%; display: flex">
              <el-divider direction="vertical" style="height: 100%"/>
            </div>
            <!--     右侧解释性文字     -->
            <div v-if="knowledgeBaseForm.analyticMethod === 0"
                 class="display-content">
              <b style="font-size: 18px">"General" 分块方法说明</b>
              <p>支持的文件格式为<b>DOCX、EXCEL、PPT、IMAGE、PDF、TXT、MD、JSON、EML、HTML。</b></p>
              <p>此方法将简单的方法应用于块文件：</p>
              <p>- 系统将使用视觉检测模型将连续文本分割成多个片段。</p>
              <p>- 接下来，这些连续的片段被合并成Token数不超过“Token数”的块。</p>
              <p style="font-size: 18px; margin-top: 1rem"><b>"General" 示例</b></p>
              <p>提出以下屏幕截图以促进理解。</p>
              <div style="display: flex; width: 100%">
                <img alt="pic"
                     src="../../assets/images/knowledge-general-1.svg" style="width: 49%; margin-right: 2%"/>
                <img alt="pic" src="../../assets/images/knowledge-general-2.svg"
                     style="width: 49%"/>
              </div>
              <b style="font-size: 18px; margin-top: 1rem">"General" 对话示例</b>
              <el-divider></el-divider>
            </div>
            <div v-else-if="knowledgeBaseForm.analyticMethod === 1"
                 class="display-content">
              <b style="font-size: 18px">"Q&A" 分块方法说明</b>
              <p>此块方法支持 <b>excel</b> 和 <b>csv/txt</b> 文件格式。</p>
              <p>- 如果文件是 <b>excel</b> 格式，则应由两个列组成 没有标题：一个提出问题，另一个用于答案，
                答案列之前的问题列。多张纸是 只要列正确结构，就可以接受。</p>
              <p>- 如果文件是 <b>csv/txt</b> 格式 以 UTF-8 编码且用 TAB 作分开问题和答案的定界符。
              </p>
              <p>未能遵循上述规则的文本行将被忽略，并且 每个问答对将被认为是一个独特的部分。</p>
              <p style="font-size: 18px; margin-top: 1rem"><b>"Q&A" 示例</b></p>
              <p>提出以下屏幕截图以促进理解。</p>
              <div style="display: flex; width: 100%">
                <img alt="pic"
                     src="../../assets/images/knowledge-q&a-1.svg" style="width: 49%; margin-right: 2%"/>
                <img alt="pic" src="../../assets/images/knowledge-q&a-2.svg"
                     style="width: 49%"/>
              </div>
              <b style="font-size: 18px; margin-top: 1rem">Q&A 对话示例</b>
              <el-divider></el-divider>
            </div>
            <div v-else
                 class="display-content">
              <b style="font-size: 18px">"Resume" 分块方法说明</b>
              <p>支持的文件格式为<b>DOCX、PDF、TXT。</b></p>
              <p>
                简历有多种格式，就像一个人的个性一样，但我们经常必须将它们组织成结构化数据，以便于搜索。</p>
              <p>我们不是将简历分块，而是将简历解析为结构化数据。 作为HR，你可以扔掉所有的简历，
                您只需与'RAGFlow'交谈即可列出所有符合资格的候选人。</p>
              <p style="font-size: 18px; margin-top: 1rem"><b>"Resume" 示例</b></p>
              <p>提出以下屏幕截图以促进理解。</p>
              <div style="display: flex; width: 100%">
                <img alt="pic"
                     src="../../assets/images/knowledge-resume-1.svg" style="width: 49%; margin-right: 2%"/>
                <img alt="pic" src="../../assets/images/knowledge-resume-2.svg"
                     style="width: 49%"/>
              </div>
              <b style="font-size: 18px; margin-top: 1rem">Resume 对话示例</b>
              <el-divider></el-divider>
            </div>
          </div>
        </div>

        <!-- 认知模型 Tab -->
        <div v-if="selectedCard === 3" style="display: flex; width: 100%; flex-direction: column;">
          <div class="section-title">专家文章认知模型提取</div>
          <div class="section-subtitle" style="margin-bottom: 16px;">
            <el-icon size="14" style="margin-right: 5px">
              <MagicStick/>
            </el-icon>
            AI 深度阅读文章，提取核心实体与因果认知模型
          </div>
          <el-divider class="content-divider"></el-divider>
          <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px;">
            <el-select v-model="cognitiveSelectedBook" placeholder="请选择要提取认知的书籍/文章"
                       style="width: 300px" @change="extractCognitiveModel(false)">
              <el-option v-for="item in filteredBooks" :key="item.name" :label="item.name"
                         :value="item.name"></el-option>
            </el-select>
            <el-button :disabled="!cognitiveSelectedBook" :loading="isExtractingCognitive"
                       type="primary" @click="extractCognitiveModel(true)">
              <el-icon style="margin-right: 5px;">
                <RefreshRight/>
              </el-icon>
              重新提取认知模型
            </el-button>
          </div>

          <div v-if="cognitiveModelData" style="display: flex; flex-direction: column; gap: 20px;">
            <!-- 上侧流程图 -->
            <div
              style="width: 100%; height: 560px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; background: #fff;">
              <div
                style="font-weight: 600; margin-bottom: 10px; color: #111827; display: flex; align-items: center; font-size: 15px;">
                <el-icon style="margin-right: 5px; color: #409eff;">
                  <Connection/>
                </el-icon>
                认知模型流程图谱
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">拖拽节点可微调布局
              </div>
              <div id="cognitiveChart" style="width: 100%; height: calc(100% - 30px);"></div>
            </div>

            <!-- 下侧Markdown解析 -->
            <div
              style="width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; background: #fff;">
              <div
                style="font-weight: 600; margin-bottom: 20px; color: #111827; display: flex; align-items: center; font-size: 15px;">
                <el-icon style="margin-right: 5px; color: #67c23a;">
                  <Document/>
                </el-icon>
                模型深度解析
              </div>
              <div class="cognitive-markdown" v-html="renderedCognitiveMarkdown"></div>
            </div>
          </div>
          <div v-else-if="isExtractingCognitive"
               style="height: 50vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6b7280; background: #f9fafb; border-radius: 12px; border: 1px dashed #d1d5db;">
            <el-icon class="is-loading" size="40" style="color: #409eff; margin-bottom: 20px;">
              <Loading/>
            </el-icon>
            <div style="font-size: 15px; font-weight: 500; color: #374151;">AI
              正在深度阅读文章，提取核心实体与因果认知模型...
            </div>
            <div style="font-size: 13px; margin-top: 10px;">此过程可能需要 15-30 秒</div>
          </div>
          <div v-else
               style="height: 50vh; display: flex; align-items: center; justify-content: center; background: #f9fafb; border-radius: 12px; border: 1px dashed #d1d5db;">
            <el-empty description="请选择上方文章并点击提取认知模型"/>
          </div>
        </div>

      </el-scrollbar>
    </div>
  </div>
  <!-- 上传弹窗 -->
  <el-dialog
    v-model="dialogVisible"
    align-center
    append-to-body
    :before-close="handleClose"
    class="book-upload-dialog compact-book-dialog"
    title="导入书籍"
    width="500px"
  >
    <el-form
      ref="bookForm"
      :model="bookForm"
      :rules="rules"
      class="book-dialog-form"
      label-width="100px"
    >
      <!-- 书籍名称 -->
      <el-form-item label="书籍名称" prop="bookName">
        <el-input
          v-model="bookForm.bookName"
          maxlength="100"
          placeholder="请输入书籍名称"
        ></el-input>
      </el-form-item>
      <!-- 元数据 -->
      <el-form-item label="元数据(可选)" prop="bookMeta">
        <el-input
          v-model="bookForm.bookMeta"
          placeholder='JSON格式，例如: {"author":"张三","year":2023}'
          rows="3"
          type="textarea"
        ></el-input>
        <div style="color: #606266; font-size: 12px; margin-top: 5px">
          可选填，需符合JSON格式
        </div>
      </el-form-item>
      <!-- 文件上传 -->
      <el-form-item label="书籍文件" prop="file">
        <el-upload
          ref="upload"
          :auto-upload="false"
          :multiple="true"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :show-file-list="true"
          accept=".pdf,.epub,.txt,.jpg,.jpeg,.png"
          action=""
        >
          <el-button size="small" type="primary">选择文件</el-button>
          <template v-slot:tip>
            <div class="el-upload__tip">
              支持上传PDF、EPUB、TXT等格式文件。如果是图片(JPG/PNG)，请按原文档顺序批量选择上传。
            </div>
          </template>
        </el-upload>
      </el-form-item>
    </el-form>
    <template v-slot:footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="submitForm">提交</el-button>
      </div>
    </template>
  </el-dialog>
  <!-- 重命名弹窗 -->
  <el-dialog
    v-model="renameDialogVisible"
    align-center
    append-to-body
    class="book-rename-dialog compact-book-dialog"
    title="重命名书籍"
    width="400px"
  >
    <el-form ref="renameForm" :model="renameForm" :rules="renameRules" class="book-dialog-form">
      <el-form-item label="原名称" prop="oldName">
        <el-input v-model="renameForm.oldName" disabled/>
      </el-form-item>
      <el-form-item label="新名称" prop="newName">
        <el-input
          v-model="renameForm.newName"
          placeholder="请输入新名称"
        />
      </el-form-item>
    </el-form>
    <template v-slot:footer>
      <div class="dialog-footer">
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRename">确定</el-button>
      </div>
    </template>
  </el-dialog>
  <!-- 索引查看弹窗 -->
  <el-dialog
    v-model="indexDialogVisible"
    class="modern-tree-dialog"
    custom-class="modern-tree-dialog"
    title="书籍骨架目录树"
    top="3.5vh"
    width="90%"
    @opened="initTreeChart"
  >
    <template #header>
      <div class="tree-dialog-header">
        <span class="tree-dialog-title">书籍骨架目录树</span>
        <el-radio-group
          v-model="treeViewMode"
          class="tree-view-switch"
          @change="handleTreeViewChange"
        >
          <el-radio-button label="visual">可视化大纲</el-radio-button>
          <el-radio-button label="text">文本模式</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <div class="tree-toolbar">
      <div class="tree-toolbar-left">
        <el-input v-model="treeUpdateInstruction"
                  placeholder="输入自然语言指令(如: 合并第一章和第二章)"></el-input>
        <el-button
          :loading="isUpdatingTree"
          class="tree-rebuild-button"
          type="primary"
          @click="handleUpdateTree"
        >
          重建目录树
        </el-button>
      </div>
    </div>

    <div v-show="treeViewMode === 'visual'" class="tree-chart-wrap">
      <div class="tree-chart-tip">提示：按住左键拖动画布，点击节点可展开/收起。</div>
      <div ref="treeModeChartRef" :style="{ height: `${treeChartCanvasHeight}px` }"
           class="tree-chart-canvas"></div>
    </div>
    <div v-show="treeViewMode === 'text'" class="tree-text-panel">
      <el-tree
        :data="bookIndexData"
        :default-expand-all="false"
        :props="defaultProps"
        class="tree-text-view"
      >
        <template #default="{ node, data }">
            <span class="custom-tree-node">
              <span class="tree-node-title">{{ node.label }}</span>
              <span v-if="data.summary" class="tree-node-summary">
                摘要: {{ data.summary }}
              </span>
            </span>
        </template>
      </el-tree>
    </div>
  </el-dialog>
  <!-- 书籍查询弹窗 -->
  <el-dialog
    v-model="queryDialogVisible"
    :close-on-click-modal="true"
    align-center
    append-to-body
    class="book-query-dialog compact-book-dialog"
    title="书籍查询"
    width="600px"
  >
    <div v-if="currentBook" class="book-query-content">
      <p class="book-query-target">查询书籍: {{ currentBook.name }}</p>

      <el-input
        v-model="userQuery"
        :rows="4"
        placeholder="请输入您的问题..."
        style="margin-bottom: 10px;"
        type="textarea"
      ></el-input>

      <!-- 查询结果展示区域 -->
      <div v-if="queryResult"
           class="book-query-result">
        <h4 class="book-query-result-title">查询结果</h4>
        <div class="query-answer">
          {{ queryResult.content }}
        </div>

        <div v-if="queryResult.original_text" class="query-source">
          <h5 class="book-query-source-title">引用原文:</h5>
          <div class="book-query-source-text">
            {{ queryResult.original_text }}
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="queryDialogVisible = false">取消</el-button>
      <el-button
        :disabled="!userQuery.trim()"
        :loading="isQuerying"
        type="primary"
        @click="sendQuery"
      >
        发送查询
      </el-button>
    </template>
  </el-dialog>
  <!-- 分类编辑弹窗 -->
  <el-dialog
    v-model="categoryDialogVisible"
    align-center
    append-to-body
    center
    class="category-edit-dialog compact-book-dialog"
    title="编辑分类"
    width="500px"
  >
    <div class="category-dialog">
      <div class="dialog-header">
        <span class="book-name">{{ currentBookForCategory?.name }}</span>
      </div>
      <div class="category-selection">
        <div class="selection-title">请选择分类（可多选）</div>
        <el-checkbox-group v-model="selectedCategories" class="category-checkbox-group">
          <el-checkbox
            v-for="category in categoryOptions"
            :key="category.value"
            :label="category.label"
            class="category-checkbox"
          >
            {{ category.label }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>
    <template v-slot:footer>
      <div class="dialog-footer">
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCategoryUpdate">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import {
  Aim,
  Check,
  Coin,
  Collection,
  Connection,
  Delete,
  Document,
  Download,
  Edit,
  FolderOpened,
  Grid,
  HelpFilled,
  House,
  Loading,
  MagicStick,
  MoreFilled,
  Notebook,
  PictureFilled,
  Plus,
  Rank,
  Refresh,
  RefreshRight,
  Search,
  Setting,
  Shop,
  User
} from "@element-plus/icons-vue";
import {nextTick} from "vue";
import axios from 'axios'
import * as echarts from 'echarts'
import {marked} from 'marked';
import Sortable from 'sortablejs'
import { reorderBooks } from '@/api/powerGame/books'

export default {
  name: "PowerGame_KnowledgeCreate",
  props: {
    standalone: { type: Boolean, default: false }
  },
  components: {
    Edit,
    Delete,
    Download,
    Search,
    Shop,
    Plus,
    House,
    Setting,
    Aim,
    Coin,
    Check,
    Refresh,
    FolderOpened,
    HelpFilled,
    Collection,
    Connection,
    Document,
    Notebook,
    PictureFilled,
    User,
    Grid,
    MagicStick,
    MoreFilled,
    Loading,
    Rank,
    RefreshRight
  },
  setup() {
  },
  data() {
    return {
      cognitiveSelectedBook: '',
      isExtractingCognitive: false,
      cognitiveModelData: null,
      renderedCognitiveMarkdown: '',
      cognitiveChartInstance: null,
      cognitiveResizeHandler: null,
      knowledgeBaseName: '大国博弈',
      knowledgeBaseForm: {
        name: '',
        img: '',
        description: '',
        language: 0,
        authority: '0',
        model: 0,
        analyticMethod: 0,
        pageRank: 0,
        autoKeyWord: 0,
        autoQuestion: 0,
        tokenNum: 0,
        segmentIdentifier: '\\n!?;。；！？',
        layoutAndOCR: 0,
        isTableToHtml: false,
        isRAPTOR: false,
        RAPTORPrompt: '请总结以下段落。 小心数字，不要编造。 段落如下：\n' +
          '      {cluster_content}\n' +
          '以上就是你需要总结的内容。',
        isGetKnowledgeMap: false,
        knowledgeMapCategory: ['organization', 'person', 'geo', 'event', 'category'],
        knowledgeMapMethod: 0,
        knowledgeMapNormalize: false,
        knowledgeMapReport: false,
      },
      languageOptions: [
        {label: '简体中文', value: 0},
        {label: '英文', value: 1},
      ],
      modelOptions: [
        {
          label: 'BAAI',
          options: [
            {value: 0, label: 'BAAI/bge-large-zh-v1.5'},
          ],
        },
        {
          label: 'FastEmbed',
          options: [
            {value: 1, label: 'BAAI/bge-base-en-v1.5'},
            {value: 2, label: 'BAAI/bge-large-en-v1.5'},
            {value: 3, label: 'BAAI/bge-small-en-v1.5'},
            {value: 4, label: 'BAAI/bge-small-zh-v1.5'},
            {value: 5, label: 'jinnaai/jina-embeddings-v2-base-en'},
            {value: 6, label: 'jinnaai/jina-embeddings-v2-small-en'},
            {value: 7, label: 'nomic-ai/nomic-embed-text-v1.5'},
            {value: 7, label: 'sentence-transformers/all-MiniLM-L6-v2'},
          ],
        },
        {
          label: 'youdao',
          options: [
            {value: 5, label: 'maidalun1020/bce-embedding-base_v1'},
          ],
        },

      ],
      analyticMethodOptions: [
        {label: 'General', value: 0},
        {label: 'Q&A', value: 1},
        {label: 'Resume', value: 2},
        {label: 'Manual', value: 3},
        {label: 'Table', value: 4},
        {label: 'Paper', value: 5},
        {label: 'Book', value: 6},
        {label: 'Laws', value: 7},
        {label: 'Presentation', value: 8},
        {label: 'One', value: 9},
        {label: 'Tag', value: 10},
      ],
      layoutAndOCROptions: [
        {label: 'DeepDoc', value: 0},
        {label: 'Plain Text', value: 1},
      ],
      knowledgeMapMethodOptions: [
        {label: 'Light', value: 0},
        {label: 'General', value: 1},
      ],
      inputVisible: false,
      inputValue: '',
      selectedCard: 0,
      itemCard: [
        {icon: Coin, name: '专家文档库'},
        {icon: Aim, name: '知识库详情'},
        {icon: Setting, name: '配置'},
        {icon: Grid, name: '认知模型'},
      ],
      datasetData: [
        {
          name: '肯尼迪传：权力的代价',
          blockNum: '1',
          date: '2025-03-04',
          analysisMethod: 'Picture',
          isRun: true,
          analysisState: 0,
          action: 1
        },
        {
          name: '危险的岁月：肯尼迪与古巴导弹危机',
          blockNum: '3',
          date: '2025-03-05',
          analysisMethod: 'Picture',
          isRun: false,
          analysisState: 1,
          action: 2
        },
        {
          name: '剑与盾：苏联情报机构的秘密历史',
          blockNum: '3',
          date: '2025-03-05',
          analysisMethod: 'Picture',
          isRun: false,
          analysisState: 1,
          action: 2
        },
        {
          name: '古巴导弹危机会议记录',
          blockNum: '3',
          date: '2025-03-05',
          analysisMethod: 'Picture',
          isRun: false,
          analysisState: 1,
          action: 2
        },
      ],
      filterTableData: this.datasetData,
      docNameSearch: '',
      retrievalTest: {
        similarityThreshold: 0.2,
        keywordSimilarityWeight: 0.7,
        rerankModel: '',
        isUseKnowledgeMap: false,
        testText: '',
      },
      rerankOptions: [
        {
          label: 'BAAI',
          options: [
            {value: 0, label: 'BAAI/bge-rerank-v2-m3'},
          ],
        },
        {
          label: 'youdao',
          options: [
            {value: 1, label: 'maidalun1020/bge-rerank-base_v1'},
          ],
        },
      ],
      dialogVisible: false,
      bookForm: {
        bookName: '',
        bookMeta: '',
        files: []  // 存储选中的所有文件对象，支持多文件(如多张图片)
      },
      rules: {
        bookName: [
          {required: true, message: '请输入书籍名称', trigger: 'blur'}
        ],
        file: [
          {
            required: true,
            validator: (rule, value, callback) => {
              if (this.bookForm.files.length === 0) {
                callback(new Error('请选择书籍文件'));
              } else {
                callback();
              }
            },
            trigger: 'change'
          }
        ]
      },
      filteredData: [], // 表格数据源
      categoryFilter: '', // 当前选择的分类筛选条件
      sortableInstance: null, // SortableJS 实例引用
      sortSaving: false, // 是否正在保存排序
      renameDialogVisible: false, // 弹窗显示状态
      renameForm: {
        oldName: '', // 原书籍名称
        newName: ''  // 新书籍名称
      },
      // 表单验证规则
      renameRules: {
        newName: [
          {required: true, message: '请输入新名称', trigger: 'blur'},
          {min: 1, max: 50, message: '名称长度在 1 到 50 个字符', trigger: 'blur'}
        ]
      },
      indexDialogVisible: false,
      bookIndex: '',
      treeViewMode: 'visual',
      treeChartInstance: null,
      treeResizeHandler: null,
      treeChartCanvasHeight: 640,
      bookIndexData: [],
      treeUpdateInstruction: '',
      isUpdatingTree: false,
      defaultProps: {
        children: 'subsections',
        label: 'title'
      },
      currentBookForTree: null,
      progressInterval: null, // 进度查询定时器
      queryDialogVisible: false, // 查询弹窗显示状态
      currentBook: null, // 当前查询的书籍
      userQuery: '', // 用户输入的查询内容
      isQuerying: false, // 查询加载状态
      queryResult: null, // 查询结果
      // 分类编辑相关
      categoryDialogVisible: false, // 分类编辑弹窗显示状态
      currentBookForCategory: null, // 当前编辑分类的书籍
      selectedCategories: [], // 选中的分类列表
      categoryOptions: [ // 预设分类选项（只保留原有的分类）
        {label: '场景设定', value: 'scene'},
        {label: '态势建模', value: 'situation'},
        {label: '主体建模', value: 'subject'},
        {label: '其他', value: 'other'}
      ],
      // 知识库详情相关
      knowledgeActiveTab: 'subject',
      knowledgeViewMode: 'graph',
      selectedKnowledgeIndex: null,
      knowledgeGraphInstance: null,
      // 知识库模拟数据
      knowledgeBaseData: {
        subject: [
          {
            name: '古巴导弹危机档案',
            description: '收录古巴导弹危机期间的重要历史文献、决策记录和情报分析报告，为Agent提供危机情境理解能力。',
            docCount: 28,
            chunkCount: 1256,
            entityCount: 342,
            relationCount: 876,
            updateTime: '2024-01-15',
            enabled: true,
            documents: [
              {
                name: '肯尼迪总统演讲稿',
                type: 'TXT',
                chunks: 45,
                status: '已解析',
                uploadTime: '2024-01-10'
              },
              {
                name: '赫鲁晓夫信函集',
                type: 'PDF',
                chunks: 89,
                status: '已解析',
                uploadTime: '2024-01-11'
              },
              {
                name: 'ExComm会议纪要',
                type: 'DOCX',
                chunks: 156,
                status: '已解析',
                uploadTime: '2024-01-12'
              },
              {
                name: 'CIA情报评估报告',
                type: 'PDF',
                chunks: 234,
                status: '已解析',
                uploadTime: '2024-01-13'
              },
              {
                name: '联合国安理会记录',
                type: 'PDF',
                chunks: 178,
                status: '解析中',
                uploadTime: '2024-01-14'
              },
            ],
            entityCategories: {
              person: {
                name: '人物',
                count: 45,
                entities: ['约翰·肯尼迪', '尼基塔·赫鲁晓夫', '菲德尔·卡斯特罗', '罗伯特·肯尼迪', '麦克纳马拉', '迪安·腊斯克', '安纳托利·多勃雷宁', '阿德莱·史蒂文森', '柯蒂斯·李梅', '约翰·麦科恩']
              },
              org: {
                name: '组织',
                count: 28,
                entities: ['美国国家安全委员会', 'ExComm', 'CIA', 'KGB', '苏联共产党中央', '古巴革命政府', '联合国安理会', 'NATO', '华约组织']
              },
              event: {
                name: '事件',
                count: 35,
                entities: ['海上封锁', 'U-2侦察', '空袭计划', '入侵古巴方案', '秘密谈判', '导弹部署', '柏林危机', '猪湾事件']
              },
              location: {
                name: '地点',
                count: 22,
                entities: ['古巴', '华盛顿', '莫斯科', '圣克里斯托瓦尔', '关塔那摩', '佛罗里达', '土耳其', '柏林']
              },
            },
            graphData: {
              nodes: [
                {name: '古巴导弹危机', symbolSize: 60, category: 0},
                {name: '约翰·肯尼迪', symbolSize: 45, category: 1},
                {name: '赫鲁晓夫', symbolSize: 45, category: 1},
                {name: '卡斯特罗', symbolSize: 40, category: 1},
                {name: 'ExComm', symbolSize: 35, category: 2},
                {name: 'CIA', symbolSize: 30, category: 2},
                {name: '海上封锁', symbolSize: 35, category: 3},
                {name: 'U-2侦察', symbolSize: 30, category: 3},
                {name: '导弹部署', symbolSize: 35, category: 3},
                {name: '古巴', symbolSize: 40, category: 4},
                {name: '苏联', symbolSize: 40, category: 4},
                {name: '美国', symbolSize: 40, category: 4},
              ],
              links: [
                {source: '约翰·肯尼迪', target: '古巴导弹危机', value: '主导应对'},
                {source: '赫鲁晓夫', target: '古巴导弹危机', value: '触发危机'},
                {source: '卡斯特罗', target: '导弹部署', value: '同意部署'},
                {source: 'ExComm', target: '海上封锁', value: '建议采取'},
                {source: 'CIA', target: 'U-2侦察', value: '执行'},
                {source: '约翰·肯尼迪', target: 'ExComm', value: '召集'},
                {source: '古巴', target: '导弹部署', value: '发生地'},
                {source: '苏联', target: '导弹部署', value: '实施'},
                {source: '美国', target: '海上封锁', value: '实施'},
                {source: '赫鲁晓夫', target: '苏联', value: '领导'},
                {source: '约翰·肯尼迪', target: '美国', value: '领导'},
              ],
              categories: [
                {name: '核心事件'},
                {name: '关键人物'},
                {name: '组织机构'},
                {name: '重要行动'},
                {name: '相关国家'},
              ]
            }
          },
          {
            name: '美苏领导人画像',
            description: '美苏两国主要领导人的性格特征、决策风格和历史背景分析，帮助Agent理解领导人行为模式。',
            docCount: 15,
            chunkCount: 678,
            entityCount: 156,
            relationCount: 423,
            updateTime: '2024-01-12',
            enabled: true,
            documents: [
              {
                name: '肯尼迪传记摘要',
                type: 'PDF',
                chunks: 120,
                status: '已解析',
                uploadTime: '2024-01-08'
              },
              {
                name: '赫鲁晓夫回忆录',
                type: 'PDF',
                chunks: 230,
                status: '已解析',
                uploadTime: '2024-01-09'
              },
              {
                name: '领导人性格分析',
                type: 'DOCX',
                chunks: 85,
                status: '已解析',
                uploadTime: '2024-01-10'
              },
            ],
            entityCategories: {
              person: {
                name: '人物',
                count: 32,
                entities: ['约翰·肯尼迪', '赫鲁晓夫', '艾森豪威尔', '杜鲁门', '斯大林']
              },
              trait: {
                name: '性格特征',
                count: 18,
                entities: ['谨慎', '冒险', '理性', '强硬', '灵活']
              },
            },
            graphData: {
              nodes: [
                {name: '肯尼迪', symbolSize: 50, category: 0},
                {name: '赫鲁晓夫', symbolSize: 50, category: 0},
                {name: '谨慎决策', symbolSize: 30, category: 1},
                {name: '冒险倾向', symbolSize: 30, category: 1},
              ],
              links: [
                {source: '肯尼迪', target: '谨慎决策', value: '具有'},
                {source: '赫鲁晓夫', target: '冒险倾向', value: '具有'},
              ],
              categories: [{name: '领导人'}, {name: '特征'}]
            }
          },
        ],
        environment: [
          {
            name: '冷战国际关系',
            description: '冷战时期国际关系格局、两极对抗态势和地缘政治环境信息。',
            docCount: 22,
            chunkCount: 980,
            entityCount: 245,
            relationCount: 612,
            updateTime: '2024-01-14',
            enabled: true,
            documents: [
              {
                name: '冷战编年史',
                type: 'PDF',
                chunks: 320,
                status: '已解析',
                uploadTime: '2024-01-05'
              },
              {
                name: '两极格局分析',
                type: 'DOCX',
                chunks: 180,
                status: '已解析',
                uploadTime: '2024-01-06'
              },
            ],
            entityCategories: {
              alliance: {
                name: '同盟',
                count: 8,
                entities: ['NATO', '华约', '美洲国家组织', '东南亚条约组织']
              },
              country: {
                name: '国家',
                count: 45,
                entities: ['美国', '苏联', '英国', '法国', '古巴', '土耳其']
              },
            },
            graphData: {
              nodes: [
                {name: '美国阵营', symbolSize: 50, category: 0},
                {name: '苏联阵营', symbolSize: 50, category: 0},
              ],
              links: [{source: '美国阵营', target: '苏联阵营', value: '对抗'}],
              categories: [{name: '阵营'}]
            }
          },
        ],
        rules: [
          {
            name: '核威慑博弈规则',
            description: '核时代大国博弈的基本规则、相互确保毁灭原则和升级控制机制。',
            docCount: 8,
            chunkCount: 456,
            entityCount: 89,
            relationCount: 234,
            updateTime: '2024-01-13',
            enabled: true,
            documents: [
              {
                name: 'MAD理论文献',
                type: 'PDF',
                chunks: 156,
                status: '已解析',
                uploadTime: '2024-01-01'
              },
              {
                name: '升级阶梯模型',
                type: 'DOCX',
                chunks: 78,
                status: '已解析',
                uploadTime: '2024-01-02'
              },
            ],
            entityCategories: {
              concept: {
                name: '概念',
                count: 15,
                entities: ['相互确保毁灭', '第一次打击', '第二次打击能力', '核门槛']
              },
              strategy: {
                name: '策略',
                count: 12,
                entities: ['威慑', '遏制', '升级控制', '灵活反应']
              },
            },
            graphData: {
              nodes: [
                {name: 'MAD', symbolSize: 50, category: 0},
                {name: '威慑', symbolSize: 40, category: 1},
              ],
              links: [{source: 'MAD', target: '威慑', value: '基于'}],
              categories: [{name: '原则'}, {name: '策略'}]
            }
          },
        ]
      },
    }
  },
  computed: {
    // 当前分类下的知识库列表
    currentKnowledgeList() {
      return this.knowledgeBaseData[this.knowledgeActiveTab] || [];
    },
    // 当前选中的知识库数据
    selectedKnowledgeData() {
      if (this.selectedKnowledgeIndex === null) return null;
      return this.currentKnowledgeList[this.selectedKnowledgeIndex] || null;
    },
    isBookListFiltered() {
      return Boolean(this.categoryFilter || String(this.docNameSearch || '').trim());
    },
    // 根据分类筛选后的书籍列表
    filteredBooks() {
      const keyword = String(this.docNameSearch || '').trim().toLowerCase();
      return this.filteredData.filter(book => {
        const matchCategory = !this.categoryFilter || (book.categories && book.categories.includes(this.categoryFilter));
        if (!matchCategory) return false;
        if (!keyword) return true;
        const searchable = [
          book.name,
          book.date,
          ...(Array.isArray(book.categories) ? book.categories : [])
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(keyword);
      });
    }
  },
  watch: {
    knowledgeActiveTab() {
      this.selectedKnowledgeIndex = null;
    },
    knowledgeViewMode(newMode) {
      if (newMode === 'graph' && this.selectedKnowledgeData) {
        this.$nextTick(() => this.initKnowledgeGraph());
      }
    },
    categoryFilter() {
      // 筛选变化后重初始化 Sortable（启用或禁用拖拽）
      this.$nextTick(() => this.initSortable())
    },
    docNameSearch() {
      this.$nextTick(() => this.initSortable())
    }
  },
  created() {
    if (this.standalone) {
      this.selectedCard = 0
    }
    // 页面加载时调用接口获取书籍列表
    this.fetchBookList();
  },
  mounted() {
    // 等数据加载完毕 DOM 渲染后初始化 Sortable
    // initSortable 会在 fetchBookList 完成后由 $nextTick 触发
  },
  methods: {
    // 认知模型提取相关方法
    extractCognitiveModel(forceRefresh = false) {
      if (!this.cognitiveSelectedBook) {
        this.$message.warning('请先选择一本书籍/文章');
        return;
      }
      this.isExtractingCognitive = true;
      if (forceRefresh) {
        this.cognitiveModelData = null;
        this.renderedCognitiveMarkdown = '';
      }

      axios.get('/api/domain/book/cognitiveModel', {
        params: {book_name: this.cognitiveSelectedBook, force_refresh: forceRefresh}
      }).then(res => {
        this.isExtractingCognitive = false;
        if (res.data.success) {
          this.cognitiveModelData = res.data.data;
          if (this.cognitiveModelData.markdown_explanation) {
            this.renderedCognitiveMarkdown = marked.parse(this.cognitiveModelData.markdown_explanation);
          }
          this.$nextTick(() => {
            this.renderCognitiveChart();
          });
          if (forceRefresh) {
            this.$message.success('已重新提取并保存认知模型');
          }
        } else {
          this.$message.error('提取失败: ' + res.data.message);
        }
      }).catch(err => {
        this.isExtractingCognitive = false;
        this.$message.error('网络请求错误');
      });
    },
    renderCognitiveChart() {
      const chartDom = document.getElementById('cognitiveChart');
      if (!chartDom || !this.cognitiveModelData) return;

      if (this.cognitiveChartInstance) {
        this.cognitiveChartInstance.dispose();
      }
      this.cognitiveChartInstance = echarts.init(chartDom);

      const rawNodes = Array.isArray(this.cognitiveModelData.nodes) ? this.cognitiveModelData.nodes : [];
      const rawLinks = Array.isArray(this.cognitiveModelData.links) ? this.cognitiveModelData.links : [];

      const categoryMetaMap = new Map();
      const categoryOrder = [];
      rawNodes.forEach((node) => {
        const key = String(node.category ?? node.type ?? node.category_name ?? node.category_label ?? '未分类');
        if (!categoryMetaMap.has(key)) {
          const readableName = String(node.category_name || node.category_label || node.type || node.category || '未分类');
          categoryMetaMap.set(key, readableName);
          categoryOrder.push(key);
        }
      });

      const categoryColorPalette = [
        '#2563eb', '#7c3aed', '#0891b2', '#d946ef', '#16a34a', '#ea580c', '#0f766e', '#e11d48'
      ];
      const categorySymbolPalette = ['circle', 'roundRect', 'diamond', 'triangle', 'pin', 'rect'];

      const categories = categoryOrder.map((key, idx) => ({
        name: categoryMetaMap.get(key),
        itemStyle: {color: categoryColorPalette[idx % categoryColorPalette.length]}
      }));

      const degreeMap = {};
      rawLinks.forEach((link) => {
        const s = String(link.source);
        const t = String(link.target);
        degreeMap[s] = (degreeMap[s] || 0) + 1;
        degreeMap[t] = (degreeMap[t] || 0) + 1;
      });

      const nodes = rawNodes.map((node) => {
        const key = String(node.category ?? node.type ?? node.category_name ?? node.category_label ?? '未分类');
        const categoryIndex = Math.max(0, categoryOrder.indexOf(key));
        const nodeId = String(node.id || node.name || `node_${Math.random().toString(36).slice(2)}`);
        const degree = degreeMap[nodeId] || 1;
        const color = categoryColorPalette[categoryIndex % categoryColorPalette.length];
        return {
          name: node.name || nodeId,
          id: nodeId,
          category: categoryIndex,
          symbol: categorySymbolPalette[categoryIndex % categorySymbolPalette.length],
          symbolSize: Math.min(78, Math.max(40, 34 + degree * 5)),
          draggable: true,
          itemStyle: {
            color,
            shadowBlur: 18,
            shadowColor: `${color}88`,
            borderColor: '#ffffff',
            borderWidth: 2
          },
          label: {
            show: true,
            color: '#0f172a',
            fontSize: 12,
            formatter: '{b}',
            backgroundColor: 'rgba(255,255,255,0.86)',
            borderRadius: 6,
            padding: [3, 6]
          }
        };
      });

      const links = rawLinks.map((link, index) => ({
        source: String(link.source),
        target: String(link.target),
        value: link.label || link.value || '',
        lineStyle: {
          width: 1.8 + (index % 3) * 0.45,
          curveness: 0.12 + (index % 4) * 0.05,
          opacity: 0.72
        },
        label: {
          show: true,
          formatter: '{c}',
          fontSize: 11,
          color: '#334155',
          backgroundColor: 'rgba(255,255,255,0.72)',
          borderRadius: 4,
          padding: [1, 4]
        }
      }));

      const legendNameToCategoryIndex = new Map();
      categories.forEach((item, idx) => {
        legendNameToCategoryIndex.set(item.name, idx);
      });

      const nodeIndexById = new Map();
      const nodeIndexByName = new Map();
      const nodeCategoryByIndex = new Map();
      const nodeIndicesByCategory = new Map();
      nodes.forEach((node, idx) => {
        nodeIndexById.set(String(node.id), idx);
        nodeIndexByName.set(String(node.name), idx);
        nodeCategoryByIndex.set(idx, node.category);
        if (!nodeIndicesByCategory.has(node.category)) {
          nodeIndicesByCategory.set(node.category, []);
        }
        nodeIndicesByCategory.get(node.category).push(idx);
      });

      const edgeIndicesByCategory = new Map();
      links.forEach((link, edgeIdx) => {
        const sourceIdx = nodeIndexById.get(String(link.source)) ?? nodeIndexByName.get(String(link.source));
        const targetIdx = nodeIndexById.get(String(link.target)) ?? nodeIndexByName.get(String(link.target));
        const categoryIndex = sourceIdx !== undefined
          ? nodeCategoryByIndex.get(sourceIdx)
          : nodeCategoryByIndex.get(targetIdx);
        if (categoryIndex === undefined) return;
        if (!edgeIndicesByCategory.has(categoryIndex)) {
          edgeIndicesByCategory.set(categoryIndex, []);
        }
        edgeIndicesByCategory.get(categoryIndex).push(edgeIdx);
      });

      const option = {
        backgroundColor: '#ffffff',
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            if (params.dataType === 'node') {
              const categoryName = categories[params.data.category]?.name || '未分类';
              return `<b>${params.data.name}</b><br/>类别：${categoryName}`;
            }
            return `<b>${params.data.source}</b> → <b>${params.data.target}</b><br/>关系：${params.data.value || '关联'}`;
          }
        },
        legend: [{
          type: 'scroll',
          data: categories.map((item) => item.name),
          top: 8,
          left: 20,
          right: 20,
          orient: 'horizontal',
          selectedMode: true,
          textStyle: {color: '#334155', fontSize: 12}
        }],
        animationDuration: 1700,
        animationEasing: 'elasticOut',
        animationDurationUpdate: 1300,
        animationEasingUpdate: 'quarticInOut',
        series: [
          {
            type: 'graph',
            layout: 'force',
            top: 72,
            left: 12,
            right: 12,
            bottom: 10,
            data: nodes,
            links,
            categories,
            roam: true,
            draggable: true,
            focusNodeAdjacency: false,
            edgeSymbol: ['none', 'arrow'],
            edgeSymbolSize: [0, 10],
            lineStyle: {
              color: '#94a3b8',
              curveness: 0.25
            },
            emphasis: {
              scale: true,
              focus: 'none',
              lineStyle: {
                width: 5,
                opacity: 1
              }
            },
            force: {
              repulsion: 980,
              gravity: 0.07,
              edgeLength: [180, 270],
              friction: 0.16,
              layoutAnimation: true
            }
          }
        ]
      };

      this.cognitiveChartInstance.setOption(option, true);

      const resetLegendHoverHighlight = () => {
        this.cognitiveChartInstance.dispatchAction({
          type: 'downplay',
          seriesIndex: 0
        });
      };

      const highlightLegendCategory = (legendName) => {
        const categoryIndex = legendNameToCategoryIndex.get(legendName);
        if (categoryIndex === undefined) return;

        const targetNodeIndices = nodeIndicesByCategory.get(categoryIndex) || [];
        const targetEdgeIndices = edgeIndicesByCategory.get(categoryIndex) || [];

        this.cognitiveChartInstance.dispatchAction({
          type: 'downplay',
          seriesIndex: 0
        });

        targetNodeIndices.forEach((dataIndex) => {
          this.cognitiveChartInstance.dispatchAction({
            type: 'highlight',
            seriesIndex: 0,
            dataType: 'node',
            dataIndex
          });
        });

        targetEdgeIndices.forEach((dataIndex) => {
          this.cognitiveChartInstance.dispatchAction({
            type: 'highlight',
            seriesIndex: 0,
            dataType: 'edge',
            dataIndex
          });
        });
      };

      this.cognitiveChartInstance.off('mouseover');
      this.cognitiveChartInstance.off('mouseout');
      this.cognitiveChartInstance.off('globalout');

      this.cognitiveChartInstance.on('mouseover', (params) => {
        if (params.componentType === 'legend') {
          highlightLegendCategory(params.name);
        }
      });

      this.cognitiveChartInstance.on('mouseout', (params) => {
        if (params.componentType === 'legend') {
          resetLegendHoverHighlight();
        }
      });

      this.cognitiveChartInstance.on('globalout', () => {
        resetLegendHoverHighlight();
      });

      if (this.cognitiveResizeHandler) {
        window.removeEventListener('resize', this.cognitiveResizeHandler);
      }
      this.cognitiveResizeHandler = () => {
        if (this.cognitiveChartInstance) {
          this.cognitiveChartInstance.resize();
        }
      };
      window.addEventListener('resize', this.cognitiveResizeHandler);
    },

    // 知识库详情相关方法
    selectKnowledge(index) {
      this.selectedKnowledgeIndex = index;
      // 切换到图谱视图时初始化图表
      this.$nextTick(() => {
        if (this.knowledgeViewMode === 'graph') {
          this.initKnowledgeGraph();
        }
      });
    },
    initKnowledgeGraph() {
      if (!this.$refs.knowledgeGraphRef || !this.selectedKnowledgeData?.graphData) return;

      if (this.knowledgeGraphInstance) {
        this.knowledgeGraphInstance.dispose();
      }

      this.knowledgeGraphInstance = echarts.init(this.$refs.knowledgeGraphRef);
      const graphData = this.selectedKnowledgeData.graphData;

      this.knowledgeGraphInstance.setOption({
        tooltip: {},
        legend: {
          data: graphData.categories.map(c => c.name),
          orient: 'vertical',
          right: 10,
          top: 20,
        },
        series: [{
          type: 'graph',
          layout: 'force',
          data: graphData.nodes,
          links: graphData.links,
          categories: graphData.categories,
          roam: true,
          draggable: true,
          label: {
            show: true,
            position: 'right',
            fontSize: 12,
          },
          force: {
            repulsion: 200,
            edgeLength: 120,
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3,
          },
          edgeLabel: {
            show: true,
            fontSize: 10,
            formatter: (params) => params.data.value || '',
          }
        }]
      });
    },
    knowledgeMapCategoryClose(tag) {
      this.knowledgeBaseForm.knowledgeMapCategory.splice(this.knowledgeBaseForm.knowledgeMapCategory.indexOf(tag), 1)
    },
    knowledgeMapCategoryShowInput() {
      this.inputVisible = true;
      nextTick(() => {
        this.$refs.InputRef.focus();
      })
    },
    handleInputConfirm() {
      if (this.inputValue) {
        this.knowledgeBaseForm.knowledgeMapCategory.push(this.inputValue)
      }
      this.inputVisible = false;
      this.inputValue = ''
    },
    itemCardClick(index) {
      this.selectedCard = index;
    },

    //---------书籍上传相关---------
    // 获取书籍列表
    async fetchBookList() {
      try {
        const response = await axios.get('/api/domain/book/list');
        if (response.data.success) {
          // 将后端返回的书籍列表赋值给表格数据源
          this.filteredData = response.data.message.map(item => {
            const parseProgress = Number(item.parse_progress ?? 0);
            const treeProgress = Number(item.tree_progress ?? 0);
            const parsePercentage = Math.round(parseProgress * 100);
            const treePercentage = Math.round(treeProgress * 100);
            const isInProgress = this.isBookAnalysing(item);
            const hasUnfinishedProgress = (parseProgress > 0 || treeProgress > 0) && !(parseProgress >= 1 && treeProgress >= 1);
            return {
              ...item,
              name: item.book_name,
              date: String(item.upload_date || '').split(' ')[0],
              showProgress: isInProgress || (hasUnfinishedProgress && item.status !== 'interrupted'),
              parsePercentage,
              treePercentage,
              cancelRequested: !!item.cancel_requested,
              parseEtaSeconds: Number.isFinite(Number(item.parse_eta_seconds)) ? Number(item.parse_eta_seconds) : null,
              ocrProgress: {parse: parseProgress, tree: treeProgress}
            }
          });

          // 数据加载完毕后初始化拖拽排序
          this.$nextTick(() => this.initSortable())

          if (this.filteredData.some(b => b.status === 'analysing' || b.status === '目录重建' || b.showProgress)) {
            this.startGlobalProgressQuery();
          }
        } else {
          this.$message.error('获取书籍列表失败');
        }
      } catch (error) {
        console.error('请求失败:', error);
        this.$message.error('网络错误，无法获取书籍列表');
      }
    },
    // ---------- 书籍拖拽排序 ----------
    handleDocumentTableWheel(event) {
      if (!this.standalone || this.selectedCard !== 0) return;
      event.preventDefault();
      const tableRef = this.$refs.bookTableRef;
      const tableRoot = tableRef?.$el;
      const scrollWrap = tableRoot?.querySelector('.el-table__body-wrapper .el-scrollbar__wrap')
        || tableRoot?.querySelector('.el-table__body-wrapper')
        || event.currentTarget;
      if (scrollWrap) {
        scrollWrap.scrollTop += event.deltaY;
      }
    },
    initSortable() {
      this.$nextTick(() => {
        // 使用 $refs 获取 el-table 实例的根 DOM 元素（比 this.$el 更可靠，特别是嵌入 dialog 时）
        const tableRef = this.$refs.bookTableRef
        if (!tableRef) return
        const tableEl = tableRef.$el.querySelector('.el-table__body-wrapper tbody')
        if (!tableEl) return
        if (this.sortableInstance) this.sortableInstance.destroy()

        if (this.isBookListFiltered) {
          // 筛选激活时禁用拖拽
          this.sortableInstance = null
          return
        }

        this.sortableInstance = new Sortable(tableEl, {
          handle: '.drag-handle',
          animation: 200,
          delay: 100,
          delayOnTouchOnly: true,
          onStart: () => {
            // 正在保存时禁止拖拽
            if (this.sortSaving) return false
          },
          onEnd: (evt) => {
            this.handleSortEnd(evt)
          }
        })
      })
    },
    handleSortEnd(evt) {
      // 1. 同步更新 filteredData 的顺序（保持响应式）
      const currentData = [...this.filteredData]
      const [movedItem] = currentData.splice(evt.oldIndex, 1)
      currentData.splice(evt.newIndex, 0, movedItem)
      this.filteredData = currentData

      // 2. 直接从已更新的 filteredData 提取 book_name 列表
      this.sortSaving = true
      const bookNames = this.filteredData.map(b => b.name).filter(Boolean)

      // 3. 调用 API 保存排序
      this.saveBookOrder(bookNames)
    },
    async saveBookOrder(bookNames) {
      try {
        await reorderBooks(bookNames)
        this.sortSaving = false
      } catch (error) {
        this.$message.error('排序保存失败，请重试')
        await this.fetchBookList().catch(() => {})
        this.sortSaving = false
      }
    },
    // 打开弹窗
    openDialog() {
      this.dialogVisible = true
      this.$nextTick(() => {
        if (this.$refs.bookForm) { // 增加存在性判断
          this.$refs.bookForm.resetFields();
        }
        this.bookForm.file = null;
        if (this.$refs.upload) {
          this.$refs.upload.clearFiles();
        }
      });
    },
    // 关闭弹窗
    handleClose() {
      this.dialogVisible = false
      // 重置表单
      this.$refs.bookForm.resetFields()
      this.bookForm.files = []
      this.$refs.upload.clearFiles()
    },
    // 处理文件选择
    handleFileChange(file, fileList) {
      this.bookForm.files = fileList.map(f => f.raw);
      // 手动触发一次表单校验，移除之前可能因未选文件留下的红框
      if (this.bookForm.files.length > 0) {
        this.$refs.bookForm.validateField('file');
      }
    },
    // 处理文件移除
    handleFileRemove(file, fileList) {
      this.bookForm.files = fileList.map(f => f.raw);
    },
    // 提交表单
    submitForm() {
      this.$refs.bookForm.validate(async (valid) => {
        if (valid) {
          try {
            // 验证元数据格式（如果填写）
            if (this.bookForm.bookMeta) {
              try {
                JSON.parse(this.bookForm.bookMeta)
              } catch (e) {
                this.$message.error('元数据格式错误，请输入有效的JSON字符串')
                return
              }
            }

            // 构建FormData
            const formData = new FormData()
            formData.append('book_name', this.bookForm.bookName)
            if (this.bookForm.bookMeta) {
              formData.append('book_meta', this.bookForm.bookMeta)
            }
            // 遍历并添加所有选择的文件
            this.bookForm.files.forEach(file => {
              formData.append('file', file)
            })

            // 调用后端接口
            const response = await axios.post(
              '/api/domain/book/import',
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data'  // 重要：文件上传需此类型
                }
              }
            )

            // 处理接口响应
            if (response.data.success) {
              this.$message.success('书籍导入成功')
              this.dialogVisible = false
              this.fetchBookList(); // 刷新列表
            } else {
              this.$message.error(response.data.message || '导入失败')
            }
          } catch (error) {
            console.error('接口调用失败', error)
            this.$message.error('网络错误，请稍后重试')
          }
        }
      })
    },
    // 打开重命名弹窗
    openRenameDialog(row) {
      this.renameForm.oldName = row.name; // 从当前行获取原名称
      this.renameForm.newName = ''; // 清空新名称输入框
      this.renameDialogVisible = true; // 显示弹窗
    },

    // 提交重命名请求
    async submitRename() {
      // 表单验证
      this.$refs.renameForm.validate(async (valid) => {
        if (valid) {
          try {
            // 调用后端重命名接口
            const response = await axios.post('/api/domain/book/rename', {
              book_name_old: this.renameForm.oldName,
              book_name_new: this.renameForm.newName
            });

            if (response.data.success) {
              this.$message.success(response.data.message);
              this.renameDialogVisible = false;
              // 重新获取书籍列表，刷新表格
              this.fetchBookList();
            } else {
              this.$message.error(response.data.message);
            }
          } catch (error) {
            console.error('重命名失败:', error);
            this.$message.error('网络错误，重命名失败');
          }
        }
      });
    },
    // 解析书籍
    async handleAnalyse(row) {
      try {
        if (this.isPageParseRunning(row) && !row.cancelRequested) {
          this.$message.warning('该书籍任务正在处理中，请稍后');
          return;
        }

        if (this.isBookFinished(row)) {
          this.$message.info('该书籍已完成解析');
          return;
        }

        const response = await axios.post('/api/domain/book/analyse', {
          book_name: row.name
        });

        if (response.data.success) {
          row.status = 'analysing';
          row.showProgress = true;
          row.cancelRequested = false;
          row.parsePercentage = Number(row.parsePercentage || 0); // 保留已有页面解析进度
          row.treePercentage = Number(row.treePercentage || 0); // 保留已有目录重建进度
          row.ocrProgress = {
            parse: (row.parsePercentage || 0) / 100,
            tree: (row.treePercentage || 0) / 100
          };

          this.$message.success(response.data.message || '开始解析书籍');
          if (!this.progressInterval) {
            this.startGlobalProgressQuery();
          }

        } else {
          this.$message.error(response.data.message);
          await this.fetchBookList();
        }
      } catch (error) {
        console.error('解析请求失败:', error);
        this.$message.error('网络错误，解析失败');
        await this.fetchBookList();
      }
    },

    async handleCancelAnalyse(row) {
      try {
        const response = await axios.post('/api/domain/book/cancelAnalyse', {
          book_name: row.name
        });
        if (response.data.success) {
          row.cancelRequested = true;
          this.$message.success(response.data.message || '已请求中止解析');
        } else {
          this.$message.error(response.data.message || '中止解析失败');
        }
      } catch (error) {
        console.error('中止解析失败:', error);
        this.$message.error('网络错误，中止解析失败');
      }
    },

    // 定时查询解析进度
    startGlobalProgressQuery() {
      if (this.progressInterval) clearInterval(this.progressInterval);

      this.progressInterval = setInterval(async () => {
        const analysingBooks = this.filteredData.filter(b => this.isBookAnalysing(b) || b.showProgress);

        if (analysingBooks.length === 0) {
          clearInterval(this.progressInterval);
          this.progressInterval = null;
          return;
        }

        for (const row of analysingBooks) {
          try {
            const response = await axios.get('/api/domain/book/progress', {
              params: {book_name: row.name}
            });

            if (response.data.success) {
              const {parse_progress, tree_progress, status, cancel_requested} = response.data.data;
              const parse_eta_seconds = response.data.data?.parse_eta_seconds;
              row.status = status || row.status;
              row.cancelRequested = !!cancel_requested;
              row.parsePercentage = Math.round((parse_progress || 0) * 100);
              row.treePercentage = Math.round((tree_progress || 0) * 100);
              row.parseEtaSeconds = Number.isFinite(Number(parse_eta_seconds)) ? Number(parse_eta_seconds) : null;
              row.ocrProgress = {parse: parse_progress, tree: tree_progress};
              row.showProgress = true;

              if (row.status === 'interrupted') {
                row.showProgress = false;
                row.cancelRequested = false;
                this.$message.info(`书籍"${row.name}"解析已中止`);
                continue;
              }

              // 进度100%时停止查询该书
              if (row.parsePercentage === 100 && row.treePercentage === 100) {
                row.status = 'finished';
                row.showProgress = false;
                this.$message.success(`书籍"${row.name}"解析完成`);
              }
            } else {
              row.status = 'error';
              row.showProgress = false;
            }
          } catch (error) {
            console.error('查询进度失败:', error);
            row.status = 'error';
            row.showProgress = false;
          }
        }
      }, 10000);
    },

    isBookAnalysing(row) {
      return row?.status === 'analysing' || row?.status === '目录重建';
    },

    isPageParseRunning(row) {
      return this.isBookAnalysing(row) && Number(row?.parsePercentage || 0) < 100;
    },

    isBookFinished(row) {
      if (!row || row.status === 'interrupted' || row.status === 'error') {
        return false;
      }
      return row.status === 'finished' || (row.parsePercentage === 100 && row.treePercentage === 100);
    },

    formatDuration(seconds) {
      const sec = Math.max(0, Math.round(Number(seconds) || 0));
      if (sec < 60) return `${sec}秒`;
      const minutes = Math.floor(sec / 60);
      const remainSeconds = sec % 60;
      if (minutes < 60) return remainSeconds > 0 ? `${minutes}分${remainSeconds}秒` : `${minutes}分`;
      const hours = Math.floor(minutes / 60);
      const remainMinutes = minutes % 60;
      return remainMinutes > 0 ? `${hours}小时${remainMinutes}分` : `${hours}小时`;
    },

    getParseProgressTooltip(row) {
      const progress = Number(row?.parsePercentage || 0);
      const eta = row?.parseEtaSeconds;
      if (eta === null || eta === undefined || eta < 0) {
        return `当前进度：${progress}%`;
      }
      return `当前进度：${progress}%，预计剩余：${this.formatDuration(eta)}`;
    },


    // 获取书籍索引
    async handleGetIndex(row) {
      this.currentBookForTree = row;
      try {
        const response = await axios.get('/api/domain/book/index', {
          params: {book_name: row.name}
        });
        if (response.data.success) {
          this.bookIndexData = [response.data.data];
          this.indexDialogVisible = true;
        } else {
          this.$message.error(response.data.message);
        }
      } catch (error) {
        console.error('获取索引失败:', error);
        this.$message.error('网络错误，获取索引失败');
      }
    },

    // 通过自然语言更新目录树
    async handleUpdateTree() {
      if (!this.currentBookForTree || !this.treeUpdateInstruction) {
        this.$message.warning("请输入修改需求");
        return;
      }
      this.isUpdatingTree = true;
      try {
        this.currentBookForTree.status = '目录重建';
        this.currentBookForTree.showProgress = true;
        this.currentBookForTree.parsePercentage = this.currentBookForTree.parsePercentage || 100;
        this.currentBookForTree.treePercentage = 0;

        if (!this.progressInterval) {
          this.startGlobalProgressQuery();
        }

        const response = await axios.post('/api/domain/book/updateTree', {
          book_name: this.currentBookForTree.name,
          instruction: this.treeUpdateInstruction
        });
        if (response.data.success) {
          this.$message.success(response.data.message);
          this.treeUpdateInstruction = '';
          this.indexDialogVisible = false;
        } else {
          this.$message.error(response.data.message);
        }
      } catch (error) {
        console.error('更新目录树任务下发失败:', error);
        this.$message.error('网络错误');
      } finally {
        this.isUpdatingTree = false;
      }
    },

    handleTreeViewChange(val) {
      if (val === 'visual') {
        this.$nextTick(() => {
          if (!this.treeChartInstance) {
            this.initTreeChart();
          } else {
            this.treeChartInstance.resize();
          }
        });
      }
    },

    initTreeChart() {
      if (!this.$refs.treeModeChartRef) return;
      if (this.treeChartInstance) {
        this.treeChartInstance.dispose();
      }
      this.treeChartInstance = echarts.init(this.$refs.treeModeChartRef);

      const formatData = (node, depth = 0) => {
        const children = node.subsections ? node.subsections.map((child) => formatData(child, depth + 1)) : [];
        return {
          name: node.title || '无标题',
          value: node.summary || '',
          children,
          depth,
          itemStyle: {
            color: depth === 0 ? '#1d4ed8' : depth === 1 ? '#3b82f6' : '#60a5fa',
            borderColor: depth <= 1 ? '#1e40af' : '#2563eb',
            borderWidth: depth === 0 ? 1.6 : 1
          }
        };
      };

      const countNodes = (node) => {
        if (!node) return 0;
        const childCount = (node.children || []).reduce((sum, child) => sum + countNodes(child), 0);
        return 1 + childCount;
      };

      let chartData = [];
      if (this.bookIndexData && this.bookIndexData.length > 0) {
        chartData = this.bookIndexData.map(formatData);
      }

      const nodeCount = chartData.reduce((sum, root) => sum + countNodes(root), 0);
      this.treeChartCanvasHeight = Math.max(640, Math.min(2200, nodeCount * 44));
      this.$refs.treeModeChartRef.style.height = `${this.treeChartCanvasHeight}px`;
      this.treeChartInstance.resize();

      const option = {
        backgroundColor: '#f8fafc',
        tooltip: {
          trigger: 'item',
          triggerOn: 'mousemove',
          enterable: true,
          confine: true,
          formatter: function (params) {
            let html = `<div style="max-width: 300px; white-space: normal; word-wrap: break-word;">`;
            html += `<b>${params.data.name}</b>`;
            if (params.data.value) {
              html += `<br/><span style="color: #999; font-size: 13px; margin-top: 5px; display: inline-block;">摘要: ${params.data.value}</span>`;
            }
            html += `</div>`;
            return html;
          }
        },
        series: [
          {
            type: 'tree',
            data: chartData,
            top: 0,
            left: 200,
            bottom: 0,
            right: 350,
            orient: 'LR',
            roam: 'move',
            symbol: 'roundRect',
            symbolSize: [12, 12],
            edgeShape: 'polyline',
            edgeForkPosition: '60%',
            initialTreeDepth: 2,
            zoom: 0.8,
            lineStyle: {
              width: 1.5,
              color: '#94a3b8'
            },
            label: {
              position: 'left',
              verticalAlign: 'middle',
              align: 'right',
              fontSize: 13,
              color: '#0f172a',
              width: 210,
              overflow: 'truncate',
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              borderWidth: 1,
              padding: [6, 10],
              borderRadius: 8,
              lineHeight: 20
            },
            leaves: {
              label: {
                position: 'right',
                verticalAlign: 'middle',
                align: 'left',
                color: '#334155',
                lineHeight: 20
              }
            },
            emphasis: {
              focus: 'descendant',
              itemStyle: {
                color: '#3b82f6',
                borderColor: '#1d4ed8',
                borderWidth: 1.5
              },
              label: {
                color: '#1e3a8a',
                borderColor: '#bfdbfe'
              }
            },
            itemStyle: {
              color: '#60a5fa',
              borderColor: '#2563eb',
              borderWidth: 1
            },
            expandAndCollapse: true,
            nodeScaleRatio: 0.55,
            animationDuration: 550,
            animationDurationUpdate: 750
          }
        ]
      };
      this.treeChartInstance.setOption(option);

      if (!this.treeResizeHandler) {
        this.treeResizeHandler = () => {
          if (this.treeChartInstance) {
            this.treeChartInstance.resize();
          }
        };
        window.addEventListener('resize', this.treeResizeHandler);
      }
    },

    // 删除书籍（保持不变）
    handleDelete(row) {
      this.$confirm(`确定删除书籍"${row.name}"?`, '提示', {
        type: 'warning'
      }).then(async () => {
        try {
          const response = await axios.post('/api/domain/book/delete', {
            book_name: row.name
          });
          if (response.data.success) {
            this.$message.success('删除成功');
            this.fetchBookList(); // 刷新列表
          } else {
            this.$message.error(response.data.message);
          }
        } catch (error) {
          console.error('删除失败:', error);
          this.$message.error('网络错误，删除失败');
        }
      }).catch(() => {
        this.$message.info('已取消删除');
      });
    },

    handleResetAnalysis(row, resetType) {
      const isPages = resetType === 'pages';
      const actionText = isPages ? '页面解析结果' : '目录';
      const extraText = isPages ? '页面解析结果清除后，目录也会一并清除。' : '清除目录后，可基于已有页面解析结果重新构建目录。';
      this.$confirm(`确定清除书籍"${row.name}"的${actionText}？${extraText}`, '提示', {
        type: 'warning',
        confirmButtonText: '清除',
        cancelButtonText: '取消'
      }).then(async () => {
        try {
          const response = await axios.post('/api/domain/book/resetAnalysis', {
            book_name: row.name,
            reset_type: resetType
          });
          if (response.data.success) {
            this.$message.success(response.data.message || '清理成功');
            await this.fetchBookList();
          } else {
            this.$message.error(response.data.message || '清理失败');
          }
        } catch (error) {
          console.error('清理解析产物失败:', error);
          this.$message.error('网络错误，清理失败');
        }
      }).catch(() => {
        this.$message.info('已取消清理');
      });
    },

    handleBookActionCommand(row, command) {
      if (command === 'rename') {
        this.openRenameDialog(row);
      } else if (command === 'resetTree') {
        this.handleResetAnalysis(row, 'tree');
      } else if (command === 'resetPages') {
        this.handleResetAnalysis(row, 'pages');
      } else if (command === 'delete') {
        this.handleDelete(row);
      }
    },

    // 打开查询弹窗
    openQueryDialog(book) {
      this.currentBook = book;
      this.userQuery = '';
      this.queryResult = null;
      this.queryDialogVisible = true;
    },

    // 打开分类编辑弹窗
    openCategoryDialog(book) {
      this.currentBookForCategory = book;
      // 初始化选中的分类，从书籍的categories字段获取
      this.selectedCategories = book.categories ? [...book.categories] : [];
      this.categoryDialogVisible = true;
    },

    // 提交分类更新
    async submitCategoryUpdate() {
      if (!this.currentBookForCategory) return;

      try {
        const response = await axios.post('/api/domain/book/updateCategories', {
          book_name: this.currentBookForCategory.name,
          categories: this.selectedCategories
        });

        if (response.data.success) {
          this.$message.success('分类更新成功');
          this.categoryDialogVisible = false;
          // 刷新书籍列表
          this.fetchBookList();
        } else {
          this.$message.error(response.data.message || '分类更新失败');
        }
      } catch (error) {
        console.error('更新分类失败:', error);
        this.$message.error('网络错误，分类更新失败');
      }
    },

    // 获取分类标签类型
    getCategoryTagType(category) {
      const typeMap = {
        '场景设定': 'primary',
        '态势建模': 'success',
        '主体建模': 'warning',
        '其他': 'info'
      };
      return typeMap[category] || 'info';
    },

    // 发送查询请求
    async sendQuery() {
      if (!this.userQuery.trim()) return;

      this.isQuerying = true;
      try {
        const response = await axios.get('/api/domain/book/query', {
          params: {
            book_name: this.currentBook.name,
            query: this.userQuery.trim()
          }
        });

        if (response.data.success) {
          this.queryResult = response.data.data;
        } else {
          this.$message.error(response.data.message || '查询失败，请重试');
        }
      } catch (error) {
        console.error('查询书籍失败:', error);
        this.$message.error('网络错误，查询失败');
      } finally {
        this.isQuerying = false;
      }
    },

  },
  beforeUnmount() {
    // 组件销毁时清除定时器
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    if (this.treeResizeHandler) {
      window.removeEventListener('resize', this.treeResizeHandler);
      this.treeResizeHandler = null;
    }

    if (this.treeChartInstance) {
      this.treeChartInstance.dispose();
      this.treeChartInstance = null;
    }

    if (this.cognitiveResizeHandler) {
      window.removeEventListener('resize', this.cognitiveResizeHandler);
      this.cognitiveResizeHandler = null;
    }

    if (this.cognitiveChartInstance) {
      this.cognitiveChartInstance.dispose();
      this.cognitiveChartInstance = null;
    }

    // 销毁 Sortable 实例
    if (this.sortableInstance) {
      this.sortableInstance.destroy()
      this.sortableInstance = null
    }
  }
}

</script>

<style scoped>
.progress-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 4px 0;
}

.progress-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.custom-progress {
  width: 80px;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.step-label {
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.loading-dots {
  display: flex;
  align-items: center;
}

.loading-dots span {
  display: inline-block;
  width: 4px;
  height: 4px;
  margin: 0 2px;
  background-color: #409eff;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* 统一状态图标容器宽度，保证左侧文字对齐 */
.step-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 20px;
}

.custom-success-tick path {
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  animation: draw-tick 0.4s ease-out forwards;
}

@keyframes draw-tick {
  to {
    stroke-dashoffset: 0;
  }
}

.main-content {
  display: flex;
  width: 100%;
  height: 100%;
  font-size: 18px;
  background: #f5f6f8;
}
.main-content--standalone {
  background: transparent;
  height: 100%;
}
.main-content--standalone .right-content {
  width: 100%;
  margin: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  border: none;
  background: #fff;
}
.main-content--standalone .right-content .el-scrollbar {
  flex: 1;
}
.document-library-panel {
  display: flex;
  width: 100%;
  flex-direction: column;
  min-height: 0;
}
.document-library-content {
  display: flex;
  width: 100%;
  min-height: 0;
  flex-direction: column;
}
.document-library-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  flex: 0 0 auto;
  padding: 0 0 20px;
  gap: 16px;
}
.document-library-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.document-library-search {
  width: 220px;
}
.document-library-table-wrap {
  width: 100%;
}
.main-content--standalone .document-library-scroll-shell {
  flex: 1;
  min-height: 0;
}
.main-content--standalone .document-library-scroll-shell :deep(.el-scrollbar__wrap) {
  overflow: hidden;
}
.main-content--standalone .document-library-scroll-shell :deep(.el-scrollbar__view) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.main-content--standalone .document-library-panel {
  height: 100%;
}
.main-content--standalone .document-library-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.main-content--standalone .document-library-table-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.main-content--standalone .document-library-table {
  flex: 1;
  height: 100%;
  min-height: 0;
}
.main-content--standalone .document-library-table :deep(.el-table__inner-wrapper),
.main-content--standalone .document-library-table :deep(.el-table__body-wrapper) {
  min-height: 0;
}

.display-content {
  width: 60%;
  display: flex;
  flex-direction: column;
  line-height: 180%;
  font-size: 16px;
}

/* 左侧栏样式重构，匹配 Layout */
.left-sidebar {
  width: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  padding: 24px 16px;
  box-sizing: border-box;
}

.left-sidebar .el-divider {
  margin: 24px 0;
  border-color: #e5e7eb;
}

.avatar-card {
  border-radius: 16px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  background: #f9fafb;
}

.item-card {
  width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.item-card:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.item-card-selected {
  width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  background-color: #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

/* 右侧主体样式重构 */
.right-content {
  flex: 1;
  background: #ffffff;
  margin: 16px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  padding: 24px;
  box-sizing: border-box;
  overflow: hidden;
}

/* 标题样式统一 */
.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.section-subtitle {
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
}

.content-divider {
  margin: 16px 0 24px 0;
  border-color: #e5e7eb;
}

/* 知识库详情样式重构 */
.knowledge-detail-container {
  display: flex;
  width: 100%;
  height: calc(100vh - 180px);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.knowledge-sidebar {
  width: 260px;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  font-weight: 600;
  font-size: 14px;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.knowledge-tabs {
  padding: 12px 0;
}

.knowledge-tabs :deep(.el-tabs__item) {
  height: 40px;
  line-height: 40px;
  font-size: 13px;
  color: #4b5563;
}

.knowledge-tabs :deep(.el-tabs__item.is-active) {
  color: #111827;
  font-weight: 600;
}

.knowledge-card-list {
  flex: 1;
  padding: 12px;
  overflow: hidden;
}

.knowledge-card-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.knowledge-card-item:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.knowledge-card-item.is-selected {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.card-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  flex-shrink: 0;
}

.card-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-item-title {
  font-weight: 600;
  font-size: 13px;
  color: #111827;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-item-meta {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.knowledge-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.knowledge-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left {
  flex: 1;
}

.knowledge-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.knowledge-desc {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.6;
}

.knowledge-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  flex: 1;
  background: #f9fafb;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  border: 1px solid #e5e7eb;
  box-shadow: none;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.knowledge-view-tabs {
  background: #ffffff;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: none;
}

.knowledge-graph-container {
  height: 350px;
  width: 100%;
}

.empty-knowledge {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.entity-analysis {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.entity-category {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.category-name {
  font-weight: 600;
  font-size: 14px;
  color: #334155;
}

.entity-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.entity-tag {
  cursor: pointer;
  transition: all 0.2s ease;
}

.entity-tag:hover {
  transform: translateY(-1px);
}

/* 分类编辑弹窗样式 */
.category-edit-dialog .el-dialog__body {
  padding: 24px;
}

.category-dialog {
  width: 100%;
}

.dialog-header {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  border: 1px solid #bae6fd;
  box-shadow: 0 2px 8px rgba(147, 197, 253, 0.2);
  font-weight: 600;
  font-size: 16px;
  color: #0369a1;
  text-align: center;
}

/* 分类选择区域 */
.category-selection {
  width: 100%;
}

.selection-title {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 16px;
}

.category-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-checkbox {
  padding: 12px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: #f8fafc;
  border: 2px solid transparent;
  width: 100%;
  box-sizing: border-box;
}

.category-checkbox:hover {
  background: #f1f5f9;
  border-color: #e2e8f0;
  transform: translateX(4px);
}

.category-checkbox.is-checked {
  background: #eff6ff;
  border-color: #3b82f6;
}

/* 弹窗按钮区域 */
.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  border-radius: 0 0 12px 12px;
}

.dialog-footer .el-button {
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.dialog-footer .el-button--primary {
  background: #3b82f6;
  border-color: #3b82f6;
}

.dialog-footer .el-button--primary:hover {
  background: #2563eb;
  border-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.dialog-footer .el-button:hover {
  transform: translateY(-1px);
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.category-edit-dialog .el-dialog__body {
  animation: fadeInUp 0.3s ease-out;
}

.category-checkbox {
  animation: fadeInUp 0.3s ease-out;
}

.tree-chart-wrap {
  width: 100%;
  height: 75vh;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  background: #f5f8fc;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
  box-shadow: inset 0 1px 8px rgba(15, 23, 42, 0.04);
}

.tree-chart-tip {
  font-size: 13px;
  color: #2f5e93;
  background: #eaf3ff;
  border: 1px solid #cfe2fb;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  letter-spacing: 0;
  display: inline-block;
}

.tree-chart-canvas {
  width: calc(100% - 24px);
  min-height: calc(100% - 48px);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  margin: 0 auto;
}

.tree-toolbar {
  margin-bottom: 14px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #d7e1ee;
  border-radius: 8px;
  background: #f7faff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.tree-toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.tree-toolbar-left :global(.el-input) {
  flex: 1;
  min-width: 240px;
}

.tree-toolbar .tree-toolbar-left :global(.el-input__wrapper) {
  height: 38px;
  min-height: 38px;
  padding: 0 13px;
  border-radius: 7px;
  background: #ffffff;
  box-shadow: 0 0 0 1px #cbd8e8 inset;
  transition: box-shadow 0.18s ease, background-color 0.18s ease;
}

.tree-toolbar .tree-toolbar-left :global(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #9fb4cf inset;
}

.tree-toolbar .tree-toolbar-left :global(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3b82f6 inset, 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.tree-toolbar .tree-toolbar-left :global(.el-input__inner) {
  color: #172033;
  font-size: 14px;
  font-weight: 500;
}

.tree-toolbar-left :global(.el-button) {
  flex: 0 0 auto;
}

.tree-rebuild-button {
  --el-button-bg-color: #3b82f6;
  --el-button-border-color: #3b82f6;
  --el-button-hover-bg-color: #2563eb;
  --el-button-hover-border-color: #2563eb;
  --el-button-active-bg-color: #1d4ed8;
  --el-button-active-border-color: #1d4ed8;
  height: 38px;
  min-height: 38px;
  padding: 0 18px;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: 0;
  box-shadow: 0 3px 8px rgba(59, 130, 246, 0.14);
}

.tree-dialog-header {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 34px;
  padding-right: 48px;
}

.tree-dialog-title {
  color: #111827;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0;
}

.tree-view-switch {
  --el-color-primary: #3b82f6;
  --el-radio-button-checked-bg-color: #3b82f6;
  --el-radio-button-checked-border-color: #3b82f6;
  --el-radio-button-checked-text-color: #ffffff;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border: 0;
  border-radius: 8px;
  background: #f3f6fa;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.tree-view-switch :global(.el-radio-button) {
  margin: 0;
}

.tree-view-switch :global(.el-radio-button__inner) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  height: 32px;
  padding: 0 15px;
  border: 0 !important;
  border-radius: 6px;
  outline: none !important;
  background: #e6edf6;
  color: #475569;
  font-size: 13px;
  font-weight: 650;
  line-height: 32px;
  letter-spacing: 0;
  box-shadow: none;
  transition: color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.tree-view-switch :global(.el-radio-button__inner:hover) {
  background: #dfe8f3;
  color: #3b82f6;
}

.tree-view-switch :global(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 3px 8px rgba(59, 130, 246, 0.14);
}

.tree-view-switch :global(.el-radio-button.is-active .el-radio-button__inner) {
  background: #3b82f6;
  border-color: transparent !important;
  color: #ffffff;
  box-shadow: 0 3px 8px rgba(59, 130, 246, 0.14);
}

.tree-text-panel {
  width: 100%;
  height: 75vh;
  overflow-y: auto;
  padding: 18px 20px;
  background: #fbfcfe;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  box-sizing: border-box;
}

.tree-text-view {
  padding: 4px 0;
  background: transparent;
}

.custom-tree-node {
  display: inline-flex;
  align-items: baseline;
  gap: 12px;
  max-width: 100%;
  min-height: 30px;
  line-height: 1.5;
}

.tree-node-title {
  color: #152033;
  font-weight: 650;
}

.tree-node-summary {
  color: #68758a;
  font-size: 13px;
  white-space: normal;
}

/* 现代化弹窗样式 */
:global(.modern-tree-dialog.el-dialog) {
  --el-dialog-padding-primary: 0;
  --el-dialog-margin-top: 3.5vh;
  margin: var(--el-dialog-margin-top) auto 0;
  max-width: calc(100vw - 40px);
  overflow: hidden;
  border: 1px solid rgba(126, 147, 176, 0.3);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
}

:global(.modern-tree-dialog.el-dialog > .el-dialog__header) {
  padding: 13px 24px 12px;
  border-bottom: 1px solid #dfe7f1;
  margin-right: 0;
  margin-bottom: 0;
  background: #ffffff;
}

:global(.modern-tree-dialog.el-dialog .el-dialog__title) {
  color: #111827;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0;
}

:global(.modern-tree-dialog.el-dialog .el-dialog__headerbtn) {
  top: 7px;
  width: 44px;
  height: 44px;
  transform: none;
}

:global(.modern-tree-dialog.el-dialog > .el-dialog__body) {
  padding: 18px 22px 22px;
  background: #ffffff;
}

:global(.modern-tree-dialog.el-dialog .el-input__wrapper) {
  min-height: 38px;
  border-radius: 7px;
  box-shadow: 0 0 0 1px #c9d6e6 inset;
}

:global(.modern-tree-dialog.el-dialog .el-radio-button__inner) {
  min-width: 96px;
}

:global(.modern-tree-dialog.el-dialog .el-tree-node__content) {
  min-height: 34px;
  border-radius: 6px;
}

:global(.modern-tree-dialog.el-dialog .el-tree-node__content:hover) {
  background: #edf4ff;
}

@media (max-width: 768px) {
  :global(.modern-tree-dialog.el-dialog) {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px);
  }

  .tree-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .tree-toolbar-left {
    width: 100%;
    flex-direction: column;
  }

  .tree-toolbar-left :global(.el-input) {
    width: 100%;
    min-width: 0;
  }

  .tree-rebuild-button {
    width: 100%;
  }

  .custom-tree-node {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
}
</style>

<style>
.compact-book-dialog.el-dialog {
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

.compact-book-dialog.el-dialog > .el-dialog__header {
  flex: 0 0 auto;
  margin-right: 0;
  padding: 18px 24px 15px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.compact-book-dialog.el-dialog .el-dialog__title {
  color: #0f172a;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: 0;
}

.compact-book-dialog.el-dialog .el-dialog__headerbtn {
  top: 0;
  width: 52px;
  height: 52px;
}

.compact-book-dialog.el-dialog > .el-dialog__body {
  flex: 0 1 auto;
  height: auto !important;
  min-height: 0 !important;
  max-height: calc(100vh - 230px);
  padding: 22px 28px 18px;
  overflow-y: auto;
  background: #ffffff;
}

.compact-book-dialog.el-dialog > .el-dialog__footer {
  flex: 0 0 auto;
  padding: 15px 24px 18px;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
}

.compact-book-dialog .dialog-footer {
  padding: 0;
  justify-content: flex-end;
  gap: 10px;
  background: transparent;
  border-top: 0;
}

.compact-book-dialog .el-button {
  min-width: 78px;
  border-radius: 6px;
}

.compact-book-dialog .el-button--primary {
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.18);
}

.compact-book-dialog .book-dialog-form .el-form-item {
  margin-bottom: 18px;
}

.compact-book-dialog .book-dialog-form .el-form-item:last-child {
  margin-bottom: 0;
}

.compact-book-dialog .book-dialog-form .el-input__wrapper,
.compact-book-dialog .book-dialog-form .el-textarea__inner {
  border-radius: 6px;
}

.book-upload-dialog.el-dialog {
  width: min(500px, calc(100vw - 32px)) !important;
}

.book-rename-dialog.el-dialog {
  width: min(420px, calc(100vw - 32px)) !important;
}

.book-query-dialog.el-dialog {
  width: min(640px, calc(100vw - 32px)) !important;
}

.book-query-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.book-query-target {
  margin: 0;
  padding: 10px 12px;
  color: #334155;
  font-size: 14px;
  line-height: 1.5;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.book-query-dialog .el-textarea__inner {
  min-height: 108px !important;
  border-radius: 6px;
  line-height: 1.65;
}

.book-query-result {
  margin-top: 2px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.book-query-result-title {
  margin: 0 0 10px;
  color: #059669;
  font-size: 15px;
  font-weight: 650;
}

.book-query-dialog .query-answer {
  max-height: 26vh;
  padding: 14px 16px;
  overflow-y: auto;
  color: #1e293b;
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}

.book-query-source-title {
  margin: 14px 0 8px;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.book-query-source-text {
  max-height: 20vh;
  padding: 12px 14px;
  overflow-y: auto;
  color: #475569;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

@media (max-width: 640px) {
  .compact-book-dialog.el-dialog > .el-dialog__body {
    padding: 18px 18px 14px;
  }

  .compact-book-dialog.el-dialog > .el-dialog__footer {
    padding: 14px 18px 16px;
  }

  .compact-book-dialog .dialog-footer {
    justify-content: stretch;
  }

  .compact-book-dialog .dialog-footer .el-button {
    flex: 1;
  }
}
</style>

<style scoped>
/* Markdown Rendering Styles for Cognitive Model */
.cognitive-markdown {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.cognitive-markdown h1,
.cognitive-markdown h2,
.cognitive-markdown h3,
.cognitive-markdown h4 {
  color: #1e293b;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.cognitive-markdown h2 {
  font-size: 1.3em;
  color: #409eff;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 5px;
}

.cognitive-markdown h3 {
  font-size: 1.1em;
}

.cognitive-markdown p {
  margin-bottom: 1em;
}

.cognitive-markdown ul,
.cognitive-markdown ol {
  padding-left: 2em;
  margin-bottom: 1em;
}

.cognitive-markdown li {
  margin-bottom: 0.5em;
}

.cognitive-markdown strong {
  font-weight: bold;
  color: #1e293b;
}

.cognitive-markdown blockquote {
  margin: 1em 0;
  padding: 10px 20px;
  background-color: #f8fafc;
  border-left: 4px solid #409eff;
  color: #64748b;
  border-radius: 4px;
}

.tab-label{
  display: flex;
  align-items: center;
  gap: 6px;
}

.book-action-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
}

.book-action-cell :deep(.el-button) {
  margin-left: 0 !important;
}

.book-action-cell :deep(.el-dropdown) {
  line-height: 1;
}
</style>
