<template>
  <div class="kp-shell">
    <!-- ===== 单行顶栏：平台名 + 三个页签 + 上下文操作 + 关闭 ===== -->
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
      <!-- 1. 数据治理：事前开源情报页 + 用户导入 -->
      <div v-if="tab === 'governance'" class="kp-pane kp-pane--fill">
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
import { computed, defineAsyncComponent, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Collection, Connection, DataAnalysis, Grid, Upload } from '@element-plus/icons-vue'
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
  { key: 'governance', label: '数据治理', icon: DataAnalysis },
  { key: 'library', label: '知识库', icon: Collection },
  { key: 'ontology', label: '本体与知识图谱', icon: Connection },
]
const tab = ref('governance')

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

.kp-import-domain { font-size: 13px; font-weight: 600; color: #475569; }

@media (max-width: 1100px) {
  .kp-bar { gap: 10px; padding: 0 10px; }
  .kp-tab { padding: 6px 10px; }
  .kp-import-btn span, .kp-close-btn span { display: none; }
}
</style>
