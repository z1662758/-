<template>
  <el-dialog
    v-model="dialogVisible"
    custom-class="modern-tree-dialog"
    title="书籍骨架目录树"
    top="5vh"
    width="90%"
    @opened="initTreeChart"
    @closed="handleDialogClose"
  >
    <div class="tree-toolbar">
      <div class="tree-toolbar-left">
        <el-input v-model="treeUpdateInstruction"
                  placeholder="输入自然语言指令(如: 合并第一章和第二章)" size="small"></el-input>
        <el-button :loading="isUpdatingTree" size="small" type="primary" @click="handleUpdateTree">
          自然语言更新
        </el-button>
      </div>
      <el-radio-group v-model="treeViewMode" size="small" @change="handleTreeViewChange">
        <el-radio-button label="visual">可视化大纲</el-radio-button>
        <el-radio-button label="text">文本模式</el-radio-button>
      </el-radio-group>
    </div>

    <div v-show="treeViewMode === 'visual'" class="tree-chart-wrap">
      <div class="tree-chart-tip">提示：按住左键拖动画布，点击节点可展开/收起。</div>
      <div ref="treeModeChartRef" :style="{ height: `${treeChartCanvasHeight}px` }"
           class="tree-chart-canvas"></div>
    </div>
    <div v-show="treeViewMode === 'text'"
         style="width: 100%; height: 75vh; overflow-y: auto; padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0,0,0,0.05); box-sizing: border-box;">
      <el-tree
        :data="bookIndexData"
        :default-expand-all="false"
        :props="defaultProps"
      >
        <template #default="{ node, data }">
            <span class="custom-tree-node">
              <span style="font-weight: bold;">{{ node.label }}</span>
              <span v-if="data.summary" style="margin-left: 15px; color: #666; font-size: 13px;">
                摘要: {{ data.summary }}
              </span>
            </span>
        </template>
      </el-tree>
    </div>
  </el-dialog>
</template>

<script>
import axios from 'axios'
import * as echarts from 'echarts'

export default {
  name: 'KnowledgeIndex',
  props: {
    bookName: { type: String, default: '' },
  },
  emits: ['close'],
  data() {
    return {
      dialogVisible: false,
      treeViewMode: 'visual',
      treeChartInstance: null,
      treeResizeHandler: null,
      treeChartCanvasHeight: 640,
      bookIndexData: [],
      treeUpdateInstruction: '',
      isUpdatingTree: false,
      currentBookForTree: null,
      defaultProps: {
        children: 'subsections',
        label: 'title',
      },
    }
  },
  watch: {
    bookName(val) {
      if (val) {
        this.fetchIndex(val)
      }
    },
  },
  methods: {
    open(bookName) {
      this.fetchIndex(bookName)
    },
    async fetchIndex(bookName) {
      if (!bookName) return
      this.currentBookForTree = { name: bookName }
      try {
        const response = await axios.get('/api/domain/book/index', {
          params: { book_name: bookName }
        })
        if (response.data.success) {
          this.bookIndexData = [response.data.data]
          this.dialogVisible = true
        } else {
          this.$message.error(response.data.message)
        }
      } catch (error) {
        console.error('获取索引失败:', error)
        this.$message.error('网络错误，获取索引失败')
      }
    },
    async handleUpdateTree() {
      if (!this.currentBookForTree || !this.treeUpdateInstruction) {
        this.$message.warning("请输入修改需求")
        return
      }
      this.isUpdatingTree = true
      try {
        const response = await axios.post('/api/domain/book/updateTree', {
          book_name: this.currentBookForTree.name,
          instruction: this.treeUpdateInstruction
        })
        if (response.data.success) {
          this.$message.success(response.data.message)
          this.treeUpdateInstruction = ''
          this.dialogVisible = false
          this.$emit('close')
        } else {
          this.$message.error(response.data.message)
        }
      } catch (error) {
        console.error('更新目录树任务下发失败:', error)
        this.$message.error('网络错误')
      }
      this.isUpdatingTree = false
    },
    handleTreeViewChange(val) {
      this.$nextTick(() => {
        if (val === 'visual') this.initTreeChart()
        else if (this.treeChartInstance) this.treeChartInstance.dispose()
      })
    },
    initTreeChart() {
      if (!this.$refs.treeModeChartRef) return
      if (this.treeChartInstance) {
        this.treeChartInstance.dispose()
      }
      this.treeChartInstance = echarts.init(this.$refs.treeModeChartRef)

      const formatData = (node, depth = 0) => {
        const children = node.subsections ? node.subsections.map((child) => formatData(child, depth + 1)) : []
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
        }
      }

      const countNodes = (node) => {
        if (!node) return 0
        const childCount = (node.children || []).reduce((sum, child) => sum + countNodes(child), 0)
        return 1 + childCount
      }

      let chartData = []
      if (this.bookIndexData && this.bookIndexData.length > 0) {
        chartData = this.bookIndexData.map(formatData)
      }

      const nodeCount = chartData.reduce((sum, root) => sum + countNodes(root), 0)
      this.treeChartCanvasHeight = Math.max(640, Math.min(2200, nodeCount * 44))
      this.$refs.treeModeChartRef.style.height = `${this.treeChartCanvasHeight}px`
      this.treeChartInstance.resize()

      const option = {
        backgroundColor: '#f8fafc',
        tooltip: {
          trigger: 'item',
          triggerOn: 'mousemove',
          enterable: true,
          confine: true,
          formatter: function (params) {
            let html = `<div style="max-width: 300px; white-space: normal; word-wrap: break-word;">`
            html += `<b>${params.data.name}</b>`
            if (params.data.value) {
              html += `<br/><span style="color: #999; font-size: 13px; margin-top: 5px; display: inline-block;">摘要: ${params.data.value}</span>`
            }
            html += `</div>`
            return html
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
      }
      this.treeChartInstance.setOption(option)

      if (!this.treeResizeHandler) {
        this.treeResizeHandler = () => {
          if (this.treeChartInstance) {
            this.treeChartInstance.resize()
          }
        }
        window.addEventListener('resize', this.treeResizeHandler)
      }
    },
    handleDialogClose() {
      if (this.treeResizeHandler) {
        window.removeEventListener('resize', this.treeResizeHandler)
        this.treeResizeHandler = null
      }
      if (this.treeChartInstance) {
        this.treeChartInstance.dispose()
        this.treeChartInstance = null
      }
      this.$emit('close')
    },
  },
  beforeUnmount() {
    if (this.treeResizeHandler) {
      window.removeEventListener('resize', this.treeResizeHandler)
    }
    if (this.treeChartInstance) {
      this.treeChartInstance.dispose()
    }
  },
}
</script>

<style scoped>
.tree-toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
}

.tree-toolbar-left {
  display: flex;
  gap: 10px;
  flex: 1;
}

.tree-chart-wrap {
  width: 100%;
  height: 75vh;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fbff 0%, #f1f5f9 100%);
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05) inset;
}

.tree-chart-tip {
  font-size: 13px;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  letter-spacing: 0.2px;
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

/* 现代化弹窗样式覆盖 — z-index 确保在侧边栏 (2200) 之上 */
:deep(.modern-tree-dialog) {
  z-index: 3100 !important;
}
:deep(.modern-tree-dialog .el-dialog__header) {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 15px;
  margin-bottom: 0;
}
:deep(.modern-tree-dialog .el-dialog__body) {
  padding: 20px;
}

@media (max-width: 768px) {
  .tree-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .tree-toolbar-left {
    width: 100%;
  }
}
</style>
