<template>
  <div class="kp-shell">
    <!-- ===== 单行顶栏：平台名 + 模块页签 + 上下文操作 + 关闭 ===== -->
    <header class="kp-bar" :style="{ height: BAR_HEIGHT + 'px' }">
      <div class="kp-brand">
        <el-icon :size="18"><Grid /></el-icon>
        <span>知识平台</span>
      </div>

      <nav class="kp-tabs" role="tablist" aria-label="知识平台模块">
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
          title="导入数据（PDF / Word / 表格等）"
          @click="openImportDialog"
        >
          <el-icon :size="15"><Upload /></el-icon>
          <span>导入数据</span>
        </button>
        <button type="button" class="kp-close-btn" title="关闭 (Esc)" @click="emit('close')">
          <el-icon :size="16"><Close /></el-icon>
          <span>关闭</span>
        </button>
      </div>
    </header>

    <!-- ===== 内容区 ===== -->
    <div class="kp-body">
      <!-- 知识平台首页：按领域展示已抽取的资源与分析线索 -->
      <div v-if="tab === 'home'" class="kp-pane kp-pane--scroll kp-home">
        <div class="kp-home-hero">
          <div>
            <span class="kp-eyebrow">KNOWLEDGE PLATFORM</span>
            <h1>知识抽取与分析</h1>
            <p>汇聚不同来源的数据，查看已登记的知识、可追溯线索和待处理的数据集。</p>
          </div>
          <button type="button" class="kp-hero-action" @click="openExtractionDialog">导入文件并抽取 →</button>
        </div>

        <div class="kp-home-inner">
          <div class="kp-home-section-head">
            <div>
              <h2>领域概览</h2>
              <p>根据当前领域切换知识资源统计</p>
            </div>
            <div class="kp-domain-switch" role="group" aria-label="知识领域">
              <button v-for="domain in domainOptions" :key="domain.id" type="button"
                :class="{ active: homeDomain === domain.id }" @click="homeDomain = domain.id">
                {{ domain.name }}
              </button>
            </div>
            <button type="button" class="kp-refresh" :disabled="homeLoading" @click="loadHome">刷新数据</button>
          </div>

          <div v-if="homeLoading" class="kp-home-state">正在读取知识资源…</div>
          <div v-else-if="homeError" class="kp-home-state">
            {{ homeError }} <button type="button" @click="loadHome">重试</button>
          </div>
          <template v-else>
            <div class="kp-metrics">
              <div v-for="metric in homeMetrics" :key="metric.label" class="kp-metric">
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value }}</strong>
                <small>{{ metric.note }}</small>
              </div>
            </div>

            <div class="kp-home-grid">
              <section class="kp-home-card">
                <div class="kp-home-section-head">
                  <div><h2>知识抽取结果</h2><p>从文档、论文、情报和专家观点中提取有用信息</p></div>
                </div>
                <div v-if="domainHighlights.length" class="kp-highlight-list">
                  <article v-for="item in domainHighlights" :key="`${item.kind}-${item.id}`" class="kp-highlight">
                    <span class="kp-highlight-kind">{{ { paper: '研究论文', osint: '事件情报', expert_view: '专家观点' }[item.kind] || '知识条目' }}</span>
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.summary || '已登记知识条目，可在知识库查看详情。' }}</p>
                    <small>来源：{{ item.source || '已登记来源' }} · {{ item.verification_status || '待核验' }}</small>
                    <small class="kp-method">抽取方法：{{ item.method }}</small>
                  </article>
                </div>
                <div v-else class="kp-empty">该领域暂无可展示的已核验抽取条目。</div>
                <button type="button" class="kp-text-action" @click="tab = 'library'">查看知识库 →</button>
              </section>

              <section class="kp-home-card">
                <div class="kp-home-section-head">
                  <div><h2>数据处理进度</h2><p>导入的数据经过解析后可用于检索与知识构建</p></div>
                </div>
                <div class="kp-dataset-summary">
                  <span>已导入 <strong>{{ currentDatasetStats.total }}</strong> 个</span>
                  <span>已解析 <strong>{{ currentDatasetStats.analyzed }}</strong> 个</span>
                </div>
                <div v-if="currentDatasets.length" class="kp-dataset-list">
                  <div v-for="dataset in currentDatasets.slice(0, 5)" :key="dataset.name" class="kp-dataset-row">
                    <div>
                      <strong :title="dataset.name">{{ dataset.name }}</strong>
                      <small>{{ dataset.data_types?.join('、') || '数据文件' }} · {{ dataset.chunk_count }} 个内容片段</small>
                      <small>来源：{{ dataset.source }} · {{ dataset.status === 'completed' ? '抽取方法' : '计划方法' }}：{{ dataset.method }}</small>
                      <small v-if="dataset.preview?.length" class="kp-preview">抽取片段：{{ dataset.preview[0].text }}</small>
                    </div>
                    <span>{{ datasetStatus(dataset.status) }}</span>
                  </div>
                </div>
                <div v-else class="kp-empty">暂无导入数据集。</div>
                <button type="button" class="kp-text-action" @click="openExtractionDialog">导入新文件并抽取 →</button>
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
      <div v-else-if="tab === 'governance'" class="kp-pane kp-pane--fill">
        <OpenSourceIntelligence
          :key="`${osintKey}-${scenarioKey}`"
          :initial-scope="'all'"
          :scroll-height="osintScrollHeight"
          :scenario="scenarioKey"
        />
      </div>

      <!-- 2. 知识库：九库首页 -->
      <div v-else-if="tab === 'library'" class="kp-pane kp-pane--scroll">
        <PreKnowledgeGraph />
      </div>

      <!-- 3. 本体与知识图谱：九库中「本体网络」库的那个界面 -->
      <div v-else-if="tab === 'ontology'" class="kp-pane kp-pane--scroll">
        <PreKnowledgeGraph :key="ontologyLibrary" :initial-library="ontologyLibrary" />
      </div>
    </div>

    <el-dialog v-model="extractionVisible" title="导入文件并抽取知识" width="560px" append-to-body>
      <el-form label-width="88px">
        <el-form-item label="数据文件" required>
          <input :key="extractionInputKey" type="file" accept=".pdf,.txt,.md,.markdown,.csv,.json,.jsonl,.yaml,.yml,.log" @change="onExtractionFileChange" />
        </el-form-item>
        <el-form-item label="数据名称" required>
          <el-input v-model.trim="extractionForm.name" placeholder="为这份数据起一个名称" />
        </el-form-item>
        <el-form-item label="来源">
          <el-input v-model.trim="extractionForm.source" placeholder="例如：内部报告 / 公开资料" />
        </el-form-item>
        <el-form-item label="用途说明">
          <el-input v-model.trim="extractionForm.description" type="textarea" :rows="2" placeholder="想从这份数据了解什么？" />
        </el-form-item>
        <el-form-item label="归属领域">
          <span class="kp-import-domain">{{ homeDomain === 'uranium' ? '铀供应链' : '汽车供应链' }}</span>
        </el-form-item>
        <p class="kp-dialog-note">支持可提取文本的 PDF、CSV、JSON 和纯文本文件。导入后自动解析、分块；结果会显示在首页处理进度中。</p>
      </el-form>
      <template #footer>
        <el-button @click="extractionVisible = false">取消</el-button>
        <el-button type="primary" :loading="extracting" @click="submitExtraction">{{ extracting ? '处理中…' : '导入并开始抽取' }}</el-button>
      </template>
    </el-dialog>

    <!-- ===== 导入数据 ===== -->
    <el-dialog v-model="importVisible" title="导入数据" width="560px" append-to-body>
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
import { analyzeKnowledgeBook, getKnowledgeBookIndex, importKnowledgeBook } from '@/api/knowledgeBase'
import { uploadOsint } from '@/api/powerGame/papers.js'
import { useScenarioStore } from '@/stores/scenario'
import OpenSourceIntelligence from './PreScene/OpenSourceIntelligence.vue'

