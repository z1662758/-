<template>
  <aside
    class="chat-sidebar"
    :class="{
      'chat-sidebar-expand': !collapsed,
      'chat-sidebar-shrink': collapsed
    }"
  >
    <!-- Logo row -->
    <div class="chat-sidebar-logo-row">
      <div class="chat-sidebar-brand">
        <img :src="logoUrl" alt="SCnet" class="chat-sidebar-logo" />
        <span v-show="!collapsed" class="chat-sidebar-title">MACE</span>
      </div>
      <button class="chat-sidebar-collapse-btn" type="button" @click="$emit('toggle')">
        <el-icon :size="16">
          <Fold v-if="!collapsed" />
          <Expand v-else />
        </el-icon>
      </button>
    </div>

    <!-- New conversation + Knowledge base -->
    <div v-show="!collapsed" class="chat-sidebar-quick-action">
      <button class="chat-sidebar-new-btn" :class="{ active: isDraftActive }" @click="$emit('new-conversation')">
        <el-icon :size="15"><Plus /></el-icon>
        <span>开启新对话</span>
      </button>
      <button class="chat-sidebar-tab-btn" :class="{ active: isKnowledgeActive }" @click="$emit('open-knowledge')">
        <el-icon :size="15"><Memo /></el-icon>
        <span>知识平台</span>
      </button>
    </div>
    <div v-show="collapsed" class="chat-sidebar-mini-actions">
      <button class="chat-sidebar-mini-btn is-primary" :class="{ active: isDraftActive }" title="开启新对话" @click="$emit('new-conversation')">
        <el-icon :size="16"><Plus /></el-icon>
      </button>
      <button class="chat-sidebar-mini-btn" :class="{ active: isKnowledgeActive }" title="知识库" @click="$emit('open-knowledge')">
        <el-icon :size="16"><Memo /></el-icon>
      </button>
    </div>

    <!-- Conversation list -->
    <div v-show="!collapsed" class="chat-sidebar-conv-list">
      <template v-if="groupedConversations.length > 0">
        <div v-for="group in groupedConversations" :key="group.label" class="chat-sidebar-date-group">
          <div class="chat-sidebar-date-label">{{ group.label }}</div>
          <div
            v-for="conv in group.items"
            :key="conv.id"
            class="chat-sidebar-conv-item"
            :class="{ active: conv.id === activeId, 'batch-mode': batchMode, 'batch-selected': selectedIds.has(conv.id) }"
            @click="handleClick(conv.id)"
            :title="collapsed ? (conv.title || '新对话') : ''"
          >
            <span v-if="batchMode" class="chat-sidebar-conv-check" @click.stop="toggleSelect(conv.id)">
              <el-icon :size="16">
                <component :is="selectedIds.has(conv.id) ? 'CircleCheckFilled' : 'CircleCheck'" />
              </el-icon>
            </span>
            <template v-if="editingId === conv.id && !collapsed">
              <input
                ref="renameInput"
                v-model="editTitle"
                class="chat-sidebar-rename-input"
                @keydown.enter="finishRename(conv.id)"
                @keydown.escape="cancelRename"
                @click.stop
              />
            </template>
            <span v-else class="chat-sidebar-conv-title">{{ conv.title || '新对话' }}</span>

            <!-- More menu -->
            <el-popover
              v-if="!collapsed && !batchMode"
              :ref="el => popoverRefs[conv.id] = el"
              trigger="click"
              placement="bottom-end"
              :width="130"
              popper-class="chat-conv-popover"
            >
              <template #reference>
                <button class="chat-sidebar-conv-more" @click.stop>
                  <el-icon :size="14"><MoreFilled /></el-icon>
                </button>
              </template>
              <div class="chat-selector-menu">
                <button class="chat-selector-item" @click.stop="startRenameAndClose(conv)">
                  <el-icon :size="15"><EditPen /></el-icon>
                  <span class="chat-selector-item-label">重命名</span>
                </button>
                <button class="chat-selector-item" @click.stop="handleDeleteClick(conv.id)">
                  <el-icon :size="15"><Delete /></el-icon>
                  <span class="chat-selector-item-label" style="color:#ef4444">删除</span>
                </button>
              </div>
            </el-popover>
          </div>
        </div>
      </template>
      <div v-else-if="historyError && !historyLoaded" class="chat-sidebar-conv-empty">
        <el-icon :size="24" color="#f59e0b"><WarningFilled /></el-icon>
        <span>历史对话加载失败</span>
        <button class="chat-sidebar-retry-btn" type="button" @click="$emit('retry-history')">重试</button>
      </div>
      <div v-else-if="historyLoading && !historyLoaded" class="chat-sidebar-conv-empty">
        <el-icon :size="24" color="#d1d5db"><Loading /></el-icon>
        <span>正在加载历史对话…</span>
      </div>
      <div v-else class="chat-sidebar-conv-empty">
        <el-icon :size="24" color="#d1d5db"><ChatDotRound /></el-icon>
        <span>暂无对话</span>
      </div>
    </div>

    <!-- Batch action bar -->
    <div v-if="batchMode && !collapsed" class="chat-sidebar-batch-bar">
      <button class="chat-sidebar-batch-select-all" @click="selectAll">
        <el-icon :size="13"><component :is="allSelected ? 'Close' : 'CircleCheck'" /></el-icon>
        <span>{{ allSelected ? '取消全选' : '全选' }}</span>
      </button>
      <span class="chat-sidebar-batch-count" v-if="selectedIds.size > 0">已选 {{ selectedIds.size }} 项</span>
      <span class="chat-sidebar-batch-count" v-else>选择要删除的对话</span>
      <button class="chat-sidebar-batch-delete-btn" :disabled="selectedIds.size === 0" @click="confirmBatchDelete">
        <el-icon :size="13"><Delete /></el-icon>
        <span>删除</span>
      </button>
    </div>

    <!-- Batch management entry -->
    <div v-show="!collapsed" class="chat-sidebar-batch-entry">
      <button class="chat-sidebar-batch-entry-btn" :class="{ on: batchMode }" @click="toggleBatchMode">
        <el-icon :size="14"><component :is="batchMode ? 'Close' : 'Operation'" /></el-icon>
        <span>{{ batchMode ? '退出管理' : '管理对话' }}</span>
      </button>
    </div>

    <!-- Footer -->
    <div class="chat-sidebar-footer">
      <img src="../../assets/images/gameImg.png" class="chat-sidebar-footer-avatar" alt="SCnet" />
      <transition name="fade-delay">
        <div v-show="!collapsed" class="chat-sidebar-footer-meta">
          <span class="chat-sidebar-footer-title">供应链</span>
          <el-button circle size="default" class="chat-sidebar-footer-logout" plain @click="$emit('exit')">
            <el-icon><SwitchButton /></el-icon>
          </el-button>
        </div>
      </transition>
    </div>
  </aside>
