<template>
  <div class="knowledge-graph-panel">
    <!-- 工具栏 -->
    <div class="kg-toolbar">
      <div class="kg-toolbar-left">
        <el-button type="primary" size="small" :loading="buildLoading" @click="handleBuildGraph">
          <el-icon><Lightning /></el-icon> LLM 构建图谱
        </el-button>
        <el-button size="small" :loading="importLoading" @click="handleImport">
          <el-icon><Upload /></el-icon> 导入数据
        </el-button>
        <el-divider direction="vertical" />
        <el-button size="small" @click="showAddNodeDialog = true">
          <el-icon><Plus /></el-icon> 添加节点
        </el-button>
        <el-button size="small" :disabled="!selectedNode" @click="showAddEdgeDialog = true">
          <el-icon><Connection /></el-icon> 添加关系
        </el-button>
      </div>
      <div class="kg-toolbar-right">
        <el-tag v-if="graphStats" size="small">
          {{ graphStats.nodes }} 节点 / {{ graphStats.edges }} 关系
        </el-tag>
        <el-button size="small" :icon="Refresh" circle @click="loadGraph" :loading="loading" />
      </div>
    </div>

    <!-- 图谱容器 + 文档列表 -->
    <div class="kg-split-layout">
      <div class="kg-graph-wrap">
        <div v-if="!graphData.nodes.length" class="kg-empty">
          <el-empty description="暂无图谱数据，请先「LLM 构建图谱」" :image-size="80" />
        </div>
        <RelationGraph
          v-else
          ref="graphRef"
          :options="relationGraphOptions"
          class="kg-graph-container"
          @node-click="onNodeClick"
          @canvas-click="onCanvasClick"
        />
      </div>

      <!-- 右侧文档列表 -->
      <div class="kg-doc-panel">
        <div class="kg-doc-header">
          <span class="kg-doc-title">源文档列表</span>
          <el-tag size="small">{{ docs.length }} 篇</el-tag>
        </div>
        <div class="kg-doc-list" style="overflow-y: auto; flex:1;">
          <div v-for="doc in docs" :key="doc.id || doc.title" class="kg-doc-item" @click="toggleDocDetail(doc)">
            <div class="kg-doc-item-title">
              <el-icon :size="12"><Document /></el-icon>
              <span>{{ doc.title }}</span>
            </div>
            <div class="kg-doc-item-meta">
              <span>{{ doc.source }}</span>
              <span>{{ (doc.fullTime || '').split('T')[0] }}</span>
            </div>
            <div v-if="doc._expanded" class="kg-doc-item-content">
              <p>{{ doc._detail || (doc.content || '').slice(0, 500) || '暂无内容' }}</p>
            </div>
          </div>
          <div v-if="!docs.length" class="kg-empty-doc"><el-empty description="暂无文档" :image-size="60" /></div>
        </div>
      </div>
    </div>

    <!-- 选中节点详情 -->
    <div v-if="selectedNode" class="kg-detail-bar">
      <div class="kg-detail-info">
        <span class="kg-detail-label">选中：</span>
        <el-tag :type="getNodeType(selectedNode.type)" size="small" effect="dark">
          {{ selectedNode.label }}
        </el-tag>
        <span class="kg-detail-meta">{{ selectedNode.type }}</span>
      </div>
      <div class="kg-detail-actions">
        <el-button link size="small" @click="editSelectedNode">
          <el-icon><Edit /></el-icon> 编辑
        </el-button>
        <el-popconfirm :title="`删除「${selectedNode.label}」及其关联关系?`" @confirm="deleteSelectedNode">
          <template #reference>
            <el-button link size="small" type="danger">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </template>
        </el-popconfirm>
      </div>
    </div>

    <!-- 添加节点 Dialog -->
    <el-dialog v-model="showAddNodeDialog" title="添加节点" width="420px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="实体名称">
          <el-input v-model="addNodeForm.label" placeholder="如：美国、北约" />
        </el-form-item>
        <el-form-item label="实体类型">
          <el-select v-model="addNodeForm.type" style="width:100%">
            <el-option v-for="t in nodeTypeOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddNodeDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitAddNode">确认</el-button>
      </template>
    </el-dialog>

    <!-- 编辑节点 Dialog -->
    <el-dialog v-model="showEditNodeDialog" title="编辑节点" width="420px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="实体名称">
          <el-input v-model="editNodeForm.label" />
        </el-form-item>
        <el-form-item label="实体类型">
          <el-select v-model="editNodeForm.type" style="width:100%">
            <el-option v-for="t in nodeTypeOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditNodeDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEditNode">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加关系 Dialog -->
    <el-dialog v-model="showAddEdgeDialog" title="添加关系" width="480px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="源节点">
          <el-select v-model="addEdgeForm.source_id" filterable placeholder="选择源节点" style="width:100%">
            <el-option v-for="n in graphData.nodes" :key="n.id" :label="n.label" :value="n.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标节点">
          <el-select v-model="addEdgeForm.target_id" filterable placeholder="选择目标节点" style="width:100%">
            <el-option v-for="n in graphData.nodes" :key="n.id" :label="n.label" :value="n.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关系类型">
          <el-select v-model="addEdgeForm.relation_type" filterable allow-create style="width:100%">
            <el-option v-for="r in relationTypeOptions" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddEdgeDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitAddEdge">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Lightning, Upload, Plus, Connection, Edit, Delete, Document } from '@element-plus/icons-vue'
