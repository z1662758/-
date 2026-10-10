<template>
  <div class="section-container oooa-panel">
    <div class="section-title">
      <el-icon><Connection /></el-icon>
      OOOA 决策循环组件图
    </div>
    <div class="panel-body">
      <div class="oooa-flow">
        <div class="loop-node observe">
          <div class="node-name">Observe</div>
          <div class="node-desc">态势感知</div>
        </div>
        <div class="loop-arrow">→</div>
        <div class="loop-node orient">
          <div class="node-name">Orient</div>
          <div class="node-desc">目标对齐</div>
        </div>
        <div class="loop-arrow">→</div>
        <div class="loop-node optimize">
          <div class="node-name">Optimize</div>
          <div class="node-desc">方案优化</div>
        </div>
        <div class="loop-arrow">→</div>
        <div class="loop-node act">
          <div class="node-name">Act</div>
          <div class="node-desc">执行反馈</div>
        </div>
      </div>
      <div class="loop-feedback">↺ 闭环迭代：执行反馈回流 Observe</div>
      <div class="component-grid">
        <div class="component-item">
          <span class="component-label">Observe</span>
          <span class="component-value">需求感知组件</span>
        </div>
        <div class="component-item">
          <span class="component-label">Orient</span>
          <span class="component-value">场景研判组件</span>
        </div>
        <div class="component-item">
          <span class="component-label">Optimize</span>
          <span class="component-value">方案优化组件</span>
        </div>
        <div class="component-item">
          <span class="component-label">Act</span>
          <span class="component-value">执行编排组件</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Connection } from '@element-plus/icons-vue'
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
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.oooa-flow {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 8px;
}

.loop-node {
  border-radius: 10px;
  padding: 10px 8px;
  color: #fff;
  text-align: center;
}

.loop-node.observe { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
.loop-node.orient { background: linear-gradient(135deg, #0ea5e9, #0284c7); }
.loop-node.optimize { background: linear-gradient(135deg, #14b8a6, #0f766e); }
.loop-node.act { background: linear-gradient(135deg, #f59e0b, #d97706); }

.node-name {
  font-size: 13px;
  font-weight: 700;
}

.node-desc {
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.95;
}

.loop-arrow {
  font-size: 18px;
  color: #94a3b8;
  font-weight: 700;
}

.loop-feedback {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: #475569;
}

.component-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.component-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.component-label {
  font-size: 11px;
  color: #475569;
}

.component-value {
  margin-top: 3px;
  font-size: 12px;
  color: #0f172a;
  font-weight: 600;
}
</style>
