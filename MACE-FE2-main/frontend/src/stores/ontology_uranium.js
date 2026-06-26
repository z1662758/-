import { defineStore } from 'pinia'
import {
  getUraniumGraph, getUraniumDynamicGraph, getUraniumDynamicTimeline,
  getUraniumDynamicWindow, getUraniumDynamicRoles, rebuildUraniumNetwork,
  getUraniumOwlStats, getUraniumOwlInferred, getUraniumOwlRiskPropagation,
  getUraniumOwlNetwork
} from '@/api/ontology'

export const useUraniumOntologyStore = defineStore('uraniumOntology', {
  state: () => ({
    // 铀静态本体图
    staticGraph: null,

    // 铀动态网络数据
    dynamicGraph: null,        // 完整动态网络结果 (28个年度窗口)
    dynamicTimeline: null,     // 演化时间线
    dynamicWindows: [],        // 排序后的窗口键 ["t_1997", ..., "t_2024"]
    dynamicRoleGraph: null,    // 角色标注图

    // 当前视图（图表渲染的数据）
    currentView: { nodes: [], edges: [], categories: [] },

    // 时间线快照（用于滑块）
    timelineSnapshots: [],

    // 选中节点
    selectedNode: null,

    // 加载状态
    loading: false,

    // --- OWL 2 DL 本体推理 ---
    owlStats: null,
    owlInferred: null,
    owlRiskPaths: [],
    owlLoading: false,

    // --- OWL 本体网络（5维中心性 + 推理标签） ---
    owlNetwork: null,
    owlNetworkGraph: null,
    owlNetworkLabels: null,
    owlNetworkLoading: false,
  }),

  getters: {
    hasData: (state) => (state.currentView.nodes?.length || 0) > 0,
  },

  actions: {
    // ===== 静态本体图 =====
    async fetchStaticGraph() {
      try {
        const res = await getUraniumGraph()
        if (res?.success && res.data) {
          this.staticGraph = res.data
        }
      } catch (e) {
        console.error('获取铀静态本体图失败:', e)
      }
    },

    // ===== 动态网络 =====
    async fetchDynamicGraph() {
      this.loading = true
      try {
        const res = await getUraniumDynamicGraph()
        if (res?.success && res.data) {
          this.dynamicGraph = res.data
          this.dynamicWindows = Object.keys(res.data.graph_sequence || {}).sort()

          // 初始显示角色标注图
          const rag = res.data.role_annotated_graph
          if (rag && rag.nodes?.length) {
            this.dynamicRoleGraph = rag
            this.currentView = { ...rag }
          }
        }
      } catch (e) {
        console.error('获取铀动态网络失败:', e)
      } finally {
        this.loading = false
      }
    },

    async fetchDynamicTimeline() {
      try {
        const res = await getUraniumDynamicTimeline()
        if (res?.success && res.data) {
          this.dynamicTimeline = res.data
          if (res.data.snapshots?.length) {
            this.timelineSnapshots = res.data.snapshots
          }
        }
      } catch (e) {
        console.error('获取铀动态时间线失败:', e)
      }
    },

    async loadDynamicWindow(windowKey) {
      try {
        const res = await getUraniumDynamicWindow(windowKey)
        if (res?.success && res.data) {
          this.currentView = res.data
        }
      } catch (e) {
        console.error('加载铀动态窗口失败:', e)
      }
    },

    async loadRoleGraph() {
      const rag = this.dynamicRoleGraph
      if (rag && rag.nodes?.length) {
        this.currentView = { ...rag }
      }
    },

    selectNode(node) {
      this.selectedNode = node
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
        const res = await getUraniumOwlStats()
        if (res?.success && res.data) this.owlStats = res.data
      } catch (e) { console.error('获取铀OWL统计失败:', e) }
    },

    async fetchOwlInferred() {
      this.owlLoading = true
      try {
        const res = await getUraniumOwlInferred()
        if (res?.success && res.data) this.owlInferred = res.data
      } catch (e) { console.error('获取铀OWL推理失败:', e) }
      finally { this.owlLoading = false }
    },

    async fetchOwlRiskPropagation(entity) {
      try {
        const res = await getUraniumOwlRiskPropagation(entity)
        if (res?.success && res.data) this.owlRiskPaths = res.data
      } catch (e) { this.owlRiskPaths = [] }
    },

    async fetchOwlNetwork() {
      this.owlNetworkLoading = true
      try {
        const res = await getUraniumOwlNetwork()
        if (res?.success && res.data) {
          const d = res.data
          this.owlNetwork = d
          this.owlNetworkGraph = d.graph || null
          this.owlNetworkLabels = d.inference_labels || null
        }
      } catch (e) { console.error('获取铀OWL网络失败:', e) }
      finally { this.owlNetworkLoading = false }
    },

    // ===== 重建 =====
    async rebuildNetwork() {
      try {
        const res = await rebuildUraniumNetwork()
        if (res?.success) {
          await this.fetchStaticGraph()
          await this.fetchDynamicGraph()
          await this.fetchDynamicTimeline()
          return true
        }
        return false
      } catch (e) {
        console.error('重建铀网络失败:', e)
        return false
      }
    },
  }
})
