<template>
  <!--
    卡片内的可折叠区块：标题行常驻，内容按需展开。
    反事实实验页的区块很长（报告正文、需要修改的参数、Arguments / Status 表单），
    全铺开会让整页滚很久，这里统一收成标题行 + 按需展开。
    折叠状态由父组件用 v-model 控制，默认值写在父组件里，便于按区块区分。
  -->
  <div class="collapse-block" :class="{ 'is-open': open }">
    <button type="button" class="cb-head" :aria-expanded="open ? 'true' : 'false'" @click="open = !open">
      <el-icon class="cb-arrow" :class="{ 'is-open': open }"><ArrowRight /></el-icon>
      <span class="cb-title">{{ title }}</span>
      <span v-if="badge" class="cb-badge">{{ badge }}</span>
      <span v-if="hint" class="cb-hint">{{ hint }}</span>
      <span class="cb-toggle">{{ open ? '收起' : '展开' }}</span>
    </button>
    <el-collapse-transition>
      <div v-show="open" class="cb-body">
        <slot />
      </div>
    </el-collapse-transition>
  </div>
</template>

<script setup>
import { ArrowRight } from '@element-plus/icons-vue'

defineProps({
  title: { type: String, required: true },
  badge: { type: String, default: '' },
  hint: { type: String, default: '' }
})

const open = defineModel({ type: Boolean, default: false })
</script>

<style scoped>
.collapse-block {
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}
.cb-head {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 10px 12px; border: none; background: transparent;
  text-align: left; cursor: pointer; transition: background 0.2s;
}
.cb-head:hover { background: #f8fafc; }
.cb-arrow { color: #94a3b8; font-size: 12px; transition: transform 0.2s; }
.cb-arrow.is-open { transform: rotate(90deg); }
.cb-title { flex: none; color: #1f2937; font-size: 13px; font-weight: 600; white-space: nowrap; }
.cb-badge {
  flex: none;
  padding: 1px 7px; border-radius: 999px;
  background: #eef2ff; color: #4338ca; font-size: 11px;
}
.cb-hint {
  flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: #94a3b8; font-size: 11.5px;
}
.cb-toggle { flex: none; margin-left: auto; color: #94a3b8; font-size: 11.5px; white-space: nowrap; }
.cb-body { padding: 0 12px 12px; }
</style>