// 九库 + 本体网络都是巨型组件(知识库单包 678 kB)，按需加载，别拖慢入口页
const PreKnowledgeGraph = defineAsyncComponent(() => import('./PreScene/PreKnowledgeGraph.vue'))

// 顶栏与内容区的高度必须一致：el-scrollbar 要拿到准确高度才不会出现双层滚动条
const BAR_HEIGHT = 60
const osintScrollHeight = `calc(100vh - ${BAR_HEIGHT}px)`

const emit = defineEmits(['close'])
const scenarioStore = useScenarioStore()

const tabs = [
  { key: 'home', label: '首页', icon: House },
  { key: 'governance', label: '数据治理', icon: DataAnalysis },
  { key: 'library', label: '知识库', icon: Collection },
  { key: 'ontology', label: '本体与知识图谱', icon: Connection },
]
const tab = ref('home')

const homeData = ref({ domains: [], datasets: {}, highlights: [] })
const homeLoading = ref(false)
const homeError = ref('')
const homeDomain = ref(scenarioStore.isSupplyChain ? 'automotive' : 'uranium')
const extractionVisible = ref(false)
const extracting = ref(false)
const extractionFile = ref(null)
const extractionInputKey = ref(0)
const extractionForm = ref({ name: '', source: '', description: '' })
let homeRefreshTimer = null
const domainOptions = [
  { id: 'uranium', name: '铀供应链' },
  { id: 'automotive', name: '汽车供应链' },
]
const currentDomain = computed(() => homeData.value.domains?.find((item) => item.id === homeDomain.value))
const domainHighlights = computed(() => homeData.value.highlights?.filter((item) => item.domain === homeDomain.value) || [])
const currentDatasets = computed(() => homeData.value.datasets?.recent?.filter((item) => item.domain === homeDomain.value) || [])
const currentDatasetStats = computed(() => homeData.value.datasets?.by_domain?.[homeDomain.value] || { total: 0, analyzed: 0 })
const homeMetrics = computed(() => {
  const summary = currentDomain.value?.summary || {}
  const total = (key) => summary[key]?.total ?? 0
  return [
    { label: '知识文档', value: total('documents'), note: '已登记文档' },
    { label: '研究论文', value: total('papers'), note: '研究资料' },
    { label: '事件情报', value: total('osint'), note: '事件线索' },
    { label: '来源与证据', value: homeDomain.value === 'uranium'
      ? (summary.evidence?.total ?? 0) : (summary.evidenceLayer?.evidence ?? 0), note: '可追溯证据' },
  ]
})