import RelationGraph from 'relation-graph-vue3'
import {
  getFullGraph,
  buildKnowledgeGraph,
  addGraphNode,
  updateGraphNode,
  deleteGraphNode,
  addGraphEdge,
  deleteGraphEdge,
  importOfficialDocuments,
  getOsintBySourceType,
  getOsintNewsDetail,
} from '@/api/powerGame/osintKnowledgeGraph'

const NODE_TYPE_OPTIONS = [
  '国家', '组织', '人物', '条约/协议', '事件', '地点', '军事技术', '政策/战略',
]

const RELATION_TYPE_OPTIONS = [
  '签署', '制裁', '位于', '属于', '宣称', '参与',
  '开发', '废除', '支持', '反对', '导致', '涉及',
]

const NODE_TYPE_COLORS = {
  '国家': '#409eff',
  '组织': '#67c23a',
  '人物': '#e6a23c',
  '条约/协议': '#909399',
  '事件': '#f56c6c',
  '地点': '#b37feb',
  '军事技术': '#36cfc9',
  '政策/战略': '#ff85c0',
}

export default {
  name: 'KnowledgeGraphPanel',
  components: { RelationGraph },
  props: { category: { type: String, required: true } },
  emits: ['graph-updated'],
  setup(props, { emit }) {
    const loading = ref(false)
    const buildLoading = ref(false)
    const importLoading = ref(false)
    const saving = ref(false)
    const graphRef = ref(null)
    const selectedNode = ref(null)
    const graphData = reactive({ nodes: [], edges: [] })
    const graphStats = ref(null)
    const docs = ref([])
    const docsLoading = ref(false)

    const showAddNodeDialog = ref(false)
    const showEditNodeDialog = ref(false)
    const showAddEdgeDialog = ref(false)
    const addNodeForm = reactive({ label: '', type: '国家' })
    const editNodeForm = reactive({ id: '', label: '', type: '国家' })
    const addEdgeForm = reactive({ source_id: '', target_id: '', relation_type: '关联' })

    const relationGraphOptions = {
      defaultNodeShape: 0,
      defaultNodeWidth: 100,
      defaultNodeHeight: 40,
      defaultLineShape: 1,
      defaultJunctionPoint: 'border',
      defaultNodeFontSize: 14,
      moveLock: false,
      zoomLock: false,
    }

    const graphInstance = ref(null)

    async function loadGraph() {
      loading.value = true
      try {
        const res = await getFullGraph(props.category)
        if (res?.success && res.data) {
          graphData.nodes = res.data.nodes || []
          graphData.edges = res.data.edges || []
          graphStats.value = {
            nodes: graphData.nodes.length,
            edges: graphData.edges.length,
          }
          selectedNode.value = null
          emit('graph-updated', graphStats.value)
          // 使用 ref 方法 setJsonData 设置图谱数据（v2.x 正确 API）
          let retry = 0
          const trySetData = () => {
            const rg = graphRef.value
            if (rg && rg.setJsonData && graphData.nodes.length) {
              rg.setJsonData(prepareRGraphData())
            } else if (retry < 10) {
              retry++
              setTimeout(trySetData, 200)
            }
          }
          await nextTick()
          setTimeout(trySetData, 100)
        }
      } catch (e) {
        console.error('Failed to load graph:', e)
        ElMessage.error('加载图谱失败')
      } finally {
        loading.value = false
      }
      // 同时加载文档列表
      await loadDocuments()
    }

    async function loadDocuments() {
      docsLoading.value = true
      try {
        const res = await getOsintBySourceType('official', props.category)
        if (res?.success && res.data) {
          const items = []
          Object.entries(res.data).forEach(([kw, events]) => {
            if (Array.isArray(events)) {
              events.forEach(item => items.push({ ...item, _keyword: kw }))
            }
          })
          docs.value = items
        }
      } catch (e) {
        console.error('Failed to load documents:', e)
      } finally {
        docsLoading.value = false
      }
    }

    async function toggleDocDetail(doc) {
      if (doc._expanded) { doc._expanded = false; return }
      doc._expanded = true
      if (doc._detail || doc.content) return
      doc._loading = true
      try {
        const res = await getOsintNewsDetail(doc.id)
        if (res?.success && res.data) {
          doc._detail = res.data.content || res.data.summary || '暂无内容'
        }
      } catch (e) {
        doc._detail = '加载失败'
      } finally {
        doc._loading = false
      }
    }

    function getNodeColor(type) {
      return NODE_TYPE_COLORS[type] || '#909399'
    }

    function getNodeType(type) {
      const m = {
        '国家': 'primary', '组织': 'success', '人物': 'warning',
        '条约/协议': 'info', '事件': 'danger', '地点': '',
        '军事技术': 'primary', '政策/战略': 'warning',
      }
      return m[type] || 'info'
    }

    function prepareRGraphData() {
      return {
        nodes: graphData.nodes.map(n => ({
          id: n.id,
          text: n.label,
          color: getNodeColor(n.type),
          fontColor: '#fff',
          data: n,
        })),
        lines: graphData.edges.map(e => ({
          from: e.source,
          to: e.target,
          text: e.label,
          color: '#94a3b8',
          data: e,
        })),
      }
    }

    function onNodeClick(nodeObject, $event) {
      if (nodeObject?.data) {
        selectedNode.value = nodeObject.data
      }
    }
    function onCanvasClick() {
      selectedNode.value = null
    }
    async function handleBuildGraph() {
      buildLoading.value = true
      try {
        const res = await buildKnowledgeGraph(props.category)
        if (res?.success && res.data) {
          graphData.nodes = res.data.nodes || []
          graphData.edges = res.data.edges || []
          graphStats.value = {
            nodes: graphData.nodes.length,
            edges: graphData.edges.length,
          }
          await nextTick()
          ElMessage.success(`图谱构建完成：${graphStats.value.nodes} 节点，${graphStats.value.edges} 关系`)
          emit('graph-updated', graphStats.value)
        } else {
          ElMessage.warning(res?.message || '构建失败')
        }
      } catch (e) {
        console.error('Build graph failed:', e)
        ElMessage.error('大模型服务暂不可用')
      } finally {
        buildLoading.value = false
      }
    }

    async function handleImport() {
      importLoading.value = true
      try {
        const res = await importOfficialDocuments(props.category)
        if (res?.success) {
          ElMessage.success(`导入完成：${res.data?.imported || 0} 条`)
        }
      } catch (e) {
        ElMessage.error('导入失败，请检查数据目录')
      } finally {
        importLoading.value = false
      }
    }

    async function submitAddNode() {
      if (!addNodeForm.label.trim()) {
        ElMessage.warning('请输入实体名称'); return
      }
      saving.value = true
      try {
        const res = await addGraphNode({
          category: props.category,
          label: addNodeForm.label.trim(),
          type: addNodeForm.type,
        })
        if (res?.success) {
          ElMessage.success('节点已添加')
          showAddNodeDialog.value = false
          addNodeForm.label = ''
          addNodeForm.type = '国家'
          await loadGraph()
        }
      } catch (e) {
        ElMessage.error('添加节点失败')
      } finally {
        saving.value = false
      }
    }

    function editSelectedNode() {
      editNodeForm.id = selectedNode.value.id
      editNodeForm.label = selectedNode.value.label
      editNodeForm.type = selectedNode.value.type
      showEditNodeDialog.value = true
    }

    async function submitEditNode() {
      if (!editNodeForm.label.trim()) {
        ElMessage.warning('请输入实体名称'); return
      }
      saving.value = true
      try {
        const res = await updateGraphNode(editNodeForm.id, {
          label: editNodeForm.label.trim(),
          type: editNodeForm.type,
        })
        if (res?.success) {
          ElMessage.success('节点已更新')
          showEditNodeDialog.value = false
          await loadGraph()
        }
      } catch (e) {
        ElMessage.error('更新节点失败')
      } finally {
        saving.value = false
      }
    }

    async function deleteSelectedNode() {
      if (!selectedNode.value) return
      try {
        const res = await deleteGraphNode(selectedNode.value.id)
        if (res?.success) {
          ElMessage.success('节点及关联关系已删除')
          selectedNode.value = null
          await loadGraph()
        }
      } catch (e) {
        ElMessage.error('删除节点失败')
      }
    }

    async function submitAddEdge() {
      if (!addEdgeForm.source_id || !addEdgeForm.target_id) {
        ElMessage.warning('请选择源节点和目标节点'); return
      }
      if (addEdgeForm.source_id === addEdgeForm.target_id) {
        ElMessage.warning('不能创建自环关系'); return
      }
      saving.value = true
      try {
        const res = await addGraphEdge({
          category: props.category,
          source_id: addEdgeForm.source_id,
          target_id: addEdgeForm.target_id,
          relation_type: addEdgeForm.relation_type,
        })
        if (res?.success) {
          ElMessage.success('关系已添加')
          showAddEdgeDialog.value = false
          addEdgeForm.source_id = ''
          addEdgeForm.target_id = ''
          addEdgeForm.relation_type = '关联'
          await loadGraph()
        }
      } catch (e) {
        ElMessage.error('添加关系失败')
      } finally {
        saving.value = false
      }
    }

    watch(() => props.category, () => { loadGraph() })
    onMounted(() => { loadGraph() })
    onBeforeUnmount(() => { graphInstance.value = null })

    return {
      loading, buildLoading, importLoading, saving,
      graphRef, graphData, graphStats, selectedNode, docs, docsLoading,
      showAddNodeDialog, showEditNodeDialog, showAddEdgeDialog,
      addNodeForm, editNodeForm, addEdgeForm,
      loadGraph, handleBuildGraph, handleImport,
      submitAddNode, editSelectedNode, submitEditNode, deleteSelectedNode,
      submitAddEdge,
      toggleDocDetail,
      getNodeType,
      nodeTypeOptions: NODE_TYPE_OPTIONS,
      relationTypeOptions: RELATION_TYPE_OPTIONS,
      relationGraphOptions,
      prepareRGraphData,
      Refresh, Lightning, Upload, Plus, Connection, Edit, Delete, Document,
    }
  },
}
</script>

