<template>
  <div class="oil-situation-analysis">
    <el-scrollbar height="90vh">
      <!-- 头部卡片 -->
      <el-card class="header-card">
        <div class="header-content">
          <div class="header-left">
            <div class="page-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="page-title">
              <h1>石油供应链情报知识库</h1>
              <p>基于知识库的智能检索系统：OPEC 产能、地缘政治风险、航运通道、炼厂开工率、战略储备</p>
            </div>
          </div>
          <div class="header-right">
            <!-- 铀供应链本体网络 -->
            <el-button type="warning" @click="openKnowledgeGraph">
              <el-icon><Share /></el-icon> 铀本体网络
            </el-button>
            <el-button type="primary" @click="showUploadDialog = true">
              <el-icon><Upload /></el-icon> 导入数据集
            </el-button>
            <el-button @click="refreshData">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 主体内容 -->
      <div class="main-content">
        <!-- 左侧：知识库列表 -->
        <div class="left-panel">
          <el-card class="knowledge-list-card">
            <template #header>
              <div class="card-header">
                <span><el-icon><FolderOpened /></el-icon> 知识库数据集</span>
                <span class="count-label">{{ knowledgeBooks.length }} 个数据集</span>
              </div>
            </template>

            <el-input
              v-model="bookSearchKeyword"
              placeholder="搜索数据集..."
              :prefix-icon="Search"
              clearable
              style="margin-bottom: 12px"
            />

            <div class="knowledge-list">
              <div
                v-for="book in filteredBooks"
                :key="book.id"
                class="knowledge-item"
                :class="{ active: selectedBook?.id === book.id }"
                @click="selectBook(book)"
              >
                <div class="item-icon">
                  <el-icon><Document /></el-icon>
                </div>
                <div class="item-info">
                  <div class="item-name">{{ book.name }}</div>
                  <div class="item-meta">
                    <span class="item-date">{{ book.date }}</span>
                    <el-tag :type="getBookStatusType(book)" size="small">{{ getBookStatusText(book) }}</el-tag>
                  </div>
                </div>
                <div class="item-actions">
                  <el-tooltip content="查询" placement="top">
                    <el-button size="small" @click.stop="openQueryDialog(book)">
                      <el-icon><QuestionFilled /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="删除" placement="top">
                    <el-button size="small" type="danger" @click.stop="deleteBook(book)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </el-tooltip>
                </div>
              </div>

              <div v-if="filteredBooks.length === 0" class="empty-state">
                <el-empty description="暂无知识库数据集" :image-size="80">
                  <el-button type="primary" @click="showUploadDialog = true">导入数据集</el-button>
                </el-empty>
              </div>
            </div>
          </el-card>

          <!-- 快速问题 -->
          <el-card class="quick-questions-card">
            <template #header>
              <span><el-icon><Lightning /></el-icon> 快速提问</span>
            </template>
            <div class="question-list">
              <div
                v-for="(q, idx) in quickQuestions"
                :key="idx"
                class="question-item"
                @click="quickAsk(q)"
              >
                {{ q }}
              </div>
            </div>
          </el-card>
        </div>

        <!-- 右侧：检索和结果 -->
        <div class="right-panel">
          <!-- 检索框 -->
          <el-card class="search-card">
            <div class="search-box-wrapper">
              <el-input
                v-model="searchQuery"
                type="textarea"
                :rows="3"
                placeholder="请输入关于石油供应链的问题，例如：'OPEC 最新减产政策是什么？'、'霍尔木兹海峡当前的通行状况如何？'"
                @keyup.enter="handleSearch"
              />
              <div class="search-actions">
                <el-checkbox v-model="useKnowledgeGraph">使用知识图谱增强</el-checkbox>
                <el-button type="primary" @click="handleSearch" :loading="isSearching">
                  <el-icon><Search /></el-icon> 智能检索
                </el-button>
              </div>
            </div>
          </el-card>

          <!-- 检索结果 -->
          <el-card class="result-card" v-loading="isSearching">
            <template #header>
              <div class="result-header">
                <span><el-icon><Document /></el-icon> 检索结果</span>
                <div class="result-meta">
                  <span v-if="searchResult?.bookName" class="result-book">数据集：{{ searchResult.bookName }}</span>
                  <span v-if="searchResult" class="result-count">{{ searchResult.hits?.length || 0 }} 条命中</span>
                </div>
              </div>
            </template>

            <div v-if="searchResult" class="result-content">
              <div v-if="searchResult.summary" class="answer-summary">
                <div class="summary-title">
                  <el-icon><StarFilled /></el-icon> 智能摘要
                </div>
                <div class="summary-content">{{ searchResult.summary }}</div>
              </div>

              <div class="hits-list">
                <div class="hits-title">
                  <el-icon><List /></el-icon> 参考来源
                </div>
                <div
                  v-for="(hit, idx) in searchResult.hits"
                  :key="idx"
                  class="hit-item"
                >
                  <div class="hit-header">
                    <span class="hit-source">{{ hit.file || hit.title }}</span>
                    <span class="hit-score">相似度：{{ (hit.score * 100).toFixed(1) }}%</span>
                  </div>
                  <div class="hit-content">{{ hit.desc || hit.text }}</div>
                </div>
              </div>
            </div>

            <div v-else class="search-placeholder">
              <el-empty description='输入问题并点击"智能检索"获取答案' :image-size="100">
                <div class="placeholder-tips">
                  <p>支持查询：</p>
                  <ul>
                    <li>OPEC 产能政策与减产协议</li>
                    <li>地缘政治风险事件</li>
                    <li>航运通道与油轮追踪</li>
                    <li>炼厂开工率与检修计划</li>
                    <li>战略石油储备数据</li>
                    <li>原油价格走势分析</li>
                  </ul>
                </div>
              </el-empty>
            </div>
          </el-card>
        </div>
      </div>
    </el-scrollbar>

    <!-- ==================== 知识图谱全屏遮罩 ==================== -->
    <Teleport to="body">
      <div v-if="kgDialogVisible" class="kg-fullscreen-overlay">
        <!-- 顶部工具栏 -->
        <div class="kg-toolbar">
          <span class="kg-toolbar-title">🛢️ 石油供应链知识图谱 — {{ isOwlView ? 'OWL 本体网络' : '动态本体网络' }}</span>
          <button class="kg-close-btn" @click="kgDialogVisible = false" title="关闭 (Esc)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="kg-container">
          <!-- 左侧筛选面板 -->
          <div class="kg-left-panel">
            <div class="panel-header">{{ isOwlView ? 'OWL 本体网络' : '动态本体网络' }}</div>

            <div class="panel-section" v-if="!isOwlView">
              <label>时间窗口 (2024-01 ~ 2026-06)</label>
              <div class="timeline-controls">
                <el-button size="small" :disabled="!kgWindowIdx" @click="windowStep(-1)">◀</el-button>
                <span class="timeline-label">{{ currentMonth }}</span>
                <el-button size="small" :disabled="kgWindowIdx >= kgMaxWindowIdx" @click="windowStep(1)">▶</el-button>
              </div>
              <el-slider v-model="kgWindowIdx" :min="0" :max="kgMaxWindowIdx" :step="1"
                         :show-tooltip="false" @change="onWindowSlide" size="small"/>
              <div class="window-info">
                <span>{{ currentSnapshot.node_count || 0 }} 节点</span>
                <span>{{ currentSnapshot.edge_count || 0 }} 边</span>
              </div>
            </div>

            <div class="panel-section" v-if="isOwlView">
              <div class="owl-view-stats">
                <div class="owl-view-row"><span>节点</span><strong>{{ kgStats.nodes }}</strong></div>
                <div class="owl-view-row"><span>边</span><strong>{{ kgStats.edges }}</strong></div>
                <div class="owl-view-row"><span>类型</span><strong>{{ kgStore.owlNetworkGraph?.categories?.length || 0 }}</strong></div>
              </div>
              <el-button size="small" type="warning" link @click="isOwlView=false; loadWindow()"
                         style="margin-top:6px;font-size:10px">
                ◂ 切回动态时间线
              </el-button>
            </div>

            <div class="panel-section">
              <label>角色分布</label>
              <div class="dynamic-roles-info">
                <el-tag size="small" type="danger">关键节点 {{ roleCounts.key_nodes }}</el-tag>
                <el-tag size="small" type="warning">桥接节点 {{ roleCounts.bridge_nodes }}</el-tag>
                <el-tag size="small" type="info">普通节点 {{ roleCounts.normal_nodes }}</el-tag>
              </div>
            </div>

            <div class="panel-section">
              <label>搜索实体</label>
              <el-input v-model="kgSearchQuery" placeholder="输入实体名称..."
                        clearable @keyup.enter="onKgSearch" @clear="onKgClearSearch">
                <template #prefix><el-icon><Search/></el-icon></template>
              </el-input>
            </div>

            <div class="panel-section stats-section">
              <div class="stat-line"><span>总节点</span><strong>{{ kgStats.nodes }}</strong></div>
              <div class="stat-line"><span>总边</span><strong>{{ kgStats.edges }}</strong></div>
              <template v-if="!isOwlView">
                <div class="stat-line"><span>事件总数</span><strong>{{ kgStore.dynamicGraph?.metadata?.total_events || 0 }}</strong></div>
                <div class="stat-line"><span>时间窗口</span><strong>{{ kgStore.dynamicWindows.length }}</strong></div>
              </template>
              <template v-else>
                <div class="stat-line"><span>类层次</span><strong>{{ kgStore.owlStats?.total_classes || kgStore.owlNetwork?.statistics?.total_classes || 0 }}</strong></div>
                <div class="stat-line"><span>推理规则</span><strong>{{ kgStore.owlStats?.swrl_rules || 8 }}</strong></div>
              </template>
            </div>

            <div class="panel-section owl-section" v-if="kgStore.owlNetworkLabels">
              <div class="owl-header">
                <span class="owl-badge">OWL 2 DL</span>
                <span class="swrl-badge">SWRL ×{{ kgStore.owlStats?.swrl_rules || 8 }}</span>
                <el-button size="small" type="primary" link
                           @click="switchToOwlNetwork"
                           :loading="kgStore.owlNetworkLoading"
                           style="margin-left:auto;font-size:10px">
                  {{ kgStore.owlNetworkGraph ? '✓ OWL网络' : '加载网络' }}
                </el-button>
              </div>
              <div class="owl-reasoner">
                <span class="reasoner-dot"></span> Pellet 推理器 &middot; NetworkX 5维中心性
              </div>
              <div class="owl-centrality-stats">
                <div class="cent-stat"><span class="cent-num">{{ kgStore.owlNetwork?.statistics?.graph_nodes || 0 }}</span><span class="cent-label">节点</span></div>
                <div class="cent-stat"><span class="cent-num">{{ kgStore.owlNetwork?.statistics?.graph_edges || 0 }}</span><span class="cent-label">边</span></div>
                <div class="cent-stat cent-key"><span class="cent-num">{{ roleCountsOwl.key_nodes }}</span><span class="cent-label">关键节点</span></div>
                <div class="cent-stat cent-bridge"><span class="cent-num">{{ roleCountsOwl.bridge_nodes }}</span><span class="cent-label">桥接节点</span></div>
              </div>
              <div class="inferred-title">SWRL 推理分类</div>
              <div class="inferred-tags">
                <el-tooltip content="高风险实体" placement="left"><span class="inf-tag inf-danger">高风险 {{ kgStore.owlNetworkLabels.HighRiskEntity?.count || 0 }}</span></el-tooltip>
                <el-tooltip content="供应链中断" placement="left"><span class="inf-tag inf-warning">中断 {{ kgStore.owlNetworkLabels.SupplyChainDisruption?.count || 0 }}</span></el-tooltip>
                <el-tooltip content="关键物料短缺" placement="left"><span class="inf-tag inf-critical">物料 {{ kgStore.owlNetworkLabels.CriticalMaterialShortage?.count || 0 }}</span></el-tooltip>
                <el-tooltip content="高库存压力" placement="left"><span class="inf-tag inf-pressure">库存 {{ kgStore.owlNetworkLabels.HighInventoryPressure?.count || 0 }}</span></el-tooltip>
                <el-tooltip content="多风险区域" placement="left"><span class="inf-tag inf-multirisk">区域 {{ kgStore.owlNetworkLabels.MultiRiskRegion?.count || 0 }}</span></el-tooltip>
                <el-tooltip content="物流瓶颈" placement="left"><span class="inf-tag inf-bottleneck">物流 {{ kgStore.owlNetworkLabels.LogisticsBottleneck?.count || 0 }}</span></el-tooltip>
              </div>
            </div>

            <div class="panel-section owl-section owl-loading" v-else-if="kgStore.owlNetworkLoading">
              <div class="owl-header"><span class="owl-badge">OWL 2 DL</span></div>
              <div class="owl-reasoner"><span class="reasoner-dot"></span> 正在加载 OWL 网络...</div>
            </div>

            <div class="panel-section" style="margin-top:8px" v-if="!isOwlView">
              <label>结构变化</label>
              <div class="structural-changes" v-if="structuralChanges.length">
                <div v-for="(ch, i) in structuralChanges.slice(0, 6)" :key="i" class="change-item">
                  <span class="change-month">{{ ch.timestamp || ch.month }}</span>
                  <span class="change-desc">{{ ch.description }}</span>
                </div>
              </div>
              <el-empty v-else description="暂无结构变化" :image-size="30"/>
            </div>
          </div>

          <!-- 中央图区域 -->
          <div class="kg-center">
            <div v-show="kgLoading" class="kg-loading-overlay">
              <el-icon class="is-loading" :size="40"><Loading/></el-icon>
              <span>图谱加载中...</span>
            </div>
            <div ref="kgChartRef" class="kg-chart"></div>
          </div>

          <!-- 右侧详情面板 -->
          <div class="kg-right-panel" v-if="kgStore.selectedNode">
            <div class="panel-header">
              节点详情
              <el-button link size="small" @click="kgStore.clearSelection()">✕</el-button>
            </div>
            <div class="detail-content">
              <div class="detail-field"><label>名称</label><span>{{ kgStore.selectedNode.name }}</span></div>
              <div class="detail-field"><label>类型</label><el-tag size="small">{{ kgStore.selectedNode.nodeType }}</el-tag></div>

              <div class="detail-field" v-if="kgCentralityMetrics">
                <label>5维中心性评分</label>
                <div class="centrality-card">
                  <div class="cent-row"><span class="cent-dim">度中心性 (0.3)</span><span class="cent-bar-bg"><span class="cent-bar-fill" :style="{width: (kgCentralityMetrics.degree*100).toFixed(1)+'%'}"></span></span><span class="cent-val">{{ (kgCentralityMetrics.degree || 0).toFixed(4) }}</span></div>
                  <div class="cent-row"><span class="cent-dim">介数中心性 (0.3)</span><span class="cent-bar-bg"><span class="cent-bar-fill cent-bet" :style="{width: (kgCentralityMetrics.betweenness*100).toFixed(1)+'%'}"></span></span><span class="cent-val">{{ (kgCentralityMetrics.betweenness || 0).toFixed(4) }}</span></div>
                  <div class="cent-row"><span class="cent-dim">紧密中心性 (0.2)</span><span class="cent-bar-bg"><span class="cent-bar-fill cent-clo" :style="{width: (kgCentralityMetrics.closeness*100).toFixed(1)+'%'}"></span></span><span class="cent-val">{{ (kgCentralityMetrics.closeness || 0).toFixed(4) }}</span></div>
                  <div class="cent-row"><span class="cent-dim">K-Core (0.1)</span><span class="cent-bar-bg"><span class="cent-bar-fill cent-kc" :style="{width: (kgCentralityMetrics.k_core_normalized*100).toFixed(1)+'%'}"></span></span><span class="cent-val">{{ (kgCentralityMetrics.k_core_normalized || 0).toFixed(4) }}</span></div>
                  <div class="cent-row"><span class="cent-dim">桥接系数 (0.1)</span><span class="cent-bar-bg"><span class="cent-bar-fill cent-br" :style="{width: (kgCentralityMetrics.bridge_coefficient*100).toFixed(1)+'%'}"></span></span><span class="cent-val">{{ (kgCentralityMetrics.bridge_coefficient || 0).toFixed(4) }}</span></div>
                  <div class="cent-score-total">综合得分: <strong>{{ nodeRoleScore.toFixed(4) }}</strong><el-tag size="small" :type="nodeRoleTag">{{ nodeRoleLabel }}</el-tag></div>
                </div>
              </div>

              <div class="detail-field" v-if="kgInferenceTags.length">
                <label>OWL 推理标签</label>
                <div class="inference-tags-list">
                  <span v-for="tag in kgInferenceTags" :key="tag.key" :class="['inf-tag', tag.cssClass]">{{ tag.label }}</span>
                </div>
              </div>

              <div class="detail-field" v-if="kgNeighbors.length">
                <label>关联节点 ({{ kgNeighbors.length }})</label>
                <div class="neighbor-list">
                  <span v-for="n in kgNeighbors.slice(0, 20)" :key="n.id" class="neighbor-chip" @click="focusNode(n.id)">{{ n.label }}</span>
                </div>
              </div>
              <div class="detail-field" v-if="kgPropsEntries.length">
                <label>属性</label>
                <div class="props-table">
                  <div v-for="(v, k) in kgPropsEntries.slice(0, 15)" :key="k" class="prop-row">
                    <span class="prop-key">{{ k }}</span><span class="prop-val">{{ formatKgVal(v) }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-field" v-if="kgStore.owlRiskPaths.length">
                <label>风险传导路径 (OWL推理)</label>
                <div class="risk-path-list">
                  <div v-for="(p, i) in kgStore.owlRiskPaths.slice(0, 5)" :key="i" class="risk-path-item">
                    <div class="risk-path-event">{{ p.eventName?.slice(0, 40) || p.event }}</div>
                    <div class="risk-path-arrow">&#8627; 影响</div>
                    <div class="risk-path-target">{{ p.targetName?.slice(0, 40) || p.target }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="kg-right-panel kg-right-empty" v-else>
            <div class="panel-header">节点详情</div>
            <el-empty description="点击节点查看详情" :image-size="60"/>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 上传对话框 -->
    <el-dialog
      v-model="showUploadDialog"
      title="导入石油供应链数据集"
      width="550px"
      :before-close="closeUploadDialog"
    >
      <el-form ref="uploadFormRef" :model="uploadForm" :rules="uploadRules" label-width="100px">
        <el-form-item label="数据集名称" prop="bookName">
          <el-input v-model="uploadForm.bookName" placeholder="例如：OPEC 月度报告 2026" />
        </el-form-item>
        <el-form-item label="数据集文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="fileList"
            :show-file-list="true"
            multiple
            accept=".pdf,.txt,.md,.json,.csv,.xlsx,.doc,.docx"
            action=""
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip><div class="upload-tip">支持 PDF、文本、Excel、Word 等格式</div></template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeUploadDialog">取消</el-button>
        <el-button type="primary" @click="submitUpload" :loading="isUploading">上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Document, Upload, Refresh, Search, FolderOpened, QuestionFilled, Delete,
  Lightning, StarFilled, List, Share, Loading
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getKnowledgeBookList,
  importKnowledgeBook,
  analyzeKnowledgeBook,
  queryKnowledgeBook,
  deleteKnowledgeBook
} from '@/api/knowledgeBase'
import { useOntologyStore } from '@/stores/ontology'
import { storeToRefs } from 'pinia'
import * as echarts from 'echarts'

// =====================================================================
//  知识库检索（原 OilSituationAnalysis 逻辑）
// =====================================================================
const knowledgeBooks = ref([])
const selectedBook = ref(null)
const bookSearchKeyword = ref('')
const searchQuery = ref('')
const searchResult = ref(null)
const isSearching = ref(false)
const useKnowledgeGraph = ref(false)
const showUploadDialog = ref(false)
const isUploading = ref(false)

const uploadFormRef = ref(null)
const uploadRef = ref(null)
const uploadForm = ref({ bookName: '', files: [] })
const fileList = ref([])

const uploadRules = {
  bookName: [{ required: true, message: '请输入数据集名称', trigger: 'blur' }]
}

const quickQuestions = [
  'OPEC 最新的减产政策是什么？',
  '霍尔木兹海峡当前的通行状况如何？',
  '美国战略石油储备 (SPR) 最新数据是多少？',
  '北海 Brent 油田的产能情况？',
  '红海航线保险费用上涨对油运的影响？',
  '全球主要炼厂开工率统计'
]

const filteredBooks = computed(() => {
  if (!bookSearchKeyword.value) return knowledgeBooks.value
  const keyword = bookSearchKeyword.value.toLowerCase()
  return knowledgeBooks.value.filter(book => book.name.toLowerCase().includes(keyword))
})

const getBookStatusType = (book) => {
  if (book.ocrPercentage === 100) return 'success'
  if (book.ocrPercentage > 0) return 'warning'
  return 'info'
}

const getBookStatusText = (book) => {
  if (book.ocrPercentage === 100) return '已解析'
  if (book.ocrPercentage > 0) return '解析中'
  return '未解析'
}

const loadKnowledgeBooks = async () => {
  try {
    const res = await getKnowledgeBookList()
    if (res.success) {
      knowledgeBooks.value = res.data || []
      if (!selectedBook.value && knowledgeBooks.value.length > 0) {
        selectedBook.value = knowledgeBooks.value[0]
      }
    }
  } catch (error) {
    console.error('加载知识库失败:', error)
  }
}

const selectBook = (book) => { selectedBook.value = book }
const openQueryDialog = (book) => { selectedBook.value = book; searchQuery.value = ''; searchResult.value = null }

const deleteBook = async (book) => {
  try {
    await ElMessageBox.confirm(`确定要删除数据集 "${book.name}" 吗？`, '确认删除', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    const res = await deleteKnowledgeBook({ book_name: book.name })
    if (res.success) {
      ElMessage.success('删除成功')
      loadKnowledgeBooks()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') console.error('删除失败:', error)
  }
}

const quickAsk = (question) => { searchQuery.value = question; handleSearch() }

const handleSearch = async () => {
  if (!searchQuery.value.trim()) { ElMessage.warning('请输入查询内容'); return }
  if (knowledgeBooks.value.length === 0) { ElMessage.warning('请先导入知识库数据集'); showUploadDialog.value = true; return }

  isSearching.value = true
  searchResult.value = null

  try {
    const targetBooks = selectedBook.value
      ? [selectedBook.value.name]
      : knowledgeBooks.value.map(b => b.name)

    let bestResult = null
    let bestScore = 0

    for (const bookName of targetBooks) {
      try {
        const res = await queryKnowledgeBook({
          query: searchQuery.value,
          book_name: bookName,
          useKnowledgeGraph: useKnowledgeGraph.value
        })
        if (res.success && res.data) {
          const data = res.data
          const chunks = data.chunks || []
          if (chunks.length > 0) {
            const hits = chunks.map((text, idx) => ({
              title: bookName,
              desc: typeof text === 'string' ? text : (text.text || text.content || JSON.stringify(text)),
              score: data.retrieval_meta?.local_hit_count ? 1 - (idx * 0.1) : 0.5
            }))
            const avgScore = hits.reduce((sum, h) => sum + (h.score || 0), 0) / hits.length
            if (avgScore > bestScore) {
              bestScore = avgScore
              bestResult = { summary: data.content || '', hits, bookName }
            }
          }
        }
      } catch (err) { console.error('[Query] Book:', bookName, 'Error:', err) }
    }

    if (bestResult) {
      searchResult.value = bestResult
      if (!bestResult.hits || bestResult.hits.length === 0) ElMessage.info('未找到相关结果')
    } else {
      searchResult.value = { summary: '未检索到直接相关片段，请尝试更具体的关键词。', hits: [] }
    }
  } catch (error) {
    console.error('查询失败:', error)
    ElMessage.error('查询失败，请重试')
  } finally {
    isSearching.value = false
  }
}

const refreshData = () => { loadKnowledgeBooks(); ElMessage.success('已刷新') }

const handleFileChange = (file, files) => { fileList.value = files; uploadForm.value.files = files }
const handleFileRemove = (file, files) => { fileList.value = files; uploadForm.value.files = files }

const closeUploadDialog = () => {
  showUploadDialog.value = false
  uploadForm.value = { bookName: '', files: [] }
  fileList.value = []
  if (uploadRef.value) uploadRef.value.clearFiles()
}

const submitUpload = async () => {
  if (fileList.value.length === 0) { ElMessage.warning('请选择要上传的文件'); return }
  try { await uploadFormRef.value.validate() } catch { return }
  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('book_name', uploadForm.value.bookName)
    fileList.value.forEach(file => { formData.append('file', file.raw || file) })
    const res = await importKnowledgeBook(formData)
    if (res.success) {
      const bookName = uploadForm.value.bookName
      ElMessage.success('导入成功，开始解析数据集')
      closeUploadDialog()
      loadKnowledgeBooks()
      setTimeout(async () => {
        try {
          const analyzeRes = await analyzeKnowledgeBook({ book_name: bookName })
          if (analyzeRes.success) { ElMessage.success('解析任务已启动') }
          else { ElMessage.warning('解析任务启动失败：' + (analyzeRes.message || '')) }
          loadKnowledgeBooks()
        } catch (err) { console.error('解析任务启动失败:', err); ElMessage.warning('解析任务启动失败'); loadKnowledgeBooks() }
      }, 1000)
    } else {
      ElMessage.error(res.message || '导入失败')
    }
  } catch (error) { console.error('上传失败:', error); ElMessage.error('上传失败，请重试') }
  finally { isUploading.value = false }
}

// =====================================================================
//  知识图谱（原 KnowledgeGraph 逻辑，变量加 kg 前缀避免冲突）
// =====================================================================
const MAX_VISIBLE_NODES = 300
const METRIC_TYPES = new Set(['SalesMetric', 'CostMetric', 'DemandSupplyMetric', 'InventoryMetric'])
const CORE_TYPES = new Set([
  'Supplier', 'Manufacturer', 'LogisticsProvider', 'Dealer',
  'VehicleModel', 'Material', 'Region',
  'RiskEvent', 'LogisticsRisk', 'MaterialRisk', 'GeopoliticalRisk', 'PolicyRisk',
  'MarketEvent', 'PolicyEvent', 'MultiRiskRegion',
  'HighRiskEntity', 'SupplyChainDisruption', 'HighInventoryPressure',
  'CriticalMaterialShortage', 'LogisticsBottleneck',
  'TurningPoint', 'ScenarioNode', 'RiskProfile',
])

const router = useRouter()
const kgDialogVisible = ref(false)
const kgStore = useOntologyStore()
const { loading: kgLoading } = storeToRefs(kgStore)

const kgChartRef = ref(null)
let kgChart = null
let kgRenderTimer = null
let kgResizeObserver = null

const kgSearchQuery = ref('')
const kgWindowIdx = ref(0)
const kgMaxWindowIdx = ref(0)
const isOwlView = ref(false)

const openKnowledgeGraph = () => {
  router.push({ name: 'SCnet_KnowledgeGraph' })
}

const currentMonth = computed(() => {
  const wins = kgStore.dynamicWindows
  if (!wins.length) return '加载中...'
  return wins[kgWindowIdx.value] || ''
})

const currentSnapshot = computed(() => {
  const wins = kgStore.dynamicWindows
  if (!wins.length) return { node_count: 0, edge_count: 0 }
  const key = wins[kgWindowIdx.value]
  const gs = kgStore.dynamicGraph?.graph_sequence
  if (!gs || !key) return { node_count: 0, edge_count: 0 }
  const snap = gs[key]
  if (!snap) return { node_count: 0, edge_count: 0 }
  const mg = snap.merged_graph || {}
  return { node_count: mg.nodes?.length || 0, edge_count: mg.edges?.length || 0 }
})

const roleCounts = computed(() => {
  if (isOwlView.value && kgStore.owlNetwork) {
    const dist = kgStore.owlNetwork.statistics?.role_distribution || {}
    return { key_nodes: dist.key_nodes || 0, bridge_nodes: dist.bridge_nodes || 0, normal_nodes: dist.normal_nodes || 0 }
  }
  const rag = kgStore.dynamicGraph?.role_annotated_graph
  const dist = rag?.role_distribution || kgStore.dynamicGraph?.metadata?.role_distribution || {}
  return { key_nodes: dist.key_nodes || 0, bridge_nodes: dist.bridge_nodes || 0, normal_nodes: dist.normal_nodes || 0 }
})

const roleCountsOwl = computed(() => {
  const dist = kgStore.owlNetwork?.statistics?.role_distribution || {}
  return { key_nodes: dist.key_nodes || 0, bridge_nodes: dist.bridge_nodes || 0, normal_nodes: dist.normal_nodes || 0 }
})

const structuralChanges = computed(() => {
  return kgStore.dynamicGraph?.timeline?.structural_changes || []
})

const kgStats = computed(() => ({
  nodes: kgStore.currentView.nodes?.length || 0,
  edges: kgStore.currentView.edges?.length || 0
}))

const kgCentralityMetrics = computed(() => {
  const props = kgStore.selectedNode?.properties
  const cm = props?.centrality_metrics
  if (cm && typeof cm === 'object' && Object.keys(cm).length > 0) return cm
  return null
})

const nodeRoleScore = computed(() => kgStore.selectedNode?.properties?.role_confidence || 0)

const nodeRoleLabel = computed(() => {
  const role = kgStore.selectedNode?.properties?.role || ''
  const map = { key_node: '关键节点', bridge_node: '桥接节点', normal_node: '普通节点' }
  return map[role] || role
})

const nodeRoleTag = computed(() => {
  const role = kgStore.selectedNode?.properties?.role || ''
  if (role === 'key_node') return 'danger'
  if (role === 'bridge_node') return 'warning'
  return 'info'
})

const kgInferenceTags = computed(() => {
  const props = kgStore.selectedNode?.properties || {}
  const tagDefs = [
    { key: 'HighRiskEntity', label: '高风险实体', cssClass: 'inf-danger' },
    { key: 'SupplyChainDisruption', label: '供应链中断', cssClass: 'inf-warning' },
    { key: 'HighInventoryPressure', label: '高库存压力', cssClass: 'inf-pressure' },
    { key: 'CriticalMaterialShortage', label: '关键物料短缺', cssClass: 'inf-critical' },
    { key: 'MultiRiskRegion', label: '多风险区域', cssClass: 'inf-multirisk' },
    { key: 'LogisticsBottleneck', label: '物流瓶颈', cssClass: 'inf-bottleneck' },
  ]
  return tagDefs.filter(t => props[t.key])
})

const kgPropsEntries = computed(() => {
  const props = kgStore.selectedNode?.properties
  if (!props || typeof props !== 'object') return []
  const skipKeys = ['centrality_metrics', 'role_confidence', 'role',
    'HighRiskEntity', 'SupplyChainDisruption', 'HighInventoryPressure',
    'CriticalMaterialShortage', 'MultiRiskRegion', 'LogisticsBottleneck']
  return Object.entries(props).filter(([k, v]) => !skipKeys.includes(k) && v !== null && v !== '' && v !== undefined)
})

const kgNeighbors = computed(() => {
  if (!kgStore.selectedNode) return []
  const nodeId = kgStore.selectedNode.id
  const graph = kgStore.currentView
  const related = new Map()
  for (const e of graph.edges || []) {
    if (e.source === nodeId && e.target !== nodeId) {
      const n = (graph.nodes || []).find(nd => nd.id === e.target)
      if (n) related.set(n.id, { id: n.id, label: n.name, relation: e.relation })
    } else if (e.target === nodeId && e.source !== nodeId) {
      const n = (graph.nodes || []).find(nd => nd.id === e.source)
      if (n) related.set(n.id, { id: n.id, label: n.name, relation: e.relation })
    }
  }
  return [...related.values()]
})

function formatKgVal(v) {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 60)
  return String(v).slice(0, 80)
}

function getVisibleGraph() {
  const graph = kgStore.currentView
  const nodes = graph.nodes || []
  const edges = graph.edges || []
  if (nodes.length <= MAX_VISIBLE_NODES) return { nodes, edges }
  if (isOwlView.value) return filterOwlGraph(nodes, edges)
  const priorityTypes = ['Manufacturer', 'Supplier', 'LogisticsProvider', 'Dealer', 'TurningPoint']
  const priorityNodes = [], otherNodes = []
  for (const n of nodes) {
    if (priorityTypes.includes(n.nodeType)) priorityNodes.push(n)
    else otherNodes.push(n)
  }
  const selected = [...priorityNodes, ...otherNodes].slice(0, MAX_VISIBLE_NODES)
  const selectedIds = new Set(selected.map(n => n.id))
  return { nodes: selected, edges: edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target)) }
}

