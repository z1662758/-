<template>
  <div class="post-causal-mechanism-page">
    <section class="page-head">
      <div>
        <p class="eyebrow">SCNET CAUSAL MECHANISM</p>
        <h1>机制分析</h1>
        <p class="subtitle">从宏观视角由供应链异常现象回推干预策略与机制假设，再进一步推断系统演化的主导驱动力。</p>
      </div>
      <div class="head-actions">
        <div class="stat-item">
          <span>事件节点</span>
          <strong>{{ eventRecordCount }}</strong>
        </div>
        <div class="stat-item">
          <span>主导驱力</span>
          <strong>{{ dominantDriver }}</strong>
        </div>
        <el-button type="primary" plain :icon="Refresh" @click="refreshData">刷新数据</el-button>
      </div>
    </section>

    <section class="overview-strip">
      <article v-for="item in overviewItems" :key="item.label" class="overview-item">
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <section class="analysis-pipeline">
      <header class="pipeline-head">
        <div>
          <h2>机制推断流程</h2>
          <p>围绕“现象归纳、策略回推、机制定位、驱动力判断”形成可追溯的宏观分析链。</p>
        </div>
        <el-tag type="info" effect="plain" round>系统动力学视角</el-tag>
      </header>

      <div class="pipeline-scroll">
        <div class="pipeline-flow-map">
          <article
            v-for="step in analysisWorkflow"
            :key="step.id"
            class="pipeline-card"
            :class="[`pipeline-card-${step.id}`, { active: selectedWorkflowStepId === step.id }]"
            @click="selectedWorkflowStepId = step.id"
          >
            <header>
              <span class="step-index">{{ step.index }}</span>
              <div>
                <div class="step-title-row">
                  <h3>{{ step.title }}</h3>
                  <el-tag size="small" :type="step.tagType" effect="light" round>{{ step.badge }}</el-tag>
                </div>
                <p>{{ step.description }}</p>
              </div>
            </header>

            <div class="step-kv">
              <span>输入</span>
              <strong>{{ step.input }}</strong>
            </div>
            <div class="step-result">
              <span>处理重点</span>
              <p>{{ step.preview }}</p>
            </div>
          </article>
        </div>

        <!-- 步骤详情面板 -->
        <Transition name="detail-slide">
          <div
            v-if="activeStepDetail"
            class="step-detail-panel"
            :class="`step-detail--${activeStepDetail.id}`"
          >
            <header class="detail-head">
              <div class="detail-head-left">
                <span class="detail-step-badge">{{ activeStepDetail.index }}</span>
                <h3>{{ activeStepDetail.title }}</h3>
                <el-tag size="small" type="info" effect="light" round>{{ activeStepDetail.badge }}</el-tag>
              </div>
              <el-button text :icon="Refresh" @click="refreshData">刷新</el-button>
            </header>
            <div class="detail-body">
              <!-- 分析设置 -->
              <section class="detail-section">
                <header class="detail-section-head">
                  <el-icon><Setting /></el-icon>
                  <span>分析设置</span>
                </header>
                <div class="detail-section-content">
                  <!-- 设置详情 -->
                  <div class="detail-subblock">
                    <h4 class="detail-subblock-title">设置详情</h4>
                    <div class="detail-param-grid">
                      <div class="detail-param-item">
                        <span class="param-label">参数 A</span>
                        <span class="param-value null">NULL</span>
                      </div>
                      <div class="detail-param-item">
                        <span class="param-label">参数 B</span>
                        <span class="param-value null">NULL</span>
                      </div>
                      <div class="detail-param-item">
                        <span class="param-label">参数 C</span>
                        <span class="param-value null">NULL</span>
                      </div>
                      <div class="detail-param-item">
                        <span class="param-label">参数 D</span>
                        <span class="param-value null">NULL</span>
                      </div>
                    </div>
                  </div>
                  <!-- 任务详情 -->
                  <div class="detail-subblock">
                    <h4 class="detail-subblock-title">任务详情</h4>
                    <div class="detail-task-row">
                      <span class="task-name-label">任务名</span>
                      <div class="task-name-spacer"></div>
                      <el-button type="primary" size="default" @click.stop="onStartTask">开始任务</el-button>
                    </div>
                  </div>
                </div>
              </section>

              <!-- 运行结果 -->
              <section class="detail-section">
                <header class="detail-section-head">
                  <el-icon><DataLine /></el-icon>
                  <span>运行结果</span>
                </header>
                <div class="detail-section-content">
                  <div class="detail-empty-hint">暂无运行结果</div>
                </div>
              </section>

              <!-- Agent设置详情 -->
              <section class="detail-section">
                <header class="detail-section-head">
                  <el-icon><User /></el-icon>
                  <span>Agent设置详情</span>
                </header>
                <div class="detail-section-content">
                  <div class="detail-empty-hint">暂无 Agent 配置信息</div>
                </div>
              </section>
            </div>
          </div>
        </Transition>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Collection,
  DataLine,
  Odometer,
  Refresh,
  Setting,
  User,
  Warning
} from '@element-plus/icons-vue'

