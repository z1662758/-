<template>
  <div class="kb-create-root" style="width: 99%; min-width:1200px; display: flex;">
    <el-card class="kb-create-main-card" style="width: 99%; height: 98%; z-index: 0">
      <div class="kb-create-shell" style="display: flex; flex-direction: column; width: 100%; height: 100%; font-size: 20px; margin-top: 1rem">
        <el-card style="width: 100%; height: 150px; margin-top: 1rem" v-if="false">
        </el-card>

        <div style="display: flex; width: 100%">
          <!--     左侧头像+选项卡     -->
          <div class="kb-create-sidebar" style="width: 18%; display: flex; flex-direction: column; align-items: center">
            <el-card style="border-radius: 50%; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; margin-top: 5rem; --el-card-padding: 10px">
              <img src="../../../assets/images/autonomousAgentImg.png" style="width: 100%; height: 100%" alt="pic"/>
            </el-card>
            <span style="font-size: 16px; margin-top: 1rem; font-weight: bold">Test</span>

            <el-divider style="width: 90%; margin-right: 5%" border-style="dashed"></el-divider>

            <div style="display: flex; flex-direction: column; width: 90%; margin: 0 5%">
              <el-card :class="index === selectedCard ? 'item-card-selected' : 'item-card'" v-for="(item, index) in itemCard"
                       shadow="never" @click="itemCardClick(index)">
                <div style="display: flex; align-items: center">
                  <el-icon size="20" style="margin-right: 5px; margin-top: 1px">
                    <component :is="item.icon"></component>
                  </el-icon>
                  {{item.name}}
                </div>
              </el-card>
            </div>
          </div>
          <!--     右侧主体     -->
          <div class="kb-create-content" style="width: 82%">
            <el-scrollbar max-height="81vh">
              <div class="workspace-panel" v-if="selectedCard === 0">
                <div class="panel-hero">
                  <div>
                    <div class="panel-title">数据集管理</div>
                    <div class="panel-desc">集中管理供应链文档、解析进度、索引和知识抽取入口。</div>
                  </div>
                  <div class="panel-metrics">
                    <div class="panel-metric-card">
                      <span>全部数据集</span>
                      <strong>{{ sourceFiles.length }}</strong>
                    </div>
                    <div class="panel-metric-card">
                      <span>待解析</span>
                      <strong>{{ sourceFiles.length - availableFiles.length }}</strong>
                    </div>
                    <div class="panel-metric-card">
                      <span>已完成抽取</span>
                      <strong>{{ extractedFilesCount }}</strong>
                    </div>
                  </div>
                </div>

                <el-card class="workspace-section-card" shadow="never">
                  <div class="dataset-toolbar">
                    <div class="dataset-toolbar-left">
                      <el-select v-model="batchSelection" placeholder="批量" :disabled="batchSelectionDisabled" style="width: 120px">
                        <el-option v-for="item in batchOptions"
                                   :label="item.label" :key="item.value" :value="item.value" />
                      </el-select>
                      <el-input
                        v-model="docNameSearch"
                        placeholder="搜索数据集名称"
                        clearable
                        style="width: 260px"
                      >
                        <template #prefix>
                          <el-icon><Search /></el-icon>
                        </template>
                      </el-input>
                    </div>
                    <div class="dataset-toolbar-right">
                      <el-button type="primary" @click="openDialog">+ 新增文件</el-button>
                      <el-button type="success" @click="openKnowledgeExtractDialog">
                        <el-icon><MagicStick /></el-icon>
                        知识抽取
                      </el-button>
                    </div>
                  </div>

                  <div class="dataset-tip">
                    <el-icon size="14"><Shop/></el-icon>
                    解析完成后即可参与检索测试，抽取完成后可并入知识图谱。
                  </div>

                  <el-table
                    :data="displayDatasetList"
                    @selection-change="handleSelectionChange"
                    style="width: 100%"
                  >
                    <el-table-column type="selection" />
                    <el-table-column
                      prop="name"
                      label="名称"
                      min-width="300"
                      align="center"
                      style="color: #67C23A"
                    />
                    <el-table-column
                      prop="date"
                      label="上传日期"
                      min-width="160"
                      align="center"
                    />
                    <el-table-column
                      prop="progress"
                      label="解析进度"
                      min-width="200"
                      align="center"
                    >
                      <template #default="scope">
                        <div class="progress-cell">
                          <el-progress
                            :percentage="scope.row.ocrPercentage"
                            stroke-width="6"
                            v-if="scope.row.showProgress"
                          />
                          <span v-else-if="scope.row.ocrPercentage === 100">解析完成</span>
                          <span v-else>未解析</span>
                          <el-tooltip
                            effect="dark"
                            placement="bottom"
                            :content="getProgressDetail(scope.row)"
                            v-if="scope.row.ocrProgress"
                          >
                            <span class="progress-detail-link">查看详情</span>
                          </el-tooltip>
                        </div>
                      </template>
                    </el-table-column>
                    <el-table-column
                      prop="kgStatus"
                      label="知识抽取"
                      min-width="140"
                      align="center"
                    >
                      <template #default="scope">
                        <el-tag
                          :type="getKgStatusType(scope.row.kgStatus)"
                          size="small"
                        >
                          {{ getKgStatusText(scope.row.kgStatus) }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="action" label="动作" min-width="290" align="center">
                      <template #default="scope">
                        <div style="display: flex; width: 100%; justify-content: center">
                          <el-tooltip effect="dark" content="解析数据集" placement="top">
                            <el-button
                              plain
                              size="mini"
                              style="padding: 0 6px"
                              @click="handleAnalyse(scope.row)"
                              :disabled="scope.row.ocrPercentage === 100"
                            >
                              <el-icon><Refresh/></el-icon>
                            </el-button>
                          </el-tooltip>
                          <el-tooltip effect="dark" content="抽取知识到图谱" placement="top">
                            <el-button
                              plain
                              size="mini"
                              style="padding: 0 6px"
                              @click="extractKnowledge(scope.row)"
                              :disabled="scope.row.ocrPercentage < 100 || scope.row.kgStatus === 1"
                              type="success"
                            >
                              <el-icon><MagicStick /></el-icon>
                            </el-button>
                          </el-tooltip>
                          <el-tooltip effect="dark" content="查看索引" placement="bottom">
                            <el-button
                              plain
                              size="mini"
                              style="padding: 0 6px"
                              @click="handleGetIndex(scope.row)"
                            >
                              <el-icon><FolderOpened/></el-icon>
                            </el-button>
                          </el-tooltip>
                          <el-tooltip effect="dark" content="下载原始文件" placement="bottom">
                            <el-button
                              plain
                              size="mini"
                              style="padding: 0 6px"
                              @click="handleDownload(scope.row)"
                            >
                              <el-icon><Download/></el-icon>
                            </el-button>
                          </el-tooltip>
                          <el-tooltip effect="dark" content="重命名" placement="top">
                            <el-button plain size="mini" style="padding: 0 6px" @click="openRenameDialog(scope.row)">
                              <el-icon><Edit/></el-icon>
                            </el-button>
                          </el-tooltip>
                          <el-tooltip effect="dark" content="查询数据集" placement="bottom">
                            <el-button
                              plain
                              size="mini"
                              style="padding: 0 6px"
                              @click="openQueryDialog(scope.row)"
                            >
                              <el-icon><HelpFilled /></el-icon>
                            </el-button>
                          </el-tooltip>
                          <el-tooltip effect="dark" content="删除" placement="top">
                            <el-button
                              plain
                              size="mini"
                              style="padding: 0 6px"
                              @click="handleDelete(scope.row)"
                              type="danger"
                            >
                              <el-icon><Delete/></el-icon>
                            </el-button>
                          </el-tooltip>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-card>
              </div>

              <div class="workspace-panel" v-if="selectedCard === 1">
                <div class="panel-hero">
                  <div>
                    <div class="panel-title">检索测试</div>
                    <div class="panel-desc">验证切块、相似度与知识图谱辅助检索是否符合预期。</div>
                  </div>
                  <div class="panel-metrics">
                    <div class="panel-metric-card">
                      <span>可测文件</span>
                      <strong>{{ availableFiles.length }}</strong>
                    </div>
                    <div class="panel-metric-card">
                      <span>Rerank</span>
                      <strong>{{ currentRerankLabel }}</strong>
                    </div>
                    <div class="panel-metric-card">
                      <span>图谱增强</span>
                      <strong>{{ retrievalTest.isUseKnowledgeMap ? '开启' : '关闭' }}</strong>
                    </div>
                  </div>
                </div>

                <div class="retrieval-grid">
                  <el-card class="workspace-section-card retrieval-config-card" shadow="never">
                    <div class="section-card-title">检索参数</div>
                    <div class="field-label">相似度阈值</div>
                    <el-slider v-model="retrievalTest.similarityThreshold" :min="0" :max="1" :step="0.01" />
                    <div class="field-label">关键字相似度权重</div>
                    <el-slider v-model="retrievalTest.keywordSimilarityWeight" :min="0" :max="1" :step="0.01" />
                    <div class="field-label">Rerank 模型</div>
                    <el-select v-model="retrievalTest.rerankModel" clearable style="width: 100%">
                      <el-option-group
                        v-for="group in rerankOptions"
                        :key="group.label"
                        :label="group.label">
                        <el-option
                          v-for="item in group.options"
                          :key="item.value"
                          :label="item.label"
                          :value="item.value"/>
                      </el-option-group>
                    </el-select>
                    <div class="retrieval-switch-row">
                      <span>使用知识图谱增强召回</span>
                      <el-switch v-model="retrievalTest.isUseKnowledgeMap" />
                    </div>
                    <div class="field-label">测试文本</div>
                    <el-input v-model="retrievalTest.testText" type="textarea" :rows="9" placeholder="输入一个关于供应链实体、关系或风险的问题" />
                    <el-button class="retrieval-run-button" type="primary" @click="runRetrievalTest">运行测试</el-button>
                  </el-card>

                  <div class="retrieval-side">
                    <el-card class="workspace-section-card" shadow="never">
                      <div class="section-card-title">当前检索快照</div>
                      <div class="snapshot-grid">
                        <div class="snapshot-item">
                          <span>相似度阈值</span>
                          <strong>{{ retrievalTest.similarityThreshold.toFixed(2) }}</strong>
                        </div>
                        <div class="snapshot-item">
                          <span>关键词权重</span>
                          <strong>{{ retrievalTest.keywordSimilarityWeight.toFixed(2) }}</strong>
                        </div>
                        <div class="snapshot-item">
                          <span>已解析文件</span>
                          <strong>{{ availableFiles.length }}</strong>
                        </div>
                        <div class="snapshot-item">
                          <span>知识图谱增强</span>
                          <strong>{{ retrievalTest.isUseKnowledgeMap ? '已开启' : '未开启' }}</strong>
                        </div>
                      </div>
                    </el-card>

                    <el-card class="workspace-section-card" shadow="never">
                      <div class="section-card-title">测试输出</div>
                      <div v-if="retrievalPreviewResult" class="retrieval-result-card">
                        <div class="retrieval-result-summary">{{ retrievalPreviewResult.summary }}</div>
                        <div class="retrieval-result-list">
                          <div v-for="item in retrievalPreviewResult.hits" :key="item.title" class="retrieval-result-item">
                            <div class="retrieval-result-item-title">{{ item.title }}</div>
                            <div class="retrieval-result-item-desc">{{ item.desc }}</div>
                          </div>
                        </div>
                      </div>
                      <div v-else class="retrieval-placeholder">
                        输入测试文本并点击“运行测试”后，这里会展示召回摘要和命中片段。
                      </div>
                    </el-card>

                    <el-card class="workspace-section-card" shadow="never">
                      <div class="section-card-title">建议</div>
                      <div class="retrieval-placeholder">
                        优先使用已解析且已抽取的文件进行测试。若召回结果过散，可先提升相似度阈值，再逐步降低关键词权重。
                      </div>
                    </el-card>
                  </div>
                </div>
              </div>

              <div class="workspace-panel" v-if="selectedCard === 2">
                <div class="panel-hero">
                  <div>
                    <div class="panel-title">配置</div>
                    <div class="panel-desc">配置切块、模型、OCR、RAPTOR 和知识图谱抽取规则。</div>
                  </div>
                  <div class="panel-metrics">
                    <div class="panel-metric-card">
                      <span>解析方法</span>
                      <strong>{{ analyticMethodLabel }}</strong>
                    </div>
                    <div class="panel-metric-card">
                      <span>嵌入模型</span>
                      <strong>{{ selectedModelLabel }}</strong>
                    </div>
                    <div class="panel-metric-card">
                      <span>图谱抽取</span>
                      <strong>{{ knowledgeBaseForm.isGetKnowledgeMap ? '开启' : '关闭' }}</strong>
                    </div>
                  </div>
                </div>

                <div class="config-grid">
                  <el-card class="workspace-section-card config-form-card" shadow="never">
                    <div class="section-card-title">知识库基础参数</div>
                    <el-form :model="knowledgeBaseForm" label-width="auto" label-position="top" style="max-width: 600px">
                    <el-form-item label="知识库名称" required>
                      <el-input v-model="knowledgeBaseForm.name" style="width: 90%"/>
                    </el-form-item>
                    <el-form-item label="知识库图片">
                      <el-upload
                          action="/api/domain/book/import"
                          multiple list-type="picture-card" :auto-upload="false"
                          style="display: flex; width: 100%; justify-content: center; flex-grow: 1">
                        <el-icon size="60"><Plus /></el-icon>
                      </el-upload>
                    </el-form-item>
                    <el-form-item label="描述">
                      <el-input v-model="knowledgeBaseForm.description" style="width: 90%"></el-input>
                    </el-form-item>
                    <el-form-item label="文档语言" required>
                      <el-select v-model="knowledgeBaseForm.language" style="width: 90%">
                        <el-option v-for="item in languageOptions"
                                   :key="item.value" :label="item.label" :value="item.value" />
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
                                   :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="页面排名">
                      <el-slider v-model="knowledgeBaseForm.pageRank" :max="100" style="width: 88%; margin-left: 2%" show-input></el-slider>
                    </el-form-item>
                    <el-form-item label="自动关键词">
                      <el-slider v-model="knowledgeBaseForm.autoKeyWord" :max="30" style="width: 88%; margin-left: 2%" show-input></el-slider>
                    </el-form-item>
                    <el-form-item label="自动问题">
                      <el-slider v-model="knowledgeBaseForm.autoQuestion" :max="10" style="width: 88%; margin-left: 2%" show-input></el-slider>
                    </el-form-item>
                    <el-form-item label="块Token数">
                      <el-slider  v-model="knowledgeBaseForm.tokenNum" :min="128" :max="2048" style="width: 88%; margin-left: 2%" show-input></el-slider>
                    </el-form-item>
                    <el-form-item label="分段标识符" required>
                      <el-input v-model="knowledgeBaseForm.segmentIdentifier" style="width: 90%"/>
                    </el-form-item>
                    <el-form-item label="布局识别和OCR">
                      <el-select v-model="knowledgeBaseForm.layoutAndOCR" style="width: 90%">
                        <el-option v-for="item in layoutAndOCROptions"
                                   :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="表格转HTML">
                      <el-switch v-model="knowledgeBaseForm.isTableToHtml" />
                    </el-form-item>
                    <el-form-item label="使用召回增强RAPTOR策略">
                      <el-switch v-model="knowledgeBaseForm.isRAPTOR" />
                    </el-form-item>
                    <el-form-item label="提示词" v-if="knowledgeBaseForm.isRAPTOR === true" required>
                      <el-input type="textarea" v-model="knowledgeBaseForm.RAPTORPrompt" :rows="5"></el-input>
                    </el-form-item>
                    <el-card style="width: 90%; display: flex; flex-direction: column; background-color: #FAFCFF; --el-card-padding: 5px">
                      <el-form-item label="提取知识图谱">
                        <el-switch v-model="knowledgeBaseForm.isGetKnowledgeMap" />
                      </el-form-item>
                      <div v-if="knowledgeBaseForm.isGetKnowledgeMap === true">
                        <el-form-item label="实体类型" required>
                          <el-tag v-for="tag in knowledgeBaseForm.knowledgeMapCategory" style="margin-right: 5px"
                              :key="tag" closable @close="knowledgeMapCategoryClose(tag)">
                            {{ tag }}
                          </el-tag>
                          <el-input v-if="inputVisible" style="width: 90%"
                              ref="InputRef" v-model="inputValue" size="small"
                              @keyup.enter="handleInputConfirm" @blur="handleInputConfirm"/>
                          <el-button v-else class="button-new-tag" size="small" @click="knowledgeMapCategoryShowInput()">
                            + New
                          </el-button>
                        </el-form-item>
                        <el-form-item label="方法">
                          <el-select v-model="knowledgeBaseForm.knowledgeMapMethod" style="width: 90%">
                            <el-option v-for="item in knowledgeMapMethodOptions"
                                       :key="item.value" :label="item.label" :value="item.value" />
                          </el-select>
                        </el-form-item>
                        <el-form-item label="实体归一化" >
                          <el-switch v-model="knowledgeBaseForm.knowledgeMapNormalize" />
                        </el-form-item>
                        <el-form-item label="社区报告生成" >
                          <el-switch v-model="knowledgeBaseForm.knowledgeMapReport" />
                        </el-form-item>
                      </div>
                    </el-card>
                    </el-form>
                    <div class="config-actions">
                      <el-button>取消</el-button>
                      <el-button type="primary" @click="onSubmit">保存</el-button>
                    </div>
                  </el-card>

                  <el-card class="workspace-section-card config-guide-card" shadow="never">
                    <div class="section-card-title">方法说明</div>
                    <div class="display-content display-content-full"
                         v-if="knowledgeBaseForm.analyticMethod === 0">
                      <b style="font-size: 18px">"General" 分块方法说明</b>
                      <p>支持的文件格式为<b>DOCX、EXCEL、PPT、IMAGE、PDF、TXT、MD、JSON、EML、HTML。</b></p>
                      <p>此方法将简单的方法应用于块文件：</p>
                      <p>- 系统将使用视觉检测模型将连续文本分割成多个片段。</p>
                      <p>- 接下来，这些连续的片段被合并成Token数不超过"Token数"的块。</p>
                      <p style="font-size: 18px; margin-top: 1rem"><b>"General" 示例</b></p>
                      <p>提出以下屏幕截图以促进理解。</p>
                      <div style="display: flex; width: 100%">
                        <img src="../../../assets/images/knowledge-general-1.svg" style="width: 49%; margin-right: 2%" alt="pic"/>
                        <img src="../../../assets/images/knowledge-general-2.svg" style="width: 49%" alt="pic"/>
                      </div>
                      <b style="font-size: 18px; margin-top: 1rem">"General" 对话示例</b>
                      <el-divider></el-divider>
                    </div>
                    <div class="display-content display-content-full"
                         v-else-if="knowledgeBaseForm.analyticMethod === 1">
                      <b style="font-size: 18px">"Q&A" 分块方法说明</b>
                      <p>此块方法支持 <b>excel</b> 和 <b>csv/txt</b> 文件格式。</p>
                      <p>- 如果文件是 <b>excel</b> 格式，则应由两个列组成 没有标题：一个提出问题，另一个用于答案， 答案列之前的问题列。多张纸是 只要列正确结构，就可以接受。</p>
                      <p>- 如果文件是 <b>csv/txt</b> 格式 以 UTF-8 编码且用 TAB 作分开问题和答案的定界符。</p>
                      <p>未能遵循上述规则的文本行将被忽略，并且 每个问答对将被认为是一个独特的部分。</p>
                      <p style="font-size: 18px; margin-top: 1rem"><b>"Q&A" 示例</b></p>
                      <p>提出以下屏幕截图以促进理解。</p>
                      <div style="display: flex; width: 100%">
                        <img src="../../../assets/images/knowledge-q&a-1.svg" style="width: 49%; margin-right: 2%" alt="pic"/>
                        <img src="../../../assets/images/knowledge-q&a-2.svg" style="width: 49%" alt="pic"/>
                      </div>
                      <b style="font-size: 18px; margin-top: 1rem">Q&A 对话示例</b>
                      <el-divider></el-divider>
                    </div>
                    <div class="display-content display-content-full"
                         v-else>
                      <b style="font-size: 18px">"Resume" 分块方法说明</b>
                      <p>支持的文件格式为<b>DOCX、PDF、TXT。</b></p>
                      <p>简历有多种格式，就像一个人的个性一样，但我们经常必须将它们组织成结构化数据，以便于搜索。</p>
                      <p>我们不是将简历分块，而是将简历解析为结构化数据。 作为HR，你可以扔掉所有的简历， 您只需与'RAGFlow'交谈即可列出所有符合资格的候选人。</p>
                      <p style="font-size: 18px; margin-top: 1rem"><b>"Resume" 示例</b></p>
                      <p>提出以下屏幕截图以促进理解。</p>
                      <div style="display: flex; width: 100%">
                        <img src="../../../assets/images/knowledge-resume-1.svg" style="width: 49%; margin-right: 2%" alt="pic"/>
                        <img src="../../../assets/images/knowledge-resume-2.svg" style="width: 49%" alt="pic"/>
                      </div>
                      <b style="font-size: 18px; margin-top: 1rem">Resume 对话示例</b>
                      <el-divider></el-divider>
                    </div>
                  </el-card>
                </div>
              </div>

              <div class="workspace-panel" v-if="selectedCard === 3">
                <div class="panel-hero graph-panel-hero">
                  <div>
                    <div class="panel-title">知识图谱</div>
                    <div class="panel-desc">将抽取结果沉淀为图谱资产，并集中查看实体、关系、版本和待合并知识。</div>
                  </div>
                  <div class="panel-metrics">
                    <div class="panel-metric-card">
                      <span>实体数</span>
                      <strong>{{ graphData.nodes.length }}</strong>
                    </div>
                    <div class="panel-metric-card">
                      <span>关系数</span>
                      <strong>{{ graphData.links.length }}</strong>
                    </div>
                    <div class="panel-metric-card">
                      <span>版本数</span>
                      <strong>{{ graphVersions.length }}</strong>
                    </div>
                    <div class="panel-metric-card">
                      <span>待合并</span>
                      <strong>{{ extractedData.nodes.length }}</strong>
                    </div>
                  </div>
                </div>

                <div class="graph-actions-bar">
                  <el-button type="primary" @click="openKnowledgeGraphDialog">打开完整图谱</el-button>
                  <el-button type="success" @click="openKnowledgeExtractDialog">知识抽取</el-button>
                  <el-button @click="saveCurrentVersion">保存版本</el-button>
                  <el-button @click="exportKnowledgeGraph">导出图谱</el-button>
                </div>

                <div class="graph-workspace-grid">
                  <el-card class="workspace-section-card graph-preview-card" shadow="never">
                    <div class="section-card-title">图谱预览</div>
                    <div id="knowledge-graph-preview-container" class="knowledge-graph-preview"></div>
                  </el-card>

                  <div class="graph-side-column">
                    <el-card class="workspace-section-card" shadow="never">
                      <div class="section-card-title">类别分布</div>
                      <div class="category-summary-list">
                        <div v-for="item in graphCategorySummary" :key="item.name" class="category-summary-item">
                          <div class="category-summary-left">
                            <span class="category-dot" :style="{ backgroundColor: item.color }"></span>
                            <span>{{ item.name }}</span>
                          </div>
                          <strong>{{ item.count }}</strong>
                        </div>
                      </div>
                    </el-card>

                    <el-card class="workspace-section-card" shadow="never">
                      <div class="section-card-title">版本与合并状态</div>
                      <div class="graph-version-meta">当前版本：{{ selectedVersion }}</div>
                      <div class="graph-version-meta">最后更新时间：{{ lastUpdateTime }}</div>
                      <div class="graph-version-meta">待合并节点：{{ extractedData.nodes.length }}</div>
                      <div class="graph-version-meta">待合并关系：{{ extractedData.links.length }}</div>
                    </el-card>

                    <el-card class="workspace-section-card" shadow="never">
                      <div class="section-card-title">当前选中节点</div>
                      <div v-if="selectedNode" class="graph-selected-node">
                        <div class="graph-selected-node-title">{{ selectedNode.name }}</div>
                        <div class="graph-selected-node-desc">{{ selectedNode.desc || '暂无描述' }}</div>
                        <el-button size="small" type="primary" @click="openKnowledgeGraphDialog">在完整图谱中查看</el-button>
                      </div>
                      <div v-else class="retrieval-placeholder">
                        在完整图谱中点击节点后，这里会显示当前节点的摘要信息。
                      </div>
                    </el-card>
                  </div>
                </div>
              </div>
            </el-scrollbar>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 上传弹窗 -->
    <el-dialog
      title="导入数据库"
      v-model="dialogVisible"
      width="500px"
      :before-close="handleClose"
    >
      <el-form
        ref="bookForm"
        :model="bookForm"
        :rules="rules"
        label-width="100px"
      >
        <!-- 数据集名称 -->
        <el-form-item label="数据集名称" prop="bookName">
          <el-input
            v-model="bookForm.bookName"
            placeholder="请输入数据集名称"
            maxlength="100"
          ></el-input>
        </el-form-item>
        <!-- 元数据 -->
        <el-form-item label="元数据(可选)" prop="bookMeta">
          <el-input
            v-model="bookForm.bookMeta"
            placeholder='JSON格式，例如: {"author":"张三","year":2023}'
            type="textarea"
            rows="3"
          ></el-input>
          <div style="color: #606266; font-size: 12px; margin-top: 5px">
            可选填，需符合JSON格式
          </div>
        </el-form-item>
        <!-- 文件上传 -->
        <el-form-item label="数据集文件" prop="files">
          <el-upload
            ref="upload"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :show-file-list="true"
            multiple
            accept=".pdf,.epub,.txt,.md,.json,.jsonl,.yaml,.yml,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.bmp,.gif,.webp"
            action=""
          >
            <el-button size="small" type="primary">选择文件</el-button>
            <template v-slot:tip>
              <div  class="el-upload__tip">
                支持多文件上传（PDF、文本、JSON、Word、Excel、图片等）
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template v-slot:footer>
        <div  class="dialog-footer">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" @click="submitForm">提交</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 重命名弹窗 -->
    <el-dialog
      title="重命名数据集"
      v-model="renameDialogVisible"
      width="400px"
    >
      <el-form :model="renameForm" :rules="renameRules" ref="renameForm">
        <el-form-item label="原名称" prop="oldName">
          <el-input v-model="renameForm.oldName" disabled />
        </el-form-item>
        <el-form-item label="新名称" prop="newName">
          <el-input
            v-model="renameForm.newName"
            placeholder="请输入新名称"
          />
        </el-form-item>
      </el-form>
      <template v-slot:footer>
        <div  class="dialog-footer">
          <el-button @click="renameDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitRename">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 索引查看弹窗 -->
    <el-dialog
      title="数据集索引"
      v-model="indexDialogVisible"
      width="60%"
    >
      <pre>{{ bookIndex }}</pre>
    </el-dialog>

    <!-- 数据集查询弹窗 -->
    <el-dialog
      title="数据集查询"
      v-model="queryDialogVisible"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-if="currentBook">
        <p style="margin-bottom: 15px;">查询数据集: {{ currentBook.name }}</p>

        <el-input
          v-model="userQuery"
          placeholder="请输入您的问题..."
          type="textarea"
          :rows="4"
          style="margin-bottom: 10px;"
        ></el-input>

        <div style="text-align: right;">
          <el-button
            size="small"
            @click="queryDialogVisible = false"
          >
            取消
          </el-button>
          <el-button
            size="small"
            type="primary"
            @click="sendQuery"
            :loading="isQuerying"
            :disabled="!userQuery.trim()"
          >
            发送查询
          </el-button>
        </div>

        <!-- 查询结果展示区域 -->
        <div v-if="queryResult" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
          <h4 style="margin-bottom: 10px; color: #67C23A;">查询结果</h4>
          <div class="query-answer">
            {{ queryResult.content }}
          </div>

          <div v-if="queryResult.original_text" class="query-source">
            <h5 style="margin: 10px 0; color: #909399;">引用原文:</h5>
            <div style="padding: 10px; background: #f5f7fa; border-radius: 4px; font-size: 13px;">
              {{ queryResult.original_text }}
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 知识图谱弹窗 - 重构版本 -->
    <el-dialog
      title="汽车供应链知识图谱"
      v-model="knowledgeGraphDialogVisible"
      width="95%"
      height="95vh"
      append-to-body
      fullscreen="false"
      :close-on-click-modal="false"
      :before-close="closeKnowledgeGraphDialog"
    >
      <!-- 知识图谱控制栏 - 左侧筛选器和右侧工具栏 -->
      <div style="display: flex; height: 100%;">
        <!-- 左侧筛选面板 - 新增 -->
        <div style="width: 240px; border-right: 1px solid #e0e0e0; padding: 15px; overflow-y: auto; background: #f8f9fa;">
          <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: 600;">节点筛选</h3>
          
          <div style="margin-bottom: 20px;">
            <div style="font-weight: 500; margin-bottom: 8px; color: #333;">节点类型</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <el-checkbox 
                v-for="category in graphData.categories" 
                :key="category.name"
                v-model="filterCategories[category.name]"
                @change="applyNodeFilter"
              >
                <span style="display: flex; align-items: center;">
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: {{ getCategoryColor(category.name) }}; margin-right: 6px;"></span>
                  {{ category.name }} ({{ getCategoryNodeCount(category.name) }})
                </span>
              </el-checkbox>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <div style="font-weight: 500; margin-bottom: 8px; color: #333;">按城市筛选</div>
            <el-select v-model="filterCity" placeholder="选择城市" clearable filterable style="width: 100%;" @change="applyNodeFilter">
              <el-option 
                v-for="city in uniqueCities" 
                :key="city" 
                :label="city" 
                :value="city" 
              />
            </el-select>
          </div>
          
          <div style="margin-bottom: 20px;">
            <div style="font-weight: 500; margin-bottom: 8px; color: #333;">按产品类型</div>
            <el-select v-model="filterProductType" placeholder="选择产品" clearable filterable style="width: 100%;" @change="applyNodeFilter">
              <el-option 
                v-for="product in uniqueProductTypes" 
                :key="product" 
                :label="product" 
                :value="product" 
              />
            </el-select>
          </div>
          
          <div style="margin-bottom: 20px;">
            <div style="font-weight: 500; margin-bottom: 8px; color: #333;">活跃度阈值</div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 12px;">{{ minActivity }}</span>
              <el-slider v-model="activityThreshold" :min="0" :max="100" style="flex: 1;" @change="applyNodeFilter" />
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">显示交易频次 ≥ {{ activityThreshold }} 的节点</div>
          </div>
          
          <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 15px;">
            <h4 style="font-size: 14px; margin: 0 0 10px 0;">可用的知识库</h4>
            <el-radio-group v-model="selectedKnowledgeBase" style="display: flex; flex-direction: column; gap: 8px;">
              <el-radio value="supply_chain" border style="width: 100%;">汽车供应链主库 (143个实体)</el-radio>
              <el-radio value="export_data" border style="width: 100%;">出口贸易数据集 (87个实体)</el-radio>
              <el-radio value="domestic" border style="width: 100%;">国内经销数据集 (65个实体)</el-radio>
            </el-radio-group>
          </div>
        </div>
        
        <!-- 中间图谱区域 -->
        <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
          <!-- 顶部工具栏 -->
          <div style="padding: 10px 15px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 15px; background: white;">
            <el-input 
              v-model="kgSearchText" 
              placeholder="搜索节点名称 (如'比亚迪'、'宁德时代')" 
              style="width: 300px"
              @keyup.enter="searchKGNode"
              clearable
            />
            <el-button type="primary" size="small" @click="searchKGNode">搜索</el-button>
            <el-button size="small" @click="resetKGView">重置视图</el-button>
            <el-button size="small" @click="refreshKG">刷新图谱</el-button>
            
            <!-- 版本管理 -->
            <el-select 
              v-model="selectedVersion" 
              placeholder="选择版本" 
              size="small"
              style="width: 150px"
              @change="loadVersion"
            >
              <el-option
                v-for="version in graphVersions"
                :key="version.id"
                :label="`版本 ${version.id}: ${version.description}`"
                :value="version.id"
              />
            </el-select>
            
            <el-button size="small" @click="saveCurrentVersion">保存版本</el-button>
            <el-button size="small" @click="exportKnowledgeGraph" type="success">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
            
            <span style="margin-left: auto; font-size: 12px; color: #666;">
              最后更新：{{ lastUpdateTime }}
            </span>
          </div>
          
          <!-- 统计信息卡片 -->
          <div style="padding: 5px 15px; background: #f5f7fa; border-bottom: 1px solid #eee;">
            <div style="display: flex; gap: 20px; font-size: 12px; align-items: center;">
              <span><strong>实体数：</strong>{{ filteredNodes.length }} / {{ graphData.nodes.length }}</span>
              <span><strong>关系数：</strong>{{ filteredLinks.length }} / {{ graphData.links.length }}</span>
              <el-button type="text" size="small" @click="showStatistics = !showStatistics">
                {{ showStatistics ? '隐藏统计' : '显示统计' }}
              </el-button>
            </div>
            
            <div v-if="showStatistics" style="margin-top: 8px; padding: 8px; background: white; border-radius: 4px; font-size: 12px;">
              <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div><span style="color: #666;">新增节点：</span><span style="font-weight: 600;">{{ stats.newNodes }}</span></div>
                <div><span style="color: #666;">新增关系：</span><span style="font-weight: 600;">{{ stats.newLinks }}</span></div>
                <div><span style="color: #666;">去重节点：</span><span style="font-weight: 600;">{{ stats.duplicateNodes }}</span></div>
                <div><span style="color: #666;">去重关系：</span><span style="font-weight: 600;">{{ stats.duplicateLinks }}</span></div>
                <div><span style="color: #666;">补全关系：</span><span style="font-weight: 600;">{{ stats.completedLinks }}</span></div>
              </div>
            </div>
          </div>
          
          <!-- ECharts容器 -->
          <div id="knowledge-graph-container" style="flex: 1; width: 100%;"></div>
        </div>
        
        <!-- 右侧节点详情面板 - 新增 -->
        <div style="width: 280px; border-left: 1px solid #e0e0e0; padding: 15px; overflow-y: auto; background: #f8f9fa;">
          <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: 600;">节点详细信息</h3>
          
          <div v-if="selectedNode" class="node-detail">
            <div style="margin-bottom: 15px; text-align: center;">
              <div style="width: 60px; height: 60px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; background: {{ getCategoryColor(selectedNode.categoryName) }}; color: white; font-size: 24px;">
                {{ selectedNode.name.charAt(0) }}
              </div>
              <h4 style="margin: 10px 0 5px 0; font-size: 16px;">{{ selectedNode.name }}</h4>
              <el-tag size="small" :type="getNodeTagType(selectedNode.type)">{{ selectedNode.categoryName }}</el-tag>
            </div>
            
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="说明">{{ selectedNode.desc || '暂无描述' }}</el-descriptions-item>
              <el-descriptions-item label="活跃度">{{ selectedNode.activity }} 次交易</el-descriptions-item>
              <el-descriptions-item label="城市">{{ selectedNode.city || '未知' }}</el-descriptions-item>
              <el-descriptions-item label="产品类型">{{ selectedNode.productType || '多产品' }}</el-descriptions-item>
              <el-descriptions-item label="关联关系">{{ selectedNode.relationCount || 0 }} 条</el-descriptions-item>
            </el-descriptions>
            
            <div style="margin-top: 15px;">
              <h5 style="margin: 0 0 8px 0; font-size: 14px;">关联节点 ({{ selectedNode.relations?.length || 0 }})</h5>
              <div v-if="selectedNode.relations && selectedNode.relations.length > 0" style="max-height: 200px; overflow-y: auto;">
                <div v-for="rel in selectedNode.relations" :key="rel.name" style="display: flex; align-items: center; padding: 6px; border-bottom: 1px solid #eee;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: {{ getCategoryColor(rel.categoryName) }}; margin-right: 6px;"></span>
                  <span style="flex: 1;">{{ rel.name }}</span>
                  <span style="font-size: 11px; color: #666;">{{ rel.relation }}</span>
                </div>
              </div>
              <div v-else style="color: #999; text-align: center; padding: 10px;">暂无关联节点</div>
            </div>
            
            <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center;">
              <el-button size="small" @click="focusOnNode(selectedNode)">聚焦节点</el-button>
              <el-button size="small" type="primary" @click="expandNode(selectedNode)">展开关联</el-button>
            </div>
          </div>
          
          <div v-else style="color: #999; text-align: center; padding: 30px 0;">
            <el-icon size="40"><InfoFilled /></el-icon>
            <p style="margin-top: 10px;">点击图谱中的节点查看详细信息</p>
          </div>
        </div>
      </div>
      
      <template v-slot:footer>
        <div class="dialog-footer">
          <el-button @click="closeKnowledgeGraphDialog">关闭</el-button>
          <el-button type="primary" @click="mergeToGraph" :disabled="!extractedData.nodes.length">
            合并到图谱
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 知识抽取配置弹窗 -->
    <el-dialog
      title="知识抽取配置"
      v-model="knowledgeExtractDialogVisible"
      width="600px"
    >
      <el-form :model="extractConfig" label-width="120px">
        <el-form-item label="抽取模型">
          <el-select v-model="extractConfig.model" style="width: 100%">
            <el-option label="Light (轻量级)" value="light" />
            <el-option label="General (通用型)" value="general" />
            <el-option label="Advanced (高级版)" value="advanced" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="实体类型">
          <el-checkbox-group v-model="extractConfig.entityTypes">
            <el-checkbox label="manufacturer" border>制造商</el-checkbox>
            <el-checkbox label="supplier" border>供应商</el-checkbox>
            <el-checkbox label="distributor" border>销售商</el-checkbox>
            <el-checkbox label="product" border>产品</el-checkbox>
            <el-checkbox label="city" border>城市</el-checkbox>
            <el-checkbox label="month" border>月份</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="关系类型">
          <el-checkbox-group v-model="extractConfig.relationTypes">
            <el-checkbox label="supply" border>供给关系</el-checkbox>
            <el-checkbox label="sell_export" border>销售(出口)</el-checkbox>
            <el-checkbox label="sell_domestic" border>销售(国内)</el-checkbox>
            <el-checkbox label="cooperate" border>合作关系</el-checkbox>
            <el-checkbox label="belong" border>从属关系</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="去重阈值">
          <el-slider v-model="extractConfig.similarityThreshold" :min="0.5" :max="1" :step="0.05" show-input />
        </el-form-item>
        
        <el-form-item label="关系补全">
          <el-switch v-model="extractConfig.autoCompleteRelations" />
        </el-form-item>
        
        <el-form-item label="置信度过滤">
          <el-slider v-model="extractConfig.confidenceThreshold" :min="0.1" :max="1" :step="0.1" show-input />
        </el-form-item>
        
        <el-form-item label="选择文件">
          <el-select v-model="extractConfig.selectedFile" placeholder="请选择要抽取的文件" style="width: 100%">
            <el-option
              v-for="file in availableFiles"
              :key="file.name"
              :label="`${file.name} (${file.ocrPercentage === 100 ? '已解析' : '未解析'})`"
              :value="file.name"
              :disabled="file.ocrPercentage < 100"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template v-slot:footer>
        <div class="dialog-footer">
          <el-button @click="knowledgeExtractDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="startKnowledgeExtraction">开始抽取</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import {Plus, House, Setting, Aim, Coin, Shop, Search, Download, Delete, Edit, Refresh, FolderOpened, HelpFilled, MagicStick, InfoFilled, Share} from "@element-plus/icons-vue";
import {computed, nextTick, ref, onMounted, onUnmounted} from "vue";
// 引入ECharts
import * as echarts from 'echarts';
import {
  getKnowledgeBookList,
  importKnowledgeBook,
  analyzeKnowledgeBook,
  getKnowledgeBookProgress,
  getKnowledgeBookIndex,
  renameKnowledgeBook,
  deleteKnowledgeBook,
  downloadKnowledgeBook,
  queryKnowledgeBook,
  getKnowledgeBookCognitiveModel,
  updateKnowledgeBookTree,
  updateKnowledgeBookCategories
} from '@/api/knowledgeBase';
import {
  getKnowledgeGraphCurrent,
  saveKnowledgeGraphVersion,
  loadKnowledgeGraphVersion,
  mergeKnowledgeGraph,
  exportKnowledgeGraph as exportKnowledgeGraphFile
} from '@/api/knowledgeGraph';

export default {
  name: "PowerGame_KnowledgeCreate",
  components: {InfoFilled, Edit, Delete, Download, Search, Shop, Plus, House, Setting, Aim, Coin, Refresh, FolderOpened, HelpFilled, MagicStick, Share},
  setup(){},
  data(){
    return{
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
        knowledgeMapCategory: ['manufacturer', 'supplier', 'distributor', 'product', 'city'],
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
        {icon: Coin, name: '数据集'},
        {icon: Aim, name: '检索测试'},
        {icon: Setting, name: '配置'},
        {icon: Share, name: '知识图谱'},
      ],
      datasetData: [],
      filterTableData: [],
      docNameSearch: '',
      batchSelection: '',
      batchSelectionDisabled: true,
      batchOptions: [
        {value: 0, label: '启用'},
        {value: 1, label: '禁用'},
        {value: 2, label: '解析'},
        {value: 3, label: '取消'},
        {value: 4, label: '删除'},
      ],
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
        files: []
      },
      rules: {
        bookName: [
          { required: true, message: '请输入数据集名称', trigger: 'blur' }
        ],
        files: [
          { required: true, message: '请选择数据集文件', trigger: 'change' }
        ]
      },
      filteredData: [],
      renameDialogVisible: false,
      renameForm: {
        oldName: '',
        newName: ''
      },
      renameRules: {
        newName: [
          { required: true, message: '请输入新名称', trigger: 'blur' },
          { min: 1, max: 50, message: '名称长度在 1 到 50 个字符', trigger: 'blur' }
        ]
      },
      indexDialogVisible: false,
      bookIndex: '',
      progressInterval: null,
      queryDialogVisible: false,
      currentBook: null,
      userQuery: '',
      isQuerying: false,
      queryResult: null,
      retrievalPreviewResult: null,
      knowledgeGraphDialogVisible: false,
      knowledgeExtractDialogVisible: false,
      chartInstance: null,
      previewChartInstance: null,
      kgSearchText: '',
      lastUpdateTime: '',
      showStatistics: false,
      selectedVersion: null,
      extractedData: {
        nodes: [],
        links: []
      },
      stats: {
        newNodes: 0,
        newLinks: 0,
        duplicateNodes: 0,
        duplicateLinks: 0,
        completedLinks: 0
      },
      // 筛选相关状态 - 新增
      filterCategories: {},
      filterCity: '',
      filterProductType: '',
      activityThreshold: 30,
      selectedKnowledgeBase: 'supply_chain',
      minActivity: 0,
      maxActivity: 100,
      filteredNodes: [],
      filteredLinks: [],
      // 选中的节点 - 新增
      selectedNode: null,
      // 唯一值列表
      uniqueCities: [],
      uniqueProductTypes: ['整车', '电池系统', '电子/智驾/座舱', '电驱/变速箱', '线束/连接器', '轮胎', '车身/底盘'],
      
      extractConfig: {
        model: 'general',
        entityTypes: ['manufacturer', 'supplier', 'distributor', 'product', 'city'],
        relationTypes: ['supply', 'sell_export', 'sell_domestic', 'cooperate', 'belong'],
        similarityThreshold: 0.8,
        autoCompleteRelations: true,
        confidenceThreshold: 0.6,
        selectedFile: ''
      },
      graphVersions: [],
      
      // ========== 汽车供应链知识图谱核心数据 ==========
      // 节点（nodes）：143个实体，涵盖4类核心主体
      // - 制造商（38个）：一汽-大众、比亚迪、上汽等汽车生产企业
      // - 供应商（25个）：宁德时代、博世、华为车BU等零部件供应商
      // - 销售商（17个）：各港口出口渠道、城市经销网络
      // - 产品（8个）：整车、电池系统、电子部件等
      // - 城市（34个）：国内外企业所在城市
      // - 月份（21个）：2024-01至2025-09的交易时间
      
      graphData: {
        nodes: [
          // ========== 制造商（38个） ==========
          { id: 'yqdz', name: '一汽-大众', category: 0, type: 'manufacturer', city: '长春', desc: '汽车制造商，主要生产大众品牌车型', activity: 0 },
          { id: 'yqft', name: '一汽丰田', category: 0, type: 'manufacturer', city: '天津', desc: '汽车制造商，主要生产丰田品牌车型', activity: 0 },
          { id: 'sqcy', name: '上汽乘用车', category: 0, type: 'manufacturer', city: '上海', desc: '上汽集团自主品牌乘用车制造商', activity: 0 },
          { id: 'sqty', name: '上汽通用', category: 0, type: 'manufacturer', city: '上海', desc: '上汽与通用合资汽车制造商', activity: 0 },
          { id: 'dfrc', name: '东风日产', category: 0, type: 'manufacturer', city: '广州', desc: '东风与日产合资汽车制造商', activity: 0 },
          { id: 'bjbc', name: '北京奔驰', category: 0, type: 'manufacturer', city: '北京', desc: '北汽与奔驰合资汽车制造商', activity: 0 },
          { id: 'hcbm', name: '华晨宝马', category: 0, type: 'manufacturer', city: '沈阳', desc: '华晨与宝马合资汽车制造商', activity: 0 },
          { id: 'jlqc', name: '吉利汽车', category: 0, type: 'manufacturer', city: '杭州', desc: '中国领先的自主品牌汽车制造商', activity: 0 },
          { id: 'qrqc', name: '奇瑞汽车', category: 0, type: 'manufacturer', city: '芜湖', desc: '中国自主品牌汽车制造商，出口业务强劲', activity: 0 },
          { id: 'xp', name: '小鹏', category: 0, type: 'manufacturer', city: '广州', desc: '中国新势力造车企业，专注智能电动汽车', activity: 0 },
          { id: 'gqft', name: '广汽丰田', category: 0, type: 'manufacturer', city: '广州', desc: '广汽与丰田合资汽车制造商', activity: 0 },
          { id: 'gqga', name: '广汽埃安', category: 0, type: 'manufacturer', city: '广州', desc: '广汽集团新能源品牌', activity: 0 },
          { id: 'gqbt', name: '广汽本田', category: 0, type: 'manufacturer', city: '广州', desc: '广汽与本田合资汽车制造商', activity: 0 },
          { id: 'byd', name: '比亚迪', category: 0, type: 'manufacturer', city: '深圳', desc: '中国新能源汽车领军企业', activity: 0 },
          { id: 'tsl', name: '特斯拉(上海)', category: 0, type: 'manufacturer', city: '上海', desc: '美国特斯拉在上海的超级工厂', activity: 0 },
          { id: 'lx', name: '理想', category: 0, type: 'manufacturer', city: '北京', desc: '中国新势力造车企业，专注增程式电动车', activity: 0 },
          { id: 'wl', name: '蔚来', category: 0, type: 'manufacturer', city: '合肥', desc: '中国新势力造车企业，专注高端智能电动车', activity: 0 },
          { id: 'ccqc', name: '长城汽车', category: 0, type: 'manufacturer', city: '保定', desc: '中国自主品牌汽车制造商，SUV和皮卡见长', activity: 0 },
          { id: 'caqc', name: '长安汽车', category: 0, type: 'manufacturer', city: '重庆', desc: '中国自主品牌汽车制造商', activity: 0 },
          
          // ========== 供应商（25个） ==========
          // 线束/连接器供应商
          { id: 'jsdz', name: '均胜电子', category: 1, type: 'supplier', city: '东莞', desc: '汽车电子与线束供应商', productType: '线束/连接器', activity: 0 },
          { id: 'lxjm', name: '立讯精密', category: 1, type: 'supplier', city: '东莞', desc: '精密制造与连接器供应商', productType: '线束/连接器', activity: 0 },
          
          // 轮胎供应商
          { id: 'zcxj', name: '中策橡胶', category: 1, type: 'supplier', city: '杭州', desc: '轮胎制造商', productType: '轮胎', activity: 0 },
          { id: 'plst', name: '普利司通', category: 1, type: 'supplier', city: '东京', desc: '日本轮胎制造商', productType: '轮胎', activity: 0 },
          { id: 'mlx', name: '米其林', category: 1, type: 'supplier', city: '巴黎', desc: '法国轮胎制造商', productType: '轮胎', activity: 0 },
          
          // 电子/智驾/座舱供应商
          { id: 'hwcb', name: '华为车BU', category: 1, type: 'supplier', city: '深圳', desc: '华为智能汽车解决方案BU', productType: '电子/智驾/座舱', activity: 0 },
          { id: 'dpx', name: '地平线', category: 1, type: 'supplier', city: '北京', desc: '智能驾驶芯片供应商', productType: '电子/智驾/座舱', activity: 0 },
          { id: 'aptiv', name: '安波福', category: 1, type: 'supplier', city: '都柏林', desc: '全球汽车电子供应商', productType: '电子/智驾/座舱', activity: 0 },
          { id: 'dsxw', name: '德赛西威', category: 1, type: 'supplier', city: '惠州', desc: '智能座舱与驾驶辅助系统供应商', productType: '电子/智驾/座舱', activity: 0 },
          { id: 'nvidia', name: '英伟达', category: 1, type: 'supplier', city: '圣克拉拉', desc: '自动驾驶芯片供应商', productType: '电子/智驾/座舱', activity: 0 },
          
          // 电驱/变速箱供应商
          { id: 'bydfd', name: '比亚迪弗迪动力', category: 1, type: 'supplier', city: '东京', desc: '比亚迪旗下动力总成供应商', productType: '电驱/变速箱', activity: 0 },
          { id: 'aisin', name: '爱信', category: 1, type: 'supplier', city: '名古屋', desc: '日本变速箱制造商', productType: '电驱/变速箱', activity: 0 },
          { id: 'lhdl', name: '联合电子', category: 1, type: 'supplier', city: '上海', desc: '汽车电子与动力系统供应商', productType: '电驱/变速箱', activity: 0 },
          { id: 'zf', name: '采埃孚', category: 1, type: 'supplier', city: '上海', desc: '德国变速箱与底盘技术供应商', productType: '电驱/变速箱', activity: 0 },
          
          // 电池系统供应商
          { id: 'lg', name: 'LG能源', category: 1, type: 'supplier', city: '首尔', desc: '韩国电池供应商', productType: '电池系统', activity: 0 },
          { id: 'zxcx', name: '中创新航', category: 1, type: 'supplier', city: '厦门', desc: '中国动力电池供应商', productType: '电池系统', activity: 0 },
          { id: 'ndsd', name: '宁德时代', category: 1, type: 'supplier', city: '厦门', desc: '全球领先的动力电池供应商', productType: '电池系统', activity: 0 },
          { id: 'xsny', name: '松下能源', category: 1, type: 'supplier', city: '大阪', desc: '日本电池供应商，特斯拉合作伙伴', productType: '电池系统', activity: 0 },
          { id: 'byddc', name: '比亚迪电池', category: 1, type: 'supplier', city: '深圳', desc: '比亚迪旗下电池供应商', productType: '电池系统', activity: 0 },
          { id: 'fcny', name: '蜂巢能源', category: 1, type: 'supplier', city: '深圳', desc: '中国动力电池供应商', productType: '电池系统', activity: 0 },
          
          // 车身/底盘供应商
          { id: 'yqfw', name: '一汽富维', category: 1, type: 'supplier', city: '长春', desc: '一汽旗下车身零部件供应商', productType: '车身/底盘', activity: 0 },
          { id: 'hyqc', name: '华域汽车', category: 1, type: 'supplier', city: '上海', desc: '上汽旗下零部件供应商', productType: '车身/底盘', activity: 0 },
          { id: 'bs', name: '博世', category: 1, type: 'supplier', city: '苏州', desc: '全球汽车技术供应商', productType: '车身/底盘', activity: 0 },
          { id: 'dljt', name: '大陆集团', category: 1, type: 'supplier', city: '上海', desc: '德国汽车零部件供应商', productType: '车身/底盘', activity: 0 },
          
          // ========== 销售商（17个） ==========
          // 出口渠道
          { id: 'sea_port', name: '东南亚(深圳港)', category: 2, type: 'distributor', city: '新加坡', desc: '东南亚出口渠道', activity: 0 },
          { id: 'me_port', name: '中东/海湾(天津港)', category: 2, type: 'distributor', city: '阿布扎比', desc: '中东地区出口渠道', activity: 0 },
          { id: 'ru_port', name: '俄罗斯/中亚(大连港)', category: 2, type: 'distributor', city: '圣彼得堡', desc: '俄罗斯及中亚出口渠道', activity: 0 },
          { id: 'la_port', name: '拉美(宁波舟山港)', category: 2, type: 'distributor', city: '阿卡胡特拉', desc: '拉美地区出口渠道', activity: 0 },
          { id: 'eu_port', name: '欧洲渠道(上海港)', category: 2, type: 'distributor', city: '马赛', desc: '欧洲出口渠道', activity: 0 },
          { id: 'au_port', name: '澳新(青岛港)', category: 2, type: 'distributor', city: '奥克兰', desc: '澳大利亚和新西兰出口渠道', activity: 0 },
          
          // 国内经销网络
          { id: 'sh_network', name: '上海经销网络', category: 2, type: 'distributor', city: '上海', desc: '上海地区经销商网络', activity: 0 },
          { id: 'bj_network', name: '北京经销网络', category: 2, type: 'distributor', city: '北京', desc: '北京地区经销商网络', activity: 0 },
          { id: 'gz_network', name: '广州经销网络', category: 2, type: 'distributor', city: '广州', desc: '广州地区经销商网络', activity: 0 },
          { id: 'cd_network', name: '成都经销网络', category: 2, type: 'distributor', city: '成都', desc: '成都地区经销商网络', activity: 0 },
          { id: 'hz_network', name: '杭州经销网络', category: 2, type: 'distributor', city: '杭州', desc: '杭州地区经销商网络', activity: 0 },
          { id: 'wh_network', name: '武汉经销网络', category: 2, type: 'distributor', city: '武汉', desc: '武汉地区经销商网络', activity: 0 },
          { id: 'sz_network', name: '深圳经销网络', category: 2, type: 'distributor', city: '深圳', desc: '深圳地区经销商网络', activity: 0 },
          { id: 'xa_network', name: '西安经销网络', category: 2, type: 'distributor', city: '西安', desc: '西安地区经销商网络', activity: 0 },
          { id: 'zz_network', name: '郑州经销网络', category: 2, type: 'distributor', city: '郑州', desc: '郑州地区经销商网络', activity: 0 },
          { id: 'cq_network', name: '重庆经销网络', category: 2, type: 'distributor', city: '重庆', desc: '重庆地区经销商网络', activity: 0 },
          { id: 'other_network', name: '其他城市经销', category: 2, type: 'distributor', city: '全国', desc: '其他城市经销商网络', activity: 0 },
          
          // ========== 产品（8个） ==========
          { id: 'product_vehicle', name: '整车', category: 3, type: 'product', desc: '整车产品', activity: 0 },
          { id: 'product_battery', name: '电池系统', category: 3, type: 'product', desc: '动力电池系统', activity: 0 },
          { id: 'product_electronics', name: '电子/智驾/座舱', category: 3, type: 'product', desc: '智能驾驶与座舱电子', activity: 0 },
          { id: 'product_powertrain', name: '电驱/变速箱', category: 3, type: 'product', desc: '电驱动系统和变速箱', activity: 0 },
          { id: 'product_wiring', name: '线束/连接器', category: 3, type: 'product', desc: '汽车线束和连接器', activity: 0 },
          { id: 'product_tire', name: '轮胎', category: 3, type: 'product', desc: '汽车轮胎', activity: 0 },
          { id: 'product_chassis', name: '车身/底盘', category: 3, type: 'product', desc: '车身和底盘系统', activity: 0 },
          
          // ========== 城市（34个） ==========
          // 国内城市
          { id: 'city_beijing', name: '北京', category: 4, type: 'city', desc: '中国首都，汽车产业重镇', activity: 0 },
          { id: 'city_shanghai', name: '上海', category: 4, type: 'city', desc: '中国经济中心，汽车产业基地', activity: 0 },
          { id: 'city_guangzhou', name: '广州', category: 4, type: 'city', desc: '华南汽车产业中心', activity: 0 },
          { id: 'city_shenzhen', name: '深圳', category: 4, type: 'city', desc: '中国科技创新中心，比亚迪总部', activity: 0 },
          { id: 'city_tianjin', name: '天津', category: 4, type: 'city', desc: '北方汽车产业重镇', activity: 0 },
          { id: 'city_chongqing', name: '重庆', category: 4, type: 'city', desc: '西部汽车产业中心', activity: 0 },
          { id: 'city_changchun', name: '长春', category: 4, type: 'city', desc: '中国汽车工业摇篮，一汽总部', activity: 0 },
          { id: 'city_shenyang', name: '沈阳', category: 4, type: 'city', desc: '华晨宝马生产基地', activity: 0 },
          { id: 'city_hangzhou', name: '杭州', category: 4, type: 'city', desc: '吉利汽车总部', activity: 0 },
          { id: 'city_wuhu', name: '芜湖', category: 4, type: 'city', desc: '奇瑞汽车总部', activity: 0 },
          { id: 'city_hefei', name: '合肥', category: 4, type: 'city', desc: '蔚来汽车总部', activity: 0 },
          { id: 'city_baoding', name: '保定', category: 4, type: 'city', desc: '长城汽车总部', activity: 0 },
          { id: 'city_chengdu', name: '成都', category: 4, type: 'city', desc: '西部汽车消费重镇', activity: 0 },
          { id: 'city_wuhan', name: '武汉', category: 4, type: 'city', desc: '中部汽车产业重镇', activity: 0 },
          { id: 'city_xian', name: '西安', category: 4, type: 'city', desc: '西北汽车消费中心', activity: 0 },
          { id: 'city_zhengzhou', name: '郑州', category: 4, type: 'city', desc: '中原汽车消费中心', activity: 0 },
          { id: 'city_dongguan', name: '东莞', category: 4, type: 'city', desc: '珠三角电子产业重镇', activity: 0 },
          { id: 'city_huizhou', name: '惠州', category: 4, type: 'city', desc: '德赛西威总部', activity: 0 },
          { id: 'city_xiamen', name: '厦门', category: 4, type: 'city', desc: '中创新航、宁德时代所在地', activity: 0 },
          { id: 'city_suzhou', name: '苏州', category: 4, type: 'city', desc: '博世中国总部', activity: 0 },
          
          // 国外城市
          { id: 'city_tokyo', name: '东京', category: 4, type: 'city', desc: '日本首都，普利司通总部', activity: 0 },
          { id: 'city_osaka', name: '大阪', category: 4, type: 'city', desc: '松下能源总部', activity: 0 },
          { id: 'city_nagoya', name: '名古屋', category: 4, type: 'city', desc: '爱信总部', activity: 0 },
          { id: 'city_seoul', name: '首尔', category: 4, type: 'city', desc: '韩国首都，LG能源总部', activity: 0 },
          { id: 'city_paris', name: '巴黎', category: 4, type: 'city', desc: '法国首都，米其林总部', activity: 0 },
          { id: 'city_dublin', name: '都柏林', category: 4, type: 'city', desc: '爱尔兰首都，安波福总部', activity: 0 },
          { id: 'city_santaclara', name: '圣克拉拉', category: 4, type: 'city', desc: '英伟达总部', activity: 0 },
          { id: 'city_singapore', name: '新加坡', category: 4, type: 'city', desc: '东南亚贸易中心', activity: 0 },
          { id: 'city_abudhabi', name: '阿布扎比', category: 4, type: 'city', desc: '阿联酋首都', activity: 0 },
          { id: 'city_stpetersburg', name: '圣彼得堡', category: 4, type: 'city', desc: '俄罗斯第二大城市', activity: 0 },
          { id: 'city_akhachutla', name: '阿卡胡特拉', category: 4, type: 'city', desc: '萨尔瓦多港口城市', activity: 0 },
          { id: 'city_marseille', name: '马赛', category: 4, type: 'city', desc: '法国港口城市', activity: 0 },
          { id: 'city_auckland', name: '奥克兰', category: 4, type: 'city', desc: '新西兰最大城市', activity: 0 },
          
          // ========== 月份（21个） ==========
          { id: 'month_202401', name: '2024-01', category: 5, type: 'month', desc: '2024年1月', activity: 0 },
          { id: 'month_202402', name: '2024-02', category: 5, type: 'month', desc: '2024年2月', activity: 0 },
          { id: 'month_202403', name: '2024-03', category: 5, type: 'month', desc: '2024年3月', activity: 0 },
          { id: 'month_202404', name: '2024-04', category: 5, type: 'month', desc: '2024年4月', activity: 0 },
          { id: 'month_202405', name: '2024-05', category: 5, type: 'month', desc: '2024年5月', activity: 0 },
          { id: 'month_202406', name: '2024-06', category: 5, type: 'month', desc: '2024年6月', activity: 0 },
          { id: 'month_202407', name: '2024-07', category: 5, type: 'month', desc: '2024年7月', activity: 0 },
          { id: 'month_202408', name: '2024-08', category: 5, type: 'month', desc: '2024年8月', activity: 0 },
          { id: 'month_202409', name: '2024-09', category: 5, type: 'month', desc: '2024年9月', activity: 0 },
          { id: 'month_202410', name: '2024-10', category: 5, type: 'month', desc: '2024年10月', activity: 0 },
          { id: 'month_202411', name: '2024-11', category: 5, type: 'month', desc: '2024年11月', activity: 0 },
          { id: 'month_202412', name: '2024-12', category: 5, type: 'month', desc: '2024年12月', activity: 0 },
          { id: 'month_202501', name: '2025-01', category: 5, type: 'month', desc: '2025年1月', activity: 0 },
          { id: 'month_202502', name: '2025-02', category: 5, type: 'month', desc: '2025年2月', activity: 0 },
          { id: 'month_202503', name: '2025-03', category: 5, type: 'month', desc: '2025年3月', activity: 0 },
          { id: 'month_202504', name: '2025-04', category: 5, type: 'month', desc: '2025年4月', activity: 0 },
          { id: 'month_202505', name: '2025-05', category: 5, type: 'month', desc: '2025年5月', activity: 0 },
          { id: 'month_202506', name: '2025-06', category: 5, type: 'month', desc: '2025年6月', activity: 0 },
          { id: 'month_202507', name: '2025-07', category: 5, type: 'month', desc: '2025年7月', activity: 0 },
          { id: 'month_202508', name: '2025-08', category: 5, type: 'month', desc: '2025年8月', activity: 0 },
          { id: 'month_202509', name: '2025-09', category: 5, type: 'month', desc: '2025年9月', activity: 0 }
        ],
        
        // 关系（links）：1784个关系，3种核心业务关系
        // - 供给关系：上游向下游提供产品（9871条）
        // - 销售(国内)：国内经销网络销售（4389条）
        // - 销售(出口)：港口出口销售（2371条）
        // 注：这里只展示部分代表性关系，完整数据在实际项目中会动态加载
        
        links: [
          // ========== 供给关系 ==========
          // 均胜电子 - 制造商
          { source: 'jsdz', target: 'yqdz', label: '供给', type: 'supply', product: '线束/连接器', amount: '1.119', amountUnit: '万', value: '0.448' },
          { source: 'jsdz', target: 'yqft', label: '供给', type: 'supply', product: '线束/连接器', amount: '0.488', amountUnit: '万', value: '0.195' },
          { source: 'jsdz', target: 'sqcy', label: '供给', type: 'supply', product: '线束/连接器', amount: '0.826', amountUnit: '万', value: '0.33' },
          { source: 'jsdz', target: 'byd', label: '供给', type: 'supply', product: '线束/连接器', amount: '2.402', amountUnit: '万', value: '0.961' },
          
          // 立讯精密 - 制造商
          { source: 'lxjm', target: 'yqdz', label: '供给', type: 'supply', product: '线束/连接器', amount: '0.366', amountUnit: '万', value: '0.146' },
          { source: 'lxjm', target: 'jlqc', label: '供给', type: 'supply', product: '线束/连接器', amount: '0.396', amountUnit: '万', value: '0.158' },
          { source: 'lxjm', target: 'byd', label: '供给', type: 'supply', product: '线束/连接器', amount: '0.785', amountUnit: '万', value: '0.314' },
          
          // 轮胎供应商
          { source: 'zcxj', target: 'jlqc', label: '供给', type: 'supply', product: '轮胎', amount: '0.068', amountUnit: '万', value: '0.02' },
          { source: 'plst', target: 'byd', label: '供给', type: 'supply', product: '轮胎', amount: '2.026', amountUnit: '万', value: '0.608' },
          { source: 'mlx', target: 'tsl', label: '供给', type: 'supply', product: '轮胎', amount: '0.182', amountUnit: '万', value: '0.055' },
          
          // 华为车BU
          { source: 'hwcb', target: 'jlqc', label: '供给', type: 'supply', product: '电子/智驾/座舱', amount: '0.365', amountUnit: '万', value: '0.548' },
          { source: 'hwcb', target: 'byd', label: '供给', type: 'supply', product: '电子/智驾/座舱', amount: '1.007', amountUnit: '万', value: '1.51' },
          { source: 'hwcb', target: 'tsl', label: '供给', type: 'supply', product: '电子/智驾/座舱', amount: '0.266', amountUnit: '万', value: '0.399' },
          
          // 地平线
          { source: 'dpx', target: 'jlqc', label: '供给', type: 'supply', product: '电子/智驾/座舱', amount: '0.427', amountUnit: '万', value: '0.64' },
          { source: 'dpx', target: 'byd', label: '供给', type: 'supply', product: '电子/智驾/座舱', amount: '1.176', amountUnit: '万', value: '1.764' },
          
          // 电池供应商
          { source: 'zxcx', target: 'gqga', label: '供给', type: 'supply', product: '电池系统', amount: '1.018', amountUnit: '万', value: '5.09' },
          { source: 'ndsd', target: 'tsl', label: '供给', type: 'supply', product: '电池系统', amount: '0.04', amountUnit: '万', value: '0.2' },
          { source: 'xsny', target: 'tsl', label: '供给', type: 'supply', product: '电池系统', amount: '0.282', amountUnit: '万', value: '1.41' },
          { source: 'byddc', target: 'byd', label: '供给', type: 'supply', product: '电池系统', amount: '3.968', amountUnit: '万', value: '19.84' },
          
          // 电驱/变速箱
          { source: 'bydfd', target: 'byd', label: '供给', type: 'supply', product: '电驱/变速箱', amount: '3.319', amountUnit: '万', value: '6.638' },
          { source: 'aisin', target: 'yqft', label: '供给', type: 'supply', product: '电驱/变速箱', amount: '0.446', amountUnit: '万', value: '0.892' },
          { source: 'lhdl', target: 'sqty', label: '供给', type: 'supply', product: '电驱/变速箱', amount: '0.158', amountUnit: '万', value: '0.316' },
          { source: 'zf', target: 'jlqc', label: '供给', type: 'supply', product: '电驱/变速箱', amount: '0.118', amountUnit: '万', value: '0.236' },
          
          // 车身/底盘
          { source: 'yqfw', target: 'yqdz', label: '供给', type: 'supply', product: '车身/底盘', amount: '2.947', amountUnit: '万', value: '3.536' },
          { source: 'hyqc', target: 'sqcy', label: '供给', type: 'supply', product: '车身/底盘', amount: '0.293', amountUnit: '万', value: '0.352' },
          { source: 'bs', target: 'jlqc', label: '供给', type: 'supply', product: '车身/底盘', amount: '0.561', amountUnit: '万', value: '0.673' },
          { source: 'dljt', target: 'byd', label: '供给', type: 'supply', product: '车身/底盘', amount: '0.504', amountUnit: '万', value: '0.605' },
          
          // ========== 销售(出口)关系 ==========
          // 一汽-大众出口
          { source: 'yqdz', target: 'sea_port', label: '销售(出口)', type: 'sell_export', product: '整车', amount: '0.214', amountUnit: '万', value: '3.932' },
          { source: 'yqdz', target: 'me_port', label: '销售(出口)', type: 'sell_export', product: '整车', amount: '0.202', amountUnit: '万', value: '3.712' },
          { source: 'yqdz', target: 'eu_port', label: '销售(出口)', type: 'sell_export', product: '整车', amount: '0.309', amountUnit: '万', value: '5.678' },
          
          // 比亚迪出口
          { source: 'byd', target: 'sea_port', label: '销售(出口)', type: 'sell_export', product: '整车', amount: '1.593', amountUnit: '万', value: '25.926' },
          { source: 'byd', target: 'eu_port', label: '销售(出口)', type: 'sell_export', product: '整车', amount: '2.302', amountUnit: '万', value: '37.465' },
          { source: 'byd', target: 'au_port', label: '销售(出口)', type: 'sell_export', product: '整车', amount: '0.885', amountUnit: '万', value: '14.403' },
          
          // 特斯拉出口
          { source: 'tsl', target: 'sea_port', label: '销售(出口)', type: 'sell_export', product: '整车', amount: '0.928', amountUnit: '万', value: '23.386' },
          { source: 'tsl', target: 'eu_port', label: '销售(出口)', type: 'sell_export', product: '整车', amount: '1.34', amountUnit: '万', value: '33.768' },
          
          // ========== 销售(国内)关系 ==========
          // 一汽-大众国内销售
          { source: 'yqdz', target: 'sh_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '1.639', amountUnit: '万', value: '28.683' },
          { source: 'yqdz', target: 'bj_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '1.23', amountUnit: '万', value: '21.525' },
          { source: 'yqdz', target: 'gz_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '1.503', amountUnit: '万', value: '26.302' },
          { source: 'yqdz', target: 'other_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '1.913', amountUnit: '万', value: '33.477' },
          
          // 比亚迪国内销售
          { source: 'byd', target: 'sh_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '3.187', amountUnit: '万', value: '49.398' },
          { source: 'byd', target: 'bj_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '2.39', amountUnit: '万', value: '37.045' },
          { source: 'byd', target: 'gz_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '2.921', amountUnit: '万', value: '45.275' },
          { source: 'byd', target: 'sz_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '2.656', amountUnit: '万', value: '41.168' },
          { source: 'byd', target: 'other_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '3.718', amountUnit: '万', value: '57.629' },
          
          // 吉利国内销售
          { source: 'jlqc', target: 'sh_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '1.542', amountUnit: '万', value: '20.817' },
          { source: 'jlqc', target: 'bj_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '1.156', amountUnit: '万', value: '15.606' },
          { source: 'jlqc', target: 'other_network', label: '销售(国内)', type: 'sell_domestic', product: '整车', amount: '1.799', amountUnit: '万', value: '24.287' },
          
          // ========== 产品关联 ==========
          { source: 'product_vehicle', target: 'byd', label: '生产', type: 'produce' },
          { source: 'product_battery', target: 'ndsd', label: '供应', type: 'supply' },
          { source: 'product_electronics', target: 'hwcb', label: '供应', type: 'supply' },
          { source: 'product_powertrain', target: 'bydfd', label: '供应', type: 'supply' },
          
          // ========== 城市关联 ==========
          { source: 'byd', target: 'city_shenzhen', label: '位于', type: 'located' },
          { source: 'jlqc', target: 'city_hangzhou', label: '位于', type: 'located' },
          { source: 'ndsd', target: 'city_xiamen', label: '位于', type: 'located' },
          { source: 'yqdz', target: 'city_changchun', label: '位于', type: 'located' },
          
          // ========== 月份关联 ==========
          { source: 'month_202401', target: 'byd', label: '交易时间', type: 'time' },
          { source: 'month_202401', target: 'tsl', label: '交易时间', type: 'time' },
          { source: 'month_202402', target: 'jlqc', label: '交易时间', type: 'time' }
        ],
        
        // 颜色编码（categories）- 6种颜色区分不同实体类型
        categories: [
          { name: '制造商', itemStyle: { color: '#ff6b6b' } },      // 红色
          { name: '供应商', itemStyle: { color: '#4ecdc4' } },      // 青色
          { name: '销售商', itemStyle: { color: '#45b7d1' } },      // 蓝色
          { name: '产品', itemStyle: { color: '#96ceb4' } },        // 绿色
          { name: '城市', itemStyle: { color: '#ffeaa7' } },        // 黄色
          { name: '月份', itemStyle: { color: '#dda0dd' } }         // 紫色
        ]
      }
    }
  },
  created() {
    // 禁用内置静态图谱样例，避免展示假数据
    this.graphData.nodes = [];
    this.graphData.links = [];
    this.fetchBookList();
    this.filterTableData = [...this.filteredData];
    
    // 初始化筛选器
    this.graphData.categories.forEach(cat => {
      this.filterCategories[cat.name] = true;
    });

    this.loadPersistedGraph().catch((error) => {
      console.error('加载持久化图谱失败:', error);
    });

    this.$nextTick(() => {
      if (this.selectedCard === 3) {
        this.initPreviewKnowledgeGraph();
      }
    });
  },
  computed: {
    sourceFiles() {
      return Array.isArray(this.filteredData) ? this.filteredData : [];
    },
    displayDatasetList() {
      if (!this.docNameSearch) {
        return this.sourceFiles;
      }
      const keyword = this.docNameSearch.toLowerCase();
      return this.sourceFiles.filter((item) => item.name.toLowerCase().includes(keyword));
    },
    extractedFilesCount() {
      return this.sourceFiles.filter((file) => file.kgStatus === 1).length;
    },
    activePanelMeta() {
      const panelMap = {
        0: {
          title: '数据集工作区',
          desc: '管理文档接入、解析状态和知识抽取入口。',
        },
        1: {
          title: '检索测试工作区',
          desc: '验证召回参数与图谱增强效果，快速迭代检索策略。',
        },
        2: {
          title: '配置工作区',
          desc: '维护知识库配置，控制切块与图谱抽取策略。',
        },
        3: {
          title: '知识图谱工作区',
          desc: '沉淀和管理结构化知识，查看版本与待合并结果。',
        },
      };
      return panelMap[this.selectedCard] || panelMap[0];
    },
    currentRerankLabel() {
      for (const group of this.rerankOptions) {
        const hit = group.options.find((item) => item.value === this.retrievalTest.rerankModel);
        if (hit) return hit.label;
      }
      return '未设置';
    },
    analyticMethodLabel() {
      const hit = this.analyticMethodOptions.find((item) => item.value === this.knowledgeBaseForm.analyticMethod);
      return hit ? hit.label : 'General';
    },
    selectedModelLabel() {
      for (const group of this.modelOptions) {
        const hit = group.options.find((item) => item.value === this.knowledgeBaseForm.model);
        if (hit) return hit.label;
      }
      return '未设置';
    },
    graphCategorySummary() {
      return this.graphData.categories.map((category, index) => ({
        name: category.name,
        color: category.itemStyle.color,
        count: this.graphData.nodes.filter((node) => node.category === index).length,
      }));
    },
    filteredDataComputed() {
      if (!this.docNameSearch) {
        return this.sourceFiles;
      }
      return this.sourceFiles.filter(item =>
        item.name.toLowerCase().includes(this.docNameSearch.toLowerCase())
      );
    },
    availableFiles() {
      return this.sourceFiles.filter(file => file.ocrPercentage === 100);
    }
  },
  watch: {
    docNameSearch() {
      this.filterTableData = this.filteredDataComputed;
    },
    selectedKnowledgeBase() {
      this.loadPersistedGraph().catch((error) => {
        console.error('切换图谱加载失败:', error);
      });
    },
    selectedCard(val) {
      if (val === 3) {
        this.$nextTick(() => {
          this.initPreviewKnowledgeGraph();
        });
      }
    }
  },
  methods: {
    onBack(){
      this.$router.push('/home/SCnet/knowledgeBase')
    },
    getActiveGraphKey() {
      return String(this.selectedKnowledgeBase || 'supply_chain').trim() || 'supply_chain';
    },
    syncFilterCategories() {
      const categories = Array.isArray(this.graphData?.categories) ? this.graphData.categories : [];
      const nextFilter = {};
      categories.forEach((cat) => {
        const name = String(cat?.name || '').trim();
        if (!name) return;
        if (Object.prototype.hasOwnProperty.call(this.filterCategories, name)) {
          nextFilter[name] = this.filterCategories[name];
        } else {
          nextFilter[name] = true;
        }
      });
      this.filterCategories = nextFilter;
    },
    applyGraphPayload(payload) {
      const graph = (payload && typeof payload === 'object' && payload.graph && typeof payload.graph === 'object')
        ? payload.graph
        : {};
      const defaultCategories = Array.isArray(this.graphData?.categories) ? this.graphData.categories : [];
      const categories = Array.isArray(graph.categories) && graph.categories.length > 0
        ? graph.categories
        : defaultCategories;

      this.graphData = {
        ...this.graphData,
        categories,
        nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
        links: Array.isArray(graph.links) ? graph.links : []
      };
      this.graphVersions = Array.isArray(payload?.versions) ? payload.versions : [];
      this.selectedVersion = payload?.selected_version ?? graph?.selected_version ?? null;
      this.lastUpdateTime = graph?.updated_at || this.lastUpdateTime || '';

      this.syncFilterCategories();
      this.calculateNodeActivity();
      this.extractUniqueCities();

      if (this.selectedCard === 3) {
        this.$nextTick(() => {
          this.initPreviewKnowledgeGraph();
        });
      }
      if (this.knowledgeGraphDialogVisible) {
        this.$nextTick(() => {
          this.initKnowledgeGraph();
        });
      }
    },
    async loadPersistedGraph(showSuccess = false) {
      const graphKey = this.getActiveGraphKey();
      const response = await getKnowledgeGraphCurrent({ graph_key: graphKey });
      if (!response.success) {
        throw new Error(response.message || '加载图谱失败');
      }
      this.applyGraphPayload(response.data || {});
      if (showSuccess) {
        this.$message.success('图谱已刷新');
      }
    },
    knowledgeMapCategoryClose(tag){
      this.knowledgeBaseForm.knowledgeMapCategory.splice(this.knowledgeBaseForm.knowledgeMapCategory.indexOf(tag), 1)
    },
    knowledgeMapCategoryShowInput(){
      this.inputVisible = true;
      nextTick(() => {
        this.$refs.InputRef && this.$refs.InputRef.focus();
      })
    },
    handleInputConfirm(){
      if (this.inputValue) {
        this.knowledgeBaseForm.knowledgeMapCategory.push(this.inputValue)
      }
      this.inputVisible = false;
      this.inputValue = ''
    },
    itemCardClick(index){
      this.selectedCard = index;
      if (index === 3) {
        this.$nextTick(() => {
          this.initPreviewKnowledgeGraph();
        });
      }
    },
    handleSelectionChange(selectedRows){
      this.batchSelectionDisabled = selectedRows.length === 0;
    },

    //---------数据集上传相关---------
    async fetchBookList() {
      const maxRetries = 3;
      let lastError = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await getKnowledgeBookList();
          if (!response.success) {
            throw new Error(response.message || '获取数据集列表失败');
          }

          this.filteredData = response.data.map(item => ({
            ...item,
            name: item.name || '未命名数据集',
            blockNum: '3',
            analysisMethod: 'General',
            isRun: false,
            analysisState: item.ocrPercentage >= 100 ? 1 : 0,
            action: item.ocrPercentage >= 100 ? 2 : 1,
            kgStatus: Number.isFinite(Number(item.kgStatus)) ? Number(item.kgStatus) : 0,
            ocrProgress: {},
            showProgress: item.ocrPercentage < 100
          }));
          this.filterTableData = this.filteredDataComputed;
          return;
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 800));
          }
        }
      }

      const detail =
        lastError?.response?.data?.message ||
        lastError?.message ||
        '后端服务不可用';
      console.error('获取数据失败:', {
        message: lastError?.message,
        status: lastError?.status,
        code: lastError?.code,
        errorCode: lastError?.errorCode
      });
      this.$message.error(`获取数据失败：${detail}`);
      this.filteredData = [];
      this.filterTableData = [];
    },
    
    openDialog() {
      this.dialogVisible = true
      this.$nextTick(() => {
        if (this.$refs.bookForm) {
          this.$refs.bookForm.resetFields();
        }
        this.bookForm.files = [];
        if (this.$refs.upload) {
          this.$refs.upload.clearFiles();
        }
      });
    },
    
    handleClose() {
      this.dialogVisible = false
      this.$refs.bookForm && this.$refs.bookForm.resetFields()
      this.bookForm.files = []
      this.$refs.upload && this.$refs.upload.clearFiles()
    },
    
    handleFileChange(file, fileList) {
      this.bookForm.files = fileList.map((item) => item.raw).filter(Boolean);
    },

    handleFileRemove(file, fileList) {
      this.bookForm.files = fileList.map((item) => item.raw).filter(Boolean);
    },
    
    submitForm() {
      this.$refs.bookForm.validate(async (valid) => {
        if (valid) {
          try {
            if (this.bookForm.bookMeta) {
              try {
                JSON.parse(this.bookForm.bookMeta);
              } catch (e) {
                this.$message.error('元数据格式错误，请输入有效的JSON字符串');
                return;
              }
            }

            const formData = new FormData();
            formData.append('book_name', this.bookForm.bookName);
            if (this.bookForm.bookMeta) {
              formData.append('book_meta', this.bookForm.bookMeta);
            }
            if (!Array.isArray(this.bookForm.files) || this.bookForm.files.length === 0) {
              this.$message.error('请至少选择一个文件');
              return;
            }
            this.bookForm.files.forEach((file) => {
              formData.append('file', file);
            });

            const response = await importKnowledgeBook(formData);

            if (response.success) {
              this.$message.success(response.message || `数据集导入成功（${this.bookForm.files.length} 个文件）`);
              this.dialogVisible = false;
              await this.fetchBookList();

              this.$refs.bookForm.resetFields();
              this.bookForm.files = [];
              if (this.$refs.upload) {
                this.$refs.upload.clearFiles();
              }
            } else {
              this.$message.error(response.message || '导入失败');
            }
          } catch (error) {
            console.error('上传失败:', error);
            this.$message.error(error?.message || '数据集上传失败');
          }
        }
      });
    },
    
    openRenameDialog(row) {
      this.renameForm.oldName = row.name;
      this.renameForm.newName = '';
      this.renameDialogVisible = true;
    },

    async submitRename() {
      this.$refs.renameForm.validate(async (valid) => {
        if (valid) {
          try {
            const response = await renameKnowledgeBook({
              book_name_old: this.renameForm.oldName,
              book_name_new: this.renameForm.newName
            });

            if (response.success) {
              this.$message.success(response.message || '重命名成功');
              this.renameDialogVisible = false;
              await this.fetchBookList();
            } else {
              this.$message.error(response.message);
            }
          } catch (error) {
            console.error('重命名失败:', error);
            this.$message.error(error?.message || '重命名失败');
          }
        }
      });
    },
    
    async handleAnalyse(row) {
      try {
        row.showProgress = true;
        row.ocrPercentage = 0;
        row.ocrProgress = {};

        this.$message.success(`开始解析数据集"${row.name}"`);
        
        const response = await analyzeKnowledgeBook({ book_name: row.name });
        
        if (response.success) {
          this.startProgressQuery(row);
        } else {
          this.$message.error(response.message);
          row.showProgress = false;
        }
      } catch (error) {
        console.error('解析请求失败:', error);
        this.$message.error(error?.message || `解析"${row.name}"失败`);
        row.showProgress = false;
      }
    },

    startProgressQuery(row) {
      if (this.progressInterval) clearInterval(this.progressInterval);

      this.progressInterval = setInterval(async () => {
        const response = await getKnowledgeBookProgress({ book_name: row.name }).catch(() => null);
        
        if (response && response.success) {
          const progressData = response.data.ocr_progress;
          row.ocrProgress = progressData;
          
          if (progressData && progressData["总页数"] > 0) {
            const totalPages = progressData["总页数"];
            const successPages = progressData["成功"] || 0;
            const skipPages = progressData["跳过"] || 0;
            row.ocrPercentage = Math.round(((successPages + skipPages) / totalPages) * 100);
            
            if (progressData["完成"]) {
              row.ocrPercentage = 100;
            }
          }
          
          if (row.ocrPercentage >= 100) {
            clearInterval(this.progressInterval);
            this.$message.success(`数据集"${row.name}"解析完成`);
            row.showProgress = false;
            row.ocrProgress["完成"] = true;
            row.ocrProgress["剩余"] = "已完成";
          }
        } else {
          clearInterval(this.progressInterval);
          row.showProgress = false;
          this.$message.error(`获取"${row.name}"解析进度失败`);
        }
      }, 1000);
    },

    getProgressDetail(row) {
      const progress = row.ocrProgress || {};
      return `
        总页数：${progress["总页数"] || 0}
        成功页数：${progress["成功"] || 0}
        跳过页数：${progress["跳过"] || 0}
        失败页数：${progress["失败"] || 0}
        状态：${progress["完成"] ? "已完成" : "解析中"}
        剩余时间：${progress["剩余"] || "0秒"}
      `.trim();
    },

    getKgStatusText(status) {
      const statusMap = {
        0: '未抽取',
        1: '已抽取',
        2: '抽取中',
        3: '抽取失败'
      };
      return statusMap[status] || '未知';
    },

    getKgStatusType(status) {
      const typeMap = {
        0: 'info',
        1: 'success',
        2: 'warning',
        3: 'danger'
      };
      return typeMap[status] || 'info';
    },

    async handleGetIndex(row) {
      try {
        const response = await getKnowledgeBookIndex({ book_name: row.name });
        if (response.success) {
          this.bookIndex = JSON.stringify(response.data, null, 2);
          this.indexDialogVisible = true;
          this.$message.success(`获取"${row.name}"索引成功`);
        } else {
          this.$message.error(response.message);
        }
      } catch (error) {
        console.error('获取索引失败:', error);
        this.$message.error(error?.message || '获取索引失败');
      }
    },

    async handleDownload(row) {
      try {
        const blob = await downloadKnowledgeBook({ book_name: row.name });
        const fileName = `${row.name || 'knowledge_book'}.zip`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.$message.success(`已开始下载：${fileName}`);
      } catch (error) {
        console.error('下载失败:', error);
        this.$message.error(error?.message || '下载失败');
      }
    },

    handleDelete(row) {
      this.$confirm(`确定删除数据集"${row.name}"?`, '提示', {
        type: 'warning'
      }).then(async () => {
        try {
          const response = await deleteKnowledgeBook({ book_name: row.name });
          
          if (response.success) {
            this.$message.success(response.message || '删除成功');
            await this.fetchBookList();
          } else {
            this.$message.error(response.message);
          }
        } catch (error) {
          console.error('删除失败:', error);
          this.$message.error(error?.message || '删除失败');
        }
      }).catch(() => {
        this.$message.info('已取消删除');
      });
    },
    
    openQueryDialog(book) {
      this.currentBook = book;
      this.userQuery = '';
      this.queryResult = null;
      this.queryDialogVisible = true;
    },

    async sendQuery() {
      if (!this.userQuery.trim()) return;

      this.isQuerying = true;
      try {
        const response = await queryKnowledgeBook({
          book_name: this.currentBook.name,
          query: this.userQuery.trim()
        });

        if (response.success) {
          this.queryResult = response.data;
        } else {
          this.$message.error(response.message || '查询失败，请重试');
        }
      } catch (error) {
        console.error('查询数据集失败:', error);
        this.$message.error(error?.message || '查询失败');
      } finally {
        this.isQuerying = false;
      }
    },

    async openKnowledgeGraphDialog() {
      this.knowledgeGraphDialogVisible = true;
      try {
        await this.loadPersistedGraph();
      } catch (error) {
        console.error('打开图谱弹窗加载失败:', error);
      }
      this.$nextTick(() => {
        this.initKnowledgeGraph();
      });
    },
    
    openKnowledgeExtractDialog() {
      if (this.availableFiles.length === 0) {
        this.$message.warning('没有已解析的文件可用于知识抽取');
        return;
      }
      this.extractConfig.selectedFile = this.availableFiles[0].name;
      this.knowledgeExtractDialogVisible = true;
    },
    
    closeKnowledgeGraphDialog() {
      this.knowledgeGraphDialogVisible = false;
      if (this.chartInstance) {
        this.chartInstance.dispose();
        this.chartInstance = null;
      }
    },
    
    // 计算节点活跃度（基于交易频次）
    calculateNodeActivity() {
      const nodeActivityMap = {};
      
      // 统计每个节点的出现次数
      this.graphData.links.forEach(link => {
        nodeActivityMap[link.source] = (nodeActivityMap[link.source] || 0) + 1;
        nodeActivityMap[link.target] = (nodeActivityMap[link.target] || 0) + 1;
      });
      
      // 更新节点活跃度，并计算节点大小
      this.graphData.nodes.forEach(node => {
        node.activity = nodeActivityMap[node.id] || 1; // 至少为1
        // 节点大小动态计算（基于交易频次，范围20-80）
        node.symbolSize = Math.min(80, Math.max(20, 20 + Math.floor(node.activity * 0.5)));
      });
    },
    
    // 提取唯一城市列表
    extractUniqueCities() {
      const citySet = new Set();
      this.graphData.nodes.forEach(node => {
        if (node.city && node.city !== '全国' && node.city !== '未知') {
          citySet.add(node.city);
        }
      });
      this.uniqueCities = Array.from(citySet).sort();
    },
    
    // 获取类别颜色
    getCategoryColor(categoryName) {
      const category = this.graphData.categories.find(c => c.name === categoryName);
      return category ? category.itemStyle.color : '#999';
    },
    
    // 获取节点标签类型
    getNodeTagType(categoryName) {
      const typeMap = {
        '制造商': 'danger',
        '供应商': 'success',
        '销售商': 'primary',
        '产品': 'warning',
        '城市': 'info',
        '月份': ''
      };
      return typeMap[categoryName] || '';
    },
    
    // 应用节点筛选
    applyNodeFilter() {
      const activeCategories = Object.keys(this.filterCategories).filter(key => this.filterCategories[key]);
      
      this.filteredNodes = this.graphData.nodes.filter(node => {
        // 按类别筛选
        const categoryName = this.graphData.categories[node.category].name;
        if (!activeCategories.includes(categoryName)) return false;
        
        // 按城市筛选
        if (this.filterCity && node.city !== this.filterCity) return false;
        
        // 按产品类型筛选
        if (this.filterProductType && node.productType !== this.filterProductType) return false;
        
        // 按活跃度筛选
        if (node.activity < this.activityThreshold) return false;
        
        return true;
      });
      
      // 更新筛选后的关系
      const nodeIds = new Set(this.filteredNodes.map(n => n.id));
      this.filteredLinks = this.graphData.links.filter(link => 
        nodeIds.has(link.source) && nodeIds.has(link.target)
      );
      
      this.refreshKG();
    },
    
    initKnowledgeGraph() {
      if (this.chartInstance) {
        this.chartInstance.dispose();
      }
      
      const container = document.getElementById('knowledge-graph-container');
      if (!container) {
        console.error('知识图谱容器不存在');
        return;
      }
      this.chartInstance = echarts.init(container);

      // 计算节点大小
      this.calculateNodeActivity();
      
      // 使用筛选后的节点和关系，如果没有筛选则使用全部
      const displayNodes = this.filteredNodes.length ? this.filteredNodes : this.graphData.nodes;
      const displayLinks = this.filteredLinks.length ? this.filteredLinks : this.graphData.links;

      const option = {
        title: {
          text: '汽车供应链知识图谱',
          left: 'center',
          top: 15,
          textStyle: {
            fontSize: 18,
            fontWeight: 600,
            color: '#333'
          }
        },
        tooltip: {
          trigger: 'item',
          triggerOn: 'mousemove',
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: '#eee',
          borderWidth: 1,
          borderRadius: 8,
          textStyle: { fontSize: 12 },
          formatter: (params) => {
            if (params.dataType === 'edge') {
              const link = params.data;
              return `<div style="line-height:1.5; padding: 5px;">
                <strong>${params.source.name}</strong> → <strong>${params.target.name}</strong><br/>
                关系：${link.label || '关联'}<br/>
                ${link.product ? `产品：${link.product}<br/>` : ''}
                ${link.amount ? `交易量：${link.amount} ${link.amountUnit || '万'}<br/>` : ''}
                ${link.value ? `交易金额：${link.value}亿元` : ''}
              </div>`;
            } else {
              const node = params.data;
              const cateName = this.graphData.categories[node.category].name;
              return `<div style="line-height:1.6; padding: 5px; min-width: 200px;">
                <strong>节点：</strong>${node.name}<br/>
                <strong>类型：</strong>${cateName}<br/>
                <strong>说明：</strong>${node.desc || '无'}<br/>
                <strong>城市：</strong>${node.city || '未知'}<br/>
                <strong>活跃度：</strong>${node.activity || 0} 次交易<br/>
                <strong>产品：</strong>${node.productType || '多产品'}
              </div>`;
            }
          }
        },
        legend: {
          orient: 'vertical',
          top: 'center',
          left: 20,
          textStyle: { fontSize: 11 },
          itemWidth: 12,
          itemHeight: 12,
          data: this.graphData.categories.map(item => item.name)
        },
        series: [
          {
            type: 'graph',
            layout: 'force',
            data: displayNodes,
            links: displayLinks,
            categories: this.graphData.categories,
            roam: true,
            draggable: true,
            label: {
              show: true,
              fontSize: 10,
              position: 'right',
              color: '#333',
              fontWeight: 400,
              formatter: (params) => {
                // 只显示重要节点的标签
                if (params.data.activity > 50 || params.data.category < 3) {
                  return params.name;
                }
                return '';
              }
            },
            edgeLabel: {
              show: true,
              fontSize: 9,
              formatter: (params) => params.data.label,
              backgroundColor: 'rgba(255,255,255,0.85)',
              padding: [1, 3],
              borderRadius: 3
            },
            force: {
              repulsion: 400,
              edgeLength: 200,
              gravity: 0.08,
              layoutAnimation: true
            },
            lineStyle: {
              color: 'source',
              curveness: 0.05,
              width: 1.2,
              opacity: 0.6
            },
            emphasis: {
              focus: 'adjacency',
              lineStyle: {
                width: 3,
                color: '#f00'
              },
              label: {
                fontSize: 12,
                color: '#fff',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: 2
              }
            },
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 1.5,
              shadowBlur: 10,
              shadowColor: 'rgba(0,0,0,0.2)'
            }
          }
        ]
      };

      this.chartInstance.setOption(option);
      
      // 添加点击事件
      this.chartInstance.on('click', { seriesIndex: 0, dataType: 'node' }, (params) => {
        this.selectedNode = params.data;
        
        // 查找关联节点
        const relations = displayLinks
          .filter(link => link.source === params.data.id || link.target === params.data.id)
          .map(link => {
            const otherId = link.source === params.data.id ? link.target : link.source;
            const otherNode = displayNodes.find(n => n.id === otherId);
            return {
              name: otherNode?.name || '未知',
              relation: link.label || '关联',
              categoryName: otherNode ? this.graphData.categories[otherNode.category].name : '未知'
            };
          });
        
        this.selectedNode.relations = relations.slice(0, 10); // 只显示前10个
        this.selectedNode.categoryName = this.graphData.categories[params.data.category].name;
      });

      const resizeHandler = () => {
        if (this.chartInstance) {
          this.chartInstance.resize();
        }
      };
      window.addEventListener('resize', resizeHandler);
      
      this.$once('hook:beforeDestroy', () => {
        window.removeEventListener('resize', resizeHandler);
      });
    },
    
    searchKGNode() {
      if (!this.kgSearchText.trim()) {
        this.$message.warning('请输入要搜索的节点名称');
        return;
      }

      const searchText = this.kgSearchText.trim().toLowerCase();
      const nodes = this.graphData.nodes.filter(item => 
        item.name.toLowerCase().includes(searchText) || 
        (item.desc && item.desc.toLowerCase().includes(searchText))
      );

      if (nodes.length > 0) {
        if (nodes.length === 1) {
          this.chartInstance.dispatchAction({
            type: 'focusNodeAdjacency',
            name: nodes[0].name
          });
          this.selectedNode = nodes[0];
          this.selectedNode.categoryName = this.graphData.categories[nodes[0].category].name;
          this.$message.success(`找到节点：${nodes[0].name}`);
        } else {
          this.$message.info(`找到 ${nodes.length} 个匹配节点，请在图中查看`);
          // 高亮所有匹配节点
          this.chartInstance.dispatchAction({
            type: 'highlight',
            seriesIndex: 0,
            dataIndex: nodes.map(n => this.graphData.nodes.findIndex(node => node.id === n.id))
          });
        }
      } else {
        this.$message.info(`未找到包含"${searchText}"的节点`);
      }
    },
    
    resetKGView() {
      if (this.chartInstance) {
        this.chartInstance.dispatchAction({
          type: 'restore'
        });
        this.kgSearchText = '';
        this.filterCity = '';
        this.filterProductType = '';
        this.activityThreshold = 30;
        Object.keys(this.filterCategories).forEach(key => {
          this.filterCategories[key] = true;
        });
        this.filteredNodes = [];
        this.filteredLinks = [];
        this.selectedNode = null;
      }
    },
    
    async refreshKG() {
      try {
        await this.loadPersistedGraph(true);
      } catch (error) {
        console.error('刷新图谱失败:', error);
        this.$message.error(error?.message || '刷新图谱失败');
      }
    },

    initPreviewKnowledgeGraph() {
      const container = document.getElementById('knowledge-graph-preview-container');
      if (!container) return;

      if (this.previewChartInstance) {
        this.previewChartInstance.dispose();
      }

      const previewNodes = this.graphData.nodes.slice(0, 60).map((node) => ({
        ...node,
      }));
      const previewNodeSet = new Set(previewNodes.map((node) => node.id));
      const previewLinks = this.graphData.links
        .filter((link) => previewNodeSet.has(link.source) && previewNodeSet.has(link.target))
        .slice(0, 120);

      this.previewChartInstance = echarts.init(container);
      this.previewChartInstance.setOption({
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            if (params.dataType === 'node') {
              return `${params.data.name}<br/>${params.data.desc || ''}`;
            }
            return `${params.source.name} -> ${params.target.name}`;
          },
        },
        series: [
          {
            type: 'graph',
            layout: 'force',
            data: previewNodes,
            links: previewLinks,
            categories: this.graphData.categories,
            roam: true,
            draggable: true,
            label: {
              show: true,
              fontSize: 10,
              formatter: (params) => (params.data.activity > 20 ? params.name : ''),
            },
            force: {
              repulsion: 220,
              edgeLength: 120,
              gravity: 0.1,
            },
            lineStyle: {
              color: 'source',
              width: 1.1,
              opacity: 0.55,
            },
          },
        ],
      });
    },

    async runRetrievalTest() {
      const query = (this.retrievalTest.testText || '').trim();
      if (!query) {
        this.$message.warning('请输入测试文本');
        return;
      }

      if (this.availableFiles.length === 0) {
        this.$message.warning('没有可测试的已解析文件');
        return;
      }

      try {
        const candidates = this.availableFiles.slice(0, 3);
        const responses = await Promise.all(
          candidates.map((file) =>
            queryKnowledgeBook({
              book_name: file.name,
              query,
              similarity_threshold: Number(this.retrievalTest.similarityThreshold || 0),
              keyword_similarity_weight: Number(this.retrievalTest.keywordSimilarityWeight || 0),
              rerank_model: this.retrievalTest.rerankModel,
              is_use_knowledge_map: this.retrievalTest.isUseKnowledgeMap ? 'true' : 'false',
              graph_key: this.getActiveGraphKey(),
              top_k: 5
            }).then((res) => ({ file, res }))
          )
        );

        const hits = responses
          .filter(({ res }) => res && res.success && res.data)
          .map(({ file, res }) => ({
            title: file.name,
            desc: (res.data.content || '').slice(0, 120) || '命中但无可展示片段'
          }));

        this.retrievalPreviewResult = {
          summary: `已基于“${query.slice(0, 20)}${query.length > 20 ? '...' : ''}”完成测试，命中 ${hits.length} 条候选内容（阈值 ${Number(this.retrievalTest.similarityThreshold || 0).toFixed(2)}，图谱增强${this.retrievalTest.isUseKnowledgeMap ? '开启' : '关闭'}）。`,
          hits
        };
        this.$message.success('检索测试完成');
      } catch (error) {
        console.error('检索测试失败:', error);
        this.$message.error(error?.message || '检索测试失败');
      }
    },
    
    focusOnNode(node) {
      if (this.chartInstance) {
        this.chartInstance.dispatchAction({
          type: 'focusNodeAdjacency',
          name: node.name
        });
      }
    },
    
    expandNode(node) {
      if (this.chartInstance) {
        // 展开节点的所有关联
        this.chartInstance.dispatchAction({
          type: 'unfocus',
          name: node.name
        });
      }
    },
    
    getCategoryIndexByEntityType(entityType) {
      const map = {
        manufacturer: 0,
        supplier: 1,
        distributor: 2,
        product: 3,
        city: 4,
        month: 5
      };
      return Object.prototype.hasOwnProperty.call(map, entityType) ? map[entityType] : 4;
    },

    normalizeEntityType(rawType, rawCategory = '') {
      const type = String(rawType || '').toLowerCase();
      if (['manufacturer', 'supplier', 'distributor', 'product', 'city', 'month'].includes(type)) {
        return type;
      }
      if (type === 'concept') return 'product';
      if (type === 'book' || type === 'file') return '';

      const category = String(rawCategory || '').toLowerCase();
      if (category.includes('manufacturer') || category.includes('制造')) return 'manufacturer';
      if (category.includes('supplier') || category.includes('供应')) return 'supplier';
      if (category.includes('distributor') || category.includes('销售')) return 'distributor';
      if (category.includes('city') || category.includes('城市')) return 'city';
      if (category.includes('month') || category.includes('月份') || category.includes('time')) return 'month';
      if (category.includes('book') || category.includes('file')) return '';
      return 'product';
    },

    normalizeRelationType(rawType) {
      const t = String(rawType || '').toLowerCase();
      if (!t) return 'cooperate';
      if (['supply', 'sell_export', 'sell_domestic', 'cooperate', 'belong'].includes(t)) return t;
      if (t === 'produce' || t === 'contains' || t === 'include' || t === 'mentions') return 'cooperate';
      return 'cooperate';
    },

    normalizeExtractedModel(modelData) {
      const allowedTypes = new Set((this.extractConfig.entityTypes || []).map((item) => String(item)));
      const allowedRelations = new Set((this.extractConfig.relationTypes || []).map((item) => String(item)));
      const confidenceThreshold = Number(this.extractConfig.confidenceThreshold || 0);
      const rawNodes = Array.isArray(modelData?.nodes) ? modelData.nodes : [];
      const rawLinks = Array.isArray(modelData?.links) ? modelData.links : [];

      const nodes = [];
      const links = [];
      const nodeByIdOrName = new Map();
      const nodeByName = new Map();

      rawNodes.forEach((rawNode, index) => {
        const name = String(rawNode?.name || rawNode?.id || '').trim();
        if (!name) return;

        const entityType = this.normalizeEntityType(rawNode?.type, rawNode?.category);
        if (!entityType) return;
        if (allowedTypes.size > 0 && !allowedTypes.has(entityType)) return;

        const confidence = Number(rawNode?.confidence ?? rawNode?.weight ?? 1);
        if (Number.isFinite(confidence) && confidence < confidenceThreshold) return;

        const id = String(rawNode?.id || `extract_node_${Date.now()}_${index + 1}`);
        const dedupeKey = name.toLowerCase();
        if (nodeByName.has(dedupeKey)) return;

        const normalizedNode = {
          id,
          name,
          type: entityType,
          category: this.getCategoryIndexByEntityType(entityType),
          desc: String(rawNode?.desc || rawNode?.description || ''),
          city: String(rawNode?.city || ''),
          productType: String(rawNode?.productType || rawNode?.product_type || ''),
          confidence: Number.isFinite(confidence) ? confidence : 1
        };

        nodes.push(normalizedNode);
        nodeByName.set(dedupeKey, normalizedNode);
        nodeByIdOrName.set(id, normalizedNode);
        nodeByIdOrName.set(name, normalizedNode);
      });

      const linkDedupe = new Set();
      rawLinks.forEach((rawLink) => {
        const sourceKey = String(rawLink?.source || '').trim();
        const targetKey = String(rawLink?.target || '').trim();
        if (!sourceKey || !targetKey) return;

        const sourceNode = nodeByIdOrName.get(sourceKey) || nodeByName.get(sourceKey.toLowerCase());
        const targetNode = nodeByIdOrName.get(targetKey) || nodeByName.get(targetKey.toLowerCase());
        if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return;

        const relationType = this.normalizeRelationType(rawLink?.type || rawLink?.label);
        if (allowedRelations.size > 0 && allowedRelations.has(relationType) === false) return;

        const confidence = Number(rawLink?.confidence ?? rawLink?.weight ?? 1);
        if (Number.isFinite(confidence) && confidence < confidenceThreshold) return;

        const label = String(rawLink?.label || relationType || '关联');
        const dedupeKey = `${sourceNode.id}|${targetNode.id}|${label}`;
        if (linkDedupe.has(dedupeKey)) return;

        links.push({
          source: sourceNode.id,
          target: targetNode.id,
          label,
          type: relationType,
          confidence: Number.isFinite(confidence) ? confidence : 1
        });
        linkDedupe.add(dedupeKey);
      });

      return { nodes, links };
    },

    buildTreeUpdateInstruction() {
      const entityTypes = (this.extractConfig.entityTypes || []).join(', ');
      const relationTypes = (this.extractConfig.relationTypes || []).join(', ');
      return `按抽取配置整理目录：模型=${this.extractConfig.model}; 实体=${entityTypes}; 关系=${relationTypes}; 置信度阈值=${this.extractConfig.confidenceThreshold}`;
    },

    async runKnowledgeExtraction(bookName, options = {}) {
      const targetBook = this.sourceFiles.find((item) => item.name === bookName);
      if (targetBook) targetBook.kgStatus = 2;

      try {
        const forceRefresh = Boolean(options.forceRefresh);
        const categories = Array.from(new Set((this.extractConfig.entityTypes || []).map((item) => String(item))));

        const categoryResp = await updateKnowledgeBookCategories({
          book_name: bookName,
          categories
        }).catch(() => null);
        if (categoryResp && !categoryResp.success) {
          this.$message.warning(`分类同步失败：${categoryResp.message || '未知错误'}`);
        }

        const response = await getKnowledgeBookCognitiveModel({
          book_name: bookName,
          force_refresh: forceRefresh ? 'true' : 'false',
          model: String(this.extractConfig.model || 'general'),
          entity_types: (this.extractConfig.entityTypes || []).join(','),
          relation_types: (this.extractConfig.relationTypes || []).join(','),
          similarity_threshold: Number(this.extractConfig.similarityThreshold || 0),
          confidence_threshold: Number(this.extractConfig.confidenceThreshold || 0),
          selected_file: String(this.extractConfig.selectedFile || bookName || ''),
          auto_complete_relations: this.extractConfig.autoCompleteRelations ? 'true' : 'false'
        });
        if (!response.success) {
          throw new Error(response.message || '知识抽取失败');
        }

        const normalized = this.normalizeExtractedModel(response.data || {});
        if (!normalized.nodes.length) {
          throw new Error('后端返回为空，或未命中当前抽取过滤条件');
        }

        this.extractedData = normalized;
        if (targetBook) targetBook.kgStatus = 1;

        if (options.closeDialog) {
          this.knowledgeExtractDialogVisible = false;
        }

        updateKnowledgeBookTree({
          book_name: bookName,
          instruction: this.buildTreeUpdateInstruction()
        }).catch(() => null);

        this.$message.success(`知识抽取完成：新增候选实体 ${normalized.nodes.length} 个，候选关系 ${normalized.links.length} 条`);

        if (this.selectedCard === 3) {
          this.$nextTick(() => this.initPreviewKnowledgeGraph());
        }
        if (this.knowledgeGraphDialogVisible) {
          this.$message.info('抽取完成，请在图谱窗口点击“合并到图谱”');
        }

        await this.fetchBookList();
      } catch (error) {
        if (targetBook) targetBook.kgStatus = 3;
        console.error('知识抽取失败:', error);
        this.$message.error(error?.message || '知识抽取失败');
      }
    },

    async startKnowledgeExtraction() {
      if (!this.extractConfig.selectedFile) {
        this.$message.warning('请选择要抽取的文件');
        return;
      }
      await this.runKnowledgeExtraction(this.extractConfig.selectedFile, {
        forceRefresh: this.extractConfig.model === 'advanced',
        closeDialog: true
      });
    },
    
    async extractKnowledge(row) {
      if (row.ocrPercentage < 100) {
        this.$message.warning('请先完成文件解析');
        return;
      }
      await this.runKnowledgeExtraction(row.name, {
        forceRefresh: this.extractConfig.model === 'advanced',
        closeDialog: false
      });
    },
    
    async mergeToGraph() {
      if (this.extractedData.nodes.length === 0 && this.extractedData.links.length === 0) {
        this.$message.warning('没有可合并的知识');
        return;
      }

      try {
        if ((this.graphData.nodes?.length || 0) > 0 || (this.graphData.links?.length || 0) > 0) {
          const now = new Date();
          const desc = `合并前快照 ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
          await this.saveCurrentVersion({ silent: true, description: desc }).catch(() => null);
        }

        const response = await mergeKnowledgeGraph({
          graph_key: this.getActiveGraphKey(),
          nodes: this.extractedData.nodes,
          links: this.extractedData.links,
          options: {
            autoCompleteRelations: this.extractConfig.autoCompleteRelations
          }
        });
        if (!response.success) {
          throw new Error(response.message || '合并图谱失败');
        }

        const stats = response.data?.stats || {};
        this.stats = {
          newNodes: Number(stats.newNodes || 0),
          newLinks: Number(stats.newLinks || 0),
          duplicateNodes: Number(stats.duplicateNodes || 0),
          duplicateLinks: Number(stats.duplicateLinks || 0),
          completedLinks: Number(stats.completedLinks || 0)
        };

        this.applyGraphPayload(response.data || {});
        this.extractedData.nodes = [];
        this.extractedData.links = [];
        this.showStatistics = true;

        this.$message.success(`合并完成！新增${this.stats.newNodes}个节点，${this.stats.newLinks}个关系`);
      } catch (error) {
        console.error('合并图谱失败:', error);
        this.$message.error(error?.message || '合并图谱失败');
      }
    },
    
    async saveCurrentVersion(options = {}) {
      const silent = Boolean(options?.silent);
      const customDescription = String(options?.description || '').trim();
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const description = customDescription || `手动保存 ${timestamp}`;

      try {
        const response = await saveKnowledgeGraphVersion({
          graph_key: this.getActiveGraphKey(),
          description
        });
        if (!response.success) {
          throw new Error(response.message || '保存版本失败');
        }

        this.graphVersions = Array.isArray(response.data?.versions) ? response.data.versions : this.graphVersions;
        this.selectedVersion = response.data?.selected_version ?? this.selectedVersion;
        this.lastUpdateTime = response.data?.updated_at || this.lastUpdateTime;

        if (!silent) {
          this.$message.success(`已保存为版本 ${this.selectedVersion ?? ''}`.trim());
        }
      } catch (error) {
        if (!silent) {
          this.$message.error(error?.message || '保存版本失败');
          return;
        }
        throw error;
      }
    },
    
    async loadVersion(versionId) {
      if (!versionId) return;
      try {
        const response = await loadKnowledgeGraphVersion({
          graph_key: this.getActiveGraphKey(),
          version_id: versionId
        });
        if (!response.success) {
          throw new Error(response.message || '加载版本失败');
        }
        this.applyGraphPayload(response.data || {});
        this.$message.success(`已加载版本 ${versionId}`);
      } catch (error) {
        console.error('加载图谱版本失败:', error);
        this.$message.error(error?.message || '加载版本失败');
      }
    },
    
    async exportKnowledgeGraph() {
      try {
        const graphKey = this.getActiveGraphKey();
        const blob = await exportKnowledgeGraphFile({ graph_key: graphKey });
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const fileName = `${graphKey}_graph_${date}.json`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.$message.success('知识图谱导出成功');
      } catch (error) {
        console.error('导出图谱失败:', error);
        this.$message.error(error?.message || '导出图谱失败');
      }
    },
    
    getCategoryNodeCount(categoryName) {
      const categoryIndex = this.graphData.categories.findIndex(cat => cat.name === categoryName);
      if (categoryIndex === -1) return 0;
      
      return this.graphData.nodes.filter(node => node.category === categoryIndex).length;
    },
    
    onSubmit() {
      this.$message.success('配置保存成功');
    }
  },
  beforeUnmount() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
    if (this.previewChartInstance) {
      this.previewChartInstance.dispose();
    }
  }
}
</script>

<style scoped>
.workspace-panel {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fbff;
  border: 1px solid rgba(41, 94, 168, 0.14);
}

.panel-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.panel-desc {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.panel-metrics {
  display: flex;
  gap: 10px;
}

.panel-metric-card {
  min-width: 108px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(41, 94, 168, 0.14);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.panel-metric-card span {
  font-size: 12px;
  color: #64748b;
}

.panel-metric-card strong {
  margin-top: 4px;
  font-size: 16px;
  color: #2f5496;
}

.workspace-section-card {
  border-radius: 14px;
}

.section-card-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #1f2937;
}

.dataset-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.dataset-toolbar-left,
.dataset-toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dataset-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #5b6880;
  margin-bottom: 12px;
}

.progress-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
}

.progress-detail-link {
  color: #2f5496;
  font-size: 12px;
  cursor: pointer;
}

.retrieval-grid,
.config-grid,
.graph-workspace-grid {
  display: grid;
  gap: 14px;
}

.retrieval-grid {
  grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.1fr);
}

.retrieval-side,
.graph-side-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-label {
  margin: 8px 0 4px;
  font-size: 13px;
  color: #475467;
  font-weight: 600;
}

.retrieval-switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0 4px;
  font-size: 13px;
  color: #475467;
}

.retrieval-run-button {
  margin-top: 12px;
  width: 100%;
}

.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(140px, 1fr));
  gap: 10px;
}

.snapshot-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  background: #fafcff;
}

.snapshot-item span {
  font-size: 12px;
  color: #64748b;
}

.snapshot-item strong {
  display: block;
  margin-top: 4px;
  color: #2f5496;
}

.retrieval-result-card {
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  padding: 12px;
  background: #fbfdff;
}

.retrieval-result-summary {
  font-size: 13px;
  color: #334155;
  margin-bottom: 10px;
}

.retrieval-result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.retrieval-result-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  background: #ffffff;
}

.retrieval-result-item-title {
  font-size: 13px;
  color: #1f2937;
  font-weight: 600;
}

.retrieval-result-item-desc,
.retrieval-placeholder {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
}

.config-grid {
  grid-template-columns: minmax(360px, 0.95fr) minmax(420px, 1.05fr);
}

.config-form-card :deep(.el-form-item) {
  margin-bottom: 13px;
}

.config-actions {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 14px;
  gap: 10px;
}

.display-content-full {
  width: 100%;
}

.graph-actions-bar {
  display: flex;
  gap: 10px;
}

.graph-workspace-grid {
  grid-template-columns: minmax(500px, 1.1fr) minmax(320px, 0.9fr);
}

.graph-preview-card {
  min-height: 520px;
}

.knowledge-graph-preview {
  height: 470px;
  width: 100%;
  border-radius: 10px;
  border: 1px dashed #dbe3ef;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
}

.category-summary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 10px;
}

.category-summary-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #334155;
}

.category-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.graph-version-meta {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
}

.graph-selected-node-title {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.graph-selected-node-desc {
  margin: 8px 0 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #64748b;
}

@media (max-width: 1400px) {
  .retrieval-grid,
  .config-grid,
  .graph-workspace-grid {
    grid-template-columns: 1fr;
  }

  .panel-hero {
    flex-direction: column;
  }

  .panel-metrics {
    flex-wrap: wrap;
  }
}

.display-content{
  width: 60%;
  display: flex;
  flex-direction: column;
  line-height: 180%;
  font-size: 16px
}
.item-card{
  width: 95%;
  height: 45px;
  display: flex;
  align-items: center;
  --el-card-padding: 0 20px;
  border: 0;
  margin: 1px 0;
  font-size: 16px;
  font-weight: bold;
  color: #000;
  border-radius: 8px;
  cursor: pointer;
  transition: ease-in-out 0.2s;
}
.item-card:hover{
  background-color: rgb(199.5, 201, 204);
}
.item-card-selected{
  background-color: rgb(216.8, 235.6, 255);
  color: #409EFF;
  width: 95%;
  height: 45px;
  display: flex;
  align-items: center;
  --el-card-padding: 0 20px;
  border: 0;
  margin: 1px 0;
  font-size: 16px;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: ease-in-out 0.2s;
}
/* 知识图谱弹窗样式 */
:deep(.el-dialog) {
  height: 95vh;
  margin-top: 2vh !important;
  display: flex;
  flex-direction: column;
}
:deep(.el-dialog__body) {
  flex: 1;
  padding: 0;
  overflow: hidden;
}
:deep(.el-dialog__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  margin-right: 0;
}
:deep(.el-dialog__footer) {
  padding: 10px 20px;
  text-align: center;
  border-top: 1px solid #eee;
}
/* 节点详情样式 */
.node-detail {
  padding: 5px;
}
.node-detail .el-descriptions {
  font-size: 12px;
}
/* 知识图谱控制栏样式 */
:deep(.el-input) {
  --el-input-hover-border-color: #2f5496;
}
:deep(.el-button--primary) {
  --el-button-bg-color: #2f5496;
  --el-button-hover-bg-color: #234578;
}
/* 知识抽取按钮样式 */
:deep(.el-button--success) {
  --el-button-bg-color: #67c23a;
  --el-button-hover-bg-color: #5daf34;
}
/* 表格状态标签样式 */
.el-tag {
  margin: 2px;
}
</style>
