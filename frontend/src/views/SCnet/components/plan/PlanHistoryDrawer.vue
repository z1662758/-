<template>
  <el-drawer
    :model-value="modelValue"
    :size="760"
    :with-header="false"
    class="plan-history-drawer"
    @update:model-value="emit('update:modelValue', $event)"
    @open="onOpen"
  >
    <div class="ph">
      <header class="ph-head">
        <div class="ph-head__left">
          <h2>历史方案</h2>
          <p v-if="!store.viewingHistory">
            只收录真实生成过、已保存内容的分析方案，按更新时间倒序。
          </p>
          <p v-else class="ph-head__task">
            任务编号 {{ store.viewingHistory.task_id }} · v{{ store.viewingHistory.plan_version }}
          </p>
        </div>
        <div class="ph-head__right">
          <el-button v-if="store.viewingHistory" link type="primary" @click="store.clearViewingHistory()">
            ← 返回列表
          </el-button>
          <el-button link @click="emit('update:modelValue', false)">关闭</el-button>
        </div>
      </header>

      <!-- ===== 列表 ===== -->
      <div v-if="!store.viewingHistory" class="ph-body">
        <div v-if="store.historyLoading" class="ph-state">
          <span class="ph-spinner"></span>
          <span>正在读取历史方案……</span>
        </div>
        <el-alert
          v-else-if="store.historyError"
          :title="store.historyError"
          type="error"
          :closable="false"
          show-icon
        />
        <p v-else-if="!store.history.length" class="ph-empty">
          还没有历史方案。真实生成成功的方案会自动出现在这里。
        </p>

        <ul v-else class="ph-list">
          <li
            v-for="item in store.history"
            :key="item.session_id"
            class="ph-item"
            @click="onView(item)"
          >
            <div class="ph-item__top">
              <span class="ph-item__task">{{ item.task_id || item.session_id }}</span>
              <span class="ph-item__time">{{ formatTime(item.updated_at || item.created_at) }}</span>
              <span class="ph-item__badge">v{{ item.plan_version }}</span>
              <span v-if="item.confirmed_at" class="ph-item__badge is-ok">已确认过</span>
              <button
                type="button"
                class="ph-item__del"
                :disabled="store.deletingId === item.session_id"
                title="删除该历史方案"
                @click.stop="onDelete(item)"
              >
                {{ store.deletingId === item.session_id ? '删除中…' : '删除' }}
              </button>
            </div>
            <p class="ph-item__question">{{ item.question || '（该方案未记录核心问题）' }}</p>
            <div class="ph-item__meta">
              <span v-if="item.object">对象：{{ item.object }}</span>
              <span v-if="item.regions?.length">国家：{{ item.regions.join('、') }}</span>
              <span v-if="item.time_range">时间：{{ item.time_range }}</span>
            </div>
            <div class="ph-item__counts">
              {{ item.question_count }} 个问题 · {{ item.resource_count }} 项数据 · {{ item.model_count }} 个模型
            </div>
          </li>
        </ul>
      </div>

      <!-- ===== 只读查看 ===== -->
      <div v-else class="ph-body">
        <div v-if="store.viewingLoading" class="ph-state">
          <span class="ph-spinner"></span>
          <span>正在读取方案内容……</span>
        </div>

        <template v-else-if="detail">
          <div class="ph-actions">
            <el-button type="primary" :loading="store.importing" @click="onImport">
              载入到当前方案
            </el-button>
            <el-button
              type="danger"
              plain
              :loading="store.deletingId === detail.session_id"
              @click="onDelete(detail)"
            >
              删除该方案
            </el-button>
            <span class="ph-actions__note">
              载入后成为当前可编辑草稿，不会自动启动正式分析。
            </span>
          </div>

          <PlanSection title="任务理解" :badge="detailTag">
            <dl class="ph-dl">
              <div><dt>核心研判问题</dt><dd>{{ summary.question || '—' }}</dd></div>
              <div><dt>研究对象</dt><dd>{{ summary.object || '—' }}</dd></div>
              <div><dt>关注国家或地区</dt><dd>{{ join(summary.regions) }}</dd></div>
              <div><dt>分析时间范围</dt><dd>{{ summary.timeRange || '—' }}</dd></div>
              <div><dt>关注路线</dt><dd>{{ join(summary.routes) }}</dd></div>
              <div><dt>已知条件</dt><dd>{{ join(summary.knownConditions) }}</dd></div>
            </dl>
          </PlanSection>

          <PlanSection title="拟回答问题" :badge="`${content.analysisQuestions?.length || 0} 条`">
            <ol class="ph-ol">
              <li v-for="q in content.analysisQuestions || []" :key="q.id" :class="{ 'is-off': q.enabled === false }">
                {{ q.title }}
                <em v-if="q.enabled === false">（当时未启用）</em>
              </li>
            </ol>
          </PlanSection>

          <PlanSection title="数据支撑方案" :badge="`${content.dataSources?.length || 0} 项`">
            <table class="ph-table">
              <thead><tr><th>数据资源</th><th>类型</th><th>时间覆盖</th><th>用途</th></tr></thead>
              <tbody>
                <tr v-for="r in content.dataSources || []" :key="r.resourceId" :class="{ 'is-off': r.enabled === false }">
                  <td>{{ r.name }}</td>
                  <td>{{ r.type || '—' }}</td>
                  <td>{{ r.coverage || '—' }}</td>
                  <td>{{ r.purpose || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </PlanSection>

          <PlanSection title="分析模型方案" :badge="`${content.models?.length || 0} 个`">
            <table class="ph-table">
              <thead><tr><th>模型</th><th>能力</th><th>本次用途</th></tr></thead>
              <tbody>
                <tr v-for="m in content.models || []" :key="m.modelId" :class="{ 'is-off': m.enabled === false }">
                  <td>{{ m.name }}</td>
                  <td>{{ m.capability || '—' }}</td>
                  <td>{{ m.purpose || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </PlanSection>

          <PlanSection title="分析执行流程" :badge="`${content.workflow?.length || 0} 步`">
            <ol class="ph-ol">
              <li v-for="s in content.workflow || []" :key="s.id" :class="{ 'is-off': s.enabled === false }">
                <b>{{ s.name }}</b><span v-if="s.description">：{{ s.description }}</span>
                <em v-if="s.dependencies?.length">（前置：{{ nameOf(s.dependencies) }}）</em>
              </li>
            </ol>
          </PlanSection>

          <PlanSection v-if="content.indicators?.length" title="指标与判断口径" :badge="`${content.indicators.length} 项`">
            <table class="ph-table">
              <thead><tr><th>指标</th><th>方法</th><th>输出形式</th></tr></thead>
              <tbody>
                <tr v-for="(i, idx) in content.indicators" :key="`i-${idx}`">
                  <td>{{ i.name }}</td>
                  <td>{{ i.method || '—' }}</td>
                  <td>{{ i.outputForm || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </PlanSection>

          <PlanSection v-if="content.outputs?.length" title="预计输出" :badge="`${content.outputs.length} 项`">
            <p class="ph-inline">{{ content.outputs.map((o) => o.name).join('、') }}</p>
          </PlanSection>

          <PlanSection v-if="content.limitations?.length" title="分析限制与说明" :badge="`${content.limitations.length} 条`">
            <ul class="ph-ul">
              <li v-for="(t, idx) in content.limitations" :key="`l-${idx}`">{{ t }}</li>
            </ul>
          </PlanSection>
        </template>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useExpertPlanStore } from '@/stores/scnet/useExpertPlanStore'
import PlanSection from './PlanSection.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const store = useExpertPlanStore()

const detail = computed(() => store.viewingHistory)
const content = computed(() => store.viewingHistory?.content || {})
const summary = computed(() => content.value.taskSummary || {})

const detailTag = computed(() => {
  const item = store.viewingHistory
  if (!item) return ''
  return item.confirmed_at ? '当时已确认' : '当时待确认'
})

const join = (value) => (Array.isArray(value) ? value.filter(Boolean).join('、') || '—' : value || '—')

const nameOf = (ids) =>
  (ids || [])
    .map((id) => (content.value.workflow || []).find((s) => s.id === id)?.name || id)
    .join(' → ')

function formatTime(raw) {
  if (!raw) return '—'
  const text = String(raw).replace('T', ' ')
  return text.length > 16 ? text.slice(0, 16) : text
}

async function onOpen() {
  store.clearViewingHistory()
  try {
    await store.loadHistory()
  } catch {
    /* 错误已写入 store.historyError,由页面展示 */
  }
}

async function onView(item) {
  try {
    await store.viewHistory(item.session_id)
  } catch (e) {
    ElMessage.error(e?.message || '读取历史方案内容失败')
  }
}

/**
 * 删除历史方案:后端会一并删掉会话文件,不可恢复,所以必须先确认。
 */
async function onDelete(item) {
  if (!item) return
  const label = item.task_id || item.session_id
  try {
    await ElMessageBox.confirm(
      `将永久删除任务 ${label} 的历史方案及其会话数据，删除后无法恢复，`
      + '也不能再用该任务编号打开方案。是否继续？',
      '删除历史方案',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await store.deleteHistory(item.session_id)
    ElMessage.success(`历史方案 ${label} 已删除`)
  } catch (e) {
    ElMessage.error(e?.message || '删除历史方案失败')
  }
}

async function onImport() {  const item = store.viewingHistory
  if (!item) return
  try {
    await ElMessageBox.confirm(
      `将把任务 ${item.task_id}（v${item.plan_version}）的方案载入为当前可编辑草稿，`
      + '当前草稿会被替换。载入不会启动正式分析。是否继续？',
      '载入历史方案',
      { type: 'warning', confirmButtonText: '载入', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await store.importHistory(item.session_id)
    emit('update:modelValue', false)
    ElMessage.success('历史方案已载入，您可以继续编辑与确认。')
  } catch (e) {
    ElMessage.error(e?.message || '载入历史方案失败')
  }
}

onBeforeUnmount(() => store.clearViewingHistory())
</script>

<style scoped>
.ph { display: flex; flex-direction: column; height: 100%; }
.ph-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}
.ph-head h2 { margin: 0 0 4px; font-size: 18px; color: #0f172a; }
.ph-head p { margin: 0; font-size: 12px; color: #64748b; }
.ph-head__task { font-variant-numeric: tabular-nums; }
.ph-head__right { display: flex; gap: 8px; flex-shrink: 0; }
.ph-body { flex: 1; min-height: 0; overflow-y: auto; padding-top: 14px; }

.ph-state { display: flex; align-items: center; gap: 10px; padding: 28px 4px; color: #64748b; font-size: 13px; }
.ph-spinner {
  width: 18px; height: 18px;
  border: 2px solid #dbeafe; border-top-color: #2563eb;
  border-radius: 50%; animation: ph-spin .9s linear infinite;
}
@keyframes ph-spin { to { transform: rotate(360deg); } }
.ph-empty { color: #94a3b8; font-size: 13px; padding: 24px 4px; text-align: center; }

.ph-list { list-style: none; margin: 0; padding: 0; }
.ph-item {
  padding: 12px 14px;
  margin-bottom: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color .18s ease, box-shadow .18s ease;
}
.ph-item:hover { border-color: #bfdbfe; box-shadow: 0 4px 14px rgba(37, 99, 235, .08); }
.ph-item__top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ph-item__task { font-size: 13px; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums; }
.ph-item__time { font-size: 12px; color: #94a3b8; }
.ph-item__badge {
  font-size: 11px; color: #2563eb; background: #eff6ff;
  border: 1px solid #bfdbfe; border-radius: 999px; padding: 1px 8px;
}
.ph-item__badge.is-ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
.ph-item__del {
  margin-left: auto;
  padding: 2px 10px;
  font-size: 12px;
  color: #dc2626;
  background: #fff;
  border: 1px solid #fecaca;
  border-radius: 6px;
  cursor: pointer;
  line-height: 1.6;
}
.ph-item__del:hover:not(:disabled) { background: #fef2f2; border-color: #fca5a5; }
.ph-item__del:disabled { color: #94a3b8; border-color: #e2e8f0; cursor: not-allowed; }
.ph-item__question { margin: 8px 0 6px; font-size: 13px; color: #334155; line-height: 1.55; }
.ph-item__meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: #64748b; }
.ph-item__counts { margin-top: 6px; font-size: 12px; color: #94a3b8; }

.ph-actions {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px 14px; margin-bottom: 14px;
  background: #f8fbff; border: 1px solid #bfdbfe; border-radius: 10px;
}
.ph-actions__note { font-size: 12px; color: #64748b; }

.ph-dl { margin: 0; font-size: 13px; }
.ph-dl > div { display: flex; gap: 10px; margin-bottom: 6px; }
.ph-dl dt { min-width: 104px; color: #64748b; flex-shrink: 0; }
.ph-dl dd { margin: 0; flex: 1; color: #0f172a; line-height: 1.6; }

.ph-ol, .ph-ul { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.7; color: #334155; }
.ph-ol li.is-off, .ph-ul li.is-off { color: #94a3b8; }
.ph-ol em { font-style: normal; color: #94a3b8; font-size: 12px; }
.ph-inline { margin: 0; font-size: 13px; line-height: 1.7; color: #334155; }

.ph-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.ph-table th, .ph-table td {
  border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top;
}
.ph-table th { background: #f8fafc; color: #475569; font-weight: 600; }
.ph-table tr.is-off td { color: #94a3b8; }
</style>