</template>

<script>
import {
  Fold, Expand, Plus, Memo, ChatDotRound, SwitchButton,
  MoreFilled, EditPen, Delete, Close, CircleCheck, CircleCheckFilled, Operation, WarningFilled, Loading
} from '@element-plus/icons-vue'
import logoUrl from '@/assets/images/logo.png'

export default {
  name: 'ChatSidebar',
  components: {
    Fold, Expand, Plus, Memo, ChatDotRound, SwitchButton,
    MoreFilled, EditPen, Delete, Close, CircleCheck, CircleCheckFilled, Operation, WarningFilled, Loading
  },
  props: {
    conversations: { type: Array, default: () => [] },
    activeId: { type: String, default: null },
    collapsed: { type: Boolean, default: false },
    historyLoaded: { type: Boolean, default: false },
    historyError: { type: Boolean, default: false },
    historyLoading: { type: Boolean, default: false }
  },
  emits: [
    'new-conversation', 'select-conversation', 'delete-conversation',
    'batch-delete', 'rename-conversation', 'toggle', 'exit', 'retry-history'
  ],
  data() {
    return {
      logoUrl,
      editingId: null,
      editTitle: '',
      popoverRefs: {},
      batchMode: false,
      selectedIds: new Set()
    }
  },
  computed: {
    groupedConversations() {
      const groups = {}
      const sorted = [...this.conversations].sort((a, b) => {
        const da = new Date(a.updated_at || a.created_at || 0).getTime()
        const db = new Date(b.updated_at || b.created_at || 0).getTime()
        return db - da
      })
      for (const item of sorted) {
        const key = this.dateGroup(item.updated_at || item.created_at)
        if (!groups[key]) groups[key] = []
        groups[key].push(item)
      }
      return ['今天', '昨天', '7天内', '30天内', '更早']
        .filter(k => groups[k]?.length)
        .map(k => ({ label: k, items: groups[k] }))
    },
    allSelected() {
      const allIds = (this.conversations || []).map(c => c.id)
      return allIds.length > 0 && allIds.every(id => this.selectedIds.has(id))
    },
    isDraftActive() {
      return !this.activeId
    },
    isKnowledgeActive() {
      return this.$route?.name === 'ChatKnowledge'
    }
  },
  methods: {
    dateGroup(ts) {
      const d = new Date(ts)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yest = new Date(today.getTime() - 86400000)
      const w = new Date(today.getTime() - 7 * 86400000)
      const m = new Date(today.getTime() - 30 * 86400000)
      if (d >= today) return '今天'
      if (d >= yest) return '昨天'
      if (d >= w) return '7天内'
      if (d >= m) return '30天内'
      return '更早'
    },
    handleClick(id) {
      if (this.editingId) return
      if (this.batchMode) { this.toggleSelect(id); return }
      this.$emit('select-conversation', id)
    },
    toggleBatchMode() {
      this.batchMode = !this.batchMode
      if (!this.batchMode) this.selectedIds = new Set()
    },
    toggleSelect(id) {
      const next = new Set(this.selectedIds)
      if (next.has(id)) next.delete(id); else next.add(id)
      this.selectedIds = next
    },
    selectAll() {
      if (this.allSelected) {
        this.selectedIds = new Set()
      } else {
        this.selectedIds = new Set((this.conversations || []).map(c => c.id))
      }
    },
    confirmBatchDelete() {
      if (this.selectedIds.size === 0) return
      this.$emit('batch-delete', [...this.selectedIds])
    },
    startRenameAndClose(conv) {
      this.closePopover(conv.id)
      setTimeout(() => {
        this.editingId = conv.id
        this.editTitle = conv.title || ''
        this.$nextTick(() => {
          const input = this.$refs.renameInput
          if (input) {
            const el = Array.isArray(input) ? input[0] : input
            el.focus()
            el.select()
          }
        })
      }, 150)
    },
    handleDeleteClick(convId) {
      this.closePopover(convId)
      this.$emit('delete-conversation', convId)
    },
    closePopover(convId) {
      const popper = this.popoverRefs[convId]
      if (popper && popper.hide) popper.hide()
    },
    finishRename(id) {
      if (this.editTitle.trim()) {
        this.$emit('rename-conversation', { id, title: this.editTitle.trim() })
      }
      this.editingId = null; this.editTitle = ''
    },
    cancelRename() { this.editingId = null; this.editTitle = '' },
    onDocumentClick(e) {
      if (!this.editingId) return
      const input = this.$el.querySelector('.chat-sidebar-rename-input')
      if (input && !input.contains(e.target)) this.finishRename(this.editingId)
    },
    onKeyDown(e) {
      if (e.key === 'Escape' && this.batchMode) {
        this.batchMode = false; this.selectedIds = new Set()
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.onDocumentClick)
    document.addEventListener('keydown', this.onKeyDown)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocumentClick)
    document.removeEventListener('keydown', this.onKeyDown)
  }
}
</script>

