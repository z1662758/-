<template>
  <div class="goal-design-root">
    <section class="purpose-card">
      <div class="card-head">
        <span class="head-title">实验目的</span>
        <el-tag size="small" type="primary" effect="light">{{ goalCategory }}</el-tag>
      </div>
      <p class="purpose-text">{{ goalExplain || '未生成目的解释' }}</p>
    </section>

    <section class="vars-grid">
      <div class="vars-card">
        <div class="vars-head">影响因素</div>
        <div v-if="influenceFactors.length" class="vars-tags">
          <el-tag
            v-for="(item, idx) in influenceFactors"
            :key="`influence-${idx}`"
            class="vars-tag influence"
            effect="plain"
          >
            {{ item }}
          </el-tag>
        </div>
        <div v-else class="vars-empty">暂无影响因素</div>
      </div>

      <div class="vars-card">
        <div class="vars-head response-head">
          <span>响应变量</span>
          <el-button
            v-if="formulaEntries.length"
            link
            type="primary"
            size="small"
            @click="formulaDialogVisible = true"
          >
            查看公式
          </el-button>
        </div>
        <div v-if="responseVars.length" class="vars-tags">
          <el-tag
            v-for="(item, idx) in responseVars"
            :key="`response-${idx}`"
            class="vars-tag response"
            effect="plain"
          >
            {{ item }}
          </el-tag>
        </div>
        <div v-else class="vars-empty">暂无响应变量</div>
      </div>
    </section>

    <section class="method-card">
      <span class="method-label">实验方法</span>
      <span class="method-value">{{ expMethod || '未生成实验方法' }}</span>
    </section>

    <section class="params-card">
      <div class="card-head">
        <span class="head-title">参数配置预览</span>
      </div>
      <el-table
        :data="paramRows"
        size="small"
        stripe
        border
        class="params-table"
        empty-text="暂无参数配置"
      >
        <el-table-column prop="name" label="参数" min-width="180" />
        <el-table-column prop="range" label="范围" min-width="180" />
        <el-table-column prop="default" label="默认值" min-width="120" align="center" />
      </el-table>
    </section>

    <el-dialog
      v-model="formulaDialogVisible"
      title="响应变量公式"
      width="560px"
      append-to-body
    >
      <div class="formula-list">
        <div
          v-for="(item, idx) in formulaEntries"
          :key="`formula-${idx}`"
          class="formula-item"
        >
          <div class="formula-name">{{ item.name }}</div>
          <div class="formula-exp">{{ item.expression }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'PowerGame_ExperimentGoalDesign',
  props: {
    experimentData: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      formulaDialogVisible: false
    }
  },
  computed: {
    rawData() {
      return this.experimentData || {}
    },
    goalCategory() {
      return this.rawData.goal?.category || '待确定'
    },
    goalExplain() {
      return this.rawData.goal?.explain || ''
    },
    influenceFactors() {
      return Array.isArray(this.rawData.influence_factor) ? this.rawData.influence_factor : []
    },
    responseVars() {
      return Array.isArray(this.rawData.response_var) ? this.rawData.response_var : []
    },
    expMethod() {
      return this.rawData.exp_params?.exp_method || ''
    },
    paramRows() {
      const params = this.rawData.exp_params?.params
      if (Array.isArray(params)) {
        return params.map((item) => ({
          name: item?.name || '-',
          range: item?.range || '-',
          default: item?.default || '-'
        }))
      }
      if (params && typeof params === 'object') {
        return Object.keys(params).map((key) => ({
          name: key,
          range: params[key]?.range || '-',
          default: params[key]?.default || '-'
        }))
      }
      return []
    },
    formulaEntries() {
      const formula = this.rawData.formula
      if (!formula || typeof formula !== 'object' || Array.isArray(formula)) return []
      return Object.entries(formula).map(([name, expression]) => ({
        name,
        expression: String(expression || '')
      }))
    }
  }
}
</script>

<style scoped>
.goal-design-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.purpose-card,
.vars-card,
.method-card,
.params-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.head-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.purpose-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
}

.vars-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.vars-head {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}

.response-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vars-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vars-tag {
  margin: 0;
}

.vars-tag.influence {
  color: #1d4ed8;
  border-color: rgba(37, 99, 235, 0.35);
  background: rgba(37, 99, 235, 0.06);
}

.vars-tag.response {
  color: #0f766e;
  border-color: rgba(15, 118, 110, 0.35);
  background: rgba(15, 118, 110, 0.06);
}

.vars-empty {
  font-size: 13px;
  color: #94a3b8;
}

.method-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(79, 70, 229, 0.06));
}

.method-label {
  font-size: 14px;
  font-weight: 700;
  color: #1e3a8a;
}

.method-value {
  font-size: 14px;
  color: #334155;
}

.params-table {
  width: 100%;
}

.formula-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.formula-item {
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.formula-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.formula-exp {
  font-size: 13px;
  color: #334155;
  line-height: 1.5;
  word-break: break-word;
}

@media (max-width: 900px) {
  .vars-grid {
    grid-template-columns: 1fr;
  }
}
</style>
