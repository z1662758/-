<template>
  <div class="experiment-params-selector">
    <div class="params-title">实验参数配置</div>
    <el-form :model="params" inline size="default" class="params-form">
      <el-form-item label="迭代次数">
        <el-input-number
          v-model="params.iterations"
          :min="1"
          :max="100"
          @change="emitUpdate"
        />
      </el-form-item>
      <el-form-item label="模型选择">
        <el-select v-model="params.model" @change="emitUpdate" style="width: 130px">
          <el-option label="Qwen" value="qwen" />
          <el-option label="GPT-4" value="gpt4" />
          <el-option label="Claude" value="claude" />
        </el-select>
      </el-form-item>
      <el-form-item label="场景">
        <el-select v-model="params.scenario" @change="emitUpdate" style="width: 160px">
          <el-option label="供应链 (SCnet)" value="supply_chain" />
          <el-option label="API生态系统" value="api" />
        </el-select>
      </el-form-item>
      <el-form-item label="目标拆解">
        <el-switch v-model="params.use_decompose" @change="emitUpdate" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      iterations: 15,
      model: 'qwen',
      scenario: 'supply_chain',
      use_decompose: true
    })
  }
})

const emit = defineEmits(['update:modelValue'])

const params = reactive({ ...props.modelValue })

watch(() => props.modelValue, (val) => {
  Object.assign(params, val)
}, { deep: true })

const emitUpdate = () => {
  emit('update:modelValue', { ...params })
}
</script>

<style scoped>
.experiment-params-selector {
  padding: 16px 20px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-top: 16px;
}

.params-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 12px;
}

.params-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.params-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 16px;
}

.params-form :deep(.el-form-item__label) {
  font-size: 13px;
  color: #64748b;
}
</style>