function filterOwlGraph(nodes, edges) {
  const coreNodes = [], metricNodes = [], otherNodes = []
  for (const n of nodes) {
    if (CORE_TYPES.has(n.nodeType)) coreNodes.push(n)
    else if (METRIC_TYPES.has(n.nodeType)) metricNodes.push(n)
    else otherNodes.push(n)
  }
  const keyNodes = coreNodes.filter(n => {
    const role = n.properties?.role
    return role === 'key_node' || role === 'bridge_node'
  })
  const plainCore = coreNodes.filter(n => !keyNodes.includes(n))
  let selected = [...keyNodes, ...plainCore, ...otherNodes, ...metricNodes]
  if (selected.length > MAX_VISIBLE_NODES) selected = selected.slice(0, MAX_VISIBLE_NODES)
  const selectedIds = new Set(selected.map(n => n.id))
  return { nodes: selected, edges: edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target)) }
}

function buildKgChartOption() {
  const { nodes, edges } = getVisibleGraph()
  const graph = kgStore.currentView
  const categories = graph.categories || []
  const selectedId = kgStore.selectedNode?.id
  return {
    tooltip: {
      trigger: 'item', confine: true,
      formatter: (p) => {
        if (p.dataType === 'node') {
          const props = p.data.properties || {}
          const propStr = Object.entries(props).slice(0, 6).map(([k, v]) => `${k}: ${formatKgVal(v)}`).join('<br/>')
          return `<b>${p.name}</b><br/>类型: ${p.data.nodeType}<br/>${propStr}`
        }
        return `${p.data.source} → ${p.data.relation || ''} → ${p.data.target}`
      }
    },
    legend: { data: categories.map(c => c.name), bottom: 10, type: 'scroll' },
    animationDuration: 400,
    animationEasingUpdate: 'cubicOut',
    series: [{
      type: 'graph', layout: 'force',
      data: nodes.map(n => ({
        id: n.id, name: n.name, category: n.category,
        symbolSize: n.symbolSize || 20, nodeType: n.nodeType, properties: n.properties,
        itemStyle: n.id === selectedId ? { borderColor: '#ff0', borderWidth: 3, shadowBlur: 10, shadowColor: '#ff0' } : undefined,
        label: { show: (n.symbolSize || 20) > 28, fontSize: 10, position: 'right' }
      })),
      edges: edges.map(e => ({
        source: e.source, target: e.target, relation: e.relation,
        label: { show: false, formatter: e.relation },
        lineStyle: { curveness: 0.15, opacity: 0.35, width: 1 }
      })),
      categories, roam: true, draggable: true,
      force: { repulsion: 400, gravity: 0.06, edgeLength: [60, 220], layoutAnimation: true, friction: 0.6 },
      emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
      scaleLimit: { min: 0.2, max: 5 }
    }]
  }
}

