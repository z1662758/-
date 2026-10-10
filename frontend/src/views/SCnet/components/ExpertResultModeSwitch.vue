<template>
  <div class="mode-switch" :class="{ 'is-example': isExample }">
    <template v-if="!isExample">
      <el-button size="small" :disabled="!exampleReady" @click="onViewExample">
        暂时查看案例
      </el-button>
      <span class="mode-switch__note">
        <template v-if="exampleReady">
          切换后不会停止后台分析，您可以随时返回当前任务。
        </template>
        <template v-else>案例包尚未发布，暂不可查看。</template>
      </span>
    </template>
    <template v-else>
      <el-button size="small" type="primary" @click="onBackLive">
        返回当前任务
      </el-button>
      <span class="mode-switch__note">
        正在查看案例结果，后台真实任务不受影响。
      </span>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useExpertExampleStore } from '@/stores/scnet/useExpertExampleStore'
import { useExpertWorkflowStore } from '@/stores/scnet/useExpertWorkflowStore'

const props = defineProps({
  /** 要预取的案例阶段;为空表示只切模式不预取 */
  stage: { type: String, default: '' },
})

const workflowStore = useExpertWorkflowStore()
const exampleStore = useExpertExampleStore()

const isExample = computed(() => workflowStore.displayMode === 'example')
const exampleReady = computed(() => exampleStore.available)

async function onViewExample() {
  try {
    await exampleStore.loadMeta()
    if (props.stage) await exampleStore.loadStageArtifact(props.stage, { force: props.stage === 'judgment' })
  } catch (e) {
    ElMessage.error(e?.message || '案例包读取失败')
    return
  }
  // 只切展示模式:不发任何影响后台任务的请求
  workflowStore.setDisplayMode('example')
}

function onBackLive() {
  workflowStore.setDisplayMode('live')
}
</script>

<style scoped>
.mode-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.mode-switch__note { font-size: 12px; color: #64748b; line-height: 1.6; }
.mode-switch.is-example .mode-switch__note { color: #b45309; }
</style>