async function loadHome() {
  homeLoading.value = true
  homeError.value = ''
  try {
    try {
      const result = await request.get('/SCnet/knowledgePlatform/home')
      if (!result?.success) throw new Error(result?.message || '读取失败')
      homeData.value = result.data || { domains: [], datasets: {}, highlights: [] }
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
  if (!value(0) && !value(1)) throw new Error('知识资源接口不可用')

  const books = Array.isArray(value(2)) ? value(2) : []
  const datasets = books.map((book) => {
    const name = book.book_name || book.name || ''
    return {
      name,
      domain: name.includes('汽车') ? 'automotive' : name.includes('铀') ? 'uranium' : 'general',
      source: '用户上传',
      method: book.is_analyzed
        ? (book.vector_indexed === true ? '文本解析 + 分块 + ChromaDB 向量索引'
          : book.vector_indexed === false ? '文本解析 + 分块（未建立向量索引）'
            : '文本解析 + 分块（向量索引状态未记录）')
        : '文本解析 + 分块',
      status: book.is_analyzed ? 'completed' : 'imported',
      data_types: [],
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
    datasets: { total: datasets.length, by_domain: byDomain, recent },
    highlights,
  }
}

function datasetStatus(status) {
  return { completed: '已解析', analyzing: '解析中', imported: '待解析', pending: '待处理', error: '解析失败' }[status] || '待处理'
}

onMounted(loadHome)
onBeforeUnmount(() => { if (homeRefreshTimer) clearInterval(homeRefreshTimer) })

function openExtractionDialog() {
  extractionForm.value = { name: '', source: '', description: '' }
  extractionFile.value = null
  extractionInputKey.value += 1
  extractionVisible.value = true
}

function onExtractionFileChange(event) {
  extractionFile.value = event.target.files?.[0] || null
  if (extractionFile.value && !extractionForm.value.name) {
    extractionForm.value.name = extractionFile.value.name.replace(/\.[^.]+$/, '')
  }
}

async function submitExtraction() {
  const file = extractionFile.value
  const name = extractionForm.value.name.trim()
  if (!file || !name) {
    ElMessage.warning('请选择文件并填写数据名称')
    return
  }
  if (!/\.(pdf|txt|md|markdown|csv|json|jsonl|yaml|yml|log)$/i.test(file.name)) {
    ElMessage.warning('请选择支持文本抽取的文件类型')
    return
  }
  extracting.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('book_name', name)
    formData.append('book_meta', JSON.stringify({
      source: extractionForm.value.source,
      description: extractionForm.value.description,
      domain: homeDomain.value,
    }))
    const imported = await importKnowledgeBook(formData)
    if (!imported.success) throw new Error(imported.message)
    const analysis = await analyzeKnowledgeBook({ book_name: name })
    if (!analysis.success) throw new Error(analysis.message)
    extractionVisible.value = false
    ElMessage.success('已导入，正在抽取内容')
    await loadHome()
    if (homeRefreshTimer) clearInterval(homeRefreshTimer)
    let attempts = 0
    homeRefreshTimer = setInterval(async () => {
      attempts += 1
      await loadHome()
      const current = homeData.value.datasets?.recent?.find((item) => item.name === name)
      if (current?.status === 'completed' || current?.status === 'error' || attempts >= 20) {
        clearInterval(homeRefreshTimer)
        homeRefreshTimer = null
      }
    }, 3000)
  } catch (error) {
    ElMessage.error(error?.message || '导入或解析失败')
  } finally {
    extracting.value = false
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
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  box-sizing: border-box;
}
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
  .kp-bar { gap: 10px; padding: 0 10px; }
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
