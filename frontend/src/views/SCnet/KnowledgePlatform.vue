<template>
  <div class="kp-shell">
    <!-- 混合数据与专题分析各占一行 -->
    <header class="kp-bar" :style="{ height: BAR_HEIGHT + 'px' }">
      <div class="kp-nav-row kp-nav-row--data">
      <div class="kp-brand">
        <el-icon :size="18"><Grid /></el-icon>
        <span>知识平台</span>
      </div>

      <button type="button" class="kp-tab" :class="{ 'is-active': tab === 'home' }" @click="tab = 'home'">
        <el-icon :size="16"><House /></el-icon><span>混合数据</span>
      </button>
      <span class="kp-nav-hint">统一导入与保存原始资料</span>
      <div class="kp-actions">
        <button type="button" class="kp-import-btn" @click="openExtractionDialog"><el-icon :size="15"><Upload /></el-icon><span>导入混合文件</span></button>
        <button type="button" class="kp-close-btn" title="关闭 (Esc)" @click="emit('close')"><el-icon :size="16"><Close /></el-icon><span>关闭</span></button>
      </div>
      </div>
      <div class="kp-nav-row kp-nav-row--analysis">
      <span class="kp-nav-label">专题分析</span>
      <select class="kp-scenario-select" :value="scenarioKey" aria-label="分析场景" @change="scenarioStore.setScenario($event.target.value)">
        <option value="uranium">铀供应链</option><option value="supply_chain">汽车供应链</option>
      </select>
      <nav class="kp-tabs" role="tablist" aria-label="专题分析模块">
        <button
          v-for="tabItem in tabs"
          :key="tabItem.key"
          type="button"
          role="tab"
          class="kp-tab"
          :class="{ 'is-active': tab === tabItem.key }"
          :aria-selected="tab === tabItem.key"
          @click="tab = tabItem.key"
        >
          <el-icon :size="16"><component :is="tabItem.icon" /></el-icon>
          <span>{{ tabItem.label }}</span>
        </button>
      </nav>

      <div class="kp-actions">
        <button
          v-if="tab === 'governance'"
          type="button"
          class="kp-import-btn"
          title="补充当前场景情报"
          @click="openImportDialog"
        >
          <el-icon :size="15"><Upload /></el-icon>
          <span>补充情报</span>
        </button>
      </div>
      </div>
    </header>

    <!-- ===== 内容区 ===== -->
    <div class="kp-body">
      <!-- 知识平台首页：按领域展示已抽取的资源与分析线索 -->
      <div v-if="tab === 'home'" class="kp-pane kp-pane--scroll kp-home">
        <div class="kp-home-hero">
          <div>
            <span class="kp-eyebrow">KNOWLEDGE PLATFORM</span>
            <h1>混合数据</h1>
            <p>集中保存出版社和用户提供的各类文件，再按具体场景与问题筛选相关内容。</p>
          </div>
          <button type="button" class="kp-hero-action" @click="openExtractionDialog">导入混合文件 →</button>
        </div>

        <div class="kp-home-inner">
          <div class="kp-home-section-head">
            <div>
              <h2>原始数据文件</h2>
              <p>导入时统一存储，分析时再筛选铀、汽车或其他相关内容</p>
            </div>
            <el-input v-model="mixedSearch" class="kp-mixed-search" clearable placeholder="搜索数据名称或来源" />
            <button type="button" class="kp-refresh" :disabled="homeLoading" @click="loadHome">刷新数据</button>
          </div>

          <div v-if="homeLoading" class="kp-home-state">正在读取知识资源…</div>
          <div v-else-if="homeError" class="kp-home-state">
            {{ homeError }} <button type="button" @click="loadHome">重试</button>
          </div>
          <template v-else>
            <div class="kp-metrics">
              <div v-for="metric in mixedMetrics" :key="metric.label" class="kp-metric">
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value }}</strong>
                <small>{{ metric.note }}</small>
              </div>
            </div>

            <div class="kp-home-grid kp-home-grid--mixed">
              <section class="kp-home-card">
                <div class="kp-home-section-head">
                  <div><h2>混合数据文件列表</h2><p>保留原始文件、来源和解析状态</p></div>
                </div>
                <div v-if="mixedDatasets.length" class="kp-dataset-list">
                  <div v-for="dataset in mixedDatasets" :key="dataset.name" class="kp-dataset-row">
                    <div>
                      <strong :title="dataset.name">{{ dataset.name }}</strong>
                      <small>{{ dataset.data_types?.join('、') || '数据文件' }} · {{ dataset.file_count == null ? '文件数量未记录' : `${dataset.file_count} 个文件` }} · {{ dataset.chunk_count }} 个内容片段</small>
                      <small>来源：{{ dataset.source }} · {{ dataset.status === 'completed' ? '抽取方法' : '计划方法' }}：{{ dataset.method }}</small>
                      <small v-if="dataset.last_error" class="kp-parse-error">解析说明：{{ dataset.last_error }}<template v-if="dataset.skipped_files">（未解析：{{ Array.isArray(dataset.skipped_files) ? dataset.skipped_files.join('、') : dataset.skipped_files + ' 个文件' }}）</template></small>
                      <small v-if="dataset.preview?.length" class="kp-preview">抽取片段：{{ dataset.preview[0].text }}</small>
                    </div>
                    <div class="kp-dataset-actions"><span>{{ datasetStatus(dataset.status) }}</span><button v-if="dataset.status !== 'completed' && dataset.status !== 'analyzing'" type="button" :disabled="parsingName === dataset.name" @click="parseDataset(dataset.name)">{{ parsingName === dataset.name ? '启动中…' : '解析' }}</button></div>
                  </div>
                </div>
                <div v-else class="kp-empty">暂无导入数据集。</div>
                <button type="button" class="kp-text-action" @click="tab = 'governance'">选择问题并分析相关内容 →</button>
              </section>
            </div>

            <div class="kp-home-links">
              <button type="button" @click="tab = 'governance'"><strong>数据治理</strong><span>导入、整理与核验来源</span><b>→</b></button>
              <button type="button" @click="tab = 'library'"><strong>知识库</strong><span>查看领域知识与证据</span><b>→</b></button>
              <button type="button" @click="tab = 'ontology'"><strong>本体与知识图谱</strong><span>探索实体与关系网络</span><b>→</b></button>
            </div>
          </template>
        </div>
      </div>

      <!-- 数据治理：事前开源情报页 + 用户导入 -->
      <KeepAlive :max="2">
        <KnowledgeAnalysisWorkspace v-if="tab === 'governance'" :key="scenarioKey" class="kp-pane kp-pane--scroll" :scenario="scenarioKey" :refresh-key="osintKey" />
      </KeepAlive>

      <!-- 2. 知识库：九库首页 -->
      <div v-if="tab === 'library'" class="kp-pane kp-pane--scroll">
        <PreKnowledgeGraph />
      </div>

      <!-- 3. 本体与知识图谱：九库中「本体网络」库的那个界面 -->
      <div v-if="tab === 'ontology'" class="kp-pane kp-pane--scroll">
        <PreKnowledgeGraph :key="ontologyLibrary" :initial-library="ontologyLibrary" />
      </div>
    </div>

    <el-dialog v-model="extractionVisible" title="导入混合数据文件" width="560px" append-to-body>
      <el-form label-width="88px">
        <el-form-item label="数据文件" required>
          <input :key="extractionInputKey" type="file" multiple @change="onExtractionFileChange" />
        </el-form-item>
        <el-form-item label="数据名称" required>
          <el-input v-model.trim="extractionForm.name" placeholder="为这份数据起一个名称" />
        </el-form-item>
        <el-form-item label="来源">
          <el-input v-model.trim="extractionForm.source" placeholder="例如：内部报告 / 公开资料" />
        </el-form-item>
        <el-form-item label="内容说明">
          <el-input v-model.trim="extractionForm.description" type="textarea" :rows="2" placeholder="可描述文件来源、批次或内容范围" />
        </el-form-item>
        <p class="kp-dialog-note">文件统一存入混合数据区。可解析的文字内容用于后续检索；其他文件保留原件，显示待解析状态。</p>
      </el-form>
      <template #footer>
        <el-button @click="extractionVisible = false">取消</el-button>
        <el-button type="primary" :loading="extracting" @click="submitExtraction">{{ extracting ? '处理中…' : '保存并解析' }}</el-button>
      </template>
    </el-dialog>

    <!-- ===== 导入数据 ===== -->
    <el-dialog v-model="importVisible" title="补充当前场景情报" width="560px" append-to-body>
      <el-form :model="importForm" label-width="88px">
        <el-form-item label="数据文件">
      <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="onFileChange"
            :on-remove="onFileRemove"
            :file-list="fileList"
            action=""
          >
            <el-button size="small"><el-icon><Upload /></el-icon> 选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">PDF / Word / 表格 / 文本 / 图片等均可，单个文件</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="importForm.title" placeholder="例如：铀矿月度报告 2026" />
        </el-form-item>
        <el-form-item label="来源">
          <el-input v-model="importForm.source" placeholder="例如：路透社 / 内部简报" />
        </el-form-item>
        <el-form-item label="来源链接">
          <el-input v-model="importForm.url" placeholder="https://" />
        </el-form-item>
        <el-form-item label="发生日期">
          <el-date-picker
            v-model="importForm.date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-input v-model="importForm.type" placeholder="例如：劳资 / 制裁 / 运输中断" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="importForm.summary" type="textarea" :rows="3" placeholder="数据摘要，用于列表展示" />
        </el-form-item>
        <el-form-item label="归属领域">
          <span class="kp-import-domain">{{ domainLabel }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="importVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="importing" @click="submitImport">
          {{ importing ? '导入中…' : '导入' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Collection, Connection, DataAnalysis, Grid, House, Upload } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { analyzeKnowledgeBook, getKnowledgeBookIndex, getKnowledgeBookProgress, importKnowledgeBook } from '@/api/knowledgeBase'
import { uploadOsint } from '@/api/powerGame/papers.js'
import { useScenarioStore } from '@/stores/scenario'
import KnowledgeAnalysisWorkspace from './knowledge/KnowledgeAnalysisWorkspace.vue'

// 九库 + 本体网络都是巨型组件(知识库单包 678 kB)，按需加载，别拖慢入口页
const PreKnowledgeGraph = defineAsyncComponent(() => import('./PreScene/PreKnowledgeGraph.vue'))

// 顶栏与内容区的高度必须一致：el-scrollbar 要拿到准确高度才不会出现双层滚动条
const BAR_HEIGHT = 112

const emit = defineEmits(['close'])
const scenarioStore = useScenarioStore()

const tabs = [
  { key: 'governance', label: '数据治理', icon: DataAnalysis },
  { key: 'library', label: '知识库', icon: Collection },
  { key: 'ontology', label: '本体与知识图谱', icon: Connection },
]
const tab = ref('home')

const homeData = ref({ domains: [], datasets: {}, highlights: [] })
const homeLoading = ref(false)
const homeError = ref('')
const mixedSearch = ref('')
const parsingName = ref('')
const extractionVisible = ref(false)
const extracting = ref(false)
const extractionFile = ref(null)
const extractionInputKey = ref(0)
const extractionForm = ref({ name: '', source: '', description: '' })
let homeRefreshTimer = null
const mixedDatasets = computed(() => {
  const items = homeData.value.datasets?.items || homeData.value.datasets?.recent || []
  const keyword = mixedSearch.value.trim().toLowerCase()
  return items.filter((item) => !keyword || `${item.name} ${item.source}`.toLowerCase().includes(keyword))
})
const mixedMetrics = computed(() => {
  const items = homeData.value.datasets?.items || homeData.value.datasets?.recent || []
  return [
    { label: '已存入数据集', value: homeData.value.datasets?.total ?? items.length, note: '统一保留原始文件' },
    { label: '已解析', value: items.filter((item) => item.status === 'completed').length, note: '可用于相关内容检索' },
    { label: '解析中', value: items.filter((item) => item.status === 'analyzing').length, note: '后台处理中' },
    { label: '待处理', value: items.filter((item) => !['completed', 'analyzing'].includes(item.status)).length, note: '保留原件，待解析' },
  ]
})

async function loadHome() {
  homeLoading.value = true
  homeError.value = ''
  try {
    try {
      const result = await request.get('/SCnet/knowledgePlatform/home')
      if (!result?.success) throw new Error(result?.message || '读取失败')
      const payload = result.data || { domains: [], datasets: {}, highlights: [] }
      if (!Array.isArray(payload.datasets?.items)) {
        // Older servers expose only a recent preview here; load the full legacy book list.
        homeData.value = await loadHomeFromExistingApis()
      } else {
        homeData.value = payload
      }
    } catch (error) {
      // 9091 上仍运行旧版进程时，新首页路由返回 404；沿用已有只读接口生成相同视图。
      if (error?.status !== 404 && error?.response?.status !== 404) throw error
      homeData.value = await loadHomeFromExistingApis()
    }
  } catch (error) {
    homeError.value = '知识概览暂时无法加载。'
    console.error('[Knowledge Platform Home]', error)
  } finally {
    homeLoading.value = false
  }
}

async function loadHomeFromExistingApis() {
  const paths = [
    '/SCnet/uraniumKnowledge/summary',
    '/SCnet/automotiveKnowledge/summary',
    '/domain/book/list',
    '/SCnet/uraniumKnowledge/papers?page=1&page_size=3',
    '/SCnet/uraniumKnowledge/expertViews?page=1&page_size=2',
    '/SCnet/automotiveKnowledge/osint',
    '/SCnet/automotiveKnowledge/expertViews',
  ]
  const responses = await Promise.allSettled(paths.map((path) => request.get(path)))
  const value = (index) => responses[index].status === 'fulfilled' ? responses[index].value?.data : null
  if (responses[2].status !== 'fulfilled' || !Array.isArray(value(2))) throw new Error('混合数据列表接口不可用')

  const books = value(2)
  const datasets = books.map((book) => {
    const name = book.book_name || book.name || ''
    return {
      name,
      domain: ['uranium', 'automotive'].includes(book.domain) ? book.domain : 'general',
      source: book.source || '用户上传',
      description: book.description || '',
      method: book.is_analyzed
        ? (book.vector_indexed === true ? '文本解析 + 分块 + ChromaDB 向量索引'
          : book.vector_indexed === false ? '文本解析 + 分块（未建立向量索引）'
            : '文本解析 + 分块（向量索引状态未记录）')
        : '文本解析 + 分块',
      status: book.parse_status || (book.is_analyzed ? 'completed' : 'imported'),
      last_error: book.last_error || '',
      skipped_files: book.skipped_files || 0,
      file_count: book.file_count ?? null,
      data_types: book.data_types || [],
      chunk_count: 0,
      preview: [],
      updated_at: book.upload_date || book.date || '',
    }
  }).filter((item) => item.name)
  const recent = ['uranium', 'automotive', 'general'].flatMap((domain) =>
    datasets.filter((item) => item.domain === domain).slice(0, 8))
  await Promise.allSettled(recent.filter((item) => item.status === 'completed').map(async (item) => {
    const index = await getKnowledgeBookIndex({ book_name: item.name })
    if (index.success) {
      item.chunk_count = index.data?.total_chunks || 0
      item.preview = (index.data?.preview_chunks || []).slice(0, 2)
    }
  }))

  const uraniumPapers = value(3)?.items || []
  const uraniumViews = value(4)?.items || []
  const automotiveEvents = value(5)?.items || []
  const automotiveViews = value(6)?.items || []
  const highlights = [
    ...uraniumPapers.filter((item) => item.abstract_summary).map((item) => ({
      domain: 'uranium', kind: 'paper', id: item.paper_id, title: item.title,
      summary: item.abstract_summary, source: item.journal || item.publisher,
      verification_status: item.verification_status,
      method: '策展摘要 + 主题映射/关键词规则（未向量化）',
    })),
    ...uraniumViews.filter((item) => item.summary).map((item) => ({
      domain: 'uranium', kind: 'expert_view', id: item.view_id, title: item.title,
      summary: item.summary, source: item.organization,
      verification_status: item.verification_status,
      method: '原文段落定位 + 观点字段结构化（未向量化）',
    })),
    ...automotiveEvents.filter((item) => item.verification_status === 'VERIFIED' && item.sources?.length)
      .slice(0, 3).map((item) => ({
        domain: 'automotive', kind: 'osint', id: item.event_id, title: item.title,
        summary: item.summary, source: item.sources[0]?.name,
        verification_status: item.verification_status,
        method: '事件字段映射 + 来源证据关联（未向量化）',
      })),
    ...automotiveViews.filter((item) => item.verification_status === 'VERIFIED' && item.summary)
      .slice(0, 2).map((item) => ({
        domain: 'automotive', kind: 'expert_view', id: item.view_id, title: item.title,
        summary: item.summary, source: item.organization,
        verification_status: item.verification_status,
        method: '公开观点归因 + 证据关联（未向量化）',
      })),
  ]
  const byDomain = Object.fromEntries(['uranium', 'automotive', 'general'].map((domain) => [domain, {
    total: datasets.filter((item) => item.domain === domain).length,
    analyzed: datasets.filter((item) => item.domain === domain && item.status === 'completed').length,
  }]))
  return {
    domains: [
      { id: 'uranium', name: '铀供应链', summary: value(0) || {} },
      { id: 'automotive', name: '汽车供应链', summary: value(1) || {} },
    ],
    datasets: { total: datasets.length, by_domain: byDomain, recent, items: datasets },
    highlights,
  }
}

function datasetStatus(status) {
  return { completed: '已解析', analyzing: '解析中', imported: '待解析', pending: '待处理', error: '解析失败' }[status] || '待处理'
}

onMounted(loadHome)
onBeforeUnmount(() => { stopHomeRefresh() })

function stopHomeRefresh() {
  if (homeRefreshTimer) clearInterval(homeRefreshTimer)
  homeRefreshTimer = null
}

function watchParse(name) {
  stopHomeRefresh()
  let busy = false
  let attempts = 0
  homeRefreshTimer = setInterval(async () => {
    if (busy) return
    busy = true
    try {
      attempts += 1
      await loadHome()
      const items = homeData.value.datasets?.items || homeData.value.datasets?.recent || []
      const current = items.find((item) => item.name === name)
      const progress = await getKnowledgeBookProgress({ book_name: name }).catch(() => null)
      const details = progress?.data || {}
      const taskStatus = details.parse_status || details.status || current?.parse_status
      const parseFinished = details.ocr_progress?.完成 === true || ['completed', 'error'].includes(taskStatus)
      const noText = ['imported', 'pending'].includes(taskStatus) && Boolean(details.last_error || current?.last_error)
      if (!current || parseFinished || noText || attempts >= 40) stopHomeRefresh()
    } finally { busy = false }
  }, 2500)
}

function openExtractionDialog() {
  extractionForm.value = { name: '', source: '', description: '' }
  extractionFile.value = null
  extractionInputKey.value += 1
  extractionVisible.value = true
}

function onExtractionFileChange(event) {
  extractionFile.value = Array.from(event.target.files || [])
  if (extractionFile.value.length && !extractionForm.value.name) {
    extractionForm.value.name = extractionFile.value[0].name.replace(/\.[^.]+$/, '')
  }
}

async function submitExtraction() {
  const files = extractionFile.value || []
  const name = extractionForm.value.name.trim()
  if (!files.length || !name) {
    ElMessage.warning('请选择文件并填写数据名称')
    return
  }
  extracting.value = true
  try {
    const formData = new FormData()
    files.forEach((file) => formData.append('file', file))
    formData.append('book_name', name)
    formData.append('book_meta', JSON.stringify({
      source: extractionForm.value.source,
      description: extractionForm.value.description,
      domain: 'general',
      data_scope: 'mixed',
    }))
    const imported = await importKnowledgeBook(formData)
    if (!imported.success) throw new Error(imported.message)
    const supported = homeData.value.capabilities?.parse_extensions || ['.pdf', '.txt', '.md', '.markdown', '.csv', '.json', '.jsonl', '.yaml', '.yml', '.log']
    const parseableCount = files.filter((file) => supported.includes('.' + file.name.split('.').pop().toLowerCase())).length
    const supportsSkippingUnsupported = Array.isArray(homeData.value.capabilities?.parse_extensions)
    const canParse = supportsSkippingUnsupported ? parseableCount > 0 : parseableCount === files.length
    if (canParse) {
      const analysis = await analyzeKnowledgeBook({ book_name: name })
      if (!analysis.success) throw new Error(analysis.message)
    }
    extractionVisible.value = false
    ElMessage.success(canParse
      ? parseableCount === files.length ? '文件已保存，正在解析内容' : '可解析文件已进入解析，其他原件已保留'
        : '原始文件已保存，当前格式尚无直接解析能力')
    await loadHome()
    if (canParse) watchParse(name)
  } catch (error) {
    ElMessage.error(error?.message || '导入或解析失败')
  } finally {
    extracting.value = false
  }
}

async function parseDataset(name) {
  parsingName.value = name
  try {
    const result = await analyzeKnowledgeBook({ book_name: name })
    if (!result.success) throw new Error(result.message)
    ElMessage.success('已启动解析')
    await loadHome()
    watchParse(name)
  } catch (error) {
    ElMessage.error(error?.message || '解析启动失败')
  } finally {
    parsingName.value = ''
  }
}

const domainLabel = computed(() => (scenarioStore.isSupplyChain ? '汽车' : '铀'))

// 后端 /scenario/expert/osint/events 认的是 supply_chain / uranium 两个值
const scenarioKey = computed(() => (scenarioStore.isSupplyChain ? 'supply_chain' : 'uranium'))

// 九库里「本体网络」按场景指向不同的库 id：铀 = ontology_network，汽车 = auto_ontology_net
// （与 NewKnowledgeCenter.openKnowledgeEntry 的分流保持一致）
const ontologyLibrary = computed(
  () => (scenarioStore.isSupplyChain ? 'auto_ontology_net' : 'ontology_network'),
)

// 导入成功后改 key 强制重挂载，让数据治理页重新拉一次事件（含刚导入的条目）
const osintKey = ref(0)

/* ---------- 导入原始情报 ---------- */
const importVisible = ref(false)
const importing = ref(false)
const uploadRef = ref(null)
const fileList = ref([])
const importForm = ref({ title: '', source: '', url: '', date: '', type: '', summary: '' })

function resetImportDialog() {
  importForm.value = { title: '', source: '', url: '', date: '', type: '', summary: '' }
  fileList.value = []
  importing.value = false
  uploadRef.value?.clearFiles()
}
function openImportDialog() {
  resetImportDialog()
  importVisible.value = true
}
function onFileChange(file, files) {
  // limit=1：换文件时 el-upload 会把新文件追加进来，这里只保留最后一个
  fileList.value = files.slice(-1)
}
function onFileRemove(file, files) {
  fileList.value = files
}

async function submitImport() {
  const rawFile = fileList.value[0]?.raw || null
  const form = importForm.value
  // 与后端校验一致：文件、标题、摘要、原文链接至少要有一个
  if (!rawFile && !(form.title || form.summary || form.url)) {
    ElMessage.warning('请至少上传文件，或填写标题 / 摘要 / 来源链接')
    return
  }
  importing.value = true
  try {
    const res = await uploadOsint(rawFile, {
      title: form.title,
      source: form.source,
      url: form.url,
      date: form.date,
      summary: form.summary,
      type: form.type,
      scenario: scenarioKey.value,
    })
    if (res?.success || Number(res?.code) === 200) {
      ElMessage.success('数据已导入')
      importVisible.value = false
      osintKey.value += 1
    } else {
      ElMessage.error(res?.message || '导入失败，请重试')
    }
  } catch (e) {
    console.error('[OSINT Import Error]', e)
    ElMessage.error('导入服务暂不可用：' + (e?.message || '网络错误'))
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.kp-shell {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
  font-family: 'Inter', system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* ===== 顶栏（单行） ===== */
.kp-bar {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  padding: 0;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  box-sizing: border-box;
}
.kp-nav-row { display: flex; align-items: center; gap: 16px; min-height: 56px; width: 100%; padding: 0 18px; box-sizing: border-box; }
.kp-nav-row--data { border-bottom: 1px solid #e2e8f0; }
.kp-nav-row--analysis { background: #f8fafc; }
.kp-nav-hint { flex: 1; color: #94a3b8; font-size: 12px; }
.kp-nav-label { flex-shrink: 0; color: #64748b; font-size: 12px; font-weight: 700; }
.kp-scenario-select { padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #334155; font-size: 12px; }
.kp-mixed-search { max-width: 280px; }
.kp-home-grid.kp-home-grid--mixed { grid-template-columns: 1fr; }
.kp-dataset-actions { align-items: flex-end; flex-shrink: 0; color: #2563eb; }
.kp-dataset-actions button { border: 0; background: #eff6ff; color: #1d4ed8; border-radius: 5px; padding: 4px 12px; cursor: pointer; }
.kp-brand {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 15px;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: 1px;
  white-space: nowrap;
  flex-shrink: 0;
}
.kp-brand .el-icon { color: #2563eb; }

.kp-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.kp-tabs::-webkit-scrollbar { display: none; }

.kp-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: #475569;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}
.kp-tab:hover { background: #f1f5f9; color: #1e293b; }
.kp-tab.is-active {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.kp-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.kp-import-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: #4f46e5;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}
.kp-import-btn:hover { background: #e0e7ff; border-color: #a5b4fc; color: #4338ca; }

.kp-close-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}
.kp-close-btn:hover { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

/* ===== 内容区 ===== */
.kp-body { flex: 1 1 auto; min-height: 0; position: relative; }
/* 数据治理：内部 el-scrollbar 自己管高度，外层不能再滚，否则出现双层滚动条 */
.kp-pane--fill { position: absolute; inset: 0; overflow: hidden; }
/* 知识库 / 本体：组件按 min-height:100% 自然撑开，由外层滚 */
.kp-pane--scroll { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; }

/* 知识平台首页 */
.kp-home { background: #f5f7fb; color: #1e293b; }
.kp-home-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 38px max(32px, calc((100vw - 1240px) / 2)); background: linear-gradient(120deg, #102c57, #1d4f83); color: #fff; }
.kp-eyebrow { color: #a9d5ff; font-size: 11px; font-weight: 700; letter-spacing: 2px; }
.kp-home-hero h1 { margin: 10px 0 8px; font-size: clamp(25px, 3vw, 36px); line-height: 1.2; }
.kp-home-hero p { margin: 0; color: #dbeafe; font-size: 14px; }
.kp-hero-action { flex-shrink: 0; border: 1px solid #93c5fd; border-radius: 10px; background: #fff; color: #174273; padding: 11px 18px; font-weight: 700; cursor: pointer; }
.kp-hero-action:hover { background: #eaf4ff; }
.kp-home-inner { max-width: 1240px; margin: 0 auto; padding: 28px 32px 48px; }
.kp-home-section-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.kp-home-section-head h2 { margin: 0 0 4px; font-size: 18px; }
.kp-home-section-head p { margin: 0; color: #64748b; font-size: 12px; }
.kp-domain-switch { display: flex; gap: 4px; padding: 4px; border: 1px solid #dbe4ef; border-radius: 10px; background: #fff; }
.kp-domain-switch button { border: 0; border-radius: 7px; background: transparent; color: #475569; padding: 7px 13px; font-size: 12px; font-weight: 600; cursor: pointer; }
.kp-domain-switch button.active { background: #dbeafe; color: #1d4ed8; }
.kp-refresh { border: 0; background: transparent; color: #2563eb; font-size: 12px; cursor: pointer; }
.kp-refresh:disabled { color: #94a3b8; cursor: default; }
.kp-home-state, .kp-empty { padding: 24px; color: #64748b; text-align: center; font-size: 13px; }
.kp-home-state button { margin-left: 8px; border: 0; background: transparent; color: #2563eb; cursor: pointer; }
.kp-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
.kp-metric { display: flex; flex-direction: column; gap: 8px; padding: 18px 20px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; box-shadow: 0 5px 20px #1e3a5f08; }
.kp-metric span { color: #64748b; font-size: 12px; }
.kp-metric strong { color: #174273; font-size: 28px; line-height: 1; }
.kp-metric small { color: #94a3b8; font-size: 11px; }
.kp-home-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(300px, 1fr); gap: 20px; }
.kp-home-card { display: flex; flex-direction: column; min-width: 0; padding: 22px; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; }
.kp-highlight-list, .kp-dataset-list { flex: 1; }
.kp-highlight { padding: 14px 0; border-top: 1px solid #edf2f7; }
.kp-highlight-kind { display: inline-block; margin-bottom: 6px; padding: 3px 8px; border-radius: 5px; background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; }
.kp-highlight h3 { margin: 0 0 6px; font-size: 14px; line-height: 1.45; }
.kp-highlight p { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; margin: 0 0 6px; color: #475569; font-size: 12px; line-height: 1.6; }
.kp-highlight small { color: #94a3b8; font-size: 11px; }
.kp-highlight .kp-method { display: block; margin-top: 4px; color: #64748b; }
.kp-dataset-summary { display: flex; gap: 14px; margin-bottom: 12px; color: #64748b; font-size: 12px; }
.kp-dataset-summary strong { color: #1d4ed8; font-size: 16px; }
.kp-dataset-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 0; border-top: 1px solid #edf2f7; font-size: 12px; }
.kp-dataset-row div { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.kp-dataset-row strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kp-dataset-row small { color: #94a3b8; }
.kp-dataset-row .kp-preview { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: #475569; line-height: 1.5; }
.kp-dataset-row > span { flex-shrink: 0; color: #2563eb; }
.kp-text-action { align-self: flex-start; margin-top: 15px; padding: 0; border: 0; background: transparent; color: #1d4ed8; font-size: 12px; font-weight: 700; cursor: pointer; }
.kp-home-links { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 20px; }
.kp-home-links button { display: flex; flex-direction: column; align-items: flex-start; position: relative; gap: 7px; padding: 17px 20px; border: 1px solid #dce6f3; border-radius: 12px; background: #fff; text-align: left; cursor: pointer; }
.kp-home-links button:hover { border-color: #93c5fd; background: #f8fbff; }
.kp-home-links strong { color: #1e3a5f; font-size: 14px; }
.kp-home-links span { color: #64748b; font-size: 12px; }
.kp-home-links b { position: absolute; right: 20px; top: 17px; color: #3b82f6; }
.kp-dialog-note { margin: 0 0 0 88px; color: #64748b; font-size: 12px; line-height: 1.6; }

.kp-import-domain { font-size: 13px; font-weight: 600; color: #475569; }

@media (max-width: 1100px) {
  .kp-nav-row { gap: 8px; padding: 0 10px; }
  .kp-nav-hint { display: none; }
  .kp-nav-row--data .kp-actions { margin-left: auto; }
  .kp-tab { padding: 6px 10px; }
  .kp-import-btn span, .kp-close-btn span { display: none; }
}
@media (max-width: 760px) {
  .kp-home-hero { align-items: flex-start; flex-direction: column; padding: 28px 20px; }
  .kp-home-inner { padding: 22px 16px 36px; }
  .kp-home-section-head { align-items: flex-start; flex-direction: column; }
  .kp-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kp-home-grid, .kp-home-links { grid-template-columns: 1fr; }
}
</style>