<style scoped>
.chat-sidebar {
  position: fixed; left: 0; top: 0; z-index: 1000;
  display: flex; flex-direction: column; justify-content: space-between;
  height: 100vh; padding: 12px 10px;
  background: #f5f6f8; box-sizing: border-box;
  transition: width 0.3s ease; overflow: hidden;
}
.chat-sidebar-expand { width: 260px; }
.chat-sidebar-shrink { width: 64px; padding: 12px 0; justify-content: flex-start; }

.chat-sidebar-logo-row {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: nowrap; height: 44px; margin-bottom: 12px; padding: 0 6px;
}
.chat-sidebar-brand { display: flex; align-items: center; gap: 8px; }
.chat-sidebar-logo { width: 20px; height: 20px; flex-shrink: 0; }
.chat-sidebar-title { color: #2c4a8a; font-size: 22px; font-weight: 700; line-height: 1; white-space: nowrap; }

.chat-sidebar-collapse-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border: 1px solid #e5e7eb; border-radius: 6px;
  background: #fff; color: #4b5563; cursor: pointer; flex-shrink: 0;
}
.chat-sidebar-collapse-btn:hover { background: #f3f4f6; }

.chat-sidebar-quick-action { padding: 2px 8px 12px; }
.chat-sidebar-new-btn {
  display: flex; align-items: center; justify-content: flex-start; gap: 8px;
  width: 100%; height: 40px; padding: 0 12px; border: none; border-radius: 10px;
  background: #111; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: opacity 0.2s; overflow: hidden; white-space: nowrap;
}
.chat-sidebar-new-btn:hover { opacity: 0.85; }
.chat-sidebar-mini-actions { display: flex; flex-direction: column; gap: 10px; padding: 2px 12px 12px; }
.chat-sidebar-mini-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; padding: 0; border: none; border-radius: 10px;
  background: #fff; color: #4b5563; cursor: pointer;
}
.chat-sidebar-mini-btn.is-primary { background: #111; color: #fff; }
.chat-sidebar-mini-btn.is-primary:hover { opacity: 0.85; }

.chat-sidebar-conv-list {
  flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 4px 6px 8px;
}
.chat-sidebar-conv-list::-webkit-scrollbar { width: 4px; }
.chat-sidebar-conv-list::-webkit-scrollbar-track { background: transparent; }
.chat-sidebar-conv-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }

