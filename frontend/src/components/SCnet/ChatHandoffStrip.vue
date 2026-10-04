<template>
  <section v-if="visible" class="chat-handoff-strip">
    <div class="chs-main">
      <span class="chs-badge">来自对话研判</span>
      <div class="chs-text">
        <p class="chs-question" :title="question">{{ question || (loading ? '正在读取本次问题…' : '未取到问题原文') }}</p>
        <p class="chs-meta">
          <span v-if="phaseLabel">{{ phaseLabel }}</span>
          <span v-if="askedAt">{{ askedAt }}</span>
          <span v-if="toolLabels.length">数据源：{{ toolLabels.join(' / ') }}</span>
          <span v-if="loadFailed" class="chs-warn">会话回查失败，仅带上下文入口</span>
        </p>
        <p v-if="$slots.hint" class="chs-hint"><slot name="hint" /></p>
      </div>
    </div>
    <div class="chs-actions">
      <button type="button" class="chs-back" @click="backToChat">回到本次对话</button>
      <button type="button" class="chs-dismiss" title="收起交接条" @click="dismiss">&times;</button>
    </div>
  </section>
</template>

<script setup>
import { useChatHandoff } from '@/composables/useChatHandoff'

const {
  visible, loading, loadFailed,
  question, askedAt, phaseLabel, toolLabels,
  backToChat, dismiss
} = useChatHandoff()
</script>

<style scoped>
.chat-handoff-strip {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  margin: 0 0 14px; padding: 12px 16px;
  border: 1px solid #ddd6fe; border-left: 3px solid #6d28d9; border-radius: 10px;
  background: linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%);
}
.chs-main { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.chs-badge {
  flex: none; padding: 3px 8px; border-radius: 999px;
  background: #ede9fe; color: #5b21b6; font-size: 11.5px; font-weight: 600; white-space: nowrap;
}
.chs-text { min-width: 0; }
.chs-question {
  margin: 0; color: #1f2937; font-size: 13.5px; font-weight: 600; line-height: 1.45;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.chs-meta {
  display: flex; flex-wrap: wrap; gap: 10px;
  margin: 3px 0 0; color: #6b7280; font-size: 12px;
}
.chs-meta > span + span::before { content: '·'; margin-right: 10px; color: #d1d5db; }
.chs-warn { color: #b45309; }
.chs-hint { margin: 4px 0 0; color: #7c3aed; font-size: 12px; }
.chs-actions { display: flex; align-items: center; gap: 8px; flex: none; }
.chs-back {
  padding: 6px 12px; border: 1px solid #c4b5fd; border-radius: 999px;
  background: #fff; color: #5b21b6; font-size: 12.5px; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
}
.chs-back:hover { background: #5b21b6; border-color: #5b21b6; color: #fff; }
.chs-dismiss {
  width: 24px; height: 24px; border: none; border-radius: 50%;
  background: transparent; color: #9ca3af; font-size: 16px; line-height: 1; cursor: pointer;
}
.chs-dismiss:hover { background: #ede9fe; color: #5b21b6; }
</style>
