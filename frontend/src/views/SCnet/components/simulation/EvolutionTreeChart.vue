<template>
  <div class="section-container tree-container">
    <div class="section-title">
      <el-icon><Share /></el-icon> 风险演化树
    </div>
    <div class="panel-body">
      <div :ref="setChartRef" class="echarts-tree"></div>
    </div>
  </div>
</template>

<script setup>
import { Share } from '@element-plus/icons-vue'

defineProps({
  setChartRef: {
    type: Function,
    required: true
  }
})
</script>

<style scoped>
.section-container {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-body {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

.tree-container {
  flex: 0 0 auto;
  min-height: 250px;
}

.echarts-tree {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
