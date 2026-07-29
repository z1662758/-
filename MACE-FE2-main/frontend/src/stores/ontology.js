import { defineStore } from 'pinia'
import { getDynamicGraph, getDynamicTimeline, getDynamicWindow, getDynamicRoles, getOwlStats, getOwlInferred, getOwlRiskPropagation, getOwlNetwork } from '@/api/ontology'

export const useOntologyStore = defineStore('ontology', {
  state: () => ({
    // Dynamic graph data
    dynamicGraph: null,        // full dynamic result
    dynamicTimeline: null,     // timeline with structural changes
    dynamicWindows: [],        // sorted window keys
    dynamicRoleGraph: null,    // role-annotated graph G*
    dynamicCurrentWindow: null,

    // Current view (what the chart renders)
    currentView: { nodes: [], edges: [], categories: [] },

    // Timeline snapshots for slider
    timelineSnapshots: [],

    // Selected node
    selectedNode: null,

    // Loading state
    loading: false,

    // --- OWL 2 DL 本体推理 ---
    owlStats: null,            // 本体统计
    owlInferred: null,         // SWRL推理结果
    owlRiskPaths: [],          // 选中节点的风险传导路径
    owlLoading: false,

    // --- OWL 本体网络（中心性 + 推理标签） ---
    owlNetwork: null,          // 完整 OWL 网络数据
    owlNetworkGraph: null,     // ECharts 格式图谱
    owlNetworkRoles: [],       // 角色标注（含5维分数）
    owlNetworkLabels: null,    // 推理标签汇总
    owlNetworkLoading: false,
  }),

  getters: {
    hasData: (state) => (state.currentView.nodes?.length || 0) > 0,
  },

  actions: {
    async fetchDynamicGraph() {
      this.loading = true
      try {
        const res = await getDynamicGraph()
        if (res?.success && res.data) {
          this.dynamicGraph = res.data
          this.dynamicWindows = Object.keys(res.data.graph_sequence || {}).sort()

          // Set role-annotated graph as initial view
          const rag = res.data.role_annotated_graph
          if (rag && rag.nodes?.length) {
            this.dynamicRoleGraph = rag
            this.currentView = { ...rag }
          }
        }
      } catch (e) {
        console.error('获取动态网络失败:', e)
      } finally {
        this.loading = false
      }
    },

    async fetchDynamicTimeline() {
      try {
        const res = await getDynamicTimeline()
        if (res?.success && res.data) {
          this.dynamicTimeline = res.data
          if (res.data.snapshots?.length) {
            this.timelineSnapshots = res.data.snapshots
          }
        }
      } catch (e) {
        console.error('获取动态时间线失败:', e)
      }
    },

    async loadDynamicWindow(windowKey) {
      this.dynamicCurrentWindow = windowKey
      try {
        const res = await getDynamicWindow(windowKey)
        if (res?.success && res.data) {
          const mg = res.data.merged_graph || {}
          // 如果窗口数据为空，保留当前视图不变
          if ((mg.nodes || []).length > 0 || (mg.edges || []).length > 0) {
            this.currentView = res.data
          }
        }
      } catch (e) {
        console.error('加载动态窗口失败:', e)
      }
    },

    selectNode(node) {
      this.selectedNode = node
      // 选中节点时自动查询风险传导路径
      if (node?.name) {
        this.fetchOwlRiskPropagation(node.name)
      }
    },

    clearSelection() {
      this.selectedNode = null
      this.owlRiskPaths = []
    },

    // --- OWL 本体推理 ---

    async fetchOwlStats() {
      try {
        const res = await getOwlStats()
        if (res?.success && res.data) {
          this.owlStats = res.data
        }
      } catch (e) {
        console.error('获取OWL统计失败:', e)
      }
    },

    async fetchOwlInferred() {
      this.owlLoading = true
      try {
        const res = await getOwlInferred()
        if (res?.success && res.data) {
          this.owlInferred = res.data
        }
      } catch (e) {
        console.error('获取OWL推理结果失败:', e)
      } finally {
        this.owlLoading = false
      }
    },

    async fetchOwlRiskPropagation(entity) {
      try {
        const res = await getOwlRiskPropagation(entity)
        if (res?.success && res.data) {
          this.owlRiskPaths = res.data
        }
      } catch (e) {
        this.owlRiskPaths = []
      }
    },

    // --- OWL 本体网络（中心性 + 推理标签） ---

    async fetchOwlNetwork() {
      this.owlNetworkLoading = true
      try {
        const res = await getOwlNetwork()
        if (res?.success && res.data) {
          const d = res.data
          this.owlNetwork = d
          this.owlNetworkGraph = d.graph || null
          this.owlNetworkRoles = d.role_annotations || []
          this.owlNetworkLabels = d.inference_labels || null

          // OWL 网络数据就绪，不自动切换视图（用户可点击"加载网络"按钮切换）
        }
      } catch (e) {
        console.error('获取OWL网络失败:', e)
      } finally {
        this.owlNetworkLoading = false
      }
    },
  }
})