const selectedWorkflowStepId = ref('phenomenon')
const eventRecordCount = ref(2)
const counterfactualCount = ref(0)
const dominantDriver = ref('需求冲击')

const overviewItems = computed(() => [
  { label: '异常现象', value: '订单积压', icon: Warning },
  { label: '完成率', value: '68.4%', icon: Odometer },
  { label: '回推置信', value: '72%', icon: DataLine },
  { label: '反事实轮次', value: counterfactualCount.value, icon: Collection }
])

const analysisWorkflow = computed(() => [
  {
    id: 'phenomenon',
    index: '01',
    title: '现象归纳',
    badge: 'Agent接口预留',
    tagType: 'info',
    description: '依据实验结果列表，由后台预设的实验分析 LLM Agent 总结异常现象簇。',
    input: '实验结果列表 2 条',
    preview: '提取异常指标、状态变化与关键参数，形成可追溯的现象簇。'
  },
  {
    id: 'strategy',
    index: '02',
    title: '策略回推',
    badge: '产能策略分析',
    tagType: 'warning',
    description: '由订单流转、产能变化反推指标明显变化时可能实施的调整策略。',
    input: '积压变化、协作次数、产能/库存变更',
    preview: '对齐订单积压和完成率跳变，反推可能作用过的扩产、调度或协作策略。'
  },
  {
    id: 'mechanism',
    index: '03',
    title: '机制定位',
    badge: '核心机制',
    tagType: 'primary',
    description: '由现象归纳和策略回推结果定位触发、耦合、供应或反馈中的关键机制。',
    input: '现象簇 + 策略候选 + 因果链路强度',
    preview: '合并现象簇、策略假设与干预因果图，锁定需求冲击到产能约束的核心链路。'
  },
  {
    id: 'driver',
    index: '04',
    title: '驱动力判断',
    badge: '系统动力学',
    tagType: 'success',
    description: '参考系统动力学模型，总结本次演化过程中的核心驱动力和反馈环。',
    input: '存量、流量、正反馈、负反馈',
    preview: '从库存、产能、订单流与协作反馈强度判断供应链持续演化的主导动力。'
  }
])

const activeStepDetail = computed(() =>
  analysisWorkflow.value.find(s => s.id === selectedWorkflowStepId.value) || null
)

const refreshData = () => {
  ElMessage.success('机制分析数据已刷新')
}

const onStartTask = () => {
  // 后期添加交互逻辑
}
</script>

<style scoped>
.post-causal-mechanism-page {
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 14px 16px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f6f8fb;
  color: #0f172a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 14px 22px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.eyebrow {
  margin: 0 0 6px;
  color: #3867f2;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.page-head h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 900;
}

.subtitle {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.stat-item {
  min-width: 112px;
  padding: 10px 13px;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
}

.stat-item span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.stat-item strong {
  display: block;
  margin-top: 6px;
  color: #1e3a8a;
  font-size: 21px;
  line-height: 1.1;
}

.overview-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.overview-item {
  display: grid;
  grid-template-columns: 42px 1fr;
  grid-template-rows: auto auto;
  column-gap: 12px;
  align-items: center;
  min-height: 64px;
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #bfdbfe;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
}

.overview-item .el-icon {
  grid-row: 1 / 3;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #dbeafe;
  color: #3867f2;
  font-size: 18px;
}

.overview-item span {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.overview-item strong {
  color: #0f172a;
  font-size: 20px;
  line-height: 1.2;
}

.analysis-pipeline {
  flex: 1 1 auto;
  min-height: 0;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pipeline-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 20px 10px;
  border-bottom: 1px solid #eef2f7;
}

.pipeline-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
}

.pipeline-head p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.pipeline-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
}

.pipeline-flow-map {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
  margin: 0;
  padding: 16px 18px 18px;
  overflow: hidden;
  align-content: center;
}

