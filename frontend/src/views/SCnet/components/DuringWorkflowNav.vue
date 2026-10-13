<template>
  <nav class="during-flow-nav" aria-label="流程向导导航">
    <!-- 上一步按钮 -->
    <button
      v-if="back"
      type="button"
      class="dfn-btn dfn-btn--back"
      @click="handleBack"
    >
      <span class="dfn-arrow">←</span>
      <span>{{ backLabel || '上一步' }}</span>
    </button>

    <!-- 过程查看按钮（可选：用于在决策分析/生成时跳转推演剧场） -->
    <button
      v-if="processView"
      type="button"
      class="dfn-btn dfn-btn--process"
      @click="handleProcessView"
    >
      <span class="dfn-icon">👁️</span>
      <span>{{ processLabel || '过程查看' }}</span>
      <span class="dfn-arrow">↗</span>
    </button>

    <!-- 下一步按钮 -->
    <button
      v-if="next"
      type="button"
      class="dfn-btn dfn-btn--next"
      :class="{ 'is-disabled': disableNext }"
      :disabled="disableNext"
      @click="handleNext"
    >
      <span>{{ nextLabel }}</span>
      <span class="dfn-arrow">→</span>
    </button>
  </nav>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  back: { type: [String, Function], default: '' },
  backLabel: { type: String, default: '上一步' },
  next: { type: [String, Function], default: '' },
  nextLabel: { type: String, default: '下一步' },
  disableNext: { type: Boolean, default: false },
  processView: { type: [String, Function], default: '' },
  processLabel: { type: String, default: '过程查看' }
})

const route = useRoute()
const router = useRouter()

// 统一携带当前场景和会话上下文进行页面跳转
function navigate(target) {
  if (typeof target === 'function') {
    target()
    return
  }
  if (typeof target === 'string') {
    const [path, search] = target.split('?')
    const query = { ...route.query }
    if (search) {
      const sp = new URLSearchParams(search)
      for (const [k, v] of sp.entries()) {
        query[k] = v
      }
    }
    router.push({ path, query })
  }
}

function handleBack() {
  if (props.back) navigate(props.back)
}

function handleNext() {
  if (!props.disableNext && props.next) navigate(props.next)
}

function handleProcessView() {
  if (props.processView) navigate(props.processView)
}
</script>

<style scoped>
.during-flow-nav {
  position: fixed;
  right: 28px;
  bottom: 24px;
  z-index: 2200;
  display: flex;
  align-items: center;
  gap: 10px;
  width: max-content;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(12px);
  user-select: none;
}

.dfn-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 15px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.22s cubic-bezier(0.2, 0.9, 0.4, 1.1);
  font-family: inherit;
  outline: none;
}

/* 上一步：低调中性灰白底，微边框 */
.dfn-btn--back {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #475569;
}
.dfn-btn--back:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
  transform: translateY(-1px);
}

/* 过程查看：清爽浅蓝底，高辨识度 */
.dfn-btn--process {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
  border-color: #a7f3d0;
  color: #065f46;
}
.dfn-btn--process:hover {
  background: linear-gradient(135deg, #dcfce7 0%, #cffafe 100%);
  border-color: #34d399;
  color: #047857;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

/* 下一步：统一现代科技蓝渐变，主要操作高亮 */
.dfn-btn--next {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  border-color: #1d4ed8;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}
.dfn-btn--next:hover:not(.is-disabled) {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
}
.dfn-btn--next.is-disabled,
.dfn-btn--next:disabled {
  background: #e2e8f0;
  border-color: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.dfn-icon {
  font-size: 13px;
}
.dfn-arrow {
  font-size: 12px;
  opacity: 0.8;
  transition: transform 0.2s ease;
}
.dfn-btn:hover .dfn-arrow {
  transform: translateX(2px);
  opacity: 1;
}
.dfn-btn--back:hover .dfn-arrow {
  transform: translateX(-2px);
}
</style>