.chat-sidebar-date-group { margin-bottom: 6px; }
.chat-sidebar-date-label { padding: 6px 8px 4px; font-size: 12px; font-weight: 600; color: #9ca3af; }
.chat-sidebar-conv-item {
  display: flex; align-items: center; min-height: 40px; padding: 8px 10px;
  border-radius: 10px; color: #374151; font-size: 14px; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.chat-sidebar-conv-item:hover { background: #f3f4f6; }
.chat-sidebar-conv-item.active { background: #e5e7eb; color: #111827; font-weight: 600; }
.chat-sidebar-conv-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-sidebar-conv-more {
  opacity: 0; display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border: none; border-radius: 6px; background: transparent;
  color: #6b7280; cursor: pointer; flex-shrink: 0; margin-left: 4px;
}
.chat-sidebar-conv-item:hover .chat-sidebar-conv-more { opacity: 1; }
.chat-sidebar-conv-more:hover { background: #e5e7eb; }

.chat-sidebar-rename-input {
  flex: 1; min-width: 0; height: 28px; padding: 0 6px;
  border: 1px solid #6366f1; border-radius: 6px; background: #fff;
  font-size: 14px; color: #111827; outline: none;
  box-shadow: 0 0 0 2px rgba(99,102,241,0.15);
}

.chat-sidebar-batch-bar {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin: 0 4px;
  border-radius: 10px; background: #fafbfd; border: 1px solid #ebeef2; flex-shrink: 0;
}
.chat-sidebar-batch-count { flex: 1; font-size: 12px; color: #9ca3af; text-align: center; }
.chat-sidebar-batch-select-all {
  display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 10px;
  border: none; border-radius: 6px; background: transparent; color: #6b7280; font-size: 12px; cursor: pointer;
}
.chat-sidebar-batch-delete-btn {
  display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 12px;
  border: none; border-radius: 6px; background: #fee2e2; color: #dc2626; font-size: 12px; font-weight: 500; cursor: pointer;
}
.chat-sidebar-batch-delete-btn:disabled { background: #f5f5f5; color: #c4c6d0; cursor: not-allowed; }

.chat-sidebar-batch-entry { padding: 4px 10px 6px; flex-shrink: 0; }
.chat-sidebar-batch-entry-btn {
  display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 8px;
  border: none; border-radius: 6px; background: transparent; color: #9ca3af; font-size: 12px; cursor: pointer;
}
.chat-sidebar-batch-entry-btn:hover { color: #6b7280; background: rgba(0,0,0,0.04); }
.chat-sidebar-batch-entry-btn.on { color: #6366f1; background: #eef2ff; }

.chat-sidebar-conv-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 20px 0; color: #9ca3af; font-size: 13px;
}
.chat-sidebar-retry-btn {
  margin-top: 2px; padding: 4px 14px; border: 1px solid #e5e7eb; border-radius: 8px;
  background: #fff; color: #6366f1; font-size: 12px; font-weight: 600; cursor: pointer;
}
.chat-sidebar-retry-btn:hover { background: #eef2ff; border-color: #c7d2fe; }

.chat-sidebar-footer {
  display: flex; align-items: center; height: 60px; padding: 0 12px;
  border-top: 1px solid #e5e7eb;
}
.chat-sidebar-footer-avatar { width: 24px; height: 24px; border-radius: 50%; margin-left: 8px; flex-shrink: 0; }
.chat-sidebar-footer-meta {
  display: flex; align-items: center; justify-content: space-between;
  width: calc(100% - 32px); margin-left: 8px;
}
.chat-sidebar-footer-title { font-size: 0.85rem; color: #374151; font-weight: 600; }
.chat-sidebar-footer-logout { margin-left: auto; }

.chat-selector-menu {
  display: flex; flex-direction: column; gap: 2px;
}
.chat-selector-item {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px;
  border: none; border-radius: 6px; background: none; cursor: pointer; font-size: 13px; color: #374151;
}
.chat-selector-item:hover { background: #f3f4f6; }
.chat-selector-item-label { flex: 1; text-align: left; }
</style>