<style scoped>
.knowledge-graph-panel { display: flex; flex-direction: column; height: 0; min-height: 0; flex: 1; position: relative; }
.kg-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; flex-shrink: 0; }
.kg-toolbar-left { display: flex; align-items: center; gap: 6px; }
.kg-toolbar-right { display: flex; align-items: center; gap: 8px; }
.kg-split-layout { display: flex; flex: 1; gap: 12px; min-height: 0; }
.kg-graph-wrap { flex: 1; min-height: 400px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; position: relative; min-height: 0; background: #fafafa; }
.kg-graph-container { width: 100%; height: 100%; min-height: 400px; }
.kg-empty { display: flex; justify-content: center; align-items: center; height: 100%; min-height: 400px; }
.kg-empty-doc { display: flex; justify-content: center; align-items: center; height: 100%; min-height: 100px; padding: 20px; }
.kg-doc-panel { width: 320px; border: 1px solid #e5e7eb; border-radius: 6px; display: flex; flex-direction: column; background: #fff; overflow: hidden; flex-shrink: 0; }
.kg-doc-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; flex-shrink: 0; }
.kg-doc-title { font-size: 13px; font-weight: 600; }
.kg-doc-list { flex: 1; overflow-y: auto; padding: 4px; min-height: 0; }
.kg-doc-item { padding: 8px; cursor: pointer; border-radius: 4px; margin-bottom: 2px; }
.kg-doc-item:hover { background: #f3f4f6; }
.kg-doc-item-title { display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kg-doc-item-meta { display: flex; gap: 8px; font-size: 11px; color: #9ca3af; margin-top: 2px; }
.kg-doc-item-content { margin-top: 6px; padding: 6px; background: #f9fafb; border-radius: 4px; font-size: 12px; color: #4b5563; max-height: 200px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5; }
.kg-detail-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-top: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; flex-shrink: 0; }
.kg-detail-info { display: flex; align-items: center; gap: 8px; }
.kg-detail-label { color: #94a3b8; font-size: 12px; }
.kg-detail-meta { color: #94a3b8; font-size: 12px; margin-left: 4px; }
.kg-detail-actions { display: flex; gap: 4px; }
</style>
