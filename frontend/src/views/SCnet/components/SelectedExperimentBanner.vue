<template>
  <transition name="el-fade-in-linear">
    <div v-if="visible" class="selected-exp-banner glass-panel">
      <div class="seb-left">
        <el-icon class="seb-icon"><Aim /></el-icon>
        <div class="seb-meta">
          <div class="seb-title">当前实验</div>
          <div class="seb-id mono">{{ experimentId }}</div>
        </div>
        <el-tag v-if="sessionId" size="small" type="info" effect="plain">
          会话 {{ shortSession(sessionId) }}
        </el-tag>
      </div>
      <div class="seb-actions">
        <el-button type="primary" size="small" @click="onNavigate(SCNET_ROUTES.interface)">
          <el-icon><Place /></el-icon>运行界面
        </el-button>
        <el-button type="warning" size="small" plain @click="onNavigate(SCNET_ROUTES.expAnalysisGameTheory)">
          <el-icon><Grid /></el-icon>博弈论
        </el-button>
        <el-button type="warning" size="small" plain @click="onNavigate(SCNET_ROUTES.expAnalysisDecisionTree)">
          <el-icon><Promotion /></el-icon>决策树
        </el-button>
        <el-button type="warning" size="small" plain @click="onNavigate(SCNET_ROUTES.expAnalysisScenario)">
          <el-icon><TrendCharts /></el-icon>情景分析
        </el-button>
        <el-button type="success" size="small" @click="onNavigate(SCNET_ROUTES.EXreport)">
          <el-icon><Document /></el-icon>实验报告
        </el-button>
        <el-button text size="small" @click="emit('dismiss')">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { Aim, Close, Document, Grid, Place, Promotion, TrendCharts } from '@element-plus/icons-vue'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import './shared/midStage.css'

defineProps({
  visible: { type: Boolean, default: false },
  experimentId: { type: String, default: '' },
  sessionId: { type: String, default: '' },
})
const emit = defineEmits(['dismiss', 'navigate'])

function shortSession(sid) {
  const s = String(sid || '')
  if (s.length <= 12) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

function onNavigate(path) {
  emit('navigate', path)
}
</script>

<style scoped>
.selected-exp-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  margin: 2px 0 6px;
  border-left: 3px solid var(--mid-info);
}

.seb-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.seb-icon {
  font-size: 16px;
  color: var(--mid-info);
}

.seb-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}

.seb-title {
  font-size: var(--mid-fs-label);
  color: #6b7280;
}

.seb-id {
  font-size: var(--mid-fs-strong);
  font-weight: 700;
  color: var(--mid-text-strong);
  font-family: 'JetBrains Mono', 'Menlo', monospace;
}

.seb-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.mono {
  font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
}
</style>