function tryInitKgChart() {
  if (!kgChartRef.value) return false
  const el = kgChartRef.value
  if (el.clientWidth === 0 || el.clientHeight === 0) return false
  if (!kgChart) {
    kgChart = echarts.init(el)
    kgChart.on('click', (params) => {
      if (params.dataType === 'node') kgStore.selectNode(params.data)
    })
  }
  return true
}

function renderKgChart() {
  if (!tryInitKgChart()) { kgRenderTimer = setTimeout(renderKgChart, 200); return }
  kgChart.setOption(buildKgChartOption(), true)
}

function handleKgResize() {
  if (!kgChart || !kgChartRef.value) return
  kgChart.resize(); renderKgChart()
}

function windowStep(dir) {
  const next = kgWindowIdx.value + dir
  if (next >= 0 && next <= kgMaxWindowIdx.value) { kgWindowIdx.value = next; loadWindow() }
}
function onWindowSlide() { loadWindow() }

async function loadWindow() {
  const winKey = kgStore.dynamicWindows[kgWindowIdx.value]
  if (winKey) { isOwlView.value = false; await kgStore.loadDynamicWindow(winKey); nextTick(renderKgChart) }
}

function onKgSearch() {
  if (!kgSearchQuery.value) return
  const q = kgSearchQuery.value.toLowerCase()
  const nodes = kgStore.currentView.nodes || []
  const found = nodes.find(n => (n.name || '').toLowerCase().includes(q) || (n.id || '').toLowerCase().includes(q))
  if (found) kgStore.selectNode(found)
}
function onKgClearSearch() { kgStore.clearSelection() }
function focusNode(nodeId) {
  const graph = kgStore.currentView
  const node = (graph.nodes || []).find(n => n.id === nodeId)
  if (node) kgStore.selectNode(node)
}

