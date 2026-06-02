1<template>
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
              <!-- 答案摘要 -->
              <div v-if="searchResult.summary" class="answer-summary">
                <div class="summary-title">
                  <el-icon><StarFilled /></el-icon> 智能摘要
                </div>
                <div class="summary-content">{{ searchResult.summary }}</div>
              </div>

              <!-- 命中片段 -->
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

    <!-- 上传对话框 -->
    <el-dialog
      v-model="showUploadDialog"
      title="导入石油供应链数据集"
      width="550px"
      :before-close="closeUploadDialog"
    >
      <el-form
        ref="uploadFormRef"
        :model="uploadForm"
        :rules="uploadRules"
        label-width="100px"
      >
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
            <template #tip>
              <div class="upload-tip">支持 PDF、文本、Excel、Word 等格式</div>
            </template>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import {
  Document, Upload, Refresh, Search, FolderOpened, QuestionFilled, Delete,
  Lightning, StarFilled, List, Loading
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getKnowledgeBookList,
  importKnowledgeBook,
  analyzeKnowledgeBook,
  queryKnowledgeBook,
  deleteKnowledgeBook
} from '@/api/knowledgeBase'

// ========== 状态 ==========
const knowledgeBooks = ref([])
const selectedBook = ref(null)
const bookSearchKeyword = ref('')
const searchQuery = ref('')
const searchResult = ref(null)
const isSearching = ref(false)
const useKnowledgeGraph = ref(false)
const showUploadDialog = ref(false)
const isUploading = ref(false)

// 上传表单
const uploadFormRef = ref(null)
const uploadRef = ref(null)
const uploadForm = ref({
  bookName: '',
  files: []
})
const fileList = ref([])

const uploadRules = {
  bookName: [
    { required: true, message: '请输入数据集名称', trigger: 'blur' }
  ]
}

// 快速问题
const quickQuestions = [
  'OPEC 最新的减产政策是什么？',
  '霍尔木兹海峡当前的通行状况如何？',
  '美国战略石油储备 (SPR) 最新数据是多少？',
  '北海 Brent 油田的产能情况？',
  '红海航线保险费用上涨对油运的影响？',
  '全球主要炼厂开工率统计'
]

// ========== 计算属性 ==========
const filteredBooks = computed(() => {
  if (!bookSearchKeyword.value) return knowledgeBooks.value
  const keyword = bookSearchKeyword.value.toLowerCase()
  return knowledgeBooks.value.filter(book =>
    book.name.toLowerCase().includes(keyword)
  )
})

// ========== 方法 ==========

// 获取状态类型
const getBookStatusType = (book) => {
  if (book.ocrPercentage === 100) return 'success'
  if (book.ocrPercentage > 0) return 'warning'
  return 'info'
}

// 获取状态文本
const getBookStatusText = (book) => {
  if (book.ocrPercentage === 100) return '已解析'
  if (book.ocrPercentage > 0) return '解析中'
  return '未解析'
}

// 加载知识库列表
const loadKnowledgeBooks = async () => {
  try {
    const res = await getKnowledgeBookList()
    if (res.success) {
      knowledgeBooks.value = res.data || []
      // 自动选中第一个数据集（如果当前没有选中）
      if (!selectedBook.value && knowledgeBooks.value.length > 0) {
        selectedBook.value = knowledgeBooks.value[0]
      }
    }
  } catch (error) {
    console.error('加载知识库失败:', error)
  }
}

// 选择知识库
const selectBook = (book) => {
  selectedBook.value = book
}

// 打开查询对话框
const openQueryDialog = (book) => {
  selectedBook.value = book
  searchQuery.value = ''
  searchResult.value = null
}

