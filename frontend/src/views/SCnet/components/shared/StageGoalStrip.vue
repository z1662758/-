<template>
  <section class="stage-goal-strip glass-panel" :class="{ 'is-multiline': multiline }">
    <div class="stage-goal-main">
      <span class="stage-goal-badge">{{ badge }}</span>
      <div class="stage-goal-content">
        <span class="stage-goal-summary">{{ title }}</span>
        <el-popover
          v-if="desc || $slots.popover"
          placement="bottom-start"
          :width="popoverWidth"
          trigger="hover"
          popper-class="stage-goal-popover"
        >
          <template #reference>
            <button type="button" class="stage-goal-info-btn" aria-label="查看详细背景与说明">
              <el-icon :size="13"><InfoFilled /></el-icon>
              <span>目标背景</span>
            </button>
          </template>
          <div class="stage-goal-popover-content">
            <h4 class="sgp-title">{{ popoverTitle || badge }}</h4>
            <slot name="popover">
              <p class="sgp-desc">{{ desc }}</p>
            </slot>
          </div>
        </el-popover>
      </div>
    </div>

    <div v-if="$slots.side" class="stage-goal-side">
      <slot name="side" />
    </div>
  </section>
</template>

<script setup>
import { InfoFilled } from '@element-plus/icons-vue'

defineProps({
  badge: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  desc: {
    type: String,
    default: ''
  },
  popoverTitle: {
    type: String,
    default: ''
  },
  popoverWidth: {
    type: Number,
    default: 460
  },
  multiline: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.stage-goal-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 14px;
  margin: 6px 12px 10px;
  background: linear-gradient(135deg, rgba(238, 242, 255, 0.95) 0%, rgba(245, 243, 255, 0.9) 100%);
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.04);
  box-sizing: border-box;
  min-height: 38px;
}

.stage-goal-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.stage-goal-badge {
  font-size: 11px;
  font-weight: 800;
  color: #4338ca;
  background: #e0e7ff;
  border: 1px solid #c7d2fe;
  padding: 2px 8px;
  border-radius: 5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.stage-goal-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.stage-goal-summary {
  font-size: 12.5px;
  color: #334155;
  font-weight: 600;
  line-height: 1.4;
}

.stage-goal-info-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px dashed #a5b4fc;
  background: transparent;
  color: #4f46e5;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.stage-goal-info-btn:hover {
  background: #ede9fe;
  border-color: #6366f1;
}

.stage-goal-popover-content {
  padding: 2px;
}
.sgp-title {
  margin: 0 0 6px 0;
  font-size: 13px;
  font-weight: 700;
  color: #1e1b4b;
}
.sgp-desc {
  margin: 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.55;
}

.stage-goal-side {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 1200px) {
  .stage-goal-strip {
    flex-wrap: wrap;
  }
}
</style>