async function switchToOwlNetwork() {
  if (!kgStore.owlNetworkGraph) await kgStore.fetchOwlNetwork()
  if (kgStore.owlNetworkGraph) { kgStore.currentView = { ...kgStore.owlNetworkGraph }; isOwlView.value = true; nextTick(renderKgChart) }
}

// 监听 KG 数据变化
watch(() => kgStore.currentView, () => {
  clearTimeout(kgRenderTimer)
  kgRenderTimer = setTimeout(() => nextTick(renderKgChart), 80)
})

watch(() => kgStore.selectedNode, () => {
  if (kgChart) kgChart.setOption(buildKgChartOption(), true)
})

// 监听 dialog 打开/关闭：延迟渲染图谱 + ESC 关闭
watch(kgDialogVisible, (val) => {
  if (val) {
    nextTick(() => { setTimeout(renderKgChart, 300) })
    document.addEventListener('keydown', onKgKeydown)
  } else {
    document.removeEventListener('keydown', onKgKeydown)
  }
})

function onKgKeydown(e) {
  if (e.key === 'Escape') {
    kgDialogVisible.value = false
  }
}

// =====================================================================
//  生命周期
// =====================================================================
onMounted(() => {
  console.log('=== OilSituationAnalysis v20260622 loaded ===')
  loadKnowledgeBooks()

  // 预加载知识图谱数据（后台静默加载）
  kgStore.fetchOwlStats()
  kgStore.fetchOwlInferred()
  kgStore.fetchOwlNetwork().then(() => {
    if (kgStore.owlNetworkGraph?.nodes?.length) {
      kgStore.currentView = { ...kgStore.owlNetworkGraph }
      isOwlView.value = true
    }
  })
  kgStore.fetchDynamicGraph().then(() => {
    kgMaxWindowIdx.value = kgStore.dynamicWindows.length - 1
    kgWindowIdx.value = kgStore.dynamicWindows.length - 1
    if (!isOwlView.value && kgStore.dynamicWindows.length) {
      kgStore.loadDynamicWindow(kgStore.dynamicWindows[kgWindowIdx.value])
    }
  }).then(() => kgStore.fetchDynamicTimeline())

  window.addEventListener('resize', handleKgResize)
})