// 删除知识库
const deleteBook = async (book) => {
  try {
    await ElMessageBox.confirm(`确定要删除数据集 "${book.name}" 吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await deleteKnowledgeBook({ book_name: book.name })
    if (res.success) {
      ElMessage.success('删除成功')
      loadKnowledgeBooks()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

// 快速提问
const quickAsk = (question) => {
  searchQuery.value = question
  handleSearch()
}

// 执行搜索
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入查询内容')
    return
  }

  if (knowledgeBooks.value.length === 0) {
    ElMessage.warning('请先导入知识库数据集')
    showUploadDialog.value = true
    return
  }

  isSearching.value = true
  searchResult.value = null

  try {
    // 如果有选中的数据集，只查询该数据集；否则查询所有数据集
    const targetBooks = selectedBook.value
      ? [selectedBook.value.name]
      : knowledgeBooks.value.map(b => b.name)

    let bestResult = null
    let bestScore = 0

    // 遍历目标数据集查询
    console.log('[Search] Starting cross-dataset search, targetBooks:', targetBooks)
    for (const bookName of targetBooks) {
      try {
        const res = await queryKnowledgeBook({
          query: searchQuery.value,
          book_name: bookName,
          useKnowledgeGraph: useKnowledgeGraph.value
        })
        console.log('[Query] Book:', bookName, 'Success:', res?.success, 'HasData:', !!res?.data)

        if (res.success && res.data) {
          console.log('[Query] Book:', bookName, 'Response:', res)
          const data = res.data
          const chunks = data.chunks || []
          console.log('[Query] Chunks:', chunks.length, 'Content:', data.content?.substring(0, 100))
          if (chunks.length > 0) {
            // 后端返回的 chunks 是字符串数组，需要转换为对象
            const hits = chunks.map((text, idx) => ({
              title: bookName,
              desc: typeof text === 'string' ? text : (text.text || text.content || JSON.stringify(text)),
              score: data.retrieval_meta?.local_hit_count ? 1 - (idx * 0.1) : 0.5 // 基于排序的相似度分数
            }))

            // 计算平均分数
            const avgScore = hits.reduce((sum, h) => sum + (h.score || 0), 0) / hits.length
            if (avgScore > bestScore) {
              bestScore = avgScore
              bestResult = {
                summary: data.content || '',
                hits: hits,
                bookName: bookName
              }
            }
          }
        }
      } catch (err) {
        console.error('[Query] Book:', bookName, 'Error:', err)
      }
    }

    console.log('[Search] Final result - bestResult:', bestResult ? 'FOUND' : 'NULL', 'bestScore:', bestScore)
    if (bestResult) {
      searchResult.value = bestResult
      if (!bestResult.hits || bestResult.hits.length === 0) {
        ElMessage.info('未找到相关结果')
      }
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

// 刷新数据
const refreshData = () => {
  loadKnowledgeBooks()
  ElMessage.success('已刷新')
}

// ========== 上传相关 ==========
const handleFileChange = (file, files) => {
  // 使用完整的文件列表，避免重复添加
  fileList.value = files
  uploadForm.value.files = files
}

const handleFileRemove = (file, files) => {
  fileList.value = files
  uploadForm.value.files = files
}

const closeUploadDialog = () => {
  showUploadDialog.value = false
  uploadForm.value = { bookName: '', files: [] }
  fileList.value = []
  if (uploadRef.value) uploadRef.value.clearFiles()
}

const submitUpload = async () => {
  // 先检查文件列表
  if (fileList.value.length === 0) {
    ElMessage.warning('请选择要上传的文件')
    return
  }

  // 验证表单其他字段
  try {
    await uploadFormRef.value.validate()
  } catch {
    return
  }

  isUploading.value = true

  try {
    const formData = new FormData()
    formData.append('book_name', uploadForm.value.bookName)
    fileList.value.forEach(file => {
      formData.append('file', file.raw || file)
    })

    const res = await importKnowledgeBook(formData)
    if (res.success) {
      // 先保存书名，因为 closeUploadDialog 会清空表单
      const bookName = uploadForm.value.bookName

      ElMessage.success('导入成功，开始解析数据集')
      closeUploadDialog()
      loadKnowledgeBooks()

      // 自动开始解析
      setTimeout(async () => {
        try {
          const analyzeRes = await analyzeKnowledgeBook({ book_name: bookName })
          if (analyzeRes.success) {
            ElMessage.success('解析任务已启动')
          } else {
            ElMessage.warning('解析任务启动失败：' + (analyzeRes.message || ''))
          }
          loadKnowledgeBooks()
        } catch (err) {
          console.error('解析任务启动失败:', err)
          ElMessage.warning('解析任务启动失败')
          loadKnowledgeBooks()
        }
      }, 1000)
    } else {
      ElMessage.error(res.message || '导入失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败，请重试')
  } finally {
    isUploading.value = false
  }
}

// ========== 生命周期 ==========
onMounted(() => {
  console.log('=== OilSituationAnalysis v20260528-2 loaded ===')
  loadKnowledgeBooks()
})
</script>

<style scoped>
.oil-situation-analysis {
  width: 100%;
  min-height: 100%;
  background: linear-gradient(180deg, #f6f9fd 0%, #eef3fb 100%);
  padding: 16px;
  box-sizing: border-box;
}

/* 头部卡片 */
.header-card {
  margin-bottom: 16px;
  border-radius: 12px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28px;
}

.page-title h1 {
  margin: 0 0 6px 0;
  font-size: 22px;
  color: #303133;
}

.page-title p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 主体布局 */
.main-content {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 知识库列表卡片 */
.knowledge-list-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.count-label {
  font-size: 12px;
  color: #909399;
}

.knowledge-list {
  max-height: 500px;
  overflow-y: auto;
}

.knowledge-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.knowledge-item:hover {
  background: #f5f7fa;
  border-color: #409eff;
}

.knowledge-item.active {
  background: #f0f7ff;
  border-color: #409eff;
}

.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #e8f0fe;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  font-size: 20px;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.item-date {
  color: #909399;
}

.item-actions {
  display: flex;
  gap: 4px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

/* 快速问题卡片 */
.quick-questions-card {
  border-radius: 12px;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-item {
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.question-item:hover {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

/* 检索卡片 */
.search-card {
  border-radius: 12px;
}

.search-box-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 结果卡片 */
.result-card {
  border-radius: 12px;
  min-height: 400px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-book {
  font-size: 12px;
  color: #409eff;
  font-weight: 500;
}

.result-count {
  font-size: 12px;
  color: #909399;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.answer-summary {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
}

.summary-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #0288d1;
  margin-bottom: 8px;
}

.summary-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
}

.hits-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hits-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #606266;
}

.hit-item {
  background: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
}

.hit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.hit-source {
  font-weight: 500;
  color: #409eff;
}

.hit-score {
  font-size: 12px;
  color: #909399;
}

.hit-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.search-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.placeholder-tips {
  text-align: left;
  font-size: 13px;
  color: #909399;
}

.placeholder-tips ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.placeholder-tips li {
  margin-bottom: 4px;
}

/* 上传对话框 */
.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 滚动条 */
:deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}
</style>
