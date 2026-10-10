<template>
  <Teleport to="body">
    <div class="plan-print-sheet">
      <header class="ps-head">
        <h1>供应链分析方案</h1>
        <table class="ps-meta">
          <tbody>
            <tr>
              <th>任务编号</th><td>{{ taskId || '—' }}</td>
              <th>方案状态</th><td>{{ statusText }}</td>
            </tr>
            <tr>
              <th>生成时间</th><td>{{ generatedAt || '—' }}</td>
              <th>方案版本</th><td>v{{ version || 1 }}</td>
            </tr>
            <tr>
              <th>场景</th><td>{{ scenarioLabel || '—' }}</td>
              <th>方案来源</th><td>{{ modeText }}</td>
            </tr>
          </tbody>
        </table>
      </header>

      <section v-if="content" class="ps-body">
        <h2>一、场景摘要与任务理解</h2>
        <p class="ps-question">{{ content.taskSummary?.question || '—' }}</p>
        <dl class="ps-list">
          <div><dt>研究对象</dt><dd>{{ content.taskSummary?.object || '—' }}</dd></div>
          <div><dt>关注国家或地区</dt><dd>{{ join(content.taskSummary?.regions) }}</dd></div>
          <div><dt>分析时间范围</dt><dd>{{ content.taskSummary?.timeRange || '—' }}</dd></div>
          <div><dt>关注路线</dt><dd>{{ join(content.taskSummary?.routes) }}</dd></div>
          <div><dt>已知条件</dt><dd>{{ join(content.taskSummary?.knownConditions) }}</dd></div>
        </dl>

        <h2>二、拟回答问题</h2>
        <ol class="ps-ol">
          <li v-for="item in enabled(content.analysisQuestions)" :key="item.id">{{ item.title }}</li>
        </ol>
        <p v-if="!enabled(content.analysisQuestions).length" class="ps-empty">无</p>

        <h2>三、选用的数据资源</h2>
        <table v-if="enabled(content.dataSources).length" class="ps-table">
          <thead>
            <tr><th>数据资源</th><th>类型</th><th>时间覆盖</th><th>在本方案中的用途</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in enabled(content.dataSources)" :key="item.resourceId">
              <td>{{ item.name }}</td>
              <td>{{ item.type || '—' }}</td>
              <td>{{ item.coverage || '—' }}</td>
              <td>{{ item.purpose || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="ps-empty">无</p>

        <h2>四、选用的分析模型</h2>
        <table v-if="enabled(content.models).length" class="ps-table">
          <thead>
            <tr><th>模型</th><th>模型能力</th><th>本次用途</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in enabled(content.models)" :key="item.modelId">
              <td>{{ item.name }}</td>
              <td>{{ item.capability || '—' }}</td>
              <td>{{ item.purpose || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="ps-empty">无</p>

        <h2>五、分析执行流程</h2>
        <ol class="ps-ol ps-ol--flow">
          <li v-for="step in enabled(content.workflow)" :key="step.id">
            <b>{{ step.name }}</b>
            <span v-if="step.description">：{{ step.description }}</span>
            <em v-if="step.dependencies?.length">
              （前置依赖：{{ step.dependencies.map(nameOf).join(' → ') }}）
            </em>
          </li>
        </ol>

        <h2>六、指标与判断口径</h2>
        <table v-if="enabled(content.indicators).length" class="ps-table">
          <thead>
            <tr><th>指标</th><th>计算或判断方法</th><th>数据来源</th><th>输出形式</th></tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in enabled(content.indicators)" :key="`pi-${index}`">
              <td>{{ item.name }}</td>
              <td>{{ item.method || '—' }}</td>
              <td>{{ join(item.dataSources) }}</td>
              <td>{{ item.outputForm || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="ps-empty">无</p>

        <h2>七、预计输出</h2>
        <p class="ps-inline">{{ enabled(content.outputs).map((item) => item.name).join('、') || '无' }}</p>

        <h2>八、分析限制与说明</h2>
        <ul class="ps-ul">
          <li v-for="(item, index) in content.limitations || []" :key="`pl-${index}`">{{ item }}</li>
        </ul>
        <p v-if="!(content.limitations || []).length" class="ps-empty">无</p>
      </section>

      <footer class="ps-foot">
        <span>本文件为分析方案，不是最终分析结论。</span>
      </footer>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  content: { type: Object, default: null },
  taskId: { type: String, default: '' },
  version: { type: Number, default: 0 },
  generatedAt: { type: String, default: '' },
  scenarioLabel: { type: String, default: '' },
  statusText: { type: String, default: '' },
  modeText: { type: String, default: '' },
})

const enabled = (list) => (Array.isArray(list) ? list.filter((item) => item.enabled !== false) : [])

const join = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join('、') || '—'
  return value || '—'
}

const nameOf = (id) =>
  props.content?.workflow?.find((step) => step.id === id)?.name || id
</script>

<style>
@media screen {
  .plan-print-sheet { display: none; }
}

@media print {
  @page { size: A4 portrait; margin: 14mm 12mm; }
  /* 打印时只保留方案正文，隐藏页面导航、按钮与复选框控件 */
  body > *:not(.plan-print-sheet) { display: none !important; }
  .plan-print-sheet { display: block !important; }

  .ps-head h1 { font-size: 19pt; margin: 0 0 6px; color: #0f172a; }
  .ps-meta { width: 100%; border-collapse: collapse; margin: 0 0 14px; font-size: 9pt; }
  .ps-meta th, .ps-meta td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
  .ps-meta th { background: #f1f5f9; width: 72px; font-weight: 600; color: #334155; }
  .ps-body h2 {
    font-size: 11.5pt;
    margin: 16px 0 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #cbd5e1;
    color: #0f172a;
    break-after: avoid;
  }
  .ps-question { font-size: 10pt; line-height: 1.6; margin: 0 0 8px; }
  .ps-list { margin: 0; font-size: 9.5pt; }
  .ps-list > div { display: flex; gap: 8px; margin-bottom: 3px; }
  .ps-list dt { min-width: 96px; color: #475569; }
  .ps-list dd { margin: 0; flex: 1; }
  .ps-ol, .ps-ul { margin: 0; padding-left: 18px; font-size: 9.5pt; line-height: 1.6; }
  .ps-ol--flow li { margin-bottom: 4px; }
  .ps-ol--flow em { font-style: normal; color: #64748b; }
  .ps-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .ps-table th, .ps-table td {
    border: 1px solid #cbd5e1;
    padding: 4px 6px;
    text-align: left;
    vertical-align: top;
  }
  .ps-table th { background: #f1f5f9; font-weight: 600; color: #334155; }
  .ps-table tr { break-inside: avoid; }
  .ps-inline { margin: 0; font-size: 9.5pt; line-height: 1.6; }
  .ps-empty { margin: 0; font-size: 9.5pt; color: #64748b; }
  .ps-foot {
    margin-top: 18px;
    padding-top: 6px;
    border-top: 1px solid #e2e8f0;
    font-size: 8.5pt;
    color: #64748b;
  }
}
</style>