onBeforeUnmount(() => {
  clearTimeout(kgRenderTimer)
  window.removeEventListener('resize', handleKgResize)
  kgResizeObserver?.disconnect()
  kgChart?.dispose()
  kgChart = null
})
</script>

<style scoped>
/* ===== 原有 OilSituationAnalysis 样式 ===== */
.oil-situation-analysis { width: 100%; min-height: 100%; background: linear-gradient(180deg, #f6f9fd 0%, #eef3fb 100%); padding: 16px; box-sizing: border-box; }
.header-card { margin-bottom: 16px; border-radius: 12px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: center; gap: 16px; }
.page-icon { width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #409eff 0%, #67c23a 100%); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 28px; }
.page-title h1 { margin: 0 0 6px 0; font-size: 22px; color: #303133; }
.page-title p { margin: 0; font-size: 13px; color: #909399; }
.header-right { display: flex; gap: 12px; }
.main-content { display: grid; grid-template-columns: 320px 1fr; gap: 16px; }
.left-panel { display: flex; flex-direction: column; gap: 16px; }
.right-panel { display: flex; flex-direction: column; gap: 16px; }
.knowledge-list-card { border-radius: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.count-label { font-size: 12px; color: #909399; }
.knowledge-list { max-height: 500px; overflow-y: auto; }
.knowledge-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid #f0f0f0; margin-bottom: 8px; }
.knowledge-item:hover { background: #f5f7fa; border-color: #409eff; }
.knowledge-item.active { background: #f0f7ff; border-color: #409eff; }
.item-icon { width: 40px; height: 40px; border-radius: 8px; background: #e8f0fe; display: flex; align-items: center; justify-content: center; color: #409eff; font-size: 20px; }
.item-info { flex: 1; min-width: 0; }
.item-name { font-weight: 500; color: #303133; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.item-date { color: #909399; }
.item-actions { display: flex; gap: 4px; }
.empty-state { text-align: center; padding: 40px 0; }
.quick-questions-card { border-radius: 12px; }
.question-list { display: flex; flex-direction: column; gap: 8px; }
.question-item { padding: 10px 12px; background: #f5f7fa; border-radius: 6px; font-size: 13px; color: #606266; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
.question-item:hover { background: #ecf5ff; border-color: #409eff; color: #409eff; }
.search-card { border-radius: 12px; }
.search-box-wrapper { display: flex; flex-direction: column; gap: 12px; }
.search-actions { display: flex; justify-content: space-between; align-items: center; }
.result-card { border-radius: 12px; min-height: 400px; }
.result-header { display: flex; justify-content: space-between; align-items: center; }
.result-meta { display: flex; align-items: center; gap: 12px; }
.result-book { font-size: 12px; color: #409eff; font-weight: 500; }
.result-count { font-size: 12px; color: #909399; }
.result-content { display: flex; flex-direction: column; gap: 16px; }
.answer-summary { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; }
.summary-title { display: flex; align-items: center; gap: 6px; font-weight: 600; color: #0288d1; margin-bottom: 8px; }
.summary-content { font-size: 14px; color: #303133; line-height: 1.6; }
.hits-list { display: flex; flex-direction: column; gap: 12px; }
.hits-title { display: flex; align-items: center; gap: 6px; font-weight: 600; color: #606266; }
.hit-item { background: #fafbfc; border: 1px solid #e4e7ed; border-radius: 8px; padding: 12px; }
.hit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.hit-source { font-weight: 500; color: #409eff; }
.hit-score { font-size: 12px; color: #909399; }
.hit-content { font-size: 13px; color: #606266; line-height: 1.5; }
.search-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; }
.placeholder-tips { text-align: left; font-size: 13px; color: #909399; }
.placeholder-tips ul { margin: 8px 0 0 0; padding-left: 20px; }
.placeholder-tips li { margin-bottom: 4px; }
.upload-tip { font-size: 12px; color: #909399; margin-top: 4px; }
:deep(.el-scrollbar__wrap) { overflow-x: hidden; }

/* ===== 知识图谱全屏遮罩 ===== */
.kg-fullscreen-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.kg-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 40px;
  min-height: 40px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}
.kg-toolbar-title {
  font-size: 14px;
  font-weight: 700;
  color: #303133;
}
.kg-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #606266;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.kg-close-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* container 填充工具栏下方全部空间 */
.kg-fullscreen-overlay > .kg-container {
  flex: 1;
  min-height: 0;
}

.kg-container { display: flex; background: #f5f7fa; }
.kg-left-panel { width: 240px; min-width: 240px; background: #fff; border-right: 1px solid #e4e7ed; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.panel-header { font-weight: 700; font-size: 14px; color: #303133; padding-bottom: 8px; border-bottom: 1px solid #ebeef5; display: flex; justify-content: space-between; align-items: center; }
.panel-section { margin-top: 4px; }
.panel-section label { font-size: 12px; color: #909399; display: block; margin-bottom: 4px; }
.timeline-controls { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.timeline-label { font-size: 12px; font-weight: 600; color: #409EFF; min-width: 65px; text-align: center; }
.window-info { display: flex; justify-content: space-around; font-size: 11px; color: #909399; margin-top: 2px; }
.owl-view-stats { display: flex; flex-wrap: wrap; gap: 4px; }
.owl-view-row { width: 100%; display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; color: #606266; }
.owl-view-row strong { color: #303133; }
.dynamic-roles-info { display: flex; gap: 4px; flex-wrap: wrap; }
.stats-section { margin-top: 8px; }
.stat-line { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; color: #606266; }
.stat-line strong { color: #303133; }
.structural-changes { max-height: 160px; overflow-y: auto; }
.change-item { font-size: 11px; padding: 3px 0; border-bottom: 1px solid #f0f0f0; display: flex; gap: 4px; align-items: flex-start; }
.change-month { color: #409EFF; font-weight: 600; white-space: nowrap; min-width: 55px; }
.change-desc { color: #606266; line-height: 1.3; }

.kg-center { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; }
.kg-loading-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #909399; gap: 8px; z-index: 10; background: rgba(245, 247, 250, 0.85); pointer-events: none; }
.kg-chart { flex: 1; min-height: 0; min-width: 0; width: 100%; }

.kg-right-panel { width: 260px; min-width: 260px; background: #fff; border-left: 1px solid #e4e7ed; padding: 12px; overflow-y: auto; }
.kg-right-empty { display: flex; flex-direction: column; }
.detail-content { margin-top: 8px; display: flex; flex-direction: column; gap: 10px; }
.detail-field label { font-size: 12px; color: #909399; display: block; margin-bottom: 2px; }
.neighbor-list { display: flex; flex-wrap: wrap; gap: 4px; }
.neighbor-chip { cursor: pointer; font-size: 11px; padding: 2px 6px; background: #ecf5ff; color: #409EFF; border-radius: 4px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.neighbor-chip:hover { background: #d9ecff; }
.prop-row { display: flex; font-size: 11px; padding: 2px 0; border-bottom: 1px solid #f5f5f5; }
.prop-key { color: #909399; min-width: 70px; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prop-val { color: #303133; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-left: 4px; }

/* OWL 中心性 */
.owl-centrality-stats { display: flex; gap: 6px; margin: 6px 0; flex-wrap: wrap; }
.cent-stat { text-align: center; padding: 4px 8px; background: #fff; border-radius: 4px; border: 1px solid #e4e7ed; min-width: 42px; }
.cent-stat.cent-key { border-color: #F56C6C; background: #fef0f0; }
.cent-stat.cent-bridge { border-color: #E6A23C; background: #fef9f0; }
.cent-num { display: block; font-size: 16px; font-weight: 700; color: #303133; }
.cent-key .cent-num { color: #F56C6C; }
.cent-bridge .cent-num { color: #E6A23C; }
.cent-label { display: block; font-size: 9px; color: #909399; }
.owl-loading { opacity: 0.7; }

/* 中心性卡片 */
.centrality-card { background: linear-gradient(135deg, #f8f9fd 0%, #eef1f8 100%); border: 1px solid #d8dce6; border-radius: 6px; padding: 8px 10px; }
.cent-row { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
.cent-dim { font-size: 10px; color: #606266; min-width: 90px; text-align: right; }
.cent-bar-bg { flex: 1; height: 6px; background: #e4e7ed; border-radius: 3px; overflow: hidden; }
.cent-bar-fill { height: 100%; background: #409EFF; border-radius: 3px; transition: width 0.5s ease; }
.cent-bar-fill.cent-bet { background: #67C23A; }
.cent-bar-fill.cent-clo { background: #E6A23C; }
.cent-bar-fill.cent-kc { background: #9B59B6; }
.cent-bar-fill.cent-br { background: #E4572E; }
.cent-val { font-size: 10px; font-weight: 600; color: #303133; min-width: 48px; font-variant-numeric: tabular-nums; }
.cent-score-total { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #d8dce6; font-size: 11px; color: #303133; display: flex; align-items: center; gap: 8px; }
.cent-score-total strong { font-size: 14px; color: #303133; }
.inference-tags-list { display: flex; flex-wrap: wrap; gap: 4px; }

/* 推理标签颜色 */
.inf-tag { font-size: 10px; padding: 2px 6px; border-radius: 3px; cursor: default; font-weight: 600; }
.inf-danger { background: #fde2e2; color: #F56C6C; border: 1px solid #fab6b6; }
.inf-warning { background: #fef0d0; color: #E6A23C; border: 1px solid #f5d78a; }
.inf-critical { background: #fde4d0; color: #E4572E; border: 1px solid #f5b895; }
.inf-pressure { background: #fff3e0; color: #E65100; border: 1px solid #ffcc80; }
.inf-multirisk { background: #fce4ec; color: #C62828; border: 1px solid #ef9a9a; }
.inf-bottleneck { background: #e8eaf6; color: #283593; border: 1px solid #9fa8da; }

/* OWL 推理面板 */
.owl-section { background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%); border: 1px solid #c8d9f0; border-radius: 6px; padding: 8px 10px; }
.owl-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.owl-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 3px; background: #409EFF; color: #fff; letter-spacing: 0.5px; }
.swrl-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; background: #e6a23c; color: #fff; }
.owl-reasoner { font-size: 10px; color: #606266; display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
.reasoner-dot { width: 6px; height: 6px; border-radius: 50%; background: #67C23A; animation: owl-pulse 2s infinite; }
@keyframes owl-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.inferred-title { font-size: 10px; color: #909399; margin-bottom: 4px; }
.inferred-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }

/* 风险传导 */
.risk-path-list { max-height: 200px; overflow-y: auto; }
.risk-path-item { font-size: 11px; padding: 4px 6px; margin: 2px 0; background: #fef9f0; border-left: 3px solid #E6A23C; border-radius: 2px; }
.risk-path-event { color: #303133; font-weight: 500; line-height: 1.3; }
.risk-path-arrow { color: #E6A23C; font-size: 10px; padding-left: 6px; }
.risk-path-target { color: #606266; font-size: 10px; padding-left: 12px; }
</style>