.pipeline-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 245px;
  padding: 18px 16px 16px;
  border: 1px solid #dbeafe;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(30, 64, 175, 0.08);
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1),
              box-shadow 0.3s ease,
              border-color 0.3s ease;
}

.pipeline-card::before {
  content: '';
  position: absolute;
  left: 22px;
  right: 22px;
  top: 0;
  height: 5px;
  border-radius: 0 0 999px 999px;
  transition: height 0.25s ease,
              left 0.25s ease,
              right 0.25s ease,
              background 0.3s ease;
}

.pipeline-card:hover {
  transform: translateY(-4px);
}

.pipeline-card:hover::before {
  height: 6px;
  left: 14px;
  right: 14px;
}

.pipeline-card.active {
  transform: translateY(-2px) scale(1.02);
  z-index: 2;
}

.pipeline-card.active::before {
  height: 6px;
  left: 10px;
  right: 10px;
}

/* ========== 卡片主题色 ========== */

/* ---- phenomenon 蓝色 ---- */
.pipeline-card-phenomenon { border-color: #bfdbfe; }
.pipeline-card-phenomenon::before { background: #3b82f6; }
.pipeline-card-phenomenon:hover { border-color: #93c5fd; box-shadow: 0 22px 42px rgba(59, 130, 246, 0.18); }
.pipeline-card-phenomenon:hover::before { background: #2563eb; }
.pipeline-card-phenomenon.active { border-color: #3b82f6; box-shadow: 0 24px 48px rgba(59, 130, 246, 0.24), 0 0 0 3px rgba(59, 130, 246, 0.12); }
.pipeline-card-phenomenon.active::before { background: #1d4ed8; }
.pipeline-card-phenomenon .step-index { background: #3b82f6; box-shadow: 0 14px 26px rgba(59, 130, 246, 0.28); }
.pipeline-card-phenomenon .step-result { border-left-color: #93c5fd; }

/* ---- strategy 黄色 ---- */
.pipeline-card-strategy { border-color: #fde68a; }
.pipeline-card-strategy::before { background: #eab308; }
.pipeline-card-strategy:hover { border-color: #facc15; box-shadow: 0 22px 42px rgba(234, 179, 8, 0.2); }
.pipeline-card-strategy:hover::before { background: #ca8a04; }
.pipeline-card-strategy.active { border-color: #eab308; box-shadow: 0 24px 48px rgba(234, 179, 8, 0.26), 0 0 0 3px rgba(234, 179, 8, 0.12); }
.pipeline-card-strategy.active::before { background: #a16207; }
.pipeline-card-strategy .step-index { background: #eab308; box-shadow: 0 14px 26px rgba(234, 179, 8, 0.3); }
.pipeline-card-strategy .step-result { border-left-color: #facc15; }

/* ---- mechanism 紫色 ---- */
.pipeline-card-mechanism { border-color: #ddd6fe; }
.pipeline-card-mechanism::before { background: #8b5cf6; }
.pipeline-card-mechanism:hover { border-color: #c4b5fd; box-shadow: 0 22px 42px rgba(139, 92, 246, 0.2); }
.pipeline-card-mechanism:hover::before { background: #7c3aed; }
.pipeline-card-mechanism.active { border-color: #8b5cf6; box-shadow: 0 24px 48px rgba(139, 92, 246, 0.26), 0 0 0 3px rgba(139, 92, 246, 0.12); }
.pipeline-card-mechanism.active::before { background: #6d28d9; }
.pipeline-card-mechanism .step-index { background: #8b5cf6; box-shadow: 0 14px 26px rgba(139, 92, 246, 0.3); }
.pipeline-card-mechanism .step-result { border-left-color: #c4b5fd; }

/* ---- driver 绿色 ---- */
.pipeline-card-driver { border-color: #bbf7d0; }
.pipeline-card-driver::before { background: #22c55e; }
.pipeline-card-driver:hover { border-color: #86efac; box-shadow: 0 22px 42px rgba(34, 197, 94, 0.2); }
.pipeline-card-driver:hover::before { background: #16a34a; }
.pipeline-card-driver.active { border-color: #22c55e; box-shadow: 0 24px 48px rgba(34, 197, 94, 0.26), 0 0 0 3px rgba(34, 197, 94, 0.12); }
.pipeline-card-driver.active::before { background: #15803d; }
.pipeline-card-driver .step-index { background: #22c55e; box-shadow: 0 14px 26px rgba(34, 197, 94, 0.3); }
.pipeline-card-driver .step-result { border-left-color: #86efac; }

/* ========== 步骤详情面板 ========== */

.step-detail-panel {
  margin: 16px 18px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #eef2f7;
}

.detail-head-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-step-badge {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
}

.detail-head h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
}

.detail-body {
  padding: 0;
}

/* 区块容器 */
.detail-section {
  border-bottom: 1px solid #eef2f7;
}

.detail-section:last-child {
  border-bottom: none;
}

.detail-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #f8fafc;
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
  border-bottom: 1px solid #eef2f7;
}

.detail-section-head .el-icon {
  color: #64748b;
  font-size: 16px;
}

.detail-section-content {
  padding: 14px 20px;
}

/* 子区块 */
.detail-subblock {
  margin-bottom: 14px;
}

.detail-subblock:last-child {
  margin-bottom: 0;
}

.detail-subblock-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.02em;
}

/* 参数网格 */
.detail-param-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.detail-param-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fafbfc;
}

.param-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.param-value {
  font-size: 15px;
  font-weight: 900;
  color: #0f172a;
}

.param-value.null {
  color: #cbd5e1;
  font-style: italic;
}

/* 任务行 */
.detail-task-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fafbfc;
}

.task-name-label {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  flex: 0 0 auto;
}

.task-name-spacer {
  flex: 1 1 auto;
}

/* 空状态 */
.detail-empty-hint {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

/* 详情面板主题色 */
.step-detail--phenomenon { border-top: 4px solid #3b82f6; }
.step-detail--phenomenon .detail-step-badge { background: #3b82f6; box-shadow: 0 10px 22px rgba(59, 130, 246, 0.28); }

.step-detail--strategy { border-top: 4px solid #eab308; }
.step-detail--strategy .detail-step-badge { background: #eab308; box-shadow: 0 10px 22px rgba(234, 179, 8, 0.3); }

.step-detail--mechanism { border-top: 4px solid #8b5cf6; }
.step-detail--mechanism .detail-step-badge { background: #8b5cf6; box-shadow: 0 10px 22px rgba(139, 92, 246, 0.3); }

.step-detail--driver { border-top: 4px solid #22c55e; }
.step-detail--driver .detail-step-badge { background: #22c55e; box-shadow: 0 10px 22px rgba(34, 197, 94, 0.3); }

/* 详情面板滑入动画 */
.detail-slide-enter-active {
  transition: all 0.35s cubic-bezier(0.2, 0.9, 0.4, 1.1);
}

.detail-slide-leave-active {
  transition: all 0.2s ease-in;
}

.detail-slide-enter-from {
  opacity: 0;
  transform: translateY(-16px) scaleY(0.95);
  max-height: 0;
}

.detail-slide-enter-to {
  opacity: 1;
  transform: translateY(0) scaleY(1);
  max-height: 400px;
}

.detail-slide-leave-from {
  opacity: 1;
  transform: translateY(0) scaleY(1);
  max-height: 400px;
}

.detail-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px) scaleY(0.95);
  max-height: 0;
}

.pipeline-card header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-height: 92px;
}

.pipeline-card header > div {
  flex: 1 1 auto;
  min-width: 0;
}

.step-index {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
}

.step-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  min-width: 0;
}

.step-title-row h3 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  line-height: 1.12;
  font-weight: 900;
  white-space: nowrap;
}

.pipeline-card header p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 700;
}

.step-kv {
  display: flex;
  gap: 12px;
  align-items: center;
}

.step-kv span,
.step-result span {
  flex: 0 0 auto;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
}

.step-kv strong {
  color: #0f172a;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 900;
}

.step-result {
  margin-top: auto;
  padding: 12px 13px;
  border-left: 4px solid;
  border-radius: 12px;
  background: #f8fafc;
}

.step-result p {
  margin: 7px 0 0;
  color: #334155;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 700;
}

:deep(.step-title-row .el-tag) {
  height: 26px;
  padding: 0 10px;
  border-color: #d9dee7;
  border-radius: 999px;
  background: #f3f5f8;
  color: #8b94a3;
  font-size: 12px;
  font-weight: 800;
}

@media (max-width: 1180px) {
  .page-head {
    flex-direction: column;
  }

  .head-actions {
    align-items: stretch;
  }

  .overview-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pipeline-flow-map {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
    min-width: 0;
    overflow: auto;
  }
}
</style>
