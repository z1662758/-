<template>
  <div class="sc-page-placeholder" :class="'phase-' + phase">
    <div class="ph-card">
      <div class="ph-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/>
          <path d="M8 9h8M8 13h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="18" cy="17" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </div>
      <div class="ph-title">{{ title }}</div>
      <div class="ph-subtitle" v-if="subtitle">{{ subtitle }}</div>
      <div class="ph-phase">
        <span class="ph-dot"></span>
        <span>{{ phaseLabel }}</span>
      </div>
      <div class="ph-hint">页面建设中，后续补充具体内容</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  phase: { type: String, default: 'during' }
})

const PHASE_LABELS = {
  pre: '事前 · 风险识别与预警',
  during: '事中 · 应急响应与调度',
  post: '事后 · 复盘优化与重构'
}
const phaseLabel = computed(() => PHASE_LABELS[props.phase] || '')
</script>

<style scoped>
.sc-page-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 40px;
  box-sizing: border-box;
  background: #fafbfc;
}

.ph-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 64px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  max-width: 540px;
  text-align: center;
}

.ph-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: #94a3b8;
}
.ph-icon svg { width: 48px; height: 48px; }

.ph-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.ph-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 18px;
  line-height: 1.6;
  max-width: 420px;
}

.ph-phase {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 20px;
}
.ph-dot { width: 8px; height: 8px; border-radius: 50%; }

.phase-pre .ph-phase { color: #3b82f6; background: #eff6ff; }
.phase-pre .ph-dot { background: #3b82f6; }
.phase-pre .ph-icon { color: #93c5fd; }

.phase-during .ph-phase { color: #f59e0b; background: #fffbeb; }
.phase-during .ph-dot { background: #f59e0b; }
.phase-during .ph-icon { color: #fcd34d; }

.phase-post .ph-phase { color: #8b5cf6; background: #f5f3ff; }
.phase-post .ph-dot { background: #8b5cf6; }
.phase-post .ph-icon { color: #c4b5fd; }

.ph-hint {
  font-size: 13px;
  color: #9ca3af;
  font-style: italic;
}
</style>
